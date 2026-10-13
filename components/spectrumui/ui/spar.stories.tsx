import type { Meta, StoryObj } from "@storybook/react";
import { SparklesCore } from "./spar";

const meta: Meta<typeof SparklesCore> = {
  title: "Primitives/Spar (Particles Alt)",
  component: SparklesCore,
  parameters: {
    docs: {
      description: {
        component:
          "Spar is an alternative sparkles/particles implementation. " +
          "It renders tsparticles with the same API as SparklesCore.",
      },
    },
  },
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
        particleDensity={100}
        className="h-full w-full"
        particleColor="#3b82f6"
      />
    </div>
  ),
};