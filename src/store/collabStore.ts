import { create } from "zustand";

export type CollabStatus = "offline" | "connecting" | "connected";

type CollabState = {
  status: CollabStatus;
  /** Briefly true right after an agent (MCP) edit arrives. */
  agentActive: boolean;
  setStatus: (status: CollabStatus) => void;
  setAgentActive: (active: boolean) => void;
};

export const useCollabStore = create<CollabState>((set) => ({
  status: "offline",
  agentActive: false,
  setStatus: (status) => set({ status }),
  setAgentActive: (agentActive) => set({ agentActive }),
}));
