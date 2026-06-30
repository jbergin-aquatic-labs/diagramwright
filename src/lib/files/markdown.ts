export type MermaidBlock = {
  /** 0-based index of this block among mermaid blocks in the document. */
  index: number;
  code: string;
};

const BLOCK_RE = /```mermaid[^\n]*\n([\s\S]*?)```/g;

export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  let match: RegExpExecArray | null;
  BLOCK_RE.lastIndex = 0;
  let index = 0;
  while ((match = BLOCK_RE.exec(markdown)) !== null) {
    blocks.push({ index: index++, code: match[1].replace(/\s+$/, "") });
  }
  return blocks;
}

/** Heuristic: does this text look like a bare Mermaid flowchart (no fences)? */
export function looksLikeBareMermaid(text: string): boolean {
  return /^\s*(?:---[\s\S]*?---\s*)?(?:flowchart|graph)\s+(?:TD|TB|LR|RL|BT)\b/im.test(
    text.trim(),
  );
}

/** Replace the Nth mermaid fenced block's body with new code. */
export function replaceMermaidBlock(
  markdown: string,
  index: number,
  newCode: string,
): string {
  let current = -1;
  return markdown.replace(BLOCK_RE, (whole, _body, offset, full) => {
    void _body;
    void offset;
    void full;
    current += 1;
    if (current !== index) return whole;
    const fenceMatch = whole.match(/^```mermaid[^\n]*\n/);
    const fenceHeader = fenceMatch ? fenceMatch[0] : "```mermaid\n";
    return `${fenceHeader}${newCode.replace(/\s+$/, "")}\n\`\`\``;
  });
}
