// 1.3.201 — Cyberpunk vivo: the city behind the glass. Skin only: decorative, aria-hidden layers mounted once outside
// React's root (the tron-floor pattern) and shown only by [data-theme="cyberpunk"] CSS (cyberpunk-vivo.css). No app state,
// no data, no layout: every motion is transform/opacity on its own fixed, contained layer.
//
// Housekeeping that keeps it cheap (Faro's animation rules):
//  - hidden tab: spa/main.tsx already sets html[data-hidden]; the CSS pauses the city on it.
//  - float-window drag: the shell marks the moving window with [data-moving]; while it is there html[data-cp-still]
//    pauses the city (so the drag owns the frame budget).
//  - battery: the web cannot read Android's Battery Saver switch, so the city calms itself the way the phone's saver
//    would — on battery at 20% or less, or when the browser asks to save data — via html[data-cp-calm] (rain and
//    spinners leave, every ambient loop parks). Ajustes' battery card (1.3.150) is untouched.
//  - screen change: the rain and spinners hold still for ~0.5s (html[data-cp-hush]) so the slide owns the frame.
//  - screen entrance: one signal sweep (WAAPI, transform/opacity on its own layer) when a pane slides in or a ship,
//    tab, pair or vault takes — read from the animations the house already starts, so no handler of the app changes.
//    Never under reduced motion, never while still or calm.
// Attributes only (data-*), never class or style on body or html: spa/fit.ts, native.ts and statusbar.ts observe those.
import "./cyberpunk-vivo.css";

const ENTRANCES = new Set(["study-in", "study-in-back", "ring-in", "ring-in-back", "cp-ship-burst", "cp-tab-burst", "cp-pair-burst", "cp-vault-burst"]);

export function mountCpCity() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const isCity = () => html.getAttribute("data-theme") === "cyberpunk";
  let scan: HTMLElement | null = null;

  const mount = () => {
    if (document.querySelector(".cp-city")) return;
    const city = document.createElement("div");
    city.className = "cp-city"; city.setAttribute("aria-hidden", "true");
    city.innerHTML = '<i class="cp-skyline"><b class="cp-lit"></b><b class="cp-beacon"></b><b class="cp-sign"></b></i><i class="cp-rainbox"><b class="cp-rain"></b></i><i class="cp-spin is-a"></i><i class="cp-spin is-b"></i>';
    const sweep = document.createElement("div");
    sweep.className = "cp-scan"; sweep.setAttribute("aria-hidden", "true");
    sweep.appendChild(document.createElement("i"));
    document.body.prepend(sweep);
    document.body.prepend(city);
    scan = sweep.firstElementChild as HTMLElement;

    // Float-window drag → still.
    const still = () => { if (document.querySelector(".float-win[data-moving]")) html.setAttribute("data-cp-still", ""); else html.removeAttribute("data-cp-still"); };
    new MutationObserver(still).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-moving"] });
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount, { once: true });

  // Battery / data saver → calm.
  let lowBatt = false;
  const saveData = () => Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const calm = () => { if (lowBatt || saveData()) html.setAttribute("data-cp-calm", ""); else html.removeAttribute("data-cp-calm"); };
  type Batt = EventTarget & { charging: boolean; level: number };
  const nav = navigator as Navigator & { getBattery?: () => Promise<Batt> };
  try {
    nav.getBattery?.().then((b) => {
      const upd = () => { lowBatt = !b.charging && b.level <= 0.2; calm(); };
      upd(); b.addEventListener("levelchange", upd); b.addEventListener("chargingchange", upd);
    }).catch(() => {});
  } catch { /* no battery API: the city simply stays awake */ }
  calm();

  // Entrance sweep.
  const reduce = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let last = 0;
  let hushT: ReturnType<typeof setTimeout> | undefined;
  document.addEventListener("animationstart", (e) => {
    if (!ENTRANCES.has(e.animationName) || !scan || !isCity() || reduce?.matches) return;
    // The rain holds still while the screen changes (html[data-cp-hush], ~0.5s), so a pane's slide owns the frame.
    html.setAttribute("data-cp-hush", "");
    clearTimeout(hushT);
    hushT = setTimeout(() => html.removeAttribute("data-cp-hush"), 560);
    if (html.hasAttribute("data-cp-still") || html.hasAttribute("data-cp-calm") || document.hidden) return;
    const now = performance.now();
    if (now - last < 320) return;
    last = now;
    const h = innerHeight;
    try {
      scan.getAnimations().forEach((a) => a.cancel());
      scan.animate([
        { transform: "translate3d(0, -140px, 0)", opacity: 1 },
        { transform: `translate3d(0, ${Math.round(h * 0.82)}px, 0)`, opacity: 0.85, offset: 0.82 },
        { transform: `translate3d(0, ${h}px, 0)`, opacity: 0 },
      ], { duration: 520, easing: "cubic-bezier(.3, .55, .35, 1)" });
    } catch { /* no WAAPI: no sweep */ }
  }, true);
}
