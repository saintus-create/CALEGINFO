import type { Meta, StoryObj } from "@storybook/react";
import { CardsDemo } from "./index";

const meta: Meta<typeof CardsDemo> = {
  title: "Cards/CardsDemo",
  component: CardsDemo,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof CardsDemo>;

export const Default: Story = {};