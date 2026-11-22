/**
 * ask2.ts — el motor del BANCO AMPLIADO del Asesor (rama independiente
 * «banco del Asesor», 2026-11-20; base canon 1.3.353 — integrado a canon
 * por la decisión de fusión de Oscar del 2026-11-20, ola 1.3.355: este
 * motor es la columna; la caja rinde su pregunta de vuelta y la puerta
 * de Faro mismo desde askmap.FUNCTION_TOPIC).
 *
 * ask.ts (Ola 5a) responde cuatro intenciones: spend, free, left, how.
 * Este motor responde las familias VIVAS del banco (questionbank.ts)
 * que nacen de los especímenes de Oscar del 2026-11-20 — las tres
 * preguntas de su primera prueba (gustos, historia, ahorros) y las
 * trece de la segunda ronda (recencia, agenda, ranking, remesas) —
 * más gustos, ya-pagué, comparar, cuenta-origen, futuro y faro-mismo.
 *
 * Las leyes no cambian, se heredan (askmap.ts R1–R7):
 *  · DETERMINISTA, sin IA: cada respuesta es un cálculo de un motor
 *    nombrado (readAdvisor, savingsStock, duesWindow, peopleOf,
 *    cardFigures, remitByPerson, summarize, payoffPlan, hostAccounts).
 *  · CERO FABRICACIÓN: este módulo tampoco conoce commit ni upsertLine;
 *    una respuesta nunca guarda ni mueve dinero.
 *  · EL ORDEN DE JUICIO ES LEY (de mayor a menor especificidad):
 *      ahorros → free → gustos → ya-pague → cuenta-origen → CONTEO →
 *      historia → recencia → agenda → EXTREMOS → ranking → remesas →
 *      comparar → futuro → faro-mismo → (delegado) ask.ts:
 *      spend/left/how. (CONTEO y EXTREMOS nacieron en la ola 2,
 *      2026-11-21, de los especímenes «¿cuántas cuotas…?» y «el gasto
 *      más grande/pequeño», generalizados a todo el mapa.)
 *    Las palabras de AHORRO pesan más que la familia genérica de estado
 *    (la cura del desvío de «¿cuánto me queda en ahorros?»); «sin tocar
 *    mis ahorros» sigue siendo free, no ahorros (su trampa manda).
 *  · LA PROCEDENCIA VIAJA EN LA RESPUESTA: cada resultado trae `source`
 *    (los ids de askmap de donde salió cada número) y `lines` (cuántas
 *    líneas componen la cifra) — la ley «todo número se explica» (§17.3)
 *    empieza aquí, en el dato, no en la pantalla.
 *  · EL MODO VIAJA EN LA RESPUESTA (cura de la ola 23, A23-1/2/3/5): el
 *    Asesor solo habla de lo que puede mostrar (principio 6). Una
 *    familia cuyas cifras viven sobre el modo de la persona no las
 *    entrega: dice dónde viven, nombrando el piso; una pieza de una
 *    resta cuya casa duerme nombra su piso en su etiqueta, sin caerse
 *    de la resta. El espejo también es ley: ninguna respuesta que el
 *    modo sí puede mostrar cae en silencio falso.
 *  · Las familias DECLARADAS del banco (ausencia, identidad,
 *    seguimiento) NO se responden aquí: devolverían unknown, el
 *    silencio honesto, hasta que su motor nazca.
 */
import { bookMode, readAdvisor, type BookMode } from "./advisor.ts";
import { aliasIn, describeLearned, frequentAliases, type LearnedAlias } from "./asklearn.ts";
import { answerQuestion, askReaches, askReachesFloor, modeWord, pieceFloor, type AskResult } from "./ask.ts";
import { functionOfQuestion, FARO_FUNCTION_MAP } from "./askmap.ts";
import { cardFigures, cardsOf } from "./cards.ts";
import { payoffPlan, monthAhead, peopleOf, lentOf, simulatePlan } from "./debts.ts";
import { loansOf } from "./loans.ts";
import { duesWindow } from "./dues.ts";
import { inView, isSpendLine, monthLines, summarize } from "./engine.ts";
import { cushionOf, hostAccounts, libreOf } from "./funds.ts";
import { periodRange } from "./historial.ts";
import { foldQ, parseQuestion } from "./lexicon.ts";
import { convertMinor, formatMoney } from "./money.ts";
import { QUESTION_BANK } from "./questionbank.ts";
import { remitByPerson, remitHistory, recipientName } from "./remit-people.ts";
import { savingsStock } from "./savings.ts";
import { parsePhrase, type ParseCtx } from "./textparse.ts";
import type { Currency, Lang, LedgerState, Line } from "./types.ts";

type Namer = {
  cat: (id: string) => string;
  sub: (id: string) => string;
  purchase: (id: string) => string;
  catalog: (id: string) => string;
};

export type BankFamilyId =
  | "ahorros" | "gustos" | "ya-pague" | "cuenta-origen" | "recencia"
  | "agenda" | "ranking" | "remesas" | "historia" | "comparar"
  | "futuro" | "faro-mismo" | "conteo" | "extremos" | "capacidades" | "limites"
  | "hipotetico" | "calculadora" | "acciones" | "conversor" | "calendario"
  | "contrafactual" | "respaldo" | "meta"
  | "deudas" | "confirmacion" | "sintesis"
  | "promedio" | "relator" | "frecuencia" | "precio-tiempo" | "regla"
  | "simulador" | "estacionalidad" | "reparto" | "aprendizaje";

export type BankPiece = { label: string; minor: number };
/** UNA ACCIÓN SUGERIDA (ola 5): la puerta que la respuesta propone
 * debajo de sí misma. `target` es un id de askmap — la misma casa que
 * alimenta a faro-mismo y sus puertas del Manual — así que la caja
 * navega por el mapa, nunca por una ruta escrita a mano. La respuesta
 * PROPONE; el toque del usuario dispone (R2: nada se guarda solo). */
export type BankAction = { id: string; label: string; target: string };
export type BankResult =
  | { kind: "answer"; family: BankFamilyId | "spend" | "free" | "left" | "how" | "reach"; verdict: string; pieces: BankPiece[]; note: string | null; source: string[]; lines: number; draft?: { amountMinor: number; currency: Currency; concept: string } | null; actions?: BankAction[]; proposal?: { word: string; question: string } | null; forgetWord?: string | null; frame?: AskFrame }
  | { kind: "ask-back"; family: BankFamilyId; verdict: string; options: (BankPiece & { id: string })[]; source: string[] }
  | { kind: "need-amount"; family: BankFamilyId }
  | { kind: "unknown" };

/* ------------------------------------------------------------------ */
/* EL MARCO DEL SEGUIMIENTO (§20, 1.3.380 — re-cosido en la          */
/* integración del banco, 1.3.383): lo que una respuesta deja para    */
/* que la siguiente pregunta viva de ella. Estado de diálogo: la      */
/* caja lo guarda en su sesión — jamás entra al libro, no viaja,      */
/* muere con la caja o con el tema. El marco solo ENRUTA: cada cifra  */
/* de un seguimiento sale de los motores de siempre (summarize, el    */
/* pool de historia), nunca del marco mismo.                          */
/* ------------------------------------------------------------------ */
export type AskFrameFilter =
  | { kind: "category"; id: string; label: string }
  | { kind: "sub"; id: string; label: string }
  | { kind: "store"; id: string; label: string }
  | { kind: "purchase-cat"; id: string; label: string }
  | { kind: "remit"; label: string }
  | { kind: "tiendas"; label: string };

export type AskFrame =
  | { kind: "compare2"; monthA: string; monthB: string; labelA: string; labelB: string; totalA: number; totalB: number; filter: AskFrameFilter | null }
  | { kind: "period1"; period: Period; income: boolean; filter: AskFrameFilter | null; total: number };

function L(lang: Lang, es: string, en: string): string {
  return lang === "en" ? en : es;
}

/** EL PUENTE (ola 10, idea de Oscar 2026-11-21): cuando la cifra que el
 * Asesor acaba de dar YA VIVE dibujada en algún área de la app (una
 * estadística de Estudio, el patrón de Remesas), la respuesta lleva su
 * puerta directa a ESA área — el mismo gesto con que las ayudas (?)
 * llevan al tema exacto del Manual. El Asesor no solo dice el número:
 * te lleva a donde el número vive, y la vuelta es la de la app
 * (atrás del teléfono / ESC), con la pregunta y la respuesta intactas
 * al volver. La puerta viaja como acción (target = id de askmap). */
function reportDoor(c: Ctx, target: string, esLabel: string, enLabel: string): BankAction[] {
  return [{ id: "goto", label: L(c.lang, esLabel, enLabel), target }];
}

type Ctx = {
  state: LedgerState;
  key: string;
  lang: Lang;
  names: Namer;
  today: string;
  display: Currency;
  rateE4: number;
  money: (n: number) => string;
  /** El modo vigente (cura de la ola 23, A23-1/2/3/5): el motor no
   * recibía el modo y la caja imprimía la respuesta entera en los tres
   * modos — cifras de Completo dichas en Esencial sin nombrar su piso.
   * Ahora cada familia juzga las casas de sus piezas contra este modo. */
  mode: BookMode;
  /** Los patrones aprendidos de ESTE usuario (ola 11): sus palabras
   * para las cosas, confirmadas por su toque o su corrección. El motor
   * los consulta al resolver filtros; jamás aprende aquí dentro — el
   * aprendizaje nace en asklearn.ts, de eventos confirmados. */
  learned: LearnedAlias[];
};

function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

/** La fecha con la que una línea entra en recencia e historia: su
 * bookedOn si cae en su propio mes; si no, el día 1 de su mes (la misma
 * regla de remit-people.ts · dateOf). */
export function lineDate(l: Line): string {
  return l.bookedOn && l.bookedOn.startsWith(l.monthKey) ? l.bookedOn : `${l.monthKey}-01`;
}

function view(c: Ctx, l: Line): number {
  if (!l.active || l.rest || l.xfer) return 0;
  return convertMinor(l.amountMinor, l.currency, c.display, c.rateE4);
}

function allLines(c: Ctx): Line[] {
  const out: Line[] = [];
  for (const k of Object.keys(c.state.months).sort()) {
    if (k > c.key) continue;
    for (const l of c.state.months[k]?.lines ?? []) {
      if (l.active && !l.rest && !l.xfer) out.push(l);
    }
  }
  return out;
}

function isOut(l: Line): boolean {
  return !l.kind.startsWith("income");
}

function prevKey(key: string): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* AHORROS — la cura del desvío: sus palabras pesan más que «how».     */
/* ------------------------------------------------------------------ */
function ahorrosAnswer(c: Ctx, folded: string): BankResult {
  // OLA 12 — EL AHORRO DEL MUNDO NO ES SOLO «¿cuánto tengo?»: la
  // batería mostró las formas ordinarias (el fondo, el ritmo, el
  // porcentaje, la cuenta nombrada) cayendo todas en el stock a secas
  // — la cifra vecina de la caza diaria, otra vez. Cada forma se juzga
  // contra SU motor antes de la respuesta del stock.
  const stock0 = savingsStock(c.state, c.key);
  if (/(fondo de emergencia|emergency fund)/.test(folded)) {
    const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const target = reading.cushionMinor;
    const have = reading.cushionStock;
    const gap = Math.max(0, target - have);
    const months = c.state.settings.emergencyMonths || 3;
    return {
      kind: "answer", family: "ahorros",
      verdict: gap > 0
        ? L(c.lang, `Tu fondo de emergencia debería cubrir ${months} meses de lo esencial: ${c.money(target)}. Hoy tu colchón suma ${c.money(have)} — te faltan ${c.money(gap)}.`, `Your emergency fund should cover ${months} months of essentials: ${c.money(target)}. Today your cushion adds up to ${c.money(have)} — you're ${c.money(gap)} short.`)
        : L(c.lang, `Tu fondo de emergencia está cubierto: debería ser ${c.money(target)} (${months} meses de lo esencial) y tu colchón suma ${c.money(have)}.`, `Your emergency fund is covered: it should be ${c.money(target)} (${months} months of essentials) and your cushion adds up to ${c.money(have)}.`),
      pieces: [
        { label: L(c.lang, "El fondo debería ser", "The fund should be"), minor: target },
        { label: L(c.lang, "Tu colchón hoy", "Your cushion today"), minor: have },
        ...(gap > 0 ? [{ label: L(c.lang, "Te falta", "Still to go"), minor: -gap }] : []),
      ],
      note: L(c.lang, "La meta es la de tu propio Asesor: tus meses de colchón de Ajustes por tu gasto esencial mensual medido — no una regla de afuera.", "The target is your own Advisor's: your cushion months from Settings times your measured monthly essentials — not an outside rule."),
      source: ["ahorros.colchon", "asesor.lectura"], lines: 0,
      actions: reportDoor(c, "ahorros.colchon", "Verlo en Ahorros · Colchón", "See it in Savings · Cushion"),
    };
  }
  const namedAccount = /(cuanto tengo en|tengo en|cuanto hay en|hay en|cuanto queda en|balance (in|of)|how much (do i have|is) in)/.test(folded);
  if (namedAccount) {
    let best: { name: string; minor: number; len: number } | null = null;
    for (const row of stock0.series.values()) {
      if (row.cls !== "cuenta" && row.cls !== "saldo") continue;
      const name = c.names.sub(row.subId);
      if (!name) continue;
      const f = foldQ(name).trim();
      const whole = new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
      if (f.length >= 3 && whole.test(folded) && (!best || f.length > best.len)) {
        best = { name, minor: row.minor, len: f.length };
      }
    }
    if (best) {
      const b = best as { name: string; minor: number };
      return {
        kind: "answer", family: "ahorros",
        verdict: L(c.lang, `En ${b.name} tienes ${c.money(b.minor)}.`, `In ${b.name} you have ${c.money(b.minor)}.`),
        pieces: [{ label: b.name, minor: b.minor }],
        note: null, source: ["ahorros.stock"], lines: 0,
      };
    }
  }
  const savInMonth = (key: string) => (c.state.months[key]?.lines ?? []).filter((l) => l.active && roleOf(c.state, l.categoryId) === "savings").reduce((a, l) => a + view(c, l), 0);
  const monthKeys = Object.keys(c.state.months).filter((k) => k <= c.key).sort();
  const savAvg = monthKeys.length ? Math.round(monthKeys.reduce((a, k) => a + savInMonth(k), 0) / monthKeys.length) : 0;
  if (/(porcentaje|por ciento|percent)/.test(folded) && /(ahorr|ingres|gano|guarde)/.test(folded)) {
    const sum = summarize(c.state, c.key, c.lang);
    const saved = savInMonth(c.key);
    const pct = sum.income > 0 ? Math.round((saved / sum.income) * 1000) / 10 : null;
    return {
      kind: "answer", family: "ahorros",
      verdict: pct === null
        ? L(c.lang, "Este mes no entró ingreso anotado, así que no hay porcentaje que medir: sería dividir entre nada.", "No income was recorded this month, so there's no percentage to measure: it would divide by nothing.")
        : L(c.lang, `Este mes apartaste ${c.money(saved)} de ${c.money(sum.income)} que entraron: el ${pct}% de tu ingreso.`, `This month you set aside ${c.money(saved)} of the ${c.money(sum.income)} that came in: ${pct}% of your income.`),
      pieces: [{ label: L(c.lang, "Apartado este mes", "Set aside this month"), minor: saved }, { label: L(c.lang, "Entró este mes", "Came in this month"), minor: sum.income }],
      note: null, source: ["ahorros.mes", "asesor.lectura"], lines: 0,
    };
  }
  if (/(ahorr\w*|guarde|aparte|saved|set aside).{0,28}(al mes|por mes|mensual|cada mes|each month|per month|monthly)|(cuanto (ahorro|guarde|aparte|ahorr))/.test(folded)) {
    const thisMonth = savInMonth(c.key);
    return {
      kind: "answer", family: "ahorros",
      verdict: L(c.lang, `Apartas en promedio ${c.money(savAvg)} al mes (este mes: ${c.money(thisMonth)}), medido sobre ${monthKeys.length} mes${monthKeys.length === 1 ? "" : "es"} anotados.`, `You set aside ${c.money(savAvg)} a month on average (this month: ${c.money(thisMonth)}), measured over ${monthKeys.length} recorded month${monthKeys.length === 1 ? "" : "s"}.`),
      pieces: [{ label: L(c.lang, "Promedio al mes", "Monthly average"), minor: savAvg }, { label: L(c.lang, "Este mes", "This month"), minor: thisMonth }],
      note: L(c.lang, "Es lo que tus líneas de ahorro suman, no lo que el mes dejó libre: apartar es un acto, no un residuo.", "It's what your savings lines add up to, not what the month left over: setting aside is an act, not a residue."),
      source: ["ahorros.mes", "ahorros.stock"], lines: 0,
    };
  }
  const stock = savingsStock(c.state, c.key);
  const cushion = cushionOf(stock);
  const sum = summarize(c.state, c.key, c.lang);
  const cls = (re: RegExp) => re.test(folded);
  let head = stock.total;
  let headLabel = L(c.lang, "Ahorros en total", "Savings in total");
  if (cls(/retiro|retirement/)) { head = stock.retirement; headLabel = L(c.lang, "Retiro", "Retirement"); }
  else if (cls(/emergencia|emergency/)) { head = stock.emergency; headLabel = L(c.lang, "Emergencia", "Emergency"); }
  else if (cls(/apartad|set aside/)) { head = stock.kept + stock.pledged; headLabel = L(c.lang, "Apartado (guardado + del saldo)", "Set aside (kept + from balances)") + pieceFloor(c.lang, c.mode, "nature.class-saldo"); }
  // A23-3 (cura de la ola 23): el total, las cuentas y lo guardado viven
  // en Esencial y se dicen enteros; el apartado del saldo (su rendición
  // cuelga de nature.class-saldo, Completo) y el colchón (todas sus
  // caras son de Completo) nombran su piso en la propia pieza, y el
  // flujo del mes (vault.monthly-setaside, Ritmo) nombra el suyo en su
  // frase — en el veredicto cuando el veredicto ES el flujo, y en la
  // nota cuando la nota lo trae. Ninguna pieza se cae: las piezas suman
  // el total que el veredicto dice, y una resta coja mentiría.
  const flowFloor = askReaches(c.mode, "vault.monthly-setaside")
    ? ""
    : L(c.lang, ` Su lectura vive en ${modeWord(c.lang, "ritmo")}.`, ` Its reading lives in ${modeWord(c.lang, "ritmo")}.`);
  const verdict = cls(/mes|month/) && cls(/apart|set aside/)
    ? L(c.lang, `Este mes apartaste ${c.money(sum.savingsFlow)}.`, `This month you set aside ${c.money(sum.savingsFlow)}.`) + flowFloor
    : L(c.lang, `En ahorros tienes ${c.money(stock.total)}.`, `You have ${c.money(stock.total)} in savings.`);
  return {
    kind: "answer", family: "ahorros", verdict,
    pieces: [
      { label: headLabel, minor: head },
      { label: L(c.lang, "En cuentas", "In accounts"), minor: stock.byClass.cuenta ?? 0 },
      { label: L(c.lang, "Guardado aparte", "Kept apart"), minor: stock.kept },
      { label: L(c.lang, "Apartado del saldo", "Set aside from balances") + pieceFloor(c.lang, c.mode, "nature.class-saldo"), minor: stock.pledged },
      { label: L(c.lang, "Colchón por cubrir", "Cushion still to cover") + pieceFloor(c.lang, c.mode, "nature.cushion"), minor: -cushion.floorShortfall },
    ],
    note: sum.savingsFlow > 0
      ? L(c.lang, `Este mes el flujo hacia el ahorro fue ${c.money(sum.savingsFlow)}.`, `This month's flow into savings was ${c.money(sum.savingsFlow)}.`) + flowFloor
      : null,
    source: ["ahorros.stock", "ahorros.colchon", "ahorros.mes"],
    lines: stock.series.size,
  };
}

/* ------------------------------------------------------------------ */
/* GUSTOS — capacidad: el dinero libre cruzado con la regla 50·30·20.  */
/* ------------------------------------------------------------------ */
function freeSubtraction(c: Ctx): { libre: number; pieces: BankPiece[] } {
  const stock = savingsStock(c.state, c.key);
  const saldo = stock.byClass.cuenta ?? 0;
  const dues = duesWindow(c.state, 14, c.today).reduce((a, d) => a + (d.amt ?? 0), 0);
  const colchon = cushionOf(stock).floorShortfall;
  const libre = saldo - stock.pledged - dues - colchon;
  return {
    libre,
    pieces: [
      { label: L(c.lang, "Saldo en cuentas", "Balance in accounts"), minor: saldo },
      { label: L(c.lang, "Apartado del saldo", "Set aside from the balance") + pieceFloor(c.lang, c.mode, "nature.class-saldo"), minor: -stock.pledged },
      { label: L(c.lang, "Vence en 14 días", "Due within 14 days"), minor: -dues },
      { label: L(c.lang, "Colchón por cubrir", "Cushion still to cover") + pieceFloor(c.lang, c.mode, "nature.cushion"), minor: -colchon },
    ],
  };
}

