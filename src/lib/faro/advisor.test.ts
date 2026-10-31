import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectLeft, readAdvisor, type Reading } from "./advisor.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { buildAdvice } from "./engine.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = new Date(2026, 9, 22);

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id,
    monthKey: KEY,
    currency: "USD",
    active: true,
    note: "",
    categoryId: "",
    subId: "",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "USD",
    icon: "",
    history: [],
    ...partial,
  };
}

function screenshotLedger(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push(
    { id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 },
    { id: "f.ahorro.chase", nameKey: "f.ahorro.chase", customName: "Chase", icon: "vault:chase", hidden: false, order: 11 },
    { id: "f.ahorro.viajes", nameKey: "f.ahorro.viajes", customName: "Viajes", icon: "Plane", hidden: false, order: 12 },
    { id: "f.ahorro.primerica", nameKey: "f.ahorro.primerica", customName: "Primerica", icon: "Flag", hidden: false, order: 13 },
    { id: "f.ahorro.carro", nameKey: "f.ahorro.carro", customName: "Carro", icon: "Car", hidden: false, order: 14 },
  );
  const rows: Array<[string, LineKind, string, number, string, string]> = [
    ["salario", "income-fixed", "Salario", 57041, "", ""],
    ["negocio", "income-variable", "Negocio propio", 39823, "", ""],
    ["otro-in", "income-variable", "Bono", 7386, "", ""],
    ["casa", "expense-fixed", "Casa", 2457, "f-casa", "f.casa.servicios"],
    ["gas", "expense-fixed", "Gasolina", 4096, "f-transporte", "f.transporte.gasolina"],
    ["funeraria", "expense-fixed", "Funeraria", 1038, "f-familia", "f.familia.funeraria"],
    ["credito", "expense-fixed", "Tarjetas", 3547, "f-creditos", "f.creditos.tarjetas"],
    ["alimentos", "expense-fixed", "Alimentos", 9556, "f-alimentos", "f.alimentos.despensa"],
    ["yt", "subscription", "YouTube", 505, "f-casa", "f.casa.youtube"],
    ["ironman", "purchase", "Ironman", 100000, "f-transporte", ""],
    ["carga", "expense-variable", "Carga", 70000, "v-personales", "v.personales.otros"],
    ["lili", "expense-variable", "Lili", 50000, "v-familia", "v.familia.libros"],
    ["reparacion", "expense-variable", "Reparación", 50000, "v-viajes", "v.viajes.transporte"],
    ["entre", "expense-variable", "Entretenimiento", 45100, "v-entretenimiento", "v.entretenimiento.eventos"],
    ["paypal", "expense-fixed", "PayPal", 129900, "f-ahorro", "f.ahorro.paypal"],
    ["chase", "expense-fixed", "Chase", 200, "f-ahorro", "f.ahorro.chase"],
  ];
  ledger.months[KEY] = {
    lines: rows.map(([id, kind, concept, amountMinor, categoryId, subId]) =>
      line({ id, kind, concept, amountMinor, categoryId, subId, recurring: kind === "subscription" || kind === "expense-fixed" }),
    ),
  };
  ledger.settings.display = "USD";
  ledger.settings.debtGreenPct = 30;
  ledger.settings.emergencyMonths = 3;
  ledger.settings.savingsGoalPct = 20;
  return ledger;
}

function readShot(): Reading {
  const ledger = screenshotLedger();
  return readAdvisor(ledger, KEY, "es", makeNamer(ledger.structure, "es"), { today: TODAY });
}

