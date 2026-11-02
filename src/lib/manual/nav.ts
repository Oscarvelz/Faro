/**
 * Hint ↔ manual ↔ app navigation glue. Every jump is a real step on the provider's place stack (a history
 * entry), so the phone's back button, Esc and the in-app arrow all walk the same path.
 */

let popAt = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    popAt = Date.now();
  });
}

/** True right after a back/forward step (phone back, history.back, Esc). */
export function justPopped(ms = 1200): boolean {
  return Date.now() - popAt < ms;
}

export function reduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type FocusWant = { topic: string; anchor?: string; fold?: string; lens?: string; at: number };
let pending: FocusWant | null = null;

/** Ask the next screen to open, scroll to and glow one thing. */
export function requestFocus(want: Omit<FocusWant, "at">) {
  pending = { ...want, at: Date.now() };
}

/** The pending focus, taken once (stale after 10 s). */
export function takeFocus(): FocusWant | null {
  const f = pending;
  pending = null;
  if (!f || Date.now() - f.at > 10000) return null;
  return f;
}

/** The element that scrolls the top pane: the split pane's workspace, or the window. */
export function topScroller(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const frame = document.querySelector(".app-frame.is-split");
  if (!frame) return null;
  return frame.querySelector<HTMLElement>(".split-pane:not(.is-lower) .workspace");
}

export function readY(): number {
  const el = topScroller();
  return el ? el.scrollTop : window.scrollY;
}

export function writeY(y: number) {
  const el = topScroller();
  if (el) el.scrollTop = y;
  else window.scrollTo(0, y);
}

/**
 * Glow one element for a moment: a calm ring drawn in a separate fixed layer that follows the element, so the
 * element's own styles, shadows and clipping are never touched. No movement, no scale. Reduced motion: a still
 * ring that simply goes away.
 */
export function glow(el: Element, ms = 2800) {
  const target = el as HTMLElement;
  document.querySelectorAll(".faro-glow-ring").forEach((n) => n.remove());
  document.querySelectorAll("[data-faro-glow]").forEach((n) => n.removeAttribute("data-faro-glow"));
  const ring = document.createElement("i");
  ring.className = "faro-glow-ring";
  ring.setAttribute("aria-hidden", "true");
  const radius = getComputedStyle(target).borderRadius || "12px";
  ring.style.borderRadius = radius === "0px" ? "10px" : radius;
  document.body.appendChild(ring);
  target.setAttribute("data-faro-glow", "1");
  const started = performance.now();
  let raf = 0;
  const place = () => {
    const r = target.getBoundingClientRect();
    ring.style.transform = `translate3d(${(r.left - 3).toFixed(1)}px, ${(r.top - 3).toFixed(1)}px, 0)`;
    ring.style.width = `${r.width + 6}px`;
    ring.style.height = `${r.height + 6}px`;
    if (performance.now() - started < ms && ring.isConnected) raf = requestAnimationFrame(place);
  };
  place();
  window.setTimeout(() => {
    cancelAnimationFrame(raf);
    ring.remove();
    if (target.getAttribute("data-faro-glow")) target.removeAttribute("data-faro-glow");
  }, ms);
}
