import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "SpectrumUI/NavListCard",
  parameters: {
    docs: {
      description: {
        component:
          "NavListCard is a navigation card with a list of links. " +
          "Used for sidebar navigation or content hubs.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">NavListCard</h2>
        <p className="text-sm">
          Navigation card with a list of links.
        </p>
      </div>
    </div>
  ),
};