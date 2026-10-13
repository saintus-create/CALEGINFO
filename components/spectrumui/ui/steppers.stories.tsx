import type { Meta, StoryObj } from "@storybook/react";

/**
 * Steppers is an async Server Component (it reads the filesystem), so we
 * cannot render it directly in Storybook. Instead, we render the
 * synchronous sub-component `Stepper` which it uses internally, and
 * document the full `Steppers` usage pattern in code.
 *
 * We extract Stepper by re-declaring its interface here (it isn't
 * exported from the module).
 */

const meta: Meta = {
  title: "Primitives/Steppers",
  parameters: {
    docs: {
      description: {
        component:
          "Steppers is an async Server Component that reads code files from disk. " +
          "The individual Stepper sub-component (numbered step with title and content) " +
          "is shown below. Use `<Steppers>` in server components for the full experience.",
      },
    },
  },
};

export default meta;

function StepperDemo({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="group">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 font-medium shadow-sm">
          {step}
        </span>
        <h4 className="text-base font-semibold text-neutral-800">{title}</h4>
      </div>
      {children && (
        <div className="ml-11 mt-2 border-l-2 border-neutral-100 pl-4 text-sm">
          {children}
        </div>
      )}
    </div>
  );
}

export const Default: StoryObj = {
  render: () => (
    <div className="space-y-6 py-2 max-w-[500px]">
      <StepperDemo title="Install the package" step={1}>
        <code className="block bg-muted p-2 rounded text-sm">
          npm install @spectrumui/steppers
        </code>
      </StepperDemo>
      <StepperDemo title="Import the component" step={2}>
        <p className="text-muted-foreground">
          Add the import statement to your file.
        </p>
      </StepperDemo>
      <StepperDemo title="Use it in your page" step={3}>
        <p className="text-muted-foreground">
          Place the Steppers component in your layout.
        </p>
      </StepperDemo>
    </div>
  ),
};