/* ════════════════════════════════════════════════════════════════════
 * OLA 19 · LA LEY DEL MARCO PARA LA CASA ENTERA (G19-1/G19-2/G19-3/BR19-1)
 *
 * La caza XIX midió la casa, no una puerta: la cura 18 migró cuatro
 * recetas de componente a commitGuarded, pero la biblioteca seguía
 * negándose por identidad tras la puerta ordinaria, y cada negativa
 * dejaba el marco entero — entrada de Actividad que afirmaba lo que no
 * aterrizó, revisión +1, fotograma de Deshacer; y en commitFinal, el
 * pasado ENTERO vaciado por un borrado que nunca ocurrió.
 *
 * La ley que esta cerca clava, para siempre:
 *   — La negativa no deja marco. Toda receta que puede negarse (su
 *     ayudante devuelve el estado intacto, o la receta misma devuelve
 *     su entrada) viaja por commitGuarded.
 *   — commitFinal juzga su propia pregunta: si su receta devuelve el
 *     estado intacto, NO enmarca ni vacía el pasado de Deshacer.
 *   — La entrada veraz no apila marco (BR19-1): la confirmación de modo
 *     que no aplicó conserva su entrada deliberada (doctrina BR15-1)
 *     por la tercera puerta, commitAnnounced, cuyo aborto escribe SOLO
 *     la entrada: ni fotograma, ni revisión.
 *   — El censo es permanente (§B): toda receta alcanzable por una
 *     puerta queda clasificada en la tabla — guardada, anunciada,
 *     final o aterrizaje — y una receta NUEVA sin clasificar, o en la
 *     puerta equivocada, acusa en voz alta.
 *
 * Los especímenes de composición (§A) son los de la caza XIX dados la
 * vuelta: donde el banco de Guardián probaba el marco fantasma, esta
 * cerca prueba su ausencia — con los mismos ayudantes y las mismas
 * puertas que los componentes usan.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { createInitial, restoreDefaultCategories } from "./defaults.ts";
import { blankSession, commit, commitAnnounced, commitFinal, commitGuarded, deleteLine, patchLine, patchLineWith, undo, upsertLine } from "./reducer.ts";
import { cardsOf, dropCard, dropPresets, payCard, redeemRewards, restoreCard, restorePresets } from "./cards.ts";
import { archiveLent, payLent, restoreLent } from "./debts.ts";
import { archiveLoan, payLoan, restoreLoan } from "./loans.ts";
import { declareSeries } from "./funds.ts";
import { deleteRestingLines, deleteSpan, hideLines, hidePeriod, restoreSpan } from "./descanso.ts";
import { dropFreq, rememberFreq } from "./cadence.ts";
import { withDeskSeedFlag } from "./deskseed.ts";
import { restoreLibrary } from "./subs.ts";
import { restoreDefaultAccounts } from "./bankbook.ts";
import { restoreRetiro, seedRetiro } from "./retiro.ts";
import { renameRemitPerson } from "./remit-people.ts";
import type { LedgerState, Line } from "./types.ts";

const base = (): LedgerState => createInitial("es", "claro");

/** Sin marco: el libro es el mismo objeto, la pila el mismo objeto, sin sucio nuevo. */
function assertFrameless(out: ReturnType<typeof commitGuarded>, before: ReturnType<typeof blankSession>) {
  assert.equal(out.ledger, before.ledger, "el libro es el mismo objeto: no nació entrada ni subió la revisión");
  assert.equal(out.past, before.past, "la pila de Deshacer es el mismo objeto: no se apiló fotograma");
  assert.equal(out.dirty, before.dirty, "sin sucio nuevo");
  assert.notEqual(out, before, "la carcasa de la sesión es nueva (el canal del veredicto despierta)");
}

const mkLine = (id: string): Line => ({
  id, seriesId: id, monthKey: "2026-11", kind: "expense-variable", concept: "Luz", amountMinor: 1000, currency: "USD",
  active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "",
  cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "Zap", history: [], bookedOn: "2026-11-10",
});

