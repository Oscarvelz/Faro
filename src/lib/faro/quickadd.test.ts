/**
 * Los apuntes rápidos del widget: el parseo desconfía de la cola, la línea cae en el mes del
 * apunte (no en el de la recogida) y recoger dos veces nunca duplica (el id manda).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ingestQuick, parseQuickEntries, quickHomes, quickLine, QUICK_MAX_MINOR, type QuickEntry } from "./quickadd.ts";
import type { LedgerState, Line } from "./types.ts";

const blank = () => ({ revision: 1, updatedAt: "2026-11-12T00:00:00.000Z", settings: { lang: "es" }, months: {}, structure: { categories: [] } }) as unknown as LedgerState;

const GOOD: QuickEntry = { id: "q-12345678-ab", sign: "out", minor: 125050, cur: "NIO", day: "2026-10-31" };

describe("apuntes rápidos del widget", () => {
  it("parsea la cola y descarta cada pieza mala sin romper", () => {
    const raw = JSON.stringify([
      GOOD,
      { id: "x", sign: "out", minor: 100, cur: "USD", day: "2026-10-31" }, // id corto
      { id: "q-87654321-cd", sign: "sideways", minor: 100, cur: "USD", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: 0, cur: "USD", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: -50, cur: "USD", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: QUICK_MAX_MINOR + 1, cur: "USD", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: 100, cur: "EUR", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: 100, cur: "USD", day: "31/10/2026" },
      "basura", null, 42,
    ]);
    assert.deepEqual(parseQuickEntries(raw), [{ ...GOOD, cat: "", sub: "" }]);
    assert.deepEqual(parseQuickEntries(""), []);
    assert.deepEqual(parseQuickEntries("{no json"), []);
    assert.deepEqual(parseQuickEntries("{}"), []);
  });

  it("la línea: kind por signo, mes del día del apunte, id y serie = el id del apunte", () => {
    const l = quickLine(GOOD, "es");
    assert.equal(l.kind, "expense-variable");
    assert.equal(l.monthKey, "2026-10"); // octubre, aunque se recoja en noviembre
    assert.equal(l.id, GOOD.id);
    assert.equal(l.seriesId, GOOD.id);
    assert.equal(l.amountMinor, 125050);
    assert.equal(l.currency, "NIO");
    assert.equal(l.categoryId, "");
    assert.equal(l.subId, "");
    assert.equal(l.active, true);
    assert.equal(l.bookedOn, "2026-10-31");
    const inn = quickLine({ ...GOOD, sign: "in" }, "en");
    assert.equal(inn.kind, "income-variable");
    assert.equal(inn.concept, "Quick entry");
    assert.equal(l.concept, "Apunte rápido");
  });

  it("recoger dos veces no duplica; el libro ajeno queda intacto", () => {
    const base = blank();
    const once = ingestQuick(base, [GOOD], "es");
    const twice = ingestQuick(once, [GOOD], "es");
    assert.equal(once.months["2026-10"]?.lines.length, 1);
    assert.equal(twice.months["2026-10"]?.lines.length, 1);
    assert.equal(base.months["2026-10"], undefined); // el estado original no se mutó
  });

  it("las casas: solo las que ya reciben el signo, por uso; Ahorros y lo oculto quedan fuera", () => {
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    (st.structure as unknown as { categories: unknown[] }).categories = [
      named("c-casa", "Casa", 1, { group: "fixed", role: "housing", subs: [named("s-renta", "Renta", 1), named("s-luz", "Luz", 2), named("s-oculta", "Oculta", 3, { hidden: true })] }),
      named("c-comida", "Comida", 2, { group: "variable", role: "food", subs: [named("s-super", "Súper", 1)] }),
      named("c-ahorro", "Ahorro", 3, { group: "variable", role: "savings", subs: [named("s-boveda", "Bóveda", 1)] }),
      named("c-salario", "Salario", 4, { group: "fixed", role: "", subs: [named("s-sueldo", "Sueldo", 1)] }),
    ];
    const mk = (kind: string, categoryId: string, subId: string) =>
      ({ id: `${kind}-${categoryId}-${subId}-${Math.random()}`, seriesId: "x", monthKey: "2026-11", kind, concept: "x", amountMinor: 100, currency: "NIO", active: true, note: "", categoryId, subId, recurring: false, cadence: "", nextDue: "", color: "", icon: "" }) as unknown as Line;
    st.months = { "2026-11": { lines: [
      mk("expense-fixed", "c-casa", "s-renta"), mk("expense-fixed", "c-casa", "s-renta"),
      mk("expense-variable", "c-comida", "s-super"),
      mk("expense-fixed", "c-casa", "s-oculta"),
      mk("expense-variable", "c-ahorro", "s-boveda"),
      mk("income-fixed", "c-salario", "s-sueldo"),
      mk("income-variable", "c-comida", "s-super"), // Comida recibió UN ingreso: es casa de ambos signos
    ] } };
    const homes = quickHomes(st, "2026-11", "es");
    assert.deepEqual(homes.out.map((h) => h.n), ["Casa · Renta", "Comida · Súper"]);
    assert.deepEqual(homes.inn.map((h) => h.n), ["Comida · Súper", "Salario · Sueldo"]); // empate a 1 uso: gana el orden de Estructura
    assert.ok(!homes.out.some((h) => h.c === "c-ahorro"), "Ahorros nunca es casa de un apunte");
  });

  it("con casa: el kind sale del grupo de la categoría; las caídas son honestas", () => {
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    (st.structure as unknown as { categories: unknown[] }).categories = [
      named("c-casa", "Casa", 1, { group: "fixed", role: "housing", subs: [named("s-renta", "Renta", 1)] }),
      named("c-ahorro", "Ahorro", 2, { group: "variable", role: "savings", subs: [named("s-boveda", "Bóveda", 1)] }),
    ];
    const filed = (e: QuickEntry) => ingestQuick(st, [e], "es").months["2026-10"]?.lines[0];
    const housed = filed({ ...GOOD, cat: "c-casa", sub: "s-renta" });
    assert.equal(housed?.kind, "expense-fixed"); // el grupo de Casa, no el «variable» por defecto
    assert.equal(housed?.categoryId, "c-casa");
    assert.equal(housed?.subId, "s-renta");
    const subGone = filed({ ...GOOD, id: "q-22222222-bb", cat: "c-casa", sub: "s-borrada" });
    assert.equal(subGone?.categoryId, "c-casa"); // la categoría se queda…
    assert.equal(subGone?.subId, ""); // …la sub borrada cae en la categoría, no en otro lugar
    const catGone = filed({ ...GOOD, id: "q-33333333-cc", cat: "c-fantasma", sub: "s-x" });
    assert.equal(catGone?.categoryId, "");
    assert.equal(catGone?.kind, "expense-variable"); // el apunte nunca se pierde ni se archiva mal
    const savings = filed({ ...GOOD, id: "q-44444444-dd", cat: "c-ahorro", sub: "s-boveda" });
    assert.equal(savings?.categoryId, ""); // Ahorros jamás recibe un apunte genérico
    const badHome = parseQuickEntries(JSON.stringify([{ ...GOOD, id: "q-55555555-ee", cat: 42, sub: null }]));
    assert.equal(badHome[0]?.cat, ""); // una casa mal formada degrada, no mata el apunte
  });

  it("el shell: los + / − levantan la tarjeta rápida, no la app; el puente recoge la cola", () => {
    const root = process.cwd();
    const widgets = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt"), "utf8");
    const main = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/MainActivity.kt"), "utf8");
    const manifest = fs.readFileSync(path.join(root, "android/app/src/main/AndroidManifest.xml"), "utf8");
    const quick = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt"), "utf8");
    assert.match(widgets, /R\.id\.w_add_in, FaroWidgets\.quickIntent\(ctx, "in"\)/);
    assert.match(widgets, /R\.id\.w_add_out, FaroWidgets\.quickIntent\(ctx, "out"\)/);
    assert.ok(!widgets.includes('openIntent(ctx, "add-in")') && !widgets.includes('openIntent(ctx, "add-out")'),
      "los botones ya no abren la app");
    assert.match(main, /fun takeQuickEntries\(\): String/);
    assert.match(manifest, /android:name="\.QuickAddActivity"/);
    // La tarjeta no lee el libro: solo la foto (idioma/moneda) y su propia cola.
    assert.match(quick, /FaroWidgets\.load\(this\)/);
    assert.ok(!quick.includes("faro_ledgers") && !quick.includes("supabase"), "la tarjeta no toca el libro ni la red");
  });
});
