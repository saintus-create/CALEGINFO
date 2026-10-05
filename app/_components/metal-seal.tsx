"use client";

import { LiquidMetal } from "@paper-design/shaders-react";

/**
 * The Great Seal of California in liquid metal.
 * A live WebGL liquid-metal shader (Paper, via fab-ui) with the seal's
 * engraving composited over it in luminosity, so the metal reads as a
 * cast-metal relief of the seal.
 */
export function MetalSeal({ className }: { className?: string }) {
  return (
    <div
      className={`${className ?? ""} overflow-hidden rounded-full`}
      style={{ position: "relative" }}
      aria-label="Great Seal of California"
    >
      <LiquidMetal
        className="absolute inset-0 h-full w-full"
        shape="none"
        speed={0.5}
        repetition={3}
        softness={0.6}
        shiftRed={0}
        shiftBlue={0}
        distortion={0}
        contour={0}
        angle={45}
        scale={8}
        offsetX={0.1}
        offsetY={-0.1}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/seal-relief.png"
        alt=""
        aria-hidden
        className="relative h-full w-full object-contain"
        style={{ mixBlendMode: "luminosity" }}
      />
    </div>
  );
}
