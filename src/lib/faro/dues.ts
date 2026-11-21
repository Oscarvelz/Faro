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
import { ISO_DAY, loanPays, loanState, loansOf, todayIso } from "./loans";
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

  // Cobertura por bookedOn (cura de la ola 24, G24-4): el juicio que la
  // cura 23 declaró para el ASENTAMIENTO — un período anotado como pagado
  // por la instancia nacida del autopay (bookedOn = el período) está
  // cubierto — manda también en el ANUNCIO, sobre lo ya nacido. Los
  // libros asentados con la forma vieja (.356–.360) llevan la instancia
  // con nextDue = su fecha ya pagada, y esta ventana la anunciaba vencida
  // por el resto del mes: la regla P4 (que el mes ruede) era la única
  // cura. Ahora: un período que una instancia `auto-…` de la serie anota
  // pagado con su bookedOn NO se anuncia — salvo que una instancia de la
  // PROPIA persona anote el mismo período, porque su papel manda sobre la
  // anotación de la máquina. La instancia que cubre debe ser un papel de
  // pago vivo (activa, no apartada), con los mismos filtros con que la
  // caminata lee a sus candidatos. Toda superficie lee ESTA ventana
  // (avisos, Asesor, Preguntar), así que la verdad se hereda entera.
  const autoCovered = new Set<string>();
  const personCovered = new Set<string>();
  for (const bucket of Object.values(state.months)) {
    for (const l of bucket.lines) {
      if (!l.active || l.rest) continue;
      const booked = (l.bookedOn || "").slice(0, 10);
      if (!ISO_DAY.test(booked)) continue;
      const sig = `${l.seriesId || l.id}@${booked}`;
      if (l.id.startsWith("auto-")) autoCovered.add(sig);
      else personCovered.add(sig);
    }
  }

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
      if (!l.active || l.rest || l.xfer || l.kind.startsWith("income") || roleOf(state, l.categoryId) === "savings") continue;
      if (l.loanId || l.cardId || l.lentId) continue; // entity dues come from their own entries below
      const on = (l.nextDue || "").slice(0, 10);
      if (!ISO_DAY.test(on) || on > end) continue;
      if (k < firstKey && on < `${firstKey}-01`) continue;
      const sig = `${l.seriesId || l.id}@${on}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      if (autoCovered.has(sig) && !personCovered.has(sig)) continue; // pagado y anotado: no se anuncia
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

  // Received loans with a due day (1.3.149): the current occurrence of that day. No installment
  // amount exists in the model, so amt stays null — consumers count the entry and skip the sum.
  for (const loan of loansOf(state)) {
    if (loan.archived || !loan.dueDay) continue;
    if (loanState(state, loan, today).left <= 0) continue;
    // PREJUDICE PJ-4: this module's own contract is «overdue entries are included —
    // what is overdue is due», and the card branch has surfaced a past due since
    // 1.3.147. The loan branch rolled every date forward, so a loan could NEVER be
    // overdue here. Now: this month's occurrence stands in the past when it has
    // passed unpaid — a payment booked on or after it covers the cycle (the card
    // rule) and the date rolls forward; a loan taken after this month's due day
    // owes its first occurrence next month.
    const t = new Date(`${today}T12:00:00`);
    const lastDay = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    const occ = `${today.slice(0, 8)}${String(Math.min(loan.dueDay, lastDay)).padStart(2, "0")}`;
    let on = nextDueDayOn(loan.dueDay, today);
    if (occ < today && loan.takenOn <= occ) {
      const covered = loanPays(state, loan.id).some((l) => !l.rest && (l.bookedOn || `${l.monthKey}-01`) >= occ);
      if (!covered) on = occ;
    }
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
