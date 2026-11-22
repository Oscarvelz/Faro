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

function amountOf(t: string): { minor: number; currency: Currency | null } | null {
  const m = /(us\$|c\$|\$)\s?(\d[\d.,]*)/i.exec(t) ?? /(\d[\d.,]*)\s?(usd|nio|cordobas|dolares|dollars)\b/i.exec(t);
  if (!m) return null;
  const rawNum = (m[2] ?? m[1]).replace(/,/g, "");
  const value = Number.parseFloat(rawNum);
  if (!Number.isFinite(value) || value <= 0) return null;
  const mark = (m[1] ?? m[2]).toLowerCase();
  const currency: Currency | null = mark === "c$" || mark === "nio" || mark === "cordobas" ? "NIO" : mark === "$" ? null : "USD";
  return { minor: Math.round(value * 100), currency };
}

function merchantOf(item: NoticeItem): string {
  const body = `${item.text}`;
  const m = /\b(?:en|at)\s+([^.,\n·|]{2,40})/i.exec(body);
  if (m) return m[1].trim().replace(/\s+/g, " ");
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
