import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

// Space Grotesk (SIL OFL 1.1) is self-hosted in app/fonts so builds and previews
// work without a network round-trip to Google Fonts.
const grotesk = localFont({
  src: [
    { path: "./fonts/MonumentGrotesk-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/MonumentGrotesk-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/MonumentGrotesk-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/MonumentGrotesk-Italic.otf", weight: "400", style: "italic" },
    { path: "./fonts/MonumentGrotesk-MediumItalic.otf", weight: "500", style: "italic" },
    { path: "./fonts/MonumentGrotesk-BoldItalic.otf", weight: "700", style: "italic" },
  ],
  display: "swap",
  variable: "--font-grotesk",
});

const groteskMono = localFont({
  src: [
    { path: "./fonts/MonumentGrotesk-Mono.otf", weight: "400", style: "normal" },
    { path: "./fonts/MonumentGrotesk-Semi-Mono.otf", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-grotesk-mono",
});

export const metadata: Metadata = {
  title: "California Legislative Information",
  description:
    "AI legal research for California law — the complete California Codes, 2025-26 bills, Rules of Court, all 1,670 statewide Judicial Council forms, and case law.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${grotesk.variable} ${groteskMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
