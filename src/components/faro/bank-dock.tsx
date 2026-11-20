/**
 * Bank import, the part that loads with the app (Nov 2026): the doors (Ajustes row, Libros button, share target),
 * the Deshacer toast, and the Recompensas card (Estudio) and insight (Asesor). The sheet itself and the Ajustes editor
 * load on demand (bank-import.tsx, bank-settings.tsx) together with the parsers.
 */
import "./bank.css";
import { Suspense, lazy, useEffect, useState } from "react";
import { ChevronRight, CreditCard, FileUp } from "lucide-react";
import { formatMoney } from "@/lib/faro/money";
import { importBook, rcLabel, rewardsMonth } from "@/lib/faro/bankbook";
import type { LedgerState } from "@/lib/faro/types";
import { requestModeAsk } from "@/lib/faro/mode-ask";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { Head } from "./panorama";
import { RewardRealBlock } from "./rewards-real";

const BankImport = lazy(() => import("./bank-import"));
const BankSettingsLazy = lazy(() => import("./bank-settings"));

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const OPEN = "faro-import";
const TOAST = "faro-import-toast";
/** Opens the import sheet (optionally with files already chosen, e.g. shared to Faro). */
export const openImport = (files?: File[]) => window.dispatchEvent(new CustomEvent(OPEN, { detail: files ?? null }));
export type ImportToast = { text: string; undo?: () => void };
export const importToast = (t: ImportToast) => window.dispatchEvent(new CustomEvent(TOAST, { detail: t }));
const WHISPER = "faro-mode-whisper";
export type ModeWhisper = { text: string; target?: "esencial" | "ritmo" | "completo" };
/** 1.3.319 (Oscar's word): «EL SUSURRO DEL MODO» — a surface that is present
 * in this mode but whose touch belongs to a higher mode must not answer
 * with silence. His refinement the same evening: not a plain toast but a
 * small CARD with the themes' premium finish, the official names wearing
 * their dotted underline ([[name]] marks), that hides itself — and that
 * can be tapped to go straight to the mode it names: the tap files a mode
 * ask (mode-ask.ts) and opens Ajustes, where the mode's own confirmation
 * question is already waiting. The caller composes the sentence. */
export const modeWhisper = (text: string, target?: ModeWhisper["target"]) => window.dispatchEvent(new CustomEvent(WHISPER, { detail: { text, target } satisfies ModeWhisper }));
const SIGN = "faro-mode-sign";
export type ModeSign = { dir: "up" | "down"; mode: "esencial" | "ritmo" | "completo" };
/** 1.3.307 (Oscar's word): a mode change is announced by a centered card
 * with one brief sentence — the mode's own line — never by a toast strip
 * whose words can fall off the box. */
export const modeSign = (s: ModeSign) => window.dispatchEvent(new CustomEvent(SIGN, { detail: s }));
const FTOAST = "faro-filter-toast";
export const FILTER_CLEAR = "faro-filter-clear";
/** Oscar (2026-11-20, como en Cadence): un filtro activo se anuncia
 * ARRIBA — el usuario no debe perder de vista su propia información
 * por un filtro que él mismo puso y olvidó. El aviso nombra lo que se
 * está viendo y tocarlo limpia el filtro (el aviso trae su cura). */
export const filterToast = (text: string) => window.dispatchEvent(new CustomEvent(FTOAST, { detail: text }));

/** Must match public/sw.js. */
const SHARE_CACHE = "share-inbox";
const STATEMENT_KEY = "./share-statement-inbox";

/** Lives once in the shell: the sheet when open, statements shared to Faro, and the toast with Deshacer. */
/** The whisper's [[name]] marks become the official-name spans (dotted
 * underline, the house law for proper names in explaining text). */
function whisperText(text: string) {
  return text.split(/\[\[(.+?)\]\]/g).map((part, i) =>
    i % 2 === 1 ? <span key={i} className="faro-name">{part}</span> : <span key={i}>{part}</span>,
  );
}

