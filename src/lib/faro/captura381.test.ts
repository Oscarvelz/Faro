/**
 * captura381 — 1.3.381 (Oscar, 2026-11-21 07:08, recordada 19:42):
 * la tarjeta «Pagos que se acercan» se muda ARRIBA de
 * Tengo · Gastaré · Pagos y gana su quitar «por ahora».
 *
 *  (1) LA MUDANZA: en Central, la tarjeta se pinta antes que las
 *      fichas — para que estas se desplieguen normalmente.
 *  (2) EL QUITAR ES MOMENTÁNEO: quitada hoy del conjunto exacto que
 *      se mostraba, la tarjeta se oculta; mañana vuelve.
 *  (3) EL CONJUNTO MANDA: si un pago entra en la ventana o sale
 *      (se paga), la firma cambia y la tarjeta vuelve al momento.
 *  (4) SIN PAGOS NO HAY TARJETA NI OPCIÓN: pagadas todas las cuotas,
 *      el conjunto se vacía y no hay nada que mostrar ni que quitar.
 *  (5) NINGÚN INTERRUPTOR SE TOCA: la quitada escribe solo su campo;
 *      dueAlerts y los avisos del teléfono quedan como estaban.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dueAlerts, dueAlertsHidden, dueAlertsSig } from "./autopay.ts";
import { createInitial } from "./defaults.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const TODAY = "2026-11-22";
const TOMORROW = "2026-11-23";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: "2026-11", currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function cuota(id: string, due: string, concept = "Netflix"): Line {
  return line({
    id, kind: "subscription" as LineKind, concept, amountMinor: 1299,
    seriesId: id, monthKey: "2026-11", recurring: true, cadence: "monthly",
    nextDue: due, bookedOn: "2026-10-22",
  });
}

function book(lines: Line[]): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = { "2026-11": { lines } };
  ledger.settings.display = "USD";
  return ledger;
}

/** La receta exacta que corre la ✕ de la tarjeta al confirmarse. */
function dismissed(st: LedgerState, today: string): LedgerState {
  return {
    ...st,
    settings: { ...st.settings, dueAlertsDismissed: { sig: dueAlertsSig(dueAlerts(st, today)), day: today } },
  };
}

describe("381 · la tarjeta arriba y su quitar por ahora", () => {
  it("(1) la mudanza: la tarjeta se pinta antes que las fichas de Central", () => {
    const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
    const card = screens.indexOf("<DueAlertsCard />");
    const lenses = screens.indexOf('className="lenses"');
    assert.ok(card >= 0 && lenses >= 0, "ambas piezas viven en Central");
    assert.ok(card < lenses, "la tarjeta va ARRIBA de Tengo · Gastaré · Pagos");
    assert.equal(screens.split("<DueAlertsCard />").length - 1, 1, "la tarjeta se pinta una sola vez");
  });

  it("(2) quitada hoy, del conjunto exacto: se oculta — y mañana vuelve", () => {
    const st = book([cuota("n1", "2026-11-24")]);
    assert.equal(dueAlertsHidden(st, TODAY), false, "sin quitar, se muestra");
    const off = dismissed(st, TODAY);
    assert.equal(dueAlertsHidden(off, TODAY), true, "quitada hoy, oculta hoy");
    assert.equal(dueAlertsHidden(off, TOMORROW), false, "mañana vuelve sola");
  });

  it("(3) el conjunto manda: un pago nuevo o uno pagado la traen de vuelta", () => {
    const st = book([cuota("n1", "2026-11-24")]);
    const off = dismissed(st, TODAY);
    const grew = book([cuota("n1", "2026-11-24"), cuota("g1", "2026-11-25", "Gimnasio")]);
    grew.settings = off.settings;
    assert.equal(dueAlertsHidden(grew, TODAY), false, "entró un pago: la tarjeta vuelve");
    const paid = book([]);
    paid.settings = off.settings;
    assert.equal(dueAlerts(paid, TODAY).length, 0, "pagada la cuota, el conjunto se vacía");
    assert.equal(dueAlertsHidden(paid, TODAY), false, "y nada queda oculto tras una tarjeta ausente");
  });

  it("(4) la firma es el conjunto: mismo conjunto, misma firma; otro, otra", () => {
    const a = dueAlertsSig(dueAlerts(book([cuota("n1", "2026-11-24")]), TODAY));
    const b = dueAlertsSig(dueAlerts(book([cuota("n1", "2026-11-24")]), TODAY));
    const c = dueAlertsSig(dueAlerts(book([cuota("n1", "2026-11-23")]), TODAY));
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.ok(a.includes("n1") && a.includes("2026-11-24"), "la firma nombra serie y fecha");
  });

  it("(5) la quitada no toca ningún interruptor — ni el de la tarjeta ni los del teléfono", () => {
    const st = book([cuota("n1", "2026-11-24")]);
    st.settings.notify = true;
    const off = dismissed(st, TODAY);
    assert.equal(off.settings.dueAlerts, st.settings.dueAlerts, "el interruptor de Ajustes queda intacto");
    assert.equal(off.settings.notify, true, "los avisos del teléfono quedan intactos");
    assert.equal(off.settings.notifyKinds, st.settings.notifyKinds, "y sus tipos también");
    const src = readFileSync(new URL("../../components/faro/due-alerts.tsx", import.meta.url), "utf8");
    // OLA 28 (Familia 9): la ✕ ya no firma la FOTO (`alerts`) — firma
    // el conjunto VIVO dentro de la receta: un pago que entra entre
    // la foto y la confirmación queda dentro del descarte. La forma
    // clavada es la nueva; el resto del espécimen no se mueve.
    assert.ok(src.includes("dueAlertsDismissed: { sig: dueAlertsSig(dueAlerts(s, today)), day: today }"), "la ✕ escribe solo su campo, firmado desde lo vivo");
    assert.ok(src.includes('data-anchor="due-alerts-dismiss"'), "la opción de quitar vive en la tarjeta");
    assert.ok(src.includes("los avisos de tu teléfono no se tocan"), "la ventana lo dice en llano (ES)");
    assert.ok(src.includes("your phone notices are untouched"), "y en inglés (EN)");
    assert.ok(src.includes("dueAlertsHidden(session.ledger, today)"), "la tarjeta obedece la quitada");
  });

  it("(6) la nota de Novedades existe, es menor y lleva su puerta", async () => {
    const { NEWS } = await import("./novedades.ts");
    const n = NEWS.find((e) => e.version === "1.3.381");
    assert.ok(n, "la nota 1.3.381 existe");
    assert.equal(n!.level, "menor");
    assert.equal(n!.topic, "avisos-pagos");
  });
});
