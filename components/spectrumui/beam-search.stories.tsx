import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "SpectrumUI/BeamSearch",
  parameters: {
    docs: {
      description: {
        component:
          "BeamSearch is a search component with a beam visual effect. " +
          "It combines a search input with animated visual feedback.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">BeamSearch</h2>
        <p className="text-sm">
          Search component with animated beam visual effect.
        </p>
      </div>
    </div>
  ),
};