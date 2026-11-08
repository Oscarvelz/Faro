import { readAdvisor } from "./advisor";
import { colorFor } from "./colors";
import { displayName, visibleNamer } from "./defaults";
import { isRemitLine } from "./remesas";
import { savingsStock } from "./savings";
import { loanTotals } from "./loans";
import { lentTotals, payoffPlan } from "./debts";
import { cardFigures, cardMonthlyInterest, cardTotals, cardsOf, rewardsTotals, toThirty } from "./cards";
import { cadenceLabel } from "./cadence";
import { convertMinor, formatMoney, formatPct, monthlyEquivalent, roundHalfAway } from "./money";
import type {
  AdviceCard,
  BudgetPlan,
  Currency,
  Insight,
  Lang,
  LedgerState,
  Line,
  MonthPoint,
  Slice,
  Structure,
  Summary,
  Tone,
} from "./types";

type Namer = {
  cat: (id: string) => string;
  sub: (id: string) => string;
  purchase: (id: string) => string;
  catalog: (id: string) => string;
};

function L(lang: Lang, es: string, en: string): string {
  return lang === "en" ? en : es;
}

export function roleOf(structure: Structure, categoryId: string): string {
  return structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

export function inView(line: Line, display: Currency, rateE4: number): number {
  if (!line.active) return 0;
  return convertMinor(line.amountMinor, line.currency, display, rateE4);
}

function sum(lines: Line[], display: Currency, rateE4: number, pred: (l: Line) => boolean): number {
  return lines.reduce((acc, line) => (pred(line) ? acc + inView(line, display, rateE4) : acc), 0);
}

export function monthLines(state: LedgerState, key: string): Line[] {
  return state.months[key]?.lines ?? [];
}

export function summarize(state: LedgerState, key: string, lang: Lang): Summary {
  const { settings, structure } = state;
  const lines = monthLines(state, key);
  const { display, rateE4 } = settings;
  const income = sum(lines, display, rateE4, (l) => l.kind === "income-fixed" || l.kind === "income-variable");
  const fixed = sum(lines, display, rateE4, (l) => l.kind === "expense-fixed");
  const variable = sum(lines, display, rateE4, (l) => l.kind === "expense-variable");
  const purchases = sum(lines, display, rateE4, (l) => l.kind === "purchase");
  const subscriptions = sum(lines, display, rateE4, (l) => l.kind === "subscription");
  const expense = fixed + variable + purchases + subscriptions;
  const opportunity = income - expense;
  const spentPct = income > 0 ? (expense / income) * 100 : null;
  // Loan payments (Debo → Préstamos) count as debt in either book; a fixed one already sits in the debt category.
  const debt = sum(lines, display, rateE4, (l) => (l.kind === "expense-fixed" && roleOf(structure, l.categoryId) === "debt") || (!!l.loanId && (l.kind === "expense-fixed" || l.kind === "expense-variable")));
  const debtPct = income > 0 ? (debt / income) * 100 : null;
  const debtAllowance = roundHalfAway((income * settings.debtGreenPct) / 100);
  const savingsFlow = sum(lines, display, rateE4, (l) => roleOf(structure, l.categoryId) === "savings");
  const savingsGoal = roundHalfAway((income * settings.savingsGoalPct) / 100);
  const petty = sum(lines, display, rateE4, (l) => roleOf(structure, l.categoryId) === "petty");
  // 1.3.147: the ONE remittance predicate (remesas.ts) — expenses in a remittance category only;
  // an income line filed there is income, not a remittance, on every surface.
  const remittance = sum(lines, display, rateE4, (l) => isRemitLine(state, l));
  const housing = sum(lines, display, rateE4, (l) => roleOf(structure, l.categoryId) === "housing");
  const money = (n: number) => formatMoney(n, display, lang);
  let tone: Tone = "neutral";
  let semaphore = L(
    lang,
    "Sin ingresos registrados, el semáforo no juzga la carga. Anota lo que entra este mes.",
    "With no income recorded, the signal cannot judge the load. Enter what comes in this month.",
  );
  if (income > 0 && debtPct !== null) {
    if (debtPct < settings.debtGreenPct) {
      tone = "good";
      semaphore = L(
        lang,
        `Pagos a créditos: ${money(debt)} (${formatPct(debtPct, lang)} del ingreso). Verde: está bajo tu tope de ${settings.debtGreenPct}%. El cupo de deuda que te marcaste es ${money(debtAllowance)}.`,
        `Credit payments: ${money(debt)} (${formatPct(debtPct, lang)} of income). Green: under your ${settings.debtGreenPct}% cap. The debt allowance you set is ${money(debtAllowance)}.`,
      );
    } else if (debtPct <= settings.debtYellowPct) {
      tone = "warn";
      semaphore = L(
        lang,
        `Pagos a créditos: ${money(debt)} (${formatPct(debtPct, lang)}). Amarillo: entre ${settings.debtGreenPct}% y ${settings.debtYellowPct}%. El cupo verde era ${money(debtAllowance)}.`,
        `Credit payments: ${money(debt)} (${formatPct(debtPct, lang)}). Yellow: between ${settings.debtGreenPct}% and ${settings.debtYellowPct}%. The green allowance was ${money(debtAllowance)}.`,
      );
    } else {
      tone = "bad";
      semaphore = L(
        lang,
        `Pagos a créditos: ${money(debt)} (${formatPct(debtPct, lang)}). Rojo: pasa tu techo de ${settings.debtYellowPct}%. Esto es el pago del mes, no el saldo, salvo que lo hayas anotado aparte.`,
        `Credit payments: ${money(debt)} (${formatPct(debtPct, lang)}). Red: above your ${settings.debtYellowPct}% ceiling. This is the month's payment, not the balance, unless you recorded that separately.`,
      );
    }
  } else if (income > 0 && debt === 0) {
    tone = "good";
    semaphore = L(
      lang,
      "No hay pagos en la categoría de créditos. El semáforo queda en verde porque la carga registrada es cero, no porque se haya verificado una deuda externa.",
      "No payments sit in the credit category. The signal is green because the recorded load is zero, not because an outside debt was verified.",
    );
  }
  return {
    income,
    fixed,
    variable,
    purchases,
    subscriptions,
    expense,
    opportunity,
    spentPct,
    debt,
    debtPct,
    debtAllowance,
    savingsFlow,
    savingsGoal,
    petty,
    remittance,
    housing,
    tone,
    semaphore,
  };
}

function slicesFor(lines: Line[], structure: Structure, display: Currency, rateE4: number, names: Namer): Slice[] {
  const map = new Map<string, Slice>();
  for (const line of lines) {
    if (!line.active) continue;
    if (!line.kind.startsWith("expense") && line.kind !== "purchase" && line.kind !== "subscription") continue;
    const id = line.categoryId || line.kind;
    const name =
      (line.categoryId && (names.cat(line.categoryId) || names.purchase(line.categoryId))) ||
      names.catalog(line.storeId) ||
      names.catalog(line.providerId) ||
      line.concept;
    const prev = map.get(id) ?? { id, name, minor: 0, color: colorFor(structure, id) };
    prev.minor += inView(line, display, rateE4);
    prev.name = name || prev.name;
    prev.color = colorFor(structure, id);
    map.set(id, prev);
  }
  return [...map.values()].filter((s) => s.minor !== 0).sort((a, b) => b.minor - a.minor);
}

export function categorySlices(state: LedgerState, key: string, names: Namer, lang: Lang): Slice[] {
  const raw = slicesFor(monthLines(state, key), state.structure, state.settings.display, state.settings.rateE4, names);
  // Contrato, regla 2: nombrar sigue a la visibilidad. El dinero de las categorías (y compras)
  // ocultas se agrupa bajo «Otros» con el mismo monto — la suma no se mueve un centavo.
  const hidden = new Set<string>([
    ...state.structure.categories.filter((c) => c.hidden).map((c) => c.id),
    ...state.structure.purchases.filter((p) => p.hidden).map((p) => p.id),
  ]);
  if (!raw.some((s) => hidden.has(s.id))) return raw;
  const out: Slice[] = [];
  let otros: Slice | null = null;
  for (const s of raw) {
    if (hidden.has(s.id)) {
      if (!otros) {
        otros = { id: "otros", name: L(lang, "Otros", "Other"), minor: 0, color: colorFor(state.structure, "otros") };
        out.push(otros);
      }
      otros.minor += s.minor;
    } else {
      out.push(s);
    }
  }
  return out.filter((s) => s.minor !== 0).sort((a, b) => b.minor - a.minor);
}

/**
 * 1.3.148: a top-N fold that keeps the money. Everything past the limit is summed into one «Otros»
 * slice — merged into the Otros slice categorySlices already made when it sits in the head — so a
 * chart's shares are shares of the real total, never of a silently cut list.
 */
export function foldSlices(slices: Slice[], limit: number, lang: Lang, otrosColor: string): Slice[] {
  if (slices.length <= limit) return slices;
  const head = slices.slice(0, limit);
  const tailMinor = slices.slice(limit).reduce((a, s) => a + s.minor, 0);
  if (tailMinor === 0) return head;
  const at = head.findIndex((s) => s.id === "otros");
  if (at >= 0) {
    const out = head.slice();
    out[at] = { ...out[at]!, minor: out[at]!.minor + tailMinor };
    return out;
  }
  return [...head, { id: "otros", name: L(lang, "Otros", "Other"), minor: tailMinor, color: otrosColor }];
}

export function yearPoints(state: LedgerState, year: number, lang: Lang, kinds?: string[], subs?: string[]): MonthPoint[] {
  const { display, rateE4 } = state.settings;
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short" });
  const points: MonthPoint[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    const lines = monthLines(state, key).filter((line) => line.active && (!kinds?.length || kinds.includes(line.kind)) && (!subs || subs.includes(line.subId)));
    const income = sum(lines, display, rateE4, (l) => l.kind.startsWith("income"));
    const expense = sum(lines, display, rateE4, (l) => !l.kind.startsWith("income"));
    points.push({ key, label: fmt.format(new Date(year, m - 1, 1)), income: income / 100, expense: expense / 100 });
  }
  return points;
}

function lineDay(line: Line): string {
  if (line.bookedOn && line.bookedOn.startsWith(line.monthKey)) return line.bookedOn;
  return `${line.monthKey}-01`;
}

function pair(lines: Line[], display: Currency, rateE4: number) {
  const income = sum(lines, display, rateE4, (l) => l.kind.startsWith("income"));
  const expense = sum(lines, display, rateE4, (l) => !l.kind.startsWith("income"));
  return { income: income / 100, expense: expense / 100 };
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function spanPoints(state: LedgerState, year: number, month: number, span: "year" | "month" | "week", lang: Lang, kinds?: string[], subs?: string[]): MonthPoint[] {
  if (span === "year") return yearPoints(state, year, lang, kinds, subs);
  const { display, rateE4 } = state.settings;
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const lines = monthLines(state, key).filter((l) => l.active && (!kinds?.length || kinds.includes(l.kind)) && (!subs || subs.includes(l.subId)));
  const last = new Date(year, month, 0).getDate();
  if (span === "month") {
    const points: MonthPoint[] = [];
    let day = 1;
    while (day <= last) {
      const date = new Date(year, month - 1, day);
      const untilSun = date.getDay() === 0 ? 0 : 7 - date.getDay();
      const end = Math.min(last, day + untilSun);
      const start = `${key}-${String(day).padStart(2, "0")}`;
      const stop = `${key}-${String(end).padStart(2, "0")}`;
      const bucket = lines.filter((l) => {
        const on = lineDay(l);
        return on >= start && on <= stop;
      });
      points.push({ key: start, label: `${day}–${end}`, ...pair(bucket, display, rateE4) });
      day = end + 1;
    }
    return points;
  }
  const today = new Date();
  const anchor = today.getFullYear() === year && today.getMonth() + 1 === month ? today : new Date(year, month - 1, 1);
  const monday = new Date(anchor);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { weekday: "short" });
  const points: MonthPoint[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const id = isoDate(d);
    const bucket = lines.filter((l) => lineDay(l) === id);
    points.push({ key: id, label: fmt.format(d).replace(".", ""), ...pair(bucket, display, rateE4) });
  }
  return points;
}

export function compareSpans(state: LedgerState, year: number, month: number, span: "year" | "month" | "week", count: number, lang: Lang): MonthPoint[] {
  const { display, rateE4 } = state.settings;
  const lines = Object.values(state.months).flatMap((bucket) => bucket.lines).filter((line) => line.active);
  const inRange = (start: string, stop: string) => lines.filter((line) => {
    const on = lineDay(line);
    return on >= start && on <= stop;
  });
  if (span === "year") {
    return Array.from({ length: count }, (_, index) => {
      const y = year - (count - 1 - index);
      return { key: String(y), label: String(y), ...pair(inRange(`${y}-01-01`, `${y}-12-31`), display, rateE4) };
    });
  }
  if (span === "month") {
    const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short" });
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(year, month - 1 - (count - 1 - index), 1);
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const last = String(new Date(y, m, 0).getDate()).padStart(2, "0");
      return { key, label: fmt.format(date).replace(".", ""), ...pair(inRange(`${key}-01`, `${key}-${last}`), display, rateE4) };
    });
  }
  const today = new Date();
  const anchor = today.getFullYear() === year && today.getMonth() + 1 === month ? today : new Date(year, month - 1, 1);
  const monday = new Date(anchor);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow) - (count - 1) * 7);
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" });
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + index * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const a = isoDate(start);
    const b = isoDate(end);
    return { key: a, label: fmt.format(start).replace(".", ""), ...pair(inRange(a, b), display, rateE4) };
  });
}

