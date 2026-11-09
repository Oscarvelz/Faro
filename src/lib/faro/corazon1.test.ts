// Oleada 1 del corazón (1.3.163): las sondas decisivas de la auditoría del corazón
// (Auditoria_Corazon_Faro_2026-11-08) convertidas en pruebas permanentes.
// P1 (FITID duplicado dentro de un mismo archivo), P2 (la línea inactiva no reclama por el
// nombre), D1 (el widget consume duesWindow y cuadra consigo mismo), D2 (la exportación usa
// los nombres visibles y el totalDebt real), D3 (el colchón del Asesor significa una sola
// cosa), P3 (línea OCR con límite y saldo a la vez), P4 (cotas de interés y de ventana).
// Datos sintéticos solamente; el libro es el fixture adversarial de la auditoría.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { buildReview, type ParsedFile } from "./bankparse.ts";
import { addLoan, loanInterestPaid, loansOf, payLoan } from "./loans.ts";
import { addLent, payLent, totalDebt } from "./debts.ts";
import { addReading, putCard } from "./cards.ts";
import { duesWindow } from "./dues.ts";
import { savingsStock } from "./savings.ts";
import { buildWidgetSnapshot, savingsOf } from "./widget.ts";
import { buildSheets, type ExportPick } from "./export-docs.ts";
import { readAdvisor } from "./advisor.ts";
import { parseCardShot } from "./cardparse.ts";
import type { LedgerState, Line } from "./types.ts";

const TODAY = "2026-11-08";
const KEY = "2026-11";

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: p.id, monthKey: KEY, currency: "USD", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...p,
  };
}

