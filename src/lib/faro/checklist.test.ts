/* checklist.test.ts — OLA 20: EL INSTRUMENTO QUE SE AUDITA.
   La metodología CheckList (Ribeiro et al., Microsoft, ACL 2020)
   aplicada al banco: cada capacidad se prueba en tres tipos —
   MFT (la forma mínima), INV (una perturbación que NO debe cambiar
   la respuesta) y DIR (una perturbación con dirección conocida) —
   más los PARES QUE DISTINGUEN MUTANTES: por cada cerca viva, un par
   de preguntas que difieren SOLO en el elemento cercado; si un
   refactor quita la cerca, el par lo delata aunque todo lo demás
   siga verde. Las baterías cazan casos; este archivo audita cercas. */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { addRemitPerson } from "./remit-people.ts";
import { answerBankQuestion, type BankResult } from "./ask2.ts";
import { formatMoney } from "./money.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  } as Line;
}
function fixture(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041 }),
      line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 2457, categoryId: "f-casa", subId: "f.casa.servicios" }),
      line({ id: "paypal", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal" }),
      line({ id: "compra1", kind: "purchase" as LineKind, concept: "Zapatos", amountMinor: 8000, categoryId: "ropa", storeId: "amazon" }),
      line({ id: "remesa1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", to: "mama" }),
      line({ id: "cuota1", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28" }),
    ],
  };
  ledger.months[PREV] = { lines: [line({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, monthKey: PREV })] };
  const added = addRemitPerson(ledger, "Mamá", "mama");
  ledger = added.state;
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}
function ask(ledger: LedgerState, raw: string): BankResult {
  return answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw,
    { ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` }, TODAY);
}
const M = (n: number) => formatMoney(n, "USD", "es");

describe("checklist · INV — la perturbación que no debe cambiar nada", () => {
  const ledger = fixture();
  const pairs: Array<[string, string]> = [
    ["¿Cuánto gasté este mes?", "cuanto gaste este mes"],
    ["¿Cuánto gasté este mes?", "¿Cuánto gasté este mes, por favor?"],
    ["¿Cuánto gasté este mes?", "¿CUÁNTO GASTÉ ESTE MES?"],
    ["¿Cuánto gasté en zapatos?", "En zapatos, ¿cuánto gasté?"],
    ["¿Cuánto me debe Carlos?", "cuanto me debe carlos"],
    ["¿Cuánto tengo en ahorros?", "¿Cuánto tengo en ahorros? Gracias"],
  ];
  for (const [canon, perturbed] of pairs) {
    test(`INV: «${perturbed}» ≡ «${canon}»`, () => {
      const a = ask(ledger, canon);
      const b = ask(ledger, perturbed);
      assert.equal(a.kind, "answer", canon);
      assert.equal(b.kind, "answer", perturbed);
      if (a.kind === "answer" && b.kind === "answer") {
        assert.equal(b.family, a.family);
        assert.equal(b.verdict, a.verdict);
      }
    });
  }
});

describe("checklist · DIR — la perturbación con dirección conocida", () => {
  test("DIR: un gasto mayor SUBE el total del mes, en la cifra exacta", () => {
    const base = fixture();
    const grown = fixture();
    grown.months[KEY].lines.push(line({ id: "extra", kind: "purchase" as LineKind, concept: "Libros", amountMinor: 10000, categoryId: "f-otros" }));
    const a = ask(base, "¿Cuánto gasté este mes?");
    const b = ask(grown, "¿Cuánto gasté este mes?");
    assert.equal(a.kind, "answer");
    assert.equal(b.kind, "answer");
    if (a.kind === "answer" && b.kind === "answer") {
      assert.ok(a.verdict.includes(M(32456)), a.verdict);
      assert.ok(b.verdict.includes(M(42456)), b.verdict);
    }
  });

  test("DIR: una fecha más lejos SUBE los días que faltan", () => {
    const base = fixture();
    const later = fixture();
    const l = later.months[KEY].lines.find((x) => x.id === "cuota1");
    if (l) l.nextDue = "2026-10-30";
    const a = ask(base, "¿Cuántos días faltan para el internet?");
    const b = ask(later, "¿Cuántos días faltan para el internet?");
    assert.equal(a.kind, "answer");
    assert.equal(b.kind, "answer");
    if (a.kind === "answer" && b.kind === "answer") {
      assert.ok(a.verdict.includes("6 días"), a.verdict);
      assert.ok(b.verdict.includes("8 días"), b.verdict);
    }
  });
});

describe("checklist · los pares que distinguen mutantes (una cerca por par)", () => {
  const ledger = fixture();

  test("la cerca del ROL DEL AHORRO: el gasto del mes NO cuenta la línea del ahorro; el stock la cuenta entera", () => {
    const spent = ask(ledger, "¿Cuánto gasté este mes?");
    const stock = ask(ledger, "¿Cuánto tengo en ahorros?");
    assert.equal(spent.kind, "answer");
    assert.equal(stock.kind, "answer");
    if (spent.kind === "answer" && stock.kind === "answer") {
      assert.ok(spent.verdict.includes(M(32456)), spent.verdict);
      assert.ok(!spent.verdict.includes(M(162356)), spent.verdict); // si el rol muriera, el gasto saltaría a 162356
      assert.ok(stock.verdict.includes(M(129900)), stock.verdict);
    }
  });

  test("la cerca del HORIZONTE: mañana y este mes no son la misma ventana", () => {
    const tomorrow = ask(ledger, "¿Qué tengo que pagar mañana?");
    const month = ask(ledger, "¿Qué tengo que pagar este mes?");
    assert.equal(tomorrow.kind, "answer");
    assert.equal(month.kind, "answer");
    if (tomorrow.kind === "answer" && month.kind === "answer") {
      assert.ok(!tomorrow.pieces.some((p) => p.label.includes("Internet")), tomorrow.verdict);
      assert.ok(month.pieces.some((p) => p.label.includes("Internet")), month.verdict);
    }
  });

  test("la cerca del CONTRASTE: «no quiero X, quiero Y» responde Y, no X", () => {
    const plain = ask(ledger, "¿Cuánto debo en total?");
    const contrast = ask(ledger, "No quiero saber cuánto debo, quiero saber cuánto me deben");
    assert.equal(plain.kind, "answer");
    assert.equal(contrast.kind, "answer");
    if (plain.kind === "answer" && contrast.kind === "answer") {
      assert.ok(contrast.verdict.includes(M(30000)), contrast.verdict); // lo de Carlos: el lado «me deben»
      assert.ok(!plain.verdict.includes(M(30000)), plain.verdict);
    }
  });
});
