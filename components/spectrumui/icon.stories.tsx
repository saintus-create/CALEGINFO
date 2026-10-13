import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "SpectrumUI/Icon",
  parameters: {
    docs: {
      description: {
        component:
          "Icon component provides the Spectrum UI icon system. " +
          "Refer to the source for available icons and usage.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Icon</h2>
        <p className="text-sm">
          Spectrum UI icon system.
        </p>
      </div>
    </div>
  ),
};