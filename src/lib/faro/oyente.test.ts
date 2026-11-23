/* oyente — EL BANCO DEL OYENTE (Ola 8, banco permanente; especímenes
 * reales del teléfono de Oscar, 2026-11-22, con la taxonomía de la
 * Adenda 3 del DISENO-OLA-8-BILLETERA y la ley contra el sobreajuste
 * de la Adenda 2).
 *
 * Las formas que el banco clava, como CLASES — nunca como las apps
 * de Oscar:
 *  1. AVISO DE BILLETERA QUE NOMBRA LA TARJETA: el título es la
 *     tarjeta usada, NO el comercio; el comercio abre el cuerpo y el
 *     código de tienda que lo sigue es ruido («SUBWAY 24131-0»,
 *     «BURGER KING #8296»).
 *  2. AVISO DEL EMISOR CON DOS MONTOS: el pagado es el movimiento;
 *     el saldo disponible JAMÁS nace — ni como monto elegido ni como
 *     borrador cuando es el único monto del aviso. La oferta («5%
 *     back») es ruido.
 *  3. LA COLISIÓN: billetera + emisor del MISMO pago son UN
 *     movimiento ante la recogida (mismo comercio, monto y moneda,
 *     a diez minutos o menos); dos pagos de verdad, no.
 *
 * Los especímenes 1 y 2 son los textos reales de su teléfono
 * (PayPal 18:29 y Samsung Wallet 18:42 del 2026-11-22); el resto son
 * hermanos de forma con otros nombres, porque el motor se construye
 * para otros: la forma manda, el nombre de la app no. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitial } from "./defaults.ts";
import { interpretNotice, interpretNotices, type NoticeItem } from "./notices.ts";

const SAMSUNG = "com.samsung.android.spay";
const PAYPAL = "com.paypal.android.p2pmobile";
let seq = 0;
const ctx = (ledger: ReturnType<typeof book>) => ({
  ledger, lang: "es" as const, today: "2026-11-22", display: "USD" as const,
  makeId: () => `o-${++seq}`, now: "2026-11-22T18:42:00.000Z",
});
function book() {
  return createInitial("es", "oscuro");
}
const item = (pkg: string, title: string, text: string, at = "2026-11-22T18:42:00"): NoticeItem => ({ id: `${pkg}-${seq}-${at}`, pkg, title, text, at });

test("oyente · la billetera nombra la tarjeta: el comercio se lee en el cuerpo y el código es ruido", () => {
  const s = book();
  const bk = interpretNotice(item(SAMSUNG, "Chase Freedom Unlimited", "BURGER KING #8296 $18.06"), ctx(s));
  assert.ok(bk);
  assert.equal(bk.concept, "BURGER KING", "el comercio es el cuerpo sin su código — nunca el título-tarjeta");
  assert.equal(bk.amountMinor, 1806);
  assert.equal(bk.sign, "out");
  const sw = interpretNotice(item(SAMSUNG, "Chase Freedom Unlimited", "SUBWAY 24131-0 $17.16", "2026-11-22T11:40:00"), ctx(s));
  assert.ok(sw);
  assert.equal(sw.concept, "SUBWAY");
  assert.equal(sw.amountMinor, 1716);
});

test("oyente · el emisor con dos montos: el movimiento es el pagado; el saldo jamás nace", () => {
  const s = book();
  const text = "Su compra en MARATHON 170803 Usted pagó $25.70 USD, ¡y aplicamos la oferta de 5% back on fuel! Ahora su saldo de PayPal disponible es $45.45 USD.";
  const d = interpretNotice(item(PAYPAL, "PayPal", text, "2026-11-22T18:29:00"), ctx(s));
  assert.ok(d);
  assert.equal(d.amountMinor, 2570, "el monto es el PAGADO, no el saldo");
  assert.equal(d.currency, "USD");
  assert.ok(!d.unsure.includes("currency"), "el USD viene firmado en el aviso");
  assert.equal(d.concept, "MARATHON", "el comercio sin su código de tienda");
  assert.equal(d.sign, "out");
  // El hermano con el saldo PRIMERO: el orden no salva al saldo.
  const flipped = interpretNotice(item(PAYPAL, "PayPal", "Su saldo disponible es $45.45 USD. Usted pagó $25.70 USD en MARATHON 170803.", "2026-11-22T18:30:00"), ctx(s));
  assert.ok(flipped);
  assert.equal(flipped.amountMinor, 2570, "aunque el saldo abra el aviso, el monto es el del movimiento");
  // Un aviso que SOLO trae saldo no pare nada.
  assert.equal(interpretNotice(item(PAYPAL, "PayPal", "Ahora su saldo de PayPal disponible es $45.45 USD.", "2026-11-22T18:31:00"), ctx(s)), null, "el saldo solo no es un movimiento");
  // Y la oferta sola, tampoco.
  assert.equal(interpretNotice(item(PAYPAL, "PayPal", "¡Aplicamos la oferta de 5% back on fuel en tu última compra!", "2026-11-22T18:32:00"), ctx(s)), null, "la oferta es ruido");
});

test("oyente · la colisión: dos sobres del mismo pago son UN movimiento", () => {
  const s = book();
  const wallet = item(SAMSUNG, "Chase Freedom Unlimited", "SUBWAY 24131-0 $17.16", "2026-11-22T11:40:00");
  const issuer = item(PAYPAL, "PayPal", "Su compra en SUBWAY 24131-0 Usted pagó $17.16 USD.", "2026-11-22T11:43:00");
  const pair = interpretNotices([wallet, issuer], ctx(s));
  assert.equal(pair.length, 1, "la pareja billetera+emisor pare un solo borrador");
  assert.equal(pair[0].concept, "SUBWAY");
  assert.equal(pair[0].amountMinor, 1716);
  // Dos pagos de verdad al mismo comercio por el mismo monto, lejos: dos.
  const later = item(SAMSUNG, "Chase Freedom Unlimited", "SUBWAY 24131-0 $17.16", "2026-11-22T14:05:00");
  assert.equal(interpretNotices([wallet, later], ctx(s)).length, 2, "el mismo monto horas después es otro pago");
  // Mismo monto, otro comercio, minutos cerca: dos.
  const other = item(SAMSUNG, "Chase Freedom Unlimited", "MCDONALD'S #512 $17.16", "2026-11-22T11:44:00");
  assert.equal(interpretNotices([wallet, other], ctx(s)).length, 2, "otro comercio no colisiona");
});

test("oyente · la forma manda, no la app: hermanos con otros nombres leen igual", () => {
  const s = book();
  const w = interpretNotice(item("com.example.wallet", "Tarjeta ····4419", "TACO BELL #441 $9.50", "2026-11-22T13:00:00"), ctx(s));
  assert.ok(w);
  assert.equal(w.concept, "TACO BELL");
  assert.equal(w.amountMinor, 950);
  const i = interpretNotice(item("com.example.bank", "Banco", "You paid $9.50 at TACO BELL 2210. Your available balance is $102.00.", "2026-11-22T13:01:00"), ctx(s));
  assert.ok(i);
  assert.equal(i.concept, "TACO BELL");
  assert.equal(i.amountMinor, 950, "la trampa del saldo cae en cualquier idioma");
});

test("oyente · la cerca de códigos sigue delante de todo, también en la recogida", () => {
  const s = book();
  const code = item(SAMSUNG, "Samsung Wallet", "Tu código de verificación es 483920", "2026-11-22T10:00:00");
  const good = item(SAMSUNG, "Chase Freedom Unlimited", "SUBWAY 24131-0 $17.16", "2026-11-22T11:40:00");
  const out = interpretNotices([code, good], ctx(s));
  assert.equal(out.length, 1, "el código no pare ni en la recogida por cola");
  assert.equal(out[0].concept, "SUBWAY");
});
