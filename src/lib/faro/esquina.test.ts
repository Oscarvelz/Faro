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
//
// 1.3.335 (Oscar, 2026-11-20, con su dibujo sobre la captura): la pareja se
// disuelve POR SU ORDEN — «mueve el filtro y el lápiz en una nueva línea
// abajo… El botón para agregar queda completamente solo en la esquina… que
// se respete la soberanía del botón Agregar». El encabezado es ahora un
// bloque de dos líneas: la del título con el «+» soberano, y debajo la
// línea de herramientas (.book-tools: filtro y lápiz) a la izquierda, con
// aire, sobre la banda del mes. Y su precisión de la 01:40: «dejar solo la
// monedita al lado de agregar sería lo más sabio, puesto que la monedita es
// pequeña y no ocupa mucho espacio» — la moneda se queda en la esquina con
// el «+»; a la segunda línea bajan solo el filtro y el lápiz. La ley de la
// esquina sobrevive en su forma nueva: la fila del título nunca envuelve,
// el grupo de la esquina (moneda y «+») nunca encoge ni se envuelve por
// dentro, y el título sigue siendo el único que cede. Estas cercas se
// reescriben para juzgar LA LEY NUEVA; la pareja «lápiz primero, luego
// el +» en la misma fila queda retirada por la palabra de Oscar, no por
// un fallo.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
const bookKitCss = fs.readFileSync(new URL("../../components/faro/book-kit.css", import.meta.url), "utf8");
const remitCss = fs.readFileSync(new URL("../../components/faro/remit-people.css", import.meta.url), "utf8");

const count = (src: string, needle: string) => src.split(needle).length - 1;

test("esquina: la fila del título no envuelve y el grupo de la esquina no encoge — flex:none + nowrap", () => {
  assert.ok(
    css.includes(".card > .income-head > .income-head-top { flex-wrap: nowrap; }"),
    "the title row never wraps",
  );
  assert.ok(
    css.includes(".card > .income-head > .income-head-top > .row { flex: none; flex-wrap: nowrap; }"),
    "the corner group (the little coin and the +) can neither shrink nor wrap inside itself",
  );
  assert.ok(
    css.includes(".book-tools { display: flex; align-items: center; gap: 8px; margin-top: 8px; }"),
    "the tools live on their own second line, left-aligned, with air above them",
  );
});

test("esquina: las guardas de fix5 quedan — el título es el que cede", () => {
  assert.ok(css.includes(".card > .income-head h2 { min-width: 0; text-wrap: balance; }"), "the title still yields (min-width: 0) and wraps inside its own space");
});

test("esquina: UN solo encabezado compartido para los seis libros, con el «+» soberano y las herramientas en su línea", () => {
  assert.equal(count(screens, 'className="income-head"'), 1, "LinesBlock renders the one shared head");
  const head = screens.slice(screens.indexOf('className="income-head"'), screens.indexOf('className="income-head"') + 3400);
  assert.ok(head.includes('data-anchor="book-add"'), "the + lives in the head");
  assert.ok(head.includes('className="book-tools"'), "the tools line exists in the head");
  assert.ok(head.indexOf('data-anchor="book-add"') < head.indexOf('className="book-tools"'), "the + sits in the FIRST line, in its corner — the tools line comes after");
  // Oscar, precisión de la 01:40: la monedita se queda junto al Agregar —
  // es pequeña y no ocupa espacio; a la segunda línea bajan SOLO el filtro
  // y el lápiz.
  assert.ok(head.indexOf('data-anchor="book-coin"') < head.indexOf('data-anchor="book-add"'), "the little coin keeps the + company in the corner: coin first, then the +");
  const tools = head.slice(head.indexOf('className="book-tools"'));
  assert.ok(!tools.includes('data-anchor="book-coin"'), "the coin does NOT live in the tools line");
  assert.ok(tools.includes('data-anchor="book-filter"'), "the filter lives in the tools line");
  assert.ok(tools.includes("<BookKit"), "the kit pencil lives in the tools line");
  assert.ok(tools.indexOf('data-anchor="book-filter"') < tools.indexOf("<BookKit"), "the tools line order: filter, pencil");
  assert.equal(count(screens, "<LinesBlock"), 6, "the six books ride the shared head (fijos/variables de ingresos y gastos, Compras, Cuotas)");
});

test("esquina: la fila genérica .row sigue envolviendo — otras superficies dependen de ello", () => {
  assert.ok(css.includes(".row{flex-wrap:wrap;align-items:center;gap:8px;display:flex}"), "the generic row is untouched: the cure is scoped to the head's group, not the utility");
});

test("esquina: los ejemplares sanos de la misma familia no se tocan", () => {
  assert.ok(bookKitCss.includes(".kit-row { flex-wrap: nowrap;"), "the savings kit-row keeps its own nowrap guard");
  assert.ok(remitCss.includes(".rp-tools { display: inline-flex; align-items: center; gap: 6px; flex: none; }"), "the Remesas tools keep the flex:none shape this wave mirrors");
});
