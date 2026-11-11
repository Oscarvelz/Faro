// La banda de Ahorros y su menú Todas (1.3.220): la orden de Oscar
// (2026-11-11 07:28 EST, dos fotos de Central) — «Preserving the same
// color, upgrade the look of ours and its menu. Same. Upgrade in
// Cyberpunk only.» El medallón morado brillante, el título en serif,
// la pista en pastilla, el panel burbuja de 24px y el primario oscuro
// del formulario CUENTA NUEVA se visten de Cyberpunk en la cerca del
// escritorio (.save-band.sav-scope sin .is-records — las ventanas de
// Libros se vistieron en la 1.3.208 y no se tocan; las tarjetas y la
// palanca dentro de la banda son territorio 217/219). LA CLÁUSULA DE
// PRESERVACIÓN: en esta superficie el morado manda sobre el amarillo
// primario del tema — el medallón se aplana al color identidad mismo
// (#894ed6, que llega por --sav desde colors.ts), el panel lo respira
// al 8% y los primarios del formulario se quedan MORADOS, planos.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const cyber = fs.readFileSync(new URL("../../components/faro/cyberpunk.css", import.meta.url), "utf8");
const colors = fs.readFileSync(new URL("./colors.ts", import.meta.url), "utf8");
const at = cyber.indexOf("1.3.220");
const block = cyber.slice(at);
const FENCE = "html[data-theme=\"cyberpunk\"] .save-band.sav-scope:not(.is-records)";

