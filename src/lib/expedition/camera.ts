// The camera: document scroll eased by a short, bounded lag. It is the only
// thing allowed to trail the scrollbar, and it never trails by more than
// MAX_LAG viewports. Pure, so tests can drive it.
export const LAG = 0.18; // time constant, s: about ScrollTrigger's scrub: 0.6
export const MAX_LAG = 0.22; // viewports

export function advanceCamera(
  cam: number,
  scroll: number,
  dt: number,
  vh: number,
  reduced: boolean
): number {
  if (reduced || dt <= 0) return scroll;
  let next = cam + (scroll - cam) * (1 - Math.exp(-dt / LAG));
  const lim = vh * MAX_LAG;
  next = Math.min(scroll + lim, Math.max(scroll - lim, next));
  return Math.abs(scroll - next) < 0.3 ? scroll : next; // settle: the descent stops, it doesn't creep
}

/** Narrative depth at a camera position: chapter index, metres, page progress. */
export function readDepth(
  chapters: readonly { start: number; depth: number }[],
  cam: number,
  maxScroll: number
): { index: number; depthM: number; progress: number } {
  let i = 0;
  while (i < chapters.length - 1 && chapters[i + 1].start <= cam + 1) i++;
  const c = chapters[i];
  const next = chapters[i + 1];
  const end = next ? next.start : maxScroll;
  const local = end > c.start ? Math.min(1, Math.max(0, (cam - c.start) / (end - c.start))) : 1;
  const depthM = next ? c.depth + (next.depth - c.depth) * local : c.depth;
  return { index: i, depthM, progress: cam / maxScroll };
}
