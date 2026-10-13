import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Footers/FooterKit",
  parameters: {
    docs: {
      description: {
        component:
          "FooterKit provides shared footer utilities (FooterBar, FooterSocial, etc.) " +
          "used by all footer block variants.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">FooterKit</h2>
        <p className="text-sm">
          Shared footer utilities used by footer block variants.
        </p>
      </div>
    </div>
  ),
};