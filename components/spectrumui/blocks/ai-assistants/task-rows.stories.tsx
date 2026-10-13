import type { Meta, StoryObj } from "@storybook/react";
import { TaskRows, type TaskRow } from "./task-rows";

const tasks: TaskRow[] = [
  { id: "t1", title: "Search case database", status: "completed" },
  { id: "t2", title: "Analyze precedents", status: "running" },
  { id: "t3", title: "Draft summary", status: "queued" },
  { id: "t4", title: "Review citations", status: "queued" },
];

const meta: Meta<typeof TaskRows> = {
  title: "AI Assistants/TaskRows",
  component: TaskRows,
  args: { tasks },
};

export default meta;
type Story = StoryObj<typeof TaskRows>;

export const Default: Story = {};

export const Compact: Story = {
  args: { variant: "Compact" },
};

export const WithFailure: Story = {
  args: {
    tasks: [
      ...tasks.slice(0, 1),
      { id: "t2", title: "API call failed", status: "failed", note: "Timeout after 30s" },
      ...tasks.slice(2),
    ],
  },
};