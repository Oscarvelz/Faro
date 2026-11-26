/**
 * liquidacion — LA CERCA DEL PAGO DE VUELTA Y SU ESPEJO
 * (acuerdo de los tres revisores, 2026-11-26; puerto a canon
 * 1.3.484).
 *
 * Medido por sonda: con deuda viva, «me pagó Alvin» salía
 * ingreso genérico y «le pagué a Alvin» gasto genérico, sin
 * vínculo con el registro; el libro quedaba con la deuda
 * viva. La regla: el relato consulta primero las deudas
 * vivas de esa persona; con un solo préstamo vivo y monto
 * que no pasa del saldo, el borrador lleva lentId/loanId (la
 * costura asienta con payLent/payLoan y el registro baja) y
 * el abono se declara con lo que queda; si el monto se pasa,
 * o hay dos préstamos vivos, se pregunta y no se asienta
 * nada. Sin deuda viva, el ingreso/gasto genérico queda
 * intacto. La ola trae también el espejo inglés del bigrama:
 * «Alvin paid me 50» entraba como gasto; paid/pays + me es
 * ingreso, como «me pagó».
 *
 * DOS RE-APUNTACIONES DE CANON, con acta (como en las cercas
 * del abono y del préstamo): (1) el eco de canon no trae
 * líneas desde la 1.3.463 — la declaración del abono vive en
 * el detalle de la tarjetita — así que lo que la copia
 * afirmaba sobre el eco se afirma aquí sobre los CAMPOS del
 * borrador (lentId/loanId, debtLeftMinor, debtCurrency);
 * (2) el extremo a extremo corre por la costura de canon,
 * settleRelatoDrafts, no por payLent/payLoan sueltos.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent, lentState, payLent } from "./debts.ts";
import { addLoan, loanState } from "./loans.ts";
import { parseRelato } from "./relato.ts";
import { settleRelatoDrafts } from "./relato-settle.ts";
import type { Lang, LedgerState } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  return ledger;
}
function relato(ledger: LedgerState, raw: string, lang: Lang = "es") {
  return parseRelato(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, TODAY);
}
function conLent(person = "Alvin", minor = 5000): LedgerState {
  return addLent(fixture(), { id: "lent-1", person, kind: "plain", amountMinor: minor, currency: "USD", aprBps: 0, startedOn: "2026-10-01", dueOn: "", note: "" });
}
function conLoan(person = "Alvin", minor = 5000): LedgerState {
  return addLoan(fixture(), { id: "loan-1", lender: person, who: "person", kind: "plain", amountMinor: minor, currency: "USD", aprBps: 0, takenOn: "2026-10-01", note: "" } as Parameters<typeof addLoan>[1]);
}

describe("me deben: el pago de vuelta abona el préstamo vivo", () => {
  it("«me pagó Alvin los 50» con préstamo de 50: lleva lentId y queda saldado (debtLeft 0)", () => {
    const r = relato(conLent(), "me pagó Alvin los 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "ingreso");
    assert.equal(r.drafts[0].lentId, "lent-1");
    assert.equal(r.drafts[0].debtLeftMinor, 0);
    assert.equal(r.drafts[0].debtCurrency, "USD");
  });
  it("«me pagó Alvin 30»: abono parcial, quedan 20 declarados en el borrador", () => {
    const r = relato(conLent(), "me pagó Alvin 30");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].lentId, "lent-1");
    assert.equal(r.drafts[0].debtLeftMinor, 2000);
  });
  it("«me pagó Alvin 70»: se pasa del saldo, se pregunta y no se asienta", () => {
    const r = relato(conLent(), "me pagó Alvin 70");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "exceso");
    assert.match(r.question, /te debe \$50\.00/);
  });
  it("dos préstamos vivos con Alvin: se pregunta a cuál va", () => {
    let s = conLent();
    s = addLent(s, { id: "lent-2", person: "Alvin", kind: "plain", amountMinor: 3000, currency: "USD", aprBps: 0, startedOn: "2026-10-05", dueOn: "", note: "" });
    const r = relato(s, "me pagó Alvin 30");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "prestamo");
  });
  it("inglés: «Alvin paid me 50» abona igual (el espejo del bigrama)", () => {
    const r = relato(conLent(), "Alvin paid me 50", "en");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "ingreso");
    assert.equal(r.drafts[0].lentId, "lent-1");
    assert.equal(r.drafts[0].debtLeftMinor, 0);
  });
});

describe("debo: el espejo, pagarle a quien le debo amortiza la deuda", () => {
  it("«le pagué 30 a Alvin» con deuda de 50: lleva loanId y quedan 20", () => {
    const r = relato(conLoan(), "le pagué 30 a Alvin");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "gasto");
    assert.equal(r.drafts[0].loanId, "loan-1");
    assert.equal(r.drafts[0].debtLeftMinor, 2000);
  });
  it("«le pagué 50 a Alvin»: la deuda queda saldada (debtLeft 0)", () => {
    const r = relato(conLoan(), "le pagué 50 a Alvin");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].loanId, "loan-1");
    assert.equal(r.drafts[0].debtLeftMinor, 0);
  });
  it("«le pagué 70 a Alvin»: se pasa, se pregunta", () => {
    const r = relato(conLoan(), "le pagué 70 a Alvin");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "exceso");
    assert.match(r.question, /Le debes \$50\.00 a Alvin/);
  });
});

describe("las guardas: sin deuda viva en ese lado, lo genérico no se toca", () => {
  it("sin deuda alguna: «me pagó Alvin los 50» es ingreso genérico, sin lentId", () => {
    const r = relato(fixture(), "me pagó Alvin los 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "ingreso");
    assert.equal(r.drafts[0].lentId, undefined);
  });
  it("la deuda viva está en el otro lado (yo le debo a Alvin): «me pagó Alvin 50» no abona nada", () => {
    const r = relato(conLoan(), "me pagó Alvin 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].lentId, undefined);
    assert.equal(r.drafts[0].loanId, undefined);
  });
  it("el préstamo vivo es de otra persona (Carlos): «me pagó Alvin 50» no lo toca", () => {
    const r = relato(conLent("Carlos"), "me pagó Alvin 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].lentId, undefined);
  });
  it("el préstamo ya está saldado (saldo cero): «me pagó Alvin 50» es genérico", () => {
    let s = conLent();
    s = payLent(s, "lent-1", 5000, "2026-10-10", "pay-0", "Abono");
    const r = relato(s, "me pagó Alvin 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].lentId, undefined);
  });
});

describe("la doctrina extremo a extremo: asentado por la costura, el registro baja", () => {
  it("el borrador de «me pagó Alvin 30», asentado: el saldo de Alvin baja a 20 y la línea lleva lentId", () => {
    const s = conLent();
    const r = relato(s, "me pagó Alvin 30");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    const s2 = settleRelatoDrafts(s, r.drafts, "es");
    const lent = s2.lent?.[0];
    assert.ok(lent);
    assert.equal(lentState(s2, lent, TODAY).left, 2000);
    const line = Object.values(s2.months).flatMap((m) => m.lines).find((l) => l.lentId === "lent-1");
    assert.ok(line);
    assert.ok(line.kind.startsWith("income"));
  });
  it("el borrador de «le pagué 30 a Alvin», asentado: mi deuda con Alvin baja a 20", () => {
    const s = conLoan();
    const r = relato(s, "le pagué 30 a Alvin");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    const s2 = settleRelatoDrafts(s, r.drafts, "es");
    const loan = s2.loans?.[0];
    assert.ok(loan);
    assert.equal(loanState(s2, loan, TODAY).left, 2000);
    const line = Object.values(s2.months).flatMap((m) => m.lines).find((l) => l.loanId === "loan-1");
    assert.ok(line);
  });
});
