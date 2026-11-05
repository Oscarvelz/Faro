/**
 * Escanear (1.3.101): from a book's editor, read receipt photos or subscription screenshots on the device, one or many,
 * and review every draft before anything is saved. Saved drafts are ordinary ledger lines (same shape LineForm builds).
 * The OCR (scanrun + ./ocr/) loads only when a picture is chosen; pictures are never kept (thumbnails live in memory
 * while the sheet is open; an app icon cropped for a Cuota is stored like any custom icon, ~2 KB, only if kept).
 */
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Aperture, Camera, Check, Trash2, X } from "lucide-react";
import { isDuplicate, parseScan, type ScanBook, type ScanDraft, type ScanField } from "@/lib/faro/receiptparse";
import { cadenceLabel, freqPresetsOf } from "@/lib/faro/cadence";
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
 * The compact entry at the right of the editor's Concepto head: "Foto o captura" (one or many pictures; the system
 * chooser also offers the camera) and a camera-only square. Buttons + hidden inputs, so it can sit inside the field's
 * <label> after its input without taking the label's clicks; the sheet is portalled to <body> for the same reason.
 */
export function ScanEntry({ from }: { from: LineKind }) {
  const { lang } = useFaro();
  const [files, setFiles] = useState<File[] | null>(null);
  const many = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const pick = (list: FileList | null) => { const f = [...(list ?? [])].filter((x) => x.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(x.name)); if (f.length) setFiles(f.slice(0, 12)); };
  const open = (e: MouseEvent, r: RefObject<HTMLInputElement | null>) => { e.preventDefault(); e.stopPropagation(); r.current?.click(); };
  return (
    <span className="scn-entry" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="scn-btn" data-anchor="scan-add" onClick={(e) => open(e, many)}>
        <Camera aria-hidden />
        <span>{L(lang, "Foto o captura", "Photo or screen")}</span>
      </button>
      <button type="button" className="scn-btn is-icon" aria-label={L(lang, "Tomar foto", "Take a photo")} onClick={(e) => open(e, cam)}>
        <Aperture aria-hidden />
      </button>
      <input ref={many} className="scn-file" type="file" accept="image/*" multiple tabIndex={-1} aria-hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      <input ref={cam} className="scn-file is-cam" type="file" accept="image/*" capture="environment" tabIndex={-1} aria-hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      {files ? createPortal(<ScanSheet files={files} from={from} onClose={() => setFiles(null)} />, document.body) : null}
    </span>
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
  const presets = freqPresetsOf(ledger);
  const freqOpts = [...new Set(["monthly", "yearly", "weekly", ...presets])].map((v) => ({ value: v, label: cadenceLabel(v, lang) }));

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
            <DraftCard key={c.id} c={c} lang={lang} bookOpts={bookOpts} freqOpts={freqOpts} onSet={(p) => set(c.id, p)} onDrop={() => setCards((l) => l.filter((x) => x.id !== c.id))} />
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

function DraftCard({ c, lang, bookOpts, freqOpts, onSet, onDrop }: {
  c: Card; lang: string; bookOpts: { value: string; label: string }[]; freqOpts: { value: string; label: string }[];
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
        {recur ? <span className={`scn-freq${un("cadence")}`}><ThemeSelect value={c.cadence || "monthly"} options={freqOpts} onChange={(v) => onSet({ cadence: v })} /></span> : null}
        {c.thumb ? <img className="scn-thumb" src={c.thumb} alt="" /> : null}
        <span className="scn-book"><ThemeSelect value={c.book} options={bookOpts} onChange={(v) => onSet({ book: v as Card["book"], cadence: c.cadence || (v === "subscription" || v === "expense-fixed" ? "monthly" : "") })} /></span>
        <input className="field scn-notef" value={c.note} placeholder={L(lang, "Nota", "Note")} aria-label={L(lang, "Nota", "Note")} onChange={(e) => onSet({ note: e.target.value })} />
      {c.dup ? <p className="scn-dup">{L(lang, "Ya está en tus libros", "Already in your books")}</p> : null}
    </div>
  );
}

export const SCAN_BOOKS = BOOKS;
