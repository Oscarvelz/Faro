/* Captura 448 — el puerto E5 de la Rama Agente: crear preguntando.
   Lo que esta cerca clava:
   - la puerta del relato ofrece crear lo que el libro no conoce
     (crearDesdeRelato desde la tarjeta, con el nombre crudo del
     usuario) y la puerta directa «crea una categoría…» abre el
     mismo diálogo tras relato, programa y orden;
   - mientras una pregunta del diálogo espera, el turno siguiente
     ES su respuesta (crearRespuesta antes que cualquier otra
     puerta), y «Olvídalo» lo cierra sin crear nada;
   - oír y preguntar jamás crean: la pieza nace solo al «Crearla
     así», por crear-settle dentro de su commit — que repite la
     cerca de conflictos y ubica el movimiento que esperaba;
   - el asiento de modo: advisor.crear, Esencial (completar la
     captura que el propio relato nombró, como corregir un nombre);
   - las registraciones del test:faro.
   Las cercas hermanas (la puerta de reposo de la caja) se enmiendan
   en capturas 373/376 con su nota, como en 445, 446 y 447. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const box = readFileSync(new URL("../../components/faro/ask-box.tsx", import.meta.url), "utf8");
const mode = readFileSync(new URL("./mode.ts", import.meta.url), "utf8");
const settle = readFileSync(new URL("./crear-settle.ts", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as { scripts: Record<string, string> };

describe("captura448 · crear preguntando, clavado", () => {
  it("el diálogo manda en su turno: crearRespuesta se alimenta ANTES de la puerta del relato, tras su asiento", () => {
    const cont = box.indexOf("crearRespuesta(session.ledger");
    const gate = box.indexOf("classifyBankQuestion(clean)");
    assert.ok(cont > 0 && gate > 0 && cont < gate, "la continuación del diálogo va antes de clasificar");
    assert.ok(box.includes('crear?.propuesta && has("advisor.crear")'), "la continuación vive tras el asiento advisor.crear");
    assert.ok(box.includes("olv[ií]dalo"), "«Olvídalo» cierra el diálogo sin crear nada");
  });

  it("las dos puertas: la oferta desde la tarjeta del relato y la directa «crea una categoría…»", () => {
    assert.ok(box.includes("crearDesdeRelato(session.ledger"), "la oferta nace de crearDesdeRelato");
    assert.ok(box.includes('data-anchor="ask-crear-start"'), "la tarjeta del relato trae su botón de crear");
    assert.ok(box.includes("rawNameFor(relatoRaw"), "el nombre nuevo sale del texto crudo del usuario");
    const door = box.indexOf("crearInicio(session.ledger");
    const orden = box.indexOf("parseOrden(session.ledger");
    assert.ok(door > orden, "la puerta directa llega tras la orden: no roba relatos ni programas ni órdenes");
  });

  it("oír y preguntar no crean: la pieza nace solo al sí, por crear-settle dentro de su commit", () => {
    assert.ok(box.includes('data-anchor="ask-crear-yes"'), "la tarjeta del borrador trae su sí");
    assert.ok(box.includes("applyCrearDraft(s, names, draft, pending, fixedId).state"), "el nacimiento va dentro del commit, por la costura");
    assert.ok(settle.includes("La cerca de conflictos se repite al nacer") || settle.includes("LA CERCA DE CONFLICTOS SE REPITE"), "la costura repite la cerca al nacer");
    assert.ok(settle.includes("locatePendingLine"), "el movimiento que esperaba se ubica en la pieza nueva");
  });

  it("el asiento de modo: advisor.crear es Esencial, como el relato y la orden", () => {
    assert.ok(mode.includes('"advisor.crear": E'), "advisor.crear vive en Esencial");
  });

  it("crear, crear-settle y esta captura están registrados en test:faro", () => {
    const script = pkg.scripts["test:faro"];
    assert.ok(script.includes("src/lib/faro/crear.test.ts"), "crear.test.ts registrado");
    assert.ok(script.includes("src/lib/faro/crear-settle.test.ts"), "crear-settle.test.ts registrado");
    assert.ok(script.includes("src/lib/faro/captura448.test.ts"), "captura448 registrada");
  });
});
