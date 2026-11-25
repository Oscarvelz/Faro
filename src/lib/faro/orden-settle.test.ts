/**
 * orden-settle — la batería de la costura de órdenes de E4 (puerto
 * de la Rama Agente, 1.3.447): archivar descansa la línea por la
 * mano de descanso, corregir toca solo ESA línea, el ajuste toca
 * solo ESE ajuste — y el modo jamás se escribe aquí (la cerca de
 * escritores de modos293 manda: lo aplica la mano del proveedor).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { parseOrden, type OrdenDraft } from "./orden.ts";
import { applyOrdenDraft } from "./orden-settle.ts";
import { spansOf } from "./descanso.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-11";
const TODAY = "2026-11-24";

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
  ledger.months[KEY] = {
    lines: [
      line({ id: "luz", kind: "expense-variable" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-11-10" }),
      line({ id: "internet", kind: "expense-fixed" as LineKind, concept: "Internet", amountMinor: 5000, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, cadence: "monthly", nextDue: "2026-12-01" }),
    ],
  };
  ledger.settings.display = "USD";
  return ledger;
}

function orderOf(ledger: LedgerState, raw: string): OrdenDraft {
  const r = parseOrden(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, TODAY);
  assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
  return r.kind === "order" ? r.order : (null as never);
}

describe("orden-settle · la orden confirmada (puerto de la Rama Agente)", () => {
  it("archivar descansa la línea por descanso y registra su período", () => {
    const ledger = fixture();
    const next = applyOrdenDraft(ledger, orderOf(ledger, "archiva la luz"));
    const luz = next.months[KEY].lines.find((l) => l.id === "luz");
    assert.equal(luz?.rest, true);
    assert.equal(spansOf(next).length, spansOf(ledger).length + 1);
    const internet = next.months[KEY].lines.find((l) => l.id === "internet");
    assert.equal(internet?.rest, undefined, "la otra línea no se toca");
  });

  it("corregir el monto toca solo esa línea y solo su monto", () => {
    const ledger = fixture();
    const next = applyOrdenDraft(ledger, orderOf(ledger, "corrige la luz, no fueron 45, fueron 50"));
    const luz = next.months[KEY].lines.find((l) => l.id === "luz");
    assert.equal(luz?.amountMinor, 5000);
    assert.equal(luz?.bookedOn, "2026-11-10");
    assert.equal(next.months[KEY].lines.find((l) => l.id === "internet")?.amountMinor, 5000);
  });

  it("corregir la fecha mueve el día en el campo que traía la fecha", () => {
    const ledger = fixture();
    const next = applyOrdenDraft(ledger, orderOf(ledger, "mueve la luz al día 15"));
    assert.equal(next.months[KEY].lines.find((l) => l.id === "luz")?.bookedOn, "2026-11-15");
    const next2 = applyOrdenDraft(ledger, orderOf(ledger, "mueve el internet al día 5"));
    assert.equal(next2.months[KEY].lines.find((l) => l.id === "internet")?.nextDue, "2026-12-05");
  });

  it("el ajuste de moneda toca solo la moneda de vista", () => {
    const ledger = fixture();
    const next = applyOrdenDraft(ledger, orderOf(ledger, "cambia la moneda a córdobas"));
    assert.equal(next.settings.display, "NIO");
    assert.equal(next.settings.rateE4, ledger.settings.rateE4);
  });

  it("el ajuste de tasa guarda su forma máquina (rateE4)", () => {
    const ledger = fixture();
    const next = applyOrdenDraft(ledger, orderOf(ledger, "cambia la tasa a 36.80"));
    assert.equal(next.settings.rateE4, 368000);
  });

  it("el ajuste de modo NO se escribe aquí: la cerca de escritores manda", () => {
    const ledger = fixture();
    const next = applyOrdenDraft(ledger, orderOf(ledger, "cambia el modo a ritmo"));
    assert.equal(next, ledger, "el estado sale intacto: el modo lo aplica la mano del proveedor");
  });

  it("una orden sobre una línea que ya no está no toca nada", () => {
    const ledger = fixture();
    const ghost: OrdenDraft = { op: "corregir-monto", lineId: "no-existe", monthKey: KEY, concept: "Nada", fromMinor: 1, toMinor: 2, currency: "USD" };
    assert.equal(applyOrdenDraft(ledger, ghost), ledger);
  });
});
