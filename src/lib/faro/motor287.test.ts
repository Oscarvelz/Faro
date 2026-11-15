// Oleada 1 del modelo de ahorros (1.3.287): el motor parte en dos. `Line` gana los campos
// opcionales `fund`/`fundHost` y `savingsStock` gana la PARTICIÓN por clase — cuenta,
// retiro, aparte, saldo, sin-declarar — como única fuente de stocks. La invariante que lo
// blinda todo: para todo libro sin declaraciones (todo libro existente), las cifras son
// EXACTAMENTE las de hoy — la partición clasifica, no mueve. Declarar solo reparte la
// misma cifra entre clases; el total, la emergencia y el retiro no se enteran.
// Diseño: ~/workspace/faro-savings-model-design/DESIGN.md §2, §3, §12 (oleada 1).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { copyRecurring } from "./reducer.ts";
import { buildSampleArc } from "./sample.ts";
import { savingsStock, type SavingsClass, type SavingsStock } from "./savings.ts";
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
  return { ...s, settings: { ...s.settings, display: "USD", rateE4: 366243 } };
}

/** La estructura de los libros de estas cercas: la de fábrica + Viaje + una cuenta + una categoría oculta. */
function structure(s: LedgerState): LedgerState {
  return {
    ...s,
    structure: {
      ...s.structure,
      categories: s.structure.categories.map((c) => {
        if (c.id === "f-ahorro") return { ...c, subs: [...c.subs,
          { id: "f.ahorro.viaje", nameKey: "f.ahorro.viaje", customName: "Viaje", icon: "Circle", hidden: false, order: 3 },
          { id: "f.ahorro.banco", nameKey: "f.ahorro.banco", customName: "CuentaBanco", icon: "vault:chase", hidden: false, order: 4 }] };
        return c;
      }).concat([{ id: "x-ahorro", nameKey: "x.ahorro", customName: "OCULTO-AHORRO", icon: "PiggyBank", hidden: true, order: 99, group: "fixed", role: "savings",
        subs: [{ id: "x.ahorro.secreto", nameKey: "x.ahorro.secreto", customName: "SECRETO-POCKET", icon: "Circle", hidden: false, order: 0 }] }]),
    },
  };
}

const dep = (id: string, subId: string, amountMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor, categoryId: "f-ahorro", subId, bookedOn: "2026-11-03", ...extra });
const snap = (id: string, subId: string, balanceMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor: balanceMinor, categoryId: "f-ahorro", subId, balanceMinor, bookedOn: "2026-11-02", ...extra });

/** El libro mixto sin declarar (las cifras de corazon1: total 670000). Con `stamp`, el mismo libro declarado. */
function mixedBook(stamp: boolean): LedgerState {
  const st = stamp
    ? {
        meta: { fund: "aparte" as const },
        viaje: { fund: "saldo" as const, fundHost: "f.ahorro.banco" },
        emerg: { fund: "saldo" as const, fundHost: "f.ahorro.banco" },
        secreto: { fund: "saldo" as const }, // del saldo, sin anfitriona escrita
      }
    : { meta: {}, viaje: {}, emerg: {}, secreto: {} };
  const s = structure(base());
  return {
    ...s,
    months: {
      "2026-10": { lines: [snap("sav-retiro", "f.ahorro.retiro", 500000, { monthKey: "2026-10", bookedOn: "2026-10-10" })] },
      "2026-11": { lines: [
        dep("sav-emerg", "f.ahorro.emergencia", 20000, st.emerg),
        dep("sav-meta", "f.ahorro.meta", 30000, st.meta),
        dep("sav-viaje", "f.ahorro.viaje", 10000, st.viaje),
        snap("sav-banco", "f.ahorro.banco", 70000),
        dep("sav-hidden", "x.ahorro.secreto", 40000, { categoryId: "x-ahorro", ...st.secreto }),
      ] },
    },
  };
}

