// Oleada 3 del modelo de ahorros (1.3.289): los dos totales en la cara. Lo que se
// cerca aquí es la aritmética que la banda y el libro leen, nada de píxeles:
//  - el titular «Lo guardado» (keptTotal) cuenta cada dinero que existe UNA vez —
//    cuentas, aparte, Retiro y lo sin declarar leyéndose como pila — y un fondo del
//    saldo NUNCA suma: su dinero ya es el saldo de su anfitriona;
//  - «Lo comprometido» (stock.pledged) existe si y solo si hay fondos del saldo, y
//    jamás entra en el titular: keptTotal + pledged = total, siempre;
//  - para un libro SIN declaraciones, keptTotal vale exactamente el titular de
//    1.3.288 (la suma de bolsas + cuentas de siempre): la paridad A/B de la oleada;
//  - la puerta de la segunda figura del libro son los fondos aparte DECLARADOS
//    (byClass.aparte), nunca lo sin declarar;
//  - el Libre por cuenta (libreOf) y el mostrado (freeShown) pueden salir
//    negativos y se dicen tal cual;
//  - segmentAgg reparte la partición por segmento: las bóvedas visibles se saltan,
//    una cuenta escondida cae en «rest» como pila, y los anfitriones del saldo se
//    recogen; asideSplit parte el Apartado en dos lecturas que suman el total.
// Diseño: ~/workspace/faro-savings-model-design/DESIGN.md §3, §4.1, §4.2, §12.3.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { asideSplit, declareSeries, freeShown, keptTotal, libreOf, segmentAgg } from "./funds.ts";
import { translate } from "./i18n.ts";
import { savingsStock } from "./savings.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-11";

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: p.id, monthKey: KEY, currency: "USD", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...p,
  };
}

function base(): LedgerState {
  const s = createInitial("es", "claro");
  return {
    ...s,
    settings: { ...s.settings, display: "USD", rateE4: 366243 },
    structure: {
      ...s.structure,
      categories: s.structure.categories.map((c) => c.id === "f-ahorro" ? { ...c, subs: [...c.subs,
        { id: "f.ahorro.viaje", nameKey: "f.ahorro.viaje", customName: "Viaje", icon: "Circle", hidden: false, order: 3 },
        { id: "f.ahorro.extra", nameKey: "f.ahorro.extra", customName: "Colchón", icon: "Circle", hidden: false, order: 4 },
        { id: "f.ahorro.banco", nameKey: "f.ahorro.banco", customName: "CuentaBanco", icon: "vault:chase", hidden: false, order: 5 },
        { id: "f.ahorro.banco2", nameKey: "f.ahorro.banco2", customName: "CuentaDos", icon: "vault:boa", hidden: false, order: 6 }] } : c),
    },
  };
}

const dep = (id: string, subId: string, amountMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor, categoryId: "f-ahorro", subId, bookedOn: "2026-11-03", ...extra });
const snap = (id: string, subId: string, balanceMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor: balanceMinor, categoryId: "f-ahorro", subId, balanceMinor, bookedOn: "2026-11-02", ...extra });

/** El libro mixto de la oleada: una cuenta de 700 con un fondo Meta del saldo de 250
 *  viviendo sobre ella, una Emergencia aparte de 200, Retiro de 500 y un fondo sin
 *  declarar de 300. */
function mixed(): LedgerState {
  const s = base();
  const raw: LedgerState = {
    ...s,
    months: {
      "2026-10": { lines: [dep("v-oct", "f.ahorro.viaje", 10000, { monthKey: "2026-10", seriesId: "serie-viaje", bookedOn: "2026-10-05" })] },
      "2026-11": { lines: [
        dep("v-nov", "f.ahorro.viaje", 15000, { seriesId: "serie-viaje" }),
        dep("e-nov", "f.ahorro.emergencia", 20000, { seriesId: "serie-emerg" }),
        dep("x-nov", "f.ahorro.extra", 30000, { seriesId: "serie-extra" }),
        snap("b-nov", "f.ahorro.banco", 70000, { seriesId: "f.ahorro.banco" }),
        snap("r-nov", "f.ahorro.retiro", 50000, { seriesId: "serie-retiro" }),
      ] },
    },
  };
  const withSaldo = declareSeries(raw, "serie-viaje", "saldo", "f.ahorro.banco");
  return declareSeries(withSaldo, "serie-emerg", "aparte");
}

