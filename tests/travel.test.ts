// The diver's direction state: sustained travel turns it, short reversals
// don't, stopping settles into a hover, and the pose never jumps or overshoots.
import assert from "node:assert/strict";
import { test } from "node:test";

import { createTravel } from "../src/lib/expedition/travel.ts";

const dt = 1 / 60;
type Travel = ReturnType<typeof createTravel>;
interface Rec {
  maxStep: number;
  min: number;
  max: number;
}

function run(t: Travel, vps: number, secs: number, rec?: Rec) {
  for (let i = 0; i < secs / dt; i++) {
    const before = t.state.tau;
    t.step(vps * dt, dt);
    if (rec) {
      rec.maxStep = Math.max(rec.maxStep, Math.abs(t.state.tau - before));
      rec.min = Math.min(rec.min, t.state.tau);
      rec.max = Math.max(rec.max, t.state.tau);
    }
  }
  return t.state;
}

test("hysteresis, hover and smooth turns", () => {
  const t = createTravel();
  run(t, 0.5, 1);
  assert.equal(t.state.dir, 1);
  assert.ok(t.state.tau > 0.99);

  // A short flick back up (0.04 viewports) does not turn the diver.
  run(t, -0.4, 0.1);
  assert.equal(t.state.dir, 1, "short reversal keeps heading");
  run(t, 0.5, 0.5);

  // Repeated tiny back-and-forth flicks never flip it.
  for (let k = 0; k < 10; k++) {
    run(t, -0.5, 0.08);
    run(t, 0.5, 0.08);
  }
  assert.equal(t.state.dir, 1, "jitter does not flip");

  // Sustained ascent: turns head up, smoothly and without overshoot.
  const rec: Rec = { maxStep: 0, min: Infinity, max: -Infinity };
  run(t, -0.5, 1.5, rec);
  assert.equal(t.state.dir, -1, "sustained reversal turns");
  assert.ok(t.state.tau < -0.98, `settled head up (${t.state.tau.toFixed(3)})`);
  assert.ok(rec.min >= -1.0001, "no overshoot past head-up");
  assert.ok(rec.maxStep < 0.08, `smooth turn: largest step ${rec.maxStep.toFixed(3)} per frame`);

  // Stop: hover, level-ish, on the side it was travelling.
  run(t, 0, 1.5);
  assert.equal(t.state.dir, 0);
  assert.ok(Math.abs(t.state.tau - -0.2) < 0.02, `hovers near level (${t.state.tau.toFixed(3)})`);

  // From a hover, carrying on the way it last travelled sets off quickly…
  run(t, -0.3, 0.35);
  assert.equal(t.state.dir, -1, "resumes from hover");
  run(t, 0, 1.5);
  // …while turning round from a hover needs a deliberate reversal.
  run(t, 0.6, 0.35);
  assert.equal(t.state.dir, 1, "a sustained reversal from hover turns");
});

test("wheel flicks around a stop never flip the diver", () => {
  const t = createTravel();
  run(t, 0.5, 1);
  run(t, 0, 1.5); // hovering, last travelled down
  let flips = 0;
  let prev = t.state.dir;
  // Six flicks: 0.1 viewport up, then 0.1 viewport down, each over ~32 ms.
  for (let k = 0; k < 6; k++) {
    run(t, -0.1 / 0.033, 0.033);
    if (t.state.dir !== prev && t.state.dir !== 0) flips++;
    prev = t.state.dir;
    run(t, 0.1 / 0.033, 0.033);
    if (t.state.dir !== prev && t.state.dir !== 0) flips++;
    prev = t.state.dir;
  }
  assert.ok(flips <= 1, `flips during flicks: ${flips}`);
  assert.ok(t.state.tau > 0, `still head-down-ish (${t.state.tau.toFixed(2)})`);
});

test("a full turn completes in under 1.2 s", () => {
  const t = createTravel();
  run(t, 0.5, 1);
  let n = 0;
  while (t.state.tau > -0.9 && n < 600) {
    t.step(-0.5 * dt, dt);
    n++;
  }
  assert.ok(n * dt < 1.2, `turn completes in ${(n * dt).toFixed(2)} s`);
});

test("a dropped frame stays stable", () => {
  const t = createTravel();
  t.step(-0.05, 0.05);
  t.step(-0.05, 0.05);
  t.step(-0.05, 0.05);
  assert.ok(Number.isFinite(t.state.tau) && Math.abs(t.state.tau) <= 1.0001);
});
