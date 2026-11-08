// Batería Oleada 4 (1.3.149): modelo nuevo — día de pago en préstamos y UNA ventana de vencimientos,
// interés PAGADO con reparto capital/interés, y la vista del año. Cada prueba fija un arreglo de la
// oleada sobre datos sintéticos: el préstamo con día aparece en la ventana única y las superficies
// (reglas, Asesor) concuerdan en el mismo libro; el reparto baja el saldo por el total y el interés
// pagado es exacto por año y de por vida; el pago legado sin reparto se comporta como en 1.3.148;
// el año es la suma de los doce summarize y el ahorro se parte en los tres tipos de Oscar.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { duesWindow, nextDueDayOn } from "./dues.ts";
import { summarize } from "./engine.ts";
import { accruedUnpaidInterest, addLoan, interestPaidTotal, loanInterestPaid, loanState, loansOf, normalizeLoan, payLoan, todayIso } from "./loans.ts";
import { adviceRules } from "./rules.ts";
import { yearReport, yearsWithData } from "./year.ts";
import type { CreditCard, LedgerState, Line, Loan } from "./types.ts";

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

function base(): LedgerState {
  const ledger = createInitial("es", "claro");
  ledger.settings = { ...ledger.settings, display: "USD" };
  ledger.months = {};
  return ledger;
}

const names = (s: LedgerState) => makeNamer(s.structure, "es");
const TODAY = "2026-10-10";
const loanDue: Loan = { id: "L1", lender: "Banco Demo", who: "entity", kind: "interest", amountMinor: 100_000, currency: "USD", aprBps: 1200, takenOn: "2026-09-01", book: "fixed", note: "", dueDay: 20 };

describe("ventana única de vencimientos (arreglo 1)", () => {
  it("un préstamo con día de pago aparece en duesWindow, con su fecha y sin monto inventado", () => {
    const s = addLoan(base(), loanDue);
    const entries = duesWindow(s, 30, TODAY);
    const loan = entries.find((e) => e.kind === "loan");
    assert.ok(loan);
    assert.equal(loan.on, "2026-10-20");
    assert.equal(loan.name, "Banco Demo");
    assert.equal(loan.amt, null); // el modelo no guarda cuota: no se inventa cifra
    assert.equal(nextDueDayOn(31, "2026-11-10"), "2026-11-30"); // se ajusta al mes corto
    assert.equal(nextDueDayOn(5, "2026-10-10"), "2026-11-05"); // ya pasó este mes: el siguiente
  });

  it("sin día de pago, el préstamo no entra (comportamiento de 1.3.148)", () => {
    const { dueDay: _drop, ...noDue } = loanDue;
    const s = addLoan(base(), noDue as Loan);
    assert.equal(duesWindow(s, 30, TODAY).filter((e) => e.kind === "loan").length, 0);
  });

  it("las superficies concuerdan: ventana, regla de 14 días y nota del Asesor cuentan lo mismo", () => {
    let s = base();
    s.months = { "2026-10": { lines: [line({ id: "net", kind: "subscription", concept: "Netflix", amountMinor: 1599, monthKey: "2026-10", categoryId: "f-casa", subId: "f.casa.youtube", nextDue: "2026-10-20", cadence: "monthly" })] } };
    s = addLoan(s, loanDue);
    s.cards = [{ id: "c1", name: "Tarjeta Demo", issuer: "", mark: "", color: "#333", network: "", last4: "", currency: "USD", limitMinor: 100000, dueDay: 0, aprBps: 2400, autopay: false, rewards: "", snaps: [{ on: "2026-10-01", at: "2026-10-01T00:00:00Z", balanceMinor: 50000, minMinor: 2500, dueOn: "2026-10-15", src: "manual" }] } as unknown as CreditCard];

    const win14 = duesWindow(s, 14, TODAY).filter((e) => e.kind !== "lent" && e.on >= TODAY);
    assert.equal(win14.length, 3); // tarjeta + suscripción + préstamo
    const due = adviceRules(s, "2026-10", "es", names(s), { today: new Date(2026, 9, 10) }).find((r) => r.id === "due")!;
    assert.ok(due);
    assert.equal(due.v.count, 3);
    assert.equal(due.v.in14, 2500 + 1599); // el préstamo no suma: su monto no existe
    assert.equal(due.v.in7, 2500); // solo la tarjeta vence en 7 días

    const win30 = duesWindow(s, 30, TODAY).filter((e) => e.kind !== "lent" && e.on >= TODAY);
    const reading = readAdvisor(s, "2026-10", "es", names(s), { today: new Date(2026, 9, 10) });
    assert.equal(win30.length, 3);
    assert.match(reading.calendarNote, /3 pagos con fecha/);
    assert.match(reading.calendarNote, /\$40\.99/); // 2500 + 1599: ahora el Asesor también suma
  });
});

