#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DiagramHub } from "./hub.js";
import { startBridge } from "./bridge.js";
import { startMcpHttp } from "./mcpHttp.js";
import { createMcpServer } from "./server.js";
// NOTE: stdout is reserved for the MCP stdio protocol. All human-readable
// logging must go to stderr.
function log(...args) {
    console.error("[diagramwright-mcp]", ...args);
}
async function main() {
    const bridgePort = Number(process.env.DIAGRAMWRIGHT_BRIDGE_PORT ?? 4319);
    const httpPort = Number(process.env.MCP_HTTP_PORT ?? 4320);
    const stateFile = process.env.DIAGRAMWRIGHT_STATE_FILE || undefined;
    const mode = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();
    const hub = new DiagramHub(stateFile);
    // The sync bridge (browser <-> hub) always runs.
    try {
        const bridge = await startBridge(hub, bridgePort);
        log(`Sync bridge listening on http://0.0.0.0:${bridge.port}`);
    }
    catch (err) {
        log(`Failed to start sync bridge on port ${bridgePort}:`, err instanceof Error ? err.message : err);
    }
    if (mode === "http" || mode === "both") {
        try {
            const http = await startMcpHttp(hub, httpPort);
            log(`MCP Streamable HTTP endpoint on http://0.0.0.0:${http.port}/mcp`);
        }
        catch (err) {
            log(`Failed to start MCP HTTP endpoint on port ${httpPort}:`, err instanceof Error ? err.message : err);
        }
    }
    if (mode === "stdio" || mode === "both") {
        const server = createMcpServer(hub);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        log("MCP server connected over stdio.");
    }
    else {
        // Headless service mode: keep the process alive for the HTTP servers.
        log(`Running headless (MCP_TRANSPORT=${mode}). Press Ctrl+C to stop.`);
    }
}
main().catch((err) => {
    console.error("[diagramwright-mcp] fatal:", err);
    process.exit(1);
});
