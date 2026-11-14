/**
 * 1.3.251 «Fijas extendidas»: las piezas del catálogo (Tiendas e IA) se fijan a la
 * tarjeta del widget y el apunte se archiva como la compra que la propia app
 * archivaría; las de Suscripciones quedan fuera porque ninguna línea guarda su id.
 * Y la vuelta de 1.3.246 que Oscar no pudo ver: la fija — de categoría, de sub o de
 * pieza — se anuncia EN REPOSO en cada superficie donde vive.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  hasStorePin, ingestQuick, parseQuickEntries, quickStorePins, toggleStorePin,
  type QuickEntry,
} from "./quickadd.ts";
import { createInitial } from "./defaults.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import type { LedgerState } from "./types.ts";

const withPins = (pins: LedgerState["settings"]["widgetPins"]): LedgerState => {
  const s = createInitial("es");
  s.settings.widgetPins = pins;
  return s;
};

const ENTRY: QuickEntry = { id: "q-25102510-ab", sign: "out", minor: 4599, cur: "USD", day: "2026-11-10", store: "temu" };

describe("fijas extendidas del catálogo (1.3.251)", () => {
  it("fijar y desfijar piezas: lista pura, al final, sin tocar las fijas de categoría", () => {
    const base = [{ c: "f-casa", s: "" }, { c: "", s: "", store: "temu" }];
    assert.equal(hasStorePin(base, "temu"), true);
    assert.equal(hasStorePin(base, "grok"), false);
    const added = toggleStorePin(base, "grok");
    assert.deepEqual(added, [...base, { c: "", s: "", store: "grok" }]); // al final: el orden de la lista es el de la tarjeta
    assert.deepEqual(toggleStorePin(added, "temu"), [{ c: "f-casa", s: "" }, { c: "", s: "", store: "grok" }]);
    assert.deepEqual(toggleStorePin(undefined, "temu"), [{ c: "", s: "", store: "temu" }]);
    assert.equal(base.length, 2); // la lista original no se mutó
  });

  it("las casas de pieza de la foto: tiendas e IA sí; suscripciones, borradas y ocultas no", () => {
    const s = withPins([
      { c: "", s: "", store: "temu" },
      { c: "", s: "", store: "grok" },
      { c: "", s: "", store: "metropcs" }, // suscripción: fuera — su fija no tendría archivo honesto
      { c: "", s: "", store: "fantasma" }, // ya no existe en el catálogo
      { c: "f-casa", s: "" },              // una fija de categoría no es casa de pieza
    ]);
    const homes = quickStorePins(s, "es");
    assert.deepEqual(homes.map((h) => h.store), ["temu", "grok"]);
    assert.ok(homes.every((h) => h.c === "" && h.s === "" && h.n.length > 0));
    const s2 = withPins([{ c: "", s: "", store: "temu" }]);
    s2.structure.catalog = s2.structure.catalog.map((c) => (c.id === "temu" ? { ...c, hidden: true } : c));
    assert.deepEqual(quickStorePins(s2, "es"), []); // lo que él esconde no resucita en la tarjeta
  });

  it("la foto lleva las piezas en qsOut (solo gasto) y qpOut sigue siendo de categorías", () => {
    const s = withPins([{ c: "", s: "", store: "temu" }, { c: "f-casa", s: "f.casa.renta" }]);
    const snap = buildWidgetSnapshot(s, "es", { today: "2026-11-13", hide: false, lock: false });
    assert.deepEqual(snap.qsOut.map((h) => h.store), ["temu"]);
    assert.ok(snap.qpOut.every((h) => !h.store), "ninguna pieza se cuela entre las fijas de categoría");
    assert.ok(snap.qsOut[0].n.length > 0, "el nombre de la pieza viaja con su casa");
  });

  it("el parseo: la pieza sana viaja; la malformada degrada el apunte, no lo mata", () => {
    const ok = parseQuickEntries(JSON.stringify([{ ...ENTRY, cat: "", sub: "" }]));
    assert.equal(ok[0].store, "temu");
    const bad = parseQuickEntries(JSON.stringify([{ ...ENTRY, store: 42 }]));
    assert.equal(bad.length, 1);
    assert.equal(bad[0].store, undefined);
  });

  it("el archivo ESPEJA la compra de la app: tienda sin categoría, IA bajo «ia»", () => {
    const s = withPins([]);
    const after = ingestQuick(s, [ENTRY], "es");
    const line = after.months["2026-11"]?.lines.find((l) => l.id === ENTRY.id);
    assert.ok(line);
    assert.equal(line.kind, "purchase");
    assert.equal(line.storeId, "temu");
    assert.equal(line.providerId, "");
    assert.equal(line.categoryId, ""); // la rebanada de Compras se nombra por la tienda
    assert.equal(line.subId, "");
    assert.equal(line.recurring, false);
    assert.equal(line.note, "Widget");
    assert.equal(line.concept, "Apunte rápido");
    assert.equal(line.amountMinor, 4599);

    const ai = ingestQuick(s, [{ ...ENTRY, id: "q-25102511-cd", store: "grok", concept: "Plan anual" }], "es");
    const aiLine = ai.months["2026-11"]?.lines.find((l) => l.id === "q-25102511-cd");
    assert.ok(aiLine);
    assert.equal(aiLine.kind, "purchase");
    assert.equal(aiLine.categoryId, "ia");
    assert.equal(aiLine.providerId, "grok");
    assert.equal(aiLine.storeId, "");
    assert.equal(aiLine.concept, "Plan anual"); // sus palabras mandan también en una compra

    const twice = ingestQuick(after, [ENTRY], "es");
    assert.equal(twice.months["2026-11"]?.lines.filter((l) => l.id === ENTRY.id).length, 1); // recoger dos veces no duplica
  });

  it("pieza caída entre la foto y la recogida: el dinero cae sin casa, jamás en un lugar equivocado", () => {
    const s = withPins([]);
    for (const store of ["fantasma", "metropcs"]) {
      const after = ingestQuick(s, [{ ...ENTRY, id: `q-25102512-${store === "fantasma" ? "ef" : "gh"}`, store }], "es");
      const line = after.months["2026-11"]?.lines.at(-1);
      assert.ok(line);
      assert.equal(line.kind, "expense-variable"); // la forma honesta de siempre
      assert.equal(line.storeId, "");
      assert.equal(line.providerId, "");
      assert.equal(line.categoryId, "");
    }
    const hidden = withPins([]);
    hidden.structure.catalog = hidden.structure.catalog.map((c) => (c.id === "temu" ? { ...c, hidden: true } : c));
    const afterHidden = ingestQuick(hidden, [{ ...ENTRY, id: "q-25102513-ij" }], "es");
    assert.equal(afterHidden.months["2026-11"]?.lines.at(-1)?.kind, "expense-variable");
  });

  it("el shell: lee qsOut, la pieza viaja en el apunte y la fila de pieza lleva su marca", () => {
    const root = process.cwd();
    const widgets = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt"), "utf8");
    const quick = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt"), "utf8");
    assert.match(widgets, /val qsOut: List<QHome> = emptyList\(\)/, "la foto vieja no trae piezas = lista vacía");
    assert.ok(widgets.includes("\"qsOut\"") && widgets.includes("optString(\"store\")"), "el shell lee las piezas de la foto");
    assert.match(quick, /private fun storeMark\(\): Drawable/, "la marca de clase de la pieza se dibuja en código");
    assert.match(quick, /if \(kind == 2\) storeMark\(\) else null/, "la tiendita cuelga del inicio de la fila de pieza");
    assert.match(quick, /if \(storeId\.isNotEmpty\(\)\) entry\.put\("store", storeId\)/,
      "la pieza viaja solo si la casa elegida es una");
    assert.match(quick, /fun homeKey\(home: QHome\): String/, "la última casa se recuerda también por pieza");
    // El anuncio de Oscar (foto 234813): una línea, letra menor, su frase corta.
    assert.ok(quick.includes("Fija tus categorías en el editor de cada categoría."));
    assert.ok(quick.includes("Pin your categories in each category's editor."));
    assert.match(quick, /textSize = 11\.5f/, "el anuncio baja un paso de cuerpo");
  });

  it("la web: el pin vive en la mano del catálogo (no en Suscripciones), el arrastre está vallado y la fija se lee en reposo", () => {
    const root = process.cwd();
    const screens = fs.readFileSync(path.join(root, "src/components/faro/screens.tsx"), "utf8");
    const styles = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");
    assert.ok(screens.includes("toggleStorePin(s.settings.widgetPins, item.id)"), "fijar una pieza guarda al momento, como el catálogo guarda");
    // RE-FIJADO en 1.3.271: el conjunto fijable se nombra en positivo — el
    // pin es de Tiendas e IA; ni Suscripciones ni el nuevo Seguro de vida
    // lo reciben (la nota de la 1.3.269 sigue siendo verdad).
    assert.match(screens, /\(item\.kind === "store" \|\| item\.kind === "ai"\) \? <button type="button" className="icon-btn cat-act pin-btn"/,
      "la mano ofrece el pin a Tiendas e IA y NO a Suscripciones ni a Seguros");
    assert.match(styles, /\.cat-grid \{ -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; \}/,
      "la rejilla es un suelo de agarre: sostener nunca selecciona texto");
    assert.ok(screens.includes("onCardPointerDown") && screens.includes("\"drag reorder\""),
      "el arrastre del catálogo viaja por el commit de siempre");
    assert.match(styles, /\.pin-btn\[aria-pressed="true"\]/, "el pin puesto se lee en su botón");
    assert.ok(screens.includes("sub-pinmark") && screens.includes("tree-pinmark") && screens.includes("cat-pinmark"),
      "la fija se anuncia en reposo en sus tres casas: sub, categoría y pieza");
    assert.match(screens, /effPin\(sub\.id\) \? t\("widget\.pin\.on"\) : t\("widget\.pin"\)/,
      "el nombre accesible del pin cambia con su estado");
  });
});
