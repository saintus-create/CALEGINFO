import type { Meta, StoryObj } from "@storybook/react";
import { ThinkingDots } from "./thinking-dots";

const meta: Meta<typeof ThinkingDots> = {
  title: "AI Assistants/ThinkingDots",
  component: ThinkingDots,
};

export default meta;
type Story = StoryObj<typeof ThinkingDots>;

export const Dots: Story = {};

export const Bar: Story = { args: { variant: "Bar" } };

export const CustomLabel: Story = {
  args: { label: "Searching the California Codes" },
};
