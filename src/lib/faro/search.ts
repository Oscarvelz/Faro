import { lineLabel } from "./engine";
import { formatMoney } from "./money";
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
  return hits;
}
