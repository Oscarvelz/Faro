/**
 * Loans (Nov 2026). One model and one interest rule for both sides of Cobros:
 * - Me deben (loans Oscar made, kept on the device as before) and
 * - Debo → Préstamos (loans Oscar received, kept in the ledger so backup, export and sync carry them).
 * Interest is simple, counted by the day on the amount lent: amount × rate × days / 365. Payments never reduce it.
 * There is no second money system: a payment toward a received loan is a normal expense line with `loanId`,
 * in the Fijos or Variables book the loan names. Paid = the sum of those lines. Delete the line, the payment is gone.
 */
import { convertMinor } from "./money";
import type { Category, Currency, LedgerState, Line, Loan } from "./types";

export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayGap(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T12:00:00`);
  const b = new Date(`${to.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

/** The shared rule: simple interest by the day on the amount lent (minor units, rounded half away). */
export function simpleInterest(amountMinor: number, aprBps: number, from: string, to: string): number {
  if (aprBps <= 0 || amountMinor <= 0 || !from) return 0;
  return Math.round((amountMinor * aprBps * dayGap(from, to)) / (10000 * 365));
}

/** What any loan (made or received) stands at: interest so far, paid, and pending = amount + interest − paid (never below 0). */
export function loanFigures(amountMinor: number, kind: "plain" | "interest", aprBps: number, from: string, paidMinor: number, today = todayIso()) {
  const interest = kind === "interest" ? simpleInterest(amountMinor, aprBps, from, today) : 0;
  return { interest, paid: paidMinor, left: Math.max(0, amountMinor + interest - paidMinor) };
}

/* ---------- received loans (ledger) ---------- */

export function normalizeLoan(l: Loan): Loan {
  return {
    id: String(l.id),
    lender: typeof l.lender === "string" ? l.lender : "",
    who: l.who === "entity" ? "entity" : "person",
    kind: l.kind === "interest" ? "interest" : "plain",
    amountMinor: typeof l.amountMinor === "number" ? l.amountMinor : 0,
    currency: l.currency === "USD" ? "USD" : "NIO",
    aprBps: typeof l.aprBps === "number" && l.aprBps > 0 ? l.aprBps : 0,
    takenOn: typeof l.takenOn === "string" && ISO_DAY.test(l.takenOn) ? l.takenOn : "",
    book: l.book === "variable" ? "variable" : "fixed",
    note: typeof l.note === "string" ? l.note : "",
    ...(l.archived ? { archived: true, archivedOn: l.archivedOn ?? "", unpaidMinor: l.unpaidMinor ?? 0 } : {}),
  };
}

/** Every received loan, archived ones too. Old ledgers have none. */
export function loansOf(state: LedgerState | null | undefined): Loan[] {
  return Array.isArray(state?.loans) ? state!.loans!.filter((l) => l && typeof l.id === "string").map(normalizeLoan) : [];
}

/** Payment lines of one loan, oldest first. */
export function loanPays(state: LedgerState, id: string): Line[] {
  const out: Line[] = [];
  for (const bucket of Object.values(state.months)) for (const line of bucket.lines) if (line.loanId === id && line.active) out.push(line);
  return out.sort((a, b) => (a.bookedOn || a.monthKey).localeCompare(b.bookedOn || b.monthKey));
}

/** Figures of a received loan in its own currency. */
export function loanState(state: LedgerState, loan: Loan, today = todayIso()) {
  const paid = loanPays(state, loan.id).reduce((sum, line) => sum + convertMinor(line.amountMinor, line.currency, loan.currency, state.settings.rateE4), 0);
  return loanFigures(loan.amountMinor, loan.kind, loan.aprBps, loan.takenOn, paid, today);
}

/** Totals of the active received loans in the view currency (what Estudio, the Asesor and export read). */
export function loanTotals(state: LedgerState | null | undefined, today = todayIso()) {
  const zero = { count: 0, borrowed: 0, interest: 0, paid: 0, left: 0, archived: 0 };
  if (!state) return zero;
  const { display, rateE4 } = state.settings;
  const view = (minor: number, currency: Currency) => convertMinor(minor, currency, display, rateE4);
  return loansOf(state).reduce((acc, loan) => {
    if (loan.archived) return { ...acc, archived: acc.archived + 1 };
    const f = loanState(state, loan, today);
    return {
      ...acc,
      count: acc.count + 1,
      borrowed: acc.borrowed + view(loan.amountMinor, loan.currency),
      interest: acc.interest + view(f.interest, loan.currency),
      paid: acc.paid + view(f.paid, loan.currency),
      left: acc.left + view(f.left, loan.currency),
    };
  }, zero);
}

export function addLoan(state: LedgerState, loan: Loan): LedgerState {
  return { ...state, loans: [normalizeLoan(loan), ...loansOf(state)] };
}

/** Where a payment lands: the debt category of that book, else its first visible category. */
export function loanCategory(state: LedgerState, book: "fixed" | "variable"): { cat: Category | undefined; subId: string } {
  const cats = state.structure.categories.filter((c) => c.group === book);
  const cat = cats.find((c) => c.role === "debt" && !c.hidden) ?? cats.find((c) => c.role === "debt") ?? cats.find((c) => !c.hidden) ?? cats[0];
  const sub = cat?.subs.find((s) => s.id.endsWith(".personal")) ?? cat?.subs.find((s) => !s.hidden);
  return { cat, subId: sub?.id ?? "" };
}

/**
 * A payment toward a received loan: a normal expense line in the month of its date, in the loan's book,
 * so it counts in Gastaré, the books, the debt signal and every total. `amountMinor` is in the loan's currency.
 */
export function payLoan(state: LedgerState, loanId: string, amountMinor: number, date: string, id: string, label: string): LedgerState {
  const loan = loansOf(state).find((l) => l.id === loanId);
  if (!loan || amountMinor <= 0) return state;
  const day = ISO_DAY.test(date) ? date : todayIso();
  const { cat, subId } = loanCategory(state, loan.book);
  const line: Line = {
    id, seriesId: id, monthKey: day.slice(0, 7), kind: loan.book === "variable" ? "expense-variable" : "expense-fixed",
    concept: `${label} · ${loan.lender}`, amountMinor, currency: loan.currency, active: true, note: "",
    categoryId: cat?.id ?? "", subId, recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "",
    cadence: "", nextDue: "", aprBps: loan.aprBps, balanceMinor: null, balanceCurrency: loan.currency, icon: "Landmark",
    history: [], bookedOn: day, loanId,
  };
  const bucket = state.months[line.monthKey] ?? { lines: [] };
  return { ...state, months: { ...state.months, [line.monthKey]: { lines: [...bucket.lines, line] } } };
}

/** Archive keeps the loan and its payment lines; it records what was still pending. */
export function archiveLoan(state: LedgerState, loanId: string, today = todayIso()): LedgerState {
  return {
    ...state,
    loans: loansOf(state).map((l) => (l.id === loanId ? { ...l, archived: true, archivedOn: today, unpaidMinor: loanState(state, l, today).left } : l)),
  };
}
