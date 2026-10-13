import Link from "next/link";

import { LIBRARY_TABS } from "@/app/_components/library-routes";
import { StarMark } from "@/app/_components/star-mark";
import { ThemeToggle } from "@/app/_components/theme-toggle";
import { Wordmark } from "@/app/_components/wordmark";
import { PageColumn, PageGrid } from "@/components/layout/page-grid";
import { cn } from "@/lib/utils";

/**
 * The header, on the page grid.
 *
 * One component for every shell: the star sits on the first column's left edge
 * and the theme toggle on the last column's right edge, so the header's
 * content lines up with the content column underneath it instead of having its
 * own padding. Height is the `--grid-header` token (56px, on the baseline).
 */
export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="z-30 shrink-0 border-b border-border/60 bg-background">
      <PageGrid className="h-header items-center">
        <PageColumn span={6} className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            aria-label="California Legislation"
            className="flex shrink-0 items-center"
          >
            <StarMark className="size-5" />
          </Link>
          <Wordmark className="hidden text-meta sm:inline" />
        </PageColumn>

        <PageColumn
          start={7}
          span={6}
          className="flex items-center justify-end gap-1"
        >
          <nav
            aria-label="Research library"
            className="hidden items-center gap-1 sm:flex"
          >
            {LIBRARY_TABS.map((tab) => {
              const selected = active === tab.href;
              const Glyph = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-md px-2 text-caption transition-colors xl:px-3",
                    selected
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {/* one icon component, coordinated styles: Regular at rest,
                      Fill for the selected navigation item */}
                  <Glyph aria-hidden className="size-4" weight={selected ? "fill" : "regular"} />
                  {/* the column is six of twelve, so the labels only fit once
                      the page reaches its full width — icons carry it before
                      that, and the dock carries it below sm */}
                  <span className="hidden text-trim whitespace-nowrap xl:inline">{tab.label}</span>
                  <span className="sr-only xl:hidden">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </PageColumn>
      </PageGrid>
    </header>
  );
}

export default SiteHeader;
