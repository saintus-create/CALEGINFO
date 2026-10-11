import { cn } from "@/lib/utils";

/**
 * The site wordmark, used in the top-left corner of every shell.
 *
 * The reference is an extra-bold, condensed, tightly-tracked uppercase
 * grotesk. Monument Grotesk Bold is the heaviest face the project ships and it
 * has no condensed cut, so the width is compressed with a small scaleX rather
 * than swapped for a different typeface.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block leading-none font-bold tracking-[-0.005em] whitespace-nowrap uppercase select-none",
        className,
      )}
      style={{ transform: "scaleX(0.88)", transformOrigin: "left center" }}
    >
      California Legislation
    </span>
  );
}
