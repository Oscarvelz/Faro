/**
 * FARO — CORREGIR UN NOMBRE ES ESENCIAL (fallo de Oscar, 2026-11-18
 * 18:11 EST, revirtiendo el suyo de las 18:08): «corregir un nombre es
 * esencial. Si algo está mal escrito, todos los usuarios deben tener la
 * opción de corregir su nombre.» El renombre del catálogo sale de
 * editor.picker-manage (que sigue gobernando ocultar y el color en
 * Ritmo) y gana su asiento propio, editor.picker-rename, en Esencial,
 * con dos consumidores: los cuatro selectores del catálogo en
 * fit-pick.tsx (una mano de solo renombre: sin casillas, sin barra de
 * ocultar) y el editor del Catálogo de Ajustes en screens.tsx (la
 * tarjeta es puerta en Esencial y su mano trae solo el lápiz) — el
 * principio es el nombre, no la superficie. La prosa de f-tienda-elegir
 * y f-cat-elegir dice la verdad nueva. Donde la rotura viviría en un
 * componente, la cerca es de fuente; el banco en vivo de la pieza
 * (Esencial: la tienda mal nombrada se renombra y guarda; ocultar y
 * recolorear ausentes en Esencial y presentes en Ritmo) la acompaña.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { FEATURES } from "./mode.ts";
import { findTopic } from "../manual/topics.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const FITPICK = SRC("../../components/faro/fit-pick.tsx");
const SCREENS = SRC("../../components/faro/screens.tsx");
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

describe("corregir un nombre es Esencial — el asiento y sus consumidores", () => {
  it("el renombre tiene asiento propio en Esencial; administrar sigue en Ritmo", () => {
    assert.equal(FEATURES["editor.picker-rename"], "esencial",
      "editor.picker-rename debe vivir en Esencial (fallo de Oscar, 2026-11-18)");
    assert.equal(FEATURES["editor.picker-manage"], "ritmo",
      "editor.picker-manage no se mueve: ocultar y el color siguen en Ritmo");
  });

  it("los cuatro selectores del catálogo ofrecen la mano de solo renombre", () => {
    assert.equal(count(FITPICK, 'has("editor.picker-manage")'), 4,
      "los cuatro selectores conservan su manage entero tras picker-manage");
    assert.equal(count(FITPICK, 'has("editor.picker-rename")'), 4,
      "los cuatro selectores (tienda, rubro de compra, categoría, sub) ganan su rama de renombre");
    const branches = FITPICK.split(': has("editor.picker-rename") ? {').slice(1);
    assert.equal(branches.length, 4);
    for (const b of branches) {
      const seg = b.slice(0, b.indexOf("} : undefined}"));
      assert.ok(seg.includes("onRename"), "la rama de Esencial trae el renombre");
      assert.ok(!seg.includes("onDropMany"), "la rama de Esencial NO trae ocultar/borrar");
      assert.ok(!seg.includes("onColor"), "la rama de Esencial NO trae el color");
    }
  });

  it("la hoja sabe llevar una mano sin caída: ni casillas ni barra", () => {
    assert.ok(FITPICK.includes("onDropMany?: (ids: string[]) => void;"),
      "el tipo Manage declara la caída opcional (la mano de solo renombre existe)");
    assert.ok(FITPICK.includes("if (!manage || !manage.onDropMany || !manage.word || !sel.size) return;"),
      "dropSelected no actúa sin caída declarada");
    assert.ok(FITPICK.includes("manage.onDropMany ? ("),
      "la barra de administrar solo se pinta cuando hay caída que alimentar");
    assert.ok(FITPICK.includes("manage?.onDropMany || onPalette ? ("),
      "las casillas solo se pintan cuando una caída o la paleta las consume");
  });

  it("el editor del Catálogo de Ajustes abre su lápiz en Esencial", () => {
    assert.ok(SCREENS.includes('const canRename = has("editor.picker-rename");'),
      "el CatalogEditor consulta el mismo asiento (el nombre, no la superficie)");
    assert.ok(SCREENS.includes("if (!handFor(item) && !canRename) return;"),
      "la tarjeta es puerta cuando hay mano de administración O lápiz de renombre");
    assert.ok(SCREENS.includes("{handFor(item) ? (<>"),
      "el resto de la mano (paleta, ojo, fija, papelera) sigue tras su asiento");
  });

  it("la prosa de los dos temas dice la verdad nueva en los dos idiomas", () => {
    const tienda = findTopic("f-tienda-elegir");
    const cat = findTopic("f-cat-elegir");
    assert.ok(tienda?.what && cat?.what, "los dos temas existen y traen prosa");
    const [tEs, tEn] = tienda!.what!;
    const [cEs, cEn] = cat!.what!;
    assert.ok(tEs.includes("corriges el nombre"), "f-tienda-elegir: el lápiz corrige el nombre");
    assert.ok(!tEs.includes("renombra u oculta"), "f-tienda-elegir ya no promete ocultar en Esencial");
    assert.ok(tEn.includes("correct the name"), "f-tienda-elegir (EN): the pencil corrects the name");
    assert.ok(!tEn.includes("renames or hides"), "f-tienda-elegir (EN) ya no promete ocultar en Esencial");
    assert.ok(cEs.includes("corrige el nombre"), "f-cat-elegir: el lápiz corrige el nombre");
    assert.ok(!cEs.includes("cambia nombre y color"), "f-cat-elegir ya no promete el color en Esencial");
    assert.ok(cEn.includes("corrects the name"), "f-cat-elegir (EN): the pencil corrects the name");
    assert.ok(!cEn.includes("changes name and colour"), "f-cat-elegir (EN) ya no promete el color en Esencial");
  });
});
