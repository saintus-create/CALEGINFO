import type { Meta, StoryObj } from "@storybook/react";
import { WordmarkSpotlightFooter, type WordmarkSpotlightFooterProps } from "./wordmark-spotlight-footer";

const meta: Meta<typeof WordmarkSpotlightFooter> = {
  title: "Footers/WordmarkSpotlightFooter",
  component: WordmarkSpotlightFooter,
  args: {
    wordmark: "Spectrum",
    tagline: "Building the future of legal AI.",
    copyright: "© 2025 Spectrum Inc.",
    groups: [
      {
        title: "Product",
        links: [
          { label: "Features", href: "#" },
          { label: "Pricing", href: "#" },
          { label: "Changelog", href: "#" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "#" },
          { label: "Blog", href: "#" },
          { label: "Careers", href: "#" },
        ],
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof WordmarkSpotlightFooter>;

export const Spotlight: Story = {};

export const Static: Story = {
  args: { variant: "Static" },
};