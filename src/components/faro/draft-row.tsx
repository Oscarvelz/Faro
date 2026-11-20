/**
 * FARO — la fila de resultado de una captura (Escribir / Pegar una lista)
 * y sus dudas ÚTILES (Oscar, 2026-11-20): «Imagínate que el usuario toca
 * sobre casa supuesta y tiene acceso a poder cambiarlo en esa burbuja.
 * Las burbujas se hacen útiles y no solamente decorativas.»
 *
 * Cada pastilla de duda es un botón: al tocarla abre su menú ahí mismo —
 * la casa entre los libros de Faro, la moneda entre las dos que Faro
 * permite (dólar y córdoba), el sentido entre entra y sale — y la
 * corrección cae sobre el borrador por la receta de la mesa
 * (patchDraft: tocar un campo limpia su duda y re-deriva lo que falta).
 * La fila no guarda nada en el libro: el borrador sigue en la bandeja,
 * esperando la mesa como siempre.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { validateDraft } from "@/lib/faro/drafts";
import type { Draft, LineKind } from "@/lib/faro/types";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const sym = (c: string) => (c === "USD" ? "$" : "C$");
const fmtAmt = (minor: number, c: string) => `${sym(c)}${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FixKey = "sign" | "currency" | "book";
interface Fix { key: FixKey; label: string }

function fixesOf(d: Draft, lang: string): Fix[] {
  const out: Fix[] = [];
  if (d.missing.includes("sign")) out.push({ key: "sign", label: L(lang, "¿entra o sale?", "in or out?") });
  if (d.missing.includes("currency")) out.push({ key: "currency", label: L(lang, "moneda sin confirmar", "currency unconfirmed") });
  else if (d.unsure.includes("currency")) out.push({ key: "currency", label: L(lang, "moneda: la de vista", "currency: the view one") });
  if (d.unsure.includes("book")) out.push({ key: "book", label: L(lang, "casa supuesta", "home guessed") });
  return out;
}

const BOOKS: { kind: LineKind; es: string; en: string }[] = [
  { kind: "expense-variable", es: "Gastos variables", en: "Variable expenses" },
  { kind: "expense-fixed", es: "Gastos fijos", en: "Fixed expenses" },
  { kind: "purchase", es: "Compras", en: "Purchases" },
  { kind: "income-variable", es: "Ingresos variables", en: "Variable income" },
  { kind: "income-fixed", es: "Ingresos fijos", en: "Fixed income" },
  { kind: "subscription", es: "Cuotas", en: "Dues" },
];

/** El espejo local de patchDraft para la copia que la hoja está
 * mostrando: el parche manda, la duda tocada se limpia y lo que falta
 * se re-deriva — la misma conducta, sin esperar al estado global. */
export function mirrorPatch(d: Draft, patch: Partial<Draft>): Draft {
  const next: Draft = { ...d, ...patch };
  const touched = Object.keys(patch);
  next.unsure = next.unsure.filter((f) => !touched.includes(f));
  next.missing = validateDraft(next).missing;
  return next;
}

export function DraftResultRow({ d, lang, anchor, onFix }: {
  d: Draft;
  lang: string;
  anchor: string;
  onFix: (d: Draft, patch: Partial<Draft>) => void;
}) {
  const [open, setOpen] = useState<FixKey | null>(null);
  const fixes = fixesOf(d, lang);
  const choose = (patch: Partial<Draft>) => { setOpen(null); onFix(d, patch); };
  return (
    <div className="tray-row" data-anchor={anchor}>
      <span className="tray-main">
        <strong>{d.concept || L(lang, "(sin concepto)", "(no concept)")}</strong>
        <span className="tray-meta">{d.day}</span>
        {fixes.length ? (
          <span className="tray-doubts">
            {fixes.map((f) => (
              <button key={f.key} type="button" className={`tray-fix${open === f.key ? " is-open" : ""}`} data-anchor="tray-fix" aria-expanded={open === f.key} onClick={() => setOpen(open === f.key ? null : f.key)}>
                {f.label}<ChevronDown aria-hidden />
              </button>
            ))}
          </span>
        ) : null}
        {open === "sign" ? (
          <span className="tray-fixmenu" role="menu">
            <button type="button" onClick={() => choose({ sign: "in" })}>{L(lang, "Entra", "Money in")}</button>
            <button type="button" onClick={() => choose({ sign: "out" })}>{L(lang, "Sale", "Money out")}</button>
          </span>
        ) : null}
        {open === "currency" ? (
          <span className="tray-fixmenu" role="menu">
            <button type="button" className={d.currency === "USD" ? "is-cur" : undefined} onClick={() => choose({ currency: "USD" })}>{L(lang, "$ Dólares", "$ Dollars")}</button>
            <button type="button" className={d.currency === "NIO" ? "is-cur" : undefined} onClick={() => choose({ currency: "NIO" })}>{L(lang, "C$ Córdobas", "C$ Córdobas")}</button>
          </span>
        ) : null}
        {open === "book" ? (
          <span className="tray-fixmenu" role="menu">
            {BOOKS.map((b) => (
              <button key={b.kind} type="button" className={d.book === b.kind ? "is-cur" : undefined} onClick={() => choose({ book: b.kind, cat: undefined, sub: undefined })}>
                {L(lang, b.es, b.en)}
              </button>
            ))}
          </span>
        ) : null}
      </span>
      {d.amountMinor != null && d.currency
        ? <span className="tray-amt num">{fmtAmt(d.amountMinor, d.currency)}</span>
        : <span className="tray-amt is-none">{L(lang, "sin monto", "no amount")}</span>}
    </div>
  );
}
