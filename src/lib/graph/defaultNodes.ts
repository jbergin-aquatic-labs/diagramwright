import type { Diagram } from "@/types/diagram";

export const EXAMPLE_DIAGRAM: Diagram = {
  title: "",
  direction: "TD",
  nodes: [
    { id: "start", label: "Start", kind: "terminal", position: { x: 240, y: 0 } },
    {
      id: "decision",
      label: "Valid input?",
      kind: "decision",
      position: { x: 220, y: 140 },
    },
    {
      id: "success",
      label: "Continue",
      kind: "process",
      position: { x: 60, y: 300 },
    },
    {
      id: "error",
      label: "Show error",
      kind: "process",
      position: { x: 400, y: 300 },
    },
  ],
  edges: [
    { id: "e-start-decision", source: "start", target: "decision" },
    {
      id: "e-decision-success",
      source: "decision",
      target: "success",
      label: "Yes",
    },
    {
      id: "e-decision-error",
      source: "decision",
      target: "error",
      label: "No",
    },
  ],
};

export const EMPTY_DIAGRAM: Diagram = {
  title: "",
  direction: "TD",
  nodes: [],
  edges: [],
};
