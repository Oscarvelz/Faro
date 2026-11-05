import { lineLabel } from "./engine";
import { formatMoney } from "./money";
import { lentOf } from "./debts";
import { loansOf } from "./loans";
import { cardsOf, storedCards } from "./cards";
import type { Lang, LedgerState, SectionId } from "./types";

const SYN: Record<string, string[]> = {
  ropa: ["clothes", "clothing", "shein", "shain", "temu", "vestimenta", "moda", "outfit"],
  clothes: ["ropa", "shein", "shain", "temu"],
  tecnologia: ["tech", "gadget", "electronica", "electrónica", "amazon", "aliexpress", "laptop"],
  tech: ["tecnologia", "tecnología", "gadget"],
  telefono: ["celular", "phone", "metropcs", "metro", "movil", "móvil"],
  phone: ["telefono", "teléfono", "celular", "metropcs"],
  ia: ["ai", "grok", "gemini", "chatgpt", "claude", "cloud", "meta", "inteligencia"],
  ai: ["ia", "grok", "gemini", "chatgpt", "claude"],
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

function expand(q: string): string[] {
  const tokens = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9.$]+/)
    .filter((t) => t.length > 1);
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
      const hay = `${lineLabel(line, names, lang)} ${formatMoney(line.amountMinor, line.currency, lang)} ${line.kind}`
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
        subtitle: `${monthKey} · ${formatMoney(line.amountMinor, line.currency, lang)}`,
        monthKey,
        lineId: line.id,
      });
    }
  }
  // People in Deudas: who owes you (Me deben) and who lent you (Préstamos).
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const people: { id: string; name: string; amountMinor: number; currency: "NIO" | "USD"; date: string; vault: "owed" | "owe"; archived?: boolean; card?: string }[] = [
    ...lentOf(state).map((l) => ({ id: l.id, name: l.person, amountMinor: l.amountMinor, currency: l.currency, date: l.startedOn || l.dueOn, vault: "owed" as const, archived: l.archived })),
    ...loansOf(state).map((l) => ({ id: l.id, name: l.lender, amountMinor: l.amountMinor, currency: l.currency, date: l.takenOn, vault: "owe" as const, archived: l.archived })),
    // 1.3.107: credit cards (name, issuer, last 4), with their latest balance.
    ...[...cardsOf(state), ...storedCards(state).filter((c) => c.archived)].map((c) => ({ id: c.id, name: `${c.name}${c.last4 ? ` ···${c.last4}` : ""}`, amountMinor: c.snaps[c.snaps.length - 1]?.balanceMinor ?? 0, currency: c.currency, date: c.snaps[c.snaps.length - 1]?.on ?? "", vault: "owe" as const, archived: c.archived, card: `${c.issuer} ${c.last4}` })),
  ];
  for (const p of people) {
    const word = p.card !== undefined ? `${p.card} ${lang === "en" ? "credit card i owe debt" : "tarjeta de credito debo deuda prestamo"}` : p.vault === "owed" ? (lang === "en" ? "owed to me loan" : "me deben prestamo cobro") : (lang === "en" ? "i owe loan debt" : "debo prestamo deuda");
    const hay = norm(`${p.name} ${word} ${formatMoney(p.amountMinor, p.currency, lang)}`);
    const numberHit = digits.length >= 2 && String(p.amountMinor).includes(digits);
    if (!tokens.some((t) => hay.includes(t)) && !numberHit) continue;
    hits.push({
      id: `${p.vault}:${p.id}`, section: "income", vault: p.vault, monthKey: (p.date || "").slice(0, 7), lineId: "",
      title: p.name,
      subtitle: `${p.vault === "owed" ? (lang === "en" ? "Owed to me" : "Me deben") : (lang === "en" ? "I owe" : "Debo")} · ${formatMoney(p.amountMinor, p.currency, lang)}${p.archived ? (lang === "en" ? " · archived" : " · archivado") : ""}`,
    });
  }
  return hits;
}
