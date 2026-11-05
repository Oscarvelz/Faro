/**
 * Deudas in Libros (1.3.92): Me deben (money the user lent) beside Debo (Cuotas + Préstamos).
 * - Me deben now lives in the ledger (`lent`), so it syncs, backs up and exports. An abono received is a normal
 *   income line (Ingresos, variable) with `lentId`; delete the line and the abono is gone. No second money system.
 * - One-time move of the old device list (localStorage "faro-cobros"): idempotent through `lentMoved`, the device copy
 *   is kept untouched and copied to "faro-cobros-backup".
 * - Payoff plan for Préstamos (avalanche / snowball), net balance, per-person history and a 6-month balance series.
 * Interest rule is the one in loans.ts (simple, by the day, on the amount lent; payments never reduce it).
 */
import { convertMinor, monthlyEquivalent } from "./money";
import { cardBalanceAt, cardPays, cardPlanDebts, cardTotals, cardsOf, storedCards } from "./cards";
import { ISO_DAY, dayGap, loanFigures, loanPays, loanState, loansOf, simpleInterest, todayIso } from "./loans";
import type { Currency, DebtPlan, LedgerState, Lent, Line, Loan } from "./types";

/* ---------- Me deben (lent) ---------- */

export function normalizeLent(l: Lent): Lent {
  const started = typeof l.startedOn === "string" && ISO_DAY.test(l.startedOn) ? l.startedOn : "";
  return {
    id: String(l.id),
    person: typeof l.person === "string" ? l.person : "",
    kind: l.kind === "interest" ? "interest" : "plain",
    amountMinor: typeof l.amountMinor === "number" ? l.amountMinor : 0,
    currency: l.currency === "NIO" ? "NIO" : "USD",
    aprBps: typeof l.aprBps === "number" && l.aprBps > 0 ? l.aprBps : 0,
    startedOn: started,
    dueOn: typeof l.dueOn === "string" && ISO_DAY.test(l.dueOn) ? l.dueOn : "",
    note: typeof l.note === "string" ? l.note : "",
    ...(l.archived ? { archived: true, archivedOn: l.archivedOn ?? "", unpaidMinor: l.unpaidMinor ?? 0 } : {}),
  };
}

export function lentOf(state: LedgerState | null | undefined): Lent[] {
  return Array.isArray(state?.lent) ? state!.lent!.filter((l) => l && typeof l.id === "string").map(normalizeLent) : [];
}

/** Abono lines of one lent amount, oldest first. */
export function lentPays(state: LedgerState, id: string): Line[] {
  const out: Line[] = [];
  for (const bucket of Object.values(state.months)) for (const line of bucket.lines) if (line.lentId === id && line.active) out.push(line);
  return out.sort((a, b) => (a.bookedOn || a.monthKey).localeCompare(b.bookedOn || b.monthKey));
}

export function lentState(state: LedgerState, l: Lent, today = todayIso()) {
  const paid = lentPays(state, l.id).reduce((sum, line) => sum + convertMinor(line.amountMinor, line.currency, l.currency, state.settings.rateE4), 0);
  return loanFigures(l.amountMinor, l.kind, l.aprBps, l.startedOn || l.dueOn || today, paid, today);
}

export function lentTotals(state: LedgerState | null | undefined, today = todayIso()) {
  const zero = { count: 0, lent: 0, interest: 0, paid: 0, left: 0, archived: 0 };
  if (!state) return zero;
  const { display, rateE4 } = state.settings;
  const view = (m: number, c: Currency) => convertMinor(m, c, display, rateE4);
  return lentOf(state).reduce((acc, l) => {
    if (l.archived) return { ...acc, archived: acc.archived + 1 };
    const f = lentState(state, l, today);
    return { ...acc, count: acc.count + 1, lent: acc.lent + view(l.amountMinor, l.currency), interest: acc.interest + view(f.interest, l.currency), paid: acc.paid + view(f.paid, l.currency), left: acc.left + view(f.left, l.currency) };
  }, zero);
}

