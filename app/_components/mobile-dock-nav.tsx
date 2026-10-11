"use client";

import { useRouter } from "next/navigation";

import { LIBRARY_TABS } from "@/app/_components/library-routes";
import { Dock, DockIcon } from "@/components/spectrumui/dock";

/**
 * The library's navigation on phones, as Spectrum UI's Dock.
 *
 * The header nav is `sm:flex` only, so below that breakpoint this is the whole
 * menu. Dock and DockIcon are the vendored Spectrum components, unmodified;
 * this file is only the usage.
 */
export function MobileDockNav({ active }: { active?: string }) {
  const router = useRouter();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:hidden">
      <div className="pointer-events-auto">
        <Dock variant="glass" magnification={56} distance={130}>
          {LIBRARY_TABS.map((tab) => {
            const Glyph = tab.icon;
            const selected = active === tab.href;
            return (
              <DockIcon
                key={tab.href}
                label={tab.label}
                onClick={() => router.push(tab.href)}
              >
                <Glyph aria-hidden weight={selected ? "fill" : "regular"} />
              </DockIcon>
            );
          })}
        </Dock>
      </div>
    </div>
  );
}
