// The diver's route: one continuous trajectory for the whole page, a pure
// function of the camera's scroll position. No DOM here, so tests run it in
// Node. The grammar is described in src/data/chapters.ts.
//
// Interpolation is monotone cubic (Fritsch–Carlson) per channel: C1-smooth,
// and it never overshoots a keyframe, so there are no loops or swings the
// author didn't draw. The same scroll always gives the same place, so
// scrolling back up replays the route in reverse.

export type Keyframe = [x: number, y: number, h: number, at?: number];

export interface RouteChapter {
  start: number;
  route: Keyframe[];
}

export interface RoutePose {
  /** Viewport fractions. */
  x: number;
  y: number;
  /** Authored heading, radians (0 right, π/2 down). */
  h: number;
  /** Screen px of sideways travel per px of scroll. */
  lateral: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function parseRoute(str: string | undefined, lineX: number, vw: number): Keyframe[] {
  return (str || "0.5,0.5,90")
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [pos = "", at] = tok.split("@");
      const [xs = "0.5", ys = "0.5", hs] = pos.split(",");
      const line = /^L([+-][\d.]+)?$/.exec(xs);
      const right = /^R(\d+)$/.exec(xs);
      const x = line
        ? lineX + Number(line[1] ?? 0)
        : right
          ? 1 - Number(right[1]) / vw
          : Number(xs);
      const y = ys === "W" ? Number.NaN : Number(ys);
      const h = Number(hs ?? 90);
      return at === undefined ? [x, y, h] : [x, y, h, Number(at)];
    });
}

/** Monotone cubic Hermite through (xs[i], ys[i]); xs strictly increasing. */
export function monotone(xs: readonly number[], ys: readonly number[]): (x: number) => number {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const d: number[] = [];
  const m: number[] = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    const a = d[i - 1];
    const b = d[i];
    m[i] = a * b <= 0 ? 0 : (a + b) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const di = d[i];
    if (di === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / di;
    const b = m[i + 1] / di;
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * di;
      m[i + 1] = t * b * di;
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const h = xs[hi] - xs[lo];
    const t = (x - xs[lo]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo] +
      (t3 - 2 * t2 + t) * h * m[lo] +
      (-2 * t3 + 3 * t2) * ys[hi] +
      (t3 - t2) * h * m[hi]
    );
  };
}

/** chapters in page order; maxScroll in px. Returns sample(scroll) -> pose. */
export function buildRoute(
  chapters: readonly RouteChapter[],
  maxScroll: number,
  vw: number,
  vh: number
): (s: number) => RoutePose {
  const S: number[] = [];
  const X: number[] = [];
  const Y: number[] = [];
  const H: number[] = [];
  chapters.forEach((c, i) => {
    const last = i === chapters.length - 1;
    const end = last ? maxScroll : chapters[i + 1].start;
    const n = c.route.length;
    c.route.forEach(([x, y0, h, at], k) => {
      const u = at ?? (last ? (n > 1 ? k / (n - 1) : 0) : k / n);
      let s = c.start + (end - c.start) * u;
      if (S.length && s <= S[S.length - 1]) s = S[S.length - 1] + 1; // collapsed chapters stay ordered
      // "W": world-anchored, the place in the water stays while the camera moves on.
      const y = Number.isNaN(y0) ? Y[Y.length - 1] - (s - S[S.length - 1]) / vh : y0;
      S.push(s);
      X.push(x);
      Y.push(y);
      H.push(h);
    });
  });
  const fx = monotone(S, X);
  const fy = monotone(S, Y);
  const fh = monotone(S, H);
  // Heading leans into lateral travel: a deterministic function of s, so it
  // reads the same scrolling down or back up. It only pitches a diver toward
  // the horizontal on the side it already faces (never turns it round), and
  // fades out as it faces away, so the lean can't flip or jump.
  const ds = Math.max(4, vh * 0.01);
  return function sample(raw) {
    const s = clamp(raw, 0, maxScroll);
    const x = fx(s);
    const y = fy(s);
    const h = (fh(s) * Math.PI) / 180;
    const lateral = ((fx(s + ds) - fx(s - ds)) * vw) / (2 * ds);
    const lean = clamp(lateral * 0.9, -1, 1);
    const side = Math.sign(lean) || 1;
    const facingTravel = clamp(Math.cos(h) * side * 2 + 0.5, 0, 1);
    const toward = side > 0 ? 0 : Math.PI;
    const diff = ((((toward - h) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return { x, y, h: h + diff * Math.abs(lean) * 0.5 * facingTravel, lateral };
  };
}
