// Loans received (node --test --experimental-strip-types src/lib/faro/loans.test.ts). Synthetic data only.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, isLedger } from "./defaults.ts";
import { addLoan, archiveLoan, loanFigures, loanPays, loanState, loanTotals, loansOf, payLoan, simpleInterest } from "./loans.ts";
import { summarize } from "./engine.ts";
import type { LedgerState, Loan } from "./types.ts";

const base = (): LedgerState => ({ ...createInitial("es", "claro"), settings: { ...createInitial("es", "claro").settings, display: "NIO" } });
const loan: Loan = { id: "L1", lender: "Cooperativa Demo", who: "entity", kind: "interest", amountMinor: 1_000_000, currency: "NIO", aprBps: 2400, takenOn: "2026-10-01", book: "fixed", note: "" };

describe("loans received", () => {
  it("pending after N days follows amount × rate × days / 365", () => {
    const s = addLoan(base(), loan);
    const f = loanState(s, loansOf(s)[0], "2026-10-31");
    // C$10,000 at 24% for 30 days = C$197.26
    assert.equal(f.interest, Math.round((1_000_000 * 2400 * 30) / (10000 * 365)));
    assert.equal(f.interest, 19726);
    assert.equal(f.left, 1_000_000 + 19726);
    assert.equal(simpleInterest(1_000_000, 2400, "2026-10-01", "2026-10-01"), 0);
    // Me deben uses the very same rule
    assert.deepEqual(loanFigures(1_000_000, "interest", 2400, "2026-10-01", 0, "2026-10-31"), { interest: 19726, paid: 0, left: 1_019_726 });
    assert.equal(loanFigures(1_000_000, "plain", 2400, "2026-10-01", 0, "2026-10-31").interest, 0);
  });

  it("a payment through the Fijos book is a normal ledger line that counts as debt", () => {
    let s = addLoan(base(), loan);
    s = payLoan(s, "L1", 200_000, "2026-10-20", "P1", "Préstamo");
    const line = s.months["2026-10"].lines.find((l) => l.id === "P1")!;
    assert.equal(line.kind, "expense-fixed");
    assert.equal(line.loanId, "L1");
    assert.equal(line.categoryId, "f-creditos");
    assert.equal(line.amountMinor, 200_000);
    assert.equal(line.bookedOn, "2026-10-20");
    const f = loanState(s, loansOf(s)[0], "2026-10-31");
    assert.equal(f.paid, 200_000);
    assert.equal(f.left, 1_019_726 - 200_000);
    const sum = summarize(s, "2026-10", "es");
    assert.equal(sum.fixed >= 200_000, true);
    assert.equal(sum.debt, 200_000);
    // Variables book: still a normal line, still debt
    let v = addLoan(base(), { ...loan, id: "L2", book: "variable" });
    v = payLoan(v, "L2", 50_000, "2026-10-21", "P2", "Préstamo");
    const vl = v.months["2026-10"].lines[0];
    assert.equal(vl.kind, "expense-variable");
    assert.equal(summarize(v, "2026-10", "es").debt, 50_000);
  });

  it("archive keeps the loan, its pending and its payment history", () => {
    let s = addLoan(base(), loan);
    s = payLoan(s, "L1", 200_000, "2026-10-20", "P1", "Préstamo");
    s = archiveLoan(s, "L1", "2026-10-31");
    const a = loansOf(s)[0];
    assert.equal(a.archived, true);
    assert.equal(a.archivedOn, "2026-10-31");
    assert.equal(a.unpaidMinor, 819_726);
    assert.equal(loanPays(s, "L1").length, 1);
    assert.equal(s.months["2026-10"].lines.length, 1);
    assert.equal(loanTotals(s).count, 0);
    assert.equal(loanTotals(s).archived, 1);
  });

  it("old ledgers and backups without loans load unchanged", () => {
    const old = base();
    delete (old as Partial<LedgerState>).loans;
    const roundTrip = JSON.parse(JSON.stringify({ app: "FARO", v: 1, ledger: old }));
    assert.equal(isLedger(roundTrip.ledger), true);
    assert.deepEqual(loansOf(roundTrip.ledger), []);
    assert.deepEqual(loanTotals(roundTrip.ledger), { count: 0, borrowed: 0, interest: 0, paid: 0, left: 0, archived: 0 });
    assert.equal("loans" in roundTrip.ledger, false);
    // A ledger with loans survives the same JSON round trip (backup / sync carry the whole ledger).
    const withLoan = JSON.parse(JSON.stringify(addLoan(base(), loan)));
    assert.equal(loansOf(withLoan)[0].lender, "Cooperativa Demo");
  });
});
