/** The category picker shared by the import review and the merchant rules (a sheet with the user's categories, grouped). */
import { X } from "lucide-react";
import { splitTarget, type Target } from "@/lib/faro/bankbook";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/** Short name for a chip: the subcategory, unless it is a generic "Otros" (then "Category · Otros"). */
export function chipLabel(t: Target | undefined, lang: string): string {
  if (!t) return L(lang, "Elegir", "Choose");
  return t.sub && !/^(otros|otras|other|others)$/i.test(t.sub.trim()) ? t.sub : t.label;
}

export function TargetPicker({ lang, targets, value, note, fixed, onPick, onClose }: { lang: string; targets: Target[]; value: string; note: string; fixed?: boolean; onPick: (v: string) => void; onClose: () => void }) {
  useLayer(!!fixed, onClose);
  return (
    <div className={`imp-pick-scrim${fixed ? " is-fixed" : ""}`} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="imp-pick" role="dialog" aria-label={L(lang, "Categoría", "Category")}>
        <div className="imp-pick-head">
          <h4 className="lab-head">{L(lang, "Categoría", "Category")}<Hint topic="imp-categoria" /></h4>
          <button type="button" className="imp-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <p className="imp-pick-note">{note}</p>
        <div className="imp-pick-list" role="listbox" ref={(el) => { const on = el?.querySelector<HTMLElement>('[aria-selected="true"]'); if (el && on && !el.dataset.placed) { el.dataset.placed = "1"; el.scrollTop = on.offsetTop - el.clientHeight / 2 + on.offsetHeight / 2; } }}>
          {targets.map((t) => {
            const kind = splitTarget(t.value).kind;
            return (
              <button key={t.value} type="button" role="option" aria-selected={value === t.value} className={t.sub ? "is-sub" : "is-cat"} onClick={() => onPick(t.value)}>
                {t.sub ? t.sub : t.cat}{!t.sub ? <em>{kind === "purchase" ? L(lang, "compra", "purchase") : kind === "expense-fixed" ? L(lang, "fijo", "fixed") : L(lang, "variable", "variable")}</em> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