describe("interés pagado (arreglo 2)", () => {
  const loan: Loan = { id: "L1", lender: "Cooperativa Demo", who: "entity", kind: "interest", amountMinor: 100_000, currency: "USD", aprBps: 1200, takenOn: "2025-01-01", book: "fixed", note: "" };

  it("el reparto baja el saldo por el total y el interés pagado es exacto por año y de por vida", () => {
    let s = addLoan(base(), loan);
    s = payLoan(s, "L1", 20_000, "2025-06-15", "P0", "Préstamo", 8_000);
    s = payLoan(s, "L1", 30_000, "2026-06-15", "P1", "Préstamo", 12_000);
    const l0 = s.months["2025-06"].lines.find((l) => l.id === "P0")!;
    assert.equal(l0.interestMinor, 8_000);
    const f = loanState(s, loansOf(s)[0], "2026-06-15");
    assert.equal(f.paid, 50_000); // el saldo baja por capital + interés, como siempre
    assert.equal(loanInterestPaid(s, loansOf(s)[0]), 20_000);
    assert.equal(loanInterestPaid(s, loansOf(s)[0], 2025), 8_000);
    assert.equal(loanInterestPaid(s, loansOf(s)[0], 2026), 12_000);
    assert.equal(loanInterestPaid(s, loansOf(s)[0], 2024), 0);
    assert.equal(interestPaidTotal(s), 20_000);
    assert.equal(interestPaidTotal(s, 2026), 12_000);
  });

  it("el reparto se limita al monto del pago", () => {
    let s = addLoan(base(), loan);
    s = payLoan(s, "L1", 10_000, "2026-06-15", "P1", "Préstamo", 99_999);
    assert.equal(s.months["2026-06"].lines[0].interestMinor, 10_000);
    assert.equal(loanInterestPaid(s, loansOf(s)[0]), 10_000);
  });

  it("pago legado sin reparto: la línea no lleva interestMinor y nada se inventa", () => {
    let s = addLoan(base(), loan);
    s = payLoan(s, "L1", 20_000, "2026-06-15", "P1", "Préstamo");
    const l = s.months["2026-06"].lines[0];
    assert.equal("interestMinor" in l, false);
    assert.equal(loanInterestPaid(s, loansOf(s)[0]), 0);
    assert.equal(interestPaidTotal(s), 0);
    const f = loanState(s, loansOf(s)[0], "2026-06-15");
    assert.equal(f.paid, 20_000);
    assert.equal(f.left, f.interest + 100_000 - 20_000); // idéntico a 1.3.148
  });

  it("la sugerencia de interés: con repartos manda lo registrado; sin repartos, interés menos lo pagado", () => {
    let s = addLoan(base(), loan);
    s = payLoan(s, "L1", 20_000, "2025-06-15", "P0", "Préstamo", 8_000);
    const f = loanState(s, loansOf(s)[0], todayIso());
    assert.equal(accruedUnpaidInterest(s, loansOf(s)[0]), Math.max(0, f.interest - 8_000));
    let legacy = addLoan(base(), loan);
    legacy = payLoan(legacy, "L1", 5_000, "2025-06-15", "P0", "Préstamo");
    const fl = loanState(legacy, loansOf(legacy)[0], todayIso());
    assert.equal(accruedUnpaidInterest(legacy, loansOf(legacy)[0]), Math.max(0, fl.interest - Math.min(fl.paid, fl.interest)));
  });

  it("normalizeLoan conserva solo días de pago 1–31", () => {
    assert.equal(normalizeLoan({ ...loanDue }).dueDay, 20);
    assert.equal(normalizeLoan({ ...loanDue, dueDay: 0 }).dueDay, undefined);
    assert.equal(normalizeLoan({ ...loanDue, dueDay: 45 }).dueDay, undefined);
    assert.equal(normalizeLoan({ ...loanDue, dueDay: 15.6 }).dueDay, 16);
    const { dueDay: _d, ...sinDia } = loanDue;
    assert.equal(normalizeLoan(sinDia as Loan).dueDay, undefined);
  });
});

