// Import safety nets (1.3.146): rows with no readable date never reach a phantom month, and imported
// lines carry the currency chosen per file in the review — never a silent hardcoded USD.
// Self-contained fixtures (bankparse.test.ts reads external statement files; these build their own).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImport, buildReview, counts, type ParsedFile } from "./bankparse.ts";
import type { Category, Currency, LedgerState } from "./types.ts";

const sub = (id: string, name: string) => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0 });
const cat = (id: string, group: "fixed" | "variable", name: string, subs: [string, string][]): Category => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0, group, role: "", subs: subs.map(([a, b]) => sub(a, b)) });
function ledger(display: Currency = "USD"): LedgerState {
  return {
    v: 1, revision: 1, updatedAt: "", audit: [], months: {},
    settings: { lang: "es", theme: "claro", display, rateE4: 366243, rateSource: "", rateAsOf: "", savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {} },
    structure: {
      categories: [
        cat("f-alimentos", "fixed", "Alimentos", [["f.alimentos.despensa", "Despensa"]]),
        cat("v-personales", "variable", "Personales", [["v.p.salud", "Farmacia"], ["v.p.otros", "Otros"]]),
      ],
      purchases: [{ id: "otros", nameKey: "", customName: "Otros", icon: "Package", hidden: false, order: 0 }],
      catalog: [],
    },
  };
}
const names = { cat: (id: string) => id, sub: (id: string) => id, purchase: (id: string) => id };
const allLines = (s: LedgerState) => Object.values(s.months).flatMap((b) => b.lines);

describe("import safety: dateless rows", () => {
  const file: ParsedFile = {
    name: "estado.pdf", format: "pdf", bank: "chase", kind: "card", sig: "pdf:test",
    rows: [
      { date: "2026-11-03", amount: -2500, desc: "SUPER MERCADO" },
      { date: "2026-11-04", amount: -1000, desc: "FARMACIA" },
      { date: "", amount: -9999, desc: "SIN FECHA" },
    ],
  };

  it("the review drops them and counts them", () => {
    const rv = buildReview(ledger(), [file], [""], names, "es");
    assert.equal(rv.dateless, 1);
    assert.equal(rv.rows.length, 2);
    assert.equal(counts(rv.rows).total, 2);
    assert.ok(rv.rows.every((r) => r.month === "2026-11"));
  });

  it("applying the import never writes a phantom month", () => {
    const s = ledger();
    const rv = buildReview(s, [file], [""], names, "es");
    const { state: after } = applyImport(s, rv, [file], [""], "batch-test");
    assert.equal("" in after.months, false);
    assert.ok(Object.keys(after.months).every((k) => /^\d{4}-\d{2}$/.test(k)));
    assert.equal(allLines(after).length, 2);
    assert.equal(allLines(after).reduce((sum, l) => sum + l.amountMinor, 0), 3500);
  });
});

describe("import safety: currency per file", () => {
  const csv = (rows: ParsedFile["rows"]): ParsedFile => ({ name: "banco.csv", format: "csv", bank: "other", sig: "csv:test", rows });

  it("lines carry the review-chosen currency, not a hardcoded USD", () => {
    const s = ledger("USD");
    const file = csv([{ date: "2026-11-03", amount: -36000, desc: "PAGO LUZ" }]);
    const rv = buildReview(s, [file], [""], names, "es", ["NIO"]);
    assert.equal(rv.rows[0]?.currency, "NIO");
    const { state: after } = applyImport(s, rv, [file], [""], "batch-nio");
    const line = allLines(after)[0];
    assert.ok(line);
    assert.equal(line.currency, "NIO");
    assert.equal(line.balanceCurrency, "NIO");
    assert.equal(line.amountMinor, 36000);
  });

  it("with no choice and no word from the file, the book's display currency rules", () => {
    const s = ledger("NIO");
    const file = csv([{ date: "2026-11-03", amount: -36000, desc: "PAGO LUZ" }]);
    const rv = buildReview(s, [file], [""], names, "es");
    assert.equal(rv.rows[0]?.currency, "NIO");
    const { state: after } = applyImport(s, rv, [file], [""], "batch-display");
    assert.equal(allLines(after)[0]?.currency, "NIO");
  });

  it("a currency the file itself declares beats the display default", () => {
    const s = ledger("USD");
    const file = csv([{ date: "2026-11-03", amount: -36000, desc: "PAGO LUZ", currency: "NIO" }]);
    const rv = buildReview(s, [file], [""], names, "es");
    assert.equal(rv.rows[0]?.currency, "NIO");
  });
});
