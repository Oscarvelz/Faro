import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import {
  applyTemplate, catalogLinesSummary, defaultStructure, markUserVis, missingDefaults,
  restoreDefaultCategories, showAllPreview, showAllStructure, structureStatusLine, subLinesSummary,
} from "./defaults.ts";
import type { Currency, LedgerState, Line, Structure } from "./types.ts";

// 1.3.187 — «Mostrar todo y la casa del Catálogo» (auditoría de Estructura R-3/R-4/R-5 + E-8).
// R-3: la base vuelve a Completa en un solo gesto — todo visible (plantilla y mano),
// userVis reiniciado, con vista previa honesta (conteos + aviso). R-4: el borrado de una
// pieza del Catálogo cuenta las líneas que la nombran y sus totales por moneda. E-8: el
// restaurar de fábrica vive en la cabecera de cada grupo (missingDefaults/restore con grupo).

function ledger(structure: Structure, rows: Line[] = []): LedgerState {
  return {
    v: 1,
    structure,
    months: { "2026-11": { lines: rows } },
    settings: {
      lang: "es", theme: "claro", display: "USD" as Currency, rateE4: 366243, rateSource: "BCN", rateAsOf: "2026-11-09",
      savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {}, seeds: [],
    },
    audit: [],
    revision: 1,
    updatedAt: "2026-11-09T12:00:00.000Z",
  };
}