export function addLent(state: LedgerState, l: Lent): LedgerState {
  return { ...state, lent: [normalizeLent(l), ...lentOf(state)] };
}

function abonoLine(id: string, lentId: string, person: string, amountMinor: number, currency: Currency, day: string, label: string): Line {
  return {
    id, seriesId: id, monthKey: day.slice(0, 7), kind: "income-variable", concept: `${label} · ${person}`, amountMinor, currency,
    active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "",
    cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: currency, icon: "HandCoins", history: [], bookedOn: day, lentId,
  };
}

/** An abono received: a normal income line in the month of its date. `amountMinor` is in the lent currency. */
export function payLent(state: LedgerState, lentId: string, amountMinor: number, date: string, id: string, label: string): LedgerState {
  const l = lentOf(state).find((x) => x.id === lentId);
  if (!l || amountMinor <= 0) return state;
  const day = ISO_DAY.test(date) ? date : todayIso();
  const line = abonoLine(id, l.id, l.person, amountMinor, l.currency, day, label);
  const bucket = state.months[line.monthKey] ?? { lines: [] };
  return { ...state, months: { ...state.months, [line.monthKey]: { lines: [...bucket.lines, line] } } };
}

export function archiveLent(state: LedgerState, id: string, today = todayIso()): LedgerState {
  return { ...state, lent: lentOf(state).map((l) => (l.id === id ? { ...l, archived: true, archivedOn: today, unpaidMinor: lentState(state, l, today).left } : l)) };
}

export function restoreLent(state: LedgerState, id: string): LedgerState {
  return { ...state, lent: lentOf(state).map((l) => (l.id === id ? { ...l, archived: false, archivedOn: undefined, unpaidMinor: undefined } : l)) };
}

/* ---------- one-time move of the old device list ---------- */

type OldBonus = { id?: unknown; date?: unknown; amountMinor?: unknown };
type OldCobro = { id?: unknown; person?: unknown; kind?: unknown; amountMinor?: unknown; currency?: unknown; aprBps?: unknown; owedOn?: unknown; startedOn?: unknown; note?: unknown; bonuses?: unknown; archived?: unknown; archivedOn?: unknown; unpaidMinor?: unknown };

/**
 * Moves the old device Me deben rows into the ledger. Never duplicates: a row whose id is in `lentMoved` (or already in
 * `lent`) is skipped, and each abono line has a fixed id. Old abonos become income lines on their own day.
 */
