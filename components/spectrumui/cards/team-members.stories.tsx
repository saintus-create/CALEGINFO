import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Cards/TeamMembers",
  parameters: {
    docs: {
      description: {
        component:
          "CardsTeamMembers displays a team members card with invite functionality.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">CardsTeamMembers</h2>
        <p className="text-sm">Team members card.</p>
      </div>
    </div>
  ),
};