// EL MES CON CASA (Oscar, 2026-11-13, foto 234882): el nombre del período del
// Historial flotaba desnudo entre las dos flechas y no respondía al toque.
// Lo que fijan estas cercas:
//  - la placa: el nombre vive en un BOTÓN .hist-period con la gramática del
//    panel de totales (superficie, filete, redondeo) y su letra conserva la
//    tipografía de siempre (serif 1.15rem, peso 700); su altura es la de las
//    flechas (44px) y llena el hueco entre ellas (flex: 1), así la fila del
//    navegador no crece y el trío se lee como un solo control;
//  - el toque: fuera del presente salta directo a él — setAnchor(today), el
//    mismo reinicio que applyView ya usa — y en el presente no hace nada; la
//    comparación es por el rango de la lente (semana, mes y año comparten la
//    semántica) y el aria-label nombra la acción solo cuando la hay;
//  - las flechas conservan su comportamiento (shift ±1 con sus etiquetas);
//  - el acabado por tema sigue el patrón de hist-temas.css: la placa se suma
//    a los grupos del panel de totales (Tron acero, Cyberpunk ciudad, costa,
//    océano, ion, oled, humo); el escaneo de Cyberpunk NO la toca — su
//    ::after es la ceremonia del panel, y la placa nunca se remonta;
//    (1.3.265: con la barra fundida esos acabados viven en .hist-navrow y
//    los selectores conjuntos se separaron — tres cercas de este archivo se
//    re-fijaron ese día, con su nota, y la separación la prueba barra265);
//  - la clave hist.now existe en español Y en inglés.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { translate } from "./i18n.ts";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const tsx = read("components/faro/historial.tsx");
const css = strip(read("components/faro/historial.css"));
const temas = strip(read("components/faro/hist-temas.css"));
const rule = (all: string, sel: string) => {
  const m = all.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  return m ? m[1] : "";
};

describe("el mes con casa: la placa del período", () => {
  it("el nombre del período es un botón-placa; el <strong> desnudo no sobrevive", () => {
    // RE-FIJADO 1.3.263: la clase de la placa ahora cuelga de onPresent
    // («hist-period is-now» en el presente, para que el actual vista el
    // acento del tema); sigue siendo el mismo botón-placa con goPresent —
    // la intención de esta cerca queda intacta.
    assert.match(tsx, /<button type="button" className=\{onPresent \? "hist-period is-now" : "hist-period"\} onClick=\{goPresent\}/);
    assert.ok(!tsx.includes('<strong className="hist-period">'), "el nombre desnudo no sobrevive");
  });

  it("la placa viste la gramática del panel de totales sin tocar la tipografía", () => {
    // RE-FIJADO 1.3.265: la casa cambió de piso — la gramática (superficie,
    // filete) vive ahora en la BARRA (.hist-navrow) que la barra fundida
    // heredó de la placa, con radio rectangular de 14px en vez de la
    // pastilla de 999px; la zona del nombre conserva su tipografía intacta
    // y su fondo va en transparente, porque el material es de la barra.
    // La intención de esta cerca — el nombre con casa y su letra de
    // siempre — queda intacta; la cerca nueva de la barra es barra265.
    const bar = rule(css, ".hist-navrow");
    assert.match(bar, /background: var\(--surface\)/);
    assert.match(bar, /border: 1px solid var\(--line\)/);
    assert.match(bar, /border-radius: 14px/);
    const r = rule(css, ".hist-period");
    assert.match(r, /background: transparent/);
    assert.match(r, /font-family: var\(--font-serif\)/);
    assert.match(r, /font-size: 1\.15rem/);
    assert.match(r, /font-weight: 700/);
  });

  it("la placa mide lo que las flechas (44px) y llena el hueco entre ellas", () => {
    const r = rule(css, ".hist-period");
    assert.match(r, /min-height: 44px/);
    assert.match(r, /flex: 1 1 auto/);
  });
});

