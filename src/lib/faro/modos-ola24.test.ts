/**
 * modos-ola24 — LA CURA DE LA OLA 24 (Equipo Amigo).
 * Las cercas permanentes de las nueve familias; los especímenes son los
 * de la caza 24 (OLA24-*.md) vueltos al revés: lo que rompía, ahora
 * aguanta, y los controles que aguantaron siguen verdes.
 *
 *  (1) Q24-C1 — el sello de la pregunta vive en el aparato, no en el
 *      libro: mostrar la lista no commitea, el Deshacer no pelea con
 *      ningún efecto, y la pregunta se hace una vez por plazo (la
 *      renovación rearma porque el plazo cambia).
 *  (2) G24-3 — borrar la anotación portadora no apaga la serie: la
 *      configuración resuelta migra a la instancia más nueva restante
 *      dentro de la misma receta de borrado.
 *  (3) G24-2 — el sello del día guarda QUÉ series asentaron: la que
 *      despierta al mediodía asienta el mismo día; la deshecha no
 *      re-asienta; la forma legada (día entero) sigue deteniendo.
 *  (4) G24-1 — la puerta juzga la FORMA de los deseos (W1–W6 al revés):
 *      lo que los lectores desreferencian, la puerta lo exige; nada
 *      entra para evaporarse en la primera mutación vecina.
 *  (5) G24-4 — el anuncio aprende la cobertura por bookedOn sobre lo ya
 *      nacido con la forma vieja (.356–.360): el período pagado no se
 *      anuncia vencido; los vencimientos verdaderos sí.
 *  (6) §F3 — la vuelta no se acusa a sí misma: la identidad de la línea
 *      se juzga por su contenido; el lote es procedencia, y la línea
 *      restaurada por la propia casa se juzga exacta en la segunda
 *      vuelta (una edición verdadera sigue juzgándose fuzzy).
 *  (7) Q24-1 + E24-1 + O24-1 — las enseñanzas nombran su piso: el plazo
 *      de la lista de espera vive en [[Ritmo]]; el plan de deudas y el
 *      patrón de remesas son la profundidad de [[Completo]]; Importar
 *      nombra las cinco pérdidas y la rama de la copia dañada.
 *  (8) Q24-C1 (Cara) — «del plan:» nace en el idioma del libro.
 *  (9) M24-3 + M24-4g — la cerca vive en modos-ola14 (el bloque M24).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  autopaySealKey, autopaySealedOn, autopaySealedSeries, sealAutopayDay,
  seriesAutopayConfig, settleAutopay, type AutopaySealStorage,
} from "./autopay.ts";
import { accounts, importBook } from "./bankbook.ts";
import { applyImport, buildReview, fromFaroPdf, pickSource } from "./bankparse.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { addDrafts } from "./drafts.ts";
import { duesWindow } from "./dues.ts";
import { pdfFile, type ExportPick } from "./export-docs.ts";
import { FARO_ATTACHMENT, parseFaroPdf, type FaroPdf } from "./faropdf.ts";
import type { PdfDoc } from "./pdfstmt.ts";
import { closePlan, createPlan, markBought, planRows } from "./plan.ts";
import { deleteLine } from "./reducer.ts";
import {
  addWish, isRipe, leaveWish, markWishAsked, renewWish, wishAskedFor,
  wishesOf, yearAccount, type WishAskStorage,
} from "./waitlist.ts";
import { findTopic } from "../manual/topics.ts";
import type { Category, Draft, LedgerState, Line, LineKind, Wish } from "./types.ts";

/* ------------------------------------------------------------ especímenes */

const TODAY = "2026-11-21";
const NOW24 = new Date("2026-11-21T12:00:00.000Z");

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: "2026-11", currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function cuota(id: string, series: string, monthKey: string, due: string, cadence: Line["cadence"], extra: Partial<Line> = {}): Line {
  return line({
    id, kind: "subscription" as LineKind, concept: "Cuota", amountMinor: 1299,
    seriesId: series, monthKey, recurring: true, cadence,
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

function wishOk(partial: Partial<Wish> & Pick<Wish, "id">): Wish {
  return {
    concept: "Zapatos", amountMinor: 12000, currency: "USD", store: "Tienda",
    createdAt: "2026-11-01T12:00:00.000Z", waitHours: 48,
    dueAt: "2026-11-03T12:00:00.000Z", askedAt: "", renewals: 0,
    permanent: false, status: "waiting", closedAt: "",
    ...partial,
  };
}

function bookWishes(wishes: unknown): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  (ledger as unknown as Record<string, unknown>).wishes = wishes;
  return ledger;
}

function memStorage(): AutopaySealStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  // OLA 25: el contrato del almacenamiento creció una enumeración
  // (la casa del sello lista sus llaves por serie, como el
  // localStorage del aparato siempre pudo); el doble la cumple sobre
  // su mapa, sin cambiar lo que esta cerca mide.
  return { map, read: (k) => map.get(k) ?? null, write: (k, v) => { map.set(k, v); }, keys: (p) => [...map.keys()].filter((k) => k.startsWith(p)) };
}

function memWishStorage(): WishAskStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, read: (k) => map.get(k) ?? null, write: (k, v) => { map.set(k, v); } };
}

