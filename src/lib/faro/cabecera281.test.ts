// «LA CABECERA ENTERA» (Oscar, 2026-11-14 19:19 EST, fotos 235580/235581):
// en Tron, durante una transición, la cabecera se partía en bloques — a la
// derecha de una línea vertical recta su cristal y su filete cian desaparecían
// (se veía el cielo del cuerpo) mientras los cinco iconos pintaban normales
// encima. El diagnóstico (~/workspace/faro-tronblock-study/DIAGNOSIS.md):
// una capa de composición presentada con sus teselas derechas aún sin
// rasterizar — la enfermedad del dock de la 1.3.112 en su gemela sin curar.
// La cabecera solo se pre-promovía en apaisado (regla de height <= 520px);
// en vertical su capa nacía y moría con el transform en línea del glide de
// scroll, y una pantalla abierta justo tras el glide de vuelta podía
// presentar la capa fresca a medio rasterizar. Lo que fijan estas cercas:
//  - la cabecera vertical hereda la cura de la 1.3.112: la regla permanente
//    `.app-frame:not(.is-split) .top-chrome { will-change: transform; }`,
//    con la grafía exacta de la casa, UNA sola vez y FUERA del media query
//    de apaisado — la capa es suya desde la primera pintura y ningún scroll,
//    glide ni transición la crea a mitad de vuelo;
//  - la regla vive JUNTO a la del dock (tras ella, con solo su comentario
//    entre ambas): la cura es una sola familia y se lee en un solo lugar;
//  - la regla del dock queda intacta y la de apaisado sigue existiendo:
//    la 281 extiende, no reemplaza.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const css = read("styles.css");

const DOCK_RULE = ".app-frame .dock { will-change: transform; }";
const HEADER_RULE = ".app-frame:not(.is-split) .top-chrome { will-change: transform; }";

describe("la cabecera entera: la pre-promoción permanente", () => {
  it("la regla de la cabecera existe con el selector y la grafía exactos, una sola vez", () => {
    const seats = css.match(/\.app-frame:not\(\.is-split\) \.top-chrome \{ will-change: transform; \}/g) ?? [];
    assert.equal(seats.length, 1, "la pre-promoción permanente de la cabecera se sienta una sola vez");
  });

  it("vive fuera del media query de apaisado: es permanente, no condicional", () => {
    const mediaAt = css.indexOf("@media (orientation: landscape) and (height <= 520px) and (width < 1100px)");
    const ruleAt = css.indexOf(HEADER_RULE);
    assert.ok(mediaAt >= 0, "la regla de apaisado sigue en el archivo");
    assert.ok(ruleAt > mediaAt, "la regla permanente nace después del bloque de apaisado, a nivel raíz");
    // Dentro del bloque de apaisado el selector aparece como lista (con coma),
    // jamás con la grafía de regla suelta: la permanente es otra regla.
    const mediaBlock = css.slice(mediaAt, css.indexOf(".app-frame:not(.is-split) .top-chrome.is-away", mediaAt));
    assert.ok(!mediaBlock.includes(HEADER_RULE), "la grafía suelta no vive dentro del media query");
  });

  it("vive junto a la regla del dock: tras ella, con solo el comentario de la 281 entre ambas", () => {
    const dockAt = css.indexOf(DOCK_RULE);
    const ruleAt = css.indexOf(HEADER_RULE);
    assert.ok(dockAt >= 0 && ruleAt > dockAt, "la cura de la cabecera se sienta tras la del dock");
    const between = css.slice(dockAt + DOCK_RULE.length, ruleAt).trim();
    assert.match(between, /^\/\* 1\.3\.281:[\s\S]*\*\/$/, "entre ambas reglas solo vive el comentario de la 281");
  });

  it("la regla del dock queda intacta y única: la 281 extiende, no reemplaza", () => {
    const seats = css.match(/\.app-frame \.dock \{ will-change: transform; \}/g) ?? [];
    assert.equal(seats.length, 1, "la pre-promoción del dock de la 1.3.112 sigue sentada una sola vez");
  });

  it("la regla de apaisado sigue existiendo con sus dos asientos", () => {
    assert.match(
      css,
      /@media \(orientation: landscape\) and \(height <= 520px\) and \(width < 1100px\) \{\s*\.app-frame:not\(\.is-split\) \.top-chrome,\s*\.app-frame:not\(\.is-split\) \.dock \{ will-change: transform; \}\s*\}/,
      "el bloque de apaisado conserva la cabecera y el dock como estaban",
    );
  });
});