export type StudyBoard = {
  savingsRate: number | null;
  burn: number;
  burnPrev: number | null;
  subs: { label: string; minor: number }[];
  envelopes: { name: string; budget: number; actual: number }[];
  runwayMonths: number | null;
  runwayGoal: number;
  runwayHave: number;
  top: { name: string; minor: number }[];
  topRest: { count: number; minor: number };
  flow: { name: string; minor: number; tone: string }[];
  donut: { name: string; minor: number; color: string }[];
  income: number;
};

export function studyBoard(state: LedgerState, key: string, lang: Lang, names: Namer): StudyBoard {
  names = visibleNamer(state.structure, names); // Contrato, regla 2: las etiquetas no nombran lo oculto.
  const s = summarize(state, key, lang);
  const { display, rateE4 } = state.settings;
  const [yStr, mStr] = key.split("-");
  const y = Number(yStr) || 2026;
  const days = new Date(y, Number(mStr) || 1, 0).getDate() || 30;
  // 1.3.147: the current month's daily burn divides by the days ELAPSED, not the whole month
  // (on the 5th it read ~6× too low next to the previous month's complete-month figure).
  const nowD = new Date();
  const isCurrentMonth = key === `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`;
  const burnDays = isCurrentMonth ? Math.max(1, nowD.getDate()) : days;
  const burn = burnDays > 0 ? Math.round(s.expense / burnDays) : 0;
  const prev = previousKey(key);
  const prevLines = monthLines(state, prev);
  const hasPrev = prevLines.some((l) => l.active);
  const prevExpense = hasPrev ? sum(prevLines, display, rateE4, (l) => !l.kind.startsWith("income")) : 0;
  const prevDays = new Date(Number(prev.slice(0, 4)), Number(prev.slice(5, 7)), 0).getDate() || 30;
  const burnPrev = hasPrev ? Math.round(prevExpense / prevDays) : null;
  const savingsRate = s.income > 0 ? ((s.income - s.expense) / s.income) * 100 : null;
  const fmtMonth = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short" });
  const subs = Array.from({ length: 12 }, (_, i) => {
    const k = `${y}-${String(i + 1).padStart(2, "0")}`;
    return {
      label: fmtMonth.format(new Date(y, i, 1)),
      minor: sum(monthLines(state, k), display, rateE4, (l) => l.kind === "subscription"),
    };
  });
  const savingsFixed = sum(monthLines(state, key).filter((l) => l.active), state.settings.display, state.settings.rateE4, (l) => l.kind === "expense-fixed" && roleOf(state.structure, l.categoryId) === "savings");
  // Savings already sent count toward the goal; they are not a bill on top of it.
  const goalLeft = Math.max(0, s.savingsGoal - s.savingsFlow);
  const fixedReal = s.fixed - savingsFixed;
  const fixedOnly = s.income - fixedReal - s.subscriptions;
  const room = fixedOnly - goalLeft;
  const envelopes = [
    { name: L(lang, "Día a día", "Everyday"), budget: Math.max(0, room), actual: s.variable + s.purchases },
    { name: L(lang, "Créditos", "Credit"), budget: s.debtAllowance, actual: s.debt },
    { name: L(lang, "Casa", "Home"), budget: s.income > 0 ? roundHalfAway((s.income * 35) / 100) : 0, actual: s.housing },
  ].filter((row) => row.budget > 0 || row.actual > 0);
  const lines = monthLines(state, key).filter((l) => l.active);
  // 1.3.147: the runway numerator is the ONE savings stock (savings.ts) — the same figure the
  // Asesor's cushion and the widget read — not just the balances sitting in this month's bucket.
  const runwayHave = savingsStock(state, key).total;
  const runwayMonths = s.fixed > 0 ? runwayHave / s.fixed : null;
  const topAll = lines
    .filter((l) => !l.kind.startsWith("income"))
    .map((l) => ({
      name: l.concept || names.cat(l.categoryId) || names.purchase(l.categoryId) || names.catalog(l.storeId) || l.kind,
      minor: inView(l, display, rateE4),
    }))
    .filter((l) => l.minor > 0)
    .sort((a, b) => b.minor - a.minor);
  const top = topAll.slice(0, 5);
  // 1.3.148: what the top-5 cut leaves out, counted and summed, so the list can say "+N más ($X)".
  const topRest = { count: topAll.length - top.length, minor: topAll.slice(5).reduce((a, l) => a + l.minor, 0) };
  const flow = [
    { name: L(lang, "Fijos", "Fixed"), minor: s.fixed, tone: "tone-1" },
    { name: L(lang, "Variables", "Variable"), minor: s.variable, tone: "tone-2" },
    { name: L(lang, "Compras", "Shopping"), minor: s.purchases, tone: "tone-3" },
    { name: L(lang, "Cuotas", "Subscriptions"), minor: s.subscriptions, tone: "tone-4" },
    { name: L(lang, "Queda", "Left"), minor: Math.max(0, s.opportunity), tone: "tone-0" },
  ].filter((b) => b.minor > 0);
  // 1.3.147: the donut reads categorySlices (hidden money folds into «Otros», the contract's rule),
  // not the raw slicesFor that printed hidden categories under their own names.
  const raw = categorySlices(state, key, names, lang);
  const head = raw.slice(0, 6);
  const tail = raw.slice(6).reduce((acc, sl) => acc + sl.minor, 0);
  // 1.3.148: a negative tail (refunds past the head) is money too — it folds in instead of vanishing.
  const donut = tail !== 0
    ? [...head.map((sl) => ({ name: sl.name, minor: sl.minor, color: sl.color })), { name: L(lang, "Otras", "Other"), minor: tail, color: "#c5c1b8" }]
    : head.map((sl) => ({ name: sl.name, minor: sl.minor, color: sl.color }));
  return {
    savingsRate,
    burn,
    burnPrev,
    subs,
    envelopes,
    runwayMonths,
    runwayGoal: state.settings.emergencyMonths,
    runwayHave,
    top,
    topRest,
    flow,
    donut,
    income: s.income,
  };
}

export type SankeyNode = { id: string; name: string; minor: number; color: string; col: 0 | 1 | 2 };
export type SankeyLink = { source: string; target: string; minor: number };
export type CashSankey = { nodes: SankeyNode[]; links: SankeyLink[] };

