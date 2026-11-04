/**
 * Bank import, the part that loads with the app (Nov 2026): the doors (Ajustes row, Libros button, share target),
 * the Deshacer toast, and the Recompensas card (Estudio) and insight (Asesor). The sheet itself and the Ajustes editor
 * load on demand (bank-import.tsx, bank-settings.tsx) together with the parsers.
 */
import "./bank.css";
import { Suspense, lazy, useEffect, useState } from "react";
import { ChevronRight, CreditCard, FileUp } from "lucide-react";
import { formatMoney } from "@/lib/faro/money";
import { rcLabel, rewardsMonth } from "@/lib/faro/bankbook";
import type { LedgerState } from "@/lib/faro/types";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { Head } from "./panorama";

const BankImport = lazy(() => import("./bank-import"));
const BankSettingsLazy = lazy(() => import("./bank-settings"));

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const OPEN = "faro-import";
const TOAST = "faro-import-toast";
/** Opens the import sheet (optionally with files already chosen, e.g. shared to Faro). */
export const openImport = (files?: File[]) => window.dispatchEvent(new CustomEvent(OPEN, { detail: files ?? null }));
export type ImportToast = { text: string; undo?: () => void };
export const importToast = (t: ImportToast) => window.dispatchEvent(new CustomEvent(TOAST, { detail: t }));

/** Must match public/sw.js. */
const SHARE_CACHE = "share-inbox";
const STATEMENT_KEY = "./share-statement-inbox";

/** Lives once in the shell: the sheet when open, statements shared to Faro, and the toast with Deshacer. */
export function BankDock() {
  const { session } = useFaro();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[] | null>(null);
  const [toast, setToast] = useState<ImportToast | null>(null);
  useEffect(() => {
    const on = (e: Event) => { setFiles(((e as CustomEvent).detail as File[] | null) ?? null); setOpen(true); };
    let timer = 0;
    const onToast = (e: Event) => { setToast((e as CustomEvent).detail as ImportToast); window.clearTimeout(timer); timer = window.setTimeout(() => setToast(null), 9000); };
    window.addEventListener(OPEN, on);
    window.addEventListener(TOAST, onToast);
    return () => { window.removeEventListener(OPEN, on); window.removeEventListener(TOAST, onToast); window.clearTimeout(timer); };
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
          <span>{L(lang, "Chase, State Farm, PayPal o tu banco", "Chase, State Farm, PayPal or your bank")}</span>
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
          ? L(lang, `Paga ${rcLabel(m.top.rc, lang)} con ${m.top.best.name}: +${money(m.top.missed)} al mes.`, `Pay ${rcLabel(m.top.rc, lang)} with ${m.top.best.name}: +${money(m.top.missed)} a month.`)
          : L(lang, "Cada compra fue con la tarjeta que más paga.", "Every purchase used the card that pays most.")}
      </p>
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
          ? L(lang, `Dejaste ${money(m.missed)} sobre la mesa. Lo mayor: ${rcLabel(m.top.rc, lang)}; usa ${m.top.best.name}.`, `You left ${money(m.missed)} on the table. The biggest: ${rcLabel(m.top.rc, lang)}; use ${m.top.best.name}.`)
          : L(lang, "No dejaste nada sobre la mesa: sigue con esas tarjetas.", "You left nothing on the table: keep those cards.")}</p>
      </div>
    </section>
  );
}