export function moveCobros(state: LedgerState, raw: unknown, label = "Abono"): { ledger: LedgerState; moved: number } {
  if (!Array.isArray(raw) || !raw.length) return { ledger: state, moved: 0 };
  const done = new Set([...(state.lentMoved ?? []), ...lentOf(state).map((l) => l.id)]);
  const have = new Set<string>();
  for (const b of Object.values(state.months)) for (const line of b.lines) have.add(line.id);
  let next = state;
  const movedIds: string[] = [];
  const added: Lent[] = [];
  for (const row of raw as OldCobro[]) {
    if (!row || typeof row.id !== "string" || typeof row.person !== "string" || typeof row.amountMinor !== "number") continue;
    if (done.has(row.id) || movedIds.includes(row.id)) continue;
    const currency: Currency = row.currency === "NIO" ? "NIO" : "USD";
    const owed = typeof row.owedOn === "string" && ISO_DAY.test(row.owedOn) ? row.owedOn : "";
    const started = typeof row.startedOn === "string" && ISO_DAY.test(row.startedOn) ? row.startedOn : owed;
    added.push(normalizeLent({
      id: row.id, person: row.person, kind: row.kind === "interest" ? "interest" : "plain", amountMinor: row.amountMinor, currency,
      aprBps: typeof row.aprBps === "number" ? row.aprBps : 0, startedOn: started, dueOn: owed, note: typeof row.note === "string" ? row.note : "",
      ...(row.archived === true ? { archived: true, archivedOn: typeof row.archivedOn === "string" ? row.archivedOn : "", unpaidMinor: typeof row.unpaidMinor === "number" ? row.unpaidMinor : 0 } : {}),
    }));
    const bonuses = Array.isArray(row.bonuses) ? (row.bonuses as OldBonus[]) : [];
    bonuses.forEach((b, i) => {
      if (!b || typeof b.amountMinor !== "number" || b.amountMinor <= 0 || typeof b.date !== "string") return;
      const id = `lb-${row.id}-${typeof b.id === "string" ? b.id : i}`;
      if (have.has(id)) return;
      have.add(id);
      const day = ISO_DAY.test(b.date) ? b.date : started || todayIso();
      const line = abonoLine(id, row.id as string, row.person as string, b.amountMinor, currency, day, label);
      const bucket = next.months[line.monthKey] ?? { lines: [] };
      next = { ...next, months: { ...next.months, [line.monthKey]: { lines: [...bucket.lines, line] } } };
    });
    movedIds.push(row.id);
  }
  if (!movedIds.length) return { ledger: state, moved: 0 };
  return {
    moved: movedIds.length,
    ledger: { ...next, lent: [...added, ...lentOf(next)], lentMoved: [...(state.lentMoved ?? []), ...movedIds], revision: state.revision + 1, updatedAt: new Date().toISOString() },
  };
}

/* ---------- net, people, series ---------- */

/** Me deben − Debo (Préstamos pending + credit card balances, 1.3.107), in the view currency. */
export function netBalance(state: LedgerState | null | undefined, today = todayIso()) {
  const owed = lentTotals(state, today).left;
  const loans = loansLeft(state, today);
  const cards = cardTotals(state, today).balance;
  const owe = loans + cards;
  return { owed, owe, net: owed - owe, loans, cards };
}

function loansLeft(state: LedgerState | null | undefined, today: string) {
  if (!state) return 0;
  const { display, rateE4 } = state.settings;
  return loansOf(state).filter((l) => !l.archived).reduce((s, l) => s + convertMinor(loanState(state, l, today).left, l.currency, display, rateE4), 0);
}

export type PersonEvent = { date: string; kind: "loan" | "pay"; view: number; id: string };
export type Person = { key: string; name: string; side: "owed" | "owe"; ids: string[]; events: PersonEvent[]; left: number; lastPay: string; days: number | null; active: number };

export const personKey = (name: string) => name.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Everyone on one side, with their full history (loans and payments, archived too), balance and days since last payment. */
export function peopleOf(state: LedgerState | null | undefined, side: "owed" | "owe", today = todayIso()): Person[] {
  if (!state) return [];
  const { display, rateE4 } = state.settings;
  const view = (m: number, c: Currency) => convertMinor(m, c, display, rateE4);
  const map = new Map<string, Person>();
  const rows: { id: string; name: string; date: string; amount: number; currency: Currency; archived?: boolean; left: number; pays: Line[] }[] = side === "owed"
    ? lentOf(state).map((l) => ({ id: l.id, name: l.person, date: l.startedOn || l.dueOn, amount: l.amountMinor, currency: l.currency, archived: l.archived, left: l.archived ? 0 : lentState(state, l, today).left, pays: lentPays(state, l.id) }))
    : loansOf(state).map((l) => ({ id: l.id, name: l.lender, date: l.takenOn, amount: l.amountMinor, currency: l.currency, archived: l.archived, left: l.archived ? 0 : loanState(state, l, today).left, pays: loanPays(state, l.id) }));
  for (const r of rows) {
    const key = personKey(r.name) || r.id;
    const p = map.get(key) ?? { key, name: r.name.trim(), side, ids: [], events: [], left: 0, lastPay: "", days: null, active: 0 };
    p.ids.push(r.id);
    p.events.push({ date: r.date, kind: "loan", view: view(r.amount, r.currency), id: r.id });
    for (const line of r.pays) {
      const d = line.bookedOn || `${line.monthKey}-01`;
      p.events.push({ date: d, kind: "pay", view: view(line.amountMinor, line.currency), id: line.id });
      if (d <= today && d > p.lastPay) p.lastPay = d;
    }
    p.left += view(r.left, r.currency);
    if (!r.archived) p.active += 1;
    map.set(key, p);
  }
  return [...map.values()].map((p) => ({
    ...p,
    events: p.events.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "loan" ? -1 : 1)),
    days: p.lastPay ? dayGap(p.lastPay, today) : null,
  })).sort((a, b) => b.left - a.left || a.name.localeCompare(b.name));
}

