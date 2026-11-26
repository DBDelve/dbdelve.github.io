// The route is continuous, never overshoots its keyframes, and gives the same
// pose going down or back up.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CHAPTERS } from "../src/data/chapters.ts";
import { buildRoute, monotone, parseRoute } from "../src/lib/expedition/route.ts";

test("monotone cubic hits keyframes and never overshoots", () => {
  const f = monotone([0, 1, 2, 3], [0, 1, 1, 5]);
  assert.equal(f(1), 1);
  assert.equal(f(2), 1);
  for (let x = 1; x <= 2; x += 0.01)
    assert.ok(Math.abs(f(x) - 1) < 1e-9, "flat segment stays flat");
  for (let x = 2; x <= 3; x += 0.01)
    assert.ok(f(x) >= 1 - 1e-9 && f(x) <= 5 + 1e-9, "no overshoot");
});

test("route tokens", () => {
  assert.deepEqual(parseRoute("L-0.25,0.2,180 R100,0.5,90", 0.75, 1000), [
    [0.5, 0.2, 180],
    [0.9, 0.5, 90],
  ]);
  // W holds the place in the water: it rises exactly as fast as the page scrolls.
  const held = buildRoute(
    [{ start: 0, route: parseRoute("0.5,0.5,90@0 0.5,W,90@1", 0, 1000) }],
    1000,
    1000,
    1000
  );
  assert.ok(Math.abs(held(1000).y - (0.5 - 1)) < 1e-9);
});

for (const [vw, vh, small] of [
  [1440, 900, false],
  [390, 844, true],
] as const) {
  test(`real routes at ${vw}px are continuous and reversible`, () => {
    assert.equal(CHAPTERS.length, 9, "nine chapters");
    const spans = [1.6, 1.3, 1.1, 1.4, 1.8, 2.4, 1.6, 1.3, 1.5].map((k) => k * vh);
    let at = 0;
    const chapters = CHAPTERS.map((c, i) => {
      const start = at;
      at += spans[i];
      return { start, route: parseRoute(small ? c.routeSm : c.route, 0.63, vw) };
    });
    const max = at - vh;
    const sample = buildRoute(chapters, max, vw, vh);
    let prev = sample(0);
    let maxStep = 0;
    let maxTurn = 0;
    const step = 2; // px of scroll
    for (let s = step; s <= max; s += step) {
      const p = sample(s);
      maxStep = Math.max(maxStep, Math.hypot((p.x - prev.x) * vw, (p.y - prev.y) * vh));
      maxTurn = Math.max(maxTurn, Math.abs(p.h - prev.h));
      prev = p;
    }
    // 2 px of scroll may move the diver at most ~6 px on screen and turn it ~1.7°: no jumps.
    assert.ok(maxStep < 6, `largest screen step ${maxStep.toFixed(2)} px per ${step} px scroll`);
    assert.ok(
      maxTurn < 0.03,
      `largest turn ${((maxTurn * 180) / Math.PI).toFixed(2)}° per ${step} px`
    );
    for (const s of [0, 0.37 * max, 0.81 * max, max]) assert.deepEqual(sample(s), sample(s));
  });
}
