// Pinch-to-zoom on cards in Estudio and Asesor, and the wide (tablet/desktop) Asesor masonry.
// Zoom: only two simultaneous touch pointers start it; scale 1..3, one-finger pan while zoomed,
// double-tap or the floating "Restablecer" pill resets. One-finger swipes at scale 1 are untouched.
// The card is scaled with the individual `scale`/`translate` properties and clipped back to its own box,
// so nothing else moves and phones render exactly as before until someone pinches.
import "./pinch.css";
import { useEffect, useLayoutEffect, type RefObject } from "react";

const SEL = ".study-stack .stat-fold, .study-stack .pp-study, .advice-stack > .coach, .advice-stack .a2-tower, .advice-stack > .advice-card, .advice-stack .pp-advice";
const MAX = 3;

type Pt = { x: number; y: number };
type Gesture = {
  el: HTMLElement;
  s0: number; t0: Pt; bx: number; by: number; w: number; h: number;
  m0: Pt; d0: number; // pinch
  p0: Pt; // pan start
};

let users = 0;
let lang = "es";
const pts = new Map<number, Pt>();
const ours = new Set<number>();
let zoomEl: HTMLElement | null = null;
let s = 1;
let t: Pt = { x: 0, y: 0 };
let g: Gesture | null = null;
let mode: "none" | "pinch" | "pan" = "none";
let moved = false;
let downAt = 0;
let downPt: Pt = { x: 0, y: 0 };
let lastTap = { at: 0, x: 0, y: 0 };
let mute = 0;
let muteEl: HTMLElement | null = null;
const multi = new Set<number>(); // a 2+ finger touch outside the zoom cards: never a swipe, never a tap
let pill: HTMLButtonElement | null = null;
let watch = 0;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function radius(el: HTMLElement) {
  return parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
}

function paint(el: HTMLElement, w: number, h: number) {
  el.style.transformOrigin = "0 0";
  el.style.translate = `${t.x}px ${t.y}px`;
  el.style.scale = String(s);
  const l = -t.x / s, tp = -t.y / s, r = w - (w - t.x) / s, b = h - (h - t.y) / s;
  el.style.clipPath = `inset(${tp}px ${r}px ${b}px ${l}px round ${radius(el) / s}px)`;
  el.style.touchAction = "none";
  el.classList.add("is-pz");
}

function clear(el: HTMLElement) {
  for (const k of ["transformOrigin", "translate", "scale", "clipPath", "touchAction"] as const) el.style[k] = "";
  el.classList.remove("is-pz", "is-pz-back");
}

function showPill(on: boolean) {
  if (on && !pill) {
    pill = document.createElement("button");
    pill.type = "button";
    pill.className = "pz-reset";
    pill.addEventListener("click", (e) => { e.stopPropagation(); reset(true); });
  }
  if (!pill) return;
  if (on) {
    pill.innerHTML = `<span aria-hidden="true">⤢</span>${lang === "en" ? "Reset zoom" : "Quitar zoom"}`;
    pill.setAttribute("aria-label", lang === "en" ? "Reset zoom" : "Quitar zoom");
    if (!pill.isConnected) document.body.appendChild(pill);
    if (!watch) watch = window.setInterval(() => { if (zoomEl && !zoomEl.isConnected) reset(false); }, 500);
  } else {
    pill.remove();
    if (watch) { clearInterval(watch); watch = 0; }
  }
}

export function reset(animate = false) {
  const el = zoomEl;
  zoomEl = null; s = 1; t = { x: 0, y: 0 }; g = null; mode = "none";
  showPill(false);
  if (!el) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (animate && !calm && el.isConnected) {
    el.classList.add("is-pz-back");
    const w = el.offsetWidth, h = el.offsetHeight;
    paint(el, w, h);
    requestAnimationFrame(() => { el.style.translate = "0px 0px"; el.style.scale = "1"; el.style.clipPath = `inset(0px 0px 0px 0px round ${radius(el)}px)`; });
    window.setTimeout(() => { if (zoomEl !== el) clear(el); }, 260);
  } else clear(el);
}

function begin(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const cur = el === zoomEl;
  const tt = cur ? t : { x: 0, y: 0 };
  g = { el, s0: cur ? s : 1, t0: { ...tt }, bx: rect.left - tt.x, by: rect.top - tt.y, w: el.offsetWidth, h: el.offsetHeight, m0: { x: 0, y: 0 }, d0: 1, p0: { x: 0, y: 0 } };
}

