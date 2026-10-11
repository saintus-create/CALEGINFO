import type { Meta, StoryObj } from "@storybook/react";
import { UsageMeter } from "./usage-meter";

const meta: Meta<typeof UsageMeter> = {
  title: "AI Assistants/UsageMeter",
  component: UsageMeter,
  args: {
    usage: {
      promptTokens: 1240,
      completionTokens: 860,
      contextWindow: 128000,
      estimatedCostUsd: 0.02,
    },
  },
};

export default meta;
type Story = StoryObj<typeof UsageMeter>;

export const Bar: Story = {};

export const Inline: Story = { args: { variant: "Inline" } };

export const NearLimit: Story = {
  args: {
    usage: {
      promptTokens: 1700,
      completionTokens: 250,
      contextWindow: 2000,
      estimatedCostUsd: 0.11,
    },
  },
};

export const NoCostEstimate: Story = {
  args: {
    usage: { promptTokens: 300, completionTokens: 120, contextWindow: 128000 },
  },
};
