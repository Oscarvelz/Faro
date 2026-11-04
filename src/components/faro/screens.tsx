import { PeopleAdviceCard, PeopleBox, PeopleStudy } from "./people";
import { BankSettings, ImportDoor, ImportRow, RewardsAdvice, RewardsStudy, hasRewards } from "./bank-dock";
import { peopleOf } from "@/lib/faro/people";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type CSSProperties } from "react";
import { AgendaCard, CoachHero, HealthCard, MoversCard, PaceCard, PulseCard, RuleCard, WaffleCard, useCoach } from "@/components/faro/panorama";
import { CushionCard, KeyNumbers, LimitsCard, TimeCard } from "@/components/faro/study2";
import { LongVisual, MediumVisual, MonthTower, PlanRoute, ShortVisual, adviceTeaser } from "@/components/faro/advisor2";
import { useMasonry, usePinchZoom } from "@/components/faro/pinch";
import { Languages, FolderTree, SlidersHorizontal, Keyboard, Hand, ShieldCheck, UserRound, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BookOpen, CalendarDays, ChevronRight, Check, ChevronDown, ChevronUp, CreditCard, Eraser, Eye, EyeOff, Filter, GripVertical, Image as ImageIcon, Landmark, ListChecks, Minus, Palette, Pencil, Pin, Plus, Search, Settings as Gear, Trash2, X } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { applyTemplate, displayName, moveNamed, templateBlurb } from "@/lib/faro/defaults";
import { cashSankey, studyBoard, spanPoints, compareSpans } from "@/lib/faro/engine";
import { projectLeft, readAdvisor, type FigurePart, type ScenarioId } from "@/lib/faro/advisor";
import { readVaultPref, writeVaultPref } from "@/lib/faro/awake";
import { auditLabel, shortcutLabel } from "@/lib/faro/i18n";
import { PALETTE, SAVINGS_PURPLE, baseFor, categoryColor, chosenTone, colorFor, isTron, tronize } from "@/lib/faro/colors";
import { shrinkIcon } from "@/lib/faro/icon";
import { formatRate, convertMinor, parseAmount, payDates, productHref, uid } from "@/lib/faro/money";
import { deleteLine, upsertLine } from "@/lib/faro/reducer";
import type { Category, Currency, Line, LineKind, SectionId, TemplateId, ThemeId } from "@/lib/faro/types";
import { DAY_THEMES, DEFAULT_SHORTCUTS, NIGHT_THEMES, SHORTCUT_ACTIONS } from "@/lib/faro/types";
import { BrandMark, Glyph, ICON_NAMES, LOOK_ICONS } from "./icons";
import { StudyCharts, StatBreaks, StatFold, StatFoldProvider, StudyStack } from "./charts";
import { LineForm, QuickAdd, DayField, ThemeSelect } from "./line-form";
import { useFaro } from "./provider";
import type { BackupInfo } from "@/spa/vault";
import { Explain, FieldTip, Modal } from "./ui";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";
import { DeboSide, DeboSum, LoanCard, LoanForm, LoansStudy } from "./loans";
import { loanFigures, loanTotals, todayIso } from "@/lib/faro/loans";

const STORE_TINT: Record<string, string> = {
  temu: "#fb7701",
  shein: "#d5d5d5",
  ebay: "#4c9dff",
  aliexpress: "#e62e04",
  amazon: "#ff9900",
};

function moneyRow(line: Line, view: string, record: string, display: string) {
  const converted = line.currency !== display;
  return (
    <div className="line-amt">
      <div className="num">{view}</div>
      {converted ? <div className="faint num text-xs">{record}</div> : null}
    </div>
  );
}

// A short last token ("Salario 1", "Fase II") never sits alone on its own line: it is glued to the word before it
// with a no-break space (same width as a space, so labels that fit on one line render exactly as before).
/** Spending reads "−C$100"; a subtraction (negative spending, e.g. applied from Guardados) reads "+C$100". */
function outView(line: Line, view: (line: Line) => string): string {
  if (line.kind.startsWith("income") || line.amountMinor === 0) return view(line);
  return line.amountMinor < 0 ? `+${view({ ...line, amountMinor: -line.amountMinor })}` : `−${view(line)}`;
}

function keepTail(label: string, glueShort = false) {
  const tail = label.replace(/ (\S{1,3})$/, "\u00a0$1");
  // Libros rows only: one-letter words ("o", "y") also travel with the word after them ("Bono / o pagos", never
  // "Bono o / pagos"). Not used on the Home boards, where it would re-wrap labels that already wrap at normal size.
  return glueShort ? tail.replace(/(^|\s)(\S) /g, "$1$2\u00a0") : tail;
}

function sectionFor(kind: LineKind): SectionId {
  if (kind.startsWith("income")) return "income";
  if (kind === "expense-fixed") return "fixed";
  if (kind === "expense-variable") return "variable";
  if (kind === "purchase") return "shops";
  return "subs";
}

function washForInk(hex?: string) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "#d7e6dc";
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  for (let step = 0; step < 8; step += 1) {
    if ((r * 299 + g * 587 + b * 114) / 1000 >= 186) break;
    r = Math.round(r + (255 - r) * 0.2);
    g = Math.round(g + (255 - g) * 0.2);
    b = Math.round(b + (255 - b) * 0.2);
  }
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function revealEditor(node: HTMLElement | null) {
  if (!node) return;
  const run = () => {
    const chrome = document.querySelector(".top-chrome")?.getBoundingClientRect().height ?? 72;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    let parent: HTMLElement | null = node.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 8) {
        const top = node.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop - chrome - 8;
        parent.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        return;
      }
      parent = parent.parentElement;
    }
    const top = node.getBoundingClientRect().top + window.scrollY - chrome - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}

function lineGlyph(line: Line, structure?: { categories: { id: string; icon: string; subs: { id: string; icon: string }[] }[]; purchases: { id: string; icon: string }[] }) {
  if (line.icon && line.icon !== "Circle") return line.icon;
  const cat = structure?.categories.find((item) => item.id === line.categoryId);
  const sub = cat?.subs.find((item) => item.id === line.subId);
  if (sub?.icon && sub.icon !== "Circle") return vaultGlyph(sub.icon) ?? sub.icon;
  if (cat?.icon && cat.icon !== "Circle") return cat.icon;
  const purchase = structure?.purchases.find((item) => item.id === line.categoryId);
  if (purchase?.icon && purchase.icon !== "Circle") return purchase.icon;
  if (line.kind === "purchase") return "ShoppingBag";
  if (line.kind === "subscription") return "RefreshCw";
  return "Circle";
}

/* Picker display helpers: the palette swatch nearest a stored colour (OKLab), shown as selected until the user picks. */
function hexLab(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * q];
}
function nearestSwatch(color: string): string {
  const hit = PALETTE.find((swatch) => swatch.toLowerCase() === (color || "").toLowerCase());
  if (hit) return hit;
  const want = hexLab(color || "");
  if (!want) return "";
  let best = "", bestD = Infinity;
  for (const swatch of PALETTE) {
    const lab = hexLab(swatch);
    if (!lab) continue;
    const d = (lab[0] - want[0]) ** 2 + (lab[1] - want[1]) ** 2 + (lab[2] - want[2]) ** 2;
    if (d < bestD) { bestD = d; best = swatch; }
  }
  return best;
}
/* Account (vault) rows keep their "vault:" marker when given a picker glyph: "vault:g:<Glyph>". */
function vaultGlyph(icon: string): string | null {
  return icon.startsWith("vault:g:") ? icon.slice(8) : null;
}

