/**
 * captura353 — la ronda de las fotos de Oscar (2026-11-20, «Una sola
 * selección»): los botones de Central muestran su selección y solo hay
 * una a la vez; Pagos entra al sistema con su propio selector; Escribir
 * ya no expulsa a nadie de su hoja y «pesos» es córdobas; la pregunta
 * del Asesor vive en su tarjeta sobre la respuesta; y el botón de la
 * presentación en la búsqueda toma la tinta del tema.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parsePhrase, type ParseCtx } from "./textparse.ts";
import { NEWS } from "./novedades.ts";
import type { LedgerState } from "./types.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const styles = read("../../styles.css");
const tron = read("../../components/faro/tron.css");

function ledger(extra?: Partial<LedgerState>): LedgerState {
  return {
    v: 1,
    structure: { categories: [], purchases: [], catalog: [], groups: [] } as unknown as LedgerState["structure"],
    months: {},
    settings: {} as LedgerState["settings"],
    imports: { rules: [], seen: [] },
    ...extra,
  } as LedgerState;
}

let seq = 0;
const ctx = (over?: Partial<ParseCtx>): ParseCtx => ({
  ledger: ledger(),
  lang: "es",
  today: "2026-11-20",
  display: "USD",
  makeId: () => `d${++seq}`,
  now: "2026-11-20T15:00:00.000Z",
  ...over,
});

describe("353 · el intérprete: «pesos» es córdobas (la frase de Oscar)", () => {
  it("«Me compre 200 pesos de caramelo» nace entera: monto, NIO, concepto limpio", () => {
    const [d] = parsePhrase("Me compre 200 pesos de caramelo", ctx());
    assert.equal(d.amountMinor, 20000);
    assert.equal(d.currency, "NIO");
    assert.equal(d.sign, "out");
    assert.equal(d.concept, "Caramelo");
    assert.ok(!d.missing.includes("amount"), "el monto ya no se pierde tras la palabra");
    assert.ok(!d.missing.includes("currency"));
  });

  it("las variantes de la casa no se rompen: nicaragüenses, dólares, C$", () => {
    const [a] = parsePhrase("300 pesos nicaragüenses en el mercado", ctx());
    assert.equal(a.currency, "NIO");
    assert.equal(a.amountMinor, 30000);
    const [b] = parsePhrase("pagué 300 dólares de luz", ctx());
    assert.equal(b.currency, "USD");
    const [c] = parsePhrase("200 pesos de caramelo", ctx());
    assert.equal(c.currency, "NIO");
    assert.equal(c.concept, "Caramelo");
  });
});

describe("353 · Escribir no expulsa: el portal no es «fuera»", () => {
  it("los dos cierres por toque-fuera eximen las hojas del portal (.scn-scrim)", () => {
    const hits = screens.match(/target\.closest\("\.scn-scrim"\)/g) ?? [];
    assert.ok(hits.length >= 2, "la ventana rápida y el selector eximen el portal");
  });
});

describe("353 · una sola selección en Central", () => {
  it("el botón encendido (btnOn) cuenta también el selector, no solo el editor", () => {
    assert.match(screens, /choose === "in" \? "plus" : choose === "out" \? "minus" : choose === "due" \? "cobro"/);
  });

  it("abrir Cobros retira editor y selector (openCobrosAt y cobroTap)", () => {
    const hits = screens.match(/if \(quick \|\| choose\) \{/g) ?? [];
    assert.ok(hits.length >= 2, "ambas entradas a Cobros limpian quick y choose");
  });

  it("el botón apretado SE VE: anillo por tono en la base y en Tron", () => {
    assert.match(styles, /\.lens-wrap:has\(\.is-have\) \.lens-corner\[aria-pressed="true"\]/);
    assert.match(styles, /\.lens-wrap:has\(\.is-spend\) \.lens-corner\[aria-pressed="true"\]/);
    assert.match(styles, /\.lens-wrap:has\(\.is-debt\) \.lens-corner\[aria-pressed="true"\]/);
    assert.match(tron, /\.lens-corner\[aria-pressed="true"\]/);
  });
});

describe("353 · Pagos tiene su selector", () => {
  it("el estado del selector admite «due» y el toque de Pagos pasa por dueTap", () => {
    assert.match(screens, /useState<null \| "in" \| "out" \| "due">/);
    assert.match(screens, /function dueTap\(\)/);
    assert.ok((screens.match(/dueTap\(\);/g) ?? []).length >= 2, "el toque sencillo y el temporizado abren el selector");
  });

  it("el selector de Pagos ofrece sus cuatro destinos hacia Cobros", () => {
    for (const dest of ["owed", "owe", "dues", "loans"]) {
      assert.ok(screens.includes(`openCobrosAt("${dest}")`), `destino ${dest}`);
      assert.ok(screens.includes(`data-anchor="choose-due-${dest}"`), `ancla ${dest}`);
    }
    assert.match(styles, /\.where-sheet\.is-due \{/);
  });

  it("las palabras del selector viven en los dos idiomas", () => {
    const i18n = read("./i18n.ts");
    assert.ok(i18n.includes('"choose.due.title": "¿A qué parte de Pagos?"'));
    assert.ok(i18n.includes('"choose.due.title": "Which part of Payments?"'));
    for (const k of ["owed", "owe", "dues", "loans"]) {
      assert.ok(i18n.includes(`"choose.due.${k}.sub"`), `sub ${k}`);
    }
  });

  it("el tema de atajos cuenta el selector de Pagos, ya no la apertura directa", () => {
    const topics = read("../manual/topics.ts");
    const at = topics.indexOf('id: "atajos-mas-menos"');
    const block = topics.slice(at, at + 2400);
    assert.ok(block.includes("un toque en [[Pagos]] abre el suyo"));
    assert.ok(block.includes("a tap on [[Payments]] opens its own"));
  });
});

describe("353 · la pregunta del Asesor vive sobre la respuesta", () => {
  it("la caja rinde la tarjeta de la pregunta (asked) cuando hay resultado", () => {
    const askBox = read("../../components/faro/ask-box.tsx");
    assert.ok(askBox.includes('data-anchor="ask-q"'), "la tarjeta existe");
    assert.ok(askBox.includes("{asked}"), "y dice la pregunta hecha");
    const advisor2 = read("../../components/faro/advisor2.css");
    assert.ok(advisor2.includes(".ask-q {"), "con su acabado propio");
  });
});

describe("353 · la búsqueda: la tinta del tema, no blanco sobre amarillo", () => {
  it("el botón de la presentación usa --accent-fg y el token fantasma muere", () => {
    const pres = read("../../components/faro/presentacion.css");
    assert.match(pres, /\.pres-hit-see \{[^}]*color: var\(--accent-fg\)/);
    assert.ok(!pres.includes("--accent-ink"), "ningún resto del token que no existía");
  });
});

describe("353 · la nota de la versión", () => {
  it("la nota de la 1.3.353 es grande y rica, en los dos idiomas", () => {
    // En su ola encabezaba Novedades; desde la 354 la cabecera es de la
    // nota nueva (la cerca de la cabecera vive en novedades354).
    const mine = NEWS.find((n) => n.version === "1.3.353");
    assert.ok(mine, "la nota de la 353 existe");
    assert.equal(mine!.level, "grande");
    assert.ok(mine!.points.es.length >= 3 && mine!.points.en.length >= 3);
  });
});
