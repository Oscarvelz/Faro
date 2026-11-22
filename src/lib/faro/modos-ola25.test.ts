/**
 * MODOS · OLA 25 — la cerca de la cura de la Ola 25 (Equipo Amigo).
 * Seis familias con cerca propia; la séptima (la cáscara) vive en
 * modos-ola14 §B. Cada espécimen corre ROJO sobre la prístina de la
 * 1.3.373 y VERDE aquí:
 *
 *  (1) G25-1 — la migración de la instrucción de autopay es UN paso
 *      compartido (migrateAutopayConfig) que compone TODA receta que
 *      quita líneas de los meses: deleteLine, las dos puertas del
 *      Archivo, dropSubLines, dropPocketLine y el deshacer de la
 *      importación. El censo de sitios lo prueba por descubrimiento.
 *  (2) G25-4 — la cobertura del anuncio y la del asentamiento juzgan
 *      el mismo papel: la instancia que pagó cubre aunque descanse.
 *      La variante DESACTIVADA queda clavada como está — su juicio es
 *      de Oscar (dos lecturas), no de esta cura.
 *  (3) La carrera del sello (G25-2 + Q25-C1) — sellar es por serie y
 *      por deseo, bajo llave propia, sin leer-modificar-escribir: dos
 *      pestañas desfasadas ya no se pierden sellos, y el Deshacer
 *      aguanta el resto del día también bajo intercalado. Las formas
 *      legadas se siguen leyendo como lo que eran.
 *  (4) G25-3 — la puerta juzga los deseos en la dimensión en que se
 *      desreferencian: dueAt/createdAt/closedAt como fechas, waitHours
 *      dentro de la aritmética de fechas.
 *  (5) Q25-1 — el mapa conoce account.name e inbox.link; la pregunta
 *      por el nombre propio gana a la mesa de cambio a nivel de
 *      patrón, y las preguntas verdaderas de cambio llegan a su mesa.
 *  (6) E25-1 — las frases del nombre nombran solo los dos umbrales
 *      vivos (la apertura del Asesor y la pregunta de la espera),
 *      verificados contra el código: la Bitácora no gasta el nombre y
 *      no existe firma de libro compartido.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  autopaySealedOn, autopaySealedSeries, sealAutopayDay,
  seriesAutopayConfig, settleAutopay, type AutopaySealStorage,
} from "./autopay.ts";
import type { BookMode } from "./advisor.ts";
import { FARO_FUNCTION_MAP, FUNCTION_TOPIC } from "./askmap.ts";
import { answerBankQuestion } from "./ask2.ts";
import { revertImport, revertImportCounted, type Undo } from "./bankparse.ts";
import { createInitial, dropSubLines, isLedgerDeep, makeNamer } from "./defaults.ts";
import { deleteRestingLines, deleteSpan, hidePeriod } from "./descanso.ts";
import { duesWindow } from "./dues.ts";
import { translate } from "./i18n.ts";
import { QUESTION_BANK } from "./questionbank.ts";
import { deleteLine } from "./reducer.ts";
import { dropPocketLine } from "./retiro.ts";
import {
  addWish, leaveWish, lookWish, markWishAsked, renewWish, wishAskedFor,
  wishesOf, type WishAskStorage,
} from "./waitlist.ts";
import { findTopic } from "../manual/topics.ts";
import type { ParseCtx } from "./textparse.ts";
import type { Currency, LedgerState, Line, LineKind, Wish } from "./types.ts";

const TODAY = "2026-11-21";
const NOW = new Date("2026-11-21T12:00:00.000Z");

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

function mem<T extends AutopaySealStorage | WishAskStorage>(): T & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    read: (k: string) => map.get(k) ?? null,
    write: (k: string, v: string) => { map.set(k, v); },
    keys: (prefix: string) => [...map.keys()].filter((k) => k.startsWith(prefix)),
  } as unknown as T & { map: Map<string, string> };
}

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

const srcOf = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
function bodyOf(src: string, marker: string): string {
  const at = src.indexOf(marker);
  assert.ok(at >= 0, `marcador presente: ${marker}`);
  const rest = src.slice(at);
  const end = rest.indexOf("\nexport ", 1);
  return end > 0 ? rest.slice(0, end) : rest;
}

/* ════════════════ §1 · G25-1 — la migración, por construcción ════════════════ */

