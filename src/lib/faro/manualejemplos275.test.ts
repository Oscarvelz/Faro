/**
 * FARO 1.3.275 — «El manual con ejemplos» (meta de Oscar, dictada en el chat
 * de Cadence 2026-11-14 y pasada a Faro como ley de manuales):
 * «Con ejemplos cortos y fáciles de entender, el manual se vuelve mucho más útil».
 *
 * El censo de la ola (~/workspace/faro-manual-examples/CENSUS.md) recorrió los
 * 347 temas: 12 ADD (ganan un ejemplo breve con números redondos), 3 IMPROVE
 * (su ejemplo existía pero con cifras de calculadora real) y 332 NONE.
 *
 * Cercas de esta ola:
 *  - Cada tema ADD lleva su ejemplo en el campo que el censo declaró (how o
 *    tip), en los dos idiomas, con la marca de la casa «Ejemplo:» / "Example:"
 *    y su cifra redonda — una edición futura no puede quitárselo en silencio.
 *  - Los tres IMPROVE llevan las cifras redondas nuevas, y las cifras viejas
 *    (38,181 · 7,636 · 11,454 · 36,6243 · 3 662) no aparecen en NINGÚN texto
 *    del manual.
 *  - Las burbujas quedan intactas por construcción: los ejemplos viven solo
 *    en how/tip (campos que solo renderiza el Manual) y ninguno de los 15
 *    temas tocados lleva campo `bubble`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MANUAL_TOPICS, findTopic } from "../manual/topics.ts";

type Field = "how" | "tip";

/** [tema, campo, cifra redonda que el ejemplo debe mostrar en ambos idiomas] */
const ADD: ReadonlyArray<readonly [string, Field, string]> = [
  ["oportunidad", "how", "C$5,000"],
  ["si-apartas", "how", "C$12,000"],
  ["con-interes", "how", "C$1,200"],
  ["f-pago-interes", "how", "C$800"],
  ["balance-neto", "how", "C$3,000"],
  ["cuotas", "how", "$120"],
  ["promedio", "tip", "C$3,000"],
  ["ritmo", "tip", "C$15,000"],
  ["regla-50-30-20", "tip", "C$10,000"],
  ["lo-que-me-deben", "how", "C$3,500"],
  ["kn-petty", "how", "C$6,000"],
  ["seguro-vida", "how", "$50"],
];

/** [tema, cifras redondas nuevas que su how debe mostrar] */
const IMPROVE: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["libros", ["3,600", "36"]],
  ["meta-ahorro", ["C$40,000", "C$8,000"]],
  ["semaforo-verde", ["C$40,000", "C$12,000"]],
];

const OLD_FIGURES = ["38,181", "38 181", "7,636", "11,454", "36,6243", "36.6243", "3 662", "3,662"] as const;

describe("manual con ejemplos: el censo", () => {
  it("el manual sigue teniendo los temas censados (347 en 275; 348 desde la oleada 2 del modelo de ahorros, que añadió «Dónde vive tu ahorro»; 349 desde la etapa 1 de los tres modos, que añadió «Modo»; 353 desde la etapa 5, que injertó los cuatro temas de la entrega de Presentación — «Puedes gastar hoy», «Tus deudas, en claro», «Tu Asesor en Esencial», «Tu Asesor en Ritmo» — y reconcilió el quinto de la entrega, «Los modos de Faro», dentro del «Modo» ya existente: un solo tema `modos`; 354 desde la ayuda de la K 2026-11-16, que añadió «Cifras cortas»; 355 desde la Ola 1 de Captura Inteligente, que añadió «La bandeja y la mesa» (`captura-mesa`) junto a las superficies que nombra, como manda la ley del Manual; 356 desde la Ola 2, que añadió «Escribir como pienso» (`captura-texto`) con la puerta que nombra; 357 desde la Ola 3, que añadió «Pegar una lista» (`captura-lista`) con la suya; 358 desde la Ola 4, que añadió «Moneda invitada» (`moneda-invitada`) con la suya; 359 desde la Ola 5a, que añadió «Preguntar al Asesor» (`preguntar-asesor`) con la suya; 360 desde la 1.3.346, que añadió «Novedades» (`novedades`) con la suya; 361 desde la Ola 6 (1.3.356), que añadió «Pagos que se acercan y pago automático» (`avisos-pagos`) junto a las superficies que nombra; 362 desde la lista-plan (1.3.357), que añadió «La lista-plan» (`lista-plan`) junto a las superficies que nombra; 363 desde la lista de espera (1.3.360), que añadió «La lista de espera» (`lista-espera`) junto a las superficies que nombra; 364 desde las puertas de compartir (1.3.362), que añadió «Compartir con Faro» (`compartir`) junto a las superficies que nombra; 365 desde la Pieza 0 (1.3.363), que añadió «Tu nombre en Faro» (`nombre`) junto a la fila que nombra; 366 desde el saldo proyectado (1.3.365), que añadió «El saldo proyectado, día a día» (`saldo-proyectado`) junto a la lectura que nombra; 367 desde el vigilante de fijos (1.3.366), que añadió «Los cambios de precio» (`cambios-precio`) junto a las superficies que nombra; 368 desde la Bitácora (1.3.367), que añadió «La Bitácora y Tu año en Faro» (`bitacora`) junto a la sección que nombra; 369 desde las preguntas predeterminadas (1.3.369), que añadió «Tus preguntas a la mano» (`preguntas-a-la-mano`) junto a la caja y el pliegue que nombra; 370 desde la Ola 8 (1.3.388), que añadió «La billetera por notificaciones» (`billetera-notificaciones`) junto a la hoja que nombra; 371 desde la Pieza C5 del Libro Compartido (1.3.395), que añadió «El libro compartido» (`libro-compartido`) junto a la mesa que nombra; 372 desde el puerto de la Rama Agente (1.3.445), que añadió «Contarle al Asesor» (`asesor-relato`) junto a la caja que nombra; 373 desde la marca de compartido (1.3.489), que añadió «Compartido» (`f-compartido`) junto al editor de la línea que nombra; 377 desde la Pieza C9 del Libro Compartido (1.3.495), que añadió los cuatro temas de sus mini-ayudas — «Invitar a tu libro» (`compartir-invitacion`), «La vista previa» (`compartir-previa`), «Quiénes están en tu libro» (`compartir-miembros`) y «Salir de un libro compartido» (`compartir-salidas`) — junto a la mesa, la previa, la hoja de miembros y las ceremonias que nombran; 378 desde la Ola 33 (1.3.496), que añadió «La vigilancia» (`vigilancia`) junto a la tarjeta de Central que nombra; 379 desde la 1.3.522, que añadió «El presupuesto de una categoría» (`presupuestos`) junto a la tarjeta de Central, el pliegue de Estudio y la ficha que nombra)", () => {
    assert.equal(MANUAL_TOPICS.length, 379);
  });
});

