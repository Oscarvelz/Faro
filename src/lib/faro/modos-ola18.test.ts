/**
 * FARO — OLA 18 DE PREJUICIOS contra los tres modos: la cura y sus pines.
 *
 * La ola cazó UN quiebre (BR18-1, Cambios) y diez hallazgos de cerca.
 * El quiebre: la entrada fantasma del commit abortado — toda receta de
 * la forma de tarjeta que abortaba (la línea de juicio de la cura 17,
 * la guarda del paquete, la re-pregunta de freshId, las preguntas de
 * existencia) devolvía el estado intacto, pero el envoltorio `commit()`
 * de reducer.ts anteponía igualmente la entrada de Actividad con el
 * nombre tecleado, subía la revisión y apilaba un fotograma de
 * Deshacer: la app se negaba a cometer la edición y a la vez dejaba
 * constancia de haberla cometido. Reproducido por la puerta forjada
 * (T2-c) y por la puerta real del toque en vuelo. La tarjeta nunca se
 * corrompía y la forma nunca mentía a la cara; el registro sí.
 *
 * La cura (§A): el envoltorio aprende la SEÑAL EXPLÍCITA de aborto —
 * `commitGuarded`, una segunda puerta de commit cuya receta devuelve
 * `null` (o, como red, su propio estado) y cuyo aborto no deja MARCO:
 * ni entrada, ni revisión, ni fotograma, ni sucio. Las recetas que
 * abortan con veredicto migran a esa puerta (commitDraft y
 * commitUpdate de la forma de tarjeta; savePlan, cuya pieza muerta
 * firmaba un plan que nunca aterrizó; restoreDue, cuya serie ausente
 * firmaba una restauración que no ocurrió). El commit ordinario
 * conserva su marco SIEMPRE — incluida la entrada deliberada y veraz
 * de la confirmación de modo que no aplicó (doctrina BR15-1), que es
 * la razón escrita de que el mecanismo sea señal y no detección.
 *
 * ENMIENDA OLA 19 (BR19-1): la ola 19 midió lo que esta exclusión no
 * juzgó — el MARCO del aborto de la confirmación. La entrada era
 * veraz y la exclusión acertó en ella; pero por la puerta ordinaria
 * el aborto también apilaba un fotograma idéntico y subía la revisión
 * (una mudanza costaba revisión +2 y el primer Deshacer se gastaba en
 * la entrada del aborto). La cura 19 separa la entrada del marco: la
 * confirmación pasa por una tercera puerta, `commitAnnounced`, que
 * conserva su entrada deliberada y su detalle-función intactos y cuyo
 * aborto no enmarca ni sube revisión. Los pines de la puerta nueva
 * viven en modos-ola19.test.ts; el pin de esta sección que clavaba la
 * NO migración queda enmendado en su sitio, y el pin del commit
 * ordinario (que sigue enmarcando el retorno intacto: el envoltorio
 * común sigue sin detectar) queda como estaba — lo que cambió es la
 * puerta de la confirmación, no el envoltorio.
 *
 * Las cercas de las demás familias viven donde viven sus censos:
 * la capa de nombres de la cáscara en modos-ola14 (Asesor), la
 * captura por cierre en modos-ola12 (Guardián G18-1), citaGobierna
 * a través de la llamada y §A-sexies en modos-ola9 (Cara G18-a/b,
 * X18-a/b, V18-b2 en el seguidor) y las fronteras de §B en
 * modos-ola11 (CARA18-B1/B2). Aquí se clava la puerta guardada.
 * Los libros son especímenes fijados a mano; jamás producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { blankSession, commit, commitGuarded } from "./reducer.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ═══════════ §A · BR18-1: ABORTAR SIN MARCO ═════════════════════
 * El espécimen de la caza, a nivel de envoltorio: la receta aborta
 * (devuelve null, o su propio estado como red) y la sesión vuelve
 * SIN la entrada fantasma, SIN la revisión subida y SIN el
 * fotograma de Deshacer que la .326 apilaba sobre cada aborto. */
