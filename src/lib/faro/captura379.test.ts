import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MANUAL_TOPICS } from "../manual/topics.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const textSrc = read("../../components/faro/manual-text.tsx");
const manualSrc = read("../../components/faro/manual.tsx");
const cssSrc = read("../../components/faro/manual.css");
const topicsSrc = read("../manual/topics.ts");

// 1.3.379 — REESTRUCTURACIÓN DEL MANUAL. Fallo de Oscar (2026-11-21
// 20:27–20:51): el tema 8.1 y sus hermanos eran muros de párrafo —
// «párrafos comestibles», «no hay diseño detrás de la presentación
// utilitaria» — y su estándar permanente (20:36): la forma moldea la
// utilidad; párrafos cortos de una idea; las enumeraciones como
// grupos con renglón propio, nunca cosidas con punto y coma; la
// presentación se adapta a los temas. La información quedó intacta;
// la forma es la ola. Convención: "\n\n" separa párrafos; un bloque
// de varias líneas es un grupo (primera línea = entrada, el resto =
// renglones). Esta cerca caza la clase entera: ninguna línea del
// Manual — en ningún campo de cuerpo, en ningún idioma — pasa de 50
// palabras, y los grupos existen en número.

const words = (s: string) => s.replace(/\[\[|\]\]/g, "").trim().split(/\s+/).filter(Boolean).length;
const BODY_FIELDS = ["what", "whatAlt", "how", "tip"] as const;

test("379-1 · ningún muro: ninguna línea del Manual pasa de 50 palabras", () => {
  const bad: string[] = [];
  for (const t of MANUAL_TOPICS) {
    for (const f of BODY_FIELDS) {
      const v = (t as unknown as Record<string, unknown>)[f];
      if (!Array.isArray(v)) continue;
      v.forEach((s, li) => {
        if (typeof s !== "string") return;
        for (const block of s.split(/\n\n+/)) {
          for (const line of block.split("\n")) {
            if (line.trim() && words(line) > 50) bad.push(`${t.id}·${f}[${li}] ${words(line)}w`);
          }
        }
      });
    }
  }
  assert.deepEqual(bad, [], `líneas-muro vivas: ${bad.join(", ")}`);
});

test("379-2 · las enumeraciones viven como grupos, no cosidas", () => {
  let groups = 0;
  for (const t of MANUAL_TOPICS) {
    for (const f of BODY_FIELDS) {
      const v = (t as unknown as Record<string, unknown>)[f];
      if (!Array.isArray(v)) continue;
      for (const s of v) {
        if (typeof s !== "string") continue;
        for (const block of s.split(/\n\n+/)) {
          if (block.split("\n").filter((x) => x.trim()).length > 1) groups++;
        }
      }
    }
  }
  // Medidos tras la reescritura (1.3.379): 36 grupos. El piso queda
  // con margen: un grupo que se deshace en prosa corre rojo.
  assert.ok(groups >= 30, `grupos con renglón propio: ${groups} (piso 30)`);
});

test("379-3 · el render pinta bloques y grupos con la marca del tema", () => {
  assert.ok(textSrc.includes("export function richBlocks"), "manual-text exporta el pintor de bloques");
  assert.ok(textSrc.includes('className="mn-list"') && textSrc.includes('className="mn-p"'), "los grupos salen como lista y los párrafos como párrafo");
  assert.equal(manualSrc.split("richBlocks(").length - 1, 8, "las ocho superficies de cuerpo pintan por bloques (tema e índice, cuatro campos)");
  assert.ok(cssSrc.includes(".mn-list li::before") && cssSrc.includes("background: var(--accent)"), "la marca del renglón nace del acento del tema elegido, nunca de un color propio");
});

test("379-4 · la convención de forma vive escrita donde viven los datos", () => {
  assert.ok(topicsSrc.includes("Forma (1.3.379)"), "la cabecera de topics.ts declara la convención de bloques");
  assert.ok(topicsSrc.includes("50 palabras"), "y el tope de la cerca, para que ningún tema nazca muro");
});
