/**
 * FARO — OLA 17 DE PREJUICIOS contra los tres modos: la cura y sus pines.
 *
 * La ola cazó UN quiebre (G17-1, Guardián) y diecinueve hallazgos de
 * cerca. El quiebre: «Guardar como tarjeta nueva» del anuncio de
 * ARCHIVADA moría muda en la .325 — la re-pregunta de freshId de la
 * cura 16 abortaba ante cualquier existencia ≠ "gone", incluida
 * "archived", la premisa misma de ese anuncio, cuya salida promete
 * «la archivada se queda… tendrás las dos». Era la segunda
 * sobre-corrección de la cura 16 en la familia del fantasma (tras
 * AB-2.4, cazada por su propio banco en vivo). La cura juzga el
 * MOVIMIENTO, no el estado: la salida procede cuando la existencia
 * viva es la que el anuncio que la ofreció declaró, y re-plantea
 * solo cuando el mundo se movió de lo declarado.
 * El hallazgo de Cambios: la clase forjada de la ola 16 alcanzaba
 * también al anuncio CONVERTIDO — su salida componía contra la foto
 * de la sesión y ganaba la carrera de la revisión contra un paquete
 * almacenado más fresco que ya había archivado la tarjeta en otra
 * pestaña: el archivado ajeno se perdía en silencio. La cura: la
 * salida convertida (edición y actualización) re-pregunta contra el
 * paquete almacenado cuando su revisión va por delante.
 * Las cercas de las demás familias viven en modos-ola9/11/12/14
 * (citaGobierna por flujo, el censo sobre el árbol de src, el
 * seguidor con mapeadores de librería, las fronteras adversativas
 * de archivar, fusionar a dos proposiciones, el censo de la cáscara
 * por paquete, los parches por resultado de llamada y por acceso a
 * miembro, y los títulos de capítulo del guion en el corpus de la
 * §D); aquí se clavan las caras del fantasma.
 * Los libros son especímenes fijados a mano; jamás producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ═══════════ §A · GUARDIÁN G17-1: LA RE-PREGUNTA JUZGA EL MOVIMIENTO ═
 * El espécimen E1 de guard17-estados, clavado como banco: anuncio de
 * archivada planteado, existencia viva "archived" (su premisa, sin
 * movimiento), toque en «Guardar como tarjeta nueva» — en la .325 el
 * veredicto re-planteaba el mismo anuncio y el toque moría mudo,
 * para siempre. La cura captura lo declarado al toque y la receta
 * compara contra eso. */
describe("ola17 · §A: «Guardar como tarjeta nueva» procede sobre lo declarado (G17-1)", () => {
  const src = SRC("../../components/faro/cards.tsx");
  const seg = src.slice(src.indexOf("const commitDraft"), src.indexOf("const proceedUpdate"));

  it("la fuente: saveAsNew captura el estado que el anuncio planteado declaró, al toque", () => {
    assert.ok(src.includes("const saveAsNew = () => { const declared = ghost === \"gone\" || ghost === \"archived\" ? ghost : null; setGhost(null); proceed(true, declared); };"),
      "lo declarado nace del anuncio vivo (gone o archived) en el momento del toque, no de una foto anterior");
  });

  it("la fuente: proceed lleva lo declarado hasta la receta", () => {
    assert.ok(src.includes("const proceed = (freshId: boolean, declared: CardExistence | null = null) => commitDraft(freshId, false, declared);"),
      "la declaración viaja por la misma puerta que freshId, con null como ausencia");
    assert.ok(seg.includes("const commitDraft = (freshId: boolean, unarchive: boolean, declared: CardExistence | null = null, converted = false)"),
      "la receta recibe lo declarado (y la marca de convertida de la §B) como parámetros nombrados");
  });

  it("la fuente: la re-pregunta compara contra lo declarado — el estado a secas ya no condena", () => {
    /* ENMIENDA OLA 18 (BR18-1): el aborto devuelve null por la puerta
     * GUARDADA (commitGuarded) — la comparación contra lo declarado,
     * que es lo que este pin clava, no cambia; el marco del aborto sí:
     * ya no escribe la entrada del guardado que no aterrizó. */
    assert.ok(seg.includes("if (freshAsked && freshAsked !== (declared ?? \"gone\")) { saveVerdict.current = { applied: false, existence: freshAsked }; return null; }"),
      "archived declarado y archived vivo procede: la nueva nace por upsert y la archivada no se toca");
    assert.ok(!seg.includes("freshAsked !== \"gone\""),
      "la forma absoluta de la ola 16 no vuelve: era la que mataba la salida del anuncio de archivada");
    assert.ok(seg.indexOf("const freshAsked") < seg.indexOf("if (existence === \"gone\")"),
      "la re-pregunta sigue yendo ANTES de la pregunta asentada de la ola 14 (pin heredado de la 16)");
  });

  it("la fuente: el anuncio de archivada sigue ofreciendo la salida, con su promesa entera", () => {
    const arch = src.slice(src.indexOf("{ghost === \"archived\""), src.indexOf("{ghost === \"archived\"") + 1400);
    assert.ok(arch.includes("data-anchor=\"card-form-save-new\" onClick={saveAsNew}"),
      "«Guardar como tarjeta nueva» sigue en el anuncio de archivada, sobre su ancla");
    assert.ok(arch.includes("la archivada se queda en el Archivo: tendrás las dos"),
      "y su texto sigue prometiendo las dos: la cura hace verdadera la promesa, no la retira");
  });
});

