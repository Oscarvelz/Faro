/**
 * Faro for Android home-screen widgets (1.3.121). The web app builds this small, privacy-safe snapshot and hands it to
 * the app (FaroNative.setWidgetData) whenever the ledger changes and when Faro opens; the app keeps it in its own private
 * storage and draws the phone widget and the tablet panel from it. The widgets never touch the network or the account.
 *
 * Rules:
 * - Amounts are integers in minor units (cents), already in the view currency (`cur`), so the app formats them without
 *   converting anything. Days left are counted by the app from the ISO dates, so they stay right after midnight.
 * - Only what the widgets show: no account numbers, no card digits, no people's names, no notes.
 * - Every figure is the one Faro shows: Tengo / Gastaré / Queda / Usado / Pagos come from summarize() (Central),
 *   Me deben / Debo from netBalance() (the scale), the savings total is Central's Ahorros figure (pockets + accounts),
 *   spending by category is Estudio's categorySlices().
 */
import { categorySlices, monthLines, summarize } from "./engine";
import { makeNamer } from "./defaults";
import { convertMinor, monthKey } from "./money";
import { netBalance } from "./debts";
import { cardFigures, cardsOf } from "./cards";
import type { Lang, LedgerState } from "./types";

/** Where a tap on the widget lands (routed by the web app, see components/faro/widget-host.tsx). */
export type WidgetGo =
  | "desk" | "pagos" | "cobros" | "add-in" | "add-out" | "tools" | "stats"
  | "income" | "fixed" | "variable" | "shops" | "subs"
  | "vault-save" | "vault-meta" | "vault-retiro" | "vault-emergencia" | "vault-owed" | "vault-owe" | "vault-loans";

export type WidgetDue = { name: string; kind: "cuota" | "card"; on: string; amt: number | null; go: WidgetGo };
export type WidgetCat = { name: string; amt: number; prev: number; save: boolean; go: WidgetGo };
export type WidgetFlow = { key: string; label: string; inn: number; out: number };
export type WidgetPocket = { name: string; amt: number; go: WidgetGo };

export type WidgetSnapshot = {
  v: 1;
  /** When the web app built it (ISO). */
  at: string;
  lang: Lang;
  cur: "NIO" | "USD";
  /** C$ per US$ × 10 000 (Faro's rateE4), its source and date. */
  rateE4: number;
  rateSrc: string;
  rateAsOf: string;
  month: string;
  monthLabel: string;
  /** Hide amounts on the widget (dots; a tap opens Faro, which asks for the fingerprint). */
  hide: boolean;
  /** The fingerprint lock is on for this device. */
  lock: boolean;
  /** Central: Tengo, Gastaré, Queda (Tengo − Gastaré), Usado % (null with no income), Pagos and its signal. */
  have: number;
  spend: number;
  left: number;
  usedPct: number | null;
  pay: number;
  tone: "neutral" | "good" | "warn" | "bad";
  /** Ahorros: saved this month (savings lines), the month's goal (savingsGoalPct of income), the whole savings figure. */
  saveMonth: number;
  saveGoal: number;
  saveTotal: number;
  pockets: WidgetPocket[];
  /** The scale: Me deben (lent + card rewards) · Debo (loans + cards). */
  owed: number;
  owe: number;
  /** What is due: overdue cuotas and everything in the next 31 days, by date (at most 8). */
  dues: WidgetDue[];
  /** Spending by category this month (top 5) with last month's figure for the same category. */
  cats: WidgetCat[];
  /** Tengo vs Gastaré for the last six months, this month last. */
  flow: WidgetFlow[];
};

const SAVINGS = "savings";

export function shiftKey(key: string, d: number): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1 + d;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return monthKey(yy, mm + 1);
}

function dayDiff(from: string, to: string): number {
  const a = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((b - a) / 864e5);
}

const ISO = /^\d{4}-\d{2}-\d{2}/;
const isVault = (icon: string) => icon === "vault" || icon.startsWith("vault:");

/** Savings exactly as Central's Ahorros band adds them: pockets (Meta, Retiro, Emergencia, own ones, rest) + accounts.
 * Contrato, regla 3 (R-4): el total es siempre la cifra del motor para las mismas líneas. Solo los bolsillos
 * CON NOMBRE siguen la visibilidad; el dinero de categorías/subconceptos ocultos suma como resto genérico —
 * incluso si la categoría de ahorro entera está oculta, su dinero no desaparece del total. */
