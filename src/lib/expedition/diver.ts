// The diver from the DBDelve logo, rigged (markup: components/ocean/Diver.astro).
// Geometry is the logo's own, with each leg split at the knee so hip, knee and
// fin can bend. Local +x is where the head points.
//
// Where the diver is comes from the route, sampled at the camera: the same
// scroll always puts it in the same place. Which way the body points is
// separate: the route authors a heading, and travel.ts says whether the diver
// is descending, ascending or hovering. Steep headings lead with the head in
// the direction of sustained travel (head down going down, head up going up,
// near level when stopped); shallow, exploring headings stay as authored. In
// the finale the body blends into the exact logo pose. This module also adds
// what a body does on its own: kicks, breathing, a buoyant bob, the
// flashlight arm, bubbles, and in the deep the plankton its fins disturb.
import type { RoutePose } from "./route";
import type { Beam, ExpeditionState } from "./state";
import { createTravel } from "./travel";

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const angDiff = (a: number, b: number) => ((((a - b) % TAU) + TAU * 1.5) % TAU) - Math.PI;
const lerpAngle = (a: number, b: number, t: number) => a + angDiff(b, a) * t;
const smooth = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
/** Seconds per breath: faster with effort. */
const breathCycle = (effort: number) => 4.2 - effort * 1.8;
const ARM_BASE = Math.atan2(41, 113); // the logo arm's own angle, shoulder (-40,6) to hand (73,47)
/** The body turns about its hips (near the centre of mass), not the head. */
export const PIVOT = -150;
const FRONT = 105 - PIVOT;
const BACK = 430 + PIVOT; // rig extents ahead of / behind the pivot
/** The logo's diver group: translate(497.3 393.4) rotate(40) scale(0.82). */
export const LOGO_POSE = { x: 497.3, y: 393.4, angle: (40 * Math.PI) / 180, scale: 0.82 } as const;

export const LEGS = {
  a: {
    hip: [-205, 12],
    knee: [-268, -3],
    ankle: [-330, -18],
    fin: "M-330 -18 L-430 -58 L-418 -10 Z",
  },
  b: { hip: [-205, 26], knee: [-263, 37], ankle: [-322, 48], fin: "M-322 48 L-428 58 L-404 96 Z" },
} as const;

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
  ph: number;
  wf: number;
  wa: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
  life: number;
}

/** Where the finale wants the diver: viewport px of the pivot, and the rig scale. */
export interface FinaleTarget {
  x: number;
  y: number;
  scale: number;
}

