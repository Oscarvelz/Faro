/* ════════════════════════════════════════════════════════════════════
 * OLA 23 · LA CURA DE LA OLA 23, CLAVADA (8 roturas + hallazgos)
 *
 * La caza XXIII cazó sobre todo la casa nueva: el pago automático
 * (.356) nació con cuatro costuras (la caminata que quema su guarda
 * antes de la ventana, el sello del día que muere con el montaje, la
 * instancia manual que apaga la serie, la instancia asentada que nace
 * con el nextDue de su propio día ya pagado y se anuncia vencida), la
 * mesa de la cura 22 no distinguía corrección de renacimiento, ask2 no
 * recibía el modo (el plan de pagos y el patrón de remesas se
 * entregaban enteros en Esencial), los nombres ingleses de las
 * tarjetas quedaron en español, la puerta de la nota del plan no veía
 * su destino, la puerta de paquetes no juzgaba lo nacido en la .357, y
 * las cercas hermanas (el censo JS y la cáscara) repetían la enfermedad
 * (nombre, contexto) que la ola 21 ya había curado en la otra.
 *
 * Esta cerca convierte cada espécimen de la ola en cerca permanente,
 * componiendo sobre las funciones reales con la forma de llamada de
 * producción. Las cercas de las cercas hermanas viven en sus archivos
 * (modos-ola19 §B-quater para G23-5; modos-ola14 especímenes M23 para
 * M23-2/M23-3b); aquí viven las de la casa.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { autopaySealedOn, autopaySealKey, sealAutopayDay, settleAutopay, type AutopaySealStorage } from "./autopay.ts";
import { duesWindow } from "./dues.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { applyTableEdits, changedDrafts, commitDrafts, fallenDrafts, rebornDrafts, type DraftCtx } from "./drafts.ts";
import { closedPlans, livePlans, planRows } from "./plan.ts";
import { addLent } from "./debts.ts";
import { addLoan } from "./loans.ts";
import { addRemitPerson } from "./remit-people.ts";
import { answerBankQuestion } from "./ask2.ts";
import { ASK_FLOORS } from "./ask.ts";
import { FARO_FUNCTION_MAP } from "./askmap.ts";
import { featureForGo, featureMinMode, modeReaches } from "./mode.ts";
import { findTopic } from "../manual/topics.ts";
import type { ParseCtx } from "./textparse.ts";
import type { Draft, LedgerState, Line, LineKind, PlanList } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const TODAY = "2026-11-20";

/* ── constructores de la casa (los de los bancos de la ola) ──────── */
function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: "2026-11", currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}
function cuota(id: string, monthKey: string, due: string, cadence: Line["cadence"], extra: Partial<Line> = {}): Line {
  return line({
    id, kind: "subscription" as LineKind, concept: "Cuota", amountMinor: 1299,
    seriesId: "serie-1", monthKey, recurring: true, cadence,
    nextDue: due, bookedOn: due, ...extra,
  });
}
function book(months: Record<string, Line[]>): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  for (const [k, lines] of Object.entries(months)) ledger.months[k] = { lines };
  ledger.settings.display = "USD";
  return ledger;
}
const AUTO = { autopay: true, autopayAccountId: "acct-banco" } as Partial<Line>;

