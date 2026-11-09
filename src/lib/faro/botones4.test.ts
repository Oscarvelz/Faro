// Oleada de botones 4 (1.3.173) — un solo patrón: la política de confirmación de los
// editores y la carpeta fantasma de Estudio.
// R7 (la política única) vive en los componentes (LineForm, DueOwe, LoanForm, LoanCard,
// PersonForm, GiftForm, QuickAdd): sus sondas son las de banco probe173-r7a/r7b.mjs
// (rojas sobre la 1.3.172 intacta, verdes aquí). Aquí queda cercada la lógica pura que
// todas esas familias comparten: formDirty (dirty.ts), la comparación única con la que
// cada editor decide si pregunta antes de descartar.
// R12 (la carpeta fantasma) comparte su regla entre la tarjeta (study2 KeyNumbers) y el
// pliegue de Estudio (screens): la regla de vacío vive en keynumbers.ts y se cerca aquí.
// R13 (un solo verbo al plegar todo) y el cuerpo neutro de R7 («este registro») son
// cadenas: se cercan contra i18n. R8 (la etiqueta según la dirección) y R9 (la hoja de
// «Ícono y color» no se cierra al elegir ícono) y R15 (el paso atrás de Editar en la
// bolsa) son cableado puro de componentes: sondas probe173-r8/r9/r15.mjs.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formDirty } from "./dirty.ts";
import { hasKeyNumbers, keyNumbersShown } from "./keynumbers.ts";
import { translate } from "./i18n.ts";
import type { Insight } from "./types.ts";

describe("formDirty: la comparación única de los editores (R7)", () => {
  const abierta = { concepto: "", monto: "", dia: "2026-11-09", activo: true };

  it("una forma intacta no está sucia: Cancelar y Guardar no preguntan", () => {
    assert.equal(formDirty(abierta, { ...abierta }), false);
  });

  it("cualquier campo tocado la ensucia", () => {
    assert.equal(formDirty(abierta, { ...abierta, concepto: "Netflix" }), true);
    assert.equal(formDirty(abierta, { ...abierta, monto: "100" }), true);
    assert.equal(formDirty(abierta, { ...abierta, dia: "2026-11-10" }), true);
    assert.equal(formDirty(abierta, { ...abierta, activo: false }), true);
  });

  it("volver al valor de apertura la limpia otra vez (no es un contador de toques)", () => {
    assert.equal(formDirty({ ...abierta, monto: "100" }, { ...abierta, monto: "100" }), false);
  });

  it("las listas de fechas (Personas) comparan por contenido, no por identidad", () => {
    const base = { nombre: "Ana", fechas: [{ id: "1", kind: "anniversary", label: "", date: "" }] };
    assert.equal(formDirty(base, { nombre: "Ana", fechas: [{ id: "1", kind: "anniversary", label: "", date: "" }] }), false);
    assert.equal(formDirty(base, { nombre: "Ana", fechas: [{ id: "1", kind: "anniversary", label: "", date: "2026-05-01" }] }), true);
    assert.equal(formDirty(base, { nombre: "Ana", fechas: [] }), true);
  });

  it("una clave que aparece o desaparece también es un cambio", () => {
    assert.equal(formDirty({ a: 1 }, { a: 1, b: 2 }), true);
    assert.equal(formDirty({ a: 1, b: 2 }, { a: 1 }), true);
  });
});

describe("el cuerpo neutro de la pregunta y el verbo único de plegar (R7/R13)", () => {
  it("«este registro» existe en los dos idiomas (nunca el nombre de un campo)", () => {
    assert.equal(translate("es", "entry.this"), "este registro");
    assert.equal(translate("en", "entry.this"), "this entry");
  });

  it("Estudio y Asesor confirman el plegado total con el mismo verbo: «Plegar»", () => {
    assert.equal(translate("es", "advice.unfold.yes"), "Plegar");
    assert.equal(translate("es", "advice.unfold.yes"), translate("es", "study.unfold.yes"));
    assert.equal(translate("en", "advice.unfold.yes"), "Fold");
    assert.equal(translate("en", "advice.unfold.yes"), translate("en", "study.unfold.yes"));
  });
});

const ins = (value: string): Insight => ({
  id: "x", title: "X", value, detail: "", tone: "neutral", meaning: "", formula: "", implication: "",
});

describe("la regla de vacío de Números clave (R12)", () => {
  it("un libro vacío no tiene números clave que mostrar", () => {
    assert.equal(hasKeyNumbers([]), false);
    assert.equal(hasKeyNumbers([ins("—"), ins("0"), ins("0%"), ins("C$0.00"), ins("0 en dólares"), ins("$0.00 in dollars")]), false);
  });

  it("un solo número real basta para que la carpeta exista", () => {
    assert.equal(hasKeyNumbers([ins("—"), ins("17%")]), true);
    assert.equal(hasKeyNumbers([ins("C$350.00")]), true);
    assert.deepEqual(keyNumbersShown([ins("—"), ins("3 días"), ins("0%")]).map((i) => i.value), ["3 días"]);
  });
});
