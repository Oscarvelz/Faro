/**
 * FARO — Captura Inteligente, Ola 2: la puerta de texto (mapa F2 + §4).
 * «Escribir como pienso»: una caja donde la frase entra como se piensa
 * («pagué 200 de luz y 150 de agua») y el intérprete la vuelve borradores
 * en la bandeja. La puerta no guarda nada en el libro: interpreta, deja
 * los borradores en la bandeja con sus dudas dichas en palabras, y ofrece
 * la mesa. Vive en la fila de captura de los formularios, junto a
 * Escanear, y dentro de la hoja de la bandeja — una familia, una casa.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PenLine, X } from "lucide-react";
import { addDrafts } from "@/lib/faro/drafts";
import { parsePhrase } from "@/lib/faro/textparse";
import { uid } from "@/lib/faro/money";
import type { Draft } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";
import { useFaro } from "./provider";
import { ReviewTable } from "./review-table";
import "./scan.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const sym = (c: string) => (c === "USD" ? "$" : "C$");
const fmtAmt = (minor: number, c: string) => `${sym(c)}${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Las dudas del borrador, en palabras cortas — la misma honestidad de la
 * mesa, en la puerta: lo que el intérprete no supo se dice, no se calla. */
function doubts(d: Draft, lang: string): string[] {
  const out: string[] = [];
  if (d.missing.includes("amount")) out.push(L(lang, "sin monto", "no amount"));
  if (d.missing.includes("sign")) out.push(L(lang, "¿entra o sale?", "in or out?"));
  if (d.missing.includes("currency")) out.push(L(lang, "moneda sin confirmar", "currency unconfirmed"));
  else if (d.unsure.includes("currency")) out.push(L(lang, "moneda: la de vista", "currency: the view one"));
  if (d.unsure.includes("book")) out.push(L(lang, "casa supuesta", "home guessed"));
  return out;
}

export function CaptureTextSheet({ onClose, onReview }: { onClose: () => void; onReview: () => void }) {
  const { session, commit, lang } = useFaro();
  const [text, setText] = useState("");
  const [made, setMade] = useState<Draft[] | null>(null);
  useLayer(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const interpret = () => {
    if (!session || !text.trim()) return;
    const drafts = parsePhrase(text, {
      ledger: session.ledger,
      lang,
      today: todayLocal(),
      display: session.ledger.settings.display ?? "USD",
      makeId: uid,
      now: new Date().toISOString(),
    });
    if (!drafts.length) return;
    commit((s) => addDrafts(s, drafts), L(lang, `Texto ${drafts.length}`, `Text ${drafts.length}`));
    setMade(drafts);
  };
  return createPortal(
    <div className="scn-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scn-sheet tray-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Escribir como pienso", "Write it as I think it")}>
        <div className="scn-head">
          <span className="scn-badge" aria-hidden><PenLine /></span>
          <h3 className="lab-head">{L(lang, "Escribir como pienso", "Write it as I think it")}<Hint topic="captura-texto" /></h3>
          <button type="button" className="scn-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="scn-body">
          {made == null ? (
            <>
              <textarea
                className="field cap-text-area"
                data-anchor="capture-text-area"
                rows={3}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={L(lang, "Ej.: pagué 200 de luz y 150 de agua", "E.g.: I paid 200 for power and 150 for water")}
                aria-label={L(lang, "Tu frase", "Your phrase")}
              />
              <p className="cap-text-note">{L(lang, "Faro lo entiende y lo deja en la bandeja. Nada se guarda sin tu revisión.", "Faro understands it and leaves it in the tray. Nothing is saved without your review.")}</p>
            </>
          ) : (
            <div className="tray-group">
              <p className="tray-day">{L(lang, `${made.length} en la bandeja`, `${made.length} in the tray`)}</p>
              {made.map((d) => {
                const dd = doubts(d, lang);
                return (
                  <div key={d.id} className="tray-row" data-anchor="capture-text-row">
                    <span className="tray-main">
                      <strong>{d.concept || L(lang, "(sin concepto)", "(no concept)")}</strong>
                      <span>{d.amountMinor != null && d.currency ? fmtAmt(d.amountMinor, d.currency) : L(lang, "sin monto", "no amount")} · {d.day}{dd.length ? ` · ${dd.join(" · ")}` : ""}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="scn-foot">
          {made == null ? (
            <>
              <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
              <button type="button" className="btn" data-anchor="capture-text-go" disabled={!text.trim()} onClick={interpret}>{L(lang, "Interpretar", "Interpret")}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn secondary" onClick={() => { setMade(null); setText(""); }}>{L(lang, "Otra frase", "Another phrase")}</button>
              <button type="button" className="btn" onClick={onReview}>{L(lang, "Revisar", "Review")}</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** El botón de la fila de captura, hermano de Escanear: vive donde el
 * formulario ya captura (Central y los libros) bajo el asiento
 * capture.text (Esencial). Al revisar, abre la mesa y cierra su hoja. */
export function TextEntry() {
  const { lang, has } = useFaro();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  if (!has("capture.text")) return null;
  return (
    <span className="scn-entry" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="scn-btn" data-anchor="capture-text-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}>
        <span>{L(lang, "Escribir", "Write")}</span>
        <PenLine aria-hidden />
      </button>
      {open ? <CaptureTextSheet onClose={() => setOpen(false)} onReview={() => { setOpen(false); setReview(true); }} /> : null}
      {review ? <ReviewTable onClose={() => setReview(false)} /> : null}
    </span>
  );
}
