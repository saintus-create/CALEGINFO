import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "SpectrumUI/Dock",
  parameters: {
    docs: {
      description: {
        component:
          "Dock is a macOS-style dock navigation component with magnification effects on hover.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Dock</h2>
        <p className="text-sm">
          macOS-style dock navigation with magnification.
        </p>
      </div>
    </div>
  ),
};