// Conciliación (1.3.153): a purchase Oscar typed by hand must never be counted twice when the statement
// arrives. The import's fuzzy hunt now matches on amount + currency + side within ±4 days, treats the
// ACCOUNT as a first-class witness, knows the statement abbreviations of the merchants, and can say
// WHICH of his lines a duplicate matches. The review's per-file account (fileRecon) always ties:
// Total = Entra nuevo + Ya estaba + Diferencia — and a confirmed difference becomes ONE normal line.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImport, buildReview, fileRecon, matchKey, revertImport, type ParsedFile } from "./bankparse.ts";
import { acctKindWord, classOfLabel, DEFAULT_SOURCES, importBook, learnPayHint, manualLineRc, merchantKey, payAcctLabel, payHintFor, rewardsMonth } from "./bankbook.ts";
import type { Category, ImportBook, LedgerState, Line } from "./types.ts";

const sub = (id: string, name: string) => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0 });
const cat = (id: string, group: "fixed" | "variable", name: string, subs: [string, string][]): Category => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0, group, role: "", subs: subs.map(([a, b]) => sub(a, b)) });
function ledger(): LedgerState {
  return {
    v: 1, revision: 1, updatedAt: "", audit: [], months: {},
    settings: { lang: "es", theme: "claro", display: "USD", rateE4: 366243, rateSource: "", rateAsOf: "", savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {} },
    structure: {
      categories: [
        cat("f-alimentos", "fixed", "Alimentos", [["f.alimentos.despensa", "Despensa"]]),
        cat("v-personales", "variable", "Personales", [["v.p.salud", "Farmacia"], ["v.p.otros", "Otros"]]),
      ],
      purchases: [{ id: "otros", nameKey: "", customName: "Otros", icon: "Package", hidden: false, order: 0 }],
      catalog: [],
    },
  };
}
const names = { cat: (id: string) => id, sub: (id: string) => id, purchase: (id: string) => id };
let seq = 0;
function manual(partial: Partial<Line>): Line {
  const id = `m-${++seq}`;
  return {
    id, seriesId: id, monthKey: "2026-10", kind: "expense-variable", concept: "Amazon", amountMinor: 2599, currency: "USD",
    active: true, note: "", categoryId: "v-personales", subId: "v.p.otros", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD",
    icon: "", history: [], bookedOn: "2026-10-28", startedOn: "", ...partial,
  };
}
function withLines(state: LedgerState, lines: Line[]): LedgerState {
  const months = { ...state.months };
  for (const l of lines) months[l.monthKey] = { lines: [...(months[l.monthKey]?.lines ?? []), l] };
  return { ...state, months };
}
const cardFile = (rows: ParsedFile["rows"]): ParsedFile => ({ name: "tarjeta.csv", format: "csv", bank: "chase", kind: "card", sig: "csv:chase-test", rows });
const allLines = (s: LedgerState) => Object.values(s.months).flatMap((b) => b.lines);

describe("conciliación: la ventana de ±4 días y los alias", () => {
  it("una compra a mano del 28 atrapa su cargo del estado del 31 (3 días)", () => {
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 2599, bookedOn: "2026-10-28" })]);
    const rv = buildReview(s, [cardFile([{ date: "2026-10-31", amount: -2599, desc: "AMZN Mktp*2K4XYZ SEATTLE WA" }])], [""], names, "es");
    assert.equal(rv.rows[0].dup, "fuzzy");
    assert.equal(rv.rows[0].include, false);
    assert.equal(rv.rows[0].dupOf?.concept, "Amazon");
    assert.equal(rv.rows[0].dupOf?.day, "2026-10-28");
  });

  it("la puerta (L10): una línea apartada reclama su duplicado pero jamás se la nombra", () => {
    // Apartada, la compra sigue reclamando su cargo — si vuelve, no nace un gemelo
    // visible — pero dupOf llevaría su nombre y su día a la revisión: eso sería la fuga.
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 2599, bookedOn: "2026-10-28", rest: true })]);
    const rv = buildReview(s, [cardFile([{ date: "2026-10-31", amount: -2599, desc: "AMZN Mktp*2K4XYZ SEATTLE WA" }])], [""], names, "es");
    assert.equal(rv.rows[0].dup, "fuzzy", "el reclamo se mantiene: el cargo no entra dos veces");
    assert.equal(rv.rows[0].include, false);
    assert.equal(rv.rows[0].dupOf, undefined, "ni el concepto ni el día de lo apartado llegan a la pantalla");
  });

  it("AMZN a secas también es Amazon en la caza, sin mover la clave global de las reglas", () => {
    assert.equal(merchantKey("AMZN"), "amzn", "la clave global no cambia: las reglas aprendidas no se mueven");
    assert.equal(matchKey("AMZN"), "amazon");
    assert.equal(matchKey("Amazon Mktp"), "amazon");
    assert.equal(matchKey("AMZN Mktp*2K4XYZ"), "amazon");
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 2599, bookedOn: "2026-10-28" })]);
    const rv = buildReview(s, [cardFile([{ date: "2026-10-28", amount: -2599, desc: "AMZN" }])], [""], names, "es");
    assert.equal(rv.rows[0].dup, "fuzzy");
  });

  it("fuera de la ventana (5 días) o con otro monto, no hay duplicado", () => {
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 2599, bookedOn: "2026-10-26" })]);
    const far = buildReview(s, [cardFile([{ date: "2026-10-31", amount: -2599, desc: "AMZN Mktp*2K4" }])], [""], names, "es");
    assert.equal(far.rows[0].dup, "");
    assert.equal(far.rows[0].include, true);
    const off = buildReview(s, [cardFile([{ date: "2026-10-27", amount: -2600, desc: "AMZN Mktp*2K4" }])], [""], names, "es");
    assert.equal(off.rows[0].dup, "", "un centavo de diferencia ya es otra compra");
  });
});

