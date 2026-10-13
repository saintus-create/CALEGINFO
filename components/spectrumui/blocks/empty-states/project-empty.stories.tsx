import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/ProjectEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "ProjectEmpty displays an empty state when no projects have been created.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">ProjectEmpty</h2>
        <p className="text-sm">No projects created yet.</p>
      </div>
    </div>
  ),
};