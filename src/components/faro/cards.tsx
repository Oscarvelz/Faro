/**
 * Tarjetas (1.3.107): credit cards under Debo → Préstamos, in Libros (full functions) and in Central → Pagos.
 * - CardsGroup: the "Tarjetas" group (total, rows, edit state with delete / Empezar de cero / restore, empty state).
 * - CardSheet: one card (art, figures, sparkline, readings and payments, Actualizar, Abonar, Editar, Eliminar).
 * - CardForm: add (manual or from a screenshot), edit, or a manual update.
 * - CardScan: one or many screenshots of bank apps read on the device, matched to cards, previewed, saved at once.
 * Money rules live in lib/faro/cards.ts; the reader in lib/faro/cardparse.ts. Pictures are never stored or sent.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Aperture, Camera, Check, ChevronDown, CreditCard as CardIcon, Images, Pencil, Plus, RotateCcw, SquarePen, Trash2, X } from "lucide-react";
import "./cards.css";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { useLayer } from "@/lib/manual/back";
import { DayField } from "./line-form";
import { ColorPick } from "./color-pick";
import { CardArt } from "./card-art";
import { convertMinor, parseAmount, uid } from "@/lib/faro/money";
import { todayIso } from "@/lib/faro/loans";
import {
  ART_STYLES, CARD_PRESETS, addReading, artOf, cardFigures, cardMonthlyInterest, cardPays, cardTotals, cardsOf, dropCard, dropPresets,
  issuerIn, issuerOf, networkIn, payCard, presetsOff, promoMonths, putCard, restorePresets, storedCards, toThirty, utilLevel, type CardUpdate,
} from "@/lib/faro/cards";
import { matchCard, parseCardShot, readLimit, type CardField, type CardRead } from "@/lib/faro/cardparse";
import type { CreditCard, Currency, LedgerState } from "@/lib/faro/types";

const useL = () => { const { lang } = useFaro(); return (es: string, en: string) => (lang === "en" ? en : es); };
const money = (m: number | null | undefined) => (m == null ? "" : (m / 100).toFixed(2));
const dayLabel = (iso: string, lang: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).replace(".", "") : "");
const titleCase = (s: string) => s.replace(/\b([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ]+)\b/g, (_, a: string, b: string) => a + b.toLowerCase()).replace(/\bVisa\b/g, "Visa");
const pctText = (bps: number, lang: string) => `${(bps / 100).toLocaleString(lang === "en" ? "en-US" : "es-NI", { maximumFractionDigits: 2 })}%`;

function useView() {
  const { session } = useFaro();
  const ledger = session?.ledger;
  const display = ledger?.settings.display ?? "USD";
  const rate = ledger?.settings.rateE4 ?? 0;
  return { ledger, display, view: (m: number, c: Currency) => convertMinor(m, c, display, rate), back: (m: number, c: Currency) => convertMinor(m, display, c, rate) };
}

/* ---------- the group ---------- */

export function CardsGroup({ libros = false }: { libros?: boolean }) {
  const { fmt, commit, confirm, lang } = useFaro();
  const L = useL();
  const { ledger, view } = useView();
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: "add" | "edit" | "update"; id?: string; seed?: Partial<CreditCard> & { read?: CardRead } } | null>(null);
  const [shots, setShots] = useState<File[] | null>(null);
  useLayer(edit, () => setEdit(false));
  const cards = cardsOf(ledger);
  const sums = cardTotals(ledger);
  const off = presetsOff(ledger);
  const presetsShown = cards.some((c) => c.preset);
  const empty = !cards.length;
  const card = open ? cards.find((c) => c.id === open) ?? null : null;
  useEffect(() => { if (empty && edit) setEdit(false); }, [empty, edit]);
  const formCard = form?.id ? cards.find((c) => c.id === form.id) ?? null : null;
  const del = (c: CreditCard) => confirm({
    title: L("Eliminar tarjeta", "Delete card"), danger: true, yes: L("Eliminar", "Delete"),
    body: c.snaps.length ? L(`${c.name}. Su historial se guarda; Restaurar la trae de vuelta.`, `${c.name}. Its history is kept; Restore brings it back.`) : L(`${c.name}. Puedes traerla de vuelta con Restaurar.`, `${c.name}. You can bring it back with Restore.`),
    run: () => { commit((s) => dropCard(s, c.id), c.name); setOpen(null); },
  });
  const fromScratch = () => confirm({
    title: L("Empezar de cero", "Start from scratch"), danger: true, yes: L("Quitar sugeridas", "Remove suggested"),
    body: L("Quita las tarjetas sugeridas de una vez. Las que añadiste se quedan, y Restaurar trae las sugeridas con su historial.", "Removes the suggested cards at once. The ones you added stay, and Restore brings the suggested ones back with their history."),
    run: () => commit((s) => dropPresets(s), L("Empezar de cero", "Start from scratch")),
  });
  const restore = () => commit((s) => restorePresets(s), L("Restaurar tarjetas", "Restore cards"));
  const box = useRef<HTMLDivElement>(null);
  useFitNames(box, cards.map((c) => `${c.name}|${c.last4}|${c.snaps.length}`).join("/") + (edit ? "e" : "") + (ledger?.updatedAt ?? "") + lang);
  return (
    <div ref={box} className={`cobro-group card-group${edit ? " is-edit" : ""}`} data-anchor={libros ? "debt-cards" : "cobros-cards"}>
      <h3>
        <i /><span>{L("Tarjetas", "Cards")}</span><b>{cards.length}</b>
        {sums.known ? <strong className="num cg-total" data-anchor="cards-total">{fmt(sums.balance)}</strong> : <em className="cg-total" />}
        <span className="cg-tools">
          <ShotButton onFiles={setShots} label={L("Foto o captura", "Photo or screen")} small />
          {libros ? <button type="button" className="cg-tool" aria-label={L("Añadir tarjeta", "Add card")} data-anchor="card-add" onClick={() => setForm({ mode: "add" })}><Plus /></button> : null}
          {libros && !empty ? <button type="button" className="cg-tool" aria-pressed={edit} aria-label={L("Editar tarjetas", "Edit cards")} data-anchor="cards-edit" onClick={() => setEdit((v) => !v)}><Pencil /></button> : null}
          <Hint topic="tarjetas" />
        </span>
      </h3>
      {edit ? (
        <div className="cg-editbar">
          {presetsShown ? <button type="button" className="btn secondary cg-scratch" data-anchor="cards-scratch" onClick={fromScratch}>{L("Empezar de cero", "Start from scratch")}</button> : null}
          {off.length ? <button type="button" className="btn secondary cg-restore" data-anchor="cards-restore" onClick={restore}><RotateCcw aria-hidden />{L("Restaurar", "Restore")}</button> : null}
        </div>
      ) : null}
      {sums.known && sums.util != null ? <UtilLine util={sums.util} balance={sums.limited} limit={sums.limit} /> : null}
      {cards.map((c) => <CardRow key={c.id} card={c} edit={edit} onOpen={() => (edit ? null : setOpen(c.id))} onDelete={() => del(c)} onUpdate={() => setOpen(c.id)} />)}
      {empty ? (
        <div className="cg-empty" data-anchor="cards-empty">
          <p><CardIcon aria-hidden />{L("Añade tus tarjetas: a mano o con una captura de tu banco.", "Add your cards: by hand or with a screenshot from your bank.")}</p>
          <div className="cg-empty-acts">
            <button type="button" className="btn secondary" data-anchor="card-add-empty" onClick={() => setForm({ mode: "add" })}><Plus aria-hidden />{L("Añadir tarjeta", "Add card")}</button>
            {off.length ? <button type="button" className="btn secondary" onClick={restore}><RotateCcw aria-hidden />{L("Sugeridas", "Suggested")}</button> : null}
          </div>
        </div>
      ) : null}
      {card ? <CardSheet card={card} onClose={() => setOpen(null)} onEdit={() => setForm({ mode: "edit", id: card.id })} onManual={() => setForm({ mode: "update", id: card.id })} onShots={setShots} onDelete={() => del(card)} /> : null}
      {form ? <CardForm mode={form.mode} card={formCard} seed={form.seed} onClose={() => setForm(null)} /> : null}
      {shots ? <CardScan files={shots} onClose={() => setShots(null)} /> : null}
    </div>
  );
}

