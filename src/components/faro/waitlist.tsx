/**
 * FARO — La lista de espera (5c, 1.3.360): el freno de impulso, en casa
 * del Asesor. Una tarjeta grande por deseo, con su anillo de cuenta
 * atrás como firma — jamás casillas, barra de progreso ni totales de
 * compra: eso es la lista-plan, otra lista con otro oficio (contrato de
 * diferenciación §2b). El escenario corre sobre los motores del Asesor;
 * la pregunta «¿Todavía lo quieres?» llega una vez por plazo; comprar
 * entra por la captura prerrellenada a la bandeja y la mesa decide.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Hourglass, Trash2, X } from "lucide-react";
import {
  addWish, askStamp, buyWish, dropWish, isRipe, leaveWish, remainingFraction,
  remainingMs, renewWish, setWishPrice, waitingWishes, wishScenario, yearAccount,
} from "@/lib/faro/waitlist";
import { parseAmount } from "@/lib/faro/money";
import type { Currency, Wish } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";
import { useFaro } from "./provider";
import "./waitlist.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const sym = (c: string) => (c === "USD" ? "$" : "C$");
const fmtAmt = (minor: number, c: string) => `${sym(c)}${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** El texto llano de la cuenta atrás: la cifra se explica sola. */
function leftText(w: Wish, lang: string, now: Date): string {
  const ms = remainingMs(w, now);
  if (ms <= 0) return L(lang, "plazo cumplido", "time is up");
  const hours = Math.ceil(ms / 3600_000);
  if (hours >= 48) {
    const days = Math.ceil(hours / 24);
    return lang === "en" ? `${days} days left` : `quedan ${days} días`;
  }
  if (hours === 1) return L(lang, "queda 1 hora", "1 hour left");
  return lang === "en" ? `${hours} hours left` : `quedan ${hours} horas`;
}

