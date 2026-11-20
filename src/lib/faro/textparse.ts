/**
 * FARO — Captura Inteligente, Ola 2: el intérprete de lenguaje natural
 * (mapa F2). Puro, sin DOM: convierte una frase («Almuerzo, $300», «pagué
 * 200 de luz y 150 de agua», «Me pagaron 500 dólares de la remesa») en
 * borradores de la bandeja. Es una gramática de patrones sobre las piezas
 * de la casa — las reglas por comercio de bankbook, el voto por historial
 * de quickadd (suggestHome), el lector de fechas de receiptparse — con
 * condiciones de disparo y de silencio por patrón: lo que no se puede
 * saber NO se inventa; nace nulo y la mesa lo pregunta (missing), y lo
 * adivinado nace marcado (unsure). Jamás guarda: solo la mesa escribe.
 *
 * Los lectores de montos de recibos piden decimales ($22.04); la frase
 * viva trae enteros ($300), así que el monto de frase tiene su lector
 * propio aquí, con la misma disciplina: primero lo firmado (signo o
 * nombre de moneda), después lo desnudo con contexto de dinero, y las
 * palabras-número solo cuando la frase las sostiene.
 */
import { findRule, importBook, merchantKey, splitTarget } from "./bankbook.ts";
import { datesLoose } from "./receiptparse.ts";
import { findDup, validateDraft } from "./drafts.ts";
import { suggestHome } from "./quickadd.ts";
import { normName } from "./subs.ts";
import { displayName } from "./defaults.ts";
import type { Currency, Draft, Lang, LedgerState } from "./types.ts";

export type ParseCtx = {
  ledger: LedgerState;
  lang: Lang;
  today: string;               // YYYY-MM-DD
  display: Currency;           // la moneda de vista: el monto sin señal cae aquí, en ámbar
  makeId: () => string;
  now: string;                 // ISO — createdAt de los borradores
};

/** El plegado 1:1 de la casa para frases: minúsculas y sin acentos, carácter
 * a carácter, SIN cambiar longitudes — los tramos hallados sobre el texto
 * plegado sirven tal cual sobre la frase original (que conserva sus
 * acentos en el concepto). */
const ACCENT: Record<string, string> = { "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n", "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ü": "U", "Ñ": "N" };
const fold = (s: string) => s.toLowerCase().replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, (c) => ACCENT[c] ?? c);
/** Un patrón tolerante a acentos para tachar palabras de la frase viva:
 * cada vocal se abre a su clase acentuada (compre → compr[eé]). */
const wordRe = (w: string) => w.replace(/[aeiou]/g, (v) => ({ a: "[aá]", e: "[eé]", i: "[ií]", o: "[oó]", u: "[uúü]" }[v] ?? v)).replace(/n(?![a-z])/g, "[nñ]");
const pad = (n: number) => String(n).padStart(2, "0");

function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ montos */

/** Un monto hallado en la frase, con su tramo para poder tacharlo del concepto. */
type MoneyHit = { minor: number; currency: Currency | "EUR" | ""; from: number; to: number; signed: boolean };

