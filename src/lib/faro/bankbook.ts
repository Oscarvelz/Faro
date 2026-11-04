/**
 * Bank import, the light half (Nov 2026): accounts, merchant names, learned rules and card rewards.
 * Loaded with the app (Estudio and Asesor read the rewards); the parsers live in bankparse.ts and load only when import opens.
 * Money stays in normal lines: an imported purchase is a line with `sourceId` (and `importId` for its statement key).
 */
import { convertMinor } from "./money.ts";
import type { AcctKind, BankSource, BonusRow, CatalogItem, Currency, ImportBook, LedgerState, Line, MerchantRule, RewardClass, Structure } from "./types.ts";

export const REWARD_CLASSES: RewardClass[] = ["travel", "dining", "grocery", "drug", "gas", "online", "other"];

type DefaultSource = BankSource & { name: string; icon: string; legacy?: string; oldNames?: string[]; oldRates?: BankSource["rates"][] };
/**
 * Oscar's accounts. Rates are each card's published rates (Nov 2026), editable in Ajustes (basis points: 300 = 3%).
 * Chase Freedom Unlimited: 5% Chase Travel, 3% dining and drugstores, 1.5% everything else (groceries are 1.5%).
 * Wells Fargo Active Cash: 2% on everything. PayPal Cashback Mastercard: 3% paying with PayPal at checkout, 1.5% elsewhere.
 * The Wells Fargo card was the "State Farm" preset (same card, renamed): old data keeps its id `acct-sf-card`.
 * `oldRates` are earlier factory defaults: a saved account still on them moves to the new ones; edited rates stay.
 */
export const DEFAULT_SOURCES: DefaultSource[] = [
  { id: "acct-chase-chk", name: "Chase · cuenta", icon: "Landmark", bank: "chase", kind: "checking", rates: { other: 0 } },
  { id: "acct-chase-card", name: "Chase · tarjeta", icon: "CreditCard", bank: "chase", kind: "card", rates: { travel: 500, dining: 300, drug: 300, other: 150 }, oldRates: [{ dining: 300, grocery: 300, drug: 300, other: 100 }] },
  { id: "acct-wf-card", name: "Wells Fargo · tarjeta", icon: "CreditCard", bank: "wellsfargo", kind: "card", rates: { other: 200 }, legacy: "acct-sf-card", oldNames: ["State Farm · tarjeta"], oldRates: [{ other: 150 }] },
  { id: "acct-pp-card", name: "PayPal · tarjeta", icon: "CreditCard", bank: "paypal", kind: "card", rates: { online: 300, other: 150 } },
  { id: "acct-paypal", name: "PayPal", icon: "Wallet", bank: "paypal", kind: "paypal", rates: { other: 0 }, oldRates: [{ online: 300, other: 300 }] },
  { id: "acct-pp-save", name: "PayPal · ahorros", icon: "PiggyBank", bank: "paypal", kind: "savings", rates: { other: 0 } },
];

const sameRates = (a: BankSource["rates"] | undefined, b: BankSource["rates"]) => {
  const ka = Object.keys(a ?? {}).sort(), kb = Object.keys(b).sort();
  return ka.join() === kb.join() && ka.every((k) => a![k as RewardClass] === b[k as RewardClass]);
};
/** A saved account still on an older factory default (rates, name, bank) reads as today's default. */
function freshen(d: DefaultSource, src: BankSource | undefined): BankSource | undefined {
  if (!src) return src;
  let out = src;
  if (d.oldRates?.some((r) => sameRates(src.rates, r))) { out = { ...out, rates: { ...d.rates } }; delete out.elig; }
  if (d.legacy && out.bank === "statefarm") out = { ...out, bank: d.bank };
  return out;
}
/** The id an account really has in this ledger: the legacy id when old data uses it. */
function idIn(d: DefaultSource, cat: CatalogItem[], sources: BankSource[]): string {
  if (d.legacy && !cat.some((c) => c.id === d.id) && (cat.some((c) => c.id === d.legacy) || sources.some((s) => s.id === d.legacy))) return d.legacy;
  return d.id;
}

