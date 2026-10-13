import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DualRangeSlider } from "./dual-range-slider";

const meta: Meta<typeof DualRangeSlider> = {
  title: "Primitives/DualRangeSlider",
  component: DualRangeSlider,
};

export default meta;
type Story = StoryObj<typeof DualRangeSlider>;

export const Default: Story = {
  render: () => {
    const [values, setValues] = useState([25, 75]);
    return (
      <div className="w-[60%]">
        <DualRangeSlider
          value={values}
          onValueChange={setValues}
          min={0}
          max={100}
          step={1}
        />
      </div>
    );
  },
};

export const WithLabels: Story = {
  render: () => {
    const [values, setValues] = useState([25, 75]);
    return (
      <div className="w-[60%] pt-4">
        <DualRangeSlider
          value={values}
          onValueChange={setValues}
          min={0}
          max={100}
          step={1}
          label={(value) => value}
        />
      </div>
    );
  },
};