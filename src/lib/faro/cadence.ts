/* Generic payment rhythms (Nov 2026, 1.3.76).
 * A Line.cadence is either one of the old words ("weekly", "biweekly" = every 15 days, "monthly", "yearly"),
 * which load unchanged, or a compact interval "<n><unit>": "1d", "2w", "3m", "6m", "2y" (n 1..999).
 * The Cuotas frequency chips the user picked live in the ledger (freqPresets); old ledgers have none (= FREQ_DEFAULT). */
import type { LedgerState } from "./types";

export type FreqUnit = "d" | "w" | "m" | "y";
export type Interval = { every: number; unit: FreqUnit };

export const FREQ_DEFAULT = ["weekly", "biweekly", "monthly", "yearly"];
/** The pool the gear offers: Diario, Semanal, Cada 15 días, Mensual, Cada 2 meses, Trimestral, Semestral, Anual. */
export const FREQ_POOL = ["1d", "weekly", "biweekly", "monthly", "2m", "3m", "6m", "yearly"];

const LEGACY: Record<string, Interval> = {
  weekly: { every: 7, unit: "d" },
  biweekly: { every: 15, unit: "d" },
  monthly: { every: 1, unit: "m" },
  yearly: { every: 1, unit: "y" },
};

/** The interval a cadence means, or null for "" / unknown text. */
export function intervalOf(cadence: string | null | undefined): Interval | null {
  if (!cadence) return null;
  if (LEGACY[cadence]) return LEGACY[cadence];
  const m = /^(\d{1,3})([dwmy])$/.exec(cadence);
  if (!m || Number(m[1]) < 1) return null;
  const every = Number(m[1]);
  const unit = m[2] as FreqUnit;
  return unit === "w" ? { every: every * 7, unit: "d" } : { every, unit };
}

export function isCadence(value: unknown): value is string {
  return typeof value === "string" && intervalOf(value) !== null;
}

/** One canonical token for an interval the user typed ("Cada 7 días" stays "7d"; 1 mes = "monthly"). */
export function cadenceToken(every: number, unit: FreqUnit): string {
  const n = Math.max(1, Math.min(999, Math.round(every)));
  if (unit === "m" && n === 1) return "monthly";
  if (unit === "y" && n === 1) return "yearly";
  if (unit === "w" && n === 1) return "weekly";
  return `${n}${unit}`;
}

