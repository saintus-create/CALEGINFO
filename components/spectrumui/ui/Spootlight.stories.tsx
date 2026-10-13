import type { Meta, StoryObj } from "@storybook/react";
import { Spotlight } from "./Spootlight";

const meta: Meta<typeof Spotlight> = {
  title: "Primitives/Spotlight",
  component: Spotlight,
};

export default meta;
type Story = StoryObj<typeof Spotlight>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center">
      <Spotlight className="top-[-20%] left-[10%]" />
      <p className="relative z-10 text-white text-lg font-medium">
        Spotlight effect
      </p>
    </div>
  ),
};

export const CustomFill: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center">
      <Spotlight className="top-[-20%] left-[10%]" fill="blue" />
      <p className="relative z-10 text-white text-lg font-medium">
        Blue spotlight
      </p>
    </div>
  ),
};