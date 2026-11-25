/**
 * captura455 — LA CALMA AL ESCRIBIR (1.3.455): el defecto que Oscar
 * sufrió en vivo (escribiendo en el Asesor bajo Cyberpunk el texto se
 * pegaba y la app se congeló hasta que Android la cerró) queda curado
 * por una regla de la casa: mientras un campo de texto tiene el foco,
 * las animaciones decorativas se pausan; al salir el foco, vuelven
 * las que se pausaron. Estas cercas fijan la costura: el módulo
 * existe, se instala en el arranque junto a fit, pausa solo lo de
 * fuera del campo y respeta «reducir movimiento».
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const calm = readFileSync(new URL("../../spa/typing-calm.ts", import.meta.url), "utf8");
const main = readFileSync(new URL("../../../spa/main.tsx", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

describe("captura455 · la calma al escribir vive en la casa", () => {
  it("el módulo existe y se instala en el arranque, junto a fit", () => {
    assert.ok(calm.includes("export function startTypingCalm"), "startTypingCalm está");
    assert.ok(main.includes('import { startTypingCalm } from "@/spa/typing-calm"'), "main.tsx lo importa");
    assert.ok(main.includes("startTypingCalm();"), "main.tsx lo instala");
  });

  it("la calma entra con el foco en un campo y sale cuando el foco deja los campos", () => {
    assert.ok(calm.includes('addEventListener("focusin"'), "escucha focusin");
    assert.ok(calm.includes('addEventListener("focusout"'), "escucha focusout");
    assert.ok(calm.includes("isContentEditable"), "los contenteditable cuentan como campo");
    assert.ok(calm.includes('"TEXTAREA"'), "los textarea cuentan como campo");
  });

  it("pausa lo de fuera del campo, nunca lo del propio campo, y devuelve lo pausado", () => {
    assert.ok(calm.includes("document.getAnimations()"), "mira las animaciones del documento");
    assert.ok(calm.includes("field.contains(t)"), "lo de dentro del campo sigue vivo");
    assert.ok(calm.includes("a.pause()"), "pausa");
    assert.ok(calm.includes("a.play()"), "reanuda lo pausado");
    assert.ok(calm.includes('a.playState === "paused"'), "solo reanuda lo que sigue pausado");
  });

  it("con «reducir movimiento» no se instala: no hay nada que calmar", () => {
    assert.ok(calm.includes("prefers-reduced-motion: reduce"), "la guarda está");
  });

  it("la batería corre en test:faro", () => {
    assert.ok(pkg.includes("captura455.test.ts"), "captura455 está registrada en package.json");
  });
});
