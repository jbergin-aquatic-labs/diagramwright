import { createServer } from "node:http";
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};
function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
    });
    res.end(payload);
}
function readBody(req, limitBytes = 5_000_000) {
    return new Promise((resolve, reject) => {
        let data = "";
        let size = 0;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > limitBytes) {
                reject(new Error("Request body too large."));
                req.destroy();
                return;
            }
            data += chunk.toString("utf8");
        });
        req.on("end", () => resolve(data));
        req.on("error", reject);
    });
}
/**
 * Local HTTP + SSE bridge that lets the browser app sync with the same
 * DiagramHub the MCP tools mutate. Browser pushes changes via PUT /diagram
 * and receives live updates over GET /events.
 */
export function startBridge(hub, port) {
    const server = createServer(async (req, res) => {
        const method = req.method ?? "GET";
        const url = new URL(req.url ?? "/", `http://localhost:${port}`);
        const path = url.pathname;
        if (method === "OPTIONS") {
            res.writeHead(204, CORS_HEADERS);
            res.end();
            return;
        }
        if (path === "/health" && method === "GET") {
            const snap = hub.snapshot();
            sendJson(res, 200, {
                ok: true,
                revision: snap.revision,
                hasDiagram: snap.diagram !== null,
            });
            return;
        }
        if (path === "/diagram" && method === "GET") {
            const snap = hub.snapshot();
            sendJson(res, 200, snap);
            return;
        }
        if (path === "/diagram" && (method === "PUT" || method === "POST")) {
            try {
                const raw = await readBody(req);
                const parsed = JSON.parse(raw);
                if (!parsed?.diagram || !Array.isArray(parsed.diagram.nodes)) {
                    sendJson(res, 400, { error: "Invalid diagram payload." });
                    return;
                }
                hub.setDiagram(parsed.diagram, parsed.clientId ?? "web");
                sendJson(res, 200, { revision: hub.snapshot().revision });
            }
            catch (err) {
                sendJson(res, 400, {
                    error: err instanceof Error ? err.message : "Bad request.",
                });
            }
            return;
        }
        if (path === "/events" && method === "GET") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
                ...CORS_HEADERS,
            });
            const write = (event, data) => {
                res.write(`event: ${event}\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            };
            // Initial snapshot so a fresh client can converge immediately.
            const initial = hub.snapshot();
            write("sync", { ...initial, origin: "server" });
            const unsubscribe = hub.subscribe((snap, origin) => {
                write("update", { ...snap, origin });
            });
            const heartbeat = setInterval(() => {
                res.write(`: ping\n\n`);
            }, 25_000);
            req.on("close", () => {
                clearInterval(heartbeat);
                unsubscribe();
            });
            return;
        }
        sendJson(res, 404, { error: "Not found." });
    });
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, () => {
            resolve({
                port,
                close: () => server.close(),
            });
        });
    });
}
