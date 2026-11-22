/* ═══ EL DINERO DE CADA ÁREA (Pieza C6, 1.3.396; brief §C6).
 *
 * El mapa de financiación dice, por categoría, quién pone el dinero
 * de pie: el dueño (desde su cuenta predeterminada — lo no marcado)
 * o una persona del libro (de su dinero). Financiar de pie NO es
 * una aportación: es la fuente normal del área.
 *
 * · Una línea de un área financiada por un miembro nace marcada
 *   `fundedBy` con su cuenta y NO mueve ninguna cuenta de la casa:
 *   el gasto del área es real, el dinero no es del dueño.
 * · En el libro de quien financió nace su REFLEJO: una línea suya,
 *   enlazada a la compartida por `mirrorOf` y deduplicada por ese
 *   enlace — su Asesor la cuenta una vez, como línea propia. Si la
 *   línea compartida se borra, el reflejo QUEDA como línea suya:
 *   su dinero salió de verdad.
 * · El pago esporádico de un miembro en un área del dueño es otra
 *   cosa: una APORTACIÓN, y entra en el libro del dueño como LA
 *   DECLARACIÓN — firmada por ella, con el nombre que ella da a su
 *   cuenta. Faro presenta declaraciones firmadas, nunca hechos
 *   verificados: no hay conexión bancaria y no se finge. */
import type { LedgerState, Line } from "./types";
import { stampLine, type Author } from "./sign";

/** Quién financia de pie esta categoría: la cuenta de la persona, o
 * null cuando financia el dueño (lo no marcado). Lectura desconfiada:
 * un valor que no sea texto no vacío no financia a nadie. */
export function funderOf(state: LedgerState, catId: string): string | null {
  const v = state.funding?.[catId];
  return typeof v === "string" && v.trim() ? v : null;
}

/** El mapa entero, para la vista previa y las superficies: cada
 * categoría con su fuente («owner» o la cuenta de la persona). */
export function fundingMapOf(state: LedgerState): { cat: string; by: string }[] {
  return state.structure.categories.map((c) => ({ cat: c.id, by: funderOf(state, c.id) ?? "owner" }));
}

/** El sello del dinero al nacer una línea: si su área la financia un
 * miembro, la línea nace con su marca; si la financia el dueño, la
 * línea queda sin marca (el dinero del dueño es lo no marcado). Una
 * marca vieja que ya no corresponde al mapa se retira: el mapa manda. */
export function stampFunding(line: Line, state: LedgerState): Line {
  const funder = line.categoryId ? funderOf(state, line.categoryId) : null;
  if (funder) return line.fundedBy === funder ? line : { ...line, fundedBy: funder };
  if (line.fundedBy === undefined) return line;
  const { fundedBy: _drop, ...rest } = line;
  return rest as Line;
}

/** ¿Ya existe en este libro el reflejo de esa línea compartida? La
 * deduplicación es por el enlace, no por el parecido: misma cuenta
 * de libro y mismo id de línea. */
export function mirrorExists(state: LedgerState, book: string, lineId: string): boolean {
  for (const m of Object.values(state.months)) {
    for (const l of m.lines) if (l.mirrorOf && l.mirrorOf.book === book && l.mirrorOf.line === lineId) return true;
  }
  return false;
}

/** El reflejo de una línea compartida en el libro de quien la
 * financió: su línea, con su dinero — por eso fundedBy se retira (en
 * su libro es dinero propio, lo no marcado) y la categoría se
 * conserva solo si existe en su estructura. */
export function makeMirror(shared: Line, herState: LedgerState, book: string, makeId: () => string): Line {
  const { fundedBy: _f, declaration: _d, declaredAccount: _da, ...rest } = shared;
  return {
    ...rest,
    id: makeId(),
    seriesId: makeId(),
    categoryId: herState.structure.categories.some((c) => c.id === shared.categoryId) ? shared.categoryId : "",
    mirrorOf: { book, line: shared.id },
  };
}

/** Aplicar el reflejo: nace una sola vez (deduplicado por el enlace)
 * en el mes de la línea compartida; si ya existe, el libro vuelve
 * intacto — la misma referencia. */
export function applyMirror(herState: LedgerState, shared: Line, book: string, makeId: () => string): LedgerState {
  if (mirrorExists(herState, book, shared.id)) return herState;
  const mirror = makeMirror(shared, herState, book, makeId);
  const month = herState.months[shared.monthKey] ?? { lines: [] };
  return { ...herState, months: { ...herState.months, [shared.monthKey]: { lines: [...month.lines, mirror] } } };
}

/** LA DECLARACIÓN: el pago esporádico de un miembro en un área del
 * dueño, como entra en el libro del dueño — la línea firmada por
 * ella, marcada como declaración, con el nombre que ella da a su
 * cuenta y su dinero por fuente. No nombra ninguna cuenta de la
 * casa: Faro garantiza el registro firmado, no el pago. */
export function makeDeclaration(line: Line, author: Author, herAccountName: string): Line {
  return stampLine({ ...line, declaration: true, declaredAccount: herAccountName.trim(), fundedBy: author.id }, author);
}