/* ------------------------------------------- (1) el sello de la pregunta */

describe("ola24 · (1) la marca de la pregunta vive en el aparato (Q24-C1)", () => {
  it("la marca se ata al deseo Y a su plazo: preguntado una vez por plazo; la renovación rearma", () => {
    const storage = memWishStorage();
    const { state, wish } = addWish(bookWishes([]), { concept: "Bici", amountMinor: 50000, currency: "USD", store: "" }, NOW24);
    assert.equal(wishAskedFor(storage, "uid-1", wish), false, "recién nacido, nadie ha preguntado");
    markWishAsked(storage, "uid-1", [wish]);
    assert.equal(wishAskedFor(storage, "uid-1", wish), true, "marcado: la pregunta de este plazo ya se hizo");
    assert.equal(wishAskedFor(storage, "uid-2", wish), false, "la marca es del aparato de ESTA persona, no del libro");
    // Renovar cambia el plazo (dueAt): la marca vieja no cubre el plazo nuevo.
    const renewed = renewWish(state, wish.id, new Date("2026-11-22T12:00:00.000Z"));
    const w2 = wishesOf(renewed)[0];
    assert.notEqual(w2.dueAt, wish.dueAt);
    assert.equal(wishAskedFor(storage, "uid-1", w2), false, "plazo nuevo, pregunta nueva: la marca no bloquea la renovación");
    markWishAsked(storage, "uid-1", [w2]);
    assert.equal(wishAskedFor(storage, "uid-1", w2), true);
  });

  it("la marca NO toca el libro: marcar no cambia ni la revisión ni un byte del estado", () => {
    const storage = memWishStorage();
    const { state, wish } = addWish(bookWishes([]), { concept: "Bici", amountMinor: 50000, currency: "USD", store: "" }, NOW24);
    const before = JSON.stringify(state);
    markWishAsked(storage, "uid-1", [wish]);
    assert.equal(JSON.stringify(state), before, "el libro queda idéntico: ningún commit, ningún sello dentro");
    assert.ok(storage.map.size === 1, "la marca vive en el aparato");
  });

  it("un aparato que no guarda degrada sin romper: la marca cae a la visita, jamás a una pila bloqueada", () => {
    const roto: WishAskStorage = { read: () => null, write: () => { throw new Error("sin espacio"); } };
    const w = wishOk({ id: "w-x" });
    assert.doesNotThrow(() => markWishAsked(roto, "uid-1", [w]));
    assert.equal(wishAskedFor(roto, "uid-1", w), false, "sin marca durable, la pregunta puede repetirse en otra visita — daño menor y dicho");
    const corrupto: WishAskStorage = { read: () => "{no-json", write: () => {} };
    assert.equal(wishAskedFor(corrupto, "uid-1", w), false, "una marca corrupta se lee con desconfianza y no rompe");
  });

  it("fuente: la sección ya no sella en el libro — ningún askStamp, la marca va al aparato", () => {
    const src = readFileSync(new URL("../../components/faro/waitlist.tsx", import.meta.url), "utf8");
    assert.ok(!src.includes("askStamp"), "la receta del sello salió de la sección: mostrar ya no commitea");
    assert.ok(src.includes("markWishAsked"), "el efecto marca en el aparato (markWishAsked), fuera del libro");
    assert.ok(src.includes("wishAskedFor"), "y la tarjeta lee la marca del aparato para no repetir la pregunta");
    assert.ok(isRipe(wishOk({ id: "w-maduro", dueAt: "2026-11-20T12:00:00.000Z" }), NOW24), "la madurez se juzga por el plazo, no por un sello del libro");
  });
});

/* --------------------------------- (2) la configuración sobrevive al papel */

