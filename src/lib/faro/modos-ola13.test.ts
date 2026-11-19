/**
 * FARO — OLA 13 DE PREJUICIO: la cura y sus pines funcionales.
 *
 * La enfermedad de la ola: LAS SUMAS A MANO volvieron en cinco caras
 * (el Asesor sumaba fuera del predicado único: spendByPerson, el margen
 * y el sobre, las rebanadas «gasto», la hoja Presupuesto y el flujo de
 * apartado sin guarda de clase), EL KIT DE LOS LIBROS componía la mano
 * de administrar sin mirar el modo y ACTUABA en Esencial (CARA-1), y LO
 * DERIVADO no seguía a su fuente en el préstamo (G13-1) como ya hacía
 * en la tarjeta. Cada familia queda clavada aquí con el espécimen de la
 * caza corriendo sobre las funciones reales; las cercas de clase viven
 * en modos-ola9 (§A-quater y mut13-a), modos-ola11 (§A rebanadas y §B
 * derivada) y modos-ola12 (§B delegación y firmas, §D sin chapter).
 * Los libros son especímenes fijados a mano; jamás producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CARD_DERIVED_FROM, fuseCardDraft } from "./cards.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { buildBudget, buildInsights, spendCategorySlices, studyBoard, summarize } from "./engine.ts";
import { buildSheets, type ExportPick } from "./export-docs.ts";
import { LOAN_DERIVED_FROM, fuseLoanFields } from "./loans.ts";
import { spendByPerson } from "./people.ts";
import type { CreditCard, LedgerState, Lent, Line, Loan } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ── Libros de ficción: la forma de los especímenes de la caza
 * (bench-ola13/ases13-t1/t2). El apartado vive en la categoría semilla
 * de ahorro «f-ahorro» (role savings). ─────────────────────────────── */
let seq = 0;
const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }, key: string): Line => {
  seq += 1;
  const id = `l${seq}`;
  return {
    id, seriesId: id, monthKey: key, concept: "", currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
    icon: "", history: [], ...partial,
  } as Line;
};
const book = (months: Record<string, Line[]>, lang: "es" | "en" = "es"): LedgerState => {
  const b = createInitial(lang, "claro");
  (b.settings as { mode?: string }).mode = "completo";
  for (const [k, lines] of Object.entries(months)) b.months[k] = { lines };
  return b;
};
const ingreso = (key: string, minor = 3_000_000) => line({ kind: "income-fixed", concept: "Salario", amountMinor: minor }, key);
/** El Libro Mentira de la caza (ases13-t2): ingreso 30,000 · gasto
 * verdadero 12,300 (8,000 fijo + 4,000 variable + 300 suscripción) ·
 * apartado 15,000 (5,000 fijo + 10,000 variable). */
