import { convertMinor, formatMoney, formatPct, niceDown, niceUp } from "./money.ts";
import { cardTotals } from "./cards.ts";
import { perYear } from "./cadence.ts";
import type { Currency, Lang, LedgerState, Line, Structure } from "./types.ts";
import { remitTrend } from "./remesas.ts";

type Namer = {
  cat: (id: string) => string;
  sub: (id: string) => string;
  purchase: (id: string) => string;
  catalog: (id: string) => string;
};

export type OutClass =
  | "essential-fixed"
  | "essential-variable"
  | "discretionary"
  | "unique"
  | "credit"
  | "transfer";

export type ReadLine = {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  minor: number;
  cls: OutClass;
  recurrent: boolean;
  unconfirmed: boolean;
  vague: boolean;
};

export type FigurePart = {
  id: string;
  label: string;
  minor: number;
  signed: number;
  rule: string;
  lines: { id: string; name: string; minor: number }[];
};

export type Lever = {
  id: string;
  verb: string;
  amountMinor: number;
  when: string;
  effectMinor: number;
  text: string;
};

export type ScenarioId = "base" | "repeat" | "plan";

export type Reading = {
  currency: Currency;
  monthTag: string;
  tone: "good" | "amber" | "bad";
  toneLabel: string;
  headline: string;
  action: string;
  alert: string;
  creditBlurb: string;
  baseSurplus: number;
  uniqueMinor: number;
  uniqueCount: number;
  transferMinor: number;
  recurrentMinor: number;
  income: number;
  incomeFixed: number;
  incomeVariable: number;
  outTotal: number;
  realSpend: number;
  left: number;
  leftIfTransferCovers: number;
  naiveFixed: number;
  classificationError: string | null;
  cushionMinor: number;
  cushionStock: number;
  cushionPace: number;
  essentialsMonthly: number;
  incomeFloor: number;
  trendNote: string | null;
  subsTotal: number;
  subsCount: number;
  variablePct: number | null;
  topSourceName: string;
  topSourceMinor: number;
  topSourcePct: number | null;
  debtMinor: number;
  debtPct: number | null;
  debtTermKnown: boolean;
  creditAsk: string | null;
  pocketAside: number;
  savingsFlow: number;
  contradiction: string | null;
  vagueQuestion: string | null;
  vagueName: string;
  vagueMinor: number;
  vaguePct: number | null;
  splitNote: string | null;
  ironmanMinor: number;
  gasMinor: number;
  ironmanPct: number | null;
  parts: { base: FigurePart; unique: FigurePart; transfer: FigurePart };
  top: { name: string; minor: number; pctOfOut: number | null; cls: OutClass }[];
  levers: Lever[];
  plan: string;
  antNote: string | null;
  /** Remesas (1.3.86): what was sent, the trend vs last month and its share of income, with one piece of advice. */
  remitNote: string | null;
  remitUsd: number;
  remitPrevUsd: number;
  remitSharePct: number | null;
  paceNote: string;
  calendarNote: string;
  compareNote: string;
  balanceGap: number;
  lines: ReadLine[];
  scenarios: { id: ScenarioId; label: string; detail: string; left: number }[];
};

const ESSENTIAL = new Set(["housing", "transport", "food", "family", "insurance", "pets", "remittance", "health"]);
const VAGUE = /^(carga|otro|otros|otra|reparaci[oó]n|varios|misc|miscellaneous|other|repair|repairs|cosa|pago|gastos?|stuff|xxx|n\/a|na)$/i;

function L(lang: Lang, es: string, en: string): string {
  return lang === "en" ? en : es;
}

function roleOf(structure: Structure, categoryId: string): string {
  return structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

function isVaultSub(structure: Structure, subId: string): boolean {
  if (!subId) return false;
  for (const category of structure.categories) {
    const sub = category.subs.find((item) => item.id === subId);
    if (!sub) continue;
    return sub.icon === "vault" || sub.icon.startsWith("vault:");
  }
  return false;
}

function inView(line: Line, display: Currency, rateE4: number): number {
  if (!line.active) return 0;
  return convertMinor(line.amountMinor, line.currency, display, rateE4);
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + n);
  return next;
}

function shiftKey(key: string, delta: number): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function lastKeys(key: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(shiftKey(key, -i));
  return keys;
}

function seenIn(state: LedgerState, line: Line, key: string): number {
  let hits = 0;
  for (const month of lastKeys(key, 3)) {
    const bucket = state.months[month]?.lines ?? [];
    const found = bucket.some((item) => {
      if (!item.active || item.kind.startsWith("income")) return false;
      if (line.seriesId && item.seriesId === line.seriesId) return true;
      return norm(item.concept) !== "" && norm(item.concept) === norm(line.concept) && item.categoryId === line.categoryId;
    });
    if (found) hits += 1;
  }
  return hits;
}

function lineName(line: Line, names: Namer): string {
  return line.concept || names.sub(line.subId) || names.cat(line.categoryId) || names.purchase(line.categoryId) || line.kind;
}

function categoryName(line: Line, names: Namer, lang: Lang = "es"): string {
  const named = names.cat(line.categoryId) || names.purchase(line.categoryId);
  if (named) return named;
  if (line.kind === "purchase") return L(lang, "Compras", "Shopping");
  if (line.kind === "subscription") return L(lang, "Suscripciones", "Subscriptions");
  return line.categoryId || L(lang, "Otros", "Other");
}

/* Everyday words: things people buy every week. These never read as "one-time" just because it is the first month. */
const EVERYDAY_RE = /(super|mercado|despensa|comida|almuerzo|desayuno|cena|caf[eé]|panader|tortill|leche|frutas?|verdura|abarrot|pulper|bus\b|buses|metro|taxi|pasaje|gasolin|combustible|transporte|farmacia|medicin|medicament|doctor|m[eé]dic|consulta|luz|agua|internet|celular|tel[eé]fono|renta|alquiler|escuela|colegio|guarder|pa[nñ]al|restaurant|salidas|antojo|snack|grocer|food|lunch|coffee|gas\b|fuel|pharmacy|rent|uber\b|lyft)/i;
/* Essential words: food, health, getting to work, the roof. They count as needs even when filed under a "personal" category. */
const ESSENTIAL_RE = /(super|mercado|despensa|comida|abarrot|pulper|panader|tortill|leche|frutas?|verdura|farmacia|medicin|medicament|doctor|m[eé]dic|consulta|hospital|dentist|gasolin|combustible|bus\b|buses|metro|pasaje|transporte|luz|agua|renta|alquiler|hipoteca|escuela|colegio|guarder|pa[nñ]al|internet|celular|tel[eé]fono|seguro|grocer|food|pharmacy|rent|fuel)/i;
const ESSENTIAL_SUBS = new Set(["v.personales.salud", "v.mascotas.vet", "v.transporte.taxi", "v.transporte.estacionamiento", "v.transporte.mantenimiento"]);
const EVERYDAY_ROLES = new Set(["food", "petty", "transport", "leisure", "personal", "health", "pets"]);
const ONEOFF_SUBS = new Set(["v.casa.reparaciones", "v.casa.mejora", "v.transporte.tenencia", "v.viajes.hotel", "v.viajes.transporte", "v.viajes.regalos", "v.entretenimiento.eventos", "v.entretenimiento.fiestas", "v.familia.juguetes"]);

function isEssential(line: Line, role: string): boolean {
  if (ESSENTIAL.has(role) && role !== "family") return true;
  if (role === "family") return line.subId !== "v.familia.juguetes";
  return ESSENTIAL_SUBS.has(line.subId) || ESSENTIAL_RE.test(line.concept || "");
}

function classify(line: Line, state: LedgerState, key: string, income = 0, minor = 0): { cls: OutClass; recurrent: boolean; unconfirmed: boolean } {
  const role = roleOf(state.structure, line.categoryId);
  if (role === "savings") return { cls: "transfer", recurrent: false, unconfirmed: false };
  const hits = seenIn(state, line, key);
  const marked = line.kind === "expense-fixed" || line.kind === "subscription" || line.recurring === true || hits >= 2;
  if (role === "debt") return { cls: "credit", recurrent: marked, unconfirmed: false };
  const essential = isEssential(line, role);
  if (!marked) {
    // A purchase is one-time by definition. A first-month grocery run, bus fare or coffee is not:
    // it is the day-to-day, even before there is history to prove it.
    const everyday = line.kind !== "purchase" && (EVERYDAY_RE.test(line.concept || "") || ESSENTIAL_SUBS.has(line.subId) || (EVERYDAY_ROLES.has(role) && !ONEOFF_SUBS.has(line.subId)));
    const big = income > 0 ? minor >= income * 0.15 : true;
    const oneoff = line.kind === "purchase" || role === "travel" || ONEOFF_SUBS.has(line.subId);
    if (oneoff || (!everyday && big) || (everyday && !essential && big && hits <= 1 && income > 0 && minor >= income * 0.3)) {
      return { cls: "unique", recurrent: false, unconfirmed: true };
    }
    return { cls: essential ? "essential-variable" : "discretionary", recurrent: true, unconfirmed: false };
  }
  if (line.kind === "subscription") return { cls: "discretionary", recurrent: true, unconfirmed: false };
  if (!essential) return { cls: "discretionary", recurrent: true, unconfirmed: false };
  if (line.kind === "expense-variable") return { cls: "essential-variable", recurrent: true, unconfirmed: false };
  return { cls: "essential-fixed", recurrent: true, unconfirmed: false };
}

function goalMinorOf(income: number, pctGoal: number): number {
  return income > 0 ? Math.round((income * pctGoal) / 100) : 0;
}

