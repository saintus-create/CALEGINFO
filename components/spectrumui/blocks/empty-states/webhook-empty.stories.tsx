import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/WebhookEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "WebhookEmpty displays an empty state when no webhooks have been configured.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">WebhookEmpty</h2>
        <p className="text-sm">No webhooks configured.</p>
      </div>
    </div>
  ),
};