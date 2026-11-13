// El patrón de ritmo (1.3.248, puerto de la línea Estructura — brief:
// faro-estructura-study/pace-learning-brief.md): the pace judgement learns the
// user's own spending shape instead of assuming money flows evenly through the
// month. Origin: a tester whose payments all leave at the start of the month
// was told by the linear projection that he would close over his income; Oscar
// confirmed the same shape as his own (rent + remittances in the first days)
// and ordered the design: learn the pattern. ONE model, THREE readers — the
// Advisor's pace rule (rules.ts), Central's pace note (coach.ts) and the
// shell's pace notification (via the widget snapshot's `pace` block) all judge
// against this reading, so no surface can tell a different story.
//
// Pure and read-only, like rules.ts. All money is integer minor units in the
// display currency. The shape of a month is built from DATED money only —
// charges in a line's history, else the line's bookedOn/nextDue day — so the
// numerator and the denominator always describe the same money. Lines with
// no date evidence count on neither side. History is the last 6 closed months
// with dated spending; months combine by median, so one freak month cannot
// redraw the pattern. Fewer than 2 closed months = still learning.
//
// La puerta anti-fuga (descanso.ts) cierra también aquí: `isOut` lleva el
// mismo `!rest` de la casa — una línea apartada no dobla la curva aprendida,
// ni en la historia ni en el mes en curso.
import { convertMinor } from "./money.ts";
import { divRound, medianInt } from "./rules.ts";
import type { Lang, LedgerState, Line } from "./types.ts";

const L = (lang: Lang, es: string, en: string) => (lang === "en" ? en : es);
const pad = (n: number) => String(n).padStart(2, "0");

function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}
const isOut = (state: LedgerState, l: Line) => l.active && !l.rest && !l.xfer && !l.kind.startsWith("income") && roleOf(state, l.categoryId) !== "savings";

