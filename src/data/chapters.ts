// The dive, in page order. Each chapter's narrative depth places it in the
// water column, and its route says where the diver swims while that chapter
// is on screen. Route grammar (parsed by lib/expedition/route.ts):
//
//   "x,y,h"   viewport fractions and a heading in degrees (0 right, 90 down,
//             180 left); a chapter's keyframes are spread over its scroll span
//   "@0.4"    place this keyframe at a chosen fraction of the span instead
//   x = "L-0.03"  relative to the descent line hanging from the boat
//   x = "R92"     92 px in from the right edge: the lane beside the content
//   y = "W"       hold the previous place in the water while the camera moves on
//
// `routeSm` is used below 960 px, where there is no free lane.

export type ChapterId =
  | "surface"
  | "descent"
  | "engines"
  | "tour"
  | "benchmarks"
  | "features"
  | "themes"
  | "install"
  | "deep";

export type Aim = "sonar" | "tour" | "deep";

export interface Chapter {
  id: ChapterId;
  title: string;
  depth: number;
  route: string;
  routeSm: string;
  aim?: Aim;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "surface",
    title: "The Surface",
    depth: 0,
    route: "L-0.045,0.172,184@0 L-0.01,0.27,128@0.2 L,0.42,102@0.55 R92,0.5,100@0.85",
    routeSm: "L-0.08,0.168,184@0 L-0.03,0.27,128@0.2 L,0.42,102@0.55 0.93,0.5,100@0.85",
  },
  {
    id: "descent",
    title: "The Descent",
    depth: 30,
    route: "R92,0.5,100 R92,0.55,100 R92,0.52,104",
    routeSm: "0.93,0.5,100 0.93,0.55,100 0.93,0.55,100",
  },
  {
    id: "engines",
    title: "Supported Engines",
    depth: 110,
    aim: "sonar",
    route: "R92,0.48,100 R92,0.52,104 R92,0.5,104",
    routeSm: "0.93,0.45,100 0.93,0.5,100 0.93,0.55,100",
  },
  {
    id: "tour",
    title: "In Action",
    depth: 190,
    aim: "tour",
    route: "R150,0.12,2@0.15 R150,0.1,182@0.45 R150,0.12,182@0.75",
    routeSm: "0.88,0.12,182@0.15 0.88,0.1,182@0.45 0.88,0.12,182@0.75",
  },
  {
    id: "benchmarks",
    title: "Under Pressure",
    depth: 400,
    route: "R92,0.45,100 R92,0.5,100 R92,0.55,100",
    routeSm: "0.93,0.45,100 0.93,0.5,100 0.93,0.55,100",
  },
  {
    id: "features",
    title: "Into the Data",
    depth: 800,
    route: "R92,0.5,100 R92,0.55,100 R92,0.5,100",
    routeSm: "0.93,0.5,100 0.93,0.55,100 0.93,0.5,100",
  },
  {
    id: "themes",
    title: "A Closer Look",
    depth: 1300,
    route: "R92,0.45,104 R150,0.12,184 R150,0.12,184",
    routeSm: "0.93,0.45,100 0.88,0.12,182 0.88,0.12,182",
  },
  {
    id: "install",
    title: "Installation",
    depth: 2400,
    route: "R92,0.42,100@0 R92,0.5,100@0.25 R92,0.5,100@0.4",
    routeSm: "0.93,0.42,100@0 0.93,0.5,100@0.25 0.93,0.5,100@0.4",
  },
  {
    id: "deep",
    title: "The Deep",
    depth: 4200,
    aim: "deep",
    route: "0.5,0.19,100@0 0.5,0.21,100@0.25 0.5,W,100@1",
    routeSm: "0.5,0.18,100@0 0.5,0.2,100@0.25 0.5,W,100@1",
  },
];

const byId = new Map(CHAPTERS.map((c) => [c.id, c]));

/** The data-* attributes a chapter's <section> carries for the expedition controller. */
export function chapterAttrs(id: ChapterId) {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown chapter: ${id}`);
  return {
    id: c.id,
    "data-chapter": "",
    "data-title": c.title,
    "data-depth": String(c.depth),
    "data-route": c.route,
    "data-route-sm": c.routeSm,
    ...(c.aim ? { "data-aim": c.aim } : {}),
  };
}

/** Ocean zone for a narrative depth in metres. */
export const zoneOf = (m: number) =>
  m < 200
    ? "Sunlight zone"
    : m < 1000
      ? "Twilight zone"
      : m < 4000
        ? "Midnight zone"
        : "Abyssal zone";
