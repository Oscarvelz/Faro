/**
 * captura457 — el puerto de la campaña de mutaciones de la Rama
 * Agente (1.3.457): los cinco escalones del agente (relato,
 * programa, órdenes, crear) oyen la escritura imperfecta con la
 * reparación en DOS pasadas, la cortesía no es contenido, la coma
 * que falta no corre los conceptos ni pega las cláusulas, y crear
 * oye las respuestas con errata. La batería mutaciones-rama.test.ts
 * queda como cerca permanente. Estas cercas fijan las costuras del
 * puerto y la adjudicación propia de canon.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { repairAgentText, repairGateTypos } from "./ask2.ts";

const ask2 = readFileSync(new URL("./ask2.ts", import.meta.url), "utf8");
const relato = readFileSync(new URL("./relato.ts", import.meta.url), "utf8");
const orden = readFileSync(new URL("./orden.ts", import.meta.url), "utf8");
const crear = readFileSync(new URL("./crear.ts", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

describe("captura457 · la campaña de mutaciones de la rama vive en canon", () => {
  it("la tanda del agente y la unión del diccionario", () => {
    assert.ok(ask2.includes("const AGENT_WORDS"), "la tanda del agente está");
    assert.ok(ask2.includes("const GATE_SET = new Set([...GATE_WORDS, ...AGENT_WORDS])"), "el diccionario de reparación une las dos tandas");
    for (const w of ["apaga", "avisos", "archiva", "cincuenta", "tajadas", "recuerdame"]) {
      assert.ok(ask2.includes(`"${w}"`), `«${w}» es blanco de reparación`);
    }
  });

  it("la reparación en dos pasadas: el diccionario manda sobre el bolsillo del libro", () => {
    const bolsillo = new Set(["super", "paga"]);
    assert.equal(repairAgentText("apga los avisos", bolsillo, "es"), "apaga los avisos", "«apga» se cura a la palabra del idioma, no al bolsillo «Súper Paga»");
    assert.equal(repairAgentText("cincenta reales", undefined, "es"), "cincuenta reales", "la palabra-número con errata se oye (como blanco; como entrada jamás se repara)");
    assert.equal(repairGateTypos("tengo cincuenta"), "tengo cincuenta", "la palabra-número bien escrita no se toca");
  });

  it("las entradas de los escalones son la de dos pasadas, con la cortesía retirada", () => {
    assert.ok(relato.includes("function agentFold("), "el relato y el programa pliegan por agentFold");
    assert.ok(relato.includes("const folded = agentFold(state, lang, names, raw);"), "las dos entradas de relato.ts oyen por agentFold");
    assert.ok(relato.includes("function agentProtect("), "los nombres del libro se protegen en el relato");
    assert.ok(orden.includes("repairAgentText(foldQ(raw), protect, lang)"), "la orden repara en su entrada");
    assert.ok(orden.includes('replace(/\\b(por favor|please)\\b/g, " ")'), "la orden retira la cortesía");
    assert.ok(crear.includes("repairAgentText(foldQ(respuestaCruda), protect, lang)"), "crear oye la respuesta con errata");
    assert.ok(crear.includes("LA PASADA DIFUSA DEL DÓNDE"), "el dónde de crear gana su pasada difusa");
  });

  it("la coma que falta: la ventana reclamada y el corte en el verbo", () => {
    assert.ok(relato.includes("const claimed = new Set<number>()"), "el concepto son las palabras antes de su monto, y las de después quedan reclamadas");
    assert.ok(relato.includes("const verbCuts: number[] = []"), "splitClauses corta también ante un verbo tras una cláusula completa");
  });

  it("la batería de la rama es cerca permanente, con su excepción declarada", () => {
    assert.ok(pkg.includes("src/lib/faro/mutaciones-rama.test.ts"), "mutaciones-rama.test.ts corre en test:faro");
    const bateria = readFileSync(new URL("./mutaciones-rama.test.ts", import.meta.url), "utf8");
    assert.ok(bateria.includes("MUTACIONES_RAMA_EXCEPCION"), "la excepción de canon está declarada en la batería");
    assert.ok(bateria.includes('"chage the currency to cordobas"'), "el empate change/charge se declara, no se adivina");
  });
});
