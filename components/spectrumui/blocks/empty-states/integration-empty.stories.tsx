import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/IntegrationEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "IntegrationEmpty displays an empty state when no integrations have been connected.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">IntegrationEmpty</h2>
        <p className="text-sm">No integrations connected.</p>
      </div>
    </div>
  ),
};