// Las ayudas breves (1.3.338): Oscar (2026-11-20) — «Ayudas como esas
// parecen estar leyendo el manual. No debería ser así de grande, debería
// ser más directa, útil, específica.» El mecanismo ya existía (el campo
// `bubble` del tema, que la burbuja sirve en vez del `what`), pero solo dos
// temas de 355 lo llevaban: la burbuja servía el «Qué es» entero del Manual
// en 49 temas cuyo what pasa de 40 palabras. Esta cerca fija la clase: un
// what largo SIN burbuja propia corre rojo al nacer, y toda burbuja es
// breve (≤ 26 palabras por idioma, con sus marcas [[ ]] en regla).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MANUAL_TOPICS, bubbleText } from "../manual/topics.ts";

const words = (s: string) => s.replace(/\[\[|\]\]/g, "").split(/\s+/).filter(Boolean).length;

describe("las ayudas breves — la burbuja no lee el Manual", () => {
  it("todo tema con un what largo (>40 palabras) lleva su burbuja breve", () => {
    const missing = MANUAL_TOPICS.filter((tp) => Math.max(words(tp.what[0]), words(tp.what[1])) > 40 && !tp.bubble).map((tp) => tp.id);
    assert.deepEqual(missing, [], `temas con el «Qué es» entero por burbuja: ${missing.join(", ")}`);
  });

  it("toda burbuja es breve en los dos idiomas y sus marcas están en regla", () => {
    for (const tp of MANUAL_TOPICS) {
      if (!tp.bubble) continue;
      for (const s of tp.bubble) {
        assert.ok(words(s) <= 26, `${tp.id}: burbuja de ${words(s)} palabras — la burbuja es una frase, no un párrafo`);
        assert.equal((s.match(/\[\[/g) ?? []).length, (s.match(/\]\]/g) ?? []).length, `${tp.id}: marcas [[ ]] desbalanceadas`);
      }
    }
  });

  it("el mecanismo sirve la burbuja cuando el tema la lleva", () => {
    const tp = MANUAL_TOPICS.find((x) => x.id === "escanear");
    assert.ok(tp?.bubble, "escanear — el espécimen de Oscar — lleva su burbuja");
    assert.equal(bubbleText(tp!, "es"), tp!.bubble![0]);
    assert.ok(words(bubbleText(tp!, "es")) <= 26, "la burbuja de Escanear es breve");
  });
});
