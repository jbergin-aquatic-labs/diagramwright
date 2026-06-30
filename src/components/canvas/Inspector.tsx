"use client";

import { Trash2, X } from "lucide-react";
import { useDiagramStore } from "@/store/diagramStore";
import { NODE_TYPE_MAP } from "@/lib/graph/nodeTypes";

export function Inspector() {
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId);
  const node = useDiagramStore((s) =>
    s.diagram.nodes.find((n) => n.id === s.selectedNodeId),
  );
  const edge = useDiagramStore((s) =>
    s.diagram.edges.find((e) => e.id === s.selectedEdgeId),
  );

  const updateNodeLabel = useDiagramStore((s) => s.updateNodeLabel);
  const updateEdgeLabel = useDiagramStore((s) => s.updateEdgeLabel);
  const removeNodes = useDiagramStore((s) => s.removeNodes);
  const removeEdges = useDiagramStore((s) => s.removeEdges);
  const selectNode = useDiagramStore((s) => s.selectNode);

  if (!node && !edge) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {node ? `${NODE_TYPE_MAP[node.kind].label} node` : "Edge"}
        </span>
        <button
          type="button"
          onClick={() => selectNode(null)}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label="Deselect"
        >
          <X size={14} />
        </button>
      </div>

      {node && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={node.label}
            onChange={(e) => updateNodeLabel(node.id, e.target.value)}
            placeholder="Node label"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removeNodes([node.id])}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-foreground transition-colors hover:border-red-400 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {edge && selectedEdgeId && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={edge.label ?? ""}
            onChange={(e) => updateEdgeLabel(edge.id, e.target.value)}
            placeholder="Edge label (optional)"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removeEdges([edge.id])}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-foreground transition-colors hover:border-red-400 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
