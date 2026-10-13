import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/ApiKeyEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "ApiKeyEmpty displays an empty state when no API keys have been configured.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">ApiKeyEmpty</h2>
        <p className="text-sm">No API keys configured.</p>
      </div>
    </div>
  ),
};