// Oleada 3 (1.3.148): the «Otros» fold keeps its money, the export sheets honor the user's ticks,
// and the widget snapshot carries the Avisos switch to the phone. Synthetic data only.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { foldSlices } from "./engine.ts";
import { buildSheets, EXPORT_KINDS, type ExportPick } from "./export-docs.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLoan } from "./loans.ts";
import { addReading, addRewards } from "./cards.ts";
import { addLent } from "./debts.ts";
import type { LedgerState, Line, Slice } from "./types.ts";

const sl = (id: string, minor: number): Slice => ({ id, name: id, minor, color: "#000" });

describe("foldSlices: Otros always carries its money", () => {
  it("no fold at or under the limit (same list back)", () => {
    const a = [sl("a", 100), sl("b", 200)];
    assert.equal(foldSlices(a, 8, "es", "#999"), a);
  });

  it("the tail past the limit becomes one Otros with the summed amount; the total is untouched", () => {
    const a = Array.from({ length: 10 }, (_, i) => sl(`c${i}`, (10 - i) * 100));
    const out = foldSlices(a, 8, "es", "#999");
    assert.equal(out.length, 9);
    assert.equal(out[8]!.id, "otros");
    assert.equal(out[8]!.minor, 200 + 100);
    assert.equal(out.reduce((x, s) => x + s.minor, 0), a.reduce((x, s) => x + s.minor, 0));
  });

  it("merges into an Otros already in the head instead of printing two", () => {
    const a = [sl("otros", 500), sl("a", 400), sl("b", 300), sl("c", 200)];
    const out = foldSlices(a, 2, "es", "#999");
    assert.equal(out.length, 2);
    assert.equal(out[0]!.id, "otros");
    assert.equal(out[0]!.minor, 500 + 300 + 200);
  });

  it("a negative tail (refunds past the head) folds in instead of vanishing", () => {
    const a = [sl("a", 1000), sl("b", 900), sl("c", -50), sl("d", -30)];
    const out = foldSlices(a, 2, "es", "#999");
    assert.equal(out[out.length - 1]!.id, "otros");
    assert.equal(out[out.length - 1]!.minor, -80);
  });

  it("a zero tail adds no empty slice", () => {
    const a = [sl("a", 100), sl("b", 90), sl("c", 0)];
    assert.equal(foldSlices(a, 2, "es", "#999").length, 2);
  });
});

const KEY = "2026-11";
const ln = (o: object) => ({
  id: "R1", seriesId: "", monthKey: KEY, kind: "expense-variable", concept: "Envío", amountMinor: 0,
  currency: "USD", active: true, note: "", categoryId: "v-remesas", subId: "", recurring: false,
  storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
  balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...o,
}) as unknown as Line;

function book(): LedgerState {
  let s = createInitial("es", "claro");
  s = { ...s, settings: { ...s.settings, display: "USD" } };
  s = addLoan(s, { id: "L1", lender: "Cooperativa Demo", who: "entity", kind: "interest", amountMinor: 1_000_000, currency: "USD", aprBps: 2400, takenOn: "2026-10-01", book: "fixed", note: "" });
  s = addReading(s, "card-paypal", { balanceMinor: 100000, availMinor: 100000, src: "shot", on: "2026-10-10" }, "2026-10-10");
  s = addRewards(s, "card-paypal", { amountMinor: 2000, src: "shot", on: "2026-10-10" }, "2026-10-10");
  s = addLent(s, { id: "A", person: "Ana", kind: "plain", amountMinor: 30_000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  s = { ...s, debtPlan: { order: "avalanche", monthlyMinor: 30000, currency: "USD" } };
  s = { ...s, months: { ...s.months, [KEY]: { lines: [ln({ amountMinor: 50000, bookedOn: "2026-11-03" })] } } };
  return s;
}

const pick = (over: Partial<ExportPick> = {}): ExportPick => ({
  scope: "all", activeOnly: false, kinds: [...EXPORT_KINDS],
  savings: true, debt: true, summary: true, charts: true, advice: true, remit: true, ...over,
});
const sheetNames = (over: Partial<ExportPick> = {}): string[] => {
  const s = book();
  return buildSheets(s, KEY, "es", makeNamer(s.structure, "es"), pick(over)).map((sh) => sh.name);
};
const DEBT_SHEETS = ["Prestamos", "Tarjetas", "Recompensas", "Me deben", "Plan de pago"];

describe("export sheets honor the ticks (1.3.148)", () => {
  it("with everything on, every family is there", () => {
    const names = sheetNames();
    for (const n of [...DEBT_SHEETS, "Remesas", "Flujo", "Categorias"]) assert.ok(names.includes(n), `missing ${n}`);
  });

  it("unticking Deudas drops the five debt sheets — and only those", () => {
    const names = sheetNames({ debt: false });
    for (const n of DEBT_SHEETS) assert.ok(!names.includes(n), `${n} leaked with debt off`);
    assert.ok(names.includes("Remesas"));
    assert.ok(names.includes("Flujo"));
  });

  it("Remesas answers to its own tick, not to the charts tick", () => {
    assert.ok(!sheetNames({ remit: false }).includes("Remesas"));
    assert.ok(sheetNames({ remit: false }).includes("Flujo"), "charts sheets stay when only Remesas is off");
    const noCharts = sheetNames({ charts: false });
    assert.ok(noCharts.includes("Remesas"), "Remesas survives charts off");
    assert.ok(!noCharts.includes("Flujo"));
  });
});

describe("the Avisos switch reaches the phone", () => {
  it("the widget snapshot carries settings.notify (missing = on)", () => {
    const s0 = createInitial("es", "claro");
    const opts = { today: "2026-11-08", hide: false, lock: false };
    assert.equal(buildWidgetSnapshot(s0, "es", opts).notify, true);
    const s1: LedgerState = { ...s0, settings: { ...s0.settings, notify: false } };
    assert.equal(buildWidgetSnapshot(s1, "es", opts).notify, false);
  });
});