describe("ola19 · §A: las tres puertas y la ley de commitFinal", () => {
  it("commitFinal con receta intacta: NO enmarca y NO vacía el pasado (su pregunta, respondida)", () => {
    const landed = commit(blankSession(base()), (s) => upsertLine(s, mkLine("linea-viva")), "Luz");
    assert.equal(landed.past.length, 1, "hay un pasado que proteger");
    const out = commitFinal(landed, (s) => s, "Eliminar selección");
    assert.equal(out.ledger, landed.ledger, "el libro es el mismo objeto");
    assert.equal(out.past, landed.past, "el pasado de Deshacer sobrevive entero a un borrado que no ocurrió");
    assert.equal(out.ledger.revision, landed.ledger.revision, "la revisión no sube");
  });
  it("commitFinal con aterrizaje real conserva su semántica final: enmarca y vacía el pasado", () => {
    const landed = commit(blankSession(base()), (s) => upsertLine(s, mkLine("linea-viva")), "Luz");
    const out = commitFinal(landed, (s) => deleteLine(s, "2026-11", "linea-viva"), "Eliminar");
    assert.equal(out.past.length, 0, "el borrado real sí cierra el pasado");
    assert.equal(out.ledger.revision, landed.ledger.revision + 1);
    assert.equal(out.ledger.months["2026-11"]?.lines.length ?? 0, 0, "la línea se fue de verdad");
  });
  it("commitAnnounced: el aborto escribe SOLO la entrada — ni marco, ni revisión, el pasado intacto", () => {
    const s0 = blankSession(base());
    const out = commitAnnounced(s0, (s) => s, () => "La confirmación no aplicó: el modo ya había cambiado");
    assert.notEqual(out.ledger, s0.ledger, "el libro es un objeto nuevo: la entrada vive en él");
    assert.equal(out.ledger.audit.length, s0.ledger.audit.length + 1, "la entrada veraz SÍ se escribe");
    assert.equal(out.ledger.audit[0]?.detail, "La confirmación no aplicó: el modo ya había cambiado", "la entrada dice la verdad, con su detalle-función intacto");
    assert.equal(out.ledger.revision, s0.ledger.revision, "la revisión NO sube por un aborto");
    assert.equal(out.past, s0.past, "la pila de Deshacer es el mismo objeto");
    assert.equal(out.future, s0.future, "el futuro de Rehacer es el mismo objeto");
    assert.equal(out.dirty, true, "la entrada es un cambio que guardar");
  });
  it("commitAnnounced: la receta que devuelve null también es solo-entrada", () => {
    const s0 = blankSession(base());
    const out = commitAnnounced(s0, () => null, "Aviso");
    assert.equal(out.ledger.audit.length, 1);
    assert.equal(out.ledger.revision, s0.ledger.revision);
    assert.equal(out.past, s0.past);
  });
  it("commitAnnounced: el aterrizaje enmarca entero, como siempre", () => {
    const s0 = blankSession(base());
    const out = commitAnnounced(s0, (s) => upsertLine(s, mkLine("linea-viva")), "Luz");
    assert.equal(out.ledger.revision, s0.ledger.revision + 1);
    assert.equal(out.past.length, 1);
    assert.equal(out.ledger.audit.length, 1);
  });
  it("BR19-1 · la tanda mixta: el Deshacer tras el aborto toca el LIBRO, no la entrada del aborto", () => {
    const s0 = blankSession(base());
    const modo0 = s0.ledger.settings.mode;
    // El aterrizaje real (la confirmación que SÍ aplicó en la otra pestaña):
    const landed = commitAnnounced(s0, (s) => ({ ...s, settings: { ...s.settings, mode: modo0 === "completo" ? "ritmo" : "completo" } }), "Modo");
    assert.equal(landed.past.length, 1);
    assert.equal(landed.ledger.revision, s0.ledger.revision + 1);
    // El aborto (esta pestaña confirma tarde): entrada veraz, sin marco.
    const aborted = commitAnnounced(landed, (s) => s, () => "La confirmación no aplicó: el modo ya había cambiado");
    assert.equal(aborted.ledger.audit.length, landed.ledger.audit.length + 1, "la entrada del aborto está, y dice la verdad");
    assert.equal(aborted.ledger.revision, landed.ledger.revision, "la revisión total de la tanda es +1, no +2");
    assert.equal(aborted.past.length, 1, "la pila guarda UN fotograma: el del aterrizaje");
    // El primer Deshacer deshace el aterrizaje — el libro vuelve, no se gasta en la entrada.
    const back = undo(aborted);
    assert.equal(back.ledger.settings.mode, modo0, "el Deshacer tocó el libro: el modo volvió");
    assert.equal(back.past.length, 0);
  });
});

