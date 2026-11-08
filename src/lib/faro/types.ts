export type Lang = "es" | "en";
export type Currency = "NIO" | "USD";
export type ThemeId = "claro" | "lino" | "costa" | "marfil" | "niebla" | "piedra" | "ion" | "oscuro" | "oled" | "naturaleza" | "oceano" | "sunset" | "tinta" | "bosque" | "humo" | "ion-noche" | "tron";
export type Group = "fixed" | "variable";
export type LineKind =
  | "income-fixed"
  | "income-variable"
  | "expense-fixed"
  | "expense-variable"
  | "purchase"
  | "subscription";
/** Old words load unchanged; 1.3.76 adds any interval "<n><d|w|m|y>" (see cadence.ts). */
export type Cadence = "weekly" | "biweekly" | "monthly" | "yearly" | "" | `${number}${"d" | "w" | "m" | "y"}`;
/** "acct": a bank or card account that statements are imported from (bank-import, Nov 2026). */
export type CatalogKind = "store" | "ai" | "sub" | "acct";
export type TemplateId = "soltero" | "familia" | "estudiante" | "negocio";

export const DAY_THEMES: ThemeId[] = ["claro", "lino", "costa", "marfil", "niebla", "piedra"];
export const NIGHT_THEMES: ThemeId[] = ["oscuro", "oled", "naturaleza", "oceano", "sunset", "tinta", "bosque", "humo", "ion-noche", "tron"];
/** "ion" (the old light Ion) is still accepted from saved data; it now opens as Ion in Noche. */
export const THEME_IDS: ThemeId[] = [...DAY_THEMES, "ion", ...NIGHT_THEMES];

export const SECTIONS = [
  "desk",
  "income",
  "fixed",
  "variable",
  "shops",
  "subs",
  "stats",
  "advice",
  "settings",
] as const;
export type SectionId = (typeof SECTIONS)[number];

/** Sections the finger can loop through. Settings stays out of the swipe. */
export const SWIPE_SECTIONS: SectionId[] = ["desk", "income", "fixed", "variable", "shops", "subs", "stats", "advice"];

export type Named = {
  id: string;
  nameKey: string;
  customName: string;
  icon: string;
  hidden: boolean;
  order: number;
};

export type Sub = Named;

export type Category = Named & {
  group: Group;
  role: string;
  subs: Sub[];
  color?: string;
};

export type PurchaseCat = Named & { color?: string };

export type CatalogItem = Named & {
  kind: CatalogKind;
  urlTemplate: string;
};

/** The registered starting point of a structure: the last template applied, or "completa"
 * for a book born with everything visible. «Personalizada» is never stored: it is the reading
 * of a base plus the user's own hand (userVis). */
export type StructureBase = TemplateId | "completa";

export type Structure = {
  categories: Category[];
  purchases: PurchaseCat[];
  catalog: CatalogItem[];
  /** The last template applied, written by applyTemplate in the same commit as its patch, so
   * undoing restores base and patch together. Birth = "completa". Missing in older ledgers
   * and backups (= no base registered; the UI says so, it never guesses one backwards). */
  base?: StructureBase;
  /** Visibility the user set by hand (the eyes in Estructura, the pickers' hide), by category/sub id.
   * Templates set only a baseline and never override it: the user's word wins.
   * Missing in older ledgers and backups (= no hand-set choices yet). */
  userVis?: Record<string, boolean>;
};

export type Charge = {
  id: string;
  date: string;
  amountMinor: number;
  currency: Currency;
  note: string;
};

