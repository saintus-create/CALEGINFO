import type { Meta, StoryObj } from "@storybook/react";
import { Cover } from "./cover";

const meta: Meta<typeof Cover> = {
  title: "Primitives/Cover",
  component: Cover,
};

export default meta;
type Story = StoryObj<typeof Cover>;

export const Default: Story = {
  args: { children: "Cover Component" },
};

export const CustomText: Story = {
  args: { children: "Hover to See Magic" },
};