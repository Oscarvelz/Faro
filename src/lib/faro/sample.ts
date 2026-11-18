import type { CreditCard, LedgerState, Lent, Line, LineKind, Loan, Person, RemitPerson } from "./types";

/* ------------------------------------------------------------------ *
 *  La muestra LEGADA (1.3.87): un solo mes, agosto 2026, 15 filas.
 *  Se conserva como plantilla de pureza: un libro real que todavía la
 *  cargue intacta se sigue reconociendo y limpiando como siempre.
 * ------------------------------------------------------------------ */

const MONTH = "2026-08";

function line(
  id: string,
  kind: LineKind,
  concept: string,
  major: number,
  categoryId: string,
  subId: string,
  recurring: boolean,
): Line {
  return {
    id: `demo-ago-${id}`,
    seriesId: `demo-ago-${id}`,
    monthKey: MONTH,
    kind,
    concept,
    amountMinor: Math.round(major * 100),
    currency: "NIO",
    active: true,
    note: "Muestra",
    categoryId,
    subId,
    recurring,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "NIO",
    icon: "",
    history: [],
  };
}

/** August presupuesto, non-zero lines only. Temporary sample. */
export function augustSampleLines(): Line[] {
  return [
    line("salario", "income-fixed", "Salario 1", 10500, "", "", true),
    line("tabletas", "income-fixed", "Depósito tabletas", 1500, "", "", true),
    line("honorarios", "income-fixed", "Honorarios", 8891, "", "", true),
    line("negocio", "income-variable", "Negocio propio", 14585, "", "", false),
    line("bono", "income-variable", "Bono o pagos", 500, "", "", false),
    line("otro", "income-variable", "Otro", 2205, "", "", false),
    line("youtube", "expense-fixed", "Youtube", 185, "f-casa", "f.casa.youtube", true),
    line("celular", "expense-fixed", "Plan o recarga celular", 400, "f-casa", "f.casa.celular", true),
    line("internet", "expense-fixed", "Internet", 500, "f-casa", "f.casa.internet", true),
    line("gasolina", "expense-fixed", "Gasolina auto/moto", 1500, "f-transporte", "f.transporte.gasolina", true),
    line("funeraria", "expense-fixed", "Funeraria", 380, "f-familia", "f.familia.funeraria", true),
    line("despensa", "expense-fixed", "Despensa y mercado", 3500, "f-alimentos", "f.alimentos.despensa", true),
    line("tarjetas", "expense-fixed", "Tarjetas (tablets)", 1299, "f-creditos", "f.creditos.tarjetas", true),
    line("mejora", "expense-variable", "Mejora del hogar", 8800, "v-casa", "v.casa.mejora", false),
    line("xuper", "expense-variable", "XUPER TV", 10596, "v-entretenimiento", "v.entretenimiento.xuper", false),
  ];
}

export function withAugustSample(ledger: LedgerState): { ledger: LedgerState; added: boolean } {
  const bucket = ledger.months[MONTH]?.lines ?? [];
  if (bucket.some((item) => item.id.startsWith("demo-ago-"))) return { ledger, added: false };
  const now = new Date().toISOString();
  return {
    added: true,
    ledger: {
      ...ledger,
      months: { ...ledger.months, [MONTH]: { lines: [...bucket, ...augustSampleLines()] } },
      revision: ledger.revision + 1,
      updatedAt: now,
      audit: [{ id: `demo-ago-${Date.now()}`, at: now, detail: "Muestra de agosto" }, ...ledger.audit].slice(0, 40),
    },
  };
}

/* A line is sample by LINEAGE, not only by its own id (línea «Windows», 2026-11-13).
   The seed writes id = seriesId = demo-ago-*; but copyRecurring — the «Traer recurrentes»
   carry — mints every carried copy a fresh uid() id while keeping the seriesId, so from
   September on the sample lives under anonymous ids. Counting/stripping by id alone saw
   only August's originals: «Quitar filas de ejemplo» reported success and the carried
   copies kept feeding Tengo month after month, re-seeding the next carry forever
   (Oscar: «quito los datos de ejemplo… y todavía veo información que queda»). A seriesId
   with the demo-ago- prefix can only descend from this seed (uid() never mints one), so
   matching it removes exactly the sample's descendants — never a line of the user's own. */
const isDemo = (l: Line) => l.id.startsWith("demo-ago-") || (l.seriesId ?? "").startsWith("demo-ago-");

