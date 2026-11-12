/**
 * navplace — el lugar (oleada del lugar, 1.3.180).
 *
 * El hueco (Oscar, 2026-11-09): estaba en Ajustes, cambiaba a otra aplicación, Faro se
 * bloqueaba (eso está bien) y al desbloquear lo dejaba en el inicio — «la aplicación
 * completamente se olvidó de dónde era que estaba». La causa: el estado de navegación
 * vivía solo en la memoria de React; la Puerta desmonta el piso entero detrás del bloqueo
 * (spa/main.tsx devuelve <Locked/> EN LUGAR de <FaroProvider><Shell/>), así que cada
 * desbloqueo — y cada recarga completa, y cada arranque en frío tras la muerte del
 * proceso — reconstruía el piso en el aterrizaje por defecto (Central, mes actual).
 *
 * EL LUGAR: la página principal (UiState.section), el mes abierto (year/month, el mes
 * que todos los escritorios de Libros leen) y la pestaña de la Bóveda (UiState.vault:
 * ahorros/metas/retiro/emergencia/me deben/debo). Nada más: las hojas abiertas, los
 * editores, los borradores y los diálogos NO se guardan ni se resucitan — el aterrizaje
 * es página + sección, nunca un formulario a medio escribir.
 *
 * DÓNDE VIVE: la capa del aparato (devicelayer.ts), la misma estantería que
 * faro.tree.folded — estado de presentación de ESTE aparato, jamás dato del libro:
 * no entra en el ledger, no sincroniza como contenido y no pasa por commit/undo.
 * Puede viajar en un respaldo como estado del aparato (la familia entra en la capa),
 * pero la foto solo recoge la clave del dueño que respalda (snapshotDeviceLayer).
 *
 * DISCIPLINA DE DUEÑO: la clave es por dueño — `faro.place.<uid>` — y la lectura solo
 * toca la clave del uid que arranca. El libro de otro dueño ignora el lugar guardado
 * (aterriza por defecto) y su propia navegación escribe SU clave, nunca la ajena.
 * La primera vez, sin lugar guardado, o tras una salida explícita (forgetUser limpia
 * el lugar de ese uid en cloud.ts), el aterrizaje es el de siempre, byte a byte.
 * Que la sesión caduque NO borra el lugar (forgetUser no está en el camino de la
 * caducidad), igual que no cierra la puerta.
 *
 * En modo muestra no hace falta código especial: samplemode.ts antepone
 * `faro.sample:` a cada clave de datos, así que el libro de muestra lee y escribe su
 * propio `faro.sample:faro.place.<uid>` y el lugar real queda intacto.
 *
 * Todo es puro y testeable contra un almacén inyectado (PackStorage), como door.ts.
 * Nada aquí toca React ni el DOM.
 */
import type { PackStorage } from "./packguard.ts";
import { SECTIONS, SWIPE_SECTIONS, type SectionId } from "./types.ts";
import type { VaultTab } from "../manual/places.ts";

export const PLACE_PREFIX = "faro.place.";
export const placeKeyOf = (uid: string): string => `faro.place.${uid}`;

export interface NavPlace {
  section: SectionId;
  year: number;
  month: number;
  vault: VaultTab | null;
}

const VAULT_TABS: readonly string[] = ["save", "meta", "retiro", "emergencia", "owed", "owe"];

/**
 * Validación estricta: cualquier basura → null (el arranque cae al aterrizaje por
 * defecto, nunca a un lugar a medias). Los cuatro campos han de estar presentes y
 * sanos: sección de la lista cerrada, mes 1–12, año 1990–2100, bóveda de la lista
 * cerrada o null.
 */
export function validPlace(raw: unknown): NavPlace | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Partial<Record<keyof NavPlace, unknown>>;
  if (typeof p.section !== "string" || !(SECTIONS as readonly string[]).includes(p.section)) return null;
  if (typeof p.year !== "number" || !Number.isInteger(p.year) || p.year < 1990 || p.year > 2100) return null;
  if (typeof p.month !== "number" || !Number.isInteger(p.month) || p.month < 1 || p.month > 12) return null;
  if (p.vault !== null && (typeof p.vault !== "string" || !VAULT_TABS.includes(p.vault))) return null;
  return { section: p.section as SectionId, year: p.year, month: p.month, vault: p.vault as VaultTab | null };
}

/** El lugar guardado de ESTE dueño; cualquier otra clave (la de otro dueño) no se toca. */
export function readPlace(store: PackStorage, uid: string): NavPlace | null {
  try {
    const raw = store.getItem(placeKeyOf(uid));
    if (!raw) return null;
    return validPlace(JSON.parse(raw));
  } catch { return null; }
}

/** Escribe el lugar del dueño. Un lugar inválido jamás se escribe. */
export function writePlace(store: PackStorage, uid: string, place: NavPlace): void {
  const valid = validPlace(place);
  if (!valid) return;
  try { store.setItem(placeKeyOf(uid), JSON.stringify(valid)); } catch { /* ignore */ }
}

/**
 * ¿Es una página principal? La ley de la salida (Oscar, chat de ventanas, 2026-11-10):
 * «It should not be possible to leave the app from the settings. I should at least be in
 * any of the main pages outside.» La pregunta de salida solo puede nacer parada en una
 * página principal — y las principales son todas menos Ajustes (la misma partición que
 * SWIPE_SECTIONS: «Settings stays out»). En Ajustes, el Atrás primero SALE de Ajustes.
 */
export const isMainSection = (section: SectionId): boolean =>
  (SWIPE_SECTIONS as readonly string[]).includes(section);

/** El lugar principal más hondo de la pila (el último que no es Ajustes), o null si no hay. */
export function lastMainPlace<T extends { section: SectionId }>(places: readonly T[]): T | null {
  for (let i = places.length - 1; i >= 0; i--) {
    const p = places[i];
    if (p && isMainSection(p.section)) return p;
  }
  return null;
}

/** Borra el lugar del dueño (la salida explícita: el próximo arranque aterriza por defecto). */
export function clearPlace(store: PackStorage, uid: string): void {
  try { store.removeItem(placeKeyOf(uid)); } catch { /* ignore */ }
}
