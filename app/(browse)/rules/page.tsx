"use client";

import { BrowseShell } from "@/app/_components/browsers/browse-shell";
import Rules from "@/app/_components/browsers/Rules";

export default function RulesPage() {
  return (
    <BrowseShell active="/rules">
      <Rules jumpRule={null} />
    </BrowseShell>
  );
}
