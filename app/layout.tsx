import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/base/theme-key";

// The product face is Monument Grotesk (Dinamo), self-hosted from app/fonts so
// builds and previews work without a network round-trip. The family ships three
// weights — Regular 400, Medium 500, Bold 700 — so there is no 600 and
// `font-semibold` resolves to Bold; there is no 300 either, so `font-light`
// resolves to Regular. (app/fonts also carries Space Grotesk under the SIL OFL
// and its licence text; nothing loads it.) The embedded Monument Grotesk licence
// excludes redistributing the files or storing them on publicly available
// servers — see docs/audit-text-and-fonts.md before shipping this publicly.
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
      <head>
        {/* sets the theme before first paint, so there is no light flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${grotesk.variable} ${groteskMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
