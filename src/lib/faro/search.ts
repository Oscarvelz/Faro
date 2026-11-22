import { lineLabel } from "./engine";
import { formatMoney } from "./money";
import { lentOf } from "./debts";
import { loansOf } from "./loans";
import { cardsOf, rewardsOf, storedCards } from "./cards";
import { recipientName } from "./remit-people";
import type { Lang, LedgerState, SectionId } from "./types";

const SYN: Record<string, string[]> = {
  ropa: ["clothes", "clothing", "shein", "shain", "temu", "vestimenta", "moda", "outfit"],
  clothes: ["ropa", "shein", "shain", "temu"],
  tecnologia: ["tech", "gadget", "electronica", "electrónica", "amazon", "aliexpress", "laptop"],
  tech: ["tecnologia", "tecnología", "gadget"],
  telefono: ["celular", "phone", "metropcs", "metro", "movil", "móvil"],
  phone: ["telefono", "teléfono", "celular", "metropcs"],
  ia: ["ai", "grok", "gemini", "chatgpt", "claude", "cloud", "meta", "muse", "inteligencia"],
  ai: ["ia", "grok", "gemini", "chatgpt", "claude", "muse"],
  comida: ["food", "despensa", "restaurante", "alimentos", "supermercado"],
  cafe: ["café", "coffee", "cigarro", "hormiga", "dulce"],
  coffee: ["cafe", "café", "hormiga"],
  deuda: ["credito", "crédito", "tarjeta", "debt", "prestamo", "préstamo", "credit"],
  debt: ["deuda", "credito", "tarjeta"],
  ahorro: ["savings", "emergencia", "retiro", "meta", "fondo"],
  casa: ["renta", "rent", "hipoteca", "mortgage", "agua", "internet", "housing"],
  transporte: ["gasolina", "fuel", "taxi", "bus", "uber"],
  remesa: ["envio", "envío", "nicaragua", "transfer", "familia"],
  salud: ["medico", "médico", "health", "seguro", "doctor"],
  mascota: ["pet", "vet", "veterinario", "dog", "gato"],
  streaming: ["youtube", "tv", "xuper", "netflix"],
};

export type Hit = {
  id: string;
  section: SectionId;
  title: string;
  subtitle: string;
  monthKey: string;
  lineId: string;
  /** 1.3.92: a person in Libros → Me deben / Debo (a lent amount or a loan received), not a line. */
  vault?: "owed" | "owe";
};

/**
 * §21 (1.3.382) — LA ENTRADA NATURAL: las palabras de función (artículos,
 * preposiciones, muletillas interrogativas) no son sustancia de búsqueda:
 * se despojan antes de tokenizar, y la búsqueda caza lo que queda («¿cuánto
 * me queda en ahorros?» → queda, ahorros). Es tokenización, no
 * interpretación: encuentra mejor; no entiende ni responde nada (L-B1).
 * Si la consulta es SOLO muletillas, no queda sustancia y no hay tokens:
 * la búsqueda se comporta como con una consulta vacía, nunca peor (L-B4).
 */
const STOP = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "y", "o", "a", "con", "por", "para",
  "mi", "me", "se", "que", "es", "al", "lo", "su", "sus", "tu", "tus", "este", "esta", "esto", "cuando", "cuanto",
  "cuanta", "cuantos", "donde", "como", "cual", "quien", "hay", "fue", "son", "mas", "muy", "sin", "sobre", "entre",
  "hasta", "desde", "tambien", "puedo", "tengo",
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "my", "me", "is", "are", "was", "were", "do", "does",
  "did", "have", "has", "had", "what", "when", "where", "how", "much", "many", "who", "which", "this", "that",
  "it", "its", "and", "or", "with", "from", "by", "about", "into", "over", "under", "can", "could", "should",
  "would", "you", "they",
]);

