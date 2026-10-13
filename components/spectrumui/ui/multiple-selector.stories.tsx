import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/MultipleSelector",
  parameters: {
    docs: {
      description: {
        component:
          "MultipleSelector is a multi-select combobox component. " +
          "It uses cmdk internally for the command palette experience. " +
          "Due to portal and context requirements, a full integration example is shown in code.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">MultipleSelector</h2>
        <p className="text-sm">
          Multi-select combobox built on cmdk.
        </p>
        <pre className="mt-4 text-left text-xs bg-muted p-3 rounded-md max-w-md">
{`<MultipleSelector
  options={[
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "svelte", label: "Svelte" },
  ]}
  placeholder="Select frameworks..."
  emptyIndicator={
    <p className="text-center text-sm">No results found</p>
  }
/>`}
        </pre>
      </div>
    </div>
  ),
};