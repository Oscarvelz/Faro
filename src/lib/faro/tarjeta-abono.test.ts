/**
 * tarjeta-abono — LA CERCA DEL PAGO DE TARJETA (prioridad de Hark,
 * 2026-11-26, desde la segunda respuesta de Gemini).
 *
 * Pagar la tarjeta NO es un gasto: el gasto ya contó al comprar;
 * el pago liquida la deuda (payCard: transferencia xfer inactiva).
 * El relato lo asentaba como gasto con concepto «Tarjeta» y el mes
 * contaba dos veces la misma compra — un error vivo en lo
 * publicado. Estas cercas fijan el cuarteto pedido (con y sin
 * monto, español e inglés) y sus guardas: la tarjeta como
 * instrumento («con la tarjeta») sigue siendo gasto, el concepto
 * real manda, sin tarjeta en el libro no se inventa un gasto, y
 * con dos tarjetas sin nombrar se pregunta cuál.
 *
 * PUERTO A CANON (1.3.482) — dos re-apuntes con acta: (1) la
 * línea del eco («Abono: Visa: $200.00 desde Banco») se afirma
 * sobre los campos del borrador y la tarjeta de la caja, porque
 * desde la 1.3.463 el eco de canon no lleva líneas (la palabra
 * «Abono» corona la tarjetita y el «desde» va como detalle);
 * (2) la doctrina extremo a extremo se corre por la costura de
 * canon (settleRelatoDrafts), que es quien llama payCard en la
 * app viva — la cerca cubre así la costura misma, no solo el
 * motor.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cardsOf, dropCard, putCard } from "./cards.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { summarize } from "./engine.ts";
import { parseRelato } from "./relato.ts";
import { settleRelatoDrafts } from "./relato-settle.ts";
import type { CreditCard, Lang, LedgerState, Line, LineKind } from "./types.ts";

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

const VISA: CreditCard = { id: "card-visa", name: "Visa", issuer: "", mark: "", color: "", network: "visa", last4: "1234", currency: "USD", limitMinor: null, dueDay: 15, aprBps: 0, autopay: null, rewards: "", snaps: [] };
const MC: CreditCard = { id: "card-mc", name: "Mastercard", issuer: "", mark: "", color: "", network: "mastercard", last4: "9876", currency: "USD", limitMinor: null, dueDay: 20, aprBps: 0, autopay: null, rewards: "", snaps: [] };

function fixture(cartas: CreditCard[]): LedgerState {
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs = [{ id: "f.ahorro.colchon", nameKey: "f.ahorro.colchon", customName: "Colchón", icon: "vault:generic", hidden: false, order: 10 }];
  ledger.structure.catalog = ledger.structure.catalog.filter((c) => c.kind !== "acct");
  ledger.structure.catalog.push({ id: "acct-banco", nameKey: "", customName: "Banco", icon: "", hidden: false, order: 90, kind: "acct", urlTemplate: "" });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 120000, bookedOn: "2026-10-05" }),
      line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-28" }),
      line({ id: "compra", kind: "purchase" as LineKind, concept: "Zapatos", amountMinor: 10000, categoryId: "ropa", bookedOn: "2026-10-15" }),
    ],
  };
  ledger.settings.display = "USD";
  for (const c of cardsOf(ledger)) ledger = dropCard(ledger, c.id, TODAY);
  for (const c of cartas) ledger = putCard(ledger, c);
  return ledger;
}

function relato(ledger: LedgerState, raw: string, lang: Lang = "es") {
  return parseRelato(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, TODAY);
}

describe("el cuarteto del abono", () => {
  it("«pagué la tarjeta» sin monto: pregunta el monto del abono, no asienta gasto", () => {
    const r = relato(fixture([VISA]), "pagué la tarjeta");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "monto");
    assert.match(r.question, /abono a Visa/i);
  });

  it("«pagué 200 de la tarjeta desde el banco»: borrador de abono contra la Visa, desde Banco", () => {
    const r = relato(fixture([VISA]), "pagué 200 de la tarjeta desde el banco");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 1);
    const d = r.drafts[0];
    assert.equal(d.op, "abono");
    assert.equal(d.cardId, "card-visa");
    assert.equal(d.amountMinor, 20000);
    assert.equal(d.from?.label, "Banco");
    // ACTA (puerto 1.3.482): en la copia la línea vivía en el eco;
    // en canon el eco no lleva líneas desde la 1.3.463 — el hecho
    // («Abono: Visa: $200.00 desde Banco») vive en el borrador y
    // en su tarjetita, y el eco queda en su forma de dos líneas.
    assert.equal(r.echo, "Esto es lo que entendí:\n\n¿Lo asiento así?");
  });

  it("«aboné 200 a la tarjeta»: la forma natural del abono también liquida", () => {
    const r = relato(fixture([VISA]), "aboné 200 a la tarjeta");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "abono");
    assert.equal(r.drafts[0].cardId, "card-visa");
  });

  it("inglés con monto: «paid 200 to my credit card from my bank» es abono", () => {
    const r = relato(fixture([VISA]), "paid 200 to my credit card from my bank", "en");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "abono");
    assert.equal(r.drafts[0].cardId, "card-visa");
    assert.equal(r.drafts[0].amountMinor, 20000);
    assert.equal(r.drafts[0].from?.label, "Banco");
  });

  it("inglés sin monto: «paid my credit card» pregunta el monto", () => {
    const r = relato(fixture([VISA]), "paid my credit card", "en");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "monto");
  });
});

describe("las guardas del abono", () => {
  it("la tarjeta como instrumento sigue siendo gasto: «compré un pollo por 20 pesos con la tarjeta»", () => {
    const r = relato(fixture([VISA]), "compré un pollo por 20 pesos con la tarjeta");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "gasto");
  });

  it("el concepto real manda: «pagué la luz 45 con la tarjeta» es gasto de luz", () => {
    const r = relato(fixture([VISA]), "pagué la luz 45 con la tarjeta");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "gasto");
    assert.equal(r.drafts[0].concept, "Luz");
  });

  it("sin la frase de la tarjeta, nada cambia: «pagué 45 de luz»", () => {
    const r = relato(fixture([VISA]), "pagué 45 de luz");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "gasto");
    assert.equal(r.drafts[0].concept, "Luz");
  });

  it("dos tarjetas sin nombrar: pregunta cuál, no adivina", () => {
    const r = relato(fixture([VISA, MC]), "pagué 100 de la tarjeta");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "tarjeta");
    assert.match(r.question, /Visa/);
    assert.match(r.question, /Mastercard/);
  });

  it("la tarjeta nombrada entre dos: «pagué 100 de la Visa» abona la Visa", () => {
    const r = relato(fixture([VISA, MC]), "pagué 100 de la Visa");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].op, "abono");
    assert.equal(r.drafts[0].cardId, "card-visa");
  });

  it("sin tarjetas en el libro: «pagué la tarjeta» no se inventa un gasto (silencio)", () => {
    const r = relato(fixture([]), "pagué la tarjeta");
    assert.equal(r.kind, "unknown");
  });

  it("la doctrina extremo a extremo: asentado por la costura, el gasto del mes no se mueve", () => {
    const ledger = fixture([VISA]);
    const r = relato(ledger, "pagué 200 de la tarjeta desde el banco");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    const before = summarize(ledger, KEY, "es");
    // ACTA (puerto 1.3.482): la copia llamaba payCard directo; en
    // canon la cerca corre por settleRelatoDrafts, la costura que
    // la caja usa — así la conversión y el asiento quedan cercados.
    const after = settleRelatoDrafts(ledger, r.drafts, "es");
    const sAfter = summarize(after, KEY, "es");
    assert.equal(sAfter.variable, before.variable, "el abono no suma gasto: la compra ya contó");
    assert.equal(sAfter.income, before.income);
    const l = after.months[KEY].lines.find((x) => x.cardId === "card-visa" && x.xfer)!;
    assert.ok(l, "la línea del abono existe");
    assert.equal(l.xfer, true);
    assert.equal(l.active, false);
    assert.equal(l.cardId, "card-visa");
    assert.equal(l.amountMinor, 20000);
    assert.equal(l.currency, "USD");
  });
});
