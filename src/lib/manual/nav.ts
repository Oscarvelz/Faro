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

let unglow: (() => void) | null = null;
/** Removes the "Ir allí" ring now (navigation, lock, a new ring). */
export function clearGlow() { unglow?.(); }

/**
 * Glow one element: a calm ring drawn in a separate fixed layer that follows the element, so the element's own
 * styles, shadows and clipping are never touched. No movement, no scale.
 * `stay` ("Ir allí"): after its entrance the ring stays steady while the user reads. It goes on the first tap,
 * scroll, Back or screen change; while a (?) bubble or help card is open it waits for that to close. Cap: 60 s.
 * Without `stay` (inside the manual) it fades after `ms`. Only one ring exists at a time.
 */
export function glow(el: Element, ms = 2800, stay = false) {
  const target = el as HTMLElement;
  unglow?.();
  document.querySelectorAll(".faro-glow-ring").forEach((n) => n.remove());
  document.querySelectorAll("[data-faro-glow]").forEach((n) => n.removeAttribute("data-faro-glow"));
  const ring = document.createElement("i");
  ring.className = stay ? "faro-glow-ring is-stay" : "faro-glow-ring";
  ring.setAttribute("aria-hidden", "true");
  const radius = getComputedStyle(target).borderRadius || "12px";
  ring.style.borderRadius = radius === "0px" ? "10px" : radius;
  document.body.appendChild(ring);
  target.setAttribute("data-faro-glow", "1");
  const life = stay ? 60000 : ms;
  const started = performance.now();
  const helpOpen = () => !!document.querySelector(".hint-pop, .ftip-pop, .xp-scrim");
  let raf = 0, waiting = false, done = false, armed = false;
  const off: (() => void)[] = [];
  const end = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    off.forEach((f) => f());
    ring.remove();
    if (target.getAttribute("data-faro-glow")) target.removeAttribute("data-faro-glow");
    if (unglow === end) unglow = null;
  };
  unglow = end;
  const place = () => {
    if (done) return;
    if (!ring.isConnected || !target.isConnected || performance.now() - started >= life) { end(); return; }
    if (stay && helpOpen()) waiting = true;
    else if (waiting) { end(); return; }
    const r = target.getBoundingClientRect();
    if (stay && r.width === 0 && r.height === 0) { end(); return; }
    ring.style.transform = `translate3d(${(r.left - 3).toFixed(1)}px, ${(r.top - 3).toFixed(1)}px, 0)`;
    ring.style.width = `${r.width + 6}px`;
    ring.style.height = `${r.height + 6}px`;
    raf = requestAnimationFrame(place);
  };
  place();
  if (!stay) { window.setTimeout(end, ms); return; }
  // A tap that opens this spot's (?) keeps the ring (decided a moment later, once the bubble is up).
  const onTap = () => { if (!armed || done) return; window.setTimeout(() => { if (!done && !helpOpen()) end(); }, 260); };
  const onScroll = () => { if (armed && !done && !helpOpen() && !waiting) end(); };
  const add = (t: EventTarget, type: string, fn: () => void, opts?: AddEventListenerOptions) => { t.addEventListener(type, fn, opts); off.push(() => t.removeEventListener(type, fn, opts)); };
  add(window, "pointerdown", onTap, { capture: true, passive: true });
  add(window, "keydown", onTap, { capture: true });
  add(window, "scroll", onScroll, { capture: true, passive: true });
  add(window, "wheel", onScroll, { passive: true });
  add(window, "popstate", end);
  add(window, "hashchange", end);
  add(window, "faro-glow-clear", end);
  // The jump's own scroll has settled before glow() runs; arm the dismissers a beat later.
  const t = window.setTimeout(() => { armed = true; }, 450);
  off.push(() => window.clearTimeout(t));
}
