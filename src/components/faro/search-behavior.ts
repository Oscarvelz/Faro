/**
 * search-behavior.ts — la ley de las barras de búsqueda (Oscar,
 * 2026-11-20, 1.3.351): al tocar una barra de búsqueda, todo su texto
 * queda seleccionado — se escribe encima sin borrar a mano — y si la
 * barra queda en reposo con texto, se limpia sola tras 30 segundos sin
 * actividad. Toda barra de búsqueda de Faro pasa por aquí: la global,
 * la del Manual, la del Historial, la de monedas y las de elegir.
 */
import { useEffect, useRef, type FocusEvent } from "react";

export const SEARCH_IDLE_MS = 30000;

export function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.select();
}

export function useIdleClear(value: string, clear: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const clearRef = useRef(clear);
  clearRef.current = clear;
  useEffect(() => {
    if (!value) return;
    timer.current = window.setTimeout(() => clearRef.current(), SEARCH_IDLE_MS);
    return () => window.clearTimeout(timer.current);
  }, [value]);
}
