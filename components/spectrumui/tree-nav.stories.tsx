import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "SpectrumUI/TreeNav",
  parameters: {
    docs: {
      description: {
        component:
          "TreeNav is a hierarchical tree navigation component. " +
          "It supports nested items with expand/collapse functionality.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">TreeNav</h2>
        <p className="text-sm">
          Hierarchical tree navigation component.
        </p>
      </div>
    </div>
  ),
};