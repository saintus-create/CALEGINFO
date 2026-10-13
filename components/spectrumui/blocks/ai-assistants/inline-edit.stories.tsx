import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/InlineEdit",
  parameters: {
    docs: {
      description: {
        component:
          "InlineEdit allows inline text editing within AI-generated content. " +
          "It supports click-to-edit and keyboard shortcuts.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">InlineEdit</h2>
        <p className="text-sm">
          Click-to-edit inline text editing for AI content.
        </p>
      </div>
    </div>
  ),
};