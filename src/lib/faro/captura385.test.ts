/* captura385 — EL ANUNCIO OFRECE TODAS (1.3.385, Oscar): el pliegue ya
 * guardaba toda nota no vista junto a las diez, pero el anuncio de la
 * primera apertura presentaba SOLO la grande más nueva — quien se
 * perdía tres actualizaciones importantes veía una y las otras dos
 * quedaban mudas. Desde esta ola el anuncio es una SERIE: todas las
 * grandes sin ver, de la más nueva a la más vieja, navegable (flechas
 * y deslizar), cada tarjeta con la puerta de su nota cuando la nota
 * nombra un lugar. Terminar la serie — o tomar una puerta — marca la
 * versión como vista; cerrarla sin terminar no marca nada.
 *
 * La cerca clava: la serie completa y en orden; announcementFor como
 * su primera; las menores jamás en la serie; y las superficies (el
 * shell anuncia con la serie; el dock rinde navegación, puerta y
 * cierre sin marcar). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { announcementFor, announcementsFor } from "./novedades.ts";
import { FARO_VERSION } from "./build-version.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("385 · la serie ofrece TODAS las grandes sin ver, en orden", () => {
  const serie = announcementsFor("1.3.344", FARO_VERSION);
  assert.ok(serie.length > 3, `la serie trae la pila entera (${serie.length})`);
  assert.equal(serie[0].version, "1.3.456"); // la más nueva primero (1.3.456, la grande de la caja que obedece; antes la 1.3.455 de la calma al escribir, la 1.3.454 de la campaña de mutaciones, la 1.3.453 del área de ahorros mapeada, la 1.3.452 del paquete 57–60 del banco, la 1.3.450 de las figuras que se dibujan, la 1.3.448 de crear preguntando, la 1.3.447 del Asesor que obedece, la 1.3.446 de programar contándolo, la 1.3.445 del relato que se asienta, la 1.3.420 del Manual premium, y antes la 1.3.408 — la expectativa se mueve con cada grande, y la de la 408 quedó desactualizada en silencio hasta que la suite de la 409 corrió con el sello ya en 1.3.408)
  assert.ok(serie.every((n) => n.level === "grande"), "solo grandes: las menores viven en Ajustes");
  const vs = serie.map((n) => n.version);
  assert.deepEqual(vs, [...vs].sort().reverse(), "de la más nueva a la más vieja");
  assert.ok(!vs.includes("1.3.384") && !vs.includes("1.3.385"), "las menores del tramo no entran");
  // announcementFor sigue siendo la primera de la serie.
  assert.equal(announcementFor("1.3.344", FARO_VERSION)?.version, serie[0].version);
  // Nada sin ver → serie vacía (silencio).
  assert.deepEqual(announcementsFor(FARO_VERSION, FARO_VERSION), []);
  // Las grandes sin ver desde la 1.3.400 vista: la 1.3.408, la 1.3.420,
  // la 1.3.445, la 1.3.446, la 1.3.447, la 1.3.448, la 1.3.450, la
  // 1.3.452, la 1.3.453, la 1.3.454, la 1.3.455 y la 1.3.456, en orden — la serie las ofrece todas, como manda esta cerca.
  const una = announcementsFor("1.3.400", FARO_VERSION);
  assert.deepEqual(una.map((n) => n.version), ["1.3.456", "1.3.455", "1.3.454", "1.3.453", "1.3.452", "1.3.450", "1.3.448", "1.3.447", "1.3.446", "1.3.445", "1.3.420", "1.3.408"]);
});

test("385 · las superficies: el shell anuncia la serie; el dock la rinde entera", () => {
  const shell = read("../../components/faro/shell.tsx");
  assert.match(shell, /announcementsFor\(seen, FARO_VERSION\)/);
  assert.match(shell, /topic: entry\.topic/);
  const dock = read("../../components/faro/bank-dock.tsx");
  for (const anchor of ["news-card", "news-ok", "news-next", "news-prev", "news-count", "news-door", "news-close"]) {
    assert.ok(dock.includes(`data-anchor="${anchor}"`), anchor);
  }
  // La puerta y el Entendido final marcan visto; la ✕ no toca la marca.
  assert.match(dock, /localStorage\.setItem\("faro-news-seen", news\.current\)/);
  assert.match(dock, /goTopic\(doorTopic\.id, doorGo, "news"\)/);
});
