"use client";

import { useSyncExternalStore } from "react";
import { Toolbar } from "@/components/canvas/Toolbar";
import { Sidebar } from "@/components/canvas/Sidebar";
import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { Inspector } from "@/components/canvas/Inspector";
import { OutputPanel } from "@/components/canvas/OutputPanel";
import { CollabProvider } from "@/components/CollabProvider";

const noopSubscribe = () => () => {};

// Returns false during SSR and the first client render, true afterwards.
// Gates localStorage-persisted UI so server/client markup matches.
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export default function Home() {
  const mounted = useHydrated();

  return (
    <div className="flex h-full flex-col">
      {mounted && <CollabProvider />}
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative min-w-0 flex-1">
          {mounted ? (
            <DiagramCanvas />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading editor…
            </div>
          )}
          {mounted && <Inspector />}
        </main>
        {mounted && <OutputPanel />}
      </div>
    </div>
  );
}
