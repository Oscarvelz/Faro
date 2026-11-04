// Statement OCR parser (node --test --experimental-strip-types src/lib/faro/stmtocr.test.ts).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { amountMinor, datesIn, parseStatement } from "./stmtocr.ts";

const PRIMERICA = `PRIMERICA
Your Quarterly Account Statement
Statement Period: 07/01/2026 - 09/30/2026
Account Summary          This Period    Year to Date
Beginning Account Value  $12,034.10     $10,200.00
Total Contributions      $600.00        $1,800.00
Withdrawals              $0.00          $0.00
Fees                     ($12.50)       ($37.50)
Change in Value          $378.40        $1,037.60
Account Value            $13,000.00     $13,000.00`;

const ES = `Estado de cuenta de retiro
Periodo del 1 de agosto de 2026 al 31 de agosto de 2026
Saldo inicial 5.000,00
Aportes 250,00
Cambio de valor -48,75
Retiros 0,00
Comisiones 3,25
Valor de la cuenta
5.198,00`;

describe("stmtocr", () => {
  it("reads amounts", () => {
    assert.equal(amountMinor("$1,234.56"), 123456);
    assert.equal(amountMinor("1.234,56"), 123456);
    assert.equal(amountMinor("($12.50)"), -1250);
    assert.equal(amountMinor("-3.10"), -310);
  });
  it("reads dates", () => {
    assert.deepEqual(datesIn("As of September 30, 2026", false), ["2026-09-30"]);
    assert.deepEqual(datesIn("al 31 de agosto de 2026", true), ["2026-08-31"]);
    assert.deepEqual(datesIn("31/08/2026", false), ["2026-08-31"]);
  });
  it("reads a Primerica-style statement", () => {
    const r = parseStatement(PRIMERICA);
    assert.equal(r.end, "2026-09-30");
    assert.equal(r.start, "2026-07-01");
    assert.equal(r.month, "2026-09");
    assert.equal(r.value, 1300000);
    assert.equal(r.contrib, 60000);
    assert.equal(r.change, 37840);
    assert.equal(r.withdraw, 0);
    assert.equal(r.fees, 1250);
    assert.equal(r.currency, "USD");
  });
  it("reads a Spanish statement, value on the next line", () => {
    const r = parseStatement(ES);
    assert.equal(r.end, "2026-08-31");
    assert.equal(r.value, 519800);
    assert.equal(r.contrib, 25000);
    assert.equal(r.change, -4875);
    assert.equal(r.withdraw, 0);
    assert.equal(r.fees, 325);
  });
  it("tolerates OCR noise and missing fields", () => {
    const r = parseStatement("Account Value: $ 9,876.54\nas of Oct 31, 2026");
    assert.equal(r.value, 987654);
    assert.equal(r.month, "2026-10");
    assert.equal(r.contrib, null);
    assert.equal(parseStatement("nothing here").value, null);
  });
});
