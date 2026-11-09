import type { Insight } from "./types.ts";

/**
 * keynumbers.ts — la regla de vacío de «Números clave» (Oleada de botones 4, R12).
 *
 * Un número clave sin nada que decir: su valor es un guion o un cero con cualquiera
 * de sus disfraces («0%», «C$0.00», «0 en dólares»…). La regla vive aquí para que la
 * tarjeta (study2 KeyNumbers, que se calla cuando no queda ninguno) y el pliegue de
 * Estudio (screens, que sigue el patrón de las demás carpetas con datos: sin datos,
 * sin carpeta) compartan una sola definición de «vacío».
 */
const EMPTY_VALUE = /^(—|-|[^\d]*0([.,]0+)?\s*%?|[^\d]*0([.,]0+)?\s*(en dólares|in dollars)?)$/i;

/** Los números clave que sí dicen algo, en el orden en que llegaron. */
export function keyNumbersShown(items: readonly Insight[]): Insight[] {
  return items.filter((i) => !EMPTY_VALUE.test(i.value.trim()));
}

/** ¿Queda al menos un número clave con algo que decir? */
export function hasKeyNumbers(items: readonly Insight[]): boolean {
  return keyNumbersShown(items).length > 0;
}
