/**
 * FARO — «Los tres modos», etapa 3.1 (Central · Libros · navegación · formulario).
 *
 * La etapa recompone las caras de Central y Libros, los tres anillos, el muelle
 * y el motor de formas. Lo que cercan estas pruebas:
 *
 *  - NINGUNA PARADA DE ANILLO FUERA DEL MODO: los manifiestos de abajo fijan,
 *    parada a parada, qué paradas de cada anillo (libros, muelle de tableta,
 *    bandas del muelle), qué pestañas de bóveda y qué centros del muelle viven
 *    en cada modo — contrastados contra el registro vía hasFeature, que es el
 *    único punto de filtrado que las caras consumen.
 *  - LA FILA DE DATOS MUDOS CUENTA UNA SOLA VEZ (C-2/X-3): el dinero dormido
 *    que la fila nombra es aparte + sin declarar + Retiro con saldo; lo del
 *    saldo NO entra (ya vive dentro de las cuentas) y «Lo guardado» sigue
 *    contando cada dinero una sola vez sobre la misma partición.
 *  - LA CERCA DEL MOTOR (F-1): guardar nunca exige un campo que el modo no
 *    muestra — la pareja de stampFor lo fija: sin anfitriona elegida y con
 *    varias cuentas la estampa NO está lista (por eso la forma simple amarra
 *    sola a la primera cuenta y lo dice); con la amarra puesta, está lista.
 *  - LA SIEMBRA ACOTADA (C-5): un libro que ya vivió jamás recibe bolsillos
 *    tarde; la señal de espera y la de hecho conviven sin pisarse.
 *  - ROUND-TRIP POR TIPO DE OBJETO (principios 2 y 2.6): el libro viaja entero
 *    (la persistencia es el paquete completo, sin constructores campo a campo),
 *    así que una línea guardada en Esencial y reabierta en Completo conserva
 *    byte a byte los campos que Esencial no vio; y la cerca de cableado fija
 *    los asientos de esa conservación en la forma (el estado nace de
 *    `existing`, los bloques dormidos se montan tras su función y el guardado
 *    los escribe de vuelta desde ese mismo estado).
 *  - FILTRO AL LEER, NUNCA REESCRITURA (F-3, F-4, L-4): los asientos quedan
 *    fijados en el código — el borrador se degrada solo en la copia de lectura
 *    (la sesión degradada no lleva draftKey), los gestos se resuelven contra
 *    el modo al disparar y readVaultBlocks no tiene ninguna escritura.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createInitial, isLedgerDeep } from "./defaults.ts";
import { deskSeedDecision, withDeskSeedFlag } from "./deskseed.ts";
import { stampFor, type HostAccount } from "./funds.ts";
import { hasFeature, type FeatureId, type Mode } from "./mode.ts";
import { savingsStock } from "./savings.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-11";
const MODES: Mode[] = ["esencial", "ritmo", "completo"];
const has = (mode: Mode, f: string) => hasFeature(mode, f as FeatureId);

/* ---------- N-1: ninguna parada de anillo fuera del modo ---------- */

// El anillo de libros (shell.tsx RING) y su función por parada.
const RING_STOPS: [string, string | null][] = [
  ["income", null], ["fixed", null], ["variable", null],
  ["shops", "books.shops"], ["owed", "cobros.owed-side"], ["owe", "cobros.owe-side"],
  ["save", "vault.save"], ["meta", "vault.meta"], ["retiro", "vault.retiro"], ["emergencia", "vault.emergencia"],
];
// Las pestañas de la barra de bóvedas (X-3: en Esencial vive solo Ahorros).
const VAULT_TABS: [string, string][] = [
  ["save", "vault.save"], ["meta", "vault.meta"], ["retiro", "vault.retiro"], ["emergencia", "vault.emergencia"],
];
// Los centros del muelle (DockNav): Estudio entra solo con study.flow.
const DOCK_HUBS: [string, string | null][] = [
  ["desk", null], ["books", null], ["folios", null], ["study", "study.flow"],
];
// El anillo del muelle de tableta (DOCK_RING): secciones de libros y de estudio.
const DOCK_STOPS: [string, string | null][] = [
  ["income", null], ["fixed", null], ["variable", null], ["shops", "books.shops"], ["subs", "books.subs"],
  ["stats", "study.flow"], ["advice", "study.flow"],
];

