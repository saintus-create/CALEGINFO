import type { Meta, StoryObj } from "@storybook/react";
import { NumberTicker } from "./number-ticker";

const meta: Meta<typeof NumberTicker> = {
  title: "MagicUI/NumberTicker",
  component: NumberTicker,
};

export default meta;
type Story = StoryObj<typeof NumberTicker>;

export const Default: Story = {
  args: { value: 1000 },
};

export const Down: Story = {
  args: { value: 0, direction: "down" },
};

export const WithDecimal: Story = {
  args: { value: 99.9, decimalPlaces: 1 },
};

export const WithDelay: Story = {
  args: { value: 500, delay: 1 },
};