export type Line = {
  id: string;
  seriesId: string;
  monthKey: string;
  kind: LineKind;
  concept: string;
  amountMinor: number;
  currency: Currency;
  active: boolean;
  note: string;
  categoryId: string;
  subId: string;
  recurring: boolean;
  storeId: string;
  providerId: string;
  productCode: string;
  productUrl: string;
  cadence: Cadence;
  nextDue: string;
  aprBps: number;
  balanceMinor: number | null;
  balanceCurrency: Currency;
  icon: string;
  history: Charge[];
  bookedOn?: string;
  startedOn?: string;
  color?: string;
  /** Optional tag: the person this spending was for (a gift). See people.ts. */
  personId?: string;
  /** Optional: which of that person's occasions the gift was for ("birthday" or a PersonDate id). */
  occasionId?: string;
  /** Bank import (Nov 2026). Exact statement keys ("ofx:<acct>:<FITID>", "pp:<Transaction ID>"), several joined by "|". */
  importId?: string;
  /** The account (catalog item of kind "acct") the money moved through. */
  sourceId?: string;
  /** Paid through PayPal with sourceId's card: the PayPal account id. */
  via?: string;
  /** A transfer between the user's own accounts (card payment, PayPal ↔ bank). Saved inactive: never counts in totals. */
  xfer?: boolean;
  /** Rewards class of a card purchase ("dining", "grocery", "drug", "gas", "online", "other"). */
  rc?: string;
  /** Import batch id, so one Deshacer removes the whole import. */
  batch?: string;
  /** A payment toward a received loan (Debo → Préstamos). See loans.ts. */
  loanId?: string;
  /** 1.3.149: on a loan payment line, the part of amountMinor that paid interest (the rest is principal).
   *  Absent = a legacy payment: no split was recorded and NO total invents one for it. See loans.ts. */
  interestMinor?: number;
  /** A payment received toward money the user lent (Libros → Me deben, 1.3.92). An income line. See debts.ts. */
  lentId?: string;
  /** Removed from a pocket but kept for its money history (1.3.81): inactive and hidden from the pocket list. */
  archived?: boolean;
  /** 1.3.107: a payment toward a credit card (Debo → Préstamos → Tarjetas). Always a transfer (xfer, inactive): the
   *  purchases were already spending, so paying the card lowers its balance without counting twice. See cards.ts. */
  cardId?: string;
  /** 1.3.109: a card rewards redemption (Canjear). With cardId + xfer = a statement credit (lowers the card balance, not
   *  spending, not income); alone on an income line = a deposit to the bank (income, source "Recompensas de tarjetas"). */
  rwCard?: string;
  /** 1.3.118: a remittance line's recipient (RemitPerson id in ledger.remitPeople). Missing = "Sin persona". See remit-people.ts. */
  to?: string;
};

/** Money the user lent to someone (Me deben). Interest follows the same rule as Loan (simple, by the day, from startedOn). */
export type Lent = {
  id: string;
  person: string;
  kind: "plain" | "interest";
  amountMinor: number;
  currency: Currency;
  aprBps: number;
  /** Interest counts from here (the day it was recorded). */
  startedOn: string;
  /** The day the user expects to collect (calendar). */
  dueOn: string;
  note: string;
  archived?: boolean;
  archivedOn?: string;
  unpaidMinor?: number;
};

/** `monthlyMinor` is the amount per payment (name kept for old data); `cadence` (1.3.107) is how often; absent = monthly. */
export type DebtPlan = { order: "avalanche" | "snowball"; monthlyMinor: number; currency: Currency; cadence?: string };

/** A loan the user received (Debo → Préstamos). Payments are normal lines with `loanId`; see loans.ts. */
export type Loan = {
  id: string;
  lender: string;
  who: "person" | "entity";
  kind: "plain" | "interest";
  amountMinor: number;
  currency: Currency;
  /** Yearly rate in basis points (simple, by the day). 0 = no interest. */
  aprBps: number;
  /** Day the money was received; interest counts from here. */
  takenOn: string;
  /** 1.3.149: day of the month a payment is due (1–31, like CreditCard.dueDay). Absent/0 = no due day:
   *  the loan simply never enters the dues window, exactly as before this field existed. */
  dueDay?: number;
  /** Book the payments go to. */
  book: Group;
  note: string;
  archived?: boolean;
  archivedOn?: string;
  /** Pending when archived. */
  unpaidMinor?: number;
};

/** 1.3.107: one reading of a credit card's balance (a screenshot, a manual update or a payment's effect is NOT one).
 *  Kept forever, oldest first, so the trend and the sparkline are real. Amounts in the card's currency. */
