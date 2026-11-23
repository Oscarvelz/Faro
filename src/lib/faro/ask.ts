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
import { bookMode, readAdvisor, type BookMode, type Reading } from "./advisor.ts";

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
import { dayName, freeAt, readProjection } from "./projection.ts";
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

/** El nombre de un modo en la voz de las respuestas (la caja rinde
 * texto plano: el piso se nombra en palabras, no con el subrayado
 * punteado de las superficies). */
export function modeWord(lang: Lang, m: BookMode): string {
  return m === "esencial" ? L(lang, "Esencial", "Essential") : m === "ritmo" ? L(lang, "Ritmo", "Rhythm") : L(lang, "Completo", "Complete");
}

/** LOS PISOS DE LAS CASAS QUE ESTE MOTOR CITA (cura de la ola 23,
 * A23-1/2/3/5). Los motores no importan el registro (la cerca de
 * asientos de la etapa 2 reserva mode.ts a sus asientos declarados):
 * leen el modo del propio libro (bookMode de advisor.ts) y juzgan el
 * alcance contra ESTA tabla declarada, que la cerca de modos-ola23
 * verifica contra el registro asiento por asiento — la misma
 * doctrina que las tablas espejo del Asesor en modos296. Si el
 * registro mueve una de estas casas, la cerca se pone roja y la
 * tabla se corrige con su razón, nunca al revés. */
export const ASK_FLOORS = {
  "nature.class-saldo": "completo",
  "nature.cushion": "completo",
  "vault.monthly-setaside": "ritmo",
  "loans.payoff-plan": "completo",
  "remit.manage": "completo",
  "study.remit": "completo",
  "advisor.projection": "completo",
} as const satisfies Record<string, BookMode>;
export type AskFeature = keyof typeof ASK_FLOORS;

const ASK_RANK: Record<BookMode, number> = { esencial: 0, ritmo: 1, completo: 2 };
/** ¿El modo de la persona ALCANZA la casa citada? (el alcance de los
 * motores: la tabla de arriba es la única ley que consultan). */
export function askReaches(mode: BookMode, feature: AskFeature): boolean {
  return ASK_RANK[mode] >= ASK_RANK[ASK_FLOORS[feature]];
}
/** El mismo alcance contra un piso DECLARADO como dato (el minMode
 * del mapa de funciones de Faro mismo, askmap.ts): el mapa declara el
 * piso junto a la función y la cerca lo verifica contra el registro. */
export function askReachesFloor(mode: BookMode, floor: BookMode): boolean {
  return ASK_RANK[mode] >= ASK_RANK[floor];
}

/** LA ETIQUETA DE PISO de una pieza (cura de la ola 23, A23-3): vacía
 * si el modo de la persona MUESTRA la casa de la pieza; si la casa
 * duerme, la pieza nombra su piso en su propia etiqueta. La resta del
 * dinero libre sigue entera y verdadera en cada modo — ninguna pieza
 * se cae, porque la resta sin una pieza mentiría el total — pero
 * ninguna cifra se entrega muda sobre una cara que el modo no enseña:
 * lo que duerme se nombra, que es la convención de la casa (la del
 * Manual y la del susurro). */
export function pieceFloor(lang: Lang, mode: BookMode, feature: AskFeature): string {
  if (askReaches(mode, feature)) return "";
  const floor = modeWord(lang, ASK_FLOORS[feature]);
  return L(lang, ` · vive en ${floor}`, ` · lives in ${floor}`);
}

