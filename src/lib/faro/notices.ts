/**
 * FARO — Captura Inteligente, Ola 8: la billetera por notificaciones
 * (diseño DISENO-OLA-8-BILLETERA, mapa §18). Puro, sin DOM: convierte
 * la notificación de una billetera elegida por el usuario (Samsung
 * Wallet, Google Wallet) en UN borrador de la bandeja — jamás en una
 * línea: la bandeja es el único destino y solo la mesa escribe.
 *
 * Las cercas, en su orden:
 * 1. CÓDIGOS, JAMÁS: un aviso cuya única sustancia es un código de
 *    verificación se descarta ANTES de todo patrón (isCodeNotice) —
 *    no se interpreta, no se guarda, no pasa por la bandeja. Un aviso
 *    con forma de dinero (monto con moneda, verbo de movimiento) no
 *    es un aviso de código aunque mencione uno de autorización.
 * 2. FORMAS SILENCIADAS: lo que la mesa enseñó («esto no es un
 *    movimiento») deja de producir borradores (noticeRules del libro).
 * 3. SIN FORMA DE MOVIMIENTO, NADA: sin monto no hay borrador — ni
 *    registro. Con monto y sin comercio, el borrador nace con el
 *    concepto en rojo: la mesa decide, como en toda la familia.
 *
 * La gramática de remitentes es DATO (NOTICE_SENDERS): cada app nueva
 * gana su patrón cuando su primer aviso llega a la mesa. El intérprete
 * comparte las piezas de la casa: las reglas por comercio (bankbook),
 * el voto por historial (suggestHome) y el detector de duplicados
 * (findDup) marcan el borrador como en la frase escrita.
 */
import { findRule, importBook, merchantKey, splitTarget } from "./bankbook.ts";
import { findDup, validateDraft } from "./drafts.ts";
import { suggestHome } from "./quickadd.ts";
import { normName } from "./subs.ts";
import { displayName, noticeRuleShapeOk } from "./defaults.ts";
import type { Currency, Draft, LedgerState, NoticeRule } from "./types.ts";
import type { ParseCtx } from "./textparse.ts";

/** Un aviso tal como la cáscara lo entrega por el puente. */
export type NoticeItem = {
  id: string;
  pkg: string;
  title: string;
  text: string;
  at: string; // ISO — cuándo lo puso la app
};

/** La gramática de remitentes, como dato: paquete → nombre legible. */
export const NOTICE_SENDERS: { pkg: string; app: string }[] = [
  { pkg: "com.samsung.android.spay", app: "Samsung Wallet" },
  { pkg: "com.google.android.apps.walletnfcrel", app: "Google Wallet" },
];

