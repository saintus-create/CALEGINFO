import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "SpectrumUI/DataTable",
  parameters: {
    docs: {
      description: {
        component:
          "DataTable is a full-featured data table component built on TanStack Table. " +
          "It supports sorting, filtering, pagination, and column visibility.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">DataTable</h2>
        <p className="text-sm">
          Full-featured data table built on TanStack Table.
        </p>
        <pre className="mt-4 text-left text-xs bg-muted p-3 rounded-md max-w-md">
{`<DataTable
  columns={columns}
  data={data}
  searchKey="name"
/>`}
        </pre>
      </div>
    </div>
  ),
};