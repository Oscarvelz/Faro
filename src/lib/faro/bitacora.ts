/**
 * La Bitácora (1.3.367) — el registro callado de los meses y la edición
 * anual «Tu año en Faro». Dos oficios y solo dos:
 *
 *  1. CONGELAR. Al cerrar un mes, su foto se guarda callada en el libro
 *     (sin ceremonia en Central — F-B1). Al cerrar el año, los meses se
 *     ENCUADERNAN en la edición anual y desaparecen de la lista: la
 *     apertura de la edición lo dice en su primera línea.
 *  2. CONTAR UNA SOLA VEZ. La edición se compone desde los motores de
 *     siempre (yearReport, savingsStock, préstamos, la cuenta de la
 *     espera) y queda congelada en el libro: corregir el libro después
 *     NO reescribe la historia. La serie narra; no calcula por su lado.
 *
 * Dato dudoso, fuera (la cerca 2 del brief): lo que un motor no puede
 * garantizar exacto no es tarjeta — las tarjetas de crédito no entran en
 * la tarjeta de deudas porque su saldo a 31 de diciembre no se puede
 * reconstruir con exactitud desde las líneas; los préstamos sí.
 */
import { makeNamer } from "./defaults";
import { categorySlices, summarize } from "./engine";
import { loanPays, loanState, loanTotals, loansOf } from "./loans";
import { convertMinor, formatMoney } from "./money";
import { savingsStock } from "./savings";
import { normName } from "./subs";
import type { Currency, LedgerState, LogCard, LogEdition, LogMonth, LogText, Logbook } from "./types";
import { yearAccount } from "./waitlist";
import { yearReport } from "./year";

const tx = (es: string, en: string): LogText => ({ es, en });
const pick = (t: LogText, lang: "es" | "en") => (lang === "en" ? t.en : t.es);

/* ---------- la lectura con desconfianza ---------- */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isFin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isText = (v: unknown): v is LogText => isObj(v) && typeof v.es === "string" && typeof v.en === "string";

/** La forma de cifra congelada que la cara desreferencia sin red
 * (figure.minor, before.minor al pintar): objeto con minor finito y
 * la moneda de la unión. */
const isFrozenMoney = (v: unknown): boolean =>
  isObj(v) && isFin(v.minor) && (v.currency === "NIO" || v.currency === "USD");

function cardOk(c: unknown): c is LogCard {
  if (!isObj(c) || !isText(c.title) || !isText(c.context)) return false;
  if (c.kind !== "cover" && c.kind !== "big" && c.kind !== "compare" && c.kind !== "trend" && c.kind !== "close") return false;
  if (!isObj(c.explain) || !isText(c.explain.what) || !isText(c.explain.how) || !isText(c.explain.so)) return false;
  // OLA 26 (G26-3): LA PUERTA JUZGA LOS OPCIONALES QUE LA CARA
  // DESREFERENCIA. cardOk solo juzgaba los campos requeridos y los
  // opcionales entraban sin juicio: `points: 42` llegaba al esparcido
  // de TrendChart y la edición entera se volvía inabrible con un
  // TypeError al pintar; `figure: 42` pintaba NaN. Desde esta cura,
  // un opcional presente se juzga en la dimensión de su lectura:
  // points como el arreglo de números finitos que la aritmética del
  // gráfico lee, figure/before como la cifra congelada que se
  // desreferencia, figureLabel como texto, mark como número finito.
  // La tarjeta malformada no entra — y con la Familia 9, «no entra»
  // significa «no se pinta»: el libro la conserva intacta.
  if (c.figure !== undefined && !isFrozenMoney(c.figure)) return false;
  if (c.before !== undefined && !isFrozenMoney(c.before)) return false;
  if (c.figureLabel !== undefined && !isText(c.figureLabel)) return false;
  if (c.points !== undefined && (!Array.isArray(c.points) || !c.points.every(isFin))) return false;
  if (c.mark !== undefined && !isFin(c.mark)) return false;
  return true;
}

