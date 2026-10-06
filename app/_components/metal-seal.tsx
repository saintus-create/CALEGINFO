"use client";

import { LiquidMetal } from "@paper-design/shaders-react";

/**
 * A California emblem in liquid metal.
 * A live WebGL liquid-metal shader (Paper, via fab-ui) masked to the mark's
 * silhouette, so the metal fills the emblem exactly.
 */
export function MetalEmblem({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        WebkitMaskImage: "url(/glass-mark.png)",
        maskImage: "url(/glass-mark.png)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-label="California emblem"
    >
      <LiquidMetal
        className="absolute inset-0 h-full w-full"
        shape="none"
        speed={0.4}
        repetition={16}
        softness={0.85}
        shiftRed={0}
        shiftBlue={0}
        distortion={0.15}
        contour={0}
        angle={20}
        scale={14}
        offsetX={0.1}
        offsetY={-0.1}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/glass-mark.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-contain"
        style={{ mixBlendMode: "overlay" }}
      />
    </div>
  );
}