describe("modos295: ninguna parada de anillo fuera del modo (N-1)", () => {
  it("el anillo de libros en Esencial es Ingresos·Fijos·Variables·Ahorros; en Ritmo y Completo, los diez", () => {
    const visible = (mode: Mode) => RING_STOPS.filter(([, f]) => !f || has(mode, f)).map(([s]) => s);
    assert.deepEqual(visible("esencial"), ["income", "fixed", "variable", "save"]);
    assert.deepEqual(visible("ritmo"), RING_STOPS.map(([s]) => s));
    assert.deepEqual(visible("completo"), RING_STOPS.map(([s]) => s));
  });
  it("la barra de bóvedas en Esencial lleva solo Ahorros (fallo 1 / X-3)", () => {
    const visible = (mode: Mode) => VAULT_TABS.filter(([, f]) => has(mode, f)).map(([s]) => s);
    assert.deepEqual(visible("esencial"), ["save"]);
    assert.deepEqual(visible("ritmo"), ["save", "meta", "retiro", "emergencia"]);
    assert.deepEqual(visible("completo"), ["save", "meta", "retiro", "emergencia"]);
  });
  it("el muelle en Esencial se recompone a tres centros; Estudio vuelve en Ritmo", () => {
    const visible = (mode: Mode) => DOCK_HUBS.filter(([, f]) => !f || has(mode, f)).map(([s]) => s);
    assert.deepEqual(visible("esencial"), ["desk", "books", "folios"]);
    assert.deepEqual(visible("ritmo"), ["desk", "books", "folios", "study"]);
    assert.deepEqual(visible("completo"), ["desk", "books", "folios", "study"]);
  });
  it("el anillo del muelle no camina Compras, Cuotas ni Estudio en Esencial", () => {
    const visible = (mode: Mode) => DOCK_STOPS.filter(([, f]) => !f || has(mode, f)).map(([s]) => s);
    assert.deepEqual(visible("esencial"), ["income", "fixed", "variable"]);
    assert.deepEqual(visible("ritmo"), DOCK_STOPS.map(([s]) => s));
  });
  it("la lente Pagos y el panel de Cobros son de Ritmo; los hechos de deuda quedan en Esencial", () => {
    for (const mode of MODES) {
      assert.equal(has(mode, "central.lens-pagos"), mode !== "esencial", `lens-pagos en ${mode}`);
      assert.equal(has(mode, "central.cobros-panel"), mode !== "esencial", `cobros-panel en ${mode}`);
      assert.equal(has(mode, "debt.facts"), true, `debt.facts en ${mode}`);
      assert.equal(has(mode, "debt.scale"), mode !== "esencial", `debt.scale en ${mode}`);
    }
  });
});

/* ---------- C-2: la fila de datos mudos cuenta una sola vez ---------- */

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: p.id, monthKey: KEY, currency: "USD", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...p,
  };
}

