import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme } from "@/types/diagram";

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
};

const ORDER: Theme[] = ["system", "light", "dark"];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      cycleTheme: () =>
        set((state) => {
          const next = ORDER[(ORDER.indexOf(state.theme) + 1) % ORDER.length];
          return { theme: next };
        }),
    }),
    { name: "diagramwright:theme" },
  ),
);

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}
