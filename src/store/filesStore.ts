import { create } from "zustand";
import type { FileEntry, FsFileHandle } from "@/lib/files/fsAccess";

export type MermaidTarget =
  | { type: "block"; index: number }
  | { type: "whole" };

export type LinkedFile = {
  name: string;
  handle: FsFileHandle | null; // null in read-only fallback (no write handle)
  target: MermaidTarget;
  canWrite: boolean;
};

type FilesState = {
  folderName: string | null;
  entries: FileEntry[];
  linked: LinkedFile | null;
  status: string | null;
  error: string | null;
  busy: boolean;

  setFolder: (name: string | null, entries: FileEntry[]) => void;
  setLinked: (linked: LinkedFile | null) => void;
  setStatus: (status: string | null) => void;
  setError: (error: string | null) => void;
  setBusy: (busy: boolean) => void;
};

export const useFilesStore = create<FilesState>((set) => ({
  folderName: null,
  entries: [],
  linked: null,
  status: null,
  error: null,
  busy: false,

  setFolder: (folderName, entries) => set({ folderName, entries }),
  setLinked: (linked) => set({ linked }),
  setStatus: (status) => set({ status, error: null }),
  setError: (error) => set({ error, status: null }),
  setBusy: (busy) => set({ busy }),
}));
