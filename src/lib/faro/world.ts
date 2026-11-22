/* ═══ CADA MOTOR LEE SOLO SU MUNDO (Pieza C7, 1.3.397; brief §C7).
 *
 * El mundo de una persona es su libro + su alcance de los libros
 * compartidos con ella — ni un dato más. Tres piezas puras:
 *
 * · scopeFilter — EL SEGUNDO CANDADO: la copia que llega del
 *   servidor ya viene recortada por la Pieza C2, pero el cliente no
 *   confía en el transporte: vuelve a recortar por el alcance de la
 *   membresía (las líneas fuera de alcance mueren, los meses vacíos
 *   no viajan, y ajustes/auditoría/borradores jamás están — ni con
 *   alcance total). Si el papel mintiera, la pantalla no lo enseña.
 * · unionWorld — la unión de LECTURA para los motores: el libro
 *   propio y la copia del alcance componen un solo estado de lectura
 *   (las líneas se unen por mes, deduplicadas por id con el libro
 *   propio primero; la estructura gana las categorías del alcance).
 *   Es una VISTA: nace para calcular y jamás se guarda — ningún
 *   camino de guardado la recibe.
 * · explainLines — la cuenta de una cifra: qué líneas componen el
 *   total de una categoría en un mes, de quién es cada una (su
 *   firma) y de quién fue el dinero. Tocar una cifra y ver su
 *   composición es ley de la casa; en el libro compartido la
 *   composición nombra también al autor y a la fuente. */
import type { LedgerState, Line } from "./types";
import type { ShareScope } from "./share";
import { funderOf } from "./funding";

/** Recortar una copia recibida al alcance de la membresía (segundo
 * candado, espejo del papel de la C2). La entrada se trata con
 * desconfianza: lo que no tenga la forma de libro no pasa. */
export function scopeFilter(book: LedgerState, scope: ShareScope): LedgerState {
  // La copia recibida es un objeto forastero: se lee con desconfianza
  // y se reconstruye sin los campos que nunca viajan (el tipo exige
  // settings/audit en un libro propio; en la copia del alcance esos
  // campos no existen — el servidor de la C2 jamás los manda, y este
  // segundo candado garantiza que tampoco un transporte mentiroso
  // los cuela: se descartan aquí, antes de cualquier lectura).
  const raw = book as unknown as Record<string, unknown>;
  const { settings: _s, audit: _a, drafts: _d, ...rest } = raw;
  const base = rest as unknown as LedgerState;
  if (!("cats" in scope)) return { ...base, months: pruneEmpty(base.months) };
  const cats = new Set(scope.cats);
  const months: LedgerState["months"] = {};
  for (const [k, m] of Object.entries(base.months)) {
    const lines = m.lines.filter((l) => cats.has(l.categoryId));
    if (lines.length) months[k] = { lines };
  }
  return {
    ...base,
    months,
    structure: {
      ...base.structure,
      categories: base.structure.categories.filter((c) => cats.has(c.id)),
      purchases: base.structure.purchases.filter((p) => cats.has((p as { categoryId?: string }).categoryId ?? "")),
    },
  };
}

const pruneEmpty = (months: LedgerState["months"]): LedgerState["months"] => {
  const out: LedgerState["months"] = {};
  for (const [k, m] of Object.entries(months)) if (m.lines.length) out[k] = m;
  return out;
};

/** La unión de lectura: el mundo completo de quien mira, para los
 * motores. No muta ninguna de las dos entradas. */
export function unionWorld(own: LedgerState, scoped: LedgerState): LedgerState {
  const months: LedgerState["months"] = {};
  const keys = new Set([...Object.keys(own.months), ...Object.keys(scoped.months)]);
  for (const k of keys) {
    const ownLines = own.months[k]?.lines ?? [];
    const seen = new Set(ownLines.map((l) => l.id));
    const extra = (scoped.months[k]?.lines ?? []).filter((l) => !seen.has(l.id));
    months[k] = { lines: [...ownLines, ...extra] };
  }
  const ownCats = new Set(own.structure.categories.map((c) => c.id));
  return {
    ...own,
    months,
    structure: {
      ...own.structure,
      categories: [...own.structure.categories, ...scoped.structure.categories.filter((c) => !ownCats.has(c.id))],
    },
  };
}

export interface FigureLine {
  line: Line;
  /** La firma de autoría (cuenta) o null si la línea no está firmada. */
  author: string | null;
  /** De quién fue el dinero: «owner», la cuenta de un miembro, o
   * null cuando la línea no trae marca y el área es del dueño. */
  funder: string | null;
  /** Es una declaración firmada (Pieza C6), no un hecho verificado. */
  declaration: boolean;
}

/** Las líneas que componen la cifra de una categoría en un mes, con
 * su autor y su fuente — la explicación al tocar la cifra. */
export function explainLines(state: LedgerState, monthKey: string, catId: string): FigureLine[] {
  const lines = state.months[monthKey]?.lines ?? [];
  return lines.filter((l) => l.categoryId === catId).map((line) => ({
    line,
    author: typeof line.by === "string" && line.by !== "" ? line.by : null,
    funder: line.fundedBy ?? funderOf(state, catId),
    declaration: line.declaration === true,
  }));
}

/** El total de una categoría en un mes (menores, por moneda no: la
 * cifra simple de la vista — las líneas de la copia comparten la
 * moneda del libro en la práctica de la casa). */
export function categoryTotal(state: LedgerState, monthKey: string, catId: string): number {
  return explainLines(state, monthKey, catId).reduce((acc, f) => acc + f.line.amountMinor, 0);
}
