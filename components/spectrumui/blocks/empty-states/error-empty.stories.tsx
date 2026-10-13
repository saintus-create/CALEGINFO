import type { Meta, StoryObj } from "@storybook/react";
import { ErrorEmpty, type ErrorEmptyProps } from "./error-empty";

const meta: Meta<typeof ErrorEmpty> = {
  title: "Empty States/ErrorEmpty",
  component: ErrorEmpty,
};

export default meta;
type Story = StoryObj<typeof ErrorEmpty>;

export const Error: Story = {};

export const Details: Story = {
  args: { variant: "Details" },
};

export const Recovered: Story = {
  args: { variant: "Recovered" },
};