/** El libro de bitácora tal como se lee: lo que no se reconoce, no entra. */
export function logbookOf(state: LedgerState): Logbook {
  const raw = state.logbook;
  const months: Record<string, LogMonth> = {};
  const editions: Record<string, LogEdition> = {};
  if (isObj(raw)) {
    if (isObj(raw.months)) {
      for (const [k, v] of Object.entries(raw.months)) {
        if (!isObj(v) || v.month !== k) continue;
        if (!isFin(v.income) || !isFin(v.expense) || !isFin(v.net) || !isFin(v.savedFlow) || !isFin(v.topMinor)) continue;
        if (typeof v.countedOn !== "string" || typeof v.currency !== "string") continue;
        if (v.topName !== null && !isText(v.topName)) continue;
        months[k] = v as unknown as LogMonth;
      }
    }
    if (isObj(raw.editions)) {
      for (const [k, v] of Object.entries(raw.editions)) {
        if (!isObj(v) || !isFin(v.year) || String(v.year) !== k) continue;
        if (typeof v.countedOn !== "string" || typeof v.seenAt !== "string" || typeof v.currency !== "string") continue;
        if (!Array.isArray(v.cards) || !v.cards.every(cardOk)) continue;
        editions[k] = v as unknown as LogEdition;
      }
    }
  }
  return { months, editions };
}

/* ---------- piezas de fecha y de registro ---------- */

export function monthName(monthKey: string, lang: "es" | "en"): string {
  const [y, m] = monthKey.split("-").map(Number);
  const name = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "long" }).format(new Date(y, (m ?? 1) - 1, 1));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const lineDay = (l: { bookedOn?: string; monthKey: string }) => l.bookedOn || `${l.monthKey}-01`;

/** Cuánto registro tiene un año: su primer y último día anotados y sus meses con líneas. */
export function recordedSpan(state: LedgerState, year: number): { firstDay: string; lastDay: string; monthsWithLines: number; days: number } {
  let first = "", last = "", months = 0;
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    const lines = (state.months[key]?.lines ?? []).filter((l) => l.active);
    if (lines.length === 0) continue;
    months += 1;
    for (const l of lines) {
      const d = lineDay(l);
      if (!first || d < first) first = d;
      if (!last || d > last) last = d;
    }
  }
  const days = first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 86400000) : 0;
  return { firstDay: first, lastDay: last, monthsWithLines: months, days };
}

/* ---------- la foto del mes (P6: callada, al cerrar) ---------- */

export function monthSnap(state: LedgerState, monthKey: string, today: string): LogMonth {
  const display = state.settings.display;
  const s = summarize(state, monthKey, state.settings.lang);
  const topEs = categorySlices(state, monthKey, makeNamer(state.structure, "es"), "es")[0];
  const topEn = categorySlices(state, monthKey, makeNamer(state.structure, "en"), "en")[0];
  return {
    month: monthKey,
    countedOn: today,
    currency: display,
    income: s.income,
    expense: s.expense,
    net: s.opportunity,
    savedFlow: s.savingsFlow,
    topName: topEs ? tx(topEs.name, topEn?.name ?? topEs.name) : null,
    topMinor: topEs?.minor ?? 0,
  };
}

/* ---------- la serie de precios del año (F-B2, para la tarjeta) ---------- */

type YearPrice = { label: string; before: number; after: number; currency: Currency; rise: number; count: number };

function yearPrices(state: LedgerState, year: number): YearPrice[] {
  const groups = new Map<string, { label: string; occ: { day: string; minor: number; currency: Currency }[] }>();
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    for (const l of state.months[key]?.lines ?? []) {
      if (!l.active || l.rest) continue;
      let id: string | null = null;
      if (l.kind === "purchase" && l.storeId) id = `p:${normName(l.concept)}|${l.storeId}`;
      else if (l.kind === "expense-fixed" || l.kind === "subscription" || l.recurring === true) id = `f:${l.seriesId ? l.seriesId : `${normName(l.concept)}|${l.categoryId}`}`;
      if (!id) continue;
      const g = groups.get(id) ?? { label: l.concept, occ: [] };
      g.occ.push({ day: lineDay(l), minor: l.amountMinor, currency: l.currency });
      groups.set(id, g);
    }
  }
  const out: YearPrice[] = [];
  for (const g of groups.values()) {
    if (g.occ.length < 4) continue;
    const cur = g.occ[0].currency;
    if (g.occ.some((o) => o.currency !== cur)) continue; // monedas mezcladas: no se garantiza, fuera
    const sorted = [...g.occ].sort((a, b) => a.day.localeCompare(b.day));
    const first = sorted[0], last = sorted[sorted.length - 1];
    if (first.minor <= 0 || last.minor <= first.minor) continue; // solo subidas, y con base válida
    out.push({ label: g.label, before: first.minor, after: last.minor, currency: cur, rise: (last.minor - first.minor) / first.minor, count: g.occ.length });
  }
  return out.sort((a, b) => b.rise - a.rise || (b.after - b.before) - (a.after - a.before));
}

