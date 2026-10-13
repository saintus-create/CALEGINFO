import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/PaymentMethod",
  parameters: {
    docs: {
      description: {
        component:
          "CardsPaymentMethod displays a payment method card with card details.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsPaymentMethod</h2>
        <p className="text-sm">Payment method card.</p>
      </div>
    </div>
  ),
};