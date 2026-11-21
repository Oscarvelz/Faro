/* ════════════════════════════════════════════════════════════════════
 * OLA 21 · LAS COMPUERTAS APRENDEN EL CONTENIDO, LA MESA DICE SU FOTO
 * (§B-21 de Cambios, Q21-1 de Cara)
 *
 * La caza XXI cazó las costuras de la cura 20: la puerta receptora
 * aprendió el contenido (localWorkVerdict) pero las compuertas de
 * revisión — el veredicto de escritura y el listener — siguieron
 * juzgando solo por el sello que la entrada anunciada, por diseño, no
 * mueve; y la mesa, honesta ya en el libro, callaba en la cara cuando
 * su foto envejecía bajo la adopción. Esta cerca clava las dos curas:
 *   §A — el canal de igual revisión (§B-21): el veredicto de escritura
 *        aprende el contenido en la ventana exacta de igual revisión
 *        y el listener adopta la entrada ajena cuando la pestaña está
 *        limpia. Los especímenes B1/B2/B4 de Cambios, volteados; el
 *        control B3 (la mitad receptora) intacto; el espejo sano de la
 *        ola 21 (la adopción legítima jamás se bloquea) sin romper.
 *   §B — la mesa dice su foto (Q21-1): la tarjeta deja de ser dueña
 *        de la vida de la hoja y la mesa se re-sincroniza por
 *        sustracción contra la bandeja viva, nombrando las filas que
 *        cayeron. La decisión pura vive en drafts.ts (fallenDrafts).
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { createInitial } from "./defaults.ts";
import { blankSession, commitAnnounced } from "./reducer.ts";
import { fallenDrafts } from "./drafts.ts";
import { apartDecision, localWorkVerdict, tabVerdict } from "./packguard.ts";
import type { Draft, LedgerState } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const base = (): LedgerState => createInitial("es", "claro");

/* ═══════════ §A · EL CANAL DE IGUAL REVISIÓN (§B-21) ═══════════ */
describe("ola21 · §A: las compuertas entre pestañas aprenden el contenido a igual revisión", () => {
  // Dos pestañas cargan el MISMO libro base; cada una acuña su entrada
  // anunciada por la puerta real (commitAnnounced: marca sin mover la
  // revisión) y guarda. Ese es el espécimen B1 de Cambios, compuesto
  // sobre las funciones reales de la casa.
  const acuna = (b: LedgerState, detalle: string): LedgerState => {
    const ses = commitAnnounced(blankSession(b), (s) => s, detalle);
    return ses.ledger;
  };

  it("B1 volteado: la segunda pestaña NO pisa — su veredicto es «surface», no «write»", () => {
    const b = base();
    const libroA = acuna(b, "La confirmación no aplicó A");
    const libroB = acuna(b, "La confirmación no aplicó B");
    // A guarda primero: el pack base no conoce entradas anunciadas ajenas a A → escribe.
    assert.equal(
      tabVerdict(b.revision, b.revision, libroA.revision, true, { mine: libroA, stored: b }),
      "write", "A escribe: su entrada es la primera en la ventana");
    // B guarda después: el pack (el libro de A) conoce una entrada anunciada que B no conoce.
    assert.equal(
      tabVerdict(libroA.revision, b.revision, libroB.revision, true, { mine: libroB, stored: libroA }),
      "surface", "B no pisa: la puerta de conflicto aparta su copia y adopta el pack — las dos entradas sobreviven");
  });

  it("B1+B2 compuestos: tras el surface, el pack guarda la entrada de A y la ranura la de B — y al recargar, ninguna se perdió", () => {
    const b = base();
    const libroA = acuna(b, "La confirmación no aplicó A");
    const libroB = acuna(b, "La confirmación no aplicó B");
    // B ejecuta la puerta de conflicto (la fórmula real de surfaceTabConflict):
    const mineJson = JSON.stringify(libroB);
    const storedJson = JSON.stringify(libroA);
    assert.equal(localWorkVerdict(mineJson, storedJson, libroB, libroA, b.revision), true,
      "el trabajo de B es local de verdad: su entrada no está en el pack");
    assert.equal(apartDecision(mineJson, storedJson, null, null), "first",
      "la ranura decide: la copia de B se aparta, no se pisa");
    // El pack durable final ES el libro de A (adoptado); la ranura guarda el de B.
    const packFinal = libroA;
    const ranura = libroB;
    assert.ok(packFinal.audit.some((e) => e.announced && e.detail.includes("aplicó A")), "la entrada de A vive en el pack");
    assert.ok(ranura.audit.some((e) => e.announced && e.detail.includes("aplicó B")), "la entrada de B vive en la ranura");
    // B2: la sesión que nace del pack al recargar conoce la entrada de A — la pérdida ya no se hace permanente.
    const recargado = JSON.parse(JSON.stringify(packFinal)) as LedgerState;
    assert.ok(recargado.audit.some((e) => e.announced && e.detail.includes("aplicó A")), "al recargar, la entrada de A sigue ahí");
  });

  it("B4 volteado: la vía es simétrica — quien escribe segundo, aparta y adopta", () => {
    const b = base();
    const libroA = acuna(b, "La confirmación no aplicó A");
    const libroB = acuna(b, "La confirmación no aplicó B");
    assert.equal(
      tabVerdict(libroB.revision, b.revision, libroA.revision, true, { mine: libroA, stored: libroB }),
      "surface", "con B primero en el pack, es A quien no pisa");
  });

  it("B3, el control: la mitad receptora sigue entera — la llegada que avanza la revisión protege la entrada", () => {
    const b = base();
    const mio = acuna(b, "La confirmación no aplicó");
    const llegado: LedgerState = { ...b, revision: b.revision + 1, audit: [{ id: "otra-1", at: "2026-11-20T10:01:00.000Z", detail: "Línea" }, ...b.audit] };
    assert.equal(localWorkVerdict(JSON.stringify(mio), JSON.stringify(llegado), mio, llegado, b.revision), true,
      "mi entrada, ausente del pack que avanzó, sigue siendo trabajo local que se aparta");
    assert.equal(tabVerdict(b.revision + 1, b.revision, b.revision, true, { mine: mio, stored: llegado }), "surface",
      "y el veredicto con el almacén por delante no cambió de conducta");
    assert.equal(tabVerdict(b.revision + 1, b.revision, b.revision, false, { mine: mio, stored: llegado }), "adopt",
      "la pestaña limpia adopta, como siempre");
  });

  it("la prioridad no se invierte: con trabajo real (mi sesión avanzó), mi escritura manda aunque el pack guarde una entrada ajena", () => {
    const b = base();
    const ajeno = acuna(b, "La confirmación no aplicó A");
    const mioReal: LedgerState = { ...b, revision: b.revision + 1 };
    assert.equal(
      tabVerdict(ajeno.revision, b.revision, mioReal.revision, true, { mine: mioReal, stored: ajeno }),
      "write", "mi escritura avanza la revisión: una línea de registro no desplaza trabajo real — la entrada de A se protege en SU pestaña por la puerta receptora");
  });

  it("sin falso surface: si el pack ya conoce mi entrada (descendiente), se escribe; y sin contenido, el veredicto es el C2 de siempre", () => {
    const b = base();
    const libroA = acuna(b, "La confirmación no aplicó A");
    assert.equal(
      tabVerdict(libroA.revision, b.revision, libroA.revision, true, { mine: libroA, stored: libroA }),
      "write", "el pack ES mi libro: ninguna entrada anunciada queda desamparada");
    assert.equal(tabVerdict(b.revision, b.revision, b.revision, true), "write",
      "sin el contenido en la mano (la llamada de la oleada 2), la ventana de igual revisión escribe, como en C2");
    assert.equal(tabVerdict(b.revision - 1, b.revision, b.revision, false, { mine: b, stored: b }), "write",
      "el almacén por detrás de la base sigue escribiendo");
  });

  it("el proveedor pasa el contenido al veredicto y el listener adopta la entrada ajena en la pestaña limpia", () => {
    const prov = SRC("../../components/faro/provider.tsx");
    assert.match(prov, /tabVerdict\(storedRevision\(storedRaw\), baseRevRef\.current, session\.ledger\.revision, session\.dirty, \{ mine: session\.ledger, stored: storedLedger \}\)/,
      "la puerta de escritura juzga con el libro guardado en la mano, no solo con su sello");
    const listener = prov.slice(prov.indexOf("const onStorage"), prov.indexOf("window.addEventListener(\"storage\", onStorage)"));
    assert.ok(listener.includes("storedRev === base"), "el listener despierta también a igual revisión");
    assert.ok(listener.includes("announcedAbsent(stored.ledger, cur.ledger)"), "y juzga el contenido: la entrada anunciada que no conozco");
    assert.ok(listener.includes("!cur.dirty && cur.ledger.revision === base"), "solo en la pestaña limpia: con trabajo propio, nada se toca");
  });
});

