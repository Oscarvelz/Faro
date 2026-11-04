// Bank import parsers and review (node --test --experimental-strip-types src/lib/faro/bankparse.test.ts)
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { applyImport, buildReview, counts, fromPdf, parseDate, parseFile, parseMoney, pickSource, remap, revertImport, type ParsedFile } from "./bankparse.ts";
import { accounts, addAccount, archiveAccount, ensureAccounts, importBook, merchantKey, merchantLabel, newBonus, restoreAccount, rewardsMonth } from "./bankbook.ts";
import { parsePdfStatement, rowDate, type PdfDoc } from "./pdfstmt.ts";
import type { Category, LedgerState } from "./types.ts";

const FX = "/workspace/work/browser-test/fixtures/import";
const read = (f: string) => parseFile(f, fs.readFileSync(`${FX}/${f}`, "utf8"));
const sub = (id: string, name: string) => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0 });
const cat = (id: string, group: "fixed" | "variable", name: string, subs: [string, string][]): Category => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0, group, role: "", subs: subs.map(([a, b]) => sub(a, b)) });
function ledger(): LedgerState {
  return {
    v: 1, revision: 1, updatedAt: "", audit: [], months: {},
    settings: { lang: "es", theme: "claro", display: "USD", rateE4: 366243, rateSource: "", rateAsOf: "", savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {} },
    structure: {
      categories: [
        cat("f-alimentos", "fixed", "Alimentos", [["f.alimentos.despensa", "Despensa"]]),
        cat("f-transporte", "fixed", "Transporte", [["f.transporte.gasolina", "Gasolina"]]),
        cat("f-ahorro", "fixed", "Ahorro", [["vault-pp", "PayPal Ahorro"]]),
        cat("v-entretenimiento", "variable", "Entretenimiento", [["v.e.restaurantes", "Restaurantes"]]),
        cat("v-personales", "variable", "Personales", [["v.p.salud", "Farmacia"], ["v.p.otros", "Otros"]]),
      ].map((c) => (c.id === "f-ahorro" ? { ...c, role: "savings", subs: c.subs.map((s) => ({ ...s, icon: "vault" })) } : c)),
      purchases: [{ id: "otros", nameKey: "", customName: "Otros", icon: "Package", hidden: false, order: 0 }],
      catalog: [],
    },
  };
}
const names = { cat: (id: string) => id, sub: (id: string) => id, purchase: (id: string) => id };
function run(state: LedgerState, files: ParsedFile[]) {
  const book = importBook(state);
  const srcs = files.map((f) => pickSource(f, book, accounts(state)));
  const rv = buildReview(state, files, srcs, names);
  return { rv, srcs, c: counts(rv.rows) };
}

describe("readers", () => {
  it("dates", () => {
    assert.equal(parseDate("11/03/2026"), "2026-11-03");
    assert.equal(parseDate("03/11/2026", true), "2026-11-03");
    assert.equal(parseDate("20261103120000[-5:EST]"), "2026-11-03");
    assert.equal(parseDate("11/ 3'26"), "2026-11-03");
    assert.equal(parseDate("3 nov 2026"), "2026-11-03");
    assert.equal(parseDate("3 de noviembre de 2026"), "2026-11-03");
    assert.equal(parseDate("Nov 3, 2026"), "2026-11-03");
  });
  it("money", () => {
    assert.equal(parseMoney("-1,234.56"), -123456);
    assert.equal(parseMoney("1.234,56"), 123456);
    assert.equal(parseMoney("-45,90"), -4590);
    assert.equal(parseMoney("(12.50)"), -1250);
    assert.equal(parseMoney("12,50-"), -1250);
    assert.equal(parseMoney("US$ 5"), 500);
    assert.equal(parseMoney("$-3.10"), -310);
    assert.equal(parseMoney("abc"), null);
  });
  it("merchant names", () => {
    assert.equal(merchantKey("SQ *CAFE CRUZ Miami FL"), "cafe cruz");
    assert.equal(merchantKey("TST* LA CARRETA - KENDALL MIAMI FL"), "la carreta");
    assert.equal(merchantKey("PUBLIX #1234 MIAMI FL"), "publix");
    assert.equal(merchantKey("CVS/PHARMACY #08123 MIAMI FL"), "cvs pharmacy");
    assert.equal(merchantKey("STARBUCKS STORE 12345"), "starbucks");
    assert.equal(merchantKey("AMAZON MKTPL*2X3Y4Z1 Amzn.com/bill WA"), "amazon");
    assert.equal(merchantKey("KFC Z123456 STREET ANYTOWN FL"), "kfc");
    assert.equal(merchantKey("MCDONALD'S M7097 OF FL MIAMI FL"), "mcdonald's");
    assert.equal(merchantKey("365 MARKET N 888 000-0000 TROY MI"), "365 market n");
    assert.equal(merchantKey("Whaleco Commerce, LLC"), "temu");
    assert.equal(merchantLabel("Zelle Payment To Sample Landlord Wxyz98Uv76"), "Zelle → Sample Landlord");
    assert.equal(merchantLabel("Payment Sent 01/04 Rmtly* A1B2C Remitly.Com WA Card 0001"), "Remitly");
    assert.equal(merchantKey("PAYPAL *STEAMGAMES 402-935-7733 WA"), "steamgames");
  });
});

