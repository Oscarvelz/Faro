/**
 * FARO — 1.3.319: EL SUSURRO DEL MODO (Oscar, 2026-11-18, con su foto).
 *
 * Estaba en Ritmo tocando las filas del Historial y nada respondía: en su
 * mente estaba en Completo, donde tocar una fila ofrece ocultarla (el
 * descanso, archive.hide-*). Su orden: si la persona intenta usar la app de
 * una forma que el modo no permite, Faro avisa — corto y claro — diciendo
 * en qué modo está y dónde vive lo que intenta, «algo que hable del
 * silencio de lo que no está disponible», para que sepa el potencial que
 * Faro tiene. Su refinamiento de la misma noche: no un toast plano, sino
 * una TARJETA pequeña con el acabado premium de los temas, los nombres
 * propios con su subrayado punteado, la palabra «modo» en la frase — y
 * seleccionable: tocarla lleva directo al modo que nombra, sin buscarlo a
 * mano (la tarjeta deja la petición y abre Ajustes con la pregunta de
 * confirmación ya planteada; la 1.3.318 manda: jamás cambia en silencio).
 * Su asiento: abajo, sobre el dock — donde el pulgar ya está y sin tapar
 * el cromo de arriba.
 *
 * La pieza: (A) el mecanismo — modeWhisper en bank-dock, tarjeta anfitriona
 * en el BankDock que se oculta sola y, al tocarla, pide el modo y navega;
 * (B) el puente — mode-ask.ts, consumo único, y Ajustes que plantea la
 * pregunta con pickMode; (C) el espécimen — las filas del río susurran
 * fuera de Completo y en Completo conservan su toque intacto; (D) la
 * frase — una llave, dos idiomas, «modo» dicho, cada marca una sola vez
 * (la lección del {name} doble de la 1.3.318).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const dock = SRC("../../components/faro/bank-dock.tsx");
const css = SRC("../../components/faro/bank.css");
const historial = SRC("../../components/faro/historial.tsx");
const screens = SRC("../../components/faro/screens.tsx");
const ask = (() => { try { return SRC("./mode-ask.ts"); } catch { return ""; } })();
const i18n = SRC("./i18n.ts");

describe("1.3.319 §A — la tarjeta del susurro", () => {
  it("bank-dock exporta modeWhisper con destino opcional", () => {
    assert.ok(dock.includes('const WHISPER = "faro-mode-whisper";'), "el evento existe");
    assert.ok(dock.includes('export const modeWhisper = (text: string, target?: ModeWhisper["target"])'), "el emisor lleva el destino");
  });
  it("el BankDock la hospeda como tarjeta que se oculta sola", () => {
    assert.ok(dock.includes('className="whisper-card"'), "es una tarjeta, no un toast plano");
    assert.ok(dock.includes('data-anchor="mode-whisper"'), "su ancla");
    assert.ok(dock.includes("setTimeout(() => setWhisper(null), 6000)"), "se oculta sola a los 6s");
    assert.ok(dock.includes("window.addEventListener(WHISPER, onWhisper)"), "el anfitrión escucha");
  });
  it("los nombres propios salen con su subrayado punteado", () => {
    assert.ok(dock.includes('className="faro-name"'), "la marca de nombre oficial");
    assert.ok(dock.includes("whisperText(whisper.text)"), "las marcas [[ ]] se componen al pintar");
  });
  it("su acabado es el de los temas: tokens, radio y sombra de la casa", () => {
    assert.ok(css.includes(".whisper-card {"), "la receta existe");
    assert.ok(css.includes("background: var(--surface); color: var(--fg);"), "vive de los tokens del tema");
    assert.ok(css.includes('[data-theme="tron"] .whisper-card'), "Tron le da su acabado, como al toast");
  });
  it("tocarla pide el modo y abre Ajustes — nunca cambia en silencio", () => {
    assert.ok(dock.includes("requestModeAsk(whisper.target);"), "deja la petición");
    assert.ok(dock.includes('setUi({ section: "settings" })'), "y trae a la persona a Ajustes");
  });
});

describe("1.3.319 §B — el puente de la petición", () => {
  it("mode-ask consume una sola vez", () => {
    assert.ok(ask.includes("export function takeModeAsk(): Mode | null"), "el consumo existe");
    assert.ok(ask.includes("pending = null;"), "y olvida al consumir");
    assert.ok(ask.includes('MODE_ASK_EVENT = "faro-mode-ask"'), "su evento");
  });
  it("Ajustes plantea la petición con pickMode, su maquinaria de siempre", () => {
    assert.ok(screens.includes("const target = takeModeAsk();"), "Ajustes consume");
    assert.ok(screens.includes("if (target && target !== currentMode) pickMode(target);"), "y pregunta con pickMode");
    assert.ok(screens.includes("window.addEventListener(MODE_ASK_EVENT, ask);"), "escucha también ya montado");
  });
});

describe("1.3.319 §C — el espécimen: las filas del Historial", () => {
  it("fuera de Completo la fila susurra; en Completo, jamás", () => {
    assert.ok(historial.includes("onWhisper={canRest ? undefined : whisperRow}"), "el cable pasa solo sin descanso");
    assert.ok(historial.includes('t("mode.whisper.hide-row")'), "la frase es la llave del susurro");
    assert.ok(historial.includes('.replace("{owner}", `[[${t("mode.completo")}]]`)'), "el dueño, con su marca de nombre");
    assert.ok(historial.includes('"completo",\n  );') || historial.includes(',\n    "completo",'), "el destino de la tarjeta es Completo");
  });
  it("el toque de Completo queda intacto: sel manda y el susurro es su relevo", () => {
    assert.ok(historial.includes("onClick={sel ? () => { if (!sel.consumeClick()) sel.onTap(m); } : onWhisper}"), "con sel, el toque de siempre; sin sel, el susurro");
    assert.ok(historial.includes('const canRest = has("archive.hide-selection");'), "la puerta sigue siendo el descanso");
  });
});

describe("1.3.319 §D — la frase", () => {
  it("la llave vive en los dos diccionarios, con cada marca una sola vez", () => {
    const hits = i18n.split('"mode.whisper.hide-row":').length - 1;
    assert.equal(hits, 2, "es y en");
    for (const line of i18n.split("\n").filter((l) => l.includes('"mode.whisper.hide-row":'))) {
      assert.equal(line.split("{mode}").length - 1, 1, "{mode} una vez");
      assert.equal(line.split("{owner}").length - 1, 1, "{owner} una vez");
    }
  });
  it("la frase dice «modo» y nombra el modo actual y el dueño", () => {
    assert.ok(i18n.includes('"mode.whisper.hide-row": "Estás en el modo {mode}. Tocar una fila para ocultarla vive en el modo {owner}."'), "la frase ES");
    assert.ok(i18n.includes('"mode.whisper.hide-row": "You\'re in {mode} mode. Tapping a row to hide it lives in {owner} mode."'), "la frase EN");
  });
});
