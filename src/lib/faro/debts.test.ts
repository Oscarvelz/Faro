// Deudas in Libros (node --test --experimental-strip-types src/lib/faro/debts.test.ts). Synthetic data only.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { addLoan, payLoan } from "./loans.ts";
import { summarize } from "./engine.ts";
import { addLent, archiveLent, debtSeries, lentOf, lentPays, lentState, moveCobros, netBalance, payLent, payoffPlan, peopleOf, planOrder, simulatePlan } from "./debts.ts";
import type { LedgerState, Loan } from "./types.ts";

const base = (): LedgerState => ({ ...createInitial("es", "claro"), settings: { ...createInitial("es", "claro").settings, display: "NIO" } });
const old = [
  { id: "c1", person: "Ana", kind: "plain", amountMinor: 50_000, currency: "NIO", aprBps: 0, owedOn: "2026-12-01", startedOn: "2026-09-10", note: "", bonuses: [{ id: "b1", date: "2026-10-05", amountMinor: 10_000, note: "" }, { id: "b2", date: "2026-10-20", amountMinor: 5_000, note: "" }] },
  { id: "c2", person: "Luis", kind: "interest", amountMinor: 100_000, currency: "NIO", aprBps: 1200, owedOn: "", startedOn: "2026-08-01", note: "", bonuses: [], archived: true, archivedOn: "2026-10-01", unpaidMinor: 40_000 },
  { id: 7, person: "bad row" },
];

describe("Me deben move (device → ledger)", () => {
  it("moves rows and abonos once, as income lines, keeping balances", () => {
    const r = moveCobros(base(), old);
    assert.equal(r.moved, 2);
    const lent = lentOf(r.ledger);
    assert.equal(lent.length, 2);
    assert.deepEqual(lent.map((l) => l.id).sort(), ["c1", "c2"]);
    const pays = lentPays(r.ledger, "c1");
    assert.equal(pays.length, 2);
    assert.equal(pays[0].kind, "income-variable");
    assert.equal(pays[0].monthKey, "2026-10");
    assert.equal(lentState(r.ledger, lent.find((l) => l.id === "c1")!, "2026-11-04").left, 35_000);
    assert.equal(lent.find((l) => l.id === "c2")!.archived, true);
    assert.equal(lent.find((l) => l.id === "c2")!.unpaidMinor, 40_000);
    // abonos count as money in
    assert.equal(summarize(r.ledger, "2026-10", "es").income >= 15_000, true);
  });
  it("is idempotent: a second run, or a run after archive, adds nothing", () => {
    const a = moveCobros(base(), old).ledger;
    const b = moveCobros(a, old);
    assert.equal(b.moved, 0);
    assert.equal(b.ledger, a);
    const archived = archiveLent(a, "c1", "2026-11-04");
    const dropped = { ...archived, lent: lentOf(archived).filter((l) => l.id !== "c1") };
    assert.equal(moveCobros(dropped, old).moved, 0);
    const lines = Object.values(a.months).flatMap((m) => m.lines).filter((l) => l.lentId);
    assert.equal(lines.length, 2);
  });
  it("ignores empty or broken device data", () => {
    const s = base();
    assert.equal(moveCobros(s, null).ledger, s);
    assert.equal(moveCobros(s, "x").moved, 0);
    assert.equal(moveCobros(s, []).moved, 0);
  });
});

