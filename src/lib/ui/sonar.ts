// The engines sonar. Native engines are toggle buttons with the engine's mark:
// every mark starts equal and nothing is selected until the visitor picks one.
// Once picked, exactly one is pressed; the group is a single tab stop and
// arrows, Home and End move the selection. The readout says what the selected
// engine is. ODBC engines stay plain text on the outer ring.
//
// The sweep turns only while the sonar is on screen and motion is allowed;
// contacts brighten as it passes them (driven from the expedition clock).
import { announceAim } from "@/lib/lifecycle";

export function createSonar(sonar: HTMLElement, signal: AbortSignal) {
  const items = [...sonar.querySelectorAll<HTMLElement>("li[data-at]")].map((li) => ({
    li,
    at: Number(li.dataset.at),
    ping: -1,
  }));
  const buttons = [...sonar.querySelectorAll<HTMLButtonElement>("[data-engine]")];
  const readout = sonar.parentElement?.querySelector<HTMLElement>("[data-sonar-readout]") ?? null;

  const select = (btn: HTMLButtonElement, focus = false) => {
    for (const b of buttons) {
      const on = b === btn;
      b.setAttribute("aria-pressed", String(on));
      b.tabIndex = on ? 0 : -1;
    }
    if (focus) btn.focus();
    if (readout) {
      const name = document.createElement("b");
      name.textContent = btn.dataset.engine ?? "";
      readout.replaceChildren(name, ` ${btn.dataset.note ?? ""}`);
    }
    announceAim();
  };

  sonar.addEventListener(
    "click",
    (e) => {
      const b =
        e.target instanceof Element ? e.target.closest<HTMLButtonElement>("[data-engine]") : null;
      if (b) select(b);
    },
    { signal }
  );
  sonar.addEventListener(
    "keydown",
    (e) => {
      const i = buttons.findIndex((b) => b === document.activeElement);
      if (i < 0) return;
      const keys: Record<string, number> = {
        ArrowRight: i + 1,
        ArrowDown: i + 1,
        ArrowLeft: i - 1,
        ArrowUp: i - 1,
        Home: 0,
        End: buttons.length - 1,
      };
      const next = keys[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(buttons[(next + buttons.length) % buttons.length], true);
    },
    { signal }
  );

  let onScreen = false;
  const io = new IntersectionObserver(([e]) => {
    onScreen = e?.isIntersecting ?? false;
  });
  io.observe(sonar);
  signal.addEventListener("abort", () => io.disconnect());

  return {
    update(t: number, reduced: boolean) {
      if (!onScreen || reduced) return;
      const sweep = (((-t * 0.12) % 1) + 1) % 1;
      sonar.style.setProperty("--sweep", `${sweep.toFixed(4)}turn`);
      for (const it of items) {
        const d = (((it.at - sweep) % 1) + 1) % 1;
        const p = Math.round((d < 0.2 ? 1 - d / 0.2 : 0) * 20) / 20;
        if (p !== it.ping) {
          it.ping = p;
          it.li.style.setProperty("--ping", String(p));
        }
      }
    },
  };
}