function book(): LedgerState {
  const s = createInitial("es", "claro");
  const base: LedgerState = {
    ...s,
    settings: { ...s.settings, display: "USD", rateE4: 366243 },
    structure: {
      ...s.structure,
      categories: s.structure.categories.map((c) => c.id === "f-ahorro" ? { ...c, subs: [...c.subs,
        { id: "f.ahorro.banco", nameKey: "f.ahorro.banco", customName: "Banco", icon: "vault:chase", hidden: false, order: 4 }] } : c),
    },
  };
  const dep = (id: string, subId: string, amountMinor: number, extra: Partial<Line> = {}): Line =>
    line({ id, kind: "expense-fixed", concept: id, amountMinor, categoryId: "f-ahorro", subId, bookedOn: "2026-11-03", ...extra });
  const snap = (id: string, subId: string, balanceMinor: number, extra: Partial<Line> = {}): Line =>
    line({ id, kind: "expense-fixed", concept: id, amountMinor: balanceMinor, categoryId: "f-ahorro", subId, balanceMinor, bookedOn: "2026-11-02", ...extra });
  return {
    ...base,
    months: { [KEY]: { lines: [
      snap("b-1", "f.ahorro.banco", 70000, { seriesId: "f.ahorro.banco" }),
      dep("v-1", "f.ahorro.viaje", 25000, { seriesId: "serie-saldo", fund: "saldo", fundHost: "f.ahorro.banco" }),
      dep("c-1", "f.ahorro.viaje", 10000, { seriesId: "serie-aparte", fund: "aparte" }),
      dep("e-1", "f.ahorro.emergencia", 20000, { seriesId: "serie-libre" }),
      snap("r-1", "f.ahorro.retiro", 50000, { seriesId: "serie-retiro" }),
    ] } },
  };
}

describe("modos295: la fila de mudos y los totales (C-2)", () => {
  it("lo dormido que la fila suma es aparte + sin declarar + Retiro — lo del saldo no entra", () => {
    const stock = savingsStock(book(), KEY);
    const dormant = [...stock.series.values()]
      .filter((r) => (r.cls === "aparte" || r.cls === "sin-declarar" || r.cls === "retiro") && r.minor > 0)
      .reduce((acc, r) => acc + r.minor, 0);
    assert.equal(dormant, 10000 + 20000 + 50000);
    assert.equal(stock.pledged, 25000);
    // Cada dinero una sola vez: guardado = cuentas + aparte + sin declarar + Retiro.
    assert.equal(stock.total - stock.pledged, 70000 + 10000 + 20000 + 50000);
  });
});

/* ---------- F-1: la cerca del motor de formas ---------- */

describe("modos295: guardar nunca exige un campo que el modo no muestra (F-1)", () => {
  const two: HostAccount[] = [
    { id: "cta-a", minor: 70000 }, { id: "cta-b", minor: 30000 },
  ] as HostAccount[];
  it("sin selector de anfitriona, la estampa del saldo exige la amarra automática a la primera cuenta", () => {
    // Sin amarra y con varias cuentas: NO listo — una forma sin selector jamás
    // podría guardar; por eso la forma simple amarra a la primera y lo dice.
    assert.equal(stampFor("ask", "saldo", "", two).ready, false);
    const bound = stampFor("ask", "saldo", two[0]!.id, two);
    assert.equal(bound.ready, true);
    assert.equal(bound.fund, "saldo");
    assert.equal(bound.fundHost, "cta-a");
  });
  it("aparte nunca pide anfitriona; del saldo sin cuentas nace sin declarar, listo", () => {
    assert.deepEqual(stampFor("ask", "aparte", "", two), { fund: "aparte", ready: true });
    assert.deepEqual(stampFor("ask", "saldo", "", []), { ready: true });
    assert.equal(stampFor("ask", null, "", two).ready, false);
  });
});

/* ---------- C-5: la siembra acotada por modo ---------- */

