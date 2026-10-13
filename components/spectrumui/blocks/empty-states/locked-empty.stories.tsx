import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/LockedEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "LockedEmpty displays an empty state when a resource is locked or requires a higher plan.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">LockedEmpty</h2>
        <p className="text-sm">This feature requires a higher plan.</p>
      </div>
    </div>
  ),
};