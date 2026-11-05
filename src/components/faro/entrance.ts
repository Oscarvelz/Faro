/**
 * 1.3.98 screen entrance: when a screen opens (Ajustes, Central, Libros, Estudio, Asesor, Back to one of them),
 * its first visible panels arrive one after another — Tron: the card "rez" with its corner brackets drawing in;
 * day/dark themes: a soft rise-fade. Each panel gets `data-enter` and `--enter-i` (its place in the stagger).
 * Never inside a pane swapped by a tab tap or ring step (`.is-swap`, `.is-ring`: the 1.3.97 no-empty-frame rule),
 * never under reduced motion. Overlays only: transform/opacity/clip, no layout change.
 */
import { useLayoutEffect, type RefObject } from "react";

const BLOCKS = ".card, .ridge, .coach, .advice-hero-2";
const SKIP = ".is-swap, .is-ring, .ask, .modal, [data-noenter]";
const WATCH_MS = 700;
const MAX_I = 6;

export function useScreenEntrance(ref: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const tron = document.documentElement.getAttribute("data-theme") === "tron";
    let n = 0;
    const seen = new WeakSet<Element>();
    // Reads first, writes after (no layout thrash): one style/layout pass per batch.
    const scan = (scopes: HTMLElement[]) => {
      const found: HTMLElement[] = [];
      for (const scope of scopes) {
        if (scope.matches(BLOCKS)) found.push(scope);
        found.push(...scope.querySelectorAll<HTMLElement>(BLOCKS));
      }
      const fresh = found.filter((el) => { if (seen.has(el)) return false; seen.add(el); return !el.closest(SKIP) && !(el.parentElement?.closest(BLOCKS) && root.contains(el.parentElement.closest(BLOCKS))); });
      if (!fresh.length) return;
      const rows = fresh.map((el) => ({ el, r: el.getBoundingClientRect(), own: tron ? false : getComputedStyle(el).animationName !== "none" }))
        .filter(({ r, own }) => !own && r.height > 0 && r.top <= window.innerHeight && r.bottom >= 0)
        .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
      for (const { el } of rows) {
        el.style.setProperty("--enter-i", String(Math.min(n++, MAX_I)));
        el.setAttribute("data-enter", tron ? "rez" : "rise");
      }
    };
    scan([root]);
    const until = performance.now() + WATCH_MS;
    const mo = new MutationObserver((recs) => {
      if (performance.now() > until) { mo.disconnect(); return; }
      const added: HTMLElement[] = [];
      for (const rec of recs) rec.addedNodes.forEach((node) => { if (node instanceof HTMLElement) added.push(node); });
      if (added.length) scan(added);
    });
    mo.observe(root, { childList: true, subtree: true });
    const stop = window.setTimeout(() => mo.disconnect(), WATCH_MS);
    return () => { mo.disconnect(); clearTimeout(stop); };
  }, [ref, key]);
}
