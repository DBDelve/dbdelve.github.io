// ARIA tabs: arrow keys, Home and End move between tabs; the platform tabs
// open on the visitor's own platform.
import { announceAim } from "@/lib/lifecycle";

export function initTabs(root: ParentNode, signal: AbortSignal) {
  for (const box of root.querySelectorAll<HTMLElement>("[data-tabs]")) {
    const tabs = [...box.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const select = (tab: HTMLButtonElement, focus = false) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls") ?? "");
        if (panel) panel.hidden = !on;
      }
      if (focus) tab.focus();
      announceAim();
    };
    box.addEventListener(
      "click",
      (e) => {
        const t =
          e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[role="tab"]') : null;
        if (t) select(t);
      },
      { signal }
    );
    box.querySelector<HTMLElement>('[role="tablist"]')?.addEventListener(
      "keydown",
      (ev) => {
        const i = tabs.findIndex((t) => t === document.activeElement);
        const keys: Record<string, number> = {
          ArrowRight: i + 1,
          ArrowLeft: i - 1,
          Home: 0,
          End: tabs.length - 1,
        };
        const next = keys[ev.key];
        if (next === undefined || i < 0) return;
        ev.preventDefault();
        select(tabs[(next + tabs.length) % tabs.length], true);
      },
      { signal }
    );
    if (box.hasAttribute("data-platform-tabs")) {
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
      const p = (nav.userAgentData?.platform || navigator.userAgent).toLowerCase();
      const want = /mac/.test(p)
        ? "mac"
        : /win/.test(p)
          ? "win"
          : /linux|x11/.test(p)
            ? "linux"
            : null;
      const tab = tabs.find((t) => t.dataset.platform === want);
      if (tab) select(tab);
    }
  }
}
