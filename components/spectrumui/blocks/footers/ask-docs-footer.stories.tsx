import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Footers/AskDocsFooter",
  parameters: {
    docs: {
      description: {
        component:
          "AskDocsFooter is a footer variant with a documentation search/ask feature.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">AskDocsFooter</h2>
        <p className="text-sm">
          Footer with documentation search feature.
        </p>
      </div>
    </div>
  ),
};