/**
 * FARO — Captura Inteligente, Ola 3: la lista en bache (mapa F4).
 * «Pegar una lista»: el cierre del día de Oscar — la lista de compras o
 * de gastos escrita de corrido, una compra por línea, con o sin montos —
 * y el intérprete la parte en borradores hermanos en la bandeja. La hoja
 * pregunta el sentido UNA vez por la lista (todo sale / todo entra) y lo
 * aplica solo a las líneas sin verbo propio; la línea con verbo conserva
 * el suyo. Como sus hermanas, la puerta no guarda nada en el libro: deja
 * borradores con sus dudas dichas y ofrece la mesa.
 *
 * La lista-plan (D6, 1.3.357): la misma puerta gana el segmento
 * Registrar / Planear tras su asiento (capture.plan, Ritmo). Planear
 * corre el mismo intérprete y re-nace las filas como plan: el monto que
 * la lista traía se vuelve estimado escrito, y el que no traía se busca
 * en los precios propios. En Esencial la hoja es la de siempre: sin
 * segmento, sin cadáver.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ListPlus, X } from "lucide-react";
import { addDrafts, patchDraft } from "@/lib/faro/drafts";
import { DraftResultRow, mirrorPatch } from "./draft-row";
import { createPlan, ownPrice } from "@/lib/faro/plan";
import { PlanSheet } from "./plan-sheet";
import { parseList } from "@/lib/faro/textparse";
import { uid } from "@/lib/faro/money";
import type { Draft } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";
import { useFaro } from "./provider";
import { ReviewTable } from "./review-table";
import "./scan.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Las dudas del borrador viven en la fila misma (draft-row.tsx): cada
 * una es un botón que la corrige en el acto — útiles, no decorativas
 * (Oscar, 2026-11-20). */