describe("conciliación: la cuenta manda", () => {
  it("misma cuenta, monto y días: duplicado aunque el nombre no ayude", () => {
    const s = withLines(ledger(), [manual({ concept: "Compra en línea", amountMinor: 4200, bookedOn: "2026-10-29", sourceId: "acct-chase-card" })]);
    const rv = buildReview(s, [cardFile([{ date: "2026-10-30", amount: -4200, desc: "XQZ WOBBLE RETAIL 9911" }])], ["acct-chase-card"], names, "es");
    assert.equal(rv.rows[0].dup, "fuzzy");
    assert.equal(rv.rows[0].dupOf?.concept, "Compra en línea");
  });

  it("otra cuenta nunca es la misma compra, ni con el mismo nombre", () => {
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 2599, bookedOn: "2026-10-28", sourceId: "acct-wf-card" })]);
    const rv = buildReview(s, [cardFile([{ date: "2026-10-29", amount: -2599, desc: "AMZN Mktp*2K4" }])], ["acct-chase-card"], names, "es");
    assert.equal(rv.rows[0].dup, "");
    assert.equal(rv.rows[0].include, true);
  });

  it("lo pagado en efectivo nunca coincide con un cargo del banco", () => {
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 2599, bookedOn: "2026-10-28", sourceId: "cash" })]);
    const noAcct = buildReview(s, [cardFile([{ date: "2026-10-28", amount: -2599, desc: "AMZN Mktp*2K4" }])], [""], names, "es");
    assert.equal(noAcct.rows[0].dup, "");
    const withAcct = buildReview(s, [cardFile([{ date: "2026-10-28", amount: -2599, desc: "AMZN Mktp*2K4" }])], ["acct-chase-card"], names, "es");
    assert.equal(withAcct.rows[0].dup, "");
  });

  it("sin cuenta en ningún lado, decide el nombre como antes", () => {
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 2599, bookedOn: "2026-10-28" })]);
    const rv = buildReview(s, [cardFile([{ date: "2026-10-30", amount: -2599, desc: "AMZN Mktp*2K4" }])], [""], names, "es");
    assert.equal(rv.rows[0].dup, "fuzzy", "a 2 días con nombre parecido: el comportamiento de siempre");
  });

  it("una línea del mismo feed solo coincide por su número exacto, nunca por cercanía", () => {
    const s = withLines(ledger(), [manual({ concept: "Compra", amountMinor: 4200, bookedOn: "2026-10-29", sourceId: "acct-chase-card", importId: "ofx:acct-chase-card:OLD1" })]);
    const rv = buildReview(s, [cardFile([{ date: "2026-10-30", amount: -4200, desc: "XQZ WOBBLE RETAIL 9911", id: "NEW9" }])], ["acct-chase-card"], names, "es");
    assert.equal(rv.rows[0].dup, "", "otro FITID del mismo banco es otra compra, aunque cuenta y monto coincidan");
    assert.equal(rv.rows[0].include, true);
  });
});

