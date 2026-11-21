/**
 * captura357 — LA LISTA-PLAN (D6, 1.3.357; brief BRIEF-LISTA-PLAN).
 * Estos especímenes juzgan el CONTRATO en la librería (plan.ts + el
 * guardián de kind en drafts.ts); las superficies tienen sus cercas abajo.
 *
 *  (1) EL GUARDIÁN DE KIND: la mesa jamás convierte un plan; los totales
 *      del bache y el detector de duplicados lo ignoran.
 *  (2) NUNCA GEMELOS: el cierre convierte lo comprado en borradores de
 *      línea y retira las filas del plan en la misma receta.
 *  (3) EL DÍA REAL: marcar comprado fija el día de la compra, cruzando
 *      un cambio de mes — nunca el día en que se planeó.
 *  (4) ESTIMADO HONESTO: sin precio propio no hay estimado; la cobertura
 *      se declara; ningún estimado entra a un total.
 *  (5) EL CIERRE CUENTA TODO: comprado + no había + después + fuera =
 *      filas del plan, en el resumen y en el folio.
 *  (6) LA REINA: los totales del libro, idénticos con planes vivos,
 *      cerrados y archivados.
 *  (7) REANUDAR: el folio no se toca; la lista nueva hereda nombre y las
 *      filas no compradas ni salidas, como pendientes.
 *  (8) EL ASIENTO: capture.plan vive en Ritmo y en ningún otro modo.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { commitDrafts, draftTotals, findDup } from "./drafts.ts";
import { createInitial } from "./defaults.ts";
import { FEATURES } from "./mode.ts";
import { closePlan, createPlan, livePlans, markBought, markPlanState, ownPrice, planRows, planTotals, resumePlan } from "./plan.ts";
import { addDrafts } from "./drafts.ts";
import type { Draft, LedgerState, Line } from "./types.ts";

const NOW = "2026-11-20T15:00:00.000Z";

function book(months: Record<string, Line[]> = {}): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  for (const [k, lines] of Object.entries(months)) ledger.months[k] = { lines };
  ledger.settings.display = "USD";
  ledger.drafts = [];
  return ledger;
}

function planRow(planId: string, concept: string, extra: Partial<Draft> = {}): Draft {
  return {
    id: `pr-${concept}`, source: "list", kind: "plan", planId, planState: "pending",
    raw: concept, createdAt: NOW, day: "2026-10-28", sign: "out",
    amountMinor: null, currency: "USD", concept, note: "", book: "purchase",
    unsure: [], missing: ["amount"], ...extra,
  };
}

function purchase(id: string, concept: string, minor: number, day: string): Line {
  return {
    id, seriesId: id, monthKey: day.slice(0, 7), kind: "purchase", concept, amountMinor: minor,
    currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false,
    storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "",
    aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], bookedOn: day, startedOn: "",
  };
}

function withPlan(rows: Draft[]): { state: LedgerState; planId: string } {
  const { state, plan } = createPlan(book(), "La compra", NOW);
  return { state: addDrafts(state, rows.map((r) => ({ ...r, planId: plan.id }))), planId: plan.id };
}

const bookTotals = (s: LedgerState) => JSON.stringify(Object.values(s.months).map((m) => m.lines.map((l) => [l.id, l.amountMinor, l.active])));

describe("357 · el guardián de kind y el candado", () => {
  it("(1) commitDrafts jamás convierte una fila del plan; draftTotals y findDup la ignoran", () => {
    const { state, planId } = withPlan([planRow("", "Leche")]);
    const row = planRows(state, planId)[0];
    const bought = markBought(state, row.id, 185, "USD", "2026-11-20");
    const brow = planRows(bought, planId)[0];
    const after = commitDrafts(bought, [brow.id], { monthKey: "2026-11", structure: bought.structure, lang: "es" });
    assert.equal(after, bought); // nada se movió: el mismo objeto
    assert.deepEqual(draftTotals([brow]), []);
    assert.equal(findDup(brow, bought), undefined);
  });

  it("(3) marcar comprado fija el día real de compra, cruzando el mes", () => {
    const { state, planId } = withPlan([planRow("", "Arroz")]); // planeada el 2026-10-28
    const row = planRows(state, planId)[0];
    const bought = markBought(state, row.id, 340, "USD", "2026-11-02");
    const brow = planRows(bought, planId)[0];
    assert.equal(brow.day, "2026-11-02");
    assert.equal(brow.amountMinor, 340);
    assert.equal(brow.planState, "bought");
    // Y volver a pendiente cae el monto real, no el estimado.
    const back = markPlanState(bought, row.id, "pending");
    assert.equal(planRows(back, planId)[0].amountMinor, null);
  });
});

describe("357 · el estimado honesto", () => {
  it("(4) ownPrice lee el último precio propio; sin historia, null", () => {
    const st = book({ "2026-11": [purchase("p1", "Leche", 175, "2026-11-05"), purchase("p2", "Leche", 185, "2026-11-12")] });
    assert.deepEqual(ownPrice(st, "leche"), { minor: 185, currency: "USD", on: "2026-11-12" });
    assert.equal(ownPrice(st, "Pintura"), null);
  });

  it("(4) planTotals declara su cobertura y no mezcla estimado con real", () => {
    const rows = [
      planRow("x", "Leche", { estMinor: 185 }),
      planRow("x", "Pan", {}),
      planRow("x", "Arroz", { estMinor: 340, planState: "bought", amountMinor: 320 }),
    ];
    const t = planTotals(rows);
    assert.equal(t.priced, 2);
    assert.equal(t.total, 3);
    assert.deepEqual(t.est, [{ currency: "USD", minor: 525 }]);
    assert.deepEqual(t.real, [{ currency: "USD", minor: 320 }]);
  });
});

describe("357 · la ceremonia de cierre", () => {
  it("(2)(5) convierte lo comprado, destina lo que quedó y cuenta todo", () => {
    const { state, planId } = withPlan([
      planRow("", "Leche", { estMinor: 185 }),
      planRow("", "Huevos"),
      planRow("", "Servilletas"),
      planRow("", "Pintura"),
    ]);
    let s = state;
    const rows = planRows(s, planId);
    s = markBought(s, rows[0].id, 180, "USD", "2026-11-20");
    s = markPlanState(s, rows[1].id, "gone");
    s = markPlanState(s, rows[2].id, "later");
    // Pintura queda pendiente: su destino por defecto es la lista siguiente.
    const { state: closed, born, nextPlanId } = closePlan(s, planId, {}, "2026-11-20", NOW);
    assert.equal(born, 1);
    // Nunca gemelos: ninguna fila del plan cerrado queda en la bandeja como plan…
    assert.equal(planRows(closed, planId).length, 0);
    // …y lo comprado vive como UN borrador de línea con su procedencia.
    const lines = (closed.drafts ?? []).filter((d) => d.kind === "line");
    assert.equal(lines.length, 1);
    assert.equal(lines[0].concept, "Leche");
    assert.match(lines[0].note, /del plan: La compra/);
    // El folio cuenta todo: 1 comprado + 1 no había + 2 después = 4 filas.
    const folio = (closed.plans ?? []).find((p) => p.id === planId)!;
    assert.equal(folio.closedAt, NOW);
    assert.deepEqual(
      [folio.summary!.bought, folio.summary!.gone, folio.summary!.later, folio.summary!.out],
      [1, 1, 2, 0],
    );
    assert.equal(folio.rows.length, 4);
    // La lista siguiente nació con los dos «después», como pendientes.
    assert.ok(nextPlanId);
    const next = planRows(closed, nextPlanId!);
    assert.deepEqual(next.map((d) => d.concept).sort(), ["Pintura", "Servilletas"]);
    assert.ok(next.every((d) => d.planState === "pending" && d.amountMinor == null));
    assert.equal(livePlans(closed).length, 1);
  });

  it("(6) la reina: el libro no se mueve con planes vivos, cerrados ni reanudados", () => {
    const base = book({ "2026-11": [purchase("p1", "Leche", 185, "2026-11-12")] });
    const before = bookTotals(base);
    const { state, plan } = createPlan(base, "La compra", NOW);
    let s = addDrafts(state, [planRow(plan.id, "Pan", { estMinor: 90 })]);
    s = markBought(s, planRows(s, plan.id)[0].id, 95, "USD", "2026-11-20");
    assert.equal(bookTotals(s), before);
    const { state: closed } = closePlan(s, plan.id, {}, "2026-11-20", NOW);
    assert.equal(bookTotals(closed), before);
    const { state: resumed } = resumePlan(closed, plan.id, "2026-11-21", NOW);
    assert.equal(bookTotals(resumed), before);
  });

  it("(7) reanudar hereda nombre y restos; el folio queda intacto", () => {
    const { state, planId } = withPlan([planRow("", "Huevos"), planRow("", "Té")]);
    let s = markPlanState(state, planRows(state, planId)[0].id, "gone");
    s = markPlanState(s, planRows(s, planId)[1].id, "later");
    const { state: closed } = closePlan(s, planId, {}, "2026-11-20", NOW);
    const folioBefore = JSON.stringify((closed.plans ?? []).find((p) => p.id === planId));
    const { state: resumed, planId: newId } = resumePlan(closed, planId, "2026-11-21", NOW);
    assert.ok(newId && newId !== planId);
    const rows = planRows(resumed, newId!);
    assert.deepEqual(rows.map((d) => d.concept).sort(), ["Huevos", "Té"]);
    assert.ok(rows.every((d) => d.planState === "pending"));
    assert.equal((resumed.plans ?? []).find((p) => p.id === newId)!.name, "La compra");
    assert.equal(JSON.stringify((resumed.plans ?? []).find((p) => p.id === planId)), folioBefore);
  });
});

describe("357 · el asiento y las superficies (fuego amigo)", () => {
  it("(8) capture.plan vive en Ritmo y en ningún otro modo", () => {
    assert.equal((FEATURES as Record<string, string>)["capture.plan"], "ritmo");
  });

  it("la puerta Lista gana el segmento solo tras el asiento, y la bandeja gana su sección", () => {
    const list = readFileSync(new URL("../../components/faro/capture-list.tsx", import.meta.url), "utf8");
    assert.match(list, /has\("capture\.plan"\)/);
    assert.match(list, /capture-plan-seg/);
    const tray = readFileSync(new URL("../../components/faro/tray.tsx", import.meta.url), "utf8");
    assert.match(tray, /planRows|livePlans/);
    assert.match(tray, /data-anchor="tray-plans"/);
  });

  it("el tema del Manual y la nota de Novedades nacen con la superficie", () => {
    const topics = readFileSync(new URL("../manual/topics.ts", import.meta.url), "utf8");
    assert.match(topics, /id: "lista-plan"/);
    assert.match(topics, /keys: \["capture\.plan"\]/);
    const news = readFileSync(new URL("./novedades.ts", import.meta.url), "utf8");
    assert.match(news, /version: "1\.3\.357"/);
    assert.match(news, /topic: "lista-plan"/);
  });
});
