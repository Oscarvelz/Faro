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
 *
 * RE-JUICIO OLA 20 (G20-1): la razón de arriba quedó CONDENADA por la
 * caza XX, y se reescribe aquí porque era el corazón del quiebre:
 * canSave juzga la FOTO del montaje, no la receta contra el estado
 * vivo — con la bandeja ya resuelta por otra mano, la mesa enmarcaba
 * un «Revisión N» con cero líneas y aprendía de parejas que nunca
 * aterrizaron. La clasificación nombra desde hoy la conducta de la
 * receta CONTRA LO VIVO: la mesa viaja por la puerta GUARDADA; su
 * receta parchea por diferencia contra el borrador vivo, calcula las
 * parejas del aprendizaje desde el resultado vivo y devuelve su
 * propio estado cuando nada se movió (commitDrafts se niega por
 * identidad cuando no convierte nada). Nada movido ⇒ sin marco, sin
 * entrada, sin revisión — y su firma entera queda en la llave:
 * patchDraft+dropDraft+commitDrafts+learnFromSaved.
 * Las llaves `provider.tsx|…|ref:recipe` son la maquinaria de las
 * puertas mismas (los envoltorios llaman a la puerta de sesión con la
 * receta del llamante, ya clasificada en su sitio): se clasifican por
 * la puerta que ejecutan, no como recetas nuevas.
 *   tray.tsx (el descarte) — guardada, y el sitio MIGRÓ a
 *     commitGuarded al clasificar: dropDraft se niega por identidad
 *     cuando el borrador ya no vive (otra pestaña lo resolvió), y
 *     esa negativa no deja marco (clase A).
 *   receipt-scan.tsx (saveScanRewards) ya estaba clasificada desde
 *     la .327: la migración de Captura conservó su cabeza, su puerta
 *     y su cuenta — el aterrizaje sigue aterrizando (su compuerta
 *     `if (n)` solo llama cuando cae ≥1 borrador o recompensa).
 *
 * ENMIENDA OLA 21 (G21-1): LA FIRMA A PUNTO FIJO. La caza XXI plantó
 * un efecto real dentro de `dropDraft` — un ayudante DELEGADO de la
 * receta de la mesa — y este censo corrió verde 71/71: la firma de la
 * ola 20 firmaba el cuerpo de la RECETA, y el cuerpo de un delegado
 * no era de nadie. Desde esta cura la firma es TRANSITIVA: cada
 * ayudante cosechado entra con su cuerpo, y la firma de una receta es
 * el cierre de los ayudantes que alcanza, con guarda de ciclo (la
 * lección de la cáscara: un grafo de ayudantes puede ciclar, y el
 * cierre no puede colgar). Un efecto nuevo dentro de un delegado
 * cambia la llave de su receta y exige re-clasificarla — la planta de
 * la caza XXI corre rojo aquí, verificado en mutante.
 * Las recetas por referencia firman A TRAVÉS de la referencia: una
 * atadura local a una función firma su cuerpo; una atadura a un
 * elemento de una tabla importada (los sembrados de la Presentación:
 * `const sow = STAGE_SEEDS[st.seed]`) firma la unión de los cuerpos
 * de la tabla, en el otro archivo. Lo único que conserva la firma
 * vacía es el PARÁMETRO (el `recipe` de los envoltorios del
 * proveedor): la maquinaria de la puerta misma, cuya carga ya se
 * clasifica en el sitio de su llamante — y una referencia que no se
 * resuelve a ningún cuerpo ACUSA como forma sin resolver, jamás pasa
 * con la firma vacía en silencio.
 * Y el censo aprendió el SOMBREADO: una llamada con nombre desnudo
 * solo es la puerta si el archivo ata ese nombre a la puerta (import,
 * desestructuración, alias) o a su envoltorio — el envoltorio que
 * reenvía a la puerta de sesión ES la puerta (los cuatro del
 * proveedor), y sus llamantes internos cuentan como siempre. Las dos
 * llaves viejas `cards.tsx|commitDraft|ref:…` se RETIRAN con su
 * razón: no eran la puerta — eran llamadas a la función LOCAL
 * `commitDraft` de CardForm (cards.tsx), cuyo cuerpo comete por
 * commitGuarded en sus sitios propios, ya clasificados; el censo
 * contaba una sombra como si fuera la puerta y firmaba su «receta»
 * (un booleano, un id) con la firma vacía. Una función local, una
 * atadura local o un parámetro con el nombre de una puerta — que no
 * sea su envoltorio — ya no cuentan como la puerta.
 * ════════════════════════════════════════════════════════════════════ */
