import type { Meta, StoryObj } from "@storybook/react";
import { ToolChips } from "./tool-chips";
import type { ToolCall } from "./types";

const calls: ToolCall[] = [
  {
    id: "t1",
    name: "search_statutes",
    args: { queries: ["statute of limitations personal injury"] },
    result: "16 sections",
    status: "success",
  },
  {
    id: "t2",
    name: "search_cases",
    args: { queries: ["CCP 335.1 interpretation"] },
    status: "running",
  },
  {
    id: "t3",
    name: "lookup_section",
    args: { code: "CCP", section: "335.1" },
    status: "error",
    result: "not found",
  },
];

const meta: Meta<typeof ToolChips> = {
  title: "AI Assistants/ToolChips",
  component: ToolChips,
  args: { calls: [calls[0]] },
};

export default meta;
type Story = StoryObj<typeof ToolChips>;

export const Success: Story = {};

export const Running: Story = { args: { calls: [calls[1]] } };

export const Error: Story = { args: { calls: [calls[2]] } };

export const MixedStack: Story = { args: { calls, variant: "Stack" } };
