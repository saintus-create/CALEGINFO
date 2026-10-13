import type { Meta, StoryObj } from "@storybook/react";

import { GridGuides } from "./grid-guides";
import { PageColumn, PageGrid } from "./page-grid";

/**
 * The grid, on the grid.
 *
 * Every example here is built from the same tokens the site uses, so this page
 * doubles as the reference: column placements in columns, spacing in multiples
 * of the 4px baseline, type from the `text-*` scale whose line-heights are
 * multiples of that baseline, and headings trimmed with `text-box-trim`.
 */
const meta = {
  title: "Layout/PageGrid",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Band({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="py-6">
      <PageGrid>
        <PageColumn className="col-span-full">
          <p className="eyebrow">{label}</p>
        </PageColumn>
      </PageGrid>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export const Columns: Story = {
  render: () => (
    <div className="bg-background text-foreground">
      <Band label="12 columns · full width">
        <PageGrid>
          {Array.from({ length: 12 }, (_, index) => (
            <div
              key={index}
              className="col-span-1 h-16 rounded-md border border-border bg-muted/40"
            />
          ))}
        </PageGrid>
      </Band>

      <Band label="col-content · columns 3–10, where the chat and prose live">
        <PageGrid>
          <div className="col-content h-16 rounded-md border border-border bg-muted/40" />
        </PageGrid>
      </Band>

      <Band label="col-rail + col-main · columns 1–3 and 4–12 (the Codes page)">
        <PageGrid>
          <div className="col-rail h-16 rounded-md border border-border bg-muted/40" />
          <div className="col-main h-16 rounded-md border border-border bg-muted/40" />
        </PageGrid>
      </Band>

      <Band label="col-wide · columns 2–12 (browse lists)">
        <PageGrid>
          <div className="col-wide h-16 rounded-md border border-border bg-muted/40" />
        </PageGrid>
      </Band>

      <Band label="gap-gutter · one gutter between columns">
        <PageGrid>
          <div className="col-span-6 h-16 rounded-md border border-border bg-muted/40" />
          <div className="col-span-6 h-16 rounded-md border border-border bg-muted/40" />
        </PageGrid>
      </Band>
    </div>
  ),
};

export const Type: Story = {
  render: () => (
    <PageGrid className="py-8">
      <PageColumn className="col-content measure">
        <p className="eyebrow">Eyebrow · 11/16</p>
        <h1 className="mt-2 text-title-xl font-semibold">
          A 24/32 heading, trimmed so its cap sits on the line
        </h1>
        <p className="mt-3 text-lead text-muted-foreground">
          Body copy is 14/24 — six baseline units — so a column of text always ends on a
          multiple of 4px. Headings carry <code className="font-mono text-caption">text-box-trim</code>{" "}
          through the base layer; labels, chips and tabular rows get the same treatment from the
          <code className="font-mono text-caption"> text-trim</code> utility.
        </p>
        <div className="chip-row mt-4">
          <span className="chip chip-outline">24px tall</span>
          <span className="chip chip-muted">12/16 label</span>
          <span className="chip chip-outline border-emerald-200 bg-emerald-100 font-medium text-emerald-800">
            mandatory
          </span>
        </div>
      </PageColumn>
    </PageGrid>
  ),
};

export const Guides: Story = {
  name: "Guides (shift+G in the app)",
  render: () => (
    <>
      <GridGuides defaultOn />
      <PageGrid className="py-8">
        <PageColumn className="col-content">
          <h1 className="text-title-xl font-semibold">The overlay draws the real grid</h1>
          <p className="mt-3 text-body text-muted-foreground">
            Turn it on with shift+G or <code className="font-mono text-caption">?grid=1</code> on
            any page. Column bands and baseline rules come from the same tokens as the layout, so
            they cannot drift from it.
          </p>
        </PageColumn>
      </PageGrid>
    </>
  ),
};