/** The name without the network word ("… World Mastercard" → "… World"): the art already shows the network. */
export function shortName(name: string): string {
  const s = name.replace(/\s+(visa( signature)?|mastercard|master card|world elite mastercard|card|tarjeta)$/i, "").trim();
  return s.length >= 4 ? s : name;
}

/**
 * Card names never wrap or get an ellipsis, and every row shows them at ONE size: first the full names at the base size;
 * a row that still does not fit uses its short name (no network word); then all rows share the size the longest needs
 * (never below 82%). Re-runs on resize and when fonts land.
 */
function useFitNames(box: RefObject<HTMLDivElement | null>, sig: string) {
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const names = [...el.querySelectorAll<HTMLElement>(".cr-name strong")];
      el.style.removeProperty("--cr-k");
      for (const n of names) n.textContent = n.dataset.full ?? n.textContent;
      const need = (n: HTMLElement) => { const room = (n.parentElement!.clientWidth - [...n.parentElement!.children].filter((x) => x !== n && !(x as HTMLElement).hidden).reduce((s, x) => s + (x as HTMLElement).offsetWidth + 6, 0)); return room > 0 ? Math.min(1, room / Math.max(1, n.scrollWidth)) : 1; };
      for (const n of names) (n.nextElementSibling as HTMLElement | null)?.removeAttribute("hidden");
      for (const n of names) if (need(n) < 0.9 && n.dataset.short) n.textContent = n.dataset.short;
      // Still too long at 82%: the ···last4 steps aside on that row (it stays on the card art in the sheet).
      for (const n of names) if (need(n) < 0.82 && n.nextElementSibling) (n.nextElementSibling as HTMLElement).hidden = true;
      const k = Math.max(0.82, Math.min(1, ...names.map(need)));
      if (k < 1) el.style.setProperty("--cr-k", k.toFixed(3));
      // The meta line never clips: the due date steps aside first, then the minimum (both stay in the card sheet).
      for (const m of el.querySelectorAll<HTMLElement>(".cr-meta")) {
        const bits = [...m.querySelectorAll<HTMLElement>("[data-drop]")].sort((a, b) => Number(a.dataset.drop) - Number(b.dataset.drop));
        bits.forEach((b) => { b.hidden = false; });
        for (const b of bits) { if (m.scrollWidth <= m.clientWidth + 1) break; b.hidden = true; }
      }
    };
    fit();
    let w = el.clientWidth, raf = 0;
    const ro = new ResizeObserver(() => { if (el.clientWidth === w) return; w = el.clientWidth; cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    ro.observe(el);
    void document.fonts?.ready.then(() => requestAnimationFrame(fit));
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [box, sig]);
}

function UtilLine({ util, balance, limit }: { util: number; balance: number; limit: number }) {
  const { fmt } = useFaro();
  const L = useL();
  const lvl = utilLevel(util);
  const cut = toThirty(balance, limit);
  return (
    <p className="cg-util" data-lvl={lvl}>
      <i aria-hidden><b style={{ width: `${Math.min(100, util * 100).toFixed(1)}%` }} /><s aria-hidden /></i>
      <span>{L("Uso", "Use")} <b className="num">{Math.round(util * 100)}%</b>{cut > 0 ? <> · {L("baja", "pay")} <b className="num">{fmt(cut)}</b> {L("para 30%", "to reach 30%")}</> : <> · {L("bajo 30%", "under 30%")}</>}</span>
    </p>
  );
}

function CardRow({ card, edit, onOpen, onDelete, onUpdate }: { card: CreditCard; edit: boolean; onOpen: () => void; onDelete: () => void; onUpdate: () => void }) {
  const { session, fmt, lang } = useFaro();
  const L = useL();
  const { view } = useView();
  const f = session ? cardFigures(session.ledger, card) : null;
  const known = !!f?.known;
  const trend = f && f.delta != null && f.delta !== 0 ? f.delta : null;
  return (
    <article className={`card-row${known ? "" : " is-new"}`} data-card={card.preset ?? card.id}>
      <button type="button" className="cr-main" onClick={onOpen} aria-label={card.name}>
        <CardArt card={card} />
        <span className="cr-text">
          <span className="cr-name"><strong data-full={card.name} data-short={shortName(card.name)}>{card.name}</strong>{card.last4 ? <em className="num">···{card.last4}</em> : null}</span>
          {known && f ? (
            <span className="cr-meta">
              {f.util != null ? <i className="cr-bar" data-drop="4" data-lvl={utilLevel(f.util)} aria-hidden><b style={{ width: `${Math.min(100, f.util * 100).toFixed(1)}%` }} /></i> : null}
              {f.min != null && f.min > 0 ? <span data-drop="2">{L("mín", "min")} <b className="num">{fmt(view(f.min, card.currency))}</b></span> : null}
              {f.dueOn ? <span data-drop="1">{dayLabel(f.dueOn, lang)}</span> : null}
              {trend != null ? <span className={`cr-trend ${trend > 0 ? "is-up" : "is-down"}`}>{trend > 0 ? "+" : "−"}{fmt(view(Math.abs(trend), card.currency))}&nbsp;<span data-drop="3">{L("desde el", "since")}&nbsp;</span>{dayLabel(f.since, lang)}</span> : null}
            </span>
          ) : <span className="cr-meta is-quiet">{card.manualOnly ? L("Se actualiza a mano", "Updated by hand") : L("Sin datos todavía", "No data yet")}</span>}
        </span>
      </button>
      {edit ? (
        <button type="button" className="cr-del" aria-label={`${L("Eliminar", "Delete")} ${card.name}`} onClick={onDelete}><Trash2 /></button>
      ) : known && f ? (
        <strong className="num cr-bal">{fmt(view(f.balance, card.currency))}</strong>
      ) : (
        <button type="button" className="cr-chip" onClick={onUpdate}>{L("Actualizar", "Update")}</button>
      )}
    </article>
  );
}

