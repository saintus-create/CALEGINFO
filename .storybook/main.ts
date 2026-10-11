import type { StorybookConfig } from "@storybook/nextjs";

/**
 * Stories live next to the component they describe, so a component's contract
 * sits in the same folder as its implementation.
 */
const config: StorybookConfig = {
  stories: [
    "../components/**/*.stories.@(ts|tsx|mdx)",
    "../app/**/*.stories.@(ts|tsx|mdx)",
  ],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
  docs: { autodocs: true },
};

export default config;