function monthEnd(year: number, month0: number): string {
  const d = new Date(year, month0 + 1, 0);
  return todayIso(d);
}

/** Balance at the end of each of the last `n` months (the current one at today): Debo (Préstamos) and Me deben, view currency. */
export function debtSeries(state: LedgerState | null | undefined, today = todayIso(), n = 6): { key: string; owe: number; owed: number }[] {
  if (!state) return [];
  const { display, rateE4 } = state.settings;
  const view = (m: number, c: Currency) => convertMinor(m, c, display, rateE4);
  const t = new Date(`${today}T12:00:00`);
  const out: { key: string; owe: number; owed: number }[] = [];
  const loans = loansOf(state);
  const lent = lentOf(state);
  // 1.3.107: cards count from their readings (archived ones up to their archive day), so the line is cards + loans.
  const cards = [...cardsOf(state), ...storedCards(state).filter((c) => c.archived)];
  const loanPaid = new Map(loans.map((l) => [l.id, loanPays(state, l.id)]));
  const lentPaid = new Map(lent.map((l) => [l.id, lentPays(state, l.id)]));
  for (let i = n - 1; i >= 0; i--) {
    const at = new Date(t.getFullYear(), t.getMonth() - i, 1);
    const end = i === 0 ? today : monthEnd(at.getFullYear(), at.getMonth());
    const leftAt = (amount: number, kind: "plain" | "interest", apr: number, from: string, currency: Currency, pays: Line[], archivedOn?: string) => {
      if (!from || from > end) return 0;
      if (archivedOn && archivedOn <= end) return 0;
      const paid = pays.filter((x) => (x.bookedOn || `${x.monthKey}-01`) <= end).reduce((s, x) => s + convertMinor(x.amountMinor, x.currency, currency, rateE4), 0);
      const interest = kind === "interest" ? simpleInterest(amount, apr, from, end) : 0;
      return view(Math.max(0, amount + interest - paid), currency);
    };
    const cardOwe = cards.reduce((s, c) => s + view(cardBalanceAt(state, c, end), c.currency), 0);
    const owe = cardOwe + loans.reduce((s, l) => s + leftAt(l.amountMinor, l.kind, l.aprBps, l.takenOn, l.currency, loanPaid.get(l.id) ?? [], l.archived ? l.archivedOn : undefined), 0);
    const owed = lent.reduce((s, l) => s + leftAt(l.amountMinor, l.kind, l.aprBps, l.startedOn || l.dueOn, l.currency, lentPaid.get(l.id) ?? [], l.archived ? l.archivedOn : undefined), 0);
    out.push({ key: `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`, owe, owed });
  }
  return out;
}

/* ---------- payoff plan ---------- */

/** `revolving` (a card): interest each month on what is left (APR / 12), not a fixed amount. `min`: paid every month first. */
export type PlanDebt = { id: string; name: string; left: number; monthlyInterest: number; aprBps: number; revolving?: boolean; min?: number; card?: boolean; minGuess?: boolean; aprGuess?: boolean; freeMonths?: number };
/** `first`: what each debt gets in the first month (minimums first, the rest to the target). */
export type PlanRun = { months: number; interest: number; order: string[]; finish: Record<string, number>; interestOf: Record<string, number>; first: Record<string, number> } | null;

