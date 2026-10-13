import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "SpectrumUI/AiChatCard",
  parameters: {
    docs: {
      description: {
        component:
          "AiChatCard is a self-contained AI chat card component. " +
          "It combines a chat interface into a card layout.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">AiChatCard</h2>
        <p className="text-sm">
          Self-contained AI chat card component.
        </p>
      </div>
    </div>
  ),
};