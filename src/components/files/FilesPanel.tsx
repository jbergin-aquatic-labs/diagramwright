"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  Link2,
  Link2Off,
  RefreshCw,
  Save,
  Upload,
} from "lucide-react";
import {
  ensureWritePermission,
  listMarkdownFiles,
  pickDirectory,
  pickFile,
  readFileText,
  supportsFileSystemAccess,
  writeFileText,
  type FileEntry,
  type FsFileHandle,
} from "@/lib/files/fsAccess";
import {
  extractMermaidBlocks,
  looksLikeBareMermaid,
  replaceMermaidBlock,
  type MermaidBlock,
} from "@/lib/files/markdown";
import { parseMermaidFlowchart } from "@/lib/files/parseMermaid";
import { graphToMermaid } from "@/lib/mermaid/graphToMermaid";
import { useDiagramStore } from "@/store/diagramStore";
import { useFilesStore, type MermaidTarget } from "@/store/filesStore";

type PendingFile = {
  name: string;
  handle: FsFileHandle | null;
  text: string;
  blocks: MermaidBlock[];
};

export function FilesPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [supported] = useState(supportsFileSystemAccess);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const { folderName, entries, linked, status, error, busy } = useFilesStore();
  const { setFolder, setLinked, setStatus, setError, setBusy } =
    useFilesStore();
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);

  const importDiagram = (
    name: string,
    handle: FsFileHandle | null,
    code: string,
    target: MermaidTarget,
    canWrite: boolean,
  ) => {
    const result = parseMermaidFlowchart(code);
    if (!result.ok) {
      setError(`Could not import: ${result.error}`);
      return;
    }
    loadDiagram(result.diagram);
    setLinked({ name, handle, target, canWrite });
    setStatus(`Imported ${name}.`);
    setPending(null);
  };

  const openFileContents = (
    name: string,
    handle: FsFileHandle | null,
    text: string,
    canWrite: boolean,
  ) => {
    const blocks = extractMermaidBlocks(text);
    if (blocks.length === 0) {
      if (looksLikeBareMermaid(text)) {
        importDiagram(name, handle, text, { type: "whole" }, canWrite);
      } else {
        setError(`No \`\`\`mermaid block found in ${name}.`);
      }
      return;
    }
    if (blocks.length === 1) {
      importDiagram(
        name,
        handle,
        blocks[0].code,
        { type: "block", index: 0 },
        canWrite,
      );
      return;
    }
    // Multiple blocks: let the user choose which one to import.
    setPending({ name, handle, text, blocks });
    setStatus(`${name} has ${blocks.length} diagrams — pick one.`);
  };

  const onOpenFolder = async () => {
    try {
      setBusy(true);
      const dir = await pickDirectory();
      const found = await listMarkdownFiles(dir);
      setFolder(dir.name, found);
      setStatus(`Opened "${dir.name}" — ${found.length} file(s).`);
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError")
        setError(err instanceof Error ? err.message : "Failed to open folder.");
    } finally {
      setBusy(false);
    }
  };

  const onOpenFile = async () => {
    try {
      setBusy(true);
      const handle = await pickFile();
      if (!handle) return;
      const text = await readFileText(handle);
      openFileContents(handle.name, handle, text, true);
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError")
        setError(err instanceof Error ? err.message : "Failed to open file.");
    } finally {
      setBusy(false);
    }
  };

  const onClickEntry = async (entry: FileEntry) => {
    try {
      setBusy(true);
      const text = await readFileText(entry.handle);
      openFileContents(entry.name, entry.handle, text, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file.");
    } finally {
      setBusy(false);
    }
  };

  const onFallbackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    openFileContents(file.name, null, text, false);
  };

  const onUpdateFile = async () => {
    if (!linked) return;
    const diagram = useDiagramStore.getState().diagram;
    const newCode = graphToMermaid(diagram);

    // Read-only (fallback) link: offer a download instead of writing in place.
    if (!linked.canWrite || !linked.handle) {
      const body =
        linked.target.type === "whole"
          ? newCode
          : `\`\`\`mermaid\n${newCode}\n\`\`\`\n`;
      downloadText(linked.name, body);
      setStatus(`Downloaded updated ${linked.name}.`);
      return;
    }

    try {
      setBusy(true);
      const handle = linked.handle;
      if (!(await ensureWritePermission(handle))) {
        setError("Write permission denied.");
        return;
      }
      let nextText: string;
      if (linked.target.type === "whole") {
        nextText = newCode + "\n";
      } else {
        const current = await readFileText(handle);
        const blocks = extractMermaidBlocks(current);
        if (linked.target.index >= blocks.length) {
          setError("The linked mermaid block no longer exists in the file.");
          return;
        }
        nextText = replaceMermaidBlock(current, linked.target.index, newCode);
      }
      await writeFileText(handle, nextText);
      setStatus(`Updated ${linked.name} at ${new Date().toLocaleTimeString()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to write file.");
    } finally {
      setBusy(false);
    }
  };

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-surface py-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show files"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <FolderOpen size={18} />
        </button>
        {linked && (
          <span className="mt-2 h-2 w-2 rounded-full bg-accent" title={`Linked: ${linked.name}`} />
        )}
      </div>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Files
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Collapse"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {supported ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenFolder}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              <FolderOpen size={14} /> Folder
            </button>
            <button
              type="button"
              onClick={onOpenFile}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              <FileText size={14} /> File
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fallbackInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <Upload size={14} /> Import .md
            </button>
            <input
              ref={fallbackInputRef}
              type="file"
              accept=".md,.markdown,.mmd,.mermaid,text/markdown,text/plain"
              className="hidden"
              onChange={onFallbackFile}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Your browser can&apos;t write files directly. Import to edit, then
              download the updated copy. Use a Chromium browser for in-place
              saving.
            </p>
          </>
        )}
      </div>

      {/* Linked file banner */}
      {linked && (
        <div className="mx-3 mb-2 rounded-lg border border-accent/40 bg-accent/5 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Link2 size={13} className="text-accent" />
            <span className="truncate" title={linked.name}>
              {linked.name}
            </span>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {linked.target.type === "block"
              ? `Mermaid block #${linked.target.index + 1}`
              : "Whole file"}
            {linked.canWrite ? "" : " · read-only"}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onUpdateFile}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {linked.canWrite ? <Save size={13} /> : <Download size={13} />}
              {linked.canWrite ? "Update file" : "Download"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLinked(null);
                setStatus(null);
              }}
              title="Unlink"
              className="flex items-center justify-center rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Link2Off size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Block chooser for files with multiple diagrams */}
      {pending && (
        <div className="mx-3 mb-2 rounded-lg border border-border bg-background p-2">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            Choose a diagram from {pending.name}:
          </p>
          <div className="flex flex-col gap-1">
            {pending.blocks.map((b) => (
              <button
                key={b.index}
                type="button"
                onClick={() =>
                  importDiagram(
                    pending.name,
                    pending.handle,
                    b.code,
                    { type: "block", index: b.index },
                    pending.handle !== null,
                  )
                }
                className="truncate rounded border border-border px-2 py-1 text-left font-mono text-[11px] text-foreground transition-colors hover:bg-surface-muted"
              >
                #{b.index + 1}: {b.code.split("\n")[0]?.slice(0, 28) || "diagram"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {folderName && (
          <div className="flex items-center gap-1 px-1 py-1 text-[11px] text-muted-foreground">
            <FolderOpen size={12} /> {folderName}
          </div>
        )}
        {entries.map((entry) => {
          const active = linked?.name === entry.name;
          return (
            <button
              key={entry.path}
              type="button"
              onClick={() => onClickEntry(entry)}
              title={entry.path}
              className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors ${
                active
                  ? "bg-accent/10 text-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <ChevronRight size={12} className="shrink-0 opacity-50" />
              <span className="truncate">{entry.path}</span>
            </button>
          );
        })}
        {folderName && entries.length === 0 && (
          <p className="px-2 py-2 text-[11px] text-muted-foreground">
            No markdown files found.
          </p>
        )}
      </div>

      {/* Status / errors */}
      {(status || error) && (
        <div
          className={`flex items-start gap-1.5 border-t border-border px-3 py-2 text-[11px] ${
            error ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {error ? (
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          ) : (
            <RefreshCw size={12} className="mt-0.5 shrink-0" />
          )}
          <span className="break-words">{error ?? status}</span>
        </div>
      )}
    </aside>
  );
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
