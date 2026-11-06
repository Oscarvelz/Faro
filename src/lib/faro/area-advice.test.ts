// 1.3.122: Asesor de esta área — pure, read-only, synthetic data only (no real numbers).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { areaMonths, areaReport, idiv, inArea, pctOf, pocketStock, priorAverage, shiftKey, type AreaId } from "./area-advice.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

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
const report = (l: LedgerState, area: AreaId, lang: "es" | "en" = "es") => areaReport(l, KEY, lang, makeNamer(l.structure, lang), area, { today: TODAY });
const pay = (n: number): Row => ["pay", "income-fixed", "Salario", n];
const rent: Row = ["rent", "expense-fixed", "Renta", 90000, "f-casa", "f.casa.renta"];
const months = (n: number, rows: (k: string, i: number) => Row[]) => Object.fromEntries(Array.from({ length: n }, (_, i) => { const k = shiftKey(KEY, i - n + 1); return [k, rows(k, i)]; }));

describe("integer helpers", () => {
  it("idiv rounds half away from zero, 0 on /0", () => {
    assert.equal(idiv(5, 2), 3);
    assert.equal(idiv(-5, 2), -3);
    assert.equal(idiv(4, 3), 1);
    assert.equal(idiv(7, 0), 0);
  });
  it("pctOf is exact and null on a zero base", () => {
    assert.equal(pctOf(25, 200), 13);
    assert.equal(pctOf(1, 0), null);
  });
  it("shiftKey crosses years both ways", () => {
    assert.equal(shiftKey("2026-01", -1), "2025-12");
    assert.equal(shiftKey("2026-12", 1), "2027-01");
    assert.equal(shiftKey(KEY, -5), "2026-05");
  });
});

describe("what belongs to an area", () => {
  const l = ledgerOf({ [KEY]: [pay(300000), rent, ["meta", "expense-fixed", "Meta", 20000, "f-ahorro", "f.ahorro.meta"], ["rem", "expense-fixed", "Mamá", 15000, "f-remesas", "f.remesas.envios"], ["off", "expense-fixed", "Viejo", 999, "f-casa", "", { active: false }]] });
  const lines = l.months[KEY]!.lines;
  const by = (id: string) => lines.find((x) => x.seriesId === id)!;
  it("savings are not Fijos, but are Ahorros and their pocket", () => {
    assert.equal(inArea(l, by("meta"), "fixed"), false);
    assert.equal(inArea(l, by("meta"), "save"), true);
    assert.equal(inArea(l, by("meta"), "meta"), true);
    assert.equal(inArea(l, by("meta"), "retiro"), false);
  });
  it("remittances count in Remesas and in what goes out; inactive lines count nowhere", () => {
    assert.equal(inArea(l, by("rem"), "remit"), true);
    assert.equal(inArea(l, by("rem"), "spend"), true);
    assert.equal(inArea(l, by("off"), "fixed"), false);
    assert.equal(inArea(l, by("pay"), "income"), true);
  });
  it("areaMonths sums each month (oldest first) and priorAverage skips empty months and the current one", () => {
    const m = ledgerOf(months(4, (_k, i) => (i === 1 ? [pay(100000)] : [pay(100000), ["v", "expense-variable", "Café", 1000 * (i + 1), "v-comida"]])));
    const bars = areaMonths(m, KEY, "variable", 4);
    assert.deepEqual(bars.map((b) => b.minor), [1000, 0, 3000, 4000]);
    assert.equal(bars[3]!.key, KEY);
    assert.deepEqual(priorAverage(bars), { avg: 2000, months: 2 });
  });
  it("pocketStock: the latest balance snapshot of a line wins; plain deposits add up", () => {
    const ret = (n: number, bal: number): Row => ["ret", "expense-fixed", "Retiro", n, "f-ahorro", "f.ahorro.retiro", { balanceMinor: bal }];
    const dep: Row = ["dep", "expense-fixed", "Aporte", 2000, "f-ahorro", "f.ahorro.retiro"];
    const m = ledgerOf({ "2026-09": [ret(5000, 50000), dep], [KEY]: [ret(5000, 80000), dep] });
    assert.equal(pocketStock(m, "retiro", "2026-09"), 52000);
    assert.equal(pocketStock(m, "retiro", KEY), 84000);
  });
});

