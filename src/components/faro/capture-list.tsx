/**
 * FARO — Captura Inteligente, Ola 3: la lista en bache (mapa F4).
 * «Pegar una lista»: el cierre del día de Oscar — la lista de compras o
 * de gastos escrita de corrido, una compra por línea, con o sin montos —
 * y el intérprete la parte en borradores hermanos en la bandeja. La hoja
 * pregunta el sentido UNA vez por la lista (todo sale / todo entra) y lo
 * aplica solo a las líneas sin verbo propio; la línea con verbo conserva
 * el suyo. Como sus hermanas, la puerta no guarda nada en el libro: deja
 * borradores con sus dudas dichas y ofrece la mesa. La lista-plan no
 * nace aquí — espera su estudio de diseño (D6).
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ListPlus, X } from "lucide-react";
import { addDrafts } from "@/lib/faro/drafts";
import { parseList } from "@/lib/faro/textparse";
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

/** Las dudas del borrador, en palabras cortas — la misma honestidad de
 * la puerta de texto y de la mesa. El monto NO se repite aquí: la fila
 * ya lo dice en su posición («sin monto» donde iría la cifra). */
function doubts(d: Draft, lang: string): string[] {
  const out: string[] = [];
  if (d.missing.includes("sign")) out.push(L(lang, "¿entra o sale?", "in or out?"));
  if (d.missing.includes("currency")) out.push(L(lang, "moneda sin confirmar", "currency unconfirmed"));
  else if (d.unsure.includes("currency")) out.push(L(lang, "moneda: la de vista", "currency: the view one"));
  if (d.unsure.includes("book")) out.push(L(lang, "casa supuesta", "home guessed"));
  return out;
}

export function CaptureListSheet({ onClose, onReview }: { onClose: () => void; onReview: () => void }) {
  const { session, commit, lang } = useFaro();
  const [text, setText] = useState("");
  const [batchSign, setBatchSign] = useState<"in" | "out">("out");
  const [made, setMade] = useState<Draft[] | null>(null);
  useLayer(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const interpret = () => {
    if (!session || !text.trim()) return;
    const drafts = parseList(text, {
      ledger: session.ledger,
      lang,
      today: todayLocal(),
      display: session.ledger.settings.display ?? "USD",
      makeId: uid,
      now: new Date().toISOString(),
    }, batchSign);
    if (!drafts.length) return;
    commit((s) => addDrafts(s, drafts), L(lang, `Lista ${drafts.length}`, `List ${drafts.length}`));
    setMade(drafts);
  };
  return createPortal(
    <div className="scn-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scn-sheet tray-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Pegar una lista", "Paste a list")}>
        <div className="scn-head">
          <span className="scn-badge" aria-hidden><ListPlus /></span>
          <h3 className="lab-head">{L(lang, "Pegar una lista", "Paste a list")}<Hint topic="captura-lista" /></h3>
          <button type="button" className="scn-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="scn-body">
          {made == null ? (
            <>
              <div className="cap-sign-row" role="group" aria-label={L(lang, "Sentido de la lista", "The list's direction")}>
                <button type="button" className={`cap-sign${batchSign === "out" ? " is-on" : ""}`} data-anchor="capture-list-out" aria-pressed={batchSign === "out"} onClick={() => setBatchSign("out")}>{L(lang, "Todo sale", "All out")}</button>
                <button type="button" className={`cap-sign${batchSign === "in" ? " is-on" : ""}`} data-anchor="capture-list-in" aria-pressed={batchSign === "in"} onClick={() => setBatchSign("in")}>{L(lang, "Todo entra", "All in")}</button>
              </div>
              <textarea
                className="field cap-text-area cap-list-area"
                data-anchor="capture-list-area"
                rows={7}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={L(lang, "Una compra por línea:\nLeche 120\nPan 45\nPagué 300 de luz", "One purchase per line:\nMilk 120\nBread 45\nI paid 300 for power")}
                aria-label={L(lang, "Tu lista", "Your list")}
              />
              <p className="cap-text-note">{L(lang, "El sentido vale para las líneas sin verbo propio; la que trae su verbo conserva el suyo. Todo cae en la bandeja: nada se guarda sin tu revisión.", "The direction covers lines with no verb of their own; a line with its own verb keeps it. Everything lands in the tray: nothing is saved without your review.")}</p>
            </>
          ) : (
            <div className="tray-group">
              <p className="tray-day">{L(lang, `${made.length} en la bandeja`, `${made.length} in the tray`)}</p>
              {made.map((d) => {
                const dd = doubts(d, lang);
                return (
                  <div key={d.id} className="tray-row" data-anchor="capture-list-row">
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
              <button type="button" className="btn" data-anchor="capture-list-go" disabled={!text.trim()} onClick={interpret}>{L(lang, "Interpretar", "Interpret")}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn secondary" onClick={() => { setMade(null); setText(""); }}>{L(lang, "Otra lista", "Another list")}</button>
              <button type="button" className="btn" onClick={onReview}>{L(lang, "Revisar", "Review")}</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** El botón de la fila de captura, hermano de Escribir y Escanear, bajo
 * el asiento capture.list (Esencial). Al revisar, abre la mesa. */
export function ListEntry() {
  const { lang, has } = useFaro();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  if (!has("capture.list")) return null;
  return (
    <span className="scn-entry" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="scn-btn" data-anchor="capture-list-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}>
        <span>{L(lang, "Lista", "List")}</span>
        <ListPlus aria-hidden />
      </button>
      {open ? <CaptureListSheet onClose={() => setOpen(false)} onReview={() => { setOpen(false); setReview(true); }} /> : null}
      {review ? <ReviewTable onClose={() => setReview(false)} /> : null}
    </span>
  );
}
