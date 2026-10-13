import type { Meta, StoryObj } from "@storybook/react";
import { VoiceInput, type VoiceInputProps } from "./voice-input";

const meta: Meta<typeof VoiceInput> = {
  title: "AI Assistants/VoiceInput",
  component: VoiceInput,
};

export default meta;
type Story = StoryObj<typeof VoiceInput>;

export const Idle: Story = {};

export const Recording: Story = {
  args: { state: "recording" },
};

export const Processing: Story = {
  args: { state: "processing" },
};