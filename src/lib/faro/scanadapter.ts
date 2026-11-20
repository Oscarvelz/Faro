/**
 * FARO — Captura Inteligente, Ola 1: el adaptador del escaneo (brief
 * BRIEF-OLA-1 §5-P4). Vive junto al escaneo (receiptparse) y traduce su
 * salida al contrato Draft SIN tocar el lector: receiptparse sigue
 * produciendo ScanDraft y su batería corre intacta.
 *
 * Conductas que el adaptador preserva del flujo anterior (DraftCard):
 * - El enrutado de libros es el de toCard (la Card llega ya enrutada).
 * - La marca de la suscripción se resuelve con la misma regla del antiguo
 *   save() (marca de la biblioteca, si no el recorte si el usuario lo
 *   dejó puesto, si no la genérica) y viaja en el borrador: su casa es
 *   Line.icon.
 * - La regla aprendida por comercio manda sobre el acierto del lector
 *   (ley 9): ese comercio nace clasificado, sin pregunta de casa.
 * - El duplicado se busca con el criterio común de la bandeja (findDup)
 *   y, si el lector ya lo había marcado con el suyo (isDuplicate), se
 *   conserva su gemelo: la fila nace desmarcada en la mesa.
 */
import { findRule, importBook, merchantKey, splitTarget } from "./bankbook.ts";
import { findDup, validateDraft } from "./drafts.ts";
import { parseAmount } from "./money.ts";
import { isDuplicate, type ScanDraft } from "./receiptparse.ts";
import { libraryOff } from "./subs.ts";
import type { Draft, LedgerState, LineKind } from "./types.ts";

/** Lo que el adaptador lee de la Card del escaneo (su forma viva en
 * receipt-scan.tsx; aquí basta la estructura). */
export type ScanCardLike = {
  id: string;
  book: string;
  concept: string;
  amount: string;
  currency: Draft["currency"];
  date: string;
  cadence: string;
  note: string;
  brand: string;
  crop: string;
  useCrop: boolean;
  generic: string;
  category: string;
  sub: string;
  unsure: string[];
  dup: boolean;
};

const money = (minor: number | null) => (minor == null ? "" : (minor / 100).toFixed(2));

export function scanToDraft(d: ScanDraft, c: ScanCardLike, ledger: LedgerState): Draft {
  const sub = c.book === "subscription";
  const off = libraryOff(ledger);
  const icon = sub ? (c.brand && !off.has(c.brand) ? `sub:${c.brand}` : c.crop && c.useCrop ? `sub:${c.crop}` : c.generic ? `sub:${c.generic}` : "") : "";
  const draft: Draft = {
    id: c.id, source: "photo", kind: "line",
    raw: [d.concept, money(d.amountMinor), d.date].filter(Boolean).join(" · "),
    createdAt: new Date().toISOString(),
    day: c.date, sign: "out",
    amountMinor: parseAmount(c.amount), currency: c.currency,
    concept: c.concept, note: c.note,
    book: c.book as LineKind,
    cat: c.category || undefined, sub: c.sub || undefined,
    cadence: sub || c.book === "expense-fixed" ? (c.cadence || "monthly") : undefined,
    icon: icon || undefined,
    unsure: [...c.unsure], missing: [],
  };
  const rule = findRule(importBook(ledger).rules, merchantKey(draft.concept));
  if (rule) {
    const t = splitTarget(rule.target);
    draft.book = t.kind;
    draft.cat = t.categoryId || undefined;
    draft.sub = t.subId || undefined;
  }
  const dup = findDup(draft, ledger);
  if (dup) draft.dupOf = dup.id;
  else if (c.dup) {
    const all = Object.values(ledger.months).flatMap((m) => m.lines ?? []);
    const twin = all.find((l) => isDuplicate(d, [l]));
    if (twin) draft.dupOf = twin.id;
  }
  draft.missing = validateDraft(draft).missing;
  return draft;
}
