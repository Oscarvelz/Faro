/**
 * FARO — Captura Inteligente, Ola 3: la cerca de la lista en bache
 * (mapa F4). La batería fija el contrato de parseList: una compra por
 * línea, los muebles de la lista (numeración, viñetas) fuera del
 * concepto, las líneas vacías no existen, el sentido del bache se aplica
 * SOLO a las líneas sin verbo propio, y los silencios del intérprete se
 * heredan enteros (un conteo con dos números no inventa monto). La
 * puerta: su asiento declarado antes que la superficie, comete por
 * addDrafts y jamás escribe una línea; sus tres puertas son una hoja.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseList, type ParseCtx } from "./textparse.ts";
import { FEATURES } from "./mode.ts";
import { MANUAL_TOPICS } from "../manual/topics.ts";
import type { LedgerState } from "./types.ts";

const TODAY = "2026-11-20";

function ledger(extra?: Partial<LedgerState>): LedgerState {
  return {
    v: 1,
    structure: { categories: [], purchases: [], catalog: [], groups: [] } as unknown as LedgerState["structure"],
    months: {},
    settings: {} as LedgerState["settings"],
    imports: { rules: [], seen: [] },
    ...extra,
  } as LedgerState;
}

let seq = 0;
const ctx = (over?: Partial<ParseCtx>): ParseCtx => ({
  ledger: ledger(),
  lang: "es",
  today: TODAY,
  display: "NIO",
  makeId: () => `d${++seq}`,
  now: "2026-11-20T15:00:00.000Z",
  ...over,
});

const LISTA = "Compras de hoy:\n1. Leche 120\n- Pan 45\n• Huevos\n\nPagué 300 de luz\nMe pagaron 500 dólares de la remesa";

describe("ola3 · parseList: la lista del día, partida en hermanos", () => {
  it("cada línea no vacía nace borrador de lista, con su línea por raw", () => {
    const ds = parseList(LISTA, ctx(), "out");
    assert.equal(ds.length, 6, "seis líneas con contenido; la vacía no existe");
    assert.ok(ds.every((d) => d.source === "list"), "todas nacen de la lista");
    assert.equal(ds[1].raw, "Leche 120", "el raw es la línea limpia, sin su numeración");
  });

  it("los muebles de la lista (1., -, •) no entran al concepto", () => {
    const ds = parseList(LISTA, ctx(), "out");
    assert.deepEqual(ds.slice(1, 4).map((d) => d.concept), ["Leche", "Pan", "Huevos"]);
    assert.equal(ds[1].amountMinor, 12000);
    assert.equal(ds[2].amountMinor, 4500);
  });

  it("el sentido del bache cubre solo a las líneas sin verbo propio", () => {
    const ds = parseList(LISTA, ctx(), "out");
    assert.equal(ds[1].sign, "out", "«Leche 120» no trae verbo: manda el bache");
    assert.ok(!ds[1].missing.includes("sign"), "el sentido declarado no se pregunta");
    assert.equal(ds[4].sign, "out", "«Pagué 300 de luz» ya lo traía");
    assert.equal(ds[5].sign, "in", "«Me pagaron…» conserva el suyo contra el bache");
    const entrada = parseList("Leche 120", ctx(), "in");
    assert.equal(entrada[0].sign, "in", "con el bache en «entra», la línea sin verbo entra");
  });

  it("la línea sin monto cae en rojo con su duda, no se inventa", () => {
    const ds = parseList(LISTA, ctx(), "out");
    const huevos = ds[3];
    assert.equal(huevos.amountMinor, null);
    assert.ok(huevos.missing.includes("amount"), "la mesa pregunta el monto");
    const encabezado = ds[0];
    assert.equal(encabezado.concept, "Compras", "hasta el encabezado es una línea: cae en rojo y se descarta en un toque");
    assert.ok(encabezado.missing.includes("amount"));
  });

  it("el silencio heredado: «2 tacos 60» no inventa monto (dos números, ninguno manda)", () => {
    const [d] = parseList("2 tacos 60", ctx(), "out");
    assert.equal(d.amountMinor, null);
    assert.ok(d.missing.includes("amount"));
    assert.equal(d.raw, "2 tacos 60", "la línea queda a la vista para corregirla en la mesa");
  });
});

describe("ola3 · la puerta de la lista: asiento, receta y tema", () => {
  it("el asiento capture.list es Esencial, como su bandeja", () => {
    assert.equal(FEATURES["capture.list"], "esencial");
    assert.equal(FEATURES["capture.list"], FEATURES["capture.tray"]);
  });

  it("la puerta interpreta con parseList y comete por addDrafts; jamás escribe una línea", () => {
    const src = readFileSync(new URL("../../components/faro/capture-list.tsx", import.meta.url), "utf8");
    assert.match(src, /parseList\(/, "la hoja llama al intérprete de listas");
    assert.match(src, /addDrafts/, "comete por la receta de la bandeja");
    assert.ok(!/upsertLine/.test(src), "la puerta no escribe líneas del libro");
  });

  it("las tres puertas son la misma hoja (formularios ×2 y la bandeja)", () => {
    const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
    const tray = readFileSync(new URL("../../components/faro/tray.tsx", import.meta.url), "utf8");
    assert.equal((screens.match(/<ListEntry \/>/g) ?? []).length, 2, "LineForm y QuickAdd llevan la puerta");
    assert.match(tray, /CaptureListSheet/, "la bandeja abre la misma hoja");
    assert.match(tray, /data-anchor="tray-list"/, "con su botón propio en la hoja de la bandeja");
  });

  it("el tema del Manual nace con la puerta y su ancla existe en la fila", () => {
    const tp = MANUAL_TOPICS.find((t) => t.id === "captura-lista");
    assert.ok(tp, "el tema captura-lista existe");
    assert.equal(tp!.go?.anchor, "capture-list-add");
    const src = readFileSync(new URL("../../components/faro/capture-list.tsx", import.meta.url), "utf8");
    assert.match(src, /data-anchor="capture-list-add"/, "el ancla del tema se rinde en la puerta");
    assert.ok(tp!.bubble, "el tema nace con su burbuja breve");
  });
});
