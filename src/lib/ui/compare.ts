// The theme comparison: a native range input drives the split.
export function initCompare(root: ParentNode, signal: AbortSignal) {
  for (const box of root.querySelectorAll<HTMLElement>("[data-compare]")) {
    const input = box.querySelector("input");
    if (!input) continue;
    const set = () => {
      box.style.setProperty("--pos", `${input.value}%`);
      input.setAttribute("aria-valuetext", `${input.value}% dark`);
    };
    input.addEventListener("input", set, { signal });
    set();
  }
}