/** Order of attack: avalanche = most expensive first (highest rate, then most interest a month); snowball = smallest balance first. */
export function planOrder(debts: PlanDebt[], order: DebtPlan["order"]): PlanDebt[] {
  const list = debts.filter((d) => d.left > 0);
  return order === "avalanche"
    ? list.sort((a, b) => (b.freeMonths ? 0 : b.aprBps) - (a.freeMonths ? 0 : a.aprBps) || b.monthlyInterest - a.monthlyInterest || a.left - b.left || a.name.localeCompare(b.name))
    : list.sort((a, b) => a.left - b.left || b.aprBps - a.aprBps || a.name.localeCompare(b.name));
}

/**
 * Month-by-month: every unpaid debt gains its monthly interest, then the whole budget goes to the first debt in order,
 * the rest rolls to the next. Returns null when the budget cannot outrun the interest (or nothing to pay with).
 */
export function simulatePlan(debts: PlanDebt[], budget: number, order: DebtPlan["order"], cap = 600): PlanRun {
  const list = planOrder(debts.map((d) => ({ ...d })), order);
  if (!list.length) return { months: 0, interest: 0, order: [], finish: {}, interestOf: {}, first: {} };
  if (budget <= 0) return null;
  const left = new Map(list.map((d) => [d.id, d.left]));
  const finish: Record<string, number> = {};
  const interestOf: Record<string, number> = Object.fromEntries(list.map((d) => [d.id, 0]));
  const first: Record<string, number> = Object.fromEntries(list.map((d) => [d.id, 0]));
  let interest = 0;
  for (let m = 1; m <= cap; m++) {
    for (const d of list) {
      const l = left.get(d.id)!;
      if (l <= 0) continue;
      const add = d.revolving ? (m <= (d.freeMonths ?? 0) ? 0 : Math.round((l * d.aprBps) / (10000 * 12))) : d.monthlyInterest;
      left.set(d.id, l + add);
      interest += add;
      interestOf[d.id] += add;
    }
    let cash = budget;
    const pay = (d: PlanDebt, want: number) => {
      const l = left.get(d.id)!;
      const p = Math.min(cash, l, want);
      if (p <= 0) return;
      left.set(d.id, l - p);
      cash -= p;
      if (m === 1) first[d.id] += p;
      if (l - p <= 0) finish[d.id] = m;
    };
    // Minimums first (cards), so no card goes late; then everything left to the first debt in order, and on.
    for (const d of list) if (d.min && d.min > 0) pay(d, d.min);
    for (const d of list) { if (cash <= 0) break; pay(d, Infinity); }
    if (list.every((d) => left.get(d.id)! <= 0)) return { months: m, interest, order: list.map((d) => d.id), finish, interestOf, first };
  }
  return null;
}

/** Préstamos and credit cards as plan debts, in the view currency (archived and paid-off ones left out). */
export function planDebts(state: LedgerState | null | undefined, today = todayIso()): PlanDebt[] {
  if (!state) return [];
  return [...loanPlanDebts(state, today), ...cardPlanDebts(state, today)];
}

function loanPlanDebts(state: LedgerState, today: string): PlanDebt[] {
  const { display, rateE4 } = state.settings;
  return loansOf(state).filter((l) => !l.archived).map((l: Loan) => {
    const f = loanState(state, l, today);
    const monthly = l.kind === "interest" ? Math.round((l.amountMinor * l.aprBps) / (10000 * 12)) : 0;
    return { id: l.id, name: l.lender, left: convertMinor(f.left, l.currency, display, rateE4), monthlyInterest: convertMinor(monthly, l.currency, display, rateE4), aprBps: l.kind === "interest" ? l.aprBps : 0 };
  }).filter((d) => d.left > 0);
}

