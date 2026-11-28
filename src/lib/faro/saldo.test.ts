import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { addLoan } from "./loans.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";
/* HUECO 5 · EL SALDO CON OTROS NOMBRES (fallo de Oscar,
 * 2026-11-27, camino (b): el reparto total/left/free/how se
 * declara correcto y se cura solo el silencio). El libro de la
 * cerca, con sus cifras a mano: salario 100.000 en octubre;
 * apartado a PayPal 20.000 (el ahorro cuenta como salida de la
 * queda, así que la queda es 80.000 y el stock 20.000); Carlos
 * debe 30.000; el préstamo del Banco es 50.000.
 * TOTAL = 80.000 + 20.000 + 30.000 = 130.000 ($1,300.00).
 * NETO = 130.000 − 50.000 = 80.000 ($800.00). */
const KEY = "2026-10";
const TODAY = "2026-10-22";
function ctx(ledger: LedgerState): ParseCtx {
  return { ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string) {
  return answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY);
}
function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}
function libroSaldo(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((ct) => ct.id === "f-ahorro");
  if (ahorro && !ahorro.subs.some((s) => s.id === "f.ahorro.paypal")) {
    ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  }
  ledger.months[KEY] = { lines: [
    line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
    line({ id: "apa", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.paypal", bookedOn: "2026-10-06" }),
  ] };
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger = addLoan(ledger, { id: "loan1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 50000, currency: "USD", aprBps: 0, takenOn: "2026-06-15", book: "fixed", note: "" });
  ledger.settings.display = "USD";
  return ledger;
}
const fam = (r: ReturnType<typeof ask>) => (r.kind === "answer" ? r.family : r.kind);
describe("hueco 5: el saldo con otros nombres (la cura del silencio)", () => {
  it("P1 el andar: «en cuanto ando ahorita de plata» → total, con la cifra de mano", () => {
    const r = ask(libroSaldo(), "en cuanto ando ahorita de plata");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /\$1,300\.00/.test(r.verdict));
  });
  it("P2 la moneda nombrada: «saldo total en córdobas» → total dicho en córdobas, con la tasa del libro", () => {
    const r = ask(libroSaldo(), "saldo total en córdobas");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /C\$/.test(r.verdict) && /36\.6243/.test(r.verdict));
  });
  it("P3 ambas monedas: «fondos libres en ambas monedas» → total con las dos cifras", () => {
    const r = ask(libroSaldo(), "fondos libres en ambas monedas");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /\$1,300\.00/.test(r.verdict) && /C\$/.test(r.verdict));
  });
  it("P4 el neto: «dime el saldo neto quitando deudas» → total con la resta hecha y las dos cifras", () => {
    const r = ask(libroSaldo(), "dime el saldo neto quitando deudas");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /neto es \$800\.00/.test(r.verdict) && /\$500\.00/.test(r.verdict));
  });
  it("P5 el neto por la otra voz: «dime el cash disponible sin contar lo q debo» → la misma resta", () => {
    const r = ask(libroSaldo(), "dime el cash disponible sin contar lo q debo");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /neto es \$800\.00/.test(r.verdict));
  });
  it("P6 lo disponible con declaración: «cuanto tengo disponible en checking sin los pendings» → total y la nota que declara lo no separado", () => {
    const r = ask(libroSaldo(), "cuanto tengo disponible en checking sin los pendings");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /\$1,300\.00/.test(r.verdict) && /no guarda el dinero separado/.test(r.note ?? ""));
  });
  it("P7 el umbral con sí: «¿Me quedan siquiera 50 bolas para el fin de semana?» → total que abre con su sí", () => {
    const r = ask(libroSaldo(), "¿Me quedan siquiera 50 bolas para el fin de semana?");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /^Sí\./.test(r.verdict));
  });
  it("P8 el umbral con no: «¿Me quedan siquiera 2000 bolas para el fin de semana?» → total que abre con su no", () => {
    const r = ask(libroSaldo(), "¿Me quedan siquiera 2000 bolas para el fin de semana?");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /^No\./.test(r.verdict));
  });
  it("P9 el umbral en pesos: «¿Me sobran siquiera 40 pesos pa echarle gas al carro?» → sí, con el monto oído en córdobas", () => {
    const r = ask(libroSaldo(), "¿Me sobran siquiera 40 pesos pa echarle gas al carro?");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /^Sí\./.test(r.verdict) && /C\$40\.00/.test(r.verdict));
  });
  it("P10 el banco genérico no veta: «¿Qué tanto billete me queda en el banco?» → total", () => {
    const r = ask(libroSaldo(), "¿Qué tanto billete me queda en el banco?");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /\$1,300\.00/.test(r.verdict));
  });
  it("P11 la cuenta principal se declara: «chequeame si me queda plata en la cuenta principal» → total con la nota", () => {
    const r = ask(libroSaldo(), "chequeame si me queda plata en la cuenta principal");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /no guarda el dinero separado/.test(r.note ?? ""));
  });
  it("P12 la feria: «¿Todavía tengo feria para el fin de semana o ya valió?» → total que abre con su sí", () => {
    const r = ask(libroSaldo(), "¿Todavía tengo feria para el fin de semana o ya valió?");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /^Sí\./.test(r.verdict));
  });
  it("P13 la cuenta corriente con su errata: «revisa el blance de la cuenta corriente» → total con la nota", () => {
    const r = ask(libroSaldo(), "revisa el blance de la cuenta corriente");
    assert.equal(fam(r), "total");
    assert.ok(r.kind === "answer" && /no guarda el dinero separado/.test(r.note ?? ""));
  });
  it("C1 (contraria): la clase nombrada sigue mandando: «¿Cuánto dinero tengo en ahorros?» no es total", () => {
    const r = ask(libroSaldo(), "¿Cuánto dinero tengo en ahorros?");
    assert.notEqual(fam(r), "total");
  });
  it("C2 (contraria): la caja sigue de ahorros: «cuanto hay en caja» no es total", () => {
    const r = ask(libroSaldo(), "cuanto hay en caja");
    assert.notEqual(fam(r), "total");
  });
  it("C3 (contraria): lo libre sigue de free: «¿Cuánto tengo libre ahorita entre todo?» no es total", () => {
    const r = ask(libroSaldo(), "¿Cuánto tengo libre ahorita entre todo?");
    assert.notEqual(fam(r), "total");
  });
  it("C4 (contraria, la promesa de la queda): «¿Cuánto me queda para el mes?» es de left: el «pa» de la calle no es el «para» entero", () => {
    const r = ask(libroSaldo(), "¿Cuánto me queda para el mes?");
    assert.notEqual(fam(r), "total");
  });
  it("C5 (contraria): el saldo total de un instrumento nombrado no es el total de todo: «¿Cuál es el saldo total de mi tarjeta?» no responde total", () => {
    const r = ask(libroSaldo(), "¿Cuál es el saldo total de mi tarjeta?");
    assert.notEqual(fam(r), "total");
  });
  it("F1 (la frontera declarada): el saldo tras un pago nombrado no es esta casa: «¿A cuánto bajó mi saldo después del pago del teléfono?» no responde total", () => {
    const r = ask(libroSaldo(), "¿A cuánto bajó mi saldo después del pago del teléfono?");
    assert.notEqual(fam(r), "total");
  });
  it("F2 (la frontera declarada): el sobrante tras pagar una cuenta nombrada no es esta casa: «¿Qué tanto me sobra en efectivo después de pagar la luz?» no responde total", () => {
    const r = ask(libroSaldo(), "¿Qué tanto me sobra en efectivo después de pagar la luz?");
    assert.notEqual(fam(r), "total");
  });
});