describe("modos295: la siembra espera en el libro y nunca llega tarde (C-5)", () => {
  it("un libro que ya vivió adopta la señal sin sembrar; uno nuevo corre", () => {
    const lived = book();
    assert.equal(deskSeedDecision(lived, "desk-pockets", false), "adopt");
    const fresh = createInitial("es", "claro");
    assert.equal(deskSeedDecision(fresh, "desk-pockets", false), "run");
  });
  it("la señal de espera y la de hecho conviven: ninguna pisa a la otra", () => {
    let s = createInitial("es", "claro");
    const born = (s.settings.seeds ?? []).length;
    s = withDeskSeedFlag(s, "desk-pockets-wait");
    s = withDeskSeedFlag(s, "desk-pockets");
    assert.deepEqual((s.settings.seeds ?? []).slice(born), ["desk-pockets-wait", "desk-pockets"]);
    assert.equal(deskSeedDecision(s, "desk-pockets", false), "done");
    // Idempotente: registrar dos veces no duplica ni reordena.
    assert.equal(withDeskSeedFlag(s, "desk-pockets"), s);
  });
});

/* ---------- Round-trip por tipo de objeto (principios 2 y 2.6) ---------- */

describe("modos295: guardar en Esencial y reabrir en Completo no pierde ningún campo", () => {
  it("el paquete entero viaja byte a byte: la carga no reconstruye campo a campo", () => {
    const s = book();
    const rich: Line[] = [
      // Cuota: marca, cadencia propia, próximo cobro — Ritmo/Completo los gestionan.
      line({ id: "x-q", kind: "subscription", concept: "Streaming", amountMinor: 1599, icon: "sub:stream", cadence: "2w", nextDue: "2026-11-20", startedOn: "2026-01-15", recurring: true }),
      // Compra: tienda, proveedor, código y enlace duermen en Esencial.
      line({ id: "x-p", kind: "purchase", concept: "Disco", amountMinor: 4500, categoryId: "t-tech", storeId: "st-1", providerId: "pv-1", productCode: "SKU-9", productUrl: "https://example.com/x" }),
      // Deuda: APR y saldo duermen tras editor.debt-balance.
      line({ id: "x-d", kind: "expense-fixed", concept: "Tarjeta", amountMinor: 8000, categoryId: "f-deuda", aprBps: 2499, balanceMinor: 120000 }),
      // Fondo declarado: naturaleza y anfitriona viajan en la propia línea.
      line({ id: "x-f", kind: "expense-fixed", concept: "Viaje", amountMinor: 25000, categoryId: "f-ahorro", subId: "f.ahorro.viaje", fund: "saldo", fundHost: "f.ahorro.banco" }),
      // Remesa con persona: el «Para» y la persona duermen en Esencial (F-2).
      line({ id: "x-r", kind: "expense-variable", concept: "Remesa", amountMinor: 10000, categoryId: "v-remesas", personId: "per-1", to: "per-1" }),
    ];
    const withRich: LedgerState = { ...s, months: { [KEY]: { lines: [...s.months[KEY]!.lines, ...rich] } } };
    const back = JSON.parse(JSON.stringify(withRich)) as LedgerState;
    assert.equal(isLedgerDeep(back), true);
    assert.deepEqual(back, withRich);
    for (const want of rich) {
      const got = back.months[KEY]!.lines.find((l) => l.id === want.id)!;
      assert.deepEqual(got, want, `la línea ${want.id} vuelve intacta`);
    }
  });
});

