/**
 * Captura Inteligente — LAS PUERTAS DE COMPARTIR (mapa §18, diseño 5c
 * §2c/§3.3, ola 1.3.362): una lectura del enlace, repartida a sus
 * puertas; el precio mirado de nuevo; la tasa que se trae sola. Las
 * cercas del BRIEF-COMPARTIR: nada se inventa, ningún total se mueve,
 * los asientos mandan.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitial } from "./defaults";
import { addWish, lookWish, renewWish } from "./waitlist";
import {
  enrichProduct, productDraft, productFromShare, productPlanRow, readPageMeta,
  shouldAutoRate, storeForUrl, suggestsStore, urlFromText,
} from "./sharelink";
import { FEATURES, modeReaches } from "./mode";
import { isLedgerDeep } from "./defaults";

const NOW = new Date("2026-11-21T12:00:00.000Z");

function book() {
  return createInitial("es", "oscuro");
}

test("362 §1 la tienda sale del dominio y la URL sale del texto", () => {
  assert.equal(storeForUrl("https://www.amazon.com/dp/B0XYZ"), "Amazon");
  assert.equal(storeForUrl("https://temu.com/goods.html"), "Temu");
  assert.equal(storeForUrl("https://www.walmart.com/ip/123"), "Walmart");
  assert.equal(storeForUrl("https://tienda-rara.example.com/x"), "tienda-rara.example.com");
  assert.equal(urlFromText("Mira esto https://amazon.com/dp/B1, está bueno"), "https://amazon.com/dp/B1");
  assert.equal(urlFromText("sin enlace"), "");
});

test("362 §1 el producto nace del compartir: título, tienda y el precio SIN ambigüedad", () => {
  const p = productFromShare("", "Audífonos Sony WH-1000XM5 $89.99 https://www.amazon.com/dp/B0XYZ")!;
  assert.ok(p);
  assert.equal(p.store, "Amazon");
  assert.equal(p.priceMinor, 8999);
  assert.equal(p.currency, "USD");
  assert.equal(p.priceFrom, "share");
  assert.match(p.title, /Audífonos Sony/);
  // Dos montos distintos = ambigüedad = el precio se pide, no se adivina.
  const two = productFromShare("", "Oferta $50 antes $89 https://temu.com/x")!;
  assert.equal(two.priceMinor, null);
  // El número del modelo no es precio: sin signo de moneda no hay lectura.
  const model = productFromShare("", "Sony WH-1000XM5 https://amazon.com/dp/B0")!;
  assert.equal(model.priceMinor, null);
  // Sin URL no hay producto de enlace.
  assert.equal(productFromShare("", "solo texto"), null);
  // Córdobas con su signo.
  const nio = productFromShare("", "Mochila C$1,200 https://tienda.example.com/m")!;
  assert.equal(nio.priceMinor, 120000);
  assert.equal(nio.currency, "NIO");
});

test("362 §1 la página se lee en sus metadatos — y sin precio publicado no hay precio", () => {
  const html = `<html><head>
    <meta property="og:title" content="Licuadora Pro 3000">
    <meta property="og:image" content="https://img.example.com/l.jpg">
    <meta property="product:price:amount" content="45.50">
    <meta property="product:price:currency" content="USD">
    </head></html>`;
  const m = readPageMeta(html);
  assert.equal(m.title, "Licuadora Pro 3000");
  assert.equal(m.imageUrl, "https://img.example.com/l.jpg");
  assert.equal(m.priceMinor, 4550);
  assert.equal(m.currency, "USD");
  const ld = readPageMeta(`<script type="application/ld+json">{"@type":"Product","offers":{"price": 1200, "priceCurrency":"NIO"}}</script>`);
  assert.equal(ld.priceMinor, 120000);
  const bare = readPageMeta(`<html><head><title>Solo un título</title></head><body>Cuesta mucho</body></html>`);
  assert.equal(bare.title, "Solo un título");
  assert.equal(bare.priceMinor, null);
});

test("362 §1 el enriquecimiento rellena huecos y nunca pisa lo compartido", () => {
  const p = productFromShare("", "Audífonos $89.99 https://amazon.com/dp/B0")!;
  const e = enrichProduct(p, { title: "Otro título", imageUrl: "https://i/x.jpg", priceMinor: 7900, currency: "USD" });
  assert.equal(e.priceMinor, 8999); // lo del compartir manda
  assert.equal(e.imageUrl, "https://i/x.jpg"); // la foto sí viene de la página
  const p2 = productFromShare("", "Audífonos https://amazon.com/dp/B0")!;
  const e2 = enrichProduct(p2, { title: "Audífonos Sony", imageUrl: "", priceMinor: 7900, currency: "USD" });
  assert.equal(e2.priceMinor, 7900);
  assert.equal(e2.priceFrom, "page");
  assert.equal(e2.title, "Audífonos"); // el título del compartir tampoco se pisa
});

test("362 §2 las puertas reparten UNA lectura — y ningún total se mueve", () => {
  const p = productFromShare("", "Audífonos Sony $89.99 https://amazon.com/dp/B0")!;
  const before = JSON.stringify(book().months);
  // La compra: borrador share con lo leído puesto.
  const d = productDraft(p, "2026-11-21", NOW.toISOString());
  assert.equal(d.source, "share");
  assert.equal(d.kind, "line");
  assert.equal(d.amountMinor, 8999);
  assert.deepEqual(d.missing, []);
  assert.match(d.note, /Amazon/);
  assert.match(d.note, /amazon\.com/);
  // Sin precio: el monto falta y la mesa lo pedirá.
  const np = productFromShare("", "Audífonos https://amazon.com/dp/B0")!;
  assert.deepEqual(productDraft(np, "2026-11-21", NOW.toISOString()).missing, ["amount"]);
  // El plan: la fila lleva el precio como ESTIMADO, jamás como monto.
  const row = productPlanRow(p, "plan-x", "2026-11-21", NOW.toISOString());
  assert.equal(row.kind, "plan");
  assert.equal(row.amountMinor, null);
  assert.equal(row.estMinor, 8999);
  assert.equal(row.planState, "pending");
  assert.equal(JSON.stringify(book().months), before);
});

test("362 §2 la sugerencia: producto → espera; tienda pelada → guardar la tienda", () => {
  const prod = productFromShare("", "Audífonos $89 https://amazon.com/dp/B0")!;
  assert.equal(suggestsStore(prod), false);
  const store = productFromShare("Amazon", "https://www.amazon.com/")!;
  assert.equal(suggestsStore(store), true);
});

test("362 §3 el look: una lectura por espera; renovar la rearma; sin enlace no hay look", () => {
  let s = book();
  const noLink = addWish(s, { concept: "Libro", amountMinor: 1000, currency: "USD", store: "" }, NOW);
  s = lookWish(noLink.state, noLink.wish.id, { priceMinor: 900, currency: "USD", at: "2026-11-21" });
  assert.equal(s.wishes![0].look, undefined);
  const withLink = addWish(s, { concept: "Audífonos", amountMinor: 8999, currency: "USD", store: "Amazon", link: "https://amazon.com/dp/B0" }, NOW);
  s = withLink.state;
  assert.equal(s.wishes![1].link, "https://amazon.com/dp/B0");
  s = lookWish(s, withLink.wish.id, { priceMinor: 7400, currency: "USD", at: "2026-11-23" });
  assert.equal(s.wishes![1].look?.priceMinor, 7400);
  assert.equal(s.wishes![1].look?.forDue, s.wishes![1].dueAt);
  // Segunda lectura en la misma espera: no pisa.
  s = lookWish(s, withLink.wish.id, { priceMinor: 7000, currency: "USD", at: "2026-11-23" });
  assert.equal(s.wishes![1].look?.priceMinor, 7400);
  // Renovar cambia el dueAt: la próxima lectura ya puede guardarse.
  s = renewWish(s, withLink.wish.id, new Date("2026-11-23T12:00:00.000Z"));
  s = lookWish(s, withLink.wish.id, { priceMinor: 7000, currency: "USD", at: "2026-11-25" });
  assert.equal(s.wishes![1].look?.priceMinor, 7000);
});

test("362 §4 la tasa se trae sola — salvo la manual, que manda siempre", () => {
  assert.equal(shouldAutoRate({ rateSource: "BCN", rateAsOf: "2026-11-20" }, "2026-11-21"), true);
  assert.equal(shouldAutoRate({ rateSource: "mercado", rateAsOf: "2026-11-20" }, "2026-11-21"), true);
  assert.equal(shouldAutoRate({ rateSource: "manual", rateAsOf: "2026-11-20" }, "2026-11-21"), false);
  assert.equal(shouldAutoRate({ rateSource: "BCN", rateAsOf: "2026-11-21" }, "2026-11-21"), false);
});

test("362 §5 el asiento inbox.link nace en Esencial y la puerta del plan pide su asiento", () => {
  assert.equal(FEATURES["inbox.link"], "esencial");
  assert.ok(modeReaches("esencial", FEATURES["inbox.link"]));
  assert.equal(FEATURES["capture.plan"], "ritmo");
  assert.ok(!modeReaches("esencial", FEATURES["capture.plan"]));
});

test("362 §6 la recarga conserva el deseo con su enlace y su look", () => {
  let s = book();
  const w = addWish(s, { concept: "Audífonos", amountMinor: 8999, currency: "USD", store: "Amazon", link: "https://amazon.com/dp/B0" }, NOW);
  s = lookWish(w.state, w.wish.id, { priceMinor: 7400, currency: "USD", at: "2026-11-23" });
  const round = JSON.parse(JSON.stringify(s)) as typeof s;
  assert.equal(isLedgerDeep(round), true);
  assert.equal(round.wishes![0].link, "https://amazon.com/dp/B0");
  assert.equal(round.wishes![0].look?.priceMinor, 7400);
});

test("362 la cáscara Android acepta el texto compartido que no es vCard", () => {
  const kt = readFileSync(new URL("../../../android/app/src/main/java/com/oscarvelz/faro/MainActivity.kt", import.meta.url), "utf8");
  assert.match(kt, /EXTRA_TEXT/);
  assert.match(kt, /0-compartido\.txt/);
  assert.match(kt, /SharedPic\(f, "compartido\.txt", "text\/plain"\)/);
});
