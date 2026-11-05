// Escanear parser (node --import ./tools/ts-hook.mjs --experimental-strip-types --test src/lib/faro/receiptparse.test.ts).
// Synthetic texts only (never real personal data).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { amountsIn, cleanAppName, datesLoose, isDuplicate, parseScan, scanKind } from "./receiptparse.ts";

const TODAY = "2026-11-04";

// Shape of a Google Play subscriptions list (EN, as tesseract reads it: a stray icon letter, "Al" for "AI", benefits after).
const PLAY_EN = `Subscriptions
Notefold - Al Notes Assistant
Premium Yearly A
Next payment: $49.99 on Jan 18, 2027
Readwise Lite: Books Aloud
Ultra Plan
Next payment: $89.00 on Feb 9, 2027
Google One
Google Al Plus (2 TB)
Next payment: $99.99 on Oct 20, 2027
Your plan includes
VY Expanded storage across Drive, Gmail, and
Photos
Y Direct support from Google experts`;

const PLAY_ES = `Suscripciones
Notefold - Asistente de notas
Premium Anual
Próximo pago: US$49.99 el 18 ene 2027
Duolingo Super
Mensual
Próximo pago: US$12.99 el 3 dic 2026`;

const PLAY_OLD = `Suscripciones
YouTube Premium
$13.99/mes · Se renueva el 12 nov
Duolingo Super
$12.99/mes · Se renueva el 3 dic
Spotify Premium
$11.99/mes
Se renueva el 20 nov`;

const APPLE = `Subscriptions
Apple Music
Renews November 20 ($10.99)
iCloud+
$2.99/month
Renews December 1`;

const EMAIL = `Your subscription confirmation
App: Calm Sleep
Subscription: Calm Premium
Price: $69.99 per year
Next billing date: March 3, 2027`;

const PUBLIX = `PUBLIX SUPER MARKETS
1234 Example Rd
Miami, FL 33157
Store Mgr: Sample Name
Bananas 1.29
Milk Whole Gal 4.59
Bread 3.49
Subtotal 9.37
Sales Tax 0.00
Order Total 9.37
Grand Total 9.37
Cash 20.00
Change 10.63
10/30/2026 14:22`;

const EN_RECEIPT = `Corner Coffee Co.
Receipt #4411
Latte 4.75
Croissant 3.25
Subtotal 8.00
Tax 0.56
Tip 1.50
TOTAL $10.06
Date: Nov 2, 2026`;

const ES_RECEIPT = `SUPERMERCADO LA UNION
RUC J0310000000000
Fecha: 01/11/2026
Arroz 45,00
Frijoles 60,50
Total a pagar C$ 105,50
Efectivo C$ 200,00
Cambio C$ 94,50
Gracias por su compra`;

describe("readers", () => {
  it("reads amounts with $, US$, C$ and no sign", () => {
    assert.deepEqual(amountsIn("Next payment: $59.99 on Jan 28, 2027").map((a) => a.v), [5999]);
    assert.deepEqual(amountsIn("Próximo pago: US$59.99 el 28 ene 2027").map((a) => a.v), [5999]);
    assert.equal(amountsIn("Total a pagar C$ 105,50")[0].cur, "NIO");
    assert.deepEqual(amountsIn("Milk 4.59").map((a) => a.v), [459]);
    assert.deepEqual(amountsIn("Jan 28,2027").map((a) => a.v), []);
  });
  it("dates without a year roll forward from today", () => {
    assert.deepEqual(datesLoose("Se renueva el 12 nov", TODAY), ["2026-11-12"]);
    assert.deepEqual(datesLoose("Renews November 2", TODAY), ["2027-11-02"]);
    assert.deepEqual(datesLoose("Próximo pago: US$49.99 el 18 ene 2027", TODAY), ["2027-01-18"]);
  });
  it("cleans app names", () => {
    assert.equal(cleanAppName("Notefold - AI Notes Assistant"), "Notefold");
    assert.equal(cleanAppName("Readwise Lite: Books Aloud"), "Readwise Lite");
    assert.equal(cleanAppName("Google One"), "Google One");
  });
  it("tells a subscriptions screen from a receipt", () => {
    assert.equal(scanKind(PLAY_EN), "subscription");
    assert.equal(scanKind(PUBLIX), "receipt");
    assert.equal(scanKind(EN_RECEIPT), "receipt");
  });
});

