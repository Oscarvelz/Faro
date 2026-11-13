// 1.3.122 Asesor de esta área (tablet only): what one book/area needs from the Asesor, plus a small chart that adds
// something the book and its comparison pane do not show (six months of the area, a path ahead, upcoming dates).
// Pure and read-only. Money is integer minor units in the view currency; every average is an exact integer division.
import { convertMinor, formatMoney } from "./money.ts";
import { adviceRules, type Rule } from "./rules.ts";
import { readAdvisor } from "./advisor.ts";
import { debtSeries, lentOf, lentState, payoffPlan, simulatePlan, type PlanDebt } from "./debts.ts";
import type { Lang, LedgerState, Line, SectionId } from "./types.ts";

export type AreaId = "income" | "fixed" | "variable" | "shops" | "subs" | "loans" | "owed" | "save" | "meta" | "retiro" | "emergencia" | "remit" | "central" | "spend";

export const AREA_TONE: Record<AreaId, string> = {
  income: "#3fae8c", fixed: "#c98a5a", variable: "#d0a050", shops: "#c27a9a", subs: "#b98a3e", loans: "#c98a3e", owed: "#3fa7b5",
  save: "#894ed6", meta: "#8fb9a6", retiro: "#72b4b2", emergencia: "#7aa2c4", remit: "#e0956f", central: "#8aa4b8", spend: "#d08a3c",
};

