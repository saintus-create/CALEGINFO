import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/DateTimePicker",
  parameters: {
    docs: {
      description: {
        component:
          "DateTimePicker combines a Calendar, time input, and Popover into a single date-time selection widget. " +
          "It includes timezone support and AM/PM toggling. Due to its interactive nature, " +
          "refer to the source code for a full integration example.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">DateTimePicker</h2>
        <p className="text-sm">
          Full date-time picker with calendar, time input, and timezone support.
        </p>
        <pre className="mt-4 text-left text-xs bg-muted p-3 rounded-md max-w-md">
{`<DateTimePicker
  value={date}
  onChange={setDate}
  granularity="minute"
/>`}
        </pre>
      </div>
    </div>
  ),
};