export function createDiver(svg: SVGSVGElement, fx: HTMLCanvasElement) {
  const q = <T extends Element>(sel: string) => {
    const el = svg.querySelector<T>(sel);
    if (!el) throw new Error(`Diver rig is missing ${sel}`);
    return el;
  };
  const el = {
    root: q<SVGGElement>("[data-root]"),
    arm: q<SVGGElement>("[data-arm]"),
    far: q<SVGGElement>("[data-far]"),
    visor: q<SVGPathElement>("[data-visor]"),
    hip: { a: q<SVGGElement>("[data-hip=a]"), b: q<SVGGElement>("[data-hip=b]") },
    knee: { a: q<SVGGElement>("[data-knee=a]"), b: q<SVGGElement>("[data-knee=b]") },
    ankle: { a: q<SVGGElement>("[data-ankle=a]"), b: q<SVGGElement>("[data-ankle=b]") },
  };
  const ctx = fx.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  const travel = createTravel();
  let dpr = 1;
  let vw = 0;
  let vh = 0;
  let swimScale = 0.27;
  let scale = 0.27;
  let x = -200;
  let y = -200;
  let heading = Math.PI;
  let facing = -1;
  let roll = -1; // the side the back faces: ±1 with hysteresis, so the roll can't stall edge-on
  let phase = 0;
  let arm = 0.15;
  let armSet = false;
  let headSm: number | null = null;
  let breath = 0;
  let emit = 0;
  let effortSm = 0;
  let sparkEmit = 0;
  const bubbles: Bubble[] = [];
  const sparks: Spark[] = [];

  function resize(s: ExpeditionState) {
    vw = s.vw;
    vh = s.vh;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    fx.width = Math.round(vw * dpr);
    fx.height = Math.round(vh * dpr);
    swimScale = vw < 640 ? 0.15 : vw < 960 ? 0.2 : 0.27;
  }

  /** Local rig point -> viewport px, given the current arm angle. */
  function toWorld(lx0: number, ly0: number, withArm = false): [number, number] {
    let lx = lx0;
    let ly = ly0;
    if (withArm) {
      const c = Math.cos(arm);
      const sn = Math.sin(arm);
      const px = lx + 40;
      const py = ly - 6;
      lx = px * c - py * sn - 40;
      ly = px * sn + py * c + 6;
    }
    lx = (lx - PIVOT) * scale;
    ly *= scale * facing;
    const c = Math.cos(heading);
    const sn = Math.sin(heading);
    return [x + lx * c - ly * sn, y + lx * sn + ly * c];
  }

  // How level the diver may hover here: as level as the lane allows. In the
  // lane right of the content a level body would poke into the text, so a
  // narrow lane keeps it more upright.
  function hoverPitch(s: ExpeditionState, side: number) {
    if (!s.contentRight || x < s.contentRight) return 0.3;
    const sc = swimScale;
    const ahead = side < 0 ? x - s.contentRight - 8 : vw - x - 4;
    const behind = side < 0 ? vw - x - 4 : x - s.contentRight - 8;
    const c = clamp(Math.min(ahead / (FRONT * sc), behind / (BACK * sc)), 0, 1);
    return clamp(Math.acos(c), 0.26, 1.1);
  }

  function update(
    s: ExpeditionState,
    pose: RoutePose,
    aim: { x: number; y: number } | null,
    target: FinaleTarget | null
  ): Beam {
    const dt = s.dt;
    const e = target ? s.finale : 0;
    const k = e * e * (3 - 2 * e); // settle: eased, and exactly 1 at the end
    x = lerp(pose.x * vw, target?.x ?? 0, k);
    y = lerp(pose.y * vh, target?.y ?? 0, k);
    scale = lerp(swimScale, target?.scale ?? swimScale, k);

    // ---- orientation: authored heading, re-pitched by travel ----
    const h = pose.h;
    const side = Math.cos(h) >= 0 ? 1 : -1;
    const pa = angDiff(side > 0 ? h : Math.PI - h, 0); // pitch below level
    const steep = clamp((Math.abs(pa) - 0.52) / 0.6, 0, 1); // 30°..64°: exploring -> travelling
    const hp = hoverPitch(s, side);
    const tr =
      s.reduced || (dt === 0 && headSm === null)
        ? travel.snap()
        : travel.step(
            dt > 0 ? (s.velocity * dt) / vh : 0,
            dt,
            clamp(hp / Math.max(Math.abs(pa), 0.3), 0, 1)
          );
    s.dir = tr.dir;
    const travelPitch = Math.abs(pa) * tr.tau;
    const pitch = s.reduced ? pa : lerp(pa, travelPitch, steep);
    const want = side > 0 ? pitch : Math.PI - pitch;
    // A light filter on the final angle: rounds off the instant an authored heading crosses vertical.
    headSm =
      headSm === null || s.reduced || dt === 0
        ? want
        : headSm + angDiff(want, headSm) * smooth(12, dt);
    heading = lerpAngle(headSm, LOGO_POSE.angle, k);

    // Roll: the back stays up whichever way the diver faces. The side flips
    // only once the heading is clearly past vertical (hysteresis), then the
    // body rolls over quickly in time rather than in scroll, so stopping
    // mid-turn never leaves it edge-on.
    const c = Math.cos(heading);
    if (c > 0.1) roll = 1;
    else if (c < -0.1) roll = -1;
    facing = s.reduced || dt === 0 ? roll : facing + (roll - facing) * smooth(14, dt);
    if (k > 0) facing = lerp(facing, 1, k);

    // Effort: how fast the camera travels (viewports/s), plus the work of turning.
    const speed = Math.abs(s.velocity) / vh;
    const turning = Math.abs(tr.tauV) * 0.35 * steep;
    const wantEffort = clamp(Math.max(speed / 1.2, turning), 0, 1);
    effortSm += (wantEffort - effortSm) * smooth(effortSm < wantEffort ? 6 : 2.5, dt || 1);
    const effort = s.reduced ? 0 : effortSm * (1 - k);

    // Flashlight arm: aim if there's something to aim at, else forward and a little down.
    let wantArm = 0.15;
    if (aim) {
      const [sx, sy] = toWorld(-40, 6);
      wantArm = clamp(
        angDiff(Math.atan2(aim.y - sy, aim.x - sx), heading) * Math.sign(facing) - ARM_BASE,
        -1.1,
        0.9
      );
    }
    arm = s.reduced || !armSet ? wantArm : arm + angDiff(wantArm, arm) * smooth(4, dt);
    armSet = true;
    const armShown = lerp(arm, 0, k); // the logo's arm is the rig's rest angle

    // Flutter kick from the hips: the legs alternate, the knee bends (only
    // backwards) a beat after the hip, and the fin whips a beat after that.
    // Idle sculling never stops entirely, so a hovering diver still looks alive.
    if (!s.reduced) phase += TAU * (0.5 + effort * 2.1) * dt;
    const amp = (s.reduced ? 0.05 : 0.07 + effort * 0.34) * (1 - k);
    for (const [id, off] of [
      ["a", 0],
      ["b", Math.PI],
    ] as const) {
      const L = LEGS[id];
      const p = phase + off;
      const hip = amp * Math.sin(p);
      const knee = amp * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p - 1.0)));
      const fin = -amp * 1.15 * Math.sin(p - 1.9);
      el.hip[id].setAttribute("transform", `rotate(${(hip * DEG).toFixed(2)} ${L.hip.join(" ")})`);
      el.knee[id].setAttribute(
        "transform",
        `rotate(${(knee * DEG).toFixed(2)} ${L.knee.join(" ")})`
      );
      el.ankle[id].setAttribute(
        "transform",
        `rotate(${(fin * DEG).toFixed(2)} ${L.ankle.join(" ")})`
      );
    }
    el.arm.setAttribute("transform", `rotate(${(armShown * DEG).toFixed(2)} -40 6)`);
    el.far.setAttribute("opacity", (0.86 + 0.14 * k).toFixed(3));
    el.visor.setAttribute("opacity", (1 - k).toFixed(3));

    // Neutral buoyancy: rise a little on each inhale, settle on the exhale.
    // At the surface the swell carries the diver instead.
    const t = s.reduced ? 0 : s.t;
    const atSurface = clamp(1 - (s.depthM - 2) / 10, 0, 1);
    const hover = s.reduced ? 0 : 1 - effort;
    const lungs = Math.sin((breath / breathCycle(effort)) * TAU);
    const calm = 1 - k;
    const bobY =
      (lungs * 3.2 * hover * (1 - atSurface) +
        (Math.sin(t * 1.1) * 3.5 + Math.sin(t * 0.47 + 1) * 2) * atSurface * (s.reduced ? 0 : 1)) *
      calm;
    const wobble =
      ((Math.sin(t * 0.8) * 2.2 * hover +
        Math.sin(phase * 2) * 1.1 * effort +
        Math.sin(t * 1.1 + 0.6) * 4 * atSurface) /
        DEG) *
      calm;
    el.root.setAttribute(
      "transform",
      `translate(${x.toFixed(2)} ${(y + bobY).toFixed(2)}) rotate(${((heading + wobble) * DEG).toFixed(3)}) scale(${scale.toFixed(4)} ${(scale * facing).toFixed(4)}) translate(${-PIVOT} 0)`
    );

    // ---- fx: bubbles, disturbed plankton, beam ----
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, vw, vh);
    const underwater = y + s.cam > s.waterlineDoc + 12;
    if (!s.reduced && dt > 0) {
      stepBubbles(s, dt, underwater && k < 0.8, effort);
      stepSparks(s, dt, effort);
    }
    drawBubbles();
    drawSparks(s);

    const intensity = clamp((s.depthM - 25) / 120, 0, 1) * (1 - clamp((k - 0.55) / 0.4, 0, 1));
    const [ox, oy] = toWorld(105, 54, true);
    const angle = heading + Math.sign(facing) * (ARM_BASE + arm);
    const beam: Beam = {
      x: ox,
      y: oy,
      angle,
      length: Math.min(vh * 0.95, 680),
      half: 0.21,
      intensity,
    };
    if (intensity > 0) drawBeam(beam);
    return beam;
  }

  // Bubbles live in screen space and always rise on screen. The water's
  // movement carries them (scrolling down, the world and the bubbles stream
  // up), but scrolling up never pushes them down: a visitor sees bubbles go
  // up from the regulator whichever way they scroll.
  function stepBubbles(s: ExpeditionState, dt: number, underwater: boolean, effort: number) {
    breath += dt;
    if (breath > breathCycle(effort)) breath = 0;
    if (underwater && breath < 0.6) {
      emit -= dt;
      if (emit <= 0 && bubbles.length < 70) {
        emit = 0.05 + Math.random() * 0.07;
        const [bx, by] = toWorld(44, -34);
        bubbles.push({
          x: bx,
          y: by,
          vx: (Math.random() - 0.5) * 20,
          vy: -20,
          r: 1.5 + Math.random() * Math.random() * 6 * (scale / 0.27),
          age: 0,
          ph: Math.random() * TAU,
          wf: 3 + Math.random() * 4,
          wa: 10 + Math.random() * 18,
        });
      }
    }
    const world = -s.velocity * dt * 0.85; // screen shift of the water this frame
    const surface = s.waterlineDoc - s.cam;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.age += dt;
      b.vy += (-90 - b.r * 12) * dt; // buoyancy, bigger rises faster
      b.vy = Math.max(b.vy, -(50 + b.r * 22)); // terminal velocity
      b.vx *= 1 - 1.5 * dt; // drag
      b.x += (b.vx + Math.sin(b.age * b.wf + b.ph) * b.wa) * dt;
      b.y = Math.min(b.y + b.vy * dt + world, b.y - 18 * dt);
      if (b.y < surface || b.age > 9 || b.y < -20) bubbles.splice(i, 1);
    }
  }

  // Below the twilight zone each fin stroke wakes a few glowing plankton,
  // left behind in the water (document space) to fade.
  function stepSparks(s: ExpeditionState, dt: number, effort: number) {
    const deep = clamp((s.depthM - 700) / 900, 0, 1);
    sparkEmit -= dt * deep * (0.4 + effort * 3);
    if (sparkEmit <= 0 && deep > 0 && sparks.length < 60) {
      sparkEmit = 0.12;
      const [fx0, fy0] = toWorld(-420 + Math.random() * 60, -40 + Math.random() * 120);
      sparks.push({
        x: fx0,
        y: fy0 + s.cam,
        age: 0,
        life: 1.2 + Math.random() * 1.4,
        r: 0.8 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
      });
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt;
      p.vy *= 1 - dt;
      if (p.age > p.life) sparks.splice(i, 1);
    }
  }

  function drawSparks(s: ExpeditionState) {
    for (const p of sparks) {
      const kk = 1 - p.age / p.life;
      const sy = p.y - s.cam;
      const a = kk * kk * Math.min(1, p.age * 8);
      ctx!.fillStyle = `rgba(95,224,208,${(a * 0.22).toFixed(3)})`;
      ctx!.beginPath();
      ctx!.arc(p.x, sy, p.r * 5, 0, TAU);
      ctx!.fill();
      ctx!.fillStyle = `rgba(190,255,244,${a.toFixed(3)})`;
      ctx!.beginPath();
      ctx!.arc(p.x, sy, p.r, 0, TAU);
      ctx!.fill();
    }
  }

  function drawBubbles() {
    ctx!.lineWidth = 1.2;
    ctx!.strokeStyle = "rgba(191,230,255,.6)";
    ctx!.fillStyle = "rgba(230,248,255,.55)";
    for (const b of bubbles) {
      const r = b.r * (1 + b.age * 0.06);
      if (b.y > vh + 20) continue;
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, r, 0, TAU);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.arc(b.x - r * 0.35, b.y - r * 0.35, r * 0.25, 0, TAU);
      ctx!.fill();
    }
  }

  function drawBeam(b: Beam) {
    const g0 = ctx!;
    g0.save();
    g0.translate(b.x, b.y);
    g0.rotate(b.angle);
    const L = b.length;
    const spread = Math.tan(b.half) * L;
    const g = g0.createRadialGradient(0, 0, 0, 0, 0, L);
    g.addColorStop(0, `rgba(216,241,255,${0.5 * b.intensity})`);
    g.addColorStop(0.3, `rgba(216,241,255,${0.16 * b.intensity})`);
    g.addColorStop(1, "rgba(143,211,255,0)");
    g0.fillStyle = g;
    g0.beginPath();
    g0.moveTo(0, -5);
    g0.lineTo(L, -spread);
    g0.quadraticCurveTo(L * 1.06, 0, L, spread);
    g0.lineTo(0, 5);
    g0.fill();
    const glow = g0.createRadialGradient(0, 0, 0, 0, 0, 26);
    glow.addColorStop(0, `rgba(235,250,255,${0.85 * b.intensity})`);
    glow.addColorStop(1, "rgba(235,250,255,0)");
    g0.fillStyle = glow;
    g0.beginPath();
    g0.arc(0, 0, 26, 0, TAU);
    g0.fill();
    g0.restore();
  }

  /** For validation: the diver's current place and orientation. */
  const snapshot = () => ({
    x,
    y,
    heading,
    facing,
    scale,
    tau: travel.state.tau,
    dir: travel.state.dir,
  });

  return { resize, update, position: () => ({ x, y }), snapshot };
}
