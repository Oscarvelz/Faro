/**
 * PREJUDICE CAMPAIGN (2026-11-16) — wave 1 confirmations, fronts F7/F8
 * (hunter candidates reproduced by the parent's own hand before counting).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMoney } from "./bankparse.ts";
import { parseAmount } from "./money.ts";
import { parseQuickEntries } from "./quickadd.ts";
import { isLedgerDeep } from "./defaults.ts";
import { savingsStock } from "./savings.ts";
import type { LedgerState, Line } from "./types.ts";

describe("PREJUDICE F8 — the two amount parsers must agree on the thousands format", () => {
  it("parseMoney('1.234') and parseAmount('1.234') read the same number", () => {
    const a = parseMoney("1.234");
    const b = parseAmount("1.234");
    assert.equal(a, b, `the bank parser reads ${a} and the amount parser reads ${b} for the same text`);
  });
});

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
    v: 1, months: m,
    structure: { categories: [
      { id: "f-ahorro", name: "Ahorro", role: "savings", subs: [{ id: "f.ahorro.retiro", name: "Retiro", icon: "" }] },
    ], purchases: [], catalog: [] },
    settings: { lang: "es", theme: "tron", display: "NIO", rateE4: 10000 },
    revision: 1, updatedAt: "2026-11-16T00:00:00.000Z", audit: [],
  } as unknown as LedgerState;
}

describe("PREJUDICE F8 — the quick-add day must be a real calendar day", () => {
  it("an entry dated 2026-13-45 is discarded, not drained into a phantom month", () => {
    const raw = JSON.stringify([{ id: "entry-123456", sign: "out", minor: 1000, cur: "NIO", day: "2026-13-45" }]);
    assert.equal(parseQuickEntries(raw).length, 0);
  });
  it("an entry dated 2026-02-31 is discarded", () => {
    const raw = JSON.stringify([{ id: "entry-123456", sign: "out", minor: 1000, cur: "NIO", day: "2026-02-31" }]);
    assert.equal(parseQuickEntries(raw).length, 0);
  });
});

describe("PREJUDICE F7 — the revision seal must be a number the server can hold", () => {
  it("a revision beyond the server's integer range must not pass the deep gate", () => {
    const b = book({ "2026-11": [] }) as unknown as Record<string, unknown>;
    b.revision = 3_000_000_000;
    assert.equal(isLedgerDeep(b), false, "faro_push takes an integer parameter; 3e9 can never sync");
  });
});

describe("PREJUDICE F8 — a string balance must not silently zero a pocket", () => {
  it("deposits before a corrupt snapshot still count (the pocket must not read C$0)", () => {
    const dep = line({ id: "d1", amountMinor: 50000, bookedOn: "2026-10-05", monthKey: "2026-10" });
    const snap = line({ id: "d1", seriesId: "d1", balanceMinor: "900000" as unknown as number, amountMinor: 0, bookedOn: "2026-11-05" });
    const b = book({ "2026-10": [dep], "2026-11": [snap] });
    const stock = savingsStock(b, "2026-11");
    assert.ok(stock.total > 0, `the pocket's money must not vanish: total = ${stock.total}`);
  });
});
