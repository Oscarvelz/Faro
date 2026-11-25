/* LA RAMA DEL AGENTE · E5 — crear preguntando: especímenes.
   La categoría que no existe se crea con preguntas: solo se pregunta
   lo que el relato no ya sabe, la cerca de conflictos va primero, y
   la creación nace como borrador con su eco. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crearDesdeRelato, crearInicio, crearRespuesta } from "./crear.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { parseRelato } from "./relato.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const luz: Line = {
    id: "luz", seriesId: "luz", monthKey: KEY, currency: "USD", active: true, note: "",
    kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, bookedOn: "2026-09-28",
    categoryId: "f-casa", subId: "f.casa.servicios", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [],
  } as Line;
  ledger.months[KEY] = { lines: [luz] };
  ledger.settings.display = "USD";
  return ledger;
}

describe("crear E5 · el caso semilla de Oscar", () => {
  it("«pagué 80 de jardinería» — sin ubicar, y la creación pregunta SOLO el dónde (el tipo ya se sabe: pagué = gasto)", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const r = parseRelato(ledger, KEY, "es", names, "pagué 80 de jardinería", TODAY);
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].categoryId, "");
    const step = crearDesdeRelato(ledger, "es", names, r.drafts[0], "Jardinería");
    assert.ok(step, "la creación debió abrirse");
    assert.equal(step?.kind, "pregunta");
    if (step?.kind !== "pregunta") return;
    assert.equal(step.propuesta.pendiente, "donde");
    assert.equal(step.propuesta.tipo, "gasto");
    // La respuesta «aparte» cierra el borrador de estructura.
    const fin = crearRespuesta(ledger, "es", names, step.propuesta, "aparte, como categoría nueva");
    assert.equal(fin.kind, "draft", JSON.stringify(fin).slice(0, 200));
    if (fin.kind !== "draft") return;
    assert.equal(fin.draft.nombre, "Jardinería");
    assert.equal(fin.draft.tipo, "gasto");
    assert.equal(fin.draft.esSub, false);
    assert.ok(fin.echo.includes("Crear «Jardinería», de gasto, como categoría nueva"), fin.echo);
    assert.ok(fin.echo.includes("¿La creo así?"), fin.echo);
  });

  it("un borrador ya ubicado no abre creación", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const r = parseRelato(ledger, KEY, "es", names, "pagué la luz 45", TODAY);
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(crearDesdeRelato(ledger, "es", names, r.drafts[0]), null);
  });
});

describe("crear E5 · el diálogo completo, sin pistas", () => {
  it("tipo → dónde → borrador: «Peluquería», gasto, bajo Casa", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const s1 = crearInicio(ledger, "es", names, "Peluquería");
    assert.equal(s1.kind, "pregunta");
    if (s1.kind !== "pregunta") return;
    assert.equal(s1.propuesta.pendiente, "tipo");
    const s2 = crearRespuesta(ledger, "es", names, s1.propuesta, "es de gasto");
    assert.equal(s2.kind, "pregunta");
    if (s2.kind !== "pregunta") return;
    assert.equal(s2.propuesta.pendiente, "donde");
    const s3 = crearRespuesta(ledger, "es", names, s2.propuesta, "bajo Casa");
    assert.equal(s3.kind, "draft", JSON.stringify(s3).slice(0, 200));
    if (s3.kind !== "draft") return;
    assert.equal(s3.draft.padreId, "f-casa");
    assert.equal(s3.draft.esSub, true);
    assert.ok(s3.echo.includes("bajo Casa"), s3.echo);
  });

  it("una respuesta que no contesta la pregunta la repite, no avanza a ciegas", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const s1 = crearInicio(ledger, "es", names, "Peluquería");
    if (s1.kind !== "pregunta") return assert.fail("debió preguntar");
    const s2 = crearRespuesta(ledger, "es", names, s1.propuesta, "pues no sé, algo");
    assert.equal(s2.kind, "pregunta");
    if (s2.kind !== "pregunta") return;
    assert.equal(s2.propuesta.pendiente, "tipo");
  });
});

describe("crear E5 · la cerca de conflictos", () => {
  it("«Servicio» contra la «Servicios» que ya existe: se pregunta ANTES de crear nada", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const s1 = crearInicio(ledger, "es", names, "Servicio");
    assert.equal(s1.kind, "pregunta");
    if (s1.kind !== "pregunta") return;
    assert.equal(s1.propuesta.pendiente, "conflicto");
    assert.ok(s1.question.includes("Servicios"), s1.question);
    // «Esa» = usar la existente; no se crea nada.
    const uso = crearRespuesta(ledger, "es", names, s1.propuesta, "esa misma");
    assert.equal(uso.kind, "usar", JSON.stringify(uso).slice(0, 200));
    if (uso.kind !== "usar") return;
    assert.equal(uso.subId, "f.casa.servicios");
    // Y «una nueva» sigue el diálogo normal.
    const s2 = crearRespuesta(ledger, "es", names, s1.propuesta, "no, una nueva");
    assert.equal(s2.kind, "pregunta");
    if (s2.kind !== "pregunta") return;
    assert.equal(s2.propuesta.pendiente, "tipo");
  });
});

describe("crear E5 · la pureza", () => {
  it("el diálogo no toca el libro", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "es");
    const before = JSON.stringify(ledger.structure);
    const s1 = crearInicio(ledger, "es", names, "Peluquería");
    if (s1.kind === "pregunta") crearRespuesta(ledger, "es", names, s1.propuesta, "gasto");
    assert.equal(JSON.stringify(ledger.structure), before);
  });
});
