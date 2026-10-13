"use client";

import Directory from "@/app/_components/browsers/Directory";
import { BrowseShell } from "@/app/_components/browsers/browse-shell";

export default function DirectoryPage() {
  return (
    <BrowseShell active="/directory">
      <Directory />
    </BrowseShell>
  );
}
