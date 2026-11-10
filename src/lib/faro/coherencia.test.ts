import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCardEdits, defaultStructure, markUserVis, treeSubLine } from "./defaults.ts";
import type { Structure } from "./types.ts";

// 1.3.188 — «Coherencia y pulido» (auditoría de Estructura, R-6 y R-7; cierra E-6 y E-7).
// R-6: la tarjeta de la categoría tenía TRES gestos de guardado — el ✓ del nombre y el
// Enter del renombre guardaban al instante, y el Enter del borrador de subconcepto nuevo
// CREABA al instante con un commit propio, fuera del modelo preparado (1.3.179) y de la
// guardia de descarte. Ahora todo se prepara y Guardar es el único commit: applyCardEdits
// es su canal puro y estas pruebas cercan que aplica TODO de una vez (nombre, visibilidad
// de categoría y subconceptos con su markUserVis, renombres, altas en orden) y que sin
// nada preparado no toca la estructura. R-7: la fila del árbol listaba los subconceptos
// ocultos como si vivieran; treeSubLine lleva el estado de cada uno para pintarlos
// atenuados sin quitar ningún nombre del mapa.

const catOf = (s: Structure, id: string) => s.categories.find((c) => c.id === id)!;
const subOf = (s: Structure, catId: string, subId: string) => catOf(s, catId).subs.find((x) => x.id === subId)!;

describe("R-6 — applyCardEdits: un solo commit para toda la tarjeta", () => {
  it("sin nada preparado devuelve la misma estructura", () => {
    const s = defaultStructure();
    let calls = 0;
    const out = applyCardEdits(s, "f-casa", {}, () => { calls++; return "x"; });
    assert.equal(out, s);
    assert.equal(calls, 0);
  });

  it("aplica de una vez nombre, ojo de categoría, ojos, renombre y altas", () => {
    const s = defaultStructure();
    const before = catOf(s, "f-casa");
    const subCount = before.subs.length;
    let n = 0;
    const out = applyCardEdits(s, "f-casa", {
      name: "Mi Casa",
      catHidden: true,
      subHidden: { "f.casa.gas": true, "f.casa.renta": false },
      subNames: { "f.casa.gas": "Gas LP" },
      newSubs: ["Nuevo A", "Nuevo B"],
    }, () => `s${n++}`);
    const cat = catOf(out, "f-casa");
    assert.equal(cat.customName, "Mi Casa");
    assert.equal(cat.hidden, true);
    assert.equal(out.userVis?.["f-casa"], true);
    assert.equal(subOf(out, "f-casa", "f.casa.gas").hidden, true);
    assert.equal(subOf(out, "f-casa", "f.casa.gas").customName, "Gas LP");
    assert.equal(out.userVis?.["f.casa.gas"], true);
    assert.equal(subOf(out, "f-casa", "f.casa.renta").hidden, false);
    assert.equal(out.userVis?.["f.casa.renta"], false);
    const news = cat.subs.slice(subCount);
    assert.deepEqual(news.map((x) => x.customName), ["Nuevo A", "Nuevo B"]);
    assert.deepEqual(news.map((x) => x.id), ["f-casa.s0", "f-casa.s1"]);
    assert.deepEqual(news.map((x) => x.order), [subCount, subCount + 1]);
    assert.ok(news.every((x) => x.hidden === false && x.icon === "Circle" && x.nameKey === ""));
    // la estructura original no se mutó y las demás categorías ni se copiaron
    assert.equal(catOf(s, "f-casa").customName, "");
    assert.equal(catOf(s, "f-casa").subs.length, subCount);
    assert.equal(catOf(out, "f-ahorro"), catOf(s, "f-ahorro"));
  });

  it("solo ojos: el resultado es el del camino de siempre (mapa + markUserVis por valor)", () => {
    const s = defaultStructure();
    const staged: Record<string, boolean> = { "f.casa.gas": true, "f.casa.youtube": false };
    const out = applyCardEdits(s, "f-casa", { subHidden: staged }, () => "x");
    let expected: Structure = {
      ...s,
      categories: s.categories.map((c) => (c.id === "f-casa"
        ? { ...c, subs: c.subs.map((x) => (x.id in staged ? { ...x, hidden: staged[x.id]! } : x)) }
        : c)),
    };
    expected = markUserVis(expected, Object.keys(staged).filter((id) => staged[id]), true);
    expected = markUserVis(expected, Object.keys(staged).filter((id) => !staged[id]), false);
    assert.deepEqual(out, expected);
  });

  it("las altas ignoran nombres vacíos y recortan los demás", () => {
    const s = defaultStructure();
    const out = applyCardEdits(s, "f-casa", { newSubs: ["", "  ", "  Solar "] }, () => "z9");
    const names = catOf(out, "f-casa").subs.map((x) => x.customName);
    assert.ok(names.includes("Solar"));
    assert.equal(catOf(out, "f-casa").subs.at(-1)?.id, "f-casa.z9");
  });
});

describe("R-7 — treeSubLine: la fila enseña el estado de cada subconcepto", () => {
  it("lleva nombre y estado de todos, en orden, en ambos idiomas", () => {
    const s = applyCardEdits(defaultStructure(), "f-casa", { subHidden: { "f.casa.gas": true } }, () => "x");
    const cat = catOf(s, "f-casa");
    const es = treeSubLine(cat, "es");
    assert.equal(es.length, cat.subs.length);
    assert.deepEqual(es.map((x) => x.id), cat.subs.map((x) => x.id));
    assert.equal(es.find((x) => x.id === "f.casa.gas")?.hidden, true);
    assert.equal(es.find((x) => x.id === "f.casa.renta")?.hidden, false);
    assert.equal(es.find((x) => x.id === "f.casa.renta")?.name, "Renta");
    const en = treeSubLine(cat, "en");
    assert.equal(en.find((x) => x.id === "f.casa.renta")?.name, "Rent");
    assert.equal(en.find((x) => x.id === "f.casa.gas")?.hidden, true);
  });
});
