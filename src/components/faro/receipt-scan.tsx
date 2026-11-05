/**
 * Escanear (1.3.101): from a book's editor, read receipt photos or subscription screenshots on the device, one or many,
 * and review every draft before anything is saved. Saved drafts are ordinary ledger lines (same shape LineForm builds).
 * The OCR (scanrun + ./ocr/) loads only when a picture is chosen; pictures are never kept (thumbnails live in memory
 * while the sheet is open; an app icon cropped for a Cuota is stored like any custom icon, ~2 KB, only if kept).
 */
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Aperture, Camera, Check, Images, Trash2, X } from "lucide-react";
import { isDuplicate, parseScan, type ScanBook, type ScanDraft, type ScanField } from "@/lib/faro/receiptparse";
import { freqPresetsOf } from "@/lib/faro/cadence";
import { parseAmount, uid } from "@/lib/faro/money";
import { upsertLine } from "@/lib/faro/reducer";
import { displayName } from "@/lib/faro/defaults";
import { libraryOff, normName } from "@/lib/faro/subs";
import type { Currency, Line, LineKind } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { SubMark } from "./icons";
import { DayField, ThemeSelect } from "./line-form";
import { FreqPick } from "./fit-pick";
import "./scan.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const BOOKS: ScanBook[] = ["subscription", "purchase", "expense-variable"];
type Item = { name: string; stage: "wait" | "load" | "read" | "done" | "fail"; p: number; found: number };
type Card = {
  id: string; src: number; on: boolean; dup: boolean; book: ScanBook | "expense-fixed";
  concept: string; amount: string; currency: Currency; date: string; cadence: string; note: string;
  brand: string; crop: string; useCrop: boolean; generic: string; category: string; sub: string; unsure: ScanField[]; thumb: string;
};

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const money = (minor: number | null) => (minor == null ? "" : (minor / 100).toFixed(2));

/**
 * The compact entry at the right of the editor's Concepto head (1.3.103): one "Foto o captura" pill with the aperture
 * inside, on the right. Tapping it opens a small anchored chooser with two equal options, Cámara (capture) and Imágenes
 * (one or many, the gallery where screenshots live). A desktop with a fine pointer and no camera skips the chooser and
 * opens the file picker at once. Buttons + hidden inputs, so it can sit inside the field's <label> after its input
 * without taking the label's clicks; the chooser and the sheet are portalled to <body> for the same reason.
 */
export function ScanEntry({ from }: { from: LineKind }) {
  const { lang } = useFaro();
  const [files, setFiles] = useState<File[] | null>(null);
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const [hasCam, setHasCam] = useState(true);
  const btn = useRef<HTMLButtonElement>(null);
  const many = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Phones and tablets always offer the camera; a mouse-only device offers it only when it has one.
    const fine = typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches && !matchMedia("(any-pointer: coarse)").matches;
    if (!fine) return;
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) { setHasCam(false); return; }
    md.enumerateDevices().then((d) => setHasCam(d.some((x) => x.kind === "videoinput"))).catch(() => setHasCam(false));
  }, []);
  const pick = (list: FileList | null) => { const f = [...(list ?? [])].filter((x) => x.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(x.name)); if (f.length) setFiles(f.slice(0, 12)); };
  const tap = (e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!hasCam) { many.current?.click(); return; }
    setMenu((m) => (m ? null : btn.current?.getBoundingClientRect() ?? null));
  };
  const choose = (r: RefObject<HTMLInputElement | null>) => { setMenu(null); r.current?.click(); };
  return (
    <span className="scn-entry" onClick={(e) => e.stopPropagation()}>
      <button ref={btn} type="button" className="scn-btn" data-anchor="scan-add" aria-haspopup={hasCam ? "menu" : undefined} aria-expanded={hasCam ? !!menu : undefined} onClick={tap}>
        <span>{L(lang, "Foto o captura", "Photo or screen")}</span>
        <Aperture aria-hidden />
      </button>
      <input ref={many} className="scn-file" type="file" accept="image/*" multiple tabIndex={-1} aria-hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <input ref={cam} className="scn-file is-cam" type="file" accept="image/*" capture="environment" tabIndex={-1} aria-hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      {menu ? createPortal(<ScanChooser at={menu} onCamera={() => choose(cam)} onImages={() => choose(many)} onClose={() => setMenu(null)} />, document.body) : null}
      {files ? createPortal(<ScanSheet files={files} from={from} onClose={() => setFiles(null)} />, document.body) : null}
    </span>
  );
}

