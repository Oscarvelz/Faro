/**
 * relato-settle — la costura de canon del puerto de la Rama Agente
 * (1.3.445): el asiento confirmado de los borradores del relato.
 *
 * parseRelato (relato.ts) es puro: propone borradores y su eco, y la
 * respuesta propone y el toque dispone. Este módulo es el toque hecho
 * código: convierte cada borrador confirmado en la línea del libro que
 * le corresponde, con las formas del propio libro —
 *   gasto    → línea variable de gasto (su categoría y sub si el
 *              relato las ubicó; la cuenta de origen si se nombró);
 *   ingreso  → línea variable de ingreso (la cuenta si se nombró);
 *   mover a un bolsillo  → la línea de apartado (gasto variable sobre
 *              f-ahorro con su sub: así entra el dinero a un bolsillo
 *              en todo Faro);
 *   mover desde un bolsillo → la línea de vuelta (ingreso variable
 *              sobre f-ahorro con su sub);
 *   mover entre bolsillos → las dos líneas, la de vuelta y la de
 *              apartado, para que el stock de cada bolsillo quede bien;
 *   mover entre cuentas → una línea de traslado (xfer, inactiva:
 *              nunca cuenta en totales, como todo traslado entre
 *              cuentas propias) con su cuenta de origen.
 *
 * LA CERCA DEL DUPLICADO: un borrador marcado `duplicate` por el
 * relato YA está asentado en el libro — asentarlo otra vez sería el
 * error crítico de esta capacidad (el doble asiento). Se salta
 * siempre, lo diga quien lo diga.
 */
import { uid } from "./money.ts";
import type { RelatoDraft } from "./relato.ts";
import type { Lang, LedgerState, Line } from "./types.ts";

function baseLine(d: RelatoDraft, kind: Line["kind"]): Line {
  return {
    id: uid(), seriesId: uid(), monthKey: d.date.slice(0, 7), kind,
    concept: d.concept, amountMinor: d.amountMinor, currency: d.currency,
    active: true, note: "", categoryId: "", subId: "", recurring: false,
    storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: d.currency,
    icon: "", history: [], bookedOn: d.date, startedOn: "",
  };
}

function located(state: LedgerState, d: RelatoDraft): { categoryId: string; subId: string } {
  const cat = state.structure.categories.find((c) => c.id === d.categoryId);
  if (!cat) return { categoryId: "", subId: "" };
  const subOk = d.subId !== "" && cat.subs.some((s) => s.id === d.subId);
  return { categoryId: cat.id, subId: subOk ? d.subId : "" };
}

/** Los borradores confirmados → las líneas que se asientan. */
export function relatoLines(state: LedgerState, drafts: RelatoDraft[], lang: Lang): Line[] {
  const out: Line[] = [];
  const transfer = lang === "es" ? "Traslado" : "Transfer";
  for (const d of drafts) {
    if (d.duplicate) continue; // ya asentado: jamás dos veces
    if (d.op === "gasto") {
      const line = baseLine(d, "expense-variable");
      Object.assign(line, located(state, d));
      if (d.from?.kind === "acct") line.sourceId = d.from.id;
      out.push(line);
    } else if (d.op === "ingreso") {
      const line = baseLine(d, "income-variable");
      Object.assign(line, located(state, d));
      const acct = d.to?.kind === "acct" ? d.to : d.from?.kind === "acct" ? d.from : null;
      if (acct) line.sourceId = acct.id;
      out.push(line);
    } else {
      // mover
      const fromPocket = d.from?.kind === "bolsillo" ? d.from : null;
      const toPocket = d.to?.kind === "bolsillo" ? d.to : null;
      if (fromPocket) {
        const back = baseLine(d, "income-variable");
        back.concept = transfer;
        back.categoryId = "f-ahorro";
        back.subId = fromPocket.id;
        out.push(back);
      }
      if (toPocket) {
        const into = baseLine(d, "expense-variable");
        into.concept = transfer;
        into.categoryId = "f-ahorro";
        into.subId = toPocket.id;
        if (d.from?.kind === "acct") into.sourceId = d.from.id;
        out.push(into);
      }
      if (!fromPocket && !toPocket) {
        const xfer = baseLine(d, "expense-variable");
        xfer.concept = transfer;
        xfer.active = false;
        xfer.xfer = true;
        if (d.from?.kind === "acct") xfer.sourceId = d.from.id;
        out.push(xfer);
      }
    }
  }
  return out;
}

/** El estado con los borradores asentados en el mes de cada fecha. */
export function settleRelatoDrafts(state: LedgerState, drafts: RelatoDraft[], lang: Lang): LedgerState {
  const lines = relatoLines(state, drafts, lang);
  if (!lines.length) return state;
  const months = { ...state.months };
  for (const line of lines) {
    const bucket = months[line.monthKey] ?? { lines: [] };
    months[line.monthKey] = { lines: [...bucket.lines, line] };
  }
  return { ...state, months };
}
