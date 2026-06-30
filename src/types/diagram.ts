export type DiagramNodeKind =
  | "process"
  | "decision"
  | "terminal"
  | "database"
  | "subroutine";

export type DiagramDirection = "TD" | "LR" | "BT" | "RL";

export type DiagramNode = {
  id: string;
  label: string;
  kind: DiagramNodeKind;
  position: {
    x: number;
    y: number;
  };
};

export type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type Diagram = {
  title?: string;
  direction: DiagramDirection;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export type Theme = "system" | "light" | "dark";