const PUERTAS = new Set(["commit", "commitGuarded", "commitAnnounced", "commitFinal", "commitDraft"]);
type ClasePuerta = "guardada" | "anunciada" | "final" | "aterrizaje";
const CENSO19: Record<string, [ClasePuerta, number]> = {
  // 1.3.367 (la Bitácora): cerrar la serie anota que la edición fue
  // vista — el aterrizaje de la propia lectura; nada que confirmar.
  "components/faro/bitacora.tsx|commit|markEditionSeen|markEditionSeen": ["aterrizaje", 1],
  // 1.3.369 (las preguntas a la mano): la persona guarda SU lista —
  // añadir (del catálogo o escrita), reordenar y quitar aterrizan por
  // la puerta ordinaria, como los guardados de Ajustes de screens.
  "components/faro/ask-presets.tsx|commit|addAskPreset|addAskPreset": ["aterrizaje", 2],
  "components/faro/ask-presets.tsx|commit|moveAskPreset|moveAskPreset": ["aterrizaje", 2],
  "components/faro/ask-presets.tsx|commit|removeAskPreset|removeAskPreset": ["aterrizaje", 1],
  // 1.3.357 (la lista-plan, D6): el folio se reanuda y se borra por la
  // puerta guardada, como cada ciudadano del Archivo.
  "components/faro/archivo.tsx|commitGuarded|resumePlan|—": ["guardada", 1],
  "components/faro/archivo.tsx|commitGuarded|dropPlan|dropPlan": ["guardada", 1],
  "components/faro/archivo.tsx|commitGuarded|restoreCard|restoreCard": ["guardada", 1],
  "components/faro/archivo.tsx|commitGuarded|restoreLent|restoreLent": ["guardada", 1],
  "components/faro/archivo.tsx|commitGuarded|restoreLoan|restoreLoan": ["guardada", 1],
  "components/faro/archivo.tsx|commitGuarded|reactivateDueSeries|—": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|reactivateDueSeries|—": ["guardada", 1],
  "components/faro/bank-import.tsx|commit|applyImport|—": ["aterrizaje", 1],
  "components/faro/bank-import.tsx|commit|resetGuides|resetGuides+withBook+ensureAccounts": ["aterrizaje", 1],
  "components/faro/bank-import.tsx|commit|revertImportCounted|—": ["aterrizaje", 1],
  "components/faro/bank-import.tsx|commit|saveGuides|saveGuides+withBook+ensureAccounts": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commitGuarded|restoreDefaultAccounts|restoreDefaultAccounts+ensureAccounts+withBook": ["guardada", 1],
  "components/faro/bank-settings.tsx|commit|addAccount|—": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|archiveAccount|archiveAccount+withBook+ensureAccounts": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|archiveBank|archiveBank+withBook+ensureAccounts": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|editAccount|editAccount+ensureAccounts": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|restoreAccount|restoreAccount+withBook+ensureAccounts": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|restoreBank|restoreBank+withBook+ensureAccounts": ["aterrizaje", 1],
  "components/faro/bank-settings.tsx|commit|withBook|withBook+ensureAccounts": ["aterrizaje", 5],
  "components/faro/cards.tsx|commitGuarded|dropCard|dropCard": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|dropPresets|dropPresets+dropCard": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|parseAmount|putCard+addReading+addRewards": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|payCard|payCard+putCard": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|redeemRewards|redeemRewards+putCard": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|restorePresets|restorePresets": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|storedPackExistence|putCard+addReading+addRewards": ["guardada", 1],
  "components/faro/cards.tsx|commitGuarded|storedPackExistence|restoreCard+addReading+putCard+addRewards": ["guardada", 1],
  "components/faro/color-pick.tsx|commitGuarded|pushRecent|—": ["guardada", 1],
  "components/faro/debts.tsx|commitGuarded|archiveLent|archiveLent": ["guardada", 2],
  "components/faro/debts.tsx|commitGuarded|lentOf|—": ["guardada", 1],
  "components/faro/debts.tsx|commitGuarded|payLent|payLent": ["guardada", 1],
  "components/faro/debts.tsx|commitGuarded|restoreLent|restoreLent": ["guardada", 1],
  "components/faro/debts.tsx|commit|addLent|addLent": ["aterrizaje", 1],
  "components/faro/debts.tsx|commit|inline|—": ["aterrizaje", 3],
  "components/faro/debts.tsx|commit|lentOf|—": ["aterrizaje", 1],
  "components/faro/fit-pick.tsx|commitGuarded|dropFreq|dropFreq": ["guardada", 1],
  "components/faro/fit-pick.tsx|commitGuarded|fn|—": ["guardada", 2],
  "components/faro/fit-pick.tsx|commitGuarded|inline|—": ["guardada", 8],
  "components/faro/fit-pick.tsx|commitGuarded|rememberFreq|rememberFreq": ["guardada", 1],
  "components/faro/fit-pick.tsx|commitGuarded|restoreLibrary|restoreLibrary": ["guardada", 1],
  "components/faro/fit-pick.tsx|commit|inline|—": ["aterrizaje", 3],
  "components/faro/fit-pick.tsx|commit|markUserVis|—": ["aterrizaje", 2],
  "components/faro/instruments.tsx|commit|inline|—": ["aterrizaje", 1],
  "components/faro/line-form.tsx|commit|upsertLine|upsertLine+declareSeries": ["aterrizaje", 1],
  "components/faro/loans.tsx|commitGuarded|archiveLoan|archiveLoan": ["guardada", 2],
  "components/faro/loans.tsx|commitGuarded|loansOf|—": ["guardada", 1],
  "components/faro/loans.tsx|commitGuarded|payLoan|payLoan": ["guardada", 2],
  "components/faro/loans.tsx|commitGuarded|restoreLoan|restoreLoan": ["guardada", 1],
  "components/faro/loans.tsx|commit|addLoan|addLoan": ["aterrizaje", 1],
  "components/faro/loans.tsx|commit|loansOf|—": ["aterrizaje", 1],
  // 1.3.377: la fila de Notificaciones gana su tercer aterrizaje en línea —
  // el interruptor de cada tipo (flipKind), que compone notifyKinds o no
  // escribe; el maestro conserva sus dos y su ventana de confirmación.
  "components/faro/notify-row.tsx|commit|inline|—": ["aterrizaje", 3],
  // 1.3.356 (Ola 6): la fila hermana de los avisos de pagos — los mismos
  // dos aterrizajes en línea (encender al toque; apagar tras la ventana).
  "components/faro/due-alerts-row.tsx|commit|inline|—": ["aterrizaje", 2],
  "components/faro/people.tsx|commitGuarded|peopleOf|—": ["guardada", 1],
  "components/faro/people.tsx|commit|mergeContacts|—": ["aterrizaje", 1],
  "components/faro/people.tsx|commit|upsertLine|upsertLine": ["aterrizaje", 1],
  "components/faro/presentacion.tsx|commit|ref:sow|sow+addLent+addLoan+putCard+addReading+hidePeriod+sowBanco+hideFactoryVaults": ["aterrizaje", 3],
  "components/faro/provider.tsx|commitFinal|deleteRestingLines|deleteRestingLines": ["final", 1],
  "components/faro/provider.tsx|commitFinal|deleteSpan|deleteSpan": ["final", 1],
  "components/faro/provider.tsx|commitFinal|ref:recipe|—": ["final", 1],
  "components/faro/provider.tsx|commitGuarded|hideLines|hideLines": ["guardada", 1],
  "components/faro/provider.tsx|commitGuarded|hidePeriod|hidePeriod": ["guardada", 1],
  "components/faro/provider.tsx|commitGuarded|restoreSpan|restoreSpan": ["guardada", 1],
  "components/faro/provider.tsx|commitGuarded|ref:recipe|—": ["guardada", 1],
  "components/faro/provider.tsx|commitAnnounced|ref:recipe|—": ["anunciada", 1],
  // 1.3.344 (Captura Ola 4): el provider gana su octavo commit en línea —
  // el aterrizaje de la tasa pública de la invitada (fetchGuestRate), que
  // compone el estado entero con la tasa fechada o no escribe nada.
  // 1.3.356 (Ola 6): el noveno — el asentamiento del pago automático al
  // abrir, que compone el estado entero que settleAutopay devuelve o no
  // escribe nada (sin períodos vencidos no hay commit).
  // 1.3.362 (§18.5): la tasa que se trae sola al abrir — la composición
  // se encabeza con su propia cerca (shouldAutoRate: la manual jamás) y
  // solo escribe si el valor o la fecha cambian; aterrizaje idempotente.
  "components/faro/provider.tsx|commit|shouldAutoRate|—": ["aterrizaje", 1],
  "components/faro/provider.tsx|commit|inline|—": ["aterrizaje", 10], // 1.3.367: +1 — el asentamiento de la Bitácora al abrir (settleLogbook en línea, como el del autopay)
  "components/faro/provider.tsx|commit|ref:recipe|—": ["aterrizaje", 1],
  // 1.3.357 (la lista-plan): la hoja del plan comete sus marcas por
  // aterrizaje — cada receta compone el estado entero o no escribe.
  "components/faro/plan-sheet.tsx|commit|markPlanState|markPlanState": ["aterrizaje", 3],
  "components/faro/plan-sheet.tsx|commit|markBought|markBought": ["aterrizaje", 2],
  "components/faro/plan-sheet.tsx|commit|markBoughtLess|markBoughtLess": ["aterrizaje", 1],
  "components/faro/plan-sheet.tsx|commit|closePlan|—": ["aterrizaje", 1],
  "components/faro/plan-sheet.tsx|commit|addDrafts|addDrafts": ["aterrizaje", 1],
  "components/faro/plan-sheet.tsx|commitGuarded|dropDraft|dropDraft": ["guardada", 1],
  "components/faro/receipt-scan.tsx|commit|saveScanRewards|saveScanRewards+addRewards+putCard+addDrafts": ["aterrizaje", 1],
  "components/faro/capture-text.tsx|commit|addDrafts|addDrafts": ["aterrizaje", 1],
  // 1.3.342 (Captura Ola 3): la puerta de la lista comete por la misma
  // receta de aterrizaje que su hermana de texto — addDrafts nunca se
  // niega: añade los borradores del bache a la bandeja.
  // 1.3.357: la puerta gana su segundo aterrizaje addDrafts — el
  // nacimiento del plan (createPlan + las filas como borradores plan).
  "components/faro/capture-list.tsx|commit|addDrafts|addDrafts": ["aterrizaje", 2],
  // 1.3.345 (las pastillas útiles de Oscar): cada hoja de captura gana su
  // segundo commit — el corrector de la fila (draft-row) comete patchDraft
  // cuando el usuario toca una pastilla de duda y elige el valor: la
  // receta nunca se niega, parcha el borrador en la bandeja y re-deriva
  // sus dudas. Aterrizaje, como el nacimiento del borrador.
  "components/faro/capture-text.tsx|commit|patchDraft|patchDraft": ["aterrizaje", 1],
  "components/faro/capture-list.tsx|commit|patchDraft|patchDraft": ["aterrizaje", 1],
  // 1.3.345 (Captura Ola 5a): «Registrarlo» de la caja del Asesor comete
  // por la misma receta de aterrizaje que sus hermanas de captura —
  // addDrafts nunca se niega: deja el gasto preguntado en la bandeja.
  "components/faro/ask-box.tsx|commit|addDrafts|addDrafts": ["aterrizaje", 1],
  // CURA OLA 24 (familia 2, G24-3): deleteLine aprendió a migrar la
  // configuración del autopay de la serie a su instancia más nueva
  // restante (upsertLine dentro de la misma receta), así que su firma
  // crece a deleteLine+upsertLine en sus dos puertas. La clase no
  // cambia: la receta sigue viajando guardada, con la misma cuenta.
  "components/faro/remesas.tsx|commitGuarded|deleteLine|deleteLine+upsertLine": ["guardada", 1],
  "components/faro/remesas.tsx|commit|upsertLine|upsertLine": ["aterrizaje", 1],
  "components/faro/remit-people.tsx|commitGuarded|addRemitPerson|—": ["guardada", 1],
  "components/faro/remit-people.tsx|commitGuarded|colorRemitPerson|colorRemitPerson": ["guardada", 1],
  "components/faro/remit-people.tsx|commitGuarded|dropRemitPeople|dropRemitPeople": ["guardada", 1],
  "components/faro/remit-people.tsx|commitGuarded|iconRemitPerson|iconRemitPerson": ["guardada", 1],
  "components/faro/remit-people.tsx|commitGuarded|renameRemitPerson|renameRemitPerson": ["guardada", 1],
  "components/faro/rewards-real.tsx|commit|withBook|withBook+ensureAccounts": ["aterrizaje", 1],
  // Ola 20 (G20-1): la mesa RECLASIFICADA — ver el re-juicio en el
  // encabezado de esta sección: guardada, no aterrizaje.
  /* Ola 22 (G22-2): la receta de la mesa firma ahora por applyTableEdits
   * — el paseo de parches salió de save() a drafts.ts y la firma lo
   * nombra como cabeza; la clasificación no cambia (guardada: la mesa
   * aterriza por la puerta guardada) ni la cuenta (1). La llave vieja
   * (cabeza patchDraft) murió con el bucle en línea que la enfermedad
   * G22-2 habitaba. */
  "components/faro/review-table.tsx|commitGuarded|applyTableEdits|dropDraft+commitDrafts+upsertLine+learnFromSaved": ["guardada", 1],
  "components/faro/sample-mode.tsx|commit|stripSample|stripSample": ["aterrizaje", 1],
  "components/faro/screens.tsx|commitAnnounced|modeOf|—": ["anunciada", 1],
  "components/faro/screens.tsx|commitGuarded|declareSeries|declareSeries": ["guardada", 6],
  "components/faro/screens.tsx|commitGuarded|deleteLine|deleteLine+upsertLine": ["guardada", 3],
  "components/faro/screens.tsx|commitGuarded|dropPocketLine|—": ["guardada", 2],
  "components/faro/screens.tsx|commitGuarded|inline|—": ["guardada", 8],
  "components/faro/screens.tsx|commitGuarded|patchLine|patchLine+patchLineWith+upsertLine+deleteLine": ["guardada", 13],
  "components/faro/screens.tsx|commitGuarded|patchLineWith|patchLineWith+upsertLine+deleteLine": ["guardada", 5],
  "components/faro/screens.tsx|commitGuarded|restoreDefaultCategories|restoreDefaultCategories": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|restoreRetiro|restoreRetiro+seedRetiro": ["guardada", 2],
  "components/faro/screens.tsx|commitGuarded|run|—": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|seedRetiro|seedRetiro": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|syncInsLine|syncInsLine+ensureInsSeat": ["guardada", 1],
  "components/faro/screens.tsx|commitGuarded|withDeskSeedFlag|—": ["guardada", 3],
  "components/faro/screens.tsx|commit|applyCardEdits|—": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|applyTemplate|—": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|dropSubLines|—": ["aterrizaje", 2],
  // 1.3.344 (Captura Ola 4): el pliegue de la invitada suma cuatro
  // aterrizajes en línea — elegir la moneda, fijar la tasa manual,
  // volver a la del BCE y quitar la invitada — cada uno compone los
  // campos guestCur/guestRate enteros o no escribe.
  "components/faro/screens.tsx|commit|inline|—": ["aterrizaje", 20],
  "components/faro/screens.tsx|commit|replaceCatalogItem|—": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|showAllStructure|—": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|syncInsLine|syncInsLine+ensureInsSeat": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|toggleStorePin|—": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|uid|upsertLine": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|uid|—": ["aterrizaje", 3],
  "components/faro/screens.tsx|commit|upsertLine|upsertLine": ["aterrizaje", 7],
  "components/faro/screens.tsx|commit|vaultGlyph|upsertLine": ["aterrizaje", 1],
  "components/faro/screens.tsx|commit|withDeskSeedFlag|upsertLine": ["aterrizaje", 1],
  "components/faro/shell.tsx|commit|inline|—": ["aterrizaje", 2],
  "components/faro/slip-apply.tsx|commit|upsertLine|upsertLine": ["aterrizaje", 1],
  "components/faro/tray.tsx|commitGuarded|dropDraft|dropDraft": ["guardada", 1],
  // 1.3.360 (5c, la lista de espera): las recetas de la espera viajan por
  // la puerta ordinaria — ninguna puede negarse: anotar, poner precio,
  // sellar la pregunta, renovar, dejar, comprar (nace el borrador) y
  // borrar son idempotentes o nacen del estado vivo en el acto.
  "components/faro/waitlist.tsx|commit|addWish|—": ["aterrizaje", 1],
  // 1.3.362 (§18.3): la mirada de nuevo del precio al vencer la espera —
  // nace del estado vivo y solo escribe si el deseo sigue esperando sin
  // mirada para este vencimiento; aterrizaje como sus hermanas.
  "components/faro/waitlist.tsx|commit|lookWish|lookWish": ["aterrizaje", 1],
  // 1.3.362 (§2c): el recibo digital compartido cae en la bandeja por la
  // puerta ordinaria de borradores — aterrizaje, como todo lo que la
  // bandeja recibe (la mesa juzga después).
  "components/faro/link-inbox.tsx|commit|addDrafts|addDrafts": ["aterrizaje", 1],
  // 1.3.362 (§18.1): las puertas de la hoja del producto comparten por la
  // puerta ordinaria de cada casa — el deseo nace como en su lista, el
  // plan como en su hoja, la compra cae en la bandeja: aterrizaje todo.
  "components/faro/share-product.tsx|commit|addWish|—": ["aterrizaje", 1],
  "components/faro/share-product.tsx|commit|addDrafts|addDrafts": ["aterrizaje", 2],
  // La cuarta puerta (guardar la tienda) compone la pieza del catálogo en
  // línea, encabezada por su uid: nace como cualquier pieza a mano.
  "components/faro/share-product.tsx|commit|uid|—": ["aterrizaje", 1],
  // CURA OLA 24 (familia 1, Q24-C1): la entrada del sello de la pregunta
  // (waitlist.tsx|commit|askStamp|askStamp+patchWish) se RETIRA, como
  // manda este censo para las entradas muertas: la receta ya no existe —
  // el efecto de la sección dejó de commitear al mostrarse y la marca de
  // «ya preguntado por este plazo» vive en el aparato, fuera del libro
  // (waitlist.ts: wishAskMarks), donde el Deshacer no la reescribe. El
  // hecho del libro (askedAt, escrito por la respuesta de la persona)
  // sigue en el libro; el candado, no.
  "components/faro/waitlist.tsx|commit|buyWish|—": ["aterrizaje", 1],
  "components/faro/waitlist.tsx|commit|dropWish|dropWish": ["aterrizaje", 1],
  "components/faro/waitlist.tsx|commit|leaveWish|leaveWish+patchWish": ["aterrizaje", 1],
  "components/faro/waitlist.tsx|commit|renewWish|renewWish+patchWish": ["aterrizaje", 1],
  "components/faro/waitlist.tsx|commit|setWishPrice|setWishPrice+patchWish": ["aterrizaje", 1],
  // 1.3.360: el ajuste «Tiempo de espera» compone settings.waitHours en
  // línea (la cabeza derivada es Number, la conversión del paso elegido).
  "components/faro/screens.tsx|commit|Number|—": ["aterrizaje", 1],
  "components/faro/widget-host.tsx|commit|ingestQuick|ingestQuick+upsertLine": ["aterrizaje", 1],
  "components/faro/widget-host.tsx|commit|toggleStorePin|—": ["aterrizaje", 2],
  "components/faro/widget-host.tsx|commit|toggleWidgetPin|—": ["aterrizaje", 2],
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

/* ═══ ENMIENDA OLA 20 (G20-4/G20-5): LA FORMA RESUELTA Y EL CUERPO ═══
 * La caza XX midió dos cegueras de este censo, con especímenes:
 * (G20-4) la puerta se juzgaba por su grafía desnuda: la
 * desestructuración renombrada (`const { commit: commitPlano } =
 * useFaro()`), el acceso por elemento (`api["commit"]`) y la
 * invocación por `.call` eran invisibles — y la propia casa importa
 * las puertas del reducer CON alias (provider.tsx: `commit as
 * commitSession`), así que la forma resuelta ya era la grafía real de
 * la casa y el censo no la leía. (G20-5) la llave nombraba solo la
 * CABEZA de la receta: una segunda llamada con efecto tras la cabeza
 * (la receta que parchea y DESPUÉS oculta líneas con hideLines)
 * pasaba bajo la clasificación de la primera.
 *
 * La cura, en la misma vara con que la ola 14 curó la cáscara:
 * — Cada archivo cosecha sus nombres de puerta RESUELTOS: alias de
 *   importación de una puerta del reducer (nivel sesión: la receta es
 *   el segundo argumento), desestructuración de useFaro() — renombrada
 *   o no — y ataduras a accesos por propiedad o elemento de un objeto
 *   de useFaro() (nivel api: la receta es el primer argumento), con
 *   las cadenas de alias resueltas a punto fijo. La invocación por
 *   `.call` sobre un nombre resuelto también es la puerta (la receta
 *   viaja tras el thisArg, en la posición de su nivel). Un acceso por
 *   elemento con índice no literal sobre un objeto de useFaro() no se
 *   puede resolver: ACUSA como forma sin resolver, jamás pasa en
 *   silencio.
 * — La llave juzga el CUERPO ENTERO: a la cabeza se suma la FIRMA —
 *   la lista ordenada, sin repetición, de los ayudantes de estado que
 *   la receta llama en todo su cuerpo. Un ayudante de estado es una
 *   función cuyo primer parámetro es el libro (LedgerState) y cuyo
 *   retorno es el libro o un envoltorio con `state: LedgerState`
 *   (hideLines y su HideResult): la cosecha se hace sobre el árbol
 *   entero, con las mismas reglas para todos. Añadir una llamada de
 *   estado a una receta cambia su llave y exige re-clasificarla con
 *   su razón: eso es exactamente «toda llamada relevante tras la
 *   cabeza queda clasificada».
 * Las cuatro llamadas `…Session(s, recipe, detail)` dentro de los
 * envoltorios del proveedor quedan clasificadas como lo que son — la
 * maquinaria de la puerta misma, con la receta que transportan ya
 * clasificada en el sitio de su llamante (llaves `ref:recipe`). */
type InfoPuerta20 = { door: string; sesion: boolean };
/* Ola 21 (G21-1): la cosecha guarda también el CUERPO de cada
 * ayudante — la firma transitiva los expande. El mapa es por nombre
 * desnudo, como el conjunto: si dos archivos declaran el mismo
 * ayudante, la firma toma la unión de sus cuerpos (la dirección
 * segura para una firma: más sensibilidad, nunca menos). */
const cuerpos21 = new Map<string, ts.Node[]>();
const registraCuerpo21 = (name: string, body: ts.Node | undefined) => {
  if (!body) return;
  const arr = cuerpos21.get(name) ?? [];
  arr.push(body);
  cuerpos21.set(name, arr);
};
/* Ola 22 (G22-1): la cosecha aprende el ALIAS LLANO del libro. La
 * firma transitiva era un cierre sobre grafías: un delegado tipado
 * con un alias declarado del libro (`type Libro22 = LedgerState`)
 * jamás se cosechaba, porque esAyudante exigía el texto exacto
 * «LedgerState» en el parámetro y el retorno. Ahora todo alias de
 * tipo declarado se resuelve por sustitución de palabra entera, y
 * el juicio lee el texto RESUELTO; el envoltorio sigue exigiendo que
 * el retorno ESCRITO sea un nombre (un literal de objeto en línea no
 * es un envoltorio con nombre). La guarda de terminación es el
 * conjunto de alias ya expandidos en ESTA resolución: cada nombre se
 * expande una sola vez por cadena, así el alias que cicla (A = B,
 * B = A) se detiene sobre su propio nombre y el alias recursivo
 * (un árbol que se contiene) no crece sin fin — terminación
 * estructural, no un tope numérico (la lección de M20-9/M22-4).
 * Y la memoización se ata a la FIRMA de los archivos pedidos (rutas
 * y largos): la primera-llamada-gana de antes devolvía la cosecha
 * del árbol real a cualquier espécimen sintético que cosechara
 * después, cerrándole la puerta a clavar esta misma cura. */
let memo20: { clave: string; out: Set<string> } | null = null;
const cosechaAyudantes20 = (files: { rel: string; text: string }[]): Set<string> => {
  const clave = files.map((f) => `${f.rel}:${f.text.length}`).join("|");
  if (memo20 && memo20.clave === clave) return memo20.out;
  const out = new Set<string>();
  const parsed = files.map(({ rel, text }) => ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
  /* ═══ OLA 23 (G23-5): EL ALIAS SE RESUELVE POR (NOMBRE, CONTEXTO) ═══
   * La cosecha de la ola 22 guardaba los alias en UN mapa global por
   * nombre desnudo, último-en-orden-de-caminata-gana: un cebo inocente
   * en otro rincón del árbol (`type Libro23 = { otra: number }` en
   * src/spa/) REDEFINÍA el alias del libro para todo el censo y el
   * delegado real escapaba con la cerca en verde — la enfermedad que
   * la cáscara curó en M21-2c/M21-5, viva en la cerca JS. Ahora cada
   * archivo declara SUS alias y sus importaciones de tipo, y un nombre
   * se resuelve donde se USA: primero el alias declarado en ese
   * archivo; si no, el nombre que ese archivo IMPORTA como tipo,
   * resuelto en el archivo de origen con su nombre original; si
   * ninguno, el nombre queda como está — un nombre de ninguna parte no
   * es el libro. El texto de una definición se expande en el contexto
   * del archivo que la DECLARÓ: un alias significa lo que su casa dice.
   * La terminación sigue siendo estructural: la cadena de (archivo,
   * nombre) ya expandidos en esta resolución detiene el ciclo sobre su
   * propio nombre. */
  const conocidos = new Set(files.map((f) => f.rel));
  const aliasEn = new Map<string, Map<string, string>>();
  const tipoImportsEn = new Map<string, Map<string, { targetRel: string; imported: string }>>();
  for (const sf of parsed) {
    const rel = sf.fileName;
    const am = new Map<string, string>();
    const im = new Map<string, { targetRel: string; imported: string }>();
    const visit = (n: ts.Node) => {
      if (ts.isTypeAliasDeclaration(n)) am.set(n.name.text, n.type.getText(sf));
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
        const targetRel = resuelveModulo21(rel, n.moduleSpecifier.text, conocidos);
        const bindings = n.importClause?.namedBindings;
        if (targetRel && bindings && ts.isNamedImports(bindings)) {
          for (const el of bindings.elements) {
            if (!(n.importClause?.isTypeOnly || el.isTypeOnly)) continue;
            im.set(el.name.text, { targetRel, imported: el.propertyName?.text ?? el.name.text });
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    aliasEn.set(rel, am);
    tipoImportsEn.set(rel, im);
  }
  const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /* «LedgerState» NO se expande: es el nombre terminal del libro (su
   * declaración en types.ts es el objeto mismo), no un alias más —
   * expandirlo convertiría cada parámetro bien tipado en un literal
   * de objeto y la cosecha entera se vaciaría. */
  const defExpandida = (name: string, rel: string, cadena: Set<string>): string | null => {
    const marca = `${rel}::${name}`;
    if (cadena.has(marca)) return name;
    const local = aliasEn.get(rel)?.get(name);
    if (local !== undefined) {
      cadena.add(marca);
      return expandeTexto(local, rel, cadena);
    }
    const imp = tipoImportsEn.get(rel)?.get(name);
    if (imp) {
      cadena.add(marca);
      return defExpandida(imp.imported, imp.targetRel, cadena) ?? name;
    }
    return null;
  };
  const expandeTexto = (texto: string, rel: string, cadena: Set<string>): string => {
    const visibles = new Set<string>([
      ...(aliasEn.get(rel)?.keys() ?? []),
      ...(tipoImportsEn.get(rel)?.keys() ?? []),
    ]);
    visibles.delete("LedgerState");
    if (!visibles.size) return texto;
    const patron = new RegExp(`\\b(${[...visibles].map(escapa).join("|")})\\b`, "g");
    return texto.replace(patron, (m) => defExpandida(m, rel, new Set(cadena)) ?? m);
  };
  const resuelveTipo = (texto: string, rel: string): string => expandeTexto(texto, rel, new Set());
  const esAyudante = (params: ts.NodeArray<ts.ParameterDeclaration>, ret: ts.Node | undefined, rel: string): boolean => {
    const p0 = params[0];
    if (!p0?.type || resuelveTipo(p0.type.getText(), rel) !== "LedgerState") return false;
    if (!ret) return false;
    const rt = ret.getText();
    if (resuelveTipo(rt, rel) === "LedgerState") return true;
    return /^[A-Za-z_$][\w$]*$/.test(rt) && /state\s*:\s*LedgerState/.test(resuelveTipo(rt, rel));
  };
  for (const sf of parsed) {
    const visit = (n: ts.Node) => {
      if (ts.isFunctionDeclaration(n) && n.name && esAyudante(n.parameters, n.type, sf.fileName)) { out.add(n.name.text); registraCuerpo21(n.name.text, n.body); }
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)) && esAyudante(n.initializer.parameters, n.initializer.type, sf.fileName)) { out.add(n.name.text); registraCuerpo21(n.name.text, n.initializer.body); }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  memo20 = { clave, out };
  return out;
};
/* ═══ OLA 21 (G21-1): LA FIRMA A PUNTO FIJO ═══
 * expandir21 camina un cuerpo y recoge los ayudantes que llama, y
 * por cada uno expande SU cuerpo a su vez: la firma de una receta es
 * el CIERRE TRANSITIVO de los ayudantes que alcanza. La guarda de
 * ciclo es un conjunto visitado por firma: un ayudante se expande una
 * sola vez, así un grafo que cicla (a→b→a) termina — la lección de la
 * cáscara, que un cierre sin guarda cuelga. El orden es el de
 * descubrimiento, como la firma plana de la ola 20, de la que esta es
 * prefijo cuando los ayudantes no llaman a otros ayudantes. */
const expandir21 = (body: ts.Node, ayudantes: Set<string>, seen: string[], guard: Set<string>): void => {
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      /* Ola 22 (G22-1): la grafía `.call`/`.apply` sobre un
       * identificador llama a ESE identificador — la puerta conoce la
       * grafía desde la ola 20, pero la expansión tomaba el nombre de
       * la propiedad («call») y el ayudante llamado así dentro de un
       * delegado escapaba de la firma de su llamante. */
      const name = ts.isIdentifier(callee) ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? (callee.name.text === "call" || callee.name.text === "apply") && ts.isIdentifier(callee.expression) ? callee.expression.text : callee.name.text
          : null;
      if (name && ayudantes.has(name)) {
        if (!seen.includes(name)) seen.push(name);
        if (!guard.has(name)) {
          guard.add(name);
          for (const b of cuerpos21.get(name) ?? []) expandir21(b, ayudantes, seen, guard);
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(body);
};

/* El entorno de un archivo para resolver referencias: sus
 * declaraciones por nombre (el nodo de la función o el inicializador
 * de la atadura), sus importaciones resueltas al archivo destino, y —
 * llenados en la segunda pasada — sus alias de puerta y sus sombras. */
type Env21 = {
  rel: string;
  decls: Map<string, ts.Node>;
  imports: Map<string, { imported: string; targetRel: string }>;
  aliases: Map<string, InfoPuerta20>;
  sombras: Set<string>;
};
const archivos21 = new Map<string, Env21>();
const resuelveModulo21 = (desdeRel: string, spec: string, conocidos: ReadonlySet<string>): string | null => {
  let base: string | null = null;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) {
    const dir = desdeRel.split("/").slice(0, -1);
    for (const parte of spec.split("/")) {
      if (parte === "." || parte === "") continue;
      else if (parte === "..") dir.pop();
      else dir.push(parte);
    }
    base = dir.join("/");
  }
  if (base === null) return null;
  for (const cand of [base, `${base}.ts`, `${base}.tsx`]) if (conocidos.has(cand)) return cand;
  return null;
};
type MiembroTabla21 = ts.ArrowFunction | ts.FunctionExpression | ts.MethodDeclaration;
const miembrosDeTabla21 = (node: ts.Node): MiembroTabla21[] | null => {
  if (!ts.isObjectLiteralExpression(node)) return null;
  const out: MiembroTabla21[] = [];
  for (const pr of node.properties) {
    if (ts.isPropertyAssignment(pr) && (ts.isArrowFunction(pr.initializer) || ts.isFunctionExpression(pr.initializer))) out.push(pr.initializer);
    else if (ts.isMethodDeclaration(pr)) out.push(pr);
  }
  return out.length ? out : null;
};
const resuelveTabla21 = (name: string, env: Env21): MiembroTabla21[] | null => {
  const local = env.decls.get(name);
  if (local) { const m = miembrosDeTabla21(local); if (m) return m; }
  const imp = env.imports.get(name);
  if (imp) {
    const d = archivos21.get(imp.targetRel)?.decls.get(imp.imported);
    if (d) return miembrosDeTabla21(d);
  }
  return null;
};
const firmaDeNodo21 = (node: ts.Node, env: Env21, ayudantes: Set<string>, visitados: ReadonlySet<string>): string | null => {
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    if (!node.body) return null;
    const seen: string[] = [];
    expandir21(node.body, ayudantes, seen, new Set());
    return seen.length ? seen.join("+") : "—";
  }
  if (ts.isIdentifier(node)) return firmaReferencia21(node.text, node, env, ayudantes, visitados);
  if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression)) {
    const tabla = resuelveTabla21(node.expression.text, env);
    if (!tabla) return null;
    const seen: string[] = [];
    const guard = new Set<string>();
    for (const cuerpo of tabla) { if (cuerpo.body) expandir21(cuerpo.body, ayudantes, seen, guard); }
    return seen.length ? seen.join("+") : "—";
  }
  return null;
};
/* Firmar a través de un nombre: un parámetro del envoltorio es la
 * maquinaria (su carga se clasifica en el sitio del llamante) y firma
 * «—» con esa razón; una atadura local o importada firma su cuerpo;
 * lo que no se resuelve a ningún cuerpo devuelve null y el llamante
 * ACUSA — la firma vacía en silencio es exactamente el hueco G21-1. */
const firmaReferencia21 = (name: string, site: ts.Node, env: Env21, ayudantes: Set<string>, visitados: ReadonlySet<string>): string | null => {
  if (visitados.has(name)) return null;
  let p: ts.Node | undefined = site.parent;
  while (p && !ts.isSourceFile(p)) {
    if (ts.isFunctionLike(p) && p.parameters.some((q) => ts.isIdentifier(q.name) && q.name.text === name)) return "—";
    p = p.parent;
  }
  const next = new Set([...visitados, name]);
  const local = env.decls.get(name);
  if (local) return firmaDeNodo21(local, env, ayudantes, next);
  const imp = env.imports.get(name);
  if (imp) {
    const destino = archivos21.get(imp.targetRel);
    const d = destino?.decls.get(imp.imported);
    if (destino && d) return firmaDeNodo21(d, destino, ayudantes, next);
  }
  return null;
};
const firmaDe = (recipe: ts.Node, ayudantes: Set<string>, env: Env21): string => {
  if (!ts.isArrowFunction(recipe) && !ts.isFunctionExpression(recipe)) {
    if (ts.isIdentifier(recipe)) {
      const f = firmaReferencia21(recipe.text, recipe, env, ayudantes, new Set());
      if (f === null) {
        sinResolver20.push(`${env.rel}: la receta por referencia «${recipe.text}» no se resuelve a ningún cuerpo firmable — forma de puerta sin resolver (ola 21, G21-1)`);
        return "—";
      }
      return f;
    }
    return "—";
  }
  const seen: string[] = [];
  expandir21(recipe.body, ayudantes, seen, new Set());
  return seen.length ? seen.join("+") : "—";
};
/* El sombreado: un nombre desnudo solo es la puerta si el archivo lo
 * ata a la puerta. Una función local, una atadura local o un
 * parámetro con el nombre de una puerta la SOMBREN — la llamada es a
 * la sombra, no a la puerta (las dos «recetas» de commitDraft en
 * cards.tsx eran la función local de CardForm). */
const sombreada21 = (name: string, site: ts.Node, env: Env21): boolean => {
  if (env.aliases.has(name)) return false;
  if (env.sombras.has(name)) return true;
  let p: ts.Node | undefined = site.parent;
  while (p && !ts.isSourceFile(p)) {
    if (ts.isFunctionLike(p) && p.parameters.some((q) => ts.isIdentifier(q.name) && q.name.text === name)) return true;
    p = p.parent;
  }
  return false;
};
let sinResolver20: string[] = [];
const censoVivo19 = (): Map<string, number> => {
  const files = walkSrc19(new URL("../../", import.meta.url), "");
  const ayudantes = cosechaAyudantes20(files);
  const rows = new Map<string, number>();
  sinResolver20 = [];
  /* PASADA 1 (ola 21): los entornos de todos los archivos — la firma
   * por referencia cruza archivos (la tabla de sembrados vive en
   * stage-seeds.ts y se firma desde presentacion.tsx), así que ningún
   * conteo empieza hasta que cada archivo tiene su entorno. */
  archivos21.clear();
  const conocidos = new Set(files.map((f) => f.rel));
  const parsed = new Map<string, ts.SourceFile>();
  for (const { rel, text } of files) {
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    parsed.set(rel, sf);
    const env: Env21 = { rel, decls: new Map(), imports: new Map(), aliases: new Map(), sombras: new Set() };
    const collect = (n: ts.Node) => {
      if (ts.isFunctionDeclaration(n) && n.name && !env.decls.has(n.name.text)) env.decls.set(n.name.text, n);
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && !env.decls.has(n.name.text)) env.decls.set(n.name.text, n.initializer);
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
        const targetRel = resuelveModulo21(rel, n.moduleSpecifier.text, conocidos);
        if (targetRel) for (const el of n.importClause.namedBindings.elements) env.imports.set(el.name.text, { imported: (el.propertyName ?? el.name).text, targetRel });
      }
      ts.forEachChild(n, collect);
    };
    collect(sf);
    archivos21.set(rel, env);
  }
  /* PASADA 2: alias resueltos, sombras y conteo, archivo a archivo. */
  for (const { rel } of files) {
    const sf = parsed.get(rel)!;
    const env = archivos21.get(rel)!;
    const aliases = env.aliases;
    const apiObjs = new Set<string>();
    const visitImports = (n: ts.Node) => {
      if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
        for (const el of n.importClause.namedBindings.elements) {
          const imported = (el.propertyName ?? el.name).text;
          if (PUERTAS.has(imported)) aliases.set(el.name.text, { door: imported, sesion: true });
        }
      }
      ts.forEachChild(n, visitImports);
    };
    visitImports(sf);
    const decls: ts.VariableDeclaration[] = [];
    const collect = (n: ts.Node) => { if (ts.isVariableDeclaration(n)) decls.push(n); ts.forEachChild(n, collect); };
    collect(sf);
    const esUseFaro = (e: ts.Expression): boolean => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "useFaro";
    for (let round = 0; round < 4; round++) {
      for (const d of decls) {
        if (!d.initializer) continue;
        const init = d.initializer;
        if (ts.isIdentifier(d.name)) {
          const name = d.name.text;
          if (esUseFaro(init)) { apiObjs.add(name); continue; }
          if (aliases.has(name)) continue;
          if (ts.isIdentifier(init) && aliases.has(init.text)) aliases.set(name, aliases.get(init.text)!);
          else if (ts.isPropertyAccessExpression(init) && PUERTAS.has(init.name.text)) aliases.set(name, { door: init.name.text, sesion: false });
          else if (ts.isElementAccessExpression(init) && ts.isStringLiteral(init.argumentExpression) && PUERTAS.has(init.argumentExpression.text)) aliases.set(name, { door: init.argumentExpression.text, sesion: false });
        } else if (ts.isObjectBindingPattern(d.name)) {
          if (!esUseFaro(init) && !(ts.isIdentifier(init) && apiObjs.has(init.text))) continue;
          for (const el of d.name.elements) {
            const nameNode = el.propertyName ?? el.name;
            const prop = ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) ? nameNode.text : null;
            if (prop && PUERTAS.has(prop) && ts.isIdentifier(el.name)) aliases.set(el.name.text, { door: prop, sesion: false });
          }
        }
      }
    }
    /* Las sombras del archivo (ola 21): todo nombre de puerta que el
     * archivo declara como función o atadura local sin resolverlo a la
     * puerta sombrea la puerta en ese archivo — SALVO el envoltorio
     * que reenvía a la puerta de sesión: ese ES la puerta (los cuatro
     * envoltorios del proveedor), y sus llamantes internos cometen por
     * la puerta con su receta, como siempre contó este censo. */
    const esEnvoltorioPuerta21 = (node: ts.Node): boolean => {
      let fn: ts.Node | undefined = node;
      if (ts.isCallExpression(node)) fn = node.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
      if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn)) || !fn.body) return false;
      let found = false;
      const visit = (n: ts.Node) => {
        if (found) return;
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && aliases.get(n.expression.text)?.sesion) found = true;
        ts.forEachChild(n, visit);
      };
      visit(fn.body);
      return found;
    };
    for (const [name, node] of env.decls) if (PUERTAS.has(name) && !aliases.has(name) && !esEnvoltorioPuerta21(node)) env.sombras.add(name);
    const cuenta = (info: InfoPuerta20, recipe: ts.Node | undefined) => {
      if (!recipe) return;
      const key = `${rel}|${info.door}|${cabezaDe(recipe)}|${firmaDe(recipe, ayudantes, env)}`;
      rows.set(key, (rows.get(key) ?? 0) + 1);
    };
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const e = n.expression;
        if (ts.isIdentifier(e)) {
          if (PUERTAS.has(e.text)) { if (!sombreada21(e.text, n, env)) cuenta({ door: e.text, sesion: aliases.get(e.text)?.sesion ?? false }, n.arguments[aliases.get(e.text)?.sesion ? 1 : 0]); }
          else if (aliases.has(e.text)) { const info = aliases.get(e.text)!; cuenta(info, n.arguments[info.sesion ? 1 : 0]); }
        } else if (ts.isPropertyAccessExpression(e)) {
          if (PUERTAS.has(e.name.text)) cuenta({ door: e.name.text, sesion: false }, n.arguments[0]);
          else if (e.name.text === "call") {
            const obj = e.expression;
            const info = ts.isIdentifier(obj) ? (PUERTAS.has(obj.text) ? { door: obj.text, sesion: aliases.get(obj.text)?.sesion ?? false } : aliases.get(obj.text)) : ts.isPropertyAccessExpression(obj) && PUERTAS.has(obj.name.text) ? { door: obj.name.text, sesion: false } : undefined;
            if (info) cuenta(info, n.arguments[info.sesion ? 2 : 1] ?? n.arguments[1]);
          }
        } else if (ts.isElementAccessExpression(e)) {
          if (ts.isStringLiteral(e.argumentExpression) && PUERTAS.has(e.argumentExpression.text)) cuenta({ door: e.argumentExpression.text, sesion: false }, n.arguments[0]);
          else if (ts.isIdentifier(e.expression) && apiObjs.has(e.expression.text)) sinResolver20.push(`${rel}: acceso por elemento sin índice literal sobre el objeto de useFaro() — forma de puerta sin resolver`);
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
    assert.deepEqual(sinResolver20, [], "ninguna forma de puerta queda sin resolver (ola 20, G20-4)");
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
    const finales = [...vivo.keys()].filter((k) => k.split("|")[1] === "commitFinal" && !k.includes("|ref:recipe|"));
    assert.deepEqual(finales.sort(), ["components/faro/provider.tsx|commitFinal|deleteRestingLines|deleteRestingLines", "components/faro/provider.tsx|commitFinal|deleteSpan|deleteSpan"], "commitFinal sirve solo a los dos borrados del descanso (la llave ref:recipe es la maquinaria de la puerta misma, no una receta)");
  });
});

