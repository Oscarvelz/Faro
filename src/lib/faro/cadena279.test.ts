/**
 * FARO 1.3.279 — «La cadena y la demostración». Tres actualizaciones de la
 * mesa de Structure-Faro, integradas trozo a trozo en el Canon:
 *
 *  1. LA CADENA DE MITAD (auditoría ordenada por Oscar desde la línea de
 *     Brizna, 2026-11-14 17:09 EST, tras cazar en su teléfono la lección en
 *     blanco a mitad de módulo): entrar por una escena intermedia no
 *     sembraba las escenas anteriores — la ficción no existía y las anclas
 *     morían — y la invisibilidad de «la tarjeta nace donde va a vivir» se
 *     aplicaba a CADA compás pendiente, así que cada ancla muerta costaba
 *     su espera entera sin tarjeta. Invariantes: el escenario previo se
 *     siembra antes de actuar (sowPrefix a la cabeza del efecto de pasos)
 *     y la invisibilidad es SOLO del primer compás de la corrida (born).
 *  2. LEY 15 «NO SOLO CONTAR, MOSTRAR» (Oscar, línea de Brizna, 2026-11-14
 *     17:18–17:21 EST): en los botones verdaderamente importantes la
 *     presentación EJECUTA, no solo cuenta — también en Automático. Cinco
 *     compases pasan de show a do, con pies y anclas intactos; el de la
 *     moneda lleva además su toque de maquinaria de vuelta, para que la
 *     línea nazca en C$ como promete la escena siguiente.
 *  3. LA TARJETA ACOTADA (defecto latente cazado por la propia verificación
 *     de la línea): con un foco alto y ancho (la lista de «Me deben») la
 *     fórmula de «la tarjeta va arriba» la dejaba con el tope en −88px,
 *     cortada de forma estable. La tarjeta mide su altura real y su
 *     colocación es un top acotado a la pantalla.
 *
 * La conducta se prueba en banco; aquí se cerca la forma de la fuente y
 * los datos del guion donde la conducta vive.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { MODULES, type Module, type Step } from "./guion.ts";

const root = process.cwd();
const presTsx = fs.readFileSync(path.join(root, "src/components/faro/presentacion.tsx"), "utf8");

const sceneById = (id: string) => {
  for (const m of MODULES as readonly Module[]) {
    const s = m.scenes.find((x) => x.id === id);
    if (s) return s;
  }
  return undefined;
};
const kindAnchor = (st: Step): { kind: string; anchor?: string } => ({
  kind: st.kind,
  anchor: (st as { anchor?: string }).anchor,
});

describe("279 · la cadena de mitad: el escenario previo se garantiza", () => {
  it("sowPrefix existe y siembra solo semillas, en orden, sin repetir (seededRef manda)", () => {
    const start = presTsx.indexOf("const sowPrefix = (m: Module, upTo: number)");
    assert.ok(start >= 0, "sowPrefix debe existir en el motor");
    const body = presTsx.slice(start, start + 900);
    assert.ok(body.includes("s < upTo && s < m.scenes.length"), "recorre solo las escenas anteriores");
    assert.ok(body.includes('if (st.kind !== "seed") return;'), "siembra únicamente pasos seed");
    assert.ok(body.includes("if (seededRef.current.has(key)) return;"), "lo ya sembrado no se repite");
    assert.ok(body.includes("seededRef.current.add(key);"));
    assert.ok(body.includes("STAGE_SEEDS[st.seed]"), "siembra desde las recetas del escenario");
  });

  it("el efecto de pasos llama a sowPrefix a su cabeza, antes de actuar", () => {
    const call = presTsx.indexOf("sowPrefix(r.mod, r.sceneIdx);");
    assert.ok(call >= 0, "la llamada debe existir");
    const speed = presTsx.indexOf("const speed = r.speed;", call);
    assert.ok(speed > call, "sowPrefix va antes de que el motor arme el compás");
    const seedFlow = presTsx.indexOf('step.kind === "seed"', call);
    assert.ok(seedFlow === -1 || seedFlow > call, "sowPrefix precede al flujo normal de siembra");
  });

  it("cada corrida renace: el arranque limpia el hogar y desmarca el nacimiento", () => {
    const reset = presTsx.indexOf("homeRef.current = null;");
    assert.ok(reset >= 0);
    assert.ok(presTsx.slice(reset, reset + 120).includes("setBorn(false);"));
  });
});

describe("279 · el nacimiento es solo del primer compás", () => {
  it("born/homeRef viven en el motor y el marcado es en fase de render", () => {
    assert.ok(presTsx.includes("const [born, setBorn] = useState(false);"));
    assert.ok(presTsx.includes("const homeRef = useRef<React.CSSProperties | null>(null);"));
    assert.ok(
      presTsx.includes("if (cardHome && hole) { homeRef.current = cardStyle; if (!born) setBorn(true); }"),
      "la primera medida del compás guarda el hogar y marca el nacimiento",
    );
    assert.ok(presTsx.includes("const cardPos = !cardHome && born && homeRef.current ? homeRef.current : cardStyle;"));
  });

  it("la tarjeta permanece visible tras nacer: la visibilidad es cardHome || born", () => {
    assert.ok(presTsx.includes("opacity: cardHome || born ? 1 : 0"));
    assert.ok(presTsx.includes('visibility: cardHome || born ? "visible" : "hidden"'));
    assert.ok(!presTsx.includes("opacity: cardHome ? 1 : 0"), "la forma vieja — invisible en cada compás pendiente — no vuelve");
  });
});

describe("279 · la tarjeta acotada: jamás cortada por un borde", () => {
  it("la tarjeta mide su altura real en su nodo", () => {
    assert.ok(presTsx.includes("const [cardH, setCardH] = useState(0);"));
    assert.ok(presTsx.includes("node.getBoundingClientRect().height"), "el ref mide el nodo real");
    assert.ok(presTsx.includes("setCardH(h);"));
  });

  it("con medida, la colocación es un top acotado a la pantalla por ambos lados", () => {
    assert.ok(presTsx.includes("hole.top - 14 - cardH"), "el sitio de arriba descuenta la altura medida");
    assert.ok(presTsx.includes("window.innerHeight - cardH - 10"), "el tope nunca sale por abajo");
    assert.ok(presTsx.includes("Math.max(10, Math.min("), "el top se comprime hasta caber, con suelo de 10");
  });
});

describe("279 · ley 15: los cinco compases ejecutan, no solo cuentan", () => {
  it("m3-moneda: la moneda se toca (do) y la maquinaria la devuelve (tap) — la línea nace en C$", () => {
    const sc = sceneById("m3-moneda");
    assert.ok(sc, "la escena existe");
    assert.equal(sc.steps.length, 2);
    assert.deepEqual(kindAnchor(sc.steps[0]), { kind: "do", anchor: "book-coin" });
    assert.deepEqual(kindAnchor(sc.steps[1]), { kind: "tap", anchor: "book-coin" });
    assert.deepEqual((sc.steps[0] as { caption: unknown }).caption,
      ["La moneda dorada alterna C$ y $: anotas sin reescribir.", "The golden coin flips C$ and $: write without rewriting."],
      "el pie queda intacto");
  });

  it("m4-vista: «Ver en dólares» se ejecuta (do sobre fx-view), pie intacto", () => {
    const sc = sceneById("m4-vista");
    assert.ok(sc);
    assert.deepEqual(kindAnchor(sc.steps[0]), { kind: "do", anchor: "fx-view" });
    assert.deepEqual((sc.steps[0] as { caption: unknown }).caption,
      ["«Ver en dólares» viste toda la app de dólares, al instante.", "“View in dollars” dresses the whole app in dollars, instantly."]);
  });

  it("m6-anos: los años de la palanca se tocan (do sobre lever-years), pie intacto", () => {
    const sc = sceneById("m6-anos");
    assert.ok(sc);
    assert.deepEqual(kindAnchor(sc.steps[0]), { kind: "do", anchor: "lever-years" });
    assert.deepEqual((sc.steps[0] as { caption: unknown }).caption,
      ["Los años se tocan y se editan: la foto cambia contigo.", "The years can be tapped and edited: the photo changes with you."]);
  });

  it("m8-torre y m8-desplegar: la torre se abre y «Desplegar» despliega (do), pies intactos", () => {
    const torre = sceneById("m8-torre");
    assert.ok(torre);
    assert.deepEqual(kindAnchor(torre.steps[0]), { kind: "do", anchor: "advice-tower" });
    assert.deepEqual((torre.steps[0] as { caption: unknown }).caption,
      ["La torre del mes se abre por partes: toca y despliega.", "The month's tower opens in parts: tap and unfold."]);
    const desp = sceneById("m8-desplegar");
    assert.ok(desp);
    assert.deepEqual(kindAnchor(desp.steps[0]), { kind: "do", anchor: "advice-unfold" });
    assert.deepEqual((desp.steps[0] as { caption: unknown }).caption,
      ["«Desplegar» abre todas las tarjetas de una sola vez.", "“Unfold” opens every card in one go."]);
  });
});
