import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/MaintenanceEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "MaintenanceEmpty displays an empty state during scheduled maintenance windows.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">MaintenanceEmpty</h2>
        <p className="text-sm">System under maintenance.</p>
      </div>
    </div>
  ),
};