/** El mismo libro sin declarar nada: el mundo de 1.3.288. */
function undeclared(): LedgerState {
  const s = base();
  return {
    ...s,
    months: {
      "2026-11": { lines: [
        dep("v-nov", "f.ahorro.viaje", 25000, { seriesId: "serie-viaje" }),
        dep("e-nov", "f.ahorro.emergencia", 20000, { seriesId: "serie-emerg" }),
        dep("x-nov", "f.ahorro.extra", 30000, { seriesId: "serie-extra" }),
        snap("b-nov", "f.ahorro.banco", 70000, { seriesId: "f.ahorro.banco" }),
        snap("r-nov", "f.ahorro.retiro", 50000, { seriesId: "serie-retiro" }),
      ] },
    },
  };
}

describe("totales289: el titular cuenta cada dinero una sola vez (§3, §4.1)", () => {
  it("la partición del libro mixto y su titular: el saldo nunca suma", () => {
    const st = savingsStock(mixed(), KEY);
    assert.equal(st.byClass.cuenta, 70000);
    assert.equal(st.byClass.saldo, 25000);
    assert.equal(st.byClass.aparte, 20000);
    assert.equal(st.byClass.retiro, 50000);
    assert.equal(st.byClass["sin-declarar"], 30000);
    assert.equal(st.total, 195000);
    // Lo guardado: cuentas + aparte + Retiro + la pila sin declarar. Los 250 del
    // saldo NO están: ya viven dentro de los 700 de la cuenta.
    assert.equal(keptTotal(st), 170000);
    assert.equal(keptTotal(st), st.byClass.cuenta + st.byClass.aparte + st.byClass.retiro + st.undeclared);
    assert.equal(keptTotal(st) + st.pledged, st.total, "titular + comprometido = total, sin residuo");
  });

  it("declarar el fondo sin declarar como SALDO baja el titular; como APARTE no lo mueve", () => {
    const before = savingsStock(mixed(), KEY);
    const asSaldo = savingsStock(declareSeries(mixed(), "serie-extra", "saldo", "f.ahorro.banco"), KEY);
    assert.equal(keptTotal(asSaldo), keptTotal(before) - 30000, "su dinero pasa a ser el saldo: deja de sumar aparte");
    assert.equal(asSaldo.pledged, before.pledged + 30000);
    const asAparte = savingsStock(declareSeries(mixed(), "serie-extra", "aparte"), KEY);
    assert.equal(keptTotal(asAparte), keptTotal(before), "aparte ya sumaba como pila: la cifra no se mueve");
    assert.equal(asAparte.byClass.aparte, before.byClass.aparte + 30000);
  });

  it("lo comprometido existe si y solo si hay fondos del saldo, y nunca se suma", () => {
    const st = savingsStock(mixed(), KEY);
    assert.ok(st.pledged > 0);
    assert.equal(st.pledgedByHost.get("f.ahorro.banco"), 25000);
    const plain = savingsStock(undeclared(), KEY);
    assert.equal(plain.pledged, 0, "sin fondos del saldo no hay segunda lectura");
    assert.equal(keptTotal(plain), plain.total);
  });
});

describe("totales289: la paridad con 1.3.288 para el libro sin declarar", () => {
  it("keptTotal vale el titular de siempre: bolsas + cuentas, calculado a mano", () => {
    const st = savingsStock(undeclared(), KEY);
    const pocketsByHand = 25000 + 20000 + 30000 + 50000; // viaje + emergencia + extra + retiro
    const accountsByHand = 70000;
    assert.equal(keptTotal(st), pocketsByHand + accountsByHand);
    assert.equal(freeShown(st, accountsByHand), accountsByHand, "sin comprometido, todo el saldo se lee libre");
  });

  it("la puerta de la segunda figura son los aparte DECLARADOS, no la pila", () => {
    const plain = savingsStock(undeclared(), KEY);
    assert.equal(plain.byClass.aparte, 0, "sin declarar no hay figura compuesta, aunque haya dinero");
    assert.ok(plain.undeclared > 0);
    const st = savingsStock(mixed(), KEY);
    assert.ok(st.byClass.aparte > 0, "con un fondo aparte declarado, la cabecera compone");
  });
});

