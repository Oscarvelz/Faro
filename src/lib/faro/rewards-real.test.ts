// Recompensas: estimado vs real (1.3.155). The estimate is self-contained (his spending × his saved
// rates — the bank is never consulted); the REAL figure is his own note, per card, money only, and the
// latest note replaces the previous. An image read is only a candidate: it becomes a figure when the
// save recipe runs — never before. rewardsMonth's math is not touched by any of this.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { importBook, rewardRealCards, rewardRealRows, rewardsByCard, rewardsMonth, setRewardReal, withBook } from "./bankbook.ts";
import { parseCardShot } from "./cardparse.ts";
import type { Category, LedgerState, Line } from "./types.ts";

const sub = (id: string, name: string) => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0 });
const cat = (id: string, group: "fixed" | "variable", name: string, subs: [string, string][]): Category => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0, group, role: "", subs: subs.map(([a, b]) => sub(a, b)) });
function ledger(): LedgerState {
  return {
    v: 1, revision: 1, updatedAt: "", audit: [], months: {},
    settings: { lang: "es", theme: "claro", display: "USD", rateE4: 366243, rateSource: "", rateAsOf: "", savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {} },
    structure: {
      categories: [cat("v-personales", "variable", "Personales", [["v.p.otros", "Otros"]])],
      purchases: [{ id: "otros", nameKey: "", customName: "Otros", icon: "Package", hidden: false, order: 0 }],
      catalog: [],
    },
  };
}
let seq = 0;
function line(partial: Partial<Line>): Line {
  const id = `m-${++seq}`;
  return {
    id, seriesId: id, monthKey: "2026-10", kind: "expense-variable", concept: "Cena", amountMinor: 10000, currency: "USD",
    active: true, note: "", categoryId: "v-personales", subId: "v.p.otros", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD",
    icon: "", history: [], bookedOn: "2026-10-12", startedOn: "", ...partial,
  };
}
function withLines(state: LedgerState, lines: Line[]): LedgerState {
  const months = { ...state.months };
  for (const l of lines) months[l.monthKey] = { lines: [...(months[l.monthKey]?.lines ?? []), l] };
  return { ...state, months };
}
/** October: Chase dining $100 (3% → $3.00), Wells Fargo $50 at 2% (→ $1.00); a cash line and an income line must never count. */
function october(): LedgerState {
  return withLines(ledger(), [
    line({ sourceId: "acct-chase-card", rc: "dining", amountMinor: 10000 }),
    line({ sourceId: "acct-wf-card", rc: "other", amountMinor: 5000, concept: "Super" }),
    line({ sourceId: "cash", rc: "dining", amountMinor: 7000, concept: "Efectivo" }),
    line({ sourceId: "acct-chase-card", rc: "dining", amountMinor: 99900, kind: "income-variable", concept: "Reembolso raro" }),
    line({ sourceId: "acct-chase-card", rc: "dining", amountMinor: 88800, active: false, concept: "Borrada" }),
  ]);
}
const RATE = 366243;
const note = (s: LedgerState, id: string, amountMinor: number, asOf = "2026-11-02", currency: "USD" | "NIO" = "USD") =>
  withBook(s, (b) => setRewardReal(b, id, { amountMinor, asOf, currency }));

describe("recompensas reales: el dato", () => {
  it("round-trip por el libro: se guarda, se lee igual y convive con payHints", () => {
    const s0 = withBook(october(), (b) => ({ ...b, payHints: { amazon: "acct-paypal" } }));
    const s1 = note(s0, "acct-chase-card", 1234);
    const book = importBook(s1);
    assert.deepEqual(book.rewardReal?.["acct-chase-card"], { amountMinor: 1234, asOf: "2026-11-02", currency: "USD" });
    assert.equal(book.payHints?.amazon, "acct-paypal", "las pistas de pago no se tocan");
  });

  it("la última nota reemplaza a la anterior; otra tarjeta no se mueve", () => {
    let s = note(october(), "acct-chase-card", 1000, "2026-10-01");
    s = note(s, "acct-wf-card", 2500);
    s = note(s, "acct-chase-card", 4321, "2026-11-05");
    const figs = importBook(s).rewardReal!;
    assert.deepEqual(figs["acct-chase-card"], { amountMinor: 4321, asOf: "2026-11-05", currency: "USD" });
    assert.deepEqual(figs["acct-wf-card"], { amountMinor: 2500, asOf: "2026-11-02", currency: "USD" });
  });

  it("la limpieza del libro tira notas mal formadas y conserva las buenas", () => {
    const s = october();
    const dirty = {
      ...s, imports: {
        sources: [], rules: [], maps: {}, rewardReal: {
          "acct-chase-card": { amountMinor: 1234, asOf: "2026-11-02", currency: "USD" },
          "acct-wf-card": { amountMinor: "5820", asOf: "2026-11-02", currency: "USD" },
          "acct-pp-card": { amountMinor: 100, asOf: "ayer", currency: "USD" },
          "acct-x": { amountMinor: 100, asOf: "2026-11-02", currency: "EUR" },
          "acct-y": null,
        },
      },
    } as unknown as LedgerState;
    const figs = importBook(dirty).rewardReal;
    assert.deepEqual(Object.keys(figs ?? {}), ["acct-chase-card"]);
    const allBad = { ...s, imports: { sources: [], rules: [], maps: {}, rewardReal: { a: { amountMinor: Number.NaN, asOf: "2026-11-02", currency: "USD" } } } } as unknown as LedgerState;
    assert.equal(importBook(allBad).rewardReal, undefined);
  });

  it("rewardRealCards lista todas sus tarjetas, con nota o sin ella", () => {
    const rows = rewardRealCards(note(october(), "acct-wf-card", 2500));
    assert.deepEqual(rows.map((r) => r.acct.id), ["acct-chase-card", "acct-wf-card", "acct-pp-card"]);
    assert.equal(rows[0].fig, null);
    assert.equal(rows[1].fig?.amountMinor, 2500);
  });
});