const allLines = (ledger: LedgerState): Line[] => Object.values(ledger.months).flatMap((m) => m?.lines ?? []);

/** True only when every line in the book is a LEGACY August sample line still exactly as
 * seeded (no other line anywhere, nothing edited). Anything else is the user's and is kept. */
export function isPureLegacySample(ledger: LedgerState): boolean {
  const all = allLines(ledger);
  if (!all.length || !all.every(isDemo)) return false;
  const tpl = new Map(augustSampleLines().map((l) => [l.id, l]));
  return all.every((l) => {
    const t = tpl.get(l.id);
    return !!t && l.monthKey === t.monthKey && l.kind === t.kind && l.concept === t.concept && l.amountMinor === t.amountMinor
      && l.currency === t.currency && l.active === t.active && l.note === t.note && l.categoryId === t.categoryId
      && l.subId === t.subId && l.recurring === t.recurring && (l.history?.length ?? 0) === 0 && (l.balanceMinor ?? null) === null;
  }) && new Set(all.map((l) => l.id)).size === all.length;
}

export function countSampleRows(ledger: LedgerState): number {
  return Object.values(ledger.months).reduce((n, m) => n + (m?.lines ?? []).filter(isDemo).length, 0);
}

/** Remove the sample lines and every carried descendant of them, and nothing else. */
export function stripSample(ledger: LedgerState): LedgerState {
  const months: LedgerState["months"] = {};
  for (const [k, m] of Object.entries(ledger.months)) months[k] = { ...m, lines: (m?.lines ?? []).filter((l) => !isDemo(l)) };
  // 1.3.291: la cuenta de la casa (arco v3) es mobiliario de la semilla, no del usuario:
  // su sub sale con las filas — un vault vacío sería un cadáver en Estructura. El id es
  // fijo y lo acuña solo la semilla (addAccount acuña vault-<uid>, jamás este), así que
  // quitarlo no puede tocar una cuenta de verdad.
  if (!ledger.structure.categories.some((c) => c.subs.some((s) => s.id === SAMPLE_ACCOUNT_ID))) return { ...ledger, months };
  const structure = {
    ...ledger.structure,
    categories: ledger.structure.categories.map((c) => (c.subs.some((s) => s.id === SAMPLE_ACCOUNT_ID) ? { ...c, subs: c.subs.filter((s) => s.id !== SAMPLE_ACCOUNT_ID) } : c)),
  };
  return { ...ledger, months, structure };
}

/* ------------------------------------------------------------------ *
 *  EL ARCO (1.3.280) — «la casa de ejemplo», jun → nov 2026.
 *
 *  La doctrina (Oscar, 2026-11-13): los datos de ejemplo deben llegar a
 *  CADA rincón de la app — una categoría vacía esconde una capacidad —
 *  porque el ejemplo es «una vista al futuro de lo que puede ser»: la
 *  app entera habitada, para explorar en solitario. El censo completo
 *  vive en ~/workspace/faro-sample-study/CENSUS.md (§2 la semilla, §2.4
 *  las cifras que ningún lector puede contradecir, §3 las cercas, §4
 *  lo que no se siembra honestamente: el Archivo, la foto del widget,
 *  qhIn y el aterrizaje del Historial quedan FUERA a propósito).
 *
 *  Una sola casa, una sola tabla: pagador de frente cargado (despensa,
 *  remesa, gasolina y tarjetas salen los días 3–6), tres bolsillos que
 *  se llenan cada mes, una tarjeta guardada con saldo, un préstamo que
 *  baja, un dinero prestado a Carlos que vuelve por partes, compras en
 *  Temu/Amazon/Shein pagadas con tarjetas que devuelven recompensas,
 *  MetroPCS y Google One en días escalonados, la remesa y el regalo a
 *  la misma Mamá. Cada fila de salida lleva sus cargos en `history`
 *  sumando EXACTO su importe y su día en `bookedOn`: el Patrón de
 *  ritmo nace graduado (juzga «on» en agosto y en noviembre) porque
 *  sus numeradores y denominadores describen el mismo dinero fechado.
 *
 *  EL ARCO V3 (1.3.291, oleada 5 del modelo de ahorros, diseño §11): la
 *  casa aprende el modelo nuevo DECLARÁNDOLO. Una cuenta con saldo real
 *  (Lafise, sub vault sembrado en la Estructura por la propia semilla)
 *  sostiene los fondos del saldo: «Viaje» y «Emergencia» viven sobre su
 *  saldo, amarrados a ella como anfitriona; «Casa» es dinero aparte que
 *  acumula su pila; el Retiro sigue siendo el Retiro. Sin la cuenta, un
 *  compromiso sin saldo detrás enseñaría dinero falso — justo lo que
 *  el modelo vino a matar. La cuenta crece mes a mes (5,000 → 15,400)
 *  cubriendo siempre sus compromisos (1,600 → 12,450): su Libre nunca
 *  es negativo y el piso de emergencia queda cubierto. El generador
 *  del arco 280 queda congelado abajo como plantilla de pureza v2, con
 *  la misma regla de ascenso de siempre: la casa pura se reemplaza,
 *  la caja de arena editada jamás se toca.
 * ------------------------------------------------------------------ */

