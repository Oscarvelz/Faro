/* ═══ LIBRO COMPARTIDO · PIEZA C4 (1.3.393): AUTORÍA Y FIRMAS.
 *
 * La ley fallada (F-C3), probada: la firma nace al guardar en la mesa
 * con el autor de la sesión (y sin autor no nace); el nombre viaja
 * CONGELADO — renombrarse no reescribe ninguna firma —; los actos
 * automáticos firman «Faro»; la actividad se lee del libro (actos +
 * hechos de borrado) sin alertar nada; el río del Historial levanta
 * la firma de la línea; y el tratamiento visual es UNA pieza con su
 * color derivado del tema, sentada en líneas, Historial y actividad. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { activityOf, signatureName, signatureOf, stampLine, FARO_AUTHOR } from "./sign.ts";
import { createInitial, isLedgerDeep } from "./defaults.ts";
import { commitDrafts, type DraftCtx } from "./drafts.ts";
import { buildStream } from "./historial.ts";
import type { Draft, LedgerState, Line, Structure } from "./types.ts";

const structure = { base: "USD", categories: [{ id: "cat-a", subs: [] }], catalog: [], purchases: [] } as unknown as Structure;
const line = (id: string, over: Partial<Line> = {}): Line => ({
  id, seriesId: id, monthKey: "2026-11", kind: "expense", concept: id, amountMinor: 100,
  currency: "USD", active: true, note: "", categoryId: "cat-a", subId: "", recurring: false,
  storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "once", nextDue: "",
  aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], bookedOn: "2026-11-10", ...over,
} as Line);
const book = (over: Partial<LedgerState> = {}): LedgerState => ({
  v: 1, structure, months: { "2026-11": { lines: [] } }, settings: {}, audit: [], ...over,
} as unknown as LedgerState);

describe("firmas · el sello y su lectura", () => {
  it("la firma congela el nombre al anotar: renombrarse no la reescribe", () => {
    const stamped = stampLine(line("x"), { id: "cuenta-1", name: "  María  " });
    assert.equal(stamped.by, "cuenta-1");
    assert.equal(stamped.byName, "María");
    // La autora se renombra después: la línea guarda el nombre de entonces.
    const renamed = { id: "cuenta-1", name: "María Imara" };
    assert.notEqual(stamped.byName, renamed.name);
    assert.deepEqual(signatureOf(stamped), { kind: "person", name: "María" });
  });

  it("los actos automáticos firman «Faro», y sin firma no se inventa ninguna", () => {
    const auto = stampLine(line("x"), FARO_AUTHOR);
    assert.deepEqual(signatureOf(auto), { kind: "faro" });
    assert.equal(signatureName({ kind: "faro" }, "es"), "Faro");
    assert.equal(signatureOf(line("x")), null);
    assert.equal(signatureOf({ by: "" }), null);
    assert.equal(signatureOf({ by: 42 }), null);
    assert.deepEqual(signatureOf({ by: "cuenta-9" }), { kind: "person", name: null });
    assert.equal(signatureName({ kind: "person", name: null }, "es"), "Un miembro");
    assert.equal(signatureName({ kind: "person", name: null }, "en"), "A member");
  });

  it("la mesa firma al guardar cuando hay autor, y no firma sin él", () => {
    const draft = {
      id: "d1", kind: "line", concept: "Mercado", amountMinor: 500, currency: "USD", sign: "out",
      categoryId: "cat-a", subId: "", storeId: "", day: "2026-11-10", monthKey: "2026-11", unsure: [], note: "",
    } as unknown as Draft;
    const ctx: DraftCtx = { monthKey: "2026-11", structure, lang: "es" };
    const personal = commitDrafts(book({ drafts: [draft] }), ["d1"], ctx);
    const savedPersonal = personal.months["2026-11"]?.lines[0];
    assert.equal(savedPersonal?.by, undefined);
    const shared = commitDrafts(book({ drafts: [draft] }), ["d1"], { ...ctx, author: { id: "cuenta-1", name: "Oscar" } });
    const savedShared = shared.months["2026-11"]?.lines[0];
    assert.equal(savedShared?.by, "cuenta-1");
    assert.equal(savedShared?.byName, "Oscar");
  });
});

describe("firmas · la actividad consultable", () => {
  it("lee actos y hechos de borrado, del más reciente al más viejo, sin alertas", () => {
    const s = book({
      audit: [
        { id: "a1", at: "2026-11-20T10:00:00Z", detail: "add", by: "cuenta-1", byName: "María" },
        { id: "a2", at: "2026-11-21T10:00:00Z", detail: "settle", by: "faro", byName: "Faro" },
      ],
      tombstones: [{ id: "linea-x", at: "2026-11-22T09:00:00Z", by: "cuenta-1" }],
    });
    const facts = activityOf(s);
    assert.deepEqual(facts.map((f) => f.kind), ["deletion", "act", "act"]);
    assert.equal(facts[0]?.detail, "deleted");
    assert.deepEqual(facts[0]?.signature, { kind: "person", name: null });
    assert.deepEqual(facts[1]?.signature, { kind: "faro" });
    assert.deepEqual(facts[2]?.signature, { kind: "person", name: "María" });
  });

  it("el río del Historial levanta la firma de la línea, con desconfianza", () => {
    const s = book({ months: { "2026-11": { lines: [
      line("firmada", { by: "cuenta-1", byName: "María" }),
      line("anonima"),
      line("rara", { by: 42 as never }),
    ] } } });
    const stream = buildStream(s, {});
    const signed = stream.find((m) => m.lineId === "firmada");
    assert.equal(signed?.by, "cuenta-1");
    assert.equal(signed?.byName, "María");
    assert.equal(stream.find((m) => m.lineId === "anonima")?.by, undefined);
    assert.equal(stream.find((m) => m.lineId === "rara")?.by, undefined);
  });
});

describe("firmas · el tratamiento y sus asientos", () => {
  const css = readFileSync(new URL("../../components/faro/signature.css", import.meta.url), "utf8");
  const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
  const historial = readFileSync(new URL("../../components/faro/historial.tsx", import.meta.url), "utf8");
  const finish = readFileSync(new URL("../../components/faro/finish.tsx", import.meta.url), "utf8");

  it("un solo tratamiento: color derivado del acento del tema, sin hex propio", () => {
    assert.match(css, /\.sig \{/);
    assert.match(css, /color-mix\(in srgb, var\(--accent\) 68%, var\(--ink\)\)/);
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  });

  it("la firma se sienta en la línea, en el río y en la actividad — por el mismo componente", () => {
    assert.match(screens, /<Signature by=\{line\.by\} byName=\{line\.byName\} lang=\{lang\} \/>/);
    assert.match(screens, /<Signature by=\{line\.by\} byName=\{line\.byName\} lang=\{lang\} bubble \/>/);
    assert.match(historial, /<Signature by=\{m\.by\} byName=\{m\.byName\} lang=\{lang\} \/>/);
    assert.match(finish, /<Signature by=\{a\.by\} byName=\{a\.byName\}/);
    assert.match(screens, /by: a\.by, byName: a\.byName/);
  });

  // OLA 30 (Familia 6, G30-F1) — ENMIENDA CON SU RAZÓN: este `it`
  // clavaba el juez de la firma con dos regex sobre el TEXTO de
  // defaults.ts (presencia, no juicio). Con el juicio vaciado en un
  // mutante — un «sanitizador» que convertía by/byName no-texto en
  // undefined dejando las líneas clavadas textualmente intactas — la
  // cerca corría 8/8 verde mientras la puerta del mutante ADMITÍA
  // by: 42, que la puerta prístina rehúsa. La enmienda de la Cura 29
  // a libro392 (la puerta de lápidas se corre contra lápidas
  // malformadas, no contra una regex) se extiende aquí: la conducta
  // contra isLedgerDeep es la cerca; el texto ya no clava nada.
  it("el cargador juzga la firma si está: texto o no pasa", () => {
    const base = createInitial("es");
    const conLinea = (over: Partial<Line>): LedgerState => ({ ...base, months: { "2026-11": { lines: [line("firmada", over)] } } });
    assert.equal(isLedgerDeep(conLinea({ by: "cuenta-1", byName: "María" })), true, "la firma bien formada pasa la puerta");
    assert.equal(isLedgerDeep(conLinea({})), true, "sin firma también pasa: la firma es opcional, no exigida");
    assert.equal(isLedgerDeep(conLinea({ by: 42 as never })), false, "un by que no es texto no pasa la puerta");
    assert.equal(isLedgerDeep(conLinea({ byName: 42 as never })), false, "un byName que no es texto no pasa la puerta");
  });
});
