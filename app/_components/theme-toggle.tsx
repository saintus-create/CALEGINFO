"use client";

import { Moon, Sun } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { setTheme, useTheme } from "@/lib/base/theme";

/** Optional dark mode. Light stays the default; this only ever switches. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {dark ? (
        <Sun aria-hidden className="size-4" weight="regular" />
      ) : (
        <Moon aria-hidden className="size-4" weight="regular" />
      )}
    </button>
  );
}
