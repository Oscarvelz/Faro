/**
 * ask.ts — Preguntar al Asesor: el motor de respuestas (Captura
 * Inteligente, mapa F8 + §8.4; Ola 5a, 1.3.345). DETERMINISTA, sin IA:
 * cada pregunta es un cálculo disfrazado de conversación, y cada cifra
 * de la respuesta sale de una pieza de la Lectura (readAdvisor) o de una
 * resta nombrada pieza por pieza. Cero fabricación por construcción:
 * lo que el libro no sabe, la respuesta lo pide o lo declara.
 *
 * La anatomía de cada respuesta es siempre la misma (mapa F8): un
 * veredicto en una frase, EN EL REGISTRO DEL USUARIO (el léxico lo
 * detecta; la respuesta no corrige ni suena a banco) → el efecto en
 * números (2–3 piezas, no más; en «dinero libre» las piezas SON la
 * resta) → qué se rompería, si algo se rompe → el borrador honesto:
 * «Registrarlo» deja el gasto preguntado en la bandeja, y guardar sigue
 * pasando por la mesa de siempre. Una respuesta nunca guarda, nunca
 * mueve dinero: este módulo no conoce commit ni upsertLine.
 *
 * Familias de 5a: spend, free, left (mes y año — el año dice su
 * supuesto), how. Las de escenarios (encadenado, pagar hoy o no, ahorro
 * que sigue) llegan en 5b sobre el asiento advisor.ask-scenarios.
 */
import { readAdvisor, type Reading } from "./advisor.ts";

// El mismo Namer local del Asesor (advisor.ts lo declara en casa; aquí
// se espeja su forma exacta — cat/sub/purchase/catalog).
type Namer = {
  cat: (id: string) => string;
  sub: (id: string) => string;
  purchase: (id: string) => string;
  catalog: (id: string) => string;
};
import { duesWindow } from "./dues.ts";
import { cushionOf } from "./funds.ts";
import { parseQuestion, type ParsedQuestion, type Register } from "./lexicon.ts";
import { convertMinor, formatMoney } from "./money.ts";
import { savingsStock } from "./savings.ts";
import type { ParseCtx } from "./textparse.ts";
import type { Currency, Lang, LedgerState } from "./types.ts";

export type AskPiece = { label: string; minor: number };
export type AskDraft = { amountMinor: number; currency: Currency; concept: string };
export type AskResult =
  | { kind: "answer"; intent: ParsedQuestion["intent"]; register: Register; verdict: string; pieces: AskPiece[]; note: string | null; draft: AskDraft | null }
  | { kind: "need-amount"; register: Register }
  | { kind: "unknown" };

function L(lang: Lang, es: string, en: string): string {
  return lang === "en" ? en : es;
}

export function answerQuestion(
  state: LedgerState,
  key: string,
  lang: Lang,
  names: Namer,
  raw: string,
  ctx: ParseCtx,
  today: string,
): AskResult {
  const q = parseQuestion(raw, ctx);
  if (!q) return { kind: "unknown" };
  const { display, rateE4 } = state.settings;
  const reading = readAdvisor(state, key, lang, names, { today: new Date(`${today}T12:00:00`) });
  const money = (minor: number) => formatMoney(minor, reading.currency, lang);
  switch (q.intent) {
    case "spend": return spendAnswer(q, reading, state, display, rateE4, lang, money, today);
    case "free": return freeAnswer(q, state, key, today, display, lang, money);
    case "left": return leftAnswer(q, reading, key, lang, money);
    case "how": return {
      kind: "answer", intent: "how", register: q.register,
      verdict: reading.headline,
      pieces: [{ label: L(lang, "Queda del mes", "Left this month"), minor: reading.left }],
      note: reading.paceNote || null,
      draft: null,
    };
  }
}

