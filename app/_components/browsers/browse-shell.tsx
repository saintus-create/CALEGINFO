"use client";

import type { ReactNode } from "react";

import { MobileDockNav } from "@/app/_components/mobile-dock-nav";
import { SiteHeader } from "@/app/_components/site-header";
import { PageColumn, PageGrid } from "@/components/layout/page-grid";
import { cn } from "@/lib/utils";

/**
 * Shell for the research library pages.
 *
 * The shell owns the grid: the header, an optional rail and the scrolling
 * content column are all children of one `PageGrid`, so the rail's border, the
 * content's left edge and the header's logo sit on the same column lines at
 * every breakpoint. Pages supply content, not widths.
 *
 *   column="content" columns 3–10 — the site's content column, default
 *   column="wide"    columns 2–11 — only for tables that need the room
 *
 * With a rail the content moves to `col-main` (columns 4–12), and the rail
 * itself is `col-rail` (columns 1–3).
 */
export function BrowseShell({
  active,
  rail,
  column = "content",
  children,
}: {
  active: string;
  /** optional left rail; it occupies columns 1–3 from lg up */
  rail?: ReactNode;
  column?: "wide" | "content";
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <SiteHeader active={active} />

      <PageGrid className="min-h-0 flex-1">
        {rail ? (
          <PageColumn
            as="aside"
            className="col-rail h-full overflow-y-auto border-r border-border py-6 lg:py-8"
            aria-label="Sections"
          >
            {rail}
          </PageColumn>
        ) : null}

        <PageColumn
          className={cn(
            "h-full overflow-y-auto py-6 lg:py-8",
            rail ? "col-main" : column === "wide" ? "col-wide" : "col-content",
          )}
        >
          {children}
        </PageColumn>
      </PageGrid>

      <MobileDockNav active={active} />
    </div>
  );
}

export default BrowseShell;
