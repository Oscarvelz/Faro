// Credit cards math (1.3.107). Synthetic numbers only.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { addReading, addRewards, redeemRewards, rewardsEarned, rewardsOf, rewardsTotals, cardFigures, cardTotals, cardsOf, dropCard, dropPresets, payCard, presetsOff, putCard, restorePresets, storedCards, utilLevel, toThirty } from "./cards.ts";
import { debtSeries, netBalance, payoffPlan } from "./debts.ts";
import { summarize } from "./engine.ts";
import { earningsBySource } from "./earnings.ts";
import type { LedgerState } from "./types.ts";

const base = (): LedgerState => ({ ...createInitial("es", "claro"), settings: { ...createInitial("es", "claro").settings, display: "USD" } });

describe("credit cards", () => {
  it("three presets with names only; delete/restore and Empezar de cero", () => {
    let s = base();
    const list = cardsOf(s);
    assert.deepEqual(list.map((c) => c.preset), ["chase", "wellsfargo", "paypal"]);
    assert.ok(list.every((c) => c.snaps.length === 0 && c.last4 === "" && c.limitMinor === null));
    assert.equal(storedCards(s).length, 0, "presets are virtual until they get data");
    s = dropCard(s, "card-chase");
    assert.deepEqual(cardsOf(s).map((c) => c.preset), ["wellsfargo", "paypal"]);
    assert.deepEqual(presetsOff(s), ["chase"]);
    s = dropPresets(s);
    assert.equal(cardsOf(s).length, 0);
    s = restorePresets(s);
    assert.equal(cardsOf(s).length, 3);
  });
  it("limit = balance + available, utilization, trend between readings", () => {
    let s = addReading(base(), "card-paypal", { balanceMinor: 30000, availMinor: 170000, src: "shot", on: "2026-11-02" }, "2026-11-02");
    s = addReading(s, "card-paypal", { balanceMinor: 42000, availMinor: 158000, src: "shot", on: "2026-11-05" }, "2026-11-05");
    const c = cardsOf(s).find((x) => x.id === "card-paypal")!;
    const f = cardFigures(s, c, "2026-11-05");
    assert.equal(f.limit, 200000);
    assert.equal(f.util, 0.21);
    assert.equal(f.delta, 12000);
    assert.equal(f.since, "2026-11-02");
    assert.equal(c.snaps.length, 2, "readings are kept, never replaced");
    assert.equal(utilLevel(f.util), "ok");
    assert.equal(toThirty(42000, 200000), 0);
    assert.equal(toThirty(90000, 200000), 30000);
  });
  it("a typed limit wins; a deleted card with history is archived, not lost", () => {
    let s = addReading(base(), "card-wellsfargo", { balanceMinor: 50000, src: "manual" }, "2026-11-05");
    s = putCard(s, { ...cardsOf(s).find((c) => c.id === "card-wellsfargo")!, limitMinor: 400000 });
    assert.equal(cardFigures(s, cardsOf(s).find((c) => c.id === "card-wellsfargo")!).util, 0.125);
    s = dropCard(s, "card-wellsfargo");
    assert.equal(cardsOf(s).some((c) => c.id === "card-wellsfargo"), false);
    assert.equal(storedCards(s).find((c) => c.id === "card-wellsfargo")!.archived, true);
    s = restorePresets(s);
    assert.equal(cardsOf(s).find((c) => c.id === "card-wellsfargo")!.snaps.length, 1);
  });
  it("paying a card lowers its balance and never counts as spending (no double count)", () => {
    let s = base();
    // A purchase made with the card is already an expense.
    s = { ...s, months: { "2026-11": { lines: [{ id: "buy", seriesId: "buy", monthKey: "2026-11", kind: "expense-variable", concept: "Compra", amountMinor: 10000, currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], bookedOn: "2026-11-03" }] } } };
    s = addReading(s, "card-paypal", { balanceMinor: 60000, availMinor: 140000, src: "shot", on: "2026-11-03" }, "2026-11-03");
    const before = summarize(s, "2026-11", "es");
    s = payCard(s, "card-paypal", 25000, "2026-11-04", "pay1", "Abono");
    const after = summarize(s, "2026-11", "es");
    assert.equal(after.variable, before.variable, "the payment adds no expense");
    assert.equal(after.income, before.income);
    const line = s.months["2026-11"].lines.find((l) => l.id === "pay1")!;
    assert.equal(line.xfer, true); assert.equal(line.active, false); assert.equal(line.cardId, "card-paypal");
    const c = () => cardsOf(s).find((x) => x.id === "card-paypal")!;
    assert.equal(cardFigures(s, c(), "2026-11-05").balance, 35000);
    // A new reading saved after the payment already includes it.
    s = addReading(s, "card-paypal", { balanceMinor: 35000, availMinor: 165000, src: "shot", on: "2026-11-05" }, "2026-11-05");
    assert.equal(cardFigures(s, c(), "2026-11-05").balance, 35000);
  });
  it("cards count in Debo, the net balance, the 6-month line and the payoff plan (avalanche by APR)", () => {
    let s = addReading(base(), "card-paypal", { balanceMinor: 100000, availMinor: 100000, src: "shot", on: "2026-09-10" }, "2026-09-10");
    s = addReading(s, "card-wellsfargo", { balanceMinor: 50000, src: "manual", on: "2026-11-01" }, "2026-11-01");
    s = putCard(s, { ...cardsOf(s).find((c) => c.id === "card-wellsfargo")!, aprBps: 2999 });
    s = putCard(s, { ...cardsOf(s).find((c) => c.id === "card-paypal")!, aprBps: 1999 });
    assert.equal(cardTotals(s, "2026-11-05").balance, 150000);
    assert.equal(netBalance(s, "2026-11-05").owe, 150000);
    const series = debtSeries(s, "2026-11-05");
    assert.deepEqual(series.map((p) => p.owe), [0, 0, 0, 100000, 100000, 150000]);
    s = { ...s, debtPlan: { order: "avalanche", monthlyMinor: 30000, currency: "USD" } };
    const plan = payoffPlan(s, "2026-11-05");
    assert.equal(plan.chosen!.order[0], "card-wellsfargo");
    assert.ok(plan.chosen!.interest > 0);
    assert.equal(plan.perPayOf["card-wellsfargo"] + plan.perPayOf["card-paypal"], 30000, "the whole payment is split");
    assert.ok(plan.perPayOf["card-paypal"] >= 2500, "minimum first");
    // Every two weeks: same amount per payment, more per month → sooner.
    const bi = payoffPlan({ ...s, debtPlan: { order: "avalanche", monthlyMinor: 30000, currency: "USD", cadence: "biweekly" } }, "2026-11-05");
    assert.ok(bi.chosen!.months < plan.chosen!.months);
  });
  // 1.3.109: rewards (cash back) — synthetic numbers only.
  it("rewards are dated readings, an asset on the Me deben side, never subtracted from the card debt", () => {
    let s = addReading(base(), "card-wellsfargo", { balanceMinor: 80000, src: "shot", on: "2026-10-01" }, "2026-10-01");
    s = addRewards(s, "card-wellsfargo", { amountMinor: 2000, src: "shot", on: "2026-10-01" }, "2026-10-01");
    s = addRewards(s, "card-wellsfargo", { amountMinor: 2000, src: "shot", on: "2026-10-01" }, "2026-10-01");
    s = addRewards(s, "card-wellsfargo", { amountMinor: 3500, src: "manual", on: "2026-11-03" }, "2026-11-03");
    const c = cardsOf(s).find((x) => x.id === "card-wellsfargo")!;
    assert.equal(c.rw!.length, 2, "the same reading twice on one day is kept once");
    assert.equal(rewardsOf(c).amount, 3500);
    assert.equal(cardFigures(s, c, "2026-11-05").balance, 80000, "the debt is untouched");
    const n = netBalance(s, "2026-11-05");
    assert.equal(n.rewards, 3500); assert.equal(n.owed, 3500); assert.equal(n.owe, 80000); assert.equal(n.net, 3500 - 80000);
    assert.equal(rewardsTotals(s).total, 3500);
    assert.deepEqual(rewardsEarned(c), [{ on: "2026-10-01", minor: 2000 }, { on: "2026-11-03", minor: 1500 }]);
    const pts = addRewards(s, "card-paypal", { points: 12000, src: "shot" }, "2026-11-05");
    assert.equal(rewardsTotals(pts).total, 3500, "points never count as money");
    assert.equal(debtSeries(s, "2026-11-05", 2).at(-1)!.owed, 3500);
  });
  it("Canjear as statement credit: card balance and rewards fall together, no spending, no income, net unchanged", () => {
    let s = addReading(base(), "card-wellsfargo", { balanceMinor: 80000, src: "shot", on: "2026-11-01" }, "2026-11-01");
    s = addRewards(s, "card-wellsfargo", { amountMinor: 3500, src: "shot", on: "2026-11-01" }, "2026-11-01");
    const before = netBalance(s, "2026-11-05");
    s = redeemRewards(s, "card-wellsfargo", "credit", 3500, "2026-11-04", "rd1", "Canje");
    const c = cardsOf(s).find((x) => x.id === "card-wellsfargo")!;
    assert.equal(rewardsOf(c).amount, 0);
    assert.equal(cardFigures(s, c, "2026-11-05").balance, 76500);
    assert.equal(netBalance(s, "2026-11-05").net, before.net);
    const sum = summarize(s, "2026-11", "es");
    assert.equal(sum.income, 0); assert.equal(sum.expense, 0);
    assert.deepEqual(rewardsEarned(c), [{ on: "2026-11-01", minor: 3500 }], "a redemption is not a new earning");
    assert.equal(redeemRewards(s, "card-wellsfargo", "credit", 100, "2026-11-04", "rd2", "Canje"), s, "nothing left to redeem");
  });
  it("Canjear as deposit: income line, rewards to zero, Estudio counts the rewards once", () => {
    let s = addReading(base(), "card-paypal", { balanceMinor: 10000, src: "shot", on: "2026-11-01" }, "2026-11-01");
    s = addRewards(s, "card-paypal", { amountMinor: 1200, src: "shot", on: "2026-11-01" }, "2026-11-01");
    s = redeemRewards(s, "card-paypal", "deposit", 1200, "2026-11-04", "rd3", "Recompensas de tarjetas");
    const c = cardsOf(s).find((x) => x.id === "card-paypal")!;
    assert.equal(rewardsOf(c).amount, 0);
    assert.equal(cardFigures(s, c, "2026-11-05").balance, 10000, "a deposit does not touch the card");
    assert.equal(summarize(s, "2026-11", "es").income, 1200);
    const line = s.months["2026-11"].lines.find((l) => l.id === "rd3")!;
    assert.equal(line.rwCard, "card-paypal"); assert.equal(line.cardId, undefined); assert.equal(line.active, true);
    const e = earningsBySource(s, 2026, "es");
    assert.equal(e.total, 1200, "the deposit is the same money as the earned rewards: counted once");
    assert.equal(e.rewards.minor, 1200);
    assert.equal(e.rewards.months[10], 1200);
    assert.equal(e.sources.find((x) => x.rewards)!.name, "Recompensas de tarjetas");
  });
});
