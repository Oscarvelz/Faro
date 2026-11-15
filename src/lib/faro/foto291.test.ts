// Oleada 5 del modelo de ahorros (1.3.291): la foto del widget y la casa de ejemplo.
// Diseño: ~/workspace/faro-savings-model-design/DESIGN.md §4.5, §11, §12 (oleada 5).
//
// La foto: saveTotal NO se redefine — un shell viejo diría la cifra nueva con la
// etiqueta vieja. La foto gana saveKept (Lo guardado) y savePledged (Lo comprometido)
// como campos nuevos, y cada bolsillo gana la naturaleza de su fondo para la luz,
// leída de la MISMA partición de savingsStock (ninguna caminata nueva): un bolsillo
// con dos naturalezas no lleva el campo, el Retiro y las cuentas tampoco.
//
// La casa: el arco v3 declara el modelo — una cuenta real (Lafise) sostiene los
// fondos del saldo (Viaje y Emergencia, amarrados a ella), Casa es aparte, el Retiro
// es el Retiro. La cuenta cubre sus compromisos en CADA mes (nada de dinero falso:
// su Libre nunca es negativo y el piso de emergencia queda cubierto), y la casa pura
// de la generación anterior (arco v2) asciende; la editada jamás se toca.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { cushionOf, keptTotal, libreOf } from "./funds.ts";
import {
  buildSampleArc, isPureArcSample, isPureArcSampleV2, isPureSample, sampleArcCard, sampleArcLent,
  sampleArcLines, sampleArcLinesV2, sampleArcLoan, sampleArcPerson, sampleArcRemitPerson, stripSample,
  withSampleArc, SAMPLE_ACCOUNT_ID, SAMPLE_ARC_PINS,
} from "./sample.ts";
import { savingsStock } from "./savings.ts";
import { buildWidgetSnapshot, savingsOf } from "./widget.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-11";

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: p.id, monthKey: KEY, currency: "USD", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...p,
  };
}

const snapLine = (id: string, subId: string, balanceMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor: balanceMinor, categoryId: "f-ahorro", subId, balanceMinor, bookedOn: "2026-11-02", ...extra });

/** Un libro declarado y mezclado: cuenta $700; Meta con Casa aparte ($300) y Viaje del
 *  saldo ($100); Emergencia del saldo ($200); un fondo sin declarar ($50); Retiro $5,000. */
function mixedBook(): LedgerState {
  const s = createInitial("es", "claro");
  const withSubs = {
    ...s,
    settings: { ...s.settings, display: "USD" as const, rateE4: 366243 },
    structure: {
      ...s.structure,
      categories: s.structure.categories.map((c) => (c.id === "f-ahorro" ? {
        ...c,
        subs: [...c.subs,
          { id: "f.ahorro.colchon", nameKey: "", customName: "Colchón", icon: "Circle", hidden: false, order: 3 },
          { id: "f.ahorro.banco", nameKey: "", customName: "CuentaBanco", icon: "vault:chase", hidden: false, order: 4 }],
      } : c)),
    },
  };
  return {
    ...withSubs,
    months: {
      [KEY]: { lines: [
        snapLine("cta", "f.ahorro.banco", 70000),
        snapLine("casa", "f.ahorro.meta", 30000, { fund: "aparte" }),
        snapLine("viaje", "f.ahorro.meta", 10000, { fund: "saldo", fundHost: "f.ahorro.banco" }),
        snapLine("emerg", "f.ahorro.emergencia", 20000, { fund: "saldo", fundHost: "f.ahorro.banco" }),
        snapLine("colchon", "f.ahorro.colchon", 5000),
        snapLine("retiro", "f.ahorro.retiro", 500000),
      ] },
    },
  };
}

