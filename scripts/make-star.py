#!/usr/bin/env python3
"""Generate the single-red-star mark, and derive the logo component, the
favicon SVG and the apple-touch PNG from the same geometry so they cannot
drift apart."""
import math
from pathlib import Path

from PIL import Image, ImageDraw

RED = "#c8102e"          # the California Republic star red
VIEW = 100.0             # viewBox is 0 0 100 100
CX = CY = 50.0
R_OUT = 47.0             # outer point radius
R_IN = R_OUT * 0.382     # inner radius: a classic five-point star

# A five-point star, first point straight up. 10 vertices alternating
# outer/inner, 36 degrees apart.
pts = []
for i in range(10):
    ang = math.radians(-90 + i * 36)
    r = R_OUT if i % 2 == 0 else R_IN
    pts.append((CX + r * math.cos(ang), CY + r * math.sin(ang)))

def fmt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")

path = "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + " Z"

root = Path("/scratch/work/cal3")

# --- 1. the logo component -------------------------------------------------
(root / "app/_components/star-mark.tsx").write_text(
    f'''/**
 * The site mark: a single red star.
 *
 * One five-point star at the California Republic's red ({RED}), replacing the
 * "CA" letterform mark. Geometry is shared with the favicon and the
 * apple-touch icon (see scripts/make-star.py) so the three cannot drift.
 * fill="currentColor" so a caller can recolour it if it ever needs to sit on
 * a surface where the red does not read.
 */
export function StarMark({{ className }}: {{ className?: string }}) {{
  return (
    <svg
      viewBox="0 0 {fmt(VIEW)} {fmt(VIEW)}"
      className={{className}}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="{path}" />
    </svg>
  );
}}
'''
)

# --- 2. the favicon -------------------------------------------------------
(root / "app/icon.svg").write_text(
    f'''<svg width="128" height="128" viewBox="0 0 {fmt(VIEW)} {fmt(VIEW)}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="{path}" fill="{RED}"/>
</svg>
'''
)

# --- 3. the apple-touch icon ---------------------------------------------
SIZE = 180
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
scale = SIZE / VIEW
d.polygon([(x * scale, y * scale) for x, y in pts], fill=RED)
img.save(root / "app/apple-icon.png")

print("star path:", path[:90] + "...")
print("wrote app/_components/star-mark.tsx, app/icon.svg, app/apple-icon.png")
