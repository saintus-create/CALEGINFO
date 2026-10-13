import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/Stats",
  parameters: {
    docs: {
      description: {
        component:
          "CardsStats shows revenue and subscription stats with charts. " +
          "Uses the Chart and Card primitives internally.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsStats</h2>
        <p className="text-sm">
          Revenue and subscription stats with charts.
          See the CardsDemo story for the full card layout.
        </p>
      </div>
    </div>
  ),
};