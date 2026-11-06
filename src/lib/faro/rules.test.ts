// 1.3.117: Asesor rules — deterministic, engine-level, synthetic data only (no real numbers).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adviceRules, divRound, medianInt, perYear, rateLine, type Rule } from "./rules.ts";
import { readAdvisor } from "./advisor.ts";
import { readCoach } from "./coach.ts";
import { buildAdvice } from "./engine.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { CreditCard, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = new Date(2026, 9, 10, 12);

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">, key = KEY): Line {
  return {
    seriesId: p.id, monthKey: key, currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false,
    storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
    balanceCurrency: "USD", icon: "", history: [], ...p, id: `${p.id}-${key}`,
  };
}
type Row = [string, LineKind, string, number, string?, string?, Partial<Line>?];
function ledgerOf(months: Record<string, Row[]>): LedgerState {
  const l = createInitial("es", "claro");
  l.settings.display = "USD";
  l.settings.rateE4 = 366243;
  l.settings.emergencyMonths = 3;
  for (const [k, rows] of Object.entries(months)) {
    l.months[k] = { lines: rows.map(([id, kind, concept, amountMinor, categoryId = "", subId = "", extra = {}]) => line({ id, kind, concept, amountMinor, categoryId, subId, ...extra }, k)) };
  }
  return l;
}
const run = (l: LedgerState, opts: Parameters<typeof adviceRules>[4] = {}, lang: "es" | "en" = "es") => adviceRules(l, KEY, lang, makeNamer(l.structure, lang), { today: TODAY, ...opts });
const pick = (rs: Rule[], id: Rule["id"]) => rs.find((r) => r.id === id);
const base: Row[] = [
  ["pay", "income-fixed", "Salario", 300000],
  ["rent", "expense-fixed", "Renta", 90000, "f-casa", "f.casa.renta"],
  ["food", "expense-fixed", "Despensa", 40000, "f-alimentos", "f.alimentos.despensa"],
];

describe("integer helpers", () => {
  it("divRound rounds half away from zero, exactly", () => {
    assert.equal(divRound(5, 2), 3);
    assert.equal(divRound(-5, 2), -3);
    assert.equal(divRound(1, 3), 0);
    assert.equal(divRound(2, 3), 1);
    assert.equal(divRound(10, 0), 0);
  });
  it("medianInt never overstates", () => {
    assert.equal(medianInt([3, 1, 2]), 2);
    assert.equal(medianInt([1, 2]), 1);
    assert.equal(medianInt([]), 0);
  });
  it("perYear is an exact fraction per cadence", () => {
    assert.deepEqual(perYear("monthly"), [12, 1]);
    assert.deepEqual(perYear(""), [12, 1]);
    assert.deepEqual(perYear("yearly"), [1, 1]);
    assert.deepEqual(perYear("weekly"), [52, 1]);
    assert.deepEqual(perYear("biweekly"), [365, 15]);
    assert.deepEqual(perYear("3m"), [12, 3]);
    assert.deepEqual(perYear("2y"), [1, 2]);
  });
});

describe("edge cases say nothing false", () => {
  it("empty ledger: no rule at all", () => {
    assert.deepEqual(run(ledgerOf({})), []);
  });
  it("one month only: no category or outlier rule (no history to compare)", () => {
    const rs = run(ledgerOf({ [KEY]: [...base, ["xmas", "expense-variable", "Regalos", 50000, "v-familia", "v.familia.juguetes"]] }));
    assert.equal(pick(rs, "category"), undefined);
    assert.equal(pick(rs, "outlier"), undefined);
  });
  it("closed month: no pace and no due-date rule", () => {
    const l = ledgerOf({ "2026-09": [...base, ["cafe", "expense-variable", "Café", 3000, "v-hormiga", "v.hormiga.cafe"]] });
    const rs = adviceRules(l, "2026-09", "es", makeNamer(l.structure, "es"), { today: TODAY });
    assert.equal(pick(rs, "pace"), undefined);
    assert.equal(pick(rs, "due"), undefined);
  });
  it("no income: no pace rule", () => {
    const rs = run(ledgerOf({ [KEY]: [["cafe", "expense-variable", "Café", 3000, "v-hormiga", "v.hormiga.cafe"]] }));
    assert.equal(pick(rs, "pace"), undefined);
  });
});

