import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wake, readStoredGoals, readVaultPref, writeVaultPref, type HorizonGoal } from "./awake.ts";
import type { Currency, LedgerState, Line, LineKind } from "./types.ts";

const names = { cat: () => "", sub: (id: string) => id };

function line(id: string, kind: LineKind, concept: string, minor: number, categoryId: string, subId: string, icon = ""): Line {
  return {
    id, seriesId: id, monthKey: "2026-10", kind, concept, amountMinor: minor, currency: "USD", active: true, note: "",
    categoryId, subId, recurring: kind === "expense-fixed" || kind === "subscription", storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: categoryId === "f-ahorro" ? minor : null,
    balanceCurrency: "USD", icon, history: [],
  };
}

function ledger(rows: Line[], goalPct = 20): LedgerState {
  return {
    v: 1,
    structure: {
      categories: [
        {
          id: "f-ahorro", nameKey: "f.ahorro", customName: "", icon: "PiggyBank", hidden: false, order: 0, group: "fixed", role: "savings",
          subs: [
            { id: "f.ahorro.meta", nameKey: "f.ahorro.meta", customName: "Meta", icon: "Flag", hidden: false, order: 0 },
            { id: "f.ahorro.retiro", nameKey: "f.ahorro.retiro", customName: "Retiro", icon: "Flag", hidden: false, order: 1 },
            { id: "f.ahorro.emergencia", nameKey: "f.ahorro.emergencia", customName: "Emergencia", icon: "Flag", hidden: false, order: 2 },
            { id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 3 },
          ],
        },
        {
          id: "f-casa", nameKey: "f.casa", customName: "", icon: "Home", hidden: false, order: 1, group: "fixed", role: "housing",
          subs: [],
        },
      ],
      purchases: [],
      catalog: [],
    },
    months: { "2026-10": { lines: rows } },
    settings: {
      lang: "es", theme: "claro", display: "USD" as Currency, rateE4: 366243, rateSource: "BCN", rateAsOf: "2026-10-12",
      savingsGoalPct: goalPct, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {},
    },
    audit: [],
    revision: 1,
    updatedAt: "2026-10-22T12:00:00.000Z",
  };
}

const salary = line("salario", "income-fixed", "Salario", 104250, "", "");
const base = line("casa", "expense-fixed", "Casa", 21199, "f-casa", "");
const paypal = (minor: number) => line("paypal", "expense-fixed", "PayPal", minor, "f-ahorro", "f.ahorro.paypal", "vault:paypal");
const emergencia = (minor: number) => line("emergencia", "expense-fixed", "Emergencia", minor, "f-ahorro", "f.ahorro.emergencia");

function run(before: LedgerState | null, after: LedgerState, extra: Partial<Parameters<typeof wake>[0]> = {}) {
  return wake({ before, after, monthKey: "2026-10", lang: "es", names, at: "2026-10-22T12:00:00.000Z", ...extra });
}

