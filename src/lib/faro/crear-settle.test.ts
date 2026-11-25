/* crear-settle — la costura de canon de E5 (1.3.448): el nacimiento
   de la pieza que el diálogo propuso, con las formas de la casa; la
   cerca de conflictos repetida al nacer; y el movimiento que
   esperaba, ubicado al fin. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCrearDraft, locatePendingLine, rawNameFor } from "./crear-settle.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { RelatoDraft } from "./relato.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";

function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  return ledger;
}

const pendingDraft: RelatoDraft = {
  op: "gasto", amountMinor: 8000, currency: "USD", concept: "jardineria",
  categoryId: "", subId: "", date: "2026-10-22", clause: "pagué 80 de jardinería", duplicate: null,
} as RelatoDraft;

function settledUnlocated(ledger: LedgerState): LedgerState {
  const line = {
    id: "l1", seriesId: "l1", monthKey: KEY, currency: "USD", active: true, note: "",
    kind: "expense-variable" as LineKind, concept: "jardineria", amountMinor: 8000, bookedOn: "2026-10-22",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [],
  } as Line;
  return { ...ledger, months: { ...ledger.months, [KEY]: { lines: [line] } } };
}

describe("crear-settle · el nacimiento con las formas de la casa", () => {
  it("categoría nueva: id c-, customName del usuario, Circle, group variable, role vacío", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const out = applyCrearDraft(ledger, names, { nombre: "Jardinería", tipo: "gasto", padreId: "", esSub: false });
    assert.equal(out.created, true);
    const cat = out.state.structure.categories.find((c) => c.id === out.categoryId);
    assert.ok(cat);
    assert.match(cat!.id, /^c-/);
    assert.equal(cat!.customName, "Jardinería");
    assert.equal(cat!.nameKey, "");
    assert.equal(cat!.icon, "Circle");
    assert.equal(cat!.group, "variable");
    assert.equal(cat!.role, "");
    assert.deepEqual(cat!.subs, []);
    // El libro de entrada no se tocó.
    assert.equal(ledger.structure.categories.some((c) => c.customName === "Jardinería"), false);
  });

  it("de ahorro nace con role savings (sus líneas cuentan como ahorro)", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const out = applyCrearDraft(ledger, names, { nombre: "Fondo de viaje", tipo: "ahorro", padreId: "", esSub: false });
    const cat = out.state.structure.categories.find((c) => c.id === out.categoryId);
    assert.equal(cat!.role, "savings");
  });

  it("bajo una existente nace una sub con el icono de su madre y el order siguiente", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const casa = ledger.structure.categories.find((c) => c.id === "f-casa")!;
    const out = applyCrearDraft(ledger, names, { nombre: "Peluquería", tipo: "gasto", padreId: "f-casa", esSub: true });
    assert.equal(out.created, true);
    assert.equal(out.categoryId, "f-casa");
    const after = out.state.structure.categories.find((c) => c.id === "f-casa")!;
    const sub = after.subs.find((s) => s.id === out.subId);
    assert.ok(sub);
    assert.match(sub!.id, /^s-/);
    assert.equal(sub!.customName, "Peluquería");
    assert.equal(sub!.icon, casa.icon);
    assert.equal(sub!.order, casa.subs.reduce((m, s) => Math.max(m, s.order), 0) + 1);
  });

  it("padre que ya no existe: no nace nada y el estado sale idéntico", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const out = applyCrearDraft(ledger, names, { nombre: "X", tipo: "gasto", padreId: "c-fantasma", esSub: true });
    assert.equal(out.created, false);
    assert.equal(out.state, ledger);
  });
});

describe("crear-settle · la cerca repetida y el movimiento que esperaba", () => {
  it("si el nombre ya existe al confirmar, no nace un duplicado: se devuelve el existente", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const out = applyCrearDraft(ledger, names, { nombre: "Casa", tipo: "gasto", padreId: "", esSub: false });
    assert.equal(out.created, false);
    assert.equal(out.categoryId, "f-casa");
    assert.equal(out.state, ledger);
  });

  it("el movimiento asentado sin ubicar queda ubicado en la pieza nueva", () => {
    const ledger = settledUnlocated(fixture());
    const names = makeNamer(ledger.structure, "es");
    const out = applyCrearDraft(ledger, names, { nombre: "Jardinería", tipo: "gasto", padreId: "", esSub: false }, pendingDraft);
    assert.equal(out.created, true);
    const line = out.state.months[KEY].lines[0];
    assert.equal(line.categoryId, out.categoryId);
    assert.equal(line.subId, "");
  });

  it("locatePendingLine no toca líneas ubicadas ni de otro monto", () => {
    const ledger = settledUnlocated(fixture());
    const other = { ...pendingDraft, amountMinor: 9999 };
    assert.equal(locatePendingLine(ledger, other, "f-casa", ""), ledger);
    const located = { ...ledger.months[KEY].lines[0], categoryId: "f-casa" };
    const l2 = { ...ledger, months: { [KEY]: { lines: [located] } } };
    assert.equal(locatePendingLine(l2, pendingDraft, "v-ocio", ""), l2);
  });
});

describe("crear-settle · el nombre tal como se escribió", () => {
  it("rawNameFor recupera la ortografía del usuario desde el relato crudo", () => {
    assert.equal(rawNameFor("pagué 80 de Jardinería ayer", "jardineria"), "Jardinería");
    assert.equal(rawNameFor("compré comida para perros, 40", "comida para perros"), "comida para perros");
    assert.equal(rawNameFor("pagué la luz 45", "jardineria"), null);
  });
});
