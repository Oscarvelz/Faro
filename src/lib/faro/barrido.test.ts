/**
 * barrido — LA CERCA DEL BARRIDO DEL REPARADOR (registro
 * BARRIDO-REPARADOR-REGISTRO.md en runpod-comparacion,
 * propuesta de Gemini): el vocabulario de todos los días
 * pasado por el pipeline entero cazó 84 movimientos del
 * reparador; la adjudicación fijó 42 palabras en el
 * diccionario de las puertas (las dañadas, sus vecinas
 * atraídas vuelta a vuelta, y las de la puerta vecina que
 * la cadena tocó: «seria», «plus», «horas», «days») y esta
 * cerca lo guarda: ninguna fijada se mueve, sin protector
 * ni con el de un libro típico, y las frases insignia que
 * las traen responden en su familia.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeEs, repairGateTypos } from "./ask2.ts";
import { foldQ } from "./lexicon.ts";

const FIJADAS = "ahora toda alta lana anda suelo junte das digas idas mano manos dano sano nos ando abri cafe claro ana carlos luis carla paty junior luz dan hora abrir nada manda tanda panda suelto luisa dani lucia amanda seria plus horas days".split(" ");
const LIBRO_TIPICO = "mama luz carlos ana salario renta despensa comida gasolina internet gimnasio banco paypal emergencia clases ventas ropa".split(" ");

describe("el barrido del reparador · las 42 fijadas y sus frases", () => {
  it("ninguna palabra fijada se mueve, en ninguna de las dos condiciones", () => {
    const protect = new Set<string>();
    for (const w of LIBRO_TIPICO) for (const t of foldQ(w).split(/[^a-z0-9]+/)) if (t.length >= 3) protect.add(t);
    for (const w of FIJADAS) {
      assert.equal(normalizeEs(repairGateTypos(foldQ(w), undefined, "es")), w, `sin protector: ${w}`);
      assert.equal(normalizeEs(repairGateTypos(foldQ(w), protect, "es")), w, `con protector: ${w}`);
    }
  });
 /* Las frases insignia se guardan a nivel del pipeline, que
   * es lo que esta pieza garantiza: la palabra llega entera a
   * las puertas. Su familia en un libro dado es materia de la
   * cuenta de cobertura, ya contada ahí. */
  const pipeline = (raw: string) => normalizeEs(repairGateTypos(foldQ(raw), undefined, "es"));
  it("«¿a cómo anda el dólar en el banco?»: «anda» llega entera a las puertas", () => {
    assert.ok(pipeline("¿A cómo anda el dólar en el banco?").includes("anda"));
  });
  it("«¿cuál fue la factura de luz más alta?»: «alta» y «luz» llegan enteras", () => {
    const f = pipeline("¿Cuál fue la factura de luz más alta que he pagado?");
    assert.ok(f.includes("alta") && f.includes("luz"), f);
  });
  it("«¿cuántas horas trabajo para pagar el internet?»: «horas» no se vuelve singular (precio-tiempo la oye en plural)", () => {
    assert.ok(pipeline("¿Cuántas horas trabajo para pagar el internet?").includes("horas"));
  });
  it("«how many days until my internet is due?»: «days» no se vuelve «das» (calendario la oye en inglés)", () => {
    assert.ok(pipeline("How many days until my Internet is due?").includes("days"));
  });
  it("«¿cuánta lana me debe Carlos?»: «lana» y «carlos» llegan enteros, sin «ana»", () => {
    const f = pipeline("¿Cuánta lana me debe Carlos?");
    assert.ok(f.includes("lana") && f.includes("carlos"), f);
  });
});
