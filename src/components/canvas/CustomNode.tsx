"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DiagramNodeKind } from "@/types/diagram";
import { useDiagramStore } from "@/store/diagramStore";

export type DiagramNodeData = {
  label: string;
  kind: DiagramNodeKind;
};

function CustomNodeComponent({ id, data, selected }: NodeProps) {
  const { label, kind } = data as DiagramNodeData;
  const updateNodeLabel = useDiagramStore((s) => s.updateNodeLabel);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(label);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== label) updateNodeLabel(id, next);
  };

  const selectedRing = selected
    ? "border-accent shadow-[0_0_0_2px_var(--color-accent)]"
    : "border-border hover:shadow-md";

  const content = editing ? (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(label);
          setEditing(false);
        }
      }}
      className="nodrag w-full max-w-[160px] rounded bg-surface-muted px-1 text-center text-sm text-foreground outline-none"
    />
  ) : (
    <span className="block break-words leading-snug">{label}</span>
  );

  const handleProps = {
    onDoubleClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      startEditing();
    },
  };

  // Diamond needs a rotated backdrop while keeping label + handles axis-aligned.
  if (kind === "decision") {
    return (
      <div
        className="relative flex h-[88px] w-[160px] items-center justify-center"
        {...handleProps}
      >
        <Handle type="target" position={Position.Top} className="dw-node-handle" />
        <div
          className={`absolute left-1/2 top-1/2 h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 rotate-45 border bg-surface shadow-sm transition-shadow ${selectedRing}`}
        />
        <div className="relative z-10 max-w-[120px] px-1 text-center text-sm font-medium text-foreground">
          {content}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="dw-node-handle"
        />
      </div>
    );
  }

  const shapeClass: Record<Exclude<DiagramNodeKind, "decision">, string> = {
    process: "rounded-md",
    terminal: "rounded-full",
    database: "rounded-md rounded-t-[45%]",
    subroutine: "rounded-md ring-2 ring-inset ring-accent/40",
  };

  return (
    <div
      className={`relative flex min-h-[52px] min-w-[130px] max-w-[230px] items-center justify-center border bg-surface px-4 py-3 text-center text-sm font-medium text-foreground shadow-sm transition-shadow ${shapeClass[kind]} ${selectedRing}`}
      {...handleProps}
    >
      <Handle type="target" position={Position.Top} className="dw-node-handle" />
      {content}
      <Handle
        type="source"
        position={Position.Bottom}
        className="dw-node-handle"
      />
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
