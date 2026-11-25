/**
 * captura452 — el puerto del paquete 57–60 de la línea Q&A (1.3.452):
 * el porcentaje por posición (57), el verbo de cada monto (58), la
 * familia «proyeccion» con su costura «cad:» y su figura camino
 * (59), y las preguntas de dos hechos (60). Estas cercas fijan las
 * costuras que el banco no ve: el lector firmado con la moneda del
 * libro, la vuelta «cad:» por el pin, la declaración exacta de la
 * figura y los registros de la familia nueva.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const ask2 = readFileSync(new URL("./ask2.ts", import.meta.url), "utf8");
const qb = readFileSync(new URL("./questionbank.ts", import.meta.url), "utf8");
const presets = readFileSync(new URL("./askpresets.ts", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

describe("captura452 · el paquete 57–60 vive en canon", () => {
  it("el lector firmado (58) lee con la moneda de vista del libro en sus tres asientos", () => {
    assert.ok(ask2.includes("function verbAmounts(raw: string, def?: Currency)"), "verbAmounts recibe def");
    assert.ok(ask2.includes("verbAmounts(raw, c.display)"), "los asientos pasan c.display");
    assert.ok(ask2.includes("OLA 58 · EL VERBO DE CADA MONTO"), "la cabecera de la ola está");
    assert.ok(ask2.includes("OLA 58 · LA DIFERENCIA ENTRE LO QUE ENTRA Y LO QUE SALE"), "la diferencia firmada está en la calculadora");
    assert.ok(ask2.includes("OLA 58 · EL HIPOTÉTICO CON SIGNO"), "el hipotético con signo está");
  });

  it("el porcentaje se lee por posición (57): dígitos y palabras, y la capacidad cede la forma EN", () => {
    assert.ok(ask2.includes("OLA 57 · EL PORCENTAJE EN PALABRAS"), "la lectura por posición está");
    assert.ok(ask2.includes("porcentaje|percent/.test(folded)) return null"), "la capacidad cede «percent»");
    assert.ok(ask2.includes("porcentaje|percent|%|cuanto es"), "la puerta 0b oye «percent»");
  });

  it("la proyección (59): la vuelta entra por el pin «cad:» y la figura camino se declara exacta", () => {
    assert.ok(ask2.includes('pinId.startsWith("cad:")'), "el pin «cad:» se lee como cadencia");
    assert.ok(ask2.includes('"cad:weekly"') && ask2.includes('"cad:monthly"') && ask2.includes('"cad:once"'), "las tres opciones de la vuelta existen");
    assert.ok(ask2.includes("const figKs: number[] = []"), "los pasos declarados se eligen por su k real");
    assert.ok(ask2.includes("stock59.total + aporte * k"), "cada punto es hoy + k × aporte: nada interpolado");
    assert.ok(ask2.includes('"proyeccion"'), "la familia está en el tipo y en classify");
  });

  it("los dos hechos (60): próxima paga, último gasto, dos extremos, el juicio y el corte por «? ¿»", () => {
    assert.ok(ask2.includes("OLA 60 · LA PRÓXIMA PAGA"), "la recencia mira adelante");
    assert.ok(ask2.includes("OLA 60 · LOS DOS EXTREMOS"), "los dos polos se responden");
    assert.ok(ask2.includes("OLA 60 · EL JUICIO DE LAS DOS COSAS"), "el juicio de ahorros está");
    assert.ok(ask2.includes("qLegs"), "la compuesta también se corta por sus dos signos");
    assert.ok(ask2.includes("const futureVoice"), "la guarda de horizonte re-cercada está");
  });

  it("los registros de la familia nueva: questionbank con cap y un solo asiento en CAP_GROUPS", () => {
    assert.ok(qb.includes('id: "proyeccion"'), "la entrada existe");
    assert.ok(qb.includes("cuánto tendrías ahorrado si apartaras lo mismo"), "su cap está escrita");
    assert.equal(presets.split('"proyeccion"').length - 1, 1, "un solo asiento en los grupos");
    assert.ok(pkg.includes("captura452.test.ts"), "esta cerca está registrada en test:faro");
  });
});
