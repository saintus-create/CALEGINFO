import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

// Space Grotesk (SIL OFL 1.1) is self-hosted in app/fonts so builds and previews
// work without a network round-trip to Google Fonts.
const grotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  variable: "--font-grotesk",
});

export const metadata: Metadata = {
  title: "California Legislative Information",
  description:
    "AI legal research for California law — the complete California Codes, 2025-26 bills, Rules of Court, all 1,670 statewide Judicial Council forms, and case law.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${grotesk.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
