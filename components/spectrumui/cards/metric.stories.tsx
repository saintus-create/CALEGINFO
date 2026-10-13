import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/Metric",
  parameters: {
    docs: {
      description: {
        component:
          "CardsMetric displays a metrics card with a line chart.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsMetric</h2>
        <p className="text-sm">Metrics card with line chart.</p>
      </div>
    </div>
  ),
};