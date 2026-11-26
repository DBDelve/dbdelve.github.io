// The tour's notes: one is pressed at a time, and its spot on the screenshot
// lights up (the diver's flashlight turns toward it).
import { announceAim } from "@/lib/lifecycle";

export function initTour(root: ParentNode, signal: AbortSignal) {
  for (const panel of root.querySelectorAll<HTMLElement>("[data-spots]")) {
    const notes = [...panel.querySelectorAll<HTMLButtonElement>("[data-note]")];
    const activate = (id: string) => {
      notes.forEach((n) => n.setAttribute("aria-pressed", String(n.dataset.note === id)));
      panel
        .querySelectorAll<HTMLElement>(".spot")
        .forEach((s) => s.classList.toggle("is-active", s.dataset.spot === id));
      announceAim();
    };
    panel.addEventListener(
      "click",
      (e) => {
        const n =
          e.target instanceof Element ? e.target.closest<HTMLButtonElement>("[data-note]") : null;
        if (n?.dataset.note) activate(n.dataset.note);
      },
      { signal }
    );
    if (notes[0]?.dataset.note) activate(notes[0].dataset.note);
  }
}
