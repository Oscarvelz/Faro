/**
 * captura356 — OLA 6 (1.3.356): avisos de pagos que se acercan y pago
 * automático, por orden de Oscar (2026-11-20). Estos especímenes juzgan
 * la librería (autopay.ts); las superficies tienen sus cercas abajo.
 *
 *  (1) EL ASENTAMIENTO: la cuota con pago automático cuya fecha llegó
 *      queda anotada sola — instancia del período, su fecha, su cuenta —
 *      y la serie la hereda.
 *  (2) IDEMPOTENCIA: correr dos veces no duplica; un período que ya
 *      tiene instancia no se toca.
 *  (3) LA VENTANA HONESTA: lo más viejo de 62 días no se asienta —
 *      Faro no inventa historia antigua; queda en Cobros.
 *  (4) LOS FRENOS: sin pago automático, sin cuenta, inactiva o sin
 *      cadencia válida, nada se mueve.
 *  (5) LOS AVISOS: la ventana única, horizonte de 3 días, lo vencido
 *      dentro, solo cuotas y tarjetas.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dueAlerts, settleAutopay } from "./autopay.ts";
import { createInitial } from "./defaults.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const TODAY = "2026-11-20";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: "2026-11", currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function cuota(id: string, monthKey: string, due: string, extra: Partial<Line> = {}): Line {
  return line({
    id, kind: "subscription" as LineKind, concept: "Netflix", amountMinor: 1299,
    seriesId: "netflix", monthKey, recurring: true, cadence: "monthly",
    nextDue: due, bookedOn: due, ...extra,
  });
}

function book(months: Record<string, Line[]>): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  for (const [k, lines] of Object.entries(months)) ledger.months[k] = { lines };
  ledger.settings.display = "USD";
  return ledger;
}

const AUTO = { autopay: true, autopayAccountId: "acct-banco" } as Partial<Line>;

describe("356 · el pago automático asienta al abrir", () => {
  it("(1) el período vencido sin instancia queda anotado, con su cuenta", () => {
    const st = book({
      "2026-09": [cuota("n-sep", "2026-09", "2026-09-15", AUTO)],
      "2026-10": [cuota("n-oct", "2026-10", "2026-10-15", AUTO)],
    });
    const { state, settled } = settleAutopay(st, TODAY);
    assert.equal(settled.length, 1);
    assert.equal(settled[0]!.on, "2026-11-15");
    assert.equal(settled[0]!.accountId, "acct-banco");
    const inst = state.months["2026-11"]!.lines.find((l) => l.seriesId === "netflix");
    assert.ok(inst, "la instancia de noviembre existe");
    assert.equal(inst!.sourceId, "acct-banco");
    assert.equal(inst!.bookedOn, "2026-11-15");
    assert.equal(inst!.autopay, true, "la serie hereda la configuración");
    assert.equal(inst!.amountMinor, 1299);
  });

  it("(2) correr dos veces no duplica nada", () => {
    const st = book({ "2026-10": [cuota("n-oct", "2026-10", "2026-10-15", AUTO)] });
    const once = settleAutopay(st, TODAY);
    assert.equal(once.settled.length, 1);
    const twice = settleAutopay(once.state, TODAY);
    assert.equal(twice.settled.length, 0);
    assert.equal(twice.state, once.state, "sin cambios, el mismo objeto");
  });

  it("(1b) dos períodos perdidos dentro de la ventana se asientan en orden", () => {
    const st = book({ "2026-09": [cuota("n-sep", "2026-09", "2026-09-15", AUTO)] });
    const { settled } = settleAutopay(st, TODAY);
    assert.deepEqual(settled.map((s) => s.on), ["2026-10-15", "2026-11-15"]);
  });

  it("(3) lo más viejo que la ventana no se asienta", () => {
    const st = book({ "2026-06": [cuota("n-jun", "2026-06", "2026-06-15", AUTO)] });
    const { settled } = settleAutopay(st, TODAY);
    assert.deepEqual(settled.map((s) => s.on), ["2026-10-15", "2026-11-15"]);
  });

  it("(4) los frenos: apagado, sin cuenta, inactiva — nada se mueve", () => {
    const off = settleAutopay(book({ "2026-10": [cuota("a", "2026-10", "2026-10-15")] }), TODAY);
    assert.equal(off.settled.length, 0);
    const noAcct = settleAutopay(book({ "2026-10": [cuota("b", "2026-10", "2026-10-15", { autopay: true })] }), TODAY);
    assert.equal(noAcct.settled.length, 0);
    const dead = settleAutopay(book({ "2026-10": [cuota("c", "2026-10", "2026-10-15", { ...AUTO, active: false })] }), TODAY);
    assert.equal(dead.settled.length, 0);
  });

  it("(1c) cadencia semanal: asienta cada semana vencida, hoy incluido", () => {
    const st = book({ "2026-11": [cuota("w", "2026-11", "2026-11-06", { ...AUTO, cadence: "weekly" })] });
    const { settled } = settleAutopay(st, TODAY);
    assert.deepEqual(settled.map((s) => s.on), ["2026-11-13", "2026-11-20"]);
  });
});

describe("356 · los avisos de pagos que se acercan", () => {
  it("(5) horizonte de 3 días, lo vencido dentro, lo lejano fuera", () => {
    const st = book({
      "2026-11": [
        cuota("v", "2026-11", "2026-11-15", { id: "v" }),
        line({ id: "cerca", kind: "subscription" as LineKind, concept: "Gimnasio", amountMinor: 3000, recurring: true, cadence: "monthly", nextDue: "2026-11-23", bookedOn: "2026-10-23" }),
        line({ id: "lejos", kind: "subscription" as LineKind, concept: "Seguro", amountMinor: 9000, recurring: true, cadence: "monthly", nextDue: "2026-11-24", bookedOn: "2026-10-24" }),
      ],
    });
    const alerts = dueAlerts(st, TODAY);
    const names = alerts.map((a) => a.name);
    assert.ok(names.includes("Netflix"), "la vencida avisa");
    assert.ok(names.includes("Gimnasio"), "la de en 3 días avisa");
    assert.ok(!names.includes("Seguro"), "la de en 4 días aún no");
    assert.ok(alerts.every((a) => a.kind === "cuota" || a.kind === "card"));
  });
});


describe("356 · las superficies y sus cercas", () => {
  it("(6) los asientos existen: la tarjeta y el interruptor en Esencial, el pago automático en Ritmo", async () => {
    const { FEATURES } = await import("./mode.ts");
    const feats = FEATURES as unknown as Record<string, string>;
    assert.equal(feats["central.due-alerts"], "esencial");
    assert.equal(feats["settings.due-alerts"], "esencial");
    assert.equal(feats["editor.autopay"], "ritmo");
  });

  it("(7) el tema del Manual existe, con su puerta a la fila de Ajustes", async () => {
    const { findTopic } = await import("../manual/topics.ts");
    const tp = findTopic("avisos-pagos");
    assert.ok(tp, "el tema avisos-pagos existe");
    assert.equal(tp!.go?.anchor, "aj-due-alerts");
  });

  it("(8) la forma de la cuota lleva el pago automático tras su asiento, y el guardado lo conserva sin asiento", () => {
    const src = readFileSync(new URL("../../components/faro/line-form.tsx", import.meta.url), "utf8");
    assert.ok(src.includes('has("editor.autopay")'), "la cara obedece el asiento");
    assert.ok(src.includes("autopayEff"), "el guardado pasa por el efectivo, como payEff");
    assert.ok(src.includes("delete line.autopay"), "apagarlo lo borra de verdad, no lo resucita el esparcido");
  });

  it("(9) el proveedor asienta al abrir, solo en libros reales", () => {
    const src = readFileSync(new URL("../../components/faro/provider.tsx", import.meta.url), "utf8");
    // CURA OLA 24 (familia 3, G24-2): la llamada gana el conjunto de
    // series selladas — el pase corre con el sello por serie, no con el
    // día entero. El comportamiento clavado no cambia: asienta al abrir.
    assert.ok(src.includes("settleAutopay(session.ledger, today, sealedSeries)"), "el asentamiento corre al abrir");
    assert.ok(src.includes('dataMode() !== "real"'), "nunca en libros de ejemplo o escenario");
  });

  it("(10) la tarjeta de Central lee la ventana y obedece el interruptor", () => {
    const src = readFileSync(new URL("../../components/faro/due-alerts.tsx", import.meta.url), "utf8");
    assert.ok(src.includes("dueAlerts(session.ledger, today)"), "lee la librería de la ola");
    assert.ok(src.includes("settings.dueAlerts === false"), "el interruptor de Ajustes manda");
    const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
    assert.ok(screens.includes("<DueAlertsCard />"), "la tarjeta vive en Central");
    assert.ok(screens.includes("<DueAlertsRow />"), "la fila vive en Ajustes");
  });

  it("(11) la nota de Novedades nombra el tema y es grande", async () => {
    const { NEWS } = await import("./novedades.ts");
    const n = NEWS.find((e) => e.version === "1.3.356");
    assert.ok(n, "la nota 1.3.356 existe");
    assert.equal(n!.level, "grande");
    assert.equal(n!.topic, "avisos-pagos");
  });
});