export type CardSnap = {
  /** Day the reading is for (YYYY-MM-DD) and when it was saved (ISO). */
  on: string;
  at: string;
  balanceMinor: number;
  availMinor?: number;
  limitMinor?: number;
  minMinor?: number;
  /** Payment due date shown by the bank (YYYY-MM-DD). */
  dueOn?: string;
  statementMinor?: number;
  /** APR the bank showed in this reading (bps). */
  aprBps?: number;
  src: "shot" | "manual";
  /** 1.3.109: last payment the bank showed, and other labelled numbers kept as notes ("Otros datos"). */
  lastPayMinor?: number;
  lastPayOn?: string;
  notes?: { label: string; text: string }[];
  /** Card payment lines already in the ledger when this reading was saved (the bank balance already reflects them). */
  seen?: string[];
};

/**
 * 1.3.109: a card's rewards balance (cash back) at a date. Money the bank holds for the user: an asset, never subtracted
 * from the card debt. `amountMinor` in the card currency; `points` is a note only (points are not money). A redemption
 * ("Canjear") stores a reading with the amount left (src "redeem"), how it was used and the line it wrote.
 */
export type RewardSnap = {
  on: string;
  at: string;
  amountMinor?: number;
  points?: number;
  /** Rewards EARNED as the bank shows them (year to date or lifetime): info for Estudio, never money the user has. */
  earnedMinor?: number;
  earnedSpan?: "year" | "life";
  src: "shot" | "manual" | "redeem";
  redeemed?: number;
  how?: "credit" | "deposit";
  lineId?: string;
};

/** 1.3.107: a credit card, a revolving loan under Debo → Préstamos. Presets (Chase/Wells Fargo/PayPal) carry no numbers. */
export type CreditCard = {
  id: string;
  name: string;
  issuer: string;
  /** Mark id ("chase", "wellsfargo", "paypal", "capitalone", "discover", "amex", "citi", "bofa", "") and plate colour. */
  mark: string;
  color: string;
  /** Card art style: an issuer's ("chase", "wellsfargo", "paypal") or a generic one ("wave", "band", "glow", "plain"). */
  art?: string;
  /** "visa" | "mastercard" | "amex" | "discover" | "". */
  network?: string;
  last4: string;
  currency: Currency;
  /** Credit limit typed by the user (else the latest reading's limit, else balance + available). */
  limitMinor: number | null;
  /** Day of the month the payment is due (1–31, 0 unknown). */
  dueDay: number;
  /** Yearly rate in basis points (payoff plan). 0 unknown. */
  aprBps: number;
  /** Promotional 0% APR until this day (YYYY-MM-DD); "" none. */
  promoUntil?: string;
  autopay: boolean | null;
  rewards: string;
  /** "manual": the bank blocks screenshots (Chase), so the card is updated by hand. */
  manualOnly?: boolean;
  snaps: CardSnap[];
  /** 1.3.109: rewards readings (cash back balance), oldest first. */
  rw?: RewardSnap[];
  /** Preset id when it came from the defaults. */
  preset?: string;
  archived?: boolean;
  archivedOn?: string;
};

/** Someone the user spends on (gifts). Entered by hand; money lives in normal lines tagged with personId. */
export type OccasionKind = "anniversary" | "mother" | "father" | "christmas" | "graduation" | "saint" | "custom";
/** A yearly date. `kind` names a preset; "custom" uses `label`. Old data has no kind (read as custom or a matching preset). */
export type PersonDate = { id: string; label: string; date: string; kind?: OccasionKind };
export type Person = {
  id: string;
  name: string;
  /** YYYY-MM-DD (the year may be unknown: then any year is fine). */
  birthday: string;
  dates: PersonDate[];
  note: string;
  color?: string;
  /** Deleted by the user: hidden from Personas and the pickers, but their lines keep personId and history shows the name. */
  archived?: boolean;
};

