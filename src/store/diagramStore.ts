import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Diagram,
  DiagramDirection,
  DiagramEdge,
  DiagramNode,
  DiagramNodeKind,
} from "@/types/diagram";
import { EXAMPLE_DIAGRAM, EMPTY_DIAGRAM } from "@/lib/graph/defaultNodes";
import { DEFAULT_LABELS } from "@/lib/graph/nodeTypes";

function createId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

type DiagramState = {
  diagram: Diagram;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  addNode: (kind: DiagramNodeKind, position: { x: number; y: number }) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  removeNodes: (ids: string[]) => void;

  addEdge: (source: string, target: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  removeEdges: (ids: string[]) => void;

  setDirection: (direction: DiagramDirection) => void;
  setTitle: (title: string) => void;

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;

  loadExample: () => void;
  clear: () => void;

  /** Load a diagram (e.g. imported from a file) as a local edit. */
  loadDiagram: (diagram: Diagram) => void;

  /** Replace the diagram from an external source (sync bridge / agent). */
  applyRemoteDiagram: (diagram: Diagram) => void;
};

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set) => ({
      diagram: EXAMPLE_DIAGRAM,
      selectedNodeId: null,
      selectedEdgeId: null,

      addNode: (kind, position) =>
        set((state) => {
          const node: DiagramNode = {
            id: createId(kind),
            label: DEFAULT_LABELS[kind],
            kind,
            position,
          };
          return {
            diagram: {
              ...state.diagram,
              nodes: [...state.diagram.nodes, node],
            },
            selectedNodeId: node.id,
            selectedEdgeId: null,
          };
        }),

      updateNodeLabel: (id, label) =>
        set((state) => ({
          diagram: {
            ...state.diagram,
            nodes: state.diagram.nodes.map((n) =>
              n.id === id ? { ...n, label } : n,
            ),
          },
        })),

      updateNodePosition: (id, position) =>
        set((state) => ({
          diagram: {
            ...state.diagram,
            nodes: state.diagram.nodes.map((n) =>
              n.id === id ? { ...n, position } : n,
            ),
          },
        })),

      removeNodes: (ids) =>
        set((state) => {
          const idSet = new Set(ids);
          return {
            diagram: {
              ...state.diagram,
              nodes: state.diagram.nodes.filter((n) => !idSet.has(n.id)),
              edges: state.diagram.edges.filter(
                (e) => !idSet.has(e.source) && !idSet.has(e.target),
              ),
            },
            selectedNodeId: state.selectedNodeId
              ? idSet.has(state.selectedNodeId)
                ? null
                : state.selectedNodeId
              : null,
          };
        }),

      addEdge: (source, target) =>
        set((state) => {
          if (source === target) return state;
          const exists = state.diagram.edges.some(
            (e) => e.source === source && e.target === target,
          );
          if (exists) return state;
          const edge: DiagramEdge = {
            id: createId("e"),
            source,
            target,
          };
          return {
            diagram: {
              ...state.diagram,
              edges: [...state.diagram.edges, edge],
            },
          };
        }),

      updateEdgeLabel: (id, label) =>
        set((state) => ({
          diagram: {
            ...state.diagram,
            edges: state.diagram.edges.map((e) =>
              e.id === id ? { ...e, label } : e,
            ),
          },
        })),

      removeEdges: (ids) =>
        set((state) => {
          const idSet = new Set(ids);
          return {
            diagram: {
              ...state.diagram,
              edges: state.diagram.edges.filter((e) => !idSet.has(e.id)),
            },
            selectedEdgeId: state.selectedEdgeId
              ? idSet.has(state.selectedEdgeId)
                ? null
                : state.selectedEdgeId
              : null,
          };
        }),

      setDirection: (direction) =>
        set((state) => ({
          diagram: { ...state.diagram, direction },
        })),

      setTitle: (title) =>
        set((state) => ({
          diagram: { ...state.diagram, title },
        })),

      selectNode: (id) =>
        set(() => ({ selectedNodeId: id, selectedEdgeId: null })),

      selectEdge: (id) =>
        set(() => ({ selectedEdgeId: id, selectedNodeId: null })),

      loadExample: () =>
        set(() => ({
          diagram: structuredClone(EXAMPLE_DIAGRAM),
          selectedNodeId: null,
          selectedEdgeId: null,
        })),

      clear: () =>
        set(() => ({
          diagram: structuredClone(EMPTY_DIAGRAM),
          selectedNodeId: null,
          selectedEdgeId: null,
        })),

      loadDiagram: (diagram) =>
        set(() => ({
          diagram: structuredClone(diagram),
          selectedNodeId: null,
          selectedEdgeId: null,
        })),

      applyRemoteDiagram: (diagram) =>
        set((state) => {
          const nodeIds = new Set(diagram.nodes.map((n) => n.id));
          const edgeIds = new Set(diagram.edges.map((e) => e.id));
          return {
            diagram,
            selectedNodeId:
              state.selectedNodeId && nodeIds.has(state.selectedNodeId)
                ? state.selectedNodeId
                : null,
            selectedEdgeId:
              state.selectedEdgeId && edgeIds.has(state.selectedEdgeId)
                ? state.selectedEdgeId
                : null,
          };
        }),
    }),
    {
      name: "diagramwright:diagram",
      partialize: (state) => ({ diagram: state.diagram }),
    },
  ),
);