export function senderAppOf(pkg: string): string {
  return NOTICE_SENDERS.find((s) => s.pkg === pkg)?.app ?? pkg;
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const CODE_WORDS = ["codigo", "verificacion", "verification", "otp", "one-time", "one time", "clave temporal", "security code", "codigo de seguridad", "passcode", "autenticacion", "authentication code", "2fa"];
const MONEY_SHAPE = /(us\$|c\$|\$|\busd\b|\bnio\b|cordobas|dolares|dollars)/;
const MOVE_WORDS = ["compra", "pago", "pagaste", "cargo", "aprobada", "aprobado", "purchase", "paid", "payment", "charged", "recibiste", "recibido", "deposito", "refund", "reembolso"];

/** La cerca anterior a todo patrón: ¿es este aviso, en sustancia, un
 *  código de verificación? Exige la palabra de código Y su racimo de
 *  dígitos, y cede si el aviso trae forma de dinero con verbo de
 *  movimiento (un código de autorización dentro de una compra sigue
 *  siendo una compra). */
export function isCodeNotice(raw: string): boolean {
  const t = fold(raw);
  const hasCodeWord = CODE_WORDS.some((w) => t.includes(w));
  if (!hasCodeWord) return false;
  if (!/\b\d{4,8}\b/.test(t)) return false;
  const hasMoney = MONEY_SHAPE.test(t) && MOVE_WORDS.some((w) => t.includes(w));
  return !hasMoney;
}

/** La llave de una forma: la app y el texto con las cifras plegadas —
 *  el mismo aviso con otro monto u otra hora cae en la misma llave.
 *
 *  OLA 28 (Familia 6; G28-5 + Q28-C1 de Cara): LA LLAVE ES SU
 *  IDENTIDAD DECLARADA, ENTERA. La identidad dice «el mismo aviso
 *  con otro monto»: un monto AGRUPADO («1,200», «1.200,50») dejaba
 *  antes un esqueleto distinto («#,#», «#.#,#») que el mismo aviso
 *  sin agrupar («999» → «#») — la regla enseñada con un monto no
 *  silenciaba al hermano con otro, y la forma quedaba partida por su
 *  grafía. Ahora toda corrida de cifras con sus separadores de
 *  agrupación se pliega a UN «#»: cualquier agrupamiento cae en la
 *  misma llave. Y la llave ya no se TRUNCA a 90: dos avisos largos
 *  que solo difieren tras el carácter 90 compartían llave, y
 *  silenciar uno silenciaba al otro — una colisión en la dirección
 *  peligrosa (el silencio falso). La identidad es la forma entera. */
export function noticeShapeKey(item: NoticeItem): string {
  const shape = fold(`${item.title} ${item.text}`)
    .replace(/\d+/g, "#")
    .replace(/#(?:[.,:]#)+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
  return `${item.pkg}|${shape}`;
}

/** La llave VIEJA (cifras plegadas sin agrupar, truncada a 90), solo
 *  para LEER: las reglas que la mesa enseñó antes de la Ola 28 llevan
 *  esta llave, y lo enseñado no se desenseña por una cura — el
 *  intérprete honra las dos llaves al silenciar, y solo escribe la
 *  nueva. Cuando la última regla vieja se olvide, esta función
 *  sobra; mientras una viva, quitarla sería evaporar una enseñanza. */
function legacyNoticeShapeKey(item: NoticeItem): string {
  const shape = fold(`${item.title} ${item.text}`)
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
  return `${item.pkg}|${shape}`;
}

/** OLA 28 (Familia 7, G28-6): el lector juzga la regla ENTERA con el
 *  juez compartido de defaults.ts (noticeRuleShapeOk) — los cuatro
 *  campos en su dimensión, `at` como fecha. Este lector juzgaba dos
 *  campos por su tipo y dejaba pasar la regla toda vacía y el `at`
 *  que no es fecha: la puerta del texto y la puerta de la identidad
 *  discrepan nunca más, porque son la misma ley. */
export function noticeRulesOf(state: LedgerState): NoticeRule[] {
  if (!Array.isArray(state.noticeRules)) return [];
  return state.noticeRules.filter((r) => noticeRuleShapeOk(r));
}

export function learnNoticeRule(state: LedgerState, item: NoticeItem, nowIso: string): LedgerState {
  const key = noticeShapeKey(item);
  const rules = noticeRulesOf(state);
  if (rules.some((r) => r.key === key)) return state;
  const label = `${item.title} ${item.text}`.replace(/\s+/g, " ").trim().slice(0, 60);
  return { ...state, noticeRules: [...rules, { key, app: senderAppOf(item.pkg), label, at: nowIso }] };
}

export function forgetNoticeRule(state: LedgerState, key: string): LedgerState {
  return { ...state, noticeRules: noticeRulesOf(state).filter((r) => r.key !== key) };
}

/** La cola del puente, con desconfianza: solo entran avisos con su
 *  forma mínima (id, paquete, texto). Lo mal formado no se confirma
 *  jamás en el host: se queda en la cola de la cáscara. */
export function parseNotices(raw: string): NoticeItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: NoticeItem[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      if (typeof o.id !== "string" || typeof o.pkg !== "string") continue;
      const text = typeof o.text === "string" ? o.text : "";
      const title = typeof o.title === "string" ? o.title : "";
      if (!text && !title) continue;
      out.push({ id: o.id, pkg: o.pkg, title, text, at: typeof o.at === "string" ? o.at : "" });
    }
    return out;
  } catch { return []; }
}

const IN_WORDS = ["recibiste", "recibido", "te enviaron", "deposito", "reembolso", "you received", "received", "refund", "deposit", "credited"];
const OUT_WORDS = ["compra", "pago", "pagaste", "cargo", "retiro", "aprobada", "aprobado", "purchase", "paid", "payment", "charged", "you sent", "sent"];

const BALANCE_WORDS = ["saldo", "balance", "disponible", "available", "te quedan", "quedan", "remaining", "restante"];

/** OLA 8 · EL BANCO DEL OYENTE (2026-11-22, especímenes reales de
 *  Oscar): el monto del MOVIMIENTO, jamás el del saldo. Un aviso del
 *  emisor trae dos montos — «Usted pagó $25.70 USD… Ahora su saldo
 *  disponible es $45.45 USD» — y el primero que cruza no manda: manda
 *  el de la cláusula con verbo de movimiento; el de la cláusula con
 *  palabra de saldo (saldo/disponible/balance…) no es un movimiento
 *  y, si es el único monto del aviso, el aviso no pare nada — el
 *  saldo jamás nace como borrador. La cláusula se corta en la coma,
 *  el punto y el punto y coma: los sobres separan así sus frases. */