export const SAMPLE_ARC_MONTHS = ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"] as const;
export const SAMPLE_V2_SEED = "sample-v2";
export const SAMPLE_V3_SEED = "sample-v3";
export const SAMPLE_V4_SEED = "sample-v4";
/** La cuenta de la casa: id fijo (addAccount acuña vault-<uid>, nunca este) y su sub
 *  tal como la semilla lo escribe en f-ahorro — la pureza v3 lo compara exacto. */
export const SAMPLE_ACCOUNT_ID = "vault-demo01";
export const SAMPLE_ACCOUNT_NAME = "Lafise";
export const SAMPLE_ACCOUNT_SUB = { id: SAMPLE_ACCOUNT_ID, nameKey: "", customName: SAMPLE_ACCOUNT_NAME, icon: "vault", hidden: false, order: 3 };
/** Saldos de la cuenta al cierre de cada mes del arco (mayores, C$). */
const ACCOUNT_BALANCES = [5000, 7500, 9300, 10500, 13000, 15400];

const day = (key: string, d: number) => `${key}-${String(d).padStart(2, "0")}`;

type ArcOpts = {
  categoryId?: string;
  subId?: string;
  recurring?: boolean;
  /** Cargos fechados [día, monto mayor] — deben sumar el importe de la fila. */
  charges?: [number, number][];
  /** Día principal (el río del Historial y el respaldo fechado del Patrón). */
  bookedDay?: number;
  sourceId?: string;
  rc?: Line["rc"];
  storeId?: string;
  providerId?: string;
  cadence?: Line["cadence"];
  nextDue?: string;
  balanceMajor?: number;
  loanId?: string;
  lentId?: string;
  personId?: string;
  occasionId?: string;
  to?: string;
  /** 1.3.291: la naturaleza declarada del fondo (la estampa del modelo, §2.1). */
  fund?: Line["fund"];
  fundHost?: string;
  /** Icono de la LÍNEA (la cuenta lleva «vault», como las líneas de addAccount). */
  icon?: string;
  startedOn?: string;
};

function arcLine(key: string, name: string, kind: LineKind, concept: string, major: number, o: ArcOpts = {}): Line {
  const id = `demo-ago-${name}-${key.replace("-", "")}`;
  const bookedOn = o.bookedDay ? day(key, o.bookedDay) : undefined;
  return {
    id,
    seriesId: `demo-ago-${name}`,
    monthKey: key,
    kind,
    concept,
    amountMinor: Math.round(major * 100),
    currency: "NIO",
    active: true,
    note: "Muestra",
    categoryId: o.categoryId ?? "",
    subId: o.subId ?? "",
    recurring: o.recurring ?? false,
    storeId: o.storeId ?? "",
    providerId: o.providerId ?? "",
    productCode: "",
    productUrl: "",
    cadence: o.cadence ?? "",
    nextDue: o.nextDue ?? "",
    aprBps: 0,
    balanceMinor: o.balanceMajor === undefined ? null : Math.round(o.balanceMajor * 100),
    balanceCurrency: "NIO",
    icon: o.icon ?? "",
    history: (o.charges ?? []).map(([d, m], i) => ({ id: `${id}-c${i + 1}`, date: day(key, d), amountMinor: Math.round(m * 100), currency: "NIO" as const, note: "" })),
    ...(bookedOn ? { bookedOn } : {}),
    ...(o.sourceId ? { sourceId: o.sourceId } : {}),
    ...(o.rc ? { rc: o.rc } : {}),
    ...(o.loanId ? { loanId: o.loanId } : {}),
    ...(o.lentId ? { lentId: o.lentId } : {}),
    ...(o.personId ? { personId: o.personId } : {}),
    ...(o.occasionId ? { occasionId: o.occasionId } : {}),
    ...(o.to ? { to: o.to } : {}),
    ...(o.fund ? { fund: o.fund } : {}),
    ...(o.fundHost ? { fundHost: o.fundHost } : {}),
    ...(o.startedOn ? { startedOn: o.startedOn } : {}),
  };
}