/* ---------- picking pictures ---------- */

/** "Foto o captura" with the 1.3.103 chooser (Cámara / Imágenes), and an optional third choice (Manual). */
export function ShotButton({ onFiles, label, small = false, onManual, full = false }: { onFiles: (f: File[]) => void; label: string; small?: boolean; onManual?: () => void; full?: boolean }) {
  const L = useL();
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const many = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const pick = (list: FileList | null) => { const f = [...(list ?? [])].filter((x) => x.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(x.name)); if (f.length) onFiles(f.slice(0, 12)); };
  const choose = (r: RefObject<HTMLInputElement | null>) => { setMenu(null); r.current?.click(); };
  return (
    <>
      <button ref={btn} type="button" className={small ? "cg-tool is-shot" : full ? "btn secondary cs-shot" : "scn-btn"} data-anchor="cards-shot" aria-haspopup="menu" aria-expanded={!!menu} aria-label={label}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenu((m) => (m ? null : btn.current?.getBoundingClientRect() ?? null)); }}>
        {small ? <Aperture /> : <><span>{label}</span><Aperture aria-hidden /></>}
      </button>
      <input ref={many} className="scn-file" type="file" accept="image/*" multiple tabIndex={-1} aria-hidden data-anchor="cards-file" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <input ref={cam} className="scn-file is-cam" type="file" accept="image/*" capture="environment" tabIndex={-1} aria-hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      {menu ? createPortal(<Chooser at={menu} onCamera={() => choose(cam)} onImages={() => choose(many)} onManual={onManual ? () => { setMenu(null); onManual(); } : undefined} onClose={() => setMenu(null)} L={L} />, document.body) : null}
    </>
  );
}

function Chooser({ at, onCamera, onImages, onManual, onClose, L }: { at: DOMRect; onCamera: () => void; onImages: () => void; onManual?: () => void; onClose: () => void; L: (es: string, en: string) => string }) {
  const first = useRef<HTMLButtonElement>(null);
  useLayer(true, onClose);
  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  });
  const n = onManual ? 3 : 2;
  const W = Math.min(n === 3 ? 330 : 240, innerWidth - 16);
  const left = Math.max(8, Math.min(at.right - W, innerWidth - 8 - W));
  const below = at.bottom + 8 + 64 <= innerHeight - 8;
  const pos = below ? { top: at.bottom + 8 } : { bottom: innerHeight - at.top + 8 };
  return (
    <div className="scn-pop-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }} onClick={(e) => e.stopPropagation()}>
      <div className={`scn-pop card-pop${below ? "" : " is-up"}`} role="menu" style={{ left, width: W, gridTemplateColumns: `repeat(${n}, 1fr)`, ...pos }}>
        <button ref={first} type="button" role="menuitem" className="scn-opt" data-opt="camera" onClick={onCamera}><Camera aria-hidden /><span>{L("Cámara", "Camera")}</span></button>
        <button type="button" role="menuitem" className="scn-opt" data-opt="images" onClick={onImages}><Images aria-hidden /><span>{L("Imágenes", "Images")}</span></button>
        {onManual ? <button type="button" role="menuitem" className="scn-opt" data-opt="manual" onClick={onManual}><SquarePen aria-hidden /><span>{L("Manual", "Manual")}</span></button> : null}
      </div>
    </div>
  );
}

/* ---------- one card ---------- */