export function BankDock() {
  const { session, t, setUi } = useFaro();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[] | null>(null);
  const [toast, setToast] = useState<ImportToast | null>(null);
  const [whisper, setWhisper] = useState<ModeWhisper | null>(null);
  const [sign, setSign] = useState<ModeSign | null>(null);
  const [ftoast, setFtoast] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => { setFiles(((e as CustomEvent).detail as File[] | null) ?? null); setOpen(true); };
    let timer = 0;
    const onToast = (e: Event) => { setToast((e as CustomEvent).detail as ImportToast); window.clearTimeout(timer); timer = window.setTimeout(() => setToast(null), 9000); };
    let signTimer = 0;
    const onSign = (e: Event) => { setSign((e as CustomEvent).detail as ModeSign); window.clearTimeout(signTimer); signTimer = window.setTimeout(() => setSign(null), 3600); };
    let whisperTimer = 0;
    const onWhisper = (e: Event) => { setWhisper((e as CustomEvent).detail as ModeWhisper); window.clearTimeout(whisperTimer); whisperTimer = window.setTimeout(() => setWhisper(null), 6000); };
    let fTimer = 0;
    const onFtoast = (e: Event) => { setFtoast((e as CustomEvent).detail as string); window.clearTimeout(fTimer); fTimer = window.setTimeout(() => setFtoast(null), 6000); };
    window.addEventListener(OPEN, on);
    window.addEventListener(TOAST, onToast);
    window.addEventListener(SIGN, onSign);
    window.addEventListener(WHISPER, onWhisper);
    window.addEventListener(FTOAST, onFtoast);
    return () => { window.removeEventListener(OPEN, on); window.removeEventListener(TOAST, onToast); window.removeEventListener(SIGN, onSign); window.removeEventListener(WHISPER, onWhisper); window.removeEventListener(FTOAST, onFtoast); window.clearTimeout(timer); window.clearTimeout(signTimer); window.clearTimeout(whisperTimer); window.clearTimeout(fTimer); };
  }, []);
  const ready = !!session;
  useEffect(() => {
    if (!ready || !("caches" in window)) return;
    void (async () => {
      const cache = await caches.open(SHARE_CACHE);
      const hit = await cache.match(STATEMENT_KEY);
      if (!hit) return;
      const list = (await hit.json()) as { name: string; text: string }[];
      await cache.delete(STATEMENT_KEY);
      if (Array.isArray(list) && list.length) openImport(list.map((f) => new File([f.text], f.name || "statement.csv", { type: "text/plain" })));
    })().catch(() => {});
  }, [ready]);
  return (
    <>
      {open ? (
        <Suspense fallback={<div className="imp-scrim is-wait" aria-busy="true" />}>
          <BankImport initial={files} onClose={() => { setOpen(false); setFiles(null); }} />
        </Suspense>
      ) : null}
      {toast ? (
        <div className="imp-toast" role="status">
          <span>{toast.text}</span>
          {toast.undo ? <button type="button" className="imp-toast-undo" onClick={() => { toast.undo?.(); setToast(null); }}>{L(session?.ledger.settings.lang ?? "es", "Deshacer", "Undo")}</button> : null}
        </div>
      ) : null}
      {ftoast ? (
        <button type="button" className="filter-toast" data-anchor="filter-toast" onClick={() => { window.dispatchEvent(new CustomEvent(FILTER_CLEAR)); setFtoast(null); }}>
          {ftoast}
        </button>
      ) : null}
      {whisper ? (
        <button
          type="button"
          className="whisper-card"
          data-anchor="mode-whisper"
          onClick={() => {
            if (whisper.target) {
              requestModeAsk(whisper.target);
              setUi({ section: "settings" });
            }
            setWhisper(null);
          }}
        >
          <span className="whisper-text">{whisperText(whisper.text)}</span>
          {whisper.target ? <ChevronRight className="whisper-go" aria-hidden /> : null}
        </button>
      ) : null}
      {sign ? (
        <div className="mode-sign">
          <div className="mode-sign-card" role="status" data-anchor="mode-sign" onClick={() => setSign(null)}>
            <p className="mode-sign-head">{t(sign.dir === "up" ? "mode.sign.up" : "mode.sign.down").replace("{name}", t(`mode.${sign.mode}`))}</p>
            <p className="mode-sign-line">{t(`mode.${sign.mode}.line`)}.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Ajustes: framed row that opens the import (same family as the Manual row). */
export function ImportRow() {
  const { lang } = useFaro();
  // A div-button like the Ajustes folds, so the title's (?) sits right after the words without nesting buttons.
  return (
    <section className="card manual-card imp-card" data-anchor="aj-import">
      <div role="button" tabIndex={0} className="manual-row fold-btn imp-row" onClick={() => openImport()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openImport(); } }}>
        <FileUp aria-hidden />
        <span className="manual-row-text">
          <div className="imp-row-title"><strong className="serif">{L(lang, "Importar movimientos", "Import transactions")}</strong><Hint topic="importar" /></div>
          <span>{L(lang, "Chase, PayPal o tu banco", "Chase, PayPal or your bank")}</span>
        </span>
        <ChevronRight aria-hidden />
      </div>
    </section>
  );
}

/** Libros: a quiet way in, under the books. */
export function ImportDoor() {
  const { lang } = useFaro();
  return (
    <div className="imp-door-wrap" data-anchor="books-import">
      <button type="button" className="imp-door" onClick={() => openImport()}>
        <FileUp aria-hidden />
        <span>{L(lang, "Importar del banco", "Import from bank")}</span>
      </button>
    </div>
  );
}

/** Ajustes fold body (accounts, rewards, rules), loaded when the fold opens. */
export function BankSettings() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      <BankSettingsLazy />
    </Suspense>
  );
}

