// Which way the diver is travelling: descending (1), ascending (-1) or
// hovering (0). Pure, no DOM, so tests run it in Node.
//
// Input is the camera's movement per frame, in viewports. Velocity is
// low-pass filtered, and a change of direction needs hysteresis twice over:
// the filtered speed must cross a threshold, and the camera must then travel
// a minimum distance the new way. A short flick back doesn't turn the diver;
// a sustained one does. Stopping turns into a hover after a short pause. From
// a hover, carrying on the way it last travelled is quick, but turning round
// needs the full reversal, and each turn is held for a moment, so wheel
// flicks around a stop can't make the diver flip back and forth.
//
// `tau` is the body's travel pose, -1 (head up) .. 0 (level) .. 1 (head
// down), driven toward its target by a critically damped spring so turns
// accelerate and settle without overshoot or snapping.

export type Direction = -1 | 0 | 1;

export interface TravelState {
  dir: Direction;
  /** The last direction travelled, kept while hovering. */
  last: -1 | 1;
  tau: number;
  tauV: number;
  vf: number;
  acc: number;
  still: number;
  /** Seconds since the last committed change of direction. */
  since: number;
}

const MOVE = 0.06; // filtered speed (viewports/s) that counts as travelling
const COMMIT = 0.12; // viewports to travel the new way before turning round
const START = 0.03; // ... or before carrying on the way it last travelled, from a hover
const HOLD = 0.5; // seconds after a turn before another can commit
const STILL = 0.3; // seconds below MOVE before the diver settles into a hover
const FILTER = 0.12; // velocity filter time constant, s
const OMEGA = 6; // spring stiffness, rad/s: a full head-down to head-up turn settles in ~0.8 s

export function createTravel() {
  const s: TravelState = { dir: 1, last: 1, tau: 1, tauV: 0, vf: 0, acc: 0, still: 0, since: HOLD };

  /** d: camera movement this frame in viewports (positive = down); dt: seconds;
   *  hoverTau: the level-ish pose to hover in, as a fraction of head-down. */
  function step(d: number, dt: number, hoverTau = 0.2): TravelState {
    if (dt <= 0) return s;
    s.since += dt;
    s.vf += (d / dt - s.vf) * (1 - Math.exp(-dt / FILTER));
    const cand: Direction = Math.abs(s.vf) <= MOVE ? 0 : s.vf > 0 ? 1 : -1;
    if (cand === 0) {
      s.acc = 0;
      s.still += dt;
      if (s.still > STILL) s.dir = 0;
    } else {
      s.still = 0;
      if (cand === s.dir) s.acc = 0;
      else {
        // Travel the other way resets the run: only sustained movement counts.
        if (Math.sign(d) === cand) s.acc += Math.abs(d);
        else s.acc = 0;
        const need = s.dir === 0 && cand === s.last ? START : COMMIT;
        if (s.acc >= need && s.since >= HOLD) {
          if (cand !== s.last) s.since = 0; // turning round starts the hold
          s.dir = cand;
          s.last = cand;
          s.acc = 0;
        }
      }
    }
    const target = s.dir === 0 ? s.last * hoverTau : s.dir;
    // Critically damped spring, integrated in small substeps for stability.
    for (let t = dt; t > 1e-6; t -= 1 / 120) {
      const h = Math.min(t, 1 / 120);
      s.tauV += (OMEGA * OMEGA * (target - s.tau) - 2 * OMEGA * s.tauV) * h;
      s.tau += s.tauV * h;
    }
    return s;
  }

  /** Reduced motion, or a jump with no frames between: take the pose at once. */
  function snap(dir?: -1 | 1): TravelState {
    if (dir) {
      s.dir = dir;
      s.last = dir;
    }
    s.tau = s.dir === 0 ? s.last * 0.2 : s.dir;
    s.tauV = 0;
    return s;
  }

  return { state: s, step, snap };
}
