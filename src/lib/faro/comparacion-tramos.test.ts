import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

/* EL FALLO DE LOS MESES (Oscar, 2026-11-26, a propuesta de Hark):
 * la comparación de este mes contra el pasado es A IGUAL TRAMO —
 * del 1 al día de hoy contra los mismos días del mes pasado — y el
 * mes pasado completo va en la nota. Contra el mes completo, a
 * mitad de mes siempre parecía «gastando menos» por construcción.
 * Libro: octubre 16000 en el tramo (10000 el 5, 6000 el 19);
 * septiembre 16000 en el tramo (8000 el 6, 8000 el 20) y 7000 el
 * 27: el mes completo suma 23000. Hoy: 2026-10-22. */

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

function bookA(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const ali = { categoryId: "f-alimentos", subId: "f.alimentos.despensa" };
  ledger.months[KEY] = {
    lines: [
      line({ id: "m1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 10000, bookedOn: "2026-10-05", ...ali }),
      line({ id: "m2", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 6000, bookedOn: "2026-10-19", ...ali }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "m0a", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-09-06", monthKey: PREV, ...ali }),
      line({ id: "m0b", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-09-20", monthKey: PREV, ...ali }),
      line({ id: "m0c", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 7000, bookedOn: "2026-09-27", monthKey: PREV, ...ali }),
    ],
  };
  ledger.settings.display = "USD";
  return ledger;
}

function bookB(): LedgerState {
  const ledger = bookA();
  ledger.months[KEY].lines.push(line({ id: "r1", kind: "purchase" as LineKind, concept: "Camisa", amountMinor: 4000, bookedOn: "2026-10-10", categoryId: "ropa" }));
  ledger.months[PREV].lines.push(
    line({ id: "r0a", kind: "purchase" as LineKind, concept: "Camisa", amountMinor: 3000, bookedOn: "2026-09-15", monthKey: PREV, categoryId: "ropa" }),
    line({ id: "r0b", kind: "purchase" as LineKind, concept: "Pantalón", amountMinor: 9000, bookedOn: "2026-09-28", monthKey: PREV, categoryId: "ropa" }),
  );
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es", today = TODAY): ParseCtx {
  return { ledger, lang, today, display: "USD", makeId: () => "q1", now: `${today}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es", today = TODAY) {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang, today), today);
}

describe("el fallo de los meses · la comparación a igual tramo", () => {
  it("T1: «¿gasté más este mes o el pasado?» empata a igual tramo y el completo va en la nota", () => {
    const r = ask(bookA(), "¿Gasté más este mes o el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("A igual tramo (del 1 al 22 contra del 1 al 22) van parejos: $160.00 contra $160.00"), r.verdict);
    assert.deepEqual(r.pieces.map((x) => x.minor), [16000, 16000]);
    assert.ok((r.note ?? "").includes("el mes pasado completo sumó $230.00"), r.note ?? "");
  });

  it("T2: el espejo inglés dice el tramo y la nota trae el completo", () => {
    const r = ask(bookA(), "Did I spend more this month or last month?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("Over the same stretch"), r.verdict);
    assert.ok(r.verdict.includes("they're tied: $160.00 vs $160.00"), r.verdict);
    assert.ok((r.note ?? "").includes("last month in full added up to $230.00"), r.note ?? "");
  });

  it("T3: «¿gasté menos este mes que el pasado?» ya no cae en silencio", () => {
    const r = ask(bookA(), "¿Gasté menos este mes que el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("van parejos"), r.verdict);
  });

  it("T4: la diferencia pedida a secas también es a igual tramo", () => {
    const r = ask(bookA(), "¿Cuánto más gasté este mes que el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("A igual tramo"), r.verdict);
    assert.ok(r.verdict.includes("van parejos"), r.verdict);
  });

  it("T5: lo que NO es comparación no se toca: «¿cuánto gasté el mes pasado?» sigue dando el mes completo", () => {
    const r = ask(bookA(), "¿Cuánto gasté el mes pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes("$230.00"), r.verdict);
  });

  it("T6: con filtro (Ola 67) el tramo manda igual y la nota nombra el filtro", () => {
    const r = ask(bookA(), "¿Gasté más en alimentos este mes que el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("a igual tramo"), r.verdict);
    assert.deepEqual(r.pieces.map((x) => x.minor), [16000, 16000]);
    assert.ok((r.note ?? "").includes("el mes pasado completo sumó $230.00"), r.note ?? "");
  });

  it("T7: «¿he gastado mucho?» mide la pata del pasado a igual tramo (Ola 18)", () => {
    const r = ask(bookA(), "¿He gastado mucho este mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("En el mismo tramo del mes pasado (del 1 al 22) gastaste $160.00"), r.verdict);
    assert.ok((r.note ?? "").includes("el mes pasado completo sumó $230.00"), r.note ?? "");
  });

  it("T8: la exclusión también compara a igual tramo (Ola 67/74)", () => {
    const r = ask(bookB(), "¿Gasté más este mes sin los alimentos, comparado con el mes pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 240));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("a igual tramo"), r.verdict);
    assert.deepEqual(r.pieces.map((x) => x.minor), [4000, 3000]);
    assert.ok((r.note ?? "").includes("completo sumó $120.00"), r.note ?? "");
  });

  it("T9: una línea de este mes fechada después de hoy no entra en «lo que va del mes»", () => {
    const ledger = bookA();
    ledger.months[KEY].lines.push(line({ id: "futura", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 9000, bookedOn: "2026-10-28", categoryId: "f-alimentos", subId: "f.alimentos.despensa" }));
    const r = ask(ledger, "¿Gasté más este mes o el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.deepEqual(r.pieces.map((x) => x.minor), [16000, 16000]);
    assert.ok(r.verdict.includes("van parejos"), r.verdict);
  });

  it("T11: el borde de febrero — el tramo del pasado se corta en su último día y se nombra así", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.months["2026-03"] = {
      lines: [
        line({ id: "f1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 10000, bookedOn: "2026-03-05", monthKey: "2026-03" }),
        line({ id: "f2", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 9000, bookedOn: "2026-03-31", monthKey: "2026-03" }),
      ],
    };
    ledger.months["2026-02"] = {
      lines: [
        line({ id: "f0a", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-02-01", monthKey: "2026-02" }),
        line({ id: "f0b", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 7000, bookedOn: "2026-02-27", monthKey: "2026-02" }),
      ],
    };
    ledger.settings.display = "USD";
    const c: ParseCtx = { ledger, lang: "es", today: "2026-03-30", display: "USD", makeId: () => "q1", now: "2026-03-30T12:00:00.000Z" };
    const r = answerBankQuestion(ledger, "2026-03", "es", makeNamer(ledger.structure, "es"), "¿Gasté más este mes o el pasado?", c, "2026-03-30");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 240));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("del 1 al 30 contra del 1 al 28, su último día"), r.verdict);
    assert.ok(r.verdict.includes("$100.00 contra $150.00"), r.verdict);
    assert.deepEqual(r.pieces.map((x) => x.minor), [10000, 15000]);
    assert.equal(r.pieces[1].label, "Mes pasado, al día 28");
    assert.equal(r.note, null);
  });

  it("T12: el primer mes del libro no inventa un mes pasado", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.months[KEY] = {
      lines: [line({ id: "u1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 16000, bookedOn: "2026-10-05" })],
    };
    ledger.settings.display = "USD";
    const r = ask(ledger, "¿Gasté más este mes o el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("Es el primer mes de tu libro"), r.verdict);
    assert.ok(r.verdict.includes("$160.00"), r.verdict);
    assert.deepEqual(r.pieces.map((x) => x.minor), [16000]);
    const d = ask(ledger, "¿Cuánto más gasté este mes que el pasado?");
    assert.equal(d.kind, "answer", JSON.stringify(d).slice(0, 200));
    if (d.kind === "answer") assert.ok(d.verdict.includes("Es el primer mes de tu libro"), d.verdict);
  });

  it("T13: un mes pasado sin anotar (hueco) se declara, no se compara contra cero en silencio", () => {
    const ledger = bookA();
    delete ledger.months[PREV];
    ledger.months["2026-08"] = {
      lines: [line({ id: "g0", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 5000, bookedOn: "2026-08-10", monthKey: "2026-08" })],
    };
    const r = ask(ledger, "¿Gasté más este mes o el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("El mes pasado no tiene nada anotado en tu libro"), r.verdict);
    assert.deepEqual(r.pieces.map((x) => x.minor), [16000]);
  });

  it("T14: el mes pasado incompleto (el libro nació a mitad del pasado) se declara en la nota", () => {
    const ledger = createInitial("es", "oscuro");
    const ali = { categoryId: "f-alimentos", subId: "f.alimentos.despensa" };
    ledger.months[KEY] = {
      lines: [
        line({ id: "n1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 10000, bookedOn: "2026-10-05", ...ali }),
        line({ id: "n2", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 6000, bookedOn: "2026-10-19", ...ali }),
      ],
    };
    ledger.months[PREV] = {
      lines: [
        line({ id: "n0a", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-09-15", monthKey: PREV, ...ali }),
        line({ id: "n0b", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-09-20", monthKey: PREV, ...ali }),
        line({ id: "n0c", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 7000, bookedOn: "2026-09-27", monthKey: PREV, ...ali }),
      ],
    };
    ledger.settings.display = "USD";
    const r = ask(ledger, "¿Gasté más este mes o el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("van parejos"), r.verdict);
    assert.ok((r.note ?? "").includes("el mes pasado completo sumó $230.00"), r.note ?? "");
    assert.ok((r.note ?? "").includes("Tu libro empieza el día 15 del mes pasado"), r.note ?? "");
    assert.ok((r.note ?? "").includes("su tramo no está completo"), r.note ?? "");
  });

  it("T15: el mes pasado incompleto también se declara en el camino clásico (fin de mes)", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.months[KEY] = {
      lines: [line({ id: "p1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 16000, bookedOn: "2026-10-05" })],
    };
    ledger.months[PREV] = {
      lines: [
        line({ id: "p0a", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 15000, bookedOn: "2026-09-15", monthKey: PREV }),
        line({ id: "p0b", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-09-20", monthKey: PREV }),
      ],
    };
    ledger.settings.display = "USD";
    const r = ask(ledger, "¿Gasté más este mes o el pasado?", "es", "2026-10-31");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("Gastaste más el mes pasado: $160.00 contra $230.00"), r.verdict);
    assert.ok((r.note ?? "").includes("Tu libro empieza el día 15 del mes pasado"), r.note ?? "");
    assert.ok(!(r.note ?? "").includes("completo sumó"), r.note ?? "");
  });

  it("T16: si el libro nació el día 1 del mes pasado, no hay declaración de incompleto", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.months[KEY] = {
      lines: [line({ id: "d1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 16000, bookedOn: "2026-10-05" })],
    };
    ledger.months[PREV] = {
      lines: [
        line({ id: "d0a", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-09-01", monthKey: PREV }),
        line({ id: "d0b", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-09-20", monthKey: PREV }),
        line({ id: "d0c", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 7000, bookedOn: "2026-09-27", monthKey: PREV }),
      ],
    };
    ledger.settings.display = "USD";
    const r = ask(ledger, "¿Gasté más este mes o el pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(!(r.note ?? "").includes("empieza el día"), r.note ?? "");
  });

  it("T10: a fin de mes el tramo es el mes entero y la respuesta es la de siempre, sin nota", () => {
    const ledger = bookA();
    ledger.months[PREV].lines[0] = line({ id: "m0a", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 8000, bookedOn: "2026-09-01", monthKey: PREV, categoryId: "f-alimentos", subId: "f.alimentos.despensa" });
    const r = ask(ledger, "¿Gasté más este mes o el pasado?", "es", "2026-10-31");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("Gastaste más el mes pasado: $160.00 contra $230.00 (diferencia de $70.00)"), r.verdict);
    assert.equal(r.note, null);
  });
});
