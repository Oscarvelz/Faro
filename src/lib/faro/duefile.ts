/**
 * duefile — el Archivo de Debo viaja en el respaldo (1.3.169).
 *
 * El hueco (nombrado en voz alta por la oleada de la puerta, 1.3.168): `faro-due-file` es una
 * clave GLOBAL de localStorage (no es por usuario) donde vive el Archivo de Debo — las series
 * que el dueño archivó, con nombre, monto mayor, moneda, fecha de archivo y su historial de
 * pagos (DueFile en types.ts). Es DATO vivo del dueño, no maquinaria ni preferencia del
 * aparato: por eso NO entra en la lista de devicelayer.ts (esa lista sigue sin admitirlo) y
 * viaja en su PROPIA sección hermana del respaldo, `dueFile`. El contenido del libro no
 * cambia de bytes y la envoltura sigue en v:1. Tampoco entra en el libro ni en la
 * sincronización: solo en el respaldo, que es lo que Oscar pidió.
 *
 * Las reglas de la sección, simétricas a las de la capa:
 * - La foto (snapshotDueFile) solo nace de un Archivo LEGIBLE: clave ausente → null (el
 *   respaldo no lleva sección); valor corrupto o que no es un arreglo → null — un dato local
 *   dañado jamás fabrica una sección vacía «con autoridad» que al restaurar borre un Archivo
 *   bueno. Un arreglo legible, aunque esté vacío, sí viaja: vacío también es un estado.
 * - La lectura de la sección (dueFileSectionOf) trata lo dañado como ausente: null, y jamás
 *   bloquea la restauración del libro.
 * - Aplicar (applyDueFile) escribe la clave global tal cual — la clave no es por usuario,
 *   así que no hay «puerta de su dueño» que buscar: aterriza donde siempre vivió.
 * - REGLA DE LA SECCIÓN AUSENTE: un respaldo sin sección (todos los anteriores a la 1.3.169)
 *   deja el Archivo del aparato que restaura EXACTAMENTE como está. Solo una sección presente
 *   reemplaza, y reemplaza entera: restaurar es volver al estado que la copia guardó.
 *
 * La validación de filas es LA MISMA que la pantalla usa al leer (readDueFile en screens.tsx):
 * un arreglo cuyos renglones tengan `name` en texto; el resto se queda fuera.
 *
 * Puro y testeable contra un almacén inyectado (PackStorage). Nada aquí toca React ni el DOM.
 */
import type { PackStorage } from "./packguard.ts";
import type { DueFile } from "./types.ts";

/** La clave global donde vive el Archivo (la única lectora/escritora es DueOwe en screens). */
export const DUE_FILE_KEY = "faro-due-file";

/** La regla de la pantalla: un arreglo → sus renglones con nombre en texto; otra cosa → []. */
export function parseDueFileRows(value: unknown): DueFile[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is DueFile => !!row && typeof (row as { name?: unknown }).name === "string");
}

/** Lee el Archivo del almacén (texto JSON); cualquier daño → [], como la pantalla. */
export function readDueFileRows(store: PackStorage): DueFile[] {
  try {
    const raw = store.getItem(DUE_FILE_KEY);
    if (raw === null) return [];
    return parseDueFileRows(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * La foto para el respaldo: las filas del Archivo, o null si la sección no debe existir
 * (clave ausente, o valor ilegible — ver la regla del encabezado).
 */
export function snapshotDueFile(store: PackStorage): DueFile[] | null {
  let raw: string | null;
  try { raw = store.getItem(DUE_FILE_KEY); } catch { return null; }
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(value)) return null;
  return parseDueFileRows(value);
}

/**
 * Lee la sección `dueFile` de un respaldo ya parseado. Ausente o dañada → null (el Archivo
 * del aparato queda intacto). Presente y sana → las filas filtradas con la regla de la
 * pantalla (un [] presente es un reemplazo explícito, no una ausencia).
 */
export function dueFileSectionOf(parsed: unknown): DueFile[] | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const section = (parsed as { dueFile?: unknown }).dueFile;
  if (section === undefined) return null;
  if (!Array.isArray(section)) return null;
  return parseDueFileRows(section);
}

/** Aplica la sección: la clave global recibe el arreglo serializado. Devuelve si escribió. */
export function applyDueFile(store: PackStorage, rows: DueFile[]): boolean {
  try {
    store.setItem(DUE_FILE_KEY, JSON.stringify(rows));
    return true;
  } catch {
    return false; /* almacén lleno: el libro ya entró; el Archivo se queda como estaba */
  }
}
