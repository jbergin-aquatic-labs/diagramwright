"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

export function MermaidOutput({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCopy = async () => {
    try {
      await copyToClipboard(code);
      setError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Mermaid flowchart
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-500" /> Copied
            </>
          ) : (
            <>
              <Copy size={14} /> Copy
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="border-b border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
      <pre className="flex-1 overflow-auto bg-background p-3 font-mono text-[13px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