export function importBook(state: LedgerState | null | undefined): ImportBook {
  const b = state?.imports;
  return { sources: Array.isArray(b?.sources) ? b!.sources : [], rules: Array.isArray(b?.rules) ? b!.rules : [], maps: b?.maps && typeof b.maps === "object" ? b.maps : {}, files: b?.files && typeof b.files === "object" ? b.files : {}, bonus: Array.isArray(b?.bonus) ? b!.bonus.filter((x) => x && typeof x.id === "string" && typeof x.name === "string") : [] };
}

/** Accounts as the user sees them: the catalog item (name, icon) joined with its import settings; defaults until first saved. */
export type Acct = BankSource & { name: string; icon: string; saved: boolean };
/** Accounts in daily use; `all` also returns archived ones (`off` set), which old lines still point at. */
export function accounts(state: LedgerState | null | undefined, all = false): Acct[] {
  const book = importBook(state);
  const cat = state?.structure.catalog.filter((c) => c.kind === "acct") ?? [];
  const out: Acct[] = [];
  for (const d of DEFAULT_SOURCES) {
    const id = idIn(d, cat, book.sources);
    const item = cat.find((c) => c.id === id);
    const src = freshen(d, book.sources.find((s) => s.id === id));
    if (item?.hidden || (src?.off && !all)) continue;
    const custom = item ? (item.customName || item.nameKey || d.name) : d.name;
    const name = d.oldNames?.includes(custom) ? d.name : custom;
    const { legacy: _l, oldNames: _n, oldRates: _r, ...base } = d;
    out.push({ ...base, ...(src ?? {}), id, name, icon: item?.icon ?? d.icon, saved: !!(item && src) });
  }
  for (const item of cat) {
    if (out.some((a) => a.id === item.id) || item.hidden) continue;
    const src = book.sources.find((s) => s.id === item.id);
    if (src?.off && !all) continue;
    out.push({ id: item.id, bank: src?.bank ?? "other", kind: src?.kind ?? "card", rates: src?.rates ?? { other: 0 }, elig: src?.elig, pocketId: src?.pocketId, apyBps: src?.apyBps, off: src?.off, mine: src?.mine, name: item.customName || item.nameKey, icon: item.icon, saved: !!src });
  }
  return out;
}

/** Writes the catalog items and settings for the accounts that are still defaults (first import or first edit). */
export function ensureAccounts(state: LedgerState): LedgerState {
  const book = importBook(state);
  let catalog = state.structure.catalog;
  let sources = [...book.sources];
  for (const d of DEFAULT_SOURCES) {
    const id = idIn(d, catalog.filter((c) => c.kind === "acct"), sources);
    const at = catalog.findIndex((c) => c.id === id);
    if (at < 0) {
      const item: CatalogItem = { id, nameKey: "", customName: d.name, icon: d.icon, hidden: false, order: 50 + DEFAULT_SOURCES.indexOf(d), kind: "acct", urlTemplate: "" };
      catalog = [...catalog, item];
    } else if (d.oldNames?.includes(catalog[at].customName)) {
      catalog = catalog.map((c, i) => (i === at ? { ...c, customName: d.name } : c));
    }
    const si = sources.findIndex((s) => s.id === id);
    if (si < 0) sources.push({ id, bank: d.bank, kind: d.kind, rates: { ...d.rates } });
    else sources = sources.map((s, i) => (i === si ? freshen(d, s)! : s));
  }
  const structure: Structure = { ...state.structure, catalog };
  return { ...state, structure, imports: { ...book, sources } };
}

export function withBook(state: LedgerState, fn: (b: ImportBook) => ImportBook): LedgerState {
  const base = ensureAccounts(state);
  return { ...base, imports: fn(importBook(base)) };
}

/* ------------------------------------------------------------------ the user's own cards and banks */