describe("el mes con casa: tocar el nombre vuelve al presente", () => {
  it("goPresent es el reinicio de la casa (setAnchor(today)) guardado por onPresent", () => {
    assert.match(tsx, /const goPresent = \(\) => \{ if \(!onPresent\) setAnchor\(today\); \};/);
    // El mismo reinicio que las vistas guardadas ya usaban: la semántica no se inventa.
    assert.match(tsx, /setAnchor\(today\);\n\s*setF\(rest\);/);
  });

  it("onPresent compara el rango de la lente contra el rango de hoy (semana, mes y año)", () => {
    assert.match(tsx, /const presentRange = lens === "range" \? null : periodRange\(lens, today, weekStart\);/);
    assert.match(tsx, /const onPresent = !!presentRange && range\.from === presentRange\.from && range\.to === presentRange\.to;/);
  });

  it("el aria-label nombra la acción solo fuera del presente", () => {
    assert.match(tsx, /aria-label=\{onPresent \? undefined : t\("hist\.now"\)\}/);
    assert.equal(translate("es", "hist.now"), "Volver al presente");
    assert.equal(translate("en", "hist.now"), "Back to the present");
  });

  it("las flechas quedan como estaban: shift ±1 con sus etiquetas", () => {
    assert.match(tsx, /aria-label=\{t\("hist\.prev"\)\} onClick=\{\(\) => shift\(-1\)\}/);
    assert.match(tsx, /aria-label=\{t\("hist\.next"\)\} onClick=\{\(\) => shift\(1\)\}/);
  });
});

describe("el mes con casa: el acabado por tema sigue al panel de totales", () => {
  it("Tron viste la placa de acero, como los paneles", () => {
    // RE-FIJADO 1.3.265: el acero subió de la placa a la barra — la regla
    // conjunta «.hist-panel, .hist-period» ya no existe; el panel conserva
    // su grupo y la barra lleva el suyo. La intención (el navegador viste
    // el acero de los paneles) queda intacta.
    assert.match(temas, /\[data-theme="tron"\] \.hist-panel \{/);
    assert.match(temas, /\[data-theme="tron"\] \.hist-navrow \{\s+background: var\(--t-steel\);/);
  });

  it("Cyberpunk viste la placa de ciudad (corte y corchetes) junto a los totales", () => {
    // RE-FIJADO 1.3.265: los selectores que pintaban «.hist-totals,
    // .hist-period» juntos se separaron — los totales conservan su ciudad
    // palabra por palabra y la barra viste la misma ciudad extendida a
    // todo el ancho (corte y corchetes), en su propia regla.
    assert.match(temas, /\[data-theme="cyberpunk"\] \.hist-totals \{/);
    const bar = temas.match(/\[data-theme="cyberpunk"\] \.hist-navrow \{([^}]*)\}/);
    assert.ok(bar && /clip-path: var\(--cp-cut\)/.test(bar[1]) && /var\(--cp-panel\)/.test(bar[1]),
      "la barra viste la ciudad: corte, corchetes y panel");
  });

  it("el escaneo de Cyberpunk sigue siendo solo del panel de totales", () => {
    assert.match(temas, /\[data-theme="cyberpunk"\] \.hist-totals::after \{/);
    assert.ok(!temas.includes(".hist-period::after"), "la placa no lleva escaneo: nunca se remonta");
    const reduced = temas.slice(temas.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.ok(!reduced.includes("hist-period"), "la disciplina de movimiento no nombra a la placa: no anima nada");
  });

  it("los demás acabados del panel alcanzan a la placa (costa, océano, ion, oled, humo)", () => {
    // RE-FIJADO 1.3.265: los acabados alcanzan ahora a la BARRA — cada tema
    // que vestía a la placa viste a .hist-navrow con la misma receta, y el
    // panel de totales conserva la suya (la separación la cerca barra265).
    for (const t of ["costa", "oceano", "ion", "oled", "humo"]) {
      assert.ok(temas.includes(`[data-theme="${t}"] .hist-navrow`), `la barra lleva el acabado de ${t}`);
    }
  });
});
