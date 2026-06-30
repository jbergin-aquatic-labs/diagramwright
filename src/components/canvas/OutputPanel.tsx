"use client";

import { useMemo, useState } from "react";
import { Code2, Eye } from "lucide-react";
import { useDiagramStore } from "@/store/diagramStore";
import { graphToMermaid } from "@/lib/mermaid/graphToMermaid";
import { MermaidOutput } from "./MermaidOutput";
import { MermaidPreview } from "./MermaidPreview";

type Tab = "code" | "preview";

export function OutputPanel() {
  const diagram = useDiagramStore((s) => s.diagram);
  const [tab, setTab] = useState<Tab>("code");

  const code = useMemo(() => graphToMermaid(diagram), [diagram]);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-border bg-surface">
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
