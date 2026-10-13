import type { Meta, StoryObj } from "@storybook/react";
import { SuggestionBanner, type SuggestionBannerProps } from "./suggestion-banner";

const meta: Meta<typeof SuggestionBanner> = {
  title: "AI Assistants/SuggestionBanner",
  component: SuggestionBanner,
};

export default meta;
type Story = StoryObj<typeof SuggestionBanner>;

export const Default: Story = {};

export const Floating: Story = {
  args: { variant: "Floating" },
};

export const Applied: Story = {
  args: { state: "applied" },
};

export const Dismissed: Story = {
  args: { state: "dismissed" },
};