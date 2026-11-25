/**
 * LA CAMPAÑA DE MUTACIONES · LA RAMA AGENTE (2026-11-25) — la misma
 * campaña que cerró el banco (Olas 65–67) corrida sobre los objetivos
 * del Asesor COMO AGENTE: el relato que se asienta (E1), el lenguaje
 * figurado y el modismo (E2), programar por relato (E3), los verbos
 * de orden (E4) y crear preguntando (E5). El método es el de Oscar:
 * una onda hostil que rompe lo que cada escalón promete, y una onda
 * amiga que cura por clases.
 *
 * LA PROMESA de un escalón no es su eco palabra por palabra: es su
 * RESULTADO — la clase de respuesta y, en los borradores, la
 * operación, el monto, la moneda, el concepto ubicado y el destino;
 * en las órdenes, la operación y su blanco; en crear, el paso del
 * diálogo y el borrador final. Si una mutación de forma (signos,
 * tildes, una letra caída o cambiada, la fonética, las comas que
 * separan la lista, las mayúsculas) cambia ese resultado, la
 * promesa se rompió.
 *
 * La batería nace como CERCA: el assert final exige cero roturas.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crearDesdeRelato, crearInicio, crearRespuesta } from "./crear.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { foldQ } from "./lexicon.ts";
import { parseOrden } from "./orden.ts";
import { parsePrograma, parseRelato } from "./relato.ts";
import type { Draft, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

/* El libro del relato: un bolsillo (Colchón) y una cuenta (Banco). */
function libroRelato(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs = [{ id: "f.ahorro.colchon", nameKey: "f.ahorro.colchon", customName: "Colchón", icon: "vault:generic", hidden: false, order: 10 }];
  ledger.structure.catalog = ledger.structure.catalog.filter((c) => c.kind !== "acct");
  ledger.structure.catalog.push({ id: "acct-banco", nameKey: "", customName: "Banco", icon: "", hidden: false, order: 90, kind: "acct", urlTemplate: "" });
  ledger.months[KEY] = { lines: [
    line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 120000, bookedOn: "2026-10-05" }),
    line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-28" }),
    line({ id: "internet", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
  ] };
  ledger.settings.display = "USD";
  return ledger;
}

function libroNIO(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = { lines: [
    line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 164809, currency: "NIO", categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-28" }),
  ] };
  ledger.settings.display = "NIO";
  return ledger;
}

/* El libro de las órdenes: con su borrador en la Bandeja. */
function libroOrden(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = { lines: [
    line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
    line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-28" }),
    line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
  ] };
  ledger.settings.display = "USD";
  ledger.drafts = [{
    id: "d1", source: "text", kind: "line", raw: "zapatos 60", createdAt: "2026-10-21T10:00:00.000Z",
    day: "2026-10-21", sign: "out", amountMinor: 6000, currency: "USD", concept: "Zapatos", note: "",
  } as Draft];
  return ledger;
}

/* Las firmas: el resultado de cada escalón, en una línea comparable. */
function sigRelato(r: ReturnType<typeof parseRelato>): string {
  if (r.kind === "drafts") return `drafts[${r.drafts.map((d) => `${d.op}:${d.amountMinor}:${d.currency}:${foldQ(d.concept)}:${d.from?.label ?? ""}->${d.to?.label ?? ""}`).join("|")}]fig(${r.figures.join(",")})`;
  if (r.kind === "ask") return `ask:${r.missing}`;
  return `unknown:fig(${r.figures.join(",")})`;
}
function sigPrograma(r: ReturnType<typeof parsePrograma>): string {
  if (r.kind === "schedules") return `schedules[${r.drafts.map((d) => `${d.op}:${d.clase}:${d.amountMinor}:${d.cadence}:${d.firstDate}:${foldQ(d.concept)}`).join("|")}]`;
  if (r.kind === "ask") return `ask:${r.missing}`;
  return "unknown";
}
function sigOrden(r: ReturnType<typeof parseOrden>): string {
  if (r.kind === "order") {
    const o = r.order;
    if (o.op === "archivar") return `order:archivar:${o.lineId}`;
    if (o.op === "corregir-monto") return `order:corregir-monto:${o.lineId}:${o.fromMinor}->${o.toMinor}`;
    if (o.op === "corregir-fecha") return `order:corregir-fecha:${o.lineId}:${o.fromDate}->${o.toDate}`;
    return `order:ajuste:${o.setting}:${String(o.value)}`;
  }
  if (r.kind === "found") return `found[${r.hits.map((h) => `${h.where}:${foldQ(h.label)}`).join("|")}]`;
  return r.kind;
}

