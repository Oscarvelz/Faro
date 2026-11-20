/**
 * FARO — Captura Inteligente, Ola 2 (1.3.340): la puerta de texto.
 * El asiento se declaró antes que la superficie (capture.text, Esencial:
 * escribir es declarar); la puerta interpreta con el motor puro y deja
 * los borradores en la bandeja por addDrafts — jamás escribe una línea;
 * el tema del Manual promete una puerta que existe (su ancla se dibuja).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { FEATURES } from "./mode.ts";
import { MANUAL_TOPICS as TOPICS } from "../manual/topics.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("ola2 · la puerta de texto y su asiento", () => {
  it("el asiento capture.text nació declarado: Esencial, como el apunte rápido", () => {
    assert.equal(FEATURES["capture.text"], "esencial");
    assert.equal(FEATURES["capture.text"], FEATURES["capture.tray"], "el mismo reparto que la bandeja");
  });

  it("la puerta interpreta con el motor puro y deja borradores — nunca líneas", () => {
    const door = SRC("../../components/faro/capture-text.tsx");
    assert.ok(door.includes("parsePhrase(text, {"), "la hoja llama al intérprete puro");
    assert.ok(door.includes("addDrafts(s, drafts)"), "los borradores caen en la bandeja por la receta de la casa");
    assert.ok(!door.includes("upsertLine"), "la puerta jamás escribe una línea del libro");
    assert.ok(door.includes('data-anchor="capture-text-area"'), "la caja de la frase existe");
    assert.ok(door.includes('data-anchor="capture-text-add"'), "el botón hermano de Escanear existe");
    assert.ok(door.includes('has("capture.text")'), "el botón se gobierna por su asiento");
  });

  it("las tres puertas son la misma hoja: formularios y bandeja", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok((screens.match(/<TextEntry \/>/g) ?? []).length >= 2, "Central (QuickAdd) y los libros llevan la puerta");
    const tray = SRC("../../components/faro/tray.tsx");
    assert.ok(tray.includes("CaptureTextSheet"), "la hoja de la bandeja abre la misma puerta");
    assert.ok(tray.includes('has("capture.text")') || tray.includes("canText"), "la puerta de la bandeja también se gobierna");
  });

  it("el tema del Manual promete una puerta que existe", () => {
    const topic = TOPICS.find((t) => t.id === "captura-texto");
    assert.ok(topic, "el tema captura-texto existe");
    assert.equal(topic!.go?.anchor, "capture-text-add");
    const door = SRC("../../components/faro/capture-text.tsx");
    assert.ok(door.includes(`data-anchor="${topic!.go!.anchor}"`), "el ancla del tema se dibuja en la puerta");
    assert.ok(topic!.bubble && topic!.bubble[0].split(/\s+/).length <= 26, "la ayuda breve cumple su ley");
  });
});
