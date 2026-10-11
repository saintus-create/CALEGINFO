import type { Meta, StoryObj } from "@storybook/react";
import { ReasoningTrace } from "./reasoning-trace";
import type { ReasoningStep } from "./types";

const steps: ReasoningStep[] = [
  { id: "s1", content: "Reading the question: limitations period for personal injury." },
  { id: "s2", content: "Searching the Code of Civil Procedure for time-of-commencing sections." },
  { id: "s3", content: "Found CCP § 335.1 — two years. Checking for amendments." },
];

const meta: Meta<typeof ReasoningTrace> = {
  title: "AI Assistants/ReasoningTrace",
  component: ReasoningTrace,
  args: { steps, status: "complete", durationMs: 4200 },
};

export default meta;
type Story = StoryObj<typeof ReasoningTrace>;

export const Complete: Story = {};

export const Thinking: Story = {
  args: { steps: steps.slice(0, 2), status: "thinking", durationMs: undefined },
};

export const Expanded: Story = { args: { defaultOpen: true } };

export const Steps: Story = { args: { variant: "Steps" } };
