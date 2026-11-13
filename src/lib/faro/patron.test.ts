// El patrón de ritmo (1.3.248): the pace judgement against the user's own
// learned pattern. Synthetic data only — except the tester's real figures,
// which Oscar supplied from the notification itself (2026-11-12).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pacePattern, paceReading, paceSay } from "./patron.ts";
import { createInitial } from "./defaults.ts";
import { formatMoney } from "./money.ts";
import type { Charge, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-11"; // November 2026: 30 days; the 12th is exactly 40% of the month.
const TODAY = new Date(2026, 10, 12, 12);

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">, key: string): Line {
  return {
    seriesId: p.id, monthKey: key, currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false,
    storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
    balanceCurrency: "USD", icon: "", history: [], ...p, id: `${p.id}-${key}`,
  };
}
const ch = (date: string, amountMinor: number, currency: Charge["currency"] = "USD"): Charge => ({ id: `c-${date}-${amountMinor}`, date, amountMinor, currency, note: "" });
type Row = [string, LineKind, string, number, Partial<Line>?];
function ledgerOf(months: Record<string, Row[]>, display: "USD" | "NIO" = "USD"): LedgerState {
  const l = createInitial("es", "claro");
  l.settings.display = display;
  l.settings.rateE4 = 366243;
  for (const [k, rows] of Object.entries(months)) {
    l.months[k] = { lines: rows.map(([id, kind, concept, amountMinor, extra = {}]) => line({ id, kind, concept, amountMinor, ...extra }, k)) };
  }
  return l;
}

/** A front-loader's month (USD minor): rent day 2, utilities day 4, subs day 6, then a thin variable tail. Total 182000. */
const frontMonth = (k: string): Row[] => [
  ["rent", "expense-fixed", "Renta", 150000, { history: [ch(`${k}-02`, 150000)] }],
  ["util", "expense-fixed", "Servicios", 18000, { history: [ch(`${k}-04`, 18000)] }],
  ["subs", "expense-fixed", "Suscripciones", 2000, { history: [ch(`${k}-06`, 2000)] }],
  ["var", "expense-variable", "Variable", 12000, { history: [ch(`${k}-09`, 3000), ch(`${k}-15`, 3000), ch(`${k}-21`, 3000), ch(`${k}-27`, 3000)] }],
];
const frontHistory = (): Record<string, Row[]> => ({ "2026-08": frontMonth("2026-08"), "2026-09": frontMonth("2026-09"), "2026-10": frontMonth("2026-10") });

