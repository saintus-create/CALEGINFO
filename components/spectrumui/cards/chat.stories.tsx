import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/Chat",
  parameters: {
    docs: {
      description: {
        component:
          "CardsChat displays a chat interface card with messages.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsChat</h2>
        <p className="text-sm">Chat interface card.</p>
      </div>
    </div>
  ),
};