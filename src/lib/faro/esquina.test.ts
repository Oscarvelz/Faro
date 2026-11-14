// 1.3.252 — «El + en su esquina» (Oscar, 2026-11-13, fotos 234851-234853):
// en «Ingresos variables», cuando el título ocupa dos líneas, el «+» cae
// DEBAJO del lápiz en vez de quedarse en su esquina — «prácticamente parece
// un error». El censo lo probó en el código y en el banco: el encabezado de
// los libros (LinesBlock, screens.tsx) es `.row.income-head` con el título
// y UN `<span class="row">` para el grupo de acciones (moneda?, filtro?,
// lápiz del kit, «+»). fix5 (styles.css) ya había dejado el ENCABEZADO en
// nowrap y el título con min-width: 0 — pero el GRUPO seguía siendo una
// fila genérica: contenedor flexible que envuelve y elemento flexible que
// encoge. Cuando el título pide el ancho de su segunda línea, el encogido
// flex compartido también le quita ancho al grupo, y el grupo se envuelve
// POR DENTRO: el «+», su última pieza, cae a una segunda línea bajo el
// lápiz (reproducido en banco: Δ40-46px, grupo de 72-84px de alto, en
// Gastos variables e Ingresos variables, cerrado y con el editor abierto).
// La ley que estas cercas guardan: las acciones nunca salen de su esquina —
// el grupo es flex:none + nowrap y el título es el único que cede, la
// misma forma que la casa ya usa en .rp-tools (Remesas). La fila genérica
// .row NO se toca: otras superficies envuelven legítimamente con ella.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
const bookKitCss = fs.readFileSync(new URL("../../components/faro/book-kit.css", import.meta.url), "utf8");
const remitCss = fs.readFileSync(new URL("../../components/faro/remit-people.css", import.meta.url), "utf8");

const count = (src: string, needle: string) => src.split(needle).length - 1;

test("esquina: el grupo de acciones del encabezado no encoge ni envuelve — flex:none + nowrap", () => {
  assert.ok(
    css.includes(".card > .income-head > .row { flex: none; flex-wrap: nowrap; }"),
    "the corner group is pinned: it can neither shrink nor wrap inside itself",
  );
});

test("esquina: las guardas de fix5 quedan — el encabezado no envuelve y el título es el que cede", () => {
  assert.ok(css.includes(".card > .income-head { flex-wrap: nowrap; }"), "the head itself still never wraps");
  assert.ok(css.includes(".card > .income-head > h2 { min-width: 0; text-wrap: balance; }"), "the title still yields (min-width: 0) and wraps inside its own space");
});

test("esquina: UN solo encabezado compartido para los seis libros, con la pareja en su orden asentado", () => {
  assert.equal(count(screens, 'className="row income-head"'), 1, "LinesBlock renders the one shared head");
  const head = screens.slice(screens.indexOf('className="row income-head"'), screens.indexOf('className="row income-head"') + 2600);
  assert.ok(head.includes("<BookKit"), "the kit pencil lives in the corner group");
  assert.ok(head.includes('data-anchor="book-add"'), "the + lives in the corner group");
  assert.ok(head.indexOf("<BookKit") < head.indexOf('data-anchor="book-add"'), "the settled order stands: pencil first, then the +");
  assert.equal(count(screens, "<LinesBlock"), 6, "the six books ride the shared head (fijos/variables de ingresos y gastos, Compras, Cuotas)");
});

test("esquina: la fila genérica .row sigue envolviendo — otras superficies dependen de ello", () => {
  assert.ok(css.includes(".row{flex-wrap:wrap;align-items:center;gap:8px;display:flex}"), "the generic row is untouched: the cure is scoped to the head's group, not the utility");
});

test("esquina: los ejemplares sanos de la misma familia no se tocan", () => {
  assert.ok(bookKitCss.includes(".kit-row { flex-wrap: nowrap;"), "the savings kit-row keeps its own nowrap guard");
  assert.ok(remitCss.includes(".rp-tools { display: inline-flex; align-items: center; gap: 6px; flex: none; }"), "the Remesas tools keep the flex:none shape this wave mirrors");
});
