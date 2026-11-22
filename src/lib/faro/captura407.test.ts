/**
 * captura407 — La luz, como un grado (Oscar, 2026-11-22, dos fotos): la
 * lucecita de naturaleza flotaba a media palabra, apretada contra el lápiz
 * de renombrar. Su orden: el puntito sube a la esquina alta de la palabra,
 * como el signo de grado, y el lápiz se queda con el asiento bajo que la
 * luz deja — la fila se balancea en diagonal. Censo de la misma ola: la
 * luz también colgaba de la palabra en las píldoras de los bolsillos
 * (mismo asiento nuevo); en las filas de lectura la luz es marca de fila
 * antes de la cifra, no ornamento de la palabra, y no se mueve.
 *
 * ENMIENDA (1.3.408, Oscar 2026-11-22, fotos de Casa/Viaje y de las
 * píldoras): los asientos de la 407 se refinan por su palabra — la luz un
 * 8% más pequeña (5.5px; en la píldora 4.6px) y más pegada a la palabra en
 * las filas (−6px), el lápiz un 6% más pequeño y alineado con la luz
 * (−2px), y en las píldoras la luz se separa un poco (1px) y sube más
 * (−0.45em). Las aserciones de abajo llevan ya los valores nuevos.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const fund = read("../../components/faro/fund.css");

describe("407 · la luz como grado", () => {
  it("la luz sube a la esquina alta de la palabra en las filas de bolsa", () => {
    assert.ok(fund.includes(".save-account-name .fund-light-wrap { align-self: flex-start; margin-top: 1px; margin-left: -6px; }"), "la luz en su asiento de grado, pegada a la palabra (enmienda 408: −6px)");
  });
  it("el lápiz respira en el asiento bajo que la luz deja", () => {
    assert.ok(fund.includes(".save-account-name .bank-pencil { margin-left: -2px; }"), "el lápiz alineado con la luz (enmienda 408)");
    const styles = read("../../styles.css");
    assert.ok(styles.includes(".bank-pencil { width: 11.3px; height: 11.3px; margin-left: 0; padding: 0; border: 0; background: transparent; color: color-mix(in oklab, var(--fg) 36%, transparent); display: inline-grid; justify-items: start; align-items: end; flex: none; align-self: flex-end; transform: translateY(2px); }"), "el asiento bajo del lápiz sigue siendo el de siempre, un 6% más pequeño (enmienda 408)");
  });
  it("las píldoras de los bolsillos llevan la luz en el mismo asiento", () => {
    assert.ok(fund.includes(".save-seg strong .fund-light-wrap { position: relative; top: -0.45em; margin-left: 1px; }"), "la luz de la píldora, separada un poco y más arriba (enmienda 408)");
  });
  it("la luz cambia de tamaño solo por su veredicto nuevo: 5.5px, la forma intacta", () => {
    assert.ok(fund.includes("width: 5.5px; height: 5.5px; border-radius: 50%;"), "los 5.5px de su veredicto del 2026-11-22 (−8%)");
    assert.ok(fund.includes(".fund-light.is-saldo { background: transparent; border: 1.15px solid var(--fl, var(--accent)); }"), "el anillo = saldo, intacto");
  });
});
