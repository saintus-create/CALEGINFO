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
      className={`${className ?? ""} seal-fade overflow-hidden rounded-full opacity-90`}
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
      {/* edge vignette: melts the emblem into the dark background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle closest-side at 50% 50%, transparent 0 58%, rgba(0,0,0,0.28) 74%, rgba(0,0,0,0.68) 88%, rgba(0,0,0,0.95) 97%, #000 100%)",
        }}
      />
      {/* a highlight that travels around the rim, lighting the rope grooves */}
      <div className="seal-rim-mask pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="seal-rim-sweep absolute inset-0"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.55) 30deg, transparent 78deg, transparent 360deg)",
            mixBlendMode: "screen",
          }}
        />
      </div>
    </div>
  );
}
