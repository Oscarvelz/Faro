/**
 * dir — LA BATERÍA DIR DE LA RAMA (Ola 74): los pares
 * direccionales que viven en el relato. La aserción es sobre el
 * BORRADOR (el signo y el lado), antes de cualquier confirmación:
 * el fallo crítico de un par es producir el mismo borrador con el
 * mismo signo para las dos direcciones.
 *
 * DIR-A1 (el préstamo): el relato no tiene casa para asentar
 * préstamos en ninguna dirección — el resultado correcto del par
 * es el silencio SIMÉTRICO (ninguna dirección se asienta como la
 * otra disfrazada). DIR-A3 (el pago de lo debido): las dos
 * direcciones asientan, cada una en su lado, con el concepto
 * limpio. DIR-C1 (el movimiento): el borrador invierte origen y
 * destino al invertir la frase.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { parseRelato } from "./relato.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";
function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], bookedOn: `${KEY}-01`, ...partial,
  };
}
function libro(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs = [{ id: "f.ahorro.colchon", nameKey: "f.ahorro.colchon", customName: "Colchón", icon: "vault:generic", hidden: false, order: 10 }];
  ledger.structure.catalog = ledger.structure.catalog.filter((c) => c.kind !== "acct");
  ledger.structure.catalog.push({ id: "acct-banco", nameKey: "", customName: "Banco", icon: "", hidden: false, order: 90, kind: "acct", urlTemplate: "" });
  ledger.months[KEY] = { lines: [
    line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 120000, bookedOn: "2026-10-05" }),
    line({ id: "ahorro1", kind: "expense" as LineKind, concept: "Colchón", amountMinor: 50000, categoryId: "f-ahorro", subId: "f.ahorro.colchon", bookedOn: "2026-10-03" }),
  ] };
  return ledger;
}
function relato(l: LedgerState, raw: string) {
  return parseRelato(l, KEY, "es", makeNamer(l.structure, "es"), raw, TODAY);
}

describe("rama · ola 74 · DIR-A1 el préstamo, silencio simétrico", () => {
  it("ninguna dirección se asienta: prestar no es gastar ni recibir es ingreso", () => {
    const l = libro();
    assert.equal(relato(l, "Le presté 50 a Juan").kind, "unknown");
    assert.equal(relato(l, "Juan me prestó 50").kind, "unknown");
    assert.equal(relato(l, "Mi hermano me prestó 200").kind, "unknown");
  });
});

describe("rama · ola 74 · DIR-A3 el pago en las dos direcciones", () => {
  it("pagar asienta gasto y que te paguen asienta ingreso, con el concepto limpio", () => {
    const l = libro();
    const out = relato(l, "Le pagué 50 a Juan");
    assert.equal(out.kind, "drafts");
    if (out.kind === "drafts") {
      assert.equal(out.drafts.length, 1);
      assert.equal(out.drafts[0].op, "gasto");
      assert.equal(out.drafts[0].concept, "Juan", "el clítico «le» jamás es concepto");
      assert.equal(out.drafts[0].amountMinor, 5000);
    }
    const into = relato(l, "Juan me pagó 50");
    assert.equal(into.kind, "drafts");
    if (into.kind === "drafts") {
      assert.equal(into.drafts.length, 1);
      assert.equal(into.drafts[0].op, "ingreso");
      assert.equal(into.drafts[0].concept, "Juan", "el verbo del bigrama no se pega al nombre");
      assert.equal(into.drafts[0].amountMinor, 5000);
    }
    const abonoOut = relato(l, "Le aboné 50 a Juan");
    assert.equal(abonoOut.kind, "drafts");
    if (abonoOut.kind === "drafts") assert.equal(abonoOut.drafts[0].op, "gasto");
    const abonoIn = relato(l, "Juan me abonó 50");
    assert.equal(abonoIn.kind, "drafts");
    if (abonoIn.kind === "drafts") assert.equal(abonoIn.drafts[0].op, "ingreso");
  });
});

describe("rama · ola 74 · DIR-C1 el movimiento se invierte entero", () => {
  it("del banco al colchón y del colchón al banco dan borradores espejo", () => {
    const l = libro();
    const a = relato(l, "Mueve 200 del banco al colchón");
    const b = relato(l, "Mueve 200 del colchón al banco");
    assert.equal(a.kind, "drafts");
    assert.equal(b.kind, "drafts");
    if (a.kind === "drafts" && b.kind === "drafts") {
      assert.equal(a.drafts[0].op, "mover");
      assert.equal(a.drafts[0].from?.label, "Banco");
      assert.equal(a.drafts[0].to?.label, "Colchón");
      assert.equal(b.drafts[0].from?.label, "Colchón");
      assert.equal(b.drafts[0].to?.label, "Banco");
      assert.equal(a.drafts[0].amountMinor, b.drafts[0].amountMinor);
    }
  });
});
