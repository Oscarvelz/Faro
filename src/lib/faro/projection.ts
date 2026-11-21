/**
 * projection.ts — El saldo proyectado, día a día (mapa §19.1; brief
 * BRIEF-SALDO-PROYECTADO; fallos de Oscar F-P1/F-P2/F-P3, 2026-11-21).
 *
 * La pregunta: «¿llego al día 20?» Una caminata DETERMINISTA, día a
 * día, desde hoy hasta el fin del mes siguiente (F-P1), solo con lo
 * que ya está comprometido en el libro. Sin estado propio: se calcula
 * de lo vivo en cada lectura, como todo el Asesor. Un solo motor para
 * la lectura del Asesor y para la familia de Preguntar (cerca 6).
 *
 * Qué entra, cada cosa con su fuente (S2):
 * - Las CUOTAS: las series anotadas, desde su nextDue caminando por su
 *   cadencia — el MISMO registro de vencimientos que dueAlerts anuncia
 *   y settleAutopay asienta (autopay.ts): prohibido un segundo
 *   registro (cerca 3). La serie con pago automático se marca como tal.
 * - Las TARJETAS: en su dueDay, por el pago del mes pasado a esa
 *   tarjeta (F-P2); si el mes pasado no hubo pago, el último pago que
 *   haya, con su mes dicho; si nunca se ha pagado, el balance completo
 *   — y la línea del evento lo declara.
 * - Los FIJOS INFERIDOS: el patrón que el libro ya muestra (la misma
 *   vara de classify en advisor.ts: marcado por clase o por recurrencia
 *   entre meses), proyectado a su día con su último monto, etiquetado
 *   ESPERADO en su línea (cerca 2). Si el mes ya trae su línea real,
 *   manda la línea.
 * - El INGRESO SEGURO: las líneas income-fixed, por su serie o por su
 *   patrón. El ingreso VARIABLE no entra hasta que se anota (cerca 1).
 *
 * Las dos líneas (S3): el saldo proyectado (las cuentas anfitrionas de
 * funds.ts, caminadas) y el saldo LIBRE proyectado (menos lo apartado
 * del saldo, la partición de savings.ts). El veredicto se lee sobre el
 * libre (cerca 4): llegar solo tocando lo apartado se dice, no se
 * esconde. Sin escenario «como sueles» (F-P3): projectLeft queda fuera
 * de este camino (cerca 5).
 */
import { seriesAutopayConfig } from "./autopay.ts";
import { stepDate } from "./cadence.ts";
import { cardFigures, cardPays, cardsOf } from "./cards.ts";
import { nextDueDayOn } from "./dues.ts";
import { hostAccounts } from "./funds.ts";
import { todayIso } from "./loans.ts";
import { convertMinor, formatMoney } from "./money.ts";
import { dateOf } from "./remit-people.ts";
import { savingsStock } from "./savings.ts";
import type { Currency, Lang, LedgerState, Line } from "./types.ts";

type Namer = {
  cat: (id: string) => string;
  sub: (id: string) => string;
  purchase: (id: string) => string;
  catalog: (id: string) => string;
};

