import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/CreateAccount",
  parameters: {
    docs: {
      description: {
        component:
          "CardsCreateAccount displays a create account form card.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsCreateAccount</h2>
        <p className="text-sm">Create account form card.</p>
      </div>
    </div>
  ),
};