describe("abonar, people, net, series", () => {
  const loan: Loan = { id: "L1", lender: "Banco", who: "entity", kind: "interest", amountMinor: 1_200_000, currency: "NIO", aprBps: 2400, takenOn: "2026-06-01", book: "fixed", note: "" };
  it("abono lowers the balance as a normal line; person history and days since last payment", () => {
    let s = addLent(base(), { id: "A", person: "Ana", kind: "plain", amountMinor: 30_000, currency: "NIO", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
    s = addLent(s, { id: "B", person: " ana ", kind: "plain", amountMinor: 20_000, currency: "NIO", aprBps: 0, startedOn: "2026-10-01", dueOn: "", note: "" });
    s = payLent(s, "A", 10_000, "2026-10-25", "P1", "Abono");
    assert.equal(s.months["2026-10"].lines.find((l) => l.id === "P1")!.kind, "income-variable");
    const people = peopleOf(s, "owed", "2026-11-04");
    assert.equal(people.length, 1);
    assert.equal(people[0].left, 40_000);
    assert.equal(people[0].events.length, 3);
    assert.equal(people[0].days, 10);
    s = addLoan(s, loan);
    const n = netBalance(s, "2026-11-04");
    assert.equal(n.owed, 40_000);
    assert.equal(n.net, n.owed - n.owe);
    assert.equal(n.owe > 1_200_000, true);
  });
  it("6-month series goes down as payments land", () => {
    let s = addLoan(base(), { ...loan, kind: "plain", aprBps: 0 });
    s = payLoan(s, "L1", 400_000, "2026-09-15", "p1", "Pago");
    s = payLoan(s, "L1", 400_000, "2026-10-15", "p2", "Pago");
    const series = debtSeries(s, "2026-11-04");
    assert.equal(series.length, 6);
    assert.deepEqual(series.map((p) => p.key), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    assert.deepEqual(series.map((p) => p.owe), [1_200_000, 1_200_000, 1_200_000, 800_000, 400_000, 400_000]);
  });
});

describe("payoff plan math", () => {
  const debts = [
    { id: "a", name: "Tarjeta", left: 100_000, monthlyInterest: 3_000, aprBps: 3600 },
    { id: "b", name: "Amigo", left: 20_000, monthlyInterest: 0, aprBps: 0 },
    { id: "c", name: "Banco", left: 300_000, monthlyInterest: 2_500, aprBps: 1000 },
  ];
  it("orders avalanche by rate, snowball by balance", () => {
    assert.deepEqual(planOrder(debts, "avalanche").map((d) => d.id), ["a", "c", "b"]);
    assert.deepEqual(planOrder(debts, "snowball").map((d) => d.id), ["b", "a", "c"]);
  });
  it("simulates month by month, avalanche never pays more interest than snowball", () => {
    const av = simulatePlan(debts, 50_000, "avalanche")!;
    const sb = simulatePlan(debts, 50_000, "snowball")!;
    assert.ok(av && sb);
    assert.equal(av.interest <= sb.interest, true);
    // every cent: total paid = balances + interest
    assert.equal(av.months >= Math.ceil((420_000 + av.interest) / 50_000), true);
    assert.equal(av.finish.a < av.finish.c, true);
    assert.equal(sb.finish.b, 1);
  });
  it("single debt, no interest: exact months", () => {
    const r = simulatePlan([{ id: "x", name: "X", left: 100_000, monthlyInterest: 0, aprBps: 0 }], 30_000, "avalanche")!;
    assert.equal(r.months, 4);
    assert.equal(r.interest, 0);
  });
  it("returns null when the budget cannot beat the interest, empty plan when nothing is owed", () => {
    assert.equal(simulatePlan(debts, 2_000, "avalanche"), null);
    assert.equal(simulatePlan(debts, 0, "snowball"), null);
    assert.deepEqual(simulatePlan([], 100, "avalanche"), { months: 0, interest: 0, order: [], finish: {}, interestOf: {}, first: {} });
  });
  it("reads the saved plan from the ledger", () => {
    let s = addLoan(base(), { id: "L1", lender: "Banco", who: "entity", kind: "interest", amountMinor: 1_200_000, currency: "NIO", aprBps: 2400, takenOn: "2026-10-01", book: "fixed", note: "" });
    s = { ...s, debtPlan: { order: "snowball", monthlyMinor: 300_000, currency: "NIO" } };
    const p = payoffPlan(s, "2026-11-01");
    assert.equal(p.order, "snowball");
    assert.equal(p.budget, 300_000);
    assert.equal(p.fromUser, true);
    assert.ok(p.chosen && p.chosen.months >= 5);
    assert.equal(p.first?.id, "L1");
  });
});
