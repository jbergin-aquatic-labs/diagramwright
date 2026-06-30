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

## Project Structure

```txt
src/
  app/
    layout.tsx          # Root layout, theme no-flash script, ThemeProvider
    page.tsx            # Three-panel layout, hydration gate
    globals.css         # Tailwind v4 + theme tokens + dark variant
  components/
    ThemeProvider.tsx
    canvas/
      Toolbar.tsx       # Top bar: brand, title, theme toggle
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
      defaultNodes.ts   # Example + empty diagrams
  store/
    diagramStore.ts     # Diagram state + persistence
    themeStore.ts       # Theme state + persistence
  types/
    diagram.ts          # Core data model
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
