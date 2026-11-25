/* ================================================================== */
/* LA RAMA DEL AGENTE · E4 — LOS VERBOS DE ORDEN                       */
/*                                                                     */
/* La idea de Alvin, tercer filo: el Asesor no solo asienta y          */
/* programa — también obedece órdenes sobre lo que ya existe:          */
/* ARCHIVAR una línea, CORREGIR un asiento (el monto, la fecha), y     */
/* BUSCAR («¿dónde está este dato?») — el verbo más seguro de todos,   */
/* porque no toca nada: solo dice dónde vive cada cosa.                */
/*                                                                     */
/* Como todo en la rama: parseOrden es PURA. Devuelve la orden como    */
/* borrador en datos, con su eco en palabras llanas; el toque que la   */
/* ejecuta en la app viva es la costura de canon al integrar. Cambiar  */
/* ajustes se construyó al final, por orden de Oscar (2026-11-23):     */
/* un conjunto CERRADO de seis ajustes nombrables, cada uno como       */
/* borrador con su antes → después — nada se aplica aquí.              */
/*                                                                     */
/* El eco es la cerca de la ambigüedad: si dos líneas se llaman igual, */
/* la orden nombra la encontrada con su monto y su fecha, y el SÍ del  */
/* usuario confirma ESA, no otra.                                      */
/* ================================================================== */

import { amountsIn, normalizeEs, repairAgentText } from "./ask2.ts";
import type { makeNamer } from "./defaults.ts";
import { foldQ } from "./lexicon.ts";
import { formatMoney, formatRate } from "./money.ts";
import type { Currency, Lang, LedgerState, Line } from "./types.ts";

type Namer = ReturnType<typeof makeNamer>;

const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function fmtDay(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  return L(lang, `${d} de ${MESES_ES[m - 1]} de ${y}`, `${MESES_EN[m - 1]} ${d}, ${y}`);
}
function monthYear(iso: string, lang: Lang): string {
  const [y, m] = iso.split("-").map(Number);
  return L(lang, `${MESES_ES[m - 1]} de ${y}`, `${MESES_EN[m - 1]} ${y}`);
}

const L = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);

/** Los ajustes que una orden puede cambiar (conjunto cerrado, §3 de
 * la propuesta): cada uno viaja como borrador con su valor máquina
 * y su antes → después en palabras llanas. */
export type AjusteKey = "display" | "lang" | "mode" | "rate" | "notify" | "dueAlerts";

export type OrdenDraft =
  | { op: "archivar"; lineId: string; monthKey: string; concept: string; amountMinor: number; currency: Currency; date: string; alreadyArchived: boolean }
  | { op: "corregir-monto"; lineId: string; monthKey: string; concept: string; fromMinor: number; toMinor: number; currency: Currency }
  | { op: "corregir-fecha"; lineId: string; monthKey: string; concept: string; fromDate: string; toDate: string }
  | { op: "ajuste"; setting: AjusteKey; value: string | number | boolean; fromText: string; toText: string };

export type DondeHit = {
  where: "linea" | "borrador" | "estructura";
  label: string;
  detail: string;
};

export type OrdenResult =
  | { kind: "order"; order: OrdenDraft; echo: string }
  | { kind: "found"; hits: DondeHit[]; text: string }
  | { kind: "ask"; question: string; missing: "objetivo" }
  | { kind: "note"; text: string }
  | { kind: "unknown" };

type Found = { line: Line; monthKey: string };
/** La línea más reciente cuyo concepto o cuya casa nombra el objetivo. */
function findLine(state: LedgerState, names: Namer, target: string): Found | null {
  const t = foldQ(target).trim();
  if (!t) return null;
  const keys = Object.keys(state.months).sort().reverse();
  let contains: Found | null = null;
  for (const k of keys) {
    for (const l of state.months[k]?.lines ?? []) {
      const conceptF = foldQ(l.concept);
      const subName = l.subId ? foldQ(names.sub(l.subId)) : "";
      if (conceptF === t || (subName && subName === t)) return { line: l, monthKey: k };
      if (!contains && (conceptF.includes(t) || (subName && subName.includes(t)) || (t.length >= 4 && t.includes(conceptF) && conceptF.length >= 3))) {
        contains = { line: l, monthKey: k };
      }
    }
  }
  return contains;
}

