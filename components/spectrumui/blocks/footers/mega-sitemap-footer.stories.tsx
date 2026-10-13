import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Footers/MegaSitemapFooter",
  parameters: {
    docs: {
      description: {
        component:
          "MegaSitemapFooter is a comprehensive footer with multiple link groups and a sitemap layout.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">MegaSitemapFooter</h2>
        <p className="text-sm">
          Comprehensive footer with multiple link groups.
        </p>
      </div>
    </div>
  ),
};