/** Toda partición, declarada o no, reconcilia consigo misma y con el total de siempre. */
function reconciles(st: SavingsStock) {
  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  assert.equal(Object.values(st.byClass).reduce((a, b) => a + b, 0), st.total, "las cinco clases suman el total");
  assert.equal(st.byClass.cuenta + st.kept + st.pledged + st.undeclared, st.total, "cuenta + kept + pledged + sin-declarar = total");
  assert.equal(st.byClass.aparte + st.byClass.retiro, st.kept, "kept = aparte + retiro");
  assert.equal(st.byClass.saldo, st.pledged, "pledged = saldo");
  assert.equal(st.byClass["sin-declarar"], st.undeclared);
  assert.equal(sum(st.keptByPocket), st.kept, "kept por bolsa suma kept");
  assert.equal(sum(st.pledgedByPocket), st.pledged, "pledged por bolsa suma pledged");
  assert.equal(sum(st.pledgedByHost), st.pledged, "pledged por anfitriona suma pledged");
  assert.equal(sum(st.undeclaredByPocket), st.undeclared, "sin-declarar por bolsa suma");
  const byRow: Record<SavingsClass, number> = { cuenta: 0, retiro: 0, aparte: 0, saldo: 0, "sin-declarar": 0 };
  for (const r of st.series.values()) byRow[r.cls] += r.minor;
  assert.deepEqual(byRow, st.byClass, "ninguna serie en dos clases: las filas componen las clases");
}

describe("motor 287 — libros sin declarar: la partición reproduce las cifras de hoy", () => {
  it("solo bolsas: todo cae en retiro y sin-declarar; pledged nace en cero", () => {
    const s = structure(base());
    const book: LedgerState = { ...s, months: {
      "2026-10": { lines: [snap("r", "f.ahorro.retiro", 500000, { monthKey: "2026-10", bookedOn: "2026-10-10" })] },
      "2026-11": { lines: [dep("e", "f.ahorro.emergencia", 20000), dep("m", "f.ahorro.meta", 30000)] },
    } };
    const st = savingsStock(book, KEY);
    assert.equal(st.total, 550000);
    assert.equal(st.emergency, 20000);
    assert.equal(st.retirement, 500000);
    assert.deepEqual(st.byClass, { cuenta: 0, retiro: 500000, aparte: 0, saldo: 0, "sin-declarar": 50000 });
    assert.equal(st.kept, 500000);
    assert.equal(st.pledged, 0);
    assert.equal(st.undeclared, 50000);
    assert.equal(st.undeclaredByPocket.get("f.ahorro.meta"), 30000);
    assert.equal(st.undeclaredByPocket.get("f.ahorro.emergencia"), 20000);
    assert.equal(st.keptByPocket.get("f.ahorro.retiro"), 500000);
    reconciles(st);
  });

  it("solo cuentas: la serie vault es la clase cuenta; nada es fondo", () => {
    const s = structure(base());
    const book: LedgerState = { ...s, months: { "2026-11": { lines: [snap("b", "f.ahorro.banco", 70000)] } } };
    const st = savingsStock(book, KEY);
    assert.equal(st.total, 70000);
    assert.deepEqual(st.byClass, { cuenta: 70000, retiro: 0, aparte: 0, saldo: 0, "sin-declarar": 0 });
    assert.equal(st.kept, 0);
    assert.equal(st.undeclared, 0);
    assert.equal(st.series.get("b")?.cls, "cuenta");
    reconciles(st);
  });

  it("mixto (el libro de corazon1): total 670000, partido sin mover una cifra", () => {
    const st = savingsStock(mixedBook(false), KEY);
    assert.equal(st.total, 670000);
    assert.equal(st.emergency, 20000);
    assert.equal(st.retirement, 500000);
    assert.deepEqual(st.byClass, { cuenta: 70000, retiro: 500000, aparte: 0, saldo: 0, "sin-declarar": 100000 });
    assert.equal(st.kept, 500000);
    assert.equal(st.pledged, 0);
    assert.equal(st.undeclared, 100000);
    reconciles(st);
  });

  it("la casa de ejemplo (arco v3, 1.3.291): 4,630,000 partidos por el modelo — cuenta, aparte, saldo y Retiro", () => {
    const arc = buildSampleArc(createInitial("es"));
    const st = savingsStock(arc, "2026-11");
    assert.equal(st.total, 4630000);
    assert.deepEqual(st.byClass, { cuenta: 1540000, retiro: 1470000, aparte: 375000, saldo: 1245000, "sin-declarar": 0 });
    assert.equal(st.kept, 1845000);
    assert.equal(st.pledged, 1245000);
    assert.equal(st.undeclared, 0);
    reconciles(st);
  });
});