/** La hoja del deseo: anotar uno nuevo, o la compra prerrellenada. */
export function WishSheet({ onClose, buyId }: { onClose: () => void; buyId?: string }) {
  const { session, commit, lang } = useFaro();
  const existing = buyId ? (session?.ledger.wishes ?? []).find((w) => w.id === buyId) : undefined;
  const [concept, setConcept] = useState(existing?.concept ?? "");
  const [amount, setAmount] = useState(existing?.amountMinor != null ? String(existing.amountMinor / 100) : "");
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? session?.ledger.settings.display ?? "USD");
  const [store, setStore] = useState(existing?.store ?? "");
  useLayer(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const parsed = amount.trim() ? parseAmount(amount) : null;
  const save = () => {
    if (!session || !concept.trim()) return;
    const now = new Date();
    if (buyId) {
      commit((s) => buyWish(s, buyId, now, { concept, amountMinor: parsed, currency, store }).state,
        L(lang, "Compra desde la espera", "Bought from the waitlist"));
    } else {
      commit((s) => addWish(s, { concept, amountMinor: parsed, currency, store }, now).state,
        L(lang, "Deseo anotado", "Wish noted"));
    }
    onClose();
  };
  return createPortal(
    <div className="scn-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scn-sheet tray-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Anotar un deseo", "Note a wish")}>
        <div className="scn-head">
          <span className="scn-badge" aria-hidden><Hourglass /></span>
          <h3 className="lab-head">{buyId ? L(lang, "Comprarlo", "Buy it") : L(lang, "Anotar un deseo", "Note a wish")}<Hint topic="lista-espera" /></h3>
          <button type="button" className="scn-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="scn-body">
          <label className="label">
            <span className="lab-head">{L(lang, "¿Qué es?", "What is it?")}</span>
            <input className="field" data-anchor="wish-concept" autoFocus value={concept} onChange={(e) => setConcept(e.target.value)} placeholder={L(lang, "Ej.: audífonos", "E.g.: headphones")} />
          </label>
          <div className="wl-fields">
            <label className="label">
              <span className="lab-head">{L(lang, "Precio (si lo sabes)", "Price (if you know it)")}</span>
              <input className="field num" data-anchor="wish-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </label>
            <label className="label">
              <span className="lab-head">{L(lang, "Moneda", "Currency")}</span>
              <select className="field" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option value="USD">USD $</option>
                <option value="NIO">NIO C$</option>
              </select>
            </label>
          </div>
          <label className="label">
            <span className="lab-head">{L(lang, "Tienda (opcional)", "Store (optional)")}</span>
            <input className="field" data-anchor="wish-store" value={store} onChange={(e) => setStore(e.target.value)} placeholder={L(lang, "Ej.: Amazon", "E.g.: Amazon")} />
          </label>
          <p className="cap-text-note">
            {buyId
              ? L(lang, "Entra a la bandeja como borrador: la mesa lo revisa antes de guardarlo en el libro.", "It goes to the tray as a draft: the review table checks it before it is saved to the book.")
              : L(lang, "Espera el plazo de Ajustes. Sin precio, el deseo nace igual: el precio se puede poner después.", "It waits the time set in Settings. With no price, the wish is still noted: the price can be added later.")}
          </p>
        </div>
        <div className="scn-foot">
          <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
          <button type="button" className="btn" data-anchor="wish-save" disabled={!concept.trim()} onClick={save}>
            {buyId ? L(lang, "A la bandeja", "To the tray") : L(lang, "Anotar", "Note it")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** La fila de la hoja de captura (hermana de Escribir/Pegar una lista):
 * vive en la rama de gasto del selector de Central, bajo el mismo
 * asiento de la lista (advisor.waitlist, Esencial). */
export function WishEntry() {
  const { lang, has } = useFaro();
  const [open, setOpen] = useState(false);
  if (!has("advisor.waitlist")) return null;
  return (
    <span className="scn-entry" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="scn-btn" data-anchor="capture-wish-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}>
        <span>{L(lang, "Anotar un deseo", "Note a wish")}</span>
        <Hourglass aria-hidden />
      </button>
      {open ? <WishSheet onClose={() => setOpen(false)} /> : null}
    </span>
  );
}

function WishCard({ w, now }: { w: Wish; now: Date }) {
  const { session, commit, lang, names, key, has } = useFaro();
  const [scenario, setScenario] = useState<string[] | null>(null);
  const [showScenario, setShowScenario] = useState(false);
  const [armed, setArmed] = useState(false);
  const [buying, setBuying] = useState(false);
  const [priceText, setPriceText] = useState("");
  const [priceCur, setPriceCur] = useState<Currency>(w.currency);
  const ripe = isRipe(w, now);
  const frac = remainingFraction(w, now);
  const C = 2 * Math.PI * 26;
  const runScenario = () => {
    if (!session) return;
    setScenario(wishScenario(session.ledger, key, w, lang, names, now, has("advisor.ask-scenarios")));
    setShowScenario(true);
  };
  const savePrice = () => {
    const v = parseAmount(priceText);
    if (v == null || v <= 0) return;
    commit((s) => setWishPrice(s, w.id, v, priceCur), L(lang, "Precio del deseo", "Wish price"));
    setPriceText("");
  };
  return (
    <article className="wl-card" data-anchor="wish-card">
      <div className="wl-ring-wrap" aria-hidden>
        <svg className="wl-ring" viewBox="0 0 64 64">
          <circle className="wl-ring-bg" cx="32" cy="32" r="26" />
          <circle className="wl-ring-fg" cx="32" cy="32" r="26" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
        </svg>
        <Hourglass className="wl-ring-ico" />
      </div>
      <div className="wl-main">
        <div className="wl-top">
          <strong className="wl-concept">{w.concept}</strong>
          <button type="button" className={`tray-drop${armed ? " is-armed" : ""}`} aria-label={L(lang, "Borrar deseo", "Delete wish")}
            onClick={() => {
              if (!armed) { setArmed(true); return; }
              commit((s) => dropWish(s, w.id), L(lang, "Deseo borrado", "Wish deleted"));
            }}>
            {armed ? L(lang, "¿Borrar?", "Delete?") : <Trash2 />}
          </button>
        </div>
        {w.amountMinor != null
          ? <p className="wl-price num">{fmtAmt(w.amountMinor, w.currency)}{w.store ? <span className="wl-store"> · {w.store}</span> : null}</p>
          : (
            <div className="wl-noprice">
              <p className="wl-noprice-note">{L(lang, "Sin precio todavía: sin precio no hay escenario ni cuenta.", "No price yet: with no price there is no scenario and no tally.")}</p>
              <div className="wl-price-form">
                <input className="field num" inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="0.00" aria-label={L(lang, "Precio", "Price")} />
                <select className="field" value={priceCur} onChange={(e) => setPriceCur(e.target.value as Currency)} aria-label={L(lang, "Moneda", "Currency")}>
                  <option value="USD">$</option>
                  <option value="NIO">C$</option>
                </select>
                <button type="button" className="btn secondary" disabled={!priceText.trim()} onClick={savePrice}>{L(lang, "Poner precio", "Set price")}</button>
              </div>
            </div>
          )}
        {!ripe && !w.permanent ? <p className="wl-left">{leftText(w, lang, now)}</p> : null}
        {w.permanent ? <p className="wl-left">{L(lang, "En tu lista, sin más preguntas.", "On your list, with no more questions.")}</p> : null}
        {w.amountMinor != null ? (
          <>
            <button type="button" className="btn secondary wl-scenario-btn" data-anchor="wish-scenario" onClick={runScenario}>
              {L(lang, "¿Qué pasaría si lo compro?", "What if I buy it?")}
            </button>
            {showScenario && scenario ? (
              <div className="wl-scenario" data-anchor="wish-scenario-out">
                {scenario.map((line, i) => <p key={i}>{line}</p>)}
              </div>
            ) : null}
          </>
        ) : null}
        {ripe ? (
          <div className="wl-ask" data-anchor="wish-ask">
            <p className="wl-ask-q">{L(lang, "¿Todavía lo quieres?", "Do you still want it?")}</p>
            <div className="wl-ask-row">
              <button type="button" className="btn" data-anchor="wish-buy" onClick={() => setBuying(true)}>{L(lang, "Lo compro", "I'll buy it")}</button>
              <button type="button" className="btn secondary" data-anchor="wish-leave" onClick={() => commit((s) => leaveWish(s, w.id, new Date()), L(lang, "Deseo dejado", "Wish left"))}>{L(lang, "Lo dejo", "I'll leave it")}</button>
              <button type="button" className="btn secondary" data-anchor="wish-renew" onClick={() => commit((s) => renewWish(s, w.id, new Date()), L(lang, "Más tiempo", "More time"))}>
                {w.renewals >= 1 ? L(lang, "Dejarlo en la lista", "Keep it on the list") : L(lang, "Dame más tiempo", "Give me more time")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {buying ? <WishSheet buyId={w.id} onClose={() => setBuying(false)} /> : null}
    </article>
  );
}

/** La sección del Asesor: las tarjetas en espera y la cuenta del año. */
export function WaitlistSection() {
  const { session, commit, lang, has } = useFaro();
  const [adding, setAdding] = useState(false);
  const [showPieces, setShowPieces] = useState(false);
  const now = useMemo(() => new Date(), []);
  const ledger = session?.ledger;
  const waiting = ledger ? waitingWishes(ledger) : [];
  const year = ledger ? yearAccount(ledger, now.getFullYear()) : { saved: [], pieces: [] as Wish[] };
  // La pregunta se sella al mostrarse: una vez por plazo (cerca 4).
  const unasked = waiting.filter((w) => isRipe(w, now) && !w.askedAt).map((w) => w.id).join(",");
  useEffect(() => {
    if (!unasked) return;
    for (const id of unasked.split(",")) {
      commit((s) => askStamp(s, id, new Date()), L(lang, "La espera pregunta", "The wait asks"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unasked]);
  if (!has("advisor.waitlist") || !ledger) return null;
  return (
    <section className="wl-section" data-anchor="advisor-waitlist">
      <div className="wl-head">
        <h2 className="serif wl-title">{L(lang, "Lista de espera", "Waiting list")}<Hint topic="lista-espera" /></h2>
        <button type="button" className="btn secondary" data-anchor="wish-add" onClick={() => setAdding(true)}>
          {L(lang, "Anotar un deseo", "Note a wish")}
        </button>
      </div>
      <p className="wl-sub">{L(lang, "Aquí dejas un gusto que todavía no decides comprar. Espera su plazo; mientras tanto puedes ver qué pasaría con tu mes si lo compras.", "Here you leave a treat you have not decided to buy. It waits its time; meanwhile you can see what would happen to your month if you buy it.")}</p>
      {waiting.length
        ? waiting.map((w) => <WishCard key={w.id} w={w} now={now} />)
        : <p className="wl-empty">{L(lang, "Ningún deseo en espera.", "No wishes waiting.")}</p>}
      {year.saved.length ? (
        <div className="wl-year">
          <button type="button" className="wl-year-btn" data-anchor="wish-year" onClick={() => setShowPieces((v) => !v)} aria-expanded={showPieces}>
            {L(lang, "Este año la espera te ahorró", "This year the wait saved you")} {year.saved.map((s) => fmtAmt(s.minor, s.currency)).join(" · ")}
          </button>
          {showPieces ? (
            <ul className="wl-pieces" data-anchor="wish-pieces">
              {year.pieces.map((w) => (
                <li key={w.id}>
                  <span>{w.concept}</span>
                  <span className="wl-piece-tag">{w.status === "left" ? L(lang, "dejado", "left") : L(lang, "comprado tras esperar", "bought after waiting")}</span>
                  <span className="num">{w.amountMinor != null ? fmtAmt(w.amountMinor, w.currency) : "—"}</span>
                  <span className="wl-piece-date">{w.closedAt.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {adding ? <WishSheet onClose={() => setAdding(false)} /> : null}
    </section>
  );
}