/* ═══════════ §A · EL ASENTAMIENTO (familias 1, 2, 3 y 4) ═════════ */
describe("ola23 · §A: la caminata alcanza su ventana y la instancia asentada nace con su próximo período (G23-1, Q23-C2, Q23-C1-Cara)", () => {
  it("A1 curado: la serie semanal de ~2 años asienta SU ventana — ni un día antes, ni uno de menos", () => {
    const st = book({ "2025-01": [cuota("w-old", "2025-01", "2025-01-03", "weekly", AUTO)] });
    const r = settleAutopay(st, TODAY);
    assert.ok(r.settled.length >= 5, `la ventana se asienta entera (${r.settled.length} períodos)`);
    assert.ok(r.settled.every((s) => s.on >= "2026-09-19"), "la ventana honesta se respeta: nada anterior a los 62 días se paga");
    assert.equal(r.settled[r.settled.length - 1]!.on, "2026-11-20", "hasta el vencimiento de hoy");
    const again = settleAutopay(r.state, TODAY);
    assert.equal(again.settled.length, 0, "y no dos veces: la serie quedó al día");
    const inst = Object.values(r.state.months).flatMap((m) => m.lines).find((l) => l.id === "auto-serie-1-2026-11-20")!;
    assert.equal(inst.nextDue, "2026-11-27", "la instancia asentada nace apuntando a su PRÓXIMO período (la familia 4)");
  });

  it("A2 curado: a 60 pasos de la ventana, los cinco recientes TAMBIÉN se asientan el primer día", () => {
    const st = book({ "2025-07": [cuota("w-mid", "2025-07", "2025-07-19", "weekly", AUTO)] });
    const r = settleAutopay(st, TODAY);
    const ons = r.settled.map((s) => s.on);
    assert.ok(ons.includes("2026-11-14"), "el vencimiento más reciente entra el primer día");
    assert.ok(ons.every((on) => on >= "2026-09-19"), "y ninguno es anterior a la ventana");
    assert.equal(ons[ons.length - 1], "2026-11-14");
  });

  it("A3 (control de la casa): la mensual vieja sigue asentando lo reciente, como siempre", () => {
    const st = book({ "2026-06": [cuota("n-jun", "2026-06", "2026-06-15", "monthly", AUTO)] });
    assert.deepEqual(settleAutopay(st, TODAY).settled.map((s) => s.on), ["2026-10-15", "2026-11-15"]);
  });

  it("A5 (control): dos pestañas sobre la misma foto asientan idéntico; quien adopta no re-asienta", () => {
    const st = book({ "2026-10": [cuota("n-oct", "2026-10", "2026-10-15", "monthly", AUTO)] });
    const a = settleAutopay(st, TODAY);
    const b = settleAutopay(st, TODAY);
    assert.deepEqual(b.settled, a.settled);
    const instA = Object.values(a.state.months).flatMap((m) => m.lines).find((l) => l.id.startsWith("auto-"))!;
    assert.equal(instA.id, "auto-serie-1-2026-11-15", "el id determinista es el mismo en las dos pestañas");
    assert.equal(settleAutopay(a.state, TODAY).settled.length, 0, "sobre el resultado ajeno, nada");
  });

  it("A6 curado: la instancia MANUAL no apaga el pago automático — la configuración se resuelve desde la serie", () => {
    const st = book({
      "2026-10": [cuota("n-oct", "2026-10", "2026-10-15", "monthly", AUTO)],
      "2026-11": [cuota("n-nov-manual", "2026-11", "2026-11-15", "monthly")],
    });
    const dec = settleAutopay(st, "2026-12-20");
    assert.deepEqual(dec.settled.map((s) => s.on), ["2026-12-15"],
      "noviembre lo cubre la instancia manual; diciembre se asienta con la cuenta de la serie");
    assert.equal(dec.settled[0]!.accountId, "acct-banco", "la cuenta es la de la instancia que lleva la configuración");
  });

  it("A7 curado: la instancia futura creada por adelantado no esconde el período debido", () => {
    const st = book({
      "2026-10": [cuota("n-oct", "2026-10", "2026-10-15", "monthly", AUTO)],
      "2026-12": [cuota("n-dic", "2026-12", "2026-12-15", "monthly", AUTO)],
    });
    assert.deepEqual(settleAutopay(st, TODAY).settled.map((s) => s.on), ["2026-11-15"],
      "cada período se juzga por su propia fecha: noviembre se asienta aunque diciembre ya exista");
  });

  it("el apagado explícito manda: una instancia con autopay=false cierra la serie aunque las viejas lo lleven", () => {
    const st = book({
      "2026-09": [cuota("n-sep", "2026-09", "2026-09-15", "monthly", AUTO)],
      "2026-10": [cuota("n-oct", "2026-10", "2026-10-15", "monthly", { autopay: false })],
    });
    assert.equal(settleAutopay(st, TODAY).settled.length, 0,
      "la señal que el editor escribe al apagar (familia 3) se lee: la serie apagada no resucita");
  });
});

