import type { Meta, StoryObj } from "@storybook/react";
import { AutosizeTextarea } from "./autosize-textarea";

const meta: Meta<typeof AutosizeTextarea> = {
  title: "Primitives/AutosizeTextarea",
  component: AutosizeTextarea,
};

export default meta;
type Story = StoryObj<typeof AutosizeTextarea>;

export const Default: Story = {
  args: { placeholder: "Type something..." },
};

export const WithMinHeight: Story = {
  args: { placeholder: "Min height 100px", minHeight: 100 },
};

export const WithMaxHeight: Story = {
  args: {
    placeholder: "Max height 200px",
    minHeight: 52,
    maxHeight: 200,
    defaultValue:
      "This textarea will stop growing after 200px. Keep typing to see the scroll behavior take effect. The autosize feature automatically adjusts the height based on content.",
  },
};