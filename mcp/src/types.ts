export type DiagramNodeKind =
  | "process"
  | "decision"
  | "terminal"
  | "database"
  | "subroutine";

export type DiagramDirection = "TD" | "LR" | "BT" | "RL";

export interface DiagramNode {
  id: string;
  label: string;
  kind: DiagramNodeKind;
  position: { x: number; y: number };
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Diagram {
  title?: string;
  direction: DiagramDirection;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export const NODE_KINDS: DiagramNodeKind[] = [
  "process",
  "decision",
  "terminal",
  "database",
  "subroutine",
];

export const DIRECTIONS: DiagramDirection[] = ["TD", "LR", "BT", "RL"];

export function emptyDiagram(): Diagram {
  return { title: "", direction: "TD", nodes: [], edges: [] };
}
