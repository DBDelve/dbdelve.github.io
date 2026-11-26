// Which elements the flashlight is touching. Writes --lit (0..1) on each
// visible [data-lit] element; CSS turns that into opacity changes only.
import type { Beam } from "./state";

export function createLit(root: ParentNode = document) {
  const visible = new Set<HTMLElement>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target;
      if (!(el instanceof HTMLElement)) continue;
      if (e.isIntersecting) visible.add(el);
      else {
        visible.delete(el);
        el.style.setProperty("--lit", "0");
      }
    }
  });
  root.querySelectorAll<HTMLElement>("[data-lit]").forEach((el) => io.observe(el));
  const last = new WeakMap<HTMLElement, number>();

  function update(beam: Beam | null) {
    if (!beam) return;
    const ux = Math.cos(beam.angle);
    const uy = Math.sin(beam.angle);
    for (const el of visible) {
      let v = 0;
      if (beam.intensity > 0) {
        const r = el.getBoundingClientRect();
        // Closest point of the beam's axis to the element's centre…
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const along = Math.max(0, Math.min(beam.length, (cx - beam.x) * ux + (cy - beam.y) * uy));
        const px = beam.x + ux * along;
        const py = beam.y + uy * along;
        // …then how far that point is from the element's box, against the cone's width there.
        const dx = Math.max(r.left - px, 0, px - r.right);
        const dy = Math.max(r.top - py, 0, py - r.bottom);
        const reach = along * Math.tan(beam.half) + 40;
        v =
          beam.intensity *
          Math.max(0, 1 - Math.hypot(dx, dy) / reach) *
          (1 - (along / beam.length) * 0.5);
      }
      const q = Math.round(v * 50) / 50;
      if (last.get(el) !== q) {
        last.set(el, q);
        el.style.setProperty("--lit", String(q));
      }
    }
  }

  return { update, destroy: () => io.disconnect() };
}