const NEGOCIO: Record<string, number> = { "2026-06": 11300, "2026-07": 13750, "2026-08": 14585, "2026-09": 12400, "2026-10": 15129, "2026-11": 14585 };
const OTRO: Record<string, number> = { "2026-06": 1450, "2026-07": 2205, "2026-08": 2205, "2026-10": 900 };
const BONO_MONTHS = new Set(["2026-08", "2026-09"]);

type ArcFund = { name: string; subId: string; concept: string; deposits: number[]; fund?: "saldo" | "aparte" };
/** Los fondos del arco v3 (1.3.291): Meta lleva los dos fondos de Oscar — «Casa» aparte
 *  y «Viaje» del saldo — con los MISMOS depósitos mensuales que la Meta única del arco
 *  280 sumaba (800…1,300 partidos 500+300, 550+350, …): el flujo de la bolsa no cambia,
 *  solo su composición. Emergencia declara «saldo»; el Retiro no declara nunca. */
const ARC_FUNDS: ArcFund[] = [
  { name: "ahorro-casa", subId: "f.ahorro.meta", concept: "Casa", deposits: [500, 550, 600, 650, 700, 750], fund: "aparte" },
  { name: "ahorro-viaje", subId: "f.ahorro.meta", concept: "Viaje", deposits: [300, 350, 400, 450, 500, 550], fund: "saldo" },
  { name: "ahorro-retiro", subId: "f.ahorro.retiro", concept: "Ahorro", deposits: [1800, 2100, 2400, 2600, 2800, 3000] },
  { name: "ahorro-emergencia", subId: "f.ahorro.emergencia", concept: "Emergencia", deposits: [1300, 1400, 1500, 1700, 1900, 2100], fund: "saldo" },
];
/** La tabla del arco 280, congelada: es la plantilla de pureza v2 (sampleArcLinesV2). */
const ARC_FUNDS_V2: ArcFund[] = [
  { name: "ahorro-meta", subId: "f.ahorro.meta", concept: "Ahorro", deposits: [800, 900, 1000, 1100, 1200, 1300] },
  { name: "ahorro-retiro", subId: "f.ahorro.retiro", concept: "Ahorro", deposits: [1800, 2100, 2400, 2600, 2800, 3000] },
  { name: "ahorro-emergencia", subId: "f.ahorro.emergencia", concept: "Ahorro", deposits: [1300, 1400, 1500, 1700, 1900, 2100] },
];
const cumulative = (xs: number[]) => xs.map((_, i) => xs.slice(0, i + 1).reduce((a, b) => a + b, 0));

/** El cuerpo del arco, compartido por las generaciones: la casa es la misma; lo que
 * cambia entre v2 y v3 son los fondos que la habitan y la cuenta que los sostiene.
 * La v4 (ola 4 de modos, E4-1) viste UNA línea con cadencia y fecha: la Despensa,
 * la primera burbuja de Fijos en cada mes — la lección del bote (módulo 3) se
 * camina también DESDE la casa, sobre este libro, y sin una línea fija fechada
 * el informe del bote no existe aquí aunque la etapa del escenario sí la traiga. */
