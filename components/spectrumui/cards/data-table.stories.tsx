import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/DataTable",
  parameters: {
    docs: {
      description: {
        component:
          "CardsDataTable displays a data table card with sortable columns.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsDataTable</h2>
        <p className="text-sm">Data table card.</p>
      </div>
    </div>
  ),
};