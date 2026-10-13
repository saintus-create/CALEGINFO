import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/BoardEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "BoardEmpty displays an empty state for a kanban/board view with no items.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">BoardEmpty</h2>
        <p className="text-sm">No items on the board.</p>
      </div>
    </div>
  ),
};