describe("ola25 · (1) toda puerta que borra compone la migración", () => {
  const armedBook = () => book({
    "2026-10": [cuota("oct", "serie-bf", "2026-10", "2026-10-15", "monthly", { ...AUTO })],
    "2026-11": [cuota("nov", "serie-bf", "2026-11", "2026-11-15", "monthly")],
  });

  it("T2-i CURADO: la portadora apartada borrada con deleteRestingLines — la instrucción migra y diciembre asienta", () => {
    const hidden = hidePeriod(armedBook(), "2026-10-01", "2026-10-31", "octubre");
    assert.equal(hidden.state.months["2026-10"]!.lines[0]!.rest, true);
    const after = deleteRestingLines(hidden.state, ["oct"]);
    const nov = after.months["2026-11"]!.lines[0]!;
    assert.equal(nov.autopay, true, "la puerta del Archivo compone la migración");
    assert.equal(nov.autopayAccountId, "acct-banco");
    assert.deepEqual(seriesAutopayConfig([nov]), { on: true, accountId: "acct-banco" });
    const r = settleAutopay(after, "2026-12-20");
    assert.deepEqual(r.settled.map((x) => x.seriesId), ["serie-bf"], "la serie sigue asentando tras el borrado del Archivo");
    const born = r.state.months["2026-12"]!.lines[0]!;
    assert.equal(born.bookedOn, "2026-12-15");
    assert.equal(born.autopayAccountId, "acct-banco", "y asienta con su cuenta");
  });

  it("T2-j CURADO: la misma portadora borrada con deleteSpan — la instrucción migra", () => {
    const hidden = hidePeriod(armedBook(), "2026-10-01", "2026-10-31", "octubre");
    const after = deleteSpan(hidden.state, hidden.span!.id);
    const nov = after.months["2026-11"]!.lines[0]!;
    assert.equal(nov.autopay, true, "deleteSpan compone la migración");
    assert.deepEqual(settleAutopay(after, "2026-12-20").settled.map((x) => x.seriesId), ["serie-bf"]);
  });

  it("la dirección «apagado» también migra por el Archivo: el false explícito se estampa, no se pierde", () => {
    const s = book({
      "2026-10": [cuota("oct", "serie-bf", "2026-10", "2026-10-15", "monthly", { autopay: false, autopayAccountId: "acct-banco" })],
      "2026-11": [cuota("nov", "serie-bf", "2026-11", "2026-11-15", "monthly")],
    });
    const hidden = hidePeriod(s, "2026-10-01", "2026-10-31", "octubre");
    const after = deleteRestingLines(hidden.state, ["oct"]);
    const nov = after.months["2026-11"]!.lines[0]!;
    assert.equal(nov.autopay, false, "la resolución cambió (declarado → nada) y el paso estampa el false");
    assert.deepEqual(seriesAutopayConfig([nov]), { on: false, accountId: "" }, "apagado se resuelve apagado (el resolvedor mismo descarta la cuenta al estar apagado)");
  });

  it("el gemelo por deleteLine sigue migrando (control de la ola 24)", () => {
    const twin = deleteLine(armedBook(), "2026-10", "oct");
    assert.equal(twin.months["2026-11"]!.lines[0]!.autopay, true);
  });

  it("borrar la serie ENTERA no estampa nada: no queda instancia que herede", () => {
    const after = deleteLine(armedBook(), "2026-11", "nov");
    const after2 = deleteLine(after, "2026-10", "oct");
    assert.deepEqual(after2.months["2026-10"]!.lines, []);
    assert.deepEqual(after2.months["2026-11"]!.lines, []);
  });

  it("dropSubLines compone la forma de meses: la portadora bajo la sub borrada migra a la instancia hermana", () => {
    const s = book({
      "2026-10": [cuota("oct", "serie-bf", "2026-10", "2026-10-15", "monthly", { ...AUTO, subId: "sub-a" })],
      "2026-11": [cuota("nov", "serie-bf", "2026-11", "2026-11-15", "monthly", { subId: "sub-b" })],
    });
    const months = dropSubLines(s.months, "sub-a");
    assert.deepEqual(months["2026-10"]!.lines, []);
    const nov = months["2026-11"]!.lines[0]!;
    assert.equal(nov.autopay, true, "la des-suscripción compone la migración en su forma de meses");
    assert.equal(nov.autopayAccountId, "acct-banco");
  });

  it("el deshacer de la importación compone: la portadora importada y armada a mano no muere al deshacer el lote", () => {
    const s = book({
      "2026-10": [cuota("oct", "serie-bf", "2026-10", "2026-10-15", "monthly", { ...AUTO, batch: "b1" })],
      "2026-11": [cuota("nov", "serie-bf", "2026-11", "2026-11-15", "monthly")],
    });
    const u: Undo = { batch: "b1", added: 1, before: [], book: undefined };
    const after = revertImport(s, u);
    assert.deepEqual(after.months["2026-10"]!.lines, [], "la línea del lote sale");
    assert.equal(after.months["2026-11"]!.lines[0]!.autopay, true, "y la instrucción migra al salir");
    const counted = revertImportCounted(s, { ...u, written: [s.months["2026-10"]!.lines[0]!] });
    assert.equal(counted.state.months["2026-11"]!.lines[0]!.autopay, true, "también por la ruta con procedencia");
  });

  it("dropPocketLine compone sin estampar: sus líneas de fábrica no portan instrucción y ninguna nace", () => {
    const s = book({
      "2026-10": [line({ id: "bolsillo", kind: "expense-fixed", concept: "Bolsillo", amountMinor: 0 })],
      "2026-11": [cuota("nov", "serie-bf", "2026-11", "2026-11-15", "monthly")],
    });
    const r = dropPocketLine(s, "2026-10", "bolsillo");
    assert.deepEqual(r.state.months["2026-10"]!.lines, []);
    assert.equal(r.state.months["2026-11"]!.lines[0]!.autopay, undefined, "el paso corrió y no estampó nada: no hubo cambio de resolución");
  });

  it("CENSO: todo sitio que escribe líneas filtradas en los meses está clasificado, y los que borran componen el paso", () => {
    // Descubrimiento: líneas de producción que filtran líneas de un
    // bucket (`.lines.filter(`) o escriben un filtro en la llave
    // `lines:` de un bucket. Cada archivo hallado debe estar en la
    // tabla con su clase; las clases son la ley de esta cerca:
    // «compone» = quita líneas del libro y compone el paso;
    // «construcción» = fabrica un libro nuevo (muestra), no edita uno;
    // «lectura» = filtra una LECTURA (reading.lines del Asesor o la
    // proyección de área), el libro jamás se escribe con eso.
    const CLASES: Record<string, "compone" | "construcción" | "lectura"> = {
      "lib/faro/reducer.ts": "compone",
      "lib/faro/descanso.ts": "compone",
      "lib/faro/retiro.ts": "compone",
      "lib/faro/defaults.ts": "compone",
      "lib/faro/bankparse.ts": "compone",
      "lib/faro/sample.ts": "construcción",
      "lib/faro/area-advice.ts": "lectura",
      "lib/faro/advisor.ts": "lectura",
      "components/faro/advisor2.tsx": "lectura",
      "components/faro/panorama.tsx": "lectura",
      "components/faro/screens.tsx": "lectura",
    };
    const root = fileURLToPath(new URL("../../", import.meta.url));
    const hits = new Set<string>();
    for (const dir of ["lib/faro", "components/faro"]) {
      for (const f of readdirSync(`${root}${dir}`)) {
        if (!/\.tsx?$/.test(f) || f.endsWith(".test.ts")) continue;
        const rel = `${dir}/${f}`;
        const text = readFileSync(`${root}${rel}`, "utf8");
        for (const ln of text.split("\n")) {
          if (/\.lines\.filter\(/.test(ln) || (/lines:/.test(ln) && /\.filter\(/.test(ln))) hits.add(rel);
        }
      }
    }
    for (const h of hits) assert.ok(h in CLASES, `sitio sin clasificar: ${h} — la universal exige clasificarlo o componerlo`);
    for (const f of ["lib/faro/reducer.ts", "lib/faro/descanso.ts", "lib/faro/retiro.ts", "lib/faro/defaults.ts", "lib/faro/bankparse.ts"]) {
      assert.ok(hits.has(f), `el descubrimiento sigue viendo el sitio: ${f}`);
    }
    // Y «compone» se prueba en el cuerpo de cada receta, no en la palabra:
    assert.ok(bodyOf(srcOf("./reducer.ts"), "export function deleteLine").includes("migrateAutopayConfig("));
    const descanso = srcOf("./descanso.ts");
    assert.ok(bodyOf(descanso, "export function deleteRestingLines").includes("migrateAutopayConfig("));
    assert.ok(bodyOf(descanso, "export function deleteSpan").includes("migrateAutopayConfig("));
    assert.ok(bodyOf(srcOf("./retiro.ts"), "export function dropPocketLine").includes("migrateAutopayConfig("));
    assert.ok(bodyOf(srcOf("./defaults.ts"), "export function dropSubLines").includes("migrateAutopayConfigMonths("));
    const bankparse = srcOf("./bankparse.ts");
    assert.ok(bodyOf(bankparse, "export function revertImportCounted").includes("migrateAutopayConfig("));
    assert.ok(bodyOf(bankparse, "export function revertImport(state").includes("migrateAutopayConfig("));
  });
});

/* ════════════════ §2 · G25-4 — la cobertura, simétrica ════════════════ */

describe("ola25 · (2) el anuncio reconoce el período pagado aunque la instancia descanse", () => {
  const oldFormBook = (autoExtra: Partial<Line> = {}, livingExtra: Partial<Line> = {}) => book({
    "2026-10": [cuota("viva", "serie-bf", "2026-10", "2026-10-15", "monthly", { nextDue: "2026-11-15", ...livingExtra })],
    "2026-11": [cuota("auto-serie-bf-2026-11-15", "serie-bf", "2026-11", "2026-11-15", "monthly", { ...AUTO, ...autoExtra })],
  });
  const oldFormBookDec = (autoExtra: Partial<Line> = {}) => book({
    "2026-10": [cuota("viva", "serie-bf", "2026-10", "2026-10-15", "monthly", { nextDue: "2026-11-15" })],
    "2026-11": [cuota("auto-serie-bf-2026-11-15", "serie-bf", "2026-11", "2026-11-15", "monthly", { ...AUTO, ...autoExtra })],
    "2026-12": [cuota("dic", "serie-bf", "2026-12", "2026-12-15", "monthly")],
  });
  const cuotasOn = (st: LedgerState, on: string) => duesWindow(st, 3, TODAY).filter((e) => e.kind === "cuota" && e.on === on);

  it("T5-a control: el período pagado por la instancia de forma vieja no se anuncia", () => {
    assert.deepEqual(cuotasOn(oldFormBook(), "2026-11-15"), []);
  });

  it("T5-b la excepción es exacta: el papel propio de la MISMA serie con ese bookedOn sí anuncia", () => {
    const s = oldFormBook({}, { bookedOn: "2026-11-15" });
    assert.equal(cuotasOn(s, "2026-11-15").length, 1);
  });

  it("T5-f CURADO (forma nueva .364): apartar la instancia asentada ya NO revive el anuncio del período pagado", () => {
    const s = book({
      "2026-10": [cuota("viva", "serie-bf", "2026-10", "2026-10-15", "monthly", { nextDue: "2026-11-15" })],
      "2026-11": [cuota("auto-serie-bf-2026-11-15", "serie-bf", "2026-11", "2026-11-15", "monthly", { ...AUTO, nextDue: "2026-12-15" })],
    });
    assert.deepEqual(cuotasOn(s, "2026-11-15"), [], "control: con la instancia viva, el período pagado no se anuncia");
    const hidden = hidePeriod(s, "2026-11-10", "2026-11-20", "la quincena");
    assert.equal(hidden.state.months["2026-11"]!.lines[0]!.rest, true);
    assert.deepEqual(cuotasOn(hidden.state, "2026-11-15"), [], "apartada la instancia que pagó, el anuncio calla: la misma cobertura que el asentamiento");
  });

  it("T5-d CURADO (forma vieja): la instancia automática apartada cubre también para el anuncio", () => {
    const hidden = hidePeriod(oldFormBookDec(), "2026-11-10", "2026-11-20", "la quincena");
    assert.equal(hidden.state.months["2026-11"]!.lines[0]!.rest, true);
    assert.deepEqual(cuotasOn(hidden.state, "2026-11-15"), [], "la fila falsa no vuelve");
    const r = settleAutopay(hidden.state, TODAY);
    assert.deepEqual(r.settled.filter((x) => x.on === "2026-11-15"), [], "y el motor sigue sin re-asentarlo: un solo juicio de cobertura");
  });

  it("T5-e CLAVADO, NO CURADO: la variante DESACTIVADA sigue anunciando — su juicio es de Oscar (dos lecturas)", () => {
    // Esta cerca no la cura ni la bendice: la deja medida. Si la
    // palabra de Oscar la cura, esta cerca se enmienda con ella.
    const s = oldFormBookDec({ active: false });
    assert.equal(cuotasOn(s, "2026-11-15").length, 1, "desactivar el papel del pago sigue reviviendo el anuncio (observación ante Oscar)");
    const r = settleAutopay(s, TODAY);
    assert.deepEqual(r.settled.filter((x) => x.on === "2026-11-15"), [], "el motor sigue sin re-asentarlo");
  });
});

/* ════════════════ §3 · La carrera del sello — sellar sin fusionar ════════════════ */

describe("ola25 · (3) el sello por serie y la marca por deseo: sin fusión, sin carrera", () => {
  const serie = (id: string, due: string, month: string) => cuota(id, id, month, due, "monthly", { ...AUTO });

  it("cada serie sella bajo su PROPIA llave y sellar no lee: la base no se toca", () => {
    const st = mem<AutopaySealStorage>();
    sealAutopayDay(st, "u1", TODAY, ["serie-a", "serie-b"]);
    assert.equal(st.map.get("faro-autopay-day.u1.serie-a"), TODAY, "la llave propia de la serie A lleva el día");
    assert.equal(st.map.get("faro-autopay-day.u1.serie-b"), TODAY, "la llave propia de la serie B lleva el día");
    assert.equal(st.map.has("faro-autopay-day.u1"), false, "sellar por serie no escribe la llave compartida");
    assert.deepEqual([...autopaySealedSeries(st, "u1", TODAY)].sort(), ["serie-a", "serie-b"]);
  });

  it("T3-a control: A sella por la mañana; B despierta al mediodía y asienta el mismo día", () => {
    const st = mem<AutopaySealStorage>();
    const morning = book({ "2026-10": [serie("serie-a", "2026-10-21", "2026-10")] });
    const r1 = settleAutopay(morning, TODAY, autopaySealedSeries(st, "u1", TODAY));
    assert.deepEqual(r1.settled.map((x) => x.seriesId), ["serie-a"]);
    sealAutopayDay(st, "u1", TODAY, ["serie-a"]);
    const midday: LedgerState = {
      ...r1.state,
      months: { ...r1.state.months, "2026-10": { lines: [...r1.state.months["2026-10"]!.lines, serie("serie-b", "2026-10-21", "2026-10")] } },
    };
    const r2 = settleAutopay(midday, TODAY, autopaySealedSeries(st, "u1", TODAY));
    assert.deepEqual(r2.settled.map((x) => x.seriesId), ["serie-b"], "B asienta hoy: el sello de A no la bloquea");
  });

  it("T3-b deshacer A no la re-asienta: su serie quedó sellada", () => {
    const st = mem<AutopaySealStorage>();
    sealAutopayDay(st, "u1", TODAY, ["serie-a"]);
    const undone = book({ "2026-10": [serie("serie-a", "2026-10-21", "2026-10")] });
    const r = settleAutopay(undone, TODAY, autopaySealedSeries(st, "u1", TODAY));
    assert.deepEqual(r.settled, [], "el Deshacer de A aguanta el resto del día");
  });

  it("T3-e CURADO — LA CARRERA: dos pestañas sellan desde fotos desfasadas y NINGUNA serie sale del sello", () => {
    // El intercalado de Cambios, compuesto: la pestaña B leyó la llave
    // base ANTES de que A sellara (su read devuelve la foto vieja).
    // Como sellar ya no lee ni fusiona — cada serie escribe su llave —
    // la foto vieja de B no puede pisar el sello de A.
    const real = mem<AutopaySealStorage>();
    const staleBase = real.read("faro-autopay-day.u1"); // la foto de B: null
    const tabB: AutopaySealStorage = {
      read: (k) => (k === "faro-autopay-day.u1" ? staleBase : real.read(k)),
      write: (k, v) => real.write(k, v),
      keys: (p) => real.keys(p),
    };
    sealAutopayDay(real, "u1", TODAY, ["serie-x"]);
    sealAutopayDay(tabB, "u1", TODAY, ["serie-y"]);
    assert.deepEqual([...autopaySealedSeries(real, "u1", TODAY)].sort(), ["serie-x", "serie-y"], "las dos series quedan en el sello duradero");
    // La persona deshace el asentamiento de X y la app se monta de nuevo:
    const undone = book({ "2026-10": [serie("serie-x", "2026-10-21", "2026-10")] });
    const r = settleAutopay(undone, TODAY, autopaySealedSeries(real, "u1", TODAY));
    assert.deepEqual(r.settled, [], "X NO re-asienta: su Deshacer aguanta el resto del día también bajo intercalado");
  });

  it("las formas legadas se siguen leyendo como lo que eran", () => {
    const st = mem<AutopaySealStorage>();
    st.write("faro-autopay-day.u1", TODAY); // .361: el día en texto plano
    assert.equal(autopaySealedOn(st, "u1", TODAY), true, "el día entero sigue deteniendo el pase");
    sealAutopayDay(st, "u1", TODAY, ["serie-x"]);
    assert.equal(st.map.get("faro-autopay-day.u1"), TODAY, "sellar por serie no pisa un día ya sellado entero");
    const st2 = mem<AutopaySealStorage>();
    st2.write("faro-autopay-day.u1", JSON.stringify({ day: TODAY, series: ["serie-legada"] })); // .364: el conjunto en JSON
    assert.deepEqual([...autopaySealedSeries(st2, "u1", TODAY)], ["serie-legada"], "el conjunto legado de hoy se honra entero");
    const st3 = mem<AutopaySealStorage>();
    st3.write("faro-autopay-day.u1", JSON.stringify({ day: "2026-11-20", series: ["serie-ayer"] }));
    assert.deepEqual([...autopaySealedSeries(st3, "u1", TODAY)], [], "el conjunto de ayer no se hereda");
  });

  it("sellar el día entero sin series conserva su forma (la puerta de la ola 23)", () => {
    const st = mem<AutopaySealStorage>();
    sealAutopayDay(st, "u1", TODAY);
    assert.equal(st.map.get("faro-autopay-day.u1"), TODAY);
    assert.equal(autopaySealedOn(st, "u1", TODAY), true);
  });

  it("T1-f CURADO — la marca de la espera: dos pestañas marcan deseos distintos y las dos marcas sobreviven", () => {
    const real = mem<WishAskStorage>();
    const w1 = wishOk({ id: "w-uno" });
    const w2 = wishOk({ id: "w-dos" });
    // La pestaña B conserva la foto vieja del mapa legado; marcar ya no
    // lee ese mapa: cada deseo escribe su propia llave.
    const staleMap = real.read("faro-wish-asked.u1");
    const tabB: WishAskStorage = { read: (k) => (k === "faro-wish-asked.u1" ? staleMap : real.read(k)), write: (k, v) => real.write(k, v) };
    markWishAsked(real, "u1", [w1]);
    markWishAsked(tabB, "u1", [w2]);
    assert.equal(wishAskedFor(real, "u1", w1), true, "la marca de A sobrevive al intercalado");
    assert.equal(wishAskedFor(real, "u1", w2), true, "la marca de B también");
    assert.deepEqual([...real.map.keys()].sort(), ["faro-wish-asked.u1.w-dos", "faro-wish-asked.u1.w-uno"], "una llave por deseo, ninguna compartida");
  });

  it("la marca legada (el mapa de la .364) se sigue leyendo; la nueva manda primero", () => {
    const st = mem<WishAskStorage>();
    const w = wishOk({ id: "w-legado" });
    // La marca vale por PLAZO: el valor guardado es el dueAt del deseo.
    st.write("faro-wish-asked.u1", JSON.stringify({ "w-legado": w.dueAt }));
    assert.equal(wishAskedFor(st, "u1", w), true, "el mapa legado sigue respondiendo por sus deseos");
    const w2 = wishOk({ id: "w-nuevo" });
    assert.equal(wishAskedFor(st, "u1", w2), false);
    markWishAsked(st, "u1", [w2]);
    assert.equal(wishAskedFor(st, "u1", w2), true);
    assert.equal(st.map.get("faro-wish-asked.u1"), JSON.stringify({ "w-legado": w.dueAt }), "marcar no reescribe el mapa legado");
  });
});

/* ════════════════ §4 · G25-3 — la puerta juzga en la dimensión de la desreferencia ════════════════ */

describe("ola25 · (4) wishes: la puerta juzga fechas como fechas y horas como aritmética", () => {
  it("T4-0 control: los deseos de la casa en todos sus estados entran enteros", () => {
    let s = bookWishes([]);
    const a = addWish(s, { concept: "A", amountMinor: 100, currency: "USD", store: "T", link: "https://x.example/p" }, NOW);
    s = a.state;
    const b = addWish(s, { concept: "B", amountMinor: null, currency: "NIO", store: "" }, NOW);
    s = b.state;
    s = lookWish(s, a.wish.id, { priceMinor: 90, currency: "USD", at: "2026-11-21" });
    s = leaveWish(s, a.wish.id, NOW);
    s = renewWish(s, b.wish.id, NOW);
    s = renewWish(s, b.wish.id, NOW);
    assert.equal(isLedgerDeep(s), true, "esperando, dejado, permanente, con enlace y mirada: la puerta los admite");
    assert.equal(wishesOf(s).length, 2);
  });

  it("T4-a CURADO: dueAt ilegible ya no entra — la puerta lo juzga como la fecha que waitlist desreferencia", () => {
    const w = wishOk({ id: "w-fecha", dueAt: "no-es-una-fecha" });
    assert.equal(isLedgerDeep(bookWishes([w])), false, "dueAt no parseable: el libro no es profundo");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-ok" })])), true, "el deseo sano con la misma forma entra");
  });

  it("createdAt y closedAt se juzgan con la misma vara; el closedAt vacío del que espera sigue entrando", () => {
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-c", createdAt: "ayer" })])), false, "createdAt ilegible: fuera");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-x", status: "left", closedAt: "no-es-fecha" })])), false, "closedAt ilegible en un deseo cerrado: fuera");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-e", status: "left", closedAt: "2026-11-10T12:00:00.000Z" })])), true, "cerrado con fecha de verdad: entra");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-w", closedAt: "" })])), true, "el que espera trae closedAt vacío: entra");
  });

  it("T4-b CURADO: waitHours fuera de la aritmética de fechas ya no entra; el grande representable sí", () => {
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-horas", waitHours: 3e9 })])), false, "3e9 horas desborda la Fecha: la puerta lo detiene antes del RangeError");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-h2", waitHours: 1e6 })])), true, "un millón de horas cabe en la aritmética: entra");
    const s = bookWishes([wishOk({ id: "w-h3", waitHours: 1e6 })]);
    assert.doesNotThrow(() => renewWish(s, "w-h3", NOW), "y renovarlo no lanza");
  });
});

