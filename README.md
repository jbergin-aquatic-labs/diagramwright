# Diagramwright

Drag, drop, wire, copy Mermaid.

Diagramwright is a Next.js and TypeScript web app for visually creating diagrams and exporting them as Mermaid syntax. The visual canvas is the source of truth — Mermaid is generated from the canvas state.

## Core Idea

Build diagrams on a canvas, then copy the generated Mermaid structure to your clipboard. No accounts, no backend, no database — everything is local-first and persisted to `localStorage`.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- React Flow (`@xyflow/react`) for the visual node canvas
- Zustand for client-side state (with `localStorage` persistence)
- Mermaid for live preview rendering
- `lucide-react` for icons

## Features

- Pan/zoom canvas with minimap and controls
- Sidebar with draggable node types (also click-to-add)
- Node kinds: process, decision, terminal, database, subroutine
- Connect nodes by dragging between handles
- Edit node labels inline (double-click) or via the selection inspector
- Edit edge labels via the selection inspector
- Delete selected nodes/edges (`Delete` / `Backspace`)
- Choose flowchart direction: `TD`, `LR`, `BT`, `RL`
- Live-generated Mermaid syntax with one-click copy
- Rendered Mermaid preview (Code / Preview tabs)
- System / light / dark theme toggle
- Diagram auto-persisted to `localStorage`

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system overview, component responsibilities, and data flow (the canonical architecture doc).
- [`mcp/README.md`](./mcp/README.md) — MCP server tools, sync bridge API, and setup.

## Project Structure

```txt
diagramwright/
  src/
    app/
      layout.tsx          # Root layout, theme no-flash script, ThemeProvider
      page.tsx            # Three-panel layout, hydration gate
      globals.css         # Tailwind v4 + theme tokens + dark variant
    components/
      ThemeProvider.tsx
      CollabProvider.tsx  # Syncs the store with the MCP bridge (SSE + PUT)
      canvas/
        Toolbar.tsx       # Top bar: brand, title, theme toggle, sync badge
        Sidebar.tsx       # Node palette, direction, templates
        DiagramCanvas.tsx # React Flow integration
        CustomNode.tsx    # Shape-styled node renderer + inline editing
        Inspector.tsx     # Selected node/edge editor
        MermaidOutput.tsx # Generated syntax + copy
        MermaidPreview.tsx# Rendered Mermaid preview
        OutputPanel.tsx   # Code/Preview tabs
    lib/
      clipboard.ts
      mermaid/
        graphToMermaid.ts
        sanitizeMermaidId.ts
      graph/
        nodeTypes.ts      # Node kind metadata (icons, labels, hints)
        defaultNodes.ts   # Example (app architecture) + empty diagrams
      collab/
        config.ts         # Sync bridge URL
    store/
      diagramStore.ts     # Diagram state + persistence
      themeStore.ts       # Theme state + persistence
      collabStore.ts      # Live connection status
    types/
      diagram.ts          # Core data model
  mcp/                    # MCP server + HTTP/SSE sync bridge
  docs/
    ARCHITECTURE.md       # Canonical architecture document
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## How It Works

The diagram (nodes, edges, direction, title) lives in a Zustand store and is the single source of truth. React Flow renders a view of that state and reports interactions (drag, connect, select, delete) back to the store. On every change, `graphToMermaid` regenerates the Mermaid flowchart text shown in the output panel and rendered in the preview.

## Agent Collaboration (MCP)

Diagramwright ships with an MCP server in [`mcp/`](./mcp) that lets AI agents read and edit the **live** diagram while you work in the browser. The server runs a small local HTTP/SSE "sync bridge"; the web app connects to it automatically and shows an **Agent sync** badge in the toolbar.

```bash
cd mcp
npm install
npm run build
```

Then register it with your MCP client (a ready-to-use Cursor config lives at `.cursor/mcp.json`) and reload. Agent edits stream onto the canvas in real time, and your edits are visible to the agent. See [`mcp/README.md`](./mcp/README.md) for the full tool list and configuration.

This is the only networked piece of the app, and it's entirely local — no accounts, cloud, or external services.