function spendAnswer(
  q: ParsedQuestion, reading: Reading, state: LedgerState,
  display: Currency, rateE4: number, lang: Lang,
  money: (n: number) => string, today: string,
): AskResult {
  if (q.amountMinor == null || q.amountMinor <= 0) return { kind: "need-amount", register: q.register };
  const amt = convertMinor(q.amountMinor, q.currency ?? display, display, rateE4);
  const leftAfter = reading.left - amt;
  const yes = leftAfter >= 0;
  const verdict = lang === "en"
    ? q.register === "coloquial"
      ? yes ? `Yes, you've got it — ${money(leftAfter)} to spare for the month.` : `It comes up short: you'd be ${money(-leftAfter)} under to close the month.`
      : q.register === "tecnico"
        ? yes ? `Viable: the projected close stays at ${money(leftAfter)}.` : `Not viable: the projected close falls to ${money(leftAfter)}.`
        : yes ? `Yes. After that spend, ${money(leftAfter)} is left for the month.` : `No: that spend leaves the month at ${money(leftAfter)}.`
    : q.register === "coloquial"
      ? yes ? `Sí, te alcanza — y te sobran ${money(leftAfter)} para cerrar el mes.` : `No te alcanza: te faltarían ${money(-leftAfter)} para cerrar el mes.`
      : q.register === "tecnico"
        ? yes ? `Viable: el cierre proyectado queda en ${money(leftAfter)}.` : `No viable: el cierre proyectado cae a ${money(leftAfter)}.`
        : yes ? `Sí. Después de ese gasto te quedan ${money(leftAfter)} del mes.` : `No: ese gasto deja el mes en ${money(leftAfter)}.`;
  const duesSoon = duesWindow(state, 7, today).reduce((a, d) => a + (d.amt ?? 0), 0);
  return {
    kind: "answer", intent: "spend", register: q.register, verdict,
    pieces: [
      { label: L(lang, "Queda del mes hoy", "Left this month today"), minor: reading.left },
      { label: L(lang, "Con ese gasto", "With that spend"), minor: leftAfter },
    ],
    note: !yes
      ? L(lang, "Si lo haces igual, el mes cierra en negativo: algo de lo anotado tendría que esperar.", "If you do it anyway, the month closes negative: something recorded would have to wait.")
      : duesSoon > 0
        ? L(lang, `Esta semana vencen ${money(duesSoon)} — ya están contados en la queda.`, `${money(duesSoon)} comes due this week — already counted in what's left.`)
        : null,
    draft: { amountMinor: q.amountMinor, currency: q.currency ?? display, concept: q.concept || L(lang, "Compra", "Purchase") },
  };
}

function freeAnswer(
  q: ParsedQuestion, state: LedgerState, key: string, today: string,
  display: Currency, lang: Lang, money: (n: number) => string,
): AskResult {
  void display;
  const stock = savingsStock(state, key);
  const saldo = stock.byClass.cuenta ?? 0;
  const apartados = stock.pledged;
  const dues = duesWindow(state, 14, today).reduce((a, d) => a + (d.amt ?? 0), 0);
  const colchon = cushionOf(stock).floorShortfall;
  const libre = saldo - apartados - dues - colchon;
  const verdict = libre > 0
    ? lang === "en"
      ? q.register === "tecnico"
        ? `Available without touching reserves: ${money(libre)}. The subtraction is below.`
        : `You can take out ${money(libre)} without touching what's set aside or the cushion. The subtraction is below.`
      : q.register === "tecnico"
        ? `Disponible sin tocar reservas: ${money(libre)}. La resta va abajo.`
        : `Puedes sacar ${money(libre)} sin tocar lo apartado ni el colchón. La resta va abajo.`
    : L(lang,
      `Hoy no hay dinero libre: la resta da ${money(libre)}. Abajo ves por qué, pieza por pieza.`,
      `There's no free money today: the subtraction gives ${money(libre)}. Below is why, piece by piece.`);
  return {
    kind: "answer", intent: "free", register: q.register, verdict,
    pieces: [
      { label: L(lang, "Saldo en cuentas", "Balance in accounts"), minor: saldo },
      { label: L(lang, "Apartado del saldo", "Set aside from the balance"), minor: -apartados },
      { label: L(lang, "Vence en 14 días", "Due within 14 days"), minor: -dues },
      { label: L(lang, "Colchón por cubrir", "Cushion still to cover"), minor: -colchon },
    ],
    note: null,
    draft: null,
  };
}

function leftAnswer(
  q: ParsedQuestion, reading: Reading, key: string, lang: Lang, money: (n: number) => string,
): AskResult {
  if (!q.year) {
    return {
      kind: "answer", intent: "left", register: q.register,
      verdict: L(lang, `Te quedan ${money(reading.left)} para cerrar el mes.`, `You have ${money(reading.left)} left to close the month.`),
      pieces: [
        { label: L(lang, "Entró", "Came in"), minor: reading.income },
        { label: L(lang, "Salió", "Went out"), minor: -reading.outTotal },
        { label: L(lang, "Queda", "Left"), minor: reading.left },
      ],
      note: null, draft: null,
    };
  }
  const monthNum = Number(key.slice(5, 7));
  const monthsLeft = 12 - monthNum + 1;
  const projected = reading.left * monthsLeft;
  return {
    kind: "answer", intent: "left", register: q.register,
    verdict: L(lang,
      `Si tus meses siguen como este, el año cerraría con ${money(projected)}.`,
      `If your months keep going like this one, the year would close with ${money(projected)}.`),
    pieces: [
      { label: L(lang, "Queda de este mes", "This month's left"), minor: reading.left },
      { label: L(lang, "Proyección del año", "Year projection"), minor: projected },
    ],
    note: L(lang,
      `El supuesto, dicho: la queda de este mes repetida en los ${monthsLeft} meses que faltan del año. Es una proyección, no una promesa: un mes distinto mueve la cifra.`,
      `The assumption, stated: this month's left repeated over the ${monthsLeft} months left in the year. It's a projection, not a promise: a different month moves the figure.`),
    draft: null,
  };
}
