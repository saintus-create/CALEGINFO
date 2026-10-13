import type { Meta, StoryObj } from "@storybook/react";
import { LoadingButton } from "./loading-button";

const meta: Meta<typeof LoadingButton> = {
  title: "Primitives/LoadingButton",
  component: LoadingButton,
  args: { children: "Save" },
};

export default meta;
type Story = StoryObj<typeof LoadingButton>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true },
};

export const LoadingWithText: Story = {
  args: { loading: true, children: "Saving..." },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete" },
};

export const Outline: Story = {
  args: { variant: "outline" },
};