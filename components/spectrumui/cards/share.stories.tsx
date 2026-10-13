import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/Share",
  parameters: {
    docs: {
      description: {
        component:
          "CardsShare displays a share link card with copy-to-clipboard functionality.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsShare</h2>
        <p className="text-sm">Share link card.</p>
      </div>
    </div>
  ),
};