function startPinch() {
  if (!g) return;
  const [a, b] = [...ours].slice(0, 2).map((id) => pts.get(id)!);
  g.m0 = mid(a, b); g.d0 = Math.max(12, dist(a, b));
  g.s0 = g.el === zoomEl ? s : 1; g.t0 = { ...t };
  mode = "pinch";
}

function startPan(id: number) {
  if (!g) return;
  g.p0 = { ...pts.get(id)! }; g.t0 = { ...t };
  mode = "pan";
}

function clampT(w: number, h: number) {
  t.x = Math.min(0, Math.max(w - s * w, t.x));
  t.y = Math.min(0, Math.max(h - s * h, t.y));
}

function onDown(e: PointerEvent) {
  if (e.pointerType !== "touch") return;
  // The primary pointer starts a fresh touch session: anything still tracked is stale.
  if (e.isPrimary) { pts.clear(); ours.clear(); multi.clear(); if (mode !== "none") { mode = "none"; g = null; } }
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (zoomEl && !zoomEl.isConnected) reset(false);
  const hit = users > 0 ? ((e.target as Element | null)?.closest?.(SEL) as HTMLElement | null) : null;
  if (zoomEl && (hit === zoomEl || zoomEl.contains(e.target as Node))) {
    ours.add(e.pointerId);
    e.stopPropagation();
    if (ours.size === 1) { begin(zoomEl); startPan(e.pointerId); moved = false; downAt = e.timeStamp; downPt = { x: e.clientX, y: e.clientY }; }
    else if (ours.size === 2) { begin(zoomEl); startPinch(); moved = true; }
    return;
  }
  // A second finger on the same card while the first is still down: this is a pinch.
  const first = [...pts.keys()].find((id) => id !== e.pointerId && !ours.has(id));
  if (first === undefined || pts.size < 2) return;
  const fp = pts.get(first)!;
  const firstHit = (document.elementFromPoint(fp.x, fp.y) as Element | null)?.closest?.(SEL);
  if (!hit || firstHit !== hit || pts.size !== 2) {
    // Two fingers anywhere else: swallow them so the tab swipe can't read a pinch as a swipe.
    for (const id of pts.keys()) if (!ours.has(id)) multi.add(id);
    e.stopPropagation();
    return;
  }
  if (zoomEl) reset(false); // pinching a different card moves the zoom there
  ours.clear(); ours.add(first); ours.add(e.pointerId);
  e.stopPropagation();
  zoomEl = hit; s = 1; t = { x: 0, y: 0 };
  begin(hit); startPinch(); moved = true;
}

function onMove(e: PointerEvent) {
  if (multi.has(e.pointerId)) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); e.stopPropagation(); return; }
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!ours.has(e.pointerId) || !g) return;
  e.stopPropagation();
  if (mode === "pinch" && ours.size >= 2) {
    const [a, b] = [...ours].slice(0, 2).map((id) => pts.get(id)!);
    const m = mid(a, b);
    s = Math.min(MAX, Math.max(1, g.s0 * (dist(a, b) / g.d0)));
    const px = (g.m0.x - g.bx - g.t0.x) / g.s0, py = (g.m0.y - g.by - g.t0.y) / g.s0;
    t = { x: m.x - g.bx - s * px, y: m.y - g.by - s * py };
  } else if (mode === "pan") {
    const p = pts.get(e.pointerId)!;
    if (dist(p, downPt) > 8) moved = true;
    t = { x: g.t0.x + p.x - g.p0.x, y: g.t0.y + p.y - g.p0.y };
  } else return;
  clampT(g.w, g.h);
  paint(g.el, g.w, g.h);
  showPill(s > 1.001);
}

function onUp(e: PointerEvent) {
  const was = ours.has(e.pointerId);
  pts.delete(e.pointerId);
  if (multi.delete(e.pointerId)) { e.stopPropagation(); return; }
  if (!was) return;
  ours.delete(e.pointerId);
  e.stopPropagation();
  if (moved) { mute = e.timeStamp + 450; muteEl = g?.el ?? zoomEl; }
  if (ours.size === 1 && zoomEl) { const left = [...ours][0]; begin(zoomEl); startPan(left); moved = true; return; }
  if (ours.size) return;
  mode = "none";
  if (zoomEl && s < 1.04) { reset(true); return; }
  if (!moved && e.type === "pointerup" && e.timeStamp - downAt < 260) {
    if (e.timeStamp - lastTap.at < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
      lastTap.at = 0; mute = e.timeStamp + 450; muteEl = zoomEl; reset(true); return;
    }
    lastTap = { at: e.timeStamp, x: e.clientX, y: e.clientY };
  }
}

