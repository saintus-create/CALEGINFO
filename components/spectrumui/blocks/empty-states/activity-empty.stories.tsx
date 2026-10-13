import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/ActivityEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "ActivityEmpty displays an empty state when there is no activity to show.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">ActivityEmpty</h2>
        <p className="text-sm">No activity to display.</p>
      </div>
    </div>
  ),
};