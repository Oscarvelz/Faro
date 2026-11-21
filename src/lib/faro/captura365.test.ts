/**
 * Captura Inteligente — EL SALDO PROYECTADO, DÍA A DÍA (mapa §19.1,
 * brief BRIEF-SALDO-PROYECTADO, ola 1.3.365). La aceptación del brief,
 * reproducida a mano sobre un libro de muestra: la caminata día a día
 * hasta el fin del mes siguiente con SOLO lo comprometido — la cuota
 * en su fecha, la tarjeta con el pago del mes pasado, el fijo inferido
 * etiquetado, el ingreso seguro en su día — y ningún fantasma: el
 * ingreso variable no entra, la compra suelta no entra. El veredicto
 * se lee sobre lo libre y cambia de grado cuando el camino lo exige.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectWalk, readProjection } from "./projection";
import { answerQuestion, ASK_FLOORS } from "./ask";
import { answerBankQuestion } from "./ask2";
import { parseQuestion } from "./lexicon";
import { FEATURES } from "./mode";
import { createInitial, makeNamer } from "./defaults";
import { formatMoney } from "./money";
import type { CreditCard, LedgerState, Line } from "./types";
import type { ParseCtx } from "./textparse";

const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KEY = "2026-11";
const TODAY = "2026-11-21";
const money = (n: number) => formatMoney(n, "USD", "es");

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id,
    monthKey: KEY,
    currency: "USD",
    active: true,
    note: "",
    categoryId: "",
    subId: "",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "USD",
    icon: "",
    history: [],
    ...partial,
  };
}

const CARD: CreditCard = {
  id: "card-1", name: "Visa Banco", issuer: "", mark: "", color: "", last4: "1234",
  currency: "USD", limitMinor: null, dueDay: 10, aprBps: 0, autopay: null, rewards: "",
  snaps: [{ on: "2026-11-01", at: "2026-11-01T10:00:00.000Z", balanceMinor: 50000 }],
};

/** El libro de la aceptación: una cuenta con $1,000 y $200 apartados
 * del saldo; una cuota de internet de $60 (vence el 25); una tarjeta
 * que vence el 10, pagada por última vez en octubre con $120; la renta
 * de $400 de cada mes (patrón, sin serie); el salario seguro de $1,500
 * el día 30; y dos fantasmas que NO deben entrar: un ingreso variable
 * y una compra suelta. */
