import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/Splite (Spline 3D)",
  parameters: {
    docs: {
      description: {
        component:
          "Splite wraps @splinetool/react-spline to embed 3D scenes. " +
          "It requires a Spline scene URL to render. Due to external resource dependencies, " +
          "a live preview is not available in Storybook.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Splite (Spline 3D)</h2>
        <p className="text-sm">
          Embeds 3D Spline scenes. Requires a Spline scene URL.
        </p>
        <pre className="mt-4 text-left text-xs bg-muted p-3 rounded-md max-w-md">
{`<SplineViewer scene="https://prod.spline.design/..." />`}
        </pre>
      </div>
    </div>
  ),
};