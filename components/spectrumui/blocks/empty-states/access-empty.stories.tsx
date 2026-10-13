import type { Meta, StoryObj } from "@storybook/react";
import { AccessEmpty, type AccessEmptyProps } from "./access-empty";

const meta: Meta<typeof AccessEmpty> = {
  title: "Empty States/AccessEmpty",
  component: AccessEmpty,
};

export default meta;
type Story = StoryObj<typeof AccessEmpty>;

export const Request: Story = {};

export const Requested: Story = {
  args: { variant: "Requested" },
};

export const Admin: Story = {
  args: { variant: "Admin" },
};