function specimen(balanceMinor = 100000, withCardPay = true): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push(
    { id: "f.ahorro.banco", nameKey: "", customName: "Banco", icon: "vault", hidden: false, order: 9 },
    { id: "f.ahorro.fondo365", nameKey: "", customName: "Fondo", icon: "", hidden: false, order: 10 },
  );
  ledger.months["2026-09"] = {
    lines: [
      line({ id: "sal-sep", seriesId: "sal-1", kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: "2026-09-30", monthKey: "2026-09" }),
    ],
  };
  ledger.months["2026-10"] = {
    lines: [
      line({ id: "sal-oct", seriesId: "sal-1", kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-30", monthKey: "2026-10" }),
      line({ id: "rent-oct", seriesId: "rent-1", kind: "expense-fixed", concept: "Renta", amountMinor: 40000, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-10-05", monthKey: "2026-10" }),
      ...(withCardPay
        ? [line({ id: "pay-1", kind: "expense-fixed", concept: "Pago tarjeta", amountMinor: 12000, cardId: "card-1", xfer: true, active: false, bookedOn: "2026-10-10", monthKey: "2026-10" })]
        : []),
    ],
  };
  ledger.months[KEY] = {
    lines: [
      line({ id: "acct-1", kind: "expense-fixed", concept: "Banco", amountMinor: balanceMinor, categoryId: "f-ahorro", subId: "f.ahorro.banco", balanceMinor, bookedOn: "2026-11-01" }),
      line({ id: "fund-1", kind: "expense-fixed", concept: "Apartado", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.fondo365", fund: "saldo", fundHost: "f.ahorro.banco", bookedOn: "2026-11-02" }),
      line({ id: "net-1", kind: "subscription", concept: "Internet", amountMinor: 6000, categoryId: "f-casa", subId: "f.casa.servicios", cadence: "monthly", nextDue: "2026-11-25", bookedOn: "2026-11-01" }),
      line({ id: "rent-nov", seriesId: "rent-1", kind: "expense-fixed", concept: "Renta", amountMinor: 40000, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-11-05" }),
      line({ id: "var-1", kind: "income-variable", concept: "Ventas", amountMinor: 99900, bookedOn: "2026-11-10" }),
      line({ id: "buy-1", kind: "purchase", concept: "Zapatos", amountMinor: 5000, categoryId: "v-personales", subId: "v.personales.otros", bookedOn: "2026-11-15" }),
    ],
  };
  ledger.cards = [CARD];
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}

test("365 aceptación — la caminata reproduce a mano los días con vencimiento", () => {
  const p = projectWalk(specimen(), TODAY);
  assert.equal(p.hasBase, true);
  assert.equal(p.startMinor, 100000);
  assert.equal(p.pledgedMinor, 20000);
  assert.equal(p.horizonEnd, "2026-12-31");
  const got = p.events.map((e) => `${e.day}|${e.kind}|${e.name}|${e.minor}|${e.expected ? "esp" : "real"}`);
  assert.deepEqual(got, [
    "2026-11-21|card|Visa Banco|-12000|real",
    "2026-11-25|due|Internet|-6000|real",
    "2026-11-30|income|Salario|150000|esp",
    "2026-12-05|fixed|Renta|-40000|esp",
    "2026-12-10|card|Visa Banco|-12000|real",
    "2026-12-25|due|Internet|-6000|real",
    "2026-12-30|income|Salario|150000|esp",
  ]);
  // Los saldos de cierre, a mano: parten de $1,000 ($800 libres).
  const at = (d: string) => p.days.find((x) => x.day === d);
  assert.equal(at("2026-11-21")?.free, 68000);
  assert.equal(at("2026-11-25")?.free, 62000);
  assert.equal(at("2026-11-30")?.balance, 232000);
  assert.equal(p.monthEndBalance, 232000);
  assert.equal(p.monthEndFree, 212000);
  assert.equal(p.endBalance, 324000);
  assert.equal(p.endFree, 304000);
  // El día más apretado es el correcto, con su causa.
  assert.equal(p.tightest?.day, "2026-11-25");
  assert.equal(p.tightest?.free, 62000);
  assert.equal(p.tightest?.cause, "Internet");
  assert.equal(p.firstFreeNegative, null);
  assert.equal(p.firstBalanceNegative, null);
});

test("365 cercas 1 y 2 — ningún fantasma entra y cada evento dice su fuente", () => {
  const r = readProjection(specimen(), "es", TODAY);
  assert.ok(!r.events.some((e) => e.name === "Ventas"), "el ingreso variable no entra hasta que se anota");
  assert.ok(!r.events.some((e) => e.name === "Zapatos"), "la compra suelta no es un compromiso");
  const byName = (n: string, day: string) => r.events.find((e) => e.name === n && e.day === day);
  assert.equal(byName("Renta", "2026-12-05")?.source, "esperado: de tu patrón de cada mes");
  assert.equal(byName("Salario", "2026-11-30")?.source, "esperado: tu ingreso de cada mes, en su día");
  assert.equal(byName("Visa Banco", "2026-11-21")?.source, "el pago del mes pasado a esta tarjeta");
  assert.equal(byName("Visa Banco", "2026-12-10")?.source, "tu último pago a esta tarjeta, en octubre");
  assert.equal(byName("Internet", "2026-11-25")?.source, "la cuota anotada, en su fecha");
  assert.ok(r.verdict.startsWith("Llegas hasta el 31 de diciembre"), r.verdict);
  assert.ok(r.tightestText?.includes("el 25") && r.tightestText?.includes("Internet") && r.tightestText?.includes(money(62000)), r.tightestText ?? "");
  const en = readProjection(specimen(), "en", TODAY);
  assert.ok(en.verdict.startsWith("You make it to December 31st"), en.verdict);
});

test("365 F-P2 — la tarjeta nunca pagada cuenta el balance completo, y lo declara", () => {
  const r = readProjection(specimen(100000, false), "es", TODAY);
  const card = r.events.find((e) => e.kind === "card" && e.day === "2026-11-21");
  assert.equal(card?.minor, -50000);
  assert.equal(card?.source, "nunca la has pagado: cuento el balance completo");
});

test("365 cerca 4 — el veredicto cambia de grado: tocando lo apartado, y no llegas", () => {
  // Con $300 de saldo y $200 apartados: el saldo aguanta, lo libre no.
  const touching = readProjection(specimen(30000), "es", TODAY);
  assert.equal(touching.firstFreeNegative, "2026-11-21");
  assert.equal(touching.firstBalanceNegative, null);
  assert.ok(touching.verdict.includes("tocando lo apartado"), touching.verdict);
  // Con $100: el saldo mismo cae el primer día, tras la tarjeta.
  const short = readProjection(specimen(10000), "es", TODAY);
  assert.equal(short.firstBalanceNegative, "2026-11-21");
  assert.ok(short.verdict.includes("no llegas"), short.verdict);
  assert.ok(short.verdict.includes("Visa Banco"), short.verdict);
});

test("365 sin base — sin una cuenta con saldo, la lectura lo declara y no camina", () => {
  const ledger = specimen();
  ledger.months[KEY] = { lines: (ledger.months[KEY]?.lines ?? []).filter((l) => l.id !== "acct-1") };
  // Sin base es sin CUENTA: el sub-bóveda mismo se va de la estructura
  // (una cuenta declarada en $0 sí es base: el camino parte de cero).
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (ahorro) ahorro.subs = ahorro.subs.filter((s) => s.id !== "f.ahorro.banco");
  const p = projectWalk(ledger, TODAY);
  assert.equal(p.hasBase, false);
  const r = readProjection(ledger, "es", TODAY);
  assert.ok(r.verdict.includes("falta una cuenta con su saldo anotado"), r.verdict);
});

test("365 la familia — las tres preguntas de Oscar responden del mismo camino", () => {
  const ledger = specimen();
  const names = makeNamer(ledger.structure, "es");
  const q1 = parseQuestion("¿Llego al día 30?", ctx(ledger));
  assert.equal(q1?.intent, "reach");
  assert.equal(q1?.day, 30);
  const a1 = answerQuestion(ledger, KEY, "es", names, "¿Llego al día 30?", ctx(ledger), TODAY, "completo");
  assert.equal(a1.kind, "answer");
  if (a1.kind === "answer") {
    assert.ok(a1.verdict.includes("al día 30"), a1.verdict);
    assert.ok(a1.verdict.includes(money(212000)), a1.verdict);
    assert.ok(a1.note?.includes("solo entra lo ya comprometido"), a1.note ?? "");
  }
  const a2 = answerQuestion(ledger, KEY, "es", names, "¿Cuál es mi día más apretado?", ctx(ledger), TODAY, "completo");
  assert.equal(a2.kind, "answer");
  if (a2.kind === "answer") assert.ok(a2.verdict.includes("el 25") && a2.verdict.includes("Internet"), a2.verdict);
  const a3 = answerQuestion(ledger, KEY, "es", names, "¿Cómo llego a fin de mes?", ctx(ledger), TODAY, "completo");
  assert.equal(a3.kind, "answer");
  if (a3.kind === "answer") {
    assert.ok(a3.verdict.includes("a fin de mes"), a3.verdict);
    assert.ok(a3.verdict.includes(money(212000)), a3.verdict);
  }
  // Y por la puerta del banco, la familia llega con su nombre.
  const b = answerBankQuestion(ledger, KEY, "es", names, "¿Llego al día 30?", ctx(ledger), TODAY, undefined, "completo");
  assert.equal(b.kind, "answer");
  if (b.kind === "answer") assert.equal(b.family, "reach");
  const en = parseQuestion("What's my tightest day?", ctx(ledger, "en"));
  assert.equal(en?.intent, "reach");
  assert.equal(en?.tightest, true);
});

test("365 el piso — en Esencial la familia nombra Completo y no entrega cifras", () => {
  const ledger = specimen();
  const names = makeNamer(ledger.structure, "es");
  const a = answerQuestion(ledger, KEY, "es", names, "¿Llego al día 30?", ctx(ledger), TODAY, "esencial");
  assert.equal(a.kind, "answer");
  if (a.kind === "answer") {
    assert.ok(a.verdict.includes("Completo"), a.verdict);
    assert.equal(a.pieces.length, 0);
  }
});

test("365 los asientos — la casa de la caminata es Completo, en el registro y en los pisos de Preguntar", () => {
  assert.equal(FEATURES["advisor.projection"], "completo");
  assert.equal(ASK_FLOORS["advisor.projection"], "completo");
});

test("365 cercas 3 y 5 — un solo registro de vencimientos y ningún escenario en el camino", () => {
  const s = src("./projection.ts");
  assert.ok(s.includes("from \"./autopay.ts\""), "consume el registro de autopay.ts");
  assert.ok(s.includes("from \"./dues.ts\""), "consume la ventana única de dues.ts");
  assert.ok(!s.includes("projectLeft("), "el escenario «como sueles» queda fuera (F-P3)");
  assert.ok(!s.includes("readAdvisor("), "la caminata no depende de los escenarios de la Lectura");
});