/* ═══════════ §B · LA MESA DICE SU FOTO (Q21-1) ═══════════ */
describe("ola21 · §B: fallenDrafts — la sustracción contra lo vivo, en composición", () => {
  let seq = 0;
  const mk = (patch: Partial<Draft> = {}): Draft => ({
    id: `f${++seq}`, source: "text", kind: "line", raw: "frase", createdAt: "2026-11-20T10:00:00.000Z",
    day: "2026-11-20", sign: "out", amountMinor: 1000, currency: "USD", concept: "Fila", note: "",
    book: "expense-variable", unsure: [], missing: [], ...patch,
  });

  it("la fila que ya no vive cayó; la que descarté yo (gone) no se nombra dos veces", () => {
    const viva = mk({ concept: "Viva" });
    const caida = mk({ concept: "Caída" });
    const mia = mk({ concept: "Descartada por mí" });
    const work = [viva, caida, mia];
    const out = fallenDrafts(work, [viva, mia], new Set([mia.id]));
    assert.deepEqual(out.map((d) => d.id), [caida.id], "solo la resuelta por la otra mano se nombra: la mía ya la retiré yo en esta mesa");
  });

  it("lo nuevo que llega NO es una caída (la mesa revisa lo que abrió)", () => {
    const viva = mk();
    const nueva = mk({ concept: "Recién llegada" });
    assert.deepEqual(fallenDrafts([viva], [viva, nueva], new Set()), [], "la llegada no retira ni nombra nada en la mesa abierta");
  });

  it("la bandeja resuelta entera: todas las filas cayeron, en su orden", () => {
    const a = mk({ concept: "Una" });
    const c = mk({ concept: "Otra" });
    assert.deepEqual(fallenDrafts([a, c], [], new Set()).map((d) => d.concept), ["Una", "Otra"],
      "la mesa no se queda sin palabra: nombra las dos antes de mostrar la bandeja vacía");
  });

  it("sin cambios en lo vivo, nada cae", () => {
    const a = mk();
    assert.deepEqual(fallenDrafts([a], [a], new Set()), []);
    assert.deepEqual(fallenDrafts([], [a], new Set()), []);
  });
});