describe("ola19 · §A: clase A — la negativa no deja marco (los especímenes de la caza, dados la vuelta)", () => {
  it("A1 payCard sobre una tarjeta que ya no vive, por la puerta guardada", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => payCard(x, "card-fantasma", 1000, "2026-11-19", "p1", "Abono"), "Wells Fargo"), s0);
  });
  it("A2 payLent sobre un cobro que ya no vive", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => payLent(x, "lent-nope", 1000, "2026-11-19", "p2", "Abono"), "María"), s0);
  });
  it("A3 payLoan sobre un préstamo que ya no vive", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => payLoan(x, "loan-nope", 1000, "2026-11-19", "p3", "Abono"), "Banco"), s0);
  });
  it("A4 redeemRewards: tarjeta ida y saldo ya canjeado — dos negativas, ningún marco", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => redeemRewards(x, "card-fantasma", "credit", 1000, "2026-11-19", "rw1", "Canje de recompensas"), "Wells Fargo"), s0);
    assertFrameless(commitGuarded(s0, (x) => redeemRewards(x, "card-paypal", "credit", 1000, "2026-11-19", "rw2", "Canje de recompensas"), "PayPal"), s0);
  });
  it("A5/A6 patchLine y patchLineWith sobre la línea muerta", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => patchLine(x, "linea-nope", { concept: "Otro" }), "Luz"), s0);
    assertFrameless(commitGuarded(s0, (x) => patchLineWith(x, "linea-nope", () => ({ concept: "Otro" })), "Luz"), s0);
  });
  it("A7 declareSeries sobre una serie que ya no vive", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => declareSeries(x, "serie-nope", "aparte"), "fondos"), s0);
  });
  it("A8 hideLines/hidePeriod sin nada que apartar, por la puerta guardada del proveedor", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => hideLines(x, ["nope"], "Ocultar selección").state, "Ocultar selección"), s0);
    assertFrameless(commitGuarded(s0, (x) => hidePeriod(x, "2026-11-01", "2026-11-30", "Ocultar período").state, "Ocultar período"), s0);
  });
  it("A9 el peor de la ola: deleteRestingLines por commitFinal sobre líneas VIVAS no vacía el pasado", () => {
    const landed = commit(blankSession(base()), (s) => upsertLine(s, mkLine("linea-viva")), "Luz");
    const out = commitFinal(landed, (x) => deleteRestingLines(x, ["linea-viva"]), "Eliminar selección");
    assert.equal(out.ledger, landed.ledger, "la línea sigue en el libro y el libro es el mismo objeto");
    assert.equal(out.past, landed.past, "el pasado entero sobrevive: ningún borrado ocurrió");
    assert.equal(out.ledger.revision, landed.ledger.revision);
  });
});

