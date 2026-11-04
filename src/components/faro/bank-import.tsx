/**
 * The import sheet (lazy): choose files → (fix columns of an unknown CSV) → review → one commit.
 * Files are read here, on the device. Nothing is uploaded.
 */
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ArrowLeftRight, Check, CopyCheck, FileUp, Link2, RotateCcw, ShieldCheck, X } from "lucide-react";
import { formatMoney } from "@/lib/faro/money";
import { accounts, guessClass, importBook, rcLabel } from "@/lib/faro/bankbook";
import { applyImport, buildReview, counts, lineAmount, parseFile, pickSource, remap, revertImport, rewardFor, type ParsedFile, type Review, type Row } from "@/lib/faro/bankparse";
import type { ColumnMap, LedgerState, RewardClass } from "@/lib/faro/types";
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

/** A category the user picks says what kind of shop it is (for card rewards). */
function rcOfLabel(label: string, fallback: RewardClass): RewardClass {
  const s = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/restaur|comida fuera|comidas|dining|cafe/.test(s)) return "dining";
  if (/despensa|super|grocer|alimentos|comida/.test(s)) return "grocery";
  if (/farmac|salud|pharm|medic|health/.test(s)) return "drug";
  if (/gasolin|fuel|\bgas\b/.test(s)) return "gas";
  return guessClass(s).rc === "other" ? fallback : guessClass(s).rc;
}

type Over = { target: Record<string, string>; include: Record<string, boolean> };