describe("la vista del año (arreglo 3)", () => {
  it("los totales del año son la suma de los doce summarize, y el ahorro se parte en tres tipos", () => {
    let s = base();
    s.months = {
      "2026-03": { lines: [
        line({ id: "inc1", kind: "income-fixed", concept: "Salario", amountMinor: 200_000, monthKey: "2026-03" }),
        line({ id: "food", kind: "expense-fixed", concept: "Despensa", amountMinor: 50_000, monthKey: "2026-03", categoryId: "f-alimentos", subId: "f.alimentos.despensa" }),
      ] },
      "2026-05": { lines: [
        line({ id: "em", kind: "expense-fixed", concept: "Emergencia", amountMinor: 5_000, monthKey: "2026-05", categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 40_000, bookedOn: "2026-05-10" }),
      ] },
      "2026-07": { lines: [
        line({ id: "inc2", kind: "income-fixed", concept: "Salario", amountMinor: 100_000, monthKey: "2026-07" }),
        line({ id: "fun", kind: "expense-variable", concept: "Salida", amountMinor: 30_000, monthKey: "2026-07", categoryId: "v-entretenimiento", subId: "v.entretenimiento.restaurantes" }),
        line({ id: "rem", kind: "expense-variable", concept: "Remesa", amountMinor: 20_000, monthKey: "2026-07", categoryId: "v-remesas" }),
      ] },
      "2026-08": { lines: [
        line({ id: "trip", kind: "expense-fixed", concept: "Viaje", amountMinor: 4_000, monthKey: "2026-08", categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 25_000, bookedOn: "2026-08-02" }),
      ] },
      "2026-11": { lines: [
        line({ id: "ret", kind: "expense-fixed", concept: "Retiro", amountMinor: 6_000, monthKey: "2026-11", categoryId: "f-ahorro", subId: "f.ahorro.retiro", balanceMinor: 90_000, bookedOn: "2026-11-05" }),
      ] },
    };
    const loan: Loan = { id: "L9", lender: "Banco Demo", who: "entity", kind: "interest", amountMinor: 80_000, currency: "USD", aprBps: 1200, takenOn: "2026-01-15", book: "fixed", note: "" };
    s = addLoan(s, loan);
    s = payLoan(s, "L9", 15_000, "2026-04-10", "PL9", "Préstamo", 3_500);

    const r = yearReport(s, 2026, "es", names(s));
    let inc = 0, exp = 0, rem = 0;
    for (let m = 1; m <= 12; m += 1) {
      const sum = summarize(s, `2026-${String(m).padStart(2, "0")}`, "es");
      inc += sum.income; exp += sum.expense; rem += sum.remittance;
    }
    assert.equal(r.income, inc);
    assert.equal(r.expense, exp);
    assert.equal(r.remittance, rem);
    assert.equal(r.net, inc - exp);
    assert.equal(r.months.length, 12);
    assert.equal(r.months[2].income, 200_000);
    assert.equal(r.months[6].net, 100_000 - 30_000 - 20_000);
    assert.deepEqual(r.savingsEnd, { total: 155_000, retirement: 90_000, emergency: 40_000, goals: 25_000 });
    assert.equal(r.interestPaid, 3_500);
    assert.ok(r.top.length >= 2);
    assert.deepEqual(yearsWithData(s), [2026]);
  });
});
