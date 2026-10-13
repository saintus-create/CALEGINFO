import type { Meta, StoryObj } from "@storybook/react";
import { LoadingState, type LoadingStateProps } from "./loading-state";

const meta: Meta<typeof LoadingState> = {
  title: "AI Assistants/LoadingState",
  component: LoadingState,
};

export default meta;
type Story = StoryObj<typeof LoadingState>;

export const Drive: Story = {};

export const Dots: Story = {
  args: { variant: "Dots" },
};

export const Orbit: Story = {
  args: { variant: "Orbit" },
};

export const CustomLabel: Story = {
  args: { label: "Thinking..." },
};