const NUM = String.raw`\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const toMinor = (txt: string): number | null => {
  const t = txt.replace(/\s/g, "");
  const m = /^(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?$/.exec(t);
  if (!m) return null;
  const whole = Number(m[1].replace(/[.,]/g, ""));
  const cents = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  if (!Number.isFinite(whole)) return null;
  return whole * 100 + cents;
};

/** Palabras-número ES/EN: un parser acotado (unidades, decenas, cientos,
 * mil, millón) que solo compone secuencias pegadas y devuelve su valor y
 * su tramo. «trescientos» → 300; «two hundred fifty» → 250. */
const WORD_VAL: Record<string, number> = {
  cero: 0, uno: 1, un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
const wordNumbers = (seg: string): { minor: number; from: number; to: number }[] => {
  const words = [...seg.matchAll(/[a-z]+/g)].map((m) => ({ w: m[0], at: m.index ?? 0, to: (m.index ?? 0) + m[0].length }));
  const out: { minor: number; from: number; to: number }[] = [];
  let i = 0;
  while (i < words.length) {
    if (!(words[i].w in WORD_VAL) && words[i].w !== "mil" && words[i].w !== "thousand" && words[i].w !== "millon" && words[i].w !== "million") { i++; continue; }
    let total = 0, chunk = 0, j = i, last = -1;
    while (j < words.length) {
      const w = words[j].w;
      if (w === "y" || w === "and") { j++; continue; }
      if (w === "mil" || w === "thousand") { chunk = (chunk || 1) * 1000; j++; last = j - 1; continue; }
      if (w === "millon" || w === "million" || w === "millones") { chunk = (chunk || 1) * 1000000; j++; last = j - 1; continue; }
      if (w in WORD_VAL) {
        const v = WORD_VAL[w];
        if (v === 100 && (words[j - 1]?.w === "a" || chunk > 0 && chunk < 100)) chunk = (chunk || 1) * 100;
        else chunk += v;
        j++; last = j - 1; continue;
      }
      break;
    }
    total += chunk;
    if (last >= i && total > 0) out.push({ minor: total * 100, from: words[i].at, to: words[last].to });
    i = Math.max(last + 1, i + 1);
  }
  return out;
};

const CUR_WORDS: [RegExp, Currency | "EUR"][] = [
  [/\b(dolares|dollar|dollars|usd|us\$)\b/, "USD"],
  [/\b(cordobas|nio|c\$)\b/, "NIO"],
  [/\bpesos\s+nicaragu\w*|\bpesos de nicaragua\b/, "NIO"],
  [/\b(euros?|eur)\b/, "EUR"],
];

/** Los montos de UN segmento, en orden de confianza: firmado con signo,
 * firmado con nombre de moneda, palabra-número con moneda, desnudo con
 * decimales, entero desnudo en ranura de dinero. Lo firmado manda: un
 * conteo («3 tacos») jamás le gana a un monto firmado de la misma frase. */
function moneyIn(seg: string, folded: string): MoneyHit[] {
  // Todo patrón corre sobre el texto PLEGADO (ASCII puro): los \b de
  // JavaScript no son de fiar junto a vocales acentuadas, y el plegado de
  // la casa es 1:1 — los tramos sirven tal cual sobre la frase viva.
  seg = folded;
  const hits: MoneyHit[] = [];
  const taken: [number, number][] = [];
  const free = (a: number, b: number) => !taken.some(([x, y]) => a < y && b > x);
  const push = (h: MoneyHit) => { if (free(h.from, h.to) && h.minor > 0) { hits.push(h); taken.push([h.from, h.to]); } };
  // 1 · signo pegado: $300 · C$1,200 · $22.04
  for (const m of seg.matchAll(new RegExp(String.raw`(US\$|C\$|\$)\s?(${NUM})`, "gi"))) {
    const v = toMinor(m[2]); if (v == null) continue;
    push({ minor: v, currency: /c\$/i.test(m[1]) ? "NIO" : "USD", from: m.index ?? 0, to: (m.index ?? 0) + m[0].length, signed: true });
  }
  // 2 · número seguido de nombre de moneda: 300 dólares · 500 cordobas · 20 euros
  for (const m of seg.matchAll(new RegExp(String.raw`(${NUM})\s*(d[oó]lares|dollars?|usd|c[oó]rdobas|nio|euros?|eur|pesos\s+nicaragu\w*)\b`, "gi"))) {
    const v = toMinor(m[1]); if (v == null) continue;
    const cur = CUR_WORDS.find(([re]) => re.test(fold(m[2])))?.[1] ?? "";
    push({ minor: v, currency: cur, from: m.index ?? 0, to: (m.index ?? 0) + m[0].length, signed: true });
  }
  // 3 · nombre de moneda antes del número: dólares 300
  for (const m of seg.matchAll(/\b(d[oó]lares|dollars?|c[oó]rdobas|euros?)\s+(\d[\d.,\s]*\d|\d)/gi)) {
    const v = toMinor(m[2]); if (v == null) continue;
    const cur = CUR_WORDS.find(([re]) => re.test(fold(m[1])))?.[1] ?? "";
    push({ minor: v, currency: cur, from: m.index ?? 0, to: (m.index ?? 0) + m[0].length, signed: true });
  }
  if (hits.length) return hits.sort((a, b) => a.from - b.from);
  // 4 · palabras-número, solo si van pegadas a una moneda o la frase trae verbo de dinero
  const wn = wordNumbers(folded);
  if (wn.length) {
    const withCur = wn.filter((h) => CUR_WORDS.some(([re]) => re.test(folded.slice(h.to, h.to + 24))) || CUR_WORDS.some(([re]) => re.test(folded.slice(Math.max(0, h.from - 12), h.from))));
    const pool = withCur.length ? withCur : (SIGN_ANY.test(folded) ? wn : []);
    for (const h of pool) {
      const near = folded.slice(h.to, h.to + 24) + folded.slice(Math.max(0, h.from - 12), h.from);
      const cur = CUR_WORDS.find(([re]) => re.test(near))?.[1] ?? "";
      push({ minor: h.minor, currency: cur, from: h.from, to: h.to, signed: withCur.length > 0 });
    }
    if (hits.length) return hits.sort((a, b) => a.from - b.from);
  }
  // 5 · desnudo con decimales (22.04 suelto) y 6 · entero en ranura de dinero
  for (const m of seg.matchAll(/\d+[.,]\d{2}\b/g)) {
    const v = toMinor(m[0]); if (v == null) continue;
    push({ minor: v, currency: "", from: m.index ?? 0, to: (m.index ?? 0) + m[0].length, signed: false });
  }
  if (!hits.length) {
    // La ranura de dinero del entero desnudo: NO es fecha («5 de mayo»), NO
    // es hora («3:30») y NO es conteo («3 tacos»: entero pegado a un nombre
    // contable, sin verbo de dinero ni preposición que lo sostenga). Es
    // monto si una preposición de dinero lo enmarca («200 de luz», «por
    // 300») o si es el único número y no está en posición de conteo.
    const ints = [...seg.matchAll(/\b\d[\d.,]*\b/g)].filter((m) => {
      const at = m.index ?? 0;
      const after = folded.slice(at + m[0].length, at + m[0].length + 16);
      return !/^\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(after)
        && !/^\s*:\d{2}/.test(seg.slice(at + m[0].length));
    });
    const slot = (m: RegExpMatchArray): "strong" | "plain" | "count" => {
      const at = m.index ?? 0;
      const before = folded.slice(Math.max(0, at - 6), at);
      const after = folded.slice(at + m[0].length, at + m[0].length + 16);
      if (/\bde\s*$/.test(after.slice(0, 4)) || /^\s+de\b/.test(after) || /\b(de|por)\s*$/.test(before)) return "strong";
      if (/^\s+(en|a|al|del|por|para|con|hoy|ayer|manana)\b/.test(after) || /^\s*$/.test(after) || /^\s*[,.;)]/.test(after)) return "plain";
      if (/^\s+[a-z]/.test(after)) return "count";
      return "plain";
    };
    const strong = ints.filter((m) => slot(m) === "strong");
    const pick = strong.length === 1 ? strong[0]
      : strong.length === 0 && ints.length === 1 && slot(ints[0]) !== "count" ? ints[0]
      : null;
    if (pick) {
      const v = toMinor(pick[0]);
      if (v != null) push({ minor: v, currency: "", from: pick.index ?? 0, to: (pick.index ?? 0) + pick[0].length, signed: false });
    }
  }
  return hits.sort((a, b) => a.from - b.from);
}

/* ------------------------------------------------------------------ signo */

const SIGN_IN: [RegExp, string][] = [
  [/\bme pagaron\b/, "me pagaron"], [/\bme depositaron\b/, "me depositaron"], [/\bme transfirieron\b/, "me transfirieron"],
  [/\bme reembolsaron\b/, "me reembolsaron"], [/\brecibi\b/, "recibi"], [/\bme ingreso\b/, "me ingreso"],
  [/\bsalario\b/, "salario"], [/\bquincena\b/, "quincena"], [/\bgot paid\b/, "got paid"], [/\bwas paid\b/, "was paid"],
  [/\breceived\b/, "received"], [/\bi earned\b/, "i earned"], [/\bpaycheck\b/, "paycheck"], [/\bsalary\b/, "salary"],
  [/\bcobre\b(?!\s+el\s+(?:recibo|luz|agua))/, "cobre"],
];
const SIGN_OUT: [RegExp, string][] = [
  [/\bme cobraron\b/, "me cobraron"], [/\bpague\b/, "pague"], [/\bpago de\b/, "pago de"], [/\bgaste\b/, "gaste"],
  [/\bcompre\b/, "compre"], [/\bme costo\b/, "me costo"], [/\bcosto\b/, "costo"],
  [/\bpaid\b/, "paid"], [/\bspent\b/, "spent"], [/\bbought\b/, "bought"], [/\bwas charged\b/, "was charged"], [/\bit cost\b/, "it cost"],
];
const SIGN_ANY = /\b(pague|gaste|compre|recibi|cobre|me pagaron|paid|spent|bought|received)\b/;

function signIn(folded: string): { sign: "in" | "out" | null; verb: string } {
  // la entrada se pregunta primero: «me pagaron» contiene la raíz de «pagar»
  for (const [re, word] of SIGN_IN) if (re.test(folded)) return { sign: "in", verb: word };
  for (const [re, word] of SIGN_OUT) if (re.test(folded)) return { sign: "out", verb: word };
  return { sign: null, verb: "" };
}

/* ------------------------------------------------------------------ día */

const WEEKDAYS: Record<string, number> = {
  domingo: 0, sunday: 0, lunes: 1, monday: 1, martes: 2, tuesday: 2, miercoles: 3, wednesday: 3,
  jueves: 4, thursday: 4, viernes: 5, friday: 5, sabado: 6, saturday: 6,
};

function dayIn(folded: string, today: string, pastTense: boolean): { day: string; span: [number, number] | null } {
  const rel: [RegExp, number][] = [
    [/\banteayer\b|\bday before yesterday\b/, -2],
    [/\bayer\b|\byesterday\b/, -1],
    [/\bhoy\b|\btoday\b/, 0],
    [/\bmanana\b|\btomorrow\b/, 1],
  ];
  for (const [re, delta] of rel) {
    const m = re.exec(folded);
    if (m) return { day: shiftDay(today, delta), span: [m.index, m.index + m[0].length] };
  }
  const next = /\b(proximo|siguiente|next)\s+(domingo|lunes|martes|miercoles|jueves|viernes|sabado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(folded);
  const plain = /\b(?:el|la|on|last|pasado)\s+(domingo|lunes|martes|miercoles|jueves|viernes|sabado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(folded)
    ?? /\b(domingo|lunes|martes|miercoles|jueves|viernes|sabado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(pasado|past)\b/.exec(folded);
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (next) {
    const target = WEEKDAYS[next[2]]!;
    let delta = (target - dow + 7) % 7;
    if (delta === 0) delta = 7;
    return { day: shiftDay(today, delta), span: [next.index, next.index + next[0].length] };
  }
  if (plain) {
    const target = WEEKDAYS[plain[1]]!;
    let delta = (dow - target + 7) % 7;
    if (pastTense || /pasado|past|last/.test(plain[0])) { if (delta === 0) delta = 0; }
    return { day: shiftDay(today, -delta), span: [plain.index, plain.index + plain[0].length] };
  }
  const loose = datesLoose(folded, today);
  if (loose.length) {
    let day = loose[0];
    // fecha explícita muy futura con verbo en pasado: era del año pasado
    if (pastTense && day > shiftDay(today, 45)) day = shiftDay(day, -365);
    const at = folded.indexOf(day.slice(8));
    return { day, span: at >= 0 ? [at, at + 2] : null };
  }
  return { day: today, span: null };
}

/* ------------------------------------------------------------------ concepto */

const FILLER_EDGE = /^[\s,;:.\-—]+|[\s,;:.\-—]+$/g;
function cleanConcept(seg: string, cuts: [number, number][], verb: string): string {
  let out = "";
  let pos = 0;
  const sorted = [...cuts].sort((a, b) => a[0] - b[0]);
  for (const [a, b] of sorted) { if (a > pos) out += seg.slice(pos, a) + " "; pos = Math.max(pos, b); }
  out += seg.slice(pos);
  let c = out.replace(/\s+/g, " ").replace(FILLER_EDGE, "");
  // Los bordes de palabra aquí son miradas con la clase de letras de la
  // casa (con acentos): el \b de JavaScript calla junto a una vocal
  // acentuada y el verbo quedaría vivo en el concepto («Pagué de luz»).
  const LB = "(?<![a-záéíóúüñ])";
  const RB = "(?![a-záéíóúüñ])";
  if (verb) c = c.replace(new RegExp(`${LB}${wordRe(verb).replace(/ /g, "\\s+")}${RB}`, "i"), " ");
  c = c
    .replace(new RegExp(`${LB}(me|le|se|i|the|a|an)${RB}`, "gi"), " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^((en|de|del|a|por|para|con|of|on|in|at|for)\s+)?(el|la|los|las|un|una|the)\s+/i, "")
    .replace(/^(en|de|del|a|por|para|con|of|on|in|at|for)\s+/i, "")
    .replace(/\s+(en|de|del|por|para|con)\s*$/i, "")
    .replace(new RegExp(`${LB}(${wordRe("cordobas")}|${wordRe("dolares")}|dollars?|euros?|pesos\\s+nicaragu\\w*)${RB}`, "gi"), " ")
    .replace(/\s+/g, " ")
    .replace(FILLER_EDGE, "")
    .trim();
  if (!c) return "";
  // mayúscula inicial sin romper las marcas con forma propia (eBay, iPhone)
  return /^[a-z][A-Z]/.test(c) ? c : c[0].toUpperCase() + c.slice(1);
}

/* ------------------------------------------------------------------ la frase */

/** Parte la frase SOLO cuando cada lado trae su propio monto firmado o
 * desnudo: «pagué 200 de luz y 150 de agua» → dos. Si no se puede partir
 * con seguridad, no se parte: un borrador con la frase entera. */
function splitSegments(raw: string): string[] {
  const parts = raw.split(/\s*(?:;|\by\b|\band\b)\s*/i).filter((p) => p.trim().length > 0);
  if (parts.length < 2) return [raw];
  const ok = parts.every((p) => moneyIn(p, fold(p)).length >= 1);
  return ok ? parts : [raw];
}

function draftFromSegment(seg: string, raw: string, ctx: ParseCtx, sharedSign: "in" | "out" | null): Draft {
  const folded = fold(seg);
  const money = moneyIn(seg, folded);
  const own = signIn(folded);
  const sign = own.sign ?? sharedSign;
  const pastTense = sign != null;
  const { day, span: daySpan } = dayIn(folded, ctx.today, pastTense);
  const cuts: [number, number][] = money.map((h) => [h.from, h.to]);
  if (daySpan) cuts.push(daySpan);
  const concept = cleanConcept(seg, cuts, own.verb);

  const unsure: string[] = [];
  let amountMinor: number | null = null;
  let currency: Currency | null = null;
  if (money.length === 1) {
    amountMinor = money[0].minor;
    if (money[0].currency === "EUR") { currency = null; unsure.push("currency"); }
    else if (money[0].currency) currency = money[0].currency;
    else { currency = ctx.display; unsure.push("currency"); }
    if (!money[0].signed && money[0].currency === "") { /* desnudo con contexto: el monto se leyó, la moneda es la de vista */ }
  } else if (money.length > 1) {
    // dos montos en un solo segmento que no se pudo partir: no se elige
    amountMinor = null;
    unsure.push("amount");
  }
  if (sign == null) { /* missing lo dice validateDraft */ }

  const st = ctx.ledger.structure;
  let book: Draft["book"] = sign === "in" ? "income-variable" : "expense-variable";
  let cat: string | undefined;
  let sub: string | undefined;
  let store: string | undefined;
  let homeSure = false;

  const rule = findRule(importBook(ctx.ledger).rules, merchantKey(concept));
  if (rule && concept) {
    const t = splitTarget(rule.target);
    book = t.kind; cat = t.categoryId || undefined; sub = t.subId || undefined;
    homeSure = true;
  } else if (concept) {
    const storeHit = st.catalog.find((s) => s.kind === "store" && !s.hidden
      && normName(concept).includes(normName(displayName(s, ctx.lang))));
    if (storeHit && sign !== "in") { store = storeHit.id; book = "purchase"; }
    const home = sign ? suggestHome(ctx.ledger, concept, sign) : null;
    if (home) {
      cat = home.c || undefined; sub = home.s || undefined;
      if (!store) {
        const catObj = st.categories.find((c) => c.id === home.c);
        if (catObj) book = sign === "in" ? (catObj.group === "fixed" ? "income-fixed" : "income-variable") : (catObj.group === "fixed" ? "expense-fixed" : "expense-variable");
      }
      homeSure = true;
    }
  }
  if (!homeSure) unsure.push("book");

  const draft: Draft = {
    id: ctx.makeId(), source: "text", kind: "line",
    raw, createdAt: ctx.now,
    day, sign,
    amountMinor, currency,
    concept, note: "",
    book, cat, sub, store,
    unsure, missing: [],
  };
  const dup = findDup(draft, ctx.ledger);
  if (dup) draft.dupOf = dup.id;
  draft.missing = validateDraft(draft).missing;
  return draft;
}

/** La lista en bache (Ola 3, mapa F4): una compra por línea, con o sin
 * monto. Cada línea no vacía pasa por el mismo intérprete de la frase y
 * sus borradores nacen hermanos de lista (source "list", su `raw` es la
 * línea). La numeración y las viñetas son muebles de la lista, no del
 * concepto: se retiran antes de interpretar. El sentido del bache lo
 * declara quien pega la lista en la hoja, una vez: se aplica SOLO a las
 * líneas que no traen su propio verbo — la línea con verbo conserva el
 * suyo, como en la frase. La lista-plan no nace aquí: espera su estudio
 * (D6); toda línea de esta puerta es un movimiento por revisar. */
export function parseList(raw: string, ctx: ParseCtx, batchSign: "in" | "out"): Draft[] {
  const out: Draft[] = [];
  for (const lineRaw of raw.normalize("NFC").split(/\r?\n/)) {
    const line = lineRaw.replace(/^\s*(?:\d{1,3}[.)]|[-*•·])\s+/, "").trim();
    if (!line) continue;
    for (const d of parsePhrase(line, ctx)) {
      const stamped: Draft = { ...d, source: "list" };
      if (stamped.sign == null) {
        stamped.sign = batchSign;
        stamped.missing = validateDraft(stamped).missing;
      }
      out.push(stamped);
    }
  }
  return out;
}

/** La entrada del intérprete: una frase → uno o más borradores hermanos. */
export function parsePhrase(raw: string, ctx: ParseCtx): Draft[] {
  // NFC primero: el teclado del teléfono compone los acentos (á = un
  // carácter); un texto descompuesto (á = a + ´) rompería los patrones.
  const text = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!text) return [];
  const segments = splitSegments(text);
  const headSign = signIn(fold(segments[0])).sign;
  return segments.map((seg) => draftFromSegment(seg, text, ctx, segments.length > 1 ? headSign : null));
}