function gustosAnswer(c: Ctx, folded: string, raw: string, parseCtx: ParseCtx): BankResult {
  const { libre, pieces } = freeSubtraction(c);
  const amt = amountOf(c, raw, parseCtx);
  if (amt != null && amt > 0) {
    const yes = amt <= libre;
    return {
      kind: "answer", family: "gustos",
      verdict: yes
        ? L(c.lang, `Sí: para gustos tienes ${c.money(libre)} libres, y ese gusto es ${c.money(amt)}.`, `Yes: you have ${c.money(libre)} free for treats, and that one is ${c.money(amt)}.`)
        : L(c.lang, `No alcanza para gustos: libres hay ${c.money(libre)} y el gusto cuesta ${c.money(amt)}.`, `It doesn't fit as a treat: you have ${c.money(libre)} free and it costs ${c.money(amt)}.`),
      pieces, note: null, source: ["estudio.regla", "asesor.lectura", "cobros.cuotas"], lines: 0,
    };
  }
  return {
    kind: "answer", family: "gustos",
    verdict: libre > 0
      ? L(c.lang, `Para gustos tienes ${c.money(libre)}: es tu dinero libre, con lo apartado y el colchón intactos. La resta va abajo.`, `For treats you have ${c.money(libre)}: your free money, with what's set aside and the cushion untouched. The subtraction is below.`)
      : L(c.lang, `Hoy no hay dinero para gustos: la resta del dinero libre da ${c.money(libre)}. Abajo ves por qué.`, `There's no treat money today: the free-money subtraction gives ${c.money(libre)}. Below is why.`),
    pieces, note: null, source: ["estudio.regla", "asesor.lectura", "cobros.cuotas"], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* YA PAGUÉ — la premisa se juzga contra el libro antes de responder.  */
/* ------------------------------------------------------------------ */
function yaPagueAnswer(c: Ctx, folded: string): BankResult {
  const lines = allLines(c).filter((l) => isOut(l) && l.monthKey === c.key);
  const hit = lines.find((l) => {
    const hay = foldQ(`${l.concept} ${c.names.cat(l.categoryId)} ${c.names.sub(l.subId)}`);
    return hay.split(/\s+/).some((w) => w.length >= 4 && folded.includes(w));
  });
  if (hit) {
    // OLA 9 (CAZA-TRAMPAS clase 3): dos curas. (a) La fecha se dice con
    // su precisión real: si viene de la caída de lineDate, se dice el
    // MES, no un día que nadie anotó («pagado el 2026-10-01» era la
    // caída disfrazada de pago). (b) Antes de decir «sí», se cruza la
    // ventana: si Cobros muestra ese mismo cobro venciendo adelante,
    // se dice — una sola fuente de verdad (R1), el Asesor jamás se
    // contradice con la pantalla.
    const exactDay = !!(hit.bookedOn && hit.bookedOn.startsWith(hit.monthKey));
    const dueAhead = duesWindow(c.state, 62, c.today).find((d) => {
      const hay = foldQ(d.name);
      return hay.split(/\s+/).some((w) => w.length >= 4 && folded.includes(w));
    });
    return {
      kind: "answer", family: "ya-pague",
      verdict: exactDay
        ? L(c.lang, `Sí: «${hit.concept}» está pagado — ${c.money(view(c, hit))}, el ${lineDate(hit)}.`, `Yes: "${hit.concept}" is paid — ${c.money(view(c, hit))}, on ${lineDate(hit)}.`)
        : L(c.lang, `Sí: «${hit.concept}» está pagado — ${c.money(view(c, hit))}, anotado en ${hit.monthKey} (la línea no guarda el día).`, `Yes: "${hit.concept}" is paid — ${c.money(view(c, hit))}, recorded in ${hit.monthKey} (the line keeps no day).`),
      pieces: [{ label: hit.concept, minor: view(c, hit) }],
      note: dueAhead
        ? L(c.lang, `Ojo: la ventana de Cobros muestra «${dueAhead.name}» venciendo el ${dueAhead.on} — si es el mismo cobro en su próximo ciclo, ese sigue por pagar.`, `Note: the Collections window shows "${dueAhead.name}" due on ${dueAhead.on} — if that's the same charge in its next cycle, that one is still to pay.`)
        : null,
      source: ["libros.lineas", "cobros.cuotas"], lines: 1,
    };
  }
  const due = duesWindow(c.state, 62, c.today).find((d) => {
    const hay = foldQ(d.name);
    return hay.split(/\s+/).some((w) => w.length >= 4 && folded.includes(w));
  });
  if (due) {
    return {
      kind: "answer", family: "ya-pague",
      verdict: L(c.lang, `Todavía no: «${due.name}» sigue por pagar — ${c.money(due.amt ?? 0)}, vence el ${due.on}.`, `Not yet: "${due.name}" is still to pay — ${c.money(due.amt ?? 0)}, due ${due.on}.`),
      pieces: [{ label: due.name, minor: due.amt ?? 0 }],
      note: null, source: ["cobros.cuotas"], lines: 0,
    };
  }
  return {
    kind: "answer", family: "ya-pague",
    verdict: L(c.lang, "No lo encuentro pagado este mes ni anotado como deuda viva: si lo pagaste fuera de Faro, anótalo y la respuesta cambia.", "I don't find it paid this month or recorded as a live due: if you paid it outside Faro, record it and the answer changes."),
    pieces: [], note: null, source: ["libros.lineas", "cobros.cuotas"], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* CUENTA-ORIGEN — cuando varias cuentas pueden, el Asesor pregunta.  */
/* ------------------------------------------------------------------ */
/** El monto de la pregunta, venga de la familia que venga: parseQuestion
 * solo lo rellena para «spend» (su contrato), así que las familias que
 * calculan con monto (cuenta-origen, gustos con monto) lo leen del
 * intérprete de frases cuando el de la pregunta viene vacío. Sin esta
 * lectura, cuenta-origen era letra muerta: siempre pedía el monto. */
function amountOf(c: Ctx, raw: string, parseCtx: ParseCtx): number | null {
  const q = parseQuestion(raw, parseCtx);
  if (q?.amountMinor != null) return convertMinor(q.amountMinor, q.currency ?? c.display, c.display, c.rateE4);
  const d = parsePhrase(raw, parseCtx)[0];
  return d?.amountMinor != null ? convertMinor(d.amountMinor, d.currency ?? c.display, c.display, c.rateE4) : null;
}

function cuentaOrigenAnswer(c: Ctx, raw: string, parseCtx: ParseCtx, pinId?: string): BankResult {
  const amt = amountOf(c, raw, parseCtx);
  if (amt == null || amt <= 0) return { kind: "need-amount", family: "cuenta-origen" };
  // OLA 17: el alias de CUENTA aprendido clava el cálculo en esa
  // cuenta igual que el pin de la vuelta — «mi vaquita» es la cuenta
  // que el usuario enseñó, aunque su nombre en el libro sea otro.
  if (!pinId) {
    const learnedAcct = aliasIn(c.learned, foldQ(raw));
    if (learnedAcct?.kind === "account") pinId = learnedAcct.targetId;
  }
  const stock = savingsStock(c.state, c.key);
  const hosts = hostAccounts(c.state, c.key, stock)
    .map((h) => ({ id: h.id, libre: libreOf(stock, h.id), saldo: h.minor }))
    .filter((h) => h.saldo > 0);
  const fits = hosts.filter((h) => h.libre >= amt);
  const nameOf = (id: string) => c.names.sub(id) || id;
  // LA VUELTA DE LA PREGUNTA (fusión 1.3.355): la caja preguntó de vuelta
  // y la persona eligió la cuenta — el cálculo se clava en ESA cuenta y
  // dice su efecto entero: lo libre que queda, o cuánto toca lo apartado.
  if (pinId) {
    const host = hosts.find((h) => h.id === pinId);
    if (host) {
      if (host.libre >= amt) {
        return {
          kind: "answer", family: "cuenta-origen",
          verdict: L(c.lang, `De ${nameOf(host.id)}: salen ${c.money(amt)} de tus ${c.money(host.libre)} libres. Te quedan ${c.money(host.libre - amt)} libres y lo apartado no se toca.`, `From ${nameOf(host.id)}: ${c.money(amt)} comes out of your ${c.money(host.libre)} free. You keep ${c.money(host.libre - amt)} free and what's set aside stays untouched.`),
          pieces: [{ label: nameOf(host.id), minor: host.libre }, { label: L(c.lang, "Te quedan libres", "Free left"), minor: host.libre - amt }],
          note: null, source: ["central.tengo", "ahorros.stock"], lines: 0,
        };
      }
      if (host.saldo >= amt) {
        return {
          kind: "answer", family: "cuenta-origen",
          verdict: L(c.lang, `De ${nameOf(host.id)} solo hay ${c.money(host.libre)} libres: sacar ${c.money(amt)} toca ${c.money(amt - host.libre)} de lo apartado.`, `${nameOf(host.id)} only has ${c.money(host.libre)} free: taking ${c.money(amt)} touches ${c.money(amt - host.libre)} of what's set aside.`),
          pieces: [{ label: nameOf(host.id), minor: host.libre }],
          note: L(c.lang, "Lo apartado sigue siendo tuyo; esto solo dice que esa cuenta no lo cubre con lo libre.", "What's set aside is still yours; this only says that account can't cover it with free money."),
          source: ["central.tengo", "ahorros.stock"], lines: 0,
        };
      }
      return {
        kind: "answer", family: "cuenta-origen",
        verdict: L(c.lang, `Ni con todo el saldo de ${nameOf(host.id)} (${c.money(host.saldo)}) alcanza para ${c.money(amt)}.`, `Even ${nameOf(host.id)}'s whole balance (${c.money(host.saldo)}) doesn't cover ${c.money(amt)}.`),
        pieces: [{ label: nameOf(host.id), minor: host.saldo }],
        note: null, source: ["central.tengo", "ahorros.stock"], lines: 0,
      };
    }
  }
  if (fits.length === 1) {
    return {
      kind: "answer", family: "cuenta-origen",
      verdict: L(c.lang, `Sácalo de ${nameOf(fits[0].id)}: ahí tienes ${c.money(fits[0].libre)} libres sin tocar lo apartado.`, `Take it from ${nameOf(fits[0].id)}: you have ${c.money(fits[0].libre)} free there without touching what's set aside.`),
      pieces: fits.map((h) => ({ label: nameOf(h.id), minor: h.libre })),
      note: null, source: ["central.tengo", "ahorros.stock"], lines: 0,
    };
  }
  if (fits.length > 1) {
    return {
      kind: "ask-back", family: "cuenta-origen",
      verdict: L(c.lang, `Puedes sacarlo de más de una cuenta. ¿De cuál lo sacas?`, `More than one account can cover it. Which one should it come from?`),
      options: fits.map((h) => ({ id: h.id, label: nameOf(h.id), minor: h.libre })),
      source: ["central.tengo", "ahorros.stock"],
    };
  }
  return {
    kind: "answer", family: "cuenta-origen",
    verdict: L(c.lang, `Ninguna cuenta cubre ${c.money(amt)} sin tocar lo apartado: es lo primero que hay que saber antes de elegir cuenta.`, `No account covers ${c.money(amt)} without touching what's set aside: that's the first thing to know before choosing one.`),
    pieces: hosts.map((h) => ({ label: nameOf(h.id), minor: h.libre })),
    note: null, source: ["central.tengo", "ahorros.stock"], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* RECENCIA — una sola máquina: la línea más reciente con el filtro.  */
/* ------------------------------------------------------------------ */
function recenciaAnswer(c: Ctx, folded: string): BankResult | null {
  const lines = allLines(c);
  let pool: Line[] = [];
  let what = "";
  if (/pagaron|me pagaron|got paid|salary|salario/.test(folded) || (/ultim/.test(folded) && /ingreso|pago que recibi/.test(folded))) {
    pool = lines.filter((l) => l.kind.startsWith("income"));
    what = L(c.lang, "el último ingreso", "the last income");
  } else if (/remesa|envie|mande|sent/.test(folded)) {
    const people = c.state.remitPeople ?? [];
    const person = people.find((p) => folded.includes(foldQ(p.name)) || foldQ(p.name).split(/\s+/).some((w) => w.length >= 3 && folded.includes(w)));
    pool = lines.filter((l) => roleOf(c.state, l.categoryId) === "remittance" && (!person || recipientName(c.state, l) === person.name || l.to === person.id));
    what = person ? L(c.lang, `la última remesa a ${person.name}`, `the last remittance to ${person.name}`) : L(c.lang, "la última remesa", "the last remittance");
  } else if (/cuota/.test(folded)) {
    pool = lines.filter((l) => l.kind === "subscription" || (l.recurring && isOut(l)));
    what = L(c.lang, "el último pago de cuotas", "the last dues payment");
  } else if (filterOf(c, folded) || /pague|pago|paid|pay/.test(folded)) {
    // RECENCIA AMPLIA (ola 2, especímenes del 2026-11-21): «la última
    // vez que pagué X» ya no vive solo en los cajones fijos — X se
    // resuelve con el MISMO filtro de historia (palabra entera) y, si
    // el filtro no nombra nada, con una palabra del concepto de la
    // línea. Lo que no resuelve cae al registro general, no al silencio.
    const filter = filterOf(c, folded);
    const outs = lines.filter((l) => isOut(l));
    pool = filter ? outs.filter((l) => filter(l)) : outs.filter((l) =>
      foldQ(l.concept).split(/[^a-z0-9]+/).some((w) => w.length >= 5 && new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(folded)));
    if (pool.length) what = L(c.lang, "la última vez de eso", "the last time of that");
    // OLA 9 (CAZA-DIARIA C1, el peor crimen de la caza): la caída era
    // TODO el stream — «¿cuál fue la última cosa que pagué?» presentó
    // un INGRESO («Negocio propio») como pago. La caída de una pregunta
    // de pago respeta su dirección: cae a los pagos, jamás al stream.
    else { pool = outs; what = L(c.lang, "el último pago", "the last payment"); }
  } else if (/tienda|store/.test(folded)) {
    pool = lines.filter((l) => l.kind === "purchase" && !!l.storeId);
    what = L(c.lang, "la última tienda", "the last store");
  } else if (/compre|compra|bought|purchase/.test(folded)) {
    pool = lines.filter((l) => l.kind === "purchase");
    what = L(c.lang, "la última compra", "the last purchase");
  } else {
    // OLA 9: una acción que el libro no registra como clase (presté,
    // vendí, regalé, cobré) no se disfraza con «el último registro»:
    // ante «¿cuándo presté?» el stream entero respondía con un ingreso.
    // La clase pedida no vive aquí → silencio honesto.
    if (/(prest|vendi|vend|regal|alquil|cobre|lend| lent|borrow|sold|gave away|rented)/.test(folded)) return null;
    pool = lines;
    what = L(c.lang, "el último registro", "the last entry");
  }
  const last = pool.sort((a, b) => lineDate(b).localeCompare(lineDate(a)) || b.id.localeCompare(a.id))[0];
  if (!last) return null;
  const store = last.storeId ? c.names.catalog(last.storeId) : "";
  // La fecha se dice con su precisión real: si viene de la caída de
  // lineDate (la línea no trae día dentro de su mes), se dice el MES —
  // jamás un día inventado por la caída (la misma cura que ya-pagué).
  const exactDay = !!(last.bookedOn && last.bookedOn.startsWith(last.monthKey));
  const when = exactDay ? lineDate(last) : last.monthKey;
  const verdict = store && /tienda|store/.test(folded)
    ? L(c.lang, `Tu última tienda fue ${store}: «${last.concept}», ${c.money(view(c, last))}, el ${when}.`, `Your last store was ${store}: "${last.concept}", ${c.money(view(c, last))}, on ${when}.`)
    : L(c.lang, `Esto fue ${what}: «${last.concept}», ${c.money(view(c, last))}, el ${when}.`, `This was ${what}: "${last.concept}", ${c.money(view(c, last))}, on ${when}.`);
  return {
    kind: "answer", family: "recencia", verdict,
    pieces: [{ label: last.concept, minor: view(c, last) }],
    note: null, source: ["historial.stream"], lines: 1,
  };
}

/* ------------------------------------------------------------------ */
/* CONTEO — ¿cuántas/cuántos X tengo? (ola 2, 2026-11-21). El molde   */
/* de Oscar fue «¿cuántas cuotas estoy pagando?», y se generaliza a   */
/* todo ciudadano contable del mapa: cuotas, tarjetas, préstamos,     */
/* personas que deben, cuentas. Contar también es una cifra: sale     */
/* del mismo motor que la pantalla que lista al ciudadano.            */
/* ------------------------------------------------------------------ */
function conteoAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(cuantas?|cuantos|how many)/.test(folded)) return null;
  if (/cuota|suscripcion|subscription|dues/.test(folded)) {
    const latest = new Map<string, Line>();
    for (const l of allLines(c)) {
      if (l.kind !== "subscription") continue;
      const k = l.seriesId || l.id;
      const prev = latest.get(k);
      if (!prev || lineDate(l) >= lineDate(prev)) latest.set(k, l);
    }
    const series = [...latest.values()].sort((a, b) => view(c, b) - view(c, a));
    const total = series.reduce((a, l) => a + view(c, l), 0);
    return {
      kind: "answer", family: "conteo",
      verdict: series.length
        ? L(c.lang, `Estás pagando ${series.length} cuota${series.length === 1 ? "" : "s"}: suman ${c.money(total)} por cobro.`, `You're paying ${series.length} due${series.length === 1 ? "" : "s"}: they add up to ${c.money(total)} per charge.`)
        : L(c.lang, "No estás pagando ninguna cuota anotada: no hay suscripciones vivas en el libro.", "You're not paying any recorded dues: there are no live subscriptions in the book."),
      pieces: series.slice(0, 5).map((l) => ({ label: l.concept, minor: view(c, l) })),
      note: series.length > 5 ? L(c.lang, `Y ${series.length - 5} más, en Cobros → Cuotas.`, `And ${series.length - 5} more, in Collections → Dues.`) : null,
      source: ["cobros.cuotas", "libros.lineas"], lines: series.length,
    };
  }
  if (/tarjeta|card/.test(folded)) {
    const cards = cardsOf(c.state);
    return {
      kind: "answer", family: "conteo",
      verdict: L(c.lang, `Tienes ${cards.length} tarjeta${cards.length === 1 ? "" : "s"} anotada${cards.length === 1 ? "" : "s"}.`, `You have ${cards.length} recorded card${cards.length === 1 ? "" : "s"}.`),
      pieces: cards.slice(0, 5).map((card) => ({ label: card.name, minor: cardFigures(c.state, card, c.today).balance })),
      note: null, source: ["cobros.tarjetas"], lines: cards.length,
    };
  }
  if (/prestamo|loan/.test(folded) && /debo|deuda|owe|borrowed/.test(folded)) {
    const loans = loansOf(c.state).filter((x) => !x.archived);
    return {
      kind: "answer", family: "conteo",
      verdict: L(c.lang, `Tienes ${loans.length} préstamo${loans.length === 1 ? "" : "s"} recibido${loans.length === 1 ? "" : "s"} anotado${loans.length === 1 ? "" : "s"}.`, `You have ${loans.length} recorded loan${loans.length === 1 ? "" : "s"} you took.`),
      pieces: loans.slice(0, 5).map((x) => ({ label: x.lender, minor: 0 })),
      note: null, source: ["cobros.debo"], lines: loans.length,
    };
  }
  if (/persona|gente|people|who/.test(folded) || /me deben|me debe/.test(folded)) {
    const lent = lentOf(c.state).filter((x) => !x.archived);
    return {
      kind: "answer", family: "conteo",
      verdict: L(c.lang, `Te deben ${lent.length} persona${lent.length === 1 ? "" : "s"} con préstamo vivo.`, `${lent.length} ${lent.length === 1 ? "person owes" : "people owe"} you with a live loan.`),
      pieces: lent.slice(0, 5).map((x) => ({ label: x.person, minor: 0 })),
      note: null, source: ["cobros.mideben"], lines: lent.length,
    };
  }
  if (/cuenta|account/.test(folded)) {
    const stock = savingsStock(c.state, c.key);
    const hosts = hostAccounts(c.state, c.key, stock);
    return {
      kind: "answer", family: "conteo",
      verdict: L(c.lang, `Tienes ${hosts.length} cuenta${hosts.length === 1 ? "" : "s"} con saldo anotado.`, `You have ${hosts.length} account${hosts.length === 1 ? "" : "s"} with a recorded balance.`),
      pieces: hosts.slice(0, 5).map((h) => ({ label: c.names.sub(h.id) || h.id, minor: h.minor })),
      note: null, source: ["central.tengo"], lines: hosts.length,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* EXTREMOS — el superlativo sobre las líneas (ola 2, 2026-11-21).    */
/* «¿Cuál ha sido el gasto más grande / más pequeño que he hecho?»    */
/* se generaliza: (mayor × menor) × (gasto × compra × ingreso ×       */
/* remesa × cuota) × (todo el historial × este mes × este año). La    */
/* respuesta es UNA línea del stream, con su escolta (la segunda).    */
/* ------------------------------------------------------------------ */
function extremosAnswer(c: Ctx, folded: string): BankResult | null {
  const max = /(mas grande|mayor|mas caro|mas alto|biggest|largest|most expensive|highest)/.test(folded);
  const min = /(mas pequeno|menor|mas barato|mas bajo|smallest|cheapest|lowest)/.test(folded);
  if (!max && !min) return null;
  let pool = allLines(c);
  let noun = L(c.lang, "gasto", "expense");
  if (/ingreso|entrada|earned|income/.test(folded)) { pool = pool.filter((l) => l.kind.startsWith("income")); noun = L(c.lang, "ingreso", "income"); }
  else if (/remesa|envio|sent|remittance/.test(folded)) { pool = pool.filter((l) => roleOf(c.state, l.categoryId) === "remittance"); noun = L(c.lang, "envío de remesa", "remittance send"); }
  else if (/cuota|suscripcion|subscription/.test(folded)) { pool = pool.filter((l) => l.kind === "subscription"); noun = L(c.lang, "cuota", "due"); }
  else if (/compra|purchase|bought/.test(folded)) { pool = pool.filter((l) => l.kind === "purchase"); noun = L(c.lang, "compra", "purchase"); }
  else if (/gasto|gasto|spend|expense|he hecho/.test(folded)) { pool = pool.filter((l) => isOut(l) && roleOf(c.state, l.categoryId) !== "savings"); }
  else return null;
  if (/este mes|this month/.test(folded)) pool = pool.filter((l) => l.monthKey === c.key);
  else if (/este ano|this year/.test(folded)) pool = pool.filter((l) => l.monthKey.startsWith(c.key.slice(0, 4)));
  const valued = pool.filter((l) => view(c, l) > 0).sort((a, b) => view(c, a) - view(c, b));
  if (!valued.length) return null;
  const pick = max ? valued[valued.length - 1] : valued[0];
  const runner = max ? valued[valued.length - 2] : valued[1];
  const scope = /este mes|this month/.test(folded) ? L(c.lang, "este mes", "this month") : /este ano|this year/.test(folded) ? L(c.lang, "este año", "this year") : L(c.lang, "en todo tu historial", "in your whole history");
  return {
    kind: "answer", family: "extremos",
    verdict: L(c.lang, `Tu ${noun} ${max ? "más grande" : "más pequeño"} ${scope} fue «${pick.concept}»: ${c.money(view(c, pick))}, el ${lineDate(pick)}.`, `Your ${max ? "biggest" : "smallest"} ${noun} ${scope} was "${pick.concept}": ${c.money(view(c, pick))}, on ${lineDate(pick)}.`),
    pieces: [
      { label: pick.concept, minor: view(c, pick) },
      ...(runner ? [{ label: L(c.lang, max ? "El segundo" : "El siguiente", max ? "The runner-up" : "The next one"), minor: view(c, runner) }] : []),
    ],
    note: null, source: ["historial.stream", "libros.lineas"], lines: valued.length,
  };
}

/* ------------------------------------------------------------------ */
/* AGENDA — lo que viene, desde la misma ventana de Cobros.           */
/* ------------------------------------------------------------------ */
function agendaAnswer(c: Ctx): BankResult {
  const dues = duesWindow(c.state, 31, c.today).slice().sort((a, b) => a.on.localeCompare(b.on));
  if (!dues.length) {
    return {
      kind: "answer", family: "agenda",
      verdict: L(c.lang, "No viene ninguna cuota en los próximos 31 días: la ventana de Cobros está vacía.", "No dues come up in the next 31 days: the Collections window is empty."),
      pieces: [], note: null, source: ["cobros.cuotas", "central.gastare"], lines: 0,
    };
  }
  const first = dues.slice(0, 5);
  return {
    kind: "answer", family: "agenda",
    verdict: L(c.lang, `Lo primero que viene es «${first[0].name}», el ${first[0].on}, por ${c.money(first[0].amt ?? 0)}.`, `The first thing ahead is "${first[0].name}", on ${first[0].on}, for ${c.money(first[0].amt ?? 0)}.`),
    pieces: first.map((d) => ({ label: `${d.name} · ${d.on}`, minor: d.amt ?? 0 })),
    note: dues.length > first.length
      ? L(c.lang, `Y ${dues.length - first.length} más dentro de los 31 días.`, `And ${dues.length - first.length} more within the 31 days.`)
      : null,
    source: ["cobros.cuotas", "central.gastare"], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* RANKING — el primero del motor, con el segundo a la vista.         */
/* ------------------------------------------------------------------ */
function rankingAnswer(c: Ctx, folded: string): BankResult | null {
  if (/me debe|owes me/.test(folded)) {
    const people = peopleOf(c.state, "owed", c.today).filter((p) => p.left > 0);
    if (!people.length) return null;
    return {
      kind: "answer", family: "ranking",
      verdict: L(c.lang, `Quien más te debe es ${people[0].name}: ${c.money(people[0].left)}.`, `The one who owes you the most is ${people[0].name}: ${c.money(people[0].left)}.`),
      pieces: people.slice(0, 3).map((p) => ({ label: p.name, minor: p.left })),
      note: null, source: ["cobros.mideben"], lines: 0,
    };
  }
  if (/debo|cuenta|tarjeta|i owe|card|account/.test(folded)) {
    const cards = cardsOf(c.state).map((card) => ({ name: card.name, bal: cardFigures(c.state, card, c.today).balance }))
      .filter((x) => x.bal > 0).sort((a, b) => b.bal - a.bal);
    const lenders = peopleOf(c.state, "owe", c.today).filter((p) => p.left > 0);
    if (cards.length && (!lenders.length || cards[0].bal >= (lenders[0]?.left ?? 0))) {
      return {
        kind: "answer", family: "ranking",
        verdict: L(c.lang, `Donde más debes es la tarjeta ${cards[0].name}: ${c.money(cards[0].bal)}.`, `Where you owe the most is the ${cards[0].name} card: ${c.money(cards[0].bal)}.`),
        pieces: cards.slice(0, 3).map((x) => ({ label: x.name, minor: x.bal })),
        note: null, source: ["cobros.tarjetas", "cobros.debo"], lines: 0,
      };
    }
    if (lenders.length) {
      return {
        kind: "answer", family: "ranking",
        verdict: L(c.lang, `Donde más debes es con ${lenders[0].name}: ${c.money(lenders[0].left)}.`, `Where you owe the most is with ${lenders[0].name}: ${c.money(lenders[0].left)}.`),
        pieces: lenders.slice(0, 3).map((p) => ({ label: p.name, minor: p.left })),
        note: null, source: ["cobros.debo"], lines: 0,
      };
    }
    return null;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* HISTORIA — período × filtro, sumando líneas; $0 también responde.  */
/* ------------------------------------------------------------------ */
export type Period = { kind: "month"; key: string; label: string } | { kind: "range"; from: string; to: string; label: string } | { kind: "year"; year: string; label: string };
const MONTH_NAMES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
const MONTH_LABELS: Record<string, [string, string]> = {
  "1": ["enero", "January"], "2": ["febrero", "February"], "3": ["marzo", "March"], "4": ["abril", "April"], "5": ["mayo", "May"], "6": ["junio", "June"], "7": ["julio", "July"], "8": ["agosto", "August"], "9": ["septiembre", "September"], "10": ["octubre", "October"], "11": ["noviembre", "November"], "12": ["diciembre", "December"],
};

function shiftKey(key: string, deltaMonths: number): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) + deltaMonths;
  const yy = y + Math.floor((m - 1) / 12);
  const mm = ((m - 1) % 12 + 12) % 12 + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}

function periodOf(c: Ctx, folded: string): Period {
  // OLA 9 (cura de las cazas TIEMPO C-clase 1 y DIARIA C2): el mes
  // NOMBRADO se resuelve a ese mes — jamás cae al mes en curso en
  // silencio. «¿Cuánto gasté en septiembre?» respondía octubre
  // etiquetado «este mes»: un invento. Ahora: el mes nombrado manda
  // (su ocurrencia más reciente), y «hace N meses» desplaza de verdad.
  const named = folded.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (named) {
    const mm = MONTH_NAMES[named[1]];
    const curY = Number(c.key.slice(0, 4));
    const curM = Number(c.key.slice(5, 7));
    const year = mm > curM ? curY - 1 : curY;
    const key = `${year}-${String(mm).padStart(2, "0")}`;
    const [es, en] = MONTH_LABELS[String(mm)];
    return { kind: "month", key, label: L(c.lang, `${es} de ${year}`, `${en} ${year}`) };
  }
  const hace = folded.match(/hace (\d+|dos|tres|cuatro|cinco|seis|ocho|doce|two|three|four|five|six|eight|twelve) meses?\b/) ?? folded.match(/(\d+) months? ago/);
  if (hace) {
    const n = Number(hace[1]) || WORD_NUM[hace[1]] || 0;
    if (n >= 1) {
      const key = shiftKey(c.key, -n);
      return { kind: "month", key, label: L(c.lang, `hace ${n} meses (${key})`, `${n} months ago (${key})`) };
    }
  }
  if (/mes pasado|el ultimo mes|last month/.test(folded)) {
    const k = prevKey(c.key);
    return { kind: "month", key: k, label: L(c.lang, "el mes pasado", "last month") };
  }
  if (/semana pasada|last week/.test(folded)) {
    const anchor = new Date(`${c.today}T12:00:00`);
    anchor.setDate(anchor.getDate() - 7);
    const r = periodRange("week", anchor.toISOString().slice(0, 10), 1);
    return { kind: "range", ...r, label: L(c.lang, "la semana pasada", "last week") };
  }
  if (/semana|week/.test(folded)) {
    const r = periodRange("week", c.today, 1);
    return { kind: "range", ...r, label: L(c.lang, "esta semana", "this week") };
  }
  if (/\bano\b|este ano|this year/.test(folded)) {
    return { kind: "year", year: c.key.slice(0, 4), label: L(c.lang, "este año", "this year") };
  }
  return { kind: "month", key: c.key, label: L(c.lang, "este mes", "this month") };
}

function inPeriod(c: Ctx, l: Line, p: Period): boolean {
  if (p.kind === "month") return l.monthKey === p.key;
  if (p.kind === "year") return l.monthKey.startsWith(p.year);
  const d = lineDate(l);
  return d >= p.from && d <= p.to;
}

/** El filtro dónde/quién de historia y comparar: una categoría, una
 * tienda, el rol de remesas, o «tiendas» = todas las compras. Devuelve
 * el predicado Y su descriptor (§20): el marco del seguimiento guarda
 * el descriptor — dato, no cierre — y reconstruye el predicado cuando
 * un seguimiento lo estrecha. Solo los filtros con nombre de la
 * estructura tienen descriptor; las clases (suscripciones, compras),
 * la palabra aprendida y los conceptos libres filtran igual, pero su
 * respuesta no deja marco estrechable — dejarlo sería mentir el pool
 * del seguimiento (la partición exacta de §20 manda). */
type FilterHit = { fn: (l: Line) => boolean; desc: AskFrameFilter };
function filterDescOf(c: Ctx, folded: string): FilterHit | null {
  if (/tiendas|stores/.test(folded)) return { fn: (l) => l.kind === "purchase", desc: { kind: "tiendas", label: L(c.lang, "tiendas", "stores") } };
  if (/remesa/.test(folded)) return { fn: (l) => roleOf(c.state, l.categoryId) === "remittance", desc: { kind: "remit", label: L(c.lang, "remesas", "remittances") } };
  let best: { len: number; hit: FilterHit } | null = null;
  const consider = (label: string, hit: FilterHit) => {
    const f = foldQ(label).trim();
    // Palabra ENTERA, jamás subcadena: «gas» vive dentro de «gasté» y
    // casar por subcadena convierte cada pregunta de gasto en un filtro
    // de gas (la trampa cazada por el banco de esta rama, 2026-11-20).
    const whole = new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    if (f.length >= 3 && whole.test(folded) && (!best || f.length > best.len)) best = { len: f.length, hit };
  };
  for (const cat of c.state.structure.categories) {
    consider(c.names.cat(cat.id), { fn: (l) => l.categoryId === cat.id, desc: { kind: "category", id: cat.id, label: c.names.cat(cat.id) } });
    for (const s of cat.subs) consider(c.names.sub(s.id), { fn: (l) => l.subId === s.id, desc: { kind: "sub", id: s.id, label: c.names.sub(s.id) } });
  }
  for (const p of c.state.structure.purchases) consider(c.names.purchase(p.id), { fn: (l) => l.kind === "purchase" && l.categoryId === p.id, desc: { kind: "purchase-cat", id: p.id, label: c.names.purchase(p.id) } });
  for (const item of c.state.structure.catalog) consider(c.names.catalog(item.id), { fn: (l) => l.storeId === item.id, desc: { kind: "store", id: item.id, label: c.names.catalog(item.id) } });
  return best ? (best as { hit: FilterHit }).hit : null;
}

/** El predicado de un descriptor guardado en un marco (§20). */
function filterFromDesc(c: Ctx, d: AskFrameFilter): (l: Line) => boolean {
  switch (d.kind) {
    case "category": return (l) => l.categoryId === d.id;
    case "sub": return (l) => l.subId === d.id;
    case "store": return (l) => l.storeId === d.id;
    case "purchase-cat": return (l) => l.kind === "purchase" && l.categoryId === d.id;
    case "remit": return (l) => roleOf(c.state, l.categoryId) === "remittance";
    case "tiendas": return (l) => l.kind === "purchase";
  }
}

/** El filtro PLENO de la cascada (el de filterOf de siempre, con las
 * clases de la Ola 12, la palabra aprendida de la Ola 11 y los
 * conceptos libres), llevando además el descriptor cuando el filtro
 * que ganó es uno de los nombrables — para que historia deje su
 * marco sin cambiar ni una cifra de su pool. */
function filterHitOf(c: Ctx, folded: string): { fn: (l: Line) => boolean; desc: AskFrameFilter | null } | null {
  if (/tiendas|stores/.test(folded)) return { fn: (l) => l.kind === "purchase", desc: { kind: "tiendas", label: L(c.lang, "tiendas", "stores") } };
  if (/remesa/.test(folded)) return { fn: (l) => roleOf(c.state, l.categoryId) === "remittance", desc: { kind: "remit", label: L(c.lang, "remesas", "remittances") } };
  // OLA 12: «suscripciones» es una CLASE de línea, no un nombre — el
  // mundo pregunta «¿cuánto gasto en suscripciones?» y el escaneo de
  // nombres no la encontraba: la respuesta salía con el gasto entero,
  // disfrazado de filtro (batería del mundo).
  if (/suscrip/.test(folded)) return { fn: (l) => l.kind === "subscription", desc: null };
  if (/compras|purchases|shopping/.test(folded)) return { fn: (l) => l.kind === "purchase", desc: null };
  // OLA 11: la palabra APRENDIDA del usuario manda sobre el escaneo de
  // nombres — si él llama «la luz» a los servicios y lo confirmó con
  // su toque, su palabra ES el nombre de ese ciudadano en su libro.
  const learned = aliasIn(c.learned, folded);
  if (learned && (learned.kind === "sub" || learned.kind === "cat")) {
    return learned.kind === "sub"
      ? { fn: (l) => l.subId === learned.targetId, desc: null }
      : { fn: (l) => l.categoryId === learned.targetId, desc: null };
  }
  let best: { len: number; hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null } } | null = null;
  const consider = (label: string, hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null }) => {
    const f = foldQ(label).trim();
    // Palabra ENTERA, jamás subcadena: «gas» vive dentro de «gasté» y
    // casar por subcadena convierte cada pregunta de gasto en un filtro
    // de gas (la trampa cazada por el banco de esta rama, 2026-11-20).
    const whole = new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    if (f.length >= 3 && whole.test(folded) && (!best || f.length > best.len)) best = { len: f.length, hit };
  };
  for (const cat of c.state.structure.categories) {
    consider(c.names.cat(cat.id), { fn: (l) => l.categoryId === cat.id, desc: { kind: "category", id: cat.id, label: c.names.cat(cat.id) } });
    for (const s of cat.subs) consider(c.names.sub(s.id), { fn: (l) => l.subId === s.id, desc: { kind: "sub", id: s.id, label: c.names.sub(s.id) } });
  }
  for (const p of c.state.structure.purchases) consider(c.names.purchase(p.id), { fn: (l) => l.kind === "purchase" && l.categoryId === p.id, desc: { kind: "purchase-cat", id: p.id, label: c.names.purchase(p.id) } });
  for (const item of c.state.structure.catalog) consider(c.names.catalog(item.id), { fn: (l) => l.storeId === item.id, desc: { kind: "store", id: item.id, label: c.names.catalog(item.id) } });
  // OLA 12: los CONCEPTOS libres también son ciudadanos del filtro —
  // «el súper», «los zapatos» viven como concepto de sus líneas, no
  // como nombre de la estructura, y la batería del mundo los preguntaba
  // recibiendo el gasto entero. Palabra entera, el más largo manda,
  // como todo el escaneo.
  for (const l of allLines(c)) {
    if (l.concept) consider(l.concept, { fn: (x) => x.concept === l.concept, desc: null });
  }
  return best ? (best as { hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null } }).hit : null;
}

function filterOf(c: Ctx, folded: string): ((l: Line) => boolean) | null {
  return filterHitOf(c, folded)?.fn ?? null;
}

const STRAY_STOP = new Set(["mes", "ano", "semana", "dia", "dias", "total", "eso", "esto", "esta", "este", "promedio", "pasado", "pasada", "ultimo", "ultima", "general", "cuenta", "month", "year", "week", "day", "average", "last", "the", "una", "uno", "del", "las", "los", "que", "como", "cuando", "donde", "cual", "quien", "todo", "toda", "todos", "hace", "desde", "entre", "sobre", "para", "con", "sin", "por", "mis", "tus", "sus", "fue", "era", "son", "mas", "menos", "muy", "tan", "hoy", "ayer", "manana", "siempre", "nunca", "veces", "vez", "parte", "mitad", "doble", "resto", "otros", "otras", "otro", "otra", "cada", "mismo", "misma", "solo", "sola", "bien", "mal", "mejor", "peor", "antes", "despues", "ahora", "luego", "pronto", "tarde", "temprano", "casi", "mucho", "poco", "nada", "algo", "alguien", "nadie", "ningun", "ninguna", "cualquier", "cualquiera", "demas", "propio", "propia", "cierto", "cierta", "seguro", "segura", "posible", "favor", "gracias", "hola", "bueno", "buena", "buenos", "buenas", "dia"]);

/** OLA 12 — LA HONESTIDAD DEL FILTRO: la palabra que la pregunta pone
 * en forma de filtro («en comida», «de juguetes») y que no casa con
 * NINGÚN ciudadano del libro. Sin esta cerca, historia respondía el
 * gasto ENTERO disfrazado de respuesta al filtro — la mentira más
 * ordinaria de la batería del mundo. Con ella, el Asesor dice que no
 * tiene nada anotado con ese nombre: el silencio con nombre propio. */
function strayFilterWord(c: Ctx, folded: string): string | null {
  const months = new Set(Object.keys(MONTH_NAMES));
  const re = /(?:^|\s)(?:en|de|on|in)\s+(?:el\s+|la\s+|los\s+|las\s+|the\s+)?([a-z]{3,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded)) !== null) {
    const w = m[1];
    if (!STRAY_STOP.has(w) && !months.has(w)) return w;
  }
  return null;
}

function historiaAnswer(c: Ctx, folded: string): BankResult {
  const p = periodOf(c, folded);
  const hit = filterHitOf(c, folded);
  const filter = hit?.fn ?? null;
  // OLA 12: la dirección INGRESO habla el idioma del mundo — «gané»,
  // «gano», «cobré», «mi salario» — no solo «entró/ingresó». Sin estas
  // palabras, «¿cuánto gano por día?» recibía el GASTO: la dirección
  // cruzada, peor que el silencio.
  const income = /entr|ingres|recibi|gana|gano|gane|cobr|salario|sueldo|earned|came in|salary|wage/.test(folded);
  if (!filter && !income) {
    const stray = strayFilterWord(c, folded);
    if (stray) {
      return {
        kind: "answer", family: "historia",
        verdict: L(c.lang, `No tengo nada anotado como «${stray}»: ninguna categoría, concepto ni tienda de tu libro lleva ese nombre, así que no te doy el gasto entero disfrazado de respuesta. Si lo anotas con otro nombre, pregúntame por ese.`, `I have nothing recorded as "${stray}": no category, concept or store in your book carries that name, so I won't hand you your whole spend dressed up as the answer. If you record it under another name, ask me by that one.`),
        pieces: [], note: null, source: ["libros.lineas"], lines: 0,
      };
    }
  }
  const pool = allLines(c).filter((l) => inPeriod(c, l, p) && (income ? l.kind.startsWith("income") : isOut(l) && roleOf(c.state, l.categoryId) !== "savings") && (!filter || filter(l)));
  const total = pool.reduce((a, l) => a + view(c, l), 0);
  return {
    kind: "answer", family: "historia",
    verdict: income
      ? L(c.lang, `En ${p.label} entraron ${c.money(total)}${filter ? " por ese filtro" : ""} — de ${pool.length} líneas.`, `${c.money(total)} came in ${p.label}${filter ? " under that filter" : ""} — from ${pool.length} lines.`)
      : L(c.lang, `En ${p.label} gastaste ${c.money(total)}${filter ? " en eso" : ""} — de ${pool.length} líneas.`, `In ${p.label} you spent ${c.money(total)}${filter ? " on that" : ""} — from ${pool.length} lines.`),
    pieces: [{ label: p.label, minor: total }],
    note: pool.length === 0
      ? L(c.lang, "Ninguna línea cae en ese período con ese filtro: el cero también es la respuesta del libro.", "No line falls in that period under that filter: the zero is the book's answer too.")
      : null,
    source: ["libros.lineas", "historial.stream", "estudio.flujo"], lines: pool.length,
    actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    // §20 (re-cosido en la integración, 1.3.383): la respuesta deja su
    // marco — período, dirección y filtro — para que un «¿en qué?» o
    // un «¿y en comida?» vivan de ella. Solo cuando el filtro que
    // ganó es nombrable (o no hubo filtro): un filtro de clase, de
    // concepto o de palabra aprendida no tiene descriptor fiel, y un
    // marco con el pool cambiado mentiría la partición del
    // seguimiento — en ese caso no hay marco y el seguimiento cae a
    // su lectura sola legítima (L-S1), nombrada como tal.
    ...(!hit || hit.desc ? { frame: { kind: "period1", period: p, income, filter: hit?.desc ?? null, total } as AskFrame } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* REMESAS — el patrón: a quién, cuánto y con qué frecuencia.         */
/* ------------------------------------------------------------------ */
function remesasAnswer(c: Ctx): BankResult {
  const { rows, all } = remitByPerson(c.state, c.key);
  const withMoney = rows.filter((r) => r.all.usd + r.all.nio > 0 || r.count > 0);
  if (!withMoney.length) {
    return {
      kind: "answer", family: "remesas",
      verdict: L(c.lang, "No hay remesas anotadas: sin líneas de remesa no hay patrón que contar.", "No remittances are recorded: without remittance lines there's no pattern to tell."),
      pieces: [], note: null, source: ["remesas.personas"], lines: 0,
    };
  }
  // A23-2 (cura de la ola 23): el patrón por persona tiene sus dos casas
  // en Completo (remit.manage en Ajustes, study.remit en Estudio) — en
  // Esencial ni la tarjeta de Libros vive, y en Ritmo la Lectura habla
  // de remesas mes contra mes, que es OTRA pieza y no se toca. Debajo de
  // Completo la respuesta no entrega el patrón: dice dónde vive,
  // nombrando el piso. (El «no hay remesas» de arriba no entrega cifra
  // ninguna y se dice igual en todo modo: es la ausencia, no el patrón.)
  if (!askReaches(c.mode, "remit.manage") && !askReaches(c.mode, "study.remit")) {
    return {
      kind: "answer", family: "remesas",
      verdict: L(c.lang, `El patrón de tus remesas vive en ${modeWord(c.lang, "completo")}: en Estudio → Remesas y en Ajustes → Remesas ves a quién envías, cuánto y con qué ritmo.`, `Your remittance pattern lives in ${modeWord(c.lang, "completo")}: in Study → Remittances and Settings → Remittances you see who you send to, how much, and at what pace.`),
      pieces: [], note: null, source: ["remesas.personas"], lines: 0,
    };
  }
  const displayPair = (r: (typeof rows)[number]) => (c.display === "USD" ? r.all.usd : r.all.nio);
  const top = withMoney[0];
  const hist = remitHistory(c.state, top.id);
  const months = new Set(hist.map((h) => h.monthKey)).size || 1;
  const avg = Math.round(hist.reduce((a, h) => a + convertMinor(h.amountMinor, h.currency, c.display, c.rateE4), 0) / months);
  return {
    kind: "answer", family: "remesas",
    verdict: L(c.lang, `Tu remesa mayor es para ${top.person?.name ?? L(c.lang, "Sin persona", "No person")}: ${c.money(displayPair(top))} en total, con un ritmo de ${c.money(avg)} por mes con envíos.`, `Your biggest remittance goes to ${top.person?.name ?? "No person"}: ${c.money(displayPair(top))} in total, at a pace of ${c.money(avg)} per month with sends.`),
    pieces: withMoney.slice(0, 4).map((r) => ({ label: r.person?.name ?? L(c.lang, "Sin persona", "No person"), minor: displayPair(r) })),
    note: L(c.lang, `En total, todas las remesas suman ${c.money(c.display === "USD" ? all.usd : all.nio)}. El promedio cuenta solo los meses con envíos.`, `In total, all remittances add up to ${c.money(c.display === "USD" ? all.usd : all.nio)}. The average counts only months with sends.`),
    source: ["remesas.personas", "asesor.lectura"], lines: withMoney.reduce((a, r) => a + r.count, 0),
    actions: reportDoor(c, "remesas.personas", "Verlo en Remesas", "See it in Remittances"),
  };
}

/* ------------------------------------------------------------------ */
/* COMPARAR — dos patas del mismo motor, lado a lado.                 */
/* ------------------------------------------------------------------ */
function compararAnswer(c: Ctx, folded: string): BankResult | null {
  // OLA 18 (batería II): «¿gasté mucho este mes?» es una comparación
  // sin segundo término nombrado — el término es su propio ingreso y
  // su propio pasado. Se responde con las dos medidas, sin adjetivos
  // inventados: el porcentaje de lo que entró y el mes pasado al lado.
  if (/(gaste|gastando|gasto|gastar|gastos) (mucho|poco|demasiado)|es mucho lo que (gasto|gaste)|spend (a lot|too much)|spending (a lot|too much)/.test(folded)) {
    const now = summarize(c.state, c.key, c.lang);
    const before = summarize(c.state, prevKey(c.key), c.lang);
    const pct = now.income > 0 ? Math.round((now.spend / now.income) * 100) : null;
    return {
      kind: "answer", family: "comparar",
      verdict: L(c.lang, `Este mes has gastado ${c.money(now.spend)}${pct !== null ? ` — el ${pct}% de los ${c.money(now.income)} que entraron` : ""}. El mes pasado gastaste ${c.money(before.spend)}: ${now.spend === before.spend ? "van parejos" : now.spend > before.spend ? `${c.money(now.spend - before.spend)} más` : `${c.money(before.spend - now.spend)} menos`}. Si es mucho o poco, con esas dos medidas lo juzgas tú: yo no te vendo un adjetivo.`, `This month you've spent ${c.money(now.spend)}${pct !== null ? ` — ${pct}% of the ${c.money(now.income)} that came in` : ""}. Last month you spent ${c.money(before.spend)}: ${now.spend === before.spend ? "they're tied" : now.spend > before.spend ? `${c.money(now.spend - before.spend)} more` : `${c.money(before.spend - now.spend)} less`}. Whether that's a lot or a little, with those two measures you judge it: I won't sell you an adjective.`),
      pieces: [{ label: L(c.lang, "Este mes", "This month"), minor: now.spend }, { label: L(c.lang, "Mes pasado", "Last month"), minor: before.spend }],
      note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  // OLA 12b — DOS FILTROS, UN FILTRO CONTRA SU PASADO, EL MEJOR MES.
  {
    const halves = folded.split(/ o | or /);
    if (halves.length === 2 && /(gast|spend|compr|pago)/.test(folded)) {
      const f1 = filterOf(c, halves[0]);
      const f2 = filterOf(c, halves[1]);
      if (f1 && f2) {
        const t = (f: (l: Line) => boolean) => allLines(c).filter((l) => l.monthKey === c.key && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && f(l)).reduce((a, l) => a + view(c, l), 0);
        const [t1, t2] = [t(f1), t(f2)];
        if (t1 + t2 > 0) {
          return {
            kind: "answer", family: "comparar",
            verdict: L(c.lang, `Este mes: el primer lado suma ${c.money(t1)} y el segundo ${c.money(t2)} — ${t1 === t2 ? "van parejos" : `gana el ${t1 > t2 ? "primero" : "segundo"} por ${c.money(Math.abs(t1 - t2))}`}.`, `This month: the first side adds up to ${c.money(t1)} and the second ${c.money(t2)} — ${t1 === t2 ? "they're tied" : `the ${t1 > t2 ? "first" : "second"} wins by ${c.money(Math.abs(t1 - t2))}`}.`),
            pieces: [{ label: L(c.lang, "Primer lado", "First side"), minor: t1 }, { label: L(c.lang, "Segundo lado", "Second side"), minor: t2 }],
            note: L(c.lang, "Cada lado es el filtro que su nombre resuelve en tu libro; si un nombre no es el que esperabas, pregúntame por el otro.", "Each side is the filter its name resolves to in your book; if a name isn't the one you meant, ask me by the other."),
            source: ["libros.lineas", "estudio.flujo"], lines: 0,
            actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
          };
        }
      }
    }
    const filterT = filterOf(c, folded);
    if (filterT && /(mas que antes|mas que el (mes )?pasado|gastando mas|ha subido|gaste mas que|more than (before|last)|spending more)/.test(folded)) {
      const t = (key: string) => allLines(c).filter((l) => l.monthKey === key && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && filterT(l)).reduce((a, l) => a + view(c, l), 0);
      const [now, before] = [t(c.key), t(prevKey(c.key))];
      return {
        kind: "answer", family: "comparar",
        verdict: L(c.lang, `En eso: este mes ${c.money(now)}, el mes pasado ${c.money(before)} — ${now === before ? "lo mismo" : now > before ? `${c.money(now - before)} más` : `${c.money(before - now)} menos`} que el pasado.`, `On that: this month ${c.money(now)}, last month ${c.money(before)} — ${now === before ? "the same" : now > before ? `${c.money(now - before)} more` : `${c.money(before - now)} less`} than last month.`),
        pieces: [{ label: L(c.lang, "Este mes", "This month"), minor: now }, { label: L(c.lang, "Mes pasado", "Last month"), minor: before }],
        note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
        actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
      };
    }
    if (/(en que mes|mejor mes|peor mes|best month|worst month)/.test(folded)) {
      const keys = Object.keys(c.state.months).filter((k) => k <= c.key).sort();
      if (keys.length >= 2) {
        const bySpend = /(gaste mas|gaste menos|spent (the )?most|spent (the )?least)/.test(folded);
        const scored = keys.map((k) => {
          const s = summarize(c.state, k, c.lang);
          return { k, v: bySpend ? s.spend : s.income - s.spend };
        });
        const best = [...scored].sort((a, b) => b.v - a.v)[0];
        const lbl = (k: string) => `${MONTH_LABELS[k.slice(5, 7).replace(/^0/, "")][c.lang === "en" ? 1 : 0]} ${k.slice(0, 4)}`;
        return {
          kind: "answer", family: "comparar",
          verdict: bySpend
            ? L(c.lang, `El mes en que más gastaste fue ${lbl(best.k)}: ${c.money(best.v)}.`, `Your biggest spending month was ${lbl(best.k)}: ${c.money(best.v)}.`)
            : L(c.lang, `El mes en que mejor te fue fue ${lbl(best.k)}: entraron ${c.money(best.v)} más de lo que salió (la diferencia entre lo que entró y lo que gastaste).`, `Your best month was ${lbl(best.k)}: ${c.money(best.v)} more came in than went out (the gap between what came in and what you spent).`),
          pieces: scored.map((s) => ({ label: lbl(s.k), minor: s.v })),
          note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
          actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
        };
      }
    }
  }
  // OLA 12 — LAS COMPARACIONES DEL MUNDO: el ingreso contra el gasto,
  // la diferencia pedida a secas, dos meses nombrados, y el «¿voy
  // mejor o peor?» a igual tramo.
  if (/(gano mas de lo que gasto|gasto mas de lo que (gano|entra)|gastando mas de lo que gano|gano mas o gasto mas|earn more than i spend|spend more than i (earn|make)|more than i earn|mas de lo que (gano|entra))/.test(folded)) {
    const sum = summarize(c.state, c.key, c.lang);
    const ahead = sum.income >= sum.spend;
    return {
      kind: "answer", family: "comparar",
      verdict: ahead
        ? L(c.lang, `Ganas más de lo que gastas: entraron ${c.money(sum.income)} y salieron ${c.money(sum.spend)} — te quedan ${c.money(sum.income - sum.spend)} de este mes.`, `You earn more than you spend: ${c.money(sum.income)} came in and ${c.money(sum.spend)} went out — ${c.money(sum.income - sum.spend)} left this month.`)
        : L(c.lang, `Estás gastando más de lo que gana el mes: entraron ${c.money(sum.income)} y salieron ${c.money(sum.spend)} — ${c.money(sum.spend - sum.income)} por encima.`, `You're spending more than the month earns: ${c.money(sum.income)} came in and ${c.money(sum.spend)} went out — ${c.money(sum.spend - sum.income)} over.`),
      pieces: [{ label: L(c.lang, "Entró", "Came in"), minor: sum.income }, { label: L(c.lang, "Salió", "Went out"), minor: sum.spend }],
      note: null, source: ["libros.lineas", "libros.neto"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  if (/(mejor o peor|voy mejor|voy peor|better or worse|am i doing better)/.test(folded)) {
    const day = Number(c.today.slice(8, 10));
    const soFar = (key: string) => allLines(c).filter((l) => l.monthKey === key && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && Number(lineDate(l).slice(8, 10)) <= day).reduce((a, l) => a + view(c, l), 0);
    const a = soFar(c.key);
    const b = soFar(prevKey(c.key));
    const better = a <= b;
    return {
      kind: "answer", family: "comparar",
      verdict: L(c.lang, `A igual tramo (día ${day} contra día ${day}), vas ${better ? "mejor" : "peor"} que el mes pasado: llevas ${c.money(a)} de gasto contra ${c.money(b)} a estas alturas del pasado.`, `At the same stretch (day ${day} vs day ${day}), you're doing ${better ? "better" : "worse"} than last month: ${c.money(a)} spent so far vs ${c.money(b)} at this point last month.`),
      pieces: [{ label: L(c.lang, "Este mes, al día " + day, "This month, by day " + day), minor: a }, { label: L(c.lang, "El pasado, al día " + day, "Last month, by day " + day), minor: b }],
      note: L(c.lang, "Mejor o peor se mide aquí solo por el gasto a igual tramo: es una pata de la comparación, dicha como tal.", "Better or worse is measured here only by spending at the same stretch: one leg of the comparison, stated as such."),
      source: ["historial.stream", "estudio.flujo"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  {
    const named: string[] = [];
    for (let i = 1; i <= 12; i++) {
      const [es, en] = MONTH_LABELS[String(i)];
      if (new RegExp(`(^|[^a-z])${es}([^a-z]|$)`).test(folded) || new RegExp(`(^|[^a-z])${en.toLowerCase()}([^a-z]|$)`).test(folded)) {
        // La ocurrencia más reciente de ese mes (la regla de periodOf).
        let y = Number(c.key.slice(0, 4));
        if (i > Number(c.key.slice(5, 7))) y -= 1;
        named.push(`${y}-${String(i).padStart(2, "0")}`);
      }
    }
    if (named.length >= 2 && /(mas|more|mayor)/.test(folded)) {
      const [k1, k2] = [named[0], named[1]];
      const s1 = summarize(c.state, k1, c.lang).spend;
      const s2 = summarize(c.state, k2, c.lang).spend;
      const lbl = (k: string) => `${MONTH_LABELS[k.slice(5, 7).replace(/^0/, "")][c.lang === "en" ? 1 : 0]} ${k.slice(0, 4)}`;
      return {
        kind: "answer", family: "comparar",
        verdict: L(c.lang, `Gastaste más en ${s1 >= s2 ? lbl(k1) : lbl(k2)}: ${c.money(Math.max(s1, s2))} contra ${c.money(Math.min(s1, s2))} (diferencia de ${c.money(Math.abs(s1 - s2))}).`, `You spent more in ${s1 >= s2 ? lbl(k1) : lbl(k2)}: ${c.money(Math.max(s1, s2))} vs ${c.money(Math.min(s1, s2))} (a difference of ${c.money(Math.abs(s1 - s2))}).`),
        pieces: [{ label: lbl(k1), minor: s1 }, { label: lbl(k2), minor: s2 }],
        note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
        actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
      };
    }
  }
  if (/(cuanto mas|cuanto menos|la diferencia|how much more|how much less|difference)/.test(folded) && /(este mes|mes pasado|this month|last month)/.test(folded) && !filterOf(c, folded)) {
    const a = summarize(c.state, c.key, c.lang);
    const b = summarize(c.state, prevKey(c.key), c.lang);
    const diff = a.spend - b.spend;
    return {
      kind: "answer", family: "comparar",
      verdict: L(c.lang, diff >= 0 ? `Gastaste ${c.money(diff)} más este mes que el pasado (${c.money(a.spend)} contra ${c.money(b.spend)}).` : `Gastaste ${c.money(-diff)} menos este mes que el pasado (${c.money(a.spend)} contra ${c.money(b.spend)}).`, diff >= 0 ? `You spent ${c.money(diff)} more this month than last (${c.money(a.spend)} vs ${c.money(b.spend)}).` : `You spent ${c.money(-diff)} less this month than last (${c.money(a.spend)} vs ${c.money(b.spend)}).`),
      pieces: [{ label: L(c.lang, "Este mes", "This month"), minor: a.spend }, { label: L(c.lang, "Mes pasado", "Last month"), minor: b.spend }],
      note: null, source: ["libros.lineas", "libros.neto"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  if (/este mes o el pasado|mes pasado|this month or last/.test(folded) && !filterOf(c, folded)) {
    const a = summarize(c.state, c.key, c.lang);
    const b = summarize(c.state, prevKey(c.key), c.lang);
    const more = a.spend >= b.spend;
    return {
      kind: "answer", family: "comparar",
      verdict: L(c.lang, `Gastaste ${more ? "más este mes" : "más el mes pasado"}: ${c.money(a.spend)} contra ${c.money(b.spend)} (diferencia de ${c.money(Math.abs(a.spend - b.spend))}).`, `You spent ${more ? "more this month" : "more last month"}: ${c.money(a.spend)} vs ${c.money(b.spend)} (a difference of ${c.money(Math.abs(a.spend - b.spend))}).`),
      pieces: [
        { label: L(c.lang, "Este mes", "This month"), minor: a.spend },
        { label: L(c.lang, "Mes pasado", "Last month"), minor: b.spend },
      ],
      note: null, source: ["libros.lineas", "libros.neto"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
      // §20 (re-cosido en la integración, 1.3.383): la comparación
      // canónica deja su marco — los dos meses y sus totales — para
      // que «¿en qué gasté más?» viva de ella.
      frame: { kind: "compare2", monthA: c.key, monthB: prevKey(c.key), labelA: L(c.lang, "este mes", "this month"), labelB: L(c.lang, "el mes pasado", "last month"), totalA: a.spend, totalB: b.spend, filter: null },
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* FUTURO — proyección con el supuesto dicho.                         */
/* ------------------------------------------------------------------ */
function futuroAnswer(c: Ctx, folded: string): BankResult | null {
  if (/termino de pagar|libre de deudas|debt[- ]free|cuando.*pagar.*deuda/.test(folded)) {
    const plan = payoffPlan(c.state, c.today);
    if (!plan.chosen || !plan.debts.length) {
      return {
        kind: "answer", family: "futuro",
        verdict: L(c.lang, "Todavía no puedo proyectarlo: no hay deudas con plan ni ritmo de abonos en los últimos 90 días. Con el primer abono anotado, la proyección nace.", "I can't project that yet: there are no planned debts and no payment pace in the last 90 days. With the first recorded payment, the projection is born."),
        pieces: [], note: null, source: ["cobros.plan"], lines: 0,
      };
    }
    // A23-1 (cura de la ola 23): las dos cifras del veredicto — la fecha
    // de quedar libre y el interés del camino — son del plan de pagos, y
    // TODAS las caras del plan son de Completo (loans.payoff-plan,
    // loans.payoff-params, advisor.plan-90). JUICIO SOBRE RITMO, con su
    // razón: la nota corta (advisor.plan-short, Ritmo) NO puede
    // responder esta pregunta con sus cifras — es el paso sugerido de
    // ESTE mes dentro de la Lectura, no la proyección de salida (meses
    // e interés total del orden elegido); ninguna cara de Ritmo enseña
    // esas dos cifras. Así que en Esencial y en Ritmo la respuesta no
    // las entrega: dice dónde vive el plan, nombrando Completo. (El
    // «todavía no puedo proyectarlo» de arriba no entrega cifra del
    // plan — es ausencia honesta y se dice igual en todo modo.)
    if (!askReaches(c.mode, "loans.payoff-plan")) {
      return {
        kind: "answer", family: "futuro",
        verdict: L(c.lang, `El plan para salir de deudas vive en ${modeWord(c.lang, "completo")}: ahí ves la fecha en que quedas libre y el interés del camino, con su supuesto dicho.`, `The debt payoff plan lives in ${modeWord(c.lang, "completo")}: there you see the date you're debt-free and the interest along the way, with its assumption stated.`),
        pieces: [], note: null, source: ["cobros.plan"], lines: 0,
      };
    }
    const when = monthAhead(plan.chosen.months, c.today);
    return {
      kind: "answer", family: "futuro",
      verdict: L(c.lang, `Con tu plan actual, quedas libre de deudas en ${when} (${plan.chosen.months} meses), pagando ${c.money(plan.chosen.interest)} de interés en el camino.`, `On your current plan, you're debt-free in ${when} (${plan.chosen.months} months), paying ${c.money(plan.chosen.interest)} of interest along the way.`),
      pieces: [{ label: L(c.lang, "Interés del plan", "Plan interest"), minor: plan.chosen.interest }],
      note: L(c.lang, `El supuesto, dicho: ${plan.fromUser ? "el monto que fijaste en tu plan" : "tu ritmo real de abonos de los últimos 90 días"}, sin deudas nuevas.`, `The assumption, stated: ${plan.fromUser ? "the amount you set in your plan" : "your real payment pace of the last 90 days"}, with no new debts.`),
      source: ["cobros.plan"], lines: 0,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* HIPOTÉTICOS Y CALCULADORA — «si hago esto, entonces…» (ola 4,      */
/* especímenes del 2026-11-21). Dos pisos: la CALCULADORA pura opera  */
/* sobre los números que la pregunta TRAE (suma, reparto, porcentaje) */
/* sin tocar el libro; el HIPOTÉTICO aplica esos números al libro     */
/* (la Queda, o el saldo en cuentas si la pregunta dice «cuenta») y   */
/* dice su base y su supuesto: nada se guarda, nada se anota — es un  */
/* «si», no un hecho. «Pesos» son córdobas (la regla de Oscar).       */
/* ------------------------------------------------------------------ */
type FoundAmount = { minor: number; currency: Currency; label: string };
const WORD_NUM: Record<string, number> = {
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12,
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12,
};

function parseNumberToken(tok: string): number {
  const t = tok.replace(/\s/g, "");
  // 1,500 / 1.500 = mil quinientos; 1500.50 / 1500,50 = con decimales.
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ""));
  return Number(t.replace(",", "."));
}

/** Los montos que la pregunta TRAE, con su moneda y el concepto que los
 * sigue o precede («300 dólares de cumpleaños», «50 en comida»). */
function amountsIn(raw: string): FoundAmount[] {
  const out: FoundAmount[] = [];
  // OLA 9 (cura de la CAZA-TRAMPAS, clase 1): el SIGNO y la ESCALA ya no
  // se evaporan. «−200» se leía +200 y «1 billón» se leía $1: un lector
  // que lee a medias es peor que uno que calla. El signo se captura; la
  // escala en palabra se aplica (mil ×1.000, millón/million ×1e6,
  // billion ×1e9); «billón» ES es ambiguo (10¹² contra el billion EN)
  // y ese monto NO se lee: la familia cae en su silencio honesto antes
  // que responder con una cifra a medias.
  const re = /(-|−|menos\s+)?(\$|c\$|us\$)?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*(dolares|dólares|pesos|cordobas|córdoba|usd|nio)?\s*(millones|millon|millón|million|millions|billion|billions|billones|billon|billón|mil)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const scaleWord = (m[5] ?? "").toLowerCase();
    if (scaleWord === "billon" || scaleWord === "billón" || scaleWord === "billones") continue;
    let value = parseNumberToken(m[3]);
    if (!Number.isFinite(value) || value === 0) continue;
    if (scaleWord === "mil") value *= 1_000;
    else if (scaleWord) value *= scaleWord.startsWith("b") ? 1_000_000_000 : 1_000_000;
    if (m[1]) value = -Math.abs(value);
    const word = (m[4] ?? "").toLowerCase();
    const currency: Currency = word.startsWith("peso") || word.startsWith("cordoba") || word === "nio" || (m[2] ?? "").toLowerCase() === "c$"
      ? "NIO"
      : "USD";
    // El concepto: las palabras que siguen al monto hasta la próxima
    // cifra, una coma o el cierre de la pregunta («en comida», «de
    // cumpleaños») — limpio y corto, para nombrar la pieza.
    const rest = raw.slice(re.lastIndex, re.lastIndex + 40);
    const concept = (rest.match(/^\s*(?:en|de|para|por|a)\s+([a-záéíóúñ ]{2,24}?)(?=[,.]|\s+y\s|\s*\d|\?|$)/i)?.[1] ?? "").trim();
    out.push({ minor: Math.round(value * 100), currency, label: concept });
  }
  return out;
}

function calculadoraAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const amounts = amountsIn(raw);
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  // REPARTO: «divido 1500 en tres partes» / «entre 4 personas».
  const divMatch = folded.match(/(divid|repart|split|divide)/);
  if (divMatch && amounts.length >= 1) {
    const nWord = folded.match(/(?:en|entre|into)\s+(\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/);
    const n = nWord ? (Number(nWord[1]) || WORD_NUM[nWord[1]]) : undefined;
    if (n && n >= 2) {
      const total = disp(amounts[0]);
      const each = Math.floor(total / n);
      const rem = total - each * n;
      return {
        kind: "answer", family: "calculadora",
        verdict: L(c.lang, `Repartido en ${n} partes: ${c.money(each)} cada una${rem ? `, y sobran ${c.money(rem)} sin repartir` : ""}.`, `Split ${n} ways: ${c.money(each)} each${rem ? `, with ${c.money(rem)} left over` : ""}.`),
        pieces: [{ label: L(c.lang, "El total", "The total"), minor: total }, { label: L(c.lang, `Cada parte (×${n})`, `Each part (×${n})`), minor: each }],
        note: L(c.lang, "Es aritmética de tu pregunta: no toqué tu libro.", "That's arithmetic from your question: I didn't touch your book."),
        source: ["asesor.lectura"], lines: 0,
      };
    }
  }
  // FRACCIONES EN PALABRAS (ola 18, batería II): «la mitad de 90»,
  // «el doble de 45», «el triple», «un tercio» — la calle pide
  // fracciones sin símbolo, y la calculadora no las oía.
  {
    const frac = folded.match(/(mitad|doble|triple|tercio|cuarto|half|double|triple|third|quarter)\b/);
    if (frac && amounts.length >= 1) {
      const w = frac[1];
      const factor = /mitad|half/.test(w) ? 1 / 2 : /doble|double/.test(w) ? 2 : /triple/.test(w) ? 3 : /tercio|third/.test(w) ? 1 / 3 : 1 / 4;
      const base = disp(amounts[0]);
      const result = Math.round(base * factor);
      return {
        kind: "answer", family: "calculadora",
        verdict: L(c.lang, `${w === "mitad" || w === "half" ? "La mitad" : w === "doble" || w === "double" ? "El doble" : w === "triple" ? "El triple" : w === "tercio" || w === "third" ? "Un tercio" : "Un cuarto"} de ${c.money(base)} es ${c.money(result)}.`, `${w === "half" || w === "mitad" ? "Half" : w === "double" || w === "doble" ? "Double" : w === "triple" ? "Triple" : w === "third" || w === "tercio" ? "A third" : "A quarter"} of ${c.money(base)} is ${c.money(result)}.`),
        pieces: [{ label: L(c.lang, "La base", "The base"), minor: base }, { label: w, minor: result }],
        note: L(c.lang, "Es aritmética de tu pregunta: no toqué tu libro.", "That's arithmetic from your question: I didn't touch your book."),
        source: ["asesor.lectura"], lines: 0,
      };
    }
  }
  // PORCENTAJE: «el 20% de 1500» / «20 por ciento de 1500».
  const pct = folded.match(/(\d+(?:[.,]\d+)?)\s*(?:%|por ciento|porcentaje|percent)\s*(?:de|of)\s/);
  if (pct && amounts.length >= 1) {
    const p = parseNumberToken(pct[1]);
    const base = amounts.find((a) => a.minor !== Math.round(p * 100)) ?? amounts[amounts.length - 1];
    const baseD = disp(base);
    const result = Math.round((baseD * p) / 100);
    return {
      kind: "answer", family: "calculadora",
      verdict: L(c.lang, `El ${p}% de ${c.money(baseD)} es ${c.money(result)}.`, `${p}% of ${c.money(baseD)} is ${c.money(result)}.`),
      pieces: [{ label: L(c.lang, "La base", "The base"), minor: baseD }, { label: `${p}%`, minor: result }],
      note: L(c.lang, "Es aritmética de tu pregunta: no toqué tu libro.", "That's arithmetic from your question: I didn't touch your book."),
      source: ["asesor.lectura"], lines: 0,
    };
  }
  // RITMO (cadencias): «¿cuánto es 50 a la semana al mes?» — semana ⇄
  // mes ⇄ año con el año de 52 semanas dicho como supuesto. OLA 9: el
  // ritmo exige su verbo de equivalencia (cuánto es/equivale/sería) —
  // una cadencia mencionada dentro de otra pregunta no es una
  // conversión pedida.
  if (amounts.length >= 1 && /(cuanto (es|seria)|equivale|how much is|what is)/.test(folded) && /(a la semana|por semana|semanal|al mes|por mes|mensual|a la quincena|quincenal|al ano|por ano|weekly|monthly|yearly|per week|per month)/.test(folded)) {
    const a = disp(amounts[0]);
    const fromWeek = /(a la semana|por semana|semanal|weekly|per week)/.test(folded);
    const fromQuin = /(quincena|quincenal)/.test(folded);
    const toYear = /(al ano|por ano|en un ano|yearly|per year)/.test(folded);
    const toWeek = /(a la semana|por semana|semanal)/.test(folded) && /(cuanto es|seria|equivale)/.test(folded) && /(al mes|por mes|mensual)/.test(folded.replace(/a la semana|por semana|semanal/g, ""));
    let result: number | null = null;
    let resultLabel = "";
    if (fromWeek && toYear) { result = a * 52; resultLabel = L(c.lang, "al año", "per year"); }
    else if (fromWeek) { result = Math.round((a * 52) / 12); resultLabel = L(c.lang, "al mes", "per month"); }
    else if (fromQuin && toYear) { result = a * 24; resultLabel = L(c.lang, "al año", "per year"); }
    else if (fromQuin) { result = a * 2; resultLabel = L(c.lang, "al mes", "per month"); }
    else if (toYear) { result = a * 12; resultLabel = L(c.lang, "al año", "per year"); }
    else if (toWeek) { result = Math.round((a * 12) / 52); resultLabel = L(c.lang, "a la semana", "per week"); }
    if (result != null) {
      return {
        kind: "answer", family: "calculadora",
        verdict: L(c.lang, `${c.money(a)} ${fromWeek ? "a la semana" : fromQuin ? "a la quincena" : "al mes"} son ${c.money(result)} ${resultLabel}.`, `${c.money(a)} ${fromWeek ? "a week" : fromQuin ? "every two weeks" : "a month"} is ${c.money(result)} ${resultLabel}.`),
        pieces: [{ label: L(c.lang, "El ritmo dado", "The given pace"), minor: a }, { label: resultLabel, minor: result }],
        note: L(c.lang, "El supuesto, dicho: el año trae 52 semanas y el mes es el año entre 12 — el mismo ritmo que usan las cuotas.", "The assumption, stated: a year holds 52 weeks and a month is the year divided by 12 — the same pace the dues use."),
        source: ["asesor.lectura", "cobros.cuotas"], lines: 0,
      };
    }
  }
  // SUMA PURA: «si me regalaron 300…, 200… y 150, ¿cuánto sería?»
  if (amounts.length >= 2 && /(cuanto seria|cuanto es en total|en total|cuanto suman|how much would (that|it) be|in total)/.test(folded)) {
    const total = amounts.reduce((a, x) => a + disp(x), 0);
    return {
      kind: "answer", family: "calculadora",
      verdict: L(c.lang, `En total serían ${c.money(total)}.`, `In total that would be ${c.money(total)}.`),
      pieces: amounts.map((a, i) => ({ label: a.label || L(c.lang, `Monto ${i + 1}`, `Amount ${i + 1}`), minor: disp(a) })),
      note: L(c.lang, "Es la suma de los números de tu pregunta: no toqué tu libro.", "That's the sum of your question's numbers: I didn't touch your book."),
      source: ["asesor.lectura"], lines: 0,
    };
  }
  return null;
}

function hipoteticoAnswer(c: Ctx, folded: string, raw: string, pinId?: string): BankResult | null {
  const amounts = amountsIn(raw);
  if (amounts.length < 1) return null;
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  const sum = amounts.reduce((a, x) => a + disp(x), 0);
  // OLA 18 (batería II): la premisa sin «si» — «me entraron 200 más,
  // ¿cuánto tengo en ahorros ahora?» trae el escenario como un hecho
  // dicho, no como hipótesis. La respuesta separa los dos tiempos sin
  // mezclarlos: lo que el libro consta HOY, y lo que sería con la
  // premisa — nombrada como premisa del usuario, no como dato.
  if (/(me entraron|me depositaron|me pagaron|recibi|acabo de recibir)/.test(folded) && /(ahorr)/.test(folded) && /(cuanto|ahora|total|queda)/.test(folded)) {
    const stock = savingsStock(c.state, c.key);
    return {
      kind: "answer", family: "hipotetico",
      verdict: L(c.lang, `En tu libro, hoy constan ${c.money(stock.total)} en ahorros. Con los ${c.money(sum)} que dices que te entraron, serían ${c.money(stock.total + sum)} — si entraron a tus ahorros y aún no están anotados.`, `In your book, today shows ${c.money(stock.total)} in savings. With the ${c.money(sum)} you say came in, it would be ${c.money(stock.total + sum)} — if they landed in your savings and aren't recorded yet.`),
      pieces: [{ label: L(c.lang, "Consta hoy", "Recorded today"), minor: stock.total }, { label: L(c.lang, "Con la premisa", "With the premise"), minor: stock.total + sum }],
      note: L(c.lang, "El supuesto, dicho: la premisa es tuya — el libro no la trae todavía. Anótala y la cifra pasa a ser la de hoy.", "The assumption, stated: the premise is yours — the book doesn't carry it yet. Record it and the figure becomes today's."),
      source: ["ahorros.stock"], lines: 0,
      actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
    };
  }
  const wantsLeft = /(cuanto[^?]{0,24}(quedaria|queda|quedaba|tendria)|how much would i (have|be) left|how much would be left)/.test(folded);
  if (!wantsLeft) return null;
  const incomeSide = /(regalaron|me (dio|dan|dieron)|recibo|recibiera|aumento|me pagaran|gift|gave me|raise|i (got|receive))/.test(folded) && !/(gasto|pago|pague|compro|cuesta)/.test(folded);
  const onAccount = /cuenta|account/.test(folded);
  const stock = savingsStock(c.state, c.key);
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  // EL CONTEXTO (ola 6, idea de Oscar 2026-11-21): «en mi cuenta» con
  // VARIAS cuentas no se responde sumando todas — el Asesor REACCIONA:
  // pregunta de vuelta con las cuentas en tarjetitas, y al tocar una,
  // la respuesta se clava en ESA cuenta (su saldo y su libre). Con una
  // sola cuenta, la nombra y responde directo. Es la misma vuelta de
  // cuenta-origen, generalizada: la pregunta que necesita contexto lo
  // pide, no lo adivina.
  if (onAccount && !incomeSide) {
    const hosts = hostAccounts(c.state, c.key, stock).filter((h) => h.minor > 0);
    const nameOf = (id: string) => c.names.sub(id) || id;
    if (pinId) {
      const host = hosts.find((h) => h.id === pinId);
      if (host) {
        const libre = libreOf(stock, host.id);
        const after = host.minor - sum;
        return {
          kind: "answer", family: "hipotetico",
          verdict: L(c.lang, `En ${nameOf(host.id)}: si usaras ${c.money(sum)}, el saldo quedaría en ${c.money(after)} y lo libre en ${c.money(libre - sum)} — lo apartado no se toca salvo que lo libre no alcance.`, `In ${nameOf(host.id)}: if you used ${c.money(sum)}, the balance would be ${c.money(after)} and the free part ${c.money(libre - sum)} — what's set aside stays untouched unless the free part falls short.`),
          pieces: [
            { label: nameOf(host.id), minor: host.minor },
            ...amounts.map((a, i) => ({ label: a.label || L(c.lang, `Monto ${i + 1}`, `Amount ${i + 1}`), minor: -disp(a) })),
            { label: L(c.lang, "Quedaría el saldo", "The balance would be"), minor: after },
          ],
          note: L(c.lang, "El supuesto, dicho: es un «si» — nada se movió de esa cuenta ni de ninguna.", "The assumption, stated: it's a hypothetical — nothing moved from that account or any other."),
          source: ["central.tengo", "ahorros.stock"], lines: 0,
        };
      }
    }
    if (hosts.length > 1) {
      return {
        kind: "ask-back", family: "hipotetico",
        verdict: L(c.lang, `Tienes ${hosts.length} cuentas y la respuesta cambia según cuál uses. ¿De cuál cuenta saldría?`, `You have ${hosts.length} accounts and the answer changes with the one you use. Which account would it come from?`),
        options: hosts.map((h) => ({ id: h.id, label: nameOf(h.id), minor: h.minor })),
        source: ["central.tengo", "ahorros.stock"],
      };
    }
    if (hosts.length === 1) {
      const after = hosts[0].minor - sum;
      return {
        kind: "answer", family: "hipotetico",
        verdict: L(c.lang, `En tu cuenta ${nameOf(hosts[0].id)}: si usaras ${c.money(sum)}, el saldo quedaría en ${c.money(after)}.`, `In your ${nameOf(hosts[0].id)} account: if you used ${c.money(sum)}, the balance would be ${c.money(after)}.`),
        pieces: [{ label: nameOf(hosts[0].id), minor: hosts[0].minor }, { label: L(c.lang, "Quedaría el saldo", "The balance would be"), minor: after }],
        note: L(c.lang, "El supuesto, dicho: es un «si» — nada se movió.", "The assumption, stated: it's a hypothetical — nothing moved."),
        source: ["central.tengo", "ahorros.stock"], lines: 0,
      };
    }
  }
  const base = onAccount ? (stock.byClass.cuenta ?? 0) : reading.left;
  const baseLabel = onAccount ? L(c.lang, "Hoy en tus cuentas", "In your accounts today") : L(c.lang, "Tu queda de hoy", "Your left-for-the-month today");
  const result = incomeSide ? base + sum : base - sum;
  return {
    kind: "answer", family: "hipotetico",
    verdict: incomeSide
      ? L(c.lang, `Si eso pasara, tendrías ${c.money(result)}: tu base de hoy (${c.money(base)}) más los ${c.money(sum)} del «si».`, `If that happened, you'd have ${c.money(result)}: today's base (${c.money(base)}) plus the hypothetical ${c.money(sum)}.`)
      : L(c.lang, `Si gastaras eso, te quedarían ${c.money(result)}: tu base de hoy (${c.money(base)}) menos los ${c.money(sum)} del «si».`, `If you spent that, you'd have ${c.money(result)} left: today's base (${c.money(base)}) minus the hypothetical ${c.money(sum)}.`),
    pieces: [
      { label: baseLabel, minor: base },
      ...amounts.map((a, i) => ({ label: a.label || L(c.lang, `Monto ${i + 1}`, `Amount ${i + 1}`), minor: incomeSide ? disp(a) : -disp(a) })),
    ],
    note: L(c.lang, "El supuesto, dicho: es un «si» — nada de esto está anotado ni se guarda; tu libro queda como está.", "The assumption, stated: it's a hypothetical — none of this is recorded or saved; your book stays as it is."),
    source: onAccount ? ["central.tengo", "ahorros.stock"] : ["central.queda", "asesor.lectura"], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* LA CAJA DE HERRAMIENTAS (ola 7, la dirección de Oscar 2026-11-21): */
/* el Asesor rinde como si pensara porque tiene HERRAMIENTAS          */
/* deterministas que el juicio invoca — ninguna es IA y ninguna se    */
/* nota. La calculadora fue la primera; aquí viven el CONVERSOR (la   */
/* tasa de la Mesa de cambio), el CALENDARIO (aritmética de fechas    */
/* contra hoy y contra la ventana de cuotas) y el RITMO (cadencias:   */
/* semana ⇄ mes ⇄ año, dentro de la calculadora). Cada herramienta    */
/* dice su fuente y su supuesto, como todo en este motor.             */
/* ------------------------------------------------------------------ */
function conversorAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  if (!/(cuanto (es|son|seria|vale)|convertir|convierte|a cuanto|en (dolares|cordobas|pesos)|how much is|convert)/.test(folded)) return null;
  const amounts = amountsIn(raw);
  // OLA 9 (CAZA-TRAMPAS clase 2): el conversor solo convierte cuando
  // convertir es LA operación de la pregunta — exactamente un monto y
  // ninguna operación competidora. «¿El 20% de 1500 dólares en
  // córdobas?» convertía el 20 suelto; «300 córdobas y 200 dólares,
  // ¿total?» trataba los NIO como USD. Con competencia, calla y la
  // operación verdadera (o el silencio honesto) toma la palabra.
  if (amounts.length !== 1) return null;
  if (/%|por ciento|porcentaje|percent|\btotal\b|suma|suman|envio|enviar|divid|repart/.test(folded)) return null;
  const a = amounts[0];
  const target: Currency | null = /(cordobas|pesos|nio)/.test(folded) && a.currency === "USD" ? "NIO"
    : /(dolares|usd|dollar)/.test(folded) && a.currency === "NIO" ? "USD" : null;
  if (/(euro|libra|peso mexicano|yen)/.test(folded)) {
    return {
      kind: "answer", family: "conversor",
      verdict: L(c.lang, "Esa moneda no la proceso: mi libro trabaja en dólares y córdobas; las demás son moneda invitada, de solo lectura en la vista. En dólares y córdobas sí te convierto al instante.", "I don't process that currency: my book works in dollars and córdobas; the rest are guest currency, read-only in the view. In dollars and córdobas I'll convert instantly."),
      pieces: [], note: null, source: ["cambio.mesa"], lines: 0,
    };
  }
  if (!target) return null;
  const converted = convertMinor(a.minor, a.currency, target, c.rateE4);
  const fmt = (n: number, cur: Currency) => formatMoney(n, cur, c.lang);
  return {
    kind: "answer", family: "conversor",
    verdict: L(c.lang, `${fmt(a.minor, a.currency)} son ${fmt(converted, target)} con la tasa de tu Mesa de cambio.`, `${fmt(a.minor, a.currency)} is ${fmt(converted, target)} at your Exchange desk's rate.`),
    pieces: [{ label: fmt(a.minor, a.currency), minor: a.currency === c.display ? a.minor : converted }, { label: fmt(converted, target), minor: target === c.display ? converted : a.minor }],
    note: L(c.lang, "La tasa es la de tu libro (si fijaste una manual, esa manda): la misma que usa toda la app.", "The rate is your book's (a manual rate you set wins): the same one the whole app uses."),
    source: ["cambio.mesa"], lines: 0,
  };
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T12:00:00`).getTime();
  const b = new Date(`${toIso}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function calendarioAnswer(c: Ctx, folded: string): BankResult | null {
  // ¿QUÉ DÍA CAE / CUÁNDO VENCE X? — la fecha de la cuota nombrada
  // (OLA 9, CAZA-DIARIA C7: el calendario no tenía rama para la FECHA
  // de una cuota, solo para la distancia en días).
  if (/(cuando vence|que dia cae|cuando cae|cuando es el (pago|cobro)|cuando me toca|cuando se paga|cuando hay que pagar|fecha de|when is .* due|when does .* fall|what day does|when do i pay)/.test(folded)) {
    const due = duesWindow(c.state, 92, c.today).find((d) => foldQ(d.name).split(/\s+/).some((w) => w.length >= 4 && folded.includes(w)));
    if (due) {
      const days = daysBetween(c.today, due.on);
      return {
        kind: "answer", family: "calendario",
        verdict: days < 0
          ? L(c.lang, `«${due.name}» cayó el ${due.on} (hace ${-days} día${days === -1 ? "" : "s"}).`, `"${due.name}" fell on ${due.on} (${-days} day${days === -1 ? "" : "s"} ago).`)
          : days === 0
            ? L(c.lang, `«${due.name}» cae HOY (${due.on}).`, `"${due.name}" falls TODAY (${due.on}).`)
            : L(c.lang, `«${due.name}» cae el ${due.on} — en ${days} día${days === 1 ? "" : "s"}.`, `"${due.name}" falls on ${due.on} — in ${days} day${days === 1 ? "" : "s"}.`),
        pieces: [{ label: due.name, minor: due.amt ?? 0 }],
        note: null, source: ["cobros.cuotas"], lines: 0,
      };
    }
  }
  // OLA 18 (batería II): «¿qué día cae el 28?» — el día de la semana de
  // un día del mes a secas, sin cuota nombrada: este mes si aún viene,
  // el próximo si ya pasó.
  {
    const bare = folded.match(/que dia (cae|es)( el)? (\d{1,2})\b|what day is the (\d{1,2})\b|cae el (\d{1,2})\b/);
    if (bare) {
      const day = Number(bare[3] ?? bare[4] ?? bare[5]);
      const [y, m] = [Number(c.today.slice(0, 4)), Number(c.today.slice(5, 7))];
      const dim2 = (yy: number, mm: number) => new Date(yy, mm, 0).getDate();
      let ty = y, tm = m;
      if (day < Number(c.today.slice(8, 10)) || day > dim2(y, m)) { tm = m === 12 ? 1 : m + 1; ty = m === 12 ? y + 1 : y; }
      const target = `${ty}-${String(tm).padStart(2, "0")}-${String(Math.min(day, dim2(ty, tm))).padStart(2, "0")}`;
      const wd = new Date(`${target}T12:00:00`).getDay();
      const names = c.lang === "en" ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] : ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      const days = daysBetween(c.today, target);
      return {
        kind: "answer", family: "calendario",
        verdict: L(c.lang, `El día ${day} cae ${names[wd]} — el ${target}, ${days === 0 ? "hoy mismo" : `en ${days} día${days === 1 ? "" : "s"}`}.`, `Day ${day} falls on a ${names[wd]} — ${target}, ${days === 0 ? "today itself" : `in ${days} day${days === 1 ? "" : "s"}`}.`),
        pieces: [], note: null, source: ["cobros.cuotas"], lines: 0,
      };
    }
  }
  // ¿EN CUÁNTOS DÍAS VENCE X? — contra la ventana de cuotas.
  if (/(en cuantos dias|cuantos dias (faltan|quedan)|cuando vence|how many days (until|left)|when is .* due)/.test(folded)) {
    const due = duesWindow(c.state, 92, c.today).find((d) => foldQ(d.name).split(/\s+/).some((w) => w.length >= 4 && folded.includes(w)));
    if (due) {
      const days = daysBetween(c.today, due.on);
      return {
        kind: "answer", family: "calendario",
        verdict: days < 0
          ? L(c.lang, `«${due.name}» venció hace ${-days} día${days === -1 ? "" : "s"} (el ${due.on}).`, `"${due.name}" was due ${-days} day${days === -1 ? "" : "s"} ago (${due.on}).`)
          : days === 0
            ? L(c.lang, `«${due.name}» vence HOY (${due.on}).`, `"${due.name}" is due TODAY (${due.on}).`)
            : L(c.lang, `A «${due.name}» le faltan ${days} día${days === 1 ? "" : "s"}: vence el ${due.on}.`, `"${due.name}" is ${days} day${days === 1 ? "" : "s"} away: due ${due.on}.`),
        pieces: [{ label: due.name, minor: due.amt ?? 0 }],
        note: null, source: ["cobros.cuotas"], lines: 0,
      };
    }
    // ¿Cuántos días faltan para el día N (del mes)?
    const dayM = folded.match(/para el (dia )?(\d{1,2})\b/);
    if (dayM) {
      const day = Number(dayM[2]);
      const [y, m] = [Number(c.today.slice(0, 4)), Number(c.today.slice(5, 7))];
      let target = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (target <= c.today) {
        const nm = m === 12 ? 1 : m + 1;
        const ny = m === 12 ? y + 1 : y;
        target = `${ny}-${String(nm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      const days = daysBetween(c.today, target);
      return {
        kind: "answer", family: "calendario",
        verdict: L(c.lang, `Para el día ${day} faltan ${days} día${days === 1 ? "" : "s"}: cae el ${target}.`, `Day ${day} is ${days} day${days === 1 ? "" : "s"} away: it falls on ${target}.`),
        pieces: [], note: null, source: ["cobros.cuotas"], lines: 0,
      };
    }
    return null;
  }
  // ¿QUÉ DÍA ES / CAE en N días-semanas-meses?
  const off = folded.match(/(?:en|dentro de|in)\s+(\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(dias|semanas|meses|days|weeks|months)/);
  if (off && /(que dia|que fecha|cae|sera|what day|what date|will it be)/.test(folded)) {
    const n = Number(off[1]) || WORD_NUM[off[1]] || 0;
    const unit = off[2];
    const d = new Date(`${c.today}T12:00:00`);
    if (/semana|week/.test(unit)) d.setDate(d.getDate() + n * 7);
    else if (/mes|month/.test(unit)) d.setMonth(d.getMonth() + n);
    else d.setDate(d.getDate() + n);
    const iso = d.toISOString().slice(0, 10);
    return {
      kind: "answer", family: "calendario",
      verdict: L(c.lang, `En ${n} ${unit} será el ${iso}.`, `In ${n} ${unit} it will be ${iso}.`),
      pieces: [], note: null, source: ["cobros.cuotas"], lines: 0,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* OLA 8 — TRES TENTÁCULOS MÁS (del Mapa de Tentáculos, 2026-11-21):  */
/* el CONTRAFACTUAL mide en vez de traer, el COLCHÓN divide dos       */
/* motores, y la META INVERSA despeja la incógnita del ahorro.        */
/* ------------------------------------------------------------------ */

/** El gasto mensual PROMEDIO medido: el stream entero ÷ los meses con
 * libro hasta el mes en curso. El ahorro queda fuera (apartar no es
 * gastar, R5). Es la vara que comparten contrafactual y colchón. */
function monthlyAvgSpend(c: Ctx, filter: ((l: Line) => boolean) | null): { avg: number; months: number; lines: number } {
  const months = Math.max(1, Object.keys(c.state.months).filter((k) => k <= c.key).length);
  const pool = allLines(c).filter((l) => isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && (!filter || filter(l)));
  const total = pool.reduce((a, l) => a + view(c, l), 0);
  return { avg: Math.round(total / months), months, lines: pool.length };
}

// ── OLA 15 · EL SIMULADOR — el futuro se ensaya antes de vivirse ────
//
// El plan de deudas de la app ya tiene su motor (simulatePlan, el mismo
// que corre la pantalla del Plan): el Asesor no inventa otro — le pone
// la pregunta encima. La forma: el usuario trae un monto (un pago total
// al mes, o un EXTRA sobre su ritmo actual) y el simulador corre AMBOS
// caminos con el orden de su plan y dice la diferencia: meses e
// intereses, ahorrados o perdidos. Los supuestos se dicen (el orden de
// ataque, la tasa fija, ningún cargo nuevo). Si el ritmo traído no le
// gana al interés, se dice tal cual: con ese ritmo no se sale.
function simuladorAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  // NOTA DE FRONTERA (ola 15): la forma fechada — «¿puedo pagarlo el
  // día D?» — NO se construye aquí: la delegación spend/reach de canon
  // la responde antes que el banco, y el futuro con fecha tiene UN
  // solo proyector (el de canon, §19.1). Un segundo motor de caminata
  // en el banco sería exactamente la mezcla que la doctrina prohíbe.
  // El simulador del banco es el ensayo del PAGO contra las deudas.
  // OLA 18 (batería II): el habla real dice «le meto», «pagando»,
  // «if I pay» — la puerta aprende los verbos de la calle sin soltar
  // el contexto de deuda que la protege de robarle a spend.
  if (!/(abono|abonar|pago extra|pagar|pago|pagando|abonando|meto|meter|salir de deudas|libre de deudas|debt free|pay off|pay|paying)/.test(folded)) return null;
  if (!/(deuda|tarjeta|prestamo|credito|deudas|debt|card|loan|todo lo que debo)/.test(folded) && !/(abono|abonar|pago extra)/.test(folded)) return null;
  const amounts = amountsIn(raw);
  if (!amounts.length) return null;
  const plan = payoffPlan(c.state, c.today);
  if (!plan.debts.length) return { kind: "answer", family: "simulador", verdict: L(c.lang, "No tienes deudas anotadas que simular: ni tarjetas con saldo ni préstamos recibidos vivos.", "You have no recorded debts to simulate: no card balances and no live loans taken."), pieces: [], note: null, source: ["cobros.plan"], lines: 0 };
  const brought = convertMinor(amounts[0].minor, amounts[0].currency, c.display, c.rateE4);
  const isExtra = /(mas|extra|adicional|de mas|extra al mes)/.test(folded);
  const newBudget = isExtra ? plan.budget + brought : brought;
  if (newBudget <= 0) return null;
  const run = simulatePlan(plan.debts, newBudget, plan.order);
  if (!run) return { kind: "answer", family: "simulador", verdict: L(c.lang, `Con ${c.money(newBudget)} al mes no se sale: el interés de tus deudas le gana a ese ritmo y el saldo no baja. Los mínimos solos suman ${c.money(plan.minimums)}; el interés mensual, ${c.money(plan.minBudget)}.`, `At ${c.money(newBudget)} a month there's no way out: your debts' interest outruns that pace and the balance never falls. The minimums alone add to ${c.money(plan.minimums)}; the monthly interest, ${c.money(plan.minBudget)}.`), pieces: [], note: null, source: ["cobros.plan"], lines: plan.debts.length, actions: reportDoor(c, "cobros.plan", "Verlo en Cobros · Plan", "See it in Payments · Plan") };
  const whenKey = monthAhead(run.months, c.today);
  const [wy, wm] = whenKey.split("-").map(Number);
  const whenLabel = `${MONTH_LABELS[wm][c.lang === "en" ? 1 : 0]} ${wy}`;
  const base = plan.chosen;
  let cmp = "";
  if (base && newBudget !== plan.budget && (base.months !== run.months || base.interest !== run.interest)) {
    const dM = base.months - run.months;
    const dI = base.interest - run.interest;
    const es = dM > 0
      ? `te ahorra ${dM} meses y ${c.money(dI)} de intereses`
      : dM < 0
        ? `te cuesta ${-dM} meses más y ${c.money(-dI)} más de intereses`
        : dI > 0 ? `deja los meses igual y te ahorra ${c.money(dI)} de intereses` : `deja los meses igual y suma ${c.money(-dI)} de intereses`;
    const en = dM > 0
      ? `saves you ${dM} months and ${c.money(dI)} of interest`
      : dM < 0
        ? `costs you ${-dM} more months and ${c.money(-dI)} more interest`
        : dI > 0 ? `keeps the months and saves ${c.money(dI)} of interest` : `keeps the months and adds ${c.money(-dI)} of interest`;
    cmp = L(c.lang,
      ` Contra tu ritmo actual (${c.money(plan.budget)} al mes, ${base.months} meses, ${c.money(base.interest)} de intereses), este camino ${es}.`,
      ` Against your current pace (${c.money(plan.budget)} a month, ${base.months} months, ${c.money(base.interest)} of interest), this path ${en}.`);
  }
  const guessed = plan.debts.some((d) => d.aprGuess);
  return {
    kind: "answer", family: "simulador",
    verdict: L(c.lang, `Pagando ${c.money(newBudget)} al mes${isExtra ? ` (tu ritmo de ${c.money(plan.budget)} más los ${c.money(brought)} extra)` : ""} sales de deudas en ${run.months} mes${run.months === 1 ? "" : "es"} — terminas en ${whenLabel} — y el interés total del camino es ${c.money(run.interest)}.${cmp}`, `Paying ${c.money(newBudget)} a month${isExtra ? ` (your ${c.money(plan.budget)} pace plus the ${c.money(brought)} extra)` : ""} you're debt-free in ${run.months} month${run.months === 1 ? "" : "s"} — done in ${whenLabel} — and the path's total interest is ${c.money(run.interest)}.${cmp}`),
    pieces: [{ label: L(c.lang, "El interés del camino", "The path's interest"), minor: run.interest }, ...(base && newBudget !== plan.budget ? [{ label: L(c.lang, "Interés contra tu ritmo", "Interest vs your pace"), minor: base.interest - run.interest }] : [])],
    note: L(c.lang, `El supuesto, dicho: el motor del propio Plan de la app, atacando ${plan.order === "avalanche" ? "la deuda más cara primero" : "la deuda más pequeña primero"}, tasas fijas y ningún cargo nuevo a las tarjetas.${guessed ? " Una de las tasas es estimada por la app: el resultado hereda esa estima." : ""}`, `The assumption, stated: the app's own Plan engine, attacking ${plan.order === "avalanche" ? "the most expensive debt first" : "the smallest debt first"}, fixed rates and no new card charges.${guessed ? " One rate is the app's estimate: the result inherits it." : ""}`),
    source: ["cobros.plan"], lines: plan.debts.length,
    actions: reportDoor(c, "cobros.plan", "Verlo en Cobros · Plan", "See it in Payments · Plan"),
  };
}

// ── OLA 16 · EL REPARTO — la cuenta se divide entre personas ───────
//
// La calculadora ya reparte entre N partes anónimas; lo que el mundo
// hace es repartir entre PERSONAS: «40 para mamá, 30 para Carlos y 50
// para mí», o «reparte entre mamá, Carlos y yo». La forma nombrada
// solo habla de gente que el libro conoce (las personas de Cobros, en
// cualquier dirección) o del propio usuario (mí/yo = «Tú»): un nombre
// que el libro no conoce no se reparte — partir sobre un nombre
// adivinado sería inventar una persona. Si los repartos traídos suman
// más que el total traído, la contradicción se dice; si sobra, la
// sobra se nombra. Y como la respuesta nombra personas, lleva la
// puerta de Remesas: repartir es el primer paso de enviar.
function repartoAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  // OLA 18 (batería II): la evidencia manda sobre el verbo — unos
  // repartos NOMBRADOS («40 para mamá, 30 para Carlos y 50 para mí,
  // ¿cuánto es el total?») son un reparto aunque la pregunta no traiga
  // el verbo repartir; y la lista puede venir tras «éramos».
  const hasVerb = /(repart|toca|tocan|la cuenta|pagamos entre|split|eramos|somos|fuimos)/.test(folded);
  const amounts = amountsIn(raw);
  if (!amounts.length) return null;
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  const people: Array<{ name: string }> = [...peopleOf(c.state, "owe", c.today), ...peopleOf(c.state, "owed", c.today), ...(c.state.remitPeople ?? [])];
  const personName = (label: string): string | null => {
    const f = foldQ(label).trim();
    if (/^(mi|yo|mí)$/.test(f)) return L(c.lang, "Tú", "You");
    const p = people.find((x) => foldQ(x.name) === f || f.startsWith(foldQ(x.name)));
    return p ? p.name : null;
  };
  // Forma 1: los repartos nombrados («40 para mamá, 30 para Carlos»).
  const shares: Array<{ name: string; minor: number }> = [];
  let total: number | null = null;
  for (const a of amounts) {
    const name = a.label ? personName(a.label) : null;
    if (name) shares.push({ name, minor: disp(a) });
    else if (total === null && !a.label) total = disp(a);
  }
  if (shares.length >= 2) {
    const sum = shares.reduce((s, x) => s + x.minor, 0);
    if (total !== null && sum > total) return { kind: "answer", family: "reparto", verdict: L(c.lang, `Esos repartos suman ${c.money(sum)} y el total que trajiste es ${c.money(total)}: se pasan por ${c.money(sum - total)}. Revísalos y te lo reparto bien.`, `Those shares add to ${c.money(sum)} and the total you brought is ${c.money(total)}: they're ${c.money(sum - total)} over. Check them and I'll split it properly.`), pieces: shares.map((s) => ({ label: s.name, minor: s.minor })), note: null, source: ["cobros.mideben", "cobros.debo"], lines: 0 };
    const rest = total !== null ? total - sum : 0;
    return {
      kind: "answer", family: "reparto",
      verdict: L(c.lang, total !== null ? `Repartido de los ${c.money(total)}: ${shares.map((s) => `${s.name} ${c.money(s.minor)}`).join(" · ")}.${rest > 0 ? ` Y quedan ${c.money(rest)} sin repartir.` : ""}` : `El total es ${c.money(sum)}: ${shares.map((s) => `${s.name} ${c.money(s.minor)}`).join(" · ")}.`, total !== null ? `Split of the ${c.money(total)}: ${shares.map((s) => `${s.name} ${c.money(s.minor)}`).join(" · ")}.${rest > 0 ? ` And ${c.money(rest)} is left unassigned.` : ""}` : `The total is ${c.money(sum)}: ${shares.map((s) => `${s.name} ${c.money(s.minor)}`).join(" · ")}.`),
      pieces: [...shares.map((s) => ({ label: s.name, minor: s.minor })), ...(rest > 0 ? [{ label: L(c.lang, "Sin repartir", "Unassigned"), minor: rest }] : [])],
      note: L(c.lang, "Es el reparto que trajiste, sumado y nombrado: nada se ha enviado. Si quieres, desde Remesas lo conviertes en envíos.", "It's the split you brought, summed and named: nothing has been sent. From Remittances you can turn it into sends if you want."),
      source: ["cobros.mideben", "cobros.debo"], lines: 0,
      actions: reportDoor(c, "remesas.personas", "Verlo en Remesas", "See it in Remittances"),
    };
  }
  if (!hasVerb && shares.length < 2) return null;
  // Forma 2: el reparto igual entre una lista nombrada («entre mamá,
  // Carlos y yo», «éramos mamá, Carlos y yo») — el total traído se
  // divide entre los nombrados.
  const rosterM = folded.match(/(?:entre|con|eramos|somos|fuimos)\s+([a-záéíóúñ ,y]+?)(?:\?|$|\.|,?\s*(?:cuanto|como|que))/);
  if (rosterM && total !== null) {
    const names = rosterM[1].split(/\s*,\s*|\s+y\s+/).map((t) => personName(t)).filter((x): x is string => !!x);
    if (names.length >= 2) {
      const each = Math.floor(total / names.length);
      const rem = total - each * names.length;
      const pieces = names.map((n, i) => ({ label: n, minor: each + (i < rem ? 1 : 0) }));
      return {
        kind: "answer", family: "reparto",
        verdict: L(c.lang, `La cuenta de ${c.money(total)} entre ${names.length}: ${pieces.map((p) => `${p.label} ${c.money(p.minor)}`).join(" · ")}.`, `The ${c.money(total)} bill split ${names.length} ways: ${pieces.map((p) => `${p.label} ${c.money(p.minor)}`).join(" · ")}.`),
        pieces, note: rem > 0 ? L(c.lang, "El centavo que no se puede partir se reparte de uno en uno desde el primero: por eso alguna pieza lleva un centavo más.", "The indivisible cent is dealt one by one from the first: that's why some pieces carry one cent more.") : null,
        source: ["cobros.mideben", "cobros.debo"], lines: 0,
        actions: reportDoor(c, "remesas.personas", "Verlo en Remesas", "See it in Remittances"),
      };
    }
  }
  return null;
}

// ── OLA 17 · EL APRENDIZAJE QUE SE CUENTA Y QUE PROPONE ────────────
//
// La Ola 11 enseñó al Asesor las palabras del usuario; esta le da la
// respuesta a «¿qué has aprendido?» — que el oído (Ola 13) ya nombraba
// sin que ninguna familia la sirviera — y le pone la segunda mitad de
// la doctrina: la FRECUENCIA PROPONE. Un patrón confirmado que el
// usuario usa una y otra vez (usos ≥ 3, contados por touchAlias en
// asklearn) se propone como pregunta predeterminada: la respuesta
// trae la propuesta como DATO (proposal) y la caja la convierte en
// tarjeta — aceptar es del usuario, como todo. Y «olvida…» viaja como
// señal (forgetWord) para que la caja aplique forgetAlias: el banco
// es puro y no muta el libro, pero la orden del usuario no se pierde.
function aprendizajeAnswer(c: Ctx, folded: string): BankResult | null {
  const forget = /(olvida|borra|forget|desaprend)/.test(folded) && /(patron|aprendid|learned|palabra)/.test(folded + " ");
  const asks = /(que has aprendido|lo que has aprendido|tus patrones|aprendido de mi|que patrones|what have you learned|your patterns)/.test(folded);
  if (!asks && !forget && !/(olvida|borra|forget)/.test(folded)) return null;
  const resolve = (id: string, kind: string) => kind === "cat" ? (c.names.cat(id) || id) : kind === "person" ? (c.state.remitPeople?.find((p) => p.id === id)?.name ?? id) : (c.names.sub(id) || id);
  if (/(olvida|borra|forget)/.test(folded)) {
    const hit = aliasIn(c.learned, folded);
    if (hit) return { kind: "answer", family: "aprendizaje", verdict: L(c.lang, `Lo olvido: «${hit.word}» deja de ser ${resolve(hit.targetId, hit.kind)} para mí. Si mañana me lo preguntas con esa palabra, te preguntaré de vuelta como la primera vez.`, `Forgotten: "${hit.word}" stops meaning ${resolve(hit.targetId, hit.kind)} to me. Ask me with that word tomorrow and I'll ask you back, like the first time.`), pieces: [], note: null, source: ["asesor.aprender"], lines: 0, forgetWord: hit.word };
    if (forget) return { kind: "answer", family: "aprendizaje", verdict: L(c.lang, "Dime qué palabra quieres que olvide — «olvida el patrón de la luz» — y lo borro de mis patrones.", "Tell me which word to forget — \"forget the pattern for la luz\" — and I'll strike it from my patterns."), pieces: [], note: null, source: ["asesor.aprender"], lines: 0 };
    return null;
  }
  if (!asks) return null;
  const list = describeLearned(c.learned, resolve);
  if (!list.length) return { kind: "answer", family: "aprendizaje", verdict: L(c.lang, "Todavía no he aprendido ninguna palabra tuya. Aprendo solo de lo que me confirmas: cuando te pregunto de vuelta y tocas una tarjeta, esa palabra queda tuya para siempre — «la luz» puede ser tus servicios, si tú lo dices. De preguntas sin confirmar no aprendo nada: adivinar no es aprender.", "I haven't learned any of your words yet. I only learn from what you confirm: when I ask you back and you tap a card, that word becomes yours for good — \"la luz\" can be your utilities, if you say so. From unconfirmed questions I learn nothing: guessing isn't learning."), pieces: [], note: null, source: ["asesor.aprender"], lines: 0 };
  const freq = frequentAliases(c.learned);
  const top = freq[0];
  const proposal = top ? { word: top.word, question: L(c.lang, `¿Cuánto gasté en ${top.word} este mes?`, `How much did I spend on ${top.word} this month?`) } : null;
  return {
    kind: "answer", family: "aprendizaje",
    verdict: L(c.lang, `He aprendido ${list.length} palabra${list.length === 1 ? "" : "s"} tuya${list.length === 1 ? "" : "s"}: ${list.map((x) => `«${x.word}» es ${x.name}`).join(" · ")}.${top ? ` Y una propuesta: «${top.word}» la has usado ${top.uses} veces — si quieres, te dejo su pregunta entre tus predeterminadas, lista para tocarla.` : ""}`, `I've learned ${list.length} of your words: ${list.map((x) => `"${x.word}" means ${x.name}`).join(" · ")}.${top ? ` And a proposal: you've used "${top.word}" ${top.uses} times — if you like, I'll leave its question among your default questions, ready to tap.` : ""}`),
    pieces: [],
    note: L(c.lang, "Son tus patrones: viven con tu libro, se ven y se borran en Ajustes, y ningún dígito vive en ellos — la cifra siempre sale de tu libro al responder. Yo propongo la predeterminada; tú dispones al aceptarla.", "They're your patterns: they live with your book, they're seen and deleted in Settings, and no digit lives in them — the figure always comes from your book when I answer. I propose the default question; you decide by accepting it."),
    source: ["asesor.aprender"], lines: list.length,
    ...(proposal ? { proposal } : {}),
  };
}

// ── OLA 15 · LA ESTACIONALIDAD — el año también tiene forma ─────────
function estacionalidadAnswer(c: Ctx, folded: string): BankResult | null {
  // OLA 18 (batería II): la puerta era de diccionario y el habla real
  // («que mes es el que mas gasto», «en que mes se me va mas dinero»,
  // «which month do i spend the most») moría fuera — y comparar
  // disfrazaba la segunda con su «mejor mes». La puerta ahora pide la
  // forma (un mes) y el tema (el gasto), en las palabras de la calle.
  if (!/(en que mes|que mes|cual mes|which month|mes (mas caro|de mas gasto|mas fuerte)|gasto por mes|estacional|temporada)/.test(folded)) return null;
  if (!/(gasto|gasta|gaste|gastar|compro|compra|se me va|se va|spend|spent|dinero|sale|salio)/.test(folded)) return null;
  const filter = filterOf(c, folded);
  const byMonth = new Map<string, number>();
  for (const mk of Object.keys(c.state.months)) {
    let sum = 0;
    for (const l of c.state.months[mk].lines) {
      if (!isOut(l) || roleOf(c.state, l.categoryId) === "savings") continue;
      if (filter && !filter(l)) continue;
      sum += view(c, l);
    }
    if (sum > 0) byMonth.set(mk, sum);
  }
  if (!byMonth.size) return null;
  const rows = [...byMonth.entries()].sort((a, b) => b[1] - a[1]);
  const avg = Math.round(rows.reduce((a, r) => a + r[1], 0) / rows.length);
  const label = (mk: string) => { const [y, m] = mk.split("-").map(Number); return `${MONTH_LABELS[m][c.lang === "en" ? 1 : 0]} ${y}`; };
  return {
    kind: "answer", family: "estacionalidad",
    verdict: L(c.lang, `Tu mes más fuerte es ${label(rows[0][0])}: ${c.money(rows[0][1])}. Tu media por mes anotado es ${c.money(avg)} — ese mes gastaste ${rows[0][1] - avg > 0 ? `${c.money(rows[0][1] - avg)} por encima` : "en la media"}.`, `Your strongest month is ${label(rows[0][0])}: ${c.money(rows[0][1])}. Your average per recorded month is ${c.money(avg)} — that month ran ${rows[0][1] - avg > 0 ? `${c.money(rows[0][1] - avg)} above` : "at the average"}.`),
    pieces: rows.slice(0, 3).map((r) => ({ label: label(r[0]), minor: r[1] })),
    note: null, source: ["historial.stream"], lines: rows.length,
    actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
  };
}

function contrafactualAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  if (!/(si (dejo|dejara|dejase|quito|elimino|no gast)|dejando de|sin gastar en|dejar de gastar|if i (stop|quit|stopped)|stop spending)/.test(folded)) return null;
  const filter = filterOf(c, folded);
  let monthly: number | null = null;
  let measured = false;
  let lines = 0;
  let once = false;
  if (filter) {
    // OLA 12: «dejar de ir UNA VEZ al mes» no es dejar de ir — es una
    // visita menos. El monto es el ticket promedio (total ÷ veces),
    // no el promedio mensual entero: la primera versión respondía la
    // eliminación total a una pregunta de una sola visita.
    if (/(una vez|un dia|once|one (time|visit))/.test(folded)) {
      const pool = allLines(c).filter((l) => isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && filter(l));
      if (pool.length) {
        monthly = Math.round(pool.reduce((a, l) => a + view(c, l), 0) / pool.length);
        measured = true; lines = pool.length; once = true;
      }
    }
    if (monthly == null) {
      const m = monthlyAvgSpend(c, filter);
      if (m.lines > 0) { monthly = m.avg; measured = true; lines = m.lines; }
    }
  }
  if (monthly == null) {
    const amounts = amountsIn(raw);
    if (amounts.length && /(al mes|por mes|mensual|al ano|por ano|cada mes|per month|monthly)/.test(folded)) {
      const a = amounts[0];
      const d = convertMinor(a.minor, a.currency, c.display, c.rateE4);
      monthly = /(al ano|por ano|per year|yearly)/.test(folded) ? Math.round(d / 12) : d;
    }
  }
  if (monthly == null || monthly <= 0) return null;
  const year = monthly * 12;
  return {
    kind: "answer", family: "contrafactual",
    verdict: once
      ? L(c.lang, `Si fueras una vez menos al mes, juntarías ${c.money(monthly)} al mes — ${c.money(year)} en un año: es tu ticket promedio, medido de tus ${lines} veces.`, `Going once less a month would keep ${c.money(monthly)} a month — ${c.money(year)} in a year: it's your average ticket, measured from your ${lines} times.`)
      : L(c.lang, `Si dejaras de gastar en eso, juntarías ${c.money(monthly)} al mes — ${c.money(year)} en un año.`, `If you stopped spending on that, you'd keep ${c.money(monthly)} a month — ${c.money(year)} in a year.`),
    pieces: [
      { label: L(c.lang, "Lo que se queda, al mes", "What stays, per month"), minor: monthly },
      { label: L(c.lang, "En un año", "In a year"), minor: year },
    ],
    note: measured
      ? L(c.lang, "El supuesto, dicho: es tu promedio mensual MEDIDO de tu historial, como si el ritmo siguiera igual. Nada se anota ni se cambia.", "The assumption, stated: it's your MEASURED monthly average from your history, as if the pace stayed the same. Nothing is recorded or changed.")
      : L(c.lang, "El supuesto, dicho: es el monto que trajiste, repetido cada mes. Nada se anota ni se cambia.", "The assumption, stated: it's the amount you brought, repeated every month. Nothing is recorded or changed."),
    source: ["historial.stream", "asesor.lectura"], lines,
  };
}

function respaldoAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(cuantos meses (me dura|me dura|aguanta|de respaldo|de colchon|me alcanza)|meses de (respaldo|colchon|emergencia)|para cuantos meses me (alcanza|dura)|cuanto tiempo (me dura|aguanta) (lo|mi)|how many months (would|of|can)|runway|emergency fund lasts|sin trabajo|sin ingresos|me despiden|quedo sin|puedo vivir|vivir sin|no tuviera ingresos|pierdo mi trabajo|without (a job|income|work)|lost my job)/.test(folded)) return null;
  const stock = savingsStock(c.state, c.key);
  const m = monthlyAvgSpend(c, null);
  if (m.avg <= 0) {
    return {
      kind: "answer", family: "respaldo",
      verdict: L(c.lang, "No tienes gasto anotado con qué medir el ritmo: sin un gasto mensual promedio, no hay meses que contar — y no lo invento.", "You have no recorded spending to measure the pace with: without an average monthly spend there are no months to count — and I won't invent one."),
      pieces: [], note: null, source: ["ahorros.stock", "historial.stream"], lines: 0,
    };
  }
  const months = stock.total / m.avg;
  const whole = Math.floor(months);
  return {
    kind: "answer", family: "respaldo",
    verdict: L(c.lang, `Lo que tienes apartado y guardado (${c.money(stock.total)}) te dura unos ${whole} mes${whole === 1 ? "" : "es"} al ritmo de tu gasto (${c.money(m.avg)} al mes en promedio).`, `What you have set aside and saved (${c.money(stock.total)}) lasts about ${whole} month${whole === 1 ? "" : "s"} at your spending pace (${c.money(m.avg)} a month on average).`),
    pieces: [
      { label: L(c.lang, "Lo guardado", "What's saved"), minor: stock.total },
      { label: L(c.lang, "Tu gasto, al mes", "Your spending, per month"), minor: m.avg },
    ],
    note: L(c.lang, "El supuesto, dicho: el gasto sigue a su ritmo promedio medido y no entra nada más. Es una medida, no un consejo.", "The assumption, stated: spending keeps its measured average pace and nothing else comes in. It's a measure, not advice."),
    source: ["ahorros.stock", "historial.stream"], lines: m.lines,
    actions: reportDoor(c, "ahorros.colchon", "Verlo en Ahorros · Colchón", "See it in Savings · Cushion"),
  };
}

function metaAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const tardaria = /(tardaria|tardare|cuanto tiempo|how long)/.test(folded) && /(juntar|ahorrar|reunir|save up|reach|get to)/.test(folded);
  if (!tardaria && !/(cuanto (tengo|debo|necesito|hay) que (ahorrar|guardar)|cuanto (debo|necesito) ahorrar|cuanto ahorrar|how much (do i|should i|would i) (need to )?save|how much to save)/.test(folded)) return null;
  const amounts = amountsIn(raw);
  if (!amounts.length) return null;
  const plazo = folded.match(/en (\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|two|three|four|five|six|seven|eight|nine|ten|twelve) (meses|months)/)
    ?? (/(en un ano|en 1 ano|in a year|in one year)/.test(folded) ? ([, "12"] as unknown as RegExpMatchArray) : null);
  // OLA 12: el plazo también se nombra con un MES («para tener 2000 en
  // diciembre») — la batería del mundo lo pedía y la meta callaba,
  // dejando la pregunta en manos del stock. El mes nombrado es la
  // próxima ocurrencia de ese mes: de octubre a diciembre hay 2 meses.
  let namedMonths: number | null = null;
  if (!plazo) {
    for (let i = 1; i <= 12; i++) {
      const [es, en] = MONTH_LABELS[String(i)];
      if (new RegExp(`(^|[^a-z])${es}([^a-z]|$)`).test(folded) || new RegExp(`(^|[^a-z])${en.toLowerCase()}([^a-z]|$)`).test(folded)) {
        const cur = Number(c.key.slice(5, 7));
        let diff = i - cur;
        if (diff <= 0) diff += 12;
        namedMonths = diff;
        break;
      }
    }
  }
  const months = plazo ? (Number(plazo[1]) || WORD_NUM[plazo[1]] || 0) : (namedMonths ?? 0);
  if (!months) {
    if (!tardaria) return null;
    // «¿Cuánto tardaría en juntar X?» — sin plazo: el tiempo sale de tu
    // RITMO medido de apartado, no de un plazo traído.
    const targetT = Math.max(...amounts.map((a) => convertMinor(a.minor, a.currency, c.display, c.rateE4)));
    const stockT = savingsStock(c.state, c.key);
    const missingT = targetT - stockT.total;
    if (missingT <= 0) return { kind: "answer", family: "meta", verdict: L(c.lang, `Ya lo tienes: lo guardado suma ${c.money(stockT.total)} y tu meta era ${c.money(targetT)}.`, `You already have it: what's saved adds up to ${c.money(stockT.total)} and your goal was ${c.money(targetT)}.`), pieces: [{ label: L(c.lang, "Lo guardado", "What's saved"), minor: stockT.total }], note: null, source: ["ahorros.stock"], lines: 0 };
    const keys = Object.keys(c.state.months).filter((k) => k <= c.key);
    const pace = keys.length ? Math.round(allLines(c).filter((l) => roleOf(c.state, l.categoryId) === "savings").reduce((a, l) => a + view(c, l), 0) / keys.length) : 0;
    if (pace <= 0) return { kind: "answer", family: "meta", verdict: L(c.lang, `Para juntar ${c.money(targetT)} te faltan ${c.money(missingT)}, pero no tienes ritmo de apartado anotado con qué medir el tiempo: sin un promedio mensual, cualquier fecha sería inventada.`, `To reach ${c.money(targetT)} you're ${c.money(missingT)} short, but you have no recorded set-aside pace to measure time with: without a monthly average, any date would be invented.`), pieces: [{ label: L(c.lang, "Te falta", "Still to go"), minor: missingT }], note: null, source: ["ahorros.stock", "ahorros.mes"], lines: 0 };
    const mNeeded = Math.ceil(missingT / pace);
    return { kind: "answer", family: "meta", verdict: L(c.lang, `A tu ritmo medido de apartado (${c.money(pace)} al mes), juntar ${c.money(targetT)} te toma unos ${mNeeded} mes${mNeeded === 1 ? "" : "es"}: ya tienes ${c.money(stockT.total)} y te faltan ${c.money(missingT)}.`, `At your measured set-aside pace (${c.money(pace)} a month), reaching ${c.money(targetT)} takes about ${mNeeded} month${mNeeded === 1 ? "" : "s"}: you already have ${c.money(stockT.total)} and ${c.money(missingT)} is missing.`), pieces: [{ label: L(c.lang, "La meta", "The goal"), minor: targetT }, { label: L(c.lang, "Tu ritmo al mes", "Your monthly pace"), minor: pace }], note: L(c.lang, "El supuesto, dicho: el ritmo sigue como tu promedio medido; si apartas más, llega antes.", "The assumption, stated: the pace stays at your measured average; set aside more and it arrives sooner."), source: ["ahorros.stock", "ahorros.mes"], lines: 0 };
  }
  const target = Math.max(...amounts.map((a) => convertMinor(a.minor, a.currency, c.display, c.rateE4)));
  const stock = savingsStock(c.state, c.key);
  const missing = target - stock.total;
  if (missing <= 0) {
    return {
      kind: "answer", family: "meta",
      verdict: L(c.lang, `Ya lo tienes: tu meta era ${c.money(target)} y lo guardado suma ${c.money(stock.total)}. No te falta nada por ahorrar para eso.`, `You already have it: your goal was ${c.money(target)} and what's saved adds up to ${c.money(stock.total)}. Nothing left to save for that.`),
      pieces: [{ label: L(c.lang, "La meta", "The goal"), minor: target }, { label: L(c.lang, "Lo guardado", "What's saved"), minor: stock.total }],
      note: null, source: ["ahorros.stock"], lines: 0,
    };
  }
  const perMonth = Math.ceil(missing / months);
  return {
    kind: "answer", family: "meta",
    verdict: L(c.lang, `Para llegar a ${c.money(target)} en ${months} meses, ahorra ${c.money(perMonth)} al mes: ya tienes ${c.money(stock.total)} y te faltan ${c.money(missing)}.`, `To reach ${c.money(target)} in ${months} months, save ${c.money(perMonth)} a month: you already have ${c.money(stock.total)} and ${c.money(missing)} is missing.`),
    pieces: [
      { label: L(c.lang, "La meta", "The goal"), minor: target },
      { label: L(c.lang, "Ya tienes", "You already have"), minor: stock.total },
      { label: L(c.lang, "Al mes", "Per month"), minor: perMonth },
    ],
    note: L(c.lang, "El supuesto, dicho: sin intereses y sin contar lo que ya apartas cada mes — es la cuenta recta de tu meta contra tu libro.", "The assumption, stated: no interest, and not counting what you already set aside each month — it's the straight math of your goal against your book."),
    source: ["ahorros.stock"], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* OLA 12 — LA BATERÍA DEL MUNDO: las preguntas ordinarias que todo   */
/* el mundo le hace a su dinero. Cada familia nueva mide con los      */
/* motores de siempre; la batería (mundo.test.ts) es su caza y sus    */
/* especímenes viven en el banco.                                     */
/* ------------------------------------------------------------------ */

/** El promedio mensual de una clase de líneas, medido sobre los meses
 * anotados hasta el mes en curso. */
function avgMonthlyWhere(c: Ctx, pred: (l: Line) => boolean): { avg: number; months: number } {
  const keys = Object.keys(c.state.months).filter((k) => k <= c.key);
  const total = allLines(c).filter(pred).reduce((a, l) => a + view(c, l), 0);
  return { avg: keys.length ? Math.round(total / keys.length) : 0, months: keys.length };
}

/* PROMEDIO — el gasto por día, el promedio al mes y el gasto seguro
 * de hoy: tres formas ordinarias del ritmo, medidas, no estimadas. */
function promedioAnswer(c: Ctx, folded: string): BankResult | null {
  const day = Number(c.today.slice(8, 10));
  const daysIn = new Date(Number(c.key.slice(0, 4)), Number(c.key.slice(5, 7)), 0).getDate();
  if (/(lo mas que puedo gastar hoy|cuanto puedo gastar hoy|puedo gastar hoy|cuanto puedo gastar al dia|how much can i spend today)/.test(folded)) {
    const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const leftDays = Math.max(1, daysIn - day + 1);
    const per = reading.left > 0 ? Math.floor(reading.left / leftDays) : 0;
    return {
      kind: "answer", family: "promedio",
      verdict: L(c.lang, `Hoy puedes gastar hasta ${c.money(per)} sin pasarte: es lo que te queda del mes (${c.money(Math.max(0, reading.left))}) repartido entre los ${leftDays} días que quedan, hoy incluido.`, `Today you can spend up to ${c.money(per)} without going over: it's what's left of your month (${c.money(Math.max(0, reading.left))}) spread over the ${leftDays} days remaining, today included.`),
      pieces: [{ label: L(c.lang, "Queda del mes", "Left this month"), minor: Math.max(0, reading.left) }, { label: L(c.lang, "Por día, desde hoy", "Per day, from today"), minor: per }],
      note: L(c.lang, "El supuesto, dicho: lo que queda se reparte parejo; un día de gasto fuerte pide días más ligeros después.", "The assumption, stated: what's left is spread evenly; a heavy day asks for lighter days after."),
      source: ["asesor.lectura"], lines: 0,
    };
  }
  if (/(al dia|por dia|a day|per day|diario|daily)/.test(folded) && /(gast|spend)/.test(folded)) {
    const sum = summarize(c.state, c.key, c.lang);
    const per = day > 0 ? Math.round(sum.spend / day) : 0;
    return {
      kind: "answer", family: "promedio",
      verdict: L(c.lang, `Llevas un ritmo de ${c.money(per)} al día: ${c.money(sum.spend)} de gasto en ${day} días de este mes.`, `You're running at ${c.money(per)} a day: ${c.money(sum.spend)} of spending over ${day} days this month.`),
      pieces: [{ label: L(c.lang, "Gasto del mes", "This month's spend"), minor: sum.spend }, { label: L(c.lang, "Por día", "Per day"), minor: per }],
      note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  if (/(en promedio|promedio|average)/.test(folded) && /(gast|spend)/.test(folded)) {
    const m = monthlyAvgSpend(c, null);
    return {
      kind: "answer", family: "promedio",
      verdict: L(c.lang, `Gastas en promedio ${c.money(m.avg)} al mes, medido sobre ${m.months} mes${m.months === 1 ? "" : "es"} anotados — no es el mes en curso disfrazado: es tu media real.`, `You spend ${c.money(m.avg)} a month on average, measured over ${m.months} recorded month${m.months === 1 ? "" : "s"} — not the current month in disguise: your real mean.`),
      pieces: [{ label: L(c.lang, "Promedio al mes", "Monthly average"), minor: m.avg }],
      note: null, source: ["historial.stream", "estudio.flujo"], lines: m.lines,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  return null;
}

/* EL RELATOR — «¿cómo fue mi mes?», «¿en qué se me va el dinero?»:
 * el relato de un período compuesto de las piezas de siempre (entró,
 * salió, la mayor partida, la línea mayor), con su puerta a Estudio. */
function relatorAnswer(c: Ctx, folded: string): BankResult | null {
  const whereGoes = /(en que se me va|a donde (se )?va mi dinero|en que gasto mas|where does my money go|what do i spend (the )?most)/.test(folded);
  const howWas = /(como fue|como estuvo|como me fue|resumen de|how was)/.test(folded);
  if (!whereGoes && !howWas) return null;
  const p = periodOf(c, folded);
  const pool = allLines(c).filter((l) => inPeriod(c, l, p));
  const spendPool = pool.filter((l) => isOut(l) && roleOf(c.state, l.categoryId) !== "savings");
  const income = pool.filter((l) => l.kind.startsWith("income")).reduce((a, l) => a + view(c, l), 0);
  const spend = spendPool.reduce((a, l) => a + view(c, l), 0);
  const byCat = new Map<string, number>();
  for (const l of spendPool) byCat.set(l.categoryId, (byCat.get(l.categoryId) ?? 0) + view(c, l));
  const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  const biggest = spendPool.reduce<Line | null>((acc, l) => (acc === null || view(c, l) > view(c, acc) ? l : acc), null);
  // La partida mayor se nombra por SU casa: categoría, categoría de
  // compra o — solo si la línea mayor es de esa partida — su concepto.
  // (La primera versión caía al concepto de la línea mayor aunque la
  // partida fuera otra: «Remesa $365» cuando los $365 eran compras.)
  const topName = topCat ? (c.names.cat(topCat[0]) || c.names.purchase(topCat[0]) || (biggest && biggest.categoryId === topCat[0] ? biggest.concept : "")) : "";
  return {
    kind: "answer", family: "relator",
    verdict: L(c.lang, `En ${p.label}: entraron ${c.money(income)} y salieron ${c.money(spend)}.${topCat ? ` Tu mayor partida fue ${topName} con ${c.money(topCat[1])}${spend > 0 ? ` (el ${Math.round((topCat[1] / spend) * 100)}% de lo que salió)` : ""}.` : ""}${biggest ? ` La línea más grande: «${biggest.concept}», ${c.money(view(c, biggest))}.` : ""}`, `In ${p.label}: ${c.money(income)} came in and ${c.money(spend)} went out.${topCat ? ` Your biggest bucket was ${topName} at ${c.money(topCat[1])}${spend > 0 ? ` (${Math.round((topCat[1] / spend) * 100)}% of what went out)` : ""}.` : ""}${biggest ? ` The single biggest line: "${biggest.concept}", ${c.money(view(c, biggest))}.` : ""}`),
    pieces: [
      { label: L(c.lang, "Entró", "Came in"), minor: income },
      { label: L(c.lang, "Salió", "Went out"), minor: spend },
      ...(topCat ? [{ label: topName, minor: topCat[1] }] : []),
    ],
    note: null, source: ["libros.lineas", "estudio.flujo"], lines: pool.length,
    actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
  };
}

/* FRECUENCIA — «¿cuántas veces…?», «¿cada cuánto…?», «¿qué
 * suscripciones tengo?»: el conteo y la cadencia de un filtro, desde
 * las fechas reales de sus líneas. */
function frecuenciaAnswer(c: Ctx, folded: string): BankResult | null {
  if (/(que suscripciones|mis suscripciones|suscripciones tengo|what subscriptions|which subscriptions)/.test(folded)) {
    const subs = (c.state.months[c.key]?.lines ?? []).filter((l) => l.active && l.kind === "subscription");
    return {
      kind: "answer", family: "frecuencia",
      verdict: subs.length
        ? L(c.lang, `Tienes ${subs.length} suscripci${subs.length === 1 ? "ón anotada" : "ones anotadas"}: ${subs.map((s) => `«${s.concept}» (${c.money(view(c, s))}${s.nextDue ? `, vence el ${s.nextDue}` : ""})`).join(", ")}.`, `You have ${subs.length} recorded subscription${subs.length === 1 ? "" : "s"}: ${subs.map((s) => `"${s.concept}" (${c.money(view(c, s))}${s.nextDue ? `, due ${s.nextDue}` : ""})`).join(", ")}.`)
        : L(c.lang, "No tienes suscripciones anotadas.", "You have no recorded subscriptions."),
      pieces: subs.slice(0, 5).map((s) => ({ label: s.concept, minor: view(c, s) })),
      note: null, source: ["cobros.cuotas"], lines: subs.length,
      actions: reportDoor(c, "cobros.cuotas", "Verlo en Cobros", "See it in Payments"),
    };
  }
  // OLA 12 — LAS PREGUNTAS DE PATRÓN DEL MUNDO (sin filtro): el gasto
  // más frecuente, el día fuerte, los duplicados y las subidas.
  if (/(mas frecuente|most frequent|que mas compro|compro mas|gasto mas seguido)/.test(folded)) {
    const counts = new Map<string, { n: number; total: number }>();
    for (const l of allLines(c)) {
      if (!isOut(l) || roleOf(c.state, l.categoryId) === "savings" || !l.concept) continue;
      const cur = counts.get(l.concept) ?? { n: 0, total: 0 };
      cur.n += 1; cur.total += view(c, l);
      counts.set(l.concept, cur);
    }
    const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
    if (!top) return null;
    return {
      kind: "answer", family: "frecuencia",
      verdict: L(c.lang, `Tu gasto más frecuente es «${top[0]}»: ${top[1].n} veces anotadas, por ${c.money(top[1].total)} en total. Frecuente no es lo mismo que grande: es lo que más se repite.`, `Your most frequent spend is "${top[0]}": ${top[1].n} times recorded, for ${c.money(top[1].total)} in total. Frequent isn't the same as big: it's what repeats the most.`),
      pieces: [{ label: top[0], minor: top[1].total }, { label: L(c.lang, "Veces", "Times"), minor: top[1].n }],
      note: null, source: ["libros.lineas"], lines: top[1].n,
    };
  }
  if (/(que dia (de la semana )?(gasto|compro) mas|que dia gasto|what day do i spend|which day.*spend)/.test(folded)) {
    const names = c.lang === "en" ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] : ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const byDay = new Array(7).fill(0) as number[];
    for (const l of allLines(c)) {
      if (!isOut(l) || roleOf(c.state, l.categoryId) === "savings") continue;
      const d = new Date(`${lineDate(l)}T12:00:00`);
      if (!Number.isNaN(d.getTime())) byDay[d.getDay()] += view(c, l);
    }
    const top = byDay.indexOf(Math.max(...byDay));
    if (byDay[top] <= 0) return null;
    return {
      kind: "answer", family: "frecuencia",
      verdict: L(c.lang, `El día que más gastas es el ${names[top]}: ${c.money(byDay[top])} acumulado en tu historial anotado.`, `Your biggest spending day is ${names[top]}: ${c.money(byDay[top])} accumulated over your recorded history.`),
      pieces: names.map((n, i) => ({ label: n, minor: byDay[i] })).filter((p) => p.minor > 0).sort((a, b) => b.minor - a.minor).slice(0, 3),
      note: null, source: ["libros.lineas"], lines: 0,
    };
  }
  if (/(duplicad|duplicate|dos veces el mismo|charged twice|cobrado dos)/.test(folded)) {
    const seen = new Map<string, Line[]>();
    for (const l of (c.state.months[c.key]?.lines ?? [])) {
      if (!l.active || !isOut(l)) continue;
      const k = `${foldQ(l.concept)}|${l.amountMinor}|${l.currency}`;
      seen.set(k, [...(seen.get(k) ?? []), l]);
    }
    const dups = [...seen.values()].filter((g) => g.length >= 2);
    return {
      kind: "answer", family: "frecuencia",
      verdict: dups.length
        ? L(c.lang, `Este mes hay ${dups.length} repetido${dups.length === 1 ? "" : "s"} con el mismo concepto y el mismo monto: ${dups.map((g) => `«${g[0].concept}» ${c.money(view(c, g[0]))} × ${g.length}`).join(", ")}. Repetido no quiere decir duplicado por error — el súper de cada semana se parece; revísalos y tú juzgas.`, `This month there are ${dups.length} repeat${dups.length === 1 ? "" : "s"} with the same concept and amount: ${dups.map((g) => `"${g[0].concept}" ${c.money(view(c, g[0]))} × ${g.length}`).join(", ")}. Repeated doesn't mean wrongly duplicated — weekly groceries look alike; check them and you judge.`)
        : L(c.lang, "Este mes no hay ningún gasto repetido con el mismo concepto y el mismo monto.", "This month there are no repeated spends with the same concept and the same amount."),
      pieces: dups.slice(0, 4).map((g) => ({ label: `${g[0].concept} × ${g.length}`, minor: view(c, g[0]) * g.length })),
      note: null, source: ["libros.lineas"], lines: dups.reduce((a, g) => a + g.length, 0),
    };
  }
  if (/(ha subido|subio (el precio|de precio)|subieron los precios|aumento (el precio|de precio)|price (increase|went up|raise)|prices went up|han subido)/.test(folded)) {
    const series = new Map<string, { name: string; byMonth: Map<string, number> }>();
    for (const l of allLines(c)) {
      if (!l.active || l.kind !== "subscription") continue;
      const cur = series.get(l.subId || l.concept) ?? { name: l.concept, byMonth: new Map<string, number>() };
      cur.byMonth.set(l.monthKey, view(c, l));
      series.set(l.subId || l.concept, cur);
    }
    const rises: string[] = [];
    for (const s of series.values()) {
      const months = [...s.byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (months.length >= 2 && months[months.length - 1][1] > months[0][1]) {
        rises.push(`«${s.name}»: de ${c.money(months[0][1])} a ${c.money(months[months.length - 1][1])}`);
      }
    }
    return {
      kind: "answer", family: "frecuencia",
      verdict: rises.length
        ? L(c.lang, `Sí, hay subidas anotadas en tus suscripciones: ${rises.join("; ")}.`, `Yes, there are recorded rises among your subscriptions: ${rises.join("; ")}.`)
        : L(c.lang, "Ninguna de tus suscripciones anotadas ha subido de precio entre el primer mes y el último que tengo: los montos se mantienen.", "None of your recorded subscriptions has gone up in price between the first and last month I have: the amounts hold."),
      pieces: [], note: L(c.lang, "La comparación es entre el primer y el último mes anotados de cada suscripción, con el monto de su línea.", "The comparison is between the first and last recorded month of each subscription, at its line's amount."),
      source: ["libros.lineas", "cobros.cuotas"], lines: 0,
    };
  }
  const filter = filterOf(c, folded);
  if (!filter) return null;
  if (/(cuantas veces|how many times)/.test(folded)) {
    const p = periodOf(c, folded);
    const pool = allLines(c).filter((l) => inPeriod(c, l, p) && isOut(l) && filter(l));
    const total = pool.reduce((a, l) => a + view(c, l), 0);
    return {
      kind: "answer", family: "frecuencia",
      verdict: L(c.lang, `En ${p.label} fueron ${pool.length} veces, por ${c.money(total)} en total.`, `In ${p.label} it was ${pool.length} times, for ${c.money(total)} in total.`),
      pieces: [{ label: L(c.lang, "Veces", "Times"), minor: pool.length }, { label: L(c.lang, "En total", "In total"), minor: total }],
      note: null, source: ["libros.lineas"], lines: pool.length,
    };
  }
  if (/(cada cuanto|con que frecuencia|how often)/.test(folded)) {
    const dates = allLines(c).filter((l) => isOut(l) && filter(l)).map((l) => lineDate(l)).filter(Boolean).sort();
    if (dates.length < 2) return { kind: "answer", family: "frecuencia", verdict: L(c.lang, `Solo hay ${dates.length} anotado con ese nombre: con menos de dos fechas no hay cadencia que medir, y no la invento.`, `Only ${dates.length} recorded under that name: with fewer than two dates there's no cadence to measure, and I won't invent one.`), pieces: [], note: null, source: ["libros.lineas"], lines: dates.length };
    const span = daysBetween(dates[0], dates[dates.length - 1]);
    const gap = Math.max(1, Math.round(span / (dates.length - 1)));
    return {
      kind: "answer", family: "frecuencia",
      verdict: L(c.lang, `Vas cada ${gap} días, en promedio: ${dates.length} veces entre el ${dates[0]} y el ${dates[dates.length - 1]}.`, `You go every ${gap} days on average: ${dates.length} times between ${dates[0]} and ${dates[dates.length - 1]}.`),
      pieces: [{ label: L(c.lang, "Cada (días)", "Every (days)"), minor: gap }, { label: L(c.lang, "Veces medidas", "Times measured"), minor: dates.length }],
      note: L(c.lang, "La cadencia se mide de tus fechas reales, no de un plan: si un mes vas más, la media se mueve.", "The cadence is measured from your real dates, not a plan: go more one month and the mean moves."),
      source: ["libros.lineas"], lines: dates.length,
    };
  }
  return null;
}

/* EL PRECIO DEL TIEMPO — «¿cuántos días de trabajo me cuesta?»,
 * «¿cuánto gano por día / por hora?»: el ingreso medido convertido a
 * días y horas, con el supuesto dicho (mes de 30 días, día de 8). */
function precioTiempoAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const inc = avgMonthlyWhere(c, (l) => l.kind.startsWith("income"));
  if (inc.avg <= 0) return null;
  const daily = Math.round(inc.avg / 30);
  const hourly = Math.max(1, Math.round(daily / 8));
  if (/(cuanto gano (por|al) (dia|hora)|gano por (dia|hora)|cuanto gano al dia|per hour|per day|how much do i (make|earn) (a|per) (day|hour))/.test(folded) && !/(cuesta|cuestan|pagar|cost)/.test(folded)) {
    return {
      kind: "answer", family: "precio-tiempo",
      verdict: L(c.lang, `Ganas unos ${c.money(daily)} por día y ${c.money(hourly)} por hora, medido de tu ingreso promedio (${c.money(inc.avg)} al mes).`, `You make about ${c.money(daily)} a day and ${c.money(hourly)} an hour, measured from your average income (${c.money(inc.avg)} a month).`),
      pieces: [{ label: L(c.lang, "Al mes", "Per month"), minor: inc.avg }, { label: L(c.lang, "Por día", "Per day"), minor: daily }, { label: L(c.lang, "Por hora", "Per hour"), minor: hourly }],
      note: L(c.lang, "El supuesto, dicho: mes de 30 días y día de 8 horas — si tu jornada es otra, la hora se mueve, el día no.", "The assumption, stated: a 30-day month and an 8-hour day — if your shift differs, the hour moves, the day doesn't."),
      source: ["libros.lineas", "asesor.lectura"], lines: 0,
    };
  }
  if (/(cuantos dias|cuantas horas|dias de trabajo|horas de trabajo|days of work|hours of work|cuanto trabajo|how many (days|hours) of work)/.test(folded)) {
    let amount: number | null = null;
    const amounts = amountsIn(raw);
    if (amounts.length) amount = Math.max(...amounts.map((a) => convertMinor(a.minor, a.currency, c.display, c.rateE4)));
    if (amount === null) {
      const filter = filterOf(c, folded);
      if (filter) {
        const pool = allLines(c).filter((l) => isOut(l) && filter(l));
        if (pool.length) amount = Math.round(pool.reduce((a, l) => a + view(c, l), 0) / pool.length);
      }
    }
    if (amount === null || amount <= 0) return null;
    const inHours = /(horas|hours)/.test(folded);
    const units = inHours ? Math.round((amount / hourly) * 10) / 10 : Math.round((amount / daily) * 10) / 10;
    return {
      kind: "answer", family: "precio-tiempo",
      verdict: L(c.lang, `Eso cuesta ${c.money(amount)}: a tu ritmo de ingreso (${c.money(daily)} por día), son ${units} ${inHours ? "horas" : "días"} de trabajo.`, `That costs ${c.money(amount)}: at your income pace (${c.money(daily)} a day), that's ${units} ${inHours ? "hours" : "days"} of work.`),
      pieces: [{ label: L(c.lang, "El precio", "The price"), minor: amount }, { label: inHours ? L(c.lang, "Horas de trabajo", "Hours of work") : L(c.lang, "Días de trabajo", "Days of work"), minor: Math.round(units) }],
      note: L(c.lang, "El supuesto, dicho: tu ingreso promedio medido, mes de 30 días y día de 8 horas. Es el precio en tu tiempo, no un consejo de compra.", "The assumption, stated: your measured average income, a 30-day month and an 8-hour day. It's the price in your time, not buying advice."),
      source: ["libros.lineas", "asesor.lectura"], lines: 0,
    };
  }
  return null;
}

/* LA REGLA — «¿estoy dentro de la 50·30·20?», «¿cuánto debería ir a
 * necesidades?»: tus tres cubos medidos contra la regla, con la puerta
 * a Estudio · Regla, donde la regla vive dibujada. */
function reglaAnswer(c: Ctx, folded: string): BankResult | null {
  if (/(gustos|antojos|treats|wants)/.test(folded)) return null; // los gustos con regla son de la familia gustos
  if (!/(regla|50 ?30 ?20|necesidades|should go to needs|on needs)/.test(folded)) return null;
  const sum = summarize(c.state, c.key, c.lang);
  if (sum.income <= 0) return { kind: "answer", family: "regla", verdict: L(c.lang, "Este mes no entró ingreso anotado: la regla reparte el ingreso, y sin ingreso no hay reparto que medir.", "No income was recorded this month: the rule splits income, and with no income there's no split to measure."), pieces: [], note: null, source: ["estudio.regla"], lines: 0 };
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const needs = reading.essentialsMonthly;
  const saved = (c.state.months[c.key]?.lines ?? []).filter((l) => l.active && roleOf(c.state, l.categoryId) === "savings").reduce((a, l) => a + view(c, l), 0);
  const wants = Math.max(0, sum.spend - needs);
  const pct = (n: number) => Math.round((n / sum.income) * 100);
  const inside = pct(needs) <= 50 && pct(wants) <= 30;
  return {
    kind: "answer", family: "regla",
    verdict: L(c.lang, `Contra la regla 50·30·20, este mes vas: necesidades ${c.money(needs)} (el ${pct(needs)}%, la regla dice 50%), gustos ${c.money(wants)} (el ${pct(wants)}%, dice 30%) y apartado ${c.money(saved)} (el ${pct(saved)}%, dice 20%). ${inside ? "Estás dentro en necesidades y gustos." : "Hay cubos por encima de su número: abajo están las tres restas."}`, `Against the 50·30·20 rule, this month you're at: needs ${c.money(needs)} (${pct(needs)}%, the rule says 50%), wants ${c.money(wants)} (${pct(wants)}%, it says 30%) and set aside ${c.money(saved)} (${pct(saved)}%, it says 20%). ${inside ? "You're inside on needs and wants." : "Some buckets sit above their number: the three splits are below."}`),
    pieces: [
      { label: L(c.lang, "Necesidades", "Needs"), minor: needs },
      { label: L(c.lang, "Gustos (el resto del gasto)", "Wants (the rest of spending)"), minor: wants },
      { label: L(c.lang, "Apartado", "Set aside"), minor: saved },
    ],
    note: L(c.lang, "La regla es una referencia, no una sentencia: tus cubos se miden con las clases de tu propio Asesor.", "The rule is a reference, not a sentence: your buckets are measured with your own Advisor's classes."),
    source: ["estudio.regla", "asesor.lectura"], lines: 0,
    actions: reportDoor(c, "estudio.regla", "Verlo en Estudio · Regla", "See it in Study · Rule"),
  };
}

/* LA TASA A SECAS — «¿a cómo está el cambio?»: la tasa del libro, sin
 * monto que convertir. */
function tasaAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(a como esta (el cambio|el dolar|la tasa)|tipo de cambio|cual es la tasa|exchange rate|what.?s the (exchange )?rate)/.test(folded)) return null;
  const perUsd = c.rateE4 / 10000;
  return {
    kind: "answer", family: "conversor",
    verdict: L(c.lang, `En tu libro, el dólar está a C$ ${perUsd.toFixed(2)} — la tasa de tu Mesa de cambio, la misma que usa toda la app (si fijaste una manual, esa es la que manda).`, `In your book, the dollar is at C$ ${perUsd.toFixed(2)} — your Exchange desk's rate, the same one the whole app uses (if you set a manual one, that's the one in charge).`),
    pieces: [], note: null, source: ["cambio.mesa"], lines: 0,
    actions: reportDoor(c, "cambio.mesa", "Ir a la Mesa de cambio", "Go to the Exchange desk"),
  };
}

/* ------------------------------------------------------------------ */
/* OLA 9 — TRES FORMAS QUE LA CAZA PIDIÓ: las deudas planas, la       */
/* confirmación de afirmaciones y la síntesis comparativa.            */
/* ------------------------------------------------------------------ */

function deudasAnswer(c: Ctx, folded: string): BankResult | null {
  const owed = peopleOf(c.state, "owed", c.today); // ellos me deben
  const owe = peopleOf(c.state, "owe", c.today);   // yo les debo
  const findIn = (rows: typeof owed) => rows.find((p) => {
    const f = foldQ(p.name);
    return f.length >= 3 && (folded.includes(f) || f.split(/\s+/).some((w) => w.length >= 4 && folded.includes(w)));
  });
  // «¿Cuánto me debe X?» / «¿cuánto le debo a X?» — con la contradicción
  // de dirección: si el nombre vive en el lado contrario, se dice.
  if (/(me debe|debe a mi|owes me)/.test(folded)) {
    const p = findIn(owed);
    if (p) return { kind: "answer", family: "deudas", verdict: L(c.lang, `${p.name} te debe ${c.money(p.left)}.`, `${p.name} owes you ${c.money(p.left)}.`), pieces: [{ label: p.name, minor: p.left }], note: null, source: ["cobros.mideben"], lines: p.active };
    const q = findIn(owe);
    if (q) return { kind: "answer", family: "deudas", verdict: L(c.lang, `Al revés: ${q.name} no te debe a ti — eres tú quien le debe ${c.money(q.left)}.`, `The other way around: ${q.name} doesn't owe you — you're the one who owes them ${c.money(q.left)}.`), pieces: [{ label: q.name, minor: q.left }], note: null, source: ["cobros.mideben", "cobros.debo"], lines: q.active };
    // Sin persona nombrada no es esta rama: «¿quién me debe?» cae a la
    // rama del listado, no al silencio.
  }
  // OLA 12: «¿a quién le debo?» se juzga ANTES de la rama «le debo» —
  // esa rama la tragaba y la devolvía en silencio cuando no había
  // total que decir (la batería del mundo la cazó: era el último
  // silencio de 81).
  if (/(a quien le debo|quien le debo|a quienes le debo|who do i owe)/.test(folded) && !/(mas|most)/.test(folded)) {
    const cardsOwe = cardsOf(c.state).map((card) => ({ name: card.name, bal: cardFigures(c.state, card, c.today).balance })).filter((x) => x.bal > 0);
    if (!owe.length && !cardsOwe.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, "No le debes a nadie anotado: ni préstamos recibidos ni saldos de tarjeta vivos.", "You owe nobody recorded: no live loans taken and no card balances."), pieces: [], note: null, source: ["cobros.debo"], lines: 0 };
    if (owe.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, `Le debes a ${owe.length} persona${owe.length === 1 ? "" : "s"}: en total ${c.money(owe.reduce((a, p) => a + p.left, 0))}. El mayor: ${owe[0].name}, ${c.money(owe[0].left)}.`, `You owe ${owe.length} ${owe.length === 1 ? "person" : "people"}: ${c.money(owe.reduce((a, p) => a + p.left, 0))} in total. The biggest: ${owe[0].name}, ${c.money(owe[0].left)}.`), pieces: owe.slice(0, 4).map((p) => ({ label: p.name, minor: p.left })), note: null, source: ["cobros.debo"], lines: owe.reduce((a, p) => a + p.active, 0) };
  }
  if (/(le debo|debo a|cuanto debo|i owe)/.test(folded)) {
    const p = findIn(owe);
    if (p) return { kind: "answer", family: "deudas", verdict: L(c.lang, `A ${p.name} le debes ${c.money(p.left)}.`, `You owe ${p.name} ${c.money(p.left)}.`), pieces: [{ label: p.name, minor: p.left }], note: null, source: ["cobros.debo"], lines: p.active };
    const q = findIn(owed);
    if (q) return { kind: "answer", family: "deudas", verdict: L(c.lang, `Al revés: a ${q.name} no le debes — es ${q.name} quien te debe a ti ${c.money(q.left)}.`, `The other way around: you don't owe ${q.name} — it's ${q.name} who owes you ${c.money(q.left)}.`), pieces: [{ label: q.name, minor: q.left }], note: null, source: ["cobros.mideben", "cobros.debo"], lines: q.active };
    // OLA 18 (batería II): la cerca «a » sin frontera cazaba dentro de
    // las palabras — «mi TARJETA cuanto debo» leía su «a » final como
    // la preposición y la rama del total moría en silencio. La
    // preposición se busca como palabra entera.
    if (/(en total|total|todo)/.test(folded) || !/\s(a|al|hacia)\s/.test(folded)) {
      const cards = cardsOf(c.state).map((card) => ({ name: card.name, bal: cardFigures(c.state, card, c.today).balance })).filter((x) => x.bal > 0);
      const peopleTotal = owe.reduce((a, p) => a + p.left, 0);
      const cardTotal = cards.reduce((a, x) => a + x.bal, 0);
      const total = peopleTotal + cardTotal;
      return {
        kind: "answer", family: "deudas",
        verdict: total > 0
          ? L(c.lang, `En total debes ${c.money(total)}: ${c.money(peopleTotal)} en préstamos recibidos y ${c.money(cardTotal)} en tarjetas.`, `In total you owe ${c.money(total)}: ${c.money(peopleTotal)} in loans taken and ${c.money(cardTotal)} on cards.`)
          : L(c.lang, "No debes nada anotado: ni préstamos recibidos ni saldos de tarjeta vivos.", "You owe nothing recorded: no live loans taken and no card balances."),
        pieces: [...owe.slice(0, 3).map((p) => ({ label: p.name, minor: p.left })), ...cards.slice(0, 3).map((x) => ({ label: x.name, minor: x.bal }))],
        note: null, source: ["cobros.debo"], lines: owe.reduce((a, p) => a + p.active, 0),
      };
    }
    return null;
  }
  if (/(quien me debe|a quien le preste|who owes me)/.test(folded) && !/(mas|most)/.test(folded)) {
    if (!owed.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, "Nadie te debe nada anotado: no hay préstamos dados vivos.", "Nobody owes you anything recorded: there are no live loans given."), pieces: [], note: null, source: ["cobros.mideben"], lines: 0 };
    return { kind: "answer", family: "deudas", verdict: L(c.lang, `Te deben ${owed.length} persona${owed.length === 1 ? "" : "s"}: en total ${c.money(owed.reduce((a, p) => a + p.left, 0))}. El mayor: ${owed[0].name}, ${c.money(owed[0].left)}.`, `${owed.length} ${owed.length === 1 ? "person owes" : "people owe"} you: ${c.money(owed.reduce((a, p) => a + p.left, 0))} in total. The biggest: ${owed[0].name}, ${c.money(owed[0].left)}.`), pieces: owed.slice(0, 4).map((p) => ({ label: p.name, minor: p.left })), note: null, source: ["cobros.mideben"], lines: owed.reduce((a, p) => a + p.active, 0) };
  }
  return null;
}

function confirmacionAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const amounts = amountsIn(raw);
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  // (c) La comparación afirmada: «¿Ana me debe más que Carlos?»
  const cmp = folded.match(/me debe mas que|owes me more than/);
  if (cmp) {
    const owed = peopleOf(c.state, "owed", c.today);
    // El orden de la afirmación es el orden de MENCIÓN en la pregunta
    // («¿Ana me debe más que Carlos?» afirma Ana > Carlos), no el
    // orden por saldo de peopleOf.
    const named = owed.filter((p) => folded.includes(foldQ(p.name)))
      .sort((a, b) => folded.indexOf(foldQ(a.name)) - folded.indexOf(foldQ(b.name)));
    if (named.length >= 2) {
      const [a, b] = [named[0], named[1]];
      const yes = a.left > b.left;
      return {
        kind: "answer", family: "confirmacion",
        verdict: yes
          ? L(c.lang, `Sí: ${a.name} te debe más que ${b.name} — ${c.money(a.left)} contra ${c.money(b.left)}.`, `Yes: ${a.name} owes you more than ${b.name} — ${c.money(a.left)} vs ${c.money(b.left)}.`)
          : L(c.lang, `No: ${a.name} te debe ${c.money(a.left)} y ${b.name} ${c.money(b.left)} — no es ${a.name} quien más te debe de los dos.`, `No: ${a.name} owes you ${c.money(a.left)} and ${b.name} ${c.money(b.left)} — ${a.name} isn't the one who owes you more of the two.`),
        pieces: [{ label: a.name, minor: a.left }, { label: b.name, minor: b.left }],
        note: null, source: ["cobros.mideben"], lines: a.active + b.active,
      };
    }
    return null;
  }
  const cue = /(verdad|es cierto|es verdad|no es asi|cierto|is it true|is that right|right\?)/.test(folded)
    || /^(gaste|pague|compre|ahorre|guarde|spent|paid|bought|saved)\b/.test(folded.trim());
  if (!cue || !amounts.length) return null;
  const claimed = disp(amounts[0]);
  // (a) La afirmación sobre los ahorros: se juzga contra el stock.
  if (/(ahorr|guardad|apartad|colchon|savings|set aside)/.test(folded)) {
    const stock = savingsStock(c.state, c.key);
    const yes = claimed === stock.total;
    return {
      kind: "answer", family: "confirmacion",
      verdict: yes
        ? L(c.lang, `Sí, exacto: tienes ${c.money(stock.total)} guardado.`, `Yes, exactly: you have ${c.money(stock.total)} saved.`)
        : L(c.lang, `No: tienes ${c.money(stock.total)} guardado, no ${c.money(claimed)} — la diferencia es ${c.money(Math.abs(stock.total - claimed))}.`, `No: you have ${c.money(stock.total)} saved, not ${c.money(claimed)} — the difference is ${c.money(Math.abs(stock.total - claimed))}.`),
      pieces: [{ label: L(c.lang, "Lo guardado", "What's saved"), minor: stock.total }],
      note: null, source: ["ahorros.stock"], lines: 0,
    };
  }
  // (b) La afirmación de un gasto: se juzga contra historia (período × filtro).
  if (/(gaste|gasto|pague|compre|spent|paid|bought)/.test(folded)) {
    const p = periodOf(c, folded);
    const filter = filterOf(c, folded);
    const pool = allLines(c).filter((l) => inPeriod(c, l, p) && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && (!filter || filter(l)));
    const total = pool.reduce((a, l) => a + view(c, l), 0);
    const yes = claimed === total;
    return {
      kind: "answer", family: "confirmacion",
      verdict: yes
        ? L(c.lang, `Sí, exacto: en ${p.label} fueron ${c.money(total)}.`, `Yes, exactly: in ${p.label} it was ${c.money(total)}.`)
        : L(c.lang, `No: en ${p.label} fueron ${c.money(total)}, no ${c.money(claimed)}.`, `No: in ${p.label} it was ${c.money(total)}, not ${c.money(claimed)}.`),
      pieces: [{ label: p.label, minor: total }],
      note: null, source: ["historial.stream"], lines: pool.length,
    };
  }
  return null;
}

function sintesisAnswer(c: Ctx, folded: string): BankResult | null {
  // LA SÍNTESIS COMPARATIVA (doctrina de Oscar 2026-11-21): pasado
  // medido × futuro proyectado, mostrados en el presente — declarando
  // el cruce y su supuesto, jamás mezclando los tiempos en silencio.
  const spendTo = (key: string, uptoDay: number | null) => allLines(c)
    .filter((l) => l.monthKey === key && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && (uptoDay == null || Number(lineDate(l).slice(8, 10)) <= uptoDay))
    .reduce((a, l) => a + view(c, l), 0);
  const day = Number(c.today.slice(8, 10));
  // (a) EL RITMO «A ESTAS ALTURAS»: este mes hasta hoy contra el mismo
  // tramo del mes pasado — mismo día, misma vara.
  if (/(a estas alturas|a esta altura|at this point|so far this month|hasta hoy|ritmo)/.test(folded) && /(mes pasado|pasado|antes|last month|comparad|que el|que la)/.test(folded)) {
    const now = spendTo(c.key, day);
    const then = spendTo(prevKey(c.key), day);
    const more = now >= then;
    return {
      kind: "answer", family: "sintesis",
      verdict: L(c.lang, `A estas alturas ${more ? "vas por encima" : "vas por debajo"} del mes pasado: llevas ${c.money(now)} contra ${c.money(then)} al día ${day} del mes pasado — diferencia de ${c.money(Math.abs(now - then))}.`, `At this point you're ${more ? "above" : "below"} last month: you stand at ${c.money(now)} vs ${c.money(then)} by day ${day} last month — a difference of ${c.money(Math.abs(now - then))}.`),
      pieces: [
        { label: L(c.lang, `Este mes al día ${day}`, `This month by day ${day}`), minor: now },
        { label: L(c.lang, `El mes pasado al día ${day}`, `Last month by day ${day}`), minor: then },
      ],
      note: L(c.lang, "La comparación es a igual tramo: los mismos días de cada mes, con las mismas reglas.", "The comparison is at equal stretch: the same days of each month, under the same rules."),
      source: ["historial.stream", "estudio.flujo"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  // (b) EL CIERRE COMPARADO: el cierre proyectado de este mes (al ritmo
  // medido) contra el cierre real del mes pasado — la síntesis pura,
  // con el supuesto dicho: «si el ritmo sigue».
  // El cierre es DEL MES: «¿cuándo termino de PAGAR?» es futuro/deudas
  // y no se toca — la palabra «termino» sin «mes» no basta (la cerca de
  // modos lo cazó al integrar: la síntesis entregaba cifras donde el
  // piso de futuro manda callar).
  if (/(terminare|termino|acabare|acabo|cierre|a fin de mes|fin de mes|como termin|will i end|finish (the|this) month|end of (the|this) month|end up)/.test(folded) && /(mes|month)/.test(folded) && !/(pagar|deuda|deudas|tarjeta|prestamo|loan|debt|pay off)/.test(folded)) {
    const soFar = spendTo(c.key, null);
    const y = Number(c.key.slice(0, 4));
    const m = Number(c.key.slice(5, 7));
    const daysInMonth = new Date(y, m, 0).getDate();
    if (day <= 0 || soFar <= 0) return null;
    const projected = Math.round((soFar / day) * daysInMonth);
    const lastTotal = spendTo(prevKey(c.key), null);
    const better = projected <= lastTotal;
    return {
      kind: "answer", family: "sintesis",
      verdict: L(c.lang, `Al ritmo que llevas, cerrarías el mes en ${c.money(projected)} de gasto — ${better ? "por debajo" : "por encima"} del cierre real del mes pasado (${c.money(lastTotal)}).`, `At your current pace you'd close the month at ${c.money(projected)} of spending — ${better ? "below" : "above"} last month's actual close (${c.money(lastTotal)}).`),
      pieces: [
        { label: L(c.lang, "El cierre proyectado", "The projected close"), minor: projected },
        { label: L(c.lang, "El cierre del mes pasado", "Last month's close"), minor: lastTotal },
      ],
      note: L(c.lang, "El supuesto, dicho: la proyección estira tu ritmo medido de estos días hasta fin de mes — si el ritmo cambia, el cierre cambia. Es una síntesis: pasado medido y futuro proyectado, cruzados a la vista.", "The assumption, stated: the projection stretches your measured pace of these days to month's end — if the pace changes, the close changes. It's a synthesis: measured past and projected future, crossed in plain sight."),
      source: ["historial.stream", "asesor.lectura"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* ACCIONES SUGERIDAS — el Asesor no solo responde: propone (ola 5,   */
/* idea de Oscar 2026-11-21). «Quiero enviarle dinero a mamá» o       */
/* «Envío 50 a mamá, 30 para los niños…» conducen la aritmética Y     */
/* proponen abajo las acciones concretas — la remesa, la conversión,  */
/* la bandeja — cada una con su puerta del mapa. El Asesor enseña la  */
/* app mientras responde: la acción propuesta es el aprendizaje.      */
/* ------------------------------------------------------------------ */
function accionesAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  if (!/(enviar|envio|mandar|mando|remesa|send|remit)/.test(folded)) return null;
  // OLA 9 (CAZA-DIARIA C9): acciones exige INTENCIÓN de hacer, no solo
  // el verbo de envío — una consulta que lo menciona («¿cuánto envío
  // en remesas al mes?» ya la tomó el patrón de remesas; cualquier otra
  // pregunta con el verbo) no se secuestra como acción. Intención =
  // quiero/voy a/necesito/quisiera, o el imperativo en primera persona
  // al inicio («Envío 50 a mamá…»). Una pregunta interrogativa pura
  // (cuánto/cuándo/quién/cuál/how/when/who al inicio) jamás dispara.
  const intent = /(quiero|voy a|pienso|necesito|tengo que|quisiera|hay que|i want|i need|i'?m going|im going)/.test(folded)
    || /^(envio|envia|mando|manda|remite|send|i send|i'?m sending|im sending)\b/.test(folded.trim());
  if (!intent) return null;
  const people = c.state.remitPeople ?? [];
  // OLA 17: el alias de PERSONA aprendido manda sobre el escaneo de
  // nombres — si el usuario enseñó que «mami» es Mamá, la acción se
  // propone a Mamá aunque el nombre no aparezca en la pregunta.
  const learnedPerson = aliasIn(c.learned, folded);
  const person = (learnedPerson?.kind === "person" ? people.find((p) => p.id === learnedPerson.targetId) : undefined)
    ?? people.find((p) => folded.includes(foldQ(p.name)) || foldQ(p.name).split(/\s+/).some((w) => w.length >= 3 && folded.includes(w)));
  const amounts = amountsIn(raw);
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  const who = person?.name ?? (folded.match(/(?:a|para)\s+([a-záéíóúñ]{3,})/)?.[1] ?? "");
  const whoLabel = who ? who.charAt(0).toUpperCase() + who.slice(1) : "";
  const actions: BankAction[] = [
    { id: "remit", label: whoLabel ? L(c.lang, `Enviarlo como remesa a ${whoLabel}`, `Send it as a remittance to ${whoLabel}`) : L(c.lang, "Enviarlo como remesa", "Send it as a remittance"), target: "remesas.personas" },
    { id: "convert", label: L(c.lang, "Convertirlo en la Mesa de cambio", "Convert it at the Exchange desk"), target: "cambio.mesa" },
    { id: "tray", label: L(c.lang, "Dejarlo calculado en la bandeja", "Leave it worked out in the tray"), target: "captura.bandeja" },
  ];
  if (amounts.length >= 1) {
    const total = amounts.reduce((a, x) => a + disp(x), 0);
    return {
      kind: "answer", family: "acciones",
      verdict: amounts.length > 1
        ? L(c.lang, `La cuenta da ${c.money(total)} en total. Abajo te propongo qué hacer con eso — la remesa${whoLabel ? ` a ${whoLabel}` : ""}, la conversión o la bandeja.`, `That adds up to ${c.money(total)} in total. Below I propose what to do with it — the remittance${whoLabel ? ` to ${whoLabel}` : ""}, the conversion, or the tray.`)
        : L(c.lang, `Son ${c.money(total)}${whoLabel ? ` para ${whoLabel}` : ""}. Abajo te propongo la acción: enviarlo como remesa, convertirlo o dejarlo en la bandeja.`, `That's ${c.money(total)}${whoLabel ? ` for ${whoLabel}` : ""}. Below I propose the action: send it as a remittance, convert it, or leave it in the tray.`),
      pieces: amounts.map((a, i) => ({ label: a.label || L(c.lang, `Monto ${i + 1}`, `Amount ${i + 1}`), minor: disp(a) })),
      note: L(c.lang, "Yo propongo y tú dispones: nada se envía ni se guarda hasta que toques una acción.", "I propose and you decide: nothing is sent or saved until you tap an action."),
      source: ["remesas.personas", "cambio.mesa", "captura.bandeja"], lines: 0, actions,
    };
  }
  if (whoLabel || /(quiero|quisiera|i want|i'd like)/.test(folded)) {
    return {
      kind: "answer", family: "acciones",
      verdict: L(c.lang, `Claro${whoLabel ? `: enviarle a ${whoLabel}` : ""} se hace desde Remesas, y si primero quieres verlo en otra moneda, la Mesa de cambio lo convierte. Dime el monto y te hago la cuenta aquí mismo.`, `Of course${whoLabel ? `: sending to ${whoLabel}` : ""} is done from Remittances, and if you want to see it in another currency first, the Exchange desk converts it. Tell me the amount and I'll do the math right here.`),
      pieces: [], note: L(c.lang, "Yo propongo y tú dispones: nada se envía ni se guarda hasta que toques una acción.", "I propose and you decide: nothing is sent or saved until you tap an action."),
      source: ["remesas.personas", "cambio.mesa", "captura.bandeja"], lines: 0, actions,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* CAPACIDADES Y LÍMITES — el Asesor se describe a sí mismo, y la     */
/* descripción SALE DEL BANCO (ola 3, idea de Oscar 2026-11-21): la   */
/* lista de lo que puede hacer se genera de las familias vivas y la   */
/* de lo que no puede, de las declaradas — así la respuesta no puede  */
/* prometer lo que el banco no tiene, ni esconder lo que le falta.    */
/* ------------------------------------------------------------------ */
function capacidadesAnswer(c: Ctx): BankResult {
  const live = QUESTION_BANK.filter((f) => f.status !== "declarada");
  return {
    kind: "answer", family: "capacidades",
    verdict: L(c.lang, `Puedo responder ${live.length} clases de preguntas sobre tu dinero, siempre con las cifras de tus propios motores — nunca de memoria ni inventadas. Esto es lo que sé hacer:`, `I can answer ${live.length} kinds of questions about your money, always with figures from your own engines — never from memory or made up. This is what I can do:`),
    pieces: live.map((f) => ({ label: c.lang === "en" ? f.name.en : f.name.es, minor: 0 })),
    note: L(c.lang, "Tócame una clase con tu pregunta, o pregúntame también qué NO puedo hacer: también te lo digo.", "Ask me with your question, or ask me what I CAN'T do: I'll tell you that too."),
    source: ["asesor.lectura"], lines: 0,
  };
}

function limitesAnswer(c: Ctx): BankResult {
  const declared = QUESTION_BANK.filter((f) => f.status === "declarada");
  return {
    kind: "answer", family: "limites",
    verdict: L(c.lang, "Te lo digo honesto: hay cosas que no puedo hacer, y prefiero que las sepas a que me oigas inventar.", "Honestly: there are things I can't do, and I'd rather you know them than hear me make things up."),
    pieces: [
      { label: L(c.lang, "Opinar o aconsejar inversiones: eso no es una cifra de tu libro", "Give opinions or investment advice: that's not a figure from your book"), minor: 0 },
      { label: L(c.lang, "Inventar una cifra que ningún motor calcula", "Make up a figure no engine computes"), minor: 0 },
      { label: L(c.lang, "Guardar o mover tu dinero yo solo: a lo sumo dejo un borrador en la bandeja", "Save or move your money on my own: at most I leave a draft in the tray"), minor: 0 },
      ...declared.map((f) => ({ label: L(c.lang, `Todavía no: ${f.name.es}`, `Not yet: ${f.name.en}`), minor: 0 })),
      { label: L(c.lang, "Mostrarte cifras de un piso de modo que no estás usando", "Show you figures from a mode floor you're not on"), minor: 0 },
    ],
    note: L(c.lang, "Lo que no sé responder, lo digo y te ofrezco lo que sí sé: ese silencio también es parte de mi trabajo.", "What I can't answer, I say so and offer what I can: that silence is part of my job too."),
    source: ["asesor.lectura"], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* FARO MISMO — la respuesta sale del mapa, con su pantalla.          */
/* ------------------------------------------------------------------ */
function faroMismoAnswer(c: Ctx, folded: string): BankResult | null {
  // OLA 25 (Q25-1) — re-cosido en la integración del banco (1.3.383):
  // EL NOMBRE PROPIO GANA A LA MESA, a nivel de patrón — no de
  // puntaje. «¿Cómo cambio mi nombre?» casaba con cambio.mesa por la
  // palabra «cambio» (puntaje por claves contenidas) y la persona
  // recibía la puerta de la conversión de moneda por preguntar cómo
  // la nombra Faro: un desvío es peor que el silencio honesto.
  // Cuando la pregunta nombra el nombre propio — mi nombre, cómo me
  // llama Faro — la función es account.name, diga lo que diga el
  // puntaje; las preguntas verdaderas de cambio de moneda no nombran
  // ningún nombre y siguen llegando a su mesa por el puntaje de
  // siempre. Las dos funciones son Esencial: su origen se ve en todo
  // modo, así que la forma de la respuesta no nombra ningún piso (la
  // vara de LA FRONTERA, addendum A23-4).
  const propia = /(mi nombre|my name|me llamo|me llama|el nombre con que|faro call me|faro calls me)/.test(folded)
    ? FARO_FUNCTION_MAP.find((x) => x.id === "account.name") ?? null
    : null;
  // OLA 26 (Familia 5, Q26-1/Q26-2 de Asesor): LAS PRECEDENCIAS DEL
  // MAPA NUEVO, al mismo nivel de patrón que la del nombre. «Saldo
  // proyectado» ganaba la ficha Tengo por puntaje («saldo» es clave de
  // central.tengo) y la persona recibía los saldos de hoy por la
  // caminata diaria; «cambios de precio» ganaba la Mesa de cambio por
  // la palabra «cambio». Cuando la pregunta nombra la proyección o
  // los precios, la función es la suya, diga lo que diga el puntaje;
  // las preguntas verdaderas de saldos y de conversión no nombran ni
  // «proyectado» ni «precio» y siguen llegando a su casa por el
  // puntaje de siempre (controles en la cerca de la ola 26).
  const proyectado = /(saldo proyectado|projected balance)/.test(folded)
    ? FARO_FUNCTION_MAP.find((x) => x.id === "advisor.projection") ?? null
    : null;
  const precios = /(cambios de precio|cambios de precios|price changes)/.test(folded)
    ? FARO_FUNCTION_MAP.find((x) => x.id === "study.prices") ?? null
    : /(aviso de precio|price alert|precio subio|subio de precio|price went up)/.test(folded)
      ? FARO_FUNCTION_MAP.find((x) => x.id === "advisor.price-watch") ?? null
      : null;
  const f = propia ?? proyectado ?? precios ?? functionOfQuestion(folded);
  if (!f) return null;
  // OLA 26 (Familia 5, Q26-2 de Cara): LA GUARDA DE OBJETO DEL
  // COMPARTIR. «¿Cómo comparto mi libro?» casaba con inbox.link por
  // el verbo «comparto» y la persona recibía la puerta CONTRARIA —
  // compartir HACIA DENTRO (lo que otras apps le mandan a Faro) por
  // preguntar cómo comparte SU libro hacia fuera. Ninguna función del
  // mapa es dueña todavía de compartir el libro (la superficie no ha
  // nacido), así que la guarda cierra la puerta equivocada y la
  // pregunta cae en el silencio honesto de la familia: un desvío es
  // peor que el silencio. La ruta de recibir no se toca: sin el
  // objeto «libro», inbox.link responde como siempre (control en la
  // cerca). Cuando la superficie de compartir el libro nazca, su
  // entrada del mapa será la dueña de esta pregunta.
  if (f.id === "inbox.link" && /(compart|share)/.test(folded) && /(mi libro|el libro|my book|the book)/.test(folded)) return null;
  // A23-5 (cura de la ola 23): la fórmula «ahí ves las mismas cifras
  // que yo uso» no se dice de una cara que el modo no muestra. Cuando
  // el mapa declara el piso de la función (minMode, declarado solo
  // donde una ola lo midió) y la persona está debajo, el veredicto
  // nombra el piso y no promete las cifras — como la puerta de
  // cobros.plan ya hacía al caer a su explicación. La nota sigue
  // nombrando el tema: la explicación del Manual es el destino honesto.
  // OLA 26 (Familias 5 y 10): el área se compone en el idioma del
  // libro (f.area trae los dos nombres desde esta cura — en un libro
  // EN ninguna respuesta nombra «Cuenta» ni «Captura»), y las
  // funciones sin cifras (sinCifras: el nombre, el compartir, la fila
  // a la mano) componen su veredicto sin la fórmula ni su sombra —
  // bajo su piso nombran el piso y nada más: su casa no guarda cifras
  // que esconder.
  if (f.minMode && !askReachesFloor(c.mode, f.minMode)) {
    return {
      kind: "answer", family: "faro-mismo",
      verdict: f.sinCifras
        ? L(c.lang, `Eso es «${f.name.es}», en el área de ${f.area.es} (${f.screen.es}). Vive en ${modeWord(c.lang, f.minMode)}.`, `That's "${f.name.en}", in the ${f.area.en} area (${f.screen.en}). It lives in ${modeWord(c.lang, f.minMode)}.`)
        : L(c.lang, `Eso es «${f.name.es}», en el área de ${f.area.es} (${f.screen.es}). Vive en ${modeWord(c.lang, f.minMode)}: en ${modeWord(c.lang, c.mode)} no ves esas cifras.`, `That's "${f.name.en}", in the ${f.area.en} area (${f.screen.en}). It lives in ${modeWord(c.lang, f.minMode)}: in ${modeWord(c.lang, c.mode)} you don't see those figures.`),
      pieces: [], note: L(c.lang, `Su tema en el Manual es «${f.name.es}».`, `Its Manual topic is "${f.name.en}".`),
      source: [f.id], lines: 0,
    };
  }
  return {
    kind: "answer", family: "faro-mismo",
    verdict: f.sinCifras
      ? L(c.lang, `Eso vive en ${f.screen.es}: es «${f.name.es}», en el área de ${f.area.es}.`, `That lives on ${f.screen.en}: it's "${f.name.en}", in the ${f.area.en} area.`)
      : L(c.lang, `Eso vive en ${f.screen.es}: es «${f.name.es}», en el área de ${f.area.es}. Ahí ves las mismas cifras que yo uso para responderte.`, `That lives on ${f.screen.en}: it's "${f.name.en}", in the ${f.area.en} area. There you see the same figures I use to answer you.`),
    pieces: [], note: L(c.lang, `Su tema en el Manual es «${f.name.es}».`, `Its Manual topic is "${f.name.en}".`),
    source: [f.id], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* EL SEGUIMIENTO (§20, 1.3.380 — re-cosido en la integración del     */
/* banco, 1.3.383) — los cinco verbos contra el marco. La caja guarda */
/* el marco que cada respuesta deja y, antes de la cascada, intenta   */
/* resolver la pregunta nueva contra él. Si ningún verbo la resuelve, */
/* devuelve null y la cascada la sirve como pregunta fresca (L-S4: el */
/* tema nuevo abre su propio marco y nada del viejo se filtra). Toda  */
/* respuesta de seguimiento NOMBRA su marco en la primera línea       */
/* (L-S2) y calcula con los motores de siempre: el marco enruta,      */
/* jamás calcula (cerca 1 del brief de §20).                          */
/* ------------------------------------------------------------------ */

const MONTHS_ES_F = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_EN_F = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** El nombre de un mes para nombrar un marco: relativo si es este o
 * el pasado; su nombre (y su año si no es el de hoy) si es más viejo. */
function monthNameF(c: Ctx, key: string): string {
  if (key === c.key) return L(c.lang, "este mes", "this month");
  if (key === prevKey(c.key)) return L(c.lang, "el mes pasado", "last month");
  const m = Number(key.slice(5, 7)) - 1;
  const y = key.slice(0, 4);
  const name = c.lang === "en" ? MONTHS_EN_F[m] : MONTHS_ES_F[m];
  return y === c.today.slice(0, 4) ? name : L(c.lang, `${name} de ${y}`, `${name} ${y}`);
}

/** El nombre de una categoría para una pieza del seguimiento: una
 * línea sin categoría (o de una categoría ya fuera de la estructura)
 * se nombra «Sin categoría», como la casa la nombra — jamás en blanco. */
function catLabel(c: Ctx, id: string): string {
  return c.names.cat(id) || L(c.lang, "Sin categoría", "Uncategorized");
}

/** El gasto de un mes por categoría, del MISMO pool de summarize
 * (monthLines ∧ isSpendLine, valuado con inView): la descomposición
 * de una comparación cierra exacta contra summarize.spend porque es
 * una partición de su misma suma. */
function spendByCategory(c: Ctx, monthKey: string, filter?: ((l: Line) => boolean) | null): { map: Map<string, number>; lines: number } {
  const map = new Map<string, number>();
  let lines = 0;
  for (const l of monthLines(c.state, monthKey)) {
    if (!isSpendLine(c.state.structure, l)) continue;
    if (filter && !filter(l)) continue;
    const v = inView(l, c.display, c.rateE4);
    if (v === 0) continue;
    lines++;
    map.set(l.categoryId, (map.get(l.categoryId) ?? 0) + v);
  }
  return { map, lines };
}

/** El total de historia de un período (el pool de historiaAnswer,
 * intacto) — lo que desplazar y estrechar recomputan sobre el marco. */
function historiaPool(c: Ctx, p: Period, income: boolean, filter: ((l: Line) => boolean) | null): { total: number; lines: number; byCat: Map<string, number> } {
  const pool = allLines(c).filter((l) => inPeriod(c, l, p) && (income ? l.kind.startsWith("income") : isOut(l) && roleOf(c.state, l.categoryId) !== "savings") && (!filter || filter(l)));
  const byCat = new Map<string, number>();
  let total = 0;
  for (const l of pool) {
    const v = view(c, l);
    total += v;
    if (v !== 0) byCat.set(l.categoryId, (byCat.get(l.categoryId) ?? 0) + v);
  }
  return { total, lines: pool.length, byCat };
}

type CatDiff = { id: string; d: number };
function compareDiffs(c: Ctx, f: Extract<AskFrame, { kind: "compare2" }>): { diffs: CatDiff[]; ups: CatDiff[]; downs: CatDiff[]; lines: number } {
  const fn = f.filter ? filterFromDesc(c, f.filter) : null;
  const a = spendByCategory(c, f.monthA, fn);
  const b = spendByCategory(c, f.monthB, fn);
  const ids = new Set([...a.map.keys(), ...b.map.keys()]);
  const diffs = [...ids].map((id) => ({ id, d: (a.map.get(id) ?? 0) - (b.map.get(id) ?? 0) })).filter((x) => x.d !== 0);
  return {
    diffs,
    ups: diffs.filter((x) => x.d > 0).sort((x, y) => y.d - x.d),
    downs: diffs.filter((x) => x.d < 0).sort((x, y) => x.d - y.d),
    lines: a.lines + b.lines,
  };
}

/** La nota que cierra la aritmética de una descomposición: el otro
 * lado nombrado y la cuenta exacta — subidas − bajadas = diferencia. */
function closeNote(c: Ctx, ups: CatDiff[], downs: CatDiff[], diff: number): string {
  const sum = (xs: CatDiff[]) => xs.reduce((a, x) => a + Math.abs(x.d), 0);
  const names = (xs: CatDiff[]) => xs.map((x) => `${catLabel(c, x.id)} ${c.money(x.d)}`).join(", ");
  const close = L(c.lang, `La cuenta cierra: subidas ${c.money(sum(ups))} − bajadas ${c.money(sum(downs))} = ${c.money(diff)}.`, `The account closes: rises ${c.money(sum(ups))} − falls ${c.money(sum(downs))} = ${c.money(diff)}.`);
  if (diff > 0) {
    return downs.length
      ? `${L(c.lang, `También bajó: ${names(downs)}.`, `It also fell: ${names(downs)}.`)} ${close}`
      : `${L(c.lang, "Nada bajó: el aumento es subida entera.", "Nothing fell: the increase is all rise.")} ${close}`;
  }
  if (diff < 0) {
    return ups.length
      ? `${L(c.lang, `También subió: ${names(ups)}.`, `It also rose: ${names(ups)}.`)} ${close}`
      : `${L(c.lang, "Nada subió: la bajada es entera.", "Nothing rose: the drop is all fall.")} ${close}`;
  }
  return close;
}

function descomponerCompare(c: Ctx, f: Extract<AskFrame, { kind: "compare2" }>): BankResult {
  const { ups, downs, lines } = compareDiffs(c, f);
  const diff = f.totalA - f.totalB;
  const frameHead = L(c.lang, `Siguiendo tu comparación — ${f.labelA} contra ${f.labelB}`, `Following your comparison — ${f.labelA} vs ${f.labelB}`);
  if (!ups.length && !downs.length) {
    return { kind: "answer", family: "comparar", verdict: `${frameHead} — ${L(c.lang, "por categoría los dos meses son idénticos: no hay diferencia que repartir.", "by category the two months are identical: there's no difference to break down.")}`, pieces: [], note: null, source: ["libros.lineas", "libros.neto"], lines, frame: f };
  }
  const main = diff >= 0 ? ups : downs;
  return {
    kind: "answer", family: "comparar",
    verdict: diff > 0
      ? `${frameHead} — ${L(c.lang, `el aumento de ${c.money(diff)} vino sobre todo de:`, `the ${c.money(diff)} increase came mostly from:`)}`
      : diff < 0
        ? `${frameHead} — ${L(c.lang, `la bajada de ${c.money(-diff)} vino sobre todo de:`, `the ${c.money(-diff)} drop came mostly from:`)}`
        : `${frameHead} — ${L(c.lang, "en total quedaron iguales: lo que subió en unas categorías bajó en otras.", "the totals came out equal: what rose in some categories fell in others.")}`,
    pieces: (diff === 0 ? [...ups, ...downs].sort((x, y) => Math.abs(y.d) - Math.abs(x.d)) : main).slice(0, 4).map((x) => ({ label: catLabel(c, x.id), minor: x.d })),
    note: closeNote(c, ups, downs, diff),
    source: ["libros.lineas", "libros.neto"], lines, frame: f,
  };
}

function explicarCompare(c: Ctx, f: Extract<AskFrame, { kind: "compare2" }>): BankResult {
  const { ups, downs, lines } = compareDiffs(c, f);
  const diff = f.totalA - f.totalB;
  const frameHead = L(c.lang, `Siguiendo tu comparación — ${f.labelA} contra ${f.labelB}`, `Following your comparison — ${f.labelA} vs ${f.labelB}`);
  if (diff === 0) {
    return { kind: "answer", family: "comparar", verdict: `${frameHead} — ${L(c.lang, "no hay diferencia que explicar: los dos meses suman lo mismo.", "there's no difference to explain: the two months add up the same.")}`, pieces: [], note: null, source: ["libros.lineas", "libros.neto"], lines, frame: f };
  }
  const movers = [...ups, ...downs].sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 4);
  return {
    kind: "answer", family: "comparar",
    verdict: diff > 0
      ? `${frameHead} — ${L(c.lang, `${f.labelA} gastó ${c.money(diff)} más sobre todo porque:`, `${f.labelA} spent ${c.money(diff)} more mostly because:`)}`
      : `${frameHead} — ${L(c.lang, `${f.labelA} gastó ${c.money(-diff)} menos sobre todo porque:`, `${f.labelA} spent ${c.money(-diff)} less mostly because:`)}`,
    pieces: movers.map((x) => ({ label: catLabel(c, x.id), minor: x.d })),
    note: closeNote(c, ups, downs, diff),
    source: ["libros.lineas", "libros.neto"], lines, frame: f,
  };
}

function descomponerPeriod(c: Ctx, f: Extract<AskFrame, { kind: "period1" }>): BankResult {
  const fn = f.filter ? filterFromDesc(c, f.filter) : null;
  const { byCat, lines } = historiaPool(c, f.period, f.income, fn);
  const rows = [...byCat.entries()].map(([id, minor]) => ({ id, minor })).filter((x) => x.minor !== 0).sort((a, b) => b.minor - a.minor);
  const head = L(c.lang, `Siguiendo tu pregunta — en ${f.period.label}${f.filter ? `, en ${f.filter.label}` : ""}`, `Following your question — in ${f.period.label}${f.filter ? `, on ${f.filter.label}` : ""}`);
  if (!rows.length) {
    return { kind: "answer", family: "historia", verdict: `${head} — ${L(c.lang, "no hay líneas que repartir en ese período.", "there are no lines to break down in that period.")}`, pieces: [], note: null, source: ["libros.lineas", "historial.stream"], lines, frame: f };
  }
  return {
    kind: "answer", family: "historia",
    verdict: `${head} — ${f.income ? L(c.lang, "así entró:", "this is how it came in:") : L(c.lang, "así se reparte:", "this is how it breaks down:")}`,
    pieces: rows.slice(0, 5).map((x) => ({ label: catLabel(c, x.id), minor: x.minor })),
    note: null, source: ["libros.lineas", "historial.stream"], lines, frame: f,
  };
}

function desplazarCompare(c: Ctx, f: Extract<AskFrame, { kind: "compare2" }>): BankResult {
  const monthA = f.monthB;
  const monthB = prevKey(f.monthB);
  const fn = f.filter ? filterFromDesc(c, f.filter) : null;
  const totalOf = (k: string) => fn
    ? [...spendByCategory(c, k, fn).map.values()].reduce((a, v) => a + v, 0)
    : summarize(c.state, k, c.lang).spend;
  const totalA = totalOf(monthA);
  const totalB = totalOf(monthB);
  const labelA = monthNameF(c, monthA);
  const labelB = monthNameF(c, monthB);
  const nf: AskFrame = { kind: "compare2", monthA, monthB, labelA, labelB, totalA, totalB, filter: f.filter };
  const more = totalA >= totalB;
  return {
    kind: "answer", family: "comparar",
    verdict: L(c.lang, `Siguiendo tu comparación, un mes más atrás — ${labelA} contra ${labelB}: gastaste ${more ? "más" : "menos"} en ${more ? labelA : labelB}: ${c.money(totalA)} contra ${c.money(totalB)} (diferencia de ${c.money(Math.abs(totalA - totalB))}).`, `Following your comparison, one month further back — ${labelA} vs ${labelB}: you spent ${more ? "more" : "less"} in ${more ? labelA : labelB}: ${c.money(totalA)} vs ${c.money(totalB)} (a difference of ${c.money(Math.abs(totalA - totalB))}).`),
    pieces: [{ label: labelA, minor: totalA }, { label: labelB, minor: totalB }],
    note: null, source: ["libros.lineas", "libros.neto"], lines: 0, frame: nf,
  };
}

function desplazarPeriod(c: Ctx, f: Extract<AskFrame, { kind: "period1" }>): BankResult | null {
  if (f.period.kind !== "month") return null;
  const nk = prevKey(f.period.key);
  const label = monthNameF(c, nk);
  const period: Period = { kind: "month", key: nk, label };
  const fn = f.filter ? filterFromDesc(c, f.filter) : null;
  const { total, lines } = historiaPool(c, period, f.income, fn);
  const nf: AskFrame = { kind: "period1", period, income: f.income, filter: f.filter, total };
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `Siguiendo tu pregunta — en ${label} ${f.income ? "entraron" : "gastaste"} ${c.money(total)}${f.filter ? ` en ${f.filter.label}` : ""} — de ${lines} líneas.`, `Following your question — in ${label} ${f.income ? `${c.money(total)} came in` : `you spent ${c.money(total)}`}${f.filter ? ` on ${f.filter.label}` : ""} — from ${lines} lines.`),
    pieces: [{ label, minor: total }],
    note: null, source: ["libros.lineas", "historial.stream"], lines, frame: nf,
  };
}

function estrechar(c: Ctx, f: AskFrame, hit: FilterHit): BankResult {
  if (f.kind === "compare2") {
    const sum = (k: string) => [...spendByCategory(c, k, hit.fn).map.values()].reduce((a, v) => a + v, 0);
    const totalA = sum(f.monthA);
    const totalB = sum(f.monthB);
    const nf: AskFrame = { ...f, totalA, totalB, filter: hit.desc };
    return {
      kind: "answer", family: "comparar",
      verdict: L(c.lang, `Siguiendo tu comparación — ${f.labelA} contra ${f.labelB} — solo en ${hit.desc.label}: ${c.money(totalA)} contra ${c.money(totalB)} (diferencia de ${c.money(Math.abs(totalA - totalB))}).`, `Following your comparison — ${f.labelA} vs ${f.labelB} — only on ${hit.desc.label}: ${c.money(totalA)} vs ${c.money(totalB)} (a difference of ${c.money(Math.abs(totalA - totalB))}).`),
      pieces: [{ label: `${hit.desc.label} · ${f.labelA}`, minor: totalA }, { label: `${hit.desc.label} · ${f.labelB}`, minor: totalB }],
      note: null, source: ["libros.lineas", "libros.neto"], lines: 0, frame: nf,
    };
  }
  const { total, lines } = historiaPool(c, f.period, f.income, hit.fn);
  const nf: AskFrame = { ...f, filter: hit.desc, total };
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `Siguiendo tu pregunta — en ${f.period.label}, solo en ${hit.desc.label}: ${c.money(total)}.`, `Following your question — in ${f.period.label}, only on ${hit.desc.label}: ${c.money(total)}.`),
    pieces: [{ label: hit.desc.label, minor: total }],
    note: null, source: ["libros.lineas", "historial.stream"], lines, frame: nf,
  };
}

function proyectarSeguimiento(c: Ctx, f: AskFrame): BankResult {
  const head = f.kind === "compare2" ? L(c.lang, "Siguiendo tu comparación", "Following your comparison") : L(c.lang, "Siguiendo tu pregunta", "Following your question");
  if (!askReaches(c.mode, "advisor.projection")) {
    return {
      kind: "answer", family: "futuro",
      verdict: `${head}: ${L(c.lang, `lo que viene se lee en tu saldo proyectado, día a día — y vive en ${modeWord(c.lang, "completo")}.`, `what's coming is read in your day-by-day projected balance — and it lives in ${modeWord(c.lang, "completo")}.`)}`,
      pieces: [], note: null, source: ["asesor.lectura"], lines: 0, frame: f,
    };
  }
  const pace = summarize(c.state, c.key, c.lang).spend;
  return {
    kind: "answer", family: "futuro",
    verdict: `${head}: ${L(c.lang, `si el mes que viene repite el ritmo de este mes, gastarías ${c.money(pace)}.`, `if next month repeats this month's pace, you'd spend ${c.money(pace)}.`)}`,
    pieces: [{ label: L(c.lang, "Ritmo de este mes", "This month's pace"), minor: pace }],
    note: L(c.lang, "El supuesto, dicho: el gasto de este mes repetido el que viene. Es una proyección, no una promesa: un mes distinto mueve la cifra.", "The assumption, stated: this month's spend repeated next month. It's a projection, not a promise: a different month moves the figure."),
    source: ["asesor.lectura", "libros.neto"], lines: 0,
  };
}

const RE_DECOMP_F = /(en que (gaste|se me fue|se fue|gasto)|donde se (me )?fue|cual (fue|es) (el|la|mi) mayor|que fue lo (que )?mas|por categoria|desglos|what did i spend (the )?most|where did (it|my money) go|in what did i spend|by categor)/;
const RE_EXPLAIN_F = /(por que|a que se debe|why|what (caused|made))/;
const RE_SHIFT_F = /(y el mes anterior|y el anterior|el mes anterior|mes antes de ese|el de antes|and the month before|the month before|the one before|^y el mes pasado|^and last month|y el ano pasado|el ano anterior)/;
const RE_PROJECT_F = /(mes que viene|proximo mes|mes siguiente|next month|si sigo asi|sigo asi|seguir asi|keep (going|spending) like this|will i keep)/;
const RE_ANCHOR_F = /(este mes|mes pasado|esta semana|semana pasada|este ano|this month|last month|this week|last week|this year)/;

/** EL RESOLVEDOR DEL SEGUIMIENTO: la caja lo intenta contra el marco
 * vivo ANTES de la cascada. Devuelve la respuesta de seguimiento o
 * null — null significa «esto no es un seguimiento»: la cascada sirve
 * la pregunta como fresca y su respuesta abre el marco nuevo (L-S4).
 * Sin marco, solo DESCOMPONER tiene lectura sola legítima (L-S1): «¿en
 * qué gasté más?» en caja fresca es la mayor categoría del mes en
 * curso, nombrada como tal — jamás una comparación inventada. */
export function answerFollowUp(
  state: LedgerState,
  key: string,
  lang: Lang,
  names: Namer,
  raw: string,
  parseCtx: ParseCtx,
  today: string,
  frame: AskFrame | null,
  mode?: BookMode,
): BankResult | null {
  void parseCtx;
  const folded = foldQ(raw);
  const words = folded.split(/\s+/).filter(Boolean).length;
  const { display, rateE4 } = state.settings;
  const reading = readAdvisor(state, key, lang, names, { today: new Date(`${today}T12:00:00`) });
  const c: Ctx = {
    state, key, lang, names, today, display, rateE4,
    money: (n: number) => formatMoney(n, reading.currency, lang),
    mode: mode ?? bookMode(state),
    learned: [],
  };
  if (frame) {
    // Proyectar y desplazar traen su propio ancla: van primero.
    if (RE_PROJECT_F.test(folded) && !(frame.kind === "period1" && frame.income)) return proyectarSeguimiento(c, frame);
    if (RE_SHIFT_F.test(folded)) {
      const r = frame.kind === "compare2" ? desplazarCompare(c, frame) : desplazarPeriod(c, frame);
      if (r) return r;
    }
    // Explicar solo vive sobre una comparación (L-S3: su lectura
    // principal es la descomposición leída como causa).
    if (frame.kind === "compare2" && RE_EXPLAIN_F.test(folded)) return explicarCompare(c, frame);
    // Una pregunta con su propio ancla de período no es seguimiento:
    // la cascada la sirve fresca (L-S4).
    if (RE_ANCHOR_F.test(folded)) return null;
    if (RE_DECOMP_F.test(folded)) {
      return frame.kind === "compare2" ? descomponerCompare(c, frame) : descomponerPeriod(c, frame);
    }
    // Estrechar: nombra un sujeto y no trae ni monto ni ancla propia.
    if (!/cuanto|how much/.test(folded) && (words <= 7 || /^y /.test(folded) || /solo|only/.test(folded))) {
      const hit = filterDescOf(c, folded);
      if (hit && hit.desc.label !== frame.filter?.label) return estrechar(c, frame, hit);
    }
    return null;
  }
  // Sin marco (L-S1): la lectura sola de descomponer, corta y elíptica.
  if (RE_DECOMP_F.test(folded) && words <= 7 && !RE_ANCHOR_F.test(folded)) {
    const { map, lines } = spendByCategory(c, key);
    const rows = [...map.entries()].map(([id, minor]) => ({ id, minor })).filter((x) => x.minor !== 0).sort((a, b) => b.minor - a.minor);
    if (!rows.length) return null;
    const total = rows.reduce((a, x) => a + x.minor, 0);
    const period: Period = { kind: "month", key, label: L(lang, "este mes", "this month") };
    return {
      kind: "answer", family: "historia",
      verdict: L(lang, `Este mes, tu mayor gasto es ${catLabel(c, rows[0].id)}: ${c.money(rows[0].minor)}.`, `This month, your biggest spend is ${catLabel(c, rows[0].id)}: ${c.money(rows[0].minor)}.`),
      pieces: rows.slice(0, 4).map((x) => ({ label: catLabel(c, x.id), minor: x.minor })),
      note: null, source: ["libros.lineas", "historial.stream"], lines,
      frame: { kind: "period1", period, income: false, filter: null, total },
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* EL JUICIO — el orden de familias ES la inteligencia del motor.     */
/* ------------------------------------------------------------------ */
// ── OLA 14 · LA SEGUNDA MITAD — la doble intención ──────────────────
//
// CAZA-TRAMPAS cazó la clase: la pregunta con DOS preguntas perdía su
// segunda mitad en silencio — el motor respondía la primera y la otra
// desaparecía sin dejar rastro. La cura: antes de la cascada, la
// pregunta compuesta se parte por su conjunción cuando AMBAS patas
// tienen forma de pregunta propia (familia del oído, Ola 13, o palabra
// interrogativa); cada pata se juzga por la cascada de siempre; la
// respuesta trae las dos, cada una con su fuente. Si una pata no se
// puede responder, la respuesta lo NOMBRA — la mitad perdida se dice,
// no se entierra. Ante la duda no se parte: partir mal es peor que no
// partir, y la pregunta entera cae a la cascada como siempre.
function splitCompound(raw: string): [string, string] | null {
  const legOk = (side: string): boolean => {
    const c = classifyBankQuestion(side);
    return c.family !== null || /\b(cuanto|cuanta|cuantos|cuantas|cuando|cual|cuales|quien|quienes|como|donde)\b/.test(foldQ(side));
  };
  for (const m of raw.matchAll(/\s+(y|and)\s+/gi)) {
    const idx = m.index ?? -1;
    if (idx < 8) continue;
    const left = raw.slice(0, idx).trim();
    const right = raw.slice(idx + m[0].length).trim();
    if (left.length < 10 || right.length < 8) continue;
    if (legOk(left) && legOk(right)) return [left, right];
  }
  return null;
}

export function answerBankQuestion(
  state: LedgerState,
  key: string,
  lang: Lang,
  names: Namer,
  raw: string,
  parseCtx: ParseCtx,
  today: string,
  pin?: { accountId: string },
  mode?: BookMode,
  learned?: LearnedAlias[],
): BankResult {
  if (!pin) {
    const legs = splitCompound(raw);
    if (legs) {
      const a = answerSingle(state, key, lang, names, legs[0], parseCtx, today, undefined, mode, learned);
      const b = answerSingle(state, key, lang, names, legs[1], parseCtx, today, undefined, mode, learned);
      if (a.kind === "answer" && b.kind === "answer") {
        const actions = [...(a.actions ?? []), ...(b.actions ?? [])].slice(0, 3);
        return {
          kind: "answer", family: a.family,
          verdict: `${a.verdict} ${b.verdict}`,
          pieces: [...a.pieces, ...b.pieces].slice(0, 5),
          note: a.note ?? b.note,
          source: [...new Set([...a.source, ...b.source])],
          lines: a.lines + b.lines,
          ...(actions.length ? { actions } : {}),
        };
      }
      const good = a.kind === "answer" ? a : b.kind === "answer" ? b : null;
      if (good && good.kind === "answer") {
        const lost = (a.kind === "answer" ? legs[1] : legs[0]).replace(/[¿?]+$/g, "").trim();
        const named = L(lang,
          `De tu otra pregunta — «${lost}» — no tengo cómo responderla con lo que tu libro guarda; no la pierdo en silencio.`,
          `Your other question — "${lost}" — I have no way to answer from what your book holds; I won't lose it in silence.`);
        return { ...good, note: good.note ? `${good.note} ${named}` : named };
      }
      // Ninguna pata respondió: la pregunta entera merece su oportunidad.
    }
  }
  return answerSingle(state, key, lang, names, raw, parseCtx, today, pin, mode, learned);
}

function answerSingle(
  state: LedgerState,
  key: string,
  lang: Lang,
  names: Namer,
  raw: string,
  parseCtx: ParseCtx,
  today: string,
  pin?: { accountId: string },
  mode?: BookMode,
  learned?: LearnedAlias[],
): BankResult {
  const folded = foldQ(raw);
  const { display, rateE4 } = state.settings;
  const reading = readAdvisor(state, key, lang, names, { today: new Date(`${today}T12:00:00`) });
  const c: Ctx = {
    state, key, lang, names, today, display, rateE4,
    money: (n: number) => formatMoney(n, reading.currency, lang),
    // El modo lo enhebra la caja (ask-box) desde la sesión; sin
    // enhebrar, se lee del propio libro — el mismo valor por la misma
    // fuente (modeOf sobre settings), para que ningún llamador pueda
    // responder en un modo que el libro no tiene.
    mode: mode ?? bookMode(state),
    learned: learned ?? [],
  };

  // 0 · EL ESCENARIO (injerto de la fusión, 1.3.355): «si sacara $X, ¿qué
  // impacto tendría en mis ahorros?» es cuenta-origen con monto, aunque
  // nombre los ahorros — el impacto se calcula por cuenta, y con varias
  // cuentas que cubren, la pregunta de vuelta manda antes de calcular.
  if (/(si sacara|si saco|si retiro|que impacto|what if i (take|took|withdraw)|if i (take|took|withdraw))/.test(folded)) {
    return cuentaOrigenAnswer(c, raw, parseCtx, pin?.accountId);
  }
  // 0r · EL CAMINO (§19.1, 1.3.365 — LA COSTURA OBLIGADA de la
  // integración del banco, DERIVA-378): «¿llego al día X?», «¿cómo
  // llego a fin de mes?», «¿cuál es mi día más apretado?» son del
  // saldo proyectado — se juzgan aquí, POR DELANTE de la cascada del
  // banco, porque su frase roza a varias familias (futuro, agenda) y
  // su verdad es una sola: la caminata de projection.ts, la misma de
  // la lectura del Asesor. Responde el delegado de ask.ts, con su
  // piso declarado. Sin esta costura, dos motores responderían la
  // misma pregunta con dos métodos — la mezcla que la doctrina de
  // los tres tiempos prohíbe: el futuro con fecha tiene UN proyector.
  if (parseQuestion(raw, parseCtx)?.intent === "reach") {
    const base: AskResult = answerQuestion(state, key, lang, names, raw, parseCtx, today, c.mode);
    if (base.kind === "answer") {
      return {
        kind: "answer", family: "reach", verdict: base.verdict,
        pieces: base.pieces, note: base.note, draft: base.draft,
        source: ["asesor.lectura"], lines: 0,
      };
    }
    return { kind: "unknown" };
  }
  // 0b · HIPOTÉTICOS Y CALCULADORA (ola 4): «si…» con números TRAÍDOS
  // manda sobre las familias del libro — la pregunta no habla de lo
  // anotado sino de un escenario, y responderla con la queda a secas
  // sería otro desvío. Primero el hipotético (aplica al libro), luego
  // la calculadora pura (no lo toca).
  if (/\bsi\b|if i|divid|repart|por ciento|porcentaje|%|cuanto es|cuanto son|cuanto seria|convert|cuantos dias|en cuantos|que dia|que fecha|a la semana|al mes|dejo|dejara|colchon|respaldo|cuantos meses|cuanto.*ahorrar|tardaria|juntar|a como esta|tipo de cambio|me entraron|me depositaron|eramos|la cuenta fue|cuanto.{0,12}toca/.test(folded)) {
    const h = hipoteticoAnswer(c, folded, raw, pin?.accountId);
    if (h) return h;
    const conv = conversorAnswer(c, folded, raw);
    if (conv) return conv;
    const tasa = tasaAnswer(c, folded);
    if (tasa) return tasa;
    const cal = calendarioAnswer(c, folded);
    if (cal) return cal;
    // OLA 9 (CAZA-TIEMPO clase 2): la META manda sobre el RITMO —
    // «¿cuánto tengo que ahorrar a la semana para llegar a 2000 en 10
    // meses?» se leía como cadencia («$2,000 a la semana son $8,666 al
    // mes»). La meta inversa se juzga ANTES que la calculadora: su
    // forma (ahorrar + meta + plazo) es más específica que el ritmo.
    const mt = metaAnswer(c, folded, raw);
    if (mt) return mt;
    // OLA 16: el reparto NOMBRADO se juzga antes que la calculadora —
    // la calculadora sigue dueña del reparto anónimo («en tres partes»).
    const rp = repartoAnswer(c, folded, raw);
    if (rp) return rp;
    const calc = calculadoraAnswer(c, folded, raw);
    if (calc) return calc;
    // OLA 8: el contrafactual MIDE el monto en el historial en vez de
    // traerlo; el colchón y la meta inversa despejan sobre el stock.
    const cf = contrafactualAnswer(c, folded, raw);
    if (cf) return cf;
    const rb = respaldoAnswer(c, folded);
    if (rb) return rb;
    // OLA 15: el simulador ensaya el pago traído contra el motor del
    // propio Plan — y su segunda forma camina hasta el día D.
    const sim = simuladorAnswer(c, folded, raw);
    if (sim) return sim;
  }
  // 0c- · EL APRENDIZAJE (ola 17): «¿qué has aprendido?» y «olvida…»
  // se juzgan antes que todo lo genérico — hablan de los patrones del
  // usuario, no de sus cifras, y ninguna familia de dinero debe
  // secuestrarlas.
  {
    const ap = aprendizajeAnswer(c, folded);
    if (ap) return ap;
  }
  // 0c · CONFIRMACIÓN (ola 9, CAZA-TRAMPAS clase 4): una afirmación con
  // cifra se JUZGA contra su motor antes de enrutar — «Mis ahorros son
  // 500, ¿verdad?» no es una pregunta de ahorros, es una premisa que se
  // confirma o se corrige con la cifra real.
  {
    const r = confirmacionAnswer(c, folded, raw);
    if (r) return r;
  }
  // 1 · AHORROS antes que todo lo genérico (la cura del desvío) — pero
  // «sin tocar mis ahorros» es free: su trampa manda sobre la palabra.
  const isFreeTrap = /sin (tocar|afectar|mover|usar).{0,24}(ahorro|apartad|guardad)|without touching/.test(folded);
  if (!isFreeTrap && ((/(ahorr|guardad|apartad|colchon|fondo|savings|save|set aside|cushion|emergency fund)/.test(folded) && /(cuanto|que|como|how much|how|suficiente|me falta|basta)/.test(folded)) || /(cuanto (tengo|hay|queda) en|how much (do i have|is) in)/.test(folded))) {
    // LA GUARDA DE HORIZONTE (ola 9, CAZA-TIEMPO clase 4; doctrina de
    // Oscar 2026-11-21: los tres tiempos no se mezclan sin intención).
    // «¿Cuánto tendré ahorrado en 6 meses si sigo así?» recibía el stock
    // de HOY como si fuera el futuro. Una pregunta de horizonte futuro
    // jamás se responde con la cifra del presente: su casa es el
    // proyector (familia reach, viva en canon) — aquí, silencio honesto
    // antes que un presente disfrazado de futuro.
    if (/(tendr|en (\d+|dos|tres|cuatro|cinco|seis|doce) meses|en un ano|si sigo|si ahorro|de aqui a|a fin de ano|para fin de|will i have|in (\d+|two|three|four|five|six|twelve) months|by the end of)/.test(folded)) {
      // OLA 12: la guarda prohíbe disfrazar el presente de futuro — no
      // prohíbe PROYECTAR. Si la pregunta trae su horizonte (un mes
      // nombrado o N meses), el futuro se calcula como futuro: el
      // stock de hoy MÁS tu ritmo medido de apartado por los meses del
      // horizonte, con el supuesto dicho. Sin horizonte legible, la
      // guarda sigue mandando: silencio honesto.
      let horizon: number | null = null;
      const nm = folded.match(/en (\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce) meses/);
      if (nm) horizon = Number(nm[1]) || WORD_NUM[nm[1]] || null;
      if (horizon === null) {
        for (let i = 1; i <= 12; i++) {
          const [es, en] = MONTH_LABELS[String(i)];
          if (new RegExp(`(^|[^a-z])${es}([^a-z]|$)`).test(folded) || new RegExp(`(^|[^a-z])${en.toLowerCase()}([^a-z]|$)`).test(folded)) {
            let diff = i - Number(c.key.slice(5, 7));
            if (diff <= 0) diff += 12;
            horizon = diff;
            break;
          }
        }
      }
      if (horizon === null) return { kind: "unknown" };
      const stockH = savingsStock(c.state, c.key);
      const keysH = Object.keys(c.state.months).filter((k) => k <= c.key);
      const paceH = keysH.length ? Math.round(allLines(c).filter((l) => roleOf(c.state, l.categoryId) === "savings").reduce((a, l) => a + view(c, l), 0) / keysH.length) : 0;
      const projected = stockH.total + paceH * horizon;
      return {
        kind: "answer", family: "ahorros",
        verdict: L(c.lang, `Si tu ritmo de apartado sigue como tu promedio medido (${c.money(paceH)} al mes), en ${horizon} mes${horizon === 1 ? "" : "es"} tendrás unos ${c.money(projected)} guardados: hoy son ${c.money(stockH.total)} y el ritmo suma ${c.money(paceH * horizon)}.`, `If your set-aside pace stays at your measured average (${c.money(paceH)} a month), in ${horizon} month${horizon === 1 ? "" : "s"} you'd have about ${c.money(projected)} saved: today it's ${c.money(stockH.total)} and the pace adds ${c.money(paceH * horizon)}.`),
        pieces: [{ label: L(c.lang, "Hoy", "Today"), minor: stockH.total }, { label: L(c.lang, "El ritmo suma", "The pace adds"), minor: paceH * horizon }, { label: L(c.lang, "Proyectado", "Projected"), minor: projected }],
        note: L(c.lang, "Es una proyección con el supuesto a la vista — no el saldo de hoy disfrazado de futuro: si tu ritmo cambia, el número cambia.", "It's a projection with its assumption in plain sight — not today's balance dressed as the future: if your pace changes, the number changes."),
        source: ["ahorros.stock", "ahorros.mes"], lines: 0,
      };
    }
    return ahorrosAnswer(c, folded);
  }
  // 1b · LA REGLA (ola 12): los tres cubos contra la 50·30·20 — antes
  // de gustos, que es su cubo suelto (reglaAnswer cede ante «gustos»).
  {
    const r = reglaAnswer(c, folded);
    if (r) return r;
  }
  // 2 · GUSTOS (capacidad o chequeo con la palabra gustos/antojos).
  if (/(gustos|antojos|treats|wants)/.test(folded)) return gustosAnswer(c, folded, raw, parseCtx);
  // 3 · YA PAGUÉ (la premisa se juzga primero).
  if (/(ya pague|ya page|did i (already )?pay|have i paid)/.test(folded)) return yaPagueAnswer(c, folded);
  // 4 · CUENTA-ORIGEN (¿de qué cuenta…? con monto).
  if (/(de que cuenta|de donde saco|which account|where should i take)/.test(folded)) return cuentaOrigenAnswer(c, raw, parseCtx, pin?.accountId);
  // 4b · CONTEO (ola 2): «¿cuántas X…?» cuenta un ciudadano del mapa;
  // su patrón (cuántas/cuántos + nombre) no pisa a ninguna otra familia.
  {
    const r = conteoAnswer(c, folded);
    if (r) return r;
  }
  // 4b2 · FRECUENCIA (ola 12): «¿cuántas veces…?», «¿cada cuánto…?»,
  // «¿qué suscripciones tengo?» — el conteo y la cadencia de un filtro.
  {
    const r = frecuenciaAnswer(c, folded);
    if (r) return r;
  }
  // 4c · DEUDAS PLANAS (ola 9, CAZA-DIARIA C5): «¿cuánto debo en
  // total?», «¿cuánto me debe Ana?», «¿a quién le presté?» — sin
  // superlativo ni «cuántas»: la puerta llana de peopleOf/loansOf/
  // tarjetas, con la contradicción de dirección dicha.
  {
    const r = deudasAnswer(c, folded);
    if (r) return r;
  }
  // 4d · PROMEDIO Y PRECIO DEL TIEMPO (ola 12): el ritmo diario, el
  // promedio verdadero, el gasto seguro de hoy y el precio en días de
  // trabajo — antes de historia, cuya puerta también los rozaba.
  {
    const r = promedioAnswer(c, folded);
    if (r) return r;
    const pt = precioTiempoAnswer(c, folded, raw);
    if (pt) return pt;
    // El gasto FIJO mensual (batería del mundo): las clases fijas del
    // propio resumen — fijo + suscripciones — dichas como un número.
    if (/(gasto fijo|gastos fijos|fixed (spend|expenses|costs)|cuanto pago fijo)/.test(folded)) {
      // Medido a mano, no del resumen: summarize.fixed cuenta TAMBIÉN
      // las líneas de rol ahorro con clase fija (un apartado no es un
      // gasto fijo) — aquí el rol ahorro queda fuera, como en todo el
      // gasto del banco.
      const monthPool = (c.state.months[c.key]?.lines ?? []).filter((l) => l.active && roleOf(c.state, l.categoryId) !== "savings");
      const fijos = monthPool.filter((l) => l.kind === "expense-fixed").reduce((a, l) => a + view(c, l), 0);
      const subsF = monthPool.filter((l) => l.kind === "subscription").reduce((a, l) => a + view(c, l), 0);
      return {
        kind: "answer", family: "promedio",
        verdict: L(c.lang, `Tu gasto fijo del mes es ${c.money(fijos + subsF)}: ${c.money(fijos)} de gastos fijos y ${c.money(subsF)} de suscripciones — sin contar lo apartado, que no es gasto.`, `Your fixed spend this month is ${c.money(fijos + subsF)}: ${c.money(fijos)} of fixed expenses and ${c.money(subsF)} of subscriptions — not counting set-asides, which aren't spending.`),
        pieces: [{ label: L(c.lang, "Fijos", "Fixed"), minor: fijos }, { label: L(c.lang, "Suscripciones", "Subscriptions"), minor: subsF }],
        note: null, source: ["libros.lineas", "asesor.lectura"], lines: 0,
      };
    }
  }
  // 5 · HISTORIA con período manda sobre recencia: «¿cuánto gasté el
  // ÚLTIMO mes…?» trae «último» pero pregunta una suma, no una línea.
  // OLA 9 (CAZA-DIARIA C4): la puerta ya no exige el pretérito exacto y
  // adyacente — el presente también es historia («¿cuánto gasto/pago/
  // gano…?», «¿cuánto ME entró?», «¿cuánto pago de Internet?», «¿cuánto
  // costaron los zapatos?»). El período resuelto manda: sin período
  // nombrado, es el mes en curso, que es lo que el presente pregunta.
  if (/(cuanto (gaste|gasto|gano|gane|entro|ingrese|ingreso|llevo|pago)|cuanto me (entro|entra)|cuanto (pago|cuesta|cuestan|costaron|costo) |how much (did|do) i (spend|earn|pay)|cuanto he (gastado|ganado|recibido)|cuanto (ha entrado|dinero ha entrado|dinero entro)|cuanto es mi (ingreso|sueldo|salario)|mi ingreso mensual|how much (did i earn|do i earn|have i earned|has come in|came in))/.test(folded)) return historiaAnswer(c, folded);
  // 6 · RECENCIA (lo último…).
  if (/(ultim|last time|last thing|cuando fue)/.test(folded)) {
    const r = recenciaAnswer(c, folded);
    if (r) return r;
  }
  // 5b · CALENDARIO DESDE SU PROPIO GATILLO (ola 9, cazas TIEMPO y
  // DIARIA C7): la herramienta existía pero solo se invocaba dentro de
  // la compuerta 0b, cuya lista de palabras no incluía «vence» — «¿cuándo
  // vence mi Internet?» caía en silencio con el patrón exacto codificado.
  // Cada herramienta se invoca también desde su gatillo natural.
  if (/(cuando vence|en cuantos dias|cuantos dias faltan|que dia cae|que dia es el|cuando me toca|cuando se paga|cuando hay que pagar|when is .* due|when do i pay|how many days (until|left|till))/.test(folded)) {
    const r = calendarioAnswer(c, folded);
    if (r) return r;
  }
  // 6 · AGENDA (lo que viene / fechas de pago).
  // OLA 12: «¿cuánto tengo que pagar antes de fin de mes?» pide la SUMA
  // de la ventana hasta fin de mes, no la lista — su propia rama.
  if (/(cuanto tengo que pagar|cuanto me toca pagar|cuanto hay que pagar|how much do i have to pay)/.test(folded)) {
    const dayN = Number(c.today.slice(8, 10));
    const daysIn = new Date(Number(c.key.slice(0, 4)), Number(c.key.slice(5, 7)), 0).getDate();
    const items = duesWindow(c.state, Math.max(0, daysIn - dayN), c.today);
    const total = items.reduce((a, d) => a + (d.amt ?? 0), 0);
    return {
      kind: "answer", family: "agenda",
      verdict: L(c.lang, `Antes de fin de mes te tocan ${items.length} pago${items.length === 1 ? "" : "s"} por ${c.money(total)} en total.`, `Before month's end you have ${items.length} payment${items.length === 1 ? "" : "s"} due, ${c.money(total)} in total.`),
      pieces: items.slice(0, 4).map((d) => ({ label: `${d.name} · ${d.on}`, minor: d.amt ?? 0 })),
      note: null, source: ["cobros.cuotas"], lines: items.length,
      actions: reportDoor(c, "cobros.cuotas", "Verlo en Cobros", "See it in Payments"),
    };
  }
  if (/(primeras cuotas|fechas en las que pago|que vence|cuando pago mis|what.*due|when do i pay|pagos vienen|viene esta semana|proximos pagos|pagos de esta semana|payments (coming|due)|proximo pago|next payment|next due)/.test(folded)) return agendaAnswer(c);
  // 6c · LA ESTACIONALIDAD (ola 15) antes que el relator: «¿en qué MES
  // gasto más?» es el año, no la categoría del mes.
  {
    const r = estacionalidadAnswer(c, folded);
    if (r) return r;
  }
  // 6c · EL RELATOR (ola 12): «¿cómo fue mi mes?», «¿en qué se me va
  // el dinero?» — el relato de un período con sus piezas y su puerta.
  {
    const r = relatorAnswer(c, folded);
    if (r) return r;
  }
  // 6b · EXTREMOS (ola 2): el superlativo sobre las líneas, antes que
  // RANKING — «el gasto más grande» es una línea, no una persona.
  {
    const r = extremosAnswer(c, folded);
    if (r) return r;
  }
  // 7 · RANKING (quién/cuál más).
  if (/(quien|who).*(mas|most)|en cual (cuenta|tarjeta).*(mas|debo)|which.*most/.test(folded)) {
    const r = rankingAnswer(c, folded);
    if (r) return r;
  }
  // 8 · REMESAS como patrón (cuándo y a quién / cuánto envío en remesas).
  if (/(remesa|remittance)/.test(folded) && /(cuando|quien|cuanto|ritmo|when|who|how much)/.test(folded)) return remesasAnswer(c);
  // 8b · ACCIONES (ola 5): la intención de enviar propone la acción —
  // tras el patrón de remesas, que es una pregunta; esto es un hacer.
  {
    const r = accionesAnswer(c, folded, raw);
    if (r) return r;
  }
  // 8c · SÍNTESIS COMPARATIVA (ola 9, doctrina de Oscar): pasado
  // medido × futuro proyectado en el presente — antes que comparar,
  // cuya forma es de dos períodos cerrados.
  {
    const r = sintesisAnswer(c, folded);
    if (r) return r;
  }
  // 9 · COMPARAR (antes que historia: trae dos patas). OLA 12: la
  // puerta se ensancha a las formas de la familia — la batería del
  // mundo mostró comparaciones ordinarias («¿gano más de lo que
  // gasto?», «¿en qué mes gasté más, agosto o septiembre?») muriendo
  // en una puerta que solo dejaba pasar dos frases. compararAnswer
  // devuelve null ante lo que no es suyo: la puerta ancha no roba.
  if (/(mas|more|menos|less|mejor|peor|better|worse|diferencia|difference|mucho|poco|a lot|too much)/.test(folded)) {
    const r = compararAnswer(c, folded);
    if (r) return r;
  }
  // 11 · FUTURO (terminar de pagar).
  const fut = futuroAnswer(c, folded);
  if (fut) return fut;
  // 11b · EL ASESOR MISMO (ola 3): qué puede y qué no puede hacer —
  // se describe desde el banco, antes de faro-mismo (que nombra
  // pantallas) y del delegado (que lo desviaría a «cómo voy»).
  if (/(que no (puedes|puedo|puede) hacer|que no sabes|tus limites|no puedes hacer|what can'?t you do|what can i not|what do you not|limitations)/.test(folded)) return limitesAnswer(c);
  if (/(que puedes hacer|que sabes hacer|para que sirves|que puede hacer|what can you do|what do you do)/.test(folded)) return capacidadesAnswer(c);
  // 12 · FARO MISMO (dónde veo / cómo hago).
  // OLA 25 (Q25-1) — la puerta, re-cosida en la integración (1.3.383):
  // «¿cómo comparto…?», «¿cómo me llama Faro?» y «¿dónde cambio el
  // nombre…?» no casaban con ninguna forma de la puerta del banco y
  // caían en silencio antes de llegar al mapa.
  // OLA 26 (Familia 5): la puerta aprende «guardo» — «¿cómo guardo
  // una pregunta?» y «¿dónde guardo mis preguntas?» son de la fila a
  // la mano que el mapa aprende en la misma cura.
  if (/(donde (veo|esta|encuentro|cambio|guardo)|como (hago|importo|cambio|veo|comparto|guardo)|como me (llama|llamo)|where (do|can) i|how do i)/.test(folded)) {
    const r = faroMismoAnswer(c, folded);
    if (r) return r;
  }
  // 13 · Lo heredado de la Ola 5a, intacto: spend / free / left / how.
  // El modo viaja también al delegado: su familia free trae las mismas
  // piezas de la resta (apartado, colchón) y nombran el mismo piso.
  const base: AskResult = answerQuestion(state, key, lang, names, raw, parseCtx, today, c.mode);
  if (base.kind === "answer") {
    return {
      kind: "answer", family: base.intent, verdict: base.verdict,
      pieces: base.pieces, note: base.note, draft: base.draft,
      source: base.intent === "free" ? ["central.tengo", "ahorros.stock", "cobros.cuotas", "ahorros.colchon"]
        : base.intent === "left" ? ["central.queda"]
        : base.intent === "how" ? ["asesor.lectura"]
        : ["asesor.lectura", "cobros.cuotas"],
      lines: 0,
    };
  }
  if (base.kind === "need-amount") return { kind: "need-amount", family: "gustos" };
  return { kind: "unknown" };
}

// ── OLA 13 · LA PUERTA GENEROSA — el clasificador de la referencia ──
//
// El §21 falló la separación de identidades: la búsqueda nunca calcula
// cifras; si el texto trae forma de pregunta, pone UNA referencia que
// lleva la pregunta, tal como se escribió, a la caja del Asesor — y el
// Asesor responde en su casa. Para rotular esa puerta, la búsqueda toma
// prestado el OÍDO del banco: este clasificador. Recibe SOLO el texto
// (jamás el libro, jamás un estado), no calcula una sola cifra y no
// puede responder nada: nombra la puerta y la familia que recibiría la
// pregunta. Generoso por diseño — una puerta de más no daña a nadie —
// mientras el motor de respuestas sigue estricto. Su consistencia con
// el motor la cerca el banco: donde el motor responde con familia, el
// oído no puede nombrar otra.
export function classifyBankQuestion(raw: string): { isQuestion: boolean; family: BankFamilyId | "aprendizaje" | null } {
  const folded = foldQ(raw);
  const isQuestion = /[¿?]/.test(raw)
    || /\b(cuanto|cuanta|cuantos|cuantas|cuando|donde|cual|cuales|quien|quienes|como|por que|para que|puedo|puedes|puede|debo|hay|tengo|quiero|necesito|sabes|dime|muestrame|ensename)\b/.test(folded)
    || /^(si |if )/.test(folded);
  if (!isQuestion) return { isQuestion: false, family: null };
  const hasDigit = /\d/.test(folded);
  const G: Array<[RegExp, BankFamilyId | "aprendizaje"]> = [
    [/(que no (puedes|puedo)|no (puedes|podrias) hacer|tus limites|limitaciones|what can'?t you)/, "limites"],
    [/(que (puedes|puedo) hacer|que sabes hacer|para que sirves|what can you do|tus funciones|que funciones tienes)/, "capacidades"],
    [/(que has aprendido|lo que has aprendido|tus patrones|aprendido de mi)/, "aprendizaje"],
    [/(si (dejo|dejara|dejas) de|si no (gastara|comprara|fuera|gastase)|dejara de gastar)/, "contrafactual"],
    [/(cuanto (me dura|dura) (mi|el|lo)|meses (puedo vivir|de respaldo)|sin trabajo|sin ingresos|me despiden|pierdo mi trabajo|fondo de emergencia|mi colchon)/, "respaldo"],
    [/(tardaria|tardare|cuanto (necesito|debo|tengo) que ahorrar|cuanto (debo|necesito) ahorrar|cuanto ahorrar|quiero (juntar|ahorrar|reunir)|juntar \d|meta de ahorro)/, "meta"],
    [/(en (cordobas|dolares|euros)|a (cordobas|dolares)|tipo de cambio|a como esta el cambio|cuanto (es|son) .{0,30}(dolares|cordobas|euros|pesos))/, "conversor"],
    [/(cuando (vence|es|cae|toca)|en cuantos dias|cuantos dias (faltan|quedan|para)|que dia (es|sera|cumple))/, "calendario"],
    [/(de que cuenta (saco|pago|tomo)|cual cuenta (uso|conviene)|de donde saco)/, "cuenta-origen"],
    [/(50.?30.?20|la regla|deberia gastar en|cuanto deberia (gastar|ahorrar))/, "regla"],
    [/(promedio|gasto fijo|cuanto puedo gastar hoy|seguro gastar)/, "promedio"],
    [/(gustos|antojos|puedo gastar|darme el gusto|capricho)/, "gustos"],
    [/(cuantas|cuantos) (cuotas|tarjetas|cuentas|prestamos|deudas|suscripciones)/, "conteo"],
    [/(ultima vez|cuando fue la ultima|la ultima (cosa|compra|vez)|last time)/, "recencia"],
    [/(cuantas veces|cada cuanto|cada cuantos|que suscripciones tengo|mas frecuente|duplicad|ha subido|subio de precio|que dia (gasto|compro) mas)/, "frecuencia"],
    [/(dias de trabajo|horas de trabajo|por (dia|hora) de trabajo|cuesta.{0,30}de trabajo)/, "precio-tiempo"],
    [/(como (fue|va|me fue)|en que se me va|en que gasto mas|resumen de|como cerro|mi mes (pasado|anterior))/, "relator"],
    [/(vence|vencen|proximo pago|tengo que pagar|por pagar|se me vence|upcoming|next payment)/, "agenda"],
    [/(tendre ahorrado|tendria ahorrado|ahorrado en \d+ meses)/, "ahorros"],
    [/(cuando termino|termino de pagar|acabo de pagar|en \d+ meses|para (diciembre|enero|navidad))/, "futuro"],
    [/(quiero (enviar|mandar)|voy a (enviar|mandar)|necesito (enviar|mandar)|^(envia|manda|enviar|mandar)\b|remesa (a|para|de)|envio (a|para|de))/, "acciones"],
    [/(a estas alturas|voy (mejor|peor)|a este ritmo|como voy (este|el) mes)/, "sintesis"],
    [/(quien (me debe|gasta|debe) mas|a quien le debo mas|who owes me (the )?most)/, "ranking"],
    [/(debo|deuda|prestamo|me debe|me deben|le debo|saldo de (mi|la) tarjeta|i owe|owes me)/, "deudas"],
    [/(mas (grande|caro|alto)|menor (gasto|compra|ingreso)|mayor (gasto|compra|ingreso)|biggest|largest|smallest|gasto mas (grande|caro)|compra mas (grande|cara))/, "extremos"],
    [/(mas que|menos que|diferencia (entre|de)|mejor (mes|que)|peor (mes|que)|comparad|versus)/, "comparar"],
    [/(ahorr|tendre ahorrado|tendria ahorrado|cuanto tengo en|mi cuenta de ahorros)/, "ahorros"],
    [/(cuanto (gaste|gastado|gano|gane|ganado|pague|pagado|compre|recibi|recibido)|he (gastado|ganado|pagado|comprado)|gasto en|gaste en|cuanto gasto|el mes pasado|este mes|este ano|la semana pasada|en (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b)/, "historia"],
  ];
  // La confirmación exige su cifra: sin dígito no hay afirmación que juzgar.
  if (hasDigit && /(verdad|es cierto|es verdad|no es asi|is it true)/.test(folded)) return { isQuestion, family: "confirmacion" };
  // El hipotético y la calculadora se juzgan por su forma y sus montos.
  if (/^si (uso|gasto|compro|pago|me regalan|recibo)/.test(folded) && /(quedaria|queda|tendria|seria)/.test(folded)) return { isQuestion, family: "hipotetico" };
  if (hasDigit && /(mas|\+|suma|total|resta|menos|divid|repart|por ciento|porcentaje|%|entre \d|partes iguales)/.test(folded)) return { isQuestion, family: "calculadora" };
  for (const [re, fam] of G) if (re.test(folded)) return { isQuestion, family: fam };
  return { isQuestion, family: null };
}

/** Los chips vecinos del banco (§17.2 VECINDAD, en su forma simple: las
 * canónicas de las familias vivas, empezando por las de Oscar). */
export function bankChips(lang: Lang): string[] {
  return lang === "en"
    ? ["How much do I have in savings?", "How much do I have for treats?", "When did I last get paid?", "Who owes me the most?", "What are the first dues I need to pay?", "How much did I spend last month in stores?"]
    : ["¿Cuánto me queda en ahorros?", "¿Cuánto tengo para gastar en gustos?", "¿Cuándo fue la última vez que me pagaron?", "¿Quién me debe más?", "¿Cuáles son las primeras cuotas del mes?", "¿Cuánto gasté el último mes en tiendas?"];
}

/** Guardia del banco: ninguna familia viva puede declarar una fuente
 * que no exista en el mapa (la cerca banco.test.ts la ejecuta). */
export function bankSourceIds(): Set<string> {
  return new Set(FARO_FUNCTION_MAP.map((f) => f.id));
}
