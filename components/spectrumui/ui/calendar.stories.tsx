import type { Meta, StoryObj } from "@storybook/react";
import { Calendar } from "./calendar";

const meta: Meta<typeof Calendar> = {
  title: "Primitives/Calendar",
  component: Calendar,
};

export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  args: {
    mode: "single",
  },
};

export const WithSelectedDate: Story = {
  args: {
    mode: "single",
    selected: new Date(2025, 0, 15),
  },
};

export const Range: Story = {
  args: {
    mode: "range",
    numberOfMonths: 2,
  },
};