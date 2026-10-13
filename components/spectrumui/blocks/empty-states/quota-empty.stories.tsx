import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/QuotaEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "QuotaEmpty displays an empty state when the user has reached their usage quota.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">QuotaEmpty</h2>
        <p className="text-sm">You have reached your usage quota.</p>
      </div>
    </div>
  ),
};