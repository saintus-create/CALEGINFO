import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "AI Assistants/DiffView",
  parameters: {
    docs: {
      description: {
        component:
          "DiffView renders a side-by-side or unified diff of text changes. " +
          "It is used in code review and editing contexts.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">DiffView</h2>
        <p className="text-sm">
          Renders text diffs for code review contexts.
        </p>
      </div>
    </div>
  ),
};