function arcLines(funds: ArcFund[], account: number[] | null, dated = false): Line[] {
  const out: Line[] = [];
  SAMPLE_ARC_MONTHS.forEach((key, mi) => {
    const despensa = key === "2026-06" ? 3400 : key === "2026-07" ? 3600 : 3500;
    // — Lo que entra —
    out.push(arcLine(key, "salario", "income-fixed", "Salario 1", 10500, { recurring: true, bookedDay: 1, sourceId: "acct-chase-chk" }));
    out.push(arcLine(key, "tabletas", "income-fixed", "Depósito tabletas", 1500, { recurring: true, bookedDay: 5, sourceId: "acct-chase-chk" }));
    out.push(arcLine(key, "honorarios", "income-fixed", "Honorarios", 8891, { recurring: true, bookedDay: 12, sourceId: "acct-chase-chk" }));
    out.push(arcLine(key, "negocio", "income-variable", "Negocio propio", NEGOCIO[key], { bookedDay: 9 }));
    if (BONO_MONTHS.has(key)) out.push(arcLine(key, "bono", "income-variable", "Bono o pagos", 500, { bookedDay: 20 }));
    if (OTRO[key]) out.push(arcLine(key, "otro", "income-variable", "Otro", OTRO[key], { bookedDay: 22 }));
    // — El núcleo fijo (el frente cargado: días 3–6) —
    out.push(arcLine(key, "despensa", "expense-fixed", "Despensa y mercado", despensa, { categoryId: "f-alimentos", subId: "f.alimentos.despensa", recurring: true, charges: [[3, despensa]], bookedDay: 3, ...(dated ? { cadence: "monthly" as const, startedOn: "2026-06-03" } : {}) }));
    out.push(arcLine(key, "remesa", "expense-fixed", "Remesa a mamá", 2500, { categoryId: "f-remesas", subId: "f.remesas.envios", recurring: true, charges: [[3, 2500]], bookedDay: 3, to: "demo-remit-mama" }));
    out.push(arcLine(key, "gasolina", "expense-fixed", "Gasolina auto/moto", 1500, { categoryId: "f-transporte", subId: "f.transporte.gasolina", recurring: true, charges: [[4, 900], [19, 600]], bookedDay: 4 }));
    out.push(arcLine(key, "tarjetas", "expense-fixed", "Tarjetas (tablets)", 1299, { categoryId: "f-creditos", subId: "f.creditos.tarjetas", recurring: true, charges: [[5, 1299]], bookedDay: 5, ...(key === "2026-11" ? { nextDue: "2026-12-05" } : {}) }));
    out.push(arcLine(key, "internet", "expense-fixed", "Internet", 500, { categoryId: "f-casa", subId: "f.casa.internet", recurring: true, charges: [[8, 500]], bookedDay: 8, ...(key === "2026-11" ? { nextDue: "2026-12-08" } : {}) }));
    out.push(arcLine(key, "celular", "expense-fixed", "Plan o recarga celular", 400, { categoryId: "f-casa", subId: "f.casa.celular", recurring: true, charges: [[10, 400]], bookedDay: 10 }));
    out.push(arcLine(key, "funeraria", "expense-fixed", "Funeraria", 380, { categoryId: "f-familia", subId: "f.familia.funeraria", recurring: true, charges: [[12, 380]], bookedDay: 12 }));
    out.push(arcLine(key, "youtube", "expense-fixed", "Youtube", 185, { categoryId: "f-casa", subId: "f.casa.youtube", recurring: true, charges: [[15, 185]], bookedDay: 15 }));
    out.push(arcLine(key, "xuper", "expense-variable", "XUPER TV", 10596, { categoryId: "v-entretenimiento", subId: "v.entretenimiento.xuper", charges: [[6, 10596]], bookedDay: 6 }));
    // — La cuenta de la casa (solo v3): su saldo al cierre de cada mes, con lo que
    // entró en el mes como importe — la misma doble forma que las bolsas. —
    if (account) {
      const bal = account[mi]!;
      const delta = bal - (mi > 0 ? account[mi - 1]! : 0);
      out.push(arcLine(key, "cuenta", "expense-fixed", SAMPLE_ACCOUNT_NAME, delta, {
        categoryId: "f-ahorro", subId: SAMPLE_ACCOUNT_ID, charges: [[2, delta]], bookedDay: 2, balanceMajor: bal, icon: "vault", startedOn: "2026-06-01",
      }));
    }
    // — Los fondos, cada mes —
    for (const p of funds) {
      out.push(arcLine(key, p.name, "expense-fixed", p.concept, p.deposits[mi]!, {
        categoryId: "f-ahorro", subId: p.subId, recurring: true, charges: [[28, p.deposits[mi]!]], bookedDay: 28, balanceMajor: cumulative(p.deposits)[mi],
        ...(p.fund ? { fund: p.fund } : {}),
        ...(p.fund === "saldo" ? { fundHost: SAMPLE_ACCOUNT_ID } : {}),
      }));
    }
    // — Llegadas de la segunda mitad —
    if (key === "2026-08") out.push(arcLine(key, "mejora", "expense-variable", "Mejora del hogar", 8800, { categoryId: "v-casa", subId: "v.casa.mejora", charges: [[21, 8800]], bookedDay: 21 }));
    if (key >= "2026-09") {
      out.push(arcLine(key, "prestamo", "expense-fixed", "Préstamo personal", 2500, { categoryId: "f-creditos", subId: "f.creditos.personal", recurring: true, charges: [[15, 2500]], bookedDay: 15, loanId: "demo-loan" }));
      out.push(arcLine(key, "metropcs", "subscription", "MetroPCS", 650, { providerId: "metropcs", cadence: "monthly", recurring: true, charges: [[18, 650]], bookedDay: 18, nextDue: day(key, 18) }));
    }
    if (key === "2026-09") out.push(arcLine(key, "temu", "purchase", "Compra en Temu", 2350, { categoryId: "hogar", storeId: "temu", charges: [[14, 2350]], bookedDay: 14, sourceId: "acct-pp-card", rc: "online" }));
    if (key >= "2026-10") out.push(arcLine(key, "googleone", "subscription", "Google One", 120, { providerId: "googleone", cadence: "monthly", recurring: true, charges: [[25, 120]], bookedDay: 25, nextDue: day(key, 25) }));
    if (key === "2026-10") {
      out.push(arcLine(key, "amazon", "purchase", "Compra en Amazon", 4999, { categoryId: "tech", storeId: "amazon", charges: [[16, 4999]], bookedDay: 16, sourceId: "acct-chase-card", rc: "other" }));
      out.push(arcLine(key, "regalo", "expense-variable", "Regalo para mamá", 900, { categoryId: "v-viajes", subId: "v.viajes.regalos", charges: [[20, 900]], bookedDay: 20, personId: "demo-person-mama", occasionId: "birthday" }));
      out.push(arcLine(key, "abono", "income-variable", "Abono de préstamo", 3000, { bookedDay: 14, lentId: "demo-lent" }));
    }
    if (key === "2026-11") out.push(arcLine(key, "shein", "purchase", "Compra en Shein", 1450, { categoryId: "ropa", storeId: "shein", charges: [[11, 1450]], bookedDay: 11, sourceId: "acct-pp-card", rc: "online" }));
  });
  return out;
}

