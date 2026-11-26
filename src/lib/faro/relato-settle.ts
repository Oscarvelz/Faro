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
 *              cuentas propias) con su cuenta de origen;
 *   abono    → payCard del motor (1.3.482): la transferencia xfer
 *              inactiva hacia la tarjeta, en la moneda de la
 *              tarjeta — pagar la tarjeta liquida la deuda, no es
 *              un gasto (el gasto ya contó al comprar).
 *   prestamo → addLoan / addLent del motor (1.3.483): el registro
 *              de la deuda en su lado — «debo» cuando me prestaron,
 *              «me-deben» cuando yo presté; no es una línea de
 *              flujo del mes, es el nacimiento de la deuda.
 *   el pago de vuelta (1.3.484): un ingreso con lentId se asienta
 *              con payLent y un gasto con loanId con payLoan — la
 *              línea normal que baja el registro de la deuda, en
 *              la moneda del préstamo.
 *
 * LA CERCA DEL DUPLICADO: un borrador marcado `duplicate` por el
 * relato YA está asentado en el libro — asentarlo otra vez sería el
 * error crítico de esta capacidad (el doble asiento). Se salta
 * siempre, lo diga quien lo diga.
 */
import { cardsOf, payCard } from "./cards.ts";
import { addLent, payLent } from "./debts.ts";
import { addLoan, payLoan } from "./loans.ts";
import { convertMinor, uid } from "./money.ts";
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
    if (d.op === "abono") continue; // el abono no es una línea de flujo: lo asienta settleRelatoDrafts con payCard
    if (d.op === "prestamo") continue; // el préstamo tampoco: nace como registro de deuda en settleRelatoDrafts
    if (d.lentId || d.loanId) continue; // el pago de vuelta: lo asienta settleRelatoDrafts con payLent/payLoan (la línea lleva la etiqueta)
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
  // EL ABONO (puerto 1.3.482): pagar la tarjeta liquida la deuda,
  // no es un gasto — la costura lo asienta con payCard del motor
  // (transferencia xfer inactiva en la moneda DE LA TARJETA: si el
  // relato trajo otra moneda, se convierte con la tasa del libro
  // antes de abonar, para que la cifra que liquida sea la dicha).
  let s = state;
  const abonoLabel = lang === "es" ? "Abono" : "Payment";
  for (const d of drafts) {
    if (d.duplicate || d.op !== "abono" || !d.cardId) continue;
    const card = cardsOf(s).find((c) => c.id === d.cardId);
    if (!card) continue;
    const minor = d.currency === card.currency ? d.amountMinor : convertMinor(d.amountMinor, d.currency, card.currency, s.settings.rateE4);
    s = payCard(s, card.id, minor, d.date, uid(), abonoLabel);
  }
  // EL PRÉSTAMO (puerto 1.3.483): el borrador trae el lado
  // declarado — «debo» nace con addLoan (me prestaron; el
  // concepto es quien prestó) y «me-deben» con addLent (yo
  // presté; el concepto es la persona). Sin interés declarado:
  // el relato no oyó tasa y la casa no inventa ninguna.
  for (const d of drafts) {
    if (d.duplicate || d.op !== "prestamo") continue;
    if (d.debtSide === "debo") {
      s = addLoan(s, { id: uid(), lender: d.concept, who: "person", kind: "plain", amountMinor: d.amountMinor, currency: d.currency, aprBps: 0, takenOn: d.date, book: "fixed", note: "" });
    } else {
      s = addLent(s, { id: uid(), person: d.concept, kind: "plain", amountMinor: d.amountMinor, currency: d.currency, aprBps: 0, startedOn: d.date, dueOn: "", note: "" });
    }
  }
  // EL PAGO DE VUELTA Y SU ESPEJO (puerto 1.3.484): el borrador
  // etiquetado por el relato (lentId/loanId) se asienta con
  // payLent/payLoan del motor — la línea normal que baja el
  // registro — convirtiendo el monto a la moneda del préstamo
  // con la tasa del libro, como hace la costura del abono.
  const payLabel = lang === "es" ? "Abono" : "Payment";
  const loanLabel = lang === "es" ? "Préstamo" : "Loan";
  for (const d of drafts) {
    if (d.duplicate) continue;
    if (d.lentId) {
      const minor = d.debtCurrency && d.currency !== d.debtCurrency ? convertMinor(d.amountMinor, d.currency, d.debtCurrency, s.settings.rateE4) : d.amountMinor;
      s = payLent(s, d.lentId, minor, d.date, uid(), payLabel);
    } else if (d.loanId) {
      const minor = d.debtCurrency && d.currency !== d.debtCurrency ? convertMinor(d.amountMinor, d.currency, d.debtCurrency, s.settings.rateE4) : d.amountMinor;
      s = payLoan(s, d.loanId, minor, d.date, uid(), loanLabel);
    }
  }
  const lines = relatoLines(s, drafts, lang);
  if (!lines.length) return s;
  const months = { ...s.months };
  for (const line of lines) {
    const bucket = months[line.monthKey] ?? { lines: [] };
    months[line.monthKey] = { lines: [...bucket.lines, line] };
  }
  return { ...s, months };
}