export function savingsOf(state: LedgerState, key: string, lang: Lang) {
  const { display, rateE4 } = state.settings;
  const names = makeNamer(state.structure, lang);
  const lines = monthLines(state, key);
  const allCats = state.structure.categories.filter((c) => c.role === SAVINGS);
  const savingsIds = new Set(allCats.map((c) => c.id));
  const visibleCats = allCats.filter((c) => !c.hidden);
  const namedVaultIds = new Set(visibleCats.flatMap((c) => c.subs.filter((s) => !s.hidden && isVault(s.icon)).map((s) => s.id)));
  const seed = visibleCats.flatMap((c) => c.subs.filter((s) => !s.hidden && !isVault(s.icon)).map((s) => ({ id: s.id, name: names.sub(s.id) })));
  const buckets = new Map<string, number>();
  for (const line of lines) {
    if (!line.active || !savingsIds.has(line.categoryId) || namedVaultIds.has(line.subId)) continue;
    const id = line.subId && seed.some((s) => s.id === line.subId) ? line.subId : "rest";
    const minor = line.balanceMinor != null ? line.balanceMinor : line.amountMinor;
    const cur = line.balanceMinor != null ? line.balanceCurrency : line.currency;
    buckets.set(id, (buckets.get(id) ?? 0) + convertMinor(minor, cur, display, rateE4));
  }
  const rest = buckets.get("rest") ?? 0;
  const pockets = seed.map((s) => ({ id: s.id, name: s.name, amt: buckets.get(s.id) ?? 0 }));
  if (rest !== 0) pockets.push({ id: "rest", name: lang === "en" ? "Savings" : "Ahorros", amt: rest });
  const pocketTotal = pockets.reduce((a, p) => a + p.amt, 0);
  const accounts = visibleCats.flatMap((c) => c.subs.filter((s) => !s.hidden && isVault(s.icon))).reduce((sum, s) => sum + lines
    .filter((line) => line.active && line.subId === s.id)
    .reduce((a, line) => a + convertMinor(line.balanceMinor ?? line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, display, rateE4), 0), 0);
  return { pockets, pocketTotal, accounts, total: pocketTotal + accounts };
}

const goOfPocket = (id: string): WidgetGo => (id.endsWith(".meta") ? "vault-meta" : id.endsWith(".retiro") ? "vault-retiro" : id.endsWith(".emergencia") ? "vault-emergencia" : "vault-save");

export type WidgetOptions = { today: string; hide: boolean; lock: boolean; now?: string };

