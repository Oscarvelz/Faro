/**
 * relato — la capa que ASIENTA lo contado (rama agente, Escalón 1).
 *
 * La idea de Alvin: el usuario hace sus movimientos una vez, en su banco
 * real, y después solo le dice a la app «mirá, hice esto, esto y esto».
 * Esta capa oye ese relato y lo vuelve BORRADORES en datos — operaciones
 * de un esquema cerrado (asentar-gasto, asentar-ingreso, mover) — con su
 * eco en palabras llanas. NO escribe en el libro: la respuesta propone y
 * el toque dispone; el asiento confirmado es la costura de la caja que
 * integra (como hoy viajan `draft` y `proposal` del banco).
 *
 * El patrón heredado de la investigación (Rekodi, HelloBooks): el relato
 * se corta por cláusulas, un borrador por cláusula, eco que repite lo
 * entendido, y la regla de oro — SI NO ESTÁ SEGURO, PREGUNTA: NUNCA
 * ADIVINA. Asentar en la cuenta equivocada es la clase de error crítico
 * de esta capacidad; por eso una cláusula con una casilla obligatoria
 * vacía (monto, concepto, origen, destino) devuelve una pregunta, jamás
 * un borrador adivinado.
 *
 * Fronteras declaradas: la deduplicación cubre gasto e ingreso
 * (mover se deduplica en la costura del asiento); las fechas oídas son
 * hoy/ayer/anteayer y «el N»; el monto con coma decimal mezclado con
 * comas de cláusula es ambiguo y no se fuerza.
 *
 * E2 (encima de E1): el lenguaje figurado y el modismo viven en las
 * tablas FIGURADO_SEED / MODISMO_SEED — la figura se retira de la
 * cláusula antes de parsear (se escucha, no se asienta ni se pide ni
 * se desmiente), el modismo ubica el concepto, los verbos de precio
 * («vale 150») completan la cosa nombrada en la cláusula anterior, y
 * si el relato trajo una figura de estado, el eco responde con el
 * número: lo que quedaría del mes con esto asentado.
 */
import { readAdvisor } from "./advisor.ts";
import { duesWindow } from "./dues.ts";
import { lineDate, normalizeEs, parseWordNumber, repairAgentText } from "./ask2.ts";
import type { makeNamer } from "./defaults.ts";
import { foldQ } from "./lexicon.ts";
import { formatMoney } from "./money.ts";
import type { Currency, Lang, LedgerState, Line } from "./types.ts";

type Namer = ReturnType<typeof makeNamer>;

export type RelatoOp = "gasto" | "ingreso" | "mover";
export type RelatoPlace = { id: string; kind: "acct" | "bolsillo"; label: string };
export type RelatoDraft = {
  op: RelatoOp;
  amountMinor: number;
  currency: Currency;
  /** El concepto tal como quedará en la línea (el del libro si se ubicó). */
  concept: string;
  categoryId: string;
  subId: string;
  /** gasto: de qué cuenta salió (si se dijo); ingreso: a cuál entró. */
  from: RelatoPlace | null;
  to: RelatoPlace | null;
  date: string; // YYYY-MM-DD
  clause: string; // la cláusula oída, ya plegada
  /** La línea ya asentada que este borrador repetiría, si la hay. */
  duplicate: string | null;
};
export type FiguraKind = "estado-bajo" | "cantidad-grande";
export type RelatoResult =
  | { kind: "drafts"; drafts: RelatoDraft[]; echo: string; figures: FiguraKind[] }
  | { kind: "ask"; question: string; missing: "monto" | "origen" | "destino" | "concepto" }
  | { kind: "unknown"; figures: FiguraKind[] };

const L = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);

/* ---------------- los verbos del relato (formas plegadas) ---------------- */

const GASTO = new Set(["pague", "gaste", "compre", "abone", "cancele", "paid", "spent", "bought"]);
const INGRESO = new Set(["entro", "recibi", "cobre", "pagaron", "llego", "ingreso", "received", "earned",
  /* AÑADIR ES DINERO QUE ENTRA (ola del punto y el temporizador,
   * puerto 1.3.459): «añadí 300 a mi banco» salía como GASTO con
   * concepto «Anadi»; añadir/agregar/depositar son ingreso con su
   * destino, en los dos idiomas. */
  "anadi", "agregue", "deposite", "added", "deposited",
  /* LA CAZA DEL IMPERATIVO (Oscar, 2026-11-25; puerto 1.3.460):
   * el oído nació en pasado (el relato de lo ya hecho) y la orden
   * en imperativo no existía: «ingresa 500 a mi cuenta de Meta»
   * caía en silencio. El imperativo se oye con la misma forma: el
   * borrador se propone y la confirmación dispone. */
  "ingresa", "ingrese", "ingresar", "deposita", "deposite", "depositar", "deposit", "deposits",
  /* «deposa»: la forma que el normalizador deja de «deposita»
   * (su regla del diminutivo le come el «it»); los conjuntos de
   * verbos viven DESPUÉS del plegado, así que la forma que se oye
   * es la plegada. Medido en la caza: «deposita 300 en mi cuenta»
   * era silencio con «deposita» a secas en el conjunto. */
  "deposa"]);
const MOVER = new Set(["movi", "pase", "transferi", "traslade", "meti", "moved", "transferred",
  /* LA CAZA DEL IMPERATIVO (puerto 1.3.460): «mueve 200 pesos de
   * meta a emergencia» fallaba entero — ni relato ni orden lo
   * oían (la orden lo leía como corrección de una línea). El
   * paradigma imperativo del mover entra aquí, con su contrato
   * intacto: origen y destino se resuelven contra el libro o se
   * preguntan. */
  "mueve", "mueva", "mover", "pasa", "transfiere", "traslada", "mete", "move", "moves", "transfer", "transfers"]);
const ALL_VERBS = new Set([...GASTO, ...INGRESO, ...MOVER]);
/* EL MARCO DE LA ORDEN (caza de Oscar, 2026-11-25; puerto
 * 1.3.460): «compré un pollo por 20 pesos y una licuadora por
 * 300, añádelos a mi cuenta» — el «añádelos a mi cuenta» es el
 * MARCO del relato (la orden de asentarlo todo), no una cosa
 * más: el motor lo trataba como cláusula y paría un concepto
 * fantasma («anadelos cuenta») que pedía su monto. Las formas
 * del marco no son verbos de dinero (no fijan gasto ni ingreso:
 * el contenido trae los suyos) y jamás entran en un concepto. */
const FRAME = new Set(["anade", "anadelos", "anadelo", "anadela", "agrega", "agregalos", "agregalo", "apunta", "apuntalos", "apuntalo", "anota", "anotalos", "anotalo", "suma", "sumalos", "ponlos", "ponlo", "add", "adds"]);
/** La cola genérica del destino: «a mi cuenta», «to my account» —
 *  nombra el libro entero, no una cuenta del libro. */
const FRAME_TAIL = new Set(["cuenta", "cuentas", "libro", "account", "book"]);
const STOP = new Set(["de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "en", "por", "para", "a", "al", "me", "mi", "mis", "the", "an", "of", "my", "con", "sin", "i", "for", "on", "at",
  /* Enmienda de canon al puerto 1.3.459, cazada en el banco vivo:
   * con el corte por oraciones, una cláusula puede NACER con la
   * conjunción al frente («. Y añadí 300 a mi banco.») — el corte
   * de conjunción no la consume porque va en la posición cero, y
   * sin esto la «y» se asentaba como CONCEPTO del ingreso
   * («Ingreso: Y: $300.00»). La conjunción es palabra de función,
   * jamás contenido. */
  "y", "and"]);
const CUR_WORDS = new Set(["dolares", "dollars", "pesos", "cordobas", "usd", "nio", "dolar", "reales"]);
/** Los verbos de precio: la cláusula no dice «pagué» — dice lo que la
 *  cosa VALE («vale 150», «costó 40», «salió en 200»): es un gasto cuyo
 *  concepto suele venir de la cláusula anterior. */
const PRECIO = new Set(["vale", "costo", "salio"]);
/** Los verbos de comer: nombran la cosa y la ubican en alimentos aunque
 *  el precio venga en otra cláusula («me comí un pollo…, vale 150»). */
const FOOD = new Set(["comi", "desayune", "almorce", "cene", "comiste", "comio"]);

/* E2 · EL LENGUAJE FIGURADO Y EL MODISMO — la semilla. Son DATOS, no
   ley del motor: el vocabulario local vive como palabra aprendida
   (visible y borrable, la maquinaria de las Olas 11/17); esta tabla es
   la semilla regional con la que el oído arranca. La figura se escucha
   y se retira de la cláusula: jamás se asienta como estado, jamás se
   pide como monto, jamás se desmiente en la respuesta. */
