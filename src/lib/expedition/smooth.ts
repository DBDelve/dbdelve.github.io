// Wheel smoothing for pointer devices. ScrollSmoother eases the page content
// with a transform while the document keeps its native scroll position, so the
// scrollbar, keyboard and ScrollTrigger all still work on the real scroll.
// Touch devices and reduced motion keep plain native scrolling.
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

export const SMOOTH = 0.9; // s for the content to catch up with the scrollbar

export interface Smooth {
  /** The content's visual scroll offset, px: what the visitor sees, smoothed or not. */
  y(): number;
  active(): boolean;
  /** Starts smoothing and returns the function that stops it. */
  start(): () => void;
}

export function createSmooth(signal: AbortSignal): Smooth {
  const wrapper = document.querySelector<HTMLElement>("[data-smooth-wrapper]");
  const content = document.querySelector<HTMLElement>("[data-smooth-content]");
  let smoother: ReturnType<typeof ScrollSmoother.create> | null = null;
  // The smoother scrolls focused elements into view; not the one a link just scrolled to.
  let linkFocus = false;

  // The wrapper is a clipped box while smoothing, so a native fragment jump would
  // scroll it instead of the page. Route in-page links through the smoother.
  document.addEventListener(
    "click",
    (e) => {
      if (!smoother || !content || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a =
        e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const target =
        a && a.hash.length > 1
          ? document.getElementById(decodeURIComponent(a.hash.slice(1)))
          : null;
      if (!a || !target) return;
      e.preventDefault();
      // 32px: the page's scroll-padding-top. Rects are visual, so add the content's offset.
      const top = target.getBoundingClientRect().top - content.getBoundingClientRect().top;
      smoother.scrollTo(top - 32, true);
      history.pushState(null, "", a.hash);
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      linkFocus = true;
      target.focus({ preventScroll: true });
      linkFocus = false;
    },
    { signal }
  );

  // Find-in-page and scrollIntoView scroll the clipped wrapper, not the page.
  // Hand that offset to the real scroll so the content and the scrollbar agree.
  wrapper?.addEventListener(
    "scroll",
    () => {
      if (!smoother || !wrapper.scrollTop) return;
      const y = smoother.scrollTop() + wrapper.scrollTop;
      wrapper.scrollTop = 0;
      smoother.scrollTop(y);
    },
    { signal }
  );

  return {
    y: () => (content ? -content.getBoundingClientRect().top : scrollY),
    active: () => smoother !== null,
    start() {
      if (!wrapper || !content) return () => {};
      // The smoother drives the native scroll itself; CSS smoothing would ease it twice.
      document.documentElement.style.scrollBehavior = "auto";
      smoother = ScrollSmoother.create({
        wrapper,
        content,
        smooth: SMOOTH,
        smoothTouch: false,
        onFocusIn: () => !linkFocus,
      });
      // position: sticky has no scrolling ancestor inside the transformed content,
      // so [data-smooth-pin] elements that CSS makes sticky are pinned instead.
      const pins = [...document.querySelectorAll<HTMLElement>("[data-smooth-pin]")].flatMap(
        (el) => {
          const cs = getComputedStyle(el);
          const box = el.parentElement;
          if (cs.position !== "sticky" || !box) return [];
          const top = parseFloat(cs.top) || 0;
          el.style.position = "relative";
          return ScrollTrigger.create({
            trigger: el,
            onKill: () => el.style.removeProperty("position"),
            pin: true,
            pinSpacing: false,
            start: `top ${top}px`,
            // Sticky stops where the element's bottom meets its box's content edge.
            end: () => {
              const bottom =
                box.getBoundingClientRect().bottom -
                parseFloat(getComputedStyle(box).paddingBottom);
              return `+=${Math.max(0, bottom - el.getBoundingClientRect().bottom)}`;
            },
            invalidateOnRefresh: true,
          });
        }
      );
      ScrollTrigger.refresh();
      return () => {
        pins.forEach((p) => p.kill());
        smoother?.kill();
        smoother = null;
        document.documentElement.style.removeProperty("scroll-behavior");
      };
    },
  };
}