function stripWords(text: string, words: string[]): string {
  let out = ` ${text} `;
  for (const w of words) out = out.split(` ${w} `).join(" ");
  return out.trim().replace(/\s+/g, " ");
}

export function parseOrden(
  state: LedgerState, key: string, lang: Lang, names: Namer, raw: string, today: string,
): OrdenResult {
  /* LA CAMPAÑA DE MUTACIONES DE LA RAMA (puerto 1.3.457): la
   * orden también oye la escritura imperfecta — la reparación de
   * dos pasadas corre antes de juzgar los verbos («arciva»,
   * «acrhiva», «archiba» volvían la orden en silencio) y la
   * cortesía se retira («¿dónde están los zapatos?, por favor»
   * dejaba el blanco con la cortesía pegada y no encontraba
   * nada). Los nombres del libro se protegen. */
  const protect = new Set<string>();
  const addW = (s: string) => { for (const w of foldQ(s).split(/[^a-zñ]+/)) if (w.length >= 3) protect.add(w); };
  for (const m of Object.values(state.months)) for (const l of m.lines) addW(l.concept);
  for (const d of state.drafts ?? []) addW(d.concept || d.raw);
  for (const cat of state.structure.categories) {
    addW(names.cat(cat.id));
    for (const s of cat.subs) { addW(names.sub(s.id)); if (s.customName) addW(s.customName); }
  }
  const folded0 = repairAgentText(foldQ(raw), protect, lang);
  const folded = (lang === "es" ? normalizeEs(folded0) : folded0)
    .replace(/\b(por favor|please)\b/g, " ")
    .replace(/[¿?¡!]/g, " ").trim();
  if (!folded) return { kind: "unknown" };
  const money = (n: number, cur: Currency) => formatMoney(n, cur, lang);
  const askTarget = (): OrdenResult => ({
    kind: "ask", missing: "objetivo",
    question: L(lang, "¿Cuál? Nómbrame la línea o el dato y lo hago.", "Which one? Name the line or the item and I'll do it."),
  });

  /* ---- BUSCAR: «¿dónde está…?» no toca nada, solo dice dónde vive. */
  const buscarM = folded.match(/^(?:donde (?:esta(?: anotado)?|estan|anote|puse|quedo)|donde lo (?:anote|puse)|where (?:is|are|did i (?:put|note|record)))\s+(.*)$/);
  if (buscarM) {
    const target = stripWords(buscarM[1] ?? "", ["dato", "eso", "item", "data", "that", "la", "el", "los", "las", "the"]).trim().replace(/[.,;\s]+$/, "");
    if (!target) return askTarget();
    const hits: DondeHit[] = [];
    const found = findLine(state, names, target);
    if (found) {
      const l = found.line;
      hits.push({
        where: "linea",
        label: l.concept,
        detail: L(lang,
          `está en el historial, en ${monthYear(found.monthKey, lang)}: ${money(l.amountMinor, l.currency)}${l.bookedOn ? `, asentado el ${fmtDay(l.bookedOn, lang)}` : ""}${!l.active || l.rest ? " (archivado)" : ""}`,
          `it's in the history, in ${monthYear(found.monthKey, lang)}: ${money(l.amountMinor, l.currency)}${l.bookedOn ? `, posted on ${fmtDay(l.bookedOn, lang)}` : ""}${!l.active || l.rest ? " (archived)" : ""}`),
      });
    }
    for (const d of state.drafts ?? []) {
      if (foldQ(d.concept).includes(foldQ(target)) || foldQ(d.raw).includes(foldQ(target))) {
        hits.push({
          where: "borrador", label: d.concept || d.raw,
          detail: L(lang, "está en la Bandeja, todavía sin asentar", "it's in the Inbox, not posted yet"),
        });
      }
    }
    for (const cat of state.structure.categories) {
      if (foldQ(names.cat(cat.id)).includes(foldQ(target))) {
        hits.push({ where: "estructura", label: names.cat(cat.id), detail: L(lang, "es una categoría de tu estructura", "it's a category in your structure") });
      }
      for (const s of cat.subs) {
        if (foldQ(names.sub(s.id)).includes(foldQ(target))) {
          hits.push({ where: "estructura", label: names.sub(s.id), detail: L(lang, `es una subcategoría de ${names.cat(cat.id)}`, `it's a subcategory of ${names.cat(cat.id)}`) });
        }
      }
    }
    if (!hits.length) {
      return {
        kind: "found", hits,
        text: L(lang, `No encuentro «${target}» en tu libro: ni en el historial, ni en la Bandeja, ni en la estructura.`, `I can't find "${target}" in your book: not in the history, not in the Inbox, not in the structure.`),
      };
    }
    const text = hits.map((h) => `• ${h.label}: ${h.detail}`).join("\n");
    return { kind: "found", hits, text };
  }

  /* ---- ARCHIVAR: la orden nombra su línea con monto y fecha. */
  const archM = folded.match(/\b(archiva|archivar|archivalo|archivala|archivame|manda|envia|pasa)\b/);
  const archTail = /\b(a archivos|al archivo|to the archive|archive it)\b/.test(folded);
  if (archM && (archTail || folded.startsWith("archiva"))) {
    let target = stripWords(folded, ["archiva", "archivar", "archivalo", "archivala", "archivame", "manda", "envia", "pasa", "a", "archivos", "al", "archivo", "la", "linea", "el", "gasto", "de", "to", "the", "archive", "it"]);
    target = target.replace(/\s+/g, " ").trim();
    if (!target) return askTarget();
    const found = findLine(state, names, target);
    if (!found) return askTarget();
    const l = found.line;
    const order: OrdenDraft = {
      op: "archivar", lineId: l.id, monthKey: found.monthKey, concept: l.concept,
      amountMinor: l.amountMinor, currency: l.currency, date: l.bookedOn || l.nextDue || "",
      // Enmienda de canon (1.3.447): en el libro vivo, lo archivado es
      // lo apartado por descanso.ts (rest) además de lo inactivo — la
      // rama nació sobre la forma vieja del archivo. Sin esto, el eco
      // ofrecería archivar lo que ya descansa en el Archivo.
      alreadyArchived: !l.active || l.rest === true,
    };
    const echo = order.alreadyArchived
      ? L(lang, `«${l.concept}» ya está archivado; no hay nada que hacer.`, `"${l.concept}" is already archived; there's nothing to do.`)
      : [
          L(lang, "Esto es lo que entendí:", "Here's what I understood:"),
          `• ${L(lang, "Archivar", "Archive")} «${l.concept}» — ${money(l.amountMinor, l.currency)}${order.date ? `, ${fmtDay(order.date, lang)}` : ""}`,
          L(lang, "¿Lo hago así?", "Shall I do it like this?"),
        ].join("\n");
    return { kind: "order", order, echo };
  }

  /* ---- AJUSTE: cambiar un ajuste nombrado, como borrador con su
   * antes → después (orden de Oscar, 2026-11-23 — completa E4). El
   * conjunto es CERRADO: moneda de vista, idioma, modo, tasa,
   * notificaciones y avisos de pagos. Lo que no está en el conjunto
   * no se adivina: se dice, con la lista de lo que sí se puede. El
   * eco resuelve la referencia en voz alta (los «avisos» se nombran
   * enteros: los de pagos dentro de la app), así el SÍ confirma ESTE
   * ajuste y no otro. COSTURA DECLARADA: el modo tiene en canon una
   * cerca de escritores (solo el selector de Ajustes y la pantalla
   * inicial lo escriben); este borrador no escribe nada — cómo lo
   * aplica la superficie al confirmar es decisión de canon. */
  const ajusteNoun = /\b(moneda|idioma|lenguaje|modo|tasa|tipo de cambio|notificaciones|avisos|alertas|tema|ajuste|ajustes|vista|currency|language|mode|rate|notifications|alerts|theme|settings)\b/.test(folded);
  const ajusteVerb = /\b(cambia|cambiar|pone|poner|pon|deja|dejar|switch|change|set|turn|apaga|apagar|enciende|encende|encender|prende|prender|activa|activar|desactiva|desactivar)\b/.test(folded);
  if (ajusteVerb && ajusteNoun) {
    const note = (text: string): OrdenResult => ({ kind: "note", text });
    const mkOrder = (setting: AjusteKey, value: string | number | boolean, name: string, fromText: string, toText: string): OrdenResult => {
      if (fromText === toText) return note(L(lang, `${name} ya está así: ${fromText}. No hay cambio que hacer.`, `${name} is already like that: ${fromText}. There's no change to make.`));
      const draft: OrdenDraft = { op: "ajuste", setting, value, fromText, toText };
      const echo = [
        L(lang, "Esto es lo que entendí:", "Here's what I understood:"),
        `• ${L(lang, "Cambiar", "Change")} ${name}: ${fromText} → ${toText}`,
        L(lang, "¿Lo hago así?", "Shall I do it like this?"),
      ].join("\n");
      return { kind: "order", order: draft, echo };
    };
    const s = state.settings;
    if (/\b(moneda|vista|currency)\b/.test(folded)) {
      const to: Currency | null = /\b(cordobas|pesos|nio)\b/.test(folded) ? "NIO" : /\b(dolares|dollars|usd)\b/.test(folded) ? "USD" : null;
      if (!to) return note(L(lang, "¿A cuál moneda dejo la vista? Puedo dejarla en dólares o en córdobas.", "Which currency should the display be? I can set it to dollars or to cordobas."));
      const curName = (cur: Currency) => (cur === "NIO" ? L(lang, "córdobas", "cordobas") : L(lang, "dólares", "dollars"));
      return mkOrder("display", to, L(lang, "la moneda de vista", "the display currency"), curName(s.display), curName(to));
    }
    if (/\b(idioma|lenguaje|language)\b/.test(folded)) {
      const to: Lang | null = /\b(ingles|english)\b/.test(folded) ? "en" : /\b(espanol|spanish)\b/.test(folded) ? "es" : null;
      if (!to) return note(L(lang, "¿A cuál idioma lo dejo? Puedo dejarlo en español o en inglés.", "Which language should it be? I can set it to Spanish or English."));
      const langName = (x: Lang) => (x === "en" ? L(lang, "inglés", "English") : L(lang, "español", "Spanish"));
      return mkOrder("lang", to, L(lang, "el idioma", "the language"), langName(s.lang), langName(to));
    }
    if (/\b(modo|mode)\b/.test(folded)) {
      const to = /\b(esencial|essential)\b/.test(folded) ? "esencial" : /\b(ritmo|rhythm)\b/.test(folded) ? "ritmo" : /\b(completo|complete|full)\b/.test(folded) ? "completo" : null;
      if (!to) return note(L(lang, "¿A cuál modo lo dejo? Esencial, Ritmo o Completo.", "Which mode should it be? Essential, Rhythm or Complete."));
      const modeName = (m: string) => L(lang, m, m === "esencial" ? "Essential" : m === "ritmo" ? "Rhythm" : "Complete");
      return mkOrder("mode", to, L(lang, "el modo", "the mode"), modeName(s.mode ?? "completo"), modeName(to));
    }
    if (/\b(tasa|tipo de cambio|rate)\b/.test(folded)) {
      const numM = folded.match(/\b(\d{1,4})(?:[.,](\d{1,4}))?\b/);
      if (!numM) return note(L(lang, "¿En cuánto dejo la tasa? Dime el número, como «36.80».", "What should the rate be? Tell me the number, like \"36.80\"."));
      const val = Number(`${numM[1]}.${numM[2] ?? "0"}`);
      if (!(val > 0) || val > 100000) return note(L(lang, "Esa tasa no me cierra: dime un número como «36.80».", "That rate doesn't parse for me: give me a number like \"36.80\"."));
      const e4 = Math.round(val * 10000);
      return mkOrder("rate", e4, L(lang, "la tasa", "the rate"), `${formatRate(s.rateE4)} por dólar`, `${formatRate(e4)} por dólar`);
    }
    if (/\b(notificaciones|avisos|alertas|notifications|alerts)\b/.test(folded)) {
      const isNotify = /\b(notificaciones|notifications)\b/.test(folded);
      const off = /\b(apaga|apagar|apagadas|apagados|desactiva|desactivar|quita|quitar|off)\b/.test(folded);
      const on = /\b(encende|enciende|encender|prende|prender|activa|activar|activadas|activados|on)\b/.test(folded);
      if (!off && !on) return note(L(lang, "¿Los dejo encendidos o apagados?", "Should I turn them on or off?"));
      const to = on && !off;
      const name = isNotify ? L(lang, "las notificaciones del teléfono", "the phone notifications") : L(lang, "los avisos de pagos dentro de la app", "the in-app payment alerts");
      const cur = isNotify ? s.notify !== false : s.dueAlerts !== false;
      const stateName = (b: boolean) => (isNotify
        ? (b ? L(lang, "activadas", "on") : L(lang, "desactivadas", "off"))
        : (b ? L(lang, "activados", "on") : L(lang, "desactivados", "off")));
      return mkOrder(isNotify ? "notify" : "dueAlerts", to, name, stateName(cur), stateName(to));
    }
    return note(L(lang, "Ese ajuste no lo sé cambiar por aquí. Los que sí te puedo dejar en borrador: la moneda de vista, el idioma, el modo, la tasa, las notificaciones y los avisos de pagos.", "I can't change that setting from here. The ones I can draft for you: the display currency, the language, the mode, the rate, the notifications and the payment alerts."));
  }

  /* ---- CORREGIR: el monto o la fecha de una línea nombrada. */
  const corrM = /\b(corrige|corregir|corregilo|corregila|no fueron|no fue|eran|en realidad|actually|correct)\b/.test(folded);
  if (corrM || /\b(pasala|pasalo|pasa|muevela|muevelo|mueve|cambiala|cambialo|cambia)\b/.test(folded)) {
    const dayM = folded.match(/\b(?:al dia|para el dia|al|para el)\s*(\d{1,2})\b/);
    const amounts = amountsIn(raw, state.settings.display);
    let target = stripWords(folded, ["corrige", "corregir", "corregilo", "corregila", "no", "fueron", "fue", "eran", "en", "realidad", "son", "pasala", "pasalo", "pasa", "muevela", "muevelo", "mueve", "cambiala", "cambialo", "cambia", "la", "el", "linea", "gasto", "al", "dia", "para", "actually", "correct", "the"]);
    target = target.replace(/\d+(?:[.,]\d+)?/g, " ").replace(/\s+/g, " ").trim();
    if (!target) return askTarget();
    const found = findLine(state, names, target);
    if (!found) return askTarget();
    const l = found.line;
    if (amounts.length && !dayM) {
      const to = amounts[amounts.length - 1];
      const order: OrdenDraft = {
        op: "corregir-monto", lineId: l.id, monthKey: found.monthKey, concept: l.concept,
        fromMinor: l.amountMinor, toMinor: to.minor, currency: l.currency,
      };
      const echo = [
        L(lang, "Esto es lo que entendí:", "Here's what I understood:"),
        `• ${L(lang, "Corregir", "Correct")} «${l.concept}»: ${money(l.amountMinor, l.currency)} → ${money(to.minor, l.currency)}`,
        L(lang, "¿Lo hago así?", "Shall I do it like this?"),
      ].join("\n");
      return { kind: "order", order, echo };
    }
    if (dayM) {
      const from = l.bookedOn || l.nextDue || `${key}-01`;
      const [fy, fm] = from.split("-").map(Number);
      const toDate = `${fy}-${String(fm).padStart(2, "0")}-${String(Math.min(31, Number(dayM[1]))).padStart(2, "0")}`;
      const order: OrdenDraft = { op: "corregir-fecha", lineId: l.id, monthKey: found.monthKey, concept: l.concept, fromDate: from, toDate };
      const echo = [
        L(lang, "Esto es lo que entendí:", "Here's what I understood:"),
        `• ${L(lang, "Mover la fecha de", "Move the date of")} «${l.concept}»: ${fmtDay(from, lang)} → ${fmtDay(toDate, lang)}`,
        L(lang, "¿Lo hago así?", "Shall I do it like this?"),
      ].join("\n");
      return { kind: "order", order, echo };
    }
    return askTarget();
  }

  void today;
  return { kind: "unknown" };
}
