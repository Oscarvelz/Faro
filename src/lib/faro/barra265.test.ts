// «LA BARRA FUNDIDA» (Oscar, 2026-11-14: del estudio de navegador
// faro-navstudy eligió el candidato C — «Este me gustó mucho precisamente
// porque contrastan»). El navegador de período del Historial deja las
// burbujas: la placa era pastilla de 999px en catorce temas y las flechas
// círculos perfectos en los dieciocho, gemelos del carril de la lente de
// arriba. La fila entera se funde en UNA barra rectangular — zona ‹,
// nombre, zona › — con divisores de filete. Lo que fijan estas cercas:
//  - la barra es UN objeto: .hist-navrow lleva la casa que la placa tenía
//    desde la 255 (superficie, filete) con radio 14px — rectangular, nunca
//    otra pastilla — y overflow guardando las pinturas de zona dentro;
//  - las flechas dejan de ser botones circulares: su caja propia (fondo,
//    filete, redondez) se retira ceñida a la barra; quedan zonas de 52px
//    con su clase, su paso y sus etiquetas de siempre;
//  - los acabados por tema migran de .hist-period a .hist-navrow, y la
//    separación de selectores queda probada: donde hist-temas.css pintaba
//    «.hist-totals, .hist-period» juntos, el panel de totales conserva su
//    acabado byte a byte y la placa ya no recibe ninguno;
//  - la ceremonia del actual (262/263) sube a la barra: el is-now cuelga de
//    la MISMA onPresent en la fila y en la zona; la letra sigue en el
//    acento y en Costa/Océano el borde ENTERO de la barra se enciende;
//  - el toque-al-presente y su aria no se mueven: la zona del nombre es el
//    mismo botón .hist-period con goPresent, y las flechas su shift ±1;
//  - el foco se pinta interior (un anillo exterior se recortaría contra la
//    barra: la lección de la 244) y nada en la barra anima.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const tsx = read("components/faro/historial.tsx");
const css = strip(read("components/faro/historial.css"));
const temas = strip(read("components/faro/hist-temas.css"));
const brillo = strip(read("components/faro/brillo.css"));
const rule = (all: string, sel: string) => {
  const m = all.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  return m ? m[1] : "";
};

describe("la barra fundida: un solo objeto, tres zonas", () => {
  it("la fila es la barra: lleva la casa de la placa (superficie, filete) con radio rectangular", () => {
    const r = rule(css, ".hist-navrow");
    assert.match(r, /background: var\(--surface\)/);
    assert.match(r, /border: 1px solid var\(--line\)/);
    assert.match(r, /border-radius: 14px/);
    assert.match(r, /overflow: hidden/);
    assert.match(r, /gap: 0/);
  });

  it("la zona del nombre lleva los divisores: filete a ambos costados, en el color de línea", () => {
    const r = rule(css, ".hist-period");
    assert.match(r, /border-left: 1px solid var\(--line\)/);
    assert.match(r, /border-right: 1px solid var\(--line\)/);
    assert.match(r, /background: transparent/);
    assert.match(r, /border-radius: 0/);
  });

  it("las flechas ya no son botones circulares: su caja propia se retira, ceñida a la barra", () => {
    const r = rule(css, ".hist .hist-navrow .icon-btn");
    assert.match(r, /width: 52px/);
    assert.match(r, /min-height: 44px/);
    assert.match(r, /background: transparent/);
    assert.match(r, /border: 0/);
    assert.match(r, /border-radius: 0/);
    // La burbuja no sobrevive en la fila: ningún 999px en las reglas del navegador.
    const nav = css.slice(css.indexOf(".hist-navrow"), css.indexOf(".hist-range"));
    assert.ok(!nav.includes("999px"), "la fila del navegador ya no conoce la pastilla");
  });

  it("la zona del nombre conserva su tipografía y su estatura de siempre", () => {
    const r = rule(css, ".hist-period");
    assert.match(r, /font-family: var\(--font-serif\)/);
    assert.match(r, /font-size: 1\.15rem/);
    assert.match(r, /font-weight: 700/);
    assert.match(r, /min-height: 44px/);
    assert.match(r, /flex: 1 1 auto/);
  });
});

