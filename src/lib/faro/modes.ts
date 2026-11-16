/* ============================================================
   Los tres modos — EL TIPO VIVE EN mode.ts (la etapa 5, 2026-11-16).

   Este archivo nació con la entrega de la Presentación (módulos 15–19)
   trayendo su propia definición de Mode/MODES/modeRank/modeReaches,
   mientras la oleada de los modos ya tenía la suya en mode.ts — el
   registro de funciones, los grupos dormidos y el impacto. Dos
   definiciones del mismo tipo son dos verdades esperando divergir:
   desde la etapa 5 hay UNA sola — la de mode.ts — y este archivo solo
   reexporta, para que los importadores de la entrega (guion.ts,
   manual/topics.ts, guion.test.ts) sigan leyendo el mismo nombre sin
   que exista una segunda fuente.
   ============================================================ */

export type { Mode } from "./mode.ts";
export { MODES, modeRank, modeReaches } from "./mode.ts";
