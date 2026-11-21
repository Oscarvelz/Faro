/* 1.3.354 — Novedades que saltan (orden de Oscar, 2026-11-20).
 * Cada nota que nombra un lugar lleva su puerta: un clic lleva a esa
 * función por la vía del Manual (goTopic) y atrás devuelve a
 * Novedades; sin lugar navegable, la nota queda texto. Y el retiro:
 * el pliegue guarda las diez más recientes, pero una nota aún no
 * vista nunca desaparece sin verse. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findTopic } from "../manual/topics.ts";
import { NEWS, NEWS_KEEP, cmpVersion, visibleNews } from "./novedades.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("354 · el pliegue muestra las diez recientes, en su orden", () => {
  assert.equal(NEWS_KEEP, 10);
  const vis = visibleNews(null);
  assert.equal(vis.length, Math.min(NEWS_KEEP, NEWS.length));
  assert.deepEqual(vis.map((n) => n.version), NEWS.slice(0, NEWS_KEEP).map((n) => n.version));
  // Con todo visto (seen = la versión vigente), el mismo corte.
  const vis2 = visibleNews(NEWS[0].version);
  assert.deepEqual(vis2.map((n) => n.version), vis.map((n) => n.version));
});

test("354 · una nota no vista nunca desaparece sin verse", () => {
  // El teléfono quedó en la nota que sigue a dos tras el corte de
  // diez: esas dos notas (índices 10 y 11) son suyas sin ver y
  // conviven junto a las diez hasta que se vean.
  const seen = NEWS[NEWS_KEEP + 2].version;
  const vis = visibleNews(seen);
  assert.equal(vis.length, NEWS_KEEP + 2);
  assert.ok(vis.some((n) => n.version === NEWS[NEWS_KEEP].version), "la primera tras el corte sigue");
  assert.ok(vis.some((n) => n.version === NEWS[NEWS_KEEP + 1].version), "la segunda tras el corte sigue");
  // Y el orden sigue siendo el de NEWS: de la más nueva a la más vieja.
  for (let i = 1; i < vis.length; i++) assert.ok(cmpVersion(vis[i - 1].version, vis[i].version) > 0);
  // Lo ya visto y viejo sí se retira.
  const old = NEWS[NEWS.length - 1];
  if (cmpVersion(old.version, seen) <= 0) assert.ok(!vis.some((n) => n.version === old.version));
});

test("354 · cada puerta nombra un tema real del Manual, con su lugar", () => {
  let doors = 0;
  for (const n of NEWS) {
    if (!n.topic) continue;
    doors++;
    const tp = findTopic(n.topic);
    assert.ok(tp, `la nota ${n.version} nombra un tema que no existe: ${n.topic}`);
    assert.ok(tp!.go, `el tema ${n.topic} no tiene lugar al que saltar`);
  }
  assert.ok(doors >= 6, "la entrega estrena puertas en las notas recientes");
  const mine = NEWS.find((n) => n.version === "1.3.354");
  assert.ok(mine && mine.level === "grande" && mine.topic === "novedades", "la nota de la entrega, con su puerta");
});

test("354 · el pliegue rinde las visibles y la puerta va por goTopic", () => {
  const screens = read("../../components/faro/screens.tsx");
  assert.match(screens, /visibleNews\(newsSeen\)/, "el pliegue rinde visibleNews, no NEWS entero");
  assert.match(screens, /data-anchor="news-go"/, "la puerta de la nota está rendida");
  assert.match(screens, /goTopic\(tp\.id, go, "novedades"\)/, "el salto va por la vía del Manual, con vuelta a Novedades");
  const css = read("../../components/faro/clusters.css");
  assert.match(css, /\.news-go \{/, "la pastilla de la puerta tiene su estilo");
  assert.match(css, /background: var\(--accent\)/, "la puerta sigue al tema elegido, nunca un color propio");
});