describe("motor 287 — declarar reparte la misma cifra; el motor no mueve totales", () => {
  it("el libro mixto declarado: aparte, saldo con anfitriona y saldo sin anfitriona", () => {
    const plain = savingsStock(mixedBook(false), KEY);
    const st = savingsStock(mixedBook(true), KEY);
    // Declarar no mueve NI UNA cifra de las de siempre.
    assert.equal(st.total, plain.total);
    assert.equal(st.emergency, plain.emergency);
    assert.equal(st.retirement, plain.retirement);
    for (const [sid, row] of plain.series) assert.equal(st.series.get(sid)?.minor, row.minor, sid);
    // La partición, en cambio, dice la verdad nueva.
    assert.deepEqual(st.byClass, { cuenta: 70000, retiro: 500000, aparte: 30000, saldo: 70000, "sin-declarar": 0 });
    assert.equal(st.kept, 530000);
    assert.equal(st.keptByPocket.get("f.ahorro.meta"), 30000);
    assert.equal(st.keptByPocket.get("f.ahorro.retiro"), 500000);
    assert.equal(st.pledged, 70000);
    assert.equal(st.pledgedByPocket.get("f.ahorro.viaje"), 10000);
    assert.equal(st.pledgedByPocket.get("f.ahorro.emergencia"), 20000);
    assert.equal(st.pledgedByPocket.get("x.ahorro.secreto"), 40000);
    assert.equal(st.pledgedByHost.get("f.ahorro.banco"), 30000);
    assert.equal(st.pledgedByHost.get(""), 40000, "el saldo sin anfitriona escrita se reporta bajo \"\"");
    assert.equal(st.undeclared, 0);
    assert.equal(st.series.get("sav-meta")?.cls, "aparte");
    assert.equal(st.series.get("sav-viaje")?.cls, "saldo");
    assert.equal(st.series.get("sav-viaje")?.fundHost, "f.ahorro.banco");
    reconciles(st);
  });
});

