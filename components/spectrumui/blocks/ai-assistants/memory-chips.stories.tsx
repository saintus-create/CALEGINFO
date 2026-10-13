import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/MemoryChips",
  parameters: {
    docs: {
      description: {
        component:
          "MemoryChips renders a set of persistent memory/context chips. " +
          "Used in AI chat interfaces to show what the model remembers.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">MemoryChips</h2>
        <p className="text-sm">
          Displays context chips for AI memory in chat interfaces.
        </p>
      </div>
    </div>
  ),
};