describe("ola23 · §A-2: el sello del día es del APARATO y sobrevive al Deshacer y al remontaje (G23-2)", () => {
  const fakeStorage = (): AutopaySealStorage & { map: Map<string, string> } => {
    const map = new Map<string, string>();
    // OLA 25: el contrato del almacenamiento creció una enumeración
    // (la casa del sello lista sus llaves por serie, como el
    // localStorage del aparato siempre pudo); el doble la cumple
    // sobre su mapa, sin cambiar lo que esta cerca mide.
    return { map, read: (k) => map.get(k) ?? null, write: (k, v) => { map.set(k, v); }, keys: (p) => [...map.keys()].filter((k) => k.startsWith(p)) };
  };
  it("sellar → remontar (otro montaje, la misma clave durable) → no re-asienta; al día siguiente, sí", () => {
    const st = book({ "2026-10": [cuota("n-oct", "2026-10", "2026-10-15", "monthly", AUTO)] });
    const storage = fakeStorage();
    assert.equal(autopaySealedOn(storage, "u1", TODAY), false, "el día nace sin sellar");
    // Primer montaje: el proveedor sella y asienta.
    sealAutopayDay(storage, "u1", TODAY);
    const first = settleAutopay(st, TODAY);
    assert.equal(first.settled.length, 1);
    // El Deshacer restaura la foto (st) — el sello NO vive en el libro:
    // no hay nada que deshacer en el almacenamiento del aparato.
    // Remontaje el mismo día: el proveedor lee el sello y no corre.
    assert.equal(autopaySealedOn(storage, "u1", TODAY), true, "tras deshacer y remontar, el sello sigue: no hay segundo asentamiento");
    // La función pura, sin el sello, re-asentaría — esa es exactamente
    // la razón de que el sello exista fuera del libro (A4 de la ola).
    assert.equal(settleAutopay(st, TODAY).settled.length, 1, "la función no tiene memoria: la memoria es el sello");
    // Día siguiente: el sello de ayer no tapa hoy.
    assert.equal(autopaySealedOn(storage, "u1", "2026-11-21"), false, "al día siguiente el pase corre otra vez");
    // La clave es del libro (su uid), no de la sesión:
    assert.equal(autopaySealKey("u1"), "faro-autopay-day.u1");
    assert.equal(autopaySealedOn(storage, "u2", TODAY), false, "otro libro, otro sello");
  });
  it("la fuente del proveedor: el sello se lee y se escribe por la clave durable, no por un useRef solo", () => {
    const src = SRC("../../components/faro/provider.tsx");
    assert.ok(src.includes("autopaySealedOn("), "el proveedor consulta el sello durable antes de asentar");
    assert.ok(src.includes("sealAutopayDay("), "y lo escribe al correr el pase");
    assert.ok(src.includes("localStorage"), "la casa del sello es el almacenamiento del aparato");
  });
});

describe("ola23 · §A-3: la tarjeta no anuncia vencido lo ya asentado (Q23-C1 de Cara, en su forma curada)", () => {
  const benchflix = (patch: Partial<Line> = {}): Line => line({
    id: "bk-benchflix", kind: "subscription" as LineKind, concept: "Benchflix", amountMinor: 59900,
    seriesId: "bk-benchflix", monthKey: "2026-10", recurring: true, cadence: "monthly",
    nextDue: "2026-10-15", bookedOn: "2026-10-15", currency: "NIO", autopay: true, autopayAccountId: "acct-chase-chk", ...patch,
  });
  it("tras el asentamiento, la fila falsa no nace; el próximo período SÍ se anuncia cuando se acerca", () => {
    const st = book({ "2026-10": [benchflix()] });
    const r = settleAutopay(st, "2026-11-21");
    assert.equal(r.settled.length, 1, "el asentamiento corre (noviembre)");
    const w1 = duesWindow(r.state, 3, "2026-11-21");
    assert.ok(!w1.some((o) => o.line?.seriesId === "bk-benchflix"),
      "la tarjeta calla: el período asentado no se anuncia vencido por su propio nextDue");
    const w2 = duesWindow(r.state, 3, "2026-12-13");
    assert.ok(w2.some((o) => o.line?.seriesId === "bk-benchflix" && o.on === "2026-12-15"),
      "y el período siguiente se anuncia verdadero cuando entra en el horizonte");
  });
  it("el control de la casa (captura356 §5): la obligación viva sin pagar SÍ se anuncia vencida", () => {
    const st = book({
      "2026-11": [line({
        id: "gim", kind: "subscription" as LineKind, concept: "Gimnasio", amountMinor: 3000,
        seriesId: "gim", monthKey: "2026-11", recurring: true, cadence: "monthly",
        nextDue: "2026-11-23", bookedOn: "2026-10-23",
      })],
    });
    const w = duesWindow(st, 3, "2026-11-21");
    assert.ok(w.some((o) => o.line?.seriesId === "gim"), "bookedOn es el día de la ANOTACIÓN, no el del pago: la cuota viva se anuncia");
  });
});

