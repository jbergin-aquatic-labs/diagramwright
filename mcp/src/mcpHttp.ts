import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { DiagramHub } from "./hub.js";
import { createMcpServer } from "./server.js";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, last-event-id",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

function applyCors(res: ServerResponse): void {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c: Buffer) => (data += c.toString("utf8")));
    req.on("end", () => {
      if (!data) return resolve(undefined);
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export interface McpHttpServer {
  port: number;
  close: () => void;
}

/**
 * Streamable HTTP MCP endpoint (POST/GET/DELETE /mcp) so a headless,
 * containerized server can be reached by agents over the network. Each
 * session gets its own McpServer bound to the shared DiagramHub.
 */
export function startMcpHttp(hub: DiagramHub, port: number): Promise<McpHttpServer> {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const server = createServer(async (req, res) => {
    applyCors(res);
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, sessions: transports.size }));
      return;
    }
    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      if (req.method === "POST") {
        const body = await readJson(req);
        let transport = sessionId ? transports.get(sessionId) : undefined;

        if (!transport) {
          if (!isInitializeRequest(body)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32000, message: "No valid session ID provided" },
                id: null,
              }),
            );
            return;
          }
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports.set(sid, transport!);
            },
          });
          transport.onclose = () => {
            if (transport!.sessionId) transports.delete(transport!.sessionId);
          };
          const mcp = createMcpServer(hub);
          await mcp.connect(transport);
        }

        await transport.handleRequest(req, res, body);
        return;
      }

      if (req.method === "GET" || req.method === "DELETE") {
        const transport = sessionId ? transports.get(sessionId) : undefined;
        if (!transport) {
          res.writeHead(400);
          res.end("Invalid or missing session ID");
          return;
        }
        await transport.handleRequest(req, res);
        return;
      }

      res.writeHead(405);
      res.end();
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          }),
        );
      }
      console.error("[diagramwright-mcp] http error:", err);
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve({ port, close: () => server.close() }));
  });
}