describe("asesor siempre despierto", () => {
  it("assigns 200 to Emergencia and signs the cushion", () => {
    const before = ledger([salary, base, paypal(130100)]);
    const after = ledger([salary, base, paypal(110100), emergencia(20000)]);
    const result = run(before, after);
    assert.equal(result.snapshot.savingsTotal, 130100);
    assert.equal(result.snapshot.unassigned, 110100);
    assert.equal(result.snapshot.emergencia, 20000);
    assert.equal(result.silent, false);
    assert.equal(result.notice === null, false);
    assert.match(result.causes.long || result.notice || "", /Emergencia/);
    assert.match(result.causes.long || result.notice || "", /0\.94/);
    assert.equal(result.log.recalculated.includes("credito"), false);
    assert.equal(result.log.recalculated.includes("colchon"), true);
    assert.equal(result.findings.some((item) => item.id === "unassigned" && item.body.includes("1,101") || item.body.includes("1.101") || item.body.includes("1101")), true);
  });

  it("treats a destino Meta projection change as a scenario, not a contradiction", () => {
    const state = ledger([salary, base]);
    const goalsBefore: HorizonGoal[] = [{ id: "meta", totalMinor: 420000, years: 10 }];
    const goalsAfter: HorizonGoal[] = [{ id: "meta", totalMinor: 600000, years: 10 }];
    const result = run(state, state, { goalsBefore, goalsAfter });
    const horizon = result.findings.find((item) => item.id === "horizon-meta");
    assert.ok(horizon);
    const said = `${horizon.body} ${horizon.cause} ${result.notice ?? ""}`;
    assert.match(said, /proyección/i);
    assert.match(said, /destino Meta/);
    assert.match(said, /6,000/);
    assert.match(said, /con ese apartado/i);
    assert.match(said, /llegaría/i);
    assert.doesNotMatch(said, /contradic/i);
    assert.doesNotMatch(said, /no coinciden/i);
    assert.doesNotMatch(said, /requerido/i);
    assert.doesNotMatch(said, /cuota/i);
    assert.doesNotMatch(said, /al mes/i);
    assert.doesNotMatch(said, /meta de ahorro del mes/);
    assert.equal(result.events.includes("credito-editado"), false);
    assert.equal(result.log.recalculated.includes("credito"), false);
    assert.equal(result.events.includes("destino-editado"), true);
  });

  it("does not dwell on a projection that did not change", () => {
    const state = ledger([salary, base]);
    const goals: HorizonGoal[] = [{ id: "meta", totalMinor: 420000, years: 10 }];
    const result = run(state, state, { goalsBefore: goals, goalsAfter: goals });
    assert.equal(result.findings.some((item) => item.id === "horizon-meta"), false);
    assert.equal(result.notice, null);
    assert.equal(result.events.includes("destino-editado"), false);
  });

  it("reads the widget and the ficha from one projection record", () => {
    const mem = new Map<string, string>();
    const ls = {
      getItem: (key: string) => (mem.has(key) ? mem.get(key)! : null),
      setItem: (key: string, value: string) => { mem.set(key, value); },
      removeItem: (key: string) => { mem.delete(key); },
      clear: () => mem.clear(),
      key: () => null,
      length: 0,
    };
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
    mem.set("faro-vault-lever:#8fb9a6", "3500");
    mem.set("faro-vault-years:#8fb9a6", "10");
    assert.equal(readVaultPref("faro-vault-lever", "meta"), "3500");
    const fromFicha = readStoredGoals("USD", 366243);
    assert.equal(fromFicha.length, 1);
    assert.equal(fromFicha[0]?.id, "meta");
    assert.equal(fromFicha[0]?.totalMinor, 420000);
    assert.equal(fromFicha[0]?.years, 10);
    writeVaultPref("faro-vault-lever", "meta", "5000");
    writeVaultPref("faro-vault-years", "meta", "10");
    assert.equal(readVaultPref("faro-vault-lever", "meta"), "5000");
    assert.equal(mem.get("faro-vault-lever:#8fb9a6"), "5000");
    assert.equal(mem.has("faro-vault-lever:meta"), false);
    const shared = readStoredGoals("USD", 366243);
    assert.equal(shared[0]?.totalMinor, 600000);
  });

  it("recalculates floor, month goal and leftover once for a burst of incomes", () => {
    const before = ledger([salary, base]);
    const after = ledger([
      salary,
      base,
      line("honorarios", "income-fixed", "Honorarios", 10000, "", ""),
      line("bono", "income-variable", "Bono", 5000, "", ""),
    ]);
    const result = run(before, after);
    assert.equal(result.snapshot.floor, 114250);
    assert.equal(result.snapshot.monthGoal, Math.round((104250 + 10000 + 5000) * 20 / 100));
    assert.equal(result.snapshot.left, 104250 + 15000 - 21199);
    assert.equal(typeof result.notice, "string");
    assert.match(result.notice || "", /ingreso piso/);
    assert.match(result.notice || "", /meta de ahorro del mes/);
    assert.match(result.notice || "", /lo que queda/);
    assert.equal(result.events.filter((name) => name.startsWith("ingreso")).length, 1);
  });

  it("withdraws the advice when the line that motivated it is deleted", () => {
    const iron = line("iron", "purchase", "Ironman", 100000, "f-casa", "");
    const before = ledger([salary, base, iron]);
    const after = ledger([salary, base]);
    const result = run(before, after, {
      planCopied: true,
      adviceBefore: [{ horizon: "short", lead: "Ironman es la mayor", points: [{ value: "$1,000.00" }] }],
      adviceAfter: [{ horizon: "short", lead: "La base sigue en pie", points: [{ value: "$0.00" }] }],
    });
    assert.match(result.notice || "", /Ironman/);
    assert.match(result.causes.short || "", /ya no aplica/);
    assert.equal(result.stalePlan, true);
    assert.equal(result.log.changed.includes("short"), true);
  });

  it("stays silent for a two-dollar edit", () => {
    const before = ledger([salary, base]);
    const after = ledger([salary, line("casa", "expense-fixed", "Casa", 21399, "f-casa", "")]);
    const result = run(before, after, {
      adviceBefore: [{ horizon: "short", lead: "antes", points: [{ value: "$211.99" }] }],
      adviceAfter: [{ horizon: "short", lead: "despues", points: [{ value: "$213.99" }] }],
    });
    assert.equal(result.silent, true);
    assert.equal(result.notice, null);
    assert.deepEqual(result.causes, {});
    assert.deepEqual(result.fresh, []);
    assert.equal(result.log.silent, true);
    assert.equal(result.log.event.includes("gasto-editado"), true);
  });

  it("hides the layer when the switch is off but keeps the snapshot", () => {
    const before = ledger([salary, base, paypal(130100)]);
    const after = ledger([salary, base, paypal(110100), emergencia(20000)]);
    const result = run(before, after, { enabled: false });
    assert.equal(result.snapshot.unassigned, 110100);
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.causes, {});
    assert.equal(result.notice, null);
    assert.equal(result.stalePlan, false);
    assert.equal(result.log.silent, false);
  });
});
