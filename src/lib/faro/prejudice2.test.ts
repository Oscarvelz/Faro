/**
 * PREJUDICE CAMPAIGN (2026-11-16) — wave 1 confirmations, front F3 (hunter
 * candidates H-1/H-2, reproduced by the parent's own hand before counting).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { copyRecurring } from "./reducer.ts";
import { duesWindow } from "./dues.ts";
import { addReading, cardFigures, cardsOf, payCard, presetCard } from "./cards.ts";
import { addLoan } from "./loans.ts";
import type { LedgerState, Line } from "./types.ts";

function line(partial: Partial<Line> & { id: string }): Line {
  return {
    seriesId: partial.id, monthKey: "2026-10", kind: "expense-fixed", concept: "Cuota internet",
    amountMinor: 50000, currency: "NIO", active: true, note: "", categoryId: "f-casa",
    subId: "f.casa.internet", recurring: true, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "monthly", nextDue: "2026-10-18", aprBps: 0, balanceMinor: null,
    balanceCurrency: "NIO", icon: "", history: [], bookedOn: "2026-10-18", startedOn: "",
    color: "", ...partial,
  } as Line;
}
function book(months: Record<string, Line[]>): LedgerState {
  const m: Record<string, { lines: Line[] }> = {};
  for (const [k, lines] of Object.entries(months)) m[k] = { lines };
  return {
    v: 1, months: m,
    structure: { categories: [
      { id: "f-casa", name: "Casa", role: "expense", subs: [{ id: "f.casa.internet", name: "Internet", icon: "" }] },
    ], purchases: [], catalog: [] },
    settings: { lang: "es", theme: "tron", display: "NIO", rateE4: 10000 },
    revision: 1, updatedAt: "2026-11-16T00:00:00.000Z", audit: [],
  } as unknown as LedgerState;
}

describe("PREJUDICE F3 — hunter candidate H-1: the copied cuota's nextDue", () => {
  it("a monthly cuota copied Oct→Nov carries a NOVEMBER due date", () => {
    const oct = line({ id: "cuota-1" });
    const { state, count } = copyRecurring(book({ "2026-10": [oct], "2026-11": [] }), "2026-10", "2026-11");
    assert.equal(count, 1);
    const copy = state.months["2026-11"]!.lines[0]!;
    assert.equal(copy.nextDue, "2026-11-18", `the copy's due date must advance with its month, got ${copy.nextDue}`);
  });

  it("the 14-day dues window from Nov 16 contains the cuota's real Nov 18 occurrence", () => {
    const oct = line({ id: "cuota-1" });
    const { state } = copyRecurring(book({ "2026-10": [oct], "2026-11": [] }), "2026-10", "2026-11");
    const dues = duesWindow(state, 14, "2026-11-16");
    const mine = dues.filter((d) => d.kind === "cuota");
    assert.ok(mine.some((d) => d.on === "2026-11-18"), `expected a Nov 18 cuota, got ${JSON.stringify(mine.map((d) => d.on))}`);
  });
});

describe("PREJUDICE F3 — hunter candidate H-2: a backdated reading swallows later payments", () => {
  it("a Nov 1 reading saved Nov 16 must not mark a Nov 10 payment as already included", () => {
    const card = presetCard("chase", "USD")!;
    let s = book({});
    s = { ...s, cards: [card] } as LedgerState;
    // The user pays $200 on Nov 10.
    s = payCard(s, card.id, 20000, "2026-11-10", "pay-1", "Pago");
    // On Nov 16 they save a bank reading DATED Nov 1 (balance $1,000 — it cannot include the Nov 10 payment).
    s = addReading(s, card.id, { balanceMinor: 100000, on: "2026-11-01", src: "shot" }, "2026-11-16", "2026-11-16T12:00:00.000Z");
    const mine = cardsOf(s).find((c) => c.id === card.id)!;
    const f = cardFigures(s, mine, "2026-11-16");
    assert.equal(f.balance, 80000, `the Nov 10 payment must lower the balance to $800, got ${f.balance}`);
  });
});

describe("PREJUDICE F3 — hunter candidate M-1: a received loan can never be overdue", () => {
  it("the dues window includes the loan's PAST Nov 5 occurrence, as its own header promises", () => {
    let s = book({});
    s = addLoan(s, {
      id: "loan-1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 500000,
      currency: "NIO", aprBps: 0, takenOn: "2026-09-01", dueDay: 5, book: "personal", note: "",
      // Canon adaptation (1.3.299 port): the verbatim fixture's direct cast
      // failed TS2352 — the partial loan goes through unknown; type-level
      // only, the specimen's runtime value is unchanged.
    } as unknown as Parameters<typeof addLoan>[1]);
    const dues = duesWindow(s, 30, "2026-11-16");
    const mine = dues.filter((d) => d.kind === "loan");
    assert.ok(mine.some((d) => d.on === "2026-11-05"), `expected the overdue Nov 5 occurrence, got ${JSON.stringify(mine.map((d) => d.on))}`);
  });
});
