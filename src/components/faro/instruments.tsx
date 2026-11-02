import "./instruments.css";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, Calculator, Check, RotateCcw, SlidersHorizontal, ChevronDown, Delete, Maximize2, Minimize2, Pencil, Trash2, X } from "lucide-react";
import { convertMinor, evalExpr, formatMoney, formatRate, parseAmount } from "@/lib/faro/money";
import type { Currency } from "@/lib/faro/types";
import { useFaro } from "./provider";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";

const SLIPS_KEY = "faro-slips";

type Slip = { id: string; kind: "fx" | "sum"; from?: Currency; text: string; label: string };

function readSlips(): Slip[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SLIPS_KEY) || "[]") as Slip[];
    return Array.isArray(raw) ? raw.slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function Instruments({ pinned = false, contained = false }: { pinned?: boolean; contained?: boolean }) {
  const { t, session, summary, commit, refreshRate, saveRate, insertAmount, ui, setUi, confirm } = useFaro();
  const settings = session?.ledger.settings;
  const box = useRef<HTMLDivElement>(null);
  const [prefs, setPrefs] = useState<CvPrefs>(() => readPrefs());
  const [from, setFrom] = useState<Currency>(() => readPrefs().start);
  const [text, setText] = useState(() => readPrefs().amount);
  const [prefsOn, setPrefsOn] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const savePrefs = (next: CvPrefs) => {
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };
  const [rateText, setRateText] = useState(settings ? formatRate(settings.rateE4) : "36.6243");
  const [expr, setExpr] = useState("");
  const [calcOn, setCalcOn] = useState(false);
  const [slips, setSlips] = useState<Slip[]>(() => readSlips());
  const [fxOpen, setFxOpen] = useState(() => localStorage.getItem("faro-fx-open") !== "0");
  useEffect(() => {
    const onOpen = (e: Event) => { if ((e as CustomEvent).detail === "tools-rate") setFxOpen(true); };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const touched = useRef(false);
  const summed = useRef(false);
  const to: Currency = from === "USD" ? "NIO" : "USD";
  const minor = parseAmount(text);
  const converted = useMemo(() => {
    if (!settings || minor === null) return null;
    return convertMinor(minor, from, to, settings.rateE4);
  }, [minor, from, to, settings]);
  useEffect(() => {
    if (!pinned || !ui.instruments) return;
    box.current?.querySelector(".tool-convert")?.scrollIntoView({ block: "nearest" });
  }, [pinned, ui.instruments]);

  const remember = (slip: Slip) => {
    setSlips((cur) => {
      const next = [slip, ...cur.filter((item) => item.label !== slip.label)].slice(0, 12);
      localStorage.setItem(SLIPS_KEY, JSON.stringify(next));
      return next;
    });
  };
  const writeSlips = (next: Slip[]) => {
    localStorage.setItem(SLIPS_KEY, JSON.stringify(next));
    setSlips(next);
  };

  useEffect(() => {
    if (!touched.current || converted === null || !text.trim() || !settings) return;
    const label = `${text} ${from === "USD" ? "USD" : "C$"} → ${formatMoney(converted, to, settings.lang)}`;
    const handle = window.setTimeout(() => remember({ id: `${Date.now()}`, kind: "fx", from, text, label }), 700);
    return () => window.clearTimeout(handle);
  }, [text, from, converted, to, settings]);

  useEffect(() => {
    if (!summed.current) return;
    const result = evalExpr(expr);
    if (result === null || !/[+*/-]/.test(expr)) return;
    const label = `${expr} = ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const handle = window.setTimeout(() => remember({ id: `${Date.now()}`, kind: "sum", text: expr, label }), 700);
    return () => window.clearTimeout(handle);
  }, [expr]);

  useEffect(() => {
    localStorage.setItem("faro-fx-open", fxOpen ? "1" : "0");
  }, [fxOpen]);

  if (!settings || !summary) return null;
  const result = evalExpr(expr);
  const lang = settings.lang;
  const useConverted = () => {
    if (converted === null) return;
    insertAmount(converted / 100);
  };
  const saveEdit = (slip: Slip) => {
    const nextText = editText.trim();
    if (!nextText) {
      setEditId(null);
      return;
    }
    let label = slip.label;
    if (slip.kind === "sum") {
      const value = evalExpr(nextText);
      if (value === null) return;
      label = `${nextText} = ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else if (slip.from) {
      const amount = parseAmount(nextText);
      if (amount === null) return;
      const dest: Currency = slip.from === "USD" ? "NIO" : "USD";
      label = `${nextText} ${slip.from === "USD" ? "USD" : "C$"} → ${formatMoney(convertMinor(amount, slip.from, dest, settings.rateE4), dest, lang)}`;
    }
    writeSlips(slips.map((item) => (item.id === slip.id ? { ...item, text: nextText, label } : item)));
    setEditId(null);
  };
  return (
    <div className="tool-stack" ref={box}>
      <section className={`card tool-card rate-plate${fxOpen ? "" : " is-shut"}`} data-anchor="tools-rate">
        <div className="tool-title">
          <div role="button" tabIndex={0} className="fx-fold" aria-expanded={fxOpen} onClick={() => setFxOpen((open) => !open)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFxOpen((open) => !open); } }}>
            <span className="serif text-xl lab-head">{t("rate.label")}<Hint topic="tasa" /></span>
            {fxOpen ? null : <em className="fx-brief num">C${formatRate(settings.rateE4)}</em>}
            <ChevronDown className={fxOpen ? "fold-chev is-open" : "fold-chev"} />
          </div>
        </div>
        {fxOpen ? (
          <>
            <div className="rate-head">
              <p className="rate-figure num">C${formatRate(settings.rateE4)}</p>
              <p className="rate-stamp">
                <span>{settings.rateSource}</span>
                <em>{t("rate.asof")} {settings.rateAsOf}</em>
              </p>
            </div>
            <p className="rate-note">{t("rate.note")}</p>
            <div className="rate-edit">
              <input className="field num" inputMode="decimal" value={rateText} onChange={(e) => setRateText(e.target.value)} aria-label={t("rate.manual")} />
              <button type="button" className="btn secondary" onClick={() => saveRate(rateText)}>{t("rate.manual")}</button>
            </div>
            <div className="rate-actions">
              <button type="button" className="btn secondary" onClick={refreshRate}>{t("rate.update")}</button>
              <button
                type="button"
                className="btn"
                aria-pressed={settings.display === "USD"}
                onClick={() => commit((s) => ({ ...s, settings: { ...s.settings, display: s.settings.display === "NIO" ? "USD" : "NIO" } }), "Vista de moneda")}
              >
                {settings.display === "NIO" ? t("currency.viewUsd") : t("currency.viewNio")}
              </button>
            </div>
          </>
        ) : null}
      </section>
      <section className="card tool-card tool-convert cv" data-anchor="tools-convert">
        <div className="tool-title">
          <span className="serif text-xl lab-head">{t("convert.title")}<Hint topic="convertidor" /></span>
          <span className="cv-tools">
          <button type="button" className={`icon-btn cv-gear${prefsOn ? " is-on" : ""}`} aria-pressed={prefsOn} aria-expanded={prefsOn} aria-label={lang === "en" ? "Exchange settings" : "Ajustes del cambio"} onClick={() => setPrefsOn((v) => !v)}>
            <SlidersHorizontal className="size-4" />
          </button>
          <button type="button" data-anchor="tools-calc" className={`icon-btn calc-launch${calcOn ? " is-on" : ""}`} aria-pressed={calcOn} aria-label={t("calc.open")} onClick={() => setCalcOn((v) => !v)}>
            <Calculator className="size-4" />
          </button>
          </span>
        </div>
        {prefsOn ? <CvSettings prefs={prefs} lang={lang} onChange={savePrefs} onDone={() => setPrefsOn(false)} /> : null}
        <div className="cv-pair">
          <label className={`cv-row is-from cur-${from}`}>
            <span className="cv-cur"><b>{from === "USD" ? "US$" : "C$"}</b><small>{from === "USD" ? (lang === "en" ? "Dollars" : "Dólares") : (lang === "en" ? "Córdobas" : "Córdobas")}</small></span>
            <input
              className="cv-in num"
              inputMode="decimal"
              enterKeyHint="done"
              value={text}
              placeholder="0"
              aria-label={lang === "en" ? `Amount in ${from === "USD" ? "dollars" : "córdobas"}` : `Monto en ${from === "USD" ? "dólares" : "córdobas"}`}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                touched.current = true;
                setText(e.target.value);
              }}
            />
          </label>
          <button type="button" className="cv-swap" aria-label={t("convert.swap")} onClick={() => { touched.current = true; setFrom(to); }}>
            <ArrowUpDown className="size-4" />
          </button>
          <div className={`cv-row is-to cur-${to}`} aria-live="polite">
            <span className="cv-cur"><b>{to === "USD" ? "US$" : "C$"}</b><small>{to === "USD" ? (lang === "en" ? "Dollars" : "Dólares") : "Córdobas"}</small></span>
            <strong className="cv-out num">{converted === null ? "—" : formatMoney(converted, to, lang).replace(/^-?(US)?C?\$/, (m) => (m.startsWith("-") ? "-" : ""))}</strong>
          </div>
        </div>
        <p className="cv-rate num">1 US$ = C${formatRate(settings.rateE4)}</p>
        <div className="cv-chips" role="group" aria-label={lang === "en" ? "Quick amounts" : "Montos rápidos"}>
          {(from === "USD" ? prefs.usd : prefs.nio).map((v) => (
            <button key={v} type="button" aria-pressed={text === v} onClick={() => { touched.current = true; setText(v); }}>
              {Number(v).toLocaleString(lang === "en" ? "en-US" : "es-NI")}
            </button>
          ))}
        </div>
        <button type="button" className="btn cv-use" onClick={useConverted} disabled={converted === null}>{t("convert.use")}</button>
      </section>
      {calcOn ? (
        <CalcPanel
          host={contained ? (box.current?.closest(".tool-sheet") as HTMLElement | null) : null}
          expr={expr}
          setExpr={(next) => { summed.current = true; setExpr(next); }}
          onSave={() => {
            if (result === null || !expr.trim()) return;
            remember({ id: `${Date.now()}`, kind: "sum", text: expr, label: `${expr} = ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })}` });
          }}
          onPut={() => {
            if (result === null) return;
            const ok = insertAmount(result);
            if (!ok) setUi({ notice: t("calc.need") });
          }}
          onClose={() => setCalcOn(false)}
        />
      ) : null}
      <section className="card tool-card" data-anchor="tools-slips">
        <div className="slip-head">
          <h2 className="serif text-xl lab-head">{t("slips.title")}<Hint topic="guardados" /></h2>
          {slips.length > 0 ? (
            <button
              type="button"
              className={`slip-pick${picking ? " is-on" : ""}`}
              aria-pressed={picking}
              onClick={() => { setPicking((v) => !v); setPicked(new Set()); setEditId(null); }}
            >
              {picking ? (lang === "en" ? "Cancel" : "Cancelar") : (lang === "en" ? "Select" : "Seleccionar")}
            </button>
          ) : null}
        </div>
        {picking && slips.length > 0 ? (
          <div className="slip-bulk">
            <label className="unfold-all slip-all">
              <input
                type="checkbox"
                checked={picked.size === slips.length}
                ref={(el) => { if (el) el.indeterminate = picked.size > 0 && picked.size < slips.length; }}
                onChange={() => setPicked(picked.size === slips.length ? new Set() : new Set(slips.map((x) => x.id)))}
              />
              <span>{lang === "en" ? "All" : "Todos"}</span>
            </label>
            <button
              type="button"
              className="slip-kill"
              disabled={picked.size === 0}
              onClick={() => {
                const n = picked.size;
                const all = n === slips.length;
                const en = lang === "en";
                confirm({
                  title: all ? (en ? "Delete all saved?" : "¿Borrar todos los guardados?") : (en ? `Delete ${n} saved?` : `¿Borrar ${n} guardado${n === 1 ? "" : "s"}?`),
                  body: slips.filter((x) => picked.has(x.id)).map((x) => (x.kind === "sum" ? pretty(x.label) : x.label)).slice(0, 4).join("\n") + (n > 4 ? (en ? `\n…and ${n - 4} more` : `\n…y ${n - 4} más`) : ""),
                  danger: true,
                  yes: all ? (en ? "Delete all" : "Borrar todos") : (en ? `Delete ${n}` : `Borrar ${n}`),
                  run: () => {
                    writeSlips(slips.filter((x) => !picked.has(x.id)));
                    setPicked(new Set());
                    setPicking(false);
                  },
                });
              }}
            >
              <Trash2 className="size-4" />
              {lang === "en" ? `Delete${picked.size ? ` (${picked.size})` : ""}` : `Borrar${picked.size ? ` (${picked.size})` : ""}`}
            </button>
          </div>
        ) : null}
        {slips.length === 0 ? <p className="mt-2 text-sm text-muted">{t("slips.empty")}</p> : (
          <div className={`slip-row${picking ? " is-picking" : ""}`}>
            {slips.map((slip) => picking ? (
              <label key={slip.id} className={`slip-item slip-choice${picked.has(slip.id) ? " is-picked" : ""}`}>
                <input
                  type="checkbox"
                  className="slip-check"
                  checked={picked.has(slip.id)}
                  onChange={() => setPicked((cur) => { const next = new Set(cur); if (next.has(slip.id)) next.delete(slip.id); else next.add(slip.id); return next; })}
                />
                <span className="slip-btn">{slip.kind === "sum" ? pretty(slip.label) : slip.label}</span>
              </label>
            ) : (
              <div key={slip.id} className="slip-item">
                {editId === slip.id ? (
                  <input
                    className="slip-edit"
                    value={editText}
                    aria-label={t("edit")}
                    autoFocus
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(slip);
                      if (e.key === "Escape") setEditId(null);
                    }}
                    onBlur={() => saveEdit(slip)}
                  />
                ) : (
                  <button
                    type="button"
                    className="slip-btn"
                    onClick={() => {
                      if (slip.kind === "fx" && slip.from) {
                        setFrom(slip.from);
                        setText(slip.text);
                        setFxOpen(true);
                        return;
                      }
                      setExpr(slip.text);
                      setCalcOn(true);
                    }}
                  >
                    {slip.kind === "sum" ? pretty(slip.label) : slip.label}
                  </button>
                )}
                <button
                  type="button"
                  className="slip-mini"
                  aria-label={t("edit")}
                  onClick={() => {
                    setEditId(slip.id);
                    setEditText(slip.text);
                  }}
                >
                  <Pencil />
                </button>
                <button
                  type="button"
                  className="slip-mini"
                  aria-label={t("delete")}
                  onClick={() => confirm({ title: t("delete"), body: slip.label, danger: true, yes: t("delete"), run: () => writeSlips(slips.filter((item) => item.id !== slip.id)) })}
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
/* ---------- Exchange settings: only for the Cambio box. ---------- */

const PREFS_KEY = "faro-cv-prefs";
const SLOTS = 6;
type CvPrefs = { usd: string[]; nio: string[]; start: Currency; amount: string };
const CV_DEFAULT: CvPrefs = { usd: ["10", "20", "50", "100", "500"], nio: ["100", "500", "1000", "2000", "5000"], start: "USD", amount: "100" };
const cleanList = (list: unknown, fallback: string[]) => {
  if (!Array.isArray(list)) return fallback;
  const out = list.map((v) => String(v).trim().replace(/,/g, "")).filter((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0);
  return [...new Set(out)].slice(0, SLOTS);
};
function readPrefs(): CvPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "null") as Partial<CvPrefs> | null;
    if (!raw) return CV_DEFAULT;
    return {
      usd: cleanList(raw.usd, CV_DEFAULT.usd),
      nio: cleanList(raw.nio, CV_DEFAULT.nio),
      start: raw.start === "NIO" ? "NIO" : "USD",
      amount: typeof raw.amount === "string" && raw.amount.trim() ? raw.amount : CV_DEFAULT.amount,
    };
  } catch {
    return CV_DEFAULT;
  }
}

function CvSettings({ prefs, lang, onChange, onDone }: { prefs: CvPrefs; lang: string; onChange: (p: CvPrefs) => void; onDone: () => void }) {
  useLayer(true, onDone);
  const en = lang === "en";
  const [usd, setUsd] = useState(() => [...prefs.usd, ...Array(SLOTS).fill("")].slice(0, SLOTS));
  const [nio, setNio] = useState(() => [...prefs.nio, ...Array(SLOTS).fill("")].slice(0, SLOTS));
  const [start, setStart] = useState<Currency>(prefs.start);
  const [amount, setAmount] = useState(prefs.amount);
  const push = (next: Partial<{ usd: string[]; nio: string[]; start: Currency; amount: string }>) => {
    const u = next.usd ?? usd;
    const n = next.nio ?? nio;
    onChange({ usd: cleanList(u, []), nio: cleanList(n, []), start: next.start ?? start, amount: (next.amount ?? amount).trim() || "0" });
  };
  const row = (cur: "usd" | "nio", list: string[], set: (l: string[]) => void) => (
    <div className="cvs-group">
      <p className="cvs-label">
        <b>{cur === "usd" ? "US$" : "C$"}</b>
        {en ? (cur === "usd" ? "Quick amounts in dollars" : "Quick amounts in córdobas") : (cur === "usd" ? "Montos rápidos en dólares" : "Montos rápidos en córdobas")}
      </p>
      <div className="cvs-slots">
        {list.map((v, i) => (
          <input
            key={i}
            className="cvs-slot num"
            inputMode="decimal"
            value={v}
            placeholder="+"
            aria-label={`${en ? "Amount" : "Monto"} ${i + 1}`}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const next = list.slice();
              next[i] = e.target.value.replace(/[^\d.,]/g, "").slice(0, 9);
              set(next);
              push(cur === "usd" ? { usd: next } : { nio: next });
            }}
          />
        ))}
      </div>
    </div>
  );
  return (
    <div className="cvs" role="group" aria-label={en ? "Exchange settings" : "Ajustes del cambio"}>
      <p className="cvs-intro">{en ? "Choose the amounts you use most. Leave a box empty to hide it." : "Elige los montos que más usas. Deja una casilla vacía para quitarla."} <Hint topic="cambio-ajustes" className="is-inline" /></p>
      {row("usd", usd, setUsd)}
      {row("nio", nio, setNio)}
      <div className="cvs-group">
        <p className="cvs-label">{en ? "When it opens" : "Al abrir"}</p>
        <div className="cvs-start">
          <div className="cvs-seg" role="radiogroup">
            {(["USD", "NIO"] as Currency[]).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={start === c} className={start === c ? "is-on" : undefined} onClick={() => { setStart(c); push({ start: c }); }}>
                {c === "USD" ? (en ? "From dollars" : "Desde dólares") : (en ? "From córdobas" : "Desde córdobas")}
              </button>
            ))}
          </div>
          <label className="cvs-amount">
            <span>{en ? "Amount" : "Monto"}</span>
            <input className="cvs-slot num" inputMode="decimal" value={amount} onFocus={(e) => e.currentTarget.select()} onChange={(e) => { const v = e.target.value.replace(/[^\d.,]/g, "").slice(0, 9); setAmount(v); push({ amount: v }); }} />
          </label>
        </div>
      </div>
      <div className="cvs-foot">
        <button
          type="button"
          className="cvs-reset"
          onClick={() => {
            const pad = (l: string[]) => [...l, ...Array(SLOTS).fill("")].slice(0, SLOTS);
            setUsd(pad(CV_DEFAULT.usd)); setNio(pad(CV_DEFAULT.nio)); setStart(CV_DEFAULT.start); setAmount(CV_DEFAULT.amount);
            onChange(CV_DEFAULT);
          }}
        >
          <RotateCcw className="size-3.5" /> {en ? "Restore" : "Restaurar"}
        </button>
        <button type="button" className="btn cvs-done" onClick={onDone}><Check className="size-4" /> {en ? "Done" : "Listo"}</button>
      </div>
    </div>
  );
}

