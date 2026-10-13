import type { Meta, StoryObj } from "@storybook/react";
import { FomoButton } from "./moving-border";

const meta: Meta<typeof FomoButton> = {
  title: "Primitives/MovingBorder",
  component: FomoButton,
};

export default meta;
type Story = StoryObj<typeof FomoButton>;

export const Default: Story = {
  args: { children: "Border Magic" },
};

export const CustomText: Story = {
  args: { children: "Hover Me" },
};