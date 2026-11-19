/**
 * FARO — OLA 16 DE PREJUICIOS contra los tres modos: la cura y sus pines.
 *
 * La ola cazó dos quiebres (Cambios) y dieciséis hallazgos de cerca.
 * Los quiebres: el doble despacho de «Añadir tarjeta» forjaba DOS
 * tarjetas porque la receta del alta acuñaba el id DENTRO de sí misma
 * (BR16-1), y el fantasma planteado no vigilaba su premisa hacia
 * arriba — una tarjeta «destruida» que resucitaba por importación bajo
 * el anuncio dejaba a «Guardar como tarjeta nueva» forjar una
 * duplicada y al Descartar de la actualización perder una lectura que
 * ya tenía dónde caer (BR16-2). La cerca de Cambios: la rama `applied`
 * del efecto del veredicto anunciaba sin re-leer el estado vivo.
 * Las cercas viven en modos-ola9/11/12/14 (citaGobierna v2 y el
 * gobierno por mecanismo, el censo de composiciones sobre el árbol
 * entero, el seguidor de valores con sus grafías, archivar en las dos
 * direcciones, fusionar por proposición, el censo de la cáscara por
 * construcción, judgeExpr/judgeLiteral con resolución, el relé sin
 * tope, alias y barriles, y los módulos en el corpus de la §D); aquí
 * se clavan las caras de los quiebres y la conducta de la librería
 * que los sostiene.
 * Los libros son especímenes fijados a mano; jamás producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { addReading, addRewards, putCard, storedCards } from "./cards.ts";
import { createInitial } from "./defaults.ts";
import type { CreditCard, LedgerState } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

const card = (id: string, extra: Partial<CreditCard> = {}): CreditCard => ({
  id, name: `Tarjeta ${id}`, issuer: "", mark: "", color: "#079ed9", network: "", last4: "1234",
  currency: "USD", limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", snaps: [], ...extra,
} as CreditCard);

/* ═══════════ §A · CAMBIOS BR16-1: EL ID NACE CON EL BORRADOR ═══════
 * La receta del alta acuñaba el id dentro de sí misma
 * (liveCard ?? { id: uid(), … }): un doble despacho de la misma tanda
 * — el guardián despacha el commit dos veces — paría dos tarjetas
 * gemelas, cada una con su copia de las lecturas. La cura: el id nace
 * con el BORRADOR (un useState por formulario, aparcado con él), la
 * receta hace upsert sobre ese id, y la librería — putCard por id,
 * addReading/addRewards con su dedup de la última lectura idéntica —
 * hace que el segundo despacho de la tanda sea un no-op: la tanda
 * pare UNA tarjeta. */
describe("ola16 · §A: el id de la tarjeta nueva nace con el borrador (BR16-1)", () => {
  const batch = (s: LedgerState, bornId: string): LedgerState => {
    let out = putCard(s, card(bornId, { name: "Wells Fargo" }));
    out = addReading(out, bornId, { balanceMinor: 500_00, src: "manual" }, "2026-11-10", "2026-11-10T10:00:00.000Z");
    out = addRewards(out, bornId, { amountMinor: 25_00, src: "manual" }, "2026-11-10", "2026-11-10T10:00:00.000Z");
    return out;
  };

  it("el doble despacho de la MISMA tanda pare UNA tarjeta, con sus lecturas una sola vez", () => {
    let s = createInitial("es", "claro");
    s = batch(s, "cc-nacida-1");
    s = batch(s, "cc-nacida-1"); // el guardián despacha el commit otra vez, con el mismo borrador
    const born = storedCards(s).filter((c) => c.id === "cc-nacida-1");
    assert.equal(born.length, 1, "una tanda, un id, una tarjeta: el upsert por id no forja la gemela");
    assert.equal(born[0]!.snaps.length, 1, "la lectura de la tanda cae una vez (dedup de la librería)");
    assert.equal((born[0]!.rw ?? []).length, 1, "la lectura de recompensas, también una vez");
  });

  it("la fuente: el id nace en el estado del formulario y viaja en el aparcamiento", () => {
    const src = SRC("../../components/faro/cards.tsx");
    assert.ok(src.includes("const [bornNewId] = useState(() => restored?.newId ?? uid());"),
      "el id se acuña una vez por borrador, al nacer el formulario — y el aparcamiento lo restaura");
    assert.ok(src.includes("parkFlow(parkKey, { d, born, newId: bornNewId })"),
      "el id viaja en el aparcamiento: el borrador restaurado conserva SU id");
  });

  it("la fuente: la receta del alta hace upsert sobre el id del borrador y no acuña otro", () => {
    const src = SRC("../../components/faro/cards.tsx");
    const seg = src.slice(src.indexOf("const commitDraft"), src.indexOf("const proceed ="));
    assert.ok(seg.includes("storedCards(s).find((c) => c.id === bornNewId)"),
      "el commit busca primero la tarjeta que ESTA tanda ya parió");
    assert.ok(seg.includes("id: bornNewId, currency: \"USD\" as Currency, snaps: []"),
      "la candidata nace sobre el id del borrador");
    assert.ok(!/id: uid\(\)/.test(seg), "la receta ya no acuña: ningún uid() en la candidata del commit");
  });
});

