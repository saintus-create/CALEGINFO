"use client";

import { useEffect, useState } from "react";

import { THEME_KEY } from "@/lib/base/theme-key";

export { THEME_BOOT_SCRIPT, THEME_KEY } from "@/lib/base/theme-key";

export type Theme = "light" | "dark";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/** Saved choice wins; otherwise follow the OS. */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
  applyTheme(theme);
  window.dispatchEvent(new Event("law-theme-change"));
}

/** Current theme, kept in sync with the toggle and with OS changes. */
export function useTheme(): Theme {
  const [theme, setLocal] = useState<Theme>("light");

  useEffect(() => {
    const sync = () => setLocal(readTheme());
    sync();
    window.addEventListener("law-theme-change", sync);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("law-theme-change", sync);
      mq.removeEventListener("change", sync);
    };
  }, []);

  return theme;
}