function L(lang: Lang, es: string, en: string): string {
  return lang === "en" ? en : es;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function isoOf(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function parts(isoDay: string): { y: number; m: number; d: number } {
  return { y: Number(isoDay.slice(0, 4)), m: Number(isoDay.slice(5, 7)) - 1, d: Number(isoDay.slice(8, 10)) };
}
function addDays(isoDay: string, days: number): string {
  const { y, m, d } = parts(isoDay);
  const t = new Date(y, m, d + days, 12);
  return isoOf(t.getFullYear(), t.getMonth(), t.getDate());
}
function monthKeyOf(isoDay: string): string {
  return isoDay.slice(0, 7);
}
function shiftKey(key: string, delta: number): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1 + delta;
  const t = new Date(y, m, 1, 12);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`;
}
function monthEnd(key: string): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1;
  const last = new Date(y, m + 1, 0, 12).getDate();
  return `${key}-${pad(last)}`;
}
function norm(value: string): string {
  return value.normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ");
}
function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

export type ProjEventKind = "due" | "card" | "fixed" | "income";
export type ProjEvent = {
  day: string;
  kind: ProjEventKind;
  name: string;
  /** Firmado, en la moneda de vista: entra +, sale −. */
  minor: number;
  /** La fuente, dicha en la línea («de tu patrón de cada mes»…). */
  source: string;
  /** Lo inferido se dice inferido: el patrón proyectado, no una línea. */
  expected: boolean;
  /** La serie cobra sola (pago automático). */
  auto: boolean;
  /** Solo tarjetas: el mes del último pago cuando no fue el mes pasado. */
  basisMonth?: string;
  /** Solo tarjetas: nunca se ha pagado — el monto es el balance entero. */
  neverPaid?: boolean;
};

export type ProjDay = { day: string; balance: number; free: number };

export type Projection = {
  /** Hay cuentas anfitrionas con saldo de donde caminar. */
  hasBase: boolean;
  startMinor: number;
  pledgedMinor: number;
  horizonEnd: string;
  monthEnd: string;
  events: ProjEvent[];
  days: ProjDay[];
  tightest: { day: string; free: number; balance: number; cause: string } | null;
  firstFreeNegative: string | null;
  firstBalanceNegative: string | null;
  endBalance: number;
  endFree: number;
  monthEndBalance: number;
  monthEndFree: number;
  currency: Currency;
};

export type ProjectionReading = Projection & {
  verdict: string;
  tightestText: string | null;
};

const WALK_STEP_CAP = 400;

function dayBalance(days: ProjDay[], day: string): ProjDay | null {
  return days.find((d) => d.day === day) ?? null;
}

/** El saldo (y lo libre) al cierre de un día del camino; un día fuera
 * del camino lee el extremo más cercano, dicho por el llamante. */
export function freeAt(p: Projection, day: string): { balance: number; free: number } | null {
  const hit = dayBalance(p.days, day);
  if (hit) return { balance: hit.balance, free: hit.free };
  if (p.days.length && day > p.horizonEnd) return { balance: p.endBalance, free: p.endFree };
  return null;
}

/** La caminata pura: datos, sin palabras. Las palabras viven en
 * readProjection, para que Preguntar y la tarjeta lean la misma verdad. */
export function projectWalk(state: LedgerState, today: string = todayIso()): Projection {
  const { display, rateE4 } = state.settings;
  const view = (minor: number, currency: Currency) => convertMinor(minor, currency, display, rateE4);
  const key = monthKeyOf(today);
  const stock = savingsStock(state, key);
  const hosts = hostAccounts(state, key, stock);
  const startMinor = hosts.reduce((a, h) => a + h.minor, 0);
  const pledgedMinor = stock.pledged;
  const horizonEnd = monthEnd(shiftKey(key, 1));
  const thisMonthEnd = monthEnd(key);
  const events: ProjEvent[] = [];
  const push = (e: ProjEvent) => {
    if (e.day >= today && e.day <= horizonEnd && e.minor !== 0) events.push(e);
  };

  // ── (a) Las cuotas: las series anotadas, desde su nextDue ────────
  // El mismo dominio que duesWindow anuncia (sus filtros, su
  // deduplicación por serie): la instancia viva de cada serie es la de
  // nextDue mayor. Lo vencido entra HOY (es lo pendiente); lo futuro
  // camina por la cadencia de la serie.
  const seriesLive = new Map<string, Line>();
  const seriesInstances = new Map<string, Line[]>();
  for (const bucket of Object.values(state.months)) {
    for (const l of bucket.lines) {
      if (!l.active || l.rest || l.xfer || l.kind.startsWith("income")) continue;
      if (roleOf(state, l.categoryId) === "savings") continue;
      if (l.loanId || l.cardId || l.lentId) continue;
      const on = (l.nextDue || "").slice(0, 10);
      if (!ISO_DAY.test(on)) continue;
      const sid = l.seriesId || l.id;
      const list = seriesInstances.get(sid) ?? [];
      list.push(l);
      seriesInstances.set(sid, list);
      const prev = seriesLive.get(sid);
      if (!prev || on > (prev.nextDue || "").slice(0, 10)) seriesLive.set(sid, l);
    }
  }
  const walkedSeries = new Set<string>();
  for (const [sid, line] of seriesLive) {
    walkedSeries.add(sid);
    const auto = seriesAutopayConfig(seriesInstances.get(sid) ?? [])?.on ?? false;
    const name = (line.concept || "").trim() || "—";
    const minor = -view(line.amountMinor, line.currency);
    const anchorDay = parts((line.nextDue || "").slice(0, 10)).d;
    let d = (line.nextDue || "").slice(0, 10);
    if (d < today) {
      push({ day: today, kind: "due", name, minor, source: "", expected: false, auto });
      // La siguiente ocurrencia futura: caminar desde el nextDue
      // saltando lo ya pasado, sin duplicar lo pendiente de hoy.
      let steps = 0;
      while (d <= today && steps < WALK_STEP_CAP) {
        const next = stepDate(d, line.cadence, anchorDay);
        if (next <= d) break;
        d = next;
        steps += 1;
      }
      if (d > today) push({ day: d, kind: "due", name, minor, source: "", expected: false, auto });
    } else {
      push({ day: d, kind: "due", name, minor, source: "", expected: false, auto });
    }
    let steps = 0;
    while (steps < WALK_STEP_CAP) {
      const next = stepDate(d, line.cadence, anchorDay);
      if (next <= d || next > horizonEnd) break;
      d = next;
      push({ day: d, kind: "due", name, minor, source: "", expected: false, auto });
      steps += 1;
    }
  }

  // ── (b) Las tarjetas: su dueDay, por el pago del mes pasado (F-P2) ─
  for (const card of cardsOf(state)) {
    const f = cardFigures(state, card, today);
    if (!f.known || f.balance <= 0 || !f.dueOn) continue;
    const balView = view(f.balance, card.currency);
    // cardPays ya es la verdad de la casa: los pagos son transferencias
    // inactivas con cardId — filtrar por active los borraría del camino.
    const pays = cardPays(state, card.id)
      .map((l) => ({ line: l, date: dateOf(l, l.monthKey) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    let d = f.dueOn;
    let guard = 0;
    while (d <= horizonEnd && guard < 4) {
      guard += 1;
      const dueMonth = monthKeyOf(d);
      const prevKey = shiftKey(dueMonth, -1);
      const lastMonth = pays.filter((p) => monthKeyOf(p.date) === prevKey);
      let minor: number;
      let basis: "last" | "older" | "never";
      let basisMonth = "";
      if (lastMonth.length) {
        minor = lastMonth.reduce((a, p) => a + view(p.line.amountMinor, p.line.currency), 0);
        basis = "last";
      } else if (pays.length) {
        const latest = pays[pays.length - 1]!;
        const itsMonth = monthKeyOf(latest.date);
        minor = pays.filter((p) => monthKeyOf(p.date) === itsMonth).reduce((a, p) => a + view(p.line.amountMinor, p.line.currency), 0);
        basis = "older";
        basisMonth = itsMonth;
      } else {
        minor = balView;
        basis = "never";
      }
      minor = Math.min(minor, balView);
      push({
        day: d < today ? today : d, kind: "card", name: card.name, minor: -minor, source: "",
        expected: false, auto: false,
        ...(basis === "older" ? { basisMonth } : {}), ...(basis === "never" ? { neverPaid: true } : {}),
      });
      const next = nextDueDayOn(card.dueDay, addDays(d, 1));
      if (!next || next <= d) break;
      d = next;
    }
  }

  // ── (c) Los patrones: fijos inferidos e ingreso seguro ───────────
  // La identidad de la casa (la de seenIn en advisor.ts): la serie, o
  // el concepto normalizado en su categoría y su sub. La vara de
  // classify: marcado por clase (expense-fixed, subscription,
  // recurring) o presente en dos o más meses.
  type Occ = { line: Line; date: string };
  const groups = new Map<string, Occ[]>();
  for (const [mk, bucket] of Object.entries(state.months)) {
    for (const l of bucket.lines) {
      if (!l.active || l.rest || l.xfer) continue;
      if (l.loanId || l.cardId || l.lentId) continue;
      // Una foto de saldo no es un flujo: ya está en el saldo de partida.
      if (typeof l.balanceMinor === "number" && Number.isFinite(l.balanceMinor)) continue;
      // Lo de las bolsas y las cuentas se lee en la partición, no aquí.
      if (roleOf(state, l.categoryId) === "savings") continue;
      const id = l.seriesId ? `s:${l.seriesId}` : `c:${norm(l.concept)}|${l.categoryId}|${l.subId}`;
      const list = groups.get(id) ?? [];
      list.push({ line: l, date: dateOf(l, mk) });
      groups.set(id, list);
    }
  }
  const horizonMonths = [key, shiftKey(key, 1)];
  for (const occs of groups.values()) {
    const sorted = [...occs].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1]!;
    const line = latest.line;
    const isIncome = line.kind.startsWith("income");
    if (isIncome && line.kind !== "income-fixed") continue; // lo variable no entra (cerca 1)
    if (!isIncome) {
      if (roleOf(state, line.categoryId) === "savings") continue;
      if (line.seriesId && walkedSeries.has(line.seriesId)) continue; // ya camina por su nextDue
      if (ISO_DAY.test((line.nextDue || "").slice(0, 10))) continue;
    }
    const monthsHit = new Set(sorted.map((o) => monthKeyOf(o.date))).size;
    const marked = isIncome
      ? true
      : line.kind === "expense-fixed" || line.kind === "subscription" || line.recurring === true || monthsHit >= 2;
    if (!marked) continue;
    // Un patrón vivo: su última aparición es de este mes o del pasado.
    if (monthKeyOf(latest.date) < shiftKey(key, -1)) continue;
    // Una serie de ingreso con su propia cadencia camina por su
    // nextDue, como las cuotas — su ritmo manda sobre el día del mes.
    if (isIncome && ISO_DAY.test((line.nextDue || "").slice(0, 10)) && line.cadence) {
      const minor = view(line.amountMinor, line.currency);
      const name = (line.concept || "").trim() || "—";
      const anchorDay = parts((line.nextDue || "").slice(0, 10)).d;
      let d = (line.nextDue || "").slice(0, 10);
      if (d < today) d = today;
      push({ day: d, kind: "income", name, minor, source: "", expected: false, auto: false });
      let steps = 0;
      while (steps < WALK_STEP_CAP) {
        const next = stepDate(d, line.cadence, anchorDay);
        if (next <= d || next > horizonEnd) break;
        d = next;
        push({ day: d, kind: "income", name, minor, source: "", expected: false, auto: false });
        steps += 1;
      }
      continue;
    }
    const dayOfMonth = parts(latest.date).d;
    const minorOf = (l: Line) => (isIncome ? 1 : -1) * view(l.amountMinor, l.currency);
    for (const mk of horizonMonths) {
      const real = sorted.filter((o) => monthKeyOf(o.date) === mk);
      const futureReal = real.filter((o) => o.date >= today);
      if (futureReal.length) {
        for (const o of futureReal) {
          push({ day: o.date, kind: isIncome ? "income" : "fixed", name: (o.line.concept || "").trim() || "—", minor: minorOf(o.line), source: "", expected: false, auto: false });
        }
        continue;
      }
      if (real.length) continue; // este mes ya pasó su día: la siguiente es la del mes que viene
      const last = new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0, 12).getDate();
      const day = `${mk}-${pad(Math.min(dayOfMonth, last))}`;
      push({ day, kind: isIncome ? "income" : "fixed", name: (line.concept || "").trim() || "—", minor: minorOf(line), source: "", expected: true, auto: false });
    }
  }

  events.sort((a, b) => a.day.localeCompare(b.day) || a.minor - b.minor || a.name.localeCompare(b.name));

  // ── La caminata, día a día ────────────────────────────────────────
  const byDay = new Map<string, ProjEvent[]>();
  for (const e of events) {
    const list = byDay.get(e.day) ?? [];
    list.push(e);
    byDay.set(e.day, list);
  }
  const days: ProjDay[] = [];
  let balance = startMinor;
  let d = today;
  let tightest: Projection["tightest"] = null;
  let firstFreeNegative: string | null = null;
  let firstBalanceNegative: string | null = null;
  let monthEndBalance = startMinor;
  let monthEndFree = startMinor - pledgedMinor;
  while (d <= horizonEnd) {
    for (const e of byDay.get(d) ?? []) balance += e.minor;
    const free = balance - pledgedMinor;
    days.push({ day: d, balance, free });
    if (!tightest || free < tightest.free) {
      const outs = (byDay.get(d) ?? []).filter((e) => e.minor < 0);
      const cause = outs.length ? outs.reduce((a, b) => (b.minor < a.minor ? b : a)).name : "";
      tightest = { day: d, free, balance, cause };
    }
    if (free < 0 && !firstFreeNegative) firstFreeNegative = d;
    if (balance < 0 && !firstBalanceNegative) firstBalanceNegative = d;
    if (d === thisMonthEnd) {
      monthEndBalance = balance;
      monthEndFree = free;
    }
    d = addDays(d, 1);
  }

  return {
    hasBase: hosts.length > 0,
    startMinor,
    pledgedMinor,
    horizonEnd,
    monthEnd: thisMonthEnd,
    events,
    days,
    tightest,
    firstFreeNegative,
    firstBalanceNegative,
    endBalance: balance,
    endFree: balance - pledgedMinor,
    monthEndBalance,
    monthEndFree,
    currency: display,
  };
}

function ordinalEn(d: number): string {
  if (d >= 11 && d <= 13) return `${d}th`;
  return `${d}${d % 10 === 1 ? "st" : d % 10 === 2 ? "nd" : d % 10 === 3 ? "rd" : "th"}`;
}

/** El nombre del día en la voz de la lectura: «el 14», «el 3 de enero». */
export function dayName(lang: Lang, isoDay: string, today: string): string {
  const { d, m } = parts(isoDay);
  const months = lang === "en"
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  if (monthKeyOf(isoDay) === monthKeyOf(today)) return L(lang, `el ${d}`, `the ${ordinalEn(d)}`);
  return L(lang, `el ${d} de ${months[m]}`, `${months[m]} ${ordinalEn(d)}`);
}

/** La fuente de un evento, en palabras (cerca 2: lo inferido se dice). */
export function eventSource(lang: Lang, e: ProjEvent): string {
  if (e.kind === "due") {
    return e.auto
      ? L(lang, "pago automático: sale solo de su cuenta", "automatic payment: it leaves the account on its own")
      : L(lang, "la cuota anotada, en su fecha", "the recorded installment, on its date");
  }
  if (e.kind === "card") {
    if (e.neverPaid) return L(lang, "nunca la has pagado: cuento el balance completo", "you have never paid it: I count the full balance");
    if (e.basisMonth) {
      const { m } = parts(`${e.basisMonth}-01`);
      const months = lang === "en"
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      return L(lang, `tu último pago a esta tarjeta, en ${months[m]}`, `your last payment to this card, in ${months[m]}`);
    }
    return L(lang, "el pago del mes pasado a esta tarjeta", "last month's payment to this card");
  }
  if (e.kind === "income") {
    return e.expected
      ? L(lang, "esperado: tu ingreso de cada mes, en su día", "expected: your every-month income, on its day")
      : L(lang, "tu ingreso fijo, anotado", "your fixed income, recorded");
  }
  return e.expected
    ? L(lang, "esperado: de tu patrón de cada mes", "expected: from your every-month pattern")
    : L(lang, "el fijo anotado, en su fecha", "the recorded fixed charge, on its date");
}

/** La lectura completa: la caminata con sus palabras (S4). */
export function readProjection(state: LedgerState, lang: Lang, today: string = todayIso()): ProjectionReading {
  const p = projectWalk(state, today);
  const money = (n: number) => formatMoney(n, p.currency, lang);
  const events = p.events.map((e) => ({ ...e, source: eventSource(lang, e) }));
  const withText: Projection = { ...p, events };
  if (!p.hasBase) {
    return {
      ...withText,
      verdict: L(lang,
        "Todavía no puedo caminar tu saldo: falta una cuenta con su saldo anotado. En cuanto una cuenta tenga saldo, camino día a día lo que ya está comprometido.",
        "I can't walk your balance yet: an account with its balance recorded is missing. As soon as an account has a balance, I walk what is already committed, day by day."),
      tightestText: null,
    };
  }
  const endName = dayName(lang, p.horizonEnd, today);
  let verdict: string;
  if (p.firstBalanceNegative) {
    const dayEv = p.events.filter((e) => e.day === p.firstBalanceNegative && e.minor < 0);
    const cause = dayEv.length ? dayEv.reduce((a, b) => (b.minor < a.minor ? b : a)).name : "";
    const at = dayBalance(p.days, p.firstBalanceNegative);
    verdict = L(lang,
      `Con lo que ya está comprometido, no llegas: ${dayName(lang, p.firstBalanceNegative, today)} el saldo cae a ${money(at?.balance ?? 0)}${cause ? ` tras ${cause}` : ""}.`,
      `With what is already committed, you don't make it: on ${dayName(lang, p.firstBalanceNegative, today)} the balance falls to ${money(at?.balance ?? 0)}${cause ? ` after ${cause}` : ""}.`);
  } else if (p.firstFreeNegative) {
    const at = dayBalance(p.days, p.firstFreeNegative);
    verdict = L(lang,
      `Llegas hasta ${endName}, pero tocando lo apartado: ${dayName(lang, p.firstFreeNegative, today)} lo libre cae a ${money(at?.free ?? 0)} — el saldo aguanta (${money(at?.balance ?? 0)}) solo usando lo que apartaste.`,
      `You make it to ${endName}, but touching what you set aside: on ${dayName(lang, p.firstFreeNegative, today)} the free balance falls to ${money(at?.free ?? 0)} — the balance holds (${money(at?.balance ?? 0)}) only by using what you set aside.`);
  } else {
    verdict = L(lang,
      `Llegas hasta ${endName} con lo que ya está comprometido: te quedan ${money(p.endFree)} libres.`,
      `You make it to ${endName} with what is already committed: ${money(p.endFree)} free left.`);
  }
  let tightestText: string | null = null;
  if (p.tightest && p.events.length) {
    const t = p.tightest;
    tightestText = L(lang,
      `Tu día más apretado es ${dayName(lang, t.day, today)}${t.cause ? `, con ${t.cause}` : ""}: te quedan ${money(t.free)} libres.`,
      `Your tightest day is ${dayName(lang, t.day, today)}${t.cause ? `, with ${t.cause}` : ""}: ${money(t.free)} free left.`);
  }
  return { ...withText, verdict, tightestText };
}
