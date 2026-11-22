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
 *      ahorros → free → gustos → ya-pague → cuenta-origen → recencia →
 *      agenda → ranking → remesas → historia → comparar → futuro →
 *      faro-mismo → (delegado) ask.ts: spend/left/how.
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
 *  · Las familias DECLARADAS del banco (ausencia, identidad) NO se
 *    responden aquí: devolverían unknown, el silencio honesto, hasta
 *    que su motor nazca. La tercera declarada, SEGUIMIENTO, sí nace
 *    (§20, 1.3.380): vive en answerFollowUp, al final de este archivo
 *    — la caja lo intenta contra el marco vivo antes que la cascada.
 */
import { bookMode, readAdvisor, type BookMode } from "./advisor.ts";
import { answerQuestion, askReaches, askReachesFloor, modeWord, pieceFloor, type AskResult } from "./ask.ts";
import { functionOfQuestion, FARO_FUNCTION_MAP } from "./askmap.ts";
import { cardFigures, cardsOf } from "./cards.ts";
import { payoffPlan, monthAhead, peopleOf } from "./debts.ts";
import { duesWindow } from "./dues.ts";
import { inView, isSpendLine, monthLines, summarize } from "./engine.ts";
import { cushionOf, hostAccounts, libreOf } from "./funds.ts";
import { periodRange } from "./historial.ts";
import { foldQ, parseQuestion } from "./lexicon.ts";
import { convertMinor, formatMoney } from "./money.ts";
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
  | "futuro" | "faro-mismo";

export type BankPiece = { label: string; minor: number };
export type BankResult =
  | { kind: "answer"; family: BankFamilyId | "spend" | "free" | "left" | "how" | "reach"; verdict: string; pieces: BankPiece[]; note: string | null; source: string[]; lines: number; draft?: { amountMinor: number; currency: Currency; concept: string } | null; frame?: AskFrame }
  | { kind: "ask-back"; family: "cuenta-origen"; verdict: string; options: (BankPiece & { id: string })[]; source: string[] }
  | { kind: "need-amount"; family: BankFamilyId }
  | { kind: "unknown" };

