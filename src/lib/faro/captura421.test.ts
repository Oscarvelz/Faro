/**
 * Captura 421 — el espacio desplegado lleva el nombre de su ficha.
 *
 * Oscar (2026-11-22, con fotos de los tres lentes desplegados): la lista
 * que se despliega de Tengo/Gastaré/Pagos se abría con una descripción
 * («Entra este mes», «Oportunidad de mejora», el semáforo) y no con el
 * nombre de la ficha; y la vista de un bolsillo de Ahorros se encabezaba
 * con su clase («Proyectos») y no con su nombre. La 421 pone el nombre
 * por cabecera en los dos espacios.
 *
 * ENMIENDA 1.3.427 (Oscar, 19:38–19:41, tres fotos más): la cabecera ya
 * no es barrita + nombre — lleva la CARA de la ficha (su rótulo
 * «lens-kicker» con su ícono, su fuente y su color). Las clavijas de la
 * barrita se retiran de esta cerca; la cara vive en captura427.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const styles = read("../../styles.css");

test("421 · la lista de un lente se abre con el nombre de la ficha", () => {
  assert.ok(screens.includes('data-anchor="desk-focus-head"'), "la cabecera existe en la lista");
  assert.ok(screens.includes('lensMode !== "all"'), "solo cuando un lente está encendido");
  for (const key of ['"desk.have"', '"desk.debt"', '"desk.spend"']) {
    assert.ok(screens.includes(key), `el nombre sale de la misma llave de la ficha: ${key}`);
  }
  const head = screens.slice(screens.indexOf("desk-focus-head"), screens.indexOf("desk-focus-head") + 700);
  assert.ok(head.includes("lens-kicker"), "la cabecera lleva el rótulo de su ficha (enmienda 427)");
  assert.ok(head.includes("lens-mark"), "el rótulo lleva su marca con el ícono (enmienda 427)");
  assert.ok(head.includes("tone-${summary.tone}"), "Pagos viste el tono de su semáforo");
});

test("421 · la vista de un bolsillo se encabeza con su nombre, no con su clase", () => {
  assert.ok(screens.includes("<strong>{openSeg.name}</strong>"), "la vista lleva el nombre del bolsillo");
  assert.ok(!screens.includes('t("vault.projects")'), "la clase genérica ya no encabeza la vista");
});

test("421 · la cabecera tiene su forma en styles.css", () => {
  for (const pin of [".desk-focus-head", ".desk-focus-head .lens-kicker", ".desk-focus-head .lens-mark"]) {
    assert.ok(styles.includes(pin), `falta la regla ${pin}`);
  }
});
