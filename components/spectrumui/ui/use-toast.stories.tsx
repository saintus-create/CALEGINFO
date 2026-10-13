import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/useToast",
  parameters: {
    docs: {
      description: {
        component:
          "useToast is a hook that provides toast functionality. " +
          "Use it to show toast notifications imperatively.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">useToast Hook</h2>
        <p className="text-sm">Imperative toast API.</p>
        <pre className="mt-4 text-left text-xs bg-muted p-3 rounded-md max-w-md">
{`const { toast } = useToast();

toast({
  title: "Scheduled",
  description: "Friday, February 10, 2023 at 5:57 PM",
});`}
        </pre>
      </div>
    </div>
  ),
};