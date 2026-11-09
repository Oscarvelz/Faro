import type { Currency, Lang, LedgerState } from "./types";
import { intervalOf, monthlyFactor, stepDate } from "./cadence.ts";
import { numFmt } from "./datefmt.ts";

export const BCN_RATE_E4 = 366243;
export const BCN_AS_OF = "2026-10-12";

export function roundHalfAway(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.sign(n) * Math.round(Math.abs(n));
}

function divRound(n: number, d: number): number {
  const neg = (n < 0) !== (d < 0);
  const an = Math.abs(Math.trunc(n));
  const ad = Math.abs(Math.trunc(d));
  if (ad === 0) return 0;
  const q = Math.floor((an + Math.floor(ad / 2)) / ad);
  return neg ? -q : q;
}

/**
 * The ONE currency normalizer (1.3.147): an exact "USD" is USD, an exact "NIO" is NIO, and anything
 * else (missing, garbled, legacy) resolves to the caller's fallback — never to a hardcoded opposite.
 * Before this, loans read "not USD" as NIO while lent read "not NIO" as USD, so one garbled value
 * could silently turn dollars into córdobas (~36×) on one side of Cobros and not the other.
 */
export function normCurrency(c: unknown, fallback: Currency): Currency {
  return c === "USD" ? "USD" : c === "NIO" ? "NIO" : fallback;
}

/** Convert integer minor units using an integer rate (córdobas per dollar × 10_000). */
export function convertMinor(minor: number, from: Currency, to: Currency, rateE4: number): number {
  if (!Number.isFinite(minor)) return 0;
  if (from === to) return Math.trunc(minor);
  if (!Number.isFinite(rateE4) || rateE4 <= 0) return 0;
  if (from === "USD" && to === "NIO") {
    const prod = minor * rateE4;
    if (!Number.isSafeInteger(prod)) return roundHalfAway((minor / 100) * (rateE4 / 10000) * 100);
    return divRound(prod, 10000);
  }
  const prod = minor * 10000;
  if (!Number.isSafeInteger(prod)) return roundHalfAway((minor / 100) / (rateE4 / 10000) * 100);
  return divRound(prod, rateE4);
}

/**
 * True when the stored rate cannot convert (≤ 0 or non-finite — convertMinor then returns 0) and the book
 * holds money in a currency other than the display one: those amounts silently total zero until the rate
 * is fixed, so Ajustes says so next to the rate field. A healthy rate, or a one-currency book, is quiet.
 */
export function fxRateBroken(state: LedgerState): boolean {
  const { display, rateE4 } = state.settings;
  if (Number.isFinite(rateE4) && rateE4 > 0) return false;
  return Object.values(state.months).some((b) => b.lines.some((l) => l.currency !== display || (l.balanceMinor != null && l.balanceCurrency !== display)));
}

export function formatRate(rateE4: number): string {
  const sign = rateE4 < 0 ? "-" : "";
  const v = Math.abs(Math.trunc(rateE4));
  const whole = Math.floor(v / 10000);
  const frac = String(v % 10000).padStart(4, "0");
  return `${sign}${whole}.${frac}`;
}

export function parseRate(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,6})?$/.test(s)) return null;
  const [a, b = ""] = s.split(".");
  const frac = (b + "0000").slice(0, 4);
  const e4 = Number(a) * 10000 + Number(frac);
  if (!Number.isSafeInteger(e4) || e4 < 10000 || e4 > 100_000_000) return null;
  return e4;
}

const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

export function evalExpr(input: string): number | null {
  const s = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, ".").replace(/\s/g, "");
  if (!s || !/^[-+*/().0-9]+$/.test(s)) return null;
  const tokens: string[] = [];
  let num = "";
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i] ?? "";
    if ((c >= "0" && c <= "9") || c === ".") {
      num += c;
      continue;
    }
    if (num) {
      tokens.push(num);
      num = "";
    }
    const prev = tokens[tokens.length - 1];
    if (c === "-" && (prev === undefined || prev === "(" || prev in PREC)) {
      num = "-";
      continue;
    }
    tokens.push(c);
  }
  if (num) tokens.push(num);
  const out: string[] = [];
  const ops: string[] = [];
  for (const t of tokens) {
    if (t !== "+" && t !== "-" && t !== "*" && t !== "/" && t !== "(" && t !== ")") {
      if (!Number.isFinite(Number(t))) return null;
      out.push(t);
      continue;
    }
    if (t === "(") {
      ops.push(t);
      continue;
    }
    if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop() as string);
      if (ops.pop() !== "(") return null;
      continue;
    }
    while (ops.length && (ops[ops.length - 1] ?? "") in PREC && PREC[ops[ops.length - 1] ?? ""] >= PREC[t]) {
      out.push(ops.pop() as string);
    }
    ops.push(t);
  }
  while (ops.length) {
    const op = ops.pop() as string;
    if (op === "(" || op === ")") return null;
    out.push(op);
  }
  const st: number[] = [];
  for (const t of out) {
    if (t in PREC) {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) return null;
      let r = 0;
      if (t === "+") r = a + b;
      else if (t === "-") r = a - b;
      else if (t === "*") r = a * b;
      else {
        if (b === 0) return null;
        r = a / b;
      }
      if (!Number.isFinite(r)) return null;
      st.push(r);
    } else {
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      st.push(n);
    }
  }
  if (st.length !== 1 || !Number.isFinite(st[0])) return null;
  return st[0] ?? null;
}