const mentira = (key = "2026-10") => book({
  [key]: [
    ingreso(key),
    line({ kind: "expense-fixed", concept: "Renta", amountMinor: 800_000, categoryId: "f-renta" }, key),
    line({ kind: "expense-variable", concept: "Mercado", amountMinor: 400_000 }, key),
    line({ kind: "subscription", concept: "Netflix", amountMinor: 30_000 }, key),
    line({ kind: "expense-fixed", concept: "Apartado a Meta", amountMinor: 500_000, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, key),
    line({ kind: "expense-variable", concept: "Apartado variable a la meta", amountMinor: 1_000_000, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, key),
  ],
});
const names = (b: LedgerState) => makeNamer(b.structure, "es");

/* ═══════════ §A · BR13-A1 — spendByPerson POR EL PREDICADO ══════════
 * La base: apartar 99,000 y regalar 1,000 leía «1% de lo que gastaste»;
 * un apartado etiquetado a la persona se imprimía como regalo dado; y
 * lo descansado entraba en la base de la fracción. */
describe("§A · BR13-A1 — «Gasto por persona» suma por isSpendLine en los dos lados", () => {
  const withPerson = (b: LedgerState) => {
    b.people = [{ id: "p-ana", name: "Ana", birthday: "", dates: [], note: "" }];
    return b;
  };
  it("el denominador es el gasto: regalar 1,000 de 9,000 gastados lee 11.1%, no 1%", () => {
    const b = book({ "2026-10": [
      line({ kind: "expense-variable", concept: "Regalo", amountMinor: 100_000, personId: "p-ana" }, "2026-10"),
      line({ kind: "expense-variable", concept: "Mercado", amountMinor: 800_000 }, "2026-10"),
      line({ kind: "expense-variable", concept: "Apartado etiquetado", amountMinor: 9_900_000, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, "2026-10"),
    ] });
    withPerson(b);
    const r = spendByPerson(b, 2026, "NIO", 0);
    assert.equal(r.spent, 900_000, "la base es el gasto (9,000), no la suma ancha (108,000)");
    assert.equal(r.rows[0]!.minor, 100_000);
    assert.ok(Math.abs((r.rows[0]!.minor / r.spent) * 100 - 11.1) < 0.05, "la parte verdadera es 11.1%");
  });
  it("un apartado ETIQUETADO a la persona no es un regalo: la fila lee C$0", () => {
    const b = book({ "2026-10": [
      line({ kind: "expense-variable", concept: "Mercado", amountMinor: 500_000 }, "2026-10"),
      line({ kind: "expense-variable", concept: "Apartado etiquetado", amountMinor: 500_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", personId: "p-ana" }, "2026-10"),
    ] });
    withPerson(b);
    const r = spendByPerson(b, 2026, "NIO", 0);
    assert.equal(r.rows.length, 0, "sin líneas de gasto de la persona no hay fila de regalos");
    assert.equal(r.spent, 500_000);
  });
  it("lo descansado no cuenta en NINGÚN lado de la fracción (descanso.ts)", () => {
    const b = book({ "2026-10": [
      line({ kind: "expense-variable", concept: "Regalo", amountMinor: 100_000, personId: "p-ana" }, "2026-10"),
      line({ kind: "expense-variable", concept: "Mercado en descanso", amountMinor: 900_000, rest: true }, "2026-10"),
    ] });
    withPerson(b);
    const r = spendByPerson(b, 2026, "NIO", 0);
    assert.equal(r.spent, 100_000, "la base sin lo descansado: la parte es 100%, no 10%");
    assert.equal(r.rows[0]!.minor / r.spent, 1);
  });
  it("personLines NO se amputa: el historial de la persona conserva su apartado etiquetado", () => {
    const s = SRC("./people.ts");
    assert.match(s, /for \(const line of personLines\(state, person\.id\)\) if \(line\.monthKey\.startsWith\(`\$\{year\}-`\) && isSpendLine\(state\.structure, line\)\)/,
      "el filtro vive en la agregación de spendByPerson, no en personLines");
  });
});

/* ═══════════ §A · BR13-A2 — EL MARGEN Y EL SOBRE, POR EL PREDICADO ══
 * La base: el «Gasto con margen» sumaba variable+purchases por clase
 * (46.7% con el apartado dentro), el sobre «Día a día» lo cobraba dos
 * veces, y la tarjeta nacía con C$10,000 en un mes de puro apartado. */
describe("§A · BR13-A2 — el margen, el sobre y los recortes leen gasto, y el apartado se nombra", () => {
  it("flex vale el gasto variable verdadero (4,000) y su detalle NOMBRA el apartado variable", () => {
    const b = mentira();
    const flex = buildInsights(b, "2026-10", "es", names(b)).find((i) => i.id === "flex")!;
    assert.equal(flex.value, "C$4,000.00");
    assert.match(flex.detail, /13\.3% de tu ingreso, en gastos variables y compras, sin contar C\$10,000\.00 de ahorro\./);
  });
  it("el sobre «Día a día» cobra el apartado UNA sola vez: su actual es el gasto (4,000)", () => {
    const b = mentira();
    const board = studyBoard(b, "2026-10", "es", names(b));
    const env = board.envelopes.find((e) => e.name === "Día a día")!;
    assert.equal(env.actual, 400_000);
  });
  it("un mes de PURO apartado variable no hace nacer la tarjeta de margen", () => {
    const b = book({ "2026-10": [
      ingreso("2026-10"),
      line({ kind: "expense-variable", concept: "Apartado variable", amountMinor: 1_000_000, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, "2026-10"),
    ] });
    const flex = buildInsights(b, "2026-10", "es", names(b)).find((i) => i.id === "flex");
    assert.equal(flex, undefined, "sin gasto no hay margen que contar");
  });
  it("buildBudget: la categoría de ahorro jamás sale nombrada en los recortes", () => {
    const b = mentira();
    const budget = buildBudget(b, "2026-10", "es", names(b));
    assert.ok(budget, "hay presupuesto");
    assert.ok(budget.cuts.every((c) => c.name !== "Ahorro"), "ningún recorte propone recortar el apartado");
    // y en el mes de puro apartado variable no hay hueco que recortar:
    const b2 = book({ "2026-10": [
      ingreso("2026-10"),
      line({ kind: "expense-variable", concept: "Apartado variable", amountMinor: 1_000_000, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, "2026-10"),
    ] });
    const budget2 = buildBudget(b2, "2026-10", "es", names(b2));
    assert.ok(budget2);
    assert.equal(budget2.cuts.length, 0, "sin gasto variable no hay recortes: el apartado no es un hueco");
  });
});

/* ═══════════ §A · BR13-A3 — LAS REBANADAS «GASTO» SIN EL AHORRO ═════
 * La base: el donut «En qué se va el gasto» y la hoja «Categorias»
 * coronaban al Ahorro (54.9% del «gasto»). El corte va antes del
 * pliegue: el apartado oculto tampoco entra en el «Otros» del gasto. */
describe("§A · BR13-A3 — las caras nombradas «gasto» leen spendCategorySlices", () => {
  it("spendCategorySlices no lleva la rebanada de ahorro; el donut corona la Renta", () => {
    const b = mentira();
    const slices = spendCategorySlices(b, "2026-10", names(b), "es");
    assert.ok(!slices.some((s) => s.id === "f-ahorro"), "sin rebanada de ahorro");
    assert.equal(slices[0]!.name, "Renta");
    const board = studyBoard(b, "2026-10", "es", names(b));
    assert.equal(board.donut[0]!.name, "Renta");
    assert.ok(!board.donut.some((d) => d.name === "Ahorro"), "el donut no corona al Ahorro");
  });
  it("la hoja «Categorias» reparte el gasto (Renta 65%), no el movimiento", () => {
    const b = mentira();
    const pick: ExportPick = { scope: "month", activeOnly: false, kinds: [], savings: true, debt: true, summary: true, charts: true, advice: false, remit: false };
    const hoja = buildSheets(b, "2026-10", "es", names(b), pick).find((sh) => sh.name === "Categorias")!;
    const val = (c: unknown): unknown => (c && typeof c === "object" ? (c as { v: unknown }).v : c);
    const renta = hoja.rows.find((row) => val(row[0]) === "Renta")!;
    assert.equal(val(renta[1]), 8000);
    assert.equal(val(renta[2]), 65);
    assert.ok(!hoja.rows.some((row) => val(row[0]) === "Ahorro"), "el Ahorro no es una categoría del gasto en la hoja");
  });
  it("el apartado OCULTO tampoco entra en el «Otros» de una cara de gasto (el corte precede al pliegue)", () => {
    const b = mentira();
    const cat = b.structure.categories.find((c) => c.id === "f-ahorro")!;
    cat.hidden = true;
    const slices = spendCategorySlices(b, "2026-10", names(b), "es");
    const total = slices.reduce((a, s) => a + s.minor, 0);
    assert.equal(total, 1_230_000, "el total de las rebanadas del gasto es el gasto, con el ahorro oculto o visible");
  });
  it("el productor de movimiento NO se toca: categorySlices sigue componiendo la pila entera", () => {
    const s = SRC("./engine.ts");
    assert.match(s, /export function categorySlices\(state: LedgerState, key: string, names: Namer, lang: Lang\): Slice\[\]/);
    assert.match(s, /export function spendCategorySlices/);
  });
});

/* ═══════════ §A · BR13-A4 — LA HOJA PRESUPUESTO Y SU GEMELA ═════════
 * La base: «Total de gastos 27,300 · Gastas un 91%» con el apartado
 * dentro de GASTOS. La cura: totales por el predicado y la sección
 * AHORRO que nombra lo apartado (la forma de la cura de «Flujo»). */
describe("§A · BR13-A4 — el Presupuesto: «Total de gastos» es gasto y el apartado tiene su sección", () => {
  const pick: ExportPick = { scope: "all", activeOnly: false, kinds: ["income-fixed", "income-variable", "expense-fixed", "expense-variable", "purchase", "subscription"], savings: true, debt: true, summary: true, charts: true, advice: false, remit: false };
  const hoja = () => {
    const b = mentira("2026-10");
    const sheets = buildSheets(b, "2026-10", "es", names(b), pick);
    return sheets.find((sh) => sh.rows.flat().some((c) => c && typeof c === "object" && (c as { v: unknown }).v === "Presupuesto mensual"))!;
  };
  const val = (c: unknown): unknown => (c && typeof c === "object" ? (c as { v: unknown }).v : c);
  it("los totales son del gasto: 12,300 y «Gastas un 41», no 27,300 y 91", () => {
    const sh = hoja();
    const total = sh.rows.find((row) => /Total de gastos/.test(String(val(row[0]))))!;
    assert.equal(val(total[1]), 12300);
    const sum = sh.rows.find((row) => val(row[0]) === "Tengo")!;
    assert.equal(val(sum[4]), 12300, "«Gastaré» lee el gasto");
    assert.equal(val(sum[7]), 41, "el porcentaje verdadero del espécimen");
  });
  it("la sección AHORRO nombra lo apartado con su total, fuera de GASTOS", () => {
    const sh = hoja();
    const texts = sh.rows.map((row) => row.map(val));
    const idxAhorro = texts.findIndex((row) => row[0] === "AHORRO");
    assert.ok(idxAhorro > 0, "la hoja gana su sección AHORRO");
    const totalApartado = texts.find((row) => row[0] === "Total apartado")!;
    assert.equal(totalApartado[1], 15000);
    const idxGastos = texts.findIndex((row) => /Total de gastos/.test(String(row[0])));
    assert.ok(idxAhorro > idxGastos, "la sección vive tras el total de gastos, no dentro de él");
    const gastosBlock = texts.slice(0, idxGastos).flat().join(" ");
    assert.doesNotMatch(gastosBlock, /Apartado a Meta|Apartado variable/, "ningún bloque de apartado vive bajo GASTOS");
  });
  it("la gemela PDF (drawMonth) lleva el mismo reparto y la misma banda (fuente)", () => {
    const s = SRC("./export-docs.ts");
    assert.match(s, /const savedLines = lines\.filter\(\(line\) => isSavedLine\(ledger, line\)\);[\s\S]*?const spendLines/, "drawMonth reparte por isSavedLine");
    const bands = s.match(/band\(say\(lang, "AHORRO", "SAVINGS"\)\)/g) ?? [];
    assert.equal(bands.length, 1, "la banda AHORRO del PDF existe una vez");
    assert.match(s, /Total apartado/, "y su «Total apartado»");
  });
});

/* ═══════════ §A · BR13-A5 — savingsFlow CON GUARDA DE CLASE ══════════
 * La base: un INGRESO archivado en la categoría de ahorro («Reintegro
 * del fondo») contaba como flujo de apartado (la guarda que las
 * remesas ya tenían, isRemitLine). */
describe("§A · BR13-A5 — solo las SALIDAS hacia ahorro son flujo de apartado", () => {
  it("un ingreso de rol ahorro no es apartado: savingsFlow lee 0", () => {
    const b = book({ "2026-10": [
      ingreso("2026-10"),
      line({ kind: "income-variable", concept: "Reintegro del fondo", amountMinor: 200_000, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, "2026-10"),
    ] });
    const s = summarize(b, "2026-10", "es");
    assert.equal(s.savingsFlow, 0, "entró, no se apartó");
  });
  it("control: la salida hacia ahorro sigue contando entera", () => {
    const b = mentira();
    const s = summarize(b, "2026-10", "es");
    assert.equal(s.savingsFlow, 1_500_000, "los 15,000 apartados del Libro Mentira");
  });
});

/* ═══════════ §B · G13-1 — EL PAR DERIVADO DEL PRÉSTAMO ══════════════
 * El espécimen de la caza, en los dos sentidos y en las dos gemelas:
 * elegir «sin interés» dejaba la tasa viva en el registro (kind plain
 * con aprBps 1800) y volver a «interest» la resucitaba. */
describe("§B · G13-1 — fuseLoanFields: la tasa sigue a su fuente (la clase)", () => {
  const MAP: ReadonlyArray<readonly [keyof Loan, string]> = [
    ["lender", "name"], ["who", "who"], ["kind", "kind"], ["amountMinor", "amount"], ["currency", "currency"],
    ["aprBps", "apr"], ["takenOn", "date"], ["book", "book"], ["dueDay", "dueDay"],
  ];
  const liveLoan: Loan = {
    id: "ln-1", lender: "Banco", who: "entity", kind: "interest", amountMinor: 1_000_000, currency: "USD",
    aprBps: 1800, takenOn: "2026-10-01", book: "fixed", note: "",
  };
  it("el par está declarado: LOAN_DERIVED_FROM = [[aprBps, kind]]", () => {
    assert.deepEqual(LOAN_DERIVED_FROM, [["aprBps", "kind"]]);
  });
  it("elegir «sin interés» (solo la clase tocada) deja la tasa en 0 en el registro", () => {
    const candidate: Loan = { ...liveLoan, kind: "plain", aprBps: 0 }; // la forma compone la tasa desde la clase
    const fused = fuseLoanFields(liveLoan, candidate, new Set(["kind"]), MAP, LOAN_DERIVED_FROM);
    assert.equal(fused.kind, "plain");
    assert.equal(fused.aprBps, 0, "la derivada del candidato manda: la tasa viva no se cuela");
  });
  it("volver a «interest» no resucita la tasa que la persona quitó", () => {
    const liveSin: Loan = { ...liveLoan, kind: "plain", aprBps: 0 }; // el registro tras la cura
    const candidate: Loan = { ...liveSin, kind: "interest", aprBps: 0 }; // la forma nace leyendo 0: su campo de tasa va vacío
    const fused = fuseLoanFields(liveSin, candidate, new Set(["kind"]), MAP, LOAN_DERIVED_FROM);
    assert.equal(fused.kind, "interest");
    assert.equal(fused.aprBps, 0, "nada resucita: la tasa es la que la forma trae, cero");
  });
  it("control: sin tocar la clase, la tasa se sigue leyendo de lo vivo (la fusión de la ola 12 intacta)", () => {
    const candidate: Loan = { ...liveLoan, lender: "Banco Nuevo", aprBps: 1000 };
    const fused = fuseLoanFields(liveLoan, candidate, new Set(["name"]), MAP, LOAN_DERIVED_FROM);
    assert.equal(fused.lender, "Banco Nuevo");
    assert.equal(fused.aprBps, 1800);
  });
  it("la gemela («Me deben») obedece el mismo par", () => {
    const LENT_MAP: ReadonlyArray<readonly [keyof Lent, string]> = [
      ["person", "name"], ["kind", "kind"], ["amountMinor", "amount"], ["aprBps", "apr"], ["dueOn", "date"],
    ];
    const live: Lent = { id: "lt-1", person: "Ana", kind: "interest", amountMinor: 500_000, currency: "USD", aprBps: 1800, startedOn: "2026-10-01", dueOn: "2026-12-01", note: "" };
    const candidate: Lent = { ...live, kind: "plain", aprBps: 0 };
    const fused = fuseLoanFields(live, candidate, new Set(["kind"]), LENT_MAP, LOAN_DERIVED_FROM);
    assert.equal(fused.aprBps, 0);
    assert.equal(fused.kind, "plain");
  });
  it("los dos sitios de llamada pasan el par (fuente)", () => {
    assert.match(SRC("../../components/faro/loans.tsx"), /fuseLoanFields\(l, composed, d\.touched, LOAN_FIELD_MAP, LOAN_DERIVED_FROM\)/);
    assert.match(SRC("../../components/faro/debts.tsx"), /fuseLoanFields\(r, composed, d\.touched, LENT_FIELD_MAP, LOAN_DERIVED_FROM\)/);
  });
});

/* ═══════════ §B · OBS-G13-1 — LA TRAMPA DE LA TARJETA, CERRADA ══════
 * La derivación real de la fuente es issuer ← mark (proceed compone
 * `issuer: d.issuer || issuerOf(autoMark)?.name`): el par entra en
 * CARD_DERIVED_FROM hoy, para que el día que nazca un selector de
 * marca en edición la fusión ya sepa. */
describe("§B · OBS-G13-1 — CARD_DERIVED_FROM lleva el par issuer←mark, con su pin", () => {
  it("el par está escrito en la tabla de derivados", () => {
    assert.ok(CARD_DERIVED_FROM.some(([d, s]) => d === "issuer" && s === "mark"), "issuer deriva de mark");
    assert.ok(CARD_DERIVED_FROM.some(([d, s]) => d === "network" && s === "name"), "y el par de la ola 12 (network←name) sigue");
  });
  it("tocar la marca sin tocar el emisor arrastra el emisor derivado del candidato", () => {
    const base: CreditCard = {
      id: "cc-1", name: "Banco", issuer: "Banco Viejo", mark: "visa", color: "#079ed9", last4: "", currency: "USD",
      limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", snaps: [],
    };
    const born: Record<string, string> = {
      name: "Banco", last4: "", apr: "", promo: "", limit: "", dueDay: "", autopay: "", rewards: "",
      art: "", color: "#079ed9", balance: "", avail: "", min: "", dueOn: "", mark: "visa", issuer: "Banco Viejo", network: "", rw: "",
    };
    const draft = { ...born, mark: "mastercard" }; // solo la marca tocada (el selector futuro)
    const candidate: CreditCard = { ...base, mark: "mastercard", issuer: "Mastercard" }; // proceed derivó el emisor de la marca
    const fused = fuseCardDraft(base, candidate, draft, born);
    assert.equal(fused.mark, "mastercard");
    assert.equal(fused.issuer, "Mastercard", "el emisor derivado entra: no resucita el de lo vivo");
  });
  it("control: sin tocar la marca, el emisor se sigue leyendo de lo vivo", () => {
    const base: CreditCard = {
      id: "cc-1", name: "Banco", issuer: "Banco Vivo", mark: "visa", color: "#079ed9", last4: "", currency: "USD",
      limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", snaps: [],
    };
    const born: Record<string, string> = {
      name: "Banco", last4: "", apr: "", promo: "", limit: "", dueDay: "", autopay: "", rewards: "",
      art: "", color: "#079ed9", balance: "", avail: "", min: "", dueOn: "", mark: "visa", issuer: "Banco Foto", network: "", rw: "",
    };
    const draft = { ...born, apr: "30" };
    const candidate: CreditCard = { ...base, aprBps: 3000, issuer: "Banco Foto" };
    const fused = fuseCardDraft(base, candidate, draft, born);
    assert.equal(fused.issuer, "Banco Vivo");
    assert.equal(fused.aprBps, 3000);
  });
});

/* ═══════════ §C · CARA-1 — EL KIT COMPONE SU MANO POR MODO ══════════
 * El pin de cara: en Esencial la hoja del lápiz trae SOLO el renombre
 * (sin casillas, sin barra de administración, sin paleta); la mano
 * entera vive donde vive books.multiselect. La cerca es de fuente y el
 * banco CDP de la ronda la acompaña. */
describe("§C · CARA-1 — BookKit: la mano se compone desde su asiento", () => {
  const s = SRC("../../components/faro/book-kit.tsx");
  it("el kit consulta has(\"books.multiselect\"): el asiento gana su consumidor", () => {
    assert.match(s, /const canManage = has\("books\.multiselect"\);/);
  });
  it("sin el asiento, la mano es la de solo renombre de la .315 (la forma de editor.picker-rename)", () => {
    assert.match(s, /const manage: Manage = canManage\s*\?\s*\{ word, onDropMany: onDrop, onRename, onColor, onRestore, verb, body \}\s*:\s*\{ onRename \};/);
  });
  it("la paleta también se gobierna: paints nace de canManage", () => {
    assert.match(s, /const paints = canManage && !!\(onColor \|\| onIcon\);/);
  });
  it("ningún llamante necesita cambiar: la composición vive en el kit, no repartida en las cinco caras", () => {
    assert.match(s, /export function BookKit\(/);
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(!/BookKit[^>]*canManage/.test(screens), "las caras no componen la mano por su cuenta");
  });
});
