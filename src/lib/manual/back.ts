/**
 * Small layers (the (?) bubble, Explain, Vista menu, SourceNote, ScoreHelp, Cambio settings, the manual's search…)
 * close with the phone's back button and with Esc, topmost first, without stepping the app back a screen.
 *
 * A layer does not own a history entry. When one is open:
 *  · phone back (popstate) closes it, and the entry the browser just took is put straight back, so the
 *    provider's place stack, QuickAdd and BookLook never see that back;
 *  · Esc (document capture, before the provider's window listener) closes it and stops there;
 *  · the provider's cancelable `faro-back` (used by the in-app arrows) is answered the same way.
 *
 * Listeners are installed when this module loads, i.e. before any component mounts, so they run ahead of the
 * capture listeners QuickAdd and BookLook add later.
 */
import { useEffect, useRef } from "react";
import { readY, writeY } from "./nav";

type Layer = { id: number; close: () => void; state: unknown };
const stack: Layer[] = [];
let lastY = 0;
let nextId = 1;

export function openLayers(): number {
  return stack.length;
}

function closeTop(): boolean {
  const top = stack.pop();
  if (!top) return false;
  try { top.close(); } catch { /* keep going */ }
  return true;
}

function install() {
  const w = window as Window & { __faroLayers?: boolean; __faroSkipPop?: number };
  if (w.__faroLayers) return;
  w.__faroLayers = true;
  // Where the page was before a back step: the browser restores the scroll of the entry it steps to, which would
  // throw the screen to the top when the step only closed a small layer.
  window.addEventListener("scroll", () => { lastY = readY(); }, { capture: true, passive: true });
  window.addEventListener(
    "popstate",
    (e) => {
      if (!stack.length) return;
      if ((w.__faroSkipPop ?? 0) > 0) return; // someone is unwinding their own steps
      const top = stack[stack.length - 1]!;
      const y = lastY;
      e.stopImmediatePropagation();
      closeTop();
      // Put back the entry the browser just consumed, with the same state it had, and keep the scroll.
      history.pushState(top.state ?? history.state, "");
      writeY(y);
      requestAnimationFrame(() => writeY(y));
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
      if (!stack.length || e.defaultPrevented) return;
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
    const layer: Layer = { id: nextId++, close: () => closeRef.current(), state: history.state };
    lastY = readY();
    stack.push(layer);
    return () => {
      const i = stack.findIndex((l) => l.id === layer.id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [open]);
}