function line(partial: Partial<Line>): Line {
  return {
    id: "l1", seriesId: "l1", monthKey: "2026-11", kind: "purchase", concept: "Compra", amountMinor: 0,
    currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "",
    providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

/** Soltero aplicado + una categoría y un subconcepto ocultos A MANO encima. */
function dressedBook(): Structure {
  let s = applyTemplate(defaultStructure(), "soltero");
  s = markUserVis({ ...s, categories: s.categories.map((c) => (c.id === "f-mascotas" ? { ...c, hidden: true } : c)) }, ["f-mascotas"], true);
  s = markUserVis({ ...s, categories: s.categories.map((c) => (c.id === "f-casa" ? { ...c, subs: c.subs.map((x) => (x.id === "f.casa.renta" ? { ...x, hidden: true } : x)) } : c)) }, ["f.casa.renta"], true);
  return s;
}

describe("R-3 · showAllStructure: todo visible, la mano reiniciada, la base Completa", () => {
  it("muestra cada categoría y subconcepto, incluidos los de la mano", () => {
    const next = showAllStructure(dressedBook());
    assert.ok(next.categories.every((c) => !c.hidden && c.subs.every((s) => !s.hidden)));
  });

  it("limpia el registro de la mano y registra la base completa en el mismo gesto", () => {
    const next = showAllStructure(dressedBook());
    assert.deepEqual(next.userVis, {});
    assert.equal(next.base, "completa");
  });

  it("la línea de estado cae en su forma de cero ajustes (la de la 1.3.181)", () => {
    const next = showAllStructure(dressedBook());
    assert.equal(structureStatusLine(next, "es"), "Base: Completa — todo visible.");
    assert.equal(structureStatusLine(next, "en"), "Base: Complete — everything visible.");
  });

  it("no toca compras ni Catálogo, ni quita las categorías que una plantilla agregó", () => {
    const before = applyTemplate(defaultStructure(), "estudiante"); // agrega v-estudio
    const next = showAllStructure(before);
    assert.deepEqual(next.purchases, before.purchases);
    assert.deepEqual(next.catalog, before.catalog);
    assert.ok(next.categories.some((c) => c.id === "v-estudio"));
    assert.equal(next.categories.length, before.categories.length);
  });

  it("es pura: el estado previo queda intacto (ese es el que Deshacer restaura)", () => {
    const before = dressedBook();
    const snapshot = JSON.stringify(before);
    showAllStructure(before);
    assert.equal(JSON.stringify(before), snapshot);
  });

  it("tras mostrar todo, la ley de la mano sigue viva: lo que la mano fija, la plantilla lo respeta", () => {
    const shown = showAllStructure(dressedBook());
    const rehidden = applyTemplate(shown, "soltero");
    assert.ok(rehidden.categories.find((c) => c.id === "f-familia")!.subs.filter((s) => s.hidden).length === 5);
    const hand = markUserVis(rehidden, ["f.familia.hijo1"], false);
    const fam = applyTemplate({ ...hand, categories: hand.categories.map((c) => (c.id === "f-familia" ? { ...c, subs: c.subs.map((x) => (x.id === "f.familia.hijo1" ? { ...x, hidden: true } : x)) } : c)) }, "familia");
    assert.equal(fam.categories.find((c) => c.id === "f-familia")!.subs.find((s) => s.id === "f.familia.hijo1")!.hidden, true);
  });
});

describe("R-3 · showAllPreview: conteos honestos y el aviso, en los dos idiomas", () => {
  it("cuenta la categoría oculta por su nombre y los subconceptos por su número (ES)", () => {
    const pv = showAllPreview(ledger(dressedBook()), "es");
    assert.equal(pv.empty, false);
    assert.ok(pv.body.includes("Se muestra: Mascotas."), pv.body);
    assert.ok(pv.body.includes("Vuelven a mostrarse 8 subconceptos ocultos."), pv.body); // 7 de Soltero + la renta a mano
    assert.ok(pv.body.includes("La base vuelve a ser Completa."), pv.body);
  });

  it("nombra el reinicio de la mano con su conteo y el aviso explícito (ES)", () => {
    const pv = showAllPreview(ledger(dressedBook()), "es");
    assert.ok(pv.body.includes("Tus ajustes a mano (2) se reinician."), pv.body);
    assert.ok(pv.body.includes("Ojo: también se deshace lo que tu mano había fijado"), pv.body);
    assert.ok(pv.body.includes("Nada se borra y ningún movimiento se toca."), pv.body);
  });

  it("lo mismo en inglés (EN)", () => {
    const pv = showAllPreview(ledger(dressedBook()), "en");
    assert.ok(pv.body.includes("Shows: Pets."), pv.body);
    assert.ok(pv.body.includes("8 hidden subcategories show again."), pv.body);
    assert.ok(pv.body.includes("The base becomes Complete again."), pv.body);
    assert.ok(pv.body.includes("Your own adjustments (2) are reset."), pv.body);
    assert.ok(pv.body.includes("Careful: what your hand had set is undone too"), pv.body);
  });

  it("un libro recién nacido no tiene nada que mostrar: la vista previa lo dice y no aplica", () => {
    const pv = showAllPreview(ledger(defaultStructure()), "es");
    assert.equal(pv.empty, true);
    assert.equal(pv.body, "No cambiaría nada en tu estructura.");
  });

  it("un libro sin base registrada no oye «vuelve»: la base queda registrada", () => {
    const sinBase: Structure = { ...applyTemplate(defaultStructure(), "soltero"), base: undefined };
    const pv = showAllPreview(ledger(sinBase), "es");
    assert.ok(pv.body.includes("La base queda registrada: Completa."), pv.body);
    assert.ok(!pv.body.includes("vuelve a ser"), pv.body);
  });

  it("sin ocultos pero con la mano en pie, no es vacío: reiniciar el registro sí es un cambio", () => {
    const hand = markUserVis(defaultStructure(), ["f.familia.hijo1"], false);
    const pv = showAllPreview(ledger(hand), "es");
    assert.equal(pv.empty, false);
    assert.ok(pv.body.includes("Tus ajustes a mano (1) se reinician."), pv.body);
    assert.ok(!pv.body.includes("Se muestra:"), pv.body);
  });

  it("sin ajustes a mano no hay aviso de la mano (no promete lo que no pasa)", () => {
    const tplOnly = applyTemplate(defaultStructure(), "soltero");
    const pv = showAllPreview(ledger(tplOnly), "es");
    assert.ok(!pv.body.includes("ajustes a mano"), pv.body);
    assert.ok(pv.body.includes("Vuelven a mostrarse 7 subconceptos ocultos."), pv.body);
  });
});

describe("R-4 · catalogLinesSummary: lo que cuelga de una pieza del Catálogo", () => {
  const book = ledger(defaultStructure(), [
    line({ id: "a", storeId: "amazon", amountMinor: 1500, currency: "USD" }),
    line({ id: "b", storeId: "amazon", amountMinor: 36000, currency: "NIO" }),
    line({ id: "c", storeId: "temu", amountMinor: 999, currency: "USD" }),
    line({ id: "d", providerId: "claude", amountMinor: 2000, currency: "USD" }),
    line({ id: "e", amountMinor: 500, currency: "USD" }),
  ]);

  it("cuenta las compras de la tienda y suma por moneda, sin mezclar", () => {
    const s = catalogLinesSummary(book, "amazon");
    assert.equal(s.count, 2);
    assert.deepEqual(s.totals, [{ currency: "NIO", minor: 36000 }, { currency: "USD", minor: 1500 }]);
  });

  it("cuenta también las líneas que nombran un servicio (providerId)", () => {
    const s = catalogLinesSummary(book, "claude");
    assert.equal(s.count, 1);
    assert.deepEqual(s.totals, [{ currency: "USD", minor: 2000 }]);
  });

  it("una pieza sin líneas da cero (el diálogo queda como hoy: solo el nombre)", () => {
    assert.deepEqual(catalogLinesSummary(book, "shein"), { count: 0, totals: [] });
  });

  it("lee el saldo cuando la línea lo lleva, como subLinesSummary", () => {
    const carried = ledger(defaultStructure(), [line({ id: "x", storeId: "amazon", amountMinor: 100, balanceMinor: 4200, balanceCurrency: "NIO", currency: "USD" })]);
    assert.deepEqual(catalogLinesSummary(carried, "amazon").totals, [{ currency: "NIO", minor: 4200 }]);
    assert.deepEqual(subLinesSummary(carried, "nada"), { count: 0, totals: [] });
  });
});

describe("E-8 · missingDefaults/restoreDefaultCategories por grupo", () => {
  const sinDos = (): Structure => {
    const s = defaultStructure();
    return { ...s, categories: s.categories.filter((c) => c.id !== "f-mascotas" && c.id !== "v-mascotas") };
  };

  it("sin grupo, faltan las dos; con grupo, solo las de ese grupo", () => {
    assert.deepEqual(missingDefaults(sinDos()).map((c) => c.id).sort(), ["f-mascotas", "v-mascotas"]);
    assert.deepEqual(missingDefaults(sinDos(), "variable").map((c) => c.id), ["v-mascotas"]);
    assert.deepEqual(missingDefaults(sinDos(), "fixed").map((c) => c.id), ["f-mascotas"]);
  });

  it("restaurar por grupo trae solo las de ese grupo y no toca líneas ni categorías propias", () => {
    const own: Structure = { ...sinDos(), categories: [...sinDos().categories, { id: "c-propia", nameKey: "", customName: "Mía", icon: "Circle", hidden: false, order: 99, group: "variable", role: "", subs: [] }] };
    const st = ledger(own, [line({ id: "z", amountMinor: 100 })]);
    const next = restoreDefaultCategories(st, "variable");
    assert.ok(next.structure.categories.some((c) => c.id === "v-mascotas"));
    assert.ok(!next.structure.categories.some((c) => c.id === "f-mascotas"));
    assert.ok(next.structure.categories.some((c) => c.id === "c-propia"));
    assert.equal(next.months, st.months);
  });

  it("la restaurada aterriza al final de SU grupo en los dos grupos (order corre por todo el libro)", () => {
    const st = ledger(sinDos());
    const next = restoreDefaultCategories(st);
    for (const g of ["fixed", "variable"] as const) {
      const inGroup = next.structure.categories.filter((c) => c.group === g);
      const restored = inGroup.find((c) => c.id === `${g === "fixed" ? "f" : "v"}-mascotas`)!;
      assert.equal(restored.order, Math.max(...inGroup.map((c) => c.order)), g);
    }
  });

  it("restaurar sin grupo las trae todas; sin ausentes devuelve el mismo estado", () => {
    const st = ledger(sinDos());
    const next = restoreDefaultCategories(st);
    assert.ok(next.structure.categories.some((c) => c.id === "f-mascotas"));
    assert.ok(next.structure.categories.some((c) => c.id === "v-mascotas"));
    const full = ledger(defaultStructure());
    assert.equal(restoreDefaultCategories(full, "fixed"), full);
  });
});

describe("fuentes: las llaves nuevas existen en los dos idiomas", () => {
  it("i18n trae tpl.completa y la familia delete.store/delete.item en ES y EN", () => {
    const src = fs.readFileSync(new URL("./i18n.ts", import.meta.url), "utf8");
    for (const key of ["tpl.completa", "delete.store.lines", "delete.store.lines.one", "delete.item.lines", "delete.item.lines.one"]) {
      assert.equal(src.split(`"${key}"`).length - 1, 2, key);
    }
  });

  it("el refuerzo de la tarjeta elegida existe y deja a Tron fuera", () => {
    const css = fs.readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
    assert.ok(css.includes('html:not([data-theme="tron"]) .aj-pick[aria-pressed="true"] { background: var(--accent); }'));
  });
});