describe("ahorros 220: la banda y su menú Todas, morado preservado", () => {
  it("la identidad es #894ed6 y llega por --sav desde colors.ts", () => {
    assert.ok(colors.includes("export const SAVINGS_PURPLE = \"#894ed6\""), "SAVINGS_PURPLE intacto");
    assert.ok(block.includes("var(--sav, #894ed6)"), "la cerca lee --sav con el identidad de reserva");
  });

  it("toda regla del bloque vive dentro de la cerca del escritorio", () => {
    const selectors = block.split("\n").filter((l) => l.startsWith("html[data-theme=\"cyberpunk\"]"));
    assert.ok(selectors.length >= 10, `el bloque trae sus reglas (${selectors.length})`);
    for (const s of selectors) assert.ok(s.startsWith(FENCE), `regla fuera de la cerca: ${s}`);
    assert.ok(!block.includes(".save-band.is-records .save-more"), "el panel de Libros (208) no se reviste aquí");
  });

  it("el color se lee, jamás se asigna: ni --sav ni --seg se declaran en el bloque", () => {
    assert.ok(!/--sav\s*:/.test(block), "--sav no se asigna");
    assert.ok(!/--seg\s*:/.test(block), "--seg no se asigna");
  });

  it("el medallón se aplana al morado identidad, sin degradado, con sola profundidad negra", () => {
    assert.ok(block.includes(`${FENCE} .bank-tap {\n  background: var(--sav, #894ed6);\n  box-shadow: 0 2px 5px rgb(0 0 0 / .35);\n}`), "medallón plano en var(--sav)");
    const tap = block.slice(block.indexOf(`${FENCE} .bank-tap {`), block.indexOf("}", block.indexOf(`${FENCE} .bank-tap {`)));
    assert.ok(!tap.includes("gradient"), "la esfera radial murió");
  });

  it("el título habla Rajdhani y su estado abierto conserva el color sin el resplandor", () => {
    assert.ok(block.includes(`${FENCE} .save-word {\n  font-family: var(--cp-display); font-weight: 600; letter-spacing: .02em;\n}`), "título en la cara de exhibición");
    assert.ok(block.includes(`${FENCE} .save-word.is-gold {\n  text-shadow: none;\n}`), "is-gold sin text-shadow");
  });

  it("el total de la banda y la línea de la meta hablan la cara de exhibición", () => {
    assert.ok(block.includes(`${FENCE} .save-head .num {\n  font-family: var(--cp-display); font-weight: 600; letter-spacing: .01em;\n}`), "total en Rajdhani");
    assert.ok(block.includes(`${FENCE} .save-head em {\n  font-family: var(--cp-display); font-style: normal;\n}`), "la meta deja la serif itálica");
  });

  it("la pista se cuadra a 2px sobre cama oscura plana; sus segmentos no se tocan", () => {
    assert.ok(block.includes(`${FENCE} .save-track {\n  background: #14100b; border-radius: 2px;\n}`), "pista plana a 2px");
    assert.ok(!block.includes(".save-track i"), "los segmentos (las partes de cada bolsillo) no llevan regla");
  });

  it("el panel Todas: fondo plano del tema con respiro morado al 8% y borde al 38%, a 2px", () => {
    assert.ok(block.includes(`${FENCE} .save-more {\n  background:\n    linear-gradient(180deg, color-mix(in oklab, var(--sav, #894ed6) 8%, transparent) 0%, transparent 46%),\n    var(--cp-panel);\n  border-color: color-mix(in oklab, var(--sav, #894ed6) 38%, var(--line));\n  border-radius: 2px;\n  box-shadow: 0 12px 20px rgb(0 0 0 / .38);\n}`), "panel en la gramática 208/213/217 con la identidad de Ahorros");
    const panel = block.slice(block.indexOf(`${FENCE} .save-more {`), block.indexOf("}", block.indexOf(`${FENCE} .save-more {`)));
    assert.ok(!panel.includes("clip-path"), "sin chamfer: la lección del pin de la 208");
  });

  it("las cifras del panel hablan Rajdhani y el pin de TODAS toma el acabado de ficha", () => {
    assert.ok(block.includes(`${FENCE} .save-more .num {\n  font-family: var(--cp-display); font-weight: 600; letter-spacing: .01em;\n}`), ".num del panel en Rajdhani");
    assert.ok(block.includes(`${FENCE} .save-more .save-ledger-head .fold-pin {\n  border-radius: 2px;\n}`), "pin cuadrado, colores de la banda intactos");
  });

  it("las filas de cuentas se aplanan a la cama oscura a 2px, con lápiz y renombre en la voz morada", () => {
    assert.ok(block.includes(`${FENCE} .save-account {\n  background: #14100b; border-radius: 2px;\n}`), "fila plana a 2px");
    assert.ok(block.includes(`${FENCE} .save-account .bank-pencil {\n  color: color-mix(in oklab, var(--sav, #aca294) 70%, var(--fg));\n}`), "lápiz en susurro morado");
    assert.ok(block.includes("border-color: color-mix(in oklab, var(--sav, #894ed6) 55%, var(--line));"), "campo de renombre con marco morado");
  });

  it("el foco de los campos es el morado identidad a plena fuerza", () => {
    assert.ok(block.includes(`${FENCE} .save-more .ah-form :is(.field, .day-field-btn):focus {\n  border-color: var(--sav, #894ed6);\n  box-shadow: 0 0 0 2px color-mix(in oklab, var(--sav, #894ed6) 35%, transparent);\n}`), "marco de foco morado");
  });

  it("el selector de imagen se aplana a 2px y su insignia + toma el radio de ficha", () => {
    assert.ok(block.includes(`${FENCE} .save-more .bank-photo-btn {\n  background: #14100b; border-radius: 2px;\n}`), "selector plano a 2px");
    assert.ok(block.includes(`${FENCE} .save-more .bank-photo-plus {\n  border-radius: 2px;\n}`), "insignia a 2px");
  });

  it("LA CLÁUSULA: los primarios del formulario se quedan morados y planos — jamás el amarillo del tema", () => {
    assert.ok(block.includes(`${FENCE} .save-more .ah-form :is(.ah-actions .btn:not(.secondary), .ah-go .btn) {\n  background: var(--sav, #894ed6);\n  color: var(--sav-ink, #fff);\n  border-color: transparent;\n  box-shadow: none;\n  border-radius: 2px;\n}`), "«+ Agregar» y Guardar en morado plano");
    assert.ok(!block.includes("background: var(--accent)"), "ningún primario amarillo en esta superficie");
  });
});
