import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/Chart",
  parameters: {
    docs: {
      description: {
        component:
          "Chart components (ChartContainer, ChartTooltip, etc.) wrap Recharts with theme tokens. " +
          "See the Cards/Stats story for a working chart example using these primitives.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Chart</h2>
        <p className="text-sm">
          The Chart components are used inside card components.
          See Cards/Stats for a working example.
        </p>
      </div>
    </div>
  ),
};