function amountOf(t: string): { minor: number; currency: Currency | null } | null {
  const re = /(us\$|c\$|\$)\s?(\d[\d.,]*)(?:\s?(usd|nio|cordobas|dolares|dollars)\b)?|(\d[\d.,]*)\s?(usd|nio|cordobas|dolares|dollars)\b/gi;
  const found: { minor: number; currency: Currency | null; at: number }[] = [];
  for (const m of t.matchAll(re)) {
    const rawNum = (m[2] ?? m[4]).replace(/,/g, "");
    const value = Number.parseFloat(rawNum);
    if (!Number.isFinite(value) || value <= 0) continue;
    // La palabra de moneda, si el aviso la trae pegada («$25.70 USD»),
    // manda sobre el signo solo: el $ firmado no cae en ámbar.
    const word = (m[3] ?? m[5])?.toLowerCase();
    const mark = m[1]?.toLowerCase();
    const currency: Currency | null = word === "nio" || word === "cordobas" || mark === "c$" ? "NIO"
      : word === "usd" || word === "dolares" || word === "dollars" || mark === "us$" ? "USD"
      : mark === "$" ? null : null;
    found.push({ minor: Math.round(value * 100), currency, at: m.index });
  }
  if (!found.length) return null;
  const clauseOf = (idx: number): string => {
    const before = t.slice(0, idx);
    const after = t.slice(idx);
    const start = Math.max(before.lastIndexOf(","), before.lastIndexOf(";"), before.lastIndexOf("."), before.lastIndexOf("\n"), before.lastIndexOf("·"));
    const endM = /[,;.·\n]/.exec(after);
    return fold(t.slice(start + 1, endM ? idx + endM.index : undefined));
  };
  const judged = found.map((f) => {
    const clause = clauseOf(f.at);
    return { ...f, balance: BALANCE_WORDS.some((w) => clause.includes(w)), move: MOVE_WORDS.some((w) => clause.includes(w)) };
  });
  const pick = judged.find((f) => f.move && !f.balance) ?? judged.find((f) => !f.balance);
  return pick ? { minor: pick.minor, currency: pick.currency } : null;
}

/** El código de tienda al final del nombre es RUIDO, no el comercio:
 *  «MARATHON 170803», «SUBWAY 24131-0», «BURGER KING #8296» — la
 *  tienda se llama MARATHON, SUBWAY, BURGER KING. Se retira el token
 *  final cuando es un código (#seguido de dígitos, o 3+ dígitos con
 *  guion opcional); un número corto (1–2 dígitos) puede ser parte
 *  del nombre y se queda. */
function stripStoreCode(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[parts.length - 1];
  if (/^#\d+$/.test(last) || /^\d{3,}(?:-\d+)?$/.test(last) || /^\d+-\d+$/.test(last)) {
    return parts.slice(0, -1).join(" ").trim();
  }
  return name;
}

