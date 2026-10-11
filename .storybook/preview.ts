import type { Preview } from "@storybook/react";

// Pull in the real theme so stories render with the app's tokens, not a
// Storybook-specific approximation of them.
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: "todo" },
  },
};

export default preview;
