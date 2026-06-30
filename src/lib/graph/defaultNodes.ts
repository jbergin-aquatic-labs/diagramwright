import type { Diagram } from "@/types/diagram";

// The app's built-in example is Diagramwright's own architecture. Keep in sync
// with docs/ARCHITECTURE.md.
export const EXAMPLE_DIAGRAM: Diagram = {
  title: "Diagramwright Architecture",
  direction: "TD",
  nodes: [
    { id: "user", label: "User", kind: "terminal", position: { x: 80, y: 0 } },
    {
      id: "ui",
      label: "Web UI (Sidebar · Canvas · Toolbar · Inspector)",
      kind: "process",
      position: { x: 20, y: 120 },
    },
    {
      id: "store",
      label: "Zustand diagramStore (source of truth)",
      kind: "database",
      position: { x: 40, y: 250 },
    },
    {
      id: "ls",
      label: "localStorage",
      kind: "database",
      position: { x: 380, y: 250 },
    },
    {
      id: "g2m",
      label: "graphToMermaid()",
      kind: "subroutine",
      position: { x: 40, y: 380 },
    },
    {
      id: "output",
      label: "Mermaid Output + Preview",
      kind: "process",
      position: { x: 30, y: 500 },
    },
    {
      id: "collab",
      label: "CollabProvider (SSE + PUT)",
      kind: "subroutine",
      position: { x: 60, y: 630 },
    },
    {
      id: "bridge",
      label: "HTTP/SSE Sync Bridge :4319",
      kind: "process",
      position: { x: 420, y: 630 },
    },
    {
      id: "hub",
      label: "DiagramHub (authoritative state)",
      kind: "database",
      position: { x: 760, y: 500 },
    },
    {
      id: "tools",
      label: "MCP Tools + Resources",
      kind: "process",
      position: { x: 770, y: 360 },
    },
    {
      id: "agent",
      label: "AI Agent (Cursor)",
      kind: "terminal",
      position: { x: 800, y: 220 },
    },
  ],
  edges: [
    { id: "e1", source: "user", target: "ui", label: "interacts" },
    { id: "e2", source: "ui", target: "store", label: "actions" },
    { id: "e3", source: "store", target: "g2m", label: "on change" },
    { id: "e4", source: "g2m", target: "output", label: "syntax" },
    { id: "e5", source: "store", target: "ls", label: "persist" },
    { id: "e6", source: "store", target: "collab", label: "local edits" },
    { id: "e7", source: "collab", target: "bridge", label: "PUT /diagram" },
    { id: "e8", source: "bridge", target: "hub", label: "setDiagram" },
    { id: "e9", source: "agent", target: "tools", label: "MCP (stdio)" },
    { id: "e10", source: "tools", target: "hub", label: "mutate" },
    { id: "e11", source: "hub", target: "bridge", label: "notify (revision)" },
    { id: "e12", source: "bridge", target: "collab", label: "SSE /events" },
    { id: "e13", source: "collab", target: "store", label: "apply remote" },
  ],
};

export const EMPTY_DIAGRAM: Diagram = {
  title: "",
  direction: "TD",
  nodes: [],
  edges: [],
};
