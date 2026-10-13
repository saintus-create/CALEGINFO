import type { Meta, StoryObj } from "@storybook/react";
import { SparklesCore } from "./sparkles";

const meta: Meta<typeof SparklesCore> = {
  title: "Primitives/SparklesCore",
  component: SparklesCore,
};

export default meta;
type Story = StoryObj<typeof SparklesCore>;

export const Default: Story = {
  render: () => (
    <div className="h-[200px] w-full rounded-lg bg-slate-950">
      <SparklesCore
        background="transparent"
        minSize={0.4}
        maxSize={1}
        particleDensity={120}
        className="h-full w-full"
        particleColor="#FFFFFF"
      />
    </div>
  ),
};