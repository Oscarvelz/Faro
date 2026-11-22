/**
 * captura407 — La luz, como un grado (Oscar, 2026-11-22, dos fotos): la
 * lucecita de naturaleza flotaba a media palabra, apretada contra el lápiz
 * de renombrar. Su orden: el puntito sube a la esquina alta de la palabra,
 * como el signo de grado, y el lápiz se queda con el asiento bajo que la
 * luz deja — la fila se balancea en diagonal. Censo de la misma ola: la
 * luz también colgaba de la palabra en las píldoras de los bolsillos
 * (mismo asiento nuevo); en las filas de lectura la luz es marca de fila
 * antes de la cifra, no ornamento de la palabra, y no se mueve.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const fund = read("../../components/faro/fund.css");

describe("407 · la luz como grado", () => {
  it("la luz sube a la esquina alta de la palabra en las filas de bolsa", () => {
    assert.ok(fund.includes(".save-account-name .fund-light-wrap { align-self: flex-start; margin-top: 1px; margin-left: -5px; }"), "la luz en su asiento de grado, pegada a la palabra");
  });
  it("el lápiz respira en el asiento bajo que la luz deja", () => {
    assert.ok(fund.includes(".save-account-name .bank-pencil { margin-left: 3px; }"), "el lápiz con su aire");
    const styles = read("../../styles.css");
    assert.ok(styles.includes(".bank-pencil { width: 12px; height: 12px; margin-left: 0; padding: 0; border: 0; background: transparent; color: color-mix(in oklab, var(--fg) 36%, transparent); display: inline-grid; justify-items: start; align-items: end; flex: none; align-self: flex-end; transform: translateY(2px); }"), "el asiento bajo del lápiz sigue siendo el de siempre");
  });
  it("las píldoras de los bolsillos llevan la luz en el mismo asiento", () => {
    assert.ok(fund.includes(".save-seg strong .fund-light-wrap { position: relative; top: -0.3em; margin-left: -2px; }"), "la luz de la píldora, levantada junto a su nombre");
  });
  it("la luz no cambia de tamaño ni de forma: solo de asiento", () => {
    assert.ok(fund.includes("width: 6px; height: 6px; border-radius: 50%;"), "los 6px de su veredicto de foto siguen");
    assert.ok(fund.includes(".fund-light.is-saldo { background: transparent; border: 1.25px solid var(--fl, var(--accent)); }"), "el anillo = saldo, intacto");
  });
});