describe("foto 291 — los campos nuevos de la foto (§4.5)", () => {
  const s = mixedBook();
  const snap = buildWidgetSnapshot(s, "es", { today: "2026-11-06", hide: false, lock: false, now: "2026-11-06T12:00:00.000Z" });
  const stock = savingsStock(s, KEY);

  it("saveTotal conserva su significado (bolsas + cuentas); saveKept y savePledged lo parten sin moverlo", () => {
    assert.equal(snap.saveTotal, 635000);
    assert.equal(snap.savePledged, 30000, "Viaje + Emergencia: límites sobre la cuenta, nunca un sumando");
    assert.equal(snap.saveKept, 605000, "Lo guardado: el dinero que existe una sola vez");
    assert.equal(snap.saveKept + snap.savePledged, snap.saveTotal, "partir el total no lo mueve");
    assert.equal(snap.saveKept, keptTotal(stock), "la foto lee la fórmula única de funds, no una caminata propia");
    assert.equal(snap.savePledged, stock.pledged);
    const sv = savingsOf(s, KEY, "es");
    assert.equal(sv.kept, snap.saveKept);
    assert.equal(sv.pledged, snap.savePledged);
  });

  it("cada bolsillo lleva la naturaleza de su fondo; el mezclado, el Retiro y la cuenta, ninguna", () => {
    const byName = new Map(snap.pockets.map((p) => [p.name, p]));
    assert.equal(byName.get("Emergencia")?.fund, "saldo");
    assert.equal(byName.get("Colchón")?.fund, "sin-declarar");
    assert.equal(byName.get("Meta")?.fund, undefined, "Meta mezcla Casa (aparte) y Viaje (saldo): una luz no dice dos verdades");
    assert.equal(byName.get("Meta")?.amt, 40000, "la cifra de la bolsa mezclada sigue siendo la suma de sus fondos");
    assert.equal(byName.get("Retiro")?.fund, undefined, "el Retiro no lleva luz: su naturaleza es su nombre");
    assert.equal(byName.get("CuentaBanco")?.fund, undefined, "la cuenta es la base, no un fondo");
    assert.equal(snap.pockets.reduce((a, p) => a + p.amt, 0), snap.saveTotal, "Σ pockets == saveTotal, como desde 1.3.163");
  });

  it("un libro sin declarar: saveKept == saveTotal y savePledged == 0 — la foto no mueve cifras viejas", () => {
    const plain: LedgerState = { ...s, months: { [KEY]: { lines: [
      snapLine("m", "f.ahorro.meta", 30000), snapLine("r", "f.ahorro.retiro", 500000),
    ] } } };
    const p = buildWidgetSnapshot(plain, "es", { today: "2026-11-06", hide: false, lock: false });
    assert.equal(p.saveTotal, 530000);
    assert.equal(p.saveKept, 530000);
    assert.equal(p.savePledged, 0);
    assert.equal(p.pockets.find((x) => x.name === "Meta")?.fund, "sin-declarar");
  });
});

describe("foto 291 — la casa de ejemplo declara el modelo (§11)", () => {
  const arc = buildSampleArc(createInitial("es"));
  const stock = savingsStock(arc, KEY);

  it("la partición de la casa: cuenta, Casa aparte, Viaje y Emergencia del saldo, Retiro", () => {
    assert.equal(stock.total, 4630000);
    assert.deepEqual(stock.byClass, { cuenta: 1540000, retiro: 1470000, aparte: 375000, saldo: 1245000, "sin-declarar": 0 });
    assert.equal(stock.series.get("demo-ago-cuenta")?.cls, "cuenta");
    assert.equal(stock.series.get("demo-ago-ahorro-casa")?.cls, "aparte");
    assert.equal(stock.series.get("demo-ago-ahorro-viaje")?.cls, "saldo");
    assert.equal(stock.series.get("demo-ago-ahorro-viaje")?.fundHost, SAMPLE_ACCOUNT_ID);
    assert.equal(stock.series.get("demo-ago-ahorro-emergencia")?.cls, "saldo");
    assert.equal(stock.series.get("demo-ago-ahorro-emergencia")?.fundHost, SAMPLE_ACCOUNT_ID);
    assert.equal(stock.series.get("demo-ago-ahorro-retiro")?.cls, "retiro");
    assert.equal(stock.pledgedByHost.get(SAMPLE_ACCOUNT_ID), 1245000, "todo lo comprometido monta sobre la cuenta de la casa");
    assert.equal(keptTotal(stock), 3385000, "Lo guardado de la casa: 15,400 + 3,750 + 14,700");
  });

  it("la cuenta cubre sus compromisos en cada mes: Libre siempre positivo, piso cubierto", () => {
    const libres = [340000, 415000, 405000, 310000, 320000, 295000];
    ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"].forEach((k, i) => {
      assert.equal(libreOf(savingsStock(arc, k), SAMPLE_ACCOUNT_ID), libres[i], k);
    });
    const c = cushionOf(stock);
    assert.equal(c.emergencyFloor, 990000);
    assert.equal(c.floorShortfall, 0, "el piso de emergencia de la casa está cubierto: la frase del piso no nace");
    assert.deepEqual(c.overCommitted, []);
    assert.equal(c.cushion, 1285000, "el colchón: lo libre tras Viaje (15,400 − 2,550)");
  });

  it("la foto de la casa: saveTotal viejo, saveKept y savePledged nuevos, luces por bolsa", () => {
    const snap = buildWidgetSnapshot(arc, "es", { today: "2026-11-14", hide: false, lock: false });
    assert.equal(snap.saveTotal, 4630000);
    assert.equal(snap.saveKept, 3385000);
    assert.equal(snap.savePledged, 1245000);
    const byName = new Map(snap.pockets.map((p) => [p.name, p]));
    assert.equal(byName.get("Emergencia")?.fund, "saldo");
    assert.equal(byName.get("Meta")?.fund, undefined, "la Meta de la casa mezcla Casa y Viaje: sin luz única");
    assert.equal(byName.get("Meta")?.amt, 630000, "la Meta de la casa suma lo de siempre: 6,300");
    assert.equal(byName.get("Lafise")?.amt, 1540000);
    assert.equal(byName.get("Lafise")?.fund, undefined);
    assert.equal(snap.pockets.reduce((a, p) => a + p.amt, 0), snap.saveTotal);
  });

  it("ningún fondo de la casa nace sin declarar y la reconciliación no tiene nada que preguntar", () => {
    assert.equal(stock.undeclared, 0);
    const fundLines = sampleArcLines().filter((l) => l.subId === "f.ahorro.meta" || l.subId === "f.ahorro.emergencia");
    assert.ok(fundLines.length > 0 && fundLines.every((l) => l.fund === "aparte" || l.fund === "saldo"), "todo fondo de Meta y Emergencia nace declarado");
    assert.ok(sampleArcLines().filter((l) => l.fund === "saldo").every((l) => l.fundHost === SAMPLE_ACCOUNT_ID), "todo fondo del saldo monta sobre la cuenta de la casa");
    assert.ok(sampleArcLines().filter((l) => l.subId === "f.ahorro.retiro").every((l) => l.fund === undefined), "el Retiro nunca lleva el campo");
  });
});