/* ═══════════ §B · LA MESA: CORRECCIÓN ≠ RENACIMIENTO (familia 5) ══ */
function draft(partial: Partial<Draft> & Pick<Draft, "id">): Draft {
  return {
    source: "list", kind: "line", raw: "x", createdAt: "2026-11-01T00:00:00.000Z",
    day: "2026-11-05", sign: "out", amountMinor: 10000, currency: "USD",
    concept: "Farmacia", note: "", book: "purchase", unsure: [], missing: [],
    ...partial,
  };
}
function stateWith(ds: Draft[]): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  ledger.drafts = ds;
  return ledger;
}
const ctxOf = (s: LedgerState): DraftCtx => ({ monthKey: "2026-11", structure: s.structure, lang: "es" });

describe("ola23 · §B: la mesa distingue la corrección del renacimiento (G23-3)", () => {
  it("B1 (control): la convergencia en orden inverso sigue aterrizando y nombrándose como corrección", () => {
    const mount = draft({ id: "d1" });
    const work = [{ ...mount, amountMinor: 25000 }];
    const live = { ...mount, amountMinor: 25000, concept: "Farmacia Central" };
    const originals = new Map([["d1", mount]]);
    assert.deepEqual(rebornDrafts(work, [live], originals, new Set()), [], "no es renacimiento: la edición de la persona aterriza");
    const { state, pairs } = applyTableEdits(stateWith([live]), work, originals, new Set());
    assert.equal(pairs.length, 0);
    assert.equal((state.drafts ?? []).find((d) => d.id === "d1")!.concept, "Farmacia Central");
    assert.deepEqual(changedDrafts(work, [live], originals, new Set()).map((d) => d.id), ["d1"], "y se nombra como cambio mientras tanto");
  });

  it("B2 (control): el descartado corregido no se nombra, no se parchea, no renace", () => {
    const mount = draft({ id: "d1" });
    const work = [{ ...mount, concept: "Editado por mí" }];
    const live = { ...mount, amountMinor: 25000 };
    const originals = new Map([["d1", mount]]);
    const gone = new Set(["d1"]);
    assert.deepEqual(changedDrafts(work, [live], originals, gone), []);
    assert.deepEqual(fallenDrafts(work, [live], gone), []);
    assert.deepEqual(rebornDrafts(work, [live], originals, gone), []);
    assert.equal(applyTableEdits(stateWith([live]), work, originals, gone).pairs.length, 0);
  });

  it("B3 curado: el renacido se nombra COMO RENACIDO, con el nombre vivo — y Guardar no lo convierte", () => {
    const mount = draft({ id: "d2", concept: "", missing: ["concept"] });
    const work = [{ ...mount, concept: "Farmacia", missing: [] }];
    const live = draft({ id: "d2", concept: "Licorería", amountMinor: 77700, day: "2026-11-18" });
    const originals = new Map([["d2", mount]]);
    const reborn = rebornDrafts(work, [live], originals, new Set());
    assert.deepEqual(reborn.map((d) => d.id), ["d2"], "la firma declarada lo detecta");
    assert.equal(reborn[0]!.concept, "Licorería", "y lo que se nombra es el cuerpo VIVO, no la palabra tecleada");
    assert.deepEqual(changedDrafts(work, [live], originals, new Set()), [],
      "la nota de «cambió mientras tanto» ya no lo nombra con la palabra de la persona: esa era media mentira");
    // La composición de save() en producción: la fila renacida sale de
    // la copia (como la caída) y Guardar convierte solo lo que queda.
    const kept = work.filter((w) => !reborn.some((r) => r.id === w.id));
    const st = stateWith([live]);
    const after = commitDrafts(st, kept.map((w) => w.id), ctxOf(st));
    assert.equal(Object.values(after.months).flatMap((m) => m.lines).length, 0, "ninguna línea nace del cuerpo no visto");
    const survivor = (after.drafts ?? []).find((d) => d.id === "d2")!;
    assert.equal(survivor.amountMinor, 77700, "el cuerpo renacido queda intacto en la bandeja, con su monto vivo");
    assert.equal(survivor.concept, "Licorería");
  });

  it("B4 (control): el renacido SIN ediciones de la persona no es renacimiento para la edición — se convierte como cuerpo vivo", () => {
    const mount = draft({ id: "d3" });
    const work = [{ ...mount }];
    const live = draft({ id: "d3", concept: "Licorería", amountMinor: 77700, day: "2026-11-18" });
    const originals = new Map([["d3", mount]]);
    assert.deepEqual(rebornDrafts(work, [live], originals, new Set()), [],
      "sin ediciones no hay nada que proteger: la doctrina de la cura 22 manda");
    assert.deepEqual(changedDrafts(work, [live], originals, new Set()).map((d) => d.id), ["d3"], "y la nota lo nombra como cambio");
  });

  it("la firma, por sus bordes: una sola corrección rival sobre el único campo editado NO es renacimiento", () => {
    const mount = draft({ id: "d4", concept: "" });
    const work = [{ ...mount, concept: "Farmacia" }];
    const live = { ...mount, concept: "Licorería" }; // rival solo en el campo editado
    const originals = new Map([["d4", mount]]);
    assert.deepEqual(rebornDrafts(work, [live], originals, new Set()), [],
      "sin vida ajena fuera de lo editado, es corrección rival: manda la regla por campo de la cura 22");
  });
  it("la fuente de la mesa: la nota del renacido existe, ES/EN, distinta de la del cambio", () => {
    const src = SRC("../../components/faro/review-table.tsx");
    assert.ok(src.includes("rev-reborn"), "la hoja rinde la tercera nota");
    assert.ok(src.includes("Reemplazado mientras tanto") && src.includes("Replaced meanwhile"), "con su frase propia en los dos idiomas");
    assert.ok(src.includes("rebornDrafts("), "y la hoja resta los renacidos de su copia, como resta las caídas");
  });
});