describe("conciliación: la cuenta del archivo", () => {
  const file = cardFile([
    { date: "2026-10-03", amount: -10000, desc: "MERCADO A" },
    { date: "2026-10-10", amount: -2500, desc: "TIENDA B" },
    { date: "2026-10-20", amount: -700, desc: "COSA C" },
    { date: "2026-10-21", amount: 500, desc: "DEVOLUCION" },
  ]);
  const state = () => withLines(ledger(), [manual({ concept: "TIENDA B", amountMinor: 2500, bookedOn: "2026-10-10" })]);

  it("Total = Entra nuevo + Ya estaba + Diferencia, siempre", () => {
    const rv = buildReview(state(), [file], [""], names, "es");
    let rec = fileRecon(rv.rows, 0);
    assert.equal(rec.rows, 4);
    assert.equal(rec.total, 12700);
    assert.equal(rec.incoming, 10200);
    assert.equal(rec.already, 2500);
    assert.equal(rec.diff, 0);
    // Oscar apaga una fila a mano: esa fila pasa a ser la diferencia, ni más ni menos.
    rv.rows.find((r) => r.key === "cosa c")!.include = false;
    rec = fileRecon(rv.rows, 0);
    assert.equal(rec.incoming, 9500);
    assert.equal(rec.diff, 700);
    assert.equal(rec.total, rec.incoming + rec.already + rec.diff);
  });

  it("un archivo sin gastos ni reembolsos no tiene cuenta que conciliar", () => {
    const rv = buildReview(ledger(), [cardFile([{ date: "2026-10-05", amount: 9000, desc: "PAGO RECIBIDO", type: "PAYMENT" }])], [""], names, "es");
    assert.equal(fileRecon(rv.rows, 0).rows, 0);
  });
});

describe("conciliación: el ajuste", () => {
  const file = cardFile([
    { date: "2026-10-05", amount: -4200, desc: "MERCADO A" },
    { date: "2026-10-31", amount: -1000, desc: "COSA C" },
  ]);

  it("diferencia positiva: una línea de gasto normal, con la cuenta y el último día del estado", () => {
    const s = ledger();
    const rv = buildReview(s, [file], ["acct-chase-card"], names, "es");
    const { state: after, undo } = applyImport(s, rv, [file], ["acct-chase-card"], "batch-adj", true, [
      { file: 0, diffMinor: 4200, concept: "Ajuste de conciliación · Chase · tarjeta · Octubre 2026", note: "Conciliación: la diferencia." },
    ]);
    const adj = allLines(after).find((l) => l.concept.startsWith("Ajuste de conciliación"));
    assert.ok(adj, "la línea de ajuste existe");
    assert.equal(adj.amountMinor, 4200);
    assert.equal(adj.kind, "expense-variable");
    assert.equal(adj.categoryId, "v-personales");
    assert.equal(adj.subId, "v.p.otros");
    assert.equal(adj.sourceId, "acct-chase-card");
    assert.equal(adj.bookedOn, "2026-10-31");
    assert.equal(adj.monthKey, "2026-10");
    assert.equal(adj.batch, "batch-adj");
    assert.equal(adj.importId, undefined);
    assert.equal(adj.rc, undefined);
    const back = revertImport(after, undo);
    assert.equal(allLines(back).some((l) => l.concept.startsWith("Ajuste de conciliación")), false, "Deshacer la importación también quita el ajuste");
  });

  it("diferencia negativa: el dinero vuelve como ingreso", () => {
    const s = ledger();
    const rv = buildReview(s, [file], ["acct-chase-card"], names, "es");
    const { state: after } = applyImport(s, rv, [file], ["acct-chase-card"], "batch-adj2", true, [
      { file: 0, diffMinor: -1500, concept: "Ajuste de conciliación", note: "Conciliación." },
    ]);
    const adj = allLines(after).find((l) => l.concept === "Ajuste de conciliación");
    assert.ok(adj);
    assert.equal(adj.kind, "income-variable");
    assert.equal(adj.amountMinor, 1500);
  });

  it("sin diferencia o sin filas no se crea nada", () => {
    const s = ledger();
    const rv = buildReview(s, [file], ["acct-chase-card"], names, "es");
    const { state: after } = applyImport(s, rv, [file], ["acct-chase-card"], "batch-adj3", true, [
      { file: 0, diffMinor: 0, concept: "Ajuste de conciliación", note: "Conciliación." },
    ]);
    assert.equal(allLines(after).some((l) => l.concept === "Ajuste de conciliación"), false);
  });
});

