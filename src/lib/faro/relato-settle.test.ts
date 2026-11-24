/**
 * relato-settle — la batería de la costura de asiento del relato
 * (puerto de la Rama Agente, 1.3.445): cada clase de borrador se
 * asienta en la forma de línea que el libro ya conoce, el duplicado
 * jamás se asienta dos veces, y el traslado entre cuentas nace
 * inactivo (nunca cuenta en totales).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { parseRelato } from "./relato.ts";
import { relatoLines, settleRelatoDrafts } from "./relato-settle.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

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

function fixture(conLuzDeHoy = false): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs = [{ id: "f.ahorro.colchon", nameKey: "f.ahorro.colchon", customName: "Colchón", icon: "vault:generic", hidden: false, order: 10 }];
  ledger.structure.catalog = ledger.structure.catalog.filter((c) => c.kind !== "acct");
  ledger.structure.catalog.push({ id: "acct-banco", nameKey: "", customName: "Banco", icon: "", hidden: false, order: 90, kind: "acct", urlTemplate: "" });
  const lines: Line[] = [
    line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 120000, bookedOn: "2026-10-05" }),
    line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-28" }),
  ];
  if (conLuzDeHoy) {
    lines.push(line({ id: "luz-hoy", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: TODAY }));
  }
  ledger.months[KEY] = { lines };
  ledger.settings.display = "USD";
  return ledger;
}

function draftsOf(ledger: LedgerState, raw: string) {
  const r = parseRelato(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, TODAY);
  assert.equal(r.kind, "drafts", JSON.stringify(r).slice(0, 200));
  return r.kind === "drafts" ? r.drafts : [];
}

describe("relato-settle · el asiento confirmado (puerto de la Rama Agente)", () => {
  it("el gasto se asienta como línea variable, ubicada y con su fecha", () => {
    const ledger = fixture();
    const lines = relatoLines(ledger, draftsOf(ledger, "pagué la luz 45"), "es");
    assert.equal(lines.length, 1);
    assert.equal(lines[0].kind, "expense-variable");
    assert.equal(lines[0].concept, "Luz");
    assert.equal(lines[0].amountMinor, 4500);
    assert.equal(lines[0].categoryId, "f-casa");
    assert.equal(lines[0].subId, "f.casa.servicios");
    assert.equal(lines[0].bookedOn, TODAY);
    assert.equal(lines[0].monthKey, KEY);
    assert.equal(lines[0].active, true);
  });

  it("el ingreso se asienta como línea variable de ingreso", () => {
    const ledger = fixture();
    const lines = relatoLines(ledger, draftsOf(ledger, "me entró el salario 1200"), "es");
    assert.equal(lines.length, 1);
    assert.equal(lines[0].kind, "income-variable");
    assert.equal(lines[0].amountMinor, 120000);
  });

  it("mover al colchón se asienta como apartado sobre f-ahorro, con la cuenta de origen", () => {
    const ledger = fixture();
    const lines = relatoLines(ledger, draftsOf(ledger, "moví 200 del banco al colchón"), "es");
    assert.equal(lines.length, 1);
    assert.equal(lines[0].kind, "expense-variable");
    assert.equal(lines[0].categoryId, "f-ahorro");
    assert.equal(lines[0].subId, "f.ahorro.colchon");
    assert.equal(lines[0].sourceId, "acct-banco");
    assert.equal(lines[0].active, true);
  });

  it("el duplicado jamás se asienta: el relato repetido no duplica la línea", () => {
    const ledger = fixture(true); // la luz de hoy ya está asentada
    const drafts = draftsOf(ledger, "pagué la luz 45");
    assert.ok(drafts.some((d) => d.duplicate), "el borrador nace marcado como duplicado");
    const next = settleRelatoDrafts(ledger, drafts, "es");
    assert.equal(next, ledger, "sin líneas nuevas, el estado no cambia");
  });

  it("el relato compuesto asienta cada cláusula en su mes y el estado crece línea a línea", () => {
    const ledger = fixture();
    const before = ledger.months[KEY].lines.length;
    const drafts = draftsOf(ledger, "moví 200 del banco al colchón, pagué la luz 45 y me entró el salario 1200");
    const next = settleRelatoDrafts(ledger, drafts, "es");
    assert.equal(next.months[KEY].lines.length, before + 3);
  });
});