describe("the card's report", () => {
  it("an empty area says one calm sentence and has no findings", () => {
    const r = report(ledgerOf({ [KEY]: [pay(300000), rent] }), "shops");
    assert.equal(r.items.length, 0);
    assert.ok(r.calm.length > 0);
    assert.doesNotMatch(r.calm, /…|\.\.\./);
  });
  it("income below its average is a warning with exact numbers and goes to Ingresos", () => {
    const l = ledgerOf(months(4, (_k, i) => [pay(i === 3 ? 200000 : 300000), rent]));
    const r = report(l, "income");
    const it = r.items.find((x) => x.id === "income-steady");
    assert.ok(it, "income-steady");
    assert.equal(it.tone, "warn");
    assert.match(it.kicker, /−33%/);
    assert.equal(it.go.kind === "line" || it.go.kind === "book" ? it.go.section : "", "income");
    assert.ok(it.act.length > 0);
    assert.equal(r.chart?.type, "bars");
  });
  it("never more than three findings, worst first", () => {
    const l = ledgerOf(months(6, (_k, i) => [pay(i === 5 ? 150000 : 300000), rent, ["v", "expense-variable", "Café", i === 5 ? 90000 : 10000, "v-comida"], ["s", "subscription", "Plan", 1500, "", "", { recurring: true, cadence: "monthly", nextDue: "2026-10-12" }]]));
    for (const a of ["income", "fixed", "variable", "subs", "spend", "central"] as AreaId[]) {
      const r = report(l, a);
      assert.ok(r.items.length <= 3, `${a}: ${r.items.length}`);
      const rank = { bad: 0, warn: 1, calm: 2, good: 3 } as const;
      for (let i = 1; i < r.items.length; i++) assert.ok(rank[r.items[i - 1]!.tone] <= rank[r.items[i]!.tone], `${a} order`);
      for (const x of r.items) assert.ok(x.title && x.num && x.act, `${a}:${x.id} filled`);
    }
  });
  it("retirement contributions that stopped are flagged", () => {
    const l = ledgerOf(months(6, (_k, i) => [pay(300000), ...(i < 3 ? [["ret", "expense-fixed", "Retiro", 6000, "f-ahorro", "f.ahorro.retiro"] as Row] : [])]));
    const it = report(l, "retiro").items.find((x) => x.id === "retiro-paused");
    assert.ok(it, "retiro-paused");
    assert.equal(it.tone, "warn");
  });
  it("remittances well above their average are flagged with the share of income", () => {
    const l = ledgerOf(months(4, (_k, i) => [pay(300000), ["rem", "expense-fixed", "Envío", i === 3 ? 30000 : 15000, "f-remesas", "f.remesas.envios"]]));
    const it = report(l, "remit").items.find((x) => x.id === "remit-up");
    assert.ok(it, "remit-up");
    assert.match(it.kicker, /\+100%/);
    assert.match(it.say, /10%/);
    assert.deepEqual(it.go, { kind: "line", section: "fixed", lineId: `rem-${KEY}` });
    assert.equal(it.act, "Ver la línea");
  });
  it("Ahorros' own note lights its Apartado del mes instead of re-opening Ahorros", () => {
    const l = ledgerOf({ [KEY]: [pay(300000), ["sv", "expense-fixed", "Ahorro", 10000, "f-ahorro", "f.ahorro.meta"]] });
    const it = report(l, "save").items.find((x) => x.id === "save-aside");
    assert.ok(it, "save-aside");
    assert.deepEqual(it.go, { kind: "place", topic: "ahorros", screen: "vault-save", anchor: "desk-aside" });
  });
  it("English reads in English", () => {
    const l = ledgerOf(months(4, (_k, i) => [pay(i === 3 ? 200000 : 300000), rent]));
    const it = report(l, "income", "en").items.find((x) => x.id === "income-steady")!;
    assert.match(it.title, /Less came in/);
    assert.match(it.kicker, /vs average/);
  });
  it("same inputs give the same report (pure)", () => {
    const l = ledgerOf(months(4, (_k, i) => [pay(300000 - i * 1000), rent]));
    assert.deepEqual(report(l, "fixed"), report(l, "fixed"));
  });
});