/* ════════════════ §5 · Q25-1 — el mapa aprende el nombre y el compartir ════════════════ */

describe("ola25 · (5) faro-mismo: el nombre gana a la mesa; compartir responde; la mesa guarda lo suyo", () => {
  const KEY = "2026-11";
  function fixture(): LedgerState {
    const ledger = createInitial("es", "oscuro");
    ledger.months = { [KEY]: { lines: [] } };
    ledger.settings.display = "USD";
    return ledger;
  }
  function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es", mode: BookMode = "esencial") {
    const ctx: ParseCtx = { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
    return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx, TODAY, undefined, mode);
  }

  it("«¿Cómo cambio mi nombre?» llega a account.name en Esencial y en Completo — nunca a la mesa", () => {
    for (const mode of ["esencial", "completo"] as BookMode[]) {
      const r = ask(fixture(), "¿Cómo cambio mi nombre?", "es", mode);
      assert.equal(r.kind, "answer", `responde en ${mode}`);
      if (r.kind !== "answer") return;
      assert.equal(r.family, "faro-mismo");
      assert.deepEqual(r.source, ["account.name"], `en ${mode} la fuente es la función del nombre, no cambio.mesa`);
    }
  });

  it("las demás voces del nombre llegan a la misma puerta, ES y EN", () => {
    for (const [raw, lang] of [
      ["¿Cómo me llama Faro?", "es"],
      ["¿Dónde cambio el nombre con que me saluda Faro?", "es"],
      ["How do I change my name?", "en"],
      ["How do I tell Faro my name?", "en"],
    ] as const) {
      const r = ask(fixture(), raw, lang);
      assert.equal(r.kind, "answer", `«${raw}» responde`);
      if (r.kind !== "answer") return;
      assert.deepEqual(r.source, ["account.name"], `«${raw}» → account.name`);
    }
  });

  it("compartir responde por inbox.link en Esencial, ES y EN", () => {
    for (const [raw, lang] of [
      ["¿Cómo comparto mi libro?", "es"],
      ["¿Dónde veo lo que me compartieron?", "es"],
      ["How do I share my book?", "en"],
    ] as const) {
      const r = ask(fixture(), raw, lang);
      assert.equal(r.kind, "answer", `«${raw}» responde`);
      if (r.kind !== "answer") return;
      assert.equal(r.family, "faro-mismo");
      assert.deepEqual(r.source, ["inbox.link"], `«${raw}» → inbox.link`);
    }
  });

  it("CONTROL: las preguntas verdaderas de cambio de moneda siguen llegando a su mesa", () => {
    for (const [raw, lang] of [
      ["¿Cómo cambio dólares a córdobas?", "es"],
      ["How do I exchange dollars?", "en"],
    ] as const) {
      const r = ask(fixture(), raw, lang);
      assert.equal(r.kind, "answer", `«${raw}» responde`);
      if (r.kind !== "answer") return;
      assert.deepEqual(r.source, ["cambio.mesa"], `«${raw}» → la mesa, como siempre`);
    }
  });

  it("CONTROL sano: la copia de seguridad sigue llegando a su puerta", () => {
    const r = ask(fixture(), "¿Cómo hago una copia de seguridad?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.deepEqual(r.source, ["cuenta.sync"]);
  });

  it("el mapa y el índice de temas cierran: las dos funciones existen, sin piso declarado, con tema y puerta", () => {
    for (const [id, tema] of [["account.name", "nombre"], ["inbox.link", "compartir"]] as const) {
      const fn = FARO_FUNCTION_MAP.find((f) => f.id === id);
      assert.ok(fn, `${id} está en FARO_FUNCTION_MAP`);
      assert.equal(fn.minMode, undefined, `${id} es Esencial: no declara piso (LA FRONTERA — su origen se ve en todo modo)`);
      assert.equal(FUNCTION_TOPIC[id], tema, `${id} cuelga del tema «${tema}»`);
      const topic = findTopic(tema);
      assert.ok(topic?.go, `el tema «${tema}» existe y tiene puerta`);
      assert.deepEqual(topic.keys, [id], `el tema «${tema}» declara la llave ${id}`);
    }
    const fam = QUESTION_BANK.find((f) => f.id === "faro-mismo");
    assert.ok(fam, "la familia faro-mismo existe");
    for (const src of fam.source) {
      assert.ok(FARO_FUNCTION_MAP.some((f) => f.id === src), `la fuente declarada ${src} existe en el mapa`);
    }
  });
});