describe("conciliación: cómo paga Oscar cada comercio", () => {
  it("la pista se aprende por la clave del comercio y se lee con cualquier grafía", () => {
    const book = learnPayHint(importBook(ledger()), "Amazon", "acct-paypal");
    assert.equal(payHintFor(book, "Amazon"), "acct-paypal");
    assert.equal(payHintFor(book, "AMZN Mktp*2K4XYZ"), "acct-paypal", "la misma clave: amzn mktp y Amazon son un comercio");
    assert.equal(payHintFor(book, "Publix"), "");
    assert.equal(payHintFor(book, ""), "");
  });

  it("las pistas sobreviven a una importación (importBook las deja pasar)", () => {
    const base = ledger();
    const s0: LedgerState = { ...base, imports: { sources: [], rules: [], maps: {}, payHints: { amazon: "acct-paypal" } } };
    const file = cardFile([{ date: "2026-10-05", amount: -1000, desc: "COSA C" }]);
    const rv = buildReview(s0, [file], [""], names, "es");
    const { state: after } = applyImport(s0, rv, [file], [""], "batch-hints");
    assert.equal(after.imports?.payHints?.amazon, "acct-paypal");
  });

  it("una línea a mano con tarjeta gana recompensas por el mismo camino que una importada", () => {
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 10000, sourceId: "acct-chase-card" })]);
    const r = rewardsMonth(s, "2026-10", "USD", 366243);
    assert.ok(r);
    assert.equal(r.count, 1);
    assert.equal(r.earned, 150, "Freedom Unlimited paga 1,5% en lo demás");
    const cashOnly = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 10000, sourceId: "cash" })]);
    assert.equal(rewardsMonth(cashOnly, "2026-10", "USD", 366243), null, "el efectivo no gana recompensas ni cuenta como compra de tarjeta");
  });
});

describe("conciliación: recompensas en lo anotado a mano (extensión del punto 7)", () => {
  const diningBook = (): ImportBook => ({
    sources: [{ id: "acct-chase-card", kind: "card", bank: "chase", rates: { dining: 300, other: 150 } }],
    rules: [], maps: {}, bonus: [],
  });

  it("la clase sale de la categoría archivada, con la misma derivación de la revisión", () => {
    assert.equal(classOfLabel("Comida fuera · Restaurantes", "other"), "dining");
    assert.equal(classOfLabel("Alimentos · Despensa", "other"), "grocery");
    assert.equal(classOfLabel("Personales · Farmacia", "other"), "drug");
    assert.equal(classOfLabel("Transporte · Gasolina", "other"), "gas");
    assert.equal(manualLineRc(importBook(ledger()), "expense-variable|v-personales|v.p.otros", "Personales · Otros"), "other");
    const withBonus: ImportBook = { ...importBook(ledger()), bonus: [{ id: "fiesta", name: "Fiesta 5%", target: "expense-variable|v-personales|v.p.otros" }] };
    assert.equal(manualLineRc(withBonus, "expense-variable|v-personales|v.p.otros", "Comida fuera · Restaurantes"), "fiesta", "una categoría bonus ligada al destino gana sobre la clase de la etiqueta");
  });

  it("gemelos: la línea a mano con tarjeta gana EXACTAMENTE lo mismo que su gemela importada", () => {
    const rc = manualLineRc(diningBook(), "expense-variable|f-alimentos|f.alimentos.despensa", "Comida fuera · Restaurantes");
    assert.equal(rc, "dining");
    const byHand = { ...withLines(ledger(), [manual({ concept: "Cena", amountMinor: 10000, sourceId: "acct-chase-card", rc })]), imports: diningBook() };
    const imported = { ...withLines(ledger(), [manual({ concept: "RESTAURANTE LUIGI", amountMinor: 10000, sourceId: "acct-chase-card", rc: "dining", importId: "fitid-gemela" })]), imports: diningBook() };
    const a = rewardsMonth(byHand, "2026-10", "USD", 366243);
    const b = rewardsMonth(imported, "2026-10", "USD", 366243);
    assert.equal(a?.earned, 300, "la cena a mano en la Chase gana el 3% de comidas: $3,00");
    assert.equal(b?.earned, 300);
    assert.equal(a?.earned, b?.earned, "misma aritmética, centavo a centavo");
  });

  it("un duplicado excluido aporta CERO recompensas, aunque su vista previa prometa", () => {
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 10000, bookedOn: "2026-10-26" })]);
    const file = cardFile([{ date: "2026-10-28", amount: -10000, desc: "AMZN Mktp*2K4XYZ SEATTLE WA" }]);
    const rv = buildReview(s, [file], ["acct-chase-card"], names, "es");
    const row = rv.rows[0];
    assert.equal(row.dup, "fuzzy");
    assert.equal(row.include, false);
    assert.equal(row.reward?.earned, 150, "la vista previa de la fila SÍ promete $1,50 (su clase adivinada es la base): es el fantasma que no debe entrar");
    const { state: after } = applyImport(s, rv, [file], ["acct-chase-card"], "batch-fantasma");
    assert.equal(allLines(after).filter((l) => l.sourceId === "acct-chase-card").length, 0, "la fila excluida nunca se vuelve línea");
    assert.equal(rewardsMonth(after, "2026-10", "USD", 366243)?.earned ?? 0, 0, "cero recompensas de un duplicado que no entró");
  });

  it("encender el duplicado a mano es la ÚNICA vía para que su recompensa cuente", () => {
    const s = withLines(ledger(), [manual({ concept: "Amazon", amountMinor: 10000, bookedOn: "2026-10-26" })]);
    const file = cardFile([{ date: "2026-10-28", amount: -10000, desc: "AMZN Mktp*2K4XYZ SEATTLE WA" }]);
    const rv = buildReview(s, [file], ["acct-chase-card"], names, "es");
    rv.rows[0].include = true; // su gesto explícito de rescate en la revisión
    const { state: after } = applyImport(s, rv, [file], ["acct-chase-card"], "batch-rescate");
    assert.equal(allLines(after).filter((l) => l.sourceId === "acct-chase-card").length, 1);
    assert.equal(rewardsMonth(after, "2026-10", "USD", 366243)?.earned, 150, "solo tras su rescate la recompensa es real: los mismos $1,50 que la vista previa prometía");
  });

  it("efectivo y sin especificar no ganan nada, ni con clase de recompensa escrita", () => {
    const s = { ...withLines(ledger(), [
      manual({ concept: "Cena", amountMinor: 10000, sourceId: "cash", rc: "dining" }),
      manual({ concept: "Cena 2", amountMinor: 10000, rc: "dining" }),
    ]), imports: diningBook() };
    const m = rewardsMonth(s, "2026-10", "USD", 366243);
    assert.equal(m?.earned ?? 0, 0);
    assert.equal(m?.count ?? 0, 0, "ninguna de las dos cuenta como compra de tarjeta");
  });
});

