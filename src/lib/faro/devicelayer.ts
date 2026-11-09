/**
 * devicelayer — la capa del aparato que viaja en el respaldo (oleada de la puerta, 1.3.168).
 *
 * El hueco (revisión de la puerta, 2026-11-09): el respaldo llevaba el libro gordo y SOLO el
 * libro. La capa local del aparato — idioma fijado, temas de día y noche, tamaño del dinero,
 * pliegues y órdenes que el dueño acomodó, la copia de conflicto — se quedaba atrás, y un
 * aparato restaurado no se reconocía a sí mismo. La regla es la de Brizna: la capa viaja;
 * NUNCA la sesión, la cola de sincronización ni la maquinaria/los registros transitorios.
 * Ante la duda, una clave queda fuera y se nombra en el informe de la oleada.
 *
 * La lista es EXPLÍCITA (exactas + prefijos) y manda en los dos sentidos: la foto solo recoge
 * lo listado y la aplicación solo escribe lo listado — una sección de respaldo hostil o dañada
 * no puede escribir fuera de la lista (ni la sesión, ni el libro, ni la identidad del aparato).
 * Aplicar es SOLO-PONER: lo que la foto no trae, el aparato lo conserva tal cual; y un respaldo
 * viejo sin sección deja la capa intacta (deviceSectionOf devuelve null).
 *
 * La cuarentena NO forma parte de la capa: tiene su propia puerta desde la 1.3.166
 * (Ajustes → Copias la lista y la restaura). La copia de conflicto SÍ viaja (es trabajo del
 * dueño apartado, no maquinaria): la foto recoge solo las dos claves del usuario que respalda
 * (faro.conflict.<uid> y faro.conflict.<uid>.tab); al aplicar se admite la familia
 * faro.conflict.* listada, para que la copia aterrice en la puerta de su propio dueño.
 *
 * Puro y testeable contra un almacén inyectado (PackStorage). Nada aquí toca React ni el DOM.
 */
import type { PackStorage } from "./packguard.ts";

/** Claves exactas de la capa: preferencias y acomodos del dueño en este aparato. */
export const DEVICE_LAYER_EXACT: readonly string[] = [
  "faro-lang", // idioma fijado
  "faro-theme", // tema vigente (lectura rápida de arranque)
  "faro-day", // el aparato ya eligió su tema de día
  "faro-day-theme", // tema de día elegido
  "faro-night-theme", // tema de noche elegido
  "faro-money-size", // tamaño del dinero
  "faro-money-size-land", // tamaño del dinero apaisado
  "faro.tree.folded", // pliegues del árbol de Estructura
  "faro-float", // la burbuja flotante: puesta o no
  "faro-float-min", // la burbuja, minimizada
  "faro-float-section", // la sección de la burbuja
  "faro-debo-tab", // la pestaña de Debo elegida
  "faro-split", // el reparto de paneles
  "faro-split-axis",
  "faro-split-ratio",
  "faro-split-section",
  "faro-calc-geo", // la geometría de la calculadora
  "faro-cv-prefs", // las preferencias del conversor
  "faro-fx-open", // el panel de instrumentos, abierto o no
  "faro-save-accounts", // el pin de Cuentas en la Bóveda
  "faro-vault-banks", // el pin de Bancos en la Bóveda
  "faro-study-order-2", // el orden de Estudio acomodado por el dueño
  "faro-study-unfold", // el despliegue de Estudio
  "faro-widget-hide", // el widget esconde los montos (privacidad elegida)
];

/** Familias por prefijo: acomodos por pieza (órdenes, pines, horizontes por bolsillo). */
export const DEVICE_LAYER_PREFIXES: readonly string[] = [
  "faro-vault-blocks:", // el orden de los bloques de la Bóveda
  "faro-vault-pocket:", // el pin/pliegue por bolsillo
  "faro-vault-lever:", // el horizonte de cada bolsillo: el monto de la palanca
  "faro-vault-lever-mark:", // …su marca
  "faro-vault-lever-pin:", // …su pin
  "faro-vault-years:", // …sus años
];

const CONFLICT_PREFIX = "faro.conflict.";

/** ¿Esta clave pertenece a la capa que viaja? (La familia de conflicto entra entera.) */
export function isDeviceLayerKey(key: string): boolean {
  if (DEVICE_LAYER_EXACT.includes(key)) return true;
  if (DEVICE_LAYER_PREFIXES.some((p) => key.startsWith(p))) return true;
  if (key.startsWith(CONFLICT_PREFIX) && key.length > CONFLICT_PREFIX.length) return true;
  return false;
}

/** Las dos claves de conflicto de UN usuario: lo único de la familia que una foto recoge. */
export const conflictKeysOf = (uid: string): string[] => [`faro.conflict.${uid}`, `faro.conflict.${uid}.tab`];

/**
 * La foto de la capa: los valores crudos (texto) de cada clave listada que exista.
 * De la familia de conflicto solo viajan las claves del usuario que está respaldando.
 */
export function snapshotDeviceLayer(store: PackStorage, uid: string): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: string) => {
    const v = store.getItem(k);
    if (v !== null) out[k] = v;
  };
  for (const k of DEVICE_LAYER_EXACT) put(k);
  const mine = new Set(conflictKeysOf(uid));
  for (const k of store.keys()) {
    if (mine.has(k)) { put(k); continue; }
    if (k.startsWith(CONFLICT_PREFIX)) continue; // el conflicto de otra cuenta no viaja aquí
    if (DEVICE_LAYER_PREFIXES.some((p) => k.startsWith(p))) put(k);
  }
  return out;
}

/**
 * Aplica una foto al aparato: solo claves listadas, solo valores de texto, solo-poner.
 * Devuelve las claves efectivamente escritas.
 */
export function applyDeviceLayer(store: PackStorage, layer: Record<string, string>): string[] {
  const applied: string[] = [];
  if (!layer || typeof layer !== "object" || Array.isArray(layer)) return applied;
  for (const [k, v] of Object.entries(layer)) {
    if (typeof v !== "string") continue;
    if (!isDeviceLayerKey(k)) continue;
    try { store.setItem(k, v); applied.push(k); } catch { /* almacén lleno: el libro ya entró */ }
  }
  return applied;
}

/**
 * Lee la sección `device` de un respaldo ya parseado. Ausente → null (la capa queda intacta).
 * Dañada (no es un objeto llano) → null también: una capa mala jamás bloquea la restauración
 * del libro. Presente y sana → el registro filtrado por la lista (solo textos).
 */
export function deviceSectionOf(parsed: unknown): Record<string, string> | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const dev = (parsed as { device?: unknown }).device;
  if (dev === undefined) return null;
  if (!dev || typeof dev !== "object" || Array.isArray(dev)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(dev as Record<string, unknown>)) {
    if (typeof v === "string" && isDeviceLayerKey(k)) out[k] = v;
  }
  return out;
}
