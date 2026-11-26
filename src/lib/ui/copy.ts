// Copy buttons for install commands, with the result announced in a live region.
export function initCopy(root: HTMLElement, signal: AbortSignal) {
  const status = root.querySelector<HTMLElement>("[data-copy-status]");
  root.addEventListener(
    "click",
    async (e) => {
      const btn =
        e.target instanceof Element ? e.target.closest<HTMLButtonElement>("[data-copy]") : null;
      const text = btn?.parentElement?.querySelector("code")?.textContent;
      if (!btn || text == null) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
        if (status) status.textContent = "Copied the command to the clipboard.";
      } catch {
        if (status) status.textContent = "Copy failed. Select the command and copy it by hand.";
      }
      setTimeout(() => {
        btn.textContent = "Copy";
      }, 1800);
    },
    { signal }
  );
}
