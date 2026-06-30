import type { DiagramNodeKind } from "@/types/diagram";
import {
  Square,
  Diamond,
  Circle,
  Database,
  Layers,
  type LucideIcon,
} from "lucide-react";

export type NodeTypeMeta = {
  kind: DiagramNodeKind;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Mermaid bracket preview, e.g. A["..."] */
  syntaxHint: string;
};

export const NODE_TYPES: NodeTypeMeta[] = [
  {
    kind: "process",
    label: "Process",
    description: "A standard step or action",
    icon: Square,
    syntaxHint: 'id["text"]',
  },
  {
    kind: "decision",
    label: "Decision",
    description: "A branch or conditional",
    icon: Diamond,
    syntaxHint: 'id{"text"}',
  },
  {
    kind: "terminal",
    label: "Terminal",
    description: "Start or end point",
    icon: Circle,
    syntaxHint: 'id(["text"])',
  },
  {
    kind: "database",
    label: "Database",
    description: "Datastore or persistence",
    icon: Database,
    syntaxHint: 'id[("text")]',
  },
  {
    kind: "subroutine",
    label: "Subroutine",
    description: "A reusable sub-process",
    icon: Layers,
    syntaxHint: 'id[["text"]]',
  },
];

export const NODE_TYPE_MAP: Record<DiagramNodeKind, NodeTypeMeta> =
  NODE_TYPES.reduce(
    (acc, meta) => {
      acc[meta.kind] = meta;
      return acc;
    },
    {} as Record<DiagramNodeKind, NodeTypeMeta>,
  );

export const DEFAULT_LABELS: Record<DiagramNodeKind, string> = {
  process: "Process",
  decision: "Decision?",
  terminal: "Start",
  database: "Database",
  subroutine: "Subroutine",
};