/* ════════════════ §6 · E25-1 — las frases del nombre, solo umbrales vivos ════════════════ */

describe("ola25 · (6) el nombre se cuenta como vive: dos umbrales, ni Bitácora ni firma", () => {
  const PROHIBIDO = [/bitácora/i, /firma/i, /signature/i, /year in faro/i];

  it("la verdad de fondo sigue clavada: la Bitácora no gasta el nombre y los umbrales son exactamente dos", () => {
    const bitacora = srcOf("../../components/faro/bitacora.tsx") + srcOf("./bitacora.ts");
    assert.ok(!bitacora.includes("personname"), "bitacora no importa el lector del nombre: no lo gasta");
    const screens = srcOf("../../components/faro/screens.tsx");
    assert.equal(screens.split("addressHeadline(").length - 1, 1, "addressHeadline se llama exactamente una vez en toda la cara: la apertura del Asesor");
    const waitlist = srcOf("../../components/faro/waitlist.tsx");
    assert.equal(waitlist.split("waitQuestion(lang, personName)").length - 1, 1, "la pregunta de la espera es el otro único gasto");
  });

  it("el tip del tema «nombre» nombra solo los umbrales vivos, ES y EN", () => {
    const topic = findTopic("nombre");
    assert.ok(topic?.tip, "el tema trae tip");
    const [es, en] = topic.tip;
    assert.ok(es.includes("Asesor") && es.includes("lista de espera"), "ES: apertura del Asesor y pregunta de la espera");
    assert.ok(en.includes("Advisor") && en.includes("waiting list"), "EN: the Advisor's opening and the waiting list's question");
    for (const t of [es, en]) for (const re of PROHIBIDO) assert.ok(!re.test(t), `el tip no promete lo que no vive: ${re}`);
    const [hes, hen] = topic.how!;
    for (const t of [hes, hen]) for (const re of [/firma/i, /signature/i]) assert.ok(!re.test(t), `el how ya no habla de firmas: ${re}`);
    assert.ok(hes.includes("no vive en ningún libro") && hen.includes("lives in no book"), "el how dice dónde vive el nombre: en ningún libro");
  });

  it("la nota de la fila «Cómo te nombra Faro» dice lo mismo, ES y EN", () => {
    const es = translate("es", "name.note");
    const en = translate("en", "name.note");
    assert.ok(es.includes("Asesor") && es.includes("lista de espera"));
    assert.ok(en.includes("Advisor") && en.includes("waiting list"));
    for (const t of [es, en]) for (const re of PROHIBIDO) assert.ok(!re.test(t), `la nota no promete lo que no vive: ${re}`);
  });

  it("el cuerpo de la pregunta de instalación (words.ts) dice lo mismo, ES y EN", () => {
    const words = srcOf("../../spa/words.ts");
    const bodies = [...words.matchAll(/"name\.ask\.body": "([^"]+)"/g)].map((m) => m[1]!);
    assert.equal(bodies.length, 2, "las dos lenguas de name.ask.body");
    for (const t of bodies) {
      assert.ok((t.includes("Asesor") || t.includes("Advisor")) && (t.includes("lista de espera") || t.includes("waiting list")), "los dos umbrales, nombrados");
      for (const re of PROHIBIDO) assert.ok(!re.test(t!), `words no promete lo que no vive: ${re}`);
    }
  });
});
