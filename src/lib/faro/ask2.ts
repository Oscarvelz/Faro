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
 *  · Las familias DECLARADAS del banco (ausencia, identidad) NO se
 *    responden aquí: devolverían unknown, el silencio honesto, hasta
 *    que su motor nazca. (Seguimiento salió de esta lista en la Ola
 *    27: su motor nació con §20 en la 1.3.380 — answerFollowUp — y el
 *    banco la declara viva desde la misma cura; la frase vieja la
 *    seguía contando entre las no nacidas.)
 */
import { bookMode, readAdvisor, type BookMode } from "./advisor.ts";
import { makeNamer } from "./defaults.ts";
import { guideOf } from "./coach.ts";
import { aliasIn, describeLearned, frequentAliases, type LearnedAlias } from "./asklearn.ts";
import { answerQuestion, askReaches, askReachesFloor, modeWord, pieceFloor, type AskResult } from "./ask.ts";
import { functionOfQuestion, FARO_FUNCTION_MAP } from "./askmap.ts";
import { cardFigures, cardsOf } from "./cards.ts";
import { payoffPlan, monthAhead, peopleOf, lentOf, simulatePlan, planDebts, netBalance, totalDebt, lineDebtLines, type PlanRun } from "./debts.ts";
import { loansOf, loanState } from "./loans.ts";
import { duesWindow } from "./dues.ts";
import { intervalOf, stepDate } from "./cadence.ts";
import { inView, isSpendLine, monthLines, summarize } from "./engine.ts";
import { cushionOf, hostAccounts, libreOf } from "./funds.ts";
import { periodRange } from "./historial.ts";
import { foldQ, parseQuestion } from "./lexicon.ts";
import { convertMinor, formatGuest, formatMoney, formatRate, fromGuestMinor, guestDef, toGuestMinor } from "./money.ts";
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
  | "agenda" | "ranking" | "remesas" | "remesas-periodo" | "historia" | "comparar"
  | "futuro" | "faro-mismo" | "conteo" | "extremos" | "capacidades" | "limites"
  | "hipotetico" | "calculadora" | "acciones" | "conversor" | "calendario"
  | "contrafactual" | "respaldo" | "meta"
  | "deudas" | "confirmacion" | "sintesis"
  | "promedio" | "relator" | "frecuencia" | "precio-tiempo" | "regla"
  | "simulador" | "estacionalidad" | "reparto" | "aprendizaje"
  | "porque" | "falta" | "series" | "factibilidad" | "ingreso" | "deriva" | "ausencia" | "identidad" | "total" | "figurada" | "proyeccion" | "seguro" | "cargo" | "tasa";

export type BankPiece = { label: string; minor: number };
/* OLA 27 · EL GRAFO QUE EXPLICA (investigación II, mecanismos #1 y
 * #11; integrado del banco en esta línea): las respuestas compuestas
 * declaran su trabajo como un grafo de nodos tipados — cada cifra
 * lleva (moneda, tiempo, stock o flujo) y el tipo se propaga: ningún
 * nodo puede decirse «medido» si come de un proyectado, y un stock y
 * un flujo no se suman sin que el nodo declare el cruce en su
 * supuesto. `sign` es el signo con que el nodo entra en su padre (+1
 * suma, −1 resta). `assumption.origin` dice de dónde salió el
 * supuesto: del usuario (lo trajo en su pregunta), del libro (una
 * cifra anotada) o de una regla (la definición misma del cálculo).
 * El ¿por qué? de la Ola 21 se vuelve recursivo sobre este grafo, y
 * la ablación («¿y sin ese supuesto?») lo recalcula sin el nodo del
 * supuesto. En el canon el grafo viaja en el ConvoFrame (el marco
 * conversacional), no en el marco §20. */
export type AskTense = "medido" | "stock" | "proyectado";
export type AskNode = {
  id: string;
  label: string;
  minor: number;
  tense: AskTense;
  flow: "stock" | "flujo";
  currency: Currency;
  sign?: 1 | -1;
  unit?: string;
  assumption?: { text: string; origin: "usuario" | "libro" | "regla" };
  children?: AskNode[];
};
/** UNA ACCIÓN SUGERIDA (ola 5): la puerta que la respuesta propone
 * debajo de sí misma. `target` es un id de askmap — la misma casa que
 * alimenta a faro-mismo y sus puertas del Manual — así que la caja
 * navega por el mapa, nunca por una ruta escrita a mano. La respuesta
 * PROPONE; el toque del usuario dispone (R2: nada se guarda solo). */
export type BankAction = { id: string; label: string; target: string };
/** LA FIGURA DECLARADA (censo de figuras, aprobado por Oscar el
 * 2026-11-23 con su condición de exactitud; puerto de la Rama
 * Agente, 1.3.449): el banco NO dibuja — declara la figura con los
 * números REALES del libro, y canon la dibuja con los tokens del
 * tema. Las piezas de una figura de barras SUMAN el total que el
 * veredicto nombra (A23-3 entre medios); la brecha se nombra en el
 * veredicto o en la nota; donde la cifra no se puede medir con
 * exactitud, la respuesta NO trae figura. */
export type BankFigurePoint = { label: string; minor: number; mark?: "conflicto" | "piso" | "mediana" | "minimo" | "premisa" | "cierre" };
export type BankFigure = {
  kind: "escala" | "barras" | "camino" | "lado" | "meses" | "arbol";
  points: BankFigurePoint[];
  band?: { floor: number; median?: number; total: number };
  note: string | null;
};
export type BankResult =
  | { kind: "answer"; family: BankFamilyId | "spend" | "free" | "left" | "how" | "reach"; verdict: string; pieces: BankPiece[]; note: string | null; source: string[]; lines: number; draft?: { amountMinor: number; currency: Currency; concept: string } | null; actions?: BankAction[]; proposal?: { word: string; question: string } | null; forgetWord?: string | null; frame?: AskFrame; convo?: ConvoFrame | null; graph?: AskNode[]; figure?: BankFigure }
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

/** OLA 34 (Familia 1, Q34-1): LA EXCLUSIÓN TAMBIÉN ES DEL MARCO —
 * el ciudadano que la respuesta fresca dejó fuera, como dato (su
 * nombre plegado y su rótulo), para que el seguimiento lo respete:
 * el predicado se reconstruye con citizenByName, como el filtro se
 * reconstruye de su descriptor. Sin esta ranura, §20 no podía ni
 * guardar la exclusión que la respuesta acababa de aplicar. */
export type AskFrameExclusion = { folded: string; display: string };

export type AskFrame =
  | { kind: "compare2"; monthA: string; monthB: string; labelA: string; labelB: string; totalA: number; totalB: number; filter: AskFrameFilter | null }
  | { kind: "period1"; period: Period; income: boolean; filter: AskFrameFilter | null; total: number; exclusion?: AskFrameExclusion | null };

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

/* LA FECHA EN PALABRAS (traída con la integración de la Ola 25;
 * la forma es de la Ola 26 · U6): la fecha que se le muestra al
 * usuario se dice en palabras («28 de octubre de 2026» / «October 28,
 * 2026»), no en formato de registro («2026-10-28»). El ISO queda
 * para las claves y las comparaciones; la cara es esta. La Ola 26
 * la extenderá a todos los veredictos que muestran una fecha. */
const MONTH_WORDS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTH_WORDS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function fmtFecha(c: Ctx, iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return iso;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return iso;
  return c.lang === "en" ? `${MONTH_WORDS_EN[mo - 1]} ${d}, ${y}` : `${d} de ${MONTH_WORDS_ES[mo - 1]} de ${y}`;
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
function ahorrosAnswer(c: Ctx, folded: string, raw: string): BankResult {
  // OLA 12 — EL AHORRO DEL MUNDO NO ES SOLO «¿cuánto tengo?»: la
  // batería mostró las formas ordinarias (el fondo, el ritmo, el
  // porcentaje, la cuenta nombrada) cayendo todas en el stock a secas
  // — la cifra vecina de la caza diaria, otra vez. Cada forma se juzga
  // contra SU motor antes de la respuesta del stock.
  const stock0 = savingsStock(c.state, c.key);
  /* OLA 61 · LOS BLANCOS DEL AHORRO: las clases y bolsillos que el
   * libro distingue — emergencia (su bolsillo), retiro, meta (su
   * bolsillo), las cuentas, lo apartado — y cada bolsillo o cuenta
   * por su nombre. La pregunta que nombra uno recibe SU cifra de
   * titular, no el total con la clase escondida en una pieza. */
  const bySub61 = new Map<string, number>();
  for (const row of stock0.series.values()) bySub61.set(row.subId, (bySub61.get(row.subId) ?? 0) + row.minor);
  const subsEnding61 = (suf: string) => [...bySub61.keys()].filter((s) => s.endsWith(suf));
  const metaPocket61 = subsEnding61(".meta").reduce((a, s) => a + (bySub61.get(s) ?? 0), 0);
  type SavTarget61 = { label: string; minor: number; subs: string[] | null };
  const classTarget61 = (): SavTarget61 | null => {
    if (/(retiro|retirement)/.test(folded)) return { label: L(c.lang, "tu retiro", "your retirement"), minor: stock0.retirement, subs: subsEnding61(".retiro") };
    if (/(emergencia|emergencias|emergency|emergencies)/.test(folded)) return { label: L(c.lang, "tu fondo de emergencia", "your emergency fund"), minor: stock0.emergency, subs: subsEnding61(".emergencia") };
    if (/(\bmeta\b|goal)/.test(folded)) return { label: L(c.lang, "tu meta", "your goal"), minor: metaPocket61, subs: subsEnding61(".meta") };
    if (/(todas mis cuentas|en cuentas|in accounts|all my accounts|mis cuentas)/.test(folded)) return { label: L(c.lang, "tus cuentas", "your accounts"), minor: stock0.byClass.cuenta ?? 0, subs: null };
    if (/(apartad|set aside)/.test(folded)) return { label: L(c.lang, "lo apartado", "what's set aside"), minor: stock0.kept + stock0.pledged, subs: null };
    return null;
  };
  /* OLA 63 · SACAR Y METER CON NOMBRE: el movimiento nombrado se
   * camina contra la cifra DEL BLANCO (la clase, el bolsillo o la
   * cuenta que la pregunta nombra) — la rama vieja caminaba todo
   * contra el total, y «sacar de mi fondo de emergencia» ni eso:
   * la tragaba la rama del fondo y respondía la cobertura. Sin
   * blanco nombrado, esta rama no corre: el total sigue en la
   * rama de siempre (ola 41). */
  {
    const moveOut = /(sacar|retirar|saco|retiro de|quitar|take out|withdraw)/.test(folded) || /\btake\b.{0,24}\bout\b/.test(folded);
    const moveIn = !moveOut && /(apartar|aparto|meter|meto|agregar|anadir|sumar|poner|mover|add|put|set aside|move)/.test(folded);
    const moveAmts = amountsIn(raw, c.display);
    if ((moveOut || moveIn) && moveAmts.length) {
      const amt = convertMinor(moveAmts[0].minor, moveAmts[0].currency, c.display, c.rateE4);
      let tgt: { phrase: string; minor: number } | null = null;
      const ct = classTarget61();
      if (ct) tgt = { phrase: ct.label, minor: ct.minor };
      if (!tgt) {
        let bestN: { name: string; minor: number; len: number } | null = null;
        for (const [subId, minor] of bySub61) {
          const name = c.names.sub(subId);
          if (!name) continue;
          const f = foldQ(name).trim();
          if (f.length < 3) continue;
          const whole = new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
          if (whole.test(folded) && (!bestN || f.length > bestN.len)) bestN = { name, minor, len: f.length };
        }
        if (bestN) tgt = { phrase: (bestN as { name: string }).name, minor: (bestN as { minor: number }).minor };
      }
      if (tgt && amt > 0) {
        const t = tgt as { phrase: string; minor: number };
        if (moveOut) {
          if (amt > t.minor) {
            return {
              kind: "answer", family: "ahorros",
              verdict: L(c.lang, `No, de ${t.phrase}: ahí hay ${c.money(t.minor)} — sacar ${c.money(amt)} es más de lo que ese bolsillo tiene. En ahorros en total tienes ${c.money(stock0.total)}, pero salir de otro lado ya es otra pregunta.`, `No, from ${t.phrase}: there's ${c.money(t.minor)} there — taking out ${c.money(amt)} is more than that pocket holds. In savings in total you have ${c.money(stock0.total)}, but coming out of somewhere else is a different question.`),
              pieces: [{ label: t.phrase, minor: t.minor }, { label: L(c.lang, "Ahorros en total", "Savings in total"), minor: stock0.total }],
              note: null, source: ["ahorros.stock"], lines: 0,
            };
          }
          return {
            kind: "answer", family: "ahorros",
            verdict: L(c.lang, `Sí: sacar ${c.money(amt)} de ${t.phrase} lo deja en ${c.money(t.minor - amt)} (hoy tiene ${c.money(t.minor)}). Tu guardado total pasaría de ${c.money(stock0.total)} a ${c.money(stock0.total - amt)}. Nada se movió en tu libro: es la cuenta de tu pregunta.`, `Yes: taking ${c.money(amt)} out of ${t.phrase} leaves it at ${c.money(t.minor - amt)} (today it holds ${c.money(t.minor)}). Your total saved would go from ${c.money(stock0.total)} to ${c.money(stock0.total - amt)}. Nothing moved in your book: it's the math of your question.`),
            pieces: [{ label: t.phrase, minor: t.minor }, { label: L(c.lang, "El retiro", "The withdrawal"), minor: -amt }, { label: L(c.lang, "Quedaría", "Would remain"), minor: t.minor - amt }],
            note: null, source: ["ahorros.stock"], lines: 0,
            actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
          };
        }
        return {
          kind: "answer", family: "ahorros",
          verdict: L(c.lang, `Con ${c.money(amt)} más, ${t.phrase} pasaría de ${c.money(t.minor)} a ${c.money(t.minor + amt)}. Nada se anotó en tu libro: es la cuenta de tu pregunta.`, `With ${c.money(amt)} more, ${t.phrase} would go from ${c.money(t.minor)} to ${c.money(t.minor + amt)}. Nothing was recorded in your book: it's the math of your question.`),
          pieces: [{ label: t.phrase, minor: t.minor }, { label: L(c.lang, "Lo que se suma", "What's added"), minor: amt }, { label: L(c.lang, "Pasaría a", "Would become"), minor: t.minor + amt }],
          note: null, source: ["ahorros.stock"], lines: 0,
          actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
        };
      }
    }
  }
  /* OLA 62 · LAS COMPARACIONES Y EL MÁS GRANDE: «¿tengo más en
   * emergencia o en retiro?» y «¿cuál de mis ahorros es el más
   * grande?» no existían — el motor no comparaba sus propias
   * clases. Los blancos se resuelven como en el resto de la
   * familia: las clases por su palabra y cada bolsillo o cuenta
   * por su nombre, en el orden en que la pregunta los nombra. */
  {
    type CmpT = { label: string; minor: number; at: number };
    const cmpFound: CmpT[] = [];
    const pushCmp = (re: RegExp, label: string, minor: number) => {
      const m = folded.match(re);
      if (m && m.index !== undefined && !cmpFound.some((t) => t.label === label)) cmpFound.push({ label, minor, at: m.index });
    };
    pushCmp(/retiro|retirement/, L(c.lang, "tu retiro", "your retirement"), stock0.retirement);
    pushCmp(/emergencia|emergencias|emergency|emergencies/, L(c.lang, "tu fondo de emergencia", "your emergency fund"), stock0.emergency);
    pushCmp(/\bmeta\b|goal/, L(c.lang, "tu meta", "your goal"), metaPocket61);
    pushCmp(/cuentas|accounts/, L(c.lang, "tus cuentas", "your accounts"), stock0.byClass.cuenta ?? 0);
    pushCmp(/apartado|apartada|set aside/, L(c.lang, "lo apartado", "what's set aside"), stock0.kept + stock0.pledged);
    for (const [subId, minor] of bySub61) {
      if (/\.(meta|retiro|emergencia)$/.test(subId)) continue;
      const name = c.names.sub(subId);
      if (!name) continue;
      const f = foldQ(name).trim();
      if (f.length < 3) continue;
      const whole = new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
      const m = folded.match(whole);
      if (m && m.index !== undefined && !cmpFound.some((t) => t.label === name)) cmpFound.push({ label: name, minor, at: m.index });
    }
    cmpFound.sort((a, b) => a.at - b.at);
    const cmpVoice = /(mas en|mas de|more in|more than|mayor)/.test(folded) && /\bo\b|\bor\b/.test(folded);
    if (cmpVoice && cmpFound.length >= 2) {
      const [a, b] = [cmpFound[0], cmpFound[1]];
      const diff = Math.abs(a.minor - b.minor);
      return {
        kind: "answer", family: "ahorros",
        verdict: a.minor === b.minor
          ? L(c.lang, `Están parejos: ${c.money(a.minor)} en ${a.label} y ${c.money(b.minor)} en ${b.label}.`, `They're tied: ${c.money(a.minor)} in ${a.label} and ${c.money(b.minor)} in ${b.label}.`)
          : L(c.lang, `Tienes más en ${a.minor > b.minor ? a.label : b.label}: ${c.money(Math.max(a.minor, b.minor))} contra ${c.money(Math.min(a.minor, b.minor))} de ${a.minor > b.minor ? b.label : a.label} — la diferencia es ${c.money(diff)}.`, `You have more in ${a.minor > b.minor ? a.label : b.label}: ${c.money(Math.max(a.minor, b.minor))} against ${c.money(Math.min(a.minor, b.minor))} in ${a.minor > b.minor ? b.label : a.label} — the difference is ${c.money(diff)}.`),
        pieces: [{ label: a.label, minor: a.minor }, { label: b.label, minor: b.minor }],
        note: null, source: ["ahorros.stock"], lines: 0,
        actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
      };
    }
    const bigVoice = /(cual|que|which).{0,44}(mas grande|mayor|mas dinero|most|biggest|largest)/.test(folded)
      || (/(en que cuenta|which account)/.test(folded) && /(mas|most|mayor)/.test(folded));
    if (bigVoice) {
      const onlyAccounts = /(cuenta|account)/.test(folded);
      const clsBySub = new Map<string, string>();
      for (const row of stock0.series.values()) clsBySub.set(row.subId, row.cls);
      const rows = [...bySub61.entries()]
        .filter(([subId, minor]) => minor > 0 && (!onlyAccounts || clsBySub.get(subId) === "cuenta"))
        .map(([subId, minor]) => ({ name: c.names.sub(subId) || subId, minor, cls: clsBySub.get(subId) ?? "" }))
        .sort((x, y) => y.minor - x.minor);
      if (!rows.length) {
        return {
          kind: "answer", family: "ahorros",
          verdict: L(c.lang, "Todavía no hay nada guardado en ningún bolsillo ni cuenta de tu libro: el guardado está en cero, así que no hay un «más grande» que nombrar.", "There's still nothing saved in any pocket or account in your book: savings stand at zero, so there's no \"biggest\" to name."),
          pieces: [], note: null, source: ["ahorros.stock"], lines: 0,
        };
      }
      const [w, r2] = rows;
      const kindWord = onlyAccounts || w.cls === "cuenta" ? L(c.lang, "cuenta", "account") : L(c.lang, "bolsillo", "pocket");
      return {
        kind: "answer", family: "ahorros",
        verdict: L(c.lang, `Donde más tienes guardado es en ${w.name}: ${c.money(w.minor)} (es tu ${kindWord} más grande).${r2 ? ` Le sigue ${r2.name} con ${c.money(r2.minor)}.` : ""} En ahorros en total tienes ${c.money(stock0.total)}.`, `Where you have the most saved is ${w.name}: ${c.money(w.minor)} (your biggest ${kindWord}).${r2 ? ` Next is ${r2.name} with ${c.money(r2.minor)}.` : ""} In savings in total you have ${c.money(stock0.total)}.`),
        pieces: rows.slice(0, 3).map((r) => ({ label: r.name, minor: r.minor })),
        note: null, source: ["ahorros.stock"], lines: 0,
        actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
      };
    }
  }
  if (/(fondo de emergencia|emergency fund)/.test(folded)) {
    const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const target = reading.cushionMinor;
    const have = reading.cushionStock;
    const gap = Math.max(0, target - have);
    const months = c.state.settings.emergencyMonths || 3;
    // OLA 61: si el libro trae el BOLSILLO de emergencia, su cifra
    // abre la respuesta — es el dinero que el usuario apartó con
    // ese nombre — y la lectura de colchón va enseguida: son dos
    // cifras distintas y la respuesta no esconde ninguna.
    const pocketLead = stock0.emergency > 0
      ? L(c.lang, `En el bolsillo de emergencia tienes ${c.money(stock0.emergency)}. Y medido como colchón — tu red para lo esencial — `, `In the emergency pocket you have ${c.money(stock0.emergency)}. And measured as a cushion — your net for essentials — `)
      : "";
    return {
      kind: "answer", family: "ahorros",
      verdict: pocketLead
        ? pocketLead + (gap > 0
          ? L(c.lang, `tu fondo debería cubrir ${months} meses de lo esencial: ${c.money(target)}. Hoy tu colchón suma ${c.money(have)} — te faltan ${c.money(gap)}.`, `your fund should cover ${months} months of essentials: ${c.money(target)}. Today your cushion adds up to ${c.money(have)} — you're ${c.money(gap)} short.`)
          : L(c.lang, `tu fondo está cubierto: debería ser ${c.money(target)} (${months} meses de lo esencial) y tu colchón suma ${c.money(have)}.`, `your fund is covered: it should be ${c.money(target)} (${months} months of essentials) and your cushion adds up to ${c.money(have)}.`))
        : (gap > 0
          ? L(c.lang, `Tu fondo de emergencia debería cubrir ${months} meses de lo esencial: ${c.money(target)}. Hoy tu colchón suma ${c.money(have)} — te faltan ${c.money(gap)}.`, `Your emergency fund should cover ${months} months of essentials: ${c.money(target)}. Today your cushion adds up to ${c.money(have)} — you're ${c.money(gap)} short.`)
          : L(c.lang, `Tu fondo de emergencia está cubierto: debería ser ${c.money(target)} (${months} meses de lo esencial) y tu colchón suma ${c.money(have)}.`, `Your emergency fund is covered: it should be ${c.money(target)} (${months} months of essentials) and your cushion adds up to ${c.money(have)}.`)),
      pieces: [
        ...(stock0.emergency > 0 ? [{ label: L(c.lang, "El bolsillo de emergencia", "The emergency pocket"), minor: stock0.emergency }] : []),
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
  /* OLA 61 · EL BOLSILLO POR SU NOMBRE: la rama de la cuenta
   * nombrada solo miraba cuentas y saldos; un bolsillo con nombre
   * propio («¿cuánto tengo guardado para el viaje?») caía al total.
   * Todo bolsillo con nombre en el libro responde por su nombre —
   * las clases de fábrica (meta, retiro, emergencia) las contesta
   * el blanco de clase, que va con el respaldo. */
  {
    const pocketVoice = /(cuanto|guardad|hay|queda|tengo|how much|saved|have)/.test(folded);
    if (pocketVoice) {
      let bestP: { name: string; minor: number; len: number } | null = null;
      for (const [subId, minor] of bySub61) {
        if (/\.(meta|retiro|emergencia)$/.test(subId)) continue;
        const name = c.names.sub(subId);
        if (!name) continue;
        const f = foldQ(name).trim();
        if (f.length < 3) continue;
        const whole = new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
        if (whole.test(folded) && (!bestP || f.length > bestP.len)) bestP = { name, minor, len: f.length };
      }
      if (bestP) {
        const b = bestP as { name: string; minor: number };
        return {
          kind: "answer", family: "ahorros",
          verdict: L(c.lang, `Para ${b.name} tienes ${c.money(b.minor)} guardados.`, `For ${b.name} you have ${c.money(b.minor)} saved.`),
          pieces: [{ label: b.name, minor: b.minor }, { label: L(c.lang, "Ahorros en total", "Savings in total"), minor: stock0.total }],
          note: null, source: ["ahorros.stock"], lines: 0,
          actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
        };
      }
    }
  }
  const savInMonth = (key: string) => (c.state.months[key]?.lines ?? []).filter((l) => l.active && roleOf(c.state, l.categoryId) === "savings").reduce((a, l) => a + view(c, l), 0);
  const monthKeys = Object.keys(c.state.months).filter((k) => k <= c.key).sort();
  const savAvg = monthKeys.length ? Math.round(monthKeys.reduce((a, k) => a + savInMonth(k), 0) / monthKeys.length) : 0;
  // OLA 60 · EL JUICIO DE LAS DOS COSAS: «¿estaría incrementando
  // mis ahorros o tengo demasiados gastos?» (captura de Oscar,
  // 2026-11-24) — la pregunta trae dos hechos y se responden los
  // dos, medidos: lo apartado del mes (eso es lo que hace crecer
  // el guardado) y el gasto del mes contra lo que entró. Sin
  // sermón: las cifras y su lectura llana.
  if (/(incrementando|creciendo|aumentando|growing|increasing|demasiados gastos|gasto demasiado|mucho gasto|too much (spending|expenses)|overspending)/.test(folded) && /(ahorr|savings|gasto|spend)/.test(folded)) {
    const sum = summarize(c.state, c.key, c.lang);
    const saved = savInMonth(c.key);
    const { list } = verbAmounts(raw, c.display);
    const premise = list.find((s) => s.sign === 0);
    const premiseMinor = premise ? convertMinor(premise.a.minor, premise.a.currency, c.display, c.rateE4) : 0;
    const pct = sum.income > 0 ? Math.round((sum.spend / sum.income) * 1000) / 10 : null;
    return {
      kind: "answer", family: "ahorros",
      verdict: L(c.lang,
        `Las dos cosas se miden por separado. Tu guardado crece con lo que apartas: este mes constan ${c.money(saved)} apartados${premiseMinor > 0 ? `, y los ${c.money(premiseMinor)} de tu «si» lo subirían en eso mismo — apartar sí incrementa` : ""}. Y el gasto: este mes salieron ${c.money(sum.spend)}${sum.income > 0 ? ` de los ${c.money(sum.income)} que entraron — el ${pct}% de lo que entró${sum.spend > sum.income ? "; en números, salió más de lo que entró" : ""}` : ", sin ingreso anotado este mes contra el que medirlo"}.`,
        `The two things are measured separately. Your savings grow with what you set aside: this month shows ${c.money(saved)} set aside${premiseMinor > 0 ? `, and the ${c.money(premiseMinor)} in your "if" would raise it by that much — setting aside does increase it` : ""}. And spending: this month ${c.money(sum.spend)} went out${sum.income > 0 ? ` of the ${c.money(sum.income)} that came in — ${pct}% of what came in${sum.spend > sum.income ? "; in numbers, more went out than came in" : ""}` : ", with no income recorded this month to measure it against"}.`),
      pieces: [
        { label: L(c.lang, "Apartado este mes", "Set aside this month"), minor: saved },
        { label: L(c.lang, "Entró este mes", "Came in this month"), minor: sum.income },
        { label: L(c.lang, "Salió este mes", "Went out this month"), minor: sum.spend },
      ],
      note: null, source: ["ahorros.stock", "historial.stream"], lines: 0,
      actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
    };
  }
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
  /* OLA 61 · EL FLUJO POR CLASE: «¿cuánto aparté para emergencias
   * este mes?» — el ritmo genérico sumaba TODOS los bolsillos; el
   * flujo de una clase se mide sobre sus propios subs, en el mes o
   * en el año que la pregunta nombra. */
  {
    const tgt = classTarget61();
    if (tgt && tgt.subs && /(aparte|aparto|guarde|guardado|meti|puse|ingrese|set aside|saved|deposited|put)/.test(folded)) {
      const inSubs = (key: string) => (c.state.months[key]?.lines ?? []).filter((l) => l.active && roleOf(c.state, l.categoryId) === "savings" && tgt.subs!.includes(l.subId)).reduce((a, l) => a + view(c, l), 0);
      if (/(este mes|this month)/.test(folded)) {
        const m = inSubs(c.key);
        return {
          kind: "answer", family: "ahorros",
          verdict: L(c.lang, `Este mes apartaste ${c.money(m)} para ${tgt.label}. En total, ${tgt.label} suma ${c.money(tgt.minor)}.`, `This month you set aside ${c.money(m)} for ${tgt.label}. In total, ${tgt.label} adds up to ${c.money(tgt.minor)}.`),
          pieces: [{ label: L(c.lang, "Este mes", "This month"), minor: m }, { label: tgt.label, minor: tgt.minor }],
          note: null, source: ["ahorros.mes", "ahorros.stock"], lines: 0,
        };
      }
      if (/(este ano|this year)/.test(folded)) {
        const yr = c.key.slice(0, 4);
        const y = monthKeys.filter((k) => k.startsWith(yr)).reduce((a, k) => a + inSubs(k), 0);
        return {
          kind: "answer", family: "ahorros",
          verdict: L(c.lang, `Este año apartaste ${c.money(y)} para ${tgt.label}. En total, ${tgt.label} suma ${c.money(tgt.minor)}.`, `This year you set aside ${c.money(y)} for ${tgt.label}. In total, ${tgt.label} adds up to ${c.money(tgt.minor)}.`),
          pieces: [{ label: L(c.lang, "Este año", "This year"), minor: y }, { label: tgt.label, minor: tgt.minor }],
          note: null, source: ["ahorros.mes", "ahorros.stock"], lines: 0,
        };
      }
    }
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
  /* OLA 41 · EL AHORRO CON SU VARA (la caza del centro, clase 4):
   * las preguntas del ahorro que se juzgan — debería, bien, falta,
   * sacar, o-deudas — caían en el stock a secas o en silencio. La
   * vara nunca es una regla de afuera: es la meta que el usuario
   * fijó en Ajustes (sus meses de colchón) contra sus meses
   * medidos. */
  {
    const reading41 = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const monthsGoal = c.state.settings.emergencyMonths || 3;
    const targetCushion = reading41.cushionMinor;
    const haveCushion = reading41.cushionStock;
    const essentialMonth = monthsGoal > 0 ? Math.round(targetCushion / monthsGoal) : 0;
    const monthOut = (k: string) => (c.state.months[k]?.lines ?? []).filter((l) => l.active && isOut(l) && roleOf(c.state, l.categoryId) !== "savings").reduce((a, l) => a + view(c, l), 0);
    const monthIn = (k: string) => (c.state.months[k]?.lines ?? []).filter((l) => l.active && /^income/.test(l.kind)).reduce((a, l) => a + view(c, l), 0);
    const medianOf = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
    const typicalOut = medianOf(monthKeys.map(monthOut));
    const typicalIn = medianOf(monthKeys.map(monthIn));
    const typicalNet = medianOf(monthKeys.map((k) => monthIn(k) - monthOut(k) - savInMonth(k)));
    const covered = essentialMonth > 0 ? haveCushion / essentialMonth : 0;
    const fmtM = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "");
    const doorCushion = reportDoor(c, "ahorros.colchon", "Verlo en Ahorros · Colchón", "See it in Savings · Cushion");

    /* SACAR DE LOS AHORROS: la premisa se camina contra el stock y
     * contra el colchón — no contra el mes. */
    const amounts41 = amountsIn(raw, c.display);
    if (/(sacar|retirar|saco|retiro|take out|withdraw)/.test(folded) && amounts41.length >= 1 && /(ahorr|savings)/.test(folded)) {
      const amt = convertMinor(amounts41[0].minor, amounts41[0].currency, c.display, c.rateE4);
      const total = stock0.total;
      if (amt > total) {
        return { kind: "answer", family: "ahorros", verdict: L(c.lang, `No, con lo anotado: tienes ${c.money(total)} guardados en total — sacar ${c.money(amt)} es más de lo que hay. La cifra no sale de otro lado: lo guardado es lo guardado.`, `No, on what's recorded: you have ${c.money(total)} saved in total — taking out ${c.money(amt)} is more than there is. The figure doesn't come from anywhere else: what's saved is what's saved.`), pieces: [{ label: L(c.lang, "Guardado en total", "Saved in total"), minor: total }], note: null, source: ["ahorros.stock"], lines: 0 };
      }
      const after = total - amt;
      const coverAfter = essentialMonth > 0 ? Math.max(0, haveCushion - amt) / essentialMonth : 0;
      return {
        kind: "answer", family: "ahorros",
        verdict: L(c.lang, `Sí: sacar ${c.money(amt)} te deja ${c.money(after)} guardados. Si sale de tu colchón, el colchón pasa de ${fmtM(covered)} a ${fmtM(coverAfter)} meses de lo esencial (tu meta: ${monthsGoal}). Nada se movió en tu libro: es la cuenta de tu pregunta.`, `Yes: taking out ${c.money(amt)} leaves you ${c.money(after)} saved. If it comes out of your cushion, the cushion goes from ${fmtM(covered)} to ${fmtM(coverAfter)} months of essentials (your target: ${monthsGoal}). Nothing moved in your book: it's the math of your question.`),
        pieces: [{ label: L(c.lang, "Guardado hoy", "Saved today"), minor: total }, { label: L(c.lang, "El retiro", "The withdrawal"), minor: -amt }, { label: L(c.lang, "Quedaría guardado", "Would stay saved"), minor: after }],
        note: null, source: ["ahorros.stock", "ahorros.colchon"], lines: 0, actions: doorCushion,
      };
    }

    /* ¿CUÁNTO DEBERÍA?: la vara es su meta, no una regla importada. */
    if (/(cuanto deberia|cuanto debo (ahorrar|guardar|apartar)|deberia (estar )?(ahorrando|guardando|apartando)|how much should i (be saving|save|set aside))/.test(folded)) {
      const gap = Math.max(0, targetCushion - haveCushion);
      return {
        kind: "answer", family: "ahorros",
        verdict: gap <= 0
          ? L(c.lang, `Con tu propia vara ya estás: tu meta de Ajustes — ${monthsGoal} meses de colchón, ${c.money(targetCushion)} — está cubierta con ${c.money(haveCushion)}. Apartas en promedio ${c.money(savAvg)} al mes; lo que apartes de más ya es otra meta, no esta.`, `By your own measure you're already there: your Settings target — ${monthsGoal} months of cushion, ${c.money(targetCushion)} — is covered with ${c.money(haveCushion)}. You set aside ${c.money(savAvg)} a month on average; anything beyond that is another goal, not this one.`)
          : L(c.lang, `El «debería» se mide con tu propia vara: la meta que fijaste en Ajustes — ${monthsGoal} meses de colchón = ${c.money(targetCushion)}. Hoy tu colchón suma ${c.money(haveCushion)}: te faltan ${c.money(gap)}. Apartas en promedio ${c.money(savAvg)} al mes${savAvg > 0 ? ` — a ese ritmo, la meta se cierra en ${Math.ceil(gap / savAvg)} meses` : " — sin ritmo de apartado medido, la meta no tiene fecha"}. Y tu mes típico deja ${c.money(typicalNet)} libres después de todo${typicalNet > gap ? "" : typicalNet > 0 ? `: si apartaras todo lo libre, la meta se cerraría en ${Math.ceil(gap / typicalNet)} meses` : ""}. Ninguna regla de afuera: son tus números contra tu meta.`, `The "should" is measured with your own yardstick: the target you set in Settings — ${monthsGoal} months of cushion = ${c.money(targetCushion)}. Today your cushion adds up to ${c.money(haveCushion)}: you're ${c.money(gap)} short. You set aside ${c.money(savAvg)} a month on average${savAvg > 0 ? ` — at that pace, the target closes in ${Math.ceil(gap / savAvg)} months` : " — with no measured set-aside pace, the target has no date"}. And your typical month leaves ${c.money(typicalNet)} free after everything${typicalNet > 0 && typicalNet !== savAvg ? `: setting aside everything free, the target would close in ${Math.ceil(gap / typicalNet)} months` : ""}. No outside rule: it's your numbers against your target.`),
        pieces: [{ label: L(c.lang, "Tu meta de colchón", "Your cushion target"), minor: targetCushion }, { label: L(c.lang, "Tu colchón hoy", "Your cushion today"), minor: haveCushion }, ...(gap > 0 ? [{ label: L(c.lang, "Te falta", "Still to go"), minor: -gap }] : []), { label: L(c.lang, "Apartas al mes", "You set aside a month"), minor: savAvg }],
        note: L(c.lang, "La meta es la de tu Asesor: tus meses de colchón de Ajustes por tu gasto esencial medido — la misma vara del fondo de emergencia, no un porcentaje importado.", "The target is your own Advisor's: your cushion months from Settings times your measured essentials — the same yardstick as the emergency fund, not an imported percentage."),
        source: ["ahorros.colchon", "ahorros.mes", "asesor.lectura"], lines: 0, actions: doorCushion,
      };
    }

    /* ¿ESTOY AHORRANDO BIEN?: el juicio contra su vara, en cifras. */
    if (/(estoy ahorrando bien|ahorro bien|ahorrando bien|voy bien (con )?(mis )?ahorros|am i saving (well|enough|ok)|saving enough)/.test(folded)) {
      const pctSav = typicalIn > 0 ? Math.round((savAvg / typicalIn) * 1000) / 10 : null;
      const rateTxt = pctSav !== null ? L(c.lang, `, el ${pctSav}% de tu ingreso típico`, `, ${pctSav}% of your typical income`) : "";
      return {
        kind: "answer", family: "ahorros",
        verdict: covered >= monthsGoal && monthsGoal > 0
          ? L(c.lang, `Por tu vara, sí: tu colchón cubre ${fmtM(covered)} meses de lo esencial y tu meta son ${monthsGoal} (${c.money(haveCushion)} de ${c.money(targetCushion)}). Apartas en promedio ${c.money(savAvg)} al mes${rateTxt}.`, `By your measure, yes: your cushion covers ${fmtM(covered)} months of essentials and your target is ${monthsGoal} (${c.money(haveCushion)} of ${c.money(targetCushion)}). You set aside ${c.money(savAvg)} a month on average${rateTxt}.`)
          : covered > 0
            ? L(c.lang, `Vas en camino, y el camino se mide: tu colchón cubre ${fmtM(covered)} de tus ${monthsGoal} meses de meta (${c.money(haveCushion)} de ${c.money(targetCushion)}), y apartas en promedio ${c.money(savAvg)} al mes${rateTxt}. Si eso es «bien» lo dice tu vara: la meta es tuya, y vas a ${fmtM(covered)} de ${monthsGoal} de ella.`, `You're on the way, and the way is measured: your cushion covers ${fmtM(covered)} of your ${monthsGoal} target months (${c.money(haveCushion)} of ${c.money(targetCushion)}), and you set aside ${c.money(savAvg)} a month on average${rateTxt}. Whether that's "well" is your yardstick's call: the target is yours, and you're at ${fmtM(covered)} of ${monthsGoal} of it.`)
            : L(c.lang, `Por tu vara, todavía no: tu colchón está en ${c.money(haveCushion)} y tu meta son ${monthsGoal} meses de lo esencial (${c.money(targetCushion)}). El primer peldaño es un mes de lo esencial: ${c.money(essentialMonth)}. Apartas en promedio ${c.money(savAvg)} al mes${rateTxt} — el camino existe; la vara solo dice dónde estás en él.`, `By your measure, not yet: your cushion stands at ${c.money(haveCushion)} and your target is ${monthsGoal} months of essentials (${c.money(targetCushion)}). The first step is one month of essentials: ${c.money(essentialMonth)}. You set aside ${c.money(savAvg)} a month on average${rateTxt} — the path exists; the yardstick only says where you are on it.`),
        pieces: [{ label: L(c.lang, "Tu colchón hoy", "Your cushion today"), minor: haveCushion }, { label: L(c.lang, "Tu meta de colchón", "Your cushion target"), minor: targetCushion }, { label: L(c.lang, "Apartas al mes", "You set aside a month"), minor: savAvg }],
        note: null, source: ["ahorros.colchon", "ahorros.mes", "asesor.lectura"], lines: 0, actions: doorCushion,
      };
    }

    /* ¿CUÁNTO ME FALTA PARA UN MES DE GASTOS?: el peldaño de un mes
     * entero de gasto típico, no solo el fondo con su nombre. */
    if (/(cuanto me falta|cuanto necesito|que me falta|how much (do i need|is left)).{0,50}(un mes de gastos|mes de gastos|one month of expenses|a month of expenses)/.test(folded)
      || (/(para tener|para juntar|para completar|para guardar)/.test(folded) && /(un mes|one month)/.test(folded) && /(gasto|expenses)/.test(folded))) {
      const gap1 = typicalOut - stock0.total;
      const gapGoal = Math.max(0, targetCushion - haveCushion);
      return {
        kind: "answer", family: "ahorros",
        verdict: gap1 > 0
          ? L(c.lang, `Un mes de tus gastos suma ${c.money(typicalOut)} — tu mes típico de gasto, medido de tu libro. Guardado tienes ${c.money(stock0.total)}: te faltan ${c.money(gap1)} para tener ese mes entero guardado. Y para tu meta completa — la de Ajustes, ${monthsGoal} meses de lo esencial (${c.money(targetCushion)}) — el colchón pide ${c.money(gapGoal)} más.`, `One month of your expenses adds up to ${c.money(typicalOut)} — your typical spending month, measured from your book. You have ${c.money(stock0.total)} saved: you're ${c.money(gap1)} short of holding that whole month saved. And for your full target — the Settings one, ${monthsGoal} months of essentials (${c.money(targetCushion)}) — the cushion asks ${c.money(gapGoal)} more.`)
          : L(c.lang, `Ya lo tienes: un mes de tus gastos suma ${c.money(typicalOut)} y guardado tienes ${c.money(stock0.total)} — ese mes entero ya está guardado. Para tu meta completa de Ajustes (${monthsGoal} meses de lo esencial, ${c.money(targetCushion)}) el colchón pide ${c.money(gapGoal)} más.`, `You already have it: one month of your expenses adds up to ${c.money(typicalOut)} and you have ${c.money(stock0.total)} saved — that whole month is already held. For your full Settings target (${monthsGoal} months of essentials, ${c.money(targetCushion)}) the cushion asks ${c.money(gapGoal)} more.`),
        pieces: [{ label: L(c.lang, "Un mes de gastos", "One month of expenses"), minor: typicalOut }, { label: L(c.lang, "Guardado hoy", "Saved today"), minor: stock0.total }, ...(gap1 > 0 ? [{ label: L(c.lang, "Te falta para el mes", "Short of the month"), minor: -gap1 }] : [])],
        note: null, source: ["ahorros.stock", "ahorros.colchon", "asesor.lectura"], lines: 0, actions: doorCushion,
      };
    }

    /* AHORROS O DEUDAS: los dos lados con sus números, sin escoger. */
    if (/((ahorr|guardar|apartar|save|saving).{0,45}(o|or).{0,35}(deuda|pagar|debt|pay))|((deuda|pagar|debt|pay).{0,45}(o|or).{0,35}(ahorr|guardar|apartar|save|saving))/.test(folded)) {
      const debts41 = planDebts(c.state, c.today);
      const interest = debts41.reduce((a, d) => a + d.monthlyInterest, 0);
      return {
        kind: "answer", family: "ahorros",
        verdict: debts41.length
          ? L(c.lang, `Los dos lados, con sus números — la decisión es tuya: tus deudas te cuestan ${c.money(interest)} al mes en intereses, a las tasas anotadas — cada peso que las baja deja de producir ese interés. Tu colchón hoy cubre ${fmtM(covered)} de tus ${monthsGoal} meses de meta (${c.money(haveCushion)} de ${c.money(targetCushion)}) — cada peso que entra ahí acerca ese colchón. Y el dato que suele pesar: con el colchón vacío, un gasto sorpresa se paga con deuda nueva, y la deuda nueva nace a la tasa más cara que tengas.`, `Both sides, with their numbers — the decision is yours: your debts cost you ${c.money(interest)} a month in interest, at the recorded rates — every peso that lowers them stops producing that interest. Your cushion today covers ${fmtM(covered)} of your ${monthsGoal} target months (${c.money(haveCushion)} of ${c.money(targetCushion)}) — every peso that lands there brings that cushion closer. And the fact that usually weighs in: with an empty cushion, a surprise expense is paid with new debt, and new debt is born at the most expensive rate you carry.`)
          : L(c.lang, `Sin deudas anotadas no hay dos lados que pesar: tu colchón hoy cubre ${fmtM(covered)} de tus ${monthsGoal} meses de meta (${c.money(haveCushion)} de ${c.money(targetCushion)}), así que lo que apartes va entero a esa meta — no hay interés corriendo en contra.`, `With no recorded debts there aren't two sides to weigh: your cushion today covers ${fmtM(covered)} of your ${monthsGoal} target months (${c.money(haveCushion)} of ${c.money(targetCushion)}), so what you set aside goes whole to that target — there's no interest running against you.`),
        pieces: [{ label: L(c.lang, "Interés de tus deudas al mes", "Your debts' monthly interest"), minor: interest }, { label: L(c.lang, "Tu colchón hoy", "Your cushion today"), minor: haveCushion }, { label: L(c.lang, "Tu meta de colchón", "Your cushion target"), minor: targetCushion }],
        note: null, source: ["ahorros.colchon", "cobros.tarjetas"], lines: 0, actions: doorCushion,
      };
    }
  }
  /* OLA 61 · LA FALTA PARA LA META: el bolsillo Meta no guarda una
   * cifra de destino en el libro — la respuesta da lo que el
   * bolsillo tiene y dice qué metas sí puede medir (la del colchón),
   * en vez de callar o de inventarle un destino al bolsillo. */
  if (/(cuanto me falta|que me falta|cuanto falta|cuanto necesito para|how much (more )?(do i need|is left))/.test(folded) && /(\bmeta\b|goal)/.test(folded)) {
    const readingM = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const gapCushion = Math.max(0, readingM.cushionMinor - readingM.cushionStock);
    return {
      kind: "answer", family: "ahorros",
      verdict: metaPocket61 > 0
        ? L(c.lang, `En tu bolsillo Meta tienes ${c.money(metaPocket61)} apartados. Tu libro no guarda una cifra de destino para ese bolsillo, así que no hay una «falta» exacta que medir contra él: la meta que sí puedo medir es la de tu colchón — ${c.money(readingM.cushionMinor)}, y vas en ${c.money(readingM.cushionStock)}${gapCushion > 0 ? `, te faltan ${c.money(gapCushion)}` : ", ya cubierta"}. Si tu meta es una cifra, pregúntame «¿cuánto me falta para llegar a esa cifra?» y la falta sale exacta.`, `In your Goal pocket you have ${c.money(metaPocket61)} set aside. Your book doesn't keep a target figure for that pocket, so there's no exact "still to go" to measure against it: the target I can measure is your cushion's — ${c.money(readingM.cushionMinor)}, and you're at ${c.money(readingM.cushionStock)}${gapCushion > 0 ? `, ${c.money(gapCushion)} to go` : ", already covered"}. If your goal is a figure, ask me "how much do I need to reach that figure?" and the shortfall comes out exact.`)
        : L(c.lang, `Tu bolsillo Meta está vacío en tu libro, y el libro no guarda una cifra de destino para él: no hay una «falta» que medir contra el bolsillo. La meta que sí puedo medir es la de tu colchón — ${c.money(readingM.cushionMinor)}, y vas en ${c.money(readingM.cushionStock)}${gapCushion > 0 ? `, te faltan ${c.money(gapCushion)}` : ", ya cubierta"}.`, `Your Goal pocket is empty in your book, and the book keeps no target figure for it: there's no "still to go" to measure against the pocket. The target I can measure is your cushion's — ${c.money(readingM.cushionMinor)}, and you're at ${c.money(readingM.cushionStock)}${gapCushion > 0 ? `, ${c.money(gapCushion)} to go` : ", already covered"}.`),
      pieces: [{ label: L(c.lang, "El bolsillo Meta", "The Goal pocket"), minor: metaPocket61 }, { label: L(c.lang, "Tu colchón hoy", "Your cushion today"), minor: readingM.cushionStock }, { label: L(c.lang, "La meta del colchón", "The cushion target"), minor: readingM.cushionMinor }],
      note: null, source: ["ahorros.stock", "ahorros.colchon"], lines: 0,
      actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
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
  else if (cls(/\bmeta\b|goal/)) { head = metaPocket61; headLabel = L(c.lang, "Meta", "Goal"); }
  else if (cls(/todas mis cuentas|en cuentas|in accounts|all my accounts|mis cuentas/)) { head = stock.byClass.cuenta ?? 0; headLabel = L(c.lang, "En cuentas", "In accounts"); }
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
  // OLA 61: si la pregunta nombra una clase o las cuentas, SU cifra
  // abre el veredicto — antes el titular era siempre el total y la
  // clase quedaba escondida en la primera pieza, así que «¿cuánto
  // tengo en mi retiro?» recibía el total como respuesta.
  const tgt61 = classTarget61();
  const verdict = cls(/mes|month/) && cls(/apart|set aside/)
    ? L(c.lang, `Este mes apartaste ${c.money(sum.savingsFlow)}.`, `This month you set aside ${c.money(sum.savingsFlow)}.`) + flowFloor
    : tgt61
      ? (tgt61.label.startsWith("lo apartado") || tgt61.label.startsWith("what's set aside")
        ? L(c.lang, `Apartado tienes ${c.money(tgt61.minor)}. En ahorros en total tienes ${c.money(stock.total)}.`, `Set aside you have ${c.money(tgt61.minor)}. In savings in total you have ${c.money(stock.total)}.`)
        : L(c.lang, `En ${tgt61.label} tienes ${c.money(tgt61.minor)}. En ahorros en total tienes ${c.money(stock.total)}.`, `In ${tgt61.label} you have ${c.money(tgt61.minor)}. In savings in total you have ${c.money(stock.total)}.`))
      : L(c.lang, `En ahorros tienes ${c.money(stock.total)}.`, `You have ${c.money(stock.total)} in savings.`);
  return {
    kind: "answer", family: "ahorros", verdict,
    pieces: tgt61
      ? [
        { label: headLabel, minor: head },
        { label: L(c.lang, "Ahorros en total", "Savings in total"), minor: stock.total },
      ]
      : [
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
/* OLA 64 · EL SEGURO DE VIDA — ciudadano del libro, NO ahorro: la   */
/* pieza (kind «ins») trae su plan (la prima, el día o la semana del  */
/* cobro, la cuenta de la que sale, el inicio) y sus beneficiarios.  */
/* La ley del propio tipo manda: la prima es un gasto fijo y la      */
/* póliza NUNCA es un activo — no hay saldo, no hay bolsillo, no     */
/* entra en ningún total. Antes, «¿cuánto tengo en mi seguro de      */
/* vida?» recibía el total de ahorros como respuesta: la implicación */
/* falsa más cara del área.                                          */
/* ------------------------------------------------------------------ */
function seguroAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(seguro de vida|life insurance)/.test(folded)) return null;
  // Lo PAGADO en un período se suma sobre las líneas: es de
  // historia, no del plan. Esta familia lee el plan y dice la ley;
  // la suma de un período cede entera.
  if (/(cuanto (he pagado|pague|llevo pagado)|cuanto pague|how much have i paid|how much did i pay)/.test(folded)) return null;
  // El libro nace con la pieza de fábrica SIN configurar; si hay
  // más de una pieza, manda la que trae el plan escrito.
  const insPieces = c.state.structure.catalog.filter((i) => i.kind === "ins");
  const piece = insPieces.find((i) => i.ins) ?? insPieces[0];
  const plan = piece?.ins;
  const premLines = allLines(c)
    .filter((l) => l.active && roleOf(c.state, l.categoryId) === "insurance" && (l.subId.endsWith(".vida") || /(seguro de vida|life insurance)/.test(foldQ(`${l.concept} ${c.names.sub(l.subId)}`))))
    .sort((a, b) => (a.monthKey < b.monthKey ? -1 : a.monthKey > b.monthKey ? 1 : (a.bookedOn ?? "") < (b.bookedOn ?? "") ? -1 : 1));
  const lastPrem = premLines.length ? premLines[premLines.length - 1] : null;
  if (!piece && !lastPrem) {
    return {
      kind: "answer", family: "seguro",
      verdict: L(c.lang, "En tu libro no hay un seguro de vida anotado: ni la pieza con su plan ni líneas de prima en Seguros · Vida. Si tienes una póliza fuera de Faro, anótala y estas respuestas salen de tu libro.", "Your book has no life insurance recorded: neither the piece with its plan nor premium lines under Insurance · Life. If you hold a policy outside Faro, record it and these answers will come from your book."),
      pieces: [], note: null, source: ["libros.lineas"], lines: 0,
    };
  }
  const premAmt = plan ? convertMinor(plan.amt, plan.cur, c.display, c.rateE4) : lastPrem ? view(c, lastPrem) : null;
  const srcName = plan?.src ? c.names.catalog(plan.src) : "";
  const cobroTxt = plan
    ? plan.day
      ? L(c.lang, `el día ${plan.day} de cada mes`, `on day ${plan.day} of each month`)
      : plan.week
        ? L(c.lang, `en la semana ${plan.week} de cada mes`, `in week ${plan.week} of each month`)
        : null
    : null;
  const premTxt = premAmt !== null ? c.money(premAmt) : null;
  const stock = savingsStock(c.state, c.key);
  /* LA LEY: no es cuenta ni ahorro, y no guarda saldo. */
  if (/(cuenta como|cuenta en|es (un )?ahorro|counts? as|is (it |this )?(a )?saving|cuanto tengo en|cuanto hay en|how much do i have in|how much is in|cuanto vale mi seguro|saldo de mi seguro)/.test(folded)) {
    return {
      kind: "answer", family: "seguro",
      verdict: L(c.lang, `Tu seguro de vida no es una cuenta ni un ahorro: la póliza no guarda saldo — es protección, no dinero apartado. Lo que tu libro sí trae es la prima${premTxt ? ` de ${premTxt} al mes` : ""}${cobroTxt ? `, cobrada ${cobroTxt}` : ""}${srcName ? ` de tu cuenta ${srcName}` : ""}. Por eso el seguro no suma en tus ahorros (${c.money(stock.total)}) ni en ningún total: lo que sale es la prima, y lo que la póliza vale es su cobertura, que vive en la nota de la pieza, no en una cifra de tu libro.`, `Your life insurance is not an account or savings: the policy holds no balance — it's protection, not money set aside. What your book does carry is the premium${premTxt ? ` of ${premTxt} a month` : ""}${cobroTxt ? `, charged ${cobroTxt}` : ""}${srcName ? ` from your ${srcName} account` : ""}. That's why the insurance doesn't add into your savings (${c.money(stock.total)}) or into any total: what goes out is the premium, and what the policy is worth is its coverage, which lives in the piece's note, not in a figure in your book.`),
      pieces: [...(premAmt !== null ? [{ label: L(c.lang, "La prima al mes", "The monthly premium"), minor: premAmt }] : [])],
      note: L(c.lang, "La ley está escrita en el propio plan de tu libro: la prima es un gasto fijo que se cobra de una cuenta; la póliza nunca es un activo.", "The law is written in your book's own plan: the premium is a fixed expense charged to an account; the policy is never an asset."),
      source: ["libros.lineas"], lines: premLines.length,
    };
  }
  /* ¿CUÁNDO SE COBRA? */
  if (/(cuando se cobra|cuando (es el )?cobro|cuando me cobran|cuando cobran|cuando se paga la prima|when is it charged|when does it charge|when do they charge|when is the premium)/.test(folded)) {
    return {
      kind: "answer", family: "seguro",
      verdict: cobroTxt
        ? L(c.lang, `Tu seguro de vida se cobra ${cobroTxt}${srcName ? `, de tu cuenta ${srcName}` : ""}${premTxt ? ` — la prima es ${premTxt}` : ""}. Es lo que el plan de la pieza trae escrito.`, `Your life insurance is charged ${cobroTxt}${srcName ? `, from your ${srcName} account` : ""}${premTxt ? ` — the premium is ${premTxt}` : ""}. That's what the piece's plan has written.`)
        : L(c.lang, "El plan de tu seguro de vida no trae escrito el día de cobro: la pieza guarda la prima, pero no cuándo cae. Ese dato se escribe en la pieza y la respuesta sale de ahí.", "Your life insurance plan doesn't have the charge day written: the piece keeps the premium, but not when it lands. That fact is written on the piece, and the answer comes from there."),
      pieces: [...(premAmt !== null ? [{ label: L(c.lang, "La prima al mes", "The monthly premium"), minor: premAmt }] : [])],
      note: null, source: ["libros.lineas"], lines: premLines.length,
    };
  }
  /* ¿DE QUÉ CUENTA SALE? */
  if (/(de que cuenta|de donde (sale|se cobra|sale el cobro)|which account|what account|where does it come from)/.test(folded)) {
    return {
      kind: "answer", family: "seguro",
      verdict: srcName
        ? L(c.lang, `Tu seguro de vida se cobra de tu cuenta ${srcName}: así lo trae escrito el plan de la pieza${premTxt ? ` — la prima es ${premTxt} al mes` : ""}.`, `Your life insurance is charged to your ${srcName} account: that's what the piece's plan has written${premTxt ? ` — the premium is ${premTxt} a month` : ""}.`)
        : L(c.lang, "El plan de tu seguro de vida no trae escrita la cuenta de cobro: la pieza guarda la prima, pero no de qué cuenta sale. Ese dato se escribe en la pieza.", "Your life insurance plan doesn't have the charging account written: the piece keeps the premium, but not which account it comes out of. That fact is written on the piece."),
      pieces: [...(premAmt !== null ? [{ label: L(c.lang, "La prima al mes", "The monthly premium"), minor: premAmt }] : [])],
      note: null, source: ["libros.lineas"], lines: premLines.length,
    };
  }
  /* LOS BENEFICIARIOS. */
  if (/(beneficiario|beneficiarios|beneficiary|beneficiaries|quien (es|queda|recibe|se queda)|who (is|gets|receives))/.test(folded)) {
    const bens = piece?.bens ?? [];
    return {
      kind: "answer", family: "seguro",
      verdict: bens.length
        ? L(c.lang, `En la pieza de tu seguro de vida ${bens.length === 1 ? "está nombrado" : "están nombrados"}: ${bens.join(", ")}. Son los nombres que tú escribiste en la pieza — viven ahí, con tu libro.`, `On your life insurance piece, ${bens.length === 1 ? "the named beneficiary is" : "the named beneficiaries are"}: ${bens.join(", ")}. They are the names you wrote on the piece — they live there, with your book.`)
        : L(c.lang, "En la pieza de tu seguro de vida no nombraste a nadie todavía: la lista de beneficiarios está vacía. Los nombres se escriben en la pieza y viajan con tu libro.", "On your life insurance piece you haven't named anyone yet: the beneficiary list is empty. The names are written on the piece and travel with your book."),
      pieces: [], note: null, source: ["libros.lineas"], lines: 0,
    };
  }
  /* ¿DESDE CUÁNDO? */
  if (/(desde cuando|desde que|cuando (empece|comence|contrate|lo tengo)|how long have i had|since when|when did i (start|get|take))/.test(folded)) {
    return {
      kind: "answer", family: "seguro",
      verdict: plan?.start
        ? L(c.lang, `Según la pieza, empezaste con esta aseguradora el ${fmtFecha(c, plan.start)}: esa es la fecha que tú escribiste en el plan — el libro no la adivina.`, `According to the piece, you started with this insurer on ${fmtFecha(c, plan.start)}: that's the date you wrote on the plan — the book doesn't guess it.`)
        : L(c.lang, "La pieza de tu seguro de vida no trae la fecha de inicio: ese campo nació vacío y solo lo llenas tú. Sin esa fecha, el «desde cuándo» no sale del libro.", "Your life insurance piece doesn't carry the start date: that field is born empty and only you fill it. Without that date, the \"since when\" doesn't come out of the book."),
      pieces: [], note: null, source: ["libros.lineas"], lines: 0,
    };
  }
  /* LA PRIMA: cuánto pago. */
  if (/(cuanto pago|cuanto es|cuanto cuesta|cuanto sale|la prima|cuanto cobran|how much do i pay|how much is|the premium|what do i pay|how much does it cost)/.test(folded)) {
    return {
      kind: "answer", family: "seguro",
      verdict: premTxt
        ? L(c.lang, `De seguro de vida pagas ${premTxt} al mes de prima${cobroTxt ? `, cobrada ${cobroTxt}` : ""}${srcName ? ` de tu cuenta ${srcName}` : ""}. Es un gasto fijo de tu libro — la póliza en sí no guarda saldo ni suma como ahorro.`, `For life insurance you pay ${premTxt} a month in premium${cobroTxt ? `, charged ${cobroTxt}` : ""}${srcName ? ` from your ${srcName} account` : ""}. It's a fixed expense in your book — the policy itself holds no balance and doesn't add up as savings.`)
        : L(c.lang, "La pieza de tu seguro de vida está en tu catálogo, pero su plan no está configurado: no trae la prima escrita, y sin ese dato el «cuánto pagas» no sale del libro.", "Your life insurance piece is in your catalog, but its plan isn't set up: it carries no written premium, and without that fact the \"how much you pay\" doesn't come out of the book."),
      pieces: [...(premAmt !== null ? [{ label: L(c.lang, "La prima al mes", "The monthly premium"), minor: premAmt }] : [])],
      note: null, source: ["libros.lineas"], lines: premLines.length,
    };
  }
  /* LA FORMA DESNUDA: «¿tengo seguro de vida?» — el resumen de la pieza. */
  return {
    kind: "answer", family: "seguro",
    verdict: piece
      ? L(c.lang, `Sí: tu seguro de vida es la pieza «${c.names.catalog(piece.id)}»${premTxt ? ` — prima de ${premTxt} al mes` : ", sin plan configurado todavía"}${cobroTxt ? `, cobrada ${cobroTxt}` : ""}${srcName ? ` de tu cuenta ${srcName}` : ""}. La póliza es protección: no guarda saldo ni suma en tus ahorros.`, `Yes: your life insurance is the piece "${c.names.catalog(piece.id)}"${premTxt ? ` — a premium of ${premTxt} a month` : ", with no plan set up yet"}${cobroTxt ? `, charged ${cobroTxt}` : ""}${srcName ? ` from your ${srcName} account` : ""}. The policy is protection: it holds no balance and doesn't add into your savings.`)
      : L(c.lang, `En tu libro no hay pieza de seguro de vida, pero sí consta la prima: la última línea anotada es de ${premTxt ?? ""} en Seguros · Vida. Sin la pieza, el plan (el día de cobro, la cuenta, los beneficiarios) no vive en tu libro.`, `Your book has no life insurance piece, but the premium is on record: the latest line is ${premTxt ?? ""} under Insurance · Life. Without the piece, the plan (the charge day, the account, the beneficiaries) doesn't live in your book.`),
    pieces: [...(premAmt !== null ? [{ label: L(c.lang, "La prima al mes", "The monthly premium"), minor: premAmt }] : [])],
    note: null, source: ["libros.lineas"], lines: premLines.length,
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
        ? L(c.lang, `Ojo: la ventana de Cobros muestra «${dueAhead.name}» venciendo el ${fmtFecha(c, dueAhead.on)} — si es el mismo cobro en su próximo ciclo, ese sigue por pagar.`, `Note: the Collections window shows "${dueAhead.name}" due on ${fmtFecha(c, dueAhead.on)} — if that's the same charge in its next cycle, that one is still to pay.`)
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
      verdict: L(c.lang, `Todavía no: «${due.name}» sigue por pagar — ${c.money(due.amt ?? 0)}, vence el ${fmtFecha(c, due.on)}.`, `Not yet: "${due.name}" is still to pay — ${c.money(due.amt ?? 0)}, due ${fmtFecha(c, due.on)}.`),
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
/* LA PERSONA DE REMESAS QUE LA PREGUNTA NOMBRA (Ola 27, Familia 5,  */
/* Q27-3): el ciudadano `person` de los patrones manda primero — la   */
/* palabra confirmada del usuario («mami») resuelve a su ciudadano    */
/* como accionesAnswer ya hacía — y el escaneo de nombres verdaderos  */
/* es la caída. Y LA NEGATIVA NOMBRADA: una pregunta de remesas que   */
/* nombra a una persona que no se resuelve JAMÁS degrada en silencio  */
/* a «la última» global ni a la suma de otra persona: dice que no     */
/* sabe de quién. (La degradación silenciosa cazada en la Ola 27:     */
/* «¿cuándo fue la última remesa a mami?» recibía la remesa de Primo  */
/* sin nombrarlo.)                                                    */
/* ------------------------------------------------------------------ */
/** OLA 28 (Familia 1, Q28-1..Q28-5): LA RESOLUCIÓN DE PERSONAS, UNA
 * SOLA LEY — escrita una vez y aplicada por la recencia, por la suma
 * y por las acciones:
 *   1. Todo encaje es de PALABRA ENTERA: «semana» no es Ana (la
 *      subcadena resolvía a la persona equivocada y la pregunta
 *      global de la semana recibía la suma de Ana).
 *   2. GANA EL ENCAJE MÁS LARGO/EXACTO: el nombre entero escrito
 *      («María Fernanda», 14) manda sobre el alias de una palabra
 *      («maria» → María José, 5); a igual largo manda el alias
 *      confirmado (su «primo» para Mamá vence al ciudadano Primo:
 *      la palabra del usuario, confirmada por él, es la ley de su
 *      libro — espécimen sostenido de la Ola 28).
 *   3. Sin encaje de nombre entero ni de alias, la caída es la
 *      palabra suelta del nombre como palabra entera, en el orden
 *      del libro (el primer nombre compartido resuelve por la lista,
 *      nombrado entero en la respuesta — OBS-28-A2, asentado).
 *   4. Sin ningún encaje, quien llama nombra la negativa con
 *      remitPersonWordOf: jamás la degradación silenciosa a la
 *      remesa global ni a la suma de otra persona. */
function remitPersonOf(c: Ctx, folded: string) {
  const people = c.state.remitPeople ?? [];
  const wholeAt = (needle: string): boolean => {
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(folded);
  };
  let best: { person: (typeof people)[number]; span: number } | null = null;
  const consider = (person: (typeof people)[number], span: number) => {
    if (span > 0 && (!best || span > best.span)) best = { person, span };
  };
  // El alias confirmado se considera PRIMERO: a igual largo que un
  // nombre entero, el alias queda (la palabra del usuario manda).
  const learnedPerson = aliasIn(c.learned, folded);
  if (learnedPerson?.kind === "person") {
    const p = people.find((x) => x.id === learnedPerson.targetId);
    if (p) consider(p, learnedPerson.word.length);
  }
  for (const p of people) {
    const f = foldQ(p.name).trim();
    if (f.length >= 3 && wholeAt(f)) consider(p, f.length);
    // OLA 30 (Familia 1, Q30-1): el nombre exacto de DOS letras también
    // casa — pero SOLO en posición de persona: tras un apertor o el
    // verbo de envío, y cerrando la frase (tras él solo cabe
    // vocabulario de función). «Al» está en el libro y la pregunta
    // «¿cuándo fue la última remesa a Al?» entregaba la remesa de
    // Primo como si fuera «la última», sin nombrar a nadie: el piso de
    // 3 letras dejaba invisible al nombre corto. El libro arbitra: si
    // el nombre está, resuelve; el apertor «al» cede ante el acierto
    // del escaneo — si el nombre ES la palabra del apertor («al»),
    // solo casa como ÚLTIMA palabra tras apertor, verbo o tratamiento
    // («mande a Al»), jamás como el apertor que abre («al banco»: ahí
    // «al» trabaja de apertor y «banco» es la candidata). La caída de
    // la palabra suelta conserva su piso de 3: una palabra de 2 letras
    // de un nombre largo no resuelve a la ligera.
    // OLA 31 (Familia 2, Q31-1): la cláusula de ÚLTIMA palabra quedó
    // enmendada por su propia closesPhrase — el guardia vetaba «a Al
    // ayer» y «a Al en octubre», donde el nombre va precedido de OTRO
    // apertor y seguido solo de cierres: la ley vigente es la del
    // guardia reconciliado junto al bucle (el nombre-apertor resuelve
    // precedido de otro apertor o cerrando la frase; «al banco» y
    // «al mes pasado» siguen fuera) y el cierre se juzga con el oído
    // de periodOf (REMIT_CLOSING_WORDS).
    else if (f.length === 2 && wholeAt(f)) {
      const toks = folded.split(/[^a-z0-9]+/).filter(Boolean);
      const preceded = (t: string | undefined) =>
        t !== undefined && (REMIT_OPENERS.has(t) || REMIT_SEND_VERBS.has(t) || REMIT_PERSON_TITLES.has(t) || REMIT_KINSHIP.has(t) || REMIT_PERSON_STOP.has(t));
      // OLA 31 (Familia 2, Q31-1): el cierre se juzga con el oído de
      // periodOf (REMIT_CLOSING_WORDS, abajo): tras el nombre caben
      // las paradas, las palabras y los nombres de período y las
      // preposiciones que los introducen — la versión vieja
      // desconocía «en + mes» para todo nombre de dos letras.
      const closesPhrase = (i: number) =>
        toks.slice(i + 1).every((t) => REMIT_CLOSING_WORDS.has(t));
      const isOpenerWord = REMIT_OPENERS.has(f);
      for (let i = 0; i < toks.length; i++) {
        if (toks[i] !== f || !preceded(toks[i - 1]) || !closesPhrase(i)) continue;
        // OLA 31 (Familia 2, Q31-1): el guardia de ÚLTIMO token vetaba
        // también la posición legítima — «a Al ayer», «a Al en
        // octubre» — contradiciendo el permiso de cierre de la propia
        // closesPhrase, y el nombre más corto del libro quedaba fuera
        // de casi toda pregunta que continuara. La ley reconciliada:
        // el nombre que ES palabra de apertura resuelve cuando no es
        // el apertor que abre — cuando su token va precedido de OTRO
        // apertor («a Al», «para Al», "to Al": ahí hay dos piezas, el
        // apertor y el nombre) o cuando cierra la frase (nada sigue
        // que el token pudiera abrir). «Mande al banco» y «mande al
        // mes pasado» quedan fuera, como manda la cura de la Ola 30:
        // ahí «al» ES el apertor — lo precede el verbo, no un
        // apertor — y trabaja de contracción, no de nombre.
        if (isOpenerWord && i !== toks.length - 1 && !REMIT_OPENERS.has(toks[i - 1])) continue;
        consider(p, f.length);
        break;
      }
    }
  }
  if (best) return (best as { person: (typeof people)[number] }).person;
  return people.find((p) => foldQ(p.name).split(/\s+/).some((w) => w.length >= 3 && wholeAt(w)));
}

const REMIT_PERSON_STOP = new Set(["la", "el", "los", "las", "una", "uno", "mi", "su", "tu", "the", "my", "his", "her", "nombre", "name", "tiempo", "time", "casa", "cuenta", "account", "vez", "persona", "person", "alguien", "someone", "nadie", "anyone", "mes", "month", "semana", "week", "ano", "year", "dia", "day", "hoy", "today", "ayer", "yesterday", "manana", "tomorrow", "meses", "months", "semanas", "weeks", "dias", "days", "total", "todo", "toda", "todos", "todas", "cada", "each", "every", "vez", "veces", "times", "remesa", "remittance", "remittances", "remesas", "dinero", "money"]);
/** Los tratamientos que preceden a un nombre tras «a»: no son la
 * persona ni detienen la búsqueda — se saltan («a la señora Pérez»
 * encuentra a Pérez tras «la» y «señora»). OLA 29 (Familia 1, Q29-2):
 * la lista aprende los tratamientos que la caza encontró acusados —
 * doctor/doctora y sus abreviaturas plegadas (dr/dra), y niño/niña
 * como tratamiento («para la niña Rosa»): la caminata pasa DE ELLOS
 * hasta el nombre, y la negativa acusa al nombre, nunca al trato. */
const REMIT_PERSON_TITLES = new Set(["senor", "senora", "senorita", "don", "dona", "mr", "mrs", "ms", "miss", "aunt", "uncle", "tia", "tio", "doctor", "doctora", "dr", "dra", "nino", "nina"]);
const REMIT_PERSON_DEM = new Set(["esa", "ese", "eso", "esas", "esos", "esta", "este", "esto", "that", "this", "those", "these"]);
/** OLA 29 (Familia 1, Q29-1 + Q29-C1): LAS PALABRAS DE PERÍODO que
 * periodOf reconoce — los demostrativos (el conjunto DEM entero) y los
 * relativos de tiempo (last/next, pasado, último) — NUNCA son
 * candidatas a persona en su posición: «¿Cuánto mandé esta semana?»
 * acusaba a «esta», «este mes» a «este» y "last month" a "last",
 * porque la caminata vieja solo excluía los demostrativos de la
 * PRIMERA posición y del camino desnudo no excluía ninguno. Los
 * nombres de período (semana/mes/año, week/month/year) ya viven en
 * REMIT_PERSON_STOP. Una palabra de período se salta y la caminata
 * sigue: si tras ella hay un nombre, el nombre manda. */
const REMIT_PERIOD_WORDS = new Set(["esta", "este", "esa", "ese", "eso", "esto", "estas", "estos", "esas", "esos", "this", "that", "these", "those", "last", "next", "pasado", "pasada", "pasados", "pasadas", "ultimo", "ultima", "ultimos", "ultimas"]);
/** OLA 31 (Familia 1, Q31-1 de Cara): LOS NOMBRES DE PERÍODO — los
 * doce meses, la quincena y el «pay period» — son vocabulario de la
 * pregunta: el mismo que periodOf suma y REMIT_PERIOD_MARKER oye. La
 * caminata no los conocía y los acusaba como personas («¿cuánto
 * mandé en agosto?» → «no sé quién es «agosto»»; "this pay period"
 * acusado entero), y la familia remesas-periodo — nacida para esas
 * preguntas — nunca las recibía: la cascada preguntaba a la persona
 * (7b) antes que al período (7c) y la premisa falsa mataba la
 * pregunta. EL VOCABULARIO DE PERÍODO ES UNO: lo que el motor
 * reconoce como período en cualquier puerta, la caminata lo reconoce
 * en la suya — una palabra de período jamás es candidata a persona,
 * la ley de Q29-C1 extendida a todo el vocabulario que periodOf
 * habla. */
const REMIT_MONTH_WORDS = new Set(["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "setiembre", "octubre", "noviembre", "diciembre", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]);
const REMIT_PERIOD_NOUNS = new Set([...REMIT_MONTH_WORDS, "quincena", "pay", "period", "trimestre", "semestre", "bimestre", "quarter", "fortnight"]);
/** OLA 32 (Familia 1, Q32-1): LAS FRASES DE LA QUINCENA SALEN DE UNA
 * SOLA FUENTE — la Cura 31 unió las PALABRAS de período, pero
 * periodOf habla la quincena en FRASES («la primera quincena»,
 * "the first half", "this half month") y esas palabras quedaron
 * fuera de la caminata: «¿cuánto mandé la primera quincena?» acusaba
 * a «primera», "the first half" se acusaba entero y "this half
 * month" acusaba a «half» — la familia que sirve esas quincenas
 * nunca recibía la pregunta, contra la ley escrita de la propia
 * cura («lo que el motor reconoce como período en cualquier puerta,
 * la caminata lo reconoce en la suya»). La fuente es UNA: estas
 * listas alimentan las regex de la rama de la quincena de periodOf
 * Y las frases que la caminata consume como clase; y los ordinales
 * que las abren son vocabulario de período en la caminata, en el
 * cierre y en el recorte de cola — jamás una candidata.
 * Y en REMIT_PERIOD_NOUNS entraron los nombres de período que
 * NINGUNA puerta sirve («trimestre», «semestre», «bimestre»,
 * "quarter", "fortnight"): periodOf no los oye y el marcador
 * tampoco, así que conocerlos no sirve la pregunta — lo que hace
 * es que la pregunta muera en el silencio honesto o en el unknown,
 * no acusando a un nombre de tiempo como si fuera una persona. La
 * clase es cerrada y pequeña, y el escaneo sigue arbitrando
 * primero: una persona real con ese nombre en el libro resuelve
 * por el escaneo antes de que la caminata opine. */
const PERIOD_HALF_PHRASES = {
  first: ["primera quincena", "first half"],
  second: ["segunda quincena", "second half"],
  last: ["quincena pasada", "last pay period"],
  head: ["quincena", "quincenal", "pay period", "half month"],
} as const;
/** Las frases de la quincena como piezas de tokens, para la
 * caminata: la misma fuente, en la forma que el camino consume. */
const REMIT_PERIOD_PHRASES: string[][] = [
  ...PERIOD_HALF_PHRASES.first, ...PERIOD_HALF_PHRASES.second,
  ...PERIOD_HALF_PHRASES.last, ...PERIOD_HALF_PHRASES.head,
].map((p) => p.split(" "));
/** Los ordinales que abren las frases de la quincena: vocabulario
 * de período, nunca candidatas (la ley de la Familia 1 de la Ola 31
 * extendida a la frase entera que periodOf habla). */
const REMIT_PERIOD_ORDINALS = new Set(["primera", "segunda", "first", "second", "half"]);
/** OLA 33 (Familia 3, Q33-3): LOS MODIFICADORES DE LA QUINCENA QUE
 * NINGUNA PUERTA SIRVE — «próxima»/«siguiente» (la quincena que
 * viene) y las abreviaturas ordinales («1ra», «2da», «1a», «2a»)
 * no son vocabulario de ninguna puerta: periodOf no oye una
 * quincena futura ni la abreviatura ordinal, y la caminata los
 * dejaba como resto final de la pieza, así que la negativa los
 * ACUSABA como personas («No sé quién es «proxima»», «…«1ra»») —
 * la especie de Q32-1 en su tercer anillo. EL ALCANCE, escrito:
 * el modificador es vocabulario de período SOLO cuando acompaña
 * a su nombre — pegado a una cabeza de la quincena, delante
 * («la próxima quincena», «la 1ra quincena», "next pay period") o
 * detrás («la quincena próxima») —; suelto, sin la quincena en la
 * pregunta, la caminata no lo toca, y el escaneo sigue arbitrando
 * primero, como con todo el vocabulario de período: una persona
 * real con ese nombre en el libro resuelve por el escaneo antes
 * de que la caminata opine. Consumido el modificador, la pregunta
 * muere en el silencio honesto del grado B de la Familia 1: sin
 * acusación y sin la quincena en curso disfrazada — la guarda de
 * remesaPeriodoAnswer rehúsa servir el período que periodOf
 * leería por la cabecera. En las demás familias el calificador
 * que periodOf no casa se cae con su etiqueta honesta (la especie
 * de OBS-33-A2, registrada, que no es esta cura), y con persona
 * resuelta el paso 7b conserva esa misma lectura. */
const REMIT_PERIOD_MODIFIERS = new Set(["proxima", "proximas", "proximo", "proximos", "siguiente", "siguientes", "1ra", "2da", "1a", "2a"]);
/** Las cabezas de la quincena como piezas: la primera palabra y la
 * última de cada frase de la fuente, para juzgar la compañía del
 * modificador (delante manda la primera; detrás, la última). */
const REMIT_HALF_HEAD_FIRST = new Set(["quincena", "quincenal", "pay", "half"]);
const REMIT_HALF_HEAD_LAST = new Set(["quincena", "quincenal", "period", "month"]);
const isHalfModifierWord = (w: string): boolean => REMIT_PERIOD_MODIFIERS.has(w) || w === "next";
/** El modificador monta sobre la quincena en ESTA posición de la
 * pregunta plegada: la cabeza empieza justo después, o terminó
 * justo antes. Sin cabeza al lado, no es palabra de período. */
function remitHalfModifierAt(toks: string[], i: number): boolean {
  if (!isHalfModifierWord(toks[i])) return false;
  const next = toks[i + 1];
  const prev = toks[i - 1];
  return (next !== undefined && REMIT_HALF_HEAD_FIRST.has(next)) || (prev !== undefined && REMIT_HALF_HEAD_LAST.has(prev));
}
/** La pregunta trae un modificador sin puerta montado en la
 * quincena: la familia del período no sirve esa pregunta (su
 * muerte es el silencio honesto, no la quincena en curso). */
function remitHalfModifierUnserved(folded: string): boolean {
  const toks = folded.split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    if (remitHalfModifierAt(toks, i)) return true;
  }
  return false;
}
/** La regex de una lista de frases de la fuente única, para las
 * puertas que leen la pregunta plegada entera (periodOf). */
const periodHalfRe = (ps: readonly string[]): RegExp => new RegExp(ps.join("|"));
/** La familia entera de la quincena, plana: la oyen la puerta de
 * periodOf, el marcador de la familia remesas-periodo y el paso
 * persona×período — tres oídos, una fuente (Ola 32, Familia 1: el
 * marcador oía solo la cabecera y "first half" moría en unknown
 * con la puerta ya abierta). */
const PERIOD_HALF_ALL: readonly string[] = [
  ...PERIOD_HALF_PHRASES.head, ...PERIOD_HALF_PHRASES.first,
  ...PERIOD_HALF_PHRASES.second, ...PERIOD_HALF_PHRASES.last,
];
/** OLA 31 (Familia 2, Q31-1 del Asesor): EL CIERRE DE LA FRASE DE
 * PERSONA se juzga con el oído de periodOf — tras un nombre de dos
 * letras solo cabe vocabulario de función: las paradas, las palabras
 * y los nombres de período, y las preposiciones que los introducen
 * («en octubre», "in august"). La closesPhrase vieja desconocía la
 * construcción «en + mes» para TODO nombre corto: «a Ed en octubre»
 * caía en el silencio ambiguo y «a Al en octubre» acusaba al mes. */
const REMIT_CLOSING_WORDS = new Set([...REMIT_PERSON_STOP, ...REMIT_PERIOD_WORDS, ...REMIT_PERIOD_NOUNS, ...REMIT_PERIOD_ORDINALS, "en", "in"]);
/** OLA 29 (Familia 1, Q29-1): los apertores del dativo — la caminata
 * abre en cualquiera de ellos y los salta si aparecen dentro del
 * camino («al» es «a» + «el» contraídos: la forma natural de «a el
 * doctor Pérez» en español, y la caminata vieja no lo conocía). */
const REMIT_OPENERS = new Set(["a", "al", "para", "to"]);
/** Lo que tras «send»/«sent»/«mandé» NO es una persona: el dativo
 * inglés sin «to» («How much did I send Rigoberto?») captura el
 * nombre solo cuando la palabra no es de esta lista ni de relleno. */
const REMIT_BARE_STOP = new Set(["money", "it", "more", "them", "him", "her", "us", "you", "me", "that", "this", "back", "home", "today", "yesterday", "again", "dinero", "eso", "esto", "mas", "otra", "otro"]);
/** Los verbos de envío que abren el camino desnudo (sin apertor). */
const REMIT_SEND_VERBS = new Set(["mande", "envie", "enviado", "sent", "send"]);
/** OLA 30 (Familia 1): las FRASES preposicionales hechas — se consumen
 * como UNA pieza, no como palabras sueltas a coleccionar: la especie
 * de Q30-3 volvía cada ola con la palabra nueva de turno («través»,
 * «medio», «favor») porque la caminata coleccionaba palabras; una
 * frase hecha es una clase cerrada del idioma, y lo que no es clase
 * ni palabra de función NO se consume — ver la ley de abajo. */
const REMIT_PHRASES: string[][] = [
  ["a", "traves", "de"],
  ["por", "medio", "de"],
  ["a", "favor", "de"],
  ["a", "nombre", "de"],
  ["on", "behalf", "of"],
];
/** OLA 30 (Familia 1): los parentescos — como los tratamientos, solo
 * se consumen EN POSICIÓN DE TÍTULO (cuando tras ellos viene el
 * nombre: «al padre Pérez» camina hasta «perez»); como resto final
 * SON la candidata («mande al padre» nombra a «padre»: es el eco
 * honesto de lo que el usuario dijo). */
const REMIT_KINSHIP = new Set(["padre", "madre", "hermano", "hermana", "hijo", "hija", "abuelo", "abuela", "primo", "prima", "sobrino", "sobrina", "nieto", "nieta", "brother", "sister", "father", "mother", "son", "daughter", "husband", "wife", "grandpa", "grandma"]);
/** El resto del vocabulario de función suelto que la caminata consume
 * palabra a palabra (las preposiciones y partículas que no forman
 * frase hecha, y los determinantes que REMIT_PERSON_STOP no trae).
 * OLA 31 (Familia 1): «in» entra — "in august" viajaba entero dentro
 * del nombre acusado porque la preposición inglesa no era de nadie. */
const REMIT_FUNCTION_WORDS = new Set(["de", "del", "por", "con", "sin", "en", "in", "of", "by", "for", "from", "through", "via", "it", "un", "an", "its", "our", "their"]);

/** La puntería de una pregunta de remesas: a quién nombra sin
 * resolverlo. Devuelve la candidata (la palabra que la negativa
 * nombra), o la marca de AMBIGUO (la caminata no pudo consumir todo
 * el camino: no nace negativa — silencio honesto antes que un nombre
 * falso), o nada (la pregunta no apunta a nadie).
 *
 * OLA 28 (Familia 1, Q28-3 + Q28-C2): la búsqueda CAMINA tras la
 * preposición — salta el relleno y los tratamientos en vez de
 * detenerse en la primera palabra («a la señora Pérez» se detenía en
 * «la» y la recencia caía a la última remesa global, sin nombrar a
 * nadie: la degradación silenciosa misma). Un demostrativo con su
 * nombre («esa persona») se nombra como frase en la negativa, que es
 * lo que el usuario dijo. Y el dativo inglés sin «to» («send
 * Rigoberto») se captura por el verbo cuando no hay preposición:
 * resuelve por el escaneo o se rehúsa nombrando — nunca la global.
 *
 * OLA 29 (Familia 1, Q29-1 + Q29-2 + Q29-C1) — LA CAMINATA APRENDE EL
 * IDIOMA. La caminata de la Ola 28 era más estrecha que el idioma que
 * juzga, y la especie volvió por sus tres rendijas: «al» y «para» no
 * abrían; una captura de menos de 3 letras CERRABA la búsqueda; y la
 * negativa nombraba palabras que no son la persona («doctora»,
 * «para», «nina», «esta», «este», «last»).
 *
 * OLA 30 (Familia 1, Q30-3) — LA LEY SE INVIERTE. La caminata de la
 * Ola 29 seguía curando por lista, y la especie volvió por tercera
 * vez con palabras nuevas («través», «medio», «favor», «padre»,
 * «hermano», «hermana», "through", "via", "sister"): cada palabra
 * común que la lista no traía era acusada como si fuera la persona.
 * LA LEY NUEVA, estructural y una sola para los dos caminos (el del
 * apertor y el desnudo tras el verbo): la negativa SOLO nace si la
 * caminata consumió TODAS las palabras entre el verbo y la candidata
 * como vocabulario de función conocido — apertores, artículos y
 * relleno, tratamientos y parentescos EN POSICIÓN DE TÍTULO, y las
 * frases preposicionales hechas como clases — Y la candidata es el
 * resto final (1–2 piezas, ya sin vocabulario de función dentro,
 * con el período que la siga recortado). Si queda una palabra común
 * sin consumir entre el apertor y la candidata, NO nace negativa:
 * la puntería es AMBIGUA y quien llama responde el silencio honesto
 * sin nombre y sin cifras — antes que acusar a una palabra que no es
 * la persona. Curar por lista traería «pastor» y "brother" en la
 * siguiente ola; la forma no colecciona: exige el camino entero
 * consumido. Ante la duda entre palabra común y nombre manda el
 * escaneo del libro (remitPersonOf corre ANTES en los dos llamantes:
 * si está en el libro, es persona). */
type RemitAim = { word: string | null; ambiguous: boolean };
const NO_AIM: RemitAim = { word: null, ambiguous: false };
function remitPersonAimOf(folded: string): RemitAim {
  const tokens = folded.split(/[^a-z0-9]+/).filter(Boolean);
  // OLA 31 (Familia 1, Q31-1 de Cara): la caminata consume también
  // los NOMBRES de período (REMIT_PERIOD_NOUNS) — son vocabulario de
  // la pregunta, no candidatas: «esta quincena», «en agosto», "this
  // pay period" se caminan enteros y la pregunta llega a su familia.
  const isFunction = (w: string) =>
    REMIT_OPENERS.has(w) || REMIT_PERSON_STOP.has(w) || REMIT_PERIOD_WORDS.has(w) || REMIT_FUNCTION_WORDS.has(w) || REMIT_PERIOD_NOUNS.has(w) || REMIT_PERIOD_ORDINALS.has(w);
  // OLA 34 (Familia 4, Q34-4): LOS NÚMEROS DE LA FRASE «HACE N
  // MESES» — el juego exacto de periodOf (cifra, o su lista de
  // palabras: dos, tres, cuatro, cinco, seis, ocho, doce). La
  // frase es vocabulario de período de la casa — periodOf la suma
  // y REMIT_PERIOD_MARKER la oye — y la caminata no la conocía:
  // «¿cuánto mandé hace dos meses?» acusaba a «hace dos» como
  // persona y la familia del período nunca recibía la pregunta.
  const haceNum = (w: string | undefined): boolean => !!w && (/^\d+$/.test(w) || w === "dos" || w === "tres" || w === "cuatro" || w === "cinco" || w === "seis" || w === "ocho" || w === "doce");
  // El análisis de un tramo: consume vocabulario de función desde el
  // frente y juzga el resto. El tramo INCLUYE su pieza de apertura
  // (el apertor o la primera palabra de la frase), para que las
  // frases hechas casen enteras desde su primera palabra.
  const analyze = (seg: string[]): RemitAim => {
    let j = 0;
    while (j < seg.length) {
      // El demostrativo con su nombre se nombra como frase («esa
      // persona»): es lo que el usuario dijo, no una candidata.
      if (REMIT_PERSON_DEM.has(seg[j]) && (seg[j + 1] === "persona" || seg[j + 1] === "person")) return { word: `${seg[j]} ${seg[j + 1]}`, ambiguous: false };
      const phrase = REMIT_PHRASES.find((p) => p.every((w, k) => seg[j + k] === w))
        ?? REMIT_PERIOD_PHRASES.find((p) => p.every((w, k) => seg[j + k] === w));
      if (phrase) { j += phrase.length; continue; }
      // OLA 34 (Familia 4): la frase de tiempo se consume ENTERA
      // desde el frente — «hace N meses» con el juego de números
      // de periodOf, y su forma inglesa servida («2 months ago»,
      // con cifra). La de palabra inglesa ("two months ago") no
      // la sirve ninguna puerta: no se consume y su negativa
      // ambigua queda como está, declarada en la cura.
      if (seg[j] === "hace" && haceNum(seg[j + 1]) && (seg[j + 2] === "mes" || seg[j + 2] === "meses")) { j += 3; continue; }
      if (/^\d+$/.test(seg[j]) && (seg[j + 1] === "month" || seg[j + 1] === "months") && seg[j + 2] === "ago") { j += 3; continue; }
      // OLA 35 (Q35-4/Q35-8): la frase con ARTÍCULO se consume
      // entera, como su hermana de número — «hace un mes» y
      // «a month ago» son vocabulario de período de la casa
      // (periodOf ya los sirve tras esta misma cura), y la
      // caminata no los conocía: «hace un mes» dejaba la puntería
      // ambigua y «a month ago» acusaba a «ago» de persona — una
      // palabra de puro tiempo en el banquillo de los nombres.
      if (seg[j] === "hace" && (seg[j + 1] === "un" || seg[j + 1] === "una") && /^(mes|meses|semana|semanas|ano|anos)$/.test(seg[j + 2] ?? "")) { j += 3; continue; }
      if ((seg[j] === "a" || seg[j] === "one") && /^(month|months|week|weeks|year|years)$/.test(seg[j + 1] ?? "") && seg[j + 2] === "ago") { j += 3; continue; }
      const w = seg[j];
      // Tratamiento o parentesco: se consume solo en posición de
      // título — si es la última pieza, ES la candidata.
      // OLA 33 (Familia 3, Q33-3): el modificador de la quincena
      // pegado a su cabeza (delante o detrás) se consume como
      // vocabulario de período — jamás es la candidata.
      // OLA 34 (Familia 4): un año suelto («2025») es vocabulario
      // de tiempo, jamás una candidata — «¿cuánto mandé en el
      // 2025?» lo acusaba como persona.
      if (isFunction(w) || /^\d{4}$/.test(w) || remitHalfModifierAt(seg, j) || ((REMIT_PERSON_TITLES.has(w) || REMIT_KINSHIP.has(w)) && j < seg.length - 1)) { j++; continue; }
      break;
    }
    // El resto final: el período que sigue al nombre no es parte de
    // la candidata («a Rosa esta semana» nombra a «rosa»). OLA 31
    // (Familia 1): el recorte oye el vocabulario entero del período
    // — también «a Rosa en agosto» nombra a «rosa», no a «agosto».
    let end = seg.length;
    let tailHead = false;
    while (end > j) {
      // OLA 34 (Familia 4): la frase «hace N meses» se recorta de
      // la cola ENTERA, antes que palabra a palabra («a Rosa hace
      // dos meses» nombra a «rosa»: el período que sigue al nombre
      // no es parte de la candidata, como manda la ley del recorte).
      if (end - j >= 3 && seg[end - 3] === "hace" && haceNum(seg[end - 2]) && (seg[end - 1] === "mes" || seg[end - 1] === "meses")) { end -= 3; continue; }
      // OLA 35: el recorte de cola oye las mismas formas con
      // artículo («a Rosa hace un mes» nombra a «rosa»; «sent to
      // Rosa a month ago» también).
      if (end - j >= 3 && seg[end - 3] === "hace" && (seg[end - 2] === "un" || seg[end - 2] === "una") && /^(mes|meses|semana|semanas|ano|anos)$/.test(seg[end - 1])) { end -= 3; continue; }
      if (end - j >= 3 && (seg[end - 3] === "a" || seg[end - 3] === "one") && /^(month|months|week|weeks|year|years)$/.test(seg[end - 2]) && seg[end - 1] === "ago") { end -= 3; continue; }
      const w = seg[end - 1];
      if (REMIT_PERSON_STOP.has(w) || REMIT_PERIOD_WORDS.has(w) || REMIT_PERIOD_NOUNS.has(w) || REMIT_PERIOD_ORDINALS.has(w) || /^\d{4}$/.test(w) || w === "en" || w === "in") {
        if (REMIT_HALF_HEAD_LAST.has(w)) tailHead = true;
        end--; continue;
      }
      // OLA 33 (Familia 3): el modificador pegado a la cabeza que
      // el recorte ya quitó («a Rosa próxima quincena») se recorta
      // con ella — vocabulario de período, no parte del nombre.
      if (tailHead && isHalfModifierWord(w)) { end--; continue; }
      break;
    }
    const rem = seg.slice(j, end);
    if (rem.length === 0) return NO_AIM;
    if (rem.length <= 2 && rem.every((w) => !isFunction(w))) return { word: rem.join(" "), ambiguous: false };
    return { word: null, ambiguous: true };
  };
  for (let i = 0; i < tokens.length; i++) {
    if (!REMIT_OPENERS.has(tokens[i])) continue;
    const aim = analyze(tokens.slice(i));
    if (aim.word !== null || aim.ambiguous) return aim;
  }
  // Las frases hechas también abren camino sin apertor suelto
  // («por medio de Rosa», "on behalf of Rosa", "through Rosa").
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "through" || tokens[i] === "via" || REMIT_PHRASES.some((p) => p.every((w, k) => tokens[i + k] === w))) {
      const aim = analyze(tokens.slice(i));
      if (aim.word !== null || aim.ambiguous) return aim;
    }
  }
  const bareAt = tokens.findIndex((t) => REMIT_SEND_VERBS.has(t));
  if (bareAt >= 0) {
    const aim = analyze(tokens.slice(bareAt + 1));
    if (aim.word !== null && REMIT_BARE_STOP.has(aim.word.split(" ")[0])) return NO_AIM;
    return aim;
  }
  return NO_AIM;
}

/** La candidata que la negativa nombra, si la hay (compatibilidad:
 * quien solo pregunta por la palabra recibe la palabra; la marca de
 * ambiguo la leen los llamantes con remitPersonAimOf). */
function remitPersonWordOf(folded: string): string | null {
  return remitPersonAimOf(folded).word;
}

/** OLA 31 (Familia 1, Q31-1 del Asesor): EL NOMBRE COMIDO COMO
 * APERTOR — la última costura de la degradación por el período. La
 * caminata consume «al» como vocabulario (lo es: es la contracción),
 * así que la pregunta que nombra a una persona llamada «Al» que el
 * escaneo no resolvió (no está en el libro) no deja ni candidata ni
 * marca de ambiguo: deja NADA, y la familia del período servía la
 * suma global como si nadie hubiera sido nombrado. La sonda detecta
 * la puntería sin acusar a nadie: el token «al» en POSICIÓN DE
 * PERSONA — precedido de otro apertor o del verbo de envío, seguido
 * solo de vocabulario de cierre — que NO introduce él mismo el
 * período: si lo que sigue a «al» es el nombre del período («al mes
 * pasado», «al año»), «al» trabaja de apertor del tiempo y no hay
 * persona que proteger. Con la sonda positiva, el paso 7c responde
 * el silencio honesto (remitUnclearPerson): la persona nombrada
 * manda sobre el período presente, aunque su nombre sea
 * indistinguible de la contracción. */
const REMIT_PERIOD_HEADS = new Set([...REMIT_PERIOD_NOUNS, "mes", "semana", "ano", "month", "week", "year"]);
function remitConsumedName(folded: string): boolean {
  const toks = folded.split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] !== "al") continue;
    const prev = toks[i - 1];
    if (prev === undefined || !(REMIT_OPENERS.has(prev) || REMIT_SEND_VERBS.has(prev))) continue;
    const next = toks[i + 1];
    if (next !== undefined && REMIT_PERIOD_HEADS.has(next)) continue;
    if (toks.slice(i + 1).every((t) => REMIT_CLOSING_WORDS.has(t))) return true;
  }
  return false;
}

function remitUnknownPerson(c: Ctx, word: string, family: BankFamilyId): BankResult {
  return {
    kind: "answer", family,
    verdict: L(c.lang, `No sé quién es «${word}» en tu libro: entre tus personas de remesas no hay nadie con ese nombre, y no voy a darte la remesa de otra persona como si fuera la suya.`, `I don't know who "${word}" is in your book: there's no remittance person by that name, and I won't hand you someone else's remittance as if it were theirs.`),
    pieces: [], note: null, source: ["remesas.personas"], lines: 0,
  };
}

/** OLA 30 (Familia 1, Q30-3): la puntería AMBIGUA — la caminata no
 * pudo consumir todo el camino entre el verbo y el nombre, así que
 * no hay candidata que nombrar sin riesgo de acusar a una palabra
 * común. La respuesta es el silencio honesto CON PALABRAS: no nombra
 * a nadie, no entrega cifra alguna (jamás la remesa global disfrazada)
 * y dice qué necesita para responder. */
function remitUnclearPerson(c: Ctx, family: BankFamilyId): BankResult {
  return {
    kind: "answer", family,
    verdict: L(c.lang, `No sé a quién te refieres: entre el verbo y el nombre hay palabras que no reconozco como parte de la pregunta ni como un nombre, y no voy a darte la remesa de otra persona como si fuera la suya. Si me dices el nombre tal como está en tu libro, te respondo al momento.`, `I can't tell who you mean: between the verb and the name there are words I don't recognize as part of the question or as a name, and I won't hand you someone else's remittance as if it were theirs. Tell me the name as it stands in your book and I'll answer right away.`),
    pieces: [], note: null, source: ["remesas.personas"], lines: 0,
  };
}

/* ------------------------------------------------------------------ */
/* RECENCIA — una sola máquina: la línea más reciente con el filtro.  */
/* ------------------------------------------------------------------ */
function recenciaAnswer(c: Ctx, folded: string): BankResult | null {
  const lines = allLines(c);
  // OLA 60 · LA PRÓXIMA PAGA: «¿cuándo me van a pagar de nuevo?»
  // no tenía familia — la recencia solo miraba atrás, y la mitad
  // futura de la pregunta se perdía (captura de Oscar, 2026-11-24).
  // La próxima fecha sale del libro: la fecha escrita en la línea
  // del ingreso (su nextDue) o el ritmo medido entre las dos
  // últimas pagas de la misma fuente. Sin ninguna de las dos, se
  // dice — no se inventa un día.
  const wantsNextPay = /(pagar de nuevo|van a pagar|pagaran de nuevo|proximo (pago|sueldo|salario|ingreso)|proxima paga|cuando me pagan|cuando cobro|next pay|get paid again|when will i get paid|when do i get paid)/.test(folded);
  if (wantsNextPay) {
    const incomes = lines.filter((l) => l.kind.startsWith("income")).sort((a, b) => lineDate(b).localeCompare(lineDate(a)) || b.id.localeCompare(a.id));
    const lastIn = incomes[0];
    if (lastIn) {
      let nextDate: string | null = null;
      let how: string | null = null;
      if (lastIn.nextDue && lastIn.nextDue > c.today) {
        nextDate = lastIn.nextDue;
        how = L(c.lang, `es la fecha que trae escrita tu línea de «${lastIn.concept}»`, `it's the date written on your "${lastIn.concept}" line`);
      } else {
        const series = incomes.filter((l) => (l.seriesId && l.seriesId === lastIn.seriesId) || l.concept === lastIn.concept);
        if (series.length >= 2) {
          const gap = Math.round((Date.parse(lineDate(series[0])) - Date.parse(lineDate(series[1]))) / 86400000);
          if (gap >= 1 && gap <= 62) {
            let t = Date.parse(lineDate(series[0]));
            const todayT = Date.parse(c.today);
            while (t <= todayT) t += gap * 86400000;
            nextDate = new Date(t).toISOString().slice(0, 10);
            how = L(c.lang, `tu paga viene cada ${gap} días — la última fue el ${fmtFecha(c, lineDate(lastIn))}`, `your pay comes every ${gap} days — the last one was on ${fmtFecha(c, lineDate(lastIn))}`);
          }
        }
      }
      const asksLast = /(ultim|last)/.test(folded);
      const lastText = L(c.lang, `La última vez que te pagaron fue el ${fmtFecha(c, lineDate(lastIn))}: «${lastIn.concept}», ${c.money(view(c, lastIn))}.`, `The last time you were paid was ${fmtFecha(c, lineDate(lastIn))}: "${lastIn.concept}", ${c.money(view(c, lastIn))}.`);
      if (nextDate && how) {
        return {
          kind: "answer", family: "recencia",
          verdict: `${asksLast ? `${lastText} ` : ""}${L(c.lang, `Tu próxima paga sería el ${fmtFecha(c, nextDate)}: ${how}.`, `Your next pay would be on ${fmtFecha(c, nextDate)}: ${how}.`)}`,
          pieces: [{ label: lastIn.concept, minor: view(c, lastIn) }],
          note: L(c.lang, "La fecha sale de tu libro — de su fecha escrita o de su ritmo medido — no de un calendario inventado.", "The date comes from your book — its written date or its measured pace — not from an invented calendar."),
          source: ["historial.stream", "libros.lineas"], lines: 1,
        };
      }
      return {
        kind: "answer", family: "recencia",
        verdict: `${asksLast ? `${lastText} ` : ""}${L(c.lang, "La próxima no la puedo fechar: tu libro no trae la fecha escrita en esa línea ni dos pagas de la misma fuente con qué medir el ritmo.", "I can't date the next one: your book doesn't carry the date written on that line, nor two pays from the same source to measure the pace with.")}`,
        pieces: [{ label: lastIn.concept, minor: view(c, lastIn) }],
        note: null, source: ["historial.stream"], lines: 1,
      };
    }
  }
  let pool: Line[] = [];
  let what = "";
  if (/pagaron|me pagaron|got paid|get paid|salary|salario/.test(folded) || (/ultim/.test(folded) && /ingreso|pago que recibi/.test(folded))) {
    pool = lines.filter((l) => l.kind.startsWith("income"));
    what = L(c.lang, "el último ingreso", "the last income");
  } else if (/remesa|remittance|remit|envie|mande|sent/.test(folded)) {
    // OLA 27 (Familia 5, Q27-3): la persona se resuelve TAMBIÉN por su
    // alias aprendido (remitPersonOf), y la que no se resuelve se
    // nombra — jamás se degrada en silencio a la última remesa global.
    // OLA 28 (Familia 1, Q28-2): la rama también oye «remittance» —
    // sin la palabra inglesa, «the last remittance» no tenía rama y
    // la negativa nombrada en inglés era inalcanzable.
    const person = remitPersonOf(c, folded);
    if (!person) {
      const aim = remitPersonAimOf(folded);
      if (aim.word) return remitUnknownPerson(c, aim.word, "recencia");
      if (aim.ambiguous) return remitUnclearPerson(c, "recencia");
    }
    pool = lines.filter((l) => roleOf(c.state, l.categoryId) === "remittance" && (!person || recipientName(c.state, l) === person.name || l.to === person.id));
    // OLA 28 (Familia 1, Q28-4): la persona que existe y no ha
    // recibido nada recibe LA CONTRADICCIÓN DECLARADA, como la suma
    // por persona la da («no hay envíos a X anotados») — la recencia
    // caía en silencio y la pregunta moría en la cascada, como si la
    // persona no existiera: la misma pregunta con dos verdades.
    if (person && !pool.length) {
      return {
        kind: "answer", family: "recencia",
        verdict: L(c.lang, `No hay envíos a ${person.name} anotados: en tu libro no hay ni una remesa con su nombre, así que no hay una última que enseñarte.`, `No sends to ${person.name} are recorded: your book doesn't hold a single remittance under their name, so there's no last one to show you.`),
        pieces: [], note: null, source: ["remesas.personas"], lines: 0,
      };
    }
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
  } else if (/gasto|gaste|gastado|spent|spending|expense/.test(folded)) {
    // OLA 60: «¿cuál fue mi último gasto?» no tenía rama — caía al
    // stream entero y presentaba un INGRESO como «último registro»
    // (captura de Oscar, 2026-11-24). El gasto es salida: su pool
    // es el de las salidas, como manda la dirección de la pregunta.
    pool = lines.filter((l) => isOut(l));
    what = L(c.lang, "el último gasto", "the last expense");
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
  // OLA 26 (U6): la fecha se dice en palabras — el día entero cuando la
  // línea lo trae, y el mes en palabras cuando no (nunca «2026-09»).
  const when = exactDay
    ? L(c.lang, `el ${fmtFecha(c, lineDate(last))}`, `on ${fmtFecha(c, lineDate(last))}`)
    : L(c.lang, `en ${MONTH_WORDS_ES[Number(last.monthKey.slice(5, 7)) - 1]} de ${last.monthKey.slice(0, 4)}`, `in ${MONTH_WORDS_EN[Number(last.monthKey.slice(5, 7)) - 1]} ${last.monthKey.slice(0, 4)}`);
  const verdict = store && /tienda|store/.test(folded)
    ? L(c.lang, `Tu última tienda fue ${store}: «${last.concept}», ${c.money(view(c, last))}, ${when}.`, `Your last store was ${store}: "${last.concept}", ${c.money(view(c, last))}, ${when}.`)
    : L(c.lang, `Esto fue ${what}: «${last.concept}», ${c.money(view(c, last))}, ${when}.`, `This was ${what}: "${last.concept}", ${c.money(view(c, last))}, ${when}.`);
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
  // OLA 28 (Familia 2, E28-2): el superlativo oye los dos géneros —
  // «mi compra más cara» moría porque la puerta solo oía «caro»:
  // la compra es femenina y su superlativo también.
  const max = /(mas grande|mayor|mas car[oa]|mas alt[oa]|biggest|largest|most expensive|highest)/.test(folded);
  // OLA 52 (la Caza III): el extremo por abajo no oía «más chico» —
  // la forma hablada de media América para «el menor» — y la
  // pregunta caía en silencio (el único par confundido de la
  // batería de vecinos). «Más chico/a» y «más reducido/a» entran,
  // en el estilo con género de la casa.
  const min = /(mas pequen[oa]|menor|mas barat[oa]|mas baj[oa]|mas chic[oa]|mas reducid[oa]|smallest|cheapest|lowest)/.test(folded);
  if (!max && !min) return null;
  let pool = allLines(c);
  let noun = L(c.lang, "gasto", "expense");
  // OLA 52: el adjetivo del mínimo concuerda con el sustantivo —
  // «tu compra más pequeña», no «más pequeño» (la concordancia que
  // la E28-2 dio a la puerta, ahora también en el veredicto).
  let fem = false;
  if (/ingreso|entrada|earned|income/.test(folded)) { pool = pool.filter((l) => l.kind.startsWith("income")); noun = L(c.lang, "ingreso", "income"); }
  else if (/remesa|envio|sent|remittance/.test(folded)) { pool = pool.filter((l) => roleOf(c.state, l.categoryId) === "remittance"); noun = L(c.lang, "envío de remesa", "remittance send"); }
  else if (/cuota|suscripcion|subscription/.test(folded)) { pool = pool.filter((l) => l.kind === "subscription"); noun = L(c.lang, "cuota", "due"); fem = c.lang === "es"; }
  else if (/compra|purchase|bought/.test(folded)) { pool = pool.filter((l) => l.kind === "purchase"); noun = L(c.lang, "compra", "purchase"); fem = c.lang === "es"; }
  else if (/gasto|gasto|spend|expense|he hecho/.test(folded)) { pool = pool.filter((l) => isOut(l) && roleOf(c.state, l.categoryId) !== "savings"); }
  else return null;
  if (/este mes|this month/.test(folded)) pool = pool.filter((l) => l.monthKey === c.key);
  else if (/este ano|this year/.test(folded)) pool = pool.filter((l) => l.monthKey.startsWith(c.key.slice(0, 4)));
  const valued = pool.filter((l) => view(c, l) > 0).sort((a, b) => view(c, a) - view(c, b));
  if (!valued.length) return null;
  // OLA 60 · LOS DOS EXTREMOS: «¿cuál fue mi gasto más chiquito en
  // comparación con el gasto más grande?» pedía los DOS y recibía
  // uno (captura de Oscar, 2026-11-24). Con los dos polos en la
  // pregunta, la respuesta trae los dos y la diferencia — la
  // comparación pedida, entera.
  if (max && min && valued.length >= 2) {
    const big = valued[valued.length - 1];
    const small = valued[0];
    const diff = view(c, big) - view(c, small);
    const ratio = view(c, small) > 0 ? view(c, big) / view(c, small) : 0;
    const smallWord = fem ? "chiquita" : "chiquito";
    const scope60 = /este mes|this month/.test(folded) ? L(c.lang, "este mes", "this month") : /este ano|this year/.test(folded) ? L(c.lang, "este año", "this year") : L(c.lang, "en todo tu historial", "in your whole history");
    return {
      kind: "answer", family: "extremos",
      verdict: L(c.lang, `Tu ${noun} más grande ${scope60} fue «${big.concept}»: ${c.money(view(c, big))}, el ${fmtFecha(c, lineDate(big))}. ${fem ? "La" : "El"} más ${smallWord} fue «${small.concept}»: ${c.money(view(c, small))}, el ${fmtFecha(c, lineDate(small))}. La diferencia entre los dos: ${c.money(diff)}${ratio >= 2 ? ` — el grande es ${Math.round(ratio * 10) / 10} veces ${fem ? "la chiquita" : "el chiquito"}` : ""}.`, `Your biggest ${noun} ${scope60} was "${big.concept}": ${c.money(view(c, big))}, on ${fmtFecha(c, lineDate(big))}. The smallest was "${small.concept}": ${c.money(view(c, small))}, on ${fmtFecha(c, lineDate(small))}. The difference between the two: ${c.money(diff)}${ratio >= 2 ? ` — the biggest is ${Math.round(ratio * 10) / 10} times the smallest` : ""}.`),
      pieces: [
        { label: L(c.lang, `El más grande: ${big.concept}`, `The biggest: ${big.concept}`), minor: view(c, big) },
        { label: L(c.lang, `${fem ? "La" : "El"} más ${smallWord}: ${small.concept}`, `The smallest: ${small.concept}`), minor: view(c, small) },
        { label: L(c.lang, "La diferencia", "The difference"), minor: diff },
      ],
      note: null, source: ["historial.stream", "libros.lineas"], lines: valued.length,
    };
  }
  const pick = max ? valued[valued.length - 1] : valued[0];
  const runner = max ? valued[valued.length - 2] : valued[1];
  const scope = /este mes|this month/.test(folded) ? L(c.lang, "este mes", "this month") : /este ano|this year/.test(folded) ? L(c.lang, "este año", "this year") : L(c.lang, "en todo tu historial", "in your whole history");
  return {
    kind: "answer", family: "extremos",
    verdict: L(c.lang, `Tu ${noun} ${max ? "más grande" : (fem ? "más pequeña" : "más pequeño")} ${scope} fue «${pick.concept}»: ${c.money(view(c, pick))}, el ${fmtFecha(c, lineDate(pick))}.`, `Your ${max ? "biggest" : "smallest"} ${noun} ${scope} was "${pick.concept}": ${c.money(view(c, pick))}, on ${fmtFecha(c, lineDate(pick))}.`),
    pieces: [
      { label: pick.concept, minor: view(c, pick) },
      // OLA 26 (U3): el segundo también tiene nombre — una pieza que
      // dice «El segundo» sin decir de qué no le sirve a nadie.
      ...(runner ? [{ label: L(c.lang, `${max ? "El segundo" : "El siguiente"}: ${runner.concept}`, `${max ? "The runner-up" : "The next one"}: ${runner.concept}`), minor: view(c, runner) }] : []),
    ],
    note: null, source: ["historial.stream", "libros.lineas"], lines: valued.length,
  };
}

/* ------------------------------------------------------------------ */
/* AGENDA — lo que viene, desde la misma ventana de Cobros.           */
/* ------------------------------------------------------------------ */
function agendaAnswer(c: Ctx, folded = ""): BankResult {
  // OLA 20 (el instrumento cazó el silencio): la agenda oía «pagos
  // vienen» pero no «¿qué tengo que pagar mañana?» — y su ventana era
  // siempre 31 días, así que el horizonte NOMBRADO manda: mañana es
  // mañana, esta semana cierra el domingo, este mes cierra el mes.
  // Responder «mañana» con la lista de 31 días sería un disfraz de
  // horizonte; la ventana se dice en el veredicto.
  let days = 31;
  let winEs = "los próximos 31 días";
  let winEn = "the next 31 days";
  const prox = folded.match(/proximos (\d+) dias|next (\d+) days/);
  if (/\bmanana\b|tomorrow/.test(folded)) { days = 1; winEs = "mañana"; winEn = "tomorrow"; }
  else if (/\bhoy\b|today/.test(folded)) { days = 0; winEs = "hoy"; winEn = "today"; }
  else if (/esta semana|this week/.test(folded)) {
    const dow = new Date(`${c.today}T12:00:00`).getDay();
    days = (7 - dow) % 7;
    winEs = "esta semana"; winEn = "this week";
  } else if (/este mes|fin de mes|this month|end of (the )?month/.test(folded)) {
    const dayN = Number(c.today.slice(8, 10));
    const daysIn = new Date(Number(c.key.slice(0, 4)), Number(c.key.slice(5, 7)), 0).getDate();
    days = Math.max(0, daysIn - dayN);
    winEs = "de aquí a fin de mes"; winEn = "from here to month's end";
  } else if (prox) { days = Number(prox[1] ?? prox[2]); winEs = `los próximos ${days} días`; winEn = `the next ${days} days`; }
  const dues = duesWindow(c.state, days, c.today).slice().sort((a, b) => a.on.localeCompare(b.on));
  if (!dues.length) {
    return {
      kind: "answer", family: "agenda",
      verdict: L(c.lang, `En ${winEs} no viene ningún pago: la ventana de Cobros está vacía en ese horizonte.`, `In ${winEn} no payment comes up: the Collections window is empty on that horizon.`),
      pieces: [], note: null, source: ["cobros.cuotas", "central.gastare"], lines: 0,
    };
  }
  const first = dues.slice(0, 5);
  return {
    kind: "answer", family: "agenda",
    verdict: L(c.lang, `En ${winEs}: lo primero que viene es «${first[0].name}», el ${fmtFecha(c, first[0].on)}, por ${c.money(first[0].amt ?? 0)}.`, `In ${winEn}: the first thing ahead is "${first[0].name}", on ${fmtFecha(c, first[0].on)}, for ${c.money(first[0].amt ?? 0)}.`),
    pieces: first.map((d) => ({ label: `${d.name} · ${fmtFecha(c, d.on)}`, minor: d.amt ?? 0 })),
    note: dues.length > first.length
      ? L(c.lang, `Y ${dues.length - first.length} más en ese horizonte.`, `And ${dues.length - first.length} more on that horizon.`)
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
    /* OLA 44 (D1): el ranking lee TAMBIÉN los saldos anotados en
     * líneas de deuda — la misma fuente única del total (debts.ts
     * la llama totalDebt: préstamos + tarjetas + líneas). Una
     * tarjeta que vive como línea con saldo no puede ser invisible
     * aquí y visible en el interés. */
    const lineCards = lineDebtLines(c.state, c.today).map((line) => ({ name: line.concept || "Créditos", bal: convertMinor(line.balanceMinor as number, line.balanceCurrency || line.currency, c.display, c.rateE4) })).filter((x) => x.bal > 0);
    const cards = [...cardsOf(c.state).map((card) => ({ name: card.name, bal: cardFigures(c.state, card, c.today).balance })), ...lineCards]
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
  // OLA 35 (Q35-4): LAS FORMAS CON ARTÍCULO DE «HACE» — «hace un
  // mes / una semana / un año» y su espejo inglés («a month ago») —
  // no las oía ninguna rama: «hace un mes» caía al mes en curso,
  // «hace una semana» a esta semana y «hace un año» a este año (la
  // rama /\bano\b/ oía «ano» dentro de la frase), todo EN SILENCIO —
  // peor que un recorte, porque la etiqueta servía el período en
  // curso como si fuera el pedido. La puerta las sirve ahora con su
  // desplazamiento verdadero, antes de las ramas del período en
  // curso. Y el inglés con número en letras («two months ago») se
  // suma a la rama de cifra: en historia servía «this month».
  const haceArt = folded.match(/hace (?:un|una) (mes|semana|ano)\b/) ?? folded.match(/\b(?:a|one) (month|week|year) ago\b/);
  if (haceArt) {
    const unit = haceArt[1];
    if (unit === "mes" || unit === "month") {
      const key = prevKey(c.key);
      return { kind: "month", key, label: L(c.lang, `hace un mes (${key})`, `a month ago (${key})`) };
    }
    if (unit === "semana" || unit === "week") {
      const anchor = new Date(`${c.today}T12:00:00`);
      anchor.setDate(anchor.getDate() - 7);
      const r = periodRange("week", anchor.toISOString().slice(0, 10), 1);
      return { kind: "range", ...r, label: L(c.lang, "hace una semana", "a week ago") };
    }
    const y = String(Number(c.key.slice(0, 4)) - 1);
    return { kind: "year", year: y, label: L(c.lang, "hace un año", "a year ago") };
  }
  const agoWords = folded.match(/\b(two|three|four|five|six|seven|eight|nine|ten|twelve) months? ago\b/);
  if (agoWords) {
    const n = WORD_NUM[agoWords[1]] || 0;
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
  // OLA 34 (Familia 5, Q34-5): EL AÑO PASADO TIENE SU PUERTA — la
  // rama del año oía «ano» dentro de «ano pasado» y servía ESTE
  // año con su etiqueta, en remesas y en historia: se preguntaba
  // por 2025 y se recibía 2026 sin una palabra. FRAME_PERIODS ya
  // listaba la frase (el marco creía que el eje existía) y ninguna
  // puerta la servía. La puerta va ANTES de la del año en curso y
  // sirve el año anterior con su nombre, en las dos lenguas y con
  // su forma hermana («año anterior», la que el desplazamiento del
  // §20 ya nombraba).
  if (/ano (pasado|anterior)|last year/.test(folded)) {
    const y = String(Number(c.key.slice(0, 4)) - 1);
    return { kind: "year", year: y, label: L(c.lang, "el año pasado", "last year") };
  }
  if (/\bano\b|este ano|this year/.test(folded)) {
    return { kind: "year", year: c.key.slice(0, 4), label: L(c.lang, "este año", "this year") };
  }
  // OLA 23 · LA QUINCENA — el período propio del mundo que cobra por
  // quincena: días 1–15 y 16–fin del mes (ciclo de CALENDARIO, no un
  // ciclo de 14 días — la investigación lo dejó claro). «Esta» es la
  // mitad en curso; «la pasada», la mitad anterior (que puede vivir
  // en el mes anterior); «primera/segunda», la mitad nombrada del mes
  // en curso. Nace como rango de fechas: la heredan todas las
  // familias que consumen periodOf (historia, conteo, frecuencia,
  // comparar). La fecha de una línea sin día anotado es la convención
  // del motor (lineDate la pone el día 1) y la quincena la hereda.
  // OLA 32 (Familia 1): LA PUERTA OYE LA FAMILIA ENTERA — la puerta
  // vieja solo oía las frases de cabecera (quincena/pay period/half
  // month), así que "first half"/"second half" jamás entraban a la
  // rama que ya sabía servirlas por dentro: la frase existía en el
  // vocabulario y era inalcanzable en la puerta. La puerta prueba
  // ahora la fuente única completa, y por dentro cada subfamilia
  // sigue decidiendo su mitad.
  if (periodHalfRe(PERIOD_HALF_ALL).test(folded)) {
    const y = Number(c.key.slice(0, 4));
    const m = Number(c.key.slice(5, 7));
    const dayN = Number(c.today.slice(8, 10));
    const daysIn = new Date(y, m, 0).getDate();
    const halfOf = (yy: number, mm: number, second: boolean) => {
      const di = new Date(yy, mm, 0).getDate();
      const base = `${yy}-${String(mm).padStart(2, "0")}`;
      return second
        ? { from: `${base}-16`, to: `${base}-${String(di).padStart(2, "0")}` }
        : { from: `${base}-01`, to: `${base}-15` };
    };
    const inSecond = dayN > 15;
    let range: { from: string; to: string };
    let lbl: string;
    if (periodHalfRe(PERIOD_HALF_PHRASES.first).test(folded)) {
      range = halfOf(y, m, false);
      lbl = L(c.lang, "la primera quincena (del 1 al 15)", "the first half (the 1st to the 15th)");
    } else if (periodHalfRe(PERIOD_HALF_PHRASES.second).test(folded)) {
      range = halfOf(y, m, true);
      lbl = L(c.lang, `la segunda quincena (del 16 al ${daysIn})`, `the second half (the 16th to the ${daysIn}th)`);
    } else if (periodHalfRe(PERIOD_HALF_PHRASES.last).test(folded)) {
      if (inSecond) range = halfOf(y, m, false);
      else { const pk = prevKey(c.key); range = halfOf(Number(pk.slice(0, 4)), Number(pk.slice(5, 7)), true); }
      lbl = L(c.lang, `la quincena pasada (del ${range.from.slice(8)} al ${range.to.slice(8)})`, `last pay period (${range.from} to ${range.to})`);
    } else {
      range = halfOf(y, m, inSecond);
      lbl = L(c.lang, `esta quincena (del ${range.from.slice(8)} al ${range.to.slice(8)})`, `this pay period (${range.from} to ${range.to})`);
    }
    return { kind: "range", ...range, label: lbl };
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
  if (/tiendas|stores?\b/.test(folded)) return { fn: (l) => l.kind === "purchase", desc: { kind: "tiendas", label: L(c.lang, "tiendas", "stores") } };
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
  /* OLA 51 (la Caza III) · LA COSTURA BILINGÜE: los nombres de la
   * estructura son pares canónicos (nameKey → es/en), pero las
   * líneas del usuario viven muchas veces como CONCEPTO libre
   * escrito en el idioma en que las anotó. Preguntar en inglés
   * «rent» casaba la palabra con el sub «Rent» y su filtro — solo
   * por subId — no tocaba la línea «Renta» sin sub: el candidato
   * exacto quedaba muerto y las familias medían sobre cero líneas
   * (el cero falso del promedio y de la historia). El ciudadano-sub
   * ahora también abraza las líneas cuyo concepto ES su nombre, en
   * cualquiera de los dos idiomas: en el libro de una persona, una
   * línea llamada «Renta» ES la renta, la lleve o no el sub puesto.
   * ADAPTACIÓN DE CANON: el abrazo vive en las tres puertas del
   * filtro de canon — filterDescOf, filterHitOf y filterFromDesc
   * (la que reconstruye el filtro de un marco guardado) — para que
   * el mismo filtro sea el mismo en la pregunta, en su marco y en
   * su seguimiento; la desc viaja intacta. */
  const otherNames = makeNamer(c.state.structure, c.lang === "es" ? "en" : "es");
  for (const cat of c.state.structure.categories) {
    consider(c.names.cat(cat.id), { fn: (l) => l.categoryId === cat.id, desc: { kind: "category", id: cat.id, label: c.names.cat(cat.id) } });
    for (const s of cat.subs) {
      const fHere = foldQ(c.names.sub(s.id)).trim();
      const fOther = foldQ(otherNames.sub(s.id)).trim();
      consider(c.names.sub(s.id), { fn: (l) => l.subId === s.id
        || (!!l.concept && (foldQ(l.concept).trim() === fHere || foldQ(l.concept).trim() === fOther)), desc: { kind: "sub", id: s.id, label: c.names.sub(s.id) } });
    }
  }
  for (const p of c.state.structure.purchases) consider(c.names.purchase(p.id), { fn: (l) => l.kind === "purchase" && l.categoryId === p.id, desc: { kind: "purchase-cat", id: p.id, label: c.names.purchase(p.id) } });
  for (const item of c.state.structure.catalog) consider(c.names.catalog(item.id), { fn: (l) => l.storeId === item.id, desc: { kind: "store", id: item.id, label: c.names.catalog(item.id) } });
  return best ? (best as { hit: FilterHit }).hit : null;
}

/** El predicado de un descriptor guardado en un marco (§20). */
function filterFromDesc(c: Ctx, d: AskFrameFilter): (l: Line) => boolean {
  switch (d.kind) {
    case "category": return (l) => l.categoryId === d.id;
    case "sub": {
      // OLA 51: el filtro reconstruido de un marco abraza igual que
      // el filtro vivo — el concepto que ES el nombre del sub, en
      // cualquiera de los dos idiomas, es del sub.
      const fHere = foldQ(c.names.sub(d.id)).trim();
      const fOther = foldQ(makeNamer(c.state.structure, c.lang === "es" ? "en" : "es").sub(d.id)).trim();
      return (l) => l.subId === d.id
        || (!!l.concept && (foldQ(l.concept).trim() === fHere || foldQ(l.concept).trim() === fOther));
    }
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
  if (/tiendas|stores?\b/.test(folded)) return { fn: (l) => l.kind === "purchase", desc: { kind: "tiendas", label: L(c.lang, "tiendas", "stores") } };
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
  // OLA 28 (Familia 4, G28-1): MANDA SOLO SI EL CIUDADANO VIVE. Un
  // patrón cuya subcategoría o categoría fue borrada en Estructura
  // no se limpia de askPatterns (nada lo barre), y su filtro vacío
  // afirmaba «$0.00» contra el gasto real que el escaneo de nombres
  // sí encontraba: el ciudadano muerto no afirma cero. Si murió, la
  // palabra cae al escaneo de nombres como cae la persona muerta de
  // remitPersonOf — la misma degradación honesta en las dos casas.
  const learned = aliasIn(c.learned, folded);
  if (learned && (learned.kind === "sub" || learned.kind === "cat")) {
    const alive = learned.kind === "sub"
      ? c.state.structure.categories.some((cat) => cat.subs.some((s) => s.id === learned.targetId))
      : c.state.structure.categories.some((cat) => cat.id === learned.targetId);
    if (alive) {
      return learned.kind === "sub"
        ? { fn: (l) => l.subId === learned.targetId, desc: null }
        : { fn: (l) => l.categoryId === learned.targetId, desc: null };
    }
  }
  const cands: { len: number; hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null } }[] = [];
  const citizens: { label: string; hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null } }[] = [];
  const consider = (label: string, hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null }) => {
    citizens.push({ label, hit });
    const f = foldQ(label).trim();
    // Palabra ENTERA, jamás subcadena: «gas» vive dentro de «gasté» y
    // casar por subcadena convierte cada pregunta de gasto en un filtro
    // de gas (la trampa cazada por el banco de esta rama, 2026-11-20).
    const whole = new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    if (f.length >= 3 && whole.test(folded)) cands.push({ len: f.length, hit });
  };
  // OLA 51: el ciudadano-sub abraza las líneas cuyo concepto ES su
  // nombre en cualquiera de los dos idiomas (la costura bilingüe,
  // escrita entera en filterDescOf).
  const otherNames = makeNamer(c.state.structure, c.lang === "es" ? "en" : "es");
  for (const cat of c.state.structure.categories) {
    consider(c.names.cat(cat.id), { fn: (l) => l.categoryId === cat.id, desc: { kind: "category", id: cat.id, label: c.names.cat(cat.id) } });
    for (const s of cat.subs) {
      const fHere = foldQ(c.names.sub(s.id)).trim();
      const fOther = foldQ(otherNames.sub(s.id)).trim();
      consider(c.names.sub(s.id), { fn: (l) => l.subId === s.id
        || (!!l.concept && (foldQ(l.concept).trim() === fHere || foldQ(l.concept).trim() === fOther)), desc: { kind: "sub", id: s.id, label: c.names.sub(s.id) } });
    }
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
  /* OLA 45 (D2) · EL OÍDO QUE DOBLA — la pasada de flexión, que
   * SOLO gana cuando la exacta no tiene ningún candidato VIVO (con
   * líneas): «seguros» encuentra a «Seguro del carro» por su
   * primera palabra flexionada; «regalos» a «Regalo». Y la pasada
   * débil solo devuelve ciudadanos VIVOS: una flexión es una
   * apuesta, y una apuesta sin líneas no puede tapar ni el puente
   * de sinónimos ni el nombrar la ausencia (la primera versión
   * dejaba que «Comidas» — una compra de la estructura sin una
   * sola línea — tapara a Alimentos y a la ausencia nombrada).
   * Sin prefijos («gas» jamás encuentra «gasolina»: la trampa de
   * la subcadena sigue muerta), sin palabras cortas (<4 letras no
   * doblan), y las cabezas genéricas (pago, cuenta, gasto…) no
   * abren nombre compuesto. Orden de mando: exacta viva > débil
   * viva > exacta sin líneas (la ausencia se sigue nombrando).
   * ADAPTACIÓN DE CANON: la pasada viaja sobre los ciudadanos de
   * filterHitOf y devuelve el hit entero — su desc (la cara del
   * marco §20) viaja con el filtro, como en la pasada exacta. */
  const weakLiveFilter = (): { fn: (l: Line) => boolean; desc: AskFrameFilter | null } | null => {
    const HEAD_STOP = new Set(["pago", "pagos", "cuenta", "cargo", "gasto", "gastos", "compra", "compras", "deuda", "deudas", "linea", "lineas"]);
    const flex = (t: string, w: string): boolean => t === w || t === `${w}s` || w === `${t}s` || t === `${w}es` || w === `${t}es`;
    const qTokens = folded.split(/[^a-z0-9]+/).filter(Boolean);
    const weak: { len: number; hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null } }[] = [];
    for (const cz of citizens) {
      const f = foldQ(cz.label).trim();
      const toks = f.split(/[^a-z0-9]+/).filter(Boolean);
      if (!toks.length) continue;
      let hit = false;
      if (toks.length === 1) {
        if (toks[0].length >= 4 && qTokens.some((t) => flex(t, toks[0]))) hit = true;
      } else {
        for (let i = 0; i + toks.length <= qTokens.length && !hit; i++) {
          if (toks.every((w, j) => flex(qTokens[i + j], w))) hit = true;
        }
        const head = toks[0];
        if (!hit && head.length >= 4 && !HEAD_STOP.has(head) && qTokens.some((t) => flex(t, head))) hit = true;
      }
      if (hit) weak.push({ len: f.length, hit: cz.hit });
    }
    const linesW = allLines(c);
    const liveW = weak.filter((x) => linesW.some((l) => l.active && x.hit.fn(l)));
    if (!liveW.length) return null;
    let bestW: { len: number; hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null } } | null = null;
    for (const x of liveW) if (!bestW || x.len > bestW.len) bestW = x;
    return bestW ? bestW.hit : null;
  };
  // OLA 38 · EL ARBITRAJE QUE MIRA EL LIBRO (integrada de la copia
  // del banco): un nombre de la estructura que ninguna línea del
  // libro lleva («Renta» como sub, cuando la renta vive como
  // concepto libre) NO puede tapar al ciudadano que sí tiene líneas
  // — el arbitraje viejo coronaba al primero de igual largo y el
  // filtro ganador no casaba con nada: la sensibilidad del
  // hipotético callaba y la guarda de la capacidad dejaba pasar la
  // premisa que reemplaza, que se contaba dos veces (la caza del
  // centro, 2026-11-22). Entre los candidatos que casan con alguna
  // línea activa manda el más largo; solo si ninguno casa se
  // conserva el arbitraje de siempre (la ausencia se sigue pudiendo
  // nombrar).
  const linesAll = allLines(c);
  const live = cands.filter((x) => linesAll.some((l) => l.active && x.hit.fn(l)));
  if (!live.length) {
    const weakHit = weakLiveFilter();
    if (weakHit) return weakHit;
  }
  const pool = live.length ? live : cands;
  let best: { len: number; hit: { fn: (l: Line) => boolean; desc: AskFrameFilter | null } } | null = null;
  for (const x of pool) if (!best || x.len > best.len) best = x;
  return best ? best.hit : null;
}

function filterOf(c: Ctx, folded: string): ((l: Line) => boolean) | null {
  return filterHitOf(c, folded)?.fn ?? null;
}

/* OLA 28 · EL CIUDADANO POR SU NOMBRE — el escaneo inverso de
 * filterOf para UN nombre hablado: devuelve el ciudadano (concepto,
 * sub, categoría, compra o tienda) cuyo rótulo abre el segmento, con
 * su filtro. Los conceptos mandan sobre las categorías a igual
 * rótulo: «la casa» hablada es primero la línea Casa que la partida
 * entera — y el veredicto nombra lo excluido con su cifra, así que
 * la lectura queda a la vista. */
function citizenByName(state: LedgerState, names: Namer, word: string, pool?: Line[]): { display: string; folded: string; fn: (l: Line) => boolean } | null {
  const seg = foldQ(word).trim();
  if (seg.length < 3) return null;
  const cands: Array<{ display: string; folded: string; fn: (l: Line) => boolean }> = [];
  for (const m of Object.values(state.months)) for (const l of m.lines) {
    if (l.concept) cands.push({ display: l.concept, folded: foldQ(l.concept), fn: (x) => x.concept === l.concept });
  }
  for (const cat of state.structure.categories) {
    for (const s of cat.subs) cands.push({ display: names.sub(s.id), folded: foldQ(names.sub(s.id)), fn: (x) => x.subId === s.id });
    cands.push({ display: names.cat(cat.id), folded: foldQ(names.cat(cat.id)), fn: (x) => x.categoryId === cat.id });
  }
  for (const p of state.structure.purchases) cands.push({ display: names.purchase(p.id), folded: foldQ(names.purchase(p.id)), fn: (x) => x.kind === "purchase" && x.categoryId === p.id });
  for (const item of state.structure.catalog) cands.push({ display: names.catalog(item.id), folded: foldQ(names.catalog(item.id)), fn: (x) => x.storeId === item.id });
  let best: { display: string; folded: string; fn: (l: Line) => boolean } | null = null;
  for (const cand of cands) {
    if (!cand.folded || cand.folded.length < 3) continue;
    if ((seg === cand.folded || seg.startsWith(`${cand.folded} `)) && (!best || cand.folded.length > best.folded.length)) best = cand;
  }
  // OLA 35 (C35-1 de Cambios): EL DESEMPATE CONTRA EL PERÍODO —
  // la precedencia de arriba (el concepto manda sobre la categoría
  // a igual rótulo) ata el ciudadano SIN mirar el período, y en
  // vivo ataba al concepto «Casa» que vive en OTROS meses: en el
  // mes preguntado su predicado no excluía ni un centavo (ahí la
  // casa vive como categoría, con sus $45 dentro), y la respuesta
  // servía el bruto nombrando «Sin contar «Casa» ($0.00)». Cuando
  // el llamante trae la alberca del período y el ganador no
  // excluye NADA en ella, un homónimo empatado que SÍ excluye en
  // el período gana el desempate: la precedencia sigue mandando
  // entre los ciudadanos que en el período existen; el que en el
  // período no es nadie no sombrea al que concentra su gasto. Sin
  // alberca, la vara es la de siempre, candidato por candidato.
  if (best && pool && pool.length && !pool.some((l) => best.fn(l))) {
    const tied = cands.filter((cand) => cand.folded === best.folded && cand !== best);
    const live = tied.find((cand) => pool.some((l) => cand.fn(l)));
    if (live) return live;
  }
  return best;
}
/** La exclusión hablada: «sin la casa», «sin el carro» — el segmento
 * tras «sin» resuelto a un ciudadano del libro. Sin ciudadano, no hay
 * exclusión (un «sin» suelto no excluye nada). */
function exclusionIn(state: LedgerState, names: Namer, folded: string, pool?: Line[]): { display: string; folded: string; fn: (l: Line) => boolean; strip: string } | null {
  const m = /\bsin (?:el |la |los |las |the )?([a-z0-9][a-z0-9 ]{2,})/.exec(folded);
  if (!m) return null;
  const hit = citizenByName(state, names, m[1], pool);
  if (!hit) return null;
  const at = m[0].indexOf(hit.folded);
  return { ...hit, strip: at >= 0 ? m[0].slice(0, at + hit.folded.length) : m[0] };
}

/** OLA 35 (Q35-1-Cara): EL OÍDO INGLÉS DE LA EXCLUSIÓN, SOLO EN LA
 * PUERTA FRESCA — «without the house» no lo oía ningún oído de la
 * casa (exclusionIn solo casa con «sin») y la pregunta fresca en
 * inglés servía el total ENTERO en silencio, con la cláusula sin
 * nombrar en ninguna parte: la especie de Q34-2 viviendo en inglés.
 * Este oído es el espejo de exclusionIn para la forma inglesa y lo
 * consume SOLO historiaAnswer (la puerta fresca): el seguimiento
 * en inglés queda como está (OBS-35-C1-Cara, no tocada) — el §20
 * sigue oyendo solo «sin». */
function exclusionWithoutIn(state: LedgerState, names: Namer, folded: string, pool?: Line[]): { display: string; folded: string; fn: (l: Line) => boolean; strip: string } | null {
  const m = /\bwithout (?:the )?([a-z0-9][a-z0-9 ]{2,})/.exec(folded);
  if (!m) return null;
  const hit = citizenByName(state, names, m[1], pool);
  if (!hit) return null;
  const at = m[0].indexOf(hit.folded);
  return { ...hit, strip: at >= 0 ? m[0].slice(0, at + hit.folded.length) : m[0] };
}

const STRAY_STOP = new Set(["mes", "ano", "semana", "dia", "dias", "total", "eso", "esto", "esta", "este", "promedio", "pasado", "pasada", "ultimo", "ultima", "general", "cuenta", "month", "year", "week", "day", "average", "last", "the", "una", "uno", "del", "las", "los", "que", "como", "cuando", "donde", "cual", "quien", "todo", "toda", "todos", "hace", "desde", "entre", "sobre", "para", "con", "sin", "por", "mis", "tus", "sus", "fue", "era", "son", "mas", "menos", "muy", "tan", "hoy", "ayer", "manana", "siempre", "nunca", "veces", "vez", "parte", "mitad", "doble", "resto", "otros", "otras", "otro", "otra", "cada", "mismo", "misma", "solo", "sola", "bien", "mal", "mejor", "peor", "antes", "despues", "ahora", "luego", "pronto", "tarde", "temprano", "casi", "mucho", "poco", "nada", "algo", "alguien", "nadie", "ningun", "ninguna", "cualquier", "cualquiera", "demas", "propio", "propia", "cierto", "cierta", "seguro", "segura", "posible", "favor", "gracias", "hola", "bueno", "buena", "buenos", "buenas", "dia", "primera", "segunda", "quincena", "quincenal"]);

/** OLA 12 — LA HONESTIDAD DEL FILTRO: la palabra que la pregunta pone
 * en forma de filtro («en comida», «de juguetes») y que no casa con
 * NINGÚN ciudadano del libro. Sin esta cerca, historia respondía el
 * gasto ENTERO disfrazado de respuesta al filtro — la mentira más
 * ordinaria de la batería del mundo. Con ella, el Asesor dice que no
 * tiene nada anotado con ese nombre: el silencio con nombre propio. */
function strayFilterWord(c: Ctx, folded: string, skip?: ReadonlySet<string>): string | null {
  const months = new Set(Object.keys(MONTH_NAMES));
  // OLA 26: «al» también presenta un filtro («fui al súper»), y el
  // llamador puede saltar los verbos de su propio marco («de gastar»
  // en el contrafactual no es el filtro: es el verbo de la pregunta).
  const re = /(?:^|\s)(?:en|de|on|in|al)\s+(?:el\s+|la\s+|los\s+|las\s+|the\s+)?([a-z]{3,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded)) !== null) {
    const w = m[1];
    if (!STRAY_STOP.has(w) && !months.has(w) && !(skip?.has(w))) return w;
  }
  return null;
}

/* OLA 47 (F5) · EL AÑO CONTRA EL AÑO — la comparación anual caía
 * a la historia de un solo año y su mitad comparativa se perdía
 * en silencio. La comparación justa es por el MISMO tramo: los
 * meses que este año lleva (de enero al mes en curso) contra los
 * mismos meses del año pasado — comparar el año corrido contra
 * el año entero, sin decirlo, sería una comparación coja. La
 * dirección la manda el verbo (gasté × gané); sin dirección, o
 * con las dos, no es esta forma. Sin segundo lado (del año
 * pasado no hay nada anotado en el tramo), la ausencia se
 * nombra y la cifra de este año se da igual. */
function anoContraAnoAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(comparad|contra el ano|versus|vs\.|que el ano pasado|than last year|compared (to|with)|ano contra ano|o el ano (pasado|anterior))/.test(folded)) return null;
  if (!/(este ano|ano pasado|this year|last year)/.test(folded)) return null;
  const income = /gane|gano|ganad|ingres|entro|entraron|earned|earn|came in/.test(folded);
  const spend = /gaste|gasto|gastad|gastar|gastando|spent|spend|salio|salieron/.test(folded);
  if (income === spend) return null;
  const Y = Number(c.today.slice(0, 4));
  const lastMonth = Number(c.today.slice(5, 7));
  const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = (c.lang === "es" ? MONTHS_ES : MONTHS_EN)[lastMonth - 1];
  const poolOf = (y: number): Line[] => {
    const out: Line[] = [];
    for (let m = 1; m <= lastMonth; m++) {
      const k = `${y}-${String(m).padStart(2, "0")}`;
      for (const l of c.state.months[k]?.lines ?? []) {
        if (!l.active) continue;
        if (income ? l.kind.startsWith("income") : isOut(l) && roleOf(c.state, l.categoryId) !== "savings") out.push(l);
      }
    }
    return out;
  };
  const curPool = poolOf(Y);
  const prevPool = poolOf(Y - 1);
  const cur = curPool.reduce((a, l) => a + view(c, l), 0);
  const prev = prevPool.reduce((a, l) => a + view(c, l), 0);
  const span = L(c.lang, `de enero a ${monthName}`, `from January to ${monthName}`);
  const verb = income ? L(c.lang, "ganaste", "you earned") : L(c.lang, "gastaste", "you spent");
  if (!prevPool.length) {
    return {
      kind: "answer", family: "historia",
      verdict: L(c.lang, `La comparación no tiene segundo lado: del año pasado no tienes nada anotado ${span}. Este año, en ese mismo tramo, ${verb} ${c.money(cur)}. Cuando el año pasado exista en tu libro, los dos lados se comparan solos.`, `The comparison has no second side: from last year you have nothing recorded ${span}. This year, over that same span, ${verb} ${c.money(cur)}. When last year exists in your book, the two sides compare on their own.`),
      pieces: [{ label: L(c.lang, `Este año (${span})`, `This year (${span})`), minor: cur }],
      note: null, source: ["libros.lineas", "historial.stream"], lines: curPool.length,
    };
  }
  const diff = cur - prev;
  const pctTxt = prev > 0 && diff !== 0 ? L(c.lang, ` (un ${Math.abs(Math.round((diff / prev) * 100))}% ${diff > 0 ? "más" : "menos"})`, ` (${Math.abs(Math.round((diff / prev) * 100))}% ${diff > 0 ? "more" : "less"})`) : "";
  const diffTxt = diff === 0
    ? L(c.lang, "van iguales", "they're level")
    : L(c.lang, `${c.money(Math.abs(diff))} ${diff > 0 ? "más" : "menos"} que el año pasado`, `${c.money(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than last year`);
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `Comparados por el mismo tramo — ${span}, los meses que este año lleva —: este año ${verb} ${c.money(cur)}; en los mismos meses del año pasado, ${c.money(prev)}: ${diffTxt}${pctTxt}.`, `Compared over the same span — ${span}, the months this year has run —: this year ${verb} ${c.money(cur)}; over the same months last year, ${c.money(prev)}: ${diffTxt}${pctTxt}.`),
    pieces: [{ label: L(c.lang, `Este año (${span})`, `This year (${span})`), minor: cur }, { label: L(c.lang, `El año pasado (${span})`, `Last year (${span})`), minor: prev }],
    note: L(c.lang, "Comparo tramo contra tramo, no el año corrido contra el año entero: lo que queda de este año todavía no pasa.", "I compare span against span, not the running year against the whole one: what's left of this year hasn't happened yet."),
    source: ["libros.lineas", "historial.stream"], lines: curPool.length + prevPool.length,
  };
}

function historiaAnswer(c: Ctx, folded: string): BankResult {
  const p = periodOf(c, folded);
  // OLA 28: la exclusión se lee ANTES que el filtro y se retira del
  // texto que el filtro escanea — «sin la casa» no es un filtro de
  // casa: es su contrario. El total sale sin ese ciudadano, y el
  // veredicto lo nombra con su cifra (la resta a la vista, A23-3).
  // OLA 12: la dirección INGRESO habla el idioma del mundo — «gané»,
  // «gano», «cobré», «mi salario» — no solo «entró/ingresó». Sin estas
  // palabras, «¿cuánto gano por día?» recibía el GASTO: la dirección
  // cruzada, peor que el silencio. (Se lee aquí, antes que la
  // exclusión, porque la alberca del desempate la necesita.)
  const income = /entr|ingres|recibi|gana|gano|gane|cobr|salario|sueldo|earned|came in|salary|wage/.test(folded);
  // OLA 35 (C35-1): la alberca del período y la dirección, sin
  // filtro — el desempate del ciudadano (citizenByName) la consulta
  // para no atar a un homónimo que en este período no excluye nada.
  const tiePool = allLines(c).filter((l) => inPeriod(c, l, p) && (income ? l.kind.startsWith("income") : isOut(l) && roleOf(c.state, l.categoryId) !== "savings"));
  const excl = exclusionIn(c.state, c.names, folded, tiePool)
    // OLA 35 (Q35-1-Cara): el oído inglés de la puerta fresca.
    ?? exclusionWithoutIn(c.state, c.names, folded, tiePool);
  // OLA 34 (Familia 2, Q34-2): LA EXCLUSIÓN FRESCA QUE NO RESUELVE
  // TAMBIÉN MUERE NOMBRADA — el seguimiento con «sin Juan»
  // irresoluble moría en la reparación honesta, pero la pregunta
  // FRESCA caía en silencio y servía el total ENTERO, con Juan
  // Pérez dentro, como si la cláusula no existiera: dos varas para
  // la misma exclusión. Si tras «sin» hay un segmento y ningún
  // ciudadano lo reclama, la puerta nombra su cabeza (hasta dos
  // piezas, cortadas por el vocabulario de período) y rehúsa el
  // total disfrazado — la misma honestidad del filtro perdido.
  // OLA 35: la muerte nombrada oye también la cláusula inglesa
  // («without X») — su silencio era la otra mitad de Q35-1-Cara.
  const exclDeath = (segment: string): BankResult | null => {
    const named: string[] = [];
    for (const t of segment.split(/\s+/).filter(Boolean)) {
      if (named.length && (REMIT_CLOSING_WORDS.has(t) || t === "y" || t === "and" || t === "o")) break;
      named.push(t);
      if (named.length === 2) break;
    }
    if (!named.length) return null;
    const word = named.join(" ");
    return {
      kind: "answer", family: "historia",
      verdict: L(c.lang, `Me pides el total sin «${word}», pero no tengo nada anotado con ese nombre: ninguna categoría, concepto ni tienda de tu libro se llama así, así que no te doy el total entero como si la exclusión no estuviera. Si lo anotas con otro nombre, pregúntame por ese.`, `You're asking for the total without "${word}", but I have nothing recorded under that name: no category, concept or store in your book is called that, so I won't hand you the whole total as if the exclusion weren't there. If you record it under another name, ask me by that one.`),
      pieces: [], note: null, source: ["libros.lineas"], lines: 0,
    };
  };
  if (!excl) {
    const exclM = /\bsin (?:el |la |los |las |the )?([a-z0-9][a-z0-9 ]{2,})/.exec(folded)
      ?? /\bwithout (?:the )?([a-z0-9][a-z0-9 ]{2,})/.exec(folded);
    if (exclM) {
      const death = exclDeath(exclM[1]);
      if (death) return death;
    }
  }
  // OLA 35 (Q35-1): LA SEGUNDA EXCLUSIÓN TAMBIÉN SE LEE — la
  // pregunta fresca con DOS cláusulas («sin el carro y sin la
  // renta») resolvía solo la primera y dejaba el resto en el texto
  // que el filtro escanea: filterHitOf oía al segundo ciudadano
  // como FILTRO y servía SOLO lo que se pidió excluir (la Renta
  // sola, «en eso»), con la resta de la primera calculada dentro
  // del charco invertido ($0.00 falso). Ahora TODAS las cláusulas
  // «sin X» se retiran antes del escaneo de filtro y se aplican:
  // cada una con su resta nombrada. Una segunda cláusula que no
  // resuelve muere nombrada, como la primera (Familia 2). La
  // ranura del marco guarda la primera — la vara del §20, que en
  // su propio camino aplica la primera y la nombra.
  const exclList: Array<{ display: string; folded: string; fn: (l: Line) => boolean }> = [];
  let foldedClean = folded;
  if (excl) {
    exclList.push(excl);
    foldedClean = folded.replace(excl.strip, " ");
    const second = exclusionIn(c.state, c.names, foldedClean, tiePool) ?? exclusionWithoutIn(c.state, c.names, foldedClean, tiePool);
    if (second) {
      // La cláusula se retira siempre del texto del filtro; el
      // ciudadano repetido no se aplica dos veces.
      foldedClean = foldedClean.replace(second.strip, " ");
      if (second.folded !== excl.folded) exclList.push(second);
    } else {
      const m2 = /\bsin (?:el |la |los |las |the )?([a-z0-9][a-z0-9 ]{2,})/.exec(foldedClean)
        ?? /\bwithout (?:the )?([a-z0-9][a-z0-9 ]{2,})/.exec(foldedClean);
      if (m2) {
        const death = exclDeath(m2[1]);
        if (death) return death;
      }
    }
  }
  const hit = filterHitOf(c, foldedClean);
  const filter = hit?.fn ?? null;
  if (!filter && !income) {
    const stray = strayFilterWord(c, foldedClean);
    if (stray) {
      return {
        kind: "answer", family: "historia",
        verdict: L(c.lang, `No tengo nada anotado como «${stray}»: ninguna categoría, concepto ni tienda de tu libro lleva ese nombre, así que no te doy el gasto entero disfrazado de respuesta. Si lo anotas con otro nombre, pregúntame por ese.`, `I have nothing recorded as "${stray}": no category, concept or store in your book carries that name, so I won't hand you your whole spend dressed up as the answer. If you record it under another name, ask me by that one.`),
        pieces: [], note: null, source: ["libros.lineas"], lines: 0,
      };
    }
  }
  const poolAll = allLines(c).filter((l) => inPeriod(c, l, p) && (income ? l.kind.startsWith("income") : isOut(l) && roleOf(c.state, l.categoryId) !== "savings") && (!filter || filter(l)));
  const exclSums = exclList.map((e) => poolAll.filter((l) => e.fn(l)).reduce((a, l) => a + view(c, l), 0));
  const pool = exclList.length ? poolAll.filter((l) => !exclList.some((e) => e.fn(l))) : poolAll;
  const total = pool.reduce((a, l) => a + view(c, l), 0);
  const exclText = exclList.map((e, i) => L(c.lang, ` Sin contar «${e.display}» (${c.money(exclSums[i])}).`, ` Not counting "${e.display}" (${c.money(exclSums[i])}).`)).join("");
  return {
    kind: "answer", family: "historia",
    verdict: income
      // OLA 26 (U4): la frase concuerda — «de 1 línea», no «de 1 líneas».
      ? L(c.lang, `En ${p.label} entraron ${c.money(total)}${filter ? " por ese filtro" : ""} — de ${pool.length} línea${pool.length === 1 ? "" : "s"}.${exclText}`, `${c.money(total)} came in ${p.label}${filter ? " under that filter" : ""} — from ${pool.length} line${pool.length === 1 ? "" : "s"}.${exclText}`)
      : L(c.lang, `En ${p.label} gastaste ${c.money(total)}${filter ? " en eso" : ""} — de ${pool.length} línea${pool.length === 1 ? "" : "s"}.${exclText}`, `In ${p.label} you spent ${c.money(total)}${filter ? " on that" : ""} — from ${pool.length} line${pool.length === 1 ? "" : "s"}.${exclText}`),
    pieces: [{ label: p.label, minor: total }, ...exclList.map((e, i) => ({ label: L(c.lang, `Fuera de la cuenta: ${e.display}`, `Left out: ${e.display}`), minor: -exclSums[i] }))],
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
    // OLA 34 (Familia 1): el marco nace CON su exclusión — la
    // respuesta fresca la aplicó y la nombró; si el marco no la
    // guarda, el seguimiento la pierde en silencio (el total bruto
    // del desplazamiento) o la lee al revés (el estrechamiento).
    ...(!hit || hit.desc ? { frame: { kind: "period1", period: p, income, filter: hit?.desc ?? null, total, exclusion: exclList[0] ? { folded: exclList[0].folded, display: exclList[0].display } : null } as AskFrame } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* LA SUMA POR PERSONA (Ola 27, Familia 5, Q27-3): «¿cuánto le mandé */
/* a X?» — la pregunta canónica que la propia familia aprendizaje     */
/* declara — no la servía ningún camino: ni el patrón de remesas (que */
/* exige la palabra «remesa» y entrega el agregado) ni recencia (que  */
/* entrega una línea). Se sirve aquí, por su camino, con el alias     */
/* aprendido y con el nombre verdadero (remitPersonOf), con las       */
/* cifras vivas de remitByPerson y en los TRES modos: no es el        */
/* patrón por persona de Completo, es la suma de los envíos de la     */
/* persona a SU persona — preguntar básico sobre lo propio (la vara   */
/* de A23-4), como la recencia de remesas, que tampoco conoce piso.   */
/* Alcance dicho en la pregunta: «este año» / «este mes» acotan; sin  */
/* alcance, el total de siempre con el año y el mes al lado. Una      */
/* persona nombrada que no se resuelve recibe la negativa nombrada    */
/* (remitUnknownPerson); una que existe y no ha recibido nada, la     */
/* contradicción declarada del banco: «no hay envíos a esa persona».  */
/* Sin persona nombrada devuelve null: el patrón (paso 8) sirve.      */
/* ------------------------------------------------------------------ */
function remesaPersonaAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(cuanto|how much)/.test(folded)) return null;
  if (!/(mande|envie|enviado|enviando|remesa|remittance|sent|send)/.test(folded)) return null;
  // OLA 34 (enmienda de canon): la voz del COSTO («¿cuánto me cuesta
  // la remesa a Mamá?») no es la suma por persona — es la remesa
  // descompuesta, que vive en remesasAnswer (el paso 8 ya oye
  // «cuesta» en su puerta). En la copia ambas viven en la misma
  // función y la descompuesta se juzga primero; en canon la suma
  // por persona es servidora aparte y se la tragaba.
  if (/(cuesta|cuestan|costo|margen|comision|fee|cost|margin|what arrives|cuanto llega|cuanto le llega)/.test(folded)) return null;
  // OLA 35 (Q35-5): LA COMPARACIÓN DE AÑOS NO ES UNA PERSONA — con
  // «comparado» en la frase, la caminata no consume el vocabulario
  // comparativo y declaraba la puntería ambigua: la pregunta moría
  // con la razón equivocada («entre el verbo y el nombre hay
  // palabras que no reconozco») donde había una comparación de
  // períodos. Esta familia cede el turno: la suma del período
  // (7c) sirve el lado pedido con su nombre verdadero.
  if (/(comparad|compared|contra|versus|vs\.)/.test(folded) && /(este ano|this year)/.test(folded) && /(ano pasado|ano anterior|last year)/.test(folded)) return null;
  const person = remitPersonOf(c, folded);
  if (!person) {
    const aim = remitPersonAimOf(folded);
    if (aim.word) return remitUnknownPerson(c, aim.word, "remesas");
    if (aim.ambiguous) return remitUnclearPerson(c, "remesas");
    return null;
  }
  // OLA 30 (Familia 2, Q30-2): persona Y período — si la pregunta trae
  // un período que no es el año ni el mes en curso (esos los acotan
  // las filas de remitByPerson, abajo), la persona manda CON SU
  // período: sus envíos dentro del período, sumados de las líneas
  // vivas. Sin envíos suyos en ese período, la contradicción se dice
  // acotada al período — no se rellena con su total de siempre.
  if ((REMIT_PERIOD_MARKER.test(folded) || periodHalfRe(PERIOD_HALF_ALL).test(folded)) && !/este ano|this year|este mes|this month/.test(folded)) {
    const p = periodOf(c, folded);
    const mine = allLines(c).filter((l) => roleOf(c.state, l.categoryId) === "remittance" && inPeriod(c, l, p) && (recipientName(c.state, l) === person.name || l.to === person.id));
    const total = mine.reduce((a, l) => a + view(c, l), 0);
    if (!mine.length) {
      // OLA 26 (U8, el contrato): el período vacío dice su cero CON el
      // total al lado — el cero a secas dejaba al usuario sin la cifra
      // que sí existe. (La fila se lee aquí; abajo se reusa.)
      const rowEarly = remitByPerson(c.state, c.key).rows.find((r) => r.id === person.id);
      const totalAll = rowEarly ? (c.display === "USD" ? rowEarly.all.usd : rowEarly.all.nio) : 0;
      return {
        kind: "answer", family: "remesas",
        verdict: L(c.lang, `No hay envíos a ${person.name} anotados en ${p.label}: en tu libro no hay ni una remesa suya en ese período.${totalAll > 0 ? ` En total le van ${c.money(totalAll)}.` : ""}`, `No sends to ${person.name} are recorded in ${p.label}: your book doesn't hold a single remittance of theirs in that period.${totalAll > 0 ? ` The all-time total stands at ${c.money(totalAll)}.` : ""}`),
        pieces: [], note: null, source: ["remesas.personas"], lines: 0,
      };
    }
    return {
      kind: "answer", family: "remesas",
      verdict: L(c.lang, `A ${person.name} le has mandado ${c.money(total)} en ${p.label}: ${mine.length} envío${mine.length === 1 ? "" : "s"}.`, `You've sent ${person.name} ${c.money(total)} in ${p.label}: ${mine.length} send${mine.length === 1 ? "" : "s"}.`),
      pieces: [{ label: person.name, minor: total }], note: null, source: ["remesas.personas"], lines: mine.length,
    };
  }
  const { rows } = remitByPerson(c.state, c.key);
  const row = rows.find((r) => r.id === person.id);
  const disp = (p: { usd: number; nio: number }) => (c.display === "USD" ? p.usd : p.nio);
  if (!row || row.count === 0) {
    return {
      kind: "answer", family: "remesas",
      verdict: L(c.lang, `No hay envíos a ${person.name} anotados: en tu libro no hay ni una remesa con su nombre.`, `No sends to ${person.name} are recorded: your book doesn't hold a single remittance under their name.`),
      pieces: [], note: null, source: ["remesas.personas"], lines: 0,
    };
  }
  const scope = /este ano|this year/.test(folded) ? "year" : /este mes|this month/.test(folded) ? "month" : "all";
  const pair = scope === "year" ? row.year : scope === "month" ? row.month : row.all;
  const scopeWord = scope === "year" ? L(c.lang, "este año", "this year") : scope === "month" ? L(c.lang, "este mes", "this month") : L(c.lang, "en total", "in total");
  // OLA 26 (U8): el alcance también dice su CUENTA de envíos, como el
  // total la dice — y la fecha del último se dice en palabras (U6).
  const histP = remitHistory(c.state, person.id);
  const scopeCount = scope === "year" ? histP.filter((h) => h.monthKey.startsWith(c.key.slice(0, 4))).length : scope === "month" ? histP.filter((h) => h.monthKey === c.key).length : row.count;
  return {
    kind: "answer", family: "remesas",
    verdict: scope === "all"
      ? L(c.lang, `A ${person.name} le has mandado ${c.money(disp(pair))} en total: ${row.count} envío${row.count === 1 ? "" : "s"} anotados, el último el ${row.last ? fmtFecha(c, row.last) : "—"}.`, `You've sent ${person.name} ${c.money(disp(pair))} in total: ${row.count} recorded send${row.count === 1 ? "" : "s"}, the last on ${row.last ? fmtFecha(c, row.last) : "—"}.`)
      : L(c.lang, `A ${person.name} le has mandado ${c.money(disp(pair))} ${scopeWord} (${scopeCount} envío${scopeCount === 1 ? "" : "s"}). Su último envío fue el ${row.last ? fmtFecha(c, row.last) : "—"}.`, `You've sent ${person.name} ${c.money(disp(pair))} ${scopeWord} (${scopeCount} send${scopeCount === 1 ? "" : "s"}). Their last send was on ${row.last ? fmtFecha(c, row.last) : "—"}.`),
    pieces: [{ label: person.name, minor: disp(pair) }],
    note: scope === "all" ? L(c.lang, `Este año van ${c.money(disp(row.year))} y este mes ${c.money(disp(row.month))}.`, `This year it's ${c.money(disp(row.year))} and this month ${c.money(disp(row.month))}.`) : null,
    source: ["remesas.personas"], lines: row.count,
  };
}

/* ------------------------------------------------------------------ */
/* LA SUMA DEL PERÍODO (Ola 30, Familia 2, Q30-2): «¿cuánto mandé    */
/* esta semana?» no la servía NINGÚN camino — la suma por persona     */
/* exigía persona y el patrón entregaba el agregado de siempre        */
/* declarando «en total», así que el período quedaba sin servidor y   */
/* la pregunta moría en unknown o recibía la cifra de otro tiempo.    */
/* Nace la familia remesas-periodo: las líneas de remesa del período  */
/* nombrado, sumadas vivas, con el período por su nombre. El          */
/* marcador exige el período EXPLÍCITO: sin marcador no es esta       */
/* familia (sirve el patrón, como siempre). Con persona nombrada      */
/* manda la suma por persona con su período (paso 7b, arriba). Con    */
/* verbo de gasto («¿cuánto gasté en remesas…?») es historia: su      */
/* puerta va primero en la cascada y esta familia solo oye los verbos */
/* de envío. Se sirve en los TRES modos: preguntar por los propios    */
/* envíos es básico (la vara de A23-4), como la recencia y la suma    */
/* por persona, que tampoco conocen piso. El período vacío se         */
/* responde como ausencia — jamás rellenado con el total de siempre.  */
/* ------------------------------------------------------------------ */
const REMIT_PERIOD_MARKER = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december|hace (\d+|dos|tres|cuatro|cinco|seis|ocho|doce)|months? ago|mes pasado|el ultimo mes|last month|semana pasada|last week|semana|week|este mes|this month|este ano|this year|last year|\bano\b|quincena|pay period|half month|hace (?:un|una) (?:mes|semana|ano)|(?:a|one) (?:month|week|year)s? ago)/;
function remesaPeriodoAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(cuanto|how much)/.test(folded)) return null;
  if (!/(mande|envie|enviado|enviando|sent|send)/.test(folded)) return null;
  // OLA 32 (Familia 1): el marcador oye también la familia entera de
  // la quincena desde la fuente única — su oído viejo (quincena /
  // pay period / half month) dejaba "first half" y "second half"
  // fuera de la familia aunque periodOf ya supiera servirlas.
  if (!REMIT_PERIOD_MARKER.test(folded) && !periodHalfRe(PERIOD_HALF_ALL).test(folded)) return null;
  // OLA 31 (Familia 1, Q31-1 del Asesor): LA PERSONA NOMBRADA MANDA
  // SOBRE EL PERÍODO PRESENTE — esta familia sirve la suma del
  // período solo cuando nadie fue nombrado. Si el escaneo resuelve
  // una persona, su suma con su período es del paso 7b (que corre
  // antes) y esta familia calla; si la caminata nombró una candidata
  // o declaró la puntería ambigua, la negativa o el silencio con
  // palabras ya nacieron en 7b y el período no los viste de suma
  // global. Y la costura que la caminata no puede ver — el nombre
  // comido como apertor (remitConsumedName) — recibe el silencio
  // honesto: «¿cuánto le mandé a Al en el mes pasado?», con «Al»
  // fuera del libro, recibía los $280 de todos como si nadie
  // hubiera sido nombrado: la degradación silenciosa misma, con la
  // ropa de la familia nueva. La persona manda; el período espera.
  if (remitPersonOf(c, folded)) return null;
  const aim = remitPersonAimOf(folded);
  // OLA 35 (Q35-5): con la comparación de años en la frase, la
  // puntería «ambigua» de la caminata es el vocabulario
  // comparativo, no un nombre — el veto no corre y la familia
  // sirve el lado que periodOf nombra (el año pasado).
  if ((aim.word || aim.ambiguous) && !/(comparad|compared|contra|versus|vs\.)/.test(folded)) return null;
  if (remitConsumedName(folded)) return remitUnclearPerson(c, "remesas");
  // OLA 33 (Familia 3, Q33-3): EL MODIFICADOR SIN PUERTA MANDA
  // SOBRE LA QUINCENA NOMBRADA — «la próxima quincena», «la 1ra
  // quincena»: la caminata ya no acusa al modificador (es
  // vocabulario de período en su compañía), pero periodOf leería
  // la cabecera y serviría la quincena EN CURSO con su etiqueta,
  // que no es la que el usuario nombró. La familia calla y la
  // pregunta muere en el silencio honesto de la cascada (el
  // unknown), como los nombres de período sin puerta del grado B
  // — sin acusación y sin cifra de otro tiempo disfrazada.
  if (remitHalfModifierUnserved(folded)) return null;
  const p = periodOf(c, folded);
  const pool = allLines(c).filter((l) => roleOf(c.state, l.categoryId) === "remittance" && inPeriod(c, l, p));
  const total = pool.reduce((a, l) => a + view(c, l), 0);
  const cap = p.label.charAt(0).toUpperCase() + p.label.slice(1);
  if (!pool.length) {
    return {
      kind: "answer", family: "remesas-periodo",
      verdict: L(c.lang, `${cap} no mandaste remesas: no hay ni un envío anotado en ese período.`, `${cap} you sent no remittances: not a single send is recorded in that period.`),
      pieces: [], note: null, source: ["remesas.personas"], lines: 0,
    };
  }
  return {
    kind: "answer", family: "remesas-periodo",
    verdict: L(c.lang, `${cap} mandaste ${c.money(total)} en remesas: ${pool.length} envío${pool.length === 1 ? "" : "s"}.`, `${cap} you sent ${c.money(total)} in remittances: ${pool.length} send${pool.length === 1 ? "" : "s"}.`),
    pieces: [{ label: L(c.lang, "Remesas", "Remittances"), minor: total }],
    note: null, source: ["remesas.personas"], lines: pool.length,
  };
}

/* ------------------------------------------------------------------ */
/* REMESAS — el patrón: a quién, cuánto y con qué frecuencia.         */
/* ------------------------------------------------------------------ */
/* OLA 67 · EL PUENTE DE PARENTESCO: la persona del libro se llama
 * «Mamá» y la pregunta en inglés dice «Mom» — el nombre no calza y
 * la persona se perdía entera (la remesa y la recencia en inglés
 * callaban con el libro lleno). El parentesco cercano tiene su
 * puente fijo en los dos idiomas; no es una traducción libre: es
 * la lista corta de la familia, y solo resuelve cuando el nombre
 * del libro ES la palabra del puente. */
const KIN_BRIDGE: Record<string, string[]> = {
  mama: ["mom", "mother"], madre: ["mom", "mother"],
  papa: ["dad", "father"], padre: ["dad", "father"],
  abuela: ["grandma", "grandmother"], abuelo: ["grandpa", "grandfather"],
  tia: ["aunt"], tio: ["uncle"],
  hermana: ["sister"], hermano: ["brother"],
  hija: ["daughter"], hijo: ["son"],
  esposa: ["wife"], esposo: ["husband"],
};
function personNamedIn(folded: string, name: string): boolean {
  const f = foldQ(name).trim();
  if (f.length >= 3 && new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded)) return true;
  const alts = KIN_BRIDGE[f];
  if (alts && alts.some((a) => new RegExp(`(^|[^a-z0-9])${a}([^a-z0-9]|$)`).test(folded))) return true;
  /* OLA 67 · EL NOMBRE TAMBIÉN AGUANTA SU ERRATA: la reparación
   * global no puede tocar «Caros» (es una palabra de puerta: el
   * plural de «caro»), pero el nombre del libro sí puede casar a
   * una deformación honesta de distancia — aquí, en el punto de
   * uso, donde el universo de nombres es chico y cerrado. Solo
   * nombres de 4+ letras y palabras de 4+: «Caros» encuentra a
   * Carlos; «Ana» jamás se deforma. */
  if (f.length >= 4) {
    const targets = [f, ...(alts ?? [])];
    for (const tok of folded.split(/[^a-z0-9]+/)) {
      if (tok.length < 4) continue;
      for (const t of targets) {
        if (t.length >= 4 && (phonFold(tok) === phonFold(t) || oneDropAway(tok, t) || oneSwapAway(tok, t) || oneDropAway(phonFold(tok), phonFold(t)) || oneSwapAway(phonFold(tok), phonFold(t)))) return true;
      }
    }
  }
  return false;
}


function remesasAnswer(c: Ctx, folded = ""): BankResult {
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
  // OLA 34 · LA REMESA DESCOMPUESTA: lo que el libro SÍ trae es lo
  // enviado y la tasa anotada del usuario; lo que NO trae es lo que
  // llegó ni la tasa que aplicó el corredor — así que la respuesta
  // da la equivalencia a SU tasa y nombra el dato que falta para el
  // margen exacto. Los promedios de corredor están prohibidos en el
  // veredicto: la única vara es la tasa del usuario.
  if (folded && /(cuesta|cuestan|costo|margen|se pierde|pierdo|comision|cuanto llega|cuanto le llega|fee|cost|margin|what arrives)/.test(folded)) {
    const namedRow2 = rows.find((r) => {
      if (!r.person) return false;
      const f = foldQ(r.person.name).trim();
      return f.length >= 3 && new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded);
    });
    const useRows = namedRow2 ? [namedRow2] : withMoney;
    const entries = useRows.flatMap((r) => remitHistory(c.state, r.id));
    const sentUsd = entries.reduce((a, e) => a + e.usd, 0);
    const who = namedRow2?.person ? L(c.lang, `a ${namedRow2.person.name}`, `to ${namedRow2.person.name}`) : L(c.lang, "en tus remesas", "in your remittances");
    if (!entries.length || sentUsd <= 0 || !(c.rateE4 > 0)) {
      return {
        kind: "answer", family: "remesas",
        verdict: L(c.lang, "Para descomponer lo que cuesta una remesa me faltan dos cosas en tu libro: envíos anotados y tu tasa de cambio anotada en Ajustes. Sin tu tasa no hay vara, y no uso el promedio de ningún corredor.", "To break down what a remittance costs I need two things in your book: recorded sends and your exchange rate recorded in Settings. Without your rate there's no yardstick, and I don't use any corridor's average."),
        pieces: [], note: null, source: ["remesas.personas", "cambio.mesa"], lines: 0,
      };
    }
    const equivNio = convertMinor(sentUsd, "USD", "NIO", c.rateE4);
    const refTxt = `C$${(c.rateE4 / 10000).toFixed(2)}`;
    const sentDisp = convertMinor(sentUsd, "USD", c.display, c.rateE4);
    return {
      kind: "answer", family: "remesas",
      verdict: L(c.lang, `En ${entries.length} envío${entries.length === 1 ? "" : "s"} ${who} salieron ${c.money(sentDisp)}. A TU tasa anotada (${refTxt} por dólar) eso equivale a ${formatMoney(equivNio, "NIO", c.lang)}: esa es la cuenta que tu libro sí puede hacer. Lo que el camino se quedó — la cuota y el diferencial del corredor — NO está en tu libro: no anotas lo que llegó ni la tasa que te aplicaron, y sin ese dato el margen exacto no existe; no lo relleno con promedios de corredor.`, `Across ${entries.length} send${entries.length === 1 ? "" : "s"} ${who}, ${c.money(sentDisp)} went out. At YOUR recorded rate (${refTxt} per dollar) that's ${formatMoney(equivNio, "NIO", c.lang)}: that's the math your book can do. What the road kept — the fee and the corridor's spread — is NOT in your book: you don't record what arrived or the rate you were given, and without that the exact margin doesn't exist; I don't fill it with corridor averages.`),
      pieces: [
        { label: L(c.lang, "Lo enviado", "Sent"), minor: sentDisp },
      ],
      note: L(c.lang, "Si anotaras por envío lo que llegó (o la tasa aplicada), la descomposición saldría exacta de tu libro: salieron tanto, llegaron tanto, el camino se quedó con la diferencia y su porcentaje.", "If you recorded per send what arrived (or the applied rate), the breakdown would come out exact from your book: this much left, this much arrived, the road kept the difference and its percentage."),
      source: ["remesas.personas", "cambio.mesa"], lines: entries.length,
    };
  }
  // OLA 26 (U8): la pregunta persona × período — «¿cuánto he enviado
  // a mamá este año?» — no es el patrón: es la suma de ESA persona en
  // ESE período, con el total de contexto. Su propia canónica moría
  // en silencio porque la puerta pedía la palabra «remesa» y la
  // familia solo sabía contar el patrón. El período sin nombrar es el
  // total; el período vacío dice su cero con el total al lado.
  if (folded && /(cuanto|how much)/.test(folded) && !/(patron|ritmo|cuando|a quien|frecuencia|pattern|pace|when|who)/.test(folded)) {
    const namedRow = rows.find((r) => {
      if (!r.person) return false;
      const f = foldQ(r.person.name).trim();
      return f.length >= 3 && new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded);
    });
    if (namedRow?.person) {
      const name = namedRow.person.name;
      const p = periodOf(c, folded);
      const explicit = /(ano|year|mes|month|semana|week|quincena|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december|hace|ago|pasado|pasada|ultimo|ultima|last)/.test(folded);
      const pairOf = (pair: { usd: number; nio: number }) => (c.display === "USD" ? pair.usd : pair.nio);
      const hist = remitHistory(c.state, namedRow.id);
      const sumHist = (hs: typeof hist) => hs.reduce((a, h) => a + (c.display === "USD" ? h.usd : h.nio), 0);
      let sum = 0;
      let count = 0;
      if (!explicit) { sum = pairOf(namedRow.all); count = namedRow.count; }
      else if (p.kind === "year") {
        const hs = hist.filter((h) => h.monthKey.startsWith(p.year));
        sum = p.year === c.key.slice(0, 4) ? pairOf(namedRow.year) : sumHist(hs);
        count = hs.length;
      } else if (p.kind === "month") {
        const hs = hist.filter((h) => h.monthKey === p.key);
        sum = p.key === c.key ? pairOf(namedRow.month) : sumHist(hs);
        count = hs.length;
      } else {
        const hs = hist.filter((h) => h.date >= p.from && h.date <= p.to);
        sum = sumHist(hs);
        count = hs.length;
      }
      const totalAll = pairOf(namedRow.all);
      const envios = count === 1 ? L(c.lang, "1 envío", "1 send") : L(c.lang, `${count} envíos`, `${count} sends`);
      return {
        kind: "answer", family: "remesas",
        verdict: !explicit
          ? L(c.lang, `A ${name} le has enviado ${c.money(totalAll)} en total (${envios})${namedRow.last ? ` — el último fue el ${fmtFecha(c, namedRow.last)}` : ""}.`, `You've sent ${name} ${c.money(totalAll)} in total (${envios})${namedRow.last ? ` — the last one was on ${fmtFecha(c, namedRow.last)}` : ""}.`)
          : sum > 0
            ? L(c.lang, `En ${p.label} le has enviado a ${name} ${c.money(sum)} (${envios}).`, `In ${p.label} you've sent ${name} ${c.money(sum)} (${envios}).`)
            : L(c.lang, `En ${p.label} no le has enviado nada a ${name} — en total le van ${c.money(totalAll)}.`, `In ${p.label} you haven't sent ${name} anything — the all-time total stands at ${c.money(totalAll)}.`),
        pieces: [{ label: name, minor: explicit ? sum : totalAll }],
        note: explicit && totalAll !== sum ? L(c.lang, `En total, a ${name} le has enviado ${c.money(totalAll)}.`, `In total, you've sent ${name} ${c.money(totalAll)}.`) : null,
        source: ["remesas.personas", "asesor.lectura"], lines: count,
        actions: reportDoor(c, "remesas.personas", "Verlo en Remesas", "See it in Remittances"),
      };
    }
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
  if (/(gaste|gastando|gasto|gastar|gastos|gastado) (mucho|poco|demasiado)|he gastado (mucho|de mas)|es mucho lo que (gasto|gaste)|spend (a lot|too much)|spending (a lot|too much)|have i spent (a lot|too much)|did i spend (a lot|too much)|spent (a lot|too much)/.test(folded)) {
    const now = summarize(c.state, c.key, c.lang);
    const before = summarize(c.state, prevKey(c.key), c.lang);
    const pct = now.income > 0 ? Math.round((now.spend / now.income) * 100) : null;
    /* OLA 43: la tercera medida — el mes típico del propio usuario.
     * A mitad de mes, el gasto corrido se PROYECTA al mes entero y
     * se compara contra su mediana: el juicio es contra su vara,
     * no contra un adjetivo. */
    const keysJ = Object.keys(c.state.months).filter((k) => k <= c.key).sort();
    let typicalTxt = "";
    const piecesJ: Array<{ label: string; minor: number }> = [
      { label: L(c.lang, "Este mes", "This month"), minor: now.spend },
      { label: L(c.lang, "Mes pasado", "Last month"), minor: before.spend },
    ];
    if (keysJ.length >= 2) {
      const outs = keysJ.map((k) => (c.state.months[k]?.lines ?? []).filter((l) => l.active && isOut(l) && roleOf(c.state, l.categoryId) !== "savings").reduce((a, l) => a + view(c, l), 0)).sort((a, b) => a - b);
      const typical = outs[Math.floor((outs.length - 1) / 2)];
      const dayN = Number(c.today.slice(8, 10));
      const daysIn = new Date(Number(c.key.slice(0, 4)), Number(c.key.slice(5, 7)), 0).getDate();
      const projected = dayN > 0 ? Math.round((now.spend / dayN) * daysIn) : now.spend;
      const gap = projected - typical;
      typicalTxt = L(c.lang, ` Y contra tu propia vara: tu mes típico de gasto es ${c.money(typical)}; a día ${dayN} vas en ${c.money(now.spend)}, que a este ritmo cierra el mes en unos ${c.money(projected)} — ${gap === 0 ? "justo en tu típico" : gap > 0 ? `${c.money(gap)} por encima de tu típico` : `${c.money(-gap)} por debajo de tu típico`}.`, ` And against your own yardstick: your typical spending month is ${c.money(typical)}; on day ${dayN} you're at ${c.money(now.spend)}, which at this pace closes the month at about ${c.money(projected)} — ${gap === 0 ? "right at your typical" : gap > 0 ? `${c.money(gap)} above your typical` : `${c.money(-gap)} below your typical`}.`);
      piecesJ.push({ label: L(c.lang, "Tu mes típico", "Your typical month"), minor: typical });
    }
    return {
      kind: "answer", family: "comparar",
      verdict: L(c.lang, `Este mes has gastado ${c.money(now.spend)}${pct !== null ? ` — el ${pct}% de los ${c.money(now.income)} que entraron` : ""}. El mes pasado gastaste ${c.money(before.spend)}: ${now.spend === before.spend ? "van parejos" : now.spend > before.spend ? `${c.money(now.spend - before.spend)} más` : `${c.money(before.spend - now.spend)} menos`}.${typicalTxt} Si es mucho o poco, con esas medidas lo juzgas tú: yo no te vendo un adjetivo.`, `This month you've spent ${c.money(now.spend)}${pct !== null ? ` — ${pct}% of the ${c.money(now.income)} that came in` : ""}. Last month you spent ${c.money(before.spend)}: ${now.spend === before.spend ? "they're tied" : now.spend > before.spend ? `${c.money(now.spend - before.spend)} more` : `${c.money(before.spend - now.spend)} less`}.${typicalTxt} Whether that's a lot or a little, with those measures you judge it: I won't sell you an adjective.`),
      pieces: piecesJ,
      note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
      figure: {
        kind: "lado",
        points: piecesJ.map((p) => ({ label: p.label, minor: p.minor })),
        note: null,
      },
    };
  }
  // OLA 12b — DOS FILTROS, UN FILTRO CONTRA SU PASADO, EL MEJOR MES.
  {
    const halves = folded.split(/ o | or /);
    // OLA 28 (Familia 2, E28-2): el verbo de las dos mitades también
    // es «se fue» / «went» / «go» — «¿en qué se fue más, en comida o
    // en transporte?» y «Where did more go, food or transport?» no
    // traen gast/spend y la rama moría antes de mirar las mitades.
    if (halves.length === 2 && /(gast|spend|compr|pago|se fue|se me fue|went|\bgo\b)/.test(folded)) {
      const f1 = filterOf(c, halves[0]);
      const f2 = filterOf(c, halves[1]);
      const t = (f: ((l: Line) => boolean) | null) => f ? allLines(c).filter((l) => l.monthKey === c.key && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && f(l)).reduce((a, l) => a + view(c, l), 0) : 0;
      const [t1, t2] = [t(f1), t(f2)];
      const w1 = strayFilterWord(c, halves[0]);
      const w2 = strayFilterWord(c, halves[1]);
      // OLA 26 (U5): la comparación clásica — dos lados con gasto — se
      // queda como estaba. Todo lo demás (un lado sin resolver, un
      // lado en cero con nombre, los dos en cero) ya no cae en
      // silencio: el lado vacío va en $0 DICHO y con su nombre.
      const wordedZero = (t1 === 0 && !!w1) || (t2 === 0 && !!w2);
      if (f1 && f2 && t1 + t2 > 0 && !wordedZero) {
        return {
          kind: "answer", family: "comparar",
          verdict: L(c.lang, `Este mes: el primer lado suma ${c.money(t1)} y el segundo ${c.money(t2)} — ${t1 === t2 ? "van parejos" : `gana el ${t1 > t2 ? "primero" : "segundo"} por ${c.money(Math.abs(t1 - t2))}`}.`, `This month: the first side adds up to ${c.money(t1)} and the second ${c.money(t2)} — ${t1 === t2 ? "they're tied" : `the ${t1 > t2 ? "first" : "second"} wins by ${c.money(Math.abs(t1 - t2))}`}.`),
          pieces: [{ label: L(c.lang, "Primer lado", "First side"), minor: t1 }, { label: L(c.lang, "Segundo lado", "Second side"), minor: t2 }],
          note: L(c.lang, "Cada lado es el filtro que su nombre resuelve en tu libro; si un nombre no es el que esperabas, pregúntame por el otro.", "Each side is the filter its name resolves to in your book; if a name isn't the one you meant, ask me by the other."),
          source: ["libros.lineas", "estudio.flujo"], lines: 0,
          actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
          figure: {
            kind: "lado",
            points: [
              { label: L(c.lang, "Primer lado", "First side"), minor: t1 },
              { label: L(c.lang, "Segundo lado", "Second side"), minor: t2 },
            ],
            note: null,
          },
        };
      }
      if (!f1 && !f2 && w1 && w2) {
        return {
          kind: "answer", family: "comparar",
          verdict: L(c.lang, `No tienes gasto anotado ni en «${w1}» ni en «${w2}»: los dos lados van en $0, así que no hay un «más» que declarar. Si los anotas con otro nombre, pregúntame por ese.`, `You have no recorded spending on "${w1}" or "${w2}": both sides sit at $0, so there's no "more" to declare. If you record them under another name, ask me by that one.`),
          pieces: [], note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
        };
      }
      const zeroSide = t1 === 0 && w1 ? 1 : t2 === 0 && w2 ? 2 : !f1 && w1 ? 1 : !f2 && w2 ? 2 : 0;
      if (zeroSide) {
        const known = zeroSide === 1 ? t2 : t1;
        const knownWord = zeroSide === 1 ? w2 : w1;
        const missing = (zeroSide === 1 ? w1 : w2) as string;
        return {
          kind: "answer", family: "comparar",
          verdict: known > 0
            ? L(c.lang, `Este mes: ${knownWord ? `en «${knownWord}» van ${c.money(known)}` : `el otro lado suma ${c.money(known)}`} y en «${missing}» no tienes nada anotado ($0) — ${knownWord ? `gana «${knownWord}»` : "gana el otro lado"} por ${c.money(known)}.`, `This month: ${knownWord ? `"${knownWord}" is at ${c.money(known)}` : `the other side adds up to ${c.money(known)}`} and on "${missing}" you have nothing recorded ($0) — ${knownWord ? `"${knownWord}" wins` : "the other side wins"} by ${c.money(known)}.`)
            : L(c.lang, `En «${missing}» no tienes nada anotado${knownWord ? `, y en «${knownWord}» tampoco hay gasto anotado este mes` : ", y el otro lado también va en $0 este mes"}: no hay un «más» que declarar.`, `On "${missing}" you have nothing recorded${knownWord ? `, and on "${knownWord}" there's no recorded spending this month either` : ", and the other side is also at $0 this month"}: there's no "more" to declare.`),
          pieces: [{ label: w1 ?? L(c.lang, "Primer lado", "First side"), minor: t1 }, { label: w2 ?? L(c.lang, "Segundo lado", "Second side"), minor: t2 }],
          note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
          actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
        };
      }
      if (f1 && f2 && t1 + t2 === 0) {
        return {
          kind: "answer", family: "comparar",
          verdict: L(c.lang, "Este mes ninguno de los dos lados tiene gasto anotado: van parejos en $0.", "This month neither side has recorded spending: they're tied at $0."),
          pieces: [{ label: L(c.lang, "Primer lado", "First side"), minor: 0 }, { label: L(c.lang, "Segundo lado", "Second side"), minor: 0 }],
          note: null, source: ["libros.lineas", "estudio.flujo"], lines: 0,
        };
      }
    }
    const filterT = filterOf(c, folded);
    // OLA 28 (Familia 2, E28-2): la comparación contra el pasado no
    // exige la adyacencia «más que el pasado» — «gasté más en tiendas
    // ESTE MES que el pasado» trae el filtro y el período en medio, y
    // la frase se lee entera: «más … que el pasado» con su distancia.
    if (filterT && /(mas que antes|mas que el (mes )?pasado|mas.{0,32}que el (mes )?pasado|gastando mas|ha subido|gaste mas que|more than (before|last)|spending more)/.test(folded)) {
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
  if (/termino de pagar|libre de deudas|debt[- ]?free|cuando.*pagar.*deuda/.test(folded)) {
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
export type FoundAmount = { minor: number; currency: Currency; label: string };
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

/* OLA 55 · LOS NÚMEROS EN PALABRAS — «veinticinco dólares más
 * ciento cuatro más treinta»: la calle dicta los montos en
 * palabras (la captura de Oscar, 2026-11-23: el Asesor callaba) y
 * el lector solo leía dígitos. Este lector lee la secuencia de
 * palabras-número en los dos idiomas — unidades, decenas con su
 * «y», cientos, miles y millones — y la vuelve monto, con guardas
 * contra los falsos amigos: una palabra-número solo es monto si
 * trae moneda al lado, un verbo de dinero justo antes, un hermano
 * en dígitos unido por «más», o compañía (dos o más secuencias en
 * la misma pregunta se certifican entre sí: una lista de montos
 * ES una lista de montos). «Once» queda fuera del mapa a
 * propósito: en inglés es un adverbio («pay once») y su falso
 * positivo costaba más que su lectura en español. La escala tras
 * dígitos («5 mil») es del lector de dígitos: una secuencia que
 * empieza justo después de un dígito no se lee dos veces. */
const WORD_NUM_ES: Record<string, number> = {
  uno: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};
const WORD_NUM_EN: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const WORD_NUM_ALL: Record<string, number> = { ...WORD_NUM_ES, ...WORD_NUM_EN };
const WORD_MONEY_VERB = new Set(["gastar", "gasto", "gaste", "pagar", "pague", "pago", "comprar", "compre", "compra", "enviar", "envio", "envie", "mandar", "mande", "cobrar", "cobre", "costar", "cuesta", "cuestan", "spend", "spent", "pay", "paid", "buy", "bought", "send", "sent", "cost", "costs"]);

export function parseWordNumber(toks: string[], start: number): { value: number; end: number } | null {
  let i = start;
  let total = 0;
  let current = 0;
  let lastKind = "";
  let consumed = false;
  const kindOf = (t: string, v: number): string => v < 10 ? "unit" : v < 20 ? "teen" : t.startsWith("veinti") ? "fused" : "tens";
  while (i < toks.length) {
    const t = toks[i];
    if (t === "y" || t === "and") {
      const nx = toks[i + 1];
      const nv = nx ? WORD_NUM_ALL[nx] : undefined;
      if (nv !== undefined && nv < 10 && ((t === "y" && lastKind === "tens") || (t === "and" && (lastKind === "hundreds" || lastKind === "hundred")))) { i++; continue; }
      break;
    }
    if (t === "mil" || t === "thousand") { total += (current || 1) * 1000; current = 0; lastKind = "scale"; consumed = true; i++; continue; }
    if (t === "millon" || t === "millones" || t === "million" || t === "millions") { total += (current || 1) * 1_000_000; current = 0; lastKind = "scale"; consumed = true; i++; continue; }
    if (t === "hundred") {
      if (lastKind === "hundreds" || lastKind === "hundred") break;
      current = (current || 1) * 100; lastKind = "hundred"; consumed = true; i++; continue;
    }
    const v = WORD_NUM_ALL[t];
    if (v === undefined) break;
    if (v >= 100) {
      if (lastKind === "hundreds" || lastKind === "hundred") break;
      current += v; lastKind = "hundreds"; consumed = true; i++; continue;
    }
    if (lastKind === "unit" || lastKind === "teen" || lastKind === "fused") break;
    if (lastKind === "tens" && v >= 20) break;
    if (lastKind === "hundreds" || lastKind === "hundred") { /* «ciento cuatro», «two hundred five»: la unidad sigue desnuda */ }
    else if (lastKind !== "" && lastKind !== "tens" && lastKind !== "scale") break;
    current += v; lastKind = kindOf(t, v); consumed = true; i++;
  }
  if (!consumed) return null;
  const value = total + current;
  return value > 0 ? { value, end: i } : null;
}

function wordAmountsIn(raw: string, def: Currency = "USD"): FoundAmount[] {
  const toks = foldQ(raw).split(/[^a-z0-9]+/).filter(Boolean);
  const cands: Array<{ value: number; start: number; end: number }> = [];
  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    if (WORD_NUM_ALL[t] !== undefined || t === "mil" || t === "millon" || t === "millones" || t === "thousand" || t === "million" || t === "millions" || t === "hundred") {
      if (i > 0 && /\d/.test(toks[i - 1])) { i++; continue; }
      const p = parseWordNumber(toks, i);
      if (p) { cands.push({ value: p.value, start: i, end: p.end }); i = p.end; continue; }
    }
    i++;
  }
  if (!cands.length) return [];
  const hasDigit = /\d/.test(raw);
  const out: FoundAmount[] = [];
  for (const cd of cands) {
    const prev = toks[cd.start - 1] ?? "";
    const next1 = toks[cd.end] ?? "";
    const next2 = toks[cd.end + 1] ?? "";
    const curWord = [next1, next2].find((x) => /^(dolares|dollars|cordobas|pesos)$/.test(x)) ?? "";
    const certified = !!curWord
      || WORD_MONEY_VERB.has(prev)
      || cands.length >= 2
      || (hasDigit && (prev === "mas" || prev === "plus" || next1 === "mas" || next1 === "plus"));
    if (!certified) continue;
    // LA MONEDA SE OYE (puerto de la Rama Agente, 2026-11-24): la
    // palabra de moneda manda; sin palabra, el monto dictado es de
    // la moneda DEL LIBRO (def), no del dólar por defecto.
    const currency: Currency = /^(cordobas|pesos)$/.test(curWord) ? "NIO" : /^(dolares|dollars)$/.test(curWord) ? "USD" : def;
    const value = prev === "menos" ? -cd.value : cd.value;
    out.push({ minor: Math.round(value * 100), currency, label: "" });
  }
  return out;
}

/** Los montos que la pregunta TRAE, con su moneda y el concepto que los
 * sigue o precede («300 dólares de cumpleaños», «50 en comida»). */
export function amountsIn(raw: string, def: Currency = "USD"): FoundAmount[] {
  const out: FoundAmount[] = wordAmountsIn(raw, def);
  // OLA 9 (cura de la CAZA-TRAMPAS, clase 1): el SIGNO y la ESCALA ya no
  // se evaporan. «−200» se leía +200 y «1 billón» se leía $1: un lector
  // que lee a medias es peor que uno que calla. El signo se captura; la
  // escala en palabra se aplica (mil ×1.000, millón/million ×1e6,
  // billion ×1e9); «billón» ES es ambiguo (10¹² contra el billion EN)
  // y ese monto NO se lee: la familia cae en su silencio honesto antes
  // que responder con una cifra a medias.
  const re = /(-|−|menos\s+)?(\$|c\$|us\$)?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*(dolares|dólares|pesos|cordobas|córdoba|córdobas|usd|nio)?\s*(millones|millon|millón|million|millions|billion|billions|billones|billon|billón|mil)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    // La escritura real trae acentos o no los trae, según el teléfono y
    // el apuro: la palabra de moneda y la de escala se pliegan antes de
    // juzgarlas. Sin el pliegue, «200 Córdobas» — con acento y plural —
    // se leía como 200 DÓLARES (espécimen 2026-11-23, puerto de la
    // Rama Agente).
    const scaleWord = foldQ((m[5] ?? "").toLowerCase());
    if (scaleWord === "billon" || scaleWord === "billones") continue;
    let value = parseNumberToken(m[3]);
    if (!Number.isFinite(value) || value === 0) continue;
    if (scaleWord === "mil") value *= 1_000;
    else if (scaleWord) value *= scaleWord.startsWith("b") ? 1_000_000_000 : 1_000_000;
    if (m[1]) value = -Math.abs(value);
    const word = foldQ((m[4] ?? "").toLowerCase());
    // LA MONEDA SE OYE (puerto de la Rama Agente, 2026-11-24): el
    // monto que no nombra su moneda es de la moneda DEL LIBRO (def),
    // no del dólar por defecto — un libro en córdobas oye «500» como
    // C$500. El signo $ y la palabra nombran su moneda y mandan
    // sobre el defecto.
    const currency: Currency = word.startsWith("peso") || word.startsWith("cordoba") || word === "nio" || (m[2] ?? "").toLowerCase() === "c$"
      ? "NIO"
      : (m[2] ?? "").toLowerCase() === "$" || (m[2] ?? "").toLowerCase() === "us$" || word.startsWith("dolar") || word.startsWith("dollar") || word === "usd"
        ? "USD"
        : def;
    // El concepto: las palabras que siguen al monto hasta la próxima
    // cifra, una coma o el cierre de la pregunta («en comida», «de
    // cumpleaños») — limpio y corto, para nombrar la pieza.
    const rest = raw.slice(re.lastIndex, re.lastIndex + 40);
    // OLA 28 (Familia 2, E28-2): «for» entra en las preposiciones del
    // concepto — el reparto inglés nombra sus partes con «40 for mom»
    // y sin la etiqueta la parte quedaba anónima y el reparto moría.
    // La etiqueta solo la consume repartoAnswer (su Forma 1).
    const concept = (rest.match(/^\s*(?:en|de|para|por|a|for)\s+([a-záéíóúñ ]{2,24}?)(?=[,.]|\s+y\s|\s*\d|\?|$)/i)?.[1] ?? "").trim();
    // OLA 26 (U3): el rótulo también vive ATRÁS — «mamá me dio 150»:
    // el lector solo buscaba hacia adelante y la pieza salía «Monto
    // 3». Atrás solo se acepta una PERSONA en palabras llanas (la
    // lista de parentesco, o un nombre propio con su verbo de dar):
    // un verbo suelto («gasto 300») no es un rótulo.
    let label = concept;
    if (!label) {
      const before = raw.slice(Math.max(0, m.index - 48), m.index);
      const seg = before.split(/,|;|\s+y\s+|\s+e\s+/).pop() ?? "";
      const kin = seg.match(/(mamá|mami|madre|papá|papi|padre|hermano|hermana|abuelo|abuela|esposo|esposa|hijo|hija|primo|prima|tío|tía|sobrino|sobrina|novio|novia)\b/i)?.[1];
      const named = seg.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\s+(?:me\s+)?(?:dio|regaló|regalo|pasó|paso|prestó|presto|mandó|mando|envió|envio)\b/i)?.[1];
      label = (kin ?? named ?? "").toLowerCase();
    }
    out.push({ minor: Math.round(value * 100), currency, label });
  }
  return out;
}

/* OLA 58 · EL VERBO DE CADA MONTO (capturas de Oscar, 2026-11-24):
 * el hipotético viejo sumaba TODOS los montos traídos con el signo
 * de la pregunta entera — «si ingreso 200 y gasto 100» salía como
 * un gasto de 300, y «si ingreso 1800 córdobas» como si USARA los
 * 1800. La calle, en cambio, le pone a cada monto SU verbo: el que
 * lo gobierna de cerca. Este lector lee los montos CON su posición
 * (gemelo de amountsIn: mismos dígitos, mismas palabras-número) y
 * le busca a cada uno el verbo que lo manda — hasta seis palabras
 * atrás, o la frase de destino que lo sigue («de ingreso», «a mis
 * ahorros»). Los signos: +1 entra (ingreso), −1 sale (gasto),
 * 0 aparta o mueve (ahorro: sale de lo libre, pero SIGUE SIENDO
 * TUYO — apartar no es salir, fallo de Oscar en 1.3.316). Las
 * formas con persona ambigua se resuelven por la persona misma:
 * «me pagan / me envían / me mandan» entra; «pago / envío / mando»
 * sale; el «pay» inglés entra solo con su «me» detrás. Un monto
 * sin verbo queda sin signo (null) y lo firma la regla de quien
 * lo lea, dicha en su comentario.
 * Enmienda de canon (1.3.452): el lector recibe la moneda de vista
 * del libro (def) — un monto sin palabra de moneda se lee en ella,
 * la misma doctrina que amountsIn ganó en la 444; la copia de la
 * línea no la traía porque su banco nació antes de esa doctrina. */
type VerbAmount = { a: FoundAmount; sign: 1 | -1 | 0 | null; verb: string; start: number; end: number };
const VERB_IN_PRE = /^(ingres|gan|recib|cobr|deposit|earn|receiv)/;
const VERB_OUT_PRE = /^(gast|compr|cost|cuest|spend|spent|buy|bought|pierd|perd)/;
const VERB_SAVE_PRE = /^(ahorr|apart|traslad|sav)/;
function verbClassAt(toks: string[], i: number): { sign: 1 | -1 | 0; verb: string } | null {
  const t = toks[i];
  if (!t) return null;
  const prev = toks[i - 1] ?? "";
  const next = toks[i + 1] ?? "";
  if (/^pag/.test(t)) {
    if (prev === "me") return { sign: 1, verb: t };
    if (/^(pagan|pagaran|pagaron)$/.test(t)) return null;
    return { sign: -1, verb: t };
  }
  if (/^(envi|mand)/.test(t)) {
    if (prev === "me") return { sign: 1, verb: t };
    return { sign: -1, verb: t };
  }
  if (/^(pay|paid|pays)$/.test(t)) return next === "me" ? { sign: 1, verb: t } : { sign: -1, verb: t };
  if (/^(get|got)$/.test(t)) return { sign: 1, verb: t };
  if (/^entr/.test(t)) return { sign: 1, verb: t };
  if (t === "ingreso" || t === "ingresos") return { sign: 1, verb: t };
  if (t === "gasto" || t === "gastos") return { sign: -1, verb: t };
  if (t === "ahorro" || t === "ahorros") return { sign: 0, verb: t };
  if (VERB_IN_PRE.test(t)) return { sign: 1, verb: t };
  if (VERB_SAVE_PRE.test(t)) return { sign: 0, verb: t };
  if (/^(guard|muev|mov|met)/.test(t)) return { sign: 0, verb: t };
  if (/^(pon|pong)/.test(t)) {
    for (let j = i + 1; j <= Math.min(toks.length - 1, i + 6); j++) if (/^(ahorr|savings)/.test(toks[j])) return { sign: 0, verb: t };
    return null;
  }
  if (t === "set" && next === "aside") return { sign: 0, verb: "set aside" };
  if (t === "move" || t === "moves" || t === "moved" || t === "moving") return { sign: 0, verb: t };
  if (t === "save" || t === "saves" || t === "saved" || t === "saving" || t === "savings") return { sign: 0, verb: t };
  if (VERB_OUT_PRE.test(t)) return { sign: -1, verb: t };
  if (/^sac/.test(t)) return { sign: -1, verb: t };
  return null;
}
function verbAmounts(raw: string, def?: Currency): { list: VerbAmount[]; toks: string[] } {
  const foldedAll = foldQ(raw);
  const toks = foldedAll.split(/[^a-z0-9]+/).filter(Boolean);
  const spans: Array<{ minor: number; currency: Currency; label: string; start: number; end: number }> = [];
  // Las palabras-número, con la certificación de wordAmountsIn y una
  // más, la que esta ola trae: un verbo de dinero pegado atrás
  // también certifica («ahorro quinientos» ES un monto).
  {
    const cands: Array<{ value: number; start: number; end: number }> = [];
    for (let i = 0; i < toks.length;) {
      const t = toks[i];
      if (WORD_NUM_ALL[t] !== undefined || t === "mil" || t === "millon" || t === "millones" || t === "thousand" || t === "million" || t === "millions" || t === "hundred") {
        if (i > 0 && /\d/.test(toks[i - 1])) { i++; continue; }
        const p = parseWordNumber(toks, i);
        if (p) { cands.push({ value: p.value, start: i, end: p.end }); i = p.end; continue; }
      }
      i++;
    }
    const hasDigit = /\d/.test(raw);
    for (const cd of cands) {
      const prev = toks[cd.start - 1] ?? "";
      const next1 = toks[cd.end] ?? "";
      const next2 = toks[cd.end + 1] ?? "";
      const curWord = [next1, next2].find((x) => /^(dolares|dollars|cordobas|pesos|billete|billetes)$/.test(x)) ?? "";
      const certified = !!curWord || WORD_MONEY_VERB.has(prev) || cands.length >= 2
        || (hasDigit && (prev === "mas" || prev === "plus" || next1 === "mas" || next1 === "plus"))
        || verbClassAt(toks, cd.start - 1) !== null;
      if (!certified) continue;
      spans.push({ minor: Math.round(cd.value * 100), currency: /^(cordobas|pesos)$/.test(curWord) ? "NIO" : (def ?? "USD"), label: "", start: cd.start, end: cd.end });
    }
  }
  // Los dígitos, gemelos del lector de amountsIn (escala y moneda;
  // el «billón» ambiguo tampoco se lee aquí).
  {
    const tokSpans: Array<{ s: number; e: number; idx: number }> = [];
    const tre = /[a-z0-9]+/g;
    let tm: RegExpExecArray | null;
    while ((tm = tre.exec(foldedAll)) !== null) tokSpans.push({ s: tm.index, e: tm.index + tm[0].length, idx: tokSpans.length });
    // El token EN o DESPUÉS de la posición: el match crudo puede
    // empezar en el «$» o en un espacio, que no son token.
    const tokAt = (pos: number) => tokSpans.find((x) => x.e > pos)?.idx ?? -1;
    const re = /(-|−|menos\s+)?(\$|c\$|us\$)?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*(dolares|dólares|pesos|cordobas|córdoba|usd|nio)?\s*(millones|millon|millón|million|millions|billion|billions|billones|billon|billón|mil)?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const scaleWord = (m[5] ?? "").toLowerCase();
      if (scaleWord === "billon" || scaleWord === "billón" || scaleWord === "billones") continue;
      let value = parseNumberToken(m[3]);
      if (!Number.isFinite(value) || value === 0) continue;
      if (scaleWord === "mil") value *= 1_000;
      else if (scaleWord) value *= scaleWord.startsWith("b") ? 1_000_000_000 : 1_000_000;
      const word = foldQ((m[4] ?? "").toLowerCase());
      const currency: Currency = word.startsWith("peso") || word.startsWith("cordoba") || word === "nio" || (m[2] ?? "").toLowerCase() === "c$" ? "NIO" : (def ?? "USD");
      const rest = raw.slice(re.lastIndex, re.lastIndex + 40);
      const concept = (rest.match(/^\s*(?:en|de|para|por|a)\s+([a-záéíóúñ ]{2,24}?)(?=[,.]|\s+y\s|\s*\d|\?|$)/i)?.[1] ?? "").trim();
      const sIdx = tokAt(m.index);
      // El fin del tramo es el token del ÚLTIMO DÍGITO del match:
      // el regex puede comerse el espacio tras la cifra («6 meses»
      // dejaba el fin en «meses» y el 6 se leía como apartado).
      let lastDigit = m.index + m[0].length - 1;
      while (lastDigit > m.index && !/\d/.test(raw[lastDigit])) lastDigit--;
      const eIdx = tokAt(lastDigit);
      if (sIdx < 0 || eIdx < 0) continue;
      if (spans.some((x) => sIdx >= x.start && sIdx < x.end)) continue;
      spans.push({ minor: Math.round(value * 100), currency, label: concept, start: sIdx, end: eIdx + 1 });
    }
  }
  spans.sort((x, y) => x.start - y.start);
  const list: VerbAmount[] = spans.map((sp) => {
    let found: { sign: 1 | -1 | 0; verb: string } | null = null;
    for (let i = sp.start - 1; i >= Math.max(0, sp.start - 6) && !found; i--) found = verbClassAt(toks, i);
    if (!found) {
      for (let i = sp.end; i <= Math.min(toks.length - 1, sp.end + 2) && !found; i++) {
        const t = toks[i];
        if ((t === "ingreso" || t === "ingresos") && toks[i - 1] === "de") found = { sign: 1, verb: "de ingreso" };
        else if ((t === "ahorro" || t === "ahorros" || t === "savings") && (toks[i - 1] === "de" || toks[i - 1] === "a" || toks[i - 2] === "a")) found = { sign: 0, verb: "a ahorros" };
        else if (t === "gasto" && toks[i - 1] === "de") found = { sign: -1, verb: "de gasto" };
      }
    }
    return { a: { minor: sp.minor, currency: sp.currency, label: sp.label }, sign: found?.sign ?? null, verb: found?.verb ?? "", start: sp.start, end: sp.end };
  });
  return { list, toks };
}

function calculadoraAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const amounts = amountsIn(raw, c.display);
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  // OLA 58 · LA DIFERENCIA ENTRE LO QUE ENTRA Y LO QUE SALE:
  // «if I pay $100 and then earn $200, what's the difference?»
  // caía en silencio — la calculadora no firmaba los montos. Con
  // el verbo de cada monto (verbAmounts), la diferencia es la
  // resta firmada, dicha a favor o en contra.
  if (/(diferencia|difference)/.test(folded)) {
    const { list } = verbAmounts(raw, c.display);
    const ins = list.filter((s) => s.sign === 1);
    const outs = list.filter((s) => s.sign === -1);
    if (ins.length && outs.length) {
      const inSum = ins.reduce((a, s) => a + disp(s.a), 0);
      const outSum = outs.reduce((a, s) => a + disp(s.a), 0);
      const net = inSum - outSum;
      const verdict = net > 0
        ? L(c.lang, `La diferencia es ${c.money(net)} a tu favor: entrarían ${c.money(inSum)} y saldrían ${c.money(outSum)}.`, `The difference is ${c.money(net)} in your favor: ${c.money(inSum)} would come in and ${c.money(outSum)} would go out.`)
        : net < 0
          ? L(c.lang, `La diferencia es ${c.money(-net)} en tu contra: saldrían ${c.money(outSum)} y entrarían ${c.money(inSum)}.`, `The difference is ${c.money(-net)} against you: ${c.money(outSum)} would go out and ${c.money(inSum)} would come in.`)
          : L(c.lang, `No hay diferencia: entra lo mismo que sale (${c.money(inSum)}).`, `There's no difference: the same comes in as goes out (${c.money(inSum)}).`);
      return {
        kind: "answer", family: "calculadora",
        verdict,
        pieces: [
          ...ins.map((s) => ({ label: s.a.label || L(c.lang, "Entra", "Comes in"), minor: disp(s.a) })),
          ...outs.map((s) => ({ label: s.a.label || L(c.lang, "Sale", "Goes out"), minor: -disp(s.a) })),
        ],
        note: L(c.lang, "Es aritmética de tu pregunta, con el verbo de cada monto: no toqué tu libro.", "That's arithmetic from your question, with each amount's own verb: I didn't touch your book."),
        source: ["asesor.lectura"], lines: 0,
      };
    }
  }
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
    // OLA 57: si el ÚNICO monto leído es el propio porcentaje («el
    // 20% de mil quinientos» — la base viene en palabras y el lector
    // no la certificó), la base NO es el porcentaje: se cae a la
    // lectura por posición de abajo, que lee la base tras el «de».
    const base = amounts.find((a) => a.minor !== Math.round(p * 100));
    if (base) {
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
  }
  // OLA 57 · EL PORCENTAJE EN PALABRAS (capturas de Oscar,
  // 2026-11-24): «¿Cuál es el quince por ciento de mil quinientos
  // dólares?» y «the ten percent of three hundred» caían en
  // silencio — el porcentaje y la base llegaban EN PALABRAS y la
  // forma cercada solo leía dígitos. La forma se lee por POSICIÓN:
  // el número pegado ANTES de «por ciento / porcentaje / percent»
  // es el porcentaje; el monto tras el «de / of» es la base. La
  // posición manda sobre el valor: un 150% también es porcentaje.
  {
    const pm = folded.match(/(por ciento|porcentaje|percent|%)\s*(?:de|of)\s+/);
    if (pm && pm.index !== undefined) {
      const before = folded.slice(0, pm.index).trim();
      const after = folded.slice(pm.index + pm[0].length);
      let p: number | null = null;
      const pDig = before.match(/(\d+(?:[.,]\d+)?)$/);
      if (pDig) p = parseNumberToken(pDig[1]);
      if (p == null) {
        const toks = before.split(/[^a-z0-9]+/).filter(Boolean);
        const numTok = (t: string) => WORD_NUM_ALL[t] !== undefined || /^(mil|millon|millones|thousand|million|millions|hundred|y|and)$/.test(t);
        let s = toks.length - 1;
        if (s >= 0 && numTok(toks[s])) {
          while (s > 0 && numTok(toks[s - 1])) s--;
          const parsed = parseWordNumber(toks, s);
          if (parsed && parsed.end === toks.length) p = parsed.value;
        }
      }
      let base: { minor: number; currency: Currency } | null = null;
      const bDig = after.match(/^\s*(?:\$\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*(mil|millones|millon|million|millions|thousand)?/);
      if (bDig) {
        let v = parseNumberToken(bDig[1]);
        if (bDig[2] === "mil" || bDig[2] === "thousand") v *= 1_000;
        else if (bDig[2]) v *= 1_000_000;
        if (v > 0) base = { minor: Math.round(v * 100), currency: /(cordobas|pesos)/.test(after.slice(0, 48)) ? "NIO" : (c.display) };
      }
      if (!base) {
        const toks = after.split(/[^a-z0-9]+/).filter(Boolean);
        for (let s = 0; s < toks.length; s++) {
          if (WORD_NUM_ALL[toks[s]] === undefined && !/^(mil|millon|millones|thousand|million|millions|hundred)$/.test(toks[s])) continue;
          const parsed = parseWordNumber(toks, s);
          if (parsed && parsed.value > 0) {
            const near = toks.slice(parsed.end, parsed.end + 2).join(" ");
            base = { minor: Math.round(parsed.value * 100), currency: /(cordobas|pesos)/.test(near) ? "NIO" : (c.display) };
          }
          break;
        }
      }
      if (p != null && p > 0 && base && base.minor > 0) {
        const baseD = convertMinor(base.minor, base.currency, c.display, c.rateE4);
        const result = Math.round((baseD * p) / 100);
        const pTxt = `${Number(p.toFixed(2))}`;
        return {
          kind: "answer", family: "calculadora",
          verdict: L(c.lang, `El ${pTxt}% de ${c.money(baseD)} es ${c.money(result)}.`, `${pTxt}% of ${c.money(baseD)} is ${c.money(result)}.`),
          pieces: [{ label: L(c.lang, "La base", "The base"), minor: baseD }, { label: `${pTxt}%`, minor: result }],
          note: L(c.lang, "Es aritmética de tu pregunta: no toqué tu libro.", "That's arithmetic from your question: I didn't touch your book."),
          source: ["asesor.lectura"], lines: 0,
        };
      }
    }
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
  // OLA 55: la suma pura oye su voz natural entera — «¿cuánto
  // son…?», «¿cuánto serían…?», «¿cuánto es A más B?», «how much
  // is X plus Y», «what is X plus Y» — y no solo las formas con
  // «en total»: la calle pregunta la suma sin nombrar el total.
  const sumVoice55 = /(cuanto seria|cuanto serian|cuanto son|cuanto es en total|en total|cuanto suman|cuanto (da|dan)\b|how much would (that|it) be|in total|how much would|what('s| is) the (sum|total))/.test(folded)
    || (/(cuanto es|how much is|what is|what's)/.test(folded) && /(mas|plus)/.test(folded));
  // OLA 56 · LA EXPRESIÓN DESNUDA: «10 + 25 + 104 + 30» sin una
  // sola palabra de pregunta (captura de Oscar, 2026-11-23) — si
  // TODA la pregunta son montos unidos por + / más / plus, no hay
  // otra cosa que pueda estar pidiendo: es la suma.
  const exprToks = folded.split(/[^a-z0-9+]+/).filter(Boolean);
  const pureExpression = amounts.length >= 2
    && exprToks.some((t) => t === "+" || t === "mas" || t === "plus")
    && exprToks.every((t) => t === "+" || t === "mas" || t === "plus" || t === "y" || t === "and" || /\d/.test(t) || WORD_NUM_ALL[t] !== undefined || t === "mil" || t === "millon" || t === "millones" || t === "thousand" || t === "million" || t === "millions" || t === "hundred");
  if (amounts.length >= 2 && (sumVoice55 || pureExpression)) {
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

/* OLA 59 · LA PROYECCIÓN DE AHORRO — los ayudantes de horizonte y
 * cadencia. El horizonte se lee de la frase (fin de mes, fin de
 * año, el mes nombrado, «en N años/meses/semanas», el año que
 * viene) y la cadencia de su palabra (cada semana, mensual, each
 * month…); los períodos que cuentan son los COMPLETOS que caben
 * entre hoy y el horizonte — la misma honestidad del ritmo de la
 * calculadora: el supuesto se dice, no se esconde. */
const MONTH_NUM: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
function horizonOf(folded: string, today: string): { date: string; es: string; en: string } | null {
  const [ty, tm, td] = today.split("-").map(Number);
  const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const monthEnd = (y: number, m: number) => iso(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
  if (/(fin de ano|a fin de ano|finales de ano|fin del ano|end of the year)/.test(folded)) return { date: iso(ty, 12, 31), es: "a fin de año", en: "by the end of the year" };
  if (/(fin de mes|a fin de mes|finales de mes|end of the month)/.test(folded)) return { date: monthEnd(ty, tm), es: "a fin de mes", en: "by the end of the month" };
  const named = folded.match(/(?:en|para|a|by)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (named) {
    const mNum = MONTH_NUM[named[1]];
    const y = mNum < tm ? ty + 1 : ty;
    return { date: monthEnd(y, mNum), es: `para ${named[1]}`, en: `by ${named[1]}` };
  }
  const toksH = folded.split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i < toksH.length - 1; i++) {
    if (toksH[i] !== "en" && toksH[i] !== "in") continue;
    let n: number | null = null;
    let used = 0;
    if (/^\d+$/.test(toksH[i + 1])) { n = Number(toksH[i + 1]); used = 1; }
    else { const p = parseWordNumber(toksH, i + 1); if (p) { n = p.value; used = p.end - (i + 1); } }
    if (n == null || n <= 0) continue;
    const unit = toksH[i + 1 + used] ?? "";
    if (/^(anos|years)$/.test(unit)) return { date: iso(ty + n, tm, Math.min(td, new Date(Date.UTC(ty + n, tm, 0)).getUTCDate())), es: `en ${n} años`, en: `in ${n} years` };
    if (/^(meses|months)$/.test(unit)) {
      const total = (tm - 1) + n;
      const y = ty + Math.floor(total / 12);
      const m = (total % 12) + 1;
      return { date: iso(y, m, Math.min(td, new Date(Date.UTC(y, m, 0)).getUTCDate())), es: `en ${n} meses`, en: `in ${n} months` };
    }
    if (/^(semanas|weeks)$/.test(unit)) {
      const d = new Date(Date.UTC(ty, tm - 1, td) + n * 7 * 86400000);
      return { date: d.toISOString().slice(0, 10), es: `en ${n} semanas`, en: `in ${n} weeks` };
    }
  }
  if (/(proximo ano|el ano que viene|next year)/.test(folded)) return { date: iso(ty + 1, tm, Math.min(td, new Date(Date.UTC(ty + 1, tm, 0)).getUTCDate())), es: "en un año", en: "in a year" };
  return null;
}
function cadenceOf(folded: string): "weekly" | "biweekly" | "monthly" | "yearly" | null {
  if (/(cada quincena|quincenal|every two weeks|biweekly)/.test(folded)) return "biweekly";
  if (/(cada semana|semanal|por semana|a la semana|each week|every week|weekly|per week)/.test(folded)) return "weekly";
  if (/(cada mes|mensual|por mes|al mes|each month|every month|monthly|per month)/.test(folded)) return "monthly";
  if (/(cada ano|anual|por ano|each year|every year|yearly|per year)/.test(folded)) return "yearly";
  return null;
}
function periodsBetween(today: string, horizon: string, cad: "weekly" | "biweekly" | "monthly" | "yearly"): number {
  const [ty, tm, td] = today.split("-").map(Number);
  const [hy, hm, hd] = horizon.split("-").map(Number);
  const days = Math.round((Date.UTC(hy, hm - 1, hd) - Date.UTC(ty, tm - 1, td)) / 86400000);
  if (cad === "weekly") return Math.max(0, Math.floor(days / 7));
  if (cad === "biweekly") return Math.max(0, Math.floor(days / 14));
  if (cad === "monthly") { let n = (hy - ty) * 12 + (hm - tm); if (hd < td) n -= 1; return Math.max(0, n); }
  let n = hy - ty;
  if (hm < tm || (hm === tm && hd < td)) n -= 1;
  return Math.max(0, n);
}

function hipoteticoAnswer(c: Ctx, folded: string, raw: string, pinId?: string): BankResult | null {
  const amounts = amountsIn(raw, c.display);
  // OLA 58/59: el lector con verbo certifica montos que amountsIn
  // no certifica («ahorro doscientos» a secas) — sin ninguno de
  // los dos lectores, no hay premisa que caminar.
  const verbAll = verbAmounts(raw, c.display);
  if (amounts.length < 1 && !verbAll.list.length) return null;
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  const sum = amounts.reduce((a, x) => a + disp(x), 0);
  // OLA 25: el nombre propio de la pieza de un monto traído — su
  // rótulo si lo trae, su cifra en SU moneda si es extranjera, y
  // «Monto N» solo como último recurso, nunca como primera opción.
  const amountLabel = (a: FoundAmount, i: number): string => a.label
    || (a.currency !== c.display ? formatMoney(a.minor, a.currency, c.lang) : L(c.lang, `Monto ${i + 1}`, `Amount ${i + 1}`));
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
      graph: [{
        id: "con-premisa", label: L(c.lang, "Con la premisa", "With the premise"), minor: stock.total + sum, tense: "proyectado", flow: "stock", currency: c.display,
        assumption: { text: L(c.lang, "la premisa que trajiste: que ese dinero entró a tus ahorros", "the premise you brought: that this money landed in your savings"), origin: "usuario" },
        children: [
          { id: "consta", label: L(c.lang, "Consta hoy", "Recorded today"), minor: stock.total, tense: "stock", flow: "stock", currency: c.display, sign: 1 },
          { id: "premisa", label: L(c.lang, "Lo que dices que entró", "What you say came in"), minor: sum, tense: "proyectado", flow: "flujo", currency: c.display, sign: 1, assumption: { text: L(c.lang, "la premisa que trajiste: que ese dinero entró a tus ahorros", "the premise you brought: that this money landed in your savings"), origin: "usuario" } },
        ],
      }],
      source: ["ahorros.stock"], lines: 0,
      actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
    };
  }
  // OLA 24 · LA SENSIBILIDAD DE UNA VARIABLE (el What-If de Excel):
  // «¿y si el internet sube a 60?» / «¿y si la casa sube 10 dólares?»
  // — UNA línea nombrada cambia y el mes se recalcula con esa línea
  // sustituida; la diferencia se dice. «Sube a X» trae el valor nuevo;
  // «sube X» trae el delta (el signo lo pone el verbo).
  {
    const filter = filterOf(c, folded);
    const verb = /(sube|subiera|subiese|baja|bajara|bajase|aumenta|aumentara|cuesta|cueste|costara|valiera|fuera|seria|bajaria|subiria)/.test(folded);
    if (amounts.length >= 1 && filter && verb && /\bsi\b|\bif\b/.test(folded)) {
      const monthLines = (c.state.months[c.key]?.lines ?? []).filter((l) => l.active && isOut(l) && roleOf(c.state, l.categoryId) !== "savings");
      const named = monthLines.filter((l) => filter(l));
      if (named.length) {
        const line = named[0];
        const oldV = view(c, line);
        const amt = disp(amounts[0]);
        // OLA 38: el «a» de «sube a $550» queda separado de la cifra
        // por el signo de moneda — sin admitir el «$» en el corte, el
        // valor nuevo se leía como DELTA y la renta de $450 «subía a
        // $550» costando $1,000 (la caza del centro lo cazó: la forma
        // del centro trae el signo, la de la Ola 24 no lo traía).
        const absolute = /(a|hasta|en|to)\s*\$?\s*$/.test(folded.slice(0, folded.search(/\d/))) || /(cuesta|cueste|costara|valiera|fuera|seria)/.test(folded);
        const newV = absolute ? amt : /(baja|bajara|bajase|bajaria)/.test(folded) ? oldV - amt : oldV + amt;
        const spendNow = monthLines.reduce((a, l) => a + view(c, l), 0);
        const spendNew = spendNow - oldV + newV;
        const diff = newV - oldV;
        return {
          kind: "answer", family: "hipotetico",
          verdict: L(c.lang, `Si «${line.concept}» costara ${c.money(newV)} en vez de ${c.money(oldV)}, este mes gastarías ${c.money(spendNew)} en vez de ${c.money(spendNow)}: ${diff >= 0 ? `${c.money(diff)} más` : `${c.money(-diff)} menos`}.`, `If "${line.concept}" cost ${c.money(newV)} instead of ${c.money(oldV)}, this month you'd spend ${c.money(spendNew)} instead of ${c.money(spendNow)}: ${diff >= 0 ? `${c.money(diff)} more` : `${c.money(-diff)} less`}.`),
          pieces: [{ label: line.concept, minor: oldV }, { label: L(c.lang, "El mes con el cambio", "The month with the change"), minor: spendNew }],
          note: L(c.lang, "El supuesto, dicho: solo cambia esa línea — todo lo demás queda como está anotado, y nada se movió en tu libro.", "The assumption, stated: only that line changes — everything else stays as recorded, and nothing moved in your book."),
          source: ["libros.lineas"], lines: named.length,
          actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio", "See it in Study"),
        };
      }
    }
  }
  // OLA 59 · LA PROYECCIÓN DE AHORRO: un monto APARTADO (su verbo
  // es ahorrar/guardar/save) contra un HORIZONTE (fin de año, fin
  // de mes, un mes nombrado, «en N años») — la respuesta es el
  // guardado de hoy más el aporte repetido por los períodos
  // completos que caben. La factibilidad trataba este ahorro como
  // un gasto imposible y el hipotético viejo como un gasto de una
  // vez (capturas de Oscar, 2026-11-24). SIN cadencia en la frase,
  // no se adivina: se pregunta de vuelta (cada semana / cada mes /
  // una sola vez) y la vuelta entra por el pin «cad:» — la misma
  // costura del contexto de cuentas, declarada para la caja.
  {
    const { list: signed59, toks: toks59 } = verbAll;
    const isHorizonAmt = (s: VerbAmount) => /^(anos|meses|semanas|years|months|weeks)$/.test(toks59[s.end] ?? "") && (toks59[s.start - 1] === "en" || toks59[s.start - 1] === "in");
    const saveCands = signed59.filter((s) => s.sign === 0 && !isHorizonAmt(s));
    const horizon = horizonOf(folded, c.today);
    // LA META INVERSA NO ES PROYECCIÓN: cuando la pregunta PIDE el
    // aporte («¿cuánto debo ahorrar para juntar $2000 en 4 meses?»)
    // el monto traído es la META, no el aporte — su familia es la
    // meta, y esta rama se queda fuera aunque el verbo ahorrar
    // alcance a gobernar la cifra de lejos.
    const metaVoice = /(cuanto (tengo|debo|necesito|hay) que ahorrar|cuanto (debo|necesito) ahorrar|para (llegar a|juntar|reunir|tener) |quiero (juntar|reunir|llegar)|how much (do i|should i|must i) (need to )?save|how much to save)/.test(folded);
    if (saveCands.length && horizon && !metaVoice) {
      const aporte = disp(saveCands[0].a);
      const stock59 = savingsStock(c.state, c.key);
      const cadPin = pinId && pinId.startsWith("cad:") ? pinId.slice(4) : null;
      const cad = cadPin === "weekly" || cadPin === "biweekly" || cadPin === "monthly" || cadPin === "yearly" || cadPin === "once"
        ? cadPin
        : cadenceOf(folded);
      if (!cad) {
        return {
          kind: "ask-back", family: "proyeccion",
          verdict: L(c.lang, `Eso depende de cada cuánto apartas: ¿los ${c.money(aporte)} son cada semana, cada mes, o una sola vez?`, `That depends on how often you set it aside: is the ${c.money(aporte)} every week, every month, or just once?`),
          options: [
            { id: "cad:weekly", label: L(c.lang, "Cada semana", "Every week"), minor: aporte },
            { id: "cad:monthly", label: L(c.lang, "Cada mes", "Every month"), minor: aporte },
            { id: "cad:once", label: L(c.lang, "Una sola vez", "Just once"), minor: aporte },
          ],
          source: ["ahorros.stock"],
        };
      }
      const hLabel = L(c.lang, horizon.es, horizon.en);
      if (cad === "once") {
        const total = stock59.total + aporte;
        return {
          kind: "answer", family: "proyeccion",
          verdict: L(c.lang, `Si apartaras ${c.money(aporte)} una sola vez, ${hLabel} tendrías ${c.money(total)} en ahorros: los ${c.money(stock59.total)} que constan hoy más ese apartado.`, `If you set aside ${c.money(aporte)} just once, ${hLabel} you'd have ${c.money(total)} in savings: the ${c.money(stock59.total)} recorded today plus that one set-aside.`),
          pieces: [
            { label: L(c.lang, "Consta hoy en ahorros", "Recorded in savings today"), minor: stock59.total },
            { label: L(c.lang, "El apartado de una vez", "The one-time set-aside"), minor: aporte },
            { label: L(c.lang, "Tendrías en ahorros", "You'd have in savings"), minor: total },
          ],
          note: L(c.lang, "El supuesto, dicho: sin contar interés — tu libro no promete ninguno — y nada se anotó.", "The assumption, stated: no interest counted — your book promises none — and nothing was recorded."),
          source: ["ahorros.stock", "asesor.lectura"], lines: 0,
          actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
        };
      }
      const n = periodsBetween(c.today, horizon.date, cad);
      const cadLabel = cad === "weekly" ? L(c.lang, "cada semana", "every week") : cad === "biweekly" ? L(c.lang, "cada quincena", "every two weeks") : cad === "monthly" ? L(c.lang, "cada mes", "every month") : L(c.lang, "cada año", "every year");
      if (n === 0) {
        return {
          kind: "answer", family: "proyeccion",
          verdict: L(c.lang, `En ese plazo (${hLabel}) no cabe un aporte ${cad === "weekly" ? "semanal" : cad === "biweekly" ? "quincenal" : cad === "monthly" ? "mensual" : "anual"} completo: el primero caería ya pasado el horizonte. Tu guardado quedaría como está: ${c.money(stock59.total)}.`, `In that span (${hLabel}) there isn't room for one full ${cad === "weekly" ? "weekly" : cad === "biweekly" ? "two-weekly" : cad === "monthly" ? "monthly" : "yearly"} set-aside: the first would land past the horizon. Your savings would stay as they are: ${c.money(stock59.total)}.`),
          pieces: [{ label: L(c.lang, "Consta hoy en ahorros", "Recorded in savings today"), minor: stock59.total }],
          note: L(c.lang, "El supuesto, dicho: cuento solo los períodos completos que caben desde hoy — nada se anotó.", "The assumption, stated: I count only the full periods that fit from today — nothing was recorded."),
          source: ["ahorros.stock", "asesor.lectura"], lines: 0,
          actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
        };
      }
      const junto = aporte * n;
      const total = stock59.total + junto;
      // LA FIGURA DEL CENSO (condición de exactitud, 1.3.452): el
      // camino de la proyección se declara porque cada punto ES una
      // cifra exacta del libro — el guardado de hoy y el guardado
      // tras k aportes (hoy + k × aporte), sin interpolar nada: con
      // pocos períodos van todos los pasos; con muchos, el inicio,
      // los cuartos del camino y el cierre, cada uno con su k real.
      const figKs: number[] = [];
      if (n <= 6) { for (let k = 1; k < n; k++) figKs.push(k); }
      else { for (const k of [Math.ceil(n / 4), Math.ceil(n / 2), Math.ceil((3 * n) / 4)]) if (k > 0 && k < n && !figKs.includes(k)) figKs.push(k); }
      const figure: BankFigure = {
        kind: "camino",
        points: [
          { label: L(c.lang, "Hoy en ahorros", "Savings today"), minor: stock59.total },
          ...figKs.map((k) => ({ label: L(c.lang, k === 1 ? "1 aporte" : `${k} aportes`, k === 1 ? "1 set-aside" : `${k} set-asides`), minor: stock59.total + aporte * k })),
          { label: L(c.lang, "Tendrías en ahorros", "You'd have in savings"), minor: total, mark: "cierre" as const },
        ],
        note: null,
      };
      return {
        kind: "answer", family: "proyeccion",
        verdict: L(c.lang, `Si apartaras ${c.money(aporte)} ${cadLabel}, ${hLabel} tendrías ${c.money(total)} en ahorros: hoy constan ${c.money(stock59.total)} guardados, y de aquí a entonces caben ${n} aportes de ${c.money(aporte)} (${c.money(junto)}).`, `If you set aside ${c.money(aporte)} ${cadLabel}, ${hLabel} you'd have ${c.money(total)} in savings: today shows ${c.money(stock59.total)} saved, and ${n} set-asides of ${c.money(aporte)} fit between now and then (${c.money(junto)}).`),
        pieces: [
          { label: L(c.lang, "Consta hoy en ahorros", "Recorded in savings today"), minor: stock59.total },
          { label: L(c.lang, `${n} aportes de ${c.money(aporte)}`, `${n} set-asides of ${c.money(aporte)}`), minor: junto },
          { label: L(c.lang, "Tendrías en ahorros", "You'd have in savings"), minor: total },
        ],
        note: L(c.lang, "El supuesto, dicho: el aporte se repite sin fallar y no rinde interés — tu libro no promete ninguno — y nada se anotó.", "The assumption, stated: the set-aside repeats without fail and earns no interest — your book promises none — and nothing was recorded."),
        source: ["ahorros.stock", "asesor.lectura"], lines: 0,
        actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
        figure,
      };
    }
  }
  // OLA 63 · LA DIANA ES UNA CLASE: si la premisa mueve dinero
  // DE/A una clase nombrada (a mi emergencia, de mi retiro, en mi
  // meta), ni el camino firmado ni el viejo la juzgan — la diana
  // no es el guardado entero ni la queda: es esa clase, y su casa
  // es la rama de movimientos nombrados de ahorrosAnswer. La
  // proyección (ola 59) ya corrió arriba: con cadencia u horizonte
  // manda ella; sin ellos, cede entera.
  if (/(en|a|hacia|de|del|para|in|to|from)\s+(mi\s+|mis\s+|el\s+|la\s+|the\s+|my\s+)?(emergencias?|retiro|meta|emergency|retirement|goal)\b/.test(folded)
    && /(apart|sacar|retir|meter|agre|sumar|ahorr|sav|add|take|withdraw|set aside|put|move|mover)/.test(folded)) return null;
  // OLA 58 · EL HIPOTÉTICO CON SIGNO: si la premisa trae montos
  // que ENTRAN o se APARTAN, cada monto camina con SU signo — el
  // camino viejo sumaba todo como gasto. Este bloque corre antes
  // del camino sin signo y solo cuando hay entrada o apartado;
  // la premisa de puro gasto sigue por su camino de siempre.
  {
    const { list: signed, toks: sToks } = verbAll;
    const inList = signed.filter((s) => s.sign === 1);
    const outList = signed.filter((s) => s.sign === -1);
    const saveList = signed.filter((s) => s.sign === 0);
    if (signed.length && (inList.length || saveList.length)) {
      const sumOf = (xs: VerbAmount[]) => xs.reduce((a, s) => a + disp(s.a), 0);
      const inSum = sumOf(inList);
      const outSum = sumOf(outList);
      const saveSum = sumOf(saveList);
      const stock58 = savingsStock(c.state, c.key);
      // LA DIANA SON LOS AHORROS: «si ingreso 1200 y muevo 300 a
      // mis ahorros, ¿cuánto tengo en mis ahorros?» — al guardado
      // entra lo apartado y el ingreso que la frase manda a
      // ahorros; el demás ingreso va a cuentas y se DICE, no se
      // mezcla en la cifra de ahorros.
      const ahorrosAsked = /(ahorros|savings)/.test(folded) && /(cuanto|cuanta|how much)/.test(folded) && !/(cuanto me queda|how much.*left)/.test(folded);
      if (ahorrosAsked && (saveList.length || inList.length)) {
        const toSavings = (s: VerbAmount) => s.sign === 0 || sToks.slice(s.end, s.end + 3).some((t) => /^(ahorros|savings)/.test(t));
        const gainList = signed.filter((s) => s.sign !== -1 && toSavings(s));
        const gain = sumOf(gainList);
        const otherIn = inList.filter((s) => !toSavings(s)).reduce((a, s) => a + disp(s.a), 0);
        if (gain > 0) {
          const newStock = stock58.total + gain;
          return {
            kind: "answer", family: "hipotetico",
            verdict: L(c.lang,
              `En tus ahorros tendrías ${c.money(newStock)}: hoy constan ${c.money(stock58.total)} guardados y entrarían ${c.money(gain)} más.${otherIn > 0 ? ` Los ${c.money(otherIn)} del ingreso entrarían a tus cuentas, no a tus ahorros.` : ""}${outSum > 0 ? ` Y los ${c.money(outSum)} que gastarías saldrían de tus cuentas.` : ""}`,
              `In your savings you'd have ${c.money(newStock)}: today shows ${c.money(stock58.total)} saved and ${c.money(gain)} more would come in.${otherIn > 0 ? ` The ${c.money(otherIn)} of income would land in your accounts, not your savings.` : ""}${outSum > 0 ? ` And the ${c.money(outSum)} you'd spend would come out of your accounts.` : ""}`),
            pieces: [
              { label: L(c.lang, "Consta hoy en ahorros", "Recorded in savings today"), minor: stock58.total },
              ...gainList.map((s, i) => ({ label: amountLabel(s.a, i), minor: disp(s.a) })),
              { label: L(c.lang, "Tendrías en ahorros", "You'd have in savings"), minor: newStock },
            ],
            note: L(c.lang, "El supuesto, dicho: es un «si» — nada de esto está anotado ni se guarda; tu libro queda como está.", "The assumption, stated: it's a hypothetical — none of this is recorded or saved; your book stays as it is."),
            source: ["ahorros.stock"], lines: 0,
            actions: reportDoor(c, "ahorros.stock", "Verlo en Ahorros", "See it in Savings"),
          };
        }
      }
      const asksLeft = /(cuanto[^?]{0,24}(quedaria|queda|quedaba|tendria)|how much would i (have|be) left|how much would be left)/.test(folded);
      if (asksLeft) {
        const onAccount58 = /cuenta|account/.test(folded);
        const hosts58 = hostAccounts(c.state, c.key, stock58).filter((h) => h.minor > 0);
        let base: number | null = null;
        let baseLabel = "";
        let singleAccount = false;
        if (pinId) {
          const host = hosts58.find((h) => h.id === pinId);
          if (host) { base = host.minor; baseLabel = c.names.sub(host.id) || host.id; singleAccount = true; }
        }
        if (base === null && onAccount58) {
          if (hosts58.length === 1) { base = hosts58[0].minor; baseLabel = c.names.sub(hosts58[0].id) || hosts58[0].id; singleAccount = true; }
          else if (hosts58.length === 0) { base = stock58.byClass.cuenta ?? 0; baseLabel = L(c.lang, "Hoy en tus cuentas", "In your accounts today"); }
          // Con varias cuentas y sin contexto, base queda null y
          // manda la vuelta de contexto del camino de siempre.
        }
        if (base === null && !onAccount58) {
          const reading58 = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
          base = reading58.left;
          baseLabel = L(c.lang, "Tu queda de hoy", "Your left-for-the-month today");
        }
        if (base !== null) {
          // El apartado: contra UNA cuenta o contra lo libre del
          // mes, sale de esa bolsa (y se dice que sigue siendo
          // tuyo); contra el total de tus cuentas, se mueve
          // DENTRO de ellas y el total no cambia.
          const saveEffect = singleAccount || !onAccount58 ? -saveSum : 0;
          const result = base + inSum - outSum + saveEffect;
          const baseText = base < 0
            ? L(c.lang, `hoy tu queda ya va en negativo (${c.money(base)}: salió más de lo que entró)`, `today your left already runs negative (${c.money(base)}: more went out than came in)`)
            : singleAccount
              ? L(c.lang, `lo que hoy tienes en ${baseLabel} (${c.money(base)})`, `what you hold in ${baseLabel} today (${c.money(base)})`)
              : onAccount58
                ? L(c.lang, `lo que hoy tienes en tus cuentas (${c.money(base)})`, `what you hold in your accounts today (${c.money(base)})`)
                : L(c.lang, `lo que te queda hoy (${c.money(base)})`, `what you have left today (${c.money(base)})`);
          const clauses: string[] = [];
          if (inSum > 0) clauses.push(L(c.lang, `más los ${c.money(inSum)} que entrarían`, `plus the ${c.money(inSum)} coming in`));
          if (outSum > 0) clauses.push(L(c.lang, `menos los ${c.money(outSum)} que saldrían`, `minus the ${c.money(outSum)} going out`));
          if (saveSum > 0) clauses.push(saveEffect !== 0
            ? L(c.lang, `menos los ${c.money(saveSum)} que apartarías a tus ahorros — apartar no es gastar: seguirían siendo tuyos`, `minus the ${c.money(saveSum)} you'd set aside into savings — setting aside isn't spending: they'd still be yours`)
            : L(c.lang, `con ${c.money(saveSum)} apartados a tus ahorros — apartar no es salir: seguirían en tus cuentas y seguirían siendo tuyos`, `with ${c.money(saveSum)} set aside into savings — setting aside isn't leaving: they'd stay in your accounts and still be yours`));
          const effectOf = (s: VerbAmount) => (s.sign === 1 ? disp(s.a) : s.sign === -1 ? -disp(s.a) : saveEffect !== 0 ? -disp(s.a) : null);
          return {
            kind: "answer", family: "hipotetico",
            verdict: L(c.lang,
              `Si eso pasara, te quedarían ${c.money(result)}: ${baseText}${clauses.length ? ` ${clauses.join(", ")}` : ""}.`,
              `If that happened, you'd have ${c.money(result)}: ${baseText}${clauses.length ? ` ${clauses.join(", ")}` : ""}.`),
            pieces: [
              { label: baseLabel, minor: base },
              ...signed.flatMap((s, i) => {
                const e = effectOf(s);
                return e === null ? [] : [{ label: amountLabel(s.a, i), minor: e }];
              }),
            ],
            note: L(c.lang, "El supuesto, dicho: es un «si» — nada de esto está anotado ni se guarda; tu libro queda como está.", "The assumption, stated: it's a hypothetical — none of this is recorded or saved; your book stays as it is."),
            graph: [{
              id: "quedaria", label: L(c.lang, "Lo que quedaría", "What would be left"), minor: result, tense: "proyectado", flow: "stock", currency: c.display,
              assumption: { text: L(c.lang, "el «si» que trajiste en tu pregunta: nada de esto está anotado", "the 'if' you brought in your question: none of this is recorded"), origin: "usuario" },
              children: [
                { id: "base", label: baseLabel, minor: base, tense: "stock", flow: "stock", currency: c.display, sign: 1 },
                ...signed.flatMap((s, i): AskNode[] => {
                  const e = effectOf(s);
                  return e === null ? [] : [{ id: `si-${i}`, label: amountLabel(s.a, i), minor: disp(s.a), tense: "proyectado", flow: "flujo", currency: c.display, sign: e >= 0 ? 1 : -1, assumption: { text: L(c.lang, "el «si» que trajiste en tu pregunta: nada de esto está anotado", "the 'if' you brought in your question: none of this is recorded"), origin: "usuario" } }];
                }),
              ],
            }],
            source: onAccount58 ? ["central.tengo", "ahorros.stock"] : ["central.queda", "asesor.lectura"], lines: 0,
            actions: onAccount58 ? undefined : reportDoor(c, "central.queda", "Ver mi Queda en Central", "See my Left in Central"),
          };
        }
      }
    }
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
            ...amounts.map((a, i) => ({ label: amountLabel(a, i), minor: -disp(a) })),
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
  // OLA 25 (espécimen de Oscar en su teléfono, 2026-11-22): el
  // veredicto viejo decía «tu base de hoy… menos los $8.19 del «si»»
  // y Oscar no lo pudo descifrar — «base» es jerga, el «si» es clave
  // interna, y los $8.19 jamás dijeron que eran sus 300 PESOS al
  // cambio. La cura: la base se nombra por su naturaleza, el monto
  // traído se nombra en SU moneda con la conversión dicha, y cada
  // cifra de la respuesta se explica sola. La rama del negativo que
  // se traduce es de la Ola 26 (U1) y llega en la misma expresión.
  const baseText = base < 0
    ? L(c.lang, `hoy tu queda ya va en negativo (${c.money(base)}: salió más de lo que entró)`, `today your left already runs negative (${c.money(base)}: more went out than came in)`)
    : onAccount
      ? L(c.lang, `lo que hoy tienes en tus cuentas (${c.money(base)})`, `what you hold in your accounts today (${c.money(base)})`)
      : L(c.lang, `lo que te queda hoy (${c.money(base)})`, `what you have left today (${c.money(base)})`);
  const foreignOne = amounts.length === 1 && amounts[0].currency !== c.display ? amounts[0] : null;
  const sumText = foreignOne
    ? L(c.lang, `tus ${formatMoney(foreignOne.minor, foreignOne.currency, c.lang)} (que son ${c.money(sum)} con la tasa de tu Mesa de cambio)`, `your ${formatMoney(foreignOne.minor, foreignOne.currency, c.lang)} (which is ${c.money(sum)} at your Exchange desk's rate)`)
    : incomeSide
      ? L(c.lang, `los ${c.money(sum)} que entrarían`, `the ${c.money(sum)} coming in`)
      : L(c.lang, `los ${c.money(sum)} que gastarías`, `the ${c.money(sum)} you'd spend`);
  return {
    kind: "answer", family: "hipotetico",
    verdict: incomeSide
      ? L(c.lang, `Si eso pasara, tendrías ${c.money(result)}: ${baseText} más ${sumText}.`, `If that happened, you'd have ${c.money(result)}: ${baseText} plus ${sumText}.`)
      : L(c.lang, `Si gastaras eso, te quedarían ${c.money(result)}: ${baseText} menos ${sumText}.`, `If you spent that, you'd have ${c.money(result)} left: ${baseText} minus ${sumText}.`),
    pieces: [
      { label: baseLabel, minor: base },
      ...amounts.map((a, i) => ({ label: amountLabel(a, i), minor: incomeSide ? disp(a) : -disp(a) })),
    ],
    note: L(c.lang, "El supuesto, dicho: es un «si» — nada de esto está anotado ni se guarda; tu libro queda como está.", "The assumption, stated: it's a hypothetical — none of this is recorded or saved; your book stays as it is."),
    graph: [{
      id: "quedaria", label: L(c.lang, "Lo que quedaría", "What would be left"), minor: result, tense: "proyectado", flow: "stock", currency: c.display,
      assumption: { text: L(c.lang, "el «si» que trajiste en tu pregunta: nada de esto está anotado", "the 'if' you brought in your question: none of this is recorded"), origin: "usuario" },
      children: [
        { id: "base", label: baseLabel, minor: base, tense: "stock", flow: "stock", currency: c.display, sign: 1 },
        ...amounts.map((a, i): AskNode => ({ id: `si-${i}`, label: amountLabel(a, i), minor: disp(a), tense: "proyectado", flow: "flujo", currency: c.display, sign: incomeSide ? 1 : -1, assumption: { text: L(c.lang, "el «si» que trajiste en tu pregunta: nada de esto está anotado", "the 'if' you brought in your question: none of this is recorded"), origin: "usuario" } })),
      ],
    }],
    source: onAccount ? ["central.tengo", "ahorros.stock"] : ["central.queda", "asesor.lectura"], lines: 0,
    actions: onAccount ? undefined : reportDoor(c, "central.queda", "Ver mi Queda en Central", "See my Left in Central"),
    figure: {
      kind: "lado",
      points: [
        { label: baseLabel, minor: base },
        { label: L(c.lang, "Con la premisa", "With the premise"), minor: result, mark: "premisa" },
      ],
      note: L(c.lang, "El «si» que trajiste en tu pregunta: nada de esto está anotado.", "The 'if' you brought in your question: none of this is recorded."),
    },
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
/* LA MONEDA INVITADA (puerto de la Rama Agente, 2026-11-24): el
 * léxico de las 16 invitadas del catálogo de money.ts. «reales» a
 * secas NO es el real brasileño — en Nicaragua es el dinero en
 * general; el real entra solo con su apellido («reales brasileños»,
 * «brazilian real», «brl»). */
const GUEST_WORDS: Array<{ code: string; re: RegExp }> = [
  { code: "EUR", re: /\b(euro|euros|eur)\b/ },
  { code: "GBP", re: /\b(libra|libras|pound|pounds|gbp)\b/ },
  { code: "MXN", re: /\b(pesos? mexicanos?|mxn)\b/ },
  { code: "CRC", re: /\b(colon|colones|crc)\b/ },
  { code: "GTQ", re: /\b(quetzal|quetzales|gtq)\b/ },
  { code: "HNL", re: /\b(lempira|lempiras|hnl)\b/ },
  { code: "PAB", re: /\b(balboa|balboas|pab)\b/ },
  { code: "DOP", re: /\b(pesos? dominicanos?|dop)\b/ },
  { code: "CAD", re: /\b(dolares? canadienses?|canadian dollars?|cad)\b/ },
  { code: "AUD", re: /\b(dolares? australianos?|australian dollars?|aud)\b/ },
  { code: "CHF", re: /\b(francos?( suizos?)?|swiss francs?|chf)\b/ },
  { code: "BRL", re: /\b(real|reales) brasilenos?\b|\bbrazilian real\b|\bbrl\b/ },
  { code: "COP", re: /\b(pesos? colombianos?|cop)\b/ },
  { code: "PEN", re: /\b(sol|soles|pen)\b/ },
  { code: "CNY", re: /\b(yuan|yuanes|cny|renminbi)\b/ },
  { code: "JPY", re: /\b(yen|yenes|jpy)\b/ },
];
function guestMatch(folded: string): { code: string; index: number; end: number } | null {
  for (const g of GUEST_WORDS) {
    const m = g.re.exec(folded);
    if (m) return { code: g.code, index: m.index, end: m.index + m[0].length };
  }
  return null;
}
function guestIn(folded: string): string | null {
  return guestMatch(folded)?.code ?? null;
}
function guestName(lang: Lang, code: string): string {
  const names: Record<string, [string, string]> = {
    EUR: ["euros", "euros"], GBP: ["libras", "pounds"], MXN: ["pesos mexicanos", "Mexican pesos"], CRC: ["colones", "colones"],
    GTQ: ["quetzales", "quetzales"], HNL: ["lempiras", "lempiras"], PAB: ["balboas", "balboas"], DOP: ["pesos dominicanos", "Dominican pesos"],
    CAD: ["dólares canadienses", "Canadian dollars"], AUD: ["dólares australianos", "Australian dollars"], CHF: ["francos suizos", "Swiss francs"],
    BRL: ["reales brasileños", "Brazilian reais"], COP: ["pesos colombianos", "Colombian pesos"], PEN: ["soles", "soles"],
    CNY: ["yuanes", "yuan"], JPY: ["yenes", "yen"],
  };
  return (names[code] ?? [code, code])[lang === "es" ? 0 : 1];
}
type AnyCur = Currency | string;
/** Formatea un minor en CUALQUIER moneda: las del libro con formatMoney, la invitada con formatGuest. */
function fmtAny(lang: Lang, minor: number, cur: AnyCur): string {
  return cur === "USD" || cur === "NIO" ? formatMoney(minor, cur, lang) : formatGuest(minor, cur, lang);
}
/** De cualquier moneda a centavos de dólar, con las tasas DEL LIBRO.
 * Devuelve null cuando la invitada no es la configurada: sin su tasa
 * no hay conversión honesta, y el Asesor jamás inventa una. */
function toUsdCents(state: LedgerState, minor: number, from: AnyCur): number | null {
  const rateE4 = state.settings.rateE4;
  if (from === "USD") return minor;
  if (from === "NIO") return convertMinor(minor, "NIO", "USD", rateE4);
  const g = state.settings.guestRate;
  if (!g || state.settings.guestCur !== from) return null;
  return fromGuestMinor(minor, g.per, from);
}
/** De centavos de dólar a cualquier moneda, con las tasas del libro. */
function fromUsdCents(state: LedgerState, usdCents: number, to: AnyCur): number | null {
  const rateE4 = state.settings.rateE4;
  if (to === "USD") return usdCents;
  if (to === "NIO") return convertMinor(usdCents, "USD", "NIO", rateE4);
  const g = state.settings.guestRate;
  if (!g || state.settings.guestCur !== to) return null;
  return toGuestMinor(usdCents, "USD", rateE4, g.per, to);
}
/** La frase de la tasa usada, nombrada con su fecha y su fuente cuando el libro las trae. */
function rateNote(state: LedgerState, lang: Lang, involvesGuest: string | null): string {
  const parts: string[] = [];
  parts.push(L(lang, `dólar–córdoba ${formatRate(state.settings.rateE4)}`, `dollar–córdoba ${formatRate(state.settings.rateE4)}`));
  if (involvesGuest) {
    const g = state.settings.guestRate;
    if (g) parts.push(`1 USD = ${g.per} ${involvesGuest}${g.asOf ? L(lang, ` (tasa del ${g.asOf}${g.source ? `, ${g.source}` : ""})`, ` (rate as of ${g.asOf}${g.source ? `, ${g.source}` : ""})`) : ""}`);
  }
  return L(lang, `Tasas de tu Mesa de cambio: ${parts.join(" · ")}. La manual que fijes manda sobre cualquier otra.`, `Your Exchange desk's rates: ${parts.join(" · ")}. A manual rate you set wins over any other.`);
}
/** La respuesta honesta cuando una invitada no tiene tasa en el libro. */
function guestNoRateResult(state: LedgerState, lang: Lang, code: string): Extract<BankResult, { kind: "answer" }> {
  const configured = state.settings.guestCur;
  return {
    kind: "answer", family: "conversor",
    verdict: configured
      ? L(lang, `Para convertir con ${guestName(lang, code)} necesito su tasa en tu Mesa de cambio, y no la tengo: tu moneda invitada es ${configured}${state.settings.guestRate ? ` (1 USD = ${state.settings.guestRate.per})` : ""}. No invento tasas — fíjala en la Mesa y te convierto al instante.`, `To convert with ${guestName(lang, code)} I need its rate at your Exchange desk, and I don't have it: your guest currency is ${configured}${state.settings.guestRate ? ` (1 USD = ${state.settings.guestRate.per})` : ""}. I don't invent rates — set it at the desk and I'll convert instantly.`)
      : L(lang, `Para convertir con ${guestName(lang, code)} necesito su tasa, y tu libro no tiene moneda invitada configurada en la Mesa de cambio. No invento tasas — configúrala y te convierto al instante.`, `To convert with ${guestName(lang, code)} I need its rate, and your book has no guest currency set at the Exchange desk. I don't invent rates — set one and I'll convert instantly.`),
    pieces: [], note: null, source: ["cambio.mesa"], lines: 0,
  };
}

function conversorAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  if (!/(cuanto (es|son|seria|vale)|convertir|convierte|a cuanto|en (dolares|cordobas|pesos)|how much is|convert)/.test(folded) && !guestIn(folded)) return null;
  const amounts = amountsIn(raw, c.display);
  // OLA 9 (CAZA-TRAMPAS clase 2): el conversor solo convierte cuando
  // convertir es LA operación de la pregunta — exactamente un monto y
  // ninguna operación competidora. «¿El 20% de 1500 dólares en
  // córdobas?» convertía el 20 suelto; «300 córdobas y 200 dólares,
  // ¿total?» trataba los NIO como USD. Con competencia, calla y la
  // operación verdadera (o el silencio honesto) toma la palabra.
  if (amounts.length !== 1) return null;
  if (/%|por ciento|porcentaje|percent|\btotal\b|suma|suman|envio|enviar|divid|repart/.test(folded)) return null;
  const a = amounts[0];
  /* LA INVITADA ENTRA A LA CONVERSIÓN (puerto de la Rama Agente,
   * 2026-11-24): la pared vieja («esa moneda no la proceso») cae. Si
   * la pregunta nombra una invitada, la conversión pasa por el dólar
   * con las tasas DEL LIBRO (rateE4 y la guestRate configurada); si
   * el libro no tiene la tasa de ESA invitada, la respuesta lo dice
   * y no inventa ninguna. */
  const gm = guestMatch(folded);
  let source: AnyCur = a.currency;
  let srcMinor = a.minor;
  let target: AnyCur | null = null;
  if (gm) {
    const otherRe = /(dolares|dollar|usd|cordobas|nio|pesos)\b/g;
    let otherM: RegExpExecArray | null;
    let other: { cur: Currency; index: number } | null = null;
    while ((otherM = otherRe.exec(folded)) !== null) {
      if (otherM.index >= gm.index && otherM.index < gm.end) continue; // dentro del nombre de la invitada («pesos mexicanos»)
      other = { cur: /^(cordobas|nio|pesos)$/.test(otherM[1]) ? "NIO" : "USD", index: otherM.index };
      break;
    }
    const guestIsTarget = /\b(en|a|to)\s+(\w{1,12}\s+)?$/.test(folded.slice(0, gm.index))
      || (other !== null && other.index < gm.index);
    if (guestIsTarget) {
      target = gm.code;
    } else {
      source = gm.code;
      const dec = guestDef(gm.code).dec;
      srcMinor = dec === 0 ? Math.round(a.minor / 100) : a.minor;
      target = other ? other.cur : c.display;
    }
  } else {
    target = /(cordobas|pesos|nio)/.test(folded) && a.currency === "USD" ? "NIO"
      : /(dolares|usd|dollar)/.test(folded) && a.currency === "NIO" ? "USD" : null;
  }
  if (!target || target === source) return null;
  const usd = toUsdCents(c.state, srcMinor, source);
  if (usd === null) return guestNoRateResult(c.state, c.lang, typeof source === "string" && source !== "USD" && source !== "NIO" ? source : String(target));
  const out = fromUsdCents(c.state, usd, target);
  if (out === null) return guestNoRateResult(c.state, c.lang, String(target));
  const inDisplay = (usdCents: number) => c.display === "USD" ? usdCents : convertMinor(usdCents, "USD", "NIO", c.rateE4);
  const fmt = (n: number, cur: AnyCur) => fmtAny(c.lang, n, cur);
  return {
    kind: "answer", family: "conversor",
    verdict: L(c.lang, `${fmt(srcMinor, source)} son ${fmt(out, target)} con la tasa de tu Mesa de cambio.`, `${fmt(srcMinor, source)} is ${fmt(out, target)} at your Exchange desk's rate.`),
    pieces: [{ label: fmt(srcMinor, source), minor: inDisplay(usd) }, { label: fmt(out, target), minor: inDisplay(usd) }],
    note: rateNote(c.state, c.lang, gm ? gm.code : null),
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
          ? L(c.lang, `«${due.name}» cayó el ${fmtFecha(c, due.on)} (hace ${-days} día${days === -1 ? "" : "s"}).`, `"${due.name}" fell on ${fmtFecha(c, due.on)} (${-days} day${days === -1 ? "" : "s"} ago).`)
          : days === 0
            ? L(c.lang, `«${due.name}» cae HOY (${fmtFecha(c, due.on)}).`, `"${due.name}" falls TODAY (${fmtFecha(c, due.on)}).`)
            : L(c.lang, `«${due.name}» cae el ${fmtFecha(c, due.on)} — en ${days} día${days === 1 ? "" : "s"}.`, `"${due.name}" falls on ${fmtFecha(c, due.on)} — in ${days} day${days === 1 ? "" : "s"}.`),
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
        verdict: L(c.lang, `El día ${day} cae ${names[wd]} — el ${fmtFecha(c, target)}, ${days === 0 ? "hoy mismo" : `en ${days} día${days === 1 ? "" : "s"}`}.`, `Day ${day} falls on a ${names[wd]} — ${fmtFecha(c, target)}, ${days === 0 ? "today itself" : `in ${days} day${days === 1 ? "" : "s"}`}.`),
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
          ? L(c.lang, `«${due.name}» venció hace ${-days} día${days === -1 ? "" : "s"} (el ${fmtFecha(c, due.on)}).`, `"${due.name}" was due ${-days} day${days === -1 ? "" : "s"} ago (${fmtFecha(c, due.on)}).`)
          : days === 0
            ? L(c.lang, `«${due.name}» vence HOY (${fmtFecha(c, due.on)}).`, `"${due.name}" is due TODAY (${fmtFecha(c, due.on)}).`)
            : L(c.lang, `A «${due.name}» le faltan ${days} día${days === 1 ? "" : "s"}: vence el ${fmtFecha(c, due.on)}.`, `"${due.name}" is ${days} day${days === 1 ? "" : "s"} away: due ${fmtFecha(c, due.on)}.`),
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
        verdict: L(c.lang, `Para el día ${day} faltan ${days} día${days === 1 ? "" : "s"}: cae el ${fmtFecha(c, target)}.`, `Day ${day} is ${days} day${days === 1 ? "" : "s"} away: it falls on ${fmtFecha(c, target)}.`),
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
      verdict: L(c.lang, `En ${n} ${unit} será el ${fmtFecha(c, iso)}.`, `In ${n} ${unit} it will be ${fmtFecha(c, iso)}.`),
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
/* OLA 40 · LAS PRIORIDADES Y EL INTERÉS (la caza del centro,
 * clase 3): cinco preguntas de cada mes que callaban enteras, y una
 * que se desviaba. El interés del mes no vive anotado como gasto —
 * vive en los saldos y las tasas del libro, y se CALCULA de ahí,
 * nombrado como cálculo. Las prioridades se responden con hechos
 * ordenados (el orden de vencimiento es el único orden que el
 * libro conoce), nunca con recomendación: la respuesta propone el
 * orden de los hechos y el toque dispone, como en el comparador. */
function prioridadesAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const money = c.money;
  const debts = planDebts(c.state, c.today);
  const src = ["cobros.debo", "cobros.tarjetas"];
  const doorPlan = reportDoor(c, "cobros.plan", "Ver el plan en Cobros · Plan de pago", "See the plan in Payments · Payoff plan");
  const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;

  /* EL INTERÉS DEL MES: «¿cuánto pago de intereses?» — la historia
   * lo desviaba («nada anotado como intereses») porque el interés
   * no es una línea: es saldo × tasa, y el libro trae los dos. */
  const interesVoice = /(interes|interest)/.test(folded)
    && /(cuanto (pago|es lo que pago|me sale|cuesta|hay)|cuanto de interes|how much (do i pay|interest|is my interest))/.test(folded)
    && !/(pasado|pague|pagado|last month|el mes pasado)/.test(folded);
  if (interesVoice) {
    if (!debts.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, "No tienes deudas anotadas: sin saldos ni tasas, no hay interés que sumar.", "You have no recorded debts: with no balances or rates, there's no interest to add up."), pieces: [], note: null, source: src, lines: 0 };
    const withInt = debts.filter((d) => d.monthlyInterest > 0);
    const total = withInt.reduce((a, d) => a + d.monthlyInterest, 0);
    if (!withInt.length) {
      return { kind: "answer", family: "deudas", verdict: L(c.lang, `Tus deudas anotadas (${debts.map((d) => `«${d.name}», ${money(d.left)}`).join("; ")}) no traen tasa: sin tasa en el libro, el interés no se puede sumar — ese es el dato que falta, y no lo invento.`, `Your recorded debts (${debts.map((d) => `"${d.name}", ${money(d.left)}`).join("; ")}) carry no rate: with no rate in the book, the interest can't be added up — that's the missing fact, and I won't invent it.`), pieces: debts.map((d) => ({ label: d.name, minor: d.left })), note: null, source: src, lines: 0 };
    }
    const parts = withInt.map((d) => L(c.lang, `«${d.name}»: ${money(d.monthlyInterest)} al mes (${pct(d.aprBps)} anual sobre ${money(d.left)})`, `"${d.name}": ${money(d.monthlyInterest)} a month (${pct(d.aprBps)} a year on ${money(d.left)})`)).join("; ");
    return {
      kind: "answer", family: "deudas",
      verdict: L(c.lang, `En intereses pagas unos ${money(total)} al mes, a las tasas anotadas en tu libro: ${parts}. No es un gasto que anotes línea a línea — es lo que tus saldos y tus tasas producen cada mes mientras los saldos no bajen.`, `In interest you pay about ${money(total)} a month, at the rates recorded in your book: ${parts}. It isn't an expense you record line by line — it's what your balances and your rates produce every month while the balances don't fall.`),
      pieces: [...withInt.map((d) => ({ label: d.name, minor: d.monthlyInterest })), { label: L(c.lang, "Interés del mes", "The month's interest"), minor: total }],
      note: L(c.lang, "El cálculo, dicho: saldo × tasa anual ÷ 12, deuda por deuda, con las tasas que tu libro trae — si una tasa cambia y no se anota, esta cifra envejece con ella.", "The math, stated: balance × annual rate ÷ 12, debt by debt, with the rates your book carries — if a rate changes and isn't recorded, this figure ages with it."),
      source: src, lines: 0, actions: doorPlan,
      graph: [{ id: "interes-mes", label: L(c.lang, "Tu interés de cada mes", "Your monthly interest"), minor: total, tense: "proyectado", flow: "stock", currency: c.display, assumption: { text: L(c.lang, "los saldos y las tasas tal como están anotados hoy", "the balances and rates exactly as recorded today"), origin: "libro" }, children: withInt.map((d) => ({ id: `int-${d.id}`, label: d.name, minor: d.monthlyInterest, tense: "proyectado" as const, flow: "flujo" as const, currency: c.display, sign: 1 as const })) }],
    };
  }

  /* LA DEUDA MÁS CARA: dos lecturas honestas — en dólares al mes y
   * en tasa — y se nombran las dos cuando no coinciden. */
  const caraVoice = /((cual|que) (deuda|tarjeta|prestamo|credito)|which debt|which card).{0,40}(cara|costosa|cuesta mas|sale mas|most expensive|costs (me )?(the )?most)/.test(folded)
    || /(deuda|tarjeta) mas (cara|costosa)/.test(folded);
  if (caraVoice) {
    if (!debts.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, "No tienes deudas anotadas: no hay una más cara que nombrar.", "You have no recorded debts: there's no costliest one to name."), pieces: [], note: null, source: src, lines: 0 };
    if (debts.length === 1) return { kind: "answer", family: "deudas", verdict: L(c.lang, `Solo tienes una deuda anotada: «${debts[0].name}», ${money(debts[0].left)}${debts[0].monthlyInterest > 0 ? ` — te cuesta ${money(debts[0].monthlyInterest)} al mes en interés (${pct(debts[0].aprBps)} anual)` : " — y no trae tasa anotada, así que su interés no se puede sumar"}.`, `You have only one recorded debt: "${debts[0].name}", ${money(debts[0].left)}${debts[0].monthlyInterest > 0 ? ` — it costs you ${money(debts[0].monthlyInterest)} a month in interest (${pct(debts[0].aprBps)} a year)` : " — and it carries no recorded rate, so its interest can't be added up"}.`), pieces: [{ label: debts[0].name, minor: debts[0].left }], note: null, source: src, lines: 0 };
    const byDollars = [...debts].sort((a, b) => b.monthlyInterest - a.monthlyInterest)[0];
    const byRate = [...debts].sort((a, b) => b.aprBps - a.aprBps)[0];
    return {
      kind: "answer", family: "deudas",
      verdict: byDollars.id === byRate.id
        ? L(c.lang, `La que más te cuesta es «${byDollars.name}»: ${money(byDollars.monthlyInterest)} al mes en interés, y también es la de la tasa más alta (${pct(byDollars.aprBps)} anual sobre ${money(byDollars.left)}). Las dos lecturas — el dinero y la tasa — señalan la misma.`, `The one that costs you most is "${byDollars.name}": ${money(byDollars.monthlyInterest)} a month in interest, and it's also the highest rate (${pct(byDollars.aprBps)} a year on ${money(byDollars.left)}). Both readings — the money and the rate — point at the same one.`)
        : L(c.lang, `Depende de la lectura, y te doy las dos: en dinero, la que más te cuesta es «${byDollars.name}» — ${money(byDollars.monthlyInterest)} al mes en interés (${pct(byDollars.aprBps)} sobre ${money(byDollars.left)}). En tasa, la más cara es «${byRate.name}» — ${pct(byRate.aprBps)} anual — pero su saldo es menor (${money(byRate.left)}), así que en dinero cuesta ${money(byRate.monthlyInterest)} al mes.`, `It depends on the reading, and here are both: in money, the costliest is "${byDollars.name}" — ${money(byDollars.monthlyInterest)} a month in interest (${pct(byDollars.aprBps)} on ${money(byDollars.left)}). By rate, the most expensive is "${byRate.name}" — ${pct(byRate.aprBps)} a year — but its balance is smaller (${money(byRate.left)}), so in money it costs ${money(byRate.monthlyInterest)} a month.`),
      pieces: [{ label: byDollars.name, minor: byDollars.monthlyInterest }, ...(byRate.id !== byDollars.id ? [{ label: byRate.name, minor: byRate.monthlyInterest }] : [])],
      note: null, source: src, lines: 0, actions: doorPlan,
    };
  }

  /* COMPLETA O MÍNIMO: los dos caminos de UNA tarjeta, corridos por
   * el motor del plan — meses e interés de cada uno, sin recomendar.
   * La tarjeta se reconoce también por su línea (saldo anotado):
   * planDebts no siempre marca revolving/card en las deudas que
   * nacen de una línea con balance. */
  const lineById = (id: string) => allLines(c).find((l) => l.id === id);
  const isCardDebt = (d: (typeof debts)[number]) => !!(d.revolving || d.card || (lineById(d.id)?.balanceMinor ?? null) !== null);
  const minimoVoice = /((completa|completo|full|pay (it|the card|the balance) off).{0,50}(minimo|minimum))|((minimo|minimum).{0,50}(completa|completo|full))/.test(folded);
  if (minimoVoice) {
    const card = debts.find((d) => isCardDebt(d)) ?? (debts.length === 1 ? debts[0] : null);
    if (!card) {
      /* CIERRE DEL CENTRO: la pregunta presupone una tarjeta que el
       * libro no trae — la ausencia se nombra, no se calla. */
      return { kind: "answer", family: "deudas", verdict: L(c.lang, "Completa o mínimo es una pregunta de tarjetas, y en tu libro no hay ninguna tarjeta con saldo anotada: ese camino no tiene qué correr. Si pagas una tarjeta que no está anotada, anótala con su saldo y su tasa y los dos caminos salen en el acto.", "Full or minimum is a credit-card question, and your book has no card with a recorded balance: that path has nothing to run on. If you pay a card that isn't recorded, record it with its balance and rate and both paths come out on the spot."), pieces: [], note: null, source: src, lines: 0 };
    }
    if (!isCardDebt(card)) {
      return { kind: "answer", family: "deudas", verdict: L(c.lang, `Lo único que traes es «${card.name}» — un préstamo, no una tarjeta: completa-o-mínimo es una pregunta de tarjetas (el mínimo es cosa de tarjetas). De préstamos sí puedo correrte el plan de pagos completo, si quieres.`, `The only thing you carry is "${card.name}" — a loan, not a card: full-or-minimum is a credit-card question (the minimum is a card thing). For loans I can run you the full payment plan, if you want.`), pieces: [{ label: card.name, minor: card.left }], note: null, source: src, lines: 0 };
    }
    const full = simulatePlan([card], card.left + card.monthlyInterest, "avalanche");
    const minFromLine = card.min === undefined ? (lineById(card.id)?.amountMinor ?? 0) : 0;
    const minAmt = card.min ?? minFromLine;
    const minRun = minAmt > card.monthlyInterest ? simulatePlan([card], minAmt, "avalanche") : null;
    const fullTxt = full ? L(c.lang, `pagarla completa hoy: sales en ${full.months} mes${full.months === 1 ? "" : "es"} y el interés que aún corre es ${money(full.interest)}`, `paying it in full today: you're out in ${full.months} month${full.months === 1 ? "" : "s"} and the interest still running is ${money(full.interest)}`) : L(c.lang, "pagarla completa hoy: sales de una vez", "paying it in full today: you're out at once");
    const minTxt = minRun
      ? L(c.lang, `al mínimo de ${money(minAmt)} al mes: ${minRun.months} meses y ${money(minRun.interest)} de interés`, `at the ${money(minAmt)} monthly minimum: ${minRun.months} months and ${money(minRun.interest)} in interest`)
      : minAmt > 0
        ? L(c.lang, `al mínimo de ${money(minAmt)}: la deuda no baja — el interés del mes (${money(card.monthlyInterest)}) se come el pago entero`, `at the ${money(minAmt)} minimum: the debt doesn't fall — the month's interest (${money(card.monthlyInterest)}) eats the whole payment`)
        : L(c.lang, `al mínimo: no traes la cuota mínima anotada de esta tarjeta, así que ese camino no se puede correr — el dato que falta es su mínimo`, `at the minimum: you don't carry this card's recorded minimum, so that path can't be run — the missing fact is its minimum`);
    const diff = full && minRun ? L(c.lang, ` La diferencia entre los dos caminos: ${money(minRun.interest - full.interest)} de interés y ${minRun.months - full.months} meses.`, ` The difference between the two paths: ${money(minRun.interest - full.interest)} of interest and ${minRun.months - full.months} months.`) : "";
    return {
      kind: "answer", family: "deudas",
      verdict: L(c.lang, `Con «${card.name}» (saldo ${money(card.left)}, ${pct(card.aprBps)} anual), los dos caminos, sin recomendarte ninguno: ${fullTxt}; ${minTxt}.${diff} Cuál pesa más es tu decisión: yo te enseño los caminos.`, `With "${card.name}" (balance ${money(card.left)}, ${pct(card.aprBps)} a year), the two paths, recommending none: ${fullTxt}; ${minTxt}.${diff} Which weighs more is your decision: I show you the paths.`),
      pieces: [{ label: L(c.lang, "El saldo", "The balance"), minor: card.left }, ...(full ? [{ label: L(c.lang, "Interés pagándola completa", "Interest paying it in full"), minor: full.interest }] : []), ...(minRun ? [{ label: L(c.lang, "Interés al mínimo", "Interest at the minimum"), minor: minRun.interest }] : [])],
      note: card.minGuess
        ? L(c.lang, "El mínimo que usé es el estimado del libro para esta tarjeta — no traes su cuota anotada; con la cuota real, el camino del mínimo se recalcula.", "The minimum I used is the book's estimate for this card — you don't carry its recorded installment; with the real one, the minimum path is recomputed.")
        : card.min === undefined && minFromLine > 0
          ? L(c.lang, `El pago mensual que caminé en el camino del mínimo es la cuota anotada de la tarjeta (${money(minFromLine)}) — si tu mínimo real es otro, ese camino se recalcula con él.`, `The monthly payment I walked on the minimum path is the card's recorded installment (${money(minFromLine)}) — if your real minimum is different, that path is recomputed with it.`)
          : null,
      source: src, lines: 0, actions: doorPlan,
    };
  }

  /* SI NO PAGO: el costo de saltarse un mes, con su dato ausente
   * nombrado (la multa no vive en el libro). */
  const skipVoice = /(que pasa|que pasaria|que ocurre|what if|what happens).{0,50}(no pago|dejo de pagar|me salto|no pagara|no la pago|no lo pago|miss|skip)/.test(folded)
    && /(tarjeta|deuda|prestamo|credito|card|debt|loan)/.test(folded);
  if (skipVoice) {
    if (!debts.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, "No tienes deudas anotadas: no hay un pago que saltarse en tu libro.", "You have no recorded debts: there's no payment in your book to skip."), pieces: [], note: null, source: src, lines: 0 };
    const wantsCard = /(tarjeta|card)/.test(folded);
    const d = (wantsCard ? debts.find((x) => isCardDebt(x)) : null) ?? debts.find((x) => x.monthlyInterest > 0) ?? debts[0];
    return {
      kind: "answer", family: "deudas",
      verdict: L(c.lang, `Si no pagas «${d.name}» este mes, el pago no desaparece — se mueve: el saldo crece a ${money(d.left + d.monthlyInterest)} con el interés del mes (${money(d.monthlyInterest)}, a su tasa del ${pct(d.aprBps)} anual), y el mes que viene el pago se junta con el siguiente. Lo que tu libro no trae es la multa por atraso de esta cuenta: ese costo existe en el contrato, no en tus notas, y no lo invento.`, `If you don't pay "${d.name}" this month, the payment doesn't disappear — it moves: the balance grows to ${money(d.left + d.monthlyInterest)} with the month's interest (${money(d.monthlyInterest)}, at its ${pct(d.aprBps)} annual rate), and next month the payment lands together with the following one. What your book doesn't carry is this account's late fee: that cost lives in the contract, not in your notes, and I won't invent it.`),
      pieces: [{ label: d.name, minor: d.left }, { label: L(c.lang, "El interés del mes saltado", "The skipped month's interest"), minor: d.monthlyInterest }],
      note: null, source: src, lines: 0, actions: doorPlan,
    };
  }

  /* ESTO O AQUELLO: dos obligaciones nombradas — el paseo del mes
   * dice si caben las dos y en qué orden vencen; si una es guardar,
   * la reserva se descuenta del cierre y se dice. Las obligaciones
   * se resuelven contra la ventana de vencimientos y las líneas del
   * mes (nombre entero o su primera palabra: «la tarjeta» nombra a
   * «Tarjeta Visa»); si alguna no se resuelve, no es esta forma. */
  const eitherM = /^(.*?)\s+(?:o|or)\s+(.*)$/.exec(folded);
  // OLA 62: los verbos cortos en inglés van con frontera de palabra:
  // «pay» suelto se disparaba dentro de «PayPal» y la comparación
  // entre dos cuentas del ahorro («¿tengo más en el Banco o en
  // PayPal?») se leía como dos obligaciones compitiendo por el mes.
  if (eitherM && /(pago|pagar|guardo|guardar|ahorro|ahorrar|\bpay\b|\bsave\b)/.test(folded) && !/(avalancha|bola de nieve|avalanche|snowball)/.test(folded)) {
    const nameHit = (seg: string, name: string): boolean => {
      const f = foldQ(name).trim();
      if (f.length < 3) return false;
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^a-z0-9])${esc(f)}([^a-z0-9]|$)`).test(seg)) return true;
      const first = f.split(" ")[0];
      return first.length >= 4 && new RegExp(`(^|[^a-z0-9])${esc(first)}([^a-z0-9]|$)`).test(seg);
    };
    const obligation = (seg: string): { display: string; amt: number; on: string | null } | null => {
      for (const d of duesWindow(c.state, 40, c.today)) {
        if (d.amt !== null && d.amt > 0 && d.kind !== "lent" && nameHit(seg, d.name)) return { display: d.name, amt: d.amt, on: d.on };
      }
      for (const l of c.state.months[c.key]?.lines ?? []) {
        if (l.active && isOut(l) && nameHit(seg, l.concept)) return { display: l.concept, amt: view(c, l), on: null };
      }
      return null;
    };
    const obA = obligation(eitherM[1]);
    const obB = obligation(eitherM[2]);
    if (obA && obB && obA.display !== obB.display) {
      const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
      const start = reading.left;
      const endIso = monthEndIso(c.today);
      const { events, counted } = scheduledEvents(c, daysBetweenIso(c.today, endIso));
      const w = walkEvents(start, events, endIso);
      const saveB = /(guard|ahorr|save)/.test(eitherM[2]);
      const closeAfter = saveB ? w.end - obB.amt : w.end;
      const bothFit = closeAfter >= 0 && w.min >= 0;
      const facts = L(c.lang, `Los hechos: «${obA.display}» pide ${money(obA.amt)}${obA.on ? ` y vence el ${fmtFecha(c, obA.on)}` : ""}; «${obB.display}» pide ${money(obB.amt)}${obB.on ? ` y vence el ${fmtFecha(c, obB.on)}` : ""}.`, `The facts: "${obA.display}" asks ${money(obA.amt)}${obA.on ? ` and falls on ${fmtFecha(c, obA.on)}` : ""}; "${obB.display}" asks ${money(obB.amt)}${obB.on ? ` and falls on ${fmtFecha(c, obB.on)}` : ""}.`);
      return {
        kind: "answer", family: "deudas",
        verdict: bothFit
          ? L(c.lang, `Con lo anotado caben las dos: caminando todo lo programado, el mes cierra en ${money(closeAfter)}${saveB ? ` — ya guardados los ${money(obB.amt)} de «${obB.display}»` : ""} y ningún día queda en negativo. ${facts} No hay que escoger: el libro alcanza para ambas, en su orden.`, `On what's recorded both fit: walking everything scheduled, the month closes at ${money(closeAfter)}${saveB ? ` — with the ${money(obB.amt)} for "${obB.display}" already set aside` : ""} and no day goes negative. ${facts} There's no choice to make: the book covers both, in their order.`)
          : L(c.lang, `Enteras, las dos no caben este mes: caminando lo programado el mes cierra en ${money(w.end)}${w.conflict ? ` y el primer tropiezo es «${w.conflict.ev.name}» el ${fmtFecha(c, w.conflict.ev.on)}, que te deja en ${money(w.conflict.bal)}` : ""}. ${facts} Cuál va primero es tu decisión — yo te enseño las fechas y las cifras.`, `Whole, the two don't fit this month: walking what's scheduled the month closes at ${money(w.end)}${w.conflict ? ` and the first stumble is "${w.conflict.ev.name}" on ${fmtFecha(c, w.conflict.ev.on)}, leaving you at ${money(w.conflict.bal)}` : ""}. ${facts} Which goes first is your decision — I show you the dates and the figures.`),
        pieces: [{ label: L(c.lang, "Queda de hoy", "Left today"), minor: start }, { label: L(c.lang, "Cierre del mes", "Month close"), minor: closeAfter }],
        note: counted.length ? L(c.lang, `Lo de este mes (${[...new Set(counted)].join(", ")}) ya está contado en tu queda de hoy: el paseo camina lo que aún no está en ella, para no restar nada dos veces.`, `This month's (${[...new Set(counted)].join(", ")}) is already counted in today's left: the walk covers what isn't in it yet, so nothing is subtracted twice.`) : null,
        source: ["libros.lineas", "cobros.cuotas", "central.queda"], lines: 0,
        actions: reportDoor(c, "central.pagos", "Ver los pagos que se acercan", "See the payments coming up"),
      };
    }
    /* CIERRE DEL CENTRO: NINGÚN lado se resuelve con esos nombres
     * (ni la tarjeta ni «la renta» — su vivienda se anota «Casa»):
     * la ausencia doble se nombra y se enseña lo que sí vence. */
    if (!obA && !obB && /(tarjeta|card|deuda|debt|prestamo|loan|renta|rent)/.test(folded)) {
      const upcoming = duesWindow(c.state, 40, c.today).filter((d) => d.amt !== null && d.amt > 0 && d.kind !== "lent").slice(0, 2);
      const upTxt = upcoming.length ? L(c.lang, ` Lo que sí tienes anotado que vence: ${upcoming.map((d) => `«${d.name}» ${money(d.amt!)} el ${fmtFecha(c, d.on)}`).join(" y ")}. Con los nombres de tu libro, la comparación se camina en el acto.`, ` What you do have recorded coming due: ${upcoming.map((d) => `"${d.name}" ${money(d.amt!)} on ${fmtFecha(c, d.on)}`).join(" and ")}. With your book's own names, the comparison gets walked on the spot.`) : "";
      return {
        kind: "answer", family: "deudas",
        verdict: L(c.lang, `Ninguno de los dos lados está en tu libro con ese nombre: no tienes una tarjeta anotada, ni una línea llamada «renta» — con esos nombres la comparación no se puede caminar.${upTxt}`, `Neither side is in your book under that name: you have no recorded card, and no line called "rent" — under those names the comparison can't be walked.${upTxt}`),
        pieces: upcoming.map((d) => ({ label: d.name, minor: d.amt! })),
        note: null, source: ["libros.lineas", "cobros.cuotas"], lines: 0,
      };
    }
    /* CIERRE DEL CENTRO: un lado nombra una deuda que el libro no
     * trae («la tarjeta» sin tarjeta anotada) — la ausencia se
     * nombra y el lado que sí está se enseña con su cifra. */
    if ((obA && !obB) || (!obA && obB)) {
      const missingSeg = obA ? eitherM[2] : eitherM[1];
      const found = (obA ?? obB)!;
      if (/(tarjeta|card|deuda|debt|prestamo|loan|credito|credit)/.test(missingSeg)) {
        const what = /(tarjeta|card)/.test(missingSeg) ? L(c.lang, "una tarjeta", "a card") : L(c.lang, "esa deuda", "that debt");
        return {
          kind: "answer", family: "deudas",
          verdict: L(c.lang, `Un lado de tu pregunta no está en tu libro: no tienes ${what} anotada, así que ese lado no se puede caminar — la pregunta la trae, tu libro no. El otro lado sí está: «${found.display}» pide ${money(found.amt)}${found.on ? ` y vence el ${fmtFecha(c, found.on)}` : ""}. Si esa cuenta existe fuera del libro, anótala y los dos lados se caminan juntos.`, `One side of your question isn't in your book: you have no ${what} recorded, so that side can't be walked — your question brings it, your book doesn't. The other side is there: "${found.display}" asks ${money(found.amt)}${found.on ? ` and falls on ${fmtFecha(c, found.on)}` : ""}. If that account exists outside the book, record it and both sides get walked together.`),
          pieces: [{ label: found.display, minor: found.amt }],
          note: null, source: ["libros.lineas", "cobros.cuotas"], lines: 0,
        };
      }
    }
  }

  /* ¿QUÉ PAGO PRIMERO?: el orden de vencimiento, con la queda
   * caminando detrás de cada pago — el único orden que el libro
   * conoce, enseñado como hechos. */
  const primeroVoice = /((que|qué|cual) (pago|debo pagar|pagar|sale) primero|what (should|do) i pay first|which (bill|payment|debt) (first|do i pay first))/.test(folded);
  if (primeroVoice) {
    const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const start = reading.left;
    const dues = duesWindow(c.state, 35, c.today).filter((d) => d.amt !== null && d.amt > 0 && d.kind !== "lent");
    if (!dues.length) {
      return { kind: "answer", family: "deudas", verdict: L(c.lang, `No tienes pagos con fecha y monto en los próximos 35 días: sin vencimientos anotados no hay un «primero» que ordenar. Tu queda de hoy es ${money(start)}.`, `You have no dated payments with amounts in the next 35 days: with no recorded dues there's no "first" to order. Your left today is ${money(start)}.`), pieces: [{ label: L(c.lang, "Queda de hoy", "Left today"), minor: start }], note: null, source: ["cobros.cuotas", "central.queda"], lines: 0 };
    }
    let bal = start;
    const steps: string[] = [];
    const pieces: BankPiece[] = [{ label: L(c.lang, "Queda de hoy", "Left today"), minor: start }];
    let breakAt = -1;
    dues.slice(0, 6).forEach((d, i) => {
      bal -= d.amt ?? 0;
      if (bal < 0 && breakAt < 0) breakAt = i;
      steps.push(L(c.lang, `${i + 1}. «${d.name}», el ${fmtFecha(c, d.on)}: ${money(d.amt ?? 0)} — te quedan ${money(bal)}`, `${i + 1}. "${d.name}", on ${fmtFecha(c, d.on)}: ${money(d.amt ?? 0)} — leaving you ${money(bal)}`));
      pieces.push({ label: d.name, minor: -(d.amt ?? 0) });
    });
    const more = dues.length > 6 ? L(c.lang, ` Y siguen ${dues.length - 6} más en la ventana.`, ` And ${dues.length - 6} more follow in the window.`) : "";
    return {
      kind: "answer", family: "deudas",
      verdict: L(c.lang, `El orden en que vencen — el único orden que tu libro conoce — con tu queda caminando detrás de cada uno. Partes de ${money(start)}: ${steps.join("; ")}.${more}${breakAt >= 0 ? ` Ojo: hasta el ${breakAt + 1}.º alcanza; «${dues[breakAt].name}» ya te deja en negativo — ahí es donde el mes pide una decisión, y es tuya.` : " Con lo anotado, todos caben en su orden."}`, `The order they fall due — the only order your book knows — with your left walking behind each one. You start from ${money(start)}: ${steps.join("; ")}.${more}${breakAt >= 0 ? ` Mind you: your money reaches through #${breakAt}; "${dues[breakAt].name}" already leaves you negative — that's where the month asks for a decision, and it's yours.` : " On what's recorded, they all fit in their order."}`),
      pieces, note: L(c.lang, "El orden es el de las fechas anotadas, no una recomendación: si una cuenta cobrara más interés que otra, ese es otro dato — pregúntame cuál deuda te sale más cara y lo ponemos al lado.", "The order is the recorded dates', not a recommendation: if one account charged more interest than another, that's a different fact — ask me which debt costs you most and we'll set it alongside."),
      source: ["cobros.cuotas", "central.queda"], lines: 0,
      actions: reportDoor(c, "central.pagos", "Ver los pagos que se acercan", "See the payments coming up"),
    };
  }

  return null;
}

/* OLA 31 · EL COMPARADOR DE DEUDAS (investigación II, mecanismo
 * #5): avalancha y bola de nieve corridas por el MISMO motor del
 * plan (simulatePlan), enseñadas lado a lado — meses, interés
 * total, primera cuenta que cierra y cierres al mes 6 — SIN
 * recomendar ninguna. El teorema manda la forma: la ventaja de un
 * orden sobre otro es función del desacuerdo entre el orden por
 * saldo y el orden por tasa; si con TUS deudas los dos órdenes son
 * el mismo camino, la ventaja es CERO y se dice cero. Lo que la
 * nieve gana cuando gana no es dinero: cierra cuentas antes, y
 * cerrar cuentas es lo que predice terminar (Gal & McShane 2012)
 * — se reporta como dato, jamás como consejo. El HÍBRIDO (la más
 * pequeña primero y luego por tasa) se corre por el mismo motor
 * subiendo la tasa de ordenación de la más pequeña SOLO cuando
 * esa deuda no es revolvente (su interés no depende de la tasa de
 * ordenación); si la más pequeña es una tarjeta, su cifra no se
 * inventa: la nota declara la costura. */
function comparadorAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  if (!/(avalancha|bola de nieve|avalanche|snowball|que orden|en que orden|cual orden|orden de pago|orden para pagar)/.test(folded)) return null;
  const debts = planDebts(c.state, c.today);
  const src = ["cobros.plan", "cobros.debo"];
  if (!debts.length) {
    return { kind: "answer", family: "deudas", verdict: L(c.lang, "No tienes deudas anotadas: sin deudas no hay órdenes que comparar.", "You have no recorded debts: with no debts there are no orders to compare."), pieces: [], note: null, source: src, lines: 0 };
  }
  if (debts.length === 1) {
    return { kind: "answer", family: "deudas", verdict: L(c.lang, `Solo tienes una deuda anotada («${debts[0].name}», ${c.money(debts[0].left)}): con una sola cuenta no hay orden que comparar — todo el plan va a ella.`, `You have only one recorded debt (\"${debts[0].name}\", ${c.money(debts[0].left)}): with a single account there's no order to compare — the whole plan goes to it.`), pieces: [{ label: debts[0].name, minor: debts[0].left }], note: null, source: src, lines: 0 };
  }
  const brought = amountsIn(raw, c.display);
  const plan = payoffPlan(c.state, c.today);
  const budget = brought.length ? Math.max(...brought.map((a) => convertMinor(a.minor, a.currency, c.display, c.rateE4))) : plan.budget;
  if (budget <= 0) {
    return { kind: "answer", family: "deudas", verdict: L(c.lang, "Para comparar los dos órdenes necesito el monto mensual del plan — y no traes uno en la pregunta ni hay un plan guardado o un ritmo reciente de pagos. Dime «con $300 al mes» y te enseño los dos caminos.", "To compare the two orders I need the plan's monthly amount — and you brought none in the question, and there's no saved plan or recent payment pace. Tell me \\\"with $300 a month\\\" and I'll show you both paths."), pieces: [], note: null, source: src, lines: 0 };
  }
  const av = simulatePlan(debts, budget, "avalanche");
  const sb = simulatePlan(debts, budget, "snowball");
  if (!av || !sb) {
    const monthlyInterest = debts.reduce((s, d) => s + d.monthlyInterest, 0);
    return { kind: "answer", family: "deudas", verdict: L(c.lang, `Con ${c.money(budget)} al mes ninguno de los dos caminos corre: el interés de tus deudas suma ${c.money(monthlyInterest)} al mes y el presupuesto no lo pasa — la deuda crecería en vez de bajar. La comparación pide un monto mayor.`, `With ${c.money(budget)} a month neither path runs: your debts' interest adds up to ${c.money(monthlyInterest)} a month and the budget doesn't clear it — the debt would grow instead of shrink. The comparison needs a larger amount.`), pieces: [], note: null, source: src, lines: 0 };
  }
  const nameOf = (id: string) => debts.find((d) => d.id === id)?.name ?? id;
  const orderNames = (run: PlanRun) => (run ? run.order.map(nameOf).join(", ") : "");
  const firstClose = (run: PlanRun): { name: string; month: number } | null => {
    if (!run) return null;
    let best: { name: string; month: number } | null = null;
    for (const [id, m] of Object.entries(run.finish)) if (!best || m < best.month) best = { name: nameOf(id), month: m };
    return best;
  };
  const closures6 = (run: PlanRun) => (run ? Object.values(run.finish).filter((m) => m <= 6).length : 0);
  const monthName = (m: number) => { const k = monthAhead(m, c.today); return `${MONTH_LABELS[k.slice(5, 7).replace(/^0/, "")][c.lang === "en" ? 1 : 0]} ${k.slice(0, 4)}`; };
  const sameOrder = av.order.join("|") === sb.order.join("|");
  // El híbrido: la más pequeña primero (por ordenación), luego tasa.
  const smallest = [...debts].sort((a, b) => a.left - b.left)[0];
  const hybrid: PlanRun = smallest.revolving
    ? null
    : simulatePlan(debts.map((d) => (d.id === smallest.id ? { ...d, aprBps: 9_999_999, freeMonths: 0 } : d)), budget, "avalanche");
  const budgetNote = brought.length
    ? L(c.lang, `El monto del plan es el que trajiste: ${c.money(budget)} al mes.`, `The plan amount is the one you brought: ${c.money(budget)} a month.`)
    : L(c.lang, `El monto del plan es ${c.money(budget)} al mes${plan.fromUser ? ", el de tu plan guardado" : ", tu ritmo medido de pagos recientes"}.`, `The plan amount is ${c.money(budget)} a month${plan.fromUser ? ", from your saved plan" : ", your measured pace of recent payments"}.`);
  const hybridNote = smallest.revolving
    ? L(c.lang, "El camino intermedio (la más pequeña primero y luego por tasa) no te lo numero: tu deuda más pequeña es una tarjeta y su interés depende de la tasa, así que moverla en el orden movería su cifra — el motor de planes ordena de dos maneras y no invento la tercera.", "The middle path (smallest first, then by rate) I won't put a number on: your smallest debt is a card and its interest depends on its rate, so moving it in the order would move its figure — the plan engine orders two ways and I won't invent the third.")
    : null;
  const note = [budgetNote, hybridNote].filter(Boolean).join(" ");
  const runLine = (label: string, run: PlanRun): string => {
    const fc = firstClose(run);
    return L(c.lang, `${label} (${orderNames(run)}): terminas en ${run!.months} meses, pagas ${c.money(run!.interest)} de interés, la primera cuenta que cierra es «${fc?.name}» en ${monthName(fc?.month ?? 0)} y al mes 6 llevas ${closures6(run)} cerrada${closures6(run) === 1 ? "" : "s"}.`, `${label} (${orderNames(run)}): you're done in ${run!.months} months, you pay ${c.money(run!.interest)} in interest, the first account to close is \"${fc?.name}\" in ${monthName(fc?.month ?? 0)} and by month 6 you have ${closures6(run)} closed.`);
  };
  if (sameOrder) {
    return {
      kind: "answer", family: "deudas",
      verdict: L(c.lang, `Con tus deudas, la avalancha y la bola de nieve son EL MISMO camino — el orden por tasa y el orden por saldo coinciden, así que la ventaja de uno sobre otro es cero, y se dice cero. ${runLine(L(c.lang, "El camino", "The path"), av)}`, `With your debts, avalanche and snowball are THE SAME path — the order by rate and the order by balance agree, so one's advantage over the other is zero, and zero is what's said. ${runLine("The path", av)}`),
      pieces: [{ label: L(c.lang, "Interés total del camino", "The path's total interest"), minor: av.interest }],
      note, source: src, lines: 0,
      actions: reportDoor(c, "cobros.plan", "Ver el plan en Cobros · Plan de pago", "See the plan in Payments · Payoff plan"),
    };
  }
  const dInterest = sb.interest - av.interest;
  const dMonths = sb.months - av.months;
  const fcSb = firstClose(sb);
  const fcAv = firstClose(av);
  const hybridLine = hybrid
    ? L(c.lang, ` El intermedio (primero «${smallest.name}», la más pequeña, y luego por tasa): terminas en ${hybrid.months} meses y pagas ${c.money(hybrid.interest)} de interés.`, ` The middle path (\"${smallest.name}\" first, the smallest, then by rate): you're done in ${hybrid.months} months and pay ${c.money(hybrid.interest)} in interest.`)
    : "";
  return {
    kind: "answer", family: "deudas",
    verdict: L(c.lang, `Con ${c.money(budget)} al mes, los caminos, sin recomendarte ninguno. ${runLine("Avalancha — la tasa más alta primero", av)} ${runLine("Bola de nieve — el saldo más chico primero", sb)}${hybridLine} La diferencia en dinero: la avalancha paga ${c.money(Math.abs(dInterest))} ${dInterest >= 0 ? "menos" : "más"} de interés${dMonths !== 0 ? ` y termina ${Math.abs(dMonths)} mes${Math.abs(dMonths) === 1 ? "" : "es"} ${dMonths > 0 ? "antes" : "después"}` : " y terminan el mismo mes"}. Lo que la bola de nieve gana no es dinero: cierra su primera cuenta en ${monthName(fcSb?.month ?? 0)} (la avalancha, en ${monthName(fcAv?.month ?? 0)}), y cerrar cuentas pronto es lo que la investigación asocia con llegar hasta el final. Cuál pesa más es tu decisión: yo te enseño los caminos.`, `With ${c.money(budget)} a month, the paths, recommending none. ${runLine("Avalanche — highest rate first", av)} ${runLine("Snowball — smallest balance first", sb)}${hybridLine} The money difference: avalanche pays ${c.money(Math.abs(dInterest))} ${dInterest >= 0 ? "less" : "more"} interest${dMonths !== 0 ? ` and finishes ${Math.abs(dMonths)} month${Math.abs(dMonths) === 1 ? "" : "s"} ${dMonths > 0 ? "sooner" : "later"}` : " and they finish in the same month"}. What snowball wins isn't money: it closes its first account in ${monthName(fcSb?.month ?? 0)} (avalanche, in ${monthName(fcAv?.month ?? 0)}), and closing accounts early is what research links to seeing it through. Which weighs more is your decision: I show you the paths.`),
    pieces: [
      { label: L(c.lang, "Avalancha · interés total", "Avalanche · total interest"), minor: av.interest },
      { label: L(c.lang, "Bola de nieve · interés total", "Snowball · total interest"), minor: sb.interest },
      ...(hybrid ? [{ label: L(c.lang, "Intermedio · interés total", "Middle path · total interest"), minor: hybrid.interest }] : []),
    ],
    note, source: src, lines: 0,
    actions: reportDoor(c, "cobros.plan", "Ver el plan en Cobros · Plan de pago", "See the plan in Payments · Payoff plan"),
    figure: {
      kind: "lado",
      points: [
        { label: `${L(c.lang, "Avalancha", "Avalanche")} · ${L(c.lang, "libre en", "free in")} ${monthName(av.months)}`, minor: av.interest, mark: "cierre" },
        { label: `${L(c.lang, "Bola de nieve", "Snowball")} · ${L(c.lang, "libre en", "free in")} ${monthName(sb.months)}`, minor: sb.interest, mark: "cierre" },
        ...(hybrid ? [{ label: `${L(c.lang, "Intermedio", "Middle path")} · ${L(c.lang, "libre en", "free in")} ${monthName(hybrid.months)}`, minor: hybrid.interest, mark: "cierre" as const }] : []),
      ],
      note: null,
    },
  };
}

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
  const amounts = amountsIn(raw, c.display);
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
    ...(base && newBudget !== plan.budget && (base.months !== run.months || base.interest !== run.interest)
      ? {
          figure: {
            kind: "lado" as const,
            points: [
              { label: `${L(c.lang, "Tu ritmo", "Your pace")} · ${L(c.lang, "libre en", "free in")} ${(() => { const k = monthAhead(base.months, c.today); const [by, bm] = k.split("-").map(Number); return `${MONTH_LABELS[bm][c.lang === "en" ? 1 : 0]} ${by}`; })()}`, minor: base.interest, mark: "cierre" as const },
              { label: `${L(c.lang, "Con este pago", "With this payment")} · ${L(c.lang, "libre en", "free in")} ${whenLabel}`, minor: run.interest, mark: "cierre" as const },
            ],
            note: null,
          },
        }
      : {}),
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
  const amounts = amountsIn(raw, c.display);
  if (!amounts.length) return null;
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  const people: Array<{ name: string }> = [...peopleOf(c.state, "owe", c.today), ...peopleOf(c.state, "owed", c.today), ...(c.state.remitPeople ?? [])];
  const personName = (label: string): string | null => {
    const f = foldQ(label).trim();
    // OLA 28 (Familia 2, E28-2): «me» es el yo inglés — sin él, la
    // parte del propio usuario en el reparto inglés no tenía nombre
    // y el reparto entero caía por una parte muda.
    if (/^(mi|yo|mí|me)$/.test(f)) return L(c.lang, "Tú", "You");
    /* OLA 67: el rótulo en inglés nombra por parentesco («40 for
     * mom») — el puente de parentesco resuelve contra las
     * personas del libro, como en remesas y recencia. */
    const p = people.find((x) => foldQ(x.name) === f || f.startsWith(foldQ(x.name)) || personNamedIn(f, x.name));
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
      figure: {
        kind: "barras",
        points: [...shares.map((s) => ({ label: s.name, minor: s.minor })), ...(rest > 0 ? [{ label: L(c.lang, "Sin repartir", "Unassigned"), minor: rest }] : [])],
        band: { floor: 0, total: total ?? sum },
        note: null,
      },
    };
  }
  if (!hasVerb && shares.length < 2) return null;
  // Forma 2: el reparto igual entre una lista nombrada («entre mamá,
  // Carlos y yo», «éramos mamá, Carlos y yo») — el total traído se
  // divide entre los nombrados.
  const rosterM = folded.match(/(?:entre|con|eramos|somos|fuimos|between|among)\s+([a-záéíóúñ ,y]+?)(?:\?|$|\.|,?\s*(?:cuanto|como|que))/);
  if (rosterM && total !== null) {
    const names = rosterM[1].split(/\s*,\s*|\s+y\s+|\s+and\s+/).map((t) => personName(t)).filter((x): x is string => !!x);
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
        figure: {
          kind: "barras",
          points: pieces.map((p) => ({ label: p.label, minor: p.minor })),
          band: { floor: 0, total },
          note: null,
        },
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
  // OLA 26 (U5, el disfraz): el filtro que no resuelve NO se ignora —
  // la versión anterior respondía el mes TOTAL a «¿en qué mes gasto
  // más en el súper?», una cifra real para otra pregunta. Sin filtro y
  // con una palabra que el libro no conoce, la ausencia se nombra,
  // como la nombra historia; con filtro y sin un solo mes, también.
  if (!filter) {
    const stray = strayFilterWord(c, folded);
    if (stray) {
      return {
        kind: "answer", family: "estacionalidad",
        verdict: L(c.lang, `No tengo nada anotado como «${stray}»: sin gasto con ese nombre no hay mes fuerte que buscar. Si lo anotas con otro nombre, pregúntame por ese.`, `I have nothing recorded as "${stray}": with no spending under that name there's no strongest month to find. If you record it under another name, ask me by that one.`),
        pieces: [], note: null, source: ["historial.stream"], lines: 0,
      };
    }
  }
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
  if (!byMonth.size) {
    if (filter) {
      return {
        kind: "answer", family: "estacionalidad",
        verdict: L(c.lang, "No tienes gasto anotado en eso en ningún mes: no hay mes fuerte que nombrar.", "You have no recorded spending on that in any month: there's no strongest month to name."),
        pieces: [], note: null, source: ["historial.stream"], lines: 0,
      };
    }
    return null;
  }
  const rows = [...byMonth.entries()].sort((a, b) => b[1] - a[1]);
  const avg = Math.round(rows.reduce((a, r) => a + r[1], 0) / rows.length);
  const label = (mk: string) => { const [y, m] = mk.split("-").map(Number); return `${MONTH_LABELS[m][c.lang === "en" ? 1 : 0]} ${y}`; };
  return {
    kind: "answer", family: "estacionalidad",
    verdict: L(c.lang, `Tu mes más fuerte es ${label(rows[0][0])}: ${c.money(rows[0][1])}. Tu media por mes anotado es ${c.money(avg)} — ese mes gastaste ${rows[0][1] - avg > 0 ? `${c.money(rows[0][1] - avg)} por encima` : "en la media"}.`, `Your strongest month is ${label(rows[0][0])}: ${c.money(rows[0][1])}. Your average per recorded month is ${c.money(avg)} — that month ran ${rows[0][1] - avg > 0 ? `${c.money(rows[0][1] - avg)} above` : "at the average"}.`),
    pieces: rows.slice(0, 3).map((r) => ({ label: label(r[0]), minor: r[1] })),
    note: null, source: ["historial.stream"], lines: rows.length,
    actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    figure: {
      kind: "meses",
      points: [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((r) => ({ label: label(r[0]), minor: r[1] })),
      band: { floor: 0, median: avg, total: rows[0][1] },
      note: null,
    },
  };
}

/* OLA 43 · EL INGRESO QUE SE MUEVE (la caza del centro, clase 6):
 * la sensibilidad y el contrafactual existían solo para el GASTO.
 * El ingreso también se mueve — baja el sueldo, no entra el
 * negocio — y esas preguntas callaban enteras. Las dos formas
 * nuevas miden el ingreso con las mismas reglas: el escenario se
 * declara, la cifra se camina contra el mes, nada se ejecuta. */
function ingresoConcepto(c: Ctx, folded: string): { name: string; thisMonth: number; typical: number } | null {
  const byConcept = new Map<string, { byMonth: Map<string, number> }>();
  for (const l of allLines(c)) {
    if (!l.active || !/^income/.test(l.kind) || !l.concept) continue;
    if (!byConcept.has(l.concept)) byConcept.set(l.concept, { byMonth: new Map() });
    const e = byConcept.get(l.concept)!;
    e.byMonth.set(l.monthKey, (e.byMonth.get(l.monthKey) ?? 0) + view(c, l));
  }
  if (!byConcept.size) return null;
  const medianOf = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
  const build = (name: string) => {
    const e = byConcept.get(name)!;
    const months = [...e.byMonth.entries()].filter(([k]) => k <= c.key).map(([, v]) => v);
    return { name, thisMonth: e.byMonth.get(c.key) ?? 0, typical: medianOf(months) };
  };
  // El nombrado en la pregunta manda; si no, el sueldo/salario.
  for (const name of byConcept.keys()) if (foldQ(name).length >= 3 && new RegExp(`(^|[^a-z0-9])${foldQ(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded)) return build(name);
  // «No vendo nada» y «the business» hablan del ingreso que se
  // vende — el variable — y mandan sobre la preferencia por el
  // sueldo: la pregunta nombra la fuente por su naturaleza.
  if (/(vendo|vender|venta|ventas|sell|selling|sales|business|negocio)/.test(folded)) {
    for (const l of allLines(c)) if (l.active && l.kind === "income-variable" && l.concept && byConcept.has(l.concept)) return build(l.concept);
  }
  for (const name of byConcept.keys()) if (/(sueldo|salario|salary|paycheck|wage)/i.test(name)) return build(name);
  if (byConcept.size === 1) return build([...byConcept.keys()][0]);
  return null;
}

function ingresoSensibilidadAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  if (!/(bajan|baja|bajara|recort|reduc|drops?|drop|cut|lower|reduced?)/.test(folded)) return null;
  if (!/(sueldo|salario|ingreso|salary|paycheck|income|wage|paga)/.test(folded)) return null;
  const src = ingresoConcepto(c, folded);
  if (!src) return null;
  const base = src.thisMonth > 0 ? src.thisMonth : src.typical;
  if (base <= 0) return null;
  const pctM = folded.match(/(\d+(?:[.,]\d+)?)\s?%/);
  const amounts = amountsIn(raw, c.display);
  let newAmt: number | null = null;
  let pctTxt = "";
  if (pctM) {
    const pct = Number(pctM[1].replace(",", "."));
    if (pct > 0 && pct < 100) { newAmt = Math.round(base * (1 - pct / 100)); pctTxt = ` (−${pct}%)`; }
  } else if (amounts.length) {
    const a = convertMinor(amounts[0].minor, amounts[0].currency, c.display, c.rateE4);
    if (a < base) newAmt = a;
    else {
      /* CIERRE DEL CENTRO: el monto traído no es una baja contra lo
       * anotado — es una subida, y se dice con su dirección. */
      const readingR = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
      const bookedR = src.thisMonth > 0;
      const notSalary = /(sueldo|salario|salary|paycheck)/.test(folded) && !/(sueldo|salario|salary|paycheck)/i.test(src.name);
      return {
        kind: "answer", family: "hipotetico",
        verdict: L(c.lang, `Eso no es una baja: en tu libro, ${src.name} — tu ingreso anotado${notSalary ? " (no traes un sueldo anotado como tal)" : ""} — es de ${c.money(base)}${bookedR ? " este mes" : " en el mes típico"}; ${c.money(a)} sería una subida de ${c.money(a - base)}. ${bookedR ? `Con esa subida, este mes cerraría en ${c.money(readingR.left + (a - base))} en vez de ${c.money(readingR.left)}.` : "Con esa subida, tu mes típico ganaría ese margen."} Lo digo porque la pregunta traía una baja: con los números de tu libro, la dirección es la otra.`, `That's not a cut: in your book, ${src.name} — your recorded income${notSalary ? " (you don't carry a salary recorded as such)" : ""} — is ${c.money(base)}${bookedR ? " this month" : " in the typical month"}; ${c.money(a)} would be a raise of ${c.money(a - base)}. ${bookedR ? `With that raise, this month would close at ${c.money(readingR.left + (a - base))} instead of ${c.money(readingR.left)}.` : "With that raise, your typical month would gain that much room."} I'm saying it because the question brought a cut: with your book's numbers, the direction is the other one.`),
        pieces: [{ label: L(c.lang, `${src.name} hoy`, `${src.name} today`), minor: base }, { label: L(c.lang, "El monto de tu pregunta", "Your question's amount"), minor: a }],
        note: null, source: ["asesor.lectura", "libros.lineas"], lines: 0,
      };
    }
  }
  if (newAmt === null) return null;
  const delta = base - newAmt;
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const booked = src.thisMonth > 0;
  const closeNow = booked ? reading.left : null;
  const closeNew = booked ? reading.left - delta : null;
  return {
    kind: "answer", family: "hipotetico",
    verdict: booked
      ? L(c.lang, `Si ${src.name} baja de ${c.money(base)} a ${c.money(newAmt)}${pctTxt}, este mes cierra en ${c.money(closeNew!)} en vez de ${c.money(closeNow!)}: ${closeNew! >= 0 ? `sigue cerrando en positivo, con ${c.money(closeNew!)} de margen` : `el mes pasa a negativo por ${c.money(-closeNew!)}`}. El supuesto, dicho: la baja corre el mes entero y todo lo demás queda igual — es el escenario de tu pregunta, no un hecho anotado.`, `If ${src.name} drops from ${c.money(base)} to ${c.money(newAmt)}${pctTxt}, this month closes at ${c.money(closeNew!)} instead of ${c.money(closeNow!)}: ${closeNew! >= 0 ? `it still closes positive, with ${c.money(closeNew!)} of room` : `the month goes negative by ${c.money(-closeNew!)}`}. The assumption, stated: the cut runs the whole month and everything else stays the same — it's your question's scenario, not a recorded fact.`)
      : L(c.lang, `Si ${src.name} baja de ${c.money(base)} a ${c.money(newAmt)}${pctTxt}, tu mes típico perdería ${c.money(delta)} de entrada: es la resta de tu escenario, con todo lo demás igual. Este mes esa entrada aún no está anotada, así que la cuenta corre sobre tu mes típico, no sobre el mes en curso.`, `If ${src.name} drops from ${c.money(base)} to ${c.money(newAmt)}${pctTxt}, your typical month would lose ${c.money(delta)} of income: that's your scenario's subtraction, with everything else the same. That income isn't recorded yet this month, so the math runs on your typical month, not the current one.`),
    pieces: [{ label: L(c.lang, `${src.name} hoy`, `${src.name} today`), minor: base }, { label: L(c.lang, "Con la baja", "With the cut"), minor: newAmt }, ...(closeNew !== null ? [{ label: L(c.lang, "El mes cerraría", "The month would close"), minor: closeNew }] : [{ label: L(c.lang, "Lo que se pierde al mes", "Lost per month"), minor: -delta }])],
    note: null, source: ["asesor.lectura", "libros.lineas"], lines: 0,
  };
}

function ingresoContrafactualAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(no me entra|no entra|no me entrara|no entrara|no me llega|no llega|no vendo|no vendiera|si no (me )?(entra|vendo)|doesn'?t come in|does not come in|don'?t get (paid|my))/.test(folded)) return null;
  if (!/(negocio|sueldo|salario|ingreso|trabajo|business|salary|paycheck|income|job|venta|vendo|vender|ventas|sell|selling|sales)/.test(folded)) return null;
  const src = ingresoConcepto(c, folded);
  if (!src || src.typical <= 0) return null;
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const stock = savingsStock(c.state, c.key);
  const keys = Object.keys(c.state.months).filter((k) => k <= c.key).sort();
  const medianOf = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
  const typicalIn = medianOf(keys.map((k) => (c.state.months[k]?.lines ?? []).filter((l) => l.active && /^income/.test(l.kind)).reduce((a, l) => a + view(c, l), 0)));
  const typicalOut = medianOf(keys.map((k) => (c.state.months[k]?.lines ?? []).filter((l) => l.active && isOut(l) && roleOf(c.state, l.categoryId) !== "savings").reduce((a, l) => a + view(c, l), 0)));
  const gapMonth = typicalOut - (typicalIn - src.typical);
  const ongoing = gapMonth > 0
    ? L(c.lang, ` Y si fuera todos los meses, el hueco sería ${c.money(gapMonth)} al mes: tu colchón y lo guardado (${c.money(stock.total)}) lo cubren ${stock.total > 0 ? `unas ${Math.max(1, Math.floor(stock.total / gapMonth))} veces` : "cero veces — no hay nada guardado"}.`, ` And if it were every month, the hole would be ${c.money(gapMonth)} a month: your cushion and savings (${c.money(stock.total)}) cover it ${stock.total > 0 ? `about ${Math.max(1, Math.floor(stock.total / gapMonth))} times over` : "zero times — there's nothing saved"}.`)
    : L(c.lang, ` Y ni siquiera sería un hueco mensual: tus otros ingresos típicos (${c.money(typicalIn - src.typical)}) cubren tu gasto típico (${c.money(typicalOut)}) aun sin ${src.name}.`, ` And it wouldn't even be a monthly hole: your other typical income (${c.money(typicalIn - src.typical)}) covers your typical spending (${c.money(typicalOut)}) even without ${src.name}.`);
  if (src.thisMonth > 0) {
    const without = reading.left - src.thisMonth;
    return {
      kind: "answer", family: "contrafactual",
      verdict: L(c.lang, `Si este mes no entra ${src.name}: de ahí suelen entrar ${c.money(src.typical)} al mes, y este mes ya entraron ${c.money(src.thisMonth)}. Sin eso, el mes iría en ${c.money(without)} en vez de ${c.money(reading.left)}: ${without >= 0 ? "seguiría cerrando en positivo" : `quedaría en negativo por ${c.money(-without)}`}.${ongoing}`, `If ${src.name} doesn't come in this month: ${c.money(src.typical)} a month usually comes in from there, and ${c.money(src.thisMonth)} already came in this month. Without it, the month would stand at ${c.money(without)} instead of ${c.money(reading.left)}: ${without >= 0 ? "it would still close positive" : `it would be negative by ${c.money(-without)}`}.${ongoing}`),
      pieces: [{ label: L(c.lang, `Entra de ${src.name}, al mes`, `From ${src.name}, a month`), minor: src.typical }, { label: L(c.lang, "El mes, sin eso", "The month, without it"), minor: without }],
      note: L(c.lang, "Es el escenario de tu pregunta corrido sobre tu libro: nada se borró ni se movió.", "It's your question's scenario run over your book: nothing was erased or moved."),
      source: ["asesor.lectura", "libros.lineas", "ahorros.stock"], lines: 0,
    };
  }
  const typClose = typicalIn - typicalOut;
  const typWithout = typClose - src.typical;
  return {
    kind: "answer", family: "contrafactual",
    verdict: L(c.lang, `Si no entra ${src.name}: de ahí entran ${c.money(src.typical)} en el mes típico. Este mes esa entrada aún no está anotada, así que la cuenta corre sobre tu mes típico: sin eso, el mes típico cerraría en ${c.money(typWithout)} en vez de ${c.money(typClose)}.${ongoing}`, `If ${src.name} doesn't come in: ${c.money(src.typical)} comes in from there in the typical month. That income isn't recorded yet this month, so the math runs on your typical month: without it, the typical month would close at ${c.money(typWithout)} instead of ${c.money(typClose)}.${ongoing}`),
    pieces: [{ label: L(c.lang, `Entra de ${src.name}, al mes`, `From ${src.name}, a month`), minor: src.typical }, { label: L(c.lang, "El mes típico, sin eso", "The typical month, without it"), minor: typWithout }],
    note: L(c.lang, "Es el escenario de tu pregunta corrido sobre tu libro: nada se borró ni se movió.", "It's your question's scenario run over your book: nothing was erased or moved."),
    source: ["asesor.lectura", "libros.lineas", "ahorros.stock"], lines: 0,
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
    const amounts = amountsIn(raw, c.display);
    if (amounts.length && /(al mes|por mes|mensual|al ano|por ano|cada mes|per month|monthly)/.test(folded)) {
      const a = amounts[0];
      const d = convertMinor(a.minor, a.currency, c.display, c.rateE4);
      monthly = /(al ano|por ano|per year|yearly)/.test(folded) ? Math.round(d / 12) : d;
    }
  }
  if (monthly == null || monthly <= 0) {
    // OLA 26 (U5): el filtro vacío no calla — «si dejo de gastar en
    // comida rápida» sin una línea de eso recibía silencio, donde
    // historia nombra la ausencia. Sin monto traído: si el nombre no
    // resuelve, se nombra; si resuelve pero no hay gasto medido, el
    // cero se dice. Con monto traído la forma es otra y no se toca.
    if (!amountsIn(raw, c.display).length) {
      if (!filter) {
        const stray = strayFilterWord(c, folded, new Set(["gastar", "gasto", "gastos", "dejar", "dejo", "dejara", "comprar", "compra", "pagar", "pago", "spend", "spending", "stop"]));
        if (stray) {
          return {
            kind: "answer", family: "contrafactual",
            verdict: L(c.lang, `No tienes gasto anotado como «${stray}»: dejar de gastar en eso juntaría $0 — no hay nada que dejar. Si lo anotas con otro nombre, pregúntame por ese.`, `You have no recorded spending as "${stray}": stopping it would keep $0 — there's nothing to stop. If you record it under another name, ask me by that one.`),
            pieces: [], note: null, source: ["historial.stream"], lines: 0,
          };
        }
      } else {
        return {
          kind: "answer", family: "contrafactual",
          verdict: L(c.lang, "No tienes gasto anotado en eso: dejar de gastarlo juntaría $0 — no hay nada que dejar.", "You have no recorded spending on that: stopping it would keep $0 — there's nothing to stop."),
          pieces: [], note: null, source: ["historial.stream"], lines: 0,
        };
      }
    }
    return null;
  }
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
  if (!/(cuantos meses (me dura|me dura|aguanta|aguanto|de respaldo|de colchon|me alcanza)|meses de (respaldo|colchon|emergencia)|para cuantos meses me (alcanza|dura)|cuanto tiempo (me dura|aguanta) (lo|mi)|how many months (would|of|can)|runway|emergency fund lasts|sin trabajo|sin ingresos|me despiden|quedo sin|puedo vivir|vivir sin|no tuviera ingresos|pierdo mi trabajo|without (a job|income|work)|lost my job|lose my job|losing my job|how long (could|can|would) i (go|last|survive)|cuanto tiempo aguanto|cuanto aguanto sin|aguanto sin|sin (ningun )?ingreso|no income at all)/.test(folded)) return null;
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
    // La condición del censo, verificada en canon (1.3.449): la
    // vista de Ahorros · Colchón NO dibuja la escala de meses al
    // abrirla (enseña el stock y su cuenta, no la banda 0–12+) —
    // la declaración se queda; no baja a puerta.
    ...(stock.total > 0
      ? {
          figure: {
            kind: "escala" as const,
            points: [{ label: L(c.lang, `Tu marca: ${whole} mes${whole === 1 ? "" : "es"} de colchón`, `Your mark: ${whole} month${whole === 1 ? "" : "s"} of cushion`), minor: stock.total }],
            band: { floor: m.avg, total: stock.total },
            note: L(c.lang, "La banda se mide en meses de tu gasto promedio.", "The band is measured in months of your average spending."),
          },
        }
      : {}),
  };
}

/* OLA 30 · EL KIT DEL INGRESO VOLÁTIL: el ingreso de cada mes
 * anotado, medido entero. La mediana es la vara central; el PISO
 * es el percentil 25 por rango más cercano, declarado como tal;
 * el excedente de los meses buenos (lo que pasó de la mediana) se
 * suma APARTE — es sobra, no ritmo. Con menos de dos meses no hay
 * piso que medir y se dice. */
function incomeKit(c: Ctx): { months: Array<{ key: string; total: number }>; median: number; floor: number; best: number; worst: number; surplus: number; atOrBelowFloor: number } | null {
  const keys = Object.keys(c.state.months).filter((k) => k <= c.key).sort();
  const months = keys
    .map((k) => ({ key: k, total: (c.state.months[k]?.lines ?? []).filter((l) => l.active && l.kind.startsWith("income")).reduce((a, l) => a + view(c, l), 0), lines: (c.state.months[k]?.lines ?? []).length }))
    .filter((m) => m.lines > 0)
    .map(({ key, total }) => ({ key, total }));
  if (!months.length) return null;
  const sorted = months.map((m) => m.total).sort((a, b) => a - b);
  const n = sorted.length;
  const median = n % 2 ? sorted[(n - 1) / 2] : Math.round((sorted[n / 2 - 1] + sorted[n / 2]) / 2);
  const floor = sorted[Math.max(0, Math.ceil(0.25 * n) - 1)];
  const surplus = months.reduce((a, m) => a + Math.max(0, m.total - median), 0);
  return { months, median, floor, best: sorted[n - 1], worst: sorted[0], surplus, atOrBelowFloor: sorted.filter((v) => v <= floor).length };
}

/* OLA 48 (F2) · LA CADENCIA DEL INGRESO — «¿cada cuánto me
 * pagan?»: el patrón de fechas del ingreso se mide de los
 * bookedOn anotados, nunca se supone. Manda el concepto de
 * ingreso con más pagos (el sueldo, casi siempre); los huecos
 * entre pagos consecutivos dan la mediana, y la mediana se
 * nombra en su cadencia (semanal, quincenal, mensual) o en días
 * si no calza con ninguna. Si los huecos bailan (el mayor duplica
 * al menor), el patrón se dice irregular con su rango. Con menos
 * de tres pagos no hay patrón que medir y se dice. El próximo
 * pago esperado se proyecta del último + la mediana, declarado
 * como proyección. */
function cadenciaIngresoAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(cada cuanto (me pagan|me entra|recibo|cobro|pagan)|cada cuanto es mi pago|con que frecuencia me pagan|how often do i get paid|how often am i paid|how often do i get pay)/.test(folded)) return null;
  const byConcept = new Map<string, string[]>();
  for (const l of allLines(c)) {
    if (!l.active || !l.kind.startsWith("income")) continue;
    const d = lineDate(l);
    if (!d || d > c.today) continue;
    const name = (l.concept || "").trim();
    if (!name) continue;
    const arr = byConcept.get(name) ?? [];
    arr.push(d);
    byConcept.set(name, arr);
  }
  let bestName = "";
  let bestDates: string[] = [];
  for (const [name, dates] of byConcept) {
    const sorted = [...new Set(dates)].sort();
    if (sorted.length > bestDates.length) { bestName = name; bestDates = sorted; }
  }
  if (bestDates.length < 3) {
    return { kind: "answer", family: "ingreso", verdict: L(c.lang, `Todavía no hay patrón que medir: de tu ingreso tengo ${bestDates.length} fecha${bestDates.length === 1 ? "" : "s"} anotada${bestDates.length === 1 ? "" : "s"}${bestName ? ` de «${bestName}»` : ""}, y un ritmo se mide con tres pagos o más. Cuando se junten, la cadencia sale de tus propias fechas.`, `There's no pattern to measure yet: I have ${bestDates.length} recorded date${bestDates.length === 1 ? "" : "s"} for your income${bestName ? ` from "${bestName}"` : ""}, and a rhythm takes three payments or more to measure. Once they add up, the cadence comes from your own dates.`), pieces: [], note: null, source: ["libros.lineas"], lines: bestDates.length };
  }
  const gaps: number[] = [];
  for (let i = 1; i < bestDates.length; i++) gaps.push(daysBetweenIso(bestDates[i - 1], bestDates[i]));
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const median = sortedGaps[Math.floor(sortedGaps.length / 2)];
  const minGap = sortedGaps[0];
  const maxGap = sortedGaps[sortedGaps.length - 1];
  const cadName = median <= 8 ? L(c.lang, "semanal", "weekly") : median <= 17 ? L(c.lang, "quincenal", "every two weeks") : median <= 33 ? L(c.lang, "mensual", "monthly") : L(c.lang, `cada ${median} días`, `every ${median} days`);
  const irregular = maxGap > 2 * Math.max(minGap, 1);
  const last = bestDates[bestDates.length - 1];
  const next = addDaysIso(last, median);
  return {
    kind: "answer", family: "ingreso",
    verdict: irregular
      ? L(c.lang, `Tu ingreso «${bestName}» no trae un ritmo fijo: entre pago y pago han pasado de ${minGap} a ${maxGap} días (la mediana es ${median}). El último entró el ${fmtFecha(c, last)}; si la mediana mandara, el siguiente caería cerca del ${fmtFecha(c, next)} — pero con huecos así de desiguales, tómalo como una sombra, no como una fecha.`, `Your income "${bestName}" has no fixed rhythm: between payments it has gone from ${minGap} to ${maxGap} days (the median is ${median}). The last one came in on ${fmtFecha(c, last)}; if the median ruled, the next would land near ${fmtFecha(c, next)} — but with gaps this uneven, take that as a shadow, not a date.`)
      : L(c.lang, `Te pagan con ritmo ${cadName}: entre pago y pago de «${bestName}» pasan ${median} días (medido de ${bestDates.length} pagos anotados). El último entró el ${fmtFecha(c, last)}; el siguiente, si el ritmo sigue, cae cerca del ${fmtFecha(c, next)}.`, `You're paid on a ${cadName} rhythm: between payments of "${bestName}" there are ${median} days (measured from ${bestDates.length} recorded payments). The last one came in on ${fmtFecha(c, last)}; the next, if the rhythm holds, lands near ${fmtFecha(c, next)}.`),
    pieces: [],
    note: L(c.lang, "El ritmo sale de las fechas anotadas de tus pagos, no de ninguna regla de nómina.", "The rhythm comes from your payments' recorded dates, not from any payroll rule."),
    source: ["libros.lineas"], lines: bestDates.length,
  };
}

/* OLA 48 (F3) · EL GASTO POR UMBRAL — el gasto hormiga y sus
 * primos («¿cuánto he gastado en cosas de menos de $20?»): agregar
 * por umbral de monto es una forma entera que no existía. La vara
 * la trae el usuario en su pregunta; si pregunta por el «gasto
 * hormiga» sin monto, la vara es $20 y la respuesta lo DECLARA
 * como supuesto, invitando a cambiarla — jamás una vara escondida.
 * La bolsa es la de la historia (el gasto sin el apartado) en el
 * período que la pregunta nombre, y la respuesta da el conteo,
 * la suma y la parte del gasto del período: lo chico también
 * suma, y aquí se ve cuánto. */
function umbralAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const hormiga = /(gasto hormiga|gastos hormiga|ant (spending|expenses)|small (purchases|spending|expenses)|gastos (chicos|pequenos|menores))/.test(folded);
  const thresholdVoice = /(menos de|menores de|debajo de|no mas de|under|less than|below)\s*\$?\s*\d/.test(folded);
  if (!hormiga && !thresholdVoice) return null;
  if (!/(gast|compr|salio|spend|spent|purchas|buy|bought)/.test(folded) && !hormiga) return null;
  const amounts = amountsIn(raw, c.display);
  let threshold: number;
  let declared = false;
  if (amounts.length) {
    const a = amounts[amounts.length - 1];
    threshold = convertMinor(a.minor, a.currency, c.display, c.rateE4);
  } else if (hormiga) {
    threshold = convertMinor(2000, "USD", c.display, c.rateE4);
    declared = true;
  } else return null;
  if (threshold <= 0) return null;
  const p = periodOf(c, folded);
  const poolAll = allLines(c).filter((l) => inPeriod(c, l, p) && isOut(l) && roleOf(c.state, l.categoryId) !== "savings");
  const small = poolAll.filter((l) => view(c, l) < threshold);
  const sumSmall = small.reduce((a, l) => a + view(c, l), 0);
  const sumAll = poolAll.reduce((a, l) => a + view(c, l), 0);
  const pct = sumAll > 0 ? Math.round((sumSmall / sumAll) * 100) : 0;
  const varaTxt = declared
    ? L(c.lang, `Cuento como hormiga todo gasto de menos de ${c.money(threshold)} — esa es la vara que uso si no me das otra: si tu hormiga es otro monto, dímelo y lo mido con ese. `, `I count as ant-spending every expense under ${c.money(threshold)} — that's the yardstick I use if you don't give me another: if your ant is a different amount, tell me and I'll measure with that one. `)
    : "";
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `${varaTxt}En ${p.label}, los gastos de menos de ${c.money(threshold)} son ${small.length}: suman ${c.money(sumSmall)}, el ${pct}% de todo lo que gastaste en ese período (${c.money(sumAll)}).`, `${varaTxt}In ${p.label}, expenses under ${c.money(threshold)} number ${small.length}: they add up to ${c.money(sumSmall)}, ${pct}% of everything you spent in that period (${c.money(sumAll)}).`),
    pieces: [{ label: L(c.lang, `Gastos de menos de ${c.money(threshold)}`, `Expenses under ${c.money(threshold)}`), minor: sumSmall }],
    note: small.length === 0 ? L(c.lang, "Ningún gasto del período cae bajo esa vara: el cero también es la respuesta del libro.", "No expense in the period falls under that yardstick: the zero is the book's answer too.") : null,
    source: ["libros.lineas", "historial.stream"], lines: small.length,
  };
}

function ingresoVolatilAnswer(c: Ctx, folded: string): BankResult | null {
  // ENMIENDA DE CANON (integración de la Ola 30): la voz inglesa del
  // ingreso también dice «make» («what do I make in a bad month?») y
  // la española «hago» — la segunda puerta (piso, mes malo, estable…)
  // sigue mandando, así que la palabra ancha no roba nada.
  if (!/(ingreso|gano|sueldo|salario|income|salary|hago|make)/.test(folded)) return null;
  if (!/(piso|estable|volatil|varia|mes malo|peor mes|mejor mes|cuanto baja|floor|stable|volatile|worst month|bad month)/.test(folded)) return null;
  const kit = incomeKit(c);
  const src = ["libros.lineas", "asesor.lectura"];
  if (!kit) {
    return { kind: "answer", family: "ingreso", verdict: L(c.lang, "No hay meses con ingreso anotado en tu libro: sin meses medidos no hay piso que calcular, y no lo invento.", "There are no months with recorded income in your book: without measured months there's no floor to compute, and I won't invent one."), pieces: [], note: null, source: src, lines: 0 };
  }
  if (kit.months.length < 2) {
    return { kind: "answer", family: "ingreso", verdict: L(c.lang, `Solo hay un mes anotado con ingreso (${c.money(kit.months[0].total)}): el piso y la mediana piden al menos dos meses medidos — con uno, cualquier piso sería inventado.`, `Only one month of income is recorded (${c.money(kit.months[0].total)}): a floor and a median need at least two measured months — with one, any floor would be invented.`), pieces: [{ label: L(c.lang, "El único mes", "The only month"), minor: kit.months[0].total }], note: null, source: src, lines: 0 };
  }
  const n = kit.months.length;
  return {
    kind: "answer", family: "ingreso",
    verdict: L(c.lang, `Tu ingreso, medido de tus ${n} meses anotados: la mediana es ${c.money(kit.median)} al mes y tu piso es ${c.money(kit.floor)} — el percentil 25, declarado: ${kit.atOrBelowFloor} de tus ${n} meses quedaron en ese nivel o bajo él. Tu mejor mes fue ${c.money(kit.best)} y el peor, ${c.money(kit.worst)}. Los meses buenos dejaron ${c.money(kit.surplus)} por encima de la mediana en total: ese excedente es aparte, no es tu ritmo. Por eso las metas se juzgan contra el piso y no contra el promedio: el promedio promete lo que un mes malo no da.`, `Your income, measured from your ${n} recorded months: the median is ${c.money(kit.median)} a month and your floor is ${c.money(kit.floor)} — the 25th percentile, stated: ${kit.atOrBelowFloor} of your ${n} months landed at that level or below. Your best month was ${c.money(kit.best)} and the worst, ${c.money(kit.worst)}. Good months left ${c.money(kit.surplus)} above the median in total: that surplus is separate, not your pace. That's why goals are judged against the floor and not the average: the average promises what a bad month doesn't deliver.`),
    pieces: [
      { label: L(c.lang, "Mediana del ingreso", "Income median"), minor: kit.median },
      { label: L(c.lang, "Piso (percentil 25)", "Floor (25th percentile)"), minor: kit.floor },
      { label: L(c.lang, "Mejor mes", "Best month"), minor: kit.best },
      { label: L(c.lang, "Peor mes", "Worst month"), minor: kit.worst },
      { label: L(c.lang, "Excedente de los meses buenos", "Good months' surplus"), minor: kit.surplus },
    ],
    note: null, source: src, lines: 0,
    actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    figure: {
      kind: "meses",
      points: kit.months.map((m) => { const [y, mo] = m.key.split("-").map(Number); return { label: `${MONTH_LABELS[mo][c.lang === "en" ? 1 : 0]} ${y}`, minor: m.total }; }),
      band: { floor: kit.floor, median: kit.median, total: kit.best },
      note: null,
    },
  };
}

function metaAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const tardaria = /(tardaria|tardare|cuanto tiempo|how long)/.test(folded) && /(juntar|ahorrar|reunir|save up|reach|get to)/.test(folded);
  if (!tardaria && !/(cuanto (tengo|debo|necesito|hay) que (ahorrar|guardar)|cuanto (debo|deberia|necesito) ahorrar|cuanto ahorrar|how much (do i|should i|would i) (need to )?save|how much to save)/.test(folded)) return null;
  const amounts = amountsIn(raw, c.display);
  // OLA 28 (Familia 2, E28-2): el plazo oye «in» además de «en» —
  // la regex traía «(meses|months)» bilingüe tras un «en» solo
  // español, y «in 10 months» no casaba: la meta inglesa moría con
  // su plazo en la mano.
  const plazo = folded.match(/(?:en|in) (\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|two|three|four|five|six|seven|eight|nine|ten|twelve) (meses|months)/)
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
  /* OLA 41 · LA META SIN MONTO PIDE EL MONTO: «¿Cuánto tengo que
   * guardar al mes para el viaje de diciembre?» callaba porque la
   * puerta exigía la cifra. Con el plazo legible, la respuesta pide
   * el único dato que falta y ya cuenta los meses — no calla. */
  if (!amounts.length) {
    if (months > 0) {
      const stockM = savingsStock(c.state, c.key);
      return {
        kind: "answer", family: "meta",
        verdict: L(c.lang, `Para decirte el apartado me falta un solo dato: el monto de la meta — ¿cuánto cuesta eso que quieres juntar? El plazo ya lo tengo: de aquí a tu fecha hay ${months} mes${months === 1 ? "" : "es"} de apartado, y guardado ya tienes ${c.money(stockM.total)}. Con el monto, el apartado sale en el acto: (monto − lo guardado) ÷ ${months}.`, `To give you the set-aside I'm missing one datum: the goal's amount — how much does the thing you want to save up for cost? The deadline I do have: from here to your date there are ${months} month${months === 1 ? "" : "s"} of setting aside, and you already have ${c.money(stockM.total)} saved. With the amount, the set-aside comes out on the spot: (amount − what's saved) ÷ ${months}.`),
        pieces: [{ label: L(c.lang, "Guardado hoy", "Saved today"), minor: stockM.total }],
        note: L(c.lang, "No te pido el plazo dos veces ni invento el monto: la meta es tuya y su precio no está en tu libro.", "I'm not asking for the deadline twice or inventing the amount: the goal is yours and its price isn't in your book."),
        source: ["ahorros.stock", "ahorros.mes"], lines: 0,
      };
    }
    return null;
  }
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
  /* OLA 30 · EL FONDO DE AMORTIZACIÓN: la meta se despeja hacia
   * atrás. Si la pregunta trae una tasa («al 5%»), lo ya guardado
   * CRECE a esa tasa y el apartado es el de la fórmula del fondo:
   * PMT = (G − S(1+i)ⁿ)·i / ((1+i)ⁿ − 1). Sin tasa traída ni anotada
   * (el libro no guarda tasa para los ahorros), i = 0 — y el caso
   * degenerado se DECLARA: la fórmula se reduce a la cuenta recta.
   * Y el apartado se juzga contra el PISO del ingreso (percentil 25,
   * el kit de arriba), no contra el promedio: un plan que solo cabe
   * en los meses buenos no es un plan. */
  const rateM = raw.match(/(\d+(?:[.,]\d+)?)\s*(%|por ciento|percent)/i);
  const ratePct = rateM ? Number.parseFloat(rateM[1].replace(",", ".")) : 0;
  const i = ratePct > 0 && Number.isFinite(ratePct) ? ratePct / 100 / 12 : 0;
  const fv = Math.round(stock.total * Math.pow(1 + i, months));
  if (i > 0 && fv >= target) {
    return {
      kind: "answer", family: "meta",
      verdict: L(c.lang, `Ni siquiera necesitas apartar más: con el interés que trajiste (${ratePct}% al año), lo que ya tienes (${c.money(stock.total)}) crece a ${c.money(fv)} en ${months} meses — y tu meta era ${c.money(target)}.`, `You don't even need to set aside more: at the interest you brought (${ratePct}% a year), what you already have (${c.money(stock.total)}) grows to ${c.money(fv)} in ${months} months — and your goal was ${c.money(target)}.`),
      pieces: [
        { label: L(c.lang, "La meta", "The goal"), minor: target },
        { label: L(c.lang, "Ya tienes", "You already have"), minor: stock.total },
        { label: L(c.lang, "Crece a", "It grows to"), minor: fv },
      ],
      note: L(c.lang, "El interés es el que trajiste en tu pregunta — tu libro no anota tasa para tus ahorros, y no la invento.", "The interest is the one you brought in your question — your book records no rate for your savings, and I won't invent one."),
      source: ["ahorros.stock"], lines: 0,
    };
  }
  const perMonth = i > 0
    ? Math.ceil(((target - fv) * i) / (Math.pow(1 + i, months) - 1))
    : Math.ceil(missing / months);
  const kit = incomeKit(c);
  const floorTxt = kit && kit.months.length >= 2 && kit.floor > 0
    ? L(c.lang, ` Ese apartado es el ${Math.round((perMonth / kit.floor) * 100)}% de tu ingreso piso (${c.money(kit.floor)}, el percentil 25 de tus ${kit.months.length} meses) y el ${Math.round((perMonth / kit.median) * 100)}% de tu mediana (${c.money(kit.median)}).${perMonth > kit.floor ? " Ojo: supera tu piso entero — en un mes malo no saldría del ingreso de ese mes." : ""}`, ` That set-aside is ${Math.round((perMonth / kit.floor) * 100)}% of your income floor (${c.money(kit.floor)}, the 25th percentile of your ${kit.months.length} months) and ${Math.round((perMonth / kit.median) * 100)}% of your median (${c.money(kit.median)}).${perMonth > kit.floor ? " Mind you: it exceeds your whole floor — in a bad month it wouldn't come out of that month's income." : ""}`)
    : "";
  return {
    kind: "answer", family: "meta",
    verdict: i > 0
      ? L(c.lang, `Para llegar a ${c.money(target)} en ${months} meses con el interés que trajiste (${ratePct}% al año), ahorra ${c.money(perMonth)} al mes: ya tienes ${c.money(stock.total)}, que a ese interés crece a ${c.money(fv)} en el plazo, y el apartado cubre el resto.${floorTxt}`, `To reach ${c.money(target)} in ${months} months at the interest you brought (${ratePct}% a year), save ${c.money(perMonth)} a month: you already have ${c.money(stock.total)}, which at that interest grows to ${c.money(fv)} over the term, and the set-aside covers the rest.${floorTxt}`)
      : L(c.lang, `Para llegar a ${c.money(target)} en ${months} meses, ahorra ${c.money(perMonth)} al mes: ya tienes ${c.money(stock.total)} y te faltan ${c.money(missing)}.${floorTxt}`, `To reach ${c.money(target)} in ${months} months, save ${c.money(perMonth)} a month: you already have ${c.money(stock.total)} and ${c.money(missing)} is missing.${floorTxt}`),
    pieces: [
      { label: L(c.lang, "La meta", "The goal"), minor: target },
      { label: L(c.lang, "Ya tienes", "You already have"), minor: stock.total },
      ...(i > 0 ? [{ label: L(c.lang, "Crece a", "It grows to"), minor: fv }] : []),
      { label: L(c.lang, "Al mes", "Per month"), minor: perMonth },
    ],
    note: i > 0
      ? L(c.lang, "El interés es el que trajiste en tu pregunta — tu libro no anota tasa para tus ahorros, y no la invento.", "The interest is the one you brought in your question — your book records no rate for your savings, and I won't invent one.")
      : L(c.lang, "El supuesto, dicho: sin interés — tu libro no anota tasa para tus ahorros y no trajiste una; a interés cero la fórmula del fondo se reduce a la cuenta recta: lo que falta, entre los meses.", "The assumption, stated: no interest — your book records no rate for your savings and you brought none; at zero interest the sinking-fund formula reduces to the straight math: what's missing, over the months."),
    source: ["ahorros.stock"], lines: 0,
    graph: [{
      id: "apartado-al-mes", label: L(c.lang, "El apartado al mes para tu meta", "The monthly set-aside for your goal"), minor: perMonth, tense: "proyectado", flow: "flujo", currency: c.display, unit: L(c.lang, "al mes", "a month"),
      assumption: i > 0
        ? { text: L(c.lang, `el interés que trajiste: ${ratePct}% al año`, `the interest you brought: ${ratePct}% a year`), origin: "usuario" }
        : { text: L(c.lang, "sin interés: la cuenta recta", "no interest: the straight math"), origin: "regla" },
      children: [
        { id: "falta", label: L(c.lang, "Lo que falta por juntar", "What's still to gather"), minor: target - fv, tense: "proyectado", flow: "stock", currency: c.display, sign: 1 },
      ],
    }],
    ...(kit && kit.months.length >= 2 && kit.floor > 0
      ? {
          figure: {
            kind: "escala" as const,
            points: [
              { label: L(c.lang, "Lo guardado", "What's saved"), minor: stock.total },
              { label: L(c.lang, "El apartado al mes", "The monthly set-aside"), minor: perMonth },
            ],
            band: { floor: kit.floor, median: kit.median, total: target },
            note: null,
          },
        }
      : {}),
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
/* LA VERIFICACIÓN (OLA 25, espécimen de Oscar en su teléfono,
 * 2026-11-22; integrada al canon con la Ola 25): «¿Tengo $20 para
 * gastar hoy?» caía en silencio — el usuario TRAE el monto y pide el
 * veredicto, no la cifra. Dos varas, las dos dichas en la respuesta:
 * el ritmo seguro de hoy (la queda repartida entre los días que
 * quedan) y la queda entera del mes. Con dirección: si el monto pasa
 * el ritmo, la respuesta dice a cuánto baja el ritmo desde mañana.
 * No es el hipotético (no hay «si») ni el promedio (no pide el
 * número: lo trae). Los gustos quedan fuera — su familia los atiende,
 * como en el clasificador. (Los grafos de la copia llegan con la
 * Ola 27, que trae el tipo AskNode al canon.) */
function verificacionAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  if (/(gustos|antojos|capricho|treats)/.test(folded)) return null;
  if (/\bsi\b/.test(folded)) return null;
  if (!/(tengo|puedo|me alcanza|alcanza|hay|have|can i)\b/.test(folded)) return null;
  const amounts = amountsIn(raw, c.display);
  // LA FORMA NOMBRADA (la misma caza, minutos después): «¿me alcanza
  // para pagar el Internet?» no trae monto — lo trae EL LIBRO, y el
  // delegado respondía need-amount, pidiéndole al usuario la cifra
  // que su propio libro sabe. Si la pregunta nombra una cuota viva
  // con cifra, esa es la vara.
  if (amounts.length === 0 && /(pagar|pay|para (el|la|los|las)\b)/.test(folded)) {
    const named = duesWindow(c.state, 92, c.today).find((d) => d.amt !== null && foldQ(d.name).split(/\s+/).some((w) => w.length >= 4 && folded.includes(w)));
    if (!named || named.amt === null) return null;
    const readingN = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const leftN = Math.max(0, readingN.left);
    const dayN = Number(c.today.slice(8, 10));
    const daysInN = new Date(Number(c.key.slice(0, 4)), Number(c.key.slice(5, 7)), 0).getDate();
    const perN = leftN > 0 ? Math.floor(leftN / Math.max(1, daysInN - dayN + 1)) : 0;
    const amtN = named.amt;
    const verdictN = amtN <= leftN
      ? L(c.lang, `Sí: «${named.name}» son ${c.money(amtN)} y vence el ${fmtFecha(c, named.on)} — del mes te quedan ${c.money(leftN)}, así que pagándolo te quedan ${c.money(leftN - amtN)}${amtN > perN ? ` (eso sí: pasa tu ritmo seguro de hoy, ${c.money(perN)})` : ""}.`, `Yes: "${named.name}" is ${c.money(amtN)}, due ${fmtFecha(c, named.on)} — ${c.money(leftN)} of the month is left, so paying it leaves you ${c.money(leftN - amtN)}${amtN > perN ? ` (mind you: it passes today's safe pace, ${c.money(perN)})` : ""}.`)
      : L(c.lang, `No alcanza: «${named.name}» son ${c.money(amtN)} (vence el ${fmtFecha(c, named.on)}) y del mes te quedan ${c.money(leftN)} — te faltan ${c.money(amtN - leftN)}.`, `It doesn't reach: "${named.name}" is ${c.money(amtN)} (due ${fmtFecha(c, named.on)}) and ${c.money(leftN)} of the month is left — you're ${c.money(amtN - leftN)} short.`);
    return {
      kind: "answer", family: "promedio",
      verdict: verdictN,
      pieces: [
        { label: named.name, minor: amtN },
        { label: L(c.lang, "Queda del mes", "Left this month"), minor: leftN },
        { label: L(c.lang, "Tu ritmo seguro de hoy", "Your safe pace today"), minor: perN },
      ],
      note: L(c.lang, "La cifra de la cuota es la anotada en tu libro, con su fecha — no la inventé ni te la pedí: ya la sabías tú, estaba en tu Agenda.", "The due's figure is the one recorded in your book, with its date — I didn't invent it or ask you for it: you already knew it, it was in your Agenda."),
      graph: [{
        id: "queda-tras", label: L(c.lang, "Lo que te quedaría del mes", "What you'd have left of the month"), minor: leftN - amtN, tense: "proyectado", flow: "stock", currency: c.display,
        assumption: { text: L(c.lang, "pagar esa cuota, como preguntaste", "paying that due, as you asked"), origin: "usuario" },
        children: [
          { id: "queda", label: L(c.lang, "Queda del mes", "Left this month"), minor: leftN, tense: "stock", flow: "stock", currency: c.display, sign: 1 },
          { id: "cuota", label: named.name, minor: amtN, tense: "medido", flow: "flujo", currency: c.display, sign: -1, assumption: { text: L(c.lang, "pagar esa cuota, como preguntaste", "paying that due, as you asked"), origin: "usuario" } },
        ],
      }],
      source: ["asesor.lectura", "central.pagos"], lines: 0,
      actions: reportDoor(c, "central.pagos", "Verlo en la Agenda", "See it in the Agenda"),
      ...(leftN > 0
        ? {
            figure: {
              kind: "escala" as const,
              points: [
                { label: L(c.lang, "Tu ritmo seguro de hoy", "Your safe pace today"), minor: perN, mark: "piso" as const },
                { label: named.name, minor: amtN, mark: "premisa" as const },
              ],
              band: { floor: perN, total: leftN },
              note: null,
            },
          }
        : {}),
    };
  }
  if (!/(para gastar|para hoy|gastar.{0,24}hoy|hoy.{0,24}gastar|to spend|spend.{0,24}today)/.test(folded)) return null;
  if (amounts.length !== 1) return null;
  const a = amounts[0];
  const amt = convertMinor(a.minor, a.currency, c.display, c.rateE4);
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const left = Math.max(0, reading.left);
  const day = Number(c.today.slice(8, 10));
  const daysIn = new Date(Number(c.key.slice(0, 4)), Number(c.key.slice(5, 7)), 0).getDate();
  const leftDays = Math.max(1, daysIn - day + 1);
  const per = left > 0 ? Math.floor(left / leftDays) : 0;
  const convNote = a.currency !== c.display
    ? L(c.lang, `Tus ${formatMoney(a.minor, a.currency, c.lang)} son ${c.money(amt)} con la tasa de tu Mesa de cambio. `, `Your ${formatMoney(a.minor, a.currency, c.lang)} is ${c.money(amt)} at your Exchange desk's rate. `)
    : "";
  let verdict: string;
  if (amt <= per) {
    verdict = L(c.lang, `Sí: hoy puedes gastar hasta ${c.money(per)} sin pasarte, y esos ${c.money(amt)} caben — si los gastas, del mes te quedan ${c.money(left - amt)}.`, `Yes: today you can spend up to ${c.money(per)} without going over, and that ${c.money(amt)} fits — spend it and ${c.money(left - amt)} of the month is left.`);
  } else if (amt <= left) {
    const worth = per > 0 ? Math.max(2, Math.round(amt / per)) : 0;
    const newPer = leftDays > 1 ? Math.floor((left - amt) / (leftDays - 1)) : 0;
    verdict = L(c.lang, `Los tienes — del mes te quedan ${c.money(left)} — pero ${c.money(amt)} pasa tu ritmo seguro de hoy (${c.money(per)}): es gastar de una vez lo de unos ${worth} días. Si lo haces, desde mañana tu ritmo baja a ${c.money(newPer)} al día.`, `You have it — ${c.money(left)} of the month is left — but ${c.money(amt)} passes today's safe pace (${c.money(per)}): it's spending about ${worth} days' worth at once. Do it, and from tomorrow your pace drops to ${c.money(newPer)} a day.`);
  } else {
    verdict = L(c.lang, `No alcanza: del mes te quedan ${c.money(left)}, y para ${c.money(amt)} te faltan ${c.money(amt - left)}.`, `It doesn't reach: ${c.money(left)} of the month is left, and you're ${c.money(amt - left)} short of ${c.money(amt)}.`);
  }
  return {
    kind: "answer", family: "promedio",
    verdict,
    pieces: [
      { label: L(c.lang, "Queda del mes", "Left this month"), minor: left },
      { label: L(c.lang, "Tu ritmo seguro de hoy", "Your safe pace today"), minor: per },
      { label: L(c.lang, "Lo que quieres gastar", "What you want to spend"), minor: amt },
    ],
    note: `${convNote}${L(c.lang, "El supuesto, dicho: la queda se reparte parejo entre los días que quedan; un día fuerte pide días más ligeros después.", "The assumption, stated: what's left is spread evenly over the remaining days; a heavy day asks for lighter days after.")}`,
    graph: [
      {
        id: "queda-tras", label: L(c.lang, "Lo que te quedaría del mes", "What you'd have left of the month"), minor: left - amt, tense: "proyectado", flow: "stock", currency: c.display,
        assumption: { text: L(c.lang, "el gasto que trajiste en tu pregunta", "the spending you brought in your question"), origin: "usuario" },
        children: [
          { id: "queda", label: L(c.lang, "Queda del mes", "Left this month"), minor: left, tense: "stock", flow: "stock", currency: c.display, sign: 1 },
          { id: "traido", label: L(c.lang, "Lo que quieres gastar", "What you want to spend"), minor: amt, tense: "proyectado", flow: "flujo", currency: c.display, sign: -1, assumption: { text: L(c.lang, "el gasto que trajiste en tu pregunta", "the spending you brought in your question"), origin: "usuario" } },
        ],
      },
      {
        id: "ritmo", label: L(c.lang, "Tu ritmo seguro de hoy", "Your safe pace today"), minor: per, tense: "proyectado", flow: "flujo", currency: c.display, unit: L(c.lang, "al día", "a day"),
        assumption: { text: L(c.lang, "la queda de hoy se reparte parejo entre los días que quedan del mes", "today's left is spread evenly over the days remaining in the month"), origin: "regla" },
        children: [
          { id: "queda", label: L(c.lang, "Queda del mes", "Left this month"), minor: left, tense: "stock", flow: "stock", currency: c.display, sign: 1 },
        ],
      },
    ],
    source: ["asesor.lectura", "central.queda"], lines: 0,
    actions: reportDoor(c, "central.queda", "Ver mi Queda en Central", "See my Left in Central"),
    ...(left > 0
      ? {
          figure: {
            kind: "escala" as const,
            points: [
              { label: L(c.lang, "Tu ritmo seguro de hoy", "Your safe pace today"), minor: per, mark: "piso" as const },
              { label: L(c.lang, "Lo que quieres gastar", "What you want to spend"), minor: amt, mark: "premisa" as const },
            ],
            band: { floor: per, total: left },
            note: null,
          },
        }
      : {}),
  };
}

/* OLA 29 · LA FACTIBILIDAD — la prueba sobre lo anotado (investigación
 * II, mecanismo #3: la red de restricciones temporales de Dechter,
 * Meiri y Pearl, en su forma llana; y el punto bajo de 13 semanas).
 * «¿Me alcanza el mes?» caía en silencio (la caza de lo obvio de la
 * Ola 25 lo dejó asignado aquí): no pide una cifra, pide una PRUEBA —
 * si la cadena de obligaciones con fecha cabe en la queda de hoy. La
 * prueba camina los eventos en orden de fecha desde la queda y
 * nombra el conflicto cuando lo hay: qué obligación, qué día, por
 * cuánto no cabe — y distingue el problema del DÍA del problema del
 * MES (lo que te deben después puede tapar el bache: se dice). Lo que
 * el libro sabe fechado pero sin monto (un préstamo) no se inventa:
 * se nombra fuera de la prueba. Y el gasto al ritmo jamás se mezcla
 * con lo programado sin declararse: dos varas, dos frases. */
type SchedEvent = { on: string; name: string; delta: number; known: boolean };
function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthEndIso(iso: string): string {
  const d = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysBetweenIso(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
}
/** Los eventos con fecha hasta `days` días desde hoy: la ventana de
 * vencimientos, EXPANDIDA por cadencia — una cuota mensual no vence
 * una vez en 13 semanas: vuelve, con su fecha. Lo debido (lent) entra
 * en positivo; lo sin monto entra marcado como no modelado. LA REGLA
 * DE LA CASA (la nota del propio delegado en ask.ts): las cuotas de
 * ESTE mes ya están contadas en la queda — su primera ocurrencia no
 * camina (sería restarla dos veces); sus vueltas futuras sí, porque
 * la queda de hoy no las trae. Las contadas se devuelven aparte para
 * nombrarlas, no para esconderlas. */
function scheduledEvents(c: Ctx, days: number): { events: SchedEvent[]; counted: string[] } {
  const end = addDaysIso(c.today, days);
  const out: SchedEvent[] = [];
  const counted: string[] = [];
  for (const d of duesWindow(c.state, days, c.today)) {
    if (d.amt === null) { out.push({ on: d.on, name: d.name, delta: 0, known: false }); continue; }
    const signed = d.kind === "lent" ? d.amt : -d.amt;
    if (d.kind === "cuota" && d.line?.monthKey === c.key) counted.push(d.name);
    else out.push({ on: d.on, name: d.name, delta: signed, known: true });
    const cad = d.kind === "cuota" ? (d.line?.cadence || (d.line?.recurring ? "monthly" : "")) : d.kind === "card" ? "monthly" : "";
    if (cad && intervalOf(cad)) {
      let prev = d.on;
      let next = stepDate(prev, cad, Number(d.on.slice(8, 10)));
      let guard = 0;
      while (next > prev && next <= end && guard++ < 30) {
        out.push({ on: next, name: d.name, delta: signed, known: true });
        prev = next;
        next = stepDate(prev, cad, Number(d.on.slice(8, 10)));
      }
    }
  }
  return { events: out.sort((a, b) => a.on.localeCompare(b.on)), counted };
}
function walkEvents(start: number, events: SchedEvent[], upto: string): { end: number; min: number; minOn: string; conflict: { ev: SchedEvent; bal: number } | null; applied: SchedEvent[]; steps: Array<{ on: string; name: string; bal: number }> } {
  let bal = start;
  let min = start;
  let minOn = "";
  let conflict: { ev: SchedEvent; bal: number } | null = null;
  const applied = events.filter((e) => e.on <= upto);
  const steps: Array<{ on: string; name: string; bal: number }> = [];
  for (const e of applied) {
    if (!e.known) continue;
    bal += e.delta;
    steps.push({ on: e.on, name: e.name, bal });
    if (bal < min) { min = bal; minOn = e.on; }
    if (bal < 0 && !conflict) conflict = { ev: e, bal };
  }
  return { end: bal, min, minOn, conflict, applied, steps };
}
/** EL CAMINO como figura (censo de figuras; puerto de la Rama
 * Agente, 1.3.449): el saldo caminando, declarado desde el MISMO
 * paseo que el veredicto leyó — cada punto es un saldo real tras un
 * evento real, con el punto más bajo y el día del conflicto
 * marcados. Si el paseo trae más pasos de los que la figura enseña
 * (8), se conservan el arranque, los primeros, el mínimo, el
 * conflicto y el cierre: ningún punto se inventa ni se interpola. */
function caminoFigure(c: Ctx, start: number, w: ReturnType<typeof walkEvents>, note: string | null, lastPoint?: BankFigurePoint): BankFigure {
  const all: BankFigurePoint[] = [{ label: L(c.lang, `Hoy · ${fmtFecha(c, c.today)}`, `Today · ${fmtFecha(c, c.today)}`), minor: start }];
  const minIdx = w.steps.findIndex((s) => s.bal === w.min);
  const confIdx = w.conflict ? w.steps.findIndex((s) => s.on === w.conflict!.ev.on && s.bal === w.conflict!.bal) : -1;
  let idxs = w.steps.map((_, i) => i);
  if (idxs.length > 8) {
    const keep = new Set<number>([0, 1, 2, idxs.length - 1]);
    if (minIdx >= 0) keep.add(minIdx);
    if (confIdx >= 0) keep.add(confIdx);
    idxs = [...keep].sort((a, b) => a - b);
  }
  for (const i of idxs) {
    const s = w.steps[i];
    const p: BankFigurePoint = { label: `${s.name} · ${fmtFecha(c, s.on)}`, minor: s.bal };
    if (i === confIdx) p.mark = "conflicto";
    else if (i === minIdx && w.min < start) p.mark = "minimo";
    all.push(p);
  }
  if (lastPoint) all.push(lastPoint);
  return { kind: "camino", points: all, note };
}
/* OLA 33 · LA DERIVA QUE AVISA (investigación II, mecanismo #7):
 * la proactividad como CANDIDATAS EN DATOS — la superficie que
 * las presenta es de canon; el banco calcula, ordena y redacta.
 * Tres detectores, cada uno con su vara declarada:
 *  - DERIVA (CUSUM de Page, 1954): la suma paciente de los
 *    excesos sobre la base — S = Σ máx(0, x − μ − 0.5σ) de los
 *    dos últimos meses — avisa cuando pasa 4σ Y el nivel reciente
 *    supera la base en 15% (la materialidad: una deriva verdadera
 *    pero de centavos no merece un aviso; la aritmética de la
 *    tasa base manda — con avisos baratos, casi todo aviso sería
 *    falso).
 *  - SALTO (la cerca de Tukey): el último mes pasa Q3 + 1.5·IQR
 *    de la base y el mes anterior NO pasaba — un salto es de un
 *    mes; si los dos meses recientes están altos, es deriva.
 *  - AUSENCIA (la completación del patrón): una serie regular
 *    (≥3 veces, con su paso medido entre las dos últimas) cuya
 *    última aparición lleva más de 1.5 pasos + 3 días sin volver.
 * El presupuesto de avisos: como máximo TRES candidatas por
 * episodio, ordenadas por impacto × evidencia. La histéresis es
 * el período: el id del episodio lleva el mes — la misma deriva
 * el mes que viene es un episodio nuevo, y dentro del mes la
 * misma candidata no se duplica. El descarte del usuario viaja
 * como supresión confirmada: quien llama puede pasar los ids
 * suprimidos y no vuelven. */
export type AskAlert = {
  id: string;
  kind: "deriva" | "salto" | "ausencia";
  concept: string;
  detail: string;
  amountMinor: number;
  evidence: number;
  score: number;
};

export function driftCandidates(state: LedgerState, key: string, lang: Lang, names: Namer, today: string, suppressed?: ReadonlySet<string>): AskAlert[] {
  const { display, rateE4 } = state.settings;
  const reading = readAdvisor(state, key, lang, names, { today: new Date(`${today}T12:00:00`) });
  const money = (n: number) => formatMoney(n, reading.currency, lang);
  const keys = Object.keys(state.months).filter((k) => k <= key).sort();
  const viewLine = (l: Line) => convertMinor(l.amountMinor, l.currency, display, rateE4);
  const fechaDe = (iso: string): string => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
    if (!m) return iso;
    const mo = Number(m[2]); const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1) return iso;
    return lang === "en" ? `${MONTH_WORDS_EN[mo - 1]} ${d}, ${m[1]}` : `${d} de ${MONTH_WORDS_ES[mo - 1]} de ${m[1]}`;
  };
  const out: AskAlert[] = [];
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) * (x - m)))); };
  const detect = (concept: string, series: number[], down: boolean): void => {
    const n = series.length;
    if (n < 5) return;
    const base = series.slice(0, n - 2);
    const mu = mean(base);
    if (mu <= 0) return;
    const sigma = Math.max(sd(base), mu * 0.02);
    const sgn = down ? -1 : 1;
    const dev = (x: number) => sgn * (x - mu);
    const cusum = series.slice(n - 2).reduce((a, x) => a + Math.max(0, dev(x) - 0.5 * sigma), 0);
    const recent = mean(series.slice(n - 2));
    const sorted = [...base].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))];
    const fence = q(0.75) + 1.5 * (q(0.75) - q(0.25));
    const last = series[n - 1];
    const prev = series[n - 2];
    const isSalto = !down && last > fence && prev <= fence && last > mu * 1.3;
    const pct = Math.round((Math.abs(recent - mu) / mu) * 100);
    if (isSalto) {
      const impact = last - mu;
      out.push({
        id: `salto|${foldQ(concept)}|${key}`, kind: "salto", concept,
        detail: L(lang, `«${concept}» saltó este mes: ${money(last)} contra su base de ${money(Math.round(mu))} al mes — pasa la cerca de lo típico y el mes pasado no pasaba.`, `"${concept}" jumped this month: ${money(last)} against its base of ${money(Math.round(mu))} a month — it clears the fence of the typical and last month it didn't.`),
        amountMinor: impact, evidence: n, score: Math.abs(impact) * n,
      });
      return;
    }
    if (cusum > 4 * sigma && sgn * (recent - mu) > mu * 0.15) {
      const impact = Math.round(recent - mu);
      out.push({
        id: `deriva|${foldQ(concept)}|${key}`, kind: "deriva", concept,
        detail: down
          ? L(lang, `Tu ingreso viene bajando de a poco: los últimos dos meses promedian ${money(Math.round(recent))} contra tu base de ${money(Math.round(mu))} al mes (−${pct}%). La suma paciente de las bajas (CUSUM) ya pasó la vara: no es un solo mes malo.`, `Your income has been drifting down: the last two months average ${money(Math.round(recent))} against your base of ${money(Math.round(mu))} a month (−${pct}%). The patient sum of the drops (CUSUM) has cleared the bar: it isn't a single bad month.`)
          : L(lang, `«${concept}» viene subiendo de a poco: los últimos dos meses promedian ${money(Math.round(recent))} contra su base de ${money(Math.round(mu))} al mes (+${pct}%). La suma paciente de los excesos (CUSUM) ya pasó la vara: no es un solo mes caro.`, `"${concept}" has been drifting up: the last two months average ${money(Math.round(recent))} against its base of ${money(Math.round(mu))} a month (+${pct}%). The patient sum of the excesses (CUSUM) has cleared the bar: it isn't a single expensive month.`),
        amountMinor: impact, evidence: n, score: Math.abs(impact) * n,
      });
    }
  };
  // El gasto por categoría (sin ahorro: apartar más no es deriva).
  const catIds = new Set<string>();
  for (const k of keys) for (const l of state.months[k]?.lines ?? []) if (l.active && isOut(l) && roleOf(state, l.categoryId) !== "savings") catIds.add(l.categoryId);
  for (const catId of catIds) {
    const series = keys.map((k) => (state.months[k]?.lines ?? []).filter((l) => l.active && isOut(l) && l.categoryId === catId).reduce((a, l) => a + viewLine(l), 0));
    if (series.filter((x) => x > 0).length < 4) continue;
    detect(names.cat(catId), series, false);
  }
  // El ingreso total, a la baja.
  const incomeSeries = keys.map((k) => (state.months[k]?.lines ?? []).filter((l) => l.active && l.kind.startsWith("income")).reduce((a, l) => a + viewLine(l), 0));
  if (incomeSeries.filter((x) => x > 0).length >= 4) detect(L(lang, "Tu ingreso", "Your income"), incomeSeries, true);
  // La ausencia: series regulares cuya última aparición venció.
  const bySeries = new Map<string, Line[]>();
  for (const k of keys) for (const l of state.months[k]?.lines ?? []) {
    if (!l.active || !isOut(l) || roleOf(state, l.categoryId) === "savings") continue;
    const sid = l.seriesId || l.id;
    bySeries.set(sid, [...(bySeries.get(sid) ?? []), l]);
  }
  for (const [, ls] of bySeries) {
    if (ls.length < 3) continue;
    const dated = ls.map((l) => ({ l, on: lineDate(l) })).filter((x) => x.on).sort((a, b) => (a.on < b.on ? -1 : 1));
    if (dated.length < 3) continue;
    const gap = daysBetweenIso(dated[dated.length - 2].on, dated[dated.length - 1].on);
    if (gap <= 0) continue;
    const since = daysBetweenIso(dated[dated.length - 1].on, today);
    if (since <= gap * 1.5 + 3) continue;
    const amounts = dated.map((x) => viewLine(x.l)).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const name = dated[dated.length - 1].l.concept || names.cat(dated[dated.length - 1].l.categoryId);
    out.push({
      id: `ausencia|${foldQ(name)}|${key}`, kind: "ausencia", concept: name,
      detail: L(lang, `La cuota de «${name}» no llegó: solía caer cada ~${gap} días y la última fue el ${fechaDe(dated[dated.length - 1].on)} — lleva ${since} días contra su propio ritmo. Su monto típico es ${money(median)}.`, `The "${name}" payment didn't arrive: it used to land every ~${gap} days and the last one was ${fechaDe(dated[dated.length - 1].on)} — it's ${since} days against its own rhythm. Its typical amount is ${money(median)}.`),
      amountMinor: median, evidence: dated.length, score: median * dated.length,
    });
  }
  return out
    .filter((a) => !(suppressed && suppressed.has(a.id)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function derivaAnswer(c: Ctx, folded: string): BankResult | null {
  // ENMIENDA DE CANON (integración de la Ola 33): la canónica inglesa
  // «Did anything change…?» no entraba por la puerta («anything
  // change» no era «anything new/off/unusual» ni «what changed») —
  // el barrido F2 de canon la caza; la copia no tenía ese barrido.
  if (!/(algo (cambio|raro|nuevo)|que cambio|que hay de nuevo|deberia saber|hay (avisos|algo)|avisos|what changed|anything (new|off|unusual|change|changed)|heads up|should i know)/.test(folded)) return null;
  const alerts = driftCandidates(c.state, c.key, c.lang, c.names, c.today);
  const src = ["libros.lineas", "asesor.lectura"];
  if (!alerts.length) {
    return {
      kind: "answer", family: "deriva",
      verdict: L(c.lang, "Nada que avisar: corrí la deriva sobre tu libro y ningún gasto viene subiendo de a poco, ningún salto pasa la cerca de lo típico, tu ingreso no viene bajando y no falta ninguna cuota esperada. Un mes raro solo no dispara un aviso en esta casa.", "Nothing to flag: I ran the drift check over your book and no spending is creeping up, no jump clears the fence of the typical, your income isn't drifting down and no expected payment is missing. A single odd month doesn't raise a flag in this house."),
      pieces: [],
      note: L(c.lang, "La vara, dicha: la deriva se nombra cuando la suma paciente de los excesos (CUSUM, k = ½σ) pasa 4σ con el nivel reciente 15% sobre la base; el salto, cuando un mes pasa la cerca de Tukey y el anterior no pasaba. Cuando hay avisos, enseño hasta tres, ordenados por monto y evidencia.", "The bar, stated: drift is named when the patient sum of excesses (CUSUM, k = ½σ) passes 4σ with the recent level 15% above base; a jump, when one month clears the Tukey fence and the previous one didn't. When there are flags, I show at most three, ranked by amount and evidence."),
      source: src, lines: 0,
    };
  }
  return {
    kind: "answer", family: "deriva",
    verdict: L(c.lang, `Hay ${alerts.length === 1 ? "una cosa" : `${alerts.length} cosas`} que avisar de tu libro, en orden de peso: ${alerts.map((a) => a.detail).join(" ")}`, `There ${alerts.length === 1 ? "is one thing" : `are ${alerts.length} things`} to flag in your book, in order of weight: ${alerts.map((a) => a.detail).join(" ")}`),
    pieces: alerts.map((a) => ({ label: a.concept, minor: a.amountMinor })),
    note: L(c.lang, "Son candidatas medidas de tu libro, no predicciones. La vara, dicha: la deriva se nombra cuando la suma paciente de los excesos (CUSUM, k = ½σ) pasa 4σ con el nivel reciente 15% sobre la base; el salto, cuando un mes pasa la cerca de Tukey y el anterior no pasaba; la ausencia, cuando una serie regular lleva más de paso y medio sin volver. El presupuesto: hasta tres avisos, por monto × evidencia.", "These are measured candidates from your book, not predictions. The bar, stated: drift is named when the patient sum of excesses (CUSUM, k = ½σ) passes 4σ with the recent level 15% above base; a jump, when one month clears the Tukey fence and the previous one didn't; an absence, when a regular series is more than a step and a half overdue. The budget: at most three flags, by amount × evidence."),
    source: src, lines: 0,
  };
}

/* OLA 34 · LOS OBJETOS QUE FALTABAN (investigación II, mecanismo
 * #8 y las vetas de la §8). Cuatro piezas honestas sobre lo que el
 * libro es y lo que no es todavía. */

/** LA TANDA: el libro no tiene el objeto — FALTA lo nombra con su
 * especificación en palabras, jamás disfrazada de suscripción ni de
 * ahorro. La especificación completa para canon va en TANDA-SPEC.md. */
function tandaAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/\b(tanda|rosca)\b/.test(folded)) return null;
  return {
    kind: "answer", family: "falta",
    verdict: L(c.lang, "De la tanda no te puedo contar nada todavía: Faro no lleva tandas — el objeto no existe en tu libro, y no lo disfrazo de suscripción ni de ahorro porque no es ninguna de las dos cosas. Una tanda es un turno compartido: se pone una cuota fija por turno entre varias personas, el bote entero le toca a una en cada turno, y tu posición en el orden decide cuándo te toca recibir.", "About the tanda I can't tell you anything yet: Faro doesn't track tandas — the object doesn't exist in your book, and I won't dress it up as a subscription or as savings because it's neither. A tanda is a shared rotation: everyone puts in a fixed amount each turn, the whole pot goes to one person per turn, and your position in the order decides when you receive."),
    pieces: [],
    note: L(c.lang, "Lo que haría falta anotar para contarla de verdad: la cuota por turno, cuántas personas son, tu posición en el orden, cuándo empezó y si ya recibiste tu turno. Con eso, el asesor podría decir cuánto llevas puesto, cuánto falta para tu turno y cuánto has puesto contra lo que el bote te daría. La especificación completa quedó escrita para quien construya el objeto.", "What would need recording to tell it truly: the amount per turn, how many people there are, your position in the order, when it started and whether you've already received your turn. With that, the advisor could say how much you've put in, how long until your turn, and what you've put in against what the pot would give you. The full specification is written down for whoever builds the object."),
    source: ["libros.lineas"], lines: 0,
  };
}

/** LA ANTIGÜEDAD DE LAS DEUDAS: cubetas del libro (0 / 1–30 /
 * 31–60 / 61–90 / más de 90 días desde el inicio anotado), sin
 * adjetivos. Lo que no trae fecha de inicio se nombra aparte con
 * su monto: jamás se le inventa una edad. */
function antiguedadAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(que tan viej|antiguedad|desde cuando|cuanto tiempo.{0,24}(deud|debo|prestam)|how old|age of (my|the) debt|how long.{0,20}(owed|debt))/.test(folded)) return null;
  const loans = loansOf(c.state).filter((l) => !l.archived);
  type Row = { name: string; left: number; on: string; days: number };
  const rows: Row[] = [];
  for (const l of loans) {
    const f = loanState(c.state, l, c.today);
    const left = convertMinor(f.left, l.currency, c.display, c.rateE4);
    if (left <= 0) continue;
    if (l.takenOn) rows.push({ name: l.lender, left, on: l.takenOn, days: Math.max(0, daysBetweenIso(l.takenOn, c.today)) });
  }
  const loanIds = new Set(loans.map((l) => l.id));
  const undated = planDebts(c.state, c.today).filter((d) => !loanIds.has(d.id)).reduce((a, d) => a + d.left, 0)
    + loans.filter((l) => !l.takenOn).reduce((a, l) => a + convertMinor(loanState(c.state, l, c.today).left, l.currency, c.display, c.rateE4), 0);
  const src = ["cobros.debo"];
  if (!rows.length && undated <= 0) {
    return { kind: "answer", family: "deudas", verdict: L(c.lang, "No debes nada anotado: sin préstamos vivos no hay antigüedad que contar.", "You owe nothing recorded: with no live loans there's no age to tell."), pieces: [], note: null, source: src, lines: 0 };
  }
  if (!rows.length) {
    return { kind: "answer", family: "deudas", verdict: L(c.lang, `Tus deudas suman ${c.money(undated)}, pero ninguna trae fecha de inicio anotada: su antigüedad no se puede medir sin inventarla, y no la invento.`, `Your debts total ${c.money(undated)}, but none carries a recorded start date: their age can't be measured without inventing it, and I don't invent it.`), pieces: [{ label: L(c.lang, "Sin fecha de inicio anotada", "No recorded start date"), minor: undated }], note: null, source: src, lines: 0 };
  }
  const buckets: Array<{ label: string; test: (d: number) => boolean }> = [
    { label: L(c.lang, "De hoy", "From today"), test: (d) => d <= 0 },
    { label: L(c.lang, "De 1 a 30 días", "1 to 30 days old"), test: (d) => d >= 1 && d <= 30 },
    { label: L(c.lang, "De 31 a 60 días", "31 to 60 days old"), test: (d) => d >= 31 && d <= 60 },
    { label: L(c.lang, "De 61 a 90 días", "61 to 90 days old"), test: (d) => d >= 61 && d <= 90 },
    { label: L(c.lang, "De más de 90 días", "Over 90 days old"), test: (d) => d > 90 },
  ];
  const pieces: BankPiece[] = [];
  const parts: string[] = [];
  for (const b of buckets) {
    const inB = rows.filter((r) => b.test(r.days));
    if (!inB.length) continue;
    const sum = inB.reduce((a, r) => a + r.left, 0);
    pieces.push({ label: b.label, minor: sum });
    parts.push(L(c.lang, `${b.label.toLowerCase()}: ${c.money(sum)} (${inB.map((r) => `«${r.name}»`).join(", ")})`, `${b.label}: ${c.money(sum)} (${inB.map((r) => `"${r.name}"`).join(", ")})`));
  }
  const oldest = rows.reduce((a, r) => (r.days > a.days ? r : a), rows[0]);
  return {
    kind: "answer", family: "deudas",
    verdict: L(c.lang, `Tus deudas con fecha de inicio, por edad — cubetas de tu libro, sin adjetivos: ${parts.join("; ")}. La de más tiempo: «${oldest.name}», empezó el ${fmtFecha(c, oldest.on)}, hace ${oldest.days} días, y quedan ${c.money(oldest.left)}.`, `Your debts with a recorded start, by age — buckets from your book, no adjectives: ${parts.join("; ")}. The longest-running: "${oldest.name}", started ${fmtFecha(c, oldest.on)}, ${oldest.days} days ago, with ${c.money(oldest.left)} left.`),
    pieces,
    note: undated > 0 ? L(c.lang, `Aparte: ${c.money(undated)} en deudas sin fecha de inicio anotada — su antigüedad no se puede medir y no se les inventa una.`, `Separately: ${c.money(undated)} in debts with no recorded start date — their age can't be measured and none is invented for them.`) : null,
    source: src, lines: 0,
  };
}

/** LAS RELACIONES DE ALLEN SOBRE LOS EXTREMOS DEL LIBRO: dos
 * ciudadanos nombrados, sus intervalos [primera, última aparición]
 * y la relación en palabras llanas — antes (con su hueco), se
 * tocan (el mismo día), se solapan, empiezan el mismo día. */
function allenAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(antes o despues|que (fue|paso) primero|which came first|before or after)/.test(folded)) return null;
  type Citizen = { label: string; folded: string; test: (l: Line) => boolean; at: number };
  const found: Citizen[] = [];
  const push = (label: string, test: (l: Line) => boolean) => {
    const f = foldQ(label).trim();
    if (f.length < 3 || found.some((x) => x.folded === f)) return;
    const at = folded.search(new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`));
    if (at >= 0) found.push({ label, folded: f, test, at });
  };
  const concepts = new Set<string>();
  for (const mk of Object.keys(c.state.months)) for (const l of c.state.months[mk]?.lines ?? []) if (l.concept) concepts.add(l.concept);
  for (const concept of concepts) push(concept, (l) => l.concept === concept);
  for (const cat of c.state.structure.categories) push(c.names.cat(cat.id), (l) => l.categoryId === cat.id);
  found.sort((a, b) => a.at - b.at);
  if (found.length < 2) return null;
  const [A, B] = [found[0], found[1]];
  const span = (ct: Citizen): { first: string; last: string } | null => {
    const dates: string[] = [];
    for (const mk of Object.keys(c.state.months)) {
      if (mk > c.key) continue;
      for (const l of c.state.months[mk]?.lines ?? []) {
        if (!l.active || !ct.test(l)) continue;
        const d = lineDate(l);
        if (d && d <= c.today) dates.push(d);
      }
    }
    if (!dates.length) return null;
    dates.sort();
    return { first: dates[0], last: dates[dates.length - 1] };
  };
  const sa = span(A); const sb = span(B);
  if (!sa || !sb) return null;
  let relation: string;
  if (sa.last < sb.first) {
    const gap = daysBetweenIso(sa.last, sb.first);
    relation = L(c.lang, `«${A.label}» va ANTES: su última aparición (${fmtFecha(c, sa.last)}) queda ${gap} días antes de la primera de «${B.label}» — entre los dos hay un hueco sin ninguno.`, `"${A.label}" comes BEFORE: its last appearance (${fmtFecha(c, sa.last)}) sits ${gap} days before the first of "${B.label}" — between the two there's a gap with neither.`);
  } else if (sb.last < sa.first) {
    const gap = daysBetweenIso(sb.last, sa.first);
    relation = L(c.lang, `«${A.label}» va DESPUÉS: «${B.label}» terminó el ${fmtFecha(c, sb.last)}, ${gap} días antes de que «${A.label}» empezara.`, `"${A.label}" comes AFTER: "${B.label}" ended ${fmtFecha(c, sb.last)}, ${gap} days before "${A.label}" began.`);
  } else if (sa.last === sb.first) {
    relation = L(c.lang, `Se TOCAN: el último día de «${A.label}» es el primer día de «${B.label}» — ${fmtFecha(c, sa.last)}.`, `They MEET: the last day of "${A.label}" is the first day of "${B.label}" — ${fmtFecha(c, sa.last)}.`);
  } else if (sb.last === sa.first) {
    relation = L(c.lang, `Se TOCAN: el último día de «${B.label}» es el primer día de «${A.label}» — ${fmtFecha(c, sb.last)}.`, `They MEET: the last day of "${B.label}" is the first day of "${A.label}" — ${fmtFecha(c, sb.last)}.`);
  } else if (sa.first === sb.first) {
    relation = L(c.lang, `Empiezan el MISMO día — ${fmtFecha(c, sa.first)} — y conviven desde ahí.`, `They start the SAME day — ${fmtFecha(c, sa.first)} — and run together from there.`);
  } else {
    relation = L(c.lang, `Se SOLAPAN: el primero de «${B.label}» (${fmtFecha(c, sb.first)}) cae dentro del tiempo de «${A.label}» (del ${fmtFecha(c, sa.first)} al ${fmtFecha(c, sa.last)}), y conviven.`, `They OVERLAP: the first of "${B.label}" (${fmtFecha(c, sb.first)}) falls inside the span of "${A.label}" (${fmtFecha(c, sa.first)} to ${fmtFecha(c, sa.last)}), and they run together.`);
  }
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `«${A.label}» aparece por primera vez el ${fmtFecha(c, sa.first)} y «${B.label}» el ${fmtFecha(c, sb.first)}. ${relation}`, `"${A.label}" first appears ${fmtFecha(c, sa.first)} and "${B.label}" ${fmtFecha(c, sb.first)}. ${relation}`),
    pieces: [],
    note: null,
    source: ["libros.lineas", "historial.stream"],
    lines: 0,
    actions: reportDoor(c, "historial.stream", "Verlos en el Historial", "See them in History"),
  };
}

/* OLA 35 · LA COLA LARGA CON CENSO (investigación II, mecanismo
 * #9 — BANKING77: la mayoría de las preguntas reales no piden un
 * cálculo, piden ESTADO, AUSENCIA e IDENTIDAD: «¿ya pagué?»,
 * «¿qué me falta?», «¿qué es este cargo?»). Tres familias con
 * plantillas sin vergüenza (Moorhouse 2023): la forma llana se
 * construye, no se aparta por no ser cálculo. */

/** LA AUSENCIA EN EL LIBRO: lo que debería estar y no está —
 * las series que no llegaron (las candidatas de ausencia de la
 * Ola 33) y el gasto que desapareció (una categoría con historia
 * cuyo mes en curso va en cero y que solía empezar antes de hoy).
 * La ausencia se dice DEL LIBRO, no del mundo: si fue a
 * propósito, no falta nada — y la respuesta lo admite. */
function ausenciaAnswer(c: Ctx, folded: string): BankResult | null {
  // ENMIENDA DE CANON (integración de la Ola 35): la canónica inglesa
  // «What hasn't shown up?» no entraba por la puerta («what haven»
  // no oye «hasn») — el barrido F2 de canon lo cazó; la copia no
  // barría sus propias canónicas.
  if (!/(que (me )?falta|que no (he|ha) |que no aparece|que gasto no|falta por (pagar|anotar)|what('s| is) missing|what (haven|hasn)|anything missing|shown up)/.test(folded)) return null;
  const parts: string[] = [];
  const pieces: BankPiece[] = [];
  for (const a of driftCandidates(c.state, c.key, c.lang, c.names, c.today).filter((x) => x.kind === "ausencia")) {
    parts.push(a.detail);
    pieces.push({ label: a.concept, minor: a.amountMinor });
  }
  const keys = Object.keys(c.state.months).filter((k) => k < c.key).sort();
  const todayDay = Number(c.today.slice(8, 10));
  for (const cat of c.state.structure.categories) {
    if (roleOf(c.state, cat.id) === "savings" || roleOf(c.state, cat.id) === "debt") continue;
    let monthsWith = 0;
    let total = 0;
    const firstDays: number[] = [];
    for (const mk of keys) {
      const ls = (c.state.months[mk]?.lines ?? []).filter((l) => l.active && isOut(l) && l.categoryId === cat.id);
      if (!ls.length) continue;
      monthsWith++;
      total += ls.reduce((a, l) => a + view(c, l), 0);
      const ds = ls.map((l) => lineDate(l)).filter(Boolean).sort();
      if (ds.length) firstDays.push(Number(ds[0].slice(8, 10)));
    }
    if (monthsWith < 4 || total <= 0) continue;
    const cur = (c.state.months[c.key]?.lines ?? []).filter((l) => l.active && isOut(l) && l.categoryId === cat.id);
    if (cur.length) continue;
    firstDays.sort((a, b) => a - b);
    const medFirst = firstDays[Math.floor(firstDays.length / 2)];
    if (!(medFirst < todayDay)) continue;
    const typical = Math.round(total / monthsWith);
    parts.push(L(c.lang, `De «${c.names.cat(cat.id)}» no aparece nada este mes, y solía empezar hacia el día ${medFirst}: su mes típico es ${c.money(typical)}.`, `Nothing shows under "${c.names.cat(cat.id)}" this month, and it used to start around day ${medFirst}: its typical month is ${c.money(typical)}.`));
    pieces.push({ label: c.names.cat(cat.id), minor: typical });
  }
  const src = ["libros.lineas", "cobros.cuotas"];
  if (!parts.length) {
    return {
      kind: "answer", family: "ausencia",
      verdict: L(c.lang, "No falta nada que tu libro eche en falta: las series que espero han llegado a su ritmo y ninguna categoría con historia va en cero este mes. La ausencia se juzga contra el ritmo del propio libro, no contra un calendario inventado.", "Nothing is missing that your book misses: the series I expect have landed on their rhythm and no category with a history is sitting at zero this month. Absence is judged against the book's own rhythm, not an invented calendar."),
      pieces: [], note: null, source: src, lines: 0,
    };
  }
  return {
    kind: "answer", family: "ausencia",
    verdict: L(c.lang, `Lo que tu libro echa en falta: ${parts.join(" ")}`, `What your book is missing: ${parts.join(" ")}`),
    pieces,
    note: L(c.lang, "Ojo: esto es ausencia EN EL LIBRO, no en el mundo — si lo pagaste sin anotarlo, o si este mes fue a propósito, no falta nada. La vara es el ritmo del propio libro: la serie que solía llegar y la categoría que solía empezar antes de hoy.", "Note: this is absence IN THE BOOK, not in the world — if you paid it without recording it, or this month was on purpose, nothing is missing. The bar is the book's own rhythm: the series that used to land and the category that used to start before today."),
    source: src, lines: 0,
  };
}

/** OLA 68 · EL CARGO SUELTO (el estudio de los grandes, 2026-11-25):
 * la pregunta suelta más repetida del campo es sobre UN cargo
 * (Copilot: «What is this charge from?»; Eno: el duplicado y el
 * cargo no reconocido; Banking77 la domina). La identidad (Ola 35)
 * ya nombra un cargo por su monto o su nombre cuando la pregunta
 * trae su forma («¿qué es este cargo?»); lo que el banco no oía
 * era el resto del territorio: el cargo traído por su COMERCIO
 * («¿cuál fue el cargo de Amazon?»), el cargo NO RECONOCIDO («no
 * reconozco este cargo de $12»), el cargo cobrado DOS VECES con su
 * nombre («¿me cobraron dos veces el internet?», que frecuencia no
 * oía en español), el ORIGEN del cargo («¿de dónde salió este
 * cargo de $250?», que el porqué se robaba) y la FUENTE del cargo
 * («¿fue con tarjeta o de mi cuenta?»). La puerta es estrecha a
 * propósito: la palabra cargo/charge Y una de esas voces. La forma
 * de identidad queda donde estaba.
 * (Puerto a canon 1.3.461: el escaneo de ciudadano llama al
 * citizenByName de canon, de tres argumentos; el abrazo bilingüe
 * del nombre — otherNamer — llega con la sonda del
 * code-switching, que es el paquete que sube esa costura.) */
function cargoAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  if (!/(carg|cobr|charge|charged)/.test(folded)) return null;
  const unrec = /(no (lo |la )?reconozco|no reconozco|no se que es|no se de que es|no recuerdo (este|ese|haber)|don't recogn|do not recogn|don't remember|unrecogn)/.test(folded);
  const twice = /(dos veces|twice|double[- ]?charg|cobraron dos|cobrado dos|charged twice)/.test(folded);
  const sourceAsk = /(con tarjeta|con que (pague|tarjeta|cuenta)|de mi cuenta salio|de que cuenta (salio|fue)|from which account|which (card|account) (was|did)|what card|fue con (tarjeta|efectivo))/.test(folded);
  const originAsk = /(de donde (salio|es|vino)|where did (this|that|the) charge come from)/.test(folded);
  /* La forma inglesa «what is this/that charge» es de identidad
   * (su detForm): esta puerta solo toma el pasado («what was the
   * Amazon charge») y el artículo sin demostrativo — la onda
   * hostil de las mutaciones cazó el robo sobre las canónicas
   * inglesas de identidad. */
  const identifyAsk = /(de que es|que cargo es|cual (es|fue) el cargo|what was [^?]{0,40}charge|what is (the|a) [^?]{0,30}charge|which charge|what charge)/.test(folded);
  if (!unrec && !twice && !sourceAsk && !originAsk && !identifyAsk) return null;
  type Hit = { l: Line; mk: string };
  const all: Hit[] = [];
  for (const mk of Object.keys(c.state.months)) {
    if (mk > c.key) continue;
    for (const l of c.state.months[mk]?.lines ?? []) if (l.active) all.push({ l, mk });
  }
  all.sort((a, b) => (lineDate(b.l) || "").localeCompare(lineDate(a.l) || ""));
  const amts = amountsIn(raw);
  let citizen: { display: string; folded: string; fn: (l: Line) => boolean } | null = null;
  for (const w of folded.split(/[^a-z0-9]+/).filter((x) => x.length >= 4)) {
    if (/^(cargo|cargos|cobro|cobros|charge|charges|charged|veces|twice|donde|where|cuenta|account|tarjeta|card)$/.test(w)) continue;
    citizen = citizenByName(c.state, c.names, w);
    if (citizen) break;
  }
  let hits: Hit[] = [];
  if (amts.length) {
    const targets = amts.map((a) => convertMinor(a.minor, a.currency, c.display, c.rateE4));
    hits = all.filter((h) => targets.some((t) => Math.abs(view(c, h.l) - t) <= 1));
  }
  if (!hits.length && citizen) hits = all.filter((h) => citizen!.fn(h.l));
  const src = ["libros.lineas"];
  /* La llave de serie de esta familia: el concepto con su
   * subcategoría. El seriesId crudo no sirve como llave única:
   * dos instancias del mismo cargo pueden traer seriesId
   * distintos (la importación y los libros viejos), y lo que el
   * usuario reconoce como «el mismo cargo» es el nombre con su
   * clase, no el identificador interno. */
  const seriesKey = (l: Line): string => (l.concept ? `${l.concept}|${l.subId ?? ""}` : (l.seriesId || l.id));
  const door = reportDoor(c, "historial.stream", "Verlo en el Historial", "See it in History");
  const notFound: BankResult = {
    kind: "answer", family: "cargo",
    verdict: L(c.lang, "No encuentro un cargo así anotado en tu libro: ni por el monto ni por el nombre que trajiste. Si el cargo existe y no está anotado, el libro no lo puede identificar: dime el monto exacto o el nombre tal cual aparece y lo busco de nuevo.", "I can't find a charge like that recorded in your book: not by the amount, not by the name you brought. If the charge exists and was never recorded, the book can't identify it: give me the exact amount or the name as it appears and I'll look again."),
    pieces: [], note: null, source: src, lines: 0,
  };
  const describeHit = (h: Hit): string => {
    const l = h.l;
    const name = l.concept || c.names.cat(l.categoryId);
    const catTxt = c.names.cat(l.categoryId) + (l.subId ? ` · ${c.names.sub(l.subId)}` : "");
    const kindTxt = l.kind === "subscription" ? L(c.lang, "una suscripción", "a subscription")
      : l.kind === "purchase" ? L(c.lang, "una compra", "a purchase")
        : l.kind.startsWith("income") ? L(c.lang, "un ingreso", "an income") : L(c.lang, "un gasto", "a charge");
    const storeTxt = l.storeId ? L(c.lang, `, en ${c.names.catalog(l.storeId)}`, `, at ${c.names.catalog(l.storeId)}`) : "";
    const date = lineDate(l);
    return L(c.lang, `«${name}» es ${kindTxt} de ${catTxt}${storeTxt}: ${c.money(view(c, l))}${date ? `, el ${fmtFecha(c, date)}` : ""}.`, `"${name}" is ${kindTxt} under ${catTxt}${storeTxt}: ${c.money(view(c, l))}${date ? `, on ${fmtFecha(c, date)}` : ""}.`);
  };
  // DOS VECES: el mismo ciudadano, el mismo monto, dos líneas.
  if (twice) {
    const pool = hits.length ? hits : all;
    const byKey = new Map<string, Hit[]>();
    for (const h of pool) {
      const k = `${seriesKey(h.l)}|${view(c, h.l)}`;
      byKey.set(k, [...(byKey.get(k) ?? []), h]);
    }
    const dup = [...byKey.values()].filter((g) => g.length >= 2 && g.some((h) => h.mk === c.key));
    if (dup.length) {
      const g = dup[0];
      const dates = g.map((h) => lineDate(h.l)).filter(Boolean).sort();
      return {
        kind: "answer", family: "cargo",
        verdict: L(c.lang, `Sí: ${describeHit(g[0])} Y aparece ${g.length} veces con el mismo monto${dates.length ? ` (el ${dates.map((d) => fmtFecha(c, d)).join(" y el ")})` : ""}. Repetido no quiere decir cobrado mal por fuerza: una suscripción y su cobro de este mes se parecen; si solo esperabas un cobro, el que sobra es el que hay que mirar.`, `Yes: ${describeHit(g[0])} And it appears ${g.length} times with the same amount${dates.length ? ` (on ${dates.map((d) => fmtFecha(c, d)).join(" and ")})` : ""}. Repeated doesn't automatically mean wrongly charged: a subscription and this month's charge look alike; if you expected only one charge, the extra one is the one to look at.`),
        pieces: [], note: null, source: src, lines: g.length, actions: door,
      };
    }
    if (hits.length) {
      return {
        kind: "answer", family: "cargo",
        verdict: L(c.lang, `No: ${describeHit(hits[0])} Y aparece una sola vez en tu libro. No hay un segundo cobro igual anotado.`, `No: ${describeHit(hits[0])} And it appears only once in your book. There is no second matching charge recorded.`),
        pieces: [], note: null, source: src, lines: hits.length, actions: door,
      };
    }
    return {
      kind: "answer", family: "cargo",
      verdict: L(c.lang, "No veo ningún cargo repetido con el mismo nombre y el mismo monto en tu libro. Si el cobro duplicado existe y no está anotado dos veces, el libro no lo puede ver: anótalo y te lo comparo.", "I don't see any repeated charge with the same name and the same amount in your book. If the duplicate charge exists and isn't recorded twice, the book can't see it: record it and I'll compare it."),
      pieces: [], note: null, source: src, lines: 0,
    };
  }
  if (!hits.length) return notFound;
  // LA FUENTE: ¿de qué cuenta o tarjeta salió?
  if (sourceAsk) {
    const h = hits[0];
    if (h.l.sourceId) {
      return {
        kind: "answer", family: "cargo",
        verdict: L(c.lang, `${describeHit(h)} Salió de «${c.names.catalog(h.l.sourceId)}», que es lo que el libro guarda como su cuenta de origen.`, `${describeHit(h)} It came from "${c.names.catalog(h.l.sourceId)}", which is what the book keeps as its source account.`),
        pieces: [], note: null, source: src, lines: hits.length, actions: door,
      };
    }
    return {
      kind: "answer", family: "cargo",
      verdict: L(c.lang, `${describeHit(h)} De su origen el libro no guarda nada: esta línea no trae anotada la cuenta ni la tarjeta de la que salió, así que no te lo puedo decir sin inventarlo.`, `${describeHit(h)} About its source the book keeps nothing: this line has no account or card recorded as where it came from, so I can't tell you without inventing it.`),
      pieces: [], note: null, source: src, lines: hits.length, actions: door,
    };
  }
  // IDENTIFICAR (también el no reconocido y el origen): si el monto
  // casa con series distintas, se listan y no se elige.
  const seriesKeys = new Set(hits.map((h) => seriesKey(h.l)));
  if (seriesKeys.size > 1 && amts.length) {
    const reps = [...seriesKeys].slice(0, 3).map((k) => describeHit(hits.find((h) => seriesKey(h.l) === k)!));
    return {
      kind: "answer", family: "cargo",
      verdict: L(c.lang, `Ese monto aparece en ${seriesKeys.size} cargos distintos y no elijo por ti: ${reps.join(" ")} La fecha y el nombre son el dato que los distingue.`, `That amount appears on ${seriesKeys.size} different charges and I won't pick for you: ${reps.join(" ")} The date and the name are the telling details.`),
      pieces: [], note: null, source: src, lines: hits.length, actions: door,
    };
  }
  const h = hits[0];
  const sameMonthDup = hits.some((x) => x !== h && x.mk === h.mk && seriesKey(x.l) === seriesKey(h.l) && view(c, x.l) === view(c, h.l));
  return {
    kind: "answer", family: "cargo",
    verdict: describeHit(h) + (sameMonthDup ? L(c.lang, " Ojo: ese mismo mes hay otro cargo igual en monto de la misma serie; si me preguntas si está duplicado, te los comparo.", " Note: that same month there is another charge for the same amount from the same series; if you ask me whether it's duplicated, I'll compare them.") : ""),
    pieces: [],
    note: unrec
      ? L(c.lang, "Eso es todo lo que tu libro dice de ese cargo. Si aun así no lo reconoces, la disputa va con el banco o la tarjeta que lo cobró: el libro guarda lo que se anotó, no puede juzgar si un cargo es legítimo.", "That is everything your book says about that charge. If you still don't recognize it, the dispute goes to the bank or the card that charged it: the book keeps what was recorded, it can't judge whether a charge is legitimate.")
      : null,
    source: src, lines: hits.length, actions: door,
  };
}

/** LA IDENTIDAD: «¿qué es este cargo?» — candidatas con la
 * evidencia dicha y el criterio declarado, nunca una adivinanza.
 * Si hay varias, se listan con el dato que las distingue. */
function identidadAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  // Dos formas: con determinante («¿qué es este cargo?») y desnuda
  // («¿qué es Internet?») — la desnuda solo entra si un ciudadano
  // del libro resuelve en la pregunta; un «¿qué es…?» sin ciudadano
  // no es de esta familia (la caza de la ola 35).
  const detForm = /(que es (este|ese|esta|un|una)|what is (this|that))/.test(folded);
  let named: { display: string; folded: string; fn: (l: Line) => boolean } | null = null;
  if (!detForm) {
    // ENMIENDA DE CANON (integración de la Ola 35): el dato que vive
    // en los burós no es un ciudadano del libro — «What is my credit
    // score?» resolvía la categoría «Credit» por la palabra suelta y
    // la identidad se tragaba la canónica inglesa de FALTA (el
    // barrido F2 de canon lo cazó; la copia no barría esa canónica).
    if (/(patrimonio|valor neto|net worth|puntaje|credit score|score de credito)/.test(folded)) return null;
    if (!/^[¿¡\s]*(que es|what is)\b/.test(folded)) return null;
    for (const w of folded.split(/[^a-z0-9]+/).filter((x) => x.length >= 4)) {
      named = citizenByName(c.state, c.names, w);
      if (named) break;
    }
    if (!named) return null;
  }
  type Hit = { l: Line; mk: string };
  const all: Hit[] = [];
  for (const mk of Object.keys(c.state.months)) {
    if (mk > c.key) continue;
    for (const l of c.state.months[mk]?.lines ?? []) if (l.active) all.push({ l, mk });
  }
  let hits: Hit[] = [];
  const amts = amountsIn(raw, c.display);
  if (amts.length) {
    const targets = amts.map((a) => convertMinor(a.minor, a.currency, c.display, c.rateE4));
    hits = all.filter((h) => targets.some((t) => Math.abs(view(c, h.l) - t) <= 1));
  } else if (named) {
    hits = all.filter((h) => named!.fn(h.l));
  } else {
    const words = folded.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    for (const w of words) {
      const ct = citizenByName(c.state, c.names, w);
      if (ct) { hits = all.filter((h) => ct.fn(h.l)); if (hits.length) break; }
    }
  }
  const src = ["libros.lineas", "historial.stream"];
  if (!hits.length) {
    return {
      kind: "answer", family: "identidad",
      verdict: L(c.lang, "No encuentro ningún cargo así en tu libro: ni por el monto ni por el nombre que trajiste. Si me das el monto exacto o el nombre tal cual aparece, lo busco de nuevo — no adivino cuál podría ser.", "I can't find any charge like that in your book: not by the amount, not by the name you brought. Give me the exact amount or the name as it appears and I'll look again — I don't guess which one it might be."),
      pieces: [], note: null, source: src, lines: 0,
    };
  }
  const byKey = new Map<string, Hit[]>();
  for (const h of hits) {
    const k = h.l.seriesId || h.l.concept || h.l.id;
    byKey.set(k, [...(byKey.get(k) ?? []), h]);
  }
  const groups = [...byKey.values()].sort((a, b) => b.length - a.length);
  const describeGroup = (g: Hit[]): string => {
    const dates = g.map((h) => lineDate(h.l)).filter(Boolean).sort();
    const amounts = g.map((h) => view(c, h.l)).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const first = g[0].l;
    const name = first.concept || c.names.cat(first.categoryId);
    const catTxt = c.names.cat(first.categoryId) + (first.subId ? ` · ${c.names.sub(first.subId)}` : "");
    const kindTxt = first.kind === "subscription"
      ? L(c.lang, "una suscripción", "a subscription")
      : first.kind.startsWith("income") ? L(c.lang, "un ingreso", "an income") : L(c.lang, "un gasto", "a charge");
    return L(c.lang, `«${name}» es ${kindTxt} de ${catTxt}: ${g.length} ${g.length === 1 ? "vez anotada" : "veces anotadas"}${dates.length ? `, del ${fmtFecha(c, dates[0])} al ${fmtFecha(c, dates[dates.length - 1])}` : ""}, con monto típico de ${c.money(median)}.`, `"${name}" is ${kindTxt} under ${catTxt}: recorded ${g.length} time${g.length === 1 ? "" : "s"}${dates.length ? `, from ${fmtFecha(c, dates[0])} to ${fmtFecha(c, dates[dates.length - 1])}` : ""}, with a typical amount of ${c.money(median)}.`);
  };
  if (groups.length > 1) {
    return {
      kind: "answer", family: "identidad",
      verdict: L(c.lang, `Hay ${groups.length} candidatas en tu libro y no elijo por ti: ${groups.slice(0, 3).map(describeGroup).join(" ")} El dato que las distingue está en cada una: su fecha y su monto típico.`, `There are ${groups.length} candidates in your book and I won't pick for you: ${groups.slice(0, 3).map(describeGroup).join(" ")} The telling detail is in each: its dates and its typical amount.`),
      pieces: [], note: null, source: src, lines: hits.length,
      actions: reportDoor(c, "historial.stream", "Verlas en el Historial", "See them in History"),
    };
  }
  return {
    kind: "answer", family: "identidad",
    verdict: describeGroup(groups[0]),
    pieces: [],
    note: L(c.lang, "Lo identifico por la evidencia dicha — el nombre o el monto tal cual está anotado, su ritmo de apariciones y su monto típico — no por parecido: si no es ese, el dato que lo distingue lo separa.", "I identify it by the stated evidence — the name or amount exactly as recorded, its rhythm of appearances and its typical amount — not by resemblance: if it isn't that one, the telling detail separates it."),
    source: src, lines: hits.length,
    actions: reportDoor(c, "historial.stream", "Verlo en el Historial", "See it in History"),
  };
}

/** EL ESTADO DEL ÍTEM: «¿cómo va el préstamo de Carlos?» — la
 * extensión de ya-pagué a la foto completa del ítem: lo puesto,
 * lo devuelto con su porcentaje, lo que queda y el último
 * movimiento con su fecha. */
function estadoAnswer(c: Ctx, folded: string): BankResult | null {
  // «¿A cómo está el cambio?» NO es estado: es el conversor — la
  // tasa jamás se disfraza de ítem (la caza de la ola 35).
  if (/(cambio|tasa|dolar|euro|exchange|rate)/.test(folded)) return null;
  if (!/(como va|como esta|estado de|how is|status of|how's)/.test(folded)) return null;
  const persons = [...peopleOf(c.state, "owed", c.today), ...peopleOf(c.state, "owe", c.today)];
  const p = persons.find((x) => {
    const f = foldQ(x.name).trim();
    return f.length >= 3 && new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded);
  });
  if (p) {
    const lent = p.events.filter((e) => e.kind === "loan").reduce((a, e) => a + e.view, 0);
    const paid = p.events.filter((e) => e.kind === "pay").reduce((a, e) => a + e.view, 0);
    const pct = lent > 0 ? Math.round((paid / lent) * 100) : 0;
    const firstLoan = p.events.find((e) => e.kind === "loan");
    const owed = p.side === "owed";
    return {
      kind: "answer", family: "ya-pague",
      verdict: owed
        ? L(c.lang, `El préstamo de «${p.name}» va así: prestaste ${c.money(lent)}${firstLoan ? ` desde el ${fmtFecha(c, firstLoan.date)}` : ""}, te han devuelto ${c.money(paid)} (el ${pct}%), y quedan ${c.money(p.left)}. ${p.lastPay ? `El último pago fue el ${fmtFecha(c, p.lastPay)}${p.days !== null ? ` — hace ${p.days} días` : ""}.` : "Sin pagos anotados todavía."}`, `The loan to "${p.name}" stands like this: you lent ${c.money(lent)}${firstLoan ? ` starting ${fmtFecha(c, firstLoan.date)}` : ""}, you've been repaid ${c.money(paid)} (${pct}%), and ${c.money(p.left)} is left. ${p.lastPay ? `The last payment was ${fmtFecha(c, p.lastPay)}${p.days !== null ? ` — ${p.days} days ago` : ""}.` : "No payments recorded yet."}`)
        : L(c.lang, `Tu deuda con «${p.name}» va así: recibiste ${c.money(lent)}${firstLoan ? ` desde el ${fmtFecha(c, firstLoan.date)}` : ""}, has pagado ${c.money(paid)} (el ${pct}%), y quedan ${c.money(p.left)}. ${p.lastPay ? `El último pago fue el ${fmtFecha(c, p.lastPay)}${p.days !== null ? ` — hace ${p.days} días` : ""}.` : "Sin pagos anotados todavía."}`, `Your debt to "${p.name}" stands like this: you received ${c.money(lent)}${firstLoan ? ` starting ${fmtFecha(c, firstLoan.date)}` : ""}, you've paid ${c.money(paid)} (${pct}%), and ${c.money(p.left)} is left. ${p.lastPay ? `The last payment was ${fmtFecha(c, p.lastPay)}${p.days !== null ? ` — ${p.days} days ago` : ""}.` : "No payments recorded yet."}`),
      pieces: [
        { label: owed ? L(c.lang, "Prestado", "Lent") : L(c.lang, "Recibido", "Received"), minor: lent },
        { label: owed ? L(c.lang, "Devuelto", "Repaid") : L(c.lang, "Pagado", "Paid"), minor: paid },
        { label: L(c.lang, "Quedan", "Left"), minor: p.left },
      ],
      note: null,
      source: [owed ? "cobros.mideben" : "cobros.debo"],
      lines: p.events.length,
    };
  }
  const loan = loansOf(c.state).find((l) => !l.archived && foldQ(l.lender).length >= 3 && folded.includes(foldQ(l.lender)));
  if (loan) {
    const f = loanState(c.state, loan, c.today);
    const borrowed = convertMinor(loan.amountMinor, loan.currency, c.display, c.rateE4);
    const paidD = convertMinor(f.paid, loan.currency, c.display, c.rateE4);
    const leftD = convertMinor(f.left, loan.currency, c.display, c.rateE4);
    const pct = borrowed > 0 ? Math.round((paidD / borrowed) * 100) : 0;
    return {
      kind: "answer", family: "ya-pague",
      verdict: L(c.lang, `El préstamo de «${loan.lender}» va así: recibiste ${c.money(borrowed)} el ${fmtFecha(c, loan.takenOn)}, has pagado ${c.money(paidD)} (el ${pct}%), y quedan ${c.money(leftD)}${f.interest > 0 ? `, con ${c.money(convertMinor(f.interest, loan.currency, c.display, c.rateE4))} de interés contado por el libro` : ""}.`, `The loan from "${loan.lender}" stands like this: you received ${c.money(borrowed)} on ${fmtFecha(c, loan.takenOn)}, you've paid ${c.money(paidD)} (${pct}%), and ${c.money(leftD)} is left${f.interest > 0 ? `, with ${c.money(convertMinor(f.interest, loan.currency, c.display, c.rateE4))} of interest counted by the book` : ""}.`),
      pieces: [
        { label: L(c.lang, "Recibido", "Received"), minor: borrowed },
        { label: L(c.lang, "Pagado", "Paid"), minor: paidD },
        { label: L(c.lang, "Quedan", "Left"), minor: leftD },
      ],
      note: null, source: ["cobros.debo"], lines: 0,
    };
  }
  return null;
}


/* OLA 37 · LA CAPACIDAD Y SUS VOCES (la caza de Oscar, 2026-11-22):
 * «Si me compro un boleto por $500 y rento una casa por $1200,
 * ¿podría asumir el gasto?» — las compras podrían ser cualquier
 * cosa: lo que la pregunta trae son MONTOS, unos de una vez y otros
 * que se repiten, y pide un veredicto de capacidad. Antes de esta
 * ola la familia entera caía en silencio («asumir», «podría con»,
 * «aguanta», «¿cuánto gastaría en total?») o en el delegado, que
 * tomaba SOLO el primer monto y decía «sí» a un plan de $1,700 con
 * $750 en la queda — un sí mentiroso, peor que el silencio. La
 * forma: cada monto se lee en su cláusula (lo que se renta se
 * repite; lo que se compra, una vez), la suma se camina contra la
 * queda y lo programado del mes, y si hay gasto que se repite se
 * juzga también el ritmo de los meses que vienen contra el mes
 * típico medido. El cruce de tiempos se DECLARA en la nota.
 * Fronteras: el pago en su día sigue siendo de la forma del día; el
 * «¿puedo gastar $X hoy?» de un solo monto sigue en la verificación;
 * la sensibilidad («si la renta sube a…» sobre una línea del libro)
 * sigue en el hipotético; el «me da para X» de un solo monto simple
 * sigue en el delegado. */
/* RAMA AGENTE · E2 · LA PREGUNTA EN FIGURADO: «¿estoy palmado?»,
   «¿tengo un dineral?» (la idea de Alvin, traída por Oscar el
   2026-11-23). La figura se entiende como figura — la hipérbole de
   «tengo poco» o «tengo mucho» — y se responde el juicio contra el
   libro: lo que queda del mes (la lectura de readAdvisor) contra los
   pagos que aún vienen este mes (duesWindow hasta fin de mes, sin lo
   que me deben). Poco = la queda no cubre lo que viene; mucho = sobra
   más del doble de lo que viene. La vara se declara en la nota. Jamás
   se comprueba si el saldo es literalmente cero: la pregunta no era
   esa, y desmentir la forma de hablar del usuario no es responderla. */
function figuradaAnswer(c: Ctx, folded: string): BankResult | null {
  const lowFig = /\b(palmado|palmada|pelado|pelada|quebrado|quebrada|sin un real|broke|penniless|strapped)\b/.test(folded);
  const highFig = /\b(dineral|millonada|fortuna|fortune|flush|loaded)\b/.test(folded);
  if (!lowFig && !highFig) return null;
  const q = folded.includes("?");
  const isLow = lowFig && (q || /\b(dime si|estoy|ando|am i)\b/.test(folded));
  const isHigh = !isLow && highFig && (/\b(dime si|tengo|do i have)\b/.test(folded) || (/\bdineral\b/.test(folded) && q));
  if (!isLow && !isHigh) return null;
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const left = reading.left;
  const [yy, mm, dd] = c.today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const dueRest = duesWindow(c.state, Math.max(0, lastDay - dd), c.today)
    .filter((x) => x.kind !== "lent")
    .reduce((a, x) => a + (x.amt ?? 0), 0);
  const money = c.money;
  let verdict: string;
  if (isLow) {
    verdict = left <= 0
      ? L(c.lang, `Este mes, sí: no te queda margen. La lectura del mes está en ${money(left)}.`, `This month, yes: there's nothing left over. The month's reading is at ${money(left)}.`)
      : left <= dueRest
        ? L(c.lang, `Poco, sí: te quedan ${money(left)}, pero los pagos que vienen este mes suman ${money(dueRest)} — no alcanza a cubrirlos.`, `Very little: you have ${money(left)} left, but the payments still coming this month add up to ${money(dueRest)} — it won't cover them.`)
        : L(c.lang, `Del todo, no: te quedan ${money(left)} y los pagos que vienen suman ${money(dueRest)}. Después de ellos te restan ${money(left - dueRest)}.`, `Not quite: you have ${money(left)} left and the payments coming add up to ${money(dueRest)}. After them you'd still have ${money(left - dueRest)}.`);
  } else {
    verdict = left <= 0
      ? L(c.lang, `No: este mes la lectura está en ${money(left)} — no hay resto.`, `No: this month's reading is at ${money(left)} — there's nothing extra.`)
      : dueRest === 0
        ? L(c.lang, `Sí: te quedan ${money(left)} y no viene ningún pago más este mes.`, `Yes: you have ${money(left)} left and no more payments coming this month.`)
        : left >= dueRest * 2
          ? L(c.lang, `Sí: te quedan ${money(left)} y lo que viene suma ${money(dueRest)} — te sobra más del doble de lo que tienes que pagar.`, `Yes: you have ${money(left)} left and what's coming adds up to ${money(dueRest)} — you have more than twice what you need to pay.`)
          : L(c.lang, `Tanto, no: te quedan ${money(left)} y cubres lo que viene (${money(dueRest)}), pero te restan ${money(left - dueRest)} — es estar cubierto, no sobrado.`, `Not that much: you have ${money(left)} left and you cover what's coming (${money(dueRest)}), but you'd be left with ${money(left - dueRest)} — that's covered, not flush.`);
  }
  return {
    kind: "answer", family: "figurada",
    verdict,
    pieces: [
      { label: L(c.lang, "Lo que queda del mes", "What's left this month"), minor: left },
      { label: L(c.lang, "Los pagos que vienen", "The payments still coming"), minor: dueRest },
    ],
    note: L(c.lang, "Lo mido contra los pagos que te quedan este mes: «mucho» y «poco» solo dicen algo contra lo que viene.", "I measure it against this month's remaining payments: 'a lot' and 'a little' only mean something against what's coming."),
    source: ["central.queda", "central.pagos"], lines: 0,
  };
}

function capacidadAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  // La sensibilidad sobre una línea del libro es del hipotético.
  // PUERTO DE LA RAMA AGENTE (2026-11-24): la señal de la
  // sensibilidad es el CAMBIO (sube/baja/aumenta) — «cuesta» a secas
  // ya no cede aquí, porque la premisa de costo («la cena me cuesta
  // 200») es de ESTA puerta (la voz costMine, más abajo).
  if (/(sube|baja|aumenta)/.test(folded)) {
    const filter = filterOf(c, folded);
    if (filter && (c.state.months[c.key]?.lines ?? []).some((l) => l.active && isOut(l) && filter(l))) return null;
  }
  if (/(me entraron|me depositaron|acabo de recibir)/.test(folded)) return null;
  // ENMIENDA DE CANON (integración de la Ola 38): la premisa de
  // INGRESO hipotética («si me regalaran 300, ¿cuánto tendría?») es
  // del hipotético — su canónica cercada en canon — y el verbo
  // social «regalar» la secuestraba como si fuera un gasto.
  if (/(me regalaran|me regalaren|me dieran|me diesen|me pagaran)/.test(folded)) return null;
  // ENMIENDA DE CANON (integración de la Ola 38): «¿cuánto es lo
  // más que puedo GASTAR HOY?» es el ritmo seguro del promedio —
  // canónica viva de canon — no el tope de un gasto que se repite:
  // la voz del máximo cede cuando el gasto es el de hoy.
  if (/(cuanto es lo (maximo|mas)|lo mas que (puedo|podria)|most i (can|could))/.test(folded) && /(gastar|spend)/.test(folded) && /\b(hoy|today)\b/.test(folded)) return null;
  // ENMIENDA DE CANON (integración de la Ola 37): el contrafactual
  // es familia cercada de canon («si dejara de gastar $40 al mes en
  // golosinas, ¿cuánto sería en un año?») y el fuego por premisa
  // recurrente de esta forma lo secuestraba — la capacidad cede con
  // la misma voz con que el contrafactual oye.
  if (/(si (dejo|dejara|dejase|quito|elimino|no gast)|dejando de|sin gastar en|dejar de gastar|if i (stop|quit|stopped)|stop spending)/.test(folded)) return null;
  // El retiro de una cuenta nombrada es del escenario cuenta-origen.
  if (/(sacara|saco|retiro|retirara|retirase|de mi cuenta|de mis ahorros|what if i (take|withdraw)|if i (take|took|withdraw))/.test(folded)) return null;
  // Las formas cercadas de los vecinos: la división y el porcentaje
  // son de la calculadora; la conversión pura («¿cuánto es X a la
  // semana al mes?») del conversor; la meta con plazo, de la meta
  // inversa; y el «quedaría en mi cuenta» con saldo en cuentas, del
  // hipotético sobre la cuenta (su base es el saldo, no el mes).
  // PUERTO DE LA RAMA AGENTE (2026-11-24): el monto en OTRA moneda
  // ya NO se rechaza en esta puerta (el espécimen de la cena —
  // «puedo ir a cenar si la cena me cuesta 200 córdobas» — moría
  // sin puerta): si la forma no es de capacidad, el `fire` de abajo
  // devuelve null igual y el hipotético conserva su territorio; si
  // SÍ es de capacidad, el monto se convierte con la tasa del libro
  // y la conversión se NOMBRA en la nota — nunca en silencio.
  if (/(divid|repart|en (dos|tres|cuatro|cinco|seis|\d+) partes|entre \d+|split)/.test(folded)) return null;
  if (/%|por ciento|porcentaje|percent/.test(folded)) return null;
  // La diferencia entre montos traídos es de la calculadora: la
  // pregunta compara, no pide un juicio de capacidad.
  if (/(diferencia|difference)/.test(folded)) return null;
  // OLA 58: la premisa cuyos montos obedecen SOLO a verbos de
  // entrada o de apartado (ingreso, gano, ahorro, muevo a ahorros)
  // no trae gasto que juzgar — esta familia sumaba ingreso +
  // apartado como un solo «gasto de una vez» («si ingreso 1200 y
  // muevo 300 a mis ahorros» → un gasto de $1,500 que no existe).
  // Cede cuando ningún monto gobernado SALE y todo monto sin
  // verbo es del horizonte («en 6 meses»: los 6 son meses, no
  // dólares) — un monto de gasto sin verbo («una renta de 800»)
  // sí deja la pregunta en esta familia.
  {
    const { list, toks } = verbAmounts(raw, c.display);
    const governed = list.filter((s) => s.sign !== null);
    const isHorizonAmt = (s: VerbAmount) => /^(anos|meses|semanas|years|months|weeks)$/.test(toks[s.end] ?? "") && (toks[s.start - 1] === "en" || toks[s.start - 1] === "in");
    if (governed.length && governed.every((s) => s.sign !== null && s.sign >= 0) && list.every((s) => s.sign !== null || isHorizonAmt(s))) return null;
  }
  if (/(ahorrar|juntar|reunir|guardar).{0,40}(para|en \d+ meses)|para (llegar|juntar|reunir|ahorrar)/.test(folded)) return null;
  // La suma de INGRESOS traídos («me regalaron…, me dio…») es de la
  // calculadora; el abono a una deuda nombrada, del simulador.
  if (/(regalaron|me regalo|me dio|me dieron|me pagaron|bono de|aumento de)/.test(folded) && !/(compr|gast|rent|alquil)/.test(folded)) return null;
  if (/(tarjeta|deuda|prestamo|credito|debt|loan|card)/.test(folded) && /(abono|abonar|pagar|pago|meto|meter|extra|pay)/.test(folded)) return null;
  // El día nombrado también se lee como monto («el 28» → $28): se
  // retira del texto antes de leer las cifras, como hace la prueba.
  const dayM = /(?:el dia|el)\s*(\d{1,2})\b/.exec(folded);
  const rawForAmounts = dayM ? raw.replace(new RegExp(`(el\\s+d[ií]a\\s*|el\\s+)${dayM[1]}\\b`, "i"), " ") : raw;
  const amounts = amountsIn(rawForAmounts, c.display);
  // «Cambiar» con moneda nombrada es conversión, no capacidad.
  if (/(cambiar|cambio|change|convert)/.test(folded) && /(cordobas|dolares|euros|pesos|lempiras|quetzales|dollars)/.test(folded)) return null;
  if (/(en mi cuenta|en la cuenta|en mis cuentas|in my account)/.test(folded) && savingsStock(c.state, c.key).total > 0) return null;
  const hasAmt = amounts.length >= 1;
  // OLA 38: «da para» SOLO como palabra entera — como subcadena vive
  // dentro de «queDA PARA» y secuestraba el «¿cuánto me queda para
  // el resto del mes?», que es de la familia de la queda, no de la
  // capacidad (la caza del centro la cazó pidiendo un monto).
  const asumirVerb = /(asumir|podria con|puedo con|aguanta|\bme da para\b|\bda para\b|puedo darme|darme el gusto|darse el gusto|dar el gusto|el gusto de|permitirme|can i afford|could i afford|afford)/.test(folded);
  // OLA 38 · LA CAPACIDAD SOCIAL: la vida también presta, ayuda,
  // invita, regala y cambia — verbos de premisa con monto que el
  // delegado no oye (silencio en la caza del centro) y que se juzgan
  // caminando el mes, como cualquier gasto traído.
  // ENMIENDA DE CANON (integración de la Ola 38): «treat» entra solo
  // como VERBO con persona («treat my brother») — «a treat» a secas
  // es el gusto de canon («Can I spend $30 on a treat?» es canónica
  // de gustos) y el verbo suelto la secuestraba.
  const socialVerb = /(prestar|prestara|prestaria|preste|prestarle|ayudar|ayudara|ayudaria|invitar|invitara|invitaria|regalar|regalara|cambiar|cambiaria|lend|treating|treat (my|him|her|them|us|you|someone))/.test(folded);
  // ESPÉCIMEN 2026-11-23 · LA PREMISA DE COSTO (puerto de la Rama
  // Agente): «puedo ir a cenar si la cena me cuesta 200 córdobas»
  // trae la capacidad en la cláusula principal («puedo ir…») y el
  // monto como COSTO en la subordinada («…me cuesta 200»): ningún
  // verbo de compra toca el monto. La voz es puedo/podría/can i +
  // un verbo de costo, con monto presente.
  const costPremise = hasAmt && /(cuesta|cuestan|costara|costaria|vale|valen|sale|salen|costs?)\b/.test(folded);
  const puedoVoice = /\b(puedo|podria|podre|can i|could i)\b/.test(folded);
  const costMine = costPremise && puedoVoice;
  const buyVerb = /(puedo|podria|podre) (comprar|comprarme|gastar|rentar|alquilar)/.test(folded);
  const quedaVoice = /(cuanto (me )?(quedaria|quedara|sobraria|restaria)|me quedaria|cuanto (tendre|tendria) (despues|si))/.test(folded);
  const llegaVoice = /(con cuanto (llegaria|llego|llegare)|cuanto (llegaria|llego) a fin de mes|cuanto (me )?(quedaria|quedara|sobraria) a fin de mes|how much would i have left|what would i have left)/.test(folded);
  const totalVoice = /(cuanto (gastaria|gastare|seria|es) (en total|el gasto|de gasto)|gasto total|cuanto (suma|suman))/.test(folded);
  // OLA 38 · EL MÁXIMO SIN PREMISA y EL PRÓXIMO PAGO: dos voces sin
  // monto que la caza del centro cazó desviadas — el máximo caía en
  // gustos pidiendo un monto, y el próximo pago en la agenda, que
  // lista lo que viene pero no juzga si se llega. Se definen aquí,
  // antes de la guarda de la conversión pura, porque el máximo
  // también empieza con «¿cuánto es…?».
  const maxVoice = /(cuanto es lo (maximo|mas)|maximo que (puedo|podria)|lo mas que (puedo|podria)|most i (can|could) pay|what'?s the most i (can|could))/.test(folded);
  const paydayVoice = /(hasta el proximo pago|hasta que (me paguen|entre el)|aguanto hasta|me alcanza hasta|me dura hasta|until (my )?(next )?(payday|paycheck)|until i get paid|last until payday)/.test(folded);
  // El pago en su día (un monto, verbo de pago, día nombrado) es de
  // la forma del día de esta misma familia — no de la capacidad.
  const dayPayShape = amounts.length === 1 && /(pagar|pago|pay)\b/.test(folded) && (/((el dia|el)\s*\d{1,2}\b)/.test(folded) || /\bmanana\b/.test(folded));
  if (dayPayShape) return null;
  // Los montos por cláusula: lo que se renta se repite cada mes.
  const clauses = rawForAmounts.split(/[,;](?!\d)|\s+y\s+|\s+e\s+|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
  let oneTime = 0;
  let recurring = 0;
  let clauseSum = 0;
  for (const cl of clauses) {
    const clAmt = amountsIn(cl, c.display).reduce((a, x) => a + convertMinor(x.minor, x.currency, c.display, c.rateE4), 0);
    clauseSum += clAmt;
    if (clAmt <= 0) continue;
    // OLA 53: la cláusula que se repite también se lee en inglés —
    // sin «per month / monthly / each month», «Can I afford $100 per
    // month…?» se leía como gasto de una vez y la capacidad lo cedía
    // como forma desnuda, contra su propio guardián.
    if (/(rent|alquil|mensual|cada mes|al mes|por mes|suscrip|cuota|membres|monthly|per month|each month)/.test(normalizeEs(foldQ(cl)))) recurring += clAmt;
    else oneTime += clAmt;
  }
  const wholeSum = amounts.reduce((a, x) => a + convertMinor(x.minor, x.currency, c.display, c.rateE4), 0);
  if (Math.abs(clauseSum - wholeSum) > 1) { oneTime = wholeSum; recurring = 0; }
  const multiOrRecur = amounts.length >= 2 || recurring > 0;
  // Varios montos solos no bastan (la suma pura y el envío repartido
  // también los traen): hace falta el contexto de capacidad — una
  // premisa, un verbo de gasto o el «me alcanza».
  const premiseVerb = /\bsi\b|compr|gast|rent|alquil|pagar|alcanza|quiero|pienso|voy a/.test(folded);
  if (/(cuanto (es|son)\b)/.test(folded) && !totalVoice && !maxVoice) return null;
  const hoySingle = hasAmt && amounts.length === 1 && recurring === 0 && /\bhoy\b/.test(folded) && !asumirVerb && !quedaVoice && !llegaVoice;
  if (hoySingle) return null;
  // El «¿cuánto me quedaría si gasto…?» simple sigue siendo del
  // hipotético (su forma cercada, con su parseo de signo y escala);
  // la capacidad solo lo toma cuando el hipotético respondería MAL:
  // cuando algo se repite (lo trataría como gasto de una vez) o
  // cuando nombra la cuenta y el libro no tiene cuentas (su base
  // sería $0.00).
  const quedaMine = quedaVoice && hasAmt && (recurring > 0 || /(en mi cuenta|en la cuenta|en mis cuentas|in my account)/.test(folded));
  // El «si gasto X y Y, ¿cuánto me queda?» a secas es del hipotético;
  // la capacidad entra ahí solo vía quedaMine (renta o cuenta vacía).
  const plainQuedaAsk = /(cuanto (me )?(queda|quedaria|quedara|sobraria|restaria))/.test(folded);
  // El «¿puedo gastar/comprar $X?» simple, en presente y de un solo
  // monto, es del delegado spend (su forma cercada); la capacidad
  // toma el comprar/gastar en condicional («¿podría comprarme…?» —
  // el delegado no lo oye) o cuando hay varios montos o repetición.
  // PUERTO DE LA RAMA AGENTE (2026-11-24): el monto SOLO en
  // palabras también es de esta puerta — el delegado spend lee
  // dígitos y ante «¿puedo gastar cien en zapatos?» pedía el monto
  // que la pregunta ya traía (espécimen 2026-11-23).
  const wordsOnly = hasAmt && !/\d/.test(rawForAmounts);
  const buyMine = buyVerb && (amounts.length >= 2 || recurring > 0 || /(podria|podre)/.test(folded) || wordsOnly);
  // ENMIENDA DE CANON (integración de la Ola 37, ajustada en la 38):
  // la forma simple del delegado spend — un solo monto, nada que se
  // repita, en presente y sin condicional, con la voz que el
  // delegado sí oye («Can I afford $50 for gas?», «¿Puedo gastar
  // $100 en zapatos?» — sus canónicas cercadas en canon) — sigue
  // siendo del delegado: la capacidad solo toma el comprar con
  // varios montos, con repetición o en condicional. El «me da para»
  // NO entra en la cesión: el delegado de canon no lo oye (su
  // canónica no existe) y la capacidad lo sirve, como manda la Ola
  // 38; los verbos sociales tampoco ceden (el delegado no los oye).
  // OLA 53 (acta asentada en canon): la forma DESNUDA — un monto,
  // sin repetición, sin premisa compuesta — tiene UNA sola casa en
  // los dos idiomas: la verificación. En canon la casa se alcanza
  // por dos caminos ya vivos: el inglés cede por la cesión de aquí
  // arriba («can i afford») y el español no enciende esta puerta
  // (su asumirVerb no oye «me alcanza») y la verificación sí lo
  // oye; los especímenes «ola 53» del banco cercan las dos formas
  // y sus guardianes (la premisa compuesta y lo que se repite se
  // quedan en la capacidad).
  if (hasAmt && amounts.length === 1 && recurring === 0 && !/(podria|podre|could)/.test(folded) && !quedaVoice && !llegaVoice && !totalVoice && !socialVerb && !wordsOnly && (buyVerb || /can i afford/.test(folded))) return null;
  // OLA 55 · LA SUMA PREGUNTADA NO ES UNA PREMISA: «Si envío
  // veinticinco más ciento cuatro más treinta, ¿cuánto serían?»
  // trae «si» y varios montos, y esta puerta la caminaba como
  // gasto traído — pero la pregunta pide la SUMA, no un juicio de
  // capacidad. Sin ninguna voz de capacidad (asumir, quedaría,
  // llega, máximo, próximo pago, lo social), la forma «¿cuánto
  // son/serían/da…?» es de la calculadora y esta puerta cede.
  const sumAskVoice = /(cuanto (son|serian|seria|da|dan)\b|how much (is|would)|what('s| is) the (sum|total))/.test(folded)
    || (/(cuanto es|how much is|what is|what's)/.test(folded) && /(mas|plus)/.test(folded));
  // OLA 56: el «cuánto sería» DESNUDO también es suma preguntada
  // («si envio 30 + 104 + 25 + 60, ¿cuánto sería?» recibía el
  // juicio de capacidad entero por una suma de $219 — la captura
  // de Oscar, 2026-11-23). El «cuánto sería» NOMBRADO del libro
  // («el gasto total», «en total») sigue siendo de esta familia:
  // totalVoice bloquea la cesión.
  if (sumAskVoice && !asumirVerb && !quedaVoice && !llegaVoice && !maxVoice && !paydayVoice && !socialVerb && !totalVoice) return null;
  const fire = llegaVoice || totalVoice || quedaMine || maxVoice || paydayVoice || (hasAmt && (asumirVerb || socialVerb || buyMine || costMine || (multiOrRecur && premiseVerb && !plainQuedaAsk))) || (!hasAmt && asumirVerb);
  if (!fire) return null;

  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const start = reading.left;
  const money = c.money;
  const src = ["libros.lineas", "cobros.cuotas", "central.queda"];
  const door = reportDoor(c, "central.pagos", "Ver los pagos que se acercan", "See the payments coming up");

  if (!hasAmt && !llegaVoice && !maxVoice && !paydayVoice) {
    return {
      kind: "answer", family: "factibilidad",
      verdict: totalVoice
        ? L(c.lang, `Para decirte el total me faltan los montos — tu queda de hoy es ${money(start)}. Dime «$500 y $1,200 de renta» y te lo sumo con su cierre de mes.`, `To give you the total I need the amounts — your left today is ${money(start)}. Tell me "$500 and $1,200 of rent" and I'll add it up with its month close.`)
        : L(c.lang, `Para decirte si puedes con ese gasto me falta el monto — tu queda de hoy es ${money(start)}. Dime «$500», o «$500 y $1,200 de renta», y lo camino contra lo que ya tienes programado.`, `To tell you whether you can take that expense on I need the amount — your left today is ${money(start)}. Tell me "$500", or "$500 and $1,200 of rent", and I'll walk it against what's already scheduled.`),
      pieces: [{ label: L(c.lang, "Queda de hoy", "Left today"), minor: start }],
      note: L(c.lang, "Sin monto no hay prueba: no juzgo un gasto que no me enseñaste.", "With no amount there is no proof: I won't judge an expense you haven't shown me."),
      source: src, lines: 0, actions: door,
    };
  }

  const endIso = monthEndIso(c.today);
  const { events, counted } = scheduledEvents(c, daysBetweenIso(c.today, endIso));
  const w = walkEvents(start, events, endIso);
  const w2 = walkEvents(start - oneTime - recurring, events, endIso);
  const closeSin = w.end;
  const close = w2.end;
  const low = w2.min;
  const fits = close >= 0 && low >= 0;
  const dips = close >= 0 && low < 0;

  // El ritmo de los meses que vienen: el mes típico medido del libro.
  let surplus: number | null = null;
  let monthCount = 0;
  if (recurring > 0) {
    const byMonth = new Map<string, number>();
    for (const l of allLines(c)) {
      if (!l.active || l.monthKey > c.key) continue;
      const v = view(c, l);
      const net = /^income/.test(l.kind) ? v : isOut(l) && roleOf(c.state, l.categoryId) !== "savings" ? -v : 0;
      if (net !== 0) byMonth.set(l.monthKey, (byMonth.get(l.monthKey) ?? 0) + net);
    }
    monthCount = byMonth.size;
    if (monthCount >= 2) {
      const nets = [...byMonth.values()].sort((a, b) => a - b);
      surplus = nets[Math.floor((nets.length - 1) / 2)];
    }
  }
  // OLA 38 · EL MÁXIMO SIN PREMISA: «¿cuánto es lo máximo que puedo
  // pagar de renta?» no trae monto porque PIDE el monto — el tope de
  // un gasto que se repite es lo que hoy ocupa ese mismo gasto más
  // lo libre del mes típico (o del cierre de este mes, si el libro
  // aún no tiene meses para una mediana).
  if (!hasAmt && !llegaVoice && maxVoice) {
    const byMonth = new Map<string, number>();
    for (const l of allLines(c)) {
      if (!l.active || l.monthKey > c.key) continue;
      const v = view(c, l);
      const net = /^income/.test(l.kind) ? v : isOut(l) && roleOf(c.state, l.categoryId) !== "savings" ? -v : 0;
      if (net !== 0) byMonth.set(l.monthKey, (byMonth.get(l.monthKey) ?? 0) + net);
    }
    const nets = [...byMonth.values()].sort((a, b) => a - b);
    const typical = byMonth.size >= 2 ? nets[Math.floor((nets.length - 1) / 2)] : null;
    const base = typical ?? closeSin;
    const filter = filterOf(c, folded);
    const monthOut = (c.state.months[c.key]?.lines ?? []).filter((l) => l.active && isOut(l) && roleOf(c.state, l.categoryId) !== "savings");
    const named = filter ? monthOut.filter((l) => filter(l)) : [];
    const existing = named.length ? view(c, named[0]) : 0;
    const tope = existing + Math.max(0, base);
    const nameTxt = named.length ? L(c.lang, `de «${named[0].concept}»`, `for "${named[0].concept}"`) : L(c.lang, "como gasto que se repite cada mes", "as an expense repeating every month");
    return {
      kind: "answer", family: "factibilidad",
      verdict: L(c.lang,
        `Lo máximo que podrías pagar ${nameTxt}: ${money(tope)} al mes. ${named.length ? `Hoy eso te ocupa ${money(existing)} y tu ` : "Tu "}${typical !== null ? `mes típico deja ${money(base)} libres (la mediana de tus ${byMonth.size} meses)` : `cierre de este mes deja ${money(base)} libres`} — sumados dan el tope. De una vez, sin que ningún día quede en negativo, tu margen es ${money(Math.max(0, low))}.`,
        `The most you could pay ${nameTxt}: ${money(tope)} a month. ${named.length ? `Today that takes ${money(existing)} and your ` : "Your "}${typical !== null ? `typical month leaves ${money(base)} free (the median of your ${byMonth.size} months)` : `close this month leaves ${money(base)} free`} — together they make the cap. As a one-time expense, with no day going negative, your margin is ${money(Math.max(0, low))}.`),
      pieces: [
        { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
        ...(existing > 0 ? [{ label: L(c.lang, "Lo que hoy ocupa", "What it takes today"), minor: existing }] : []),
        { label: L(c.lang, "El tope al mes", "The monthly cap"), minor: tope },
      ],
      note: L(c.lang, "El supuesto, dicho: el tope supone que el gasto empieza el mes que viene y se sostiene con tu mes típico; este mes, sin tocar nada, cierras en " + money(closeSin) + ".", "The assumption, stated: the cap assumes the expense starts next month and is carried by your typical month; this month, changing nothing, you close at " + money(closeSin) + "."),
      source: src, lines: 0, actions: door,
      graph: [{ id: "tope", label: L(c.lang, "El tope al mes", "The monthly cap"), minor: tope, tense: "proyectado", flow: "stock", currency: c.display, assumption: { text: L(c.lang, "el tope se sostiene con el mes típico del libro", "the cap is carried by the book's typical month"), origin: "libro" }, children: [
        ...(existing > 0 ? [{ id: "ocupa", label: L(c.lang, "Lo que hoy ocupa", "What it takes today"), minor: existing, tense: "stock", flow: "stock", currency: c.display, sign: 1 } as AskNode] : []),
        { id: "libre", label: L(c.lang, "Lo libre del mes típico", "The typical month's free part"), minor: Math.max(0, base), tense: "proyectado", flow: "flujo", currency: c.display, sign: 1 } as AskNode,
      ] }],
    };
  }
  // OLA 38 · EL PRÓXIMO PAGO: «¿me alcanza hasta el próximo pago?»
  // se camina hasta el día en que el ingreso fijo se anota (su día
  // patrón en el libro), no hasta fin de mes — y se dice si se llega.
  if (!hasAmt && !llegaVoice && paydayVoice) {
    const days: number[] = [];
    for (const l of allLines(c)) if (l.active && l.kind === "income-fixed" && l.bookedOn) days.push(Number(l.bookedOn.slice(8, 10)));
    if (!days.length) {
      return {
        kind: "answer", family: "factibilidad",
        verdict: L(c.lang, `No te lo puedo caminar: en tu libro no veo un ingreso fijo con un día que se repita, así que no sé cuándo es tu próximo pago. Tu queda de hoy es ${money(start)} y lo programado de este mes te deja en ${money(closeSin)} a fin de mes.`, `I can't walk that for you: your book shows no fixed income with a repeating day, so I don't know when your next payday is. Your left today is ${money(start)} and this month's scheduled items leave you at ${money(closeSin)} at month's end.`),
        pieces: [{ label: L(c.lang, "Queda de hoy", "Left today"), minor: start }, { label: L(c.lang, "Cierre del mes", "Month close"), minor: closeSin }],
        note: L(c.lang, "El dato que falta se nombra: un ingreso fijo anotado con su día — con eso, el camino hasta el pago se camina entero.", "The missing fact is named: a fixed income recorded with its day — with that, the path to payday walks in full."),
        source: src, lines: 0, actions: door,
      };
    }
    const freq = new Map<number, number>();
    for (const d of days) freq.set(d, (freq.get(d) ?? 0) + 1);
    const payDay = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const [ty, tm] = c.today.split("-").map(Number);
    const dim = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
    let py = ty, pm = tm;
    if (Math.min(payDay, dim(py, pm)) <= Number(c.today.slice(8, 10))) { pm += 1; if (pm > 12) { pm = 1; py += 1; } }
    const paydayIso = `${py}-${String(pm).padStart(2, "0")}-${String(Math.min(payDay, dim(py, pm))).padStart(2, "0")}`;
    const evs = scheduledEvents(c, daysBetweenIso(c.today, paydayIso));
    const wp = walkEvents(start, evs.events, paydayIso);
    const arrives = wp.end >= 0 && wp.min >= 0;
    return {
      kind: "answer", family: "factibilidad",
      verdict: arrives
        ? L(c.lang, `Sí: llegas a tu próximo pago, el ${fmtFecha(c, paydayIso)}, con ${money(wp.end)}. Tu queda de hoy es ${money(start)} y lo programado hasta ese día suma ${money(wp.end - start)}.`, `Yes: you reach your next payday, ${fmtFecha(c, paydayIso)}, with ${money(wp.end)}. Your left today is ${money(start)} and what's scheduled until that day adds up to ${money(wp.end - start)}.`)
        : L(c.lang, `No llegas con lo programado: el ${wp.minOn ? fmtFecha(c, wp.minOn) : ""} bajas a ${money(wp.min)} — te faltan ${money(-wp.min)} para llegar al ${fmtFecha(c, paydayIso)}. Tu queda de hoy es ${money(start)}.`, `You don't make it with what's scheduled: on ${wp.minOn ? fmtFecha(c, wp.minOn) : ""} you dip to ${money(wp.min)} — you're ${money(-wp.min)} short of reaching ${fmtFecha(c, paydayIso)}. Your left today is ${money(start)}.`),
      pieces: [
        { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
        ...(wp.end !== start ? [{ label: L(c.lang, "Lo programado hasta el pago", "Scheduled until payday"), minor: wp.end - start }] : []),
        { label: L(c.lang, "Al próximo pago", "At the next payday"), minor: wp.end },
      ],
      note: L(c.lang, `El supuesto, dicho: tu próximo pago cae el día ${payDay} de cada mes — es el día en que tu ingreso fijo se ha venido anotando — y caminé solo lo que el libro trae con fecha hasta ese día.`, `The assumption, stated: your next payday falls on day ${payDay} of each month — the day your fixed income has been recorded on — and I only walked what the book carries with a date up to that day.`),
      source: src, lines: 0, actions: door,
    };
  }
  const forwardTxt = recurring <= 0 ? "" : surplus !== null
    ? recurring <= surplus
      ? L(c.lang, ` Y mes a mes también cabe: tu mes típico deja ${money(surplus)} libres (la mediana de tus ${monthCount} meses) y el gasto que se repite pide ${money(recurring)}.`, ` And month to month it also fits: your typical month leaves ${money(surplus)} free (the median of your ${monthCount} months) and the repeating expense asks ${money(recurring)}.`)
      : L(c.lang, ` Pero mes a mes no cabe: tu mes típico deja ${money(surplus)} libres y el gasto que se repite pide ${money(recurring)} — te faltarían ${money(recurring - surplus)} cada mes, saliendo de algún otro lado.`, ` But month to month it does not fit: your typical month leaves ${money(surplus)} free and the repeating expense asks ${money(recurring)} — you'd be short ${money(recurring - surplus)} every month, coming out of somewhere else.`)
    : L(c.lang, ` De los meses que vienen no te juzgo todavía: tu libro trae ${monthCount} ${monthCount === 1 ? "mes" : "meses"} con movimientos, y el gasto que se repite — esta prueba caminó solo este mes.`, ` I won't judge the coming months yet: your book holds ${monthCount} ${monthCount === 1 ? "month" : "months"} with activity, and the expense repeats — this proof only walked this month.`);

  const partsList = [
    oneTime > 0 ? L(c.lang, `el gasto de una vez (${money(oneTime)})`, `the one-time expense (${money(oneTime)})`) : null,
    recurring > 0 ? L(c.lang, `el gasto que se repite, contado este mes (${money(recurring)})`, `the repeating expense, counted this month (${money(recurring)})`) : null,
  ].filter(Boolean).join(L(c.lang, " y ", " and "));
  const closeTxt = close >= 0 ? money(close) : L(c.lang, `${money(close)} (te faltan ${money(-close)})`, `${money(close)} (you're short ${money(-close)})`);
  const walkTxt = oneTime + recurring === 0
    ? L(c.lang, `Tu queda de hoy es ${money(start)} y lo programado del mes te deja en ${money(closeSin)} a fin de mes${low < closeSin && w2.minOn ? `, con tu punto más bajo en ${money(low)} el ${fmtFecha(c, w2.minOn)}` : ""}.`, `Your left today is ${money(start)} and what's scheduled this month leaves you at ${money(closeSin)} at the end of the month${low < closeSin && w2.minOn ? `, with your low point at ${money(low)} on ${fmtFecha(c, w2.minOn)}` : ""}.`)
    : L(c.lang, `Tu queda de hoy es ${money(start)}; lo programado del mes te deja en ${money(closeSin)}; con ${partsList} el mes cierra en ${closeTxt}${low < close && w2.minOn ? `, y tu punto más bajo es ${money(low)} el ${fmtFecha(c, w2.minOn)}` : ""}.`, `Your left today is ${money(start)}; what's scheduled this month leaves you at ${money(closeSin)}; with ${partsList} the month closes at ${closeTxt}${low < close && w2.minOn ? `, and your low point is ${money(low)} on ${fmtFecha(c, w2.minOn)}` : ""}.`);

  let verdict: string;
  if (totalVoice) {
    const split = [
      oneTime > 0 ? L(c.lang, `${money(oneTime)} de una vez`, `${money(oneTime)} once`) : null,
      recurring > 0 ? L(c.lang, `${money(recurring)} que se repiten cada mes`, `${money(recurring)} repeating every month`) : null,
    ].filter(Boolean).join(L(c.lang, " y ", " and "));
    verdict = L(c.lang, `En total son ${money(oneTime + recurring)}: ${split}. ${walkTxt}`, `In total it's ${money(oneTime + recurring)}: ${split}. ${walkTxt}`);
  } else if (quedaVoice || llegaVoice) {
    verdict = (close >= 0
      ? L(c.lang, `Llegarías a fin de mes con ${money(close)}. `, `You'd reach the end of the month with ${money(close)}. `)
      : L(c.lang, `Llegarías a fin de mes debiendo ${money(-close)}. `, `You'd reach the end of the month owing ${money(-close)}. `)) + walkTxt;
  } else if (fits) {
    verdict = L(c.lang, `Sí, puedes con ese gasto. `, `Yes, you can take that expense on. `) + walkTxt;
  } else if (dips) {
    verdict = L(c.lang, `El mes cierra, pero el camino no. `, `The month closes, but the path doesn't. `) + walkTxt;
  } else {
    verdict = L(c.lang, `No, con lo anotado no puedes con ese gasto. `, `No, with what's recorded you can't take that expense on. `) + walkTxt;
  }
  verdict += forwardTxt;
  if (fits) {
    verdict += L(c.lang, ` Tu margen de seguridad: podrías gastar hasta ${money(low)} más en el mes sin que ningún día quede en negativo.`, ` Your safety margin: you could spend up to ${money(low)} more in the month without any day going negative.`);
  } else {
    const flips: string[] = [];
    if (oneTime > 0) {
      const maxOne = closeSin - recurring;
      if (maxOne >= 0 && maxOne < oneTime) flips.push(L(c.lang, `que el gasto de una vez baje a ${money(maxOne)}`, `the one-time expense dropping to ${money(maxOne)}`));
    }
    if (recurring > 0) {
      const maxRent = closeSin - oneTime;
      if (maxRent >= 0 && maxRent < recurring) flips.push(L(c.lang, `que el gasto que se repite fuera de ${money(maxRent)} o menos`, `the repeating expense being ${money(maxRent)} or less`));
    }
    if (low < 0) flips.push(w2.minOn
      ? L(c.lang, `que entren ${money(-low)} más antes del ${fmtFecha(c, w2.minOn)}`, `${money(-low)} more coming in before ${fmtFecha(c, w2.minOn)}`)
      : L(c.lang, `que entren ${money(-low)} más en el mes`, `${money(-low)} more coming in during the month`));
    verdict += flips.length
      ? L(c.lang, ` El menú de vueltas — lo mínimo que tendría que cambiar: ${flips.join("; ")}.`, ` The flip menu — the least that would have to change: ${flips.join("; ")}.`)
      : L(c.lang, ` Y no hay vuelta corta: ya sin el gasto, lo programado te deja en ${money(closeSin)}.`, ` And there is no short flip: even without the expense, what's scheduled leaves you at ${money(closeSin)}.`);
  }

  const unknownNames = [...new Set(events.filter((e) => !e.known).map((e) => e.name))];
  // La conversión, nombrada (puerto de la Rama Agente, 2026-11-24):
  // si el monto venía en otra moneda, la nota dice cuánto era y en
  // cuánto quedó a la tasa del libro.
  const foreignAmts = amounts.filter((a) => a.currency !== c.display);
  const convTxt = foreignAmts.length
    ? L(c.lang, `El monto venía en otra moneda y lo convertí a la de tu libro con su tasa: ${[...new Set(foreignAmts.map((a) => `${formatMoney(a.minor, a.currency, c.lang)} = ${money(convertMinor(a.minor, a.currency, c.display, c.rateE4))}`))].join(", ")}.`, `The amount came in another currency and I converted it to your book's at its rate: ${[...new Set(foreignAmts.map((a) => `${formatMoney(a.minor, a.currency, c.lang)} = ${money(convertMinor(a.minor, a.currency, c.display, c.rateE4))}`))].join(", ")}.`)
    : null;
  // OLA 38 · LA LECTURA DECLARADA: si la pregunta suena a CAMBIO de
  // un gasto que ya se paga («si la renta sube a…») pero el libro no
  // trae ese gasto con ese nombre, la capacidad camina el monto como
  // gasto nuevo — y lo DICE, para que la lectura no pase por la
  // respuesta a otra pregunta (la caza del centro, libro irregular).
  const replFilter = filterOf(c, folded);
  const replUnmatched = recurring > 0 && /(sube|subiera|baja|bajara|aumenta)/.test(folded) && (!replFilter || !(c.state.months[c.key]?.lines ?? []).some((l) => l.active && isOut(l) && replFilter(l)));
  const noteParts = [
    recurring > 0
      ? L(c.lang, `Cruzo los tiempos y lo digo: la queda es de hoy, lo programado es el flujo de lo que queda del mes, y el gasto que se repite lo conté como gasto de cada mes empezando este — si empezara el mes que viene, este mes cerrarías en ${money(closeSin - oneTime)}.`, `I'm crossing tenses and saying so: the left is today's, the scheduled part is this month's remaining flow, and the repeating expense I counted as an expense of every month starting this one — if it started next month, this month you'd close at ${money(closeSin - oneTime)}.`)
      : L(c.lang, "El gasto traído se contó hoy, contra tu queda y lo programado del mes — nada se anotó en tu libro.", "The expense you brought was counted today, against your left and this month's scheduled items — nothing was recorded in your book."),
    counted.length ? L(c.lang, `Lo de este mes (${[...new Set(counted)].join(", ")}) ya está contado en tu queda de hoy: la prueba camina lo que aún no está en ella, para no restar nada dos veces.`, `This month's (${[...new Set(counted)].join(", ")}) is already counted in today's left: the proof walks what isn't in it yet, so nothing is subtracted twice.`) : null,
    replUnmatched ? L(c.lang, "Ojo con la lectura: tu pregunta suena a cambio de un gasto que ya pagas, pero en tu libro no encontré ese gasto con ese nombre — caminé el monto como un gasto nuevo que se repite, no como el cambio de uno anotado.", "Mind the reading: your question sounds like changing an expense you already pay, but your book holds no expense under that name — I walked the amount as a new repeating expense, not as a change to a recorded one.") : null,
    unknownNames.length ? L(c.lang, `Fuera de esta prueba: ${unknownNames.join(", ")} — el libro sabe su fecha pero no el monto de su cuota, y no lo invento.`, `Outside this proof: ${unknownNames.join(", ")} — the book knows its date but not its installment amount, and I won't invent it.`) : null,
    convTxt,
  ].filter(Boolean);

  const pieces: BankPiece[] = [
    { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
    { label: L(c.lang, "Cierre sin el gasto", "Close without the expense"), minor: closeSin },
  ];
  if (oneTime > 0) pieces.push({ label: L(c.lang, "El gasto de una vez", "The one-time expense"), minor: -oneTime });
  if (recurring > 0) pieces.push({ label: L(c.lang, "El gasto que se repite (este mes)", "The repeating expense (this month)"), minor: -recurring });
  pieces.push({ label: L(c.lang, "Cierre con el gasto", "Close with the expense"), minor: close });

  const kids: AskNode[] = [
    { id: "queda", label: L(c.lang, "Queda de hoy", "Left today"), minor: start, tense: "stock", flow: "stock", currency: c.display, sign: 1 },
    { id: "programado", label: L(c.lang, "Lo programado del mes", "This month's scheduled items"), minor: Math.abs(closeSin - start), tense: "proyectado", flow: "flujo", currency: c.display, sign: closeSin - start >= 0 ? 1 : -1 },
  ];
  if (oneTime > 0) kids.push({ id: "gasto-vez", label: L(c.lang, "El gasto de una vez", "The one-time expense"), minor: oneTime, tense: "proyectado", flow: "flujo", currency: c.display, sign: -1, assumption: { text: L(c.lang, "la premisa que trajiste en tu pregunta", "the premise you brought in your question"), origin: "usuario" } });
  if (recurring > 0) kids.push({ id: "gasto-repite", label: L(c.lang, "El gasto que se repite", "The repeating expense"), minor: recurring, tense: "proyectado", flow: "flujo", currency: c.display, sign: -1, unit: L(c.lang, "al mes", "a month"), assumption: { text: L(c.lang, "la premisa que trajiste: se repite cada mes, empezando este", "the premise you brought: it repeats every month, starting this one"), origin: "usuario" } });

  return {
    kind: "answer", family: "factibilidad",
    verdict, pieces,
    note: noteParts.length ? noteParts.join(" ") : null,
    source: src, lines: 0, actions: door,
    graph: [{ id: "cierre-con-gasto", label: L(c.lang, "El mes con el gasto", "The month with the expense"), minor: close, tense: "proyectado", flow: "stock", currency: c.display, assumption: { text: L(c.lang, "las premisas que trajiste en tu pregunta", "the premises you brought in your question"), origin: "usuario" }, children: kids }],
  };
}
function factibilidadAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const isLow = /(punto (mas )?bajo|semana (mas )?baja|quedo mas bajo|lowest (point|week)|low point)/.test(folded);
  const dayM = /(?:el dia|el)\s*(\d{1,2})\b/.exec(folded)
    // ENMIENDA DE CANON (integración de la Ola 29): el día inglés se
    // nombra «on the 28th» — la copia no lo oía y su canónica caía al
    // delegado de spend; la forma es la misma, el oído es bilingüe.
    ?? /\b(?:on the|the)\s*(\d{1,2})(?:st|nd|rd|th)\b/.exec(folded);
  // El día también se lee como monto («el 28» → $28): se retira del
  // texto antes de leer los montos, o la puerta contaría dos cifras.
  const rawForAmounts = dayM ? raw.replace(new RegExp(`(el\\s+d[ií]a\\s*|el\\s+|on the\\s+|the\\s+)${dayM[1]}(?:st|nd|rd|th)?\\b`, "i"), " ") : raw;
  const amounts = amountsIn(rawForAmounts, c.display);
  const isDayPay = amounts.length === 1 && /(pagar|pago|pay)\b/.test(folded) && (!!dayM || /\bmanana\b/.test(folded) || /fin de mes/.test(folded));
  const isMonth = (!isDayPay && /(alcanza|alcanzo)/.test(folded) && /\bmes\b/.test(folded) && !/(pagar|pay)\b/.test(folded))
    || /(llego a fin de mes|make it (to|through)|last the month|reach the end of the month)/.test(folded);
  /* OLA 39 · EL DÍA DEL CERO Y EL CIERRE: tres voces del mismo
   * paseo que la caza del centro cazó en silencio — el signo del
   * cierre («¿voy a terminar el mes en negativo?»), el día del cero
   * («¿cuándo se me acaba el dinero?») y el faltante para terminar
   * («¿cuánto necesito para terminar el mes?»). La de la meta
   * («necesito ahorrar/juntar…») NO es esta: se excluye por nombre. */
  const negVoice = /(negativo|en rojo|bajo cero|in the red|end (up|the month) (in )?negative|go negative)/.test(folded);
  const runOutVoice = /(cuando (se me |me )?(acaba|acabara|termina|terminara) (el dinero|la plata|el saldo)|cuando (me quedo|quedare|quedaria) (en cero|sin dinero|sin nada)|que dia (me quedo|quedare)|cuando me quedo (en cero|sin)|when do i run out|when (will|would) i run out|run out of money|what day do i (hit|reach) zero)/.test(folded);
  const needVoice = /(cuanto necesito|cuanto me (falta|hace falta)|how much do i need|how much more do i need)/.test(folded)
    && /(terminar|cerrar|llegar|pasar|finish|end|get through)/.test(folded) && /\b(mes|month)\b/.test(folded)
    && !/(ahorrar|juntar|guardar|reunir|save|savings)/.test(folded);
  const isClose = negVoice || runOutVoice || needVoice;
  if (!isLow && !isDayPay && !isMonth && !isClose) return null;
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const start = reading.left;
  const money = c.money;
  const src = ["libros.lineas", "cobros.cuotas", "central.queda"];
  const door = reportDoor(c, "central.pagos", "Ver los pagos que se acercan", "See the payments coming up");
  const unknownNote = (events: SchedEvent[]): string | null => {
    const names = [...new Set(events.filter((e) => !e.known).map((e) => e.name))];
    return names.length ? L(c.lang, `Fuera de esta prueba: ${names.join(", ")} — el libro sabe su fecha pero no el monto de su cuota, y no lo invento.`, `Outside this proof: ${names.join(", ")} — the book knows its date but not its installment amount, and I won't invent it.`) : null;
  };
  const noteOf = (events: SchedEvent[], counted: string[]): string | null => {
    const parts = [
      counted.length ? L(c.lang, `Lo de este mes (${[...new Set(counted)].join(", ")}) ya está contado en tu queda de hoy: la prueba camina lo que aún no está en ella, para no restar nada dos veces.`, `This month's (${[...new Set(counted)].join(", ")}) is already counted in today's left: the proof walks what isn't in it yet, so nothing is subtracted twice.`) : null,
      unknownNote(events),
    ].filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  };
  const graphOf = (rootId: string, rootLabel: string, rootMinor: number, events: SchedEvent[], extra?: AskNode): AskNode[] => {
    const kids: AskNode[] = [{ id: "queda", label: L(c.lang, "Queda de hoy", "Left today"), minor: start, tense: "stock", flow: "stock", currency: c.display, sign: 1 }];
    const known = events.filter((e) => e.known);
    for (const e of known.slice(0, 5)) kids.push({ id: `ev-${e.on}-${kids.length}`, label: `${e.name} · ${fmtFecha(c, e.on)}`, minor: Math.abs(e.delta), tense: "proyectado", flow: "flujo", currency: c.display, sign: e.delta >= 0 ? 1 : -1 });
    if (known.length > 5) {
      const rest = known.slice(5).reduce((a, e) => a + e.delta, 0);
      kids.push({ id: "ev-resto", label: L(c.lang, `y ${known.length - 5} eventos más`, `and ${known.length - 5} more events`), minor: Math.abs(rest), tense: "proyectado", flow: "flujo", currency: c.display, sign: rest >= 0 ? 1 : -1 });
    }
    if (extra) kids.push(extra);
    return [{ id: rootId, label: rootLabel, minor: rootMinor, tense: "proyectado", flow: "stock", currency: c.display, assumption: { text: L(c.lang, "solo lo anotado con fecha, caminado en su orden", "only what's recorded with a date, walked in its order"), origin: "regla" }, children: kids }];
  };

  /* EL PUNTO BAJO DE 13 SEMANAS: lo programado solo, semana a
   * semana; y aparte, con su vara declarada, el mismo camino si el
   * gasto sigue al ritmo medido de este mes. */
  if (isLow) {
    const { events, counted } = scheduledEvents(c, 91);
    const ends: number[] = [];
    for (let i = 0; i < 13; i++) ends.push(walkEvents(start, events, addDaysIso(c.today, (i + 1) * 7 - 1)).end);
    let lowIdx = 0;
    for (let i = 1; i < 13; i++) if (ends[i] < ends[lowIdx]) lowIdx = i;
    const spent = allLines(c).filter((l) => l.monthKey === c.key && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && lineDate(l) <= c.today).reduce((a, l) => a + view(c, l), 0);
    const elapsed = Math.max(1, Number(c.today.slice(8, 10)));
    const paceWeek = Math.round((spent / elapsed) * 7);
    const rEnds = ends.map((e, i) => e - paceWeek * (i + 1));
    let rLow = 0;
    for (let i = 1; i < 13; i++) if (rEnds[i] < rEnds[rLow]) rLow = i;
    const wFrom = addDaysIso(c.today, lowIdx * 7);
    const wTo = addDaysIso(c.today, (lowIdx + 1) * 7 - 1);
    const driver = events.filter((e) => e.known && e.delta < 0 && e.on >= wFrom && e.on <= wTo).sort((a, b) => a.delta - b.delta)[0];
    return {
      kind: "answer", family: "factibilidad",
      verdict: L(c.lang, `Contando SOLO lo programado (cuotas, tarjetas y lo que te deben, con sus fechas y su cadencia), tu semana más baja de las próximas 13 es la ${lowIdx + 1} (del ${fmtFecha(c, wFrom)} al ${fmtFecha(c, wTo)}): cierras en ${money(ends[lowIdx])}${driver ? ` — esa semana cae «${driver.name}» (${money(-driver.delta)})` : ""}. Si además gastas a tu ritmo medido de este mes (${money(paceWeek)} por semana), la más baja sería la ${rLow + 1}, con ${money(rEnds[rLow])}. No conté ingresos futuros: es tu queda de hoy contra lo que ya tiene fecha.`, `Counting ONLY what's scheduled (dues, cards and what you're owed, with their dates and cadence), your lowest week of the next 13 is week ${lowIdx + 1} (${fmtFecha(c, wFrom)} to ${fmtFecha(c, wTo)}): you close at ${money(ends[lowIdx])}${driver ? ` — "${driver.name}" (${money(-driver.delta)}) falls that week` : ""}. If you also spend at this month's measured pace (${money(paceWeek)} a week), the lowest would be week ${rLow + 1}, at ${money(rEnds[rLow])}. I counted no future income: it's today's left against what already has a date.`),
      pieces: [
        { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
        { label: L(c.lang, `Semana ${lowIdx + 1} (solo lo programado)`, `Week ${lowIdx + 1} (scheduled only)`), minor: ends[lowIdx] },
        { label: L(c.lang, "Tu ritmo de gasto por semana", "Your spending pace per week"), minor: -paceWeek },
      ],
      note: noteOf(events, counted),
      source: src, lines: 0,
      actions: door,
      graph: graphOf("punto-bajo", L(c.lang, "Tu punto más bajo (solo lo programado)", "Your low point (scheduled only)"), ends[lowIdx], events.filter((e) => e.on <= addDaysIso(c.today, 90))),
      figure: {
        kind: "camino",
        points: [
          { label: L(c.lang, `Hoy · ${fmtFecha(c, c.today)}`, `Today · ${fmtFecha(c, c.today)}`), minor: start },
          ...ends.map((e, i) => (i === lowIdx
            ? { label: L(c.lang, `Semana ${i + 1}`, `Week ${i + 1}`), minor: e, mark: "minimo" as const }
            : { label: L(c.lang, `Semana ${i + 1}`, `Week ${i + 1}`), minor: e })),
        ],
        note: L(c.lang, "Solo lo programado: cuotas, tarjetas y lo que te deben, con sus fechas.", "Scheduled only: dues, cards and what you're owed, with their dates."),
      },
    };
  }

  /* EL PAGO EN SU DÍA: la prueba camina hasta el día D y entonces
   * cobra el pago traído. */
  if (isDayPay) {
    const a = amounts[0];
    const amt = convertMinor(a.minor, a.currency, c.display, c.rateE4);
    let D: string | null = null;
    if (/pasado manana/.test(folded)) D = addDaysIso(c.today, 2);
    else if (/\bmanana\b/.test(folded)) D = addDaysIso(c.today, 1);
    else if (/fin de mes/.test(folded)) D = monthEndIso(c.today);
    else if (dayM) {
      const dnum = Number(dayM[1]);
      if (dnum < 1 || dnum > 31) return null;
      const y = Number(c.today.slice(0, 4));
      const mo = Number(c.today.slice(5, 7));
      const mk = (yy: number, mm: number) => {
        const last = new Date(yy, mm, 0).getDate();
        return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(dnum, last)).padStart(2, "0")}`;
      };
      const cand = mk(y, mo);
      D = cand >= c.today ? cand : mk(mo === 12 ? y + 1 : y, mo === 12 ? 1 : mo + 1);
    }
    if (!D) return null;
    const { events, counted } = scheduledEvents(c, daysBetweenIso(c.today, D));
    const w = walkEvents(start, events, D);
    const after = w.end - amt;
    const outSum = -events.filter((e) => e.known && e.delta < 0 && e.on <= D).reduce((a, e) => a + e.delta, 0);
    const conflictTxt = w.conflict ? L(c.lang, ` Ojo: antes de ese día, el ${fmtFecha(c, w.conflict.ev.on)}, «${w.conflict.ev.name}» ya te deja en ${money(w.conflict.bal)}.`, ` Mind you: before that day, on ${fmtFecha(c, w.conflict.ev.on)}, "${w.conflict.ev.name}" already leaves you at ${money(w.conflict.bal)}.`) : "";
    /* OLA 32 · EL MENÚ DE VUELTAS de este día: si cabe, el margen
     * (lo máximo que ese día aguanta); si no cabe, las vueltas
     * mínimas RECALCULADAS — pagar menos (la cifra exacta que sí
     * cabe) o pagar el día que entra lo debido (re-caminado). */
    let vueltaTxt = "";
    if (after >= 0) {
      vueltaTxt = L(c.lang, ` Tu margen de seguridad ese día: podrías pagar hasta ${money(w.end)} y no quedarías en negativo.`, ` Your safety margin that day: you could pay up to ${money(w.end)} and not go negative.`);
    } else {
      const flips: string[] = [];
      if (w.end > 0) flips.push(L(c.lang, `pagando ${money(w.end)} ese día sí cabe`, `paying ${money(w.end)} that day does fit`));
      const monthEvents = scheduledEvents(c, daysBetweenIso(c.today, monthEndIso(c.today))).events;
      const inflow = monthEvents.filter((e) => e.known && e.delta > 0 && e.on > D).sort((a, b) => (a.on < b.on ? -1 : 1))[0];
      if (inflow) {
        const w2 = walkEvents(start, monthEvents, inflow.on);
        if (w2.end - amt >= 0) flips.push(L(c.lang, `pagarlo el ${fmtFecha(c, inflow.on)}, cuando entra «${inflow.name}» (${money(inflow.delta)}): ese día sí cabe`, `paying it on ${fmtFecha(c, inflow.on)}, when "${inflow.name}" (${money(inflow.delta)}) comes in: that day it fits`));
      }
      vueltaTxt = flips.length
        ? L(c.lang, ` El menú de vueltas — lo mínimo que tendría que cambiar: ${flips.join("; ")}.`, ` The flip menu — the least that would have to change: ${flips.join("; ")}.`)
        : L(c.lang, ` Y ese día no hay vuelta corta: lo programado por sí solo ya te deja en ${money(w.end)}.`, ` And that day has no short flip: the scheduled payments alone already leave you at ${money(w.end)}.`);
    }
    return {
      kind: "answer", family: "factibilidad",
      verdict: after >= 0
        ? L(c.lang, `Sí, con lo anotado: el ${fmtFecha(c, D)}, tras pagar lo programado hasta ese día (${money(outSum)}), te quedan ${money(w.end)} — y pagando ${money(amt)} te quedan ${money(after)}.${conflictTxt}${vueltaTxt}`, `Yes, on what's recorded: on ${fmtFecha(c, D)}, after the scheduled payments up to that day (${money(outSum)}), you'd have ${money(w.end)} — and paying ${money(amt)} leaves you ${money(after)}.${conflictTxt}${vueltaTxt}`)
        : L(c.lang, `No, con lo anotado: el ${fmtFecha(c, D)} lo programado te deja en ${money(w.end)}, y pagar ${money(amt)} te dejaría en ${money(after)} — te faltan ${money(-after)}.${conflictTxt}${vueltaTxt}`, `No, on what's recorded: on ${fmtFecha(c, D)} the scheduled payments leave you at ${money(w.end)}, and paying ${money(amt)} would leave you at ${money(after)} — you're ${money(-after)} short.${conflictTxt}${vueltaTxt}`),
      pieces: [
        { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
        { label: L(c.lang, `Tras lo programado · ${fmtFecha(c, D)}`, `After the scheduled · ${fmtFecha(c, D)}`), minor: w.end },
        { label: L(c.lang, "El pago", "The payment"), minor: -amt },
      ],
      note: noteOf(events, counted),
      source: src, lines: 0,
      actions: door,
      graph: graphOf("saldo-tras-pago", L(c.lang, "Tu saldo tras ese pago", "Your balance after that payment"), after, events.filter((e) => e.on <= D), { id: "pago", label: L(c.lang, "El pago que traes", "The payment you bring"), minor: amt, tense: "proyectado", flow: "flujo", currency: c.display, sign: -1, assumption: { text: L(c.lang, "pagar esa cantidad ese día, como preguntaste", "paying that amount that day, as you asked"), origin: "usuario" } }),
      figure: caminoFigure(c, start, w, null, { label: L(c.lang, `El pago · ${fmtFecha(c, D)}`, `The payment · ${fmtFecha(c, D)}`), minor: after, mark: "cierre" }),
    };
  }

  /* EL MES: la prueba entera hasta el último día. */
  const end = monthEndIso(c.today);
  const { events, counted } = scheduledEvents(c, daysBetweenIso(c.today, end));
  const w = walkEvents(start, events, end);
  // Un camino de un solo punto no enseña ningún camino: sin eventos
  // conocidos por caminar, la respuesta del mes no trae figura.
  const monthFigure = w.steps.length ? caminoFigure(c, start, w, null) : undefined;
  const known = events.filter((e) => e.known);
  const outSum = -known.filter((e) => e.delta < 0).reduce((a, e) => a + e.delta, 0);
  const inSum = known.filter((e) => e.delta > 0).reduce((a, e) => a + e.delta, 0);
  /* OLA 39 · EL DÍA DEL CERO Y EL CIERRE: las tres voces leen el
   * MISMO paseo del mes — el signo, el faltante y el día del cero —
   * cada una con su veredicto propio. */
  if (isClose) {
    const close = w.end;
    if (negVoice) {
      return {
        kind: "answer", family: "factibilidad",
        verdict: close < 0
          ? L(c.lang, `Sí: con lo programado terminas el mes en negativo — cierras en ${money(close)} (te faltan ${money(-close)})${w.conflict ? `, y el primer día en rojo es el ${fmtFecha(c, w.conflict.ev.on)}, cuando «${w.conflict.ev.name}» te deja en ${money(w.conflict.bal)}` : ""}.`, `Yes: with what's scheduled you end the month in negative — you close at ${money(close)} (you're ${money(-close)} short)${w.conflict ? `, and the first day in the red is ${fmtFecha(c, w.conflict.ev.on)}, when "${w.conflict.ev.name}" leaves you at ${money(w.conflict.bal)}` : ""}.`)
          : w.min < 0
            ? L(c.lang, `El mes cierra en positivo (${money(close)}), pero el camino toca negativo: el ${w.minOn ? fmtFecha(c, w.minOn) : ""} bajas a ${money(w.min)}. Cerrar bien no es lo mismo que no bajar de cero en el camino.`, `The month closes positive (${money(close)}), but the path dips negative: on ${w.minOn ? fmtFecha(c, w.minOn) : ""} you go down to ${money(w.min)}. Closing well is not the same as never dipping below zero on the way.`)
            : L(c.lang, `No: con lo programado cierras el mes en ${money(close)} y tu punto más bajo es ${money(w.min)} — ningún día en negativo.`, `No: with what's scheduled you close the month at ${money(close)} and your low point is ${money(w.min)} — no day in negative.`),
        pieces: [
          { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
          { label: L(c.lang, "Cierre del mes", "Month close"), minor: close },
          ...(w.min < close ? [{ label: L(c.lang, "Punto más bajo", "Low point"), minor: w.min }] : []),
        ],
        note: noteOf(events, counted),
        source: src, lines: 0, actions: door,
        graph: graphOf("cierre-mes", L(c.lang, "Tu cierre del mes", "Your month close"), close, events),
        ...(monthFigure ? { figure: monthFigure } : {}),
      };
    }
    if (needVoice) {
      const needClose = close < 0 ? -close : 0;
      const needPath = w.min < 0 ? -w.min : 0;
      return {
        kind: "answer", family: "factibilidad",
        verdict: needClose > 0
          ? L(c.lang, `Para terminar el mes en cero necesitas ${money(needClose)} más: con lo programado cierras en ${money(close)}.${needPath > needClose && w.minOn ? ` Y para no bajar de cero en el camino harían falta ${money(needPath)} antes del ${fmtFecha(c, w.minOn)}.` : ""}`, `To end the month at zero you need ${money(needClose)} more: with what's scheduled you close at ${money(close)}.${needPath > needClose && w.minOn ? ` And to never dip below zero on the way you'd need ${money(needPath)} before ${fmtFecha(c, w.minOn)}.` : ""}`)
          : needPath > 0
            ? L(c.lang, `Para TERMINAR el mes no necesitas nada más: cierras en ${money(close)}. Pero el camino baja de cero — el ${w.minOn ? fmtFecha(c, w.minOn) : ""} llegas a ${money(w.min)} — así que para no tocar negativo en el camino harían falta ${money(needPath)} antes de ese día.`, `To END the month you need nothing more: you close at ${money(close)}. But the path dips below zero — on ${w.minOn ? fmtFecha(c, w.minOn) : ""} you reach ${money(w.min)} — so to never touch negative on the way you'd need ${money(needPath)} before that day.`)
            : L(c.lang, `No necesitas nada más para terminar el mes: con lo programado cierras en ${money(close)} y tu punto más bajo es ${money(w.min)} — llegas entero, sin faltante.`, `You need nothing more to finish the month: with what's scheduled you close at ${money(close)} and your low point is ${money(w.min)} — you arrive whole, with no shortfall.`),
        pieces: [
          { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
          { label: L(c.lang, "Cierre del mes", "Month close"), minor: close },
          ...(needClose > 0 ? [{ label: L(c.lang, "Lo que falta", "What's missing"), minor: -needClose }] : []),
        ],
        note: noteOf(events, counted),
        source: src, lines: 0, actions: door,
        graph: graphOf("cierre-mes", L(c.lang, "Tu cierre del mes", "Your month close"), close, events),
        ...(monthFigure ? { figure: monthFigure } : {}),
      };
    }
    // runOutVoice: el día del cero — por lo programado si cruza
    // este mes; si no, por el ritmo medido, con su vara declarada.
    if (start < 0) {
      return {
        kind: "answer", family: "factibilidad",
        verdict: L(c.lang, `Ya estás por debajo de cero hoy: tu queda es ${money(start)}. No es un día que viene — es el punto de partida, y con lo programado el mes cierra en ${money(close)}.`, `You're already below zero today: your left is ${money(start)}. It isn't a day that's coming — it's the starting point, and with what's scheduled the month closes at ${money(close)}.`),
        pieces: [{ label: L(c.lang, "Queda de hoy", "Left today"), minor: start }, { label: L(c.lang, "Cierre del mes", "Month close"), minor: close }],
        note: noteOf(events, counted),
        source: src, lines: 0, actions: door,
        graph: graphOf("cierre-mes", L(c.lang, "Tu cierre del mes", "Your month close"), close, events),
        ...(monthFigure ? { figure: monthFigure } : {}),
      };
    }
    const spent = allLines(c).filter((l) => l.monthKey === c.key && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && lineDate(l) <= c.today).reduce((a, l) => a + view(c, l), 0);
    const elapsed = Math.max(1, Number(c.today.slice(8, 10)));
    const paceDay = Math.round(spent / elapsed);
    const ev92 = scheduledEvents(c, 92).events;
    let paceCross: string | null = null;
    if (paceDay > 0) {
      for (let d = 1; d <= 92; d++) {
        const t = addDaysIso(c.today, d);
        if (walkEvents(start, ev92, t).end - paceDay * d < 0) { paceCross = t; break; }
      }
    }
    const schedCross = w.conflict ? w.conflict.ev.on : null;
    const cross = schedCross && paceCross ? (schedCross <= paceCross ? schedCross : paceCross) : schedCross ?? paceCross;
    const byPace = cross !== null && cross === paceCross && cross !== schedCross;
    return {
      kind: "answer", family: "factibilidad",
      verdict: cross
        ? byPace
          ? L(c.lang, `A tu ritmo medido de gasto (${money(paceDay)} por día), te quedas en cero el ${fmtFecha(c, cross)} — conté lo programado con fecha y NO conté ingresos futuros: si entra tu ingreso de siempre, ese día se mueve. Este mes, solo con lo programado, cierras en ${money(close)}.`, `At your measured spending pace (${money(paceDay)} a day), you run out on ${fmtFecha(c, cross)} — I counted what's scheduled with a date and did NOT count future income: if your usual income lands, that day moves. This month, on scheduled items alone, you close at ${money(close)}.`)
          : L(c.lang, `Con lo programado, te quedas en cero el ${fmtFecha(c, cross)}: «${w.conflict!.ev.name}» te deja en ${money(w.conflict!.bal)}. No hace falta proyectar tu ritmo — el día ya está en el libro, con su nombre.`, `On what's scheduled, you run out on ${fmtFecha(c, cross)}: "${w.conflict!.ev.name}" leaves you at ${money(w.conflict!.bal)}. No need to project your pace — the day is already in the book, with its name on it.`)
        : L(c.lang, `Con lo anotado no se te acaba: este mes cierras en ${money(close)} sin tocar cero${paceDay > 0 ? `, y ni a tu ritmo medido de gasto (${money(paceDay)} por día) cruzas cero en los próximos tres meses — sin contar ingresos futuros, que solo empujarían el día más lejos` : `, y sin ritmo medido en tu libro no proyecto un día que el libro no sostiene`}.`, `On what's recorded it doesn't run out: this month you close at ${money(close)} without touching zero${paceDay > 0 ? `, and not even at your measured spending pace (${money(paceDay)} a day) do you cross zero in the next three months — not counting future income, which would only push the day further out` : `, and with no measured pace in your book I won't project a day the book can't support`}.`),
      pieces: [
        { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
        { label: L(c.lang, "Cierre del mes", "Month close"), minor: close },
        ...(paceDay > 0 ? [{ label: L(c.lang, "Tu ritmo por día", "Your pace per day"), minor: -paceDay }] : []),
      ],
      note: noteOf(events, counted),
      source: src, lines: 0, actions: door,
      graph: graphOf("cierre-mes", L(c.lang, "Tu cierre del mes", "Your month close"), close, events),
      ...(monthFigure ? { figure: monthFigure } : {}),
    };
  }
  /* OLA 32 · EL MENÚ DE VUELTAS del mes (investigación II, #6):
   * para cada «no», el cambio MÍNIMO por eje que lo voltea,
   * probado por construcción sobre el mismo paseo — mover la
   * obligación que rompe al último día solo puede subir los
   * saldos intermedios y el cierre no cambia; entrar el faltante
   * antes del conflicto lo tapa exactamente; bajar la obligación
   * en el faltante deja el punto del conflicto en cero. Orden
   * tornado: primero la vuelta sin monto (la fecha), luego las de
   * monto. Para cada «sí», el MARGEN: el punto más bajo del paseo
   * es lo máximo que se puede gastar de más sin romper la cadena. */
  let menuTxt = "";
  if (w.conflict) {
    const short = -w.conflict.bal;
    const flips: string[] = [];
    if (w.end >= 0) flips.push(L(c.lang, `que «${w.conflict.ev.name}» se pague el ${fmtFecha(c, end)} en vez del ${fmtFecha(c, w.conflict.ev.on)} — el mes cierra en ${money(w.end)} igual, pero ningún día queda en negativo`, `that "${w.conflict.ev.name}" is paid on ${fmtFecha(c, end)} instead of ${fmtFecha(c, w.conflict.ev.on)} — the month still closes at ${money(w.end)}, but no day goes negative`));
    flips.push(L(c.lang, `que entren ${money(short)} más antes del ${fmtFecha(c, w.conflict.ev.on)}`, `${money(short)} more coming in before ${fmtFecha(c, w.conflict.ev.on)}`));
    flips.push(L(c.lang, `que «${w.conflict.ev.name}» baje ${money(short)}`, `that "${w.conflict.ev.name}" drops by ${money(short)}`));
    menuTxt = L(c.lang, ` El menú de vueltas — lo mínimo que tendría que cambiar para que sí quepa: ${flips.join("; ")}.`, ` The flip menu — the least that would have to change for it all to fit: ${flips.join("; ")}.`);
  }
  const marginTxt = !w.conflict && start >= 0 && known.length
    ? (w.min > 0
      ? L(c.lang, ` Tu margen de seguridad: podrías gastar hasta ${money(w.min)} más en el mes sin romper la cadena — eso es tu punto más bajo.`, ` Your safety margin: you could spend up to ${money(w.min)} more in the month without breaking the chain — that's your lowest point.`)
      : L(c.lang, ` Sin margen: tu punto más bajo toca cero — cualquier gasto nuevo rompería la cadena.`, ` No margin: your lowest point touches zero — any new spending would break the chain.`))
    : "";
  let verdict: string;
  if (start < 0) {
    verdict = L(c.lang, `No, y no por lo que viene: tu queda de hoy ya va en ${money(start)} — salió más de lo que entró.${known.length ? ` Lo programado de aquí a fin de mes (${money(outSum)} en pagos${inSum ? `, contra ${money(inSum)} que te deben y entran` : ""}) lo dejaría en ${money(w.end)}.` : " Y no queda nada programado por caminar este mes: así cierra, si no gastas más."}`, `No, and not because of what's coming: today's left already stands at ${money(start)} — more went out than came in.${known.length ? ` What's scheduled from here to month's end (${money(outSum)} in payments${inSum ? `, against ${money(inSum)} you're owed coming in` : ""}) would leave it at ${money(w.end)}.` : " And there's nothing scheduled left to walk this month: that's where it closes, if you spend no more."}`);
  } else if (!known.length && !events.some((e) => !e.known)) {
    verdict = L(c.lang, `De aquí a fin de mes no hay nada programado por caminar — lo de este mes ya está contado en tu queda, y no viene nada más con fecha. Con tu queda de hoy, ${money(start)}, y sin ningún gasto nuevo, el mes cierra en eso mismo: la prueba corre sobre lo anotado.`, `From here to month's end there's nothing scheduled left to walk — this month's is already counted in your left, and nothing else dated is coming. With today's left, ${money(start)}, and no new spending, the month closes right there: the proof runs over what's recorded.`);
  } else if (w.conflict) {
    verdict = L(c.lang, `No, con lo anotado no cabe todo: el ${fmtFecha(c, w.conflict.ev.on)}, «${w.conflict.ev.name}» (${money(-w.conflict.ev.delta)}) te deja en ${money(w.conflict.bal)} — ahí te faltan ${money(-w.conflict.bal)}.${w.end >= 0 ? ` Lo que te deben después lo tapa y el mes cierra en ${money(w.end)}: tu problema es el día, no el mes.` : ` Y el mes cierra en ${money(w.end)}.`}${menuTxt}`, `No, on what's recorded it doesn't all fit: on ${fmtFecha(c, w.conflict.ev.on)}, "${w.conflict.ev.name}" (${money(-w.conflict.ev.delta)}) leaves you at ${money(w.conflict.bal)} — there you're ${money(-w.conflict.bal)} short.${w.end >= 0 ? ` What you're owed later covers it and the month closes at ${money(w.end)}: your problem is the day, not the month.` : ` And the month closes at ${money(w.end)}.`}${menuTxt}`);
  } else {
    verdict = L(c.lang, `Sí, con lo anotado sí: pagando todo lo programado de aquí a fin de mes (${money(outSum)} en ${known.filter((e) => e.delta < 0).length} pagos${inSum ? `, y contando ${money(inSum)} que te deben y entran` : ""}) el mes cierra en ${money(w.end)}, y tu punto más bajo es el ${fmtFecha(c, w.minOn || c.today)} con ${money(w.min)}.${marginTxt}`, `Yes, on what's recorded it fits: paying everything scheduled from here to month's end (${money(outSum)} in ${known.filter((e) => e.delta < 0).length} payments${inSum ? `, and counting ${money(inSum)} you're owed coming in` : ""}) the month closes at ${money(w.end)}, and your lowest point is ${fmtFecha(c, w.minOn || c.today)} at ${money(w.min)}.${marginTxt}`);
  }
  return {
    kind: "answer", family: "factibilidad",
    verdict,
    pieces: [
      { label: L(c.lang, "Queda de hoy", "Left today"), minor: start },
      ...known.slice(0, 4).map((e) => ({ label: `${e.name} · ${fmtFecha(c, e.on)}`, minor: e.delta })),
      { label: L(c.lang, "Cierre del mes", "Month's close"), minor: w.end },
    ],
    note: noteOf(events, counted),
    source: src, lines: 0,
    actions: door,
    graph: graphOf("cierre-del-mes", L(c.lang, "El cierre del mes, sobre lo anotado", "The month's close, on what's recorded"), w.end, events),
    ...(monthFigure ? { figure: monthFigure } : {}),
  };
}
/* OLA 46 (F1) · EL TOTAL DE TODO — «¿cuánto dinero tengo en
 * total?»: las piezas vivían sueltas (la queda de hoy, el stock de
 * ahorros, lo que me deben) y nadie sumaba el todo. La suma no
 * duplica: lo apartado YA salió de la queda (readAdvisor cuenta el
 * ahorro como salida), así que queda + ahorros + lo que me deben
 * son tres bolsas distintas. Y la respuesta declara su borde: es
 * el dinero que el LIBRO conoce — no cuenta efectivo fuera del
 * libro ni bienes, y NO resta lo que debes (eso es el patrimonio,
 * la pregunta de la familia falta). */
function totalTodoAnswer(c: Ctx, folded: string): BankResult | null {
  // OLA 66 · EL DINERO CON SU NOMBRE DE TODOS LOS DÍAS (palabra
  // traída por Oscar, 2026-11-24: «preguntarle tengo billete — para
  // que me dé así: tienes tanto»): «¿cuánto dinero tengo?» sin el
  // «en total» callaba entera, y «billete» — el nombre que el dinero
  // tiene en la calle — no existía para el Asesor. Las dos formas
  // son esta familia: el dinero nombrado (dinero, billete, efectivo,
  // cash) pregunta por todo el del libro, y la forma desnuda
  // «¿tengo billete?» pide la cifra con su sí o su no por delante.
  // La clase nombrada sigue mandando sobre el nombre del dinero:
  // «¿cuánto billete tengo en ahorros?» es de ahorros, no de aquí.
  // ADDENDA (puerto 1.3.458): la voz del «hay» con cuánto callaba
  // — «¿cuánto billete hay?» devolvía unknown sobre un libro con
  // dinero — y entra con su par inglés («how much money is
  // there»), en esta puerta y en la fila «total» del clasificador.
  const bare = folded.replace(/[¿?¡!.,;]/g, "").replace(/\s+/g, " ").trim();
  const classNamed = /(en (mis? |el |la )?(ahorr|retiro|emergencia|meta|cuentas?|banco)|de (mis? )?ahorros|in (my )?(savings|retirement|accounts?))/.test(folded);
  const moneyHow = /(cuanto (dinero|billete|efectivo) tengo|cuanto (dinero|billete|efectivo) hay|cuanto tengo en total|todo mi dinero|how much (money|cash) do i have|how much (money|cash) is there|how much do i have in total)/.test(folded);
  const bareMoney = /^(y )?(no )?(tengo|tenes|me queda|hay) (dinero|billete|efectivo)( para (gastar|comprar|pagar|salir|comer|eso|esto))?$/.test(bare)
    || /^(do i have|have i got) (any )?(money|cash)$/.test(bare);
  if (classNamed || (!moneyHow && !bareMoney)) return null;
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const stock = savingsStock(c.state, c.key);
  const nb = netBalance(c.state, c.today);
  const left = reading.left;
  const total = left + stock.total + nb.owed;
  const pieces: BankPiece[] = [];
  if (left !== 0) pieces.push({ label: L(c.lang, "Tu queda de hoy", "Your left today"), minor: left });
  if (stock.total !== 0) pieces.push({ label: L(c.lang, "En ahorros", "In savings"), minor: stock.total });
  if (nb.owed !== 0) pieces.push({ label: L(c.lang, "Que te deben", "Owed to you"), minor: nb.owed });
  if (!pieces.length) {
    return { kind: "answer", family: "total", verdict: L(c.lang, "En total, tu libro no guarda dinero en ningún lado todavía: ni queda del mes, ni ahorros, ni préstamos dados por cobrar. Lo que se anote, se suma aquí.", "In total, your book doesn't hold money anywhere yet: no month's left, no savings, and no loans given to collect. Whatever gets recorded adds up here."), pieces: [], note: null, source: ["libros.lineas", "ahorros.stock", "cobros.mideben"], lines: 0 };
  }
  return {
    kind: "answer", family: "total",
    verdict: (bareMoney ? (total > 0 ? L(c.lang, "Sí. ", "Yes. ") : L(c.lang, "No. ", "No. ")) : "") + L(c.lang, `En total tienes ${c.money(total)}: ${c.money(left)} de queda de hoy, ${c.money(stock.total)} en ahorros y ${c.money(nb.owed)} que te deben. Es todo el dinero que tu libro conoce — no cuenta efectivo fuera del libro ni el valor de tus bienes, y no resta lo que debes: eso ya es tu patrimonio, otra pregunta.`, `In total you have ${c.money(total)}: ${c.money(left)} of today's left, ${c.money(stock.total)} in savings and ${c.money(nb.owed)} owed to you. It's all the money your book knows — it doesn't count cash outside the book or the value of your things, and it doesn't subtract what you owe: that's your net worth, a different question.`),
    pieces,
    note: null, source: ["libros.lineas", "ahorros.stock", "cobros.mideben"], lines: 0,
    actions: reportDoor(c, "ahorros.stock", "Ver mis ahorros", "See my savings"),
  };
}

/* OLA 42 · EL COSTO DE VIDA Y LAS PROPORCIONES (la caza del centro,
 * clase 5): las preguntas del mes entero como forma de vida —
 * «¿cuánto necesito para vivir?», «¿qué parte de lo que gano se va
 * en…?», «¿cuánto me cuesta X al mes?», «¿me alcanza con lo que
 * gano?» — callaban enteras o caían en el need-amount de gustos.
 * Todas se miden sobre el MES TÍPICO (la mediana de los meses
 * anotados), nunca sobre el mes en curso disfrazado, y las partes
 * se dicen en frecuencias naturales, con su denominador nombrado
 * («de cada $100 que ganas…»), como manda la batería de utilidad. */
/** OLA 69 · LA TASA CONTRA LA REFERENCIA (el plan de los grandes,
 * confirmado por el estudio académico: el ahorro es dominio con
 * evidencia y su juicio pide una vara): la tasa de ahorro (lo
 * apartado entre lo que entró) se responde con su derivación y se
 * juzga contra DOS referencias, en este orden: primero la propia
 * (el promedio medido del usuario, su vara interna) y después la
 * referencia de la guía. La tasa es del apartado anotado, no del
 * residuo: apartar es un acto (la doctrina de ahorros). Sin
 * ingreso anotado no hay tasa: dividir entre nada no se disfraza.
 * ADJUDICACIÓN DE CANON (puerto 1.3.464): la segunda referencia se
 * lee de LA GUÍA DEL LIBRO (guideOf, la misma de la familia regla
 * desde la 1.3.422) — si el libro trae su guía propia, esa es la
 * referencia, nombrada como suya («Contra tu guía 60·25·15»); la
 * regla publicada 50·30·20 solo nombra la referencia cuando el
 * libro no trae guía propia. CONSISTENCIA: la misma vara en
 * Estudio y en el Asesor. */
function tasaAhorroAnswer(c: Ctx, folded: string): BankResult | null {
  const rateVoice = /(tasa de ahorro|savings rate|mi tasa de ahorro|my savings rate)/.test(folded);
  const pctVoice = /(porcentaje|por ciento|percent)/.test(folded) && /(ahorr|sav)/.test(folded) && /(ingreso|income|gano|earn|sueldo|salary)/.test(folded);
  const enoughVoice = /(ahorrando lo suficiente|ahorro lo suficiente|ahorrar lo suficiente|saving enough|ahorro (mas|menos) que|ahorre (mas|menos)|save (more|less) than|saving (more|less) than|ahorro mas|ahorro menos)/.test(folded);
  if (!rateVoice && !pctVoice && !enoughVoice) return null;
  const monthKeys = Object.keys(c.state.months).filter((k) => k <= c.key).sort();
  const savInMonth = (key: string) => (c.state.months[key]?.lines ?? []).filter((l) => l.active && roleOf(c.state, l.categoryId) === "savings").reduce((a, l) => a + view(c, l), 0);
  const incInMonth = (key: string) => summarize(c.state, key, c.lang).income;
  const pctOf = (sav: number, inc: number) => Math.round((sav / inc) * 1000) / 10;
  const fmtPct = (p: number) => (Number.isInteger(p) ? `${p}%` : `${p.toFixed(1)}%`);
  const incKeys = monthKeys.filter((k) => incInMonth(k) > 0);
  const src = ["ahorros.mes", "estudio.regla"];
  const door = reportDoor(c, "estudio.regla", "Ver la regla en Estudio", "See the rule in Study");
  if (!incKeys.length) {
    return {
      kind: "answer", family: "tasa",
      verdict: L(c.lang, "No hay tasa que medir: en tu libro no consta ingreso anotado en ningún mes, y la tasa es lo apartado entre lo que entró. Sin denominador, cualquier porcentaje sería inventado.", "There's no rate to measure: your book has no income recorded in any month, and the rate is what you set aside divided by what came in. With no denominator, any percentage would be invented."),
      pieces: [], note: null, source: src, lines: 0,
    };
  }
  const headKey = incKeys.includes(c.key) ? c.key : incKeys[incKeys.length - 1];
  const headSav = savInMonth(headKey);
  const headInc = incInMonth(headKey);
  const headRate = pctOf(headSav, headInc);
  const totSav = incKeys.reduce((a, k) => a + savInMonth(k), 0);
  const totInc = incKeys.reduce((a, k) => a + incInMonth(k), 0);
  const avgRate = pctOf(totSav, totInc);
  const prevKey = incKeys.filter((k) => k < headKey).pop();
  const prevRate = prevKey ? pctOf(savInMonth(prevKey), incInMonth(prevKey)) : null;
  const headWhen = headKey === c.key
    ? L(c.lang, "Este mes", "This month")
    : L(c.lang, `En ${headKey}, tu último mes con ingreso anotado`, `In ${headKey}, your last month with recorded income`);
  const trend = prevRate === null ? ""
    : prevRate === headRate ? L(c.lang, ` Es la misma tasa que el mes anterior (${fmtPct(prevRate)}).`, ` It's the same rate as the month before (${fmtPct(prevRate)}).`)
      : headRate > prevRate ? L(c.lang, ` Subió desde el ${fmtPct(prevRate)} del mes anterior.`, ` It's up from ${fmtPct(prevRate)} the month before.`)
        : L(c.lang, ` Bajó desde el ${fmtPct(prevRate)} del mes anterior.`, ` It's down from ${fmtPct(prevRate)} the month before.`);
  const ownRef = L(c.lang, `Contra tu propia referencia, tu promedio medido de ${incKeys.length} mes${incKeys.length === 1 ? "" : "es"} con ingreso, que es el ${fmtPct(avgRate)}: ${headRate > avgRate ? "este mes vas por encima de tu promedio" : headRate < avgRate ? "este mes vas por debajo de tu promedio" : "este mes vas justo en tu promedio"}.`, `Against your own reference, your measured average over ${incKeys.length} month${incKeys.length === 1 ? "" : "s"} with income, which is ${fmtPct(avgRate)}: ${headRate > avgRate ? "this month you're above your average" : headRate < avgRate ? "this month you're below your average" : "this month you're right at your average"}.`);
  const guide = guideOf(c.state.settings);
  const pubRef = guide.custom
    ? L(c.lang, `Contra tu guía ${guide.needs}·${guide.wants}·${guide.save}, la que fijaste en tu libro, que pone el ahorro en el ${guide.save}% del ingreso: ${headRate >= guide.save ? "estás en esa marca o por encima" : "estás por debajo de esa marca"}. Es tu vara puesta en números: la que manda es la tuya.`, `Against your ${guide.needs}·${guide.wants}·${guide.save} guide, the one you set in your book, which puts saving at ${guide.save}% of income: ${headRate >= guide.save ? "you're at that mark or above it" : "you're below that mark"}. It's your yardstick in numbers: the one that rules is your own.`)
    : L(c.lang, `Contra la referencia publicada, la regla 50·30·20, que pone el ahorro en el 20% del ingreso: ${headRate >= 20 ? "estás en esa marca o por encima" : "estás por debajo de esa marca"}. La regla es una referencia, no una sentencia: la vara que manda es la tuya.`, `Against the published reference, the 50·30·20 rule, which puts saving at 20% of income: ${headRate >= 20 ? "you're at that mark or above it" : "you're below that mark"}. The rule is a reference, not a sentence: the yardstick that rules is your own.`);
  return {
    kind: "answer", family: "tasa",
    verdict: L(c.lang, `${headWhen} apartaste ${c.money(headSav)} de ${c.money(headInc)} que entraron: tu tasa de ahorro es el ${fmtPct(headRate)}.${trend} ${ownRef} ${pubRef}`, `${headWhen} you set aside ${c.money(headSav)} of the ${c.money(headInc)} that came in: your savings rate is ${fmtPct(headRate)}.${trend} ${ownRef} ${pubRef}`),
    pieces: [
      { label: L(c.lang, "Apartado", "Set aside"), minor: headSav },
      { label: L(c.lang, "Entró", "Came in"), minor: headInc },
    ],
    note: L(c.lang, "La tasa se mide sobre el apartado anotado en tus líneas de ahorro, no sobre lo que el mes dejó libre: apartar es un acto, no un residuo.", "The rate is measured on the set-aside recorded in your savings lines, not on what the month left over: setting aside is an act, not a residue."),
    source: src, lines: 0, actions: door,
  };
}

function costoVidaAnswer(c: Ctx, folded: string): BankResult | null {
  const keys = Object.keys(c.state.months).filter((k) => k <= c.key).sort();
  if (!keys.length) return null;
  const monthOut = (k: string) => (c.state.months[k]?.lines ?? []).filter((l) => l.active && isOut(l) && roleOf(c.state, l.categoryId) !== "savings").reduce((a, l) => a + view(c, l), 0);
  const monthIn = (k: string) => (c.state.months[k]?.lines ?? []).filter((l) => l.active && /^income/.test(l.kind)).reduce((a, l) => a + view(c, l), 0);
  const medianOf = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
  const typicalOut = medianOf(keys.map(monthOut));
  const typicalIn = medianOf(keys.map(monthIn));
  const nMonths = keys.length;
  /* El rótulo del ciudadano filtrado: si UN concepto suma todo el
   * filtro, ese concepto nombra («la renta»); si el filtro abarca
   * varios conceptos, nombra la categoría que los junta («la
   * casa») — decir «Renta» por una cifra que incluye el Internet
   * sería un rótulo mentiroso. */
  const labelFor = (filter: (l: Line) => boolean): string => {
    const pool = allLines(c).filter((l) => filter(l));
    if (!pool.length) return "";
    const total = pool.reduce((a, l) => a + view(c, l), 0);
    const byConcept = new Map<string, number>();
    const byCat = new Map<string, number>();
    for (const l of pool) {
      if (l.concept) byConcept.set(l.concept, (byConcept.get(l.concept) ?? 0) + view(c, l));
      if (l.categoryId) byCat.set(l.categoryId, (byCat.get(l.categoryId) ?? 0) + view(c, l));
    }
    const top = [...byConcept.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] === total) return top[0];
    const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCat) return c.names.cat(topCat[0]);
    return top ? top[0] : "";
  };
  /* El puente de sinónimos hablados: «comida» ES la categoría
   * Alimentos de la estructura — el usuario la nombra por su
   * nombre de la calle, y el filtro por nombre no la oye. Solo
   * pares que son el mismo ciudadano con dos nombres. */
  const synonymFilter = (): ((l: Line) => boolean) | null => {
    const SYN: Array<[RegExp, RegExp]> = [
      [/\b(comida|supermercado|super|groceries|food)\b/, /^(alimentos|food|groceries)$/],
    ];
    for (const [spoken, catName] of SYN) {
      if (!spoken.test(folded)) continue;
      for (const cat of c.state.structure.categories) {
        if (catName.test(foldQ(c.names.cat(cat.id)))) return (l: Line) => l.categoryId === cat.id;
      }
    }
    return null;
  };

  /* ¿ME ALCANZA CON LO QUE GANO?: ingreso típico contra gasto
   * típico, con el veredicto que la resta manda. */
  if (/(me alcanza con lo que gano|alcanza (con|mi|el) (lo que gano|sueldo|salario)|mi (sueldo|salario) alcanza|(sueldo|salario) me alcanza|is my (salary|paycheck|income) enough|does my (salary|paycheck|income) cover)/.test(folded)) {
    if (typicalIn <= 0) {
      return { kind: "answer", family: "promedio", verdict: L(c.lang, `No puedo juzgarlo: en tu libro no hay ingreso anotado en los meses que miro, y sin ingreso medido «lo que gano» no tiene cifra. Tu gasto típico sí se mide: ${c.money(typicalOut)} al mes.`, `I can't judge it: your book has no recorded income in the months I can see, and without a measured income "what I earn" has no figure. Your typical spending does measure: ${c.money(typicalOut)} a month.`), pieces: [{ label: L(c.lang, "Gasto típico al mes", "Typical monthly spend"), minor: typicalOut }], note: null, source: ["asesor.lectura", "historial.stream"], lines: 0 };
    }
    const diff = typicalIn - typicalOut;
    return {
      kind: "answer", family: "promedio",
      verdict: diff >= 0
        ? L(c.lang, `Sí, con lo que ganas alcanza — medido, no a ojo: tu ingreso típico es ${c.money(typicalIn)} al mes y tu gasto típico ${c.money(typicalOut)}; te quedan ${c.money(diff)} libres en el mes típico. Es la mediana de tus ${nMonths} meses anotados: un mes caro no es el típico, y esta cuenta lo sabe.`, `Yes, what you earn covers it — measured, not eyeballed: your typical income is ${c.money(typicalIn)} a month and your typical spending ${c.money(typicalOut)}; ${c.money(diff)} stay free in the typical month. It's the median of your ${nMonths} recorded months: an expensive month isn't the typical one, and this math knows it.`)
        : L(c.lang, `Con lo que ganas, medido, no alcanza: tu ingreso típico es ${c.money(typicalIn)} al mes y tu gasto típico ${c.money(typicalOut)} — el gasto pasa del ingreso por ${c.money(-diff)} en el mes típico. No es un mes malo suelto: es la mediana de tus ${nMonths} meses anotados.`, `On what's measured, what you earn doesn't cover it: your typical income is ${c.money(typicalIn)} a month and your typical spending ${c.money(typicalOut)} — spending passes income by ${c.money(-diff)} in the typical month. It's not one bad month: it's the median of your ${nMonths} recorded months.`),
      pieces: [{ label: L(c.lang, "Ingreso típico al mes", "Typical monthly income"), minor: typicalIn }, { label: L(c.lang, "Gasto típico al mes", "Typical monthly spend"), minor: typicalOut }, { label: L(c.lang, "La diferencia", "The difference"), minor: diff }],
      note: null, source: ["asesor.lectura", "historial.stream"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }

  /* LAS PROPORCIONES: «¿qué parte de lo que gano se va en X?» — la
   * parte se dice en su porcentaje Y en frecuencia natural. */
  const parteVoice = /(que (porcentaje|parte|fraccion)|cuanto por ciento|que porciento|what (percentage|share|fraction)|how much of (my|mi))/.test(folded)
    && /(gano|sueldo|salario|ingreso|income|salary|paycheck|earn)/.test(folded);
  if (parteVoice) {
    const filter = filterOf(c, folded) ?? synonymFilter();
    if (!filter) {
      const stray = strayFilterWord(c, folded, new Set(["gano", "ganas", "sueldo", "salario", "ingreso", "ingresos", "parte", "porcentaje", "income", "salary", "paycheck", "earn", "earnings"]));
      if (stray) {
        return { kind: "answer", family: "promedio", verdict: L(c.lang, `De «${stray}» no tengo nada anotado en tu libro, así que su parte de lo que ganas es cero — no por poco, sino porque no aparece: si lo pagas con otro nombre, ese nombre es el que hay que mirar.`, `I have nothing recorded as "${stray}" in your book, so its share of what you earn is zero — not because it's small, but because it never appears: if you pay it under another name, that name is the one to look at.`), pieces: [], note: null, source: ["libros.lineas"], lines: 0 };
      }
      return null;
    }
    const m = monthlyAvgSpend(c, filter);
    if (m.lines === 0) {
      /* El nombre resolvió a un ciudadano sin líneas (un sub vacío,
       * o el nombre en el otro idioma): la parte medida es cero y
       * se dice como ausencia, no como porcentaje vacío. */
      return { kind: "answer", family: "promedio", verdict: L(c.lang, `Bajo ese nombre no se mueve dinero en tu libro: no trae gasto anotado en los meses que miro, así que su parte de lo que ganas, medida, es 0% — no porque sea poco, sino porque ahí no hay nada anotado. Si lo pagas con otro nombre, ese es el nombre que hay que mirar.`, `No money moves under that name in your book: it carries no recorded spending in the months I can see, so its measured share of what you earn is 0% — not because it's small, but because there's nothing recorded there. If you pay it under another name, that's the name to look at.`), pieces: [{ label: L(c.lang, "Ingreso típico al mes", "Typical monthly income"), minor: typicalIn }], note: null, source: ["libros.lineas", "asesor.lectura"], lines: 0 };
    }
    if (typicalIn <= 0) {
      return { kind: "answer", family: "promedio", verdict: L(c.lang, `Eso suma ${c.money(m.avg)} al mes en promedio, pero tu libro no trae un ingreso medido con qué compararlo: sin ingreso anotado, la parte de lo que ganas no tiene denominador — y sin denominador no hay porcentaje honesto.`, `That adds up to ${c.money(m.avg)} a month on average, but your book carries no measured income to compare it with: with no recorded income, the share of what you earn has no denominator — and without a denominator there's no honest percentage.`), pieces: [{ label: L(c.lang, "Eso, al mes", "That, a month"), minor: m.avg }], note: null, source: ["historial.stream", "asesor.lectura"], lines: m.lines };
    }
    const pct = Math.round((m.avg / typicalIn) * 1000) / 10;
    const per100 = Math.round((m.avg / typicalIn) * 100);
    const name = labelFor(filter);
    return {
      kind: "answer", family: "promedio",
      verdict: L(c.lang, `En ${name} se va el ${pct}% de lo que ganas: de cada $100 que entran, $${per100} van a ${name}. Son ${c.money(m.avg)} al mes en promedio, contra un ingreso típico de ${c.money(typicalIn)} — medido sobre tus ${nMonths} meses anotados.`, `${name} takes ${pct}% of what you earn: of every $100 that comes in, $${per100} go to ${name}. That's ${c.money(m.avg)} a month on average, against a typical income of ${c.money(typicalIn)} — measured over your ${nMonths} recorded months.`),
      pieces: [{ label: L(c.lang, `${name}, al mes`, `${name}, a month`), minor: m.avg }, { label: L(c.lang, "Ingreso típico al mes", "Typical monthly income"), minor: typicalIn }],
      note: null, source: ["historial.stream", "asesor.lectura"], lines: m.lines,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }

  /* ¿CUÁNTO ME CUESTA X / CUÁNTO GASTAMOS EN X AL MES?: el promedio
   * mensual de ese ciudadano, medido — la puerta del promedio no oía
   * «cuesta» ni «gastamos». */
  const cuestaVoice = /(cuanto (me |nos |se )?(cuesta|cuestan)|cuanto gastamos en|cuanto gasto en|cuanto se (me |nos )?va en|how much does .{1,30} cost|how much do (we|i) spend on)/.test(folded)
    && /(al mes|por mes|mensual|per month|monthly|a month)/.test(folded);
  if (cuestaVoice) {
    const filter = filterOf(c, folded) ?? synonymFilter();
    if (!filter) {
      const nm = folded.match(/(?:cuesta|cuestan|cost)\s+(?:el |la |los |las |un |una |the |a |an )?([a-záéíóúñ]{3,})/);
      const word = nm && !STRAY_STOP.has(nm[1]) ? nm[1] : strayFilterWord(c, folded);
      if (word) {
        return { kind: "answer", family: "promedio", verdict: L(c.lang, `De «${word}» no tengo nada anotado en tu libro: su costo al mes, con lo anotado, es $0.00 — no porque cueste nada, sino porque no aparece. Si lo pagas con otro nombre, dime el nombre y lo mido.`, `I have nothing recorded as "${word}" in your book: its monthly cost, on what's recorded, is $0.00 — not because it costs nothing, but because it never appears. If you pay it under another name, tell me the name and I'll measure it.`), pieces: [], note: null, source: ["libros.lineas"], lines: 0 };
      }
      return null;
    }
    const m = monthlyAvgSpend(c, filter);
    const name = labelFor(filter);
    if (m.lines === 0) {
      return { kind: "answer", family: "promedio", verdict: L(c.lang, `${name} está en tu estructura, pero no trae gasto anotado en los meses que miro: su costo medido es $0.00 al mes.`, `${name} is in your structure, but it carries no recorded spending in the months I can see: its measured cost is $0.00 a month.`), pieces: [], note: null, source: ["libros.lineas"], lines: 0 };
    }
    const thisMonth = (c.state.months[c.key]?.lines ?? []).filter((l) => l.active && isOut(l) && roleOf(c.state, l.categoryId) !== "savings" && filter(l)).reduce((a, l) => a + view(c, l), 0);
    return {
      kind: "answer", family: "promedio",
      verdict: L(c.lang, `${name} te cuesta ${c.money(m.avg)} al mes en promedio — medido sobre ${m.months} mes${m.months === 1 ? "" : "es"} anotados, no solo este. Este mes van ${c.money(thisMonth)}.`, `${name} costs you ${c.money(m.avg)} a month on average — measured over ${m.months} recorded month${m.months === 1 ? "" : "s"}, not just this one. This month it's at ${c.money(thisMonth)}.`),
      pieces: [{ label: L(c.lang, `${name}, al mes`, `${name}, a month`), minor: m.avg }, { label: L(c.lang, "Este mes", "This month"), minor: thisMonth }],
      note: null, source: ["historial.stream"], lines: m.lines,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }

  /* EL COSTO DE VIVIR: el mes típico entero, con lo esencial
   * separado de lo que se mueve. */
  if (/(cuanto necesito (al mes |para vivir|mensual)|necesito para vivir|cuanto (me )?cuesta vivir|costo de vida|cuanto necesito al mes|how much do i need (to live|for living|per month)|what does it cost (me )?to live|need to live on|cost of living)/.test(folded)) {
    if (typicalOut <= 0) {
      return { kind: "answer", family: "promedio", verdict: L(c.lang, `No puedo medirlo: tu libro no trae gasto anotado en los meses que miro, y el costo de vivir se mide de lo que gastas — no se importa de ninguna tabla.`, `I can't measure it: your book carries no recorded spending in the months I can see, and the cost of living is measured from what you spend — it's not imported from any table.`), pieces: [], note: null, source: ["historial.stream"], lines: 0 };
    }
    const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const monthsGoal = c.state.settings.emergencyMonths || 3;
    const essential = monthsGoal > 0 ? Math.min(typicalOut, Math.round(reading.cushionMinor / monthsGoal)) : 0;
    const rest = typicalOut - essential;
    const diff = typicalIn - typicalOut;
    return {
      kind: "answer", family: "promedio",
      verdict: L(c.lang, `Vivir te cuesta ${c.money(typicalOut)} al mes — tu mes típico de gasto, la mediana de tus ${nMonths} meses anotados. De eso, lo esencial — lo que no se puede apagar — suma ${c.money(essential)}; los otros ${c.money(rest)} son lo que se mueve mes a mes.${typicalIn > 0 ? (diff >= 0 ? ` Tu ingreso típico es ${c.money(typicalIn)}: vivir te deja ${c.money(diff)} libres en el mes típico.` : ` Tu ingreso típico es ${c.money(typicalIn)}: vivir pasa de él por ${c.money(-diff)} en el mes típico.`) : ""}`, `Living costs you ${c.money(typicalOut)} a month — your typical spending month, the median of your ${nMonths} recorded months. Of that, the essentials — what can't be switched off — add up to ${c.money(essential)}; the other ${c.money(rest)} are what moves month to month.${typicalIn > 0 ? (diff >= 0 ? ` Your typical income is ${c.money(typicalIn)}: living leaves you ${c.money(diff)} free in the typical month.` : ` Your typical income is ${c.money(typicalIn)}: living passes it by ${c.money(-diff)} in the typical month.`) : ""}`),
      pieces: [{ label: L(c.lang, "Tu mes típico", "Your typical month"), minor: typicalOut }, { label: L(c.lang, "Lo esencial", "The essentials"), minor: essential }, ...(rest > 0 ? [{ label: L(c.lang, "Lo que se mueve", "What moves"), minor: rest }] : []), ...(typicalIn > 0 ? [{ label: L(c.lang, "Ingreso típico", "Typical income"), minor: typicalIn }] : [])],
      note: L(c.lang, "Lo esencial es la misma medida de tu colchón: el gasto que no se puede apagar, medido de tu libro — no una tabla de afuera.", "The essentials are the same measure as your cushion: the spending that can't be switched off, measured from your book — not an outside table."),
      source: ["asesor.lectura", "historial.stream"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
    };
  }
  return null;
}


function promedioAnswer(c: Ctx, folded: string): BankResult | null {
  const day = Number(c.today.slice(8, 10));
  const daysIn = new Date(Number(c.key.slice(0, 4)), Number(c.key.slice(5, 7)), 0).getDate();
  // OLA 25 (la caza de lo obvio): la forma desnuda «¿cuánto puedo
  // gastar?» — sin «hoy» — recibía need-amount del delegado: el
  // usuario pide LA cifra y el sistema le pedía una cifra. Sin
  // período nombrado, «puedo gastar» se lee como hoy (la lectura
  // natural); con período nombrado que no es hoy, esta rama calla.
  // Los gustos quedan fuera: su familia los atiende.
  if (/(lo mas que puedo gastar|cuanto puedo gastar|puedo gastar hoy|how much can i spend today|how much can i spend|tengo dinero para hoy|dinero para hoy)/.test(folded)
    && !/(gustos|antojos|capricho|treats)/.test(folded)
    && !(!/hoy|today/.test(folded) && /(al mes|este mes|al ano|esta semana|por semana|this month|this week)/.test(folded))) {
    const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
    const leftDays = Math.max(1, daysIn - day + 1);
    const per = reading.left > 0 ? Math.floor(reading.left / leftDays) : 0;
    return {
      kind: "answer", family: "promedio",
      // OLA 26 (U1, en la misma expresión): con la queda en negativo,
      // «hasta $0» sin causa era la cifra muda — el cero se traduce:
      // el mes ya salió por encima de lo que entró, y por eso no hay
      // margen hoy.
      verdict: reading.left < 0
        ? L(c.lang, `Hoy no hay margen: este mes ya salió ${c.money(-reading.left)} más de lo que entró, así que tu ritmo seguro de hoy es $0 — no es un castigo, es la resta del mes tal como va.`, `Today there's no room: this month ${c.money(-reading.left)} more has gone out than came in, so your safe pace today is $0 — it's not a punishment, it's the month's subtraction as it stands.`)
        : L(c.lang, `Hoy puedes gastar hasta ${c.money(per)} sin pasarte: es lo que te queda del mes (${c.money(Math.max(0, reading.left))}) repartido entre los ${leftDays} días que quedan, hoy incluido.`, `Today you can spend up to ${c.money(per)} without going over: it's what's left of your month (${c.money(Math.max(0, reading.left))}) spread over the ${leftDays} days remaining, today included.`),
      pieces: [{ label: L(c.lang, "Queda del mes", "Left this month"), minor: Math.max(0, reading.left) }, { label: L(c.lang, "Por día, desde hoy", "Per day, from today"), minor: per }],
      note: L(c.lang, "El supuesto, dicho: lo que queda se reparte parejo; un día de gasto fuerte pide días más ligeros después.", "The assumption, stated: what's left is spread evenly; a heavy day asks for lighter days after."),
      graph: [{
        id: "ritmo", label: L(c.lang, "Tu ritmo seguro de hoy", "Your safe pace today"), minor: per, tense: "proyectado", flow: "flujo", currency: c.display, unit: L(c.lang, "al día", "a day"),
        assumption: { text: L(c.lang, "lo que queda se reparte parejo entre los días que quedan", "what's left is spread evenly over the remaining days"), origin: "regla" },
        children: [
          { id: "queda", label: L(c.lang, "Queda del mes", "Left this month"), minor: Math.max(0, reading.left), tense: "stock", flow: "stock", currency: c.display, sign: 1 },
        ],
      }],
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
  const whereGoes = /(en que se me va|a donde (se )?va mi dinero|en que gasto mas|where does my money go|what do i spend (the )?most|en que se me (esta|va) (yendo|escapando)|se me esta yendo el dinero|where is my money going|where'?s my money going)/.test(folded);
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
        ? L(c.lang, `Tienes ${subs.length} suscripci${subs.length === 1 ? "ón anotada" : "ones anotadas"}: ${subs.map((s) => `«${s.concept}» (${c.money(view(c, s))}${s.nextDue ? `, vence el ${fmtFecha(c, s.nextDue)}` : ""})`).join(", ")}.`, `You have ${subs.length} recorded subscription${subs.length === 1 ? "" : "s"}: ${subs.map((s) => `"${s.concept}" (${c.money(view(c, s))}${s.nextDue ? `, due ${fmtFecha(c, s.nextDue)}` : ""})`).join(", ")}.`)
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
      verdict: L(c.lang, `Tu gasto más frecuente es «${top[0]}»: ${top[1].n} ${top[1].n === 1 ? "vez anotada" : "veces anotadas"}, por ${c.money(top[1].total)} en total. Frecuente no es lo mismo que grande: es lo que más se repite.`, `Your most frequent spend is "${top[0]}": recorded ${top[1].n} ${top[1].n === 1 ? "time" : "times"}, for ${c.money(top[1].total)} in total. Frequent isn't the same as big: it's what repeats the most.`),
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
  // OLA 22: la rama de subidas que vivía aquí (primer mes contra
  // último) se RETIRA — la medida nueva vive en seriesAnswer, que la
  // cascada sirve antes (paso 4b2): el último cobro contra la MEDIANA
  // de la propia serie, cercado por su variación.
  const filter = filterOf(c, folded);
  if (!filter) {
    // OLA 26 (U5): «¿cuántas veces fui al súper?» callaba — la palabra
    // no resuelve a ningún ciudadano y la frecuencia se iba en
    // silencio, donde historia nombra la ausencia. Con forma de
    // frecuencia y palabra suelta, la ausencia se nombra aquí también.
    if (/(cuantas veces| cada cuanto|con que frecuencia|how many times|how often)/.test(folded)) {
      const stray = strayFilterWord(c, folded);
      if (stray) {
        return {
          kind: "answer", family: "frecuencia",
          verdict: L(c.lang, `No tengo nada anotado como «${stray}»: sin líneas con ese nombre no hay veces que contar. Si lo anotas con otro nombre, pregúntame por ese.`, `I have nothing recorded as "${stray}": with no lines under that name there are no times to count. If you record it under another name, ask me by that one.`),
          pieces: [], note: null, source: ["libros.lineas"], lines: 0,
        };
      }
    }
    return null;
  }
  if (/(cuantas veces|how many times)/.test(folded)) {
    const p = periodOf(c, folded);
    const pool = allLines(c).filter((l) => inPeriod(c, l, p) && isOut(l) && filter(l));
    const total = pool.reduce((a, l) => a + view(c, l), 0);
    // OLA 50 (la Caza III): la concordancia («fue 1 vez», no «fueron
    // 1 veces» — el generador la cazó) y la doctrina de las piezas:
    // minor es DINERO; un conteo jamás viaja como pieza, porque la
    // pieza se lee en moneda («Veces: $0.01» era una cifra falsa con
    // cara de dato). El conteo vive en el veredicto, en palabras.
    return {
      kind: "answer", family: "frecuencia",
      verdict: L(c.lang, `En ${p.label} ${pool.length === 1 ? "fue 1 vez" : `fueron ${pool.length} veces`}, por ${c.money(total)} en total.`, `In ${p.label} it was ${pool.length} ${pool.length === 1 ? "time" : "times"}, for ${c.money(total)} in total.`),
      pieces: [{ label: L(c.lang, "En total", "In total"), minor: total }],
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
      verdict: L(c.lang, `Vas cada ${gap} días, en promedio: ${dates.length} veces entre el ${fmtFecha(c, dates[0])} y el ${fmtFecha(c, dates[dates.length - 1])}.`, `You go every ${gap} days on average: ${dates.length} times between ${fmtFecha(c, dates[0])} and ${fmtFecha(c, dates[dates.length - 1])}.`),
      // OLA 50: sin piezas — los días y las veces no son dinero y
      // minor solo lleva dinero; las cifras de esta respuesta viven
      // en el veredicto, en palabras.
      pieces: [],
      note: L(c.lang, "La cadencia se mide de tus fechas reales, no de un plan: si un mes vas más, la media se mueve.", "The cadence is measured from your real dates, not a plan: go more one month and the mean moves."),
      source: ["libros.lineas"], lines: dates.length,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* OLA 22 · LAS SERIES RECURRENTES (los algoritmos publicados de      */
/* detección de recurrentes de fin-infra y BankSync): la serie como    */
/* objeto — las líneas de suscripción agrupadas por su ciudadano       */
/* (subId, o el concepto), con sus cobros ordenados y su línea del     */
/* mes en curso. Tres preguntas sobre el objeto: la subida medida      */
/* contra la MEDIANA de la propia serie, la cuota que no llegó (la     */
/* ausencia EN EL LIBRO, jamás una afirmación sobre la compañía) y el  */
/* costo anualizado con su ritmo dicho.                                */
/* ------------------------------------------------------------------ */
type RecurringSeries = { name: string; points: Array<{ date: string; minor: number }>; current: Line | null };
function seriesOf(c: Ctx): RecurringSeries[] {
  const byKey = new Map<string, RecurringSeries>();
  for (const l of allLines(c)) {
    if (!l.active || l.kind !== "subscription") continue;
    const k = l.subId || foldQ(l.concept);
    const s = byKey.get(k) ?? { name: l.concept, points: [], current: null };
    s.points.push({ date: lineDate(l), minor: view(c, l) });
    if (l.monthKey === c.key) s.current = l;
    byKey.set(k, s);
  }
  for (const s of byKey.values()) s.points.sort((a, b) => a.date.localeCompare(b.date));
  return [...byKey.values()];
}
const medianOf = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[Math.floor(s.length / 2)] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};

function seriesAnswer(c: Ctx, folded: string): BankResult | null {
  const series = seriesOf(c);
  // LA SUBIDA, medida contra la propia serie.
  if (/(ha subido|subieron|han subido|price (increase|went up|raise)|prices went up|went up|go up|gone up|going up)/.test(folded)
    || (/(subio|aumento|encareci)/.test(folded) && /(suscripcion|precio|cuota)/.test(folded))) {
    const rises: Array<{ name: string; from: number; to: number; pts: Array<{ date: string; minor: number }> }> = [];
    for (const s of series) {
      if (s.points.length < 2) continue;
      const prev = s.points.slice(0, -1).map((p) => p.minor);
      const med = medianOf(prev);
      const noise = prev.reduce((a, v) => Math.max(a, Math.abs(v - med)), 0);
      const last = s.points[s.points.length - 1].minor;
      if (last > med && last - med > noise) rises.push({ name: s.name, from: med, to: last, pts: s.points });
    }
    return {
      kind: "answer", family: "series",
      verdict: rises.length
        ? L(c.lang, `Sí: ${rises.map((r) => `«${r.name}» subió — su monto típico era ${c.money(r.from)} y el último cobro es ${c.money(r.to)}.`).join(" ")}`, `Yes: ${rises.map((r) => `"${r.name}" went up — its typical amount was ${c.money(r.from)} and the latest charge is ${c.money(r.to)}.`).join(" ")}`)
        : L(c.lang, "Ninguna suscripción anotada subió por encima de su propia variación: los últimos cobros están en su monto típico.", "No recorded subscription rose above its own variation: the latest charges sit at their typical amount."),
      pieces: rises.map((r) => ({ label: r.name, minor: r.to })),
      note: L(c.lang, "La medida: el último cobro contra la MEDIANA de los anteriores, y solo llamo subida a lo que supera la variación que la propia serie ya mostraba — una serie que siempre baila no acusa por bailar.", "The measure: the latest charge against the MEDIAN of the previous ones, and I only call it a rise when it beats the variation the series itself already showed — a series that always dances doesn't get accused for dancing."),
      source: ["libros.lineas", "cobros.cuotas"], lines: 0,
      actions: reportDoor(c, "cobros.cuotas", "Verlo en Cobros", "See it in Payments"),
      ...(rises.length === 1
        ? {
            figure: {
              kind: "camino" as const,
              points: rises[0].pts.map((p) => ({ label: fmtFecha(c, p.date), minor: p.minor })),
              band: { floor: 0, median: rises[0].from, total: rises[0].to },
              note: null,
            },
          }
        : {}),
    };
  }
  // LA CUOTA QUE NO LLEGÓ: la fecha pasó y no hay cobro nuevo anotado.
  if (/(no se (cobro|cargo)|no (llego|vino) (el|mi|un|ningun)|que (suscripcion|pago|cuota) no|falta (un|algun) (pago|cobro)|no me cobraron|sin cobrar|missed|didn'?t (charge|come through))/.test(folded)) {
    const missed = series.filter((s) => s.current?.nextDue && s.current.nextDue < c.today)
      .map((s) => ({ name: s.name, due: s.current!.nextDue as string, days: daysBetween(s.current!.nextDue as string, c.today), minor: view(c, s.current!) }));
    return {
      kind: "answer", family: "series",
      verdict: missed.length
        ? L(c.lang, `Hay ${missed.length} cuota${missed.length === 1 ? "" : "s"} cuya fecha ya pasó sin cobro nuevo anotado: ${missed.map((m) => `«${m.name}» — vencía el ${m.due}, hace ${m.days} día${m.days === 1 ? "" : "s"}, por ${c.money(m.minor)}`).join("; ")}.`, `There ${missed.length === 1 ? "is 1 due charge" : `are ${missed.length} due charges`} whose date passed with no new charge recorded: ${missed.map((m) => `"${m.name}" — due ${m.due}, ${m.days} day${m.days === 1 ? "" : "s"} ago, for ${c.money(m.minor)}`).join("; ")}.`)
        : L(c.lang, "Nada falta por cobrarse hasta hoy: toda suscripción con fecha pasada tiene su cobro anotado o su fecha sigue adelante.", "Nothing is missing up to today: every subscription with a past date has its charge recorded or its date still ahead."),
      pieces: missed.map((m) => ({ label: m.name, minor: m.minor })),
      note: L(c.lang, "Reporto la ausencia en TU libro — que no haya un cobro anotado; si la compañía cobró y no lo anotaste, anótalo y la ausencia se cierra.", "I'm reporting the absence in YOUR book — that no charge is recorded; if the company did charge and you didn't record it, record it and the absence closes."),
      source: ["cobros.cuotas"], lines: missed.length,
      actions: reportDoor(c, "cobros.cuotas", "Verlo en Cobros", "See it in Payments"),
    };
  }
  // EL COSTO ANUALIZADO: cada serie por su ritmo, y el conjunto.
  if (/(al ano|por ano|anual|a year|per year|yearly|annual)/.test(folded) && /(suscripcion|cuesta|cuestan|pago|pagar|sale|salen|cost)/.test(folded)) {
    const factor = (l: Line): number => /ano|year/.test(l.cadence ?? "") ? 1 : /semana|week/.test(l.cadence ?? "") ? 52 : /quincena/.test(l.cadence ?? "") ? 24 : 12;
    const filter = filterOf(c, folded);
    const rows = series.filter((s) => s.current && (!filter || filter(s.current)))
      .map((s) => ({ name: s.name, monthly: view(c, s.current!), annual: view(c, s.current!) * factor(s.current!) }));
    if (!rows.length) return null;
    const total = rows.reduce((a, r) => a + r.annual, 0);
    return {
      kind: "answer", family: "series",
      verdict: rows.length === 1
        ? L(c.lang, `«${rows[0].name}» te cuesta ${c.money(rows[0].monthly)} al mes: al año son ${c.money(rows[0].annual)}.`, `"${rows[0].name}" costs you ${c.money(rows[0].monthly)} a month: over a year that's ${c.money(rows[0].annual)}.`)
        : L(c.lang, `Tus suscripciones suman ${c.money(total)} al año: ${rows.map((r) => `«${r.name}» ${c.money(r.annual)}`).join(" · ")}.`, `Your subscriptions add up to ${c.money(total)} a year: ${rows.map((r) => `"${r.name}" ${c.money(r.annual)}`).join(" · ")}.`),
      pieces: rows.map((r) => ({ label: r.name, minor: r.annual })),
      note: L(c.lang, "El año se calcula del monto actual por el ritmo de cada línea (mensual si la línea no dice otro); si una sube, el año se mueve con ella.", "The year is computed from the current amount at each line's own pace (monthly when the line says no other); if one rises, the year moves with it."),
      source: ["cobros.cuotas", "libros.lineas"], lines: rows.length,
      actions: reportDoor(c, "cobros.cuotas", "Verlo en Cobros", "See it in Payments"),
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
    const amounts = amountsIn(raw, c.display);
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
  // OLA 33 (Familia 5, Q33-5): LA PUERTA OYE SU NOMBRE ENTERO — el
  // numeral solo entraba en su forma con espacios («50 30 20») y el
  // nombre solo en español («regla»): las grafías que el mundo
  // escribe — «50/30/20», «50-30-20» y «50·30·20», la que el propio
  // veredicto EN de esta familia imprime («Against the 50·30·20
  // rule…») — morían en unknown en los dos idiomas, y «rule» no
  // estaba en la puerta, así que "How am I doing with the 50/30/20
  // rule?" la servía la familia de otra pregunta sin nombrar la
  // regla. El numeral oye cualquier separador (o ninguno, o
  // espacios) y el nombre oye los dos idiomas.
  // OLA 34 (Familia 8, Q34-8): LA COMA TAMBIÉN ES SEPARADOR —
  // «50,30,20» y «50, 30, 20» (como se escribe una lista de tres
  // números) quedaban fuera de la clase y, sin la palabra «regla»,
  // la pregunta caía en la familia how, que jamás nombra la regla:
  // el daño de Q33-5 con un separador más fuera.
  if (!/(regla|rule|50 ?[/\-·.,]? ?30 ?[/\-·.,]? ?20|necesidades|should go to needs|on needs)/.test(folded)) return null;
  const sum = summarize(c.state, c.key, c.lang);
  if (sum.income <= 0) return { kind: "answer", family: "regla", verdict: L(c.lang, "Este mes no entró ingreso anotado: la regla reparte el ingreso, y sin ingreso no hay reparto que medir.", "No income was recorded this month: the rule splits income, and with no income there's no split to measure."), pieces: [], note: null, source: ["estudio.regla"], lines: 0 };
  const reading = readAdvisor(c.state, c.key, c.lang, c.names, { today: new Date(`${c.today}T12:00:00`) });
  const needs = reading.essentialsMonthly;
  const saved = (c.state.months[c.key]?.lines ?? []).filter((l) => l.active && roleOf(c.state, l.categoryId) === "savings").reduce((a, l) => a + view(c, l), 0);
  const wants = Math.max(0, sum.spend - needs);
  const pct = (n: number) => Math.round((n / sum.income) * 100);
  // 1.3.422: la respuesta mide contra LA GUÍA DEL LIBRO (guideOf) — si el
  // usuario puso la suya, la respuesta la nombra como suya; la clásica
  // conserva su texto de siempre, palabra por palabra.
  const guide = guideOf(c.state.settings);
  // OLA 26 (U2): cada cubo se JUZGA en palabras — la versión anterior
  // reportaba el contraste y solo juzgaba dos cubos, dejando el más
  // ruidoso (el apartado por encima de su número) sin interpretar. En
  // el apartado, por encima juega A FAVOR, y la respuesta lo dice. El
  // juicio mide contra la guía ACTIVA del libro (la de 1.3.422): con
  // la clásica, las palabras son las de la copia, número por número.
  const cap = (p: number, target: number) => p > target
    ? L(c.lang, "por encima de su número", "above its number")
    : p === target
      ? L(c.lang, "justo en su número", "right at its number")
      : L(c.lang, "por debajo de su número", "below its number");
  const savedWord = pct(saved) > guide.save
    ? L(c.lang, "por encima de su número — y en este cubo, por encima juega a tu favor", "above its number — and in this bucket, above plays in your favor")
    : cap(pct(saved), guide.save);
  const judged = L(c.lang, `En palabras: necesidades ${cap(pct(needs), guide.needs)}, gustos ${cap(pct(wants), guide.wants)} y apartado ${savedWord}.`, `In words: needs ${cap(pct(needs), guide.needs)}, wants ${cap(pct(wants), guide.wants)} and set aside ${savedWord}.`);
  return {
    kind: "answer", family: "regla",
    verdict: guide.custom
      ? L(c.lang, `Contra tu guía ${guide.needs}·${guide.wants}·${guide.save}, este mes vas: necesidades ${c.money(needs)} (el ${pct(needs)}%, tu guía dice ${guide.needs}%), gustos ${c.money(wants)} (el ${pct(wants)}%, dice ${guide.wants}%) y apartado ${c.money(saved)} (el ${pct(saved)}%, dice ${guide.save}%). ${judged}`, `Against your ${guide.needs}·${guide.wants}·${guide.save} guide, this month you're at: needs ${c.money(needs)} (${pct(needs)}%, your guide says ${guide.needs}%), wants ${c.money(wants)} (${pct(wants)}%, it says ${guide.wants}%) and set aside ${c.money(saved)} (${pct(saved)}%, it says ${guide.save}%). ${judged}`)
      : L(c.lang, `Contra la regla 50·30·20, este mes vas: necesidades ${c.money(needs)} (el ${pct(needs)}%, la regla dice 50%), gustos ${c.money(wants)} (el ${pct(wants)}%, dice 30%) y apartado ${c.money(saved)} (el ${pct(saved)}%, dice 20%). ${judged}`, `Against the 50·30·20 rule, this month you're at: needs ${c.money(needs)} (${pct(needs)}%, the rule says 50%), wants ${c.money(wants)} (${pct(wants)}%, it says 30%) and set aside ${c.money(saved)} (${pct(saved)}%, it says 20%). ${judged}`),
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
  // OLA 28 (Familia 2, E28-2): «¿en cuál / which … más / most?» no
  // es una deuda plana: es el RANKING de las deudas, y esta familia
  // cedía su total («debes $X en total») a una pregunta que pedía
  // CUÁL. Con el superlativo y su objeto, la familia calla y el
  // paso 7 sirve la suya.
  if (/(cual|which|what)\b[^?]{0,24}(cuenta|tarjeta|account|card)/.test(folded) && /(mas|most)/.test(folded)) return null;
  const owed = peopleOf(c.state, "owed", c.today); // ellos me deben
  const owe = peopleOf(c.state, "owe", c.today);   // yo les debo
  // OLA 20 (el instrumento cazó el disfraz): «no quiero saber cuánto
  // debo, quiero saber cuánto me deben» respondía el lado RECHAZADO
  // («No debes nada») porque la rama «cuanto debo» disparaba primero.
  // Con marca de contraste, manda el lado de la cláusula afirmativa:
  // el marcador que aparece ÚLTIMO. Sin marca, el orden de siempre.
  if (/(no quiero|no me importa|no necesito|quiero saber|en vez de|mejor dime|instead|i don'?t want|don'?t tell me)/.test(folded)) {
    const owedPos = Math.max(folded.lastIndexOf("me deben"), folded.lastIndexOf("me debe"));
    const owePos = Math.max(folded.lastIndexOf("cuanto debo"), folded.lastIndexOf("le debo"), folded.lastIndexOf("debo a"), folded.lastIndexOf("cuanto le debo"));
    if (owedPos >= 0 && owedPos > owePos) {
      if (!owed.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, "Nadie te debe nada anotado: no hay préstamos dados vivos.", "Nobody owes you anything recorded: there are no live loans given."), pieces: [], note: null, source: ["cobros.mideben"], lines: 0 };
      return { kind: "answer", family: "deudas", verdict: L(c.lang, `Te deben ${owed.length} persona${owed.length === 1 ? "" : "s"}: en total ${c.money(owed.reduce((a, p) => a + p.left, 0))}. El mayor: ${owed[0].name}, ${c.money(owed[0].left)}.`, `${owed.length} ${owed.length === 1 ? "person owes" : "people owe"} you: ${c.money(owed.reduce((a, p) => a + p.left, 0))} in total. The biggest: ${owed[0].name}, ${c.money(owed[0].left)}.`), pieces: owed.slice(0, 4).map((p) => ({ label: p.name, minor: p.left })), note: null, source: ["cobros.mideben"], lines: owed.reduce((a, p) => a + p.active, 0) };
    }
  }
  const findIn = (rows: typeof owed) => rows.find((p) => {
    const f = foldQ(p.name);
    return f.length >= 3 && (folded.includes(f) || f.split(/\s+/).some((w) => w.length >= 4 && folded.includes(w)));
  });
  // «¿Cuánto me debe X?» / «¿cuánto le debo a X?» — con la contradicción
  // de dirección: si el nombre vive en el lado contrario, se dice.
  // OLA 28 (Familia 2, E28-2): «owes?» — «How much does Carlos owe
  // me?» trae el verbo sin la s («does … owe») y la rama solo oía la
  // forma con s: la dirección de la deuda se juzga con las dos.
  if (/(me debe|debe a mi|owes? me)/.test(folded)) {
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
    /* OLA 44 (D1): también los saldos de líneas de deuda. */
    const lineCardsOwe = lineDebtLines(c.state, c.today).map((line) => ({ name: line.concept || "Créditos", bal: convertMinor(line.balanceMinor as number, line.balanceCurrency || line.currency, c.display, c.rateE4) })).filter((x) => x.bal > 0);
    const cardsOwe = [...cardsOf(c.state).map((card) => ({ name: card.name, bal: cardFigures(c.state, card, c.today).balance })), ...lineCardsOwe].filter((x) => x.bal > 0);
    if (!owe.length && !cardsOwe.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, "No le debes a nadie anotado: ni préstamos recibidos ni saldos de tarjeta o de líneas de deuda vivos.", "You owe nobody recorded: no live loans taken and no card or debt-line balances."), pieces: [], note: null, source: ["cobros.debo"], lines: 0 };
    /* OLA 44 (D1): personas Y tarjetas en la misma respuesta — la
     * rama vieja devolvía solo las personas cuando había de las
     * dos, y las tarjetas desaparecían de la respuesta. */
    const peoplePart = owe.length ? L(c.lang, `Le debes a ${owe.length} persona${owe.length === 1 ? "" : "s"}: en total ${c.money(owe.reduce((a, p) => a + p.left, 0))}. El mayor: ${owe[0].name}, ${c.money(owe[0].left)}.`, `You owe ${owe.length} ${owe.length === 1 ? "person" : "people"}: ${c.money(owe.reduce((a, p) => a + p.left, 0))} in total. The biggest: ${owe[0].name}, ${c.money(owe[0].left)}.`) : "";
    const cardsPart = cardsOwe.length ? L(c.lang, `En tarjetas y saldos de deuda debes ${c.money(cardsOwe.reduce((a, x) => a + x.bal, 0))}: ${cardsOwe.slice(0, 3).map((x) => `«${x.name}» ${c.money(x.bal)}`).join(", ")}.`, `On cards and debt balances you owe ${c.money(cardsOwe.reduce((a, x) => a + x.bal, 0))}: ${cardsOwe.slice(0, 3).map((x) => `"${x.name}" ${c.money(x.bal)}`).join(", ")}.`) : "";
    return { kind: "answer", family: "deudas", verdict: [peoplePart, cardsPart].filter(Boolean).join(" "), pieces: [...owe.slice(0, 3).map((p) => ({ label: p.name, minor: p.left })), ...cardsOwe.slice(0, 3).map((x) => ({ label: x.name, minor: x.bal }))], note: null, source: ["cobros.debo", "cobros.tarjetas"], lines: owe.reduce((a, p) => a + p.active, 0) };
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
      /* OLA 44 (D1) · LA DEUDA SE CUENTA DE UNA SOLA FUENTE: la
       * rama vieja sumaba personas + tarjetas del registro y no
       * veía ni los préstamos de entidades ni los saldos anotados
       * en líneas de deuda — el mismo libro oía «no debes nada»
       * aquí y «$24 de interés sobre tu tarjeta de $1,200» en la
       * Ola 40. La fuente es netBalance/totalDebt de debts.ts, la
       * que la app misma llama LA única: préstamos recibidos +
       * tarjetas + saldos en líneas, cada parte con su nombre. */
      const nb = netBalance(c.state, c.today);
      const total = nb.owe;
      const parts: string[] = [];
      if (nb.loans > 0) parts.push(L(c.lang, `${c.money(nb.loans)} en préstamos`, `${c.money(nb.loans)} in loans`));
      if (nb.cards > 0) parts.push(L(c.lang, `${c.money(nb.cards)} en tarjetas`, `${c.money(nb.cards)} on cards`));
      if (nb.lines > 0) parts.push(L(c.lang, `${c.money(nb.lines)} en saldos anotados en líneas de deuda`, `${c.money(nb.lines)} in balances recorded on debt lines`));
      const topDebts = planDebts(c.state, c.today).filter((d) => d.left > 0).sort((a, b) => b.left - a.left).slice(0, 4);
      return {
        kind: "answer", family: "deudas",
        verdict: total > 0
          ? L(c.lang, `En total debes ${c.money(total)}: ${parts.join(", ")}.`, `In total you owe ${c.money(total)}: ${parts.join(", ")}.`)
          : L(c.lang, "No debes nada anotado: ni préstamos recibidos, ni saldos de tarjeta, ni saldos anotados en líneas de deuda.", "You owe nothing recorded: no loans taken, no card balances, and no balances recorded on debt lines."),
        pieces: topDebts.map((d) => ({ label: d.name, minor: d.left })),
        note: null, source: ["cobros.debo", "cobros.tarjetas"], lines: owe.reduce((a, p) => a + p.active, 0),
      };
    }
    return null;
  }
  if (/(quien me debe|a quien le preste|who owes me)/.test(folded) && !/(mas|most)/.test(folded)) {
    if (!owed.length) return { kind: "answer", family: "deudas", verdict: L(c.lang, "Nadie te debe nada anotado: no hay préstamos dados vivos.", "Nobody owes you anything recorded: there are no live loans given."), pieces: [], note: null, source: ["cobros.mideben"], lines: 0 };
    return { kind: "answer", family: "deudas", verdict: L(c.lang, `Te deben ${owed.length} persona${owed.length === 1 ? "" : "s"}: en total ${c.money(owed.reduce((a, p) => a + p.left, 0))}. El mayor: ${owed[0].name}, ${c.money(owed[0].left)}.`, `${owed.length} ${owed.length === 1 ? "person owes" : "people owe"} you: ${c.money(owed.reduce((a, p) => a + p.left, 0))} in total. The biggest: ${owed[0].name}, ${c.money(owed[0].left)}.`), pieces: owed.slice(0, 4).map((p) => ({ label: p.name, minor: p.left })), note: null, source: ["cobros.mideben"], lines: owed.reduce((a, p) => a + p.active, 0) };
  }
  /* OLA 46 (F4) · LO QUE ME DEBEN, EN TOTAL Y EN VOZ LLANA: el
   * «quién» vivía y el «cuánto» callaba — la misma familia, la
   * otra mitad de la pregunta. El total es el de netBalance
   * (préstamos dados + las recompensas que el banco te guarda),
   * la fuente única de la Ola 44. */
  if (/(cuanto me deben|cuanto me debe\b|how much am i owed|how much do (they|people) owe me)/.test(folded) && !/(mas|most)/.test(folded)) {
    const nb = netBalance(c.state, c.today);
    if (nb.owed <= 0) return { kind: "answer", family: "deudas", verdict: L(c.lang, "Nadie te debe nada anotado: no hay préstamos dados vivos ni recompensas por cobrar en tu libro.", "Nobody owes you anything recorded: no live loans given and no rewards to collect in your book."), pieces: [], note: null, source: ["cobros.mideben"], lines: 0 };
    const people = owed.filter((p) => p.left > 0);
    const parts: string[] = [];
    if (nb.lent > 0) parts.push(L(c.lang, `${c.money(nb.lent)} en préstamos dados (${people.length} persona${people.length === 1 ? "" : "s"})`, `${c.money(nb.lent)} in loans given (${people.length} ${people.length === 1 ? "person" : "people"})`));
    if (nb.rewards > 0) parts.push(L(c.lang, `${c.money(nb.rewards)} en recompensas que tu banco te guarda`, `${c.money(nb.rewards)} in rewards your bank holds for you`));
    return { kind: "answer", family: "deudas", verdict: L(c.lang, `Te deben ${c.money(nb.owed)} en total: ${parts.join(" y ")}.`, `You are owed ${c.money(nb.owed)} in total: ${parts.join(" and ")}.`), pieces: people.slice(0, 4).map((p) => ({ label: p.name, minor: p.left })), note: null, source: ["cobros.mideben"], lines: owed.reduce((a, p) => a + p.active, 0) };
  }
  return null;
}

function confirmacionAnswer(c: Ctx, folded: string, raw: string): BankResult | null {
  const amounts = amountsIn(raw, c.display);
  const disp = (a: FoundAmount) => convertMinor(a.minor, a.currency, c.display, c.rateE4);
  // (c) La comparación afirmada: «¿Ana me debe más que Carlos?»
  // OLA 28 (Familia 2, E28-2): «owes?» — «Does Ana owe me more than
  // Carlos?» trae el verbo sin la s, como en deudas.
  const cmp = folded.match(/me debe mas que|owes? me more than/);
  if (cmp) {
    const owed = peopleOf(c.state, "owed", c.today);
    // El orden de la afirmación es el orden de MENCIÓN en la pregunta
    // («¿Ana me debe más que Carlos?» afirma Ana > Carlos), no el
    // orden por saldo de peopleOf.
    /* OLA 67: el nombre también se oye deformado («Caros» por
     * Carlos) — la pasada difusa de personNamedIn resuelve en el
     * punto de uso, como en deudas y remesas; el nombre exacto
     * ordena por su mención y el difuso queda detrás. */
    const named = owed.filter((p) => folded.includes(foldQ(p.name)) || personNamedIn(folded, p.name))
      .sort((a, b) => {
        const ia = folded.indexOf(foldQ(a.name)); const ib = folded.indexOf(foldQ(b.name));
        return (ia < 0 ? 9999 : ia) - (ib < 0 ? 9999 : ib);
      });
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
  // OLA 28 (Familia 2, E28-2): la señal oye la «¿» inicial (foldQ la
  // conserva y el ancla ^ la mataba: «¿Gasté 100 en zapatos?» no era
  // afirmación para esta puerta) y las formas inglesas de preguntar
  // lo hecho («Did I spend…?», «Have I paid…?»), que son la misma
  // afirmación con su signo de pregunta.
  const cue = /(verdad|es cierto|es verdad|no es asi|cierto|is it true|is that right|right(\?|\.)?\s*$)/.test(folded)
    || /^¿?(gaste|pague|compre|ahorre|guarde|spent|paid|bought|saved)\b/.test(folded.trim())
    || /\b(did i (spend|pay|buy|save)|have i (spent|paid|bought|saved))\b/.test(folded);
  if (!cue || !amounts.length) return null;
  const claimed = disp(amounts[0]);
  // (a) La afirmación sobre los ahorros: se juzga contra el stock.
  // OLA 28 (Familia 2, E28-2): «saved» entra — «I have 500 saved,
  // right?» afirma sobre el stock y la rama solo oía «savings».
  if (/(ahorr|guardad|apartad|colchon|savings|saved|set aside)/.test(folded)) {
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
  // OLA 28 (Familia 2, E28-2): «spend» entra junto a «spent» — la
  // forma de la pregunta («Did I spend…?») es la afirmación misma.
  if (/(gaste|gasto|pague|compre|spent|spend|paid|bought)/.test(folded)) {
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
      figure: {
        kind: "lado",
        points: [
          { label: L(c.lang, `Este mes al día ${day}`, `This month by day ${day}`), minor: now },
          { label: L(c.lang, `El mes pasado al día ${day}`, `Last month by day ${day}`), minor: then },
        ],
        note: null,
      },
    };
  }
  // (b) EL CIERRE COMPARADO: el cierre proyectado de este mes (al ritmo
  // medido) contra el cierre real del mes pasado — la síntesis pura,
  // con el supuesto dicho: «si el ritmo sigue».
  // El cierre es DEL MES: «¿cuándo termino de PAGAR?» es futuro/deudas
  // y no se toca — la palabra «termino» sin «mes» no basta (la cerca de
  // modos lo cazó al integrar: la síntesis entregaba cifras donde el
  // piso de futuro manda callar).
  // OLA 28 (Familia 2, E28-2): «cerrar» entra en los verbos del
  // cierre — «¿voy a cerrar el mes mejor que el anterior?» es esta
  // síntesis y su verbo no estaba: solo vivía el sustantivo.
  if (/(terminare|termino|acabare|acabo|cierre|cerrar|a fin de mes|fin de mes|como termin|will i end|finish (the|this) month|end of (the|this) month|end up)/.test(folded) && /(mes|month)/.test(folded) && !/(pagar|deuda|deudas|tarjeta|prestamo|loan|debt|pay off)/.test(folded)) {
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
      graph: [
        {
          id: "cierre-proyectado", label: L(c.lang, "El cierre proyectado", "The projected close"), minor: projected, tense: "proyectado", flow: "flujo", currency: c.display,
          assumption: { text: L(c.lang, "si el ritmo medido de estos días sigue hasta fin de mes", "if the measured pace of these days holds to month's end"), origin: "regla" },
          children: [
            { id: "gasto-hasta-hoy", label: L(c.lang, "El gasto hasta hoy", "Spending so far"), minor: soFar, tense: "medido", flow: "flujo", currency: c.display, sign: 1 },
          ],
        },
        { id: "cierre-pasado", label: L(c.lang, "El cierre del mes pasado", "Last month's close"), minor: lastTotal, tense: "medido", flow: "flujo", currency: c.display },
      ],
      source: ["historial.stream", "asesor.lectura"], lines: 0,
      actions: reportDoor(c, "estudio.flujo", "Verlo en Estudio · Flujo", "See it in Study · Flow"),
      figure: {
        kind: "lado",
        points: [
          { label: L(c.lang, "El cierre proyectado", "The projected close"), minor: projected, mark: "premisa" },
          { label: L(c.lang, "El cierre del mes pasado", "Last month's close"), minor: lastTotal },
        ],
        note: L(c.lang, "Si el ritmo medido de estos días sigue hasta fin de mes.", "If the measured pace of these days holds to month's end."),
      },
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
  const amounts = amountsIn(raw, c.display);
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
  // OLA 27 (Familia 7, F27-1): LA COSTURA DEL COMPARTIR QUE CAE. «¿Dónde
  // cae lo que comparto desde otra app?» nombra el objeto entero de
  // inbox.link — lo compartido HACIA Faro y dónde aterriza — y la
  // función es la suya a nivel de patrón, como las precedencias de
  // arriba. El «dónde cae» a secas NO se abre: en el dialecto de la
  // casa, lo que «cae» sin objeto de compartir es un pago, y su
  // pregunta es de calendario («¿qué día cae?»), no de lugar.
  const compartido = /(donde cae lo que comparto|lo que comparto desde|comparto desde otra|lo que me comparten)/.test(folded)
    ? FARO_FUNCTION_MAP.find((x) => x.id === "inbox.link") ?? null
    : null;
  const f = propia ?? proyectado ?? precios ?? compartido ?? functionOfQuestion(folded);
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
 * intacto) — lo que desplazar y estrechar recomputan sobre el marco.
 * OLA 34 (Familia 1): el pool también sabe EXCLUIR — con el
 * predicado del ciudadano excluido, el total, las líneas y el
 * reparto salen NETOS de él, y la suma y el conteo excluidos viajan
 * al lado (exclTotal/exclLines) para que el veredicto los nombre,
 * como historiaAnswer nombra su resta. Sin predicado, la forma es
 * la de siempre, campo por campo. */
function historiaPool(c: Ctx, p: Period, income: boolean, filter: ((l: Line) => boolean) | null, exclFn?: ((l: Line) => boolean) | null): { total: number; lines: number; byCat: Map<string, number>; exclTotal: number; exclLines: number } {
  const poolAll = allLines(c).filter((l) => inPeriod(c, l, p) && (income ? l.kind.startsWith("income") : isOut(l) && roleOf(c.state, l.categoryId) !== "savings") && (!filter || filter(l)));
  const byCat = new Map<string, number>();
  let total = 0;
  let exclTotal = 0;
  let exclLines = 0;
  let lines = 0;
  for (const l of poolAll) {
    const v = view(c, l);
    if (exclFn && exclFn(l)) { exclTotal += v; exclLines++; continue; }
    total += v;
    lines++;
    if (v !== 0) byCat.set(l.categoryId, (byCat.get(l.categoryId) ?? 0) + v);
  }
  return { total, lines, byCat, exclTotal, exclLines };
}

/** El predicado de la exclusión que el marco guarda, reconstruido
 * del ciudadano por su nombre — la misma vara con que el filtro se
 * reconstruye de su descriptor. Si el ciudadano ya no vive en el
 * libro, no hay predicado: la exclusión murió con él. */
function frameExclusionFn(c: Ctx, ex: AskFrameExclusion | null | undefined, pool?: Line[]): ((l: Line) => boolean) | null {
  if (!ex) return null;
  return citizenByName(c.state, c.names, ex.folded, pool)?.fn ?? null;
}

/** La alberca del desempate para la ranura del marco: el período
 * del marco con su dirección, sin filtro — la misma que la puerta
 * fresca le pasa a citizenByName (C35-1). */
function frameTiePool(c: Ctx, f: Extract<AskFrame, { kind: "period1" }>): Line[] {
  return allLines(c).filter((l) => inPeriod(c, l, f.period) && (f.income ? l.kind.startsWith("income") : isOut(l) && roleOf(c.state, l.categoryId) !== "savings"));
}

/** La frase de la resta, en la forma de historiaAnswer: la
 * exclusión aplicada se nombra con su cifra, o no se dice. */
function frameExclText(c: Ctx, ex: AskFrameExclusion | null | undefined, exclTotal: number): string {
  return ex ? L(c.lang, ` Sin contar «${ex.display}» (${c.money(exclTotal)}).`, ` Not counting "${ex.display}" (${c.money(exclTotal)}).`) : "";
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
  const { diffs, ups, downs, lines } = compareDiffs(c, f);
  // OLA 27 (Familia 3, Q27-1): EL TITULAR SALE DE LAS PIEZAS VIVAS,
  // no del marco congelado. El marco guarda los totales del turno en
  // que la comparación nació; si el libro cambia entre turnos, las
  // piezas se recomputan aquí pero el titular salía de `f.totalA -
  // f.totalB` — y la identidad impresa («subidas X − bajadas Y = Z»)
  // era aritméticamente falsa contra sus propias piezas. La diferencia
  // es la suma de las diferencias vivas que compareDiffs ya calculó:
  // subidas − bajadas por construcción, y el cierre cierra exacto.
  // (Desplazar, estrechar y descomponer-historia ya recomputaban: son
  // el control de esta cura.)
  const diff = diffs.reduce((a, x) => a + x.d, 0);
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
  const { diffs, ups, downs, lines } = compareDiffs(c, f);
  // OLA 27 (Familia 3, Q27-1): la misma ley que en descomponerCompare
  // — la diferencia se deriva de las piezas vivas del turno, jamás de
  // los totales congelados del marco; el «no hay diferencia que
  // explicar» de abajo dispara solo cuando los meses son iguales HOY.
  const diff = diffs.reduce((a, x) => a + x.d, 0);
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

function descomponerPeriod(c: Ctx, f: Extract<AskFrame, { kind: "period1" }>, exclF?: { display: string; folded: string; fn: (l: Line) => boolean } | null): BankResult {
  const fn = f.filter ? filterFromDesc(c, f.filter) : null;
  // OLA 34 (Familia 1): el reparto también es neto de la exclusión
  // — la del marco, o la nueva que el seguimiento trae — o la
  // descomposición contaría al ciudadano que la pregunta dejó
  // fuera y la partición no cerraría contra el total del marco.
  const { byCat, lines } = historiaPool(c, f.period, f.income, fn, exclF ? exclF.fn : frameExclusionFn(c, f.exclusion, frameTiePool(c, f)));
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

function desplazarPeriod(c: Ctx, f: Extract<AskFrame, { kind: "period1" }>, exclF?: { display: string; folded: string; fn: (l: Line) => boolean } | null): BankResult | null {
  if (f.period.kind !== "month") return null;
  const nk = prevKey(f.period.key);
  const label = monthNameF(c, nk);
  const period: Period = { kind: "month", key: nk, label };
  const fn = f.filter ? filterFromDesc(c, f.filter) : null;
  // OLA 34 (Familia 1, Q34-1): EL DESPLAZAMIENTO NO PIERDE LA
  // EXCLUSIÓN — la que el seguimiento trae manda (reemplaza a la
  // del marco, como la reescritura fusionada hace por su camino);
  // sin exclusión nueva, la del marco viaja con él. El total sale
  // neto y la resta se nombra: el marco, su horquilla y la cifra
  // cuentan la misma historia.
  const ex: AskFrameExclusion | null = exclF ? { folded: exclF.folded, display: exclF.display } : f.exclusion ?? null;
  const { total, lines, exclTotal } = historiaPool(c, period, f.income, fn, exclF ? exclF.fn : frameExclusionFn(c, f.exclusion, frameTiePool(c, { ...f, period })));
  const nf: AskFrame = { kind: "period1", period, income: f.income, filter: f.filter, total, exclusion: ex };
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `Siguiendo tu pregunta — en ${label} ${f.income ? "entraron" : "gastaste"} ${c.money(total)}${f.filter ? ` en ${f.filter.label}` : ""} — de ${lines} líneas.${frameExclText(c, ex, exclTotal)}`, `Following your question — in ${label} ${f.income ? `${c.money(total)} came in` : `you spent ${c.money(total)}`}${f.filter ? ` on ${f.filter.label}` : ""} — from ${lines} lines.${frameExclText(c, ex, exclTotal)}`),
    pieces: [{ label, minor: total }, ...(ex ? [{ label: L(c.lang, `Fuera de la cuenta: ${ex.display}`, `Left out: ${ex.display}`), minor: -exclTotal }] : [])],
    note: null, source: ["libros.lineas", "historial.stream"], lines, frame: nf,
  };
}

/** OLA 27 (Familia 9, F27-2): ESTRECHAR HACIA UNA PALABRA APRENDIDA.
 * El filtro de la palabra confirmada no tiene descriptor fiel (§20:
 * la partición exacta manda — un descriptor inventado mentiría el
 * pool del marco), así que el estrechamiento se compone como la
 * pregunta completa lo serviría — el mismo predicado que filterHitOf
 * aplica en la cascada — y el marco vuelve INTACTO: la palabra no se
 * puede nombrar en el idioma de descriptores del marco, y fingir un
 * marco estrechado sería perder el marco verdadero. El seguimiento
 * nombra su marco y la palabra del usuario, que ES el nombre de ese
 * ciudadano en su libro. */
function estrecharAprendido(c: Ctx, f: AskFrame, learned: LearnedAlias): BankResult | null {
  // OLA 28 (Familia 4, G28-1): el ciudadano muerto tampoco estrecha —
  // si la subcategoría o categoría del patrón fue borrada en
  // Estructura, el estrechamiento afirmaría el cero de un filtro
  // vacío contra el marco vivo. Devuelve null: el seguimiento cede
  // y la cascada sirve la pregunta fresca, como la persona muerta
  // cae al escaneo en filterHitOf.
  const alive = learned.kind === "sub"
    ? c.state.structure.categories.some((cat) => cat.subs.some((s) => s.id === learned.targetId))
    : c.state.structure.categories.some((cat) => cat.id === learned.targetId);
  if (!alive) return null;
  const fn = learned.kind === "sub" ? (l: Line) => l.subId === learned.targetId : (l: Line) => l.categoryId === learned.targetId;
  const oficial = learned.kind === "sub" ? c.names.sub(learned.targetId) : c.names.cat(learned.targetId);
  if (f.kind === "compare2") {
    const sum = (k: string) => [...spendByCategory(c, k, fn).map.values()].reduce((a, v) => a + v, 0);
    const totalA = sum(f.monthA);
    const totalB = sum(f.monthB);
    return {
      kind: "answer", family: "comparar",
      verdict: L(c.lang, `Siguiendo tu comparación — ${f.labelA} contra ${f.labelB} — solo en «${learned.word}»: ${c.money(totalA)} contra ${c.money(totalB)} (diferencia de ${c.money(Math.abs(totalA - totalB))}).`, `Following your comparison — ${f.labelA} vs ${f.labelB} — only on "${learned.word}": ${c.money(totalA)} vs ${c.money(totalB)} (a difference of ${c.money(Math.abs(totalA - totalB))}).`),
      pieces: [{ label: `${oficial} · ${f.labelA}`, minor: totalA }, { label: `${oficial} · ${f.labelB}`, minor: totalB }],
      note: null, source: ["libros.lineas", "libros.neto"], lines: 0, frame: f,
    };
  }
  // OLA 34 (Familia 1): también neto de la exclusión del marco.
  const { total, lines } = historiaPool(c, f.period, f.income, fn, frameExclusionFn(c, f.exclusion, frameTiePool(c, f)));
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `Siguiendo tu pregunta — en ${f.period.label}, solo en «${learned.word}»: ${c.money(total)}.`, `Following your question — in ${f.period.label}, only on "${learned.word}": ${c.money(total)}.`),
    pieces: [{ label: oficial, minor: total }],
    note: null, source: ["libros.lineas", "historial.stream"], lines, frame: f,
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
  // OLA 34 (Familia 1): el estrechamiento también es neto de la
  // exclusión del marco — su total es el del ámbito nuevo SIN el
  // ciudadano excluido, y la resta se nombra como en las demás
  // caras del marco.
  const { total, lines, exclTotal } = historiaPool(c, f.period, f.income, hit.fn, frameExclusionFn(c, f.exclusion, frameTiePool(c, f)));
  const nf: AskFrame = { ...f, filter: hit.desc, total };
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `Siguiendo tu pregunta — en ${f.period.label}, solo en ${hit.desc.label}: ${c.money(total)}.${frameExclText(c, f.exclusion, exclTotal)}`, `Following your question — in ${f.period.label}, only on ${hit.desc.label}: ${c.money(total)}.${frameExclText(c, f.exclusion, exclTotal)}`),
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
    // OLA 31 (Familia 5, Q31-3 de Cara): LA PROYECCIÓN SERVIDA DEJA
    // SU MARCO — la rama de piso lo devolvía y esta no: la caja
    // reemplaza su marco con el de cada respuesta, así que tras una
    // proyección servida el marco quedaba en null y todo el
    // seguimiento posterior caía fuera del hilo («¿y el mes que
    // viene?» otra vez → «todavía no lo sé»; DESCOMPONER → la
    // lectura sola). El verbo que carga el hilo no lo corta: las
    // dos ramas devuelven el marco, como la ley cercada del
    // veredicto de piso ya cumplía.
    frame: f,
  };
}

const RE_DECOMP_F = /(en que (gaste|se me fue|se fue|gasto)|donde se (me )?fue|cual (fue|es) (el|la|mi) mayor|que fue lo (que )?mas|por categoria|desglos|what did i spend (the )?most|where did (it|my money) go|in what did i spend|by categor)/;
const RE_EXPLAIN_F = /(por que|a que se debe|why|what (caused|made))/;
const RE_SHIFT_F = /(y el mes anterior|y el anterior|el mes anterior|mes antes de ese|el de antes|and the month before|the month before|the one before|^¿?y el mes pasado|^and last month|y el ano pasado|el ano anterior)/;
/** OLA 28 (Familia 2, E28-1): ENSANCHAR — el verbo que «¿Y en total?»
 * nunca tuvo. La tabla del §20 lo nombraba (quitar el filtro: «en
 * total», «todo junto», «sin filtro»…), pero el resolvedor no tenía
 * la rama: la canónica caía del seguimiento a la cascada y moría en
 * silencio. Ensanchar es lo contrario de estrechar: el mismo marco,
 * el mismo período (o la misma comparación), sin el filtro. */
const RE_WIDEN_F = /(en total|in total|todo junto|all together|sin filtro|sin filtrar|quitando el filtro|no filter|en conjunto|en general|overall|el panorama|la foto completa|big picture)/;

function ensanchar(c: Ctx, f: AskFrame): BankResult {
  if (f.kind === "compare2") {
    const totalA = summarize(c.state, f.monthA, c.lang).spend;
    const totalB = summarize(c.state, f.monthB, c.lang).spend;
    const nf: AskFrame = { ...f, filter: null, totalA, totalB };
    const more = totalA >= totalB;
    return {
      kind: "answer", family: "comparar",
      verdict: L(c.lang, `Siguiendo tu comparación — ${f.labelA} contra ${f.labelB}, en total${f.filter ? `, sin quedarnos en ${f.filter.label}` : ""}: gastaste ${more ? "más" : "menos"} en ${more ? f.labelA : f.labelB}: ${c.money(totalA)} contra ${c.money(totalB)} (diferencia de ${c.money(Math.abs(totalA - totalB))}).`, `Following your comparison — ${f.labelA} vs ${f.labelB}, in total${f.filter ? `, not just ${f.filter.label}` : ""}: you spent ${more ? "more" : "less"} in ${more ? f.labelA : f.labelB}: ${c.money(totalA)} vs ${c.money(totalB)} (a difference of ${c.money(Math.abs(totalA - totalB))}).`),
      pieces: [{ label: f.labelA, minor: totalA }, { label: f.labelB, minor: totalB }],
      note: null, source: ["libros.lineas", "libros.neto"], lines: 0, frame: nf,
    };
  }
  // OLA 34 (Familia 1): ensanchar quita el FILTRO, no la exclusión
  // — el total ensanchado sigue neto del ciudadano excluido y la
  // resta se nombra; el marco conserva su exclusión.
  const { total, lines, exclTotal } = historiaPool(c, f.period, f.income, null, frameExclusionFn(c, f.exclusion, frameTiePool(c, f)));
  const nf: AskFrame = { ...f, filter: null, total };
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `Siguiendo tu pregunta — en ${f.period.label}, en total${f.filter ? `, sin quedarnos en ${f.filter.label}` : ""}: ${f.income ? `entraron ${c.money(total)}` : `gastaste ${c.money(total)}`} — de ${lines} líneas.${frameExclText(c, f.exclusion, exclTotal)}`, `Following your question — in ${f.period.label}, in total${f.filter ? `, not just ${f.filter.label}` : ""}: ${f.income ? `${c.money(total)} came in` : `you spent ${c.money(total)}`} — from ${lines} lines.${frameExclText(c, f.exclusion, exclTotal)}`),
    pieces: [{ label: f.period.label, minor: total }],
    note: null, source: ["libros.lineas", "historial.stream"], lines, frame: nf,
  };
}
const RE_PROJECT_F = /(mes que viene|proximo mes|mes siguiente|next month|si sigo asi|sigo asi|seguir asi|keep (going|spending) like this|will i keep)/;
const RE_ANCHOR_F = /(este mes|mes pasado|esta semana|semana pasada|este ano|this month|last month|this week|last week|this year)/;

/** OLA 34 (Familia 1, Q34-1): EXCLUIR SOBRE EL MARCO — el verbo
 * que §20 no tenía. La exclusión es un eje del marco (su ranura,
 * arriba): un seguimiento que trae «sin X» no estrecha A X ni sirve
 * el total bruto — sirve ESTE marco sin ese ciudadano, con la resta
 * nombrada, y el marco nuevo guarda la exclusión que mandó (la
 * nueva reemplaza a la vieja, como en la reescritura). Con
 * ensanchar en la misma frase, el filtro también cae: la exclusión
 * es el eje que manda en ese turno. */
function excluirSeguimiento(c: Ctx, f: Extract<AskFrame, { kind: "period1" }>, excl: { display: string; folded: string; fn: (l: Line) => boolean }, widen: boolean): BankResult {
  const filter = widen ? null : f.filter;
  const fn = filter ? filterFromDesc(c, filter) : null;
  const { total, lines, exclTotal } = historiaPool(c, f.period, f.income, fn, excl.fn);
  const ex: AskFrameExclusion = { folded: excl.folded, display: excl.display };
  const nf: AskFrame = { ...f, filter, total, exclusion: ex };
  return {
    kind: "answer", family: "historia",
    verdict: L(c.lang, `Siguiendo tu pregunta — en ${f.period.label}${filter ? `, en ${filter.label}` : ""} ${f.income ? "entraron" : "gastaste"} ${c.money(total)} — de ${lines} líneas.${frameExclText(c, ex, exclTotal)}`, `Following your question — in ${f.period.label}${filter ? `, on ${filter.label}` : ""} ${f.income ? `${c.money(total)} came in` : `you spent ${c.money(total)}`} — from ${lines} lines.${frameExclText(c, ex, exclTotal)}`),
    pieces: [{ label: f.period.label, minor: total }, { label: L(c.lang, `Fuera de la cuenta: ${excl.display}`, `Left out: ${excl.display}`), minor: -exclTotal }],
    note: lines === 0
      ? L(c.lang, "Ninguna línea cae en ese período con esa exclusión: el cero también es la respuesta del libro.", "No line falls in that period with that exclusion: the zero is the book's answer too.")
      : null,
    source: ["libros.lineas", "historial.stream"], lines, frame: nf,
  };
}

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
  learned?: LearnedAlias[],
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
    // OLA 27 (Familia 9, F27-2): el ctx del seguimiento ya no nace con
    // los patrones vacíos por ley — la caja los enhebra (ask-box pasa
    // los mismos que entrega a la cascada) y estrechar hacia una
    // palabra aprendida compone como la pregunta completa la serviría.
    // Sin el argumento, el comportamiento es el de siempre ([]).
    learned: learned ?? [],
  };
  if (frame) {
    // OLA 35 (G35-2): LA EXCLUSIÓN MUERTA CALLA — la ranura del
    // marco se re-resuelve por nombre en cada turno, y si el
    // ciudadano desapareció del libro entre turnos (un renombre
    // «Casa»→«Hogar»), el predicado muere por diseño pero el texto
    // no: el desplazamiento servía el bruto con la cola «Sin contar
    // «Casa» ($0.00)» y una pieza fantasma en −0, la descomposición
    // no cerraba y la ranura muerta se heredaba y se nombraba hasta
    // sobre un mes vacío. La muerte del predicado puede ser diseño;
    // el silencio de su texto no: aquí el marco se SANA al entrar —
    // sin ciudadano, sin ranura — y cada verbo sirve el total llano
    // sin cola ni pieza ni herencia, como el marco sin exclusión.
    if (frame.kind === "period1" && frame.exclusion) {
      // La muerte se juzga por las LÍNEAS, no por la cáscara del
      // nombre: tras el renombre el nombre puede sobrevivir en la
      // estructura (la categoría «Casa» sin una sola línea suya en
      // todo el libro) y citizenByName lo resuelve a un predicado
      // que no excluye nada en ninguna parte — la misma muerte con
      // mejor disfraz. Vivo es el ciudadano cuyo predicado toca al
      // menos una línea del libro; el resto es cáscara.
      const cz = citizenByName(state, names, frame.exclusion.folded);
      const alive = !!cz && Object.values(state.months).some((m) => m.lines.some((l) => cz.fn(l)));
      if (!alive) {
        // El total del marco también se sana: era neto de un
        // ciudadano que ya no existe; sin la recomposición, la
        // descomposición del período sumaría el bruto vivo contra
        // un total neto muerto y la partición no cerraría. El
        // marco sano cuenta la historia del libro de hoy.
        const pool = historiaPool(c, frame.period, frame.income, frame.filter ? filterFromDesc(c, frame.filter) : null, null);
        frame = { ...frame, exclusion: null, total: pool.total };
      }
    }
    // OLA 34 (Familia 1, Q34-1): LA EXCLUSIÓN QUE EL SEGUIMIENTO
    // TRAE se lee ANTES que cualquier verbo — §20 no consultaba la
    // palabra «sin» en ninguna parte: el desplazamiento servía el
    // total bruto y el estrechamiento convertía «sin la casa» en
    // «solo en Casa», la negación leída como su contrario. Ahora el
    // eje manda: desplaza con el desplazamiento, se sirve con su
    // verbo propio y jamás llega a la puerta de estrechar.
    const exclF = exclusionIn(state, names, folded);
    // Proyectar y desplazar traen su propio ancla: van primero.
    if (RE_PROJECT_F.test(folded) && !(frame.kind === "period1" && frame.income)) return proyectarSeguimiento(c, frame);
    if (RE_SHIFT_F.test(folded)) {
      // OLA 35 (Q35-3): «EL AÑO PASADO» NO ES UN DESPLAZAMIENTO DE
      // MES — RE_SHIFT_F oye «y el ano pasado» y desplazarPeriod
      // desplaza UN MES para todo marco de mes: sobre un marco de
      // octubre servía «el mes pasado» ($80) mientras la puerta
      // fresca sirve 2025 ($500) para las mismas palabras. El §20
      // cede el turno y la reescritura lo cruza por la puerta F5:
      // la respuesta es el año pedido, con su etiqueta verdadera.
      if (frame.kind === "period1" && /(y el ano pasado|el ano anterior)/.test(folded)) return null;
      const r = frame.kind === "compare2" ? desplazarCompare(c, frame) : desplazarPeriod(c, frame, exclF);
      if (r) return r;
    }
    // Explicar solo vive sobre una comparación (L-S3: su lectura
    // principal es la descomposición leída como causa).
    if (frame.kind === "compare2" && RE_EXPLAIN_F.test(folded)) return explicarCompare(c, frame);
    // Una pregunta con su propio ancla de período no es seguimiento:
    // la cascada la sirve fresca (L-S4).
    if (RE_ANCHOR_F.test(folded)) return null;
    // OLA 28 (Familia 2, E28-1): ENSANCHAR va antes que descomponer
    // y que estrechar — «¿Y en total?» no nombra un sujeto nuevo ni
    // pide la descomposición: pide ESTE marco sin su filtro. Con
    // exclusión en la frase manda el verbo de excluir (que también
    // ensancha): ensanchar a secas serviría al ciudadano excluido.
    if (RE_WIDEN_F.test(folded) && !exclF) return ensanchar(c, frame);
    if (RE_DECOMP_F.test(folded)) {
      return frame.kind === "compare2" ? descomponerCompare(c, frame) : descomponerPeriod(c, frame, exclF);
    }
    // OLA 34 (Familia 1): EXCLUIR — el seguimiento que trae «sin X»
    // se sirve sobre el marco, neto y nombrado. Sobre una
    // comparación §20 no computa exclusiones: cede el turno (la
    // cascada y su reparación juzgan), jamás lo estrecha a X.
    if (exclF) {
      if (frame.kind !== "period1") return null;
      return excluirSeguimiento(c, frame, exclF, RE_WIDEN_F.test(folded));
    }
    // Estrechar: nombra un sujeto y no trae ni monto ni ancla propia.
    if (!/cuanto|how much/.test(folded) && (words <= 7 || /^y /.test(folded) || /solo|only/.test(folded))) {
      const hit = filterDescOf(c, folded);
      if (hit && hit.desc.label !== frame.filter?.label) return estrechar(c, frame, hit);
      // OLA 27 (Familia 9, F27-2): la palabra APRENDIDA también
      // estrecha — con los patrones enhebrados en el ctx, el ciudadano
      // confirmado (sub/categoría, como en filterHitOf) estrecha el
      // marco sin descriptor: estrecharAprendido compone la respuesta
      // y el marco sobrevive el turno intacto.
      const learnedHit = aliasIn(c.learned, folded);
      if (learnedHit && (learnedHit.kind === "sub" || learnedHit.kind === "cat")) return estrecharAprendido(c, frame, learnedHit);
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
/* ------------------------------------------------------------------ */
/* OLA 19 · EL MARCO QUE QUEDA (GUS, Bobrow et al. 1977; Frames, El   */
/* Asri et al. 2017; la taxonomía 5IDER de reescrituras). En canon el  */
/* nombre AskFrame ya lo lleva el marco del seguimiento §20, así que   */
/* este marco conversacional se llama ConvoFrame: cada respuesta del   */
/* banco nace con él — la pregunta plegada que la produjo, su familia, */
/* sus ejes detectados (período, persona, cuenta) y su procedencia     */
/* (piezas y fuente: exactamente lo que el «¿por qué?» de la Ola 21    */
/* despliega). El seguimiento corto («¿y el mes pasado?», «¿y Ana?»,   */
/* «no, en septiembre») se reescribe sustituyendo UN eje de la         */
/* pregunta guardada y se responde con el motor de siempre; la nota    */
/* hace eco del eje cambiado. La caja guarda el último marco y lo      */
/* devuelve en la próxima pregunta: el banco sigue puro. Sin marco,    */
/* el seguimiento solo sigue en su silencio honesto de siempre.        */
/* ------------------------------------------------------------------ */
export type ConvoFrame = {
  question: string;
  family: string;
  periodPhrase?: string;
  personName?: string;
  accountName?: string;
  pieces: BankPiece[];
  source: string[];
  verdict: string;
  // OLA 27: el grafo que la respuesta declaró (si declaró) y el nodo
  // que el último ¿por qué? dejó abierto — el descenso continúa ahí.
  graph?: AskNode[];
  whyId?: string;
  // OLA 28: la horquilla se nombra por sus ejes (la pila que la caja
  // guarda se navega por este nombre) y las reparaciones se cuentan
  // sobre el marco.
  forkName?: string;
  exclusionName?: string;
  repairs?: number;
};

const FRAME_PERIODS = [
  "el mes pasado", "la semana pasada", "la quincena pasada", "el ano pasado",
  "este mes", "esta semana", "esta quincena", "este ano", "mes pasado", "ano pasado",
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
  "hoy", "ayer", "today", "yesterday", "last month", "this month", "last week", "this week",
  // OLA 33 (Familia 2, Q33-2): LA FUENTE ÚNICA TAMBIÉN ES DEL MARCO
  // — la Cura 32 unió tres oídos (puerta, marcador, caminata) en
  // PERIOD_HALF_ALL, pero el marco guardaba su período con una
  // cuarta lista, propia y anterior, que no conocía las mitades con
  // ordinal: tras «la primera quincena» el marco nacía SIN
  // periodPhrase y «¿Y la segunda quincena?» moría en unknown,
  // exactamente en las frases que la Ola 32 acababa de enseñar a las
  // otras tres puertas. Las frases de la quincena entran aquí DESDE
  // LA FUENTE (PERIOD_HALF_ALL, de la más larga a la más corta, tras
  // las entradas de siempre, que conservan su precedencia: «la
  // quincena pasada» sigue mandando sobre «quincena pasada»), y con
  // ellas la forma corta de la semana («la semana»), que tampoco
  // estaba: «¿Y la semana?» sobre un marco de «esta semana» moría
  // igual. El vocabulario de período del marco ES el de la casa.
  ...[...PERIOD_HALF_ALL].sort((a, b) => b.length - a.length),
  "la semana",
  // OLA 34 (Familia 7, Q34-7): LA FORMA CORTA INGLESA TAMBIÉN —
  // la Cura 33 añadió «la semana» y declaró «the week» sin medir;
  // medida en la Ola 34, moría en unknown (ni la reparación la
  // oía: followUpShaped lee esta misma lista). El vocabulario de
  // período del marco es uno en los dos idiomas.
  "the week",
];
function periodPhraseIn(folded: string): string | null {
  for (const p of FRAME_PERIODS) if (new RegExp(`(^|[^a-z0-9])${p}([^a-z0-9]|$)`).test(folded)) return p;
  return null;
}
/** OLA 33 (Familia 4, Q33-4): DOS FORMAS DEL MISMO PERÍODO — la
 * frase se compara sin su cabeza demostrativa o articulo («esta
 * semana» ~ «la semana», «el mes pasado» ~ «mes pasado», «esta
 * quincena» ~ «quincena»): la cabeza nombra la misma cosa con otra
 * ropa y no es parte del período. El núcleo manda; la cabeza sola
 * jamás iguala dos períodos distintos («la semana pasada» no es
 * «la semana»: sus núcleos difieren). */
const PERIOD_HEAD_WORDS = new Set(["esta", "este", "la", "el", "this", "the"]);
const periodPhraseCore = (p: string): string => {
  const toks = p.split(/\s+/);
  return toks.length > 1 && PERIOD_HEAD_WORDS.has(toks[0]) ? toks.slice(1).join(" ") : p;
};
const samePeriodPhrase = (a: string, b: string): boolean => a === b || periodPhraseCore(a) === periodPhraseCore(b);
/** OLA 31 (Familia 4, Q31-3 del Asesor): LA PALABRA ENTERA, TAMBIÉN
 * EN EL MARCO — los detectores del ConvoFrame casaban por SUBCADENA
 * (`folded.includes(f)`): «¿cuánto mandé esta semana?» paría un
 * marco con personName «ana» (de sem**ana**), el seguimiento «¿Y
 * Ana?» re-servía la suma global con el eco falso «cambié solo la
 * persona» y «¿Y Rosa?» cosía «sem**rosa**» y acusaba a una palabra
 * fabricada por la propia reescritura. Es la especie Q28-1, que el
 * escaneo (remitPersonOf) curó en la Ola 28 y el marco nuevo no
 * heredó: la cura llega aquí — todo detector del marco casa por
 * palabra entera, la persona y la cuenta. El eco «cambié solo la
 * persona» solo se dice cuando la persona cambió de verdad: sin
 * personName verdadero en el marco, la reescritura de persona no
 * nace (followUpRewrite ya lo exige) y el seguimiento cae a la
 * cascada fresca, que sirve a la persona nombrada o calla honesto. */
const wholeWordIn = (folded: string, needle: string): boolean =>
  new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded);
/** OLA 32 (Familia 2, Q32-2): LA COSTURA TAMBIÉN COSE POR PALABRA
 * ENTERA — la Cura 31 llevó la palabra entera a los DETECTORES del
 * marco, pero la REESCRITURA sustituyó el eje con String.replace
 * (primera ocurrencia, subcadena): tras «¿cuánto mandé por el
 * rosario a Rosa?», «¿Y Ana?» cosía la «rosa» de «rosario» y servía
 * a Rosa como si fuera Ana, y el marco guardaba la pregunta cosida
 * «…por el anario a rosa», que el «¿Por qué?» citaba al usuario como
 * si fuera la suya. La sustitución reemplaza la palabra o frase
 * ENTERA del eje — la primera ocurrencia con bordes no
 * alfanuméricos, la misma vara de wholeWordIn — y si el eje no
 * aparece entero en la pregunta guardada, la pregunta no se toca. */
const replaceWholeWord = (text: string, needle: string, replacement: string): string => {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`), (_m, a: string, b: string) => `${a}${replacement}${b}`);
};
/** OLA 35 (Q35-2): LA COSTURA DE PERSONA NO CORTA DENTRO DEL
 * NOMBRE DE LA CUENTA — cuando la persona del marco también vive
 * FUERA del nombre de su cuenta («el Fondo Rosa DE ROSA»), la
 * guarda de nacimiento deja pasar el eje y replaceWholeWord cosía
 * la PRIMERA ocurrencia — la de dentro: «el fondo ana de rosa»,
 * con su eco falso y su stock entero. Esta costura reemplaza la
 * primera ocurrencia que vive FUERA del tramo del nombre de la
 * cuenta; si la única vive dentro, devuelve el texto intacto y la
 * rama muere honesta, como su forma de cura falló. */
const replaceOutsideAccount = (text: string, needle: string, replacement: string, account: string | undefined): string => {
  if (!account) return replaceWholeWord(text, needle, replacement);
  const escA = account.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const am = new RegExp(`(^|[^a-z0-9])${escA}([^a-z0-9]|$)`).exec(text);
  if (!am) return replaceWholeWord(text, needle, replacement);
  const aStart = am.index + am[1].length;
  const aEnd = aStart + account.length;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[1].length;
    if (start < aStart || start >= aEnd) return text.slice(0, start) + replacement + text.slice(start + needle.length);
  }
  return text;
};
/** OLA 33 (Familia 1, Q33-1): EL DETECTOR PREFIERE LA COINCIDENCIA
 * MÁS LARGA — los detectores del marco devolvían el PRIMER acierto
 * por palabra entera en el orden de las listas del libro, mientras
 * los escaneos que SIRVEN (remitPersonOf, filterHitOf) prefieren el
 * nombre completo: con «Ana» antes que «Ana María» en la lista, la
 * pregunta por Ana María servía sus $260 y el marco nacía con
 * personName «ana» — la costura cosía «rosa maria» (la palabra
 * fabricada de Q32-2, vuelta por la puerta del detector), «¿Y
 * Ana?» servía en silencio lo de Ana María, «¿Y Casa Grande?»
 * sobre un marco de Casa moría, y el comportamiento dependía del
 * orden interno del libro, que el usuario no ve ni manda. La vara
 * es una sola, la de los escaneos: entre todos los aciertos por
 * palabra entera manda el MÁS LARGO; a igual largo, la forma de
 * nombre completo manda sobre la de primer nombre; a igual todo,
 * el orden de la lista desempata como siempre. El acierto lleva
 * además la IDENTIDAD — el nombre completo plegado de la persona —
 * que el eco de la Familia 4 consume: el marco describe a la
 * persona que la pantalla enseña, no a una más corta que comparte
 * su primera palabra. */
type FramePersonHit = { form: string; full: string };
function framePersonHit(state: LedgerState, folded: string, today = ""): FramePersonHit | null {
  const people: Array<{ name: string }> = [...peopleOf(state, "owed", today || undefined), ...peopleOf(state, "owe", today || undefined), ...(state.remitPeople ?? [])];
  let best: { form: string; full: string; len: number; fullForm: boolean } | null = null;
  const consider = (form: string, full: string) => {
    const fullForm = form === full;
    if (!best || form.length > best.len || (form.length === best.len && fullForm && !best.fullForm)) {
      best = { form, full, len: form.length, fullForm };
    }
  };
  for (const p of people) {
    const f = foldQ(p.name);
    if (f.length >= 3 && wholeWordIn(folded, f)) consider(f, f);
    const first = f.split(/\s+/)[0];
    if (first !== f && first.length >= 4 && wholeWordIn(folded, first)) consider(first, f);
  }
  return best ? { form: (best as { form: string }).form, full: (best as { full: string }).full } : null;
}
function framePersonIn(state: LedgerState, folded: string, today = ""): string | null {
  return framePersonHit(state, folded, today)?.form ?? null;
}
/** OLA 33 (Familia 4, Q33-4): LA IDENTIDAD DE UNA FORMA GUARDADA —
 * el nombre completo plegado de la persona que una forma del marco
 * nombra. La forma completa se reconoce a sí misma; la forma corta
 * se resuelve a su persona con la misma vara del detector (el
 * nombre completo manda; a igual todo, el orden de la lista). Sin
 * persona viva que la reclame, null — y el eco cae a la comparación
 * de cadenas de siempre. */
function framePersonFull(state: LedgerState, form: string, today = ""): string | null {
  const people: Array<{ name: string }> = [...peopleOf(state, "owed", today || undefined), ...peopleOf(state, "owe", today || undefined), ...(state.remitPeople ?? [])];
  for (const p of people) if (foldQ(p.name) === form) return form;
  for (const p of people) {
    const f = foldQ(p.name);
    if (f.split(/\s+/)[0] === form) return f;
  }
  return null;
}
function frameAccountIn(state: LedgerState, names: Namer, key: string, folded: string): string | null {
  const stock = savingsStock(state, key);
  // OLA 33 (Familia 1, Q33-1): la cuenta, la misma vara — la
  // coincidencia más larga manda («Casa Grande» sobre «casa»),
  // no la primera de la lista.
  let best: string | null = null;
  for (const h of hostAccounts(state, key, stock)) {
    const nm = foldQ(names.sub(h.id) || h.id);
    if (nm.length >= 3 && wholeWordIn(folded, nm) && (!best || nm.length > best.length)) best = nm;
  }
  return best;
}

/** OLA 34 (Familia 10, Q34-2-Cara): LA PERSONA DENTRO DEL NOMBRE
 * DE LA CUENTA NO ES PERSONA DEL MARCO — «¿cuánto tengo en el
 * Fondo Rosa?» paría un marco con personName «rosa» (la remitente
 * Rosa es palabra entera dentro del nombre de la cuenta) y el eje
 * de persona cosía «fondo ana» al cambiar el token DENTRO del
 * nombre. La guarda es de posición: la forma de persona solo es
 * persona del marco si aparece también FUERA del nombre de la
 * cuenta en la misma pregunta; si su única aparición vive dentro
 * del nombre, el marco nace sin persona — cambiar de persona sobre
 * un marco de cuenta es cambiar de cuenta o morir honesto, nunca
 * coser dentro del nombre. */
function personInsideAccountOnly(folded: string, person: string, account: string): boolean {
  if (!wholeWordIn(account, person)) return false;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const am = new RegExp(`(^|[^a-z0-9])${esc(account)}([^a-z0-9]|$)`).exec(folded);
  if (!am) return false;
  const aFrom = am.index + am[1].length;
  const aTo = aFrom + account.length;
  const re = new RegExp(`(^|[^a-z0-9])${esc(person)}([^a-z0-9]|$)`, "g");
  let m: RegExpExecArray | null;
  let seen = false;
  while ((m = re.exec(folded)) !== null) {
    seen = true;
    const pFrom = m.index + m[1].length;
    const pTo = pFrom + person.length;
    if (pFrom < aFrom || pTo > aTo) return false;
  }
  return seen;
}

function buildConvoFrame(state: LedgerState, key: string, names: Namer, raw: string, today: string, result: Extract<BankResult, { kind: "answer" }>): ConvoFrame {
  const folded = foldQ(raw);
  const period = periodPhraseIn(folded) ?? undefined;
  const excl = exclusionIn(state, names, folded);
  const account = frameAccountIn(state, names, key, folded);
  const person = framePersonIn(state, folded, today);
  return {
    question: folded,
    family: String(result.family),
    periodPhrase: period,
    // OLA 34 (Familia 10): el marco de la cuenta no nace con la
    // persona que su nombre contiene.
    personName: person && account && personInsideAccountOnly(folded, person, account) ? undefined : person ?? undefined,
    accountName: account ?? undefined,
    pieces: result.pieces.slice(0, 5),
    source: result.source,
    verdict: result.verdict,
    graph: result.graph,
    // OLA 28: la horquilla se nombra por sus ejes — la pila que la
    // caja guarda se navega por este nombre.
    ...(excl ? { exclusionName: excl.folded } : {}),
    ...((period || excl) ? { forkName: [period, excl ? `sin ${excl.folded}` : null].filter(Boolean).join(" · ") } : {}),
  };
}

/** LA COSTURA §20↔BANCO (integración 1.3.400): cuando el seguimiento
 * §20 responde, la cifra de la pantalla es LA SUYA — el marco
 * conversacional debe describir ESA respuesta, o el «¿por qué?»
 * siguiente desplegaría la cuenta anterior, no la que el usuario
 * mira. El marco nuevo se construye del previo: la pregunta citada
 * es la original con el eje de período sustituido (la semántica de
 * la reescritura de la Ola 19) y las piezas, la fuente y el veredicto
 * son los de la respuesta §20. */
export function convoAfterFollowUp(state: LedgerState, key: string, names: Namer, prev: ConvoFrame | null, raw: string, today: string, result: Extract<BankResult, { kind: "answer" }>): ConvoFrame {
  if (!prev) return buildConvoFrame(state, key, names, raw, today, result);
  const folded = foldQ(raw);
  const newPeriod = periodPhraseIn(folded);
  let question = prev.question;
  if (newPeriod && prev.periodPhrase && question.includes(prev.periodPhrase)) {
    // OLA 32 (Familia 2): la costura de esta pregunta citada cose
    // por palabra entera, como la de followUpRewrite — la pregunta
    // que el marco guarda sigue siendo la del usuario.
    question = replaceWholeWord(question, prev.periodPhrase, newPeriod);
  } else if (newPeriod && !prev.periodPhrase) {
    question = `${question} (${newPeriod})`;
  }
  // OLA 34 (Familia 1): la exclusión que el seguimiento trae y §20
  // aplicó manda en el nombre — la horquilla nombra la exclusión
  // DE LA CIFRA EN PANTALLA, no la del marco anterior: con la
  // exclusión guardada en el AskFrame, la costura la lee del turno
  // (la nueva) o la conserva (la de siempre), como el motor hizo.
  const exclNow = exclusionIn(state, names, folded);
  // OLA 35 (Q35-7): LA PREGUNTA CITADA SIGUE A LA EXCLUSIÓN QUE
  // MANDÓ — cuando el turno REEMPLAZÓ la exclusión del marco, la
  // costura de arriba dejaba la cláusula vieja en pie dentro de la
  // pregunta guardada («¿cuanto gaste sin la casa? (el mes
  // pasado)») desplegando piezas que excluían al Carro e incluían
  // a la Casa: el porqué citaba términos que la cuenta no aplicó.
  // La cláusula reemplazada se retira de la cita (su período
  // cosido se conserva) y la vigente se cose, como la reescritura
  // cose la pregunta que sirve.
  if (exclNow && prev.exclusionName && exclNow.folded !== prev.exclusionName) {
    const idx = question.lastIndexOf(" sin ");
    if (idx >= 0) {
      const tail = question.slice(idx + 5);
      const art = /^(?:el |la |los |las )/.exec(tail);
      const nameStart = idx + 5 + (art ? art[0].length : 0);
      if (question.slice(nameStart).startsWith(prev.exclusionName)) {
        question = (question.slice(0, idx) + question.slice(nameStart + prev.exclusionName.length)).replace(/\s+/g, " ").trim();
      }
    }
    if (!question.includes(` sin ${exclNow.folded}`)) question = `${question} sin ${exclNow.folded}`;
  }
  const exclName = exclNow ? exclNow.folded : prev.exclusionName;
  // OLA 34 (Familia 10): la misma guarda de nacimiento — la persona
  // que el turno nombra solo dentro del nombre de una cuenta no
  // entra al marco; sin persona nueva, la del marco sigue.
  const acctNow = frameAccountIn(state, names, key, folded);
  const persNow = framePersonIn(state, folded, today);
  return {
    question,
    family: String(result.family),
    periodPhrase: newPeriod ?? prev.periodPhrase,
    personName: persNow && acctNow && personInsideAccountOnly(folded, persNow, acctNow) ? prev.personName : persNow ?? prev.personName,
    accountName: acctNow ?? prev.accountName,
    pieces: result.pieces.slice(0, 5),
    source: result.source,
    verdict: result.verdict,
    // OLA 27: el grafo de la respuesta nueva manda; si no declara, el
    // del marco anterior sigue vivo (y con él, el nodo abierto).
    graph: result.graph ?? prev.graph,
    whyId: result.graph ? undefined : prev.whyId,
    // OLA 28: la horquilla se re-nombra con el período cosido y la
    // exclusión que la respuesta aplicó.
    exclusionName: exclName,
    forkName: (newPeriod ?? prev.periodPhrase) || exclName
      ? [(newPeriod ?? prev.periodPhrase), exclName ? `sin ${exclName}` : null].filter(Boolean).join(" · ")
      : prev.forkName,
  };
}

const FOLLOWUP_STOP = new Set(["y", "no", "en", "de", "a", "el", "la", "los", "las", "un", "una", "que", "tal", "comparado", "comparada", "con", "por", "favor", "oye", "oiga", "and", "what", "about", "the", "sin", "without"]);
/* OLA 28 · LA PILA DE MARCOS — la sustitución crece de UN eje a N
 * (GUS, 1977: la sobre-respuesta se absorbe entera). El seguimiento
 * puede traer el período Y la exclusión en un solo turno («¿y el mes
 * pasado sin la camisa?»): cada eje nombrado se aplica, cada cambio
 * se hace eco, y la horquilla nueva se nombra por sus ejes (fork)
 * para que la caja la guarde en la pila y el usuario vuelva a ella
 * por nombre. La exclusión («sin X») vive en v1 sobre los totales de
 * historia — la única familia que la computa — y su ciudadano lo
 * resuelve el mismo escaneo del libro. La forma sigue siendo SOLO
 * ejes: quitados los ejes y las muletillas, no puede quedar una
 * pregunta nueva escondida.
 * EN EL CANON la reescritura conserva sus curas posteriores: la
 * costura y el retiro son por PALABRA ENTERA (Ola 32, Familia 2) y
 * el eco solo nace por eje que CAMBIÓ de verdad (Q32-3) — un eje que
 * nombra el valor que el marco ya lleva no es cambio; si ningún eje
 * cambió, la pregunta se sirve tal cual y sin nota. La precedencia
 * de detección del canon se conserva (el período tapa a la persona
 * y la persona a la cuenta); la exclusión es independiente. Y una
 * exclusión anterior solo se retira cuando llega su reemplazo: un
 * seguimiento de período no pierde la exclusión que el marco trae. */
function followUpRewrite(state: LedgerState, key: string, names: Namer, frame: ConvoFrame, raw: string, lang: Lang, today: string): { question: string; echo: string | null; fork?: string } | null {
  const f = foldQ(raw).replace(/[¿?¡!.,;]+/g, " ").replace(/\s+/g, " ").trim();
  if (f.split(/\s+/).length > 7 && !/^no\b/.test(f)) return null;
  const p2 = periodPhraseIn(f);
  const exclM = /\bsin (?:el |la |los |las |the )?([a-z0-9][a-z0-9 ]{2,})/.exec(f);
  const excl = exclM ? citizenByName(state, names, exclM[1]) : null;
  if (exclM && !excl) return null;
  if (excl && frame.family !== "historia") return null;
  // OLA 33 (Familia 1): la detección de la persona se apoya en el
  // acierto con identidad (framePersonHit): la coincidencia más
  // larga manda y el acierto lleva el nombre completo, que la rama
  // de persona del eco compara contra el del marco (Familia 4).
  let personHit = p2 ? null : framePersonHit(state, f, today);
  let person2 = personHit?.form ?? null;
  let acct2 = !p2 && !person2 ? frameAccountIn(state, names, key, f) : null;
  let reroutedWord: string | null = null;
  // OLA 34 (Familia 10, Q34-2-Cara): LA «PERSONA» QUE SOLO VIVE
  // DENTRO DEL NOMBRE DE LA CUENTA DEL MARCO ES LA CUENTA — con el
  // marco ya curado al nacer (sin personName espuria), «¿Y Rosa?»
  // sobre el marco del Fondo Rosa nombra a la CUENTA por su pieza:
  // el acierto de persona se re-ruta al eje de cuenta, que no
  // cambia nada y re-sirve el fondo limpio. Y con un marco nacido
  // antes de la guarda, el eje de persona jamás cose dentro del
  // nombre: si la persona del marco solo aparece dentro de su
  // cuenta en la pregunta guardada, la reescritura muere honesta.
  if (person2 && !frame.personName && frame.accountName && wholeWordIn(frame.accountName, person2)) {
    reroutedWord = person2;
    acct2 = frame.accountName;
    person2 = null;
    personHit = null;
  }
  if (person2 && frame.personName && frame.accountName && personInsideAccountOnly(frame.question, frame.personName, frame.accountName)) return null;
  if (!p2 && !excl && !person2 && !acct2) return null;
  // OLA 35 (Q35-9): EL TOTAL ES STOCK DE HOY Y NO TIENE EJE DE
  // PERÍODO — la rama de período AÑADÍA la frase a su pregunta
  // («¿cuánto dinero tengo en total? el mes pasado») y la familia
  // la ignoraba, re-sirviendo los mismos $2.800 de hoy con el eco
  // «cambié solo el período»: un cambio que no ocurrió, anunciado.
  // Sin otro eje en el turno, la reescritura cede: el seguimiento
  // muere en la reparación honesta, que nombra los ejes que sí
  // puede cambiar — jamás un eco falso sobre la cifra de hoy.
  if (p2 && !excl && !person2 && !acct2 && frame.family === "total") return null;
  if (person2 && !frame.personName) return null;
  if (acct2 && !frame.accountName) return null;
  // La forma debe ser SOLO ejes: quitados los ejes y las muletillas,
  // no puede quedar una pregunta nueva escondida en el seguimiento.
  // OLA 32 (Familia 2): el eje se quita por palabra entera, como se cose.
  let rest = f;
  if (p2) rest = replaceWholeWord(rest, p2, " ");
  if (exclM) rest = rest.replace(exclM[0], " ");
  if (person2) rest = replaceWholeWord(rest, person2, " ");
  if (acct2) rest = replaceWholeWord(rest, acct2, " ");
  if (reroutedWord) rest = replaceWholeWord(rest, reroutedWord, " ");
  if (rest.split(/\s+/).filter((w) => w && !FOLLOWUP_STOP.has(w)).length) return null;
  // LOS CAMBIOS (Q32-3): un eje solo cambia si su valor difiere del
  // que el marco ya trae. Sin cambios, la pregunta se sirve tal cual.
  const parts: Array<{ solo: string; plain: string }> = [];
  const forkParts: string[] = [];
  let q = frame.question;
  if (excl && frame.exclusionName && frame.exclusionName !== excl.folded) {
    const idx = q.lastIndexOf(" sin ");
    if (idx >= 0 && q.slice(idx + 5).replace(/^(el|la|los|las) /, "").startsWith(frame.exclusionName)) q = q.slice(0, idx).trim();
  }
  // OLA 33 (Familia 4, Q33-4): la frase de período se compara SIN
  // su cabeza demostrativa — «esta semana» y «la semana» son el
  // mismo período en dos formas, y «el mes pasado» y «mes pasado»
  // también: nombrar el mismo período con su otra forma no es un
  // cambio y no nace nota (samePeriodPhrase incluye la igualdad de
  // cadenas de la Cura 32 como piso).
  // OLA 35 (Q35-6): EL MARCO DE LA COMPARATIVA ANUAL SE ESTRECHA
  // A UN LADO — la respuesta de DOS años dejaba un marco de UN
  // período cuya frase guardada era un lado (por orden de lista):
  // «¿Y el año pasado?» se leía «sin cambio» y re-servía la
  // comparación entera; «¿Y este año?» la re-servía con eco de
  // cambio falso y la pregunta fabricada «…este ano comparado con
  // este ano». Pedir un lado de una comparación ES estrecharla:
  // la pregunta que se sirve es la del lado pedido, sola — la
  // base de la comparación (su verbo y su dirección) con la frase
  // del turno en el lugar del año que la base trae.
  const yearCompareFrame = p2 && !excl
    && /(este ano|this year)/.test(frame.question) && /(ano pasado|ano anterior|last year)/.test(frame.question)
    && /(comparad|compared|versus|vs\.|contra|than last year|que el ano pasado)/.test(frame.question);
  if (yearCompareFrame) {
    // El corte va en el marcador comparativo — incluida la forma
    // «…que el año pasado», donde el segundo año ES el marcador:
    // la cabeza conserva el verbo y la dirección de la pregunta.
    const cut = frame.question.search(/\s(comparad|compared|versus|vs\.|contra)\b|\sque el ano (pasado|anterior)|\so el ano (pasado|anterior)|\sthan last year/);
    const base = (cut > 0 ? frame.question.slice(0, cut) : frame.question).trim().replace(/^[¿¡]+/, "");
    const yearInBase = /(este ano|el ano pasado|ano anterior|this year|last year)/.exec(base);
    let qSide = yearInBase ? replaceWholeWord(base, yearInBase[1], p2 as string) : `${base} ${p2}`;
    // La cabeza sin «cuánto» («gaste mas este ano») no abre la
    // puerta de historia: la costura le devuelve su forma de
    // pregunta, como la rama de período añade la frase que falta.
    if (!/(cuanto|how much)/.test(qSide)) qSide = `${L(lang, "cuanto", "how much")} ${qSide}`;
    if (qSide !== frame.question) {
      return { question: qSide, echo: L(lang, `cambié solo el período, a «${p2}»`, `I changed only the period, to "${p2}"`), fork: p2 as string };
    }
  }
  if (p2 && !(frame.periodPhrase && samePeriodPhrase(frame.periodPhrase, p2))) {
    const qBefore = q;
    // OLA 34 (Familia 6, Q34-6): LA FRASE DE PERÍODO ENTERA SE
    // SUSTITUYE — la pregunta de dos piezas («la primera quincena
    // de octubre») guarda UN eje (el mes) y la costura vieja
    // reemplazaba ESE, dejando la mitad vieja en pie delante de la
    // nueva: fabricaba «la primera quincena de segunda quincena»,
    // servía la primera mitad anunciando la segunda y el porqué
    // citaba la fabricación. Si el seguimiento trae una MITAD y la
    // pregunta guardada trae la suya (con el mes como eje del
    // marco), la mitad se sustituye por la mitad — la frase entera,
    // con su mes, queda la verdadera — y el servicio cae en la
    // lectura de siempre de mitad-de-mes-nombrado.
    const p2IsHalf = PERIOD_HALF_ALL.some((h) => samePeriodPhrase(h, p2));
    const halfInQ = p2IsHalf && frame.periodPhrase && REMIT_MONTH_WORDS.has(frame.periodPhrase)
      ? [...PERIOD_HALF_ALL].sort((a, b) => b.length - a.length).find((h) => wholeWordIn(q, h) && !samePeriodPhrase(h, p2))
      : undefined;
    q = halfInQ
      ? replaceWholeWord(q, halfInQ, p2)
      : frame.periodPhrase ? replaceWholeWord(q, frame.periodPhrase, p2) : `${q} ${p2}`;
    if (q === qBefore) return null;
    parts.push({ solo: L(lang, `cambié solo el período, a «${p2}»`, `I changed only the period, to "${p2}"`), plain: L(lang, `el período a «${p2}»`, `the period to "${p2}"`) });
    forkParts.push(p2);
  }
  // OLA 33 (Familia 4, Q33-4): EL ECO COMPARA LA PERSONA, NO LA
  // CADENA — las dos formas del detector (nombre completo / primer
  // nombre) de la MISMA persona no se reconocían entre sí: «¿Y
  // Juan?» sobre el marco de «Juan Pérez» servía lo correcto con la
  // nota de un cambio que no ocurrió. La comparación es de
  // identidad: el nombre completo de la persona del marco
  // (framePersonFull) contra el del acierto nuevo; si la identidad
  // no se puede resolver, manda la comparación de cadenas de
  // siempre. (La cuenta no tiene segunda forma: su comparación
  // queda como está.)
  // OLA 34 (Familia 3, Q34-3): EL DESEMPATE DEL NOMBRE CORTO LO
  // CONSULTA EL MARCO — la identidad que framePersonFull asigna a
  // la forma corta es la del PRIMER homónimo de la lista, así que
  // «¿Y Juan?» sobre el marco de Juan Pérez servía a Juan Gómez
  // cuando Gómez iba primero, con la nota de un cambio pedido por
  // nadie. Si la forma del acierto es el primer nombre de la
  // persona DEL MARCO, la identidad es la del marco: no hay cambio
  // de persona, no hay eco y se sirve a quien la conversación
  // trae. La resolución global solo arbitra cuando el marco no
  // desempata. LA VARA EXACTA: la forma corta que NO ES EL NOMBRE
  // COMPLETO DE NADIE (el acierto la ata a un apellido ajeno:
  // full ≠ form) es la que el marco desempata; la forma que SÍ es
  // el nombre entero de otra persona del libro («Ana» junto a
  // «Ana María», cerca de la Ola 33) es una ciudadana con derecho
  // propio a ser pedida — ahí el cambio es verdadero y su eco
  // también.
  const frameFull34 = person2 && frame.personName ? framePersonFull(state, frame.personName, today) : null;
  const hitIsFramePerson = !!(personHit && frameFull34 && personHit.form === frameFull34.split(/\s+/)[0] && personHit.full !== personHit.form);
  if (person2 && frame.personName !== person2 && !hitIsFramePerson && !(personHit && framePersonFull(state, frame.personName as string, today) === personHit.full)) {
    const q2 = replaceOutsideAccount(q, frame.personName as string, person2, frame.accountName);
    if (q2 === q) return null;
    q = q2;
    parts.push({ solo: L(lang, `cambié solo la persona, a «${person2}»`, `I changed only the person, to "${person2}"`), plain: L(lang, `la persona a «${person2}»`, `the person to "${person2}"`) });
    forkParts.push(person2);
  }
  if (acct2 && frame.accountName !== acct2) {
    const q2 = replaceWholeWord(q, frame.accountName as string, acct2);
    if (q2 === q) return null;
    q = q2;
    parts.push({ solo: L(lang, `cambié solo la cuenta, a «${acct2}»`, `I changed only the account, to "${acct2}"`), plain: L(lang, `la cuenta a «${acct2}»`, `the account to "${acct2}"`) });
    forkParts.push(acct2);
  }
  if (excl && frame.exclusionName !== excl.folded) {
    q = `${q} sin ${excl.folded}`;
    parts.push({ solo: L(lang, `excluí solo «${excl.display}»`, `I left out only "${excl.display}"`), plain: L(lang, `la exclusión de «${excl.display}»`, `the exclusion of "${excl.display}"`) });
    forkParts.push(`sin ${excl.folded}`);
  }
  if (!parts.length) return { question: frame.question, echo: null, fork: frame.forkName };
  const echo = parts.length === 1
    ? parts[0].solo
    : L(lang, `cambié ${parts.slice(0, -1).map((p) => p.plain).join(", ")} y ${parts[parts.length - 1].plain}`, `I changed ${parts.slice(0, -1).map((p) => p.plain).join(", ")} and ${parts[parts.length - 1].plain}`);
  return { question: q, echo, fork: forkParts.join(" · ") };
}

/* OLA 24 · EL OÍDO FINO — el normalizador morfológico del español de
 * la calle (Snowball ES y la morfología productiva, vía la
 * investigación). Se aplica sobre la pregunta PLEGADA a la entrada de
 * la cascada del banco y del oído de la referencia — nunca sobre los
 * datos del libro, que se pliegan tal cual. Tres capas por palabra:
 * (1) el voseo por paradigma finito (tenés → tienes); (2) los
 * enclíticos se separan del verbo (pagándolo → pagando, decímelo →
 * di); (3) el diminutivo se despoja con su reversión ortográfica
 * (platita → plata, poquito → poco) y su LISTA DE EXCEPCIONES que
 * jamás se tocan: donde -ito es raíz (crédito, necesito) o la palabra
 * ya es otra (zapatilla NO es zapato). El argot NO se siembra aquí:
 * entra solo por el aprendizaje confirmado de la Ola 11 — la colisión
 * «luz» (dinero en Honduras, servicios en el libro) es la prueba. */
const NORM_EXCEPTIONS = new Set([
  "credito", "debito", "merito", "necesito", "necesita", "necesitan", "necesite",
  "favorito", "favorita", "zapatilla", "zapatillas", "palillo", "palillos",
  "manzanilla", "ventanilla", "ventanillas", "tobillo", "tobillos",
  "escrito", "descrito", "bonito", "bonita", "maldito", "maldita", "bendito", "bendita",
  "requisito", "infinito", "infinita",
]);
const VOSEO_MAP: Record<string, string> = { tenes: "tienes", queres: "quieres", podes: "puedes", venis: "vienes", decis: "dices", deci: "di" };
function normalizeEsWord(w: string): string {
  if (NORM_EXCEPTIONS.has(w)) return w;
  let x = w
    .replace(/(ando|endo|iendo)(melo|mela|telo|tela|selo|sela)$/, "$1")
    .replace(/(ando|endo|iendo)(me|te|se|lo|la|los|las|nos)$/, "$1")
    .replace(/^([a-z]{2,})(melo|mela|telo|tela|selo|sela)$/, "$1")
    // El infinitivo + clítico exige el infinitivo entero (≥5 letras)
    // y un clítico de tercera persona: «pagarlo», «decirlo» se
    // despojan; «reparte» (imperativo pelado) y «Carlos» (un nombre)
    // NO son infinitivo+clítico y la primera corrida lo probó.
    .replace(/^([a-z]{3,}(?:ar|er|ir))(lo|la|los|las|le|les|se|nos)$/, "$1");
  x = VOSEO_MAP[x] ?? x;
  if (NORM_EXCEPTIONS.has(x)) return x;
  if (/(ecito|ecita)$/.test(x) || /^(pobre|cafe|te|mama|papa)(cito|cita)$/.test(x)) x = x.slice(0, -4);
  else {
    const m = x.match(/^(.{3,}?)(itos|itas|ito|ita)$/);
    if (m) {
      let stem = m[1];
      if (stem.endsWith("qu")) stem = `${stem.slice(0, -2)}c`;
      else if (stem.endsWith("gu")) stem = `${stem.slice(0, -2)}g`;
      x = stem + (m[2] === "ito" ? "o" : m[2] === "ita" ? "a" : m[2] === "itos" ? "os" : "as");
    }
  }
  return NORM_EXCEPTIONS.has(x) ? w : x;
}
export function normalizeEs(folded: string): string {
  return folded.split(/(\s+)/).map((tok) => (/^[a-z]+$/.test(tok) ? normalizeEsWord(VOSEO_MAP[tok] ?? tok) : tok)).join("");
}

/** OLA 31 (Familia 3, Q31-2): EL PISO DE LA FAMILIA DEL MARCO — el
 * porqué re-juzga, al turno en que se pide, los pisos que el camino
 * fresco de cada familia YA juzga: el patrón de remesas (remit.manage
 * / study.remit), el plan de salida de deudas (loans.payoff-plan) y
 * la proyección (advisor.projection). Se distingue por la familia y
 * su fuente: la suma por persona y la recencia también son «remesas»
 * por familia, pero su fuente es solo «remesas.personas» y no conocen
 * piso — preguntar por los propios envíos es básico en los tres
 * modos, y su porqué despliega en cualquier modo. Una familia sin
 * piso juzgado en su camino fresco no gana ninguno aquí: el porqué
 * no inventa pisos, hereda los de la casa. */
function convoFrameFloor(frame: ConvoFrame): { reached: (m: BookMode) => boolean; verdict: (lang: Lang) => string } | null {
  if (frame.family === "remesas" && frame.source.includes("asesor.lectura")) {
    return {
      reached: (m) => askReaches(m, "remit.manage") || askReaches(m, "study.remit"),
      verdict: (lang) => L(lang, `Esa cuenta es el patrón de tus remesas, y vive en ${modeWord(lang, "completo")}: en Estudio → Remesas y en Ajustes → Remesas ves a quién envías, cuánto y con qué ritmo. En tu modo de ahora no despliego sus piezas; si subes a ${modeWord(lang, "completo")}, te enseño de dónde salen.`, `That reckoning is your remittance pattern, and it lives in ${modeWord(lang, "completo")}: in Study → Remittances and Settings → Remittances you see who you send to, how much, and at what pace. In your current mode I won't unfold its pieces; if you go up to ${modeWord(lang, "completo")}, I'll show you where they come from.`),
    };
  }
  if (frame.family === "futuro" && frame.source.includes("cobros.plan")) {
    return {
      reached: (m) => askReaches(m, "loans.payoff-plan"),
      verdict: (lang) => L(lang, `Esa cuenta es el plan para salir de deudas, y vive en ${modeWord(lang, "completo")}: ahí ves la fecha en que quedas libre y el interés del camino, con su supuesto dicho. En tu modo de ahora no despliego sus piezas; si subes a ${modeWord(lang, "completo")}, te enseño de dónde salen.`, `That reckoning is the debt payoff plan, and it lives in ${modeWord(lang, "completo")}: there you see the date you're debt-free and the interest along the way, with its assumption stated. In your current mode I won't unfold its pieces; if you go up to ${modeWord(lang, "completo")}, I'll show you where they come from.`),
    };
  }
  if (frame.family === "futuro") {
    return {
      reached: (m) => askReaches(m, "advisor.projection"),
      verdict: (lang) => L(lang, `Esa cuenta es tu saldo proyectado, día a día, y vive en ${modeWord(lang, "completo")}. En tu modo de ahora no despliego sus piezas; si subes a ${modeWord(lang, "completo")}, te enseño de dónde salen.`, `That reckoning is your projected balance, day by day, and it lives in ${modeWord(lang, "completo")}. In your current mode I won't unfold its pieces; if you go up to ${modeWord(lang, "completo")}, I'll show you where they come from.`),
    };
  }
  return null;
}

/* OLA 21 · ¿POR QUÉ? — el despliegue de la procedencia. El marco de la
 * Ola 19 ya guarda las piezas y la fuente de la última respuesta: esta
 * familia solo las abre. Sin marco, lo dice: primero la cifra, luego
 * su porqué — y conserva el marco nulo para no fabricarse uno.
 * OLA 32 (Familia 4, Q32-4): EL PORQUÉ NO CORTA EL HILO §20 — el
 * porqué conservaba su ConvoFrame (convo: frame) pero no devolvía
 * ningún AskFrame, y la caja reemplaza el suyo con r.frame ?? null
 * tras cada respuesta: preguntar «¿por qué?» cerraba el hilo del
 * §20 en silencio y el estrechamiento siguiente moría en unknown.
 * El porqué no es una pregunta fresca (L-S4 gobierna las frescas):
 * es un meta-turno sobre la respuesta que sigue en pantalla, y la
 * casa ya curó esta forma para el otro meta-verbo («el verbo que
 * carga el hilo no lo corta», Cura 31 Familia 5). La caja enhebra
 * su marco §20 vivo y esta familia lo devuelve intacto en sus tres
 * salidas: el hilo no muere por preguntar por qué. */
/* OLA 65 · LA ORTOGRAFÍA QUE NO MATA (la onda hostil de las
 * mutaciones, 2026-11-24: de 1.152 roturas, la clase mayor — más
 * de 500 — era una letra caída o cambiada en la palabra que abre la
 * puerta: «ahoros», «retrio», «segro», «beces». La escritura
 * imperfecta es la ley de Alvin llevada a las puertas: ninguna
 * puerta puede depender de que la palabra clave venga perfecta).
 *
 * La cura es UNA y es de forma, no de espécimen: antes de la
 * cascada, cada palabra que NO es una palabra conocida del
 * vocabulario de las puertas se repara a la única palabra de ese
 * vocabulario que esté a una deformación honesta de distancia. Las
 * deformaciones honestas son las que la gente y el dictado hacen:
 * una letra caída o de más, dos letras vecinas cambiadas, y los
 * trueques fonéticos (b/v, c/s, z/s, g/j, qu/k). Una palabra con
 * DOS candidatas no se toca (la ambigüedad no se adivina), una
 * palabra que ya es del vocabulario no se toca, y los nombres y
 * conceptos del libro no viven en este diccionario: «casa» jamás se
 * vuelve «cara» porque el trueque s→r no es fonético. */
const GATE_WORDS: string[] = [
  "cuanto", "cuanta", "cuantos", "cuantas", "cuando", "donde", "quien", "quienes",
  "gasto", "gastos", "gaste", "gastado", "gastando", "gasolina", "ingreso", "ingresos", "ingrese", "ingreso",
  "entro", "entran", "entraron", "gane", "ganar", "ganas", "salario", "sueldo",
  "ahorro", "ahorros", "ahorrado", "ahorrar", "aparte", "apartado", "apartados", "aparte", "aparto", "aparte",
  "retiro", "retiros", "retirar", "emergencia", "emergencias", "meta", "metas", "fondo", "fondos",
  "bolsillo", "bolsillos", "cuenta", "cuentas", "cuentas", "banco", "debo", "debe", "deben", "deuda", "deudas",
  "tarjeta", "tarjetas", "credito", "prestamo", "prestamos", "intereses", "interes",
  "seguro", "seguros", "vida", "poliza", "prima", "beneficiario", "beneficiarios", "cobra", "cobro", "cobran",
  "remesa", "remesas", "envie", "enviado", "enviados", "envio", "enviar", "mande", "mandado",
  "suscripcion", "suscripciones", "vence", "vencen", "vencimiento", "queda", "quedan", "quedara", "quedaria",
  "pagan", "pago", "pague", "pagado", "pagando", "pagar", "veces", "grande", "grandes", "chico", "chica", "pequeno", "pequena",
  "ultimo", "ultima", "ultimos", "primero", "primera", "mayor", "menor", "caro", "cara", "caros", "barato",
  "tienda", "tiendas", "compra", "compras", "compre", "compro", "comprado", "semana", "semanas", "quincena",
  "mes", "meses", "ano", "anos", "hoy", "ayer", "trabajo", "dias", "cuesta", "cuestan", "alcanza", "alcanzan",
  "puedo", "podria", "quiero", "falta", "faltan", "sobra", "sobran", "libre", "libres", "total", "totales",
  "junto", "juntos", "gano", "gana", "ahorra", "ahorras", "gastas", "gastar", "debes", "tenes", "podes",
  "savings", "saving", "saved", "save", "spend", "spent", "spending", "spends", "owe", "owes", "owed", "owing",
  "debt", "debts", "card", "cards", "account", "accounts", "insurance", "premium", "due", "dues",
  "paid", "pay", "pays", "payment", "payments", "income", "earn", "earned", "earns", "sent", "send", "sends",
  "remittance", "remittances", "emergency", "retirement", "goal", "goals", "month", "months", "week", "weeks",
  "year", "years", "today", "total", "left", "free", "biggest", "largest", "smallest", "expensive", "cheap",
  "last", "first", "times", "often", "much", "many", "afford", "reach", "cover", "balance", "balances",
  "interest", "loan", "loans", "lent", "borrow", "borrowed", "salary", "wages", "store", "stores", "bought", "buy",
  "ciento", "porcentaje", "porciento", "dinero", "billete", "billetes", "efectivo", "cash", "money",
  /* OLA 67 · LAS FLEXIONES Y LAS PALABRAS QUE LA ONDA HOSTIL
   * CULPÓ POR AUSENTES: una palabra correcta que no está en el
   * diccionario se «repara» a su singular («primeras»→«primera»)
   * y las puertas de frase exacta se rompen; y las palabras de
   * puerta que faltaban (guardado, colchón, córdobas, percent,
   * negocio…) dejaban sus erratas sin cura posible. */
  "guardado", "guardada", "guardados", "guardadas", "colchon", "colchones",
  "cordoba", "cordobas", "percent", "more", "aside", "cushion", "negocio", "negocios",
  "vendo", "vender", "vendes", "vende", "business", "touching", "primera", "primeras", "primeros",
  "cuota", "cuotas", "ultimas", "mayores", "menores", "proximo", "proxima", "proximos", "proximas",
  "treat", "treats", "enviando", "enviar",
  "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos",
  "hundred", "thousand", "siguiente", "siguientes",
  /* OLA 67 · SEGUNDA TANDA (la onda amiga sobre las 206 roturas
   * que quedaron): las palabras de puerta interna que faltaban —
   * cada una dejó su familia en silencio bajo una sola letra. */
  "ahorrando", "guardando", "apartando", "respaldo", "promedio", "promedios",
  "necesito", "necesitas", "necesita", "gastamos", "gastan", "percentage",
  "where", "when", "which", "what", "who", "why", "how", "subscription", "subscriptions",
  "necesidades", "necesidad", "aprendido", "aprendiendo", "olvida", "olvido",
  "learned", "punto", "puntos", "prestarle", "lowest", "highest", "payday",
  "negative", "negativo", "finish", "llegaria", "cambio", "cambia", "deberia",
  "anything", "something", "should", "happens", "costs", "cost", "aparece", "aparecen",
  "missing", "dolares", "dolar", "convierte", "convertir", "puedes", "puede", "pueden",
  "enviarle", "mandarle", "terminare", "acabare", "aguanto", "aguantas",
  /* OLA 67 · TERCERA TANDA (la onda amiga sobre las 72 roturas que
   * quedaron): «dia» no estaba y la reparación lo volvía «dias»,
   * rompiendo la cuenta atrás del calendario; los meses por su
   * nombre no estaban y diciembre deformado dejaba el futuro en
   * silencio; y las palabras de puerta de las familias que la onda
   * midió últimas (capacidades, límites, faro-mismo, porque, falta)
   * dejaban sus erratas sin cura posible. */
  "dia", "sabes", "sabe", "sirves", "sirve", "sending", "limites", "limitaciones", "limitations",
  "can", "hormiga", "pasado", "recompensas", "recompensa", "importo", "importar",
  "rewards", "reward", "import", "dices", "calculaste", "number", "patrimonio", "puntaje", "worth",
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre",
  "octubre", "noviembre", "diciembre", "january", "february", "march", "april", "june", "july",
  "august", "september", "october", "november", "december",
  /* TANDA 3b: los verbos de las propias puertas — cae, vence, toca,
   * falta — son vocabulario de las puertas y jamás erratas; sin
   * esta línea, «cae» era candidata a volverse cualquier palabra
   * del libro a una letra de distancia. Y los verbos sociales de
   * la capacidad (cambiar, invitar, prestar, ayudar, regalar),
   * cuya flexión la reparación acortaba («cambiar» → «cambia») y
   * la puerta dejaba de oír. */
  "cae", "caen", "caer", "vence", "vencen", "toca", "tocan", "falta", "faltan", "llega", "llegan",
  "cambiar", "invitar", "prestar", "ayudar", "regalar", "celular",
  /* TANDA 3c: las palabras reales que la campaña cazó a una
   * deformación de una palabra de puerta — «comparado» se volvía
   * «comprado», «tocar» se acortaba a «toca» (y la trampa de
   * «sin tocar mis ahorros» dejaba de oírse), «carro» se volvía
   * «caro». Son vocabulario de las puertas y de los conceptos:
   * entran al diccionario y dejan de ser candidatas. */
  "comparado", "comparada", "comparacion", "tocar", "carro", "carros",
  /* OLA 68 · EL CARGO SUELTO: «cargo» no estaba y la reparación
   * lo volvía «caro» (la misma trampa que cazó a «carro» en la
   * tanda 3c) — la familia entera nacía sorda y solo la tapaba
   * que el libro de especímenes traía un concepto «Cargo XYZ»
   * que lo protegía. Entran las palabras de su puerta: cargo,
   * charge y sus flexiones, el «cobraron» del dos veces, el
   * «reconozco» del no reconocido y el «duplicado». */
  "cargo", "cargos", "charge", "charges", "charged", "charging",
  "cobraron", "cobrado", "cobrados", "reconozco", "reconoce", "reconocido",
  "recognize", "recognized",
  "duplicado", "duplicados", "duplicada",
  /* OLA 69 · LA TASA: «tasa» no estaba en el diccionario y la
   * reparación la dejaba a una letra de «casa» y de «pasa»; la
   * familia de la tasa nace con su palabra dentro, y «rate» con
   * ella. */
  "tasa", "tasas", "rate", "rates",
  /* La misma ola, su segunda palabra: «suficiente» sostiene la
   * voz de suficiencia de la tasa («¿estoy ahorrando lo
   * suficiente?») y tampoco estaba — «suficente» y «sufisiente»
   * caían en silencio. La onda hostil la cazó el día del estreno. */
  "suficiente", "suficientes",
  /* OLA 72: las palabras de las tareas de la casa sostienen las
   * puertas del «cómo se hace» y tampoco estaban: sin ellas, una
   * errata en «idioma» o «sincronizo» caía en silencio, y una
   * palabra vecina podía robarlas. */
  "idioma", "idiomas", "lengua", "sincronizar", "sincronizo", "sincronia",
  "agrego", "agregar", "marco", "marcar",
  "compartido", "compartida", "compartidos",
  /* LA LECCIÓN DE LA MISMA OLA, cazada por la batería del mundo:
   * «anado» (el añado plegado) NO puede vivir en este diccionario:
   * está a una letra caída de «ganado», y la reparación convertía
   * la palabra correcta «¿cuánto he ganado?» en «anado», matando
   * la dirección de ingreso. Las formas de añadir se leen del
   * texto plegado en su puerta, sin diccionario. Y la raíz: las
   * palabras de dinero del mundo (ganado y su familia) SÍ viven
   * aquí, para que ninguna reparación las toque jamás. */
  "ganado", "ganada", "ganados", "ganar", "gano", "gane", "ganancia", "ganancias",
  /* TANDA DE CANON (puerto 1.3.454): las voces de la familia
   * figurada (que canon ganó en la 1.3.445 y la copia no conoce)
   * son palabras de su puerta y entran al diccionario con la
   * misma ley — «palado» y «dinral» caían en silencio porque su
   * palabra no vivía aquí. Y «advisor», la palabra de la puerta
   * de capacidades en inglés («What can the advisor do?»), cuya
   * errata («Advsor») dejaba la familia muda. Y las del Camino
   * (§19.1, costura de canon): «llego» y «tightest» — «¿Llgo a
   * fin de mes?» y «What's my tighest day?» morían con la
   * intención reach sin reparar. */
  "palmado", "palmada", "pelado", "pelada", "quebrado", "quebrada",
  "dineral", "millonada", "broke", "fortune", "advisor",
  "llego", "tightest", "credit",
];
/* LA TANDA DEL AGENTE (puerto de la Rama, 1.3.457): los verbos y
 * las palabras de los cinco escalones, el modismo semilla y las
 * palabras-número como BLANCO de reparación — «cincenta» dejaba el
 * relato sin monto; como ENTRADA las palabras-número siguen en
 * NEVER_REPAIR, jamás se reparan. La tanda del temporizador y la
 * del imperativo llegan con sus propios paquetes de la Rama, en
 * su turno: aquí entra solo la tanda original de la campaña. */
const AGENT_WORDS: string[] = [
  "movi", "mover", "mueve", "muevo", "mueven", "movido", "archiva", "archivar", "archivado", "archivo", "archivos",
  "corrige", "corregir", "corregido", "programa", "programar", "programado", "programalo", "recuerdame", "recordame",
  "avisos", "aviso", "apaga", "apagar", "apagado", "enciende", "encende", "encender", "pone", "ponelo",
  "modo", "tasa", "tema", "oscuro", "moneda", "estan", "anote", "puse", "quedo", "quede",
  "moved", "received", "receive", "schedule", "scheduled", "change", "currency", "rent", "every",
  "palmado", "tajadas", "reales", "fortuna", "dineral", "vale", "comi", "recibi", "favor",
  "nueva", "nuevo", "misma", "mismo", "bajo", "categoria", "crear",
  "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa", "cien", "ciento", "mil",
];
const GATE_SET = new Set([...GATE_WORDS, ...AGENT_WORDS]);
/* El pliegue fonético: dos palabras que suenan igual comparten
 * forma canónica (b/v, z/s, c ante e/i → s, qu → k, g ante e/i →
 * j). La reparación compara formas canónicas, no letras crudas. */
export function phonFold(w: string): string {
  return w.replace(/qu/g, "k").replace(/b/g, "v").replace(/z/g, "s").replace(/c(?=[ei])/g, "s").replace(/g(?=[ei])/g, "j");
}
export function oneDropAway(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) !== 1) return false;
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < s.length && s[i] === l[i]) i++;
  return s.slice(i) === l.slice(i + 1);
}
export function oneSwapAway(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const d: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i);
  return d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]];
}
/* OLA 67 · LAS PALABRAS QUE NUNCA SON ERRATA: la reparación es
 * ciega al contexto, y hay palabras reales a una deformación de
 * una palabra de puerta que NO son erratas — «saber» se volvía
 * «save» y media cascada se desviaba a ahorros; «parte» se volvía
 * «aparte»; «live» se volvía «libre»; «learned», «earned». Son la
 * clase cerrada de las palabras comunes y gramaticales de los dos
 * idiomas: nunca se reparan, vengan como vengan. */
const NEVER_REPAIR = new Set([
  /* PUERTO A CANON (1.3.454): «persona» y «person» son palabras
   * de función de la caminata de remesas («esa persona» se nombra
   * como frase) — la reparación las volvía «personal» (un
   * concepto del libro a una letra de distancia) y la negativa
   * nombraba «personal» en vez de la frase. Una palabra real con
   * papel en la casa jamás es una errata. */
  "persona", "person",
  /* PUERTO A CANON (1.3.454, segunda vuelta): «medio» es la
   * palabra de las frases de canal («por medio de») y la
   * reparación la volvía «medico» (una subcategoría del libro a
   * una letra) — la caminata perdía la frase y la remesa se
   * respondía sin persona. Y «ago» es la palabra de tiempo del
   * inglés («two months ago»): su pliegue fonético choca con
   * «pago» y la historia perdía el «hace». Misma clase: palabra
   * real con papel en la casa, jamás errata. */
  "medio", "ago",
  /* Y «via» es la preposición de canal del inglés («via Rosa»):
   * el diccionario la «corregía» a «vida» (la palabra-puerta del
   * seguro) y la frase de canal moría igual. */
  "via",
  "saber", "sabe", "sabes", "saben", "sabemos", "parte", "partes", "una", "uno", "unas", "unos",
  "del", "sin", "con", "por", "las", "los", "eso", "esa", "ese", "esto", "esta",
  "live", "learned", "learning", "set", "get", "got", "put", "ten", "day", "may", "yet", "per",
  "end", "ending", "ended", "sending", "costo", "costos",
  /* OLA 67 · LAS PALABRAS-NÚMERO TAMPOCO SON ERRATAS: al entrar
   * «dices» al diccionario, «diez» quedó a una letra caída en
   * fonética (dies/dises) y el diez por ciento se volvió «dices
   * por ciento». Un número dicho en palabras es un DATO, como el
   * dígito: jamás se repara. */
  "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "doce",
  "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa",
  "cien", "ciento", "mil", "millon", "millones",
  "two", "three", "four", "five", "six", "seven", "eight", "nine", "eleven", "twelve",
  "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
  /* «ano» es lo que el pliegue hace de «año»: repararlo a «gano»
   * (una letra de más) mataba la comparación año contra año y de
   * paso inventaba un ingreso. Y «mucho» se acortaba al «much»
   * inglés: una palabra entera del español no es la errata de
   * nadie. */
  "ano", "anos", "mucho", "mucha", "muchos", "muchas",
]);

/* LA RAMA · LA REPARACIÓN EN DOS PASADAS (puerto 1.3.457): el
 * diccionario manda primero y el libro caza lo que el diccionario
 * no conoce. En una sola pasada, «apga» (por «apaga») se reparaba
 * a «paga» — un bolsillo del libro («Súper Paga») a un cambio de
 * sitio — y la orden de apagar los avisos moría: el nombre del
 * libro ganaba por fuerza a la palabra del idioma. Con dos
 * pasadas, la palabra del idioma se cura en la primera y ya no es
 * candidata en la segunda; el nombre mal escrito («Payal») lo
 * sigue cazando la segunda, contra el libro. LA ENTRADA DE LOS
 * ESCALONES DEL AGENTE ES ESTA, la de dos pasadas — la colisión
 * vive también en la estructura por defecto de canon. */
export function repairAgentText(folded: string, protect?: Set<string>, lang?: Lang): string {
  const first = repairGateTypos(folded, undefined, lang);
  return protect && protect.size ? repairGateTypos(first, protect, lang) : first;
}

export function repairGateTypos(folded: string, protect?: Set<string>, lang?: Lang): string {
  /* El universo de candidatas: el vocabulario de las puertas MÁS
   * las palabras del propio libro (protect) — un nombre mal
   * escrito («Payal») se repara contra el nombre verdadero del
   * libro, no solo contra el diccionario. */
  const candSet = protect && protect.size ? new Set([...GATE_SET, ...protect]) : GATE_SET;
  return folded.replace(/[a-zñ]+/g, (tok) => {
    /* OLA 67 · LA REPARACIÓN NO TOCA NOMBRES: la primera corrida
     * reparaba también lo que no era errata — «Ana» se volvía
     * «gana», «Carlos» se volvía «caros» y «set aside» se volvía
     * «sent aside». El libro protege sus propios nombres: las
     * personas, los bolsillos, las cuentas y los conceptos que el
     * usuario sí tiene anotados jamás son erratas. */
    if (tok.length < 3 || GATE_SET.has(tok) || NEVER_REPAIR.has(tok) || (protect && protect.has(tok))) return tok;
    const ct = phonFold(tok);
    /* LA DEFORMACIÓN TIENE FUERZAS, y la más fuerte manda: sonar
     * igual (0) pesa más que dos letras cambiadas de sitio (1), y
     * eso más que una letra caída o de más (2). La primera versión
     * trataba toda cercanía igual y la ambigüedad la paralizaba:
     * «enbiado» no se reparaba porque «enviados» también estaba
     * cerca — pero «enviado» SUENA igual y «enviados» solo está a
     * una letra: gana el sonido. Empate en la fuerza mayor entre
     * dos palabras distintas = ambigüedad honesta, no se toca —
     * con UNA excepción declarada: la familia «cuanto» (cuanto/
     * cuanta/cuantos/cuantas) empata siempre consigo misma, y sus
     * cuatro flexiones abren las mismas puertas; se prefiere la
     * forma base «cuanto», que es la que más puertas oyen. */
    let best: string | null = null;
    let bestStr = 99;
    let tie = false;
    for (const w of candSet) {
      if (w === tok) return tok;
      /* OLA 67 · LAS PALABRAS DEL LIBRO NO ATRAEN PALABRAS CORTAS:
       * «cae» — el verbo de las cuotas — se volvía «cafe» (un
       * bolsillo del libro) por una letra caída, y «¿qué día cae
       * el 28?» moría entera. Una palabra de tres letras es
       * demasiado ambigua para que un nombre del libro la reclame:
       * los nombres se cazan en su punto de uso con la pasada
       * difusa, no aquí. */
      if (!GATE_SET.has(w) && tok.length < 4) continue;
      const cw = phonFold(w);
      let str = -1;
      if (ct === cw) str = 0;
      else if (oneSwapAway(ct, cw) || oneSwapAway(tok, w)) str = 1;
      else if (oneDropAway(ct, cw) || oneDropAway(tok, w)) str = 2;
      if (str < 0) continue;
      if (str < bestStr) { best = w; bestStr = str; tie = false; }
      else if (str === bestStr && best !== w) tie = true;
    }
    if (best === null) return tok;
    /* LA FLEXIÓN CORTA NO GANA A LA PALABRA ENTERA: «ahorar»
     * está a un cambio de sitio de «ahorra» (fuerza 1) y a una
     * letra caída de «ahorrar» (fuerza 2) — pero «ahorra» es el
     * tallo de «ahorrar»: el cambio de sitio fabricó una flexión
     * del mismo verbo, y la palabra entera es la que las puertas
     * oyen («debería ahorrar»). Si la ganadora por fuerza es el
     * tallo (prefijo, ≥4 letras) de una candidata a una letra, se
     * prefiere la entera. «sepnd» no se toca: «send» no es tallo
     * de «spend» ni al revés — ahí la fuerza manda como siempre. */
    if (!tie && bestStr === 1) {
      let fuller: string | null = null;
      for (const w of candSet) {
        if (w.length > best.length && w.startsWith(best) && best.length >= 4) {
          const cw = phonFold(w);
          if (oneDropAway(ct, cw) || oneDropAway(tok, w)) { if (!fuller || w.length < fuller.length) fuller = w; }
        }
      }
      if (fuller) return fuller;
    }
    /* OLA 67 · EL IMÁN DEL PLURAL: las palabras del libro (protect)
     * son candidatas para cazar NOMBRES mal escritos («Payal»), pero
     * una palabra común que es el singular de una palabra del libro
     * no es su errata: «comida» se volvía «comidas» (un bolsillo de
     * Viajes) y el filtro cazaba ese bolsillo vacío en vez de oír
     * la categoría. Si la ganadora es una palabra del libro que solo
     * le añade (o le quita) la ese del plural al token, no se toca:
     * el token es una palabra entera, no una deformación. */
    const pluralMagnet = (w: string) => !GATE_SET.has(w) && (protect?.has(w) ?? false)
      && (w === `${tok}s` || w === `${tok}es` || tok === `${w}s` || tok === `${w}es`);
    if (!tie && best !== null && pluralMagnet(best)) return tok;
    if (tie) {
      const tied = [...candSet].filter((w) => {
        const cw = phonFold(w);
        return (bestStr === 0 && ct === cw) || (bestStr === 1 && (oneSwapAway(ct, cw) || oneSwapAway(tok, w))) || (bestStr === 2 && (oneDropAway(ct, cw) || oneDropAway(tok, w)));
      });
      const tiedReal = tied.filter((w) => !pluralMagnet(w));
      if (!tiedReal.length) return tok;
      if (tiedReal.includes("cuanto") && tiedReal.every((w) => w.startsWith("cuant"))) return "cuanto";
      /* OLA 67 · EL PAR HOMÓFONO save/sabe: el pliegue b→v hace
       * que el «sabe» español y el «save» inglés SUENEN igual, y
       * sus erratas («sae», «svae») empatan entre las dos a la
       * misma fuerza. Es el único par de la tabla donde el empate
       * es entre idiomas, y ahí el idioma de la conversación SÍ
       * desempata: en una frase en inglés la errata es de «save»;
       * en una en español, de «sabe». Sin idioma declarado, el
       * empate se queda sin tocar, como todos. */
      if (lang && tiedReal.includes("save") && tiedReal.includes("sabe")) return lang === "en" ? "save" : "sabe";
      /* OLA 67 · EL EMPATE DENTRO DE LA MISMA FAMILIA DE PALABRA:
       * «gastmos» empata entre «gastamos» y «gastos» — mismo tallo,
       * distinta flexión. Cuando TODAS las empatadas comparten el
       * tallo (4 letras) y hay una forma más larga que las demás,
       * la entera manda: es la que más puertas oyen, y la corta
       * sigue viva como tallo de ella. El empate entre familias
       * distintas («vece»: veces/vence; «cueta»: cuenta/cuesta)
       * no comparte tallo y sigue sin tocarse. */
      const stem4 = tiedReal[0].slice(0, 4);
      if (tiedReal.length >= 2 && tiedReal.every((w) => w.startsWith(stem4))) {
        const longest = tiedReal.reduce((a, b) => (b.length > a.length ? b : a));
        if (tiedReal.filter((w) => w.length === longest.length).length === 1) return longest;
      }
      return tok;
    }
    return best;
  });
}

/* OLA 27 · EL GRAFO — las cercas del tipo y los paseos. El rango de
 * un tiempo: medido es lo más firme; una proyección en cualquier
 * insumo ablanda todo lo que cuelga de ella. */
const TENSE_RANK: Record<AskTense, number> = { medido: 0, stock: 1, proyectado: 2 };
function walkNodes(roots: AskNode[]): Array<{ node: AskNode; parent: AskNode | null }> {
  const out: Array<{ node: AskNode; parent: AskNode | null }> = [];
  const go = (n: AskNode, p: AskNode | null) => { out.push({ node: n, parent: p }); for (const ch of n.children ?? []) go(ch, n); };
  for (const r of roots) go(r, null);
  return out;
}
function findNode(roots: AskNode[], id: string): AskNode | null {
  return walkNodes(roots).find((e) => e.node.id === id)?.node ?? null;
}
/** Las cercas del grafo: devuelve las violaciones (vacío = válido).
 * (1) TIEMPO: un nodo no puede declararse más firme que su insumo
 * más blando. (2) MONEDA: una arista no cambia de moneda sin pasar
 * por un nodo de conversión (su id lo dice). (3) STOCK×FLUJO: un
 * hijo de naturaleza distinta a la del padre exige que el padre
 * declare el cruce en su supuesto — en silencio, no se suma. */
export function validateGraph(roots: AskNode[]): string[] {
  const bad: string[] = [];
  for (const { node: n } of walkNodes(roots)) {
    for (const ch of n.children ?? []) {
      if (TENSE_RANK[ch.tense] > TENSE_RANK[n.tense]) bad.push(`tiempo: «${n.id}» se dice ${n.tense} pero come de «${ch.id}» (${ch.tense})`);
      if (ch.currency !== n.currency && !/conv|tasa|cambio/.test(ch.id) && !/conv|tasa|cambio/.test(n.id)) bad.push(`moneda: «${ch.id}» (${ch.currency}) entra en «${n.id}» (${n.currency}) sin nodo de conversión`);
      if (ch.flow !== n.flow && !n.assumption) bad.push(`stock×flujo: «${ch.id}» (${ch.flow}) entra en «${n.id}» (${n.flow}) sin supuesto declarado`);
    }
  }
  return bad;
}
function tenseWord(lang: Lang, n: AskNode): string {
  if (n.tense === "proyectado") return L(lang, "una proyección: lo que sería si el supuesto se cumple, no lo que hay", "a projection: what would be if the assumption holds, not what there is");
  if (n.tense === "stock") return L(lang, "un saldo: lo que hay en este momento, medido de tu libro", "a balance: what there is right now, measured from your book");
  return n.flow === "flujo"
    ? L(lang, "un flujo medido: dinero que ya se movió, contado línea por línea", "a measured flow: money that already moved, counted line by line")
    : L(lang, "una cifra medida de tu libro, tal como está anotada", "a figure measured from your book, just as recorded");
}
function originWord(lang: Lang, o: "usuario" | "libro" | "regla"): string {
  return o === "usuario" ? L(lang, "vino de ti, de tu pregunta", "it came from you, from your question")
    : o === "libro" ? L(lang, "vino de tu libro, de una cifra anotada", "it came from your book, from a recorded figure")
    : L(lang, "es la regla que define el cálculo", "it's the rule that defines the calculation");
}
function graphAssumptions(roots: AskNode[]): Array<{ node: AskNode; text: string; origin: "usuario" | "libro" | "regla" }> {
  const out: Array<{ node: AskNode; text: string; origin: "usuario" | "libro" | "regla" }> = [];
  const seen = new Set<string>();
  for (const { node: n } of walkNodes(roots)) {
    if (n.assumption && !seen.has(n.assumption.text)) { seen.add(n.assumption.text); out.push({ node: n, text: n.assumption.text, origin: n.assumption.origin }); }
  }
  return out;
}

function porqueResult(state: LedgerState, frame: ConvoFrame | null, lang: Lang, mode?: BookMode, askFrame?: AskFrame | null, raw = ""): BankResult {
  const keep = askFrame ? { frame: askFrame } : {};
  if (!frame) {
    return {
      kind: "answer", family: "porque",
      verdict: L(lang, "Todavía no hay una cifra que explicar en esta conversación: pregúntame primero la cifra y te enseño de dónde sale, pieza por pieza.", "There's no figure to explain yet in this conversation: ask me the figure first and I'll show you where it comes from, piece by piece."),
      pieces: [], note: null, source: [], lines: 0, convo: null,
      ...keep,
    };
  }
  // OLA 31 (Familia 3, Q31-2): EL PORQUÉ RE-JUZGA EL PISO AL TURNO EN
  // QUE SE PIDE — la ley que la Ola 27 selló para el §20 y el
  // ConvoFrame, nacido en la .400 después de la ley, no heredó:
  // porqueResult ni siquiera recibía el modo, y bajar a Esencial o
  // Ritmo con la conversación abierta desplegaba las piezas
  // congeladas de Completo (el patrón con sus personas, la
  // proyección con su ritmo) mientras la pregunta fresca en esos
  // modos nombraba el piso sin una cifra. Lo que el piso niega a la
  // pregunta directa, el porqué no lo entrega un turno después: si
  // el piso ya no alcanza, el porqué NOMBRA el piso en vez de
  // desplegar — y el marco se conserva, para que al volver a subir
  // el despliegue siga vivo (el modo gobierna lo que la cara
  // muestra; el hilo no muere por bajar).
  {
    const floor = convoFrameFloor(frame);
    if (floor && !floor.reached(mode ?? bookMode(state))) {
      return {
        kind: "answer", family: "porque",
        verdict: floor.verdict(lang),
        pieces: [], note: null, source: frame.source, lines: 0,
        convo: frame,
        ...keep,
      };
    }
  }
  const disp = state.settings.display;
  // OLA 27: si la respuesta nació con grafo, el despliegue es POR
  // NODO y recursivo — la pregunta nombra el nodo (por su rótulo o
  // por su cifra), o desciende desde el último nodo desplegado a su
  // pieza mayor; una hoja se dice hoja: es el dato mismo de tu libro.
  // Va DESPUÉS del re-juicio del piso: lo que el piso niega a la
  // pregunta directa, el grafo tampoco lo despliega un turno después.
  if (frame.graph && frame.graph.length) {
    const roots = frame.graph;
    const foldedQ = foldQ(raw);
    const flat = walkNodes(roots).map((e) => e.node);
    let target: AskNode | undefined;
    const asked = amountsIn(raw, disp).filter((a) => a.currency === disp).map((a) => a.minor);
    if (asked.length) target = flat.find((n) => asked.some((m) => Math.abs(m - n.minor) <= 1));
    if (!target) target = flat.find((n) => foldQ(n.label).split(/\s+/).filter((w) => w.length >= 4).some((w) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(foldedQ)));
    if (!target && frame.whyId) {
      const prev = findNode(roots, frame.whyId);
      const kids = prev?.children ?? [];
      if (prev && kids.length) target = kids.reduce((a, b) => (Math.abs(b.minor) > Math.abs(a.minor) ? b : a));
      else if (prev) target = prev;
    }
    const t: AskNode = target ?? roots[0];
    const money = (m: number) => formatMoney(m, disp, lang);
    const door = frame.source[0] ? [{ id: "goto", label: L(lang, "Ver su fuente", "See its source"), target: frame.source[0] }] : undefined;
    if (!t.children || !t.children.length) {
      return {
        kind: "answer", family: "porque",
        verdict: L(lang, `«${t.label}» (${money(t.minor)}) ya no sale de otra cuenta: es ${tenseWord(lang, t)} — es el dato mismo.`, `"${t.label}" (${money(t.minor)}) doesn't come from another calculation: it is ${tenseWord(lang, t)} — the datum itself.`),
        pieces: [{ label: t.label, minor: t.minor }],
        note: frame.source.length ? L(lang, `Su fuente en tu libro: ${frame.source.join(", ")}.`, `Its source in your book: ${frame.source.join(", ")}.`) : null,
        source: frame.source, lines: 0, ...(door ? { actions: door } : {}),
        convo: { ...frame, whyId: t.id },
        ...keep,
      };
    }
    const parts = t.children.map((ch) => `${ch.sign === -1 ? "−" : "+"} «${ch.label}» ${money(ch.minor)}`).join(" ");
    return {
      kind: "answer", family: "porque",
      verdict: L(lang, `«${t.label}» (${money(t.minor)}) es ${tenseWord(lang, t)}. Sale de ${parts}.`, `"${t.label}" (${money(t.minor)}) is ${tenseWord(lang, t)}. It comes from ${parts}.`),
      pieces: t.children.map((ch) => ({ label: ch.label, minor: (ch.sign === -1 ? -1 : 1) * ch.minor })),
      note: [
        t.assumption ? L(lang, `Su supuesto: ${t.assumption.text} — ${originWord(lang, t.assumption.origin)}.`, `Its assumption: ${t.assumption.text} — ${originWord(lang, t.assumption.origin)}.`) : null,
        L(lang, "Puedes seguir preguntando «¿por qué?» sobre cualquiera de estas piezas, o nombrar la cifra que quieras abrir.", "You can keep asking 'why?' about any of these pieces, or name the figure you want opened."),
      ].filter(Boolean).join(" "),
      source: frame.source, lines: t.children.length, ...(door ? { actions: door } : {}),
      convo: { ...frame, whyId: t.id },
      ...keep,
      figure: {
        kind: "arbol",
        points: t.children.map((ch) => ({ label: ch.label, minor: (ch.sign === -1 ? -1 : 1) * ch.minor })),
        note: t.assumption ? t.assumption.text : null,
      },
    };
  }
  const counted = frame.pieces.length
    ? frame.pieces.map((p) => `${p.label} ${formatMoney(p.minor, disp, lang)}`).join(" · ")
    : frame.verdict;
  return {
    kind: "answer", family: "porque",
    verdict: L(lang, `Sale de tu pregunta «${frame.question}», contando estas piezas: ${counted}.`, `It comes from your question "${frame.question}", counting these pieces: ${counted}.`),
    pieces: frame.pieces,
    note: frame.source.length
      ? L(lang, `Su fuente en tu libro: ${frame.source.join(", ")} — la misma que reporta la pantalla de su área; si la cifra estuviera mal, ahí se vería.`, `Its source in your book: ${frame.source.join(", ")} — the same one its area's screen reports; if the figure were wrong, that's where you'd see it.`)
      : null,
    source: frame.source, lines: frame.pieces.length,
    ...(frame.source[0] ? { actions: [{ id: "goto", label: L(lang, "Ver su fuente", "See its source"), target: frame.source[0] }] } : {}),
    convo: frame,
    ...keep,
  };
}

/* OLA 27 · EL LIBRO DE SUPUESTOS Y LA ABLACIÓN — «¿qué asumiste?»
 * lista los supuestos del grafo con su origen; «¿y sin ese supuesto?»
 * recalcula sin el nodo: si el supuesto vino del usuario (un monto
 * traído), la cifra sin él es aritmética exacta sobre el mismo grafo;
 * si el supuesto es la REGLA que define el cálculo, se dice que sin
 * él no hay esa cifra — y se ofrece la cifra medida que sí hay. Sin
 * grafo o sin supuestos, se dice tal cual. En el canon vive sobre el
 * ConvoFrame, como el porqué. */
function supuestosResult(state: LedgerState, frame: ConvoFrame | null, lang: Lang, ablate: boolean, askFrame?: AskFrame | null): BankResult {
  const keep = askFrame ? { frame: askFrame } : {};
  const disp = state.settings.display;
  const money = (m: number) => formatMoney(m, disp, lang);
  if (!frame?.graph?.length) {
    return {
      kind: "answer", family: "porque",
      verdict: L(lang, "Esa respuesta no traía supuestos que mostrar: pregúntame primero una cifra con un «si» o una proyección, y te enseño qué asumí para darla.", "That answer carried no assumptions to show: first ask me a figure with an 'if' or a projection, and I'll show you what I assumed to give it."),
      pieces: [], note: null, source: [], lines: 0, convo: frame ?? null,
      ...keep,
    };
  }
  const assumptions = graphAssumptions(frame.graph);
  if (!assumptions.length) {
    return {
      kind: "answer", family: "porque",
      verdict: L(lang, "Para esa cifra no asumí nada: cada pieza salió medida de tu libro, sin «si» y sin proyección.", "For that figure I assumed nothing: every piece came measured from your book, with no 'if' and no projection."),
      pieces: [], note: null, source: frame.source, lines: 0, convo: frame,
      ...keep,
    };
  }
  if (!ablate) {
    const list = assumptions.map((a) => `«${a.text}» (${originWord(lang, a.origin)})`).join("; ");
    return {
      kind: "answer", family: "porque",
      verdict: L(lang, `Para darte esa cifra asumí esto: ${list}.`, `To give you that figure I assumed this: ${list}.`),
      pieces: assumptions.map((a) => ({ label: a.node.label, minor: a.node.minor })),
      note: L(lang, "Si quieres, pregúntame «¿y sin ese supuesto?» y te recalculo la cifra sin él.", "If you like, ask me 'and without that assumption?' and I'll recompute the figure without it."),
      source: frame.source, lines: 0, convo: frame,
      ...keep,
    };
  }
  // LA ABLACIÓN: primero los supuestos del USUARIO (aritmética sobre
  // el grafo); si solo hay de regla, la honestidad de la definición.
  for (const root of frame.graph) {
    for (const ch of root.children ?? []) {
      if (ch.assumption?.origin === "usuario") {
        const without = root.minor - (ch.sign === -1 ? -1 : 1) * ch.minor;
        return {
          kind: "answer", family: "porque",
          verdict: L(lang, `Sin ese supuesto —${ch.assumption.text}— la cifra sería ${money(without)}: es «${root.label}» sin «${ch.label}». El supuesto era tuyo; la resta es exacta.`, `Without that assumption —${ch.assumption.text}— the figure would be ${money(without)}: it's "${root.label}" without "${ch.label}". The assumption was yours; the subtraction is exact.`),
          pieces: [{ label: root.label, minor: without }],
          note: null, source: frame.source, lines: 0, convo: frame,
          ...keep,
        };
      }
    }
  }
  const ruleAsm = assumptions.find((a) => a.origin === "regla");
  if (ruleAsm) {
    const m: AskNode | null = walkNodes(frame.graph).map((e) => e.node).find((n) => n.tense !== "proyectado" && !n.assumption) ?? null;
    return {
      kind: "answer", family: "porque",
      verdict: L(lang, `Ese supuesto no se puede quitar como se quita un monto: «${ruleAsm.text}» es la regla que define la cifra — sin él, esa cifra no existe.${m ? ` Lo que sí hay, medido, es «${m.label}»: ${money(m.minor)}.` : ""}`, `That assumption can't be removed the way an amount can: "${ruleAsm.text}" is the rule that defines the figure — without it, that figure doesn't exist.${m ? ` What there is, measured, is "${m.label}": ${money(m.minor)}.` : ""}`),
      pieces: m ? [{ label: m.label, minor: m.minor }] : [],
      note: null, source: frame.source, lines: 0, convo: frame,
      ...keep,
    };
  }
  return {
    kind: "answer", family: "porque",
    verdict: L(lang, "Esa respuesta no traía supuestos que mostrar: pregúntame primero una cifra con un «si» o una proyección, y te enseño qué asumí para darla.", "That answer carried no assumptions to show: first ask me a figure with an 'if' or a projection, and I'll show you what I assumed to give it."),
    pieces: [], note: null, source: [], lines: 0, convo: frame,
    ...keep,
  };
}

/* OLA 49 (F6) · EL RENDIMIENTO — «¿cuánto interés he ganado en
 * mis ahorros?» se desviaba al stock: contestaba otra pregunta.
 * El libro anota lo que el usuario aparta, no lo que el banco le
 * paga encima — salvo que el usuario lo anote como ingreso. La
 * forma completa: si hay líneas de ingreso cuyo nombre habla de
 * intereses o rendimiento, se suman y se responde de verdad; si
 * no las hay, la respuesta es de la familia falta: la parte que
 * SÍ se puede contar (el stock de hoy) y el dato ausente con su
 * nombre y su remedio — anótalo como ingreso «Intereses» y aquí
 * se suma solo. */
function rendimientoAnswer(c: Ctx, folded: string): BankResult | null {
  if (!/(cuanto (interes|rendimiento)|interes (ganado|de mis ahorros|en mis ahorros)|rendimiento de (mis )?ahorros|he ganado (en|de) intereses|interest (have i|did i) earn|earned on my savings|yield on my savings|what interest have i earned)/.test(folded)) return null;
  const yieldLines = allLines(c).filter((l) => l.active && l.kind.startsWith("income") && /(interes|rendimiento|yield|interest)/.test(foldQ(l.concept || "")));
  const stock = savingsStock(c.state, c.key);
  if (yieldLines.length) {
    const sum = yieldLines.reduce((a, l) => a + view(c, l), 0);
    return {
      kind: "answer", family: "falta",
      verdict: L(c.lang, `De intereses y rendimiento tienes anotados ${c.money(sum)} — de ${yieldLines.length} línea${yieldLines.length === 1 ? "" : "s"} de ingreso con ese nombre. Tu stock de ahorros hoy es ${c.money(stock.total)}: lo ganado encima es lo que esas líneas dicen, ni un centavo inventado.`, `In interest and yield you have ${c.money(sum)} recorded — from ${yieldLines.length} income line${yieldLines.length === 1 ? "" : "s"} under that name. Your savings stock today is ${c.money(stock.total)}: what was earned on top is what those lines say, not an invented cent.`),
      pieces: [{ label: L(c.lang, "Intereses anotados", "Recorded interest"), minor: sum }],
      note: null, source: ["ahorros.stock", "libros.lineas"], lines: yieldLines.length,
      actions: reportDoor(c, "ahorros.stock", "Ver mis ahorros", "See my savings"),
    };
  }
  return {
    kind: "answer", family: "falta",
    verdict: L(c.lang, `Eso tu libro no lo guarda: tus líneas de ahorro anotan lo que TÚ apartaste — hoy ${c.money(stock.total)} — y no lo que el banco te haya pagado encima. El dato que falta tiene nombre: el rendimiento. Si tu banco te pagó intereses y los anotas como una línea de ingreso llamada «Intereses», aquí se suman solos.`, `Your book doesn't hold that: your savings lines record what YOU set aside — ${c.money(stock.total)} today — not what the bank may have paid you on top. The missing datum has a name: the yield. If your bank paid you interest and you record it as an income line called "Interest", it adds up here on its own.`),
    pieces: [{ label: L(c.lang, "En ahorros (lo apartado)", "In savings (what you set aside)"), minor: stock.total }],
    note: L(c.lang, "Sin ese dato, cualquier «interés ganado» que te diera sería una invención con tu tasa supuesta: eso no se hace.", "Without that datum, any 'interest earned' I gave you would be an invention with an assumed rate: that's not done."),
    source: ["ahorros.stock", "libros.lineas"], lines: 0,
    actions: reportDoor(c, "ahorros.stock", "Ver mis ahorros", "See my savings"),
  };
}

/* OLA 21 · QUÉ DATO TE FALTA — el metaconocimiento (la categoría que
 * la encuesta NLIDB ya nombraba): cuando la pregunta pide un cálculo
 * cuyo dato el libro NO guarda, la respuesta no es el silencio ni la
 * invención: es la parte que SÍ se puede contar, el dato que falta
 * nombrado, y lo que ese dato desbloquearía. Solo entran las formas
 * medidas en silencio al construir la ola. */
function faltaAnswer(c: Ctx, folded: string): BankResult | null {
  if (/(patrimonio|valor neto|cuanto valgo|cuanto vale lo mio|net worth|what am i worth)/.test(folded)) {
    const stock = savingsStock(c.state, c.key);
    /* OLA 44 (D1): el patrimonio resta LA deuda única de debts.ts
     * (totalDebt), no la suma ciega de personas + registro que
     * dejaba fuera préstamos de entidades y saldos en líneas. */
    const debts = totalDebt(c.state, c.today);
    return {
      kind: "answer", family: "falta",
      verdict: L(c.lang, `De lo que tu libro sí guarda: tienes ${c.money(stock.total)} en ahorros y debes ${c.money(debts)} — eso da ${c.money(stock.total - debts)}. Pero tu patrimonio entero suma también el valor de tus bienes (tu casa, tu carro, lo que tengas), y tu libro no guarda valores de bienes: si me dijeras cuánto valen, te doy tu patrimonio neto completo.`, `From what your book does hold: you have ${c.money(stock.total)} in savings and you owe ${c.money(debts)} — that gives ${c.money(stock.total - debts)}. But your whole net worth also adds the value of your things (your house, your car, whatever you own), and your book doesn't hold values for things: tell me what they're worth and I'll give you your full net worth.`),
      pieces: [{ label: L(c.lang, "En ahorros", "In savings"), minor: stock.total }, { label: L(c.lang, "Lo que debes", "What you owe"), minor: debts }],
      note: L(c.lang, "El dato que falta tiene nombre: el valor de tus bienes. Sin él, cualquier «patrimonio» cerrado que te diera sería una invención.", "The missing datum has a name: the value of your things. Without it, any closed 'net worth' I gave you would be an invention."),
      source: ["ahorros.stock", "cobros.debo"], lines: 0,
      actions: reportDoor(c, "ahorros.stock", "Ver mis ahorros", "See my savings"),
    };
  }
  if (/(puntaje|score|historial crediticio)/.test(folded) && /(credito|credit)/.test(folded)) {
    const owePeople = peopleOf(c.state, "owe", c.today).reduce((a, p) => a + p.left, 0);
    const cardBal = cardsOf(c.state).reduce((a, card) => a + cardFigures(c.state, card, c.today).balance, 0);
    const debts = owePeople + cardBal;
    return {
      kind: "answer", family: "falta",
      verdict: L(c.lang, `Tu puntaje de crédito no vive en tu libro: lo calculan los burós de crédito con tu historial de pagos, y Faro no lo guarda ni lo inventa. Lo que tu libro sí sabe de tu deuda: ${debts > 0 ? `debes ${c.money(debts)} en total` : "no debes nada anotado"}.`, `Your credit score doesn't live in your book: the credit bureaus compute it from your payment history, and Faro neither holds it nor invents it. What your book does know about your debt: ${debts > 0 ? `you owe ${c.money(debts)} in total` : "you owe nothing recorded"}.`),
      pieces: debts > 0 ? [{ label: L(c.lang, "Lo que debes", "What you owe"), minor: debts }] : [],
      note: L(c.lang, "Si un día lo anotas como dato, te lo recuerdo tal cual; calcularlo no es cosa de este libro.", "If you ever record it as a datum, I'll remind you of it as-is; computing it isn't this book's business."),
      source: ["cobros.debo"], lines: 0,
    };
  }
  return null;
}

function splitCompound(raw: string): [string, string] | null {
  const legOk = (side: string): boolean => {
    const c = classifyBankQuestion(side);
    // OLA 28 (Familia 2, E28-2): la pata inglesa también tiene forma
    // de pregunta — el oído de la pata solo oía las interrogativas
    // españolas y el clasificador, así que «How much did I spend on
    // shoes and…» no se partía: la cascada respondía la segunda pata
    // y la primera se perdía en silencio, el crimen mismo de la
    // familia compuesta con el idioma cambiado.
    return c.family !== null || /\b(cuanto|cuanta|cuantos|cuantas|cuando|cual|cuales|quien|quienes|como|donde)\b/.test(foldQ(side)) || /\b(how much|how many|when|where|who|which|what)\b/.test(foldQ(side));
  };
  // OLA 60: dos preguntas con sus dos signos («¿…? ¿Y…?») también
  // son una compuesta — la conjunción no es la única costura, y la
  // segunda pregunta se perdía entera (captura de Oscar,
  // 2026-11-24: «¿cuál fue mi último gasto? ¿Y cuál fue mi gasto
  // más grande?» recibía solo la primera, y mal).
  const qLegs = raw.split(/(?<=\?)\s+/).map((s) => s.trim()).filter(Boolean);
  if (qLegs.length === 2 && qLegs[0].length >= 8 && qLegs[1].length >= 8 && legOk(qLegs[0]) && legOk(qLegs[1])) return [qLegs[0], qLegs[1]];
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

/* LA MONEDA SE OYE · EL ECO CONVERSOR (puerto de la Rama Agente,
 * 2026-11-24): el seguimiento desnudo de moneda convierte la cifra
 * TITULAR de la respuesta anterior — la última pieza del marco — con
 * la tasa del libro. La pieza se NOMBRA en la respuesta («lo de
 * «Cierre con el gasto»»): si no era la cifra que el usuario quería,
 * lo ve y lo dice. Con monto nuevo no es eco: manda el conversor
 * llano. En canon el marco conversacional es el ConvoFrame. */
function ecoConversor(state: LedgerState, lang: Lang, frame: ConvoFrame, raw: string): Extract<BankResult, { kind: "answer" }> | null {
  const bare = foldQ(raw).replace(/[¿?¡!.,;]+/g, " ").replace(/\s+/g, " ").trim();
  if (!bare || bare.split(/\s+/).length > 8) return null;
  if (amountsIn(raw, state.settings.display).length) return null;
  const gm = guestMatch(bare);
  let target: AnyCur | null = null;
  if (gm && (/\b(en|in)\s+(\w{1,10}\s+)?$/.test(bare.slice(0, gm.index)) || /^(y|and)\b/.test(bare))) target = gm.code;
  else if (/\b(en|in)\s+(dolares|dollars?|usd)\b/.test(bare)) target = "USD";
  else if (/\b(en|in)\s+(cordobas|nio)\b/.test(bare)) target = "NIO";
  if (!target) return null;
  const pieces = frame.pieces.filter((p) => p.minor !== 0);
  const head = pieces[pieces.length - 1];
  if (!head) return null;
  const display = state.settings.display;
  const targetName = target === "USD" ? L(lang, "dólares", "dollars") : target === "NIO" ? L(lang, "córdobas", "córdobas") : guestName(lang, target);
  if (target === display) {
    return {
      kind: "answer", family: "conversor",
      verdict: L(lang, `Eso ya está en ${targetName}: lo de «${head.label}» son ${fmtAny(lang, head.minor, display)} — es la moneda en que corre tu libro.`, `That's already in ${targetName}: "${head.label}" is ${fmtAny(lang, head.minor, display)} — it's the currency your book runs in.`),
      pieces: [{ label: head.label, minor: head.minor }], note: null, source: ["cambio.mesa"], lines: 0,
    };
  }
  const usd = toUsdCents(state, head.minor, display);
  if (usd === null) return guestNoRateResult(state, lang, String(target));
  const out = fromUsdCents(state, usd, target);
  if (out === null) return guestNoRateResult(state, lang, String(target));
  return {
    kind: "answer", family: "conversor",
    verdict: L(lang, `Lo de «${head.label}» — ${fmtAny(lang, head.minor, display)} — en ${targetName} son ${fmtAny(lang, out, target)}.`, `"${head.label}" — ${fmtAny(lang, head.minor, display)} — in ${targetName} is ${fmtAny(lang, out, target)}.`),
    pieces: [{ label: head.label, minor: head.minor }, { label: fmtAny(lang, out, target), minor: head.minor }],
    note: `${L(lang, "Viene de tu respuesta anterior.", "From your previous answer.")} ${rateNote(state, lang, gm ? gm.code : null)}`,
    source: ["cambio.mesa"], lines: 0,
  };
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
  convo?: ConvoFrame | null,
  askFrame?: AskFrame | null,
): BankResult {
  const withConvo = (r: BankResult, sourceRaw: string): BankResult =>
    r.kind === "answer" && !("convo" in r) ? { ...r, convo: buildConvoFrame(state, key, names, sourceRaw, today, r) } : r;
  // OLA 21 · ¿POR QUÉ? — la procedencia se despliega (MYCIN: WHY/HOW).
  // Se juzga ANTES del seguimiento: «¿por qué?» no cambia un eje,
  // interroga la cuenta anterior. La puerta es estrecha a propósito:
  // exige la anáfora (eso/ese número/dices/sale) o la pregunta desnuda
  // — «¿por qué medio pagué?» no es esto y sigue su camino.
  /* OLA 67 · ESTA PUERTA TAMBIÉN OYE LA ORTOGRAFÍA REPARADA: la
   * puerta del ¿por qué? leía el texto CRUDO y era la única de la
   * casa sorda a la reparación — «dies» por «dices» y «numer»
   * por «number» morían aquí aunque la reparación las curaba.
   * La puerta juzga sobre el texto reparado; la respuesta sigue
   * recibiendo el texto del usuario tal cual. (Puerto 1.3.454:
   * la guarda chargeShape68 de la copia NO viajó — era de la
   * Ola 68; entra con su paquete en el puerto 1.3.461.) */
  const rawGate = repairGateTypos(foldQ(raw), undefined, lang);
  if (!pin) {
    const bare = foldQ(raw).replace(/[¿?¡!.,;]+/g, " ").replace(/\s+/g, " ").trim();
    /* OLA 68: «¿de dónde salió este cargo de $250?» no interroga
     * la procedencia de una cifra del asesor: trae la forma de
     * cargo con monto, y su casa es el cargo suelto (4b9). */
    const chargeShape68 = /(cargo|cargos|charge|charges)/.test(rawGate) && amountsIn(raw).length > 0;
    if (!chargeShape68 && (/^(y )?(por que|porque)$/.test(bare)
      || /(por que (dices|dijiste|dice|sale|es|seria)|de donde (sale|salio|viene)|como (calculaste|lo calculaste|hiciste esa cuenta|se calcula)|why (do you say|did you say|is (it|that))|where does (that|the|this) (number|figure|total|amount) come from|how did you (get|calculate|figure|work out))/.test(rawGate)
      // OLA 27: con grafo vivo, un «¿por qué…?» corto y con blanco
      // («¿por qué el ritmo?», «¿por qué $75?») interroga al grafo.
      || (convo?.graph?.length && /(por que|porque|why)/.test(rawGate) && bare.split(/\s+/).length <= 7))) {
      return porqueResult(state, convo ?? null, lang, mode, askFrame ?? null, raw);
    }
  }
  // OLA 27 · EL LIBRO DE SUPUESTOS: «¿qué asumiste?» y la ablación
  // («¿y sin ese supuesto?») interrogan el grafo del marco, como el
  // porqué — van con él, antes del seguimiento.
  if (!pin && convo) {
    if (/(que asum|que supuest|con que supuest|sin (ese|el) supuesto|sin asumir|what did you assume|what assumption|without that assumption)/.test(rawGate)) {
      return supuestosResult(state, convo, lang, /(sin (ese|el) supuesto|sin asumir|without that assumption)/.test(rawGate), askFrame ?? null);
    }
  }
  // LA MONEDA SE OYE · EL ECO CONVERSOR (puerto de la Rama Agente,
  // 2026-11-24): el seguimiento desnudo de moneda («¿y en dólares?»,
  // «¿cuánto es en euros?») convierte la cifra titular de la
  // respuesta anterior con la tasa del libro — antes de la
  // reescritura de ejes, porque no cambia un eje: cambia la MONEDA
  // de la misma cifra.
  if (!pin && convo) {
    const eco = ecoConversor(state, lang, convo, raw);
    if (eco) return { ...eco, convo: buildConvoFrame(state, key, names, raw, today, eco) };
  }
  // OLA 19: el seguimiento se reescribe sobre el marco ANTES que
  // cualquier otra lectura — es una pregunta sobre la pregunta
  // anterior, no una pregunta nueva.
  if (!pin && convo) {
    const rw = followUpRewrite(state, key, names, convo, raw, lang, today);
    if (rw) {
      const r = answerSingle(state, key, lang, names, rw.question, parseCtx, today, undefined, mode, learned);
      if (r.kind === "answer") {
        // OLA 28: la horquilla nueva se nombra por los ejes que el
        // seguimiento cambió — la pila de la caja la guarda por ese
        // nombre (el nombre que buildConvoFrame deriva de la
        // pregunta queda como respaldo).
        const nf = buildConvoFrame(state, key, names, rw.question, today, r);
        const convo: ConvoFrame = rw.fork ? { ...nf, forkName: rw.fork } : nf;
        // OLA 32 (Familia 3, Q32-3): sin cambio de eje no hay nota de
        // cambio — la respuesta se sirve tal cual, sin el eco.
        if (rw.echo === null) return { ...r, convo };
        const echo = L(lang, `Viene de tu pregunta anterior: ${rw.echo}.`, `From your previous question: ${rw.echo}.`);
        return { ...r, note: r.note ? `${echo} ${r.note}` : echo, convo };
      }
    }
  }
  if (!pin) {
    const legs = splitCompound(raw);
    if (legs) {
      const a = answerSingle(state, key, lang, names, legs[0], parseCtx, today, undefined, mode, learned);
      const b = answerSingle(state, key, lang, names, legs[1], parseCtx, today, undefined, mode, learned);
      if (a.kind === "answer" && b.kind === "answer") {
        const actions = [...(a.actions ?? []), ...(b.actions ?? [])].slice(0, 3);
        return withConvo({
          kind: "answer", family: a.family,
          verdict: `${a.verdict} ${b.verdict}`,
          pieces: [...a.pieces, ...b.pieces].slice(0, 5),
          note: a.note ?? b.note,
          source: [...new Set([...a.source, ...b.source])],
          lines: a.lines + b.lines,
          ...(actions.length ? { actions } : {}),
        }, raw);
      }
      const good = a.kind === "answer" ? a : b.kind === "answer" ? b : null;
      if (good && good.kind === "answer") {
        const lost = (a.kind === "answer" ? legs[1] : legs[0]).replace(/[¿?]+$/g, "").trim();
        const named = L(lang,
          `De tu otra pregunta — «${lost}» — no tengo cómo responderla con lo que tu libro guarda; no la pierdo en silencio.`,
          `Your other question — "${lost}" — I have no way to answer from what your book holds; I won't lose it in silence.`);
        return withConvo({ ...good, note: good.note ? `${good.note} ${named}` : named }, raw);
      }
      // Ninguna pata respondió: la pregunta entera merece su oportunidad.
    }
  }
  const single = answerSingle(state, key, lang, names, raw, parseCtx, today, pin, mode, learned);
  // OLA 28 · EL PRESUPUESTO DE REPARACIÓN: si la frase tenía forma de
  // seguimiento y ni la reescritura ni el motor la pudieron servir,
  // el silencio se convierte en reparación CONTADA sobre el marco:
  // la primera vez se explican los ejes que sí se pueden cambiar; a
  // la segunda, el camino deja de ser verbal — la puerta del área
  // donde la cifra vive. Una pregunta nueva que el motor SÍ responde
  // jamás pasa por aquí: la reparación solo sustituye al silencio.
  if (single.kind === "unknown" && convo && !pin && followUpShaped(raw)) {
    return repairResult(convo, lang, askFrame ?? null);
  }
  return withConvo(single, raw);
}

/* ¿Tiene esta frase forma de seguimiento? Corta, y abre con «y»/«no»
 * o nombra un eje (período, exclusión). Sin esa forma, un silencio es
 * solo un silencio y sigue su camino de siempre. */
function followUpShaped(raw: string): boolean {
  const f = foldQ(raw).replace(/[¿?¡!.,;]+/g, " ").replace(/\s+/g, " ").trim();
  if (f.split(/\s+/).length > 8) return false;
  return /^(y|no)\b/.test(f) || periodPhraseIn(f) !== null || /\bsin [a-z]/.test(f);
}

function repairResult(frame: ConvoFrame, lang: Lang, askFrame?: AskFrame | null): BankResult {
  const keep = askFrame ? { frame: askFrame } : {};
  const repairs = (frame.repairs ?? 0) + 1;
  const exhausted = repairs >= 2;
  return {
    kind: "answer", family: "porque",
    verdict: exhausted
      ? L(lang, `Llevamos ${repairs} intentos de ajustar tu pregunta anterior («${frame.question}») y no logro aplicarlo con palabras. El camino seguro es tocar la cifra donde vive: abre su área y desde ahí la ves entera — la puerta está abajo.`, `We've made ${repairs} attempts to adjust your previous question ("${frame.question}") and I can't apply it in words. The sure path is to tap the figure where it lives: open its area and see it whole — the door is below.`)
      : L(lang, `Eso suena a un ajuste sobre tu pregunta anterior («${frame.question}»), pero no logro aplicarlo tal como vino. Los ejes que sí puedo cambiar de una pregunta son el período («¿y el mes pasado?»), la persona o la cuenta si la pregunta las traía, o excluir un concepto de un total («sin la casa»). Dímelo en esa forma y lo recalculo.`, `That sounds like an adjustment to your previous question ("${frame.question}"), but I can't apply it as it came. The axes I can change on a question are the period ("and last month?"), the person or account if the question carried them, or leaving a concept out of a total ("without the house"). Say it in that shape and I'll recompute it.`),
    pieces: frame.pieces,
    note: null,
    source: frame.source, lines: 0,
    ...(exhausted && frame.source[0] ? { actions: [{ id: "goto", label: L(lang, "Abrir donde vive la cifra", "Open where the figure lives"), target: frame.source[0] }] } : {}),
    convo: { ...frame, repairs },
    ...keep,
  };
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
  /* OLA 67: el libro protege sus nombres de la reparación de
   * erratas — personas (me deben / les debo / remesas), bolsillos
   * y cuentas por su nombre, y los conceptos anotados. */
  const protect67 = new Set<string>();
  const addWords67 = (s: string) => { for (const w of foldQ(s).split(/[^a-z0-9]+/)) if (w.length >= 3) protect67.add(w); };
  for (const p of peopleOf(state, "owed", today)) addWords67(p.name);
  for (const p of peopleOf(state, "owe", today)) addWords67(p.name);
  for (const p of state.remitPeople ?? []) addWords67(p.name);
  for (const cat of state.structure.categories) for (const sub of cat.subs) { addWords67(names.sub(sub.id)); if (sub.customName) addWords67(sub.customName); }
  for (const item of state.structure.catalog) { addWords67(names.catalog(item.id)); if (item.customName) addWords67(item.customName); }
  for (const m of Object.values(state.months)) for (const l of m.lines) if (l.concept) addWords67(l.concept);
  let folded = normalizeEs(repairGateTypos(foldQ(raw), protect67, lang));
  /* OLA 67 · LA FORMA DE LA PREGUNTA NO ES LA PREGUNTA: el
   * «quiero saber» / «dime» / «decime» que abre la forma
   * indirecta y el «por favor» / «please» que la cierra son
   * envoltura, no contenido — y rompían las puertas ancladas al
   * inicio («¿tengo billete?» desnuda) y las de frase exacta. Se
   * retiran aquí, una sola vez, antes de la cascada. Y el texto
   * reparado (rawR) es el que leen los lectores de premisas y el
   * delegado heredado: sus montos en palabras y sus verbos
   * también merecen la ortografía reparada («doscintos»,
   * «ahoro») — el delegado recibía el texto crudo y sus familias
   * (spend/free/left/how) eran las únicas sin reparación. */
  folded = folded
    .replace(/^([¿¡]\s*)?(dime|decime|quiero saber|quisiera saber|me gustaria saber)\s+/, "$1")
    .replace(/\s*\b(por favor|please)\b\s*/g, " ")
    .replace(/\s+\?$/, "?")
    .trim();
  /* OLA 67 · EL TEXTO REPARADO CONSERVA LA VOZ DEL USUARIO: los
   * lectores de premisas leen rawR, y su primera versión era el
   * texto PLEGADO — los rótulos salían sin acentos ni mayúsculas
   * («mama» por «mamá», «cumpleanos» por «cumpleaños») porque el
   * lector de montos nombra las piezas con las palabras del
   * usuario. La reparación se aplica palabra por palabra SOBRE el
   * texto original: la palabra que no se repara queda tal cual la
   * escribió el usuario, con su acento y su mayúscula; solo la
   * palabra reparada — que era una errata — sale en su forma de
   * diccionario. */
  const repairRawText = (text: string): string => text.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g, (tok) => {
    const f = foldQ(tok);
    if (!/^[a-zñ]+$/.test(f)) return tok;
    const r = repairGateTypos(f, protect67, lang);
    return r === f ? tok : r;
  });
  const rawR = repairRawText(raw);
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
  // OLA 63: si la fuente nombrada tras «de» es una CLASE o bolsillo
  // del ahorro (mi retiro, mi emergencia, mi meta, mis ahorros) y no
  // una cuenta, el escenario no es cuenta-origen: su casa es la rama
  // de movimientos nombrados de ahorrosAnswer, que camina contra la
  // cifra de esa clase. Cede aquí y cae por la cascada hasta ella.
  if (/(si sacara|si saco|si retiro|que impacto|what if i (take|took|withdraw)|if i (take|took|withdraw))/.test(folded)
    && !/(de|del|from)\s+(mi\s+|mis\s+|el\s+|la\s+|the\s+|my\s+)?(retiro|emergencia|emergencias|meta|fondo|ahorros|retirement|emergency|goal|savings)\b/.test(folded)) {
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
  // OLA 67 (puerto 1.3.454): la costura lee el texto REPARADO
  // (rawR) — «¿Llgo a fin de mes?» no trae la intención reach en
  // crudo y caía a otra familia; el Camino merece la misma
  // ortografía reparada que el resto de la casa.
  if (parseQuestion(rawR, parseCtx)?.intent === "reach") {
    const base: AskResult = answerQuestion(state, key, lang, names, rawR, parseCtx, today, c.mode);
    if (base.kind === "answer") {
      return {
        kind: "answer", family: "reach", verdict: base.verdict,
        pieces: base.pieces, note: base.note, draft: base.draft,
        source: ["asesor.lectura"], lines: 0,
      };
    }
    return { kind: "unknown" };
  }
  // 0-- · RAMA AGENTE E2 · LA PREGUNTA EN FIGURADO («¿estoy palmado?»,
  // «¿tengo un dineral?») se juzga ANTES que la capacidad: su voz es
  // estrecha (la figura + la forma de pregunta) y ninguna otra familia
  // la oye — sin este paso cae en silencio o en la queda a secas.
  {
    const fig = figuradaAnswer(c, folded);
    if (fig) return fig;
  }

  // 0- · OLA 37 · LA CAPACIDAD: «¿podría asumir el gasto?» con sus
  // montos (de una vez y los que se repiten) se juzga ANTES que el
  // hipotético y que el delegado — el delegado tomaba solo el primer
  // monto y decía «sí» a planes que no caben. ASIENTO DE CANON: en
  // la copia esta llamada abre answerSingle; aquí se sienta DESPUÉS
  // de la costura 0r, porque el Camino (§19.1) es trabajo asentado
  // de canon y su territorio no se toca — las voces de la capacidad
  // no pisan las del alcance (sin montos no hay capacidad que juzgar
  // contra una fecha, y con montos la pregunta ya no es del Camino).
  const cap = capacidadAnswer(c, folded, rawR);
  if (cap) return cap;

  // 0a1 · LA TASA (ola 69): la tasa de ahorro y su juicio se juzgan
  // antes que el costo de vida — «¿qué porcentaje de mi ingreso
  // ahorro?» es la tasa preguntada por su nombre técnico, y el
  // costo de vida (0a2) la leía como la parte de un nombre que no
  // trae y respondía que bajo ese nombre no se mueve dinero. La
  // parte de un nombre SÍ nombrado («¿qué porcentaje de mi
  // ingreso se va en el súper?») no trae voz de ahorro y sigue
  // siendo del costo de vida, intacta.
  {
    const ts = tasaAhorroAnswer(c, folded);
    if (ts) return ts;
  }

  // 0a2 · OLA 42 · EL COSTO DE VIDA Y LAS PROPORCIONES: voces
  // estrechas y cercadas (vivir, la parte de lo que gano, cuánto
  // cuesta X al mes, ¿me alcanza con lo que gano?) — antes que
  // gustos, cuyo need-amount se quedaba con la última.
  {
    const cv = costoVidaAnswer(c, folded);
    if (cv) return cv;
  }

  // 0a3 · OLA 46 (F1) · EL TOTAL DE TODO: «¿cuánto dinero tengo en
  // total?» — la suma de las tres bolsas (queda + ahorros + lo que
  // me deben), con su borde declarado. Su puerta trae «en total»:
  // la queda a secas sigue siendo del delegado.
  {
    const tt = totalTodoAnswer(c, folded);
    if (tt) return tt;
  }
  // 0b · HIPOTÉTICOS Y CALCULADORA (ola 4): «si…» con números TRAÍDOS
  // manda sobre las familias del libro — la pregunta no habla de lo
  // anotado sino de un escenario, y responderla con la queda a secas
  // sería otro desvío. Primero el hipotético (aplica al libro), luego
  // la calculadora pura (no lo toca).
  // OLA 28 (Familia 2, E28-2): la puerta aprende las formas que las
  // familias de dentro ya oían y la puerta no dejaba pasar —
  // «conviert-» (conversor), «how much is» (conversor), «what day /
  // what date» (calendario), «how many months» y «runway» (respaldo),
  // «need to save» (meta) y «split» (reparto). Cada familia se
  // sigue juzgando a sí misma ahí dentro: la puerta ancha no roba,
  // porque quien no es de la casa devuelve null y la cascada sigue.
  if (/\bsi\b|if i|divid|repart|por ciento|porcentaje|percent|%|cuanto es|cuanto son|cuanto seria|convert|conviert|how much is|how many months|runway|what day|what date|split|need to save|cuantos dias|en cuantos|que dia|que fecha|a la semana|al mes|dejo|dejara|colchon|respaldo|cuantos meses|cuanto.*ahorrar|tardaria|juntar|a como esta|tipo de cambio|me entraron|me depositaron|eramos|la cuenta fue|cuanto.{0,12}toca|aguanto|sin ingresos|sin trabajo|pierdo mi|me despiden|how long|without income|lose my job|no me entra|no entra|me bajan|bajan el sueldo|salary (drops|cut)|pay cut|doesn|come in|no vendo|vendo|how much|how many|\bplus\b|\+|\bmas\b/.test(folded)) {
    const h = hipoteticoAnswer(c, folded, rawR, pin?.accountId);
    if (h) return h;
    // OLA 43: la sensibilidad del INGRESO — el hipotético solo
    // sustituía gastos; la baja del sueldo es su espejo.
    const is43 = ingresoSensibilidadAnswer(c, folded, raw);
    if (is43) return is43;
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
    // OLA 28 (Familia 2, E28-2): el contrafactual se juzga ANTES que
    // la calculadora. Su forma («si dejara de gastar…») es más
    // específica que la cadencia («40 al mes → en un año»), y la
    // calculadora se quedaba con la canónica contrafactual que traía
    // monto y plazo, respondiendo la aritmética sin la familia. La
    // calculadora no pierde nada suyo: sin la forma «si…» el
    // contrafactual devuelve null y ella sigue dueña de su casa.
    const cf = contrafactualAnswer(c, folded, raw);
    if (cf) return cf;
    // OLA 43: el contrafactual del INGRESO — «si no me entra el
    // negocio» es el espejo de «si dejo de gastar en…».
    const ic43 = ingresoContrafactualAnswer(c, folded);
    if (ic43) return ic43;
    const calc = calculadoraAnswer(c, folded, rawR);
    if (calc) return calc;
    // OLA 8: el contrafactual MIDE el monto en el historial en vez de
    // traerlo; el colchón y la meta inversa despejan sobre el stock.
    const rb = respaldoAnswer(c, folded);
    if (rb) return rb;
    // OLA 15: el simulador ensaya el pago traído contra el motor del
    // propio Plan — y su segunda forma camina hasta el día D.
    const sim = simuladorAnswer(c, folded, rawR);
    if (sim) return sim;
  }
  // 0d · EL SEGURO DE VIDA (ola 64): la frase es inconfundible y su
  // casa es la pieza — antes de que historia lo lea como un gasto
  // más o ahorros lo sume como si la póliza fuera un bolsillo.
  {
    const sg = seguroAnswer(c, folded);
    if (sg) return sg;
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
    const r = confirmacionAnswer(c, folded, rawR);
    if (r) return r;
  }
  // 1 · AHORROS antes que todo lo genérico (la cura del desvío) — pero
  // «sin tocar mis ahorros» es free: su trampa manda sobre la palabra.
  const isFreeTrap = /sin (tocar|afectar|mover|usar).{0,24}(ahorro|apartad|guardad)|without touching/.test(folded);
  // OLA 27 (Familia 7, Q27-C2 de Cara): LA GUARDA DE OBJETO DE
  // AHORROS. En inglés «save» también guarda PREGUNTAS: «How do I save
  // a question?» y «Where do I see my saved questions?» casaban con el
  // verbo de ahorrar y recibían el saldo de ahorros con todas sus
  // cifras, una pantalla antes de la puerta de faro-mismo donde vive
  // su función (settings.ask-presets). La especie de «guardo» de la
  // Ola 26 con el idioma cambiado: la guarda mira el OBJETO — si lo
  // que se guarda o se busca es una pregunta (o la fila «questions at
  // hand» misma), la captura de ahorros cede y la pregunta sigue su
  // camino hasta el mapa. Guardar DINERO no nombra ninguna pregunta:
  // los controles de ahorros no se mueven.
  const esGuardarPregunta = /(save[sd]?|saving)\b[^?]{0,24}\bquestions?\b|\bquestions? at hand\b/.test(folded);
  // OLA 28 (Familia 2, E28-2): el pretérito entra por su forma
  // exacta — «aparté»/«guardé» (plegados: aparte/guarde) morían en
  // la puerta de su propia casa, que solo oía «apartad»/«guardad».
  // El tallo desnudo «guard» NO entra: plegado, «guardo» es a la vez
  // «guardó» (dinero) y «¿cómo guardo una pregunta?» (la especie de
  // la Ola 26 de arriba) — la forma exacta separa los dos mundos
  // sin tocar el objeto-guardia que ya manda.
  // OLA 61: la puerta gana las clases por su nombre (emergencia,
  // meta) — «¿cuánto aparté para emergencias este mes?» y «¿cuánto
  // me falta para mi meta?» no traen la palabra «ahorro» y morían
  // fuera. Y su guarda espejo: el gasto SOBRE una clase («¿cuánto
  // gasté en emergencias?») es de historia, no del stock — sin voz
  // de ahorro, esta puerta no se abre.
  const gastoClassOnly = /(gaste|gasto|gastado|gastando|spent|spending)/.test(folded) && !/(ahorr|apart|guard|set aside|saved|savings)/.test(folded);
  // OLA 63: «¿puedo sacar $100 de PayPal?» no trae la palabra
  // «ahorro»: trae el NOMBRE de un bolsillo o cuenta del libro y un
  // verbo de movimiento. La puerta se abre si el nombre resuelve
  // contra el libro — un nombre genérico («mi cuenta») no abre
  // nada, porque no nombra ningún bolsillo de este libro.
  const namedMove63 = (() => {
    if (!/(sacar|retirar|saco|aparto|apartar|meter|take out|withdraw|add|put)/.test(folded)) return false;
    const st = savingsStock(c.state, c.key);
    for (const row of st.series.values()) {
      const nm = c.names.sub(row.subId);
      if (!nm) continue;
      const f = foldQ(nm).trim();
      if (f.length >= 3 && new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded)) return true;
    }
    return false;
  })();
  // OLA 62: la comparación entre dos blancos del ahorro («¿tengo
  // más en el Banco o en PayPal?») tampoco trae la palabra «ahorro»:
  // trae la voz de comparación y dos blancos que el libro resuelve
  // (una clase por su palabra o un bolsillo por su nombre).
  const cmpGate62 = (() => {
    if (!/(mas|more|mayor)/.test(folded) || !/\bo\b|\bor\b/.test(folded)) return false;
    if (/(emergencia|retiro|\bmeta\b|cuentas|apartado|emergency|retirement|goal|accounts)/.test(folded)) return true;
    const st = savingsStock(c.state, c.key);
    for (const row of st.series.values()) {
      const nm = c.names.sub(row.subId);
      if (!nm) continue;
      const f = foldQ(nm).trim();
      if (f.length >= 3 && new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded)) return true;
    }
    return false;
  })();
  // OLA 67 (traída adelante por la 62, puerto 1.3.453): «¿de qué
  // cuenta saco…?» / «which account should I take $20 from?» es de
  // la cuenta-origen (paso 4), no del stock — la alternación «which
  // account» de esta puerta (ola 62) la robaba y el fallback
  // contestaba el total de ahorros a una pregunta de origen. La voz
  // de origen cierra esta puerta. (El resto de la ola 67 llega con
  // su paquete; esta guarda y su hermana de deuda se adelantan
  // porque la alternación de la 62 las necesita hoy: la cerca F2 de
  // modos-ola28 lo probó en canon.)
  const origenVoice67 = /(de que cuenta|de donde saco|from which account|which account (should|do|can) i|where should i take)/.test(folded);
  // OLA 67 (traída adelante por la 62, puerto 1.3.453): «¿en cuál
  // cuenta debo más?» / «which account do I owe the most on?» es el
  // RANKING de deudas (paso 7), no el stock — esta puerta se abría
  // por «cuenta» y el fallback contestaba el total de ahorros a una
  // pregunta de deuda. La voz de deuda con superlativo y blanco de
  // cuenta/tarjeta cierra esta puerta.
  const deudaRank67 = /(debo|debe|deben|deuda|deudas|owe|owes|debt)/.test(folded) && /(mas|most|mayor)/.test(folded) && /(cuenta|tarjeta|card|account)/.test(folded);
  if (!isFreeTrap && !esGuardarPregunta && !gastoClassOnly && !origenVoice67 && !deudaRank67 && (namedMove63 || cmpGate62 || ((/(ahorr|guardad|guarde|apartad|aparte|colchon|fondo|savings|saving|save|set aside|cushion|emergency fund|emergencia|emergency|\bmeta\b|goal|retiro|retirement)/.test(folded) && /(cuanto|que|como|how much|how|suficiente|me falta|basta|puedo|podria|deberia|conviene|bien|sacar|retirar|should|can i|am i|incrementando|creciendo|aumentando|demasiados|growing|increasing|too much|overspending|\bmas\b)/.test(folded)) || /(cuanto (tengo|hay|queda) en|how much (do i have|is) in)/.test(folded) || /(en que cuenta|en cual cuenta|cual de mis (ahorros|cuentas|bolsillos)|which account|which of my (savings|accounts))/.test(folded)))) {
    // OLA 49 (F6): el rendimiento se juzga antes que el stock —
    // «¿cuánto interés he ganado en mis ahorros?» no es una
    // pregunta por el stock, y recibirlo era contestar otra cosa.
    const rd = rendimientoAnswer(c, folded);
    if (rd) return rd;
    // LA GUARDA DE HORIZONTE (ola 9, CAZA-TIEMPO clase 4; doctrina de
    // Oscar 2026-11-21: los tres tiempos no se mezclan sin intención).
    // «¿Cuánto tendré ahorrado en 6 meses si sigo así?» recibía el stock
    // de HOY como si fuera el futuro. Una pregunta de horizonte futuro
    // jamás se responde con la cifra del presente: su casa es el
    // proyector (familia reach, viva en canon) — aquí, silencio honesto
    // antes que un presente disfrazado de futuro.
    // OLA 60: la premisa «si ahorro…» a secas NO es voz de futuro —
    // «Si ahorro quinientos, ¿estaría incrementando mis ahorros?»
    // juzga el PRESENTE con una premisa, y la guarda lo mataba en
    // silencio antes de que ahorrosAnswer pudiera juzgarlo. La
    // premisa solo cuenta como futuro si la pregunta PIDE un estado
    // futuro (cuánto/tendr/para/horizonte); las voces fuertes
    // (tendr, «en N meses», «a fin de año») mandan como siempre.
    const futureVoice = /(tendr|habr|en (\d+|dos|tres|cuatro|cinco|seis|doce) meses|en un ano|de aqui a|a fin de ano|para fin de|will i have|in (\d+|two|three|four|five|six|twelve) months|by the end of)/.test(folded)
      || (/(si sigo|si ahorro)/.test(folded) && /(cuanto|voy a|para |a fin|en (un|una|este|ese) (ano|mes)|\bmeses\b|\banos\b)/.test(folded));
    if (futureVoice) {
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
      // OLA 63: «¿cuánto tendría EN EMERGENCIAS si aparto $100
      // más?» trae «tendría» pero su «en» no es un horizonte: es la
      // clase diana del movimiento. Sin horizonte legible y con un
      // movimiento nombrado hacia una clase, la guarda no mata en
      // silencio: ahorrosAnswer juzga el movimiento contra la clase.
      const classMove63 = /(en|a|hacia|de|del|para|in|to|from)\s+(mi\s+|mis\s+|el\s+|la\s+|the\s+|my\s+)?(emergencias?|retiro|meta|emergency|retirement|goal)\b/.test(folded)
        && /(apart|sacar|retir|meter|agre|sumar|ahorr|sav|add|take|withdraw|set aside|put|move|mover)/.test(folded);
      if (horizon === null && !classMove63) return { kind: "unknown" };
      if (horizon === null) return ahorrosAnswer(c, folded, raw);
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
    return ahorrosAnswer(c, folded, raw);
  }
  // 1b · LA REGLA (ola 12): los tres cubos contra la 50·30·20 — antes
  // de gustos, que es su cubo suelto (reglaAnswer cede ante «gustos»).
  {
    const r = reglaAnswer(c, folded);
    if (r) return r;
  }
  // 2 · GUSTOS (capacidad o chequeo con la palabra gustos/antojos).
  // OLA 28 (Familia 2, E28-2): «treat» singular entra — la puerta
  // solo oía el plural y «a treat» caía al delegado de spend.
  if (/(gustos|antojos|treats?|wants)/.test(folded)) return gustosAnswer(c, folded, raw, parseCtx);
  // 3 · YA PAGUÉ (la premisa se juzga primero).
  // OLA 28 (Familia 3, E28-3): EL PARECIDO NO ES UN PAGO. «Have I
  // paid something like this before?» y «¿Ya pagué algo parecido?»
  // no nombran un pago: preguntan por un PARECIDO, y la familia que
  // lo juzga es identidad — declarada, en silencio honesto en los
  // dos idiomas. La puerta de ya-pague cede ante la palabra del
  // parecido y la pregunta sigue hasta su silencio; el pago
  // nombrado («¿ya pagué el internet?») no trae parecido y se juzga
  // como siempre.
  // OLA 50 (la Caza III): la forma de CONTEO no es una premisa de
  // estado — «How many times did I pay…?» trae «did I pay» dentro y
  // esta puerta se lo robaba. El conteo es de frecuencia y se juzga
  // en su paso. (La guarda de «parecido» es de canon y se queda.)
  if (!/(parecid|similar|something like|like this|algo asi)/.test(folded) && /(ya pague|ya page|did i (already )?pay|have i paid)/.test(folded) && !/(how many times|cuantas veces)/.test(folded)) return yaPagueAnswer(c, folded);
  // 4 · CUENTA-ORIGEN (¿de qué cuenta…? con monto).
  // OLA 28 (Familia 2, E28-2): el superlativo no es cuenta-origen —
  // «Which account do I owe the most on?» casaba con «which account»
  // y recibía un need-amount, cuando su casa es el ranking (paso 7):
  // con «más/most» la puerta cede y la pregunta sigue a su familia.
  // OLA 68: «¿de qué cuenta SALIÓ el cargo de $12.34?» no pregunta
  // de dónde sacar: pregunta la fuente de un cargo ya anotado, en
  // pasado y con la palabra cargo — es del cargo suelto (4b9).
  if (/(de que cuenta|de donde saco|which account|where should i take)/.test(folded) && !/(mas|most)/.test(folded)
    && !((/(cargo|charge)/.test(folded) && /(salio|fue|vino|came from|was charged)/.test(folded)))) return cuentaOrigenAnswer(c, raw, parseCtx, pin?.accountId);
  // 4b · CONTEO (ola 2): «¿cuántas X…?» cuenta un ciudadano del mapa;
  // su patrón (cuántas/cuántos + nombre) no pisa a ninguna otra familia.
  {
    const r = conteoAnswer(c, folded);
    if (r) return r;
  }
  // 4b2 · LAS SERIES (ola 22): la subida medida contra la mediana de
  // la propia serie, la cuota que no llegó y el costo anualizado —
  // antes de frecuencia, cuya rama vieja de subidas (primer vs último
  // mes) era la medida que esta ola reemplaza.
  {
    const r = seriesAnswer(c, folded);
    if (r) return r;
  }
  // 4b2 · FRECUENCIA (ola 12): «¿cuántas veces…?», «¿cada cuánto…?»,
  // «¿qué suscripciones tengo?» — el conteo y la cadencia de un filtro.
  {
    const r = frecuenciaAnswer(c, folded);
    if (r) return r;
  }
  // 4b9 · LA COLA LARGA (ola 35): el estado del ítem, la identidad
  // del cargo y la ausencia en el libro — las preguntas de
  // BANKING77 que no piden cálculo. Antes de las deudas planas:
  // «¿cómo va el préstamo de Carlos?» no es «¿cuánto debo?».
  {
    const es = estadoAnswer(c, folded);
    if (es) return es;
    // OLA 68: el cargo suelto (el comercio, el no reconocido, el
    // cobrado dos veces, el origen, la fuente) se juzga antes que
    // la identidad: su puerta trae la palabra cargo y una de esas
    // voces, y la forma de identidad («¿qué es este cargo?») no
    // trae ninguna, así que no se pisan.
    const cg = cargoAnswer(c, folded, rawR);
    if (cg) return cg;
    const idn = identidadAnswer(c, folded, raw);
    if (idn) return idn;
    const au = ausenciaAnswer(c, folded);
    if (au) return au;
  }
  // 4c · DEUDAS PLANAS (ola 9, CAZA-DIARIA C5): «¿cuánto debo en
  // total?», «¿cuánto me debe Ana?», «¿a quién le presté?» — sin
  // superlativo ni «cuántas»: la puerta llana de peopleOf/loansOf/
  // tarjetas, con la contradicción de dirección dicha.
  // OLA 31: el comparador de órdenes se juzga antes que las deudas
  // planas — su puerta («qué orden», «avalancha») es inconfundible.
  {
    // OLA 34: la tanda (el objeto que no existe — FALTA lo nombra)
    // y la antigüedad (las cubetas de edad) se juzgan antes: sus
    // puertas son inconfundibles y ninguna debe caer en las deudas
    // planas ni disfrazarse de otra familia.
    const td = tandaAnswer(c, folded);
    if (td) return td;
    const ag = antiguedadAnswer(c, folded);
    if (ag) return ag;
    // OLA 40: las prioridades y el interés se juzgan antes — sus
    // puertas («qué pago primero», «cuánto pago de intereses», «o
    // guardo») son inconfundibles y la historia desviaba el interés.
    const pri = prioridadesAnswer(c, folded, raw);
    if (pri) return pri;
    const cmp = comparadorAnswer(c, folded, raw);
    if (cmp) return cmp;
  }
  {
    const r = deudasAnswer(c, folded);
    if (r) return r;
  }
  // 4c1 · LA DERIVA (ola 33): «¿algo cambió?», «¿hay algo raro?» —
  // las candidatas medidas del libro, antes que historia las
  // desvíe a un total.
  {
    const dv = derivaAnswer(c, folded);
    if (dv) return dv;
  }
  // EL KIT DEL INGRESO (OLA 30): su voz (piso, estable, volátil) manda
  // sobre la historia — «¿cuánto gano al mes?» no trae esa voz y
  // sigue siendo de historia.
  {
    // OLA 48 (F2): la cadencia del ingreso se juzga antes — su
    // puerta («cada cuánto me pagan») es inconfundible.
    const cd = cadenciaIngresoAnswer(c, folded);
    if (cd) return cd;
    const iv = ingresoVolatilAnswer(c, folded);
    if (iv) return iv;
  }
  // 4d- · LA FACTIBILIDAD (ola 29): la prueba sobre lo anotado —
  // «¿me alcanza el mes?», el pago en su día, el punto bajo de 13
  // semanas — antes de la verificación, cuyas formas (la de hoy, la
  // de la cuota nombrada) son otras y quedan intactas: esta puerta
  // pide monto + día, o el mes entero, o el punto bajo.
  {
    const f = factibilidadAnswer(c, folded, raw);
    if (f) return f;
  }
  // 4d · PROMEDIO Y PRECIO DEL TIEMPO (ola 12): el ritmo diario, el
  // promedio verdadero, el gasto seguro de hoy y el precio en días de
  // trabajo — antes de historia, cuya puerta también los rozaba.
  // La VERIFICACIÓN de la Ola 25 abre el paso: trae el monto y pide
  // el veredicto, antes de que el promedio responda otra cosa.
  {
    const v = verificacionAnswer(c, folded, raw);
    if (v) return v;
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
  // OLA 34 · LAS RELACIONES DE ALLEN: dos ciudadanos nombrados y
  // su relación en el tiempo, antes de que historia los sume.
  {
    const al = allenAnswer(c, folded);
    if (al) return al;
  }
  if (/(cuanto (gaste|gasto|gano|gane|entro|ingrese|ingreso|llevo|pago|pague|he pagado)|cuanto me (entro|entra)|cuanto (pago|cuesta|cuestan|costaron|costo) |cuanto (fue|es|ha sido) lo que (gaste|gano|pague|compre|entro|recibi)|how much (did|do) i (spend|earn|pay)|cuanto he (gastado|ganado|recibido)|cuanto (ha entrado|dinero ha entrado|dinero entro)|cuanto es mi (ingreso|sueldo|salario)|mi ingreso mensual|gasto hormiga|gastos (chicos|pequenos|menores)|how much (did i earn|do i earn|have i earned|has come in|came in)|how much (tax|did i pay in tax))/.test(folded)) {
    // OLA 47 (F5): la comparación anual se juzga antes que la
    // historia plana — su mitad comparativa se perdía en silencio.
    const aa = anoContraAnoAnswer(c, folded);
    if (aa) return aa;
    // OLA 48 (F3): el gasto por umbral (el gasto hormiga) también —
    // su forma no es la suma plana del período.
    const um = umbralAnswer(c, folded, raw);
    if (um) return um;
    return historiaAnswer(c, folded);
  }
  // 6 · RECENCIA (lo último…).
  // OLA 28 (Familia 1, Q28-2 + E28-4): la puerta aprende las formas
  // inglesas de lo último que la familia ya servía por dentro —
  // «the last remittance», «the last amount I sent», «when did I
  // last get paid» (el chip del banco): la puerta solo oía «last
  // time / last thing» y las tres morían antes de llegar.
  // OLA 60: la recencia también mira ADELANTE — «¿cuándo me van a
  // pagar de nuevo?» es su otra mitad y el gatillo viejo («ultim»)
  // no la dejaba ni entrar; las voces de la próxima paga se suman
  // a las de la Ola 28 sin quitar ninguna.
  if (/(ultim|last time|last thing|last (remittance|remesa|amount|send|sent|payment|pago)|last (get|got) paid|cuando fue|pagar de nuevo|van a pagar|cuando (me pagan|cobro)|proximo (pago|sueldo|salario|ingreso)|proxima paga|next pay|get paid again|when (will|do) i get paid|when did i last|what was the last|the last (amount|payment|paycheck|remittance))/.test(folded)) {
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
  // OLA 28 (Familia 2, E28-2): «when do my dues fall» entra — la
  // agenda oía «when do i pay» y «what … due», pero no la forma con
  // «my dues»: la canónica inglesa de la familia moría en la puerta.
  if (/(primeras cuotas|fechas en las que pago|que vence|cuando pago mis|what.*due|when do i pay|when do my dues|dues (fall|are due)|pagos vienen|viene esta semana|proximos pagos|pagos de esta semana|payments (coming|due)|proximo pago|next payment|next due|que tengo que pagar|que hay que pagar|what do i have to pay)/.test(folded)) return agendaAnswer(c, folded);
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
  // OLA 28 (Familia 2, E28-2): «¿cuál es mi tarjeta…?» y «which card
  // / account…» entran — la puerta pedía «en cuál» o «which…most» y
  // la canónica del saldo («¿Cuál es mi tarjeta con más saldo?»)
  // moría fuera de su casa.
  if (/(quien|who).*(mas|most)|en cual (cuenta|tarjeta).*(mas|debo)|which.*most|cual es mi (tarjeta|cuenta)|which (card|account)/.test(folded)) {
    const r = rankingAnswer(c, folded);
    if (r) return r;
  }
  // 7b · LA SUMA POR PERSONA (ola 27, Familia 5, Q27-3): «¿cuánto le
  // mandé a X?» se juzga ANTES del patrón — el patrón entrega el
  // agregado y esta pregunta nombra a su persona. Sin persona nombrada
  // el camino devuelve null y el patrón sirve como siempre.
  {
    const r = remesaPersonaAnswer(c, folded);
    if (r) return r;
  }
  // 7c · LA SUMA DEL PERÍODO (ola 30, Familia 2, Q30-2): sin persona
  // nombrada, el período manda — «¿cuánto mandé esta semana?» suma las
  // remesas del período y lo nombra. Tras la suma por persona (la
  // persona manda con su período) y antes del patrón (que sin período
  // sirve como siempre con su agregado declarado).
  {
    const r = remesaPeriodoAnswer(c, folded);
    if (r) return r;
  }
  // 8 · REMESAS como patrón (cuándo y a quién / cuánto envío en remesas).
  // OLA 28 (Familia 2, E28-2): «¿cuál es mi patrón de remesas?» entra
  // — la puerta no oía ni «cuál» ni «patrón», y la canónica del
  // puente moría antes de llegar al patrón que nombra.
  // OLA 26 (U8): la puerta oye también el participio + la persona +
  // el «cuánto» («¿cuánto he enviado a mamá…?», «¿cuánto le mandé
  // a…?»): la pregunta persona × período de la familia, que caía
  // entre familias. El presente con monto («envío 50 a mamá») NO
  // entra: es intención, de acciones (8b) — el participio y el
  // «cuánto» son la marca.
  {
    const personNamed = remitByPerson(c.state, c.key).rows.some((r) => {
      if (!r.person) return false;
      const f = foldQ(r.person.name).trim();
      return f.length >= 3 && new RegExp(`(^|[^a-z0-9])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(folded);
    });
    if ((/(remesa|remittance)/.test(folded) && /(cuando|quien|cuanto|cual|ritmo|patron|pattern|when|who|which|how much|cuesta|costo|margen|comision|fee|cost|margin)/.test(folded))
      || (personNamed && /(enviado|envie|mande|mandado|he enviado|sent)/.test(folded) && /(cuanto|how much)/.test(folded))) {
      return remesasAnswer(c, folded);
    }
  }
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
  // OLA 35 (Q35-5): LA COMPARATIVA ANUAL, DESDE SU PROPIO GATILLO —
  // anoContraAnoAnswer vivía solo tras la compuerta del paso 5, que
  // exige «cuánto/how much»: sus siete formas comparativas de sí/no
  // («¿gasté más este año que el año pasado?», «did I spend more
  // this year than last year?», «¿cuánto MÁS gasté…?») jamás la
  // alcanzaban — la puerta de la familia era más estrecha que su
  // propio vocabulario («que el año pasado», «than last year» son
  // SUS gatillos) y la mitad comparativa de la comparación moría
  // en unknown. La familia se juzga aquí, ante su gatillo natural:
  // es conservadora (marcador comparativo + los dos años + una
  // sola dirección) y devuelve null ante lo que no es suyo.
  {
    const aa = anoContraAnoAnswer(c, folded);
    if (aa) return aa;
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
  // OLA 28 (Familia 2, E28-2): «What do you know how to do?» entra —
  // la forma inglesa plena de la capacidad no casaba con ninguna
  // alternativa de la puerta y la canónica moría en silencio.
  if (/(que puedes hacer|que sabes hacer|para que sirves|que puede hacer|what can you do|what can the advisor do|what do you do|what do you know how to do)/.test(folded)) return capacidadesAnswer(c);
  // 12 · FARO MISMO (dónde veo / cómo hago).
  // OLA 25 (Q25-1) — la puerta, re-cosida en la integración (1.3.383):
  // «¿cómo comparto…?», «¿cómo me llama Faro?» y «¿dónde cambio el
  // nombre…?» no casaban con ninguna forma de la puerta del banco y
  // caían en silencio antes de llegar al mapa.
  // OLA 26 (Familia 5): la puerta aprende «guardo» — «¿cómo guardo
  // una pregunta?» y «¿dónde guardo mis preguntas?» son de la fila a
  // la mano que el mapa aprende en la misma cura.
  // OLA 27 (Familia 7, F27-1 + Q27-C2): la puerta aprende «exporto» —
  // «¿dónde exporto mis números?» y «¿cómo exporto…?» morían antes de
  // llegar al mapa, cuya entrada (ajustes.exportar, Ritmo) existía
  // desde la .382 sin que su verbo entrara jamás por la puerta (la
  // especie de Q25-1); el inglés pasaba por «where do i» y el
  // español, no. Y aprende las formas de la fila a la mano en inglés
  // («questions at hand», su nombre de cara) y la del compartir que
  // cae («¿dónde cae lo que comparto…?», cuya precedencia vive en
  // faroMismoAnswer).
  // OLA 28 (jinete de OBS-28-A3, la misma especie de puerta que
  // Q27-C2): «Where are my saved questions?» entra — la puerta oía
  // «where do/can i» y la forma con «are my» moría una pantalla
  // antes del mapa, cuya entrada de la fila a la mano ya existía.
  if (/(donde (veo|esta|encuentro|cambio|guardo|exporto)|como (hago|importo|cambio|veo|comparto|guardo|exporto)|como me (llama|llamo)|donde cae lo que comparto|questions at hand|preguntas a la mano|where (do|can) i|where (are|is) my|how do i)/.test(folded)) {
    const r = faroMismoAnswer(c, folded);
    if (r) return r;
  }
  // 12.5 · QUÉ DATO TE FALTA (ola 21): las formas cuyo cálculo pide un
  // dato que el libro no guarda — antes del delegado heredado, porque
  // su respuesta (la parte contable + el dato nombrado) es mejor que
  // cualquier lectura genérica de esas frases.
  {
    const r = faltaAnswer(c, folded);
    if (r) return r;
  }
  // 13 · Lo heredado de la Ola 5a, intacto: spend / free / left / how.
  // El modo viaja también al delegado: su familia free trae las mismas
  // piezas de la resta (apartado, colchón) y nombran el mismo piso.
  // OLA 67: el delegado lee el texto REPARADO (rawR) — sus familias
  // (spend/free/left/how) eran las únicas de la casa sin reparación:
  // «quda» y «lfet» morían aquí con la puerta reparada encima.
  const base: AskResult = answerQuestion(state, key, lang, names, rawR, parseCtx, today, c.mode);
  if (base.kind === "answer") {
    /* LAS BARRAS QUE SUMAN del delegado (censo de figuras; puerto
     * de la Rama Agente, 1.3.449): cuando las piezas del delegado
     * SON una resta que prueba su total — la última pieza es la
     * suma de las demás (left: entró − salió = queda), o las piezas
     * suman el libre pieza a pieza (free: saldo − apartado − cuotas
     * − colchón) — la resta se declara como figura de barras, de
     * las MISMAS piezas. Si las piezas no forman esa resta (spend,
     * la proyección del año), no hay figura: la exactitud manda. */
    let figure: BankFigure | undefined;
    const pcs = base.pieces;
    if (pcs.length >= 2 && pcs.some((p) => p.minor !== 0)) {
      const rest = pcs.slice(0, -1);
      const restSum = rest.reduce((a, p) => a + p.minor, 0);
      if (restSum === pcs[pcs.length - 1].minor && pcs[pcs.length - 1].minor !== 0) {
        figure = { kind: "barras", points: rest.map((p) => ({ label: p.label, minor: p.minor })), band: { floor: 0, total: pcs[pcs.length - 1].minor }, note: null };
      } else if (base.intent === "free") {
        figure = { kind: "barras", points: pcs.map((p) => ({ label: p.label, minor: p.minor })), band: { floor: 0, total: pcs.reduce((a, p) => a + p.minor, 0) }, note: null };
      }
    }
    return {
      kind: "answer", family: base.intent, verdict: base.verdict,
      pieces: base.pieces, note: base.note, draft: base.draft,
      source: base.intent === "free" ? ["central.tengo", "ahorros.stock", "cobros.cuotas", "ahorros.colchon"]
        : base.intent === "left" ? ["central.queda"]
        : base.intent === "how" ? ["asesor.lectura"]
        : ["asesor.lectura", "cobros.cuotas"],
      lines: 0,
      ...(figure ? { figure } : {}),
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
  const folded = normalizeEs(repairGateTypos(foldQ(raw)));
  const isQuestion = /[¿?]/.test(raw)
    || /\b(cuanto|cuanta|cuantos|cuantas|cuando|donde|cual|cuales|quien|quienes|como|por que|para que|puedo|puedes|puede|debo|hay|tengo|quiero|necesito|sabes|dime|muestrame|ensename)\b/.test(folded)
    || /^(si |if )/.test(folded);
  if (!isQuestion) return { isQuestion: false, family: null };
  const hasDigit = /\d/.test(folded);
  const G: Array<[RegExp, BankFamilyId | "aprendizaje"]> = [
    [/(seguro de vida|life insurance)/, "seguro"],
    [/(palmado|palmada|pelado|pelada|quebrado|quebrada|sin un real|dineral|millonada|am i broke|do i have a fortune)/, "figurada"],
    [/(por que (dices|dijiste|sale|es)|de donde (sale|viene) (ese|esa|el|la|este|esta)|como calculaste|why do you say|where does (that|the) (number|figure|total) come from)/, "porque"],
    [/(punto (mas )?bajo|semana (mas )?baja|llego a fin de mes|alcanzo?.{0,20}\bmes\b|puedo pagar.{0,30}(el dia|el \d|manana|fin de mes)|asumir|podria con|puedo con|aguanta|me da para|cuanto (me )?(quedaria|quedara)|con cuanto (llegaria|llego)|cuanto gastaria|puedo comprar|podria comprar|puedo (prestar|ayudar|invitar|regalar|cambiar)|puedo darme el gusto|cuanto es lo (maximo|mas)|maximo que (puedo|podria)|hasta el proximo pago|can i lend|most i (can|could) pay|last until payday|can i afford|could i afford|terminar(e)? (el|este) mes en negativo|cuando se me acaba|cuando me quedo en cero|que dia me quedo|cuanto necesito para (terminar|cerrar|llegar)|when do i run out|lowest (point|week)|make it (to|through)|last the month|puedo (ir a|salir)|cuesta.{0,30}cordobas)/, "factibilidad"],
    [/(algo (cambio|raro|nuevo)|que cambio|deberia saber|what changed|anything (unusual|off|new|change|changed))/, "deriva"],
    [/\b(tanda|rosca)\b/, "falta"],
    [/(cuanto (interes|rendimiento).{0,40}(ahorr|ganado)|interes ganado|interest have i earned|earned on my savings)/, "falta"],
    [/(cuanto pague de|cuanto he pagado de|how much tax did i pay|how much did i pay in (taxes|tax))/, "historia"],
    [/(que tan viej|antiguedad|desde cuando|how old|age of (my|the) debt)/, "deudas"],
    [/(antes o despues|que (fue|paso) primero|which came first|before or after)/, "historia"],
    [/(cuesta|cuestan|costo|margen|comision).{0,24}(remesa|envio|enviar|mandar)|(remesa|envio).{0,24}(cuesta|cuestan|costo|margen|comision)/, "remesas"],
    [/(que (me )?falta|que no aparece|what('s| is) missing|anything missing|what (hasn|haven)|shown up)/, "ausencia"],
    [/(tasa de ahorro|savings rate|ahorrando lo suficiente|saving enough)/, "tasa"],
    [/(no (lo |la )?reconozco|no reconozco|don't recogn|do not recogn|cobraron dos|charged twice|de donde (salio|vino) (este|ese|el|un) cargo|de que es el cargo|que cargo es|cual (fue|es) el cargo)/, "cargo"],
    [/(que es (este|ese|esta|un|una)|what is (this|that))/, "identidad"],
    [/(como va (el|la|mi|tu)|como esta (el|la|mi) (prestamo|deuda|tarjeta|cuenta|saldo)|estado de|how is|status of)/, "ya-pague"],
    [/((ingreso|gano|sueldo|salario).{0,24}(piso|estable|volatil|mes malo|peor mes|floor|stable|volatile)|piso de (mi )?ingreso|income floor)/, "ingreso"],
    [/(cada cuanto (me pagan|me entra|recibo|cobro)|cada cuanto es mi pago|how often do i get paid)/, "ingreso"],
    [/(gasto hormiga|gastos (chicos|pequenos)|gastado en cosas de menos de|how much (is|are) my ant spending|spent on things under)/, "historia"],
    [/(patrimonio|valor neto|net worth|puntaje de credito|score de credito|credit score)/, "falta"],
    [/(que no (puedes|puedo)|no (puedes|podrias) hacer|tus limites|limitaciones|what can'?t you)/, "limites"],
    [/(que (puedes|puedo|puede) hacer|que sabes hacer|para que sirves|what can you do|what can the advisor do|tus funciones|que funciones tienes)/, "capacidades"],
    [/(que has aprendido|lo que has aprendido|tus patrones|aprendido de mi)/, "aprendizaje"],
    [/(si (dejo|dejara|dejas) de|si no (gastara|comprara|fuera|gastase)|dejara de gastar)/, "contrafactual"],
    [/(cuanto (me dura|dura) (mi|el|lo)|meses (puedo vivir|de respaldo)|sin trabajo|sin ingresos|me despiden|pierdo mi trabajo|fondo de emergencia|mi colchon|cuanto tiempo aguanto|aguanto sin|lose my job|lost my job|how long could i go|without income)/, "respaldo"],
    [/(si (ahorro|ahorrara|ahorre|comenzara a ahorrar)|if i (save|start saving)|ahorro (doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil|\d)|save \$\d|save \d).{0,40}(cada (semana|mes|quincena|ano)|semanal|mensual|quincenal|fin de (mes|ano)|en (un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|\d+) (anos|meses|semanas)|para (diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre)|each (week|month|year)|weekly|monthly|end of the (year|month))/, "proyeccion"],
    [/(tardaria|tardare|cuanto (necesito|debo|tengo) que ahorrar|cuanto (debo|necesito) ahorrar|cuanto ahorrar|quiero (juntar|ahorrar|reunir)|juntar \d|meta de ahorro)/, "meta"],
    [/(en (cordobas|dolares|euros)|a (cordobas|dolares)|tipo de cambio|a como esta el cambio|cuanto (es|son) .{0,30}(dolares|cordobas|euros|pesos))/, "conversor"],
    [/(cuando (vence|es|cae|toca)|en cuantos dias|cuantos dias (faltan|quedan|para)|que dia (es|sera|cumple))/, "calendario"],
    [/(de que cuenta (saco|pago|tomo)|cual cuenta (uso|conviene)|de donde saco)/, "cuenta-origen"],
    [/(50.?30.?20|la regla|the rule|deberia gastar en|cuanto deberia (gastar|ahorrar))/, "regla"],
    [/(cuanto necesito (al mes|para vivir)|necesito para vivir|cuanto (me )?cuesta vivir|que (porcentaje|parte) de (lo que gano|mi sueldo|mi salario)|cuanto (me |nos )?(cuesta|cuestan) .{1,30} al mes|cuanto gastamos en|me alcanza con lo que gano|alcanza mi sueldo|how much do i need to live|what (percentage|share) of my income|how much does .{1,30} cost)/, "promedio"],
    [/(cuanto (dinero )?tengo en total|cuanto (dinero|billete|efectivo) hay|todo mi dinero|how much money do i have in total|how much (money|cash) is there)/, "total"],
    [/(promedio|gasto fijo|cuanto puedo gastar hoy|seguro gastar)/, "promedio"],
    [/(gustos|antojos|puedo gastar|darme el gusto|capricho)/, "gustos"],
    // OLA 25: la verificación nombra «promedio» en el oído — DESPUÉS
    // de gustos, como en la copia: «¿cuánto tengo para gastar en
    // gustos?» es de gustos, no de la verificación.
    [/(tengo|puedo|alcanza|me alcanza|have|can i).{0,24}(para gastar|gastar.{0,24}hoy|to spend|spend.{0,24}today)/, "promedio"],
    [/(cuantas|cuantos) (cuotas|tarjetas|cuentas|prestamos|deudas|suscripciones)/, "conteo"],
    [/(ultima vez|cuando fue la ultima|la ultima (cosa|compra|vez)|ultima remesa|last time|last (remittance|amount|send|sent)|last (get|got) paid)/, "recencia"],
    [/(ha subido|subio de precio|subieron los precios|(subio|subieron).{0,24}suscripcion|no se cobro|no me cobraron|al ano en suscripciones|cuanto.*al ano.*suscripcion|subscription.{0,24}(go up|went up|goes up)|which subscription|didnt charge|did not charge|subscriptions? cost)/, "series"],
    [/(cuantas veces|cada cuanto|cada cuantos|que suscripciones tengo|mas frecuente|duplicad|ha subido|subio de precio|que dia (gasto|compro) mas|how many times)/, "frecuencia"],
    [/(dias de trabajo|horas de trabajo|por (dia|hora) de trabajo|cuesta.{0,30}de trabajo)/, "precio-tiempo"],
    [/(como (fue|va|me fue)|en que se me va|en que gasto mas|resumen de|como cerro|mi mes (pasado|anterior))/, "relator"],
    [/(vence|vencen|proximo pago|tengo que pagar|por pagar|se me vence|upcoming|next payment)/, "agenda"],
    [/(tendre ahorrado|tendria ahorrado|ahorrado en \d+ meses)/, "ahorros"],
    [/(cuando termino|termino de pagar|acabo de pagar|en \d+ meses|para (diciembre|enero|navidad))/, "futuro"],
    [/(quiero (enviar|mandar)|voy a (enviar|mandar)|necesito (enviar|mandar)|^(envia|manda|enviar|mandar)\b|remesa (a|para|de)|envio (a|para|de))/, "acciones"],
    [/(a estas alturas|voy (mejor|peor)|a este ritmo|como voy (este|el) mes)/, "sintesis"],
    [/(quien (me debe|gasta|debe) mas|a quien le debo mas|who owes me (the )?most)/, "ranking"],
    [/(cuanto pago de interes|cual deuda (me )?(sale|es)|que pago primero|completa o (el )?minimo|que pasa si no pago|what should i pay first|which debt costs|how much interest do i pay)/, "deudas"],
    [/(avalancha|bola de nieve|avalanche|snowball|que orden|en que orden|cual orden)/, "deudas"],
    [/(debo|deuda|prestamo|me debe|me deben|le debo|saldo de (mi|la) tarjeta|i owe|owes me)/, "deudas"],
    [/(mas (grande|caro|alto|chico|chica)|menor (gasto|compra|ingreso)|mayor (gasto|compra|ingreso)|biggest|largest|smallest|gasto mas (grande|caro)|compra mas (grande|cara))/, "extremos"],
    [/(mas que|menos que|diferencia (entre|de)|mejor (mes|que)|peor (mes|que)|comparad|versus)/, "comparar"],
    [/(ahorr|tendre ahorrado|tendria ahorrado|cuanto tengo en|mi cuenta de ahorros)/, "ahorros"],
    [/(cuanto (mande|envie|enviado|enviando)|how much did i (send|sent)).{0,40}(semana|mes|ano|week|month|year|quincena)/, "remesas-periodo"],
    [/(cuanto (gaste|gastado|gano|gane|ganado|pague|pagado|compre|recibi|recibido)|cuanto (fue|es) lo que (gaste|gano|pague|compre)|he (gastado|ganado|pagado|comprado)|gasto en|gaste en|cuanto gasto|el mes pasado|este mes|este ano|la semana pasada|en (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b)/, "historia"],
  ];
  // La confirmación exige su cifra: sin dígito no hay afirmación que juzgar.
  if (hasDigit && /(verdad|es cierto|es verdad|no es asi|is it true)/.test(folded)) return { isQuestion, family: "confirmacion" };
  // El hipotético y la calculadora se juzgan por su forma y sus montos.
  if (/^si (uso|gasto|compro|pago|me regalan|recibo)/.test(folded) && /(quedaria|queda|tendria|seria)/.test(folded)) return { isQuestion, family: "hipotetico" };
  if (hasDigit && /(mas|\+|suma|total|resta|menos|divid|repart|por ciento|porcentaje|percent|%|entre \d|partes iguales)/.test(folded)) return { isQuestion, family: "calculadora" };
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
