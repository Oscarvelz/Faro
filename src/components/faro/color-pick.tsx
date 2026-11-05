/**
 * ColorPick (1.3.99): the ONE colour menu Faro shows wherever a colour is chosen (line bubbles, savings pockets,
 * bank accounts, Fijos/Variables categories, Compras categories, the line form).
 * - Quick set: 15 of the 24 old swatches, kept by OKLab ΔE so no two look alike in day (as the washed bubble draws
 *   them), raw, or Tron (as the neon draws them). Removed colours stay valid: data that uses them keeps them, and the
 *   current colour always shows selected (in the "Mis colores" row when it is not a quick one).
 * - Personalizado: a real spectrum (saturation/brightness area + hue bar, pointer events: finger, S-Pen, mouse,
 *   arrow keys) with a HEX field, live preview on a bubble, Cancelar / Guardar. Owns a history entry: Back closes it.
 * - Mis colores: the last 6 custom colours, in the ledger (`myColors`), so they sync and back up; sample mode writes
 *   to its own ledger, so it stays isolated.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Check } from "lucide-react";
import "./color-pick.css";
import { useFaro } from "./provider";
import { FieldTip } from "./ui";
import { Glyph } from "./icons";
import { isTron, tronize } from "@/lib/faro/colors";
import { hexToHsv, hsvToHex, inkOn, parseHex, pushRecent, washForInk } from "@/lib/faro/palette";

/** The quick set (computed with palette.ts dedupe/minGap; see palette.test.ts): ΔE ≥ .07 raw, ≥ .04 washed (was .010), ≥ .08 Tron (was .057). */
export const QUICK = ["#e75e6a", "#ffa289", "#dc7106", "#b28d04", "#79a304", "#8dd28c", "#52d7c1", "#11a6aa", "#079ed9", "#6b89f9", "#bab3fe", "#ac72e3", "#e4a3e9", "#d562af", "#494d54"];

export type Face = "bubble" | "solid";

/** How the current theme draws a colour: Tron lights it; day bubbles wash it under dark ink; solid keeps it. */
export function faceOf(color: string, face: Face = "bubble"): string {
  if (isTron()) return tronize(color);
  return face === "bubble" ? washForInk(parseHex(color) ?? color) : color;
}

/* One back-handler for every open spectrum, registered at import so it runs before any other popstate listener:
   Back closes the top spectrum; a spectrum closed by its own buttons steps back over its entry silently. */
type Hold = Window & { __faroCp?: number; __faroCpSkip?: number };
const layers: Array<() => void> = [];
if (typeof window !== "undefined" && !(window as Hold & { __faroCpGuard?: boolean }).__faroCpGuard) {
  (window as Hold & { __faroCpGuard?: boolean }).__faroCpGuard = true;
  window.addEventListener("popstate", (event) => {
    const hold = window as Hold;
    if ((hold.__faroCpSkip ?? 0) > 0) {
      hold.__faroCpSkip = (hold.__faroCpSkip ?? 1) - 1;
      event.stopImmediatePropagation();
      return;
    }
    const top = layers[layers.length - 1];
    if (!top) return;
    event.stopImmediatePropagation();
    top();
  }, true);
  window.addEventListener("faro-back", (event) => {
    const top = layers[layers.length - 1];
    if (!top || event.defaultPrevented) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    top();
  }, true);
}

/** Pushes one history entry while `open`; Back (or faro-back) runs `close`. Closing in-app steps back over the entry. */
function useLayer(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const hold = window as Hold;
    let popped = false;
    const run = () => { popped = true; closeRef.current(); };
    history.pushState({ ...(history.state ?? {}), faroCp: 1 }, "");
    layers.push(run);
    hold.__faroCp = layers.length;
    return () => {
      const i = layers.indexOf(run);
      if (i >= 0) layers.splice(i, 1);
      hold.__faroCp = layers.length;
      if (!popped) {
        hold.__faroCpSkip = (hold.__faroCpSkip ?? 0) + 1;
        history.back();
      }
    };
  }, [open]);
}