function BookLook({ glyph, color, onGlyph, onColor, pinned, startOpen, onClose, bubbles }: { glyph: string; color: string; onGlyph: (value: string) => void; onColor: (value: string) => void; pinned?: boolean; startOpen?: boolean; onClose?: () => void; bubbles?: boolean }) {
  const { t } = useFaro();
  const [open, setOpen] = useState(!!pinned || !!startOpen);
  const ref = useRef<HTMLDivElement>(null);
  const iconsRef = useRef<HTMLDivElement>(null);
  // Ahorros' official purple sits outside the grid: ring nothing rather than a neighbouring violet the line never had.
  const shown = color.trim().toLowerCase() === SAVINGS_PURPLE ? "" : nearestSwatch(color);
  useLayoutEffect(() => {
    if (!open) return;
    const sc = iconsRef.current;
    const sel = sc?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!sc || !sel) return;
    const box = sc.getBoundingClientRect(), hit = sel.getBoundingClientRect();
    /* Put the selected icon's row third from the top (about the middle of the 4.5 visible rows), snapped to a row
       boundary so the top row is never cut. */
    const pad = parseFloat(getComputedStyle(sc).paddingTop) || 0;
    const step = hit.height + (parseFloat(getComputedStyle(sc).rowGap) || 0);
    const rowTop = sc.scrollTop + hit.top - box.top - pad;
    sc.scrollTop = Math.max(0, rowTop - 2 * step);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const hold = window as Window & { __faroLook?: number; __faroSkipPop?: number };
    hold.__faroLook = (hold.__faroLook ?? 0) + 1;
    const scroller = document.scrollingElement;
    const y = window.scrollY;
    const box = scroller instanceof HTMLElement ? scroller.scrollTop : y;
    const restore = () => {
      window.scrollTo(0, y);
      if (scroller instanceof HTMLElement) scroller.scrollTop = box;
    };
    const prev = history.scrollRestoration;
    try { history.scrollRestoration = "manual"; } catch { /* ignore */ }
    history.pushState({ faroLook: 1 }, "");
    restore();
    const frames = [0, 40, 120].map((ms) => window.setTimeout(restore, ms));
    let fromPop = false;
    const shut = (fromHistory: boolean) => {
      fromPop = fromHistory;
      setOpen(false);
      onClose?.();
    };
    const onPop = (event: Event) => {
      if (fromPop) return;
      hold.__faroSkipPop = (hold.__faroSkipPop ?? 0) + 1;
      event.stopImmediatePropagation();
      shut(true);
      restore();
    };
    const down = (event: PointerEvent) => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      if (ref.current?.contains(node) || node.closest("[data-look-toggle], .form-block, .modal-back, .bubble-tools, .ftip-pop")) return;
      shut(false);
    };
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      shut(false);
    };
    window.addEventListener("popstate", onPop, true);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("faro-back", back, true);
    return () => {
      window.removeEventListener("popstate", onPop, true);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("faro-back", back, true);
      frames.forEach((id) => window.clearTimeout(id));
      hold.__faroLook = Math.max(0, (hold.__faroLook ?? 1) - 1);
      try { history.scrollRestoration = prev; } catch { /* ignore */ }
      if (!fromPop) {
        hold.__faroSkipPop = (hold.__faroSkipPop ?? 0) + 1;
        history.back();
        window.setTimeout(restore, 0);
        window.setTimeout(restore, 80);
      }
    };
  }, [open]);
  if (pinned && !open) return null;
  const toggle = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen((value) => !value);
  };
  return (
    <div className="book-look" ref={ref}>
      {pinned ? null : (
        <button type="button" className="look-open" aria-expanded={open} onPointerDown={(event) => event.stopPropagation()} onClick={toggle}>
          <i style={{ background: washForInk(color), color: "#14110e" }}><Glyph name={glyph || "Circle"} /></i>
          {t("look.title")}
        </button>
      )}
      {open ? (
        <div className="look-dock" style={{ ["--seg" as string]: color }} onPointerDown={(event) => event.stopPropagation()}>
          {bubbles ? <p className="look-label"><span className="lab-head">{t("look.bubble")}<FieldTip topic="icono-color" /></span></p> : null}
          <div className="look-colors">
            {PALETTE.map((swatch) => (
              <button key={swatch} type="button" style={{ background: washForInk(swatch) }} aria-pressed={shown === swatch} aria-label={swatch} onClick={() => onColor(swatch)} />
            ))}
          </div>
          {bubbles ? <p className="look-label"><span className="lab-head">{t("look.icon")}<FieldTip topic="icono-color" /></span></p> : null}
          <div className="look-icons" ref={iconsRef} onScroll={(event) => { const el = event.currentTarget; el.toggleAttribute("data-end", el.scrollTop + el.clientHeight >= el.scrollHeight - 2); }}>
            {LOOK_ICONS.map((name) => (
              <button key={name} type="button" aria-pressed={glyph === name} aria-label={name} style={{ ["--ink" as string]: color, background: washForInk(color), color: "#14110e" }} onClick={() => onGlyph(name)}><Glyph name={name} /></button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BubbleEditor({ line, money, onMoney }: { line: Line; money: Currency; onMoney: (value: Currency) => void }) {
  const { setUi, session, commit, t } = useFaro();
  const box = useRef<HTMLDivElement>(null);
  const [glyph, setGlyph] = useState(lineGlyph(line, session?.ledger.structure));
  // Opens on the colour the line shows (its own choice, else its category's: Ahorros' purple). Only a colour the user
  // picks here is saved; an untouched swatch is never stamped into the line (same rule as LineForm).
  const [swatch, setSwatch] = useState(() => chosenTone(line.color, line.categoryId) || baseFor(session?.ledger.structure, line.categoryId));
  const [picked, setPicked] = useState(false);
  useEffect(() => { revealEditor(box.current); }, []);
  return (
    <div ref={box}>
      <BookLook
        bubbles
        glyph={glyph}
        color={swatch}
        startOpen={false}
        onGlyph={(name) => {
          setGlyph(name);
          commit((s) => upsertLine(s, { ...line, icon: name }), line.concept || "icon");
        }}
        onColor={(next) => {
          setSwatch(next);
          setPicked(true);
          commit((s) => upsertLine(s, { ...line, color: next }), line.concept || "color");
        }}
      />
      <div className="line-edit"><p className="line-edit-head"><span aria-hidden><Pencil /></span>{t("edit")}<Hint topic="editor" className="is-head" /><b>{line.concept}</b></p>
        <LineForm kind={line.kind} existing={line} money={money} onMoney={onMoney} glyph={glyph} swatch={picked ? swatch : undefined} dock onClose={() => setUi({ editing: null })} />
      </div>
    </div>
  );
}

function BubbleTools({ onErase, onEdit, onArm }: { onErase: () => void; onEdit: () => void; onArm?: () => void }) {
  const { t } = useFaro();
  const fire = (event: ReactPointerEvent<HTMLButtonElement>, run: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    run();
  };
  return (
    <div className="bubble-tools" onPointerDown={(event) => { onArm?.(); event.stopPropagation(); }} onPointerUp={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="is-erase" aria-label={t("delete")} onPointerUp={(event) => fire(event, onErase)}><Eraser /></button>
      <button type="button" aria-label={t("edit")} onPointerUp={(event) => fire(event, onEdit)}><Pencil /></button>
    </div>
  );
}

function rippleAt(event: ReactPointerEvent<HTMLButtonElement>) {
  const el = event.currentTarget;
  const box = el.getBoundingClientRect();
  el.style.setProperty("--rx", `${event.clientX - box.left}px`);
  el.style.setProperty("--ry", `${event.clientY - box.top}px`);
  el.classList.remove("is-rippling");
  void el.offsetWidth;
  el.classList.add("is-rippling");
  window.setTimeout(() => el.classList.remove("is-rippling"), 900);
}

function spanBounds(span: "week" | "month" | "year", year: number, month: number) {
  if (span === "year") return { start: `${year}-01-01`, stop: `${year}-12-31` };
  const key = `${year}-${String(month).padStart(2, "0")}`;
  if (span === "month") {
    const last = String(new Date(year, month, 0).getDate()).padStart(2, "0");
    return { start: `${key}-01`, stop: `${key}-${last}` };
  }
  const today = new Date();
  const anchor = today.getFullYear() === year && today.getMonth() + 1 === month ? today : new Date(year, month - 1, 1);
  const monday = new Date(anchor);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { start: iso(monday), stop: iso(sunday) };
}

function readLever(storeId: string) {
  const raw = readVaultPref("faro-vault-lever", storeId);
  if (raw === null) return 5000;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0 && n <= 50000) return Math.round(n / 500) * 500;
  return 5000;
}

function readYears(storeId: string) {
  const raw = readVaultPref("faro-vault-years", storeId);
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= 80) return n;
  return 10;
}

type LeverMark = "week" | "month" | "year" | "far";

function readMark(storeId: string): LeverMark {
  const raw = readVaultPref("faro-vault-lever-mark", storeId);
  if (raw === "week" || raw === "month" || raw === "year" || raw === "far") return raw;
  return "far";
}

function readLeverOpen(storeId: string) {
  const pin = readVaultPref("faro-vault-lever-pin", storeId) === "1";
  // The projector starts folded on every visit to a savings tab; only the pin keeps it open (Oscar, Nov 1 2026).
  if (pin) return { pin: true, open: true };
  return { pin: false, open: false };
}

/** A label that ends in a (?): the last word and the (?) never part (the (?) is never alone on a line). */
function glueHint(text: string, hint: ReactNode) {
  const cut = text.lastIndexOf(" ");
  return <>{text.slice(0, cut + 1)}<span className="hint-glue">{text.slice(cut + 1)}{hint}</span></>;
}

function VaultLever({ base, tone, storeId }: { base: number; tone: string; storeId: string }) {
  const { fmt, t, session } = useFaro();
  const display = session?.ledger.settings.display ?? "USD";
  const rate = session?.ledger.settings.rateE4 ?? 0;
  const maxUsd = 50000;
  const rail = useRef<HTMLDivElement>(null);
  const [usdMinor, setUsdMinor] = useState(() => readLever(storeId));
  const [years, setYears] = useState(() => readYears(storeId));
  const [mark, setMark] = useState<LeverMark>(() => readMark(storeId));
  const [yearDraft, setYearDraft] = useState<string | null>(null);
  const [pinned, setPinned] = useState(() => readLeverOpen(storeId).pin);
  const [open, setOpen] = useState(() => readLeverOpen(storeId).open);
  const [seen, setSeen] = useState(storeId);
  if (seen !== storeId) {
    const remembered = readLeverOpen(storeId);
    setSeen(storeId);
    setUsdMinor(readLever(storeId));
    setYears(readYears(storeId));
    setMark(readMark(storeId));
    setYearDraft(null);
    setPinned(remembered.pin);
    setOpen(remembered.open);
  }
  useEffect(() => {
    const sync = () => {
      const amount = readVaultPref("faro-vault-lever", storeId);
      if (amount !== null) {
        const n = Number(amount);
        if (Number.isFinite(n)) setUsdMinor(Math.max(0, Math.min(50000, Math.round(n / 500) * 500)));
      }
      const term = readVaultPref("faro-vault-years", storeId);
      const yearsN = Number(term);
      if (Number.isInteger(yearsN) && yearsN >= 1 && yearsN <= 80) setYears(yearsN);
      const chosen = readVaultPref("faro-vault-lever-mark", storeId);
      if (chosen === "week" || chosen === "month" || chosen === "year" || chosen === "far") setMark(chosen);
    };
    window.addEventListener("faro-awake-goal", sync);
    return () => window.removeEventListener("faro-awake-goal", sync);
  }, [storeId]);
  const shown = convertMinor(usdMinor, "USD", display, rate);
  const keep = (next: number) => {
    const clamped = Math.max(0, Math.min(maxUsd, next));
    setUsdMinor(clamped);
    writeVaultPref("faro-vault-lever", storeId, String(clamped));
    try { window.dispatchEvent(new Event("faro-awake-goal")); } catch { /* ignore */ }
  };
  const setFromPoint = (client: number, span: number, origin: number, upward: boolean) => {
    if (span <= 0) return;
    const ratio = upward ? (origin - client) / span : (client - origin) / span;
    keep(Math.round(Math.max(0, Math.min(1, ratio)) * maxUsd / 500) * 500);
  };
  const down = (e: ReactPointerEvent<HTMLDivElement>, axis: "x" | "y") => {
    e.stopPropagation();
    e.preventDefault();
    const pointerId = e.pointerId;
    try { e.currentTarget.setPointerCapture(pointerId); } catch { /* the window listener still follows the finger */ }
    const read = (ev: { clientX: number; clientY: number }) => {
      const box = rail.current?.getBoundingClientRect();
      if (!box) return;
      if (axis === "y") setFromPoint(ev.clientY, box.height, box.bottom, true);
      else setFromPoint(ev.clientX, box.width, box.left, false);
    };
    read(e);
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      read(ev);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const toggleOpen = () => {
    setOpen((on) => {
      const next = !on;
      try { writeVaultPref("faro-vault-lever-open", storeId, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };
  const togglePin = () => {
    setPinned((on) => {
      const next = !on;
      try { writeVaultPref("faro-vault-lever-pin", storeId, next ? "1" : "0"); } catch { /* ignore */ }
      if (next) {
        setOpen(true);
        try { writeVaultPref("faro-vault-lever-open", storeId, "1"); } catch { /* ignore */ }
      }
      return next;
    });
  };
  const far = base + shown * 12 * years;
  const yearLabel = `${years} ${years === 1 ? t("lever.yearOne") : t("lever.years")}`;
  const cards: { id: LeverMark; label: string; value: number }[] = [
    { id: "week", label: t("lever.week"), value: base + Math.round(shown / 4) },
    { id: "month", label: t("lever.month"), value: base + shown },
    { id: "year", label: t("lever.year"), value: base + shown * 12 },
    { id: "far", label: yearLabel, value: far },
  ];
  const chosen = cards.find((card) => card.id === mark) ?? cards[1]!;
  const pick = (next: LeverMark) => {
    setMark(next);
    try { writeVaultPref("faro-vault-lever-mark", storeId, next); } catch { /* ignore */ }
  };
  const yearSkip = useRef(false);
  const commitYears = (raw: string) => {
    if (!raw.trim()) { setYearDraft(null); return; }
    const n = Math.round(Number(raw));
    const next = Number.isFinite(n) ? Math.max(1, Math.min(80, n)) : years;
    setYears(next);
    setYearDraft(null);
    try { writeVaultPref("faro-vault-years", storeId, String(next)); } catch { /* ignore */ }
    try { window.dispatchEvent(new Event("faro-awake-goal")); } catch { /* ignore */ }
  };
  const yearControl = yearDraft !== null ? (
    <input
      className="vault-year"
      inputMode="numeric"
      autoFocus
      value={yearDraft}
      aria-label={t("lever.yearsEdit")}
      onChange={(e) => setYearDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
      onBlur={() => { if (yearSkip.current) { yearSkip.current = false; return; } commitYears(yearDraft); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") { yearSkip.current = true; setYearDraft(null); }
      }}
    />
  ) : (
    <button type="button" className="vault-year-btn" onClick={() => setYearDraft(String(years))}>{yearLabel}</button>
  );
  const keys = (e: { key: string }) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") keep(usdMinor + 500);
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") keep(usdMinor - 500);
  };
  // Closed lever: when the years label + amount leave the rail under 72px (narrow phone, large text, long amount),
  // the rail takes its own line under them, so the amount never runs into the chevron.
  const flatRef = useRef<HTMLDivElement>(null);
  const [stack, setStack] = useState(false);
  useLayoutEffect(() => {
    const flat = flatRef.current;
    if (open || !flat) return;
    const fit = () => {
      const kids = Array.from(flat.children) as HTMLElement[];
      const rest = kids.filter((k) => !k.classList.contains("vault-lever-rail"));
      const gap = parseFloat(getComputedStyle(flat).columnGap) || 0;
      const need = rest.reduce((sum, k) => sum + k.getBoundingClientRect().width, 0) + gap * rest.length + 72;
      setStack(need > flat.clientWidth + 0.5);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(flat);
    for (const k of Array.from(flat.children)) if (!k.classList.contains("vault-lever-rail")) ro.observe(k);
    return () => ro.disconnect();
  }, [open, mark, yearDraft]);
  // "Ir allí" (Si apartas) unfolds the projector.
  useEffect(() => {
    const onOpen = (e: Event) => { if ((e as CustomEvent).detail === "lever") setOpen(true); };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  return (
    <div data-anchor="lever" className={`vault-lever${open ? " is-open" : ""}`} style={{ ["--seg" as string]: tone, ["--p" as string]: `${(usdMinor / maxUsd) * 100}%` }}>
      {open ? <button type="button" className="fold-pin" aria-label={t("study.pin")} aria-pressed={pinned} onClick={togglePin}><Pin /></button> : null}
      <button type="button" className="fold-chev" aria-label={t("study.fold")} aria-expanded={open} onClick={toggleOpen}><ChevronDown /></button>
      {open ? (
        <>
          <div
            className="vault-lever-rail"
            ref={rail}
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={maxUsd}
            aria-valuenow={usdMinor}
            aria-label={t("lever.if")}
            onPointerDown={(e) => down(e, "y")}
            onKeyDown={keys}
          >
            <i />
            <b style={{ bottom: `calc(8px + (100% - 38px) * ${usdMinor / maxUsd})` }} />
          </div>
          <div className="vault-lever-read">
            <p>
              <span className="lab-head">{t("lever.if")}<Hint topic="si-apartas" /></span>
              <strong className="num">{fmt(shown)}</strong>
              <em>{t("lever.each")}</em>
            </p>
            <small>{t("lever.lands")}</small>
            <div>
              {cards.filter((card) => card.id !== "far").map((card) => (
                <button key={card.id} type="button" className={`vault-mark${mark === card.id ? " is-on" : ""}`} aria-pressed={mark === card.id} onClick={() => pick(card.id)}>
                  <em>{card.label}</em>
                  <strong className="num">{fmt(card.value)}</strong>
                </button>
              ))}
              <div className={`vault-mark${mark === "far" ? " is-on" : ""}`} onClick={() => pick("far")}>
                {yearControl}
                <strong className="num">{fmt(far)}</strong>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={`vault-lever-flat${stack ? " is-stack" : ""}`} ref={flatRef}>
          <div
            className="vault-lever-rail is-flat"
            ref={rail}
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={maxUsd}
            aria-valuenow={usdMinor}
            aria-label={t("lever.if")}
            onPointerDown={(e) => down(e, "x")}
            onKeyDown={keys}
          >
            <i />
            <b style={{ left: `calc(19px + (100% - 38px) * ${usdMinor / maxUsd})` }} />
          </div>
          {mark === "far" ? yearControl : <span className="vault-year-btn">{chosen.label}</span>}
          <strong className="num">{fmt(chosen.value)}</strong>
        </div>
      )}
    </div>
  );
}

function SpanCut({ kinds, subs, span, onSpan, tone, pinKey, saving }: { kinds: string[]; subs?: string[]; span: "week" | "month" | "year"; onSpan: (span: "week" | "month" | "year") => void; tone?: string; pinKey?: string; saving?: boolean }) {
  const { session, ui, lang, fmt, t } = useFaro();
  const storeKey = pinKey ?? kinds.slice().sort().join(",");
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem(`faro-span-pin:${storeKey}`) === "1"; } catch { return false; }
  });
  const [open, setOpen] = useState(pinned);
  const cutRef = useRef<HTMLDivElement>(null);
  // "Ir allí" opens the first chart on the screen.
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent).detail !== "book-span") return;
      const first = Array.from(document.querySelectorAll(".span-cut")).find((el) => (el as HTMLElement).offsetParent !== null);
      if (first === cutRef.current) setOpen(true);
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  if (!session) return null;
  const points = spanPoints(session.ledger, ui.year, ui.month, span, lang, kinds, subs);
  const income = kinds.some((kind) => kind.startsWith("income"));
  const total = points.reduce((sum, point) => sum + (income ? point.income : point.expense), 0);
  const max = Math.max(...points.map((point) => (income ? point.income : point.expense)), 0.01);
  const money = fmt(Math.round(total * 100));
  const latest = points[points.length - 1];
  const latestValue = latest ? (income ? latest.income : latest.expense) : 0;
  const average = points.length ? total / points.length : 0;
  function togglePin() {
    setPinned((on) => {
      const next = !on;
      try { localStorage.setItem(`faro-span-pin:${storeKey}`, next ? "1" : "0"); } catch { /* ignore */ }
      if (next) setOpen(true);
      return next;
    });
  }
  return (
    <div ref={cutRef} data-anchor="book-span" className={`span-cut${open ? " is-open" : ""}`} style={tone ? { ["--accent" as string]: tone } : undefined}>
      <div className="span-fold-bar">
        {open ? (
          <div className="span-filter" role="tablist" aria-label={t("study.span")}>
            {(["week", "month", "year"] as const).map((id) => (
              <button key={id} type="button" aria-pressed={span === id} onClick={() => onSpan(id)}>{t(`study.span.${id}`)}</button>
            ))}
          </div>
        ) : (
          <button type="button" className="span-fold-main" onClick={() => setOpen(true)}>
            <span>{t(`study.span.${span}`)}</span>
            <strong className="num">{money}</strong>
          </button>
        )}
        {open ? <button type="button" className="fold-pin" aria-label={t("study.pin")} aria-pressed={pinned} onClick={togglePin}><Pin /></button> : null}
        <button type="button" className="fold-chev" aria-label={t("study.fold")} aria-expanded={open} onClick={() => setOpen((v) => !v)}><ChevronDown /></button>
      </div>
      {open ? (
        <>
          <div className="span-facts">
            <div className="pot-help">
              <Explain
                topic="acumulado"
                title={t("pot.total")}
                meaning={t(saving ? "pot.save.meaning" : income ? "pot.total.meaning.in" : "pot.total.meaning.out")}
                formula={t(saving ? "pot.save.formula" : income ? "pot.total.formula.in" : "pot.total.formula.out")}
                implication={t(saving ? "pot.save.implication" : income ? "pot.total.implication.in" : "pot.total.implication.out")}
                label={t(saving ? "pot.save.help" : "pot.total.help")}
                legend={average > 0 ? t("pot.avg.line").replace("{avg}", fmt(Math.round(average * 100))).replace("{n}", String(points.length)) : undefined}
              />
              <em>{t("pot.total")}</em>
              <strong className="num">{money}</strong>
            </div>
            <div>
              <em className="lab-head">{t(`study.span.now.${span}`)}<Hint topic="este-periodo" /></em>
              <strong className="num">{fmt(Math.round(latestValue * 100))}</strong>
            </div>
            <div>
              <em className="lab-head">{t("pot.avg")}<Hint topic="promedio" /></em>
              <strong className="num">{fmt(Math.round(average * 100))}</strong>
            </div>
          </div>
          <div className={`cut-lanes ${income ? "is-in" : "is-out"}`} style={{ "--a": max > 0 ? Math.min(1, average / max) : 0 } as CSSProperties}>
            {average > 0 ? <s className="cut-avg" aria-hidden /> : null}
            {points.map((point) => {
              const value = income ? point.income : point.expense;
              return (
                <span key={point.key} className={`cut-lane${value <= 0 ? " is-empty" : ""}${value > 0 && value >= max ? " is-peak" : ""}`}>
                  <i style={{ height: `${Math.max(value > 0 ? 14 : 4, (value / max) * 100)}%` }} />
                  <b>{point.label.replace(".", "")}</b>
                </span>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PotReport({ line, span }: { line: Line; span: "week" | "month" | "year" }) {
  const { session, fmt, t, commit, ui } = useFaro();
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState("");
  const [when, setWhen] = useState("");
  const display = session?.ledger.settings.display ?? "NIO";
  const rate = session?.ledger.settings.rateE4 ?? 0;
  const income = line.kind.startsWith("income");
  const dates = line.startedOn && line.cadence ? payDates(line.startedOn, line.cadence) : [];
  if (!session || !dates.length) return null;
  const { start, stop } = spanBounds(span, ui.year, ui.month);
  const seen = dates.filter((date) => date >= start && date <= stop);
  const each = convertMinor(line.amountMinor, line.currency, display, rate);
  const intact = each * seen.length;
  const drawn = line.history.reduce((sum, charge) => (charge.date >= start && charge.date <= stop ? sum + convertMinor(charge.amountMinor, charge.currency, display, rate) : sum), 0);
  const seriesId = line.seriesId || line.id;
  let logged = 0;
  for (const bucket of Object.values(session.ledger.months)) {
    for (const item of bucket.lines) {
      if ((item.seriesId || item.id) !== seriesId) continue;
      const on = item.bookedOn && item.bookedOn.startsWith(item.monthKey) ? item.bookedOn : `${item.monthKey}-01`;
      if (on < start || on > stop) continue;
      logged += convertMinor(item.amountMinor, item.currency, display, rate);
    }
  }

  function reportUse() {
    const minor = parseAmount(used);
    if (minor === null) return;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(when) ? when : dates[dates.length - 1] ?? "";
    commit((s) => upsertLine(s, {
      ...line,
      history: [...line.history, { id: uid(), date, amountMinor: minor, currency: display, note: "" }],
    }), line.concept);
    setUsed("");
  }

  return (
    <div className="pot" data-anchor="book-pot">
      <div className="pot-row">
        <button type="button" className="pot-chip" onClick={() => setOpen((v) => !v)}>
          <em>{income ? t("pot.intact") : t("pot.total")}</em>
          <strong className="num">{fmt(intact)}</strong>
        </button>
        <button type="button" className="pot-chip" onClick={() => setOpen((v) => !v)}>
          <em>{income ? t("pot.used") : t("pot.logged")}</em>
          <strong className="num">{fmt(income ? drawn : logged)}</strong>
        </button>
        <button type="button" className="pot-chip is-now" onClick={() => setOpen((v) => !v)}>
          <em>{income ? t("pot.left") : t("pot.pays")}</em>
          <strong className="num">{income ? fmt(intact - drawn) : String(dates.length)}</strong>
        </button>
      </div>
      {open ? (
        <div className="pot-body">
          <p className="pot-kicker lab-head">{t("pot.when")}<Hint topic="bote" /></p>
          <div className="pot-dates">
            {(seen.length ? seen : dates).map((date) => <span key={date}>{date.slice(8)}/{date.slice(5, 7)}/{date.slice(2, 4)}</span>)}
          </div>
          {income ? (
            <div className="pot-use">
              <input className="field num" inputMode="decimal" aria-label={t("amount")} value={used} onChange={(e) => setUsed(e.target.value)} />
              <DayField value={when} onChange={setWhen} />
              <button type="button" className="btn" onClick={reportUse}>{t("pot.use")}</button>
            </div>
          ) : null}
          {income && line.history.length ? (
            <div className="pot-dates">
              {line.history.map((charge) => (
                <span key={charge.id}>{charge.date.slice(8)}/{charge.date.slice(5, 7)} · {fmt(convertMinor(charge.amountMinor, charge.currency, display, rate))}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LinesBlock({ kind, title, categoryId, storeId }: { kind: LineKind | LineKind[]; title: string; categoryId?: string; storeId?: string }) {
  const { lines, t, ui, setUi, viewLine, recordLine, session, confirm, commit, key, names, fmt } = useFaro();
  const kinds = Array.isArray(kind) ? kind : [kind];
  const draftKind = kinds[0] ?? "income-fixed";
  const group = draftKind === "expense-fixed" ? "fixed" : draftKind === "expense-variable" ? "variable" : null;
  const rows = lines.filter((l) => {
    if (!kinds.includes(l.kind)) return false;
    if (draftKind === "expense-fixed" && (session?.ledger.structure.categories.find((c) => c.id === l.categoryId)?.role === "savings")) return false;
    if (categoryId && categoryId !== "all" && l.categoryId !== categoryId) return false;
    if (storeId && storeId !== "all" && l.storeId !== storeId) return false;
    return true;
  });
  const cats = (session?.ledger.structure.categories ?? []).filter((c) => group && c.group === group && !c.hidden && c.role !== "savings");
  const purchases = session?.ledger.structure.purchases.filter((c) => !c.hidden) ?? [];
  const [chip, setChip] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const chipRows = rows.filter((l) => chip === "all" || l.categoryId === chip);
  const chipSource = group ? cats : [];
  const asCloud = draftKind === "expense-fixed";
  const asDrift = draftKind === "expense-variable";
  const asShop = draftKind === "purchase";
  const asDue = draftKind === "subscription";
  const asBubble = asCloud || asDrift || asDue;
  const present = chipSource.filter((c) => rows.some((l) => l.categoryId === c.id));
  const pickedLine = chipRows.find((l) => l.id === picked) ?? null;
  const display = session?.ledger.settings.display ?? "NIO";
  const [money, setMoney] = useState<Currency>(display);
  const [span, setSpan] = useState<"week" | "month" | "year">("month");
  const [lookGlyph, setLookGlyph] = useState("Circle");
  const [lookColor, setLookColor] = useState("#b7d4c4");
  const draftRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ui.editing) {
      const line = rows.find((item) => item.id === ui.editing);
      if (line) setMoney(line.currency);
      return;
    }
    if (ui.draft === draftKind) setMoney(display);
  }, [ui.editing, ui.draft, draftKind, display]);
  useEffect(() => {
    if (ui.draft === draftKind && !ui.editing) revealEditor(draftRef.current);
  }, [ui.draft, ui.editing, draftKind]);
  useEffect(() => {
    if (ui.editing && picked === ui.editing) revealEditor(editRef.current);
  }, [ui.editing, picked]);

  return (
    <section className="card income-book" data-anchor="book-card">
      <div className="row income-head" style={{ justifyContent: "space-between" }}>
        <h2 className="serif text-2xl lab-head">{title}<Hint topic="libro-categoria" fitParent /></h2>
        <span className="row">
          {ui.draft === draftKind && !ui.editing ? (
            <button type="button" className="copper-coin" aria-label={money === "USD" ? "USD" : "NIO"} onClick={() => setMoney((cur) => (cur === "USD" ? "NIO" : "USD"))}>
              {money === "USD" ? "$" : "C$"}
            </button>
          ) : null}
          {(asCloud || asDrift) && present.length > 1 ? (
            <button type="button" data-anchor="book-filter" className="icon-btn filter-btn" aria-pressed={filterOpen || chip !== "all"} aria-label={t("filter.button")} onClick={() => setFilterOpen((v) => !v)}>
              <Filter className="size-4" />
            </button>
          ) : null}
          <button type="button" data-anchor="book-add" className="plus-mark" aria-label={t("add")} aria-pressed={ui.draft === draftKind} onClick={() => setUi({ draft: ui.draft === draftKind ? null : draftKind, editing: null })}>
            <svg viewBox="0 0 32 32" aria-hidden>
              <defs>
                <radialGradient id={`faro-plus-${draftKind}`} cx="32%" cy="28%" r="72%">
                  <stop offset="0%" stopColor="#fff6d8" />
                  <stop offset="42%" stopColor="#e4c27a" />
                  <stop offset="100%" stopColor="#8a6118" />
                </radialGradient>
              </defs>
              <circle cx="16" cy="16" r="15" fill={`url(#faro-plus-${draftKind})`} />
              <circle cx="16" cy="16" r="13.2" fill="none" stroke="#6a4c12" strokeWidth="0.6" />
              <path d="M16 9.2v13.6M9.2 16h13.6" stroke="#3a280c" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      </div>
      <SpanCut kinds={kinds} span={span} onSpan={setSpan} />
      {(asCloud || asDrift) && filterOpen ? (
        <div className="filter-menu" role="menu">
          <button type="button" aria-pressed={chip === "all"} onClick={() => { setChip("all"); setFilterOpen(false); }}>
            <i />
            {t("filter.all")}
          </button>
          {present.map((c) => (
            <button key={c.id} type="button" aria-pressed={chip === c.id} onClick={() => { setChip(chip === c.id ? "all" : c.id); setFilterOpen(false); }}>
              <i style={{ background: session ? colorFor(session.ledger.structure, c.id) : "#c5d5cc" }} />
              {names.cat(c.id)}
            </button>
          ))}
        </div>
      ) : null}
      {!asCloud && !asDrift && chipSource.length > 1 ? (
        <div className="chips mt-3" role="toolbar" aria-label={t("filter.all")}>
          <button type="button" aria-pressed={chip === "all"} onClick={() => setChip("all")}>{t("filter.all")}</button>
          {chipSource.map((c) => (
            <button key={c.id} type="button" aria-pressed={chip === c.id} onClick={() => setChip(chip === c.id ? "all" : c.id)}>
              {names.cat(c.id)}
            </button>
          ))}
        </div>
      ) : null}
      {ui.draft === draftKind && !ui.editing ? (
        <div className="mt-3" ref={draftRef}>
          <BookLook bubbles glyph={lookGlyph} color={lookColor} onGlyph={setLookGlyph} onColor={setLookColor} />
          <LineForm kind={draftKind} money={money} onMoney={setMoney} glyph={lookGlyph} swatch={lookColor} dock onClose={() => setUi({ draft: null })} />
        </div>
      ) : null}
      {chipRows.length === 0 ? <p className="mt-3 text-muted">{t("empty.lines")}</p> : null}
      {asBubble ? (
        <>
          <div className="spend-cloud">
            {[...chipRows].sort((a, b) => b.amountMinor - a.amountMinor).map((line) => {
              const share = line.amountMinor / Math.max(chipRows.reduce((sum, item) => sum + item.amountMinor, 0), 1);
              const label = line.concept || names.cat(line.categoryId) || names.purchase(line.categoryId) || "";
              const span = Math.max(label.length > 12 ? 5 : 4, Math.min(8, Math.round(4 + share * 9)));
              return (
                <div key={line.id} className="spend-slot" style={{ gridColumn: `span ${span}`, minHeight: `${78 + share * 64}px` }}>
                <button
                  type="button"
                  className="spend-bubble"
                  data-line-id={line.id}
                  data-hot={ui.highlight === line.id}
                  aria-pressed={picked === line.id}
                  style={{
                    backgroundColor: washForInk(chosenTone(line.color, line.categoryId) || (session ? colorFor(session.ledger.structure, line.categoryId) : "#c5d5cc")),
                    ["--tone" as string]: chosenTone(line.color, line.categoryId) || (session ? colorFor(session.ledger.structure, line.categoryId) : "#c5d5cc"),
                    color: "#14110e",
                  }}
                  onPointerDown={rippleAt}
                  onClick={() => {
                    setPicked(picked === line.id ? null : line.id);
                    if (ui.editing) setUi({ editing: null });
                  }}
                >
                  <i className="spend-mark" aria-hidden><Glyph name={lineGlyph(line, session?.ledger.structure)} /></i>
                  <strong>{line.concept || names.cat(line.categoryId) || names.purchase(line.categoryId)}</strong>
                  <span className="num">{draftKind.startsWith("income") ? "" : "−"}{viewLine(line)}</span>
                </button>
                {picked === line.id ? (
                  <BubbleTools
                    onErase={() => confirm({ title: t("delete"), body: `${line.concept}. ${t("delete.warn")}`, danger: true, yes: t("yes"), run: () => { commit((s) => deleteLine(s, key, line.id), line.concept); setPicked(null); } })}
                    onEdit={() => { setPicked(line.id); setUi({ editing: line.id, draft: null }); }}
                  />
                ) : null}
                </div>
              );
            })}
          </div>
          {pickedLine ? (
            <div className="mt-3" ref={editRef}>
              {ui.editing === pickedLine.id ? <BubbleEditor line={pickedLine} money={money} onMoney={setMoney} /> : null}
              <PotReport line={pickedLine} span={span} />
            </div>
          ) : null}
        </>
      ) : asShop ? (
        <ShopBoard rows={chipRows} money={money} onMoney={setMoney} span={span} />
      ) : (
        chipRows.map((line) => (
          <div key={line.id} className="line-stack">
            <div className="line-row" data-line-id={line.id} data-hot={ui.highlight === line.id}>
              <div className="min-w-0">
                <strong className="block">{keepTail(line.concept || names.cat(line.categoryId) || names.purchase(line.categoryId), true)}</strong>
                <span className="block text-sm text-muted">{[names.cat(line.categoryId), names.sub(line.subId), names.catalog(line.storeId)].filter(Boolean).join(" · ")}</span>
              </div>
              {moneyRow(line, outView(line, viewLine), recordLine(line), display)}
              <button type="button" className="icon-btn line-act" aria-label={t("edit")} onClick={() => setUi({ editing: ui.editing === line.id ? null : line.id, draft: null })}><Pencil className="size-4" /></button>
              <button type="button" className="icon-btn line-act is-danger" aria-label={t("delete")} onClick={() => confirm({ title: t("delete"), body: `${line.concept}. ${t("delete.warn")}`, danger: true, yes: t("yes"), run: () => commit((s) => deleteLine(s, key, line.id), line.concept) })}><Trash2 className="size-4" /></button>
              {ui.editing === line.id ? <div className="line-edit"><p className="line-edit-head"><span aria-hidden><Pencil /></span>{t("edit")}<Hint topic="editor" className="is-head" /><b>{line.concept}</b></p><LineForm kind={line.kind} existing={line} money={money} onMoney={setMoney} onClose={() => setUi({ editing: null })} /></div> : null}
            </div>
            <PotReport line={line} span={span} />
          </div>
        ))
      )}
      {purchases.length && draftKind === "purchase" ? null : null}
    </section>
  );
}

function ShopBoard({ rows, money, onMoney, span }: { rows: Line[]; money: Currency; onMoney: (value: Currency) => void; span: "week" | "month" | "year" }) {
  const { names, viewLine, session, ui, setUi, confirm, commit, key, t, fmt } = useFaro();
  const display = session?.ledger.settings.display ?? "NIO";
  const rate = session?.ledger.settings.rateE4 ?? 0;
  const [picked, setPicked] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const minorOf = (line: Line) => convertMinor(line.amountMinor, line.currency, display, rate);
  const total = Math.max(rows.reduce((sum, line) => sum + minorOf(line), 0), 1);
  const pickedLine = rows.find((line) => line.id === picked) ?? null;
  const arm = useRef(false);
  useEffect(() => {
    if (ui.editing && picked === ui.editing) revealEditor(editRef.current);
  }, [ui.editing, picked]);
  const storeTotals = new Map<string, number>();
  const window = spanBounds(span, ui.year, ui.month);
  if (session) {
    for (const bucket of Object.values(session.ledger.months)) {
      for (const item of bucket.lines) {
        if (item.kind !== "purchase" || !item.storeId) continue;
        const on = item.bookedOn && item.bookedOn.startsWith(item.monthKey) ? item.bookedOn : `${item.monthKey}-01`;
        if (on < window.start || on > window.stop) continue;
        storeTotals.set(item.storeId, (storeTotals.get(item.storeId) ?? 0) + convertMinor(item.amountMinor, item.currency, display, rate));
      }
    }
  }
  const storeChips = [...storeTotals.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <>
      {storeChips.length ? (
        <div className="pot-row store-row">
          {storeChips.map(([id, minor]) => (
            <span key={id} className="pot-chip">
              <em>{names.catalog(id)}</em>
              <strong className="num">{fmt(minor)}</strong>
            </span>
          ))}
        </div>
      ) : null}
      <div className="buy-board">
        {[...rows].sort((a, b) => minorOf(b) - minorOf(a)).map((line) => {
          const share = minorOf(line) / total;
          const span = Math.max(4, Math.min(8, Math.round(4 + share * 9)));
          return (
            <div key={line.id} className="spend-slot" style={{ gridColumn: `span ${span}`, minHeight: `${78 + share * 64}px` }}>
            <button
              type="button"
              className={`buy-glass${line.storeId ? ` brand-${line.storeId}` : ""}`}
              data-line-id={line.id}
              data-hot={ui.highlight === line.id}
              aria-pressed={picked === line.id}
              onPointerDown={rippleAt}
              onClick={() => {
                if (arm.current) { arm.current = false; return; }
                const next = picked === line.id ? null : line.id;
                setPicked(next);
                if (!next) setUi({ editing: null });
              }}
            >
              <span className="buy-id">
                {line.storeId ? <BrandMark id={line.storeId} src={session?.ledger.structure.catalog.find((item) => item.id === line.storeId)?.icon.startsWith("data:") ? session.ledger.structure.catalog.find((item) => item.id === line.storeId)?.icon : undefined} className="buy-mark" /> : <i className="spend-mark" aria-hidden><Glyph name={lineGlyph(line, session?.ledger.structure)} /></i>}
                <strong>{line.concept || names.purchase(line.categoryId)}</strong>
              </span>
              <span className="num">{outView(line, viewLine)}</span>
            </button>
            {picked === line.id ? (
              <BubbleTools
                onArm={() => { arm.current = true; setTimeout(() => { arm.current = false; }, 450); }}
                onErase={() => confirm({ title: t("delete"), body: `${line.concept}. ${t("delete.warn")}`, danger: true, yes: t("yes"), run: () => { commit((s) => deleteLine(s, key, line.id), line.concept); setPicked(null); } })}
                onEdit={() => { arm.current = true; setPicked(line.id); setUi({ editing: line.id, draft: null }); }}
              />
            ) : null}
            </div>
          );
        })}
      </div>
      {pickedLine ? (
        <div className="mt-3" ref={editRef}>
          {ui.editing === pickedLine.id ? <BubbleEditor line={pickedLine} money={money} onMoney={onMoney} /> : null}
          <PotReport line={pickedLine} span={span} />
        </div>
      ) : null}
    </>
  );
}

const VAULT_BLOCKS: Record<string, string[]> = {
  save: ["accounts", "span", "lever", "flow"],
  meta: ["board", "span", "lever", "view"],
  retiro: ["board", "span", "lever", "view"],
  emergencia: ["board", "span", "lever", "view"],
};

function readVaultBlocks(id: string) {
  const fallback = VAULT_BLOCKS[id] ?? [];
  try {
    const raw = JSON.parse(localStorage.getItem(`faro-vault-blocks:${id}`) || "[]") as string[];
    if (!Array.isArray(raw)) return fallback;
    const known = new Set(fallback);
    const next = raw.filter((item) => known.has(item));
    for (const item of fallback) if (!next.includes(item)) next.push(item);
    return next;
  } catch {
    return fallback;
  }
}

type CobroBonus = { id: string; date: string; amountMinor: number; note: string };
type Cobro = {
  id: string;
  person: string;
  kind: "plain" | "interest";
  amountMinor: number;
  currency: Currency;
  aprBps: number;
  owedOn: string;
  startedOn: string;
  note: string;
  bonuses: CobroBonus[];
  archived?: boolean;
  archivedOn?: string;
  unpaidMinor?: number;
};


function readCobros(): Cobro[] {
  try {
    const raw = JSON.parse(localStorage.getItem("faro-cobros") || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((row) => {
      if (!row || typeof row.id !== "string" || typeof row.person !== "string" || typeof row.amountMinor !== "number") return [];
      const bonuses = Array.isArray(row.bonuses)
        ? row.bonuses.filter((b: CobroBonus) => b && typeof b.amountMinor === "number" && typeof b.date === "string")
        : [];
      return [{
        id: row.id,
        person: row.person,
        kind: row.kind === "interest" ? "interest" : "plain",
        amountMinor: row.amountMinor,
        currency: row.currency === "NIO" ? "NIO" : "USD",
        aprBps: typeof row.aprBps === "number" ? row.aprBps : 0,
        owedOn: typeof row.owedOn === "string" ? row.owedOn : "",
        startedOn: typeof row.startedOn === "string" ? row.startedOn : "",
        note: typeof row.note === "string" ? row.note : "",
        bonuses,
        archived: row.archived === true,
        archivedOn: typeof row.archivedOn === "string" ? row.archivedOn : "",
        unpaidMinor: typeof row.unpaidMinor === "number" ? row.unpaidMinor : 0,
      } satisfies Cobro];
    });
  } catch {
    return [];
  }
}

/** Me deben uses the same loan rule as Préstamos (lib/faro/loans.ts): interest from the day it was recorded. */
function cobroDue(row: Cobro) {
  const paid = row.bonuses.reduce((sum, bonus) => sum + bonus.amountMinor, 0);
  return loanFigures(row.amountMinor, row.kind, row.aprBps, row.startedOn || row.owedOn || todayIso(), paid);
}

type DueFile = { id: string; seriesId: string; name: string; maxMinor: number; currency: Currency; archivedOn: string; pays: { date: string; amountMinor: number }[] };

function readDueFile(): DueFile[] {
  try {
    const raw = JSON.parse(localStorage.getItem("faro-due-file") || "[]");
    return Array.isArray(raw) ? raw.filter((row) => row && typeof row.name === "string") : [];
  } catch {
    return [];
  }
}

function DueOwe() {
  const { t, fmt, lang, lines, session, key, commit, confirm } = useFaro();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(todayIso());
  const [cadence, setCadence] = useState<"weekly" | "biweekly" | "monthly" | "yearly">("monthly");
  const [fileOpen, setFileOpen] = useState(false);
  const [filed, setFiled] = useState<DueFile[]>(readDueFile);
  useEffect(() => {
    const onOpen = (e: Event) => { if ((e as CustomEvent<string>).detail === "cobros-out-file") setFileOpen(true); };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  const [openPeak, setOpenPeak] = useState<string | null>(null);
  const display = session?.ledger.settings.display ?? "USD";
  const active = lines.filter((line) => line.kind === "subscription" && line.active);
  const sum = active.reduce((total, line) => total + convertMinor(line.amountMinor, line.currency, display, session?.ledger.settings.rateE4 ?? 0), 0);
  // Debo over time: every due of every month (archived ones too) on its day; this month's tiles split paid (its day came) from pending.
  const today = todayIso();
  const dayOf = (line: Line) => line.bookedOn || line.nextDue || `${line.monthKey}-01`;
  const paidSum = active.filter((line) => dayOf(line) <= today).reduce((total, line) => total + convertMinor(line.amountMinor, line.currency, display, session?.ledger.settings.rateE4 ?? 0), 0);
  const nextDay = active.map(dayOf).filter((day) => day > today).sort()[0] ?? "";
  const charges = Object.values(session?.ledger.months ?? {}).flatMap((month) => month.lines)
    .filter((line) => line.kind === "subscription" && (line.active || filed.some((f) => f.seriesId === (line.seriesId || line.id))))
    .map((line) => ({ date: dayOf(line), value: convertMinor(line.amountMinor, line.currency, display, session?.ledger.settings.rateE4 ?? 0) }));
  function saveFile(next: DueFile[]) {
    setFiled(next);
    try { localStorage.setItem("faro-due-file", JSON.stringify(next)); } catch { /* ignore */ }
  }
  function addDue() {
    const minor = parseAmount(amount);
    const concept = name.trim();
    if (!concept || minor === null || minor <= 0) return;
    const id = uid();
    const line: Line = {
      id, seriesId: id, monthKey: key, kind: "subscription", concept, amountMinor: minor, currency: display,
      active: true, note: "", categoryId: "", subId: "", recurring: true, storeId: "", providerId: "",
      productCode: "", productUrl: "", cadence, nextDue: due || todayIso(), aprBps: 0, balanceMinor: null,
      balanceCurrency: display, icon: "RefreshCw", history: [], bookedOn: due || todayIso(), color: "#e7c27a",
    };
    commit((s) => upsertLine(s, line), concept);
    setAdding(false);
    setName("");
    setAmount("");
  }
  function archive(line: Line) {
    let maxMinor = line.amountMinor;
    const pays: DueFile["pays"] = [];
    for (const month of Object.values(session?.ledger.months ?? {})) {
      for (const item of month.lines) {
        if (item.kind !== "subscription" || (item.seriesId !== line.seriesId && item.id !== line.seriesId)) continue;
        pays.push({ date: item.bookedOn || `${item.monthKey}-01`, amountMinor: item.amountMinor });
        if (item.amountMinor > maxMinor) maxMinor = item.amountMinor;
      }
    }
    saveFile([{ id: uid(), seriesId: line.seriesId || line.id, name: line.concept, maxMinor, currency: line.currency, archivedOn: todayIso(), pays }, ...filed]);
    commit((s) => upsertLine(s, { ...line, active: false }), line.concept);
  }
  return (
    <div className="cobro-swap" data-anchor="cobros-out">
      <div className="cobro-top">
        <div>
          <strong className="num">{fmt(sum)}</strong>
        </div>
        <button type="button" className="cobro-plus" aria-pressed={adding} aria-label={t("cobro.owe.add")} onClick={() => setAdding((on) => !on)}><Plus /></button>
      </div>
      <DeboSum empty={t("debo.sum.dues.empty")} parts={active.length ? [
        [`${active.length} ${t(active.length === 1 ? "debo.sum.active1" : "debo.sum.activeN")}`],
        [nextDay ? `${t("debo.sum.next")} ${new Date(`${nextDay}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).replace(".", "")}` : t("debo.sum.allPaid")],
        [{ num: fmt(paidSum) }, t("debo.sum.paid")],
      ] : null} />
      <CobroSpan out help="debo-tiempo" title={t("cobro.owe.span")} total={sum} events={charges}
        facts={[[t("cobro.owe.due"), sum], [t("cobro.owe.paid"), paidSum], [t("cobro.left.owe"), Math.max(0, sum - paidSum)]]} />
      {adding ? (
        <div className="form-block cobro-form is-owe">
          <div className="cobro-grid">
            <div className="label is-wide">
              <span className="lab-head">{t("cobro.owe.name")}<FieldTip topic="f-cuota-nombre" /></span>
              <div className="due-sites">
                {["YouTube", "Netflix", "Prime", "Internet"].map((preset) => (
                  <button key={preset} type="button" aria-pressed={name === preset} onClick={() => setName(preset)}>{preset}</button>
                ))}
              </div>
              <input className="field" aria-label={t("cobro.owe.name")} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <label className="label">
              <span className="lab-head">{t("cobro.amount")}<FieldTip topic="f-cuota-monto" /></span>
              <input className="field num" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <div className="label is-right">
              <span className="lab-head">{t("cobro.owe.next")}<FieldTip topic="f-cuota-proximo" /></span>
              <DayField value={due} onChange={setDue} />
            </div>
            <div className="label is-wide">
              <span className="lab-head">{t("cobro.cadence")}<FieldTip topic="f-frecuencia" /></span>
              <div className="due-cadence">
                {(["weekly", "biweekly", "monthly", "yearly"] as const).map((id) => (
                  <button key={id} type="button" aria-pressed={cadence === id} onClick={() => setCadence(id)}>{t(id)}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="cobro-actions">
            <button type="button" className="btn secondary" onClick={() => setAdding(false)}>{t("cancel")}</button>
            <button type="button" className="btn" onClick={addDue}>{t("save")}</button>
          </div>
        </div>
      ) : null}
      {active.length ? active.map((line) => (
        <article key={line.id} className="cobro-card due-card">
          <div className="due-line">
            <i className="spend-mark" aria-hidden><Glyph name={lineGlyph(line, session?.ledger.structure)} /></i>
            <div className="min-w-0">
              <strong>{line.concept}</strong>
              <p>{line.cadence ? t(line.cadence) : t("cobro.owe")}</p>
            </div>
            <strong className="num">{fmt(convertMinor(line.amountMinor, line.currency, display, session?.ledger.settings.rateE4 ?? 0))}</strong>
            <button type="button" className="due-drop" aria-label={t("cobro.archive")} onClick={() => confirm({ title: t("cobro.archive"), body: t("cobro.owe.file.body"), yes: t("cobro.archive"), run: () => archive(line) })}><Trash2 /></button>
          </div>
        </article>
      )) : <p className="cobro-empty">{t("cobro.owe.empty")}</p>}
      <div className={`cobro-file${fileOpen ? " is-open" : ""}`}>
        <div role="button" tabIndex={0} data-anchor="cobros-out-file" className="cobro-file-head" aria-expanded={fileOpen} onClick={() => setFileOpen((on) => !on)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFileOpen((on) => !on); } }}>
          <span className="lab-head">{t("cobro.file")}<Hint topic="archivo-cuotas" /></span>
          <b>{filed.length}</b>
          <ChevronDown className={fileOpen ? "fold-chev is-open" : "fold-chev"} />
        </div>
        {fileOpen ? (filed.length ? filed.map((row) => (
          <article key={row.id} className="cobro-card is-file">
            <button type="button" className="due-peak" onClick={() => setOpenPeak(openPeak === row.id ? null : row.id)}>
              <span>{row.name}</span>
              <strong>{t("cobro.owe.peak")} {fmt(convertMinor(row.maxMinor, row.currency, display, session?.ledger.settings.rateE4 ?? 0))}</strong>
            </button>
            {openPeak === row.id ? (
              <ul className="due-pays">
                {row.pays.map((pay, index) => <li key={`${row.id}-${index}`}><span>{pay.date}</span><span>{fmt(convertMinor(pay.amountMinor, row.currency, display, session?.ledger.settings.rateE4 ?? 0))}</span></li>)}
              </ul>
            ) : null}
            <button type="button" className="btn secondary" onClick={() => confirm({
              title: t("cobro.owe.move"),
              body: t("cobro.owe.move.body"),
              yes: t("cobro.owe.move"),
              run: () => {
                const line = Object.values(session?.ledger.months ?? {}).flatMap((month) => month.lines).find((item) => item.seriesId === row.seriesId || item.id === row.seriesId);
                if (line) commit((s) => upsertLine(s, { ...line, active: true }), row.name);
                saveFile(filed.filter((item) => item.id !== row.id));
              },
            })}>{t("cobro.owe.move")}</button>
          </article>
        )) : <p className="cobro-empty">{t("cobro.owe.file.empty")}</p>) : null}
      </div>
    </div>
  );
}

/**
 * Cobros: the over-time fold shared by Me deben and Debo (same switch, tiles and bars; only the data differ).
 * `events` are dated amounts already in the view currency; `out` paints the bars as money out (Clu orange in Tron).
 */
export function CobroSpan({ title, total, facts, events, out = false, help }: { title: string; total: number; facts: [string, number][]; events: { date: string; value: number }[]; out?: boolean; help?: string }) {
  const { t, fmt, lang } = useFaro();
  const [span, setSpan] = useState<"week" | "month" | "year">("month");
  const [openStats, setOpenStats] = useState(false);
  const now = new Date();
  const count = span === "week" ? 8 : span === "month" ? 6 : 5;
  const points = Array.from({ length: count }, (_, index) => {
    const i = count - 1 - index;
    let start = "";
    let end = "";
    let label = "";
    if (span === "week") {
      const day = new Date(now);
      day.setDate(day.getDate() - ((day.getDay() + 6) % 7) - i * 7);
      const stop = new Date(day);
      stop.setDate(day.getDate() + 7);
      start = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      end = `${stop.getFullYear()}-${String(stop.getMonth() + 1).padStart(2, "0")}-${String(stop.getDate()).padStart(2, "0")}`;
      label = String(day.getDate());
    } else if (span === "month") {
      const day = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const stop = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      start = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-01`;
      end = `${stop.getFullYear()}-${String(stop.getMonth() + 1).padStart(2, "0")}-01`;
      label = day.toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { month: "short" }).replace(".", "");
    } else {
      const year = now.getFullYear() - i;
      start = `${year}-01-01`;
      end = `${year + 1}-01-01`;
      label = String(year).slice(2);
    }
    const value = events.filter((ev) => ev.date >= start && ev.date < end).reduce((sum, ev) => sum + ev.value, 0);
    return { label, value };
  });
  const peak = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className={`span-cut${openStats ? " is-open" : ""}${out ? " is-out" : ""}`}>
      <div className="span-fold-bar">
        {openStats ? (
          <div className="span-filter" role="tablist" aria-label={title}>
            {(["week", "month", "year"] as const).map((id) => (
              <button key={id} type="button" aria-pressed={span === id} onClick={() => setSpan(id)}>{t(`study.span.${id}`)}</button>
            ))}
          </div>
        ) : (
          <button type="button" className="span-fold-main" onClick={() => setOpenStats(true)}>
            <span>{title}</span>
            <strong className="num">{fmt(total)}</strong>
          </button>
        )}
        {help && openStats ? <Hint topic={help} /> : null}
        <button type="button" className="fold-chev" aria-expanded={openStats} onClick={() => setOpenStats((on) => !on)}><ChevronDown /></button>
      </div>
      {openStats ? (
        <>
          <div className="cobro-facts">
            {facts.map(([label, value]) => <span key={label}><em>{label}</em><strong className="num">{fmt(value)}</strong></span>)}
          </div>
          <div className={`cut-lanes${out ? " is-out" : ""}`}>
            {points.map((point) => (
              <span key={`${span}-${point.label}`} className="cut-lane">
                <i style={{ height: `${Math.max(point.value > 0 ? 14 : 4, (point.value / peak) * 100)}%` }} />
                <b>{point.label}</b>
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Cobros({ onClose, jumped = false }: { onClose: () => void; jumped?: boolean }) {
  const { t, fmt, confirm, session, lang, lines } = useFaro();
  const [rows, setRows] = useState<Cobro[]>(readCobros);
  const [draft, setDraft] = useState(false);
  const [bonusFor, setBonusFor] = useState<string | null>(null);
  const [fileOpen, setFileOpen] = useState(false);
  const [side, setSide] = useState<"in" | "out">("out");
  const [dir, setDir] = useState(1);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLElement>(null);
  const display = session?.ledger.settings.display ?? "USD";
  const rate = session?.ledger.settings.rateE4 ?? 0;

  useEffect(() => {
    try { localStorage.setItem("faro-cobros", JSON.stringify(rows)); } catch { /* ignore */ }
  }, [rows]);
  useEffect(() => {
    box.current?.scrollIntoView({ block: "nearest" });
  }, []);
  useEffect(() => {
    const onBack = (e: Event) => {
      if (e.defaultPrevented) return;
      if (draft || bonusFor) {
        setDraft(false);
        setBonusFor(null);
        e.preventDefault();
        return;
      }
      // Debo → Préstamos keeps its own forms (add a loan, Abonar): back closes that form first, as in Me deben.
      if (document.querySelector('[data-anchor="cobros-loans"] .cobro-form')) {
        window.dispatchEvent(new Event("faro-loans-close"));
        e.preventDefault();
        return;
      }
      onClose();
      // Opened by "Ir allí" / a manual link: it was part of the jump, so back walks on to where the jump came from.
      if (!jumped) e.preventDefault();
    };
    window.addEventListener("faro-back", onBack, true);
    return () => window.removeEventListener("faro-back", onBack, true);
  }, [draft, bonusFor, onClose, jumped]);
  // "Ir allí" to a side or an archive of Cobros.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === "cobros-out" || id === "cobros-out-file") { setDir(1); setSide("out"); }
      else if (id === "cobros-loans" || id === "cobros-loans-file" || id === "cobros-debo-tabs") {
        // Debo → Préstamos: pick the sub-tab before the Debo side mounts (it reads the remembered choice).
        if (id !== "cobros-debo-tabs") { try { localStorage.setItem("faro-debo-tab", "loans"); } catch { /* ignore */ } }
        setDir(1); setSide("out");
      }
      else if (id === "cobros-in" || id === "cobros-file") { setDir(-1); setSide("in"); }
      if (id === "cobros-file") setFileOpen(true);
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);

  function asDisplay(minor: number, currency: Currency) {
    return convertMinor(minor, currency, display, rate);
  }
  function paidOf(row: Cobro) {
    return row.bonuses.reduce((sum, bonus) => sum + bonus.amountMinor, 0);
  }
  function leftOf(row: Cobro) {
    return cobroDue(row).left;
  }
  function saveDraft(d: { name: string; kind: "plain" | "interest"; amountMinor: number; aprBps: number; date: string }) {
    const next: Cobro = {
      id: uid(), person: d.name, kind: d.kind, amountMinor: d.amountMinor, currency: display, aprBps: d.aprBps,
      owedOn: d.date, startedOn: todayIso(), note: "", bonuses: [],
    };
    setRows((cur) => [next, ...cur]);
    setDraft(false);
  }
  function addBonus(id: string, minor: number, date: string) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const bonus: CobroBonus = { id: uid(), date, amountMinor: convertMinor(minor, display, row.currency, rate), note: "" };
    setRows((cur) => cur.map((item) => (item.id === id ? { ...item, bonuses: [...item.bonuses, bonus] } : item)));
  }
  const active = rows.filter((row) => !row.archived);
  const filed = rows.filter((row) => row.archived);
  const lent = active.reduce((sum, row) => sum + asDisplay(row.amountMinor, row.currency), 0);
  const paid = active.reduce((sum, row) => sum + asDisplay(paidOf(row), row.currency), 0);
  const left = active.reduce((sum, row) => sum + asDisplay(leftOf(row), row.currency), 0);
  const owedInterest = active.reduce((sum, row) => sum + asDisplay(cobroDue(row).interest, row.currency), 0);
  const nextOwed = active.filter((row) => leftOf(row) > 0 && row.owedOn && row.owedOn >= todayIso()).map((row) => row.owedOn).sort()[0] ?? "";
  const stamp = (iso: string) => iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—";

  function group(mode: "plain" | "interest") {
    const list = active.filter((row) => (mode === "interest" ? row.kind === "interest" : row.kind !== "interest"));
    return (
      <div className={`cobro-group${mode === "interest" ? " is-rate" : ""}`}>
        <h3>
          <i />
          <span>{t(mode === "interest" ? "cobro.rate" : "cobro.plain")}</span>
          <b>{list.length}</b>
        </h3>
        {list.length ? list.map((row) => (
          <LoanCard key={row.id} name={row.person} rate={row.kind === "interest"} leftView={asDisplay(leftOf(row), row.currency)}
            amountView={asDisplay(row.amountMinor, row.currency)} amountLabel={t("cobro.lent")} dateIso={row.owedOn} aprBps={row.aprBps}
            pays={row.bonuses.map((bonus) => ({ date: bonus.date, view: asDisplay(bonus.amountMinor, row.currency) }))}
            payLabel={t("cobro.bonus")} paying={bonusFor === row.id} onPaying={(on) => setBonusFor(on ? row.id : null)}
            onPay={(minor, date) => addBonus(row.id, minor, date)} archiveBody={t("cobro.archive.body")}
            onArchive={() => setRows((cur) => cur.map((item) => item.id === row.id ? { ...item, archived: true, archivedOn: todayIso(), unpaidMinor: leftOf(item) } : item))} hint="bono" />
        )) : <p className="cobro-empty">{t("cobro.empty")}</p>}
      </div>
    );
  }

  return (
    <section
      data-anchor="cobros"
      className={`cobros sheet-swap${side === "out" ? " is-due" : ""}`}
      ref={box}
      aria-label={t("cobro.open")}
      style={{ ["--accent" as string]: side === "out" ? "#c6ae86" : "#5d8eae" }}
      onPointerDown={(event) => {
        event.stopPropagation();
        drag.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => { if (drag.current) event.stopPropagation(); }}
      onPointerUp={(event) => {
        event.stopPropagation();
        const start = drag.current;
        drag.current = null;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        setDir(dx < 0 ? 1 : -1);
        setSide((current) => (dx < 0 ? (current === "in" ? "out" : "in") : (current === "out" ? "in" : "out")));
      }}
    >
      <div className="cobro-sides" role="tablist">
        <button type="button" aria-pressed={side === "in"} onClick={() => { setDir(-1); setSide("in"); }}>{t("cobro.owed")}</button>
        <button type="button" aria-pressed={side === "out"} onClick={() => { setDir(1); setSide("out"); }}>{t("cobro.owe")}</button>
      </div>
      {side === "out" ? <DeboSide dues={<DueOwe key="out" />} /> : (
      <div key="in" className="cobro-swap" data-dir={dir} data-anchor="cobros-in">
      <div className="cobro-top">
        <div>
          <strong className="num">{fmt(left)}</strong>
        </div>
        <button type="button" className="cobro-plus" aria-label={t("cobro.open")} aria-pressed={draft} onClick={() => setDraft((on) => !on)}>
          <Plus />
        </button>
      </div>
      <DeboSum help="me-deben" empty={t("debo.sum.owed.empty")} parts={active.length ? [
        [`${active.length} ${t(active.length === 1 ? "debo.sum.person1" : "debo.sum.personN")}`],
        ...(owedInterest > 0 ? [[{ num: fmt(owedInterest) }, t("debo.sum.interest")]] : [[{ num: fmt(paid) }, t("debo.sum.got")]]),
        ...(nextOwed ? [[`${t("debo.sum.nextGet")} ${new Date(`${nextOwed}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).replace(".", "")}`]] : []),
      ] : null} />
      {draft ? <LoanForm mode="lend" onCancel={() => setDraft(false)} onSave={saveDraft} /> : null}
      <CobroSpan title={t("cobro.span")} total={lent} events={rows.map((row) => ({ date: row.startedOn, value: asDisplay(row.amountMinor, row.currency) }))}
        facts={[[t("cobro.lent"), lent], [t("cobro.paid"), paid], [t("cobro.left"), left]]} />
      {group("plain")}
      {group("interest")}
      <div className={`cobro-file${fileOpen ? " is-open" : ""}`}>
        <div role="button" tabIndex={0} data-anchor="cobros-file" className="cobro-file-head" aria-expanded={fileOpen} onClick={() => setFileOpen((on) => !on)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFileOpen((on) => !on); } }}>
          <span className="lab-head">{t("cobro.file")}<Hint topic="archivar" /></span>
          <b>{filed.length}</b>
          <ChevronDown className={fileOpen ? "fold-chev is-open" : "fold-chev"} />
        </div>
        {fileOpen ? (
          filed.length ? filed.map((row) => (
            <article key={row.id} className="cobro-card is-file">
              <div className="cobro-who">
                <b>{row.person.slice(0, 1).toUpperCase()}</b>
                <strong>{row.person}</strong>
              </div>
              <p className="cobro-meta">
                {t("cobro.unpaid")} {fmt(asDisplay(row.unpaidMinor || leftOf(row), row.currency))}
                {" · "}
                {t("cobro.lent")} {fmt(asDisplay(row.amountMinor, row.currency))}
                {row.archivedOn ? ` · ${stamp(row.archivedOn)}` : ""}
              </p>
            </article>
          )) : <p className="cobro-empty">{t("cobro.file.empty")}</p>
        ) : null}
      </div>
      </div>
      )}
    </section>
  );
}

function SourceNote({ label, title, meaning, formula, implication, children }: { label: string; title: string; meaning: string; formula: string; implication: string; children: ReactNode }) {
  const box = useRef<HTMLDetailsElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = box.current;
      if (!el?.open || el.contains(e.target as Node)) return;
      el.open = false;
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  useLayer(shown, () => { if (box.current) box.current.open = false; });
  return (
    <details className="save-from" ref={box} onToggle={(e) => setShown((e.currentTarget as HTMLDetailsElement).open)}>
      <summary aria-label={label}>{children}</summary>
      <div className="card explain-pop text-sm">
        <p className="font-medium">{title}</p>
        <p>{meaning}</p>
        <p className="text-muted">{formula}</p>
        <p>{implication}</p>
      </div>
    </details>
  );
}

/** Tasa (?) placed right after the "Tasa" label of the desk-bar button, measured so it follows any theme/font size. */
function RateHint() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const me = ref.current; const bar = me?.parentElement; if (!me || !bar) return;
    const place = () => {
      const em = bar.querySelector<HTMLElement>('[data-anchor="desk-rate"] > em'); if (!em) return;
      const b = bar.getBoundingClientRect(); const r = em.getBoundingClientRect();
      // Range = the text itself (the em may stretch the cell width).
      const rg = document.createRange(); rg.selectNodeContents(em); const tr = rg.getBoundingClientRect();
      const right = tr.width ? tr.right : r.right;
      me.style.left = `${Math.round(right - b.left + 3)}px`;
      me.style.top = `${Math.round(r.top - b.top + r.height / 2)}px`;
      me.style.color = getComputedStyle(em).color; // same tint as the other bar (?)s, which sit inside their label
      me.style.visibility = "";
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(bar);
    const em = bar.querySelector('[data-anchor="desk-rate"]'); if (em) ro.observe(em);
    return () => ro.disconnect();
  }, []);
  return <span ref={ref} className="desk-rate-hint" style={{ visibility: "hidden" }}><Hint topic="tasa-rapida" className="is-bar" /></span>;
}

export function Desk({ focus }: { focus?: "save" | "meta" | "retiro" | "emergencia" } = {}) {
  const { t, summary, fmt, lines, copyPrev, ui, setUi, viewLine, names, session, commit, confirm, key, lang } = useFaro();
  const [lens, setLens] = useState<"all" | "have" | "spend" | "debt">("all");
  const lensByJump = useRef(false);
  const [cobros, setCobros] = useState(false);
  const [cobrosJump, setCobrosJump] = useState(false);
  const [lamp, setLamp] = useState<"good" | "warn" | "bad" | null>(null);
  const [flowDir, setFlowDir] = useState(1);
  const [quick, setQuick] = useState<null | "in" | "out">(null);
  const [jump, setJump] = useState<null | { kind: LineKind; categoryId: string; title: string }>(null);
  const holdTimer = useRef<{ in?: number; out?: number }>({});
  const clickTimer = useRef<{ in: number; out: number }>({ in: 0, out: 0 });
  const openTimer = useRef<{ in?: number; out?: number }>({});
  const heldFlag = useRef<{ in: boolean; out: boolean }>({ in: false, out: false });
  const [saveOn, setSaveOn] = useState<string | null>(null);
  const [openSave, setOpenSave] = useState<string | null>(null);
  const [deskLine, setDeskLine] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(() => {
    try { return localStorage.getItem("faro-save-accounts") === "1"; } catch { return false; }
  });
  const [accountsPin, setAccountsPin] = useState(() => {
    try { return localStorage.getItem("faro-save-accounts") === "1"; } catch { return false; }
  });
  const [banksPin, setBanksPin] = useState(() => {
    try { return localStorage.getItem("faro-vault-banks") === "1"; } catch { return false; }
  });
  const [banksFold, setBanksFold] = useState(() => {
    try { return localStorage.getItem("faro-vault-banks") !== "1"; } catch { return true; }
  });
  const [pocketPin, setPocketPin] = useState(() => {
    try { return localStorage.getItem(`faro-vault-pocket:${focus ?? "none"}`) === "1"; } catch { return false; }
  });
  const [pocketFold, setPocketFold] = useState(() => {
    try { return localStorage.getItem(`faro-vault-pocket:${focus ?? "none"}`) !== "1"; } catch { return true; }
  });
  const [vaultSort, setVaultSort] = useState(false);
  const [blockRank, setBlockRank] = useState<string[]>(() => (focus ? readVaultBlocks(focus) : []));
  const [accountFocus, setAccountFocus] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [accountIcon, setAccountIcon] = useState("");
  const [accountAmt, setAccountAmt] = useState("");
  const [accountSign, setAccountSign] = useState<1 | -1 | null>(null);
  const [pocketName, setPocketName] = useState("");
  const [pocketAmt, setPocketAmt] = useState("");
  const [pocketGlyph, setPocketGlyph] = useState("Flag");
  const [pocketColor, setPocketColor] = useState("#8fb9a6");
  const [pocketPicked, setPocketPicked] = useState(false);
  useEffect(() => { if (!adding) setPocketPicked(false); }, [adding]);
  const [lookId, setLookId] = useState<string | null>(null);
  const [retireDate, setRetireDate] = useState("");
  const [retireOpen, setRetireOpen] = useState<string | null>(null);
  const [retireDeskOpen, setRetireDeskOpen] = useState(false);
  const [vaultSpan, setVaultSpan] = useState<"week" | "month" | "year">("month");
  const [retireNow, setRetireNow] = useState("");
  const seeded = useRef(false);
  const bankDrag = useRef<string | null>(null);
  const renameLock = useRef(false);
  const bankOrder = useRef<string[]>([]);
  const [bankRank, setBankRank] = useState<string[] | null>(null);
  useEffect(() => {
    if (seeded.current || !session) return;
    try {
      if (localStorage.getItem("faro-save-presets") === "1") { seeded.current = true; return; }
    } catch { return; }
    const cat = session.ledger.structure.categories.find((c) => c.role === "savings" && !c.hidden);
    if (!cat) return;
    seeded.current = true;
    try { localStorage.setItem("faro-save-presets", "1"); } catch { /* ignore */ }
    const named = new Set(cat.subs.map((s) => (s.customName || "").trim().toLowerCase()));
    const banks = [
      ["vault-paypal", "PayPal", "vault:paypal"],
      ["vault-chase", "Chase", "vault:chase"],
      ["vault-statefarm", "State Farm", "vault:statefarm"],
      ["vault-lafise", "Lafise", "vault:lafise"],
      ["vault-banpro", "Banpro", "vault:banpro"],
      ["vault-bac", "BAC", "vault:bac"],
    ].filter(([id, name]) => !cat.subs.some((s) => s.id === id) && !named.has(name.toLowerCase()));
    const all = Object.values(session.ledger.months).flatMap((bucket) => bucket.lines);
    const pockets = [
      ["Viajes", cat.subs.find((s) => s.id.endsWith(".meta"))?.id, "Plane"],
      ["Primerica", cat.subs.find((s) => s.id.endsWith(".retiro"))?.id, "brand:primerica"],
      ["Carro", cat.subs.find((s) => s.id.endsWith(".emergencia"))?.id, "Car"],
    ].filter((row): row is [string, string, string] => {
      const subId = row[1];
      const concept = row[0];
      return !!subId && !!concept && !all.some((line) => line.subId === subId && line.concept.toLowerCase() === concept.toLowerCase());
    });
    if (!banks.length && !pockets.length) return;
    const display = session.ledger.settings.display;
    commit((s) => {
      const categories = s.structure.categories.map((c) => c.id !== cat.id ? c : {
        ...c,
        subs: [
          ...c.subs.map((sub) => {
            const known = [["paypal", "vault:paypal"], ["chase", "vault:chase"], ["state farm", "vault:statefarm"], ["lafise", "vault:lafise"], ["banpro", "vault:banpro"], ["bac", "vault:bac"]].find(([name]) => (sub.customName || "").trim().toLowerCase() === name);
            return known && known[1] && !vaultGlyph(sub.icon) && (sub.icon === "vault" || sub.icon.startsWith("vault:")) ? { ...sub, icon: known[1] } : sub;
          }),
          ...banks.map(([id, name, icon], i) => ({ id, nameKey: "", customName: name, icon, hidden: false, order: 90 + i })),
        ],
      });
      let next = { ...s, structure: { ...s.structure, categories } };
      for (const [concept, subId, icon] of pockets) {
        const id = uid();
        next = upsertLine(next, {
          id, seriesId: id, monthKey: key, kind: "expense-fixed", concept, amountMinor: 0, currency: display,
          active: true, note: "", categoryId: cat.id, subId, recurring: false, storeId: "", providerId: "",
          productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
          balanceCurrency: display, icon, history: [],
        });
      }
      for (const [id, name] of banks) {
        const lineId = uid();
        next = upsertLine(next, {
          id: lineId, seriesId: lineId, monthKey: key, kind: "expense-fixed", concept: name, amountMinor: 0, currency: display,
          active: true, note: "", categoryId: cat.id, subId: id, recurring: false, storeId: "", providerId: "",
          productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: 0,
          balanceCurrency: display, icon: "vault", history: [],
        });
      }
      return next;
    }, "presets");
  }, [session, commit, key]);
  useEffect(() => {
    if (!session) return;
    try {
      if (localStorage.getItem("faro-save-ni") === "1") return;
    } catch { return; }
    const cat = session.ledger.structure.categories.find((c) => c.role === "savings" && !c.hidden);
    if (!cat) return;
    try { localStorage.setItem("faro-save-ni", "1"); } catch { /* ignore */ }
    const display = session.ledger.settings.display;
    const wanted = [
      ["vault-lafise", "Lafise", "vault:lafise"],
      ["vault-banpro", "Banpro", "vault:banpro"],
      ["vault-bac", "BAC", "vault:bac"],
    ] as const;
    commit((s) => {
      const current = s.structure.categories.find((c) => c.id === cat.id);
      if (!current) return s;
      const named = new Set(current.subs.map((sub) => (sub.customName || "").trim().toLowerCase()));
      const banks = wanted.filter(([id, name]) => !current.subs.some((sub) => sub.id === id) && !named.has(name.toLowerCase()));
      if (!banks.length) return s;
      const categories = s.structure.categories.map((c) => c.id !== current.id ? c : {
        ...c,
        subs: [...c.subs, ...banks.map(([id, name, icon], i) => ({ id, nameKey: "", customName: name, icon, hidden: false, order: 93 + i }))],
      });
      let next = { ...s, structure: { ...s.structure, categories } };
      for (const [id, name] of banks) {
        const lineId = uid();
        next = upsertLine(next, {
          id: lineId, seriesId: lineId, monthKey: key, kind: "expense-fixed", concept: name, amountMinor: 0, currency: display,
          active: true, note: "", categoryId: current.id, subId: id, recurring: false, storeId: "", providerId: "",
          productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: 0,
          balanceCurrency: display, icon: "vault", history: [],
        });
      }
      return next;
    }, "ni-banks");
  }, [session, commit, key]);
  const quickRef = useRef<HTMLDivElement>(null);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const segTap = useRef<{ id: string; at: number } | null>(null);
  const focusApplied = useRef<string | null>(null);
  useEffect(() => {
    const onBack = (e: Event) => {
      if ((window as Window & { __faroLook?: number }).__faroLook) {
        e.preventDefault();
        return;
      }
      if (e.defaultPrevented) return;
      if (deskLine) {
        setDeskLine(null);
        e.preventDefault();
        return;
      }
      if (editId || adding || moving) {
        setEditId(null);
        setAdding(false);
        setMoving(null);
        e.preventDefault();
        return;
      }
      // On a savings tab the open pocket IS the tab: back walks the tabs (provider history), it does not fold it.
      if (openSave && !focus) {
        setOpenSave(null);
        setSaveOn(null);
        e.preventDefault();
        return;
      }
      if (accountsOpen && !accountsPin && !focus) {
        setAccountsOpen(false);
        e.preventDefault();
        return;
      }
      if (lens === "all") return;
      setLens("all");
      // A lens picked by "Ir allí" was part of the jump: back walks on to where the jump came from.
      if (lensByJump.current) { lensByJump.current = false; return; }
      e.preventDefault();
    };
    window.addEventListener("faro-back", onBack);
    return () => window.removeEventListener("faro-back", onBack);
  }, [lens, openSave, editId, adding, moving, accountsOpen, accountsPin, deskLine, focus]);
  useEffect(() => {
    if (!quick) return;
    quickRef.current?.scrollIntoView({ block: "nearest" });
    const hide = (e: Event) => {
      const target = e.target;
      if (target instanceof Element && (quickRef.current?.contains(target) || target.closest(".lens-corner"))) return;
      if (quickRef.current?.querySelector("[data-reporting]")) return;
      setQuick(null);
    };
    const onBack = (e: Event) => {
      if (e.defaultPrevented) return;
      if (quickRef.current?.querySelector("[data-reporting]")) return;
      setQuick(null);
      e.preventDefault();
    };
    document.addEventListener("pointerdown", hide, true);
    window.addEventListener("faro-back", onBack, true);
    return () => {
      document.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("faro-back", onBack, true);
    };
  }, [quick]);
  useEffect(() => {
    const order = ["have", "spend", "debt"] as const;
    const onLens = (e: Event) => {
      const dir = (e as CustomEvent<number>).detail;
      setFlowDir(dir);
      lensByJump.current = false;
      setLens((cur) => {
        const i = order.indexOf(cur as (typeof order)[number]);
        const base = i < 0 ? (dir > 0 ? -1 : 0) : i;
        return order[(base + dir + order.length) % order.length];
      });
    };
    window.addEventListener("faro-lens", onLens);
    return () => window.removeEventListener("faro-lens", onLens);
  }, []);
  // "Ir allí" / [[links]]: pick a lens or open Cobros.
  useEffect(() => {
    if (focus) return;
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === "cobros") { setQuick(null); setJump(null); setCobrosJump(true); setCobros(true); }
      else if (id === "lens-have" || id === "lens-spend" || id === "lens-debt") { lensByJump.current = true; setLens(id.slice(5) as "have" | "spend" | "debt"); }
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, [focus]);
  useEffect(() => {
    if (!focus || !session) return;
    if (focusApplied.current === focus) return;
    focusApplied.current = focus;
    if (focus === "save") {
      setAccountsOpen(true);
      setOpenSave(null);
      setSaveOn(null);
      return;
    }
    const sub = session.ledger.structure.categories
      .filter((c) => c.role === "savings")
      .flatMap((c) => c.subs)
      .find((s) => s.id.endsWith(`.${focus}`));
    if (!sub) return;
    setAccountsOpen(false);
    setSaveOn(sub.id);
    setOpenSave(sub.id);
  }, [focus, session]);
  if (!summary || !session) return null;
  const debtIds = new Set(session.ledger.structure.categories.filter((c) => c.role === "debt").map((c) => c.id));
  const shown = lines.filter((line) => {
    if (lens === "have") return line.kind.startsWith("income");
    if (lens === "debt") return debtIds.has(line.categoryId) || line.kind === "subscription";
    if (lens === "spend") return !line.kind.startsWith("income");
    return true;
  });
  const rate = session.ledger.settings;
  const spent = summary.spentPct === null ? "—" : `${Math.round(summary.spentPct)}%`;
  const savingsCats = session.ledger.structure.categories.filter((c) => c.role === "savings" && !c.hidden);
  const savingsIds = new Set(savingsCats.map((c) => c.id));
  const vaultIds = new Set(savingsCats.flatMap((c) => c.subs.filter((s) => s.icon === "vault" || s.icon.startsWith("vault:")).map((s) => s.id)));
  const seed = savingsCats.flatMap((c) => c.subs.filter((s) => !s.hidden && s.icon !== "vault" && !s.icon.startsWith("vault:")).map((s) => ({ id: s.id, name: names.sub(s.id), categoryId: c.id })));
  const subCat = new Map(seed.map((s) => [s.id, s.categoryId]));
  const buckets = new Map<string, number>();
  for (const line of lines) {
    if (!line.active || !savingsIds.has(line.categoryId) || vaultIds.has(line.subId)) continue;
    const id = line.subId && seed.some((s) => s.id === line.subId) ? line.subId : "rest";
    buckets.set(id, (buckets.get(id) ?? 0) + convertMinor(line.balanceMinor != null ? line.balanceMinor : line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, rate.display, rate.rateE4));
  }
  const saveSegs = (seed.length ? seed : [{ id: "rest", name: t("desk.savings"), categoryId: savingsCats[0]?.id ?? "" }]).map((s) => ({ ...s, minor: buckets.get(s.id) ?? 0 }));
  const rest = buckets.get("rest") ?? 0;
  if (rest > 0 && seed.length) saveSegs.push({ id: "rest", name: t("desk.savings"), categoryId: savingsCats[0]?.id ?? "", minor: rest });
  const saveTotal = saveSegs.reduce((acc, s) => acc + s.minor, 0);
  const savePeak = Math.max(...saveSegs.map((s) => s.minor), 1);
  const saveTints = ["#8fb9a6", "#72b4b2", "#7aa2c4", "#e07a5f", "#c9a6d4", "#d7b48a"].map((c) => (isTron() ? tronize(c) : c));
  const openSeg = saveSegs.find((s) => s.id === openSave) ?? null;
  const openLines = openSave
    ? lines.filter((line) => {
        if (!savingsIds.has(line.categoryId)) return false;
        const id = line.subId && seed.some((s) => s.id === line.subId) ? line.subId : "rest";
        return id === openSave;
      })
    : [];
  const accountRows = savingsCats.flatMap((c) => c.subs.filter((s) => !s.hidden && (s.icon === "vault" || s.icon.startsWith("vault:"))).map((s) => {
    const minor = lines.filter((line) => line.active && line.subId === s.id).reduce((sum, line) => sum + convertMinor(line.balanceMinor ?? line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, rate.display, rate.rateE4), 0);
    return { id: s.id, name: s.customName || names.sub(s.id), categoryId: c.id, minor, icon: s.icon, order: s.order };
  }));
  const accountTotal = accountRows.reduce((sum, row) => sum + row.minor, 0);
  const fixedSave = lines.filter((line) => line.active && line.kind === "expense-fixed" && savingsIds.has(line.categoryId) && !vaultIds.has(line.subId));
  const aside = fixedSave.reduce((sum, line) => sum + convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4), 0);
  const orderedAccounts = [...accountRows].sort((a, b) => a.order - b.order);
  const bankRows = bankRank
    ? [...bankRank.flatMap((id) => orderedAccounts.filter((row) => row.id === id)), ...orderedAccounts.filter((row) => !bankRank.includes(row.id))]
    : orderedAccounts;
  const focusedAccount = accountRows.find((row) => row.id === accountFocus) ?? null;
  const pocketKind = openSeg?.id.endsWith(".meta") ? "meta" : openSeg?.id.endsWith(".emergencia") ? "emergencia" : openSeg?.id.endsWith(".retiro") ? "retiro" : "";
  const retireLine = pocketKind === "retiro" ? (openLines.find((line) => line.startedOn || line.balanceMinor != null) ?? openLines[0] ?? null) : null;
  const retireStart = retireDate || retireLine?.startedOn || "";
  const retireHits = retireStart ? payDates(retireStart, "monthly") : [];
  const retireSend = openLines.reduce((sum, line) => sum + convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4), 0);
  const retireAccrued = retireHits.length * retireSend;

  function pickSeg(id: string) {
    const now = performance.now();
    const repeat = segTap.current?.id === id && now - segTap.current.at < 450;
    segTap.current = { id, at: now };
    setSaveOn(id);
    setEditId(null);
    setAdding(false);
    setMoving(null);
    if (repeat) {
      setOpenSave(id);
      window.setTimeout(() => ledgerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 40);
      return;
    }
    setOpenSave((cur) => {
      const next = cur === id ? null : id;
      if (next) window.setTimeout(() => ledgerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 40);
      return next;
    });
  }

  function rekind(line: Line, kind: LineKind) {
    if (line.kind === kind) return;
    commit((s) => upsertLine(s, { ...line, kind }), line.concept || kind);
  }

  function deskWork(line: Line) {
    if (deskLine !== line.id) return null;
    const flexible = line.kind === "expense-fixed" || line.kind === "subscription";
    return (
      <div className="desk-edit">
        {flexible ? (
          <div className="desk-kind" role="group">
            <button type="button" aria-pressed={line.kind === "expense-fixed"} onClick={() => rekind(line, "expense-fixed")}>{t("group.fixed")}</button>
            <button type="button" aria-pressed={line.kind === "subscription"} onClick={() => rekind(line, "subscription")}>{t("tab.subs")}</button>
          </div>
        ) : null}
        <div className="line-edit"><p className="line-edit-head"><span aria-hidden><Pencil /></span>{t("edit")}<Hint topic="editor" className="is-head" /><b>{line.concept}</b></p>
          <LineForm key={`${line.id}-${line.kind}`} kind={line.kind} existing={line} onClose={() => setDeskLine(null)} />
        </div>
      </div>
    );
  }

  function relocate(line: (typeof lines)[number], dest: string) {
    const categoryId = dest === "rest" ? line.categoryId : (subCat.get(dest) ?? line.categoryId);
    commit((s) => upsertLine(s, { ...line, categoryId, subId: dest === "rest" ? "" : dest }), line.concept || names.sub(dest));
    setMoving(null);
  }

  function freshLine(concept: string, minor: number, subId: string, categoryId: string, extra: Partial<Line> = {}): Line {
    const id = uid();
    return {
      id,
      seriesId: id,
      monthKey: key,
      kind: "expense-fixed",
      concept,
      amountMinor: minor,
      currency: rate.display,
      active: true,
      note: "",
      categoryId,
      subId,
      recurring: false,
      storeId: "",
      providerId: "",
      productCode: "",
      productUrl: "",
      cadence: "",
      nextDue: "",
      aprBps: 0,
      balanceMinor: null,
      balanceCurrency: rate.display,
      icon: "",
      history: [],
      ...extra,
    };
  }

  function addAccount() {
    const cat = savingsCats[0];
    const name = accountName.trim();
    const minor = parseAmount(accountAmt);
    if (!cat || !name || minor === null) return;
    const subId = `vault-${uid().slice(0, 8)}`;
    const icon = accountIcon ? `vault:${accountIcon}` : "vault";
    const line = freshLine(name, minor, subId, cat.id, { balanceMinor: minor, icon: "vault", seriesId: subId });
    commit((s) => upsertLine({
      ...s,
      structure: {
        ...s.structure,
        categories: s.structure.categories.map((c) => c.id !== cat.id ? c : {
          ...c,
          subs: [...c.subs, { id: subId, nameKey: "", customName: name, icon, hidden: false, order: c.subs.reduce((max, sub) => Math.max(max, sub.order), 0) + 1 }],
        }),
      },
    }, line), name);
    setAccountName("");
    setAccountAmt("");
    setAccountIcon("");
  }
  function saveRename(row: { id: string; categoryId: string; name: string }) {
    if (renameLock.current) return;
    renameLock.current = true;
    queueMicrotask(() => { renameLock.current = false; });
    const next = renameValue.trim();
    setRenameId(null);
    if (!next || next === row.name) return;
    confirm({
      title: t("edit"),
      body: `${row.name} → ${next}`,
      yes: t("yes"),
      run: () => commit((s) => ({
        ...s,
        structure: {
          ...s.structure,
          categories: s.structure.categories.map((c) => c.id !== row.categoryId ? c : {
            ...c,
            subs: c.subs.map((sub) => sub.id === row.id ? { ...sub, customName: next } : sub),
          }),
        },
      }), next),
    });
  }
  function renamePocket(line: (typeof lines)[number], label: string) {
    if (renameLock.current) return;
    renameLock.current = true;
    queueMicrotask(() => { renameLock.current = false; });
    const next = renameValue.trim();
    setRenameId(null);
    if (!next || next === label) return;
    confirm({
      title: t("edit"),
      body: `${label} → ${next}`,
      yes: t("yes"),
      run: () => commit((s) => upsertLine(s, { ...line, concept: next }), next),
    });
  }

  function setOpening(row: { id: string; name: string; categoryId: string }) {
    const minor = parseAmount(accountAmt);
    if (minor === null) return;
    const today = new Date().toISOString().slice(0, 10);
    const existing = lines.find((line) => line.subId === row.id);
    const line = existing
      ? { ...existing, concept: row.name, amountMinor: minor, balanceMinor: minor, currency: rate.display, balanceCurrency: rate.display, startedOn: existing.startedOn || today }
      : freshLine(row.name, minor, row.id, row.categoryId, { balanceMinor: minor, icon: "vault", seriesId: row.id, startedOn: today });
    commit((s) => upsertLine(s, line), row.name);
    setAccountAmt("");
    setAccountSign(null);
    setAccountFocus(null);
  }

  function adjustAccount(row: { id: string; name: string; categoryId: string }, sign: 1 | -1) {
    const delta = parseAmount(accountAmt);
    if (delta === null) return;
    const existing = lines.find((line) => line.subId === row.id);
    const base = existing
      ? convertMinor(existing.balanceMinor ?? existing.amountMinor, existing.balanceMinor != null ? existing.balanceCurrency : existing.currency, rate.display, rate.rateE4)
      : 0;
    const next = Math.max(0, base + sign * Math.abs(delta));
    const today = new Date().toISOString().slice(0, 10);
    const line = existing
      ? {
          ...existing,
          concept: row.name,
          amountMinor: next,
          balanceMinor: next,
          currency: rate.display,
          balanceCurrency: rate.display,
          startedOn: existing.startedOn || today,
          history: [...existing.history, { id: uid(), date: today, amountMinor: sign * Math.abs(delta), currency: rate.display, note: sign > 0 ? "deposito" : "retiro" }],
        }
      : freshLine(row.name, next, row.id, row.categoryId, { balanceMinor: next, icon: "vault", seriesId: row.id, startedOn: today });
    commit((s) => upsertLine(s, line), row.name);
    setAccountAmt("");
    setAccountFocus(null);
  }

  function dropAccount(row: { id: string; name: string; categoryId: string }) {
    confirm({
      title: t("delete"),
      body: `${row.name}. ${t("delete.warn")}`,
      danger: true,
      yes: t("yes"),
      run: () => commit((s) => {
        const months = Object.fromEntries(Object.entries(s.months).map(([month, bucket]) => [month, { lines: bucket.lines.filter((line) => line.subId !== row.id) }]));
        return {
          ...s,
          months,
          structure: {
            ...s.structure,
            categories: s.structure.categories.map((c) => c.id !== row.categoryId ? c : { ...c, subs: c.subs.filter((sub) => sub.id !== row.id) }),
          },
        };
      }, row.name),
    });
  }

  function rankAccounts(ids: string[]) {
    const cat = savingsCats[0];
    if (!cat || !ids.length) return;
    commit((s) => ({
      ...s,
      structure: {
        ...s.structure,
        categories: s.structure.categories.map((c) => {
          if (c.id !== cat.id) return c;
          const vaults = c.subs.filter((sub) => sub.icon === "vault" || sub.icon.startsWith("vault:"));
          const rest = c.subs.filter((sub) => sub.icon !== "vault" && !sub.icon.startsWith("vault:"));
          const ranked = ids.flatMap((id, i) => {
            const sub = vaults.find((item) => item.id === id);
            return sub ? [{ ...sub, order: i }] : [];
          });
          const left = vaults.filter((sub) => !ids.includes(sub.id)).map((sub, i) => ({ ...sub, order: ranked.length + i }));
          return { ...c, subs: [...rest, ...ranked, ...left] };
        }),
      },
    }), "order");
  }

  function startBankDrag(id: string, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    bankDrag.current = id;
    bankOrder.current = bankRows.map((row) => row.id);
    setBankRank([...bankOrder.current]);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveBankDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const id = bankDrag.current;
    if (!id) return;
    event.preventDefault();
    const rows = [...document.querySelectorAll<HTMLElement>("[data-bank]")].filter((row) => row.dataset.bank !== id);
    let at = rows.length;
    for (let i = 0; i < rows.length; i += 1) {
      const box = rows[i].getBoundingClientRect();
      if (event.clientY < box.top + box.height / 2) {
        at = i;
        break;
      }
    }
    const next = bankOrder.current.filter((item) => item !== id);
    next.splice(at, 0, id);
    if (next.join() === bankOrder.current.join()) return;
    bankOrder.current = next;
    setBankRank([...next]);
  }

  function endBankDrag() {
    if (!bankDrag.current) return;
    bankDrag.current = null;
    rankAccounts(bankOrder.current);
    setBankRank(null);
  }

  function addPocket() {
    if (!openSeg) return;
    const name = pocketName.trim();
    const minor = parseAmount(pocketAmt);
    if (!name || minor === null) return;
    commit((s) => upsertLine(s, freshLine(name, minor, openSeg.id === "rest" ? "" : openSeg.id, openSeg.categoryId, { icon: pocketGlyph, color: pocketColor })), name);
    setPocketName("");
    setPocketAmt("");
    setAdding(false);
  }

  function paintLine(line: Line, patch: Partial<Line>) {
    commit((s) => upsertLine(s, { ...line, ...patch }), line.concept || "look");
  }

  function paintBank(row: { id: string; categoryId: string }, icon?: string, color?: string) {
    commit((s) => {
      const categories = icon ? s.structure.categories.map((c) => c.id !== row.categoryId ? c : {
        ...c,
        subs: c.subs.map((sub) => sub.id === row.id ? { ...sub, icon: icon.startsWith("vault:") ? icon : `vault:g:${icon}` } : sub),
      }) : s.structure.categories;
      const months = { ...s.months };
      for (const [month, bucket] of Object.entries(months)) {
        months[month] = {
          lines: bucket.lines.map((line) => line.subId === row.id ? { ...line, ...(icon ? { icon } : {}), ...(color ? { color } : {}) } : line),
        };
      }
      return { ...s, structure: { ...s.structure, categories }, months };
    }, row.id);
  }

  function saveRetire(target?: (typeof lines)[number] | null) {
    if (!openSeg) return;
    const line = target === undefined ? retireLine : target;
    const nowMinor = parseAmount(retireNow);
    const start = (line && retireOpen === line.id ? retireDate : "") || line?.startedOn || retireDate || "";
    const next: Line = line
      ? {
          ...line,
          startedOn: start || line.startedOn,
          cadence: start ? "monthly" : line.cadence,
          recurring: start ? true : line.recurring,
          balanceMinor: nowMinor === null ? line.balanceMinor : nowMinor,
          balanceCurrency: rate.display,
        }
      : freshLine(openSeg.name, 0, openSeg.id, openSeg.categoryId, {
          startedOn: start,
          cadence: start ? "monthly" : "",
          recurring: !!start,
          balanceMinor: nowMinor,
          balanceCurrency: rate.display,
        });
    commit((s) => upsertLine(s, next), openSeg.name);
    setRetireNow("");
  }

  function toggleAccountsPin() {
    setAccountsPin((on) => {
      const next = !on;
      try { localStorage.setItem("faro-save-accounts", next ? "1" : "0"); } catch { /* ignore */ }
      if (next) setAccountsOpen(true);
      return next;
    });
  }
  function toggleBanksPin() {
    setBanksPin((on) => {
      const next = !on;
      try { localStorage.setItem("faro-vault-banks", next ? "1" : "0"); } catch { /* ignore */ }
      if (next) setBanksFold(false);
      return next;
    });
  }
  function toggleBanksFold() {
    setBanksFold((folded) => {
      const next = !folded;
      if (next) {
        setBanksPin(false);
        try { localStorage.setItem("faro-vault-banks", "0"); } catch { /* ignore */ }
      }
      return next;
    });
  }
  function togglePocketPin() {
    const store = `faro-vault-pocket:${focus ?? "none"}`;
    setPocketPin((on) => {
      const next = !on;
      try { localStorage.setItem(store, next ? "1" : "0"); } catch { /* ignore */ }
      if (next) setPocketFold(false);
      return next;
    });
  }
  function togglePocketFold() {
    const store = `faro-vault-pocket:${focus ?? "none"}`;
    setPocketFold((folded) => {
      const next = !folded;
      if (next) {
        setPocketPin(false);
        setAdding(false);
        try { localStorage.setItem(store, "0"); } catch { /* ignore */ }
      }
      return next;
    });
  }

  function focusLens(id: "have" | "spend" | "debt") {
    lensByJump.current = false;
    const order = ["have", "spend", "debt"] as const;
    if (lens !== "all" && lens !== id) setFlowDir(order.indexOf(id) >= order.indexOf(lens) ? 1 : -1);
    setLens((cur) => (cur === id ? "all" : id));
  }

  function gestureOf(slot: string) {
    const raw = session?.ledger.settings.gestures?.[slot];
    if (!raw) return null;
    const [kind, categoryId = ""] = raw.split(":");
    const title = kind === "income-fixed" ? t("income.fixed")
      : kind === "income-variable" ? t("income.variable")
      : kind === "subscription" ? t("tab.subs")
      : kind === "purchase" ? names.purchase(categoryId)
      : names.cat(categoryId);
    return { kind: kind as LineKind, categoryId, title };
  }
  function corner(mode: "in" | "out") {
    const clearHold = () => {
      if (holdTimer.current[mode]) window.clearTimeout(holdTimer.current[mode]);
      holdTimer.current[mode] = undefined;
    };
    return {
      onPointerDown: () => {
        heldFlag.current[mode] = false;
        clearHold();
        holdTimer.current[mode] = window.setTimeout(() => {
          heldFlag.current[mode] = true;
          const hit = gestureOf(`${mode}.hold`);
          if (!hit) return;
          setJump(hit);
          setQuick(mode);
        }, 1000);
      },
      onPointerUp: clearHold,
      onPointerLeave: clearHold,
      onPointerCancel: clearHold,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
      onClick: () => {
        if (heldFlag.current[mode]) {
          heldFlag.current[mode] = false;
          return;
        }
        if (openTimer.current[mode]) {
          window.clearTimeout(openTimer.current[mode]);
          openTimer.current[mode] = undefined;
        }
        if (cobros || (quick && quick !== mode)) {
          if (quick && quick !== mode) (window as Window & { __faroQuickSwap?: boolean }).__faroQuickSwap = true;
          setCobros(false);
          setJump(null);
          setQuick(mode);
          clickTimer.current[mode] = Date.now();
          return;
        }
        const now = Date.now();
        const doubled = now - (clickTimer.current[mode] ?? 0) < 170;
        clickTimer.current[mode] = now;
        if (openTimer.current[mode]) {
          window.clearTimeout(openTimer.current[mode]);
          openTimer.current[mode] = undefined;
        }
        if (doubled) {
          const hit = gestureOf(`${mode}.double`);
          if (hit) {
            setJump(hit);
            setQuick(mode);
            return;
          }
        }
        const open = () => {
          openTimer.current[mode] = undefined;
          setJump(null);
          setQuick((cur) => (cur === mode ? null : mode));
        };
        if (!gestureOf(`${mode}.double`)) {
          open();
          return;
        }
        openTimer.current[mode] = window.setTimeout(open, 170);
      },
    };
  }

  const vaultStore = focus === "meta" || focus === "retiro" || focus === "emergencia" ? focus : focus === "save" ? "save" : pocketKind;
  const vaultTone0 = vaultStore === "meta" ? "#8fb9a6" : vaultStore === "retiro" ? "#72b4b2" : vaultStore === "emergencia" ? "#7aa2c4" : vaultStore === "save" ? SAVINGS_PURPLE : "#d5e2ea";
  const vaultTone = isTron() ? tronize(vaultTone0) : vaultTone0;
  const vaultBase = focus === "save" ? accountTotal : (openSeg?.minor ?? 0);
  const spanNode = (
    <SpanCut
      kinds={[]}
      subs={focus === "save"
        ? savingsCats.flatMap((c) => c.subs.filter((s) => !s.id.endsWith(".meta") && !s.id.endsWith(".retiro") && !s.id.endsWith(".emergencia")).map((s) => s.id))
        : savingsCats.flatMap((c) => c.subs.filter((s) => s.id.endsWith(`.${focus}`)).map((s) => s.id))}
      span={vaultSpan}
      onSpan={setVaultSpan}
      pinKey={`vault:${focus ?? "save"}`}
      saving
      tone={vaultTone}
    />
  );
  const leverNode = vaultStore ? <VaultLever base={vaultBase} tone={vaultTone} storeId={vaultStore} /> : null;
  function blockAt(id: string) {
    const at = blockRank.indexOf(id);
    return at < 0 ? 9 : at;
  }
  function moveBlock(id: string, dir: -1 | 1) {
    if (!focus) return;
    setBlockRank((cur) => {
      const base = cur.length ? [...cur] : readVaultBlocks(focus);
      const index = base.indexOf(id);
      const to = index + dir;
      if (index < 0 || to < 0 || to >= base.length) return cur.length ? cur : base;
      const [row] = base.splice(index, 1);
      base.splice(to, 0, row!);
      try { localStorage.setItem(`faro-vault-blocks:${focus}`, JSON.stringify(base)); } catch { /* ignore */ }
      return base;
    });
  }
  function blockArrows(id: string) {
    const at = blockAt(id);
    return (
      <div className="vault-shift">
        <button type="button" aria-label={t("study.sort.up")} disabled={at <= 0} onClick={() => moveBlock(id, -1)}><ChevronUp /></button>
        <button type="button" aria-label={t("study.sort.down")} disabled={at >= blockRank.length - 1} onClick={() => moveBlock(id, 1)}><ChevronDown /></button>
      </div>
    );
  }

  return (
    <div className={focus ? "vault-pane" : "desk-layout"}>
      {focus ? null : (
      <>
      <div className="desk-bar" data-over={summary.spentPct !== null && summary.spentPct > 100 ? "" : undefined} style={{ ["--usedf" as string]: String(Math.max(0, Math.min(1, (summary.spentPct ?? 0) / 100))) }}>
        <span data-anchor="desk-left">
          <em className="bar-head">{t("desk.bar.left")}<Hint topic="queda" className="is-bar" /></em>
          <strong className={`num ${summary.opportunity < 0 ? "bad" : ""}`}>{fmt(summary.opportunity)}</strong>
        </span>
        <span data-anchor="desk-used">
          <em className="bar-head">{t("desk.bar.used")}<Hint topic="usado" alt={summary.spentPct !== null && summary.spentPct > 100} className="is-bar" avoid='.desk-bar @[data-anchor="desk-rate"]' fallback='[data-anchor="desk-used"] > strong|[data-anchor="desk-rate"]' /></em>
          <strong className="num">{spent}</strong>
        </span>
        <button type="button" data-anchor="desk-rate" onClick={() => {
          // Tablet / wide screen: Cambio opens in the side panel that already holds it; phones keep the sheet.
          if (window.matchMedia("(width >= 1100px)").matches && !document.querySelector(".app-frame.is-split")) window.dispatchEvent(new CustomEvent("faro-open", { detail: "money-aside" }));
          else setUi({ instruments: true, calcOpen: true });
        }}>
          <em>{t("desk.bar.rate")}</em>
          <strong className="num">C${formatRate(rate.rateE4)}</strong>
        </button>
        {/* The Tasa (?) cannot live inside the button; it is laid just after the button's own label (measured), so nothing moves. */}
        <RateHint />
      </div>
      <div className="lenses">
        <div className="lens-wrap">
          <Hint topic="tengo" className="is-lens" group="lens" avoid=".lens-wrap .lens-kicker > span:last-child" />
          <button type="button" data-anchor="lens-have" className={`lens is-have${lens === "have" ? " is-picked" : ""}`} data-lens="have" aria-pressed={lens === "have"} onClick={() => focusLens("have")}>
            <span className="lens-kicker"><span className="lens-mark"><ArrowDownLeft className="size-3" /></span><span>{t("desk.have")}</span></span>
            <span className="lens-value num">{fmt(summary.income)}</span>
            <span className="lens-note">{t("desk.have.note")}</span>
          </button>
          <button type="button" data-anchor="desk-plus" className="lens-corner is-plus" aria-label={t("desk.addIn")} aria-pressed={quick === "in"} {...corner("in")}>
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="lens-wrap">
          <Hint topic="gastare" className="is-lens" group="lens" avoid=".lens-wrap .lens-kicker > span:last-child" />
          <button type="button" data-anchor="lens-spend" className={`lens is-spend${lens === "spend" ? " is-picked" : ""}`} data-lens="spend" aria-pressed={lens === "spend"} onClick={() => focusLens("spend")}>
            <span className="lens-kicker"><span className="lens-mark"><ArrowUpRight className="size-3" /></span><span>{t("desk.spend")}</span></span>
            <span className="lens-value num">−{fmt(summary.expense)}</span>
            <span className="lens-note">{t("desk.spend.note")}</span>
          </button>
          <button type="button" data-anchor="desk-minus" className="lens-corner is-minus" aria-label={t("desk.addOut")} aria-pressed={quick === "out"} {...corner("out")}>
            <span aria-hidden>−</span>
          </button>
        </div>
        <div className="lens-wrap">
          <Hint topic="pagos" className="is-lens" group="lens" avoid=".lens-wrap .lens-kicker > span:last-child" />
          <button type="button" data-anchor="lens-debt" className={`lens is-debt tone-${summary.tone}${lens === "debt" ? " is-picked" : ""}`} data-lens="debt" aria-pressed={lens === "debt"} onClick={() => focusLens("debt")}>
            <span className="lens-kicker"><span className="lens-mark"><CreditCard className="size-3" /></span><span>{t("desk.debt")}</span></span>
            <span className="lens-value num">{fmt(summary.debt)}</span>
            <span className="lens-note">{t("desk.debt.note")}</span>
          </button>
          <button type="button" data-anchor="desk-cobro" className="lens-corner is-cobro" aria-label={t("cobro.open")} aria-pressed={cobros} onClick={() => {
            setCobrosJump(false);
            if (quick) {
              setJump(null);
              setQuick(null);
              setCobros(true);
              return;
            }
            setCobros((on) => !on);
          }}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <circle cx="5.6" cy="4.7" r="1.85" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2.5 12.5c.5-2.2 1.7-3.2 3.1-3.2s2.6 1 3.1 3.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="6.5" r="2.15" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 5.55v1.9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {quick ? (
        <div ref={quickRef} className="sheet-swap">
          <QuickAdd key={`${quick}-${jump?.kind ?? ""}-${jump?.categoryId ?? ""}`} mode={quick} jump={jump} onClose={() => { setLens(quick === "in" ? "have" : "spend"); setQuick(null); setJump(null); }} />
        </div>
      ) : null}
      {cobros ? <Cobros jumped={cobrosJump} onClose={() => { setCobros(false); setCobrosJump(false); }} /> : null}
      </>
      )}
      <section data-anchor={focus ? undefined : "desk-save"} className={`save-band${focus ? " is-records" : ""}${focus === "save" ? " is-save" : ""}${!focus || focus === "save" ? " sav-scope" : ""}`} style={!focus || focus === "save" ? { ["--sav" as string]: isTron() ? tronize(SAVINGS_PURPLE) : SAVINGS_PURPLE } : undefined} aria-label={t("desk.savings")}>
        {focus ? <button type="button" data-anchor="vault-sort" className={`vault-lamp${vaultSort ? " is-on" : ""}`} aria-pressed={vaultSort} aria-label={t("vault.sort")} onClick={() => setVaultSort((on) => !on)} /> : null}
        {focus ? null : (
        <>
        <div className="save-head">
          <div className="save-name">
            <button type="button" data-anchor="desk-accounts" className="icon-btn bank-tap" aria-label={t("save.accounts")} aria-expanded={accountsOpen} onClick={() => setAccountsOpen((v) => !v)}>
              <svg viewBox="0 0 32 32" className="bank-mark" aria-hidden>
                <path d="M16 3.4 3.2 10.4h2.1L16 5.6l10.7 4.8h2.1L16 3.4Z" />
                <path d="M5.2 11.2h21.6v2.1H5.2z" />
                <path d="M7.4 14.4h2.5v8.1H7.4zm5.1 0h2.5v8.1h-2.5zm4.6 0h2.5v8.1h-2.5zm5 0h2.5v8.1H22.1z" />
                <path d="M4.6 23.4h22.8v1.8H4.6zM3.4 26.2h25.2V28H3.4z" />
                <circle cx="16" cy="9.15" r="1.05" />
              </svg>
            </button>
            <h2 className="serif">
              <button
                type="button"
                className={`save-word${accountsOpen ? " is-gold" : ""}`}
                onClick={() => setAccountsOpen((v) => !v)}
              >
                {t("desk.savings")}
              </button>
            </h2>
            <Hint topic="ahorros-banda" />
          </div>
          <span className="save-tools">
            <SourceNote
              label={t("desk.savings.from")}
              title={t("desk.savings.from")}
              meaning={t("desk.savings.from.total")}
              formula={[...saveSegs.map((s) => `${s.name} ${fmt(s.minor)}`), `${t("save.accounts")} ${fmt(accountTotal)}`].join(" · ")}
              implication={t("desk.savings.from.total.note")}
            >
              <strong className="num">{fmt(saveTotal + accountTotal)}</strong>
            </SourceNote>
            {summary.savingsGoal > 0 ? (
              <SourceNote
                label={t("desk.savings.from")}
                title={t("desk.savings.from")}
                meaning={t("desk.savings.from.goal")}
                formula={`${session.ledger.settings.savingsGoalPct}% ${t("desk.savings.from.goal.how")} · ${fmt(summary.income)}`}
                implication={t("desk.savings.from.goal.note")}
              >
                <em>{fmt(summary.savingsGoal)} {t("desk.savings.of")}</em>
              </SourceNote>
            ) : null}
          </span>
        </div>
        <div className="save-track" aria-hidden>
          {saveTotal <= 0 ? <i /> : saveSegs.map((s, i) => (
            <i key={s.id} style={{ width: `${(s.minor / saveTotal) * 100}%`, background: saveTints[i % saveTints.length] }} />
          ))}
        </div>
        <div className="save-segs" data-anchor="desk-pockets" style={{ gridTemplateColumns: `repeat(${Math.max(saveSegs.length, 1)}, minmax(0, 1fr))` }}>
          {saveSegs.map((s, i) => {
            const tint = saveTints[i % saveTints.length] ?? "#8fb9a6";
            const on = openSave === s.id;
            const pct = saveTotal > 0 ? Math.round((s.minor / saveTotal) * 100) : 0;
            return (
              <button
                key={s.id}
                type="button"
                className={`save-seg${on ? " is-on" : ""}`}
                style={{ ["--seg" as string]: tint }}
                aria-pressed={on}
                aria-expanded={openSave === s.id}
                onClick={() => pickSeg(s.id)}
                onDoubleClick={() => { setSaveOn(s.id); setOpenSave(s.id); setEditId(null); setAdding(false); setMoving(null); }}
              >
                {(() => {
                  // Tron keeps its own segmented energy gauge.
                  if (isTron()) return <b aria-hidden><i style={{ height: `${s.minor > 0 ? Math.max(12, (s.minor / savePeak) * 100) : 8}%`, background: tint, opacity: openSave && !on ? 0.35 : 1 }} /></b>;
                  // Everywhere else the block is a full-colour band: the pocket's own colour with soft sea swells.
                  return (
                    <b className="save-band" aria-hidden style={{ opacity: openSave && !on ? 0.5 : 1 }}>
                      <svg viewBox="0 0 240 28" preserveAspectRatio="none">
                        <path className="w1" d="M0 16.0 L4 17.4 L8 18.6 L12 19.3 L16 19.5 L20 19.0 L24 18.1 L28 16.7 L32 15.3 L36 13.9 L40 13.0 L44 12.5 L48 12.7 L52 13.4 L56 14.6 L60 16.0 L64 17.4 L68 18.6 L72 19.3 L76 19.5 L80 19.0 L84 18.1 L88 16.7 L92 15.3 L96 13.9 L100 13.0 L104 12.5 L108 12.7 L112 13.4 L116 14.6 L120 16.0 L124 17.4 L128 18.6 L132 19.3 L136 19.5 L140 19.0 L144 18.1 L148 16.7 L152 15.3 L156 13.9 L160 13.0 L164 12.5 L168 12.7 L172 13.4 L176 14.6 L180 16.0 L184 17.4 L188 18.6 L192 19.3 L196 19.5 L200 19.0 L204 18.1 L208 16.7 L212 15.3 L216 13.9 L220 13.0 L224 12.5 L228 12.7 L232 13.4 L236 14.6 L240 16.0 V28 H0Z" />
                        <path className="w2" d="M0 22.4 L4 22.3 L8 21.4 L12 19.9 L16 18.4 L20 17.6 L24 17.7 L28 18.6 L32 20.1 L36 21.6 L40 22.4 L44 22.3 L48 21.4 L52 19.9 L56 18.4 L60 17.6 L64 17.7 L68 18.6 L72 20.1 L76 21.6 L80 22.4 L84 22.3 L88 21.4 L92 19.9 L96 18.4 L100 17.6 L104 17.7 L108 18.6 L112 20.1 L116 21.6 L120 22.4 L124 22.3 L128 21.4 L132 19.9 L136 18.4 L140 17.6 L144 17.7 L148 18.6 L152 20.1 L156 21.6 L160 22.4 L164 22.3 L168 21.4 L172 19.9 L176 18.4 L180 17.6 L184 17.7 L188 18.6 L192 20.1 L196 21.6 L200 22.4 L204 22.3 L208 21.4 L212 19.9 L216 18.4 L220 17.6 L224 17.7 L228 18.6 L232 20.1 L236 21.6 L240 22.4 V28 H0Z" />
                      </svg>
                    </b>
                  );
                })()}
                <strong data-long={s.name.length > 8 ? "" : undefined}>{s.name}</strong>
                <span className="num">{fmt(s.minor)}</span>
                <small>{pct}%</small>
              </button>
            );
          })}
        </div>
        </>
        )}
        {openSeg ? (
          <div className={focus && focus !== "save" ? "vault-block" : "vault-pass"} style={focus && focus !== "save" ? { order: blockAt("board") } : undefined}>
            {focus && focus !== "save" && vaultSort ? blockArrows("board") : null}
          <div data-anchor="vault-ledger" className={`save-ledger${pocketKind === "retiro" ? " is-retiro" : ""}${focus && focus !== "save" ? " is-manage" : ""}${focus && focus !== "save" && pocketFold ? " is-folded" : ""}`} ref={ledgerRef} style={{ ["--seg" as string]: saveTints[Math.max(0, saveSegs.findIndex((s) => s.id === openSeg.id)) % saveTints.length] }} onClick={() => { if (focus && focus !== "save" && pocketFold) togglePocketFold(); }}>
            <div className={`save-ledger-head${focus && focus !== "save" ? " is-tab" : ""}`} onClick={(event) => { if (!focus || focus === "save") return; event.stopPropagation(); togglePocketFold(); }}>
              <strong className="lab-head">{openSeg.name}<Hint topic={pocketKind === "retiro" ? "retiro" : pocketKind === "emergencia" ? "emergencia" : "meta"} /></strong>
              <span className="row">
                <span className="num">{fmt(openSeg.minor)}</span>
                {focus && focus !== "save" ? (
                  <>
                    {!pocketFold ? (
                      <button type="button" className="icon-btn" aria-label={t("add")} onClick={(event) => { event.stopPropagation(); setAdding((v) => !v); setEditId(null); setMoving(null); }}>
                        <Plus className="size-4" />
                      </button>
                    ) : null}
                    <button type="button" className={`icon-btn ledger-fold${pocketFold ? "" : " is-open"}`} aria-label={t("study.fold")} aria-expanded={!pocketFold} onClick={(event) => { event.stopPropagation(); togglePocketFold(); }}>
                      <ChevronDown className="size-4" />
                    </button>
                  </>
                ) : (
                  <button type="button" className="icon-btn" aria-label={t("add")} onClick={() => { setAdding((v) => !v); setEditId(null); setMoving(null); }}>
                    <Plus className="size-4" />
                  </button>
                )}
              </span>
            </div>
            {focus && focus !== "save" && !pocketFold ? (
              <button type="button" className="fold-pin vault-corner-pin" aria-label={t("study.pin")} aria-pressed={pocketPin} onClick={(event) => { event.stopPropagation(); togglePocketPin(); }}><Pin /></button>
            ) : null}
            {focus && focus !== "save" && pocketFold ? null : (
            <>
            {adding && (pocketKind === "meta" || pocketKind === "emergencia") ? (
              <div className="ah-form is-pocket">
                <BookLook glyph={pocketGlyph} color={pocketColor} onGlyph={setPocketGlyph} onColor={setPocketColor} />
                <div className="ah-grid">
                  <label className="label is-wide">
                    <span className="lab-head">{pocketKind === "meta" ? t("save.goal") : t("save.emerg")}<FieldTip topic="f-bolsa-nombre" alt={pocketKind !== "meta"} /></span>
                    <input className="field" value={pocketName} placeholder={pocketKind === "meta" ? t("save.goal.ph") : t("save.emerg.ph")} onChange={(e) => setPocketName(e.target.value)} />
                  </label>
                  <label className="label is-wide">
                    <span className="lab-head">{t("amount")}<FieldTip topic="f-bolsa-monto" /></span>
                    <input className="field num" inputMode="decimal" value={pocketAmt} placeholder="0.00" onChange={(e) => setPocketAmt(e.target.value)} />
                  </label>
                </div>
                <div className="ah-actions">
                  <button type="button" className="btn secondary" onClick={() => { setAdding(false); setPocketName(""); setPocketAmt(""); }}>{t("cancel")}</button>
                  <button type="button" className="btn" onClick={addPocket}>{t("save.keep")}</button>
                </div>
              </div>
            ) : adding ? (
              <>
                <BookLook glyph={pocketGlyph} color={pocketPicked || openSeg.categoryId !== "f-ahorro" || pocketKind ? pocketColor : baseFor(session.ledger.structure, openSeg.categoryId)} onGlyph={setPocketGlyph} onColor={(c) => { setPocketColor(c); setPocketPicked(true); }} />
                <LineForm
                  kind="expense-fixed"
                  preset={{ categoryId: openSeg.categoryId, subId: openSeg.id === "rest" ? "" : openSeg.id }}
                  glyph={pocketGlyph}
                  swatch={pocketPicked || openSeg.categoryId !== "f-ahorro" || pocketKind ? pocketColor : undefined}
                  dock
                  onClose={() => setAdding(false)}
                />
              </>
            ) : null}
            {openLines.length === 0 && !adding && pocketKind !== "retiro" ? <p className="text-sm text-muted">{t("save.empty")}</p> : null}
            {openLines.map((line) => {
              const label = line.concept || names.sub(line.subId) || openSeg.name;
              const minor = convertMinor(line.balanceMinor != null ? line.balanceMinor : line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, rate.display, rate.rateE4);
              return (
                  <div key={line.id} className={`save-account pocket-row${line.active ? "" : " is-muted"}`}>
                    <span className="bank-tools">
                      <button type="button" className="bank-grip" aria-label={t("save.move")} aria-pressed={moving === line.id} onClick={() => { setMoving(moving === line.id ? null : line.id); setEditId(null); setAdding(false); }}>
                        <GripVertical />
                      </button>
                      <button type="button" className="bank-drop" aria-label={t("delete")} onClick={() => confirm({ title: t("delete"), body: `${label}. ${t("delete.warn")}`, danger: true, yes: t("yes"), run: () => commit((s) => deleteLine(s, key, line.id), label) })}>
                        <Trash2 />
                      </button>
                    </span>
                    <div className="save-account-hit">
                      <span className="save-account-name">
                        {renameId === line.id ? (
                          <input
                            className="bank-rename"
                            value={renameValue}
                            autoFocus
                            aria-label={t("save.accountName")}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renamePocket(line, label);
                              if (e.key === "Escape") setRenameId(null);
                            }}
                            onBlur={() => renamePocket(line, label)}
                          />
                        ) : (
                          <span className="bank-name">
                            <button type="button" className="look-mark" data-look-toggle aria-label={t("look.title")} aria-pressed={lookId === line.id} style={{ background: washForInk(chosenTone(line.color, line.categoryId) || baseFor(session.ledger.structure, line.categoryId)), color: "#14110e" }} onClick={(event) => { event.stopPropagation(); setLookId(lookId === line.id ? null : line.id); }}>
                              {line.icon?.startsWith("brand:") ? <BrandMark id={line.icon.slice(6)} className="size-4" /> : <Glyph name={line.icon && line.icon !== "Circle" ? line.icon : "Flag"} className="size-4" />}
                            </button>
                            <span>{label}</span>
                          </span>
                        )}
                        {renameId === line.id ? null : (
                          <button type="button" className="bank-pencil" aria-label={t("edit")} onClick={() => { setRenameId(line.id); setRenameValue(label); setMoving(null); }}>
                            <Pencil />
                          </button>
                        )}
                      </span>
                      <span className="bank-sum num">{fmt(minor)}</span>
                      {focus && focus !== "save" && pocketKind === "retiro" && openLines.length > 1 ? (
                        <button type="button" className="bank-grip" aria-label={t("study.fold")} aria-expanded={retireOpen === line.id} onClick={() => { setRetireOpen(retireOpen === line.id ? null : line.id); setRetireDate(line.startedOn || ""); setRetireNow(""); }}>
                          <ChevronDown className={retireOpen === line.id ? "fold-chev is-open" : "fold-chev"} />
                        </button>
                      ) : null}
                    </div>
                    {moving === line.id ? (
                      <div className="save-move" role="menu">
                        {saveSegs.filter((dest) => dest.id !== (line.subId && seed.some((s) => s.id === line.subId) ? line.subId : "rest")).map((dest) => (
                          <button key={dest.id} type="button" onClick={() => relocate(line, dest.id)}>{dest.name}</button>
                        ))}
                      </div>
                    ) : null}
                    {focus && focus !== "save" && pocketKind === "retiro" && (openLines.length < 2 || retireOpen === line.id) ? (
                      <div className="save-retire">
                        <div className="save-line">
                          <span>{t("save.sendOn")}</span>
                          <DayField value={retireOpen === line.id ? (retireDate || line.startedOn || "") : (line.startedOn || "")} onChange={(value) => { setRetireOpen(line.id); setRetireDate(value); }} />
                        </div>
                        <div className="save-line">
                          <span>{t("save.accrued")}</span>
                          <strong className="num">{fmt((() => { const start = retireOpen === line.id ? (retireDate || line.startedOn || "") : (line.startedOn || ""); return (start ? payDates(start, "monthly").length : 0) * convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4); })())}</strong>
                        </div>
                        <div className="save-line">
                          <span>{t("save.haveNow")}</span>
                          <input className="field num save-inline" inputMode="decimal" value={retireOpen === line.id ? retireNow : ""} placeholder={line.balanceMinor != null ? fmt(convertMinor(line.balanceMinor, line.balanceCurrency, rate.display, rate.rateE4)) : t("amount")} aria-label={t("save.haveNow")} onChange={(e) => { setRetireOpen(line.id); setRetireNow(e.target.value); }} />
                          <button type="button" className="icon-btn" aria-label={t("save.keep")} onClick={() => saveRetire(line)}><Check className="size-4" /></button>
                        </div>
                      </div>
                    ) : null}
                    {lookId === line.id ? (
                      <BookLook
                        pinned
                        glyph={line.icon?.startsWith("brand:") ? "Plane" : (line.icon && line.icon !== "Circle" ? line.icon : "Flag")}
                        color={chosenTone(line.color, line.categoryId) || baseFor(session.ledger.structure, line.categoryId)}
                        onGlyph={(glyph) => paintLine(line, { icon: glyph })}
                        onColor={(color) => paintLine(line, { color })}
                        onClose={() => setLookId(null)}
                      />
                    ) : null}
                  </div>
              );
            })}
            {pocketKind === "retiro" && !(focus && focus !== "save") ? (
              <button type="button" className="save-retire-fold" aria-expanded={retireDeskOpen} onClick={() => setRetireDeskOpen((v) => !v)}>
                <span>{t("save.sendOn")} · {t("save.accrued").split(" ")[0]}</span>
                <ChevronDown className={`size-4 fold-chev${retireDeskOpen ? " is-open" : ""}`} />
              </button>
            ) : null}
            {pocketKind === "retiro" && !(focus && focus !== "save") && retireDeskOpen ? (
              <div className="ah-form is-retire">
                <div className="ah-grid">
                  <div className="label">
                    <span className="lab-head">{t("save.f.first")}<FieldTip topic="f-retiro-primero" /></span>
                    <DayField value={retireStart} onChange={setRetireDate} />
                  </div>
                  <label className="label is-right">
                    <span className="lab-head">{t("save.f.have")}<FieldTip topic="f-retiro-saldo" /></span>
                    <input className="field num" inputMode="decimal" value={retireNow} placeholder={retireLine?.balanceMinor != null ? fmt(convertMinor(retireLine.balanceMinor, retireLine.balanceCurrency, rate.display, rate.rateE4)) : "0.00"} onChange={(e) => setRetireNow(e.target.value)} />
                  </label>
                </div>
                <p className="ah-read">
                  <span className="lab-head">{t("save.accrued")}<FieldTip topic="f-retiro-acumulado" /></span>
                  <strong className="num">{fmt(retireAccrued)}</strong>
                </p>
                <div className="ah-actions">
                  <button type="button" className="btn secondary" onClick={() => { setRetireDeskOpen(false); setRetireNow(""); setRetireDate(""); }}>{t("cancel")}</button>
                  <button type="button" className="btn" onClick={() => saveRetire()}>{t("save.keep")}</button>
                </div>
              </div>
            ) : null}
            </>
            )}
          </div>
          </div>
        ) : null}
        {focus ? (
          <div className="vault-block" style={{ order: blockAt("span") }}>
            {vaultSort ? blockArrows("span") : null}
            {spanNode}
          </div>
        ) : null}
        {leverNode ? (
          <div className={focus ? "vault-block" : "vault-pass"} style={focus ? { order: blockAt("lever") } : undefined}>
            {focus && vaultSort ? blockArrows("lever") : null}
            {leverNode}
          </div>
        ) : null}
        {focus && focus !== "save" && openSeg ? (
          <div className="vault-block" style={{ order: blockAt("view") }}>
            {vaultSort ? blockArrows("view") : null}
          <div className="save-view" style={{ ["--seg" as string]: saveTints[Math.max(0, saveSegs.findIndex((s) => s.id === openSeg.id)) % saveTints.length] }}>
            <div className="save-ledger-head">
              <strong>{pocketKind === "meta" ? t("vault.projects") : pocketKind === "retiro" ? t("vault.retirements") : t("vault.emergencies")}</strong>
              <span className="num">{fmt(openSeg.minor)}</span>
            </div>
            {openLines.length === 0 ? <p className="save-flow-read">{t("vault.viewNone")}</p> : openLines.map((line) => {
              const minor = convertMinor(line.balanceMinor != null ? line.balanceMinor : line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, rate.display, rate.rateE4);
              return (
                <div key={line.id} className="save-view-row">
                  <span className="save-view-name">
                    {line.icon?.startsWith("brand:") ? <BrandMark id={line.icon.slice(6)} className="size-5" /> : line.icon ? <Glyph name={line.icon} className="size-4" /> : null}
                    <span>{line.concept || names.sub(line.subId) || openSeg.name}</span>
                    <strong className="num">{fmt(minor)}</strong>
                  </span>
                  <i aria-hidden><b style={{ width: `${openSeg.minor > 0 ? Math.max(8, Math.round((minor / openSeg.minor) * 100)) : 0}%` }} /></i>
                </div>
              );
            })}
            {pocketKind === "retiro" ? (
              <div className="save-view-row">
                <span className="save-view-name">
                  <span>{t("save.accrued")}</span>
                  <strong className="num">{fmt(retireAccrued)}</strong>
                </span>
              </div>
            ) : null}
          </div>
          </div>
        ) : null}
        {accountsOpen ? (
          <div className={focus === "save" ? "vault-block" : "vault-pass"} style={focus === "save" ? { order: blockAt("accounts") } : undefined}>
            {focus === "save" && vaultSort ? blockArrows("accounts") : null}
          <div data-anchor="vault-accounts" className={`save-more${focus === "save" && banksFold ? " is-folded" : ""}`} onClick={() => { if (focus === "save" && banksFold) toggleBanksFold(); }}>
            <div className={`save-ledger-head${focus === "save" ? " is-tab" : ""}`} onClick={(event) => { if (focus !== "save") return; event.stopPropagation(); toggleBanksFold(); }}>
              <strong className="lab-head">{focusedAccount ? focusedAccount.name : t("save.accounts.all")}<Hint topic="cuentas" /></strong>
              <span className="row">
                <span className="num">{fmt(focusedAccount ? focusedAccount.minor : accountTotal)}</span>
                {focus === "save" ? (
                  <button type="button" className={`icon-btn ledger-fold${banksFold ? "" : " is-open"}`} aria-label={t("study.fold")} aria-expanded={!banksFold} onClick={(event) => { event.stopPropagation(); toggleBanksFold(); }}>
                    <ChevronDown className="size-4" />
                  </button>
                ) : (
                  <button type="button" className="fold-pin" aria-label={t("study.pin")} aria-pressed={accountsPin} onClick={toggleAccountsPin}><Pin /></button>
                )}
              </span>
            </div>
            {focus === "save" && !banksFold ? (
              <button type="button" className="fold-pin vault-corner-pin" aria-label={t("study.pin")} aria-pressed={banksPin} onClick={toggleBanksPin}><Pin /></button>
            ) : null}
            {focus === "save" && banksFold ? null : (
            <>
            <div className="save-accounts">
              {bankRows.map((row) => (
                <div key={row.id} data-bank={row.id} className={`save-account${accountFocus === row.id ? " is-on" : ""}${bankRank?.[0] && bankDrag.current === row.id ? " is-drag" : ""}`}>
                  <span className="bank-tools">
                    <button type="button" className="bank-grip" aria-label={t("save.move")} onPointerDown={(event) => startBankDrag(row.id, event)} onPointerMove={moveBankDrag} onPointerUp={endBankDrag} onPointerCancel={endBankDrag}>
                      <GripVertical />
                    </button>
                    <button type="button" className="bank-drop" aria-label={t("delete")} onClick={() => dropAccount(row)}><Trash2 /></button>
                  </span>
                  <div className="save-account-hit">
                    <span className="save-account-name">
                      {renameId === row.id ? (
                        <input
                          className="bank-rename"
                          value={renameValue}
                          autoFocus
                          aria-label={t("save.accountName")}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(row);
                            if (e.key === "Escape") setRenameId(null);
                          }}
                          onBlur={() => saveRename(row)}
                        />
                      ) : (
                        <span className="bank-name">
                          <button type="button" className="look-mark" data-look-toggle aria-label={t("look.title")} aria-pressed={lookId === row.id} onClick={(event) => { event.stopPropagation(); setLookId(lookId === row.id ? null : row.id); }}>
                            {vaultGlyph(row.icon) ? <Glyph name={vaultGlyph(row.icon)!} className="size-4" /> : row.icon.startsWith("vault:data:") ? <img src={row.icon.slice(6)} alt="" className="bank-photo" /> : row.icon.startsWith("vault:") || row.icon.startsWith("brand:") ? <BrandMark id={row.icon.slice(row.icon.indexOf(":") + 1)} className="size-4" /> : <Glyph name={row.icon === "vault" ? "Landmark" : row.icon} className="size-4" />}
                          </button>
                          <button type="button" aria-pressed={accountFocus === row.id} onClick={() => {
                            setAccountFocus((cur) => {
                              if (cur === row.id) return null;
                              setAccountAmt("");
                              setAccountSign(null);
                              return row.id;
                            });
                          }}>{row.name}</button>
                        </span>
                      )}
                      {renameId === row.id ? null : (
                        <button type="button" className="bank-pencil" aria-label={t("edit")} onClick={() => { setRenameId(row.id); setRenameValue(row.name); }}>
                          <Pencil />
                        </button>
                      )}
                    </span>
                    <button type="button" className="bank-sum num" onClick={() => {
                      setAccountFocus((cur) => {
                        if (cur === row.id) return null;
                        setAccountAmt("");
                        setAccountSign(null);
                        return row.id;
                      });
                    }}>{fmt(row.minor)}</button>
                  </div>
                  {accountFocus === row.id ? (
                    row.minor > 0 || lines.some((line) => line.subId === row.id && line.startedOn) ? (
                      <div className="ah-form is-account">
                        <div className="ah-grid">
                          <div className="label is-wide">
                            <span className="lab-head">{t("save.f.move")}<FieldTip topic="cuenta-movimiento" /></span>
                            <div className="ah-sign" role="group">
                              <button type="button" aria-pressed={accountSign === 1} onClick={() => setAccountSign(1)}><Plus aria-hidden />{t("save.deposit")}</button>
                              <button type="button" aria-pressed={accountSign === -1} onClick={() => setAccountSign(-1)}><Minus aria-hidden />{t("save.withdraw")}</button>
                            </div>
                          </div>
                          {accountSign ? (
                            <label className="label is-wide">
                              <span className="lab-head">{t("amount")}<FieldTip topic="f-cuenta-monto" alt={accountSign <= 0} /></span>
                              <input className="field num" inputMode="decimal" autoFocus value={accountAmt} placeholder="0.00" onChange={(e) => setAccountAmt(e.target.value)} />
                            </label>
                          ) : null}
                        </div>
                        <div className="ah-actions">
                          <button type="button" className="btn secondary" onClick={() => { setAccountFocus(null); setAccountAmt(""); setAccountSign(null); }}>{t("cancel")}</button>
                          <button type="button" className="btn" disabled={!accountSign} onClick={() => { if (accountSign) adjustAccount(row, accountSign); }}>{t("save.keep")}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="ah-form is-account">
                        <div className="ah-grid">
                          <label className="label is-wide">
                            <span className="lab-head">{t("save.opening")}<FieldTip topic="f-cuenta-inicial" /></span>
                            <input className="field num" inputMode="decimal" autoFocus value={accountAmt} placeholder="0.00" onChange={(e) => setAccountAmt(e.target.value)} />
                          </label>
                        </div>
                        <div className="ah-actions">
                          <button type="button" className="btn secondary" onClick={() => { setAccountFocus(null); setAccountAmt(""); }}>{t("cancel")}</button>
                          <button type="button" className="btn" onClick={() => setOpening(row)}>{t("save.keep")}</button>
                        </div>
                      </div>
                    )
                  ) : null}
                  {lookId === row.id ? (
                    <BookLook
                      pinned
                      glyph={vaultGlyph(row.icon) ?? (row.icon.startsWith("vault:") || row.icon.startsWith("brand:") || row.icon === "vault" ? "Landmark" : row.icon)}
                      color={lines.find((line) => line.subId === row.id)?.color || "#e7c27a"}
                      onGlyph={(glyph) => paintBank(row, glyph)}
                      onColor={(color) => paintBank(row, undefined, color)}
                      onClose={() => setLookId(null)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="ah-form is-bank">
              <div className="ah-grid">
                <div className="label is-wide">
                  <span className="lab-head">{t("save.f.newAccount")}<FieldTip topic="f-cuenta-nombre" /></span>
                  <div className="ah-bank-name">
                    <span className="bank-photo-wrap">
                    <label className={`bank-photo-btn${accountIcon ? " is-set" : ""}`} title={t("save.accountIcon")}>
                      {accountIcon ? <img src={accountIcon} alt="" /> : <><ImageIcon className="size-4" /><i className="bank-photo-plus" aria-hidden><Plus /></i></>}
                      <input type="file" accept="image/*" aria-label={t("save.accountIcon")} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.currentTarget.value = "";
                        shrinkIcon(file).then(setAccountIcon).catch(() => {});
                      }} />
                    </label>
                    {accountIcon ? <button type="button" className="bank-photo-clear" aria-label={lang === "es" ? "Quitar icono" : "Remove icon"} onClick={() => setAccountIcon("")}><X /></button> : null}
                    </span>
                    <input className="field" value={accountName} placeholder={t("save.f.accountPh")} aria-label={t("save.accountName")} onChange={(e) => setAccountName(e.target.value)} />
                  </div>
                </div>
                <label className="label">
                  <span className="lab-head">{t("save.opening")}<FieldTip topic="f-cuenta-inicial" /></span>
                  <input className="field num" inputMode="decimal" value={accountAmt} placeholder="0.00" onChange={(e) => setAccountAmt(e.target.value)} />
                </label>
                <div className="label is-right ah-go">
                  <span className="lab-head" aria-hidden>&nbsp;</span>
                  <button type="button" className={`btn${accountName.trim() && parseAmount(accountAmt) !== null ? " is-ready" : ""}`} onClick={addAccount}><Plus aria-hidden />{t("save.f.add")}</button>
                </div>
              </div>
            </div>
            </>
            )}
          </div>
          </div>
        ) : null}
        {focus === "save" ? (
          <div className="vault-block" style={{ order: blockAt("flow") }}>
            {vaultSort ? blockArrows("flow") : null}
          <div className="save-flow" style={{ ["--save" as string]: colorFor(session.ledger.structure, savingsCats[0]?.id ?? "f-ahorro") }}>
            <div className="save-ledger-head" data-anchor="desk-aside">
              <strong className="lab-head">{t("vault.aside")}<Hint topic="apartado-mes" /></strong>
              <span className="num">{fmt(aside)}</span>
            </div>
            <div className="save-flow-meter" aria-hidden>
              <i style={{ width: `${summary.savingsGoal > 0 ? Math.min(100, Math.round((aside / summary.savingsGoal) * 100)) : aside > 0 ? 100 : 0}%` }} />
            </div>
            <p className="save-flow-read">
              {fixedSave.length === 0
                ? t("vault.none")
                : (
                  // Two unbreakable halves; when the card is too narrow for one line (large reader text) they stack and the
                  // dot goes (CSS), so neither "·" nor "Faltan C$…" is ever left dangling.
                  <>
                    {summary.income > 0 ? <span>{`${Math.round((aside / summary.income) * 100)}% ${t("vault.ofIn")}`}</span> : null}
                    {summary.income > 0 && summary.savingsGoal > 0 ? " " : null}
                    {summary.savingsGoal > 0 ? <span className={summary.income > 0 ? "has-sep" : undefined}>{aside >= summary.savingsGoal ? t("vault.met") : `${t("vault.short")}\u00a0${fmt(summary.savingsGoal - aside)}`}</span> : null}
                  </>
                )}
            </p>
            {fixedSave.map((line) => (
              <div key={line.id} className="save-flow-row">
                <span className="save-flow-name">
                  <i className="save-flow-ico" style={{ background: chosenTone(line.color, line.categoryId) || undefined, ["--ico" as string]: chosenTone(line.color, line.categoryId) || colorFor(session.ledger.structure, line.categoryId) }}>
                    {line.icon?.startsWith("brand:") ? <BrandMark id={line.icon.slice(6)} /> : <Glyph name={line.icon && line.icon !== "Circle" ? line.icon : "PiggyBank"} />}
                  </i>
                  <span>{line.concept || names.sub(line.subId) || names.cat(line.categoryId)}</span>
                </span>
                <strong className="num">{fmt(convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4))}</strong>
              </div>
            ))}
          </div>
          </div>
        ) : null}
      </section>
      {focus ? null : (
      <section key={lens} data-anchor="desk-list" className="card span-all swipe-pane" data-dir={flowDir < 0 ? "-1" : "1"}>
        {lens === "debt" ? (
          <div className="debt-lamp" data-anchor="desk-semaforo">
            {(() => {
              const live = summary.tone === "warn" || summary.tone === "bad" ? summary.tone : "good";
              const shown = lamp ?? live;
              const green = session?.ledger.settings.debtGreenPct ?? 30;
              const yellow = session?.ledger.settings.debtYellowPct ?? 45;
              const es = lang === "es";
              const pay = es
                ? `Este mes pagas ${fmt(summary.debt)} en créditos${summary.debtPct != null ? `. Es el ${summary.debtPct.toFixed(1)}% de lo que entra` : ""}.`
                : `This month you pay ${fmt(summary.debt)} toward credit${summary.debtPct != null ? `. That is ${summary.debtPct.toFixed(1)}% of what came in` : ""}.`;
              const note = shown === "warn"
                ? (es ? `Amarillo: vas entre ${green}% y ${yellow}%. El tope verde es ${fmt(summary.debtAllowance)}.` : `Yellow: you are between ${green}% and ${yellow}%. The green cap is ${fmt(summary.debtAllowance)}.`)
                : shown === "bad"
                  ? (es ? `Rojo: pasaste el ${yellow}%. Es lo que pagas este mes, no lo que debes.` : `Red: you passed ${yellow}%. This is this month's payment, not what you owe.`)
                  : (es ? `Verde: estás bajo el ${green}%. Tu tope es ${fmt(summary.debtAllowance)}.` : `Green: you are under ${green}%. Your cap is ${fmt(summary.debtAllowance)}.`);
              return (
                <>
                  <div className="signal" role="group" aria-label={t("sem.title")}>
                    {(["bad", "warn", "good"] as const).map((id) => (
                      <button key={id} type="button" className={`signal-light ${id}${shown === id ? " is-on" : ""}${live === id ? " is-live" : ""}`} aria-pressed={shown === id} onClick={() => setLamp(id)} />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <h2 className="serif text-xl lab-head">{t("sem.title")}<Hint topic="semaforo" /></h2>
                    <p className="semaphore">{pay}</p>
                    <p className="semaphore">{note}</p>
                  </div>
                </>
              );
            })()}
          </div>
        ) : null}
        {lens !== "have" && lens !== "debt" ? (
          <p className="desk-kicker" data-anchor="desk-opportunity">
            <span>{t("desk.opportunity")}<Hint topic="oportunidad" className="is-inline" avoid=".desk-kicker strong" /></span>
            <strong className={`num ${summary.opportunity < 0 ? "bad" : ""}`}>{fmt(summary.opportunity)}</strong>
          </p>
        ) : null}
        {lens === "have" ? <p className="own-kicker">{t("desk.have.note")}</p> : null}
        {lines.length === 0 ? (
          <span className="row mt-3" data-anchor="desk-start">
            <button type="button" className="btn" onClick={() => setUi({ section: "income", draft: "income-fixed" })}>{t("desk.first")}</button>
            <button type="button" className="btn ghost" onClick={copyPrev}>{t("desk.copy")}</button>
          </span>
        ) : null}
        {shown.length === 0 ? <p className="mt-3 text-muted">{t("desk.empty")}</p> : null}
        {lens === "have" ? (
          <div className="own-stack">
            {shown.map((line) => (
              <div key={line.id}>
                <button type="button" className="own-line" data-line-id={line.id} aria-expanded={deskLine === line.id} onClick={() => setDeskLine((cur) => cur === line.id ? null : line.id)}>
                  <span className="min-w-0">
                    <strong className="block">{keepTail(line.concept || names.cat(line.categoryId) || names.purchase(line.categoryId))}</strong>
                    <span className="block text-sm text-muted">{[names.cat(line.categoryId), names.sub(line.subId)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="num amt-in">{viewLine(line)}</span>
                </button>
                {deskWork(line)}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-stack desk-board">
            {(() => {
              const groups = new Map<string, { id: string; title: string; order: number; lines: typeof shown }>();
              const put = (id: string, title: string, order: number, line: (typeof shown)[number]) => {
                const group = groups.get(id) ?? { id, title, order, lines: [] };
                group.lines.push(line);
                groups.set(id, group);
              };
              for (const line of shown) {
                if (line.kind === "purchase") put("purchase", t("nav.shops"), 80, line);
                else if (line.kind === "subscription") put("subs", t("tab.subs"), 90, line);
                else if (line.kind.startsWith("income")) put(line.kind, t(line.kind === "income-fixed" ? "income.fixed" : "income.variable"), line.kind === "income-fixed" ? 0 : 1, line);
                else {
                  const cat = session.ledger.structure.categories.find((c) => c.id === line.categoryId);
                  put(line.categoryId || "other", names.cat(line.categoryId) || t("desk.other"), cat?.order ?? 40, line);
                }
              }
              const laneOf = (kind: string) => kind === "income-fixed" || kind === "income-variable" ? 0 : kind === "expense-fixed" ? 1 : kind === "expense-variable" ? 2 : kind === "purchase" ? 3 : kind === "subscription" ? 4 : 5;
              const within = (group: { id: string; order: number; lines: typeof shown }) => {
                const kind = group.lines[0]?.kind ?? "";
                if (kind === "income-fixed") return 0;
                if (kind === "income-variable") return 1;
                const cat = session.ledger.structure.categories.find((c) => c.id === group.id);
                return cat?.order ?? group.order;
              };
              const cards = [...groups.values()].sort((a, b) => laneOf(a.lines[0]?.kind ?? "") - laneOf(b.lines[0]?.kind ?? "") || within(a) - within(b)).map((group, index) => {
                const income = group.lines.every((line) => line.kind.startsWith("income"));
                const total = group.lines.reduce((sum, line) => sum + convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4), 0);
                const tint = lens === "debt"
                  ? (summary.tone === "bad" ? "#c45a52" : summary.tone === "warn" ? "#c4a04a" : "#2f8a62")
                  : colorFor(session.ledger.structure, group.lines[0]?.categoryId || group.id);
                return (
                  <section key={group.id} className="ridge" style={{ ["--ridge" as string]: tint, ["--i" as string]: String(index) }}>
                    <header className="ridge-head">
                      <div className="ridge-head-row">
                        <strong>{group.title}</strong>
                        <span className={`num ${total === 0 ? "amt-zero" : income ? "amt-in" : "amt-out"}`}>{income || total === 0 ? "" : total < 0 ? "+" : "−"}{fmt(income ? total : Math.abs(total))}</span>
                      </div>
                    </header>
                    <div className="ridge-lines">
                      {group.lines.map((line) => {
                        const debt = debtIds.has(line.categoryId);
                        const sub = names.sub(line.subId);
                        return (
                          <div key={line.id}>
                            <button type="button" className={`glass-line${debt && lens === "debt" ? " is-debt" : ""}`} data-line-id={line.id} aria-expanded={deskLine === line.id} onClick={() => setDeskLine((cur) => cur === line.id ? null : line.id)}>
                              <i className="ridge-pip" style={{ background: chosenTone(line.color, line.categoryId) || tint }} />
                              <span className="min-w-0">
                                <strong className="block">{keepTail(line.concept || sub || group.title)}</strong>
                                {sub && line.concept && sub.trim().toLowerCase() !== line.concept.trim().toLowerCase() ? <span className="block text-sm text-muted">{sub}</span> : null}
                                {lens === "debt" && line.balanceMinor != null && line.balanceMinor > 0 ? <span className="block text-sm text-muted">{fmt(convertMinor(line.balanceMinor, line.balanceCurrency, rate.display, rate.rateE4))}</span> : null}
                              </span>
                              <span className={`num ${line.amountMinor === 0 ? "amt-zero" : line.kind.startsWith("income") ? "amt-in" : "amt-out"}`}>{outView(line, viewLine)}</span>
                            </button>
                            {deskWork(line)}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              });
              return (
                <>
                  <div className="desk-col">{cards.filter((_, index) => index % 2 === 0)}</div>
                  <div className="desk-col">{cards.filter((_, index) => index % 2 === 1)}</div>
                </>
              );
            })()}
          </div>
        )}
        {ui.notice ? <p className="mt-2 text-sm">{ui.notice}</p> : null}
      </section>
      )}
    </div>
  );
}

export function Books({ mode }: { mode: "income" | "fixed" | "variable" }) {
  const { t } = useFaro();
  if (mode === "income") {
    return (
      <div className="grid gap-3">
        <LinesBlock kind="income-fixed" title={t("income.fixed")} />
        <LinesBlock kind="income-variable" title={t("income.variable")} />
        <ImportDoor />
      </div>
    );
  }
  if (mode === "fixed") return <div className="grid gap-3"><LinesBlock kind="expense-fixed" title={t("group.fixed")} /><ImportDoor /></div>;
  return (
    <div className="grid gap-3">
      <LinesBlock kind="expense-variable" title={t("group.variable")} />
      <PeopleBox />
      <ImportDoor />
    </div>
  );
}

export function Shops() {
  const { t, names, session, lang, commit } = useFaro();
  const [open, setOpen] = useState(false);
  const [storesFold, setStoresFold] = useState(false);
  const [catsFold, setCatsFold] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeIcon, setStoreIcon] = useState("");
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState(PALETTE[0]);
  const [paint, setPaint] = useState<string | null>(null);
  const gearJump = useRef(false);
  useEffect(() => {
    const onOpen = (e: Event) => { if ((e as CustomEvent).detail === "shops-gear") { gearJump.current = true; setOpen(true); } };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  const stores = session?.ledger.structure.catalog.filter((c) => c.kind === "store") ?? [];
  const cats = session?.ledger.structure.purchases ?? [];
  const readIcon = (file: File) => { shrinkIcon(file).then(setStoreIcon).catch(() => {}); };
  const closeStore = () => { setStoreName(""); setStoreIcon(""); setStoreOpen(false); };
  const saveStore = () => {
    const name = storeName.trim();
    if (!name) return;
    commit((st) => ({
      ...st,
      structure: {
        ...st.structure,
        catalog: [...st.structure.catalog, { id: `c-${uid().slice(0, 8)}`, nameKey: "", customName: name, icon: storeIcon || "Circle", hidden: false, order: 99, kind: "store", urlTemplate: "" }],
      },
    }), name);
    closeStore();
  };
  const closeCat = () => { setCatName(""); setCatOpen(false); };
  const saveCat = () => {
    const name = catName.trim();
    if (!name) return;
    commit((st) => ({
      ...st,
      structure: {
        ...st.structure,
        purchases: [...st.structure.purchases, { id: `p-${uid().slice(0, 8)}`, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, color: catColor }],
      },
    }), name);
    closeCat();
  };
  useEffect(() => {
    if (!open) return;
    const onBack = (e: Event) => {
      if (e.defaultPrevented) return;
      setOpen(false);
      // Opened by "Ir allí": part of the jump, so back walks on to where it came from.
      if (gearJump.current) { gearJump.current = false; return; }
      e.preventDefault();
    };
    window.addEventListener("faro-back", onBack);
    return () => window.removeEventListener("faro-back", onBack);
  }, [open]);
  return (
    <div className="grid gap-3">
      <div className="shop-stage">
        <LinesBlock kind="purchase" title={t("nav.shops")} />
        <button type="button" data-anchor="shops-gear" className="icon-btn shop-gear" aria-expanded={open} aria-label={t("nav.settings")} onClick={() => { gearJump.current = false; setOpen((v) => !v); }}>
          <Gear className="size-4" />
        </button>
      </div>
      {open ? (
        <section className="card shop-desk">
          <div className="shop-strip">
            <button type="button" className="shop-strip-main" aria-expanded={storesFold} onClick={() => setStoresFold((v) => !v)}>
              <ChevronDown className={storesFold ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
              <strong className="serif">{t("shops.stores")}</strong>
            </button>
            <Hint topic="tiendas" className="is-strip" />
            <button type="button" className="icon-btn" aria-label={t("add")} onClick={() => {
              setStoresFold(true);
              if (!storeOpen) {
                setStoreOpen(true);
                return;
              }
              if (!storeName.trim()) {
                setStoreOpen(false);
                return;
              }
              saveStore();
            }}>
              <Plus className="size-4" />
            </button>
          </div>
          {storesFold ? (
            <>
              <p className="text-sm text-muted">{t("shops.hint")}</p>
              <div className="shop-grid">
                {stores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`shop-card brand-${s.id}`}
                    aria-pressed={!s.hidden}
                    onClick={() => commit((st) => ({
                      ...st,
                      structure: { ...st.structure, catalog: st.structure.catalog.map((c) => c.id === s.id ? { ...c, hidden: !c.hidden } : c) },
                    }), s.id)}
                  >
                    <BrandMark id={s.id} src={s.icon.startsWith("data:") ? s.icon : undefined} className="size-9" />
                    <span>{names.catalog(s.id)}</span>
                  </button>
                ))}
              </div>
              {storeOpen ? (
                <div className="ah-form sc-form is-store">
                  <div className="ah-grid">
                    <div className="label is-wide">
                      <span className="lab-head">{t("sc.store")}<FieldTip topic="f-tienda" /></span>
                      <div className="ah-bank-name">
                        <span className="bank-photo-wrap">
                          <label className={`bank-photo-btn${storeIcon ? " is-set" : ""}`} title={t("shops.icon")}>
                            {storeIcon ? <img src={storeIcon} alt="" /> : <><ImageIcon className="size-4" /><i className="bank-photo-plus" aria-hidden><Plus /></i></>}
                            <input type="file" accept="image/*" aria-label={t("shops.icon")} onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) readIcon(file); }} />
                          </label>
                          {storeIcon ? <button type="button" className="bank-photo-clear" aria-label={t("sc.logoClear")} onClick={() => setStoreIcon("")}><X /></button> : null}
                        </span>
                        <input className="field" value={storeName} placeholder={t("sc.store.ph")} aria-label={t("shops.addStore")} onChange={(e) => setStoreName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveStore(); }} />
                      </div>
                    </div>
                  </div>
                  <div className="ah-actions">
                    <button type="button" className="btn secondary" onClick={closeStore}>{t("cancel")}</button>
                    <button type="button" className="btn" disabled={!storeName.trim()} onClick={saveStore}>{t("save")}</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="shop-strip">
            <button type="button" className="shop-strip-main" aria-expanded={catsFold} onClick={() => setCatsFold((v) => !v)}>
              <ChevronDown className={catsFold ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
              <strong className="serif">{t("shops.cats")}</strong>
            </button>
            <Hint topic="categorias-compra" className="is-strip" />
            <button type="button" className="icon-btn" aria-label={t("add")} onClick={() => {
              setCatsFold(true);
              if (!catOpen) {
                setCatOpen(true);
                return;
              }
              if (!catName.trim()) {
                setCatOpen(false);
                return;
              }
              saveCat();
            }}>
              <Plus className="size-4" />
            </button>
          </div>
          {catsFold ? (
            <>
              <div className="shop-cats">
                {cats.map((c) => (
                  <span key={c.id} className="shop-cat-wrap">
                    <button
                      type="button"
                      className="shop-cat"
                      style={{ ["--cat" as string]: categoryColor(c.id, c.color) }}
                      aria-pressed={!c.hidden}
                      onClick={() => commit((st) => ({
                        ...st,
                        structure: { ...st.structure, purchases: st.structure.purchases.map((p) => p.id === c.id ? { ...p, hidden: !p.hidden } : p) },
                      }), c.id)}
                    >
                      <i
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaint(paint === c.id ? null : c.id);
                        }}
                      />
                      {displayName(c, lang)}
                    </button>
                    {paint === c.id ? (
                      <span className="shop-swatches">
                        {PALETTE.map((color) => (
                          <button key={color} type="button" style={{ background: color }} aria-pressed={categoryColor(c.id, c.color) === color} aria-label={color} onClick={() => commit((st) => ({
                            ...st,
                            structure: { ...st.structure, purchases: st.structure.purchases.map((p) => p.id === c.id ? { ...p, color } : p) },
                          }), color)} />
                        ))}
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
              {catOpen ? (
                <div className="ah-form sc-form is-shopcat">
                  <div className="ah-grid">
                    <label className="label is-wide">
                      <span className="lab-head">{t("sc.cat")}<FieldTip topic="f-cat-compra" /></span>
                      <input className="field" value={catName} placeholder={t("sc.cat.ph")} aria-label={t("shops.addCat")} onChange={(e) => setCatName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveCat(); }} />
                    </label>
                    <div className="label is-wide">
                      <span className="lab-head">{t("sc.color")}<FieldTip topic="f-color-compra" /></span>
                      <div className="sc-colors" role="radiogroup" aria-label={t("sc.color")}>
                        {PALETTE.map((color) => (
                          <button key={color} type="button" role="radio" style={{ background: color }} aria-checked={catColor === color} aria-pressed={catColor === color} aria-label={color} onClick={() => setCatColor(color)} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="ah-actions">
                    <button type="button" className="btn secondary" onClick={closeCat}>{t("cancel")}</button>
                    <button type="button" className="btn" disabled={!catName.trim()} onClick={saveCat}>{t("save")}</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export function Subs() {
  const { t } = useFaro();
  return <LinesBlock kind="subscription" title={t("tab.subs")} />;
}

export function Study() {
  const coach = useCoach();
  const { t, insights, slices, session, ui, setUi, lang, summary, fmt, names, lines, viewLine, key } = useFaro();
  usePinchZoom(lang);
  const [span, setSpan] = useState<"year" | "month" | "week">("year");
  const [picked, setPicked] = useState<string | null>(null);
  const [storePick, setStorePick] = useState<string | null>(null);
  const points = session ? spanPoints(session.ledger, ui.year, ui.month, span, lang) : [];
  const compare = session ? compareSpans(session.ledger, ui.year, ui.month, span, span === "week" ? 4 : span === "month" ? 6 : 3, lang) : [];
  const activeKey = span === "year"
    ? `${ui.year}-${String(ui.month).padStart(2, "0")}`
    : (points.find((p) => p.income > 0 || p.expense > 0)?.key ?? points[0]?.key ?? "");
  const board = session ? studyBoard(session.ledger, `${ui.year}-${String(ui.month).padStart(2, "0")}`, lang, names) : null;
  const sankey = session ? cashSankey(session.ledger, `${ui.year}-${String(ui.month).padStart(2, "0")}`, lang, names) : { nodes: [], links: [] };
  const parts = summary
    ? [
        { name: t("group.fixed"), minor: summary.fixed, tone: "tone-1" },
        { name: t("group.variable"), minor: summary.variable + summary.purchases, tone: "tone-2" },
        { name: t("nav.subs"), minor: summary.subscriptions, tone: "tone-4" },
      ].filter((p) => p.minor > 0)
    : [];
  const whole = Math.max(summary?.income ?? 0, 1);
  const pickedRows = picked
    ? lines.filter((l) => l.active && (l.categoryId || l.kind) === picked && !l.kind.startsWith("income"))
    : [];
  const display = session?.ledger.settings.display ?? "NIO";
  const rate = session?.ledger.settings.rateE4 ?? 0;
  const storeMap = new Map<string, { id: string; name: string; minor: number; color: string }>();
  for (const line of pickedRows) {
    if (line.kind !== "purchase" || !line.storeId) continue;
    const found = storeMap.get(line.storeId) ?? {
      id: line.storeId,
      name: names.catalog(line.storeId) || line.storeId,
      minor: 0,
      color: categoryColor(line.storeId),
    };
    found.minor += convertMinor(line.amountMinor, line.currency, display, rate);
    storeMap.set(line.storeId, found);
  }
  const storeSlices = [...storeMap.values()].sort((a, b) => b.minor - a.minor);
  const savingsCats = session?.ledger.structure.categories.filter((c) => c.role === "savings" && !c.hidden) ?? [];
  const pocketSubs = savingsCats.flatMap((c) => c.subs.filter((s) => !s.hidden && s.icon !== "vault" && !s.icon.startsWith("vault:")));
  const bankSubs = savingsCats.flatMap((c) => c.subs.filter((s) => !s.hidden && (s.icon === "vault" || s.icon.startsWith("vault:"))));
  const bag = (subId: string) => lines.filter((line) => line.active && line.subId === subId).reduce((sum, line) => sum + convertMinor(line.balanceMinor ?? line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, display, rate), 0);
  const saveBars = pocketSubs.map((sub) => ({
    id: sub.id,
    name: names.sub(sub.id),
    minor: bag(sub.id),
    color: sub.id.endsWith(".meta") ? "#8fb9a6" : sub.id.endsWith(".retiro") ? "#72b4b2" : sub.id.endsWith(".emergencia") ? "#7aa2c4" : "#d7b48a",
  }));
  const bankMinor = bankSubs.reduce((sum, sub) => sum + bag(sub.id), 0);
  if (bankSubs.length) saveBars.push({ id: "banks", name: t("study.save.banks"), minor: bankMinor, color: "#d5e2ea" });
  const saveHave = saveBars.reduce((sum, row) => sum + row.minor, 0);
  const savePeak = Math.max(...saveBars.map((row) => row.minor), 1);
  const saveGoal = summary?.savingsGoal ?? 0;
  const saveFlow = summary?.savingsFlow ?? 0;
  const saveMonth = saveGoal > 0 ? Math.max(0, Math.min(100, (saveFlow / saveGoal) * 100)) : 0;
  const owedRows = readCobros();
  const owedActive = owedRows.filter((row) => !row.archived).map((row) => {
    const due = cobroDue(row);
    return { id: row.id, person: row.person, kind: row.kind, left: convertMinor(due.left, row.currency, display, rate), paid: convertMinor(due.paid, row.currency, display, rate) };
  });
  const owedLeft = owedActive.reduce((sum, row) => sum + row.left, 0);
  const owedPaid = owedActive.reduce((sum, row) => sum + row.paid, 0);
  const owedWhole = Math.max(owedLeft + owedPaid, 1);
  const owedPlain = owedActive.filter((row) => row.kind !== "interest").reduce((sum, row) => sum + row.left, 0);
  const owedRateSum = owedActive.filter((row) => row.kind === "interest").reduce((sum, row) => sum + row.left, 0);
  const owedFile = owedRows.filter((row) => row.archived).reduce((sum, row) => sum + convertMinor(row.unpaidMinor || cobroDue(row).left, row.currency, display, rate), 0);
  const owedPeople = [...owedActive].sort((a, b) => b.left - a.left).slice(0, 5);
  const owedPeak = Math.max(...owedPeople.map((row) => row.left), 1);
  const es = lang !== "en";
  const owedAny = owedRows.length > 0;
  const visible = ["pulse", "health", "pace", "agenda", "waffle", "where", "rule", "movers", "time", "cushion", "numeros"];
  if (sankey.links.length) visible.push("sankey");
  if (board?.envelopes.length) visible.push("plan");
  if (owedAny) visible.push("owed");
  const loansAny = loanTotals(session?.ledger).count > 0;
  if (loansAny) visible.push("loans");
  const hasPeople = peopleOf(session?.ledger).length > 0;
  if (hasPeople) visible.push("people");
  const showRewards = hasRewards(session?.ledger, key);
  if (showRewards) visible.push("rewards");
  const detailRows = storePick
    ? pickedRows.filter((line) => line.storeId === storePick)
    : pickedRows.filter((line) => line.kind !== "purchase" || !line.storeId);
  return (
    <StatFoldProvider
      label={t("study.unfold")}
      pinLabel={t("study.pin")}
      foldLabel={t("study.fold")}
      sortLabel={t("study.sort")}
      moveUpLabel={t("study.sort.up")}
      moveDownLabel={t("study.sort.down")}
      openByDefault={["pulse", "health", "pace", "agenda", "waffle", "where", "people", "rewards", "rule", "movers", "time", "cushion", "plan", "owed", "loans"]}
      items={[
        { id: "pulse", label: es ? "Tu mes de un vistazo" : "Month at a glance", section: "now" },
        { id: "health", label: es ? "La salud de tu dinero" : "Your money's health", section: "now" },
        { id: "pace", label: es ? "Hasta dónde te alcanza" : "How far it goes", section: "now" },
        { id: "agenda", label: es ? "Próximos pagos" : "Payments ahead", section: "now" },
        { id: "waffle", label: es ? "Tus C$100" : "Your 100", section: "spend" },
        { id: "where", label: t("study.where"), section: "spend" },
        { id: "people", label: es ? "Gasto por persona" : "Spending by person", section: "spend" },
        { id: "rewards", label: es ? "Recompensas" : "Rewards", section: "spend" },
        { id: "sankey", label: t("study.sankey"), section: "spend" },
        { id: "rule", label: es ? "La regla 50 · 30 · 20" : "The 50 · 30 · 20 rule", section: "general" },
        { id: "plan", label: es ? "¿Vas dentro del tope?" : "Within your limits?", section: "general" },
        { id: "movers", label: es ? "Qué se movió" : "What moved", section: "general" },
        { id: "time", label: es ? "Entra, sale y queda" : "In, out and left", section: "time" },
        { id: "cushion", label: es ? "Ahorro y colchón" : "Savings and cushion", section: "save" },
        { id: "owed", label: t("study.owed.title"), section: "owed" },
        { id: "loans", label: t("study.loans.title"), section: "owed" },
        { id: "numeros", label: es ? "Números clave" : "Key numbers", section: "keys" },
      ]}
      sections={[
        { id: "now", label: es ? "Este mes" : "This month" },
        { id: "spend", label: es ? "A dónde va tu dinero" : "Where your money goes" },
        { id: "general", label: es ? "¿Vas bien?" : "Are you on track?" },
        { id: "time", label: es ? "Con el tiempo" : "Over time" },
        { id: "save", label: es ? "Tu colchón" : "Your cushion" },
        { id: "owed", label: t("study.sec.owed") },
        { id: "keys", label: es ? "Para los curiosos" : "For the curious" },
      ]}
      visible={visible}
    >
    <StudyStack>
      <StatBreaks />
      {coach ? (
        <>
          <StatFold id="pulse"><PulseCard coach={coach} /></StatFold>
          <StatFold id="health"><HealthCard coach={coach} /></StatFold>
          <StatFold id="pace"><PaceCard coach={coach} /></StatFold>
          <StatFold id="agenda"><AgendaCard coach={coach} /></StatFold>
          <StatFold id="waffle"><WaffleCard coach={coach} /></StatFold>
          <StatFold id="rule"><RuleCard coach={coach} /></StatFold>
          <StatFold id="movers"><MoversCard coach={coach} /></StatFold>
          <StatFold id="cushion"><CushionCard coach={coach} pockets={saveBars} goal={saveGoal} /></StatFold>
        </>
      ) : null}
      {insights.length === 0 ? <p>{t("stats.need")}</p> : null}
      <StatFold id="time"><TimeCard points={points} span={span} onSpan={setSpan} activeKey={activeKey} /></StatFold>
      {board?.envelopes.length ? <StatFold id="plan"><LimitsCard rows={board.envelopes} /></StatFold> : null}
      <StatFold id="numeros"><KeyNumbers items={insights} /></StatFold>
      <StudyCharts
        points={points}
        compare={compare}
        slices={slices.slice(0, 8).map((s) => ({ id: s.id, name: s.name, value: s.minor / 100, minor: s.minor, color: s.color }))}
        activeKey={activeKey}
        incomeLabel={t("study.in")}
        expenseLabel={t("study.out")}
        barsTitle={t(`study.bars.${span}`)}
        compareTitle={t(`study.compare.${span}`)}
        whereLabel={t("study.where")}
        board={board}
        sankey={sankey}
        money={fmt}
        picked={picked}
        onPick={(id) => {
          setPicked((cur) => (cur === id ? null : id));
          setStorePick(null);
        }}
        stores={storeSlices.map((store) => ({ ...store, color: STORE_TINT[store.id] ?? store.color }))}
        storePicked={storePick}
        onStore={(id) => setStorePick((cur) => (cur === id ? null : id))}
        detail={detailRows.map((l) => ({
          id: l.id,
          title: l.concept || names.cat(l.categoryId) || names.purchase(l.categoryId),
          amount: `−${viewLine(l)}`,
        }))}
        onOpen={(id) => {
          const line = pickedRows.find((l) => l.id === id);
          if (!line) return;
          setUi({ section: sectionFor(line.kind), highlight: line.id });
        }}
        copy={{
          net: t("study.net"),
          netValue: summary ? fmt(summary.opportunity) : "—",
          inValue: summary ? fmt(summary.income) : "",
          outValue: summary ? fmt(summary.expense) : "",
          now: t("study.now"),
          creepEmpty: t("study.creep.empty"),
          trend: t("study.trend"),
          flow: t("study.flow"),
          flowNote: t("study.flow.note"),
          flowBare: t("study.flow.bare"),
          sankey: t("study.sankey"),
          sankeyNote: t("study.sankey.note"),
          empty: t("stats.need"),
          rate: t("study.rate"),
          burn: t("study.burn"),
          prev: t("study.prev"),
          creep: t("study.creep"),
          plan: t("study.plan"),
          planNote: t("study.plan.note"),
          runway: t("study.runway"),
          runwayNote: t("study.runway.note"),
          top: t("study.top"),
          whereHint: es ? "Toca un rubro para ver sus tiendas y cada gasto; toca un gasto para abrirlo." : "Tap a category to see its stores and each expense; tap an expense to open it.",
        }}
      />
      {owedAny ? (
      <StatFold id="owed">
        <section className="card">
          <div className="stat-head">
            <h2 className="serif text-2xl lab-head">{t("study.owed.title")}<Hint topic="lo-que-me-deben" fitParent /></h2>
          </div>
          <p className="num serif text-3xl">{fmt(owedLeft)}</p>
          <p className="text-sm text-muted">{t("study.owed.still")}</p>
          <div className="bar-track owed-track" aria-hidden>
            <div className="bar-fill" style={{ width: `${(owedPaid / owedWhole) * 100}%` }} />
          </div>
          <div className="span-facts">
            <div><em>{t("study.owed.collected")}</em><strong className="num">{fmt(owedPaid)}</strong></div>
            <div><em>{t("cobro.plain")}</em><strong className="num">{fmt(owedPlain)}</strong></div>
            <div><em>{t("cobro.rate")}</em><strong className="num">{fmt(owedRateSum)}</strong></div>
          </div>
          {owedPeople.length ? owedPeople.map((row) => (
            <div key={row.id} className="share">
              <span className="share-name">{row.person}</span>
              <span className="num">{fmt(row.left)}</span>
              <div className="bar-track"><div className="bar-fill tone-4" style={{ width: `${Math.max(row.left > 0 ? 6 : 0, (row.left / owedPeak) * 100)}%` }} /></div>
            </div>
          )) : <p className="text-sm text-muted">{t("study.owed.empty")}</p>}
          {owedFile > 0 ? <p className="text-sm text-muted">{t("study.owed.file")}: <strong className="num">{fmt(owedFile)}</strong></p> : null}
        </section>
      </StatFold>
      ) : null}
      {loansAny ? <StatFold id="loans"><LoansStudy /></StatFold> : null}
      {hasPeople ? <StatFold id="people"><PeopleStudy /></StatFold> : null}
      {showRewards ? <StatFold id="rewards"><RewardsStudy /></StatFold> : null}
    </StudyStack>
    </StatFoldProvider>
  );
}

export function Advisor() {
  const { t, advice, budget, fmt, summary, session, lang, names, key, ui, awakeOn, wake, notePlanCopied, dismissFinding, planStale } = useFaro();
  const [copied, setCopied] = useState(false);
  const [openPart, setOpenPart] = useState<string | null>(null);
  const [spreadParts, setSpreadParts] = useState(false);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [more, setMore] = useState(false);
  const [preset, setPreset] = useState<ScenarioId>("plan");
  const [drops, setDrops] = useState<string[]>([]);
  const [applied, setApplied] = useState<string>("");
  const stackRef = useRef<HTMLDivElement>(null);
  useMasonry(stackRef, !!(budget && session && summary));
  usePinchZoom(lang);
  // "Ir allí" / [[links]]: open the plan card (or a horizon card) when asked.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === "plan" || id === "short" || id === "medium" || id === "long") setOpenCards((cur) => ({ ...cur, [id]: true }));
      else if (id === "advice-more") setMore(true);
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  if (!budget || !session || !summary) return null;
  const reading = readAdvisor(session.ledger, key, lang, names);
  const tried = projectLeft(reading, preset, drops);
  const text = [reading.plan, applied].filter(Boolean).join("\n\n");
  const mark = { short: CalendarDays, medium: CreditCard, long: Landmark } as const;
  const toneOf = (id: string) => (id === "base" ? "good" : id === "unique" ? "warn" : "gold");
  const cardOn = (id: string) => openCards[id] === true;
  const foldIds = [
    ...(awakeOn && wake ? wake.findings.map((item) => item.id) : []),
    ...advice.map((card) => card.horizon),
    "plan",
  ];
  const allOpen = spreadParts && more && foldIds.every((id) => openCards[id] === true);
  function toggleAll() {
    const next = !allOpen;
    setSpreadParts(next);
    setMore(next);
    setOpenPart(null);
    if (!next) {
      setOpenCards({});
      return;
    }
    const cards: Record<string, boolean> = {};
    for (const id of foldIds) cards[id] = true;
    setOpenCards(cards);
  }
  function toggleCard(id: string) {
    setOpenCards((cur) => ({ ...cur, [id]: !cur[id] }));
  }
  function toggleDrop(id: string) {
    setDrops((cur) => (cur.includes(id) ? cur.filter((item) => item !== id) : [...cur, id]));
    setApplied("");
  }
  function apply() {
    const scene = reading.scenarios.find((item) => item.id === preset);
    const dropped = reading.lines.filter((line) => drops.includes(line.id)).map((line) => line.name);
    const extra = dropped.length ? (lang === "en" ? ` Left out: ${dropped.join(", ")}.` : ` Fuera del ensayo: ${dropped.join(", ")}.`) : "";
    setApplied(
      lang === "en"
        ? `Applied to the plan: ${scene?.label ?? preset}. Left ${fmt(tried)}.${extra} Exploring did not change the books.`
        : `Aplicado al plan: ${scene?.label ?? preset}. Queda ${fmt(tried)}.${extra} Explorar no cambió los libros.`,
    );
  }
  return (
    <div className="advice-stack" ref={stackRef}>
      <CoachHero />
      <label className="unfold-all" data-anchor="advice-unfold">
        <input type="checkbox" checked={allOpen} onChange={toggleAll} />
        <span>{t("study.unfold")}</span>
        <Hint topic="desplegar-asesor" />
      </label>
      <section className="advice-hero-2" aria-label={reading.monthTag} data-anchor="advice-tower">
        <MonthTower reading={reading} income={summary.income} left={summary.opportunity} openPart={openPart} onPart={(id) => { setSpreadParts(false); setOpenPart((cur) => (cur === id ? null : id)); }} more={more} onMore={() => setMore((on) => !on)}>
          <div className="a2-notes">
            {[
              { id: "month", tone: "calm", Icon: CalendarDays, text: reading.headline },
              { id: "alert", tone: "warn", Icon: ArrowLeftRight, text: reading.alert },
              { id: "credit", tone: "calm", Icon: CreditCard, text: reading.creditBlurb },
            ].filter((n) => n.text).map((n) => {
              const text = String(n.text);
              const cut = text.search(/[.:](\s|$)/);
              const lead = cut > 0 ? text.slice(0, cut + 1) : text;
              const rest = cut > 0 ? text.slice(cut + 1).trim() : "";
              return (
                <div key={n.id} className={`a2-note is-${n.tone}`}>
                  <span className="a2-note-ico" aria-hidden><n.Icon /></span>
                  <p><strong>{lead}</strong>{rest ? <span> {rest}</span> : null}</p>
                </div>
              );
            })}
          </div>
          <div className="a2-tiles" data-anchor="advice-tiles">
            <span><em>{t("advice.in")}</em><strong className="num">{fmt(summary.income)}</strong></span>
            <span><em>{t("advice.out")}</em><strong className="num">{fmt(summary.expense)}</strong></span>
            {reading.realSpend !== summary.expense ? <span><em>{t("advice.real")}</em><strong className="num">{fmt(reading.realSpend)}</strong></span> : null}
            <span className={summary.opportunity < 0 ? "is-short" : "is-left"}><em>{summary.opportunity < 0 ? t("advice.short") : t("advice.left")}</em><strong className="num">{fmt(Math.abs(summary.opportunity))}</strong></span>
          </div>
        </MonthTower>
      </section>
      {awakeOn && wake?.notice ? <p className="advice-because is-notice">{wake.notice}</p> : null}
      {awakeOn && wake ? wake.findings.map((item) => {
        const open = cardOn(item.id);
        return (
          <section key={item.id} className="advice-card is-plan" data-anchor="advice-findings">
            <div role="button" tabIndex={0} className="advice-head" aria-expanded={open} onClick={() => toggleCard(item.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCard(item.id); } }}>
              <div>
                <p className="advice-kicker"><span className="lab-head">{t("awake.finding")}<Hint topic="reconciliacion" /></span></p>
                <h2 className="serif">{item.title}</h2>
              </div>
              <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
            </div>
            {open ? (
              <>
                <p className="advice-lead">{item.body}</p>
                <p className="advice-because">{item.cause}</p>
                <button type="button" className="btn ghost advice-copy" onClick={() => dismissFinding(item.id, item.reason)}>{t("awake.dismiss")}</button>
              </>
            ) : null}
          </section>
        );
      }) : null}
      {advice.map((card, index) => {
        const Icon = mark[card.horizon];
        const open = cardOn(card.horizon);
        const teaser = adviceTeaser(card, reading, fmt, lang, new Date(ui.year, ui.month, 0).getDate() || 30);
        const rows = card.points.filter((point) => {
          if (card.horizon === "short" && (["Base", "Únicas", "Apartado", "One-offs", "Transfer", "De siempre", "De una vez", "Ahorro", "Usual", "One-time", "Saved"].includes(point.label))) return false;
          return card.horizon === "short" || !point.emphasis;
        });
        return (
          <article key={card.horizon} data-anchor={`advice-${card.horizon}`} className={`advice-card is-${card.horizon} is-${index === 0 ? reading.tone : card.horizon === "medium" ? (summary.tone === "bad" ? "bad" : "good") : "good"}`} style={{ ["--enter" as string]: `${index + 1}` }}>
            <div role="button" tabIndex={0} className="advice-head" aria-expanded={open} onClick={() => toggleCard(card.horizon)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCard(card.horizon); } }}>
              <span className="advice-mark" aria-hidden><Icon className="size-4" /></span>
              <div>
                <p className="advice-kicker"><span className="lab-head">{t(`advice.horizon.${card.horizon}`)}<Hint topic={card.horizon === "short" ? "horizonte-mes" : card.horizon === "medium" ? "horizonte-90" : "horizonte-12"} /></span></p>
                <h2 className="serif">{card.title}</h2>
                {!open && teaser ? <p className="advice-teaser"><strong className="num">{teaser.big}</strong><span>{teaser.small}</span></p> : null}
              </div>
              <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
            </div>
            {awakeOn && wake?.causes[card.horizon] ? <p className="advice-because">{wake.causes[card.horizon]}</p> : null}
            {open ? (
              <>
                {card.horizon === "short" ? <ShortVisual reading={reading} /> : card.horizon === "medium" ? <MediumVisual card={card} reading={reading} /> : <LongVisual card={card} />}
                {card.horizon === "short" && reading.compareNote ? <p className="advice-aside">{reading.compareNote}</p> : null}
              </>
            ) : null}
          </article>
        );
      })}
      <section className="advice-card is-plan is-start" data-anchor="advice-plan" style={{ ["--enter" as string]: "4" }}>
        <div role="button" tabIndex={0} className="advice-head" aria-expanded={cardOn("plan")} onClick={() => toggleCard("plan")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCard("plan"); } }}>
          <span className="advice-mark" aria-hidden><ListChecks className="size-4" /></span>
          <div>
            <p className="advice-kicker"><span className="lab-head">{t("advice.plan.kicker")}<Hint topic="por-donde-empezar" /></span></p>
            <h2 className="serif">{t("advice.plan")}</h2>
            {!cardOn("plan") ? <p className="advice-teaser"><strong className="num">{clipWords(reading.plan.match(/^(24 horas|24 hours):\s*(.+?)(?:[.:](?:\s|$))/m)?.[2] ?? "", 120)}</strong><span>{lang === "en" ? "first step" : "primer paso"}</span></p> : null}
          </div>
          <ChevronDown className={cardOn("plan") ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
        </div>
        {awakeOn && planStale ? <p className="advice-stale">{t("awake.stale")}</p> : null}
        {cardOn("plan") ? (
          <>
            {(() => {
              const lines = reading.plan.split("\n");
              const steps = lines.flatMap((line) => {
                const step = line.match(/^(24 horas|7 días|30 días|90 días|24 hours|7 days|30 days|90 days):\s*(.*)$/);
                if (!step) return [];
                const chip = step[1].replace(" horas", " h").replace(" hours", " h").replace(" días", " d").replace(" days", " d");
                return [{ chip, text: step[2] }];
              });
              const rest = lines.filter((line) => !/^(24 horas|7 días|30 días|90 días|24 hours|7 days|30 days|90 days):/.test(line));
              const sum = rest.map((line) => line.match(/^(Plan Faro|Faro plan)\s+[—–-]\s+(.*?)\s+\((?:te queda|queda|left):\s*(.+)\)$/)).find(Boolean);
              const notes = rest.filter((line) => !/^(Plan Faro|Faro plan)\s/.test(line));
              return (
                <>
                  <PlanRoute steps={steps} sum={sum ? { title: sum[1], body: sum[2], left: sum[3] } : null} />
                  {notes.map((line) => <p key={line} className="advice-caption is-foot">{line}</p>)}
                </>
              );
            })()}
            <div className="advice-sim" data-anchor="advice-sim">
              <p className="advice-kicker"><span className="lab-head">{t("advice.sim")}<Hint topic="que-pasa-si" /></span></p>
              <div className="advice-presets" role="tablist" aria-label={t("advice.sim")}>
                {reading.scenarios.map((scene) => (
                  <button key={scene.id} type="button" role="tab" className="btn ghost" aria-selected={preset === scene.id} aria-pressed={preset === scene.id} onClick={() => { setPreset(scene.id); setApplied(""); }}>
                    {scene.label}
                  </button>
                ))}
              </div>
              <div className="advice-preset-help" aria-live="polite">
                <p className="advice-kicker">{t("advice.sim.help")}</p>
                <p>{reading.scenarios.find((scene) => scene.id === preset)?.detail}</p>
              </div>
              <ul className="advice-drops">
                {reading.lines.filter((line) => line.cls === "unique" || line.cls === "transfer").slice(0, 6).map((line) => (
                  <li key={line.id}>
                    <button type="button" aria-pressed={drops.includes(line.id)} onClick={() => toggleDrop(line.id)}>
                      <span>{line.name}</span>
                      <strong className="num">{fmt(line.minor)}</strong>
                      <em>{drops.includes(line.id) ? t("advice.back") : t("advice.drop")}</em>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="advice-tried"><em>{preset === "base" ? reading.scenarios[0]?.label : preset === "repeat" ? reading.scenarios[1]?.label : reading.scenarios[2]?.label}</em><strong className="num">{fmt(tried)}</strong></p>
              <div className="advice-acts">
                <button type="button" className="btn secondary" onClick={apply}>{t("advice.apply")}</button>
                <button type="button" className="btn secondary advice-copy" onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); notePlanCopied(); }}>{copied ? t("advice.copied") : t("advice.copy")}</button>
                <Hint topic="copiar-plan" alt={planStale} />
              </div>
              {applied ? <p className="advice-aside">{t("advice.applied")} {applied}</p> : null}
            </div>
          </>
        ) : null}
      </section>
      <PeopleAdviceCard />
      <RewardsAdvice />
    </div>
  );
}

function ThemeSide({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="theme-fold">
      <button type="button" className="theme-fold-btn" aria-expanded={open} onClick={onToggle}>
        <span>{title}</span>
        <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
      </button>
      {open ? <div className="theme-grid">{children}</div> : null}
    </div>
  );
}

function Fold({ id, topic, title, sub, icon: Icon, open, onToggle, children }: { id: string; topic: string; title: string; sub: string; icon: typeof Gear; open: boolean; onToggle: () => void; children: ReactNode }) {
  // Same row as Manual de uso / Importar movimientos: icon, bold title + (?), one-line subtitle, chevron.
  // The header is a div-button so the title's (?) can sit right after the title without nesting buttons.
  return (
    <section className="card manual-card aj-card" data-anchor={`aj-${id === "rate" ? "rules" : id}`} data-fold={id}>
      <div role="button" tabIndex={0} className="manual-row fold-btn aj-row" aria-expanded={open} onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}>
        <Icon aria-hidden />
        <span className="manual-row-text">
          <div className="fold-title aj-title"><h2 className="serif">{title}</h2><Hint topic={topic} /></div>
          <span className="aj-sub">{sub}</span>
        </span>
        <ChevronDown className={open ? "fold-chev is-open" : "fold-chev"} />
      </div>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

/** Shorten at a word boundary (never mid-word); an ellipsis marks the cut. */
function clipWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(" ", max);
  return `${text.slice(0, cut > 0 ? cut : max).replace(/[\s,;:–—-]+$/, "")}…`;
}

export function Settings() {
  const { t, lang, session, commit, ui, setUi, exportJson, importFile, pickFolder, restoreConflict, hasConflict, saveRate, confirm, backups, backupNow, restoreBackup, openManual } = useFaro();
  const [openFold, setOpenFold] = useState<string | null>(null);
  const [themeSide, setThemeSide] = useState<{ day: boolean; night: boolean } | null>(null);
  const [rateText, setRateText] = useState(session ? formatRate(session.ledger.settings.rateE4) : "");
  const boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = boardRef.current;
    if (!root) return;
    let frame = 0;
    const apply = () => {
      const host = root.closest(".app-frame");
      const split = !!host?.classList.contains("is-split");
      const land = window.matchMedia("(orientation: landscape) and (max-height: 520px) and (max-width: 1099px)").matches;
      const wide = window.matchMedia("(min-width: 1100px)").matches;
      const pair = (land || wide) && !split;
      const cards = [...root.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains("card"));
      if (!pair) {
        root.style.removeProperty("position");
        root.style.removeProperty("height");
        for (const el of cards) {
          el.style.removeProperty("position");
          el.style.removeProperty("top");
          el.style.removeProperty("left");
          el.style.removeProperty("width");
          el.style.removeProperty("margin");
        }
        return;
      }
      const gap = 10;
      const colW = Math.max(0, (root.clientWidth - gap) / 2);
      let yL = 0;
      let yR = 0;
      cards.forEach((el, index) => {
        const left = index % 2 === 0;
        const y = left ? yL : yR;
        el.style.position = "absolute";
        el.style.top = `${y}px`;
        el.style.left = left ? "0px" : `${colW + gap}px`;
        el.style.width = `${colW}px`;
        el.style.margin = "0";
        const next = y + el.offsetHeight + gap;
        if (left) yL = next;
        else yR = next;
      });
      root.style.position = "relative";
      const next = `${Math.ceil(Math.max(yL, yR))}px`;
      if (root.style.height !== next) root.style.height = next;
    };
    const watch = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };
    const ro = new ResizeObserver(watch);
    const arm = () => {
      ro.disconnect();
      for (const el of root.querySelectorAll(":scope > .card")) ro.observe(el);
      watch();
    };
    const mo = new MutationObserver(arm);
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener("resize", watch);
    arm();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", watch);
    };
  }, [openFold]);
  // "Ir allí" / [[links]] open the right section.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (["lang", "theme", "structure", "rate", "keys", "gestures", "backup", "banks", "account"].includes(id)) setOpenFold(id);
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  if (!session) return null;
  const settings = session.ledger.settings;
  function toggle(id: string) { setOpenFold((cur) => (cur === id ? null : id)); }
  return (
    <div ref={boardRef} className="grid gap-3 settings-board">
      <Fold id="lang" icon={Languages} sub={lang === "en" ? "Spanish or English" : "Español o inglés"} topic="idioma" title={t("settings.lang")} open={openFold === "lang"} onToggle={() => toggle("lang")}>
        <div className="aj-seg" role="group" aria-label={t("settings.lang")}>
          {(["es", "en"] as const).map((id) => (
            <button key={id} type="button" className="aj-seg-btn" aria-pressed={lang === id} onClick={() => { localStorage.setItem("faro-lang", id); commit((s) => ({ ...s, settings: { ...s.settings, lang: id } }), id); }}>{t(`lang.${id}`)}</button>
          ))}
        </div>
      </Fold>
      <Fold id="theme" icon={Palette} sub={lang === "en" ? "Day and night colors" : "Colores de día y noche"} topic="temas" title={t("settings.theme")} open={openFold === "theme"} onToggle={() => toggle("theme")}>
        {(() => {
          const night = NIGHT_THEMES.includes(settings.theme);
          const groups = themeSide ?? { day: !night, night };
          const swatch = (id: ThemeId) => (
            <button key={id} type="button" className={`theme-swatch swatch-${id}`} aria-pressed={settings.theme === id || (id === "ion-noche" && settings.theme === "ion")} onClick={() => {
              const next = id;
              commit((s) => ({ ...s, settings: { ...s.settings, theme: next } }), next);
            }}>
              <span className="swatch-scene" aria-hidden>
                <i className="swatch-bar" />
                <i className="swatch-chip" />
                <i className="swatch-chip is-accent" />
              </span>
              <strong>{t(`theme.${id}`)}</strong>
            </button>
          );
          return (
            <>
              <ThemeSide title={t("theme.day")} open={groups.day} onToggle={() => setThemeSide({ ...groups, day: !groups.day })}>
                {DAY_THEMES.map(swatch)}
              </ThemeSide>
              <ThemeSide title={t("theme.night")} open={groups.night} onToggle={() => setThemeSide({ ...groups, night: !groups.night })}>
                {NIGHT_THEMES.map(swatch)}
              </ThemeSide>
            </>
          );
        })()}
      </Fold>
      <Fold id="structure" icon={FolderTree} sub={lang === "en" ? "Categories and stores" : "Categorías y tiendas"} topic="estructura" title={t("settings.structure")} open={openFold === "structure"} onToggle={() => toggle("structure")}>
        <div className="aj-picks">
          {(["soltero", "familia", "estudiante", "negocio"] as TemplateId[]).map((id) => (
            <button key={id} type="button" className="btn ghost aj-pick" onClick={() => confirm({ title: t(`tpl.${id}`), body: templateBlurb(id, lang), yes: t("yes"), run: () => commit((s) => ({ ...s, structure: applyTemplate(s.structure, id) }), id) })}>{t(`tpl.${id}`)}</button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{templateBlurb("familia", lang)}</p>
        <StructureTree />
        <h2 className="serif mt-4 text-xl lab-head" data-anchor="aj-catalog">{t("settings.catalog")}<Hint topic="catalogo" /></h2>
        <CatalogEditor />
      </Fold>
      <Fold id="banks" icon={CreditCard} sub={lang === "en" ? "Cards, rates and bonuses" : "Tarjetas, tasas y bonos"} topic="bancos" title={lang === "en" ? "Banks and rewards" : "Bancos y recompensas"} open={openFold === "banks"} onToggle={() => toggle("banks")}>
        <BankSettings />
      </Fold>
      <ImportRow />
      <Fold id="rate" icon={SlidersHorizontal} sub={lang === "en" ? "Goals, signal and rate" : "Metas, semáforo y tasa"} topic="reglas" title={t("settings.rate")} open={openFold === "rate"} onToggle={() => toggle("rate")}>
        <label className="label" data-anchor="aj-goal"><span className="lab-head">{glueHint(t("settings.goal"), <Hint topic="meta-ahorro" fitParent />)}</span>
          <input className="field num" defaultValue={settings.savingsGoalPct} onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, savingsGoalPct: Number(e.target.value) || 0 } }), "goal")} />
        </label>
        <label className="label mt-2" data-anchor="aj-green"><span className="lab-head">{glueHint(t("settings.green"), <Hint topic="semaforo-verde" fitParent />)}</span>
          <input className="field num" defaultValue={settings.debtGreenPct} onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, debtGreenPct: Number(e.target.value) || 0 } }), "green")} />
        </label>
        <label className="label mt-2" data-anchor="aj-yellow"><span className="lab-head">{glueHint(t("settings.yellow"), <Hint topic="semaforo-amarillo" fitParent />)}</span>
          <input className="field num" defaultValue={settings.debtYellowPct} onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, debtYellowPct: Number(e.target.value) || 0 } }), "yellow")} />
        </label>
        <label className="label mt-2" data-anchor="aj-months"><span className="lab-head">{glueHint(t("settings.emergency"), <Hint topic="meses-colchon" fitParent />)}</span>
          <input className="field num" defaultValue={settings.emergencyMonths} onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, emergencyMonths: Number(e.target.value) || 0 } }), "months")} />
        </label>
        <div className="row mt-3" data-anchor="aj-rate">
          <input className="field num" value={rateText} onChange={(e) => setRateText(e.target.value)} aria-label={t("rate.manual")} />
          <button type="button" className="btn" onClick={() => saveRate(rateText)}>{t("rate.manual")}</button>
          <Hint topic="tasa-manual" className="is-after" />
        </div>
      </Fold>
      <Fold id="keys" icon={Keyboard} sub={lang === "en" ? "One key per action" : "Una tecla por acción"} topic="atajos-teclado" title={t("settings.shortcuts")} open={openFold === "keys"} onToggle={() => toggle("keys")}>
        {SHORTCUT_ACTIONS.map((action) => (
          <div key={action} className={`key-row${ui.rebind === action ? " is-rebinding" : ""}`}>
            <span className="key-name">{shortcutLabel(lang, action)}</span>
            <kbd className="key-combo num">{settings.shortcuts[action] || DEFAULT_SHORTCUTS[action]}</kbd>
            <button type="button" className="btn ghost key-change" onClick={() => setUi({ rebind: action })}>{ui.rebind === action ? t("settings.press") : t("settings.rebind")}</button>
          </div>
        ))}
        <button type="button" className="btn ghost mt-2" onClick={() => commit((s) => ({ ...s, settings: { ...s.settings, shortcuts: { ...DEFAULT_SHORTCUTS } } }), "keys")}>{t("settings.resetKeys")}</button>
      </Fold>
      <Fold id="gestures" icon={Hand} sub={lang === "en" ? "Long or double tap" : "Toque largo o doble"} topic="atajos-mas-menos" title={t("gesture.title")} open={openFold === "gestures"} onToggle={() => toggle("gestures")}>
        <p className="text-sm text-muted">{t("gesture.help")}</p>
        {([
          ["in.hold", "gesture.inHold"],
          ["in.double", "gesture.inDouble"],
          ["out.hold", "gesture.outHold"],
          ["out.double", "gesture.outDouble"],
        ] as const).map(([slot, label]) => {
          const income = slot.startsWith("in.");
          const options = [{ value: "", label: t("gesture.none") }];
          if (income) {
            options.push({ value: "income-fixed", label: t("income.fixed") }, { value: "income-variable", label: t("income.variable") });
          } else {
            for (const cat of session.ledger.structure.categories.filter((c) => !c.hidden && c.group === "fixed").sort((a, b) => a.order - b.order)) {
              options.push({ value: `expense-fixed:${cat.id}`, label: `${t("group.fixed")} · ${displayName(cat, lang)}` });
            }
            for (const cat of session.ledger.structure.categories.filter((c) => !c.hidden && c.group === "variable").sort((a, b) => a.order - b.order)) {
              options.push({ value: `expense-variable:${cat.id}`, label: `${t("group.variable")} · ${displayName(cat, lang)}` });
            }
            for (const shop of session.ledger.structure.purchases.filter((p) => !p.hidden).sort((a, b) => a.order - b.order)) {
              options.push({ value: `purchase:${shop.id}`, label: `${t("nav.shops")} · ${displayName(shop, lang)}` });
            }
            options.push({ value: "subscription", label: t("tab.subs") });
          }
          return (
            <label key={slot} className="label mt-3">
              {t(label)}
              <ThemeSelect
                value={settings.gestures?.[slot] ?? ""}
                onChange={(value) => commit((s) => {
                  const gestures = { ...(s.settings.gestures ?? {}) };
                  if (value) gestures[slot] = value;
                  else delete gestures[slot];
                  return { ...s, settings: { ...s.settings, gestures } };
                }, slot)}
                options={options}
              />
            </label>
          );
        })}
      </Fold>
      <section className="card manual-card" data-anchor="aj-manual" data-topic-box="manual">
        <button type="button" className="manual-row fold-btn" onClick={() => openManual("")}>
          <BookOpen aria-hidden />
          <span className="manual-row-text"><strong className="serif">{t("manual.title")}</strong><span>{t("manual.row")}</span></span>
          <ChevronRight aria-hidden />
        </button>
      </section>
      <Fold id="backup" icon={ShieldCheck} sub={lang === "en" ? "On device and in cloud" : "En el equipo y la nube"} topic="copias" title={t("settings.backup")} open={openFold === "backup"} onToggle={() => toggle("backup")}>
        <BackupPanel backups={backups} onNow={backupNow} onRestore={restoreBackup} />
        <div className="vault-more">
          <button type="button" className="btn secondary" onClick={exportJson}>{t("settings.export")}</button>
          <label className="btn secondary">{t("settings.import")}<input type="file" accept="application/json,application/gzip,.json,.gz" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.currentTarget.value = ""; }} /></label>
          <button type="button" className="btn ghost" onClick={pickFolder}>{t("settings.folder")}</button>
          {hasConflict ? <button type="button" className="btn" onClick={restoreConflict}>{t("settings.conflict")}</button> : null}
        </div>
        <h2 className="serif mt-4 text-xl lab-head" data-anchor="aj-activity">{t("settings.activity")}<Hint topic="actividad" /></h2>
        {session.ledger.audit.slice(0, 8).map((a) => <p key={a.id} className="text-sm text-muted">{auditLabel(lang, a.detail)}</p>)}
      </Fold>
      <Fold id="account" icon={UserRound} sub={lang === "en" ? "Login, sync, fingerprint" : "Sesión, nube y huella"} topic="cuenta" title={t("account")} open={openFold === "account"} onToggle={() => toggle("account")}>
        <UserButton />
      </Fold>
    </div>
  );
}

function BackupPanel({ backups, onNow, onRestore }: { backups: BackupInfo[]; onNow: () => void; onRestore: (b: BackupInfo) => void }) {
  const { t, lang } = useFaro();
  const loc = lang === "en" ? "en-US" : "es-NI";
  const when = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    // The time keeps its "AM"/"a. m." with it (no break inside "11:36 AM"); the date may still wrap between words.
    const parts = new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).formatToParts(d);
    const h = parts.findIndex((x) => x.type === "hour");
    return parts.map((x, i) => (i > h && h >= 0 ? x.value.replace(/\s/g, "\u00a0") : x.value)).join("");
  };
  const dayLabel = (day: string) => {
    const safety = day.endsWith("·");
    const d = new Date(`${day.slice(0, 10)}T12:00:00`);
    const base = d.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
    return safety ? `${base} · ${t("backup.safety")}` : base;
  };
  const kb = (n: number) => (n < 1024 ? `${n}\u00a0B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)}\u00a0KB`);
  const last = (where: "device" | "cloud") => backups.filter((b) => b.where === where).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const places: Array<["device" | "cloud", BackupInfo | undefined]> = [["device", last("device")], ["cloud", last("cloud")]];
  return (
    <div className="vault">
      <div className="vault-head">
        <span className="vault-seal" aria-hidden>
          <svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.3 7.5 9.5 4.4-1.2 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m8.6 12.2 2.4 2.4 4.4-4.6" /></svg>
        </span>
        <div>
          <p className="vault-title">{t("backup.auto")}</p>
          <p className="vault-sub">{t("backup.keep")}</p>
        </div>
      </div>
      <div className="vault-places">
        {places.map(([where, b]) => (
          <div key={where} className={`vault-place${b ? " is-on" : ""}`}>
            <span className="vault-icon" aria-hidden>
              {where === "device"
                ? <svg viewBox="0 0 24 24"><rect x="7" y="2.8" width="10" height="18.4" rx="2.4" /><path d="M10.5 18h3" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M7.2 18.5h10a4 4 0 0 0 .6-7.95A5.6 5.6 0 0 0 6.9 9.3a4.6 4.6 0 0 0 .3 9.2Z" /></svg>}
            </span>
            <span className="vault-where">{t(`backup.where.${where}`)}</span>
            <span className="vault-when">{b ? when(b.at) : "—"}</span>
            {b ? <span className="vault-size num">{kb(b.bytes)}</span> : null}
          </div>
        ))}
      </div>
      <button type="button" className="btn vault-now" onClick={onNow}>{t("backup.now")}</button>
      {backups.length ? (
        <>
          <h3 className="vault-list-title">{t("backup.list")}</h3>
          <ul className="vault-list">
            {backups.slice(0, 10).map((b) => (
              <li key={`${b.where}-${b.day}`}>
                <span className="vault-dot" data-where={b.where} aria-hidden />
                <span className="vault-day">{dayLabel(b.day)}<small>{t(`backup.where.${b.where}`)} · <span className="num">{kb(b.bytes)}</span></small></span>
                <button type="button" className="btn ghost vault-restore" onClick={() => onRestore(b)}>{t("backup.restore")}</button>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="vault-sub mt-3">{t("backup.none")}</p>}
    </div>
  );
}

function StructureTree() {
  const { t, lang, session, commit } = useFaro();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catGroup, setCatGroup] = useState<"fixed" | "variable">("fixed");
  if (!session) return null;
  const addCat = () => {
    const name = catName.trim();
    if (!name) return;
    commit((s) => {
      const id = `c-${uid().slice(0, 8)}`;
      const order = s.structure.categories.filter((c) => c.group === catGroup).length;
      const cat: Category = { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order, group: catGroup, role: "", subs: [] };
      return { ...s, structure: { ...s.structure, categories: [...s.structure.categories, cat] } };
    }, name);
    setCatName("");
  };
  const needle = q.trim().toLowerCase();
  const categories = session.ledger.structure.categories.slice().sort((a, b) => a.order - b.order);
  const visible = (cat: Category) => {
    if (!needle) return true;
    const blob = [displayName(cat, lang), ...cat.subs.map((sub) => displayName(sub, lang))].join(" ").toLowerCase();
    return blob.includes(needle);
  };
  const groups = (["fixed", "variable"] as const).map((group) => ({
    group,
    rows: categories.filter((cat) => cat.group === group && visible(cat)),
  })).filter((group) => group.rows.length > 0);
  return (
    <div className="mt-4" data-anchor="aj-tree">
      <div className="search-pill">
        <Search className="size-4" aria-hidden />
        <input value={q} placeholder={t("tree.find")} onChange={(e) => setQ(e.target.value)} aria-label={t("tree.find")} />
      </div>
      {groups.length === 0 ? <p className="mt-3 text-sm text-muted">{t("tree.empty")}</p> : null}
      {groups.map(({ group, rows }) => (
        <div key={group}>
          <p className="tree-kicker">{t(group === "fixed" ? "group.fixed" : "group.variable")}</p>
          <div className="tree">
            {rows.map((cat) => {
              const open = openId === cat.id;
              return (
                <div key={cat.id} className={cat.hidden ? "is-muted" : undefined}>
                  <button type="button" className="tree-row" aria-expanded={open} onClick={() => setOpenId(open ? null : cat.id)}>
                    <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
                    <span className="min-w-0">
                      <span className="tree-name"><i className="sw tree-swatch" style={{ background: categoryColor(cat.id, cat.color) }} />{displayName(cat, lang)}</span>
                      <span className="tree-subs">{cat.subs.map((sub) => displayName(sub, lang)).join(" · ") || "—"}</span>
                    </span>
                  </button>
                  {open ? <TreePanel cat={cat} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="ah-form sc-form is-treecat">
        <div className="ah-grid">
          <label className="label is-wide">
            <span className="lab-head">{t("add.cat")}<FieldTip topic="f-cat-arbol" /></span>
            <input className="field" value={catName} onChange={(e) => setCatName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCat(); }} placeholder={t("sc.treeCat.ph")} aria-label={t("add.cat")} />
          </label>
          <div className="label is-wide">
            <span className="lab-head">{t("sc.group")}<FieldTip topic="f-grupo" /></span>
            <div className="ah-sign" role="radiogroup" aria-label={t("sc.group")}>
              {(["fixed", "variable"] as const).map((g) => (
                <button key={g} type="button" role="radio" aria-checked={catGroup === g} aria-pressed={catGroup === g} onClick={() => setCatGroup(g)}>{t(`sc.${g}`)}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="ah-actions">
          <button type="button" className="btn secondary" onClick={() => { setCatName(""); setCatGroup("fixed"); }}>{t("cancel")}</button>
          <button type="button" className="btn" disabled={!catName.trim()} onClick={addCat}>{t("save")}</button>
        </div>
      </div>
    </div>
  );
}

function TreePanel({ cat }: { cat: Category }) {
  const { t, lang, commit, confirm } = useFaro();
  const [name, setName] = useState(displayName(cat, lang));
  const [subName, setSubName] = useState("");
  const [editSub, setEditSub] = useState<string | null>(null);
  const [subEdit, setSubEdit] = useState("");
  const addSub = () => {
    const next = subName.trim();
    if (!next) return;
    patch((c) => ({ ...c, subs: [...c.subs, { id: `${c.id}.${uid().slice(0, 6)}`, nameKey: "", customName: next, icon: "Circle", hidden: false, order: c.subs.length }] }), next);
    setSubName("");
  };
  function patch(run: (cat: Category) => Category, detail: string) {
    commit((s) => ({
      ...s,
      structure: { ...s.structure, categories: s.structure.categories.map((c) => c.id === cat.id ? run(c) : c) },
    }), detail);
  }
  return (
    <div className="tree-open">
      <div className="row">
        <input className="field" value={name} aria-label={t("rename")} onChange={(e) => setName(e.target.value)} />
        <button type="button" className="icon-btn" aria-label={t("rename")} onClick={() => {
          const next = name.trim();
          if (!next || next === displayName(cat, lang)) return;
          patch((c) => ({ ...c, customName: next }), next);
        }}><Check className="size-4" /></button>
      </div>
      <div className="color-row" role="listbox" aria-label={t("color")}>
        {PALETTE.map((hex) => (
          <button key={hex} type="button" className="color-dot" style={{ background: hex }} aria-pressed={categoryColor(cat.id, cat.color) === hex} onClick={() => patch((c) => ({ ...c, color: hex }), "color")} />
        ))}
      </div>
      <div className="tree-tools">
        <button type="button" className="icon-btn" aria-label={t("up")} onClick={() => commit((s) => ({ ...s, structure: { ...s.structure, categories: moveNamed(s.structure.categories.filter((c) => c.group === cat.group), cat.id, -1).concat(s.structure.categories.filter((c) => c.group !== cat.group)) } }), "up")}><ChevronUp className="size-4" /></button>
        <button type="button" className="icon-btn" aria-label={t("down")} onClick={() => commit((s) => ({ ...s, structure: { ...s.structure, categories: moveNamed(s.structure.categories.filter((c) => c.group === cat.group), cat.id, 1).concat(s.structure.categories.filter((c) => c.group !== cat.group)) } }), "down")}><ChevronDown className="size-4" /></button>
        <button type="button" className="icon-btn" aria-label={cat.hidden ? t("show") : t("hide")} onClick={() => patch((c) => ({ ...c, hidden: !c.hidden }), "hide")}>{cat.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
        <button type="button" className="icon-btn" aria-label={cat.group === "fixed" ? t("move.variable") : t("move.fixed")} onClick={() => patch((c) => ({ ...c, group: c.group === "fixed" ? "variable" : "fixed" }), "move")}><ArrowLeftRight className="size-4" /></button>
        <button type="button" className="icon-btn line-act is-danger" aria-label={t("delete")} onClick={() => confirm({ title: t("delete"), body: `${displayName(cat, lang)}. ${t("delete.warn")}`, danger: true, yes: t("yes"), run: () => commit((s) => ({ ...s, structure: { ...s.structure, categories: s.structure.categories.filter((c) => c.id !== cat.id) } }), "delete cat") })}><Trash2 className="size-4" /></button>
      </div>
      {cat.subs.map((sub) => (
        <div key={sub.id} className="tree-sub">
          {editSub === sub.id ? (
            <input className="field" value={subEdit} aria-label={t("rename")} autoFocus onChange={(e) => setSubEdit(e.target.value)} onKeyDown={(e) => {
              if (e.key === "Escape") setEditSub(null);
              if (e.key !== "Enter") return;
              const next = subEdit.trim();
              if (next) patch((c) => ({ ...c, subs: c.subs.map((x) => x.id === sub.id ? { ...x, customName: next } : x) }), next);
              setEditSub(null);
            }} />
          ) : (
            <button type="button" className="tree-subname" onClick={() => { setEditSub(sub.id); setSubEdit(displayName(sub, lang)); }}>{displayName(sub, lang)}</button>
          )}
          <span className="row">
            <button type="button" className="icon-btn" aria-label={sub.hidden ? t("show") : t("hide")} onClick={() => patch((c) => ({ ...c, subs: c.subs.map((x) => x.id === sub.id ? { ...x, hidden: !x.hidden } : x) }), sub.id)}>{sub.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
            <button type="button" className="icon-btn line-act is-danger" aria-label={t("delete")} onClick={() => confirm({ title: t("delete"), body: displayName(sub, lang), danger: true, yes: t("yes"), run: () => patch((c) => ({ ...c, subs: c.subs.filter((x) => x.id !== sub.id) }), sub.id) })}><Trash2 className="size-4" /></button>
          </span>
        </div>
      ))}
      <div className="ah-form sc-form is-treesub">
        <div className="ah-grid">
          <label className="label is-wide">
            <span className="lab-head">{t("sc.sub")}<FieldTip topic="f-subcat" /></span>
            <input className="field" value={subName} onChange={(e) => setSubName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addSub(); }} placeholder={t("sc.sub.ph")} aria-label={t("add.sub")} />
          </label>
        </div>
        <div className="ah-actions">
          <button type="button" className="btn secondary" onClick={() => setSubName("")}>{t("cancel")}</button>
          <button type="button" className="btn" disabled={!subName.trim()} onClick={addSub}>{t("save")}</button>
        </div>
      </div>
    </div>
  );
}

function CatalogEditor() {
  const { t, lang, session, commit, confirm } = useFaro();
  const [itemName, setItemName] = useState("");
  const [iconFor, setIconFor] = useState<string | null>(null);
  const catalog = session?.ledger.structure.catalog ?? [];
  const addItem = () => {
    const name = itemName.trim();
    if (!name) return;
    commit((s) => ({
      ...s,
      structure: { ...s.structure, catalog: [...s.structure.catalog, { id: `c-${uid().slice(0, 8)}`, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, kind: "store", urlTemplate: "" }] },
    }), name);
    setItemName("");
  };
  return (
    <div className="mt-2">
      {catalog.map((item) => (
        <div key={item.id} className="line-row">
          <div className="row min-w-0">
            {item.icon.startsWith("brand:") ? <BrandMark id={item.icon.slice(6)} className="size-8" /> : item.kind === "store" ? <BrandMark id={item.id} className="size-8" /> : <Glyph name={item.icon} />}
            <span className="truncate">{displayName(item, lang)}</span>
          </div>
          <div className="row">
            <button type="button" className="icon-btn" aria-label={t("icon.pick")} onClick={() => setIconFor(iconFor === item.id ? null : item.id)}><Palette className="size-4" /></button>
            <button type="button" className="icon-btn line-act is-danger" aria-label={t("delete")} onClick={() => confirm({ title: t("delete"), body: displayName(item, lang), danger: true, yes: t("yes"), run: () => commit((s) => ({ ...s, structure: { ...s.structure, catalog: s.structure.catalog.filter((c) => c.id !== item.id) } }), item.id) })}><Trash2 className="size-4" /></button>
          </div>
        </div>
      ))}
      {iconFor ? (
        <div className="row mt-2">
          {ICON_NAMES.map((name) => (
            <button key={name} type="button" className="icon-btn" aria-label={name} onClick={() => {
              commit((s) => ({ ...s, structure: { ...s.structure, catalog: s.structure.catalog.map((c) => c.id === iconFor ? { ...c, icon: name } : c) } }), name);
              setIconFor(null);
            }}><Glyph name={name} /></button>
          ))}
        </div>
      ) : null}
      <div className="ah-form sc-form is-item">
        <div className="ah-grid">
          <label className="label is-wide">
            <span className="lab-head">{t("sc.item")}<FieldTip topic="f-catalogo" /></span>
            <input className="field" value={itemName} placeholder={t("sc.item.ph")} aria-label={t("add.item")} onChange={(e) => setItemName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addItem(); }} />
          </label>
        </div>
        <div className="ah-actions">
          <button type="button" className="btn secondary" onClick={() => setItemName("")}>{t("cancel")}</button>
          <button type="button" className="btn" disabled={!itemName.trim()} onClick={addItem}>{t("save")}</button>
        </div>
      </div>
    </div>
  );
}

export function Help() {
  const { t, lang, ui, setUi } = useFaro();
  return (
    <Modal open={ui.help} title={t("help.title")} onClose={() => setUi({ help: false })}>
      {SHORTCUT_ACTIONS.map((action) => (
        <p key={action} className="text-sm"><span className="num">{DEFAULT_SHORTCUTS[action]}</span> · {shortcutLabel(lang, action)}</p>
      ))}
    </Modal>
  );
}