/* ---------- Cercas de cableado: los asientos de la etapa ---------- */

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("modos295: el cableado de la etapa vive en sus asientos", () => {
  it("la forma: los bloques dormidos se montan tras su función y la naturaleza va en forma simple fuera de Completo", () => {
    const form = SRC("../../components/faro/line-form.tsx");
    for (const gate of ["editor.person", "editor.for-remit", "books.shops", "subs.brand-library", "editor.debt-balance", "editor.recurrent-toggle", "nature.naturepick-full"]) {
      assert.ok(form.includes(`has("${gate}")`), `line-form monta tras ${gate}`);
    }
    // La conservación: el estado de los campos dormidos nace de la línea misma.
    for (const seed of ["existing?.aprBps", "existing?.balanceMinor", "existing?.personId", "existing?.to", "existing?.storeId", "existing?.productCode", "existing.fund"]) {
      assert.ok(form.includes(seed), `line-form siembra desde ${seed}`);
    }
    // F-3: el borrador se filtra al leer y la sesión degradada no lleva draftKey.
    assert.ok(form.includes("seedFor") && form.includes("draftAwake"), "el borrador se filtra al leer (F-3)");
    assert.ok(form.includes("heldDegraded ? undefined : mode"), "la sesión degradada no autoguardada el borrador");
    // Los grupos de QuickAdd se recomponen por modo.
    assert.ok(form.includes('has("books.subs") ? [{ id: "subs"'), "QuickAdd no ofrece Cuotas fuera de su modo");
  });
  it("la frecuencia completa es de Completo (fit-pick)", () => {
    const pick = SRC("../../components/faro/fit-pick.tsx");
    assert.ok(pick.includes('has("subs.cadence-custom")'), "FreqSheet consulta la cadencia completa");
    assert.ok(pick.includes("setter && full"), "el setter de intervalos duerme fuera de Completo");
  });
  it("los gestos guardados se resuelven contra el modo al disparar (F-4) y su valor nunca se borra", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('kind === "subscription" && !has("books.subs")'), "gesto de cuota dormido en Esencial");
    assert.ok(screens.includes('kind === "purchase" && !has("books.shops")'), "gesto de compra dormido en Esencial");
    assert.ok(screens.includes('!has("central.cobros-panel")'), "gestos de Cobros dormidos en Esencial");
    // La cara lectora de Cuotas y la fila de mudos existen con sus anclas.
    // Etapa 4 (X-26): el ancla de la fila se renombra desk-mudos → modo-mudos
    // — es el nombre que el módulo 15 dormido espera, y la fila ahora ABRE su
    // lista (modo-lista) en vez de solo explicarse; la intención de esta
    // cerca (la fila lleva su ancla) queda intacta y más fuerte.
    assert.ok(screens.includes("export function SubsReadOnly"), "la cara lectora de Cuotas existe");
    assert.ok(screens.includes('data-anchor="modo-mudos"'), "la fila de datos mudos lleva su ancla (modo-mudos desde la etapa 4)");
    assert.ok(screens.includes('data-anchor="modo-lista"'), "la lista de fondos mudos lleva su ancla");
    assert.ok(screens.includes('data-anchor="subs-readonly"'), "la cara lectora lleva su ancla");
    // C-5: la espera de los bolsillos vive en el libro.
    assert.ok(screens.includes("desk-pockets-wait"), "la siembra diferida deja su señal en el libro");
  });
  it("readVaultBlocks solo lee: el orden guardado se filtra al leer y se escribe en un único asiento (L-4)", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    const at = screens.indexOf("function readVaultBlocks");
    const body = screens.slice(at, at + 700);
    assert.ok(body.includes("getItem") && !body.includes("setItem"), "readVaultBlocks no escribe");
    const writes = screens.match(/localStorage\.setItem\(`faro-vault-blocks:/g) ?? [];
    assert.equal(writes.length, 1, "un solo asiento escribe el orden de bloques");
  });
  it("el cascarón deriva sus anillos del modo y no importa el registro", () => {
    const shell = SRC("../../components/faro/shell.tsx");
    assert.ok(!shell.includes("lib/faro/mode"), "shell.tsx no importa mode.ts");
    for (const helper of ["ringStopVisible", "vaultStopVisible", "dockStopVisible"]) {
      assert.ok(shell.includes(`function ${helper}`), `shell deriva con ${helper}`);
    }
    assert.ok(shell.includes("SubsReadOnly"), "la puerta de Cuotas de Esencial abre la cara lectora");
    assert.ok(shell.includes('has("debt.scale")'), "la balanza vive solo con debt.scale (N-2)");
    assert.ok(shell.includes('has("nav.calendar")'), "el calendario vive solo en su modo");
    assert.ok(shell.includes('has("study.flow")'), "Estudio entra y sale del muelle con study.flow");
  });
});
