import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { emptyDiagram, } from "./types.js";
function createId(prefix) {
    return `${prefix}_${randomUUID().slice(0, 8)}`;
}
/**
 * Authoritative, in-memory diagram state shared by the MCP tools and the
 * HTTP/SSE bridge. Every mutation bumps a monotonic revision and notifies
 * listeners with the origin of the change so clients can avoid echo loops.
 */
export class DiagramHub {
    diagram = null;
    revision = 0;
    listeners = new Set();
    stateFile;
    constructor(stateFile) {
        this.stateFile = stateFile;
        if (stateFile) {
            try {
                const raw = readFileSync(stateFile, "utf8");
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.nodes))
                    this.diagram = parsed;
            }
            catch {
                // No existing state file; start empty.
            }
        }
    }
    snapshot() {
        return { diagram: this.diagram, revision: this.revision };
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    emit(origin) {
        this.revision += 1;
        if (this.stateFile && this.diagram) {
            try {
                writeFileSync(this.stateFile, JSON.stringify(this.diagram, null, 2));
            }
            catch {
                // Persistence is best-effort.
            }
        }
        const snap = this.snapshot();
        for (const listener of this.listeners)
            listener(snap, origin);
    }
    ensure() {
        if (!this.diagram)
            this.diagram = emptyDiagram();
        return this.diagram;
    }
    /** Replace the whole diagram (used by the web client and bulk tools). */
    setDiagram(diagram, origin) {
        this.diagram = {
            title: diagram.title ?? "",
            direction: diagram.direction ?? "TD",
            nodes: Array.isArray(diagram.nodes) ? diagram.nodes : [],
            edges: Array.isArray(diagram.edges) ? diagram.edges : [],
        };
        this.emit(origin);
        return this.diagram;
    }
    addNode(input, origin = "agent") {
        const diagram = this.ensure();
        const node = {
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
    updateNode(id, patch, origin = "agent") {
        const diagram = this.ensure();
        const node = diagram.nodes.find((n) => n.id === id);
        if (!node)
            throw new Error(`No node with id "${id}".`);
        if (patch.label !== undefined)
            node.label = patch.label;
        if (patch.kind !== undefined)
            node.kind = patch.kind;
        if (patch.x !== undefined)
            node.position.x = patch.x;
        if (patch.y !== undefined)
            node.position.y = patch.y;
        this.emit(origin);
        return node;
    }
    removeNode(id, origin = "agent") {
        const diagram = this.ensure();
        const before = diagram.nodes.length;
        diagram.nodes = diagram.nodes.filter((n) => n.id !== id);
        if (diagram.nodes.length === before)
            throw new Error(`No node with id "${id}".`);
        diagram.edges = diagram.edges.filter((e) => e.source !== id && e.target !== id);
        this.emit(origin);
    }
    addEdge(input, origin = "agent") {
        const diagram = this.ensure();
        const sourceExists = diagram.nodes.some((n) => n.id === input.source);
        const targetExists = diagram.nodes.some((n) => n.id === input.target);
        if (!sourceExists)
            throw new Error(`No source node "${input.source}".`);
        if (!targetExists)
            throw new Error(`No target node "${input.target}".`);
        if (input.source === input.target)
            throw new Error("Cannot connect a node to itself.");
        const exists = diagram.edges.some((e) => e.source === input.source && e.target === input.target);
        if (exists)
            throw new Error(`An edge from "${input.source}" to "${input.target}" already exists.`);
        const edge = {
            id: input.id?.trim() || createId("e"),
            source: input.source,
            target: input.target,
            label: input.label?.trim() ? input.label.trim() : undefined,
        };
        diagram.edges.push(edge);
        this.emit(origin);
        return edge;
    }
    updateEdge(id, patch, origin = "agent") {
        const diagram = this.ensure();
        const edge = diagram.edges.find((e) => e.id === id);
        if (!edge)
            throw new Error(`No edge with id "${id}".`);
        if (patch.label !== undefined)
            edge.label = patch.label.trim() ? patch.label.trim() : undefined;
        this.emit(origin);
        return edge;
    }
    removeEdge(id, origin = "agent") {
        const diagram = this.ensure();
        const before = diagram.edges.length;
        diagram.edges = diagram.edges.filter((e) => e.id !== id);
        if (diagram.edges.length === before)
            throw new Error(`No edge with id "${id}".`);
        this.emit(origin);
    }
    setDirection(direction, origin = "agent") {
        this.ensure().direction = direction;
        this.emit(origin);
    }
    setTitle(title, origin = "agent") {
        this.ensure().title = title;
        this.emit(origin);
    }
    clear(origin = "agent") {
        this.diagram = emptyDiagram();
        this.emit(origin);
    }
}
