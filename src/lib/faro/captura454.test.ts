/**
 * captura454 — el puerto del paquete 65–67 de la línea Q&A (1.3.454):
 * la campaña de mutaciones. La reparación de erratas corre antes de
 * la cascada (65), el dinero se oye con su nombre de todos los días
 * (66) y las voces, puentes y cesiones que faltaban cierran la
 * campaña (67). La batería de mutaciones queda como cerca permanente
 * (mutaciones.test.ts). Estas cercas fijan las costuras del puerto:
 * la maquinaria, el hilo del texto reparado (rawR), el puente de
 * parentesco, y las adjudicaciones propias de canon.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { repairGateTypos } from "./ask2.ts";

const ask2 = readFileSync(new URL("./ask2.ts", import.meta.url), "utf8");
const qb = readFileSync(new URL("./questionbank.ts", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

describe("captura454 · el paquete 65–67 vive en canon", () => {
  it("la maquinaria de reparación (65): diccionario, jamás-reparar y la única candidata", () => {
    assert.ok(ask2.includes("const GATE_WORDS"), "el diccionario de las puertas está");
    assert.ok(ask2.includes("const NEVER_REPAIR"), "las palabras que jamás se reparan están");
    assert.equal(repairGateTypos("cuanto ahoro tengo"), "cuanto ahorro tengo", "la errata se repara a su única palabra de puerta");
    assert.equal(repairGateTypos("cuantas vece"), "cuantas vece", "el empate entre familias no se toca (vece: veces/vence)");
    assert.equal(repairGateTypos("tengo diez"), "tengo diez", "una palabra-número jamás se trata como errata");
  });

  it("la tanda de canon: las voces que solo canon conoce viven en el diccionario", () => {
    for (const w of ["palmado", "dineral", "broke", "fortune", "advisor", "llego", "tightest"]) {
      assert.ok(ask2.includes(`"${w}"`), `«${w}» está en el diccionario`);
    }
    assert.ok(ask2.includes('"cargo"') && ask2.includes('"tasa"'), "las tandas de las olas 68/69 llegaron con la maquinaria (sus familias vienen con sus paquetes)");
  });

  it("el hilo del texto reparado (67): la cascada, el delegado y el Camino leen rawR", () => {
    assert.ok(ask2.includes("let folded = normalizeEs(repairGateTypos(foldQ(raw), protect67, lang))"), "la cascada juzga el texto reparado con los nombres del libro protegidos");
    assert.ok(ask2.includes("const rawR = repairRawText(raw);"), "rawR conserva la voz del usuario");
    assert.ok(ask2.includes("answerQuestion(state, key, lang, names, rawR, parseCtx, today, c.mode)"), "el delegado y la costura del Camino leen el texto reparado");
    assert.ok(ask2.includes("hipoteticoAnswer(c, folded, rawR, pin?.accountId)"), "el hipotético lee las premisas reparadas");
    assert.ok(ask2.includes("quiero saber|quisiera saber"), "la forma de la pregunta se retira una sola vez antes de la cascada");
  });

  it("el puente de parentesco y el nombre deformado (67)", () => {
    assert.ok(ask2.includes("const KIN_BRIDGE"), "el puente fijo de parentesco está");
    assert.ok(ask2.includes("function personNamedIn"), "la pasada difusa de nombres está");
    assert.ok(ask2.includes("personNamedIn(f, x.name)"), "el reparto resuelve el rótulo por parentesco");
    assert.ok(ask2.includes("personNamedIn(folded, p.name)"), "la confirmación oye el nombre deformado («Caros»)");
  });

  it("el dinero con su nombre (66) y las voces adjudicadas en el puerto", () => {
    assert.ok(ask2.includes("const bareMoney"), "la forma desnuda «¿tengo billete?» vive en el total");
    assert.ok(ask2.includes("cuanto (debo|deberia|necesito) ahorrar"), "la meta oye «debería»");
    assert.ok(ask2.includes("aguanta|aguanto|de respaldo"), "el respaldo oye la primera persona («aguanto»)");
    assert.ok(ask2.includes("debt[- ]?free"), "el futuro oye «debtfree» sin guion ni espacio");
    assert.ok(ask2.includes("dime si|estoy|ando|am i"), "la figurada oye «Am I broke» sin signos");
    assert.ok(ask2.includes("right(\\?|\\.)?\\s*$"), "la confirmación oye «right» sin signo de cierre");
  });

  it("los registros: la canónica del patrón en su casa y la batería permanente registrada", () => {
    const remesas = qb.slice(qb.indexOf('id: "remesas"'), qb.indexOf('id: "remesas"') + 900);
    assert.ok(remesas.includes("¿Cuál es mi patrón de remesas?"), "la canónica vive también en remesas, su casa servida");
    assert.ok(pkg.includes("mutaciones.test.ts"), "la batería de mutaciones es cerca permanente");
    assert.ok(pkg.includes("captura454.test.ts"), "esta cerca está registrada en test:faro");
  });
});