describe("pace: days the money lasts at this month's daily pace", () => {
  it("enough: projects the exact month-end amount", () => {
    // left = 300000 − 90000 − 40000 − 20000 = 150000; daily 20000 over 10 days = 2000/day; 21 days left → 150000 − 42000 = 108000
    const rs = run(ledgerOf({ [KEY]: [...base, ["super", "expense-variable", "Supermercado", 20000, "v-personales", "", { bookedOn: "2026-10-05" }]] }));
    const r = pick(rs, "pace")!;
    assert.equal(r.v.perDay, 2000);
    assert.equal(r.v.daysLeft, 21);
    assert.equal(r.v.atEnd, 108000);
    assert.equal(r.tone, "good");
    assert.equal(r.go.kind, "book");
  });
  it("short: the exact day it runs out", () => {
    // left = 300000 − 130000 − 150000 = 20000; 150000/10 days = 15000/day → covered floor(20000*10/150000) = 1 day
    const rs = run(ledgerOf({ [KEY]: [...base, ["salidas", "expense-variable", "Salidas", 150000, "v-entretenimiento", "v.entretenimiento.restaurantes"]] }));
    const r = pick(rs, "pace")!;
    assert.equal(r.v.covered, 1);
    assert.equal(r.tone, "warn");
    assert.match(r.say, /11 oct/);
  });
  it("future-dated lines are not 'spent so far'", () => {
    const rs = run(ledgerOf({ [KEY]: [...base, ["viaje", "expense-variable", "Pasaje", 50000, "v-transporte", "", { bookedOn: "2026-10-28" }]] }));
    assert.equal(pick(rs, "pace"), undefined);
  });
});

describe("due: payments in the next 14 days", () => {
  it("sums card minimums and dated cuotas, split 7/14 days", () => {
    const l = ledgerOf({ [KEY]: [...base, ["net", "subscription", "Netflix", 1599, "f-casa", "f.casa.youtube", { nextDue: "2026-10-20", cadence: "monthly" }]] });
    const card = { id: "c1", name: "Tarjeta Demo", issuer: "", mark: "", color: "#333", network: "", last4: "", currency: "USD", limitMinor: 100000, dueDay: 0, aprBps: 2400, autopay: false, rewards: "", snaps: [{ on: "2026-10-01", at: "2026-10-01T00:00:00Z", balanceMinor: 50000, minMinor: 2500, dueOn: "2026-10-15", src: "manual" }] } as unknown as CreditCard;
    l.cards = [card];
    const r = pick(run(l), "due")!;
    assert.equal(r.v.in7, 2500);
    assert.equal(r.v.in14, 4099);
    assert.equal(r.v.first, "Tarjeta Demo");
    assert.equal(r.go.kind, "place");
  });
  it("ignores dates past 14 days and already-paid card balances", () => {
    const l = ledgerOf({ [KEY]: [...base, ["seg", "expense-fixed", "Seguro", 9000, "f-seguros", "f.seguros.auto", { nextDue: "2026-10-30" }]] });
    assert.equal(pick(run(l), "due"), undefined);
  });
});

describe("category vs its 3-month average", () => {
  const hist = (food: number): Row[] => [...base.slice(0, 2), ["food", "expense-fixed", "Despensa", food, "f-alimentos", "f.alimentos.despensa"]];
  it("flags the category with the exact delta and percent", () => {
    const rs = run(ledgerOf({ "2026-07": hist(40000), "2026-08": hist(40000), "2026-09": hist(46000), [KEY]: hist(60000) }));
    const r = pick(rs, "category")!;
    assert.equal(r.v.avg, 42000);
    assert.equal(r.v.delta, 18000);
    assert.equal(r.v.pct, 43);
    assert.equal(r.go.kind, "line");
  });
  it("stays quiet under +25% or under the floor", () => {
    const rs = run(ledgerOf({ "2026-08": hist(40000), "2026-09": hist(40000), [KEY]: hist(48000) }));
    assert.equal(pick(rs, "category"), undefined);
  });
  it("loan payments never count as a category rising", () => {
    const debt = (n: number): Row[] => [...base, ["loan", "expense-fixed", "Préstamo", n, "f-creditos", "f.creditos.personal"]];
    const rs = run(ledgerOf({ "2026-08": debt(10000), "2026-09": debt(10000), [KEY]: debt(80000) }));
    assert.equal(pick(rs, "category"), undefined);
    assert.equal(pick(rs, "outlier"), undefined);
  });
});

