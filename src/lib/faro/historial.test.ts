/**
 * El Historial: matemáticas de períodos y el río — orden, procedencia puesta, filtros que se
 * combinan (AND) y totales DE LA VISTA FILTRADA. Datos sintéticos solamente.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { buildStream, periodRange, streamTotals } from "./historial.ts";
import type { LedgerState, Line } from "./types.ts";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id,
    monthKey: "2026-11",
    currency: "NIO",
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
    balanceCurrency: "NIO",
    icon: "",
    history: [],
    ...partial,
  };
}

function book(): LedgerState {
  const s = createInitial("es", "oscuro");
  s.months = {
    "2026-11": {
      lines: [
        line({ id: "sal", kind: "income-fixed", concept: "Salario", amountMinor: 5_000_000, bookedOn: "2026-11-01" }),
        line({ id: "renta", kind: "expense-fixed", concept: "Renta", amountMinor: 90_000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-11-05", recurring: true }),
        line({ id: "gym", kind: "expense-variable", concept: "Cuota gym", amountMinor: 4_500, categoryId: "v-personales" }),
        line({ id: "net", kind: "subscription", concept: "Internet", amountMinor: 6_000, categoryId: "f-casa", nextDue: "2026-11-20", recurring: true, providerId: "claro" }),
        line({ id: "wm", kind: "purchase", concept: "Walmart importado", amountMinor: 42_000, categoryId: "v-alimentos", bookedOn: "2026-11-15", storeId: "walmart", sourceId: "acct-chase", batch: "b-2026-11", importId: "ofx:acct:1" }),
        line({ id: "xfer", kind: "purchase", concept: "Pago tarjeta", amountMinor: 70_000, bookedOn: "2026-11-18", active: false, xfer: true, cardId: "card-1" }),
        line({ id: "regalo", kind: "purchase", concept: "Regalo cumpleaños", amountMinor: 25_000, categoryId: "v-familia", bookedOn: "2026-11-29" }),
        line({ id: "widget", kind: "expense-variable", concept: "Apunte rápido", amountMinor: 1_500, categoryId: "v-familia", bookedOn: "2026-11-30", note: "Widget" }),
      ],
    },
    "2026-12": {
      lines: [
        line({ id: "arbol", kind: "purchase", concept: "Arbolito", amountMinor: 30_000, categoryId: "v-entretenimiento", bookedOn: "2026-12-03", monthKey: "2026-12" }),
      ],
    },
  };
  return s;
}

describe("historial — matemáticas de períodos", () => {
  it("mes y año alrededor de un ancla", () => {
    assert.deepEqual(periodRange("month", "2026-11-12"), { from: "2026-11-01", to: "2026-11-30" });
    assert.deepEqual(periodRange("month", "2026-02-10"), { from: "2026-02-01", to: "2026-02-28" });
    assert.deepEqual(periodRange("year", "2026-06-15"), { from: "2026-01-01", to: "2026-12-31" });
  });

  it("semana con inicio lunes por defecto; el domingo se pide", () => {
    // 2026-11-12 es jueves.
    assert.deepEqual(periodRange("week", "2026-11-12"), { from: "2026-11-09", to: "2026-11-15" });
    assert.deepEqual(periodRange("week", "2026-11-12", 0), { from: "2026-11-08", to: "2026-11-14" });
    // El propio lunes y el propio domingo cierran la misma semana.
    assert.deepEqual(periodRange("week", "2026-11-09"), { from: "2026-11-09", to: "2026-11-15" });
    assert.deepEqual(periodRange("week", "2026-11-15"), { from: "2026-11-09", to: "2026-11-15" });
  });

  it("la semana que cruza el año trae los dos lados", () => {
    // 2026-01-01 es jueves: su semana empieza en 2025.
    assert.deepEqual(periodRange("week", "2026-01-01"), { from: "2025-12-29", to: "2026-01-04" });
    assert.deepEqual(periodRange("week", "2026-12-02"), { from: "2026-11-30", to: "2026-12-06" });
  });

  it("un ancla inválida da el rango vacío", () => {
    assert.deepEqual(periodRange("week", ""), { from: "", to: "" });
    assert.deepEqual(periodRange("month", "ayer"), { from: "", to: "" });
  });
});

describe("historial — el río", () => {
  it("orden: del más nuevo al más viejo; a igual día manda el orden del libro", () => {
    const ids = buildStream(book()).map((m) => m.lineId);
    assert.deepEqual(ids, ["arbol", "widget", "regalo", "net", "xfer", "wm", "renta", "sal", "gym"]);
  });

  it("las fechas del movimiento: bookedOn manda; luego el vencimiento en su mes; luego el 1.º", () => {
    const byId = new Map(buildStream(book()).map((m) => [m.lineId, m]));
    assert.equal(byId.get("renta")?.date, "2026-11-05"); // bookedOn
    assert.equal(byId.get("net")?.date, "2026-11-20"); // nextDue dentro de su mes
    assert.equal(byId.get("gym")?.date, "2026-11-01"); // sin fechas: el mes abre
  });

  it("un bookedOn de OTRO mes no arrastra el movimiento fuera de su libro (W3)", () => {
    // La lectura de la casa (lineDay en engine.ts): el día apuntado solo manda dentro
    // de su propio mes. Antes, un bookedOn foráneo movía el movimiento a otro mes.
    const s = book();
    s.months["2026-11"]!.lines.push(
      line({ id: "viejo", kind: "purchase", concept: "Apunte viejo", amountMinor: 9_000, bookedOn: "2026-10-28" }),
      line({ id: "vencida", kind: "subscription", concept: "Cuota cruzada", amountMinor: 9_000, bookedOn: "2026-10-28", nextDue: "2026-11-20" }),
    );
    const byId = new Map(buildStream(s).map((m) => [m.lineId, m]));
    assert.equal(byId.get("viejo")?.date, "2026-11-01", "sin fecha válida en su mes: abre su propio mes");
    assert.equal(byId.get("viejo")?.monthKey, "2026-11");
    assert.equal(byId.get("vencida")?.date, "2026-11-20", "el vencimiento dentro de su mes manda sobre el bookedOn foráneo");
  });

  it("la procedencia va puesta: libro, categoría, grupo, tienda, cuenta, origen, lote", () => {
    const byId = new Map(buildStream(book()).map((m) => [m.lineId, m]));
    const wm = byId.get("wm")!;
    assert.equal(wm.monthKey, "2026-11");
    assert.equal(wm.categoryId, "v-alimentos");
    assert.equal(wm.group, "variable"); // el grupo de su categoría en la Estructura
    assert.equal(wm.merchantId, "walmart");
    assert.equal(wm.accountId, "acct-chase");
    assert.equal(wm.origin, "import");
    assert.equal(wm.batchId, "b-2026-11");
    assert.equal(wm.kind, "out");
    const renta = byId.get("renta")!;
    assert.equal(renta.group, "fixed");
    assert.equal(renta.origin, "manual");
    assert.equal(renta.recurring, true);
    assert.equal(byId.get("widget")?.origin, "widget"); // la nota «Widget» del apunte rápido
    assert.equal(byId.get("sal")?.kind, "in");
    const xfer = byId.get("xfer")!;
    assert.equal(xfer.kind, "xfer"); // la transferencia ES un movimiento aunque se guarde inactiva
    assert.equal(xfer.accountId, "card-1");
    const net = byId.get("net")!;
    assert.equal(net.merchantId, "claro"); // el proveedor de la suscripción es su tienda
  });

  it("una semana a caballo entre dos meses trae los dos lados enteros", () => {
    const r = periodRange("week", "2026-12-02");
    const ids = buildStream(book(), { from: r.from, to: r.to }).map((m) => m.lineId);
    assert.deepEqual(ids, ["arbol", "widget"]); // 3 dic y 30 nov; el 29 nov queda fuera
  });
});

describe("historial — filtros y totales de la vista", () => {
  it("los totales son de la vista entera; la transferencia cuenta y no suma", () => {
    const s = book();
    const all = buildStream(s);
    assert.deepEqual(streamTotals(s, all), {
      inMinor: 5_000_000,
      outMinor: 90_000 + 4_500 + 6_000 + 42_000 + 25_000 + 1_500 + 30_000,
      netMinor: 5_000_000 - 199_000,
      count: 9,
    });
  });

  it("filtrar cambia los totales: son DE LA VISTA FILTRADA", () => {
    const s = book();
    const fam = buildStream(s, { categoryId: "v-familia" });
    assert.deepEqual(fam.map((m) => m.lineId), ["widget", "regalo"]);
    assert.deepEqual(streamTotals(s, fam), { inMinor: 0, outMinor: 26_500, netMinor: -26_500, count: 2 });
  });

  it("los filtros se combinan con AND", () => {
    const s = book();
    const one = buildStream(s, { categoryId: "v-familia", direction: "out", minMinor: 10_000, text: "regalo" });
    assert.deepEqual(one.map((m) => m.lineId), ["regalo"]);
    // Cada filtro por separado deja más; juntos dejan exactamente uno.
    assert.equal(buildStream(s, { direction: "in" }).length, 1);
    assert.deepEqual(buildStream(s, { origin: "import", batchId: "b-2026-11" }).map((m) => m.lineId), ["wm"]);
    assert.deepEqual(buildStream(s, { origin: "import", batchId: "otro-lote" }), []);
    assert.deepEqual(buildStream(s, { recurring: true }).map((m) => m.lineId), ["net", "renta"]);
    assert.deepEqual(buildStream(s, { accountId: "card-1" }).map((m) => m.lineId), ["xfer"]);
    assert.deepEqual(buildStream(s, { merchantId: "claro" }).map((m) => m.lineId), ["net"]);
    assert.deepEqual(buildStream(s, { group: "fixed", direction: "out" }).map((m) => m.lineId), ["net", "renta"]);
    assert.deepEqual(buildStream(s, { text: "CUMPLEANOS" }).map((m) => m.lineId), ["regalo"]); // sin acento ni mayúsculas
  });

  it("el filtro de monto convierte a la moneda de vista antes de comparar (W2)", () => {
    // El libro se lee en NIO (tasa BCN 366243): $100.00 son C$3,662.43. El umbral que
    // el usuario teclea vive en la moneda de vista; comparar el menor crudo (10_000)
    // contra un umbral de C$2,000.00 dejaba la compra fuera por la puerta de atrás.
    const s = book();
    s.months["2026-11"]!.lines.push(line({ id: "usd100", kind: "purchase", concept: "Compra en dólares", amountMinor: 10_000, currency: "USD", bookedOn: "2026-11-08" }));
    const over = buildStream(s, { minMinor: 200_000 }).map((m) => m.lineId);
    assert.ok(over.includes("usd100"), "convertida, la compra de $100 supera el mínimo de C$2,000");
    assert.ok(!over.includes("widget"), "la línea NIO de C$15.00 sigue fuera del mínimo");
    const under = buildStream(s, { maxMinor: 200_000 }).map((m) => m.lineId);
    assert.ok(!under.includes("usd100"), "y supera también el máximo: fuera por arriba");
    assert.ok(under.includes("gym"), "la línea NIO bajo el máximo sigue dentro");
  });

  it("el rango libre y la dirección transferencia", () => {
    const s = book();
    assert.deepEqual(buildStream(s, { direction: "xfer" }).map((m) => m.lineId), ["xfer"]);
    assert.deepEqual(buildStream(s, { from: "2026-11-15", to: "2026-11-20" }).map((m) => m.lineId), ["net", "xfer", "wm"]);
  });
});