/** Income → categories → the biggest pieces inside them. Real month lines only. */
export function cashSankey(state: LedgerState, key: string, lang: Lang, names: Namer): CashSankey {
  names = visibleNamer(state.structure, names); // Contrato, regla 2: las etiquetas no nombran lo oculto.
  const { display, rateE4 } = state.settings;
  const lines = monthLines(state, key).filter((line) => line.active);
  const income = lines.filter((line) => line.kind.startsWith("income")).reduce((sum, line) => sum + inView(line, display, rateE4), 0);
  // 1.3.147: hidden categories fold into the «Otras» bucket from the start (their money still
  // counts; their names and their subs never print), like categorySlices does for Estudio.
  const hiddenCats = new Set(state.structure.categories.filter((c) => c.hidden).map((c) => c.id));
  const hiddenSubs = new Set(state.structure.categories.flatMap((c) => c.subs.filter((s) => s.hidden || c.hidden).map((s) => s.id)));
  type Sub = { id: string; name: string; minor: number };
  type Bucket = { id: string; name: string; minor: number; color: string; subs: Map<string, Sub> };
  const cats = new Map<string, Bucket>();
  for (const line of lines) {
    if (line.kind.startsWith("income")) continue;
    if (!line.kind.startsWith("expense") && line.kind !== "purchase" && line.kind !== "subscription") continue;
    const minor = inView(line, display, rateE4);
    if (minor <= 0) continue;
    const hiddenLine = !!line.categoryId && hiddenCats.has(line.categoryId);
    const id = hiddenLine ? "otras" : line.categoryId || line.kind;
    const bucket = cats.get(id) ?? {
      id,
      name: hiddenLine ? L(lang, "Otras", "Other") : names.cat(id) || names.purchase(id) || line.concept || id,
      minor: 0,
      color: hiddenLine ? "#c5c1b8" : colorFor(state.structure, id),
      subs: new Map<string, Sub>(),
    };
    bucket.minor += minor;
    if (line.subId && !hiddenLine && !hiddenSubs.has(line.subId)) {
      const sub = bucket.subs.get(line.subId) ?? { id: line.subId, name: names.sub(line.subId) || line.concept || line.subId, minor: 0 };
      sub.minor += minor;
      if (!sub.name) sub.name = line.concept || sub.id;
      bucket.subs.set(line.subId, sub);
    }
    cats.set(id, bucket);
  }
  const ranked = [...cats.values()].filter((cat) => cat.minor > 0).sort((a, b) => b.minor - a.minor);
  const head = ranked.slice(0, 5);
  const restMinor = ranked.slice(5).reduce((sum, cat) => sum + cat.minor, 0);
  if (restMinor > 0) {
    const otras = head.find((cat) => cat.id === "otras");
    if (otras) otras.minor += restMinor;
    else head.push({ id: "otras", name: L(lang, "Otras", "Other"), minor: restMinor, color: "#c5c1b8", subs: new Map() });
  }
  if (!head.length && income <= 0) return { nodes: [], links: [] };
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const spent = head.reduce((sum, cat) => sum + cat.minor, 0);
  const left = income > spent ? income - spent : 0;
  if (left > 0) head.push({ id: "queda", name: L(lang, "Queda", "Left"), minor: left, color: "#8fb9a6", subs: new Map() });
  const sourceMinor = head.reduce((sum, cat) => sum + cat.minor, 0);
  if (sourceMinor <= 0) return { nodes: [], links: [] };
  nodes.push({
    id: "src",
    name: income > 0 ? L(lang, "Entra", "In") : L(lang, "Sale", "Out"),
    minor: sourceMinor,
    color: "#8fb9a6",
    col: 0,
  });
  for (const cat of head) {
    nodes.push({ id: cat.id, name: cat.name, minor: cat.minor, color: cat.color, col: 1 });
    links.push({ source: "src", target: cat.id, minor: cat.minor });
    const subs = [...cat.subs.values()].filter((sub) => sub.minor > 0).sort((a, b) => b.minor - a.minor).slice(0, 3);
    for (const sub of subs) {
      if (subs.length === 1 && sub.minor >= cat.minor * 0.92) continue;
      const sid = `${cat.id}>${sub.id}`;
      nodes.push({ id: sid, name: sub.name, minor: sub.minor, color: cat.color, col: 2 });
      links.push({ source: cat.id, target: sid, minor: sub.minor });
    }
  }
  return { nodes, links };
}

function previousKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y || 2026, (m || 1) - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function buildInsights(state: LedgerState, key: string, lang: Lang, names: Namer): Insight[] {
  names = visibleNamer(state.structure, names); // Contrato, regla 2: las etiquetas no nombran lo oculto.
  const s = summarize(state, key, lang);
  const { display, rateE4 } = state.settings;
  const money = (n: number) => formatMoney(n, display, lang);
  const lines = monthLines(state, key).filter((l) => l.active);
  const out: Insight[] = [];
  const push = (row: Insight) => out.push(row);

  push({
    id: "spent",
    title: L(lang, "Cuánto del ingreso ya está comprometido", "How much of income is already committed"),
    value: formatPct(s.spentPct, lang),
    detail: L(lang, `${money(s.expense)} de ${money(s.income)}`, `${money(s.expense)} of ${money(s.income)}`),
    tone: s.spentPct === null ? "neutral" : s.spentPct > 100 ? "bad" : s.spentPct > 80 ? "warn" : "good",
    viz: s.spentPct === null ? undefined : { kind: "ring", pct: s.spentPct, mark: 80 },
    meaning: L(lang, "Relación entre todo lo anotado como gasto este mes y todo lo anotado como ingreso.", "Ratio of everything recorded as spending this month to everything recorded as income."),
    formula: L(lang, "Gastos ÷ ingresos × 100. Si no hay ingreso, no hay porcentaje.", "Spending ÷ income × 100. No income, no percentage."),
    implication: L(
      lang,
      s.income <= 0
        ? "Sin ingreso, un porcentaje sería teatro. Primero anota lo que entra."
        : s.opportunity >= 0
          ? `Quedan ${money(s.opportunity)} después de lo anotado. Esa cifra es el techo real de ahorro o de abono extra, no una meta de ánimo.`
          : `Lo anotado supera al ingreso por ${money(-s.opportunity)}. El mes no cierra si estas cifras están completas.`,
      s.income <= 0
        ? "Without income, a percentage would be theater. Enter what comes in first."
        : s.opportunity >= 0
          ? `${money(s.opportunity)} remains after what you recorded. That figure is the real ceiling for saving or an extra payment, not a pep talk.`
          : `Recorded spending exceeds income by ${money(-s.opportunity)}. The month does not close if these figures are complete.`,
    ),
  });

  const savingsFixed = sum(lines, display, rateE4, (l) => l.kind === "expense-fixed" && roleOf(state.structure, l.categoryId) === "savings");
  const realFixed = s.fixed - savingsFixed;
  const fixedPct = s.income > 0 ? (realFixed / s.income) * 100 : null;
  if (lines.length === 0) return [];
  push({
    id: "rigid",
    title: L(lang, "Rigidez", "Rigidity"),
    value: formatPct(fixedPct, lang),
    detail: L(lang, `${money(realFixed)} en fijos${savingsFixed > 0 ? `, sin contar ${money(savingsFixed)} de ahorro` : ""}.`, `${money(realFixed)} fixed${savingsFixed > 0 ? `, not counting ${money(savingsFixed)} of savings` : ""}.`),
    tone: fixedPct === null ? "neutral" : fixedPct > 70 ? "bad" : fixedPct > 50 ? "warn" : "good",
    viz: fixedPct === null ? undefined : { kind: "ring", pct: fixedPct, mark: 50 },
    meaning: L(lang, "Parte del ingreso que se va en gastos fijos. Es lo que no se recorta este mes sin renegociar un contrato, una renta o un crédito.", "Share of income that leaves in fixed expenses. It is what you cannot cut this month without renegotiating rent, a contract, or a credit."),
    formula: L(lang, "Gastos fijos ÷ ingresos. Las suscripciones de este mes van aparte, en su propia lectura.", "Fixed costs ÷ income. This month's subscriptions are read separately."),
    implication: L(
      lang,
      fixedPct !== null && fixedPct > 70
        ? "La palanca de este mes casi no está en el café. Está en el fijo más grande."
        : fixedPct !== null && fixedPct > 50
          ? "Tus fijos ya pasan de la mitad. Recortar lo pequeño ayuda, pero el cambio grande está en un fijo."
          : "Tus fijos dejan espacio. Si quieres ahorrar más, el margen está en el gasto del día a día.",
      fixedPct !== null && fixedPct > 70
        ? "This month's lever is not the coffee. It is the largest fixed bill."
        : fixedPct !== null && fixedPct > 50
          ? "Fixed bills are past half. Small cuts help, but the big change is in a fixed bill."
          : "Your fixed bills leave room. If you want to save more, the margin is in everyday spending.",
    ),
  });

  const flex = s.variable + s.purchases;
  const flexPct = s.income > 0 ? (flex / s.income) * 100 : null;
  push({
    id: "flex",
    title: L(lang, "Gasto con margen", "Spending with room"),
    value: money(flex),
    detail: flexPct === null ? L(lang, "Gastos variables y compras.", "Variable spending and purchases.") : L(lang, `${formatPct(flexPct, lang)} de tu ingreso, en gastos variables y compras.`, `${formatPct(flexPct, lang)} of your income, in variable spending and purchases.`),
    tone: "neutral",
    viz: flexPct === null ? undefined : { kind: "ring", pct: flexPct },
    meaning: L(lang, "Variables más compras. Es la zona donde un recorte de este mes sí cambia el cierre, sin tocar la renta.", "Variable spending plus purchases. This is where a cut this month actually changes the close, without touching rent."),
    formula: L(lang, "Suma de líneas variables activas + compras activas, en la moneda de la vista.", "Sum of active variable lines + active purchases, in the view currency."),
    implication: L(lang, "Si el plan de presupuesto pide recortes, salen de aquí, de mayor a menor.", "If the budget plan asks for cuts, they come from here, largest first."),
  });

  const pettyYear = s.petty * 12;
  push({
    id: "petty",
    title: L(lang, "Hormiga en un año", "Leaks over a year"),
    value: money(pettyYear),
    detail: L(lang, `${money(s.petty)} este mes en la categoría de gastos hormiga.`, `${money(s.petty)} this month in leak spending.`),
    tone: s.income > 0 && s.petty > s.income * 0.05 ? "warn" : "neutral",
    viz: s.income > 0 ? { kind: "share", pct: (s.petty / s.income) * 100 } : undefined,
    meaning: L(lang, "Proyección simple: el gasto hormiga de este mes, repetido doce veces. No es un promedio histórico si solo existe este mes.", "Simple projection: this month's leak spending, repeated twelve times. It is not a historical average if only this month exists."),
    formula: L(lang, "Hormiga del mes × 12.", "This month's leaks × 12."),
    implication: L(
      lang,
      s.petty === 0
        ? "No hay nada en esa categoría. Si el café está dentro de restaurantes, esta lectura lo está subestimando."
        : `Doce meses así son ${money(pettyYear)}. No hace falta quitarlo todo: con bajar la mitad, juntas ${money(Math.round(pettyYear / 2))} al año.`,
      s.petty === 0
        ? "Nothing sits in that category. If coffee is inside restaurants, this reading understates it."
        : `Twelve months like this set aside ${money(pettyYear)} that do not build a fund, unless the category is misfiled.`,
    ),
  });

  const subs = lines.filter((l) => l.kind === "subscription");
  const runRate = subs.reduce((acc, l) => acc + convertMinor(monthlyEquivalent(l.amountMinor, l.cadence || "monthly"), l.currency, display, rateE4), 0);
  push({
    id: "subs",
    title: L(lang, "Ritmo de suscripciones", "Subscription run-rate"),
    value: money(runRate),
    detail: L(lang, `${money(s.subscriptions)} cobrados en este mes. El ritmo usa la frecuencia de cada una.`, `${money(s.subscriptions)} charged this month. The run-rate uses each cadence.`),
    tone: s.income > 0 && runRate > s.income * 0.1 ? "warn" : "neutral",
    viz: s.income > 0 ? { kind: "share", pct: (runRate / s.income) * 100 } : undefined,
    meaning: L(lang, "Cuánto costarían al mes las suscripciones activas de este mes si su frecuencia se mantiene. Una anual se reparte en doce. Una semanal se lleva a mes.", "What this month's active subscriptions would cost per month if their cadence holds. A yearly plan is spread over twelve. A weekly plan is scaled up."),
    formula: L(lang, "Semanal × 52 ÷ 12. Anual ÷ 12. Mensual se queda igual. Luego se convierte a la vista.", "Weekly × 52 ÷ 12. Yearly ÷ 12. Monthly stays. Then converted to the view."),
    implication: L(lang, `En doce meses, ese ritmo son ${money(runRate * 12)} si ninguna se cancela y el precio no cambia.`, `Over twelve months that run-rate is ${money(runRate * 12)} if none are cancelled and the price holds.`),
  });

  const slices = categorySlices(state, key, names, lang);
  const expenseAbs = slices.reduce((a, sl) => a + Math.max(0, sl.minor), 0);
  let walk = 0;
  const pareto: string[] = [];
  for (const sl of slices) {
    if (sl.minor <= 0) continue;
    walk += sl.minor;
    pareto.push(`${sl.name} ${money(sl.minor)}`);
    if (expenseAbs > 0 && walk >= expenseAbs * 0.8) break;
  }
  push({
    id: "pareto",
    title: L(lang, "Dónde se va el 80%", "Where 80% goes"),
    value: pareto.length ? String(pareto.length) : "—",
    detail: pareto.join(" · ") || L(lang, "Sin gastos activos.", "No active spending."),
    tone: "neutral",
    viz: expenseAbs > 0 ? { kind: "parts", cut: pareto.length, parts: foldSlices(slices.filter((sl) => sl.minor > 0), 8, lang, colorFor(state.structure, "otros")).map((sl) => ({ name: sl.name, share: sl.minor / expenseAbs, color: sl.color })) } : undefined,
    meaning: L(lang, "Las categorías que, sumadas de mayor a menor, alcanzan el 80% del gasto del mes. El resto es cola.", "The categories that, added from largest to smallest, reach 80% of the month's spending. The rest is the tail."),
    formula: L(lang, "Ordenar categorías por monto descendente y acumular hasta 80% del gasto.", "Sort categories by amount descending and accumulate until 80% of spending."),
    implication: L(lang, "Si una decisión solo cabe en una categoría, que sea la primera de esta lista.", "If a decision only fits in one category, make it the first on this list."),
  });

  const usdMinor = lines.reduce((acc, l) => (l.currency === "USD" ? acc + l.amountMinor : acc), 0);
  const nioMinor = lines.reduce((acc, l) => (l.currency === "NIO" ? acc + l.amountMinor : acc), 0);
  push({
    id: "fx",
    title: L(lang, "Exposición al tipo de cambio", "Exchange-rate exposure"),
    value: L(lang, `${formatMoney(usdMinor, "USD", lang)} en dólares`, `${formatMoney(usdMinor, "USD", lang)} in dollars`),
    detail: L(lang, `${formatMoney(nioMinor, "NIO", lang)} anotados en córdobas.`, `${formatMoney(nioMinor, "NIO", lang)} recorded in córdobas.`),
    tone: "neutral",
    viz: usdMinor + nioMinor > 0 ? { kind: "split", a: convertMinor(usdMinor, "USD", display, rateE4), b: convertMinor(nioMinor, "NIO", display, rateE4), aLabel: "US$", bLabel: "C$" } : undefined,
    meaning: L(lang, "Cuánto del mes vive en cada moneda. La vista convierte; el registro no.", "How much of the month lives in each currency. The view converts; the record does not."),
    formula: L(lang, "Si la tasa sube C$1.00, la vista en córdobas de esos dólares sube exactamente el monto en dólares. C$36 más de tasa sobre $100 son C$100 más.", "If the rate rises C$1.00, the córdoba view of those dollars rises by exactly the dollar amount. C$36 more of rate on $100 is C$100 more."),
    implication: L(
      lang,
      usdMinor === 0
        ? "Este mes no tiene líneas en dólares. Cambiar la tasa no mueve ningún total."
        : `Un movimiento de C$1 en la tasa mueve la vista de estas líneas en ${formatMoney(usdMinor, "NIO", lang)} por cada dólar de monto. El registro en dólares queda igual.`,
      usdMinor === 0
        ? "This month has no dollar lines. Changing the rate moves no total."
        : `A C$1 move in the rate moves the view of these lines by ${formatMoney(usdMinor, "NIO", lang)} for each dollar of face amount. The dollar record stays put.`,
    ),
  });

  const prev = monthLines(state, previousKey(key));
  const prevIncome = sum(prev, display, rateE4, (l) => l.kind.startsWith("income"));
  const prevExpense = sum(prev, display, rateE4, (l) => !l.kind.startsWith("income"));
  const hasPrev = prev.some((l) => l.active);
  push({
    id: "mom",
    title: L(lang, "Contra el mes anterior", "Vs. last month"),
    value: hasPrev ? (s.expense === prevExpense ? "=" : `${s.expense > prevExpense ? "+" : "-"}${money(Math.abs(s.expense - prevExpense))}`) : "—",
    detail: hasPrev && s.expense === prevExpense
      ? L(lang, `Gastaste lo mismo que el mes pasado${s.income !== prevIncome ? `, y entró ${money(Math.abs(s.income - prevIncome))} ${s.income > prevIncome ? "más" : "menos"}` : ""}.`, `You spent the same as last month${s.income !== prevIncome ? `, and ${money(Math.abs(s.income - prevIncome))} ${s.income > prevIncome ? "more" : "less"} came in` : ""}.`)
      : hasPrev
      ? L(
          lang,
          `Gastaste ${money(Math.abs(s.expense - prevExpense))} ${s.expense >= prevExpense ? "más" : "menos"} que el mes pasado${s.income !== prevIncome ? `, y entró ${money(Math.abs(s.income - prevIncome))} ${s.income > prevIncome ? "más" : "menos"}` : ", y entró lo mismo"}.`,
          `You spent ${money(Math.abs(s.expense - prevExpense))} ${s.expense >= prevExpense ? "more" : "less"} than last month${s.income !== prevIncome ? `, and ${money(Math.abs(s.income - prevIncome))} ${s.income > prevIncome ? "more" : "less"} came in` : ", and the same came in"}.`,
        )
      : L(lang, "No hay otro mes con movimientos. Una comparación con un mes vacío no dice nada.", "There is no other month with entries. A comparison with an empty month says nothing."),
    tone: !hasPrev ? "neutral" : s.expense > prevExpense ? "warn" : "good",
    viz: hasPrev ? { kind: "delta", now: s.expense, prev: prevExpense } : undefined,
    meaning: L(lang, "Diferencia de gasto y de ingreso contra el mes calendario anterior, en la vista de hoy.", "Difference in spending and income versus the previous calendar month, in today's view."),
    formula: L(lang, "Total de este mes − total del mes anterior, misma tasa de hoy.", "This month's total − last month's total, at today's rate."),
    implication: L(lang, "Un solo salto no es una tendencia. El gráfico del año enseña si se repite.", "One jump is not a trend. The year chart shows whether it repeats."),
  });

  const rd = readAdvisor(state, key, lang, names);
  const stock = rd.cushionStock;
  const monthsCover = rd.essentialsMonthly > 0 && stock > 0 ? stock / rd.essentialsMonthly : null;
  push({
    id: "cushion",
    title: L(lang, "Colchón real", "Real cushion"),
    value: stock > 0 ? money(stock) : "—",
    detail:
      monthsCover !== null
        ? L(lang, `${monthsCover.toFixed(1)} meses de lo esencial. Meta: ${state.settings.emergencyMonths}.`, `${monthsCover.toFixed(1)} months of essentials. Goal: ${state.settings.emergencyMonths}.`)
        : L(lang, "Todavía no hay nada en tus bolsas de ahorro.", "Nothing in your savings pockets yet."),
    tone: monthsCover === null ? "neutral" : monthsCover >= state.settings.emergencyMonths ? "good" : "warn",
    viz: monthsCover !== null ? { kind: "cover", months: monthsCover, goal: state.settings.emergencyMonths } : undefined,
    meaning: L(lang, "Saldo acumulado que tú anotaste en líneas de ahorro, dividido entre los fijos de este mes.", "Accumulated balance you entered on savings lines, divided by this month's fixed bills."),
    formula: L(lang, "Suma de saldos de ahorro ÷ gastos fijos del mes. Si el fijo es 0, no hay meses que calcular.", "Sum of savings balances ÷ this month's fixed expenses. If fixed is 0, there are no months to compute."),
    implication: L(
      lang,
      monthsCover === null
        ? `Quieres ${state.settings.emergencyMonths} meses. Sin saldo, no digo que ya los tienes.`
        : monthsCover >= state.settings.emergencyMonths
          ? "El saldo anotado cubre la meta contra los fijos de este mes. Si los fijos suben, la cobertura baja."
          : `Faltan ${money(Math.max(0, rd.cushionMinor - stock))} para ${state.settings.emergencyMonths} meses de lo esencial.`,
      monthsCover === null
        ? `You want ${state.settings.emergencyMonths} months. Without a balance, I will not say you already have them.`
        : monthsCover >= state.settings.emergencyMonths
          ? "The recorded balance covers the goal against this month's fixed bills. If fixed bills rise, coverage falls."
          : `${money(Math.max(0, rd.cushionMinor - stock))} short of ${state.settings.emergencyMonths} months of essentials.`,
    ),
  });

  const remPct = s.income > 0 ? (s.remittance / s.income) * 100 : null;
  push({
    id: "remit",
    title: L(lang, "Remesas", "Remittances"),
    value: money(s.remittance),
    detail: formatPct(remPct, lang),
    tone: "neutral",
    viz: remPct !== null ? { kind: "share", pct: remPct } : undefined,
    meaning: L(lang, "Lo enviado en la categoría de remesas. No incluye un ingreso que hayas llamado remesa si lo anotaste como ingreso.", "What left through the remittance category. It does not include income you named remittance if you filed it as income."),
    formula: L(lang, "Suma de líneas cuyo rol es remesa.", "Sum of lines whose role is remittance."),
    implication: L(lang, "Si ese envío es innegociable, trátalo como fijo al armar el plan, aunque el resto de la categoría cambie.", "If that money is non-negotiable, treat it as a fixed bill when you plan."),
  });

  const housePct = s.income > 0 ? (s.housing / s.income) * 100 : null;
  push({
    id: "house",
    title: L(lang, "Carga de casa", "Housing load"),
    value: formatPct(housePct, lang),
    detail: money(s.housing),
    tone: housePct !== null && housePct > 35 ? "warn" : "neutral",
    viz: housePct === null ? undefined : { kind: "ring", pct: housePct, mark: 35 },
    meaning: L(lang, "Todo lo etiquetado con rol de casa, fijo o variable, contra el ingreso.", "Everything tagged with the home role, fixed or variable, against income."),
    formula: L(lang, "Gastos con rol casa ÷ ingresos. Un umbral útil de lectura es 35%, no una ley.", "Home-role spending ÷ income. 35% is a useful reading line, not a law."),
    implication: L(lang, "Por encima de eso, el resto del presupuesto hereda la decisión de la vivienda.", "Above that, the rest of the budget inherits the housing decision."),
  });

  const largest = [...lines].filter((l) => !l.kind.startsWith("income")).sort((a, b) => inView(b, display, rateE4) - inView(a, display, rateE4))[0];
  push({
    id: "largest",
    title: L(lang, "La línea que manda", "The top line"),
    value: largest ? money(inView(largest, display, rateE4)) : "—",
    detail: largest ? largest.concept || names.cat(largest.categoryId) : L(lang, "Sin gastos.", "No spending."),
    tone: "neutral",
    viz: largest && s.expense > 0 ? { kind: "share", pct: (inView(largest, display, rateE4) / s.expense) * 100 } : undefined,
    meaning: L(lang, "El gasto activo más grande del mes, una sola línea.", "The single largest active expense this month."),
    formula: L(lang, "Máximo de los gastos convertidos a la vista.", "Maximum of expenses converted to the view."),
    implication: L(lang, "Si solo vas a revisar un número con calma, es este.", "If you only review one number carefully, review this one."),
  });

  const days = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
  let breakDay: number | null = null;
  if (s.income > 0 && s.expense > s.income) breakDay = Math.max(1, Math.min(days, Math.floor((s.income / s.expense) * days)));
  push({
    id: "break",
    title: L(lang, "Día en que el mes no alcanza", "Day the month runs out"),
    value: breakDay ? String(breakDay) : L(lang, "Cierra", "It closes"),
    detail: breakDay
      ? L(lang, `A ritmo parejo, el ingreso se agota el día ${breakDay} de ${days}.`, `At an even pace, income runs out on day ${breakDay} of ${days}.`)
      : L(lang, "El gasto anotado no supera al ingreso, o falta el ingreso.", "Recorded spending does not exceed income, or income is missing."),
    tone: breakDay ? "bad" : "good",
    viz: { kind: "days", day: breakDay, days },
    meaning: L(lang, "Supone que el gasto se reparte en partes iguales cada día. Es una alarma, no un calendario real.", "Assumes spending is spread evenly each day. It is an alarm, not a real calendar."),
    formula: L(lang, "Día = ingreso ÷ gasto × días del mes, solo si el gasto es mayor.", "Day = income ÷ spending × days in the month, only if spending is greater."),
    implication: L(lang, "Si aparece un día, el plan de este mes tiene que bajar gasto o subir ingreso antes de ese punto.", "If a day appears, this month's plan has to lower spending or raise income before that point."),
  });

  // Leave out readings that have nothing to say for this person.
  const hasUsd = lines.some((l) => l.currency === "USD");
  const hasNio = lines.some((l) => l.currency === "NIO");
  return out.filter((row) => {
    if (row.id === "fx") return hasUsd && hasNio;
    if (row.id === "remit") return s.remittance > 0;
    if (row.id === "petty") return s.petty > 0;
    if (row.id === "subs") return runRate > 0;
    if (row.id === "break") return s.income > 0 && s.expense > s.income;
    if (row.id === "flex") return s.income > 0 && s.variable + s.purchases > 0;
    if (row.id === "cushion") return rd.essentialsMonthly > 0;
    if (row.id === "house") return s.housing > 0;
    if (row.id === "rigid") return s.income > 0;
    return true;
  });
}

