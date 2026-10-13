import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/InsightCards",
  parameters: {
    docs: {
      description: {
        component:
          "InsightCards display key insights extracted by the AI. " +
          "Each card highlights a finding with supporting evidence.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">InsightCards</h2>
        <p className="text-sm">
          Displays key AI-extracted insights with evidence.
        </p>
      </div>
    </div>
  ),
};