export type RewardClass = "travel" | "dining" | "grocery" | "drug" | "gas" | "online" | "other";
export type AcctKind = "checking" | "card" | "paypal" | "savings";
/** Import settings of one account; its name and icon live in its catalog item (kind "acct"), same id. Rates in basis points. */
/**
 * `rates` keys are reward rows: a RewardClass or a bonus row id ("b-…"). `off` (ISO day) = archived: out of daily use
 * (rewards table, import picker, Estudio/Asesor advice) but its lines, rules and past rewards stay. `mine` = added by the user.
 * `color` (1.3.151, optional hex) = the mark colour the user picked; missing = the bank's own colour.
 */
export type BankSource = { id: string; bank: string; kind: AcctKind; rates: Partial<Record<string, number>>; elig?: number; pocketId?: string; apyBps?: number; off?: string; mine?: boolean; color?: string };
/** A named reward row of the user's own ("Hogar", "Viajes Chase"); `target` links it to one of their categories (a "<kind>|<cat>|<sub>" value, sub may be empty = the whole category). */
export type BonusRow = { id: string; name: string; target?: string };
/** Learned filing: merchant key → "<kind>|<categoryId>|<subId>". */
export type MerchantRule = { key: string; label: string; target: string; rc?: string; elig?: boolean; n: number; at: string };
export type ColumnMap = { date: number; desc: number; amount: number; debit: number; credit: number; invert: boolean; dmy: boolean };
/** A "how to download" chip in the importer (1.3.79). Built-ins are "chase" | "wellsfargo" | "paypal" (manual topic);
 * own ones ("g-…") carry a name, an optional data-URL icon, free-text steps, and `acct`, the card/bank they made in Bancos y recompensas. */
export type BankGuide = { id: string; name?: string; icon?: string; steps?: string; acct?: string };
export type ImportBook = { sources: BankSource[]; rules: MerchantRule[]; maps: Record<string, ColumnMap>; files?: Record<string, string>; bonus?: BonusRow[]; guides?: BankGuide[]; /** 1.3.153: how Oscar usually pays each merchant (merchantKey → account id or "cash"), learned only from his own manual entries. */ payHints?: Record<string, string> };

export type AuditEntry = { id: string; at: string; detail: string };

export type Settings = {
  lang: Lang;
  theme: ThemeId;
  display: Currency;
  rateE4: number;
  rateSource: string;
  rateAsOf: string;
  savingsGoalPct: number;
  debtGreenPct: number;
  debtYellowPct: number;
  emergencyMonths: number;
  shortcuts: Record<string, string>;
  gestures?: Record<string, string>;
  /** 1.3.148: the phone notifications (Android app) on/off as the user set it in Ajustes. Missing = on. */
  notify?: boolean;
  /** One-time seeds already applied (e.g. "remesas"), so a default the user deleted is not added again. */
  seeds?: string[];
};

/** 1.3.118: a remittance recipient: a name, an optional colour and Faro icon. The money stays in normal lines (`line.to`). */
export type RemitPerson = { id: string; name: string; color?: string; icon?: string };

export type SubPreset = { id: string; name?: string; icon?: string };