const pad = (n: number) => String(n).padStart(2, "0");
export function shiftKey(key: string, delta: number): string {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
/** Integer division rounded half away from zero. */
export function idiv(n: number, d: number): number {
  if (!d) return 0;
  const neg = (n < 0) !== (d < 0);
  const q = Math.floor((Math.abs(Math.trunc(n)) + Math.floor(Math.abs(Math.trunc(d)) / 2)) / Math.abs(Math.trunc(d)));
  return neg ? -q : q;
}
export const roleIn = (state: LedgerState, l: Line) => state.structure.categories.find((c) => c.id === l.categoryId)?.role ?? "";
const view = (state: LedgerState, l: Line) => (l.active && !l.rest ? convertMinor(l.amountMinor, l.currency, state.settings.display, state.settings.rateE4) : 0);

/** Which lines belong to an area's monthly flow (savings pockets by their sub id). */
export function inArea(state: LedgerState, l: Line, area: AreaId): boolean {
  if (!l.active || l.xfer) return false;
  const role = roleIn(state, l);
  switch (area) {
    case "income": return l.kind === "income-fixed" || l.kind === "income-variable";
    case "fixed": return l.kind === "expense-fixed" && role !== "savings";
    case "variable": return l.kind === "expense-variable" && role !== "savings";
    case "shops": return l.kind === "purchase";
    case "subs": return l.kind === "subscription" && role !== "debt";
    case "save": return role === "savings";
    case "meta": return role === "savings" && l.subId.endsWith(".meta");
    case "retiro": return role === "savings" && l.subId.endsWith(".retiro");
    case "emergencia": return role === "savings" && l.subId.endsWith(".emergencia");
    case "spend": return (l.kind === "expense-fixed" || l.kind === "expense-variable" || l.kind === "purchase" || l.kind === "subscription") && role !== "savings";
    case "remit": return (l.kind === "expense-fixed" || l.kind === "expense-variable") && (l.categoryId === "f-remesas" || l.categoryId === "v-remesas" || role === "remittance");
    default: return false;
  }
}

export type MonthBar = { key: string; minor: number };
/** The area's total for each of the last n months (oldest first), ending at `key`. */
export function areaMonths(state: LedgerState, key: string, area: AreaId, n = 6): MonthBar[] {
  const out: MonthBar[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = shiftKey(key, -i);
    out.push({ key: k, minor: (state.months[k]?.lines ?? []).reduce((a, l) => a + (inArea(state, l, area) ? view(state, l) : 0), 0) });
  }
  return out;
}
/** Average of the months before the last one that had anything (exact integer), and how many there were. */
export function priorAverage(bars: MonthBar[]): { avg: number; months: number } {
  const past = bars.slice(0, -1).filter((b) => b.minor > 0);
  return { avg: past.length ? idiv(past.reduce((a, b) => a + b.minor, 0), past.length) : 0, months: past.length };
}

/* ---------- chart models (what the card draws; never a copy of the book or its pane) ---------- */
export type AreaChart =
  | { type: "bars"; bars: MonthBar[]; ref: number; refKind: "avg" | "goal"; unit: "money" | "months10" }
  | { type: "path"; past: { key: string; minor: number }[]; ahead: { key: string; minor: number }[]; target: number; endKey: string }
  | { type: "ticks"; days: number; ticks: { day: number; minor: number; late: boolean; name: string }[] }
  | null;

/** Savings stock of a pocket at the end of month `k` (balance snapshots win over summed deposits, like the Asesor). */
export function pocketStock(state: LedgerState, area: AreaId, k: string): number {
  let stock = 0;
  const snaps = new Map<string, { k: string; l: Line }>();
  for (const [mk, m] of Object.entries(state.months)) {
    if (mk > k) continue;
    for (const l of m.lines) {
      if (!inArea(state, l, area)) continue;
      if (l.balanceMinor !== null && l.balanceMinor !== undefined) {
        const s = l.seriesId || l.id;
        const prev = snaps.get(s);
        if (!prev || prev.k < mk) snaps.set(s, { k: mk, l });
      } else stock += view(state, l);
    }
  }
  for (const { l } of snaps.values()) stock += convertMinor(l.balanceMinor as number, l.balanceCurrency || l.currency, state.settings.display, state.settings.rateE4);
  return stock;
}

/* ---------- the report the card shows ---------- */
export type AreaTone = "good" | "calm" | "warn" | "bad";
export type AreaGo =
  | { kind: "line"; section: SectionId; lineId: string }
  | { kind: "book"; section: SectionId }
  | { kind: "place"; topic: string; screen: string; anchor?: string; fold?: string };
export type AreaItem = { id: string; tone: AreaTone; title: string; kicker: string; num: string; say: string; fill: number; topic: string; go: AreaGo; act: string };
export type AreaReport = { items: AreaItem[]; calm: string; chart: AreaChart; caption: string };
type Namer = { cat: (id: string) => string; sub: (id: string) => string; purchase: (id: string) => string; catalog: (id: string) => string };
export type AreaOptions = { today?: Date; goal?: { monthlyMinor: number; totalMinor: number; years: number } | null };

const BAR_AREAS: AreaId[] = ["income", "fixed", "variable", "shops", "subs", "save", "retiro", "remit", "spend"];
const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/** Exact percent of a over b, rounded half away from zero (null when b is 0). */
export function pctOf(a: number, b: number): number | null {
  return b ? idiv(a * 100, b) : null;
}

/** Chart + caption + calm sentence for an area (no rule needed). Rule items are added by areaReport. */
export function areaPicture(state: LedgerState, key: string, lang: string, area: AreaId, options: AreaOptions = {}, extra: { essentials?: number } = {}): { chart: AreaChart; caption: string; calm: string } {
  const { display, rateE4 } = state.settings;
  const money = (n: number) => formatMoney(n, display, lang as "es" | "en");
  const today = options.today ?? new Date();
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const nm = (es: string, en: string) => L(lang, es, en);
  if (BAR_AREAS.includes(area)) {
    const bars = areaMonths(state, key, area, 6);
    const { avg, months } = priorAverage(bars);
    const now = bars[bars.length - 1]!.minor;
    const word = ({ income: nm("Ingresos", "Income"), fixed: nm("Fijos", "Fixed"), variable: nm("Variables", "Variable"), shops: nm("Compras", "Purchases"), subs: nm("Cuotas", "Plans"), save: nm("lo apartado", "what you set aside"), retiro: nm("Retiro", "Retirement"), remit: nm("Remesas", "Remittances"), spend: nm("lo que sale", "what goes out") } as Record<string, string>)[area]!;
    const caption = months
      ? nm(`Seis meses de ${word}: la barra encendida es este mes; la raya, tu promedio de ${months} ${months === 1 ? "mes" : "meses"} (${money(avg)}).`, `Six months of ${word}: the lit bar is this month; the line, your ${months}-month average (${money(avg)}).`)
      : nm(`Seis meses de ${word}: la barra encendida es este mes. Con más meses anotados aparece tu promedio.`, `Six months of ${word}: the lit bar is this month. With more months recorded your average shows.`);
    const d = now - avg;
    const p = pctOf(Math.abs(d), avg);
    const calm = !now && !months
      ? nm(`Aún no hay nada anotado aquí. Cuando anotes, te digo cómo va contra tus otros meses.`, `Nothing recorded here yet. Once you add some, I'll compare it with your other months.`)
      : !months
        ? nm(`Este mes llevas ${money(now)}. Es tu primer mes con datos aquí; desde el próximo te comparo con tu promedio.`, `This month you're at ${money(now)}. It's your first month with data here; from next month I compare it with your average.`)
        : p !== null && p <= 10
          ? nm(`Nada que vigilar: ${money(now)} este mes, en línea con tu promedio de ${money(avg)}.`, `Nothing to watch: ${money(now)} this month, in line with your ${money(avg)} average.`)
          : nm(`Este mes ${money(now)}, ${p}% ${d > 0 ? "más" : "menos"} que tu promedio de ${money(avg)}.`, `This month ${money(now)}, ${p}% ${d > 0 ? "above" : "below"} your ${money(avg)} average.`);
    return { chart: bars.some((b) => b.minor > 0) ? { type: "bars", bars, ref: avg, refKind: "avg", unit: "money" } : null, caption, calm };
  }
  if (area === "meta") {
    const past = [5, 4, 3, 2, 1, 0].map((i) => ({ key: shiftKey(key, -i), minor: pocketStock(state, "meta", shiftKey(key, -i)) }));
    let put = 0;
    for (let i = 0; i < 3; i++) for (const l of state.months[shiftKey(key, -i)]?.lines ?? []) if (inArea(state, l, "meta")) put += view(state, l);
    const pace = idiv(put, 3);
    const stock = past[past.length - 1]!.minor;
    const target = options.goal?.totalMinor ?? 0;
    const ahead: { key: string; minor: number }[] = [];
    let endKey = "";
    if (target > stock && pace > 0) {
      const need = Math.ceil((target - stock) / pace);
      const n = Math.min(need, 36);
      const step = Math.max(1, Math.ceil(n / 6));
      for (let m = step; m < n; m += step) ahead.push({ key: shiftKey(key, m), minor: stock + pace * m });
      ahead.push({ key: shiftKey(key, n), minor: Math.min(target, stock + pace * n) });
      endKey = shiftKey(key, need);
    }
    const caption = target > 0
      ? (ahead.length ? nm(`Tu Meta en seis meses y, punteado, a dónde llega a ${money(pace)} al mes; la raya es la meta (${money(target)}).`, `Your Goal over six months and, dotted, where it gets at ${money(pace)} a month; the line is the goal (${money(target)}).`)
        : nm(`Tu Meta en seis meses; la raya es la meta (${money(target)}).`, `Your Goal over six months; the line is the goal (${money(target)}).`))
      : nm(`Lo que llevas en Meta, mes a mes.`, `What you have in your Goal, month by month.`);
    const calm = !stock && !pace
      ? nm(`Aún no hay nada en Meta. Lo que apartes aquí cuenta hacia tu meta.`, `Nothing in your Goal yet. What you set aside here counts toward it.`)
      : nm(`Llevas ${money(stock)} y apartas ${money(pace)} al mes (promedio de 3 meses).`, `You have ${money(stock)} and set aside ${money(pace)} a month (3-month average).`);
    return { chart: past.some((q) => q.minor > 0) ? { type: "path", past, ahead, target, endKey } : null, caption, calm };
  }
  if (area === "emergencia") {
    const ess = extra.essentials ?? 0;
    const want = state.settings.emergencyMonths || 3;
    const bars = [5, 4, 3, 2, 1, 0].map((i) => { const k = shiftKey(key, -i); return { key: k, minor: ess > 0 ? Math.floor((pocketStock(state, "emergencia", k) * 10) / ess) : 0 }; });
    const tenths = bars[bars.length - 1]!.minor;
    const txt = (t: number) => new Intl.NumberFormat(lang === "en" ? "en-US" : "es-NI", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(t / 10);
    const caption = nm(`Meses de lo esencial que cubría tu fondo al cierre de cada mes (con lo esencial de hoy); la raya es tu meta de ${want}.`, `Months of essentials your fund covered at each month end (at today's essentials); the line is your ${want}-month goal.`);
    const calm = ess <= 0
      ? nm(`Anota tus gastos fijos y te digo cuántos meses te cubre este fondo.`, `Record your fixed costs and I'll tell you how many months this fund covers.`)
      : nm(`Tu fondo cubre ${txt(tenths)} meses de lo esencial; tu meta son ${want}.`, `Your fund covers ${txt(tenths)} months of essentials; your goal is ${want}.`);
    return { chart: ess > 0 && bars.some((b) => b.minor > 0) ? { type: "bars", bars, ref: want * 10, refKind: "goal", unit: "months10" } : null, caption, calm };
  }
  if (area === "owed") {
    const ticks: { day: number; minor: number; late: boolean; name: string }[] = [];
    const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    for (const l of lentOf(state)) {
      if (l.archived || !l.dueOn) continue;
      const left = convertMinor(lentState(state, l, todayIso).left, l.currency, display, rateE4);
      if (left <= 0) continue;
      const [y, m, d] = l.dueOn.slice(0, 10).split("-").map(Number);
      const day = Math.round((Date.UTC(y!, m! - 1, d!) - t0) / 864e5);
      if (day > 60) continue;
      ticks.push({ day: Math.max(0, day), minor: left, late: day < 0, name: l.person });
    }
    const late = ticks.filter((t) => t.late);
    const caption = (late.length
      ? nm(`Cobros de los próximos 60 días por fecha; la altura es lo que falta. En rojo, los que ya vencieron.`, `Collections due in the next 60 days by date; height is what is left. In red, the ones already past due.`)
      : nm(`Cobros de los próximos 60 días por fecha; la altura es lo que falta.`, `Collections due in the next 60 days by date; height is what is left.`));
    const sum = ticks.reduce((a, t) => a + t.minor, 0);
    const calm = !lentOf(state).length
      ? nm(`Nadie te debe. Cuando prestes, anótalo y te recuerdo cuándo cobrar.`, `Nobody owes you. When you lend, note it and I'll remind you when to collect.`)
      : ticks.length
        ? nm(`${ticks.length} ${ticks.length === 1 ? "cobro" : "cobros"} en 60 días por ${money(sum)}.`, `${ticks.length} ${ticks.length === 1 ? "collection" : "collections"} in 60 days for ${money(sum)}.`)
        : nm(`Ningún cobro con fecha en los próximos 60 días.`, `No dated collection in the next 60 days.`);
    return { chart: ticks.length ? { type: "ticks", days: 60, ticks } : null, caption, calm };
  }
  if (area === "loans") {
    const plan = payoffPlan(state, todayIso);
    const series = debtSeries(state, todayIso, 3);
    const past = series.map((s) => ({ key: s.key, minor: s.owe }));
    const ahead: { key: string; minor: number }[] = [];
    let endKey = "";
    const trace = plan.chosen ? planTrace(plan.debts, plan.budget, plan.order) : [];
    if (trace.length && past.length) {
      const now = past[past.length - 1]!.key;
      const step = Math.max(1, Math.ceil(trace.length / 8));
      for (let m = step; m < trace.length; m += step) ahead.push({ key: shiftKey(now, m), minor: trace[m - 1]! });
      ahead.push({ key: shiftKey(now, trace.length), minor: 0 });
      endKey = shiftKey(now, trace.length);
    }
    const owe = past.length ? past[past.length - 1]!.minor : 0;
    const caption = ahead.length
      ? nm(`Lo que debes en préstamos y tarjetas: tres meses atrás y, punteado, cómo baja con tu plan de pago hasta quedar en cero.`, `What you owe on loans and cards: three months back and, dotted, how it falls with your payoff plan until it reaches zero.`)
      : nm(`Lo que debes en préstamos y tarjetas en los últimos tres meses.`, `What you owe on loans and cards over the last three months.`);
    const calm = owe <= 0
      ? nm(`No debes préstamos ni tarjetas. Si tomas uno, aquí verás cuándo quedas libre.`, `No loans or card balances. If you take one, here you'll see when you're free.`)
      : plan.chosen
        ? nm(`Debes ${money(owe)}; con tu plan quedas libre en ${plan.chosen.months} ${plan.chosen.months === 1 ? "mes" : "meses"}.`, `You owe ${money(owe)}; with your plan you're free in ${plan.chosen.months} ${plan.chosen.months === 1 ? "month" : "months"}.`)
        : nm(`Debes ${money(owe)}. Pon cuánto puedes pagar al mes en el Plan de pago y te digo cuándo quedas libre.`, `You owe ${money(owe)}. Set what you can pay a month in the Payoff plan and I'll tell you when you're free.`);
    return { chart: past.length && owe > 0 ? { type: "path", past, ahead, target: 0, endKey } : null, caption, calm };
  }
  // Central (nothing picked): what was left at the end of each month.
  const bars = [5, 4, 3, 2, 1, 0].map((i) => {
    const k = shiftKey(key, -i);
    let inn = 0, out = 0;
    for (const l of state.months[k]?.lines ?? []) { if (inArea(state, l, "income")) inn += view(state, l); else if (inArea(state, l, "spend")) out += view(state, l); }
    return { key: k, minor: Math.max(0, inn - out) };
  });
  const { avg, months } = priorAverage(bars);
  const now = bars[bars.length - 1]!.minor;
  return {
    chart: bars.some((b) => b.minor > 0) ? { type: "bars", bars, ref: avg, refKind: "avg", unit: "money" } : null,
    caption: nm(`Lo que te quedó cada mes (entra menos sale); la raya es tu promedio${months ? ` de ${months} ${months === 1 ? "mes" : "meses"}` : ""}.`, `What was left each month (in minus out); the line is your average${months ? ` of ${months} ${months === 1 ? "month" : "months"}` : ""}.`),
    calm: nm(`Este mes te queda ${money(now)}${months ? `; tu promedio es ${money(avg)}` : ""}.`, `This month you have ${money(now)} left${months ? `; your average is ${money(avg)}` : ""}.`),
  };
}

/** Total left after each month of the payoff plan (same steps as simulatePlan), for the path ahead. */
export function planTrace(debts: PlanDebt[], budget: number, order: "avalanche" | "snowball", cap = 600): number[] {
  const out: number[] = [];
  if (budget <= 0) return out;
  simulatePlan(debts, budget, order, cap, out);
  return out;
}

/** What the card shows: chart, caption, and at most three findings (worst first) or one calm sentence. */
export function areaReport(state: LedgerState, key: string, lang: string, names: Namer, area: AreaId, options: AreaOptions = {}): AreaReport {
  const essentials = area === "emergencia" ? readAdvisor(state, key, lang as "es" | "en", names, { today: options.today }).essentialsMonthly : 0;
  const pic = areaPicture(state, key, lang, area, options, { essentials });
  const items = areaItems(state, key, lang, names, area, options).slice(0, 3);
  return { items, calm: pic.calm, chart: pic.chart, caption: pic.caption };
}

/* ---------- findings per area, on top of the Asesor rules engine (1.3.117) ---------- */
const AREA_SECTION: Partial<Record<AreaId, SectionId>> = { income: "income", fixed: "fixed", variable: "variable", shops: "shops", subs: "subs" };

/** The savings views a card sits in: [screen, the anchor that lights up there]. */
const OWN_VAULT: Partial<Record<AreaId, [string, string]>> = { save: ["vault-save", "desk-aside"], meta: ["vault-meta", "vault-ledger"], retiro: ["vault-retiro", "vault-ledger"], emergencia: ["vault-emergencia", "vault-ledger"] };

/** Which areas each full-Asesor rule speaks for (category and outlier follow the book of the line they point at). */
function ruleAreas(r: Rule): AreaId[] {
  const sec = r.go.kind === "line" || r.go.kind === "book" ? r.go.section : null;
  switch (r.id) {
    case "pace": return ["variable", "shops", "spend", "central"];
    // A due loan payment speaks for Préstamos; a due Cuota line belongs to Cuotas (Préstamos would point away from itself).
    case "due": return r.go.kind === "place" ? ["loans", "subs", "central"] : ["subs", "central", ...(sec && sec !== "subs" ? [sec as AreaId] : [])];
    case "category": case "outlier": return [...(sec ? [sec as AreaId] : []), "spend"];
    case "recurring": return ["subs", "fixed", "spend"];
    case "goal": return ["meta", "save"];
    case "cushion": return ["emergencia", "save", "central"];
    default: return [];
  }
}

/** The ledger with only this area's spending lines (income kept, so the Asesor's "notable" floor stays the same). */
function scoped(state: LedgerState, area: AreaId): LedgerState {
  const months: LedgerState["months"] = {};
  for (const [k, m] of Object.entries(state.months)) months[k] = { ...m, lines: m.lines.filter((l) => l.kind.startsWith("income") || inArea(state, l, area)) };
  return { ...state, months };
}

function actOf(go: AreaGo, lang: string): string {
  const nm = (es: string, en: string) => L(lang, es, en);
  if (go.kind === "line") return nm("Ver la línea", "See the line");
  const place = go.kind === "book" ? go.section : go.screen.replace("vault-", "");
  const name: Record<string, [string, string]> = { income: ["Ingresos", "Income"], fixed: ["Fijos", "Fixed"], variable: ["Variables", "Variable"], shops: ["Compras", "Purchases"], subs: ["Cuotas", "Plans"], owe: ["Debo", "I owe"], owed: ["Me deben", "Owed to me"], save: ["Ahorros", "Savings"], meta: ["Meta", "Goal"], retiro: ["Retiro", "Retirement"], emergencia: ["Emergencia", "Emergency"] };
  const n = name[place];
  return n ? nm(`Ir a ${n[0]}`, `Go to ${n[1]}`) : nm("Ir allí", "Go there");
}

/** At most three findings for one area, the most important first: the Asesor's own rules that speak for it, then
 *  the area's own checks (exact integer math, same row shape). Nothing true and useful → [] (the card says one calm line). */
export function areaItems(state: LedgerState, key: string, lang: string, names: Namer, area: AreaId, options: AreaOptions = {}): AreaItem[] {
  const today = options.today ?? new Date();
  const lg = lang as Lang;
  const all = adviceRules(state, key, lg, names, { today, goal: options.goal ?? null });
  const out: Rule[] = all.filter((r) => ruleAreas(r).includes(area));
  // A book can have its own rise or odd charge even when another book's is bigger (the full Asesor shows only the biggest).
  if (AREA_SECTION[area] && AREA_SECTION[area] !== "income" && !out.some((r) => r.id === "category" || r.id === "outlier")) {
    for (const r of adviceRules(scoped(state, area), key, lg, names, { today })) if ((r.id === "category" || r.id === "outlier") && !out.some((x) => x.id === r.id)) out.push(r);
  }
  const own = ownItems(state, key, lang, area, today);
  const rank: Record<AreaTone, number> = { bad: 0, warn: 1, calm: 2, good: 3 };
  const items: AreaItem[] = [...out.map((r) => ({ id: r.id, tone: r.tone, title: r.title, kicker: r.kicker, num: r.num, say: r.say, fill: r.fill, topic: r.topic, go: r.go as AreaGo, act: "" })), ...own]
    .sort((a, b) => rank[a.tone] - rank[b.tone]);
  // Same place as the card: an action that only re-opens this book points at the line that matters most instead.
  const here = AREA_SECTION[area];
  const ownVault = OWN_VAULT[area];
  for (const it of items) {
    // Already in this savings view: point at its ledger (it lights up) instead of re-opening the same screen.
    if (ownVault && it.go.kind === "place" && it.go.screen === ownVault[0] && !it.go.anchor) it.go = { ...it.go, anchor: ownVault[1] };
    if (it.go.kind === "book" && here && it.go.section === here) {
      const top = (state.months[key]?.lines ?? []).filter((l) => inArea(state, l, area)).sort((a, b) => view(state, b) - view(state, a))[0];
      if (top) it.go = { kind: "line", section: here, lineId: top.id };
    }
    it.act = actOf(it.go, lang);
  }
  return items.slice(0, 3);
}

/** The area's own checks (things the full Asesor does not single out). */
function ownItems(state: LedgerState, key: string, lang: string, area: AreaId, today: Date): AreaItem[] {
  const { display, rateE4 } = state.settings;
  const other = display === "USD" ? "NIO" : "USD";
  const money = (n: number) => formatMoney(n, display, lang as Lang);
  const both = (n: number) => `${money(n)} (${formatMoney(convertMinor(n, display, other, rateE4), other, lang as Lang)})`;
  const signed = (n: number) => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;
  const nm = (es: string, en: string) => L(lang, es, en);
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const out: AreaItem[] = [];
  const mk = (it: Omit<AreaItem, "act">): AreaItem => ({ ...it, act: "" });
  if (area === "income") {
    const bars = areaMonths(state, key, "income", 6);
    const { avg, months } = priorAverage(bars);
    const now = bars[bars.length - 1]!.minor;
    const d = now - avg;
    const p = pctOf(Math.abs(d), avg);
    if (months >= 2 && p !== null && p >= 10) {
      out.push(mk({ id: "income-steady", tone: d < 0 ? "warn" : "good", title: d < 0 ? nm("Entró menos que de costumbre", "Less came in than usual") : nm("Entró más que de costumbre", "More came in than usual"),
        kicker: nm(`${d < 0 ? "−" : "+"}${p}% vs promedio`, `${d < 0 ? "−" : "+"}${p}% vs average`), num: signed(d),
        say: nm(`Este mes ${both(now)} contra ${money(avg)} de promedio en ${months} meses.${d < 0 ? " Si falta un cobro, anótalo cuando llegue; si no viene, ajusta lo de cada mes." : " Lo de más puede ir a tu ahorro antes de que se gaste."}`, `This month ${both(now)} against a ${money(avg)} average over ${months} months.${d < 0 ? " If a payment is late, add it when it arrives; if it won't come, trim the monthly costs." : " The extra can go to savings before it gets spent."}`),
        fill: avg > 0 ? Math.min(1, now / (avg * 2)) : 0, topic: "aa-ingresos", go: { kind: "book", section: "income" } }));
    }
  }
  if (area === "owed") {
    const late: { name: string; left: number; days: number }[] = [];
    for (const l of lentOf(state)) {
      if (l.archived || !l.dueOn) continue;
      const left = convertMinor(lentState(state, l, todayIso).left, l.currency, display, rateE4);
      if (left > 0 && l.dueOn.slice(0, 10) < todayIso) late.push({ name: l.person, left, days: Math.round((Date.parse(`${todayIso}T12:00:00`) - Date.parse(`${l.dueOn.slice(0, 10)}T12:00:00`)) / 864e5) });
    }
    if (late.length) {
      const sum = late.reduce((a, x) => a + x.left, 0);
      late.sort((a, b) => b.days - a.days);
      out.push(mk({ id: "owed-late", tone: "warn", title: nm("Cobros vencidos", "Overdue collections"), kicker: nm(`${late.length} ${late.length === 1 ? "persona" : "personas"}`, `${late.length} ${late.length === 1 ? "person" : "people"}`), num: money(sum),
        say: nm(`${late.map((x) => `${x.name} ${money(x.left)} (hace ${x.days} ${x.days === 1 ? "día" : "días"})`).slice(0, 3).join(", ")}. En total ${both(sum)}.`, `${late.map((x) => `${x.name} ${money(x.left)} (${x.days} ${x.days === 1 ? "day" : "days"} ago)`).slice(0, 3).join(", ")}. In all ${both(sum)}.`),
        fill: 1, topic: "aa-cobros", go: { kind: "place", topic: "me-deben", screen: "vault-owed", anchor: "debt-owed" } }));
    }
  }
  if (area === "loans") {
    const plan = payoffPlan(state, todayIso);
    if (plan.debts.length) {
      if (plan.chosen) {
        const end = shiftKey(`${today.getFullYear()}-${pad(today.getMonth() + 1)}`, plan.chosen.months);
        const when = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short", year: "numeric" }).format(new Date(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, 1)).replace(".", "").replace(" de ", " ");
        const first = plan.first;
        out.push(mk({ id: "loans-plan", tone: "calm", title: nm("Libre de deudas", "Debt-free"), kicker: nm(`interés ${money(plan.chosen.interest)}`, `interest ${money(plan.chosen.interest)}`), num: when,
          say: nm(`Pagando ${money(plan.perPay)} ${plan.cadence === "monthly" ? "al mes" : "por pago"}, terminas en ${plan.chosen.months} ${plan.chosen.months === 1 ? "mes" : "meses"}${first ? `; primero ${first.name}` : ""}. Interés por pagar: ${both(plan.chosen.interest)}.`, `Paying ${money(plan.perPay)} ${plan.cadence === "monthly" ? "a month" : "per payment"}, you finish in ${plan.chosen.months} ${plan.chosen.months === 1 ? "month" : "months"}${first ? `; ${first.name} first` : ""}. Interest to pay: ${both(plan.chosen.interest)}.`),
          fill: 0, topic: "plan-libre", go: { kind: "place", topic: "plan-pago", screen: "vault-owe", fold: "debt-plan", anchor: "debt-plan" } }));
      } else {
        const owe = plan.debts.reduce((a, d) => a + d.left, 0);
        out.push(mk({ id: "loans-noplan", tone: "warn", title: nm("Sin fecha para salir", "No way out yet"), kicker: nm(`interés ${money(plan.minBudget)} al mes`, `interest ${money(plan.minBudget)} a month`), num: money(owe),
          say: nm(`Debes ${both(owe)} y, a este ritmo de pago, el interés no deja bajar la deuda. Pon en el Plan de pago cuánto puedes pagar y te digo cuándo terminas.`, `You owe ${both(owe)} and, at this pace, interest keeps the debt from falling. Set what you can pay in the Payoff plan and I'll tell you when you finish.`),
          fill: 1, topic: "plan-libre", go: { kind: "place", topic: "plan-pago", screen: "vault-owe", fold: "debt-plan", anchor: "debt-plan" } }));
      }
    }
  }
  if (area === "save") {
    const income = areaMonths(state, key, "income", 1)[0]!.minor;
    const put = areaMonths(state, key, "save", 1)[0]!.minor;
    const goalPct = state.settings.savingsGoalPct || 0;
    if (income > 0 && goalPct > 0) {
      const want = idiv(income * goalPct, 100);
      const pct = idiv(put * 100, income);
      out.push(mk({ id: "save-aside", tone: put >= want ? "good" : put > 0 ? "calm" : "warn", title: nm("Apartado del mes", "Set aside this month"), kicker: nm(`meta ${goalPct}% del ingreso`, `goal ${goalPct}% of income`), num: `${pct}%`,
        say: put >= want ? nm(`Apartaste ${both(put)}, ${pct}% de lo que entró: cumples tu meta de ${goalPct}%.`, `You set aside ${both(put)}, ${pct}% of what came in: you meet your ${goalPct}% goal.`)
          : nm(`Apartaste ${both(put)} (${pct}%). Para tu ${goalPct}% faltan ${money(want - put)} este mes.`, `You set aside ${both(put)} (${pct}%). For your ${goalPct}% you need ${money(want - put)} more this month.`),
        fill: want > 0 ? Math.min(1, put / want) : 0, topic: "aa-apartado", go: { kind: "place", topic: "ahorros", screen: "vault-save" } }));
    }
  }
  if (area === "retiro") {
    const bars = areaMonths(state, key, "retiro", 6);
    const last3 = bars.slice(-3).reduce((a, b) => a + b.minor, 0);
    const before = bars.slice(0, 3).reduce((a, b) => a + b.minor, 0);
    if (!last3 && before > 0) {
      out.push(mk({ id: "retiro-paused", tone: "warn", title: nm("Aportes en pausa", "Contributions paused"), kicker: nm("3 meses sin aporte", "3 months without one"), num: money(0),
        say: nm(`Antes aportabas ${money(idiv(before, 3))} al mes y en los últimos 3 meses nada. Si fue a propósito, está bien; si no, retómalo aunque sea con poco.`, `You used to put ${money(idiv(before, 3))} a month and nothing in the last 3 months. If on purpose, fine; if not, restart even with a little.`),
        fill: 0, topic: "aa-retiro", go: { kind: "place", topic: "retiro", screen: "vault-retiro" } }));
    }
  }
  if (area === "remit") {
    const bars = areaMonths(state, key, "remit", 6);
    const { avg, months } = priorAverage(bars);
    const now = bars[bars.length - 1]!.minor;
    const income = areaMonths(state, key, "income", 1)[0]!.minor;
    const share = income > 0 ? idiv(now * 100, income) : null;
    const d = now - avg;
    const p = pctOf(Math.abs(d), avg);
    if (months >= 2 && p !== null && p >= 20 && d > 0) {
      out.push(mk({ id: "remit-up", tone: "warn", title: nm("Remesas arriba", "Remittances up"), kicker: nm(`+${p}% vs promedio`, `+${p}% vs average`), num: signed(d),
        say: nm(`Este mes mandaste ${both(now)} contra ${money(avg)} de promedio${share !== null ? `; es el ${share}% de lo que entró` : ""}. Un monto fijo al mes ayuda a planear.`, `This month you sent ${both(now)} against a ${money(avg)} average${share !== null ? `; that's ${share}% of what came in` : ""}. A fixed monthly amount helps planning.`),
        fill: avg > 0 ? Math.min(1, now / (avg * 2)) : 0, topic: "aa-remesas", go: remitGo(state, key) }));
    }
  }
  return out;
}

/** Where a Remesas note sends you: this month's biggest remittance line, in its own book (Fijos or Variables). */
function remitGo(state: LedgerState, key: string): AreaGo {
  const top = (state.months[key]?.lines ?? []).filter((l) => inArea(state, l, "remit")).sort((a, b) => view(state, b) - view(state, a))[0];
  if (!top) return { kind: "book", section: "variable" };
  return { kind: "line", section: top.kind === "expense-fixed" ? "fixed" : "variable", lineId: top.id };
}
