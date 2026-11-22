/* ═══ LAS SALIDAS DEL LIBRO COMPARTIDO (Pieza C8, 1.3.398; brief §C8).
 *
 * Salir es una ceremonia serena: no se piden razones ni se enseñan.
 * El acceso muere en el servidor en cuanto la membresía se cierra
 * (las puertas de las Piezas C1/C2 solo leen membresías activas), y
 * la copia del alcance que vive en la vista nunca se guardó en el
 * teléfono — cerrar la vista la retira. Lo que la persona anotó
 * queda en el libro, firmado (Pieza C4: las firmas no se reescriben).
 *
 * Al salir, la persona elige qué hacer con SU copia:
 * · exportarla (un archivo suyo),
 * · guardarla como REGISTRO PASIVO — este archivo: el folio
 *   congelado de su alcance en su propio Archivo,
 * · o no llevarse nada.
 *
 * El registro pasivo NO es un libro: es historia. Ningún motor lo
 * escribe, ninguna cuenta se toca con él, sus cifras se leen como
 * pasado, y borrarlo — cuando quiera, desde su Archivo — no toca el
 * libro del dueño: el registro vive entero en el libro de quien se
 * fue. Nace de la copia YA recortada por el alcance (world.ts): lo
 * que nunca fue suyo nunca entra en su registro. */
import type { LedgerState, PassiveRecord } from "./types";
import { displayName } from "./defaults";

/** Los registros pasivos del libro, leídos con desconfianza: solo
 * entran los que traen la forma completa. */
export function passiveRecordsOf(state: LedgerState): PassiveRecord[] {
  const raw = (state as LedgerState).passiveRecords;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is PassiveRecord =>
    !!r && typeof r === "object" &&
    typeof r.id === "string" && r.id !== "" &&
    typeof r.at === "string" && typeof r.owner === "string" &&
    !!r.months && typeof r.months === "object" && Array.isArray(r.categories));
}

/** El registro nace de la copia del alcance: una copia PROFUNDA y
 * congelada — tocar el registro jamás toca el libro de origen, ni al
 * revés. Las categorías guardan el nombre tal como se veía en el
 * idioma de quien se va. */
export function makePassiveRecord(scoped: LedgerState, owner: string, lang: "es" | "en", atIso: string, id: string): PassiveRecord {
  const frozen = JSON.parse(JSON.stringify(scoped.months)) as PassiveRecord["months"];
  return {
    id,
    at: atIso,
    owner,
    months: frozen,
    categories: scoped.structure.categories.map((c) => ({ id: c.id, name: displayName(c, lang) || c.id })),
  };
}

/** Guardar el registro en el libro de quien se va (su propio libro:
 * el único sitio donde el registro vive). */
export function withPassiveRecord(state: LedgerState, record: PassiveRecord): LedgerState {
  return { ...state, passiveRecords: [...passiveRecordsOf(state), record] };
}

/** Borrar el registro: un acto sobre el libro de quien lo guarda —
 * el libro del dueño ni se entera (el registro es una copia suya). */
export function withoutPassiveRecord(state: LedgerState, recordId: string): LedgerState {
  const kept = passiveRecordsOf(state).filter((r) => r.id !== recordId);
  if (kept.length === passiveRecordsOf(state).length) return state;
  return { ...state, passiveRecords: kept };
}

/** La lectura del folio: los meses del registro, del más reciente al
 * más viejo, con su total — historia, leída como historia. */
export function passiveMonths(record: PassiveRecord): { monthKey: string; total: number; count: number }[] {
  return Object.keys(record.months).sort().reverse().map((monthKey) => {
    const lines = record.months[monthKey]?.lines ?? [];
    return { monthKey, total: lines.reduce((a, l) => a + l.amountMinor, 0), count: lines.length };
  });
}
