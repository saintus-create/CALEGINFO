import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Empty States/UploadEmpty",
  parameters: {
    docs: {
      description: {
        component:
          "UploadEmpty displays an empty state when no files have been uploaded.",
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">UploadEmpty</h2>
        <p className="text-sm">No files uploaded yet.</p>
      </div>
    </div>
  ),
};