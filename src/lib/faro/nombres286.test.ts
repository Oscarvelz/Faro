// Los nombres también en la burbuja (1.3.286): el principio de 1.3.209 — todo nombre propio de
// Faro lleva la marca punteada donde aparece como nombre — llega a los textos que la burbuja (y
// el «Qué es» del Manual) muestran: what, whatAlt y bubble. Esta cerca escanea esos campos en
// ambos idiomas buscando términos de LINKS que NO están en NAME_TERMS (los de NAME_TERMS ya se
// puntean solos al renderizar) escritos SIN [[...]]: cada hallazgo debe estar declarado en
// BARE_OK con su razón — un uso como palabra común, no como nombre — o la suite falla. La
// igualdad es en los dos sentidos: un hallazgo no declarado falla, y una entrada de BARE_OK que
// ya no aparece también falla, para obligar a rejuiciar cada excepción cuando el texto cambie.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LINKS, NAME_TERMS, linkDest } from "../manual/links.ts";
import { MANUAL_TOPICS, findTopic } from "../manual/topics.ts";

const BUBBLE_FIELDS = ["what", "whatAlt", "bubble"] as const;

// Usos desnudos PERMITIDOS: la palabra aparece como palabra común, no como el nombre de la
// función, la pantalla o el libro. Cada entrada: [tema, campo, idioma (0=ES, 1=EN), término,
// cuántas veces]. Si un texto cambia y la cuenta deja de cuadrar, la cerca obliga a rejuiciar.
const BARE_OK: ReadonlyArray<readonly [string, string, 0 | 1, string, number]> = [
  // «Pagos que se repiten, como plataformas o inscripciones»: pagos recurrentes en general,
  // no el botón Pagos de Central.
  ["debo", "what", 0, "Pagos", 1],
  ["debo", "what", 1, "Payments", 1],
  // «Payments are kept in that currency»: los pagos del préstamo, no el botón Pagos.
  ["f-prestamo-moneda", "what", 1, "Payments", 1],
  // «Queda anotado en la tarjeta»: el verbo quedar, no la lectura Queda de Central.
  ["f-bono-fecha", "what", 0, "Queda", 1],
  // «Left empty, it is today»: el participio de leave, no la lectura Left.
  ["f-cobro-fecha", "what", 1, "Left", 1],
  ["f-cuota-proximo", "what", 1, "Left", 1],
  // «cuántos Pagos» / «how many Payments»: el conteo de pagos del bote, entre sus contadores.
  ["bote", "what", 0, "Pagos", 1],
  ["bote", "what", 1, "Payments", 1],
  // «PayPal Ahorros» / «PayPal Savings»: el producto de un tercero; marcarlo saltaría al
  // libro Ahorros de Faro, que es otra cosa.
  ["imp-paypal", "what", 0, "Ahorros", 1],
  ["imp-paypal", "what", 1, "Savings", 1],
  ["imp-pdf", "what", 0, "Ahorros", 1],
  ["imp-pdf", "what", 1, "Savings", 1],
  ["imp-ahorros-paypal", "what", 0, "Ahorros", 1],
  ["imp-ahorros-paypal", "what", 1, "Savings", 1],
  // La misma razón en las burbujas breves de la 1.3.341: «PayPal Ahorros» /
  // «PayPal Savings» es el producto del banco, no el libro de Faro.
  ["imp-pdf", "bubble", 0, "Ahorros", 1],
  ["imp-pdf", "bubble", 1, "Savings", 1],
  ["imp-ahorros-paypal", "bubble", 0, "Ahorros", 1],
  ["imp-ahorros-paypal", "bubble", 1, "Savings", 1],
  // «separated into Income and Expense»: las etiquetas de los grupos por signo de la búsqueda
  // de fijas (1.3.267), no el libro Ingresos.
  ["widget-android", "whatAlt", 1, "Income", 1],
  // «born with the Complete base»: la base de PLANTILLAS (StructureBase «completa» = todo
  // visible), un concepto anterior a los tres modos que comparte la palabra; marcarlo
  // saltaría al tema de los modos, que es otra cosa. Declarado en la etapa 1 de los modos,
  // cuando «Complete» entró en LINKS como nombre del modo.
  ["plantillas", "what", 1, "Complete", 1],
  // «where Scan statement saves your account value»: «Scan statement» es el lector de
  // ESTADOS de cuenta (Leer estado), no el [[Scan]] de recibos; marcarlo saltaría al
  // tema de escanear recibos, que es otra función. Declarado en la 1.3.333, cuando
  // «Scan» entró en LINKS como el nombre nuevo del botón de la cámara.
  ["retiro-primerica", "what", 1, "Scan", 1],
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LINK_ONLY = Object.keys(LINKS)
  .filter((t) => !NAME_TERMS.includes(t))
  .sort((a, b) => b.length - a.length);

function bareHits(text: string): string[] {
  const masked = text.replace(/\[\[[^\]]+\]\]/g, (m) => " ".repeat(m.length));
  const taken: Array<[number, number]> = [];
  const hits: string[] = [];
  for (const term of LINK_ONLY) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc(term)}(?![\\p{L}\\p{N}])`, "gu");
    for (const m of masked.matchAll(re)) {
      const at = m.index ?? 0;
      if (taken.some(([a, b]) => at >= a && at < b)) continue;
      taken.push([at, at + term.length]);
      hits.push(term);
    }
  }
  return hits;
}

describe("nombres286: ningún nombre desnudo en los textos de burbuja", () => {
  it("todo nombre de LINKS en what/whatAlt/bubble va marcado con [[...]], salvo los BARE_OK declarados", () => {
    const found = new Map<string, number>();
    for (const tp of MANUAL_TOPICS) {
      for (const f of BUBBLE_FIELDS) {
        const pair = tp[f];
        if (!pair) continue;
        for (const lang of [0, 1] as const) {
          for (const term of bareHits(pair[lang])) {
            const key = `${tp.id}|${f}|${lang}|${term}`;
            found.set(key, (found.get(key) ?? 0) + 1);
          }
        }
      }
    }
    const allowed = new Map<string, number>();
    for (const [id, f, lang, term, n] of BARE_OK) allowed.set(`${id}|${f}|${lang}|${term}`, n);
    const problems: string[] = [];
    for (const [key, n] of found) {
      if (allowed.get(key) !== n) problems.push(`desnudo no declarado: ${key} ×${n}`);
    }
    for (const [key, n] of allowed) {
      if (found.get(key) !== n) problems.push(`BARE_OK caducado: ${key} esperaba ×${n}, hay ×${found.get(key) ?? 0}`);
    }
    assert.deepEqual(problems, [], problems.join("\n"));
  });
});

describe("nombres286: los dos señalamientos de Oscar (2026-11-15)", () => {
  it("cuentas abre su texto con el nombre marcado, en los dos idiomas", () => {
    const t = findTopic("cuentas");
    assert.ok(t);
    assert.ok(t.what[0].startsWith("[[Cuentas]]"), "cuentas.what ES debe abrir con [[Cuentas]]");
    assert.ok(t.what[1].startsWith("[[Accounts]]"), "cuentas.what EN debe abrir con [[Accounts]]");
  });

  it("ahorros-banda nombra [[Ahorros]] / [[Savings]] en su texto", () => {
    const t = findTopic("ahorros-banda");
    assert.ok(t);
    assert.ok(t.what[0].includes("[[Ahorros]]"), "ahorros-banda.what ES debe marcar [[Ahorros]]");
    assert.ok(t.what[1].includes("[[Savings]]"), "ahorros-banda.what EN debe marcar [[Savings]]");
  });

  it("el consejo de ahorros-banda admite los asientos verdaderos del apartado, con nombres que saltan", () => {
    const t = findTopic("ahorros-banda");
    assert.ok(t);
    const tip = t.tip;
    assert.ok(tip, "ahorros-banda debe llevar consejo");
    for (const mark of ["[[Meta de ahorro]]", "[[Libros]]", "[[Ahorros]]", "[[Apartado del mes]]"]) {
      assert.ok(tip[0].includes(mark), `ahorros-banda.tip ES debe llevar ${mark}`);
    }
    for (const mark of ["[[Savings goal]]", "[[Books]]", "[[Savings]]", "[[Set aside this month]]"]) {
      assert.ok(tip[1].includes(mark), `ahorros-banda.tip EN debe llevar ${mark}`);
    }
    assert.equal(linkDest("Apartado del mes")?.topic, "apartado-mes");
    assert.equal(linkDest("Set aside this month")?.topic, "apartado-mes");
  });
});
