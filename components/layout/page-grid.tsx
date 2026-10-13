import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The page grid.
 *
 * Every horizontal position on the site comes from here: `PageGrid` lays out
 * the `--grid-columns` (12) columns of `app/globals.css` with the live gutter
 * and page margin, and `PageColumn` places a surface on whole columns of it.
 * The header, the chat turns, the composer, the browse rail and the prose
 * column are all children of the same grid, which is why their edges line up.
 *
 * Not every surface needs the component — `page-grid`, `col-content`,
 * `col-rail` and `col-main` are plain classes, and plain Tailwind column
 * utilities (`col-span-6`, `lg:col-start-3`) work inside the grid too.
 */
export function PageGrid({
  as: Comp = "div",
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Comp className={cn("page-grid", className)} {...rest}>
      {children}
    </Comp>
  );
}

type Column = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type Span = Column | "full";

/* Class maps, written out literally so Tailwind's scanner emits them. */
const SPAN: Record<string, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
  full: "col-span-full",
};

const START: Record<number, string> = {
  1: "col-start-1",
  2: "col-start-2",
  3: "col-start-3",
  4: "col-start-4",
  5: "col-start-5",
  6: "col-start-6",
  7: "col-start-7",
  8: "col-start-8",
  9: "col-start-9",
  10: "col-start-10",
  11: "col-start-11",
  12: "col-start-12",
};

const SM_SPAN: Record<string, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  7: "sm:col-span-7",
  8: "sm:col-span-8",
  9: "sm:col-span-9",
  10: "sm:col-span-10",
  11: "sm:col-span-11",
  12: "sm:col-span-12",
  full: "sm:col-span-full",
};

const SM_START: Record<number, string> = {
  1: "sm:col-start-1",
  2: "sm:col-start-2",
  3: "sm:col-start-3",
  4: "sm:col-start-4",
  5: "sm:col-start-5",
  6: "sm:col-start-6",
  7: "sm:col-start-7",
  8: "sm:col-start-8",
  9: "sm:col-start-9",
  10: "sm:col-start-10",
  11: "sm:col-start-11",
  12: "sm:col-start-12",
};

const LG_SPAN: Record<string, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
  full: "lg:col-span-full",
};

const LG_START: Record<number, string> = {
  1: "lg:col-start-1",
  2: "lg:col-start-2",
  3: "lg:col-start-3",
  4: "lg:col-start-4",
  5: "lg:col-start-5",
  6: "lg:col-start-6",
  7: "lg:col-start-7",
  8: "lg:col-start-8",
  9: "lg:col-start-9",
  10: "lg:col-start-10",
  11: "lg:col-start-11",
  12: "lg:col-start-12",
};

export interface PageColumnProps {
  /** first column it occupies (mobile-first). Omit for auto-placement. */
  start?: Column;
  /**
   * How many columns it occupies. Omit when the placement comes from a
   * semantic column class (`col-content`, `col-wide`, `col-rail`, `col-main`)
   * — those carry their own mobile-first placement, and emitting a span
   * utility as well would just fight with them.
   */
  span?: Span;
  /** from the sm breakpoint (40rem) */
  smStart?: Column;
  smSpan?: Span;
  /** from the lg breakpoint (64rem) */
  lgStart?: Column;
  lgSpan?: Span;
  /** turns the item into its own grid, inheriting the parent's gutter */
  nested?: boolean;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/**
 * A surface on the page grid. Placement is expressed in *columns*, never in
 * pixels, so a change to the grid tokens moves every surface together.
 *
 *   <PageColumn className="col-content">   the chat's content column
 *   <PageColumn span={6}>                  half the grid
 *   <PageColumn lgStart={3} lgSpan={8}>    explicit, mobile-first
 */
export function PageColumn({
  start,
  span,
  smStart,
  smSpan,
  lgStart,
  lgSpan,
  nested = false,
  as: Comp = "div",
  className,
  children,
  ...rest
}: PageColumnProps & React.HTMLAttributes<HTMLElement>) {
  const classes = cn(
    span && SPAN[span],
    start && START[start],
    smSpan && SM_SPAN[smSpan],
    smStart && SM_START[smStart],
    lgSpan && LG_SPAN[lgSpan],
    lgStart && LG_START[lgStart],
    nested && "page-grid",
    className,
  );

  return (
    <Comp className={classes} {...rest}>
      {children}
    </Comp>
  );
}