/** The two-option chooser under (or, near the bottom of the screen, above) the pill. Owns a Back step; outside tap and Escape close it. */
function ScanChooser({ at, onCamera, onImages, onClose }: { at: DOMRect; onCamera: () => void; onImages: () => void; onClose: () => void }) {
  const { lang } = useFaro();
  const first = useRef<HTMLButtonElement>(null);
  useLayer(true, onClose);
  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  });
  const W = Math.min(240, innerWidth - 16);
  const left = Math.max(8, Math.min(at.right - W, innerWidth - 8 - W));
  const below = at.bottom + 8 + 64 <= innerHeight - 8;
  const pos = below ? { top: at.bottom + 8 } : { bottom: innerHeight - at.top + 8 };
  const stop = (e: MouseEvent) => e.stopPropagation();
  return (
    <div className="scn-pop-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }} onClick={stop}>
      <div className={`scn-pop${below ? "" : " is-up"}`} role="menu" aria-label={L(lang, "Foto o captura", "Photo or screen")} style={{ left, width: W, ...pos }}>
        <button ref={first} type="button" role="menuitem" className="scn-opt" data-opt="camera" onClick={(e) => { stop(e); onCamera(); }}>
          <Camera aria-hidden /><span>{L(lang, "Cámara", "Camera")}</span>
        </button>
        <button type="button" role="menuitem" className="scn-opt" data-opt="images" onClick={(e) => { stop(e); onImages(); }}>
          <Images aria-hidden /><span>{L(lang, "Imágenes", "Images")}</span>
        </button>
      </div>
    </div>
  );
}

