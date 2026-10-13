import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/ReportIssue",
  parameters: {
    docs: {
      description: {
        component:
          "CardsReportIssue displays a report issue form card.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsReportIssue</h2>
        <p className="text-sm">Report issue form card.</p>
      </div>
    </div>
  ),
};