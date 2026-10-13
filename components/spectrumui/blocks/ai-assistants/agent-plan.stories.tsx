import type { Meta, StoryObj } from "@storybook/react";
import { AgentPlan, type PlanStep } from "./agent-plan";

const steps: PlanStep[] = [
  { id: "s1", title: "Search for relevant statutes" },
  { id: "s2", title: "Analyze case precedents" },
  { id: "s3", title: "Draft legal summary", detail: "Include citations and analysis." },
];

const meta: Meta<typeof AgentPlan> = {
  title: "AI Assistants/AgentPlan",
  component: AgentPlan,
  args: { steps },
};

export default meta;
type Story = StoryObj<typeof AgentPlan>;

export const Default: Story = {};

export const Compact: Story = {
  args: { variant: "Compact" },
};

export const WithRun: Story = {
  args: { onRun: (ids) => console.log("Run:", ids) },
};