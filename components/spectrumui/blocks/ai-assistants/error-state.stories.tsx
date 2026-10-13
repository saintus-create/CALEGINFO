import type { Meta, StoryObj } from "@storybook/react";
import { ErrorState, type ErrorStateProps } from "./error-state";

const meta: Meta<typeof ErrorState> = {
  title: "AI Assistants/ErrorState",
  component: ErrorState,
};

export default meta;
type Story = StoryObj<typeof ErrorState>;

export const Card: Story = {};

export const Inline: Story = {
  args: { variant: "Inline" },
};

export const CustomMessage: Story = {
  args: {
    title: "Network Error",
    message: "Could not connect to the server. Please check your connection.",
    retryLabel: "Try Again",
  },
};

export const Retrying: Story = {
  args: { retrying: true },
};