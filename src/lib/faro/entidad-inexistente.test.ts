/**
 * entidad-inexistente — LOS TRES ESTADOS (prioridad de Hark,
 * 2026-11-26, desde la segunda respuesta de Gemini).
 *
 * Ante un nombre, el motor distingue: (1) no entendí — silencio
 * o el nombre que no vive en ninguna parte («No tengo nada
 * anotado como…», que ya existía); (2) el nombre NO está, o está
 * vacío en el libro entero — se dice: la persona que no es
 * («No tienes a Kenia en tu libro») y el nombre de estructura
 * sin un solo movimiento («No tienes movimientos en «X»: no hay
 * ninguno anotado en todo tu libro» — la redacción llana que
 * sustituyó a la primera forma, retirada por técnica);
 * (3) el nombre está y tiene historia, y este período da cero —
 * el cero de siempre, que es la respuesta del libro.
 *
 * Antes: «¿cuánto le debo a Kenia?» caía en silencio (el hueco
 * de la P3) y «¿cuánto gasté en mascotas?» daba un «$0.00 en
 * eso» que insinuaba una categoría viva medida en cero, cuando
 * Mascotas no tiene ni una línea en el libro.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { addRemitPerson } from "./remit-people.ts";
import type { ParseCtx } from "./textparse.ts";
import type { Lang, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
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
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-10-05" }),
      line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 2457, categoryId: "f-casa", subId: "f.casa.servicios" }),
      line({ id: "paypal", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "compra0", kind: "purchase" as LineKind, concept: "Camisa", amountMinor: 5000, categoryId: "ropa", storeId: "temu", bookedOn: "2026-09-12", monthKey: PREV }),
      line({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-09-05", monthKey: PREV }),
    ],
  };
  const added = addRemitPerson(ledger, "Mamá", "mama");
  ledger = added.state;
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}

function ctx(ledger: LedgerState, lang: Lang = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: Lang = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}

describe("la persona que no está (deudas)", () => {
  const ledger = fixture();
  it("«¿Cuánto le debo a Kenia?»: lo dice — no tienes a Kenia en tu libro", () => {
    const r = ask(ledger, "¿Cuánto le debo a Kenia?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.match(r.verdict, /No tienes a Kenia en tu libro/);
  });
  it("«¿Cuánto me debe Kenia?»: el otro lado dice lo mismo", () => {
    const r = ask(ledger, "¿Cuánto me debe Kenia?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.match(r.verdict, /No tienes a Kenia en tu libro/);
  });
  it("inglés: «How much do I owe Kenia?»", () => {
    const r = ask(ledger, "How much do I owe Kenia?", "en");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.match(r.verdict, /don't have Kenia in your book/);
  });
  it("guarda: la persona que SÍ está sigue en su rama («¿cuánto le debo a Carlos?» va al revés, no a la ausencia)", () => {
    const r = ask(ledger, "¿Cuánto le debo a Carlos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.doesNotMatch(r.verdict, /No tienes a Carlos/);
    assert.match(r.verdict, /Al revés/);
  });
  it("guarda: la persona del libro sin deuda (Mamá, de remesas) no se declara ausente", () => {
    const r = ask(ledger, "¿Cuánto le debo a Mamá?");
    if (r.kind === "answer") assert.doesNotMatch(r.verdict, /No tienes a Mamá/);
  });
  it("guarda: «¿a quién le debo?» sigue siendo el listado, no una ausencia", () => {
    const r = ask(ledger, "¿A quién le debo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.doesNotMatch(r.verdict, /No tienes a/);
  });
});

describe("el nombre vacío (historia)", () => {
  const ledger = fixture();
  it("«¿Cuánto gasté en mascotas este mes?»: declara el nombre vacío, no un cero a secas", () => {
    const r = ask(ledger, "¿Cuánto gasté en mascotas este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.match(r.verdict, /No tienes movimientos en «Mascotas»/);
    assert.match(r.verdict, /en todo tu libro/);
    assert.doesNotMatch(r.verdict, /gastaste \$0\.00 en eso/);
  });
  it("el sub vacío también: «¿cuánto gasté en juguetes este mes?»", () => {
    const r = ask(ledger, "¿Cuánto gasté en juguetes este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.match(r.verdict, /No tienes movimientos en «Juguetes»/);
    assert.match(r.verdict, /en todo tu libro/);
  });
  it("inglés: «How much did I spend on pets this month?»", () => {
    const r = ask(ledger, "How much did I spend on pets this month?", "en");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.match(r.verdict, /You have no movements under/);
    assert.match(r.verdict, /anywhere in your book/);
  });
  it("guarda (el tercer estado): el nombre con historia y el período en cero conserva su cero — «¿cuánto gasté en ropa este mes?»", () => {
    const r = ask(ledger, "¿Cuánto gasté en ropa este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.doesNotMatch(r.verdict, /No tienes movimientos en/);
    assert.match(r.verdict, /\$0\.00/);
  });
  it("guarda: el nombre con líneas en el período responde su cifra — «¿cuánto gasté en ropa el mes pasado?»", () => {
    const r = ask(ledger, "¿Cuánto gasté en ropa el mes pasado?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.match(r.verdict, /\$50\.00/);
  });
  it("guarda (el primer estado): el nombre que no vive en ninguna parte conserva su respuesta — «¿cuánto gasté en criptomonedas este mes?»", () => {
    const r = ask(ledger, "¿Cuánto gasté en criptomonedas este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.match(r.verdict, /No tengo nada anotado como «criptomonedas»/);
  });
});