/* ---------- Calculator: a floating panel you can drag, resize from any corner, or blow up to fill. ---------- */

type Key = { k: string; label?: string; kind?: "op" | "fn" | "eq" };
const PAD: Key[] = [
  { k: "C", kind: "fn" }, { k: "⌫", kind: "fn" }, { k: "%", kind: "fn" }, { k: "/", label: "÷", kind: "op" },
  { k: "7" }, { k: "8" }, { k: "9" }, { k: "*", label: "×", kind: "op" },
  { k: "4" }, { k: "5" }, { k: "6" }, { k: "-", label: "−", kind: "op" },
  { k: "1" }, { k: "2" }, { k: "3" }, { k: "+", kind: "op" },
  { k: "()", label: "( )", kind: "fn" }, { k: "0" }, { k: "." }, { k: "=", kind: "eq" },
];
const GEO_KEY = "faro-calc-geo";
const MIN_W = 232;
const MIN_H = 330;
type Geo = { x: number; y: number; w: number; h: number };
type Dir = "br" | "bl" | "tr" | "tl";

const pretty = (s: string) => s.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
const plain = (s: string) => s.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/[xX]/g, "*");
const show = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 6 });

function readGeo(): Geo | null {
  try {
    const g = JSON.parse(localStorage.getItem(GEO_KEY) || "null") as Geo | null;
    return g && [g.x, g.y, g.w, g.h].every((v) => Number.isFinite(v)) ? g : null;
  } catch {
    return null;
  }
}

