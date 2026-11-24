/* EL GENERADOR (el instrumento, paso 2) — corre la gramática del
 * espacio de preguntas contra un libro fijo y MIDE: cuántas
 * preguntas generadas responde su familia esperada (interpretación
 * correcta), cuántas responde OTRA familia (el vecino — el fallo
 * peligroso) y cuántas caen en silencio. Los desacuerdos no son
 * fallos de esta prueba: son la agenda que el instrumento produce.
 * La prueba cerca solo que la medición corrió completa. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitial, makeNamer } from "./defaults.ts";
import { answerBankQuestion, classifyBankQuestion } from "./ask2.ts";
import { generateCases, type GenCase } from "./gramatica.ts";
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

function libroGenerador(): LedgerState {
  const l = createInitial("es", "oscuro");
  const months: Record<string, Line[]> = {};
  for (const mk of ["2026-08", "2026-09", KEY]) {
    months[mk] = [
      line({ id: `sal-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
      line({ id: `ren-${mk}`, kind: "expense-fixed", concept: "Renta", amountMinor: 45000, categoryId: "f-casa", recurring: true, bookedOn: `${mk}-01`, monthKey: mk }),
      line({ id: `sup-${mk}`, kind: "expense-fixed", concept: "Súper", amountMinor: 25000, categoryId: "f-alimentos", bookedOn: `${mk}-10`, monthKey: mk }),
      line({ id: `gas-${mk}`, kind: "expense-fixed", concept: "Gasolina", amountMinor: 12000, categoryId: "f-transporte", bookedOn: `${mk}-15`, monthKey: mk }),
      line({ id: `int-${mk}`, kind: "expense-fixed", concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", bookedOn: `${mk}-28`, monthKey: mk, nextDue: mk === KEY ? "2026-10-28" : "" }),
    ];
  }
  months[KEY].push(line({ id: "sup-x", kind: "expense-fixed", concept: "Súper", amountMinor: 9000, categoryId: "f-alimentos", bookedOn: "2026-10-14" }));
  for (const [mk, lines] of Object.entries(months)) l.months[mk] = { lines };
  l.settings.display = "USD";
  return l;
}

function ctx(ledger: LedgerState, lang: "es" | "en"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}

type Outcome = "ok" | "vecino" | "silencio";
function run(book: LedgerState, cs: GenCase): { outcome: Outcome; got: string } {
  const r = answerBankQuestion(book, KEY, cs.lang, makeNamer(book.structure, cs.lang), cs.q, ctx(book, cs.lang), TODAY);
  if (r.kind !== "answer") return { outcome: "silencio", got: r.kind };
  return r.family === cs.familia ? { outcome: "ok", got: r.family } : { outcome: "vecino", got: r.family };
}

describe("generador · la gramática contra el motor", () => {
  it("mide interpretación, vecinos y silencios por cruce", () => {
    const book = libroGenerador();
    const cases = generateCases();
    assert.ok(cases.length >= 100, `casos generados: ${cases.length}`);
    const tally = new Map<string, { ok: number; vecino: number; silencio: number }>();
    const misses: string[] = [];
    const bump = (key: string, o: Outcome) => {
      const t = tally.get(key) ?? { ok: 0, vecino: 0, silencio: 0 };
      t[o]++;
      tally.set(key, t);
    };
    let ok = 0, vecino = 0, silencio = 0;
    for (const cs of cases) {
      const { outcome, got } = run(book, cs);
      if (outcome === "ok") ok++;
      else if (outcome === "vecino") { vecino++; misses.push(`VECINO [${cs.operacion}|${cs.tiempo}|${cs.lang}] «${cs.q}» → ${got} (esperada ${cs.familia})`); }
      else { silencio++; misses.push(`SILENCIO [${cs.operacion}|${cs.tiempo}|${cs.lang}] «${cs.q}» (esperada ${cs.familia})`); }
      bump(`op:${cs.operacion}`, outcome);
      bump(`tiempo:${cs.tiempo}`, outcome);
      bump(`lang:${cs.lang}`, outcome);
      // La puerta, medida aparte: ¿clasifica a la familia esperada?
      const door = classifyBankQuestion(cs.q).family;
      bump(`puerta:${door === cs.familia ? "ok" : "otra"}`, outcome === "ok" ? "ok" : outcome === "vecino" ? "vecino" : "silencio");
    }
    const n = cases.length;
    console.log(`GENERADOR: ${n} casos — interpretación correcta ${ok} (${Math.round((ok / n) * 100)}%), vecinos ${vecino}, silencios ${silencio}`);
    for (const [k, t] of [...tally.entries()].sort()) {
      const tot = t.ok + t.vecino + t.silencio;
      console.log(`  ${k}: ${t.ok}/${tot} ok, ${t.vecino} vecinos, ${t.silencio} silencios`);
    }
    console.log(`DESACUERDOS (${misses.length}):`);
    for (const m of misses) console.log(`  ${m}`);
  });
});
