/**
 * The year as a report (1.3.149, Oleada 4). Before this module the year existed only as chart
 * points (yearPoints); no surface totalled it. Every figure here is COMPOSED from the existing
 * engine — summarize per month, categorySlices per month, savingsStock at year end, the loan
 * interest-paid total — so the year can never disagree with the months it is made of.
 *
 * Savings at year end is split by Oscar's three types, from savingsStock's own split:
 * retirement (*.retiro) and emergency (*.emergencia) by their subs, and goals = the rest
 * (total − emergency − retirement): every other pocket is a specific-goal pocket by definition.
 */
import { colorFor } from "./colors";
import type { makeNamer } from "./defaults";
import { categorySlices, foldSlices, summarize } from "./engine";
import { interestPaidTotal } from "./loans";
import { savingsStock } from "./savings";
import type { Lang, LedgerState, Slice } from "./types";

export type YearMonth = { key: string; label: string; income: number; expense: number; net: number; has: boolean };
export type YearReport = {
  year: number;
  /** View-currency minor units, the sum of the twelve monthly summarize figures. */
  income: number;
  expense: number;
  net: number;
  /** Remittances sent in the year (summarize's own remit figure, summed). */
  remittance: number;
  /** Interest PAID on received loans in the year (recorded splits only, 1.3.149). */
  interestPaid: number;
  months: YearMonth[];
  /** Top categories of the year, folded with the Otros remainder rule (foldSlices, wave 3). */
  top: Slice[];
  /** Savings stock at Dec 31 of the year, split by the three types. */
  savingsEnd: { total: number; retirement: number; emergency: number; goals: number };
};

export function yearReport(state: LedgerState, year: number, lang: Lang, names: ReturnType<typeof makeNamer>): YearReport {
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short" });
  const months: YearMonth[] = [];
  let income = 0, expense = 0, remittance = 0;
  const byCat = new Map<string, Slice>();
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    const s = summarize(state, key, lang);
    income += s.income;
    expense += s.expense;
    remittance += s.remittance;
    months.push({
      key,
      label: fmt.format(new Date(year, m - 1, 1)),
      income: s.income,
      expense: s.expense,
      net: s.opportunity,
      has: (state.months[key]?.lines.length ?? 0) > 0,
    });
    for (const slice of categorySlices(state, key, names, lang)) {
      const prev = byCat.get(slice.id);
      if (prev) prev.minor += slice.minor;
      else byCat.set(slice.id, { ...slice });
    }
  }
  const merged = [...byCat.values()].filter((s) => s.minor !== 0).sort((a, b) => b.minor - a.minor);
  const stock = savingsStock(state, `${year}-12`);
  return {
    year,
    income,
    expense,
    net: income - expense,
    remittance,
    interestPaid: interestPaidTotal(state, year),
    months,
    top: foldSlices(merged, 8, lang, colorFor(state.structure, "otros")),
    savingsEnd: {
      total: stock.total,
      retirement: stock.retirement,
      emergency: stock.emergency,
      goals: stock.total - stock.emergency - stock.retirement,
    },
  };
}

/** Years that hold any ledger month bucket, ascending — the year view's stepper bounds. */
export function yearsWithData(state: LedgerState): number[] {
  const years = new Set<number>();
  for (const key of Object.keys(state.months)) {
    const y = Number(key.slice(0, 4));
    if (Number.isInteger(y) && y > 0) years.add(y);
  }
  return [...years].sort((a, b) => a - b);
}
