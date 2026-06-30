"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Code2, Eye } from "lucide-react";
import { useDiagramStore } from "@/store/diagramStore";
import { graphToMermaid } from "@/lib/mermaid/graphToMermaid";
import { MermaidOutput } from "./MermaidOutput";
import { MermaidPreview } from "./MermaidPreview";

type Tab = "code" | "preview";

const WIDTH_KEY = "diagramwright:outputWidth";
const MIN_WIDTH = 300;
const MAX_WIDTH = 820;
const DEFAULT_WIDTH = 384;

function clampWidth(value: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

function readWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const saved = Number(window.localStorage.getItem(WIDTH_KEY));
  return Number.isFinite(saved) && saved > 0 ? clampWidth(saved) : DEFAULT_WIDTH;
}

export function OutputPanel() {
  const diagram = useDiagramStore((s) => s.diagram);
  const [tab, setTab] = useState<Tab>("code");
  const [width, setWidth] = useState<number>(readWidth);
  const resizingRef = useRef(false);

  const code = useMemo(() => graphToMermaid(diagram), [diagram]);

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizingRef.current) return;
    // Panel is flush to the right edge of the window.
    setWidth(clampWidth(window.innerWidth - e.clientX));
  }, []);

  const onResizePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.localStorage.setItem(WIDTH_KEY, String(width));
    },
    [width],
  );

  return (
    <aside
      className="relative flex shrink-0 flex-col border-l border-border bg-surface"
      style={{ width }}
    >
      <div
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        className="group absolute left-0 top-0 z-20 h-full w-1.5 -translate-x-1/2 cursor-col-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-accent" />
      </div>

      <div className="flex shrink-0 items-center gap-1 border-b border-border p-2">
        <TabButton
          active={tab === "code"}
          onClick={() => setTab("code")}
          icon={<Code2 size={15} />}
          label="Code"
        />
        <TabButton
          active={tab === "preview"}
          onClick={() => setTab("preview")}
          icon={<Eye size={15} />}
          label="Preview"
        />
      </div>

      <div className="min-h-0 flex-1">
        {tab === "code" ? (
          <MermaidOutput code={code} />
        ) : (
          <MermaidPreview code={code} />
        )}
      </div>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
