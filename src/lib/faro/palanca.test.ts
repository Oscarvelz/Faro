// La palanca con su resplandor (1.3.219): la corrección de Oscar
// (2026-11-11 12:26 EST, tres primeros planos de la palanca del
// proyector, vertical y horizontal) — «Make the lever glow a little
// bit more.» — «For all of the ones you edited» — «About the
// projector.» La palanca plana de la 1.3.208 (ventanas de Libros) y la
// 1.3.217 (escritorio) se leía demasiado mate: el disco había perdido
// entero el halo de la ley base («Projection lever: lit in its
// pocket's own color», styles.css) y el relleno conservaba solo el
// halo base de 8px / 55%. La 219 sube el relleno un punto (10px / 65%)
// y devuelve al disco el halo base (9px / 50%) por delante de su
// profundidad negra y su llave oscura — en AMBAS cercas, para que
// toda palanca del proyector brille igual. La pintura sigue plana:
// la luz es una sombra, jamás un degradado, y es el color del
// bolsillo (--seg) leído, nunca asignado.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const cyber = fs.readFileSync(new URL("../../components/faro/cyberpunk.css", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

const FILL_GLOW = "box-shadow: 0 0 10px color-mix(in oklab, var(--seg, #d5e2ea) 65%, transparent);";
const KNOB_GLOW = "box-shadow: 0 0 9px color-mix(in oklab, var(--seg, #d5e2ea) 50%, transparent), 0 2px 6px rgb(0 0 0 / .55), inset 0 0 0 1.5px rgb(11 10 8 / .38);";
const FENCES = [".save-band.is-records", ".save-band.sav-scope:not(.is-records)"];

describe("palanca 219: el resplandor vive en las dos cercas", () => {
  it("el relleno brilla un punto más en el color del bolsillo, en Libros y en el escritorio", () => {
    for (const fence of FENCES) {
      assert.ok(cyber.includes(`html[data-theme="cyberpunk"] ${fence} .vault-lever-rail i::after { background: var(--seg, #d5e2ea); ${FILL_GLOW} }`), `relleno con halo de 10px / 65% bajo ${fence}`);
    }
  });

  it("el disco recupera el halo base por delante de su profundidad y su llave, en las dos cercas", () => {
    for (const fence of FENCES) {
      assert.ok(cyber.includes(`html[data-theme="cyberpunk"] ${fence} .vault-lever-rail b {\n  background: var(--seg, #d5e2ea);\n  ${KNOB_GLOW}\n}`), `disco con halo de 9px / 50% bajo ${fence}`);
    }
  });

  it("el resplandor vive SOLO en la palanca: dos cercas, dos rellenos, dos discos — nada más en la hoja", () => {
    assert.equal(cyber.split(FILL_GLOW).length - 1, 2, "el halo del relleno aparece exactamente en las dos cercas");
    assert.equal(cyber.split("0 0 9px color-mix(in oklab, var(--seg, #d5e2ea) 50%, transparent)").length - 1, 2, "el halo del disco aparece exactamente en las dos cercas");
  });

  it("la luz es sombra, nunca pintura: ninguna de las dos reglas enmendadas trae degradado", () => {
    for (const fence of FENCES) {
      const at = cyber.indexOf(`html[data-theme="cyberpunk"] ${fence} .vault-lever-rail i::after`);
      const slice = cyber.slice(at, cyber.indexOf("}", cyber.indexOf(".vault-lever-rail b", at)) + 1);
      assert.ok(!slice.includes("gradient"), `sin degradados en la palanca bajo ${fence}`);
      assert.ok(!/--seg\s*:/.test(slice), `--seg se lee con var(), jamás se asigna, bajo ${fence}`);
    }
  });
});

describe("palanca 219: lo que no se tocó", () => {
  it("la ley base sobrevive intacta para los demás temas: la palanca nace alumbrada en su color", () => {
    assert.ok(styles.includes("/* Projection lever: lit in its pocket's own color (Meta, Retiro, Emergencia). */"), "la ley base conserva su nombre");
    assert.ok(styles.includes(".vault-lever-rail i::after { box-shadow: 0 0 8px color-mix(in oklab, var(--seg, #d5e2ea) 55%, transparent); }"), "el halo base del relleno (8px / 55%) sigue en la hoja base");
    assert.ok(styles.includes(".vault-lever-rail b { box-shadow: 0 0 0 1px color-mix(in oklab, var(--seg, #d5e2ea) 60%, transparent), 0 0 9px color-mix(in oklab, var(--seg, #d5e2ea) 50%, transparent), 0 2px 6px rgb(0 0 0 / 25%); }"), "el anillo y el halo base del disco siguen en la hoja base");
  });

  it("las fichas del proyector no se tocaron: la elegida conserva su sombra de la 1.3.217", () => {
    assert.ok(cyber.includes("box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--seg, #d5e2ea) 70%, transparent), inset 0 -3px 0 var(--seg, #d5e2ea);"), "la gramática de selección de la ficha elegida queda como la dejó la 1.3.217");
  });
});