describe("manual con ejemplos: los ADD llevan su ejemplo", () => {
  for (const [id, field, figure] of ADD) {
    it(`${id}: «Ejemplo:» con ${figure} en su ${field}, en los dos idiomas`, () => {
      const tp = findTopic(id);
      assert.ok(tp, `el tema ${id} no existe`);
      const pair = tp[field];
      assert.ok(pair, `${id} no tiene campo ${field}`);
      assert.ok(pair[0].includes("Ejemplo:"), `${id} (${field}, ES) perdió la marca «Ejemplo:»`);
      assert.ok(pair[1].includes("Example:"), `${id} (${field}, EN) perdió la marca "Example:"`);
      assert.ok(pair[0].includes(figure), `${id} (${field}, ES) perdió su cifra redonda ${figure}`);
      assert.ok(pair[1].includes(figure), `${id} (${field}, EN) perdió su cifra redonda ${figure}`);
    });
  }
});

describe("manual con ejemplos: los IMPROVE quedaron redondos", () => {
  for (const [id, figures] of IMPROVE) {
    it(`${id}: su how muestra ${figures.join(" y ")}`, () => {
      const tp = findTopic(id);
      assert.ok(tp, `el tema ${id} no existe`);
      assert.ok(tp.how, `${id} no tiene how`);
      for (const f of figures) {
        assert.ok(tp.how[0].includes(f), `${id} (ES) no muestra ${f}`);
        assert.ok(tp.how[1].includes(f), `${id} (EN) no muestra ${f}`);
      }
    });
  }

  it("ninguna cifra vieja sobrevive en ningún texto del manual", () => {
    const fields = ["title", "sum", "what", "whatAlt", "bubble", "how", "tip"] as const;
    for (const tp of MANUAL_TOPICS) {
      for (const f of fields) {
        const pair = tp[f];
        if (!pair) continue;
        for (const lang of pair) {
          for (const old of OLD_FIGURES) {
            assert.ok(!lang.includes(old), `${tp.id} (${f}) aún cita la cifra vieja ${old}`);
          }
        }
      }
    }
  });
});

describe("manual con ejemplos: las burbujas no se tocaron (enmendado en 1.3.338)", () => {
  // En 275 esta cerca afirmaba que ninguno de los 15 temas llevaba `bubble`:
  // era el alcance de AQUELLA oleada (los ejemplos no tocan las burbujas).
  // La 1.3.338 — la cura de las ayudas breves, por orden de Oscar — dio
  // burbuja propia a los temas cuyo `what` pasa de 40 palabras, y dos de
  // los 15 están en esa clase. La ley de las burbujas vive ahora en
  // ayudabreve.test.ts; aquí queda el registro: solo esos dos la llevan.
  // ENMIENDA 1.3.341 (la segunda pasada de la caza): la banda 31–40 ganó
  // su burbuja y balance-neto — uno de los 15, con su what de 33 — entró
  // en la clase; el registro crece a tres, con la misma ley.
  it("de los 15 temas, solo oportunidad, seguro-vida y balance-neto llevan burbuja breve", () => {
    const touched = [...ADD.map(([id]) => id), ...IMPROVE.map(([id]) => id)];
    assert.equal(touched.length, 15);
    const withBubble = touched.filter((id) => findTopic(id)?.bubble);
    assert.deepEqual(withBubble.sort(), ["balance-neto", "oportunidad", "seguro-vida"]);
  });
});
