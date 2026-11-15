import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSampleArc, countSampleRows, isPureArcSample, isPureLegacySample, isPureSample, sampleArcLines, stripSample, withAugustSample, withSampleArc } from "./sample.ts";
import { copyRecurring } from "./reducer.ts";
import { createInitial } from "./defaults.ts";
import { summarize } from "./engine.ts";
import { paceReading } from "./patron.ts";
import { duesWindow } from "./dues.ts";
import { savingsStock } from "./savings.ts";
import { loanState } from "./loans.ts";
import { netBalance } from "./debts.ts";
import { rewardsMonth } from "./bankbook.ts";
import type { LedgerState, Line } from "./types.ts";

/* Línea «Windows», 2026-11-13 — Oscar: «Cuando quito los datos de ejemplo, lo desactivo e
   incluso elimino la información, todavía veo información que queda en Tengo y otras
   carpetas… debería quedar como nueva.» Causa: copyRecurring acuña un id nuevo (uid) a
   cada copia arrastrada y solo conserva el seriesId; contar/quitar por id veía únicamente
   los originales de agosto. Estas pruebas fijan la quita por LINAJE (id o seriesId). */

function ownLine(): Line {
  return {
    id: "mio-1", seriesId: "mio-1", monthKey: "2026-11", kind: "income-variable",
    concept: "Mi trabajo", amountMinor: 50000, currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
    balanceCurrency: "NIO", icon: "", history: [],
  };
}

function bookWithCarriedSample(): LedgerState {
  let led = withAugustSample(createInitial("es")).ledger;
  // Los meses ruedan: las recurrentes del ejemplo se arrastran sep → oct → nov.
  for (const [from, to] of [["2026-08", "2026-09"], ["2026-09", "2026-10"], ["2026-10", "2026-11"]] as const) {
    led = copyRecurring(led, from, to).state;
  }
  // Una fila del propio usuario convive en noviembre.
  const nov = led.months["2026-11"] ?? { lines: [] };
  return { ...led, months: { ...led.months, "2026-11": { lines: [...nov.lines, ownLine()] } } };
}

const allLines = (led: LedgerState) => Object.values(led.months).flatMap((m) => m?.lines ?? []);
const clone = (s: LedgerState): LedgerState => JSON.parse(JSON.stringify(s)) as LedgerState;

describe("ejemplo: la quita es por linaje, no por id", () => {
  it("el arrastre de meses deja descendientes con id anónimo y seriesId del ejemplo", () => {
    const led = bookWithCarriedSample();
    const nov = led.months["2026-11"]?.lines ?? [];
    const carried = nov.filter((l) => l.id !== "mio-1");
    assert.ok(carried.length > 0, "noviembre recibió copias del ejemplo");
    assert.ok(carried.every((l) => !l.id.startsWith("demo-ago-")), "las copias ya no llevan el id del ejemplo");
    assert.ok(carried.every((l) => l.seriesId.startsWith("demo-ago-")), "pero conservan su linaje en seriesId");
  });

  it("contar ve originales y descendientes; quitar no deja ni uno y no toca lo del usuario", () => {
    const led = bookWithCarriedSample();
    const total = allLines(led).length;
    assert.equal(countSampleRows(led), total - 1, "la cuenta promete todo lo que la quita va a quitar (menos la fila propia)");
    const clean = stripSample(led);
    const left = allLines(clean);
    assert.deepEqual(left.map((l) => l.id), ["mio-1"], "queda solo la fila del usuario: el libro, como nuevo");
    assert.equal(countSampleRows(clean), 0, "sin resto que la tarjeta vuelva a ofrecer quitar");
  });

  it("tras quitar, el arrastre a diciembre ya no resucita el ejemplo", () => {
    const clean = stripSample(bookWithCarriedSample());
    const dec = copyRecurring(clean, "2026-11", "2026-12").state;
    assert.equal(allLines(dec).filter((l) => l.seriesId.startsWith("demo-ago-")).length, 0);
  });

  it("un libro con solo descendientes NO es 'muestra pura': nada se auto-borra en silencio", () => {
    const led = bookWithCarriedSample();
    const onlyDescendants: LedgerState = { ...led, months: { "2026-11": { lines: (led.months["2026-11"]?.lines ?? []).filter((l) => l.id !== "mio-1") } } };
    assert.equal(isPureSample(onlyDescendants), false, "la auto-quita de carga sigue exigiendo la muestra exacta");
  });

  it("la muestra pura de agosto sigue reconociéndose (la puerta de carga no cambia)", () => {
    const led = withAugustSample(createInitial("es")).ledger;
    assert.equal(isPureSample(led), true);
    assert.equal(isPureLegacySample(led), true);
  });
});