export function hasRewards(state: LedgerState | null | undefined, key: string): boolean {
  return !!state && !!rewardsMonth(state, key, state.settings.display, state.settings.rateE4);
}

function Ring({ share }: { share: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="rw-ring" aria-hidden>
      <circle cx="32" cy="32" r={r} className="rw-ring-bg" />
      <circle cx="32" cy="32" r={r} className="rw-ring-on" strokeDasharray={`${Math.max(0, Math.min(1, share)) * c} ${c}`} transform="rotate(-90 32 32)" />
      <path d="M22 26h20v14H22z M22 30h20" className="rw-ring-card" />
    </svg>
  );
}

/** Estudio: one picture (earned of possible), one number (earned), one action (the card to switch to). */
export function RewardsStudy() {
  const { session, lang, key, monthLabel } = useFaro();
  if (!session) return null;
  const { display, rateE4 } = session.ledger.settings;
  const m = rewardsMonth(session.ledger, key, display, rateE4);
  if (!m) return null;
  const money = (n: number) => formatMoney(n, display, lang);
  const share = m.possible > 0 ? m.earned / m.possible : 1;
  return (
    <section className="card pano-card rw-study" data-section="spend" data-anchor="study-rewards">
      <Head kicker={L(lang, `Tarjetas\u00a0·\u00a0${monthLabel}`, `Cards\u00a0·\u00a0${monthLabel}`)} title={L(lang, "Recompensas", "Rewards")} topic="estudio-recompensas" />
      <div className="rw-hero">
        <Ring share={share} />
        <div className="rw-hero-text">
          <em>{L(lang, "Ganado este mes", "Earned this month")}</em>
          <strong className="num">{money(m.earned)}</strong>
          <span>{L(lang, `de ${money(m.possible)} posibles`, `of ${money(m.possible)} possible`)}</span>
        </div>
      </div>
      <p className={`rw-act${m.top ? " is-miss" : ""}`}>
        {m.top
          ? L(lang, `Paga ${rcLabel(m.top.rc, lang, importBook(session.ledger).bonus)} con ${m.top.best.name}: +${money(m.top.missed)} al mes.`, `Pay ${rcLabel(m.top.rc, lang, importBook(session.ledger).bonus)} with ${m.top.best.name}: +${money(m.top.missed)} a month.`)
          : L(lang, "Cada compra fue con la tarjeta que más paga.", "Every purchase used the card that pays most.")}
      </p>
      <RewardRealBlock />
    </section>
  );
}

/** Asesor: the same reading as one insight. */
export function RewardsAdvice() {
  const { session, lang, key } = useFaro();
  if (!session) return null;
  const { display, rateE4 } = session.ledger.settings;
  const m = rewardsMonth(session.ledger, key, display, rateE4);
  if (!m) return null;
  const money = (n: number) => formatMoney(n, display, lang);
  return (
    <section className="card pp-advice rw-advice" data-anchor="advice-rewards">
      <span className="pp-pic rw-pic" aria-hidden><CreditCard /></span>
      <div className="pp-advice-text">
        <h3 className="lab-head">{L(lang, "Recompensas", "Rewards")}<Hint topic="asesor-recompensas" /></h3>
        <strong>{L(lang, `Tus tarjetas te dieron ${money(m.earned)} este mes.`, `Your cards gave you ${money(m.earned)} this month.`)}</strong>
        <p>{m.top
          ? L(lang, `Dejaste ${money(m.missed)} sobre la mesa. Lo mayor: ${rcLabel(m.top.rc, lang, importBook(session.ledger).bonus)}; usa ${m.top.best.name}.`, `You left ${money(m.missed)} on the table. The biggest: ${rcLabel(m.top.rc, lang, importBook(session.ledger).bonus)}; use ${m.top.best.name}.`)
          : L(lang, "No dejaste nada sobre la mesa: sigue con esas tarjetas.", "You left nothing on the table: keep those cards.")}</p>
      </div>
    </section>
  );
}
