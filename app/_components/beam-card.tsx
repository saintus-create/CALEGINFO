"use client";

import type { ReactNode } from "react";

import { BorderBeam } from "@/components/spectrumui/ui/border-beam";
import { Card } from "@/components/spectrumui/ui/card";
import { cn } from "@/lib/utils";

/**
 * Spectrum's Card, carrying Spectrum's animated border beam.
 *
 * Both halves are the vendored components. Spectrum's registry also ships a
 * pre-wrapped BeamCard, but that item was never vendored into this repo and
 * its registry host does not resolve from the build environment, so the two
 * vendored pieces are composed rather than the item restated.
 *
 * BorderBeam paints `absolute inset-0` and inherits the radius, so the Card
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
    <Card className={cn("relative rounded-2xl", className)}>
      <BorderBeam
        size={220}
        duration={14}
        borderWidth={1.5}
        colorFrom="#c8102e"
        colorTo="#4c8dff"
      />
      {children}
    </Card>
  );
}
