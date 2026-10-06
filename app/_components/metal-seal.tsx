"use client";

import { LiquidMetal } from "@paper-design/shaders-react";

const MASK = (url: string) => ({
  WebkitMaskImage: `url(${url})`,
  maskImage: `url(${url})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskPosition: "center",
  maskPosition: "center",
}) as const;

// brief glints scattered over the emblem; the outline mask keeps only the ones
// that land on an edge, so light appears at points around the perimeter
const GLINTS = [
  { x: "24%", y: "26%", d: "0s" },
  { x: "58%", y: "16%", d: "0.9s" },
  { x: "79%", y: "44%", d: "1.8s" },
  { x: "66%", y: "72%", d: "2.7s" },
  { x: "38%", y: "84%", d: "3.6s" },
  { x: "15%", y: "58%", d: "4.5s" },
  { x: "47%", y: "40%", d: "5.4s" },
  { x: "88%", y: "24%", d: "6.3s" },
];

/**
 * A California emblem in glass and metal.
 * A live WebGL liquid-metal shader (Paper, via fab-ui) masked to the mark,
 * the glass artwork composited over it, and brief glints that fire around
 * the perimeter rather than bands sweeping the surface.
 */
export function MetalEmblem({ className }: { className?: string }) {
  return (
    <div className={className} style={{ position: "relative", ...MASK("/glass-mark.png") }} aria-label="California emblem">
      <LiquidMetal
        className="absolute inset-0 h-full w-full opacity-55"
        shape="none"
        speed={0.1}
        repetition={6}
        softness={0.8}
        shiftRed={0}
        shiftBlue={0}
        distortion={0.1}
        contour={0}
        angle={20}
        scale={12}
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
      {/* perimeter glints */}
      <div className="pointer-events-none absolute inset-0" style={MASK("/mark-outline.png")} aria-hidden>
        {GLINTS.map((g) => (
          <span
            key={g.d}
            className="mark-glint absolute block"
            style={{
              left: g.x,
              top: g.y,
              width: "30%",
              height: "30%",
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 35%, rgba(255,255,255,0) 65%)",
              mixBlendMode: "screen",
              animationDelay: g.d,
            }}
          />
        ))}
      </div>
    </div>
  );
}