/** Issuer presets for a new account (value = `bank`; "other" for any other). Only Chase, Wells Fargo and PayPal have file readers. */
export const ISSUERS: { value: string; label: string }[] = [
  { value: "chase", label: "Chase" }, { value: "wellsfargo", label: "Wells Fargo" }, { value: "paypal", label: "PayPal" },
  { value: "citi", label: "Citi" }, { value: "capitalone", label: "Capital One" }, { value: "amex", label: "Amex" },
  { value: "discover", label: "Discover" }, { value: "bofa", label: "Bank of America" }, { value: "other", label: "" },
];
export const KIND_ICON: Record<AcctKind, string> = { card: "CreditCard", checking: "Landmark", savings: "PiggyBank", paypal: "Wallet" };
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const rid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, "").slice(0, 10);

export type NewAcct = { name: string; kind: AcctKind; bank: string; rates: Record<string, number>; bonus?: BonusRow[] };
/** Adds an account of the user's own: a catalog item (name, icon) + its import settings, and any new bonus rows. Returns the new id too. */
export function addAccount(state: LedgerState, a: NewAcct): { state: LedgerState; id: string } {
  const base = ensureAccounts(state);
  const id = `acct-u-${rid()}`;
  const order = 60 + base.structure.catalog.filter((c) => c.kind === "acct").length;
  const item: CatalogItem = { id, nameKey: "", customName: a.name.trim(), icon: KIND_ICON[a.kind], hidden: false, order, kind: "acct", urlTemplate: "" };
  const book = importBook(base);
  const bonus = [...(book.bonus ?? []), ...(a.bonus ?? []).filter((b) => !book.bonus?.some((x) => x.id === b.id))];
  const rates: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.rates)) if (Number.isFinite(v) && v >= 0) rates[k] = Math.round(v);
  if (typeof rates.other !== "number") rates.other = 0;
  return { id, state: { ...base, structure: { ...base.structure, catalog: [...base.structure.catalog, item] }, imports: { ...book, bonus, sources: [...book.sources, { id, bank: a.bank || "other", kind: a.kind, rates, mine: true }] } } };
}
/** Archives (never deletes): lines, merchant rules and past rewards keep pointing at it. */
export function archiveAccount(state: LedgerState, id: string, day = localDay()): LedgerState {
  return withBook(state, (b) => ({ ...b, sources: b.sources.map((x) => (x.id === id ? { ...x, off: day } : x)) }));
}
export function restoreAccount(state: LedgerState, id: string): LedgerState {
  return withBook(state, (b) => ({ ...b, sources: b.sources.map((x) => { if (x.id !== id) return x; const n = { ...x }; delete n.off; return n; }) }));
}
export function newBonus(name: string, target?: string): BonusRow { return { id: `b-${rid()}`, name: name.trim(), ...(target ? { target } : {}) }; }
/** The bonus row a filing lands in: one linked to that exact subcategory, else to its whole category. */
export function bonusFor(bonus: BonusRow[] | undefined, target: string): BonusRow | undefined {
  if (!target || !bonus?.length) return undefined;
  const [k, c] = target.split("|");
  return bonus.find((b) => b.target === target) ?? bonus.find((b) => b.target === `${k}|${c}|`);
}
/** The reward row of a filed line: PayPal checkout and Chase Travel keep theirs; a linked bonus row wins over the guess. */
export function rowFor(bonus: BonusRow[] | undefined, target: string, label: string, rc: string): string {
  if (rc === "online" || rc === "travel") return rc;
  return bonusFor(bonus, target)?.id ?? classOfLabel(label, rc as RewardClass);
}
/** A category the user picks says what kind of shop it is (for card rewards). */
export function classOfLabel(label: string, fallback: RewardClass): RewardClass {
  const s = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/restaur|comida fuera|comidas|dining|cafe/.test(s)) return "dining";
  if (/despensa|super|grocer|alimentos|comida/.test(s)) return "grocery";
  if (/farmac|salud|pharm|medic|health/.test(s)) return "drug";
  if (/gasolin|fuel|\bgas\b/.test(s)) return "gas";
  return guessClass(s).rc === "other" ? fallback : guessClass(s).rc;
}
/** Does this reward row apply to this card (Chase Travel is Chase's, PayPal checkout is PayPal's, unless the card has its own rate)? */
export function rowApplies(a: Pick<BankSource, "bank" | "rates">, rc: string): boolean {
  if (rc === "online") return a.bank === "paypal" || typeof a.rates.online === "number";
  if (rc === "travel") return a.bank === "chase" || typeof a.rates.travel === "number";
  return true;
}