function CalcPanel({ host, expr, setExpr, onSave, onPut, onClose }: {
  host: HTMLElement | null;
  expr: string;
  setExpr: (next: string) => void;
  onSave: () => void;
  onPut: () => void;
  onClose: () => void;
}) {
  const { t, lang } = useFaro();
  const en = lang === "en";
  const panel = useRef<HTMLElement>(null);
  const [big, setBig] = useState(false);
  const [flash, setFlash] = useState(false);
  const bounds = () => {
    if (host) { const r = host.getBoundingClientRect(); return { w: r.width, h: r.height }; }
    return { w: window.innerWidth, h: window.innerHeight };
  };
  const fit = (g: Geo): Geo => {
    const b = bounds();
    const w = Math.max(MIN_W, Math.min(b.w - 16, g.w));
    const h = Math.max(MIN_H, Math.min(b.h - 16, g.h));
    return { w, h, x: Math.max(8, Math.min(b.w - w - 8, g.x)), y: Math.max(8, Math.min(b.h - h - 8, g.y)) };
  };
  const [geo, setGeo] = useState<Geo>(() => {
    const b = bounds();
    const saved = readGeo();
    if (saved) return fit(saved);
    const w = Math.min(360, b.w - 24);
    const h = Math.min(540, Math.max(MIN_H, b.h - 160));
    return fit({ w, h, x: (b.w - w) / 2, y: Math.max(8, Math.min(96, b.h - h - 8)) });
  });
  const geoRef = useRef(geo);
  geoRef.current = geo;
  useEffect(() => { localStorage.setItem(GEO_KEY, JSON.stringify(geo)); }, [geo]);
  // Keep it on screen when the window, the split, or the phone's rotation changes.
  useLayoutEffect(() => {
    const again = () => setGeo((g) => fit(g));
    again();
    const ro = new ResizeObserver(again);
    if (host) ro.observe(host);
    window.addEventListener("resize", again);
    return () => { ro.disconnect(); window.removeEventListener("resize", again); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  const result = evalExpr(plain(expr));
  const hasOp = /[+*/-]/.test(expr.replace(/^-/, ""));
  const press = (k: string) => {
    if (k === "C") return setExpr("");
    if (k === "⌫") return setExpr(expr.slice(0, -1));
    if (k === "%") return setExpr(`${expr}/100`);
    if (k === "=") {
      if (result === null) return;
      setExpr(String(Math.round(result * 1e6) / 1e6));
      setFlash(true);
      window.setTimeout(() => setFlash(false), 380);
      return;
    }
    if (k === "()") {
      const open = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
      const last = expr.slice(-1);
      return setExpr(expr + (open > 0 && /[0-9.)]/.test(last) ? ")" : "("));
    }
    if (/[+*/]/.test(k) && /[+*/-]$/.test(expr)) return setExpr(expr.slice(0, -1) + k);
    setExpr(expr + k);
  };
  const pressRef = useRef(press);
  pressRef.current = press;
  // Typing works too: digits, + - * / ( ) . %, Enter for =, Backspace, Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && !panel.current?.contains(el) && (el.matches("input, textarea, select") || el.isContentEditable)) return;
      if (el?.classList.contains("calc-expr")) {
        if (e.key === "Enter") { e.preventDefault(); pressRef.current("="); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key === "Enter" ? "=" : e.key === "Backspace" ? "⌫" : e.key === "Delete" ? "C" : e.key === "x" ? "*" : e.key;
      if (e.key === "Escape") { onClose(); return; }
      if (/^[0-9+\-*/().%=⌫C]$/.test(k) || k === "⌫") {
        e.preventDefault();
        if (k === "(" || k === ")") setExpr(expr + k);
        else pressRef.current(k);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expr, onClose, setExpr]);

  const track = (e: ReactPointerEvent<HTMLElement>, apply: (dx: number, dy: number, g: Geo) => Geo) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    const sx = e.clientX;
    const sy = e.clientY;
    const origin = { ...geoRef.current };
    el.setPointerCapture(e.pointerId);
    panel.current?.classList.add("is-moving");
    const move = (ev: PointerEvent) => setGeo(fit(apply(ev.clientX - sx, ev.clientY - sy, origin)));
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      panel.current?.classList.remove("is-moving");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const drag = (e: ReactPointerEvent<HTMLElement>) => {
    if (big || (e.target as HTMLElement).closest("button")) return;
    track(e, (dx, dy, g) => ({ ...g, x: g.x + dx, y: g.y + dy }));
  };
  const resize = (dir: Dir) => (e: ReactPointerEvent<HTMLElement>) => {
    if (big) return;
    track(e, (dx, dy, g) => {
      const b = bounds();
      let { x, y, w, h } = g;
      if (dir.includes("r")) w = Math.min(b.w - 8 - x, g.w + dx);
      if (dir.includes("b")) h = Math.min(b.h - 8 - y, g.h + dy);
      if (dir.includes("l")) { const nw = Math.max(MIN_W, Math.min(g.x + g.w - 8, g.w - dx)); x = g.x + g.w - nw; w = nw; }
      if (dir.includes("t")) { const nh = Math.max(MIN_H, Math.min(g.y + g.h - 8, g.h - dy)); y = g.y + g.h - nh; h = nh; }
      return { x, y, w: Math.max(MIN_W, w), h: Math.max(MIN_H, h) };
    });
  };

  const style = big
    ? { left: 8, top: 8, right: 8, bottom: 8 }
    : { left: geo.x, top: geo.y, width: geo.w, height: geo.h };
  const node = (
    <section
      ref={panel}
      className={`calc2${host ? " is-in" : ""}${big ? " is-big" : ""}`}
      style={style}
      role="dialog"
      aria-label={t("calc.title")}
    >
      <header className="calc2-bar" onPointerDown={drag} onDoubleClick={() => setBig((v) => !v)}>
        <i className="calc2-grab" aria-hidden />
        <strong className="serif">{t("calc.title")}</strong>
        <button type="button" className="calc2-chip" onClick={onSave} disabled={result === null || !expr.trim()}>{t("slips.save")}</button>
        <button type="button" className="calc2-icon" aria-label={big ? (en ? "Make smaller" : "Hacer más pequeña") : (en ? "Fill the screen" : "Llenar la pantalla")} onClick={() => setBig((v) => !v)}>
          {big ? <Minimize2 /> : <Maximize2 />}
        </button>
        <button type="button" className="calc2-icon" aria-label={t("close")} onClick={onClose}><X /></button>
      </header>
      <div className={`calc2-screen${flash ? " is-flash" : ""}`}>
        <input
          className="calc2-expr calc-expr num"
          value={pretty(expr)}
          placeholder="0"
          inputMode="none"
          aria-label={en ? "Operation" : "Operación"}
          onChange={(e) => setExpr(plain(e.target.value))}
        />
        <output className="calc2-result num" aria-live="polite">
          {result === null ? (expr.trim() ? "…" : "0") : hasOp ? `= ${show(result)}` : show(result)}
        </output>
      </div>
      <div className="calc2-pad">
        {PAD.map((key) => (
          <button
            key={key.k}
            type="button"
            className={key.kind ? `is-${key.kind}` : undefined}
            aria-label={key.k === "⌫" ? (en ? "Delete" : "Borrar") : key.k === "C" ? (en ? "Clear" : "Limpiar") : undefined}
            onClick={() => press(key.k)}
          >
            {key.k === "⌫" ? <Delete /> : key.label ?? key.k}
          </button>
        ))}
      </div>
      <button type="button" className="btn calc2-put" onClick={onPut} disabled={result === null}>
        {t("calc.put")}{result !== null ? <span className="num"> · {show(Math.round(result * 100) / 100)}</span> : null}
      </button>
      {big ? null : (["tl", "tr", "bl", "br"] as Dir[]).map((d) => (
        <i key={d} className={`calc2-size is-${d}`} onPointerDown={resize(d)} aria-hidden />
      ))}
    </section>
  );
  return createPortal(node, host ?? document.body);
}
