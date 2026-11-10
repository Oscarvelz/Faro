import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { applyTemplate, defaultStructure, lineListVisible, markUserVis } from "./defaults.ts";
import type { Line, Structure } from "./types.ts";

// 1.3.186 — «La puerta de vuelta» (auditoría de Estructura, R-1 y R-2; cierra E-1 y E-2).
// E-1: una categoría oculta no podía volver a mostrarse por ningún control — los selectores
// la filtran incluso administrando y la tarjeta del árbol no tenía ojo para ella; esconderla
// era un borrado sin papelera. R-1 le da su ojo en la tarjeta, PREPARADO como los de sus
// subconceptos (1.3.179): Guardar escribe su hidden + markUserVis con su valor, en un commit.
// Estas pruebas cercan el canal puro que ese Guardar usa (el gesto vive en el banco) y la
// precedencia de la mano en ambas direcciones. E-2: el «Borrar» de los selectores ocultaba;
// R-2 lo renombra «Ocultar» — cercado aquí contra las fuentes, como hace version.test.ts.

/** Exactamente el par de escritura del Guardar de la tarjeta para el ojo de la categoría:
 *  su hidden y su registro de mano, nada más (espejo del commit de TreePanel.savePanel). */
const guardarOjoCategoria = (structure: Structure, catId: string, staged: boolean): Structure => {
  const cats = structure.categories.map((c) => (c.id === catId ? { ...c, hidden: staged } : c));
  return markUserVis({ ...structure, categories: cats }, [catId], staged);
};

const catOf = (s: Structure, id: string) => s.categories.find((c) => c.id === id)!;

function line(categoryId: string, subId: string): Line {
  return {
    id: "l1", seriesId: "l1", monthKey: "2026-11", kind: "expense-fixed", concept: "Colegiaturas", amountMinor: 45000,
    currency: "USD", active: true, note: "", categoryId, subId, recurring: true, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD",
    icon: "", history: [],
  };
}

describe("el ojo de la categoría: el par de escritura de Guardar (R-1)", () => {
  it("ocultar escribe hidden + userVis con su valor, y no toca los subconceptos", () => {
    const base = defaultStructure();
    const subsAntes = JSON.stringify(catOf(base, "f-familia").subs);
    const next = guardarOjoCategoria(base, "f-familia", true);
    assert.equal(catOf(next, "f-familia").hidden, true);
    assert.equal(next.userVis?.["f-familia"], true);
    assert.equal(JSON.stringify(catOf(next, "f-familia").subs), subsAntes);
  });

  it("mostrar de vuelta escribe hidden=false + userVis=false: la puerta abre en los dos sentidos", () => {
    const oculta = guardarOjoCategoria(defaultStructure(), "f-familia", true);
    const vuelta = guardarOjoCategoria(oculta, "f-familia", false);
    assert.equal(catOf(vuelta, "f-familia").hidden, false);
    assert.equal(vuelta.userVis?.["f-familia"], false);
  });

  it("el par toca SOLO el registro de visibilidad: el resto de la estructura es idéntico", () => {
    const base = defaultStructure();
    const next = guardarOjoCategoria(base, "f-casa", true);
    const sinVis = (s: Structure) => JSON.stringify(s.categories.map((c) => ({ ...c, hidden: false })));
    assert.equal(sinVis(next), sinVis(base), "fuera del hidden de la categoría, nada cambia");
    assert.deepEqual(Object.keys(next.userVis ?? {}), ["f-casa"], "el registro de mano gana exactamente una entrada");
  });

  it("la línea de la categoría sale de las listas al ocultar y vuelve TAL CUAL al mostrar", () => {
    const l = line("f-familia", "f.familia.colegiaturas");
    const base = defaultStructure();
    assert.equal(lineListVisible(base, l), true);
    const oculta = guardarOjoCategoria(base, "f-familia", true);
    assert.equal(lineListVisible(oculta, l), false);
    const vuelta = guardarOjoCategoria(oculta, "f-familia", false);
    assert.equal(lineListVisible(vuelta, l), true);
  });
});

