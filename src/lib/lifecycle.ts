// Starts a page behaviour and tears it down cleanly. Each init gets an
// AbortSignal: pass it to every addEventListener and abort-listen to it to
// disconnect observers, so one abort removes everything.
//
// Without <ClientRouter /> this runs once per page load. If view transitions
// are added later, astro:page-load re-inits and astro:before-swap tears down,
// following the starter's lifecycle rules; init is idempotent either way.
export type Teardown = void | (() => void);

export function mount(init: (signal: AbortSignal) => Teardown): void {
  let controller: AbortController | null = null;
  let extra: Teardown;

  const stop = () => {
    controller?.abort();
    if (typeof extra === "function") extra();
    controller = null;
    extra = undefined;
  };
  const start = () => {
    stop();
    controller = new AbortController();
    extra = init(controller.signal);
  };

  document.addEventListener("astro:page-load", start);
  document.addEventListener("astro:before-swap", stop);
  start();
}

/** Ask the expedition to redraw because something it aims at moved. */
export const announceAim = () => document.dispatchEvent(new CustomEvent("dbdelve:aim"));
