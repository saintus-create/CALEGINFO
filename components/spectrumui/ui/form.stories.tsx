import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Primitives/Form",
  parameters: {
    docs: {
      description: {
        component:
          "Form components (Form, FormField, FormItem, FormLabel, FormControl, FormMessage) " +
          "integrate react-hook-form with Spectrum UI's field primitives. " +
          "They require a FormProvider context, so usage examples are best shown in code.",
      },
    },
  },
};

export default meta;

export const Documentation: StoryObj = {
  render: () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Form</h2>
        <p className="text-sm">
          Form components wrap react-hook-form with Spectrum UI field primitives.
        </p>
        <pre className="mt-4 text-left text-xs bg-muted p-3 rounded-md max-w-md">
{`<Form {...form}>
  <FormField
    control={form.control}
    name="username"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Username</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>`}
        </pre>
      </div>
    </div>
  ),
};