describe("ola19 · §B-bis (ola 21, G21-1): la firma es transitiva, el ciclo no cuelga, la referencia firma", () => {
  const cuerpoDe = (src: string): ts.Node => {
    const sf = ts.createSourceFile("planta21.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let body: ts.Node | undefined;
    const visit = (n: ts.Node) => {
      if (!body && ts.isFunctionDeclaration(n) && n.body) body = n.body;
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return body!;
  };
  it("un efecto dentro de un DELEGADO entra en la firma de quien lo llama (la planta de Guardián, en sintético)", () => {
    const files = walkSrc19(new URL("../../", import.meta.url), "");
    const ayudantes = new Set([...cosechaAyudantes20(files), "delegadoPlanta21"]);
    cuerpos21.set("delegadoPlanta21", [cuerpoDe("export function delegadoPlanta21(s: LedgerState): LedgerState { return hideLines(s, [], null).state; }")]);
    const seen: string[] = [];
    expandir21(cuerpoDe("export function recetaPlanta21(s: LedgerState): LedgerState { return delegadoPlanta21(s); }"), ayudantes, seen, new Set());
    assert.deepEqual(seen, ["delegadoPlanta21", "hideLines"],
      "la firma nombra al delegado Y al efecto que el delegado esconde: plantar un efecto en un ayudante cambia la llave de su receta");
    cuerpos21.delete("delegadoPlanta21");
  });
  it("el grafo de ayudantes puede ciclar sin colgar el cierre: a→b→a se expande una vez", () => {
    const ayudantes = new Set(["cicloA21", "cicloB21", "upsertLine"]);
    cuerpos21.set("cicloA21", [cuerpoDe("export function cicloA21(s: LedgerState): LedgerState { return cicloB21(s); }")]);
    cuerpos21.set("cicloB21", [cuerpoDe("export function cicloB21(s: LedgerState): LedgerState { const t = cicloA21(s); return upsertLine(t, null as never); }")]);
    const seen: string[] = [];
    expandir21(cuerpoDe("export function recetaCiclo21(s: LedgerState): LedgerState { return cicloA21(s); }"), ayudantes, seen, new Set());
    assert.deepEqual(seen, ["cicloA21", "cicloB21", "upsertLine"], "el cierre termina y nombra el ciclo entero una sola vez");
    cuerpos21.delete("cicloA21");
    cuerpos21.delete("cicloB21");
  });
});

describe("ola19 · §B-ter (ola 22, G22-1): la firma aprende el alias llano y la grafía .call dentro del delegado", () => {
  const cuerpoDe = (src: string): ts.Node => {
    const sf = ts.createSourceFile("planta22.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let body: ts.Node | undefined;
    const visit = (n: ts.Node) => {
      if (!body && ts.isFunctionDeclaration(n) && n.body) body = n.body;
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return body!;
  };
  it("un delegado tipado con un alias llano del libro SE COSECHA como si dijera LedgerState (la planta A de Guardián)", () => {
    const files = [{ rel: "planta22.ts", text: `
      export type Libro22 = LedgerState;
      export type LibroBis22 = Libro22;
      export type Caja22 = { state: LedgerState; n: number };
      export function delegadoAlias22(s: Libro22): Libro22 { return hideLines(s, [], null).state; }
      export function delegadoCadena22(s: LibroBis22): LibroBis22 { return s; }
      export function delegadoEnvuelto22(s: LedgerState): Caja22 { return { state: s, n: 0 }; }
      export function noAyudante22(s: string): string { return s; }
    ` }];
    const ayudantes = cosechaAyudantes20(files);
    assert.ok(ayudantes.has("delegadoAlias22"), "el alias llano se resuelve: el delegado es ayudante");
    assert.ok(ayudantes.has("delegadoCadena22"), "la cadena de alias (alias de alias) también se resuelve");
    assert.ok(ayudantes.has("delegadoEnvuelto22"), "el envoltorio nombrado por alias sigue contando como ayudante");
    assert.ok(!ayudantes.has("noAyudante22"), "y lo que no toca el libro no se cosecha");
    const seen: string[] = [];
    expandir21(cuerpoDe("export function recetaAlias22(s: LedgerState): LedgerState { return delegadoAlias22(s); }"), new Set([...ayudantes, "hideLines"]), seen, new Set());
    assert.deepEqual(seen, ["delegadoAlias22", "hideLines"],
      "el cuerpo del delegado cosechado por alias quedó registrado: la firma de su llamante nombra al delegado Y a su efecto — plantar el efecto cambia la llave");
  });
  it("la invocación .call/.apply de un ayudante dentro de un delegado entra en la firma (la planta B de Guardián)", () => {
    const ayudantes = new Set(["delegadoCall22", "hideLines", "upsertLine"]);
    cuerpos21.set("delegadoCall22", [cuerpoDe("export function delegadoCall22(s: LedgerState): LedgerState { const t = hideLines.call(null, s, [], null) as LedgerState; return upsertLine.apply(null, [t, null as never]) as LedgerState; }")]);
    const seen: string[] = [];
    expandir21(cuerpoDe("export function recetaCall22(s: LedgerState): LedgerState { return delegadoCall22(s); }"), ayudantes, seen, new Set());
    assert.deepEqual(seen, ["delegadoCall22", "hideLines", "upsertLine"],
      "las dos grafías nombran a su ayudante: el efecto llamado con .call ya no escapa de la firma");
    cuerpos21.delete("delegadoCall22");
  });
  it("el alias que cicla no cuelga la cosecha: la guarda es el nombre ya expandido, no un tope", () => {
    const files = [{ rel: "ciclo22.ts", text: `
      export type A22 = B22;
      export type B22 = A22;
      export function delegadoCiclo22(s: A22): A22 { return s; }
    ` }];
    const ayudantes = cosechaAyudantes20(files);
    assert.ok(!ayudantes.has("delegadoCiclo22"), "el ciclo se resuelve sobre sí mismo: no es el libro, y la cosecha terminó");
  });
});

describe("ola19 · §B-quater (ola 23, G23-5): el alias se resuelve en SU archivo — el cebo de otra carpeta no redefine el libro", () => {
  const cuerpoDe = (src: string): ts.Node => {
    const sf = ts.createSourceFile("planta23.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let body: ts.Node | undefined;
    const visit = (n: ts.Node) => {
      if (!body && ts.isFunctionDeclaration(n) && n.body) body = n.body;
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return body!;
  };
  it("el alias declarado en OTRO archivo y traído con import type se cosecha en su origen (C1/C2 de Guardián)", () => {
    const files = [
      { rel: "tipos23.ts", text: `
        export type Libro23 = LedgerState;
        export type LibroBis23 = Libro23;
        export type Caja23 = { state: LedgerState; n: number };
      ` },
      { rel: "delegado23.ts", text: `
        import type { Libro23, LibroBis23, Caja23 } from "./tipos23";
        export function delegadoCruzado23(s: Libro23): Libro23 { return hideLines(s, [], null).state; }
        export function delegadoCadenaCruzada23(s: LibroBis23): LibroBis23 { return s; }
        export function delegadoEnvueltoCruzado23(s: LedgerState): Caja23 { return { state: s, n: 0 }; }
      ` },
    ];
    const ayudantes = cosechaAyudantes20(files);
    assert.ok(ayudantes.has("delegadoCruzado23"), "el alias vive en otro archivo: se resuelve donde se declaró y el delegado es ayudante");
    assert.ok(ayudantes.has("delegadoCadenaCruzada23"), "la cadena de alias también cruza archivos");
    assert.ok(ayudantes.has("delegadoEnvueltoCruzado23"), "el envoltorio nombrado por alias importado sigue contando");
    cuerpos21.set("delegadoCruzado23", [cuerpoDe("export function delegadoCruzado23(s: LedgerState): LedgerState { return hideLines(s, [], null).state; }")]);
    const seen: string[] = [];
    expandir21(cuerpoDe("export function recetaCruzada23(s: LedgerState): LedgerState { return delegadoCruzado23(s); }"), new Set([...ayudantes, "hideLines"]), seen, new Set());
    assert.deepEqual(seen, ["delegadoCruzado23", "hideLines"], "la firma del llamante nombra al delegado cruzado Y a su efecto");
    cuerpos21.delete("delegadoCruzado23");
  });
  it("el cebo con el mismo nombre en otra carpeta NO redefine el alias del libro (la planta C3 de Guardián, la rotura de la ola 23)", () => {
    const files = [
      { rel: "tipos23.ts", text: `export type Libro23 = LedgerState;` },
      { rel: "delegado23.ts", text: `
        import type { Libro23 } from "./tipos23";
        export function delegadoCebo23(s: Libro23): Libro23 { return hideLines(s, [], null).state; }
      ` },
      // el cebo: inocente en su carpeta, último en el orden de caminata —
      // con el mapa global de la ola 22 era la definición que ganaba.
      { rel: "spa/cebo23.ts", text: `export type Libro23 = { otra: number };` },
    ];
    const ayudantes = cosechaAyudantes20(files);
    assert.ok(ayudantes.has("delegadoCebo23"),
      "el nombre se resuelve en el archivo que lo USA, por su importación: el cebo de src/spa no toca al delegado de la librería");
    cuerpos21.set("delegadoCebo23", [cuerpoDe("export function delegadoCebo23(s: LedgerState): LedgerState { return hideLines(s, [], null).state; }")]);
    const seen: string[] = [];
    expandir21(cuerpoDe("export function recetaCebo23(s: LedgerState): LedgerState { return delegadoCebo23(s); }"), new Set([...ayudantes, "hideLines"]), seen, new Set());
    assert.deepEqual(seen, ["delegadoCebo23", "hideLines"], "el efecto real del delegado entra en la firma de su llamante: plantar el efecto cambia la llave");
    cuerpos21.delete("delegadoCebo23");
  });
  it("la declaración LOCAL sombrea al nombre importado: el contexto del archivo manda en los dos sentidos", () => {
    const files = [
      { rel: "tipos23b.ts", text: `export type Libro23b = LedgerState;` },
      { rel: "sombra23.ts", text: `
        import type { Libro23b } from "./tipos23b";
        export type Libro23b = { otra: number };
        export function delegadoSombra23(s: Libro23b): Libro23b { return s; }
      ` },
    ];
    const ayudantes = cosechaAyudantes20(files);
    assert.ok(!ayudantes.has("delegadoSombra23"),
      "el archivo declara su propio Libro23b (otra cosa): su declaración manda sobre la importada y el delegado no es ayudante");
  });
});
