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
export type Cadence = "weekly" | "biweekly" | "monthly" | "yearly" | "";
export type CatalogKind = "store" | "ai" | "sub";
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

export type Structure = {
  categories: Category[];
  purchases: PurchaseCat[];
  catalog: CatalogItem[];
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
};

export type LedgerState = {
  v: 1;
  structure: Structure;
  months: Record<string, { lines: Line[] }>;
  settings: Settings;
  audit: AuditEntry[];
  /** Added Nov 2026; missing in older ledgers and backups (= nobody). */
  people?: Person[];
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
