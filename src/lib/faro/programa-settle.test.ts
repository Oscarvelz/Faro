/**
 * programa-settle — la batería de la costura de programación de E3
 * (puerto de la Rama Agente, 1.3.446): cada clase de borrador nace
 * como la línea programada que el libro ya conoce — el fijo con su
 * monto y su cadencia, el recordatorio con monto 0 (lo variable no
 * se inventa), la sola vez sin recurrencia — y el duplicado jamás
 * se programa dos veces.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { parsePrograma } from "./relato.ts";
import { programaLines, settleProgramaDrafts } from "./programa-settle.ts";
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

function fixture(conLuzProgramada = false): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const lines: Line[] = [
    line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 120000, bookedOn: "2026-11-05" }),
  ];
  if (conLuzProgramada) {
    lines.push(line({ id: "luz-prog", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", recurring: true, cadence: "monthly", nextDue: "2026-12-01", bookedOn: "2026-11-01" }));
  }
  ledger.months[KEY] = { lines };
  ledger.settings.display = "USD";
  return ledger;
}

function draftsOf(ledger: LedgerState, raw: string) {
  const r = parsePrograma(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, TODAY);
  assert.equal(r.kind, "schedules", JSON.stringify(r).slice(0, 200));
  return r.kind === "schedules" ? r.drafts : [];
}

describe("programa-settle · la programación confirmada (puerto de la Rama Agente)", () => {
  it("el fijo nace como línea fija recurrente, con su monto, su cadencia y su primer vencimiento", () => {
    const ledger = fixture();
    const lines = programaLines(ledger, draftsOf(ledger, "programa el internet de 50 cada mes el día 1"));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].kind, "expense-fixed");
    assert.equal(lines[0].amountMinor, 5000);
    assert.equal(lines[0].recurring, true);
    assert.equal(lines[0].cadence, "monthly");
    assert.equal(lines[0].nextDue, "2026-12-01");
    assert.equal(lines[0].monthKey, "2026-12");
    assert.equal(lines[0].seriesId, lines[0].id);
    assert.equal(lines[0].active, true);
  });

  it("el recordatorio nace con monto 0: lo variable no se inventa", () => {
    const ledger = fixture();
    const lines = programaLines(ledger, draftsOf(ledger, "recuérdame pagar la luz cada mes el día 1"));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].kind, "expense-fixed");
    assert.equal(lines[0].amountMinor, 0);
    assert.equal(lines[0].recurring, true);
    assert.equal(lines[0].cadence, "monthly");
    assert.equal(lines[0].nextDue, "2026-12-01");
  });

  it("el ingreso programado nace como línea fija de ingreso", () => {
    const ledger = fixture();
    const lines = programaLines(ledger, draftsOf(ledger, "cada quincena me entran 400 del negocio, prográmalo"));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].kind, "income-fixed");
    assert.equal(lines[0].amountMinor, 40000);
    assert.equal(lines[0].cadence, "biweekly");
  });

  it("la sola vez nace sin recurrencia y con su fecha como vencimiento", () => {
    const ledger = fixture();
    const lines = programaLines(ledger, draftsOf(ledger, "agenda el seguro de 300 el 15 diciembre"));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].recurring, false);
    assert.equal(lines[0].cadence, "");
    assert.equal(lines[0].nextDue, "2026-12-15");
    assert.equal(lines[0].monthKey, "2026-12");
  });

  it("el duplicado jamás se programa: lo ya programado no nace dos veces", () => {
    const ledger = fixture(true); // la luz ya está programada, mensual
    const drafts = draftsOf(ledger, "recuérdame pagar la luz cada mes el día 1");
    assert.ok(drafts.some((d) => d.duplicate), "el borrador nace marcado como duplicado");
    const next = settleProgramaDrafts(ledger, drafts);
    assert.equal(next, ledger, "sin líneas nuevas, el estado no cambia");
  });

  it("el estado crece: la línea nace en el mes de su primera fecha, aunque el mes no exista", () => {
    const ledger = fixture();
    const next = settleProgramaDrafts(ledger, draftsOf(ledger, "programa el internet de 50 cada mes el día 1"));
    assert.equal(next.months["2026-12"].lines.length, 1);
    assert.equal(next.months["2026-12"].lines[0].concept, "Internet");
    assert.equal(next.months[KEY].lines.length, ledger.months[KEY].lines.length);
  });
});
