/**
 * ranking-fuentes — la ampliación de ranking (registro
 * RANKING-FUENTES, 2026-11-27): la fuente de ingreso agregada en el
 * período y la salida con su peso contra lo que entró. Todas las
 * frases de esta cerca son acuñadas en esta línea y el libro es
 * inventado: ninguna viene de un examen.
 *
 * El libro: octubre trae tres fuentes (Salario 100000, Clases
 * 30000, Ventas 12000; entraron 142000) y tres salidas por
 * categoría (Casa 80000, Alimentos 25000, Transporte 6000).
 * Septiembre trae una sola fuente. Carlos debe 5000.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion, classifyBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function fixture(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = {
    lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
      line({ id: "cla", kind: "income-variable" as LineKind, concept: "Clases", amountMinor: 30000, bookedOn: "2026-10-12" }),
      line({ id: "ven", kind: "income-variable" as LineKind, concept: "Ventas", amountMinor: 12000, bookedOn: "2026-10-18" }),
      line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-10-01" }),
      line({ id: "des", kind: "expense-variable" as LineKind, concept: "Despensa", amountMinor: 25000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-10-09" }),
      line({ id: "gas", kind: "expense-variable" as LineKind, concept: "Gasolina", amountMinor: 6000, categoryId: "f-transporte", subId: "f.transporte.gasolina", bookedOn: "2026-10-11" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "sal0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-09-05", monthKey: PREV }),
      line({ id: "ren0", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-09-01", monthKey: PREV }),
    ],
  };
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 5000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger.settings.display = "USD";
  return ledger;
}

function fixtureSinIngreso(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = {
    lines: [
      line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-10-01" }),
      line({ id: "des", kind: "expense-variable" as LineKind, concept: "Despensa", amountMinor: 25000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-10-09" }),
    ],
  };
  ledger.settings.display = "USD";
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}

describe("ranking ampliado · las fuentes de ingreso", () => {
  const libro = fixture();
  it("la fuente que más aportó, agregada por concepto", () => {
    const r = ask(libro, "¿Qué fuente de ingreso me aportó más este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.deepEqual(r.pieces.map((x) => x.minor), [100000, 30000, 12000]);
    assert.equal(r.pieces[0].label, "Salario");
    assert.ok(r.verdict.includes("Salario"), r.verdict);
  });
  it("la fuente que menos aportó se nombra en el veredicto", () => {
    const r = ask(libro, "¿Cuál de mis fuentes de ingreso aportó menos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.ok(r.verdict.includes("Ventas"), r.verdict);
    assert.ok(r.verdict.includes("$120.00"), r.verdict);
  });
  it("el orden entero sale en piezas cuando se pide ordenar", () => {
    const r = ask(libro, "Ordena mis fuentes de ingreso por lo que aportaron");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.deepEqual(r.pieces.map((x) => x.label), ["Salario", "Clases", "Ventas"]);
  });
  it("con una sola fuente en el período, se declara", () => {
    const r = ask(libro, "¿Qué fuente de ingreso me aportó más el mes pasado?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.ok(r.verdict.includes("solo tienes una fuente"), r.verdict);
  });
  it("en inglés: which income source brought in the most", () => {
    const r = ask(libro, "Which income source brought in the most this month?", "en");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.ok(r.verdict.includes("Salario"), r.verdict);
  });
});

describe("ranking ampliado · el peso de las salidas", () => {
  const libro = fixture();
  it("la salida que más pesó, con su porcentaje de lo que entró", () => {
    const r = ask(libro, "¿Qué salidas pesaron más contra lo que entró este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.equal(r.pieces[0].minor, 80000);
    assert.ok(r.verdict.includes("56%"), r.verdict);
    assert.ok(r.verdict.includes("$1,420.00"), r.verdict);
  });
  it("la forma corta: qué gasto pesa más contra mi ingreso", () => {
    const r = ask(libro, "¿Qué gasto pesa más contra mi ingreso?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.equal(r.pieces[0].minor, 80000);
  });
  it("en inglés: which outflows weighed most", () => {
    const r = ask(libro, "Which outflows weighed most against what came in?", "en");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.equal(r.pieces[0].minor, 80000);
    assert.ok(r.verdict.includes("56%"), r.verdict);
  });
  it("sin ingreso anotado, el peso se declara imposible y no se inventa", () => {
    const r = ask(fixtureSinIngreso(), "¿Qué salidas pesaron más contra lo que entró este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.ok(r.verdict.includes("no entró nada anotado"), r.verdict);
    assert.ok(!r.verdict.includes("%"), r.verdict);
    assert.equal(r.pieces[0].minor, 80000);
  });
  // ACTA DEL PUERTO A CANON (1.3.503): el banco de la línea del
  // banco probó la rama con un libro de banco real y la categoría
  // mayor no resolvía nombre en el namer — el veredicto salió con
  // el nombre en blanco («fue : $…»). La casa ya tenía la ley
  // (catLabel: «Sin categoría», jamás en blanco); la rama del peso
  // y el respaldo de la fuente la usan desde el puerto.
  it("la categoría que no resuelve nombre se nombra «Sin categoría», jamás en blanco", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.months[KEY] = {
      lines: [
        line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
        line({ id: "fan", kind: "expense-variable" as LineKind, concept: "Varios", amountMinor: 90000, categoryId: "f-fantasma", bookedOn: "2026-10-07" }),
      ],
    };
    ledger.settings.display = "USD";
    const r = ask(ledger, "¿Qué salidas pesaron más contra lo que entró este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.ok(r.verdict.includes("Sin categoría"), r.verdict);
    assert.ok(!r.verdict.includes("fue :"), r.verdict);
    assert.equal(r.pieces[0].label, "Sin categoría");
  });
});

describe("ranking ampliado · el costo sobre lo conocido", () => {
  const libro = fixture();
  it("la línea suelta sigue siendo de extremos", () => {
    const r = ask(libro, "¿Cuál fue mi ingreso más grande?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "extremos");
  });
  it("la suma por filtro sigue siendo de historia", () => {
    const r = ask(libro, "¿Cuánto gasté en comida este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
  });
  it("el ranking viejo de personas no se mueve", () => {
    const r = ask(libro, "¿Quién me debe más?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.equal(r.pieces[0].label, "Carlos");
    assert.equal(r.pieces[0].minor, 5000);
  });
  it("el clasificador etiqueta lo nuevo como ranking y no reetiqueta lo viejo", () => {
    assert.equal(classifyBankQuestion("¿Qué fuente de ingreso me aportó más este mes?").family, "ranking");
    assert.equal(classifyBankQuestion("¿Qué salidas pesaron más contra lo que entró?").family, "ranking");
    assert.equal(classifyBankQuestion("¿Cuál fue mi ingreso más grande?").family, "extremos");
    assert.equal(classifyBankQuestion("¿Cuánto gasté en comida este mes?").family, "historia");
  });
});

describe("ranking ampliado · la cura de la errata y las dos cercas", () => {
  const libro = fixture();
  it("las erratas sobre «fuentes» se restauran y responden ranking", () => {
    for (const q of ["¿Cuál de mis fuetes de ingreso aportó menos?", "¿Cuál de mis feuntes de ingreso aportó menos?"]) {
      const r = ask(libro, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "ranking", q);
      assert.ok(r.verdict.includes("Ventas"), `${q} → ${r.verdict}`);
    }
  });
  it("la forma inglesa del menos, tal cual, nombra a la menor", () => {
    const r = ask(libro, "Which of my income sources brought in the least?", "en");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.ok(r.verdict.includes("Ventas"), r.verdict);
    assert.ok(r.verdict.includes("least"), r.verdict);
    assert.equal(classifyBankQuestion("Which of my income sources brought in the least?").family, "ranking");
  });
  it("las erratas sobre «sources» se restauran y responden ranking", () => {
    for (const q of ["Which of my income souces brought in the least?", "Which of my income suorces brought in the least?", "Which of my income sourses brought in the least?"]) {
      const r = ask(libro, q, "en");
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "ranking", q);
      assert.ok(r.verdict.includes("Ventas"), `${q} → ${r.verdict}`);
    }
    for (const q of ["Rank my income souces by what they brought in", "Rank my income suorces by what they brought in", "Rank my income sourses by what they brought in"]) {
      const r = ask(libro, q, "en");
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "ranking", q);
      assert.deepEqual(r.pieces.map((x) => x.label), ["Salario", "Clases", "Ventas"], q);
    }
  });
  it("el segundo apoyo: ingreso con aportó o trajo, sin la palabra fuente", () => {
    const r1 = ask(libro, "¿Qué ingreso me aportó más este mes?");
    assert.equal(r1.kind, "answer");
    if (r1.kind === "answer") {
      assert.equal(r1.family, "ranking");
      assert.deepEqual(r1.pieces.map((x) => x.minor), [100000, 30000, 12000]);
    }
    const r2 = ask(libro, "¿Cuál ingreso trajo menos este mes?");
    assert.equal(r2.kind, "answer");
    if (r2.kind === "answer") {
      assert.equal(r2.family, "ranking");
      assert.ok(r2.verdict.includes("Ventas"), r2.verdict);
    }
    assert.equal(classifyBankQuestion("¿Qué ingreso me aportó más este mes?").family, "ranking");
  });
  it("CERCA 1 · «mi gasto más fuerte» no se vuelve ranking de fuentes", () => {
    const r = ask(libro, "¿Cuál fue mi gasto más fuerte?");
    assert.notEqual(r.kind === "answer" ? r.family : null, "ranking");
    assert.equal(classifyBankQuestion("¿Cuál fue mi gasto más fuerte?").family, null);
  });
  it("CERCA 2 · el ingreso más grande sigue en extremos y cuánto aportó X no entra a ranking", () => {
    const r = ask(libro, "El ingreso más grande, ¿cuál fue?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "extremos");
    const r2 = ask(libro, "¿Cuánto aportó el salario este mes?");
    assert.notEqual(r2.kind === "answer" ? r2.family : null, "ranking");
    assert.notEqual(classifyBankQuestion("¿Cuánto aportó el salario este mes?").family, "ranking");
  });
});
