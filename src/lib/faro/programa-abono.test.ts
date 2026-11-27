/**
 * programa-abono — LA CERCA DEL ABONO PROGRAMADO (1.3.488).
 *
 * El defecto declarado por la línea del banco tras la 482:
 * parsePrograma tenía el mismo defecto de la tarjeta en futuro —
 * «pagaré la tarjeta mañana» nacía como programa de GASTO, y al
 * asentarse contaba otra vez lo que ya contó la compra, sin tocar
 * la tarjeta. El abono se programa como abono: el borrador guarda
 * la tarjeta resuelta y la costura lo asienta con la forma de todo
 * abono de la casa (transferencia inactiva con cardId), fechado en
 * su primera fecha; el saldo de la tarjeta solo lo cuenta desde
 * esa fecha (la regla 1.3.147) y su serie viaja por su marca.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cardFigures, cardPays, cardsOf, dropCard, putCard } from "./cards.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { summarize } from "./engine.ts";
import { parsePrograma } from "./relato.ts";
import { settleProgramaDrafts } from "./programa-settle.ts";
import { copyRecurring } from "./reducer.ts";
import type { CreditCard, LedgerState } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

const VISA: CreditCard = { id: "card-visa", name: "Visa", issuer: "", mark: "", color: "", network: "visa", last4: "1234", currency: "USD", limitMinor: null, dueDay: 15, aprBps: 2499, autopay: null, rewards: "", snaps: [] };
const MC: CreditCard = { id: "card-mc", name: "Mastercard", issuer: "", mark: "", color: "", network: "mastercard", last4: "9876", currency: "USD", limitMinor: null, dueDay: 20, aprBps: 2499, autopay: null, rewards: "", snaps: [] };

function fixture(cartas: CreditCard[]): LedgerState {
  let ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = { lines: [] };
  ledger.settings.display = "USD";
  for (const c of cardsOf(ledger)) ledger = dropCard(ledger, c.id, TODAY);
  for (const c of cartas) ledger = putCard(ledger, c);
  return ledger;
}

function prog(state: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return parsePrograma(state, KEY, lang, makeNamer(state.structure, lang), raw, TODAY);
}

describe("programa · el abono de tarjeta se programa como abono (1.3.488)", () => {
  it("«pagaré la tarjeta mañana» es un abono de una vez, no un gasto", () => {
    const r = prog(fixture([VISA]), "pagaré 200 de la tarjeta mañana");
    assert.equal(r.kind, "schedules");
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts.length, 1);
    const d = r.drafts[0];
    assert.equal(d.op, "abono");
    assert.equal(d.cardId, "card-visa");
    assert.equal(d.concept, "Visa");
    assert.equal(d.amountMinor, 20000);
    assert.equal(d.currency, "USD");
    assert.equal(d.cadence, "once");
    assert.equal(d.firstDate, "2026-10-23");
  });

  it("el espejo inglés: «I'll pay the card tomorrow»", () => {
    const r = prog(fixture([VISA]), "programa el pago de la tarjeta cada mes", "es");
    assert.equal(r.kind, "schedules");
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts[0].op, "abono");
    assert.equal(r.drafts[0].cadence, "monthly");
    const en = prog(fixture([VISA]), "I will pay 200 of the card tomorrow", "en");
    assert.equal(en.kind, "schedules");
    if (en.kind !== "schedules") return;
    assert.equal(en.drafts[0].op, "abono");
  });

  it("la tarjeta nombrada manda: «programa el pago de la Visa cada mes» con dos tarjetas", () => {
    const r = prog(fixture([VISA, MC]), "programa el pago de la Visa cada mes");
    assert.equal(r.kind, "schedules");
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts[0].cardId, "card-visa");
    assert.equal(r.drafts[0].cadence, "monthly");
  });

  it("con dos tarjetas y ninguna nombrada, pregunta cuál", () => {
    const r = prog(fixture([VISA, MC]), "pagaré 200 de la tarjeta mañana");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "tarjeta");
    assert.match(r.question, /¿Cuál tarjeta\?/);
  });

  it("«con la tarjeta» sigue siendo medio de otra compra: programa de gasto", () => {
    const r = prog(fixture([VISA]), "programa 100 de zapatos con la tarjeta cada mes");
    assert.equal(r.kind, "schedules");
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts[0].op, "gasto");
  });

  it("sin tarjetas en el libro no se inventa el abono: queda el programa de gasto de siempre", () => {
    const r = prog(fixture([]), "pagaré 200 de la tarjeta mañana");
    assert.equal(r.kind, "schedules");
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts[0].op, "gasto");
  });

  it("el monto oído en otra moneda llega al borrador en la moneda de la tarjeta", () => {
    const s = fixture([VISA]);
    s.settings.rateE4 = 366243; // C$36.6243 por dólar
    const r = prog(s, "pagaré 7,000 córdobas de la tarjeta mañana");
    assert.equal(r.kind, "schedules");
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts[0].currency, "USD");
    assert.ok(r.drafts[0].amountMinor !== null && r.drafts[0].amountMinor > 19000 && r.drafts[0].amountMinor < 19250, `estimado ${r.drafts[0].amountMinor}`);
  });

  it("la costura lo asienta como transferencia: no suma gasto y la tarjeta lo ve desde su fecha", () => {
    const s0 = fixture([{ ...VISA, snaps: [{ on: "2026-10-01", at: "2026-10-01T12:00:00.000Z", src: "manual", balanceMinor: 50000, minMinor: 2500, limitMinor: 200000, availMinor: 150000 }] }]);
    const r = prog(s0, "pagaré 200 de la tarjeta mañana");
    assert.equal(r.kind, "schedules");
    if (r.kind !== "schedules") return;
    const s1 = settleProgramaDrafts(s0, r.drafts);
    const pays = cardPays(s1, "card-visa");
    assert.equal(pays.length, 1);
    assert.equal(pays[0].xfer, true);
    assert.equal(pays[0].active, false);
    assert.equal(pays[0].bookedOn, "2026-10-23");
    assert.equal(pays[0].concept, "Abono · Visa");
    // El mes del abono no suma gasto por él.
    assert.equal(summarize(s1, "2026-10", "es").spend, summarize(s0, "2026-10", "es").spend);
    // Antes de su fecha no baja el saldo; a su fecha, sí.
    const card: CreditCard = { ...VISA, snaps: [{ on: "2026-10-01", at: "2026-10-01T12:00:00.000Z", src: "manual", balanceMinor: 50000, minMinor: 2500, limitMinor: 200000, availMinor: 150000 }] };
    assert.equal(cardFigures(s1, card, "2026-10-22").balance, 50000);
    assert.equal(cardFigures(s1, card, "2026-10-23").balance, 30000);
  });

  it("la serie mensual viaja a los meses siguientes por su marca, con su fecha", () => {
    const s0 = fixture([VISA]);
    const r = prog(s0, "programa el pago de la Visa cada mes");
    assert.equal(r.kind, "schedules");
    if (r.kind !== "schedules") return;
    const s1 = settleProgramaDrafts(s0, r.drafts);
    const born = (s1.months["2026-10"]?.lines ?? []).find((l) => l.cardId === "card-visa");
    assert.ok(born && born.recurring && born.cadence === "monthly");
    const { state: s2, count } = copyRecurring(s1, "2026-10", "2026-11");
    assert.equal(count, 1);
    const copy = (s2.months["2026-11"]?.lines ?? []).find((l) => l.cardId === "card-visa");
    assert.ok(copy);
    assert.equal((copy.bookedOn ?? "").slice(0, 7), "2026-11");
    assert.equal(copy.xfer, true);
    assert.equal(copy.active, false);
  });

  it("programar dos veces el mismo abono mensual: la segunda nace duplicada y no se asienta", () => {
    const s0 = fixture([VISA]);
    const r1 = prog(s0, "programa el pago de la Visa cada mes");
    assert.equal(r1.kind, "schedules");
    if (r1.kind !== "schedules") return;
    const s1 = settleProgramaDrafts(s0, r1.drafts);
    const r2 = prog(s1, "programa el pago de la Visa cada mes");
    assert.equal(r2.kind, "schedules");
    if (r2.kind !== "schedules") return;
    assert.equal(r2.drafts[0].duplicate, "Visa");
    const s2 = settleProgramaDrafts(s1, r2.drafts);
    assert.equal(cardPays(s2, "card-visa").length, 1);
  });
});
