#!/usr/bin/env python3
"""Check that every class name in the live surfaces exists in the built CSS.

Two text defects this project shipped were the same failure: a class with no
rule behind it. `class="eyebrow"` sat in all five browsers with no `.eyebrow`
in any stylesheet (the labels rendered as plain body text), and the Rules title
cards asked for `metric-card`, which likewise never existed.

This walks the markup that actually renders, extracts every class token, and
checks it against the CSS Next emitted for the running app. Anything with no
rule behind it is reported — either write the rule, or stop asking for it.

Usage:
    python3 scripts/check_classes.py                 # boots `next dev` itself
    python3 scripts/check_classes.py --url http://localhost:3000
    python3 scripts/check_classes.py --css /tmp/app.css   # reuse a dump

Exit code is 1 when something is missing, so it can gate a build.
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Markup that renders: the chat, the five browsers, /method and the primitives
# they all share. Vendored blocks nothing imports are deliberately out of scope.
SURFACES = [
    "app/_components/browsers/*.jsx",
    "app/_components/*.tsx",
    "app/(browse)/*/page.tsx",
    "components/spectrumui/blocks/ai-assistants/*.tsx",
    "components/spectrumui/tree-nav.tsx",
    "components/spectrumui/dock.tsx",
    "components/ui/*.tsx",
]

# Classes that live in globals.css (hand-written) or carry no visual effect.
HAND_WRITTEN = {
    "eyebrow", "law-cite-chip", "law-followup-pill", "law-authorities",
    "law-authorities-label", "law-authority-pill", "law-md-link",
    "law-section-label", "law-tool-step", "law-ai-warning", "aui-md",
    "shimmer-text", "mark-glint", "dark", "group", "peer", "sr-only",
    "tabular-nums", "card-lift",
}

ESCAPED = set("[]/.%#():,!:*&>+~=\"'!")

MARKUP_CLASS = re.compile(r'className=\{?"([^"\n]+)"')


def escape(cls: str) -> str:
    """Reproduce the escaping Tailwind applies to a class name in CSS."""
    return "".join("\\" + ch if ch in ESCAPED else ch for ch in cls)


def strip_variants(token: str) -> str:
    """`dark:hover:bg-muted/50` -> `bg-muted/50`, honouring `[...]` variants."""
    base = token
    while True:
        if base.startswith("["):
            depth, cut = 0, None
            for i, ch in enumerate(base):
                depth += ch == "["
                depth -= ch == "]"
                if depth == 0 and ch == ":":
                    cut = i
                    break
            if cut is None:
                return base
            base = base[cut + 1:]
        elif ":" in base:
            base = base.split(":", 1)[1]
        else:
            return base


def fetch(url: str, timeout: float = 30.0) -> str:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return response.read().decode("utf-8", "replace")


def wait_for(url: str, seconds: float = 90.0) -> None:
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            fetch(url, timeout=5)
            return
        except (urllib.error.URLError, OSError):
            time.sleep(1.0)
    raise SystemExit(f"dev server never came up at {url}")


def collect_classes() -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for pattern in SURFACES:
        for path in sorted(glob.glob(str(ROOT / pattern))):
            src = Path(path).read_text(encoding="utf-8")
            for match in MARKUP_CLASS.finditer(src):
                for token in match.group(1).split():
                    if token in HAND_WRITTEN:
                        continue
                    base = strip_variants(token)
                    if base in HAND_WRITTEN or base.startswith(("data-[", "group/", "peer/")):
                        continue
                    found.setdefault(base, set()).add(os.path.basename(path))
    return found


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--route", default="/codes")
    parser.add_argument("--css", help="reuse an already-dumped stylesheet")
    args = parser.parse_args()

    if args.css:
        css = Path(args.css).read_text(encoding="utf-8")
    else:
        server = None
        try:
            fetch(args.url, timeout=3)
        except Exception:
            server = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            wait_for(args.url)

        html = fetch(f"{args.url}{args.route}")
        chunks = sorted(set(re.findall(r'/_next/static/[^"]+\.css', html)))
        if not chunks:
            print("no stylesheet linked from", args.route, file=sys.stderr)
            return 2
        css = "".join(fetch(f"{args.url}{chunk}") for chunk in chunks)
        if server:
            server.terminate()

    classes = collect_classes()
    missing = {c: w for c, w in classes.items() if escape(c) not in css}

    print(f"class tokens checked: {len(classes)}")
    if not missing:
        print("every class has a rule in the built stylesheet")
        return 0

    print(f"classes with no rule ({len(missing)}):")
    for cls, where in sorted(missing.items()):
        print(f"  {cls:38s} {', '.join(sorted(where))}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
