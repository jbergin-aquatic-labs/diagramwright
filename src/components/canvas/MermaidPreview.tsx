"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  AlertTriangle,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useThemeStore, resolveTheme } from "@/store/themeStore";

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

type Transform = { scale: number; x: number; y: number };

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

export function MermaidPreview({ code }: { code: string }) {
  const theme = useThemeStore((s) => s.theme);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);

  // Center the rendered diagram within the viewport at the current scale.
  const fitToView = useCallback((scale = 1) => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const svg = content.querySelector("svg");
    if (!svg) {
      setTransform({ scale, x: 0, y: 0 });
      return;
    }
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cw = svg.clientWidth || svg.getBoundingClientRect().width;
    const ch = svg.clientHeight || svg.getBoundingClientRect().height;
    setTransform({
      scale,
      x: (vw - cw * scale) / 2,
      y: (vh - ch * scale) / 2,
    });
  }, []);

  const fitToWindow = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const svg = content.querySelector("svg");
    if (!svg) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cw = svg.clientWidth || svg.getBoundingClientRect().width;
    const ch = svg.clientHeight || svg.getBoundingClientRect().height;
    if (!cw || !ch) return;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min((vw - 32) / cw, (vh - 32) / ch, 1)),
    );
    setTransform({
      scale,
      x: (vw - cw * scale) / 2,
      y: (vh - ch * scale) / 2,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isDark = resolveTheme(theme) === "dark";

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: isDark ? "dark" : "default",
      flowchart: { htmlLabels: true, curve: "basis" },
    });

    const run = async () => {
      try {
        const { svg } = await mermaid.render(renderId, code);
        if (cancelled) return;
        if (contentRef.current) contentRef.current.innerHTML = svg;
        setError(null);
        // Defer so layout is measured after the SVG is in the DOM.
        requestAnimationFrame(() => {
          if (!cancelled) fitToWindow();
        });
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unable to render diagram.",
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [code, theme, renderId, fitToWindow]);

  // Non-passive wheel listener so we can preventDefault and zoom at the cursor.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setTransform((t) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
        const ratio = scale / t.scale;
        return {
          scale,
          x: px - (px - t.x) * ratio,
          y: py - (py - t.y) * ratio,
        };
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  const dragState = useRef<{ x: number; y: number; tx: number; ty: number } | null>(
    null,
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const start = dragState.current;
    if (!start) return;
    setTransform((t) => ({
      ...t,
      x: start.tx + (e.clientX - start.x),
      y: start.ty + (e.clientY - start.y),
    }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const zoomBy = (factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const px = viewport.clientWidth / 2;
    const py = viewport.clientHeight / 2;
    setTransform((t) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
      const ratio = scale / t.scale;
      return {
        scale,
        x: px - (px - t.x) * ratio,
        y: py - (py - t.y) * ratio,
      };
    });
  };

  return (
    <div className="relative flex h-full flex-col">
      {error && (
        <div className="flex items-start gap-2 border-b border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Preview unavailable. Check the diagram syntax.</span>
        </div>
      )}

      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden bg-background active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left will-change-transform [&_svg]:!max-w-none"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        />
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col gap-1">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-lg border border-border bg-surface/95 shadow-sm backdrop-blur">
          <ZoomButton onClick={() => zoomBy(1.2)} label="Zoom in">
            <Plus size={15} />
          </ZoomButton>
          <ZoomButton onClick={() => zoomBy(1 / 1.2)} label="Zoom out">
            <Minus size={15} />
          </ZoomButton>
          <ZoomButton onClick={fitToWindow} label="Fit to view">
            <Maximize2 size={14} />
          </ZoomButton>
          <ZoomButton onClick={() => fitToView(1)} label="Reset to 100%">
            <RotateCcw size={14} />
          </ZoomButton>
        </div>
        <span className="pointer-events-none self-center rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {Math.round(transform.scale * 100)}%
        </span>
      </div>
    </div>
  );
}

function ZoomButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:bg-surface-muted"
    >
      {children}
    </button>
  );
}
