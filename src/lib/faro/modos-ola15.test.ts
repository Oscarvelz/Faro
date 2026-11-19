/**
 * FARO — OLA 15 DE PREJUICIOS contra los tres modos: la cura y sus pines.
 *
 * La ola cazó tres quiebres y una familia de cercas que certificaban la
 * forma sin mirar el cuerpo. El Guardián: la actualización manual de
 * tarjeta era la única ruta de guardado que nunca preguntaba la
 * existencia (G15-2 — tragaba lo tecleado si la tarjeta murió y la
 * DESARCHIVABA en silencio si vivía archivada, por el efecto lateral de
 * addReading/addRewards en la librería) y el aborto dentro de
 * commitDraft cerraba en silencio destruyendo el borrador aparcado
 * (G15-3 — la segunda respuesta de cardExistence no tenía canal de
 * vuelta). Cambios: el doble despacho de confirmar pisaba el veredicto
 * de su propia tanda (BR15-1 — la ranura era de última escritura y el
 * registro afirmaba «no aplicó» sobre un aterrizaje aplicado). Las
 * cercas: el censo de la cáscara cazaba por enumeración de archivos y
 * de forma de llamada (Asesor); el censo de parches certificaba la
 * LLAMADA a patchLineWith, no la función entregada (G15-1); dos
 * disfraces de una línea derrotan las firmas de conducta (G15-4); la
 * doctrina se ataba a la cuerda del nombre y no al nodo (G15-5); y el
 * censo de superficies verificaba la cita, no el gobierno (Cara
 * S1/S2/S3), con las dos familias disciplinadas de la §B escapando por
 * la ventana de su propia cláusula (Cara B1). Las cercas viven en
 * modos-ola9/11/12/14; aquí se clavan las caras curadas y los
 * especímenes de las cercas nuevas.
 * Los libros son especímenes fijados a mano; jamás producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { addReading, addRewards, cardExistence, dropCard, putCard, restoreCard, storedCards } from "./cards.ts";
import { createInitial } from "./defaults.ts";
import type { CreditCard, LedgerState } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

const card = (id: string, extra: Partial<CreditCard> = {}): CreditCard => ({
  id, name: `Tarjeta ${id}`, issuer: "", mark: "", color: "#079ed9", network: "", last4: "1234",
  currency: "USD", limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", snaps: [], ...extra,
} as CreditCard);
const snap = (balanceMinor: number) => ({ on: "2026-11-01", at: "2026-11-01T10:00:00.000Z", balanceMinor, src: "manual" } as CreditCard["snaps"][number]);

/* ═══════════ §A · GUARDIÁN G15-2: LA ACTUALIZACIÓN PREGUNTA ═════════
 * La observación marginal de la cura 14 reprodujo con espécimen: la
 * rama upd de CardForm cometía addReading/addRewards contra el id del
 * prop sin preguntar la existencia — y la librería desarchivaba por
 * efecto lateral. La cura: la pregunta única en save() y en el commit
 * (fuente, abajo), y la raíz en la librería — una lectura NUNCA limpia
 * `archived`; desarchivar solo por sus puertas nombradas. */
