# dbdelve.github.io

The website for [DBDelve](https://github.com/ShayanAbbas1/dbdelve): a static-first
Astro site. Scrolling the page is a dive. The diver from the DBDelve logo swims down
past each chapter and settles back into the logo at the end.

## Develop

Requires Node.js 24.18+ and pnpm 12.

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # astro check + static build into dist/
pnpm preview      # serve dist/ locally
pnpm test         # route, travel-direction and logo-layer tests (node:test)
pnpm lint         # oxlint, type-aware
pnpm fmt          # oxfmt
```

`dist/` is plain static files and needs no server runtime. It can be published to
GitHub Pages through a Pages Actions workflow, or to Cloudflare Workers Static Assets.
Neither is configured here. `public/.nojekyll` keeps Pages from dropping `_astro/`.

## Layout

| Path                                           | What it is                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/pages/index.astro`                        | The page: environment layers, dive computer, nine chapters                    |
| `src/components/sections/`                     | One component per chapter (Surface … Deep)                                    |
| `src/components/ocean/`                        | Water canvas, rigged diver, boat                                              |
| `src/components/expedition/DiveComputer.astro` | Depth readout and expedition profile                                          |
| `src/components/brand/LogoReveal.astro`        | The finale: `dbdelve.svg`, split into layers                                  |
| `src/data/`                                    | Chapters (depths, diver routes), engines, benchmarks, tour, sponsors, links   |
| `src/lib/expedition/`                          | Motion: controller, camera, route, travel, diver, ocean, light, dive computer |
| `src/lib/ui/`                                  | Tabs, tour notes, sonar, theme compare, copy buttons, clips                   |
| `public/assets/`                               | Logo, icon and social card at their existing URLs                             |
| `public/sponsors/`                             | Written daily by `.github/workflows/sponsors.yml` (sponsorkit)                |

## Motion

`src/lib/expedition/controller.ts` runs one clock (`gsap.ticker`) over one frame
state. Its concepts stay separate:

- **Scroll** is what the visitor sees. On pointer devices GSAP's ScrollSmoother eases the page content (`smooth.ts`); the scrollbar, keyboard and touch scrolling stay native.
- **Camera** follows the smoothed content exactly. Where nothing smooths (touch), it eases the scroll with a 180 ms time constant, never more than 0.22 viewports behind (`camera.ts`).
- **Depth and chapter** are narrative metres derived from the camera.
- **Route** is the diver's trajectory, a pure function of the camera: monotone cubic through authored keyframes, so it never overshoots and reverses exactly (`route.ts`).
- **Orientation** is the authored heading, re-pitched by travel direction. Direction changes use hysteresis, a commit distance and a hold time (`travel.ts`).
- **Body** covers kicks, breathing, buoyancy, the torch arm and bubbles. They run on local time and never move the diver (`diver.ts`).
- **Environment** covers light, caustics, haze, particles and bioluminescence, all driven by depth (`ocean.ts`).
- **Finale** is a pure function of the camera. The diver blends into the logo's diver pose, which is mapped through the logo SVG's own transform.

A single page-spanning ScrollTrigger supplies scroll updates and layout refreshes.
`gsap.matchMedia` switches reduced motion, smoothing and the small-screen routes. With
reduced motion there is no smoothing, the clock stops, the camera equals the scroll and
each frame is drawn on demand.

MotionPathPlugin was evaluated and not used. The route's heading is authored rather
than taken from the path tangent (`autoRotate`), so a reversed scroll can never flip
the diver. Lenis was not added: ScrollSmoother ships with the GSAP already installed.
While it runs, `smooth.ts` routes in-page links through it, pins what CSS makes sticky
and hands find-in-page scrolls back to the page.

## Credits and licenses

- Site code: MIT (`LICENSE`). The tooling configuration (oxlint, oxfmt, syncpack, editor),
  the SEO helper and the lifecycle conventions are adapted from
  [astro-cloudflare-landing-starter](https://github.com/adcuelloa/astro-cloudflare-landing-starter) (MIT).
- GSAP is used under the [GSAP Standard "no charge" license](https://gsap.com/standard-license).
- IBM Plex Sans and Lilex are self-hosted through Fontsource (SIL Open Font License).
- Engine marks in `src/assets/engines/` come from the icon sets the client itself draws:
  Simple Icons (CC0) and Lucide `server` (ISC). They are trademarks of their owners and are
  used only to name the engines.
- Screenshots and recordings are of the real app, from the DBDelve README.
