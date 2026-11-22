/* captura388 — OLA 8: LA BILLETERA POR NOTIFICACIONES (1.3.388;
 * diseño DISENO-OLA-8-BILLETERA, aprobado por Oscar el 2026-11-21).
 * La cerca prueba el intérprete contra avisos con la forma real de
 * las dos billeteras y clava las cercas de la oleada en su orden:
 * (1) los códigos mueren antes de todo patrón — y un código de
 * autorización dentro de una compra NO mata la compra; (2) sin forma
 * de movimiento no nace nada; (3) la forma que la mesa enseñó calla;
 * (4) el duplicado contra el libro se marca con el detector de la
 * casa; (5) el destino es la bandeja (source "notice", con su origen
 * dicho) y solo la mesa escribe. Los asientos y el tema del Manual
 * nacen con la oleada, clavados aquí. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitial } from "./defaults.ts";
import { interpretNotice, isCodeNotice, learnNoticeRule, parseNotices, type NoticeItem } from "./notices.ts";
import { FEATURES } from "./mode.ts";
import type { Line } from "./types.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const SAMSUNG = "com.samsung.android.spay";
const GOOGLE = "com.google.android.apps.walletnfcrel";
let seq = 0;
const ctx = (ledger: ReturnType<typeof book>) => ({
  ledger, lang: "es" as const, today: "2026-11-22", display: "NIO" as const,
  makeId: () => `n-${++seq}`, now: "2026-11-22T09:41:00.000Z",
});
function book() {
  return createInitial("es", "oscuro");
}
const item = (pkg: string, title: string, text: string): NoticeItem => ({ id: `${pkg}-1`, pkg, title, text, at: "2026-11-22T09:41:00" });

test("388 · las dos billeteras redactan: monto, comercio, sentido y origen", () => {
  const s = book();
  const a = interpretNotice(item(SAMSUNG, "Samsung Wallet", "Compra aprobada: C$1,200.00 en La Colonia"), ctx(s));
  assert.ok(a);
  assert.equal(a.source, "notice");
  assert.equal(a.fromApp, "Samsung Wallet");
  assert.equal(a.amountMinor, 120000);
  assert.equal(a.currency, "NIO");
  assert.equal(a.sign, "out");
  assert.equal(a.concept, "La Colonia");
  assert.equal(a.day, "2026-11-22");
  const g = interpretNotice(item(GOOGLE, "Google Wallet", "You paid $12.30 at Starbucks"), ctx(s));
  assert.ok(g);
  assert.equal(g.amountMinor, 1230);
  assert.equal(g.concept, "Starbucks");
  assert.ok(g.unsure.includes("currency"), "el $ sin firmar cae a la moneda de vista, en ámbar");
  const inb = interpretNotice(item(SAMSUNG, "Samsung Wallet", "Depósito recibido: C$500.00"), ctx(s));
  assert.ok(inb);
  assert.equal(inb.sign, "in");
});

test("388 · los códigos mueren antes de todo patrón; la compra con autorización, no", () => {
  const s = book();
  assert.equal(interpretNotice(item(SAMSUNG, "Samsung Wallet", "Tu código de verificación es 483920"), ctx(s)), null);
  assert.equal(interpretNotice(item(GOOGLE, "Google Wallet", "Your verification code is 221133"), ctx(s)), null);
  assert.equal(isCodeNotice("Tu código de seguridad es 2211"), true);
  const compra = interpretNotice(item(SAMSUNG, "Samsung Wallet", "Compra aprobada $25.50 en Pali, código de autorización 991122"), ctx(s));
  assert.ok(compra, "el código de autorización dentro de una compra no la mata");
  assert.equal(compra.amountMinor, 2550);
  assert.equal(compra.concept, "Pali, código de autorización 991122".split(",")[0]);
});

test("388 · sin forma de movimiento no nace nada; la forma enseñada calla", () => {
  const s = book();
  assert.equal(interpretNotice(item(SAMSUNG, "Samsung Wallet", "Tu tarjeta vence pronto"), ctx(s)), null);
  const promo = item(SAMSUNG, "Samsung Wallet", "Oferta: C$100.00 de descuento en tu próxima compra");
  const first = interpretNotice(promo, ctx(s));
  assert.ok(first, "la primera vez la forma dudosa sí llega a la mesa");
  const taught = learnNoticeRule(s, promo, "2026-11-22T10:00:00.000Z");
  const again = interpretNotice(item(SAMSUNG, "Samsung Wallet", "Oferta: C$250.00 de descuento en tu próxima compra"), ctx(taught));
  assert.equal(again, null, "la misma forma con otro monto ya no produce borrador");
});

test("388 · el duplicado contra el libro se marca con el detector de la casa", () => {
  const s = book();
  const line = {
    id: "l1", seriesId: "l1", monthKey: "2026-11", kind: "purchase", concept: "La Colonia",
    amountMinor: 120000, currency: "NIO", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO", bookedOn: "2026-11-22",
  } as unknown as Line;
  s.months = { "2026-11": { lines: [line] } };
  const d = interpretNotice(item(SAMSUNG, "Samsung Wallet", "Compra aprobada: C$1,200.00 en La Colonia"), ctx(s));
  assert.ok(d);
  assert.equal(d.dupOf, "l1");
});

test("388 · la cola del puente se lee con desconfianza", () => {
  const ok = parseNotices(JSON.stringify([{ id: "a", pkg: SAMSUNG, title: "t", text: "x", at: "2026-11-22T09:41:00" }, { nope: 1 }, null, { id: "b", pkg: GOOGLE, text: "" }]));
  assert.deepEqual(ok.map((i) => i.id), ["a"]);
  assert.deepEqual(parseNotices(""), []);
  assert.deepEqual(parseNotices("{broken"), []);
});

test("388 · los asientos y el tema nacen con la oleada", () => {
  assert.equal(FEATURES["capture.notices"], "esencial");
  assert.equal(FEATURES["capture.notices-admin"], "ritmo");
  const topics = read("../manual/topics.ts");
  assert.match(topics, /id: "billetera-notificaciones"/);
  assert.match(topics, /Solo en Android: el iPhone no deja/, "la declaración Android va a la primera");
  const askmap = read("./askmap.ts");
  assert.match(askmap, /id: "captura\.billetera"/);
  assert.match(askmap, /"captura\.billetera": "billetera-notificaciones"/);
  const manifest = read("../../../android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /FaroListener/);
  assert.match(manifest, /BIND_NOTIFICATION_LISTENER_SERVICE/);
  const listener = read("../../../android/app/src/main/java/com/oscarvelz/faro/FaroListener.kt");
  assert.match(listener, /looksLikeCode/, "la criba de códigos vive también en la cáscara: el código no se guarda ni en tránsito");
});