describe("totales289: el Libre (§3)", () => {
  it("por cuenta y en el panel: saldo menos su comprometido", () => {
    const st = savingsStock(mixed(), KEY);
    assert.equal(libreOf(st, "f.ahorro.banco"), 70000 - 25000);
    assert.equal(freeShown(st, 70000), 45000);
  });

  it("negativo se muestra y se dice: un límite mayor que el saldo", () => {
    const s = base();
    const raw: LedgerState = {
      ...s,
      months: { "2026-11": { lines: [
        dep("v-nov", "f.ahorro.viaje", 25000, { seriesId: "serie-viaje" }),
        snap("b-nov", "f.ahorro.banco", 10000, { seriesId: "f.ahorro.banco" }),
      ] } },
    };
    const st = savingsStock(declareSeries(raw, "serie-viaje", "saldo", "f.ahorro.banco"), KEY);
    assert.equal(libreOf(st, "f.ahorro.banco"), -15000);
    assert.equal(freeShown(st, 10000), -15000, "el agregado tampoco se esconde");
  });
});

describe("totales289: los segmentos de la banda y el Apartado partido", () => {
  const SEEDS = new Set(["f.ahorro.viaje", "f.ahorro.emergencia", "f.ahorro.retiro", "f.ahorro.extra"]);
  const VAULTS = new Set(["f.ahorro.banco"]);

  it("segmentAgg: bóveda visible fuera, clases en su sitio, anfitriona recogida", () => {
    const st = savingsStock(mixed(), KEY);
    const aggs = segmentAgg(st, SEEDS, VAULTS);
    assert.equal(aggs.get("f.ahorro.banco"), undefined, "la cuenta no es un segmento: vive en el panel");
    const viaje = aggs.get("f.ahorro.viaje")!;
    assert.equal(viaje.pledged, 25000);
    assert.equal(viaje.kept, 0);
    assert.deepEqual(viaje.saldoHosts, ["f.ahorro.banco"]);
    assert.equal(aggs.get("f.ahorro.emergencia")!.kept, 20000);
    assert.equal(aggs.get("f.ahorro.retiro")!.kept, 50000);
    assert.equal(aggs.get("f.ahorro.extra")!.undecl, 30000);
    const keptSum = [...aggs.values()].reduce((a, g) => a + g.kept + g.undecl, 0);
    const pledgedSum = [...aggs.values()].reduce((a, g) => a + g.pledged, 0);
    assert.equal(keptSum + st.byClass.cuenta, keptTotal(st), "segmentos + cuentas = titular");
    assert.equal(pledgedSum, st.pledged);
  });

  it("segmentAgg: una cuenta escondida cae en «rest» y suma como pila (como hoy)", () => {
    const s = mixed();
    const withHidden: LedgerState = {
      ...s,
      months: { ...s.months, "2026-11": { lines: [...s.months["2026-11"]!.lines,
        snap("b2-nov", "f.ahorro.banco2", 40000, { seriesId: "f.ahorro.banco2" })] } },
    };
    const st = savingsStock(withHidden, KEY);
    const aggs = segmentAgg(st, SEEDS, VAULTS);
    assert.equal(aggs.get("rest")!.kept, 40000);
    assert.equal(keptTotal(st), 170000 + 40000, "su dinero sigue dentro del titular, como en 288");
  });

  it("asideSplit: dos lecturas que suman el total de la tarjeta", () => {
    const st = savingsStock(mixed(), KEY);
    const parts = asideSplit([
      { seriesKey: "serie-viaje", minor: 25000 },
      { seriesKey: "serie-emerg", minor: 20000 },
      { seriesKey: "serie-retiro", minor: 5000 },
      { seriesKey: "serie-extra", minor: 30000 },
    ], st);
    assert.equal(parts.saldo, 25000, "solo lo del saldo etiqueta");
    assert.equal(parts.moved, 55000);
    assert.equal(parts.saldo + parts.moved, 80000);
  });
});

describe("totales289: los textos de la oleada (§10)", () => {
  it("el panel se llama «Todas las cuentas» en los dos idiomas", () => {
    assert.equal(translate("es", "save.accounts.all"), "Todas las cuentas");
    assert.equal(translate("en", "save.accounts.all"), "All accounts");
  });

  it("las claves nuevas existen y llevan sus huecos", () => {
    assert.equal(translate("es", "save.kept"), "Lo guardado");
    assert.equal(translate("en", "save.kept"), "What you keep");
    assert.match(translate("es", "desk.savings.pledged"), /\{x\}/);
    assert.match(translate("es", "save.acct.named"), /\{x\}.*\{y\}/);
    assert.match(translate("es", "save.panel.pledged"), /\{x\}.*\{y\}/);
    assert.match(translate("es", "save.part.of"), /\{pocket\}.*\{x\}/);
    assert.match(translate("en", "vault.aside.saldo"), /\{x\}/);
    assert.match(translate("en", "vault.aside.aparte"), /\{x\}/);
  });
});
