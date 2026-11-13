// Coach: turns one month of the books into plain language and simple pictures.
// Everything here is read-only; it never writes the ledger.
import { readAdvisor, type ReadLine } from "./advisor";
import { savingsPicture } from "./awake";
import { colorFor, cyberize, themeSwatch } from "./colors";
import { convertMinor, formatMoney, formatPct, niceDown } from "./money";
import { cardTotals } from "./cards";
import { perYear } from "./cadence";
import type { Currency, Lang, LedgerState, Line } from "./types";

type Namer = {
  cat: (id: string) => string;
  sub: (id: string) => string;
  purchase: (id: string) => string;
  catalog: (id: string) => string;
};

export type Tone = "good" | "warn" | "bad" | "neutral";
export type BucketId = "needs" | "wants" | "debt" | "save" | "free";
export type Bucket = { id: BucketId; label: string; hint: string; minor: number; pct: number; ideal: number | null; color: string; lineIds: string[] };
export type Cell = { id: string; name: string; color: string; count: number; minor: number; lineIds: string[] };
/** How much each pillar counts toward the 0-100 score (sums to 1). */
export const SCORE_WEIGHTS: Record<string, number> = { spend: 0.3, save: 0.2, debt: 0.2, cushion: 0.2, steady: 0.1 };

export type Pillar = { id: string; label: string; score: number; value: string; note: string; tip: string; tone: Tone };
export type Mover = { id: string; name: string; now: number; before: number; delta: number; color: string };
export type Step = { id: string; title: string; detail: string; impactMinor: number; tone: Tone };
export type Due = { id: string; name: string; minor: number; day: string; inDays: number; /** 1.3.100: a Cuota's library mark ("sub:<id>"), when it has one. */ icon?: string };
export type MonthNet = { key: string; label: string; income: number; expense: number; net: number; rate: number | null; current: boolean };
export type CoachLine = { id: string; name: string; minor: number; category: string; kind: string };

export type Coach = {
  currency: Currency;
  income: number;
  spend: number;
  saved: number;
  left: number;
  score: number;
  scoreLabel: string;
  scoreTone: Tone;
  verdict: string;
  verdictSub: string;
  base100: "income" | "spend";
  buckets: Bucket[];
  per100: Cell[];
  per100Line: string;
  pillars: Pillar[];
  movers: Mover[];
  moversNote: string;
  hasPrior: boolean;
  perDay: number;
  daysInMonth: number;
  coverDays: number | null;
  paceNote: string;
  steps: Step[];
  dues: Due[];
  months: MonthNet[];
  historyNote: string;
  cushionMonths: number | null;
  cushionTarget: number;
  needsMonthly: number;
  lines: CoachLine[];
  glossary: { term: string; plain: string }[];
};

const DAY_PALETTE = { needs: "#7fb2a0", wants: "#e0a35c", debt: "#d0837a", save: "#7fa6cf", free: "#ffd98a" };
/* Tron: the same hues, lit like light lines on the Grid. */
const TRON_PALETTE = { needs: "#2effc4", wants: "#ffa236", debt: "#ff4b3e", save: "#4fa8ff", free: "#ffd84a" };
/* Cyberpunk (línea «Windows», 2026-11-12): NO invented colours — every day tone passes
   through cyberize(), the very transform that lights the category colours in this theme
   (themeSwatch / colorFor). Oscar's law: integrate all the colours instead of inventing
   ones that don't match. The transform lands each bucket in the theme's register on its
   own: needs → neon mint, wants → neon orange, debt → neon red, save → the theme's own
   violet (savings' identity here), free → neon gold. Until now Cyberpunk had NO branch
   and the statistics silently fell back to the day pastels. */
const CYBER_PALETTE = { needs: cyberize(DAY_PALETTE.needs), wants: cyberize(DAY_PALETTE.wants), debt: cyberize(DAY_PALETTE.debt), save: cyberize(DAY_PALETTE.save), free: cyberize(DAY_PALETTE.free) };
const PALETTE = new Proxy(DAY_PALETTE, { get: (t, k: keyof typeof DAY_PALETTE) => { const th = typeof document !== "undefined" ? document.documentElement.dataset.theme : undefined; return (th === "tron" ? TRON_PALETTE : th === "cyberpunk" ? CYBER_PALETTE : t)[k]; } });