/** Un libro de la generación anterior (arco v2) tal como 1.3.290 lo sembraba:
 * las filas v2, las mismas colecciones, la marca v2 y NINGÚN sub de cuenta. */
function v2Book(): LedgerState {
  const base = createInitial("es");
  const months: LedgerState["months"] = {};
  for (const l of sampleArcLinesV2()) (months[l.monthKey] ??= { lines: [] }).lines.push(l);
  return {
    ...base,
    months,
    cards: [sampleArcCard()],
    loans: [sampleArcLoan()],
    lent: [sampleArcLent()],
    people: [sampleArcPerson()],
    remitPeople: [sampleArcRemitPerson()],
    settings: { ...base.settings, widgetPins: SAMPLE_ARC_PINS.map((p) => ({ ...p })), seeds: ["sample-v2"] },
  };
}

describe("foto 291 — pureza de tres plantillas y ascenso de generación", () => {
  const arc = buildSampleArc(createInitial("es"));
  const clone = (s: LedgerState): LedgerState => JSON.parse(JSON.stringify(s)) as LedgerState;

  it("la casa v3 es pura por su plantilla; la v2 se sigue reconociendo por la suya", () => {
    assert.equal(isPureArcSample(arc), true);
    assert.equal(isPureSample(arc), true);
    const v2 = v2Book();
    assert.equal(isPureArcSampleV2(v2), true);
    assert.equal(isPureSample(v2), true);
    assert.equal(isPureArcSample(v2), false, "la casa vieja no se disfraza de la nueva");
  });

  it("la casa pura v2 asciende entera al arco v3; con la marca v3 es no-op", () => {
    const up = withSampleArc(v2Book());
    assert.equal(up.added, true);
    assert.equal(isPureArcSample(up.ledger), true);
    assert.equal(withSampleArc(arc).added, false);
  });

  it("cualquier toque rompe la pureza v3: una fila, o quitar el sub de la cuenta", () => {
    const a = clone(arc); a.months["2026-09"]!.lines[0]!.amountMinor += 100;
    assert.equal(isPureArcSample(a), false);
    const b = clone(arc);
    b.structure = { ...b.structure, categories: b.structure.categories.map((c) => (c.id === "f-ahorro" ? { ...c, subs: c.subs.filter((s) => s.id !== SAMPLE_ACCOUNT_ID) } : c)) };
    assert.equal(isPureArcSample(b), false, "sin su cuenta, la casa ya no es la semilla");
    const c = clone(arc); c.months["2026-11"]!.lines = c.months["2026-11"]!.lines.filter((l) => l.subId !== SAMPLE_ACCOUNT_ID);
    assert.equal(isPureSample(c), false);
  });

  it("la caja de arena v3 editada (sin marcas) queda intacta", () => {
    const sandbox = clone(arc);
    sandbox.settings = { ...sandbox.settings, seeds: (sandbox.settings.seeds ?? []).filter((s) => s !== "sample-v2" && s !== "sample-v3") };
    sandbox.months["2026-08"]!.lines[0]!.amountMinor += 500;
    assert.equal(withSampleArc(sandbox).added, false);
  });

  it("la quita por linaje se lleva también el sub de la cuenta: ni filas ni cadáver", () => {
    const clean = stripSample(arc);
    assert.equal(Object.values(clean.months).flatMap((m) => m?.lines ?? []).length, 0);
    assert.equal(clean.structure.categories.find((c) => c.id === "f-ahorro")?.subs.some((s) => s.id === SAMPLE_ACCOUNT_ID), false);
  });
});
