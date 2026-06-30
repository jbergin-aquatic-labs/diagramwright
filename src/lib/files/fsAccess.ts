// Minimal typings + helpers for the File System Access API. These are kept
// local so the feature compiles regardless of the TS DOM lib version.

export interface FsWritable {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

export interface FsFileHandle {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<FsWritable>;
  queryPermission?: (opts: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (opts: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
}

export interface FsDirectoryHandle {
  kind: "directory";
  name: string;
  values: () => AsyncIterableIterator<FsFileHandle | FsDirectoryHandle>;
}

type PickerWindow = typeof window & {
  showDirectoryPicker?: () => Promise<FsDirectoryHandle>;
  showOpenFilePicker?: (opts?: unknown) => Promise<FsFileHandle[]>;
};

export function supportsFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as PickerWindow).showDirectoryPicker === "function"
  );
}

export const MARKDOWN_EXTS = [".md", ".markdown", ".mmd", ".mermaid"];

export function isMarkdownLike(name: string): boolean {
  const lower = name.toLowerCase();
  return MARKDOWN_EXTS.some((ext) => lower.endsWith(ext));
}

export async function pickDirectory(): Promise<FsDirectoryHandle> {
  const w = window as PickerWindow;
  if (!w.showDirectoryPicker) throw new Error("Folder picker not supported.");
  return w.showDirectoryPicker();
}

export async function pickFile(): Promise<FsFileHandle | null> {
  const w = window as PickerWindow;
  if (!w.showOpenFilePicker) throw new Error("File picker not supported.");
  const handles = await w.showOpenFilePicker({
    types: [
      {
        description: "Markdown / Mermaid",
        accept: { "text/markdown": MARKDOWN_EXTS, "text/plain": MARKDOWN_EXTS },
      },
    ],
    multiple: false,
  });
  return handles[0] ?? null;
}

export type FileEntry = { name: string; path: string; handle: FsFileHandle };

/** Recursively collect markdown-like files (bounded depth) from a directory. */
export async function listMarkdownFiles(
  dir: FsDirectoryHandle,
  maxDepth = 4,
): Promise<FileEntry[]> {
  const out: FileEntry[] = [];

  const walk = async (
    handle: FsDirectoryHandle,
    prefix: string,
    depth: number,
  ): Promise<void> => {
    if (depth > maxDepth) return;
    for await (const entry of handle.values()) {
      if (entry.kind === "file") {
        if (isMarkdownLike(entry.name)) {
          out.push({
            name: entry.name,
            path: prefix ? `${prefix}/${entry.name}` : entry.name,
            handle: entry,
          });
        }
      } else if (
        entry.name !== "node_modules" &&
        entry.name !== ".git" &&
        !entry.name.startsWith(".")
      ) {
        await walk(
          entry,
          prefix ? `${prefix}/${entry.name}` : entry.name,
          depth + 1,
        );
      }
    }
  };

  await walk(dir, "", 0);
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

export async function readFileText(handle: FsFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function ensureWritePermission(
  handle: FsFileHandle,
): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const opts = { mode: "readwrite" as const };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

export async function writeFileText(
  handle: FsFileHandle,
  text: string,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}