describe("ola24 · (2) borrar la portadora migra la configuración (G24-3)", () => {
  const portadora = () => cuota("p-oct", "serie-1", "2026-10", "2026-10-15", "monthly", AUTO);
  const manual = () => cuota("m-nov", "serie-1", "2026-11", "2026-11-15", "monthly");

  it("el espécimen de Guardián (T3-b) al revés: borrada la portadora, diciembre asienta con su cuenta", () => {
    const conPortadora = book({ "2026-10": [portadora()], "2026-11": [manual()] });
    assert.deepEqual(settleAutopay(conPortadora, "2026-12-20").settled.map((s) => s.on), ["2026-12-15"],
      "control intacto: con la portadora en el libro, diciembre asienta");
    const borrado = deleteLine(conPortadora, "2026-10", "p-oct");
    const restantes = Object.values(borrado.months).flatMap((m) => m.lines).filter((l) => l.seriesId === "serie-1");
    assert.deepEqual(seriesAutopayConfig(restantes), { on: true, accountId: "acct-banco" },
      "la configuración migró a la instancia restante dentro de la misma receta de borrado");
    const r = settleAutopay(borrado, "2026-12-20");
    assert.deepEqual(r.settled.map((s) => `${s.seriesId}@${s.on}`), ["serie-1@2026-12-15"],
      "la serie sigue viva tras el borrado de su papel");
    assert.ok(r.settled.every((s) => s.accountId === "acct-banco"), "y asienta con la cuenta que la persona mandó");
  });

  it("la migración también guarda el apagado explícito: borrar el papel del false no revive la serie", () => {
    const st = book({
      "2026-09": [cuota("p-sep", "serie-1", "2026-09", "2026-09-15", "monthly", AUTO)],
      "2026-11": [cuota("m-nov", "serie-1", "2026-11", "2026-11-15", "monthly", { autopay: false })],
    });
    assert.equal(settleAutopay(st, "2026-12-20").settled.length, 0, "la palabra más nueva manda: apagado");
    const borrado = deleteLine(st, "2026-11", "m-nov");
    const restantes = Object.values(borrado.months).flatMap((m) => m.lines).filter((l) => l.seriesId === "serie-1");
    assert.equal(seriesAutopayConfig(restantes)?.on, false, "el false migró: borrar su papel no es encender la serie");
    assert.equal(settleAutopay(borrado, "2026-12-20").settled.length, 0);
  });

  it("borrar una línea que no porta nada no toca la configuración de nadie", () => {
    const st = book({ "2026-10": [portadora()], "2026-11": [manual(), cuota("otra", "serie-2", "2026-11", "2026-11-18", "monthly")] });
    const borrado = deleteLine(st, "2026-11", "otra");
    const restantes = Object.values(borrado.months).flatMap((m) => m.lines).filter((l) => l.seriesId === "serie-1");
    assert.deepEqual(seriesAutopayConfig(restantes), { on: true, accountId: "acct-banco" });
    assert.equal(restantes.find((l) => l.id === "m-nov")!.autopay, undefined, "sin migración innecesaria: la manual queda como estaba");
  });
});

/* --------------------------------------- (3) el sello guarda qué series */

/** El efecto del proveedor, replicado paso a paso desde su texto curado
 * (provider.tsx): la forma legada detiene el pase entero; si no, el pase
 * corre con el conjunto sellado (aparato + sesión); solo se sella lo que
 * el pase asentó, por serie. */
function runEffect24(storage: AutopaySealStorage, ref: { day: string; series: Set<string> }, state: LedgerState, today: string): string[] {
  if (autopaySealedOn(storage, "uid-1", today)) return [];
  if (ref.day !== today) { ref.day = today; ref.series = new Set(); }
  const sealedSeries = new Set<string>([...autopaySealedSeries(storage, "uid-1", today), ...ref.series]);
  const { settled } = settleAutopay(state, today, sealedSeries);
  if (!settled.length) return [];
  const ids = [...new Set(settled.map((s) => s.seriesId))];
  for (const id of ids) ref.series.add(id);
  sealAutopayDay(storage, "uid-1", today, ids);
  return settled.map((s) => `${s.seriesId}@${s.on}`);
}