describe("asesor inteligente", () => {
  it("passes the ten readings on the screenshot month", () => {
    const reading = readShot();
    const near = (n: number | null, want: number) => n !== null && Math.abs(n - want) < 0.15;
    const checks = [
      { id: "1", pass: reading.baseSurplus === 83051 && reading.uniqueMinor === 315100 && reading.transferMinor === 130100 && reading.balanceGap === 0 },
      { id: "2", pass: reading.ironmanMinor === 100000 && reading.gasMinor === 4096 && near(reading.ironmanPct, 95.9) && (reading.splitNote?.includes("Ironman") ?? false) },
      { id: "3", pass: reading.realSpend === 336299 && reading.outTotal === 466399 },
      { id: "4", pass: reading.naiveFixed === 150794 && (reading.classificationError?.includes("error de clasificación") ?? false) },
      { id: "5", pass: reading.recurrentMinor === 21199 && reading.cushionMinor === 63597 && reading.transferMinor / reading.cushionMinor > 1.9 && reading.transferMinor / reading.cushionMinor < 2.2 },
      { id: "6", pass: near(reading.variablePct, 45.3) && near(reading.topSourcePct, 38.2) && reading.incomeFixed === 57041 && reading.topSourceName === "Negocio propio" },
      { id: "7", pass: reading.levers.some((lever) => lever.verb === "Devolver") && reading.levers.some((lever) => lever.verb === "Vender") && !reading.plan.includes("día a día baja") && !reading.headline.includes("día a día baja") },
      { id: "8", pass: near(reading.debtPct, 3.4) && reading.debtTermKnown === false && (reading.creditAsk?.includes("saldo") ?? false) && (reading.creditAsk?.includes("tasa anual") ?? false) && (reading.creditAsk?.includes("pago mínimo") ?? false) },
      { id: "9", pass: reading.pocketAside === 0 && reading.savingsFlow === 130100 && (reading.contradiction?.includes("reconciliar") ?? false) },
      { id: "10", pass: reading.vagueName === "Carga" && reading.vagueMinor === 70000 && near(reading.vaguePct, 67.1) && (reading.vagueQuestion?.includes("¿Qué es Carga") ?? false) },
    ];
    const passed = checks.filter((item) => item.pass).map((item) => item.id);
    const missed = checks.filter((item) => !item.pass).map((item) => item.id);
    assert.deepEqual(missed, [], `passed ${passed.join(",")}`);
    assert.equal(reading.headline.includes("No falló tu gasto diario"), true);
    assert.equal(reading.uniqueCount, 5);
    assert.equal(reading.left, -362149);
    assert.equal(reading.leftIfTransferCovers, -232049);
    assert.equal(reading.lines.filter((item) => item.cls === "unique").every((item) => item.unconfirmed), true);
    assert.equal(reading.plan.includes("5.05"), false);
    assert.equal(/youtube/i.test(reading.plan), false);
    assert.equal(/gasta menos/i.test(reading.plan), false);
    assert.equal(/por doce|× 12|x 12/i.test(reading.plan), false);
    assert.equal(reading.plan.includes("24 horas"), true);
    assert.equal(reading.plan.includes("90 días"), true);
    assert.equal(reading.plan.includes("no subir el pago"), true);
  });

  it("keeps the frozen credit sentence and the honesty phrase", () => {
    const ledger = screenshotLedger();
    const cards = buildAdvice(ledger, KEY, "es", makeNamer(ledger.structure, "es"));
    const medium = cards.find((card) => card.horizon === "medium");
    const long = cards.find((card) => card.horizon === "long");
    assert.ok(medium);
    assert.ok(long);
    assert.equal(medium.meter?.caption.includes("El tope cómodo es 30%"), true);
    assert.equal(medium.points.some((point) => point.value === "No subas el pago"), true);
    assert.equal(long.lead.includes("No es un pronóstico: es la cuenta si nada cambia."), true);
    assert.equal(long.body.includes("día a día baja"), false);
  });

  it("does not invent a reading when income is missing", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.settings.display = "USD";
    ledger.months[KEY] = { lines: [line({ id: "cafe", kind: "expense-variable", concept: "Café", amountMinor: 500, categoryId: "v-hormiga" })] };
    const reading = readAdvisor(ledger, KEY, "es", makeNamer(ledger.structure, "es"), { today: TODAY });
    assert.equal(reading.income, 0);
    assert.equal(reading.variablePct, null);
    assert.equal(reading.debtPct, null);
    assert.equal(Number.isFinite(reading.left), true);
    assert.equal(reading.headline.includes("no tiene ingresos"), true);
    assert.equal(reading.plan.includes("día a día baja"), false);
  });

  it("treats a base-only green month as fine", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.settings.display = "USD";
    ledger.months[KEY] = {
      lines: [
        line({ id: "salario", kind: "income-fixed", concept: "Salario", amountMinor: 100000, recurring: true }),
        line({ id: "casa", kind: "expense-fixed", concept: "Casa", amountMinor: 20000, categoryId: "f-casa", recurring: true }),
      ],
    };
    const reading = readAdvisor(ledger, KEY, "es", makeNamer(ledger.structure, "es"), { today: TODAY });
    assert.equal(reading.tone, "good");
    assert.equal(reading.baseSurplus, 80000);
    assert.equal(reading.uniqueMinor, 0);
    assert.equal(reading.left, 80000);
    assert.equal(reading.plan.includes("día a día baja"), false);
    assert.equal(reading.levers.some((lever) => lever.verb === "Mantener"), true);
  });

  it("labels a first month and names córdobas", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.settings.display = "NIO";
    ledger.months[KEY] = {
      lines: [line({ id: "salario", kind: "income-fixed", concept: "Salario", amountMinor: 10000, currency: "USD", recurring: true })],
    };
    const reading = readAdvisor(ledger, KEY, "es", makeNamer(ledger.structure, "es"), { today: TODAY });
    assert.equal(reading.compareNote.includes("primer mes"), true);
    assert.equal(reading.currency, "NIO");
    assert.equal(reading.headline.startsWith("C$") || reading.alert.includes("C$") || reading.plan.includes("C$"), true);
    assert.equal(projectLeft(reading, "repeat", []), reading.left);
    assert.equal(projectLeft(reading, "base", ["salario"]), reading.baseSurplus);
  });
});
