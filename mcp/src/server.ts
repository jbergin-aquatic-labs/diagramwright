import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DiagramHub } from "./hub.js";
import { graphToMermaid } from "./graphToMermaid.js";
import { emptyDiagram } from "./types.js";

const kindEnum = z.enum([
  "process",
  "decision",
  "terminal",
  "database",
  "subroutine",
]);
const directionEnum = z.enum(["TD", "LR", "BT", "RL"]);

const diagramSchema = z.object({
  title: z.string().optional(),
  direction: directionEnum,
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      kind: kindEnum,
      position: z.object({ x: z.number(), y: z.number() }),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    }),
  ),
});

type TextResult = { content: { type: "text"; text: string }[] };

export function createMcpServer(hub: DiagramHub): McpServer {
  const server = new McpServer({
    name: "diagramwright",
    version: "0.1.0",
  });

  const text = (value: string): TextResult => ({
    content: [{ type: "text", text: value }],
  });

  /** Standard success payload: a short message plus the resulting Mermaid. */
  const ok = (message: string): TextResult => {
    const diagram = hub.snapshot().diagram ?? emptyDiagram();
    return text(
      `${message}\n\nCurrent Mermaid:\n\`\`\`mermaid\n${graphToMermaid(diagram)}\n\`\`\``,
    );
  };

  server.registerTool(
    "get_diagram",
    {
      title: "Get diagram",
      description:
        "Return the current diagram as JSON (nodes, edges, direction, title) plus the live revision number.",
      inputSchema: {},
    },
    async () => {
      const snap = hub.snapshot();
      return text(JSON.stringify(snap, null, 2));
    },
  );

  server.registerTool(
    "get_mermaid",
    {
      title: "Get Mermaid",
      description: "Return the current diagram rendered as Mermaid flowchart syntax.",
      inputSchema: {},
    },
    async () => {
      const diagram = hub.snapshot().diagram ?? emptyDiagram();
      return text(graphToMermaid(diagram));
    },
  );

  server.registerTool(
    "add_node",
    {
      title: "Add node",
      description:
        "Add a flowchart node. kind is one of process, decision, terminal, database, subroutine. Returns the new node id.",
      inputSchema: {
        kind: kindEnum,
        label: z.string().describe("Visible text for the node."),
        x: z.number().optional().describe("Canvas x position."),
        y: z.number().optional().describe("Canvas y position."),
        id: z
          .string()
          .optional()
          .describe("Optional explicit id; auto-generated when omitted."),
      },
    },
    async (args) => {
      const node = hub.addNode(args);
      return ok(`Added ${node.kind} node "${node.label}" (id: ${node.id}).`);
    },
  );

  server.registerTool(
    "update_node",
    {
      title: "Update node",
      description: "Update a node's label, kind, and/or position by id.",
      inputSchema: {
        id: z.string(),
        label: z.string().optional(),
        kind: kindEnum.optional(),
        x: z.number().optional(),
        y: z.number().optional(),
      },
    },
    async ({ id, ...patch }) => {
      const node = hub.updateNode(id, patch);
      return ok(`Updated node "${node.id}".`);
    },
  );

  server.registerTool(
    "remove_node",
    {
      title: "Remove node",
      description: "Delete a node by id (also removes its connected edges).",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      hub.removeNode(id);
      return ok(`Removed node "${id}".`);
    },
  );

  server.registerTool(
    "add_edge",
    {
      title: "Add edge",
      description:
        "Connect two existing nodes by their ids, with an optional edge label.",
      inputSchema: {
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
        id: z.string().optional(),
      },
    },
    async (args) => {
      const edge = hub.addEdge(args);
      return ok(`Connected "${edge.source}" -> "${edge.target}" (id: ${edge.id}).`);
    },
  );

  server.registerTool(
    "update_edge",
    {
      title: "Update edge",
      description: "Update an edge's label by id. Pass an empty string to clear it.",
      inputSchema: { id: z.string(), label: z.string() },
    },
    async ({ id, label }) => {
      const edge = hub.updateEdge(id, { label });
      return ok(`Updated edge "${edge.id}".`);
    },
  );

  server.registerTool(
    "remove_edge",
    {
      title: "Remove edge",
      description: "Delete an edge by id.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      hub.removeEdge(id);
      return ok(`Removed edge "${id}".`);
    },
  );

  server.registerTool(
    "set_direction",
    {
      title: "Set direction",
      description: "Set the flowchart layout direction: TD, LR, BT, or RL.",
      inputSchema: { direction: directionEnum },
    },
    async ({ direction }) => {
      hub.setDirection(direction);
      return ok(`Direction set to ${direction}.`);
    },
  );

  server.registerTool(
    "set_title",
    {
      title: "Set title",
      description: "Set the diagram title (rendered as a Mermaid frontmatter title).",
      inputSchema: { title: z.string() },
    },
    async ({ title }) => {
      hub.setTitle(title);
      return ok(`Title set to "${title}".`);
    },
  );

  server.registerTool(
    "set_diagram",
    {
      title: "Set diagram",
      description:
        "Replace the entire diagram with a full JSON document. Use for bulk edits or generating a diagram from scratch.",
      inputSchema: { diagram: diagramSchema },
    },
    async ({ diagram }) => {
      hub.setDiagram(diagram, "agent");
      return ok("Replaced the diagram.");
    },
  );

  server.registerTool(
    "clear_diagram",
    {
      title: "Clear diagram",
      description: "Remove all nodes and edges, resetting to an empty diagram.",
      inputSchema: {},
    },
    async () => {
      hub.clear();
      return ok("Cleared the diagram.");
    },
  );

  server.registerResource(
    "current-diagram",
    "diagram://current",
    {
      title: "Current diagram (JSON)",
      description: "Live diagram state as JSON.",
      mimeType: "application/json",
    },
    async (uri) => {
      const snap = hub.snapshot();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(snap, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "current-mermaid",
    "diagram://mermaid",
    {
      title: "Current diagram (Mermaid)",
      description: "Live diagram rendered as Mermaid flowchart syntax.",
      mimeType: "text/plain",
    },
    async (uri) => {
      const diagram = hub.snapshot().diagram ?? emptyDiagram();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: graphToMermaid(diagram),
          },
        ],
      };
    },
  );

  return server;
}