/* ═══════════ §B · CAMBIOS: LA CONVERTIDA RE-PREGUNTA AL PAQUETE ═════
 * El espécimen forjado T2-c de la ola 17, clavado como banco:
 * anuncio convertido planteado (la tarjeta volvió en la sesión),
 * otra pestaña re-archiva y escribe su paquete (revisión mayor) y
 * el evento de storage se despacha a mano — sin adopción — y el
 * toque en «Guardarla» ganaba la carrera de la revisión: el
 * archivado ajeno se perdía. La cura re-pregunta la existencia
 * contra el paquete almacenado fresco dentro del propio commit de
 * las dos salidas convertidas.
 * REPARACIÓN (la misma ola, tras el cierre en vivo): el banco
 * T2c.2 siguió rojo contra la primera forma — el evento forjado
 * SÍ dispara la adopción (el listener adopta si la pestaña está
 * limpia) y la adopción se encola ANTES que el commit, así que al
 * componer la sesión ya es el paquete y la brecha de revisión de
 * la guarda se cierra sola. La forma final juzga la PREMISA de la
 * salida convertida contra el estado del commit — el más fresco
 * que la pestaña puede conocer, adopción incluida: «Guardarla»
 * prometió caer sobre la tarjeta viva, y si al cometer ya no
 * vive, la receta aborta y el anuncio verdadero se re-plantea.
 * La guarda del paquete queda como primera puerta (el paquete
 * por delante de una sesión que no adoptó).
 * ENMIENDA OLA 26 (Q26-C1): la caza de la ola 26 midió el
 * intercalado que esta forma no cubría — la adopción aterriza
 * DURANTE el commit, entre el juicio de la premisa y la escritura,
 * y la salida firmó OTRA (espécimen J2.1). La guarda del paquete
 * pierde su compuerta de revisión y juzga siempre: es la primera
 * puerta y ya no pide que el paquete vaya por delante. */
