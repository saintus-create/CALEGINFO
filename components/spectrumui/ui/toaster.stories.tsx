import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/Toaster",
  parameters: {
    docs: {
      description: {
        component:
          "Toaster is a wrapper around the Toast UI components that uses the useToast hook. " +
          "It should be placed at the app root. See the Sonner story for the alternative toast system.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Toaster</h2>
        <p className="text-sm">
          Place {"<Toaster />"} at your app root.
          Use the useToast() hook to trigger toasts.
        </p>
      </div>
    </div>
  ),
};