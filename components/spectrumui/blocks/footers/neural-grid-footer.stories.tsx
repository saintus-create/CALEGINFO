import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Footers/NeuralGridFooter",
  parameters: {
    docs: {
      description: {
        component:
          "NeuralGridFooter is a footer variant with a neural network grid visual pattern.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">NeuralGridFooter</h2>
        <p className="text-sm">
          Footer with neural network grid visual pattern.
        </p>
      </div>
    </div>
  ),
};