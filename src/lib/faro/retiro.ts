/**
 * Default Retiro presets (1.3.81). Primerica is offered as a $0 line in the Retiro pocket of the month on screen
 * (current month and later) until the user removes it; `ledger.retiroOff` remembers the removal, so it syncs and backs up.
 * Removing a line with money history archives it (inactive, hidden, history kept); a line without history is deleted.
 * Old ledgers (no retiroOff, no archived) load unchanged.
 */
import { uid } from "./money.ts";
import type { LedgerState, Line } from "./types";

export const RETIRO_PRESETS = [{ id: "primerica", name: "Primerica", icon: "brand:primerica" }] as const;

export const isPrimerica = (line: Pick<Line, "icon" | "concept">) =>
  line.icon === "brand:primerica" || line.concept.trim().toLowerCase() === "primerica";

/** The Retiro pocket's sub (first savings category, sub id "*.retiro"). */
export function retiroSub(state: LedgerState): { catId: string; subId: string } | null {
  const cat = state.structure.categories.find((c) => c.role === "savings" && !c.hidden);
  const sub = cat?.subs.find((s) => s.id.endsWith(".retiro") && !s.hidden);
  return cat && sub ? { catId: cat.id, subId: sub.id } : null;
}

/** Seeds missing default presets into month `key`. Returns the same state when nothing is needed. */
export function seedRetiro(state: LedgerState, key: string): LedgerState {
  const at = retiroSub(state);
  if (!at) return state;
  const off = new Set(state.retiroOff ?? []);
  const bucket = state.months[key] ?? { lines: [] };
  const here = bucket.lines.filter((l) => l.subId === at.subId);
  const add = RETIRO_PRESETS.filter((p) => !off.has(p.id) && !here.some((l) => p.id === "primerica" && isPrimerica(l)));
  if (!add.length) return state;
  const display = state.settings.display;
  const fresh: Line[] = add.map((p) => {
    const id = uid();
    return {
      id, seriesId: id, monthKey: key, kind: "expense-fixed", concept: p.name, amountMinor: 0, currency: display,
      active: true, note: "", categoryId: at.catId, subId: at.subId, recurring: false, storeId: "", providerId: "",
      productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
      balanceCurrency: display, icon: p.icon, history: [],
    } as Line;
  });
  return { ...state, months: { ...state.months, [key]: { lines: [...bucket.lines, ...fresh] } } };
}

/** Delete from the pocket: archive when the line carries money history or a balance, else remove. Presets are remembered as off. */
export function dropPocketLine(state: LedgerState, key: string, id: string): { state: LedgerState; archived: boolean } {
  const bucket = state.months[key];
  const line = bucket?.lines.find((l) => l.id === id);
  if (!bucket || !line) return { state, archived: false };
  const keep = line.history.length > 0 || (line.balanceMinor ?? 0) !== 0 || line.amountMinor !== 0;
  const lines = keep
    ? bucket.lines.map((l) => (l.id === id ? { ...l, active: false, archived: true } : l))
    : bucket.lines.filter((l) => l.id !== id);
  const at = retiroSub(state);
  const preset = at && line.subId === at.subId && isPrimerica(line);
  const retiroOff = preset ? [...new Set([...(state.retiroOff ?? []), "primerica"])] : state.retiroOff;
  return { state: { ...state, retiroOff, months: { ...state.months, [key]: { lines } } }, archived: keep };
}

/** Restore the default Retiro presets: an archived Primerica in `key` comes back with its history, else a fresh $0 one. */
export function restoreRetiro(state: LedgerState, key: string): LedgerState {
  const at = retiroSub(state);
  const { retiroOff: _drop, ...rest } = state;
  let next: LedgerState = rest as LedgerState;
  const bucket = next.months[key];
  if (at && bucket) {
    let revived = false;
    const lines = bucket.lines.map((l) => {
      if (revived || !l.archived || l.subId !== at.subId || !isPrimerica(l)) return l;
      revived = true;
      return { ...l, active: true, archived: false };
    });
    next = { ...next, months: { ...next.months, [key]: { lines } } };
  }
  return seedRetiro(next, key);
}
