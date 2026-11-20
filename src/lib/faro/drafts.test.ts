/**
 * FARO — Captura Inteligente, Ola 1: la batería del contrato Draft
 * (brief BRIEF-OLA-1 §7.2). Conversión campo por campo, el retiro exacto
 * al guardar, el rojo que no se convierte ni por llamada directa, el raw
 * intocable, el duplicado con el criterio del importador y el aprendizaje.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readAdvisor } from "./advisor.ts";
import { findRule, merchantKey } from "./bankbook.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { lentTotals, lineDebtTotal } from "./debts.ts";
import { addDrafts, commitDrafts, draftToLine, draftTotals, dropDraft, findDup, learnFromSaved, patchDraft, validateDraft, type DraftCtx } from "./drafts.ts";
import { summarize } from "./engine.ts";
import { upsertLine } from "./reducer.ts";
import { savingsStock } from "./savings.ts";
import { scanToDraft, type ScanCardLike } from "./scanadapter.ts";
import type { ScanDraft } from "./receiptparse.ts";
import type { Draft, LedgerState, Line } from "./types.ts";

const base = (): LedgerState => createInitial("es", "claro");

let seq = 0;
const mkDraft = (patch: Partial<Draft> = {}): Draft => ({
  id: `d${++seq}`, source: "photo", kind: "line", raw: "FOTO: recibo crudo", createdAt: "2026-11-19T20:00:00.000Z",
  day: "2026-11-18", sign: "out", amountMinor: 12500, currency: "USD", concept: "Publix", note: "",
  book: "expense-variable", unsure: [], missing: [], ...patch,
});
const ctx = (s: LedgerState): DraftCtx => ({ monthKey: "2026-11", structure: s.structure, lang: "es" });

describe("drafts: validateDraft deriva el rojo de los valores", () => {
  it("monto, moneda, signo y día irreal — cada uno su nombre", () => {
    assert.deepEqual(validateDraft(mkDraft()).missing, []);
    assert.deepEqual(validateDraft(mkDraft({ amountMinor: null })).missing, ["amount"]);
    assert.deepEqual(validateDraft(mkDraft({ amountMinor: 0 })).missing, ["amount"]);
    assert.deepEqual(validateDraft(mkDraft({ currency: null })).missing, ["currency"]);
    assert.deepEqual(validateDraft(mkDraft({ sign: null })).missing, ["sign"]);
    assert.deepEqual(validateDraft(mkDraft({ day: "2026-02-31" })).missing, ["day"]);
    assert.deepEqual(validateDraft(mkDraft({ day: "" })).missing, ["day"]);
  });
});

describe("drafts: la conversión reproduce la línea del escaneo", () => {
  it("gasto variable: casa validada, bookedOn en su día, mes abierto", () => {
    const s = base();
    const cat = s.structure.categories.find((c) => c.group === "variable")!;
    const sub = s.structure.categories.find((c) => c.id === cat.id)!.subs[0];
    const d = mkDraft({ cat: cat.id, sub: sub?.id ?? "" });
    const line = draftToLine(d, ctx(s))!;
    assert.equal(line.kind, "expense-variable");
    assert.equal(line.concept, "Publix");
    assert.equal(line.amountMinor, 12500);
    assert.equal(line.currency, "USD");
    assert.equal(line.categoryId, cat.id);
    assert.equal(line.subId, sub?.id ?? "");
    assert.equal(line.bookedOn, "2026-11-18");
    assert.equal(line.monthKey, "2026-11");
    assert.equal(line.recurring, false);
    assert.equal(line.active, true);
  });

  it("una casa que no es de su libro se cae, como en el save del escaneo", () => {
    const s = base();
    const line = draftToLine(mkDraft({ cat: "no-existe", sub: "tampoco" }), ctx(s))!;
    assert.equal(line.categoryId, "");
    assert.equal(line.subId, "");
  });

  it("suscripción: cadencia, próximo cobro y su marca; sin bookedOn", () => {
    const s = base();
    const d = mkDraft({ book: "subscription", cadence: "monthly", icon: "sub:netflix", concept: "Netflix" });
    const line = draftToLine(d, ctx(s))!;
    assert.equal(line.kind, "subscription");
    assert.equal(line.recurring, true);
    assert.equal(line.cadence, "monthly");
    assert.equal(line.nextDue, "2026-11-18");
    assert.equal(line.bookedOn, "");
    assert.equal(line.icon, "sub:netflix");
    const sinCad = draftToLine(mkDraft({ book: "subscription", cadence: "" }), ctx(s))!;
    assert.equal(sinCad.cadence, "monthly", "la cadencia vacía cae a mensual, como en DraftCard");
  });

  it("compra: la tienda se casa por el concepto cuando el borrador no la trae", () => {
    const s = base();
    const store = s.structure.catalog.find((c) => c.kind === "store");
    assert.ok(store, "el libro inicial trae tiendas");
    const name = store.customName || "Walmart";
    const d = mkDraft({ book: "purchase", concept: name });
    const line = draftToLine(d, ctx(s))!;
    assert.equal(line.kind, "purchase");
    if (store.customName) assert.equal(line.storeId, store.id);
  });

  it("un borrador en rojo no se convierte ni por llamada directa", () => {
    const s = base();
    assert.equal(draftToLine(mkDraft({ amountMinor: null }), ctx(s)), null);
    assert.equal(draftToLine(mkDraft({ currency: null }), ctx(s)), null);
    assert.equal(draftToLine(mkDraft({ day: "2026-13-01" }), ctx(s)), null);
  });
});

describe("drafts: las recetas de la bandeja", () => {
  it("commitDrafts crea las líneas y retira exactamente los guardados", () => {
    let s = base();
    const a = mkDraft({ concept: "Uno" });
    const b = mkDraft({ concept: "Dos" });
    const red = mkDraft({ concept: "Rojo", amountMinor: null });
    s = addDrafts(s, [a, b, red]);
    const after = commitDrafts(s, [a.id, b.id, red.id], ctx(s));
    const lines = after.months["2026-11"]!.lines;
    assert.equal(lines.length, 2);
    assert.deepEqual(after.drafts!.map((d) => d.id), [red.id], "el rojo se queda esperando; los guardados se fueron");
    const again = commitDrafts(after, [a.id], ctx(after));
    assert.equal(again.months["2026-11"]!.lines.length, 2, "sin gemelos: guardar dos veces no duplica");
  });

  it("patchDraft limpia el ámbar del campo tocado y re-deriva el rojo; raw intacto", () => {
    let s = base();
    const d = mkDraft({ amountMinor: null, unsure: ["amount", "concept"] });
    s = addDrafts(s, [d]);
    const p = patchDraft(s, d.id, { amountMinor: 9900 });
    const got = p.drafts![0]!;
    assert.equal(got.amountMinor, 9900);
    assert.deepEqual(got.unsure, ["concept"]);
    assert.deepEqual(got.missing, []);
    assert.equal(got.raw, "FOTO: recibo crudo");
    const q = patchDraft(p, d.id, { raw: "reescrito", id: "otro" } as Partial<Draft>);
    assert.equal(q.drafts![0]!.raw, "FOTO: recibo crudo", "raw no se parcha");
    assert.equal(q.drafts![0]!.id, d.id, "la identidad no se parcha");
  });

  it("dropDraft retira solo el pedido", () => {
    let s = base();
    const a = mkDraft(); const b = mkDraft();
    s = addDrafts(s, [a, b]);
    const after = dropDraft(s, a.id);
    assert.deepEqual(after.drafts!.map((d) => d.id), [b.id]);
  });

  it("draftTotals suma solo para el pie: por moneda y signo, sin nulos", () => {
    const rows = draftTotals([
      mkDraft({ amountMinor: 1000, currency: "USD", sign: "out" }),
      mkDraft({ amountMinor: 500, currency: "USD", sign: "in" }),
      mkDraft({ amountMinor: 200, currency: "NIO", sign: "out" }),
      mkDraft({ amountMinor: null, currency: "USD", sign: "out" }),
    ]);
    assert.deepEqual(rows, [
      { currency: "NIO", inMinor: 0, outMinor: 200 },
      { currency: "USD", inMinor: 500, outMinor: 1000 },
    ]);
  });
});

describe("drafts: el duplicado con el criterio del importador", () => {
  const lineOf = (patch: Partial<Line> = {}): Line => ({
    id: "L1", seriesId: "S1", monthKey: "2026-11", kind: "expense-variable", concept: "AMZN Mktp", amountMinor: 12500,
    currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD",
    icon: "", history: [], bookedOn: "2026-11-17", startedOn: "", ...patch,
  });

  it("misma moneda y monto, día cercano y concepto emparentado → duplicado", () => {
    let s = base();
    s = upsertLine(s, lineOf());
    const dup = findDup(mkDraft({ concept: "Amazon", day: "2026-11-18" }), s);
    assert.equal(dup?.id, "L1");
  });

  it("monto distinto, moneda distinta o día lejano → no", () => {
    let s = base();
    s = upsertLine(s, lineOf());
    assert.equal(findDup(mkDraft({ concept: "Amazon", amountMinor: 999 }), s), undefined);
    assert.equal(findDup(mkDraft({ concept: "Amazon", currency: "NIO" }), s), undefined);
    assert.equal(findDup(mkDraft({ concept: "Amazon", day: "2026-11-28" }), s), undefined);
    assert.equal(findDup(mkDraft({ concept: "Otra tienda", day: "2026-11-18" }), s), undefined);
  });

  it("una línea inactiva no acusa duplicado", () => {
    let s = base();
    s = upsertLine(s, lineOf({ active: false }));
    assert.equal(findDup(mkDraft({ concept: "Amazon" }), s), undefined);
  });
});

describe("drafts: LA REINA — la bandeja es invisible para el dinero (§7.3)", () => {
  const populated = (): LedgerState => {
    let s = base();
    const cat = s.structure.categories.find((c) => c.group === "variable")!;
    const mk = (patch: Partial<Line>): Line => ({
      id: `L${Math.random()}`, seriesId: `S${Math.random()}`, monthKey: "2026-11", kind: "expense-variable",
      concept: "Gasto", amountMinor: 10000, currency: "USD", active: true, note: "", categoryId: cat.id, subId: "",
      recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "",
      aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], bookedOn: "2026-11-05", startedOn: "", ...patch,
    });
    s = upsertLine(s, mk({ concept: "Renta", amountMinor: 90000, kind: "expense-fixed", recurring: true, cadence: "monthly" }));
    s = upsertLine(s, mk({ concept: "Sueldo", amountMinor: 250000, kind: "income-variable", bookedOn: "2026-11-01" }));
    s = upsertLine(s, mk({ concept: "Publix", amountMinor: 12500 }));
    return s;
  };
  const figures = (s: LedgerState) => JSON.stringify({
    central: summarize(s, "2026-11", "es"),
    asesor: readAdvisor(s, "2026-11", "es", makeNamer(s.structure, "es")),
    ahorros: savingsStock(s, "2026-11"),
    cobros: { deuda: lineDebtTotal(s), prestado: lentTotals(s) },
  });

  it("Central, Estudio, Asesor y Cobros: idénticos con la bandeja llena y vacía", () => {
    const s = populated();
    const before = figures(s);
    const full = addDrafts(s, [
      mkDraft({ concept: "Publix", amountMinor: 12500 }),
      mkDraft({ concept: "Rojo sin monto", amountMinor: null, currency: null, sign: null, day: "" }),
      mkDraft({ concept: "Netflix", book: "subscription", amountMinor: 15400, cadence: "monthly" }),
      mkDraft({ concept: "Entrada", book: "income-variable", sign: "in", amountMinor: 50000, currency: "NIO" }),
    ]);
    assert.equal(figures(full), before, "ni una cifra se mueve con la bandeja llena");
    assert.equal(full.months, s.months, "addDrafts no toca months ni por referencia");
  });
});

describe("drafts: persistencia — la bandeja sobrevive al paquete y a la copia (§7.4)", () => {
  it("ida y vuelta por JSON: unsure, missing y raw intactos; el libro sigue profundo-válido", () => {
    let s = base();
    const d = mkDraft({ amountMinor: null, unsure: ["concept"], raw: "FOTO: línea cruda del OCR" });
    d.missing = validateDraft(d).missing;
    s = addDrafts(s, [d]);
    const back = JSON.parse(JSON.stringify(s)) as LedgerState;
    assert.ok(isLedgerDeep(back), "el libro con bandeja pasa la guardia profunda");
    assert.deepEqual(back.drafts, s.drafts);
    assert.equal(back.drafts![0]!.raw, "FOTO: línea cruda del OCR");
    assert.deepEqual(back.drafts![0]!.missing, ["amount"]);
    const malformed = JSON.parse(JSON.stringify({ ...s, drafts: [{ id: 7 }] })) as unknown;
    assert.equal(isLedgerDeep(malformed), false, "un borrador dañado sí lo caza la guardia");
  });
});

describe("scanadapter: la migración del escaneo (§7.5 y §7.7)", () => {
  const scanD = (patch: Partial<ScanDraft> = {}): ScanDraft => ({
    type: "receipt", concept: "Publix", note: "", amountMinor: 12500, currency: "USD", date: "2026-11-18",
    cadence: "", brand: "", generic: "", book: "expense-variable", category: "", sub: "", unsure: [], box: undefined as never, ...patch,
  });
  const card = (patch: Partial<ScanCardLike> = {}): ScanCardLike => ({
    id: "c1", book: "expense-variable", concept: "Publix", amount: "125.00", currency: "USD", date: "2026-11-18",
    cadence: "", note: "", brand: "", crop: "", useCrop: false, generic: "", category: "", sub: "", unsure: [], dup: false, ...patch,
  });

  it("el borrador nace con la forma del contrato y su rojo derivado", () => {
    const s = base();
    const d = scanToDraft(scanD(), card(), s);
    assert.equal(d.source, "photo");
    assert.equal(d.sign, "out");
    assert.equal(d.amountMinor, 12500);
    assert.deepEqual(d.missing, []);
    const red = scanToDraft(scanD({ amountMinor: null }), card({ amount: "" }), s);
    assert.deepEqual(red.missing, ["amount"]);
    // Y su conversión reproduce la línea que el save() antiguo construía.
    const line = draftToLine(d, ctx(s))!;
    assert.equal(line.kind, "expense-variable");
    assert.equal(line.bookedOn, "2026-11-18");
    assert.equal(line.amountMinor, 12500);
  });

  it("la suscripción trae su cadencia y su marca resuelta", () => {
    const s = base();
    const d = scanToDraft(
      scanD({ type: "subscription", concept: "Netflix", book: "subscription", cadence: "monthly" }),
      card({ book: "subscription", concept: "Netflix", cadence: "monthly", brand: "netflix" }),
      s,
    );
    assert.equal(d.book, "subscription");
    assert.equal(d.cadence, "monthly");
    assert.equal(d.icon, "sub:netflix");
  });

  it("la regla aprendida gana al acierto del lector: nace clasificado (§7.7)", () => {
    let s = base();
    const cat = s.structure.categories.find((c) => c.group === "variable")!;
    const draft = mkDraft({ concept: "Publix", cat: "", sub: "" });
    const line = draftToLine(mkDraft({ concept: "Publix", cat: cat.id }), ctx(s))!;
    s = learnFromSaved(s, [{ draft, line }]);
    const born = scanToDraft(scanD(), card(), s);
    assert.equal(born.cat, cat.id, "el segundo recibo de la tienda nace en su casa");
    assert.equal(born.book, "expense-variable");
  });

  it("el duplicado del lector se conserva como dupOf", () => {
    let s = base();
    s = upsertLine(s, {
      id: "LT", seriesId: "ST", monthKey: "2026-11", kind: "expense-variable", concept: "Publix", amountMinor: 12500,
      currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
      productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD",
      icon: "", history: [], bookedOn: "2026-11-18", startedOn: "",
    });
    const d = scanToDraft(scanD(), card({ dup: true }), s);
    assert.equal(d.dupOf, "LT");
  });
});

describe("drafts: el aprendizaje al guardar (ley 9)", () => {
  it("la casa corregida se aprende por comercio; la no tocada, no", () => {
    const s = base();
    const cat = s.structure.categories.find((c) => c.group === "variable")!;
    const draft = mkDraft({ concept: "Publix", cat: "", sub: "" });
    const line = draftToLine(mkDraft({ concept: "Publix", cat: cat.id }), ctx(s))!;
    const after = learnFromSaved(s, [{ draft, line }]);
    const rule = findRule(after.imports!.rules, merchantKey("Publix"));
    assert.ok(rule, "la regla nació");
    assert.equal(rule!.target, `expense-variable|${cat.id}|`);
    const same = learnFromSaved(s, [{ draft: mkDraft({ concept: "Publix", cat: cat.id }), line }]);
    assert.equal(same, s, "sin corrección no se aprende ni se toca el estado");
  });
});