function isVague(name: string): boolean {
  return VAGUE.test(name.trim());
}

export type AdvisorOptions = { today?: Date };

/* 1.3.117: in the app the same month is read by the coach, the advice cards, the rules and the Asesor screen in one render;
 * a ledger never changes in place (every commit makes a new one), so each reading is kept per ledger object. Tests (no
 * window) and calls with a fixed `today` always read fresh. */
const readCache = new WeakMap<LedgerState, Map<string, Reading>>();
export function readAdvisor(state: LedgerState, key: string, lang: Lang, names: Namer, options: AdvisorOptions = {}): Reading {
  if (typeof window === "undefined" || options.today) return readAdvisorFresh(state, key, lang, names, options);
  const now = new Date();
  const id = `${key}|${lang}|${state.revision}|${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let byKey = readCache.get(state);
  if (!byKey) { byKey = new Map(); readCache.set(state, byKey); }
  let hit = byKey.get(id);
  if (!hit) { hit = readAdvisorFresh(state, key, lang, names, options); byKey.set(id, hit); }
  return hit;
}

function readAdvisorFresh(state: LedgerState, key: string, lang: Lang, names: Namer, options: AdvisorOptions = {}): Reading {
  const today = options.today ?? new Date();
  const { display, rateE4 } = state.settings;
  const money = (n: number) => formatMoney(n, display, lang);
  const pct = (n: number | null) => formatPct(n, lang);
  const lines = (state.months[key]?.lines ?? []).filter((line) => line.active);
  const incomeAll = lines.filter((line) => line.kind.startsWith("income")).reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const read: ReadLine[] = [];
  for (const line of lines) {
    if (line.kind.startsWith("income")) continue;
    const minor = inView(line, display, rateE4);
    if (!minor) continue;
    const cls = classify(line, state, key, incomeAll, minor);
    const name = lineName(line, names);
    read.push({
      id: line.id,
      name,
      categoryId: line.categoryId,
      category: categoryName(line, names, lang),
      minor,
      cls: cls.cls,
      recurrent: cls.recurrent,
      unconfirmed: cls.unconfirmed,
      vague: isVague(name),
    });
  }

  const sumCls = (pred: (line: ReadLine) => boolean) => read.filter(pred).reduce((acc, line) => acc + line.minor, 0);
  const recurrentMinor = sumCls((line) => line.cls !== "unique" && line.cls !== "transfer");
  const uniqueMinor = sumCls((line) => line.cls === "unique");
  const transferMinor = sumCls((line) => line.cls === "transfer");
  const outTotal = recurrentMinor + uniqueMinor + transferMinor;
  const incomeLines = lines.filter((line) => line.kind.startsWith("income"));
  const incomeOf = (kind: Line["kind"]) =>
    incomeLines.filter((line) => line.kind === kind).reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const incomeFixed = incomeOf("income-fixed");
  const incomeVariable = incomeOf("income-variable");
  const income = incomeFixed + incomeVariable;
  const realSpend = outTotal - transferMinor;
  const left = income - outTotal;
  const baseSurplus = income - recurrentMinor;
  const leftIfTransferCovers = income - realSpend;
  const balanceGap = baseSurplus - uniqueMinor - transferMinor - left;

  const naiveFixed = lines
    .filter((line) => line.kind === "expense-fixed")
    .reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const transferInsideFixed = lines
    .filter((line) => line.kind === "expense-fixed" && roleOf(state.structure, line.categoryId) === "savings")
    .reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const classificationError =
    transferInsideFixed > 0
      ? L(
          lang,
          `De tus fijos (${money(naiveFixed)}), ${money(transferInsideFixed)} son ahorro: no es gasto, sigue siendo tuyo. Lo que de verdad pagas fijo cada mes son ${money(naiveFixed - transferInsideFixed)}.`,
          `Of your fixed total (${money(naiveFixed)}), ${money(transferInsideFixed)} is savings: not spending, still yours. What you really pay in fixed bills is ${money(naiveFixed - transferInsideFixed)}.`,
        )
      : null;

  const savingsFlow = transferMinor;
  const pocketAside = lines
    .filter(
      (line) =>
        line.kind === "expense-fixed" &&
        roleOf(state.structure, line.categoryId) === "savings" &&
        !isVaultSub(state.structure, line.subId),
    )
    .reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const contradiction =
    pocketAside === 0 && savingsFlow > 0
      ? L(
          lang,
          `Mandaste ${money(savingsFlow)} a una cuenta de ahorro, pero tus metas (Meta, Retiro, Emergencia) siguen en ${money(0)}. Decide a cuál meta va ese dinero para que el avance se vea.`,
          `You sent ${money(savingsFlow)} to a savings account, but your goals (Goal, Retirement, Emergency) are still at ${money(0)}. Choose which goal that money is for so the progress shows.`,
        )
      : null;

  const debtLines = read.filter((line) => line.cls === "credit");
  const debtMinor = debtLines.reduce((acc, line) => acc + line.minor, 0);
  const debtPct = income > 0 ? (debtMinor / income) * 100 : null;
  const rawDebts = lines.filter((line) => roleOf(state.structure, line.categoryId) === "debt");
  const debtTermKnown = rawDebts.length > 0 && rawDebts.every((line) => line.balanceMinor !== null && line.aprBps > 0);
  const creditAsk = !debtTermKnown && debtMinor > 0
    ? L(
        lang,
        "Por ahora solo veo la cuota de este mes. Anota cuánto debes, la tasa anual y el pago mínimo, y te digo en cuántos meses terminas.",
        "For now I only see this month's payment. Enter what you owe, the annual rate and the minimum payment, and I'll tell you in how many months you finish.",
      )
    : null;

  const variablePct = income > 0 ? (incomeVariable / income) * 100 : null;
  const variableLines = incomeLines.filter((line) => line.kind === "income-variable");
  const topSource = [...(variableLines.length ? variableLines : incomeLines)].sort((a, b) => inView(b, display, rateE4) - inView(a, display, rateE4))[0];
  const topSourceMinor = topSource ? inView(topSource, display, rateE4) : 0;
  const topSourcePct = income > 0 && topSource ? (topSourceMinor / income) * 100 : null;
  const topSourceName = topSource ? lineName(topSource, names) : "";

  const uniqueLines = read.filter((line) => line.cls === "unique").sort((a, b) => b.minor - a.minor);
  const uniqueCount = uniqueLines.length;
  const biggestUnique = uniqueLines[0];
  const byCategory = new Map<string, ReadLine[]>();
  for (const line of read.filter((item) => item.cls !== "transfer")) {
    const bucket = byCategory.get(line.categoryId) ?? [];
    bucket.push(line);
    byCategory.set(line.categoryId, bucket);
  }
  let splitNote: string | null = null;
  let ironmanMinor = 0;
  let gasMinor = 0;
  let ironmanPct: number | null = null;
  for (const group of byCategory.values()) {
    const uniques = group.filter((line) => line.cls === "unique");
    const recurrent = group.filter((line) => line.cls !== "unique");
    if (!uniques.length || !recurrent.length) continue;
    const big = [...uniques].sort((a, b) => b.minor - a.minor)[0];
    if (!big) continue;
    const recurrentSum = recurrent.reduce((acc, line) => acc + line.minor, 0);
    const share = income > 0 ? (big.minor / income) * 100 : null;
    const note = L(
      lang,
      `${big.category} no es un hábito: ${money(big.minor)} fue una sola compra (${big.name})${share !== null ? `, el ${pct(share)} de lo que entra` : ""}. Lo que sí se repite ahí cada mes son ${money(recurrentSum)}${recurrent[0] ? ` (${recurrent.map((line) => line.name).join(", ")})` : ""}.`,
      `${big.category} is not a habit. ${money(big.minor)} is one purchase (${big.name})${share !== null ? `, ${pct(share)} of what comes in` : ""}. What does repeat in that category is ${money(recurrentSum)}${recurrent[0] ? ` (${recurrent.map((line) => line.name).join(", ")})` : ""}.`,
    );
    if (!splitNote || big.minor > ironmanMinor) {
      splitNote = note;
      ironmanMinor = big.minor;
      gasMinor = recurrentSum;
      ironmanPct = share;
    }
  }

  const vagueCandidates = read
    .filter((line) => line.vague && line.cls !== "transfer" && (income <= 0 || line.minor * 10 > income))
    .sort((a, b) => b.minor - a.minor);
  const vague = vagueCandidates[0];
  const vaguePct = vague && income > 0 ? (vague.minor / income) * 100 : null;
  const vagueQuestion = vague
    ? L(
        lang,
        `«${vague.name}» son ${money(vague.minor)}${vaguePct !== null ? ` (${pct(vaguePct)} de lo que entra)` : ""}, pero el nombre no dice qué es. Ponle un nombre claro y te digo si conviene moverlo.`,
        `“${vague.name}” is ${money(vague.minor)}${vaguePct !== null ? ` (${pct(vaguePct)} of what comes in)` : ""}, but the name doesn't say what it is. Give it a clear name and I'll tell you if it's worth moving.`,
      )
    : null;

  const prior = lastKeys(key, 6).filter((month) => month !== key && (state.months[month]?.lines.length ?? 0) > 0);
  const compareNote =
    prior.length === 0
      ? L(
          lang,
          "Es tu primer mes con datos, así que todavía no hay promedios para comparar. Las compras de una vez no cuentan como hábito.",
          "It's your first month with data, so there are no averages to compare yet. One-time buys don't count as habits.",
        )
      : L(
          lang,
          `Comparo solo lo que se repite contra ${prior.length} mes${prior.length === 1 ? "" : "es"} anterior${prior.length === 1 ? "" : "es"}. Las compras de una vez no entran al promedio.`,
          `I compare only what repeats against ${prior.length} earlier month${prior.length === 1 ? "" : "s"}. One-offs do not enter the average.`,
        );

  const days = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate() || 30;
  const perDay = days > 0 ? Math.round(recurrentMinor / days) : 0;
  const dated = lines
    .filter((line) => !line.kind.startsWith("income") && line.bookedOn)
    .map((line) => ({ line, minor: inView(line, display, rateE4), day: line.bookedOn || "" }))
    .filter((item) => item.minor > 0)
    .sort((a, b) => a.day.localeCompare(b.day));
  let paceNote = L(
    lang,
    `Lo que se repite cada mes te cuesta ${money(perDay)} al día. Si anotas cuánto tienes en el banco, te digo cuántos días aguantarías si dejara de entrar dinero.`,
    `What repeats costs you ${money(perDay)} a day. Enter what you have in the bank and I'll tell you how many days you'd last if money stopped coming in.`,
  );
  if (dated.length && income > 0) {
    let running = 0;
    let crossed: { name: string; day: string } | null = null;
    for (const item of dated) {
      running += item.minor;
      if (!crossed && running > income) crossed = { name: lineName(item.line, names), day: item.day };
    }
    paceNote = crossed
      ? L(
          lang,
          `El ${crossed.day}, con ${crossed.name}, lo que sale pasa a ser más de lo que entra. Ese es el día que hay que cuidar.`,
          `On ${crossed.day}, with ${crossed.name}, what goes out becomes more than what comes in. That's the day to watch.`,
        )
      : L(
          lang,
          `Con las fechas anotadas, ningún pago deja el mes en rojo. Lo que se repite te cuesta ${money(perDay)} al día.`,
          `With the dates on file, no payment puts the month in the red. What repeats costs you ${money(perDay)} a day.`,
        );
  } else if (uniqueMinor > 0 && left < 0) {
    paceNote = L(
      lang,
      `El hueco no viene del gasto de todos los días: son compras de una vez por ${money(uniqueMinor)} que ya salieron. Ponles fecha a tus pagos y te digo qué día aprieta.`,
      `The gap doesn't come from everyday spending: it's ${money(uniqueMinor)} of one-time buys that already left. Add dates to your payments and I'll show which day gets tight.`,
    );
  }

  const warnAt = Math.max(display === "USD" ? 5000 : convertMinor(5000, "USD", display, rateE4), income > 0 ? Math.round(income * 0.05) : 0);
  const horizonEnd = addDays(today, 30);
  const upcoming = lines.filter((line) => {
    if (line.kind.startsWith("income")) return false;
    const when = line.nextDue || line.bookedOn || "";
    if (!when) return false;
    const day = new Date(`${when.slice(0, 10)}T12:00:00`);
    return day >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && day <= horizonEnd;
  });
  const loud = upcoming.filter((line) => inView(line, display, rateE4) >= warnAt);
  const calendarNote = upcoming.length
    ? L(
        lang,
        loud.length
          ? `En los próximos 30 días tienes ${upcoming.length} pagos con fecha. Los más grandes (más de ${money(warnAt)}): ${loud.map((line) => lineName(line, names)).slice(0, 3).join(", ")}.`
          : `En los próximos 30 días tienes ${upcoming.length} pagos con fecha, ninguno mayor de ${money(warnAt)}.`,
        loud.length
          ? `In the next 30 days you have ${upcoming.length} dated payments. The biggest (over ${money(warnAt)}): ${loud.map((line) => lineName(line, names)).slice(0, 3).join(", ")}.`
          : `In the next 30 days you have ${upcoming.length} dated payments, none over ${money(warnAt)}.`,
      )
    : L(
        lang,
        "No hay pagos con fecha en los próximos 30 días. Ponles fecha a tus pagos fijos y te aviso antes de que venzan.",
        "No dated payments in the next 30 days. Add dates to your fixed bills and I'll warn you before they're due.",
      );

  // 1.3.117: a Cuota's cost per month and per year follows its cadence (a yearly charge is not ×12); loan installments are debt, not subscriptions.
  const rawOf = new Map(lines.map((raw) => [raw.id, raw]));
  const yearOfSub = (line: ReadLine) => { const [n, d] = perYear(rawOf.get(line.id)?.cadence || "monthly"); return Math.round((line.minor * n) / d); };
  const subsRead = read.filter((line) => rawOf.get(line.id)?.kind === "subscription" && line.cls !== "credit")
    .map((line) => ({ ...line, year: yearOfSub(line), month: Math.round(yearOfSub(line) / 12) }))
    .sort((a, b) => b.month - a.month);
  const subsYear = subsRead.reduce((acc, line) => acc + line.year, 0);
  const subsSum = Math.round(subsYear / 12);
  const subsShare = incomeAll > 0 ? (subsSum / incomeAll) * 100 : null;
  const antNote = subsRead.length
    ? subsRead.length === 1
      ? L(
          lang,
          `${subsRead[0]!.name}: ${money(subsRead[0]!.month)} al mes son ${money(subsRead[0]!.year)} al año. Si la usas, déjala; si no, es dinero fácil de recuperar.`,
          `${subsRead[0]!.name}: ${money(subsRead[0]!.month)} a month is ${money(subsRead[0]!.year)} a year. Keep it if you use it; if not, it's easy money back.`,
        )
      : L(
          lang,
          `Tus ${subsRead.length} suscripciones suman ${money(subsSum)} al mes, ${money(subsYear)} al año${subsShare !== null ? ` (${pct(subsShare)} de lo que entra)` : ""}. Las más caras: ${subsRead.slice(0, 3).map((line) => `${line.name} ${money(line.month)}`).join(", ")}. ${subsShare !== null && subsShare >= 5 ? "No es poca cosa: quita las que no usaste este mes." : "Revisa si usas todas."}`,
          `Your ${subsRead.length} subscriptions add up to ${money(subsSum)} a month, ${money(subsYear)} a year${subsShare !== null ? ` (${pct(subsShare)} of what comes in)` : ""}. Most expensive: ${subsRead.slice(0, 3).map((line) => `${line.name} ${money(line.month)}`).join(", ")}. ${subsShare !== null && subsShare >= 5 ? "That's real money: drop the ones you didn't use this month." : "Check that you use them all."}`,
        )
    : null;

  const monthDate = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);
  const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthTag =
    monthDate.getTime() > todayMonth.getTime()
      ? L(lang, "proyección", "projection")
      : monthDate.getTime() < todayMonth.getTime()
        ? L(lang, "hecho", "closed")
        : L(lang, "hasta hoy", "so far");

  // ---- Context the advice adapts to -------------------------------------------------
  const roundNice = (n: number) => {
    // Friendly targets: whole dollars rounded to 10, córdobas to 50.
    const step = display === "USD" ? 1000 : 5000;
    return n <= 0 ? 0 : Math.max(step, Math.round(n / step) * step);
  };
  const essentialsMonthly = sumCls((line) => line.cls === "essential-fixed" || line.cls === "essential-variable" || line.cls === "credit");
  const wantsRecurring = read.filter((line) => line.cls === "discretionary").sort((a, b) => b.minor - a.minor);
  // Savings already kept (all months), the same way the savings card reads it.
  let stockEm = 0;
  let stockRet = 0;
  let stockAll = 0;
  // A balance is a snapshot (keep the latest per series); a plain amount is a deposit (add them up).
  const snapshots = new Map<string, { month: string; line: Line }>();
  const addStock = (item: Line, v: number) => {
    stockAll += v;
    if (item.subId.endsWith(".emergencia")) stockEm += v;
    else if (item.subId.endsWith(".retiro")) stockRet += v;
  };
  for (const [monthKey, month] of Object.entries(state.months)) {
    if (monthKey > key) continue;
    for (const item of month.lines) {
      if (!item.active || roleOf(state.structure, item.categoryId) !== "savings") continue;
      if (item.balanceMinor !== null && item.balanceMinor !== undefined) {
        const sid = item.seriesId || item.id;
        const prev = snapshots.get(sid);
        if (!prev || prev.month < monthKey) snapshots.set(sid, { month: monthKey, line: item });
      } else addStock(item, inView(item, display, rateE4));
    }
  }
  for (const { line: item } of snapshots.values()) addStock(item, convertMinor(item.balanceMinor as number, item.balanceCurrency || item.currency, display, rateE4));
  const cushionStock = stockEm > 0 ? stockEm : Math.max(0, stockAll - stockRet);
  if (!dated.length && cushionStock > 0 && perDay > 0 && !(uniqueMinor > 0 && left < 0)) {
    const essentialPerDay = Math.max(1, Math.round(essentialsMonthly / days));
    const lastDays = Math.floor(cushionStock / essentialPerDay);
    paceNote = L(
      lang,
      `Lo que se repite te cuesta ${money(perDay)} al día. Con lo que tienes guardado (${money(cushionStock)}) cubrirías lo esencial unos ${lastDays} días si dejara de entrar dinero.`,
      `What repeats costs you ${money(perDay)} a day. With what you've saved (${money(cushionStock)}) you'd cover essentials for about ${lastDays} days if money stopped coming in.`,
    );
  }
  // Income history: the floor of a changing income is its worst recent month.
  const priorIncome = lastKeys(key, 7)
    .filter((month) => month !== key)
    .map((month) => (state.months[month]?.lines ?? []).filter((item) => item.active && item.kind.startsWith("income")))
    .filter((bucket) => bucket.length > 0);
  const priorTotals = priorIncome.map((bucket) => bucket.reduce((acc, item) => acc + inView(item, display, rateE4), 0));
  let incomeFloor = incomeFixed;
  let floorFromHistory = false;
  if (income > 0 && incomeVariable > 0 && incomeFixed < income * 0.5 && priorTotals.length >= 2) {
    const worst = Math.min(income, ...priorTotals);
    if (worst > incomeFixed) {
      incomeFloor = worst;
      floorFromHistory = true;
    }
  }
  // A paycheck that came every month and is missing now.
  const lastPaid = priorIncome[priorIncome.length - 1] ?? [];
  const missingPay = income <= 0 && lastPaid.length
    ? { name: lineName([...lastPaid].sort((a, b) => inView(b, display, rateE4) - inView(a, display, rateE4))[0]!, names), minor: lastPaid.reduce((acc, item) => acc + inView(item, display, rateE4), 0) }
    : null;
  const emptyMonth = lines.length === 0;
  // Spending that keeps climbing: compare what repeats now with the earlier months.
  const priorSpend = lastKeys(key, 4)
    .filter((month) => month !== key)
    .map((month) => (state.months[month]?.lines ?? []).filter((item) => item.active && !item.kind.startsWith("income") && item.kind !== "purchase" && roleOf(state.structure, item.categoryId) !== "savings"))
    .filter((bucket) => bucket.length > 0);
  let trendNote: string | null = null;
  let trendLine: { name: string; delta: number } | null = null;
  if (priorSpend.length >= 2 && income > 0) {
    const oldest = priorSpend[0]!;
    const oldTotal = oldest.reduce((acc, item) => acc + inView(item, display, rateE4), 0);
    const nowTotal = recurrentMinor;
    if (oldTotal > 0 && nowTotal - oldTotal >= oldTotal * 0.15 && nowTotal - oldTotal >= income * 0.05) {
      const keyOf = (item: Line) => item.seriesId || `${norm(item.concept)}|${item.categoryId}`;
      const before = new Map<string, number>();
      for (const item of oldest) before.set(keyOf(item), (before.get(keyOf(item)) ?? 0) + inView(item, display, rateE4));
      let best: { name: string; delta: number } | null = null;
      for (const item of lines) {
        if (item.kind.startsWith("income") || item.kind === "purchase" || roleOf(state.structure, item.categoryId) === "savings") continue;
        const delta = inView(item, display, rateE4) - (before.get(keyOf(item)) ?? 0);
        if (!best || delta > best.delta) best = { name: lineName(item, names), delta };
      }
      trendLine = best && best.delta > 0 ? best : null;
      trendNote = L(
        lang,
        `Lo de cada mes subió de ${money(oldTotal)} a ${money(nowTotal)} en ${priorSpend.length} meses.${trendLine ? ` Lo que más subió: ${trendLine.name} (+${money(trendLine.delta)}).` : ""}`,
        `What repeats went from ${money(oldTotal)} to ${money(nowTotal)} in ${priorSpend.length} months.${trendLine ? ` The biggest climb: ${trendLine.name} (+${money(trendLine.delta)}).` : ""}`,
      );
    }
  }
  const habitBuys = read.filter((line) => line.cls === "discretionary" && lines.find((raw) => raw.id === line.id)?.kind === "purchase");
  const habitSum = habitBuys.reduce((acc, line) => acc + line.minor, 0);
  const buyHabit = habitBuys.length >= 3 && income > 0 && habitSum >= income * 0.05;
  const subLines = subsRead;
  const subsTotal = subsSum;
  const subsHeavy = subLines.length > 0 && income > 0 && (subsTotal >= income * 0.05 || (left > 0 && subsTotal >= left * 0.5) || subLines.length >= 5);
  const goalGap = Math.max(0, goalMinorOf(income, state.settings.savingsGoalPct) - transferMinor);
  // How fast the cushion can grow: what is left free plus what already goes to Emergency
  // (or to savings in general when no pocket is marked Emergency).
  const emergencyFlow = lines.filter((item) => roleOf(state.structure, item.categoryId) === "savings" && item.subId.endsWith(".emergencia")).reduce((acc, item) => acc + inView(item, display, rateE4), 0);
  const paceBase = left >= 0 ? left : baseSurplus > 0 && uniqueMinor > 0 ? baseSurplus : 0;
  const cushionPace = niceDown(paceBase + (emergencyFlow > 0 ? emergencyFlow : stockEm > 0 ? 0 : transferMinor), display);
  const saveRate = income > 0 ? (transferMinor / income) * 100 : null;

  const red = left < 0;
  const atypical = baseSurplus >= 0 && uniqueMinor > 0 && red;
  const tone: Reading["tone"] = income <= 0 ? "amber" : !red ? "good" : atypical ? "amber" : "bad";
  const toneLabel = income <= 0
    ? emptyMonth
      ? L(lang, "Todavía no hay nada anotado este mes.", "Nothing recorded this month yet.")
      : L(lang, "Falta el ingreso de este mes: sin él no puedo decirte cómo vas.", "This month's income is missing: without it I can't tell how you're doing.")
    : tone === "good"
      ? L(lang, "Vas bien: tus gastos de cada mes caben en lo que entra.", "You're on track: your monthly bills fit in what comes in.")
      : tone === "amber"
        ? L(lang, "Mes raro, pero manejable: lo desbalancearon compras de una vez, no tu día a día.", "An unusual month, but manageable: one-time buys tipped it, not your everyday spending.")
        : L(lang, "Alerta: tus gastos de cada mes ya no caben en lo que entra. Hay que bajar algo o subir el ingreso.", "Alert: your monthly bills no longer fit in what comes in. Something has to come down or income has to go up.");

  const cushionMinor = roundNice(essentialsMonthly * (state.settings.emergencyMonths || 3));
  const goalMinor = income > 0 ? Math.round((income * state.settings.savingsGoalPct) / 100) : 0;
  const hundred = roundNice(display === "USD" ? 10000 : convertMinor(10000, "USD", display, rateE4));
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  // The biggest things that can still move: wants that repeat, then the largest repeating needs.
  const movable = wantsRecurring.slice(0, 3);
  const movableSum = movable.reduce((acc, line) => acc + line.minor, 0);
  const bigNeeds = read.filter((line) => line.cls === "essential-fixed" || line.cls === "essential-variable").sort((a, b) => b.minor - a.minor).slice(0, 2);
  const rawDebtLines = lines.filter((line) => roleOf(state.structure, line.categoryId) === "debt" && inView(line, display, rateE4) > 0);
  const priciest = [...rawDebtLines].filter((line) => line.aprBps > 0).sort((a, b) => b.aprBps - a.aprBps)[0];
  const listNames = (items: { name: string; minor: number }[]) => items.map((line) => `${line.name} ${money(line.minor)}`).join(", ");

  let headline = "";
  let action = "";
  if (income <= 0 && emptyMonth) {
    headline = L(lang, "Todavía no hay nada anotado este mes. Empieza por lo que te entra y lo que pagas cada mes.", "Nothing is recorded this month yet. Start with what comes in and what you pay every month.");
    action = L(lang, "Qué hacer: anota tu ingreso y tus gastos de cada mes (casa, comida, transporte).", "What to do: enter your income and your monthly bills (home, food, transport).");
  } else if (income <= 0 && missingPay) {
    headline = L(
      lang,
      `Todavía no anotaste ingresos este mes. El mes pasado entraron ${money(missingPay.minor)} (${missingPay.name}). Si ya llegó, anótalo. Si se cortó, lo de cada mes te cuesta ${money(recurrentMinor)} y eso saldría de tus ahorros.`,
      `No income is recorded this month yet. Last month ${money(missingPay.minor)} came in (${missingPay.name}). If it arrived, add it. If it stopped, your monthly bills cost ${money(recurrentMinor)} and that would come out of savings.`,
    );
    action = L(
      lang,
      `Qué hacer: si perdiste ese ingreso, deja solo lo esencial (${money(essentialsMonthly)} al mes) y pausa lo demás hasta que vuelva a entrar dinero.${cushionStock > 0 && essentialsMonthly > 0 ? ` Lo que tienes guardado alcanza para unos ${Math.max(0, Math.floor((cushionStock / essentialsMonthly) * 10) / 10)} meses de lo esencial.` : ""}`,
      `What to do: if that income is gone, keep only the essentials (${money(essentialsMonthly)} a month) and pause the rest until money comes in again.${cushionStock > 0 && essentialsMonthly > 0 ? ` Your savings cover about ${Math.max(0, Math.floor((cushionStock / essentialsMonthly) * 10) / 10)} months of essentials.` : ""}`,
    );
  } else if (income <= 0) {
    headline = L(
      lang,
      "Este mes todavía no tiene ingresos. Anota lo que te entra y te digo cómo vas.",
      "This month has no income yet. Enter what comes in and I'll tell you how you're doing.",
    );
    action = L(lang, "Qué hacer: anota el ingreso de este mes, aunque sea uno.", "What to do: enter this month's income, even one line.");
  } else if (baseSurplus < 0 && uniqueMinor === 0) {
    headline = L(
      lang,
      `Tus gastos de cada mes ya son más grandes que lo que entra: faltan ${money(-baseSurplus)}. Esto no se arregla solo.`,
      `Your monthly bills are already larger than what comes in: ${money(-baseSurplus)} short. This won't fix itself.`,
    );
    action = movableSum >= -baseSurplus && movable.length
      ? L(
          lang,
          `Qué hacer: el hueco cabe en lo que eliges gastar. Baja entre ${listNames(movable)} hasta juntar ${money(-baseSurplus)}.`,
          `What to do: the gap fits inside what you choose to spend. Trim ${listNames(movable)} until you free ${money(-baseSurplus)}.`,
        )
      : L(
          lang,
          `Qué hacer: ${movable.length ? `los gustos que se repiten solo suman ${money(movableSum)}, así que no alcanzan. El hueco` : "el hueco"} se cierra bajando un gasto grande${bigNeeds.length ? ` (${listNames(bigNeeds)})` : ""}${priciest ? `, pidiendo una tasa más baja en ${lineName(priciest, names)} (${priciest.aprBps / 100}%)` : ""} o con ${money(-baseSurplus)} más de ingreso al mes.`,
          `What to do: ${movable.length ? `repeating wants only add up to ${money(movableSum)}, so they won't close it. The gap` : "the gap"} closes by lowering a big bill${bigNeeds.length ? ` (${listNames(bigNeeds)})` : ""}${priciest ? `, asking for a lower rate on ${lineName(priciest, names)} (${priciest.aprBps / 100}%)` : ""} or with ${money(-baseSurplus)} more income a month.`,
        );
  } else if (atypical && transferMinor > 0) {
    headline = L(
      lang,
      `Tu día a día está bien. Lo que desbalanceó el mes ${plural(uniqueCount, "fue 1 compra grande", `fueron ${uniqueCount} compras grandes`)} y un ahorro que salió en el peor momento.`,
      `Your everyday spending is fine. ${uniqueCount} large ${plural(uniqueCount, "purchase", "purchases")} and a transfer at the wrong moment tipped the month.`,
    );
    action = L(
      lang,
      `Qué hacer: decide qué pasa con los ${money(transferMinor)} que ahorraste. Si pueden tapar el hueco, lo que falta baja a ${money(Math.abs(leftIfTransferCovers))}. Si son intocables, hay que recortar en otro lado.`,
      `What to do: decide what happens with the ${money(transferMinor)} you saved. If it can cover the hole, the gap drops to ${money(Math.abs(leftIfTransferCovers))}. If it's untouchable, the cut has to come from elsewhere.`,
    );
  } else if (atypical) {
    headline = L(
      lang,
      `Tu día a día está bien. Lo que desbalanceó el mes ${plural(uniqueCount, "fue 1 compra grande. Sin ella", `fueron ${uniqueCount} compras grandes. Sin ellas`)}, te sobraban ${money(baseSurplus)}.`,
      `Your everyday spending is fine. ${uniqueCount} large ${plural(uniqueCount, "purchase", "purchases")} tipped the month. Without ${plural(uniqueCount, "it", "them")}, ${money(baseSurplus)} would be left.`,
    );
    action = biggestUnique
      ? L(
          lang,
          `Qué hacer: mira si ${biggestUnique.name} (${money(biggestUnique.minor)}) se puede devolver o vender. Ya se gastó, así que recortar el día a día no lo arregla.`,
          `What to do: check whether ${biggestUnique.name} (${money(biggestUnique.minor)}) can be returned or sold. It's already spent, so trimming everyday spending won't fix it.`,
        )
      : L(lang, "Qué hacer: marca qué compra fue de una vez y cuál se repite.", "What to do: mark which purchase was one-time and which repeats.");
  } else if (!red) {
    headline = transferMinor > 0
      ? L(
          lang,
          `Tus gastos de cada mes caben. Ya apartaste ${money(transferMinor)} para ahorro${saveRate !== null ? ` (${pct(saveRate)} de lo que entra)` : ""} y aún te quedan ${money(left)}.`,
          `Your monthly bills fit. You already set aside ${money(transferMinor)}${saveRate !== null ? ` (${pct(saveRate)} of income)` : ""} and ${money(left)} is still left.`,
        )
      : uniqueMinor > 0
        ? L(
            lang,
            `Tus gastos de cada mes caben y te sobran ${money(baseSurplus)}. Con las compras de una vez (${money(uniqueMinor)}), te quedan ${money(left)}.`,
            `Your monthly bills fit with ${money(baseSurplus)} to spare. After one-time buys (${money(uniqueMinor)}), ${money(left)} is left.`,
          )
        : L(lang, `Tus gastos de cada mes caben y te quedan ${money(left)}.`, `Your monthly bills fit and ${money(left)} is left.`);
    const cushionGap = Math.max(0, cushionMinor - cushionStock);
    if (trendNote && trendLine) {
      action = L(
        lang,
        `Qué hacer: vigila ${trendLine.name}. ${trendNote} A este paso, el margen se va acabando.`,
        `What to do: watch ${trendLine.name}. ${trendNote} At this pace the margin keeps shrinking.`,
      );
    } else if (buyHabit) {
      action = L(
        lang,
        `Qué hacer: tus compras sueltas ya son costumbre: ${habitBuys.length} este mes por ${money(habitSum)}, y se repiten cada mes. Ponles un tope mensual (por ejemplo ${money(niceDown(habitSum / 2, display))}) y lo demás mándalo a tu ahorro.`,
        `What to do: your small purchases are a habit now: ${habitBuys.length} this month for ${money(habitSum)}, and they repeat every month. Give them a monthly cap (say ${money(niceDown(habitSum / 2, display))}) and send the rest to savings.`,
      );
    } else if (subsHeavy) {
      action = L(
        lang,
        `Qué hacer: tus ${subsRead.length} suscripciones se llevan ${money(subsSum)} al mes. Quita las que no usaste este mes; empieza por ${subsRead.slice(0, 2).map((line) => line.name).join(" y ")}.`,
        `What to do: your ${subsRead.length} subscriptions take ${money(subsSum)} a month. Drop the ones you didn't use; start with ${subsRead.slice(0, 2).map((line) => line.name).join(" and ")}.`,
      );
    } else if (goalGap <= 0 && transferMinor > 0) {
      action = cushionGap > 0
        ? L(
            lang,
            `Qué hacer: sigue igual, ya cumples tu ahorro. Los ${money(left)} que quedan pueden ir a tu colchón: te faltan ${money(cushionGap)} para ${state.settings.emergencyMonths || 3} meses de lo esencial.`,
            `What to do: keep going, you meet your savings goal. The ${money(left)} left can go to your cushion: ${money(cushionGap)} to go for ${state.settings.emergencyMonths || 3} months of essentials.`,
          )
        : L(
            lang,
            `Qué hacer: sigue igual. Tu colchón ya está completo; lo que queda puede ir a una meta con fecha.`,
            `What to do: keep going. Your cushion is full; what's left can go to a goal with a date.`,
          );
    } else if (left > 0) {
      const move = niceDown(Math.min(left, goalGap > 0 ? goalGap : left), display);
      action = L(
        lang,
        `Qué hacer: aparta hoy ${money(move)} para tu ${cushionGap > 0 ? "colchón" : "ahorro"}, antes de que se vaya en gastos pequeños.${goalGap > left ? ` Tu meta del ${state.settings.savingsGoalPct}% serían ${money(niceDown(goalMinor, display))}; empieza con lo que sí cabe.` : ""}`,
        `What to do: move ${money(move)} to your ${cushionGap > 0 ? "cushion" : "savings"} today, before small spending eats it.${goalGap > left ? ` Your ${state.settings.savingsGoalPct}% goal would be ${money(goalMinor)}; start with what fits.` : ""}`,
      );
    } else {
      action = L(lang, "Qué hacer: el mes queda justo. Evita compras nuevas hasta que vuelvas a cobrar.", "What to do: the month is tight. Avoid new purchases until your next paycheck.");
    }
  } else {
    headline = L(
      lang,
      `El mes cierra en ${money(left)}. Lo de cada mes deja ${money(baseSurplus)}; las compras de una vez fueron ${money(uniqueMinor)}${transferMinor > 0 ? ` y el ahorro ${money(transferMinor)}` : ""}.`,
      `The month closes at ${money(left)}. What repeats leaves ${money(baseSurplus)}; one-time buys were ${money(uniqueMinor)}${transferMinor > 0 ? ` and savings ${money(transferMinor)}` : ""}.`,
    );
    action = L(
      lang,
      `Qué hacer: empieza por el gasto más grande que todavía puedes cambiar, no por el más chiquito.`,
      `What to do: start with the largest line you can still change, not the smallest.`,
    );
  }

  const floorPhrase = L(lang, `ingreso seguro`, `steady income`);
  let alert = "";
  if (income <= 0) {
    alert = emptyMonth
      ? L(lang, "Cuando anotes lo que entra y lo que sale, aquí verás si tu ingreso aguanta tus gastos.", "Once you enter what comes in and goes out, you'll see here whether your income holds up.")
      : L(lang, "Sin ingresos anotados no puedo medir tus compromisos.", "With no income recorded I can't measure your commitments.");
  } else if ((variablePct ?? 0) <= 10) {
    alert = incomeFixed >= recurrentMinor
      ? L(lang, `Tu ingreso es estable: ${money(incomeFixed)} seguros cubren tus gastos de cada mes (${money(recurrentMinor)}).`, `Your income is steady: ${money(incomeFixed)} you can count on covers your monthly bills (${money(recurrentMinor)}).`)
      : L(lang, `Tu ingreso es estable, pero no alcanza: entran ${money(incomeFixed)} seguros y lo de cada mes son ${money(recurrentMinor)}.`, `Your income is steady but short: ${money(incomeFixed)} comes in and your monthly bills are ${money(recurrentMinor)}.`);
  } else if (floorFromHistory) {
    alert = incomeFloor >= recurrentMinor
      ? L(lang, `Tu ingreso cambia de mes a mes, pero aun en tu peor mes reciente entraron ${money(incomeFloor)}, más que lo de cada mes (${money(recurrentMinor)}). En los meses buenos, guarda la diferencia.`, `Your income changes month to month, but even your worst recent month brought ${money(incomeFloor)}, more than your monthly bills (${money(recurrentMinor)}). Save the difference in good months.`)
      : L(lang, `Tu ingreso cambia de mes a mes. En tu peor mes reciente entraron ${money(incomeFloor)} y lo de cada mes son ${money(recurrentMinor)}: en un mes flojo faltarían ${money(recurrentMinor - incomeFloor)}. Guarda eso de los meses buenos.`, `Your income changes month to month. Your worst recent month brought ${money(incomeFloor)} and your monthly bills are ${money(recurrentMinor)}: a slow month would be ${money(recurrentMinor - incomeFloor)} short. Keep that from the good months.`);
  } else if (incomeFixed > 0 && incomeFixed < recurrentMinor) {
    alert = L(
      lang,
      `Tu ingreso fijo (${money(incomeFixed)}) no alcanza para lo de cada mes (${money(recurrentMinor)}): ${money(recurrentMinor - incomeFixed)} dependen de ${topSourceName || "lo variable"}.${priorTotals.length >= 2 ? " Hasta ahora ha llegado, pero si un mes falla, ahí está el hueco: ese es el primer colchón que conviene juntar." : " Si un mes no llega, ahí está el hueco."}`,
      `Your fixed income (${money(incomeFixed)}) doesn't cover your monthly bills (${money(recurrentMinor)}): ${money(recurrentMinor - incomeFixed)} depends on ${topSourceName || "variable income"}.${priorTotals.length >= 2 ? " It has arrived so far, but if one month it fails, that's the gap: the first cushion worth building." : " If one month it doesn't arrive, that's the gap."}`,
    );
  } else if (incomeFixed > 0) {
    alert = L(
      lang,
      `Tu ingreso fijo (${money(incomeFixed)}) ya cubre lo de cada mes (${money(recurrentMinor)}). Lo variable${topSourceName ? ` (${topSourceName})` : ""} es extra: úsalo para ahorrar.`,
      `Your fixed income (${money(incomeFixed)}) already covers your monthly bills (${money(recurrentMinor)}). The variable part${topSourceName ? ` (${topSourceName})` : ""} is extra: use it to save.`,
    );
  } else {
    alert = L(
      lang,
      `Todo lo que entra cambia de mes a mes${topSourceName ? ` (${topSourceName} es el ${pct(topSourcePct)})` : ""}. Apenas te paguen, separa primero ${money(niceUp(recurrentMinor, display))} para lo de cada mes.`,
      `Everything that comes in changes month to month${topSourceName ? ` (${topSourceName} is ${pct(topSourcePct)})` : ""}. As soon as you're paid, set aside ${money(niceUp(recurrentMinor, display))} for monthly bills first.`,
    );
  }

  // 1.3.117: card balances are credit too; "no credit payments" while cards carry a balance was misleading.
  const ct = cardTotals(state, iso(today));
  const cardBit = ct.known && ct.balance > 0
    ? L(lang, ` Tus tarjetas deben ${money(ct.balance)}${ct.util != null ? ` (${Math.round(ct.util * 100)}% del límite)` : ""}.`, ` Your cards owe ${money(ct.balance)}${ct.util != null ? ` (${Math.round(ct.util * 100)}% of the limit)` : ""}.`)
    : "";
  const creditBlurb =
    debtMinor <= 0
      ? cardBit ? L(lang, `Sin cuotas de préstamos este mes.${cardBit}`, `No loan payments this month.${cardBit}`) : L(lang, "Este mes no hay pagos de crédito.", "No credit payments this month.")
      : debtPct !== null && debtPct < state.settings.debtGreenPct
        ? L(
            lang,
            `Tu crédito va bien: pagas ${money(debtMinor)}, el ${pct(debtPct)} de lo que entra. ${creditAsk ?? ""}`,
            `Your credit is fine: you pay ${money(debtMinor)}, ${pct(debtPct)} of what comes in. ${creditAsk ?? ""}`,
          )
        : L(
            lang,
            `El pago del crédito es ${money(debtMinor)}${debtPct !== null ? ` (${pct(debtPct)} de lo que entra)` : ""}. ${creditAsk ?? ""}`,
            `The credit payment is ${money(debtMinor)}${debtPct !== null ? ` (${pct(debtPct)} of what comes in)` : ""}. ${creditAsk ?? ""}`,
          );

  const partOf = (id: string, label: string, minor: number, signed: number, rule: string, pred: (line: ReadLine) => boolean): FigurePart => ({
    id,
    label,
    minor,
    signed,
    rule,
    lines: read.filter(pred).map((line) => ({ id: line.id, name: line.name, minor: line.minor })),
  });
  const parts = {
    base: partOf(
      "base",
      L(lang, "De siempre", "Usual"),
      recurrentMinor,
      baseSurplus,
      L(
        lang,
        "Lo que entra menos lo que pagas todos los meses (casa, comida, créditos, cuotas). Sin contar compras de una vez ni ahorro.",
        "What comes in minus what you pay every month (home, food, credit, subscriptions). Without one-time buys or savings.",
      ),
      (line) => line.cls !== "unique" && line.cls !== "transfer",
    ),
    unique: partOf(
      "unique",
      L(lang, "De una vez", "One-time"),
      uniqueMinor,
      -uniqueMinor,
      L(
        lang,
        "Compras que no aparecen en tus meses anteriores ni están marcadas como fijas. Parecen de una sola vez; si alguna se repite, márcala fija.",
        "Buys that don't show up in your earlier months and aren't marked fixed. They look one-time; if one repeats, mark it fixed.",
      ),
      (line) => line.cls === "unique",
    ),
    transfer: partOf(
      "transfer",
      L(lang, "Ahorro", "Saved"),
      transferMinor,
      -transferMinor,
      L(
        lang,
        "Dinero que pasó a tus bolsas de ahorro. No es gasto: sigue siendo tuyo. Si el mes cierra en rojo, vale la pena revisar si era el momento.",
        "Money that went into your savings pockets. It isn't spending: it's still yours. If the month closes in the red, check whether it was the right time.",
      ),
      (line) => line.cls === "transfer",
    ),
  };

  const top = [...read]
    .sort((a, b) => b.minor - a.minor)
    .slice(0, 5)
    .map((line) => ({
      name: line.name,
      minor: line.minor,
      pctOfOut: outTotal > 0 ? (line.minor / outTotal) * 100 : null,
      cls: line.cls,
    }));

  const when0 = iso(today);
  const when7 = iso(addDays(today, 7));
  const when30 = iso(addDays(today, 30));
  const when90 = iso(addDays(today, 90));
  const fmtDay = (value: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).format(
      new Date(`${value}T12:00:00`),
    );

  const levers: Lever[] = [];
  if (transferMinor > 0 && red) {
    levers.push({
      id: "transfer",
      verb: L(lang, "Decidir", "Decide"),
      amountMinor: transferMinor,
      when: when0,
      effectMinor: leftIfTransferCovers,
      text: L(
        lang,
        `Hoy (${fmtDay(when0)}): decide si los ${money(transferMinor)} ahorrados tapan el hueco. Si sí, el mes pasa de ${money(left)} a ${money(leftIfTransferCovers)}.`,
        `Today (${fmtDay(when0)}): decide whether the ${money(transferMinor)} you saved covers the gap. If so, the month goes from ${money(left)} to ${money(leftIfTransferCovers)}.`,
      ),
    });
  }
  if (biggestUnique && red) {
    const after = left + biggestUnique.minor;
    levers.push({
      id: "return",
      verb: L(lang, "Devolver", "Return"),
      amountMinor: biggestUnique.minor,
      when: when7,
      effectMinor: after,
      text: L(
        lang,
        `Antes del ${fmtDay(when7)}: pregunta si ${biggestUnique.name} (${money(biggestUnique.minor)}) se puede devolver. Si te reembolsan, el mes pasa de ${money(left)} a ${money(after)}.`,
        `Before ${fmtDay(when7)}: ask whether ${biggestUnique.name} (${money(biggestUnique.minor)}) can be returned. If refunded, the month goes from ${money(left)} to ${money(after)}.`,
      ),
    });
  }
  const nextUnique = uniqueLines[1];
  if (nextUnique && red) {
    const after = left + nextUnique.minor;
    levers.push({
      id: "sell",
      verb: L(lang, "Vender", "Sell"),
      amountMinor: nextUnique.minor,
      when: when30,
      effectMinor: after,
      text: L(
        lang,
        `Antes del ${fmtDay(when30)}: vende o recupera ${nextUnique.name} (${money(nextUnique.minor)}). Si entra ese dinero, el mes pasa de ${money(left)} a ${money(after)}.`,
        `Before ${fmtDay(when30)}: sell or recover ${nextUnique.name} (${money(nextUnique.minor)}). If that money comes in, the month goes from ${money(left)} to ${money(after)}.`,
      ),
    });
  }
  if (!red && baseSurplus >= 0 && income > 0) {
    levers.push({
      id: "keep",
      verb: L(lang, "Mantener", "Keep"),
      amountMinor: Math.max(0, left),
      when: when0,
      effectMinor: left,
      text: L(
        lang,
        `No hace falta recortar nada: el mes cierra con ${money(left)} a favor.`,
        `No cut needed: the month closes ${money(left)} ahead.`,
      ),
    });
  }
  if (income <= 0) {
    levers.push({
      id: "income",
      verb: L(lang, "Anotar", "Enter"),
      amountMinor: 0,
      when: when0,
      effectMinor: 0,
      text: L(
        lang,
        `Anota hoy lo que te entra este mes.`,
        `Enter what comes in this month today.`,
      ),
    });
  }

  const months = state.settings.emergencyMonths || 3;
  const cushionGap = Math.max(0, cushionMinor - cushionStock);
  const unknownDebts = rawDebtLines.filter((line) => line.balanceMinor === null || !(line.aprBps > 0));
  const loudNames = loud.map((line) => lineName(line, names)).slice(0, 2);
  let day24 = "";
  let day7 = "";
  let day30 = "";
  let day90 = "";
  if (income <= 0 && emptyMonth) {
    day24 = L(lang, "Anota lo que te entra este mes.", "Enter what comes in this month.");
    day7 = L(lang, `Para el ${fmtDay(when7)}: anota lo que pagas cada mes: casa, comida, transporte, créditos.`, `By ${fmtDay(when7)}: enter what you pay every month: home, food, transport, credit.`);
    day30 = L(lang, `Para el ${fmtDay(when30)}: anota también lo pequeño (café, salidas). Ahí se ve a dónde se va el dinero.`, `By ${fmtDay(when30)}: add the small stuff too (coffee, outings). That's where money hides.`);
    day90 = L(lang, `Para el ${fmtDay(when90)}: con tres meses anotados te digo tu promedio real y cuánto colchón necesitas.`, `By ${fmtDay(when90)}: with three months recorded I'll show your real average and the cushion you need.`);
  } else if (income <= 0) {
    day24 = missingPay
      ? L(lang, `Si ya cobraste, anota tu ingreso. Si no llegó, deja hoy solo lo esencial (${money(essentialsMonthly)} al mes).`, `If you've been paid, enter it. If not, keep only the essentials today (${money(essentialsMonthly)} a month).`)
      : L(lang, "Anota hoy lo que te entra este mes.", "Enter what comes in this month today.");
    day7 = L(
      lang,
      `Para el ${fmtDay(when7)}: pausa lo que no es esencial${wantsRecurring.length ? ` (${wantsRecurring.slice(0, 3).map((line) => line.name).join(", ")})` : ""} y avisa a quien cobras fijo si vas a necesitar más tiempo.`,
      `By ${fmtDay(when7)}: pause what isn't essential${wantsRecurring.length ? ` (${wantsRecurring.slice(0, 3).map((line) => line.name).join(", ")})` : ""} and tell fixed billers early if you'll need more time.`,
    );
    day30 = L(lang, `Para el ${fmtDay(when30)}: busca un ingreso, aunque sea temporal, que cubra al menos ${money(essentialsMonthly)}.`, `By ${fmtDay(when30)}: find income, even temporary, that covers at least ${money(essentialsMonthly)}.`);
    day90 = L(lang, `Para el ${fmtDay(when90)}: cuando vuelva a entrar dinero, primero rellena lo que sacaste de tus ahorros.`, `By ${fmtDay(when90)}: once money comes in again, first refill what you took from savings.`);
  } else {
    // 24 hours: the one move that matters today.
    if (levers[0] && levers[0].id !== "keep") day24 = levers[0].text;
    else if ((debtPct ?? 0) > state.settings.debtYellowPct && rawDebtLines.length) day24 = L(lang, `Llama a ${rawDebtLines.slice(0, 3).map((line) => lineName(line, names)).join(", ")} y pide bajar la tasa o un plan de pagos. Con ${pct(debtPct)} de lo que entra en cuotas, esa llamada vale más que cualquier recorte.`, `Call ${rawDebtLines.slice(0, 3).map((line) => lineName(line, names)).join(", ")} and ask for a lower rate or a payment plan. With ${pct(debtPct)} of income going to payments, that call beats any cut.`);
    else if (red && priciest && priciest.aprBps >= 1500) day24 = L(lang, `Llama a ${lineName(priciest, names)} y pide bajar la tasa (${priciest.aprBps / 100}%) o un plan de pagos. Es la llamada que más dinero te ahorra.`, `Call ${lineName(priciest, names)} and ask for a lower rate (${priciest.aprBps / 100}%) or a payment plan. It's the call that saves the most.`);
    else if (red) day24 = movable.length
      ? L(lang, `Elige hoy qué bajas: ${listNames(movable)}. ${movableSum >= -left ? `Con eso puedes cerrar los ${money(-left)}.` : `Eso solo cubre ${money(movableSum)} de ${money(-left)}; también hace falta tocar un gasto grande.`}`, `Choose today what to trim: ${listNames(movable)}. ${movableSum >= -left ? `That can close the ${money(-left)}.` : `That only covers ${money(movableSum)} of ${money(-left)}; a big bill has to move too.`}`)
      : L(lang, `Revisa tus dos gastos más grandes${bigNeeds.length ? ` (${listNames(bigNeeds)})` : ""}: ahí está el cambio que se nota.`, `Review your two biggest bills${bigNeeds.length ? ` (${listNames(bigNeeds)})` : ""}: that's where change shows.`);
    else if (subsHeavy) day24 = L(lang, `Cancela hoy las suscripciones que no usaste este mes. Empieza por ${subsRead.slice(0, 2).map((line) => `${line.name} (${money(line.month)})`).join(" y ")}.`, `Cancel today the subscriptions you didn't use this month. Start with ${subsRead.slice(0, 2).map((line) => `${line.name} (${money(line.month)})`).join(" and ")}.`);
    else if (left > 0 && goalGap > 0) day24 = L(lang, `Mueve hoy ${money(niceDown(Math.min(left, goalGap), display))} a tu ${cushionGap > 0 ? "colchón" : "ahorro"}, antes de que se vaya en gastos pequeños.`, `Move ${money(niceDown(Math.min(left, goalGap), display))} to your ${cushionGap > 0 ? "cushion" : "savings"} today, before small spending eats it.`);
    else day24 = L(lang, `No hace falta recortar nada: el mes cierra con ${money(left)} a favor.`, `No cut needed: the month closes ${money(left)} ahead.`);

    // 7 days: payments and the paycheck routine.
    const dueBit = loudNames.length ? L(lang, `separa dinero para ${loudNames.join(" y ")}, que vencen pronto`, `set money aside for ${loudNames.join(" and ")}, due soon`) : "";
    const askBit = unknownDebts.length
      ? L(lang, `anota cuánto debes y la tasa de ${unknownDebts.slice(0, 2).map((line) => lineName(line, names)).join(" y ")} para saber cuándo terminas`, `enter the balance and rate of ${unknownDebts.slice(0, 2).map((line) => lineName(line, names)).join(" and ")} to see when you finish`)
      : "";
    const holdBit = rawDebtLines.length && red && (debtPct ?? 0) > state.settings.debtGreenPct ? L(lang, `no subas la cuota del crédito (${money(debtMinor)}) este mes`, `don't raise the credit payment (${money(debtMinor)}) this month`) : "";
    const debtBit = [holdBit, askBit].filter(Boolean).join(L(lang, " y ", " and "));
    const saveBit = goalGap > 0 && !red && left > 0 ? niceDown(Math.min(goalGap, left), display) : 0;
    const payBit = incomeFixed >= recurrentMinor
      ? L(lang, `cuando te paguen, separa primero ${money(niceUp(recurrentMinor, display))} para lo de cada mes${saveBit ? ` y ${money(saveBit)} para ahorro` : ""}; lo demás es para gastar tranquilo`, `when you're paid, set aside ${money(niceUp(recurrentMinor, display))} for monthly bills first${saveBit ? ` and ${money(saveBit)} for savings` : ""}; the rest is guilt-free`)
      : L(lang, `cada vez que te entre dinero, aparta primero la parte de lo de cada mes (${money(niceUp(recurrentMinor, display))} en total) antes de gastar en otra cosa`, `each time money comes in, set aside its share of the monthly bills (${money(niceUp(recurrentMinor, display))} in total) before anything else`);
    const structural = baseSurplus < 0;
    const parts7 = [dueBit, debtBit, structural ? "" : payBit].filter(Boolean);
    if (structural && !parts7.length) parts7.push(L(lang, `anota cada gasto por una semana: lo que no se ve no se puede bajar`, `log every expense for a week: what you can't see you can't cut`));
    const joined7 = parts7.join(L(lang, "; ", "; "));
    day7 = L(lang, `Para el ${fmtDay(when7)}: ${joined7}.`, `By ${fmtDay(when7)}: ${joined7}.`);

    // 30 days: the purchase rule and where extra money goes.
    const tight = red || (debtPct ?? 0) > state.settings.debtGreenPct;
    day30 = L(
      lang,
      `Para el ${fmtDay(when30)}: antes de cualquier compra de más de ${money(hundred)}, espera 24 horas y decide de dónde sale el dinero. ${tight ? "Si te entra dinero extra: la mitad a tapar el hueco o la deuda, 30% al colchón y 20% para ti." : "Si te entra dinero extra: la mitad a tu colchón o meta y la otra mitad para ti."}`,
      `By ${fmtDay(when30)}: before any purchase over ${money(hundred)}, wait 24 hours and decide where the money comes from. ${tight ? "If extra money comes in: half to the gap or debt, 30% to the cushion and 20% for you." : "If extra money comes in: half to your cushion or goal, half for you."}`,
    );

    // 90 days: the bigger goal that fits this month's numbers.
    if (red && baseSurplus < 0) {
      day90 = L(lang, `Para el ${fmtDay(when90)}: que lo de cada mes quepa en lo que entra, con ${money(-baseSurplus)} menos de gasto o más de ingreso. El colchón viene después.`, `By ${fmtDay(when90)}: make monthly bills fit income, with ${money(-baseSurplus)} less spending or more income. The cushion comes after.`);
    } else if (red) {
      const monthsBack = baseSurplus > 0 ? Math.ceil(-left / baseSurplus) : null;
      day90 = L(
        lang,
        `Para el ${fmtDay(when90)}: recupera el hueco de este mes (${money(-left)})${monthsBack ? ` con lo que te sobra cada mes (${money(baseSurplus)}): ${monthsBack <= 3 ? "lo cierras en este plazo" : `te toma unos ${monthsBack} meses`}` : ""}. Mientras tanto, nada de compras grandes nuevas.`,
        `By ${fmtDay(when90)}: win back this month's gap (${money(-left)})${monthsBack ? ` with what's left each month (${money(baseSurplus)}): ${monthsBack <= 3 ? "you close it in that time" : `it takes about ${monthsBack} months`}` : ""}. Meanwhile, no new big purchases.`,
      );
    } else if (cushionGap <= 0 && cushionMinor > 0) {
      day90 = L(lang, `Para el ${fmtDay(when90)}: tu colchón ya cubre ${months} meses. Ponle fecha a una meta (casa, estudios, retiro) y manda ahí lo que sobre.`, `By ${fmtDay(when90)}: your cushion covers ${months} months. Give a goal a date (home, school, retirement) and send what's left there.`);
    } else {
      const monthly = cushionPace;
      const reach = monthly > 0 ? Math.min(cushionGap, monthly * 3) : 0;
      day90 = monthly > 0
        ? L(
            lang,
            `Para el ${fmtDay(when90)}: junta ${money(niceDown(reach, display))} en tu colchón (la meta es ${money(cushionMinor)}, ${months} meses de lo esencial). Son ${money(monthly)} al mes${emergencyFlow > 0 ? `: lo que ya mandas a Emergencia más lo que te queda libre` : left > 0 ? ": lo que te queda libre" : ""}.`,
            `By ${fmtDay(when90)}: put ${money(niceDown(reach, display))} in your cushion (the goal is ${money(cushionMinor)}, ${months} months of essentials). That's ${money(monthly)} a month${emergencyFlow > 0 ? `: what already goes to Emergency plus what's free` : left > 0 ? ": what's free" : ""}.`,
          )
        : L(lang, `Para el ${fmtDay(when90)}: arma un colchón de ${money(cushionMinor)} (${months} meses de lo esencial). Empieza con lo que sobre cada mes, aunque sea poco.`, `By ${fmtDay(when90)}: build a ${money(cushionMinor)} cushion (${months} months of essentials). Start with whatever is left each month, even a little.`);
    }
  }
  const rt = remitTrend(state, key, 6);
  const usd = (m: number) => formatMoney(m, "USD", lang);
  const nio = (m: number) => formatMoney(m, "NIO", lang);
  let remitNote: string | null = null;
  if (rt.now.usd > 0 || rt.prev.usd > 0) {
    const share = rt.sharePct;
    const sharePart = share !== null ? L(lang, `, el ${share.toLocaleString("es-NI")}% de tu ingreso`, `, ${share.toLocaleString("en-US")}% of your income`) : "";
    const incPrev = rt.prev.income;
    const incGrowth = incPrev > 0 ? ((rt.now.income - incPrev) / incPrev) * 100 : null;
    const fixedAmt = niceUp(rt.avgUsd, "USD");
    if (rt.now.usd === 0) {
      remitNote = L(lang, `Remesas: este mes no has enviado nada; el mes pasado fueron ${usd(rt.prev.usd)}. Si el envío es de cada mes, apártalo antes de gastar lo demás.`, `Remittances: nothing sent this month yet; last month was ${usd(rt.prev.usd)}. If it goes out every month, set it aside before spending the rest.`);
    } else if (rt.deltaPct !== null && rt.deltaPct >= 25 && (incGrowth === null || incGrowth < rt.deltaPct / 2)) {
      remitNote = L(lang, `Remesas subieron ${rt.deltaPct}% vs el mes pasado (${usd(rt.prev.usd)} → ${usd(rt.now.usd)})${sharePart}, más rápido que tu ingreso. Acuerda con tu familia un monto fijo, por ejemplo ${usd(fixedAmt)} al mes, y trata lo extra como excepción.`, `Remittances rose ${rt.deltaPct}% vs last month (${usd(rt.prev.usd)} → ${usd(rt.now.usd)})${sharePart}, faster than your income. Agree a fixed amount with your family, for example ${usd(fixedAmt)} a month, and treat extras as the exception.`);
    } else if (share !== null && share >= 20) {
      remitNote = L(lang, `Remesas: enviaste ${usd(rt.now.usd)} (${nio(rt.now.nio)})${sharePart}. Es una parte grande; ponlo como gasto fijo al planear y deja el ahorro aparte primero.`, `Remittances: you sent ${usd(rt.now.usd)} (${nio(rt.now.nio)})${sharePart}. That's a big share; plan it as a fixed bill and set savings aside first.`);
    } else {
      remitNote = L(lang, `Remesas: enviaste ${usd(rt.now.usd)} (${nio(rt.now.nio)})${sharePart}${rt.deltaPct !== null ? `, ${rt.deltaPct >= 0 ? "+" : ""}${rt.deltaPct}% vs el mes pasado` : ""}. Un mismo monto y un mismo día cada mes es más fácil de planear; la tasa oficial casi no se mueve, así que compara sobre todo la comisión y la tasa de la remesadora.`, `Remittances: you sent ${usd(rt.now.usd)} (${nio(rt.now.nio)})${sharePart}${rt.deltaPct !== null ? `, ${rt.deltaPct >= 0 ? "+" : ""}${rt.deltaPct}% vs last month` : ""}. The same amount on the same day each month is easier to plan; the official rate barely moves, so compare the sender's fee and rate above all.`);
    }
  }
  const plan = [
    L(lang, `Plan Faro — este mes (te queda: ${money(left)})`, `Faro plan — this month (left: ${money(left)})`),
    L(lang, `24 horas: ${day24}`, `24 hours: ${day24}`),
    L(lang, `7 días: ${day7}`, `7 days: ${day7}`),
    L(lang, `30 días: ${day30}`, `30 days: ${day30}`),
    L(lang, `90 días: ${day90}`, `90 days: ${day90}`),
    ...(remitNote ? [remitNote] : []),
  ].join("\n");

  const scenarios = [
    {
      id: "base" as const,
      label: L(lang, "Solo lo de siempre", "Usual bills only"),
      detail: L(lang, "Sin compras de una vez y sin ahorro.", "No one-time buys and no savings."),
      left: baseSurplus,
    },
    {
      id: "repeat" as const,
      label: L(lang, "Repetir el mes", "Repeat the month"),
      detail: L(lang, "Todo lo anotado se queda, incluidas compras de una vez y ahorro.", "Everything recorded stays, one-time buys and savings included."),
      left,
    },
    {
      id: "plan" as const,
      label: L(lang, "Plan sugerido", "Suggested plan"),
      detail: L(
        lang,
        "El ahorro tapa el hueco y no cuenta como gasto. Las compras de una vez se quedan porque ya salieron.",
        "Savings cover the gap and don't count as spending. One-time buys stay because they already left.",
      ),
      left: leftIfTransferCovers,
    },
  ];

  return {
    currency: display,
    monthTag,
    tone,
    toneLabel,
    headline,
    action,
    alert,
    creditBlurb,
    baseSurplus,
    uniqueMinor,
    uniqueCount,
    transferMinor,
    recurrentMinor,
    income,
    incomeFixed,
    incomeVariable,
    outTotal,
    realSpend,
    left,
    leftIfTransferCovers,
    naiveFixed,
    classificationError,
    cushionMinor,
    cushionStock,
    cushionPace,
    essentialsMonthly,
    incomeFloor,
    trendNote,
    subsTotal: subsSum,
    subsCount: subsRead.length,
    variablePct,
    topSourceName,
    topSourceMinor,
    topSourcePct,
    debtMinor,
    debtPct,
    debtTermKnown,
    creditAsk,
    pocketAside,
    savingsFlow,
    contradiction,
    vagueQuestion,
    vagueName: vague?.name ?? "",
    vagueMinor: vague?.minor ?? 0,
    vaguePct,
    splitNote,
    ironmanMinor,
    gasMinor,
    ironmanPct,
    parts,
    top,
    levers,
    plan,
    antNote,
    remitNote,
    remitUsd: rt.now.usd,
    remitPrevUsd: rt.prev.usd,
    remitSharePct: rt.sharePct,
    paceNote,
    calendarNote,
    compareNote,
    balanceGap,
    lines: read,
    scenarios,
  };
}

/** What-if over real lines. Dropping a line improves "left". It does not write the ledger. */
export function projectLeft(reading: Reading, preset: ScenarioId, dropIds: string[]): number {
  const dropped = reading.lines.filter((line) => dropIds.includes(line.id));
  const dropSpend = dropped.filter((line) => line.cls !== "transfer").reduce((acc, line) => acc + line.minor, 0);
  const dropTransfer = dropped.filter((line) => line.cls === "transfer").reduce((acc, line) => acc + line.minor, 0);
  if (preset === "base") return reading.baseSurplus;
  if (preset === "plan") return reading.leftIfTransferCovers + dropSpend;
  return reading.left + dropSpend + dropTransfer;
}