function L(lang: Lang, es: string, en: string) {
  return lang === "en" ? en : es;
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function shiftKey(key: string, delta: number) {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}
function viewOf(line: Line, display: Currency, rateE4: number) {
  // La puerta anti-fuga (descanso.ts): una línea que descansa no cuenta, en ninguna lectura.
  if (!line.active || line.rest) return 0;
  return convertMinor(line.amountMinor, line.currency, display, rateE4);
}
function roleOf(state: LedgerState, categoryId: string) {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}
function monthTotals(state: LedgerState, key: string) {
  const { display, rateE4 } = state.settings;
  let income = 0;
  let expense = 0;
  let saved = 0;
  for (const line of state.months[key]?.lines ?? []) {
    const n = viewOf(line, display, rateE4);
    if (!n) continue;
    if (line.kind.startsWith("income")) income += n;
    else if (roleOf(state, line.categoryId) === "savings") saved += n;
    else expense += n;
  }
  return { income, expense, saved };
}

/** Largest-remainder rounding so the cells always add up to exactly 100. */
function toHundred(parts: { minor: number }[], whole: number): number[] {
  if (whole <= 0) return parts.map(() => 0);
  const raw = parts.map((p) => (p.minor / whole) * 100);
  const floor = raw.map((r) => Math.floor(r));
  let rest = 100 - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const item of order) {
    if (rest <= 0) break;
    floor[item.i] += 1;
    rest -= 1;
  }
  return floor;
}