/* ---------- el compositor de la edición ---------- */

const EXPLAIN_FOOT = (countedOn: string): LogCard["explain"] => ({
  what: tx(
    `Esta edición se contó el ${countedOn} con los datos de ese día.`,
    `This edition was counted on ${countedOn} with that day's data.`),
  how: tx(
    "Cada cifra sale de los mismos motores que alimentan Estudio y el Asesor: la bitácora narra, no calcula por su lado.",
    "Every figure comes from the same engines that feed Study and the Advisor: the logbook tells the story, it does not keep its own books."),
  so: tx(
    "Si corriges el libro después, esta edición no cambia: es la foto de tu año tal como se contó.",
    "If you correct the book later, this edition does not change: it is the photo of your year as it was counted."),
});

/**
 * Compone la edición de un año cerrado, o null si el año no da ni el
 * esqueleto (apertura, la cifra, la categoría, el cierre). Los umbrales
 * son los del diseño de interacción §1, afinados contra los motores.
 */
export function composeYearEdition(state: LedgerState, year: number, today: string, boundMonths: number): LogEdition | null {
  const display = state.settings.display;
  const rate = state.settings.rateE4;
  const namesEs = makeNamer(state.structure, "es");
  const namesEn = makeNamer(state.structure, "en");
  const rep = yearReport(state, year, "es", namesEs);
  const repEn = yearReport(state, year, "en", namesEn);
  const span = recordedSpan(state, year);
  if (span.monthsWithLines === 0) return null;
  const partial = span.firstDay > `${year}-01-31`;
  const since = span.firstDay.slice(0, 7);
  const money = (minor: number, currency: Currency, lang: "es" | "en") => formatMoney(minor, currency, lang);
  const both = (f: (lang: "es" | "en") => string): LogText => tx(f("es"), f("en"));
  const foot = EXPLAIN_FOOT(today);
  const cards: LogCard[] = [];

  /* 1 — Apertura (sin cifras): la puerta, y la encuadernación dicha. */
  const boundLine = boundMonths > 0
    ? tx("Este tomo reúne tus bitácoras de cada mes.", "This volume binds your logbook of each month.")
    : tx("", "");
  cards.push({
    kind: "cover",
    title: partial
      ? tx(`Tu primer año en Faro`, `Your first year in Faro`)
      : tx(`Tu año en Faro`, `Your year in Faro`),
    context: partial
      ? tx(
        `${boundLine.es ? `${boundLine.es} ` : ""}Tu ${year} en Faro — desde ${monthName(since, "es").toLowerCase()}: el año no está entero porque tu libro nació entonces, y se cuenta tal como fue.`,
        `${boundLine.en ? `${boundLine.en} ` : ""}Your ${year} in Faro — since ${monthName(since, "en")}: the year is not whole because your book was born then, and it is told as it was.`)
      : tx(
        `${boundLine.es ? `${boundLine.es} ` : ""}Así fue tu ${year}, contado con tus propios números.`,
        `${boundLine.en ? `${boundLine.en} ` : ""}This was your ${year}, told with your own numbers.`),
    explain: foot,
  });

  /* 2 — El año en una cifra: el neto si es contundente; si no, lo movido. */
  const netStrong = rep.income > 0 && Math.abs(rep.net) * 20 >= rep.income;
  if (netStrong) {
    cards.push({
      kind: "big",
      title: tx("El año en una cifra", "The year in one figure"),
      figure: { minor: rep.net, currency: display },
      figureLabel: tx(rep.net >= 0 ? "Te quedó en el año" : "Saliste por debajo en el año", rep.net >= 0 ? "Left over in the year" : "You ended the year short"),
      context: both((l) => l === "es"
        ? `Entraron ${money(rep.income, display, l)} y salieron ${money(rep.expense, display, l)}: la diferencia es tu año en una cifra.`
        : `${money(rep.income, display, l)} came in and ${money(rep.expense, display, l)} went out: the difference is your year in one figure.`),
      explain: {
        what: tx("El neto del año: todo lo que entró menos todo lo que salió, mes a mes.", "The year's net: everything that came in minus everything that went out, month by month."),
        how: tx("Es la suma de los doce meses tal como Estudio los cuenta; el apartado cuenta como salida porque salió de tus cuentas.", "It is the sum of the twelve months as Study counts them; set-asides count as money out because they left your accounts."),
        so: tx("Es la cifra que resume el año: si es positiva, el año te dejó más de lo que te quitó.", "It is the figure that sums up the year: if it is positive, the year left you more than it took."),
      },
    });
  } else if (rep.income + rep.expense > 0) {
    cards.push({
      kind: "big",
      title: tx("El año en una cifra", "The year in one figure"),
      figure: { minor: rep.income + rep.expense, currency: display },
      figureLabel: tx("Moviste en el año", "You moved in the year"),
      context: both((l) => l === "es"
        ? `Entraron ${money(rep.income, display, l)} y salieron ${money(rep.expense, display, l)}: un año de mucho movimiento y poco margen.`
        : `${money(rep.income, display, l)} came in and ${money(rep.expense, display, l)} went out: a year of much movement and little margin.`),
      explain: {
        what: tx("Lo movido en el año: lo que entró más lo que salió.", "What moved in the year: what came in plus what went out."),
        how: tx("Cuando el neto es pequeño frente a lo movido, la cifra honesta del año es el movimiento mismo.", "When the net is small next to what moved, the honest figure of the year is the movement itself."),
        so: tx("El año pasó por tus manos casi entero: quedó poco, y esta tarjeta lo dice sin disfraz.", "The year passed almost whole through your hands: little stayed, and this card says so plainly."),
      },
    });
  }

  /* 3 — Ahorro: el flujo apartado, si supera una semana de gasto medio. */
  const weekSpend = rep.spend / 52;
  const stockStart = savingsStock(state, `${year - 1}-12`).total;
  const stockEnd = rep.savingsEnd.total;
  const growth = stockEnd - stockStart;
  if (rep.savedFlow > 0 && rep.savedFlow >= weekSpend) {
    cards.push({
      kind: "big",
      title: tx("Lo que apartaste", "What you set aside"),
      figure: { minor: rep.savedFlow, currency: display },
      figureLabel: tx("Apartaste en el año", "You set aside in the year"),
      context: both((l) => l === "es"
        ? `Tu ahorro cerró el año en ${money(stockEnd, display, l)}${growth > 0 ? `, ${money(growth, display, l)} más que al empezar` : ""}.`
        : `Your savings closed the year at ${money(stockEnd, display, l)}${growth > 0 ? `, ${money(growth, display, l)} more than when it started` : ""}.`),
      explain: {
        what: tx("Lo apartado en el año: el dinero que moviste a tus ahorros entre enero y diciembre.", "What you set aside in the year: the money you moved into your savings between January and December."),
        how: tx("Es el flujo de apartado de los doce meses, el mismo que Estudio suma; el saldo de cierre es el stock de Ahorros al 31 de diciembre.", "It is the set-aside flow of the twelve months, the same one Study adds up; the closing balance is the Savings stock on December 31."),
        so: tx("Apartar es la única cifra del año que fue decisión pura: nadie te la cobró.", "Setting aside is the one figure of the year that was pure decision: nobody charged you for it."),
      },
    });
  }

  /* 4 — Deudas (préstamos): cerradas en el año, o el saldo se movió ±10 %. */
  const jan1 = `${year}-01-01`, dec31 = `${year}-12-31`;
  const leftStart = loanTotals(state, jan1).left;
  const leftEnd = loanTotals(state, dec31).left;
  let closedCount = 0, closedMinor = 0;
  for (const loan of loansOf(state)) {
    if (loanState(state, loan, dec31).left !== 0) continue;
    const before = loanState(state, loan, `${year - 1}-12-31`).left;
    if (before <= 0 && loan.takenOn < `${year}-01-01`) continue;
    const pays = loanPays(state, loan.id).filter((p) => !p.rest);
    const lastPay = pays.length ? lineDay(pays[pays.length - 1]) : "";
    if (lastPay.slice(0, 4) !== String(year) && loan.takenOn.slice(0, 4) !== String(year)) continue;
    closedCount += 1;
    closedMinor += convertMinor(loan.amountMinor, loan.currency, display, rate);
  }
  const debtMoved = leftStart > 0 && Math.abs(leftEnd - leftStart) * 10 >= leftStart;
  if (closedCount > 0 || debtMoved) {
    cards.push({
      kind: "compare",
      title: tx("Tus préstamos", "Your loans"),
      before: { minor: leftStart, currency: display },
      figure: { minor: leftEnd, currency: display },
      figureLabel: tx("Debías al cerrar el año", "You owed at the year's close"),
      context: closedCount > 0
        ? both((l) => l === "es"
          ? `Saliste de ${closedCount} ${closedCount === 1 ? "préstamo" : "préstamos"} en el año (${money(closedMinor, display, l)} que ya no debes). Empezaste debiendo ${money(leftStart, display, l)} y cerraste en ${money(leftEnd, display, l)}.`
          : `You closed ${closedCount} ${closedCount === 1 ? "loan" : "loans"} in the year (${money(closedMinor, display, l)} you no longer owe). You started owing ${money(leftStart, display, l)} and closed at ${money(leftEnd, display, l)}.`)
        : both((l) => l === "es"
          ? `Tu deuda en préstamos pasó de ${money(leftStart, display, l)} a ${money(leftEnd, display, l)} en el año.`
          : `Your loan debt went from ${money(leftStart, display, l)} to ${money(leftEnd, display, l)} in the year.`),
      explain: {
        what: tx("Lo que debías en préstamos al empezar y al cerrar el año.", "What you owed in loans when the year started and when it closed."),
        how: tx("Son los saldos de tus préstamos en esas dos fechas, contados pago a pago. Las tarjetas de crédito no entran: su saldo en una fecha pasada no se puede reconstruir con exactitud, y un dato dudoso no es tarjeta.", "They are your loan balances on those two dates, counted payment by payment. Credit cards do not enter: their balance on a past date cannot be rebuilt exactly, and a doubtful figure is not a card."),
        so: tx("La deuda que baja libera ingreso futuro; la que sube lo compromete. La tarjeta lo dice en palabras, sin pintarlo de bueno ni de malo.", "Debt that falls frees future income; debt that rises commits it. The card says it in words, without painting it good or bad."),
      },
    });
  }

  /* 5 — La categoría mayor: siempre entra si hubo gasto. */
  const top = rep.top[0];
  if (top && rep.spend > 0) {
    const topEn = repEn.top.find((s) => s.id === top.id);
    const share10 = Math.round((top.minor / rep.spend) * 10);
    cards.push({
      kind: "big",
      title: tx("Dónde se fue más", "Where most of it went"),
      figure: { minor: top.minor, currency: display },
      figureLabel: tx(top.name, topEn?.name ?? top.name),
      context: share10 >= 1
        ? both((l) => l === "es"
          ? `${share10} de cada 10 que gastaste fueron a ${top.name}.`
          : `${share10} of every 10 you spent went to ${topEn?.name ?? top.name}.`)
        : both((l) => l === "es"
          ? `Menos de 1 de cada 10 que gastaste fue a ${top.name}: tu gasto estuvo repartido.`
          : `Less than 1 of every 10 you spent went to ${topEn?.name ?? top.name}: your spending was spread out.`),
      explain: {
        what: tx("Tu categoría de gasto mayor del año y su peso sobre todo lo gastado.", "Your largest spending category of the year and its weight over everything spent."),
        how: tx("Es la suma de esa categoría en los doce meses, la misma que Estudio ordena en su año.", "It is that category's sum over the twelve months, the same one Study ranks in its year."),
        so: tx("Saber dónde se fue más no es un reproche: es el mapa del año.", "Knowing where most of it went is not a reproach: it is the map of the year."),
      },
    });
  }

  /* 6 — Los meses con precedente (máximo 2): extremos, cierres, desvíos. */
  const withData = rep.months.filter((m) => m.has);
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const medExpense = median(withData.map((m) => m.expense));
  const medIncome = median(withData.map((m) => m.income));
  type MonthPick = { idx: number; score: number; why: LogText; series: number[]; value: number };
  const picks = new Map<number, MonthPick>();
  const consider = (p: MonthPick) => { const prev = picks.get(p.idx); if (!prev || p.score > prev.score) picks.set(p.idx, p); };
  withData.forEach((m, i) => {
    const idx = Number(m.key.slice(5)) - 1;
    if (medExpense > 0 && m.expense > 0 && Math.abs(m.expense - medExpense) * 100 >= medExpense * 35) {
      consider({ idx, score: Math.abs(m.expense - medExpense) / medExpense, series: rep.months.map((x) => x.expense), value: m.expense,
        why: tx(`el gasto se desvió de lo normal del año`, `spending strayed from the year's normal`) });
    }
    // El extremo solo es precedente si sobresale de verdad (≥ 20 % sobre
    // la mediana): en un año plano todos los meses son «el mayor» y
    // ninguno marcó el año.
    if (m.expense > 0 && medExpense > 0 && m.expense === Math.max(...withData.map((x) => x.expense)) && m.expense * 10 >= medExpense * 12) {
      consider({ idx, score: 1 + m.expense / medExpense, series: rep.months.map((x) => x.expense), value: m.expense,
        why: tx(`fue tu mes de mayor gasto del año`, `it was your biggest spending month of the year`) });
    }
    if (m.income > 0 && medIncome > 0 && m.income === Math.max(...withData.map((x) => x.income)) && m.income * 10 >= medIncome * 12) {
      consider({ idx, score: 1 + m.income / medIncome, series: rep.months.map((x) => x.income), value: m.income,
        why: tx(`fue tu mes de mayor ingreso del año`, `it was your biggest income month of the year`) });
    }
  });
  const monthCards = [...picks.values()].sort((a, b) => b.score - a.score).slice(0, 2).sort((a, b) => a.idx - b.idx);
  for (const p of monthCards) {
    const mk = `${year}-${String(p.idx + 1).padStart(2, "0")}`;
    cards.push({
      kind: "trend",
      title: both((l) => `${monthName(mk, l)}`),
      figure: { minor: p.value, currency: display },
      figureLabel: tx("El mes en una cifra", "The month in one figure"),
      context: both((l) => l === "es"
        ? `${monthName(mk, l)} quedó marcado porque ${pick(p.why, l)}.`
        : `${monthName(mk, l)} stands out because ${pick(p.why, l)}.`),
      explain: {
        what: tx("Uno de los meses que marcaron el año, con el año entero detrás en tenue.", "One of the months that marked the year, with the whole year faint behind it."),
        how: tx("Un mes entra si fue extremo, cerró una deuda o su gasto se desvió al menos un 35 % de la mediana del año. Nunca entran más de dos.", "A month enters if it was an extreme, closed a debt, or its spending strayed at least 35% from the year's median. Never more than two."),
        so: tx("El año no se cuenta en doce meses iguales: se cuenta en los que lo cambiaron.", "A year is not told in twelve equal months: it is told in the ones that changed it."),
      },
      points: p.series,
      mark: p.idx,
    });
  }

  /* 7 — Precios que subieron: el mayor aumento del año, ≥10 % y ≥4 veces. */
  const price = yearPrices(state, year).find((p) => p.rise > 0.10);
  if (price) {
    const pct = Math.round(price.rise * 100);
    cards.push({
      kind: "compare",
      title: tx("El precio que subió", "The price that rose"),
      before: { minor: price.before, currency: price.currency },
      figure: { minor: price.after, currency: price.currency },
      figureLabel: tx(price.label, price.label),
      context: both((l) => l === "es"
        ? `${price.label} pasó de ${money(price.before, price.currency, l)} a ${money(price.after, price.currency, l)} en el año: +${pct} %, en ${price.count} registros.`
        : `${price.label} went from ${money(price.before, price.currency, l)} to ${money(price.after, price.currency, l)} in the year: +${pct}%, across ${price.count} records.`),
      explain: {
        what: tx("El precio que más subió en el año, del primer registro al último.", "The price that rose most in the year, from its first record to its last."),
        how: tx("Se compone de tus propias anotaciones del mismo producto o cargo, en la misma tienda cuando es compra. Sin dos precios no hay tarjeta.", "It is composed from your own records of the same product or charge, at the same store when it is a purchase. Without two prices there is no card."),
        so: tx("La bitácora lo cuenta; la evidencia completa vive en Estudio, en Cambios de precio.", "The logbook tells it; the full evidence lives in Study, under Price changes."),
      },
    });
  }

  /* 8 — Dinero no gastado: lo que la espera frenó y quedó. */
  const ya = yearAccount(state, year);
  const leftPieces = ya.pieces.filter((w) => w.status === "left").length;
  const savedEntry = ya.saved.find((s) => s.currency === display) ?? [...ya.saved].sort((a, b) => b.minor - a.minor)[0];
  if (savedEntry && savedEntry.minor > 0 && (savedEntry.minor > rep.spend / 365 || leftPieces >= 3)) {
    cards.push({
      kind: "big",
      title: tx("Dinero no gastado", "Money not spent"),
      figure: { minor: savedEntry.minor, currency: savedEntry.currency },
      figureLabel: tx("La espera te ahorró", "The wait saved you"),
      context: both((l) => l === "es"
        ? `Dejaste pasar ${leftPieces} ${leftPieces === 1 ? "pieza" : "piezas"} de tu lista de espera: ese dinero nunca salió.`
        : `You let ${leftPieces} ${leftPieces === 1 ? "item" : "items"} pass on your waiting list: that money never left.`),
      explain: {
        what: tx("Lo que tu lista de espera frenó y al final no compraste, sumado en el año.", "What your waiting list held back and you never bought, added up over the year."),
        how: tx("Es la cuenta del año de la lista de espera: solo las piezas que dejaste, con su precio anotado.", "It is the waiting list's own year account: only the items you let go, at their recorded price."),
        so: tx("No gastar también es una cifra del año — la única que se logra esperando.", "Not spending is also a figure of the year — the only one achieved by waiting."),
      },
    });
  }

  /* 9 — Cierre: prosa de hechos, con la ausencia nombrada si es el dato. */
  const facts: LogText[] = [];
  if (closedCount > 0) facts.push(tx(`saliste de ${closedCount} ${closedCount === 1 ? "préstamo" : "préstamos"}`, `you closed ${closedCount} ${closedCount === 1 ? "loan" : "loans"}`));
  else if (leftStart > 0 && leftEnd < leftStart) facts.push(tx("debías menos al cerrar que al empezar", "you owed less at the close than at the start"));
  if (growth > 0) facts.push(tx("tu ahorro creció", "your savings grew"));
  if (rep.net > 0) facts.push(tx("el año te dejó más de lo que te quitó", "the year left you more than it took"));
  const absences: LogText[] = [];
  if (loansOf(state).length === 0) absences.push(tx("sin préstamos registrados", "no loans on record"));
  if (rep.savedFlow <= 0 && growth <= 0) absences.push(tx("sin apartado que contar", "no set-asides to tell of"));
  if (ya.pieces.length === 0) absences.push(tx("sin lista de espera todavía", "no waiting list yet"));
  const closeEs = facts.length
    ? `Cerraste el año así: ${facts.map((f) => f.es).join(", ")}.`
    : "Un año quieto: sin grandes movimientos que contar, y eso también es el dato.";
  const closeEn = facts.length
    ? `You closed the year like this: ${facts.map((f) => f.en).join(", ")}.`
    : "A quiet year: no big movements to tell of, and that too is the fact.";
  cards.push({
    kind: "close",
    title: tx("El cierre", "The close"),
    context: tx(
      absences.length && (partial || facts.length === 0) ? `${closeEs} Todavía ${absences.map((a) => a.es).join(", ")}: el año que viene, esta serie tendrá más que contar.` : closeEs,
      absences.length && (partial || facts.length === 0) ? `${closeEn} Still ${absences.map((a) => a.en).join(", ")}: next year, this series will have more to tell.` : closeEn),
    explain: foot,
  });

  /* El presupuesto de la serie: mínimo 4, máximo 9. Si sobra material
   * suben los umbrales, no la serie: se cae primero el segundo mes,
   * luego el precio, luego lo no gastado y por último el primer mes.
   * El esqueleto (apertura, cifra, categoría, cierre) nunca se toca. */
  if (cards.length < 4) return null;
  let trimmed = cards;
  const dropOrder: ((c: LogCard, all: LogCard[]) => boolean)[] = [
    (c, all) => c.kind === "trend" && all.filter((x) => x.kind === "trend").indexOf(c) === 1,
    (c) => c.kind === "compare" && c.title.es === "El precio que subió",
    (c) => c.kind === "big" && c.title.es === "Dinero no gastado",
    (c) => c.kind === "trend",
  ];
  for (const rule of dropOrder) {
    while (trimmed.length > 9) {
      const idx = trimmed.findIndex((c) => rule(c, trimmed));
      if (idx < 0) break;
      trimmed = trimmed.filter((_, i) => i !== idx);
    }
    if (trimmed.length <= 9) break;
  }
  return { year, countedOn: today, partial, since, currency: display, cards: trimmed, seenAt: "" };
}