/* 1.3.280 — «El ejemplo habita» (censo faro-sample-study/CENSUS.md). El arco jun→nov es la
 * semilla del modo ejemplo; estas cercas fijan su forma, sus cifras cruzadas (§2.4), la
 * pureza de doble plantilla y la regla de ascenso (§3.3). */

const arc = buildSampleArc(createInitial("es"));
const TODAY = new Date(2026, 10, 14); // el «hoy» del censo

describe("ejemplo 280: la forma del arco", () => {
  it("116 filas jun–nov, linaje demo-ago- en id Y seriesId, sin rest, todas «Muestra»", () => {
    const lines = sampleArcLines();
    assert.equal(lines.length, 116);
    assert.ok(lines.every((l) => l.id.startsWith("demo-ago-") && (l.seriesId ?? "").startsWith("demo-ago-")));
    assert.ok(lines.every((l) => !l.rest));
    assert.ok(lines.every((l) => l.note === "Muestra"));
    assert.equal(new Set(lines.map((l) => l.id)).size, lines.length);
  });

  it("cada fila de salida: cargos fechados que suman EXACTO su importe y bookedOn en su mes", () => {
    const out = sampleArcLines().filter((l) => l.kind.startsWith("expense") || l.kind === "purchase" || l.kind === "subscription");
    assert.ok(out.every((l) => l.history.reduce((s, c) => s + c.amountMinor, 0) === l.amountMinor));
    assert.ok(out.every((l) => !!l.bookedOn && l.bookedOn.startsWith(l.monthKey)));
  });

  it("las colecciones de estado que la semilla vieja nunca escribía", () => {
    assert.equal(arc.cards?.length, 1);
    assert.equal(arc.loans?.length, 1);
    assert.equal(arc.lent?.length, 1);
    assert.equal(arc.people?.length, 1);
    assert.equal(arc.remitPeople?.length, 1);
    assert.equal(arc.settings.widgetPins?.length, 2);
    assert.ok(arc.settings.seeds?.includes("sample-v2"));
  });

  it("la quita por linaje vacía el libro del arco en un gesto", () => {
    assert.equal(countSampleRows(arc), 116);
    const clean = stripSample(arc);
    assert.equal(allLines(clean).length, 0);
    assert.equal(countSampleRows(clean), 0);
  });

  it("el arrastre a diciembre conserva el linaje y la quita lo sigue vaciando", () => {
    const dec = copyRecurring(arc, "2026-11", "2026-12").state;
    assert.ok(countSampleRows(dec) > 116);
    assert.equal(countSampleRows(stripSample(dec)), 0);
  });
});

