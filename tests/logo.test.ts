// The finale's logo layers are the original dbdelve.svg, split but unchanged.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { LOGO_ID_PREFIX, sceneElements, splitLogo } from "../src/lib/brand/logoLayers.ts";

const svg = readFileSync(new URL("../public/assets/dbdelve.svg", import.meta.url), "utf8");
const unprefix = (s: string) => s.replaceAll(LOGO_ID_PREFIX, "");

test("layers rejoin into the original scene, in order", () => {
  const logo = splitLogo(svg);
  const joined = unprefix(logo.layers.map((l) => l.markup).join(""));
  assert.equal(joined, sceneElements(svg).join(""));
  // Nothing in the scene was skipped: the raw markup, whitespace aside, is the layers.
  const scene = /<g clip-path="url\(#tile\)">([\s\S]*)<\/g>\s*<\/svg>/.exec(svg)?.[1] ?? "";
  assert.equal(joined.replace(/\s+/g, ""), scene.replace(/\s+/g, ""));
  assert.deepEqual(
    logo.layers.map((l) => l.name),
    ["shafts", "kelpBack", "seabed", "light", "bars", "kelpFront", "bubbles", "diver"]
  );
  assert.ok(svg.includes(unprefix(logo.tile)), "tile path unchanged");
  assert.equal(logo.viewBox, "0 0 1024 1024");
});

test("the diver pose is the one the live diver is rigged to", () => {
  const { diverTransform } = splitLogo(svg);
  assert.equal(diverTransform, "translate(497.3 393.4) rotate(40) scale(0.82)");
});
