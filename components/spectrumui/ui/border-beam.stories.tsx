import type { Meta, StoryObj } from "@storybook/react";
import { BorderBeam } from "./border-beam";

const meta: Meta<typeof BorderBeam> = {
  title: "Primitives/BorderBeam",
  component: BorderBeam,
};

export default meta;
type Story = StoryObj<typeof BorderBeam>;

export const Default: Story = {
  render: () => (
    <div className="relative rounded-xl border p-8 w-[300px] h-[200px] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Hover to see the beam</p>
      <BorderBeam />
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <div className="relative rounded-xl border p-8 w-[300px] h-[200px] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Custom colors</p>
      <BorderBeam colorFrom="#3b82f6" colorTo="#8b5cf6" />
    </div>
  ),
};