describe("la barra fundida: el acabado por tema vive en la barra", () => {
  it("Tron: la barra es de acero con su filete, y sus divisores son el mismo filete atenuado", () => {
    const bar = rule(temas, '[data-theme="tron"] .hist-navrow');
    assert.match(bar, /background: var\(--t-steel\)/);
    assert.match(bar, /border-color: var\(--t-edge\)/);
    const div = rule(temas, '[data-theme="tron"] .hist-navrow .hist-period');
    assert.match(div, /border-left-color: color-mix\(in oklab, var\(--t-edge\) 70%, transparent\)/);
    assert.match(div, /border-right-color: color-mix\(in oklab, var\(--t-edge\) 70%, transparent\)/);
  });

  it("Cyberpunk: la barra viste la ciudad entera (corte, corchetes, panel) y el escaneo sigue fuera", () => {
    const bar = rule(temas, '[data-theme="cyberpunk"] .hist-navrow');
    assert.match(bar, /clip-path: var\(--cp-cut\)/);
    assert.match(bar, /border-radius: 2px/);
    assert.match(bar, /var\(--cp-panel\)/);
    const div = rule(temas, '[data-theme="cyberpunk"] .hist-navrow .hist-period');
    assert.match(div, /border-left-color: color-mix\(in oklab, var\(--accent\) 35%, transparent\)/);
    assert.ok(!temas.includes(".hist-navrow::after"), "la barra no lleva escaneo: nunca se remonta con la firma");
    assert.match(temas, /\[data-theme="cyberpunk"\] \.hist-totals::after \{/);
  });

  it("Costa y Océano: su tinte viste la barra, y el vidrio de Ion y el vacío de OLED también", () => {
    assert.match(rule(temas, '[data-theme="costa"] .hist-navrow'), /border-color: color-mix\(in oklab, var\(--accent\) 36%, var\(--line\)\)/);
    assert.match(rule(temas, '[data-theme="oceano"] .hist-navrow'), /border-color: color-mix\(in oklab, var\(--accent\) 30%, var\(--line\)\)/);
    const ion = rule(temas, '[data-theme="ion"] .hist-navrow');
    assert.match(ion, /background: color-mix\(in oklab, var\(--surface\) 66%, transparent\)/);
    assert.match(ion, /border-color: color-mix\(in oklab, var\(--glow\) 45%, var\(--line\)\)/);
    assert.match(rule(temas, '[data-theme="oled"] .hist-navrow'), /background: transparent/);
  });

  it("Humo: la barra ablanda a 22px — suave, pero menos que el panel (26px): control, no documento", () => {
    const bar = rule(temas, '[data-theme="humo"] .hist-navrow');
    assert.match(bar, /border-radius: 22px/);
    assert.match(bar, /border-color: color-mix\(in oklab, var\(--line\) 78%, transparent\)/);
  });
});

describe("la barra fundida: la separación de selectores deja el panel intacto", () => {
  it("ninguna regla pinta ya «.hist-totals, .hist-period» ni alcanza a la zona con un acabado", () => {
    assert.ok(!temas.includes(".hist-totals,") || !/\.hist-totals,[^}]*\.hist-period/.test(temas),
      "totales y la zona del nombre ya no comparten regla");
    for (const t of ["costa", "oceano", "ion", "oled", "humo", "tron", "cyberpunk"]) {
      assert.ok(!new RegExp(`\\[data-theme="${t}"\\] \\.hist-period \\{`).test(temas),
        `${t}: ningún acabado cae ya sobre .hist-period a secas`);
    }
  });

  it("el panel de totales conserva cada acabado suyo, palabra por palabra", () => {
    assert.match(temas, /\[data-theme="costa"\] \.hist-totals \{ border-color: color-mix\(in oklab, var\(--accent\) 36%, var\(--line\)\); \}/);
    assert.match(temas, /\[data-theme="oceano"\] \.hist-totals \{ border-color: color-mix\(in oklab, var\(--accent\) 30%, var\(--line\)\); \}/);
    assert.match(temas, /\[data-theme="ion"\] \.hist-totals \{\s+background: color-mix\(in oklab, var\(--surface\) 66%, transparent\);\s+border-color: color-mix\(in oklab, var\(--glow\) 45%, var\(--line\)\);\s+\}/);
    assert.match(temas, /\[data-theme="oled"\] \.hist-totals \{ background: transparent; \}/);
    // El grupo de Tron conserva acero y filete con el panel dentro.
    const tronGroup = temas.match(/\[data-theme="tron"\] \.hist-totals, \[data-theme="tron"\] \.hist-day,\s+\[data-theme="tron"\] \.arch-card, \[data-theme="tron"\] \.hist-panel \{([^}]*)\}/);
    assert.ok(tronGroup && /var\(--t-steel\)/.test(tronGroup[1]) && /var\(--t-edge\)/.test(tronGroup[1]), "el grupo de Tron sigue vistiendo al panel");
    // El grupo de Cyberpunk conserva la ciudad con los totales dentro.
    const cpGroup = rule(temas, '[data-theme="cyberpunk"] .hist-totals');
    assert.match(cpGroup, /clip-path: var\(--cp-cut\)/);
    assert.match(cpGroup, /var\(--cp-panel\)/);
    // El grupo de Humo conserva los 26px del panel.
    assert.match(temas, /\[data-theme="humo"\] \.hist-totals, \[data-theme="humo"\] \.hist-panel \{\s+border-radius: 26px;/);
  });
});

