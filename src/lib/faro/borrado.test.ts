import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dropSubLines, subLinesSummary } from "./defaults.ts";
import { translate } from "./i18n.ts";
import type { Charge, Currency, LedgerState, Line } from "./types.ts";

// 1.3.178 — Oscar's decision on catalogue item 1 of the sovereignty pass (1.3.177):
// the Estructura tree bin retires a subcategory AND its lines. These tests pin the two
// pure seams the control is built from: subLinesSummary (what the informed confirmation
// states — count and per-currency total, computed before anything burns) and
// dropSubLines (the retirement itself, shared with the Desk bank-row bin so both
// controls retire exactly the same set of records).

function line(id: string, subId: string, minor: number, currency: Currency = "NIO", balance?: { minor: number; currency: Currency }, history: Charge[] = []): Line {
  return {
    id, seriesId: id, monthKey: "2026-11", kind: "expense-fixed", concept: id, amountMinor: minor, currency, active: true, note: "",
    categoryId: "f-casa", subId, recurring: true, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: balance ? balance.minor : null, balanceCurrency: balance ? balance.currency : currency, icon: "", history,
  };
}

function ledger(months: LedgerState["months"]): LedgerState {
  return {
    v: 1,
    structure: { categories: [], purchases: [], catalog: [] },
    months,
    settings: {
      lang: "es", theme: "claro", display: "NIO" as Currency, rateE4: 366243, rateSource: "BCN", rateAsOf: "2026-11-09",
      savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {}, seeds: [],
    },
    audit: [],
    revision: 1,
    updatedAt: "2026-11-09T12:00:00.000Z",
  };
}

describe("subLinesSummary — the confirmation counts and totals before anything burns", () => {
  it("a sub with no lines reads zero, with no totals at all", () => {
    const st = ledger({ "2026-11": { lines: [line("a", "f.casa.otros", 500)] } });
    assert.deepEqual(subLinesSummary(st, "f.casa.renta"), { count: 0, totals: [] });
  });

  it("counts the sub's lines across every month and ignores the rest", () => {
    const st = ledger({
      "2026-10": { lines: [line("a", "f.casa.renta", 90000), line("b", "f.casa.otros", 700)] },
      "2026-11": { lines: [line("c", "f.casa.renta", 90000), line("d", "f.casa.renta", 100)] },
    });
    assert.deepEqual(subLinesSummary(st, "f.casa.renta"), { count: 3, totals: [{ currency: "NIO", minor: 180100 }] });
  });

  it("a bank line reads at its balance, in the balance's currency — not at its opening amount", () => {
    const st = ledger({
      "2026-11": { lines: [line("a", "vault-chase", 10000, "NIO", { minor: 43250, currency: "USD" })] },
    });
    assert.deepEqual(subLinesSummary(st, "vault-chase"), { count: 1, totals: [{ currency: "USD", minor: 43250 }] });
  });

  it("mixed currencies stay separate, NIO first — never merged, never converted", () => {
    const st = ledger({
      "2026-11": {
        lines: [
          line("a", "f.casa.renta", 25000, "USD"),
          line("b", "f.casa.renta", 99900, "NIO"),
          line("c", "f.casa.renta", 100, "NIO"),
        ],
      },
    });
    assert.deepEqual(subLinesSummary(st, "f.casa.renta"), {
      count: 3,
      totals: [{ currency: "NIO", minor: 100000 }, { currency: "USD", minor: 25000 }],
    });
  });

  it("history charges ride inside their line: they add neither count nor total", () => {
    const charges: Charge[] = [
      { id: "h1", date: "2026-11-02", amountMinor: 5000, currency: "NIO", note: "deposito" },
      { id: "h2", date: "2026-11-05", amountMinor: -2000, currency: "NIO", note: "retiro" },
      { id: "h3", date: "2026-11-08", amountMinor: 500, currency: "NIO", note: "deposito" },
    ];
    const st = ledger({ "2026-11": { lines: [line("a", "vault-banpro", 0, "NIO", { minor: 0, currency: "NIO" }, charges)] } });
    assert.deepEqual(subLinesSummary(st, "vault-banpro"), { count: 1, totals: [{ currency: "NIO", minor: 0 }] });
  });

  it("the app's own seeded $0 line counts as a line and totals an honest zero", () => {
    const st = ledger({ "2026-11": { lines: [line("seed", "vault-banpro", 0, "NIO", { minor: 0, currency: "NIO" })] } });
    const s = subLinesSummary(st, "vault-banpro");
    assert.equal(s.count, 1);
    assert.deepEqual(s.totals, [{ currency: "NIO", minor: 0 }]);
  });
});

describe("dropSubLines — the retirement both bins share", () => {
  it("takes the sub's lines out of every month and leaves everything else untouched", () => {
    const months: LedgerState["months"] = {
      "2026-10": { lines: [line("a", "f.casa.renta", 90000), line("b", "f.casa.otros", 700)] },
      "2026-11": { lines: [line("c", "f.casa.renta", 90000)] },
      "2026-12": { lines: [line("d", "f.casa.otros", 300)] },
    };
    const out = dropSubLines(months, "f.casa.renta");
    assert.deepEqual(Object.keys(out).sort(), ["2026-10", "2026-11", "2026-12"]);
    assert.deepEqual(out["2026-10"].lines.map((l) => l.id), ["b"]);
    assert.deepEqual(out["2026-11"].lines, []);
    assert.deepEqual(out["2026-12"].lines.map((l) => l.id), ["d"]);
  });

  it("does not mutate the months it was given", () => {
    const months: LedgerState["months"] = { "2026-11": { lines: [line("a", "f.casa.renta", 100)] } };
    dropSubLines(months, "f.casa.renta");
    assert.equal(months["2026-11"].lines.length, 1);
  });

  it("a sub with no lines retires nothing and harms nothing", () => {
    const months: LedgerState["months"] = { "2026-11": { lines: [line("a", "f.casa.otros", 100)] } };
    const out = dropSubLines(months, "f.casa.renta");
    assert.deepEqual(out["2026-11"].lines.map((l) => l.id), ["a"]);
  });
});

describe("the informed confirmation's words exist in both languages", () => {
  it("plural and singular keys carry their placeholders in ES and EN", () => {
    for (const lang of ["es", "en"] as const) {
      assert.ok(translate(lang, "delete.sub.lines").includes("{n}"), `${lang} plural names the count`);
      assert.ok(translate(lang, "delete.sub.lines").includes("{totals}"), `${lang} plural names the total`);
      assert.ok(translate(lang, "delete.sub.lines.one").includes("{totals}"), `${lang} singular names the total`);
      assert.ok(!translate(lang, "delete.sub.lines.one").includes("{n}"), `${lang} singular needs no count`);
    }
  });
});