/* ---------- la conservación de lo no reconocido (Familia 9) ---------- */

/** OLA 26 (Familia 9; fallo de Oscar, 2026-11-21 23:41 EST): LA
 * BITÁCORA CONSERVA LO QUE NO RECONOCE. Toda receta que reescribe el
 * logbook componía el libro persistido DESDE el filtro (logbookOf):
 * una entrada tolerada por la puerta pero no reconocida por el lector
 * desaparecía del libro en el primer asentamiento que tocara cualquier
 * otra cosa (OBS-26-G1: la foto dañada de 2025-10 se evaporó al
 * asentarse la de 2026-10). La casa lo había declarado diseño en
 * defaults.ts; el fallo lo rechazó: «¿Cómo vamos a perder algo en
 * silencio? Eso va en contra de nuestras reglas.» Desde esta cura el
 * libro que persiste se compone así: lo reconocido sale del filtro y
 * de la lógica de la receta (que obra solo sobre lo reconocido:
 * asienta, encuaderna, marca); lo que el filtro NO reconoce se
 * arrastra del libro crudo, intacto y en su sitio — no se pinta,
 * porque pintar lo manda el filtro al leer, pero jamás sale del
 * libro. La misma doctrina que la puerta de deseos desde la Cura 24
 * (G24-1: nada se evapora al reescribir). */
