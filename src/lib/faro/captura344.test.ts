/* Captura Inteligente · Ola 4 — la moneda invitada (F7, fallos D2/D3).
 *
 * La invitada es SOLO LECTURA: vive en la capa que pinta y jamás en una
 * línea ni en un total. Esta cerca guarda las cuatro promesas del mapa:
 * la triangulación por el dólar redondea UNA sola vez; el viaje de ida y
 * vuelta no crea ni destruye más de un centavo; los campos nuevos de
 * Ajustes sobreviven la validación del libro (y su forma mala lo manda a
 * cuarentena); y las superficies nacen con su asiento declarado. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toGuestMinor, fromGuestMinor, formatGuest, guestDef, GUEST_CURRENCIES } from "./money.ts";
import { isLedgerDeep, createInitial } from "./defaults.ts";
import { FEATURES } from "./mode.ts";

const RATE_E4 = 365000; // C$36.50 por dólar

describe("captura344 · la conversión triangula con un solo redondeo", () => {
  it("desde dólares es directo; desde córdobas pasa por el dólar sin redondear", () => {
    assert.equal(toGuestMinor(10000, "USD", RATE_E4, 0.92, "EUR"), 9200); // $100 → €92.00
    assert.equal(toGuestMinor(36500, "NIO", RATE_E4, 0.92, "EUR"), 920); // C$365 = $10 → €9.20
    // Un solo redondeo: C$100 = $2.7397… × 0.92 = €2.5205… → 252. El camino
    // con redondeo intermedio ($2.74 → €2.5208) daría lo mismo aquí; el caso
    // que separa es C$1: $0.02739 × 0.92 = €0.0252 → 3 centavos; redondeando
    // el dólar primero ($0.03) daría €0.0276 → 3 también; se fija el exacto:
    assert.equal(toGuestMinor(100, "NIO", RATE_E4, 0.92, "EUR"), 3);
    assert.equal(toGuestMinor(50, "NIO", RATE_E4, 0.92, "EUR"), 1); // C$0.50 → €0.0126 → 1
  });
  it("el yen no tiene centavos: sus minor son unidades", () => {
    assert.equal(guestDef("JPY").dec, 0);
    assert.equal(toGuestMinor(10000, "USD", RATE_E4, 155, "JPY"), 15500); // $100 → ¥15,500
    assert.equal(formatGuest(15500, "JPY", "en"), "¥15,500");
    assert.equal(formatGuest(9200, "EUR", "en"), "€92.00");
    assert.equal(formatGuest(-500, "EUR", "en"), "-€5.00");
  });
  it("la ida y vuelta no crea ni destruye más de un centavo", () => {
    for (const minor of [1, 7, 99, 100, 501, 12345, 999999, 7654321]) {
      for (const [code, per] of [["EUR", 0.92], ["GBP", 0.79], ["MXN", 17.1], ["CRC", 512.3]] as const) {
        const there = toGuestMinor(minor, "USD", RATE_E4, per, code);
        const back = fromGuestMinor(there, per, code);
        assert.ok(Math.abs(back - minor) <= 1, `${code} ${minor} → ${there} → ${back}`);
      }
    }
  });
  it("una tasa rota pinta cero, nunca NaN", () => {
    assert.equal(toGuestMinor(10000, "USD", RATE_E4, 0, "EUR"), 0);
    assert.equal(toGuestMinor(10000, "NIO", 0, 0.92, "EUR"), 0);
    assert.equal(GUEST_CURRENCIES[0].code, "EUR"); // la sugerida va primero
  });
});

describe("captura344 · los campos de la invitada sobreviven en el libro", () => {
  it("un libro con invitada sana pasa la validación; la forma mala, no", () => {
    const base = createInitial("es", "claro");
    const withGuest = { ...base, settings: { ...base.settings, guestCur: "EUR", guestRate: { per: 0.92, asOf: "2026-11-20", source: "BCE" } } };
    assert.equal(isLedgerDeep(withGuest), true);
    const bad = { ...base, settings: { ...base.settings, guestCur: "EUR", guestRate: { per: "0.92", asOf: "2026-11-20", source: "BCE" } } };
    assert.equal(isLedgerDeep(bad as never), false);
    const noGuest = createInitial("es", "claro");
    assert.equal(isLedgerDeep(noGuest), true); // ausente = sin invitada, válido
  });
});

describe("captura344 · las puertas de la invitada", () => {
  const provider = readFileSync(new URL("../../components/faro/provider.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../../components/faro/shell.tsx", import.meta.url), "utf8");
  const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
  it("el asiento nació declarado en Esencial, como el de la moneda de vista", () => {
    assert.equal(FEATURES["settings.guest-currency"], "esencial");
    assert.equal(FEATURES["settings.guest-currency"], FEATURES["settings.view-currency"]);
  });
  it("la pintura pasa por el embudo del provider: fmt convierte solo si la vista está activa", () => {
    assert.match(provider, /guestActive && guest && s\) return formatGuest\(toGuestMinor/);
    assert.match(provider, /const \[guestOn, setGuestOn\] = useState\(false\)/); // la vista es de la sesión (D3)
    assert.match(provider, /api\.frankfurter\.app/); // la tasa pública del BCE
    assert.match(provider, /source === "manual"/); // la tasa manual nunca se pisa
  });
  it("la moneda: el doble toque salta a la invitada y el toque simple sigue alternando al instante", () => {
    assert.match(shell, /const onCoin = \(\) =>/);
    assert.match(shell, /coinTapAt\.current < 320/);
    assert.match(shell, /faro\.guestOn \? " is-guest"/);
    assert.match(shell, /faro\.openGuestConfig\(\)/); // sin invitada, el doble toque abre su configuración
    // El ref del doble toque vive ANTES del retorno de arranque (splash):
    // un hook tras un retorno condicional rompe el orden de hooks en
    // cuanto la sesión llega y la app amanece en blanco (cazado en el
    // banco de esta misma ola, antes de publicar).
    assert.ok(shell.indexOf("const coinTapAt") < shell.indexOf("if (!ready || !session)"), "coinTapAt antes del retorno splash");
  });
  it("el pliegue de Ajustes vive en «La app» con su ancla y su selector", () => {
    assert.match(screens, /<Fold id="guest"/);
    assert.match(screens, /GUEST_CURRENCIES\.filter/);
    assert.match(screens, /guestRate: \{ per, asOf: new Date\(\)\.toISOString\(\)\.slice\(0, 10\), source: "manual" \}/);
  });
});