export const FIGURADO_SEED: Array<{ phrase: string; kind: FiguraKind }> = [
  { phrase: "quede sin un real", kind: "estado-bajo" },
  { phrase: "me dejo en la calle", kind: "estado-bajo" },
  { phrase: "quede palmado", kind: "estado-bajo" },
  { phrase: "estoy palmado", kind: "estado-bajo" },
  { phrase: "quede pelado", kind: "estado-bajo" },
  { phrase: "estoy pelado", kind: "estado-bajo" },
  { phrase: "quede quebrado", kind: "estado-bajo" },
  { phrase: "sin un real", kind: "estado-bajo" },
  { phrase: "en la calle", kind: "estado-bajo" },
  { phrase: "palmado", kind: "estado-bajo" },
  { phrase: "pelado", kind: "estado-bajo" },
  { phrase: "un ojo de la cara", kind: "cantidad-grande" },
  { phrase: "una millonada", kind: "cantidad-grande" },
  { phrase: "una fortuna", kind: "cantidad-grande" },
  { phrase: "un dineral", kind: "cantidad-grande" },
  { phrase: "a fortune", kind: "cantidad-grande" },
];
export const MODISMO_SEED: Array<{ phrase: string; concept: string; categoryId: string }> = [
  { phrase: "pollo con tajadas", concept: "Pollo con tajadas", categoryId: "f-alimentos" },
  { phrase: "tajadas", concept: "Tajadas", categoryId: "f-alimentos" },
];
const TENS = new Set(["veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]);
const UNITS = new Set(["uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]);

type Verb = "gasto" | "ingreso" | "mover";
function verbOf(toks: string[]): Verb | null {
  for (const t of toks) {
    if (MOVER.has(t)) return "mover";
    if (GASTO.has(t)) return "gasto";
    if (INGRESO.has(t)) return "ingreso";
  }
  return null;
}

/* ---------------- tokens y montos con posición ---------------- */

function tokenize(folded: string): string[] {
  return folded.match(/\$?\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?|[a-z]+/g) ?? [];
}

type Span = { minor: number; currency: Currency; start: number; end: number; explicit: boolean };

function digitValue(tok: string): number | null {
  const t = tok.replace("$", "");
  if (!/^\d/.test(t)) return null;
  let v: number;
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) v = Number(t.replace(/[.,]/g, ""));
  else v = Number(t.replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Los montos de la cláusula, en orden, con su corrida de tokens. Una
 *  palabra-número solo cuenta si está certificada (moneda al lado, un
 *  verbo de movimiento en la cláusula, u otro monto en dígitos) — la
 *  misma disciplina de certificación del lector del banco. */
function amountSpans(toks: string[], dayTok: number | ReadonlySet<number>, def: Currency = "USD"): Span[] {
  // La cerca: un índice suelto (el día de «el 15») o el conjunto de
  // tokens del ancla de tiempo (dateOf): lo cercado jamás es dinero
  // (ola del punto y el temporizador, puerto 1.3.459 — el 2 de
  // «hace 2 días» no es un gasto de $2).
  const fenced: ReadonlySet<number> = typeof dayTok === "number" ? (dayTok < 0 ? new Set<number>() : new Set([dayTok])) : dayTok;
  const hasVerb = toks.some((t) => ALL_VERBS.has(t));
  const hasDigit = toks.some((t, i) => !fenced.has(i) && digitValue(t) !== null);
  const spans: Span[] = [];
  // LA MONEDA DE LA FRASE (caza de Oscar, 2026-11-25; puerto
  // 1.3.460): «compré un pollo por 20 pesos y una licuadora por
  // 300» — el 300 sin nombre salía en la moneda del libro
  // (dólares) y la compra era en pesos. La moneda que la frase
  // NOMBRA manda sobre los montos que la frase no nombra, dentro
  // de la misma llamada: el default corriente (running) arranca
  // en la del libro y lo reemplaza la primera moneda nombrada.
  let running = def;
  let i = 0;
  while (i < toks.length) {
    if (fenced.has(i)) { i++; continue; }
    const dv = digitValue(toks[i]);
    if (dv !== null) {
      let v = dv;
      let end = i + 1;
      const scale = toks[end] ?? "";
      if (scale === "mil" || scale === "thousand") { v *= 1_000; end++; }
      else if (scale === "millon" || scale === "millones" || scale === "million" || scale === "millions") { v *= 1_000_000; end++; }
      // LA MONEDA SE OYE: el monto sin palabra de moneda es de la
      // moneda del libro (def), no del dólar por defecto — salvo
      // que la frase ya haya nombrado la suya (running).
      const wEnd = toks[end] ?? "";
      const named: Currency | null = (wEnd === "pesos" || wEnd === "cordobas") ? "NIO" : (wEnd === "dolares" || wEnd === "dollars" || wEnd === "usd") ? "USD" : null;
      const cur: Currency = named ?? running;
      if (named) running = named;
      spans.push({ minor: Math.round(v * 100), currency: cur, start: i, end, explicit: named !== null });
      i = end;
      continue;
    }
    const p = parseWordNumber(toks, i);
    // «un» suelto es artículo, no dinero («compré un pollo»): el 1 en
    // palabra solo cuenta con escala («un mil») o moneda pegada.
    if (p && p.value === 1 && p.end === i + 1 && !CUR_WORDS.has(toks[p.end] ?? "")) { i++; continue; }
    if (p && p.value >= 1) {
      const near = [toks[p.end] ?? "", toks[p.end + 1] ?? ""];
      const certified = near.some((x) => CUR_WORDS.has(x)) || hasVerb || hasDigit;
      if (certified) {
        const named: Currency | null = near.some((x) => x === "pesos" || x === "cordobas") ? "NIO" : near.some((x) => x === "dolares" || x === "dollars" || x === "usd") ? "USD" : null;
        const cur: Currency = named ?? running;
        if (named) running = named;
        spans.push({ minor: Math.round(p.value * 100), currency: cur, start: i, end: p.end, explicit: named !== null });
        i = p.end;
        continue;
      }
    }
    i++;
  }
  return spans;
}

/* ---------------- fechas oídas ---------------- */

function shiftDay(today: string, days: number): string {
  const d = new Date(`${today}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function shiftMonth(today: string, months: number): string {
  const [y, m, d] = today.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

function numAt(toks: string[], i: number): { v: number; end: number } | null {
  if (i >= toks.length) return null;
  const dv = digitValue(toks[i]);
  if (dv !== null && Number.isInteger(dv)) return { v: dv, end: i + 1 };
  const p = parseWordNumber(toks, i);
  return p ? { v: p.value, end: p.end } : null;
}

/** EL TEMPORIZADOR DE LA CLÁUSULA (ola del punto y el temporizador,
 *  caza de Oscar en su teléfono, 2026-11-25, puerto 1.3.459, en
 *  español y en inglés): cada cláusula trae su propio ancla de
 *  tiempo y el ancla manda sobre SU cláusula, en pasado y en
 *  futuro: ayer, antier, anoche, hace N días/semanas/meses, la
 *  semana pasada, el mes pasado, mañana, en N días, la próxima
 *  semana, el próximo mes (yesterday, day before yesterday, last
 *  night, N days/weeks/months ago, last week/month/year, tomorrow,
 *  day after tomorrow, in N days, next week/month/year). Devuelve
 *  la fecha, los tokens que el ancla consume (timeToks: cercados
 *  para el lector de montos, así el 2 de «hace 2 días» jamás se
 *  lee como $2, y fuera del concepto) y si el ancla es de futuro.
 *  Sin ancla: hoy, sin consumo. El «el N» de siempre sigue: su
 *  token es dayTok. */
function dateOf(toks: string[], today: string): { date: string; dayTok: number; timeToks: Set<number>; future: boolean } {
  const hit = (date: string, used: number[], future = false): { date: string; dayTok: number; timeToks: Set<number>; future: boolean } =>
    ({ date, dayTok: -1, timeToks: new Set(used), future });
  const range = (a: number, b: number): number[] => { const out: number[] = []; for (let j = a; j < b; j++) out.push(j); return out; };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const n1 = toks[i + 1] ?? "";
    const n2 = toks[i + 2] ?? "";
    if (t === "ayer" || t === "yesterday" || t === "anoche") return hit(shiftDay(today, -1), [i]);
    if (t === "anteayer" || t === "antier") return hit(shiftDay(today, -2), [i]);
    if (t === "day" && n1 === "before" && n2 === "yesterday") return hit(shiftDay(today, -2), [i, i + 1, i + 2]);
    if (t === "pasado" && n1 === "manana") return hit(shiftDay(today, 2), [i, i + 1], true);
    if (t === "day" && n1 === "after" && n2 === "tomorrow") return hit(shiftDay(today, 2), [i, i + 1, i + 2], true);
    if (t === "manana" || t === "tomorrow") return hit(shiftDay(today, 1), [i], true);
    if (t === "hoy" || t === "today") return hit(today, [i]);
    if (t === "hace" || t === "en" || t === "in") {
      const num = numAt(toks, i + 1);
      if (num) {
        const unit = toks[num.end] ?? "";
        const sgn = t === "hace" ? -1 : 1;
        const used = [i, ...range(i + 1, num.end + 1)];
        if (unit === "dias" || unit === "dia" || unit === "days" || unit === "day") return hit(shiftDay(today, sgn * num.v), used, sgn > 0);
        if (unit === "semanas" || unit === "semana" || unit === "weeks" || unit === "week") return hit(shiftDay(today, sgn * 7 * num.v), used, sgn > 0);
        if (unit === "meses" || unit === "mes" || unit === "months" || unit === "month") return hit(shiftMonth(today, sgn * num.v), used, sgn > 0);
        if (unit === "anos" || unit === "ano" || unit === "years" || unit === "year") return hit(shiftMonth(today, sgn * 12 * num.v), used, sgn > 0);
      }
    }
    {
      const num = numAt(toks, i);
      if (num && (toks[num.end + 1] ?? "") === "ago") {
        const unit = toks[num.end] ?? "";
        const used = range(i, num.end + 2);
        if (unit === "days" || unit === "day") return hit(shiftDay(today, -num.v), used);
        if (unit === "weeks" || unit === "week") return hit(shiftDay(today, -7 * num.v), used);
        if (unit === "months" || unit === "month") return hit(shiftMonth(today, -num.v), used);
        if (unit === "years" || unit === "year") return hit(shiftMonth(today, -12 * num.v), used);
      }
    }
    if ((t === "semana" || t === "week") && (n1 === "pasada" || n1 === "pasado")) return hit(shiftDay(today, -7), [i, i + 1]);
    if ((t === "mes" || t === "month") && (n1 === "pasado" || n1 === "pasada")) return hit(shiftMonth(today, -1), [i, i + 1]);
    if ((t === "ano" || t === "year") && (n1 === "pasado" || n1 === "pasada")) return hit(shiftMonth(today, -12), [i, i + 1]);
    if ((t === "semana" || t === "week") && n1 === "proxima") return hit(shiftDay(today, 7), [i, i + 1], true);
    if ((t === "mes" || t === "month") && n1 === "proximo") return hit(shiftMonth(today, 1), [i, i + 1], true);
    if ((t === "semana" || t === "week" || t === "mes" || t === "month") && n1 === "que" && n2 === "viene") {
      return (t === "semana" || t === "week") ? hit(shiftDay(today, 7), [i, i + 1, i + 2], true) : hit(shiftMonth(today, 1), [i, i + 1, i + 2], true);
    }
    if (t === "last") {
      if (n1 === "week") return hit(shiftDay(today, -7), [i, i + 1]);
      if (n1 === "month") return hit(shiftMonth(today, -1), [i, i + 1]);
      if (n1 === "year") return hit(shiftMonth(today, -12), [i, i + 1]);
      if (n1 === "night") return hit(shiftDay(today, -1), [i, i + 1]);
    }
    if (t === "proxima" || t === "proximo" || t === "next") {
      if (n1 === "semana" || n1 === "week") return hit(shiftDay(today, 7), [i, i + 1], true);
      if (n1 === "mes" || n1 === "month") return hit(shiftMonth(today, 1), [i, i + 1], true);
      if (n1 === "ano" || n1 === "year") return hit(shiftMonth(today, 12), [i, i + 1], true);
    }
  }
  for (let i = 0; i + 1 < toks.length; i++) {
    if ((toks[i] === "el" || toks[i] === "the") && /^\d{1,2}$/.test(toks[i + 1])) {
      const day = Number(toks[i + 1]);
      const next = toks[i + 2] ?? "";
      if (day >= 1 && day <= 31 && !CUR_WORDS.has(next) && next !== "mil") {
        const [y, m] = today.split("-").map(Number);
        let date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (date > today) {
          const prev = new Date(Date.UTC(y, m - 2, day, 12));
          date = prev.toISOString().slice(0, 10);
        }
        return { date, dayTok: i + 1, timeToks: new Set([i, i + 1]), future: date > today };
      }
    }
  }
  return { date: today, dayTok: -1, timeToks: new Set(), future: false };
}

/* ---------------- los lugares (cuentas y bolsillos) ---------------- */

function placesOf(state: LedgerState, names: Namer): RelatoPlace[] {
  const out: RelatoPlace[] = [];
  for (const item of state.structure.catalog) {
    if (item.kind === "acct" && !item.hidden) out.push({ id: item.id, kind: "acct", label: names.catalog(item.id) });
  }
  for (const cat of state.structure.categories) {
    if (cat.id !== "f-ahorro") continue;
    for (const sub of cat.subs) {
      if (!sub.hidden) out.push({ id: sub.id, kind: "bolsillo", label: names.sub(sub.id) });
    }
  }
  return out;
}

const GENERIC: Array<{ re: RegExp; kind: "acct" | "bolsillo" }> = [
  { re: /\b(colchon|mattress)\b/, kind: "bolsillo" },
  { re: /\b(ahorros?|savings)\b/, kind: "bolsillo" },
  { re: /\b(banco|bank|cuenta|account|checking)\b/, kind: "acct" },
];

/** Resuelve la frase de un lugar: el nombre propio manda; el genérico
 *  («el banco», «el colchón») solo resuelve si hay UN candidato —
 *  con dos o ninguno, la respuesta es "amb": se pregunta, no se adivina. */
function resolvePlace(phrase: string, places: RelatoPlace[]): RelatoPlace | "amb" | null {
  const clean = phrase.replace(/\b(el|la|los|las|mi|mis|my|the|de|del|desde|a|al|hacia|para|from|to|into)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const named = places.filter((p) => {
    const lab = foldQ(p.label);
    return lab === clean || ` ${clean} `.includes(` ${lab} `) || ` ${lab} `.includes(` ${clean} `);
  });
  if (named.length === 1) return named[0];
  if (named.length > 1) return "amb";
  for (const g of GENERIC) {
    if (g.re.test(clean)) {
      const cands = places.filter((p) => p.kind === g.kind);
      if (cands.length === 1) return cands[0];
      return cands.length > 1 ? "amb" : null;
    }
  }
  return null;
}

/* ---------------- ubicar el concepto en el libro ---------------- */

type Filing = { concept: string; categoryId: string; subId: string };

function filingIndex(state: LedgerState, key: string, names: Namer): Map<string, Filing> {
  const idx = new Map<string, Filing>();
  const keys = [key];
  const [y, m] = key.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1, 12));
  keys.push(prev.toISOString().slice(0, 7));
  for (const k of keys) {
    for (const l of state.months[k]?.lines ?? []) {
      const f = foldQ(l.concept);
      if (f && !idx.has(f)) idx.set(f, { concept: l.concept, categoryId: l.categoryId, subId: l.subId });
    }
  }
  for (const cat of state.structure.categories) {
    for (const sub of cat.subs) {
      const label = names.sub(sub.id);
      const f = foldQ(label);
      if (f && !idx.has(f)) idx.set(f, { concept: label, categoryId: cat.id, subId: sub.id });
    }
    const cl = names.cat(cat.id);
    const cf = foldQ(cl);
    if (cf && !idx.has(cf)) idx.set(cf, { concept: cl, categoryId: cat.id, subId: "" });
  }
  return idx;
}

/** La ubicación de un concepto contado: primero el modismo — la frase
 *  tal cual se dijo, con sus palabras de relleno («pollo con tajadas»)
 *  — y después el índice del libro. foodCat es la categoría de
 *  alimentos SOLO si la estructura la tiene ("" si no: no se inventa). */
function filingFor(residual: string, clauseText: string, idx: Map<string, Filing>, foodCat: string): Filing {
  for (const m of MODISMO_SEED) {
    if (new RegExp(`\\b${m.phrase}\\b`).test(clauseText)) {
      return { concept: m.concept, categoryId: m.categoryId === "f-alimentos" ? foodCat : m.categoryId, subId: "" };
    }
  }
  return fileConcept(residual, idx);
}

/** La cláusula sin verbo que nombra LA COSA («me comí un pollo con
 *  tajadas», «el arreglo del carro»): su ubicación queda pendiente
 *  para que una cláusula de precio («vale 150») la complete. */
function pendingFiling(toks: string[], clauseText: string, idx: Map<string, Filing>, foodCat: string): Filing | null {
  const words = toks.filter((t) => !STOP.has(t) && !ALL_VERBS.has(t) && !PRECIO.has(t) && !FOOD.has(t) && !CUR_WORDS.has(t));
  const residual = words.join(" ").trim();
  if (!residual) return null;
  const filed = filingFor(residual, clauseText, idx, foodCat);
  if (toks.some((t) => FOOD.has(t)) && !filed.categoryId && foodCat) return { ...filed, categoryId: foodCat };
  return filed;
}

function fileConcept(residual: string, idx: Map<string, Filing>): Filing {
  const f = foldQ(residual);
  const direct = idx.get(f);
  if (direct) return direct;
  let best: Filing | null = null;
  let bestLen = 0;
  for (const [k, v] of idx) {
    if (k.length >= 3 && (` ${f} `.includes(` ${k} `) || ` ${k} `.includes(` ${f} `)) && k.length > bestLen) {
      best = v;
      bestLen = k.length;
    }
  }
  if (best) return best;
  return { concept: residual.charAt(0).toUpperCase() + residual.slice(1), categoryId: "", subId: "" };
}

/* ---------------- el corte por cláusulas ---------------- */

function splitClauses(foldedIn: string, today: string): Array<{ text: string; fresh: boolean }> {
  /* EL PUNTO CORTA (ola del punto y el temporizador, puerto
   * 1.3.459): el punto es frontera de ORACIÓN, y la oración nueva
   * empieza fresca: el verbo heredado no cruza el punto (un
   * fragmento suelto tras el punto, «The chase.», no hereda el
   * verbo de la oración anterior ni sale a pedir un monto que
   * nadie le dio). El punto entre dígitos (45.50, 1.200) no es
   * frontera: se protege, se corta por oraciones, y se devuelve. */
  const noDec = foldedIn.replace(/(\d)\.(\d)/g, "$1$2");
  const sentences = noDec.split(".").map((s) => s.replace(//g, "."));
  const out: Array<{ text: string; fresh: boolean }> = [];
  let first = true;
  for (const s of sentences) {
    const parts = splitSentence(s, today);
    parts.forEach((text, j) => out.push({ text, fresh: !first && j === 0 }));
    if (parts.length) first = false;
  }
  return out;
}

/** Corta UNA oración en cláusulas: por coma y punto y coma (protegiendo el
 *  separador de miles) y por «y»/`and` cuando lo que sigue trae su propio
 *  verbo o monto — sin partir los números en palabras («treinta y cinco»)
 *  ni las enumeraciones sin verbo («luz y agua» queda en su cláusula y la
 *  reparte el lector de montos). */
function splitSentence(folded: string, today: string): string[] {
  const protectedText = folded.replace(/(\d)[.,](\d{3})\b/g, "$1$2");
  const rawParts = protectedText.split(/[,;]+/).map((s) => s.replace(//g, ",").trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of rawParts) {
    const toks = tokenize(part);
    const cuts: number[] = [];
    for (let i = 1; i < toks.length; i++) {
      if (toks[i] !== "y" && toks[i] !== "and" && toks[i] !== "then" && toks[i] !== "luego" && toks[i] !== "despues") continue;
      if (toks[i] === "y" || toks[i] === "and") {
        const prev = toks[i - 1];
        const next = toks[i + 1] ?? "";
        if (TENS.has(prev) && UNITS.has(next)) continue; // «treinta y cinco»
      }
      const before = toks.slice(0, i);
      const after = toks.slice(i + 1);
      // 1.3.446 (enmienda de canon al puerto): un lado también trae
      // contenido si trae un verbo de programar (E3) — «programa el
      // internet 50 cada mes y recuérdame pagar la luz» es UN relato
      // de dos cláusulas para el mismo oído que corta los relatos de
      // lo hecho; sin esto, la segunda cláusula se perdía en silencio
      // dentro de la primera.
      const afterHas = verbOf(after) !== null || amountSpans(after, dateOf(after, today).timeToks).length > 0 || after.some((t) => PROG_VERBS.has(t));
      const beforeHas = verbOf(before) !== null || amountSpans(before, dateOf(before, today).timeToks).length > 0 || before.some((t) => PROG_VERBS.has(t));
      if (afterHas && beforeHas) cuts.push(i);
    }
    /* LA COMA QUE FALTA (campaña de mutaciones de la Rama, puerto
     * 1.3.457): «moví 200 del banco al colchón pagué la luz 45» —
     * dos cláusulas pegadas sin coma ni «y»: la segunda empezaba
     * con su verbo y la primera ya traía verbo y monto (una
     * cláusula completa). Ahí también se corta: un verbo que
     * aparece tras una cláusula completa abre otra, y el verbo se
     * QUEDA (abre la pieza nueva, no se cae como la conjunción).
     * Sin monto antes no se corta, y un verbo pegado a un corte de
     * conjunción tampoco («…y me entró…» lo corta la «y»: el corte
     * de verbo exige tres tokens de pieza antes, para no partir el
     * «me entró» en dos). */
    const conjSet = new Set(cuts);
    const verbCuts: number[] = [];
    for (let i = 2; i < toks.length; i++) {
      if (!ALL_VERBS.has(toks[i]) || conjSet.has(i)) continue;
      if ([...conjSet].some((j) => i - j >= 0 && i - j < 3)) continue;
      const before = toks.slice(0, i);
      if (verbOf(before) !== null && amountSpans(before, dateOf(before, today).timeToks).length > 0) verbCuts.push(i);
    }
    if (!cuts.length && !verbCuts.length) { out.push(part); continue; }
    const verbSet = new Set(verbCuts);
    const pieces: string[] = [];
    let cur: string[] = [];
    toks.forEach((t, i) => {
      if (conjSet.has(i)) { pieces.push(cur.join(" ")); cur = []; }
      else if (verbSet.has(i)) { pieces.push(cur.join(" ")); cur = [t]; }
      else cur.push(t);
    });
    if (cur.length) pieces.push(cur.join(" "));
    out.push(...pieces.filter(Boolean));
  }
  return out;
}

/* ---------------- una cláusula ---------------- */

type ClauseOut = { drafts: RelatoDraft[]; usedPending?: boolean } | { ask: RelatoResult } | null;

function askResult(lang: Lang, missing: "monto" | "origen" | "destino" | "concepto"): RelatoResult {
  const question =
    missing === "monto" ? L(lang, "¿De cuánto fue? Sin el monto no lo asiento.", "How much was it? Without the amount I won't post it.")
    : missing === "origen" ? L(lang, "¿De dónde salió? No quiero adivinar la cuenta.", "Where did it come from? I don't want to guess the account.")
    : missing === "destino" ? L(lang, "¿A dónde fue? No quiero adivinar la cuenta.", "Where did it go? I don't want to guess the account.")
    : L(lang, "¿De qué fue? Sin el concepto no lo asiento.", "What was it for? Without the concept I won't post it.");
  return { kind: "ask", question, missing };
}

function moverClause(toks: string[], clause: string, date: string, dayTok: ReadonlySet<number>, places: RelatoPlace[], lang: Lang, def: Currency = "USD"): ClauseOut {
  const spans = amountSpans(toks, dayTok, def);
  if (!spans.length) return { ask: askResult(lang, "monto") };
  const text = toks.join(" ");
  const both = text.match(/(?:de|del|desde|from)\s+(.+?)\s+(?:a|al|hacia|para|to|into)\s+(.+)$/);
  const onlyTo = !both ? text.match(/(?:a|al|hacia|para|to|into)\s+(.+)$/) : null;
  const onlyFrom = !both && !onlyTo ? text.match(/(?:de|del|desde|from)\s+(.+)$/) : null;
  let from: RelatoPlace | null = null;
  let to: RelatoPlace | null = null;
  if (both) {
    const f = resolvePlace(both[1], places);
    if (f === "amb" || f === null) return { ask: askResult(lang, "origen") };
    from = f;
    const t = resolvePlace(both[2], places);
    if (t === "amb" || t === null) return { ask: askResult(lang, "destino") };
    to = t;
  } else if (onlyTo) {
    const t = resolvePlace(onlyTo[1], places);
    if (t === "amb" || t === null) return { ask: askResult(lang, "destino") };
    to = t;
    return { ask: askResult(lang, "origen") };
  } else if (onlyFrom) {
    const f = resolvePlace(onlyFrom[1], places);
    if (f === "amb" || f === null) return { ask: askResult(lang, "origen") };
    from = f;
    return { ask: askResult(lang, "destino") };
  } else {
    return { ask: askResult(lang, "origen") };
  }
  const s = spans[0];
  return { drafts: [{ op: "mover", amountMinor: s.minor, currency: s.currency, concept: "", categoryId: "", subId: "", from, to, date, clause, duplicate: null }] };
}

function simpleClause(
  toks: string[], clause: string, verb: Verb, date: string, dayTok: ReadonlySet<number>,
  places: RelatoPlace[], idx: Map<string, Filing>, lang: Lang,
  pending: Filing | null, foodCat: string, def: Currency = "USD",
): ClauseOut {
  const spans = amountSpans(toks, dayTok, def);
  if (!spans.length) {
    // Sin monto, pero con la cosa nombrada y ubicada, la pregunta la
    // nombra: «¿de cuánto fue lo de la luz?» clarifica más que un
    // «¿de cuánto fue?» a secas.
    const words = toks.filter((t) => !STOP.has(t) && !ALL_VERBS.has(t) && !FRAME.has(t) && !PRECIO.has(t) && !FOOD.has(t) && !CUR_WORDS.has(t));
    const residual = words.join(" ").trim();
    const filed = residual ? filingFor(residual, clause, idx, foodCat) : null;
    if (filed && filed.concept) {
      return { ask: { kind: "ask", missing: "monto", question: L(lang, `Me falta el monto de ${filed.concept.toLowerCase()}. ¿De cuánto fue? Sin el monto no lo asiento.`, `I'm missing the amount for ${filed.concept.toLowerCase()}. How much was it? Without the amount I won't post it.`) } };
    }
    return { ask: askResult(lang, "monto") };
  }
  // La cuenta nombrada («del banco», «al banco») se resuelve y sale del concepto.
  const used = new Set<number>();
  spans.forEach((s) => { for (let i = s.start; i < s.end; i++) used.add(i); });
  toks.forEach((t, i) => { if (ALL_VERBS.has(t) || FRAME.has(t) || PRECIO.has(t) || FOOD.has(t) || CUR_WORDS.has(t) || dayTok.has(i)) used.add(i); });
  let place: RelatoPlace | null = null;
  let placeAmb = false;
  const text = toks.join(" ");
  // LA CUENTA DE NOMBRE («a mi cuenta de Meta», «ingresa 500 a mi
  // cuenta de Meta»; caza del imperativo, puerto 1.3.460): el
  // nombre tras «cuenta de» es el lugar; la frase genérica de
  // abajo lo perdía y el destino se evaporaba.
  const cdm = text.match(/(?:cuenta|account)\s+de\s+([a-z]+(?:\s+[a-z]+)?)$/);
  if (cdm) {
    const r = resolvePlace(cdm[1], places);
    if (r === "amb") placeAmb = true;
    if (r && r !== "amb") {
      place = r;
      const ci = Math.max(toks.lastIndexOf("cuenta"), toks.lastIndexOf("account"));
      for (let i = Math.max(0, ci - 2); i < toks.length; i++) used.add(i);
    }
  }
  const pm = !place ? text.match(/(?:del|de la|desde el|desde la|al|a la|a mi|a mis|en mi|en la|from the|from|to the|to my|in my|a)\s+([a-z]+(?:\s+[a-z]+)?)$/) : null;
  if (pm) {
    const r = resolvePlace(pm[1], places);
    if (r === "amb") placeAmb = true;
    const phraseToks = tokenize(pm[0]);
    const startAt = toks.length - phraseToks.length;
    if (r && r !== "amb") {
      place = r;
      for (let i = Math.max(0, startAt); i < toks.length; i++) used.add(i);
    } else if (FRAME_TAIL.has((pm[1] ?? "").split(" ")[0])) {
      // La cola genérica («a mi cuenta») no resuelve a ninguna
      // cuenta del libro porque nombra el libro entero: sale del
      // concepto igual, sin destino.
      for (let i = Math.max(0, startAt); i < toks.length; i++) used.add(i);
    }
  }
  // El concepto de cada monto: las palabras ANTES de su monto (desde
  // el monto anterior) — la ventana vieja llegaba hasta el monto
  // SIGUIENTE y arrastraba el concepto del vecino: sin comas, la
  // lista «luz 45 agua 30 internet 50» asentaba Agua por la luz
  // (campaña de mutaciones de la Rama, puerto 1.3.457). Si antes no
  // hay palabras («45 de luz»), valen las de después, y quedan
  // RECLAMADAS: el monto siguiente no las vuelve a tomar como suyas.
  const drafts: RelatoDraft[] = [];
  let usedPending = false;
  const foodHint = toks.some((t) => FOOD.has(t));
  const claimed = new Set<number>();
  for (let k = 0; k < spans.length; k++) {
    const s = spans[k];
    const lo = k === 0 ? 0 : spans[k - 1].end;
    const words: string[] = [];
    const take = (i: number) => {
      if (used.has(i) || claimed.has(i) || (i >= s.start && i < s.end)) return;
      const t = toks[i];
      if (STOP.has(t) || ALL_VERBS.has(t) || FRAME.has(t)) return;
      words.push(t);
      claimed.add(i);
    };
    for (let i = lo; i < s.start; i++) take(i);
    if (!words.length) {
      const hi = k === spans.length - 1 ? toks.length : spans[k + 1].start;
      for (let i = s.end; i < hi; i++) take(i);
    }
    const residual = words.join(" ").trim();
    // Sin concepto propio, la cláusula hereda LA COSA pendiente («vale
    // 150» tras «me comí un pollo…»); sin cosa pendiente, se pregunta.
    let filed = residual ? filingFor(residual, clause, idx, foodCat) : pending;
    // El ingreso que nombra su destino y nada más («añadí 300 a mi
    // banco») se archiva con el nombre del destino: el destino ES
    // su contenido; preguntar «¿de qué fue?» no clarifica nada
    // (ola del punto y el temporizador, puerto 1.3.459).
    if (!filed && verb === "ingreso" && place) filed = { concept: place.label, categoryId: "", subId: "" };
    // LA CASILLA QUE FALTA SE NOMBRA BIEN (caza del imperativo,
    // puerto 1.3.460): «deposita 300 en mi cuenta» con DOS cuentas
    // en el libro no carece de concepto: carece de destino. La
    // pregunta nombra la casilla que de verdad está vacía.
    if (!filed && placeAmb) return { ask: askResult(lang, verb === "gasto" ? "origen" : "destino") };
    if (!filed) return { ask: askResult(lang, "concepto") };
    if (!residual) usedPending = true;
    if (foodHint && !filed.categoryId && foodCat) filed = { ...filed, categoryId: foodCat };
    drafts.push({
      op: verb, amountMinor: s.minor, currency: s.currency,
      concept: filed.concept, categoryId: filed.categoryId, subId: filed.subId,
      from: verb === "gasto" ? place : null,
      to: verb === "ingreso" ? place : null,
      date, clause, duplicate: null,
    });
  }
  return { drafts, usedPending };
}

/* ---------------- deduplicación y eco ---------------- */

function findDuplicate(state: LedgerState, d: RelatoDraft): string | null {
  if (d.op === "mover") return null; // frontera E1: mover se deduplica en la costura del asiento
  const monthKey = d.date.slice(0, 7);
  for (const l of state.months[monthKey]?.lines ?? []) {
    if (!l.active) continue;
    if (lineDate(l) !== d.date) continue;
    if (Math.abs(l.amountMinor) !== d.amountMinor || l.currency !== d.currency) continue;
    const isIncome = l.kind.startsWith("income");
    if ((d.op === "ingreso") !== isIncome) continue;
    if (foldQ(l.concept) === foldQ(d.concept) || (d.subId && l.subId === d.subId)) {
      return `${l.concept}: ${formatMoney(Math.abs(l.amountMinor), l.currency, "es")}`;
    }
  }
  return null;
}

/* EL FORMATO DEL ECO (fallo de Oscar, 2026-11-25, desde su
 * teléfono; puerto 1.3.459): cada cosa en su línea propia, como
 * las tarjetas de borrador de abajo, y SIN guiones largos cosiendo
 * el texto: el monto se separa con dos puntos. Un eco corrido en
 * un solo párrafo se lee confuso aunque cada cifra esté bien. Esta
 * ley cubre todos los ecos de los escalones (relato, programa,
 * órdenes, crear). */
function buildEcho(lang: Lang, drafts: RelatoDraft[], today: string, projectedLine: string | null = null): string {
  const money = (d: RelatoDraft) => formatMoney(d.amountMinor, d.currency, lang);
  const when = (d: RelatoDraft) => (d.date === today ? "" : ` · ${d.date}`);
  const lines = drafts.map((d) => {
    const dup = d.duplicate ? L(lang, " · ya estaba asentado, no lo duplico", " · already posted, I won't duplicate it") : "";
    if (d.op === "mover") return `• ${L(lang, "Mover", "Move")} ${money(d)} ${L(lang, "de", "from")} ${d.from?.label} ${L(lang, "a", "to")} ${d.to?.label}${when(d)}${dup}`;
    if (d.op === "gasto") return `• ${L(lang, "Gasto", "Expense")}: ${d.concept}: ${money(d)}${d.from ? ` ${L(lang, "desde", "from")} ${d.from.label}` : ""}${when(d)}${dup}`;
    return `• ${L(lang, "Ingreso", "Income")}: ${d.concept}: ${money(d)}${d.to ? ` ${L(lang, "a", "to")} ${d.to.label}` : ""}${when(d)}${dup}`;
  });
  const fresh = drafts.some((d) => !d.duplicate);
  const head = L(lang, "Esto es lo que entendí:", "Here's what I understood:");
  const foot = fresh
    ? L(lang, "¿Lo asiento así?", "Shall I post it like this?")
    : L(lang, "No hay nada nuevo que asentar.", "There's nothing new to post.");
  return [head, ...lines, ...(projectedLine ? [projectedLine] : []), foot].join("\n");
}

/* LA CAMPAÑA DE MUTACIONES DE LA RAMA (puerto 1.3.457) · LA
 * ENTRADA QUE OYE LA ESCRITURA IMPERFECTA: los escalones reparan
 * las erratas contra su vocabulario antes de parsear (la cura de
 * la Ola 65, traída a la rama) y retiran la cortesía («por favor»,
 * «please»): la forma no es el contenido — un «, por favor» al
 * final del relato se volvía una cláusula fantasma que pedía su
 * propio monto y dejaba el relato entero en una pregunta. Los
 * nombres del libro se protegen: jamás son erratas. La reparación
 * es la de DOS pasadas (repairAgentText): el diccionario manda
 * primero y el libro caza lo que el diccionario no conoce. */
function agentProtect(state: LedgerState, names: Namer): Set<string> {
  const out = new Set<string>();
  const add = (s: string) => { for (const w of foldQ(s).split(/[^a-zñ]+/)) if (w.length >= 3) out.add(w); };
  for (const m of Object.values(state.months)) for (const l of m.lines) add(l.concept);
  for (const cat of state.structure.categories) {
    add(names.cat(cat.id));
    for (const s of cat.subs) { add(names.sub(s.id)); if (s.customName) add(s.customName); }
  }
  for (const it of state.structure.catalog) { add(names.catalog(it.id)); if (it.customName) add(it.customName); }
  for (const p of state.remitPeople ?? []) add(p.name);
  return out;
}
function agentFold(state: LedgerState, lang: Lang, names: Namer, raw: string): string {
  const repaired = repairAgentText(foldQ(raw), agentProtect(state, names), lang);
  const folded = lang === "es" ? normalizeEs(repaired) : repaired;
  return folded.replace(/\b(por favor|please)\b/g, " ");
}

/* ---------------- la entrada ---------------- */

/** Oye un relato de movimientos ya hechos y lo vuelve borradores con su
 *  eco. Pura: no toca el estado. Si alguna cláusula obligatoria no se
 *  puede llenar sin adivinar, devuelve la pregunta (kind "ask") y ningún
 *  borrador — el relato se asienta entero o se pregunta, nunca a medias
 *  con una adivinanza adentro. */
export function parseRelato(
  state: LedgerState, key: string, lang: Lang, names: Namer, raw: string, today: string,
): RelatoResult {
  const folded = agentFold(state, lang, names, raw);
  if (!folded.trim()) return { kind: "unknown", figures: [] };
  const places = placesOf(state, names);
  const idx = filingIndex(state, key, names);
  const foodCat = state.structure.categories.some((cat) => cat.id === "f-alimentos") ? "f-alimentos" : "";

  // El verbo de cabecera («hoy pagué: luz 45, agua 30») manda sobre las
  // cláusulas que no traen el suyo.
  let inherited: Verb | null = null;
  let body = folded;
  const intro = folded.match(/^(?:hoy\s+|ayer\s+|today\s+|yesterday\s+)?([a-z]+)\s*[:\-]\s*(.+)$/);
  if (intro && ALL_VERBS.has(intro[1])) {
    inherited = verbOf([intro[1]]);
    body = intro[2];
  }

  const drafts: RelatoDraft[] = [];
  const figures: FiguraKind[] = [];
  let pending: Filing | null = null;
  // LA MONEDA DE LA FRASE entre cláusulas (caza 1, puerto
  // 1.3.460): la primera moneda nombrada del relato manda sobre
  // los montos sin nombre que siguen, sean de esta cláusula o de
  // las que vienen.
  let phraseCur: Currency | null = null;
  let sawPriceOrFood = false;
  // El índice del último borrador SIN ancla propia: un fragmento
  // que es solo tiempo («Hace 2 días.») cierra la narración y su
  // ancla cae sobre ese borrador, no sobre el aire.
  let lastUnanchored = -1;
  for (const part of splitClauses(body, today)) {
    if (part.fresh) inherited = null; // el punto cierra la oración: su verbo no cruza
    const clause = part.text;
    // E2 · lo figurado se retira de la cláusula antes de parsear: la
    // figura se escucha (queda registrada en el resultado), no se
    // asienta como estado, no se pide como monto, no se desmiente.
    let clauseText = clause;
    const clauseFigures: FiguraKind[] = [];
    for (const f of FIGURADO_SEED) {
      const re = new RegExp(`\\b${f.phrase}\\b`);
      if (re.test(clauseText)) { clauseFigures.push(f.kind); clauseText = clauseText.replace(re, " "); }
    }
    figures.push(...clauseFigures);
    const toks = tokenize(clauseText);
    if (!toks.length) continue;
    const { date, dayTok, timeToks, future } = dateOf(toks, today);
    // EL FRAGMENTO QUE ES SOLO TIEMPO: no nombra cosa ni trae
    // verbo; su ancla (si no es de futuro) cae sobre el último
    // borrador que aún no tenía la suya, y el fragmento no deja
    // borrador fantasma ni pendiente.
    if (timeToks.size > 0 && toks.every((t, i) => timeToks.has(i) || STOP.has(t) || t === "y" || t === "and")) {
      if (!future && lastUnanchored >= 0) drafts[lastUnanchored].date = date;
      continue;
    }
    // La cláusula de FUTURO no se asienta como pasado: su casa es
    // el programa (parsePrograma la oye por su puerta); aquí se
    // deja pasar sin tocarla.
    if (future) continue;
    // EL MARCO SOLO: una cláusula que es pura orden de asentar
    // («añádelos a mi cuenta») no nombra cosa ni trae monto: es el
    // marco del relato entero, y se deja pasar sin borrador y sin
    // la pregunta fantasma que pedía el monto de «anadelos cuenta».
    if (toks.every((t) => STOP.has(t) || FRAME.has(t) || FRAME_TAIL.has(t))) continue;
    const defCur = phraseCur ?? state.settings.display;
    const spans = amountSpans(toks, timeToks, defCur);
    for (const s of spans) if (s.explicit) phraseCur = s.currency;
    // La cláusula cuya única «cantidad» era figurada («gasté una
    // fortuna en zapatos») no deja un monto faltante: era color.
    if (!spans.length && clauseFigures.includes("cantidad-grande")) continue;
    const ownVerb = verbOf(toks);
    const precio = !ownVerb && toks.some((t) => PRECIO.has(t));
    const comida = toks.some((t) => FOOD.has(t));
    if (precio || comida) sawPriceOrFood = true;
    const verb: Verb | null = ownVerb ?? (precio || (comida && spans.length > 0) ? "gasto" : null) ?? inherited;
    if (!verb) {
      // Sin verbo: la cláusula puede nombrar LA COSA que una cláusula
      // de precio completa después. Una cláusula que era solo figura
      // («quedé palmado») no nombra cosa alguna: no deja pendiente.
      if (!clauseFigures.length) {
        const f = pendingFiling(toks, clauseText, idx, foodCat);
        if (f) pending = f;
      }
      continue;
    }
    const out = ownVerb === "mover"
      ? moverClause(toks, clauseText, date, timeToks, places, lang, defCur)
      : simpleClause(toks, clauseText, verb, date, timeToks, places, idx, lang, pending, foodCat, defCur);
    if (!out) continue;
    if ("ask" in out) return out.ask;
    drafts.push(...out.drafts);
    if (timeToks.size === 0 && dayTok < 0 && out.drafts.length) lastUnanchored = drafts.length - 1;
    if (out.usedPending) pending = null;
    if (ownVerb) inherited = ownVerb;
  }
  if (!drafts.length) {
    if (pending && sawPriceOrFood) {
      return {
        kind: "ask", missing: "monto",
        question: L(lang, `Me falta el monto de ${pending.concept.toLowerCase()}. ¿De cuánto fue? Sin el monto no lo asiento.`, `I'm missing the amount for ${pending.concept.toLowerCase()}. How much was it? Without the amount I won't post it.`),
      };
    }
    return { kind: "unknown", figures };
  }
  for (const d of drafts) d.duplicate = findDuplicate(state, d);
  // E2 · si el relato trajo una figura de estado («quedé palmado»), el
  // eco la responde con el número — sin desmentirla: lo que quedaría
  // del mes con esto asentado, con la misma lectura de la casa y solo
  // si todas las monedas del relato son la de vista (no se mezclan).
  let projectedLine: string | null = null;
  if (figures.includes("estado-bajo")) {
    const disp = state.settings.display;
    const fresh = drafts.filter((d) => !d.duplicate && d.op !== "mover");
    if (fresh.length && drafts.every((d) => d.op === "mover" || d.currency === disp)) {
      const reading = readAdvisor(state, key, lang, names, { today: new Date(`${today}T12:00:00`) });
      let projected = reading.left;
      for (const d of fresh) projected += d.op === "ingreso" ? d.amountMinor : -d.amountMinor;
      projectedLine = L(lang, `Con esto asentado, el mes te quedaría en ${formatMoney(projected, disp, lang)}.`, `With this posted, your month would be left at ${formatMoney(projected, disp, lang)}.`);
    }
  }
  return { kind: "drafts", drafts, echo: buildEcho(lang, drafts, today, projectedLine), figures };
}

/* ================================================================== */
/* E3 · PROGRAMAR POR RELATO Y LA VIGILANCIA                           */
/*                                                                     */
/* La segunda idea de Alvin: no solo grabar lo que pasó — programar   */
/* lo que va a pasar, para que la app lo recuerde y esté pendiente.    */
/* Las tres clases de la propuesta (§8): FIJO (monto y fecha ciertos), */
/* SOLO RECORDATORIO (lo variable — sin monto en el relato, la luz es  */
/* el caso típico: la app recuerda y el monto se confirma al llegar),  */
/* y lo NO PROGRAMADO, que la vigilancia detecta desde la historia.    */
/* parsePrograma es pura, como parseRelato: devuelve borradores en     */
/* datos y su eco; el toque que crea la programación en la app viva    */
/* es la costura de canon al integrar.                                 */
/* ================================================================== */

export type ProgramaDraft = {
  op: "gasto" | "ingreso";
  clase: "fijo" | "recordatorio";
  amountMinor: number | null;
  currency: Currency;
  concept: string;
  categoryId: string;
  subId: string;
  cadence: "weekly" | "biweekly" | "monthly" | "yearly" | "once";
  firstDate: string;
  clause: string;
  duplicate: string | null;
};
export type ProgramaResult =
  | { kind: "schedules"; drafts: ProgramaDraft[]; echo: string }
  | { kind: "ask"; question: string; missing: "concepto" | "cuando" }
  | { kind: "unknown" };

const PROG_VERBS = new Set(["programa", "programar", "programame", "programalo", "programala", "agenda", "agendame", "agendalo", "recuerdame", "recordame", "recuerda", "apunta", "anota", "schedule", "remind"]);
const PROG_GASTO = new Set(["pagar", "pague", "paga", "pago", "gastar", "gaste", "gasta", "comprar", "compre", "compra", "pay", "paid",
  /* El futuro dicho como hecho (ola del punto y el temporizador,
   * puerto 1.3.459): «gastaré 500 el próximo mes» trae el verbo en
   * futuro y su ancla; «spend» es el presente inglés del gasto. */
  "pagare", "gastare", "comprare", "spend"]);
const PROG_INGRESO = new Set(["entra", "entran", "cobrar", "cobro", "cobre", "recibir", "recibo", "recibe", "depositan", "ingresa", "ingresan", "enters", "receive"]);
/** Salida = todo lo que no es ingreso (el mismo criterio de ask2). */
function isOut(l: Line): boolean { return !l.kind.startsWith("income"); }
const CAD_WORDS = new Set(["cada", "mes", "meses", "semana", "semanas", "quincena", "quincenas", "ano", "anos", "dia", "dias", "todos", "todas", "los", "las", "el", "la", "de", "del", "en", "mensual", "semanal", "quincenal", "anual", "monthly", "weekly", "every", "month", "months", "week", "weeks", "on", "the", "of", "a", "al", "por"]);
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const WEEKDAY: Record<string, number> = { domingo: 0, sunday: 0, lunes: 1, monday: 1, martes: 2, tuesday: 2, miercoles: 3, wednesday: 3, jueves: 4, thursday: 4, viernes: 5, friday: 5, sabado: 6, saturday: 6 };

function isoOf(y: number, m: number, d: number): string {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dd = Math.min(Math.max(1, d), last);
  return `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}
function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
function fmtDay(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  return L(lang, `${d} de ${MESES_ES[m - 1]}`, `${MESES_EN[m - 1]} ${d}`);
}

type CadHit = { cadence: ProgramaDraft["cadence"]; dayOfMonth: number | null; weekday: number | null; monthDay: { m: number; d: number } | null };
function cadenceOf(toks: string[]): CadHit | null {
  const text = toks.join(" ");
  let cadence: ProgramaDraft["cadence"] | null = null;
  if (/(cada|every|todos los|todas las)\s+(semana|semanas|week|weeks)\b/.test(text) || /\b(semanal|weekly)\b/.test(text)) cadence = "weekly";
  else if (/(cada|every)\s+(quincena|quincenas)\b/.test(text) || /\bquincenal\b/.test(text)) cadence = "biweekly";
  else if (/(cada|every|todos los)\s+(mes|meses|month|months)\b/.test(text) || /\b(mensual|monthly)\b/.test(text)) cadence = "monthly";
  else if (/(cada|every)\s+(ano|anos|year|years)\b/.test(text) || /\b(anual|yearly)\b/.test(text)) cadence = "yearly";
  let weekday: number | null = null;
  for (const t of toks) if (t in WEEKDAY) { weekday = WEEKDAY[t]; break; }
  if (weekday !== null && !cadence) cadence = "weekly";
  let dayOfMonth: number | null = null;
  const dm = /(?:el dia|el|dia)\s*(\d{1,2})\b/.exec(text);
  if (dm) dayOfMonth = Number(dm[1]);
  let monthDay: CadHit["monthDay"] = null;
  for (let i = 0; i < toks.length; i++) {
    const mi = MESES_ES.indexOf(toks[i]) >= 0 ? MESES_ES.indexOf(toks[i]) : MESES_EN.indexOf(toks[i]);
    if (mi >= 0) {
      const before = i > 0 && /^\d{1,2}$/.test(toks[i - 1]) ? Number(toks[i - 1]) : null;
      const after = i + 1 < toks.length && /^\d{1,2}$/.test(toks[i + 1]) ? Number(toks[i + 1]) : null;
      if (before !== null || after !== null) monthDay = { m: mi + 1, d: before ?? after ?? 1 };
      break;
    }
  }
  if (!cadence && !monthDay) return null;
  return { cadence: cadence ?? "once", dayOfMonth, weekday, monthDay };
}

function firstDateOf(hit: CadHit, today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  if (hit.monthDay) {
    const cand = isoOf(y, hit.monthDay.m, hit.monthDay.d);
    return cand >= today ? cand : isoOf(y + 1, hit.monthDay.m, hit.monthDay.d);
  }
  if (hit.cadence === "weekly" && hit.weekday !== null) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const delta = (hit.weekday - dow + 7) % 7;
    return addDaysIso(today, delta);
  }
  if (hit.cadence === "weekly") return addDaysIso(today, 7);
  if (hit.cadence === "biweekly") return addDaysIso(today, 15);
  if (hit.cadence === "monthly" || hit.cadence === "yearly") {
    const day = hit.dayOfMonth ?? d;
    const cand = isoOf(y, m, day);
    if (hit.cadence === "monthly") return cand >= today ? cand : isoOf(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, day);
    return cand >= today ? cand : isoOf(y + 1, m, day);
  }
  return today;
}

export function parsePrograma(
  state: LedgerState, key: string, lang: Lang, names: Namer, raw: string, today: string,
): ProgramaResult {
  const folded = agentFold(state, lang, names, raw);
  if (!folded.trim()) return { kind: "unknown" };
  const idx = filingIndex(state, key, names);
  const foodCat = state.structure.categories.some((cat) => cat.id === "f-alimentos") ? "f-alimentos" : "";
  const hasProgVerb = tokenize(folded).some((t) => PROG_VERBS.has(t));
  const drafts: ProgramaDraft[] = [];
  let inheritedCad: CadHit | null = null;
  let ask: ProgramaResult | null = null;
  for (const part of splitClauses(folded, today)) {
    const clause = part.text;
    const toks = tokenize(clause);
    if (!toks.length) continue;
    // EL FUTURO DICHO COMO HECHO (ola del punto y el temporizador):
    // «mañana pago 60 de internet», «gastaré 500 el próximo mes en
    // regalos», «en 2 días pago la luz» no traen verbo de programar
    // ni cadencia: traen un ANCLA de futuro y un verbo de dinero.
    // Son un programa de una sola vez con la fecha del ancla.
    const anchor = dateOf(toks, today);
    const futureOnce = anchor.future && toks.some((t) => PROG_GASTO.has(t) || PROG_INGRESO.has(t));
    let cad = cadenceOf(toks) ?? inheritedCad;
    if (cadenceOf(toks)) inheritedCad = cadenceOf(toks);
    const anchorDate = !cadenceOf(toks) && !inheritedCad && futureOnce ? anchor.date : null;
    if (!cad && futureOnce) cad = { cadence: "once", dayOfMonth: null, weekday: null, monthDay: null };
    const isProg = toks.some((t) => PROG_VERBS.has(t)) || cad !== null;
    if (!isProg) continue;
    if (!cad) { ask = { kind: "ask", missing: "cuando", question: L(lang, "¿Cada cuánto se repite, o es una sola vez? Sin eso no sé cómo programarlo.", "How often does it repeat, or is it just once? Without that I don't know how to schedule it.") }; continue; }
    // El día nombrado («el 15») no es un monto: se retira antes de leerlos.
    const dayM = /(?:el dia|el)\s*(\d{1,2})\b/.exec(clause);
    const fence = new Set<number>(anchor.timeToks);
    if (dayM) fence.add(toks.indexOf(dayM[1]));
    const spans = amountSpans(toks, fence, state.settings.display);
    const op: ProgramaDraft["op"] = toks.some((t) => PROG_INGRESO.has(t)) ? "ingreso" : "gasto";
    const used = new Set<number>();
    spans.forEach((s) => { for (let i = s.start; i < s.end; i++) used.add(i); });
    toks.forEach((t, i) => {
      if (used.has(i)) return;
      if (PROG_VERBS.has(t) || PROG_GASTO.has(t) || PROG_INGRESO.has(t) || CAD_WORDS.has(t) || CUR_WORDS.has(t) || STOP.has(t) || t === "ll" || t === "re" || t === "ve" || (dayM && t === dayM[1]) || (cad.monthDay && (t === String(cad.monthDay.d))) || t in WEEKDAY || MESES_ES.includes(t) || MESES_EN.includes(t) || anchor.timeToks.has(i)) used.add(i);
    });
    const residual = toks.filter((_, i) => !used.has(i)).join(" ").trim();
    if (!residual) { ask = { kind: "ask", missing: "concepto", question: L(lang, "¿Qué es lo que programo? Nómbrame el pago o el ingreso y lo dejo programado.", "What am I scheduling? Name the payment or the income and I'll schedule it.") }; continue; }
    const filed = filingFor(residual, clause, idx, foodCat);
    const first = spans[0];
    const dup = (state.months[key]?.lines ?? []).concat(state.months[prevKeyOf(key)]?.lines ?? [])
      .find((l) => l.active && l.recurring && cad.cadence !== "once" && l.cadence === cad.cadence && (filed.subId ? l.subId === filed.subId : foldQ(l.concept) === foldQ(filed.concept)));
    drafts.push({
      op,
      clase: first ? "fijo" : "recordatorio",
      amountMinor: first ? first.minor : null,
      currency: first ? first.currency : state.settings.display,
      concept: filed.concept, categoryId: filed.categoryId, subId: filed.subId,
      cadence: cad.cadence, firstDate: anchorDate ?? firstDateOf(cad, today),
      clause, duplicate: dup ? dup.concept : null,
    });
  }
  if (!drafts.length) {
    if (ask) return ask;
    return hasProgVerb ? { kind: "ask", missing: "cuando", question: L(lang, "¿Cada cuánto se repite, o es una sola vez? Sin eso no sé cómo programarlo.", "How often does it repeat, or is it just once? Without that I don't know how to schedule it.") } : { kind: "unknown" };
  }
  const lines = drafts.map((d) => {
    const cadTxt = d.cadence === "once"
      ? L(lang, `una sola vez, el ${fmtDay(d.firstDate, lang)}`, `just once, on ${fmtDay(d.firstDate, lang)}`)
      : d.cadence === "weekly"
        ? L(lang, `cada semana desde el ${fmtDay(d.firstDate, lang)}`, `every week starting ${fmtDay(d.firstDate, lang)}`)
        : d.cadence === "biweekly"
          ? L(lang, `cada quincena desde el ${fmtDay(d.firstDate, lang)}`, `every two weeks starting ${fmtDay(d.firstDate, lang)}`)
          : d.cadence === "yearly"
            ? L(lang, `cada año, el ${fmtDay(d.firstDate, lang)}`, `every year on ${fmtDay(d.firstDate, lang)}`)
            : L(lang, `cada mes, el día ${Number(d.firstDate.split("-")[2])}`, `every month on day ${Number(d.firstDate.split("-")[2])}`);
    const amtTxt = d.clase === "fijo" && d.amountMinor !== null
      ? formatMoney(d.amountMinor, d.currency, lang)
      : L(lang, "sin monto fijo (solo recordatorio)", "no fixed amount (reminder only)");
    const dupTxt = d.duplicate ? L(lang, ` · ojo: ya tienes «${d.duplicate}» programado igual; no lo duplico`, ` · note: you already have "${d.duplicate}" scheduled the same way; I won't duplicate it`) : "";
    return `• ${d.concept}: ${amtTxt}, ${cadTxt}${dupTxt}`;
  });
  const fresh = drafts.some((d) => !d.duplicate);
  const echo = [
    L(lang, "Esto es lo que entendí:", "Here's what I understood:"),
    ...lines,
    fresh ? L(lang, "¿Lo dejo programado así?", "Shall I schedule it like this?") : L(lang, "No hay nada nuevo que programar.", "There's nothing new to schedule."),
  ].join("\n");
  return { kind: "schedules", drafts, echo };
}

function prevKeyOf(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
function keyMonthsAgo(key: string, n: number): string {
  let k = key;
  for (let i = 0; i < n; i++) k = prevKeyOf(k);
  return k;
}

/* LA VIGILANCIA — candidatas en datos, como la deriva de la Ola 33:
   lo que llega (vence en ≤7 días), lo que NO llegó (el ingreso que se
   esperaba y no se anotó) y lo que se repite sin estar programado.
   La superficie que las muestra es de canon; aquí viaja el dato con
   su frase llana ya dicha. */
export type VigilCandidate = {
  kind: "llega" | "no-llego" | "sin-programar";
  concept: string;
  amountMinor: number | null;
  currency: Currency;
  date: string;
  text: string;
};

export function vigilancia(state: LedgerState, key: string, lang: Lang, today: string): VigilCandidate[] {
  const out: VigilCandidate[] = [];
  const money = (n: number, cur: Currency) => formatMoney(n, cur, lang);
  // Lo que llega: la ventana de vencimientos de la casa, 7 días.
  for (const d of duesWindow(state, 7, today)) {
    if (d.kind === "lent" || d.amt == null) continue;
    out.push({
      kind: "llega", concept: d.name, amountMinor: d.amt, currency: state.settings.display, date: d.on,
      text: L(lang, `El ${fmtDay(d.on, lang)} vence ${d.name}: ${money(d.amt, state.settings.display)}.`, `On ${fmtDay(d.on, lang)}, ${d.name} is due: ${money(d.amt, state.settings.display)}.`),
    });
  }
  // Lo que NO llegó: la serie de ingreso del mes pasado sin su línea
  // de este mes, pasado su día usual con dos días de gracia.
  const curLines = state.months[key]?.lines ?? [];
  const prevLines = state.months[prevKeyOf(key)]?.lines ?? [];
  const todayDay = Number(today.split("-")[2]);
  for (const l of prevLines) {
    if (!l.active || !/^income/.test(l.kind) || !l.bookedOn) continue;
    const usualDay = Number(l.bookedOn.split("-")[2]);
    if (todayDay <= usualDay + 2) continue;
    if (curLines.some((x) => x.active && x.seriesId === l.seriesId)) continue;
    const expected = isoOf(Number(key.split("-")[0]), Number(key.split("-")[1]), usualDay);
    out.push({
      kind: "no-llego", concept: l.concept, amountMinor: l.amountMinor, currency: l.currency, date: expected,
      text: L(lang, `«${l.concept}» solía entrar el día ${usualDay} y este mes no se ha anotado (se esperaban ${money(l.amountMinor, l.currency)}).`, `"${l.concept}" usually comes in on day ${usualDay} and hasn't been recorded this month (${money(l.amountMinor, l.currency)} were expected).`),
    });
  }
  // Lo que se repite sin estar programado: el mismo concepto de gasto
  // en al menos dos de los últimos tres meses, sin línea recurrente.
  const buckets = [key, prevKeyOf(key), keyMonthsAgo(key, 2)].filter((k) => state.months[k]);
  const byConcept = new Map<string, { concept: string; months: Set<string>; amounts: number[]; currency: Currency; scheduled: boolean }>();
  for (const k of buckets) {
    for (const l of state.months[k]?.lines ?? []) {
      if (!l.active || !isOut(l)) continue;
      const id = l.subId || foldQ(l.concept);
      const e = byConcept.get(id) ?? { concept: l.concept, months: new Set<string>(), amounts: [], currency: l.currency, scheduled: false };
      e.months.add(k);
      e.amounts.push(l.amountMinor);
      if (l.recurring || l.nextDue) e.scheduled = true;
      byConcept.set(id, e);
    }
  }
  for (const e of byConcept.values()) {
    if (e.months.size < 2 || e.scheduled || e.amounts.length < 2) continue;
    const sorted = [...e.amounts].sort((a, b) => a - b);
    const median = sorted[Math.floor((sorted.length - 1) / 2)];
    out.push({
      kind: "sin-programar", concept: e.concept, amountMinor: median, currency: e.currency, date: today,
      text: L(lang, `«${e.concept}» se ha pagado en ${e.months.size} de los últimos meses (mediana ${money(median, e.currency)}) y no está programado: si quieres, lo dejo programado.`, `"${e.concept}" has been paid in ${e.months.size} of the last few months (median ${money(median, e.currency)}) and isn't scheduled: I can schedule it if you want.`),
    });
  }
  return out;
}
