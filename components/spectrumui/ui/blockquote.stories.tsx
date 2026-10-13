import type { Meta, StoryObj } from "@storybook/react";
import { Blockquote, BlockquoteAuthor } from "./blockquote";

const meta: Meta<typeof Blockquote> = {
  title: "Primitives/Blockquote",
  component: Blockquote,
};

export default meta;
type Story = StoryObj<typeof Blockquote>;

export const Default: Story = {
  render: () => (
    <div className="max-w-[500px]">
      <Blockquote>
        The only way to do great work is to love what you do.
        <BlockquoteAuthor>Steve Jobs</BlockquoteAuthor>
      </Blockquote>
    </div>
  ),
};

export const ShortQuote: Story = {
  render: () => (
    <div className="max-w-[500px]">
      <Blockquote>Less is more.</Blockquote>
    </div>
  ),
};