/**
 * «Puedes gastar hoy» (E-1, etapa 4 de los tres modos): el disponible diario.
 *
 * La fórmula es la del diseño, sin atajos: (lo libre del mes − los compromisos
 * que quedan) ÷ los días que quedan. Cada entrada es la cifra de su motor
 * único, para que el número nunca sea una segunda verdad:
 *
 *  - Lo libre del mes es `summarize().opportunity` — la misma cifra que la
 *    barra de Central enseña como «Queda» (desk-left).
 *  - Los compromisos que quedan salen de LA ventana única de vencimientos
 *    (`duesWindow`) hasta el último día del mes, clases cuota y tarjeta:
 *    la cuota cuya serie ya vive como línea activa en el mes en curso NO se
 *    resta dos veces (su monto ya está dentro de lo libre; se clasifica por
 *    presencia de la serie en el mes en curso, no por el mes de la instancia
 *    que la ventana devuelve, porque su deduplicación puede traer la
 *    instancia vieja de una serie que también vive en este mes); la tarjeta
 *    entra por la cifra que la ventana da (su mínimo, o el saldo si el banco
 *    no mostró mínimo), vencida o por vencer; el préstamo con día de cobro
 *    no inventa cifra (su `amt` es null en la ventana y no entra en la
 *    resta — sus vencimientos los avisa la regla `due`, presente en los tres
 *    modos); lo prestado es dinero que ENTRA, no un compromiso.
 *  - Los días que quedan cuentan hoy (el último día del mes: 1).
 *
 * El resultado puede ser negativo y se lee negativo, con su explicación: un
 * día malo dice su cifra verdadera, nunca un cero falso.
 */
import { duesWindow } from "./dues";
import { summarize } from "./engine";
import { todayIso } from "./loans";
import { formatMoney, roundHalfAway } from "./money";
import type { Lang, LedgerState } from "./types";

export type TodaySpend = {
  /** Lo libre del mes (el opportunity del motor; la cifra de desk-left). */
  freeMinor: number;
  /** Los compromisos que quedan hasta fin de mes (cuotas y tarjetas de la ventana única). */
  dueMinor: number;
  /** Cuántos compromisos forman esa resta. */
  dueCount: number;
  /** Días que quedan del mes, hoy incluido (≥ 1). */
  daysLeft: number;
  /** El número: (libre − compromisos) ÷ días, redondeado; puede ser negativo. */
  perDayMinor: number;
};

function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

export function todaySpend(state: LedgerState, today: string = todayIso()): TodaySpend {
  const key = today.slice(0, 7);
  const freeMinor = summarize(state, key, state.settings.lang).opportunity;
  const lastDay = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
  const daysLeft = Math.max(1, lastDay - Number(today.slice(8, 10)) + 1);
  // Las series cuyo dinero ya vive dentro del mes en curso (la misma población
  // que la ventana recorre para las cuotas): restarlas otra vez contaría dos
  // veces el mismo compromiso.
  const inMonth = new Set<string>();
  for (const l of state.months[key]?.lines ?? []) {
    if (!l.active || l.rest || l.xfer || l.kind.startsWith("income") || roleOf(state, l.categoryId) === "savings") continue;
    if (l.loanId || l.cardId || l.lentId) continue;
    inMonth.add(l.seriesId || l.id);
  }
  let dueMinor = 0;
  let dueCount = 0;
  for (const e of duesWindow(state, daysLeft - 1, today)) {
    if (e.amt == null) continue; // préstamos: sin cifra modelada no se inventa ninguna
    if (e.kind === "card") { dueMinor += e.amt; dueCount += 1; continue; }
    if (e.kind !== "cuota") continue; // lent: dinero que entra, no compromiso
    const sid = e.line ? (e.line.seriesId || e.line.id) : e.id;
    if (inMonth.has(sid)) continue; // ya está dentro de lo libre
    dueMinor += e.amt;
    dueCount += 1;
  }
  const perDayMinor = roundHalfAway((freeMinor - dueMinor) / daysLeft);
  return { freeMinor, dueMinor, dueCount, daysLeft, perDayMinor };
}

export type TodayText = {
  fig: TodaySpend;
  /** Qué es el número, en llano. */
  what: string;
  /** La fórmula con las cifras reales del libro. */
  formula: string;
  /** Qué implica (dos formas: el día normal y el día en negativo). */
  note: string;
};

/** La explicación del número, compuesta en la lib (ES/EN) para que las cercas
 *  la caminen entera: las cifras que la forman, sin porcentajes, en dinero. */
export function todayText(state: LedgerState, today: string, lang: Lang): TodayText {
  const fig = todaySpend(state, today);
  const money = (m: number) => formatMoney(m, state.settings.display, lang);
  const es = lang === "es";
  const what = es
    ? "Es lo que hoy puedes gastar sin tocar lo que ya tiene compromiso: lo libre de tu mes, menos los compromisos que quedan, repartido entre los días que quedan."
    : "It is what you can spend today without touching money that is already committed: what is free in your month, minus the commitments still ahead, spread over the days left.";
  const formula = es
    ? `Libre del mes ${money(fig.freeMinor)} − compromisos que quedan ${money(fig.dueMinor)} (${fig.dueCount}) = ${money(fig.freeMinor - fig.dueMinor)} ÷ ${fig.daysLeft} ${fig.daysLeft === 1 ? "día" : "días"}`
    : `Free this month ${money(fig.freeMinor)} − commitments left ${money(fig.dueMinor)} (${fig.dueCount}) = ${money(fig.freeMinor - fig.dueMinor)} ÷ ${fig.daysLeft} ${fig.daysLeft === 1 ? "day" : "days"}`;
  const note = fig.perDayMinor < 0
    ? (es
      ? "Lo anotado ya supera a lo libre: el número se lee tal cual, sin maquillar, para que decidas con la verdad."
      : "What is written already exceeds what is free: the number reads as it is, unvarnished, so you decide with the truth.")
    : (es
      ? "Si anotas un gasto, el número baja solo. Lo que hoy no gastes se reparte entre los días que quedan: mañana el número sube."
      : "If you note a spend, the number drops on its own. What you do not spend today spreads over the days left: tomorrow the number rises.");
  return { fig, what, formula, note };
}
