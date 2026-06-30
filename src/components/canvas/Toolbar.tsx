"use client";

import { Workflow, Monitor, Sun, Moon, Bot } from "lucide-react";
import { useDiagramStore } from "@/store/diagramStore";
import { useThemeStore } from "@/store/themeStore";
import { useCollabStore, type CollabStatus } from "@/store/collabStore";
import type { Theme } from "@/types/diagram";

const THEME_ICON: Record<Theme, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const THEME_LABEL: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function Toolbar() {
  const title = useDiagramStore((s) => s.diagram.title ?? "");
  const setTitle = useDiagramStore((s) => s.setTitle);
  const nodeCount = useDiagramStore((s) => s.diagram.nodes.length);
  const edgeCount = useDiagramStore((s) => s.diagram.edges.length);

  const theme = useThemeStore((s) => s.theme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);
  const ThemeIcon = THEME_ICON[theme];

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Workflow size={18} />
        </span>
        <span className="text-base font-semibold tracking-tight text-foreground">
          Diagramwright
        </span>
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled diagram"
        className="w-64 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border focus:border-accent focus:outline-none"
      />

      <span className="hidden text-xs text-muted-foreground sm:inline">
        {nodeCount} node{nodeCount === 1 ? "" : "s"} · {edgeCount} edge
        {edgeCount === 1 ? "" : "s"}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <CollabBadge />
        <button
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${THEME_LABEL[theme]} (click to change)`}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          <ThemeIcon size={15} />
          <span className="hidden md:inline">{THEME_LABEL[theme]}</span>
        </button>
      </div>
    </header>
  );
}

const STATUS_META: Record<
  CollabStatus,
  { label: string; dot: string; title: string }
> = {
  connected: {
    label: "Agent sync on",
    dot: "bg-green-500",
    title: "Connected to the MCP sync bridge. Agents can edit this diagram.",
  },
  connecting: {
    label: "Connecting…",
    dot: "bg-amber-500",
    title: "Connecting to the MCP sync bridge.",
  },
  offline: {
    label: "Agent sync off",
    dot: "bg-slate-400",
    title:
      "MCP sync bridge not reachable. Start the diagramwright-mcp server to let agents collaborate.",
  },
};

function CollabBadge() {
  const status = useCollabStore((s) => s.status);
  const agentActive = useCollabStore((s) => s.agentActive);
  const meta = STATUS_META[status];

  return (
    <span
      title={meta.title}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
    >
      {agentActive ? (
        <>
          <Bot size={14} className="text-accent" />
          <span className="hidden md:inline">Agent editing…</span>
        </>
      ) : (
        <>
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className="hidden md:inline">{meta.label}</span>
        </>
      )}
    </span>
  );
}
