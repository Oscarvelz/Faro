/* ════════════════════════════════════════════════════════════════════
 * OLA 22 · LA MESA JUZGA CONTRA SU PROPIA FOTO (G22-2 de Guardián)
 *
 * La caza XXII encontró vivo el espécimen que la ola 21 había dado
 * por muerto: la receta de save() de la mesa construía su línea base
 * (`originals`) desde la bandeja AL GUARDAR, mientras `work` es la
 * foto del montaje — toda diferencia bajo un id vivo se le atribuía
 * a la persona, y su guardado parcheaba de vuelta al valor de la foto
 * lo que otra mano hubiera corregido mientras tanto (T4-a: la
 * corrección concurrente 10000→25000 moría en silencio; T4-b: el
 * borrador renacido con otro cuerpo renacía como la foto). El banco
 * de la ola 21 pasó porque le pasaba a la receta la bandeja DE
 * MONTAJE como bandeja viva — el argumento que producción no tiene
 * al guardar. LA LECCIÓN QUEDA ESCRITA EN ESTA CERCA: todo espécimen
 * construye la bandeja viva y los originales de montaje como objetos
 * DISTINTOS y divergentes; pasarle la foto como si fuera lo vivo
 * está prohibido.
 *
 * La cura: la atribución vive en drafts.ts (applyTableEdits) contra
 * los originales DE MONTAJE que la hoja captura al nacer
 * (mountOriginals), y la mesa nombra el cuerpo cambiado como nombra
 * la caída (changedDrafts → «Cambió mientras tanto»). Esta cerca
 * compone la receta con la forma de llamada de PRODUCCIÓN — los
 * pasos (1)(2)(3) de save() en su orden, por la puerta guardada —
 * y clava la PROCEDENCIA de la línea base sobre el texto fuente.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { createInitial } from "./defaults.ts";
import { blankSession, commitGuarded, type Session } from "./reducer.ts";
import { applyTableEdits, changedDrafts, commitDrafts, draftToLine, dropDraft, fallenDrafts, learnFromSaved, type DraftCtx } from "./drafts.ts";
import type { Draft, LedgerState } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const base = (): LedgerState => createInitial("es", "claro");
let seq = 0;
const mkDraft = (patch: Partial<Draft> = {}): Draft => ({
  id: `d${++seq}`, source: "photo", kind: "line", raw: "FOTO: recibo crudo", createdAt: "2026-11-19T20:00:00.000Z",
  day: "2026-11-18", sign: "out", amountMinor: 12500, currency: "USD", concept: "Publix", note: "",
  book: "expense-variable", unsure: [], missing: [], ...patch,
});
const ctx = (s: LedgerState): DraftCtx => ({ monthKey: "2026-11", structure: s.structure, lang: "es" });

/** La receta de save() de la mesa CURADA, en la forma de llamada de
 * producción: (1) applyTableEdits contra los originales de MONTAJE,
 * (2) los descartes, (3) las parejas desde lo vivo ya parchado, el
 * commit y el aprendizaje — por la puerta guardada. La bandeja viva
 * entra SOLO por el estado de la sesión (s.drafts), jamás como
 * argumento de la línea base. */
function recetaMesa22(args: {
  mount: Draft[]; work: Draft[]; checkedIds: string[]; goneIds: string[];
  c: DraftCtx; landed: { n: number };
}): (s: LedgerState) => LedgerState {
  const originals = new Map(args.mount.map((d) => [d.id, d]));
  const gone = new Set(args.goneIds);
  return (s) => {
    let next = applyTableEdits(s, args.work, originals, gone).state;
    for (const id of args.goneIds) next = dropDraft(next, id);
    const pairs: { draft: Draft; line: import("./types.ts").Line; force?: boolean }[] = [];
    for (const id of args.checkedIds) {
      const liveNow = (next.drafts ?? []).find((x) => x.id === id);
      if (!liveNow) continue;
      const line = draftToLine(liveNow, args.c);
      if (!line) continue;
      const before = (s.drafts ?? []).find((x) => x.id === id) ?? liveNow;
      pairs.push({ draft: before, line, force: false });
    }
    args.landed.n = pairs.length;
    next = commitDrafts(next, args.checkedIds, args.c);
    next = learnFromSaved(next, pairs);
    return next;
  };
}
const guardar = (ses: Session, receta: (s: LedgerState) => LedgerState, landed: { n: number }): Session =>
  commitGuarded(ses, receta, () => `Revisión ${landed.n}`);

