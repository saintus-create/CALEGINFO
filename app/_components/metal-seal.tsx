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
        WebkitMaskImage: "url(/mark-mask.png)",
        maskImage: "url(/mark-mask.png)",
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
    </div>
  );
}
