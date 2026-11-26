import type { ExpeditionState } from "./state";

// The water column, drawn from the camera every frame on one 2D canvas.
//
//   light      sunlight falls off exponentially with depth (Beer–Lambert),
//              arriving from one direction: shafts lean the same way at every
//              depth and caustics drift along it
//   haze       in-scattered light: bright toward the surface, gone in the deep
//   particles  marine snow in far, middle and near layers, each moving at its
//              own share of the camera; flakes inside the torch beam light up
//   deep       bioluminescence that pulses and flares as the diver passes
//   surface    air, a moving waterline with a meniscus, the refracted band
//              under it, and the descent line hanging from the boat
//
// No shaders: a few hundred fills and two blits of a caustic tile per frame.

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;
const SUN = 0.32; // shaft lean: px sideways per px down, toward +x (sun upper left)
const LAYERS = [
  { k: 0.35, size: 0.7, alpha: 0.14, drift: 0.4 }, // far: barely moves, small, faint
  { k: 0.7, size: 1.1, alpha: 0.24, drift: 0.7 },
  { k: 1.0, size: 1.6, alpha: 0.36, drift: 1.0 }, // moves with the content
];

// A tileable caustic pattern: bright where two wave fields" ridges cross.
// Built once; the frame just draws it twice, drifting, with additive blend.
function causticTile(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const f = TAU / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      // Integer wave numbers keep the tile seamless.
      v += Math.sin(x * f * 3 + Math.sin(y * f * 2) * 1.6);
      v += Math.sin(y * f * 4 + Math.sin(x * f * 3) * 1.4);
      v += Math.sin((x + y) * f * 2 + Math.sin((x - y) * f * 3) * 1.2);
      const ridge = Math.pow(1 - Math.abs(Math.sin(v * 1.3)), 6);
      const i = (y * size + x) * 4;
      img.data[i] = 220;
      img.data[i + 1] = 248;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(ridge * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

interface Particle {
  x: number;
  y: number;
  layer: number;
  r: number;
  ph: number;
  sink: number;
  bio: boolean;
  f: number;
}

export function createOcean(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  let w = 0,
    h = 0,
    dpr = 1;
  let parts: Particle[] = [];
  let tile: HTMLCanvasElement | null = null;
  let pattern: CanvasPattern | null = null;
  // Caustics are composed at 1x on their own layer, so their fade can't erase the shafts beneath.
  const caustics = document.createElement("canvas");
  const cctx = caustics.getContext("2d")!;

  function resize(s: ExpeditionState) {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = s.vw;
    h = s.vh;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const n = Math.round(clamp((w * h) / 8000, 60, 200));
    // Seeded so a resize doesn't reshuffle the sea.
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    parts = Array.from({ length: n }, () => ({
      x: rnd(),
      y: rnd(),
      layer: rnd() < 0.45 ? 0 : rnd() < 0.6 ? 1 : 2,
      r: 0.8 + rnd() * 1.4,
      ph: rnd() * TAU,
      sink: 4 + rnd() * 10,
      bio: rnd() < 0.3,
      f: 0.6 + rnd() * 1.6,
    }));
    caustics.width = w;
    caustics.height = h;
    tile ||= causticTile(256);
    pattern = cctx.createPattern(tile, "repeat");
  }

  function render(s: ExpeditionState, diver: { x: number; y: number } | null) {
    const t = s.reduced ? 0 : s.t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const wl = s.waterlineDoc - s.scrollY; // waterline in viewport px (tied to the page)
    const d = Math.max(0, s.depthM);
    const sun = Math.exp(-d / 70); // light left at this depth
    const caust = Math.exp(-d / 22); // caustics need the surface close
    const deep = clamp((d - 500) / 1400, 0, 1);
    const camX = s.camX;

    // ---- haze: light scattered in the water, brightest toward the surface ----
    if (sun > 0.01) {
      const top = Math.max(wl, 0);
      const g = ctx.createLinearGradient(0, top, 0, h);
      g.addColorStop(0, `rgba(150,225,215,${(0.2 * sun).toFixed(3)})`);
      g.addColorStop(0.55, `rgba(90,190,190,${(0.06 * sun).toFixed(3)})`);
      g.addColorStop(1, "rgba(18,122,122,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, top, w, h - top);
    }

    // ---- sun shafts: one direction, swaying slowly, parallax with the camera ----
    if (sun > 0.02) {
      ctx.globalCompositeOperation = "lighter";
      const top = Math.max(wl, 0);
      const len = h * 1.2;
      for (let i = 0; i < 8; i++) {
        const base = (w * (i - 0.6)) / 6.5 - camX * 0.12 - s.cam * SUN * 0.18;
        const x0 =
          (((base % (w * 1.25)) + w * 1.25) % (w * 1.25)) -
          w * 0.2 +
          Math.sin(t * 0.13 + i * 1.7) * 30;
        const width = 26 + (i % 3) * 22;
        const a = (0.045 + (i % 2) * 0.03) * sun * (0.7 + 0.3 * Math.sin(t * 0.35 + i * 2.1));
        const g = ctx.createLinearGradient(0, top, 0, top + len);
        g.addColorStop(0, `rgba(216,241,255,${a.toFixed(3)})`);
        g.addColorStop(1, "rgba(216,241,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0 - width * 0.3, top);
        ctx.lineTo(x0 + width * 0.3, top);
        ctx.lineTo(x0 + len * SUN + width, top + len);
        ctx.lineTo(x0 + len * SUN - width, top + len);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    // ---- caustics: two drifting copies of the tile, faded with distance below the surface ----
    if (caust > 0.03 && pattern) {
      const top = Math.max(wl, 0),
        reach = h * 0.42;
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.globalCompositeOperation = "source-over";
      cctx.clearRect(0, 0, w, h);
      for (const [sc, vx, vy, a] of [
        [1.6, 9, 5, 0.07],
        [2.3, -6, 7, 0.05],
      ] as const) {
        cctx.setTransform(1, 0, 0, 1, 0, 0);
        cctx.globalAlpha = a;
        cctx.translate(
          (t * vx - camX * 0.2) % (256 * sc),
          (t * vy - s.cam * 0.6) % (256 * sc * 0.55)
        );
        cctx.scale(sc, sc * 0.55); // seen at a glancing angle: squashed vertically
        cctx.fillStyle = pattern;
        cctx.fillRect(-256, -256, w / sc + 512, h / (sc * 0.55) + 512);
      }
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.globalAlpha = 1;
      cctx.globalCompositeOperation = "destination-in";
      const fade = cctx.createLinearGradient(0, top, 0, top + reach);
      fade.addColorStop(0, "rgba(0,0,0,1)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      cctx.fillStyle = fade;
      cctx.fillRect(0, 0, w, h);
      cctx.clearRect(0, 0, w, top);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = caust;
      ctx.drawImage(caustics, 0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    // ---- descent line from the boat: a world object, so it scrolls with the page ----
    if (s.line) {
      const y0 = s.line.y - s.scrollY,
        len = h * 2.6;
      if (y0 + len > 0 && y0 < h) {
        const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
        g.addColorStop(0, "rgba(4,22,26,.75)");
        g.addColorStop(0.06, "rgba(4,22,26,.55)");
        g.addColorStop(1, "rgba(4,22,26,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let yy = 0; yy <= len; yy += 12) {
          const sway = Math.sin(t * 0.6 + yy * 0.004) * 5 * (yy / len) + yy * 0.02;
          if (yy) ctx.lineTo(s.line.x + sway, y0 + yy);
          else ctx.moveTo(s.line.x + sway, y0 + yy);
        }
        ctx.stroke();
      }
    }

    // ---- marine snow + bioluminescence ----
    const H = h * 1.4;
    const dx = diver ? diver.x : -999,
      dy = diver ? diver.y : -999;
    const beam = s.beam && s.beam.intensity > 0 ? s.beam : null;
    const bx = beam ? Math.cos(beam.angle) : 0,
      by = beam ? Math.sin(beam.angle) : 0;
    const lit: [number, number, number, number][] = [];
    for (let L = 0; L < 3; L++) {
      const layer = LAYERS[L];
      ctx.fillStyle = `rgba(191,230,255,${(layer.alpha * (0.5 + 0.5 * (1 - sun))).toFixed(3)})`;
      ctx.beginPath();
      const glows: [number, number, number, Particle][] = [];
      for (const p of parts) {
        if (p.layer !== L) continue;
        const y =
          ((((p.y * H - s.cam * layer.k - t * p.sink * layer.drift) % H) + H) % H) - h * 0.2;
        if (y < wl + 4 || y > h + 10) continue;
        const x =
          ((((p.x * w - camX * 0.08 * layer.k) % w) + w) % w) +
          Math.sin(t * 0.3 + p.ph) * 6 * (L + 1);
        const r = p.r * layer.size;
        if (p.bio && deep > 0) {
          glows.push([x, y, r, p]);
          continue;
        }
        // Backscatter: flakes in the torch beam catch the light.
        if (beam) {
          const ax = x - beam.x,
            ay = y - beam.y,
            along = ax * bx + ay * by;
          if (
            along > 0 &&
            along < beam.length &&
            Math.abs(ax * by - ay * bx) < along * Math.tan(beam.half)
          ) {
            lit.push([x, y, r, beam.intensity * (1 - along / beam.length)]);
            continue;
          }
        }
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
      // Bioluminescent ones pulse on their own and flare as the diver passes.
      for (const [x, y, r, p] of glows) {
        const pulse = 0.5 + 0.5 * Math.sin(t * p.f + p.ph);
        const near = Math.max(0, 1 - Math.hypot(x - dx, y - dy) / 200);
        const a = deep * clamp(0.2 + pulse * 0.45 + near * 1.2, 0, 1) * (0.6 + 0.2 * L);
        ctx.fillStyle = `rgba(95,224,208,${(a * 0.14).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, r * 6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(170,255,240,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.2, 0, TAU);
        ctx.fill();
      }
    }
    for (const [x, y, r, a] of lit) {
      ctx.fillStyle = `rgba(235,250,255,${clamp(0.3 + a * 0.6, 0, 0.7).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.3, 0, TAU);
      ctx.fill();
    }

    // ---- air and the moving surface ----
    if (wl > -16) {
      const wave = (x: number) =>
        wl +
        Math.sin(x * 0.011 + t * 1.1) * 3.5 +
        Math.sin(x * 0.029 - t * 0.8) * 1.8 +
        Math.sin(x * 0.0047 + t * 0.4) * 2.2;
      const air = ctx.createLinearGradient(0, 0, 0, wl);
      air.addColorStop(0, "#dff4ef");
      air.addColorStop(1, "#a7ddd6");
      ctx.fillStyle = air;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      for (let x = 0; x <= w + 16; x += 16) ctx.lineTo(x, wave(x));
      ctx.lineTo(w, -1);
      ctx.fill();
      // Seen from just below, the surface is a bright, rippling sheet.
      const band = ctx.createLinearGradient(0, wl, 0, wl + 160);
      band.addColorStop(0, "rgba(210,245,240,.34)");
      band.addColorStop(0.25, "rgba(191,230,255,.12)");
      band.addColorStop(1, "rgba(191,230,255,0)");
      ctx.fillStyle = band;
      ctx.beginPath();
      ctx.moveTo(0, wl + 160);
      for (let x = 0; x <= w + 16; x += 16) ctx.lineTo(x, wave(x));
      ctx.lineTo(w + 16, wl + 160);
      ctx.fill();
      // Meniscus: the bright edge where light bends through the surface.
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= w + 16; x += 16) {
        if (x) ctx.lineTo(x, wave(x));
        else ctx.moveTo(x, wave(x));
      }
      ctx.stroke();
      // Refraction glints: short bright dashes riding the underside of the waves.
      ctx.strokeStyle = "rgba(240,252,255,.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 30; i++) {
        const x = ((i * 97.3 + t * 14) % (w + 80)) - 40;
        const y = wave(x) + 6 + ((i * 37) % 28);
        const len = 10 + (i % 4) * 7;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len / 2, y + Math.sin(t * 1.4 + i) * 2.5, x + len, y);
      }
      ctx.stroke();
    }

    // ---- the dark closing in ----
    if (s.murk > 0.02) {
      const v = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.25,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.75
      );
      v.addColorStop(0, "rgba(1,6,9,0)");
      v.addColorStop(1, `rgba(1,6,9,${(0.6 * s.murk).toFixed(3)})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    }
  }

  return { resize, render };
}