export function answerQuestion(
  state: LedgerState,
  key: string,
  lang: Lang,
  names: Namer,
  raw: string,
  ctx: ParseCtx,
  today: string,
  mode?: BookMode,
): AskResult {
  const q = parseQuestion(raw, ctx);
  if (!q) return { kind: "unknown" };
  const { display, rateE4 } = state.settings;
  const reading = readAdvisor(state, key, lang, names, { today: new Date(`${today}T12:00:00`) });
  const money = (minor: number) => formatMoney(minor, reading.currency, lang);
  const modeNow = mode ?? bookMode(state);
  switch (q.intent) {
    case "spend": return spendAnswer(q, reading, state, display, rateE4, lang, money, today);
    case "free": return freeAnswer(q, state, key, today, display, lang, money, modeNow);
    case "reach": return reachAnswer(q, state, lang, money, today, modeNow);
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
        ? yes ? `Viable: the projected close stays at ${money(leftAfter)}.` : `Not viable: the projected close falls into negative (${money(leftAfter)}: more would go out than came in).`
        : yes ? `Yes. After that spend, ${money(leftAfter)} is left for the month.` : `No: that spend leaves the month in negative (${money(leftAfter)}: more would go out than came in${reading.left < 0 ? "; the month already ran negative before this spend" : ""}).`
    : q.register === "coloquial"
      ? yes ? `Sí, te alcanza — y te sobran ${money(leftAfter)} para cerrar el mes.` : `No te alcanza: te faltarían ${money(-leftAfter)} para cerrar el mes.`
      : q.register === "tecnico"
        ? yes ? `Viable: el cierre proyectado queda en ${money(leftAfter)}.` : `No viable: el cierre proyectado cae a negativo (${money(leftAfter)}: saldría más de lo que entró).`
        : yes ? `Sí. Después de ese gasto te quedan ${money(leftAfter)} del mes.` : `No: ese gasto deja el mes en negativo (${money(leftAfter)}: saldría más de lo que entró${reading.left < 0 ? "; el mes ya venía en negativo antes de este gasto" : ""}).`;
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
  display: Currency, lang: Lang, money: (n: number) => string, mode: BookMode,
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
      { label: L(lang, "Apartado del saldo", "Set aside from the balance") + pieceFloor(lang, mode, "nature.class-saldo"), minor: -apartados },
      { label: L(lang, "Vence en 14 días", "Due within 14 days"), minor: -dues },
      { label: L(lang, "Colchón por cubrir", "Cushion still to cover") + pieceFloor(lang, mode, "nature.cushion"), minor: -colchon },
    ],
    note: null,
    draft: null,
  };
}

/** El día del mes preguntado, resuelto a fecha: este mes si aún viene,
 * el que viene si ya pasó (¿llego al día 20? un 21 pregunta por el 20
 * del mes siguiente). */
