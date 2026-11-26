# Agent instructions: dbdelve.github.io

Adapted from the astro-cloudflare-landing-starter conventions. There is no i18n,
analytics, consent or Cloudflare runtime here.

## Stack

Astro 7 (static output), strict TypeScript, Tailwind CSS 4 (Vite plugin), GSAP 3,
pnpm, oxlint and oxfmt. Use the `@/*` alias for `src/*`.

## Rules

- No `any`, no `console.log`. No React or other client framework without a concrete need.
- Component CSS lives in the component's `<style is:global>`, using BEM names
  prefixed by the component (`.sonar__…`, `.dc__…`). Shared tokens and pieces go in
  `src/styles/global.css` (`@theme`). Global is deliberate: runtime state
  (`.js`, `--murk`, `--lit`, `--logo`) crosses component boundaries.
- Behaviour scripts call `mount(init)` from `@/lib/lifecycle`. Pass the given
  `AbortSignal` to every listener, and disconnect observers and kill ScrollTriggers
  when it aborts.
- Stable `data-*` hooks only. Never select on visual classes from scripts.
- Always respect `prefers-reduced-motion` (via `gsap.matchMedia` or CSS). Never ship `markers: true`.
- Never edit `public/assets/dbdelve.svg`. The finale reads it at build time, and
  `tests/logo.test.ts` checks the split is exact.
- Diver routes live in `src/data/chapters.ts`. Run `pnpm test` after changing one:
  the route test bounds the on-screen step and turn per pixel of scroll.
- `public/sponsors/` is written by the sponsors workflow. Don't hand-edit it.

## Before handing off

`pnpm fmt && pnpm lint && pnpm test && pnpm build`
