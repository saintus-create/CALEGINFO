import type { Meta, StoryObj } from "@storybook/react";
import { CitationSources, type CitationSourcesProps } from "./citation-sources";
import type { Citation } from "./types";

const citations: Citation[] = [
  { index: 1, title: "CCP § 335.1", source: "California Code of Civil Procedure", url: "#" },
  { index: 2, title: "Doe v. Smith", source: "Cal. App. 4th (2020)", url: "#" },
];

const meta: Meta<typeof CitationSources> = {
  title: "AI Assistants/CitationSources",
  component: CitationSources,
  args: {
    text: "The statute of limitations is two years [1] as affirmed in recent case law [2].",
    citations,
  },
};

export default meta;
type Story = StoryObj<typeof CitationSources>;

export const Inline: Story = {};

export const Footnotes: Story = {
  args: { variant: "Footnotes" },
};