// Oleada de botones 1 (1.3.170) — las afirmaciones se verifican.
// R1 («Copiar plan» espera la escritura y solo entonces lo afirma) vive en el componente; su
// prueba es la sonda de banco probe170-r1.mjs. Aquí queda cercado el mecanismo de N1: el detalle
// de un commit puede ser una función que el reducer resuelve DESPUÉS de correr la receta, para
// que la entrada del registro de actividad lleve el resultado que la receta misma calculó — la
// cuenta de líneas conservadas del Deshacer importación — sin cambiar el comportamiento de los
// detalles de texto de siempre. Datos sintéticos solamente.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { blankSession, commit } from "./reducer.ts";
import { applyImport, buildReview, revertImportCounted, type ParsedFile, type Undo } from "./bankparse.ts";
import type { Category, LedgerState, Line } from "./types.ts";

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

describe("N1 — el detalle-función del commit se resuelve tras la receta", () => {
  it("un detalle de texto se guarda tal cual (el comportamiento de siempre)", () => {
    const s = blankSession(createInitial("es", "claro"));
    const next = commit(s, (x) => x, "Deshacer importación");
    assert.equal(next.ledger.audit[0].detail, "Deshacer importación");
  });

  it("la función ve el valor que la receta acaba de calcular, no el de antes", () => {
    const s = blankSession(createInitial("es", "claro"));
    let outcome = 0;
    const next = commit(s, (x) => { outcome = 7; return x; }, () => `cuenta ${outcome}`);
    assert.equal(next.ledger.audit[0].detail, "cuenta 7");
  });
});

// ---------- espejo del Deshacer de bank-import.tsx ----------
function line(id: string, concept: string, amountMinor: number): Line {
  return {
    id, seriesId: id, monthKey: "2026-11", kind: "purchase", concept, amountMinor, currency: "USD",
    active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD",
    icon: "", history: [], bookedOn: "2026-11-03", startedOn: "", batch: "b170",
  } as Line;
}

function undoCase(edit: boolean) {
  const amazon = line("l-amazon", "Amazon", -2550);
  const shell = line("l-shell", "Shell", -4000);
  const written = [clone(amazon), clone(shell)];
  const current = edit ? [{ ...amazon, amountMinor: -9900 }, shell] : [amazon, shell];
  const base = createInitial("es", "claro");
  const state: LedgerState = { ...base, months: { "2026-11": { lines: current } } };
  const undo: Undo = { batch: "b170", added: 2, before: [], book: undefined, written };
  return { state, undo };
}

/** Exactamente el cableado de bank-import.tsx (1.3.170): la receta cuenta, el detalle lo dice. */
function undoWiring(state: LedgerState, undo: Undo) {
  let kept = 0;
  return commit(blankSession(state),
    (s) => { const r = revertImportCounted(s, undo); kept = r.preserved; return r.state; },
    () => (kept > 0
      ? `Deshacer importación. Se conservaron ${kept} línea${kept === 1 ? "" : "s"} que editaste después.`
      : "Deshacer importación"));
}

describe("N1 — la entrada de actividad del Deshacer lleva el resultado", () => {
  it("con una línea editada tras importar: la entrada dice la cuenta y la línea sobrevive", () => {
    const { state, undo } = undoCase(true);
    const next = undoWiring(state, undo);
    assert.equal(next.ledger.audit[0].detail, "Deshacer importación. Se conservaron 1 línea que editaste después.");
    const lines = Object.values(next.ledger.months).flatMap((b) => b.lines);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].concept, "Amazon");
    assert.equal(lines[0].amountMinor, -9900);
  });

  it("sin ediciones posteriores: la entrada es la de siempre, sin cuenta inventada", () => {
    const { state, undo } = undoCase(false);
    const next = undoWiring(state, undo);
    assert.equal(next.ledger.audit[0].detail, "Deshacer importación");
    const lines = Object.values(next.ledger.months).flatMap((b) => b.lines);
    assert.equal(lines.length, 0);
  });
});

// ---------- la raíz que la sonda de banco destapó (DBG170: preserved=0 en el flujo real) ----------
// save() calculaba el Deshacer con una corrida EN SECO de applyImport sobre el estado de render,
// y el commit volvía a correr applyImport para escribir el libro. Cada corrida acuña ids nuevos
// (crypto.randomUUID), así que la procedencia (written) del Deshacer en seco nunca nombra a las
// líneas que el commit escribió: la cuenta nacía en cero y una línea editada que conservara su
// marca de lote salía borrada en silencio. La 1.3.170 captura el Deshacer de la corrida del commit.
const sub = (id: string, name: string) => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0 });
const cat = (id: string, group: "fixed" | "variable", name: string, subs: [string, string][], role = ""): Category =>
  ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0, group, role, subs: subs.map(([a, b]) => sub(a, b)) });
function ledger170(): LedgerState {
  return {
    v: 1, revision: 1, updatedAt: "", audit: [], months: {},
    settings: { lang: "es", theme: "claro", display: "USD", rateE4: 366243, rateSource: "", rateAsOf: "", savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {} },
    structure: {
      categories: [
        cat("f-alimentos", "fixed", "Alimentos", [["f.alimentos.despensa", "Despensa"]]),
        cat("v-personales", "variable", "Personales", [["v.p.otros", "Otros"]]),
      ],
      purchases: [{ id: "otros", nameKey: "", customName: "Otros", icon: "Package", hidden: false, order: 0 }],
      catalog: [],
    },
  } as LedgerState;
}
const names170 = { cat: (id: string) => id, sub: (id: string) => id, purchase: (id: string) => id };
const allLines170 = (s: LedgerState) => Object.values(s.months).flatMap((b) => b.lines);
const editLine170 = (s: LedgerState, id: string, patch: Partial<Line>): LedgerState => ({
  ...s,
  months: Object.fromEntries(Object.entries(s.months).map(([k, b]) => [k, { lines: b.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }])),
});

describe("N1 (raíz) — el Deshacer debe ser el de la corrida que escribió el libro", () => {
  it("con el Deshacer de la corrida en seco la cuenta nace en cero; con el del commit, dice la verdad", () => {
    const s0 = ledger170();
    const f: ParsedFile = { name: "tarjeta.csv", format: "csv", bank: "chase", kind: "card", sig: "csv:chase-170", rows: [
      { date: "2026-10-05", amount: -5000, desc: "COMPRA NUEVA" },
      { date: "2026-10-06", amount: -7000, desc: "OTRA COMPRA" },
    ] } as ParsedFile;
    const rv = buildReview(s0, [f], ["acct-chase-card"], names170, "es");
    const dry = applyImport(s0, rv, [f], ["acct-chase-card"], "b170x");   // la corrida en seco (el cableado viejo)
    const real = applyImport(s0, rv, [f], ["acct-chase-card"], "b170x");  // la corrida del commit
    const created = allLines170(real.state).filter((l) => l.batch === "b170x");
    assert.equal(created.length, 2);
    const edited = editLine170(real.state, created[0].id, { amountMinor: 5555 });
    // El Deshacer equivocado: ni cuenta la editada ni la perdona — la borra como si nadie la hubiera tocado.
    const wrong = revertImportCounted(edited, dry.undo);
    assert.equal(wrong.preserved, 0);
    assert.equal(allLines170(wrong.state).length, 0);
    // El Deshacer de la corrida que escribió: la editada se queda con su monto, la intacta sale.
    const good = revertImportCounted(edited, real.undo);
    assert.equal(good.preserved, 1);
    const kept = allLines170(good.state);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].id, created[0].id);
    assert.equal(kept[0].amountMinor, 5555);
  });
});