describe("pagado con: la cara del selector (1.3.156)", () => {
  const src = (id: string) => DEFAULT_SOURCES.find((d) => d.id === id)!;

  it("la billetera gana su palabra de tipo: «PayPal · Billetera» / «PayPal · Wallet»", () => {
    assert.equal(payAcctLabel(src("acct-paypal"), "es"), "PayPal · Billetera");
    assert.equal(payAcctLabel(src("acct-paypal"), "en"), "PayPal · Wallet");
  });

  it("los nombres de fábrica ya tipados pasan intactos — nunca «· tarjeta · Crédito»", () => {
    assert.equal(payAcctLabel(src("acct-chase-chk"), "es"), "Chase · cuenta");
    assert.equal(payAcctLabel(src("acct-chase-card"), "es"), "Chase · tarjeta");
    assert.equal(payAcctLabel(src("acct-chase-card"), "en"), "Chase · tarjeta");
    assert.equal(payAcctLabel(src("acct-wf-card"), "es"), "Wells Fargo · tarjeta");
    assert.equal(payAcctLabel(src("acct-pp-card"), "es"), "PayPal · tarjeta");
    assert.equal(payAcctLabel(src("acct-pp-save"), "es"), "PayPal · ahorros");
  });

  it("una cuenta propia sin tipo en el nombre lo gana; con tipo, no se duplica", () => {
    assert.equal(payAcctLabel({ name: "Citi", kind: "card" }, "es"), "Citi · Crédito");
    assert.equal(payAcctLabel({ name: "Citi", kind: "card" }, "en"), "Citi · Credit");
    assert.equal(payAcctLabel({ name: "Mi cuenta", kind: "checking" }, "es"), "Mi cuenta");
    assert.equal(payAcctLabel({ name: "Tarjeta", kind: "card" }, "es"), "Tarjeta");
    assert.equal(payAcctLabel({ name: "Banco · Billetera", kind: "paypal" }, "es"), "Banco · Billetera");
  });

  it("la palabra de tipo es una sola: la misma que fichan las cuentas en Ajustes", () => {
    assert.equal(acctKindWord("card", "es"), "Crédito");
    assert.equal(acctKindWord("checking", "es"), "Débito");
    assert.equal(acctKindWord("paypal", "es"), "Billetera");
    assert.equal(acctKindWord("savings", "es"), "Ahorros");
    assert.equal(acctKindWord("card", "en"), "Credit");
    assert.equal(acctKindWord("checking", "en"), "Debit");
    assert.equal(acctKindWord("paypal", "en"), "Wallet");
    assert.equal(acctKindWord("savings", "en"), "Savings");
  });
});
