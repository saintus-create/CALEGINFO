import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/SavedEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "SavedEmpty displays an empty state when the user has no saved items.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">SavedEmpty</h2>
        <p className="text-sm">No saved items yet.</p>
      </div>
    </div>
  ),
};