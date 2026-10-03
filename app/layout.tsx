import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "California Legislative Information",
  description:
    "AI legal research for California law — the complete California Codes, 2025-26 bills, Rules of Court, and case law.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${grotesk.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