/* ------------------------------------------------------------------ merchant names */

const STATES = new Set("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR".split(" "));
const CITIES = new Set(["miami", "kendall", "hialeah", "doral", "homestead", "pinecrest", "cutler bay", "coral gables", "palmetto bay", "south miami", "miami beach", "sweetwater", "westchester", "fort lauderdale", "orlando", "tampa", "managua", "san jose", "new york", "seattle", "san francisco"]);
const PREFIX = /^(?:paypal\s*\*|pp\s*\*|sq\s*\*|tst\s*\*|sp\s*\*|sp\s+|dd\s*\*|py\s*\*|ckc\s*\*|toast\s*\*|in\s*\*|par\s*\*|clover\s*\*|pos\s+|debit card purchase\s+|purchase\s+|card purchase( with pin)?\s+|recurring( card)? purchase\s+|checkcard\s+|\d{4}\s+)/i;

/** "SQ *CAFE CRUZ #12 MIAMI FL" → "cafe cruz". Store numbers, processor prefixes, city and state go. */
/**
 * Bank wording around the name (checking statements, PDFs): "Payment Sent 01/04 Rmtly* A1B2C Remitly.Com WA Card 0001",
 * "Zelle Payment To Ana Ruiz Abcd12Ef34", "10/04 Payment To Chase Card Ending IN 1234". Generic, no names of anyone.
 */