/** What the user has paid toward Préstamos a month lately: last 90 days ÷ 3 (view currency). */
export function recentPace(state: LedgerState | null | undefined, today = todayIso()): number {
  if (!state) return 0;
  const { display, rateE4 } = state.settings;
  const from = new Date(`${today}T12:00:00`);
  from.setDate(from.getDate() - 90);
  const start = todayIso(from);
  let sum = 0;
  const pays = [...loansOf(state).flatMap((l) => loanPays(state, l.id)), ...storedCards(state).flatMap((c) => cardPays(state, c.id))];
  for (const line of pays) {
    const d = line.bookedOn || `${line.monthKey}-01`;
    if (d > start && d <= today) sum += convertMinor(line.amountMinor, line.currency, display, rateE4);
  }
  return Math.round(sum / 3);
}

export function planOf(state: LedgerState | null | undefined): DebtPlan | null {
  const p = state?.debtPlan;
  if (!p || typeof p !== "object") return null;
  return {
    order: p.order === "snowball" ? "snowball" : "avalanche", monthlyMinor: typeof p.monthlyMinor === "number" && p.monthlyMinor > 0 ? p.monthlyMinor : 0, currency: p.currency === "NIO" ? "NIO" : "USD",
    ...(typeof p.cadence === "string" && p.cadence && p.cadence !== "monthly" ? { cadence: p.cadence } : {}),
  };
}

/** The whole plan as the app shows it: budget used, both runs, what avalanche saves over snowball. */
export function payoffPlan(state: LedgerState | null | undefined, today = todayIso()) {
  const debts = planDebts(state, today);
  const saved = planOf(state);
  const display = state?.settings.display ?? "USD";
  const rate = state?.settings.rateE4 ?? 0;
  const pace = recentPace(state, today);
  // 1.3.107: the user's amount is per payment, at their rhythm (cadence); the plan runs month by month on its monthly equivalent.
  const cadence = saved?.cadence || "monthly";
  const perPay = saved && saved.monthlyMinor > 0 ? convertMinor(saved.monthlyMinor, saved.currency, display, rate) : pace;
  const budget = saved && saved.monthlyMinor > 0 ? monthlyEquivalent(perPay, cadence) : pace;
  const order = saved?.order ?? "avalanche";
  const avalanche = simulatePlan(debts, budget, "avalanche");
  const snowball = simulatePlan(debts, budget, "snowball");
  const chosen = order === "avalanche" ? avalanche : snowball;
  const other = order === "avalanche" ? snowball : avalanche;
  const minBudget = debts.reduce((s, d) => s + d.monthlyInterest, 0);
  const minimums = debts.reduce((s, d) => s + (d.min ?? 0), 0);
  // What each debt gets per payment: the first month's split scaled to one payment at the user's rhythm.
  const scale = budget > 0 ? perPay / budget : 1;
  const perPayOf: Record<string, number> = chosen ? Object.fromEntries(Object.entries(chosen.first).map(([id, v]) => [id, Math.round(v * scale)])) : {};
  return {
    debts, budget, pace, order, cadence, perPay: saved && saved.monthlyMinor > 0 ? perPay : pace, perPayOf, minimums, fromUser: !!(saved && saved.monthlyMinor > 0), avalanche, snowball, chosen, minBudget,
    /** Positive = the chosen order saves this much interest / these months versus the other. */
    saveInterest: chosen && other ? other.interest - chosen.interest : 0,
    saveMonths: chosen && other ? other.months - chosen.months : 0,
    first: chosen?.order[0] ? debts.find((d) => d.id === chosen.order[0]) ?? null : null,
  };
}

/** The month a plan month lands on ("2027-03"), counted from today. */
export function monthAhead(n: number, today = todayIso()): string {
  const t = new Date(`${today}T12:00:00`);
  const d = new Date(t.getFullYear(), t.getMonth() + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
