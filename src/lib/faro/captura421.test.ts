/**
 * Captura 421 — el espacio desplegado lleva el nombre de su ficha.
 *
 * Oscar (2026-11-22, con fotos de los tres lentes desplegados): la lista
 * que se despliega de Tengo/Gastaré/Pagos se abría con una descripción
 * («Entra este mes», «Oportunidad de mejora», el semáforo) y no con el
 * nombre de la ficha; y la vista de un bolsillo de Ahorros se encabezaba
 * con su clase («Proyectos») y no con su nombre. La 421 pone el nombre
 * por cabecera en los dos espacios.
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
  const head = screens.slice(screens.indexOf("desk-focus-head"), screens.indexOf("desk-focus-head") + 500);
  assert.ok(head.includes("desk-focus-bar"), "la barra viste el tono de la ficha");
  assert.ok(head.includes("tone-${summary.tone}"), "Pagos viste el tono de su semáforo");
});

test("421 · la vista de un bolsillo se encabeza con su nombre, no con su clase", () => {
  assert.ok(screens.includes("<strong>{openSeg.name}</strong>"), "la vista lleva el nombre del bolsillo");
  assert.ok(!screens.includes('t("vault.projects")'), "la clase genérica ya no encabeza la vista");
});

test("421 · la cabecera tiene su forma en styles.css", () => {
  for (const pin of [".desk-focus-head", ".desk-focus-bar", ".desk-focus-bar.is-have", ".desk-focus-bar.is-debt.tone-warn"]) {
    assert.ok(styles.includes(pin), `falta la regla ${pin}`);
  }
});
