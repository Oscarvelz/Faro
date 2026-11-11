// El proyector del escritorio (1.3.217): la orden de Oscar (2026-11-11
// 07:27 EST, dos fotos de Central) — el clúster del proyector de la
// banda de Ahorros del escritorio (las tres tarjetas Meta / Retiro /
// Emergencia y el panel «Si apartas») se viste Cyberpunk: material
// plano cálido bajo el respiro del color propio de cada bolsillo, el
// deslizador como la palanca plana de la 1.3.208, las fichas planas
// con la elegida en la gramática de selección de la 1.3.199 entera
// (marco pleno, lavado doblado, barra inferior de 3px) y Rajdhani en
// nombres y cifras. La cerca es la superficie del escritorio
// (.save-band.sav-scope sin .is-records): las ventanas de Libros se
// vistieron en la 1.3.208 y no cambian. La foto-banda del mar de cada
// tarjeta es un cuadro, no un acabado: ninguna regla la toca.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const cyber = fs.readFileSync(new URL("../../components/faro/cyberpunk.css", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

const sectionStart = cyber.lastIndexOf("/*", cyber.indexOf("1.3.217:"));
const sectionEnd = cyber.indexOf("1.3.220:", sectionStart);
const block = cyber.slice(sectionStart, sectionEnd > sectionStart ? sectionEnd : undefined); // la sección cerraba la hoja hasta que la 1.3.220 añadió la suya
const paint = block.replace(/\/\*[\s\S]*?\*\//g, "");
const FENCE = 'html[data-theme="cyberpunk"] .save-band.sav-scope:not(.is-records)';

describe("proyector 217: la cerca", () => {
  it("el bloque existe y cada regla vive cercada a la superficie del escritorio en este tema", () => {
    assert.ok(sectionStart > 0, "la sección de la 1.3.217 debe existir en la hoja del tema");
    const selectors = block.split("\n").filter((l) => l.trimEnd().endsWith("{") && !l.trim().startsWith("/*") && !l.trim().startsWith("*"));
    assert.ok(selectors.length >= 9, "el bloque trae su familia de reglas");
    for (const s of selectors) assert.ok(s.includes(FENCE), `regla fuera de la cerca del escritorio: ${s.trim()}`);
  });

  it("el bloque no asigna ningún color: --seg y --sav se leen, jamás se reescriben", () => {
    assert.ok(!/--(seg|sav|save|accent|tone|cp-panel)\s*:/.test(paint), "«manteniendo sus colores»: los tokens se leen con var(), jamás se asignan");
  });

  it("fuera quedan la cabecera de la banda (1.3.218), la barra de proporción y los vecinos del panel", () => {
    for (const out of [".save-head", ".save-word", ".bank-tap", ".save-track", ".save-ledger", ".span-cut", ".save-more", ".save-flow", ".save-view"]) {
      assert.ok(!paint.includes(out), `fuera de la orden: ${out}`);
    }
  });
});

describe("proyector 217: las tres tarjetas", () => {
  it("material plano cálido bajo el respiro del 8% del color propio, en el sistema de 2px", () => {
    assert.ok(block.includes(".save-seg {\n  background:\n    linear-gradient(180deg, color-mix(in oklab, var(--seg, #8fb9a6) 8%, transparent) 0%, transparent 46%),\n    var(--cp-panel);\n  border-radius: 2px;\n}"), "tarjetas: el material de la ciudad bajo el respiro del bolsillo, radio 2px");
  });

  it("nombre, cifra y porcentaje hablan Rajdhani", () => {
    assert.ok(block.includes(".save-seg :is(strong, .num, small) {\n  font-family: var(--cp-display);\n}"), "la cara de la ciudad en los tres textos de la tarjeta");
    assert.ok(block.includes(".save-seg .num {\n  font-weight: 600; letter-spacing: .01em;\n}"), "la cifra con el peso de las cifras de la casa");
  });

  it("la costura: la foto-banda del mar es un cuadro — ninguna regla la toca ni la recorta", () => {
    assert.ok(!/\.save-seg b/.test(paint), "ninguna regla del bloque apunta al elemento del cuadro");
    assert.ok(!paint.includes("svg"), "las olas del cuadro no se nombran");
    assert.ok(!paint.includes("clip-path"), "el vestido no recorta: el cuadro conserva su forma y su chaflán propio");
    assert.ok(styles.includes(".save-seg b.save-band { position: relative; overflow: hidden; background: linear-gradient(135deg"), "la pintura base del cuadro sobrevive intacta para los demás temas");
  });

  it("la ceremonia de la 1.3.199 queda intacta: el bloque no anima nada, y menos la cifra", () => {
    assert.ok(!paint.includes("animation"), "el vestido es acabado, no movimiento: ninguna regla del bloque anima");
    assert.ok(cyber.includes(".save-seg[aria-pressed=\"true\"] { animation: cp-save-frame .28s steps(1) 1; }"), "la ceremonia de las naves conserva su regla de la 1.3.199");
  });
});

describe("proyector 217: el panel «Si apartas»", () => {
  it("el panel toma el mismo material con el respiro del bolsillo que proyecta; la luz interior muere", () => {
    assert.ok(block.includes(".vault-lever {\n  background:\n    linear-gradient(180deg, color-mix(in oklab, var(--seg, #d5e2ea) 8%, transparent) 0%, transparent 46%),\n    var(--cp-panel);\n  border-radius: 2px;\n  box-shadow: 0 12px 20px rgb(0 0 0 / .38);\n}"), "panel: material plano, radio 2px, solo profundidad negra");
  });

  it("el deslizador es la palanca plana de la 1.3.208: relleno plano y disco plano con llave oscura", () => {
    assert.ok(block.includes(".vault-lever-rail i::after { background: var(--seg, #d5e2ea); box-shadow: 0 0 10px color-mix(in oklab, var(--seg, #d5e2ea) 65%, transparent); }"), "el relleno blanco-iluminado se vuelve riel plano en el color del bolsillo (1.3.219: con su resplandor suave)");
    assert.ok(block.includes(".vault-lever-rail b {\n  background: var(--seg, #d5e2ea);\n  box-shadow: 0 0 9px color-mix(in oklab, var(--seg, #d5e2ea) 50%, transparent), 0 2px 6px rgb(0 0 0 / .55), inset 0 0 0 1.5px rgb(11 10 8 / .38);\n}"), "la bola radial brillante se vuelve disco impreso del mismo color (1.3.219: con el halo suave de la ley base por delante de su profundidad y su llave)");
    assert.ok(!paint.includes("radial-gradient"), "ningún brillo radial sobrevive en el bloque");
  });

  it("solo dos degradados viven en el bloque: los dos respiros de panel", () => {
    assert.equal(paint.split("linear-gradient").length - 1, 2, "tarjetas y panel respiran; nada más lleva degradado");
  });

  it("las fichas se aplanan a fondo oscuro con marco del bolsillo al 38%, en el sistema de 2px", () => {
    assert.ok(block.includes(".vault-lever-read > div :is(span, .vault-mark) {\n  background: #14100b;\n  border-color: color-mix(in oklab, var(--seg, #d5e2ea) 38%, transparent);\n  border-radius: 2px;\n}"), "fichas: fondo oscuro plano, marco callado, radio 2px");
  });

  it("la ficha elegida toma la gramática de la 1.3.199 entera: marco pleno, lavado doblado y barra de 3px", () => {
    assert.ok(block.includes(".vault-lever-read > div .vault-mark.is-on {\n  background: color-mix(in oklab, var(--seg, #d5e2ea) 22%, #14100b);\n  border-color: var(--seg, #d5e2ea);\n  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--seg, #d5e2ea) 70%, transparent), inset 0 -3px 0 var(--seg, #d5e2ea);\n}"), "la elegida: marco a plena fuerza, lavado al 22% y la barra inferior de 3px en su color");
  });

  it("las cifras y las etiquetas del proyector hablan Rajdhani", () => {
    assert.ok(block.includes(".vault-lever .num {\n  font-family: var(--cp-display); font-weight: 600; letter-spacing: .01em;\n}"), "la cifra mayor y las de las fichas toman la fuente de la ciudad");
    assert.ok(block.includes(".vault-lever-read > div :is(em, .vault-year-btn) {\n  font-family: var(--cp-display);\n}"), "las etiquetas SEMANA / MES / AÑO y el control de años toman la fuente de la ciudad");
    assert.ok(block.includes(".vault-lever-flat .vault-year-btn {\n  font-family: var(--cp-display);\n}"), "el control de años del estado cerrado también");
  });
});

describe("proyector 217: lo que no se tocó", () => {
  it("el vestido de las ventanas de Libros (1.3.208) sobrevive intacto en la misma hoja", () => {
    assert.ok(cyber.includes('html[data-theme="cyberpunk"] .save-band.is-records .vault-lever-rail i::after { background: var(--seg, #d5e2ea); box-shadow: 0 0 10px color-mix(in oklab, var(--seg, #d5e2ea) 65%, transparent); }'), "la palanca de las ventanas conserva su regla de la 1.3.208 (con el resplandor de la 1.3.219)");
    assert.ok(cyber.includes('html[data-theme="cyberpunk"] .save-band.is-records :is(.save-ledger, .save-view, .save-more, .vault-lever) {'), "los paneles de las ventanas conservan su regla de la 1.3.208");
  });

  it("la pintura base del clúster sobrevive intacta para los demás temas", () => {
    assert.ok(styles.includes(".vault-lever { position: relative; display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 12px; align-items: center; padding: 14px 14px 14px 8px; border-radius: 24px;"), "el panel base conserva su burbuja de 24px fuera de este tema");
    assert.ok(styles.includes("background: radial-gradient(circle at 35% 30%, #fff, var(--seg, #d5e2ea) 58%"), "la bola base conserva su brillo fuera de este tema");
    assert.ok(styles.includes(".save-seg .num { font-family: var(--font-serif);"), "la cifra serif de las tarjetas es la base de los demás temas");
  });
});
