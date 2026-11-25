/**
 * Captura 447 — el puerto de E4 (los verbos de orden) queda clavado:
 * la puerta (lo no-pregunta tras relato y programa; buscar por la
 * reserva, solo si el banco se abstiene), el asiento de modo
 * advisor.orden, la ejecución solo al confirmar — y la ruta del
 * modo por la mano del proveedor, nunca escrita en la caja.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const box = read("../../components/faro/ask-box.tsx");
const settle = read("./orden-settle.ts");

describe("captura 447 · la costura de las órdenes en la caja", () => {
  it("la orden se oye tras el relato y el programa, y buscar por la reserva tras la cascada", () => {
    const relatoAt = box.indexOf("parseRelato(session.ledger");
    const programaAt = box.indexOf("parsePrograma(session.ledger");
    const ordenAt = box.indexOf("parseOrden(session.ledger");
    assert.ok(relatoAt > 0 && programaAt > relatoAt && ordenAt > programaAt, "el orden de la puerta: pregunta, relato, programa, orden");
    const cascadeAt = box.indexOf("answerBankQuestion(session.ledger");
    const reservaAt = box.indexOf("parseOrden(session.ledger", cascadeAt);
    assert.ok(cascadeAt > 0 && reservaAt > cascadeAt, "buscar llega tras la cascada, solo si el banco se abstiene");
    assert.ok(box.includes('r.kind === "unknown" && has("advisor.orden")'), "la reserva exige la abstención del banco y el asiento de la orden");
  });

  it("la orden vive en su asiento de modo y nada se ejecuta al oír", () => {
    assert.ok(box.includes('has("advisor.orden")'));
    assert.ok(!/const orr = parseOrden[\s\S]{0,400}applyOrdenDraft/.test(box), "oír no ejecuta: entre parseOrden y la ejecución media el toque");
    assert.ok(box.includes("function confirmOrden()"));
    assert.ok(box.includes('data-anchor="ask-orden"'));
    assert.ok(box.includes('data-anchor="ask-orden-yes"'));
    assert.ok(box.includes('data-anchor="ask-orden-found"'), "lo encontrado se muestra sin tocar nada");
  });

  it("el ajuste de modo va por la mano del proveedor; la caja no escribe settings.mode", () => {
    assert.ok(box.includes('chooseMode(o.value as "esencial" | "ritmo" | "completo")'), "la orden de modo dispone por chooseMode");
    assert.ok(!/settings:\s*\{[^}]*\bmode\b/.test(box), "ninguna receta de la caja escribe el modo (cerca de modos293)");
    assert.ok(settle.includes('case "mode":'), "la costura conoce el caso del modo…");
    assert.ok(settle.includes("return state;"), "…y lo devuelve intacto: la cerca manda");
  });

  it("archivar se ejecuta por la mano de descanso, la única que aparta", () => {
    assert.ok(settle.includes('hideLines(state, [order.lineId]).state'), "archivar = descanso.hideLines, con su período en el Archivo");
  });

  it("las pruebas de la ola viven en la suite", () => {
    const pkg = JSON.parse(read("../../../package.json")) as { scripts: Record<string, string> };
    assert.ok(pkg.scripts["test:faro"].includes("src/lib/faro/orden.test.ts"));
    assert.ok(pkg.scripts["test:faro"].includes("src/lib/faro/orden-settle.test.ts"));
    assert.ok(pkg.scripts["test:faro"].includes("src/lib/faro/captura447.test.ts"));
  });
});
