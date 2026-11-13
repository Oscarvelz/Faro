/**
 * La puerta de modalidad del anillo de foco (1.3.244, «el recuadro fantasma»).
 *
 * El navegador decide `:focus-visible` con la modalidad DEL MOMENTO, no con la
 * de cuando el foco llegó: si un control recibió el foco con el dedo y DESPUÉS
 * cae una tecla — Atrás/Escape al salir de Ajustes, una flecha, lo que sea —,
 * la modalidad salta a «teclado» y el anillo se enciende de golpe sobre el
 * control que ya nadie toca. En TRON ese anillo es un marco de luz de 2px con
 * resplandor alrededor del engranaje de Ajustes: Oscar (2026-11-13 07:05):
 * «cuando toco el botón de ajustes utilizando TRON, a veces aparece un
 * recuadro en esa área… No lo hace siempre… Y no parece ser parte del
 * glitch.» No lo es: es esta regla, probada en banco con toques reales
 * (tocar el engranaje → Escape → el recuadro está, con el foco quieto).
 *
 * La ley de la puerta: el anillo responde a cómo NACIÓ el foco, y una tecla
 * tardía no puede encenderlo. La puerta anota la última modalidad
 * (pointerdown → dedo; keydown → teclado, ambos en captura, antes de que el
 * foco se mueva) y en el instante en que un elemento recibe el foco
 * (focusin) le sella `data-fv` SOLO si el foco nació del teclado — o si el
 * elemento es de texto, focus-visible por naturaleza. Sin focusin nuevo no
 * hay sello nuevo: la tecla tardía llega tarde. El CSS de TRON pinta su
 * anillo sobre `[data-fv]`, nunca sobre el `:focus-visible` crudo.
 */

export type Modality = "kb" | "touch";

const TEXTY = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/** ¿Merece este elemento el anillo, habiendo nacido su foco con esta modalidad? */
export function focusRingAllowed(el: { matches: (s: string) => boolean }, mod: Modality): boolean {
  return mod === "kb" || el.matches(TEXTY);
}

let modality: Modality = "touch";
let installed = false;

/** Instala la puerta una sola vez (la llama el cascarón al montar). */
export function installModalityGate(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("keydown", () => { modality = "kb"; }, true);
  window.addEventListener("pointerdown", () => { modality = "touch"; }, true);
  window.addEventListener("focusin", (e) => {
    const el = e.target as HTMLElement | null;
    if (!el || typeof el.setAttribute !== "function" || typeof el.matches !== "function") return;
    if (focusRingAllowed(el, modality)) el.setAttribute("data-fv", "1");
    else el.removeAttribute("data-fv");
  }, true);
  window.addEventListener("focusout", (e) => {
    const el = e.target as HTMLElement | null;
    if (el && typeof el.removeAttribute === "function") el.removeAttribute("data-fv");
  }, true);
}
