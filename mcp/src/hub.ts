import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  type Diagram,
  type DiagramDirection,
  type DiagramEdge,
  type DiagramNode,
  type DiagramNodeKind,
  emptyDiagram,
} from "./types.js";

export interface HubSnapshot {
  diagram: Diagram | null;
  revision: number;
}

type Listener = (snapshot: HubSnapshot, origin: string) => void;

function createId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

/**
 * Authoritative, in-memory diagram state shared by the MCP tools and the
 * HTTP/SSE bridge. Every mutation bumps a monotonic revision and notifies
 * listeners with the origin of the change so clients can avoid echo loops.
 */
export class DiagramHub {
  private diagram: Diagram | null = null;
  private revision = 0;
  private readonly listeners = new Set<Listener>();
  private readonly stateFile?: string;

  constructor(stateFile?: string) {
    this.stateFile = stateFile;
    if (stateFile) {
      try {
        const raw = readFileSync(stateFile, "utf8");
        const parsed = JSON.parse(raw) as Diagram;
        if (parsed && Array.isArray(parsed.nodes)) this.diagram = parsed;
      } catch {
        // No existing state file; start empty.
      }
    }
  }

  snapshot(): HubSnapshot {
    return { diagram: this.diagram, revision: this.revision };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(origin: string): void {
    this.revision += 1;
    if (this.stateFile && this.diagram) {
      try {
        writeFileSync(this.stateFile, JSON.stringify(this.diagram, null, 2));
      } catch {
        // Persistence is best-effort.
      }
    }
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap, origin);
  }

  private ensure(): Diagram {
    if (!this.diagram) this.diagram = emptyDiagram();
    return this.diagram;
  }

  /** Replace the whole diagram (used by the web client and bulk tools). */
  setDiagram(diagram: Diagram, origin: string): Diagram {
    this.diagram = {
      title: diagram.title ?? "",
      direction: diagram.direction ?? "TD",
      nodes: Array.isArray(diagram.nodes) ? diagram.nodes : [],
      edges: Array.isArray(diagram.edges) ? diagram.edges : [],
    };
    this.emit(origin);
    return this.diagram;
  }

  addNode(
    input: {
      kind: DiagramNodeKind;
      label: string;
      x?: number;
      y?: number;
      id?: string;
    },
    origin = "agent",
  ): DiagramNode {
    const diagram = this.ensure();
    const node: DiagramNode = {
      id: input.id?.trim() || createId(input.kind),
      label: input.label,
      kind: input.kind,
      position: {
        x: input.x ?? Math.round(80 + Math.random() * 240),
        y: input.y ?? Math.round(80 + Math.random() * 240),
      },
    };
    diagram.nodes.push(node);
    this.emit(origin);
    return node;
  }

  updateNode(
    id: string,
    patch: { label?: string; kind?: DiagramNodeKind; x?: number; y?: number },
    origin = "agent",
  ): DiagramNode {
    const diagram = this.ensure();
    const node = diagram.nodes.find((n) => n.id === id);
    if (!node) throw new Error(`No node with id "${id}".`);
    if (patch.label !== undefined) node.label = patch.label;
    if (patch.kind !== undefined) node.kind = patch.kind;
    if (patch.x !== undefined) node.position.x = patch.x;
    if (patch.y !== undefined) node.position.y = patch.y;
    this.emit(origin);
    return node;
  }

  removeNode(id: string, origin = "agent"): void {
    const diagram = this.ensure();
    const before = diagram.nodes.length;
    diagram.nodes = diagram.nodes.filter((n) => n.id !== id);
    if (diagram.nodes.length === before)
      throw new Error(`No node with id "${id}".`);
    diagram.edges = diagram.edges.filter(
      (e) => e.source !== id && e.target !== id,
    );
    this.emit(origin);
  }

  addEdge(
    input: { source: string; target: string; label?: string; id?: string },
    origin = "agent",
  ): DiagramEdge {
    const diagram = this.ensure();
    const sourceExists = diagram.nodes.some((n) => n.id === input.source);
    const targetExists = diagram.nodes.some((n) => n.id === input.target);
    if (!sourceExists) throw new Error(`No source node "${input.source}".`);
    if (!targetExists) throw new Error(`No target node "${input.target}".`);
    if (input.source === input.target)
      throw new Error("Cannot connect a node to itself.");
    const exists = diagram.edges.some(
      (e) => e.source === input.source && e.target === input.target,
    );
    if (exists)
      throw new Error(
        `An edge from "${input.source}" to "${input.target}" already exists.`,
      );
    const edge: DiagramEdge = {
      id: input.id?.trim() || createId("e"),
      source: input.source,
      target: input.target,
      label: input.label?.trim() ? input.label.trim() : undefined,
    };
    diagram.edges.push(edge);
    this.emit(origin);
    return edge;
  }

  updateEdge(
    id: string,
    patch: { label?: string },
    origin = "agent",
  ): DiagramEdge {
    const diagram = this.ensure();
    const edge = diagram.edges.find((e) => e.id === id);
    if (!edge) throw new Error(`No edge with id "${id}".`);
    if (patch.label !== undefined)
      edge.label = patch.label.trim() ? patch.label.trim() : undefined;
    this.emit(origin);
    return edge;
  }

  removeEdge(id: string, origin = "agent"): void {
    const diagram = this.ensure();
    const before = diagram.edges.length;
    diagram.edges = diagram.edges.filter((e) => e.id !== id);
    if (diagram.edges.length === before)
      throw new Error(`No edge with id "${id}".`);
    this.emit(origin);
  }

  setDirection(direction: DiagramDirection, origin = "agent"): void {
    this.ensure().direction = direction;
    this.emit(origin);
  }

  setTitle(title: string, origin = "agent"): void {
    this.ensure().title = title;
    this.emit(origin);
  }

  clear(origin = "agent"): void {
    this.diagram = emptyDiagram();
    this.emit(origin);
  }
}
