/**
 * Layers (the (?) bubble, the import sheet and its pickers, Explain, Vista menu, SourceNote, ScoreHelp, Cambio settings,
 * the manual's search…) and the phone's back button (Nov 2026 rework).
 *
 * Every open layer owns one history entry, pushed when it opens (inside the tap that opened it, so Chrome never marks the
 * entry below as skippable, which is what made Android's back leave the installed app). Every history entry Faro pushes is
 * stamped with `faroLT`: the newest layer open at that moment. On popstate the entry we land on says which layers are
 * still under it; the ones above it close, topmost first, and nothing else sees that back. An entry that is not a layer's
 * (the manual, a screen, QuickAdd, BookLook) is left to its owner even while layers are open below it, so
 * Ajustes → Importar → review → (?) → Manual walks back Manual → review → Ajustes, with the review exactly as it was.
 *
 * A layer closed in the app (its X, Esc, the in-app arrow, a link that opens the manual) gives its entry back: when its
 * entry is still the current one, one silent history.back(); when something was pushed on top of it in the meantime,
 * the entry is left as "dead" and the back that later steps off it is passed on as a fresh back, so it never costs a
 * press. The lock (which unmounts the app) leaves its entries dead the same way instead of walking history while hidden.
 */
import { useEffect, useRef } from "react";
import { readY, writeY } from "./nav";

type Layer = { seq: number; close: () => void; popped: boolean };
type W = Window & { __faroLayers?: boolean; __faroLayerSkip?: number };
type St = Record<string, unknown> & { faroLT?: number; faroLayer?: number };

const stack: Layer[] = [];
const dead = new Set<number>();
let seqNext = 1;
let lastY = 0;
/** The state of the entry we are on (history.state is a copy; this is kept in step with every push, replace and pop). */
let cur: St | null = null;
/** Set while a popstate is being handed on to the app, so its in-app `faro-back` is not taken for a layer close. */
let passing = false;
/** The layer whose own entry is being pushed right now. */
let mine = 0;
function pushLayer(seq: number) {
  mine = seq;
  try { history.pushState(history.state, ""); } finally { mine = 0; }
}

export function openLayers(): number {
  return stack.length;
}

const topSeq = () => (stack.length ? stack[stack.length - 1]!.seq : 0);
const stamp = (state: unknown): St => ({ ...(state && typeof state === "object" ? (state as St) : {}), faroLT: topSeq() });

function closeTop(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  try { top.close(); } catch { /* keep going */ }
  return true;
}

function install() {
  const w = window as W;
  if (w.__faroLayers) return;
  w.__faroLayers = true;
  // Stamp every entry anyone pushes or replaces with the layers under it (QuickAdd, BookLook and the provider included).
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = (state: unknown, unused: string, url?: string | URL | null) => {
    const s = stamp(state);
    // Only a layer's own push names a layer; a copy of history.state pushed by someone else must not claim one.
    if (mine) s.faroLayer = mine; else delete s.faroLayer;
    cur = s;
    push(s, unused, url);
  };
  history.replaceState = (state: unknown, unused: string, url?: string | URL | null) => {
    const s = stamp(state);
    // Same place in history: it keeps its layer and what was under it.
    s.faroLT = typeof cur?.faroLT === "number" ? cur.faroLT : 0;
    if (cur?.faroLayer) s.faroLayer = cur.faroLayer; else delete s.faroLayer;
    cur = s;
    replace(s, unused, url);
  };
  cur = (history.state as St) ?? null;
  // Where the page was before a back step: the browser restores the scroll of the entry it steps to, which would
  // throw the screen to the top when the step only closed a small layer.
  window.addEventListener("scroll", () => { lastY = readY(); }, { capture: true, passive: true });
  window.addEventListener(
    "popstate",
    (e) => {
      const left = cur;
      const now = (e.state as St) ?? null;
      cur = now;
      if ((w.__faroLayerSkip ?? 0) > 0) { w.__faroLayerSkip = (w.__faroLayerSkip ?? 1) - 1; e.stopImmediatePropagation(); return; }
      // Stepping off an entry whose layer already closed in the app: that press was meant for what is open now.
      if (left?.faroLayer && dead.has(left.faroLayer)) {
        dead.delete(left.faroLayer);
        e.stopImmediatePropagation();
        history.back();
        return;
      }
      const under = typeof now?.faroLT === "number" ? now.faroLT : 0;
      const above = stack.filter((l) => l.seq > under);
      if (above.length) {
        e.stopImmediatePropagation();
        const y = lastY;
        for (const l of above.reverse()) {
          l.popped = true;
          try { l.close(); } catch { /* keep going */ }
        }
        writeY(y);
        requestAnimationFrame(() => writeY(y));
        // A layer that stayed open after its close (it only closed something inside it) takes its entry back.
        requestAnimationFrame(() => { for (const l of above) if (stack.includes(l)) { l.popped = false; pushLayer(l.seq); } });
        return;
      }
      passing = true;
      window.setTimeout(() => { passing = false; }, 0);
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape" || !stack.length) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      closeTop();
    },
    true,
  );
  window.addEventListener(
    "faro-back",
    (e) => {
      if (passing || !stack.length || e.defaultPrevented) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      closeTop();
    },
    true,
  );
}

if (typeof window !== "undefined") install();

/** Register an open layer. `close` must close it (it is called at most once per open). */
export function useLayer(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const layer: Layer = { seq: seqNext++, close: () => closeRef.current(), popped: false };
    lastY = readY();
    stack.push(layer);
    pushLayer(layer.seq);
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (layer.popped) return; // phone back already took its entry
      // Closed in the app: give the entry back once the commit that closed it is done (it may push the manual on top).
      dead.add(layer.seq);
      window.setTimeout(() => {
        if (!dead.has(layer.seq) || cur?.faroLayer !== layer.seq) return;
        if (!document.querySelector(".app-frame") || document.visibilityState === "hidden") return; // locked: stays dead
        dead.delete(layer.seq);
        const w = window as W;
        w.__faroLayerSkip = (w.__faroLayerSkip ?? 0) + 1;
        history.back();
      }, 0);
    };
  }, [open]);
}