/* ═══════════ §C · LA PUERTA DE PAQUETES (familia 9) ═══════════════ */
function planDraft(partial: Partial<Draft> & Pick<Draft, "id">): Draft {
  return {
    source: "list", kind: "plan", raw: "x", createdAt: "2026-11-01T00:00:00.000Z",
    day: "2026-11-05", sign: "out", amountMinor: null, currency: "USD",
    concept: "Arroz", note: "", book: "purchase", unsure: [], missing: [],
    planId: "plan-1", planState: "pending", estMinor: 5000,
    ...partial,
  };
}
function bookWithPlan(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  const plan: PlanList = { id: "plan-1", name: "Mercado", createdAt: "2026-11-01T00:00:00.000Z", closedAt: "", rows: [] };
  ledger.plans = [plan];
  ledger.drafts = [planDraft({ id: "pd-1" })];
  return ledger;
}

describe("ola23 · §C: la puerta juzga lo nacido en la .357 (G23-4)", () => {
  it("D1 (control): el paquete bueno de la casa — plan vivo y plan cerrado — entra entero", () => {
    const st = bookWithPlan();
    st.plans!.push({ id: "plan-0", name: "Viejo", createdAt: "2026-10-01T00:00:00.000Z", closedAt: "2026-10-20T00:00:00.000Z", rows: [] });
    const revived = JSON.parse(JSON.stringify(st)) as LedgerState;
    assert.equal(isLedgerDeep(revived), true);
    assert.equal(livePlans(revived).length, 1);
    assert.equal(closedPlans(revived).length, 1);
    assert.equal(planRows(revived, "plan-1").length, 1);
  });
  it("D2 curado: una entrada nula en el índice de planes ya no entra — la puerta juzga la forma", () => {
    const bad = JSON.parse(JSON.stringify(bookWithPlan())) as LedgerState;
    (bad as { plans: unknown }).plans = [null];
    assert.equal(isLedgerDeep(bad), false, "el paquete dañado se rechaza en la puerta, no rompe la bandeja al pintar");
    const bad2 = JSON.parse(JSON.stringify(bookWithPlan())) as LedgerState;
    (bad2.plans![0] as { closedAt: unknown }).closedAt = 42;
    assert.equal(isLedgerDeep(bad2), false, "closedAt que no es texto tampoco es forma de plan");
  });
  it("D3 curado: un plan sin closedAt se lee VIVO — la ausencia no es un cierre", () => {
    const st = JSON.parse(JSON.stringify(bookWithPlan())) as LedgerState;
    delete (st.plans![0] as Partial<PlanList>).closedAt;
    assert.equal(isLedgerDeep(st), true, "la forma entra: el juicio es de forma, no de presencia");
    assert.equal(livePlans(st).length, 1, "y sus lectores lo leen vivo, con sus filas alcanzables");
    assert.equal(closedPlans(st).length, 0, "ningún folio cerrado fantasma");
    assert.equal(planRows(st, "plan-1").length, 1);
  });
  it("D4 curado: el borrador sin kind se rechaza en la puerta — no se evapora de las dos librerías", () => {
    const bad = JSON.parse(JSON.stringify(bookWithPlan())) as LedgerState;
    delete (bad.drafts![0] as Partial<Draft>).kind;
    assert.equal(isLedgerDeep(bad), false, "kind es campo requerido del tipo desde antes de los planes: su ausencia es daño, no forma vieja");
    const bad2 = JSON.parse(JSON.stringify(bookWithPlan())) as LedgerState;
    (bad2.drafts![0] as { kind: unknown }).kind = "otro";
    assert.equal(isLedgerDeep(bad2), false, "un kind fuera de {line, plan} tampoco entra");
  });
});