describe("subscriptions", () => {
  it("Google Play EN list: three drafts, benefits ignored", () => {
    const d = parseScan(PLAY_EN, TODAY);
    assert.equal(d.length, 3);
    assert.deepEqual(d.map((x) => x.concept), ["Notefold", "Readwise Lite", "Google One"]);
    assert.deepEqual(d.map((x) => x.amountMinor), [4999, 8900, 9999]);
    assert.deepEqual(d.map((x) => x.date), ["2027-01-18", "2027-02-09", "2027-10-20"]);
    assert.deepEqual(d.map((x) => x.cadence), ["yearly", "yearly", "yearly"]);
    assert.deepEqual(d.map((x) => x.unsure.includes("cadence")), [false, true, true]);
    assert.equal(d[0].note, "Premium Yearly");
    assert.equal(d[2].note, "Google AI Plus (2 TB)");
    assert.equal(d[2].brand, "googleone");
    assert.ok(d.every((x) => x.book === "subscription"));
  });
  it("Google Play ES detail lines", () => {
    const d = parseScan(PLAY_ES, TODAY);
    assert.deepEqual(d.map((x) => [x.concept, x.amountMinor, x.date, x.cadence]), [
      ["Notefold", 4999, "2027-01-18", "yearly"],
      ["Duolingo Super", 1299, "2026-12-03", "monthly"],
    ]);
    assert.equal(d[1].brand, "duolingo");
  });
  it("older Play list with /mes and renew lines (3 apps, brands)", () => {
    const d = parseScan(PLAY_OLD, TODAY);
    assert.deepEqual(d.map((x) => [x.concept, x.amountMinor, x.date, x.cadence]), [
      ["YouTube Premium", 1399, "2026-11-12", "monthly"],
      ["Duolingo Super", 1299, "2026-12-03", "monthly"],
      ["Spotify Premium", 1199, "2026-11-20", "monthly"],
    ]);
    assert.deepEqual(d.map((x) => x.brand), ["ytpremium", "duolingo", "spotify"]);
    assert.ok(d.every((x) => !x.unsure.length));
  });
  it("Apple subscriptions", () => {
    const d = parseScan(APPLE, TODAY);
    assert.deepEqual(d.map((x) => [x.concept, x.amountMinor, x.date]), [["Apple Music", 1099, "2026-11-20"], ["iCloud+", 299, "2026-12-01"]]);
    assert.deepEqual(d.map((x) => x.brand), ["applemusic", "icloud"]);
  });
  it("confirmation email", () => {
    const d = parseScan(EMAIL, TODAY);
    assert.equal(d.length, 1);
    assert.deepEqual([d[0].concept, d[0].amountMinor, d[0].date, d[0].cadence], ["Calm Sleep", 6999, "2027-03-03", "yearly"]);
    assert.equal(d[0].note, "Calm Premium");
  });
});

describe("receipts", () => {
  it("Publix-like: merchant, grand total (not cash), date → Compras", () => {
    const [d] = parseScan(PUBLIX, TODAY);
    assert.equal(d.type, "receipt");
    assert.equal(d.concept, "Publix Super Markets");
    assert.equal(d.amountMinor, 937);
    assert.equal(d.date, "2026-10-30");
    assert.equal(d.book, "purchase");
    assert.equal(d.category, "hogar");
    assert.deepEqual(d.unsure, []);
  });
  it("English café receipt → Variables · Hormiga", () => {
    const [d] = parseScan(EN_RECEIPT, TODAY);
    assert.deepEqual([d.concept, d.amountMinor, d.date, d.book, d.category], ["Corner Coffee Co.", 1006, "2026-11-02", "expense-variable", "v-hormiga"]);
  });
  it("Spanish receipt in córdobas, day first", () => {
    const [d] = parseScan(ES_RECEIPT, TODAY);
    assert.deepEqual([d.concept, d.amountMinor, d.currency, d.date], ["Supermercado La Union", 10550, "NIO", "2026-11-01"]);
  });
  it("no TOTAL word: the largest amount, flagged", () => {
    const [d] = parseScan("Kiosk Uno\nItem 3.00\nItem 7.50\nCash 20.00", TODAY);
    assert.equal(d.amountMinor, 750);
    assert.ok(d.unsure.includes("amount"));
  });
});

describe("duplicates", () => {
  it("same concept + amount + day is a duplicate", () => {
    const ledger = [{ concept: "YouTube Premium", amountMinor: 1399, nextDue: "2026-12-12" }];
    assert.equal(isDuplicate({ concept: "YouTube Premium", amountMinor: 1399, date: "2026-11-12" }, ledger), true);
    assert.equal(isDuplicate({ concept: "YouTube Premium", amountMinor: 1499, date: "2026-11-12" }, ledger), false);
    assert.equal(isDuplicate({ concept: "Spotify", amountMinor: 1399, date: "2026-11-12" }, ledger), false);
  });
});