describe("la barra fundida: la ceremonia del actual sube a la barra", () => {
  it("el is-now de la barra cuelga de la misma onPresent, en el mismo patrón que el de la zona (263)", () => {
    assert.match(tsx, /<div className=\{onPresent \? "hist-navrow is-now" : "hist-navrow"\}>/);
    assert.match(tsx, /className=\{onPresent \? "hist-period is-now" : "hist-period"\}/);
    const calls = tsx.match(/periodRange\(lens, today, weekStart\)/g) ?? [];
    assert.equal(calls.length, 1, "ninguna segunda noción de presente: la barra reutiliza la onPresent de la 255");
  });

  it("la letra encendida no se mueve: una sola regla, var(--accent)", () => {
    assert.match(css, /\.hist-period\.is-now \{ color: var\(--accent\); \}/);
  });

  it("en Costa y Océano el borde ENTERO de la barra se enciende; ningún otro tema gana regla is-now", () => {
    assert.match(temas, /\[data-theme="costa"\] \.hist-navrow\.is-now \{ border-color: var\(--accent\); \}/);
    assert.match(temas, /\[data-theme="oceano"\] \.hist-navrow\.is-now \{ border-color: var\(--accent\); \}/);
    const lit = temas.match(/\.hist-navrow\.is-now/g) ?? [];
    assert.equal(lit.length, 2, "solo Costa y Océano encienden el borde; el resto es letra sola");
    assert.ok(!temas.includes(".hist-period.is-now"), "la ceremonia ya no vive en la zona: vive en la barra");
  });
});

describe("la barra fundida: la función no se mueve", () => {
  it("la zona del nombre sigue siendo el botón que devuelve al presente, con su aria de siempre", () => {
    assert.match(tsx, /<button type="button" className=\{onPresent \? "hist-period is-now" : "hist-period"\} onClick=\{goPresent\} aria-label=\{onPresent \? undefined : t\("hist\.now"\)\}>\{plateLabel\}<\/button>/);
    assert.match(tsx, /const goPresent = \(\) => \{ if \(!onPresent\) setAnchor\(today\); \};/);
  });

  it("las flechas conservan su clase, su paso y sus etiquetas", () => {
    assert.match(tsx, /<button type="button" className="icon-btn" aria-label=\{t\("hist\.prev"\)\} onClick=\{\(\) => shift\(-1\)\}>/);
    assert.match(tsx, /<button type="button" className="icon-btn" aria-label=\{t\("hist\.next"\)\} onClick=\{\(\) => shift\(1\)\}>/);
  });

  it("el foco se pinta interior: ninguna zona anuncia un anillo que la barra recorte", () => {
    assert.match(css, /\.hist-navrow :is\(\.hist-period, \.icon-btn\):focus-visible \{\s+outline: 2px solid var\(--accent\); outline-offset: -2px;\s+\}/);
    // Tron presta su cian con la misma geometría interior, por encima de su
    // regla exterior general de la 244 — solo dentro de la barra.
    const tronFocus = rule(temas, '[data-theme="tron"] .hist-navrow [data-fv]:focus');
    assert.match(tronFocus, /outline: 2px solid #3fd6f5 !important/);
    assert.match(tronFocus, /outline-offset: -2px/);
  });

  it("la presión de las flechas florece hacia dentro (brillo), como en las filas con overflow", () => {
    assert.match(brillo, /:is\(\.seg button, \.chips button, \.hist-navrow \.icon-btn\):active \{\s+box-shadow: inset 0 0 0 1\.5px/);
  });

  it("nada en la barra anima: ni la fila, ni sus zonas, ni sus divisores", () => {
    for (const [name, all] of [["historial.css", css], ["hist-temas.css", temas]] as const) {
      for (const m of all.matchAll(/([^{}]*hist-navrow[^{}]*)\{([^}]*)\}/g)) {
        assert.ok(!/animation|transition/.test(m[2]), `${name}: la barra no anima (${m[1].trim()})`);
      }
    }
  });
});
