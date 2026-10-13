import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/NotFoundEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "NotFoundEmpty displays an empty state when a resource cannot be found.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">NotFoundEmpty</h2>
        <p className="text-sm">Resource not found.</p>
      </div>
    </div>
  ),
};