export type LedgerState = {
  v: 1;
  structure: Structure;
  months: Record<string, { lines: Line[] }>;
  settings: Settings;
  audit: AuditEntry[];
  /** Added Nov 2026; missing in older ledgers and backups (= nobody). */
  people?: Person[];
  /** Bank import settings (Nov 2026): accounts, merchant rules, column maps. Missing in older ledgers and backups. */
  imports?: ImportBook;
  /** Loans received (Nov 2026). Missing in older ledgers and backups (= none). */
  loans?: Loan[];
  /** Money the user lent (Me deben, 1.3.92; device-only before). Abonos are income lines with `lentId`. See debts.ts. */
  lent?: Lent[];
  /** Old device Me deben ids already moved into the ledger, so the one-time move never runs twice (even after an archive). */
  lentMoved?: string[];
  /** Debt payoff plan (1.3.92): order and what the user can pay a month toward Préstamos. */
  debtPlan?: DebtPlan;
  /** Cuotas preset chips (Nov 2026, 1.3.75): pool ids, or own ones with a name and an optional data-URL icon. Missing in older ledgers (= defaults). */
  subPresets?: SubPreset[];
  /** 1.3.100: Cuotas icon-library presets the user deleted (ids from SUB_POOL). Absent = the whole library. */
  subIconsOff?: string[];
  /** Cuotas frequency chips (1.3.76): cadence tokens in order. Missing in older ledgers (= the four defaults). */
  freqPresets?: string[];
  /** 1.3.100: frequencies the user set with "Otro…" ("3w", "10d"…), newest first, at most 4. Absent = none. */
  freqCustom?: string[];
  /** Custom colours the user saved in the colour picker (1.3.99), newest first, at most 6. Missing in older ledgers (= none). */
  myColors?: string[];
  /** Default Retiro presets the user removed (1.3.81, e.g. "primerica"). Missing = all offered. See retiro.ts. */
  retiroOff?: string[];
  /** 1.3.107: credit cards (Debo → Préstamos → Tarjetas). Missing in older ledgers (= only the presets, empty). */
  cards?: CreditCard[];
  /** 1.3.107: preset cards the user removed ("chase", "wellsfargo", "paypal"). Missing = all offered. */
  cardsOff?: string[];
  /** 1.3.118: the people the user sends remittances to (Remesas → Para). Missing in older ledgers (= none). */
  remitPeople?: RemitPerson[];
  revision: number;
  updatedAt: string;
};

export type BackupFile = {
  app: "FARO";
  v: 1;
  exportedAt: string;
  ledger: LedgerState;
};

export type Tone = "neutral" | "good" | "warn" | "bad";

export type Insight = {
  id: string;
  title: string;
  value: string;
  detail: string;
  tone: Tone;
  meaning: string;
  formula: string;
  implication: string;
  /** Optional picture data for the Números clave card. */
  viz?: InsightViz;
};

export type InsightViz =
  | { kind: "ring"; pct: number; mark?: number }
  | { kind: "parts"; parts: { name: string; share: number; color: string }[]; cut: number }
  | { kind: "split"; a: number; b: number; aLabel: string; bLabel: string }
  | { kind: "cover"; months: number; goal: number }
  | { kind: "days"; day: number | null; days: number }
  | { kind: "delta"; now: number; prev: number }
  | { kind: "share"; pct: number };

export type Slice = { id: string; name: string; minor: number; color: string };

export type Summary = {
  income: number;
  fixed: number;
  variable: number;
  purchases: number;
  subscriptions: number;
  expense: number;
  opportunity: number;
  spentPct: number | null;
  debt: number;
  debtPct: number | null;
  debtAllowance: number;
  savingsFlow: number;
  savingsGoal: number;
  petty: number;
  remittance: number;
  housing: number;
  tone: Tone;
  semaphore: string;
};

export type Cut = { name: string; minor: number };
export type BudgetPlan = {
  income: number;
  savingsTarget: number;
  fixed: number;
  debt: number;
  room: number;
  variableActual: number;
  gap: number;
  cuts: Cut[];
  feasible: boolean;
  note: string;
};

export type AdvicePoint = { label: string; value: string; note: string; emphasis?: boolean };
export type AdviceMeter = { pct: number; caption: string };
export type AdviceCard = {
  horizon: "short" | "medium" | "long";
  title: string;
  lead: string;
  body: string;
  evidence: string;
  points: AdvicePoint[];
  meter: AdviceMeter | null;
  nums?: Record<string, number>;
};

export type MonthPoint = { key: string; label: string; income: number; expense: number };

export const DEFAULT_SHORTCUTS: Record<string, string> = {
  "nav-prev": "ArrowLeft",
  "nav-next": "ArrowRight",
  undo: "Mod+Z",
  redo: "Mod+Y",
  "redo-alt": "Mod+Shift+Z",
  search: "Mod+K",
  sync: "Mod+S",
  export: "Mod+E",
  "toggle-currency": "Mod+\\",
  "new-line": "Mod+N",
  settings: "Mod+,",
  "month-prev": "Mod+ArrowLeft",
  "month-next": "Mod+ArrowRight",
  calculator: "Mod+J",
  help: "Shift+/",
};

export const SHORTCUT_ACTIONS = Object.keys(DEFAULT_SHORTCUTS);
