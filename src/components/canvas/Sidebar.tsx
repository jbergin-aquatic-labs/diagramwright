"use client";

import type { DiagramDirection, DiagramNodeKind } from "@/types/diagram";
import { NODE_TYPES } from "@/lib/graph/nodeTypes";
import { useDiagramStore } from "@/store/diagramStore";
import { LayoutTemplate, Trash2 } from "lucide-react";

const DIRECTIONS: { value: DiagramDirection; label: string }[] = [
  { value: "TD", label: "Top → Down" },
  { value: "LR", label: "Left → Right" },
  { value: "BT", label: "Bottom → Up" },
  { value: "RL", label: "Right → Left" },
];

export const DND_MIME = "application/diagramwright-node";

export function Sidebar() {
  const direction = useDiagramStore((s) => s.diagram.direction);
  const setDirection = useDiagramStore((s) => s.setDirection);
  const addNode = useDiagramStore((s) => s.addNode);
  const loadExample = useDiagramStore((s) => s.loadExample);
  const clear = useDiagramStore((s) => s.clear);

  const onDragStart = (e: React.DragEvent, kind: DiagramNodeKind) => {
    e.dataTransfer.setData(DND_MIME, kind);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-4">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Node Types
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Drag onto the canvas, or click to add.
        </p>
        <ul className="flex flex-col gap-2">
          {NODE_TYPES.map((meta) => {
            const Icon = meta.icon;
            return (
              <li key={meta.kind}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => onDragStart(e, meta.kind)}
                  onClick={() =>
                    addNode(meta.kind, {
                      x: 120 + Math.random() * 160,
                      y: 120 + Math.random() * 160,
                    })
                  }
                  className="flex w-full cursor-grab items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:border-accent hover:bg-surface-muted active:cursor-grabbing"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-accent">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {meta.label}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {meta.syntaxHint}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Direction
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDirection(d.value)}
              className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                direction === d.value
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-background text-foreground hover:bg-surface-muted"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-auto">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Templates
        </h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={loadExample}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
          >
            <LayoutTemplate size={15} />
            Load example
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Clear the entire diagram?")) clear();
            }}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-red-400 hover:text-red-500"
          >
            <Trash2 size={15} />
            Clear canvas
          </button>
        </div>
      </section>
    </aside>
  );
}
