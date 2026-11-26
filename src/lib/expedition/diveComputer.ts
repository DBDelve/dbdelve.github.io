// Dive computer: a compact narrative instrument. Depth, which way the diver
// is travelling, the ocean zone, the chapter, and a small dive profile (depth
// against progress through the page). It opens the expedition profile: the
// same profile drawn large, with every chapter as a link. Native scrolling
// does the travelling; the computer only reports and links. Depths are
// narrative: nothing here measures anything.
import { zoneOf } from "@/data/chapters";

import type { ExpeditionState } from "./state";

const fmt = (m: number) => Math.round(m).toLocaleString("en");
const pad = (n: number) => String(n).padStart(2, "0");
const TREND: Record<string, string> = { "1": "Descending", "-1": "Ascending", "0": "Hovering" };

const pick = <T extends Element>(root: ParentNode, sel: string) => root.querySelector<T>(sel);

interface Profile {
  root: HTMLElement;
  plan: SVGPathElement | null;
  done: SVGPathElement | null;
  clip: SVGRectElement | null;
  dots: SVGPathElement | null;
}

export function createDiveComputer(face: HTMLElement, map: HTMLElement, signal: AbortSignal) {
  const depthEl = pick<HTMLElement>(face, "[data-dc-depth]");
  const zoneEl = pick<HTMLElement>(face, "[data-dc-zone]");
  const indexEl = pick<HTMLElement>(face, "[data-dc-index]");
  const trendEl = pick<HTMLElement>(face, "[data-dc-trend]");
  const trendLabel = pick<HTMLElement>(face, "[data-dc-trend-label]");
  const entries = [...map.querySelectorAll<HTMLAnchorElement>("[data-map-entry]")];
  const profiles: Profile[] = [face, map].map((root) => ({
    root,
    plan: pick(root, "[data-profile-plan]"),
    done: pick(root, "[data-profile-done]"),
    clip: pick(root, "[data-profile-clip]"),
    dots: pick(root, "[data-profile-dots]"),
  }));
  let maxDepth = 1;
  const shown: { d?: number; i?: number; dir?: number; x?: number } = {};

  // A link in the map closes it; the anchor does the scrolling.
  map.addEventListener(
    "click",
    (e) => {
      if (e.target instanceof Element && e.target.closest("a")) map.hidePopover();
    },
    { signal }
  );

  // Profile coordinates: x is progress (0..100), y is depth on a square-root
  // scale (0..32), so the shallow chapters aren't squashed against the top.
  const py = (m: number) => Math.sqrt(m / maxDepth) * 30 + 1;

  function build(s: ExpeditionState) {
    maxDepth = Math.max(...s.chapters.map((c) => c.depth), 1);
    const pts = s.chapters.map((c) => [(c.start / s.maxScroll) * 100, c.depth] as const);
    pts.push([100, s.chapters.at(-1)?.depth ?? 0]);
    const d = `M${pts.map(([x, m]) => `${x.toFixed(2)} ${py(m).toFixed(2)}`).join(" L")}`;
    for (const p of profiles) {
      p.plan?.setAttribute("d", d);
      p.done?.setAttribute("d", d);
      // Zero-length, round-capped strokes: dots that stay round in a stretched plot.
      p.dots?.setAttribute(
        "d",
        s.chapters
          .map((c) => `M${((c.start / s.maxScroll) * 100).toFixed(2)} ${py(c.depth).toFixed(2)}h0`)
          .join("")
      );
    }
    delete shown.x;
  }

  function update(s: ExpeditionState) {
    const d = Math.round(s.depthM);
    if (d !== shown.d) {
      shown.d = d;
      if (depthEl) depthEl.textContent = fmt(d);
      if (zoneEl) zoneEl.textContent = zoneOf(d);
    }
    if (s.index !== shown.i) {
      shown.i = s.index;
      if (indexEl) indexEl.textContent = `${pad(s.index + 1)}/${pad(s.chapters.length)}`;
      entries.forEach((a, i) =>
        i === s.index ? a.setAttribute("aria-current", "step") : a.removeAttribute("aria-current")
      );
    }
    if (s.dir !== shown.dir) {
      shown.dir = s.dir;
      if (trendEl) trendEl.dataset.dir = String(s.dir);
      if (trendLabel) trendLabel.textContent = TREND[String(s.dir)] ?? "";
    }
    const x = Math.round(s.progress * 1000) / 10;
    if (x !== shown.x) {
      shown.x = x;
      const y = py(s.depthM);
      for (const p of profiles) {
        p.clip?.setAttribute("width", String(x));
        p.root.style.setProperty("--px", `${x}%`);
        p.root.style.setProperty("--py", `${(y / 32) * 100}%`);
      }
    }
  }

  return { build, update };
}
