/**
 * URL of the Diagramwright sync bridge exposed by the MCP server.
 * Override with NEXT_PUBLIC_DIAGRAMWRIGHT_BRIDGE_URL if you run it elsewhere.
 */
export const BRIDGE_URL =
  process.env.NEXT_PUBLIC_DIAGRAMWRIGHT_BRIDGE_URL?.replace(/\/$/, "") ??
  "http://localhost:4319";