describe("ola19 · §A: clase B — el marco fantasma con el libro de acuerdo, curado", () => {
  it("B1 dropCard dos veces: la segunda mano no encuentra nada y no enmarca", () => {
    const s = base();
    const card = cardsOf(s)[0]!;
    const once = commitGuarded(blankSession(s), (x) => dropCard(x, card.id), card.name);
    assert.equal(once.past.length, 1, "la primera caída sí aterriza");
    assertFrameless(commitGuarded(once, (x) => dropCard(x, card.id), card.name), once);
  });
  it("B2 restoreCard sobre una tarjeta viva no enmarca", () => {
    const s0 = blankSession(base());
    const card = cardsOf(s0.ledger)[0]!;
    assertFrameless(commitGuarded(s0, (x) => restoreCard(x, card.id), card.name), s0);
  });
  it("B3 deleteSpan por commitFinal sobre un tramo ido: el pasado no se vacía", () => {
    const landed = commit(blankSession(base()), (s) => upsertLine(s, mkLine("linea-viva")), "Luz");
    const out = commitFinal(landed, (x) => deleteSpan(x, "span-nope"), "Eliminar tramo");
    assert.equal(out.ledger, landed.ledger);
    assert.equal(out.past, landed.past, "el pasado sobrevive a un borrado que no ocurrió");
  });
  it("B4 restoreSpan sobre un tramo ido no enmarca", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => restoreSpan(x, "span-nope"), "Restaurar tramo"), s0);
  });
  it("B5 rememberFreq del ritmo de fábrica y dropFreq de lo que no se guardó", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => rememberFreq(x, "monthly"), "Mensual"), s0);
    assertFrameless(commitGuarded(s0, (x) => dropFreq(x, "monthly"), "Mensual"), s0);
  });
  it("B6 withDeskSeedFlag con la bandera ya puesta", () => {
    const s1 = withDeskSeedFlag(base(), "desk-banks");
    const s0 = blankSession(s1);
    assertFrameless(commitGuarded(s0, (x) => withDeskSeedFlag(x, "desk-banks"), "presets"), s0);
  });
  it("B7 las restauraciones de fábrica con la casa completa: categorías, biblioteca, cuentas, presets", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => restoreDefaultCategories(x), "Categorías de fábrica"), s0);
    assertFrameless(commitGuarded(s0, (x) => restoreLibrary(x), "Íconos"), s0);
    assertFrameless(commitGuarded(s0, (x) => restoreDefaultAccounts(x), "Tarjetas de fábrica"), s0);
    assertFrameless(commitGuarded(s0, (x) => restorePresets(x), "Restaurar tarjetas"), s0);
  });
  it("B7b dropPresets sin presets vivas: la segunda mano no enmarca", () => {
    const once = commitGuarded(blankSession(base()), (x) => dropPresets(x), "Empezar de cero");
    assertFrameless(commitGuarded(once, (x) => dropPresets(x), "Empezar de cero"), once);
  });
  it("B8 seedRetiro con el retiro ya sembrado y restoreRetiro sin nada que revivir", () => {
    const seeded = commitGuarded(blankSession(base()), (x) => seedRetiro(x, "2026-11"), "Retiro");
    assertFrameless(commitGuarded(seeded, (x) => seedRetiro(x, "2026-11"), "Retiro"), seeded);
    assertFrameless(commitGuarded(seeded, (x) => restoreRetiro(x, "2026-11"), "Retiro"), seeded);
  });
});

