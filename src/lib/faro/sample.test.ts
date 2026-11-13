import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countSampleRows, isPureSample, stripSample, withAugustSample } from "./sample.ts";
import { copyRecurring } from "./reducer.ts";
import { createInitial } from "./defaults.ts";
import type { LedgerState, Line } from "./types.ts";

/* Línea «Windows», 2026-11-13 — Oscar: «Cuando quito los datos de ejemplo, lo desactivo e
   incluso elimino la información, todavía veo información que queda en Tengo y otras
   carpetas… debería quedar como nueva.» Causa: copyRecurring acuña un id nuevo (uid) a
   cada copia arrastrada y solo conserva el seriesId; contar/quitar por id veía únicamente
   los originales de agosto. Estas pruebas fijan la quita por LINAJE (id o seriesId). */

function ownLine(): Line {
  return {
    id: "mio-1", seriesId: "mio-1", monthKey: "2026-11", kind: "income-variable",
    concept: "Mi trabajo", amountMinor: 50000, currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
    balanceCurrency: "NIO", icon: "", history: [],
  };
}

function bookWithCarriedSample(): LedgerState {
  let led = withAugustSample(createInitial("es")).ledger;
  // Los meses ruedan: las recurrentes del ejemplo se arrastran sep → oct → nov.
  for (const [from, to] of [["2026-08", "2026-09"], ["2026-09", "2026-10"], ["2026-10", "2026-11"]] as const) {
    led = copyRecurring(led, from, to).state;
  }
  // Una fila del propio usuario convive en noviembre.
  const nov = led.months["2026-11"] ?? { lines: [] };
  return { ...led, months: { ...led.months, "2026-11": { lines: [...nov.lines, ownLine()] } } };
}

const allLines = (led: LedgerState) => Object.values(led.months).flatMap((m) => m?.lines ?? []);

describe("ejemplo: la quita es por linaje, no por id", () => {
  it("el arrastre de meses deja descendientes con id anónimo y seriesId del ejemplo", () => {
    const led = bookWithCarriedSample();
    const nov = led.months["2026-11"]?.lines ?? [];
    const carried = nov.filter((l) => l.id !== "mio-1");
    assert.ok(carried.length > 0, "noviembre recibió copias del ejemplo");
    assert.ok(carried.every((l) => !l.id.startsWith("demo-ago-")), "las copias ya no llevan el id del ejemplo");
    assert.ok(carried.every((l) => l.seriesId.startsWith("demo-ago-")), "pero conservan su linaje en seriesId");
  });

  it("contar ve originales y descendientes; quitar no deja ni uno y no toca lo del usuario", () => {
    const led = bookWithCarriedSample();
    const total = allLines(led).length;
    assert.equal(countSampleRows(led), total - 1, "la cuenta promete todo lo que la quita va a quitar (menos la fila propia)");
    const clean = stripSample(led);
    const left = allLines(clean);
    assert.deepEqual(left.map((l) => l.id), ["mio-1"], "queda solo la fila del usuario: el libro, como nuevo");
    assert.equal(countSampleRows(clean), 0, "sin resto que la tarjeta vuelva a ofrecer quitar");
  });

  it("tras quitar, el arrastre a diciembre ya no resucita el ejemplo", () => {
    const clean = stripSample(bookWithCarriedSample());
    const dec = copyRecurring(clean, "2026-11", "2026-12").state;
    assert.equal(allLines(dec).filter((l) => l.seriesId.startsWith("demo-ago-")).length, 0);
  });

  it("un libro con solo descendientes NO es 'muestra pura': nada se auto-borra en silencio", () => {
    const led = bookWithCarriedSample();
    const onlyDescendants: LedgerState = { ...led, months: { "2026-11": { lines: (led.months["2026-11"]?.lines ?? []).filter((l) => l.id !== "mio-1") } } };
    assert.equal(isPureSample(onlyDescendants), false, "la auto-quita de carga sigue exigiendo la muestra exacta de agosto");
  });

  it("la muestra pura de agosto sigue reconociéndose (la puerta de carga no cambia)", () => {
    const led = withAugustSample(createInitial("es")).ledger;
    assert.equal(isPureSample(led), true);
  });
});