type Base = { id: string; text: string; key: RegExp; run: (text: string) => string };

const R = (id: string, text: string, key: RegExp, lang: "es" | "en" = "es", nio = false): Base => ({
  id, text, key,
  run: (t) => { const l = nio ? libroNIO() : libroRelato(); return sigRelato(parseRelato(l, KEY, lang, makeNamer(l.structure, lang), t, TODAY)); },
});
const P = (id: string, text: string, key: RegExp, lang: "es" | "en" = "es"): Base => ({
  id, text, key,
  run: (t) => { const l = libroRelato(); return sigPrograma(parsePrograma(l, KEY, lang, makeNamer(l.structure, lang), t, TODAY)); },
});
const O = (id: string, text: string, key: RegExp, lang: "es" | "en" = "es"): Base => ({
  id, text, key,
  run: (t) => { const l = libroOrden(); return sigOrden(parseOrden(l, KEY, lang, makeNamer(l.structure, lang), t, TODAY)); },
});

const BASES: Base[] = [
  /* E1 · el relato */
  R("r1", "pagué la luz 45", /pagué/i),
  R("r2", "pagué 45 de luz y 30 de flores", /pagué/i),
  R("r3", "pagué la luz cuarenta y cinco dólares", /pagué/i),
  R("r4", "ayer pagué la luz 45", /pagué/i),
  R("r5", "hoy pagué: luz 45, agua 30, internet 50", /pagué/i),
  R("r6", "moví 200 del banco al colchón, pagué la luz 45 y me entró el salario 1200", /moví/i),
  R("r7", "moví 200 al colchón", /moví/i),
  R("r8", "pagué la luz", /pagué/i),
  R("r9", "pagué 45", /pagué/i),
  /* E2 · el modismo y lo figurado */
  R("r10", "me comí un pollo con tajadas, quedé palmado, vale 150", /tajadas/i),
  R("r11", "compré un pollo con tajadas", /compré/i),
  R("r12", "gasté una fortuna en zapatos", /gasté/i),
  R("r13", "gasté cincuenta reales en tajadas", /cincuenta/i),
  R("r14", "quedé palmado", /palmado/i),
  /* E1 · el espejo y la moneda */
  R("r15", "I paid 45 for electricity and received my salary 1200", /paid/i, "en"),
  R("r16", "I moved 200 from the bank to my savings", /moved/i, "en"),
  R("r17", "pagué 500 de luz", /pagué/i, "es", true),
  /* E3 · programar */
  P("p1", "programa la luz 45 cada mes el día 1", /programa/i),
  P("p2", "recuérdame pagar el internet cada mes el día 28", /pagar/i),
  P("p3", "cada quincena me entran 400 del negocio, prográmalo", /quincena/i),
  P("p4", "programa el pago de la renta", /programa/i),
  P("p5", "schedule rent 1200 every month", /schedule/i, "en"),
  /* E4 · las órdenes */
  O("o1", "archiva la luz", /archiva/i),
  O("o2", "manda el internet a archivos", /archivos/i),
  O("o3", "archiva eso", /archiva/i),
  O("o4", "corrige la luz, no fueron 45, fueron 50", /corrige/i),
  O("o5", "mueve la luz al día 15", /mueve/i),
  O("o6", "¿dónde está la luz?", /dónde/i),
  O("o7", "¿dónde están los zapatos?", /están/i),
  O("o8", "¿dónde está el yate?", /yate/i),
  O("o9", "cambia la moneda a córdobas", /moneda/i),
  O("o10", "poné el modo esencial", /poné/i),
  O("o11", "cambia la tasa a 36.80", /tasa/i),
  O("o12", "apaga los avisos", /apaga/i),
  O("o13", "cambia la moneda a dólares", /moneda/i),
  O("o14", "cambia el tema a oscuro", /tema/i),
  O("o15", "cambia la luz a 50", /cambia/i),
  O("o16", "change the currency to cordobas", /change/i, "en"),
  O("o17", "where is the internet?", /where/i, "en"),
  /* E5 · crear preguntando: las respuestas del diálogo */
  {
    id: "c1", text: "Peluquería", key: /Peluquería/i,
    run: (t) => { const l = createInitial("es", "oscuro"); const s = crearInicio(l, "es", makeNamer(l.structure, "es"), t); return s.kind === "pregunta" ? `pregunta:${s.propuesta.pendiente}` : s.kind; },
  },
  {
    id: "c2", text: "es de gasto", key: /gasto/i,
    run: (t) => {
      const l = createInitial("es", "oscuro"); const names = makeNamer(l.structure, "es");
      const s1 = crearInicio(l, "es", names, "Peluquería"); if (s1.kind !== "pregunta") return "roto";
      const s2 = crearRespuesta(l, "es", names, s1.propuesta, t);
      return s2.kind === "pregunta" ? `pregunta:${s2.propuesta.pendiente}` : s2.kind;
    },
  },
  {
    id: "c3", text: "bajo Casa", key: /Casa/i,
    run: (t) => {
      const l = createInitial("es", "oscuro"); const names = makeNamer(l.structure, "es");
      const s1 = crearInicio(l, "es", names, "Peluquería"); if (s1.kind !== "pregunta") return "roto";
      const s2 = crearRespuesta(l, "es", names, s1.propuesta, "es de gasto"); if (s2.kind !== "pregunta") return "roto";
      const s3 = crearRespuesta(l, "es", names, s2.propuesta, t);
      return s3.kind === "draft" ? `draft:${s3.draft.tipo}:${s3.draft.esSub}:${s3.draft.padreId ?? ""}` : s3.kind;
    },
  },
  {
    id: "c4", text: "aparte, como categoría nueva", key: /aparte/i,
    run: (t) => {
      const l = libroRelato(); const names = makeNamer(l.structure, "es");
      const r = parseRelato(l, KEY, "es", names, "pagué 80 de jardinería", TODAY); if (r.kind !== "drafts") return "roto";
      const step = crearDesdeRelato(l, "es", names, r.drafts[0], "Jardinería"); if (!step || step.kind !== "pregunta") return "roto";
      const fin = crearRespuesta(l, "es", names, step.propuesta, t);
      return fin.kind === "draft" ? `draft:${fin.draft.tipo}:${fin.draft.esSub}` : fin.kind;
    },
  },
  {
    id: "c5", text: "esa misma", key: /misma/i,
    run: (t) => {
      const l = createInitial("es", "oscuro"); const names = makeNamer(l.structure, "es");
      const s1 = crearInicio(l, "es", names, "Servicio"); if (s1.kind !== "pregunta") return "roto";
      const s2 = crearRespuesta(l, "es", names, s1.propuesta, t);
      return s2.kind === "usar" ? `usar:${s2.subId}` : s2.kind === "pregunta" ? `pregunta:${s2.propuesta.pendiente}` : s2.kind;
    },
  },
  {
    id: "c6", text: "no, una nueva", key: /nueva/i,
    run: (t) => {
      const l = createInitial("es", "oscuro"); const names = makeNamer(l.structure, "es");
      const s1 = crearInicio(l, "es", names, "Servicio"); if (s1.kind !== "pregunta") return "roto";
      const s2 = crearRespuesta(l, "es", names, s1.propuesta, t);
      return s2.kind === "pregunta" ? `pregunta:${s2.propuesta.pendiente}` : s2.kind;
    },
  },
];