describe("la precedencia de la mano con categorías (R-1 × plantillas)", () => {
  it("Familia NO resucita la categoría que la mano ocultó con su ojo", () => {
    const oculta = guardarOjoCategoria(defaultStructure(), "f-familia", true);
    const tras = applyTemplate(oculta, "familia");
    assert.equal(catOf(tras, "f-familia").hidden, true, "la mano manda sobre la plantilla, también en la categoría");
  });

  it("Familia deja mostrada la que la mano volvió a mostrar con su ojo", () => {
    const oculta = guardarOjoCategoria(defaultStructure(), "f-familia", true);
    const vuelta = guardarOjoCategoria(oculta, "f-familia", false);
    const tras = applyTemplate(vuelta, "familia");
    assert.equal(catOf(tras, "f-familia").hidden, false);
  });

  it("sin registro de mano, Familia sigue mostrando la rama como siempre", () => {
    const aMano = { ...defaultStructure(), categories: defaultStructure().categories.map((c) => (c.id === "f-familia" ? { ...c, hidden: true } : c)) };
    const tras = applyTemplate(aMano, "familia");
    assert.equal(catOf(tras, "f-familia").hidden, false, "lo oculto sin mano (p. ej. una plantilla) sí lo deshace Familia");
  });
});

describe("el cableado de la tarjeta y de los selectores (contra las fuentes)", () => {
  const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
  const pick = fs.readFileSync(new URL("../../components/faro/fit-pick.tsx", import.meta.url), "utf8");

  it("la tarjeta prepara el ojo de la categoría (stagedCatVis) y la bolsa de descarte lo lleva (catVis)", () => {
    assert.match(screens, /stagedCatVis, setStagedCatVis\] = useState<boolean \| null>\(null\)/);
    assert.match(screens, /catVis: stagedCatVis/);
    assert.match(screens, /data-test="cat-eye"/);
  });

  it("Guardar escribe la categoría por markUserVis con su id y su valor, en el mismo commit", () => {
    // 1.3.188: el Guardar pasa por applyCardEdits (R-6) — la tarjeta le entrega
    // catHidden: stagedCatVis en su único commit y el canal puro escribe
    // markUserVis(out, [catId], edits.catHidden): el mismo camino de la 1.3.186.
    assert.match(screens, /catHidden: stagedCatVis/);
    assert.match(screens, /applyCardEdits\(s\.structure, cat\.id, edits/);
    const defaults = fs.readFileSync(new URL("./defaults.ts", import.meta.url), "utf8");
    assert.match(defaults, /markUserVis\(out, \[catId\], edits\.catHidden\)/);
  });

  it("los cuatro selectores de estructura declaran hide y el verbo se resuelve a «Ocultar» con el ojo cerrado (R-2)", () => {
    assert.equal(pick.split("hide: true").length - 1, 4, "categorías, subconceptos, tiendas y rubros — ni uno más (la biblioteca de íconos conserva su «Borrar» con restauración propia)");
    assert.match(pick, /manage\.hide \? L\(lang, "Ocultar", "Hide"\) : L\(lang, "Borrar", "Delete"\)/);
    assert.match(pick, /manage\.hide \? <EyeOff \/> : <Trash2 \/>/);
  });

  it("el manual nombra la acción de estos selectores como ocultar, no borrar", () => {
    const topics = fs.readFileSync(new URL("../manual/topics.ts", import.meta.url), "utf8");
    for (const id of ["f-categoria", "f-sub", "f-tienda-elegir", "f-cat-elegir"]) {
      const at = topics.indexOf(`id: "${id}"`);
      assert.ok(at >= 0, `el tema ${id} existe`);
      const end = topics.indexOf('id: "', at + 10);
      const slice = topics.slice(at, end === -1 ? undefined : end);
      assert.match(slice, /oculta|hides/, `${id} describe el lápiz como ocultar`);
      assert.doesNotMatch(slice, /[Bb]orrar|Delet/, `${id} no llama «Borrar» a lo que oculta`);
    }
  });
});
