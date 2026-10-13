import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/AgentSteps",
  parameters: {
    docs: {
      description: {
        component:
          "AgentSteps renders a sequential list of agent actions. " +
          "Each step shows what the agent did and its result.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">AgentSteps</h2>
        <p className="text-sm">
          Sequential list of agent actions with results.
        </p>
      </div>
    </div>
  ),
};