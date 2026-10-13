"use client";

import { useEffect } from "react";

const STORAGE_KEY = "caleginfo:grid-guides";

/**
 * The grid guides overlay: it draws the *actual* page grid — same tokens, same
 * margins, same gutters, same 12 columns — over whatever is on screen, so an
 * alignment can be checked instead of guessed.
 *
 *   1. toggle with the keyboard: shift + G
 *   2. or force it on with the URL: ?grid=1 (?grid=0 to hide)
 *
 * The choice is remembered in localStorage, so it survives navigation between
 * the chat and the browse pages. The overlay is pointer-events:none and never
 * renders unless it is switched on.
 */
export function GridGuides({
  columns = 12,
  defaultOn = false,
}: {
  columns?: number;
  /** start visible without a toggle — used by the Storybook reference page */
  defaultOn?: boolean;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const apply = (on: boolean) => {
      if (on) root.dataset.gridGuides = "true";
      else delete root.dataset.gridGuides;
      try {
        localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
      } catch {
        /* private mode: the overlay simply will not persist */
      }
    };

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("grid");
    if (fromUrl === "1" || fromUrl === "true") {
      apply(true);
    } else if (fromUrl === "0" || fromUrl === "false") {
      apply(false);
    } else if (defaultOn) {
      apply(true);
    } else {
      try {
        apply(localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        /* ignore */
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "G" && event.key !== "g") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }
      event.preventDefault();
      apply(root.dataset.gridGuides !== "true");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="grid-guides page-grid" aria-hidden="true">
      {Array.from({ length: columns }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export default GridGuides;
