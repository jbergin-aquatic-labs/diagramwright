"use client";

import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";
import { AlertTriangle } from "lucide-react";
import { useThemeStore, resolveTheme } from "@/store/themeStore";

export function MermaidPreview({ code }: { code: string }) {
  const theme = useThemeStore((s) => s.theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [error, setError] = useState<string | null>(null);

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
        if (containerRef.current) containerRef.current.innerHTML = svg;
        setError(null);
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
  }, [code, theme, renderId]);

  return (
    <div className="flex h-full flex-col">
      {error && (
        <div className="flex items-start gap-2 border-b border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Preview unavailable. Check the diagram syntax.</span>
        </div>
      )}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-background p-4">
        <div ref={containerRef} className="[&_svg]:max-w-full" />
      </div>
    </div>
  );
}
