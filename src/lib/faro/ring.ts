/**
 * Swipe rings (1.3.94): Libros walks its ten books, Central its six choices (Tengo · Gastaré · Pagos · Meta · Retiro ·
 * Emergencia), each as one loop. A step taken by a finger marks the moment, so the content that mounts next slides in
 * (`.is-ring`) and a tap never does.
 */
let mark = 0;
export function markRing() { mark = Date.now(); }
export function ringFresh(ms = 600) { return Date.now() - mark < ms; }

/** The row's choice answers once in its own style. */
export function ringLit(el: Element | null | undefined) {
  if (!el) return;
  el.classList.remove("ring-lit");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("ring-lit");
  window.setTimeout(() => el.classList.remove("ring-lit"), 760);
}

/** Bring a landed row or panel into view (below the sticky top chrome) when it is off screen. */
export function ringShow(el: HTMLElement | null | undefined) {
  if (!el) return;
  const chrome = document.querySelector<HTMLElement>(".top-chrome")?.getBoundingClientRect().bottom ?? 0;
  const r = el.getBoundingClientRect();
  if (r.top < chrome + 4 || r.top > window.innerHeight - 120) {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top - chrome - 12), behavior: smooth ? "smooth" : "auto" });
  }
}