describe("ola19 · §A: clase C — el no-op de mapa, curado en el ayudante y en la puerta", () => {
  it("C1 archiveLent/restoreLent/archiveLoan/restoreLoan sobre blancos ausentes: identidad y ningún marco", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => archiveLent(x, "lent-nope"), "Archivar"), s0);
    assertFrameless(commitGuarded(s0, (x) => restoreLent(x, "lent-nope"), "Restaurar"), s0);
    assertFrameless(commitGuarded(s0, (x) => archiveLoan(x, "loan-nope"), "Archivar"), s0);
    assertFrameless(commitGuarded(s0, (x) => restoreLoan(x, "loan-nope"), "Restaurar"), s0);
  });
  it("C2 deleteLine sobre un id ausente en un mes vivo: el ayudante devuelve su estado", () => {
    const landed = commit(blankSession(base()), (s) => upsertLine(s, mkLine("linea-viva")), "Luz");
    assertFrameless(commitGuarded(landed, (x) => deleteLine(x, "2026-11", "linea-nope"), "Borrar"), landed);
  });
  it("C3 las operaciones de personas de remesa sobre un nombre ausente no enmarcan", () => {
    const s0 = blankSession(base());
    assertFrameless(commitGuarded(s0, (x) => renameRemitPerson(x, "nadie", "Otro"), "Renombrar"), s0);
  });
});

/* ════════════════════════════════════════════════════════════════════
 * §B · EL CENSO PERMANENTE DE RECETAS
 * Toda llamada a una puerta (commit / commitGuarded / commitAnnounced /
 * commitFinal / commitDraft) en src queda enumerada por (archivo,
 * puerta, cabeza de la receta) y clasificada en la tabla. La cabeza es
 * la primera llamada con nombre desnudo dentro de la receta (o «inline»
 * si la receta compone su objeto sin llamar a un ayudante con nombre, o
 * «ref:…» si la receta llega por referencia — la maquinaria del
 * proveedor y los sembrados de la Presentación).
 *   guardada   — la receta puede negarse; su puerta es la guardada
 *                (commitDraft delega en ella dentro de CardForm).
 *   anunciada  — la confirmación de modo: entrada veraz sin marco al
 *                abortar (commitAnnounced, BR19-1).
 *   final      — los dos borrados del descanso por commitFinal, cuya
 *                ley de identidad esta misma cerca clava en §A.
 *   aterrizaje — la puerta ordinaria, y la receta aterriza por
 *                construcción: guardados de forma que componen su
 *                objeto, altas con id nuevo, interruptores que voltean,
 *                flujos con su propia compuerta (la importación revisa
 *                antes de escribir; showAllStructure solo dispara con
 *                la vista previa no vacía; los archive/restore del
 *                banco nacen de la lista que muestra su blanco).
 * Una receta nueva sin clasificar acusa; una en la puerta equivocada
 * acusa; una entrada muerta de la tabla acusa. Quien añada una receta
 * la clasifica en su propia ola, con su razón.
 *
 * INTEGRACIÓN SOBRE LA .333 (línea Faro, 2026-11-20): el censo acusó
 * las recetas de la Ola 1 de Captura, como la cura anunció que haría —
 * es su conducta correcta. Clasificadas con la misma vara:
 *   review-table.tsx (la mesa) — aterrizaje: su propia compuerta
 *     (canSave: al menos una fila marcada y ninguna roja marcada)
 *     garantiza que commitDrafts mueve ≥1 borrador de la bandeja al
 *     libro; la receta nunca devuelve su estado.
 *   tray.tsx (el descarte) — guardada, y el sitio MIGRÓ a
 *     commitGuarded al clasificar: dropDraft se niega por identidad
 *     cuando el borrador ya no vive (otra pestaña lo resolvió), y
 *     esa negativa no deja marco (clase A).
 *   receipt-scan.tsx (saveScanRewards) ya estaba clasificada desde
 *     la .327: la migración de Captura conservó su cabeza, su puerta
 *     y su cuenta — el aterrizaje sigue aterrizando (su compuerta
 *     `if (n)` solo llama cuando cae ≥1 borrador o recompensa).
 * ════════════════════════════════════════════════════════════════════ */