describe("el patrón de ritmo — la curva aprendida", () => {
  it("un pagador de inicio de mes tiene su curva cargada al frente: el día 3 ya salió la renta", () => {
    const l = ledgerOf({ ...frontHistory(), [KEY]: frontMonth(KEY) });
    const p = pacePattern(l, KEY);
    assert.ok(p, "hay patrón con tres meses cerrados");
    assert.equal(p.monthsUsed, 3);
    assert.equal(p.typicalTotalMinor, 182000);
    const d3 = p.anchors.find((a) => a.day === 3);
    assert.ok(d3 && d3.sharePct >= 80, `el día 3 el patrón ya lleva ${d3?.sharePct}% fuera (una recta diría 10%)`);
  });

  it("el mes que va como siempre se juzga «on»: ni susto ni premio", () => {
    const l = ledgerOf({ ...frontHistory(), [KEY]: frontMonth(KEY) });
    const r = paceReading(l, KEY, TODAY);
    assert.equal(r.status, "ready");
    assert.equal(r.spentMinor, 173000);
    assert.equal(r.expectedMinor, 173000);
    assert.equal(r.verdict, "on");
    assert.equal(r.projectedMinor, 182000);
  });

  it("si lo fuerte ya salió y falta lo demás, va «under» — y la proyección es la cola de siempre, no una recta", () => {
    const cur = frontMonth(KEY).filter(([id]) => id !== "util"); // servicios aún no se cobran
    const l = ledgerOf({ ...frontHistory(), [KEY]: cur });
    const r = paceReading(l, KEY, TODAY);
    assert.equal(r.spentMinor, 155000);
    assert.equal(r.verdict, "under");
    assert.equal(r.projectedMinor, 164000, "gastado + la cola típica que falta (9000), no gastado ÷ 0.4");
  });

  it("un gasto extra de verdad sí suena: «over» con su delta exacto", () => {
    const cur = frontMonth(KEY);
    cur.push(["big", "purchase", "Compra grande", 30000, { history: [ch(`${KEY}-10`, 30000)] }]);
    const l = ledgerOf({ ...frontHistory(), [KEY]: cur });
    const r = paceReading(l, KEY, TODAY);
    assert.equal(r.verdict, "over");
    assert.equal(r.deltaMinor, 30000);
    assert.equal(paceSay(r, "es", (n) => formatMoney(n, "USD", "es"), null).tone, "warn");
  });

  it("un mes raro no redibuja el patrón: la mediana lo aguanta", () => {
    const freak = frontMonth("2026-07");
    freak.push(["trip", "purchase", "Viaje", 500000, { history: [ch("2026-07-05", 500000)] }]);
    const l = ledgerOf({ "2026-07": freak, ...frontHistory(), [KEY]: frontMonth(KEY) });
    const r = paceReading(l, KEY, TODAY);
    assert.equal(r.monthsUsed, 4);
    assert.equal(r.expectedMinor, 173000, "el mes del viaje no mueve lo esperado a esta fecha");
  });

  it("sin historial no hay juicio: «learning» y veredicto nulo, nunca un invento", () => {
    const one = ledgerOf({ "2026-10": frontMonth("2026-10"), [KEY]: frontMonth(KEY) });
    const r1 = paceReading(one, KEY, TODAY);
    assert.equal(r1.status, "learning");
    assert.equal(r1.verdict, null);
    assert.equal(pacePattern(one, KEY), null);
    const none = ledgerOf({ [KEY]: frontMonth(KEY) });
    assert.equal(paceReading(none, KEY, TODAY).monthsUsed, 0);
    assert.match(paceSay(r1, "es", (n) => formatMoney(n, "USD", "es"), null).say, /aprendiendo tu patrón/);
  });

  it("las líneas sin fecha no doblan la curva: cuentan en ningún lado", () => {
    const jun = frontMonth("2026-10");
    jun.push(["ghost", "expense-fixed", "Sin fecha", 999999, {}]);
    const l = ledgerOf({ "2026-08": frontMonth("2026-08"), "2026-09": frontMonth("2026-09"), "2026-10": jun, [KEY]: frontMonth(KEY) });
    const p = pacePattern(l, KEY);
    assert.equal(p?.typicalTotalMinor, 182000);
  });

  it("sin cargos, el día de bookedOn fecha la línea", () => {
    const booked = (k: string): Row[] => [
      ["rent", "expense-fixed", "Renta", 150000, { bookedOn: `${k}-02` }],
      ["var", "expense-variable", "Variable", 12000, { history: [ch(`${k}-09`, 3000), ch(`${k}-20`, 9000)] }],
    ];
    const l = ledgerOf({ "2026-09": booked("2026-09"), "2026-10": booked("2026-10"), [KEY]: booked(KEY) });
    const r = paceReading(l, KEY, TODAY);
    assert.equal(r.expectedMinor, 153000, "renta del día 2 + variable del día 9, a esta fecha");
    assert.equal(r.verdict, "on");
  });

  it("el dinero apartado no dobla la curva: ni en la historia ni en el mes (la puerta de descanso.ts)", () => {
    // Apartado en DOS meses de historia (para que la mediana no lo esconda) y en el mes en curso.
    const withRest = (k: string): Row[] => [...frontMonth(k), ["rest-big", "purchase", "Apartado", 500000, { rest: true, history: [ch(`${k}-05`, 500000)] }]];
    const cur = frontMonth(KEY);
    cur.push(["rest-cur", "purchase", "Apartado hoy", 30000, { rest: true, history: [ch(`${KEY}-10`, 30000)] }]);
    const l = ledgerOf({ "2026-08": withRest("2026-08"), "2026-09": frontMonth("2026-09"), "2026-10": withRest("2026-10"), [KEY]: cur });
    assert.equal(pacePattern(l, KEY)?.typicalTotalMinor, 182000, "los cargos apartados no entran al mes típico (sin la puerta sería 682000)");
    const r = paceReading(l, KEY, TODAY);
    assert.equal(r.expectedMinor, 173000, "ni a lo esperado para esta fecha (sin la puerta sería 673000)");
    assert.equal(r.spentMinor, 173000, "el cargo apartado del mes en curso no cuenta como gastado");
    assert.equal(r.verdict, "on");
  });
});