function ScanSheet({ files, from, onClose }: { files: File[]; from: LineKind; onClose: () => void }) {
  const { session, commit, key, lang, t } = useFaro();
  const ledger = session?.ledger;
  const [items, setItems] = useState<Item[]>(() => files.map((f) => ({ name: f.name, stage: "wait", p: 0, found: 0 })));
  const [cards, setCards] = useState<Card[]>([]);
  const [done, setDone] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const close = () => { stopRef.current(); onClose(); };
  useLayer(true, close);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  useEffect(() => {
    let live = true;
    (async () => {
      let run: typeof import("@/lib/faro/scanrun");
      try { run = await import("@/lib/faro/scanrun"); } catch { setItems((l) => l.map((x) => ({ ...x, stage: "fail" }))); setDone(true); return; }
      const scanner = await run.openScanner();
      stopRef.current = () => { live = false; scanner.stop(); };
      const day = today();
      const all = (ledger?.months ? Object.values(ledger.months).flatMap((m) => m.lines ?? []) : []) as Line[];
      for (let i = 0; i < files.length && live; i++) {
        setItems((l) => l.map((x, j) => (j === i ? { ...x, stage: "load", p: 0 } : x)));
        try {
          const img = await scanner.read(files[i], (stage, p) => { if (live) setItems((l) => l.map((x, j) => (j === i ? { ...x, stage, p } : x))); });
          const drafts = parseScan(img.lines, day);
          const next: Card[] = [];
          for (const d of drafts) {
            const crop = d.type === "subscription" && !d.brand ? await run.cropIcon(img.canvas, d.box) : "";
            next.push(toCard(d, i, run.cropThumb(img.canvas, d.box), crop, from, all));
          }
          if (!live) return;
          setCards((c) => [...c, ...next]);
          setItems((l) => l.map((x, j) => (j === i ? { ...x, stage: "done", p: 1, found: drafts.length } : x)));
        } catch {
          if (!live) return;
          setItems((l) => l.map((x, j) => (j === i ? { ...x, stage: "fail", p: 0 } : x)));
        }
      }
      scanner.stop();
      if (live) setDone(true);
    })();
    return () => { live = false; stopRef.current(); };
    // One run per opened sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (id: string, patch: Partial<Card>) => setCards((l) => l.map((c) => (c.id === id ? { ...c, ...patch, unsure: c.unsure.filter((u) => !(u in fieldsOf(patch))) } : c)));
  const ready = cards.filter((c) => c.on && c.concept.trim() && parseAmount(c.amount) != null);
  const busy = !done;

  function save() {
    if (!ledger || !ready.length) return;
    const st = ledger.structure;
    const off = libraryOff(ledger);
    const lines: Line[] = ready.map((c) => {
      const kind = c.book as LineKind;
      const sub = kind === "subscription";
      const store = kind === "purchase" ? st.catalog.find((s) => s.kind === "store" && !s.hidden && normName(c.concept).includes(normName(displayName(s, lang as "es" | "en")))) : undefined;
      const catOk = kind === "purchase" ? st.purchases.some((p) => p.id === c.category) : kind === "expense-variable" ? st.categories.some((p) => p.id === c.category && p.group === "variable") : false;
      const icon = sub ? (c.brand && !off.has(c.brand) ? `sub:${c.brand}` : c.crop && c.useCrop ? `sub:${c.crop}` : c.generic ? `sub:${c.generic}` : "") : "";
      return {
        id: uid(), seriesId: uid(), monthKey: key, kind, concept: c.concept.trim(), amountMinor: parseAmount(c.amount)!, currency: c.currency,
        active: true, note: c.note.trim(), categoryId: catOk ? c.category : "", subId: catOk && kind === "expense-variable" ? c.sub : "",
        recurring: sub || kind === "expense-fixed", storeId: store?.id ?? "", providerId: "", productCode: "", productUrl: "",
        cadence: sub || kind === "expense-fixed" ? (c.cadence as Line["cadence"]) || "monthly" : "", nextDue: sub ? c.date : "",
        aprBps: 0, balanceMinor: null, balanceCurrency: c.currency, icon, history: [],
        bookedOn: sub ? "" : c.date, startedOn: "",
      };
    });
    commit((s) => lines.reduce((acc, line) => upsertLine(acc, line), s), L(lang, `Escanear ${lines.length}`, `Scan ${lines.length}`));
    onClose();
  }

  const total = items.length;
  const doneN = items.filter((x) => x.stage === "done" || x.stage === "fail").length;
  const bookOpts = [
    { value: "subscription", label: t("tab.subs") },
    { value: "purchase", label: t("nav.shops") },
    { value: "expense-variable", label: t("nav.variable") },
    { value: "expense-fixed", label: t("nav.fixed") },
  ];
  // The editor's own frequency sheet: the user's chips plus "Otro…" (its custom rhythms are remembered like in the editor).
  const presets = freqPresetsOf(ledger);

  return (
    <div className="scn-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="scn-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Foto o captura", "Photo or screen")}>
        <div className="scn-head">
          <span className="scn-badge" aria-hidden><Camera /></span>
          <h3 className="lab-head">{busy ? L(lang, "Leyendo imágenes", "Reading pictures") : L(lang, "Revisar lo leído", "Check what I read")}<Hint topic="escanear" /></h3>
          <button type="button" className="scn-x" aria-label={L(lang, "Cerrar", "Close")} onClick={close}><X /></button>
        </div>
        <div className="scn-body">
          {busy || items.some((x) => x.stage === "fail") ? (
            <div className="scn-prog" role="status">
              {items.map((x, i) => (
                <div key={i} className={`scn-pi is-${x.stage}`}>
                  <span className="scn-pn">{L(lang, `Imagen ${i + 1} de ${total}`, `Picture ${i + 1} of ${total}`)}</span>
                  <i aria-hidden><b style={{ width: `${Math.round((x.stage === "done" ? 1 : x.stage === "read" ? 0.15 + x.p * 0.85 : x.stage === "load" ? x.p * 0.15 : 0) * 100)}%` }} /></i>
                  <span className="scn-ps">{x.stage === "done" ? (x.found ? L(lang, `${x.found} leídos`, `${x.found} found`) : L(lang, "Sin datos", "No data")) : x.stage === "fail" ? L(lang, "No se leyó", "Not read") : x.stage === "wait" ? L(lang, "En cola", "Queued") : x.stage === "load" ? L(lang, "Preparando", "Preparing") : L(lang, "Leyendo", "Reading")}</span>
                </div>
              ))}
            </div>
          ) : null}
          {cards.map((c) => (
            <DraftCard key={c.id} c={c} lang={lang} bookOpts={bookOpts} presets={presets} onSet={(p) => set(c.id, p)} onDrop={() => setCards((l) => l.filter((x) => x.id !== c.id))} />
          ))}
          {done && !cards.length ? <p className="scn-empty">{L(lang, "No encontré montos. Prueba otra foto.", "No amounts found. Try another photo.")}</p> : null}
          {done && cards.length ? <p className="scn-note">{L(lang, "Las fotos no se guardan ni salen del teléfono.", "Photos are never kept or sent anywhere.")}</p> : null}
        </div>
        <div className="scn-foot">
          <button type="button" className="btn secondary" onClick={close}>{L(lang, "Cancelar", "Cancel")}</button>
          <button type="button" className="btn" disabled={busy || !ready.length} onClick={save}>
            {busy ? `${doneN}/${total}` : L(lang, `Guardar ${ready.length}`, `Save ${ready.length}`)}
          </button>
        </div>
      </div>
    </div>
  );
}

function fieldsOf(p: Partial<Card>): Record<string, true> {
  const o: Record<string, true> = {};
  if ("concept" in p) o.concept = true;
  if ("amount" in p) o.amount = true;
  if ("date" in p) o.date = true;
  if ("cadence" in p) o.cadence = true;
  return o;
}

function toCard(d: ScanDraft, src: number, thumb: string, crop: string, from: LineKind, all: Line[]): Card {
  // Started from Cuotas: everything goes to Cuotas. Otherwise a subscription goes to Cuotas and a receipt to the book
  // it came from when that book holds spending (Compras/Variables/Fijos), else to the parser's guess.
  const book: Card["book"] = from === "subscription" ? "subscription"
    : d.type === "subscription" ? "subscription"
    : from === "purchase" || from === "expense-variable" || from === "expense-fixed" ? (from === "purchase" && d.book === "expense-variable" ? "expense-variable" : from) : d.book;
  const dup = isDuplicate(d, all);
  return {
    id: uid(), src, on: !dup, dup, book, concept: d.concept, amount: money(d.amountMinor), currency: d.currency, date: d.date,
    cadence: d.cadence || (book === "subscription" ? "monthly" : ""), note: d.note, brand: d.brand, crop, useCrop: !!crop,
    generic: d.generic, category: book === d.book ? d.category : "", sub: book === d.book ? d.sub : "", unsure: d.unsure, thumb,
  };
}

function DraftCard({ c, lang, bookOpts, presets, onSet, onDrop }: {
  c: Card; lang: string; bookOpts: { value: string; label: string }[]; presets: string[];
  onSet: (p: Partial<Card>) => void; onDrop: () => void;
}) {
  const un = (f: ScanField) => (c.unsure.includes(f) ? " is-unsure" : "");
  const sub = c.book === "subscription";
  const mark = sub ? (c.brand ? c.brand : c.crop && c.useCrop ? c.crop : c.generic) : "";
  const recur = sub || c.book === "expense-fixed";
  return (
    <div className={`scn-card${c.on ? "" : " is-off"}${recur ? " has-freq" : ""}`} data-book={c.book}>
      <div className="scn-r1">
        <button type="button" role="switch" className="scn-switch" aria-checked={c.on} aria-label={L(lang, "Incluir", "Include")} onClick={() => onSet({ on: !c.on })}><i /></button>
        {sub ? (
          <span className="scn-mark">
            {mark ? <SubMark id={mark} className="scn-mk" /> : <span className="scn-mk is-none" aria-hidden />}
            {c.crop && !c.brand && c.useCrop ? <button type="button" className="scn-unmark" aria-label={L(lang, "Quitar ícono", "Remove icon")} onClick={() => onSet({ useCrop: false })}><X /></button> : null}
            {c.crop && !c.brand && !c.useCrop ? <button type="button" className="scn-unmark is-back" aria-label={L(lang, "Usar ícono", "Use icon")} onClick={() => onSet({ useCrop: true })}><Check /></button> : null}
          </span>
        ) : null}
        <input className={`field scn-concept${un("concept")}`} value={c.concept} placeholder={L(lang, "Concepto", "Concept")} aria-label={L(lang, "Concepto", "Concept")} onChange={(e) => onSet({ concept: e.target.value })} />
        <button type="button" className="scn-del" aria-label={L(lang, "Quitar", "Remove")} onClick={onDrop}><Trash2 /></button>
      </div>
        <span className={`scn-amt${un("amount")}`}>
          <button type="button" className="scn-cur" aria-label={c.currency} onClick={() => onSet({ currency: c.currency === "USD" ? "NIO" : "USD" })}>{c.currency === "USD" ? "$" : "C$"}</button>
          <input className={`field num${c.currency === "NIO" ? " is-nio" : ""}`} inputMode="decimal" value={c.amount} placeholder="0.00" aria-label={L(lang, "Monto", "Amount")} onChange={(e) => onSet({ amount: e.target.value })} />
        </span>
        <span className={`scn-day${un("date")}`} aria-label={sub ? L(lang, "Próximo cobro", "Next charge") : L(lang, "Día", "Day")}><DayField value={c.date} onChange={(v) => onSet({ date: v })} /></span>
        {recur ? <span className={`scn-freq${un("cadence")}`}><FreqPick value={c.cadence || "monthly"} presets={presets} onChange={(v) => onSet({ cadence: v })} /></span> : null}
        {c.thumb ? <img className="scn-thumb" src={c.thumb} alt="" /> : null}
        <span className="scn-book"><ThemeSelect value={c.book} options={bookOpts} onChange={(v) => onSet({ book: v as Card["book"], cadence: c.cadence || (v === "subscription" || v === "expense-fixed" ? "monthly" : "") })} /></span>
        <input className="field scn-notef" value={c.note} placeholder={L(lang, "Nota", "Note")} aria-label={L(lang, "Nota", "Note")} onChange={(e) => onSet({ note: e.target.value })} />
      {c.dup ? <p className="scn-dup">{L(lang, "Ya está en tus libros", "Already in your books")}</p> : null}
    </div>
  );
}

export const SCAN_BOOKS = BOOKS;
