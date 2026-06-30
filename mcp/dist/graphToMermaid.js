export function sanitizeMermaidId(id) {
    const cleaned = id.replace(/[^a-zA-Z0-9_]/g, "_");
    return /^[0-9]/.test(cleaned) ? `n_${cleaned}` : cleaned;
}
function escapeLabel(label) {
    const trimmed = label.trim() || " ";
    return trimmed.replaceAll('"', "'");
}
function formatNode(node) {
    const id = sanitizeMermaidId(node.id);
    const label = escapeLabel(node.label);
    switch (node.kind) {
        case "decision":
            return `${id}{"${label}"}`;
        case "terminal":
            return `${id}(["${label}"])`;
        case "database":
            return `${id}[("${label}")]`;
        case "subroutine":
            return `${id}[["${label}"]]`;
        case "process":
        default:
            return `${id}["${label}"]`;
    }
}
function formatEdge(edge) {
    const source = sanitizeMermaidId(edge.source);
    const target = sanitizeMermaidId(edge.target);
    if (edge.label?.trim()) {
        const label = edge.label.trim().replaceAll("|", "/").replaceAll('"', "'");
        return `${source} -->|"${label}"| ${target}`;
    }
    return `${source} --> ${target}`;
}
export function graphToMermaid(diagram) {
    const lines = [`flowchart ${diagram.direction}`];
    if (diagram.title?.trim()) {
        lines.unshift("---", `title: ${diagram.title.trim()}`, "---");
    }
    for (const node of diagram.nodes) {
        lines.push(`  ${formatNode(node)}`);
    }
    for (const edge of diagram.edges) {
        lines.push(`  ${formatEdge(edge)}`);
    }
    return lines.join("\n");
}
