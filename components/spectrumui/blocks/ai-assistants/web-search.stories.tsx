import type { Meta, StoryObj } from "@storybook/react";
import { WebSearch, type SearchResult } from "./web-search";

const results: SearchResult[] = [
  { id: "r1", title: "Statute of Limitations in California", domain: "leginfo.legislature.ca.gov", snippet: "California Code of Civil Procedure § 335.1...", state: "read" },
  { id: "r2", title: "Personal Injury Time Limits", domain: "nolo.com", snippet: "Every state has its own statute of limitations...", state: "reading" },
  { id: "r3", title: "CCP § 335.1 - Two Year Limitation", domain: "law.justia.com", snippet: "Within two years: An action for assault...", state: "idle" },
];

const meta: Meta<typeof WebSearch> = {
  title: "AI Assistants/WebSearch",
  component: WebSearch,
  args: { query: "california statute of limitations personal injury", results },
};

export default meta;
type Story = StoryObj<typeof WebSearch>;

export const Default: Story = {};

export const Compact: Story = {
  args: { variant: "Compact" },
};

export const WithMore: Story = {
  args: { moreCount: 5 },
};