/** Las 128 filas del arco v4: las del arco v3, con la Despensa fechada
 * (cadencia mensual y arranque el 2026-06-03, su primer cargo). */
export function sampleArcLines(): Line[] {
  return arcLines(ARC_FUNDS, ACCOUNT_BALANCES, true);
}

/** Las 128 filas del arco v3 (1.3.291), congeladas: la plantilla de pureza de
 * su generación — las 116 del arco 280, con la Meta partida en dos fondos
 * (+6), más la serie de la cuenta de la casa (+6). */
export function sampleArcLinesV3(): Line[] {
  return arcLines(ARC_FUNDS, ACCOUNT_BALANCES);
}

/** Las 116 filas del arco 280, congeladas: la plantilla de pureza de su generación. */
export function sampleArcLinesV2(): Line[] {
  return arcLines(ARC_FUNDS_V2, null);
}

/** La tarjeta guardada: la PayPal de la casa, con su lectura de noviembre (censo §2.2). */
export function sampleArcCard(): CreditCard {
  return {
    id: "card-paypal", name: "PayPal Cashback World Mastercard", issuer: "PayPal", mark: "paypal", color: "#003087", art: "paypal", network: "mastercard",
    last4: "4821", currency: "USD", limitMinor: 100000, dueDay: 21, aprBps: 2499, autopay: null, rewards: "",
    snaps: [{ on: "2026-11-01", at: "2026-11-01T12:00:00.000Z", balanceMinor: 42000, minMinor: 2500, statementMinor: 38500, src: "manual" }],
    preset: "paypal",
  };
}

/** El préstamo recibido: C$30,000 al 18% desde julio; tres pagos de C$2,500 lo van bajando. */
export function sampleArcLoan(): Loan {
  return { id: "demo-loan", lender: "Banco", who: "entity", kind: "interest", amountMinor: 3000000, currency: "NIO", aprBps: 1800, takenOn: "2026-07-01", dueDay: 15, book: "fixed", note: "Muestra" };
}

/** Lo prestado a Carlos: C$8,000 en septiembre; el abono de octubre deja C$5,000. */
export function sampleArcLent(): Lent {
  return { id: "demo-lent", person: "Carlos (hermano)", kind: "plain", amountMinor: 800000, currency: "NIO", aprBps: 0, startedOn: "2026-09-10", dueOn: "2026-12-10", note: "Muestra" };
}

