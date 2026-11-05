// Credit card screenshot reader (1.3.107). Synthetic look-alike text only (tools/fixtures/cards/make.py): no real data.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchCard, parseCardShot, readLimit, rowsOf } from "./cardparse.ts";

const T = "2026-11-05";
const PAYPAL_DARK = `PayPal Cashback World Masterca... X
Current balance
$432.10 P.
Available credit $4,567.90 <
Min payment due $35.00
Autopay | On >
Make a Payment
Rewards
Cash back >
$12.34 $98.76
Current Year to Date`;
const WF_LIGHT = `Good morning
WELLS FARGO ACTIVE CASH VISA®
CARD ...9021
$2,045.67
Outstanding balance
$58.20 cash rewards »
Your FICO® Score did not change
7311 Updated 11/01/2026
Offers Browse all >
Enjoy $300 with a new checking account`;
const ES = `Tarjeta Capital One Quicksilver ••••5530
Saldo actual $1.250,40
Crédito disponible $3.749,60
Límite de crédito $5.000,00
Pago mínimo $40,00
Fecha de pago 28 nov 2026
Tasa de interés anual 27,24%
Recompensas: 1,5% en todo`;

describe("card screenshot reader", () => {
  it("PayPal-like dark screen: balance under its label, available, minimum, autopay; rewards ignored", () => {
    const [r, more] = parseCardShot(PAYPAL_DARK, T);
    assert.equal(more, undefined);
    assert.equal(r.title, "PayPal Cashback World Mastercard");
    assert.equal(r.issuer, "paypal");
    assert.equal(r.balanceMinor, 43210);
    assert.equal(r.availMinor, 456790);
    assert.equal(r.minMinor, 3500);
    assert.equal(r.autopay, true);
    assert.equal(readLimit(r), 500000);
    assert.deepEqual(r.unsure, []);
  });
  it("Wells Fargo-like light home: amount above 'Outstanding balance', last 4 from the wrapped title, FICO as info only", () => {
    const [r] = parseCardShot(WF_LIGHT, T);
    assert.equal(r.issuer, "wellsfargo");
    assert.equal(r.last4, "9021");
    assert.match(r.title, /WELLS FARGO ACTIVE CASH VISA/);
    assert.equal(r.balanceMinor, 204567);
    assert.equal(r.availMinor, null);
    assert.equal(r.fico, 731);
    assert.equal(r.minMinor, null);
  });
  it("Spanish wording with limit, due date and APR", () => {
    const [r] = parseCardShot(ES, T);
    assert.equal(r.issuer, "capitalone");
    assert.equal(r.last4, "5530");
    assert.equal(r.balanceMinor, 125040);
    assert.equal(r.availMinor, 374960);
    assert.equal(r.limitMinor, 500000);
    assert.equal(r.minMinor, 4000);
    assert.equal(r.dueOn, "2026-11-28");
    assert.equal(r.aprBps, 2724);
  });
  it("label and value columns read apart are joined by row when boxes exist", () => {
    const b = (y: number, x = 60) => ({ x0: x, y0: y, x1: x + 300, y1: y + 40 });
    const rows = rowsOf([
      { text: "Discover it Card ending in 4417", box: b(70) }, { text: "Current Balance", box: b(180) }, { text: "Purchase APR", box: b(260) },
      { text: "$310.00", box: b(182, 800) }, { text: "18.24%", box: b(258, 820) },
    ]);
    assert.deepEqual(rows, ["Discover it Card ending in 4417", "Current Balance $310.00", "Purchase APR 18.24%"]);
    const [r] = parseCardShot(rows.join("\n"), T);
    assert.equal(r.issuer, "discover");
    assert.equal(r.last4, "4417");
    assert.equal(r.balanceMinor, 31000);
    assert.equal(r.aprBps, 1824);
  });
  it("a bank home with two cards gives two readings", () => {
    const reads = parseCardShot(`Citi Double Cash Card ...1111\nCurrent balance $100.00\nAvailable credit $900.00\nChase Freedom Unlimited ...2222\nCurrent balance $50.00`, T);
    assert.equal(reads.length, 2);
    assert.deepEqual(reads.map((r) => [r.issuer, r.last4, r.balanceMinor]), [["citi", "1111", 10000], ["chase", "2222", 5000]]);
  });
  it("matches a reading to a card by last 4, then issuer and name; unknown bank → no match", () => {
    const cards = [
      { id: "a", name: "Wells Fargo Active Cash", issuer: "Wells Fargo", mark: "wellsfargo", last4: "" },
      { id: "b", name: "PayPal Cashback World Mastercard", issuer: "PayPal", mark: "paypal", last4: "" },
      { id: "c", name: "Mi Visa", issuer: "Banco Demo", mark: "", last4: "9021" },
    ];
    assert.deepEqual(matchCard({ title: "PayPal Cashback World Mastercard", issuer: "paypal", last4: "" }, cards).id, "b");
    assert.equal(matchCard({ title: "x", issuer: "", last4: "9021" }, cards).id, "c");
    const wf = matchCard({ title: "WELLS FARGO ACTIVE CASH VISA CARD", issuer: "wellsfargo", last4: "" }, cards);
    assert.equal(wf.id, "a"); assert.equal(wf.sure, true);
    assert.equal(matchCard({ title: "Discover it", issuer: "discover", last4: "4417" }, cards).id, "");
  });
});
