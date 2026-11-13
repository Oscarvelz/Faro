// EL ENVOLTORIO DEL HISTORIAL Y EL ARCHIVO, TEMA POR TEMA (Oscar, 2026-11-12;
// brief «The polish, theme by theme» + pulidos especiales de Tron y Cyberpunk).
// Lo que fijan estas cercas, en palabras del brief:
//  - hist-temas.css se carga por el mismo camino que historial.css (justo
//    después, en las dos pantallas), para ganar por orden sin pelear especificidad;
//  - los DIECIOCHO temas leen nativos en las superficies nuevas: cada id tiene
//    al menos una regla hist-/arch- (o la puerta .ask) en este archivo;
//  - los seis días dan al bloque vivo su borde dorado (la familia .own-line);
//  - Niebla (y Bosque) acallan encabezados y filetes, JAMÁS las cifras;
//  - la puerta de Tron: borde Ares tenue que se completa al armarse el botón
//    (:has con el danger no-deshabilitado) y la persecución de un segundo, que el
//    movimiento reducido retira;
//  - el escaneo de Cyberpunk vive SOLO en la pista del borde inferior de la
//    cabecera de totales (2px, un pseudo-elemento, solo transform): ninguna
//    clase de monto o cifra lleva animación en este archivo — el dinero nunca
//    se anima; y la cabecera se remonta con la firma de la vista para re-dispararlo;
//  - la guardia de Sunset: el peligro de la puerta es var(--bad), nunca el
//    melocotón de var(--accent);
//  - el Archivo calma la ciudad de Cyberpunk por lugar (:has(.arch)).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const css = read("components/faro/hist-temas.css");
const strip = css.replace(/\/\*[\s\S]*?\*\//g, "");
const historialTsx = read("components/faro/historial.tsx");
const archivoTsx = read("components/faro/archivo.tsx");

const rules = [...strip.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
const themeRules = (id: string) => rules.filter((r) => r.sel.includes(`[data-theme="${id}"]`));

const THEMES = ["claro", "lino", "costa", "marfil", "niebla", "piedra", "ion", "oscuro", "oled", "naturaleza", "oceano", "sunset", "tinta", "bosque", "humo", "ion-noche", "tron", "cyberpunk"];
const DAYS = ["claro", "lino", "costa", "marfil", "niebla", "piedra"];

describe("el envoltorio por temas del Historial y el Archivo", () => {
  it("hist-temas.css se importa justo tras historial.css en las dos pantallas", () => {
    for (const tsx of [historialTsx, archivoTsx]) {
      assert.ok(tsx.includes('import "./historial.css";\nimport "./hist-temas.css";'), "el mismo camino de carga que historial.css");
    }
  });

  it("los 18 temas tienen al menos una regla sobre las superficies nuevas", () => {
    for (const id of THEMES) {
      assert.ok(
        themeRules(id).some((r) => /\.hist|\.arch|\.ask/.test(r.sel)),
        `el tema ${id} no toca hist-/arch-/.ask en hist-temas.css`,
      );
    }
  });

  it("los seis días dan al bloque vivo (el primero del río) el borde dorado de la casa", () => {
    assert.ok(strip.includes("#c9a15a"), "el dorado de la familia .own-line");
    for (const id of DAYS) {
      assert.ok(
        themeRules(id).some((r) => r.sel.includes(".hist-day:first-child")),
        `el tema de día ${id} no dora el bloque vivo`,
      );
    }
  });

  it("Niebla y Bosque acallan encabezados y filetes — nunca las cifras", () => {
    for (const id of ["niebla", "bosque"]) {
      assert.ok(themeRules(id).some((r) => r.sel.includes(".hist-day-head") && /var\(--faint\)/.test(r.body)), `${id} acalla el encabezado`);
      assert.ok(
        themeRules(id).every((r) => !/\.hist-row-amt|\.hist-total/.test(r.sel)),
        `${id} toca una clase de monto: las cifras jamás se acallan`,
      );
    }
  });

  it("OLED quita las cajas: las filas flotan sobre el vacío, con filetes", () => {
    assert.ok(themeRules("oled").some((r) => r.sel.includes(".hist-day") && /background: transparent/.test(r.body) && /border-color: transparent/.test(r.body)));
    assert.ok(themeRules("oled").some((r) => /:active|:focus-within/.test(r.sel)), "el bloque tocado recupera su superficie");
  });

  it("Ion de día: canales de cristal (la receta .glass-line) y cabecera esmerilada", () => {
    assert.ok(themeRules("ion").some((r) => r.sel.includes(".hist-day") && r.body.includes("#eef3f8")), "el bloque-día lleva el cristal de la casa");
    assert.ok(themeRules("ion").some((r) => r.sel.includes(".hist-head") && /backdrop-filter: blur/.test(r.body)), "la cabecera fija es esmerilada");
  });

  it("Ion-noche: el hilo de resplandor va en el bloque vivo, y es estático", () => {
    const glow = themeRules("ion-noche").find((r) => r.sel.includes(".hist-day:first-child"));
    assert.ok(glow && /var\(--glow\)/.test(glow.body) && /box-shadow/.test(glow.body), "el borde con resplandor cian");
    assert.ok(themeRules("ion-noche").every((r) => !/animation/.test(r.body)), "sin animación: resplandor estático, disciplina vivo");
  });

  it("Sunset: lo que descansa se tiñe cálido y el peligro de la puerta es --bad, jamás el acento", () => {
    assert.ok(themeRules("sunset").some((r) => r.sel.includes(".arch-card") && /var\(--surface-2\)/.test(r.body)), "el Archivo cálido (surface-2)");
    assert.ok(themeRules("sunset").some((r) => /\.ask/.test(r.sel) && /var\(--bad\)/.test(r.body)), "la guardia nombra --bad en la puerta");
    assert.ok(
      themeRules("sunset").every((r) => !(/is-danger/.test(r.sel) && /var\(--accent\)/.test(r.body))),
      "ninguna regla de Sunset pinta el peligro con el melocotón del acento",
    );
  });

  it("Tron: los paneles son gunmetal con líneas de luz (--t-steel / --t-edge)", () => {
    assert.ok(themeRules("tron").some((r) => r.sel.includes(".hist-day") && /var\(--t-steel\)/.test(r.body) && /var\(--t-edge\)/.test(r.body)));
    assert.ok(themeRules("tron").some((r) => r.sel.includes(".piece-plate") && /var\(--t-edge\)/.test(r.body)), "las placas como marcos de luz");
    assert.ok(themeRules("tron").some((r) => /aria-pressed="true"/.test(r.sel) && /var\(--t-teal\)/.test(r.body)), "los filtros activos, selectores de sector en teal");
  });

  it("Tron: la puerta — Ares tenue, completo al armarse, con su persecución de un segundo", () => {
    assert.ok(strip.includes(".ask:has(.ask-btn.is-danger:not(:disabled))"), "el selector :has del armado");
    const armed = rules.find((r) => r.sel.includes('[data-theme="tron"]') && r.sel.includes(":has(.ask-btn.is-danger:not(:disabled))") && !r.sel.includes("::after"));
    assert.ok(armed && /border-color: var\(--t-red\)/.test(armed.body), "el borde se completa en rojo Ares");
    assert.ok(/@keyframes hist-tron-chase/.test(strip) && /hist-tron-chase 1s steps\(/.test(strip), "la persecución: 1s, escalonada, una vez");
    const rm = strip.indexOf("prefers-reduced-motion: reduce");
    assert.ok(rm >= 0 && strip.slice(rm).includes('[data-theme="tron"] .ask:has(.ask-btn.is-danger:not(:disabled))::after'), "el movimiento reducido retira la persecución");
  });

  it("Cyberpunk: el escaneo vive solo en la pista del borde inferior de los totales (2px)", () => {
    const scan = rules.find((r) => r.sel === '[data-theme="cyberpunk"] .hist-totals::after');
    assert.ok(scan, "el pseudo del escaneo existe");
    assert.ok(/bottom: 0/.test(scan.body) && /height: 2px/.test(scan.body), "pegado al borde inferior, 2px");
    assert.ok(/var\(--cp-data\)/.test(scan.body), "el cian es dato");
    assert.ok(/@keyframes hist-cp-scan/.test(strip) && /hist-cp-scan \.7s steps\(/.test(strip), "un paso escalonado, una vez");
    // Ninguna cifra se anima: la única regla con animation sobre hist- es el
    // pseudo del borde; ninguna clase de monto/total lleva animación.
    for (const r of rules) {
      if (/animation/.test(r.body)) {
        assert.ok(!/\.hist-row-amt|\.hist-total(?!s::after)/.test(r.sel), `animación sobre una cifra: ${r.sel}`);
      }
    }
    assert.ok(historialTsx.includes("key={viewSig}"), "la cabecera se remonta con la firma de la vista para re-disparar el escaneo");
  });

  it("Cyberpunk: el Archivo calma la ciudad por lugar, y la puerta va plana, sin resplandor", () => {
    assert.ok(rules.some((r) => r.sel.includes('[data-theme="cyberpunk"]:has(.arch)') && r.sel.includes(".cp-city") && /opacity/.test(r.body)), "la ciudad se atenúa sobre el Archivo");
    assert.ok(rules.some((r) => r.sel.includes(":has(.arch)") && /animation-play-state: paused/.test(r.body)), "sus capas quedan en pausa");
    const door = rules.find((r) => r.sel.includes('[data-theme="cyberpunk"]') && r.sel.includes(".ask-btn.is-danger"));
    assert.ok(door && /box-shadow: none/.test(door.body) && /text-shadow: none/.test(door.body), "el botón de peligro, plano");
    assert.ok(rules.some((r) => r.sel.includes(".ask.is-danger .ask-glow") && /display: none/.test(r.body)), "la ventana pierde su halo");
  });
});
