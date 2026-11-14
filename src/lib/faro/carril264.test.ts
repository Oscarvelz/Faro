// «EL CARRIL» (Oscar, 2026-11-14: del estudio de lentes eligió el candidato
// B, «Carril hundido» — «mantén ese diseño… prácticamente es la consistencia
// del app»). La fila de lentes del Historial deja las pastillas sueltas y se
// hace miembro verdadero de la familia viajera de la casa (.seg.is-follow con
// su píldora, la del par de Folios y el par de Estudio). Lo que fijan estas
// cercas:
//  - el traje y el asiento: SOLO la fila .hist-lens cambia de envoltorio —
//    los seg de filtros de la misma pantalla (segBtn, aria-pressed) quedan
//    byte a byte como estaban, y ninguna hoja de la familia gana una regla
//    con el nombre de la lente (la geometría vive en historial.css);
//  - la maquinaria es la real, no una rederivación: el colocador mide el
//    botón con aria-current="page" en fase de layout, reinicia is-gliding y
//    recoloca cuando las fuentes asientan y cuando el libro llega (1.3.206);
//  - LA MIGRACIÓN ARIA, declarada: la lente anuncia como su familia —
//    role="tab", aria-selected y aria-current="page" en la activa — y ya no
//    lleva aria-pressed. El contenedor ya decía role="tablist"; ahora el
//    marcado es verdad. (La cerca del colado de histtemas.test.ts se
//    re-fijó el mismo día: su regla gobierna ahora a los filtros.)
//  - la geometría aprobada: cuatro columnas, hueco de 2px, aire de 3px,
//    botones de 44px (la ley de toque; el estudio dibujó 40 en pista de 50
//    y la pista queda en 52 por esos 4px, declarados);
//  - el movimiento reducido: el pulgar NO viaja — la muerte está escrita
//    ceñida a esta pista, con el idioma de los viajeros hermanos
//    (.dock-glide / .vault-glide), sin tocar la regla compartida de los pares.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const tsx = read("components/faro/historial.tsx");
const css = read("components/faro/historial.css");

describe("el carril: el traje y el asiento", () => {
  it("la fila viste el traje viajero de la familia, con su píldora y su ref", () => {
    assert.match(tsx, /<div className="seg is-follow is-pair hist-lens" ref=\{lensRef\} role="tablist" aria-label=\{t\("hist\.title"\)\}>/);
    assert.match(tsx, /<i className="seg-pill" aria-hidden \/>/);
  });

  it("solo la lente cambia de envoltorio: el nombre hist-lens no aparece en ninguna hoja de la familia", () => {
    for (const rel of ["styles.css", "components/faro/tron.css", "components/faro/cyberpunk.css", "components/faro/brillo.css", "components/faro/ion.css", "components/faro/hist-temas.css"]) {
      assert.ok(!read(rel).includes("hist-lens"), `${rel} no nombra a la lente: el traje es de la familia, la geometría de historial.css`);
    }
  });

  it("los seg de filtros quedan intactos: segBtn y sus catorce llamadas, con su aria-pressed", () => {
    assert.match(tsx, /const segBtn = \(id: string, pressed: boolean, onPress: \(\) => void, label: string\) => \(\s+<button key=\{id\} type="button" aria-pressed=\{pressed\} onClick=\{onPress\}>\{label\}<\/button>/);
    const calls = tsx.match(/segBtn\("/g) ?? [];
    assert.equal(calls.length, 14, "las catorce llamadas de filtros (dirección, grupo, origen, recurrencia) no se movieron");
  });
});

describe("el carril: la migración aria, declarada", () => {
  it("la lente anuncia como su familia: tab, aria-selected y aria-current en la activa", () => {
    assert.match(tsx, /<button key=\{id\} type="button" role="tab" aria-selected=\{lens === id\} aria-current=\{lens === id \? "page" : undefined\} onClick=\{\(\) => setLens\(id\)\}>/);
    const calls = tsx.match(/lensBtn\("/g) ?? [];
    assert.equal(calls.length, 4, "las cuatro lentes salen de lensBtn");
  });

  it("ningún botón de la lente conserva aria-pressed ni sale de segBtn", () => {
    for (const id of ["week", "month", "year", "range"]) {
      assert.ok(!tsx.includes(`segBtn("${id}"`), `la lente ${id} ya no se sirve de segBtn`);
    }
    const lensHelper = tsx.slice(tsx.indexOf("const lensBtn"), tsx.indexOf("const lensBtn") + 400);
    assert.ok(!lensHelper.includes("aria-pressed"), "el ayudante de la lente no conoce aria-pressed");
  });
});

describe("el carril: la maquinaria real, no una rederivación", () => {
  it("el colocador mide aria-current en fase de layout, con el reinicio is-gliding de la familia", () => {
    assert.match(tsx, /useLayoutEffect\(\(\) => \{/);
    assert.match(tsx, /root\.querySelector<HTMLElement>\('\[aria-current="page"\]'\)/);
    assert.match(tsx, /root\.querySelector<HTMLElement>\("\.seg-pill"\)/);
    assert.match(tsx, /pill\.style\.transform = `translate3d\(\$\{current\.offsetLeft\}px, \$\{current\.offsetTop\}px, 0\)`;/);
    assert.match(tsx, /pill\.classList\.remove\("is-gliding"\);\s+void pill\.offsetWidth;\s+pill\.classList\.add\("is-gliding"\);/);
  });

  it("recoloca cuando las fuentes asientan y cuando el libro llega (la lección de la 1.3.206)", () => {
    assert.match(tsx, /document\.fonts\?\.ready\.then/);
    assert.match(tsx, /\}, \[lens, lang, !!state\]\);/);
  });
});

describe("el carril: la geometría y el movimiento reducido", () => {
  it("cuatro columnas, hueco de 2px, aire de 3px, sin margen propio", () => {
    assert.match(css, /\.seg\.is-follow\.is-pair\.hist-lens \{\s+grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);\s+gap: 2px; padding: 3px; margin: 0;\s+\}/);
  });

  it("botones de 44px — la ley de toque — con la letra del estudio (.85rem, 620)", () => {
    assert.match(css, /\.seg\.is-follow\.is-pair\.hist-lens button \{\s+height: 44px; min-height: 44px; padding: 0 6px;\s+font-size: \.85rem; font-weight: 620;\s+\}/);
  });

  it("la pintura no se escribe aquí: historial.css no pinta el activo de la lente (la píldora es la única pintora)", () => {
    assert.ok(!/hist-lens[^{]*aria-current/.test(css), "ninguna regla de la lente se cuelga de aria-current en historial.css");
    assert.ok(!/\.seg\.is-follow\.is-pair\.hist-lens button \{[^}]*background/.test(css), "el botón de la lente no gana fondo en historial.css");
  });

  it("movimiento reducido: el pulgar no viaja, con la muerte ceñida a esta pista", () => {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s+\.seg\.is-follow\.hist-lens \.seg-pill \{ transition: none; \}\s+\}/);
  });
});
