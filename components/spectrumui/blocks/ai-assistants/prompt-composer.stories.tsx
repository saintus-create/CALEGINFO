import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/PromptComposer",
  parameters: {
    docs: {
      description: {
        component:
          "PromptComposer is the chat input area with file attachments, " +
          "slash commands, and model selection.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">PromptComposer</h2>
        <p className="text-sm">
          Chat input with file attachments and slash commands.
        </p>
      </div>
    </div>
  ),
};