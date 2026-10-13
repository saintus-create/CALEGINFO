import type { Meta, StoryObj } from "@storybook/react";
import { QuotaBanner, type QuotaBannerProps } from "./quota-banner";

const meta: Meta<typeof QuotaBanner> = {
  title: "AI Assistants/QuotaBanner",
  component: QuotaBanner,
  args: { used: 7, limit: 10 },
};

export default meta;
type Story = StoryObj<typeof QuotaBanner>;

export const Banner: Story = {};

export const Compact: Story = {
  args: { variant: "Compact" },
};

export const Exhausted: Story = {
  args: { used: 10, limit: 10 },
};

export const WithCountdown: Story = {
  args: { used: 9, limit: 10, resetsInSeconds: 3600 },
};