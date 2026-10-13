import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/ActivityGoal",
  parameters: {
    docs: {
      description: {
        component:
          "CardsActivityGoal displays a daily activity goal tracker with a bar chart.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsActivityGoal</h2>
        <p className="text-sm">Daily activity goal tracker.</p>
      </div>
    </div>
  ),
};