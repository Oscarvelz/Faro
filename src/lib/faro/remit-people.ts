// 1.3.118 Remesas → Para quién: the people the user sends money to. A recipient is only a name (plus an optional colour
// and Faro icon) in `ledger.remitPeople`; the money stays normal Fijos/Variables lines in a Remesas category, tagged with
// `line.to`. Deleting a person never deletes money: their lines lose the tag and count as "Sin persona". Pure, integer
// minor units.
import { convertMinor } from "./money.ts";
import { isRemitLine } from "./remesas.ts";
import type { LedgerState, Line, RemitPerson } from "./types";

export const NO_ONE = "";

export function remitPeopleOf(state: LedgerState | null | undefined): RemitPerson[] {
  return state?.remitPeople ?? [];
}

/** The category is a Remesas category (role remittance, or a default Remesas id). */
export function isRemitCat(state: LedgerState, categoryId: string): boolean {
  if (categoryId === "f-remesas" || categoryId === "v-remesas") return true;
  return state.structure.categories.find((c) => c.id === categoryId)?.role === "remittance";
}

export const remitNameKey = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Adds a person (same name as an existing one = that one, no second copy). Returns the new state and the person's id. */
export function addRemitPerson(state: LedgerState, name: string, id: string, color?: string): { state: LedgerState; id: string } {
  const clean = name.trim().slice(0, 40);
  const list = remitPeopleOf(state);
  const same = list.find((p) => remitNameKey(p.name) === remitNameKey(clean));
  if (same || !clean) return { state, id: same?.id ?? "" };
  return { state: { ...state, remitPeople: [...list, { id, name: clean, ...(color ? { color } : {}) }] }, id };
}

export function renameRemitPerson(state: LedgerState, id: string, name: string): LedgerState {
  const clean = name.trim().slice(0, 40);
  if (!clean) return state;
  return { ...state, remitPeople: remitPeopleOf(state).map((p) => (p.id === id ? { ...p, name: clean } : p)) };
}

export function colorRemitPerson(state: LedgerState, id: string, color: string): LedgerState {
  return { ...state, remitPeople: remitPeopleOf(state).map((p) => (p.id === id ? { ...p, color } : p)) };
}

export function iconRemitPerson(state: LedgerState, id: string, icon: string): LedgerState {
  return { ...state, remitPeople: remitPeopleOf(state).map((p) => (p.id === id ? { ...p, icon } : p)) };
}

/** Removes people. Their lines keep every amount and date; only the tag goes (they become "Sin persona"). */
export function dropRemitPeople(state: LedgerState, ids: string[]): LedgerState {
  const gone = new Set(ids);
  const months: LedgerState["months"] = {};
  for (const [k, b] of Object.entries(state.months)) {
    months[k] = b.lines.some((l) => l.to && gone.has(l.to)) ? { lines: b.lines.map((l) => (l.to && gone.has(l.to) ? untag(l) : l)) } : b;
  }
  return { ...state, months, remitPeople: remitPeopleOf(state).filter((p) => !gone.has(p.id)) };
}

function untag(l: Line): Line {
  const { to: _drop, ...rest } = l;
  return rest as Line;
}

/** Whose line this is: a known person's id, or NO_ONE (no tag, or a tag whose person is gone). */
export function recipientOf(state: LedgerState, l: Line): string {
  return l.to && remitPeopleOf(state).some((p) => p.id === l.to) ? l.to : NO_ONE;
}

export type Pair = { usd: number; nio: number };
export type RemitRow = { id: string; person: RemitPerson | null; month: Pair; year: Pair; all: Pair; count: number; last: string };
export type RemitEntry = { lineId: string; monthKey: string; date: string; concept: string; book: "fixed" | "variable"; amountMinor: number; currency: Line["currency"]; usd: number; nio: number };

const zero = (): Pair => ({ usd: 0, nio: 0 });
const add = (p: Pair, l: Line, rate: number) => {
  p.usd += convertMinor(l.amountMinor, l.currency, "USD", rate);
  p.nio += convertMinor(l.amountMinor, l.currency, "NIO", rate);
};
/** The line's day: its booked date when it falls in its own month (a copied recurring line may carry an older one), else the 1st. */
export const dateOf = (l: Line, monthKey: string) => (l.bookedOn && l.bookedOn.startsWith(monthKey) ? l.bookedOn : `${monthKey}-01`);

/**
 * Totals per recipient for the month `key` (YYYY-MM), its year, and all time, in US$ and C$ minor at the ledger's rate.
 * Every person is listed (zero when nothing yet); "Sin persona" only when it has money, always last. People sorted by
 * all-time US$, biggest first.
 */
export function remitByPerson(state: LedgerState, key: string): { rows: RemitRow[]; month: Pair; year: Pair; all: Pair } {
  const rate = state.settings.rateE4;
  const year = key.slice(0, 4);
  const rows = new Map<string, RemitRow>();
  const row = (id: string): RemitRow => {
    let r = rows.get(id);
    if (!r) { r = { id, person: remitPeopleOf(state).find((p) => p.id === id) ?? null, month: zero(), year: zero(), all: zero(), count: 0, last: "" }; rows.set(id, r); }
    return r;
  };
  for (const p of remitPeopleOf(state)) row(p.id);
  const tot = { month: zero(), year: zero(), all: zero() };
  for (const [mk, b] of Object.entries(state.months)) {
    for (const l of b.lines) {
      if (!isRemitLine(state, l)) continue;
      const r = row(recipientOf(state, l));
      add(r.all, l, rate); add(tot.all, l, rate);
      if (mk.slice(0, 4) === year) { add(r.year, l, rate); add(tot.year, l, rate); }
      if (mk === key) { add(r.month, l, rate); add(tot.month, l, rate); }
      r.count++;
      const d = dateOf(l, mk);
      if (d > r.last) r.last = d;
    }
  }
  const list = [...rows.values()].filter((r) => r.person || r.count > 0);
  list.sort((a, b) => (a.person ? 0 : 1) - (b.person ? 0 : 1) || b.all.usd - a.all.usd || (a.person?.name ?? "").localeCompare(b.person?.name ?? ""));
  return { rows: list, ...tot };
}

/** Every remittance line for one recipient (NO_ONE = untagged), newest first. */
export function remitHistory(state: LedgerState, id: string): RemitEntry[] {
  const rate = state.settings.rateE4;
  const out: RemitEntry[] = [];
  for (const [mk, b] of Object.entries(state.months)) {
    for (const l of b.lines) {
      if (!isRemitLine(state, l) || recipientOf(state, l) !== id) continue;
      out.push({
        lineId: l.id, monthKey: mk, date: dateOf(l, mk), concept: l.concept, book: l.kind === "expense-fixed" ? "fixed" : "variable",
        amountMinor: l.amountMinor, currency: l.currency,
        usd: convertMinor(l.amountMinor, l.currency, "USD", rate), nio: convertMinor(l.amountMinor, l.currency, "NIO", rate),
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** The recipient's name for a line, or "" (used by search, export, calendar). */
export function recipientName(state: LedgerState, l: Line): string {
  if (!l.to) return "";
  return remitPeopleOf(state).find((p) => p.id === l.to)?.name ?? "";
}

const HUES = ["#d0679a", "#3f8fd2", "#d08a2e", "#4fa37a", "#8d6ad8", "#c9564a", "#2fa3a8", "#a8862f"];
/** The person's colour: their own, else a steady hue from their id. */
export function remitHue(p: RemitPerson | null): string {
  if (!p) return "#8a9399";
  if (p.color) return p.color;
  let h = 0;
  for (const c of p.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length]!;
}
export const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