export function tidyDesc(raw: string): string {
  let s = ` ${raw ?? ""} `.replace(/\s+/g, " ").trim();
  s = s.replace(/^\d{2}\/\d{2}\s+(?=\D)/, "");
  s = s.replace(/^(payment sent|purchase authorized on|recurring payment authorized on|card purchase(?: with pin)?|atm withdrawal authorized on)\s+\d{2}\/\d{2}\s+/i, "");
  if (/paypal\s*\*.*visa direct/i.test(s)) return "PayPal Visa Direct";
  const rt = s.match(/^real time transfer.*\bfrom:\s*(\S+)/i);
  if (rt) return `Real Time Transfer ${rt[1]}`;
  const z = s.match(/^zelle (?:payment )?(to|from)\s+(.+?)(?:\s+\(\d+\))?(?:\s+(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{8,})?$/i);
  if (z) return `Zelle ${z[1].toLowerCase()} ${z[2]}`.trim();
  s = s.replace(/\s+card\s+\d{4}$/i, "").replace(/\s+(?:ref|trn|bref|info):.*$/i, "");
  return s;
}

/** Legal names → the store people know (public brands only). */
const ALIAS: [RegExp, string][] = [
  [/^whaleco( commerce)?\b/, "temu"],
  [/^metaplatfor\w*|^meta platforms?\b/, "meta platforms"],
  [/^rmtly\b.*|^remitly\b.*/, "remitly"],
  [/^amzn mktp\b.*|^amazon (mktpl|marketplace|mktplace)\b.*|^amazon com\b.*/, "amazon"],
  [/^hp instant ?ink\b.*|^instantink\b.*/, "hp instant ink"],
];

export function merchantKey(raw: string): string {
  let s = tidyDesc(raw);
  for (let i = 0; i < 3; i++) s = s.replace(PREFIX, "").trim();
  s = s.split(/\s+-\s+|\s{2,}/)[0];
  // "AMAZON MKTPL*2X3Y4" → "AMAZON MKTPL"; "UBER *EATS" keeps EATS (no digits after the star).
  s = s.replace(/\*\s*([A-Z0-9]*\d[A-Z0-9]*)\b.*$/i, "").replace(/\*/g, " ");
  s = s.replace(/https?:\/\/\S+/gi, " ").replace(/\b([\w-]+)\.(com|net|org|co)\b(\/\S*)?/gi, " $1 ");
  // Bank boilerplate around the name ("FPL DIRECT DEBIT ELEC PYMT PPD ID: 559…").
  s = s.replace(/\b(ppd|web|ccd|tel)\s+id:?\s*\S+/gi, " ").replace(/\b(direct debit|direct dep|ach (debit|credit)|pymt|pmt|debit card|recurring|purchase|pos)\b/gi, " ");
  s = s.replace(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,})\b/g, " ");
  // A store number ends the name: the city follows it.
  const lead = s.match(/^\d{1,4}\s+(?=[a-z])/i)?.[0] ?? "";
  if (lead) s = s.slice(lead.length);
  const num = s.search(/(#\s*\d+|\bstore\s+\d+|\b\d{3,}\b|\b[a-z]{1,2}\d{3,}[a-z0-9]*\b)/i);
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
  words = words.filter((w) => !/^\d+$/.test(w) && !/^(inc|llc|corp|corporation|co|ltd)$/.test(w));
  let key = [...(lead ? [lead.trim()] : []), ...words].slice(0, 4).join(" ").trim();
  for (const [re, to] of ALIAS) if (re.test(key)) { key = to; break; }
  return key;
}

export function merchantLabel(raw: string): string {
  const key = merchantKey(raw);
  const z = key.match(/^zelle (to|from) (.+)$/);
  if (z) return `Zelle ${z[1] === "to" ? "→" : "←"} ${merchantLabel(z[2])}`;
  if (!key) return tidyDesc(raw).slice(0, 40);
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
  "chase travel": { rc: "travel", want: ["viajes", "travel", "hotel"] },
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
  [/\bchase travel\b/, "travel", "travel"],
  [/\b(cvs|walgreens|pharmacy|farmacia|drug|rite aid)\b/, "drug", "health & wellness"],
  [/\b(publix|winn dixie|aldi|sedano|presidente|bravo|fresco|whole foods|trader joe|costco|sams club|bj'?s|walmart neighborhood|grocery|market|supermarket|navarro)\b/, "grocery", "groceries"],
  [/\b(shell|chevron|exxon|mobil|marathon|sunoco|bp|racetrac|wawa|citgo|speedway|gas station|valero)\b/, "gas", "gas"],
  [/\b(restaurant|cafe|coffee|starbucks|dunkin|mcdonald|burger|pizza|taco|chipotle|subway|wendy|kfc|chick fil a|carreta|versailles|pollo|grill|bakery|panaderia|doordash|uber eats|grubhub|bar)\b|\brestaur\w*/, "dining", "food & drink"],
];
/**
 * Kinds of spending a store name gives away, matched to the user's own category names (public brands and plain words only).
 * Checked before the reward words above; the reward class stays "other" unless the card pays more for it.
 */
export const KIND_SPECS: Record<string, { rc: RewardClass; want: string[]; purchase?: boolean; fixed?: boolean }> = {
  snacks: { rc: "other", want: ["bebidas / dulces", "dulces", "snacks", "cafe"] },
  tolls: { rc: "other", want: ["peajes", "tolls", "estacionamiento", "parking", "transporte"] },
  ai: { rc: "other", want: ["inteligencia artificial", "artificial intelligence", "ia", "ai"], purchase: true },
  phone: { rc: "other", want: ["celular", "mobile", "telefono"] },
  internet: { rc: "other", want: ["internet"] },
  remit: { rc: "other", want: ["envios", "remesas", "remittances"] },
  life: { rc: "other", want: ["vida", "life"] },
  retire: { rc: "other", want: ["retiro", "retirement"] },
  cardint: { rc: "other", want: ["tarjetas", "cards", "creditos"] },
  fees: { rc: "other", want: ["otros", "other"] },
  stores: { rc: "other", want: ["otros", "other"], purchase: true },
  legal: { rc: "other", want: ["otros", "other"] },
};
const KIND_WORDS: [RegExp, string][] = [
  [/^365 market\b|\bvending\b|\bcanteen\b/, "snacks"],
  [/\b(sunpass|e ?zpass|epass|toll|peaje)\b/, "tolls"],
  [/\b(grok|openai|chatgpt|anthropic|claude|gemini|midjourney)\b/, "ai"],
  [/\b(metro by t mobile|t mobile|metropcs|cricket|boost mobile|verizon|at&t|tracfone)\b/, "phone"],
  [/\b(xfinity|comcast|spectrum|hotwire)\b/, "internet"],
  [/\b(remitly|western union|moneygram|xoom|ria money|wise)\b/, "remit"],
  [/\b(life ins|insurance prem|ins prem|primerica life)\b/, "life"],
  [/\b(primerica|fidelity|vanguard|schwab|roth ira|ira contrib)/, "retire"],
  [/^(interest charge|purchase interest|intereses de tarjeta|card interest)\b/, "cardint"],
  [/\b(fee|comision|comisión)\b/, "fees"],
  [/\b(temu|aliexpress|amazon|shein|ebay|tiktok shop|walmart com|etsy)\b/, "stores"],
  [/\b(ticketclinic|legalsvcs|law office)\b/, "legal"],
];
export function guessClass(key: string, chaseCategory?: string): { rc: RewardClass; chase?: string } {
  const c = fold(chaseCategory ?? "").trim();
  if (c && CHASE_CATEGORIES[c]) return { rc: CHASE_CATEGORIES[c].rc, chase: c };
  for (const [re, spec] of KIND_WORDS) if (re.test(key)) return { rc: KIND_SPECS[spec].rc, chase: spec };
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
  const spec = chase ? CHASE_CATEGORIES[chase] ?? KIND_SPECS[chase] : undefined;
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
  const v = r[rc ?? "other"];
  return typeof v === "number" ? v : (r.other ?? 0);
}

/** The best everyday card for this class (PayPal counts only for purchases made online through PayPal). */
export function bestFor(accts: Acct[], rc: RewardClass | string | undefined, online: boolean): Acct | undefined {
  return accts.filter((a) => a.kind === "card" || (online && a.kind === "paypal")).sort((a, b) => rateOf(b, rc) - rateOf(a, rc))[0];
}

export type LineReward = { earned: number; missed: number; best?: Acct; rate: number; bestRate: number };
/** What this purchase earned and what the best card would have earned more (minor units of the line's currency). */
export function lineReward(line: Pick<Line, "amountMinor" | "sourceId" | "via" | "rc">, accts: Acct[], eligible = false, all: Acct[] = accts): LineReward | null {
  // An archived card still earned what it earned; it is just never suggested as the better card.
  const src = all.find((a) => a.id === line.sourceId);
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
  const every = accounts(state, true);
  const rules = importBook(state).rules;
  let earned = 0, missed = 0, count = 0;
  const byClass = new Map<string, { best: Acct; missed: number }>();
  for (const line of lines) {
    if (!line.active || !line.sourceId || line.xfer || line.kind.startsWith("income")) continue;
    const elig = !!findRule(rules, merchantKey(line.concept))?.elig;
    const r = lineReward(line, accts, elig, every);
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
  travel: ["Viajes Chase", "Chase Travel"],
  dining: ["comida fuera", "dining"],
  grocery: ["despensa", "groceries"],
  drug: ["farmacia", "drugstore"],
  gas: ["gasolina", "gas"],
  online: ["pago con PayPal", "PayPal checkout"],
  other: ["lo demás", "everything else"],
};
export const rcLabel = (rc: string, lang: string, bonus?: BonusRow[]) => {
  const b = rc.startsWith("b-") ? bonus?.find((x) => x.id === rc) : undefined;
  return b ? b.name : (RC_LABEL[rc as RewardClass] ?? RC_LABEL.other)[lang === "en" ? 1 : 0];
};

export const kindOf = (a: { kind: AcctKind }) => a.kind;
