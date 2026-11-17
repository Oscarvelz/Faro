/**
 * PREJUDICE CAMPAIGN (2026-11-16) — wave 1 probes, fronts F2/F1.
 * Presumption of guilt: each probe states the law it attacks and what the
 * hostile input SHOULD do. A probe that fails = a confirmed break (specimen
 * pinned). A probe that passes = the front held; it stays as a fence.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { savingsStock } from "./savings.ts";
import { isLedgerDeep } from "./defaults.ts";
import type { LedgerState, Line } from "./types.ts";

const CATS = [
  { id: "f-ahorro", name: "Ahorro", role: "savings", subs: [
    { id: "f.ahorro.retiro", name: "Retiro", icon: "" },
    { id: "f.ahorro.meta", name: "Meta", icon: "" },
  ] },
] as unknown as LedgerState["structure"]["categories"];

function line(partial: Partial<Line> & { id: string }): Line {
  return {
    seriesId: partial.id, monthKey: "2026-11", kind: "expense-fixed", concept: "X",
    amountMinor: 0, currency: "NIO", active: true, note: "", categoryId: "f-ahorro",
    subId: "f.ahorro.retiro", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
    balanceCurrency: "NIO", icon: "", history: [], bookedOn: "2026-11-05", startedOn: "",
    color: "", ...partial,
  } as Line;
}
function book(months: Record<string, Line[]>): LedgerState {
  const m: Record<string, { lines: Line[] }> = {};
  for (const [k, lines] of Object.entries(months)) m[k] = { lines };
  return {
    v: 1,
    months: m, structure: { categories: CATS, purchases: [], catalog: [] },
    settings: { lang: "es", theme: "tron", display: "NIO", rateE4: 10000 },
    revision: 1, updatedAt: "2026-11-16T00:00:00.000Z", audit: [],
  } as unknown as LedgerState;
}

describe("PREJUDICE F2 — the deep gate and what it tolerates", () => {
  it("a snapshot whose balanceMinor is a STRING must not poison the stock with NaN", () => {
    const hostile = line({ id: "h1", balanceMinor: "900000" as unknown as number, amountMinor: 0 });
    const b = book({ "2026-11": [hostile] });
    // CURED in two layers (PJ-6): the gate now rejects the shape outright, and the
    // walk — fed directly, as other entry paths can — treats it as no snapshot.
    assert.equal(isLedgerDeep(b), false, "the gate rejects a non-numeric balanceMinor");
    const stock = savingsStock(b, "2026-11");
    assert.ok(Number.isFinite(stock.total), `stock.total must stay finite, got ${stock.total}`);
  });

  it("a snapshot whose balanceMinor is an OBJECT must not poison the stock", () => {
    const hostile = line({ id: "h2", balanceMinor: { evil: 1 } as unknown as number, amountMinor: 0 });
    const b = book({ "2026-11": [hostile] });
    const stock = savingsStock(b, "2026-11");
    assert.ok(Number.isFinite(stock.total), `stock.total must stay finite, got ${stock.total}`);
  });

  it("a malformed month key ('2026-13') must not leak into an as-of walk for 2026-12", () => {
    const future = line({ id: "h3", monthKey: "2026-13", amountMinor: 50000, bookedOn: "2026-13-01" });
    const b = book({ "2026-13": [future] });
    const stock = savingsStock(b, "2026-12");
    assert.equal(stock.total, 0, "a bucket outside the calendar must not exist for December");
  });

  it("two lines sharing one id in a bucket: the walk must not merge two different series", () => {
    const a = line({ id: "dup", seriesId: "s-a", amountMinor: 10000 });
    const c = line({ id: "dup", seriesId: "s-c", amountMinor: 20000, subId: "f.ahorro.meta" });
    const b = book({ "2026-11": [a, c] });
    const stock = savingsStock(b, "2026-11");
    assert.equal(stock.total, 30000);
    assert.equal(stock.series.size, 2, "distinct seriesIds stay distinct series");
  });

  it("a sub WITHOUT icon must not crash the walk; a sub WITHOUT id must not pass the gate", () => {
    // PJ-1, cured by hardening + identity gate (probe corrected 2026-11-16: the
    // original expectation — the gate rejects an icon-less sub — would quarantine
    // books for a field the engines can read safely; preservation wins. The crash
    // is what had to die, and the id is what the gate must demand.)
    const noIcon = structuredClone(book({ "2026-11": [line({ id: "h7", amountMinor: 1000 })] })) as unknown as Record<string, unknown>;
    const catsA = (noIcon.structure as { categories: { subs: Record<string, unknown>[] }[] }).categories;
    delete catsA[0]!.subs[0]!.icon;
    const stock = savingsStock(noIcon as unknown as LedgerState, "2026-11");
    assert.equal(stock.total, 1000, "an icon-less sub reads as a plain sub and its money counts");
    const noId = structuredClone(book({ "2026-11": [line({ id: "h7", amountMinor: 1000 })] })) as unknown as Record<string, unknown>;
    const catsB = (noId.structure as { categories: { subs: Record<string, unknown>[] }[] }).categories;
    delete catsB[0]!.subs[0]!.id;
    assert.equal(isLedgerDeep(noId), false, "the gate must reject a sub without the id every engine joins by");
  });

  it("a deposit with amountMinor = Number.MAX_SAFE_INTEGER must not overflow the stock to Infinity", () => {
    const big = line({ id: "h5", amountMinor: Number.MAX_SAFE_INTEGER });
    const big2 = line({ id: "h6", seriesId: "s-other", amountMinor: Number.MAX_SAFE_INTEGER, subId: "f.ahorro.meta" });
    const b = book({ "2026-11": [big, big2] });
    const stock = savingsStock(b, "2026-11");
    assert.ok(Number.isFinite(stock.total), `stock.total must stay finite, got ${stock.total}`);
  });
});