/* Las mutaciones: la forma cambia, el resultado no debe. */
function onKey(text: string, key: RegExp, fn: (w: string) => string): string | null {
  const m = text.match(key);
  if (!m || m.index === undefined) return null;
  const w = m[0];
  const out = fn(w);
  if (out === w) return null;
  return text.slice(0, m.index) + out + text.slice(m.index + w.length);
}
const MUTS: Array<{ name: string; fn: (b: Base) => string | null }> = [
  { name: "base", fn: (b) => b.text },
  { name: "sin-signos", fn: (b) => b.text.replace(/[¿?¡!]/g, "") },
  { name: "con-punto", fn: (b) => (b.text.endsWith(".") ? null : `${b.text}.`) },
  { name: "sin-tildes", fn: (b) => b.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") },
  { name: "mayusculas", fn: (b) => b.text.toUpperCase() },
  { name: "sin-comas", fn: (b) => (b.text.includes(",") ? b.text.replace(/,/g, "") : null) },
  { name: "sin-dos-puntos", fn: (b) => (b.text.includes(":") ? b.text.replace(/:/g, " ") : null) },
  { name: "letra-caida", fn: (b) => onKey(b.text, b.key, (w) => (w.length < 4 ? w : w.slice(0, Math.floor(w.length / 2)) + w.slice(Math.floor(w.length / 2) + 1))) },
  { name: "letras-cambiadas", fn: (b) => onKey(b.text, b.key, (w) => (w.length < 4 ? w : w[0] + w[2] + w[1] + w.slice(3))) },
  {
    name: "fonetica", fn: (b) => onKey(b.text, b.key, (w) => w
      .replace(/qu/gi, "k").replace(/z/gi, "s")
      .replace(/c(?=[eiéí])/gi, (c) => (c === "C" ? "S" : "s"))
      .replace(/b/gi, (c) => (c === "B" ? "V" : "v")).replace(/v/gi, (c) => (c === "V" ? "B" : "b"))),
  },
  { name: "por-favor", fn: (b) => (b.id.startsWith("c") ? null : `${b.text.replace(/[.\s]+$/, "")}, por favor`) },
];

/* LAS EXCEPCIONES DECLARADAS DE CANON (puerto 1.3.457, con su
 * acta — la misma disciplina de la batería del banco): lo que la
 * reparación sin contexto no puede decidir sin adivinar.
 * - «chage the currency to cordobas»: «chage» está a una letra
 *   caída de «change» Y de «charge» — empate de fuerza, la
 *   reparación no adivina. La colisión nace en canon: la tanda de
 *   la Ola 68 metió «charge» en el diccionario (la copia de la
 *   rama no la trae, y allá el espécimen se cura solo). Del otro
 *   lado, «chrge» sí repara a «charge» sin empate, y la orden con
 *   «change» bien escrito entra entera. Cada texto exacto se
 *   declara aquí, a la vista: cualquier otra rotura sigue
 *   contando. */
const MUTACIONES_RAMA_EXCEPCION = new Set<string>([
  "chage the currency to cordobas",
]);

describe("mutaciones de la rama · la onda hostil sobre los escalones del agente", () => {
  it("cada mutación de forma deja el resultado del escalón intacto", () => {
    const fails: string[] = [];
    const porMut = new Map<string, number>();
    const porEscalon = new Map<string, number>();
    let runs = 0;
    for (const b of BASES) {
      const expected = b.run(b.text);
      for (const m of MUTS) {
        const t = m.fn(b);
        if (t === null) continue;
        if (MUTACIONES_RAMA_EXCEPCION.has(t)) continue;
        runs++;
        let got: string;
        try { got = b.run(t); } catch { got = "ERROR"; }
        if (got !== expected) {
          fails.push(`${b.id} [${m.name}] «${t}» → ${got} ≠ ${expected}`);
          porMut.set(m.name, (porMut.get(m.name) ?? 0) + 1);
          const esc = b.id[0] === "r" ? "relato" : b.id[0] === "p" ? "programa" : b.id[0] === "o" ? "orden" : "crear";
          porEscalon.set(esc, (porEscalon.get(esc) ?? 0) + 1);
        }
      }
    }
    console.log(`MUTACIONES DE LA RAMA: ${runs} corridas sobre ${BASES.length} especímenes`);
    console.log(`  roturas por mutación: ${[...porMut.entries()].map(([k, v]) => `${k}=${v}`).join(", ") || "ninguna"}`);
    console.log(`  roturas por escalón: ${[...porEscalon.entries()].map(([k, v]) => `${k}=${v}`).join(", ") || "ninguna"}`);
    console.log(`ROTURAS DE LA RAMA (${fails.length}):\n${fails.slice(0, 120).join("\n")}`);
    assert.equal(fails.length, 0, `${fails.length} promesas de la rama se rompieron`);
  });
});
