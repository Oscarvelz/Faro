// Batería dorada v2 — Oleada 2 (1.3.147): una sola fuente de verdad por número.
// Cada prueba fija uno de los arreglos de la oleada sobre datos sintéticos: el stock de ahorro
// único en las tres superficies, las cotas de fecha en deudas, la deuda total con sus tres
// almacenes, la regla de nombres a nivel de NOMBRE (la batería v1 borra las cadenas al comparar;
// aquí se afirma que el nombre oculto no aparece), el predicado único de remesas vía summarize,
// el burn del mes en curso, el normalizador de moneda, la clasificación sin ingreso y la tarjeta
// vencida. Si una unificación se deshace, esta batería grita antes de que la versión exista.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { addReading, cardFigures, payCard, cardsOf } from "./cards.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent, lentState, lineDebtTotal, lentOf, netBalance, payLent, payoffPlan, totalDebt } from "./debts.ts";
import { addLoan, loanState, loanTotals, loansOf, payLoan } from "./loans.ts";
import { buildBudget, cashSankey, studyBoard, summarize } from "./engine.ts";
import { savingsStock } from "./savings.ts";
import { buildWidgetSnapshot, savingsOf } from "./widget.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id,
    monthKey: "2026-10",
    currency: "USD",
    active: true,
    note: "",
    categoryId: "",
    subId: "",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "USD",
    icon: "",
    history: [],
    ...partial,
  };
}

function base(display: "USD" | "NIO" = "USD"): LedgerState {
  const ledger = createInitial("es", "claro");
  ledger.settings = { ...ledger.settings, display, savingsGoalPct: 20 };
  ledger.months = {};
  return ledger;
}

const names = (s: LedgerState) => makeNamer(s.structure, "es");
const TODAY22 = new Date(2026, 9, 22);

describe("stock de ahorro único (arreglo 1)", () => {
  it("(a) colchón del Asesor = total del widget = numerador de la pista de Estudio, en un mismo libro", () => {
    const s = base();
    s.months = {
      "2026-09": { lines: [line({ id: "em", kind: "expense-fixed", concept: "Emergencia", amountMinor: 10000, monthKey: "2026-09", categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 100000, bookedOn: "2026-09-10" })] },
      "2026-10": { lines: [line({ id: "em", kind: "expense-fixed", concept: "Emergencia", amountMinor: 5000, monthKey: "2026-10", categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: "2026-10-03" })] },
    };
    assert.equal(savingsStock(s, "2026-10").total, 105000);
    const reading = readAdvisor(s, "2026-10", "es", names(s), { today: TODAY22 });
    assert.equal(reading.cushionStock, 105000, "el colchón del Asesor es el stock único");
    assert.equal(savingsOf(s, "2026-10", "es").total, 105000, "el widget lee el mismo stock");
    assert.equal(studyBoard(s, "2026-10", "es", names(s)).runwayHave, 105000, "la pista de Estudio lee el mismo stock");
  });

  it("(b) tres meses: saldo en m1, nada en m2, depósito en m3 — el mismo stock en todas las superficies", () => {
    const s = base();
    s.months = {
      "2026-08": { lines: [line({ id: "pk", kind: "expense-fixed", concept: "Meta", amountMinor: 20000, monthKey: "2026-08", categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 200000, bookedOn: "2026-08-15" })] },
      "2026-09": { lines: [line({ id: "sueldo", kind: "income-fixed", concept: "Salario", amountMinor: 300000, monthKey: "2026-09" })] },
      "2026-10": { lines: [line({ id: "pk", kind: "expense-fixed", concept: "Meta", amountMinor: 25000, monthKey: "2026-10", categoryId: "f-ahorro", subId: "f.ahorro.meta", bookedOn: "2026-10-05" })] },
    };
    assert.equal(savingsStock(s, "2026-08").total, 200000);
    assert.equal(savingsStock(s, "2026-09").total, 200000, "un mes sin líneas de la serie no pone el stock en cero");
    assert.equal(savingsStock(s, "2026-10").total, 225000, "el depósito posterior al saldo suma sobre el saldo");
    assert.equal(readAdvisor(s, "2026-10", "es", names(s), { today: TODAY22 }).cushionStock, 225000);
    assert.equal(savingsOf(s, "2026-10", "es").total, 225000);
    assert.equal(studyBoard(s, "2026-10", "es", names(s)).runwayHave, 225000);
    assert.equal(savingsOf(s, "2026-09", "es").total, 200000, "el widget de septiembre ya veía el saldo de agosto");
  });

  it("(j) un depósito anterior al saldo no se cuenta dos veces; entre dos saldos del mismo mes gana el de fecha mayor", () => {
    const s = base();
    s.months = {
      "2026-08": { lines: [line({ id: "pk", kind: "expense-fixed", concept: "Meta", amountMinor: 30000, monthKey: "2026-08", categoryId: "f-ahorro", subId: "f.ahorro.meta", bookedOn: "2026-08-03" })] },
      "2026-09": { lines: [line({ id: "pk", kind: "expense-fixed", concept: "Meta", amountMinor: 30000, monthKey: "2026-09", categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 100000, bookedOn: "2026-09-20" })] },
      "2026-10": { lines: [
        line({ id: "pk-b", seriesId: "pk2", kind: "expense-fixed", concept: "Meta", amountMinor: 5000, monthKey: "2026-10", categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 70000, bookedOn: "2026-10-20" }),
        line({ id: "pk-a", seriesId: "pk2", kind: "expense-fixed", concept: "Meta", amountMinor: 5000, monthKey: "2026-10", categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 50000, bookedOn: "2026-10-05" }),
      ] },
    };
    // La serie pk termina en su saldo de septiembre (100000): el depósito de agosto ya vive dentro.
    // La serie de octubre trae dos saldos el mismo mes: manda el del día 20 (70000), no el primero en la lista.
    assert.equal(savingsStock(s, "2026-10").total, 170000);
  });
});

