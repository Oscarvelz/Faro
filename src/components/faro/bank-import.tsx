/**
 * The import sheet (lazy): choose files → (fix columns of an unknown CSV) → review → one commit.
 * Files are read here, on the device. Nothing is uploaded.
 */
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ArrowLeftRight, Ban, Settings as Gear, Check, CopyCheck, FileImage, FileUp, Link2, PiggyBank, RotateCcw, Scale, ShieldCheck, X } from "lucide-react";
import { formatMoney } from "@/lib/faro/money";
import { GUIDE_BUILTIN, accounts, guideName, guidesOf, importBook, rcLabel, resetGuides, rowFor, saveGuides } from "@/lib/faro/bankbook";
import { GuideEditor, GuideMark } from "./bank-guides";
import { applyImport, buildReview, counts, detectedCurrency, fileRecon, fromPdf, lineAmount, parseFile, pickSource, remap, revertImportCounted, rewardFor, type ImportAdjustment, type ParsedFile, type Review, type Row } from "@/lib/faro/bankparse";
import { parsePdfStatement } from "@/lib/faro/pdfstmt";
import { translate } from "@/lib/faro/i18n";
import type { ColumnMap, Currency, LedgerState, RewardClass } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { ThemeSelect } from "./line-form";
import { importToast } from "./bank-dock";
import { TargetPicker, chipLabel } from "./bank-pick";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const MONTHS: Record<string, string[]> = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const FULL: Record<string, string[]> = {
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const day = (iso: string, lang: string) => `${Number(iso.slice(8, 10))}\u00a0${MONTHS[lang === "en" ? "en" : "es"][Number(iso.slice(5, 7)) - 1]}`;

type Over = { target: Record<string, string>; include: Record<string, boolean> };
const ACCEPT = ".pdf,.csv,.qfx,.ofx,.qif,.txt,application/pdf,text/csv,application/x-ofx,application/vnd.intu.qfx";

/** One chosen file: a statement PDF goes to the PDF reader (loaded now, only for PDFs); anything else is text. */
async function readOne(f: File, maps: Record<string, ColumnMap>, onPdf: () => void): Promise<ParsedFile> {
  const buf = await f.arrayBuffer();
  const h = new Uint8Array(buf.slice(0, 4));
  if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) {
    onPdf();
    try {
      const { readPdf } = await import("@/lib/faro/pdftext");
      const doc = await readPdf(buf);
      const st = parsePdfStatement(doc);
      if (st) return fromPdf(f.name, st);
      const blank = doc.pages.every((p) => !p.some((w) => w.s.trim()));
      return { name: f.name, format: "pdf", bank: "other", sig: `pdf:${f.name}`, rows: [], error: blank ? "pdf-image" : "pdf-unknown" };
    } catch {
      return { name: f.name, format: "pdf", bank: "other", sig: `pdf:${f.name}`, rows: [], error: "unreadable" };
    }
  }
  return parseFile(f.name, new TextDecoder().decode(buf), maps);
}

