import type { Meta, StoryObj } from "@storybook/react";
import { StatusTracker, type TrackerStage } from "./status-tracker";

const stages: TrackerStage[] = [
  { id: "s1", label: "Parsing document" },
  { id: "s2", label: "Analyzing content" },
  { id: "s3", label: "Generating summary" },
  { id: "s4", label: "Complete" },
];

const meta: Meta<typeof StatusTracker> = {
  title: "AI Assistants/StatusTracker",
  component: StatusTracker,
  args: { stages, activeIndex: 1, progress: 50 },
};

export default meta;
type Story = StoryObj<typeof StatusTracker>;

export const Default: Story = {};

export const Minimal: Story = {
  args: { variant: "Minimal" },
};

export const Complete: Story = {
  args: { activeIndex: 3, progress: 100 },
};

export const WithDetail: Story = {
  args: { detail: "Processing page 3 of 12..." },
};