/* ═══════════ §B · CAMBIOS BR16-2: EL FANTASMA VIGILA SU PREMISA ═════
 * El fantasma planteado («esta tarjeta ya no existe») miraba su
 * premisa solo hacia abajo: si la tarjeta resucitaba por importación
 * bajo el anuncio, el anuncio quedaba mintiendo y sus salidas
 * actuaban sobre el mundo viejo — freshId forjaba una duplicada de
 * una tarjeta viva con el mismo bornId, y el Descartar de la
 * actualización perdía una lectura que ya tenía dónde caer. La cura:
 * el fantasma (edición y actualización) vigila su premisa en los dos
 * sentidos, como los diálogos de modo desde la ola 10 — si la
 * existencia viva cambia, el anuncio se retira o se re-plantea con el
 * estado fresco — y TODA salida re-pregunta cardExistence dentro de
 * su propio commit, freshId incluida. */
describe("ola16 · §B: el fantasma planteado vigila su premisa en los dos sentidos (BR16-2)", () => {
  const src = SRC("../../components/faro/cards.tsx");

  it("la fuente: el vigilante re-pregunta la existencia viva y retira o re-plantea el anuncio", () => {
    assert.ok(src.includes("const ex = cardExistence(session.ledger, bornId);"),
      "el vigilante pregunta a la librería por el estado vivo, no por la foto del planteamiento");
    /* ENMIENDA REPARACIÓN AB-2.4: la primera forma retiraba el anuncio
     * ante cualquier subida a viva — y la re-corrida en vivo cazó que
     * eso borraba la salida del anuncio de ARCHIVADA antes del toque
     * (su mitad «guardar» quedaba sin cumplir sobre una tarjeta que la
     * llegada ya había restaurado). El pin sigue la forma convertida:
     * archivada convierte, destruida se retira. */
    assert.ok(src.includes("if (posed === \"archived\") { if (upd) setUpdGhost(\"back\"); else setGhost(\"back\"); }"),
      "si la premisa del anuncio de archivada sube a viva, el anuncio CONVIERTE a «back»: la llegada ya restauró la tarjeta y queda la mitad guardar");
    assert.ok(src.includes("else if (posed === \"gone\") { if (upd) setUpdGhost(null); else setGhost(null); }"),
      "la retirada al subir queda solo para el anuncio de destruida: no tiene mitad restaurar que convertir");
    assert.ok(!src.includes("if (ex === \"alive\") { if (upd) setUpdGhost(null); else setGhost(null); }"),
      "la retirada uniforme de la primera forma no vuelve: era la que varaba lo tecleado del AB-2.4");
    assert.ok(src.includes("else if (ex !== posed) { if (upd) setUpdGhost(ex); else setGhost(ex); }"),
      "si el estado cambió a otro, el anuncio se re-plantea con el estado fresco — el convertido incluido: sigue vigilado");
  });

  it("la fuente: el anuncio convertido existe en las dos rutas, con su salida de guardar sobre el mismo ancla y sin mentir el Archivo", () => {
    const backEdit = src.slice(src.indexOf("{ghost === \"back\""), src.indexOf("{ghost === \"back\"") + 1200);
    assert.ok(backEdit.includes("data-anchor=\"card-form-restore-save\" onClick={proceedRestore}"),
      "la edición convertida guarda por la salida de siempre y el mismo ancla que el banco toca");
    assert.ok(!backEdit.includes("vive en el Archivo") && !backEdit.includes("lives in the Archive"),
      "el anuncio convertido no afirma el Archivo como estado presente: la tarjeta ya vive otra vez");
    const backUpd = src.slice(src.indexOf("updGhost === \"back\""), src.indexOf("updGhost === \"back\"") + 1200);
    assert.ok(backUpd.includes("data-anchor=\"card-form-restore-save\" onClick={proceedBack}"),
      "la actualización convertida guarda por su salida propia, sobre el mismo ancla");
    assert.ok(src.includes("const proceedBack = () => { setUpdGhost(null); commitUpdate(false); };"),
      "la salida convertida de la actualización cae por la ruta ordinaria: el commit re-pregunta y la lectura aterriza sobre el registro vivo");
  });

  it("la fuente: la bisagra de la conversión vive en los dos commits — con la palabra dada, el registro vivo o archivado compone", () => {
    const draft = src.slice(src.indexOf("const commitDraft"), src.indexOf("const proceed ="));
    assert.ok(draft.includes("if (existence === \"archived\" && !unarchive) { saveVerdict.current = { applied: false, existence }; return s; }"),
      "en el commit de la edición, el archivado solo aborta SIN la palabra de restaurar: con ella — o ya viva — compone sobre el registro vivo");
    const upd = src.slice(src.indexOf("const commitUpdate"), src.indexOf("const proceedUpdate"));
    assert.ok(upd.includes("if (existence === \"archived\" && !unarchive) { saveVerdict.current = { applied: false, existence }; return s; }"),
      "la misma bisagra en el commit de la actualización: la palabra convierte, la premisa subida no vara la lectura");
  });

  it("la fuente: la salida freshId re-pregunta dentro de su propio commit, ANTES de la pregunta asentada", () => {
    const seg = src.slice(src.indexOf("const commitDraft"), src.indexOf("const proceed ="));
    assert.ok(seg.includes("const freshAsked = freshId ? cardExistence(s, bornId) : null;"),
      "«Guardar como tarjeta nueva» pregunta la existencia dentro del commit, no la del planteamiento");
    assert.ok(seg.includes("if (freshAsked && freshAsked !== \"gone\") { saveVerdict.current = { applied: false, existence: freshAsked }; return s; }"),
      "si la tarjeta volvió (viva o archivada), la salida no forja: devuelve el veredicto del estado fresco");
    assert.ok(seg.indexOf("const freshAsked") < seg.indexOf("if (existence === \"gone\")"),
      "la re-pregunta de freshId va ANTES de la pregunta asentada de la ola 14: el orden es la cura");
  });
});

/* ═══════════ §C · LA CERCA DE CAMBIOS: `applied` RE-LEE ═════════════
 * La rama `applied` del efecto del veredicto era la única consumidora
 * que no re-leía el estado vivo antes de anunciar (moved y recount sí
 * lo hacían): un anuncio de subida/bajada podía salir sobre un libro
 * cuyo modo ya no era el del contexto. La cura, de una línea: la rama
 * re-lee el modo vivo y calla si ya no es el suyo. */
describe("ola16 · §C: la rama applied del veredicto re-lee el estado vivo antes de anunciar", () => {
  it("la fuente: el anuncio solo sale si el modo vivo sigue siendo el del contexto", () => {
    const src = SRC("../../components/faro/screens.tsx");
    const seg = src.slice(src.indexOf("if (v.verdict === \"applied\")"), src.indexOf("if (v.verdict === \"applied\")") + 700);
    assert.ok(seg.includes("if (modeOf(session.ledger.settings) !== ctx.target) return;"),
      "la rama applied re-lee el modo del libro vivo antes de anunciar, como moved/recount");
    assert.ok(seg.indexOf("modeOf(session.ledger.settings)") < seg.indexOf("announceUp"),
      "la re-lectura precede a cualquier anuncio de la rama");
  });
});