const PUERTAS = new Set(["commit", "commitGuarded", "commitAnnounced", "commitFinal", "commitDraft"]);
type ClasePuerta = "guardada" | "anunciada" | "final" | "aterrizaje";
const CENSO19: Record<string, [ClasePuerta, number]> = {
  "components/faro/archivo.tsx|commitGuarded|restoreCard": ["guardada", 1],
  "components/faro/archivo.tsx|commitGuarded|restoreLent": ["guardada", 1],
  "components/faro/archivo.tsx|commitGuarded|restoreLoan": ["guardada", 1],
  "components/faro/archivo.tsx|commitGuarded|upsertLine": ["guardada", 1],
  "components/faro/bank-import.tsx|commit|applyImport": ["aterrizaje", 1],
  "components/faro/bank-import.tsx|commit|resetGuides": ["aterrizaje", 1],
  "components/faro/bank-import.tsx|commit|revertImportCounted": ["aterrizaje", 1],
  "components/faro/bank-import.tsx|commit|saveGuides": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commitGuarded|restoreDefaultAccounts": ["guardada", 1],
  "components/faro/bank-settings.tsx|commit|addAccount": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|archiveAccount": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|archiveBank": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|editAccount": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|restoreAccount": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|restoreBank": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|withBook": ["aterrizaje", 5],
  "components/faro/cards.tsx|commitDraft|ref:expr": ["guardada", 1],
  "components/faro/cards.tsx|commitDraft|ref:freshId": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|dropCard": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|dropPresets": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|parseAmount": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|payCard": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|redeemRewards": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|restorePresets": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|storedPackExistence": ["guardada", 2],
  "components/faro/color-pick.tsx|commitGuarded|pushRecent": ["guardada", 1],
  "components/faro/debts.tsx|commitGuarded|archiveLent": ["guardada", 2],
  "components/faro/debts.tsx|commitGuarded|lentOf": ["guardada", 1],
  "components/faro/debts.tsx|commitGuarded|payLent": ["guardada", 1],
  "components/faro/debts.tsx|commitGuarded|restoreLent": ["guardada", 1],
  "components/faro/debts.tsx|commit|addLent": ["aterrizaje", 1],
  "components/faro/debts.tsx|commit|inline": ["aterrizaje", 3],
  "components/faro/debts.tsx|commit|lentOf": ["aterrizaje", 1],
  "components/faro/fit-pick.tsx|commitGuarded|dropFreq": ["guardada", 1],
  "components/faro/fit-pick.tsx|commitGuarded|fn": ["guardada", 2],
  "components/faro/fit-pick.tsx|commitGuarded|inline": ["guardada", 8],
  "components/faro/fit-pick.tsx|commitGuarded|rememberFreq": ["guardada", 1],
  "components/faro/fit-pick.tsx|commitGuarded|restoreLibrary": ["guardada", 1],
  "components/faro/fit-pick.tsx|commit|inline": ["aterrizaje", 3],
  "components/faro/fit-pick.tsx|commit|markUserVis": ["aterrizaje", 2],
  "components/faro/instruments.tsx|commit|inline": ["aterrizaje", 1],
  "components/faro/line-form.tsx|commit|upsertLine": ["aterrizaje", 1],
  "components/faro/loans.tsx|commitGuarded|archiveLoan": ["guardada", 2],
  "components/faro/loans.tsx|commitGuarded|loansOf": ["guardada", 1],
  "components/faro/loans.tsx|commitGuarded|payLoan": ["guardada", 2],
  "components/faro/loans.tsx|commitGuarded|restoreLoan": ["guardada", 1],
  "components/faro/loans.tsx|commit|addLoan": ["aterrizaje", 1],
  "components/faro/loans.tsx|commit|loansOf": ["aterrizaje", 1],
  "components/faro/notify-row.tsx|commit|inline": ["aterrizaje", 2],
  "components/faro/people.tsx|commitGuarded|peopleOf": ["guardada", 1],
  "components/faro/people.tsx|commit|mergeContacts": ["aterrizaje", 1],
  "components/faro/people.tsx|commit|upsertLine": ["aterrizaje", 1],
  "components/faro/presentacion.tsx|commit|ref:sow": ["aterrizaje", 3],
  "components/faro/provider.tsx|commitFinal|deleteRestingLines": ["final", 1],
  "components/faro/provider.tsx|commitFinal|deleteSpan": ["final", 1],
  "components/faro/provider.tsx|commitGuarded|hideLines": ["guardada", 1],
  "components/faro/provider.tsx|commitGuarded|hidePeriod": ["guardada", 1],
  "components/faro/provider.tsx|commitGuarded|restoreSpan": ["guardada", 1],
  "components/faro/provider.tsx|commit|inline": ["aterrizaje", 7],
  "components/faro/receipt-scan.tsx|commit|saveScanRewards": ["aterrizaje", 1],
  "components/faro/remesas.tsx|commitGuarded|deleteLine": ["guardada", 1],
  "components/faro/remesas.tsx|commit|upsertLine": ["aterrizaje", 1],
  "components/faro/remit-people.tsx|commitGuarded|addRemitPerson": ["guardada", 1],
  "components/faro/remit-people.tsx|commitGuarded|colorRemitPerson": ["guardada", 1],
  "components/faro/remit-people.tsx|commitGuarded|dropRemitPeople": ["guardada", 1],
  "components/faro/remit-people.tsx|commitGuarded|iconRemitPerson": ["guardada", 1],
  "components/faro/remit-people.tsx|commitGuarded|renameRemitPerson": ["guardada", 1],
  "components/faro/rewards-real.tsx|commit|withBook": ["aterrizaje", 1],
  "components/faro/review-table.tsx|commit|patchDraft": ["aterrizaje", 1],
  "components/faro/sample-mode.tsx|commit|stripSample": ["aterrizaje", 1],
  "components/faro/screens.tsx|commitAnnounced|modeOf": ["anunciada", 1],
  "components/faro/screens.tsx|commitGuarded|declareSeries": ["guardada", 6],
  "components/faro/screens.tsx|commitGuarded|deleteLine": ["guardada", 3],
  "components/faro/screens.tsx|commitGuarded|dropPocketLine": ["guardada", 2],
  "components/faro/screens.tsx|commitGuarded|inline": ["guardada", 8],
  "components/faro/screens.tsx|commitGuarded|patchLine": ["guardada", 13],
  "components/faro/screens.tsx|commitGuarded|patchLineWith": ["guardada", 5],
  "components/faro/screens.tsx|commitGuarded|restoreDefaultCategories": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|restoreRetiro": ["guardada", 2],
  "components/faro/screens.tsx|commitGuarded|run": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|seedRetiro": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|syncInsLine": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|withDeskSeedFlag": ["guardada", 3],
  "components/faro/screens.tsx|commit|applyCardEdits": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|applyTemplate": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|dropSubLines": ["aterrizaje", 2],
  "components/faro/screens.tsx|commit|inline": ["aterrizaje", 16],
  "components/faro/screens.tsx|commit|replaceCatalogItem": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|showAllStructure": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|syncInsLine": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|toggleStorePin": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|uid": ["aterrizaje", 4],
  "components/faro/screens.tsx|commit|upsertLine": ["aterrizaje", 7],
  "components/faro/screens.tsx|commit|vaultGlyph": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|withDeskSeedFlag": ["aterrizaje", 1],
  "components/faro/shell.tsx|commit|inline": ["aterrizaje", 2],
  "components/faro/slip-apply.tsx|commit|upsertLine": ["aterrizaje", 1],
  "components/faro/tray.tsx|commitGuarded|dropDraft": ["guardada", 1],
  "components/faro/widget-host.tsx|commit|ingestQuick": ["aterrizaje", 1],
  "components/faro/widget-host.tsx|commit|toggleStorePin": ["aterrizaje", 2],
  "components/faro/widget-host.tsx|commit|toggleWidgetPin": ["aterrizaje", 2],
};