export function buildBudget(state: LedgerState, key: string, lang: Lang, names: Namer): BudgetPlan {
  names = visibleNamer(state.structure, names); // Contrato, regla 2: las etiquetas no nombran lo oculto.
  const s = summarize(state, key, lang);
  const lines = monthLines(state, key).filter((l) => l.active);
  const savingsFixed = sum(lines, state.settings.display, state.settings.rateE4, (l) => l.kind === "expense-fixed" && roleOf(state.structure, l.categoryId) === "savings");
  // Savings already sent count toward the goal; they are not a bill on top of it.
  const goalLeft = Math.max(0, s.savingsGoal - s.savingsFlow);
  const fixedReal = s.fixed - savingsFixed;
  const fixedOnly = s.income - fixedReal - s.subscriptions;
  const room = fixedOnly - goalLeft;
  const variableActual = s.variable + s.purchases;
  const gap = variableActual - Math.max(0, room);
  const groups = new Map<string, number>();
  for (const line of lines) {
    if (line.kind !== "expense-variable" && line.kind !== "purchase") continue;
    const name = names.cat(line.categoryId) || names.purchase(line.categoryId) || line.concept || line.kind;
    groups.set(name, (groups.get(name) ?? 0) + inView(line, state.settings.display, state.settings.rateE4));
  }
  const ranked = [...groups.entries()].sort((a, b) => b[1] - a[1]);
  let left = Math.max(0, gap);
  const cuts: BudgetPlan["cuts"] = [];
  if (s.income > 0 && room < 0) {
    /* fixed (or fixed + goal) already overflow: cuts cannot close it */
  } else {
    for (const [name, minor] of ranked) {
      if (left <= 0) break;
      const cut = Math.min(minor, left);
      if (cut > 0) cuts.push({ name, minor: cut });
      left -= cut;
    }
  }
  const money = (n: number) => formatMoney(n, state.settings.display, lang);
  let note = "";
  if (s.income <= 0) {
    note = L(lang, "Primero anota un ingreso. Sin eso, un presupuesto sería un invento.", "Enter an income first. Without it, a budget would be a guess.");
  } else if (fixedOnly < 0) {
    note = L(
      lang,
      `Tus fijos ya se pasan del ingreso por ${money(-fixedOnly)}.\nUn gasto suelto no lo cierra. Baja un fijo, o sube el ingreso.`,
      `Your fixed bills already exceed income by ${money(-fixedOnly)}.\nA small expense won't close it. Lower a fixed bill, or raise income.`,
    );
  } else if (fixedOnly - variableActual < 0) {
    note = L(
      lang,
      `Tus fijos dejan ${money(fixedOnly)} para el día a día y ahí se fueron ${money(variableActual)}: faltan ${money(variableActual - fixedOnly)}.\nEmpieza por el gasto variable más grande. Los fijos se quedan.`,
      `Your fixed bills leave ${money(fixedOnly)} for everyday spending and ${money(variableActual)} went there: ${money(variableActual - fixedOnly)} short.\nStart with the largest variable expense. Fixed bills stay.`,
    );
  } else if (room < 0) {
    note = L(
      lang,
      `Tus fijos caben. Para llegar a tu meta del ${state.settings.savingsGoalPct}% (${money(s.savingsGoal)}) te faltan ${money(-room)} después de los fijos.\nEmpieza ahorrando lo que sí sobra; la meta es la dirección, no un examen.`,
      `Your fixed bills fit. To reach your ${state.settings.savingsGoalPct}% goal (${money(s.savingsGoal)}) you'd need ${money(-room)} more after fixed bills.\nStart by saving what's actually left; the goal is a direction, not a test.`,
    );
  } else if (gap <= 0) {
    note = L(
      lang,
      `${goalLeft > 0 ? `Para tu meta del ${state.settings.savingsGoalPct}% faltan ${money(goalLeft)}.` : `Ya cumpliste tu meta del ${state.settings.savingsGoalPct}%.`}\nDespués de los fijos${goalLeft > 0 ? " y la meta" : ""} quedan ${money(room)} para el día a día.\nLo anotado cabe. Sobran ${money(-gap)}.`,
      `${goalLeft > 0 ? `${money(goalLeft)} to go for your ${state.settings.savingsGoalPct}% goal.` : `You've met your ${state.settings.savingsGoalPct}% goal.`}\nAfter fixed bills${goalLeft > 0 ? " and the goal" : ""}, ${money(room)} is left for everyday spending.\nWhat you recorded fits. ${money(-gap)} is spare.`,
    );
  } else {
    note = L(
      lang,
      `Para ahorrar tu ${state.settings.savingsGoalPct}%, el día a día tendría que bajar ${money(gap)}.\nEmpieza por el más grande. Los fijos se quedan.`,
      `To save your ${state.settings.savingsGoalPct}%, everyday spending would need to drop ${money(gap)}.\nStart with the largest. Fixed bills stay.`,
    );
  }
  return {
    income: s.income,
    savingsTarget: goalLeft,
    fixed: fixedReal,
    debt: s.debt,
    room: Math.max(0, room),
    variableActual,
    gap,
    cuts,
    feasible: s.income > 0 && room >= 0 && gap <= 0,
    note,
  };
}