describe("ola18 · §A: la puerta guardada — abortar sin marco (BR18-1)", () => {
  const base = () => blankSession(createInitial("es", "claro"));

  it("el aborto por null no deja marco: ni entrada, ni revisión, ni Deshacer, ni sucio", () => {
    const s0 = base();
    const out = commitGuarded(s0, () => null, "Wells Fargo Vuelta");
    assert.equal(out.ledger, s0.ledger, "el libro es el mismo objeto: nada se cometió");
    assert.equal(out.ledger.audit.length, s0.ledger.audit.length, "ninguna entrada de Actividad nace del aborto");
    assert.equal(out.ledger.revision, s0.ledger.revision, "la revisión no sube");
    assert.equal(out.past, s0.past, "ningún fotograma de Deshacer se apila");
    assert.equal(out.future, s0.future, "el futuro tampoco se toca");
    assert.equal(out.dirty, s0.dirty, "la bandera de sucio no se alza: nada hay que persistir");
    assert.notEqual(out, s0, "la carcasa de la sesión SÍ es nueva: el canal del veredicto (saveVerdict) despierta con el cambio de sesión y re-plantea su anuncio");
  });

  it("el aborto por identidad (la receta devuelve su propio estado) tampoco deja marco", () => {
    const s0 = base();
    const out = commitGuarded(s0, (s) => s, "Wells Fargo Vuelta");
    assert.equal(out.ledger, s0.ledger);
    assert.equal(out.past, s0.past);
    assert.equal(out.dirty, s0.dirty, "dentro de la puerta guardada, devolver tu entrada solo puede significar «nada que cometer»");
  });

  it("el guardado que SÍ aterriza escribe su entrada exactamente una vez, con su marco entero", () => {
    const s0 = base();
    const out = commitGuarded(s0, (s) => ({ ...s, settings: { ...s.settings, display: "USD" as const } }), "Wells Fargo Vuelta");
    assert.equal(out.ledger.audit.length, s0.ledger.audit.length + 1, "una sola entrada nueva");
    assert.equal(out.ledger.audit[0]!.detail, "Wells Fargo Vuelta", "y lleva el detalle del guardado");
    assert.equal(out.ledger.revision, s0.ledger.revision + 1, "la revisión sube una vez");
    assert.equal(out.past.length, s0.past.length + 1, "un solo fotograma de Deshacer");
    assert.equal(out.dirty, true, "y hay algo que persistir");
  });

  it("el commit ORDINARIO sigue enmarcando incluso el retorno intacto — la excepción deliberada queda clavada", () => {
    /* La confirmación de modo aborta devolviendo el estado intacto y
     * su entrada es deliberada y veraz: su detalle-función nombra la
     * no-aplicación (BR15-1). Si el envoltorio común detectara el
     * aborto por identidad, esa entrada moriría en silencio y la
     * doctrina de la ola 15 se desharía. Por eso la cura es una
     * puerta con señal, no detección en el envoltorio común. */
    const s0 = base();
    const out = commit(s0, (s) => s, "La confirmación no aplicó: el modo ya había cambiado");
    assert.equal(out.ledger.audit.length, s0.ledger.audit.length + 1, "el commit ordinario enmarca: la entrada deliberada del modo sigue naciendo");
    assert.equal(out.ledger.audit[0]!.detail, "La confirmación no aplicó: el modo ya había cambiado");
    assert.equal(out.past.length, s0.past.length + 1);
  });

  it("la fuente: la puerta guardada existe en el reducer con su aborto sin marco", () => {
    const r = SRC("./reducer.ts");
    assert.ok(r.includes("export function commitGuarded(session: Session, recipe: (s: LedgerState) => LedgerState | null, detail: string | (() => string)): Session {"),
      "la puerta tiene nombre y firma: la receta puede devolver null");
    assert.ok(r.includes("if (drafted === null || drafted === snap) return { ...session };"),
      "el aborto devuelve la sesión sin marco: la carcasa nueva despierta al veredicto; el libro, la pila y el sucio son los mismos objetos");
    assert.ok(r.includes("return frameCommit(session, snap, drafted, detail);"),
      "lo que aterriza comparte el marco EXACTO del commit ordinario: una sola forma de enmarcar en la casa");
  });

  it("la fuente: el proveedor expone la puerta guardada en su Api, junto al commit", () => {
    const p = SRC("../../components/faro/provider.tsx");
    assert.ok(p.includes("commitGuarded: (recipe: (s: LedgerState) => LedgerState | null, detail: string | (() => string)) => void;"),
      "la Api la declara con la misma firma del reducer");
    assert.ok(p.includes("commitGuarded as commitGuardedSession"), "y la importa del reducer, no la reinventa");
    assert.ok(p.includes("setSession((s) => (s ? commitGuardedSession(s, recipe, detail) : s));"),
      "su implementación es el mismo gesto que el commit ordinario, por la puerta nueva");
  });

  it("la fuente: las recetas de la forma de tarjeta cometen por la puerta guardada y abortan en null", () => {
    const src = SRC("../../components/faro/cards.tsx");
    const draft = src.slice(src.indexOf("const commitDraft"), src.indexOf("const proceedUpdate"));
    const upd = src.slice(src.indexOf("const commitUpdate"), src.indexOf("const proceedUpdate"));
    assert.ok(draft.includes("commitGuarded((s) => {"), "commitDraft comete por la puerta guardada");
    assert.ok(upd.includes("commitGuarded((s) => {"), "commitUpdate comete por la puerta guardada");
    assert.ok(!draft.includes("return s;") && !upd.includes("return s;"),
      "ningún aborto de las dos recetas devuelve ya el estado por la puerta ordinaria: el idioma del aborto es null");
    assert.ok(draft.includes("saveVerdict.current = { applied: false, existence }; return null; }"),
      "el veredicto sigue dejándose ANTES de abortar: el canal de la ola 15 no cambia, solo el marco");
    assert.ok(draft.includes("return st;") && upd.includes("return st;"),
      "y lo que aterriza sigue devolviendo su estado compuesto, como siempre");
  });

  it("la fuente: savePlan y restoreDue — los otros dos abortos con firma falsa — viajan por la puerta guardada", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    const plan = screens.slice(screens.indexOf("const savePlan"), screens.indexOf("const savePlan") + 1600);
    assert.ok(plan.includes("commitGuarded((s) => {"), "savePlan comete por la puerta guardada");
    assert.ok(plan.includes("if (!updated) return null;"), "la pieza que ya no vive aborta en null: su plan ya no firma un aterrizaje que no ocurrió");
    const arch = SRC("../../components/faro/archivo.tsx");
    const due = arch.slice(arch.indexOf("const restoreDue"), arch.indexOf("const restoreDue") + 900);
    /* ENMIENDA 1.3.339: la receta de restoreDue se mudó a la librería
     * (duefile.reactivateDueSeries) para que la carpeta de Cuotas de Debo
     * reanude con la MISMA mecánica; el pin sigue a la receta: restoreDue
     * comete por la puerta guardada delegando en ella, y es la receta la
     * que devuelve null cuando la serie ya no vive. */
    assert.ok(due.includes("commitGuarded((s) => reactivateDueSeries(s, row.seriesId)"), "restoreDue comete por la puerta guardada, con la mecánica única de duefile");
    const duefile = SRC("../../lib/faro/duefile.ts");
    const recipe = duefile.slice(duefile.indexOf("export function reactivateDueSeries"), duefile.indexOf("export function reactivateDueSeries") + 700);
    assert.ok(recipe.includes("return null;"), "la serie ausente aborta en null: la restauración que no ocurrió ya no deja entrada con el nombre de la fila");
  });

  it("la fuente: la confirmación de modo NO migra — su aborto con entrada veraz sigue en el commit ordinario [ENMIENDA OLA 19]", () => {
    /* ENMIENDA OLA 19 (BR19-1): este pin clavaba la exclusión entera
     * de la cura 18. La ola 19 la partió en sus dos mitades: la
     * ENTRADA sigue siendo deliberada y veraz (y este pin la sigue
     * clavando: el veredicto se deja igual y el detalle-función nombra
     * la no-aplicación igual), pero el MARCO ya no viaja por el commit
     * ordinario — la confirmación comete por `commitAnnounced`, la
     * puerta del aborto declarado, cuyo aborto escribe solo la
     * entrada: sin fotograma y sin subida de revisión. Lo que este
     * pin afirma ahora es la forma enmendada, no la vieja. */
    const screens = SRC("../../components/faro/screens.tsx");
    const seg = screens.slice(screens.indexOf("const applyModeConfirmed"), screens.indexOf("const applyModeConfirmed") + 2400);
    assert.ok(seg.includes("commitAnnounced((s) => {"), "applyModeConfirmed comete por la puerta del aborto declarado (ola 19): su entrada se conserva, su marco ya no miente");
    assert.ok(seg.includes("leaveVerdict({ verdict: \"already\", ctx }); return s; }"),
      "y su aborto sigue devolviendo el estado intacto y dejando su veredicto: su entrada («no aplicó») es deliberada y veraz (BR15-1), no la mentira de BR18-1");
    assert.ok(seg.includes("La confirmación no aplicó: el modo ya había cambiado"),
      "el detalle-función sigue nombrando la no-aplicación con las mismas palabras");
    assert.ok(!seg.includes("commitGuarded"), "la puerta guardada tampoco se le impone: su puerta es la del aborto declarado, que es otra señal");
  });
});