describe("ola24 · (3) el sello del día, por serie (G24-2)", () => {
  it("la que despierta al mediodía asienta EL MISMO DÍA a su siguiente apertura", () => {
    const storage = memStorage();
    const ref = { day: "", series: new Set<string>() };
    const manana = book({
      "2026-10": [
        cuota("a-oct", "serie-a", "2026-10", "2026-10-15", "monthly", AUTO),
        cuota("b-oct", "serie-b", "2026-10", "2026-10-21", "monthly"),
      ],
    });
    assert.deepEqual(runEffect24(storage, ref, manana, TODAY), ["serie-a@2026-11-15"], "A asienta por la mañana");
    assert.deepEqual([...autopaySealedSeries(storage, "uid-1", TODAY)], ["serie-a"], "el sello nombra a A, no al día entero");
    // Mediodía: la foto verdadera tras el asentamiento de A, y la
    // persona enciende el autopay de B, cuyo período vence HOY.
    const mediodia = book({
      "2026-10": [cuota("a-oct", "serie-a", "2026-10", "2026-10-15", "monthly", AUTO)],
      "2026-11": [
        cuota("auto-serie-a-2026-11-15", "serie-a", "2026-11", "2026-12-15", "monthly", { ...AUTO, bookedOn: "2026-11-15", sourceId: "acct-banco" }),
        cuota("b-oct", "serie-b", "2026-10", "2026-10-21", "monthly", AUTO),
      ],
    });
    assert.deepEqual(runEffect24(storage, ref, mediodia, TODAY), ["serie-b@2026-11-21"],
      "B no hereda el sello de A: asienta hoy, como la doctrina promete");
    assert.deepEqual([...autopaySealedSeries(storage, "uid-1", TODAY)].sort(), ["serie-a", "serie-b"],
      "el sello crece por serie: dos sellos parciales se funden en un conjunto");
  });

  it("deshacer el asentamiento de A y reabrir: A NO re-asienta (su serie quedó en el conjunto)", () => {
    const storage = memStorage();
    const ref = { day: "", series: new Set<string>() };
    const manana = book({ "2026-10": [cuota("a-oct", "serie-a", "2026-10", "2026-10-15", "monthly", AUTO)] });
    assert.deepEqual(runEffect24(storage, ref, manana, TODAY), ["serie-a@2026-11-15"]);
    // La persona deshace: el libro vuelve a la foto de la mañana. El
    // sello vive en el aparato, fuera del alcance del Deshacer.
    assert.deepEqual(runEffect24(storage, ref, manana, TODAY), [], "el pase corre pero salta la serie sellada: nada se re-asienta");
    assert.deepEqual(runEffect24(storage, { day: "", series: new Set<string>() }, manana, TODAY), [],
      "ni con una sesión nueva: el sello durable manda todo el día");
    assert.deepEqual(runEffect24(storage, { day: "", series: new Set<string>() }, manana, "2026-11-22"), ["serie-a@2026-11-15"],
      "mañana el sello ya no coincide y la serie vuelve a asentar");
  });

  it("el pase vacío sigue sin sellar (T2-a de la ola 24, que aguantó, sigue aguantando)", () => {
    const storage = memStorage();
    const ref = { day: "", series: new Set<string>() };
    const sinAuto = book({ "2026-10": [cuota("a-oct", "serie-a", "2026-10", "2026-10-15", "monthly")] });
    assert.deepEqual(runEffect24(storage, ref, sinAuto, TODAY), []);
    assert.equal(autopaySealedOn(storage, "uid-1", TODAY), false);
    assert.equal(autopaySealedSeries(storage, "uid-1", TODAY).size, 0, "donde nada se asentó no hay nada que aguantar");
    const conAuto = book({ "2026-10": [cuota("a-oct", "serie-a", "2026-10", "2026-10-15", "monthly", AUTO)] });
    assert.deepEqual(runEffect24(storage, ref, conAuto, TODAY), ["serie-a@2026-11-15"], "la serie activada al mediodía asienta ese día");
  });

  it("la forma legada (el día entero en texto llano) sigue deteniendo el pase, como antes", () => {
    const storage = memStorage();
    storage.map.set(autopaySealKey("uid-1"), TODAY);
    assert.equal(autopaySealedOn(storage, "uid-1", TODAY), true);
    const conAuto = book({ "2026-10": [cuota("a-oct", "serie-a", "2026-10", "2026-10-15", "monthly", AUTO)] });
    assert.deepEqual(runEffect24(storage, { day: "", series: new Set<string>() }, conAuto, TODAY), [],
      "un sello escrito por la .361 manda igual: compatibilidad hacia atrás");
  });

  it("fuente: el proveedor corre el pase con el conjunto y sella por serie", () => {
    const src = readFileSync(new URL("../../components/faro/provider.tsx", import.meta.url), "utf8");
    assert.ok(src.includes("settleAutopay(session.ledger, today, sealedSeries)"), "el pase recibe el conjunto sellado");
    assert.ok(src.includes("sealAutopayDay(sealStorage, userId, today, settledSeries)"), "y el sello se escribe con las series asentadas");
    assert.ok(src.includes("autopaySealedSeries(sealStorage, userId, today)"), "el conjunto se lee del aparato al abrir");
  });
});

/* ------------------------------------- (4) la puerta juzga los deseos */

