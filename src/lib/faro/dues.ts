/**
 * The ONE dues window (1.3.149, Oleada 4 · audit C3). Before this module, "due soon" had four
 * incompatible computations: book-side's next-30-days (current month's subscriptions only), the
 * Asesor rule's 7/14-day windows over dated lines + card minimums, the Asesor's 30-day count of
 * dated lines (no sum, no cards, no loans), and the widget's own snapshot rule. Every surface now
 * reads THIS function and only chooses its horizon (7/14/30 days).
 *
 * Entries are normalized: { kind, name, on, amt } — amt in the view currency, or null when the
 * amount due is not modelled (a loan's due day says WHEN, and the app has no installment amount
 * for it, so no figure is invented). `on` may precede today: overdue entries are included, and
 * each surface decides whether to show them (book-side does, the 14-day rule does not).
 * Covered: cuotas/subscriptions (dated outgoing lines — cuotas ARE subscription lines in Faro),
 * credit cards (their minimum, or the balance when no minimum is known), received loans with a
 * due day (new in 1.3.149), and lent items (money due IN, on their dueOn).
 */
import { cardFigures, cardsOf } from "./cards";
import { lentOf, lentState } from "./debts";
import { ISO_DAY, loanState, loansOf, todayIso } from "./loans";
import { convertMinor } from "./money";
import type { LedgerState, Line } from "./types";

export type DueKind = "cuota" | "card" | "loan" | "lent";
export type DueEntry = {
  kind: DueKind;
  name: string;
  /** YYYY-MM-DD the money is due; may be before today (overdue). */
  on: string;
  /** View-currency minor units, or null when the amount due is not modelled (loans). */
  amt: number | null;
  /** Source id: line id, card id, loan id or lent id. */
  id: string;
  /** The source line, for cuota entries (consumers name and navigate from it). */
  line?: Line;
};

function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Next occurrence of a day-of-month on or after `today`, clamped to the month's length —
 *  the same reading CreditCard.dueDay gets in cards.nextDue. */
export function nextDueDayOn(dueDay: number, today: string): string {
  const t = new Date(`${today}T12:00:00`);
  for (let k = 0; k < 2; k++) {
    const y = t.getFullYear(), m = t.getMonth() + k;
    const last = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(dueDay, last), 12);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (iso >= today) return iso;
  }
  return "";
}

/**
 * Everything due from any past date up to `today + days`, oldest first. There is no lower bound:
 * what is overdue is due. Consumers that only want the future filter `on >= today` themselves.
 */
export function duesWindow(state: LedgerState, days: number, today = todayIso()): DueEntry[] {
  if (!ISO_DAY.test(today)) return [];
  const { display, rateE4 } = state.settings;
  const view = (minor: number, currency: Line["currency"]) => convertMinor(minor, currency, display, rateE4);
  const end = addDays(today, Math.max(0, days));
  const out: DueEntry[] = [];

  // Cuotas / subscriptions: dated outgoing lines in the buckets the window spans (rules.ts' old
  // isOut test: active, not a transfer, not income, not a savings move), deduplicated by series+day
  // exactly as the 14-day rule always did.
  const seen = new Set<string>();
  const firstKey = today.slice(0, 7);
  const lastKey = end.slice(0, 7);
  // 1.3.163 (audit P4): past month buckets are scanned too — a cuota filed in a past bucket whose
  // stored nextDue points into the current era was invisible here (the scan began at this month).
  // A past bucket contributes only obligations dated from this month on; its own era's stale
  // instances stay buried (the live instance is filed in its own month), and the series+day
  // dedup below still applies, so nothing is ever counted twice.
  for (const k of Object.keys(state.months).sort()) {
    if (k > lastKey) continue;
    for (const l of state.months[k]?.lines ?? []) {
      if (!l.active || l.xfer || l.kind.startsWith("income") || roleOf(state, l.categoryId) === "savings") continue;
      if (l.loanId || l.cardId || l.lentId) continue; // entity dues come from their own entries below
      const on = (l.nextDue || "").slice(0, 10);
      if (!ISO_DAY.test(on) || on > end) continue;
      if (k < firstKey && on < `${firstKey}-01`) continue;
      const sig = `${l.seriesId || l.id}@${on}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push({ kind: "cuota", name: (l.concept || "").trim() || "—", on, amt: view(l.amountMinor, l.currency), id: l.id, line: l });
    }
  }

  // Credit cards: the minimum when the bank showed one, else the whole balance (the rule the
  // 14-day rule and the widget already shared). cardFigures surfaces a PAST due date when the
  // current cycle is unpaid (1.3.147), so an overdue card enters as overdue.
  for (const c of cardsOf(state)) {
    const f = cardFigures(state, c, today);
    if (!f.known || f.balance <= 0 || !f.dueOn || f.dueOn > end) continue;
    const due = f.min != null && f.min > 0 ? Math.min(f.min, f.balance) : f.balance;
    out.push({ kind: "card", name: c.name, on: f.dueOn, amt: view(due, c.currency), id: c.id });
  }

  // Received loans with a due day (1.3.149): the next occurrence of that day. No installment
  // amount exists in the model, so amt stays null — consumers count the entry and skip the sum.
  for (const loan of loansOf(state)) {
    if (loan.archived || !loan.dueDay) continue;
    if (loanState(state, loan, today).left <= 0) continue;
    const on = nextDueDayOn(loan.dueDay, today);
    if (!on || on > end) continue;
    out.push({ kind: "loan", name: loan.lender, on, amt: null, id: loan.id });
  }

  // Lent money (Me deben): due IN on the day the user expects to collect.
  for (const l of lentOf(state)) {
    if (l.archived || !ISO_DAY.test(l.dueOn || "") || l.dueOn > end) continue;
    const left = lentState(state, l, today).left;
    if (left <= 0) continue;
    out.push({ kind: "lent", name: l.person, on: l.dueOn, amt: view(left, l.currency), id: l.id });
  }

  return out.sort((a, b) => a.on.localeCompare(b.on) || a.name.localeCompare(b.name));
}