function persistedLogbook(
  state: LedgerState,
  book: Logbook,
  months: Record<string, LogMonth>,
  editions: Record<string, LogEdition>,
): Logbook {
  const raw = state.logbook as unknown as Record<string, unknown> | undefined;
  const rawMonths = isObj(raw?.months) ? (raw.months as Record<string, unknown>) : {};
  const rawEditions = isObj(raw?.editions) ? (raw.editions as Record<string, unknown>) : {};
  const outMonths: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawMonths)) if (!(k in book.months)) outMonths[k] = v;
  for (const [k, v] of Object.entries(months)) outMonths[k] = v;
  const outEditions: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawEditions)) if (!(k in book.editions)) outEditions[k] = v;
  for (const [k, v] of Object.entries(editions)) outEditions[k] = v;
  return { ...(raw ?? {}), months: outMonths, editions: outEditions } as unknown as Logbook;
}

/* ---------- el asentamiento callado (al abrir, como el autopay) ---------- */

/**
 * Congela lo que ya cerró y encuaderna lo que ya es año: meses cerrados
 * sin foto ganan su foto; años pasados con registro suficiente ganan su
 * edición y pierden sus folios sueltos. Devuelve el mismo estado si no
 * hay nada que asentar (el proveedor solo confirma cuando cambia).
 */