describe("ola24 · (4) wishes: la puerta aprende la forma (G24-1, W1–W6 al revés)", () => {
  it("W0 (control, aguantaba): los deseos de la casa pasan la puerta y los motores corren", () => {
    const { state, wish } = addWish(bookWishes([]), { concept: "Bici", amountMinor: 50000, currency: "USD", store: "" }, NOW24);
    const left = leaveWish(state, wish.id, NOW24);
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(left))), true);
    const acc = yearAccount(left, 2026);
    assert.equal(acc.saved.length, 1);
    assert.equal(acc.saved[0].minor, 50000);
    const renewed = renewWish(state, wish.id, NOW24);
    assert.equal(wishesOf(renewed)[0].renewals, 1);
  });

  it("W5 (control, aguantaba): wishes que no es lista se rechaza; la entrada nula se tolera y se filtra", () => {
    assert.equal(isLedgerDeep(bookWishes("corrupto")), false);
    const st = bookWishes([null, wishOk({ id: "w-ok" })]);
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(st))), true);
    assert.deepEqual(wishesOf(st).map((w) => w.id), ["w-ok"]);
  });

  it("W1/W1b al revés: sin closedAt (o numérico) el paquete NO entra — la puerta juzga lo que yearAccount desreferencia", () => {
    const sinCierre = wishOk({ id: "w-sin-cierre", status: "left" }) as unknown as Record<string, unknown>;
    delete sinCierre.closedAt;
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(bookWishes([sinCierre])))), false,
      "antes entraba y rompía yearAccount al pintar; ahora la puerta lo detiene");
    const cierreNum = wishOk({ id: "w-cierre-num", status: "bought", closedAt: 20261121 as unknown as string });
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(bookWishes([cierreNum])))), false);
  });

  it("W2/W3/W4 al revés: sin waitHours o sin renewals el paquete NO entra — nada pinta NaN ni pierde la vía a permanente", () => {
    const sinPlazo = wishOk({ id: "w-sin-plazo" }) as unknown as Record<string, unknown>;
    delete sinPlazo.waitHours;
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(bookWishes([sinPlazo])))), false,
      "renewWish y el anillo desreferencian waitHours: la puerta lo exige");
    const sinRenov = wishOk({ id: "w-sin-renov" }) as unknown as Record<string, unknown>;
    delete sinRenov.renewals;
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(bookWishes([sinRenov])))), false,
      "renewals se lee y se incrementa: sin él el contador nacía NaN");
  });

  it("W6 al revés: el deseo sin la forma del filtro ya no entra para evaporarse — la puerta lo detiene entero", () => {
    const sinStatus = wishOk({ id: "w-sin-status" }) as unknown as Record<string, unknown>;
    delete sinStatus.status;
    const st = bookWishes([sinStatus, wishOk({ id: "w-sano" })]);
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(st))), false,
      "el paquete con un deseo irreconocible no entra: nada se evapora en la primera mutación vecina");
    // Y los paquetes buenos de la casa, en todos los estados, entran enteros:
    const buenos = bookWishes([
      wishOk({ id: "w-espera" }),
      wishOk({ id: "w-dejado", status: "left", closedAt: "2026-11-10T12:00:00.000Z" }),
      wishOk({ id: "w-comprado", status: "bought", closedAt: "2026-11-11T12:00:00.000Z", link: "https://tienda.example/x", look: { priceMinor: 11000, currency: "USD", at: "2026-11-11", forDue: "2026-11-03T12:00:00.000Z" } }),
      wishOk({ id: "w-permanente", permanent: true, renewals: 2, amountMinor: null }),
    ]);
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(buenos))), true, "waiting, left, bought (con enlace y mirada), permanente sin precio: todos entran");
    const miradaRota = wishOk({ id: "w-mirada", look: { priceMinor: "11000", currency: "USD", at: "2026-11-11", forDue: "2026-11-03" } as unknown as Wish["look"] });
    assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(bookWishes([miradaRota])))), false,
      "la mirada (look) también se juzga: su precio es un número o el deseo no entra");
  });
});

/* --------------------------- (5) el anuncio sobre la forma vieja (.360) */

/** La instancia tal como nacía con la .356–.360: nextDue = su propia
 * fecha pagada; el período pagado también en bookedOn. */
function vieja(series: string, due: string, extra: Partial<Line> = {}): Line {
  return cuota(`auto-${series}-${due}`, series, due.slice(0, 7), due, "monthly", {
    ...AUTO, sourceId: "acct-banco", history: [], ...extra,
  });
}