describe("cotas de fecha en deudas (arreglo 2) y deuda total (arreglo 3)", () => {
  it("(d) un pago fechado el mes que viene no baja la deuda de hoy — préstamo, Me deben y tarjeta", () => {
    let s = base("NIO");
    s = addLoan(s, { id: "L1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 1200000, currency: "NIO", aprBps: 0, takenOn: "2026-09-01", book: "fixed", note: "" });
    s = payLoan(s, "L1", 400000, "2026-12-15", "future", "Pago");
    const loan = loansOf(s)[0]!;
    assert.equal(loanState(s, loan, "2026-11-04").left, 1200000, "el abono de diciembre no mueve noviembre");
    assert.equal(loanTotals(s, "2026-11-04").left, 1200000);
    assert.equal(netBalance(s, "2026-11-04").owe, 1200000);
    s = payLoan(s, "L1", 400000, "2026-10-15", "past", "Pago");
    assert.equal(loanState(s, loan, "2026-11-04").left, 800000, "el abono de octubre sí cuenta");

    let t = base("NIO");
    t = addLent(t, { id: "A", person: "Ana", kind: "plain", amountMinor: 30000, currency: "NIO", aprBps: 0, startedOn: "2026-09-01", dueOn: "", note: "" });
    t = payLent(t, "A", 10000, "2026-12-01", "ab-future", "Abono");
    assert.equal(lentState(t, lentOf(t)[0]!, "2026-11-04").left, 30000, "el abono futuro tampoco baja Me deben hoy");

    let u = base();
    u = addReading(u, "card-paypal", { balanceMinor: 60000, src: "manual", on: "2026-11-01" }, "2026-11-01");
    u = payCard(u, "card-paypal", 25000, "2026-12-02", "cp-future", "Abono");
    const card = cardsOf(u).find((c) => c.id === "card-paypal")!;
    assert.equal(cardFigures(u, card, "2026-11-05").balance, 60000, "el abono de diciembre no baja el saldo de noviembre");
    assert.equal(cardFigures(u, card, "2026-12-05").balance, 35000, "en diciembre sí");
  });

  it("(h) el tercer almacén: saldos en líneas de la categoría de créditos cuentan en la deuda total y en el plan", () => {
    const s = base();
    s.months = {
      "2026-10": { lines: [line({ id: "visa", kind: "expense-fixed", concept: "Visa", amountMinor: 10000, categoryId: "f-creditos", subId: "f.creditos.tarjetas", balanceMinor: 80000, aprBps: 2400, bookedOn: "2026-10-05" })] },
      "2026-11": { lines: [line({ id: "visa", kind: "expense-fixed", concept: "Visa", amountMinor: 10000, monthKey: "2026-11", categoryId: "f-creditos", subId: "f.creditos.tarjetas", balanceMinor: 60000, aprBps: 2400, bookedOn: "2026-11-02" })] },
    };
    assert.equal(lineDebtTotal(s, "2026-11-04"), 60000, "manda la lectura más reciente de la serie, no la suma de meses");
    assert.equal(totalDebt(s, "2026-11-04"), 60000);
    const nb = netBalance(s, "2026-11-04");
    assert.equal(nb.owe, 60000);
    assert.equal(nb.lines, 60000);
    const plan = payoffPlan(s, "2026-11-04");
    assert.equal(plan.debts.length, 1, "la fecha de liberación también la cuenta");
    assert.equal(plan.debts[0]!.left, 60000);
    assert.equal(plan.debts[0]!.name, "Visa");
  });
});

describe("nombres ocultos y remesas (arreglos 4 y 5)", () => {
  it("(c) el nombre de una categoría oculta a mano no aparece en Sankey, studyBoard ni buildBudget — su dinero va a «Otros»", () => {
    const s = base();
    s.structure = {
      ...s.structure,
      categories: s.structure.categories.map((c) => (c.id === "f-familia" ? { ...c, hidden: true, customName: "Familia Secreta" } : c)),
    };
    s.months = {
      "2026-10": { lines: [
        line({ id: "sal", kind: "income-fixed", concept: "Salario", amountMinor: 100000 }),
        line({ id: "renta", kind: "expense-fixed", concept: "Renta", amountMinor: 20000, categoryId: "f-casa", subId: "f.casa.renta" }),
        line({ id: "oculto1", kind: "expense-variable", concept: "", amountMinor: 90000, categoryId: "f-familia" }),
        line({ id: "oculto2", kind: "purchase", concept: "", amountMinor: 20000, categoryId: "f-familia" }),
      ] },
    };
    const sankey = cashSankey(s, "2026-10", "es", names(s));
    assert.equal(JSON.stringify(sankey).includes("Familia Secreta"), false, "Sankey no nombra lo oculto");
    assert.ok(sankey.nodes.some((n) => n.name === "Otras" && n.minor === 110000), "el dinero oculto fluye bajo «Otras»");

    const board = studyBoard(s, "2026-10", "es", names(s));
    assert.equal(JSON.stringify(board.top).includes("Familia Secreta"), false, "el Top de Estudio no nombra lo oculto");
    assert.equal(JSON.stringify(board.donut).includes("Familia Secreta"), false, "el donut no nombra lo oculto");
    assert.ok(board.donut.some((d) => d.name === "Otros" && d.minor === 110000), "el donut pliega lo oculto en «Otros» con el mismo dinero");

    const budget = buildBudget(s, "2026-10", "es", names(s));
    assert.ok(budget.cuts.length > 0, "el presupuesto pide recortes en este libro");
    assert.equal(JSON.stringify(budget.cuts).includes("Familia Secreta"), false, "los recortes no nombran lo oculto");
    assert.equal(budget.cuts.reduce((a, c) => a + c.minor, 0), 50000);
  });

  it("(e2) summarize cuenta remesas con el predicado único: un ingreso en la categoría de remesas no es remesa", () => {
    const s = base();
    s.months = {
      "2026-10": { lines: [
        line({ id: "envio", kind: "expense-variable", concept: "Envío", amountMinor: 30000, categoryId: "f-remesas" }),
        line({ id: "mal-archivado", kind: "income-variable", concept: "Remesa recibida", amountMinor: 99000, categoryId: "f-remesas" }),
      ] },
    };
    const sum = summarize(s, "2026-10", "es");
    assert.equal(sum.remittance, 30000, "solo el gasto en la categoría cuenta como remesa");
    assert.equal(sum.income, 99000, "el ingreso sigue siendo ingreso");
  });
});

describe("burn, moneda y clasificación (arreglos 6, 7 y 8)", () => {
  it("(i) el burn del mes en curso divide por los días transcurridos; un mes pasado, por el mes completo", () => {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const prevDays = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
    const s = base();
    s.months = {
      [curKey]: { lines: [line({ id: "g", kind: "expense-variable", concept: "Gasto", amountMinor: 31000, monthKey: curKey })] },
      [prevKey]: { lines: [line({ id: "g", kind: "expense-variable", concept: "Gasto", amountMinor: 31000, monthKey: prevKey })] },
    };
    assert.equal(studyBoard(s, curKey, "es", names(s)).burn, Math.round(31000 / Math.max(1, now.getDate())), "mes en curso: días transcurridos");
    assert.equal(studyBoard(s, prevKey, "es", names(s)).burn, Math.round(31000 / prevDays), "mes pasado: mes completo");
  });

  it("(e) el normalizador de moneda: lo ilegible cae a la moneda de la vista; el NIO con tasa convierte", () => {
    let s = base("USD");
    s = addLoan(s, { id: "LX", lender: "Banco", who: "entity", kind: "plain", amountMinor: 50000, currency: "EUR" as never, aprBps: 0, takenOn: "2026-10-01", book: "fixed", note: "" });
    assert.equal(loansOf(s)[0]!.currency, "USD", "un préstamo ilegible en vista USD se lee USD, no córdobas");
    let t = base("NIO");
    t = addLent(t, { id: "AX", person: "Ana", kind: "plain", amountMinor: 50000, currency: "EUR" as never, aprBps: 0, startedOn: "2026-10-01", dueOn: "", note: "" });
    assert.equal(lentOf(t)[0]!.currency, "NIO", "un Me deben ilegible en vista NIO se lee NIO, no dólares");
    let u = base("USD");
    u = addLoan(u, { id: "LN", lender: "Banco", who: "entity", kind: "plain", amountMinor: 366243, currency: "NIO", aprBps: 0, takenOn: "2026-10-01", book: "fixed", note: "" });
    assert.equal(loanTotals(u, "2026-11-04").left, 10000, "C$3,662.43 a la tasa guardada son $100.00");
  });

  it("(f) sin ingreso en el mes, un gasto repetido entra a la base recurrente; uno primerizo no se marca «de una vez» solo por falta de ingreso", () => {
    const s = base();
    s.months = {
      "2026-09": { lines: [line({ id: "plomero", kind: "expense-variable", concept: "Plomero", amountMinor: 60000, monthKey: "2026-09", categoryId: "v-casa" })] },
      "2026-10": { lines: [
        line({ id: "plomero", kind: "expense-variable", concept: "Plomero", amountMinor: 60000, categoryId: "v-casa" }),
        line({ id: "tele", kind: "expense-variable", concept: "Televisor", amountMinor: 80000, categoryId: "v-entretenimiento" }),
      ] },
    };
    const r = readAdvisor(s, "2026-10", "es", names(s), { today: TODAY22 });
    assert.equal(r.income, 0);
    assert.equal(r.uniqueMinor, 0, "sin ingreso no hay «compras de una vez» por tamaño: no hay vara para medirlo");
    assert.equal(r.recurrentMinor, 140000, "lo repetido y lo primerizo cuentan en la base cuando falta el ingreso");
  });
});

describe("tarjeta vencida (arreglo 9)", () => {
  const withCard = () => {
    let s = base();
    s = addReading(s, "card-paypal", { balanceMinor: 42000, availMinor: 158000, minMinor: 3500, dueOn: "2026-11-01", src: "shot", on: "2026-10-28" }, "2026-10-28");
    return s;
  };

  it("(g) sin abono que cubra el mínimo, dueOn es la fecha PASADA y el widget la muestra vencida", () => {
    const s = withCard();
    const card = cardsOf(s).find((c) => c.id === "card-paypal")!;
    const f = cardFigures(s, card, "2026-11-06");
    assert.equal(f.balance, 42000);
    assert.equal(f.dueOn, "2026-11-01", "la fecha vencida se muestra tal cual, no rueda al ciclo siguiente");
    const snap = buildWidgetSnapshot(s, "es", { today: "2026-11-06", hide: false, lock: false });
    const due = snap.dues.find((d) => d.kind === "card");
    assert.ok(due, "la tarjeta vencida entra a los vencimientos del widget");
    assert.equal(due.on, "2026-11-01");
    assert.equal(due.amt, 3500);
  });

  it("(g2) un abono que cubre el mínimo devuelve el comportamiento hacia adelante; saldada, la tarjeta no vence", () => {
    let s = withCard();
    s = payCard(s, "card-paypal", 3500, "2026-11-03", "min-pay", "Abono");
    const card = () => cardsOf(s).find((c) => c.id === "card-paypal")!;
    const f = cardFigures(s, card(), "2026-11-06");
    assert.equal(f.balance, 38500);
    assert.equal(f.dueOn, "2026-12-01", "cubierto el mínimo, la fecha rueda al ciclo siguiente como antes");
    let t = withCard();
    t = payCard(t, "card-paypal", 42000, "2026-11-03", "full-pay", "Abono");
    assert.equal(cardFigures(t, cardsOf(t).find((c) => c.id === "card-paypal")!, "2026-11-06").balance, 0);
    const snap = buildWidgetSnapshot(t, "es", { today: "2026-11-06", hide: false, lock: false });
    assert.equal(snap.dues.some((d) => d.kind === "card"), false, "sin saldo no hay vencimiento");
  });

  it("(g3) una tarjeta aún no vencida conserva su fecha; sin lectura de fecha, manda el día de pago del mes en curso", () => {
    let s = base();
    s = addReading(s, "card-paypal", { balanceMinor: 42000, minMinor: 3500, dueOn: "2026-11-15", src: "shot", on: "2026-11-02" }, "2026-11-02");
    assert.equal(cardFigures(s, cardsOf(s).find((c) => c.id === "card-paypal")!, "2026-11-06").dueOn, "2026-11-15");
    let t = base();
    t = addReading(t, "card-paypal", { balanceMinor: 42000, minMinor: 3500, src: "manual", on: "2026-11-02" }, "2026-11-02");
    t = { ...t, cards: t.cards?.map((c) => ({ ...c, dueDay: 1 })) };
    const ct = cardsOf(t).find((c) => c.id === "card-paypal")!;
    assert.equal(ct.dueDay, 1);
    assert.equal(cardFigures(t, ct, "2026-11-06").dueOn, "2026-11-01", "sin fecha del banco, el día 1 ya pasado es la fecha vencida");
  });
});