function resolveAskedDay(today: string, dayNum: number): string {
  const mk = (y: number, m0: number) => {
    const last = new Date(y, m0 + 1, 0, 12).getDate();
    return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(Math.min(dayNum, last)).padStart(2, "0")}`;
  };
  const y = Number(today.slice(0, 4));
  const m0 = Number(today.slice(5, 7)) - 1;
  const thisMonth = mk(y, m0);
  if (thisMonth >= today) return thisMonth;
  const next = new Date(y, m0 + 1, 1, 12);
  return mk(next.getFullYear(), next.getMonth());
}

/**
 * La familia del camino (§19.1, 1.3.365): ¿llego al día X?, ¿cómo
 * llego a fin de mes?, ¿cuál es mi día más apretado? — del MISMO motor
 * que la lectura del Asesor (projection.ts): una sola verdad entre la
 * tarjeta y la respuesta (cerca 6 del brief). El veredicto se lee
 * sobre lo libre, y el supuesto va dicho en la nota: solo entra lo ya
 * comprometido; lo variable no entra hasta que se anota.
 */
function reachAnswer(
  q: ParsedQuestion, state: LedgerState, lang: Lang, money: (n: number) => string, today: string, mode: BookMode,
): AskResult {
  if (!askReaches(mode, "advisor.projection")) {
    return {
      kind: "answer", intent: "reach", register: q.register,
      verdict: L(lang,
        "Eso lo lee tu saldo proyectado, día a día — y vive en Completo.",
        "Your day-by-day projected balance reads that — and it lives in Complete."),
      pieces: [], note: null, draft: null,
    };
  }
  const p = readProjection(state, lang, today);
  const assumption = L(lang,
    "El supuesto, dicho: solo entra lo ya comprometido — cuotas, tarjetas con el pago del mes pasado, tus fijos de cada mes y tu ingreso seguro. Lo variable no entra hasta que se anota.",
    "The assumption, stated: only what is already committed counts — installments, cards at last month's payment, your every-month fixed charges and your steady income. Variable income doesn't count until it's recorded.");
  if (!p.hasBase) {
    return { kind: "answer", intent: "reach", register: q.register, verdict: p.verdict, pieces: [], note: null, draft: null };
  }
  const startPieces: AskPiece[] = [
    { label: L(lang, "Saldo en cuentas hoy", "Balance in accounts today"), minor: p.startMinor },
    { label: L(lang, "Apartado del saldo", "Set aside from the balance"), minor: -p.pledgedMinor },
  ];
  if (q.tightest) {
    if (!p.tightest || !p.events.length) {
      return {
        kind: "answer", intent: "reach", register: q.register,
        verdict: L(lang,
          `Sin vencimientos en el camino, tu día más apretado es hoy: te quedan ${money(p.endFree)} libres.`,
          `With nothing due along the way, your tightest day is today: ${money(p.endFree)} free left.`),
        pieces: [...startPieces, { label: L(lang, "Libre hoy", "Free today"), minor: p.endFree }],
        note: assumption, draft: null,
      };
    }
    return {
      kind: "answer", intent: "reach", register: q.register,
      verdict: p.tightestText ?? p.verdict,
      pieces: [...startPieces, { label: L(lang, `Libre ${dayName(lang, p.tightest.day, today)}`, `Free on ${dayName(lang, p.tightest.day, today)}`), minor: p.tightest.free }],
      note: assumption, draft: null,
    };
  }
  const target = q.day != null ? resolveAskedDay(today, q.day) : p.monthEnd;
  const targetName = dayName(lang, target, today);
  // La frase de destino en la voz de la respuesta: «al día 20», «al 3 de
  // diciembre», «a fin de mes» — nunca «a el».
  const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const targetPhrase = q.day == null
    ? L(lang, "a fin de mes", "to the end of the month")
    : target.slice(0, 7) === today.slice(0, 7)
      ? L(lang, `al día ${Number(target.slice(8, 10))}`, `to day ${Number(target.slice(8, 10))}`)
      : L(lang, `al ${Number(target.slice(8, 10))} de ${MONTHS_ES[Number(target.slice(5, 7)) - 1]}`, `to ${MONTHS_EN[Number(target.slice(5, 7)) - 1]} ${Number(target.slice(8, 10))}`);
  if (target > p.horizonEnd) {
    return {
      kind: "answer", intent: "reach", register: q.register,
      verdict: L(lang,
        `Mi camino llega hasta ${dayName(lang, p.horizonEnd, today)}: ese día te quedan ${money(p.endFree)} libres. Más allá no camino todavía.`,
        `My walk reaches ${dayName(lang, p.horizonEnd, today)}: that day you have ${money(p.endFree)} free. I don't walk further yet.`),
      pieces: [...startPieces, { label: L(lang, `Libre ${dayName(lang, p.horizonEnd, today)}`, `Free on ${dayName(lang, p.horizonEnd, today)}`), minor: p.endFree }],
      note: assumption, draft: null,
    };
  }
  const at = freeAt(p, target);
  const free = at?.free ?? p.endFree;
  const balance = at?.balance ?? p.endBalance;
  let verdict: string;
  if (p.firstBalanceNegative && p.firstBalanceNegative <= target) {
    const bad = freeAt(p, p.firstBalanceNegative);
    verdict = L(lang,
      `No llegas ${targetPhrase}: ${dayName(lang, p.firstBalanceNegative, today)} el saldo cae a ${money(bad?.balance ?? 0)}.`,
      `You don't make it ${targetPhrase}: on ${dayName(lang, p.firstBalanceNegative, today)} the balance falls to ${money(bad?.balance ?? 0)}.`);
  } else if (p.firstFreeNegative && p.firstFreeNegative <= target) {
    const bad = freeAt(p, p.firstFreeNegative);
    verdict = L(lang,
      `Llegas ${targetPhrase}, pero tocando lo apartado: ${dayName(lang, p.firstFreeNegative, today)} lo libre cae a ${money(bad?.free ?? 0)}.`,
      `You make it ${targetPhrase}, but touching what you set aside: on ${dayName(lang, p.firstFreeNegative, today)} the free balance falls to ${money(bad?.free ?? 0)}.`);
  } else {
    verdict = L(lang,
      `Llegas ${targetPhrase}: te quedan ${money(free)} libres (saldo ${money(balance)}).`,
      `You make it ${targetPhrase}: ${money(free)} free left (balance ${money(balance)}).`);
  }
  return {
    kind: "answer", intent: "reach", register: q.register, verdict,
    pieces: [...startPieces, { label: L(lang, `Libre ${targetName}`, `Free on ${targetName}`), minor: free }],
    note: p.tightestText && p.tightest && p.tightest.day !== target ? `${p.tightestText} ${assumption}` : assumption,
    draft: null,
  };
}

function leftAnswer(
  q: ParsedQuestion, reading: Reading, key: string, lang: Lang, money: (n: number) => string,
): AskResult {
  if (!q.year) {
    return {
      kind: "answer", intent: "left", register: q.register,
      // OLA 26 (U1, la forma del delegado): la queda en negativo no se
      // imprime cruda («Te quedan −$654.92») — se dice como lo que es,
      // con su causa en palabras: salió más de lo que entró.
      verdict: reading.left < 0
        ? L(lang, `Este mes tu queda va en negativo (${money(reading.left)}): salió ${money(reading.outTotal)} y entró ${money(reading.income)}. Es la resta del mes tal como va — no un castigo.`, `This month your left runs negative (${money(reading.left)}): ${money(reading.outTotal)} went out and ${money(reading.income)} came in. It's the month's subtraction as it stands — not a punishment.`)
        : L(lang, `Te quedan ${money(reading.left)} para cerrar el mes.`, `You have ${money(reading.left)} left to close the month.`),
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
