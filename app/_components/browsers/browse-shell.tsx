"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LIBRARY_TABS } from "@/app/_components/library-routes";
import { MobileDockNav } from "@/app/_components/mobile-dock-nav";
import { StarMark } from "@/app/_components/star-mark";
import { ThemeToggle } from "@/app/_components/theme-toggle";

export function BrowseShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Link className="mr-1 flex shrink-0 items-center" href="/" aria-label="California Legislation">
          <StarMark className="size-5" />
        </Link>
        <nav className="flex items-center gap-1" aria-label="Research library">
          {LIBRARY_TABS.map((t) => {
            const selected = active === t.href;
            const Glyph = t.icon;
            return (
              <Link
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-2.5 text-label transition-colors",
                  selected
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                href={t.href}
                key={t.href}
              >
                {/* one icon component, coordinated styles: Regular at rest,
                    Fill for the selected navigation item */}
                <Glyph aria-hidden className="size-4" weight={selected ? "fill" : "regular"} />
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </nav>
        <ThemeToggle className="ml-auto" />
      </header>
      <div className="min-h-0 flex-1">{children}</div>
      <MobileDockNav active={active} />
    </div>
  );
}
