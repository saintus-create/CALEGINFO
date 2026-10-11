"use client";

import type { ReactNode } from "react";

import { BorderBeam } from "@/components/spectrumui/ui/border-beam";
import { cn } from "@/lib/utils";

/**
 * A card wrapped in Spectrum UI's animated border beam.
 *
 * Spectrum ships a BeamCard in its registry, but this repo vendored only the
 * BorderBeam primitive it is built on, and the registry host is not reachable
 * from the build environment. So this composes a card around Spectrum's own
 * primitive rather than restating their component from guesswork.
 *
 * BorderBeam paints `absolute inset-0` and inherits the radius, so the wrapper
 * must be `relative` and carry the rounding.
 */
export function BeamCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <BorderBeam
        size={220}
        duration={14}
        borderWidth={1.5}
        colorFrom="#c8102e"
        colorTo="#4c8dff"
      />
      {children}
    </div>
  );
}
