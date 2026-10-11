import type { Meta, StoryObj } from "@storybook/react";
import { StreamingText } from "./streaming-text";
import type { Citation, SuggestedPrompt } from "./types";

const citations: Citation[] = [
  { id: "1", index: 1, url: "/codes?code=CCP&section=335.1", title: "CCP § 335.1" },
  { id: "2", index: 2, url: "/codes?code=CCP&section=338", title: "CCP § 338" },
];

const followUps: SuggestedPrompt[] = [
  { id: "f1", label: "What about property damage?" },
  { id: "f2", label: "Does discovery toll the clock?" },
];

const meta: Meta<typeof StreamingText> = {
  title: "AI Assistants/StreamingText",
  component: StreamingText,
  args: {
    text: "Within two years: an action for personal injury [1], and three years for trespass [2].",
  },
};

export default meta;
type Story = StoryObj<typeof StreamingText>;

export const Answer: Story = {};

export const Streaming: Story = {
  args: { text: "Within two years:", streaming: true },
};

export const WithCitations: Story = { args: { citations } };

export const WithFollowUps: Story = { args: { followUps } };

export const Sources: Story = { args: { citations, variant: "Sources" } };
