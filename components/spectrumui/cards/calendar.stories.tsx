import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/Calendar",
  parameters: {
    docs: {
      description: {
        component:
          "CardsCalendar displays a calendar widget card.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsCalendar</h2>
        <p className="text-sm">Calendar widget card.</p>
      </div>
    </div>
  ),
};