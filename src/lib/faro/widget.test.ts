// Android widget snapshot (1.3.121): the numbers must be the ones Central and Libros show. Synthetic data only.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { categorySlices, summarize } from "./engine.ts";
import { netBalance, addLent } from "./debts.ts";
import { addLoan } from "./loans.ts";
import { addReading, putCard, cardsOf } from "./cards.ts";
import { buildWidgetSnapshot, savingsOf, shiftKey, widgetHide } from "./widget.ts";
import type { Line, LedgerState } from "./types.ts";

const TODAY = "2026-11-06";
const line = (p: Partial<Line> & Pick<Line, "id" | "kind" | "amountMinor" | "monthKey">): Line => ({
  seriesId: p.id, concept: p.id, currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false,
  storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
  balanceCurrency: "USD", icon: "", history: [], ...p,
});

function ledger(): LedgerState {
  const init = createInitial("es", "tron");
  let s: LedgerState = { ...init, settings: { ...init.settings, display: "USD", rateE4: 366243, savingsGoalPct: 10 } };
  const nov: Line[] = [
    line({ id: "sueldo", kind: "income-fixed", amountMinor: 320000, monthKey: "2026-11" }),
    line({ id: "extra", kind: "income-variable", amountMinor: 1000000, currency: "NIO", monthKey: "2026-11" }),
    line({ id: "renta", kind: "expense-fixed", amountMinor: 95000, categoryId: "f-casa", subId: "f.casa.renta", monthKey: "2026-11" }),
    line({ id: "super", kind: "expense-variable", amountMinor: 42050, categoryId: "v-casa", monthKey: "2026-11" }),
    line({ id: "meta", kind: "expense-fixed", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.meta", monthKey: "2026-11" }),
    line({ id: "retiro", kind: "expense-fixed", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.retiro", balanceMinor: 510000, monthKey: "2026-11" }),
    line({ id: "netflix", kind: "subscription", amountMinor: 1599, nextDue: "2026-11-09", monthKey: "2026-11" }),
    line({ id: "gym", kind: "subscription", amountMinor: 2500, nextDue: "2026-11-02", monthKey: "2026-11" }),
    line({ id: "seguro", kind: "subscription", amountMinor: 9000, nextDue: "2027-01-20", monthKey: "2026-11" }),
    line({ id: "off", kind: "expense-variable", amountMinor: 99999, active: false, monthKey: "2026-11" }),
  ];
  const oct: Line[] = [
    line({ id: "o-sueldo", kind: "income-fixed", amountMinor: 300000, monthKey: "2026-10" }),
    line({ id: "o-renta", kind: "expense-fixed", amountMinor: 95000, categoryId: "f-casa", monthKey: "2026-10" }),
    line({ id: "o-super", kind: "expense-variable", amountMinor: 50000, categoryId: "v-casa", monthKey: "2026-10" }),
  ];
  s = { ...s, months: { "2026-10": { lines: oct }, "2026-11": { lines: nov } } };
  s = addLoan(s, { id: "ln", lender: "Banco", who: "entity", kind: "plain", amountMinor: 150000, currency: "USD", aprBps: 0, takenOn: "2026-09-01", book: "fixed", note: "" });
  s = addLent(s, { id: "le", person: "Ana", kind: "plain", amountMinor: 1840000, currency: "NIO", aprBps: 0, startedOn: "2026-10-01", dueOn: "2026-12-01", note: "" });
  s = addReading(s, "card-paypal", { balanceMinor: 42000, availMinor: 158000, minMinor: 3500, dueOn: "2026-11-15", src: "shot", on: "2026-11-02" }, "2026-11-02");
  s = putCard(s, { ...cardsOf(s).find((c) => c.id === "card-paypal")!, last4: "4321" });
  return s;
}

describe("widget snapshot", () => {
  const s = ledger();
  const snap = buildWidgetSnapshot(s, "es", { today: TODAY, hide: false, lock: false, now: "2026-11-06T12:00:00.000Z" });
  const sum = summarize(s, "2026-11", "es");

  it("Central's numbers: Tengo, Gastaré, Queda, Usado, Pagos", () => {
    assert.equal(snap.have, sum.income);
    assert.equal(snap.spend, sum.expense);
    assert.equal(snap.left, sum.opportunity);
    assert.equal(snap.left, snap.have - snap.spend);
    assert.equal(snap.usedPct, Math.round(sum.spentPct!));
    assert.equal(snap.pay, sum.debt);
    assert.equal(snap.tone, sum.tone);
    // C$10,000 at 36.6243 = $273.04; inactive lines never count.
    assert.equal(snap.have, 320000 + 27304);
    assert.equal(Number.isInteger(snap.have) && Number.isInteger(snap.spend) && Number.isInteger(snap.left), true);
  });

  it("the scale: Me deben · Debo as Libros shows it", () => {
    const nb = netBalance(s, TODAY);
    assert.equal(snap.owed, nb.owed);
    assert.equal(snap.owe, nb.owe);
    assert.equal(snap.owe, 150000 + 42000);
  });

  it("savings: month flow and goal from summarize, total as Central's Ahorros band", () => {
    assert.equal(snap.saveMonth, sum.savingsFlow);
    assert.equal(snap.saveGoal, sum.savingsGoal);
    const sv = savingsOf(s, "2026-11", "es");
    assert.equal(snap.saveTotal, sv.total);
    // Meta adds its amount, Retiro its balance (balanceMinor wins), like the band.
    assert.equal(snap.saveTotal, 30000 + 510000);
    assert.deepEqual(snap.pockets.map((p) => p.go), ["vault-meta", "vault-retiro"]);
  });

  it("dues: overdue cuota first, cards with their minimum, nothing past 31 days", () => {
    assert.deepEqual(snap.dues.map((d) => [d.name, d.on, d.amt, d.go]), [
      ["gym", "2026-11-02", 2500, "pagos"],
      ["netflix", "2026-11-09", 1599, "pagos"],
      ["PayPal", "2026-11-15", 3500, "vault-loans"],
    ]);
  });

  it("dues: a card past its bank due date still shows, with its minimum", () => {
    const init = createInitial("es", "tron");
    let s2: LedgerState = { ...init, settings: { ...init.settings, display: "USD", rateE4: 366243 } };
    // The bank said "due Nov 1"; on Nov 6 the balance is still unpaid — the widget must not lose the card.
    s2 = addReading(s2, "card-paypal", { balanceMinor: 42000, availMinor: 158000, minMinor: 3500, dueOn: "2026-11-01", src: "shot", on: "2026-10-28" }, "2026-10-28");
    const snap2 = buildWidgetSnapshot(s2, "es", { today: TODAY, hide: false, lock: false });
    const card = snap2.dues.find((d) => d.kind === "card");
    assert.ok(card);
    assert.equal(card.amt, 3500);
    assert.equal(card.go, "vault-loans");
  });

  it("categories match Estudio, with last month beside each", () => {
    const names = makeNamer(s.structure, "es");
    const now = categorySlices(s, "2026-11", names, "es");
    const prev = new Map(categorySlices(s, "2026-10", names, "es").map((x) => [x.id, x.minor]));
    assert.deepEqual(snap.cats.map((c) => c.amt), now.slice(0, 5).map((x) => x.minor));
    assert.deepEqual(snap.cats.map((c) => c.prev), now.slice(0, 5).map((x) => prev.get(x.id) ?? 0));
    assert.equal(snap.cats.find((c) => c.save)?.go, "vault-save");
  });

  it("six months of flow, this month last, same as summarize per month", () => {
    assert.deepEqual(snap.flow.map((f) => f.key), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    const oct = summarize(s, "2026-10", "es");
    assert.deepEqual([snap.flow[4].inn, snap.flow[4].out], [oct.income, oct.expense]);
    assert.deepEqual([snap.flow[5].inn, snap.flow[5].out], [sum.income, sum.expense]);
    assert.equal(snap.monthLabel, "Noviembre");
    assert.equal(shiftKey("2026-01", -1), "2025-12");
  });

  it("privacy: no card digits, no people, no notes in the snapshot", () => {
    const text = JSON.stringify(snap);
    assert.equal(text.includes("4321"), false);
    assert.equal(text.includes("Ana"), false);
    assert.equal(text.includes("Banco"), false);
  });

  it("hide amounts: own choice wins, otherwise it follows the fingerprint lock", () => {
    assert.equal(widgetHide(null, true), true);
    assert.equal(widgetHide(null, false), false);
    assert.equal(widgetHide("0", true), false);
    assert.equal(widgetHide("1", false), true);
  });
});
