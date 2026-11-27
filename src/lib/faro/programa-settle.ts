/**
 * programa-settle — la costura de canon del puerto de la Rama Agente
 * (1.3.446): la programación confirmada de los borradores de E3.
 *
 * parsePrograma (relato.ts) es puro: propone borradores y su eco, y
 * la respuesta propone y el toque dispone. Este módulo es el toque
 * hecho código: convierte cada borrador confirmado en la línea
 * programada del libro, con las formas del propio libro —
 *   fijo         → línea fija (gasto o ingreso) con su monto, su
 *                  cadencia y su primer vencimiento: la misma forma
 *                  que nace del editor de líneas;
 *   recordatorio → la misma línea fija con monto 0: la app recuerda
 *                  y el monto se confirma al llegar (la clase de la
 *                  propuesta §8: lo variable no se inventa);
 *   una sola vez → línea fija sin recurrencia, con su fecha como
 *                  vencimiento: queda en su mes y no se copia.
 *
 * La serie nace con su primera instancia en el mes de su primera
 * fecha (seriesId = el id de la instancia, como en todo nacimiento
 * del libro); copyRecurring la lleva a los meses siguientes por la
 * mecánica de la casa. La vigilancia (relato.ts) la lee desde ahí.
 *
 * LA CERCA DEL DUPLICADO: un borrador marcado `duplicate` por
 * parsePrograma YA está programado en el libro — programarlo otra
 * vez crearía la serie dos veces. Se salta siempre.
 */
import { uid } from "./money.ts";
import { cardsOf, storedCards } from "./cards.ts";
import type { ProgramaDraft } from "./relato.ts";
import type { LedgerState, Line } from "./types.ts";

function located(state: LedgerState, d: ProgramaDraft): { categoryId: string; subId: string } {
  const cat = state.structure.categories.find((c) => c.id === d.categoryId);
  if (!cat) return { categoryId: "", subId: "" };
  const subOk = d.subId !== "" && cat.subs.some((s) => s.id === d.subId);
  return { categoryId: cat.id, subId: subOk ? d.subId : "" };
}

function programaLine(state: LedgerState, d: ProgramaDraft): Line {
  const id = uid();
  const once = d.cadence === "once";
  /* EL ABONO PROGRAMADO (1.3.488): nace con la forma exacta de un
   * abono de la casa (la de payCard) — transferencia inactiva con
   * cardId e icono de tarjeta — fechada en su primera fecha y, si
   * su cadencia se repite, con su marca de recurrencia y su
   * próximo vencimiento: los totales la leen en cero (xfer), el
   * saldo de la tarjeta solo la cuenta desde su fecha (la regla
   * 1.3.147 de cardFigures) y la copia de meses la lleva por su
   * marca, como a cualquier línea de la persona. Jamás nace como
   * gasto: el gasto ya se contó al comprar con la tarjeta. */
  if (d.op === "abono" && d.cardId) {
    const card = cardsOf(state).find((c) => c.id === d.cardId) ?? storedCards(state).find((c) => c.id === d.cardId);
    if (card) {
      const label = state.settings.lang === "en" ? "Payment" : "Abono";
      return {
        id, seriesId: id, monthKey: d.firstDate.slice(0, 7),
        kind: "expense-variable", concept: `${label} · ${card.name}`, amountMinor: d.amountMinor ?? 0, currency: card.currency,
        active: false, note: "", categoryId: "", subId: "",
        recurring: !once, storeId: "", providerId: "", productCode: "", productUrl: "",
        cadence: once ? "" : (d.cadence as Exclude<ProgramaDraft["cadence"], "once">),
        nextDue: d.firstDate, aprBps: card.aprBps, balanceMinor: null, balanceCurrency: card.currency,
        icon: "CreditCard", history: [], bookedOn: d.firstDate, startedOn: d.firstDate,
        xfer: true, cardId: card.id,
      };
    }
  }
  return {
    id, seriesId: id, monthKey: d.firstDate.slice(0, 7),
    kind: d.op === "ingreso" ? "income-fixed" : "expense-fixed",
    concept: d.concept, amountMinor: d.amountMinor ?? 0, currency: d.currency,
    active: true, note: "", ...located(state, d),
    recurring: !once,
    storeId: "", providerId: "", productCode: "", productUrl: "",
    cadence: once ? "" : (d.cadence as Exclude<ProgramaDraft["cadence"], "once">),
    nextDue: d.firstDate, aprBps: 0, balanceMinor: null, balanceCurrency: d.currency,
    icon: "", history: [], bookedOn: d.firstDate, startedOn: d.firstDate,
  };
}

/** Los borradores confirmados → las líneas programadas que nacen. */
export function programaLines(state: LedgerState, drafts: ProgramaDraft[]): Line[] {
  const out: Line[] = [];
  for (const d of drafts) {
    if (d.duplicate) continue; // ya programado: jamás dos veces
    out.push(programaLine(state, d));
  }
  return out;
}

/** El estado con los borradores programados en el mes de su primera fecha. */
export function settleProgramaDrafts(state: LedgerState, drafts: ProgramaDraft[]): LedgerState {
  const lines = programaLines(state, drafts);
  if (!lines.length) return state;
  const months = { ...state.months };
  for (const line of lines) {
    const bucket = months[line.monthKey] ?? { lines: [] };
    months[line.monthKey] = { lines: [...bucket.lines, line] };
  }
  return { ...state, months };
}
