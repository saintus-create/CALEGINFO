import type { Meta, StoryObj } from "@storybook/react";
import { ChatEmptyState, type ChatEmptyStateProps } from "./chat-empty-state";
import type { SuggestedPrompt } from "./types";

const prompts: SuggestedPrompt[] = [
  { id: "p1", label: "What is the statute of limitations?" },
  { id: "p2", label: "Summarize this contract" },
  { id: "p3", label: "Find relevant case law" },
];

const meta: Meta<typeof ChatEmptyState> = {
  title: "AI Assistants/ChatEmptyState",
  component: ChatEmptyState,
  args: { prompts },
};

export default meta;
type Story = StoryObj<typeof ChatEmptyState>;

export const Default: Story = {};

export const Centered: Story = {
  args: { variant: "Centered" },
};

export const NoPrompts: Story = {
  args: { prompts: [] },
};

export const CustomTitle: Story = {
  args: { title: "How can I help?", subtitle: "Ask me anything about your case." },
};