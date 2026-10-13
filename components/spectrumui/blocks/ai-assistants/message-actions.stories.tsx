import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/MessageActions",
  parameters: {
    docs: {
      description: {
        component:
          "MessageActions renders action buttons for AI chat messages (copy, retry, like, etc.).",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">MessageActions</h2>
        <p className="text-sm">
          Action buttons for AI chat messages.
        </p>
      </div>
    </div>
  ),
};