export function sampleArcPerson(): Person {
  return { id: "demo-person-mama", name: "Mamá", birthday: "1962-11-22", dates: [], note: "" };
}

export function sampleArcRemitPerson(): RemitPerson {
  return { id: "demo-remit-mama", name: "Mamá" };
}

export const SAMPLE_ARC_PINS = [{ c: "f-alimentos", s: "f.alimentos.despensa" }, { c: "f-casa", s: "" }];

/** La Estructura del arco: la de la base, con el sub de la cuenta de la casa en
 * f-ahorro si aún no está (idempotente: la semilla nunca duplica su propia cuenta). */
function withSampleAccountSub(structure: LedgerState["structure"]): LedgerState["structure"] {
  if (structure.categories.some((c) => c.subs.some((s) => s.id === SAMPLE_ACCOUNT_ID))) return structure;
  return {
    ...structure,
    categories: structure.categories.map((c) => (c.id === "f-ahorro" ? { ...c, subs: [...c.subs, { ...SAMPLE_ACCOUNT_SUB }] } : c)),
  };
}

/** El libro del arco completo sobre un libro base: los seis meses, la Estructura con
 * la cuenta de la casa y las colecciones de estado que la semilla vieja nunca
 * escribía. Solo se aplica dentro del namespace de ejemplo (provider, bajo
 * sampleOn) — jamás sobre un libro personal. Las marcas de semilla son TRES: la v4,
 * que es la que manda, y la v2 y la v3, que se siguen escribiendo para que una versión
 * anterior de la app (≤1.3.290) no intente re-sembrar sobre la casa nueva: su
 * withSampleArc se detiene ante la marca v2 y su pureza no reconoce las filas
 * nuevas, así que deja el libro en paz. */
