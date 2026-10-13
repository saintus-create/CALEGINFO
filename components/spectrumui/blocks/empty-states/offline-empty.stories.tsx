import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/OfflineEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "OfflineEmpty displays an empty state when the user is offline.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">OfflineEmpty</h2>
        <p className="text-sm">You are currently offline.</p>
      </div>
    </div>
  ),
};