import type { Meta, StoryObj } from "@storybook/react";
import CodeBlockWithToggle from "./codeblockwithtoggle";

const meta: Meta<typeof CodeBlockWithToggle> = {
  title: "Primitives/CodeBlockWithToggle",
  component: CodeBlockWithToggle,
};

export default meta;
type Story = StoryObj<typeof CodeBlockWithToggle>;

const sampleCode = `<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>`;

export const Default: Story = {
  args: {
    htmlCode: sampleCode,
    fileName: "example.tsx",
  },
};

export const WithoutFileName: Story = {
  args: {
    htmlCode: sampleCode,
  },
};