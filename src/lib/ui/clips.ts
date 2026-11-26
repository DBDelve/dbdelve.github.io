// The README's two screen recordings: muted loops that play only while on
// screen, and never on their own when the visitor asked for reduced motion
// (the controls are always there). A pause by the visitor sticks.
export function initClips(root: ParentNode, signal: AbortSignal) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const clips = [...root.querySelectorAll<HTMLVideoElement>("[data-clip]")];
  const held = new WeakSet<HTMLVideoElement>(); // paused by the visitor
  const auto = new WeakSet<HTMLVideoElement>(); // pauses this code made
  const pause = (v: HTMLVideoElement) => {
    if (!v.paused) {
      auto.add(v);
      v.pause();
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const { target: v, isIntersecting } of entries) {
        if (!(v instanceof HTMLVideoElement)) continue;
        if (!isIntersecting) pause(v);
        else if (!motion.matches && !held.has(v)) v.play().catch(() => {});
      }
    },
    { threshold: 0.5 }
  );
  for (const v of clips) {
    v.addEventListener("pause", () => (auto.has(v) ? auto.delete(v) : held.add(v)), { signal });
    v.addEventListener("play", () => held.delete(v), { signal });
    io.observe(v);
  }
  motion.addEventListener("change", () => motion.matches && clips.forEach(pause), { signal });
  signal.addEventListener("abort", () => io.disconnect());
}