describe("formats", () => {
  it("Chase card CSV", () => { const f = read("chase-card-oct.csv"); assert.equal(f.bank, "chase"); assert.equal(f.kind, "card"); assert.equal(f.rows.length, 10); assert.equal(f.rows[0].category, "Food & Drink"); });
  it("Chase checking CSV", () => { const f = read("chase-checking-oct.csv"); assert.equal(f.kind, "checking"); assert.equal(f.rows.length, 7); assert.equal(f.rows[3].amount, 185000); });
  it("Chase QFX (SGML)", () => { const f = read("chase-card.qfx"); assert.equal(f.format, "ofx"); assert.equal(f.bank, "chase"); assert.equal(f.kind, "card"); assert.equal(f.tail, "4321"); assert.equal(f.rows.length, 4); assert.equal(f.rows[0].id, "2026110224692166305100117"); });
  it("State Farm QFX", () => { const f = read("statefarm.qfx"); assert.equal(f.bank, "statefarm"); assert.equal(f.kind, "card"); assert.equal(f.rows.length, 4); });
  it("OFX XML variant", () => {
    const xml = `<?xml version="1.0"?><?OFX OFXHEADER="200"?><OFX><SIGNONMSGSRSV1><SONRS><FI><ORG>B1</ORG><FID>10898</FID></FI></SONRS></SIGNONMSGSRSV1><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>267084131</BANKID><ACCTID>000123456789</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261005</DTPOSTED><TRNAMT>-10.00</TRNAMT><FITID>X1</FITID><NAME>TEST STORE</NAME></STMTTRN><STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261006</DTPOSTED><TRNAMT>20.50</TRNAMT><FITID>X2</FITID><NAME>REFUND</NAME></STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const f = parseFile("x.ofx", xml); assert.equal(f.kind, "checking"); assert.equal(f.bank, "chase"); assert.deepEqual(f.rows.map((r) => [r.id, r.amount]), [["X1", -1000], ["X2", 2050]]);
  });
  it("PayPal CSV", () => { const f = read("paypal-oct.csv"); assert.equal(f.bank, "paypal"); assert.equal(f.rows.length, 6); assert.equal(f.rows[0].fundedByCard, true); assert.equal(f.rows[5].balance, 25873); });
  it("PayPal QIF", () => { const f = read("paypal-oct.qif"); assert.equal(f.format, "qif"); assert.equal(f.bank, "paypal"); assert.equal(f.rows.length, 5); assert.equal(f.rows[4].amount, 184); });
  it("generic Spanish CSV with decimal commas", () => {
    const f = read("banco-generico.csv"); assert.ok(f.csv?.auto); assert.equal(f.csv!.map.dmy, true); assert.equal(f.rows.length, 4);
    assert.deepEqual(f.rows.map((r) => [r.date, r.amount]), [["2026-10-15", -4590], ["2026-10-16", -1235], ["2026-10-20", 125000], ["2026-10-28", -3000]]);
  });
  it("manual map for an unreadable CSV", () => {
    const f = parseFile("raro.csv", "A|B|C\nfoo|1/2/2026|x\n");
    const g = parseFile("raro.csv", "col1,col2,col3\nhola,15-10-2026,\"12,00\"\nadios,16-10-2026,\"3,50\"\n");
    assert.equal(f.rows.length, 0);
    const m = remap(g, { date: 1, desc: 0, amount: 2, debit: -1, credit: -1, invert: true, dmy: true });
    assert.deepEqual(m.rows.map((r) => r.amount), [-1200, -350]);
  });
});

describe("review and commit", () => {
  it("Chase card: counts, transfer, refund, seeds, rewards", () => {
    const s = ensureAccounts(ledger());
    const { rv, c, srcs } = run(s, [read("chase-card-oct.csv")]);
    assert.equal(srcs[0], "acct-chase-card");
    assert.equal(c.xfers, 1);
    assert.equal(c.fresh, 9);
    const cvs = rv.rows.find((r) => r.flow === "refund")!;
    assert.equal(cvs.target, "expense-variable|v-personales|v.p.salud");
    const pub = rv.rows.find((r) => r.key === "publix")!;
    assert.equal(pub.target, "expense-fixed|f-alimentos|f.alimentos.despensa"); assert.equal(pub.how, "seed"); assert.equal(pub.reward?.earned, 96); // Freedom Unlimited: groceries are 1.5%
  });
  it("commit, re-import adds nothing, learned rule, undo", () => {
    const s0 = ensureAccounts(ledger());
    let s = s0;
    const files = [read("chase-card-oct.csv"), read("chase-checking-oct.csv")];
    const a = run(s, files);
    const steam = a.rv.rows.find((r) => r.key === "steamgames")!;
    for (const r of a.rv.rows) if (r.key === "steamgames") r.target = "purchase|otros|";
    const res = applyImport(s, a.rv, files, a.srcs, "b1");
    s = res.state;
    const lines = s.months["2026-10"].lines;
    assert.equal(lines.length, a.rv.rows.filter((r) => r.include).length);
    assert.ok(importBook(s).rules.some((r) => r.key === "steamgames" && r.target === "purchase|otros|"));
    const chk = a.rv.rows.filter((r) => r.file === 1);
    assert.equal(chk.filter((r) => r.flow === "xfer").length, 3, "card payment, State Farm payment, PayPal transfer");
    assert.equal(chk.filter((r) => r.flow === "income").length, 2);
    const b = run(s, files);
    assert.equal(b.c.fresh, 0, "re-import → 0 new");
    // Same card in QFX: the two October purchases are duplicates, the two November ones are new.
    const q = run(s, [read("chase-card.qfx")]);
    assert.equal(q.c.fresh, 2); assert.equal(q.c.dups, 2);
    // Rule applies on the next file with that merchant.
    const again = buildReview(s, [parseFile("x.csv", "Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n11/04/2026,11/05/2026,PAYPAL *STEAMGAMES 402-935-7733 WA,Shopping,Sale,-4.99,\n")], ["acct-chase-card"], names);
    assert.equal(again.rows[0].target, "purchase|otros|"); assert.equal(again.rows[0].how, "rule"); void steam;
    const undone = revertImport(s, res.undo);
    assert.equal(undone.months["2026-10"].lines.length, 0);
    assert.deepEqual(undone.imports, s0.imports);
  });
  it("PayPal + Chase card: the Steam purchase counts once, PayPal name kept; transfers and interest", () => {
    const s = ensureAccounts(ledger());
    const files = [read("chase-card-oct.csv"), read("paypal-oct.csv")];
    const { rv, srcs } = run(s, files);
    const pp = rv.rows.find((r) => r.file === 1 && r.label.startsWith("Valve"))!;
    const card = rv.rows.find((r) => r.file === 0 && r.key === "steamgames")!;
    assert.ok(card.paired && !card.include); assert.ok(pp.include); assert.equal(pp.sourceId, "acct-chase-card"); assert.equal(pp.via, "acct-paypal");
    assert.ok(pp.id.includes("pp:5TY12345AB678901C"));
    assert.equal(rv.rows.filter((r) => r.file === 1 && r.flow === "xfer").length, 2, "card deposit + bank deposit");
    assert.equal(rv.rows.find((r) => r.flow === "interest")?.label, "Intereses");
    assert.equal(rv.rows.find((r) => r.label.startsWith("Etsy"))?.flow, "refund");
    const next = applyImport(s, rv, files, srcs, "b2").state;
    const steamLines = next.months["2026-10"].lines.filter((l) => l.amountMinor === 1999);
    assert.equal(steamLines.length, 1); assert.match(steamLines[0].concept, /^Valve/);
    // QIF of the same month after the CSV: nothing new.
    assert.equal(run(next, [read("paypal-oct.qif")]).c.fresh, 0);
    // Card first, PayPal later: the card line takes PayPal's name and id.
    const c0 = ensureAccounts(ledger());
    const c1 = run(c0, [read("chase-card-oct.csv")]);
    const cs = applyImport(c0, c1.rv, [read("chase-card-oct.csv")], c1.srcs, "c1").state;
    const c2 = run(cs, [read("paypal-oct.csv")]);
    assert.ok(c2.rv.rows.find((r) => r.label.startsWith("Valve"))!.paired);
    const cs2 = applyImport(cs, c2.rv, [read("paypal-oct.csv")], c2.srcs, "c2").state;
    const once = cs2.months["2026-10"].lines.filter((l) => l.amountMinor === 1999);
    assert.equal(once.length, 1); assert.match(once[0].concept, /^Valve/); assert.equal(once[0].via, "acct-paypal"); assert.match(once[0].importId!, /pp:5TY/);
    assert.equal(revertImport(cs2, applyImport(cs, c2.rv, [read("paypal-oct.csv")], c2.srcs, "c2").undo).months["2026-10"].lines.find((l) => l.amountMinor === 1999)!.concept, "Steamgames");
    // PayPal first, card later: the card copy folds into the PayPal line.
    const s2 = ensureAccounts(ledger());
    const p1 = run(s2, [read("paypal-oct.csv")]);
    const st2 = applyImport(s2, p1.rv, [read("paypal-oct.csv")], p1.srcs, "b3").state;
    const p2 = run(st2, [read("chase-card-oct.csv")]);
    assert.ok(p2.rv.rows.find((r) => r.key === "steamgames")!.paired);
    const st3 = applyImport(st2, p2.rv, [read("chase-card-oct.csv")], p2.srcs, "b4").state;
    const one = st3.months["2026-10"].lines.filter((l) => l.amountMinor === 1999);
    assert.equal(one.length, 1); assert.equal(one[0].sourceId, "acct-chase-card"); assert.equal(one[0].via, "acct-paypal");
  });
  it("rewards: real card rates; groceries on Chase flagged for Wells Fargo; monthly summary", () => {
    const s = ensureAccounts(ledger());
    const wf = run(s, [read("statefarm.qfx")]);
    assert.equal(wf.srcs[0], "acct-wf-card", "a file named State Farm goes to the Wells Fargo card");
    const sed = wf.rv.rows.find((r) => r.key.startsWith("sedano"))!;
    assert.equal(sed.rc, "grocery"); assert.equal(sed.reward?.rate, 200); assert.equal(sed.reward?.missed, 0);
    const files = [read("chase-card-oct.csv")];
    const { rv, srcs } = run(s, files);
    const pub = rv.rows.find((r) => r.key.startsWith("publix"))!;
    assert.equal(pub.reward?.best?.id, "acct-wf-card"); assert.equal(pub.reward?.missed, 32);
    const st = applyImport(s, rv, files, srcs, "b5").state;
    const m = rewardsMonth(st, "2026-10", "USD", 366243)!;
    assert.ok(m.missed >= 32); assert.equal(m.top?.best.id, "acct-wf-card");
  });
  it("old State Farm preset reads as Wells Fargo with its id kept; old factory rates move to the new ones", () => {
    const base = ledger();
    const old: LedgerState = { ...base, structure: { ...base.structure, catalog: [{ id: "acct-sf-card", nameKey: "", customName: "State Farm · tarjeta", icon: "CreditCard", hidden: false, order: 52, kind: "acct", urlTemplate: "" }, { id: "acct-chase-card", nameKey: "", customName: "Chase · tarjeta", icon: "CreditCard", hidden: false, order: 51, kind: "acct", urlTemplate: "" }] },
      imports: { sources: [{ id: "acct-sf-card", bank: "statefarm", kind: "card", rates: { other: 150 } }, { id: "acct-chase-card", bank: "chase", kind: "card", rates: { dining: 400, other: 100 } }], rules: [], maps: {} } };
    const a = accounts(old);
    const wf = a.find((x) => x.id === "acct-sf-card")!;
    assert.equal(wf.name, "Wells Fargo · tarjeta"); assert.equal(wf.rates.other, 200); assert.equal(wf.bank, "wellsfargo");
    assert.ok(!a.some((x) => x.id === "acct-wf-card"), "no second Wells Fargo account");
    assert.equal(a.find((x) => x.id === "acct-chase-card")!.rates.dining, 400, "edited rates stay");
    const e = ensureAccounts(old);
    assert.equal(e.structure.catalog.filter((c) => /Wells Fargo/.test(c.customName)).length, 1);
    assert.equal(pickSource(read("statefarm.qfx"), importBook(e), accounts(e)), "acct-sf-card");
    const fresh = accounts(ledger());
    assert.deepEqual(fresh.find((x) => x.id === "acct-chase-card")!.rates, { travel: 500, dining: 300, drug: 300, other: 150 });
    assert.deepEqual(fresh.find((x) => x.id === "acct-pp-card")!.rates, { online: 300, other: 150 });
  });
  it("PayPal balance goes to the linked savings account", () => {
    let s = ensureAccounts(ledger());
    s = { ...s, imports: { ...importBook(s), sources: importBook(s).sources.map((x) => (x.id === "acct-paypal" ? { ...x, pocketId: "vault-pp" } : x)) } };
    const files = [read("paypal-oct.csv")];
    const { rv, srcs } = run(s, files);
    const st = applyImport(s, rv, files, srcs, "b6").state;
    const acct = st.months["2026-10"].lines.find((l) => l.subId === "vault-pp")!;
    assert.equal(acct.balanceMinor, 25873);
  });
});

/* ------------------------------------------------------------------ statement PDFs (synthetic look-alikes, no real data) */
const PDF = `${FX}/pdf`;
const doc = (n: string): PdfDoc => JSON.parse(fs.readFileSync(`${PDF}/${n}.json`, "utf8"));
const st = (n: string) => parsePdfStatement(doc(n))!;
const pfile = (n: string) => fromPdf(`${n}.pdf`, st(n));
const recOk = (n: string) => st(n).recon.filter((r) => !r.soft).every((r) => r.want === r.got);

describe("statement PDFs", () => {
  it("each issuer is found by its header and adds up to its own summary", () => {
    const want: Record<string, string> = { "chase-checking": "chase-checking", "chase-card": "chase-card", "wf-card": "wf-card", "paypal-card": "paypal-card", "paypal-savings": "paypal-savings", "paypal-account-es": "paypal-account", "paypal-account-en": "paypal-account" };
    for (const [n, issuer] of Object.entries(want)) { assert.equal(st(n).issuer, issuer, n); assert.ok(recOk(n), `${n} reconciles`); }
    assert.equal(parsePdfStatement({ pages: [[{ s: "Hello", x: 10, y: 10 }]] }), null);
  });
  it("year from the statement period, including the December → January wrap", () => {
    assert.equal(rowDate("12/28", { from: "2025-12-27", to: "2026-01-26" }), "2025-12-28");
    assert.equal(rowDate("01/02", { from: "2025-12-27", to: "2026-01-26" }), "2026-01-02");
    assert.equal(rowDate("12/31", { from: "", to: "2026-01-15" }), "2025-12-31");
    const c = st("chase-checking");
    assert.deepEqual([c.rows[0].date, c.rows[4].date], ["2025-12-28", "2026-01-02"]);
    assert.equal(c.begin, 100000); assert.equal(c.end, 105000);
  });
  it("Chase card: sections give the sign; points; interest has no rewards", () => {
    const c = st("chase-card");
    assert.equal(c.rows.filter((r) => r.flow === "xfer").length, 1);
    assert.equal(c.rows.filter((r) => r.flow === "refund").length, 1);
    assert.equal(c.rewards?.points, 789);
    const int = c.rows.find((r) => r.cat === "cardint")!; assert.ok(int.noReward); assert.equal(int.amount, -975);
    assert.equal(c.rows.find((r) => /CHASE TRAVEL/.test(r.desc))!.rc, "travel");
  });
  it("Wells Fargo: credits column vs charges column, reference ids, picture page", () => {
    const w = st("wf-card");
    assert.deepEqual(w.imagePages, [2]);
    assert.equal(w.rows.find((r) => r.id === "REF0000000000002B")!.flow, "refund");
    assert.equal(w.rows.find((r) => r.id === "REF0000000000004D")!.amount, -2000);
    assert.equal(w.rewards?.balanceCents, 4200);
  });
  it("PayPal Mastercard: the store on the next line, PayPal checkout rate, cashback matches the statement", () => {
    const p = st("paypal-card");
    const temu = p.rows.filter((r) => r.name === "TEMU");
    assert.equal(temu.length, 2); assert.ok(temu.every((r) => r.pp && r.rc === "online"));
    const s0 = ensureAccounts(ledger());
    const { rv } = run(s0, [pfile("paypal-card")]);
    const earned = rv.rows.filter((r) => r.reward).reduce((a, r) => a + r.reward!.earned, 0);
    assert.equal(earned, p.rewards?.cents, "$1.43 like the statement");
  });
  it("PayPal account (ES and EN): wrapped dates, funding, ids, rows repeated in the balance statement count once, fee is its own line", () => {
    for (const n of ["paypal-account-es", "paypal-account-en"]) {
      const a = st(n);
      assert.equal(a.rows.filter((r) => r.id && !r.id.endsWith("-fee")).length, 10, n);
      assert.equal(a.rows[0].date, "2025-12-02"); assert.equal(a.rows[0].flow, "refund"); assert.ok(a.rows[0].pp);
      assert.equal(a.rows.find((r) => /MARATHON/.test(r.name ?? ""))!.flow, "spend");
      assert.ok(a.rows.find((r) => /Instant Ink/.test(r.name ?? ""))!.fundedByCard, "card deposit with a reference marks the purchase");
      assert.equal(a.rows.filter((r) => r.cat === "x-pp-save").length, 1);
      assert.equal(a.rows.find((r) => r.cat === "fees")!.amount, -100);
    }
  });
  it("review of all statements: pairs, transfers once, refunds, interest income, savings pocket", () => {
    const s0 = ensureAccounts(ledger());
    const files = ["chase-checking", "chase-card", "wf-card", "paypal-card", "paypal-savings", "paypal-account-es"].map(pfile);
    const { rv, srcs, c } = run(s0, files);
    assert.deepEqual(srcs, ["acct-chase-chk", "acct-chase-card", "acct-wf-card", "acct-pp-card", "acct-pp-save", "acct-paypal"]);
    const row = (fi: number, re: RegExp) => rv.rows.find((r) => r.file === fi && re.test(r.raw))!;
    // checking → Chase card payment and → Wells Fargo payment: one transfer each
    assert.ok(row(0, /Payment To Chase Card/).xpair === row(1, /Payment Thank You/).uid);
    assert.ok(row(0, /Wells Fargo Card Ccpymt/).xpair === row(2, /ONLINE ACH PAYMENT/).uid);
    assert.ok(row(0, /Paypal Inst Xfer/).xpair, "PayPal card repayment pairs");
    // Visa Direct → PayPal is a transfer, paired with PayPal's card deposit of the same amount
    assert.equal(row(0, /Visa Direct/).flow, "xfer");
    // a reversal cancels the ATM withdrawal
    assert.ok(row(0, /^ATM Withdrawal/).voided && row(0, /^Reversal/).voided);
    // PayPal card statement purchase ↔ PayPal account purchase funded by the PayPal Mastercard: once, PayPal name
    const ppBuy = rv.rows.find((r) => r.file === 5 && r.amount === -2500 && r.flow === "spend")!;
    assert.ok(ppBuy.include && ppBuy.pairs); assert.equal(ppBuy.label, "Temu"); assert.equal(ppBuy.sourceId, "acct-pp-card");
    // Wells Fargo PAYPAL *SAMPLEINK ↔ PayPal HP Instant Ink paid by card
    const ink = rv.rows.find((r) => r.file === 5 && /Instant Ink/.test(r.label))!;
    assert.ok(ink.pairs); assert.equal(ink.sourceId, "acct-wf-card");
    // refund reduces its category, not income
    assert.equal(rv.rows.find((r) => r.file === 5 && r.flow === "refund")!.target, rv.rows.find((r) => r.file === 5 && r.amount === -2500)!.target);
    // savings moves are transfers; interest is income
    assert.ok(rv.rows.filter((r) => r.file === 4).every((r) => r.flow === "xfer" || r.flow === "interest"));
    assert.equal(rv.rows.find((r) => r.file === 4 && r.flow === "interest")!.target, "income-variable||");
    assert.equal(row(0, /Payroll/).target, "income-fixed||");
    // card interest goes to Créditos-like category with no rewards
    assert.equal(rv.rows.find((r) => r.file === 1 && r.noReward)!.reward, null);
    // a transfer seen on both sides counts once
    const xf = rv.rows.filter((r) => r.flow === "xfer");
    assert.equal(c.xfers, xf.length - xf.filter((r) => r.xpair).length / 2);
    // pocket offer and commit
    assert.ok(rv.pocket && rv.pocket.create); assert.equal(rv.pocket!.endCents, 55125); assert.equal(rv.pocket!.apyBps, 350); assert.equal(rv.pocket!.month, "2025-12");
    const res = applyImport(s0, rv, files, srcs, "pdf1");
    const pocket = res.state.months["2025-12"].lines.find((l) => l.concept === "PayPal Ahorros")!;
    assert.equal(pocket.balanceMinor, 55125); assert.equal(pocket.amountMinor, 0); assert.match(pocket.note, /APY 3\.50%/);
    assert.ok(res.state.structure.categories.find((x) => x.id === "f-ahorro")!.subs.some((x) => x.id === pocket.subId && x.icon === "PiggyBank"));
    assert.equal(importBook(res.state).sources.find((x) => x.id === "acct-pp-save")!.pocketId, pocket.subId);
    const back = revertImport(res.state, res.undo);
    assert.ok(!back.structure.categories.find((x) => x.id === "f-ahorro")!.subs.some((x) => x.id === pocket.subId), "undo removes the new pocket");
    // re-import: nothing new; pocket off leaves Ahorros alone
    assert.equal(run(res.state, files).c.fresh, 0);
    const off = applyImport(s0, rv, files, srcs, "pdf2", false).state;
    assert.ok(!(off.months["2025-12"]?.lines ?? []).some((l) => l.concept === "PayPal Ahorros"));
  });
  it("the synthetic PDFs read by pdf.js give the same words as their JSON", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    for (const n of ["wf-card", "paypal-account-es"]) {
      const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(`${PDF}/${n}.pdf`)), verbosity: 0 }).promise;
      const pages: PdfDoc["pages"] = [];
      for (let i = 1; i <= d.numPages; i++) pages.push((await (await d.getPage(i)).getTextContent()).items.filter((it) => "str" in it && it.str).map((it) => ({ s: (it as { str: string }).str, x: Math.round((it as { transform: number[] }).transform[4] * 10) / 10, y: Math.round((it as { transform: number[] }).transform[5] * 10) / 10 })));
      assert.deepEqual(parsePdfStatement({ pages }), parsePdfStatement(doc(n)), n);
    }
  });
});

describe("cards of the user's own", () => {
  it("add card → set rates → import assigns to it → archive → restore, history preserved", () => {
    const hogar = newBonus("Farmacia propia", "expense-variable|v-personales|v.p.salud");
    const added = addAccount(ledger(), { name: "Citi · tarjeta", kind: "card", bank: "citi", rates: { other: 200, grocery: 400, [hogar.id]: 500 }, bonus: [hogar] });
    let s = added.state; const id = added.id;
    // presets kept, the new card is in daily use with its rates
    const a = accounts(s);
    assert.ok(a.some((x) => x.id === "acct-chase-card") && a.some((x) => x.id === "acct-wf-card") && a.some((x) => x.id === "acct-pp-card"));
    const citi = a.find((x) => x.id === id)!;
    assert.equal(citi.name, "Citi · tarjeta"); assert.equal(citi.rates.other, 200); assert.equal(citi.rates.grocery, 400); assert.equal(importBook(s).bonus!.length, 1);
    // a generic CSV of an unknown bank: no auto pick, the user assigns it to the new card
    const files = [read("banco-generico.csv")];
    assert.equal(pickSource(files[0], importBook(s), accounts(s)), "");
    const rv = buildReview(s, files, [id], names);
    const spend = rv.rows.filter((r) => r.flow === "spend");
    assert.ok(spend.length >= 2 && spend.every((r) => r.sourceId === id));
    const farm = spend.find((r) => r.key.includes("farmacia"))!;
    farm.target = "expense-variable|v-personales|v.p.salud";
    const rv2 = buildReview({ ...s, imports: { ...importBook(s), rules: [{ key: farm.key, label: "Farmacia", target: farm.target, n: 1, at: "2026-10-16" }] } }, files, [id], names);
    const farm2 = rv2.rows.find((r) => r.key === farm.key)!;
    assert.equal(farm2.rc, hogar.id, "a filing in the linked category lands in the bonus row"); assert.equal(farm2.reward?.rate, 500);
    s = applyImport(s, rv2, files, [id], "bc1").state;
    const lines = () => Object.values(s.months).flatMap((m) => m.lines).filter((l) => l.sourceId === id);
    const before = lines().length; assert.ok(before >= 2);
    const month = rv2.rows[0].month;
    const earned = rewardsMonth(s, month, "USD", 366243)!.earned;
    // archive: out of daily use, history intact
    s = archiveAccount(s, id, "2026-11-03");
    assert.ok(!accounts(s).some((x) => x.id === id), "gone from the picker / table");
    assert.equal(accounts(s, true).find((x) => x.id === id)!.off, "2026-11-03");
    assert.equal(lines().length, before, "lines stay");
    assert.equal(rewardsMonth(s, month, "USD", 366243)!.earned, earned, "past rewards stay");
    assert.ok(!rewardsMonth(s, month, "USD", 366243)!.top || rewardsMonth(s, month, "USD", 366243)!.top!.best.id !== id, "never suggested");
    assert.ok(importBook(s).rules.length >= 1 && importBook(s).bonus!.length === 1, "rules and bonus rows stay");
    // restore
    s = restoreAccount(s, id);
    assert.equal(accounts(s).find((x) => x.id === id)!.rates.grocery, 400);
    // an old ledger without the new fields loads fine
    const old = { ...ledger(), imports: { sources: [{ id: "acct-chase-card", bank: "chase", kind: "card" as const, rates: { dining: 400, other: 100 } }], rules: [], maps: {} } };
    assert.deepEqual(importBook(old).bonus, []);
    assert.equal(accounts(old).find((x) => x.id === "acct-chase-card")!.rates.dining, 400);
  });
});
