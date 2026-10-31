export type Lang = "es" | "en";
export type Currency = "NIO" | "USD";
export type ThemeId = "claro" | "lino" | "costa" | "marfil" | "niebla" | "piedra" | "ion" | "oscuro" | "oled" | "naturaleza" | "oceano" | "sunset" | "tinta" | "bosque" | "humo" | "ion-noche";
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

export const DAY_THEMES: ThemeId[] = ["claro", "lino", "costa", "marfil", "niebla", "piedra", "ion"];
export const NIGHT_THEMES: ThemeId[] = ["oscuro", "oled", "naturaleza", "oceano", "sunset", "tinta", "bosque", "humo", "ion-noche"];
export const THEME_IDS: ThemeId[] = [...DAY_THEMES, ...NIGHT_THEMES];

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
};

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
