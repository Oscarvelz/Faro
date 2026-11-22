/**
 * captura409 — Las cajas del fondo, más bajas; los formularios, con relieve
 * (Oscar, 2026-11-22 13:25, con su foto de «Nueva Emergencia»): la luz de
 * cada tarjeta de naturaleza ocupaba su propio renglón sobre el título y las
 * cajas crecían; ahora la luz (10px, el aro con sus 2px — la proporción del
 * grado) vive EN la línea del título. Y los formularios de añadir/editar
 * (.ah-form) dejan de verse planos: el panel se asienta como bandeja y cada
 * campo se hunde en él con la receta de las bandejas de la casa.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const fundCss = read("../../components/faro/fund.css");
const fundTsx = read("../../components/faro/fund-light.tsx");
const styles = read("../../styles.css");
const bankCss = read("../../components/faro/bank.css");
const novedades = read("./novedades.ts");

describe("409 · la luz en la línea del título", () => {
  it("las dos tarjetas envuelven luz y título en la cabecera compartida", () => {
    const heads = fundTsx.match(/fund-opt-head/g) ?? [];
    assert.equal(heads.length, 2, "una cabecera por tarjeta (saldo y aparte)");
    assert.ok(fundTsx.includes('<span className="fund-opt-head"><span className="fund-opt-mark is-saldo"'), "saldo: luz y título juntos");
    assert.ok(fundTsx.includes('<span className="fund-opt-head"><span className="fund-opt-mark is-aparte"'), "aparte: luz y título juntos");
  });
  it("la luz mide 10px, sin renglón propio, y el aro conserva sus 2px", () => {
    assert.ok(fundCss.includes(".fund-opt-mark { width: 10px; height: 10px;"), "la luz a 10px");
    assert.ok(!fundCss.includes(".fund-opt-mark { width: 13px"), "el 13px viejo no queda");
    assert.ok(!/\.fund-opt-mark \{[^}]*margin-bottom/.test(fundCss), "sin margen que la separe del título");
    assert.ok(fundCss.includes(".fund-opt-mark.is-saldo { border: 2px solid var(--accent); }"), "el aro del grado");
    assert.ok(fundCss.includes(".fund-opt-head { display: inline-flex; align-items: center; gap: 7px;"), "la cabecera en línea");
  });
  it("las tarjetas y las filas anfitrionas llevan el relieve levantado", () => {
    assert.ok(fundCss.includes(".fund-opt.is-on { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent), 0 1px 2px rgba(0, 0, 0, .25)"), "la elegida conserva su anillo y gana el relieve");
    assert.ok(fundCss.includes(".fund-host-row.is-on { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent), 0 1px 2px rgba(0, 0, 0, .25)"), "la fila anfitriona, igual");
  });
});

describe("409 · el relieve de los formularios", () => {
  it("el campo se hunde en el panel con la receta de las bandejas", () => {
    assert.ok(styles.includes("box-shadow: inset 0 2px 6px rgba(0, 0, 0, .26), inset 0 -1px 0 rgba(255, 255, 255, .05); }"), "la sombra hundida del campo");
    assert.ok(!styles.includes("text-transform: none; box-shadow: none; }"), "el plano heredado no queda en el campo");
  });
  it("el panel del libro se asienta como bandeja", () => {
    assert.ok(styles.includes("border: 1px solid color-mix(in oklab, var(--ah-acc) 18%, var(--line)); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05), inset 0 2px 10px rgba(0, 0, 0, .16), 0 1px 3px rgba(0, 0, 0, .18); }"), "borde y sombras de bandeja en .save-ledger .ah-form");
  });
  it("la novedad de la ola existe y apunta al tema de la naturaleza", () => {
    assert.ok(novedades.includes('version: "1.3.409"'), "la entrada 409");
    assert.ok(novedades.includes('topic: "donde-vive"'), "su puerta al Manual");
  });
});

describe("409 · la ventana de novedades, con límites", () => {
  it("la tarjeta guarda una altura máxima y se compone en columna", () => {
    assert.ok(bankCss.includes("display: flex; flex-direction: column; max-height: min(88vh, 660px); max-height: min(88dvh, 660px); }"), "límites fijos de la ventana");
  });
  it("la página se desliza por dentro de la ventana", () => {
    assert.ok(bankCss.includes("overflow-y: auto; min-height: 0; overscroll-behavior: contain;"), "el texto rueda dentro");
  });
});

describe("409 · el diálogo de confirmación se compone", () => {
  it("la pareja de botones llena su fila, con alcance propio", () => {
    assert.ok(styles.includes(".ask .ask-actions, .mode-gate .ask-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr;"), "la rejilla igual manda en los diálogos");
  });
  it("el cuerpo del diálogo se centra; el sello y el título no se mueven", () => {
    const finish = read("../../components/faro/finish.css");
    assert.ok(finish.includes(".ask > .ask-body { max-width: none; margin-top: 6px; text-align: center; }"), "el cuerpo centrado");
    assert.ok(finish.includes(".ask > .ask-seal { grid-column: 1; grid-row: 1;"), "el sello sigue a la izquierda");
  });
});
