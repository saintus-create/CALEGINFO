import type { Meta, StoryObj } from "@storybook/react";
import ShinyButton from "./shiny-button";

const meta: Meta<typeof ShinyButton> = {
  title: "Primitives/ShinyButton",
  component: ShinyButton,
};

export default meta;
type Story = StoryObj<typeof ShinyButton>;

export const Default: Story = {
  args: { children: "Shiny Button" },
};

export const CustomText: Story = {
  args: { children: "Subscribe Now" },
};