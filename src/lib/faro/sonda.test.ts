import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addRemitPerson } from "./remit-people.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

/* LA SONDA DEL CODE-SWITCHING, COMO BATERÍA PERMANENTE.
 * El diseño vive en SONDA-CODE-SWITCHING-DISENO.md y la medición
 * completa en SONDA-CODE-SWITCHING-RESULTADOS.md. La vara no es
 * el acierto: es que ningún silencio honesto se convierta en
 * CIFRA EQUIVOCADA por una mezcla de idiomas. Lo que esta
 * batería cerca es lo que la medición encontró roto y se curó:
 * la exclusión cruzada que invertía la cifra, el nombre de
 * persona que secuestraba el mes, y la costura bilingüe del
 * ciudadano. Los huecos honestos que la sonda midió (el verbo
 * cruzado que no se oye, el ancla «last viernes») NO se afirman
 * aquí como doctrina: viven en el acta de resultados.
 * ACTUALIZACIÓN (Ola P1, 1.3.477): la clase 4 del frente ambiguo
 * quedó cerrada en su parte de anclas — hoy, ayer, antier, el día
 * de la semana y el fin de semana son rangos con su fecha en
 * periodOf —; lo mal formado («el last viernes») sigue declarado
 * abierto, como quedó escrito. */

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";
function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}
function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], bookedOn: `${KEY}-01`, ...partial,
  };
}

/* EL LIBRO SELLADO DE LA SONDA: contactos Bill y April, el mes en
 * curso SIN el recibo de agua. Gasto de octubre: $1,230 en 5
 * líneas (renta 800, comida 150, gasolina 60, remesas 220). */
function libroSonda(rentaSinSub = false): LedgerState {
  let l = createInitial("es", "oscuro");
  l.settings.display = "USD";
  l = addRemitPerson(l, "Mamá", "mama").state;
  l = addRemitPerson(l, "Bill", "bill").state;
  l = addRemitPerson(l, "April", "april").state;
  l.months[KEY] = { lines: [
    line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
    line({ id: "renta", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: rentaSinSub ? "" : "f.casa.renta", bookedOn: "2026-10-01" }),
    line({ id: "comida", kind: "expense" as LineKind, concept: "Comida", amountMinor: 15000, categoryId: "f-alimentos", subId: "f.alimentos.super", bookedOn: "2026-10-11" }),
    line({ id: "gasolina", kind: "expense" as LineKind, concept: "Gasolina", amountMinor: 6000, categoryId: "f-transporte", subId: "f.transporte.gas", bookedOn: "2026-10-09" }),
    line({ id: "pp", kind: "expense" as LineKind, concept: "PayPal", amountMinor: 50000, categoryId: "f-ahorro", subId: "f.ahorro.paypal", bookedOn: "2026-10-03" }),
    line({ id: "rm1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-10", to: "mama" }),
    line({ id: "rm2", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 5000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-12", to: "bill" }),
  ] };
  l.months[PREV] = { lines: [
    line({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-09-05", monthKey: PREV }),
    line({ id: "renta0", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-09-01", monthKey: PREV }),
    line({ id: "agua0", kind: "expense-fixed" as LineKind, concept: "Agua", amountMinor: 4000, categoryId: "f-casa", subId: "f.casa.agua", bookedOn: "2026-09-14", monthKey: PREV }),
    line({ id: "rm0", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 3000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-09-10", monthKey: PREV, to: "april" }),
  ] };
  return l;
}

describe("sonda · el control monolingüe sostiene", () => {
  it("los totales y la exclusión de siempre, en los dos idiomas", () => {
    const l = libroSonda();
    const es = ask(l, "¿Cuánto gasté este mes?");
    assert.equal(es.kind, "answer");
    if (es.kind === "answer") assert.ok(es.verdict.includes("$1,230.00"), es.verdict);
    const en = ask(l, "How much did I spend this month?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") assert.ok(en.verdict.includes("$1,230.00"), en.verdict);
    const sin = ask(l, "¿Cuánto gasté en octubre sin la renta?");
    assert.equal(sin.kind, "answer");
    if (sin.kind === "answer") assert.ok(sin.verdict.includes("$430.00"), sin.verdict);
  });
});

describe("sonda · la exclusión cruzada ya no invierte la cifra", () => {
  it("without, except, minus y excluding restan lo excluido, no lo devuelven", () => {
    const l = libroSonda();
    const cases: Array<[string, "es" | "en", string]> = [
      ["¿Cuánto gasté en octubre without contar la renta?", "es", "$430.00"],
      ["How much did I spend in October without rent?", "en", "$430.00"],
      ["How much did I spend excluding rent?", "en", "$430.00"],
      ["¿Cuánto gasté en octubre except la comida?", "es", "$1,080.00"],
      ["¿Cuánto gasté minus las remesas?", "es", "$1,010.00"],
      ["¿Cuánto gasté en octubre sin contar la renta?", "es", "$430.00"],
    ];
    for (const [q, lang, fig] of cases) {
      const r = ask(l, q, lang);
      assert.equal(r.kind, "answer", q);
      if (r.kind === "answer") assert.ok(r.verdict.includes(fig), `${q} -> ${r.verdict}`);
    }
  });

  it("la costura del ciudadano: la línea que solo lleva el concepto también se excluye", () => {
    const l = libroSonda(true);
    const en = ask(l, "How much did I spend in October without rent?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") assert.ok(en.verdict.includes("$430.00"), en.verdict);
    const es = ask(l, "¿Cuánto gasté en octubre sin la renta?");
    assert.equal(es.kind, "answer");
    if (es.kind === "answer") assert.ok(es.verdict.includes("$430.00"), es.verdict);
  });
});

describe("sonda · el nombre que también es un mes", () => {
  it("«a April en mayo» pregunta por April en mayo, no por abril", () => {
    const l = libroSonda();
    const r = ask(l, "¿Cuánto le envié a April en mayo?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") {
      assert.ok(r.verdict.includes("mayo de 2026"), r.verdict);
      assert.ok(r.verdict.includes("April"), r.verdict);
    }
  });

  it("el guardián: «en abril» sin persona sigue siendo el mes de abril", () => {
    const l = libroSonda();
    const r = ask(l, "¿Cuánto gasté en abril?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.ok(r.verdict.includes("abril de 2026"), r.verdict);
  });
});

describe("sonda · sin corrupción por reparación", () => {
  it("las palabras puente no se convierten en otro ciudadano", () => {
    const l = libroSonda();
    const biles = ask(l, "¿Cuánto gasté en los biles?");
    assert.equal(biles.kind, "answer");
    if (biles.kind === "answer") {
      assert.ok(biles.verdict.includes("biles"), biles.verdict);
      assert.ok(!biles.verdict.includes("$150.00") && !biles.verdict.includes("$800.00"), biles.verdict);
    }
    const luz = ask(l, "¿Cuánto pagué del bill de la luz?");
    assert.equal(luz.kind, "answer");
    if (luz.kind === "answer") assert.ok(luz.verdict.includes("luz"), luz.verdict);
    const card = ask(l, "¿Cuánto debo de la card?");
    assert.equal(card.kind, "answer");
    if (card.kind === "answer") assert.ok(/no debes nada/i.test(card.verdict), card.verdict);
  });

  it("el cero honesto se dice con su derivación: el agua de este mes", () => {
    const l = libroSonda();
    const r = ask(l, "¿Cuánto gasté en agua este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.ok(r.verdict.includes("$0.00"), r.verdict);
  });
});
