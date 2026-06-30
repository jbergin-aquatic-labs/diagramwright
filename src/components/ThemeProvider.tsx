"use client";

import { useEffect } from "react";
import { useThemeStore, resolveTheme } from "@/store/themeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const resolved = resolveTheme(theme);
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
    };

    apply();

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  return <>{children}</>;
}
