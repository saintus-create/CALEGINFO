"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Browser from "@/app/_components/browsers/Browser";
import { BrowseShell } from "@/app/_components/browsers/browse-shell";
import { TreeNav } from "@/components/spectrumui/tree-nav";
import { codes, loadCorpus } from "@/lib/engine";

export default function CodesPage() {
  return (
    <Suspense>
      <CodesBrowser />
    </Suspense>
  );
}

function CodesBrowser() {
  const params = useSearchParams();
  const [activeCode, setActiveCode] = useState<string | null>(params.get("code"));
  const [jumpSection, setJumpSection] = useState<string | null>(params.get("section"));

  // The rail is built from `codes`, which loadCorpus fills from the manifest
  // within about a second — long before the 30 gzipped datasets finish. Gating
  // the re-render on the whole corpus left the rail blank for many seconds, and
  // the line that was supposed to trigger it ({!ready ? null : null}) rendered
  // null in both branches. Drive the re-render from progress instead.
  const [corpusProgress, setCorpusProgress] = useState(0);
  useEffect(() => {
    loadCorpus(() => setCorpusProgress((n) => (n || 0) + 1))
      .catch(() => undefined)
      .finally(() => setCorpusProgress(-1));
  }, []);

  // The rail is now made of links, so the active code follows the URL rather
  // than being set once on mount.
  useEffect(() => {
    setActiveCode(params.get("code"));
    setJumpSection(params.get("section"));
  }, [params]);

  return (
    <BrowseShell active="/codes">
      <div className="flex h-full">
        <div className="hidden w-64 shrink-0 border-r border-border md:block">
          <div className="h-full overflow-y-auto p-3">
            <TreeNav
              items={codes.map((c) => ({
                label: c.name,
                href: `/codes?code=${c.abbr}`,
                badge: c.sections.toLocaleString(),
              }))}
              activeHref={activeCode ? `/codes?code=${activeCode}` : undefined}
              linkComponent={Link}
              followHover
            />
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto">
          <Browser
            activeCode={activeCode}
            jumpSection={jumpSection}
            onCodeChange={(a: string | null) => {
              setActiveCode(a);
              setJumpSection(null);
            }}
          />
        </div>
      </div>
    </BrowseShell>
  );
}