export default function BankImport({ initial, onClose }: { initial: File[] | null; onClose: () => void }) {
  const { session, lang, names, commit, openManual } = useFaro();
  const state = session?.ledger as LedgerState;
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [mapAt, setMapAt] = useState(-1);
  const [over, setOver] = useState<Over>({ target: {}, include: {} });
  const [pick, setPick] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [bad, setBad] = useState("");
  const maps = useRef<Record<string, ColumnMap>>({});
  useLayer(true, () => { if (pick) setPick(null); else onClose(); });
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
    for (const f of Array.from(list)) read.push(parseFile(f.name, await f.text(), { ...book.maps, ...maps.current }));
    const ok = read.filter((f) => !f.error);
    if (!ok.length) { setBad(L(lang, "Ese archivo no es un estado de cuenta que Faro sepa leer.", "That file is not a statement Faro knows how to read.")); return; }
    setBad("");
    const all = [...files, ...ok];
    setFiles(all);
    setSources([...sources, ...ok.map((f) => pickSource(f, book, accts))]);
    const need = all.findIndex((f) => f.csv && !f.csv.auto);
    setMapAt(need);
  }
  useEffect(() => { if (initial?.length) void take(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rv: Review | null = useMemo(() => {
    if (!state || !files.length || mapAt >= 0) return null;
    const base = buildReview(state, files, sources, names, lang);
    for (const r of base.rows) {
      const t = over.target[r.key];
      if (t && (r.flow === "spend" || r.flow === "refund")) {
        r.target = t; r.how = "rule";
        const label = base.targets.find((x) => x.value === t)?.label ?? "";
        r.rc = rcOfLabel(label, r.rc);
        r.reward = rewardFor(state, r);
      }
      if (r.uid in over.include) r.include = over.include[r.uid];
    }
    return base;
  }, [state, files, sources, mapAt, over, names, lang]);

  if (!state) return null;
  const c = rv ? counts(rv.rows) : null;
  const money = (m: number) => formatMoney(m, "USD", lang);
  const tlabel = (v: string) => chipLabel(rv?.targets.find((x) => x.value === v), lang);

  function save() {
    if (!rv || !state) return;
    const batch = crypto.randomUUID();
    const picked = rv.rows.filter((r) => r.include).length;
    const undo = applyImport(state, rv, files, sources, batch).undo;
    commit((s) => {
      const next = applyImport(s, rv, files, sources, batch).state;
      const book = importBook(next);
      return { ...next, imports: { ...book, maps: { ...book.maps, ...maps.current } } };
    }, L(lang, `Importar ${picked} movimientos`, `Import ${picked} transactions`));
    importToast({ text: L(lang, `Importados: ${picked}`, `Imported: ${picked}`), undo: () => commit((s) => revertImport(s, undo), L(lang, "Deshacer importación", "Undo import")) });
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
                <input type="file" multiple accept=".csv,.qfx,.ofx,.qif,.txt,text/csv,application/x-ofx,application/vnd.intu.qfx" hidden onChange={(e) => { void take(e.target.files); e.currentTarget.value = ""; }} />
                <span className="imp-drop-ico" aria-hidden><FileUp /></span>
                <strong>{L(lang, "Elige tus archivos", "Choose your files")}</strong>
                <span>{L(lang, "CSV, QFX, OFX o QIF; varios a la vez", "CSV, QFX, OFX or QIF; several at once")}</span>
              </label>
              <p className="imp-safe"><ShieldCheck aria-hidden /><span>{L(lang, "Se leen en este equipo. Nada sale de aquí.", "Read on this device. Nothing leaves it.")}</span><Hint topic="imp-archivo" /></p>
              {bad ? <p className="imp-bad" role="alert">{bad}</p> : null}
              <div className="imp-help">
                <h4 className="lab-head">{L(lang, "Cómo descargar tu archivo", "How to download your file")}<Hint topic="imp-descargar" /></h4>
                <div className="imp-banks">
                  {([["imp-chase", "Chase"], ["imp-statefarm", "State Farm"], ["imp-paypal", "PayPal"]] as const).map(([id, name]) => (
                    <button key={id} type="button" className="imp-bank" onClick={() => openManual(id)}>{name}</button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {mapAt >= 0 && files[mapAt]?.csv ? (
            <MapForm lang={lang} file={files[mapAt]} onCancel={() => { const rest = files.filter((_, i) => i !== mapAt); setFiles(rest); setSources(sources.filter((_, i) => i !== mapAt)); setMapAt(rest.findIndex((f) => f.csv && !f.csv.auto)); }}
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
                      <Hint topic="imp-cuenta" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="imp-tally" data-anchor="imp-tally">
                <div><strong className="num">{c.fresh}</strong><span>{L(lang, "Nuevos", "New")}</span></div>
                <div><strong className="num">{c.dups}</strong><span>{L(lang, "Duplicados", "Duplicates")}</span></div>
                <div><strong className="num">{c.xfers}</strong><span>{L(lang, "Transferencias", "Transfers")}</span></div>
                <Hint topic="imp-resumen" className="imp-tally-hint" />
              </div>
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
                                {r.dup ? <span className="imp-tag is-dup"><CopyCheck aria-hidden />{L(lang, "Duplicado", "Duplicate")}</span> : null}
                                {r.paired ? <span className="imp-tag is-pair"><Link2 aria-hidden />{files[r.file]?.bank === "paypal" || accts.find((a) => a.id === sources[r.file])?.kind === "paypal" ? L(lang, "Ya en la tarjeta", "Already on card") : L(lang, "Ya en PayPal", "Already in PayPal")}</span> : null}
                                {r.pairs || (r.via && r.via !== "card") ? <span className="imp-tag is-pair"><Link2 aria-hidden />{L(lang, "PayPal + tarjeta", "PayPal + card")}</span> : null}
                                {r.flow === "xfer" ? <span className="imp-tag is-xfer"><ArrowLeftRight aria-hidden />{L(lang, "Transferencia", "Transfer")}</span> : null}
                                {r.flow === "refund" ? <span className="imp-tag is-refund"><RotateCcw aria-hidden />{L(lang, "Reembolso", "Refund")}</span> : null}
                                {r.flow === "skip" ? <span className="imp-tag is-dup">{L(lang, "Pendiente", "Pending")}</span> : null}
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
                              {r.include && r.reward && r.reward.earned > 0 ? <small className="num" title={rcLabel(r.rc, lang)}>+{money(r.reward.earned)}</small> : null}
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
              <input type="file" multiple accept=".csv,.qfx,.ofx,.qif,.txt,text/csv,application/x-ofx,application/vnd.intu.qfx" hidden onChange={(e) => { void take(e.target.files); e.currentTarget.value = ""; }} />
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