export function settleLogbook(state: LedgerState, today: string): { state: LedgerState; changed: boolean } {
  const book = logbookOf(state);
  const months: Record<string, LogMonth> = { ...book.months };
  const editions: Record<string, LogEdition> = { ...book.editions };
  let changed = false;
  const curYear = today.slice(0, 4);
  const curMonth = today.slice(0, 7);

  const years = new Set<number>();
  for (const key of Object.keys(state.months)) {
    const y = Number(key.slice(0, 4));
    if (Number.isInteger(y) && y > 0) years.add(y);
  }
  for (const y of [...years].sort((a, b) => a - b)) {
    if (String(y) >= curYear || editions[String(y)]) continue;
    const span = recordedSpan(state, y);
    if (span.monthsWithLines < 2 && span.days < 42) continue; // menos de ~6 semanas: no hay edición
    const boundCount = Object.keys(months).filter((k) => k.startsWith(`${y}-`)).length;
    const ed = composeYearEdition(state, y, today, boundCount);
    if (!ed) continue;
    editions[String(y)] = ed;
    for (const k of Object.keys(months)) if (k.startsWith(`${y}-`)) delete months[k];
    changed = true;
  }
  for (const mk of Object.keys(state.months).sort()) {
    if (mk >= curMonth || months[mk] || editions[mk.slice(0, 4)]) continue;
    if ((state.months[mk]?.lines.length ?? 0) === 0) continue;
    months[mk] = monthSnap(state, mk, today);
    changed = true;
  }
  for (const k of Object.keys(months)) {
    if (editions[k.slice(0, 4)]) { delete months[k]; changed = true; }
  }
  if (!changed) return { state, changed: false };
  // Familia 9: el libro que persiste conserva lo no reconocido
  // (persistedLogbook) — el asentamiento obra sobre lo reconocido y
  // no evapora nada más.
  return { state: { ...state, logbook: persistedLogbook(state, book, months, editions) }, changed: true };
}

/** Marca la edición como vista (la serie se cerró por primera vez). */
export function markEditionSeen(state: LedgerState, year: number, today: string): LedgerState {
  const book = logbookOf(state);
  const ed = book.editions[String(year)];
  if (!ed || ed.seenAt) return state;
  // Familia 9: marcar vista reescribe el libro — y conserva lo no
  // reconocido, como todo asentamiento (persistedLogbook).
  const editions = { ...book.editions, [String(year)]: { ...ed, seenAt: today } };
  return { ...state, logbook: persistedLogbook(state, book, book.months, editions) };
}

/** La edición más reciente aún no vista: la que Central anuncia. */
export function pendingEdition(state: LedgerState): LogEdition | null {
  const book = logbookOf(state);
  const unseen = Object.values(book.editions).filter((e) => !e.seenAt).sort((a, b) => b.year - a.year);
  return unseen[0] ?? null;
}
