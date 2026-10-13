import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/ModelSelector",
  parameters: {
    docs: {
      description: {
        component:
          "ModelSelector is a dropdown for choosing the AI model. " +
          "It requires app-level state for model selection.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">ModelSelector</h2>
        <p className="text-sm">
          Dropdown for selecting AI models.
        </p>
      </div>
    </div>
  ),
};