export function CaptureListSheet({ onClose, onReview }: { onClose: () => void; onReview: () => void }) {
  const { session, commit, lang, has } = useFaro();
  const [text, setText] = useState("");
  const [batchSign, setBatchSign] = useState<"in" | "out">("out");
  const [made, setMade] = useState<Draft[] | null>(null);
  const canPlan = has("capture.plan");
  const [seg, setSeg] = useState<"record" | "plan">("record");
  const [planName, setPlanName] = useState("");
  const [madePlan, setMadePlan] = useState<{ id: string; rows: Draft[] } | null>(null);
  const [viewPlan, setViewPlan] = useState(false);
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
  const interpretPlan = () => {
    if (!session || !text.trim()) return;
    const parsed = parseList(text, {
      ledger: session.ledger,
      lang,
      today: todayLocal(),
      display: session.ledger.settings.display ?? "USD",
      makeId: uid,
      now: new Date().toISOString(),
    }, "out");
    if (!parsed.length) return;
    const name = planName.trim() || L(lang, "La compra", "Groceries");
    const now = new Date().toISOString();
    const planId = uid();
    const rows: Draft[] = parsed.map((p) => {
      const own = p.amountMinor == null ? ownPrice(session.ledger, p.concept, p.store ?? undefined) : null;
      return {
        ...p, kind: "plan" as const, planId, planState: "pending" as const, sign: "out" as const,
        amountMinor: null,
        estMinor: p.amountMinor ?? own?.minor ?? null,
        estOn: p.amountMinor == null ? own?.on : undefined,
        currency: p.currency ?? own?.currency ?? session.ledger.settings.display ?? "USD",
        missing: [],
      };
    });
    commit((s) => addDrafts(createPlan(s, name, now, planId).state, rows), name);
    setMadePlan({ id: planId, rows });
  };
  const fix = (d: Draft, patch: Partial<Draft>) => {
    commit((s) => patchDraft(s, d.id, patch), d.concept || L(lang, "Bandeja", "Tray"));
    setMade((ms) => (ms ? ms.map((x) => (x.id === d.id ? mirrorPatch(x, patch) : x)) : ms));
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
          {made == null && madePlan == null ? (
            <>
              {canPlan ? (
                <div className="cap-sign-row" role="group" aria-label={L(lang, "Registrar o planear", "Record or plan")}>
                  <button type="button" className={`cap-sign${seg === "record" ? " is-on" : ""}`} data-anchor="capture-plan-seg" aria-pressed={seg === "record"} onClick={() => setSeg("record")}>{L(lang, "Registrar", "Record")}</button>
                  <button type="button" className={`cap-sign${seg === "plan" ? " is-on" : ""}`} data-anchor="capture-plan-seg-plan" aria-pressed={seg === "plan"} onClick={() => setSeg("plan")}>{L(lang, "Planear", "Plan")}</button>
                </div>
              ) : null}
              {seg === "plan" ? (
                <input
                  className="field cap-plan-name"
                  data-anchor="capture-plan-name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder={L(lang, "Nombre: La compra", "Name: Groceries")}
                  aria-label={L(lang, "Nombre de la lista", "The list's name")}
                />
              ) : (
              <div className="cap-sign-row" role="group" aria-label={L(lang, "Sentido de la lista", "The list's direction")}>
                <button type="button" className={`cap-sign${batchSign === "out" ? " is-on" : ""}`} data-anchor="capture-list-out" aria-pressed={batchSign === "out"} onClick={() => setBatchSign("out")}>{L(lang, "Todo sale", "All out")}</button>
                <button type="button" className={`cap-sign${batchSign === "in" ? " is-on" : ""}`} data-anchor="capture-list-in" aria-pressed={batchSign === "in"} onClick={() => setBatchSign("in")}>{L(lang, "Todo entra", "All in")}</button>
              </div>
              )}
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
              <p className="cap-text-note">{seg === "plan"
                ? L(lang, "La lista nace como plan en tu bandeja: filas pendientes con el precio estimado de tus propios precios. Nada es dinero todavía.", "The list is born as a plan in your tray: pending rows with estimates from your own prices. Nothing is money yet.")
                : L(lang, "El sentido vale para las líneas sin verbo propio; la que trae su verbo conserva el suyo. Todo cae en la bandeja: nada se guarda sin tu revisión.", "The direction covers lines with no verb of their own; a line with its own verb keeps it. Everything lands in the tray: nothing is saved without your review.")}</p>
            </>
          ) : madePlan != null ? (
            <div className="tray-group">
              <p className="tray-day">{L(lang, `Plan: ${madePlan.rows.length} filas`, `Plan: ${madePlan.rows.length} rows`)}</p>
              {madePlan.rows.map((d) => (
                <div key={d.id} className="tray-row" data-anchor="capture-plan-row">
                  <span className="tray-main"><strong>{d.concept}</strong></span>
                  {d.estMinor != null
                    ? <span className="tray-amt num">{`~${(d.estMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</span>
                    : <span className="tray-amt is-none">{L(lang, "Sin precio", "No price")}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="tray-group">
              <p className="tray-day">{L(lang, `${made!.length} en la bandeja`, `${made!.length} in the tray`)}</p>
              {made!.map((d) => (
                <DraftResultRow key={d.id} d={d} lang={lang} anchor="capture-list-row" onFix={fix} />
              ))}
            </div>
          )}
        </div>
        <div className="scn-foot">
          {made == null && madePlan == null ? (
            <>
              <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
              <button type="button" className="btn" data-anchor="capture-list-go" disabled={!text.trim()} onClick={seg === "plan" ? interpretPlan : interpret}>{L(lang, "Interpretar", "Interpret")}</button>
            </>
          ) : madePlan != null ? (
            <>
              <button type="button" className="btn secondary" onClick={() => { setMadePlan(null); setText(""); }}>{L(lang, "Otra lista", "Another list")}</button>
              <button type="button" className="btn" data-anchor="capture-plan-open" onClick={() => setViewPlan(true)}>{L(lang, "Ver el plan", "Open the plan")}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn secondary" onClick={() => { setMade(null); setText(""); }}>{L(lang, "Otra lista", "Another list")}</button>
              <button type="button" className="btn" onClick={onReview}>{L(lang, "Revisar", "Review")}</button>
            </>
          )}
        </div>
        {viewPlan && madePlan ? <PlanSheet planId={madePlan.id} onClose={() => setViewPlan(false)} /> : null}
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