/** The snapshot for the calendar month of `today` (YYYY-MM-DD), whatever month the screen is showing. */
export function buildWidgetSnapshot(state: LedgerState, lang: Lang, opts: WidgetOptions): WidgetSnapshot {
  const { today } = opts;
  const key = today.slice(0, 7);
  const { display, rateE4 } = state.settings;
  const names = makeNamer(state.structure, lang);
  const s = summarize(state, key, lang);
  const nb = netBalance(state, today);
  const sav = savingsOf(state, key, lang);

  // Dues: dated cuotas (overdue too, like Debo → Cuotas' "Próximos 30 días") and credit cards with a known due day.
  const dues: WidgetDue[] = [];
  for (const l of monthLines(state, key)) {
    if (l.kind !== "subscription" || !l.active || !ISO.test(l.nextDue || "")) continue;
    const on = l.nextDue.slice(0, 10);
    if (dayDiff(today, on) > 31) continue;
    dues.push({ name: (l.concept || "").trim() || (lang === "en" ? "Plan" : "Cuota"), kind: "cuota", on, amt: convertMinor(l.amountMinor, l.currency, display, rateE4), go: "pagos" });
  }
  // Cards by their short bank name ("PayPal"), unless two cards share it (then their own names).
  const cards = cardsOf(state);
  const issuers = new Map<string, number>();
  for (const c of cards) if (c.issuer) issuers.set(c.issuer, (issuers.get(c.issuer) ?? 0) + 1);
  for (const c of cards) {
    const f = cardFigures(state, c, today);
    if (!f.known || !f.dueOn || f.balance <= 0) continue;
    const d = dayDiff(today, f.dueOn);
    if (d < 0 || d > 31) continue;
    const amt = f.min != null ? convertMinor(f.min, c.currency, display, rateE4) : null;
    dues.push({ name: ((c.issuer && issuers.get(c.issuer) === 1 ? c.issuer : c.name) || c.issuer || "").trim() || (lang === "en" ? "Card" : "Tarjeta"), kind: "card", on: f.dueOn, amt, go: "vault-loans" });
  }
  dues.sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : a.name.localeCompare(b.name)));

  // Spending by category (Estudio's slices), with last month for the same category.
  const prevSlices = new Map(categorySlices(state, shiftKey(key, -1), names, lang).map((x) => [x.id, x.minor]));
  const goOfCat = (id: string): WidgetGo => {
    const c = state.structure.categories.find((x) => x.id === id);
    if (c) return c.role === SAVINGS ? "vault-save" : c.group === "fixed" ? "fixed" : "variable";
    if (state.structure.purchases.some((p) => p.id === id) || id === "purchase") return "shops";
    if (id === "subscription") return "subs";
    if (id === "expense-fixed") return "fixed";
    return "variable";
  };
  // Lines with no category are grouped by kind (Estudio names them after one of their lines); the widget names the group.
  const KIND: Record<string, [string, string]> = {
    subscription: ["Cuotas", "Plans"], purchase: ["Compras", "Shopping"],
    "expense-fixed": ["Fijos", "Fixed"], "expense-variable": ["Variables", "Variable"],
  };
  const slices = categorySlices(state, key, names, lang).slice(0, 5).map((x) => ({ ...x, name: KIND[x.id] ? KIND[x.id][lang === "en" ? 1 : 0] : x.name }));
  // Two categories with one name (Casa in Fijos and in Variables) get their book beside it.
  const seen = new Map<string, number>();
  for (const x of slices) seen.set(x.name, (seen.get(x.name) ?? 0) + 1);
  const bookWord = (id: string) => {
    const g = state.structure.categories.find((c) => c.id === id)?.group;
    return g === "fixed" ? (lang === "en" ? "fixed" : "fijos") : g === "variable" ? (lang === "en" ? "variable" : "variables") : "";
  };
  const cats: WidgetCat[] = slices.map((x) => ({
    name: ((seen.get(x.name) ?? 0) > 1 && bookWord(x.id) ? `${x.name} · ${bookWord(x.id)}` : x.name) || "—",
    amt: x.minor,
    prev: prevSlices.get(x.id) ?? 0,
    save: state.structure.categories.find((c) => c.id === x.id)?.role === SAVINGS,
    go: goOfCat(x.id),
  }));

  const loc = lang === "en" ? "en-US" : "es-NI";
  const mid = (k: string) => new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 15));
  const shortFmt = new Intl.DateTimeFormat(loc, { month: "short", timeZone: "UTC" });
  const flow: WidgetFlow[] = [];
  for (let i = 5; i >= 0; i--) {
    const k = shiftKey(key, -i);
    const m = i === 0 ? s : summarize(state, k, lang);
    // Three letters in both languages ("sept" → "Sep"), so the six labels line up.
    const label = shortFmt.format(mid(k)).replace(".", "").slice(0, 3);
    flow.push({ key: k, label: label.charAt(0).toUpperCase() + label.slice(1), inn: m.income, out: m.expense });
  }
  const longMonth = new Intl.DateTimeFormat(loc, { month: "long", timeZone: "UTC" }).format(mid(key));

  return {
    v: 1,
    at: opts.now ?? new Date().toISOString(),
    lang,
    cur: display,
    rateE4,
    rateSrc: state.settings.rateSource || "",
    rateAsOf: state.settings.rateAsOf || "",
    month: key,
    monthLabel: longMonth.charAt(0).toUpperCase() + longMonth.slice(1),
    hide: opts.hide,
    lock: opts.lock,
    have: s.income,
    spend: s.expense,
    left: s.opportunity,
    usedPct: s.spentPct === null ? null : Math.round(s.spentPct),
    pay: s.debt,
    tone: s.tone,
    saveMonth: s.savingsFlow,
    saveGoal: s.savingsGoal,
    saveTotal: sav.total,
    pockets: sav.pockets.filter((p) => p.amt !== 0).slice(0, 4).map((p) => ({ name: p.name, amt: p.amt, go: goOfPocket(p.id) })),
    owed: nb.owed,
    owe: nb.owe,
    dues: dues.slice(0, 8),
    cats,
    flow,
  };
}

/** Device-only choice "Widget: ocultar montos": "1" hide, "0" show, absent = follow the fingerprint lock. */
export const WIDGET_HIDE_KEY = "faro-widget-hide";

export function widgetHide(pref: string | null, lockOn: boolean): boolean {
  if (pref === "1") return true;
  if (pref === "0") return false;
  return lockOn;
}
