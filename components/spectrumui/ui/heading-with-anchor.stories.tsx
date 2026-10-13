import type { Meta, StoryObj } from "@storybook/react";
import { H1, H2, H3, H4, H5, H6, P } from "./heading-with-anchor";

const meta: Meta = {
  title: "Primitives/HeadingWithAnchor",
};

export default meta;

export const AllHeadings: StoryObj = {
  render: () => (
    <div className="space-y-4 max-w-[600px]">
      <H1>Heading Level 1</H1>
      <H2>Heading Level 2</H2>
      <H3>Heading Level 3</H3>
      <H4>Heading Level 4</H4>
      <H5>Heading Level 5</H5>
      <H6>Heading Level 6</H6>
      <P>This is a paragraph element.</P>
    </div>
  ),
};

export const WithAnchors: StoryObj = {
  render: () => (
    <div className="space-y-4 max-w-[600px]">
      <H1 anchor="introduction">Introduction</H1>
      <P>Welcome to the documentation.</P>
      <H2 anchor="getting-started">Getting Started</H2>
      <P>Follow these steps to get started.</P>
      <H3 anchor="installation">Installation</H3>
      <P>Install the package using your preferred package manager.</P>
    </div>
  ),
};