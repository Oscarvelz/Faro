import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

// 1.3.193 — «La tarjeta principal» (Oscar, 2026-11-10, dos fotos en Tron): la cabecera
// de grupo del árbol se leía como una fila más — título .72rem/400 en tinta tenue,
// MENOR que los nombres de categoría que manda (16px/560), y el mismo círculo chevron
// de 22px que lleva cada fila. Estas cercas fijan contra las fuentes el diseño nuevo:
// la cabecera es una tarjeta con superficie propia (--surface-2), su medallón es de
// 24px en el acento del tema (30px en la 1.3.193 original; refinado por Oscar el
// 2026-11-10: «esto es el extremo»), su nombre lleva la clase de título y el conteo
// vive en una pastilla. A diferencia de brillo.css (1.3.190), esta hoja SÍ alcanza a Tron y a
// Cyberpunk: el diseño es una orden expresa de Oscar con fotos en Tron — la cerca lo
// comprueba en ambos sentidos.

const css = fs.readFileSync(new URL("../../components/faro/principal.css", import.meta.url), "utf8");
const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../../components/faro/shell.tsx", import.meta.url), "utf8");

describe("1.3.193 — la tarjeta principal del árbol", () => {
  it("la cabecera es una tarjeta: superficie propia, borde y radio", () => {
    assert.match(css, /\.tree-kicker\.tree-kick-row\s*\{[^}]*background:\s*var\(--surface-2\)/);
    assert.match(css, /\.tree-kicker\.tree-kick-row\s*\{[^}]*border:\s*1px solid var\(--line\)/);
    assert.match(css, /\.tree-kicker\.tree-kick-row\s*\{[^}]*border-radius:\s*16px/);
  });

  it("el medallón es de 24px en el acento — ninguna fila de debajo lo comparte", () => {
    // Refinamiento (Oscar, 2026-11-10): 30px → 24px; la jerarquía se queda,
    // el bulto se va. El acento y la receta de bola no cambian.
    // 1.3.227 (Oscar, con foto): «Tiendas y servicios» viste la burbuja —
    // es decir, una tarjeta .tree-kick-row como las de grupo, con este
    // mismo medallón dentro de su botón: no es una fila y no comparte
    // nada que la cerca no vista ya; las filas siguen con su 18px.
    assert.match(css, /\.tree-group-btn \.fold-chev\s*\{[^}]*width:\s*24px/);
    assert.match(css, /\.tree-group-btn \.fold-chev\s*\{[^}]*color:\s*var\(--accent\)/);
    assert.ok(screens.includes("cat-kick"), "screens.tsx viste la burbuja del catálogo como tarjeta de la familia");
  });

  it("el nombre lleva su clase de título y el conteo su pastilla", () => {
    assert.ok(screens.includes('className="tree-group-name"'), "screens.tsx nombra el título");
    assert.match(css, /\.tree-group-name\s*\{[^}]*font-weight:\s*650/);
    assert.match(css, /\.tree-group-count\s*\{[^}]*border-radius:\s*999px/);
    assert.match(css, /\.tree-group-count\s*\{[^}]*opacity:\s*1/);
  });

  it("la hoja alcanza a Tron y Cyberpunk — sin la cerca de brillo", () => {
    assert.ok(!css.includes(':not([data-theme="tron"])'), "principal.css no excluye a Tron");
    assert.ok(!css.includes(':not([data-theme="cyberpunk"])'), "principal.css no excluye a Cyberpunk");
    assert.match(css, /\[data-theme="tron"\]/, "la receta de noche nombra a Tron");
  });

  it("la hoja entra en la cascada tras brillo.css", () => {
    const b = shell.indexOf('import "./brillo.css"');
    const p = shell.indexOf('import "./principal.css"');
    assert.ok(b >= 0 && p > b, "principal.css se importa después de brillo.css");
  });
});
