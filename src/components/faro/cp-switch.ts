// 1.3.202 — Cyberpunk signal sweep rule (Oscar 2026-11-10): the sweep marks ONLY a main-screen switch.
// Main-screen navs: the dock (Central · Libros · Estudio, tap or swipe) and Estudio's pair (Estudio · Asesor).
// Everything else (Tengo/Gastaré/Pagos, Debo tabs, lenses, the books inside Libros, Ajustes) stays quiet.
export const SCREEN_NAVS = ".dock, .seg.is-pair";

type Btn = { getAttribute(n: string): string | null; parentElement: { matches(sel: string): boolean } | null };
export type AriaRecord = { target: unknown; oldValue: string | null };

/** True when, in one batch of aria-current mutations, one main-screen nav both lost and gained its current button
 *  (one screen to another). A fresh mount, or leaving/entering Ajustes (nothing lost or nothing gained), is quiet. */
export function isScreenSwitch(recs: ArrayLike<AriaRecord>): boolean {
  const gained = new Set<unknown>(), lost = new Set<unknown>();
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    const btn = r.target as Btn;
    const nav = btn?.parentElement;
    if (!nav || !nav.matches(SCREEN_NAVS)) continue;
    const now = btn.getAttribute("aria-current") === "page", was = r.oldValue === "page";
    if (now && !was) gained.add(nav); else if (was && !now) lost.add(nav);
  }
  for (const nav of gained) if (lost.has(nav)) return true;
  return false;
}
