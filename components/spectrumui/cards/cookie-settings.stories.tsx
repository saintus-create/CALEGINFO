import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/CookieSettings",
  parameters: {
    docs: {
      description: {
        component:
          "CardsCookieSettings displays a cookie consent settings card.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsCookieSettings</h2>
        <p className="text-sm">Cookie consent settings card.</p>
      </div>
    </div>
  ),
};