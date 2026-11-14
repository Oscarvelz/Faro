/**
 * FARO 1.3.270 — «El icono de Ingresos» (orden de Oscar, 2026-11-13 19:25 EST).
 *
 * Su orden: «Ingresos adoptó el mismo icono que Libros. Dale su propio
 * icono por favor a Ingresos, sin que se parezca al de Libros. Y mejora
 * el que tenía antes, que era la flecha hacia abajo. Que sea otro más
 * pulido y mejor.» El estudio (faro-ingicon-study, copia prístina de la
 * 1.3.259) probó en el DOM el problema: el SVG de la lente «Ingresos» y
 * el del botón «Libros» del muelle tenían el mismo innerHTML, trazo a
 * trazo — una sola clave (SECTION_ICON.income = BookCopy) servía a dos
 * significados. BookCopy es de Libros (su elección enfática, 1.3.245) y
 * no se mueve; lo que necesitaba glifo propio era todo asiento que
 * significa INGRESOS.
 *
 * LA CORRECCIÓN (2026-11-14 09:24 EST, declarada sin rodeos): la primera
 * elección de esta ola leyó mal su «más pulido y mejor» y propuso
 * ArrowDownToLine — la flecha de antes, terminada. Oscar la retiró a los
 * sesenta segundos: «Te dije que no queria flecha hacia abajo. Que le
 * buscaras un icono mejor.» Su «que sea otro» era OTRO icono: la familia
 * entera de la flecha descendente quedó fuera (ArrowDownToLine,
 * CircleArrowDown, BanknoteArrowDown, y Import — flecha que entra en
 * bandeja — con ella), y se retiró ANTES de que nada se publicara con
 * ella. Los finalistas sin flecha se renderizaron a tamaño verdadero
 * (la lente pinta a 17px) en Tron y en claro: HandCoins — la mano que
 * recibe, la favorita en el papel — salió densa a 17px, un nudo que hay
 * que descifrar (la advertencia del estudio, confirmada en banco);
 * CircleDollarSign es nítido pero clava «Ingresos» al signo de UNA
 * moneda en un libro que vive en córdobas y dólares. La elección es
 * Coins: dos monedas, lectura instantánea en los dos temas, sin flecha,
 * sin signo de moneda, sin ningún parecido con el libro.
 *
 * La forma del arreglo (la del estudio): partir la clave. El muelle
 * pide su clave propia (books: BookCopy — su botón sigue yendo a la
 * sección income y llamándose «Libros»: la navegación no se entera) y
 * income: Coins alimenta los cuatro asientos de Ingresos — la lente de
 * Libros, el riel lateral, la burbuja de la ventana flotante y su
 * título — que ya resolvían por la clave compartida.
 *
 * Lo que cercan estas pruebas (la conducta se prueba en banco; aquí se
 * fija la forma de la fuente):
 *  - El mapa entero, literal: solo nacen books y cambia income; ningún
 *    otro glifo de sección se mueve.
 *  - BookCopy ya no alimenta a income en ninguna línea.
 *  - El muelle pide id="books" una sola vez y nadie pide id="income"
 *    a mano en shell.tsx.
 *  - Los cuatro asientos siguen resolviendo por la clave (las listas
 *    BOOKS/TOP_BOOKS llevan "income"; la lente y el riel pintan id={id};
 *    la burbuja y el título de la flotante pintan id={section}).
 *  - Coins viene de lucide-react y ya vivía importado en la casa.
 */
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const icons = src("../../components/faro/icons.tsx");
const shell = src("../../components/faro/shell.tsx");

const mapEntries = () => {
  const block = icons.split("const SECTION_ICON")[1].split("};")[0];
  const clean = block.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  const out: Record<string, string> = {};
  for (const m of clean.matchAll(/(\w+):\s*(\w+),/g)) out[m[1]] = m[2];
  return out;
};

describe("1.3.270 — el icono de Ingresos (la clave se parte)", () => {
  it("el mapa entero es el esperado: nace books y income gana glifo propio", () => {
    assert.deepEqual(mapEntries(), {
      desk: "LayoutDashboard",
      books: "BookCopy",
      income: "Coins",
      fixed: "Lock",
      variable: "Waves",
      shops: "ShoppingBag",
      subs: "RefreshCw",
      stats: "BarChart3",
      advice: "Compass",
      settings: "Settings",
      archivo: "Archive",
      historial: "History",
    });
  });

  it("ninguna línea vuelve a alimentar income con BookCopy", () => {
    assert.ok(!icons.includes("income: BookCopy"));
    assert.ok(!icons.includes("income: ArrowDownToLine"));
    assert.ok(!icons.includes("income: HandCoins"));
    assert.ok(!icons.includes("income: CircleDollarSign"));
  });

  it("el muelle pide la clave books una sola vez, junto a su rótulo y su destino de siempre", () => {
    const hits = shell.split("\n").filter((l) => l.includes('<SectionIcon id="books" />'));
    assert.equal(hits.length, 1);
    assert.ok(shell.includes('onSection("income")'));
    assert.ok(shell.includes('{t("hub.books")}'));
    assert.ok(!shell.includes('<SectionIcon id="income" />'));
  });

  it("los cuatro asientos de Ingresos siguen resolviendo por la clave compartida", () => {
    assert.ok(shell.includes('const BOOKS = ["income", "fixed", "variable", "shops", "subs"]'));
    assert.ok(shell.includes('const TOP_BOOKS = ["income", "fixed", "variable", "shops"]'));
    // lente de Libros y riel lateral: pintan el id de la lista
    const byId = shell.split("\n").filter((l) => l.includes("<SectionIcon id={id}"));
    assert.ok(byId.length >= 2);
    // burbuja (size-5) y título (size-3.5) de la ventana flotante: el id de la sección
    assert.ok(shell.includes('<SectionIcon id={section} className="size-5" />'));
    assert.ok(shell.includes('<SectionIcon id={section} className="size-3.5" />'));
  });

  it("Coins viene de lucide-react, importado en el bloque de la casa", () => {
    const importBlock = icons.split('from "lucide-react"')[0];
    assert.ok(importBlock.split("\n").some((l) => l.trim() === "Coins,"));
    assert.ok(importBlock.split("\n").some((l) => l.trim() === "BookCopy,"));
  });
});