describe("ola15 · §A: la actualización manual pregunta la existencia (G15-2)", () => {
  const bookWith = (c: CreditCard): LedgerState => putCard(createInitial("es", "claro"), c);

  it("la lectura sobre una tarjeta ARCHIVADA cae en el Archivo y la tarjeta se queda archivada", () => {
    let s = bookWith(card("cc-1", { snaps: [snap(100_00)] }));
    s = dropCard(s, "cc-1"); // con historial: archiva
    assert.equal(cardExistence(s, "cc-1"), "archived", "el hecho: vive archivada");
    const after = addReading(s, "cc-1", { balanceMinor: 250_00, src: "manual" }, "2026-11-10", "2026-11-10T10:00:00.000Z");
    const stored = storedCards(after).find((c) => c.id === "cc-1")!;
    assert.equal(stored.snaps.length, 2, "la lectura aterriza: el historial del Archivo crece");
    assert.equal(stored.archived, true, "y la tarjeta NO resucita: una lectura no desarchiva");
    assert.equal(cardExistence(after, "cc-1"), "archived");
  });

  it("la lectura de recompensas sobre una archivada tampoco la desarchiva", () => {
    let s = bookWith(card("cc-2", { snaps: [snap(100_00)] }));
    s = dropCard(s, "cc-2");
    const after = addRewards(s, "cc-2", { amountMinor: 40_00, src: "manual" }, "2026-11-10", "2026-11-10T10:00:00.000Z");
    const stored = storedCards(after).find((c) => c.id === "cc-2")!;
    assert.equal((stored.rw ?? []).length, 1, "la lectura de recompensas aterriza");
    assert.equal(stored.archived, true, "y la tarjeta sigue archivada");
  });

  it("la lectura sobre una tarjeta que ya no existe devuelve el mismo estado (control)", () => {
    const s = bookWith(card("cc-3"));
    assert.equal(addReading(s, "cc-nunca", { balanceMinor: 1_00, src: "manual" }), s, "sin registro: el mismo estado, referencia idéntica");
    assert.equal(addRewards(s, "cc-nunca", { amountMinor: 1_00, src: "manual" }), s);
  });

  it("desarchivar viaja por su puerta nombrada: restoreCard la trae de vuelta, con su historial", () => {
    let s = bookWith(card("cc-4", { snaps: [snap(100_00)] }));
    s = dropCard(s, "cc-4");
    s = addReading(s, "cc-4", { balanceMinor: 300_00, src: "manual" }, "2026-11-10", "2026-11-10T10:00:00.000Z");
    const back = restoreCard(s, "cc-4");
    const stored = storedCards(back).find((c) => c.id === "cc-4")!;
    assert.equal(stored.archived, undefined, "restoreCard — y solo restoreCard — la desarchiva");
    assert.equal(stored.snaps.length, 2, "con la lectura que cayó en el Archivo incluida");
    assert.equal(cardExistence(back, "cc-4"), "alive");
  });

  it("la fuente: addReading/addRewards ya no escriben `archived: undefined`; las puertas nombradas lo conservan", () => {
    const lib = SRC("./cards.ts");
    const segReading = lib.slice(lib.indexOf("export function addReading"), lib.indexOf("export function payCard"));
    const segRewards = lib.slice(lib.indexOf("export function addRewards"), lib.indexOf("export function redeemRewards"));
    assert.ok(!segReading.includes("archived: undefined"), "addReading conserva el archived que el registro trae");
    assert.ok(!segRewards.includes("archived: undefined"), "addRewards conserva el archived que el registro trae");
    const segRestore = lib.slice(lib.indexOf("export function restoreCard"), lib.indexOf("export function restorePresets"));
    assert.ok(segRestore.includes("archived: undefined"), "restoreCard sigue siendo la puerta que lo limpia");
  });

  it("la fuente: la ruta de actualización pregunta en save() y dentro de su commit, con su anuncio y su salida", () => {
    const src = SRC("../../components/faro/cards.tsx");
    const seg = src.slice(src.indexOf("function CardForm"), src.indexOf("const ISS"));
    assert.match(seg, /const commitUpdate = \(unarchive: boolean\)/, "la actualización vive en su propia ruta de commit");
    const upd = seg.slice(seg.indexOf("const commitUpdate"), seg.indexOf("const proceed ="));
    assert.match(upd, /cardExistence\(s, bornId\)/, "el commit de la actualización pregunta dentro de su actualizador");
    assert.match(upd, /restoreCard\(s, bornId as string\)/, "lo archivado se restaura por su puerta nombrada dentro del mismo commit");
    assert.match(seg, /if \(!card\) \{\s+const ex = cardExistence\(session\?\.ledger, bornId\);/, "save() pregunta al libro cuando el prop ya cuenta la historia");
    assert.match(seg, /setUpdGhost\(ex\)/, "y anuncia el estado en vez de quedar muerto y mudo");
    assert.ok(seg.includes("se archivó mientras la actualizabas"), "el anuncio de la actualización dice su verdad en ES");
    assert.ok(seg.includes("was archived while you were updating it"), "y en EN");
    assert.ok(seg.includes("ya no existe: se borró mientras la actualizabas"), "el fantasma de la actualización, en ES");
  });
});

/* ═══════════ §B · GUARDIÁN G15-3: EL ABORTO RE-ANUNCIA ══════════════
 * La existencia se pregunta dos veces con la misma función — en save()
 * para anunciar y dentro del commit para componer — y el commit manda
 * en la escritura. Cuando la segunda respuesta disentía, el updater
 * devolvía el estado intacto y commitDraft cerraba sin condición:
 * clearFlow destruía el aparcado bajo un anuncio que prometía «lo que
 * tecleaste sigue aquí». La cura: el veredicto viaja por el canal de la
 * cura BR14-1 y un efecto anuncia el estado nuevo; la forma no se
 * cierra ni pierde su aparcado cuando el commit abortó. */
describe("ola15 · §B: el aborto dentro del commit re-anuncia, no cierra en silencio (G15-3)", () => {
  const src = SRC("../../components/faro/cards.tsx");
  const seg = src.slice(src.indexOf("function CardForm"), src.indexOf("const ISS"));

  it("toda receta de guardado deja su veredicto: aplicado o el estado que la detuvo", () => {
    assert.match(seg, /const saveVerdict = useRef<\{ applied: boolean; existence: CardExistence \} \| null>\(null\);/, "el canal del veredicto existe en la forma");
    const draft = seg.slice(seg.indexOf("const commitDraft"), seg.indexOf("const commitUpdate"));
    assert.match(draft, /saveVerdict\.current = \{ applied: false, existence \}/, "el aborto de commitDraft deja su veredicto con el estado leído");
    assert.match(draft, /saveVerdict\.current = \{ applied: true, existence \}/, "y la aplicación también lo deja");
  });

  it("commitDraft ya no cierra sin condición: el cierre es consecuencia del veredicto", () => {
    const draft = seg.slice(seg.indexOf("const commitDraft"), seg.indexOf("const commitUpdate"));
    assert.ok(!/\n\s+close\(\);\n/.test(draft), "ningún close() incondicional tras el commit: cerrar es del efecto, al aplicarse");
    assert.match(seg, /if \(v\.applied\) \{ close\(\); return; \}/, "el efecto cierra solo cuando el veredicto dice aplicado");
    assert.match(seg, /if \(upd\) setUpdGhost\(ex\); else setGhost\(ex\);/, "y cuando abortó, re-anuncia con el estado nuevo — la forma y su aparcado quedan");
  });
});

/* ═══════════ §C · CAMBIOS BR15-1: LA VERDAD MÁS FUERTE DE LA TANDA ══
 * El veredicto de applyModeConfirmed vivía en una sola ranura y cada
 * receta la sobrescribía sin leerla: dos despachos de confirmar en la
 * misma tarea dejaban la primera aplicada y la segunda en silencio —
 * el aterrizaje confirmado aterrizaba sin letrero y el registro de
 * actividad afirmaba «La confirmación no aplicó» sobre la entrada de
 * la mudanza que sí aplicó. La cura: la ranura no se degrada — una
 * receta solo sobrescribe un veredicto más débil, y el detalle de
 * actividad, que lee la misma ranura, jamás escribe «no aplicó» de
 * una tanda que aplicó. */
describe("ola15 · §C: el veredicto de una confirmación es la verdad más fuerte de su tanda (BR15-1)", () => {
  const src = SRC("../../components/faro/screens.tsx");
  const seg = src.slice(src.indexOf("const confirmVerdict"), src.indexOf("const pickMode"));

  it("las cuatro salidas de la receta dejan su veredicto por leaveVerdict, no por escritura directa", () => {
    assert.equal((seg.match(/leaveVerdict\(\{ verdict:/g) ?? []).length, 4, "already, moved, recount y applied pasan por la ranura que no se degrada");
    assert.ok(!/confirmVerdict\.current = \{ verdict:/.test(seg), "ninguna receta pisa la ranura sin leerla");
  });

  it("la ranura solo se sobrescribe con un veredicto más fuerte: applied jamás degrada", () => {
    assert.match(seg, /VERDICT_RANK\[v\.verdict\] > VERDICT_RANK\[cur\.verdict\]/, "la escritura compara fuerzas antes de pisar");
    assert.match(seg, /\{ applied: 3, recount: 2, moved: 2, already: 1 \}/, "el orden de fuerzas: lo aplicado manda; el silencio del already es lo más débil");
  });

  it("el detalle de actividad lee la ranura de la tanda: «no aplicó» solo si la tanda no aplicó", () => {
    assert.match(seg, /confirmVerdict\.current\?\.verdict === "applied" \? ctx\.target/, "el detalle nombra el aterrizaje cuando la tanda aplicó — incluida la receta hermana que llegó segunda");
  });
});