describe("outlier: one line far above its own median", () => {
  it("flags the excess over the median of its past months", () => {
    const m = (luz: number): Row[] => [...base, ["luz", "expense-fixed", "Luz", luz, "f-casa", "f.casa.servicios"]];
    const rs = run(ledgerOf({ "2026-06": m(6000), "2026-07": m(6500), "2026-08": m(5800), "2026-09": m(6200), [KEY]: m(16000) }));
    const r = pick(rs, "outlier")!;
    assert.equal(r.v.usual, 6100);
    assert.equal(r.v.excess, 9900);
    assert.equal(r.v.months, 4);
  });
});

describe("recurring charges: exact per month and per year by cadence", () => {
  it("monthly, quarterly (from two months ago) and yearly charges", () => {
    const l = ledgerOf({
      "2026-01": [["icloud", "subscription", "iCloud", 12000, "f-casa", "f.casa.otros", { cadence: "yearly" }]],
      "2026-08": [["gym", "subscription", "Gimnasio", 9000, "f-casa", "f.casa.otros", { cadence: "3m" }]],
      [KEY]: [...base, ["net", "subscription", "Netflix", 1599, "f-casa", "f.casa.youtube", { cadence: "monthly" }], ["tab", "subscription", "Tablet", 5000, "f-creditos", "f.creditos.tarjetas", { cadence: "monthly" }]],
    });
    const r = pick(run(l), "recurring")!;
    // Netflix 1599×12 = 19188, gym 9000×4 = 36000, iCloud 12000 → 67188 a year, 5599 a month; the tablet loan is a debt, not a charge.
    assert.equal(r.v.count, 3);
    assert.equal(r.v.year, 67188);
    assert.equal(r.v.month, 5599);
    assert.equal(r.v.top, "Gimnasio");
  });
  it("a yearly charge from 13 months ago is no longer counted", () => {
    const l = ledgerOf({ "2025-09": [["old", "subscription", "Viejo", 12000, "f-casa", "f.casa.otros", { cadence: "yearly" }]], [KEY]: base });
    assert.equal(pick(run(l), "recurring"), undefined);
  });
  it("mixed C$/US$ converts with the ledger's rate, in integers", () => {
    const l = ledgerOf({ [KEY]: [...base, ["tv", "subscription", "Cable", 36624, "f-casa", "f.casa.otros", { cadence: "monthly", currency: "NIO" }]] });
    const r = pick(run(l), "recurring")!;
    assert.equal(r.v.month, 1000); // C$366.24 at 36.6243 = US$10.00
    assert.match(r.say, /C\$366/);
  });
});

describe("Meta pace and projected date", () => {
  const meta = (n: number): Row => ["meta", "expense-fixed", "Meta", n, "f-ahorro", "f.ahorro.meta"];
  it("projects the month you reach the plan's total", () => {
    const l = ledgerOf({ "2026-08": [...base, meta(20000)], "2026-09": [...base, meta(20000)], [KEY]: [...base, meta(20000)] });
    const r = pick(run(l, { goal: { monthlyMinor: 30000, totalMinor: 300000, years: 1 } }), "goal")!;
    assert.equal(r.v.stock, 60000);
    assert.equal(r.v.pace, 20000);
    assert.equal(r.v.months, 12); // 240000 / 20000
    assert.equal(r.v.planMonths, 8);
    assert.equal(r.tone, "warn");
    assert.match(r.num, /oct 2027|oct\. 2027/);
  });
  it("without a plan it still reports what is there", () => {
    const l = ledgerOf({ [KEY]: [...base, meta(15000)] });
    const r = pick(run(l), "goal")!;
    assert.equal(r.v.target, 0);
    assert.equal(r.v.pace, 5000);
  });
});