describe("ola24 · (5) el anuncio aprende la cobertura por bookedOn (G24-4)", () => {
  it("T4-b al revés: el libro de la .360 abre y NO anuncia vencido el período que ya pagó", () => {
    const st = book({
      "2026-10": [cuota("p-oct", "serie-bf", "2026-10", "2026-10-15", "monthly", AUTO)],
      "2026-11": [vieja("serie-bf", "2026-11-15")],
    });
    const hoy = duesWindow(st, 3, "2026-11-21").filter((e) => e.kind === "cuota");
    assert.deepEqual(hoy.map((e) => e.on), [],
      "la instancia anotada cubre su período por bookedOn: la fila falsa murió en la ventana, no al rodar el mes");
  });

  it("los vencimientos verdaderos se siguen anunciando, y la caminata sobre la forma vieja aguanta (T4-a)", () => {
    const st = book({
      "2026-10": [cuota("p-oct", "serie-bf", "2026-10", "2026-10-15", "monthly", AUTO)],
      "2026-11": [
        vieja("serie-bf", "2026-11-15"),
        cuota("q-nov", "serie-real", "2026-11", "2026-11-22", "monthly"),
      ],
    });
    const hoy = duesWindow(st, 3, "2026-11-21").filter((e) => e.kind === "cuota");
    assert.deepEqual(hoy.map((e) => e.on), ["2026-11-22"], "la cuota verdadera de mañana se anuncia; la pagada, no");
    // La caminata sobre la forma vieja, con el libro de T4-a (la
    // instancia vieja en el mes de su período, no en el corriente):
    const libroViejo = book({
      "2026-09": [cuota("p-sep", "serie-bf", "2026-09", "2026-09-15", "monthly", AUTO)],
      "2026-10": [vieja("serie-bf", "2026-10-15")],
    });
    const r = settleAutopay(libroViejo, TODAY);
    assert.deepEqual(r.settled.map((s) => s.on), ["2026-11-15"], "lo viejo no se re-asienta: solo lo debido nuevo");
    const nueva = Object.values(r.state.months).flatMap((m) => m.lines).find((l) => l.id === "auto-serie-bf-2026-11-15")!;
    assert.equal(nueva.nextDue, "2026-12-15");
    assert.equal(settleAutopay(r.state, TODAY).settled.length, 0, "segunda apertura sobre la mezcla de formas: nada se re-asienta");
  });

  it("una línea de la PERSONA con el mismo período no queda tapada por la cobertura automática", () => {
    // La cobertura suprime solo cuando el período lo cubre la instancia
    // automática Y ninguna línea propia lo reclama: si la persona anotó
    // su propia cuota para ese período, su aviso es suyo.
    const st = book({
      "2026-10": [cuota("p-oct", "serie-bf", "2026-10", "2026-10-15", "monthly", AUTO)],
      "2026-11": [vieja("serie-bf", "2026-11-15"), cuota("propia", "serie-bf", "2026-11", "2026-11-15", "monthly")],
    });
    const hoy = duesWindow(st, 3, "2026-11-21").filter((e) => e.kind === "cuota");
    assert.deepEqual(hoy.map((e) => e.on), ["2026-11-15"], "la línea propia anuncia: la cobertura automática no la silencia");
  });
});

/* --------------------------------- (6) la vuelta no se acusa a sí misma */

const sub24 = (id: string, name: string, icon = "Circle") => ({ id, nameKey: "", customName: name, icon, hidden: false, order: 0 });
const cat24 = (id: string, group: "fixed" | "variable", name: string, subs: ReturnType<typeof sub24>[], role = ""): Category =>
  ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0, group, role, subs });

function ledger24(lines: Line[]): LedgerState {
  return {
    v: 1, revision: 1, updatedAt: "", audit: [],
    months: lines.length ? { "2026-11": { lines } } : {},
    settings: { lang: "es", theme: "claro", display: "NIO", rateE4: 366243, rateSource: "", rateAsOf: "", savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {} } as LedgerState["settings"],
    structure: {
      categories: [
        cat24("f-alimentos", "fixed", "Alimentos", [sub24("f.alimentos.despensa", "Despensa")]),
        cat24("f-ahorro", "fixed", "Ahorro", [sub24("vault-pp", "PayPal Ahorro", "vault")], "savings"),
        cat24("v-entretenimiento", "variable", "Entretenimiento", [sub24("v.e.restaurantes", "Restaurantes")]),
        cat24("v-personales", "variable", "Personales", [sub24("v.p.otros", "Otros")]),
      ],
      purchases: [{ id: "super", nameKey: "", customName: "Supermercado", icon: "Package", hidden: false, order: 0 }],
      catalog: [{ id: "prov-netflix", nameKey: "", customName: "Netflix", icon: "Tv", hidden: false, order: 0, kind: "sub" } as never],
    },
  } as LedgerState;
}

let seq24 = 0;
const line24 = (partial: Partial<Line> & { kind: Line["kind"]; concept: string; amountMinor: number }): Line => {
  const id = `L${++seq24}`;
  return {
    id, seriesId: id, monthKey: "2026-11", currency: "NIO", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "",
    aprBps: 0, balanceMinor: null, balanceCurrency: "NIO", icon: "", history: [], bookedOn: "2026-11-10", startedOn: "",
    ...partial,
  } as Line;
};

const LINES24: Line[] = [
  line24({ kind: "income-fixed", concept: "Salario", amountMinor: 300000, bookedOn: "2026-11-01" }),
  line24({ kind: "expense-fixed", concept: "Arroz y frijoles", amountMinor: 25000, categoryId: "f-alimentos", note: "nota que no se imprime", bookedOn: "2026-11-05" }),
  line24({ kind: "expense-variable", concept: "Cena fuera", amountMinor: 18000, categoryId: "v-entretenimiento", subId: "v.e.restaurantes", bookedOn: "2026-11-20" }),
  line24({ kind: "subscription", concept: "Netflix", amountMinor: 15000, categoryId: "v-entretenimiento", providerId: "prov-netflix", bookedOn: "2026-11-03" }),
];
const PICK24: ExportPick = { scope: "month", activeOnly: false, kinds: ["income-fixed", "income-variable", "expense-fixed", "expense-variable", "purchase", "subscription"], savings: true, debt: false, summary: false, charts: false, advice: false, remit: false };