/* ------------------------------------------------------------------ */
/* EL MARCO DEL SEGUIMIENTO (§20, 1.3.380): lo que una respuesta deja  */
/* para que la siguiente pregunta viva de ella. Estado de diálogo:    */
/* la caja lo guarda en su sesión — jamás entra al libro, no viaja,   */
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
    return {
      kind: "answer", family: "ya-pague",
      verdict: L(c.lang, `Sí: «${hit.concept}» está pagado — ${c.money(view(c, hit))}, el ${lineDate(hit)}.`, `Yes: "${hit.concept}" is paid — ${c.money(view(c, hit))}, on ${lineDate(hit)}.`),
      pieces: [{ label: hit.concept, minor: view(c, hit) }],
      note: null, source: ["libros.lineas", "cobros.cuotas"], lines: 1,
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
  } else if (/tienda|store/.test(folded)) {
    pool = lines.filter((l) => l.kind === "purchase" && !!l.storeId);
    what = L(c.lang, "la última tienda", "the last store");
  } else if (/compre|compra|bought|purchase/.test(folded)) {
    pool = lines.filter((l) => l.kind === "purchase");
    what = L(c.lang, "la última compra", "the last purchase");
  } else {
    pool = lines;
    what = L(c.lang, "el último registro", "the last entry");
  }
  const last = pool.sort((a, b) => lineDate(b).localeCompare(lineDate(a)) || b.id.localeCompare(a.id))[0];
  if (!last) return null;
  const store = last.storeId ? c.names.catalog(last.storeId) : "";
  const verdict = store && /tienda|store/.test(folded)
    ? L(c.lang, `Tu última tienda fue ${store}: «${last.concept}», ${c.money(view(c, last))}, el ${lineDate(last)}.`, `Your last store was ${store}: "${last.concept}", ${c.money(view(c, last))}, on ${lineDate(last)}.`)
    : L(c.lang, `Esto fue ${what}: «${last.concept}», ${c.money(view(c, last))}, el ${lineDate(last)}.`, `This was ${what}: "${last.concept}", ${c.money(view(c, last))}, on ${lineDate(last)}.`);
  return {
    kind: "answer", family: "recencia", verdict,
    pieces: [{ label: last.concept, minor: view(c, last) }],
    note: null, source: ["historial.stream"], lines: 1,
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
function periodOf(c: Ctx, folded: string): Period {
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
 * un seguimiento lo estrecha. */
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

function filterOf(c: Ctx, folded: string): ((l: Line) => boolean) | null {
  return filterDescOf(c, folded)?.fn ?? null;
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

function historiaAnswer(c: Ctx, folded: string): BankResult {
  const p = periodOf(c, folded);
  const hit = filterDescOf(c, folded);
  const filter = hit?.fn ?? null;
  const income = /entro|ingres|recibi|earned|came in/.test(folded);
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
    // §20: la respuesta deja su marco — período, dirección y filtro —
    // para que un «¿en qué?» o un «¿y en comida?» vivan de ella.
    frame: { kind: "period1", period: p, income, filter: hit?.desc ?? null, total },
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
  };
}

/* ------------------------------------------------------------------ */
/* COMPARAR — dos patas del mismo motor, lado a lado.                 */
/* ------------------------------------------------------------------ */
function compararAnswer(c: Ctx, folded: string): BankResult | null {
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
      // §20: la comparación deja su marco — los dos meses y sus
      // totales — para que «¿en qué gasté más?» viva de ella.
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
/* FARO MISMO — la respuesta sale del mapa, con su pantalla.          */
/* ------------------------------------------------------------------ */
function faroMismoAnswer(c: Ctx, folded: string): BankResult | null {
  // OLA 25 (Q25-1): EL NOMBRE PROPIO GANA A LA MESA, a nivel de
  // patrón — no de puntaje. «¿Cómo cambio mi nombre?» casaba con
  // cambio.mesa por la palabra «cambio» (puntaje por claves
  // contenidas) y la persona recibía la puerta de la conversión de
  // moneda, con la fórmula de las cifras, por preguntar cómo la
  // nombra Faro: un desvío es peor que el silencio honesto. Cuando la
  // pregunta nombra el nombre propio — mi nombre, cómo me llama
  // Faro — la función es account.name, diga lo que diga el puntaje;
  // las preguntas verdaderas de cambio de moneda no nombran ningún
  // nombre y siguen llegando a su mesa por el puntaje de siempre
  // (espécimen de control en la cerca de la ola 25). Las dos
  // funciones son Esencial: su origen se ve en todo modo, así que la
  // forma de la respuesta no debe nombrar ningún piso (la vara de LA
  // FRONTERA, addendum A23-4 de la Síntesis).
  const propia = /(mi nombre|my name|me llamo|me llama|el nombre con que|faro call me|faro calls me)/.test(folded)
    ? FARO_FUNCTION_MAP.find((x) => x.id === "account.name") ?? null
    : null;
  const f = propia ?? functionOfQuestion(folded);
  if (!f) return null;
  // A23-5 (cura de la ola 23): la fórmula «ahí ves las mismas cifras
  // que yo uso» no se dice de una cara que el modo no muestra. Cuando
  // el mapa declara el piso de la función (minMode, declarado solo
  // donde una ola lo midió) y la persona está debajo, el veredicto
  // nombra el piso y no promete las cifras — como la puerta de
  // cobros.plan ya hacía al caer a su explicación. La nota sigue
  // nombrando el tema: la explicación del Manual es el destino honesto.
  if (f.minMode && !askReachesFloor(c.mode, f.minMode)) {
    return {
      kind: "answer", family: "faro-mismo",
      verdict: L(c.lang, `Eso es «${f.name.es}», en el área de ${f.area} (${f.screen.es}). Vive en ${modeWord(c.lang, f.minMode)}: en ${modeWord(c.lang, c.mode)} no ves esas cifras.`, `That's "${f.name.en}", in the ${f.area} area (${f.screen.en}). It lives in ${modeWord(c.lang, f.minMode)}: in ${modeWord(c.lang, c.mode)} you don't see those figures.`),
      pieces: [], note: L(c.lang, `Su tema en el Manual es «${f.name.es}».`, `Its Manual topic is "${f.name.en}".`),
      source: [f.id], lines: 0,
    };
  }
  return {
    kind: "answer", family: "faro-mismo",
    verdict: L(c.lang, `Eso vive en ${f.screen.es}: es «${f.name.es}», en el área de ${f.area}. Ahí ves las mismas cifras que yo uso para responderte.`, `That lives on ${f.screen.en}: it's "${f.name.en}", in the ${f.area} area. There you see the same figures I use to answer you.`),
    pieces: [], note: L(c.lang, `Su tema en el Manual es «${f.name.es}».`, `Its Manual topic is "${f.name.en}".`),
    source: [f.id], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* EL SEGUIMIENTO (§20, 1.3.380) — los cinco verbos contra el marco.  */
/* La caja guarda el marco que cada respuesta deja y, antes de la     */
/* cascada, intenta resolver la pregunta nueva contra él. Si ningún   */
/* verbo la resuelve, devuelve null y la cascada la sirve como        */
/* pregunta fresca (L-S4: el tema nuevo abre su propio marco y nada   */
/* del viejo se filtra). Toda respuesta de seguimiento NOMBRA su      */
/* marco en la primera línea (L-S2) y calcula con los motores de      */
/* siempre: el marco enruta, jamás calcula (cerca 1 del brief).       */
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
  };

  // 0 · EL ESCENARIO (injerto de la fusión, 1.3.355): «si sacara $X, ¿qué
  // impacto tendría en mis ahorros?» es cuenta-origen con monto, aunque
  // nombre los ahorros — el impacto se calcula por cuenta, y con varias
  // cuentas que cubren, la pregunta de vuelta manda antes de calcular.
  if (/(si sacara|si saco|si retiro|que impacto|what if i (take|took|withdraw)|if i (take|took|withdraw))/.test(folded)) {
    return cuentaOrigenAnswer(c, raw, parseCtx, pin?.accountId);
  }
  // 0b · EL CAMINO (§19.1, 1.3.365): «¿llego al día X?», «¿cómo llego
  // a fin de mes?», «¿cuál es mi día más apretado?» son del saldo
  // proyectado — se juzgan aquí, antes que las familias del banco,
  // porque su frase roza a varias (futuro, agenda) y su verdad es una
  // sola: la caminata de projection.ts, la misma de la lectura del
  // Asesor. Responde el delegado de ask.ts, con su piso declarado.
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
  // 1 · AHORROS antes que todo lo genérico (la cura del desvío) — pero
  // «sin tocar mis ahorros» es free: su trampa manda sobre la palabra.
  const isFreeTrap = /sin (tocar|afectar|mover|usar).{0,24}(ahorro|apartad|guardad)|without touching/.test(folded);
  if (!isFreeTrap && /(ahorr|guardad|apartad|colchon|savings|set aside|cushion)/.test(folded) && /(cuanto|que|como|how much|how)/.test(folded)) {
    return ahorrosAnswer(c, folded);
  }
  // 2 · GUSTOS (capacidad o chequeo con la palabra gustos/antojos).
  if (/(gustos|antojos|treats|wants)/.test(folded)) return gustosAnswer(c, folded, raw, parseCtx);
  // 3 · YA PAGUÉ (la premisa se juzga primero).
  if (/(ya pague|ya page|did i (already )?pay|have i paid)/.test(folded)) return yaPagueAnswer(c, folded);
  // 4 · CUENTA-ORIGEN (¿de qué cuenta…? con monto).
  if (/(de que cuenta|de donde saco|which account|where should i take)/.test(folded)) return cuentaOrigenAnswer(c, raw, parseCtx, pin?.accountId);
  // 5 · HISTORIA con período manda sobre recencia: «¿cuánto gasté el
  // ÚLTIMO mes…?» trae «último» pero pregunta una suma, no una línea.
  if (/(cuanto (gaste|entro|ingrese|llevo)|how much did i (spend|earn)|cuanto he gastado)/.test(folded)) return historiaAnswer(c, folded);
  // 6 · RECENCIA (lo último…).
  if (/(ultim|last time|last thing|cuando fue)/.test(folded)) {
    const r = recenciaAnswer(c, folded);
    if (r) return r;
  }
  // 6 · AGENDA (lo que viene / fechas de pago).
  if (/(primeras cuotas|fechas en las que pago|que vence|cuando pago mis|what.*due|when do i pay)/.test(folded)) return agendaAnswer(c);
  // 7 · RANKING (quién/cuál más).
  if (/(quien|who).*(mas|most)|en cual (cuenta|tarjeta).*(mas|debo)|which.*most/.test(folded)) {
    const r = rankingAnswer(c, folded);
    if (r) return r;
  }
  // 8 · REMESAS como patrón (cuándo y a quién / cuánto envío en remesas).
  if (/(remesa|remittance)/.test(folded) && /(cuando|quien|cuanto|ritmo|when|who|how much)/.test(folded)) return remesasAnswer(c);
  // 9 · COMPARAR períodos (antes que historia: trae dos patas).
  if (/(mas|more).*(este mes|mes pasado|last month)|este mes o el pasado/.test(folded)) {
    const r = compararAnswer(c, folded);
    if (r) return r;
  }
  // 11 · FUTURO (terminar de pagar).
  const fut = futuroAnswer(c, folded);
  if (fut) return fut;
  // 12 · FARO MISMO (dónde veo / cómo hago).
  // OLA 25 (Q25-1): la puerta aprende los verbos de las dos funciones
  // que el mapa aprende en la misma cura — «¿cómo comparto…?»,
  // «¿cómo me llama Faro?» y «¿dónde cambio el nombre…?» no casaban
  // con ninguna forma de la puerta y caían en silencio antes de
  // llegar al mapa.
  if (/(donde (veo|esta|encuentro|cambio)|como (hago|importo|cambio|veo|comparto)|como me (llama|llamo)|where (do|can) i|how do i)/.test(folded)) {
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
