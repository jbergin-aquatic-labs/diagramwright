import type {
  Diagram,
  DiagramDirection,
  DiagramEdge,
  DiagramNode,
  DiagramNodeKind,
} from "@/types/diagram";

export type ParseResult =
  | { ok: true; diagram: Diagram }
  | { ok: false; error: string };

const DIRECTION_MAP: Record<string, DiagramDirection> = {
  TD: "TD",
  TB: "TD",
  LR: "LR",
  RL: "RL",
  BT: "BT",
};

type ParsedNode = { id: string; label?: string; kind?: DiagramNodeKind };

function stripQuotes(value: string): string {
  const t = value.trim();
  const m = t.match(/^"([\s\S]*)"$/) ?? t.match(/^'([\s\S]*)'$/);
  return (m ? m[1] : t).trim();
}

/** Parse a single node token such as `id["Label"]` into id/label/kind. */
function parseNodeToken(token: string): ParsedNode | null {
  const t = token.trim();
  if (!t) return null;
  const m = t.match(/^([A-Za-z0-9_-]+)\s*([\s\S]*)$/);
  if (!m) return null;
  const id = m[1];
  const rest = m[2].trim();
  if (!rest) return { id };

  const wrap = (open: string, close: string): string | null =>
    rest.startsWith(open) && rest.endsWith(close) && rest.length >= open.length + close.length
      ? rest.slice(open.length, rest.length - close.length)
      : null;

  let inner: string | null;
  if ((inner = wrap("([", "])")) !== null)
    return { id, label: stripQuotes(inner), kind: "terminal" };
  if ((inner = wrap("[(", ")]")) !== null)
    return { id, label: stripQuotes(inner), kind: "database" };
  if ((inner = wrap("[[", "]]")) !== null)
    return { id, label: stripQuotes(inner), kind: "subroutine" };
  if ((inner = wrap("{{", "}}")) !== null)
    return { id, label: stripQuotes(inner), kind: "decision" };
  if ((inner = wrap("((", "))")) !== null)
    return { id, label: stripQuotes(inner), kind: "terminal" };
  if ((inner = wrap("{", "}")) !== null)
    return { id, label: stripQuotes(inner), kind: "decision" };
  if ((inner = wrap("[", "]")) !== null)
    return { id, label: stripQuotes(inner), kind: "process" };
  if ((inner = wrap("(", ")")) !== null)
    return { id, label: stripQuotes(inner), kind: "process" };

  return { id };
}

const LINK_RE = /^(<-->|-->|---|-\.->|-\.-|==>|===|--x|--o|<--)/;
// Embedded-label links such as `-- text -->`, `-. text .->`, `== text ==>`.
const EMBEDDED_RE = /^(?:--|-\.|==)\s*([^|>]*?)\s*(?:--+>|\.->|==+>)/;

/**
 * Split a statement into node texts and the links between them, respecting
 * bracket/quote nesting so labels containing link-like characters are safe.
 */
function splitStatement(stmt: string): {
  nodes: string[];
  labels: (string | undefined)[];
} {
  const nodes: string[] = [];
  const labels: (string | undefined)[] = [];
  let buf = "";
  let depth = 0;
  let inQuote = false;

  for (let i = 0; i < stmt.length; ) {
    const ch = stmt[i];

    if (inQuote) {
      buf += ch;
      if (ch === '"') inQuote = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuote = true;
      buf += ch;
      i += 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      buf += ch;
      i += 1;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
      buf += ch;
      i += 1;
      continue;
    }

    if (depth === 0) {
      const slice = stmt.slice(i);
      const op = slice.match(LINK_RE);
      if (op) {
        nodes.push(buf.trim());
        buf = "";
        i += op[0].length;
        // Optional piped label immediately following the operator.
        let rest = stmt.slice(i);
        const lead = rest.match(/^\s*/)?.[0].length ?? 0;
        i += lead;
        rest = stmt.slice(i);
        if (rest.startsWith("|")) {
          const end = rest.indexOf("|", 1);
          if (end !== -1) {
            labels.push(stripQuotes(rest.slice(1, end)));
            i += end + 1;
          } else {
            labels.push(undefined);
            i += 1;
          }
        } else {
          labels.push(undefined);
        }
        continue;
      }
      const emb = slice.match(EMBEDDED_RE);
      if (emb) {
        nodes.push(buf.trim());
        buf = "";
        labels.push(emb[1].trim() ? stripQuotes(emb[1].trim()) : undefined);
        i += emb[0].length;
        i += stmt.slice(i).match(/^\s*/)?.[0].length ?? 0;
        continue;
      }
    }

    buf += ch;
    i += 1;
  }
  nodes.push(buf.trim());
  return { nodes, labels };
}

