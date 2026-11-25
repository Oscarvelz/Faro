/**
 * captura453 — el puerto del paquete 61–64 de la línea Q&A (1.3.453):
 * el área de ahorros mapeada. La clase nombrada manda su cifra (61),
 * las comparaciones y el más grande (62), sacar y meter con nombre
 * (63) y la familia nueva «seguro» (64). Estas cercas fijan las
 * costuras que el banco no ve: las puertas nuevas de la cascada, las
 * cesiones que protegen a las clases, y los registros de la familia.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const ask2 = readFileSync(new URL("./ask2.ts", import.meta.url), "utf8");
const qb = readFileSync(new URL("./questionbank.ts", import.meta.url), "utf8");
const presets = readFileSync(new URL("./askpresets.ts", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

describe("captura453 · el paquete 61–64 vive en canon", () => {
  it("la clase nombrada manda (61): la puerta gana las clases y su guarda espejo", () => {
    assert.ok(ask2.includes("const gastoClassOnly"), "la guarda espejo del gasto sobre una clase está");
    assert.ok(ask2.includes("emergency fund|emergencia|emergency|\\bmeta\\b|goal|retiro|retirement"), "la puerta oye las clases por su nombre");
    assert.ok(ask2.includes("classTarget61"), "ahorrosAnswer camina la clase nombrada");
  });

  it("sacar y meter con nombre (63): la puerta por nombre, las cesiones y la guarda que no mata", () => {
    assert.ok(ask2.includes("const namedMove63"), "la puerta del movimiento nombrado está");
    assert.ok(ask2.includes("const classMove63"), "la guarda de horizonte no mata el movimiento a una clase");
    assert.ok(ask2.includes("OLA 63 · LA DIANA ES UNA CLASE"), "el hipotético cede la premisa que mueve una clase");
    assert.ok(ask2.includes("cuentaOrigenAnswer(c, raw, parseCtx, pin?.accountId)"), "la cuenta-origen sigue en su sitio");
  });

  it("las comparaciones (62): la puerta de comparación y la frontera de palabra en prioridades", () => {
    assert.ok(ask2.includes("const cmpGate62"), "la puerta de comparación está");
    assert.ok(ask2.includes("ahorrar|\\bpay\\b|\\bsave\\b"), "«pay» ya no se dispara dentro de «PayPal»");
    assert.ok(ask2.includes("which of my (savings|accounts)"), "la alternación «en qué cuenta / which account» vive en la puerta de ahorros");
  });

  it("el seguro (64): la familia, su función, su paso 0d y su fila primera en classify", () => {
    assert.ok(ask2.includes("function seguroAnswer"), "seguroAnswer existe");
    assert.ok(ask2.includes("const sg = seguroAnswer(c, folded);"), "el paso 0d lo juzga antes de lo genérico");
    assert.ok(ask2.includes('| "seguro";') || ask2.includes('"proyeccion" | "seguro"'), "el literal está en BankFamilyId");
    const gList = ask2.slice(ask2.indexOf("function classifyBankQuestion"));
    assert.ok(gList.indexOf('"seguro"') < gList.indexOf('"figurada"'), "su fila va primera en classify");
    assert.ok(ask2.includes('source: ["libros.lineas"]'), "sus fuentes son las líneas del libro");
  });

  it("los registros de la familia nueva: questionbank con cap y un solo asiento en CAP_GROUPS", () => {
    assert.ok(qb.includes('id: "seguro"'), "la entrada existe");
    assert.ok(qb.includes("cuánto pagas de seguro de vida"), "su cap está escrita");
    assert.equal(presets.split('"seguro"').length - 1, 1, "un solo asiento en los grupos");
    assert.ok(pkg.includes("captura453.test.ts"), "esta cerca está registrada en test:faro");
  });
});
