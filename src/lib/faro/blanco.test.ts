// El blanco intermedio (1.3.212): Oscar decidió que la blancura plena de las
// fichas era el fantasma que nombraba («I don't like the full whiteness in
// these chips») y aprobó el candidato C desde fotografías del banco. Esta
// suite fija los valores C tal como se aprobaron: la elevación blanca a la
// mitad, el suelo en el tono profundo de cada tema, la luz superior
// suavizada — y el marco de acento intacto, que es quien lleva la señal de
// selección. También fija lo que la ola NO tocó: el cristal del riel (la
// receta histórica, fuente del candidato B) conserva sus valores.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const styles = fs.readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const brillo = fs.readFileSync(new URL("../../components/faro/brillo.css", import.meta.url), "utf8");

describe("blanco intermedio: la pastilla (.seg-pill)", () => {
  it("el relleno es el gradiente C: blanco 10% y suelo en el tono profundo con un susurro de acento", () => {
    assert.ok(styles.includes(
      ".seg-pill { background: linear-gradient(180deg, color-mix(in oklab, white 10%, var(--surface)), color-mix(in oklab, var(--accent) 6%, color-mix(in oklab, var(--surface) 72%, var(--surface-2))));"),
      "el relleno de la pastilla no es el candidato C aprobado");
  });

  it("la luz superior de la pastilla baja a 38% (era 62%)", () => {
    assert.ok(styles.includes(
      "box-shadow: inset 0 1px 0 color-mix(in oklab, white 38%, transparent); border: 0; }"),
      "la luz superior base de la pastilla no es 38%");
    assert.ok(brillo.includes(
      "inset 0 1px 0 color-mix(in oklab, white 38%, transparent)"),
      "la luz superior de brillo para la pastilla no es 38%");
  });

  it("el marco y el resplandor de acento quedan intactos en brillo (65% / 25%)", () => {
    assert.ok(brillo.includes(
      ".seg.is-follow .seg-pill {\n  /* 1.3.212: frame (65%) and glow (25%) unchanged"),
      "falta la regla de la pastilla en brillo");
    assert.ok(brillo.includes(
      "box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--accent) 65%, transparent), inset 0 0 14px color-mix(in oklab, var(--accent) 25%, transparent), inset 0 1px 0 color-mix(in oklab, white 38%, transparent);"),
      "el marco/resplandor de la pastilla cambió");
  });

  it("el brillo de deslizamiento baja a 40% (era 55%)", () => {
    assert.ok(styles.includes(
      ".seg-pill.is-gliding::after { content: \"\"; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 15%, color-mix(in oklab, white 40%, transparent) 50%, transparent 85%);"),
      "el sheen de la pastilla no es 40%");
  });

  it("el relleno viejo de blancura plena ya no pinta la pastilla", () => {
    // Alcance: la regla de la pastilla. El mismo gradiente sobrevive en
    // .tool-card, que no es una ficha de selección y no es asunto de esta ola.
    assert.ok(!styles.includes(
      ".seg-pill { background: linear-gradient(180deg, color-mix(in oklab, white 22%, var(--surface))"),
      "sobrevive el relleno blanco 22% en la regla de la pastilla");
  });
});

describe("blanco intermedio: el portador del dock (.dock-glide)", () => {
  it("el tinte se asienta en el tono profundo (superficie 70% / superficie-2 30%)", () => {
    assert.ok(styles.includes(
      "background: color-mix(in oklab, var(--accent) 14%, color-mix(in oklab, var(--surface) 70%, var(--surface-2)))"),
      "el fondo del glide no es el tinte C");
    // Alcance: la regla del glide. El tinte plano al 14% sobrevive como
    // tinte de casa en insignias y opciones (xp-badge, fit-opt…), que no
    // son portadores de la selección.
    const glideAt = styles.indexOf(".dock-glide { position: absolute;");
    assert.ok(glideAt >= 0, "falta la regla del glide");
    const glideRule = styles.slice(glideAt, styles.indexOf("}", glideAt));
    assert.ok(!glideRule.includes("var(--accent) 14%, var(--surface))"),
      "sobrevive el tinte plano anterior dentro de la regla del glide");
  });

  it("su luz superior baja a 18% (era 28%) en la base y en brillo; el halo no cambia", () => {
    assert.ok(styles.includes(
      "box-shadow: inset 0 1px 0 color-mix(in oklab, white 18%, transparent); transition: left .42s"),
      "la luz superior base del glide no es 18%");
    assert.ok(brillo.includes(
      "box-shadow: inset 0 1px 0 color-mix(in oklab, white 18%, transparent), 0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent), 0 0 16px -2px color-mix(in oklab, var(--accent) 40%, transparent);"),
      "la sombra de brillo del glide cambió más allá de la luz superior");
  });
});

describe("blanco intermedio: lo que no se tocó", () => {
  it("el cristal del riel conserva su receta histórica en sus dos variantes", () => {
    const glass = "background: linear-gradient(180deg, color-mix(in oklab, white 26%, var(--surface)), color-mix(in oklab, var(--surface) 78%, var(--bg)))";
    assert.equal(styles.split(glass).length - 1, 2, "la receta del cristal del riel cambió");
  });
});
