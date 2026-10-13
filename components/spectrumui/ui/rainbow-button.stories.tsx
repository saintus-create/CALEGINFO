import type { Meta, StoryObj } from "@storybook/react";
import { RainbowButton } from "./rainbow-button";

const meta: Meta<typeof RainbowButton> = {
  title: "Primitives/RainbowButton",
  component: RainbowButton,
};

export default meta;
type Story = StoryObj<typeof RainbowButton>;

export const Default: Story = {
  args: { children: "Rainbow Button" },
};

export const CustomText: Story = {
  args: { children: "Get Started" },
};