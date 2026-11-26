/**
 * prestamo — LA CERCA DEL PRÉSTAMO EN LAS DOS DIRECCIONES
 * (prioridad de Hark, 2026-11-26; puerto a canon 1.3.483).
 *
 * «le presté 50 a Alvin» y «Alvin me prestó 50» caían en
 * silencio simétrico (DIR-A1, Ola 74). El servicio vive en
 * Debo y Me deben, y un error de dirección pone la deuda del
 * lado equivocado: el borrador declara su lado («debo» /
 * «me-deben») y la costura lo asienta con addLoan / addLent.
 * El cuarteto de direcciones va entero en esta cerca: las dos
 * de prestar (nuevas) y las dos de pagar lo debido (que ya
 * vivían en DIR-A3 y aquí se reafirman sobre el mismo libro).
 * Guardas: el sustantivo «préstamo» no es el verbo («pagué el
 * préstamo» no lo toca esta puerta), sin monto o sin persona
 * se pregunta, y la doctrina extremo a extremo: asentado, la
 * deuda queda del lado correcto y el flujo del mes no se
 * mueve (una deuda no es gasto ni ingreso).
 *
 * DOS RE-APUNTACIONES DE CANON, con acta (como en la cerca
 * del abono, 1.3.482): (1) el eco de canon no trae líneas
 * desde la 1.3.463 (lo que la copia afirmaba sobre el eco se
 * afirma aquí sobre los CAMPOS del borrador, y el eco se
 * afirma en su forma exacta: cabeza y pregunta, nada más);
 * (2) el extremo a extremo corre por la costura de canon,
 * settleRelatoDrafts, no por addLent/addLoan sueltos — es la
 * costura la que decide el lado al asentar.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { lentOf } from "./debts.ts";
import { summarize } from "./engine.ts";
import { loansOf } from "./loans.ts";
import { parseRelato } from "./relato.ts";
import { settleRelatoDrafts } from "./relato-settle.ts";
import type { Lang, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs = [{ id: "f.ahorro.colchon", nameKey: "f.ahorro.colchon", customName: "Colchón", icon: "vault:generic", hidden: false, order: 10 }];
  ledger.structure.catalog = ledger.structure.catalog.filter((c) => c.kind !== "acct");
  ledger.structure.catalog.push({ id: "acct-banco", nameKey: "", customName: "Banco", icon: "", hidden: false, order: 90, kind: "acct", urlTemplate: "" });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 120000, bookedOn: "2026-10-05" }),
    ],
  };
  ledger.settings.display = "USD";
  return ledger;
}

function relato(ledger: LedgerState, raw: string, lang: Lang = "es") {
  return parseRelato(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, TODAY);
}

describe("el cuarteto de direcciones", () => {
  it("«le presté 50 a Alvin»: préstamo del lado Me deben, persona Alvin", () => {
    const r = relato(fixture(), "le presté 50 a Alvin");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "prestamo");
    assert.equal(r.drafts[0].debtSide, "me-deben");
    assert.equal(r.drafts[0].concept, "Alvin");
    assert.equal(r.drafts[0].amountMinor, 5000);
    assert.equal(r.echo, "Esto es lo que entendí:\n\n¿Lo asiento así?");
  });

  it("«Alvin me prestó 50»: préstamo del lado Debo, persona Alvin", () => {
    const r = relato(fixture(), "Alvin me prestó 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "prestamo");
    assert.equal(r.drafts[0].debtSide, "debo");
    assert.equal(r.drafts[0].concept, "Alvin");
    assert.equal(r.drafts[0].amountMinor, 5000);
    assert.equal(r.echo, "Esto es lo que entendí:\n\n¿Lo asiento así?");
  });

  it("«me pagó Alvin los 50»: sigue siendo ingreso (el pago de lo debido no se mueve)", () => {
    const r = relato(fixture(), "me pagó Alvin los 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "ingreso");
    assert.equal(r.drafts[0].concept, "Alvin");
  });

  it("«le pagué a Alvin los 50»: sigue siendo gasto (el pago de lo debido no se mueve)", () => {
    const r = relato(fixture(), "le pagué a Alvin los 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "gasto");
    assert.equal(r.drafts[0].concept, "Alvin");
  });

  it("inglés: «I lent Alvin 50» es Me deben y «Alvin lent me 50» es Debo", () => {
    const a = relato(fixture(), "I lent Alvin 50", "en");
    assert.equal(a.kind, "drafts");
    if (a.kind === "drafts") {
      assert.equal(a.drafts[0].op, "prestamo");
      assert.equal(a.drafts[0].debtSide, "me-deben");
      assert.equal(a.drafts[0].concept, "Alvin");
    }
    const b = relato(fixture(), "Alvin lent me 50", "en");
    assert.equal(b.kind, "drafts");
    if (b.kind === "drafts") {
      assert.equal(b.drafts[0].op, "prestamo");
      assert.equal(b.drafts[0].debtSide, "debo");
      assert.equal(b.drafts[0].concept, "Alvin");
    }
  });
});

describe("las guardas del préstamo", () => {
  it("sin monto se pregunta nombrando el préstamo: «le presté a Alvin»", () => {
    const r = relato(fixture(), "le presté a Alvin");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "monto");
    assert.match(r.question, /préstamo a Alvin/i);
  });

  it("sin persona se pregunta: «me prestaron 50»", () => {
    const r = relato(fixture(), "me prestaron 50");
    // «prestaron» sin sujeto nombrado: o pregunta el nombre o cae
    // en silencio — lo que no puede es inventar una persona.
    if (r.kind === "drafts") assert.fail("asentó un préstamo sin persona");
    if (r.kind === "ask") assert.equal(r.missing, "concepto");
  });

  it("el sustantivo no es el verbo: «pagué el préstamo 200» no lo toca esta puerta", () => {
    const r = relato(fixture(), "pagué el préstamo 200");
    if (r.kind === "drafts") assert.notEqual(r.drafts[0].op, "prestamo");
  });

  it("la doctrina extremo a extremo, por la costura: la deuda queda en su lado y el flujo del mes no se mueve", () => {
    const ledger = fixture();
    const before = summarize(ledger, KEY, "es");
    const r1 = relato(ledger, "le presté 50 a Alvin");
    assert.equal(r1.kind, "drafts");
    if (r1.kind !== "drafts") return;
    const s1 = settleRelatoDrafts(ledger, r1.drafts, "es");
    assert.equal(lentOf(s1).length, 1);
    assert.equal(lentOf(s1)[0].person, "Alvin");
    assert.equal(lentOf(s1)[0].amountMinor, 5000);
    const r2 = relato(ledger, "Alvin me prestó 50");
    assert.equal(r2.kind, "drafts");
    if (r2.kind !== "drafts") return;
    const s2 = settleRelatoDrafts(ledger, r2.drafts, "es");
    assert.equal(loansOf(s2).length, 1);
    assert.equal(loansOf(s2)[0].lender, "Alvin");
    assert.equal(loansOf(s2)[0].amountMinor, 5000);
    const after = summarize(s1, KEY, "es");
    assert.equal(after.variable, before.variable, "prestar no es gasto");
    assert.equal(after.income, before.income, "que te presten no es ingreso");
  });
});
