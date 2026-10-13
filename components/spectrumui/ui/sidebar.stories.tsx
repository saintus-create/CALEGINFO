import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/Sidebar",
  parameters: {
    docs: {
      description: {
        component:
          "Sidebar is a complex layout component with many sub-components. " +
          "Due to its use of Next.js features and context providers, " +
          "it requires a full app environment. Refer to the source for usage patterns.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Sidebar</h2>
        <p className="text-sm">
          Sidebar requires app-level context providers.
          Refer to the source code for integration patterns.
        </p>
      </div>
    </div>
  ),
};