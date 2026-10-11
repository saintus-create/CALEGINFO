import type { Meta, StoryObj } from "@storybook/react";
import { SearchEmpty } from "./search-empty";

const meta: Meta<typeof SearchEmpty> = {
  title: "Empty States/SearchEmpty",
  component: SearchEmpty,
  args: {
    query: "burglery",
    suggestions: ["burglary", "robbery", "burglary tools"],
    scopeLabel: "California Codes",
  },
};

export default meta;
type Story = StoryObj<typeof SearchEmpty>;

export const Suggestions: Story = {};

export const Scoped: Story = { args: { variant: "Scoped" } };

export const Minimal: Story = { args: { variant: "Minimal", suggestions: [] } };

export const NoQuery: Story = { args: { query: undefined } };
