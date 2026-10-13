"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { BrowseShell } from "@/app/_components/browsers/browse-shell";
import Forms from "@/app/_components/browsers/Forms";

export default function FormsPage() {
  return (
    <Suspense>
      <FormsBrowser />
    </Suspense>
  );
}

function FormsBrowser() {
  const params = useSearchParams();
  const jumpForm = params.get("form") || params.get("number") || params.get("q");

  return (
    <BrowseShell active="/forms">
      <Forms jumpForm={jumpForm} />
    </BrowseShell>
  );
}