const pad = (n: number) => String(n).padStart(2, "0");
function clampDay(year: number, month: number, day: number): string {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${pad(month)}-${pad(Math.min(day, last))}`;
}

/** The next date in the rhythm. `anchor` is the original day of month, so 31 Jan → 28 Feb → 31 Mar. */
export function stepDate(iso: string, cadence: string, anchor?: number): string {
  const iv = intervalOf(cadence) ?? { every: 1, unit: "m" as FreqUnit };
  const y = Number(iso.slice(0, 4));
  const mo = Number(iso.slice(5, 7));
  const d = anchor ?? Number(iso.slice(8, 10));
  if (iv.unit === "d") {
    const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
    date.setDate(date.getDate() + iv.every);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  const months = iv.unit === "y" ? iv.every * 12 : iv.every;
  const total = y * 12 + (mo - 1) + months;
  return clampDay(Math.floor(total / 12), (total % 12) + 1, d);
}

/** First date of the rhythm on or after `today` (the start itself when it has not come yet). */
export function nextDueFrom(start: string, cadence: string, today: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(start) || !intervalOf(cadence)) return start;
  const anchor = Number(start.slice(8, 10));
  let cursor = start.slice(0, 10);
  for (let i = 0; i < 4000 && cursor < today; i += 1) cursor = stepDate(cursor, cadence, anchor);
  return cursor;
}

/** What one payment costs per month on average. */
export function monthlyFactor(cadence: string): number {
  const iv = intervalOf(cadence) ?? { every: 1, unit: "m" as FreqUnit };
  if (iv.unit === "d") return 365 / (12 * iv.every);
  if (iv.unit === "y") return 1 / (12 * iv.every);
  return 1 / iv.every;
}

const NAMED: Record<string, [string, string]> = {
  "1d": ["Diario", "Daily"],
  weekly: ["Semanal", "Weekly"],
  biweekly: ["Cada 15 días", "Every 15 days"],
  monthly: ["Mensual", "Monthly"],
  "2m": ["Cada 2 meses", "Every 2 months"],
  "3m": ["Trimestral", "Quarterly"],
  "6m": ["Semestral", "Every 6 months"],
  yearly: ["Anual", "Yearly"],
};

export function cadenceLabel(cadence: string, lang: string): string {
  const named = NAMED[cadence];
  if (named) return lang === "en" ? named[1] : named[0];
  const m = /^(\d{1,3})([dwmy])$/.exec(cadence);
  if (!m) return "";
  const n = Number(m[1]);
  const es = { d: ["día", "días"], w: ["semana", "semanas"], m: ["mes", "meses"], y: ["año", "años"] }[m[2] as FreqUnit];
  const en = { d: ["day", "days"], w: ["week", "weeks"], m: ["month", "months"], y: ["year", "years"] }[m[2] as FreqUnit];
  return lang === "en" ? `Every ${n} ${en[n === 1 ? 0 : 1]}` : `Cada ${n} ${es[n === 1 ? 0 : 1]}`;
}

/** The chips to show, in order. Old ledgers (no field) get the four defaults; unknown tokens are dropped. */
export function freqPresetsOf(state: LedgerState | null | undefined): string[] {
  const raw = state?.freqPresets;
  if (!Array.isArray(raw)) return [...FREQ_DEFAULT];
  const seen = new Set<string>();
  return raw.filter((c) => isCadence(c) && !seen.has(c) && seen.add(c)).slice(0, 12);
}

/* ---------- "Otro…" frequencies (1.3.100) ---------- */

/** Bounds of the "Cada N …" setter per unit (days up to a year, weeks up to a year, months up to 5 years, years up to 10). */
export const FREQ_BOUNDS: Record<FreqUnit, number> = { d: 365, w: 52, m: 60, y: 10 };
export const FREQ_KEEP = 4;

/** The same rhythm written two ways ("7d" = "weekly", "12m" = "yearly", "2w" = "14d") compares equal. */
export function sameCadence(a: string, b: string): boolean {
  if (a === b) return true;
  const x = intervalOf(a);
  const y = intervalOf(b);
  if (!x || !y) return false;
  const months = (iv: Interval) => (iv.unit === "y" ? iv.every * 12 : iv.unit === "m" ? iv.every : null);
  if (x.unit === "d" && y.unit === "d") return x.every === y.every;
  const mx = months(x);
  const my = months(y);
  return mx !== null && mx === my;
}

/** The canonical token for "Cada N unit", within bounds; "" when N is out of range. Weeks stay weeks ("3w"). */
export function customToken(every: number, unit: FreqUnit): string {
  if (!Number.isInteger(every) || every < 1 || every > FREQ_BOUNDS[unit]) return "";
  if (unit === "m" && every % 12 === 0) return cadenceToken(every / 12, "y");
  return cadenceToken(every, unit);
}

/** The user's saved frequencies, newest first (sanitised, de-duplicated). */
export function customFreqsOf(state: LedgerState | null | undefined): string[] {
  const raw = state?.freqCustom;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const c of raw) if (isCadence(c) && !out.some((o) => sameCadence(o, c))) out.push(c);
  return out.slice(0, FREQ_KEEP);
}

/** The saved ones that are not already among `shown` (the presets of that picker). */
export function customFreqsFor(state: LedgerState | null | undefined, shown: string[]): string[] {
  return customFreqsOf(state).filter((c) => !shown.some((s) => sameCadence(s, c)));
}

/** Remember a frequency set with "Otro…": newest first, keeps the last 4. A preset rhythm is not stored twice. */
export function rememberFreq(state: LedgerState, token: string): LedgerState {
  if (!isCadence(token) || FREQ_POOL.some((p) => sameCadence(p, token))) return state;
  const now = customFreqsOf(state);
  const had = now.find((c) => sameCadence(c, token));
  const next = [had ?? token, ...now.filter((c) => !sameCadence(c, token))].slice(0, FREQ_KEEP);
  if (next.length === now.length && next.every((c, i) => c === now[i])) return state;
  return { ...state, freqCustom: next };
}

/** Forget one saved frequency. Lines already using it keep it. */
export function dropFreq(state: LedgerState, token: string): LedgerState {
  const now = customFreqsOf(state);
  const next = now.filter((c) => !sameCadence(c, token));
  if (next.length === now.length) return state;
  if (!next.length) {
    const { freqCustom: _drop, ...rest } = state;
    return rest as LedgerState;
  }
  return { ...state, freqCustom: next };
}
