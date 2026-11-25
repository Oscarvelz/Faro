/* LA RAMA DEL AGENTE · E4 — los verbos de orden: especímenes.
   Archivar, corregir (monto y fecha) y buscar («¿dónde está…?»):
   la orden nombra su línea con monto y fecha en el eco, y buscar no
   toca nada — solo dice dónde vive cada cosa. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeNamer } from "./defaults.ts";
import { parseOrden } from "./orden.ts";
import type { Draft, LedgerState, Line, LineKind } from "./types.ts";
import { createInitial } from "./defaults.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & { id: string }): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [],
    ...partial,
  } as Line;
}

function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
      line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-28" }),
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ],
  };
  ledger.settings.display = "USD";
  const draft: Draft = {
    id: "d1", source: "text", kind: "line", raw: "zapatos 60", createdAt: "2026-10-21T10:00:00.000Z",
    day: "2026-10-21", sign: "out", amountMinor: 6000, currency: "USD", concept: "Zapatos", note: "",
  } as Draft;
  ledger.drafts = [draft];
  return ledger;
}

function orden(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return parseOrden(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, TODAY);
}

describe("orden E4 · archivar", () => {
  it("«archiva la luz» — la orden nombra la línea con su monto y su fecha", () => {
    const r = orden(fixture(), "archiva la luz");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "archivar") return;
    assert.equal(r.order.lineId, "luz");
    assert.equal(r.order.concept, "Luz");
    assert.equal(r.order.amountMinor, 4500);
    assert.ok(r.echo.includes("Archivar «Luz»"), r.echo);
    assert.ok(r.echo.includes("¿Lo hago así?"), r.echo);
  });

  it("«manda el internet a archivos» — la otra voz del mismo verbo", () => {
    const r = orden(fixture(), "manda el internet a archivos");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "archivar") return;
    assert.equal(r.order.lineId, "net");
  });

  it("archivar lo ya archivado lo dice, no lo reordena", () => {
    const ledger = fixture();
    const luz = (ledger.months[KEY]?.lines ?? []).find((l) => l.id === "luz");
    if (luz) luz.active = false;
    const r = orden(ledger, "archiva la luz");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "archivar") return;
    assert.equal(r.order.alreadyArchived, true);
    assert.ok(r.echo.includes("ya está archivado"), r.echo);
  });

  it("sin objetivo se pregunta cuál: «archiva eso»", () => {
    const r = orden(fixture(), "archiva eso");
    assert.equal(r.kind, "ask");
  });
});

describe("orden E4 · corregir", () => {
  it("el monto: «corrige la luz, no fueron 45, fueron 50» — del libro al relato", () => {
    const r = orden(fixture(), "corrige la luz, no fueron 45, fueron 50");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "corregir-monto") return;
    assert.equal(r.order.lineId, "luz");
    assert.equal(r.order.fromMinor, 4500);
    assert.equal(r.order.toMinor, 5000);
    assert.ok(r.echo.includes("$45.00 → $50.00"), r.echo);
  });

  it("la fecha: «mueve la luz al día 15»", () => {
    const r = orden(fixture(), "mueve la luz al día 15");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "corregir-fecha") return;
    assert.equal(r.order.fromDate, "2026-09-28");
    assert.equal(r.order.toDate, "2026-09-15");
  });
});

describe("orden E4 · buscar (¿dónde está…?)", () => {
  it("una línea: dice su mes, su monto y su fecha de asiento", () => {
    const r = orden(fixture(), "¿dónde está la luz?");
    assert.equal(r.kind, "found", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "found") return;
    assert.equal(r.hits[0].where, "linea");
    assert.ok(r.text.includes("$45.00"), r.text);
  });

  it("un borrador: dice que vive en la Bandeja, sin asentar", () => {
    const r = orden(fixture(), "¿dónde están los zapatos?");
    assert.equal(r.kind, "found", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "found") return;
    assert.ok(r.hits.some((h) => h.where === "borrador"), r.text);
    assert.ok(r.text.includes("Bandeja"), r.text);
  });

  it("la estructura: «¿dónde está Servicios?» nombra su categoría madre", () => {
    const r = orden(fixture(), "¿dónde está servicios?");
    assert.equal(r.kind, "found", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "found") return;
    assert.ok(r.hits.some((h) => h.where === "estructura"), r.text);
  });

  it("lo que no existe se dice entero: ni historial, ni Bandeja, ni estructura", () => {
    const r = orden(fixture(), "¿dónde está el yate?");
    assert.equal(r.kind, "found", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "found") return;
    assert.equal(r.hits.length, 0);
    assert.ok(r.text.includes("No encuentro"), r.text);
  });

  it("el espejo en inglés: «where is the internet?»", () => {
    const r = orden(fixture(), "where is the internet?", "en");
    assert.equal(r.kind, "found", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "found") return;
    assert.ok(r.hits.some((h) => h.where === "linea"), r.text);
  });
});

describe("orden E4 · cambiar ajustes (orden de Oscar, 2026-11-23)", () => {
  it("la moneda: «cambia la moneda a córdobas» — borrador con su antes → después", () => {
    const r = orden(fixture(), "cambia la moneda a córdobas");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "ajuste") return;
    assert.equal(r.order.setting, "display");
    assert.equal(r.order.value, "NIO");
    assert.ok(r.echo.includes("dólares → córdobas"), r.echo);
    assert.ok(r.echo.includes("¿Lo hago así?"), r.echo);
  });

  it("el modo, en voseo: «poné el modo esencial»", () => {
    const r = orden(fixture(), "poné el modo esencial");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "ajuste") return;
    assert.equal(r.order.setting, "mode");
    assert.equal(r.order.value, "esencial");
  });

  it("la tasa: «cambia la tasa a 36.80» — el borrador lleva la tasa en su forma máquina", () => {
    const r = orden(fixture(), "cambia la tasa a 36.80");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "ajuste") return;
    assert.equal(r.order.setting, "rate");
    assert.equal(r.order.value, 368000);
    assert.ok(r.echo.includes("36.6243"), r.echo);
    assert.ok(r.echo.includes("36.8000"), r.echo);
  });

  it("los avisos: «apaga los avisos» — el eco nombra el ajuste entero, no la palabra suelta", () => {
    const r = orden(fixture(), "apaga los avisos");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "ajuste") return;
    assert.equal(r.order.setting, "dueAlerts");
    assert.equal(r.order.value, false);
    assert.ok(r.echo.includes("avisos de pagos dentro de la app"), r.echo);
  });

  it("encender lo apagado: con los avisos en falso, «encende los avisos» los deja en verdadero", () => {
    const ledger = fixture();
    ledger.settings.dueAlerts = false;
    const r = orden(ledger, "encende los avisos");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "ajuste") return;
    assert.equal(r.order.setting, "dueAlerts");
    assert.equal(r.order.value, true);
  });

  it("ya está así no es una orden: «cambia la moneda a dólares» con la vista ya en dólares", () => {
    const r = orden(fixture(), "cambia la moneda a dólares");
    assert.equal(r.kind, "note", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "note") return;
    assert.ok(r.text.includes("ya está así"), r.text);
  });

  it("fuera del conjunto se dice, con la lista: «cambia el tema a oscuro»", () => {
    const r = orden(fixture(), "cambia el tema a oscuro");
    assert.equal(r.kind, "note", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "note") return;
    assert.ok(r.text.includes("no lo sé cambiar por aquí"), r.text);
    assert.ok(r.text.includes("la moneda de vista"), r.text);
  });

  it("sin valor se pregunta: «cambia la moneda» a secas", () => {
    const r = orden(fixture(), "cambia la moneda");
    assert.equal(r.kind, "note", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "note") return;
    assert.ok(r.text.includes("¿A cuál moneda"), r.text);
  });

  it("no roba las correcciones de líneas: «cambia la luz a 50» sigue siendo corregir la luz", () => {
    const r = orden(fixture(), "cambia la luz a 50");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "corregir-monto") return;
    assert.equal(r.order.lineId, "luz");
    assert.equal(r.order.toMinor, 5000);
  });

  it("el espejo en inglés: «change the currency to cordobas»", () => {
    const r = orden(fixture(), "change the currency to cordobas", "en");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "ajuste") return;
    assert.equal(r.order.setting, "display");
    assert.equal(r.order.value, "NIO");
  });
});

describe("orden E4 · la pureza", () => {
  it("parseOrden no toca el libro", () => {
    const ledger = fixture();
    const before = JSON.stringify(ledger.months);
    orden(ledger, "archiva la luz");
    orden(ledger, "corrige la luz, no fueron 45, fueron 50");
    orden(ledger, "¿dónde está la luz?");
    assert.equal(JSON.stringify(ledger.months), before);
  });
});

describe("orden · la campaña de mutaciones de la rama (2026-11-25)", () => {
  it("el verbo de archivar con errata se oye: «arciva la luz», «archiba la luz»", () => {
    for (const raw of ["arciva la luz", "archiba la luz"]) {
      const r = orden(fixture(), raw);
      assert.equal(r.kind, "order", raw);
      if (r.kind !== "order" || r.order.op !== "archivar") continue;
      assert.equal(r.order.lineId, "luz");
    }
  });

  it("«apga los avisos»: el diccionario manda sobre el bolsillo «Súper Paga» — la orden es apagar los avisos", () => {
    const r = orden(fixture(), "apga los avisos");
    assert.equal(r.kind, "order", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "order" || r.order.op !== "ajuste") return;
    assert.equal(r.order.setting, "dueAlerts");
    assert.equal(r.order.value, false);
  });

  it("la cortesía no tapa el blanco: «¿dónde están los zapatos?, por favor» encuentra el borrador", () => {
    const r = orden(fixture(), "¿dónde están los zapatos?, por favor");
    assert.equal(r.kind, "found", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "found") return;
    assert.ok(r.hits.some((h) => h.where === "borrador"), r.text);
  });
});
