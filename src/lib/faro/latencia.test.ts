/* LA LATENCIA (el instrumento, paso 5) — mide antes de optimizar.
 * Protocolo honesto: una ronda de calentamiento que se descarta,
 * cinco rondas medidas, performance.now() por pregunta, y los
 * percentiles por CLASE de pregunta — las que aciertan (casan con
 * una familia) y las que fallan (recorren la cascada entera hasta
 * el silencio) por separado, porque en una cascada secuencial el
 * fallo paga el costo completo y el promedio lo escondería.
 * Los números son de este entorno (node en la VM de trabajo): sirven
 * para comparar clases entre sí, NO son los milisegundos del
 * teléfono de nadie. La medición en el dispositivo queda como paso
 * de canon si estos números la piden. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitial, makeNamer } from "./defaults.ts";
import { answerBankQuestion } from "./ask2.ts";
import { generateCases } from "./gramatica.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function libro(meses: number): LedgerState {
  const l = createInitial("es", "oscuro");
  const keys: string[] = [];
  let y = 2026, m = 10;
  for (let i = 0; i < meses; i++) { keys.unshift(`${y}-${String(m).padStart(2, "0")}`); m--; if (m === 0) { m = 12; y--; } }
  for (const mk of keys) {
    l.months[mk] = { lines: [
      line({ id: `sal-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
      line({ id: `ren-${mk}`, kind: "expense-fixed", concept: "Renta", amountMinor: 45000, categoryId: "f-casa", recurring: true, bookedOn: `${mk}-01`, monthKey: mk }),
      line({ id: `sup-${mk}`, kind: "expense-fixed", concept: "Súper", amountMinor: 25000, categoryId: "f-alimentos", bookedOn: `${mk}-10`, monthKey: mk }),
      line({ id: `gas-${mk}`, kind: "expense-fixed", concept: "Gasolina", amountMinor: 12000, categoryId: "f-transporte", bookedOn: `${mk}-15`, monthKey: mk }),
      line({ id: `int-${mk}`, kind: "expense-fixed", concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", bookedOn: `${mk}-28`, monthKey: mk, nextDue: mk === KEY ? "2026-10-28" : "" }),
    ] };
  }
  l.settings.display = "USD";
  return l;
}

function ctx(ledger: LedgerState, lang: "es" | "en"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}

const FALLOS: Array<[string, "es" | "en"]> = [
  ["¿Debería invertir mi dinero en la bolsa?", "es"],
  ["¿Cuál es el clima de hoy?", "es"],
  ["¿Cuánto vale mi casa?", "es"],
  ["¿Qué opinas de mi situación financiera?", "es"],
  ["¿Cómo va el país?", "es"],
  ["¿Quién ganó el partido ayer?", "es"],
  ["¿Cuánto cuesta un carro nuevo?", "es"],
  ["¿Me conviene pedir un préstamo?", "es"],
  ["¿Qué es la inflación?", "es"],
  ["¿Cuántos años tengo?", "es"],
  ["Should I invest in crypto?", "en"],
  ["What is the weather today?", "en"],
  ["How much is my car worth?", "en"],
  ["What do you think about my finances?", "en"],
  ["Who won the game last night?", "en"],
  ["What is a good interest rate?", "en"],
  ["Should I buy a house?", "en"],
  ["How tall is the president?", "en"],
  ["What is the meaning of life?", "en"],
  ["Do you like pizza?", "en"],
];

function pct(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function bench(book: LedgerState, preguntas: Array<{ q: string; lang: "es" | "en" }>): { p50: number; p95: number; max: number } {
  const namer = makeNamer(book.structure, "es");
  const run = (q: string, lang: "es" | "en") => answerBankQuestion(book, KEY, lang, makeNamer(book.structure, lang), q, ctx(book, lang), TODAY);
  for (const p of preguntas) run(p.q, p.lang); // calentamiento (se descarta)
  const times: number[] = [];
  for (let round = 0; round < 5; round++) {
    for (const p of preguntas) {
      const t0 = performance.now();
      run(p.q, p.lang);
      times.push(performance.now() - t0);
    }
  }
  void namer;
  times.sort((a, b) => a - b);
  return { p50: pct(times, 50), p95: pct(times, 95), max: times[times.length - 1] };
}

describe("latencia · aciertos y fallos por separado", () => {
  it("mide p50/p95 por clase y por tamaño de libro", () => {
    const aciertos = generateCases().map((c) => ({ q: c.q, lang: c.lang }));
    const fallos = FALLOS.map(([q, lang]) => ({ q, lang }));
    for (const meses of [3, 24]) {
      const book = libro(meses);
      const a = bench(book, aciertos);
      const f = bench(book, fallos);
      console.log(`LATENCIA libro de ${meses} meses — aciertos (${aciertos.length} preguntas ×5): p50 ${a.p50.toFixed(2)} ms, p95 ${a.p95.toFixed(2)} ms, máx ${a.max.toFixed(2)} ms`);
      console.log(`LATENCIA libro de ${meses} meses — fallos (${fallos.length} preguntas ×5): p50 ${f.p50.toFixed(2)} ms, p95 ${f.p95.toFixed(2)} ms, máx ${f.max.toFixed(2)} ms`);
    }
    assert.ok(aciertos.length >= 100);
  });
});
