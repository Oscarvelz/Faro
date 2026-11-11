// Los nombres propios en las ayudas (1.3.209): cada nombre que el texto subraya con puntos es una
// referencia de verdad. Como el lint de Brizna (manual-lint), esta suite prueba el registro entero:
// todo término de LINKS llega a un tema que existe y tiene destino; todo [[Término]] escrito en la
// prosa del manual resuelve; y todo NAME_TERMS nombra algo que existe en la app (un término de
// LINKS, el título de un tema, una entrada del índice o una etiqueta de las cadenas de la interfaz).
// Sin decoración punteada sobre palabras ordinarias: si un nombre no se puede probar, no se subraya.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { LINKS, NAME_TERMS, linkDest } from "../manual/links.ts";
import { MANUAL_TOPICS, findTopic } from "../manual/topics.ts";

const PROSE = ["what", "whatAlt", "bubble", "how", "tip"] as const;

describe("nombres: el registro de enlaces", () => {
  it("todo término de LINKS nombra un tema que existe", () => {
    for (const [term, id] of Object.entries(LINKS)) {
      assert.ok(findTopic(id), `LINKS["${term}"] → "${id}" no es un tema`);
    }
  });

  it("todo término de LINKS tiene destino (tema con go o LINK_GO)", () => {
    for (const term of Object.keys(LINKS)) {
      assert.ok(linkDest(term), `LINKS["${term}"] no resuelve a ningún destino`);
    }
  });

  it("todo [[Término]] de la prosa resuelve a un destino", () => {
    const dead: string[] = [];
    for (const tp of MANUAL_TOPICS) {
      for (const f of PROSE) {
        const pair = tp[f];
        if (!pair) continue;
        for (const lang of [0, 1] as const) {
          for (const m of pair[lang].matchAll(/\[\[([^\]]+)\]\]/g)) {
            if (!linkDest(m[1])) dead.push(`${tp.id}.${f}[${lang ? "EN" : "ES"}]: [[${m[1]}]]`);
          }
        }
      }
    }
    assert.deepEqual(dead, [], `enlaces sin destino:\n${dead.join("\n")}`);
  });
});

describe("nombres: NAME_TERMS nombra cosas que existen", () => {
  const titles = new Set<string>();
  const indexed = new Set<string>();
  const wheres: string[] = [];
  for (const tp of MANUAL_TOPICS) {
    titles.add(tp.title[0]);
    titles.add(tp.title[1]);
    for (const pr of tp.terms ?? []) {
      indexed.add(pr[0]);
      indexed.add(pr[1]);
    }
    if (tp.go) wheres.push(tp.go.where[0], tp.go.where[1]);
  }
  const i18n = fs.readFileSync(new URL("./i18n.ts", import.meta.url), "utf8");
  const exists = (name: string) =>
    name in LINKS || titles.has(name) || indexed.has(name) || wheres.some((w) => w.includes(name)) || i18n.includes(`"${name}"`);

  it("cada NAME_TERM existe en la app", () => {
    for (const name of NAME_TERMS) assert.ok(exists(name), `NAME_TERMS: "${name}" no nombra nada que exista`);
  });

  it("sin duplicados en NAME_TERMS", () => {
    assert.equal(new Set(NAME_TERMS).size, NAME_TERMS.length);
  });
});

describe("nombres: la familia de los lentes", () => {
  it("Tengo y Gastaré se tratan como nombres en su propia prosa", () => {
    assert.ok(NAME_TERMS.includes("Tengo"));
    assert.ok(NAME_TERMS.includes("Gastaré"));
  });

  it("Pagos se escribe como referencia en su propio texto (su nombre no va a NAME_TERMS: «pagos» también es palabra común)", () => {
    const pagos = findTopic("pagos");
    assert.ok(pagos);
    assert.ok(pagos.what[0].includes("[[Pagos]]"), "pagos.what ES debe abrir con [[Pagos]]");
    assert.ok(pagos.what[1].includes("[[Payments]]"), "pagos.what EN debe abrir con [[Payments]]");
    assert.ok(linkDest("Pagos") && linkDest("Payments"));
  });
});

describe("nombres: la marca punteada (valores de Brizna)", () => {
  const css = fs.readFileSync(new URL("../../components/faro/manual.css", import.meta.url), "utf8");
  const rule = (sel: string) => {
    const at = css.indexOf(`${sel} {`);
    assert.ok(at >= 0, `falta la regla ${sel}`);
    return css.slice(at, css.indexOf("}", at));
  };

  it(".faro-name lleva los valores de .name-ref de Brizna, palabra por palabra", () => {
    const r = rule(".faro-name");
    assert.match(r, /text-decoration-line: underline/);
    assert.match(r, /text-decoration-style: dotted/);
    assert.match(r, /text-decoration-thickness: 1px/);
    assert.match(r, /text-underline-offset: 0\.2em/);
    assert.match(r, /text-decoration-color: color-mix\(in srgb, currentColor 62%, transparent\)/);
    assert.match(r, /font-weight: inherit/);
  });

  it(".term-link en reposo lleva la misma marca (una sola lectura para todo nombre)", () => {
    const r = rule(".term-link");
    assert.match(r, /text-decoration-style: dotted/);
    assert.match(r, /text-underline-offset: 0\.2em/);
    assert.match(r, /text-decoration-color: color-mix\(in srgb, currentColor 62%, transparent\)/);
  });
});
