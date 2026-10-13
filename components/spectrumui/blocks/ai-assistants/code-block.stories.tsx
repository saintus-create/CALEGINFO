import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock, type CodeBlockProps } from "./code-block";

const sampleCode = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`;

const meta: Meta<typeof CodeBlock> = {
  title: "AI Assistants/CodeBlock",
  component: CodeBlock,
  args: {
    code: sampleCode,
    language: "typescript",
  },
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const Default: Story = {};

export const WithFilename: Story = {
  args: { filename: "greet.ts" },
};

export const Numbered: Story = {
  args: { variant: "Numbered", filename: "greet.ts" },
};

export const Collapsed: Story = {
  args: {
    code: Array.from({ length: 30 }, (_, i) => `// Line ${i + 1}`).join("\n"),
    collapsedLines: 5,
    filename: "long-file.ts",
  },
};