describe("ola22 · §A: la mesa juzga contra su foto — la corrección concurrente manda (G22-2)", () => {
  it("T4-a volteado: la otra mano corrigió el monto bajo la mesa abierta; la línea nace con SU monto y el concepto de esta mesa", () => {
    const s0 = base();
    const catA = s0.structure.categories.find((c) => c.group === "variable")!;
    const foto = mkDraft({ concept: "Farmacia", amountMinor: 10000, cat: catA.id });
    const vivo = { ...foto, amountMinor: 25000 }; // la corrección concurrente: el id vive, ninguna caída
    assert.notStrictEqual(vivo, foto, "la bandeja viva y la foto son objetos distintos (la lección de la ola 21)");
    assert.deepEqual(fallenDrafts([foto], [vivo], new Set()), [], "el id vive ⇒ ninguna caída se nombra");
    const libro: LedgerState = { ...s0, drafts: [vivo] };
    const work = [{ ...foto, concept: "Farmacia Nueva" }]; // esta mesa solo tocó el concepto
    const landed = { n: 0 };
    const ses = guardar(blankSession(libro), recetaMesa22({
      mount: [foto], work, checkedIds: [foto.id], goneIds: [], c: ctx(libro), landed,
    }), landed);
    const lineas = Object.values(ses.ledger.months).flatMap((m) => m.lines);
    assert.equal(lineas.length, 1, "aterriza la fila que vive");
    assert.equal(lineas[0]!.concept, "Farmacia Nueva", "con el concepto de esta mesa");
    assert.equal(lineas[0]!.amountMinor, 25000, "y el monto de la otra mano — la corrección manda, no la foto");
  });

  it("T4-a en el paseo puro: applyTableEdits no mueve el campo corregido y su pareja nace de lo vivo", () => {
    const s0 = base();
    const catA = s0.structure.categories.find((c) => c.group === "variable")!;
    const foto = mkDraft({ concept: "Farmacia", amountMinor: 10000, cat: catA.id });
    const vivo = { ...foto, amountMinor: 25000 };
    const work = [{ ...foto, concept: "Farmacia Nueva" }];
    const libro: LedgerState = { ...s0, drafts: [vivo] };
    const { state, pairs } = applyTableEdits(libro, work, new Map([[foto.id, foto]]), new Set());
    const d = (state.drafts ?? []).find((x) => x.id === foto.id)!;
    assert.equal(d.amountMinor, 25000, "el monto vivo queda intacto");
    assert.equal(d.concept, "Farmacia Nueva", "el concepto de la persona sí aterriza");
    assert.equal(pairs.length, 1, "una pareja: el borrador que este paseo movió de verdad");
    assert.equal(pairs[0]!.before.amountMinor, 25000, "la pareja nace de LO VIVO (25000), no de la foto");
    assert.equal(pairs[0]!.after.amountMinor, 25000, "el aprendizaje jamás aprende la foto como si fuera el guardado");
    assert.equal(pairs[0]!.after.concept, "Farmacia Nueva");
  });

  it("T4-b volteado: el id renació con otro cuerpo y la persona no editó nada — se convierte el cuerpo renacido", () => {
    const s0 = base();
    const catA = s0.structure.categories.find((c) => c.group === "variable")!;
    const foto = mkDraft({ concept: "Farmacia", amountMinor: 10000, day: "2026-11-18", cat: catA.id });
    const renacido = { ...foto, concept: "Licorería", amountMinor: 77700, day: "2026-11-05" };
    assert.deepEqual(fallenDrafts([foto], [renacido], new Set()), [], "el id vive ⇒ el renacimiento no es una caída");
    const libro: LedgerState = { ...s0, drafts: [renacido] };
    const landed = { n: 0 };
    const ses = guardar(blankSession(libro), recetaMesa22({
      mount: [foto], work: [foto], checkedIds: [foto.id], goneIds: [], c: ctx(libro), landed,
    }), landed);
    const lineas = Object.values(ses.ledger.months).flatMap((m) => m.lines);
    assert.equal(lineas.length, 1, "aterriza una línea");
    assert.equal(lineas[0]!.concept, "Licorería", "con el concepto renacido — la foto no se repone");
    assert.equal(lineas[0]!.amountMinor, 77700, "aterriza el cuerpo renacido (77700)");
  });

  it("control: lo que la persona SÍ editó aterriza entero cuando lo vivo aún es la foto", () => {
    const s0 = base();
    const catA = s0.structure.categories.find((c) => c.group === "variable")!;
    const foto = mkDraft({ concept: "Farmacia", amountMinor: 10000, cat: catA.id });
    const work = [{ ...foto, concept: "Farmacia Nueva", amountMinor: 12000, note: "de la persona" }];
    const libro: LedgerState = { ...s0, drafts: [foto] };
    const { state, pairs } = applyTableEdits(libro, work, new Map([[foto.id, foto]]), new Set());
    const d = (state.drafts ?? []).find((x) => x.id === foto.id)!;
    assert.equal(d.amountMinor, 12000, "su monto");
    assert.equal(d.concept, "Farmacia Nueva", "su concepto");
    assert.equal(d.note, "de la persona", "su nota");
    assert.equal(pairs.length, 1);
  });

  it("control: la corrección ajena a OTRO campo sobrevive y la edición propia aterriza al lado", () => {
    const s0 = base();
    const catA = s0.structure.categories.find((c) => c.group === "variable")!;
    const foto = mkDraft({ concept: "Farmacia", amountMinor: 10000, note: "", cat: catA.id });
    const vivo = { ...foto, note: "corregida por la otra mano" };
    const work = [{ ...foto, amountMinor: 12000 }];
    const libro: LedgerState = { ...s0, drafts: [vivo] };
    const { state } = applyTableEdits(libro, work, new Map([[foto.id, foto]]), new Set());
    const d = (state.drafts ?? []).find((x) => x.id === foto.id)!;
    assert.equal(d.amountMinor, 12000, "el monto de la persona aterriza");
    assert.equal(d.note, "corregida por la otra mano", "la nota de la otra mano no se pisa");
  });

  it("control: si lo vivo ya es el valor de la persona (edición convergente), el paseo no fabrica pareja ni marco", () => {
    const s0 = base();
    const catA = s0.structure.categories.find((c) => c.group === "variable")!;
    const foto = mkDraft({ concept: "Farmacia", amountMinor: 10000, cat: catA.id });
    const vivo = { ...foto, amountMinor: 12000 }; // la otra mano hizo la MISMA corrección
    const work = [{ ...foto, amountMinor: 12000 }];
    const libro: LedgerState = { ...s0, drafts: [vivo] };
    const { state, pairs } = applyTableEdits(libro, work, new Map([[foto.id, foto]]), new Set());
    assert.equal(pairs.length, 0, "nada que aplicar ⇒ ninguna pareja");
    assert.equal((state.drafts ?? [])[0]!.amountMinor, 12000);
  });
});

