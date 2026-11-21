/**
 * Captura Inteligente — EL VIGILANTE DE FIJOS QUE SUBEN (mapa §19.3,
 * brief BRIEF-VIGILANTE-FIJOS, ola 1.3.366). La aceptación del brief
 * sobre un libro calculado a mano: un fijo que cambia este mes avisa
 * una vez y calla al siguiente (el monto nuevo ES el patrón); las dos
 * clases no se mezclan (el producto bajo el 5% no existe, el de 15%
 * sí); la ventana de 12 meses se respeta; la lista ordena por impacto
 * y declara su corte; y el saldo proyectado lee el monto nuevo.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { currentFixedChanges, priceWatch, windowStart } from "./prices";
import { projectWalk } from "./projection";
import { FEATURES } from "./mode";
import { findTopic } from "../manual/topics";
import { NEWS } from "./novedades";
import { createInitial } from "./defaults";
import type { LedgerState, Line } from "./types";

const TODAY = "2026-11-21";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: "",
    monthKey: "2026-11",
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

/** El libro de la aceptación (hoy = 2026-11-21, ventana desde
 * 2025-11-21): Internet fijo $60 → $68 ESTE mes; la Luz $45 → $50 en
 * octubre; la Renta quieta en $900; la Leche +15% entre compras; el
 * Arroz +3% (el temblor que no entra); el Café +40% pero fuera de la
 * ventana (su cambio es de 2025-10-01). */
function specimen(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  const put = (mk: string, l: Line) => {
    (ledger.months[mk] ??= { lines: [] }).lines.push({ ...l, monthKey: mk });
  };
  const fixed = (id: string, concept: string, minor: number, on: string, kind: Line["kind"] = "expense-fixed") =>
    line({ id, kind, concept, amountMinor: minor, bookedOn: on });
  put("2026-09", fixed("net-9", "Internet", 6000, "2026-09-05"));
  put("2026-10", fixed("net-10", "Internet", 6000, "2026-10-05"));
  put("2026-11", fixed("net-11", "Internet", 6800, "2026-11-05"));
  put("2026-08", fixed("luz-8", "Luz", 4500, "2026-08-10", "subscription"));
  put("2026-09", fixed("luz-9", "Luz", 4500, "2026-09-10", "subscription"));
  put("2026-10", fixed("luz-10", "Luz", 5000, "2026-10-10", "subscription"));
  put("2026-09", fixed("ren-9", "Renta", 90000, "2026-09-01"));
  put("2026-10", fixed("ren-10", "Renta", 90000, "2026-10-01"));
  put("2026-11", fixed("ren-11", "Renta", 90000, "2026-11-01"));
  const buy = (id: string, concept: string, minor: number, on: string) =>
    line({ id, kind: "purchase", concept, amountMinor: minor, storeId: "super-1", bookedOn: on });
  put("2026-10", buy("lec-10", "Leche", 20000, "2026-10-03"));
  put("2026-11", buy("lec-11", "Leche", 23000, "2026-11-03"));
  put("2026-10", buy("arr-10", "Arroz", 1000, "2026-10-02"));
  put("2026-11", buy("arr-11", "Arroz", 1030, "2026-11-02"));
  put("2025-09", buy("caf-9", "Café", 50000, "2025-09-01"));
  put("2025-10", buy("caf-10", "Café", 70000, "2025-10-01"));
  return ledger;
}

test("366 · la ventana de 12 meses (F-V2), con el día ajustado", () => {
  assert.equal(windowStart("2026-11-21"), "2025-11-21");
  assert.equal(windowStart("2024-02-29"), "2023-02-28");
});

test("366 · el aviso: solo el fijo que cambió ESTE mes, una vez (F-V3, cerca 2)", () => {
  const now = currentFixedChanges(specimen(), TODAY);
  assert.equal(now.length, 1);
  assert.equal(now[0]!.name, "Internet");
  assert.equal(now[0]!.from.minor, 6000);
  assert.equal(now[0]!.to.minor, 6800);
  assert.equal(now[0]!.deltaMinor, 800);
  // Al mes siguiente, el mismo cambio ya es historia: silencio.
  assert.equal(currentFixedChanges(specimen(), "2026-12-03").length, 0);
  // La Luz cambió en octubre: no es del mes en curso, no avisa.
  assert.ok(!now.some((c) => c.name === "Luz"));
});

test("366 · dicho el cambio, el monto nuevo ES el patrón (cerca 5)", () => {
  const ledger = specimen();
  (ledger.months["2026-12"] ??= { lines: [] }).lines.push(
    line({ id: "net-12", kind: "expense-fixed", concept: "Internet", amountMinor: 6800, bookedOn: "2026-12-05", monthKey: "2026-12" }),
  );
  // Diciembre trae el monto nuevo: no hay cambio nuevo que avisar.
  assert.equal(currentFixedChanges(ledger, "2026-12-21").length, 0);
  // Y el saldo proyectado camina el fijo con su monto nuevo, no el viejo.
  const walk = projectWalk(specimen(), TODAY);
  const net = walk.events.filter((e) => e.name === "Internet");
  assert.ok(net.length > 0);
  assert.ok(net.every((e) => e.minor === -6800));
});

test("366 · Estudio: las clases no se mezclan y la ventana manda (cercas 1 y F-V1/F-V2)", () => {
  const w = priceWatch(specimen(), TODAY);
  const names = w.rows.map((r) => r.name);
  assert.deepEqual(names, ["Leche", "Internet", "Luz"]); // por impacto: 3000 > 800 > 500
  assert.ok(!names.includes("Arroz")); // +3%: el temblor normal no entra
  assert.ok(!names.includes("Café")); // su cambio quedó fuera de los 12 meses
  assert.ok(!names.includes("Renta")); // nunca se movió
  const leche = w.rows[0]!;
  assert.equal(leche.cls, "product");
  assert.equal(leche.deltaBp, 1500);
  assert.equal(w.total, 3);
  assert.equal(w.hidden, 0);
});

test("366 · la lista declara su corte, nunca finge completitud (cerca 4)", () => {
  const w = priceWatch(specimen(), TODAY, 2);
  assert.equal(w.rows.length, 2);
  assert.equal(w.total, 3);
  assert.equal(w.hidden, 1);
});

test("366 · la escalera del grupo trae el ancla y las apariciones de la ventana", () => {
  const w = priceWatch(specimen(), TODAY);
  const net = w.rows.find((r) => r.name === "Internet")!;
  assert.deepEqual(net.series.map((o) => o.minor), [6000, 6000, 6800]);
  assert.deepEqual(net.series.map((o) => o.on), ["2026-09-05", "2026-10-05", "2026-11-05"]);
});

test("366 · asientos: las dos superficies son de Completo (interpretar)", () => {
  assert.equal(FEATURES["advisor.price-watch"], "completo");
  assert.equal(FEATURES["study.prices"], "completo");
});

test("366 · el paquete anti-huérfanas: tema del Manual y nota de Novedades", () => {
  const topic = findTopic("cambios-precio");
  assert.ok(topic);
  assert.equal(topic!.mode, "completo");
  assert.deepEqual(topic!.keys, ["study.prices", "advisor.price-watch"]);
  const note = NEWS.find((n) => n.version === "1.3.366");
  assert.ok(note);
  assert.equal(note!.level, "grande");
  assert.equal(note!.topic, "cambios-precio");
});
