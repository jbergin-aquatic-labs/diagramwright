"use client";

import { useEffect, useRef } from "react";
import { BRIDGE_URL } from "@/lib/collab/config";
import { useDiagramStore } from "@/store/diagramStore";
import { useCollabStore } from "@/store/collabStore";
import type { Diagram } from "@/types/diagram";

type BridgeSnapshot = {
  diagram: Diagram | null;
  revision?: number;
  origin?: string;
};

/**
 * Connects the local diagram store to the MCP sync bridge:
 * - Pulls the current diagram on connect (or seeds the bridge if empty).
 * - Applies live updates from agents / other clients via SSE.
 * - Pushes local edits back to the bridge (debounced), skipping changes that
 *   originated remotely to avoid echo loops.
 */
export function CollabProvider() {
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const { setStatus, setAgentActive } = useCollabStore.getState();
    let closed = false;
    let es: EventSource | null = null;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    let agentTimer: ReturnType<typeof setTimeout> | null = null;

    const applyRemote = (diagram: Diagram, origin: string) => {
      applyingRemoteRef.current = true;
      useDiagramStore.getState().applyRemoteDiagram(diagram);
      applyingRemoteRef.current = false;

      if (origin === "agent") {
        setAgentActive(true);
        if (agentTimer) clearTimeout(agentTimer);
        agentTimer = setTimeout(() => setAgentActive(false), 2000);
      }
    };

    const pushLocal = () => {
      const diagram = useDiagramStore.getState().diagram;
      void fetch(`${BRIDGE_URL}/diagram`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, diagram }),
      }).catch(() => {
        /* bridge offline; local editing still works */
      });
    };

    setStatus("connecting");

    // Initial convergence: adopt the bridge's diagram, or seed it with ours.
    void fetch(`${BRIDGE_URL}/diagram`)
      .then((r) => r.json() as Promise<BridgeSnapshot>)
      .then((snap) => {
        if (closed) return;
        if (snap.diagram == null) pushLocal();
        else applyRemote(snap.diagram, "server");
      })
      .catch(() => {
        /* handled by SSE error state */
      });

    es = new EventSource(`${BRIDGE_URL}/events`);
    es.onopen = () => setStatus("connected");
    es.onerror = () => {
      if (!closed) setStatus(es?.readyState === 1 ? "connected" : "offline");
    };

    const onMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as BridgeSnapshot;
        if (payload.origin === clientId) return; // ignore our own echo
        if (payload.diagram) applyRemote(payload.diagram, payload.origin ?? "");
      } catch {
        /* ignore malformed event */
      }
    };
    es.addEventListener("sync", onMessage);
    es.addEventListener("update", onMessage);

    const unsubscribe = useDiagramStore.subscribe((state, prev) => {
      if (state.diagram === prev.diagram) return; // selection-only change
      if (applyingRemoteRef.current) return; // remote-originated change
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(pushLocal, 250);
    });

    return () => {
      closed = true;
      unsubscribe();
      es?.close();
      if (pushTimer) clearTimeout(pushTimer);
      if (agentTimer) clearTimeout(agentTimer);
      useCollabStore.getState().setStatus("offline");
    };
  }, []);

  return null;
}
