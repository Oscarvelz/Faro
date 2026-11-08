// Asesor rules (1.3.117): small, exact checks on the user's own books. Every rule carries the one number that backs it
// (integer minor units, never floats), the help topic that explains that number, and one place to go and act.
// Pure and read-only: it never writes the ledger. No guessing: a rule with too little history says nothing.
import { readAdvisor } from "./advisor.ts";
import { intervalOf, perYear } from "./cadence.ts";
export { perYear };
import { duesWindow } from "./dues.ts";
import { convertMinor, formatMoney, formatRate } from "./money.ts";
import type { Currency, Lang, LedgerState, Line, SectionId } from "./types.ts";

type Namer = { cat: (id: string) => string; sub: (id: string) => string; purchase: (id: string) => string; catalog: (id: string) => string };

export type RuleId = "pace" | "due" | "category" | "outlier" | "recurring" | "goal" | "cushion";
export type RuleTone = "good" | "calm" | "warn" | "bad";
/** Where the one tap goes: a line in its book, a whole book, or a manual-style place (screen + anchor). */
export type RuleGo =
  | { kind: "line"; section: SectionId; lineId: string }
  | { kind: "book"; section: SectionId }
  | { kind: "place"; topic: string; screen: "vault-owe" | "vault-meta" | "vault-emergencia"; anchor?: string; fold?: string };
export type Rule = {
  id: RuleId;
  tone: RuleTone;
  /** Short row title (fits one line at 360 px / root 20 px). */
  title: string;
  /** Small caps label under the title: what the number is measured against. */
  kicker: string;
  /** The backing number, already formatted ("+$45.00", "12 días", "2,4 meses", "jun 2028"). */
  num: string;
  /** One plain sentence with the figures behind the number; money also shown in the other currency. */
  say: string;
  /** 0..1 fill of the row's bar (its reference is said in the help topic). */
  fill: number;
  /** Help topic for the number's (?). */
  topic: string;
  go: RuleGo;
  /** Exact values the tests check (minor units, days, months×10). */
  v: Record<string, number | string>;
};
export type RuleGoal = { monthlyMinor: number; totalMinor: number; years: number };
export type RuleOptions = { today?: Date; goal?: RuleGoal | null };

const L = (lang: Lang, es: string, en: string) => (lang === "en" ? en : es);
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function shiftKey(key: string, delta: number): string {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthsBetween(a: string, b: string): number {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
}
/** Integer division rounded half away from zero (exact for safe integers). */
export function divRound(n: number, d: number): number {
  if (!d) return 0;
  const neg = (n < 0) !== (d < 0);
  const an = Math.abs(Math.trunc(n));
  const ad = Math.abs(Math.trunc(d));
  const q = Math.floor((an + Math.floor(ad / 2)) / ad);
  return neg ? -q : q;
}
/** Middle value of integers (even count: the lower of the two middles' rounded mean, so it never overstates). */
export function medianInt(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return 0;
  const m = v.length >> 1;
  return v.length % 2 ? v[m]! : Math.floor((v[m - 1]! + v[m]!) / 2);
}
/** How many months one payment covers (1 for anything that repeats within a month). */
function periodMonths(cadence: string): number {
  const iv = intervalOf(cadence);
  if (!iv) return 1;
  if (iv.unit === "m") return iv.every;
  if (iv.unit === "y") return iv.every * 12;
  return Math.max(1, Math.floor(iv.every / 30));
}
function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}
function sectionOf(kind: Line["kind"]): SectionId {
  if (kind.startsWith("income")) return "income";
  if (kind === "expense-fixed") return "fixed";
  if (kind === "expense-variable") return "variable";
  if (kind === "purchase") return "shops";
  return "subs";
}
const isOut = (state: LedgerState, l: Line) => l.active && !l.xfer && !l.kind.startsWith("income") && roleOf(state, l.categoryId) !== "savings";
const seriesKey = (l: Line) => l.seriesId || `${l.concept.trim().toLowerCase()}|${l.categoryId}`;

