import type { Meta, StoryObj } from "@storybook/react";
import { FlowButton } from "./flow-button";

const meta: Meta<typeof FlowButton> = {
  title: "Primitives/FlowButton",
  component: FlowButton,
};

export default meta;
type Story = StoryObj<typeof FlowButton>;

export const Default: Story = {};

export const CustomText: Story = {
  args: { text: "Get Started" },
};