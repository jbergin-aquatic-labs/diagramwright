export function sanitizeMermaidId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_]/g, "_");
  // Mermaid ids cannot start with a digit; prefix if needed.
  return /^[0-9]/.test(cleaned) ? `n_${cleaned}` : cleaned;
}
