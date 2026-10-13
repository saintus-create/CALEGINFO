import type { Meta, StoryObj } from "@storybook/react";
import { Toast, ToastAction, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "./toast";
import { Button } from "./button";

const meta: Meta<typeof Toast> = {
  title: "Primitives/Toast",
  component: Toast,
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
        <ToastViewport />
      </ToastProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  render: () => (
    <Toast open>
      <div className="grid gap-1">
        <Title>Scheduled: Catch up</Title>
        <Description>Friday, February 10, 2023 at 5:57 PM</Description>
      </div>
      <ToastAction altText="Goto schedule to undo">Undo</ToastAction>
    </Toast>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Toast open variant="destructive">
      <div className="grid gap-1">
        <Title>Uh oh! Something went wrong.</Title>
        <Description>There was a problem with your request.</Description>
      </div>
      <ToastAction altText="Try again">Try again</ToastAction>
    </Toast>
  ),
};

function Title({ children }: { children: React.ReactNode }) {
  return <ToastTitle>{children}</ToastTitle>;
}

function Description({ children }: { children: React.ReactNode }) {
  return <ToastDescription>{children}</ToastDescription>;
}