/** pdf.js, como en captura359: palabras posicionadas + los adjuntos. */
async function extract24(buf: ArrayBuffer): Promise<PdfDoc & { attachments?: Record<string, Uint8Array> }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  (pdfjs as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    new URL("../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).pathname;
  const task = (pdfjs as unknown as { getDocument: (o: object) => { promise: Promise<never> } }).getDocument({ data: new Uint8Array(buf), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const doc = (await task.promise) as unknown as {
    numPages: number;
    getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str?: string; transform: number[] }[] }>; cleanup: () => void }>;
    getAttachments: () => Promise<Map<string, { filename?: string }> | Record<string, { filename?: string }> | null>;
    getAttachmentContent: (id: string) => Promise<{ content?: Uint8Array } | Uint8Array>;
  };
  const pages: PdfDoc["pages"] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const words: PdfDoc["pages"][number] = [];
    for (const it of tc.items) {
      if (!it.str) continue;
      words.push({ s: it.str, x: Math.round(it.transform[4] * 10) / 10, y: Math.round(it.transform[5] * 10) / 10 });
    }
    pages.push(words);
    page.cleanup();
  }
  const atts = await doc.getAttachments();
  const attachments: Record<string, Uint8Array> = {};
  if (atts) {
    const entries = (atts instanceof Map ? [...atts.entries()] : Object.entries(atts)) as [string, { filename?: string }][];
    for (const [id, att] of entries) {
      const full = (await doc.getAttachmentContent(id)) as { content?: Uint8Array } | Uint8Array;
      const content = full instanceof Uint8Array ? full : full?.content;
      if (content) attachments[att?.filename || id] = content;
    }
  }
  return { pages, attachments };
}

const review24 = (state: LedgerState, faro: FaroPdf) => {
  const f = fromFaroPdf("Faro_2026-11.pdf", faro);
  const srcs = [pickSource(f, importBook(state), accounts(state))];
  const rv = buildReview(state, [f], srcs, makeNamer(state.structure, "es"), "es");
  return { f, rv, srcs };
};

describe("ola24 · (6) la segunda vuelta juzga exacta a la restaurada (§F3)", () => {
  it("importar dos veces el mismo PDF con copia: la segunda vuelta dice «exact», no «editada»", async () => {
    const state = ledger24(LINES24);
    const names = makeNamer(state.structure, "es");
    const doc = await extract24(await pdfFile(state, "2026-11", "es", names, PICK24).arrayBuffer());
    const faro = parseFaroPdf(doc, doc.attachments?.[FARO_ATTACHMENT]);
    assert.ok(faro && faro.copy === "exact", "el PDF propio se reconoce con su copia exacta");
    // Primera vuelta: el libro vacío recibe las líneas, con SU lote.
    const empty = ledger24([]);
    const r1 = review24(empty, faro);
    const applied = applyImport(empty, r1.rv, [r1.f], r1.srcs, "batch-ola24-1");
    const restored = applied.state.months["2026-11"].lines;
    assert.equal(restored.length, LINES24.length);
    assert.ok(restored.every((l) => l.batch === "batch-ola24-1"), "la restauración escribió su lote sobre cada línea (la procedencia que el juicio viejo acusaba)");
    // Segunda vuelta contra el libro restaurado: la identidad es el
    // contenido; el lote no acusa.
    const r2 = review24(applied.state, faro);
    const exactas = r2.rv.rows.filter((r) => r.exact);
    assert.equal(exactas.length, LINES24.length);
    assert.ok(exactas.every((r) => r.dup === "exact"),
      `la segunda vuelta juzga: ${exactas.map((r) => `${r.exact!.concept}=${r.dup}`).join(", ")}`);
    // Control: una edición VERDADERA de la persona sí se juzga fuzzy.
    const editado: LedgerState = {
      ...applied.state,
      months: { "2026-11": { lines: restored.map((l) => (l.concept === "Netflix" ? { ...l, amountMinor: 16000 } : l)) } },
    };
    const r3 = review24(editado, faro);
    const netflix = r3.rv.rows.find((r) => r.exact?.concept === "Netflix")!;
    assert.equal(netflix.dup, "fuzzy", "la identidad sigue discriminando: lo editado de verdad no se disfraza de exacto");
    assert.ok(r3.rv.rows.filter((r) => r.exact && r.exact.concept !== "Netflix").every((r) => r.dup === "exact"));
  });
});

/* --------------------------------- (7) las enseñanzas nombran su piso */

