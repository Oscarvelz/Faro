/**
 * vigilancia-superficie — la cerca de la Ola 33 en canon (1.3.496):
 * la superficie proactiva de Central y la cura del recordatorio.
 *
 * Lo que se cerca:
 *  1. LA VERRUGA DEL RECORDATORIO (446): una cuota con monto 0 es un
 *     recordatorio, no un pago — ni «Pagos que se acercan» (dueAlerts)
 *     ni el «llega» de vigilancia() la anuncian como «$0.00». La
 *     ventana (duesWindow) no se toca: otros consumidores cuentan la
 *     entrada sin sumarla.
 *  2. LA SUPERFICIE: la tarjeta DriftCard presenta driftCandidates
 *     (con las supresiones del libro) y las dos clases de vigilancia()
 *     sin superficie (no-llego, sin-programar); lo que llega NO se
 *     repite (ya vive en «Pagos que se acercan»). Las supresiones
 *     viven en los ajustes del libro (driftMuted / vigilMuted) y la
 *     llave de vigilancia se corta al mes: el episodio del mes
 *     próximo vuelve solo.
 *  3. EL ASIENTO: central.drift en Esencial, como las demás tarjetas
 *     de avisos de Central.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { createInitial } from "./defaults.ts";
import { dueAlerts } from "./autopay.ts";
import { vigilancia } from "./relato.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function libro(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = { lines: [
    line({ id: "rec-luz", kind: "expense-fixed" as LineKind, concept: "Recordatorio luz", amountMinor: 0, categoryId: "f-casa", subId: "f.casa.servicios", recurring: true, nextDue: "2026-10-24", bookedOn: "2026-09-24" }),
    line({ id: "internet", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-24", bookedOn: "2026-09-24" }),
  ] };
  ledger.settings.display = "USD";
  return ledger;
}

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("vigilancia-superficie · la verruga del recordatorio (446)", () => {
  it("dueAlerts no anuncia el recordatorio de $0.00 y sí el pago real", () => {
    const alerts = dueAlerts(libro(), TODAY);
    assert.ok(!alerts.some((a) => a.name === "Recordatorio luz"), JSON.stringify(alerts).slice(0, 200));
    assert.ok(alerts.some((a) => a.name === "Internet" && a.amt === 4999));
  });

  it("el «llega» de vigilancia() no anuncia el recordatorio y sí el pago real", () => {
    const llega = vigilancia(libro(), KEY, "es", TODAY).filter((c) => c.kind === "llega");
    assert.ok(!llega.some((c) => c.concept === "Recordatorio luz"));
    assert.ok(llega.some((c) => c.concept === "Internet" && c.amountMinor === 4999));
  });
});

describe("vigilancia-superficie · la tarjeta y las supresiones", () => {
  const card = read("../../components/faro/drift-card.tsx");

  it("la tarjeta presenta las dos familias y honra las supresiones del libro", () => {
    assert.ok(card.includes("driftCandidates("), "la deriva entra por su función de datos");
    assert.ok(card.includes("vigilancia("), "la vigilancia de programas entra por la suya");
    assert.ok(card.includes("settings.driftMuted"), "las supresiones de la deriva viven en el libro");
    assert.ok(card.includes("settings.vigilMuted"), "las de la vigilancia, también");
    assert.ok(card.includes('c.kind !== "llega"'), "lo que llega no se repite: ya vive en «Pagos que se acercan»");
  });

  it("la llave de vigilancia se corta al mes (el episodio próximo vuelve solo)", () => {
    assert.ok(card.includes("date.slice(0, 7)"), "la llave lleva clase, concepto y mes");
  });

  it("la tarjeta nace tras los cumpleaños en Central, con su asiento y su tema", () => {
    const screens = read("../../components/faro/screens.tsx");
    assert.ok(screens.includes("<DriftCard />"), "Central monta la tarjeta");
    assert.ok(card.includes('has("central.drift")'), "la tarjeta pide su asiento");
    assert.ok(card.includes('topic="vigilancia"'), "la tarjeta lleva su mini-ayuda");
    const types = read("./types.ts");
    assert.ok(types.includes("driftMuted?: string[]") && types.includes("vigilMuted?: string[]"), "los ajustes del libro guardan las supresiones");
    const mode = read("./mode.ts");
    assert.ok(mode.includes('"central.drift": E'), "el asiento es Esencial, como los demás avisos de Central");
  });
});