describe("ola22 · §B: la mesa nombra el cuerpo cambiado (changedDrafts)", () => {
  it("nombra la corrección concurrente (T4-a) y el renacimiento (T4-b)", () => {
    const s0 = base();
    const catA = s0.structure.categories.find((c) => c.group === "variable")!;
    const foto = mkDraft({ concept: "Farmacia", amountMinor: 10000, cat: catA.id });
    const corregido = { ...foto, amountMinor: 25000 };
    const renacido = { ...foto, concept: "Licorería", amountMinor: 77700 };
    const mount = new Map([[foto.id, foto]]);
    assert.deepEqual(changedDrafts([foto], [corregido], mount, new Set()).map((d) => d.id), [foto.id], "la corrección se nombra");
    assert.deepEqual(changedDrafts([foto], [renacido], mount, new Set()).map((d) => d.id), [foto.id], "el renacimiento se nombra");
  });

  it("NO nombra lo que la persona misma editó, ni la edición convergente, ni la caída (esa la nombra fallenDrafts)", () => {
    const s0 = base();
    const catA = s0.structure.categories.find((c) => c.group === "variable")!;
    const foto = mkDraft({ concept: "Farmacia", amountMinor: 10000, cat: catA.id });
    const mount = new Map([[foto.id, foto]]);
    const workPropia = [{ ...foto, concept: "Farmacia Nueva" }];
    assert.deepEqual(changedDrafts(workPropia, [foto], mount, new Set()), [], "lo vivo es la foto: nada cambió mientras tanto");
    const convergente = { ...foto, concept: "Farmacia Nueva" };
    assert.deepEqual(changedDrafts(workPropia, [convergente], mount, new Set()), [], "lo vivo ya es lo de la persona: no hay un tercero que nombrar");
    assert.deepEqual(changedDrafts([foto], [], mount, new Set()), [], "la caída no es un cambio: su palabra es la de fallenDrafts");
    assert.deepEqual(changedDrafts([foto], [corregido2(foto)], mount, new Set([foto.id])), [], "lo descartado por la persona en esta mesa no se nombra");
    function corregido2(f: Draft): Draft { return { ...f, amountMinor: 25000 }; }
  });
});

describe("ola22 · §C: la PROCEDENCIA de la línea base, clavada sobre la fuente", () => {
  it("la hoja captura sus originales AL MONTAR y save() no construye ninguno desde la bandeja del momento", () => {
    const mesa = SRC("../../components/faro/review-table.tsx");
    assert.ok(/const \[mountOriginals\] = useState\(\(\) => new Map\(tray\.map/.test(mesa),
      "los originales nacen con la hoja: useState con la bandeja del montaje");
    assert.ok(!/const originals = new Map\(tray\.map/.test(mesa),
      "ningún `originals` nace de la bandeja al guardar — esa era la enfermedad G22-2");
    assert.ok(/applyTableEdits\(next, work, mountOriginals, gone\)/.test(mesa),
      "el guardado llama al paseo con los originales de montaje, en la forma de producción que esta cerca compone");
    assert.ok(/changedDrafts\(work, tray, mountOriginals, gone\)/.test(mesa),
      "la nota de cambios se alimenta de la misma línea base de montaje");
    assert.ok(/mountOriginals\.get\(d\.id\)/.test(mesa),
      "el «recordar» también se juzga contra el montaje");
  });
});
