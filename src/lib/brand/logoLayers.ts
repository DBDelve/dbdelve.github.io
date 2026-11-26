// Splits public/assets/dbdelve.svg into its layers so the finale can reveal
// them in stages, without editing or redrawing the logo. Every element keeps
// its exact geometry and z-order; tests/logo.test.ts checks that the layers
// joined back together are the original file's drawing, element for element.
//
// Build-time only (reads the file from disk).

export type LogoLayerName =
  | "shafts"
  | "kelpBack"
  | "seabed"
  | "light"
  | "bars"
  | "kelpFront"
  | "bubbles"
  | "diver";

export interface LogoLayers {
  viewBox: string;
  /** <defs> content with ids prefixed so they can't collide with the page's. */
  defs: string;
  /** The rounded tile, filled with the water gradient. */
  tile: string;
  /** Elements inside the tile's clip, in drawing order, grouped by layer. */
  layers: { name: LogoLayerName; markup: string }[];
  /** The diver group's transform, the pose the swimming diver settles into. */
  diverTransform: string;
}

const PREFIX = "logo-";

/** Top-level elements of an SVG fragment (no nesting beyond one <g> level). */
function elements(fragment: string): string[] {
  const out: string[] = [];
  const re = /<(g)\b[^>]*>[\s\S]*?<\/g>|<(path|polyline|ellipse|rect|circle)\b[^>]*\/>/g;
  for (const m of fragment.matchAll(re)) out.push(m[0]);
  return out;
}

function classify(el: string): LogoLayerName {
  if (/^<g\b[^>]*transform="translate/.test(el)) return "diver";
  if (/^<g\b[^>]*filter=/.test(el) || /^<rect\b[^>]*fill="#5fe0d0"/.test(el)) return "bars";
  if (/fill="#ffffff"/.test(el)) return "shafts";
  if (/#0d4a4a/.test(el)) return "kelpBack";
  if (/#062a2c/.test(el)) return "kelpFront";
  if (/fill="#040a12"/.test(el)) return "seabed";
  if (/url\(#(pool|beam)\)/.test(el)) return "light";
  if (/^<circle\b/.test(el)) return "bubbles";
  throw new Error(`Unclassified logo element: ${el.slice(0, 80)}`);
}

const prefixIds = (s: string) =>
  s.replace(/id="([\w-]+)"/g, `id="${PREFIX}$1"`).replace(/url\(#([\w-]+)\)/g, `url(#${PREFIX}$1)`);

export function splitLogo(svg: string): LogoLayers {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const defs = /<defs>([\s\S]*?)<\/defs>/.exec(svg)?.[1];
  const tile = /<\/defs>\s*(<path\b[^>]*fill="url\(#water\)"\/>)/.exec(svg)?.[1];
  const scene = /<g clip-path="url\(#tile\)">([\s\S]*)<\/g>\s*<\/svg>/.exec(svg)?.[1];
  if (!viewBox || !defs || !tile || !scene)
    throw new Error("dbdelve.svg no longer has the expected structure");

  const layers: LogoLayers["layers"] = [];
  for (const el of elements(scene)) {
    const name = classify(el);
    const last = layers.at(-1);
    if (last?.name === name) last.markup += el;
    else {
      if (layers.some((l) => l.name === name))
        throw new Error(`Logo layer ${name} is not contiguous`);
      layers.push({ name, markup: el });
    }
  }
  const diver = layers.find((l) => l.name === "diver")?.markup ?? "";
  const diverTransform = /transform="([^"]+)"/.exec(diver)?.[1];
  if (!diverTransform) throw new Error("dbdelve.svg has no diver group");

  return {
    viewBox,
    defs: prefixIds(defs),
    tile: prefixIds(tile),
    layers: layers.map((l) => ({ ...l, markup: prefixIds(l.markup) })),
    diverTransform,
  };
}

/** The elements of the original scene, for tests. */
export const sceneElements = (svg: string) =>
  elements(/<g clip-path="url\(#tile\)">([\s\S]*)<\/g>\s*<\/svg>/.exec(svg)?.[1] ?? "");

export const LOGO_ID_PREFIX = PREFIX;
