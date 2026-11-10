// 1.3.189 — Cyberpunk: el registro del tema y sus cercas de legibilidad.
// El tema es piel solamente: estos tests cercan (a) que quedó registrado como
// tema de noche con nombre en ambos idiomas, (b) que sus tokens escritos en
// cyberpunk.css son los de la especificación y cumplen contraste WCAG sobre
// sus propios fondos, (c) que cyberize() enciende las categorías en neón
// SIN tocar la salida de tronize() (Tron es intocable), y (d) que ningún
// archivo del tema nuevo menciona a Tron: no comparten bloque de tokens.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { cyberize, tronize, PALETTE, SAVINGS_PURPLE } from "./colors.ts";
import { translate } from "./i18n.ts";
import { contrast } from "./palette.ts";
import { DAY_THEMES, NIGHT_THEMES, THEME_IDS } from "./types.ts";

const css = fs.readFileSync(new URL("../../components/faro/cyberpunk.css", import.meta.url), "utf8");
const tronCss = fs.readFileSync(new URL("../../components/faro/tron.css", import.meta.url), "utf8");

describe("cyberpunk: registro", () => {
  it("es un tema conocido y de noche, no de día", () => {
    assert.ok(THEME_IDS.includes("cyberpunk"));
    assert.ok(NIGHT_THEMES.includes("cyberpunk"));
    assert.ok(!DAY_THEMES.includes("cyberpunk"));
  });
  it("tiene nombre en ambos idiomas y es su propio nombre (como Tron)", () => {
    assert.equal(translate("es", "theme.cyberpunk"), "Cyberpunk");
    assert.equal(translate("en", "theme.cyberpunk"), "Cyberpunk");
  });
  it("todo tema registrado tiene nombre en ambos idiomas", () => {
    for (const id of THEME_IDS) {
      assert.notEqual(translate("es", `theme.${id}`), `theme.${id}`, `falta el nombre ES de ${id}`);
      assert.notEqual(translate("en", `theme.${id}`), `theme.${id}`, `falta el nombre EN de ${id}`);
    }
  });
});

describe("cyberpunk: tokens y contraste (la legibilidad es sagrada)", () => {
  it("la hoja declara la identidad de la especificación", () => {
    assert.match(css, /--bg: #08080d/);
    assert.match(css, /--surface: #111119/);
    assert.match(css, /--accent: #fcee0a/);
    assert.match(css, /--cp-cyan: #00f0ff/);
    assert.match(css, /--cp-magenta: #ff2a6d/);
  });
  it("el texto cumple sobre los fondos del tema", () => {
    const surface = "#111119", bg = "#08080d";
    assert.ok(contrast("#eceef4", surface) >= 12, "fg sobre surface");
    assert.ok(contrast("#eceef4", bg) >= 12, "fg sobre bg (la cifra héroe)");
    assert.ok(contrast("#a2a7b8", surface) >= 7, "muted sobre surface");
    assert.ok(contrast("#7a8095", surface) >= 4.5, "faint sobre surface");
    assert.ok(contrast("#fcee0a", surface) >= 12, "el amarillo como texto");
    assert.ok(contrast("#0a0a05", "#fcee0a") >= 12, "la tinta sobre el amarillo");
    assert.ok(contrast("#00f0ff", surface) >= 10, "cian sobre surface");
    assert.ok(contrast("#ff2a6d", surface) >= 4.5, "magenta (alertas) sobre surface");
    assert.ok(contrast("#45ff7a", surface) >= 10, "good sobre surface");
    assert.ok(contrast("#ffaa3f", surface) >= 7, "warn sobre surface");
  });
});

describe("cyberpunk: las categorías se encienden sin tocar a Tron", () => {
  it("cyberize conserva el matiz y difiere del encendido de Tron", () => {
    let differ = 0;
    for (const hex of PALETTE) {
      const neon = cyberize(hex);
      assert.notEqual(neon, hex, `${hex} quedó apagado`);
      if (neon !== tronize(hex)) differ += 1;
    }
    assert.ok(differ >= 20, `solo ${differ} colores difieren del encendido Tron`);
  });
  it("Ahorros conserva su púrpura, en neón violeta propio", () => {
    assert.equal(cyberize(SAVINGS_PURPLE), "#cd7bff");
    assert.equal(tronize(SAVINGS_PURPLE), "#ba92fd", "el neón de Ahorros en Tron no se movió");
  });
  it("un color a mano conserva su matiz en hsl de neón", () => {
    assert.match(cyberize("#b7d4c4"), /^hsl\(147 100% 60%\)$/);
    assert.equal(cyberize("no-es-color"), "no-es-color");
  });
  it("ninguna hoja toca el territorio de la otra", () => {
    assert.ok(!css.includes('data-theme="tron"'), "cyberpunk.css no debe nombrar a Tron");
    assert.ok(!tronCss.includes("cyberpunk"), "tron.css no debe nombrar a Cyberpunk");
  });
});
