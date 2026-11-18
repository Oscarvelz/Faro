/**
 * FARO — OBS-A7-1: APARTAR NO ES SALIR (adjudicación de Oscar, 2026-11-18).
 *
 * La observación nació en la ola 7 del frente Asesor (espécimen T1d: un
 * mes de SOLO apartado leía «Ya salió C$5,000.00 este mes») y la ola 10
 * asentó su segundo espécimen (U2: gasto cero + apartado C$6,000 → la
 * nota simple de Esencial leía «C$200.00 al día»). Absuelta dos veces
 * bajo la partición de verbos de BR5-2, Oscar la adjudicó el 2026-11-18:
 * en ninguna frase descriptiva lo apartado cuenta como «salió» ni como
 * gasto por día, porque ese dinero sigue siendo de la persona; la suma
 * gasto+apartado sobrevive SOLO como aritmética interna del motor del
 * Patrón en Completo (perDay / coverDays — maquinaria, no afirmación).
 * Donde una frase dice que la persona gastó o que algo «ya salió», la
 * frase se parte en su verdad: lo gastado como gasto, lo apartado como
 * apartado, y con gasto cero no se imprime cifra de gasto por día.
 *
 * Esta cerca fija los dos especímenes y cada rama curada (la nota sin
 * cobertura, la nota lineal de Esencial, la rama de sobregasto de
 * Ritmo), y vigila que la maquinaria del motor quede intacta.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readCoach } from "./coach.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { Mode } from "./mode.ts";
import type { LedgerState, Line } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KEY = "2026-11";
const TODAY = new Date(2026, 10, 16, 12);

let seq = 0;
const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }, key: string): Line => {
  seq += 1;
  const id = `l${seq}`;
  return {
    id, seriesId: id, monthKey: key, concept: "", currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
    icon: "", history: [], ...partial,
  } as Line;
};
const book = (mode: Mode, months: Record<string, Line[]>, lang: "es" | "en" = "es"): LedgerState => {
  const b = createInitial(lang, "claro");
  b.settings.mode = mode;
  for (const [k, lines] of Object.entries(months)) b.months[k] = { lines };
  return b;
};
const coachAt = (b: LedgerState, key: string, lang: "es" | "en" = "es") =>
  readCoach(b, key, lang, makeNamer(b.structure, lang), TODAY);
const income = (key: string, minor = 3_000_000) => line({ kind: "income-fixed", concept: "Salario", amountMinor: minor }, key);
const gasto = (key: string, minor: number) => line({ kind: "expense-variable", concept: "Mercado", amountMinor: minor }, key);
const apartado = (key: string, minor: number) =>
  line({ kind: "expense-fixed", concept: "Apartado a Meta", amountMinor: minor, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, key);

describe("apartar · espécimen 1 (T1d): un mes de SOLO apartado no «salió»", () => {
  it("presente: la nota nombra el apartado, no una salida", () => {
    const b = book("esencial", { [KEY]: [apartado(KEY, 500_000)] });
    assert.equal(coachAt(b, KEY).paceNote,
      "Apartaste C$5,000.00 este mes; anota el ingreso para ver tu ritmo.");
  });
  it("pasado: la misma verdad en pasado", () => {
    const b = book("esencial", { "2026-10": [apartado("2026-10", 500_000)] });
    assert.equal(coachAt(b, "2026-10").paceNote,
      "Apartaste C$5,000.00 en este mes, pero no hay ingreso anotado: no hay ritmo que ver.");
  });
  it("EN: «set aside», jamás «has gone out»", () => {
    const b = book("esencial", { [KEY]: [apartado(KEY, 500_000)] }, "en");
    const note = coachAt(b, KEY, "en").paceNote;
    assert.equal(note, "You set aside C$5,000.00 this month; record the income to see your pace.");
    assert.ok(!note.includes("gone out"));
  });
  it("mixto sin ingreso: la salida se parte — salió el gasto, se apartó el apartado", () => {
    const b = book("esencial", { [KEY]: [gasto(KEY, 1_000_000), apartado(KEY, 500_000)] });
    assert.equal(coachAt(b, KEY).paceNote,
      "Ya salió C$10,000.00 y apartaste C$5,000.00 este mes; anota el ingreso para ver tu ritmo.");
  });
  it("gasto puro sin ingreso: la frase histórica queda byte a byte", () => {
    const b = book("esencial", { [KEY]: [gasto(KEY, 1_500_000)] });
    assert.equal(coachAt(b, KEY).paceNote,
      "Ya salió C$15,000.00 este mes; anota el ingreso para ver tu ritmo.");
  });
  it("futuro con solo apartado: el verbo de registro sobre el total no se toca", () => {
    const b = book("esencial", { "2026-12": [apartado("2026-12", 1_500_000)] });
    assert.equal(coachAt(b, "2026-12").paceNote,
      "Ya anotaste C$15,000.00 para este mes; anota el ingreso para ver su ritmo.");
  });
});

describe("apartar · espécimen 2 (U2): gasto cero no imprime cifra de gasto por día", () => {
  it("Esencial, ingreso + apartado C$6,000: sin «al día», con el apartado nombrado", () => {
    const b = book("esencial", { [KEY]: [income(KEY), apartado(KEY, 600_000)] });
    const c = coachAt(b, KEY);
    assert.equal(c.paceNote,
      "No gastaste: apartaste C$6,000.00. Contando lo que apartas, lo que entra te alcanza para 150 días: el mes completo y 120 más.");
    assert.ok(!c.paceNote.includes("al día"), "ninguna cifra de gasto por día con gasto cero");
    assert.equal(c.perDay, 20000, "la maquinaria del motor NO se toca: perDay sigue sumando (disponibilidad)");
  });
  it("mixto con cobertura: el promedio es del gasto solo y el apartado se nombra en la cobertura", () => {
    const b = book("esencial", { [KEY]: [income(KEY), gasto(KEY, 900_000), apartado(KEY, 600_000)] });
    const c = coachAt(b, KEY);
    assert.equal(c.paceNote,
      "Gastas en promedio C$300.00 al día. Contando lo que apartas, lo que entra te alcanza para 60 días: el mes completo y 30 más.");
    assert.equal(c.perDay, 50000, "perDay (motor) intacto: (9,000 + 6,000) / 30");
  });
  it("gasto puro con cobertura: la frase histórica queda byte a byte", () => {
    const b = book("esencial", { [KEY]: [income(KEY), gasto(KEY, 900_000)] });
    assert.equal(coachAt(b, KEY).paceNote,
      "Gastas en promedio C$300.00 al día. A ese ritmo, lo que entra te alcanza para 100 días: el mes completo y 70 más.");
  });
});

describe("apartar · la rama de sobregasto de Ritmo parte la salida", () => {
  it("apartado solo por encima del ingreso: ni «gastas», ni «salió», ni cifra por día", () => {
    const b = book("ritmo", { [KEY]: [income(KEY, 500_000), apartado(KEY, 600_000)] });
    const note = coachAt(b, KEY).paceNote;
    assert.equal(note, "Apartaste C$6,000.00 en 16 días y faltan C$1,000.00 para cerrar el mes.");
    assert.ok(!note.includes("Ya salió") && !note.includes("al día"));
  });
  it("gasto puro en sobregasto: la frase histórica queda byte a byte", () => {
    const b = book("ritmo", { [KEY]: [income(KEY, 500_000), gasto(KEY, 600_000)] });
    assert.equal(coachAt(b, KEY).paceNote,
      "Gastas en promedio C$375.00 al día. Ya salió C$6,000.00 y faltan C$1,000.00 para cerrar el mes.");
  });
});

describe("apartar · las frases condenadas no vuelven (fuente)", () => {
  it("coach.ts: ningún «salió» se compone con la suma ni con el total `out`", () => {
    const src = SRC("./coach.ts");
    assert.ok(!src.includes("Ya salió ${money(spend + saved)}"), "la suma ya no se titula «salió»");
    assert.ok(!src.includes("Salió ${money(out)}"), "el total ya no se titula «salió»");
    assert.ok(!src.includes("Ya salió ${money(out)}"), "el total ya no se titula «salió»");
  });
  it("engine.ts: el total del Asesor se nombra movimiento, partido en su verdad", () => {
    const src = SRC("./engine.ts");
    assert.ok(!src.includes("En total salieron"), "el apartado no viaja dentro de un «salieron»");
    assert.ok(src.includes("El mes movió"), "la composición nueva está");
  });
  it("advisor.ts: un apartado no «sale» en el peor momento", () => {
    const src = SRC("./advisor.ts");
    assert.ok(!src.includes("ahorro que salió"), "la frase condenada no vuelve");
  });
});
