/**
 * LA CALMA AL ESCRIBIR (1.3.455) — la decoración se calla mientras
 * se escribe.
 *
 * El defecto (Oscar, 2026-11-25, en vivo): escribiendo en la caja del
 * Asesor bajo el tema Cyberpunk, el texto se pegaba por tramos y al
 * final la app entera se congeló hasta que Android la cerró. Medido
 * en banco con un libro pesado (2.208 líneas): la misma tecla costó
 * ~130 ms bajo Cyberpunk y ~4 ms bajo el tema claro. La caja era
 * inocente (tres mutaciones por tecla); el coste es el repintado
 * continuo de las animaciones decorativas del tema — lluvia, giros,
 * brillos, el haz — contra el que cada tecla pelea, y en el teléfono
 * la pelea se acumuló hasta el «isn't responding».
 *
 * La cura no toca ningún diseño: cuando un campo de texto toma el
 * foco, se pausan las animaciones que estén corriendo fuera del
 * campo; cuando el foco sale de los campos, vuelven exactamente las
 * que se pausaron. El tema se ve igual; solo deja de moverse
 * mientras se teclea. Vale para todo campo de la app (el Asesor,
 * Anotar, los ajustes), en todo tema — la regla es de la casa, no
 * del tema: escribir manda sobre decorar.
 *
 * Las animaciones del propio campo (o dentro de él) nunca se pausan.
 * Con «reducir movimiento» activo no hay nada que calmar: las
 * animaciones ya están quietas por CSS y esto no se instala.
 */

let started = false;
let calm = false;
let paused: Animation[] = [];
let resumeTimer = 0;

const TEXT_TYPES = ["", "text", "search", "email", "url", "tel", "password", "number", "date", "time", "month", "week", "datetime-local"];

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "INPUT") return TEXT_TYPES.includes((el as HTMLInputElement).type);
  return false;
}

function engage(field: Element) {
  if (calm) return;
  calm = true;
  try {
    paused = document.getAnimations().filter((a) => {
      if (a.playState !== "running") return false;
      const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
      // Lo del campo sigue vivo: su propio movimiento no estorba.
      if (t && (t === field || field.contains(t))) return false;
      return true;
    });
    for (const a of paused) {
      try { a.pause(); } catch { /* la animación ya no está */ }
    }
  } catch {
    paused = [];
  }
}

function release() {
  calm = false;
  for (const a of paused) {
    const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
    if (a.playState === "paused" && t?.isConnected) {
      try { a.play(); } catch { /* se fue con su superficie */ }
    }
  }
  paused = [];
}

export function startTypingCalm() {
  if (started) return;
  started = true;
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  document.addEventListener("focusin", (e) => {
    const t = e.target as Element | null;
    if (t && isEditable(t)) {
      window.clearTimeout(resumeTimer);
      engage(t);
    }
  });
  document.addEventListener("focusout", () => {
    window.clearTimeout(resumeTimer);
    // Un respiro: si el foco va de un campo a otro, la calma sigue.
    resumeTimer = window.setTimeout(() => {
      if (!isEditable(document.activeElement)) release();
    }, 0);
  });
}
