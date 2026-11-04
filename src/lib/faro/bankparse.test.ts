// Bank import parsers and review (node --test --experimental-strip-types src/lib/faro/bankparse.test.ts)
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { applyImport, buildReview, counts, parseDate, parseFile, parseMoney, pickSource, remap, revertImport, type ParsedFile } from "./bankparse.ts";
import { accounts, ensureAccounts, importBook, merchantKey, rewardsMonth } from "./bankbook.ts";
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
      ].map((c) => (c.id === "f-ahorro" ? { ...c, subs: c.subs.map((s) => ({ ...s, icon: "vault" })) } : c)),
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
    assert.equal(merchantKey("AMAZON MKTPL*2X3Y4Z1 Amzn.com/bill WA"), "amazon mktpl");
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
    assert.equal(pub.target, "expense-fixed|f-alimentos|f.alimentos.despensa"); assert.equal(pub.how, "seed"); assert.equal(pub.reward?.earned, 193);
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
  it("rewards: groceries on State Farm flagged as a miss; monthly summary", () => {
    const s = ensureAccounts(ledger());
    const files = [read("statefarm.qfx")];
    const { rv, srcs } = run(s, files);
    const sed = rv.rows.find((r) => r.key.startsWith("sedano"))!;
    assert.equal(sed.rc, "grocery"); assert.equal(sed.reward?.best?.id, "acct-chase-card"); assert.equal(sed.reward?.missed, 68);
    const st = applyImport(s, rv, files, srcs, "b5").state;
    const m = rewardsMonth(st, "2026-10", "USD", 366243)!;
    assert.ok(m.missed >= 68); assert.equal(m.top?.best.id, "acct-chase-card"); assert.equal(m.top?.rc, "grocery");
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