const walkSrc19 = (dir: URL, prefix: string): { rel: string; text: string }[] => {
  const out: { rel: string; text: string }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...walkSrc19(new URL(`${e.name}/`, dir), `${prefix}${e.name}/`));
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.ts$/.test(e.name)) out.push({ rel: `${prefix}${e.name}`, text: readFileSync(new URL(e.name, dir), "utf8") });
  }
  return out;
};

const cabezaDe = (recipe: ts.Node): string => {
  if (!ts.isArrowFunction(recipe) && !ts.isFunctionExpression(recipe)) return ts.isIdentifier(recipe) ? `ref:${recipe.text}` : "ref:expr";
  let head = "inline";
  const visit = (n: ts.Node) => {
    if (head !== "inline") return;
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) { head = n.expression.text; return; }
    ts.forEachChild(n, visit);
  };
  visit(recipe.body);
  return head;
};

const censoVivo19 = (): Map<string, number> => {
  const rows = new Map<string, number>();
  for (const { rel, text } of walkSrc19(new URL("../../", import.meta.url), "")) {
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        let door: string | null = null;
        if (ts.isIdentifier(n.expression) && PUERTAS.has(n.expression.text)) door = n.expression.text;
        else if (ts.isPropertyAccessExpression(n.expression) && PUERTAS.has(n.expression.name.text)) door = n.expression.name.text;
        if (door && n.arguments.length >= 1) {
          const key = `${rel}|${door}|${cabezaDe(n.arguments[0]!)}`;
          rows.set(key, (rows.get(key) ?? 0) + 1);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return rows;
};

describe("ola19 · §B: el censo permanente de recetas", () => {
  it("toda receta alcanzable por una puerta está clasificada, en su puerta, con su cuenta — y ninguna entrada muere", () => {
    const vivo = censoVivo19();
    for (const [key, count] of vivo) {
      const entry = CENSO19[key];
      assert.ok(entry, `RECETA SIN CLASIFICAR: ${key} ×${count} — clasifícala con su razón (guardada, anunciada, final o aterrizaje)`);
      assert.equal(entry![1], count, `${key}: la cuenta cambió (${count} en el árbol, ${entry![1]} en la tabla) — re-clasifica el sitio`);
    }
    for (const key of Object.keys(CENSO19)) assert.ok(vivo.has(key), `entrada muerta del censo: ${key} — retira la entrada`);
  });
  it("la clase y la puerta concuerdan: guardada viaja por la puerta guardada, anunciada por la anunciada, final por commitFinal, aterrizaje por la ordinaria", () => {
    for (const [key, [clase]] of Object.entries(CENSO19)) {
      const door = key.split("|")[1]!;
      if (clase === "guardada") assert.ok(door === "commitGuarded" || door === "commitDraft", `${key}: clasificada guardada pero viaja por ${door}`);
      if (clase === "anunciada") assert.equal(door, "commitAnnounced", `${key}: la clase anunciada es solo de commitAnnounced`);
      if (clase === "final") assert.equal(door, "commitFinal", `${key}: la clase final es solo de commitFinal`);
      if (clase === "aterrizaje") assert.equal(door, "commit", `${key}: un aterrizaje viaja por la puerta ordinaria`);
    }
  });
  it("la casa curada en números: la mayoría de las recetas con negativa posible ya viaja guardada, y commitFinal guarda solo los dos borrados", () => {
    const vivo = censoVivo19();
    let total = 0, guardadas = 0;
    for (const [key, count] of vivo) { total += count; if (CENSO19[key]![0] === "guardada") guardadas += count; }
    assert.ok(guardadas >= 60, `las recetas guardadas son ${guardadas} de ${total}`);
    const finales = [...vivo.keys()].filter((k) => k.split("|")[1] === "commitFinal");
    assert.deepEqual(finales.sort(), ["components/faro/provider.tsx|commitFinal|deleteRestingLines", "components/faro/provider.tsx|commitFinal|deleteSpan"], "commitFinal sirve solo a los dos borrados del descanso");
  });
});
