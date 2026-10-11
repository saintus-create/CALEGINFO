import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { ApprovalCard } from "./approval-card";

const meta: Meta<typeof ApprovalCard> = {
  title: "AI Assistants/ApprovalCard",
  component: ApprovalCard,
};

export default meta;
type Story = StoryObj<typeof ApprovalCard>;

export const Pending: Story = {};

export const Approved: Story = { args: { decision: "approved" } };

export const Rejected: Story = { args: { decision: "rejected" } };

/**
 * The story is the fixture, and the play function makes it a regression test:
 * if approving ever stops calling back, this fails in CI.
 */
export const ApproveFlow: Story = {
  args: { onDecide: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /approve/i }));
    await expect(args.onDecide).toHaveBeenCalledWith("approved");
  },
};

export const DismissFlow: Story = {
  args: { onDecide: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /dismiss/i }));
    await expect(args.onDecide).toHaveBeenCalledWith("rejected");
  },
};