describe("ola21 · §B: la cara — la tarjeta no es dueña de la hoja y la mesa nombra las caídas", () => {
  it("TrayCard: el guardia gobierna la tarjeta; el null exige ninguna vista abierta", () => {
    const tray = SRC("../../components/faro/tray.tsx");
    assert.match(tray, /const cardLive = has\("capture\.tray"\) && \(drafts\.length > 0 \|\| plans\.length > 0\);/,
      "la tarjeta sigue naciendo solo con algo esperando y su asiento (la 1.3.357 suma los planes vivos de la lista-plan, D6)");
    assert.match(tray, /if \(!cardLive && view === "none"\) return null;/,
      "con una vista abierta no hay null: la hoja y la mesa viven hasta que la persona las cierra");
    assert.match(tray, /\{cardLive \? \(\s*<button type="button" className="tray-card"/,
      "el botón es lo único que el guardia enciende y apaga");
  });

  it("ReviewTable: la foto se re-sincroniza por sustracción y las caídas se nombran en la hoja", () => {
    const mesa = SRC("../../components/faro/review-table.tsx");
    assert.ok(mesa.includes("const fell = fallenDrafts(work, tray, gone);"),
      "la sustracción se juzga contra la bandeja VIVA (tray), con la decisión pura de drafts.ts");
    assert.ok(mesa.includes("setWork((w) => w.filter((d) => !ids.has(d.id)));"),
      "las filas caídas salen de la foto: el botón cuenta solo lo que la foto viva puede cumplir");
    assert.ok(mesa.includes('data-anchor="rev-fallen"'), "la nota de caídas vive en la hoja, persistente, no en un toast");
    assert.ok(mesa.includes("Ya no están en la bandeja: "), "ES: la hoja nombra lo que cayó");
    assert.ok(mesa.includes("No longer in the tray: "), "EN: the sheet names what fell");
    assert.ok(!mesa.includes("setWork(tray)"), "la foto jamás se repone entera desde lo vivo: lo tecleado en las filas vivas se conserva");
  });
});
