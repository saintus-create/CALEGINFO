import type { Meta, StoryObj } from "@storybook/react";
import { FloatingLabelInput } from "./floating-label-input";

const meta: Meta<typeof FloatingLabelInput> = {
  title: "Primitives/FloatingLabelInput",
  component: FloatingLabelInput,
};

export default meta;
type Story = StoryObj<typeof FloatingLabelInput>;

export const Default: Story = {
  args: { label: "Email", type: "email" },
};

export const Password: Story = {
  args: { label: "Password", type: "password" },
};