/** El libro adversarial de la auditoría (distribuye/book.ts) + dos cuotas de bucket pasado (P4). */
function buildBook(): LedgerState {
  let s = createInitial("es", "claro");
  s = { ...s, settings: { ...s.settings, display: "USD", rateE4: 366243, savingsGoalPct: 20, emergencyMonths: 3 } };
  s.structure = {
    ...s.structure,
    categories: s.structure.categories.map((c) => {
      if (c.id === "v-entretenimiento") return { ...c, hidden: true, customName: "OCULTO-ENTRET" };
      if (c.id === "f-ahorro") return { ...c, subs: [...c.subs,
        { id: "f.ahorro.viaje", nameKey: "f.ahorro.viaje", customName: "Viaje", icon: "Circle", hidden: false, order: 3 },
        { id: "f.ahorro.banco", nameKey: "f.ahorro.banco", customName: "CuentaBanco", icon: "vault:chase", hidden: false, order: 4 }] };
      return c;
    }).concat([{ id: "x-ahorro", nameKey: "x.ahorro", customName: "OCULTO-AHORRO", icon: "PiggyBank", hidden: true, order: 99, group: "fixed", role: "savings",
      subs: [{ id: "x.ahorro.secreto", nameKey: "x.ahorro.secreto", customName: "SECRETO-POCKET", icon: "Circle", hidden: false, order: 0 }] }]),
  };
  const sep: Line[] = [
    // P4: archivada en septiembre, pero su nextDue apunta al 20 de noviembre (dentro de la ventana).
    line({ id: "cu-pasada", kind: "subscription", concept: "Cuota archivada", amountMinor: 6100, monthKey: "2026-09", nextDue: "2026-11-20" }),
    // Control: la instancia vieja de su propia era — no debe resucitar.
    line({ id: "cu-vieja", kind: "subscription", concept: "Cuota vieja", amountMinor: 1111, monthKey: "2026-09", nextDue: "2026-09-15" }),
  ];
  const oct: Line[] = [
    line({ id: "sav-retiro", kind: "expense-fixed", concept: "Retiro saldo", amountMinor: 10000, monthKey: "2026-10", categoryId: "f-ahorro", subId: "f.ahorro.retiro", balanceMinor: 500000, balanceCurrency: "USD", bookedOn: "2026-10-10" }),
    line({ id: "sal-oct", kind: "income-fixed", concept: "Salario oct", amountMinor: 300000, monthKey: "2026-10" }),
  ];
  const nov: Line[] = [
    line({ id: "sal", kind: "income-fixed", concept: "Salario", amountMinor: 300000 }),
    line({ id: "nio-inc", kind: "income-variable", concept: "Ingreso NIO", amountMinor: 366243, currency: "NIO" }),
    line({ id: "renta", kind: "expense-fixed", concept: "Renta", amountMinor: 95000, categoryId: "f-casa", subId: "f.casa.renta" }),
    line({ id: "sav-emerg", kind: "expense-fixed", concept: "Emergencia dep", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: "2026-11-03" }),
    line({ id: "sav-meta", kind: "expense-fixed", concept: "Meta dep", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.meta", bookedOn: "2026-11-03" }),
    line({ id: "sav-viaje", kind: "expense-fixed", concept: "Viaje dep", amountMinor: 10000, categoryId: "f-ahorro", subId: "f.ahorro.viaje", bookedOn: "2026-11-03" }),
    line({ id: "sav-banco", kind: "expense-fixed", concept: "Cuenta saldo", amountMinor: 70000, categoryId: "f-ahorro", subId: "f.ahorro.banco", balanceMinor: 70000, bookedOn: "2026-11-02" }),
    line({ id: "sav-hidden", kind: "expense-fixed", concept: "Ahorro oculto dep", amountMinor: 40000, categoryId: "x-ahorro", subId: "x.ahorro.secreto", bookedOn: "2026-11-03" }),
    line({ id: "debt-line", kind: "expense-fixed", concept: "Crédito consumo", amountMinor: 15000, categoryId: "f-creditos", subId: "f.creditos.consumo", balanceMinor: 200000, bookedOn: "2026-11-01" }),
    line({ id: "remit1", kind: "expense-fixed", concept: "Remesa mamá", amountMinor: 20000, categoryId: "f-remesas", subId: "f.remesas.envios", to: "p1" }),
    line({ id: "remit-inc", kind: "income-variable", concept: "Reembolso", amountMinor: 9999, categoryId: "f-remesas", subId: "f.remesas.envios" }),
    line({ id: "hidden-spend", kind: "expense-variable", concept: "Cine secreto", amountMinor: 12345, categoryId: "v-entretenimiento" }),
    line({ id: "cu-netflix", kind: "subscription", concept: "Netflix", amountMinor: 1599, nextDue: "2026-11-09" }),
    line({ id: "cu-gym", kind: "subscription", concept: "Gym vencido", amountMinor: 2500, nextDue: "2026-11-02" }),
    line({ id: "dup1", seriesId: "dup-series", kind: "subscription", concept: "Dup", amountMinor: 4000, nextDue: "2026-11-12" }),
    line({ id: "dup2", seriesId: "dup-series", kind: "subscription", concept: "Dup", amountMinor: 4000, nextDue: "2026-11-12" }),
    line({ id: "cu-lejos", kind: "subscription", concept: "Lejos", amountMinor: 9000, nextDue: "2026-12-18" }),
  ];
  const dec: Line[] = [
    line({ id: "cu-dic", kind: "subscription", concept: "Cuota diciembre", amountMinor: 7777, monthKey: "2026-12", nextDue: "2026-12-05" }),
  ];
  s = { ...s, months: { "2026-09": { lines: sep }, "2026-10": { lines: oct }, "2026-11": { lines: nov }, "2026-12": { lines: dec } },
    remitPeople: [{ id: "p1", name: "Persona Remesa" }] };
  s = addLoan(s, { id: "loan1", lender: "Banco Préstamo", who: "entity", kind: "interest", amountMinor: 150000, currency: "USD", aprBps: 0, takenOn: "2026-09-01", dueDay: 20, book: "fixed", note: "" });
  s = payLoan(s, "loan1", 20000, "2026-11-05", "pay-nov", "Pago préstamo", 5000);
  s = payLoan(s, "loan1", 30000, "2026-12-15", "pay-future", "Pago futuro");
  s = addLent(s, { id: "lent1", person: "Ana Prestada", kind: "plain", amountMinor: 50000, currency: "USD", aprBps: 0, startedOn: "2026-10-01", dueOn: "2026-11-20", note: "" });
  s = payLent(s, "lent1", 10000, "2026-10-15", "lent-pay", "Abono Ana");
  s = addReading(s, "card-paypal", { balanceMinor: 42000, minMinor: 3500, dueOn: "2026-11-15", src: "manual", on: "2026-11-02" }, "2026-11-02");
  s = putCard(s, { id: "card-x", name: "TarjetaX", issuer: "BancoX", mark: "", color: "", last4: "9999", currency: "USD", limitMinor: 100000, dueDay: 5, aprBps: 2400, autopay: null, rewards: "", snaps: [{ on: "2026-11-01", at: "2026-11-01T00:00:00.000Z", balanceMinor: 30000, minMinor: 50000, src: "manual" }] });
  s = putCard(s, { id: "card-y", name: "TarjetaY", issuer: "BancoY", mark: "", color: "", last4: "8888", currency: "USD", limitMinor: 100000, dueDay: 25, aprBps: 2400, autopay: null, rewards: "", snaps: [{ on: "2026-11-01", at: "2026-11-01T00:00:00.000Z", balanceMinor: 25000, src: "manual" }] });
  return s;
}

describe("P1 — el mismo FITID dos veces dentro de un archivo", () => {
  const names = { cat: (id: string) => id, sub: (id: string) => id, purchase: (id: string) => id };
  const ofxFile = (rows: ParsedFile["rows"]): ParsedFile => ({ name: "tarjeta.ofx", format: "ofx", bank: "chase", kind: "card", sig: "ofx:test", rows });

  it("la segunda copia nace duplicada exacta, fuera de la importación, con su razón", () => {
    const f = ofxFile([
      { date: "2026-10-15", amount: -2599, desc: "STORE A", id: "FIT-1" },
      { date: "2026-10-15", amount: -2599, desc: "STORE A", id: "FIT-1" },
    ]);
    const rv = buildReview(createInitial("es", "claro"), [f], ["acct-chase-card"], names, "es");
    assert.equal(rv.rows[0].include, true);
    assert.equal(rv.rows[1].dup, "exact");
    assert.equal(rv.rows[1].include, false);
    assert.equal(rv.rows[1].dupOf?.day, "2026-10-15");
    assert.ok((rv.rows[1].dupOf?.concept ?? "").length > 0);
  });

  it("dos FITID distintos en el mismo archivo entran los dos", () => {
    const f = ofxFile([
      { date: "2026-10-15", amount: -2599, desc: "STORE A", id: "FIT-1" },
      { date: "2026-10-16", amount: -1000, desc: "STORE B", id: "FIT-2" },
    ]);
    const rv = buildReview(createInitial("es", "claro"), [f], ["acct-chase-card"], names, "es");
    assert.deepEqual(rv.rows.map((r) => r.include), [true, true]);
  });
});

describe("P2 — una línea inactiva nunca reclama una fila entrante", () => {
  const names = { cat: (id: string) => id, sub: (id: string) => id, purchase: (id: string) => id };
  const cardFile = (rows: ParsedFile["rows"]): ParsedFile => ({ name: "tarjeta.csv", format: "csv", bank: "chase", kind: "card", sig: "csv:chase-test", rows });
  const deadLine = (extra: Partial<Line> = {}): Line => line({
    id: "dead", kind: "expense-variable", concept: "Amazon", amountMinor: 2599,
    monthKey: "2026-10", categoryId: "v-personales", subId: "v.p.otros", bookedOn: "2026-10-28", active: false, ...extra,
  });
  const withLine = (l: Line): LedgerState => {
    const s0 = createInitial("es", "claro");
    const s: LedgerState = { ...s0, settings: { ...s0.settings, display: "USD" } };
    return { ...s, months: { ...s.months, "2026-10": { lines: [l] } } };
  };

  it("por el nombre (sin cuenta en la línea): la compra nueva entra", () => {
    const rv = buildReview(withLine(deadLine()), [cardFile([{ date: "2026-10-28", amount: -2599, desc: "AMZN Mktp*2K4" }])], [""], names, "es");
    assert.ok(!rv.rows[0].dup);
    assert.equal(rv.rows[0].include, true);
  });

  it("con cuenta en la línea y fila sin cuenta (cae al nombre): la compra nueva entra", () => {
    const rv = buildReview(withLine(deadLine({ sourceId: "acct-chase-card" })), [cardFile([{ date: "2026-10-28", amount: -2599, desc: "AMZN Mktp*2K4" }])], [""], names, "es");
    assert.ok(!rv.rows[0].dup);
    assert.equal(rv.rows[0].include, true);
  });

  it("control: la misma línea ACTIVA sí reclama por el nombre", () => {
    const rv = buildReview(withLine(deadLine({ active: true })), [cardFile([{ date: "2026-10-28", amount: -2599, desc: "AMZN Mktp*2K4" }])], [""], names, "es");
    assert.equal(rv.rows[0].dup, "fuzzy");
    assert.equal(rv.rows[0].include, false);
  });
});

describe("D1 — el widget consume duesWindow y cuadra consigo mismo", () => {
  const s = buildBook();
  const snap = buildWidgetSnapshot(s, "es", { today: TODAY, hide: false, lock: false });
  const win = duesWindow(s, 31, TODAY);

  it("la suma del widget es la suma de la ventana (sin lo prestado, sin montos inventados)", () => {
    const entries = win.filter((e) => e.kind !== "lent");
    const winSum = entries.reduce((a, e) => a + (e.amt ?? 0), 0);
    assert.equal(winSum, 80476); // 74376 de la auditoría (30 días) + 6100 de la cuota de bucket pasado (P4)
    // El snapshot muestra las primeras 8 de la ventana, en su orden — ni una más, ni una distinta.
    assert.equal(snap.dues.length, Math.min(8, entries.length));
    assert.deepEqual(snap.dues.map((d) => d.on), entries.slice(0, 8).map((e) => e.on));
    assert.equal(snap.dues.reduce((a, d) => a + (d.amt ?? 0), 0), entries.slice(0, 8).reduce((a, e) => a + (e.amt ?? 0), 0));
  });

  it("el mínimo de una tarjeta nunca supera su saldo; sin mínimo entra el saldo", () => {
    // En el widget las tarjetas se nombran por su banco emisor (único aquí), como siempre.
    assert.equal(snap.dues.find((d) => d.name === "BancoX")?.amt, 30000); // mínimo anotado 50000 > saldo 30000
    assert.equal(snap.dues.find((d) => d.name === "BancoY")?.amt, 25000); // sin mínimo: el saldo, no una omisión
  });

  it("el préstamo aparece por su día, sin monto inventado y sin nombre de persona ni de banco", () => {
    const loan = snap.dues.find((d) => d.kind === "loan");
    assert.ok(loan);
    assert.equal(loan.on, "2026-11-20");
    assert.equal(loan.amt, null);
    const text = JSON.stringify(snap);
    assert.equal(text.includes("Ana Prestada"), false);
    assert.equal(text.includes("Banco Préstamo"), false);
  });

  it("los bolsillos del snapshot suman el total de Ahorros, cuentas incluidas", () => {
    assert.equal(savingsStock(s, KEY).total, 670000);
    assert.equal(savingsOf(s, KEY, "es").total, 670000);
    assert.equal(snap.saveTotal, 670000);
    assert.equal(snap.pockets.reduce((a, p) => a + p.amt, 0), snap.saveTotal);
    assert.ok(snap.pockets.length > 4); // la quinta bolsa (el resto) ya no se corta
  });
});

describe("P4 — cotas de la ventana y del interés", () => {
  const s = buildBook();

  it("duesWindow encuentra la cuota archivada en un bucket pasado con nextDue en la ventana", () => {
    const win = duesWindow(s, 31, TODAY);
    const past = win.find((e) => e.id === "cu-pasada");
    assert.ok(past);
    assert.equal(past.on, "2026-11-20");
    assert.equal(past.amt, 6100);
    assert.equal(win.some((e) => e.id === "cu-vieja"), false); // la de su propia era sigue enterrada
    assert.equal(win.filter((e) => e.id === "dup1" || e.id === "dup2").length, 1); // serie+día, una sola vez
  });

  it("un reparto de interés fechado en el futuro aún no es interés pagado", () => {
    let st = createInitial("es", "claro");
    st = addLoan(st, { id: "lf", lender: "Banco", who: "entity", kind: "interest", amountMinor: 100000, currency: "USD", aprBps: 0, takenOn: "2026-09-01", book: "fixed", note: "" });
    st = payLoan(st, "lf", 30000, "2026-12-15", "pf", "Pago futuro", 5000);
    const loan = loansOf(st)[0];
    assert.equal(loanInterestPaid(st, loan, undefined, "2026-11-08"), 0);
    assert.equal(loanInterestPaid(st, loan, undefined, "2026-12-31"), 5000);
    assert.equal(loanInterestPaid(buildBook(), loansOf(buildBook())[0], undefined, TODAY), 5000); // el de noviembre sí cuenta
  });
});

describe("D2 — la exportación: nombres visibles y deuda real", () => {
  const s = buildBook();
  const pick: ExportPick = { scope: "month", activeOnly: false, kinds: ["expense-variable"], savings: true, debt: true, summary: true, charts: false, advice: false, remit: false };
  const sheets = buildSheets(s, KEY, "es", makeNamer(s.structure, "es"), pick);

  it("ningún nombre oculto se imprime en el libro", () => {
    const text = JSON.stringify(sheets);
    assert.equal(text.includes("OCULTO-ENTRET"), false);
    assert.equal(text.includes("OCULTO-AHORRO"), false);
    assert.equal(text.includes("SECRETO-POCKET"), false);
  });

  it("«Total de deudas» es totalDebt(): saldos, no los pagos del mes", () => {
    assert.equal(totalDebt(s, TODAY), 427000); // 42000 + 30000 + 25000 tarjetas + 130000 préstamo + 200000 línea rol deuda
    let found: number | null = null;
    for (const sh of sheets) for (const row of sh.rows) {
      const cells = row.map((c) => (c && typeof c === "object" ? c.v : c));
      const at = cells.indexOf("Total de deudas");
      if (at >= 0) found = cells[at + 1] as number;
    }
    assert.equal(found, 4270);
  });
});

describe("D3 — el colchón del Asesor significa una sola cosa", () => {
  it("total menos retiro, haya o no dinero en Emergencia", () => {
    const s = buildBook();
    const names = makeNamer(s.structure, "es");
    const withEm = readAdvisor(s, KEY, "es", names, { today: new Date(2026, 10, 8) });
    assert.equal(withEm.cushionStock, 170000); // 670000 − 500000; la lectura vieja decía 20000 (solo el bolsillo)
    const nov = s.months[KEY].lines.filter((l) => l.id !== "sav-emerg");
    const s2 = { ...s, months: { ...s.months, [KEY]: { lines: nov } } };
    const without = readAdvisor(s2, KEY, "es", names, { today: new Date(2026, 10, 8) });
    assert.equal(without.cushionStock, 150000); // 650000 − 500000: la misma definición, sin salto
  });
});

describe("P3 — una línea OCR con límite y saldo a la vez", () => {
  it("el límite no se convierte en saldo: cada cifra tras su etiqueta, ambas con duda", () => {
    const [r] = parseCardShot("Chase Freedom Unlimited\nCredit limit $5,000.00 Current balance $250.00", TODAY);
    assert.ok(r);
    assert.equal(r.balanceMinor, 25000);
    assert.equal(r.limitMinor, 500000);
    assert.ok(r.unsure.includes("balance"));
    assert.ok(r.unsure.includes("limit"));
  });

  it("también con el saldo primero", () => {
    const [r] = parseCardShot("Chase Freedom Unlimited\nCurrent balance $250.00 Credit limit $5,000.00", TODAY);
    assert.ok(r);
    assert.equal(r.balanceMinor, 25000);
    assert.equal(r.limitMinor, 500000);
    assert.ok(r.unsure.includes("balance"));
    assert.ok(r.unsure.includes("limit"));
  });
});
