import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { categoryTotal, explainLines, scopeFilter, unionWorld } from "./world.ts";
import { createInitial } from "./defaults.ts";
import { commitDrafts } from "./drafts.ts";
import type { Draft, LedgerState, Line } from "./types.ts";

const book = () => createInitial("es");
const aLine = (over: Partial<Line> = {}): Line => ({
  id: "l-1", seriesId: "s-1", monthKey: "2026-11", kind: "expense-variable", concept: "Mercado", amountMinor: 4500,
  currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
  productCode: "", productUrl: "", cadence: "" as Line["cadence"], nextDue: "", aprBps: 0, balanceMinor: null,
  balanceCurrency: "USD", icon: "", history: [], bookedOn: "2026-11-03", ...over,
});
const withLines = (s: LedgerState, lines: Line[]): LedgerState => ({ ...s, months: { "2026-11": { lines } } });

test("libro397 · el segundo candado: la copia envenenada se recorta en el cliente", () => {
  const s = book();
  const [c1, c2] = s.structure.categories.map((c) => c.id);
  const poisoned = {
    ...withLines(s, [aLine({ id: "in", categoryId: c1 }), aLine({ id: "out", categoryId: c2 })]),
    settings: { secret: 1 }, audit: [{ id: "a" }], drafts: [{ id: "d" }],
  } as unknown as LedgerState;
  const cats = scopeFilter(poisoned, { cats: [c1] });
  const ids = Object.values(cats.months).flatMap((m) => m.lines).map((l) => l.id);
  assert.deepEqual(ids, ["in"]); // la línea fuera de alcance muere aquí, no en la pantalla
  assert.equal((cats as { settings?: unknown }).settings, undefined);
  assert.equal((cats as { audit?: unknown }).audit, undefined);
  assert.equal(cats.structure.categories.length, 1);
  const all = scopeFilter(poisoned, { all: true });
  assert.equal((all as { settings?: unknown }).settings, undefined); // ni con alcance total viajan
  assert.equal(Object.values(all.months).flatMap((m) => m.lines).length, 2);
});

test("libro397 · la unión de lectura: deduplica por id y no muta las entradas", () => {
  const own = withLines(book(), [aLine({ id: "a" })]);
  const shared = withLines(book(), [aLine({ id: "a", concept: "copia" }), aLine({ id: "b" })]);
  const world = unionWorld(own, shared);
  const lines = world.months["2026-11"].lines;
  assert.deepEqual(lines.map((l) => l.id), ["a", "b"]); // el libro propio manda en la colisión
  assert.equal(lines[0].concept, "Mercado");
  assert.equal(own.months["2026-11"].lines.length, 1); // entradas intactas
  assert.equal(shared.months["2026-11"].lines.length, 2);
});

test("libro397 · la explicación de la cifra: líneas, autor y dinero", () => {
  const s = book();
  const cat = s.structure.categories[0].id;
  const funded = { ...s, funding: { [cat]: "cuenta-maria" } };
  const state = withLines(funded, [
    aLine({ id: "1", categoryId: cat, amountMinor: 1000, by: "cuenta-maria", byName: "María" }),
    aLine({ id: "2", categoryId: cat, amountMinor: 2500, by: "faro", declaration: true, declaredAccount: "Su cuenta", fundedBy: "cuenta-maria" }),
    aLine({ id: "3", categoryId: "otra", amountMinor: 9999 }),
  ]);
  const fig = explainLines(state, "2026-11", cat);
  assert.equal(fig.length, 2);
  assert.equal(fig[0].author, "cuenta-maria");
  assert.equal(fig[0].funder, "cuenta-maria"); // el mapa financia el área
  assert.equal(fig[1].author, "faro");
  assert.equal(fig[1].declaration, true);
  assert.equal(categoryTotal(state, "2026-11", cat), 3500);
});

test("libro397 · la adopción en la mesa: con autor, el borrador nace firmado Y financiado", () => {
  const s = book();
  const cat = s.structure.categories.find((c) => c.group === "variable")!.id;
  const withMap: LedgerState = { ...s, funding: { [cat]: "cuenta-maria" } };
  const draft = {
    id: "d-1", kind: "line", source: "manual", raw: "", createdAt: "2026-11-22T00:00:00.000Z",
    concept: "Mercado único", amountMinor: 4500, currency: "USD", sign: "out", book: "expense-variable",
    categoryId: cat, subId: "", storeId: "", cat, day: "2026-11-03", monthKey: "2026-11", unsure: [], note: "",
  } as unknown as Draft;
  const state: LedgerState = { ...withMap, drafts: [draft] };
  const out = commitDrafts(state, [draft.id], { structure: state.structure, lang: "es", monthKey: "2026-11", author: { id: "cuenta-maria", name: "María" } });
  const line = Object.values(out.months).flatMap((m) => m.lines).find((l) => l.concept === "Mercado único");
  assert.ok(line, "el borrador se guardó como línea");
  assert.equal(line!.by, "cuenta-maria");
  assert.equal(line!.fundedBy, "cuenta-maria"); // el sello del dinero, en la misma puerta
});

test("libro397 · la vista compartida es de lectura: recorta antes de abrir y no guarda nada", () => {
  const src = readFileSync(new URL("../../components/faro/shared-view.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("scopeFilter(raw, m.scope)"), "la copia se recorta por el alcance antes de abrirse");
  assert.ok(!src.includes("commit("), "ningún camino de guardado pasa por la vista");
  assert.ok(!src.includes("commitGuarded("), "ni guardado con guardián");
});
