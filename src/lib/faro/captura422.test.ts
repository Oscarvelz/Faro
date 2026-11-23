/**
 * Captura 422 — la guía es tuya.
 *
 * Oscar (2026-11-22 17:29–17:31 EST): «¿Qué hay que el usuario quiera
 * cambiar la regla de 50-30-20 y poner la suya propia? ¿Se adaptan los
 * números?» — aprobado «Sí, constrúyela así». La guía pasa a ser un
 * ajuste del libro (guideNeedsPct/WantsPct/SavePct) que guideOf lee;
 * los cubos del coach, la tarjeta, el glosario y la respuesta «regla»
 * del Asesor se calculan desde ahí, y la tarjeta se edita desde sí
 * misma exigiendo que los tres sumen 100.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { guideOf } from "./coach.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const types = read("./types.ts");
const defaults = read("./defaults.ts");
const coach = read("./coach.ts");
const ask2 = read("./ask2.ts");
const pano = read("../../components/faro/panorama.tsx");
const topics = read("../manual/topics.ts");

test("422 · el libro guarda su guía y la puerta la juzga sin tumbar el libro", () => {
  for (const f of ["guideNeedsPct", "guideWantsPct", "guideSavePct"]) {
    assert.ok(types.includes(`${f}?: number`), `Settings lleva ${f}`);
    assert.ok(defaults.includes(`set.${f} !== undefined && !isFinD(set.${f})`), `la puerta juzga la forma de ${f}`);
  }
});

test("422 · guideOf: la clásica manda sin trío; el trío entero que suma 100 manda; lo demás cae", () => {
  const base = {} as Parameters<typeof guideOf>[0];
  assert.deepEqual(guideOf(base), { needs: 50, wants: 30, save: 20, custom: false });
  assert.deepEqual(guideOf({ ...base, guideNeedsPct: 60, guideWantsPct: 25, guideSavePct: 15 }), { needs: 60, wants: 25, save: 15, custom: true });
  assert.deepEqual(guideOf({ ...base, guideNeedsPct: 60, guideWantsPct: 25, guideSavePct: 10 }), { needs: 50, wants: 30, save: 20, custom: false }, "un trío que no suma 100 no manda");
  assert.deepEqual(guideOf({ ...base, guideNeedsPct: 60, guideWantsPct: 40 }), { needs: 50, wants: 30, save: 20, custom: false }, "un trío incompleto no manda");
  assert.deepEqual(guideOf({ ...base, guideNeedsPct: 50, guideWantsPct: 30, guideSavePct: 20 }), { needs: 50, wants: 30, save: 20, custom: false }, "la clásica escrita a mano no es «propia»");
});

test("422 · los cubos y el glosario nacen de la guía, no de los números tallados", () => {
  assert.ok(coach.includes("ideal: guide.needs"), "el cubo de necesidades lee la guía");
  assert.ok(coach.includes("ideal: guide.wants"), "el cubo de gustos lee la guía");
  assert.ok(coach.includes("ideal: guide.save"), "el cubo de ahorro lee la guía");
  assert.ok(!coach.includes("ideal: 50") && !coach.includes("ideal: 30") && !coach.includes("ideal: 20"), "ningún ideal queda tallado en el coach");
  assert.ok(coach.includes("guide.custom"), "el glosario distingue la guía propia de la clásica");
});

test("422 · la tarjeta se nombra y se edita desde la guía", () => {
  assert.ok(pano.includes("${g.needs} · ${g.wants} · ${g.save}"), "el título se compone con la guía vigente");
  assert.ok(pano.includes('data-anchor="guide-edit-open"'), "el botón de ajustar existe");
  assert.ok(pano.includes('data-anchor="guide-edit"'), "el editor existe");
  assert.ok(pano.includes("sum === 100"), "el editor exige que los tres sumen 100");
  assert.ok(pano.includes("guideNeedsPct: n"), "guardar escribe el trío en el libro");
  assert.ok(pano.includes("delete settings.guideNeedsPct"), "volver a la clásica borra el trío");
  assert.ok(!pano.includes("ideal: 50, more: false"), "la tarjeta ya no talla el 50");
});

test("422 · el Asesor mide contra la misma guía y el Manual la cuenta", () => {
  assert.ok(ask2.includes("guideOf(c.state.settings)"), "reglaAnswer lee la guía del libro");
  // ENMIENDA (integración de la Ola 26·U2 del banco): el juicio ya no
  // es un ternario suelto — cap(p, target) juzga CADA cubo contra el
  // número de la guía activa y la frase «En palabras:» lo dice. La
  // cerca sigue exigiendo lo mismo que exigía: que el «dentro» de
  // necesidades se juzgue contra guide.needs, en su forma nueva.
  assert.ok(ask2.includes("cap(pct(needs), guide.needs)"), "el «dentro» se juzga con la guía");
  const topic = topics.slice(topics.indexOf('id: "regla-50-30-20"'), topics.indexOf('id: "regla-50-30-20"') + 1600);
  assert.ok(topic.includes("Ajustar mi guía"), "el Manual nombra el editor de la tarjeta");
  assert.ok(topic.includes("la guía puede ser la tuya"), "el Manual dice que la guía puede ser del usuario");
});
