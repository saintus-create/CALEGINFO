import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/Ghost404Page",
  parameters: {
    docs: {
      description: {
        component:
          "Ghost404Page is a full-page 404 component. Due to its use of Next.js-specific features, " +
          "it cannot be rendered in Storybook. Refer to the source code for usage.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Ghost 404 Page</h2>
        <p>This component requires Next.js routing features.</p>
        <p className="text-sm mt-2">
          Import from @/components/spectrumui/ui/ghost-404-page
        </p>
      </div>
    </div>
  ),
};