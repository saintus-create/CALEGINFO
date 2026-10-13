import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Footers/SocialProofFooter",
  parameters: {
    docs: {
      description: {
        component:
          "SocialProofFooter is a footer variant with social proof elements (logos, testimonials).",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">SocialProofFooter</h2>
        <p className="text-sm">
          Footer with social proof elements.
        </p>
      </div>
    </div>
  ),
};