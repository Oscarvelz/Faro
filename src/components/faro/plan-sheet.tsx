/**
 * FARO — La lista-plan (D6, 1.3.357): la cara del plan. La misma hoja en
 * dos posturas — en casa (crecer, estimar, cerrar) y en la tienda (una
 * mano, filas grandes, un toque = comprado) — y la hoja de cierre con su
 * ceremonia «A la mesa». Nace del sistema visual de la bandeja: mismo
 * envoltorio, misma simetría de 12px, el acento del tema. Se distingue
 * por lo que el estudio falló: medallón de lista, pastilla de estado de
 * compra SIN ámbar (el ámbar es solo duda de mesa) y barra de progreso.
 * La casa común con la lista de espera (5c) es esta misma sección de la
 * bandeja y este mismo envoltorio: cuando llegue, vivirá aquí al lado.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ClipboardList, ShoppingCart, Trash2, X } from "lucide-react";
import { addDrafts, dropDraft } from "@/lib/faro/drafts";
import { parseAmount, uid } from "@/lib/faro/money";
import { closePlan, livePlans, markBought, markBoughtLess, markPlanState, ownPrice, planRows, planTotals, type CloseDest } from "@/lib/faro/plan";
import { parseList } from "@/lib/faro/textparse";
import type { Draft } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";
import { useFaro } from "./provider";
import "./plan.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const sym = (c: string) => (c === "USD" ? "$" : "C$");
const fmtAmt = (minor: number, c: string) => `${sym(c)}${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayWord = (lang: string, iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es", { day: "numeric", month: "long" });
};

const STATE_WORD: Record<string, [string, string]> = {
  pending: ["Pendiente", "Pending"],
  bought: ["Comprado", "Bought"],
  later: ["Después", "Later"],
  gone: ["No había", "Sold out"],
};

export function PlanSheet({ planId, onClose }: { planId: string; onClose: () => void }) {
  const { session, commit, commitGuarded, lang, has } = useFaro();
  const canPlan = has("capture.plan");
  const [store, setStore] = useState(false);
  const [closing, setClosing] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [editAmt, setEditAmt] = useState<string | null>(null);
  const [amtText, setAmtText] = useState("");
  const [lessMode, setLessMode] = useState(false);
  const [restText, setRestText] = useState("");
  const [newRow, setNewRow] = useState("");
  const [showEst, setShowEst] = useState(false);
  const [destOf, setDestOf] = useState<Record<string, CloseDest>>({});
  const [announce, setAnnounce] = useState<string | null>(null);
  useLayer(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  /* La pantalla despierta mientras dura la compra (diseño §3.1). */
  useEffect(() => {
    if (!store) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => { /* sin permiso: la compra sigue */ });
    return () => { lock?.release().catch(() => { /* ya soltado */ }); };
  }, [store]);

  const plan = useMemo(
    () => (session ? livePlans(session.ledger).find((p) => p.id === planId) : undefined),
    [session, planId],
  );
  const rows = useMemo(
    () => (session ? planRows(session.ledger, planId) : []),
    [session, planId],
  );
  if (!session || !canPlan) return null;
  if (!plan && !announce) return null;
  const totals = planTotals(rows);
  const display = session.ledger.settings.display ?? "USD";
  const ordered = [...rows].sort((a, b) => {
    const rank = (d: Draft) => (store
      ? (d.planState === "bought" ? 2 : d.planState === "later" ? 1 : 0)
      : 0);
    return rank(a) - rank(b);
  });

  const buy = (d: Draft) => {
    const today = todayLocal();
    if (d.planState === "bought") {
      commit((s) => markPlanState(s, d.id, "pending"), d.concept);
      return;
    }
    const est = d.estMinor != null && d.estMinor > 0 ? d.estMinor : null;
    commit((s) => markBought(s, d.id, est, d.currency ?? display, today), d.concept);
  };
  const confirmAmt = (d: Draft) => {
    const minor = parseAmount(amtText);
    if (minor == null || minor <= 0) { setEditAmt(null); return; }
    const today = todayLocal();
    if (lessMode) {
      commit((s) => markBoughtLess(s, d.id, minor, d.currency ?? display, today, restText, new Date().toISOString()), d.concept);
    } else {
      commit((s) => markBought(s, d.id, minor, d.currency ?? display, today), d.concept);
    }
    setEditAmt(null); setLessMode(false); setMenu(null);
  };
  const addRow = () => {
    const text = newRow.trim();
    if (!text) return;
    const parsed = parseList(text, {
      ledger: session.ledger, lang, today: todayLocal(), display, makeId: uid, now: new Date().toISOString(),
    }, "out");
    if (!parsed.length) return;
    const born: Draft[] = parsed.map((p) => {
      const own = p.amountMinor == null ? ownPrice(session.ledger, p.concept, p.store ?? undefined) : null;
      return {
        ...p, kind: "plan" as const, planId, planState: "pending" as const, sign: "out" as const,
        amountMinor: null,
        estMinor: p.amountMinor ?? own?.minor ?? null,
        estOn: p.amountMinor == null ? own?.on : undefined,
        currency: p.currency ?? own?.currency ?? display,
        missing: [],
      };
    });
    commit((s) => addDrafts(s, born), plan?.name ?? "");
    setNewRow("");
  };
  const doClose = () => {
    const born = totals.bought; // la ceremonia convierte exactamente lo comprado
    commit((s) => closePlan(s, planId, destOf, todayLocal(), new Date().toISOString()).state,
      L(lang, "Cerrar lista", "Close list"));
    setAnnounce(born > 0
      ? L(lang, `${born} en tu bandeja, en la mesa de siempre.`, `${born} in your tray, on the usual review table.`)
      : L(lang, "Lista cerrada. Su folio vive en el Archivo.", "List closed. Its record lives in the Archive."));
    setClosing(false);
  };

  const estLine = totals.est.length
    ? totals.est.map((r) => `${L(lang, "Estimado", "Estimate")} ${fmtAmt(r.minor, r.currency)}`).join(" · ")
    : null;
  const realLine = totals.real.length
    ? totals.real.map((r) => `${L(lang, "Real", "Actual")} ${fmtAmt(r.minor, r.currency)}`).join(" · ")
    : null;

  return createPortal(
    <div className="scn-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`scn-sheet tray-sheet plan-sheet${store ? " is-store" : ""}`} role="dialog" aria-modal="true" aria-label={plan?.name ?? ""}>
        <div className="scn-head">
          <span className="scn-badge" aria-hidden><ClipboardList /></span>
          <h3 className="lab-head">{plan ? plan.name : L(lang, "Lista cerrada", "List closed")}{plan ? <Hint topic="lista-plan" /> : null}</h3>
          <button type="button" className="scn-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="scn-body">
          {announce ? (
            <p className="plan-announce" data-anchor="plan-announce">{announce}</p>
          ) : null}
          {!plan ? null : !closing ? (
            <>
              <button type="button" className="plan-totals" data-anchor="plan-totals" onClick={() => setShowEst((v) => !v)} aria-expanded={showEst}>
                <span className="plan-bar" aria-hidden><span className="plan-bar-fill" style={{ width: `${totals.total ? Math.round((totals.bought / totals.total) * 100) : 0}%` }} /></span>
                <span className="plan-totals-txt">
                  {`${totals.bought} de ${totals.total}`}
                  {estLine ? ` · ${estLine}` : ""}
                  {realLine ? ` · ${realLine}` : ""}
                </span>
                <span className="plan-cover">{L(lang, `${totals.priced} de ${totals.total} filas con precio`, `${totals.priced} of ${totals.total} rows priced`)}</span>
              </button>
              {showEst ? (
                <div className="plan-est-explain">
                  {rows.filter((d) => d.estMinor != null).map((d) => (
                    <p key={d.id}>{`${d.concept} ${fmtAmt(d.estMinor!, d.currency ?? display)} — ${d.estOn
                      ? L(lang, `tu precio del ${dayWord(lang, d.estOn)}`, `your price from ${dayWord(lang, d.estOn)}`)
                      : L(lang, "lo escribiste en este plan", "you wrote it in this plan")}`}</p>
                  ))}
                  {rows.some((d) => d.estMinor == null) ? (
                    <p>{L(lang, "Sin precio, fuera de la suma: ", "No price, left out of the sum: ") + rows.filter((d) => d.estMinor == null).map((d) => d.concept).join(", ")}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="plan-rows">
                {ordered.map((d) => {
                  const st = d.planState ?? "pending";
                  return (
                    <div key={d.id} className={`plan-row is-${st}`} data-anchor="plan-row">
                      <button type="button" className="plan-row-main" onClick={() => { if (store) buy(d); else setMenu(menu === d.id ? null : d.id); }}>
                        <span className="plan-check" aria-hidden>{st === "bought" ? <Check /> : null}</span>
                        <span className="plan-main">
                          <strong>{d.concept}</strong>
                          {d.note ? <span className="plan-note">{d.note}</span> : null}
                        </span>
                        <span className={`plan-pill is-${st}`}>{L(lang, STATE_WORD[st][0], STATE_WORD[st][1])}</span>
                      </button>
                      <button type="button" className="plan-amt num" data-anchor="plan-amt"
                        aria-label={L(lang, "Monto", "Amount")}
                        onClick={() => { setEditAmt(d.id); setAmtText(d.amountMinor != null ? String(d.amountMinor / 100) : d.estMinor != null ? String(d.estMinor / 100) : ""); setLessMode(false); }}>
                        {d.amountMinor != null && d.currency
                          ? fmtAmt(d.amountMinor, d.currency)
                          : d.estMinor != null
                            ? `~${fmtAmt(d.estMinor, d.currency ?? display)}`
                            : L(lang, "Sin precio", "No price")}
                      </button>
                      {menu === d.id && !store ? (
                        <div className="plan-menu">
                          <button type="button" onClick={() => { buy(d); setMenu(null); }}>{L(lang, "Comprado", "Bought")}</button>
                          <button type="button" onClick={() => { setEditAmt(d.id); setAmtText(d.estMinor != null ? String(d.estMinor / 100) : ""); setLessMode(true); setRestText(d.concept); }}>{L(lang, "Compré menos", "Got fewer")}</button>
                          <button type="button" onClick={() => { commit((s) => markPlanState(s, d.id, "gone"), d.concept); setMenu(null); }}>{L(lang, "No había", "Sold out")}</button>
                          <button type="button" onClick={() => { commit((s) => markPlanState(s, d.id, "later"), d.concept); setMenu(null); }}>{L(lang, "Después", "Later")}</button>
                          <button type="button" className="plan-menu-drop" aria-label={L(lang, "Quitar fila", "Remove row")}
                            onClick={() => { commitGuarded((s) => dropDraft(s, d.id), L(lang, "Quitar fila", "Remove row")); setMenu(null); }}>
                            <Trash2 />
                          </button>
                        </div>
                      ) : null}
                      {editAmt === d.id ? (
                        <div className="plan-amt-edit">
                          <label>{L(lang, "Monto real", "Actual amount")}
                            <input className="field" inputMode="decimal" autoFocus value={amtText} onChange={(e) => setAmtText(e.target.value)} />
                          </label>
                          {lessMode ? (
                            <label>{L(lang, "Queda pendiente", "Still pending")}
                              <input className="field" value={restText} onChange={(e) => setRestText(e.target.value)} />
                            </label>
                          ) : null}
                          <button type="button" className="btn" onClick={() => confirmAmt(d)}>{L(lang, "Confirmar", "Confirm")}</button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!rows.length ? <p className="scn-empty">{L(lang, "Escribe lo que vas a comprar. Lo demás lo pone Faro.", "Write what you're going to buy. Faro does the rest.")}</p> : null}
              </div>
              <div className="plan-add">
                <input className="field" data-anchor="plan-add-input" value={newRow}
                  placeholder={L(lang, "Añadir: 2 leche, arroz 5 lb…", "Add: 2 milk, rice 5 lb…")}
                  onChange={(e) => setNewRow(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addRow(); }} />
                <button type="button" className="btn secondary" onClick={addRow} disabled={!newRow.trim()}>{L(lang, "Añadir", "Add")}</button>
              </div>
            </>
          ) : (
            <div className="plan-close" data-anchor="plan-close">
              {totals.bought > 0 ? (
                <p className="plan-close-line">{L(lang,
                  `Lo comprado: ${totals.bought} — ${totals.real.map((r) => fmtAmt(r.minor, r.currency)).join(" · ") || "sin monto"}`,
                  `Bought: ${totals.bought} — ${totals.real.map((r) => fmtAmt(r.minor, r.currency)).join(" · ") || "no amount"}`)}</p>
              ) : (
                <p className="plan-close-line">{L(lang, "No compraste nada de esta lista.", "You bought nothing from this list.")}</p>
              )}
              {rows.filter((d) => (d.planState ?? "pending") !== "bought").map((d) => {
                const st = d.planState ?? "pending";
                const dest = destOf[d.id] ?? (st === "gone" ? "archive" : "next");
                return (
                  <div key={d.id} className="plan-close-row">
                    <span className="plan-main"><strong>{d.concept}</strong></span>
                    <span className="plan-dest" role="group" aria-label={d.concept}>
                      <button type="button" className={dest === "next" ? "is-on" : ""} onClick={() => setDestOf((m) => ({ ...m, [d.id]: "next" }))}>{L(lang, "A la siguiente", "To next list")}</button>
                      <button type="button" className={dest === "archive" ? "is-on" : ""} onClick={() => setDestOf((m) => ({ ...m, [d.id]: "archive" }))}>{L(lang, "Al archivo", "To archive")}</button>
                      <button type="button" className={dest === "out" ? "is-on" : ""} onClick={() => setDestOf((m) => ({ ...m, [d.id]: "out" }))}>{L(lang, "Fuera", "Out")}</button>
                    </span>
                  </div>
                );
              })}
              <p className="plan-close-sum">{L(lang,
                `De ${totals.total} cosas: compraste ${totals.bought}. El resumen queda en el folio, en el Archivo.`,
                `Of ${totals.total} things: you bought ${totals.bought}. The summary stays in the record, in the Archive.`)}</p>
            </div>
          )}
        </div>
        <div className="scn-foot">
          {!plan ? (
            <button type="button" className="btn" onClick={onClose}>{L(lang, "Cerrar", "Close")}</button>
          ) : !closing ? (
            <>
              <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cerrar", "Close")}</button>
              <button type="button" className="btn secondary" data-anchor="plan-store-toggle" onClick={() => setStore((v) => !v)}>
                <ShoppingCart aria-hidden /> {store ? L(lang, "Terminar", "Done") : L(lang, "En la tienda", "Shopping")}
              </button>
              <button type="button" className="btn" data-anchor="plan-close-open" onClick={() => setClosing(true)}>{L(lang, "Cerrar lista", "Close list")}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn secondary" onClick={() => setClosing(false)}>{L(lang, "Volver", "Back")}</button>
              <button type="button" className="btn" data-anchor="plan-to-table" onClick={doClose}>
                {totals.bought > 0 ? L(lang, "A la mesa", "To review") : L(lang, "Cerrar lista", "Close list")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
