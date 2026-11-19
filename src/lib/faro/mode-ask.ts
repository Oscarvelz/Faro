/**
 * FARO — 1.3.319: la petición de modo (EL SUSURRO DEL MODO, Oscar).
 *
 * La tarjeta del susurro vive en el cromo (BankDock) y la maquinaria de
 * modos vive en Ajustes (pickMode, screens.tsx): este módulo es el puente.
 * Tocar la tarjeta guarda aquí el modo pedido y avisa por evento; Ajustes,
 * al montar (o al oír el evento si ya está montado), consume la petición
 * UNA sola vez y plantea la pregunta con su maquinaria de siempre — la
 * confirmación de la 1.3.318 manda: la tarjeta lleva a la pregunta, jamás
 * cambia el modo en silencio. Solo vive en la sesión; nunca se persiste.
 */
import type { Mode } from "./mode";

export const MODE_ASK_EVENT = "faro-mode-ask";

let pending: Mode | null = null;

export function requestModeAsk(target: Mode): void {
  pending = target;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MODE_ASK_EVENT, { detail: target }));
  }
}

/** Consume la petición: la devuelve una vez y la olvida. */
export function takeModeAsk(): Mode | null {
  const p = pending;
  pending = null;
  return p;
}
