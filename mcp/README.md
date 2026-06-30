# Diagramwright MCP Server

An [MCP](https://modelcontextprotocol.io) server that lets AI agents read and edit a **live** Diagramwright diagram while a human collaborates in the browser.

Because the Diagramwright web app is local-first (state lives in the browser), this package adds a tiny **sync bridge**: a local HTTP + SSE server that runs inside the MCP process. The browser connects to it and stays in sync, so agent edits appear instantly on the canvas and the user's edits are visible to the agent.

```txt
   ┌────────────┐   MCP (stdio)    ┌─────────────────────────────┐
   │  AI Agent  │ ───────────────► │  diagramwright-mcp          │
   │ (Cursor…)  │ ◄─────────────── │   ├─ MCP tools/resources    │
   └────────────┘                  │   └─ DiagramHub (state)     │
                                   │        ▲                     │
   ┌────────────┐  HTTP + SSE      │        │  sync bridge :4319  │
   │  Browser   │ ◄──────────────► │        ▼  (GET/PUT /diagram, │
   │  (web app) │                  │           GET /events)       │
   └────────────┘                  └─────────────────────────────┘
```

## Setup

```bash
cd mcp
npm install
npm run build
```

This produces `dist/index.js`, the server entrypoint.

## Transports

The server selects its transport via `MCP_TRANSPORT`:

| `MCP_TRANSPORT` | Behavior |
| --- | --- |
| `stdio` (default) | Sync bridge + MCP over stdio (for Cursor launching the process locally). |
| `http` | Sync bridge + MCP over **Streamable HTTP** at `/mcp` (headless/networked, e.g. Docker). |
| `both` | Sync bridge + stdio + HTTP. |

The HTTP/SSE sync bridge always runs regardless of transport.

## Docker

The repo's root `docker-compose.yml` runs this server headlessly (`MCP_TRANSPORT=http`) alongside the web app, with auto-restart, healthchecks, and a persistent volume:

```bash
docker compose up -d --build   # from the repo root
```

Or build/run just this image:

```bash
docker build -t diagramwright-mcp ./mcp
docker run -d --restart unless-stopped --init \
  -p 4319:4319 -p 4320:4320 -v diagram-data:/data \
  diagramwright-mcp
```

Agents then connect over HTTP:

```json
{ "mcpServers": { "diagramwright": { "url": "http://localhost:4320/mcp" } } }
```

### Register with Cursor

A workspace config is already provided at `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "diagramwright": {
      "command": "node",
      "args": ["/absolute/path/to/diagramwright/mcp/dist/index.js"],
      "env": { "DIAGRAMWRIGHT_BRIDGE_PORT": "4319" }
    }
  }
}
```

Update the path if you move the repo. After saving, reload Cursor's MCP servers (Settings → MCP) and the `diagramwright` tools become available.

> The same JSON works for any MCP client (Claude Desktop, etc.). Point `command`/`args` at `node dist/index.js`.

### Connect the browser

Run the web app (`npm run dev` in the repo root) and open it. The toolbar shows an **Agent sync** badge:

- **green** — connected to the bridge; agents can edit the diagram.
- **amber** — connecting.
- **grey** — bridge not reachable (start this MCP server).

No configuration is needed as long as the bridge runs on `http://localhost:4319`. To use a different port, set `DIAGRAMWRIGHT_BRIDGE_PORT` here and `NEXT_PUBLIC_DIAGRAMWRIGHT_BRIDGE_URL` for the web app.

## Tools

| Tool | Description |
| --- | --- |
| `get_diagram` | Current diagram as JSON + revision. |
| `get_mermaid` | Current diagram as Mermaid flowchart syntax. |
| `add_node` | Add a node (`process`/`decision`/`terminal`/`database`/`subroutine`). |
| `update_node` | Update a node's label, kind, and/or position. |
| `remove_node` | Delete a node (and its edges). |
| `add_edge` | Connect two nodes by id, with an optional label. |
| `update_edge` | Set/clear an edge label. |
| `remove_edge` | Delete an edge. |
| `set_direction` | Set layout direction `TD`/`LR`/`BT`/`RL`. |
| `set_title` | Set the diagram title. |
| `set_diagram` | Replace the whole diagram (bulk edit / generate from scratch). |
| `clear_diagram` | Reset to an empty diagram. |

## Resources

- `diagram://current` — live diagram as JSON.
- `diagram://mermaid` — live diagram as Mermaid text.

## Sync bridge HTTP API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness + revision. |
| `GET` | `/diagram` | `{ diagram, revision }` (diagram is `null` until first edit). |
| `PUT` | `/diagram` | Body `{ diagram, clientId }` — replace state (used by the browser). |
| `GET` | `/events` | SSE stream of `sync`/`update` events `{ diagram, revision, origin }`. |

`origin` lets clients ignore their own echoed changes. Agent edits use `origin: "agent"`.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `MCP_TRANSPORT` | `stdio` | `stdio`, `http`, or `both`. |
| `DIAGRAMWRIGHT_BRIDGE_PORT` | `4319` | Port for the HTTP/SSE bridge. |
| `MCP_HTTP_PORT` | `4320` | Port for the Streamable HTTP MCP endpoint (when enabled). |
| `DIAGRAMWRIGHT_STATE_FILE` | _(unset)_ | Optional path to persist diagram JSON across restarts. |