describe("ola17 · §B: la salida convertida re-pregunta contra el paquete almacenado (Cambios)", () => {
  const src = SRC("../../components/faro/cards.tsx");

  it("la fuente: la pregunta al paquete existe y es la misma pregunta de la casa", () => {
    assert.ok(src.includes("const storedPackExistence = (userId: string, id: string | undefined): { ex: CardExistence; revision: number } | null => {"),
      "la lectura del paquete vive junto a la forma, con la revisión que leyó");
    assert.ok(src.includes("localStorage.getItem(`faro.pack.${userId}`)"),
      "lee la llave del provider (faro.pack.<userId>), la que packKey escribe");
    assert.ok(src.includes("return { ex: cardExistence(ledger, id), revision: ledger.revision };"),
      "y juzga con cardExistence — la única pregunta de existencia de la casa — sobre el libro almacenado");
    assert.ok(src.includes("if (!ledger || typeof ledger.revision !== \"number\") return null;"),
      "sin libro o sin revisión numérica no hay respuesta: la salida cae a la pregunta de la sesión");
  });

  it("la fuente: las dos salidas convertidas llevan la marca, y solo ellas", () => {
    assert.ok(src.includes("const proceedBack = () => { setUpdGhost(null); commitUpdate(false, true); };"),
      "la convertida de la actualización entra a su commit marcada");
    assert.ok(src.includes("const proceedRestore = () => { const converted = ghost === \"back\"; setGhost(null); commitDraft(false, true, null, converted); };"),
      "la de la edición captura la marca del anuncio vivo: «back» marca, el anuncio de archivada no");
    assert.ok(src.includes("const proceedUpdate = () => { setUpdGhost(null); commitUpdate(true); };"),
      "la salida de restaurarla de la actualización no se marca: su palabra ya re-pregunta en su commit");
  });

  it("la fuente: los dos commits abortan contra el paquete que dice no-viva antes de componer", () => {
    /* ENMIENDA OLA 18 (BR18-1): la guarda es la misma y aborta en el
     * mismo sitio; el aborto devuelve null por la puerta guardada y no
     * deja el marco que BR18-1 cazó (entrada, revisión, Deshacer).
     * ENMIENDA OLA 26 (Q26-C1): la compuerta de revisión MUERE. La
     * guarda vieja solo abortaba si el paquete iba POR DELANTE en
     * revisión, y la carrera medida en la ola 26 (espécimen J2.1 de
     * Cambios: la primera firma OTRA en seis olas de su banco)
     * aterriza en la rendija — la adopción de la llegada cae durante
     * el commit, la brecha de revisión se cierra sola y la guarda
     * callaba justo en su ventana: la edición aterrizó sobre la
     * tarjeta ya archivada. Desde la cura, la salida convertida
     * re-juzga la existencia contra el paquete almacenado SIEMPRE
     * que el paquete exista y diga otra cosa que «viva», digan lo
     * que digan los sellos; la pregunta de la sesión sigue como
     * segundo juez. El título de este test se enmienda con la misma
     * razón: ya no es «el paquete por delante» — es el paquete. */
    const gate = "if (stored && stored.ex !== \"alive\") { saveVerdict.current = { applied: false, existence: stored.ex }; return null; }";
    const draft = src.slice(src.indexOf("const commitDraft"), src.indexOf("const proceedUpdate"));
    assert.ok(draft.includes(gate), "el commit de la edición re-pregunta al paquete: si el paquete dice que ya no vive → veredicto con la verdad del paquete");
    assert.ok(draft.indexOf("storedPackExistence(userId, bornId)") < draft.indexOf("const freshAsked"),
      "la pregunta al paquete precede a toda composición de la receta");
    const upd = src.slice(src.indexOf("const commitUpdate"), src.indexOf("const proceedUpdate"));
    assert.ok(upd.includes(gate), "el commit de la actualización re-pregunta al paquete con la misma guarda");
    assert.ok(upd.indexOf("storedPackExistence(userId, bornId)") < upd.indexOf("const existence = cardExistence(s, bornId);"),
      "y precede incluso a su pregunta de sesión: el paquete fresco manda primero");
  });

  it("la fuente (reparación): la convertida de la edición juzga su premisa contra el estado del commit", () => {
    const draft = src.slice(src.indexOf("const commitDraft"), src.indexOf("const proceedUpdate"));
    const premise = "if (converted && existence !== \"alive\") { saveVerdict.current = { applied: false, existence }; return null; }";
    assert.ok(draft.includes(premise),
      "«Guardarla» prometió la tarjeta viva: archivada otra vez o ida al cometer → aborta y el veredicto re-plantea el anuncio verdadero (T2c.2 verde en vivo)");
    assert.ok(draft.indexOf("storedPackExistence(userId, bornId)") < draft.indexOf(premise) && draft.indexOf(premise) < draft.indexOf("const storedCard"),
      "la premisa se juzga tras la guarda del paquete y la pregunta de existencia, antes de componer sobre registro alguno");
    assert.ok(draft.includes("if (existence === \"archived\" && !unarchive) { saveVerdict.current = { applied: false, existence }; return null; }"),
      "la salida NO convertida del anuncio de archivada conserva su forma de siempre: restaurarla sigue procediendo sobre la archivada — la premisa es solo de la convertida");
  });

  it("la fuente (reparación): la convertida de la actualización no necesita la línea — viaja por la ruta ordinaria", () => {
    const upd = src.slice(src.indexOf("const commitUpdate"), src.indexOf("const proceedUpdate"));
    assert.ok(!upd.includes("converted && existence"),
      "commitUpdate no lleva la guarda de premisa: su convertida entra con unarchive=false y las preguntas de siempre ya abortan ante archivada o ida — la asimetría es deliberada y queda escrita");
    assert.ok(upd.includes("if (existence === \"archived\" && !unarchive) { saveVerdict.current = { applied: false, existence }; return null; }"),
      "su pregunta asentada sigue en su sitio: es la que guarda la premisa de su convertida");
  });
});