export function buildSampleArc(ledger: LedgerState): LedgerState {
  const months: LedgerState["months"] = {};
  for (const key of SAMPLE_ARC_MONTHS) months[key] = { lines: sampleArcLines().filter((l) => l.monthKey === key) };
  const seeds = ledger.settings.seeds ?? [];
  const nextSeeds = [...seeds];
  for (const s of [SAMPLE_V2_SEED, SAMPLE_V3_SEED, SAMPLE_V4_SEED]) if (!nextSeeds.includes(s)) nextSeeds.push(s);
  return {
    ...ledger,
    months,
    structure: withSampleAccountSub(ledger.structure),
    cards: [sampleArcCard()],
    loans: [sampleArcLoan()],
    lent: [sampleArcLent()],
    people: [sampleArcPerson()],
    remitPeople: [sampleArcRemitPerson()],
    settings: { ...ledger.settings, widgetPins: SAMPLE_ARC_PINS.map((p) => ({ ...p })), seeds: nextSeeds },
  };
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * LÍMITE DECLARADO (Guardián V, obs. 1 y 3 — declarado y cercado, no
 * sobreconstruido): esta comparación casa por id y JSON línea a línea —
 * NO compara multiconjuntos, ni cubos, ni orden. Un duplicado con el id
 * intacto que sustituyera a otra línea, un cruce de cubos o una
 * reordenación dentro del mes dejarían la casa «pura» a sus ojos, y el
 * ascenso reescribiría esos estados. Hoy ningún camino de la app produce
 * ninguno de los tres: no existe acción de duplicar, `upsertLine` archiva
 * por monthKey y reemplaza en el sitio, y `relocate` nunca sale del mes.
 * El día que un importador o una migración pueda escribir en el
 * namespace de la muestra, esta comparación debe volverse de
 * multiconjuntos ANTES de que ese camino aterrice. Y el ascenso deja
 * caer los cubos de mes vacíos fuera del arco: los meses solo guardan
 * líneas, así que no hay pérdida posible — un cubo vacío no contiene
 * nada que perder (la cerca de la ola 5 lo fija con su espécimen).
 */
const linesMatch = (ledger: LedgerState, tpl: Line[]): boolean => {
  const all = allLines(ledger);
  if (all.length !== tpl.length) return false;
  const byId = new Map(tpl.map((l) => [l.id, l]));
  return all.every((l) => { const t = byId.get(l.id); return !!t && sameJson(l, t); });
};

/** Las colecciones de estado, idénticas en las dos generaciones del arco. */
const sameCollections = (ledger: LedgerState): boolean =>
  sameJson(ledger.cards ?? [], [sampleArcCard()])
  && sameJson(ledger.loans ?? [], [sampleArcLoan()])
  && sameJson(ledger.lent ?? [], [sampleArcLent()])
  && sameJson(ledger.people ?? [], [sampleArcPerson()])
  && sameJson(ledger.remitPeople ?? [], [sampleArcRemitPerson()])
  && sameJson(ledger.settings.widgetPins ?? [], SAMPLE_ARC_PINS);

/** Pureza de un arco con cuenta de la casa (v3 y v4 comparten colecciones y
 * Estructura): el libro ES la semilla — filas y colecciones exactas,
 * y la Estructura lleva exactamente el sub de la cuenta de la casa como único vault
 * de f-ahorro. Estricta como la de siempre — cualquier toque la rompe. */
const pureArcWithAccount = (ledger: LedgerState, tpl: Line[], seed: string): boolean => {
  if (!linesMatch(ledger, tpl)) return false;
  if (!sameCollections(ledger)) return false;
  if (!(ledger.settings.seeds ?? []).includes(seed)) return false;
  const vaults = (ledger.structure.categories.find((c) => c.id === "f-ahorro")?.subs ?? [])
    .filter((s) => s.icon === "vault" || s.icon.startsWith("vault:"));
  return vaults.length === 1 && sameJson(vaults[0], SAMPLE_ACCOUNT_SUB);
};

/** Pureza del arco v4: la generación que manda. */
export function isPureArcSample(ledger: LedgerState): boolean {
  return pureArcWithAccount(ledger, sampleArcLines(), SAMPLE_V4_SEED);
}

/** Pureza del arco v3 (1.3.291), congelada con su generador: la plantilla contra la
 * que la regla de ascenso reconoce una casa de la generación anterior aún intacta. */
export function isPureArcSampleV3(ledger: LedgerState): boolean {
  return pureArcWithAccount(ledger, sampleArcLinesV3(), SAMPLE_V3_SEED);
}

/** Pureza del arco 280 (v2), congelada con su generador: la plantilla contra la que
 * la regla de ascenso reconoce una casa de la generación anterior aún intacta. */
export function isPureArcSampleV2(ledger: LedgerState): boolean {
  return linesMatch(ledger, sampleArcLinesV2())
    && sameCollections(ledger)
    && (ledger.settings.seeds ?? []).includes(SAMPLE_V2_SEED);
}

/** La pureza de la casa, con sus cuatro plantillas: el arco v4, el arco v3, el arco
 * 280 y la muestra legada de agosto. La puerta de carga de los libros personales la usa tal
 * cual: un libro que todavía sea SOLO muestra — de cualquiera de las
 * generaciones — empieza vacío. */
export function isPureSample(ledger: LedgerState): boolean {
  return isPureArcSample(ledger) || isPureArcSampleV3(ledger) || isPureArcSampleV2(ledger) || isPureLegacySample(ledger);
}

/**
 * La semilla del modo ejemplo, con la regla de ascenso del censo (§3.3):
 * (a) namespace con una muestra PURA de una generación anterior (la legada, el
 *     arco v2 o el arco v3) → se reemplaza entera por el arco v4;
 * (b) marca `sample-v4` presente → no-op (idempotente);
 * (c) namespace con filas que no son una muestra pura → INTOCADO: quien jugó en la
 *     caja de arena es dueño de sus ediciones; «Reiniciar ejemplo» es su camino;
 * (d) namespace fresco (sin filas) → el arco directo.
 * Un libro personal jamás entra aquí: el provider solo llama bajo sampleOn().
 */
export function withSampleArc(ledger: LedgerState): { ledger: LedgerState; added: boolean } {
  const seeds = ledger.settings.seeds ?? [];
  if (seeds.includes(SAMPLE_V4_SEED)) return { ledger, added: false };
  if (allLines(ledger).length > 0 && !isPureArcSampleV3(ledger) && !isPureArcSampleV2(ledger) && !isPureLegacySample(ledger)) return { ledger, added: false };
  const now = new Date().toISOString();
  return {
    added: true,
    ledger: {
      ...buildSampleArc(ledger),
      revision: ledger.revision + 1,
      updatedAt: now,
      audit: [{ id: `demo-ago-${Date.now()}`, at: now, detail: "Muestra: la casa de ejemplo" }, ...ledger.audit].slice(0, 40),
    },
  };
}