describe("motor 287 — la naturaleza se lee de la línea determinante, como la bolsa", () => {
  const book = (): LedgerState => {
    const s = structure(base());
    return { ...s, months: {
      "2026-10": { lines: [
        line({ id: "sf-dep", seriesId: "snap-fund", kind: "expense-fixed", concept: "sf dep", amountMinor: 5000, monthKey: "2026-10", categoryId: "f-ahorro", subId: "f.ahorro.meta", bookedOn: "2026-10-05" }),
        line({ id: "df-dep1", seriesId: "dep-fund", kind: "expense-fixed", concept: "df 1", amountMinor: 5000, monthKey: "2026-10", categoryId: "f-ahorro", subId: "f.ahorro.viaje", bookedOn: "2026-10-05" }),
        line({ id: "sn-dep", seriesId: "snap-nofund", kind: "expense-fixed", concept: "sn dep", amountMinor: 5000, monthKey: "2026-10", categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: "2026-10-05", fund: "aparte" }),
      ] },
      "2026-11": { lines: [
        line({ id: "sf-snap", seriesId: "snap-fund", kind: "expense-fixed", concept: "sf snap", amountMinor: 80000, categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 80000, bookedOn: "2026-11-10", fund: "aparte" }),
        line({ id: "df-dep2", seriesId: "dep-fund", kind: "expense-fixed", concept: "df 2", amountMinor: 7000, categoryId: "f-ahorro", subId: "f.ahorro.viaje", bookedOn: "2026-11-05", fund: "saldo", fundHost: "f.ahorro.banco" }),
        line({ id: "sn-snap", seriesId: "snap-nofund", kind: "expense-fixed", concept: "sn snap", amountMinor: 90000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 90000, bookedOn: "2026-11-10" }),
      ] },
    } };
  };

  it("el snapshot manda: su sello es la naturaleza (y el depósito previo no se duplica)", () => {
    const st = savingsStock(book(), KEY);
    const row = st.series.get("snap-fund");
    assert.equal(row?.minor, 80000);
    assert.equal(row?.cls, "aparte");
  });

  it("sin snapshot manda el depósito más reciente: el sello viejo no arrastra", () => {
    const st = savingsStock(book(), KEY);
    const row = st.series.get("dep-fund");
    assert.equal(row?.minor, 12000);
    assert.equal(row?.cls, "saldo");
    assert.equal(row?.fundHost, "f.ahorro.banco");
    assert.equal(st.pledgedByHost.get("f.ahorro.banco"), 12000);
  });

  it("un depósito sellado NO declara la serie si su snapshot no lo está", () => {
    const st = savingsStock(book(), KEY);
    const row = st.series.get("snap-nofund");
    assert.equal(row?.minor, 90000);
    assert.equal(row?.cls, "sin-declarar");
    assert.deepEqual(st.byClass, { cuenta: 0, retiro: 0, aparte: 80000, saldo: 12000, "sin-declarar": 90000 });
    reconciles(st);
  });
});

describe("motor 287 — precedencia: la cuenta es la base y el Retiro es su clase, con o sin sello", () => {
  it("un sello perdido en el Retiro o en una cuenta no reclasifica nada; una palabra desconocida no declara", () => {
    const s = structure(base());
    const book: LedgerState = { ...s, months: { "2026-11": { lines: [
      snap("r", "f.ahorro.retiro", 500000, { fund: "saldo", fundHost: "f.ahorro.banco" }),
      snap("b", "f.ahorro.banco", 70000, { fund: "aparte" }),
      dep("m", "f.ahorro.meta", 30000, { fund: "mixto" as Line["fund"] }),
    ] } } };
    const st = savingsStock(book, KEY);
    assert.equal(st.series.get("r")?.cls, "retiro", "el Retiro nunca lleva el campo: su clase es el sufijo");
    assert.equal(st.series.get("b")?.cls, "cuenta", "una cuenta ES la base: no es un fondo");
    assert.equal(st.series.get("m")?.cls, "sin-declarar", "la lectura es con desconfianza: solo dos palabras cuentan");
    assert.deepEqual(st.byClass, { cuenta: 70000, retiro: 500000, aparte: 0, saldo: 0, "sin-declarar": 30000 });
    assert.equal(st.pledged, 0);
    reconciles(st);
  });
});

describe("motor 287 — las copias mensuales propagan el campo solos", () => {
  it("copyRecurring arrastra fund y fundHost a la copia del mes siguiente", () => {
    const s = structure(base());
    const book: LedgerState = { ...s, months: { "2026-11": { lines: [
      dep("h1", "f.ahorro.meta", 11000, { seriesId: "h-serie", recurring: true, fund: "saldo", fundHost: "f.ahorro.banco" }),
    ] } } };
    const next = copyRecurring(book, "2026-11", "2026-12").state;
    const copy = (next.months["2026-12"]?.lines ?? []).find((l) => l.seriesId === "h-serie");
    assert.ok(copy, "la copia existe");
    assert.equal(copy?.fund, "saldo");
    assert.equal(copy?.fundHost, "f.ahorro.banco");
  });
});
