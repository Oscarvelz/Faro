/**
 * captura449 — 1.3.449 «Las figuras, declaradas»: el último escalón
 * del puerto de la Rama Agente (Adenda 2 del censo de figuras,
 * aprobado por Oscar el 2026-11-23 con su condición de exactitud).
 *
 * Lo que esta cerca clava:
 *  1. EL CONTRATO: BankResult gana `figure?: BankFigure` — el banco
 *     DECLARA (tipo, puntos, banda, nota) con los números reales
 *     del libro; el dibujo es de canon y llega en su propia ola.
 *  2. LAS DECLARACIONES viven en las respuestas: el camino de la
 *     factibilidad (caminoFigure desde el MISMO paseo — walkEvents
 *     ahora registra sus pasos), la escala, el lado a lado, el mapa
 *     de meses, el árbol del porqué y las barras del delegado.
 *  3. LA HONESTIDAD DEL CENSO: FUTURO no declara figura (su serie
 *     proyectada no existe como dato) y la condición de respaldo
 *     quedó verificada y escrita en su asiento (la vista de
 *     Ahorros · Colchón no dibuja la escala de meses: la
 *     declaración se queda).
 *  4. LOS ESPECÍMENES DEL CENSO (18) viven en el banco como cerca
 *     permanente, con sus asientos de canon escritos (las frases
 *     que en canon pertenecen a otra costura se piden por la
 *     puerta que canon les da).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const ask2 = readFileSync(new URL("./ask2.ts", import.meta.url), "utf8");
const banco = readFileSync(new URL("./banco.test.ts", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

describe("captura449 · las figuras declaradas (puerto Rama Agente, Adenda 2)", () => {
  it("el contrato: la respuesta declara su figura, con las seis formas del censo", () => {
    assert.ok(ask2.includes("export type BankFigure = {"), "el tipo BankFigure existe");
    assert.ok(ask2.includes('kind: "escala" | "barras" | "camino" | "lado" | "meses" | "arbol"'), "las seis formas, cerradas");
    assert.ok(ask2.includes("graph?: AskNode[]; figure?: BankFigure }"), "la figura viaja en la respuesta");
    assert.ok(ask2.includes("Las piezas de una figura de barras SUMAN el total"), "la condición de exactitud está escrita en el contrato");
  });

  it("el camino se declara desde el mismo paseo: walkEvents registra sus pasos y caminoFigure los lee", () => {
    assert.ok(ask2.includes("steps: Array<{ on: string; name: string; bal: number }>"), "el paseo guarda sus pasos");
    assert.ok(ask2.includes("steps.push({ on: e.on, name: e.name, bal })"), "cada paso es un saldo real tras un evento real");
    assert.ok(ask2.includes("function caminoFigure("), "la figura del camino existe");
    assert.ok(ask2.includes("const monthFigure = w.steps.length ? caminoFigure(c, start, w, null) : undefined;"), "sin pasos no hay camino de un punto");
  });

  it("las familias del censo declaran: escala, lado, meses, árbol y las barras del delegado", () => {
    assert.ok(ask2.includes('kind: "escala" as const'), "la escala (meta, verificación, respaldo)");
    assert.ok(ask2.includes('kind: "meses"'), "el mapa de meses (ingreso, estacionalidad)");
    assert.ok(ask2.includes('kind: "arbol"'), "el árbol del porqué");
    assert.ok(ask2.includes("LAS BARRAS QUE SUMAN del delegado"), "las barras de la queda y del libre, desde sus piezas");
    assert.ok(ask2.includes('figure = { kind: "barras", points: rest.map((p) => ({ label: p.label, minor: p.minor }))'), "la resta se declara de las mismas piezas");
  });

  it("la condición de respaldo, verificada y escrita en su asiento", () => {
    assert.ok(ask2.includes("La condición del censo, verificada en canon (1.3.449)"), "la verificación quedó escrita");
    assert.ok(ask2.includes("la declaración se queda; no baja a puerta"), "respaldo conserva su escala declarada");
  });

  it("los 18 especímenes del censo viven en el banco, y esta cerca está registrada", () => {
    assert.ok(banco.includes("FIGURAS DEL CENSO"), "el describe del censo está en el banco");
    assert.ok(banco.includes("FUTURO · sin figura, declarado"), "la honestidad de futuro es un espécimen, no una nota");
    assert.ok(banco.includes("LA CERCA DEL CENSO: toda figura de barras suma su total"), "la cerca de las sumas vive con los especímenes");
    assert.ok(pkg.includes("src/lib/faro/captura449.test.ts"), "captura449 registrada en test:faro");
  });
});
