export const NODE_KINDS = [
    "process",
    "decision",
    "terminal",
    "database",
    "subroutine",
];
export const DIRECTIONS = ["TD", "LR", "BT", "RL"];
export function emptyDiagram() {
    return { title: "", direction: "TD", nodes: [], edges: [] };
}