export function readCoach(state: LedgerState, key: string, lang: Lang, names: Namer, today: Date = new Date()): Coach {
  const { display, rateE4, savingsGoalPct, debtGreenPct, debtYellowPct, emergencyMonths } = state.settings;
  const money = (n: number) => formatMoney(n, display, lang);
  const pct = (n: number | null) => formatPct(n, lang);
  const unit = display === "USD" ? "$100" : "C$100";
  const reading = readAdvisor(state, key, lang, names, { today });
  const read: ReadLine[] = reading.lines;
  const income = reading.income;
  const lineById = new Map((state.months[key]?.lines ?? []).map((line) => [line.id, line]));

  const sumOf = (pred: (l: ReadLine) => boolean) => read.filter(pred).reduce((a, l) => a + l.minor, 0);
  const idsOf = (pred: (l: ReadLine) => boolean) => read.filter(pred).map((l) => l.id);
  const isNeed = (l: ReadLine) => l.cls === "essential-fixed" || l.cls === "essential-variable";
  const isWant = (l: ReadLine) => l.cls === "discretionary" || l.cls === "unique";
  const isDebt = (l: ReadLine) => l.cls === "credit";
  const isSave = (l: ReadLine) => l.cls === "transfer";
  const needs = sumOf(isNeed);
  const wants = sumOf(isWant);
  const debt = sumOf(isDebt);
  const saved = sumOf(isSave);
  const spend = needs + wants + debt;
  const left = income - spend - saved;
  const free = Math.max(0, left);
  const base = income > 0 && income >= spend + saved ? income : spend + saved;
  const share = (n: number) => (base > 0 ? (n / base) * 100 : 0);

  const buckets: Bucket[] = [
    { id: "needs", label: L(lang, "Necesidades", "Needs"), hint: L(lang, "Casa, comida, transporte, salud, familia: lo que no se puede dejar de pagar.", "Home, food, transport, health, family: what you can't stop paying."), minor: needs, pct: share(needs), ideal: 50, color: PALETTE.needs, lineIds: idsOf(isNeed) },
    { id: "wants", label: L(lang, "Gustos", "Wants"), hint: L(lang, "Lo que eliges: salidas, compras, plataformas, antojos.", "What you choose: outings, shopping, streaming, treats."), minor: wants, pct: share(wants), ideal: 30, color: PALETTE.wants, lineIds: idsOf(isWant) },
    { id: "debt", label: L(lang, "Deudas", "Debt"), hint: L(lang, "Cuotas de tarjetas y préstamos.", "Card and loan payments."), minor: debt, pct: share(debt), ideal: null, color: PALETTE.debt, lineIds: idsOf(isDebt) },
    { id: "save", label: L(lang, "Ahorro", "Savings"), hint: L(lang, "Lo que mandaste a tus bolsas de ahorro.", "What you moved into your savings pockets."), minor: saved, pct: share(saved), ideal: 20, color: PALETTE.save, lineIds: idsOf(isSave) },
    { id: "free", label: L(lang, "Te queda", "Left over"), hint: L(lang, "Lo que todavía no tiene destino.", "Money that has no job yet."), minor: free, pct: share(free), ideal: null, color: PALETTE.free, lineIds: [] },
  ];

  // Where each 100 goes, by category (top 6, the rest together, then savings and what is left).
  const byCat = new Map<string, Cell>();
  for (const l of read) {
    if (isSave(l)) continue;
    const id = l.categoryId || "other";
    const cell = byCat.get(id) ?? { id, name: l.category, color: colorFor(state.structure, id), count: 0, minor: 0, lineIds: [] };
    cell.minor += l.minor;
    cell.lineIds.push(l.id);
    byCat.set(id, cell);
  }
  const cats = [...byCat.values()].sort((a, b) => b.minor - a.minor);
  const top = cats.slice(0, 6);
  const rest = cats.slice(6);
  const cells: Cell[] = [...top];
  if (rest.length) cells.push({ id: "rest", name: L(lang, "Lo demás", "Everything else"), color: themeSwatch("#8b97a8"), count: 0, minor: rest.reduce((a, c) => a + c.minor, 0), lineIds: rest.flatMap((c) => c.lineIds) });
  if (saved > 0) cells.push({ id: "save", name: L(lang, "Ahorro", "Savings"), color: PALETTE.save, count: 0, minor: saved, lineIds: idsOf(isSave) });
  if (free > 0) cells.push({ id: "free", name: L(lang, "Te queda", "Left over"), color: PALETTE.free, count: 0, minor: free, lineIds: [] });
  const counts = toHundred(cells, base);
  cells.forEach((cell, i) => (cell.count = counts[i] ?? 0));
  const per100 = cells.filter((c) => c.count > 0);
  const base100: Coach["base100"] = income > 0 && income >= spend + saved ? "income" : "spend";
  const firstThree = per100.filter((c) => c.id !== "free").slice(0, 3).map((c) => `${c.count} ${L(lang, "en", "on")} ${c.name.toLowerCase()}`);
  const freeCell = per100.find((c) => c.id === "free");
  const per100Line = base <= 0
    ? L(lang, "Todavía no hay movimientos este mes.", "No movements this month yet.")
    : L(
        lang,
        `De cada ${unit} que ${base100 === "income" ? "entran" : "salen"}: ${firstThree.join(", ")}${freeCell ? ` y te quedan ${freeCell.count}` : ""}.`,
        `Of every ${unit} that ${base100 === "income" ? "comes in" : "goes out"}: ${firstThree.join(", ")}${freeCell ? `, and ${freeCell.count} stay with you` : ""}.`,
      );

  // Savings stock and cushion.
  void savingsPicture;
  const needsMonthly = reading.essentialsMonthly;
  const cushionStock = reading.cushionStock;
  // 1.3.117: tenths rounded DOWN, so 2.96 months never reads "3 de 3" (the goal) when it is not there yet.
  const cushionMonths = needsMonthly > 0 ? Math.floor((cushionStock * 10) / needsMonthly) / 10 : null;
  const tenths = (n: number) => new Intl.NumberFormat(lang === "en" ? "en-US" : "es-NI", { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 1 }).format(n);
  const cushionTarget = emergencyMonths || 3;

  // Pillars, each 0-100.
  const spendPct = income > 0 ? (spend / income) * 100 : null;
  const saveRate = income > 0 ? (saved / income) * 100 : null;
  const debtPct = income > 0 ? (debt / income) * 100 : null;
  const fixedShare = income > 0 ? (Math.min(income, reading.incomeFloor) / income) * 100 : null;
  const tone = (score: number): Tone => (score >= 75 ? "good" : score >= 45 ? "warn" : "bad");
  const pillars: Pillar[] = [];
  {
    // 70% or less is full marks; at 100% it is 40 (tight, not failing); past 100% it falls fast.
    const s = spendPct === null ? 0 : spendPct <= 70 ? 100 : spendPct <= 100 ? 100 - (spendPct - 70) * 2 : clamp(40 - (spendPct - 100) * 4);
    pillars.push({
      id: "spend",
      label: L(lang, "Gasto", "Spending"),
      score: Math.round(s),
      value: spendPct === null ? "—" : L(lang, `${pct(spendPct)} del ingreso`, `${pct(spendPct)} of income`),
      note: spendPct === null
        ? L(lang, "Falta anotar el ingreso para medirlo.", "Income is missing, so it can't be measured.")
        : spendPct <= 70
          ? L(lang, "Gastas bastante menos de lo que entra. Eso te da aire.", "You spend well under what comes in. That gives you room.")
          : spendPct < 100
            ? L(lang, "Alcanza, pero con poco margen para imprevistos.", "It covers, but with little room for surprises.")
            : L(lang, "Sale más de lo que entra. Ese hueco se paga con ahorro o con deuda.", "More goes out than comes in. That gap gets paid with savings or debt."),
      tip: L(lang, "Meta sana: gastar 70% o menos de lo que entra.", "Healthy target: spend 70% or less of what comes in."),
      tone: tone(s),
    });
  }
  {
    const goal = savingsGoalPct > 0 ? savingsGoalPct : 10;
    const s = saveRate === null ? 0 : clamp((saveRate / goal) * 100);
    pillars.push({
      id: "save",
      label: L(lang, "Ahorro", "Saving"),
      score: Math.round(s),
      value: saveRate === null ? "—" : L(lang, `${pct(saveRate)} (meta ${goal}%)`, `${pct(saveRate)} (goal ${goal}%)`),
      note: saved <= 0
        ? L(lang, "Este mes no mandaste nada a tus bolsas de ahorro.", "Nothing went into your savings pockets this month.")
        : s >= 100
          ? L(lang, "Cumpliste tu meta de ahorro. Muy bien.", "You hit your savings goal. Well done.")
          : L(lang, `Vas en ${money(saved)} de ${money(Math.round((income * goal) / 100))}.`, `You're at ${money(saved)} of ${money(Math.round((income * goal) / 100))}.`),
      tip: L(lang, "Ahorra apenas te pagan, no con lo que sobra al final.", "Save as soon as you're paid, not with what's left at the end."),
      tone: tone(s),
    });
  }
  {
    // 1.3.117: with no loan payments, card balances still are debt: their use of the limit scores the pillar (≤30% is healthy).
    const ct = cardTotals(state, `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    const cardsOnly = debt <= 0 && ct.known > 0 && ct.balance > 0;
    let s = 100;
    if (cardsOnly && ct.util != null && ct.util > 0.3) s = clamp(85 - (ct.util - 0.3) * 100, 25);
    else if (cardsOnly && ct.util != null) s = Math.round(100 - ct.util * 50);
    else if (cardsOnly) s = 80;
    if (debtPct !== null && debtPct > debtGreenPct) {
      s = debtPct <= debtYellowPct
        ? 100 - ((debtPct - debtGreenPct) / Math.max(1, debtYellowPct - debtGreenPct)) * 50
        : clamp(50 - ((debtPct - debtYellowPct) / Math.max(1, debtYellowPct * 0.5)) * 50);
    }
    pillars.push({
      id: "debt",
      label: L(lang, "Deudas", "Debt"),
      score: Math.round(s),
      value: cardsOnly
        ? L(lang, `Tarjetas ${money(ct.balance)}`, `Cards ${money(ct.balance)}`)
        : debt <= 0 ? L(lang, "Sin cuotas", "No payments") : L(lang, `${pct(debtPct)} del ingreso`, `${pct(debtPct)} of income`),
      note: cardsOnly
        ? ct.util != null
          ? L(lang, `Sin cuotas de préstamos, pero tus tarjetas usan el ${Math.round(ct.util * 100)}% del límite. ${ct.util > 0.3 ? "Bájalo a 30% o menos." : "Bajo 30% está bien."}`, `No loan payments, but your cards use ${Math.round(ct.util * 100)}% of the limit. ${ct.util > 0.3 ? "Bring it to 30% or less." : "Under 30% is fine."}`)
          : L(lang, `Sin cuotas de préstamos, pero tus tarjetas deben ${money(ct.balance)}. Añade su límite para medir el uso.`, `No loan payments, but your cards owe ${money(ct.balance)}. Add their limit to measure use.`)
        : debt <= 0
        ? L(lang, "No tienes pagos de crédito anotados este mes.", "No credit payments recorded this month.")
        : (debtPct ?? 0) <= debtGreenPct
          ? L(lang, "Tus cuotas están en zona cómoda.", "Your payments are in the comfortable zone.")
          : (debtPct ?? 0) <= debtYellowPct
            ? L(lang, "Las cuotas ya aprietan. Evita sumar deudas nuevas.", "Payments are getting tight. Avoid adding new debt.")
            : L(lang, "Las deudas se llevan demasiado. Ataca primero la de tasa más alta.", "Debt takes too much. Attack the highest-rate one first."),
      tip: L(lang, `Zona cómoda: hasta ${debtGreenPct}% de lo que entra.`, `Comfortable zone: up to ${debtGreenPct}% of what comes in.`),
      tone: cardsOnly ? tone(s) : debt <= 0 || (debtPct ?? 0) <= debtGreenPct ? "good" : (debtPct ?? 0) <= debtYellowPct ? "warn" : "bad",
    });
  }
  {
    const s = cushionMonths === null ? 0 : clamp((cushionMonths / cushionTarget) * 100);
    pillars.push({
      id: "cushion",
      label: L(lang, "Colchón", "Cushion"),
      score: Math.round(s),
      value: cushionMonths === null ? "—" : L(lang, `${tenths(cushionMonths)} de ${cushionTarget} meses`, `${tenths(cushionMonths)} of ${cushionTarget} months`),
      note: cushionMonths === null
        ? L(lang, "Anota tus gastos para saber cuánto colchón necesitas.", "Record your bills to know how big a cushion you need.")
        : cushionMonths < 0.25
          ? L(lang, "Si mañana dejara de entrar dinero, no tendrías con qué cubrir ni una semana de lo esencial.", "If money stopped coming in tomorrow, you couldn't cover even a week of essentials.")
          : cushionMonths < 1
            ? L(lang, `Si mañana dejara de entrar dinero, aguantarías unas ${Math.max(1, Math.round(cushionMonths * 4.3))} semanas.`, `If money stopped coming in tomorrow, you'd last about ${Math.max(1, Math.round(cushionMonths * 4.3))} weeks.`)
          : cushionMonths < cushionTarget
            ? L(lang, `Aguantarías unos ${tenths(cushionMonths)} meses sin ingresos.`, `You could last about ${tenths(cushionMonths)} months without income.`)
            : L(lang, "Tu colchón ya cubre la meta. Lo que ahorres de más puede ir a metas.", "Your cushion covers the goal. Extra savings can go to goals."),
      tip: needsMonthly > 0
        ? L(lang, `El colchón es dinero para un golpe: ${cushionTarget} meses de lo esencial (${money(reading.cushionMinor)}).`, `A cushion is money for a shock: ${cushionTarget} months of essentials (${money(reading.cushionMinor)}).`)
        : L(lang, `El colchón es dinero para un golpe: ${cushionTarget} meses de lo esencial.`, `A cushion is money for a shock: ${cushionTarget} months of essentials.`),
      tone: tone(s),
    });
  }
  {
    const s = fixedShare === null ? 0 : clamp((fixedShare / 80) * 100);
    pillars.push({
      id: "steady",
      label: L(lang, "Estabilidad", "Stability"),
      score: Math.round(s),
      value: fixedShare === null ? "—" : L(lang, `${pct(fixedShare)} es seguro`, `${pct(fixedShare)} is steady`),
      note: fixedShare === null
        ? L(lang, "Sin ingresos anotados.", "No income recorded.")
        : fixedShare >= 80
          ? L(lang, "Casi todo lo que entra es fijo: puedes planear con calma.", "Almost all income is steady: you can plan calmly.")
          : reading.incomeFloor > reading.incomeFixed
            ? L(lang, `Tu ingreso cambia, pero en tu peor mes reciente entraron ${money(reading.incomeFloor)}. Planea con esa cifra y lo demás trátalo como extra.`, `Your income varies, but your worst recent month brought ${money(reading.incomeFloor)}. Plan on that figure and treat the rest as extra.`)
            : reading.incomeFloor > 0
              ? L(lang, `${money(reading.incomeFloor)} entran seguros cada mes. Paga lo esencial con eso y trata lo demás como extra.`, `${money(reading.incomeFloor)} comes in for sure each month. Cover essentials with that and treat the rest as extra.`)
              : L(lang, "Todo lo que entra cambia de mes a mes. Con cada pago, aparta primero lo de cada mes.", "Everything you earn varies. With each payment, set aside the monthly bills first."),
      tip: L(lang, "Ingreso seguro: salario o lo que llega casi seguro cada mes.", "Steady income: salary or what arrives almost surely every month."),
      tone: tone(s),
    });
  }
  const weights = SCORE_WEIGHTS;
  const score = income > 0 ? Math.round(pillars.reduce((a, p) => a + p.score * (weights[p.id] ?? 0), 0)) : 0;
  // "On alert" is for months that don't close or debt past the ceiling. A month that fits but
  // has no cushion yet is fragile, not an emergency.
  const inTrouble = (income > 0 && reading.baseSurplus < 0) || (debtPct ?? 0) > debtYellowPct;
  const scoreTone: Tone = income <= 0 ? "neutral" : score >= 75 ? "good" : score >= 45 || !inTrouble ? "warn" : "bad";
  const scoreLabel = income <= 0
    ? L(lang, "Sin datos", "No data")
    : score >= 80
      ? L(lang, "Sólida", "Solid")
      : score >= 65
        ? L(lang, "Bien encaminada", "On track")
        : score >= 45
          ? L(lang, "Por ajustar", "Needs tuning")
          : inTrouble
            ? L(lang, "En alerta", "On alert")
            : L(lang, "Frágil", "Fragile");

  // Verdict in one breath.
  const biggest = cats[0];
  const verdict = income <= 0
    ? L(lang, "Anota lo que te entra este mes y te digo cómo vas.", "Add what comes in this month and I'll tell you how you're doing.")
    : left >= 0
      ? L(lang, `Este mes entran ${money(income)} y te quedan ${money(left)} libres.`, `This month ${money(income)} comes in and ${money(left)} is left free.`)
      : L(lang, `Este mes sale ${money(-left)} más de lo que entra.`, `This month ${money(-left)} more goes out than comes in.`);
  const verdictSub = !biggest || base <= 0
    ? ""
    : L(
        lang,
        `Lo que más pesa es ${biggest.name.toLowerCase()}: ${money(biggest.minor)}, unos ${Math.round(share(biggest.minor))} de cada ${unit}.`,
        `Your heaviest item is ${biggest.name.toLowerCase()}: ${money(biggest.minor)}, about ${Math.round(share(biggest.minor))} of every ${unit}.`,
      );

  // Movers vs previous month, by category.
  const prevKey = shiftKey(key, -1);
  const prevLines = state.months[prevKey]?.lines ?? [];
  const hasPrior = prevLines.some((l) => l.active && !l.rest);
  const prevByCat = new Map<string, number>();
  for (const line of prevLines) {
    if (line.kind.startsWith("income") || roleOf(state, line.categoryId) === "savings") continue;
    const id = line.categoryId || "other";
    prevByCat.set(id, (prevByCat.get(id) ?? 0) + viewOf(line, display, rateE4));
  }
  const catName = (id: string) => names.cat(id) || names.purchase(id) || id;
  const moverIds = new Set([...byCat.keys(), ...prevByCat.keys()]);
  const movers: Mover[] = hasPrior
    ? [...moverIds]
        .map((id) => {
          const now = byCat.get(id)?.minor ?? 0;
          const before = prevByCat.get(id) ?? 0;
          return { id, name: byCat.get(id)?.name ?? catName(id), now, before, delta: now - before, color: colorFor(state.structure, id) };
        })
        .filter((m) => m.delta !== 0)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 6)
    : [];
  const up = movers.filter((m) => m.delta > 0)[0];
  const down = movers.filter((m) => m.delta < 0)[0];
  const moversNote = !hasPrior
    ? L(lang, "Cuando tengas el mes anterior anotado, aquí verás qué subió y qué bajó.", "Once last month is recorded, you'll see here what went up and down.")
    : !movers.length
      ? L(lang, "Gastaste casi igual que el mes pasado.", "You spent about the same as last month.")
      : [
          up ? L(lang, `${up.name} subió ${money(up.delta)}.`, `${up.name} went up ${money(up.delta)}.`) : "",
          down ? L(lang, `${down.name} bajó ${money(-down.delta)}.`, `${down.name} went down ${money(-down.delta)}.`) : "",
        ].filter(Boolean).join(" ");

  // Pace: how many days the income lasts at this month's daily spend.
  const daysInMonth = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate() || 30;
  const perDay = Math.round((spend + saved) / daysInMonth);
  const coverDays = perDay > 0 && income > 0 ? Math.floor(income / perDay) : null;
  const paceNote = coverDays === null
    ? L(lang, "Anota ingresos y gastos para ver tu ritmo.", "Record income and spending to see your pace.")
    : coverDays >= daysInMonth
      ? L(lang, `Gastas en promedio ${money(perDay)} al día. A ese ritmo, lo que entra te alcanza para ${coverDays} días: el mes completo y ${coverDays - daysInMonth} más.`, `You spend about ${money(perDay)} a day. At that pace your income lasts ${coverDays} days: the whole month and ${coverDays - daysInMonth} more.`)
      : L(lang, `Gastas en promedio ${money(perDay)} al día. A ese ritmo, lo que entra se acaba el día ${coverDays} y faltan ${daysInMonth - coverDays} días.`, `You spend about ${money(perDay)} a day. At that pace your income runs out on day ${coverDays}, ${daysInMonth - coverDays} days short.`);

  // Upcoming dated payments.
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dues: Due[] = [];
  const seen = new Set<string>();
  for (const k of [key, shiftKey(key, 1)]) {
    for (const line of state.months[k]?.lines ?? []) {
      if (!line.active || line.rest || line.kind.startsWith("income")) continue;
      const when = (line.nextDue || "").slice(0, 10);
      if (!when) continue;
      const sig = `${line.seriesId || line.id}:${when}`;
      if (seen.has(sig)) continue;
      const day = new Date(`${when}T12:00:00`);
      const inDays = Math.round((day.getTime() - start.getTime()) / 86400000);
      if (inDays < 0 || inDays > 35) continue;
      seen.add(sig);
      dues.push({ id: line.id, name: line.concept || catName(line.categoryId), minor: viewOf(line, display, rateE4), day: when, inDays, ...(line.kind === "subscription" && line.icon?.startsWith("sub:") ? { icon: line.icon } : {}) });
    }
  }
  dues.sort((a, b) => a.inDays - b.inDays);

  // Twelve months ending at this one.
  const months: MonthNet[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const k = shiftKey(key, -i);
    const t = monthTotals(state, k);
    const label = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short" }).format(new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1)).replace(".", "");
    months.push({ key: k, label, income: t.income, expense: t.expense, net: t.income - t.expense - t.saved, rate: t.income > 0 ? (t.saved / t.income) * 100 : null, current: k === key });
  }
  const active = months.filter((m) => m.income > 0 || m.expense > 0);
  const green = active.filter((m) => m.net >= 0).length;
  const historyNote = active.length <= 1
    ? L(lang, "Con cada mes que anotes, esta línea cuenta tu historia.", "Each month you record adds to this story.")
    : L(lang, `De ${active.length} meses anotados, ${green} cerraron a favor.`, `Of ${active.length} recorded months, ${green} closed ahead.`);

  // Steps: the three most useful things to do, with what they are worth.
  const steps: Step[] = [];
  if (income <= 0) {
    steps.push({ id: "income", title: L(lang, "Anota lo que te entra", "Add your income"), detail: L(lang, "Sin el ingreso no puedo decirte cuánto te queda ni si vas bien.", "Without income I can't tell you what's left or how you're doing."), impactMinor: 0, tone: "warn" });
  }
  if (income > 0 && left < 0) {
    const gap = -left;
    const oneOff = read.filter((l) => l.cls === "unique").sort((a, b) => b.minor - a.minor)[0];
    const wantsNow = read.filter((l) => l.cls === "discretionary").sort((a, b) => b.minor - a.minor);
    const wantsTop = wantsNow.slice(0, 3);
    const wantsSum = wantsTop.reduce((a, l) => a + l.minor, 0);
    const bigNeed = read.filter(isNeed).sort((a, b) => b.minor - a.minor)[0];
    const list = (items: ReadLine[]) => items.map((l) => `${l.name} ${money(l.minor)}`).join(", ");
    let detail: string;
    if (oneOff && oneOff.minor >= gap * 0.5) {
      detail = L(lang, `Lo que lo abrió fue ${oneOff.name} (${money(oneOff.minor)}), una compra de una vez: no se repite el mes que viene. Si se puede devolver, el hueco se cierra.`, `What opened it was ${oneOff.name} (${money(oneOff.minor)}), a one-time buy: it won't repeat next month. If it can be returned, the gap closes.`);
    } else if (wantsTop.length && wantsSum >= gap) {
      detail = L(lang, `Cabe en lo que eliges gastar: baja entre ${list(wantsTop)} hasta juntar ${money(gap)}.`, `It fits in what you choose to spend: trim ${list(wantsTop)} until you free ${money(gap)}.`);
    } else if (wantsTop.length) {
      detail = L(lang, `Tus gustos que se repiten (${list(wantsTop)}) suman ${money(wantsSum)}: ayudan, pero no alcanzan. El resto sale de un gasto grande${bigNeed ? ` como ${bigNeed.name} (${money(bigNeed.minor)})` : ""} o de más ingreso.`, `Your repeating wants (${list(wantsTop)}) add up to ${money(wantsSum)}: they help, but aren't enough. The rest has to come from a big bill${bigNeed ? ` like ${bigNeed.name} (${money(bigNeed.minor)})` : ""} or more income.`);
    } else {
      detail = L(lang, `Casi todo es necesario, así que no se cierra recortando gustos. Hay que revisar un gasto grande${bigNeed ? ` como ${bigNeed.name} (${money(bigNeed.minor)})` : ""}, bajar una cuota o subir el ingreso.`, `Almost everything is a need, so trimming wants won't close it. A big bill${bigNeed ? ` like ${bigNeed.name} (${money(bigNeed.minor)})` : ""} has to move, a payment has to come down, or income has to rise.`);
    }
    steps.push({ id: "gap", title: L(lang, `Cierra el hueco de ${money(gap)}`, `Close the ${money(gap)} gap`), detail, impactMinor: gap, tone: "bad" });
  }
  const goalMinor = Math.round((income * (savingsGoalPct || 10)) / 100);
  if (income > 0 && left > 0 && saved < goalMinor) {
    const move = niceDown(Math.min(left, goalMinor - saved), display);
    steps.push({
      id: "save",
      title: L(lang, `Aparta ${money(move)} hoy`, `Save ${money(move)} today`),
      detail: move >= niceDown(goalMinor - saved, display)
        ? L(lang, `Te quedan ${money(left)} sin destino. Si mueves ${money(move)} ahora a tu ahorro, cumples tu meta del ${savingsGoalPct || 10}% y no se van en gastos pequeños.`, `You have ${money(left)} with no job. Move ${money(move)} to savings now and you meet your ${savingsGoalPct || 10}% goal before small spending eats it.`)
        : L(lang, `Es todo lo que queda libre. Tu meta del ${savingsGoalPct || 10}% serían ${money(niceDown(goalMinor, display))}; empezar con lo que sí cabe ya cuenta.`, `It's all that's free. Your ${savingsGoalPct || 10}% goal would be ${money(niceDown(goalMinor, display))}; starting with what fits still counts.`),
      impactMinor: move,
      tone: "good",
    });
  }
  if (cushionMonths !== null && cushionMonths < cushionTarget && needsMonthly > 0) {
    const gap = Math.max(0, Math.round(reading.cushionMinor - cushionStock));
    const monthly = reading.cushionPace;
    const monthsTo = monthly > 0 ? Math.ceil(gap / monthly) : null;
    steps.push({
      id: "cushion",
      title: L(lang, "Arma tu colchón", "Build your cushion"),
      detail: monthsTo
        ? L(lang, `Te faltan ${money(gap)} para cubrir ${cushionTarget} meses de lo esencial. Con ${money(monthly)} al mes lo logras en unos ${monthsTo} meses.`, `You need ${money(gap)} more to cover ${cushionTarget} months of essentials. With ${money(monthly)} a month you'd get there in about ${monthsTo} months.`)
        : L(lang, `Te faltan ${money(gap)} para cubrir ${cushionTarget} meses de lo esencial.`, `You need ${money(gap)} more to cover ${cushionTarget} months of essentials.`),
      impactMinor: gap,
      tone: "warn",
    });
  }
  const wantsRepeat = sumOf((l) => l.cls === "discretionary");
  if (income > 0 && income > 0 && (wantsRepeat / income) * 100 > 35) {
    const target = Math.round(income * 0.3);
    steps.push({
      id: "wants",
      title: L(lang, `Baja los gustos a 30%`, `Bring wants down to 30%`),
      detail: L(lang, `Lo que eliges gastar cada mes se lleva ${Math.round((wantsRepeat / income) * 100)} de cada ${unit}. Llevarlo a 30 de cada ${unit} libera ${money(wantsRepeat - target)} al mes.`, `What you choose to spend each month takes ${Math.round((wantsRepeat / income) * 100)} of every ${unit}. Bringing it to 30 of every ${unit} frees ${money(wantsRepeat - target)} a month.`),
      impactMinor: wantsRepeat - target,
      tone: "warn",
    });
  }
  if (debtPct !== null && debtPct > debtGreenPct) {
    steps.push({
      id: "debt",
      title: L(lang, "Afloja las deudas", "Ease your debt"),
      detail: L(lang, `Las cuotas se llevan ${pct(debtPct)} de lo que entra. No abras crédito nuevo y paga extra a la de tasa más alta.`, `Payments take ${pct(debtPct)} of income. Open no new credit and pay extra on the highest-rate one.`),
      impactMinor: Math.max(0, debt - Math.round((income * debtGreenPct) / 100)),
      tone: "warn",
    });
  }
  // 1.3.117: per month and per year by each Cuota's cadence (a yearly charge is not ×12); loan installments are debt.
  const subs = (state.months[key]?.lines ?? []).filter((l) => l.active && !l.rest && l.kind === "subscription" && roleOf(state, l.categoryId) !== "debt");
  const subsYear = subs.reduce((a, l) => { const [n, d] = perYear(l.cadence || "monthly"); return a + Math.round((viewOf(l, display, rateE4) * n) / d); }, 0);
  const subsMinor = Math.round(subsYear / 12);
  if (subsMinor > 0 && (subs.length >= 3 || (income > 0 && subsMinor >= income * 0.03))) {
    steps.push({
      id: "subs",
      title: L(lang, "Revisa tus suscripciones", "Review subscriptions"),
      detail: L(lang, `Tus ${subs.length} suscripci${subs.length === 1 ? "ón" : "ones"} suman ${money(subsMinor)} al mes, ${money(subsYear)} al año. Cancela la que no usaste este mes.`, `Your ${subs.length} subscription${subs.length === 1 ? "" : "s"} add up to ${money(subsMinor)} a month, ${money(subsYear)} a year. Cancel the one you didn't use this month.`),
      impactMinor: subsMinor,
      tone: "neutral",
    });
  }
  if (reading.vagueName) {
    steps.push({
      id: "vague",
      title: L(lang, `Ponle nombre a «${reading.vagueName}»`, `Name “${reading.vagueName}”`),
      detail: L(lang, `Son ${money(reading.vagueMinor)} y el nombre no dice qué es. Lo que no se nombra no se puede mejorar.`, `It's ${money(reading.vagueMinor)} and the name doesn't say what it is. What isn't named can't be improved.`),
      impactMinor: reading.vagueMinor,
      tone: "neutral",
    });
  }
  if (income > 0 && left >= 0 && saved >= goalMinor && steps.length === 0) {
    steps.push({ id: "keep", title: L(lang, "Sigue así", "Keep it up"), detail: L(lang, "Cubres lo tuyo y cumples tu ahorro. Lo que sobra puede ir a una meta con fecha.", "You cover your bills and meet your savings. What's left can go to a goal with a date."), impactMinor: Math.max(0, left), tone: "good" });
  }

  const lines: CoachLine[] = read.map((l) => ({ id: l.id, name: l.name, minor: l.minor, category: l.category, kind: lineById.get(l.id)?.kind ?? "" }));

  const glossary = [
    { term: L(lang, "Necesidades", "Needs"), plain: buckets[0]!.hint },
    { term: L(lang, "Gustos", "Wants"), plain: buckets[1]!.hint },
    { term: L(lang, "Colchón", "Cushion"), plain: L(lang, "Dinero guardado solo para emergencias: si pierdes el trabajo, te enfermas o se daña algo.", "Money kept only for emergencies: losing a job, getting sick, something breaking.") },
    { term: L(lang, "Ingreso seguro", "Steady income"), plain: L(lang, "Lo que llega casi seguro cada mes, como el salario.", "What arrives almost surely every month, like a salary.") },
    { term: L(lang, "Compra de una vez", "One-time buy"), plain: L(lang, "Algo que no se repite cada mes, como un electrodoméstico.", "Something that doesn't repeat monthly, like an appliance.") },
    { term: L(lang, "Regla 50/30/20", "50/30/20 rule"), plain: L(lang, "Una guía sencilla: 50 de cada 100 a necesidades, 30 a gustos y 20 al ahorro o a pagar deudas.", "A simple guide: 50 of every 100 to needs, 30 to wants, and 20 to savings or paying debt.") },
  ];

  return {
    currency: display,
    income,
    spend,
    saved,
    left,
    score,
    scoreLabel,
    scoreTone,
    verdict,
    verdictSub,
    base100,
    buckets,
    per100,
    per100Line,
    pillars,
    movers,
    moversNote,
    hasPrior,
    perDay,
    daysInMonth,
    coverDays,
    paceNote,
    steps: steps.slice(0, 3),
    dues,
    months,
    historyNote,
    cushionMonths,
    cushionTarget,
    needsMonthly,
    lines,
    glossary,
  };
}