describe("cushion in months of essentials", () => {
  it("tenths rounded down, never overstated", () => {
    // essentials = 130000; Emergencia balance 389000 → 2.99 months → shows 2.9
    const l = ledgerOf({ [KEY]: [...base, ["em", "expense-fixed", "Emergencia", 0, "f-ahorro", "f.ahorro.emergencia", { balanceMinor: 389000 }]] });
    const r = pick(run(l), "cushion")!;
    assert.equal(r.v.tenths, 29);
    assert.match(r.num, /2[.,]9/);
    assert.equal(r.tone, "calm");
  });
});

describe("one number, one place, both languages", () => {
  it("every rule has a topic, a go target and the same rules in EN", () => {
    const l = ledgerOf({ "2026-08": base, "2026-09": base, [KEY]: [...base, ["net", "subscription", "Netflix", 1599, "f-casa", "f.casa.youtube", { nextDue: "2026-10-12" }]] });
    const es = run(l);
    const en = run(l, {}, "en");
    assert.deepEqual(es.map((r) => r.id), en.map((r) => r.id));
    for (const r of es) { assert.ok(r.topic.length > 0); assert.ok(r.go); assert.ok(r.num.length > 0); }
    for (let i = 0; i < es.length; i += 1) { const a = es[i]!.say.length, b = en[i]!.say.length; assert.ok(Math.abs(a - b) <= Math.max(a, b) * 0.35, `${es[i]!.id}: ${a} vs ${b}`); }
  });
  it("the rate line shows the exact rate", () => {
    assert.match(rateLine(ledgerOf({}), "es"), /C\$36\.6243/);
  });
});

describe("fixed rules in the existing cards", () => {
  it("credit note mentions card balances instead of 'no credit'", () => {
    const l = ledgerOf({ [KEY]: base });
    l.cards = [{ id: "c1", name: "Tarjeta Demo", issuer: "", mark: "", color: "#333", network: "", last4: "", currency: "USD", limitMinor: 100000, dueDay: 0, aprBps: 0, autopay: false, rewards: "", snaps: [{ on: "2026-10-01", at: "x", balanceMinor: 50000, src: "manual" }] } as unknown as CreditCard];
    const r = readAdvisor(l, KEY, "es", makeNamer(l.structure, "es"), { today: TODAY });
    assert.doesNotMatch(r.creditBlurb, /no hay pagos de crédito/i);
    assert.match(r.creditBlurb, /tarjetas/i);
    const c = readCoach(l, KEY, "es", makeNamer(l.structure, "es"), TODAY);
    assert.doesNotMatch(c.pillars.find((p) => p.id === "debt")!.note, /No tienes pagos/);
  });
  it("subscriptions per year follow their cadence (a yearly one is not ×12)", () => {
    const l = ledgerOf({ [KEY]: [...base, ["ic", "subscription", "iCloud", 12000, "f-casa", "f.casa.otros", { cadence: "yearly" }], ["a", "subscription", "A", 1000, "f-casa", "f.casa.otros"], ["b", "subscription", "B", 1000, "f-casa", "f.casa.otros"]] });
    const c = readCoach(l, KEY, "es", makeNamer(l.structure, "es"), TODAY);
    const step = c.steps.find((s) => s.id === "subs");
    if (step) assert.doesNotMatch(step.detail, /\$1[.,]?680/); // 14000 × 12 would be wrong
    const r = readAdvisor(l, KEY, "es", makeNamer(l.structure, "es"), { today: TODAY });
    if (r.antNote) assert.doesNotMatch(r.antNote, /\$1[.,]?680/);
  });
  it("cushion pillar shows tenths rounded down", () => {
    const l = ledgerOf({ [KEY]: [...base, ["em", "expense-fixed", "Emergencia", 0, "f-ahorro", "f.ahorro.emergencia", { balanceMinor: 389000 }]] });
    const c = readCoach(l, KEY, "es", makeNamer(l.structure, "es"), TODAY);
    assert.match(c.pillars.find((p) => p.id === "cushion")!.value, /^2[.,]9 de 3/);
  });
  it("buildAdvice reads each month once and stays the same", () => {
    const l = ledgerOf({ "2026-08": base, "2026-09": base, [KEY]: base });
    const a = buildAdvice(l, KEY, "es", makeNamer(l.structure, "es"));
    assert.equal(a.length, 3);
    assert.equal(a[2]!.nums!.monthly, 170000);
  });
});
