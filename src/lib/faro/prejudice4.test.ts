/**
 * PREJUDICE CAMPAIGN (2026-11-16) — the RE-ATTACK: the cured seams face nastier
 * variants of their own attacks, plus two hunter leads never yet convicted
 * (M-3 impossible days beyond the quick-add door, M-4 unparseable cadences).
 * A probe that passes = the seam held under the harder attack. A failure is a
 * NEW confirmed break and goes back to the Friend Rule.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { duesWindow } from "./dues.ts";
import { addLoan, loanState, payLoan } from "./loans.ts";
import { addLent } from "./debts.ts";
import { parseMoney } from "./bankparse.ts";
import { parseAmount } from "./money.ts";
import { parseQuickEntries } from "./quickadd.ts";
import { isLedgerDeep } from "./defaults.ts";
import { copyRecurring } from "./reducer.ts";
import type { LedgerState, Line, Loan } from "./types.ts";

function line(partial: Partial<Line> & { id: string }): Line {
  return {
    seriesId: partial.id, monthKey: "2026-10", kind: "expense-fixed", concept: "X",
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
      { id: "f-ahorro", name: "Ahorro", role: "savings", subs: [{ id: "f.ahorro.retiro", name: "Retiro", icon: "" }] },
    ], purchases: [], catalog: [] },
    settings: { lang: "es", theme: "tron", display: "NIO", rateE4: 10000 },
    revision: 1, updatedAt: "2026-11-16T00:00:00.000Z", audit: [],
  } as unknown as LedgerState;
}
const LOAN = {
  id: "loan-1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 500000,
  currency: "NIO", aprBps: 0, takenOn: "2026-09-01", dueDay: 5, book: "personal", note: "",
} as unknown as Loan;

describe("RE-ATTACK PJ-4 — the loan occurrence, at its boundaries", () => {
  it("a payment booked exactly ON the occurrence covers the cycle (no false overdue)", () => {
    let s = addLoan(book({}), LOAN);
    s = payLoan(s, "loan-1", 50000, "2026-11-05", "p1", "Pago");
    const mine = duesWindow(s, 30, "2026-11-16").filter((d) => d.kind === "loan");
    assert.ok(!mine.some((d) => d.on === "2026-11-05"), `Nov 5 was paid on Nov 5; got ${JSON.stringify(mine.map((d) => d.on))}`);
  });
  it("a payment booked the day BEFORE the occurrence does not cover it (overdue stands)", () => {
    let s = addLoan(book({}), LOAN);
    s = payLoan(s, "loan-1", 50000, "2026-11-04", "p1", "Pago");
    const mine = duesWindow(s, 30, "2026-11-16").filter((d) => d.kind === "loan");
    assert.ok(mine.some((d) => d.on === "2026-11-05"), `Nov 4 pays October's cycle, not November's; got ${JSON.stringify(mine.map((d) => d.on))}`);
  });
  it("a loan taken after this month's due day shows no phantom overdue — first occurrence is next month", () => {
    const late = { ...LOAN, id: "loan-2", takenOn: "2026-11-10" } as Loan;
    const s = addLoan(book({}), late);
    const mine = duesWindow(s, 30, "2026-11-16").filter((d) => d.kind === "loan" && d.id === "loan-2");
    assert.ok(!mine.some((d) => d.on === "2026-11-05"), `the loan did not exist on Nov 5; got ${JSON.stringify(mine.map((d) => d.on))}`);
    assert.ok(mine.some((d) => d.on === "2026-12-05"), `its first occurrence is Dec 5; got ${JSON.stringify(mine.map((d) => d.on))}`);
  });
});

describe("RE-ATTACK PJ-5 — the parsers agree beyond the convicted text", () => {
  for (const text of ["1,234", "1.234,56", "1.234.567", "12,50", "1.23", "1234", "0.5"]) {
    it(`parseMoney('${text}') === parseAmount('${text}')`, () => {
      assert.equal(parseMoney(text), parseAmount(text), `bank ${parseMoney(text)} vs typed ${parseAmount(text)}`);
    });
  }
});

describe("RE-ATTACK PJ-9 — leap years are real days", () => {
  it("an entry dated 2028-02-29 (a leap year) drains normally", () => {
    const raw = JSON.stringify([{ id: "entry-123456", sign: "out", minor: 1000, cur: "NIO", day: "2028-02-29" }]);
    assert.equal(parseQuickEntries(raw).length, 1);
  });
  it("an entry dated 2026-02-29 (not a leap year) is discarded", () => {
    const raw = JSON.stringify([{ id: "entry-123456", sign: "out", minor: 1000, cur: "NIO", day: "2026-02-29" }]);
    assert.equal(parseQuickEntries(raw).length, 0);
  });
});

describe("RE-ATTACK waves 3 — the gate at its exact edges", () => {
  it("an OBJECT balanceMinor is rejected by the deep gate", () => {
    const b = book({ "2026-11": [line({ id: "g1", balanceMinor: { evil: 1 } as unknown as number })] }) as unknown as Record<string, unknown>;
    assert.equal(isLedgerDeep(b), false);
  });
  it("revision 2147483647 (the server's max) passes; 2147483648 is rejected", () => {
    const ok = book({}) as unknown as Record<string, unknown>;
    ok.revision = 2147483647;
    assert.equal(isLedgerDeep(ok), true, "the largest pushable revision is a valid book");
    const over = book({}) as unknown as Record<string, unknown>;
    over.revision = 2147483648;
    assert.equal(isLedgerDeep(over), false);
  });
  it("a sub whose icon is a NUMBER is rejected by the deep gate", () => {
    const b = book({}) as unknown as { structure: { categories: { subs: Record<string, unknown>[] }[] } };
    b.structure.categories[0]!.subs[0]!.icon = 42;
    assert.equal(isLedgerDeep(b), false);
  });
});

describe("RE-ATTACK M-3 — impossible days beyond the quick-add door", () => {
  it("a lent due on 2026-02-31 must not surface in the dues window as a real due", () => {
    let s = book({});
    s = addLent(s, {
      id: "lent-1", person: "Ana", amountMinor: 100000, currency: "NIO", lentOn: "2026-01-15",
      dueOn: "2026-02-31", note: "", book: "personal", archived: false,
    } as unknown as Parameters<typeof addLent>[1]);
    const mine = duesWindow(s, 90, "2026-02-01").filter((d) => d.kind === "lent");
    assert.equal(mine.length, 0, `Feb 31 does not exist; got ${JSON.stringify(mine.map((d) => d.on))}`);
  });
  it("loanState stays finite when a payment carries an impossible day", () => {
    let s = addLoan(book({}), { ...LOAN, aprBps: 1200 } as Loan);
    s = payLoan(s, "loan-1", 50000, "2026-02-31", "p1", "Pago");
    const loan = (s as unknown as { loans: Loan[] }).loans?.[0] ?? LOAN;
    const st = loanState(s, loan, "2026-11-16");
    assert.ok(Number.isFinite(st.left) && Number.isFinite(st.interest), `left=${st.left} interest=${st.interest}`);
  });
});

describe("RE-ATTACK M-4 — a copied cuota with an unparseable custom cadence", () => {
  it("the charge is COPIED into the target month — an unknown rhythm must not make it vanish", () => {
    // Convicted as PJ-16 (probe corrected to the true failure): with cadence
    // "every-3-months" the interval branch produced NO copy at all — the charge
    // silently disappeared from November. The law: the copy exists, in its month.
    // Canon adaptation (1.3.299 port): the specimen's cadence is invalid BY
    // DESIGN (that is the PJ-16 attack), so the literal crosses through
    // unknown — type-level only, the runtime string is the attack itself.
    const src = line({ id: "cuota-x", cadence: "every-3-months" as unknown as Line["cadence"], nextDue: "2026-10-18" });
    const { state, count } = copyRecurring(book({ "2026-10": [src], "2026-11": [] }), "2026-10", "2026-11");
    assert.equal(count, 1, "the copy must exist");
    const copy = state.months["2026-11"]!.lines[0]!;
    assert.equal(copy.nextDue.slice(0, 7), "2026-11", `the copy's due date lives in its own month, got ${copy.nextDue}`);
  });
});