function layout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: DiagramDirection,
): void {
  if (nodes.length === 0) return;
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const targets = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    targets.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const e of edges) {
    if (!targets.has(e.source) || !indeg.has(e.target)) continue;
    targets.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  // Longest-path layering with a cycle-safe iteration cap.
  const layer = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    for (const e of edges) {
      const sl = layer.get(e.source) ?? 0;
      const tl = layer.get(e.target) ?? 0;
      if (tl < sl + 1) {
        layer.set(e.target, sl + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const byLayer = new Map<number, string[]>();
  for (const n of nodes) {
    const l = layer.get(n.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n.id);
  }
  const maxLayer = Math.max(...layer.values());

  const CROSS = 220;
  const DOWN = 150;
  const horizontal = direction === "LR" || direction === "RL";

  for (const [l, ids] of byLayer) {
    ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    ids.forEach((id, index) => {
      const node = nodes.find((n) => n.id === id)!;
      const mainLayer =
        direction === "BT" || direction === "RL" ? maxLayer - l : l;
      if (horizontal) {
        node.position = { x: mainLayer * CROSS, y: index * DOWN };
      } else {
        node.position = { x: index * CROSS, y: mainLayer * DOWN };
      }
    });
  }
}

/** Parse Mermaid flowchart text into the Diagram model with auto-layout. */
export function parseMermaidFlowchart(input: string): ParseResult {
  let text = input.trim();
  if (!text) return { ok: false, error: "The Mermaid block is empty." };

  let title = "";
  const fm = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (fm) {
    const titleLine = fm[1].match(/title:\s*(.+)/);
    if (titleLine) title = titleLine[1].trim();
    text = text.slice(fm[0].length);
  }

  const lines = text.split("\n");
  let direction: DiagramDirection = "TD";
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i]
      .trim()
      .match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i);
    if (header) {
      direction = DIRECTION_MAP[header[1].toUpperCase()] ?? "TD";
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1)
    return {
      ok: false,
      error: "No `flowchart`/`graph` declaration found. Only flowcharts are supported.",
    };

  const nodeMap = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];
  let edgeSeq = 0;

  const registerNode = (parsed: ParsedNode | null) => {
    if (!parsed) return;
    const existing = nodeMap.get(parsed.id);
    if (!existing) {
      nodeMap.set(parsed.id, {
        id: parsed.id,
        label: parsed.label ?? parsed.id,
        kind: parsed.kind ?? "process",
        position: { x: 0, y: 0 },
      });
      return;
    }
    if (parsed.label && existing.label === existing.id)
      existing.label = parsed.label;
    if (parsed.kind && existing.kind === "process") existing.kind = parsed.kind;
  };

  const statements: string[] = [];
  for (const raw of lines.slice(headerIndex + 1)) {
    for (const piece of raw.split(";")) statements.push(piece);
  }

  for (const rawStmt of statements) {
    const stmt = rawStmt.trim();
    if (!stmt || stmt.startsWith("%%")) continue;
    if (/^(subgraph|end|classDef|class|style|linkStyle|click|direction)\b/i.test(stmt))
      continue;

    const { nodes: parts, labels } = splitStatement(stmt);
    if (parts.length === 1) {
      registerNode(parseNodeToken(parts[0]));
      continue;
    }

    let prev = parseNodeToken(parts[0]);
    registerNode(prev);
    for (let i = 1; i < parts.length; i += 1) {
      const cur = parseNodeToken(parts[i]);
      registerNode(cur);
      if (prev && cur) {
        const label = labels[i - 1];
        edges.push({
          id: `imp_${edgeSeq++}`,
          source: prev.id,
          target: cur.id,
          label: label?.trim() ? label.trim() : undefined,
        });
      }
      prev = cur;
    }
  }

  const nodes = [...nodeMap.values()];
  if (nodes.length === 0)
    return { ok: false, error: "No nodes found in the flowchart." };

  layout(nodes, edges, direction);

  return { ok: true, diagram: { title, direction, nodes, edges } };
}