function Sheet({ title, art, children, foot, onClose, anchor, tone = "owe" }: { title: ReactNode; art?: ReactNode; children: ReactNode; foot?: ReactNode; onClose: () => void; anchor: string; tone?: string }) {
  const L = useL();
  useLayer(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return createPortal(
    <div className="scn-scrim card-scrim" data-tone={tone} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scn-sheet card-sheet" role="dialog" aria-modal="true" data-anchor={anchor}>
        <div className="scn-head card-head">
          {art ?? <span className="scn-badge" aria-hidden><CardIcon /></span>}
          <h3 className="lab-head">{title}</h3>
          <button type="button" className="scn-x" aria-label={L("Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="scn-body">{children}</div>
        {foot ? <div className="scn-foot">{foot}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

function Spark({ card, ledger }: { card: CreditCard; ledger: LedgerState }) {
  const pts = card.snaps.map((s) => s.balanceMinor);
  const f = cardFigures(ledger, card);
  if (f.paid > 0) pts.push(f.balance);
  if (pts.length < 2) return null;
  const W = 300, H = 46, pad = 4;
  const peak = Math.max(...pts, 1), low = Math.min(...pts) * 0.8;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (pts.length - 1);
  const y = (v: number) => H - pad - ((v - low) / Math.max(1, peak - low)) * (H - pad * 2);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="cd-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L${x(pts.length - 1)},${H} L${x(0)},${H}Z`} className="cd-spark-area" />
      <path d={d} className="cd-spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CardSheet({ card, onClose, onEdit, onManual, onShots, onDelete }: { card: CreditCard; onClose: () => void; onEdit: () => void; onManual: () => void; onShots: (f: File[]) => void; onDelete: () => void }) {
  const { session, fmt, commit, lang } = useFaro();
  const L = useL();
  const { view } = useView();
  const [paying, setPaying] = useState(false);
  const [amt, setAmt] = useState("");
  const [on, setOn] = useState(todayIso());
  if (!session) return null;
  const ledger = session.ledger;
  const f = cardFigures(ledger, card);
  const monthly = cardMonthlyInterest(card, f.balance);
  const promo = promoMonths(card.promoUntil);
  const pays = cardPays(ledger, card.id);
  const events = [
    ...card.snaps.map((s) => ({ on: s.on, k: "snap" as const, v: s.balanceMinor, src: s.src })),
    ...pays.map((p) => ({ on: p.bookedOn || `${p.monthKey}-01`, k: "pay" as const, v: p.amountMinor, src: "pay" })),
  ].sort((a, b) => b.on.localeCompare(a.on)).slice(0, 12);
  const pay = () => {
    const m = parseAmount(amt);
    if (m == null || m <= 0) return;
    // Typed in the card's own currency, like every figure in this sheet's forms.
    commit((s) => payCard(s, card.id, m, on, uid(), L("Abono", "Payment")), card.name);
    setPaying(false); setAmt("");
  };
  const v = (m: number) => fmt(view(m, card.currency));
  return (
    <Sheet anchor="card-sheet" onClose={onClose} art={<CardArt card={card} big />} title={<span className="cd-title">{card.name}</span>}
      foot={paying ? (
        <><button type="button" className="btn secondary" onClick={() => setPaying(false)}>{L("Cancelar", "Cancel")}</button><button type="button" className="btn" data-anchor="card-pay-save" onClick={pay}>{L("Guardar", "Save")}</button></>
      ) : (
        <><button type="button" className="btn secondary" data-anchor="card-pay" onClick={() => { setPaying(true); setOn(todayIso()); }}>{L("Abonar", "Pay")}</button>
          <ShotButton full label={L("Actualizar", "Update")} onFiles={(fl) => { onClose(); onShots(fl); }} onManual={() => { onClose(); onManual(); }} /></>
      )}>
      <div className="cd-hero">
        <div><em>{L("Saldo", "Balance")}</em><strong className="num cd-bal">{f.known ? v(f.balance) : "—"}</strong></div>
        {f.delta != null && f.delta !== 0 ? <span className={`cr-trend ${f.delta > 0 ? "is-up" : "is-down"}`}>{f.delta > 0 ? L("creciendo", "growing") : L("bajando", "going down")} {f.delta > 0 ? "+" : "−"}{v(Math.abs(f.delta))}</span> : null}
      </div>
      {f.known ? <Spark card={card} ledger={ledger} /> : <p className="cd-soft">{card.manualOnly ? L("Este banco no deja tomar capturas: actualízala con Manual.", "This bank blocks screenshots: update it with Manual.") : L("Toca Actualizar y elige una captura de tu banco o escribe los datos.", "Tap Update and pick a screenshot from your bank or type the figures.")}</p>}
      {f.util != null ? <p className="cg-util" data-lvl={utilLevel(f.util)}><i aria-hidden><b style={{ width: `${Math.min(100, f.util * 100).toFixed(1)}%` }} /><s aria-hidden /></i><span>{L("Uso", "Use")} <b className="num">{Math.round(f.util * 100)}%</b>{toThirty(f.balance, f.limit ?? 0) > 0 ? <> · {L("baja", "pay")} <b className="num">{v(toThirty(f.balance, f.limit ?? 0))}</b> {L("para 30%", "to reach 30%")}</> : null}</span></p> : null}
      <div className="cd-facts">
        <span><em>{L("Límite", "Limit")}</em><b className="num">{f.limit != null ? v(f.limit) : "—"}</b></span>
        <span><em>{L("Disponible", "Available")}</em><b className="num">{f.avail != null ? v(f.avail) : "—"}</b></span>
        <span><em>{L("Pago mínimo", "Minimum")}</em><b className="num">{f.min != null ? v(f.min) : "—"}</b></span>
        <span><em>{L("Fecha de pago", "Due date")}</em><b>{f.dueOn ? dayLabel(f.dueOn, lang) : "—"}</b></span>
        <span><em>{L("Tasa anual", "APR")}</em><b className="num">{card.aprBps ? pctText(card.aprBps, lang) : "—"}{promo ? ` · 0% ${dayLabel(card.promoUntil!, lang)}` : ""}</b></span>
        <span><em>{L("Interés al mes", "Interest a month")}</em><b className="num">{f.known ? `${card.aprBps || promo ? "" : "≈ "}${v(monthly)}` : "—"}</b></span>
        <span><em>{L("Pago automático", "Autopay")}</em><b>{card.autopay == null ? "—" : card.autopay ? L("Sí", "On") : L("No", "Off")}</b></span>
        {card.rewards ? <span><em>{L("Recompensas", "Rewards")}</em><b>{card.rewards}</b></span> : null}
      </div>
      {!card.aprBps ? <button type="button" className="cd-ask" data-anchor="card-ask-apr" onClick={onEdit}>{L("Añade la tasa para un mejor consejo", "Add the rate for better advice")}</button> : null}
      {paying ? (
        <div className="form-block cobro-form is-bonus">
          <div className="cobro-grid">
            <label className="label"><span className="lab-head">{L("Monto", "Amount")} ({card.currency === "USD" ? "US$" : "C$"})</span><input className="field num" inputMode="decimal" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} aria-label={L("Monto del abono", "Payment amount")} /></label>
            <div className="label is-right"><span className="lab-head">{L("Fecha", "Date")}</span><DayField value={on} onChange={setOn} /></div>
          </div>
          <p className="cd-soft">{L("Es una transferencia: baja el saldo sin contar otra vez lo que ya gastaste.", "It is a transfer: it lowers the balance without counting what you already spent twice.")}</p>
        </div>
      ) : null}
      {events.length ? (
        <ol className="cd-hist">
          {events.map((e, i) => (
            <li key={i} data-k={e.k}><span className="num">{dayLabel(e.on, lang)}</span><span>{e.k === "pay" ? L("Abono", "Payment") : e.src === "shot" ? L("Captura", "Screenshot") : L("Manual", "Manual")}</span><b className="num">{e.k === "pay" ? "−" : ""}{v(e.v)}</b></li>
          ))}
        </ol>
      ) : null}
      <div className="cd-acts">
        <button type="button" className="btn secondary" data-anchor="card-edit" onClick={onEdit}><Pencil aria-hidden />{L("Editar", "Edit")}</button>
        <button type="button" className="btn secondary" onClick={onDelete}><Trash2 aria-hidden />{L("Eliminar", "Delete")}</button>
      </div>
    </Sheet>
  );
}

/* ---------- add / edit / manual update ---------- */

type Draft = { name: string; last4: string; apr: string; promo: string; limit: string; dueDay: string; autopay: "" | "on" | "off"; rewards: string; art: string; color: string; balance: string; avail: string; min: string; dueOn: string; mark: string; issuer: string; network: string };

function draftOf(c: CreditCard | null, seed?: Partial<CreditCard> & { read?: CardRead }): Draft {
  const r = seed?.read;
  const base = c ?? (seed as CreditCard | undefined);
  return {
    name: base?.name ?? "", last4: base?.last4 ?? r?.last4 ?? "", apr: base?.aprBps ? String(base.aprBps / 100) : r?.aprBps ? String(r.aprBps / 100) : "", promo: base?.promoUntil ?? "",
    limit: base?.limitMinor ? money(base.limitMinor) : r?.limitMinor ? money(r.limitMinor) : "", dueDay: base?.dueDay ? String(base.dueDay) : "",
    autopay: base?.autopay === true || r?.autopay === true ? "on" : base?.autopay === false || r?.autopay === false ? "off" : "", rewards: base?.rewards ?? "",
    art: base?.art ?? "", color: base?.color ?? "#079ed9", balance: r?.balanceMinor != null ? money(r.balanceMinor) : "", avail: r?.availMinor != null ? money(r.availMinor) : "",
    min: r?.minMinor != null ? money(r.minMinor) : "", dueOn: r?.dueOn ?? "", mark: base?.mark ?? r?.issuer ?? "", issuer: base?.issuer ?? (r?.issuer ? issuerOf(r.issuer)?.name ?? "" : ""), network: base?.network ?? "",
  };
}

function CardForm({ mode, card, seed, onClose }: { mode: "add" | "edit" | "update"; card: CreditCard | null; seed?: Partial<CreditCard> & { read?: CardRead }; onClose: () => void }) {
  const { commit, session } = useFaro();
  const L = useL();
  const [d, setD] = useState<Draft>(() => draftOf(card, seed));
  const [scan, setScan] = useState<File[] | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const upd = mode === "update";
  const isAdd = mode === "add";
  const nameMark = issuerOf(d.mark)?.mark ?? "";
  const autoMark = isAdd ? (issuerOf(d.mark) ? d.mark : "") : d.mark;
  const live: CreditCard = { id: card?.id ?? "new", name: d.name, issuer: d.issuer, mark: autoMark, color: d.color, art: d.art || undefined, network: d.network || networkIn(d.name), last4: d.last4, currency: card?.currency ?? "USD", limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", snaps: [] };
  const presetArt = artOf({ art: "", mark: autoMark });
  const save = () => {
    const amount = (s: string) => (s.trim() ? parseAmount(s) : null);
    const bal = amount(d.balance);
    if (upd) {
      if (!card || bal == null) return;
      const u: CardUpdate = { balanceMinor: bal, availMinor: amount(d.avail), minMinor: amount(d.min), dueOn: d.dueOn, src: "manual" };
      commit((s) => addReading(s, card.id, u), card.name);
      onClose();
      return;
    }
    const name = d.name.trim();
    if (!name) return;
    const pct = Number(d.apr.trim().replace(",", ".").replace("%", ""));
    const lim = amount(d.limit);
    const due = Number(d.dueDay);
    const next: CreditCard = {
      ...(card ?? { id: uid(), currency: "USD" as Currency, snaps: [] }),
      name, issuer: d.issuer || issuerOf(autoMark)?.name || "", mark: autoMark, color: d.color, art: d.art || undefined, network: d.network || networkIn(name) || card?.network,
      last4: d.last4.replace(/\D/g, "").slice(-4), aprBps: Number.isFinite(pct) && pct > 0 ? Math.round(pct * 100) : 0, promoUntil: d.promo || undefined,
      limitMinor: lim && lim > 0 ? lim : null, dueDay: due >= 1 && due <= 31 ? Math.round(due) : 0, autopay: d.autopay === "on" ? true : d.autopay === "off" ? false : null, rewards: d.rewards.trim(),
    } as CreditCard;
    commit((s) => {
      let st = putCard(s, next);
      if (isAdd && bal != null) st = addReading(st, next.id, { balanceMinor: bal, availMinor: amount(d.avail), minMinor: amount(d.min), dueOn: d.dueOn, limitMinor: seed?.read ? readLimit(seed.read) : null, aprBps: seed?.read?.aprBps ?? null, src: seed?.read ? "shot" : "manual" });
      return st;
    }, name);
    onClose();
  };
  const title = upd ? L("Actualizar a mano", "Update by hand") : isAdd ? L("Añadir tarjeta", "Add card") : L("Editar tarjeta", "Edit card");
  const money4 = (label: string, k: "balance" | "avail" | "min" | "limit", anchor?: string) => (
    <label className="label"><span className="lab-head">{label}</span><input className="field num" inputMode="decimal" placeholder="0.00" value={d[k]} data-anchor={anchor} onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)} /></label>
  );
  return (
    <Sheet anchor="card-form" onClose={onClose} art={<CardArt card={{ ...live, art: d.art || (nameMark ? undefined : d.art || "wave") }} big />} title={title}
      foot={<><button type="button" className="btn secondary" onClick={onClose}>{L("Cancelar", "Cancel")}</button><button type="button" className="btn" data-anchor="card-form-save" onClick={save}>{L("Guardar", "Save")}</button></>}>
      <div className="form-block cobro-form is-owe card-form">
        {isAdd && !seed?.read ? (
          <div className="cf-shot">
            <span>{L("¿Tienes una captura de tu banco?", "Got a screenshot from your bank?")}</span>
            <ShotButton label={L("Foto o captura", "Photo or screen")} onFiles={setScan} />
          </div>
        ) : null}
        {upd || isAdd ? <p className="cd-soft cf-cur">{L(`Montos en ${(card?.currency ?? "USD") === "USD" ? "US$" : "C$"}, como en tu banco.`, `Amounts in ${(card?.currency ?? "USD") === "USD" ? "US$" : "C$"}, as in your bank.`)}</p> : null}
        <div className="cobro-grid">
          {upd ? null : (
            <>
              <label className="label is-wide"><span className="lab-head">{L("Nombre", "Name")}<Hint topic="tarjetas" /></span>
                <input className="field" data-anchor="card-name" value={d.name} placeholder={L("Ej. Visa del banco", "E.g. Bank Visa")} onChange={(e) => { const name = e.target.value; const m = isAdd && !card ? (issuerOf(d.mark) ? d.mark : "") : d.mark; const guess = (m || (isAdd ? ISS(name) : "")); set({ name, ...(isAdd ? { mark: guess, issuer: issuerOf(guess)?.name ?? d.issuer } : {}) }); }} /></label>
              <label className="label is-wide cf-apr"><span className="lab-head">{L("Tasa anual (APR %)", "Yearly rate (APR %)")}</span>
                <span className="cobro-pct"><input className="field num" data-anchor="card-apr" inputMode="decimal" placeholder="0" value={d.apr} onChange={(e) => set({ apr: e.target.value })} /><i aria-hidden>%</i></span></label>
              <div className="label"><span className="lab-head">{L("0% hasta", "0% until")}</span><DayField value={d.promo} onChange={(v) => set({ promo: v })} /></div>
              <label className="label is-right"><span className="lab-head">{L("Últimos 4", "Last 4")}</span><input className="field num" inputMode="numeric" maxLength={4} placeholder="····" value={d.last4} onChange={(e) => set({ last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></label>
              {money4(L("Límite", "Limit"), "limit")}
              <label className="label is-right"><span className="lab-head">{L("Día de pago", "Due day")}</span><input className="field num" inputMode="numeric" placeholder="1–31" value={d.dueDay} onChange={(e) => set({ dueDay: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></label>
            </>
          )}
          {upd || isAdd ? (
            <>
              {money4(L("Saldo actual", "Current balance"), "balance", "card-balance")}
              {money4(L("Disponible", "Available"), "avail")}
              {money4(L("Pago mínimo", "Minimum"), "min")}
              <div className="label is-right"><span className="lab-head">{L("Fecha de pago", "Due date")}</span><DayField value={d.dueOn} onChange={(v) => set({ dueOn: v })} /></div>
            </>
          ) : null}
          {upd ? null : (
            <>
              <div className="label is-wide"><span className="lab-head">{L("Pago automático", "Autopay")}</span>
                <div className="cobro-kind"><button type="button" aria-pressed={d.autopay === "on"} onClick={() => set({ autopay: d.autopay === "on" ? "" : "on" })}>{L("Sí", "On")}</button><button type="button" aria-pressed={d.autopay === "off"} onClick={() => set({ autopay: d.autopay === "off" ? "" : "off" })}>{L("No", "Off")}</button></div></div>
              <label className="label is-wide"><span className="lab-head">{L("Recompensas (nota)", "Rewards (note)")}</span><input className="field" value={d.rewards} placeholder={L("Ej. 2% en todo", "E.g. 2% on everything")} onChange={(e) => set({ rewards: e.target.value })} /></label>
              <div className="label is-wide"><span className="lab-head">{L("Diseño", "Design")}</span>
                <div className="cf-arts" role="radiogroup">
                  {[...(nameMark && presetArt !== "wave" ? [presetArt] : []), ...ART_STYLES].map((a) => (
                    <button key={a} type="button" role="radio" aria-checked={(d.art || (nameMark && presetArt !== "wave" ? presetArt : "wave")) === a} aria-label={a} onClick={() => set({ art: a === presetArt && nameMark ? "" : a })}>
                      <CardArt card={{ ...live, art: a }} />
                    </button>
                  ))}
                </div>
              </div>
              {(d.art || (nameMark && presetArt !== "wave" ? presetArt : "wave")) === presetArt && nameMark && presetArt !== "wave" ? null : (
                <div className="label is-wide cf-color"><ColorPick value={d.color} onPick={(hex) => set({ color: hex })} label={L("Color", "Colour")} /></div>
              )}
            </>
          )}
        </div>
      </div>
      {scan ? <CardScan files={scan} onClose={() => setScan(null)} onAddFrom={(read) => { setScan(null); setD(draftOf(null, { name: read.title ? titleCase(read.title) : d.name, read })); }} /> : null}
    </Sheet>
  );
}

const ISS = (name: string) => issuerIn(name);

/* ---------- screenshots → preview → save ---------- */

type Item = { name: string; stage: "wait" | "load" | "read" | "done" | "fail"; p: number; found: number };
type Pick = { key: string; src: number; on: boolean; read: CardRead; target: string; sure: boolean; options: string[]; thumb: string; bal: string; avail: string; limit: string; min: string; due: string; unsure: CardField[]; newName: string };

export function CardScan({ files, onClose, onAddFrom }: { files: File[]; onClose: () => void; onAddFrom?: (read: CardRead) => void }) {
  const { session, commit, fmt, lang } = useFaro();
  const L = useL();
  const { view } = useView();
  const ledger = session?.ledger;
  const cards = useMemo(() => cardsOf(ledger), [ledger]);
  const [items, setItems] = useState<Item[]>(() => files.map((f) => ({ name: f.name, stage: "wait", p: 0, found: 0 })));
  const [picks, setPicks] = useState<Pick[]>([]);
  const [done, setDone] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const close = () => { stopRef.current(); onClose(); };
  useEffect(() => {
    let live = true;
    (async () => {
      let run: typeof import("@/lib/faro/scanrun");
      try { run = await import("@/lib/faro/scanrun"); } catch { setItems((l) => l.map((x) => ({ ...x, stage: "fail" }))); setDone(true); return; }
      const scanner = await run.openScanner();
      stopRef.current = () => { live = false; scanner.stop(); };
      const today = todayIso();
      const taken = new Set<string>();
      for (let i = 0; i < files.length && live; i++) {
        setItems((l) => l.map((x, j) => (j === i ? { ...x, stage: "load" } : x)));
        try {
          const img = await scanner.read(files[i], (stage, p) => { if (live) setItems((l) => l.map((x, j) => (j === i ? { ...x, stage, p } : x))); });
          const reads = parseCardShot(img.lines, today);
          const next: Pick[] = reads.map((r) => {
            const m = matchCard(r, cards.filter((c) => !taken.has(c.id)));
            if (m.id && m.sure) taken.add(m.id);
            const lim = readLimit(r);
            return {
              key: uid(), src: i, on: true, read: r, target: m.id || "new", sure: m.sure || (!m.id && !m.options.length), options: m.options, thumb: run.cropThumb(img.canvas, null),
              bal: money(r.balanceMinor), avail: money(r.availMinor), limit: money(lim), min: money(r.minMinor), due: r.dueOn, unsure: [...r.unsure, ...(r.limitMinor == null && lim != null ? ["limit" as CardField] : [])],
              newName: r.title ? titleCase(r.title) : r.issuer ? issuerOf(r.issuer)?.name ?? "" : "",
            };
          });
          if (!live) return;
          setPicks((p) => [...p, ...next]);
          setItems((l) => l.map((x, j) => (j === i ? { ...x, stage: "done", p: 1, found: reads.length } : x)));
        } catch {
          if (!live) return;
          setItems((l) => l.map((x, j) => (j === i ? { ...x, stage: "fail" } : x)));
        }
      }
      scanner.stop();
      if (live) setDone(true);
    })();
    return () => { live = false; stopRef.current(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sheetRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Same rule as the rows: full name, else the short one, then one shared size (never below 80%).
    const root = sheetRef.current?.closest(".scn-sheet");
    if (!root) return;
    const names = [...root.querySelectorAll<HTMLElement>(".cs-tname")];
    root.querySelectorAll<HTMLElement>(".cs-r1").forEach((r) => r.style.removeProperty("--cs-k"));
    for (const n of names) n.textContent = n.dataset.full ?? "";
    const need = (n: HTMLElement) => Math.min(1, n.clientWidth / Math.max(1, n.scrollWidth));
    for (const n of names) if (need(n) < 0.92 && n.dataset.short) n.textContent = n.dataset.short;
    const k = Math.max(0.8, Math.min(1, ...names.map(need)));
    if (k < 1) (root as HTMLElement).style.setProperty("--cs-k", k.toFixed(3)); else (root as HTMLElement).style.removeProperty("--cs-k");
  });
  const set = (key: string, p: Partial<Pick>, field?: CardField) => setPicks((l) => l.map((x) => (x.key === key ? { ...x, ...p, unsure: field ? x.unsure.filter((u) => u !== field) : x.unsure } : x)));
  const ready = picks.filter((p) => p.on && parseAmount(p.bal) != null && (p.target !== "new" || p.newName.trim()));
  const busy = !done;
  function save() {
    if (!ledger || !ready.length) return;
    commit((s) => ready.reduce((st, p) => {
      const amount = (x: string) => (x.trim() ? parseAmount(x) : null);
      let id = p.target;
      if (id === "new") {
        const mark = p.read.issuer;
        const iss = issuerOf(mark);
        const card: CreditCard = { id: uid(), name: p.newName.trim(), issuer: iss?.name ?? "", mark, color: iss?.color ?? "#079ed9", network: networkIn(p.read.title), last4: p.read.last4, currency: "USD", limitMinor: null, dueDay: 0, aprBps: p.read.aprBps ?? 0, autopay: p.read.autopay, rewards: "", snaps: [] };
        st = putCard(st, card);
        id = card.id;
      }
      const lim = amount(p.limit);
      return addReading(st, id, { balanceMinor: amount(p.bal)!, availMinor: amount(p.avail), limitMinor: p.read.limitMinor != null || (lim != null && lim !== readLimit(p.read)) ? lim : null, minMinor: amount(p.min), dueOn: p.due, last4: p.read.last4, autopay: p.read.autopay, aprBps: p.read.aprBps, src: "shot" });
    }, s), L(`Tarjetas ${ready.length}`, `Cards ${ready.length}`));
    onClose();
  }
  const total = items.length;
  const doneN = items.filter((x) => x.stage === "done" || x.stage === "fail").length;
  return (
    <Sheet anchor="card-scan" onClose={close} title={<>{busy ? L("Leyendo capturas", "Reading screenshots") : L("Revisar cambios", "Check the changes")}<Hint topic="tarjetas-captura" /></>}
      foot={<><button type="button" className="btn secondary" onClick={close}>{L("Cancelar", "Cancel")}</button><button type="button" className="btn" data-anchor="card-scan-save" disabled={busy || !ready.length} onClick={save}>{busy ? `${doneN}/${total}` : L(`Guardar ${ready.length}`, `Save ${ready.length}`)}</button></>}>
      <span ref={sheetRef} hidden />
      {busy || items.some((x) => x.stage === "fail") ? (
        <div className="scn-prog" role="status">
          {items.map((x, i) => (
            <div key={i} className={`scn-pi is-${x.stage}`}>
              <span className="scn-pn">{L(`Imagen ${i + 1} de ${total}`, `Picture ${i + 1} of ${total}`)}</span>
              <i aria-hidden><b style={{ width: `${Math.round((x.stage === "done" ? 1 : x.stage === "read" ? 0.15 + x.p * 0.85 : x.stage === "load" ? x.p * 0.15 : 0) * 100)}%` }} /></i>
              <span className="scn-ps">{x.stage === "done" ? (x.found ? L(`${x.found} leídas`, `${x.found} found`) : L("Sin datos", "No data")) : x.stage === "fail" ? L("No se leyó", "Not read") : x.stage === "wait" ? L("En cola", "Queued") : x.stage === "load" ? L("Preparando", "Preparing") : L("Leyendo", "Reading")}</span>
            </div>
          ))}
        </div>
      ) : null}
      {picks.map((p) => {
        const card = cards.find((c) => c.id === p.target) ?? null;
        const f = card && ledger ? cardFigures(ledger, card) : null;
        const nb = parseAmount(p.bal);
        const delta = f?.known && nb != null ? nb - f.balance : null;
        const un = (k: CardField) => (p.unsure.includes(k) ? " is-unsure" : "");
        const artCard = card ?? { id: p.key, art: undefined, mark: p.read.issuer, color: issuerOf(p.read.issuer)?.color ?? "#079ed9", network: networkIn(p.read.title), last4: p.read.last4 };
        return (
          <div key={p.key} className={`cs-card${p.on ? "" : " is-off"}`} data-target={p.target}>
            <div className="cs-r1">
              <CardArt card={artCard} />
              {/* The whole name, never cut: a label on top of a transparent native picker (one tap opens the system list). */}
              <span className={`field cs-target${p.sure ? "" : " is-unsure"}`}>
                <b className="cs-tname" data-full={card ? card.name : L("Añadir tarjeta", "Add card")} data-short={card ? shortName(card.name) : ""}>{card ? card.name : L("Añadir tarjeta", "Add card")}</b>
                <ChevronDown aria-hidden />
                <select value={p.target} aria-label={L("Tarjeta", "Card")} onChange={(e) => set(p.key, { target: e.target.value, sure: true })}>
                  {cards.map((c) => <option key={c.id} value={c.id}>{c.name}{c.last4 ? ` ···${c.last4}` : ""}</option>)}
                  <option value="new">{L("Añadir tarjeta", "Add card")}</option>
                </select>
              </span>
            </div>
            {p.target === "new" ? (
              <div className="cs-new">
                <input className="field" value={p.newName} placeholder={L("Nombre de la tarjeta", "Card name")} aria-label={L("Nombre de la tarjeta", "Card name")} onChange={(e) => set(p.key, { newName: e.target.value })} />
                {onAddFrom ? <button type="button" className="btn secondary" onClick={() => onAddFrom({ ...p.read, title: p.newName })}>{L("Usar en el formulario", "Use in the form")}</button> : null}
              </div>
            ) : null}
            <div className="cs-delta">
              <button type="button" role="switch" className="scn-switch" aria-checked={p.on} aria-label={L("Incluir", "Include")} onClick={() => set(p.key, { on: !p.on })}><i /></button>
              <span className="num cs-old">{f?.known ? fmt(view(f.balance, card!.currency)) : "—"}</span>
              <span aria-hidden>→</span>
              <label className={`cs-amt${un("balance")}`}><span>$</span><input className="field num" inputMode="decimal" value={p.bal} aria-label={L("Saldo nuevo", "New balance")} onChange={(e) => set(p.key, { bal: e.target.value }, "balance")} /></label>
              {delta != null && delta !== 0 ? <span className={`cr-trend ${delta > 0 ? "is-up" : "is-down"}`}>{delta > 0 ? "+" : "−"}{fmt(view(Math.abs(delta), card!.currency))}</span> : null}
            </div>
            <div className="cs-grid">
              <label className={`cs-f${un("avail")}`}><em>{L("Disponible", "Available")}</em><input className="field num" inputMode="decimal" value={p.avail} placeholder="—" onChange={(e) => set(p.key, { avail: e.target.value }, "avail")} /></label>
              <label className={`cs-f${un("limit")}`}><em>{L("Límite", "Limit")}</em><input className="field num" inputMode="decimal" value={p.limit} placeholder="—" onChange={(e) => set(p.key, { limit: e.target.value }, "limit")} /></label>
              <label className={`cs-f${un("min")}`}><em>{L("Mínimo", "Minimum")}</em><input className="field num" inputMode="decimal" value={p.min} placeholder="—" onChange={(e) => set(p.key, { min: e.target.value }, "min")} /></label>
              <span className={`cs-f${un("due")}`}><em>{L("Fecha de pago", "Due date")}</em><DayField value={p.due} onChange={(v) => set(p.key, { due: v }, "due")} /></span>
            </div>
            {p.read.aprBps || p.read.fico ? <p className="cs-info">{p.read.aprBps ? `${L("Tasa", "APR")} ${pctText(p.read.aprBps, lang)}` : ""}{p.read.aprBps && p.read.fico ? " · " : ""}{p.read.fico ? `FICO ${p.read.fico} (${L("solo informativo, no se guarda", "info only, not saved")})` : ""}</p> : null}
          </div>
        );
      })}
      {done && !picks.length ? <p className="scn-empty">{L("No encontré saldos de tarjeta. Prueba otra captura.", "No card balances found. Try another screenshot.")}</p> : null}
      {done && picks.length ? <p className="scn-note">{L("Las capturas no se guardan ni salen del teléfono.", "Screenshots are never kept or sent anywhere.")}</p> : null}
    </Sheet>
  );
}


/* ---------- Asesor: the cards plan in one card ---------- */

/** Asesor card (1.3.107): which card to pay next and how much of each payment, the debt-free date, utilization and cost. */
export function CardsAdvisor({ plan }: { plan: ReturnType<typeof import("@/lib/faro/debts").payoffPlan> }) {
  const { session, fmt, lang, setUi } = useFaro();
  const L = useL();
  const ledger = session?.ledger;
  const sums = cardTotals(ledger);
  if (!ledger || !sums.known) return null;
  const { display, rateE4 } = ledger.settings;
  const rows = cardsOf(ledger).map((c) => { const f = cardFigures(ledger, c); return { c, f, cost: convertMinor(cardMonthlyInterest(c, f.balance), c.currency, display, rateE4) }; }).filter((x) => x.f.known && x.f.balance > 0);
  const costly = [...rows].sort((a, b) => b.cost - a.cost)[0];
  const ch = plan.chosen;
  const first = plan.first;
  const firstCard = first ? rows.find((r) => r.c.id === first.id) : undefined;
  const lvl = utilLevel(sums.util);
  const cut = sums.util != null ? toThirty(sums.limited, sums.limit) : 0;
  const when = (n: number) => { const t = new Date(); const d = new Date(t.getFullYear(), t.getMonth() + n, 1); return d.toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { month: "short", year: "numeric" }).replace(".", ""); };
  const goPlan = () => { setUi({ section: "income", vault: "owe" }); window.setTimeout(() => window.dispatchEvent(new CustomEvent("faro-open", { detail: "debt-plan" })), 60); };
  return (
    <article className="advice-card is-medium card-advice" data-anchor="advice-cards">
      <div className="advice-head ca-head">
        <span className="advice-mark" aria-hidden>{firstCard ? <CardArt card={firstCard.c} /> : <CardIcon className="size-4" />}</span>
        <div>
          <p className="advice-kicker"><span className="lab-head">{L("Tarjetas", "Cards")}<Hint topic="tarjetas" /></span></p>
          <h2 className="serif">{L("¿Cuál pago primero?", "Which do I pay first?")}</h2>
        </div>
      </div>
      <div className="ca-facts">
        <span><em>{L("Debes en tarjetas", "Owed on cards")}</em><strong className="num">{fmt(sums.balance)}</strong></span>
        <span><em>{L("Uso", "Use")}</em><strong className="num" data-lvl={lvl}>{sums.util != null ? `${Math.round(sums.util * 100)}%` : "—"}</strong></span>
        <span><em>{L("Libre en", "Debt-free")}</em><strong>{ch && ch.months ? when(ch.months) : "—"}</strong></span>
      </div>
      {first && ch ? (
        <p className="advice-lead">{L("Paga primero", "Pay first")} <b>{first.name}</b>{plan.perPayOf[first.id] ? <>: <b className="num">{fmt(plan.perPayOf[first.id])}</b> {L(`de cada pago de ${fmt(plan.perPay)}`, `of each ${fmt(plan.perPay)} payment`)}</> : null}. {plan.order === "avalanche" ? L("Es la de tasa más alta.", "It has the highest rate.") : L("Es el saldo más chico.", "It is the smallest balance.")}</p>
      ) : (
        <p className="advice-lead">{L("Pon en Libros → Debo → Préstamos cuánto puedes pagar y cada cuánto, y te digo cuál pagar primero.", "Set in Books → I owe → Loans how much you can pay and how often, and I'll tell you which to pay first.")}</p>
      )}
      <p className="advice-because">
        {sums.util == null ? L("Añade el límite de cada tarjeta para ver tu uso de crédito.", "Add each card's limit to see your credit use.")
          : lvl === "great" || lvl === "ok" ? L("Tu uso está bajo 30%: bien para tu puntaje.", "Your use is under 30%: good for your score.")
            : L(`Tu uso pasa de 30%: paga ${fmt(cut)} para bajarlo.`, `Your use is over 30%: pay ${fmt(cut)} to bring it down.`)}
        {costly && costly.cost > 0 ? <> {L(`${costly.c.name} te cuesta ${fmt(costly.cost)} al mes en intereses${costly.c.aprBps ? "" : " (estimado)"}.`, `${costly.c.name} costs you ${fmt(costly.cost)} a month in interest${costly.c.aprBps ? "" : " (estimated)"}.`)}</> : null}
        {rows.some((r) => !r.c.aprBps) ? <> {L("Añade la tasa de cada tarjeta para un mejor consejo.", "Add each card's rate for better advice.")}</> : null}
      </p>
      <button type="button" className="btn ghost advice-copy" data-anchor="advice-cards-go" onClick={goPlan}>{L("Ver el plan", "See the plan")}</button>
    </article>
  );
}
