import type { Meta, StoryObj } from "@storybook/react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "./responsive-modal";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof ResponsiveModal> = {
  title: "Primitives/ResponsiveModal",
  component: ResponsiveModal,
};

export default meta;
type Story = StoryObj<typeof ResponsiveModal>;

export const Default: Story = {
  render: () => (
    <ResponsiveModal>
      <ResponsiveModalTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </ResponsiveModalTrigger>
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Edit profile</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value="Pedro Duarte" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input id="username" value="@peduarte" className="col-span-3" />
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  ),
};

export const Top: Story = {
  render: () => (
    <ResponsiveModal>
      <ResponsiveModalTrigger asChild>
        <Button variant="outline">Open Top</Button>
      </ResponsiveModalTrigger>
      <ResponsiveModalContent side="top">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Notification</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            This modal opens from the top on mobile.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
      </ResponsiveModalContent>
    </ResponsiveModal>
  ),
};