export default function BankImport({ initial, onClose }: { initial: File[] | null; onClose: () => void }) {
  const { session, lang, names, commit, openManual, confirm } = useFaro();
  const [gEdit, setGEdit] = useState(false);
  const [gOpen, setGOpen] = useState<string | null>(null);
  const state = session?.ledger as LedgerState;
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [currs, setCurrs] = useState<string[]>([]);
  const [mapAt, setMapAt] = useState(-1);
  const [over, setOver] = useState<Over>({ target: {}, include: {} });
  const [pick, setPick] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [bad, setBad] = useState("");
  const [busy, setBusy] = useState(false);
  const [pocketOn, setPocketOn] = useState(true);
  // Files whose standing reconciliation difference Oscar confirmed an adjustment for (created with the import, 1.3.153).
  const [adjQueued, setAdjQueued] = useState<ReadonlySet<number>>(new Set());
  const maps = useRef<Record<string, ColumnMap>>({});
  // The sheet and its category picker each own a history entry: phone back closes the picker, then the sheet.
  useLayer(true, onClose);
  useLayer(!!pick, () => setPick(null));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { if (pick) setPick(null); else onClose(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [pick, onClose]);

  const accts = useMemo(() => accounts(state), [state]);
  async function take(list: FileList | File[] | null) {
    if (!list || !state) return;
    const book = importBook(state);
    const read: ParsedFile[] = [];
    try {
      for (const f of Array.from(list)) read.push(await readOne(f, { ...book.maps, ...maps.current }, () => setBusy(true)));
    } finally { setBusy(false); }
    const ok = read.filter((f) => !f.error);
    if (!ok.length) {
      const why = read[0]?.error;
      setBad(why === "pdf-image" ? L(lang, "Ese PDF es una imagen sin texto. Descarga el estado desde el sitio del banco.", "That PDF is a picture with no text. Download the statement from the bank's website.")
        : why === "pdf-unknown" ? L(lang, "Faro aún no conoce ese PDF. Prueba con el CSV o QFX de tu banco.", "Faro does not know that PDF yet. Try your bank's CSV or QFX.")
        : L(lang, "Ese archivo no es un estado de cuenta que Faro sepa leer.", "That file is not a statement Faro knows how to read."));
      return;
    }
    setBad("");
    const all = [...files, ...ok];
    setFiles(all);
    setSources([...sources, ...ok.map((f) => pickSource(f, book, accts))]);
    // Each file's currency starts from its own word (CURDEF, a currency column), else the book's display currency; the review lets the user change it per file.
    setCurrs([...currs, ...ok.map((f) => detectedCurrency(f) || state.settings.display)]);
    const need = all.findIndex((f) => f.csv && !f.csv.auto);
    setMapAt(need);
  }
  useEffect(() => { if (initial?.length) void take(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rv: Review | null = useMemo(() => {
    if (!state || !files.length || mapAt >= 0) return null;
    const base = buildReview(state, files, sources, names, lang, currs.map((c): Currency => (c === "NIO" ? "NIO" : "USD")));
    for (const r of base.rows) {
      const t = over.target[r.key];
      if (t && (r.flow === "spend" || r.flow === "refund")) {
        r.target = t; r.how = "rule";
        const label = base.targets.find((x) => x.value === t)?.label ?? "";
        // A PayPal checkout or a Chase Travel booking keeps its class: that is what the card pays for.
        r.rc = rowFor(importBook(state).bonus, t, label, r.rc) as RewardClass;
        r.reward = rewardFor(state, r);
      }
      if (r.uid in over.include) r.include = over.include[r.uid];
    }
    return base;
  }, [state, files, sources, mapAt, over, names, lang, currs]);

  if (!state) return null;
  const c = rv ? counts(rv.rows) : null;
  const money = (m: number) => formatMoney(m, "USD", lang);
  const tlabel = (v: string) => chipLabel(rv?.targets.find((x) => x.value === v), lang);

  function queueAdj(i: number, diff: number) {
    const acctName = accts.find((a) => a.id === sources[i])?.name ?? "";
    confirm({
      title: L(lang, "Crear ajuste por la diferencia", "Create an adjustment for the difference"),
      body: L(lang, `Entrará una línea de ${money(Math.abs(diff))} en ${acctName}, con la fecha del último día del estado. Es una línea normal: puedes editarla o borrarla cuando quieras.`, `A ${money(Math.abs(diff))} line will go into ${acctName}, dated the statement's last day. It is a normal line: you can edit or delete it any time.`),
      yes: L(lang, "Crear ajuste", "Create adjustment"),
      run: () => setAdjQueued(new Set(adjQueued).add(i)),
    });
  }

  function save() {
    if (!rv || !state) return;
    const batch = crypto.randomUUID();
    const picked = rv.rows.filter((r) => r.include).length;
    // Adjustments confirmed on a file's strip: recomputed at save time, so only a difference that still stands enters.
    const adjustments: ImportAdjustment[] = [];
    files.forEach((f, i) => {
      if (!adjQueued.has(i) || !sources[i]) return;
      const diff = fileRecon(rv.rows, i).diff;
      const lastDay = rv.rows.filter((r) => r.file === i).map((r) => r.date).sort().pop();
      if (!diff || !lastDay) return;
      const acctName = accts.find((a) => a.id === sources[i])?.name ?? "";
      const monthLabel = `${FULL[lang === "en" ? "en" : "es"][Number(lastDay.slice(5, 7)) - 1]} ${lastDay.slice(0, 4)}`;
      adjustments.push({ file: i, diffMinor: diff, concept: L(lang, `Ajuste de conciliación · ${acctName} · ${monthLabel}`, `Reconciliation adjustment · ${acctName} · ${monthLabel}`), note: L(lang, "Conciliación: la diferencia entre el estado de cuenta y lo que Faro tenía.", "Reconciliation: the difference between the statement and what Faro had.") });
    });
    const undo = applyImport(state, rv, files, sources, batch, pocketOn, adjustments).undo;
    commit((s) => {
      const next = applyImport(s, rv, files, sources, batch, pocketOn, adjustments).state;
      const book = importBook(next);
      return { ...next, imports: { ...book, maps: { ...book.maps, ...maps.current } } };
    }, L(lang, `Importar ${picked} movimientos`, `Import ${picked} transactions`));
    importToast({
      text: L(lang, `Importados: ${picked}`, `Imported: ${picked}`),
      // 1.3.166 (P6): el deshacer respeta las ediciones posteriores a la importación — y lo dice.
      undo: () => {
        let kept = 0;
        commit((s) => { const r = revertImportCounted(s, undo); kept = r.preserved; return r.state; }, L(lang, "Deshacer importación", "Undo import"));
        if (kept > 0) importToast({ text: L(lang, `Importación deshecha. Se conservaron ${kept} línea${kept === 1 ? "" : "s"} que editaste después.`, `Import undone. ${kept} line${kept === 1 ? "" : "s"} you edited afterwards were kept.`) });
      },
    });
    onClose();
  }

  const months = rv ? [...new Set(rv.rows.map((r) => r.month))].sort().reverse() : [];
  const pickRow = rv?.rows.find((r) => r.uid === pick) ?? null;
  const sameKey = pickRow ? rv!.rows.filter((r) => r.key === pickRow.key && (r.flow === "spend" || r.flow === "refund")).length : 0;
  const fileName = (i: number) => files[i]?.name ?? "";
  const acctOptions = [{ value: "", label: L(lang, "Sin cuenta", "No account") }, ...accts.map((a) => ({ value: a.id, label: a.name }))];

  return (
    <div className="imp-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="imp-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Importar movimientos", "Import transactions")}>
        <div className="imp-head">
          <span className="imp-badge" aria-hidden><FileUp /></span>
          <h3 className="lab-head">{rv ? L(lang, "Revisar movimientos", "Review transactions") : L(lang, "Importar movimientos", "Import transactions")}<Hint topic="importar" /></h3>
          <button type="button" className="imp-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>

        <div className="imp-body">
          {!files.length ? (
            <>
              <label
                className={`imp-drop${drag ? " is-drag" : ""}`}
                data-anchor="imp-drop"
                onDragOver={(e: DragEvent) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e: DragEvent) => { e.preventDefault(); setDrag(false); void take(e.dataTransfer.files); }}
              >
                <input type="file" multiple accept={ACCEPT} hidden onChange={(e) => { void take(e.target.files); e.currentTarget.value = ""; }} />
                <span className="imp-drop-ico" aria-hidden><FileUp /></span>
                <strong>{busy ? L(lang, "Leyendo el PDF", "Reading the PDF") : L(lang, "Elige tus archivos", "Choose your files")}</strong>
                <span>{L(lang, "PDF del estado, CSV, QFX, OFX o QIF", "Statement PDF, CSV, QFX, OFX or QIF")}</span>
              </label>
              <p className="imp-safe"><ShieldCheck aria-hidden /><span>{L(lang, "El archivo no se sube; tus datos sí.", "The file stays here; your data syncs.")}</span><Hint topic="imp-archivo" /></p>
              {bad ? <p className="imp-bad" role="alert">{bad}</p> : null}
              <div className="imp-help">
                <h4 className="lab-head">{L(lang, "Cómo descargar tu archivo", "How to download your file")}<button type="button" className="sub-gear" data-test="guide-gear" aria-pressed={gEdit} aria-label={L(lang, "Editar bancos", "Edit banks")} onClick={() => setGEdit((on) => !on)}><Gear /></button><Hint topic="imp-descargar" />
                  {gEdit ? <button type="button" className="sub-gear bg-restore" data-test="guide-restore" aria-label={L(lang, "Restaurar bancos", "Restore banks")} onClick={() => confirm({ title: L(lang, "Restaurar bancos", "Restore banks"),
                    body: L(lang, "Vuelven Chase, Wells Fargo y PayPal. Tus bancos propios salen de esta lista; sus tarjetas y tasas siguen en Bancos y recompensas.", "Chase, Wells Fargo and PayPal come back. Your own banks leave this list; their cards and rates stay in Banks and rewards."),
                    yes: L(lang, "Restaurar", "Restore"), run: () => { commit((s) => resetGuides(s), L(lang, "Bancos de fábrica", "Factory banks")); setGEdit(false); setGOpen(null); } })}><RotateCcw /></button> : null}</h4>
                {gEdit ? <GuideEditor lang={lang} state={state} guides={guidesOf(state)} onClose={() => setGEdit(false)} onSave={(next, fresh) => commit((s) => saveGuides(s, next, fresh), L(lang, "Bancos", "Banks"))} /> : (
                  <>
                    <div className="imp-banks">
                      {guidesOf(state).map((g) => (
                        <button key={g.id} type="button" className="imp-bank" aria-pressed={gOpen === g.id || undefined} onClick={() => { const t = GUIDE_BUILTIN[g.id]?.[0]; if (t) openManual(t); else if (g.steps) setGOpen(gOpen === g.id ? null : g.id); else openManual("imp-descargar"); }}><GuideMark g={g} />{guideName(g)}</button>
                      ))}
                    </div>
                    {(() => { const g = guidesOf(state).find((x) => x.id === gOpen); return g?.steps ? <p className="imp-steps" data-test="guide-steps">{g.steps}</p> : null; })()}
                  </>
                )}
              </div>
            </>
          ) : null}

          {mapAt >= 0 && files[mapAt]?.csv ? (
            <MapForm lang={lang} file={files[mapAt]} onCancel={() => { const rest = files.filter((_, i) => i !== mapAt); setFiles(rest); setSources(sources.filter((_, i) => i !== mapAt)); setCurrs(currs.filter((_, i) => i !== mapAt)); setMapAt(rest.findIndex((f) => f.csv && !f.csv.auto)); }}
              onDone={(map) => { const f = remap(files[mapAt], map); maps.current[f.sig] = map; const all = files.map((x, i) => (i === mapAt ? f : x)); setFiles(all); setMapAt(all.findIndex((x) => x.csv && !x.csv.auto)); }} />
          ) : null}

          {rv && c ? (
            <>
              <div className="imp-files">
                {files.map((f, i) => (
                  <div key={i} className="imp-file">
                    <span className="imp-file-name">{f.name}</span>
                    <div className="imp-file-acct">
                      <ThemeSelect value={sources[i] ?? ""} onChange={(v) => setSources(sources.map((s, j) => (j === i ? v : s)))} options={acctOptions} />
                      <ThemeSelect value={currs[i] ?? state.settings.display} onChange={(v) => setCurrs(currs.map((c, j) => (j === i ? v : c)))} options={[{ value: "USD", label: "USD" }, { value: "NIO", label: "NIO" }]} />
                      <Hint topic="imp-cuenta" />
                    </div>
                    {f.pdf ? <PdfNotes lang={lang} file={f} money={money} /> : null}
                    {(() => {
                      const rec = fileRecon(rv.rows, i);
                      if (!rec.rows) return null;
                      const queued = adjQueued.has(i);
                      return (
                        <div className="imp-recon" data-anchor="imp-recon">
                          <div className="imp-recon-nums">
                            <div><span>{L(lang, "Total del estado", "Statement total")}</span><b className="num">{money(rec.total)}</b></div>
                            <div><span>{L(lang, "Entra nuevo", "Coming in new")}</span><b className="num">{money(rec.incoming)}</b></div>
                            <div><span>{L(lang, "Ya estaba", "Already in")}</span><b className="num">{money(rec.already)}</b></div>
                            {rec.diff ? <div className="is-diff"><span>{L(lang, "Diferencia por conciliar", "Left to reconcile")}</span><b className="num">{money(rec.diff)}</b></div> : null}
                          </div>
                          {rec.diff && sources[i] && !queued ? (
                            <button type="button" className="btn secondary imp-recon-btn" onClick={() => queueAdj(i, rec.diff)}>{L(lang, "Crear ajuste por la diferencia", "Create an adjustment for the difference")}</button>
                          ) : null}
                          {rec.diff && queued ? (
                            <p className="imp-recon-note"><Check aria-hidden /><span>{L(lang, "El ajuste entrará con la importación, como una línea normal.", "The adjustment will go in with the import, as a normal line.")}</span><button type="button" className="imp-recon-x" onClick={() => { const next = new Set(adjQueued); next.delete(i); setAdjQueued(next); }}>{L(lang, "Quitar", "Remove")}</button></p>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
              {rv.pocket ? (
                <div className={`imp-pocket${pocketOn ? " is-on" : ""}`} data-anchor="imp-pocket">
                  <label className="imp-switch">
                    <input type="checkbox" checked={pocketOn} onChange={(e) => setPocketOn(e.target.checked)} aria-label={L(lang, `Llevar a Ahorros: ${rv.pocket.name}`, `Track in Savings: ${rv.pocket.name}`)} />
                  </label>
                  <span className="imp-pocket-ico" aria-hidden><PiggyBank /></span>
                  <span className="imp-pocket-text">
                    <strong>{rv.pocket.name}<Hint topic="imp-ahorros-paypal" /></strong>
                    <small>{rv.pocket.create ? L(lang, "Nuevo bolsillo en Ahorros", "New pocket in Savings") : L(lang, "Saldo en Ahorros", "Balance in Savings")}</small>
                  </span>
                  <span className="imp-pocket-amt">
                    <b className="num">{money(rv.pocket.endCents)}</b>
                    {rv.pocket.apyBps ? <small className="num">APY {(rv.pocket.apyBps / 100).toFixed(2).replace(".", lang === "en" ? "." : ",")}{"\u00a0"}%</small> : null}
                  </span>
                </div>
              ) : null}
              <div className="imp-tally" data-anchor="imp-tally">
                <div><strong className="num">{c.fresh}</strong><span>{L(lang, "Nuevos", "New")}</span></div>
                <div><strong className="num">{c.dups}</strong><span>{L(lang, "Duplicados", "Duplicates")}</span></div>
                <div><strong className="num">{c.xfers}</strong><span>{L(lang, "Transferencias", "Transfers")}</span></div>
                <Hint topic="imp-resumen" className="imp-tally-hint" />
              </div>
              {rv.dateless ? <p className="imp-dateless" role="note">{rv.dateless === 1 ? translate(lang, "import.dateless.one") : translate(lang, "import.dateless").replace("{n}", String(rv.dateless))}</p> : null}
              {months.map((mk) => {
                const list = rv.rows.filter((r) => r.month === mk).sort((a, b) => b.date.localeCompare(a.date));
                const spent = list.filter((r) => r.include && (r.flow === "spend" || r.flow === "refund")).reduce((s, r) => s + lineAmount(r), 0);
                return (
                  <section key={mk} className="imp-month">
                    <h4 className="imp-month-head"><span>{FULL[lang === "en" ? "en" : "es"][Number(mk.slice(5, 7)) - 1]} {mk.slice(0, 4)}</span><b className="num">{money(spent)}</b></h4>
                    <ul className="imp-list">
                      {list.map((r) => {
                        const spend = r.flow === "spend" || r.flow === "refund";
                        const amt = r.flow === "refund" ? `−${money(Math.abs(r.amount))}` : r.flow === "income" || r.flow === "interest" ? `+${money(Math.abs(r.amount))}` : money(Math.abs(r.amount));
                        return (
                          <li key={r.uid} className={`imp-item${r.include ? "" : " is-off"}`} data-flow={r.flow} data-uid={r.uid}>
                            <label className="imp-switch">
                              <input type="checkbox" checked={r.include} aria-label={L(lang, `Incluir ${r.label}`, `Include ${r.label}`)} onChange={(e) => setOver({ ...over, include: { ...over.include, [r.uid]: e.target.checked } })} />
                            </label>
                            <div className="imp-main">
                              <p className="imp-line1"><span className="imp-date num">{day(r.date, lang)}</span><strong className="imp-name">{r.label}</strong></p>
                              <div className="imp-tags">
                                {r.dup ? <span className={`imp-tag is-dup${r.dupOf ? " is-why" : ""}`}><CopyCheck aria-hidden />{r.dupOf ? L(lang, `Duplicado · tu línea "${r.dupOf.concept}" del ${day(r.dupOf.day, lang)}`, `Duplicate · your "${r.dupOf.concept}" line from ${day(r.dupOf.day, lang)}`) : L(lang, "Duplicado", "Duplicate")}</span> : null}
                                {r.paired ? <span className="imp-tag is-pair"><Link2 aria-hidden />{files[r.file]?.bank === "paypal" || accts.find((a) => a.id === sources[r.file])?.kind === "paypal" ? L(lang, "Ya en la tarjeta", "Already on card") : L(lang, "Ya en PayPal", "Already in PayPal")}</span> : null}
                                {r.pairs || (r.via && r.via !== "card") ? <span className="imp-tag is-pair"><Link2 aria-hidden />{L(lang, "PayPal + tarjeta", "PayPal + card")}</span> : null}
                                {r.flow === "xfer" ? <span className="imp-tag is-xfer"><ArrowLeftRight aria-hidden />{L(lang, "Transferencia", "Transfer")}</span> : null}
                                {r.flow === "refund" ? <span className="imp-tag is-refund"><RotateCcw aria-hidden />{L(lang, "Reembolso", "Refund")}</span> : null}
                                {r.flow === "skip" ? (r.voided ? <span className="imp-tag is-dup"><Ban aria-hidden />{L(lang, "Anulado", "Reversed")}</span> : <span className="imp-tag is-dup">{L(lang, "Pendiente", "Pending")}</span>) : null}
                                {spend && !r.dup && !r.paired ? (
                                  <button type="button" className={`imp-chip${r.how === "seed" ? " is-seed" : r.how === "rule" ? " is-rule" : ""}`} onClick={() => setPick(r.uid)}>
                                    {r.how === "rule" ? <Check aria-hidden /> : null}<span>{tlabel(r.target)}</span>
                                  </button>
                                ) : r.flow === "income" || r.flow === "interest" ? <span className="imp-tag is-in">{L(lang, "Ingreso", "Income")}</span> : null}
                              </div>
                              {r.include && r.reward?.missed && r.reward.best ? (
                                <p className="imp-miss">{L(lang, `Con ${r.reward.best.name}: +`, `With ${r.reward.best.name}: +`)}<b className="num">{money(r.reward.missed)}</b></p>
                              ) : null}
                            </div>
                            <div className="imp-amt">
                              <b className="num">{amt}</b>
                              {r.include && r.reward && r.reward.earned > 0 ? <small className="num" title={rcLabel(r.rc, lang, importBook(state).bonus)}>+{money(r.reward.earned)}</small> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </>
          ) : null}
        </div>

        {mapAt < 0 ? <div className="imp-foot">
          <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
          {rv && c ? (
            <button type="button" className="btn imp-go" disabled={!c.fresh} onClick={save}>{L(lang, `Importar ${c.fresh}`, `Import ${c.fresh}`)}</button>
          ) : (
            <label className="btn imp-go">
              <input type="file" multiple accept={ACCEPT} hidden onChange={(e) => { void take(e.target.files); e.currentTarget.value = ""; }} />
              {L(lang, "Elegir archivos", "Choose files")}
            </label>
          )}
        </div> : null}

        {pickRow && rv ? (
          <TargetPicker lang={lang} targets={rv.targets} value={pickRow.target}
            note={sameKey > 1 ? L(lang, `${pickRow.label}: ${sameKey} movimientos. Faro lo recordará.`, `${pickRow.label}: ${sameKey} transactions. Faro will remember it.`) : L(lang, `${pickRow.label}. Faro lo recordará la próxima vez.`, `${pickRow.label}. Faro will remember it next time.`)}
            onPick={(v) => { setOver({ ...over, target: { ...over.target, [pickRow.key]: v } }); setPick(null); }} onClose={() => setPick(null)} />
        ) : null}
      </div>
    </div>
  );
}

/** Under a PDF's account: its period, whether its rows add up to the statement's own summary, and pages that are pictures. */
function PdfNotes({ lang, file, money }: { lang: string; file: ParsedFile; money: (m: number) => string }) {
  const p = file.pdf!;
  const hard = p.recon.filter((r) => !r.soft);
  const off = hard.find((r) => r.want !== r.got);
  const soft = p.recon.find((r) => r.soft && r.want !== r.got);
  return (
    <div className="imp-pdf">
      <p className="imp-pdf-row">
        <span className="imp-pdf-period num">{p.period.from && p.period.to ? `${day(p.period.from, lang)} – ${day(p.period.to, lang)}` : ""}</span>
        <span className="imp-pdf-tail">
          {hard.length ? (
            <span className={`imp-pdf-check${off ? " is-off" : ""}`}><Scale aria-hidden />{off ? L(lang, `No cuadra por ${money(Math.abs(off.want - off.got))}`, `Off by ${money(Math.abs(off.want - off.got))}`) : L(lang, "Cuadra con el resumen", "Matches the summary")}</span>
          ) : null}
          <Hint topic="imp-pdf" />
        </span>
      </p>
      {soft ? <p className="imp-pdf-note">{L(lang, `Saldo: ${money(Math.abs(soft.want - soft.got))} retenido o pendiente`, `Balance: ${money(Math.abs(soft.want - soft.got))} held or pending`)}</p> : null}
      {p.imagePages.map((n) => (
        <p key={n} className="imp-pdf-note is-img" role="note"><FileImage aria-hidden />{L(lang, `Página ${n} es imagen: revísala a mano`, `Page ${n} is a picture: check by hand`)}</p>
      ))}
    </div>
  );
}

function MapForm({ lang, file, onCancel, onDone }: { lang: string; file: ParsedFile; onCancel: () => void; onDone: (m: ColumnMap) => void }) {
  const csv = file.csv!;
  const [m, setM] = useState<ColumnMap>(csv.map);
  const [two, setTwo] = useState(csv.map.debit >= 0);
  const cols = [{ value: "-1", label: "—" }, ...csv.headers.map((h, i) => ({ value: String(i), label: h || L(lang, `Columna ${i + 1}`, `Column ${i + 1}`) }))];
  const set = (k: keyof ColumnMap) => (v: string) => setM({ ...m, [k]: Number(v) });
  const final: ColumnMap = two ? { ...m, amount: -1 } : { ...m, debit: -1, credit: -1 };
  const preview = remap(file, final).rows.slice(0, 3);
  const ready = final.date >= 0 && final.desc >= 0 && (two ? final.debit >= 0 && final.credit >= 0 : final.amount >= 0) && preview.length > 0;
  const field = (label: string, topic: string, k: keyof ColumnMap) => (
    <label className="imp-map-field">
      <span className="lab-head">{label}<Hint topic={topic} /></span>
      <ThemeSelect value={String(m[k])} onChange={set(k)} options={cols} />
    </label>
  );
  return (
    <div className="imp-map" data-anchor="imp-map">
      <h4 className="lab-head">{L(lang, "Columnas del archivo", "File columns")}<Hint topic="imp-columnas" /></h4>
      <p className="imp-map-file">{file.name}</p>
      <div className="imp-map-grid">
        {field(L(lang, "Fecha", "Date"), "imp-col-fecha", "date")}
        {field(L(lang, "Descripción", "Description"), "imp-col-desc", "desc")}
        {two ? <>{field(L(lang, "Cargo", "Debit"), "imp-col-monto", "debit")}{field(L(lang, "Abono", "Credit"), "imp-col-monto", "credit")}</> : field(L(lang, "Monto", "Amount"), "imp-col-monto", "amount")}
      </div>
      <div className="form-toggles imp-map-toggles">
        <label className="row text-sm form-toggle"><input type="checkbox" checked={two} onChange={(e) => setTwo(e.target.checked)} /><span>{L(lang, "Cargo y abono", "Debit, credit")}</span><Hint topic="imp-dos-columnas" /></label>
        <label className="row text-sm form-toggle"><input type="checkbox" checked={m.dmy} onChange={(e) => setM({ ...m, dmy: e.target.checked })} /><span>{L(lang, "Día primero", "Day first")}</span><Hint topic="imp-dia-primero" /></label>
        <label className="row text-sm form-toggle"><input type="checkbox" checked={m.invert} onChange={(e) => setM({ ...m, invert: e.target.checked })} /><span>{L(lang, "Gasto positivo", "Spend positive")}</span><Hint topic="imp-invertir" /></label>
      </div>
      <ul className="imp-map-preview">
        {preview.map((r, i) => <li key={i}><span className="num">{r.date}</span><span>{r.desc}</span><b className="num">{formatMoney(r.amount, "USD", lang === "en" ? "en" : "es")}</b></li>)}
      </ul>
      <div className="imp-map-acts">
        <button type="button" className="btn secondary" onClick={onCancel}>{L(lang, "Quitar archivo", "Drop file")}</button>
        <button type="button" className="btn" disabled={!ready} onClick={() => onDone(final)}>{L(lang, "Usar columnas", "Use columns")}</button>
      </div>
    </div>
  );
}
