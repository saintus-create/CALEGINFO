import type { Meta, StoryObj } from "@storybook/react";
import { RainbowButton } from "./rainbow-button";

const meta: Meta<typeof RainbowButton> = {
  title: "MagicUI/RainbowButton",
  component: RainbowButton,
};

export default meta;
type Story = StoryObj<typeof RainbowButton>;

export const Default: Story = {
  args: { children: "Rainbow Button" },
};

export const Outline: Story = {
  args: { children: "Outline Rainbow", variant: "outline" },
};

export const Small: Story = {
  args: { children: "Small", size: "sm" },
};

export const Large: Story = {
  args: { children: "Large", size: "lg" },
};