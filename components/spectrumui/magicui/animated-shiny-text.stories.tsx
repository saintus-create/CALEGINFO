import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedShinyText } from "./animated-shiny-text";

const meta: Meta<typeof AnimatedShinyText> = {
  title: "MagicUI/AnimatedShinyText",
  component: AnimatedShinyText,
};

export default meta;
type Story = StoryObj<typeof AnimatedShinyText>;

export const Default: Story = {
  args: { children: "✨ Introducing Spectrum UI" },
};

export const CustomWidth: Story = {
  args: {
    children: "Shimmer effect with custom width",
    shimmerWidth: 200,
  },
};