export function buildAdvice(state: LedgerState, key: string, lang: Lang, names: Namer): AdviceCard[] {
  names = visibleNamer(state.structure, names); // Contrato, regla 2: las etiquetas no nombran lo oculto.
  const s = summarize(state, key, lang);
  const reading = readAdvisor(state, key, lang, names);
  const money = (n: number) => formatMoney(n, state.settings.display, lang);
  const pct = (n: number | null) => formatPct(n, lang);
  const lines = monthLines(state, key).filter((l) => l.active);
  const debts = lines.filter((l) => roleOf(state.structure, l.categoryId) === "debt");
  const absLeft = Math.abs(s.opportunity);

  const shortPoints: AdviceCard["points"] = [
    {
      label: L(lang, "De siempre", "Usual"),
      value: money(reading.baseSurplus),
      note: reading.parts.base.rule,
      emphasis: true,
    },
  ];
  if (reading.uniqueMinor > 0) {
    shortPoints.push({
      label: L(lang, "De una vez", "One-time"),
      value: money(reading.parts.unique.signed),
      note: reading.parts.unique.rule,
    });
  }
  if (reading.transferMinor > 0) {
    shortPoints.push({
      label: L(lang, "Ahorro", "Saved"),
      value: money(reading.parts.transfer.signed),
      note: reading.parts.transfer.rule,
    });
  }
  if (reading.trendNote) {
    shortPoints.push({
      label: L(lang, "Va subiendo", "Climbing"),
      value: money(reading.recurrentMinor),
      note: reading.trendNote,
    });
  }
  if (reading.remitNote) {
    shortPoints.push({
      label: L(lang, "Remesas", "Remittances"),
      value: formatMoney(reading.remitUsd, "USD", lang),
      note: reading.remitNote.replace(/^(Remesas|Remittances):\s*/, ""),
    });
  }
  if (reading.splitNote) {
    shortPoints.push({
      label: L(lang, "No es un hábito", "Not a habit"),
      value: money(reading.ironmanMinor),
      note: reading.splitNote,
    });
  }
  if (reading.classificationError) {
    shortPoints.push({
      label: L(lang, "Fijos sin el ahorro", "Fixed without savings"),
      value: money(reading.naiveFixed - reading.transferMinor),
      note: reading.classificationError,
    });
  }
  if (reading.rateNote) {
    shortPoints.push({
      label: L(lang, "Tasa de cambio", "Exchange rate"),
      value: L(lang, "Sin tasa", "No rate"),
      note: reading.rateNote,
    });
  }
  if (reading.realSpend !== reading.outTotal) {
    shortPoints.push({
      label: L(lang, "Gasto real", "Real spend"),
      value: money(reading.realSpend),
      note: L(
        lang,
        `Sin contar ahorro. En total salieron ${money(reading.outTotal)}, pero ${money(reading.transferMinor)} fueron a tu ahorro y siguen siendo tuyos.`,
        `Without savings. In total ${money(reading.outTotal)} went out, but ${money(reading.transferMinor)} went to your savings and is still yours.`,
      ),
    });
  }
  for (const row of reading.top) {
    if (shortPoints.some((point) => point.value === money(row.minor) && point.label === row.name)) continue;
    shortPoints.push({
      label: row.name,
      value: money(row.minor),
      note: L(
        lang,
        row.cls === "transfer"
          ? "Es ahorro, no gasto. Aparece arriba solo por su tamaño."
          : row.cls === "unique"
            ? "Parece compra de una vez. Ya salió: se puede devolver, vender o compensar."
            : "Se repite cada mes. Si hay gastos más grandes, empieza por esos.",
        row.cls === "transfer"
          ? "It's savings, not spending. It shows up here only because of its size."
          : row.cls === "unique"
            ? "Looks like a one-time buy. It already left: it can be returned, sold or made up for."
            : "It repeats every month. If there are bigger bills, start with those.",
      ),
    });
  }
  if (reading.vagueQuestion) {
    shortPoints.push({
      label: L(lang, "Pregunta", "Question"),
      value: reading.vagueName || "—",
      note: reading.vagueQuestion,
    });
  }
  if (reading.antNote) {
    shortPoints.push({
      label: L(lang, "Suscripciones", "Subscriptions"),
      value: L(lang, `${money(reading.subsTotal)} al mes`, `${money(reading.subsTotal)} a month`),
      note: reading.antNote,
    });
  }

  const spentCaption = L(
    lang,
    `Gastaste ${money(reading.realSpend)} (sin contar ahorro). ${reading.toneLabel}`,
    `You spent ${money(reading.realSpend)} (savings not counted). ${reading.toneLabel}`,
  );

  const mediumBits: AdviceCard["points"] = [];
  for (const d of debts) {
    const pay = inView(d, state.settings.display, state.settings.rateE4);
    const name = d.concept || names.sub(d.subId) || names.cat(d.categoryId);
    if (d.balanceMinor === null) {
      mediumBits.push({
        label: name,
        value: money(pay),
        note: L(lang, "Cuota de este mes. Anota cuánto debes, la tasa anual y el pago mínimo, y te digo en cuántos meses terminas.", "This month's payment. Enter what you owe, the annual rate and the minimum payment, and I'll tell you in how many months you finish."),
      });
      continue;
    }
    const bal = convertMinor(d.balanceMinor, d.balanceCurrency, state.settings.display, state.settings.rateE4);
    if (d.aprBps > 0) {
      const r = d.aprBps / 10000 / 12;
      const interest = roundHalfAway(bal * r);
      if (pay <= interest) {
        mediumBits.push({
          label: name,
          value: money(bal),
          note: L(lang, `Debes esto y pagas ${money(pay)}. El interés del mes es cerca de ${money(interest)}: el pago no lo cubre y la deuda no baja.`, `You owe this and pay ${money(pay)}. Interest this month is about ${money(interest)}: the payment does not cover it and the balance does not fall.`),
        });
      } else {
        const n = Math.log(pay / (pay - bal * r)) / Math.log(1 + r);
        const months = Number.isFinite(n) ? Math.ceil(n) : null;
        const totalInterest = months ? Math.max(0, pay * months - bal) : 0;
        mediumBits.push({
          label: name,
          value: money(bal),
          note: L(
            lang,
            `Debes esto y pagas ${money(pay)}. Al ${d.aprBps / 100}% anual, unos ${money(interest)} de este mes se van en interés. Terminas en unos ${months ?? "—"} meses${totalInterest > 0 ? ` y pagas ${money(totalInterest)} de interés en total` : ""}.`,
            `You owe this and pay ${money(pay)}. At ${d.aprBps / 100}% a year, about ${money(interest)} of this month goes to interest. You finish in about ${months ?? "—"} months${totalInterest > 0 ? `, paying ${money(totalInterest)} in interest overall` : ""}.`,
          ),
        });
      }
    } else {
      const n = pay > 0 ? Math.ceil(bal / pay) : null;
      mediumBits.push({
        label: name,
        value: money(bal),
        note: L(lang, `Debes esto y pagas ${money(pay)}. Sin tasa anotada, unos ${n ?? "—"} meses. Si cobra interés, tarda más.`, `You owe this and pay ${money(pay)}. With no rate recorded, about ${n ?? "—"} months. Interest would make it longer.`),
      });
    }
  }
  const rated = debts.filter((d) => d.aprBps > 0 && d.balanceMinor !== null && d.balanceMinor > 0).sort((a, b) => b.aprBps - a.aprBps);
  if (rated.length >= 2 && s.opportunity >= 0) {
    const first = rated[0]!;
    mediumBits.push({
      label: L(lang, "Primero", "First"),
      value: first.concept || names.sub(first.subId) || names.cat(first.categoryId),
      note: L(
        lang,
        `Paga el mínimo en todas y pon cualquier extra en esta (${first.aprBps / 100}%): es la que más te cobra. Cuando se acabe, pasa ese pago a la siguiente.`,
        `Pay the minimum on all and put any extra on this one (${first.aprBps / 100}%): it costs you the most. When it's gone, roll that payment to the next.`,
      ),
    });
  }
  if (debts.length && s.debtPct !== null && s.debtPct > state.settings.debtYellowPct) {
    mediumBits.push({
      label: L(lang, "Pide ayuda", "Ask for help"),
      value: L(lang, "Llama hoy", "Call today"),
      note: L(
        lang,
        "Llama a cada banco y pide bajar la tasa o un plan de pagos; muchos aceptan si lo pides antes de atrasarte. Si no alcanza, busca una asesoría de crédito sin fines de lucro antes que un préstamo nuevo.",
        "Call each lender and ask for a lower rate or a payment plan; many say yes if you ask before falling behind. If that's not enough, look for nonprofit credit counseling before any new loan.",
      ),
    });
  }
  if (debts.length && s.opportunity < 0) {
    mediumBits.push({
      label: L(lang, "Este mes", "This month"),
      value: L(lang, "No subas el pago", "Do not raise it"),
      note: L(lang, `Ya te faltan ${money(absLeft)}. Primero cierra el mes; después acelera el crédito.`, `You are already short ${money(absLeft)}. Close the month first, then speed up the credit.`),
    });
  }

  // 1.3.110: card balances (1.3.107) are credit too: the 90-day card reflects them instead of saying "no credit payments".
  const ct = cardTotals(state);
  const mediumLead = (() => {
    if ((!debts.length || s.debt <= 0) && ct.known && ct.balance > 0) {
      const use = ct.util != null ? L(lang, `, el ${Math.round(ct.util * 100)}% de tu límite`, `, ${Math.round(ct.util * 100)}% of your limit`) : "";
      const mins = ct.min > 0 ? L(lang, ` Su pago mínimo suma ${money(ct.min)}.`, ` Their minimums add up to ${money(ct.min)}.`) : "";
      return L(lang, `Sin cuotas de préstamos este mes, pero tus tarjetas deben ${money(ct.balance)}${use}.${mins}`, `No loan payments this month, but your cards owe ${money(ct.balance)}${use}.${mins}`);
    }
    if (!debts.length || s.debt <= 0) {
      return L(lang, "Este mes no hay pagos de crédito.", "No credit payments this month.");
    }
    const load = s.debtPct !== null
      ? L(lang, `, el ${pct(s.debtPct)} de lo que entra.`, `, ${pct(s.debtPct)} of what comes in.`)
      : ".";
    if (s.tone === "bad") {
      return L(
        lang,
        `Pagas ${money(s.debt)}${load} Ya pasaste el límite de ${state.settings.debtYellowPct}% que te pusiste: evita deudas nuevas.`,
        `You pay ${money(s.debt)}${load} You are past the ${state.settings.debtYellowPct}% ceiling you set: avoid new debt.`,
      );
    }
    if (s.tone === "warn") {
      return L(
        lang,
        `Pagas ${money(s.debt)}${load} Ya pasaste la zona cómoda (${state.settings.debtGreenPct}%), pero sigues bajo tu límite (${state.settings.debtYellowPct}%).`,
        `You pay ${money(s.debt)}${load} You are past the easy zone (${state.settings.debtGreenPct}%), but still under your ceiling (${state.settings.debtYellowPct}%).`,
      );
    }
    const missing = debts.some((d) => d.balanceMinor === null);
    return L(
      lang,
      `Pagas ${money(s.debt)}${load} Tu zona cómoda llega a ${money(s.debtAllowance)}. El pago está bien.${missing ? " Anota cuánto debes, la tasa y el pago mínimo para saber cuándo terminas." : ""}`,
      `You pay ${money(s.debt)}${load} Your easy zone goes up to ${money(s.debtAllowance)}. The payment is fine.${missing ? " Enter what you owe, the rate and the minimum payment to see when you finish." : ""}`,
    );
  })();

  const keys = Object.keys(state.months).filter((k) => (state.months[k]?.lines.length ?? 0) > 0).sort();
  // Months with no income recorded (one still waiting for its paycheck) would drag the average into a fake hole.
  // 1.3.117: each month is read once (it was read twice, and every read walks every month for the savings stock).
  const perKey = new Map<string, { income: number; baseSurplus: number }>();
  const readKey = (k: string) => {
    let r = perKey.get(k);
    if (!r) { const x = k === key ? reading : readAdvisor(state, k, lang, names); r = { income: x.income, baseSurplus: x.baseSurplus }; perKey.set(k, r); }
    return r;
  };
  const paidKeys = keys.filter((k) => readKey(k).income > 0);
  const baseSeries = (paidKeys.length ? paidKeys : keys.length ? keys : [key]).map((k) => readKey(k).baseSurplus);
  const avgBase = baseSeries.length ? Math.round(baseSeries.reduce((a, b) => a + b, 0) / baseSeries.length) : reading.baseSurplus;
  const oneMonth = (paidKeys.length || keys.length) < 2;
  // When spending is climbing, the average is too kind: use this month instead.
  const worsening = !oneMonth && reading.income > 0 && reading.baseSurplus < avgBase && (avgBase - reading.baseSurplus) * 100 >= Math.max(1, s.income) * 5;
  const unitStep = state.settings.display === "USD" ? 100 : 100;
  const perMonth = Math.round(((oneMonth && reading.income > 0) || worsening ? reading.baseSurplus : avgBase) / unitStep) * unitStep;
  const yearFigure = perMonth * 12;
  const emergencyTarget = reading.cushionMinor;
  const stock = reading.cushionStock;
  const gapFund = Math.max(0, emergencyTarget - stock);
  const pace = reading.cushionPace;
  const monthsToFund = pace > 0 && gapFund > 0 ? Math.ceil(gapFund / pace) : null;

  const longLead = reading.income <= 0 && paidKeys.length
    ? L(lang, `Este mes todavía no tiene ingreso, así que uso tus ${paidKeys.length} meses con ingreso. Si ese ingreso se cortó, esta cuenta no aplica hasta que vuelva.`, `This month has no income yet, so I use your ${paidKeys.length} months with income. If that income stopped, this doesn't apply until it returns.`)
    : oneMonth
    ? yearFigure < 0
      ? L(lang, "Si cada mes fuera como este (sin compras de una vez), el año cerraría con un hueco. No es una predicción: es la cuenta si nada cambia.", "If every month were like this one (without one-time buys), the year would end short. Not a forecast: just the math if nothing changes.")
      : L(lang, "Si cada mes fuera como este (sin compras de una vez), esto es lo que te quedaría en un año. No es una predicción: es la cuenta si nada cambia.", "If every month were like this one (without one-time buys), this is what a year would leave. Not a forecast: just the math if nothing changes.")
    : yearFigure < 0
      ? L(lang, `En ${keys.length} meses, lo de cada mes cierra en rojo en promedio. Doce meses así dejan un hueco. No es una predicción: es la cuenta si nada cambia.`, `Across ${keys.length} months, what repeats closes in the red on average. Twelve months like that leave a hole. Not a forecast: just the math if nothing changes.`)
      : worsening
        ? L(lang, `Este mes te sobra menos que tu promedio de ${baseSeries.length} meses, así que hago la cuenta con este mes. No es una predicción: es la cuenta si nada cambia.`, `This month leaves less than your ${baseSeries.length}-month average, so I use this month. Not a forecast: just the math if nothing changes.`)
        : L(lang, `Tu promedio de ${baseSeries.length} meses, llevado a un año. Sin compras de una vez. No es una predicción: es la cuenta si nada cambia.`, `Your ${baseSeries.length}-month average, carried to a year. Without one-time buys. Not a forecast: just the math if nothing changes.`);

  const nothingYet = lines.length === 0;
  const longPoints: AdviceCard["points"] = nothingYet ? [{
    label: L(lang, "En un año", "In a year"),
    value: "—",
    note: L(lang, "Cuando anotes tu primer mes, aquí verás lo que te quedaría en un año si todo sigue igual.", "Once you record your first month, you'll see here what a year like it would leave."),
    emphasis: true,
  }] : [
    {
      label: yearFigure < 0 ? L(lang, "Hueco en un año", "Hole in a year") : L(lang, "En un año", "In a year"),
      value: money(Math.abs(yearFigure)),
      note: oneMonth
        ? L(lang, "Lo que te sobra de tus gastos de cada mes, por doce. Sin compras de una vez ni ahorro.", "What's left after your monthly bills, times twelve. Without one-time buys or savings.")
        : L(lang, `Sale de lo que te sobra ${worsening ? "este mes" : "en promedio cada mes"}: ${money(perMonth)}.`, `It comes from what's left ${worsening ? "this month" : "on average each month"}: ${money(perMonth)}.`),
      emphasis: true,
    },
  ];
  if (reading.essentialsMonthly > 0) {
    longPoints.push({
      label: L(lang, "Colchón", "Cushion"),
      value: money(emergencyTarget),
      note: L(lang, `${state.settings.emergencyMonths} meses de lo esencial (${money(reading.essentialsMonthly)} al mes: casa, comida, transporte, salud y créditos). Es dinero guardado solo para emergencias: perder el trabajo, una enfermedad, algo que se daña.`, `${state.settings.emergencyMonths} months of essentials (${money(reading.essentialsMonthly)} a month: home, food, transport, health and credit). Money kept only for a shock: a lost job, an illness, something breaking.`),
    });
    longPoints.push({
      label: L(lang, "Ya tienes", "Already saved"),
      value: stock > 0 ? money(stock) : L(lang, "Nada", "Nothing"),
      note: stock > 0
        ? L(lang, "Lo que llevas guardado en tus bolsas de ahorro (Emergencia primero).", "What you've kept in your savings pockets (Emergency first).")
        : L(lang, "Todavía no hay nada en tus bolsas de ahorro. Anota tu saldo y el cálculo se vuelve real.", "Nothing in your savings pockets yet. Enter your balance and this becomes real."),
    });
    if (gapFund > 0) {
      longPoints.push({
        label: L(lang, "Para llenarlo", "To fill it"),
        value: money(gapFund),
        note: monthsToFund
          ? L(lang, `Unos ${monthsToFund} meses si apartas ${money(pace)} al mes.`, `About ${monthsToFund} months if you set aside ${money(pace)} a month.`)
          : L(lang, "Mientras el mes cierre en rojo, el fondo no crece.", "While the month closes in the red, the fund does not grow."),
      });
    } else {
      longPoints.push({
        label: L(lang, "Para llenarlo", "To fill it"),
        value: L(lang, "Listo", "Done"),
        note: L(lang, "Lo que tienes guardado ya cubre esos meses de lo esencial.", "What you've saved already covers those months of essentials."),
      });
    }
  } else {
    longPoints.push({
      label: L(lang, "Colchón", "Cushion"),
      value: "—",
      note: L(lang, "Anota tus gastos de cada mes para saber de qué tamaño debe ser tu colchón.", "Enter your monthly bills to see how big your cushion should be."),
    });
  }
  if (reading.contradiction) {
    longPoints.push({
      label: L(lang, "Bolsas", "Pockets"),
      value: money(reading.pocketAside),
      note: reading.contradiction,
    });
  }
  if (s.savingsFlow > 0) {
    longPoints.push({
      label: L(lang, "Ahorro del mes", "Saved this month"),
      value: money(s.savingsFlow),
      note: s.opportunity < 0
        ? L(lang, "El mes cerró en rojo, así que este ahorro en realidad salió de otro lado. Vale la pena revisar si era el momento de ahorrarlo.", "The month closed in the red, so this saving really came from somewhere else. Worth checking whether it was the right time to save it.")
        : L(lang, "Lo que ya moviste a una categoría de ahorro. No es lo mismo que lo que queda.", "What you already moved to a savings category. It is not the same as what is left."),
    });
  }

  const debtMeterPct = s.debtAllowance > 0 ? Math.max(0, Math.min(100, (s.debt / s.debtAllowance) * 100)) : 0;
  const fundMeterPct = emergencyTarget > 0 ? Math.max(0, Math.min(100, (stock / emergencyTarget) * 100)) : 0;

  const shortCard: AdviceCard = {
    horizon: "short",
    title: L(lang, "Qué pasó", "What happened"),
    lead: reading.headline,
    body: "",
    evidence: spentCaption,
    points: shortPoints,
    meter: reading.outTotal > 0 ? { pct: Math.max(0, Math.min(100, (reading.uniqueMinor / reading.outTotal) * 100)), caption: spentCaption } : null,
  };
  // Loans received: what is still pending (with interest so far) is debt load the month's payments do not show.
  const lt = loanTotals(state);
  if (lt.count) {
    mediumBits.push({
      label: L(lang, "Préstamos recibidos", "Loans received"),
      value: money(lt.left),
      note: L(lang, `Pendiente con interés. Recibiste ${money(lt.borrowed)}, has pagado ${money(lt.paid)} y el interés acumulado va en ${money(lt.interest)}.${s.income > 0 ? ` Equivale a ${pct((lt.left / s.income) * 100)} de un mes de ingreso.` : ""}`,
        `Pending with interest. You received ${money(lt.borrowed)}, have paid ${money(lt.paid)} and interest so far is ${money(lt.interest)}.${s.income > 0 ? ` That is ${pct((lt.left / s.income) * 100)} of a month's income.` : ""}`),
    });
  }
  // 1.3.107: credit cards are revolving loans: balance, utilization (keep it under 30%) and what interest costs a month.
  if (ct.known) {
    const costly = cardsOf(state).map((c) => { const f = cardFigures(state, c); return { c, f, cost: convertMinor(cardMonthlyInterest(c, f.balance), c.currency, state.settings.display, state.settings.rateE4) }; })
      .filter((x) => x.f.known && x.f.balance > 0).sort((a, b) => b.cost - a.cost)[0];
    const util = ct.util;
    const cut = util != null ? toThirty(ct.limited, ct.limit) : 0;
    const utilNote = util == null
      ? L(lang, "Añade el límite de cada tarjeta para ver qué parte de tu crédito usas.", "Add each card's limit to see how much of your credit you use.")
      : util < 0.1 ? L(lang, `Usas el ${pct(util * 100)} de tu crédito: excelente para tu puntaje.`, `You use ${pct(util * 100)} of your credit: excellent for your score.`)
        : util < 0.3 ? L(lang, `Usas el ${pct(util * 100)} de tu crédito: bien, mantenlo bajo 30%.`, `You use ${pct(util * 100)} of your credit: good, keep it under 30%.`)
          : L(lang, `Usas el ${pct(util * 100)} de tu crédito: paga ${money(cut)} para bajar a 30% y cuidar tu puntaje.`, `You use ${pct(util * 100)} of your credit: pay ${money(cut)} to get under 30% and protect your score.`);
    const costNote = costly && costly.cost > 0
      ? L(lang, ` ${costly.c.name} te cuesta ${money(costly.cost)} al mes en intereses${costly.c.aprBps ? "" : " (estimado, sin tasa)"}; págala primero.`, ` ${costly.c.name} costs you ${money(costly.cost)} a month in interest${costly.c.aprBps ? "" : " (estimated, no rate)"}; pay it first.`)
      : "";
    mediumBits.push({
      label: L(lang, "Tarjetas de crédito", "Credit cards"),
      value: money(ct.balance),
      note: `${utilNote}${costNote}${ct.min > 0 ? L(lang, ` Mínimos del mes: ${money(ct.min)}.`, ` This month's minimums: ${money(ct.min)}.`) : ""}`,
      emphasis: util != null && util >= 0.3,
    });
  }
  // 1.3.92: the payoff plan (Libros → Debo → Préstamos) says which loan to pay first and what the order saves.
  const plan = payoffPlan(state);
  if (plan.debts.length > 1 || (plan.debts.length === 1 && plan.chosen)) {
    const ch = plan.chosen;
    const order = plan.order === "avalanche" ? L(lang, "avalancha", "avalanche") : L(lang, "bola de nieve", "snowball");
    const other = plan.order === "avalanche" ? L(lang, "bola de nieve", "snowball") : L(lang, "avalancha", "avalanche");
    mediumBits.push({
      label: L(lang, "Plan de pago", "Payoff plan"),
      value: plan.first ? plan.first.name : "—",
      note: !ch
        ? (plan.budget > 0
          ? L(lang, `Con ${money(plan.budget)} al mes el interés (${money(plan.minBudget)} al mes) va más rápido que tus pagos: sube el abono o pide bajar la tasa.`, `With ${money(plan.budget)} a month, interest (${money(plan.minBudget)} a month) outruns your payments: pay more or ask for a lower rate.`)
          : L(lang, "Pon en Libros → Debo → Préstamos cuánto puedes pagar al mes y verás qué préstamo pagar primero.", "Set in Books → I owe → Loans what you can pay a month to see which loan to pay first."))
        : L(lang, `Paga primero ${plan.first?.name ?? ""} (${order})${plan.first && plan.perPayOf[plan.first.id] ? `: ${money(plan.perPayOf[plan.first.id])} de cada pago de ${money(plan.perPay)} ${cadenceLabel(plan.cadence, "es").toLowerCase()}` : ""}. Con ${money(plan.budget)} al mes quedas libre en ${ch.months} ${ch.months === 1 ? "mes" : "meses"} y pagas ${money(ch.interest)} de interés.${plan.debts.some((d) => d.aprGuess) ? " Es un estimado: añade la tasa de cada tarjeta." : ""}${plan.saveInterest > 0 ? ` Eso ahorra ${money(plan.saveInterest)} frente a ${other}.` : plan.saveInterest < 0 ? ` La ${other} ahorraría ${money(-plan.saveInterest)}.` : ""}`,
          `Pay ${plan.first?.name ?? ""} first (${order})${plan.first && plan.perPayOf[plan.first.id] ? `: ${money(plan.perPayOf[plan.first.id])} of each ${money(plan.perPay)} payment, ${cadenceLabel(plan.cadence, "en").toLowerCase()}` : ""}.${plan.debts.some((d) => d.aprGuess) ? " This is an estimate: add each card's rate." : ""} With ${money(plan.budget)} a month you are debt-free in ${ch.months} ${ch.months === 1 ? "month" : "months"} and pay ${money(ch.interest)} in interest.${plan.saveInterest > 0 ? ` That saves ${money(plan.saveInterest)} versus ${other}.` : plan.saveInterest < 0 ? ` ${other} would save ${money(-plan.saveInterest)}.` : ""}`),
    });
  }
  // 1.3.109: card rewards are money the user has (an asset, not a smaller debt): say how much and where to use it.
  const rwt = rewardsTotals(state);
  if (rwt.total > 0) {
    const costly = cardsOf(state).map((c) => ({ c, f: cardFigures(state, c) })).filter((x) => x.f.known && x.f.balance > 0)
      .sort((a, b) => (b.c.aprBps || 2400) - (a.c.aprBps || 2400))[0];
    const per = rwt.rows.filter((r) => r.minor > 0).map((r) => `${r.card.name} ${money(r.view)}`).join(", ");
    mediumBits.push({
      label: L(lang, "Recompensas de tarjetas", "Card rewards"),
      value: money(rwt.total),
      note: costly
        ? L(lang, `Tienes ${money(rwt.total)} en recompensas (${per}). Canjéalas como crédito a ${costly.c.name}${costly.c.aprBps ? ", la de tasa más alta" : ""}: bajan una deuda que cobra interés.`, `You have ${money(rwt.total)} in rewards (${per}). Redeem them as a statement credit on ${costly.c.name}${costly.c.aprBps ? ", the highest rate" : ""}: they lower a debt that charges interest.`)
        : L(lang, `Tienes ${money(rwt.total)} en recompensas (${per}). Puedes depositarlas a tu banco: entran como ingreso.`, `You have ${money(rwt.total)} in rewards (${per}). You can deposit them to your bank: they come in as income.`),
    });
  }
  const owedNow = lentTotals(state);
  if (owedNow.count || rwt.total > 0) {
    const net = owedNow.left + rwt.total - lt.left - ct.balance;
    mediumBits.push({
      label: L(lang, "Balance neto", "Net balance"),
      value: `${net < 0 ? "−" : net > 0 ? "+" : ""}${money(Math.abs(net))}`,
      note: L(lang, `Te deben ${money(owedNow.left)}${rwt.total > 0 ? `, tus tarjetas guardan ${money(rwt.total)} en recompensas` : ""}${lt.count ? ` y debes ${money(lt.left)} en préstamos` : ""}${ct.known ? ` y ${money(ct.balance)} en tarjetas` : ""}. Lo que te deben no es dinero hasta que llega: no lo cuentes para pagar.`, `You are owed ${money(owedNow.left)}${rwt.total > 0 ? `, your cards hold ${money(rwt.total)} in rewards` : ""}${lt.count ? ` and owe ${money(lt.left)} in loans` : ""}${ct.known ? ` and ${money(ct.balance)} on cards` : ""}. Money owed to you is not money until it arrives: do not count on it to pay.`),
    });
  }
  const mediumCard: AdviceCard = {
    horizon: "medium",
    title: L(lang, "Cómo va mi crédito", "How is my credit"),
    lead: mediumLead,
    body: "",
    evidence: L(lang, `Cuotas ${money(s.debt)} · Zona cómoda hasta ${money(s.debtAllowance)}${lt.count ? ` · Préstamos ${money(lt.left)}` : ""}${ct.known ? ` · Tarjetas ${money(ct.balance)}` : ""}`, `Payments ${money(s.debt)} · Easy cap ${money(s.debtAllowance)}${lt.count ? ` · Loans ${money(lt.left)}` : ""}${ct.known ? ` · Cards ${money(ct.balance)}` : ""}`),
    points: mediumBits,
    nums: { debt: s.debt, loanLeft: lt.left, loanInterest: lt.interest, pct: s.debtPct ?? 0, green: state.settings.debtGreenPct, yellow: state.settings.debtYellowPct, allowance: s.debtAllowance, income: s.income, cardBal: ct.known ? ct.balance : 0, cardUtil: ct.util ?? -1, cardMin: ct.min },
    meter: s.income > 0 && s.debt > 0 ? { pct: debtMeterPct, caption: L(lang, `Tus cuotas usan el ${pct(s.debtPct)} de lo que entra. La zona cómoda llega a ${state.settings.debtGreenPct}%.`, `Your payments use ${pct(s.debtPct)} of income. The easy zone goes up to ${state.settings.debtGreenPct}%.`) } : null,
  };
  const longCard: AdviceCard = {
    horizon: "long",
    title: L(lang, "Si cada mes fuera así", "Every month like this"),
    lead: longLead,
    body: "",
    evidence: L(lang, `Meses con datos: ${keys.length || (lines.length ? 1 : 0)}. Colchón: ${state.settings.emergencyMonths} meses de tus gastos esenciales.`, `Months with data: ${keys.length || (lines.length ? 1 : 0)}. Cushion: ${state.settings.emergencyMonths} months of your essentials.`),
    points: longPoints,
    nums: { monthly: perMonth, year: yearFigure, target: emergencyTarget, stock, gap: gapFund, months: monthsToFund ?? -1, seen: keys.length || 1, pace },
    meter: emergencyTarget > 0 ? { pct: fundMeterPct, caption: stock >= emergencyTarget ? L(lang, "El fondo anotado ya cubre el colchón.", "The recorded fund already covers the cushion.") : L(lang, `Llevas el ${pct(fundMeterPct)} del colchón.`, `You have ${pct(fundMeterPct)} of the cushion.`) } : null,
  };

  for (const card of [shortCard, mediumCard, longCard]) {
    card.body = [card.lead, ...card.points.map((p) => `${p.label}: ${p.value}. ${p.note}`), card.evidence].filter(Boolean).join("\n");
  }
  return [shortCard, mediumCard, longCard];
}

export function lineLabel(line: Line, names: Namer, lang: Lang): string {
  const cat = names.cat(line.categoryId) || names.purchase(line.categoryId);
  const sub = names.sub(line.subId);
  const store = names.catalog(line.storeId);
  const provider = names.catalog(line.providerId);
  return [line.concept, cat, sub, store, provider, line.note, line.productCode].filter(Boolean).join(" ");
}

export { displayName };
