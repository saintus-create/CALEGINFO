"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Forms from "@/app/_components/browsers/Forms";
import { BrowseShell } from "@/app/_components/browsers/browse-shell";

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
      <div className="h-full overflow-y-auto">
        <Forms jumpForm={jumpForm} />
      </div>
    </BrowseShell>
  );
}
