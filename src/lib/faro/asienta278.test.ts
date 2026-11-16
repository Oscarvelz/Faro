/**
 * FARO 1.3.278 — «La presentación se asienta» (veredictos telefónicos de
 * Oscar sobre la 1.3.277, 2026-11-14 16:56–16:58 EST). Tres defectos:
 *
 *  1. LA VELOCIDAD — «en su velocidad normal el mapa pasa muy rápido».
 *     El diagnóstico, con las fórmulas del propio conductor: el módulo 1
 *     anunciaba 97s y corría en ≈85s, porque el compás de gesto en
 *     Automático actuaba al 55% de la permanencia del pie (un «Abre las
 *     vistas» de 3 palabras vivía 1695ms) y los pies cortos no tenían
 *     suelo (3-4 palabras = 1.9-2.2s nominales, menos ~0.4s de aparición
 *     de la tarjeta). Arreglo: el gesto espera el pie ENTERO (+650 de
 *     asentamiento, que es lo que stepMs anuncia desde esta ola) y todo
 *     pie lleva un suelo de 2.6s (MIN_DWELL_MS). El mapa anuncia 96s y
 *     corre ≈95.8s: lo anunciado y lo real por fin son la misma cifra.
 *  2. LA TARJETA EN SU LUGAR — «presentaciones no se queda en su lugar en
 *     ajustes, sino que se sobrepone a todos los ajustes» (su foto: la
 *     tarjeta pintada sobre «Bancos y recompensas»). La causa: la tarjeta
 *     del índice vestía la clase `pres-card` — la de la tarjeta de la
 *     ACTUACIÓN, que es position:fixed — y se salía del flujo. Arreglo:
 *     la tarjeta de Ajustes es una tarjeta de Ajustes (card manual-card
 *     aj-card) y nada más; la clase de la actuación sigue fija, en su casa.
 *  3. EL VELO SIN DIFUMINADO — su corrección (16:58 EST): «no es un
 *     difuminado, es un oscurecimiento de la pantalla de atrás y una
 *     desaturización leve para poder ver dónde están los botones. De otra
 *     forma no sirve el mapa. Y esto en todos los demás módulos.» Los
 *     cuatro escudos ya no difuminan nada (blur(5px) fuera): oscurecen a
 *     .34 (antes .5) y desaturan a .72; el hueco queda nítido. Es la
 *     construcción única del motor: vale para todos los módulos a la vez.
 *
 * Lo que cercan estas pruebas: el suelo y la honestidad del reloj (en
 * guion.ts, con números), y la forma de la fuente donde la conducta vive
 * en el motor y en el CSS (la conducta misma se prueba en banco).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  MIN_DWELL_MS, MODULES, RESULT_MS, dwellMs, moduleById, moduleSeconds, stepMs, wordCount, pick,
  type Pair, type Step,
} from "./guion.ts";

const root = process.cwd();
const presTsx = fs.readFileSync(path.join(root, "src/components/faro/presentacion.tsx"), "utf8");
const presCss = fs.readFileSync(path.join(root, "src/components/faro/presentacion.css"), "utf8");
const screensTsx = fs.readFileSync(path.join(root, "src/components/faro/screens.tsx"), "utf8");

const ctxMs = (step: Step, lang: string): number =>
  "contexto" in step && step.contexto
    ? Math.round((wordCount(pick(step.contexto, lang)) / 200) * 60_000)
    : 0;

describe("278 · el reloj: suelo y honestidad", () => {
  it("el suelo de todo pie es 2.6s y dwellMs lo respeta en ambos idiomas", () => {
    assert.equal(MIN_DWELL_MS, 2600);
    const one: Pair = ["Uno.", "One."];
    assert.equal(dwellMs(one, "es"), MIN_DWELL_MS);
    assert.equal(dwellMs(one, "en"), MIN_DWELL_MS);
    const three: Pair = ["Abre las vistas.", "Open the views."];
    assert.equal(dwellMs(three, "es"), MIN_DWELL_MS);
    const long: Pair = ["Una explicación con muchas más palabras que el suelo no toca jamás en absoluto.", "x"];
    assert.ok(dwellMs(long, "es") > MIN_DWELL_MS, "un pie largo vive más que el suelo");
  });

  it("los costes anunciados son los del motor, exactos", () => {
    const cap: Pair = ["Toca Libros para entrar.", "Tap Libros to go in."];
    const doStep: Step = { kind: "do", anchor: "nav-books", caption: cap };
    // ACTUALIZADO en la integración de la entrega de los 18 principios (2026-11-16):
    // el asentamiento fijo de 650/500 de la 1.3.278 lo sustituye RESULT_MS — el
    // momento del resultado del principio 9 — en stepMs Y en el motor a la vez;
    // la ley de esta cerca (lo anunciado es lo ejecutado) no cambia, y la cerca
    // de los principios en guion.test.ts la afirma para todo el registro.
    assert.equal(stepMs(doStep, "es"), dwellMs(cap, "es") + RESULT_MS, "do = pie entero + RESULT_MS (el momento del resultado)");
    assert.equal(stepMs({ kind: "tap", anchor: "x" }, "es"), 720, "tap = 300 + toque + 420");
    assert.equal(stepMs({ kind: "seed", seed: "x" }, "es"), 600, "seed = lo que el motor espera");
    const typeStep: Step = { kind: "type", anchor: "x", text: cap, caption: cap };
    assert.equal(stepMs(typeStep, "es"), dwellMs(cap, "es") + RESULT_MS, "type = pie entero + RESULT_MS");
  });

  it("el mapa: ningún pie por debajo del suelo y la duración anunciada es la real", () => {
    const mapa = moduleById("mapa");
    assert.ok(mapa, "el módulo 1 existe");
    for (const lang of ["es", "en"]) {
      for (const sc of mapa!.scenes) {
        for (const st of sc.steps) {
          if ("caption" in st) {
            assert.ok(dwellMs(st.caption, lang) >= MIN_DWELL_MS, `${sc.id}: su pie vive ≥ el suelo`);
            assert.ok(stepMs(st, lang) >= MIN_DWELL_MS, `${sc.id}: su coste anunciado ≥ el suelo`);
          }
        }
      }
      const sec = moduleSeconds(mapa!, lang);
      assert.ok(sec >= 92, `el mapa anuncia ${sec}s (antes del arreglo corría en ≈85s)`);
    }
    assert.equal(moduleById("mapa")!.scenes.length, 21, "el mapa sigue teniendo 21 escenas");
    assert.ok(MODULES.length >= 11, "el registro sigue completo");
  });

  it("el motor ya no actúa al 55%: el gesto espera el pie entero", () => {
    assert.ok(!presTsx.includes("capDwell * 0.55"), "el atajo del 55% no existe en el conductor");
    // ACTUALIZADO en la integración de los 18 principios (2026-11-16): el divisor
    // del motor ya no es la etiqueta cruda (`speed`) sino su traducción por la
    // escala recalibrada, `paceOf(speed)` — el gesto sigue programándose tras el
    // pie ENTERO (capDwell / pace) y la siembra sigue esperando sus 600 anunciados.
    assert.ok(/\}, capDwell \/ pace\)/.test(presTsx), "el gesto en Automático se programa a capDwell / pace (la escala recalibrada)");
    assert.ok(presTsx.includes("600 / pace"), "la siembra espera los 600ms anunciados");
  });
});

describe("278 · la tarjeta de Ajustes vive en el flujo", () => {
  it("la sección del índice no viste la clase de la actuación", () => {
    const tag = presTsx.match(/<section[^>]*data-anchor="aj-presentaciones"[^>]*>/);
    assert.ok(tag, "la sección con el ancla aj-presentaciones existe");
    assert.ok(!tag![0].includes("pres-card"), "sin pres-card: nada de position:fixed en Ajustes");
    assert.ok(tag![0].includes("aj-card"), "es una tarjeta de Ajustes como sus hermanas");
  });

  it("la clase de la actuación sigue siendo fija — en la actuación", () => {
    const rule = presCss.match(/\.pres-card \{[^}]*\}/);
    assert.ok(rule && /position: fixed/.test(rule![0]), ".pres-card conserva position:fixed para la actuación");
    assert.ok(presTsx.includes('className="pres-card is-done"'), "la tarjeta final la sigue usando");
  });

  it("Ajustes sigue montando la tarjeta tras la del Manual", () => {
    const manualAt = screensTsx.indexOf('data-anchor="aj-manual"');
    const presAt = screensTsx.indexOf("<PresentacionesCard />");
    assert.ok(manualAt >= 0 && presAt > manualAt, "PresentacionesCard se monta después del Manual");
  });
});

describe("278 · el velo: oscurece y desatura, jamás difumina", () => {
  const shieldRules = [...presCss.matchAll(/\.pres-shield \{[^}]*\}/g)].map((m) => m[0]).join("\n");

  it("los escudos no llevan blur en ninguna de sus reglas", () => {
    assert.ok(shieldRules.length > 0, "las reglas de .pres-shield existen");
    assert.ok(!shieldRules.includes("blur("), "sin difuminado: Oscar lo prohibió por nombre");
  });

  it("el tratamiento es oscurecimiento .34 + desaturización .72", () => {
    assert.ok(shieldRules.includes("oklab(0% none none / .34)"), "oscurecimiento a .34 (antes .5)");
    assert.ok(shieldRules.includes("saturate(.72)"), "desaturización leve a .72");
  });

  it("el hueco sigue nítido: ningún escudo lo cubre y el anillo vive", () => {
    assert.ok(presTsx.includes('className="pres-shield"'), "el conductor sigue pintando los escudos");
    assert.ok(/\.pres-hole \{[^}]*box-shadow:/.test(presCss), "el anillo del foco sigue en pie");
  });
});