export function ColorPick({ value, onPick, onDraft, glyph, face = "bubble", label }: {
  value: string;
  onPick: (hex: string) => void;
  /** Live colour while the spectrum is open (null when it closes), for a preview outside the picker. */
  onDraft?: (hex: string | null) => void;
  glyph?: string;
  face?: Face;
  label?: string;
}) {
  const { t, session, commit } = useFaro();
  const current = parseHex(value) ?? "";
  const recent = session?.ledger.myColors ?? [];
  const [open, setOpen] = useState(false);
  const mine = useMemo(() => {
    const out: string[] = [];
    if (current && !QUICK.includes(current)) out.push(current);
    for (const c of recent) {
      const h = parseHex(c);
      if (h && !QUICK.includes(h) && !out.includes(h)) out.push(h);
    }
    return out.slice(0, 6);
  }, [current, recent.join(",")]);
  // With no saved colours yet, a current colour outside the quick set (a category default, an old swatch) is "Actual".
  const hasMine = recent.some((c) => { const h = parseHex(c); return !!h && !QUICK.includes(h); });
  const keep = (hex: string) => {
    commit((s) => ({ ...s, myColors: pushRecent(s.myColors, hex) }), "color");
  };
  return (
    <div className="cp">
      <div className="cp-quick" role="radiogroup" aria-label={label ?? t("look.color")}>
        {QUICK.map((c) => (
          <button key={c} type="button" role="radio" className="cp-sw" style={{ ["--sw" as string]: faceOf(c, face), ["--ink" as string]: inkOn(faceOf(c, face)) }} aria-checked={current === c} aria-pressed={current === c} aria-label={c} onClick={() => { setOpen(false); onPick(c); }}>
            {current === c ? <Check aria-hidden /> : null}
          </button>
        ))}
        <button type="button" className="cp-sw is-spectrum" aria-expanded={open} aria-label={t("cp.custom")} title={t("cp.custom")} onClick={() => setOpen((v) => !v)}>
          <i aria-hidden style={{ ["--sw" as string]: current ? faceOf(current, face) : "transparent" }} />
        </button>
      </div>
      {mine.length ? (
        <div className="cp-mine">
          <span className="cp-lab">{hasMine ? t("cp.mine") : t("cp.now")}</span>
          <div className="cp-mine-row" role="radiogroup" aria-label={hasMine ? t("cp.mine") : t("cp.now")}>
            {mine.map((c) => (
              <button key={c} type="button" role="radio" className="cp-sw" style={{ ["--sw" as string]: faceOf(c, face), ["--ink" as string]: inkOn(faceOf(c, face)) }} aria-checked={current === c} aria-pressed={current === c} aria-label={c} onClick={() => { setOpen(false); onPick(c); }}>
                {current === c ? <Check aria-hidden /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {open ? (
        <Spectrum
          start={current || QUICK[9]}
          glyph={glyph}
          face={face}
          onDraft={onDraft}
          onCancel={() => setOpen(false)}
          onSave={(hex) => { setOpen(false); keep(hex); onPick(hex); }}
        />
      ) : null}
    </div>
  );
}

function Spectrum({ start, glyph, face, onDraft, onCancel, onSave }: { start: string; glyph?: string; face: Face; onDraft?: (hex: string | null) => void; onCancel: () => void; onSave: (hex: string) => void }) {
  const { t } = useFaro();
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(start) ?? [220, 0.5, 0.9]);
  const hex = hsvToHex(hsv[0], hsv[1], hsv[2]);
  const [text, setText] = useState(hex.slice(1));
  const typing = useRef(false);
  const draftRef = useRef(onDraft);
  draftRef.current = onDraft;
  useLayer(true, onCancel);
  useEffect(() => { if (!typing.current) setText(hex.slice(1)); draftRef.current?.(hex); }, [hex]);
  useEffect(() => () => draftRef.current?.(null), []);
  const area = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const drag = (kind: "sv" | "hue") => (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = (kind === "sv" ? area : bar).current;
    if (!el) return;
    event.preventDefault();
    typing.current = false;
    el.setPointerCapture?.(event.pointerId);
    const at = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      // The thumb (26px) stays inside the field: its centre runs from 13px to width − 13px.
      const fx = Math.min(1, Math.max(0, (x - r.left - 13) / Math.max(1, r.width - 26)));
      const fy = Math.min(1, Math.max(0, (y - r.top - 13) / Math.max(1, r.height - 26)));
      setHsv((v) => (kind === "sv" ? [v[0], fx, 1 - fy] : [fx * 360, v[1], v[2]]));
    };
    at(event.clientX, event.clientY);
    const move = (e: PointerEvent) => at(e.clientX, e.clientY);
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const keys = (kind: "sv" | "hue") => (event: ReactKeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const k = d[event.key];
    if (!k) return;
    event.preventDefault();
    typing.current = false;
    setHsv((v) => (kind === "sv"
      ? [v[0], Math.min(1, Math.max(0, v[1] + k[0] * step)), Math.min(1, Math.max(0, v[2] + k[1] * step))]
      : [(v[0] + (k[0] || k[1]) * step * 360 + 360) % 360, v[1], v[2]]));
  };
  const shown = faceOf(hex, face);
  return (
    <div className="cp-spec" style={{ ["--hue" as string]: `hsl(${Math.round(hsv[0])} 100% 50%)`, ["--cur" as string]: hex }}>
      <div className="cp-sv" ref={area} role="slider" tabIndex={0} aria-label={t("cp.area")} aria-valuetext={`#${hex.slice(1)}`} onPointerDown={drag("sv")} onKeyDown={keys("sv")}>
        <i className="cp-thumb" style={{ left: `calc(13px + (100% - 26px) * ${hsv[1].toFixed(4)})`, top: `calc(13px + (100% - 26px) * ${(1 - hsv[2]).toFixed(4)})` }} />
      </div>
      <div className="cp-hue" ref={bar} role="slider" tabIndex={0} aria-label={t("cp.hue")} aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsv[0])} onPointerDown={drag("hue")} onKeyDown={keys("hue")}>
        <i className="cp-thumb" style={{ left: `calc(13px + (100% - 26px) * ${(hsv[0] / 360).toFixed(4)})`, background: `hsl(${Math.round(hsv[0])} 100% 50%)` }} />
      </div>
      <div className="cp-row">
        <span className="cp-prev" style={{ ["--sw" as string]: shown, ["--tone" as string]: isTron() ? shown : hex, color: isTron() ? shown : inkOn(shown) }} aria-hidden>
          <Glyph name={glyph && glyph !== "Circle" ? glyph : "Palette"} />
        </span>
        <label className="cp-hex">
          <span aria-hidden>#</span>
          <input
            className="field"
            value={text}
            maxLength={7}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="HEX"
            onFocus={() => { typing.current = true; }}
            onBlur={() => { typing.current = false; setText(hex.slice(1)); }}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9a-fA-F#]/g, "").replace(/#/g, "").slice(0, 6);
              setText(raw);
              const ok = raw.length === 6 || raw.length === 3 ? parseHex(raw) : null;
              const next = ok ? hexToHsv(ok) : null;
              if (next) setHsv(next);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave(hex); } }}
          />
        </label>
        <FieldTip topic="color-propio" />
      </div>
      <div className="ah-actions cp-actions">
        <button type="button" className="btn secondary" onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className="btn" onClick={() => onSave(hex)}>{t("save")}</button>
      </div>
    </div>
  );
}

/** The "Ícono y color" trigger's mark: the chosen colour as a glossy gem with the chosen icon inside, ringed by a thin
 *  spectrum so it reads as "colour" at a glance. Tron draws it as its own bubble (dark core, neon rim, neon icon). */
export function LookGem({ color, glyph }: { color: string; glyph?: string }) {
  const fill = faceOf(parseHex(color) ?? color, "bubble");
  return (
    <i className="look-gem" aria-hidden style={{ ["--sw" as string]: fill, color: isTron() ? fill : inkOn(fill) }}>
      <Glyph name={glyph && glyph !== "Circle" ? glyph : "Palette"} />
    </i>
  );
}
