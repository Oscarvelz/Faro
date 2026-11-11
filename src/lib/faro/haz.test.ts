// El haz nace en la bombilla (1.3.215): Oscar vio que la luz del faro salía
// del medio de la torre en vez de la bombilla de arriba («the light of the
// lighthouse comes from the middle instead of from the light bulb on top») y
// pidió el arreglo en todos los temas y en toda la app. Esta suite fija la
// geometría: en cada dibujo con haz, el ápice del haz coincide EXACTO con el
// centro de la lámpara, calculado desde los propios números del dibujo — para
// que ninguna oleada futura (la de arte, 1.3.216, repinta estos dibujos) lo
// desancle sin que una prueba grite.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const study2 = fs.readFileSync(new URL("../../components/faro/study2.tsx", import.meta.url), "utf8");
const advisor2 = fs.readFileSync(new URL("../../components/faro/advisor2.tsx", import.meta.url), "utf8");
const advisor2Css = fs.readFileSync(new URL("../../components/faro/advisor2.css", import.meta.url), "utf8");

describe("el haz de la escena del mar (study2, viewBox 320x124)", () => {
  it("la lámpara: la casa se traslada a (x1+4, 30) y el rectángulo de la lámpara centra en (286, 35.5)", () => {
    assert.ok(study2.includes("transform={`translate(${x1 + 4} 30)`}"), "la traslación de la casa cambió");
    assert.ok(study2.includes('<rect x="-5" y="2" width="10" height="7" rx="1.5" className="s2-lamp" />'), "el rectángulo de la lámpara cambió");
    // centro = traslación + (x + w/2, y + h/2) = (282+4 + 0, 30 + 5.5) = (286, 35.5)
  });
  it("el ápice del haz ES el centro de la lámpara: (x1+4, 35.5)", () => {
    assert.ok(study2.includes("points={`${x1 + 4},35.5 ${Math.max(x0, bx + 10)},38 ${Math.max(x0, bx + 10)},66`}"),
      "el ápice del haz no está anclado en la bombilla");
    assert.ok(!study2.includes("${x1 + 6},50"), "el ápice viejo (288, 50 — el medio de la torre) sigue presente");
  });
  it("el borde lejano del haz conserva su vínculo con el barco (max(x0, bx+10), 38..66)", () => {
    assert.ok(study2.includes("${Math.max(x0, bx + 10)},38 ${Math.max(x0, bx + 10)},66"),
      "el borde lejano del haz perdió su vínculo con bx");
  });
});

describe("el haz de la torre del Asesor (advisor2, viewBox 120x210)", () => {
  it("la lámpara centra en (60, 45)", () => {
    assert.ok(advisor2.includes('<circle cx="60" cy="45" r="5.5" className="a2-lamp"'), "la lámpara de la torre cambió de sitio");
  });
  it("el borde cercano del haz exterior centra en (60, 45): M60 41 … L60 49", () => {
    assert.ok(advisor2.includes('d="M60 41 L400 -24 L400 124 L60 49 Z"'), "el haz exterior no nace en la bombilla");
    assert.ok(!advisor2.includes("M62 42"), "el nacimiento viejo (62, 42–50) sigue presente");
  });
  it("el borde cercano del núcleo centra en (60, 45): M60 43.5 … L60 46.5", () => {
    assert.ok(advisor2.includes('d="M60 43.5 L250 36 L250 56 L60 46.5 Z"'), "el núcleo del haz no nace en la bombilla");
    assert.ok(!advisor2.includes("M62 44.5"), "el nacimiento viejo del núcleo sigue presente");
  });
  it("el pivote del giro (a2-turn) es el centro de la lámpara: 60px 45px", () => {
    assert.ok(advisor2Css.includes(".a2-beam { opacity: var(--glow, .8); transform-origin: 60px 45px;"),
      "el pivote del haz no coincide con la bombilla");
    assert.ok(!advisor2Css.includes("transform-origin: 60px 46px"), "el pivote viejo (60px 46px) sigue presente");
  });
  it("el haz sigue existiendo solo cuando no falta (el estado corto lo apaga entero)", () => {
    assert.ok(advisor2.includes('{!short ? <g className="a2-beam"'), "la condición del estado corto cambió");
    assert.ok(advisor2.includes('fill={short ? "#ff9a8a" : "#fff1c4"}'), "la lámpara salmón del estado corto cambió");
  });
});