describe("recompensas reales: el estimado por tarjeta y la diferencia", () => {
  it("rewardsByCard suma lo mismo que rewardsMonth, partido por tarjeta", () => {
    const s = october();
    const by = rewardsByCard(s, "2026-10", "USD", RATE);
    assert.deepEqual(by.map((r) => [r.acct.id, r.earned]), [["acct-chase-card", 300], ["acct-wf-card", 100]]);
    assert.equal(by.reduce((a, r) => a + r.earned, 0), rewardsMonth(s, "2026-10", "USD", RATE)!.earned);
  });

  it("sin nota no hay comparación: real y diferencia quedan en null", () => {
    const rows = rewardRealRows(october(), "2026-10", "USD", RATE);
    assert.equal(rows.length, 2);
    for (const r of rows) { assert.equal(r.real, null); assert.equal(r.diff, null); }
  });

  it("la diferencia es Real − Estimado: positiva, negativa y cero", () => {
    let s = note(october(), "acct-chase-card", 500);
    s = note(s, "acct-wf-card", 50);
    let rows = rewardRealRows(s, "2026-10", "USD", RATE);
    assert.equal(rows.find((r) => r.acct.id === "acct-chase-card")!.diff, 200);
    assert.equal(rows.find((r) => r.acct.id === "acct-wf-card")!.diff, -50);
    s = note(s, "acct-chase-card", 300);
    rows = rewardRealRows(s, "2026-10", "USD", RATE);
    assert.equal(rows.find((r) => r.acct.id === "acct-chase-card")!.diff, 0);
  });

  it("una tarjeta sin gasto en el mes pero con nota aparece con estimado 0", () => {
    const rows = rewardRealRows(note(october(), "acct-pp-card", 777), "2026-10", "USD", RATE);
    const pp = rows.find((r) => r.acct.id === "acct-pp-card")!;
    assert.equal(pp.estimated, 0);
    assert.equal(pp.real?.amountMinor, 777);
    assert.equal(pp.diff, 777);
  });

  it("la nota en córdobas se compara convertida a la moneda de vista", () => {
    const s = note(october(), "acct-chase-card", 366243, "2026-11-02", "NIO");
    const row = rewardRealRows(s, "2026-10", "USD", RATE).find((r) => r.acct.id === "acct-chase-card")!;
    assert.equal(row.real?.amountMinor, 10000);
    assert.equal(row.diff, 10000 - 300);
  });

  it("las notas no mueven rewardsMonth: su matemática queda intacta", () => {
    const s = october();
    const before = rewardsMonth(s, "2026-10", "USD", RATE);
    const after = rewardsMonth(note(note(s, "acct-chase-card", 500), "acct-wf-card", 50), "2026-10", "USD", RATE);
    assert.deepEqual(after, before);
  });
});

describe("recompensas reales: la puerta de confirmación", () => {
  const WF_SHOT = `Good morning
WELLS FARGO ACTIVE CASH VISA®
CARD ...9021
$2,045.67
Outstanding balance
$58.20 cash rewards »
Your FICO® Score did not change`;

  it("leer una imagen produce un candidato, no una nota: el libro no cambia hasta Guardar", () => {
    const s = october();
    const [read] = parseCardShot(WF_SHOT, "2026-11-08");
    assert.equal(read.rewardsMinor, 5820, "el candidato existe como dato leído");
    assert.equal(read.issuer, "wellsfargo");
    assert.equal(importBook(s).rewardReal, undefined, "leer no guarda nada");
    // Guardar es la receta del formulario: solo ahí nace la nota, con el monto que él confirmó.
    const saved = note(s, "acct-wf-card", read.rewardsMinor!, "2026-11-08", read.currency);
    assert.deepEqual(importBook(saved).rewardReal?.["acct-wf-card"], { amountMinor: 5820, asOf: "2026-11-08", currency: "USD" });
  });

  it("los puntos nunca son dinero: una pantalla de puntos no produce candidato", () => {
    const [read] = parseCardShot("Chase Freedom\nRewards points\n12,400 points\nBalance $300.00", "2026-11-08");
    assert.equal(read.rewardsMinor, null);
  });
});
