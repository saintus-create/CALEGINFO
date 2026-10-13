import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "SpectrumUI/MetalPromptBar",
  parameters: {
    docs: {
      description: {
        component:
          "MetalPromptBar is a prompt input bar with a metallic visual treatment. " +
          "It includes file attachment, slash commands, and model selection.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">MetalPromptBar</h2>
        <p className="text-sm">
          Prompt input bar with metallic visual treatment.
        </p>
      </div>
    </div>
  ),
};