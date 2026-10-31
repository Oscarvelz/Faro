import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Calculator, ChevronDown, Pencil, X } from "lucide-react";
import { convertMinor, evalExpr, formatMoney, formatRate, parseAmount } from "@/lib/faro/money";
import type { Currency } from "@/lib/faro/types";
import { useFaro } from "./provider";

const KEYS = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "%", "+", "(", ")", "⌫", "C"] as const;
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
  const [from, setFrom] = useState<Currency>("USD");
  const [text, setText] = useState("100");
  const [rateText, setRateText] = useState(settings ? formatRate(settings.rateE4) : "36.6243");
  const [expr, setExpr] = useState("");
  const [calcOn, setCalcOn] = useState(false);
  const [pos, setPos] = useState({ x: 18, y: 96 });
  const [size, setSize] = useState(() => ({
    w: Math.min(300, Math.max(220, window.innerWidth - 28)),
    h: Math.min(460, Math.max(320, window.innerHeight - 140)),
  }));
  const [slips, setSlips] = useState<Slip[]>(() => readSlips());
  const [fxOpen, setFxOpen] = useState(() => localStorage.getItem("faro-fx-open") !== "0");
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
  const drag = (e: ReactPointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...pos };
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - 80, origin.x + ev.clientX - startX)),
        y: Math.max(8, Math.min(window.innerHeight - 80, origin.y + ev.clientY - startY)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const resize = (e: ReactPointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...size };
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const maxW = Math.max(220, window.innerWidth - 12);
      const maxH = Math.max(280, window.innerHeight - 12);
      setSize({
        w: Math.max(220, Math.min(maxW, origin.w + ev.clientX - startX)),
        h: Math.max(280, Math.min(maxH, origin.h + ev.clientY - startY)),
      });
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  return (
    <div className="tool-stack" ref={box}>
      <section className={`card tool-card rate-plate${fxOpen ? "" : " is-shut"}`}>
        <div className="tool-title">
          <button type="button" className="fx-fold" aria-expanded={fxOpen} onClick={() => setFxOpen((open) => !open)}>
            <span className="serif text-xl">{t("rate.label")}</span>
            {fxOpen ? null : <em className="fx-brief num">C${formatRate(settings.rateE4)}</em>}
            <ChevronDown className={fxOpen ? "fold-chev is-open" : "fold-chev"} />
          </button>
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
      <section className="card tool-card tool-convert">
        <div className="tool-title">
          <span className="serif text-xl">{t("convert.title")}</span>
          <button type="button" className={`icon-btn calc-launch${calcOn ? " is-on" : ""}`} aria-pressed={calcOn} aria-label={t("calc.open")} onClick={() => setCalcOn((v) => !v)}>
            <Calculator className="size-4" />
          </button>
        </div>
        <div className="convert-row">
          <label className="label">
            {from === "USD" ? "USD" : "C$"}
            <input
              className="field num"
              inputMode="decimal"
              value={text}
              aria-label={t("convert.title")}
              onChange={(e) => {
                touched.current = true;
                setText(e.target.value);
              }}
            />
          </label>
          <button type="button" className="convert-swap" aria-label={t("convert.swap")} onClick={() => { touched.current = true; setFrom(to); }}>⇄</button>
          <div className="convert-out">
            <em>{to === "USD" ? "USD" : "C$"}</em>
            <strong className="num">{converted === null ? "—" : formatMoney(converted, to, lang)}</strong>
          </div>
        </div>
        <button type="button" className="btn mt-3" onClick={useConverted}>{t("convert.use")}</button>
      </section>
      {calcOn && contained ? (
        box.current?.closest(".tool-sheet") ? createPortal(
          <section className="calc-float calc-pane" role="dialog" aria-label={t("calc.title")}>
            <header className="calc-bar">
              <strong className="serif">{t("calc.title")}</strong>
              <button
                type="button"
                className="slip-save"
                onClick={() => {
                  if (result === null || !expr.trim()) return;
                  remember({ id: `${Date.now()}`, kind: "sum", text: expr, label: `${expr} = ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })}` });
                }}
              >
                {t("slips.save")}
              </button>
              <button type="button" className="calc-x" aria-label={t("close")} onClick={() => setCalcOn(false)}>×</button>
            </header>
            <input className="field num" value={expr} aria-label={t("calc.title")} onChange={(e) => { summed.current = true; setExpr(e.target.value); }} />
            <p className="num convert-result">{result === null ? "—" : result.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <div className="calc-grid">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    summed.current = true;
                    if (k === "C") setExpr("");
                    else if (k === "⌫") setExpr((s) => s.slice(0, -1));
                    else if (k === "%") setExpr((s) => `${s}/100`);
                    else setExpr((s) => s + k);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (result === null) return;
                const ok = insertAmount(result);
                if (!ok) setUi({ notice: t("calc.need") });
              }}
            >
              {t("calc.put")}
            </button>
          </section>,
          box.current.closest(".tool-sheet")!,
        ) : null
      ) : null}
      {calcOn && !contained ? createPortal(
        <section className="calc-float" style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }} role="dialog" aria-label={t("calc.title")}>
          <header className="calc-bar" onPointerDown={drag}>
            <strong className="serif">{t("calc.title")}</strong>
            <button
              type="button"
              className="slip-save"
              onClick={() => {
                if (result === null || !expr.trim()) return;
                remember({ id: `${Date.now()}`, kind: "sum", text: expr, label: `${expr} = ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })}` });
              }}
            >
              {t("slips.save")}
            </button>
            <button type="button" className="calc-x" aria-label={t("close")} onClick={() => setCalcOn(false)}>×</button>
          </header>
          <input className="field num" value={expr} aria-label={t("calc.title")} onChange={(e) => { summed.current = true; setExpr(e.target.value); }} />
          <p className="num convert-result">{result === null ? "—" : result.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          <div className="calc-grid">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  summed.current = true;
                  if (k === "C") setExpr("");
                  else if (k === "⌫") setExpr((s) => s.slice(0, -1));
                  else if (k === "%") setExpr((s) => `${s}/100`);
                  else setExpr((s) => s + k);
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (result === null) return;
              const ok = insertAmount(result);
              if (!ok) setUi({ notice: t("calc.need") });
            }}
          >
            {t("calc.put")}
          </button>
          <i className="calc-resize" onPointerDown={resize} />
        </section>,
        document.body,
      ) : null}
      <section className="card tool-card">
        <h2 className="serif text-xl">{t("slips.title")}</h2>
        {slips.length === 0 ? <p className="mt-2 text-sm text-muted">{t("slips.empty")}</p> : (
          <div className="slip-row">
            {slips.map((slip) => (
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
                    {slip.label}
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