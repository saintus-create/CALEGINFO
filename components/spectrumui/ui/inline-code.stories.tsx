import type { Meta, StoryObj } from "@storybook/react";
import { InlineCode } from "./inline-code";

const meta: Meta<typeof InlineCode> = {
  title: "Primitives/InlineCode",
  component: InlineCode,
};

export default meta;
type Story = StoryObj<typeof InlineCode>;

export const Default: Story = {
  render: () => (
    <p className="text-sm">
      Run <InlineCode>npm install</InlineCode> to install dependencies.
    </p>
  ),
};