describe("el caso del probador, con sus cifras reales (C$, noviembre 2026)", () => {
  // Su notificación del 12-nov: «Vas en C$19,547.59 (46%) y el mes va en 40%.
  // A este ritmo cerrarías en C$48,868.97, sobre tu ingreso de C$42,193.08.»
  // Su patrón aprendido (meses cerrados): renta d2 + remesa d3 + servicios d8
  // = C$24,000 fuera para el día 12; cola típica restante C$7,000; mes típico C$31,000.
  const past = (k: string): Row[] => [
    ["rent", "expense-fixed", "Renta", 1500000, { history: [ch(`${k}-02`, 1500000, "NIO")] }],
    ["remit", "expense-fixed", "Remesa", 500000, { history: [ch(`${k}-03`, 500000, "NIO")] }],
    ["util", "expense-fixed", "Servicios", 400000, { history: [ch(`${k}-08`, 400000, "NIO")] }],
    ["tail", "expense-variable", "Variable", 700000, { history: [ch(`${k}-16`, 300000, "NIO"), ch(`${k}-23`, 400000, "NIO")] }],
  ];
  const l = ledgerOf({
    "2026-08": past("2026-08"), "2026-09": past("2026-09"), "2026-10": past("2026-10"),
    [KEY]: [
      ["pay", "income-fixed", "Salario", 4219308, {}],
      ["rent", "expense-fixed", "Renta", 1500000, { history: [ch(`${KEY}-02`, 1500000, "NIO")] }],
      ["var", "expense-variable", "Variable", 454759, { history: [ch(`${KEY}-05`, 454759, "NIO")] }],
    ],
  }, "NIO");
  const r = paceReading(l, KEY, TODAY);

  it("su gasto a la fecha es el de la notificación: C$19,547.59", () => {
    assert.equal(r.spentMinor, 1954759);
    assert.equal(r.expectedMinor, 2400000, "su patrón para el día 12: C$24,000");
  });

  it("el veredicto se invierte: no va pasado, va BAJO su propio ritmo", () => {
    assert.equal(r.verdict, "under");
    const linear = Math.round(r.spentMinor / 0.4);
    assert.equal(linear, 4886898, "la recta de hoy: C$48,868.97 — sobre su ingreso");
    assert.equal(r.projectedMinor, 2654759, "la proyección del patrón: gastado + su cola típica");
    assert.ok(r.projectedMinor < 4219308, "cierra DENTRO de su ingreso de C$42,193.08");
  });

  it("la frase nombra su comparación y su cierre honesto", () => {
    const { tone, say } = paceSay(r, "es", (n) => formatMoney(n, "NIO", "es"), 4219308);
    assert.equal(tone, "good");
    assert.ok(say.includes(formatMoney(2400000, "NIO", "es")), "dice lo que su patrón suele llevar");
    assert.ok(say.includes("dentro de tu ingreso"), "y que cierra dentro de su ingreso");
    const en = paceSay(r, "en", (n) => formatMoney(n, "NIO", "en"), 4219308);
    assert.ok(en.say.includes("your pattern"), "en inglés también nombra el patrón");
  });
});

describe("el gastador parejo no pierde nada: su patrón ES la recta", () => {
  it("con flujo uniforme, lo esperado a mitad de camino es ~40% y el veredicto es «on»", () => {
    const even = (k: string, dim: number): Row[] => {
      const charges: Charge[] = [];
      for (let d = 3; d <= dim; d += 3) charges.push(ch(`${k}-${String(d).padStart(2, "0")}`, 10000));
      return [["var", "expense-variable", "Variable", charges.length * 10000, { history: charges }]];
    };
    const l = ledgerOf({ "2026-08": even("2026-08", 31), "2026-09": even("2026-09", 30), "2026-10": even("2026-10", 31), [KEY]: even(KEY, 30) });
    const r = paceReading(l, KEY, TODAY);
    assert.equal(r.expectedSharePct, 40);
    assert.equal(r.verdict, "on");
  });
});
