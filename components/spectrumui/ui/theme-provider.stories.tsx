import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/ThemeProvider",
  parameters: {
    docs: {
      description: {
        component:
          "ThemeProvider wraps next-themes to provide dark/light mode switching. " +
          "It should be placed at the app root. Storybook already includes it via preview.ts.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">ThemeProvider</h2>
        <p className="text-sm">
          Wraps next-themes for dark/light mode support.
        </p>
        <pre className="mt-4 text-left text-xs bg-muted p-3 rounded-md max-w-md">
{`<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
>
  {children}
</ThemeProvider>`}
        </pre>
      </div>
    </div>
  ),
};