describe("ola24 · (7) las dos enseñanzas y la completitud F11 (Q24-1, E24-1, O24-1)", () => {
  it("lista-espera: su how nombra [[Ritmo]] donde manda a cambiar el plazo, ES/EN", () => {
    const t = findTopic("lista-espera")!;
    assert.ok(t, "el tema existe");
    const how = t.how!;
    assert.ok(how[0].includes("ese ajuste vive en [[Ritmo]]"), "ES: el ajuste del plazo nombra su piso");
    assert.ok(how[1].includes("that setting lives in [[Rhythm]]"), "EN: the waiting-time setting names its floor");
    assert.ok(how[0].includes("[[Ajustes]] → Tiempo de espera"), "el resto del tema queda intacto");
  });

  it("preguntar-asesor: su what nombra el piso de las dos respuestas de Completo, ES/EN", () => {
    const t = findTopic("preguntar-asesor")!;
    assert.ok(t, "el tema existe");
    const what = t.what!, how = t.how!;
    assert.ok(what[0].includes("(el plan de deudas y el patrón de remesas son la profundidad de [[Completo]])"),
      "ES: el plan de deudas y el patrón de remesas declaran su piso en el what, como el how hace con los escenarios");
    assert.ok(what[1].includes("(the debt plan and the remittance pattern are [[Complete]]'s depth)"), "EN: same clause, same floor");
    assert.ok(how[0].includes("son la profundidad de Completo"), "la forma de la cláusula es la de su propio how (control intacto)");
  });

  // Re-fijado en la 1.3.379 (reestructuración del Manual): las cinco
  // pérdidas viven ahora como grupo con renglón propio, así que cada
  // fragmento abre su línea con mayúscula — las mismas cinco, con las
  // mismas palabras; lo que la cerca protege (que se nombren) no cambió.
  it("importar: el párrafo F11 nombra las CINCO pérdidas y la rama de la copia dañada, ES/EN", () => {
    const t = findTopic("importar")!;
    assert.ok(t, "el tema existe");
    const es = t.how![0], en = t.how![1];
    for (const frag of ["Sin el día exacto", "La nota no se imprime", "El bolsillo no se imprime", "El nombre puede venir cortado", "Su casa no viene impresa"])
      assert.ok(es.includes(frag), `ES nombra la pérdida: ${frag}`);
    assert.ok(es.includes("manda lo impreso"), "ES enseña la rama de la copia dañada");
    for (const frag of ["No exact day", "The note is not printed", "The pocket is not printed", "The name may be cut off", "Its house is not printed"])
      assert.ok(en.includes(frag), `EN names the loss: ${frag}`);
    assert.ok(en.includes("the print rules"), "EN teaches the damaged-copy branch");
  });
});

/* --------------------------------- (8) «del plan:» en el idioma del libro */

function planBook(lang: "es" | "en"): LedgerState {
  const ledger = createInitial(lang, "oscuro");
  ledger.months = {};
  ledger.settings.display = "USD";
  ledger.drafts = [];
  return ledger;
}

function planRow24(planId: string, concept: string): Draft {
  return {
    id: `pr-${concept}`, source: "list", kind: "plan", planId, planState: "pending",
    raw: concept, createdAt: "2026-11-20T15:00:00.000Z", day: "2026-10-28", sign: "out",
    amountMinor: null, currency: "USD", concept, note: "", book: "purchase",
    unsure: [], missing: ["amount"],
  };
}

describe("ola24 · (8) la procedencia del plan nace en el idioma del libro (Q24-C1 de Cara)", () => {
  it("cerrar un plan en un libro EN nace el borrador con «from the plan:»", () => {
    const { state, plan } = createPlan(planBook("en"), "Saturday shopping", "2026-11-20T15:00:00.000Z");
    let s = addDrafts(state, [planRow24(plan.id, "Milk")]);
    s = markBought(s, planRows(s, plan.id)[0].id, 180, "USD", "2026-11-20");
    const { state: closed, born } = closePlan(s, plan.id, {}, "2026-11-20", "2026-11-20T15:00:00.000Z");
    assert.equal(born, 1);
    const draft = (closed.drafts ?? []).find((d) => d.kind === "line")!;
    assert.match(draft.note, /^from the plan: Saturday shopping/, "la nota de procedencia nace en inglés, como su puerta hermana buyWish");
  });

  it("en ES, «del plan:» intacto (control)", () => {
    const { state, plan } = createPlan(planBook("es"), "La compra", "2026-11-20T15:00:00.000Z");
    let s = addDrafts(state, [planRow24(plan.id, "Leche")]);
    s = markBought(s, planRows(s, plan.id)[0].id, 180, "USD", "2026-11-20");
    const { state: closed } = closePlan(s, plan.id, {}, "2026-11-20", "2026-11-20T15:00:00.000Z");
    const draft = (closed.drafts ?? []).find((d) => d.kind === "line")!;
    assert.match(draft.note, /^del plan: La compra/);
  });
});