function shiftKey(key: string, delta: number): string {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function daysIn(key: string): number {
  return new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
}

type Ev = { day: number; minor: number };

/** Dated out-events of one month, in display minor units. */
function monthEvents(state: LedgerState, key: string): Ev[] {
  const { display, rateE4 } = state.settings;
  const evs: Ev[] = [];
  for (const l of state.months[key]?.lines ?? []) {
    if (!isOut(state, l)) continue;
    const charges = (l.history ?? []).filter((c) => c.date.startsWith(key));
    if (charges.length) {
      for (const c of charges) evs.push({ day: Number(c.date.slice(8, 10)), minor: convertMinor(c.amountMinor, c.currency, display, rateE4) });
      continue;
    }
    const dated = l.bookedOn?.startsWith(key) ? l.bookedOn : l.nextDue?.startsWith(key) ? l.nextDue : l.startedOn?.startsWith(key) ? l.startedOn : "";
    if (dated) evs.push({ day: Number(dated.slice(8, 10)), minor: convertMinor(l.amountMinor, l.currency, display, rateE4) });
  }
  return evs.sort((a, b) => a.day - b.day);
}

const totalOf = (evs: Ev[]) => evs.reduce((a, e) => a + e.minor, 0);
/** Cumulative spent by the given fraction (0..1) of that month. */
function cumAt(evs: Ev[], dim: number, frac: number): number {
  let s = 0;
  for (const e of evs) if (e.day / dim <= frac) s += e.minor;
  return s;
}

export type PacePattern = {
  monthsUsed: number;
  typicalTotalMinor: number;
  /** Expected cumulative share (percent of the typical total) by anchor day of the judged month. */
  anchors: { day: number; sharePct: number }[];
};

type History = { key: string; evs: Ev[]; total: number }[];

function historyOf(state: LedgerState, currentKey: string): History {
  const out: History = [];
  for (let i = 1; i <= 6; i++) {
    const key = shiftKey(currentKey, -i);
    const evs = monthEvents(state, key);
    const total = totalOf(evs);
    if (total > 0) out.push({ key, evs, total });
  }
  return out;
}

/** The learned pattern, or null while there is not enough history to stand on (fewer than 2 closed months). */
export function pacePattern(state: LedgerState, currentKey: string): PacePattern | null {
  const hist = historyOf(state, currentKey);
  if (hist.length < 2) return null;
  const dim = daysIn(currentKey);
  const typicalTotalMinor = medianInt(hist.map((h) => h.total));
  const anchors = [3, 7, 12, 15, 20, 25, dim].filter((d, i, a) => d <= dim && a.indexOf(d) === i).map((day) => {
    const frac = day / dim;
    const share = medianInt(hist.map((h) => (h.total > 0 ? divRound(cumAt(h.evs, daysIn(h.key), frac) * 100, h.total) : 0)));
    return { day, sharePct: share };
  });
  return { monthsUsed: hist.length, typicalTotalMinor, anchors };
}

export type PaceVerdict = "under" | "on" | "over";
export type PaceReading = {
  status: "learning" | "ready";
  monthsUsed: number;
  spentMinor: number;
  expectedMinor: number;
  deltaMinor: number;
  projectedMinor: number;
  typicalTotalMinor: number;
  expectedSharePct: number;
  verdict: PaceVerdict | null;
};

/** Judges the current month against the learned pattern. While learning, the
 *  money fields still describe the month, but the verdict is null — no
 *  conclusion is drawn from a pattern that does not exist yet. */
export function paceReading(state: LedgerState, currentKey: string, today: Date): PaceReading {
  const hist = historyOf(state, currentKey);
  const evs = monthEvents(state, currentKey);
  const dim = daysIn(currentKey);
  const frac = Math.min(1, today.getDate() / dim);
  const spentMinor = cumAt(evs, dim, frac);
  const monthsUsed = hist.length;
  if (monthsUsed < 2) {
    return { status: "learning", monthsUsed, spentMinor, expectedMinor: 0, deltaMinor: 0, projectedMinor: 0, typicalTotalMinor: 0, expectedSharePct: 0, verdict: null };
  }
  const expectedMinor = medianInt(hist.map((h) => cumAt(h.evs, daysIn(h.key), frac)));
  const typicalTotalMinor = medianInt(hist.map((h) => h.total));
  const tailMinor = medianInt(hist.map((h) => h.total - cumAt(h.evs, daysIn(h.key), frac)));
  const deltaMinor = spentMinor - expectedMinor;
  // Bands are asymmetric on purpose: declaring "over" needs more evidence
  // than declaring "under" — this judge exists because the old one cried wolf.
  const verdict: PaceVerdict = expectedMinor <= 0 ? "on" : spentMinor * 100 <= expectedMinor * 95 ? "under" : spentMinor * 100 >= expectedMinor * 108 ? "over" : "on";
  return {
    status: "ready",
    monthsUsed,
    spentMinor,
    expectedMinor,
    deltaMinor,
    projectedMinor: spentMinor + tailMinor,
    typicalTotalMinor,
    expectedSharePct: typicalTotalMinor > 0 ? divRound(expectedMinor * 100, typicalTotalMinor) : 0,
    verdict,
  };
}

/** The pace sentence, naming its comparison every time (the brief's
 *  transparency law). `money` formats display minor units. */
export function paceSay(r: PaceReading, lang: Lang, money: (n: number) => string, incomeMinor: number | null): { tone: "good" | "calm" | "warn"; say: string } {
  if (r.status === "learning") {
    return {
      tone: "calm",
      say: L(lang,
        "Todavía estoy aprendiendo tu patrón: cuando cierre otro mes, tu ritmo se juzga contra tus propios meses, no contra el calendario.",
        "I'm still learning your pattern: once another month closes, your pace gets judged against your own months, not against the calendar."),
    };
  }
  const close = incomeMinor && incomeMinor > 0
    ? r.projectedMinor <= incomeMinor
      ? L(lang, `, dentro de tu ingreso de ${money(incomeMinor)}`, `, within your income of ${money(incomeMinor)}`)
      : L(lang, `, sobre tu ingreso de ${money(incomeMinor)}`, `, over your income of ${money(incomeMinor)}`)
    : "";
  if (r.verdict === "under") {
    return {
      tone: "good",
      say: L(lang,
        `Vas en ${money(r.spentMinor)}. Para esta fecha tu patrón suele llevar unos ${money(r.expectedMinor)}: lo fuerte del mes ya salió y vas bajo tu propio ritmo. A ese ritmo cerrarías en unos ${money(r.projectedMinor)}${close}.`,
        `You're at ${money(r.spentMinor)}. By this date your pattern usually has about ${money(r.expectedMinor)} out: the heavy part of the month is behind you and you're under your own pace. At this pace you'd close near ${money(r.projectedMinor)}${close}.`),
    };
  }
  if (r.verdict === "over") {
    return {
      tone: "warn",
      say: L(lang,
        `Vas en ${money(r.spentMinor)} y para esta fecha tu patrón suele llevar unos ${money(r.expectedMinor)}: hay ${money(r.deltaMinor)} por encima de tu ritmo normal. Revisa qué se movió este mes.`,
        `You're at ${money(r.spentMinor)} and by this date your pattern usually has about ${money(r.expectedMinor)} out: that's ${money(r.deltaMinor)} above your normal pace. Check what moved this month.`),
    };
  }
  return {
    tone: "calm",
    say: L(lang,
      `Vas como siempre: para esta fecha tu patrón lleva unos ${money(r.expectedMinor)} y vas en ${money(r.spentMinor)}. Cerrarías en unos ${money(r.projectedMinor)}${close}.`,
      `You're on your usual pace: by this date your pattern has about ${money(r.expectedMinor)} out and you're at ${money(r.spentMinor)}. You'd close near ${money(r.projectedMinor)}${close}.`),
  };
}
