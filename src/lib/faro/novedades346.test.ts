/* 1.3.346 — Novedades y Acerca de (orden de Oscar, 2026-11-20).
 * Cada cambio mayor llega con su nota; la cerca mayor de esta entrega
 * es contra el olvido: la versión vigente SIEMPRE tiene su nota, así
 * ninguna entrega futura nace muda. Y la lógica del anuncio es pura:
 * una sola tarjeta, solo si hay algo grande sin ver. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FARO_VERSION } from "./build-version.ts";
import { NEWS, announcementFor, cmpVersion, newsBetween } from "./novedades.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("346 · la versión vigente tiene su nota — ninguna entrega nace muda", () => {
  const mine = NEWS.find((n) => n.version === FARO_VERSION);
  assert.ok(mine, `NEWS no trae nota para ${FARO_VERSION}`);
  // La 1.3.346, la entrega que estrenó las novedades, se anuncia
  // (grande). Las entregas siguientes eligen su nivel con honestidad:
  // la 1.3.347 es menor — una cura sin superficie nueva no se anuncia.
  const debut = NEWS.find((n) => n.version === "1.3.346");
  assert.equal(debut!.level, "grande", "la entrega que estrena las novedades se anuncia");
});

test("346 · las notas van de la más nueva a la más vieja, sin repetir versión", () => {
  const seen = new Set<string>();
  for (let i = 0; i < NEWS.length; i++) {
    assert.ok(!seen.has(NEWS[i].version), `versión repetida: ${NEWS[i].version}`);
    seen.add(NEWS[i].version);
    if (i > 0) assert.ok(cmpVersion(NEWS[i - 1].version, NEWS[i].version) > 0, "orden descendente");
  }
});

test("346 · cada nota habla los dos idiomas, con 1–4 puntos por idioma y el mismo conteo", () => {
  for (const n of NEWS) {
    assert.ok(n.title.es.length > 0 && n.title.en.length > 0, n.version);
    assert.equal(n.points.es.length, n.points.en.length, n.version);
    assert.ok(n.points.es.length >= 1 && n.points.es.length <= 4, n.version);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(n.date), n.version);
    if (n.level === "grande") assert.ok(n.points.es.length >= 2, `grande con un solo punto: ${n.version}`);
  }
});

test("346 · cmpVersion compara por partes", () => {
  assert.equal(cmpVersion("1.3.346", "1.3.345"), 1);
  assert.equal(cmpVersion("1.3.345", "1.3.346"), -1);
  assert.equal(cmpVersion("1.3.345", "1.3.345"), 0);
  assert.equal(cmpVersion("1.4.0", "1.3.999"), 1);
});

test("346 · el anuncio: una sola tarjeta, la grande más nueva sin ver", () => {
  // Nada sin ver → silencio.
  assert.equal(announcementFor(FARO_VERSION, FARO_VERSION), null);
  // Desde la 344: lo grande sin ver más nuevo manda. Era la 346 en su ola;
  // la sucedieron la 350, la 1.3.351, la 1.3.353 («Una sola selección»), la
  // 1.3.355 («El Asesor responde mucho más»), la 1.3.356 («Avisos y pago
  // automático»), la 1.3.357 («La lista-plan»), la 1.3.360 («La lista de
  // espera»), la 1.3.362 («Compartir con Faro») y la 1.3.365 («Tu saldo,
  // día a día»), grandes — esta expectativa se mueve con cada nota
  // grande nueva, a propósito.
  assert.equal(announcementFor("1.3.344", FARO_VERSION)?.version, "1.3.365");
  // Desde la 342 (menor): la grande más nueva del tramo es una sola, no una pila.
  assert.equal(announcementFor("1.3.342", FARO_VERSION)?.version, "1.3.365");
  // El tramo (seen, current] no incluye lo ya visto ni lo futuro.
  const tramo = newsBetween("1.3.340", "1.3.344").map((n) => n.version);
  assert.deepEqual(tramo, ["1.3.344", "1.3.343", "1.3.342"]);
});

test("346 · los asientos y las superficies existen", () => {
  const mode = read("./mode.ts");
  assert.match(mode, /"settings\.news": E/);
  assert.match(mode, /"settings\.about": E/);
  const screens = read("../../components/faro/screens.tsx");
  assert.match(screens, /<Fold id="novedades"/);
  assert.match(screens, /<Fold id="acerca"/);
  // Hasta la 353 el pliegue rendía NEWS entero; la 354 (orden de Oscar:
  // retiro de diez + excepción de lo no visto) rinde visibleNews.
  assert.match(screens, /visibleNews\(newsSeen\)\.map/);
  const shell = read("../../components/faro/shell.tsx");
  assert.match(shell, /faro-news-seen/);
  assert.match(shell, /announcementFor\(seen, FARO_VERSION\)/);
  const dock = read("../../components/faro/bank-dock.tsx");
  assert.match(dock, /data-anchor="news-card"/);
  assert.match(dock, /localStorage\.setItem\("faro-news-seen", news\.current\)/);
  const topics = read("../manual/topics.ts");
  assert.match(topics, /id: "novedades"/);
});

test("346 · el destello de lo nuevo existe y se raciona (tres latidos, no un bucle)", () => {
  const bank = read("../../components/faro/bank.css");
  assert.match(bank, /@keyframes news-ping/);
  assert.match(bank, /@keyframes news-twinkle/);
  assert.match(bank, /news-ping 2\.4s cubic-bezier\(0, 0, \.2, 1\) 3 both/);
  assert.match(bank, /prefers-reduced-motion: reduce\) \{ \.news-card-ico::after, \.news-card-ico svg/);
  const screens = read("../../components/faro/screens.tsx");
  assert.match(screens, /newsUnseen \? <span className="news-dot"/);
  const clusters = read("../../components/faro/clusters.css");
  assert.match(clusters, /\.news-dot \{/);
});
