/**
 * captura360 — LA LISTA DE ESPERA (5c, 1.3.360; brief BRIEF-5C).
 * El contrato en la librería (waitlist.ts):
 *
 *  (1) EL PLAZO ES FOTO: cambiar el ajuste no mueve los deseos en curso;
 *      los nuevos nacen con el plazo nuevo.
 *  (2) LA PREGUNTA, UNA VEZ POR PLAZO: askedAt sella; renovar rearma
 *      una vez; la segunda renovación hace el deseo permanente.
 *  (3) COMPRAR NO GUARDA: nace el borrador (source "wish") y el deseo se
 *      marca bought en la misma mutación; los meses no se tocan.
 *  (4) LA CUENTA DEL AÑO CUADRA: ahorrado = Σ dejados con precio, por
 *      moneda; el comprado aparece en las piezas y no suma.
 *  (5) EL ESCENARIO ES DEL ASESOR: cabe / no cabe / sin precio = null,
 *      con la cifra de readAdvisor — un solo motor.
 *  (6) LA RECARGA: JSON → isLedgerDeep → los deseos y el ajuste viven.
 *  (7) LOS ASIENTOS: advisor.waitlist en Esencial; settings.wait-time
 *      en Ritmo.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { FEATURES } from "./mode.ts";
import { formatMoney } from "./money.ts";
import {
  addWish, askStamp, buyWish, isRipe, leaveWish, renewWish, waitHoursOf,
  wishesOf, wishScenario, yearAccount,
} from "./waitlist.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const T0 = new Date("2026-11-21T12:00:00.000Z");
const KEY = "2026-11";

function book(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  ledger.settings.display = "USD";
  ledger.drafts = [];
  return ledger;
}

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [],
    bookedOn: "2026-11-05", startedOn: "", ...partial,
  };
}

describe("captura360 · la lista de espera", () => {
  it("(1) el plazo es foto del ajuste al nacer", () => {
    let s = book();
    const a = addWish(s, { concept: "Audífonos", amountMinor: 8900, currency: "USD", store: "Amazon" }, T0);
    s = a.state;
    assert.equal(a.wish.waitHours, 48);
    assert.equal(a.wish.dueAt, "2026-11-23T12:00:00.000Z");
    s = { ...s, settings: { ...s.settings, waitHours: 24 } };
    assert.equal(waitHoursOf(s), 24);
    const b = addWish(s, { concept: "Libro", amountMinor: null, currency: "USD", store: "" }, T0);
    assert.equal(b.wish.waitHours, 24);
    // El primero conserva su promesa intacta.
    const first = wishesOf(b.state).find((w) => w.id === a.wish.id);
    assert.equal(first?.dueAt, "2026-11-23T12:00:00.000Z");
    assert.equal(first?.waitHours, 48);
  });

  it("(2) la pregunta llega una vez por plazo; la segunda renovación hace permanente", () => {
    let s = book();
    const { state, wish } = addWish(s, { concept: "Reloj", amountMinor: 12000, currency: "USD", store: "" }, T0);
    s = state;
    const t1 = new Date("2026-11-23T12:00:01.000Z"); // justo tras vencer
    assert.equal(isRipe(wish, T0), false);
    assert.equal(isRipe(wish, t1), true);
    s = askStamp(s, wish.id, t1);
    const stamped = wishesOf(s)[0];
    assert.equal(stamped?.askedAt, t1.toISOString());
    // Sellar dos veces no mueve el sello.
    s = askStamp(s, wish.id, new Date("2026-11-24T00:00:00.000Z"));
    assert.equal(wishesOf(s)[0]?.askedAt, t1.toISOString());
    // Primera renovación: rearma con SU plazo (48 h), pregunta en blanco.
    s = renewWish(s, wish.id, t1);
    const r1 = wishesOf(s)[0];
    assert.equal(r1?.renewals, 1);
    assert.equal(r1?.askedAt, "");
    assert.equal(r1?.dueAt, "2026-11-25T12:00:01.000Z");
    assert.equal(isRipe(r1!, t1), false);
    // Segunda renovación: permanente, sin más preguntas.
    const t2 = new Date("2026-11-25T12:00:02.000Z");
    s = renewWish(s, wish.id, t2);
    const r2 = wishesOf(s)[0];
    assert.equal(r2?.permanent, true);
    assert.equal(isRipe(r2!, new Date("2027-06-01T00:00:00.000Z")), false);
  });

  it("(3) comprar nace borrador de la espera y no toca los meses", () => {
    let s = book();
    s.months[KEY] = { lines: [line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 300000 })] };
    const monthsBefore = JSON.stringify(s.months);
    const { state, wish } = addWish(s, { concept: "Audífonos", amountMinor: 8900, currency: "USD", store: "Amazon" }, T0);
    s = state;
    const bought = buyWish(s, wish.id, T0);
    assert.ok(bought.draft);
    assert.equal(bought.draft?.source, "wish");
    assert.equal(bought.draft?.book, "purchase");
    assert.equal(bought.draft?.amountMinor, 8900);
    assert.match(bought.draft?.note ?? "", /Amazon/);
    assert.equal(wishesOf(bought.state)[0]?.status, "bought");
    assert.equal(JSON.stringify(bought.state.months), monthsBefore);
    // Comprar dos veces no nace dos veces.
    assert.equal(buyWish(bought.state, wish.id, T0).draft, null);
  });

  it("(4) la cuenta del año cuadra por moneda y cuenta las piezas", () => {
    let s = book();
    const mk = (concept: string, minor: number | null, cur: "USD" | "NIO") =>
      addWish(s, { concept, amountMinor: minor, currency: cur, store: "" }, T0).state;
    s = mk("A", 10000, "USD");
    s = mk("B", 5000, "USD");
    s = mk("C", 70000, "NIO");
    s = mk("D", null, "USD");
    s = mk("E", 3000, "USD");
    const [a, b, c, d, e] = wishesOf(s);
    s = leaveWish(s, a!.id, T0);
    s = leaveWish(s, b!.id, T0);
    s = leaveWish(s, c!.id, T0);
    s = leaveWish(s, d!.id, T0);
    s = buyWish(s, e!.id, T0).state;
    const acc = yearAccount(s, 2026);
    const usd = acc.saved.find((x) => x.currency === "USD");
    const nio = acc.saved.find((x) => x.currency === "NIO");
    assert.equal(usd?.minor, 15000); // A + B; D sin precio no suma; E comprado no suma
    assert.equal(nio?.minor, 70000);
    assert.equal(acc.pieces.length, 5);
    assert.equal(yearAccount(s, 2025).pieces.length, 0);
  });

  it("(5) el escenario sale de la lectura del Asesor", () => {
    let s = book();
    s.months[KEY] = {
      lines: [
        line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 300000 }),
        line({ id: "renta", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 50000 }),
      ],
    };
    const names = makeNamer(s.structure, "es");
    const reading = readAdvisor(s, KEY, "es", names, { today: new Date("2026-11-21T12:00:00") });
    const fits = addWish(s, { concept: "Libro", amountMinor: 10000, currency: "USD", store: "" }, T0).wish;
    const out = wishScenario(s, KEY, fits, "es", names, new Date("2026-11-21T12:00:00"), false);
    assert.ok(out && out.length >= 1);
    assert.ok(out[0]?.includes(formatMoney(reading.left - 10000, "USD", "es")), out[0]);
    const huge = addWish(s, { concept: "Carro", amountMinor: 99999900, currency: "USD", store: "" }, T0).wish;
    const out2 = wishScenario(s, KEY, huge, "es", names, new Date("2026-11-21T12:00:00"), false);
    assert.ok(out2 && /faltaría/.test(out2[0] ?? ""), out2?.[0]);
    const noPrice = addWish(s, { concept: "Algo", amountMinor: null, currency: "USD", store: "" }, T0).wish;
    assert.equal(wishScenario(s, KEY, noPrice, "es", names, new Date("2026-11-21T12:00:00"), false), null);
  });

  it("(6) la recarga conserva deseos y ajuste", () => {
    let s = book();
    s = { ...s, settings: { ...s.settings, waitHours: 72 } };
    s = addWish(s, { concept: "Audífonos", amountMinor: 8900, currency: "USD", store: "Amazon" }, T0).state;
    const raw = JSON.stringify(s);
    const back = JSON.parse(raw) as LedgerState;
    assert.equal(isLedgerDeep(back), true);
    assert.equal(wishesOf(back).length, 1);
    assert.equal(waitHoursOf(back), 72);
  });

  it("(7) los asientos: la lista en Esencial, su plazo en Ritmo", () => {
    const f = FEATURES as Record<string, string>;
    assert.equal(f["advisor.waitlist"], "esencial");
    assert.equal(f["settings.wait-time"], "ritmo");
  });
});
