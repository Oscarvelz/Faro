/**
 * modes — los tres modos de Faro: Esencial · Ritmo · Completo.
 *
 * El sistema de modos es un filtro de lectura y de capacidades sobre un solo
 * libro (diseño consolidado, 2026-11-15: ~/workspace/faro-modes/). Este archivo
 * solo declara el VOCABULARIO que la enseñanza necesita para nacer con modo
 * (principio 10: toda función nace con modo): el tipo, el orden y la
 * comparación. El filtro mismo — el punto único del que beben la cara, el
 * Asesor, el Manual y la Presentación — lo construye la ola de modos; aquí
 * ningún comportamiento cambia.
 *
 * Semántica de los campos que este tipo alimenta:
 * - `Module.mode` (guion.ts): el modo MÍNIMO en cuyo índice vive el módulo.
 *   El índice es acumulativo por inclusión: Esencial ⊂ Ritmo ⊂ Completo.
 * - `Scene.mode` (guion.ts): la escena enseña la cara de ESE modo y solo se
 *   ofrece mirando desde él (las escenas filtradas del módulo «Los modos»).
 *   Sin `mode`, la escena se ofrece en todo modo donde viva su módulo.
 * - `Topic.mode` (manual/topics.ts): el modo mínimo del tema — el tema sigue
 *   a la función, no al capítulo (fallo 25 de Oscar, 2026-11-15).
 */

export type Mode = "esencial" | "ritmo" | "completo";

/** El orden de inclusión: cada modo conserva los de abajo y añade los suyos. */
export const MODES: readonly Mode[] = ["esencial", "ritmo", "completo"];

export const modeRank = (mode: Mode): number => MODES.indexOf(mode);

/** ¿El modo `have` alcanza a ver lo que nace en `want`? (inclusión acumulativa) */
export const modeReaches = (have: Mode, want: Mode): boolean => modeRank(have) >= modeRank(want);