function onClick(e: MouseEvent) {
  // Only the card that was just pinched/panned swallows its click; the reset pill and the rest of the app never do.
  if (e.timeStamp < mute && muteEl && muteEl.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation(); }
}

function onTouchMove(e: TouchEvent) {
  if ((mode === "pinch" || mode === "pan") && ours.size && e.cancelable) e.preventDefault();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && zoomEl) { e.stopPropagation(); reset(true); }
}

function install() {
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onUp, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKey, true);
  document.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
}


// Listeners live for the whole app: anywhere outside Estudio/Asesor they only make sure a two-finger
// touch is never read as a one-finger tab swipe. Zooming itself is armed only while a screen uses the hook.
if (typeof window !== "undefined") install();

/** Mount in Estudio and Asesor: pinch zoom on their cards while either is on screen. */
export function usePinchZoom(language: string) {
  lang = language;
  useEffect(() => {
    users++;
    return () => { if (--users === 0) reset(false); };
  }, []);
}

/** Wide Asesor: on tablets/desktop the cards flow into 2-3 balanced columns (masonry) so no column ends early.
 *  Phones (and phone landscape) are left exactly as they were: nothing is written unless the media query matches. */
export function useMasonry(ref: RefObject<HTMLElement | null>, ready = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 700px) and (min-height: 521px)");
    const ROW = 2;
    let on = false;
    let raf = 0;
    const kids = () => Array.from(el.children) as HTMLElement[];
    const off = () => {
      if (!on) return;
      on = false;
      el.classList.remove("is-masonry");
      for (const p of ["gridTemplateColumns", "gridAutoRows", "gridAutoFlow", "rowGap", "alignItems"] as const) el.style[p] = "";
      el.style.removeProperty("--a2-cols");
      for (const k of kids()) { k.style.gridRowEnd = ""; k.style.gridColumn = ""; k.style.alignSelf = ""; k.style.order = ""; k.style.marginTop = ""; k.style.marginBottom = ""; }
    };
    const lay = () => {
      raf = 0;
      if (!mq.matches || el.clientWidth < 660) { off(); return; }
      const gap = 14;
      const w = el.clientWidth;
      const cols = w >= 1180 ? 3 : 2;
      on = true;
      el.classList.add("is-masonry");
      el.style.setProperty("--a2-cols", String(cols));
      el.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      el.style.gridAutoRows = `${ROW}px`;
      el.style.gridAutoFlow = "row dense";
      el.style.rowGap = "0px";
      el.style.alignItems = "start";
      for (const k of kids()) {
        // Tablet portrait (2 narrow columns): the text-heavy coach card reads better across the full width, at the top.
        const full = k.classList.contains("unfold-all") || (cols === 2 && w < 900 && k.classList.contains("coach"));
        k.style.gridColumn = full ? "1 / -1" : "auto";
        k.style.alignSelf = "start";
        let h = k.offsetHeight;
        if (k.classList.contains("unfold-all")) {
          k.style.order = "-1";
          // 1.3.98: the Desplegar row sits first; the space under it matches the space above it (to the tabs or the top bar).
          k.style.marginTop = "0px";
          const top = el.getBoundingClientRect().top;
          const prev = el.previousElementSibling as HTMLElement | null;
          const seg = prev?.classList.contains("seg") ? prev : null;
          const segR = seg && seg.getBoundingClientRect().height > 0 ? seg.getBoundingClientRect() : null;
          const main = el.closest("main");
          const above = segR ? top - segR.bottom : main ? top - main.getBoundingClientRect().top : gap;
          const extra = Math.max(0, Math.round(above - gap));
          k.style.marginBottom = `${extra}px`;
          h += extra;
        }
        k.style.gridRowEnd = `span ${Math.max(1, Math.ceil((h + (h ? gap : 0)) / ROW))}`;
      }
    };
    const q = () => { if (!raf) raf = requestAnimationFrame(lay); };
    const ro = new ResizeObserver(q);
    const watchKids = () => { ro.disconnect(); ro.observe(el); for (const k of kids()) ro.observe(k); q(); };
    const mo = new MutationObserver(watchKids);
    mo.observe(el, { childList: true });
    mq.addEventListener("change", q);
    watchKids();
    lay();
    return () => { ro.disconnect(); mo.disconnect(); mq.removeEventListener("change", q); if (raf) cancelAnimationFrame(raf); off(); };
  }, [ref, ready]);
}
