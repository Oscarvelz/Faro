/**
 * La presión larga de la casa (el motor de selección, Oscar 2026-11-13).
 *
 * No es un gesto nuevo: es la familia que ya levantaba las filas del árbol de
 * Estructura (StructureTree en screens.tsx), destilada a un gancho para que las
 * tres casas de la selección — el río del Historial, las líneas del Archivo y las
 * listas de Libros — sostengan con la misma mano:
 *  - la espera es de 200ms (1.3.227: bajó de 260 porque se sentía muerta);
 *  - la mano puede temblar hasta 12px; más movimiento es un scroll o un toque,
 *    no una presión (1.3.227: subió de 6 porque el temblor cancelaba el gesto);
 *  - si la página rueda de verdad (>4px de scroll), la espera se cancela al
 *    primer movimiento real (1.3.145);
 *  - el fin del gesto se escucha en la ventana, no en la fila: la captura del
 *    puntero que <main> toma en cada toque (shell.tsx) re-apunta el pointerup
 *    fuera de la fila, y una espera huérfana levantaría sola en una habitación
 *    vacía (1.3.167, el «se pega» de Oscar) — y al desmontar, todo se desarma
 *    (1.3.164);
 *  - por esa misma captura, la tolerancia también se vigila en la ventana:
 *    el pointermove re-apuntado jamás llegaría a la fila, y una presión que se
 *    vuelve arrastre horizontal (el deslizamiento de pantalla de la casa)
 *    debe morir como presión antes de cumplirse, no entrar al modo a mitad
 *    del viaje. Los números no cambian: 200ms, 12px, 4px de scroll;
 *  - el menú contextual queda suprimido en la fila (1.3.227: sostener copiaba
 *    el texto) y el click que persigue a una presión cumplida se traga una vez:
 *    soltar tras sostener no es tocar.
 */
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";

export const LONG_PRESS_MS = 200;
export const LONG_PRESS_TOLERANCE_PX = 12;

type Press = { id: string; x: number; y: number; pid: number; timer: number };

export function useLongPress(onHold: (id: string) => void) {
  const pressRef = useRef<Press | null>(null);
  const heldRef = useRef(false);
  const endGestureRef = useRef<((e: PointerEvent) => void) | null>(null);
  const moveWatchRef = useRef<((e: PointerEvent) => void) | null>(null);
  const scrollWatchRef = useRef<(() => void) | null>(null);
  const onHoldRef = useRef(onHold);
  onHoldRef.current = onHold;

  const endPress = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
    if (endGestureRef.current) {
      window.removeEventListener("pointerup", endGestureRef.current);
      window.removeEventListener("pointercancel", endGestureRef.current);
      endGestureRef.current = null;
    }
    if (moveWatchRef.current) {
      window.removeEventListener("pointermove", moveWatchRef.current);
      moveWatchRef.current = null;
    }
    if (scrollWatchRef.current) {
      window.removeEventListener("scroll", scrollWatchRef.current, true);
      scrollWatchRef.current = null;
    }
  };
  // 1.3.164: ningún oyente sobrevive al componente que lo armó.
  useEffect(() => endPress, []);

  const bind = (id: string) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== undefined && e.button !== 0) return;
      heldRef.current = false;
      endPress();
      const startScrollY = window.scrollY;
      const endGesture = (ev: PointerEvent) => { if (pressRef.current && ev.pointerId === pressRef.current.pid) endPress(); };
      endGestureRef.current = endGesture;
      window.addEventListener("pointerup", endGesture);
      window.addEventListener("pointercancel", endGesture);
      const watch = () => { if (Math.abs(window.scrollY - startScrollY) > 4) endPress(); };
      scrollWatchRef.current = watch;
      window.addEventListener("scroll", watch, { capture: true, passive: true });
      const moveWatch = (ev: PointerEvent) => {
        const press = pressRef.current;
        if (!press || ev.pointerId !== press.pid) return;
        if (Math.abs(ev.clientY - press.y) > LONG_PRESS_TOLERANCE_PX || Math.abs(ev.clientX - press.x) > LONG_PRESS_TOLERANCE_PX) endPress();
      };
      moveWatchRef.current = moveWatch;
      window.addEventListener("pointermove", moveWatch);
      const timer = window.setTimeout(() => {
        if (!pressRef.current) return; // la presión ya terminó: nunca disparar en una habitación vacía
        heldRef.current = true;
        endPress();
        onHoldRef.current(id);
      }, LONG_PRESS_MS);
      pressRef.current = { id, x: e.clientX, y: e.clientY, pid: e.pointerId, timer };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const press = pressRef.current;
      if (!press) return;
      if (Math.abs(e.clientY - press.y) > LONG_PRESS_TOLERANCE_PX || Math.abs(e.clientX - press.x) > LONG_PRESS_TOLERANCE_PX) endPress();
    },
    onContextMenu: (e: SyntheticEvent) => e.preventDefault(),
  });

  /** true una sola vez si el click que sigue es la cola de una presión cumplida. */
  const consumeClick = () => {
    if (!heldRef.current) return false;
    heldRef.current = false;
    return true;
  };

  return { bind, consumeClick };
}
