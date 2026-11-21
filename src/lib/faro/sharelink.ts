/**
 * Las puertas de compartir (mapa §18, diseño 5c §2c — 1.3.362): lo que un
 * enlace compartido trae, leído UNA vez y repartido a sus puertas. Todo
 * puro: del texto que la tienda adjunta y de la URL salen título, tienda y
 * precio; de la página, cuando hay red, sus metadatos publicados. Nada se
 * inventa: lo que no se puede leer queda vacío y la superficie lo pide
 * (ley D4). Internet es el criado: cada lectura dice de dónde vino.
 */
import type { Currency, Draft, Settings } from "./types";
import { uid } from "./money";

/** El producto tal como se leyó: del compartir, de la página, o de ambos. */
export type SharedProduct = {
  title: string;
  store: string;
  url: string;
  priceMinor: number | null;
  currency: Currency;
  imageUrl?: string;
  /** De dónde salió el precio: el texto compartido, la página, o ninguno. */
  priceFrom: "share" | "page" | null;
};

/** La primera URL http(s) de un texto, sin puntuación pegada al final. */
export function urlFromText(text: string): string {
  const m = /https?:\/\/[^\s<>"')\]]+/.exec(text || "");
  if (!m) return "";
  return m[0].replace(/[.,;:!?]+$/, "");
}

/** La tienda que un dominio anuncia; otro dominio se nombra a sí mismo. */
export function storeForUrl(url: string): string {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
  if (!host) return "";
  if (host.includes("amazon.")) return "Amazon";
  if (host.includes("temu.")) return "Temu";
  if (host.includes("walmart.")) return "Walmart";
  if (host.includes("ebay.")) return "eBay";
  if (host.includes("aliexpress.")) return "AliExpress";
  if (host.includes("etsy.")) return "Etsy";
  if (host.includes("shein.")) return "Shein";
  if (host.includes("target.")) return "Target";
  if (host.includes("bestbuy.")) return "Best Buy";
  if (host.includes("costco.")) return "Costco";
  return host;
}

/** Un monto con su signo de moneda, en el formato de las tiendas: $89,
 * $89.99, C$1,200, 1.200,50 €… El escáner es propio de esta puerta — el
 * de recibos (receiptparse) está afinado para líneas de caja y exige
 * decimales; un precio de tienda muchas veces no los trae. */
function markedAmounts(text: string): { minor: number; currency: Currency }[] {
  const out: { minor: number; currency: Currency }[] = [];
  const NUM = String.raw`([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?|[0-9]+(?:[.,][0-9]{2})?)`;
  const parseNum = (raw: string): number | null => {
    const s = raw.trim();
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    let intPart = s;
    let dec = 0;
    if (lastDot >= 0 || lastComma >= 0) {
      const at = Math.max(lastDot, lastComma);
      const after = s.slice(at + 1);
      if (after.length === 2) { intPart = s.slice(0, at); dec = Number.parseInt(after, 10); }
    }
    const whole = Number.parseInt(intPart.replace(/[.,]/g, ""), 10);
    if (!Number.isFinite(whole)) return null;
    return whole * 100 + dec;
  };
  const before = new RegExp(String.raw`(US\$|C\$|USD|NIO|córdobas?|cordobas?|\$)\s*${NUM}`, "gi");
  const after = new RegExp(String.raw`${NUM}\s*(USD|NIO|córdobas?|cordobas?|dólares|dolares)`, "gi");
  for (const m of text.matchAll(before)) {
    const cur: Currency = /c\$|nio|c[oó]rdoba/i.test(m[1]) ? "NIO" : "USD";
    const minor = parseNum(m[2]);
    if (minor != null && minor > 0) out.push({ minor, currency: cur });
  }
  for (const m of text.matchAll(after)) {
    const cur: Currency = /nio|c[oó]rdoba/i.test(m[2]) ? "NIO" : "USD";
    const minor = parseNum(m[1]);
    if (minor != null && minor > 0) out.push({ minor, currency: cur });
  }
  return out;
}

/** El precio que el propio texto compartido trae: SOLO si hay exactamente
 * un monto con signo — con varios, la lectura es ambigua y el precio se
 * pide (D4); un número pelado (el modelo «WH-1000XM5») no es un precio. */
function priceFromShareText(text: string): { minor: number; currency: Currency } | null {
  const clean = (text || "").replace(/https?:\/\/\S+/g, " ");
  const found: { minor: number; currency: Currency }[] = [];
  for (const a of markedAmounts(clean)) {
    if (!found.some((f) => f.minor === a.minor && f.currency === a.currency)) found.push(a);
  }
  return found.length === 1 ? found[0] : null;
}

/** El producto que nace del compartir mismo, sin red: el título que la
 * tienda adjuntó (o la primera línea que no es la URL), la tienda del
 * dominio y el precio si el texto lo trae sin ambigüedad. */
export function productFromShare(sharedTitle: string, sharedText: string): SharedProduct | null {
  const url = urlFromText(sharedText) || urlFromText(sharedTitle);
  if (!url) return null;
  const lines = (sharedText || "").split(/\n+/).map((s) => s.replace(/https?:\/\/\S+/g, "").trim()).filter(Boolean);
  const title = (sharedTitle || "").replace(/https?:\/\/\S+/g, "").trim() || lines[0] || "";
  const price = priceFromShareText(sharedText);
  return {
    title: title.replace(/\s+/g, " ").slice(0, 140),
    store: storeForUrl(url),
    url,
    priceMinor: price?.minor ?? null,
    currency: price?.currency ?? "USD",
    priceFrom: price ? "share" : null,
  };
}

function metaContent(html: string, keys: string[]): string {
  for (const key of keys) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
    const tag = re.exec(html)?.[0];
    if (!tag) continue;
    const c = /content=["']([^"']*)["']/i.exec(tag)?.[1];
    if (c) return c.trim();
  }
  return "";
}

function unescapeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** Los metadatos que la página misma publica (OpenGraph / Twitter /
 * JSON-LD). Sin precio publicado, priceMinor queda null — jamás se
 * adivina del texto de la página. */
export function readPageMeta(html: string): { title: string; imageUrl: string; priceMinor: number | null; currency: Currency | null } {
  const h = html || "";
  let title = metaContent(h, ["og:title", "twitter:title"]);
  if (!title) title = /<title[^>]*>([^<]+)<\/title>/i.exec(h)?.[1]?.trim() ?? "";
  const imageUrl = metaContent(h, ["og:image", "twitter:image"]);
  const priceRaw = metaContent(h, ["product:price:amount", "og:price:amount", "product:pretax_price:amount"]);
  const curRaw = metaContent(h, ["product:price:currency", "og:price:currency"]).toUpperCase();
  let price: number | null = null;
  let cur: Currency | null = curRaw === "NIO" ? "NIO" : curRaw === "USD" ? "USD" : null;
  const fromMeta = priceRaw ? Number.parseFloat(priceRaw.replace(/[^0-9.]/g, "")) : NaN;
  if (Number.isFinite(fromMeta) && fromMeta > 0) price = fromMeta;
  if (price == null) {
    const ld = /"price"\s*:\s*"?([0-9]+(?:\.[0-9]{1,2})?)"?/.exec(h)?.[1];
    if (ld) {
      const v = Number.parseFloat(ld);
      if (Number.isFinite(v) && v > 0) price = v;
    }
  }
  if (price != null && cur == null) cur = "USD";
  return {
    title: unescapeHtml(title).replace(/\s+/g, " ").slice(0, 140),
    imageUrl: unescapeHtml(imageUrl),
    priceMinor: price != null ? Math.round(price * 100) : null,
    currency: cur,
  };
}

/** El enriquecimiento: la página rellena lo que el compartir no trajo; lo
 * que el compartir SÍ trajo manda (es la palabra de la tienda al usuario,
 * no una lectura de terceros). */
export function enrichProduct(p: SharedProduct, meta: { title: string; imageUrl: string; priceMinor: number | null; currency: Currency | null }): SharedProduct {
  const out: SharedProduct = { ...p };
  if (!out.title && meta.title) out.title = meta.title;
  if (meta.imageUrl) out.imageUrl = meta.imageUrl;
  if (out.priceMinor == null && meta.priceMinor != null) {
    out.priceMinor = meta.priceMinor;
    out.currency = meta.currency ?? out.currency;
    out.priceFrom = "page";
  }
  return out;
}

/** ¿El enlace anuncia una tienda y no un producto? Sin precio leído y sin
 * título que nombre algo comprable, la puerta probable es guardar la
 * tienda; con producto, la espera. */
export function suggestsStore(p: SharedProduct): boolean {
  const t = (p.title || "").trim();
  const storeish = !t || t.toLowerCase() === (p.store || "").toLowerCase();
  return p.priceMinor == null && storeish;
}

/** La puerta de la compra: UN borrador en la bandeja, fuente «share», con
 * lo leído ya puesto y la tienda y el enlace en la nota. Sin precio, el
 * monto falta — y la mesa lo pide con su herramienta (D4). */
export function productDraft(p: SharedProduct, today: string, nowIso: string): Draft {
  const noteParts = [p.store, p.url].filter(Boolean);
  return {
    id: `d-${uid()}`,
    source: "share",
    kind: "line",
    raw: [p.title, p.url].filter(Boolean).join(" "),
    createdAt: nowIso,
    day: today,
    sign: "out",
    amountMinor: p.priceMinor,
    currency: p.priceMinor != null ? p.currency : null,
    concept: p.title || p.store,
    note: noteParts.join(" · "),
    book: "purchase",
    unsure: [],
    missing: p.priceMinor == null ? ["amount"] : [],
  };
}

/** La puerta del plan: UNA fila con el precio como ESTIMADO (un precio de
 * enlace es un estimado hasta que se compra), en la forma exacta de las
 * filas de Pegar una lista. */
export function productPlanRow(p: SharedProduct, planId: string, today: string, nowIso: string): Draft {
  return {
    id: `d-${uid()}`,
    source: "share",
    kind: "plan",
    raw: [p.title, p.url].filter(Boolean).join(" "),
    createdAt: nowIso,
    day: today,
    sign: "out",
    amountMinor: null,
    estMinor: p.priceMinor,
    currency: p.currency,
    concept: p.title || p.store,
    note: [p.store, p.url].filter(Boolean).join(" · "),
    book: "purchase",
    planId,
    planState: "pending",
    unsure: [],
    missing: [],
  };
}

/** La tasa se trae sola (§18.5): solo si el usuario no la fijó a mano
 * (source "manual" manda siempre) y la guardada no es de hoy. */
export function shouldAutoRate(settings: Pick<Settings, "rateSource" | "rateAsOf">, todayISO: string): boolean {
  return settings.rateSource !== "manual" && settings.rateAsOf !== todayISO;
}
