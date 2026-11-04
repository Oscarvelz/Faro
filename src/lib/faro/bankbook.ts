/**
 * Bank import, the light half (Nov 2026): accounts, merchant names, learned rules and card rewards.
 * Loaded with the app (Estudio and Asesor read the rewards); the parsers live in bankparse.ts and load only when import opens.
 * Money stays in normal lines: an imported purchase is a line with `sourceId` (and `importId` for its statement key).
 */
import { convertMinor } from "./money.ts";
import type { AcctKind, BankSource, CatalogItem, Currency, ImportBook, LedgerState, Line, MerchantRule, RewardClass, Structure } from "./types.ts";

export const REWARD_CLASSES: RewardClass[] = ["dining", "grocery", "drug", "gas", "online", "other"];

/** Oscar's four accounts. Rates are defaults he can edit in Ajustes (basis points: 300 = 3%). */
export const DEFAULT_SOURCES: (BankSource & { name: string; icon: string })[] = [
  { id: "acct-chase-chk", name: "Chase · cuenta", icon: "Landmark", bank: "chase", kind: "checking", rates: { other: 0 } },
  { id: "acct-chase-card", name: "Chase · tarjeta", icon: "CreditCard", bank: "chase", kind: "card", rates: { dining: 300, grocery: 300, drug: 300, other: 100 } },
  { id: "acct-sf-card", name: "State Farm · tarjeta", icon: "CreditCard", bank: "statefarm", kind: "card", rates: { other: 150 } },
  { id: "acct-paypal", name: "PayPal", icon: "Wallet", bank: "paypal", kind: "paypal", rates: { online: 300, other: 300 }, elig: 500 },
];

export function importBook(state: LedgerState | null | undefined): ImportBook {
  const b = state?.imports;
  return { sources: Array.isArray(b?.sources) ? b!.sources : [], rules: Array.isArray(b?.rules) ? b!.rules : [], maps: b?.maps && typeof b.maps === "object" ? b.maps : {}, files: b?.files && typeof b.files === "object" ? b.files : {} };
}

/** Accounts as the user sees them: the catalog item (name, icon) joined with its import settings; defaults until first saved. */
export type Acct = BankSource & { name: string; icon: string; saved: boolean };
export function accounts(state: LedgerState | null | undefined): Acct[] {
  const book = importBook(state);
  const cat = state?.structure.catalog.filter((c) => c.kind === "acct") ?? [];
  const out: Acct[] = [];
  for (const d of DEFAULT_SOURCES) {
    const item = cat.find((c) => c.id === d.id);
    const src = book.sources.find((s) => s.id === d.id);
    if (item?.hidden) continue;
    out.push({ ...d, ...(src ?? {}), name: item ? (item.customName || item.nameKey || d.name) : d.name, icon: item?.icon ?? d.icon, saved: !!(item && src) });
  }
  for (const item of cat) {
    if (out.some((a) => a.id === item.id) || item.hidden) continue;
    const src = book.sources.find((s) => s.id === item.id);
    out.push({ id: item.id, bank: src?.bank ?? "other", kind: src?.kind ?? "card", rates: src?.rates ?? { other: 0 }, elig: src?.elig, pocketId: src?.pocketId, name: item.customName || item.nameKey, icon: item.icon, saved: !!src });
  }
  return out;
}

/** Writes the catalog items and settings for the accounts that are still defaults (first import or first edit). */
export function ensureAccounts(state: LedgerState): LedgerState {
  const book = importBook(state);
  let catalog = state.structure.catalog;
  const sources = [...book.sources];
  for (const d of DEFAULT_SOURCES) {
    if (!catalog.some((c) => c.id === d.id)) {
      const item: CatalogItem = { id: d.id, nameKey: "", customName: d.name, icon: d.icon, hidden: false, order: 50 + DEFAULT_SOURCES.indexOf(d), kind: "acct", urlTemplate: "" };
      catalog = [...catalog, item];
    }
    if (!sources.some((s) => s.id === d.id)) sources.push({ id: d.id, bank: d.bank, kind: d.kind, rates: { ...d.rates }, ...(d.elig ? { elig: d.elig } : {}) });
  }
  const structure: Structure = { ...state.structure, catalog };
  return { ...state, structure, imports: { ...book, sources } };
}

export function withBook(state: LedgerState, fn: (b: ImportBook) => ImportBook): LedgerState {
  const base = ensureAccounts(state);
  return { ...base, imports: fn(importBook(base)) };
}

/* ------------------------------------------------------------------ merchant names */

const STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR".split(" "));
const CITIES = new Set(["miami", "kendall", "hialeah", "doral", "homestead", "pinecrest", "cutler bay", "coral gables", "palmetto bay", "south miami", "miami beach", "sweetwater", "westchester", "fort lauderdale", "orlando", "tampa", "managua", "san jose", "new york", "seattle", "san francisco"]);
const PREFIX = /^(?:paypal\s*\*|pp\s*\*|sq\s*\*|tst\s*\*|sp\s*\*|sp\s+|dd\s*\*|py\s*\*|ckc\s*\*|toast\s*\*|in\s*\*|par\s*\*|clover\s*\*|pos\s+|debit card purchase\s+|purchase\s+|card purchase( with pin)?\s+|recurring( card)? purchase\s+|checkcard\s+|\d{4}\s+)/i;

/** "SQ *CAFE CRUZ #12 MIAMI FL" → "cafe cruz". Store numbers, processor prefixes, city and state go. */
export function merchantKey(raw: string): string {
  let s = ` ${raw ?? ""} `.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) s = s.replace(PREFIX, "").trim();
  s = s.split(/\s+-\s+|\s{2,}/)[0];
  // "AMAZON MKTPL*2X3Y4" → "AMAZON MKTPL"; "UBER *EATS" keeps EATS (no digits after the star).
  s = s.replace(/\*\s*([A-Z0-9]*\d[A-Z0-9]*)\b.*$/i, "").replace(/\*/g, " ");
  s = s.replace(/https?:\/\/\S+/gi, " ").replace(/\b([\w-]+)\.(com|net|org|co)\b(\/\S*)?/gi, " $1 ");
  // Bank boilerplate around the name ("FPL DIRECT DEBIT ELEC PYMT PPD ID: 559…").
  s = s.replace(/\b(ppd|web|ccd|tel)\s+id:?\s*\S+/gi, " ").replace(/\b(direct debit|direct dep|ach (debit|credit)|pymt|pmt|debit card|recurring|purchase|pos)\b/gi, " ");
  s = s.replace(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,})\b/g, " ");
  // A store number ends the name: the city follows it.
  const num = s.search(/(#\s*\d+|\bstore\s+\d+|\b\d{3,}\b)/i);
  let cityCut = false;
  if (num > 2) { s = s.slice(0, num); cityCut = true; }
  let words = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9&' ]/g, " ").split(/\s+/).filter(Boolean);
  if (!cityCut && words.length > 1 && STATES.has(words[words.length - 1].toUpperCase())) {
    words.pop();
    const two = words.slice(-2).join(" ");
    if (words.length > 2 && CITIES.has(two)) words = words.slice(0, -2);
    else if (words.length > 1 && CITIES.has(words[words.length - 1])) words.pop();
    else if (words.length > 2) words.pop();
  }
  words = words.filter((w) => !/^\d+$/.test(w) && w !== "inc" && w !== "llc");
  return words.slice(0, 4).join(" ").trim();
}

export function merchantLabel(raw: string): string {
  const key = merchantKey(raw);
  if (!key) return (raw ?? "").trim().slice(0, 40);
  // Short words without vowels are initials (CVS, FPL, BP); everything else is Title Case.
  return key.replace(/\b([a-z])([a-z']*)/g, (w: string, a: string, b: string) => (w.length <= 4 && !/[aeiouy]/.test(w) ? w.toUpperCase() : a.toUpperCase() + b)).replace(/\bAt&t\b/i, "AT&T");
}

export function findRule(rules: MerchantRule[], key: string): MerchantRule | undefined {
  if (!key) return undefined;
  return rules.find((r) => r.key === key) ?? rules.filter((r) => key.startsWith(`${r.key} `) || r.key.startsWith(`${key} `)).sort((a, b) => b.key.length - a.key.length)[0];
}

/** Records one filing: the next purchase at this merchant goes there by itself. */
export function learnRule(rules: MerchantRule[], key: string, label: string, target: string, rc?: RewardClass): MerchantRule[] {
  if (!key || !target) return rules;
  const at = new Date().toISOString().slice(0, 10);
  const hit = rules.find((r) => r.key === key);
  if (hit) return rules.map((r) => (r.key === key ? { ...r, target, rc: rc ?? r.rc, n: r.target === target ? r.n + 1 : 1, at } : r));
  return [...rules, { key, label, target, ...(rc ? { rc } : {}), n: 1, at }];
}

/* ------------------------------------------------------------------ category suggestions */

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Chase's Category column → rewards class + the names to look for in the user's own categories. */
export const CHASE_CATEGORIES: Record<string, { rc: RewardClass; want: string[]; purchase?: boolean }> = {
  "food & drink": { rc: "dining", want: ["comida", "restaurantes", "restaurants", "food", "comida fuera"] },
  groceries: { rc: "grocery", want: ["despensa", "supermercado", "groceries", "comida", "alimentos"] },
  gas: { rc: "gas", want: ["gasolina", "fuel", "gas"] },
  "health & wellness": { rc: "drug", want: ["farmacia", "pharmacy", "salud", "health", "medicinas", "medico"] },
  shopping: { rc: "other", want: ["otros", "other"], purchase: true },
  entertainment: { rc: "other", want: ["entretenimiento", "eventos", "entertainment", "tv"] },
  travel: { rc: "other", want: ["viajes", "travel", "hotel"] },
  "bills & utilities": { rc: "other", want: ["servicios", "utilities", "internet", "celular"] },
  automotive: { rc: "gas", want: ["mantenimiento", "transporte", "transport"] },
  personal: { rc: "other", want: ["personales", "personal", "belleza"] },
  home: { rc: "other", want: ["hogar", "casa", "home", "mantenimiento"], purchase: true },
  "gifts & donations": { rc: "other", want: ["regalos", "gifts"] },
  education: { rc: "other", want: ["estudio", "libros", "education"] },
  "professional services": { rc: "other", want: ["otros", "other"] },
  "fees & adjustments": { rc: "other", want: ["otros", "other"] },
};

/** Merchant words that say what a store is, for files without a category column. */
const WORD_CLASS: [RegExp, RewardClass, string][] = [
  [/\b(cvs|walgreens|pharmacy|farmacia|drug|rite aid)\b/, "drug", "health & wellness"],
  [/\b(publix|winn dixie|aldi|sedano|presidente|bravo|fresco|whole foods|trader joe|costco|sams club|bj'?s|walmart neighborhood|grocery|market|supermarket|navarro)\b/, "grocery", "groceries"],
  [/\b(shell|chevron|exxon|mobil|marathon|sunoco|bp|racetrac|wawa|citgo|speedway|gas station|valero)\b/, "gas", "gas"],
  [/\b(restaurant|cafe|coffee|starbucks|dunkin|mcdonald|burger|pizza|taco|chipotle|subway|wendy|kfc|chick fil a|carreta|versailles|pollo|grill|bakery|panaderia|doordash|uber eats|grubhub|bar)\b/, "dining", "food & drink"],
];
export function guessClass(key: string, chaseCategory?: string): { rc: RewardClass; chase?: string } {
  const c = fold(chaseCategory ?? "").trim();
  if (c && CHASE_CATEGORIES[c]) return { rc: CHASE_CATEGORIES[c].rc, chase: c };
  for (const [re, rc, chase] of WORD_CLASS) if (re.test(key)) return { rc, chase };
  return { rc: "other" };
}

export type Target = { value: string; label: string; cat: string; sub: string };
type Namer = { cat: (id: string) => string; sub: (id: string) => string; purchase: (id: string) => string };

/** Every place an imported line can go, as "<kind>|<categoryId>|<subId>" (variable first, then fixed, then purchases). */
export function targets(structure: Structure, names: Namer): Target[] {
  const out: Target[] = [];
  const cats = structure.categories.filter((c) => !c.hidden).sort((a, b) => (a.group === b.group ? a.order - b.order : a.group === "variable" ? -1 : 1));
  for (const c of cats) {
    const kind = c.group === "fixed" ? "expense-fixed" : "expense-variable";
    const cat = names.cat(c.id);
    out.push({ value: `${kind}|${c.id}|`, label: cat, cat, sub: "" });
    for (const s of c.subs.filter((x) => !x.hidden && !(x.icon === "vault" || x.icon.startsWith("vault:"))).sort((a, b) => a.order - b.order)) {
      const sub = s.customName || names.sub(s.id);
      out.push({ value: `${kind}|${c.id}|${s.id}`, label: `${cat} · ${sub}`, cat, sub });
    }
  }
  for (const p of structure.purchases.filter((x) => !x.hidden).sort((a, b) => a.order - b.order)) {
    const cat = names.purchase(p.id);
    out.push({ value: `purchase|${p.id}|`, label: cat, cat, sub: "" });
  }
  return out;
}

/** A first suggestion from Chase's category (or the merchant's words), matched to the user's own category names. */
export function suggestTarget(list: Target[], chase: string | undefined): string {
  const spec = chase ? CHASE_CATEGORIES[chase] : undefined;
  if (!spec) return "";
  const pool = spec.purchase ? list.filter((t) => t.value.startsWith("purchase|")) : list.filter((t) => !t.value.startsWith("purchase|"));
  // Exact names first (all of them, in order), then names that contain a wanted word.
  for (const want of spec.want) {
    const hit = pool.find((t) => t.sub && fold(t.sub) === want) ?? pool.find((t) => !t.sub && fold(t.cat) === want);
    if (hit) return hit.value;
  }
  for (const want of spec.want) {
    const hit = pool.find((t) => fold(t.sub || t.cat).includes(want));
    if (hit) return hit.value;
  }
  return "";
}

export function splitTarget(value: string): { kind: Line["kind"]; categoryId: string; subId: string } {
  const [kind, categoryId = "", subId = ""] = value.split("|");
  return { kind: (kind || "expense-variable") as Line["kind"], categoryId, subId };
}

/* ------------------------------------------------------------------ rewards */

export function rateOf(src: BankSource | undefined, rc: RewardClass | string | undefined, eligible = false): number {
  if (!src) return 0;
  if (src.kind === "paypal" && eligible && src.elig) return src.elig;
  const r = src.rates ?? {};
  const v = r[(rc as RewardClass) ?? "other"];
  return typeof v === "number" ? v : (r.other ?? 0);
}

/** The best everyday card for this class (PayPal counts only for purchases made online through PayPal). */
export function bestFor(accts: Acct[], rc: RewardClass | string | undefined, online: boolean): Acct | undefined {
  return accts.filter((a) => a.kind === "card" || (online && a.kind === "paypal")).sort((a, b) => rateOf(b, rc) - rateOf(a, rc))[0];
}

export type LineReward = { earned: number; missed: number; best?: Acct; rate: number; bestRate: number };
/** What this purchase earned and what the best card would have earned more (minor units of the line's currency). */
export function lineReward(line: Pick<Line, "amountMinor" | "sourceId" | "via" | "rc">, accts: Acct[], eligible = false): LineReward | null {
  const src = accts.find((a) => a.id === line.sourceId);
  if (!src) return null;
  const rate = rateOf(src, line.rc, eligible);
  const online = src.kind === "paypal" || !!line.via;
  const best = bestFor(accts, line.rc, online);
  const bestRate = best ? rateOf(best, line.rc) : 0;
  const amt = line.amountMinor;
  const earned = Math.round((amt * rate) / 10000);
  const missed = amt > 0 && best && bestRate > rate && best.id !== src.id ? Math.round((amt * (bestRate - rate)) / 10000) : 0;
  return { earned, missed, best: missed ? best : undefined, rate, bestRate };
}

export type RewardsMonth = { earned: number; missed: number; possible: number; count: number; top: { rc: string; best: Acct; missed: number } | null };
/** One month of imported card spending, in the view currency. */
export function rewardsMonth(state: LedgerState, key: string, display: Currency, rateE4: number): RewardsMonth | null {
  const lines = state.months[key]?.lines ?? [];
  const accts = accounts(state);
  const rules = importBook(state).rules;
  let earned = 0, missed = 0, count = 0;
  const byClass = new Map<string, { best: Acct; missed: number }>();
  for (const line of lines) {
    if (!line.active || !line.sourceId || line.xfer || line.kind.startsWith("income")) continue;
    const elig = !!findRule(rules, merchantKey(line.concept))?.elig;
    const r = lineReward(line, accts, elig);
    if (!r) continue;
    count += 1;
    earned += convertMinor(r.earned, line.currency, display, rateE4);
    if (r.missed && r.best) {
      const m = convertMinor(r.missed, line.currency, display, rateE4);
      missed += m;
      const k = `${line.rc ?? "other"}|${r.best.id}`;
      const cur = byClass.get(k);
      byClass.set(k, { best: r.best, missed: (cur?.missed ?? 0) + m });
    }
  }
  if (!count) return null;
  let top: RewardsMonth["top"] = null;
  for (const [k, v] of byClass) if (!top || v.missed > top.missed) top = { rc: k.split("|")[0], best: v.best, missed: v.missed };
  return { earned, missed, possible: earned + missed, count, top };
}

export const RC_LABEL: Record<RewardClass, [string, string]> = {
  dining: ["comida fuera", "dining"],
  grocery: ["despensa", "groceries"],
  drug: ["farmacia", "drugstore"],
  gas: ["gasolina", "gas"],
  online: ["en línea", "online"],
  other: ["lo demás", "everything else"],
};
export const rcLabel = (rc: string, lang: string) => (RC_LABEL[rc as RewardClass] ?? RC_LABEL.other)[lang === "en" ? 1 : 0];

export const kindOf = (a: { kind: AcctKind }) => a.kind;