/* ═══════════ §D · LOS NOMBRES INGLESES (familia 7) ═════════════════ */
describe("ola23 · §D: la familia gesture.* en inglés nombra las tarjetas como la cara inglesa (Q23-1)", () => {
  it("ninguna llave gesture.* EN lleva el nombre español de una tarjeta cuya cara inglesa difiere", () => {
    const src = SRC("./i18n.ts");
    const val = (lang: "es" | "en", key: string): string => {
      const re = new RegExp(`"${key}":\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g");
      const hits = [...src.matchAll(re)].map((m) => m[1]!);
      assert.equal(hits.length, 2, `${key} existe en los dos idiomas`);
      return lang === "es" ? hits[0]! : hits[1]!;
    };
    // La vara lee las dos caras: el nombre español sale de la propia llave desk.*.
    for (const desk of ["desk.have", "desk.spend", "desk.debt"]) {
      const esName = val("es", desk);
      const enName = val("en", desk);
      assert.notEqual(esName, enName, `${desk} difiere entre caras (si no, este espécimen no caza nada)`);
      for (const g of ["gesture.help", "gesture.btnIn", "gesture.btnOut", "gesture.btnDue"]) {
        assert.ok(!val("en", g).includes(esName), `${g} EN no dice «${esName}»: dice «${enName}»`);
      }
    }
    assert.ok(val("en", "gesture.help").includes("Have") && val("en", "gesture.help").includes("Payments"),
      "y la ayuda inglesa nombra las tarjetas como el escritorio inglés las titula");
  });
});

/* ═══════════ §E · ASK2 RECIBE EL MODO (familia 6) ═════════════════ */
const KEY = "2026-10";
const PREV = "2026-09";
const ASK_TODAY = "2026-10-22";
function askFixture(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro")!;
  ahorro.subs.push({ id: "cta.banco", nameKey: "cta.banco", customName: "Banco", icon: "vault:bank", hidden: false, order: 10 });
  ahorro.subs.push({ id: "cta.paypal", nameKey: "cta.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 11 });
  ahorro.subs.push({ id: "fondo.viaje", nameKey: "fondo.viaje", customName: "Viaje", icon: "", hidden: false, order: 12 });
  ahorro.subs.push({ id: "fondo.aparte", nameKey: "fondo.aparte", customName: "Colchón extra", icon: "", hidden: false, order: 13 });
  const L = (p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line => line({ monthKey: KEY, ...p });
  ledger.months[KEY] = {
    lines: [
      L({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-10-05" }),
      L({ id: "negocio", kind: "income-variable" as LineKind, concept: "Negocio propio", amountMinor: 39823, bookedOn: "2026-10-18" }),
      L({ id: "dep-banco", kind: "expense-fixed" as LineKind, concept: "Banco", amountMinor: 200000, categoryId: "f-ahorro", subId: "cta.banco", bookedOn: "2026-10-02" }),
      L({ id: "dep-paypal", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 80000, categoryId: "f-ahorro", subId: "cta.paypal", bookedOn: "2026-10-02" }),
      L({ id: "dep-viaje", kind: "expense-fixed" as LineKind, concept: "Viaje", amountMinor: 50000, categoryId: "f-ahorro", subId: "fondo.viaje", bookedOn: "2026-10-03", fund: "saldo", fundHost: "cta.banco" }),
      L({ id: "dep-aparte", kind: "expense-fixed" as LineKind, concept: "Colchón extra", amountMinor: 30000, categoryId: "f-ahorro", subId: "fondo.aparte", bookedOn: "2026-10-03", fund: "aparte" }),
      L({ id: "compra1", kind: "purchase" as LineKind, concept: "Zapatos", amountMinor: 8000, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-10-15" }),
      L({ id: "remesa1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-10", to: "mama" }),
      L({ id: "cuota1", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      L({ id: "compra0", kind: "purchase" as LineKind, concept: "Camisa", amountMinor: 5000, categoryId: "ropa", storeId: "temu", bookedOn: "2026-09-12", monthKey: PREV }),
      L({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-09-05", monthKey: PREV }),
      L({ id: "remesa0", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 15000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-09-10", monthKey: PREV, to: "mama" }),
    ],
  };
  ledger = addRemitPerson(ledger, "Mamá", "mama").state;
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger = addLoan(ledger, { id: "loan1", lender: "Banco Nacional", who: "entity", kind: "interest", amountMinor: 120000, currency: "USD", aprBps: 1200, takenOn: "2026-08-01", book: "fixed", note: "" });
  ledger = { ...ledger, debtPlan: { order: "avalanche", monthlyMinor: 20000, currency: "USD" } };
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}
type Mode3 = "esencial" | "ritmo" | "completo";
function ask(ledger: LedgerState, raw: string, mode: Mode3, lang: "es" | "en" = "es") {
  const st: LedgerState = { ...ledger, settings: { ...ledger.settings, mode } };
  const parseCtx: ParseCtx = { ledger: st, lang, today: ASK_TODAY, display: "USD", makeId: () => "q1", now: `${ASK_TODAY}T12:00:00.000Z` };
  return answerBankQuestion(st, KEY, lang, makeNamer(st.structure, lang), raw, parseCtx, ASK_TODAY, undefined, mode);
}

describe("ola23 · §E: ask2 responde en el piso del modo (A23-1, A23-2, A23-3, A23-5)", () => {
  const ledger = askFixture();
  it("FUTURO: en Esencial y Ritmo nombra Completo y no entrega las cifras del plan; en Completo las entrega", () => {
    for (const m of ["esencial", "ritmo"] as Mode3[]) {
      const r = ask(ledger, "¿Cuándo termino de pagar mis deudas?", m);
      assert.equal(r.kind, "answer");
      if (r.kind !== "answer") continue;
      assert.ok(r.verdict.includes("Completo"), `${m}: el veredicto nombra el piso — «${r.verdict}»`);
      assert.ok(!r.verdict.includes("libre de deudas en"), `${m}: la fecha del plan no se entrega`);
      assert.deepEqual(r.pieces, [], `${m}: sin piezas del plan`);
    }
    const c = ask(ledger, "¿Cuándo termino de pagar mis deudas?", "completo");
    assert.equal(c.kind, "answer");
    if (c.kind === "answer") assert.ok(c.verdict.includes("libre de deudas en"), "en Completo el plan se dice entero, como siempre");
    const en = ask(ledger, "When will I be debt-free?", "esencial", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") assert.ok(en.verdict.includes("Complete"), "la canónica inglesa nombra Complete en Esencial");
  });
  it("REMESAS: el patrón por persona nombra Completo en Esencial y Ritmo; en Completo se entrega", () => {
    for (const m of ["esencial", "ritmo"] as Mode3[]) {
      const r = ask(ledger, "¿Cuánto envío en remesas?", m);
      assert.equal(r.kind, "answer");
      if (r.kind !== "answer") continue;
      assert.ok(r.verdict.includes("Completo"), `${m}: nombra el piso — «${r.verdict}»`);
      assert.ok(!r.verdict.includes("remesa mayor"), `${m}: el patrón por persona no se entrega`);
    }
    const c = ask(ledger, "¿Cuánto envío en remesas?", "completo");
    assert.equal(c.kind, "answer");
    if (c.kind === "answer") assert.ok(c.verdict.includes("remesa mayor"), "en Completo el patrón se dice, como siempre");
  });
  it("AHORROS: la resta sigue entera en Esencial y las piezas dormidas nombran su piso en la etiqueta", () => {
    const e = ask(ledger, "¿Cuánto me queda en ahorros?", "esencial");
    assert.equal(e.kind, "answer");
    if (e.kind !== "answer") return;
    const apartado = e.pieces.find((p) => p.label.startsWith("Apartado del saldo"));
    assert.ok(apartado, "el apartado sigue en la resta (la resta no se rompe)");
    assert.ok(apartado!.label.includes("vive en Completo"), "y su etiqueta nombra su piso");
    const colchon = e.pieces.find((p) => p.label.startsWith("Colchón por cubrir"));
    if (colchon) assert.ok(colchon.label.includes("vive en Completo"), "el colchón nombra su piso donde se cita");
    const c = ask(ledger, "¿Cuánto me queda en ahorros?", "completo");
    assert.equal(c.kind, "answer");
    if (c.kind === "answer") {
      assert.ok(c.pieces.every((p) => !p.label.includes("vive en")), "en Completo ninguna pieza carga un piso ajeno");
    }
  });
  it("FARO MISMO: la puerta cuyo destino duerme cae a la explicación nombrando el piso; despierta, dice su fórmula", () => {
    const e = ask(ledger, "¿Dónde veo en qué se va mi dinero?", "esencial");
    assert.equal(e.kind, "answer");
    if (e.kind === "answer") {
      assert.ok(e.verdict.includes("Ritmo"), "el flujo nombra Ritmo en Esencial");
      assert.ok(!e.verdict.includes("mismas cifras"), "la fórmula no se dice de una cara que el modo no muestra");
    }
    const r = ask(ledger, "¿Dónde veo en qué se va mi dinero?", "ritmo");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.ok(r.verdict.includes("mismas cifras"), "en Ritmo el flujo vive: la fórmula vuelve");
    const esc = ask(ledger, "¿Dónde veo qué pasa si no pago una cuota?", "ritmo");
    assert.equal(esc.kind, "answer");
    if (esc.kind === "answer") {
      assert.ok(esc.verdict.includes("Completo"), "los escenarios nombran Completo en Ritmo");
      assert.ok(!esc.verdict.includes("mismas cifras"));
    }
    const plan = ask(ledger, "¿Dónde veo mi plan de pago?", "esencial");
    assert.equal(plan.kind, "answer");
    if (plan.kind === "answer") assert.ok(!plan.verdict.includes("mismas cifras") || plan.verdict.includes("Completo"),
      "la puerta del plan — que ya aguantaba — sigue sin prometer de más");
  });
  it("la tabla de pisos del motor coincide con el registro, asiento por asiento (la doctrina de las tablas espejo)", () => {
    for (const [feature, floor] of Object.entries(ASK_FLOORS)) {
      assert.equal(featureMinMode(feature as never), floor,
        `ASK_FLOORS declara ${feature} en ${floor} y el registro manda: si el registro se movió, la tabla se corrige con su razón`);
    }
    const byId = new Map(FARO_FUNCTION_MAP.map((f) => [f.id, f]));
    assert.equal(byId.get("cobros.plan")!.minMode, featureMinMode("loans.payoff-plan"), "el piso declarado del plan de pagos es el de su asiento");
    assert.equal(byId.get("estudio.flujo")!.minMode, featureMinMode("study.where"), "el del flujo es el de sus caras nombradas (study.where)");
    assert.equal(byId.get("asesor.escenarios")!.minMode, featureMinMode("advisor.scenarios"), "el de los escenarios es el de su asiento");
  });
  it("el espejo: sin silencios falsos — ranking, gustos, historia y how responden en Esencial", () => {
    for (const q of ["¿Quién me debe más?", "¿Cuánto tengo para gastar en gustos?", "¿Cuánto gasté el último mes en tiendas?", "¿Cómo voy?"]) {
      const r = ask(ledger, q, "esencial");
      assert.equal(r.kind, "answer", `«${q}» responde en Esencial con caras de Esencial`);
    }
  });
});

/* ═══════════ §F · LA PUERTA DE LA NOTA DEL PLAN (familia 8) ═══════ */
describe("ola23 · §F: la validación de goTopic juzga el piso declarado del tema cuando la puerta no tiene asiento (§N-23-1)", () => {
  it("los datos que la regla consume: el tema del plan declara Ritmo, su puerta no tiene asiento, y el alcance decide", () => {
    const topic = findTopic("lista-plan")!;
    assert.equal(topic.mode, "ritmo", "el tema sigue a su función (regla 25): el plan declara Ritmo");
    assert.equal(featureForGo(topic.go!), null, "la puerta del escritorio no tiene asiento: la validación vieja no veía nada");
    assert.equal(modeReaches("esencial", topic.mode!), false, "en Esencial el destino duerme: la puerta debe hablar");
    assert.equal(modeReaches("ritmo", topic.mode!), true, "en Ritmo aterriza en su tarjeta, como siempre");
  });
  it("la fuente del proveedor: goTopic consulta el piso del tema cuando no hay asiento de función", () => {
    const src = SRC("../../components/faro/provider.tsx");
    const goTopicBody = src.slice(src.indexOf("const goTopic ="), src.indexOf("const goTopic =") + 5200);
    assert.ok(goTopicBody.includes("findTopic("), "goTopic lee el tema, no solo la puerta");
    assert.ok(goTopicBody.includes("modeReaches("), "y juzga su piso declarado contra el modo vigente");
  });
});
