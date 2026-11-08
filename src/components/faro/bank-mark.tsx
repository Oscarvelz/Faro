/**
 * A bank's mark, shared: Ajustes' tables and lists wear it, and since 1.3.156 the line form's
 * «Pagado con» picker does too — so it lives here, not inside the lazy bank-settings chunk.
 */
import { acctColor } from "@/lib/faro/bankbook";
import { BANK_PATHS } from "@/lib/faro/bank-paths";

/** A bank's mark: its colour plate with the Simple Icons glyph (Chase, Wells Fargo, PayPal…) or the name's initial. */
export function BankMark({ a, className }: { a: { bank: string; color?: string; name: string }; className?: string }) {
  const path = BANK_PATHS[a.bank];
  const fg = a.bank === "wellsfargo" && !a.color ? "#ffcd41" : "#fff";
  const ch = (a.name.trim()[0] ?? "•").toUpperCase();
  return (
    <svg viewBox="0 0 32 32" className={`bk-mark${className ? ` ${className}` : ""}`} data-bank={a.bank} aria-hidden style={{ ["--bk-c" as string]: acctColor(a) }}>
      <rect className="bk-mark-plate" width="32" height="32" rx="9" />
      {path ? <path className="bk-mark-glyph" d={path} fill={fg} transform="translate(7.5 7.5) scale(.7083)" /> : <text className="bk-mark-glyph" x="16" y="21.5" textAnchor="middle" fill={fg} fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="15">{ch}</text>}
    </svg>
  );
}
