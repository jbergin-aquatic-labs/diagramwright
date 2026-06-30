#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DiagramHub } from "./hub.js";
import { startBridge } from "./bridge.js";
import { createMcpServer } from "./server.js";

// NOTE: stdout is reserved for the MCP stdio protocol. All human-readable
// logging must go to stderr.
function log(...args: unknown[]): void {
  console.error("[diagramwright-mcp]", ...args);
}

async function main(): Promise<void> {
  const port = Number(process.env.DIAGRAMWRIGHT_BRIDGE_PORT ?? 4319);
  const stateFile = process.env.DIAGRAMWRIGHT_STATE_FILE || undefined;

  const hub = new DiagramHub(stateFile);

  try {
    const bridge = await startBridge(hub, port);
    log(`Sync bridge listening on http://localhost:${bridge.port}`);
  } catch (err) {
    log(
      `Failed to start sync bridge on port ${port}:`,
      err instanceof Error ? err.message : err,
      "- MCP tools will still work, but the browser will not sync.",
    );
  }

  const server = createMcpServer(hub);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("MCP server connected over stdio.");
}

main().catch((err) => {
  console.error("[diagramwright-mcp] fatal:", err);
  process.exit(1);
});