/** Every rule that has something true and useful to say about this month, worst first. */
export function adviceRules(state: LedgerState, key: string, lang: Lang, names: Namer, options: RuleOptions = {}): Rule[] {
  const today = options.today ?? new Date();
  const { display, rateE4 } = state.settings;
  const other: Currency = display === "USD" ? "NIO" : "USD";
  const view = (l: Line) => (l.active ? convertMinor(l.amountMinor, l.currency, display, rateE4) : 0);
  const money = (n: number) => formatMoney(n, display, lang);
  const both = (n: number) => `${money(n)} (${formatMoney(convertMinor(n, display, other, rateE4), other, lang)})`;
  const signed = (n: number) => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;
  const lineName = (l: Line) => l.concept || names.sub(l.subId) || names.cat(l.categoryId) || names.purchase(l.categoryId) || "—";
  const catName = (id: string) => names.cat(id) || names.purchase(id) || L(lang, "Otros", "Other");
  const fmtDay = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00`)).replace(".", "");
  const fmtMonth = (k: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short", year: "numeric" }).format(new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1)).replace(".", "").replace(" de ", " ");
  const lines = state.months[key]?.lines ?? [];
  const reading = readAdvisor(state, key, lang, names, { today });
  const income = reading.income;
  // A figure only counts as "notable" past 3% of income and never under US$20 (in the view currency).
  const floor = Math.max(display === "USD" ? 2000 : convertMinor(2000, "USD", display, rateE4), divRound(income * 3, 100));
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const current = key === todayKey;
  const rules: Rule[] = [];

  /* 1. Pace: at this month's day-to-day pace, how many days the money that is left lasts. */
  if (current && income > 0) {
    const day = today.getDate();
    const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysLeft = dim - day;
    const todayIso = isoOf(today);
    const daily = lines.filter((l) => isOut(state, l) && (l.kind === "expense-variable" || l.kind === "purchase") && roleOf(state, l.categoryId) !== "debt" && (!l.bookedOn || l.bookedOn.slice(0, 10) <= todayIso));
    const spent = daily.reduce((a, l) => a + view(l), 0);
    const left = reading.left;
    if (daysLeft > 0 && spent > 0) {
      const perDay = divRound(spent, day);
      const covered = left > 0 ? Math.floor((left * day) / spent) : 0;
      const atEnd = left - divRound(spent * daysLeft, day);
      const enough = covered >= daysLeft;
      const runOut = isoOf(new Date(today.getFullYear(), today.getMonth(), day + covered));
      rules.push({
        id: "pace",
        tone: left <= 0 ? "bad" : enough ? "good" : "warn",
        title: L(lang, "Ritmo del mes", "Month's pace"),
        kicker: L(lang, `${money(perDay)} al día`, `${money(perDay)} a day`),
        num: enough ? signed(atEnd) : L(lang, `${covered} ${covered === 1 ? "día" : "días"}`, `${covered} ${covered === 1 ? "day" : "days"}`),
        say: left <= 0
          ? L(lang, `Ya no queda para el día a día: faltan ${both(-left)} y quedan ${daysLeft} días del mes.`, `Nothing is left for daily spending: ${both(-left)} short with ${daysLeft} days to go.`)
          : enough
            ? L(lang, `Al ritmo de ${money(perDay)} al día, lo que queda alcanza y cierras el mes con ${both(atEnd)}.`, `At ${money(perDay)} a day, what is left lasts and you close the month with ${both(atEnd)}.`)
            : L(lang, `Al ritmo de ${money(perDay)} al día, lo que queda, ${both(left)}, se acaba el ${fmtDay(runOut)}: ${daysLeft - covered} días antes del cierre.`, `At ${money(perDay)} a day, what is left, ${both(left)}, runs out on ${fmtDay(runOut)}: ${daysLeft - covered} days before month end.`),
        fill: left <= 0 ? 0 : Math.min(1, covered / daysLeft),
        topic: "regla-ritmo",
        go: { kind: "book", section: "variable" },
        v: { spent, perDay, left, covered, daysLeft, atEnd },
      });
    }
  }

  /* 2. Payments due in the next 14 days — from the ONE dues window (dues.ts, 1.3.149): cuotas,
     card minimums and loans with a due day. This rule keeps its old reading of the window: the
     future only (overdue entries belong to book-side's list), money due IN (lent) is not a payment. */
  if (current) {
    const t0 = isoOf(today);
    const t7 = isoOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
    const items: { name: string; minor: number; on: string; go: RuleGo; card: boolean; amtKnown: boolean }[] = [];
    for (const e of duesWindow(state, 14, t0)) {
      if (e.kind === "lent" || e.on < t0) continue;
      const go: RuleGo = e.kind === "card"
        ? { kind: "place", topic: "tarjetas", screen: "vault-owe", fold: "debt-loans", anchor: "debt-cards" }
        : e.kind === "loan"
          ? { kind: "place", topic: "prestamos", screen: "vault-owe", fold: "debt-loans", anchor: "cobros-loans" }
          : { kind: "line", section: sectionOf(e.line!.kind), lineId: e.id };
      items.push({ name: e.line ? lineName(e.line) : e.name, minor: e.amt ?? 0, on: e.on, card: e.kind === "card", go, amtKnown: e.amt != null });
    }
    items.sort((a, b) => a.on.localeCompare(b.on) || b.minor - a.minor);
    if (items.length) {
      const in7 = items.filter((i) => i.on <= t7).reduce((a, i) => a + i.minor, 0);
      const in14 = items.reduce((a, i) => a + i.minor, 0);
      const left = reading.left;
      const list = items.slice(0, 3).map((i) => (i.amtKnown ? `${i.name} ${money(i.minor)} ${L(lang, "el", "on")} ${fmtDay(i.on)}` : `${i.name} ${L(lang, "el", "on")} ${fmtDay(i.on)}`)).join(", ");
      rules.push({
        id: "due",
        tone: income > 0 && in14 > left ? "warn" : "calm",
        title: L(lang, "Pagos en 14 días", "Due in 14 days"),
        kicker: L(lang, `7 días: ${money(in7)}`, `7 days: ${money(in7)}`),
        num: money(in14),
        say: L(lang, in14 > 0 ? `${items.length} ${items.length === 1 ? "pago" : "pagos"} por ${both(in14)}: ${list}${items.length > 3 ? "…" : ""}.` : `${items.length} ${items.length === 1 ? "pago" : "pagos"} con fecha: ${list}${items.length > 3 ? "…" : ""}.`, in14 > 0 ? `${items.length} ${items.length === 1 ? "payment" : "payments"} for ${both(in14)}: ${list}${items.length > 3 ? "…" : ""}.` : `${items.length} ${items.length === 1 ? "payment" : "payments"} with dates: ${list}${items.length > 3 ? "…" : ""}.`).replace("….", "."),
        fill: left > 0 ? Math.min(1, in14 / left) : 1,
        topic: "regla-pagos",
        go: items[0]!.go,
        v: { in7, in14, count: items.length, first: items[0]!.name },
      });
    }
  }

  /* 3. A category above its own average of the last 3 months (needs 2 of those months with data). */
  {
    const prior = [1, 2, 3].map((i) => shiftKey(key, -i)).filter((k) => (state.months[k]?.lines ?? []).some((l) => isOut(state, l) && view(l) > 0));
    if (prior.length >= 2) {
      const byCat = (k: string) => {
        const m = new Map<string, number>();
        for (const l of state.months[k]?.lines ?? []) {
          if (!isOut(state, l) || roleOf(state, l.categoryId) === "debt") continue;
          m.set(l.categoryId || "other", (m.get(l.categoryId || "other") ?? 0) + view(l));
        }
        return m;
      };
      const now = byCat(key);
      const past = prior.map(byCat);
      let best: { id: string; now: number; avg: number; delta: number; pct: number } | null = null;
      let ups = 0;
      for (const [id, n] of now) {
        const avg = divRound(past.reduce((a, m) => a + (m.get(id) ?? 0), 0), prior.length);
        const delta = n - avg;
        if (avg <= 0 || delta * 100 < avg * 25 || delta < floor) continue;
        ups += 1;
        if (!best || delta > best.delta) best = { id, now: n, avg, delta, pct: divRound(delta * 100, avg) };
      }
      if (best) {
        const top = lines.filter((l) => isOut(state, l) && (l.categoryId || "other") === best!.id).sort((a, b) => view(b) - view(a))[0]!;
        const name = catName(best.id);
        rules.push({
          id: "category",
          tone: "warn",
          title: L(lang, `${name} subió`, `${name} went up`),
          kicker: L(lang, `+${best.pct}% vs promedio`, `+${best.pct}% vs average`),
          num: signed(best.delta),
          say: L(lang, `${name}: ${both(best.now)} este mes contra ${money(best.avg)} de promedio en ${prior.length} meses${ups > 1 ? `; ${ups - 1} categoría${ups > 2 ? "s" : ""} más también subió` : ""}. Lo que más pesó: ${lineName(top)} (${money(view(top))}).`, `${name}: ${both(best.now)} this month against a ${money(best.avg)} average over ${prior.length} months${ups > 1 ? `; ${ups - 1} more ${ups > 2 ? "categories" : "category"} also rose` : ""}. The heaviest line: ${lineName(top)} (${money(view(top))}).`),
          fill: Math.min(1, best.now / (best.avg * 2)),
          topic: "regla-categoria",
          go: { kind: "line", section: sectionOf(top.kind), lineId: top.id },
          v: { cat: best.id, now: best.now, avg: best.avg, delta: best.delta, pct: best.pct, months: prior.length, ups },
        });
      }
    }
  }

  /* 4. One line far above its own usual (median of its last 6 months, at least 2 of them). */
  {
    const hist = new Map<string, number[]>();
    for (let i = 1; i <= 6; i += 1) {
      const per = new Map<string, number>();
      for (const l of state.months[shiftKey(key, -i)]?.lines ?? []) if (isOut(state, l) && roleOf(state, l.categoryId) !== "debt") per.set(seriesKey(l), (per.get(seriesKey(l)) ?? 0) + view(l));
      for (const [s, n] of per) if (n > 0) hist.set(s, [...(hist.get(s) ?? []), n]);
    }
    let best: { line: Line; amount: number; usual: number; excess: number; months: number } | null = null;
    const nowBy = new Map<string, { line: Line; amount: number }>();
    for (const l of lines) {
      if (!isOut(state, l) || roleOf(state, l.categoryId) === "debt") continue;
      const s = seriesKey(l);
      const cur = nowBy.get(s);
      nowBy.set(s, { line: cur && view(cur.line) >= view(l) ? cur.line : l, amount: (cur?.amount ?? 0) + view(l) });
    }
    for (const [s, { line, amount }] of nowBy) {
      const past = hist.get(s) ?? [];
      if (past.length < 2) continue;
      const usual = medianInt(past);
      const excess = amount - usual;
      if (usual <= 0 || amount * 2 < usual * 3 || excess < floor) continue;
      if (!best || excess > best.excess) best = { line, amount, usual, excess, months: past.length };
    }
    if (best) {
      const name = lineName(best.line);
      rules.push({
        id: "outlier",
        tone: "warn",
        title: L(lang, "Fuera de lo normal", "Out of the ordinary"),
        kicker: name,
        num: signed(best.excess),
        say: L(lang, `${name}: ${both(best.amount)} este mes; lo normal son ${money(best.usual)} (mediana de ${best.months} meses). Revisa si es un cobro de más.`, `${name}: ${both(best.amount)} this month; usual is ${money(best.usual)} (median of ${best.months} months). Check it is not an overcharge.`),
        fill: Math.min(1, best.amount / (best.usual * 2)),
        topic: "regla-atipico",
        go: { kind: "line", section: sectionOf(best.line.kind), lineId: best.line.id },
        v: { amount: best.amount, usual: best.usual, excess: best.excess, months: best.months },
      });
    }
  }

  /* 5. Recurring charges (Cuotas, not loan payments): their exact cost per month and per year, by cadence. */
  {
    const last = new Map<string, { line: Line; key: string }>();
    for (let i = 11; i >= 0; i -= 1) {
      const k = shiftKey(key, -i);
      for (const l of state.months[k]?.lines ?? []) {
        if (l.kind !== "subscription" || l.xfer || roleOf(state, l.categoryId) === "debt") continue;
        last.set(seriesKey(l), { line: l, key: k });
      }
    }
    const live = [...last.values()].filter(({ line, key: k }) => line.active && line.amountMinor > 0 && monthsBetween(k, key) < periodMonths(line.cadence || "monthly"));
    if (live.length) {
      const yearOf = (l: Line) => { const [n, d] = perYear(l.cadence || "monthly"); return divRound(convertMinor(l.amountMinor, l.currency, display, rateE4) * n, d); };
      const year = live.reduce((a, { line }) => a + yearOf(line), 0);
      const month = divRound(year, 12);
      const top = [...live].sort((a, b) => yearOf(b.line) - yearOf(a.line))[0]!.line;
      const heavy = income > 0 && month * 100 >= income * 5;
      rules.push({
        id: "recurring",
        tone: heavy ? "warn" : "calm",
        title: L(lang, "Cargos fijos", "Recurring charges"),
        kicker: L(lang, `${money(year)} al año`, `${money(year)} a year`),
        num: money(month),
        say: L(lang, `${live.length} ${live.length === 1 ? "cargo" : "cargos"} cuestan ${both(month)} al mes, ${money(year)} al año. El más caro: ${lineName(top)}, ${money(yearOf(top))} al año.`, `${live.length} ${live.length === 1 ? "charge costs" : "charges cost"} ${both(month)} a month, ${money(year)} a year. The priciest: ${lineName(top)}, ${money(yearOf(top))} a year.`),
        fill: income > 0 ? Math.min(1, (month * 10) / income) : 0,
        topic: "regla-cargos",
        go: { kind: "book", section: "subs" },
        v: { count: live.length, month, year, top: lineName(top) },
      });
    }
  }

  /* 6. Meta: what you really set aside (average of the last 3 months) against your plan, with the date you get there. */
  {
    const goal = options.goal ?? null;
    let stock = 0;
    const snaps = new Map<string, { k: string; l: Line }>();
    for (const [k, m] of Object.entries(state.months)) {
      if (k > key) continue;
      for (const l of m.lines) {
        if (!l.active || roleOf(state, l.categoryId) !== "savings" || !l.subId.endsWith(".meta")) continue;
        if (l.balanceMinor !== null && l.balanceMinor !== undefined) {
          const s = l.seriesId || l.id;
          const prev = snaps.get(s);
          if (!prev || prev.k < k) snaps.set(s, { k, l });
        } else stock += view(l);
      }
    }
    for (const { l } of snaps.values()) stock += convertMinor(l.balanceMinor as number, l.balanceCurrency || l.currency, display, rateE4);
    let put = 0;
    for (let i = 0; i < 3; i += 1) for (const l of state.months[shiftKey(key, -i)]?.lines ?? []) if (l.active && roleOf(state, l.categoryId) === "savings" && l.subId.endsWith(".meta")) put += view(l);
    const pace = divRound(put, 3);
    const target = goal && goal.totalMinor > 0 ? goal.totalMinor : 0;
    if (target > 0 || pace > 0 || stock > 0) {
      const rest = Math.max(0, target - stock);
      const monthsAt = (perMonth: number) => (rest <= 0 ? 0 : perMonth > 0 ? Math.ceil(rest / perMonth) : -1);
      const mine = monthsAt(pace);
      const plan = goal && goal.monthlyMinor > 0 ? monthsAt(goal.monthlyMinor) : -1;
      const when = (m: number) => fmtMonth(shiftKey(todayKey, m));
      const done = target > 0 && rest <= 0;
      const behind = target > 0 && !done && goal && goal.monthlyMinor > 0 && pace < goal.monthlyMinor;
      rules.push({
        id: "goal",
        tone: done ? "good" : target > 0 && pace <= 0 ? "warn" : behind ? "warn" : target > 0 ? "good" : "calm",
        title: L(lang, "Ritmo de tu Meta", "Your Goal's pace"),
        kicker: L(lang, `${money(pace)} al mes`, `${money(pace)} a month`),
        num: done ? L(lang, "Lista", "Done") : target > 0 ? (mine >= 0 ? when(mine) : L(lang, "Sin fecha", "No date")) : money(stock),
        say: !target
          ? L(lang, `Llevas ${both(stock)} en Meta y apartas ${money(pace)} al mes (promedio de 3 meses). Ponle un plan y te digo cuándo llegas.`, `You have ${both(stock)} in your Goal and set aside ${money(pace)} a month (3-month average). Give it a plan and I'll say when you get there.`)
          : done
            ? L(lang, `Ya juntaste ${both(stock)}, más que tu meta de ${money(target)}.`, `You already gathered ${both(stock)}, more than your ${money(target)} goal.`)
            : mine < 0
              ? L(lang, `Llevas ${money(stock)} de ${both(target)} y en 3 meses no apartaste nada: a este ritmo no llegas.${plan >= 0 ? ` Con tu plan de ${money(goal!.monthlyMinor)} al mes llegas en ${when(plan)}.` : ""}`, `You have ${money(stock)} of ${both(target)} and set nothing aside in 3 months: at this pace you won't get there.${plan >= 0 ? ` With your ${money(goal!.monthlyMinor)} a month plan you'd arrive in ${when(plan)}.` : ""}`)
              : L(lang, `Llevas ${money(stock)} de ${both(target)}. Apartando ${money(pace)} al mes llegas en ${when(mine)}${plan >= 0 && plan !== mine ? `; con tu plan de ${money(goal!.monthlyMinor)}, en ${when(plan)}` : ""}.`, `You have ${money(stock)} of ${both(target)}. Setting aside ${money(pace)} a month you arrive in ${when(mine)}${plan >= 0 && plan !== mine ? `; with your ${money(goal!.monthlyMinor)} plan, in ${when(plan)}` : ""}.`),
        fill: target > 0 ? Math.min(1, stock / target) : 0,
        topic: "regla-meta",
        go: { kind: "place", topic: "meta", screen: "vault-meta" },
        v: { stock, pace, target, rest, months: mine, planMonths: plan },
      });
    }
  }

  /* 7. Emergency cushion: months of essential bills your savings cover (tenths, rounded down so it never overstates). */
  if (reading.essentialsMonthly > 0) {
    const ess = reading.essentialsMonthly;
    const stock = reading.cushionStock;
    const want = state.settings.emergencyMonths || 3;
    const tenths = Math.floor((stock * 10) / ess);
    const txt = new Intl.NumberFormat(lang === "en" ? "en-US" : "es-NI", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(tenths / 10);
    rules.push({
      id: "cushion",
      tone: tenths >= want * 10 ? "good" : tenths >= 10 ? "calm" : "warn",
      title: L(lang, "Colchón", "Cushion"),
      kicker: L(lang, `meta ${want} meses`, `goal ${want} months`),
      num: L(lang, `${txt} ${tenths === 10 ? "mes" : "meses"}`, `${txt} ${tenths === 10 ? "month" : "months"}`),
      say: L(lang, `Tienes ${both(stock)} guardado y lo esencial te cuesta ${money(ess)} al mes. ${tenths >= want * 10 ? "Ya cubres tu meta." : `Para ${want} meses te faltan ${money(Math.max(0, ess * want - stock))}.`}`, `You have ${both(stock)} saved and essentials cost ${money(ess)} a month. ${tenths >= want * 10 ? "You already cover your goal." : `For ${want} months you need ${money(Math.max(0, ess * want - stock))} more.`}`),
      fill: Math.min(1, tenths / (want * 10)),
      topic: "regla-colchon",
      go: { kind: "place", topic: "emergencia", screen: "vault-emergencia" },
      v: { stock, ess, tenths, want },
    });
  }

  const rank: Record<RuleTone, number> = { bad: 0, warn: 1, calm: 2, good: 3 };
  const order: RuleId[] = ["pace", "due", "category", "outlier", "recurring", "goal", "cushion"];
  return rules.sort((a, b) => rank[a.tone] - rank[b.tone] || order.indexOf(a.id) - order.indexOf(b.id));
}

/** The rate line under the rules: the same rate Cambio uses for every converted figure. */
export function rateLine(state: LedgerState, lang: Lang): string {
  return L(lang, `Cambio: US$1 = C$${formatRate(state.settings.rateE4)}. Las cifras entre paréntesis usan esta tasa.`, `Exchange: US$1 = C$${formatRate(state.settings.rateE4)}. Figures in brackets use this rate.`);
}