describe("ejemplo 280: las cifras del censo (§2.4)", () => {
  it("totales por mes — la tabla del censo omitía en octubre el mes de MetroPCS (C$650); manda §2.2", () => {
    const totals: Record<string, [number, number, number]> = {
      "2026-06": [3364100, 2466000, 898100], "2026-07": [3684600, 2536000, 1148600],
      "2026-08": [3818100, 3456000, 362100], "2026-09": [3379100, 3176000, 203100],
      "2026-10": [3992000, 3592900, 399100], "2026-11": [3547600, 3198000, 349600],
    };
    for (const [k, [inc, exp, left]] of Object.entries(totals)) {
      const s = summarize(arc, k, "es");
      assert.deepEqual([s.income, s.expense, s.opportunity], [inc, exp, left], k);
    }
  });

  it("el flujo de ahorro sube 3,900 → 6,400 y los bolsillos aterrizan en 6,300 / 14,700 / 9,900", () => {
    const flow = [390000, 440000, 490000, 540000, 590000, 640000];
    ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"].forEach((k, i) => assert.equal(summarize(arc, k, "es").savingsFlow, flow[i], k));
    const stock = savingsStock(arc, "2026-11");
    assert.equal(stock.total, 3090000);
    assert.equal(stock.series.get("demo-ago-ahorro-meta")?.minor, 630000);
    assert.equal(stock.series.get("demo-ago-ahorro-retiro")?.minor, 1470000);
    assert.equal(stock.series.get("demo-ago-ahorro-emergencia")?.minor, 990000);
  });

  it("el Patrón nace graduado y juzga «on» en agosto (2 meses) y en noviembre (5 meses, 107%)", () => {
    const aug = paceReading(arc, "2026-08", TODAY);
    assert.deepEqual([aug.status, aug.verdict, aug.monthsUsed, aug.spentMinor, aug.expectedMinor], ["ready", "on", 2, 2007500, 2007500]);
    const nov = paceReading(arc, "2026-11", TODAY);
    assert.deepEqual([nov.status, nov.verdict, nov.monthsUsed, nov.spentMinor, nov.expectedMinor], ["ready", "on", 5, 2152500, 2007500]);
  });

  it("los seis vencimientos del censo están en la ventana — y el préstamo a Carlos viaja con ellos", () => {
    const dues = duesWindow(arc, 31, "2026-11-14");
    const has = (kind: string, name: string, on: string, amt: number | null) => dues.some((d) => d.kind === kind && d.name === name && d.on === on && d.amt === amt);
    assert.ok(has("loan", "Banco", "2026-11-15", null), "préstamo");
    assert.ok(has("cuota", "MetroPCS", "2026-11-18", 65000), "MetroPCS");
    assert.ok(has("card", "PayPal Cashback World Mastercard", "2026-11-21", 91561), "tarjeta US$25 al cambio");
    assert.ok(has("cuota", "Google One", "2026-11-25", 12000), "Google One");
    assert.ok(has("cuota", "Tarjetas (tablets)", "2026-12-05", 129900), "Tarjetas");
    assert.ok(has("cuota", "Internet", "2026-12-08", 50000), "Internet");
    assert.ok(has("lent", "Carlos (hermano)", "2026-12-10", 500000), "Carlos, C$5,000 por devolver");
  });

  it("el préstamo devenga interés simple: al 14-nov van dos pagos y quedan C$27,012.05 (el «22,500» del censo era solo principal)", () => {
    const loan = loanState(arc, arc.loans![0], "2026-11-14");
    assert.deepEqual([loan.paid, loan.interest, loan.left], [500000, 201205, 2701205]);
    const nb = netBalance(arc, "2026-11-14");
    assert.equal(nb.lent, 500000, "a Carlos le quedan C$5,000 tras el abono de octubre");
    assert.equal(nb.loans, 2701205);
    assert.equal(nb.cards, 1538221, "el saldo completo de la tarjeta, US$420 al cambio");
  });

  it("las recompensas ganan 70.50 / 74.99 / 43.50 en sep–nov", () => {
    assert.equal(rewardsMonth(arc, "2026-09", "NIO", arc.settings.rateE4)?.earned, 7050);
    assert.equal(rewardsMonth(arc, "2026-10", "NIO", arc.settings.rateE4)?.earned, 7499);
    assert.equal(rewardsMonth(arc, "2026-11", "NIO", arc.settings.rateE4)?.earned, 4350);
  });
});

describe("ejemplo 280: pureza doble y regla de ascenso (§3.3)", () => {
  it("el libro del arco es muestra pura por la plantilla nueva", () => {
    assert.equal(isPureSample(arc), true);
    assert.equal(isPureArcSample(arc), true);
    assert.equal(isPureLegacySample(arc), false);
  });

  it("cualquier edición — una fila, la tarjeta, una fila propia — rompe la pureza del arco", () => {
    const a = clone(arc); a.months["2026-09"].lines[0].amountMinor += 100;
    assert.equal(isPureSample(a), false);
    const b = clone(arc); b.cards = [];
    assert.equal(isPureSample(b), false);
    const c = clone(arc); c.months["2026-11"].lines.push(ownLine());
    assert.equal(isPureSample(c), false);
  });

  it("(d) un namespace fresco recibe el arco directo; (b) con la marca es no-op", () => {
    const fresh = withSampleArc(createInitial("es"));
    assert.equal(fresh.added, true);
    assert.equal(isPureArcSample(fresh.ledger), true);
    assert.equal(withSampleArc(arc).added, false);
  });

  it("(a) la muestra legada pura se reemplaza entera por el arco", () => {
    const legacy = withAugustSample(createInitial("es")).ledger;
    const up = withSampleArc(legacy);
    assert.equal(up.added, true);
    assert.equal(isPureArcSample(up.ledger), true);
    assert.equal(countSampleRows(up.ledger), 116);
  });

  it("(c) la caja de arena editada — de cualquiera de las dos generaciones — queda intacta", () => {
    const sandbox = clone(arc);
    sandbox.settings = { ...sandbox.settings, seeds: (sandbox.settings.seeds ?? []).filter((s) => s !== "sample-v2") };
    sandbox.months["2026-08"].lines[0].amountMinor += 500;
    assert.equal(withSampleArc(sandbox).added, false);
    const playedLegacy = withAugustSample(createInitial("es")).ledger;
    playedLegacy.months["2026-08"].lines[0].concept = "Mi salario";
    assert.equal(withSampleArc(playedLegacy).added, false);
  });
});
