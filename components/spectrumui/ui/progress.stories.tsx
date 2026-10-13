import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
  title: "Primitives/Progress",
  component: Progress,
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: { value: 50, className: "w-[60%]" },
};

export const Complete: Story = {
  args: { value: 100, className: "w-[60%]" },
};

export const Empty: Story = {
  args: { value: 0, className: "w-[60%]" },
};

export const Indeterminate: Story = {
  args: { className: "w-[60%]" },
};