function merchantOf(item: NoticeItem): string {
  const body = `${item.text}`;
  const m = /\b(?:en|at)\s+/i.exec(body);
  if (m) {
    // El nombre tras «en/at» se corta en la puntuación, en el monto,
    // en el verbo de movimiento o en el pronombre que lo sigue
    // («en MARATHON 170803 Usted pagó $25.70» — el comercio es
    // MARATHON, y si el run trae su código, nada tras el código es
    // nombre). Sin este corte, la captura se comía la frase entera.
    const rest = body.slice(m.index + m[0].length);
    const stopAt = rest.search(/[,;.·\n]|\b(?:us\$|c\$|\$)\s?\d/i);
    const words = (stopAt >= 0 ? rest.slice(0, stopAt) : rest).trim().split(/\s+/).slice(0, 5);
    const kept: string[] = [];
    for (const w of words) {
      const f = fold(w);
      if (MOVE_WORDS.some((mw) => f === mw) || f === "usted" || f === "you") break;
      kept.push(w);
      if (/^#\d+$/.test(w) || /^\d{3,}(?:-\d+)?$/.test(w) || /^\d+-\d+$/.test(w)) break;
    }
    const name = stripStoreCode(kept.join(" ").trim());
    if (name.length >= 2) return name;
  }
  // LA FORMA DE LA BILLETERA QUE NOMBRA LA TARJETA (banco del oyente):
  // el título es la TARJETA usada («Chase Freedom Unlimited») — jamás
  // el comercio — y el comercio ABRE el cuerpo, antes del monto:
  // «BURGER KING #8296 $18.06». Si lo que abre el cuerpo es un verbo
  // de movimiento («Compra aprobada…»), no hay comercio legible y el
  // borrador nace con el concepto en rojo: la mesa decide.
  const amtIdx = body.search(/(us\$|c\$|\$|\b\d[\d.,]*\s?(?:usd|nio)\b)/i);
  if (amtIdx > 0) {
    const head = stripStoreCode(body.slice(0, amtIdx).replace(/[:·|–-]+$/, "").trim().replace(/\s+/g, " "));
    const letters = head.replace(/[^a-záéíóúüñ]/gi, "").length;
    if (head.length >= 2 && head.length <= 40 && letters >= 2 && !/\d{3,}/.test(head) && !MOVE_WORDS.some((w) => fold(head).includes(w))) return head;
  }
  return "";
}

/** El intérprete: un aviso → su borrador, o nada (código, forma
 *  silenciada, o sin forma de movimiento). */
export function interpretNotice(item: NoticeItem, ctx: ParseCtx): Draft | null {
  const raw = `${item.title} ${item.text}`.trim();
  if (isCodeNotice(raw)) return null;
  // OLA 28 (Familia 6): el silencio honra las DOS llaves — la nueva,
  // que es la identidad declarada, y la vieja, con la que la mesa
  // enseñó antes de esta cura (continuidad: ver legacyNoticeShapeKey).
  const shapeKey = noticeShapeKey(item);
  const legacyKey = legacyNoticeShapeKey(item);
  if (noticeRulesOf(ctx.ledger).some((r) => r.key === shapeKey || r.key === legacyKey)) return null;
  const folded = fold(raw);
  const amt = amountOf(item.text) ?? amountOf(item.title);
  if (!amt) return null;
  const sign: "in" | "out" = IN_WORDS.some((w) => folded.includes(w)) && !OUT_WORDS.some((w) => folded.includes(w)) ? "in" : "out";
  const concept = merchantOf(item);
  const unsure: string[] = [];
  const currency: Currency = amt.currency ?? ctx.display;
  if (amt.currency === null) unsure.push("currency");
  if (!concept) unsure.push("concept");
  const day = (item.at || ctx.now).slice(0, 10) || ctx.today;
  let book: Draft["book"] = sign === "in" ? "income-variable" : "expense-variable";
  let cat: string | undefined;
  let sub: string | undefined;
  let store: string | undefined;
  let homeSure = false;
  if (concept) {
    const rule = findRule(importBook(ctx.ledger).rules, merchantKey(concept));
    if (rule) {
      const t = splitTarget(rule.target);
      book = t.kind; cat = t.categoryId || undefined; sub = t.subId || undefined;
      homeSure = true;
    } else {
      const st = ctx.ledger.structure;
      const storeHit = st.catalog.find((s) => s.kind === "store" && !s.hidden && normName(concept).includes(normName(displayName(s, ctx.lang))));
      if (storeHit && sign !== "in") { store = storeHit.id; book = "purchase"; }
      const home = suggestHome(ctx.ledger, concept, sign);
      if (home) {
        cat = home.c || undefined; sub = home.s || undefined;
        if (!store) {
          const catObj = st.categories.find((c) => c.id === home.c);
          if (catObj) book = sign === "in" ? (catObj.group === "fixed" ? "income-fixed" : "income-variable") : (catObj.group === "fixed" ? "expense-fixed" : "expense-variable");
        }
        homeSure = true;
      }
    }
  }
  if (!homeSure) unsure.push("book");
  const draft: Draft = {
    id: ctx.makeId(), source: "notice", kind: "line",
    raw, createdAt: ctx.now,
    day, sign,
    amountMinor: amt.minor, currency,
    concept, note: "",
    book, cat, sub, store,
    fromApp: senderAppOf(item.pkg),
    fromPkg: item.pkg,
    unsure, missing: [],
  };
  const dup = findDup(draft, ctx.ledger);
  if (dup) draft.dupOf = dup.id;
  draft.missing = validateDraft(draft).missing;
  return draft;
}

/** LA COLISIÓN BILLETERA+EMISOR (banco del oyente, Adenda 3): el
 *  mismo pago puede llegar en DOS sobres — la billetera que nombra
 *  la tarjeta y la app del emisor — y la pareja es UN movimiento, no
 *  dos borradores. Al recoger la cola, los borradores con el mismo
 *  comercio, el mismo monto y la misma moneda, a diez minutos o
 *  menos entre sí, se quedan en el primero que llegó. Sin comercio
 *  legible no hay colisión que juzgar: dos avisos sin comercio nunca
 *  se pisan. Es una clase de forma, no de apps: cualquier pareja de
 *  sobres del mismo pago cae en la misma cerca. */
export function interpretNotices(items: NoticeItem[], ctx: ParseCtx): Draft[] {
  const out: Draft[] = [];
  const kept: { key: string; at: number }[] = [];
  for (const item of items) {
    const d = interpretNotice(item, ctx);
    if (!d) continue;
    if (d.concept) {
      const key = `${merchantKey(d.concept)}|${d.amountMinor}|${d.currency}|${d.day}`;
      const at = Date.parse(item.at) || 0;
      if (kept.some((k) => k.key === key && Math.abs(k.at - at) <= 10 * 60 * 1000)) continue;
      kept.push({ key, at });
    }
    out.push(d);
  }
  return out;
}