function expand(q: string): string[] {
  const raw = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9.$]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
  // La sustancia también en singular: la gente pregunta en plural
  // («ahorros») y la casa nombra en singular («Ahorro») — la forma
  // recortada entra como token más, sin quitar el plural.
  const tokens = [...new Set([...raw, ...raw.filter((t) => t.length > 3 && t.endsWith("s")).map((t) => t.slice(0, -1))])];
  const all = new Set(tokens);
  for (const t of tokens) {
    for (const s of SYN[t] ?? []) all.add(s.normalize("NFD").replace(/\p{Diacritic}/gu, ""));
  }
  return [...all];
}

function sectionFor(kind: string): SectionId {
  if (kind.startsWith("income")) return "income";
  if (kind === "expense-fixed") return "fixed";
  if (kind === "expense-variable") return "variable";
  if (kind === "purchase") return "shops";
  if (kind === "subscription") return "subs";
  return "desk";
}

export function searchLedger(state: LedgerState, query: string, lang: Lang, names: Parameters<typeof lineLabel>[1]): Hit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const tokens = expand(q);
  const digits = q.replace(/[^\d]/g, "");
  const hits: Hit[] = [];
  for (const [monthKey, bucket] of Object.entries(state.months)) {
    for (const line of bucket.lines) {
      // La puerta anti-fuga (descanso.ts): la búsqueda jamás presenta una línea apartada.
      if (line.rest) continue;
      // 1.3.118: a Remesas line also answers to its recipient's name.
      const to = recipientName(state, line);
      const hay = `${lineLabel(line, names, lang)} ${formatMoney(line.amountMinor, line.currency, lang)} ${line.kind} ${to}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      const amountDigits = String(Math.abs(line.amountMinor));
      const tokenHit = tokens.some((t) => hay.includes(t));
      const numberHit = digits.length >= 2 && (amountDigits.includes(digits) || hay.includes(digits));
      if (!tokenHit && !numberHit) continue;
      hits.push({
        id: `${monthKey}:${line.id}`,
        section: sectionFor(line.kind),
        title: line.concept || names.cat(line.categoryId) || names.purchase(line.categoryId) || line.kind,
        subtitle: `${monthKey} · ${formatMoney(line.amountMinor, line.currency, lang)}${to ? ` · ${lang === "en" ? "To" : "Para"} ${to}` : ""}`,
        monthKey,
        lineId: line.id,
      });
    }
  }
  // People in Deudas: who owes you (Me deben) and who lent you (Préstamos).
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const people: { id: string; name: string; amountMinor: number; currency: "NIO" | "USD"; date: string; vault: "owed" | "owe"; archived?: boolean; card?: string; rw?: boolean }[] = [
    ...lentOf(state).map((l) => ({ id: l.id, name: l.person, amountMinor: l.amountMinor, currency: l.currency, date: l.startedOn || l.dueOn, vault: "owed" as const, archived: l.archived })),
    ...loansOf(state).map((l) => ({ id: l.id, name: l.lender, amountMinor: l.amountMinor, currency: l.currency, date: l.takenOn, vault: "owe" as const, archived: l.archived })),
    // 1.3.107: credit cards (name, issuer, last 4), with their latest balance.
    ...[...cardsOf(state), ...storedCards(state).filter((c) => c.archived)].map((c) => ({ id: c.id, name: `${c.name}${c.last4 ? ` ···${c.last4}` : ""}`, amountMinor: c.snaps[c.snaps.length - 1]?.balanceMinor ?? 0, currency: c.currency, date: c.snaps[c.snaps.length - 1]?.on ?? "", vault: "owe" as const, archived: c.archived, card: `${c.issuer} ${c.last4}` })),
    // 1.3.109: card rewards (cash back) live on the Me deben side.
    ...cardsOf(state).filter((c) => rewardsOf(c).amount > 0).map((c) => ({ id: `rw-${c.id}`, name: `${lang === "en" ? "Rewards" : "Recompensas"} · ${c.name}`, amountMinor: rewardsOf(c).amount, currency: c.currency, date: rewardsOf(c).on, vault: "owed" as const, rw: true })),
  ];
  for (const p of people) {
    const word = p.rw ? (lang === "en" ? "card rewards cash back cashback redeem owed to me" : "recompensas de tarjetas cashback reembolso en efectivo canjear me deben") : p.card !== undefined ? `${p.card} ${lang === "en" ? "credit card i owe debt" : "tarjeta de credito debo deuda prestamo"}` : p.vault === "owed" ? (lang === "en" ? "owed to me loan" : "me deben prestamo cobro") : (lang === "en" ? "i owe loan debt" : "debo prestamo deuda");
    const hay = norm(`${p.name} ${word} ${formatMoney(p.amountMinor, p.currency, lang)}`);
    const numberHit = digits.length >= 2 && String(p.amountMinor).includes(digits);
    if (!tokens.some((t) => hay.includes(t)) && !numberHit) continue;
    hits.push({
      id: `${p.vault}:${p.id}`, section: "income", vault: p.vault, monthKey: (p.date || "").slice(0, 7), lineId: "",
      title: p.name,
      subtitle: `${p.vault === "owed" ? (lang === "en" ? "Owed to me" : "Me deben") : (lang === "en" ? "I owe" : "Debo")} · ${formatMoney(p.amountMinor, p.currency, lang)}${p.archived ? (lang === "en" ? " · archived" : " · archivado") : ""}`,
    });
  }
  // §21 (1.3.382): dentro de Líneas manda la RELEVANCIA y luego la
  // RECENCIA — una coincidencia en el título de la línea pesa más que
  // una en su contexto, y a igual peso gana el mes más nuevo. El rótulo
  // del grupo lo declara en la superficie; aquí solo se ordena.
  const titleHit = (h: Hit) => {
    const t = norm(h.title);
    return tokens.some((x) => t.includes(x)) ? 1 : 0;
  };
  hits.sort((a, b) => titleHit(b) - titleHit(a) || (a.monthKey < b.monthKey ? 1 : a.monthKey > b.monthKey ? -1 : 0));
  return hits;
}

/**
 * §21 (1.3.382) — LOS LUGARES: las cuentas y categorías que la consulta
 * NOMBRA van antes que las líneas sueltas (el espécimen fundador: con
 * «ahorros», la cuenta Ahorros debió ser el primer lugar encontrado, no
 * una ausencia). Un lugar es una categoría de la estructura o una casa
 * de compras; su puerta es su casa (Estructura / Tiendas), por el tema
 * del Manual como todas las puertas de la casa. Sin cifras: un lugar se
 * nombra, no se calcula (L-B1).
 */
export type PlaceHit = {
  id: string;
  kind: "cat" | "purchase";
  title: string;
  /** Su casa, en la voz de la app: «Categoría · Estructura». */
  where: string;
};

export function searchPlaces(state: LedgerState, query: string, lang: Lang, names: Parameters<typeof lineLabel>[1]): PlaceHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const tokens = expand(q);
  if (!tokens.length) return [];
  const out: PlaceHit[] = [];
  const push = (kind: PlaceHit["kind"], id: string, title: string, where: string) => {
    const t = title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (!tokens.some((x) => t.includes(x))) return;
    out.push({ id: `${kind}:${id}`, kind, title, where });
  };
  for (const c of state.structure.categories) {
    if (c.hidden) continue;
    push("cat", c.id, names.cat(c.id), lang === "en" ? "Category · Structure" : "Categoría · Estructura");
  }
  for (const p of state.structure.purchases) {
    if (p.hidden) continue;
    push("purchase", p.id, names.purchase(p.id), lang === "en" ? "Shop · Shops" : "Tienda · Tiendas");
  }
  // El nombre exacto (o que empieza por la sustancia) manda sobre la
  // coincidencia parcial: el lugar NOMBRADO va primero.
  const exact = (h: PlaceHit) => {
    const t = h.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return tokens.some((x) => t === x || t.startsWith(x)) ? 1 : 0;
  };
  out.sort((a, b) => exact(b) - exact(a));
  return out.slice(0, 4);
}
