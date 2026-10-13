import type { Meta, StoryObj } from "@storybook/react";
import { ProgressWithValue } from "./progress-with-value";

const meta: Meta<typeof ProgressWithValue> = {
  title: "Primitives/ProgressWithValue",
  component: ProgressWithValue,
};

export default meta;
type Story = StoryObj<typeof ProgressWithValue>;

export const Default: Story = {
  args: { value: 60 },
};

export const EndOutside: Story = {
  args: { value: 75, position: "end-outside", label: () => "75%" },
};

export const StartOutside: Story = {
  args: { value: 40, position: "start-outside", label: () => "40%" },
};

export const Follow: Story = {
  args: { value: 50, position: "follow", label: () => "50%" },
};