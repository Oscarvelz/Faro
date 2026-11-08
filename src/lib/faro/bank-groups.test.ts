/**
 * 1.3.151 Bancos y recompensas — personalization of the three factory banks (Chase, Wells Fargo, PayPal):
 * remove a bank or a card (archived, never deleted), its restore stays at its exact place, own cards can be added,
 * renamed and recoloured, and all of it survives a reload (the ledger) and the backup envelope (app "FARO").
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { accounts, acctColor, addAccount, archiveAccount, archiveBank, bankGroups, editAccount, restoreAccount, restoreBank, restoreDefaultAccounts } from "./bankbook.ts";
import type { LedgerState } from "./types.ts";

const fresh = (): LedgerState => createInitial("es", "claro");
const keys = (s: LedgerState) => bankGroups(s).map((g) => g.key);
const cardCols = (s: LedgerState) => accounts(s, true).filter((a) => a.kind === "card").map((a) => `${a.id}${a.off ? ":off" : ""}`);

describe("bancos: quitar, restaurar en su lugar, propias", () => {
  it("nace con los tres bancos de fábrica, en orden, con su color", () => {
    const s = fresh();
    assert.deepEqual(keys(s), ["chase", "wellsfargo", "paypal"]);
    const g = bankGroups(s);
    assert.deepEqual(g.map((x) => x.accts.length), [2, 1, 3]);
    assert.ok(g.every((x) => x.isDefault));
    assert.equal(acctColor(g[0].accts[1]), "#117aca");
    assert.equal(acctColor(g[1].accts[0]), "#d71e28");
  });

  it("quitar un banco entero lo archiva (nada se borra) y su lugar se conserva", () => {
    const s0 = fresh();
    const s = archiveBank(s0, "wellsfargo", "2026-11-08");
    assert.deepEqual(keys(s), ["chase", "wellsfargo", "paypal"], "el grupo sigue en su posición");
    const wf = bankGroups(s)[1];
    assert.equal(wf.live.length, 0);
    assert.equal(wf.accts[0].off, "2026-11-08");
    assert.ok(!accounts(s).some((a) => a.bank === "wellsfargo"), "fuera del uso diario");
    assert.deepEqual(cardCols(s), ["acct-chase-card", "acct-wf-card:off", "acct-pp-card"], "la columna queda en su sitio");
    const back = restoreBank(s, "wellsfargo");
    assert.deepEqual(cardCols(back), ["acct-chase-card", "acct-wf-card", "acct-pp-card"]);
    assert.equal(bankGroups(back)[1].live.length, 1);
  });

  it("quitar una sola tarjeta deja el banco y su fila fantasma en la misma posición", () => {
    const s = archiveAccount(fresh(), "acct-chase-card", "2026-11-08");
    const chase = bankGroups(s)[0];
    assert.deepEqual(chase.accts.map((a) => `${a.id}${a.off ? ":off" : ""}`), ["acct-chase-chk", "acct-chase-card:off"]);
    assert.equal(chase.live.length, 1);
    const back = restoreAccount(s, "acct-chase-card");
    assert.deepEqual(cardCols(back)[0], "acct-chase-card");
  });

  it("quitar PayPal (3 cuentas) con una sola acción y traerlo con su flecha", () => {
    const s = archiveBank(fresh(), "paypal", "2026-11-08");
    assert.equal(bankGroups(s)[2].live.length, 0);
    assert.equal(accounts(s).filter((a) => a.bank === "paypal").length, 0);
    assert.equal(accounts(s, true).filter((a) => a.bank === "paypal").length, 3, "las tres siguen guardadas");
    assert.equal(bankGroups(restoreBank(s, "paypal"))[2].live.length, 3);
    assert.equal(bankGroups(restoreDefaultAccounts(s))[2].live.length, 3, "Restaurar tarjetas de fábrica también las trae");
  });

  it("una tarjeta propia entra con su color, se renombra y recolorea, y su banco agrupa", () => {
    const r = addAccount(fresh(), { name: "Citi · tarjeta", kind: "card", bank: "citi", rates: { other: 200, dining: 300 }, color: "#7A3CE0" });
    let s = r.state;
    const citi = bankGroups(s).find((g) => g.key === "citi")!;
    assert.ok(citi, "Citi forma su grupo al final");
    assert.equal(keys(s).at(-1), "citi");
    assert.equal(acctColor(citi.accts[0]), "#7a3ce0");
    s = editAccount(s, r.id, { name: "Citi Double Cash", color: "#0E8F6E" });
    const a = accounts(s).find((x) => x.id === r.id)!;
    assert.equal(a.name, "Citi Double Cash");
    assert.equal(a.color, "#0e8f6e");
    s = editAccount(s, r.id, { color: null });
    assert.equal(acctColor(accounts(s).find((x) => x.id === r.id)!), "#056dae", "sin color propio vuelve al del banco");
    s = editAccount(s, "acct-chase-card", { name: "Freedom Unlimited", bank: "citi" });
    const chase = accounts(s).find((x) => x.id === "acct-chase-card")!;
    assert.equal(chase.name, "Freedom Unlimited");
    assert.equal(chase.bank, "chase", "una de fábrica no cambia de banco");
  });

  it("todo viaja en el libro y en el respaldo (app FARO): ida y vuelta idéntica", () => {
    let s = addAccount(fresh(), { name: "Discover · tarjeta", kind: "card", bank: "discover", rates: { other: 100, gas: 500 }, color: "#ff6000" }).state;
    s = archiveBank(s, "wellsfargo", "2026-11-08");
    s = editAccount(s, "acct-pp-card", { name: "PayPal Mastercard", color: "#123456" });
    const envelope = JSON.stringify({ app: "FARO", v: 1, exportedAt: new Date().toISOString(), ledger: s });
    const back = (JSON.parse(envelope) as { app: string; ledger: LedgerState });
    assert.equal(back.app, "FARO");
    assert.deepEqual(back.ledger.imports, s.imports);
    assert.deepEqual(bankGroups(back.ledger).map((g) => [g.key, g.live.length]), bankGroups(s).map((g) => [g.key, g.live.length]));
    assert.equal(accounts(back.ledger).find((a) => a.id === "acct-pp-card")!.name, "PayPal Mastercard");
  });
});
