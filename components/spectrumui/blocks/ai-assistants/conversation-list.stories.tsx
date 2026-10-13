import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/ConversationList",
  parameters: {
    docs: {
      description: {
        component:
          "ConversationList renders a sidebar list of chat conversations. " +
          "It requires app-level state management for conversation selection.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">ConversationList</h2>
        <p className="text-sm">
          Sidebar list of chat conversations with search and filtering.
        </p>
      </div>
    </div>
  ),
};