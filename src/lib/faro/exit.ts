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
import { displayName, passiveRecordShapeOk } from "./defaults";

/** Los registros pasivos del libro, leídos con desconfianza.
 * OLA 30 (Familia 5, G30-3): el lector juzga con EL JUEZ ÚNICO
 * (passiveRecordShapeOk en defaults.ts) — la misma ley que la puerta
 * del libro y el escritor: este lector juzgaba el contenedor con
 * `typeof` y discrepanba de la puerta (months como lista vivía aquí
 * y moría allí), y dejaba pasar el contenido que la cara rompía al
 * desreferenciar. */
export function passiveRecordsOf(state: LedgerState): PassiveRecord[] {
  const raw = (state as LedgerState).passiveRecords;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is PassiveRecord => passiveRecordShapeOk(r));
}

/** El nombre de una categoría de la copia, leído con desconfianza.
 * OLA 32 (Familia 7, G32-3): la puerta del libro juzga de las
 * categorías el id y los subs — NO nameKey/customName — así que una
 * categoría en forma vieja (id y subs, sin nombre) es un libro
 * VÁLIDO, y displayName desreferenciaba customName.trim() sin red:
 * el constructor moría antes de que el juez viera nada y la puerta
 * de la ceremonia EXPLOTABA en vez de rehusar o construir. El
 * constructor defiende lo suyo: el nombre se lee con la forma que
 * haya (texto o nada), y la escalera de displayName cae como
 * siempre — nombre propio, etiqueta, la clave, y al final el id,
 * que es el nombre que el registro ya usaba de respaldo. El folio
 * de una categoría sin nombre se guarda con su id por nombre: sus
 * cifras son las de la copia, y el nombre es pinta, no cifra. */
function passiveCategoryName(c: { id: string; nameKey?: unknown; customName?: unknown }, lang: "es" | "en"): string {
  const item = {
    nameKey: typeof c.nameKey === "string" ? c.nameKey : "",
    customName: typeof c.customName === "string" ? c.customName : "",
  };
  return displayName(item, lang) || c.id;
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
    categories: scoped.structure.categories.map((c) => ({ id: c.id, name: passiveCategoryName(c, lang) })),
  };
}

/** OLA 31 (Familia 7, G31-3): EL REGISTRO SE JUZGA ANTES DE LA
 * CEREMONIA — la copia de la que el registro nace pasa por la puerta
 * (el juez único, sobre el registro que nacería de ella) ANTES de
 * que la superficie cierre nada ni anuncie nada. La ceremonia vieja
 * leía la copia con la forma mínima y el alcance, cerraba la
 * membresía en el servidor primero y anunciaba «guardado» sin mirar
 * el desenlace: con una línea injuzgable en la copia (la que el
 * empalme del servidor siembra cuando no juzga las líneas), el
 * escritor rehusaba el registro y nadie lo sabía — la persona
 * salía, su copia se retiraba y el folio no estaba en su Archivo.
 * Esta es la puerta de la ceremonia: registro juzgado o null, y la
 * superficie decide con el desenlace en la mano. */
export function passiveRecordFromCopy(scoped: LedgerState, owner: string, lang: "es" | "en", atIso: string, id: string): PassiveRecord | null {
  // OLA 32 (Familia 7, G32-3): EL CONTRATO ES REGISTRO O NULL, JAMÁS
  // UNA EXCEPCIÓN — la puerta prometía «registro juzgado o null» y
  // el constructor podía morir antes del juez (la categoría sin
  // nombre, arriba; cualquier desreferencia de una copia de forma
  // inesperada, en general): la superficie llamaba sin red y el
  // toque no hacía nada visible. La construcción va guardada: lo
  // que no se puede construir se rehúsa como lo que no pasa el
  // juez — null, y la superficie muestra el desenlace
  // («record-failed»: no saliste) con la membresía intacta.
  let record: PassiveRecord;
  try {
    record = makePassiveRecord(scoped, owner, lang, atIso, id);
  } catch {
    return null;
  }
  return passiveRecordShapeOk(record) ? record : null;
}

/** Guardar el registro en el libro de quien se va (su propio libro:
 * el único sitio donde el registro vive). OLA 30 (Familia 5, G30-3):
 * el escritor rehúsa guardar lo que la puerta rehusaría — guardaba
 * sin juzgar, incluido un registro que su propia puerta del libro
 * rechazaba al abrir. El estado vuelve intacto. */
export function withPassiveRecord(state: LedgerState, record: PassiveRecord): LedgerState {
  if (!passiveRecordShapeOk(record)) return state;
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