/** Parse a money field into minor units. Thousands and decimal marks are both accepted. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.startsWith("=")) {
    const v = evalExpr(s.slice(1));
    return v === null ? null : roundHalfAway(v * 100);
  }
  let neg = false;
  if (s[0] === "-" || s[0] === "+") {
    neg = s[0] === "-";
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let n = 0;
  if (lastComma >= 0 && lastDot >= 0) {
    const decSep = lastComma > lastDot ? "," : ".";
    const thou = decSep === "," ? "." : ",";
    const cleaned = s.split(thou).join("").replace(decSep, ".");
    n = Number(cleaned);
  } else {
    const sep = lastComma >= 0 ? "," : lastDot >= 0 ? "." : "";
    if (!sep) n = Number(s);
    else {
      const bits = s.split(sep);
      const last = bits[bits.length - 1] ?? "";
      if (bits.length === 2 && last.length > 0 && last.length <= 2) n = Number(`${bits[0]}.${last}`);
      else n = Number(bits.join(""));
    }
  }
  if (!Number.isFinite(n)) return null;
  return roundHalfAway((neg ? -n : n) * 100);
}

export function formatMoney(minor: number, currency: Currency, lang: Lang): string {
  // Negative amounts read "-$335.00" (sign before the symbol); -0 never shows a sign.
  if (minor < 0 && Math.round(minor) !== 0) return `-${formatMoney(-minor, currency, lang)}`;
  minor = Math.abs(minor);
  const value = minor / 100;
  const formatted = numFmt(lang === "en" ? "en-US" : "es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency === "NIO" ? `C$${formatted}` : `$${formatted}`;
}

export function formatPct(n: number | null, lang: Lang): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const body = numFmt(lang === "en" ? "en-US" : "es-NI", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
  return `${body}%`;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function uid(): string {
  return crypto.randomUUID();
}

export function eventCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("Mod");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey && e.key !== "Shift") parts.push("Shift");
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return parts.join("+");
  const key = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(key);
  return parts.join("+");
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function productHref(template: string, code: string, explicit: string): string {
  const direct = explicit.trim();
  if (/^https:\/\//i.test(direct)) return direct;
  const raw = code.trim();
  if (/^https:\/\//i.test(raw)) return raw;
  if (!raw || !template) return "";
  return template.replaceAll("{code}", encodeURIComponent(raw));
}

export function monthlyEquivalent(amountMinor: number, cadence: string): number {
  if (cadence === "weekly") return roundHalfAway((amountMinor * 52) / 12);
  if (cadence === "biweekly") return roundHalfAway((amountMinor * 365) / (15 * 12));
  if (cadence === "yearly") return roundHalfAway(amountMinor / 12);
  if (!cadence || cadence === "monthly" || !intervalOf(cadence)) return amountMinor;
  return roundHalfAway(amountMinor * monthlyFactor(cadence));
}

function isoDate(year: number, month: number, day: number): string {
  const last = new Date(year, month, 0).getDate();
  const d = Math.min(day, last);
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Every date a rhythm would have paid, from the first one through today. */
export function payDates(start: string, cadence: string, until?: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !cadence) return [];
  const today = until ?? isoDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  if (start > today) return [];
  const anchor = Number(start.slice(8, 10));
  const dates: string[] = [];
  let cursor = start;
  for (let i = 0; i < 480 && cursor <= today; i += 1) {
    dates.push(cursor);
    if (cadence === "weekly") cursor = addDays(cursor, 7);
    else if (cadence === "biweekly") cursor = addDays(cursor, 15);
    else if (cadence !== "monthly" && cadence !== "yearly" && intervalOf(cadence)) cursor = stepDate(cursor, cadence, anchor);
    else if (cadence === "yearly") cursor = isoDate(Number(cursor.slice(0, 4)) + 1, Number(cursor.slice(5, 7)), anchor);
    else cursor = isoDate(Number(cursor.slice(0, 4)) + (Number(cursor.slice(5, 7)) === 12 ? 1 : 0), Number(cursor.slice(5, 7)) === 12 ? 1 : Number(cursor.slice(5, 7)) + 1, anchor);
  }
  return dates;
}

/** A friendly amount to act on: rounded down so it never exceeds what is there ($5/$10 or C$50 steps). */
export function niceDown(minor: number, currency: Currency): number {
  if (minor <= 0) return 0;
  const step = currency === "USD" ? (minor < 10000 ? 500 : 1000) : 5000;
  const down = Math.floor(minor / step) * step;
  return down > 0 ? down : Math.round(minor);
}

/** A friendly amount to reserve: rounded up so it always covers ($10 or C$50 steps). */
export function niceUp(minor: number, currency: Currency): number {
  if (minor <= 0) return 0;
  const step = currency === "USD" ? 1000 : 5000;
  return Math.ceil(minor / step) * step;
}
