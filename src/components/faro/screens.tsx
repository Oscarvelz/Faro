import { AreaAdvisor } from "./area-advisor";
import { useTabletOne as useTabletOneAA } from "./book-side";
import type { AreaId } from "@/lib/faro/area-advice";
import { PeopleAdviceCard, PeopleBox, PeopleStudy } from "./people";
import { ActivityLog, Note } from "./finish";
import { SampleRow } from "./sample-mode";
import { PresentacionesCard } from "./presentacion";
import { NotifyRow } from "./notify-row";
import { BatteryRow } from "./battery-row";
import { BankSettings, ImportDoor, ImportRow, RewardsAdvice, RewardsStudy, hasRewards, modeSign, modeWhisper } from "./bank-dock";
import { ModeImpactDialog, ModeReposedDialog } from "./mode-gate";
import { MODES, currentRefDay, modeDialogReaction, modeImpact, modeOf, modeRank, pocketModeOf, unlockedGroups, type Mode, type ModeImpact } from "@/lib/faro/mode";
import { MODE_ASK_EVENT, takeModeAsk } from "@/lib/faro/mode-ask";
import { peopleOf } from "@/lib/faro/people";
import { formDirty } from "@/lib/faro/dirty";
import { clearPanelExit, guardPanelExit, setPanelExit, type PanelExit } from "@/lib/faro/panel-exit";
import { hasKeyNumbers } from "@/lib/faro/keynumbers";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type CSSProperties } from "react";
import { AgendaCard, CoachHero, HealthCard, MoversCard, PaceCard, PulseCard, RuleCard, WaffleCard, useCoach } from "@/components/faro/panorama";
import { CushionCard, KeyNumbers, LimitsCard, TimeCard } from "@/components/faro/study2";
import { RemitCard } from "@/components/faro/remesas";
import { RemitPeopleBox } from "@/components/faro/remit-people";
import { remitTrend } from "@/lib/faro/remesas";
import { LongVisual, MediumVisual, MonthTower, PlanRoute, RulesCard, ShortVisual, adviceTeaser, useRules } from "@/components/faro/advisor2";
import { useMasonry, usePinchZoom } from "@/components/faro/pinch";
import { RotateCcw, Languages, FolderTree, SlidersHorizontal, Keyboard, Hand, ShieldCheck, UserRound, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Check, ChevronDown, ChevronUp, CreditCard, Eraser, Eye, EyeOff, Filter, Gauge, GripVertical, Image as ImageIcon, Landmark, ListChecks, Minus, Palette, Pencil, Pin, Plus, Repeat2, Search, Send, Settings as Gear, Smartphone, Trash2, X } from "lucide-react";
import { APK_URL, androidBrowser, inAndroidApp, nativeCanPickContactName, nativePickContactName } from "@/spa/native";
import { WidgetCard, WIDGET_REFRESH } from "./widget-host";
import { AccountLocalNote, UserButton } from "@/lib/auth/gates";
import { applyCardEdits, applyTemplate, catalogLinesSummary, displayName, dropSubLines, lineListVisible, missingDefaults, replaceCandidates, replaceCatalogItem, restoreDefaultCategories, showAllExample, showAllPreview, showAllStructure, structureStatusLine, subLinesSummary, templateExample, templatePreview, treeSubLine, type CardEdits, type ReplaceTarget, type SubLinesSummary } from "@/lib/faro/defaults";
import { hasStorePin, hasWidgetPin, toggleStorePin, toggleWidgetPin } from "@/lib/faro/quickadd";
import { sampleOn } from "@/lib/faro/samplemode";
import { deskSeedDecision, withDeskSeedFlag } from "@/lib/faro/deskseed";
import { cashSankey, foldSlices, studyBoard, spanPoints, compareSpans } from "@/lib/faro/engine";
import { yearReport, yearsWithData } from "@/lib/faro/year";
import { todayText } from "@/lib/faro/today";
import { projectLeft, readAdvisor, type FigurePart, type ScenarioId } from "@/lib/faro/advisor";
import { readVaultPref, writeVaultPref } from "@/lib/faro/awake";
import { auditLabel, monthName, shortcutLabel } from "@/lib/faro/i18n";
import { FARO_VERSION } from "@/lib/faro/build-version";
import { SAVINGS_PURPLE, baseFor, categoryBase, categoryColor, chosenTone, colorFor, colorForLine, isTron, subBase, subColorFor, tronize } from "@/lib/faro/colors";
import { namedIconFor, subIconFor } from "@/lib/faro/faces";
import { shrinkIcon } from "@/lib/faro/icon";
import { inkOn, washForInk } from "@/lib/faro/palette";
import { ColorPick, LookGem, QUICK } from "./color-pick";
import { iconForName, libraryOff, presetName, subPresetsOf } from "@/lib/faro/subs";
import { BrandIconPick, CategoryPick, FreqSheet, IconPick, LookPick, PiecePlate, PurchaseCatPick, SubPick } from "./fit-pick";
import { FreqPresetEditor, PresetMark, SubPresetEditor } from "./sub-presets";
import { cadenceLabel, customFreqsFor, freqPresetsOf, nextDueFrom } from "@/lib/faro/cadence";
import { dateFmt } from "@/lib/faro/datefmt";
import { formatMoney, formatRate, convertMinor, fxRateBroken, parseAmount, payDates, productHref, uid } from "@/lib/faro/money";
import { accounts } from "@/lib/faro/bankbook";
import { insPaid, insTiming, insTotals, monthsSince, syncInsLine } from "@/lib/faro/insurance";
import { deleteLine, patchLine, patchLineWith, upsertLine } from "@/lib/faro/reducer";
import { dropPocketLine, isPrimerica, restoreRetiro, retiroHidden, seedRetiro } from "@/lib/faro/retiro";
import type { CatalogItem, Category, Currency, InsPlan, LedgerState, Line, LineKind, SectionId, Sub, TemplateId, ThemeId } from "@/lib/faro/types";
import { DAY_THEMES, DEFAULT_SHORTCUTS, NIGHT_THEMES, SHORTCUT_ACTIONS } from "@/lib/faro/types";
import { BrandMark, Glyph, ICON_NAMES, LOOK_ICONS } from "./icons";
import { StudyCharts, StatBreaks, StatFold, StatFoldProvider, StudyStack } from "./charts";
import { LineForm, QuickAdd, DayField, ThemeSelect } from "./line-form";
import { ScanEntry } from "./receipt-scan";
import { TrayCard } from "./tray";
import { BookKit, type KitRow } from "./book-kit";
import { useLongPress } from "./use-longpress";
import { SelectionBar, SelMark, useSelection } from "./selection";
/** Books whose + editor offers Escanear (1.3.101). */
const SCAN_KINDS: LineKind[] = ["subscription", "purchase", "expense-variable", "expense-fixed"];
import { StmtScan, type StmtSave } from "./stmt-scan";
import { useFaro } from "./provider";
import type { BackupInfo } from "@/spa/vault";
import type { QuarantineEntry } from "@/lib/faro/packguard";
import { Explain, FieldTip, Modal } from "./ui";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";
import { DeboSide, DeboSum, LoanCard, LoanForm, LoansStudy } from "./loans";
import { CardsAdvisor } from "./cards";
import { cardTotals, rewardsTotals } from "@/lib/faro/cards";
import { EarningsStudy, hasEarnings } from "./earnings";
import { payoffPlan } from "@/lib/faro/debts";
import { loanTotals, todayIso } from "@/lib/faro/loans";
import { lentOf, lentState } from "@/lib/faro/debts";
import { OwedSide, SeeAll, takeCobrosReturn, DebtsReadOnly } from "./debts";
import { ringFresh, ringLit, ringShow } from "@/lib/faro/ring";
import { asideSplit, declareSeries, guardFor, hostAccounts, keptTotal as keptTotalOf, libreOf, natureMode, segmentAgg, seriesName, stampFor, undeclaredFunds, type FundNature, type PendingFund, type SegmentAgg } from "@/lib/faro/funds";
import { savingsStock } from "@/lib/faro/savings";
import { FundLight, NaturePick } from "./fund-light";

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

// cubic-bezier(.22, 1, .36, 1) — la curva de la casa, evaluada a mano para
// animar lo que CSS no alcanza (el scroll de retorno de la tarjeta, 1.3.225).
function easeHouse(x: number): number {
  let t = x;
  for (let i = 0; i < 4; i++) {
    const xt = 3 * (1 - t) * (1 - t) * t * 0.22 + 3 * (1 - t) * t * t * 0.36 + t * t * t;
    const dx = 3 * (1 - t) * (1 - t) * 0.22 + 6 * (1 - t) * t * (0.36 - 0.22) + 3 * t * t * (1 - 0.36);
    t -= (xt - x) / dx;
  }
  return 3 * (1 - t) * (1 - t) * t + 3 * (1 - t) * t * t + t * t * t;
}

function lineGlyph(line: Line, structure?: { categories: { id: string; icon: string; subs: { id: string; icon: string }[] }[]; purchases: { id: string; icon: string }[] }) {
  // A Cuota saved with the generic ↻ shows the brand its name points at (display only; the line is not changed).
  if (line.kind === "subscription" && line.icon === "RefreshCw") return iconForName(line.concept, [], "es") || "RefreshCw";
  if (line.icon && line.icon !== "Circle") return line.icon;
  const cat = structure?.categories.find((item) => item.id === line.categoryId);
  const sub = cat?.subs.find((item) => item.id === line.subId);
  if (sub?.icon && sub.icon !== "Circle") return vaultGlyph(sub.icon) ?? sub.icon;
  if (cat?.icon && cat.icon !== "Circle") return cat.icon;
  const purchase = structure?.purchases.find((item) => item.id === line.categoryId);
  if (purchase?.icon && purchase.icon !== "Circle") return purchase.icon;
  if (line.kind === "purchase") return "ShoppingBag";
  if (line.kind === "subscription") return iconForName(line.concept, [], "es") || "RefreshCw";
  return "Circle";
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
  // Live colour while the custom spectrum is open (previewed on the trigger and the icon chips).
  const [draft, setDraft] = useState<string | null>(null);
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
      if (ref.current?.contains(node) || node.closest("[data-look-toggle], .form-block, .fit-scrim, .modal-back, .bubble-tools, .ftip-pop")) return;
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
          <LookGem color={draft ?? color} glyph={glyph} />
          {t("look.title")}
        </button>
      )}
      {open ? (
        <div className="look-dock" style={{ ["--seg" as string]: color }} onPointerDown={(event) => event.stopPropagation()}>
          <ColorPick head={bubbles ? <span className="lab-head">{t("look.bubble")}<FieldTip topic="icono-color" /></span> : undefined} value={color} glyph={glyph} onPick={onColor} onDraft={setDraft} onConfirm={() => { setDraft(null); setOpen(false); onClose?.(); }} label={t("look.bubble")} />
          {bubbles ? <p className="look-label"><span className="lab-head">{t("look.icon")}<FieldTip topic="icono-color" /></span></p> : null}
          <div className="look-icons" ref={iconsRef} onScroll={(event) => { const el = event.currentTarget; el.toggleAttribute("data-end", el.scrollTop + el.clientHeight >= el.scrollHeight - 2); }}>
            {LOOK_ICONS.map((name) => (
              <button key={name} type="button" aria-pressed={glyph === name} aria-label={name} style={{ ["--ink" as string]: draft ?? color, background: washForInk(draft ?? color), color: inkOn(washForInk(draft ?? color)) }} onClick={() => onGlyph(name)}><Glyph name={name} /></button>
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
      <div className="line-edit"><p className="line-edit-head"><span aria-hidden><Pencil /></span>{t("edit")}<Hint topic="editor" className="is-head" /><b>{line.concept}</b></p>
        <LineForm kind={line.kind} existing={line} money={money} onMoney={onMoney} glyph={glyph} swatch={picked ? swatch : undefined} dock look={{
          glyph,
          color: swatch,
          onGlyph: (name) => { setGlyph(name); commit((s) => patchLine(s, line.id, { icon: name }), line.concept || "icon"); },
          onColor: (next) => { setSwatch(next); setPicked(true); commit((s) => patchLine(s, line.id, { color: next }), line.concept || "color"); },
        }} onClose={() => setUi({ editing: null })} />
      </div>
    </div>
  );
}

/** 1.3.115: a savings line's editor in Libros (Ahorros, Meta, Retiro, Emergencia): the books' own editor, its own currency. */
function SavEdit({ line }: { line: Line }) {
  const [money, setMoney] = useState<Currency>(line.currency);
  return <div className="kit-edit" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}><BubbleEditor line={line} money={money} onMoney={setMoney} /></div>;
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
    <button type="button" className="vault-year-btn" data-anchor="lever-years" onClick={() => setYearDraft(String(years))}>{yearLabel}</button>
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
      {open ? <button type="button" className="fold-pin" data-anchor="lever-pin" aria-label={t("study.pin")} aria-pressed={pinned} onClick={togglePin}><Pin /></button> : null}
      <button type="button" className="fold-chev" data-anchor="lever-open" aria-label={t("study.fold")} aria-expanded={open} onClick={toggleOpen}><ChevronDown /></button>
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
            <b style={{ bottom: `calc(10.5px + (100% - 38px) * ${usdMinor / maxUsd})` }} />
          </div>
          <div className="vault-lever-read">
            <p>
              <span className="lab-head">{t("lever.if")}<Hint topic="si-apartas" /></span>
              <span className="lever-amt"><strong className="num">{fmt(shown)}</strong><em>{t("lever.each")}</em></span>
            </p>
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
  // Ola 11 (BR11-3): el corte es una herramienta de selección, no una
  // frase descriptiva — su total sigue siendo la suma de las líneas
  // ELEGIDAS, que en los puntos curados vive partida en expense (gasto) y
  // saved (apartado). Recomponerla aquí deja el total del corte
  // exactamente como era, sin volver a llamar gasto al apartado.
  const val = (point: (typeof points)[number]) => (income ? point.income : point.expense + point.saved);
  const total = points.reduce((sum, point) => sum + val(point), 0);
  const max = Math.max(...points.map(val), 0.01);
  const money = fmt(Math.round(total * 100));
  const latest = points[points.length - 1];
  const latestValue = latest ? val(latest) : 0;
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
    <div ref={cutRef} data-anchor="book-span" className={`span-cut${open ? " is-open" : ""}${saving ? " is-saving" : ""}`} style={tone ? { ["--accent" as string]: tone } : undefined}>
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
              const value = val(point);
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
  const drawn = line.history.reduce((sum, charge) => (charge.date >= start && charge.date <= stop ? sum + convertMinor(charge.amountMinor, charge.currency, display, rate) : sum), 0);
  const seriesId = line.seriesId || line.id;
  // Ola 5 (G5-1): el informe lee el LIBRO para el pasado y el calendario
  // solo para el horario. El «total» proyectaba el importe de la línea
  // abierta multiplicado por las fechas vistas: en una
  // serie de importes variables — la Despensa de la casa: 3400/3600/3500…
  // — el total contradecía al propio «anotado» (C$20,400 desde junio y
  // C$21,600 desde julio contra C$21,000 anotados). Ahora cada fecha
  // vista vale su importe ANOTADO (la misma población que suma `logged`,
  // convertida línea a línea); el importe de la línea abierta solo
  // estima una fecha aún sin anotar. Y la cuenta de pagos cuenta líneas
  // anotadas hasta hoy, no las fechas que el calendario genera contra
  // hoy (desde diciembre, payDates contaba un séptimo pago sobre las
  // seis líneas del arco). La lista de fechas pintada no cambia: es el
  // horario, y el horario sí es del calendario.
  let logged = 0;
  let paysCount = 0;
  const byDate = new Map<string, number>();
  const nowD = new Date();
  const todayKey = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}-${String(nowD.getDate()).padStart(2, "0")}`;
  for (const bucket of Object.values(session.ledger.months)) {
    for (const item of bucket.lines) {
      if ((item.seriesId || item.id) !== seriesId) continue;
      const on = item.bookedOn && item.bookedOn.startsWith(item.monthKey) ? item.bookedOn : `${item.monthKey}-01`;
      const minor = convertMinor(item.amountMinor, item.currency, display, rate);
      byDate.set(on, (byDate.get(on) ?? 0) + minor);
      if (on <= todayKey) paysCount += 1;
      if (on < start || on > stop) continue;
      logged += minor;
    }
  }
  const intact = seen.reduce((sum, date) => sum + (byDate.get(date) ?? each), 0);

  function reportUse() {
    const minor = parseAmount(used);
    if (minor === null) return;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(when) ? when : dates[dates.length - 1] ?? "";
    commit((s) => patchLineWith(s, line.id, (live) => ({
      history: [...live.history, { id: uid(), date, amountMinor: minor, currency: display, note: "" }],
    })), line.concept);
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
          <strong className="num">{income ? fmt(intact - drawn) : String(paysCount)}</strong>
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

export function LinesBlock({ kind, title, categoryId, storeId, menu }: { kind: LineKind | LineKind[]; title: string; categoryId?: string; storeId?: string; menu?: boolean }) {
  const { lines, t, ui, setUi, viewLine, recordLine, session, confirm, commit, key, names, fmt, lang } = useFaro();
  const { has } = useFaro();
  const kinds = Array.isArray(kind) ? kind : [kind];
  const draftKind = kinds[0] ?? "income-fixed";
  const group = draftKind === "expense-fixed" ? "fixed" : draftKind === "expense-variable" ? "variable" : null;
  const rows = lines.filter((l) => {
    if (!kinds.includes(l.kind)) return false;
    // 1.3.177: the books are lists too — a line under a hidden category/subconcept (or a
    // hidden purchase category/store) does not render; it keeps counting everywhere.
    if (session && !lineListVisible(session.ledger.structure, l)) return false;
    // La puerta anti-fuga (descanso.ts): una línea apartada no se lista en ningún libro.
    if (l.rest) return false;
    if (draftKind === "expense-fixed" && (session?.ledger.structure.categories.find((c) => c.id === l.categoryId)?.role === "savings")) {
      // L-5 acotado por X-3 (etapa 3.1): la exclusión cubre lo que la bóveda
      // recoge. En Esencial la bóveda de Ahorros recoge las líneas generales;
      // las de bolsillo (Meta/Retiro/Emergencia, sin bóveda en este modo) se
      // listan aquí como líneas normales, para que ninguna línea con dinero
      // quede sin libro donde verse.
      const pocketLine = !!l.subId && (l.subId.endsWith(".meta") || l.subId.endsWith(".retiro") || l.subId.endsWith(".emergencia"));
      if (!pocketLine || has("vault.meta")) return false;
    }
    if (categoryId && categoryId !== "all" && l.categoryId !== categoryId) return false;
    if (storeId && storeId !== "all" && l.storeId !== storeId) return false;
    return true;
  });
  const cats = (session?.ledger.structure.categories ?? []).filter((c) => group && c.group === group && !c.hidden && c.role !== "savings");
  const purchases = session?.ledger.structure.purchases.filter((c) => !c.hidden) ?? [];
  const [chip, setChip] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  // Ola 3 (Cara C3-6): el filtro por categoría es de Ritmo (books.filter-chips,
  // fallo 3) — el botón, su menú Y la fila de chips llevan la misma puerta, y
  // el chip elegido no filtra en silencio donde su cara duerme: el estado se
  // conserva intacto (el modo no toca lo que no muestra) y vuelve al subir.
  const canFilter = has("books.filter-chips");
  const chipRows = rows.filter((l) => !canFilter || chip === "all" || l.categoryId === chip);
  const chipSource = group ? cats : [];
  const asCloud = draftKind === "expense-fixed";
  const asDrift = draftKind === "expense-variable";
  const asShop = draftKind === "purchase";
  const asDue = draftKind === "subscription";
  const asBubble = asCloud || asDrift || asDue;
  const present = chipSource.filter((c) => rows.some((l) => l.categoryId === c.id));
  // 1.3.115: a tap opens the editor straight away; the open bubble is the one being edited (one state, one Back step).
  const pickedLine = chipRows.find((l) => l.id === ui.editing) ?? null;
  const kitRows: KitRow[] = chipRows.map((l) => ({ id: l.id, label: l.concept || names.cat(l.categoryId) || names.purchase(l.categoryId) || "—", glyph: lineGlyph(l, session?.ledger.structure), color: chosenTone(l.color, l.categoryId) || (session ? colorForLine(session.ledger.structure, l.categoryId, l.subId) : undefined) }));
  const kitLine = (id: string) => chipRows.find((l) => l.id === id);
  // El motor de selección en las listas de Libros (Oscar, 2026-11-13): sostener
  // una fila entra al modo — el editor se cierra, porque el modo es otra
  // habitación —; tocar marca; la barra anuncia conteo, verbos y salida.
  // Eliminar hereda EXACTAMENTE el verbo del kit del libro (la misma ventana
  // que nombra cuántas, el mismo commit deshacible, el mismo detalle), y Mover
  // aplica UN selector de la casa a toda la selección en un solo commit.
  const selection = useSelection();
  // PREJUDICE PJ-11: the selection engine is a Ritmo room (selection.engine/delete/move,
  // books.multiselect in the registry) — the surface must ASK its rows. Before this cure
  // the engine installed unconditionally and bulk Delete/Move committed in Esencial.
  const canSelect = has("selection.engine");
  const lp = useLongPress((id) => {
    // Ola 12 (BR12-2): el gesto ya no muere tras el chequeo de permiso —
    // susurra su destino (la selección de líneas vive en Ritmo), con el
    // modo actual nombrado y los nombres punteados, como manda el Susurro.
    if (!canSelect) {
      modeWhisper(
        t("mode.whisper.hold-line")
          .replace("{mode}", `[[${t(`mode.${session?.ledger.settings.mode ?? "completo"}`)}]]`)
          .replace("{owner}", `[[${t("mode.ritmo")}]]`),
        "ritmo",
      );
      return;
    }
    if (selection.mode) selection.toggle(id);
    else { setUi({ editing: null, draft: null }); selection.enter(id); }
  });
  const selVisible = chipRows.filter((l) => selection.sel.has(l.id));
  const monthLabel = `${monthName(lang, Number(key.slice(5, 7)))} ${key.slice(0, 4)}`;
  const askDeleteSel = () => {
    const ids = selVisible.map((l) => l.id);
    if (!ids.length) return;
    confirm({
      title: t(ids.length === 1 ? "sel.lines.delete.title.one" : "sel.lines.delete.title").replace("{n}", String(ids.length)),
      body: t("sel.lines.delete.body").replace("{month}", monthLabel),
      yes: t("sel.lines.delete.yes"),
      run: () => {
        commit((s0) => ids.reduce((acc, id) => deleteLine(acc, key, id), s0), ids.length === 1 ? (kitLine(ids[0]!)?.concept || title) : `${ids.length}`);
        selection.exit();
      },
    });
  };
  // Mover a carpeta: el universo del selector es el de la casa — gastos llevan
  // categoría/subcategoría de su grupo; compras, su carpeta de Compras; ingresos
  // y suscripciones no tienen carpetas en el modelo y el verbo no se ofrece.
  // Las transferencias conservan su casa (su categoría es estructural): quedan
  // fuera del conteo que se mueve, y la ventana lo nombra.
  const canMove = group !== null || asShop;
  const movableSel = selVisible.filter((l) => !l.xfer);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveCat, setMoveCat] = useState("");
  const [moveSub, setMoveSub] = useState("");
  const applyMove = () => {
    if (!movableSel.length) return;
    const targets = movableSel;
    commit((s0) => targets.reduce((acc, l) => patchLine(acc, l.id, { categoryId: moveCat, subId: group ? moveSub : "" }), s0), `${targets.length}`);
    setMoveOpen(false);
    selection.exit();
  };
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
    if (ui.editing && asBubble && chipRows.some((l) => l.id === ui.editing)) revealEditor(editRef.current);
  }, [ui.editing]);

  // OLA 7 (CARA-9): el bloque declara su libro para que un salto «Ir allí»
  // resalte el «+» DE ESTE libro y no el primero que el DOM ofrezca.
  const firstKind = Array.isArray(kind) ? kind[0] : kind;
  const bookName = firstKind?.startsWith("income") ? "income" : firstKind === "expense-fixed" ? "fixed" : firstKind === "expense-variable" ? "variable" : firstKind === "purchase" ? "shops" : firstKind === "subscription" ? "subs" : undefined;

  return (
    <section className={`card income-book${menu ? " is-menu" : ""}`} data-anchor="book-card" data-book={bookName}>
      <div className="row income-head" style={{ justifyContent: "space-between" }}>
        <h2 className="serif text-2xl lab-head">{title}<Hint topic="libro-categoria" fitParent /></h2>
        <span className="row">
          {ui.draft === draftKind && !ui.editing ? (
            <button type="button" className="copper-coin" data-anchor="book-coin" aria-label={money === "USD" ? "USD" : "NIO"} onClick={() => setMoney((cur) => (cur === "USD" ? "NIO" : "USD"))}>
              {money === "USD" ? "$" : "C$"}
            </button>
          ) : null}
          {canFilter && (asCloud || asDrift) && present.length > 1 ? (
            <button type="button" data-anchor="book-filter" className="icon-btn filter-btn" aria-pressed={filterOpen || chip !== "all"} aria-label={t("filter.button")} onClick={() => setFilterOpen((v) => !v)}>
              <Filter className="size-4" />
            </button>
          ) : null}
          <BookKit title={title} rows={kitRows} word={["línea", "líneas", "line", "lines"]} test="book-kit"
            body={lang === "en" ? "They leave this month. Earlier months keep theirs, with all their history." : "Salen de este mes. Los meses anteriores conservan las suyas, con todo su historial."}
            onEdit={(id) => setUi({ editing: id, draft: null })}
            onDrop={(ids) => commit((s0) => ids.reduce((acc, id) => deleteLine(acc, key, id), s0), ids.length === 1 ? (kitLine(ids[0]!)?.concept || title) : `${ids.length}`)}
            onRename={(id, name) => { const l = kitLine(id); if (l) commit((s0) => patchLine(s0, id, { concept: name }), name); }}
            onColor={(id, hex) => { const l = kitLine(id); if (l) commit((s0) => patchLine(s0, id, { color: hex }), l.concept || "color"); }}
            onIcon={(id, glyph) => { const l = kitLine(id); if (l) commit((s0) => patchLine(s0, id, { icon: glyph }), l.concept || "icon"); }} />
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
      {has("vault.span-cut") ? <SpanCut kinds={kinds} span={span} onSpan={setSpan} /> : null}
      {canFilter && (asCloud || asDrift) && filterOpen ? (
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
      {canFilter && !asCloud && !asDrift && chipSource.length > 1 ? (
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
          <LineForm kind={draftKind} money={money} onMoney={setMoney} glyph={lookGlyph} swatch={lookColor} dock look={{ glyph: lookGlyph, color: lookColor, onGlyph: setLookGlyph, onColor: setLookColor }} scan={SCAN_KINDS.includes(draftKind) ? <ScanEntry from={draftKind} /> : undefined} onClose={() => setUi({ draft: null })} />
        </div>
      ) : null}
      {chipRows.length === 0 ? <Note>{t("empty.lines")}</Note> : null}
      {asBubble ? (
        <>
          <div className="spend-cloud" data-anchor="book-cloud">
            {[...chipRows].sort((a, b) => b.amountMinor - a.amountMinor).map((line) => {
              const share = line.amountMinor / Math.max(chipRows.reduce((sum, item) => sum + item.amountMinor, 0), 1);
              const label = line.concept || names.cat(line.categoryId) || names.purchase(line.categoryId) || "";
              const span = Math.max(label.length > 12 ? 5 : 4, Math.min(8, Math.round(4 + share * 9)));
              return (
                <div key={line.id} className="spend-slot" style={{ gridColumn: `span ${span}`, minHeight: `${78 + share * 64}px` }}>
                <button
                  type="button"
                  className={`spend-bubble${selection.sel.has(line.id) ? " is-selected" : ""}`}
                  data-line-id={line.id}
                  data-hot={ui.highlight === line.id}
                  aria-pressed={ui.editing === line.id}
                  style={{
                    backgroundColor: washForInk(chosenTone(line.color, line.categoryId) || (session ? colorForLine(session.ledger.structure, line.categoryId, line.subId) : "#c5d5cc")),
                    ["--tone" as string]: chosenTone(line.color, line.categoryId) || (session ? colorForLine(session.ledger.structure, line.categoryId, line.subId) : "#c5d5cc"),
                    ["--selc" as string]: chosenTone(line.color, line.categoryId) || (session ? colorForLine(session.ledger.structure, line.categoryId, line.subId) : "#c5d5cc"),
                    color: "#14110e",
                  }}
                  {...lp.bind(line.id)}
                  onPointerDown={(e) => { rippleAt(e); lp.bind(line.id).onPointerDown(e); }}
                  onClick={() => {
                    if (lp.consumeClick()) return;
                    if (selection.mode) { selection.toggle(line.id); return; }
                    setUi({ editing: ui.editing === line.id ? null : line.id, draft: null });
                  }}
                >
                  {selection.mode ? <SelMark on={selection.sel.has(line.id)} /> : null}
                  <i className="spend-mark" aria-hidden><Glyph name={lineGlyph(line, session?.ledger.structure)} /></i>
                  <strong>{line.concept || names.cat(line.categoryId) || names.purchase(line.categoryId)}</strong>
                  <span className="num">{draftKind.startsWith("income") ? "" : "−"}{viewLine(line)}</span>
                </button>
                </div>
              );
            })}
          </div>
          {pickedLine ? (
            <div className="mt-3" ref={editRef}>
              <BubbleEditor key={pickedLine.id} line={pickedLine} money={money} onMoney={setMoney} />
              {has("vault.pot") ? <PotReport line={pickedLine} span={span} /> : null}
            </div>
          ) : null}
        </>
      ) : asShop ? (
        <ShopBoard rows={chipRows} money={money} onMoney={setMoney} span={span} />
      ) : (
        chipRows.map((line) => (
          <div key={line.id} className="line-stack">
            <div className={`line-row is-tap${ui.editing === line.id ? " is-open" : ""}${selection.sel.has(line.id) ? " is-selected" : ""}`} data-line-id={line.id} data-hot={ui.highlight === line.id} role="button" tabIndex={0} aria-expanded={ui.editing === line.id}
              {...(ui.editing === line.id ? {} : lp.bind(line.id))}
              style={{ "--selc": session ? colorForLine(session.ledger.structure, line.categoryId, line.subId) : "var(--accent)" } as CSSProperties}
              onClick={(e) => { if (lp.consumeClick()) return; if ((e.target as Element).closest(".line-edit")) return; if (selection.mode) { selection.toggle(line.id); return; } setUi({ editing: ui.editing === line.id ? null : line.id, draft: null }); }}
              onKeyDown={(e) => { if ((e.target as Element).closest(".line-edit") || (e.key !== "Enter" && e.key !== " ")) return; e.preventDefault(); if (selection.mode) { selection.toggle(line.id); return; } setUi({ editing: ui.editing === line.id ? null : line.id, draft: null }); }}>
              {selection.mode ? <SelMark on={selection.sel.has(line.id)} /> : null}
              <div className="min-w-0">
                <strong className="block">{keepTail(line.concept || names.cat(line.categoryId) || names.purchase(line.categoryId), true)}</strong>
                <span className="block text-sm text-muted">{[names.cat(line.categoryId), names.sub(line.subId), names.catalog(line.storeId)].filter(Boolean).join(" · ")}</span>
              </div>
              {moneyRow(line, outView(line, viewLine), recordLine(line), display)}
              {ui.editing === line.id ? <div className="line-edit"><p className="line-edit-head"><span aria-hidden><Pencil /></span>{t("edit")}<Hint topic="editor" className="is-head" /><b>{line.concept}</b></p><LineForm kind={line.kind} existing={line} money={money} onMoney={setMoney} onClose={() => setUi({ editing: null })} /></div> : null}
            </div>
            {has("vault.pot") ? <PotReport line={line} span={span} /> : null}
          </div>
        ))
      )}
      {purchases.length && draftKind === "purchase" ? null : null}
      {selection.mode && !asShop ? (
        <>
          <SelectionBar count={selVisible.length} onExit={selection.exit}>
            {has("selection.delete") ? (
              <button type="button" className="btn danger" disabled={!selVisible.length} onClick={askDeleteSel} data-testid="sel-delete">
                <Trash2 className="size-4" aria-hidden />{t("sel.lines.delete.yes")}
              </button>
            ) : null}
            {canMove && has("selection.move") ? (
              <button type="button" className="btn secondary" aria-pressed={moveOpen} onClick={() => setMoveOpen((v) => !v)} data-testid="sel-move">
                {t("sel.move")}
              </button>
            ) : null}
          </SelectionBar>
          {moveOpen && canMove ? (
            <div className="sel-move">
              {group ? (
                <>
                  <CategoryPick group={group} value={moveCat} onChange={(id) => { setMoveCat(id); setMoveSub(""); }} />
                  {moveCat ? <SubPick categoryId={moveCat} value={moveSub} onChange={setMoveSub} /> : null}
                </>
              ) : null}
              {selVisible.length > movableSel.length ? (
                <p className="sel-move-note">{t("sel.move.skip").replace("{n}", String(selVisible.length - movableSel.length))}</p>
              ) : null}
              <button type="button" className="btn primary" disabled={!movableSel.length} onClick={applyMove} data-testid="sel-move-apply">
                {t("sel.move.apply").replace("{n}", String(movableSel.length))}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function ShopBoard({ rows, money, onMoney, span }: { rows: Line[]; money: Currency; onMoney: (value: Currency) => void; span: "week" | "month" | "year" }) {
  const { names, viewLine, session, ui, setUi, confirm, commit, key, t, fmt, lang, has } = useFaro();
  const display = session?.ledger.settings.display ?? "NIO";
  const rate = session?.ledger.settings.rateE4 ?? 0;
  const [picked, setPicked] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const minorOf = (line: Line) => convertMinor(line.amountMinor, line.currency, display, rate);
  const total = Math.max(rows.reduce((sum, line) => sum + minorOf(line), 0), 1);
  // 1.3.115: a tap opens the editor straight away (delete lives in the book's pencil state, never beside the row).
  const pickedLine = rows.find((line) => line.id === ui.editing) ?? null;
  useEffect(() => {
    if (pickedLine) revealEditor(editRef.current);
  }, [ui.editing]);
  // El motor de selección en el tablero de Compras (Oscar, 2026-11-13): la
  // misma máquina que en las demás listas — sostener entra, tocar marca, la
  // barra anuncia; Eliminar hereda la ventana y el commit del kit del libro, y
  // Mover aplica el selector de carpetas de Compras a toda la selección.
  const selection = useSelection();
  // PREJUDICE PJ-11: same engine, same law — the Compras board asks selection.engine too.
  const canSelect = has("selection.engine");
  const lp = useLongPress((id) => {
    // Ola 12 (BR12-2): el mismo susurro que en las listas de Libros — el
    // gesto no muere tras el chequeo de permiso; su destino es Ritmo.
    if (!canSelect) {
      modeWhisper(
        t("mode.whisper.hold-line")
          .replace("{mode}", `[[${t(`mode.${session?.ledger.settings.mode ?? "completo"}`)}]]`)
          .replace("{owner}", `[[${t("mode.ritmo")}]]`),
        "ritmo",
      );
      return;
    }
    if (selection.mode) selection.toggle(id);
    else { setUi({ editing: null, draft: null }); selection.enter(id); }
  });
  const selVisible = rows.filter((l) => selection.sel.has(l.id));
  const movableSel = selVisible.filter((l) => !l.xfer);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveCat, setMoveCat] = useState("");
  const shopMonthLabel = `${monthName(lang, Number(key.slice(5, 7)))} ${key.slice(0, 4)}`;
  const askDeleteSel = () => {
    const ids = selVisible.map((l) => l.id);
    if (!ids.length) return;
    confirm({
      title: t(ids.length === 1 ? "sel.lines.delete.title.one" : "sel.lines.delete.title").replace("{n}", String(ids.length)),
      body: t("sel.lines.delete.body").replace("{month}", shopMonthLabel),
      yes: t("sel.lines.delete.yes"),
      run: () => {
        commit((s0) => ids.reduce((acc, id) => deleteLine(acc, key, id), s0), ids.length === 1 ? (rows.find((l) => l.id === ids[0])?.concept || t("sel.lines.delete.yes")) : `${ids.length}`);
        selection.exit();
      },
    });
  };
  const applyMove = () => {
    if (!movableSel.length) return;
    const targets = movableSel;
    commit((s0) => targets.reduce((acc, l) => patchLine(acc, l.id, { categoryId: moveCat, subId: "" }), s0), `${targets.length}`);
    setMoveOpen(false);
    selection.exit();
  };
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
              className={`buy-glass${line.storeId ? ` brand-${line.storeId}` : ""}${selection.sel.has(line.id) ? " is-selected" : ""}`}
              data-line-id={line.id}
              data-hot={ui.highlight === line.id}
              aria-pressed={ui.editing === line.id}
              style={{ "--selc": categoryColor(line.categoryId, session?.ledger.structure.purchases.find((p) => p.id === line.categoryId)?.color) } as CSSProperties}
              {...lp.bind(line.id)}
              onPointerDown={(e) => { rippleAt(e); lp.bind(line.id).onPointerDown(e); }}
              onClick={() => {
                if (lp.consumeClick()) return;
                if (selection.mode) { selection.toggle(line.id); return; }
                setUi({ editing: ui.editing === line.id ? null : line.id, draft: null });
              }}
            >
              {selection.mode ? <SelMark on={selection.sel.has(line.id)} /> : null}
              <span className="buy-id">
                {line.storeId ? <BrandMark id={session?.ledger.structure.catalog.find((item) => item.id === line.storeId)?.icon.startsWith("brand:") ? (session?.ledger.structure.catalog.find((item) => item.id === line.storeId) as CatalogItem).icon.slice(6) : line.storeId} src={session?.ledger.structure.catalog.find((item) => item.id === line.storeId)?.icon.startsWith("data:") ? session.ledger.structure.catalog.find((item) => item.id === line.storeId)?.icon : undefined} className="buy-mark" /> : <i className="spend-mark" aria-hidden><Glyph name={lineGlyph(line, session?.ledger.structure)} /></i>}
                <strong>{line.concept || names.purchase(line.categoryId)}</strong>
              </span>
              <span className="num">{outView(line, viewLine)}</span>
            </button>
            </div>
          );
        })}
      </div>
      {pickedLine ? (
        <div className="mt-3" ref={editRef}>
          <BubbleEditor key={pickedLine.id} line={pickedLine} money={money} onMoney={onMoney} />
          {has("vault.pot") ? <PotReport line={pickedLine} span={span} /> : null}
        </div>
      ) : null}
      {selection.mode ? (
        <>
          <SelectionBar count={selVisible.length} onExit={selection.exit}>
            {has("selection.delete") ? (
              <button type="button" className="btn danger" disabled={!selVisible.length} onClick={askDeleteSel} data-testid="sel-delete">
                <Trash2 className="size-4" aria-hidden />{t("sel.lines.delete.yes")}
              </button>
            ) : null}
            {has("selection.move") ? (
              <button type="button" className="btn secondary" aria-pressed={moveOpen} onClick={() => setMoveOpen((v) => !v)} data-testid="sel-move">
                {t("sel.move")}
              </button>
            ) : null}
          </SelectionBar>
          {moveOpen ? (
            <div className="sel-move">
              <PurchaseCatPick value={moveCat} onChange={setMoveCat} />
              {selVisible.length > movableSel.length ? (
                <p className="sel-move-note">{t("sel.move.skip").replace("{n}", String(selVisible.length - movableSel.length))}</p>
              ) : null}
              <button type="button" className="btn primary" disabled={!movableSel.length} onClick={applyMove} data-testid="sel-move-apply">
                {t("sel.move.apply").replace("{n}", String(movableSel.length))}
              </button>
            </div>
          ) : null}
        </>
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
  const { t, fmt, lang, lines, session, key, commit, confirm, has } = useFaro();
  const [adding, setAdding] = useState(false);
  useLayer(adding, () => setAdding(false));
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(todayIso());
  const [cadence, setCadence] = useState<Line["cadence"]>("monthly");
  const [editPresets, setEditPresets] = useState(false);
  const presets = subPresetsOf(session?.ledger);
  const [dueIcon, setDueIcon] = useState("");
  const [dueColor, setDueColor] = useState("#e7c27a");
  // Oleada de botones 4 (R7): la misma política única — Cancelar pregunta solo si la
  // cuota cambió desde que la forma abrió. La forma queda montada entre aperturas,
  // así que la línea base se renueva cada vez que se abre.
  const dueBaseRef = useRef<Record<string, unknown> | null>(null);
  useEffect(() => { if (adding) dueBaseRef.current = { name, amount, due, cadence, dueIcon, dueColor }; }, [adding]);
  const dueDirty = dueBaseRef.current ? formDirty(dueBaseRef.current, { name, amount, due, cadence, dueIcon, dueColor }) : false;
  const libOff = libraryOff(session?.ledger);
  const [editFreq, setEditFreq] = useState(false);
  const [otherFreq, setOtherFreq] = useState(false);
  const freqs = freqPresetsOf(session?.ledger);
  const [filed, setFiled] = useState<DueFile[]>(readDueFile);
  const display = session?.ledger.settings.display ?? "USD";
  const active = lines.filter((line) => line.kind === "subscription" && line.active && !line.rest);
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
      balanceCurrency: display, icon: dueIcon || iconForName(concept, presets, lang, libOff) || "RefreshCw", history: [], bookedOn: due || todayIso(), color: dueColor,
    };
    commit((s) => upsertLine(s, line), concept);
    setAdding(false);
    setName("");
    setAmount("");
    setDueIcon("");
    setDueColor("#e7c27a");
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
    commit((s) => patchLine(s, line.id, { active: false }), line.concept);
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
        [nextDay ? `${t("debo.sum.next")} ${dateFmt(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).format(new Date(`${nextDay}T12:00:00`)).replace(".", "")}` : t("debo.sum.allPaid")],
        [{ num: fmt(paidSum) }, t("debo.sum.paid")],
      ] : null} />
      <CobroSpan out help="debo-tiempo" title={t("cobro.owe.span")} total={sum} events={charges}
        facts={[[t("cobro.owe.due"), sum], [t("cobro.owe.paid"), paidSum], [t("cobro.left.owe"), Math.max(0, sum - paidSum)]]} />
      {adding ? (
        <div className="form-block cobro-form is-owe">
          <div className="cobro-grid">
            <div className="label is-wide">
              <span className="lab-head">{t("cobro.owe.name")}{has("subs.my-frequencies") ? <button type="button" className="sub-gear" aria-pressed={editPresets} aria-label={lang === "en" ? "Edit shortcuts" : "Editar atajos"} onClick={() => setEditPresets((on) => !on)}><Gear /></button> : null}<FieldTip topic="f-cuota-nombre" /></span>
              <div className="due-sites">
                {presets.map((p) => (
                  <button key={p.id} type="button" aria-pressed={name === presetName(p, lang)} onClick={() => setName(presetName(p, lang))}><PresetMark p={p} />{presetName(p, lang)}</button>
                ))}
              </div>
              <div className="due-name-row">
                <BrandIconPick compact value={dueIcon} look={{ glyph: dueIcon && !dueIcon.startsWith("sub:") ? dueIcon : "", color: dueColor, onGlyph: setDueIcon, onColor: setDueColor }} suggest={dueIcon ? "" : iconForName(name, presets, lang, libOff)} onChange={(next, label) => { setDueIcon(next); if (next && label && !name.trim()) setName(label); }} />
                <input className="field" aria-label={t("cobro.owe.name")} value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              {editPresets && has("subs.my-frequencies") ? <SubPresetEditor lang={lang} presets={presets} onClose={() => setEditPresets(false)} onSave={(next) => commit((s) => ({ ...s, subPresets: next }), lang === "en" ? "Presets" : "Atajos")} /> : null}
            </div>
            <label className="label">
              <span className="lab-head">{t("cobro.amount")}<FieldTip topic="f-cuota-monto" /></span>
              <input className="field num" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <div className="label is-right">
              <span className="lab-head">{t("cobro.owe.next")}<FieldTip topic="f-cuota-proximo" /></span>
              <DayField value={due} onChange={setDue} />
            </div>
            <div className="label is-wide due-freq">
              <span className="lab-head">{t("cobro.cadence")}{has("subs.freq-chips") ? <button type="button" className="sub-gear is-freq" aria-pressed={editFreq} aria-label={lang === "en" ? "Edit frequencies" : "Editar frecuencias"} onClick={() => setEditFreq((on) => !on)}><Gear /></button> : null}<FieldTip topic="f-frecuencia" /></span>
              <div className="due-cadence">
                {[...freqs, ...customFreqsFor(session?.ledger, freqs), ...(cadence && ![...freqs, ...customFreqsFor(session?.ledger, freqs)].includes(cadence) ? [cadence] : [])].map((id) => (
                  <button key={id} type="button" aria-pressed={cadence === id} onClick={() => setCadence(id as Line["cadence"])}>{cadenceLabel(id, lang)}</button>
                ))}
                {has("subs.cadence-custom") ? <button type="button" className="due-other" data-test="due-freq-other" aria-pressed={otherFreq} onClick={() => setOtherFreq(true)}><Plus />{lang === "en" ? "Other…" : "Otro…"}</button> : null}
              </div>
              {otherFreq && has("subs.cadence-custom") ? <FreqSheet startSetter value={cadence} presets={freqs} onClose={() => setOtherFreq(false)} onPick={(c) => { setCadence(c as Line["cadence"]); setOtherFreq(false); }} /> : null}
              {editFreq && has("subs.freq-chips") ? <FreqPresetEditor lang={lang} presets={freqs} onClose={() => setEditFreq(false)} onSave={(next) => { commit((s) => ({ ...s, freqPresets: next }), lang === "en" ? "Frequencies" : "Frecuencias"); if (!next.includes(cadence)) setCadence(next.includes("monthly") ? "monthly" : (next[0] as Line["cadence"])); }} /> : null}
            </div>
          </div>
          <div className="cobro-actions">
            <button type="button" className="btn secondary" onClick={() => { if (!dueDirty) { setAdding(false); return; } confirm({ title: t("entry.leave"), body: name.trim() || t("entry.this"), yes: t("entry.leave.yes"), run: () => setAdding(false) }); }}>{t("cancel")}</button>
            <button type="button" className="btn" onClick={addDue}>{t("save")}</button>
          </div>
        </div>
      ) : null}
      {active.length ? active.map((line) => (
        <article key={line.id} className="cobro-card due-card">
          <div className="due-line">
            <i className="spend-mark" aria-hidden><Glyph name={line.icon === "RefreshCw" || !line.icon ? iconForName(line.concept, presets, lang) || lineGlyph(line, session?.ledger.structure) : lineGlyph(line, session?.ledger.structure)} /></i>
            <div className="min-w-0">
              <strong>{line.concept}</strong>
              <p data-test="due-when">{line.cadence ? `${cadenceLabel(line.cadence, lang) || t(line.cadence)}${line.nextDue ? ` · ${new Date(`${nextDueFrom(line.nextDue, line.cadence, today)}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).replace(".", "")}` : ""}` : t("cobro.owe")}</p>
            </div>
            <strong className="num">{fmt(convertMinor(line.amountMinor, line.currency, display, session?.ledger.settings.rateE4 ?? 0))}</strong>
            {has("cobros.archive") ? <button type="button" className="due-drop" aria-label={t("cobro.archive")} onClick={() => confirm({ title: t("cobro.archive"), body: t("cobro.owe.file.body"), yes: t("cobro.archive"), run: () => archive(line) })}><Trash2 /></button> : null}
          </div>
        </article>
      )) : <Note>{t("cobro.owe.empty")}</Note>}
      {/* 1.3.162 (Oscar): the dues Archive section is gone from Central's panel — the
          filed dues and their data stay untouched; the Archive lives in Libros. */}
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
      label = dateFmt(lang === "en" ? "en-US" : "es-NI", { month: "short" }).format(day).replace(".", "");
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
  // 1.3.104: the closed bar never wraps or clips its title. When title + amount + chevron are wider than the row (360 at
  // large text, a wide display face), the row tightens (data-tight: less padding/tracking) and then the title eases down.
  const barRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar || openStats || !bar.closest(".cobros")) return;
    const fit = () => {
      const main = bar.querySelector<HTMLElement>(".span-fold-main");
      const lab = main?.querySelector<HTMLElement>(":scope > span");
      if (!main || !lab) return;
      lab.style.fontSize = "";
      if (bar.hasAttribute("data-tight")) bar.removeAttribute("data-tight");
      const over = () => main.scrollWidth > main.clientWidth + 0.5;
      if (!over()) return;
      bar.setAttribute("data-tight", "");
      if (!over()) return;
      // Title down to 82%, then the amount down to 80% (spa/fit.ts resets it on its own pass, then fires faro-fit → this runs again), then the title to 70%.
      const amt = main.querySelector<HTMLElement>(":scope > strong");
      if (amt) amt.style.fontSize = "";
      const f0 = parseFloat(getComputedStyle(lab).fontSize);
      const a0 = amt ? parseFloat(getComputedStyle(amt).fontSize) : 0;
      for (let k = 0.97; k >= 0.82 && over(); k -= 0.03) lab.style.fontSize = `${(f0 * k).toFixed(2)}px`;
      if (amt) for (let k = 0.97; k >= 0.8 && over(); k -= 0.03) amt.style.fontSize = `${(a0 * k).toFixed(2)}px`;
      for (let k = 0.8; k >= 0.7 && over(); k -= 0.02) lab.style.fontSize = `${(f0 * k).toFixed(2)}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(bar);
    addEventListener("faro-fit", fit);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => { ro.disconnect(); removeEventListener("faro-fit", fit); };
  }, [openStats, total, title]);
  return (
    <div className={`span-cut${openStats ? " is-open" : ""}${out ? " is-out" : ""}`}>
      <div className="span-fold-bar" ref={barRef}>
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

// 1.3.108: Central's + / − panel arrival light: a hairline of its colour runs out along the top edge from the corner button
// that opened it, over a soft wash that fades. transform + opacity only, no layout; reduced motion = the wash fade alone.
function QuickHello({ mode }: { mode: "in" | "out" }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement?.firstElementChild;
    if (!el || !(box instanceof HTMLElement)) return;
    const btn = document.querySelector<HTMLElement>(`[data-anchor="${mode === "in" ? "desk-plus" : "desk-minus"}"]`)?.getBoundingClientRect();
    const r = box.getBoundingClientRect();
    if (!r.width) return;
    el.style.setProperty("--qx", `${Math.round(Math.min(Math.max(((btn ? btn.left + btn.width / 2 : r.left + r.width / 2) - r.left) / r.width, 0), 1) * 100)}%`);
    el.style.setProperty("--qr", getComputedStyle(box).borderTopLeftRadius);
    el.style.top = `${box.offsetTop}px`;
    el.style.left = `${box.offsetLeft}px`;
    el.style.width = `${box.offsetWidth}px`;
    el.style.height = `${box.offsetHeight}px`;
    el.dataset.on = "";
  }, [mode]);
  return <i ref={ref} className="quick-hello" aria-hidden="true" />;
}

function Cobros({ onClose, jumped = false, ping = 0, startSide = "out", wait = false }: { onClose: () => void; jumped?: boolean; ping?: number; startSide?: "in" | "out"; wait?: boolean }) {
  const { t, has } = useFaro();
  const [side, setSide] = useState<"in" | "out">(startSide);
  const [dir, setDir] = useState(1);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    box.current?.scrollIntoView({ block: "nearest" });
  }, []);
  // Opened (or called back on screen) by Central's corner button: it grows out of that button and its frame pulses once.
  const firstPing = useRef(ping);
  useEffect(() => {
    const el = box.current;
    if (!ping || !el) return;
    const btn = document.querySelector<HTMLElement>('[data-anchor="desk-cobro"]')?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (btn && r.width) el.style.setProperty("--arrive-x", `${Math.round(Math.min(Math.max(btn.left + btn.width / 2 - r.left, 0), r.width))}px`);
    if (ping !== firstPing.current) el.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [ping]);
  // Cobros owns a history entry (pushed in the tap that opened it), and so do its forms: phone back closes the form, then
  // Cobros, then steps to the screen under it, with no re-push from popstate (Chrome marks those entries skippable, which
  // is what made back leave the installed app). Opened by "Ir allí" / a manual link it was part of that jump: back walks on
  // to where the jump came from, so it closes with that step instead of owning one.
  // 1.3.107: opened straight from an open + / − flow, it takes its history entry only after that flow has given its own back
  // (`wait`), so the flow's history.go(-n) can never land as a back on Cobros and close it.
  useLayer(!jumped && !wait, onClose);
  useEffect(() => {
    if (!jumped) return;
    const onBack = (e: Event) => { if (!e.defaultPrevented) onClose(); };
    window.addEventListener("faro-back", onBack);
    return () => window.removeEventListener("faro-back", onBack);
  }, [onClose, jumped]);
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
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);

  return (
    <section
      data-anchor="cobros"
      className={`cobros sheet-swap${side === "out" ? " is-due" : ""}${ping && firstPing.current === ping ? " is-arrive" : ""}`}
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
      {ping ? <i key={`p${ping}`} className="cobros-pulse" aria-hidden="true" /> : null}
      <div className="cobro-sides" role="tablist" data-side={side}>
        <i key={side} className="cobro-sides-fx" aria-hidden="true" />
        <button type="button" aria-pressed={side === "in"} onClick={() => { setDir(-1); setSide("in"); }}>{t("cobro.owed")}</button>
        <button type="button" aria-pressed={side === "out"} onClick={() => { setDir(1); setSide("out"); }}>{t("cobro.owe")}</button>
      </div>
      {/* Sin la escala de deudas (Esencial), la ventana es la cara lectora de
          los hechos de los dos lados (fallo 31; veredicto de Oscar de
          2026-11-16: Cobros no se queda afuera de Esencial) y el puente
          «Ver todo en Libros», que es gestión, no se dibuja. */}
      {!has("debt.scale") ? (
        <DebtsReadOnly side={side === "out" ? "owe" : "owed"} />
      ) : side === "out" ? <DeboSide dues={<DueOwe key="out" />} /> : <OwedSide key="in" dir={dir} />}
      {has("debt.scale") ? <SeeAll side={side} onGo={onClose} /> : null}
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
    // 1.3.88: the label can change width without any box resizing (web font arriving, fit.ts shrinking a kicker); re-place after each.
    let live = true; void document.fonts?.ready.then(() => { if (live) place(); });
    window.addEventListener("faro-fit", place);
    return () => { live = false; ro.disconnect(); window.removeEventListener("faro-fit", place); };
  }, []);
  return <span ref={ref} className="desk-rate-hint" style={{ visibility: "hidden" }}><Hint topic="tasa-rapida" className="is-bar" /></span>;
}

/* 1.3.122: Back from an Asesor action taken on a Central lens lands on that lens again (only at the depth it left from, once). */
let lensReturn: { depth: number; lens: "have" | "spend" | "debt" } | null = null;
function takeLensReturn(depth: number) {
  const r = lensReturn;
  if (!r) return null;
  if (depth !== r.depth) { if (depth < r.depth) lensReturn = null; return null; }
  lensReturn = null;
  return r.lens;
}

/**
 * El encuentro de §5.2 en modo «preguntar»: la ventana de confirmación de la casa con
 * sus tres salidas — dentro de la cuenta que acaba de entrar / dinero aparte / fondo
 * por fondo, que se despliega DENTRO de la misma ventana (ninguna ventana nueva). El
 * guardia habla antes de estampar: lo marcado dentro nunca supera lo libre de la
 * cuenta anfitriona, y lo que no cabe queda sin declarar, con su pregunta viva.
 */
function EncounterDialog({ accountId, pending, onClose }: { accountId: string; pending: PendingFund[]; onClose: () => void }) {
  const { session, commit, t, fmt, names, key } = useFaro();
  const [each, setEach] = useState(false);
  const [picks, setPicks] = useState<Record<string, { nature: FundNature | null; host: string }>>({});
  const [guard, setGuard] = useState("");
  if (!session) return null;
  const stock = savingsStock(session.ledger, key);
  const live = pending.filter((f) => stock.series.get(f.seriesId)?.cls === "sin-declarar");
  const total = live.reduce((a, f) => a + f.minor, 0);
  const list = live.map((f) => `${seriesName(session.ledger, f.seriesId) || names.sub(f.subId)} ${fmt(f.minor)}`).join(", ");
  const moneyed = hostAccounts(session.ledger, key, stock).filter((a) => a.minor > 0);
  const moneyedNamed = moneyed.map((a) => ({ id: a.id, name: names.sub(a.id) || a.id, minor: a.minor }));
  const declareInside = () => {
    const libre = libreOf(stock, accountId);
    if (total > libre) {
      setGuard(`${t("fund.guard").replace("{x}", fmt(total)).replace("{y}", fmt(libre))} ${t("fund.enc.guardNote")}`);
      return;
    }
    commit((s) => live.reduce((acc, f) => declareSeries(acc, f.seriesId, "saldo", accountId), s), "fondos");
    onClose();
  };
  const declareAparte = () => {
    commit((s) => live.reduce((acc, f) => declareSeries(acc, f.seriesId, "aparte"), s), "fondos");
    onClose();
  };
  const declareOne = (f: PendingFund) => {
    const pick = picks[f.seriesId] ?? { nature: null as FundNature | null, host: "" };
    const stamp = stampFor("ask", pick.nature, pick.host, moneyed);
    if (!stamp.ready || !stamp.fund) return;
    if (stamp.fund === "saldo") {
      const g = guardFor(stock, stamp.fundHost ?? "", f.minor);
      if (!g.fits) { setGuard(t("fund.guard").replace("{x}", fmt(f.minor)).replace("{y}", fmt(g.libre))); return; }
    }
    setGuard("");
    commit((s) => declareSeries(s, f.seriesId, stamp.fund!, stamp.fundHost), session ? (seriesName(session.ledger, f.seriesId) || names.sub(f.subId)) : names.sub(f.subId));
  };
  return (
    <div className="ask-back" role="presentation" onMouseDown={onClose}>
      <div className="ask is-enc" data-anchor="ask-dialog" role="alertdialog" aria-modal="true" aria-label={t("fund.enc.title")} onMouseDown={(e) => e.stopPropagation()}>
        <i className="ask-glow" aria-hidden />
        <span className="ask-seal" aria-hidden>
          <svg viewBox="0 0 100 118" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 98 L32 56 L68 56 L78 98 Z" />
            <path d="M40 56 V46 H60 V56" />
            <path d="M44 46 V32 H56 V46" />
            <path d="M38 32 H62" />
            <path d="M50 32 V16" />
            <circle cx="50" cy="11" r="4" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <h2 className="ask-title">{t("fund.enc.title")}</h2>
        <p className="ask-body">{t("fund.enc.body").replace("{x}", fmt(total)).replace("{list}", list)}</p>
        {guard ? <p className="ask-body">{guard}</p> : null}
        {!each ? (
          <div className="enc-actions">
            <button type="button" className="ask-btn is-go" data-anchor="enc-inside" onClick={declareInside}>{t("fund.enc.inside")}</button>
            <button type="button" className="ask-btn" onClick={declareAparte}>{t("fund.enc.aparte")}</button>
            <button type="button" className="ask-btn is-quiet" onClick={() => setEach(true)}>{t("fund.enc.each")}</button>
            <button type="button" className="ask-btn is-quiet" onClick={onClose}>{t("cancel")}</button>
          </div>
        ) : (
          <>
            <div className="enc-funds">
              {live.map((f) => {
                const pick = picks[f.seriesId] ?? { nature: null as FundNature | null, host: "" };
                const name = seriesName(session.ledger, f.seriesId) || names.sub(f.subId);
                return (
                  <div key={f.seriesId} className="enc-fund">
                    <span className="enc-fund-name">
                      <FundLight cls="sin-declarar" />
                      <span>{name}</span>
                      <strong className="num">{fmt(f.minor)}</strong>
                    </span>
                    <NaturePick
                      mode="ask"
                      value={pick.nature}
                      onPick={(n) => setPicks((p) => ({ ...p, [f.seriesId]: { nature: n, host: pick.host } }))}
                      host={pick.host}
                      onHost={(h) => setPicks((p) => ({ ...p, [f.seriesId]: { nature: pick.nature, host: h } }))}
                      accounts={moneyedNamed}
                    />
                    <button type="button" className="ask-btn" onClick={() => declareOne(f)}>{t("fund.mig.each")}</button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="ask-btn is-go enc-done" onClick={onClose}>{t("fund.enc.done")}</button>
          </>
        )}
      </div>
    </div>
  );
}

export function Desk({ focus }: { focus?: "save" | "meta" | "retiro" | "emergencia" } = {}) {
  const { t, summary, fmt, fmtShort, lines, copyPrev, ui, setUi, viewLine, names, session, commit, confirm, key, lang, goTopic } = useFaro();
  const { depth } = useFaro();
  // Etapa 3.1: la cara se recompone por el registro, solo vía el contexto (has).
  // `mode` a secas ya es la postura de naturalezas en esta función; el modo de la
  // app viaja como `faroMode`.
  const { has, mode: faroMode } = useFaro();
  const [lens, setLens] = useState<"all" | "have" | "spend" | "debt">(() => (focus ? "all" : takeLensReturn(depth) ?? "all"));
  const lensByJump = useRef(false);
  // An Asesor step that stayed on Central (no remount) leaves nothing to bring back.
  useEffect(() => { if (!focus) lensReturn = null; }, [depth, focus]);
  // Back from Libros after Cobros' "Ver todo": Cobros comes back open on the side (and Debo tab) it was on.
  const [cobrosBack] = useState(() => (focus ? null : takeCobrosReturn(depth)));
  const [cobros, setCobros] = useState(!!cobrosBack);
  const [cobrosJump, setCobrosJump] = useState(!!cobrosBack);
  const [cobrosPing, setCobrosPing] = useState(0);
  // 1.3.106: whether the open Cobros panel is the one active thing (its corner button lit). A card picked while it stays open takes the focus.
  const [cobrosLit, setCobrosLit] = useState(true);
  // 1.3.107: Cobros opened from an open + / − flow waits for that flow's history step-back before owning its entry.
  const [cobrosWait, setCobrosWait] = useState(false);
  useEffect(() => {
    if (!cobrosWait) return;
    let done = false;
    const go = () => { if (done) return; done = true; window.setTimeout(() => setCobrosWait(false), 0); };
    window.addEventListener("popstate", go, { once: true });
    const timer = window.setTimeout(go, 600);
    return () => { done = true; window.removeEventListener("popstate", go); window.clearTimeout(timer); };
  }, [cobrosWait]);
  const quickClosedByLens = useRef(false);
  const [lamp, setLamp] = useState<"good" | "warn" | "bad" | null>(null);
  const [flowDir, setFlowDir] = useState(1);
  const [quick, setQuick] = useState<null | "in" | "out">(null);
  const [jump, setJump] = useState<null | { kind: LineKind; categoryId: string; title: string }>(null);
  const holdTimer = useRef<{ in?: number; out?: number; due?: number }>({});
  const clickTimer = useRef<{ in: number; out: number; due: number }>({ in: 0, out: 0, due: 0 });
  const openTimer = useRef<{ in?: number; out?: number; due?: number }>({});
  const heldFlag = useRef<{ in: boolean; out: boolean; due: boolean }>({ in: false, out: false, due: false });
  // 1.3.283: the side a fresh Cobros mount opens on when a Pagos-button gesture (or the plain tap, which resets it) asks.
  const [cobrosSide, setCobrosSide] = useState<"in" | "out">("out");
  const [saveOn, setSaveOn] = useState<string | null>(null);
  const [openSave, setOpenSave] = useState<string | null>(null);
  const [deskLine, setDeskLine] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  // 1.3.115: Libros savings books carry their own + (Apartado del mes) as a Back step.
  const [asideAdd, setAsideAdd] = useState(false);
  const [asideGlyph, setAsideGlyph] = useState("PiggyBank");
  const [asideColor, setAsideColor] = useState(SAVINGS_PURPLE);
  useLayer(asideAdd, () => setAsideAdd(false));
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [addFromView, setAddFromView] = useState(false);
  // A pocket's + in Libros (Meta, Retiro, Emergencia) is a Back step too.
  useLayer(!!focus && adding, () => setAdding(false));
  const [accountsOpen, setAccountsOpen] = useState(() => {
    try { return localStorage.getItem("faro-save-accounts") === "1"; } catch { return false; }
  });
  // Etapa 4 (X-26): la lista de fondos mudos que la fila abre (modo-lista).
  const [muteOpen, setMuteOpen] = useState(false);
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
  // El modelo de ahorros (oleada 2): la respuesta a «¿dónde vive?» del formulario de bolsa,
  // la lista de migración de la ventana Ahorros y el encuentro de §5.2.
  const [pocketNature, setPocketNature] = useState<FundNature | null>(null);
  const [pocketHost, setPocketHost] = useState("");
  useEffect(() => { if (!adding) { setPocketNature(null); setPocketHost(""); } }, [adding]);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [migPicks, setMigPicks] = useState<Record<string, { nature: FundNature | null; host: string }>>({});
  const [encounter, setEncounter] = useState<{ accountId: string; pending: PendingFund[] } | null>(null);
  useLayer(!!encounter, () => setEncounter(null));
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
    let deviceGate = false;
    try { deviceGate = localStorage.getItem("faro-save-presets") === "1"; } catch { return; }
    // 1.3.177: the seed-once decision lives in the ledger (deskseed.ts), not only in this
    // device's localStorage — a bank the user deleted stays deleted wherever the book goes.
    const decision = deskSeedDecision(session.ledger, "desk-banks", deviceGate);
    if (decision === "done") { seeded.current = true; return; }
    if (decision === "adopt") {
      seeded.current = true;
      try { localStorage.setItem("faro-save-presets", "1"); } catch { /* ignore */ }
      commit((s) => withDeskSeedFlag(s, "desk-banks"), "presets");
      return;
    }
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
      ["Carro", cat.subs.find((s) => s.id.endsWith(".emergencia"))?.id, "Car"],
    ].filter((row): row is [string, string, string] => {
      const subId = row[1];
      const concept = row[0];
      return !!subId && !!concept && !all.some((line) => line.subId === subId && line.concept.toLowerCase() === concept.toLowerCase());
    });
    // C-5 (etapa 3.1): la siembra se acota por modo — en Esencial solo nacen las
    // cuentas; los bolsillos esperan su modo (quedan «en espera» en el propio
    // libro, y el efecto de subida los siembra al llegar a Ritmo). Un libro que
    // ya vive por encima los recibe en esta misma pasada, como siempre.
    const pocketsPending = pockets.length > 0 && !has("vault.meta");
    const pocketsSeed = pocketsPending ? [] : pockets;
    if (!banks.length && !pockets.length) { commit((s) => withDeskSeedFlag(withDeskSeedFlag(s, "desk-banks"), "desk-pockets"), "presets"); return; }
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
      for (const [concept, subId, icon] of pocketsSeed) {
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
      return withDeskSeedFlag(withDeskSeedFlag(next, "desk-banks"), pocketsPending ? "desk-pockets-wait" : "desk-pockets");
    }, "presets");
  }, [session, commit, key, faroMode]);
  // C-5, la otra mitad: un libro nacido en Esencial siembra sus bolsillos al
  // subir a Ritmo, si aún no los tiene. La señal vive en el libro («desk-pockets
  // -wait» la dejó la pasada de nacimiento); los libros de antes de los modos no
  // la llevan y nunca son tocados por este efecto.
  useEffect(() => {
    if (!session || !has("vault.meta")) return;
    const seeds = session.ledger.settings.seeds ?? [];
    if (!seeds.includes("desk-pockets-wait") || seeds.includes("desk-pockets")) return;
    const cat = session.ledger.structure.categories.find((c) => c.role === "savings" && !c.hidden);
    if (!cat) return;
    const all = Object.values(session.ledger.months).flatMap((bucket) => bucket.lines);
    const pockets = [
      ["Viajes", cat.subs.find((s) => s.id.endsWith(".meta"))?.id, "Plane"],
      ["Carro", cat.subs.find((s) => s.id.endsWith(".emergencia"))?.id, "Car"],
    ].filter((row): row is [string, string, string] => {
      const subId = row[1];
      const concept = row[0];
      return !!subId && !!concept && !all.some((line) => line.subId === subId && line.concept.toLowerCase() === concept.toLowerCase());
    });
    const display = session.ledger.settings.display;
    commit((s) => {
      let next = s;
      for (const [concept, subId, icon] of pockets) {
        const id = uid();
        next = upsertLine(next, {
          id, seriesId: id, monthKey: key, kind: "expense-fixed", concept, amountMinor: 0, currency: display,
          active: true, note: "", categoryId: cat.id, subId, recurring: false, storeId: "", providerId: "",
          productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
          balanceCurrency: display, icon, history: [],
        });
      }
      return withDeskSeedFlag(next, "desk-pockets");
    }, "presets");
  }, [session, commit, key, faroMode]);
  // 1.3.81: Primerica is offered in Retiro (a $0 preset) in the current month or later (or the ledger's latest month) until the user removes it (ledger.retiroOff).
  // C-5 (etapa 3.1): la oferta vive en Retiro — en Esencial, donde Retiro no
  // tiene cara, la siembra espera su modo en vez de crear un dato mudo en un
  // libro que nunca subió.
  useEffect(() => {
    if (!session || !has("vault.retiro")) return;
    const now = new Date();
    const latest = Object.keys(session.ledger.months).every((m) => m <= key);
    if (!latest && key < `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`) return;
    if (seedRetiro(session.ledger, key) === session.ledger) return;
    commit((s) => seedRetiro(s, key), "Primerica");
  }, [session, commit, key, faroMode]);
  useEffect(() => {
    if (!session) return;
    let deviceGateNi = false;
    try { deviceGateNi = localStorage.getItem("faro-save-ni") === "1"; } catch { return; }
    // 1.3.177: same ledger-kept decision as the presets seed (deskseed.ts).
    const decisionNi = deskSeedDecision(session.ledger, "desk-ni", deviceGateNi);
    if (decisionNi === "done") return;
    if (decisionNi === "adopt") {
      try { localStorage.setItem("faro-save-ni", "1"); } catch { /* ignore */ }
      commit((s) => withDeskSeedFlag(s, "desk-ni"), "ni-banks");
      return;
    }
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
      if (!current) return withDeskSeedFlag(s, "desk-ni");
      const named = new Set(current.subs.map((sub) => (sub.customName || "").trim().toLowerCase()));
      const banks = wanted.filter(([id, name]) => !current.subs.some((sub) => sub.id === id) && !named.has(name.toLowerCase()));
      if (!banks.length) return withDeskSeedFlag(s, "desk-ni");
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
      return withDeskSeedFlag(next, "desk-ni");
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
      // 1.3.106: an open + / − flow owns this back (QuickAdd closes itself); the picked card must stay picked under it.
      if (quickRef.current) return;
      if (deskLine) {
        setDeskLine(null);
        e.preventDefault();
        return;
      }
      // Oleada de botones 4 (R15): el editor en línea de la bolsa (renameId) consume su
      // propio paso atrás, como Agregar y como Ícono y color — antes se caía a la rama
      // de la bolsa abierta y un solo atrás salía de la bolsa entera.
      if (editId || adding || moving || renameId) {
        setEditId(null);
        setAdding(false);
        setMoving(null);
        setRenameId(null);
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
  }, [lens, openSave, editId, adding, moving, renameId, accountsOpen, accountsPin, deskLine, focus]);
  useEffect(() => {
    if (!quick) return;
    quickRef.current?.scrollIntoView({ block: "nearest" });
    const hide = (e: Event) => {
      const target = e.target;
      if (target instanceof Element && (quickRef.current?.contains(target) || target.closest(".lens-corner"))) return;
      if (quickRef.current?.querySelector("[data-reporting]")) return;
      // 1.3.106: a card tapped to leave the flow becomes the active card (no toggle off).
      if (target instanceof Element && target.closest(".lenses .lens")) quickClosedByLens.current = true;
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
  // Central's ring (1.3.94): the choice picked last, a lens or a savings pocket, is where a finger swipe steps from.
  // 1.3.97: the lens list swapped by a tap or a ring step gets `is-swap` (no arrival fades inside, see debts.css); the first one keeps Tron's rez.
  const lastLens = useRef(lens);
  const lensSwapped = useRef(false);
  if (lastLens.current !== lens) { lastLens.current = lens; lensSwapped.current = true; }
  const ringAt = useRef<string | null>(null);
  useEffect(() => { if (lens !== "all") ringAt.current = lens; }, [lens]);
  useEffect(() => {
    const kind = openSave?.endsWith(".meta") ? "meta" : openSave?.endsWith(".retiro") ? "retiro" : openSave?.endsWith(".emergencia") ? "emergencia" : null;
    if (kind) ringAt.current = kind;
  }, [openSave]);
  const tabletOneAA = useTabletOneAA();
  // La lente Pagos es de Ritmo (central.lens-pagos): en Esencial una lente
  // guardada en «debt» se lee como «all» — se filtra al leer, nunca se reescribe.
  const lensMode = lens === "debt" && !has("central.lens-pagos") ? "all" : lens;
  const deskPocket = openSave?.endsWith(".meta") ? "meta" : openSave?.endsWith(".retiro") ? "retiro" : openSave?.endsWith(".emergencia") ? "emergencia" : null;
  const deskArea: AreaId = deskPocket ?? (lensMode === "have" ? "income" : lensMode === "spend" ? "spend" : lensMode === "debt" ? "subs" : "central");
  const ringLive = useRef({ lens, openSave, ids: [] as string[] });
  useEffect(() => {
    // C-4/N-1 (etapa 3.1): el anillo se construye desde las paradas del modo
    // activo — las lentes que el modo tiene y los bolsillos que el modo tiene
    // (y que existen en el libro). Ninguna parada fuera del modo.
    const order = (has("central.lens-pagos") ? ["have", "spend", "debt"] : ["have", "spend"]) as readonly ("have" | "spend" | "debt")[];
    const pocketStop = (k: string) => (k === "meta" ? has("vault.meta") : k === "retiro" ? has("vault.retiro") : has("vault.emergencia"));
    const onLens = (e: Event) => {
      if (focus) return;
      const detail = (e as CustomEvent<number | { dir: number; ring: true }>).detail;
      const dir = typeof detail === "number" ? detail : detail.dir;
      setFlowDir(dir);
      lensByJump.current = false;
      setCobrosLit(false);
      if (typeof detail === "number") {
        // Mouse drag: the mode's lenses, as before.
        setLens((cur) => {
          const i = order.indexOf(cur as (typeof order)[number]);
          const base = i < 0 ? (dir > 0 ? -1 : 0) : i;
          return order[(base + dir + order.length) % order.length]!;
        });
        return;
      }
      // Touch: the mode's lenses and pockets as one loop (a pocket that does not exist is skipped).
      const live = ringLive.current;
      const pocketOf = (k: string) => live.ids.find((id) => id.endsWith(`.${k}`)) ?? null;
      const ring = ["have", "spend", "debt", "meta", "retiro", "emergencia"].filter((k) => order.includes(k as never) || (pocketStop(k) && !!pocketOf(k)));
      const here = ringAt.current && ring.includes(ringAt.current) && (order.includes(ringAt.current as never) ? live.lens === ringAt.current : live.openSave === pocketOf(ringAt.current)) ? ringAt.current : null;
      const i = here ? ring.indexOf(here) : (dir > 0 ? -1 : 0);
      const next = ring[(i + dir + ring.length) % ring.length]!;
      ringAt.current = next;
      if (order.includes(next as never)) {
        setOpenSave(null);
        setLens(next as (typeof order)[number]);
        window.setTimeout(() => { ringLit(document.querySelector(`.lens.is-${next}`)); ringShow(document.querySelector<HTMLElement>('[data-anchor="desk-list"]')); }, 60);
      } else {
        const id = pocketOf(next)!;
        setLens("all");
        setSaveOn(id); setEditId(null); setAdding(false); setMoving(null);
        setOpenSave(id);
        window.setTimeout(() => { ringLit(document.querySelector(".save-seg.is-on")); ringShow(ledgerRef.current); }, 60);
      }
    };
    window.addEventListener("faro-lens", onLens);
    return () => window.removeEventListener("faro-lens", onLens);
  }, [focus, faroMode]);
  // "Ir allí" / [[links]]: pick a lens or open Cobros. Etapa 3.1: el oyente
  // hereda la validación del modo (resto declarado de la etapa 2) — un destino
  // que el modo no tiene no se abre desde dentro tampoco.
  useEffect(() => {
    if (focus) return;
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === "cobros") { if (!has("central.cobros-panel")) return; setQuick(null); setJump(null); setCobrosSide("out"); setCobrosJump(true); setCobros(true); setCobrosLit(true); }
      else if (id === "lens-have" || id === "lens-spend" || id === "lens-debt") { if (id === "lens-debt" && !has("central.lens-pagos")) return; lensByJump.current = true; setLens(id.slice(5) as "have" | "spend" | "debt"); }
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, [focus, faroMode]);
  // 1.3.95: a layout effect, so the pocket's own blocks (Todas / the pocket ledger) are there in the very first painted frame
  // of a savings tab. As a plain effect they arrived one frame late and everything under them jumped 55–78px.
  useLayoutEffect(() => {
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
    // 1.3.177: the board is a list — a line whose category or subconcept the user hid does
    // not appear (it keeps counting in every total; see lineListVisible). The Asesor's
    // naming surfaces already obeyed this via visibleNamer; the board itself did not.
    if (!lineListVisible(session.ledger.structure, line)) return false;
    if (lensMode === "have") return line.kind.startsWith("income");
    if (lensMode === "debt") return debtIds.has(line.categoryId) || line.kind === "subscription";
    if (lensMode === "spend") return !line.kind.startsWith("income");
    return true;
  });
  const rate = session.ledger.settings;
  const spent = summary.spentPct === null ? "—" : `${Math.round(summary.spentPct)}%`;
  // Contrato, regla 3 (R-4): la banda nunca contradice al motor. savingsIds cubre TODAS las categorías
  // de ahorro (ocultas o no); solo los bolsillos y cuentas CON NOMBRE siguen la visibilidad (seed y
  // accountRows salen de las visibles), y el dinero oculto suma en el segmento genérico «rest».
  const savingsCats = session.ledger.structure.categories.filter((c) => c.role === "savings");
  const visibleSavingsCats = savingsCats.filter((c) => !c.hidden);
  const savingsIds = new Set(savingsCats.map((c) => c.id));
  const vaultIds = new Set(savingsCats.flatMap((c) => c.subs.filter((s) => s.icon === "vault" || s.icon.startsWith("vault:")).map((s) => s.id)));
  const namedVaultIds = new Set(visibleSavingsCats.flatMap((c) => c.subs.filter((s) => !s.hidden && (s.icon === "vault" || s.icon.startsWith("vault:"))).map((s) => s.id)));
  const seed = visibleSavingsCats.flatMap((c) => c.subs.filter((s) => !s.hidden && s.icon !== "vault" && !s.icon.startsWith("vault:")).map((s) => ({ id: s.id, name: names.sub(s.id), categoryId: c.id })));
  const subCat = new Map(seed.map((s) => [s.id, s.categoryId]));
  // Oleada 3 del modelo de ahorros: la banda y el libro leen la PARTICIÓN (la única
  // fuente de stocks, §2.3) — cada segmento trae su dinero por clase: keptMinor es su
  // lectura de pila (aparte + sin declarar, que se lee como pila) más su Retiro;
  // pledgedMinor es lo que monta sobre el saldo y NUNCA suma al titular; minor es el
  // stock entero atribuido a la bolsa (lo que sus ventanas listan). Para un libro sin
  // declaraciones, keptMinor + pledgedMinor reproduce las cifras de siempre.
  const stock = savingsStock(session.ledger, key);
  // La entrada del mes de Retiro (Oscar, vía de ventanas, 2026-11-16): su
  // tarjeta nunca puede llevar la línea del saldo — su dinero no vive en una
  // cuenta — así que su segundo asiento dice lo que SÍ entró este mes: los
  // importes positivos asentados en la bolsa en el mes en pantalla. La doble
  // forma cuenta por su importe (el depósito del mes; el saldo que la misma
  // línea enuncia es la foto, no otra entrada); una línea cuyo importe ES su
  // saldo se lee como enunciado de saldo, no como entrada. Mes sin entrada =
  // asiento vacío, como una bolsa sin parte del saldo no pinta línea.
  const monthBucket = session.ledger.months[key];
  const inflowOf = (subId: string): number => {
    if (!subId.endsWith(".retiro")) return 0;
    let sum = 0;
    for (const l of monthBucket?.lines ?? []) {
      if (!l.active || l.rest || l.subId !== subId || !savingsIds.has(l.categoryId)) continue;
      if (l.balanceMinor != null && l.amountMinor === l.balanceMinor) continue;
      const minor = convertMinor(l.amountMinor, l.currency, rate.display, rate.rateE4);
      if (minor > 0) sum += minor;
    }
    return sum;
  };
  const segAggs = segmentAgg(stock, new Set(seed.map((s) => s.id)), namedVaultIds);
  const segOf = (agg: SegmentAgg | undefined, id: string) => {
    const keptMinor = (agg?.kept ?? 0) + (agg?.undecl ?? 0);
    const pledgedMinor = agg?.pledged ?? 0;
    const hosts = agg?.saldoHosts ?? [];
    const lightCls: "aparte" | "saldo" | "sin-declarar" | null = id.endsWith(".retiro") || ((agg?.total ?? 0) <= 0 && keptMinor <= 0 && pledgedMinor <= 0)
      ? null
      : (agg?.undecl ?? 0) > 0 ? "sin-declarar" : keptMinor > 0 ? "aparte" : "saldo";
    return {
      minor: keptMinor + pledgedMinor,
      keptMinor,
      pledgedMinor,
      inflowMinor: inflowOf(id),
      undeclMinor: agg?.undecl ?? 0,
      lightCls,
      saldoHostName: hosts.length === 1 ? (names.sub(hosts[0]!) || undefined) : undefined,
    };
  };
  const saveSegs = (seed.length ? seed : [{ id: "rest", name: t("desk.savings"), categoryId: savingsCats[0]?.id ?? "" }]).map((s) => ({ ...s, ...segOf(segAggs.get(s.id), s.id) }));
  const restAgg = segAggs.get("rest");
  if (restAgg && restAgg.total !== 0 && seed.length) saveSegs.push({ id: "rest", name: t("desk.savings"), categoryId: savingsCats[0]?.id ?? "", ...segOf(restAgg, "rest") });
  ringLive.current = { lens, openSave, ids: saveSegs.map((s) => s.id) };
  // Lo guardado: el titular (§3). Lo comprometido: la segunda lectura, que nunca suma.
  const keptTotal = keptTotalOf(stock);
  const keptPeak = Math.max(...saveSegs.map((s) => s.keptMinor), 1);
  const keptSegTotal = saveSegs.reduce((acc, s) => acc + s.keptMinor, 0);
  // La fórmula del titular (§4.1): solo dinero que existe una vez, con sus partes.
  const keptFormula = [
    `${t("save.accounts")} ${fmt(stock.byClass.cuenta)}`,
    `${t("save.kept.funds")} ${fmt(stock.byClass.aparte + stock.undeclared)}`,
    `${saveSegs.find((s) => s.id.endsWith(".retiro"))?.name ?? t("vault.retiro")} ${fmt(stock.byClass.retiro)}`,
  ].join(" · ");
  // La lista de fondos del saldo, para la fórmula de la segunda línea (§4.1).
  const pledgedFundsList = [...stock.series.entries()]
    .filter(([, r]) => r.cls === "saldo")
    .map(([sid, r]) => `${seriesName(session.ledger, sid) || names.sub(r.subId)} ${fmt(r.minor)}`)
    .join(" · ");
  // Etapa 3.1 (C-2): los fondos mudos de un modo sin bolsillos — el dinero que
  // suma a los totales sin tener cara en este modo (aparte, sin declarar y
  // Retiro). Lo del saldo no se cuenta aquí: ya vive dentro de las cuentas.
  // Ola de prejuicio 1 (B5 de la Cara, B-5 de Cambios): la fila dice la verdad
  // de cada fondo — mudo es solo el dinero cuyo BOLSILLO se gestiona en un
  // modo mayor que el actual (pocketModeOf): una serie del segmento llano de
  // Ahorros se gestiona en Esencial y NO es muda, y los bolsillos Meta,
  // Retiro y Emergencia se gestionan en Ritmo, no en Completo. La fila
  // nombra el modo verdadero de lo que lista, fondo por fondo.
  const deskMode = modeOf(session.ledger.settings);
  const muteSeries = [...stock.series.entries()].flatMap(([sid, r]) => {
    if (!((r.cls === "aparte" || r.cls === "sin-declarar" || r.cls === "retiro") && r.minor > 0)) return [];
    const mode = pocketModeOf(r.subId);
    return mode !== null && modeRank(mode) > modeRank(deskMode) ? [{ sid, r, mode }] : [];
  });
  const dormantMinor = muteSeries.reduce((acc, x) => acc + x.r.minor, 0);
  const muteModes = [...new Set(muteSeries.map((x) => x.mode))].sort((a, b) => modeRank(a) - modeRank(b));
  // Etapa 4 (X-26): la fila muda en su forma final — su toque ABRE la lista de
  // los fondos (modo-lista): todo se lee, nada se edita aquí. La explicación
  // de la fila viaja a la cabeza de la lista (qué es + la nota), así que la
  // ley del número se cumple entera: la lista ES la fórmula de su cifra.
  const muteRow = !has("vault.meta") && dormantMinor > 0 ? (
    <div className="mute-row">
      <button type="button" className="mute-row-head" data-anchor="modo-mudos" aria-expanded={muteOpen} onClick={() => setMuteOpen((v) => !v)}>
        <span>{t(muteSeries.length === 1 ? "mode.mute.fund.one" : "mode.mute.fund.many").replace("{n}", String(muteSeries.length))} {muteModes.map((m, i) => (<span key={m}>{i > 0 ? " · " : ""}<span className="faro-name">{t(`mode.${m}`)}</span></span>))}{` · ${fmt(dormantMinor)}`}</span>
        <ChevronDown className={muteOpen ? "fold-chev is-open" : "fold-chev"} aria-hidden />
      </button>
      {muteOpen ? (
        <div className="mute-list" data-anchor="modo-lista">
          <p className="mute-list-what">{t("mode.mute.what").replace("{name}", muteModes.map((m) => t(`mode.${m}`)).join(" · "))}</p>
          {muteSeries.map(({ sid, r, mode }) => (
            <div key={sid} className="mute-list-row">
              <span className="mute-list-name">{seriesName(session.ledger, sid) || names.sub(r.subId)}</span>
              <span className="mute-list-cls">{t(`mode.list.cls.${r.cls}`)} · {t(`mode.${mode}`)}</span>
              <strong className="num">{fmt(r.minor)}</strong>
            </div>
          ))}
          <div className="mute-list-row is-total">
            <span className="mute-list-name">{t("mode.list.total")}</span>
            <strong className="num">{fmt(dormantMinor)}</strong>
          </div>
          <p className="mute-list-note">{t("mode.mute.note").replace("{name}", t(`mode.${muteModes[muteModes.length - 1]}`))}</p>
        </div>
      ) : null}
    </div>
  ) : null;
  // Etapa 4 (E-1): «Puedes gastar hoy» — solo en Central y solo cuando el mes
  // mirado es el mes en curso; en un mes pasado o futuro la pieza no monta
  // (ningún cadáver, ninguna cifra fingida sobre otro mes).
  const todayFig = !focus && key === todayIso().slice(0, 7) ? todayText(session.ledger, todayIso(), lang) : null;
  const saveTints = ["#8fb9a6", "#72b4b2", "#7aa2c4", "#e07a5f", "#c9a6d4", "#d7b48a"].map((c) => (isTron() ? tronize(c) : c));
  const openSeg = saveSegs.find((s) => s.id === openSave) ?? null;
  const openLines = openSave
    ? lines.filter((line) => {
        if (!savingsIds.has(line.categoryId) || line.archived) return false;
        const id = line.subId && seed.some((s) => s.id === line.subId) ? line.subId : "rest";
        return id === openSave;
      })
    : [];
  const accountRows = visibleSavingsCats.flatMap((c) => c.subs.filter((s) => !s.hidden && (s.icon === "vault" || s.icon.startsWith("vault:"))).map((s) => {
    const minor = lines.filter((line) => line.active && !line.rest && line.subId === s.id).reduce((sum, line) => sum + convertMinor(line.balanceMinor ?? line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, rate.display, rate.rateE4), 0);
    return { id: s.id, name: s.customName || names.sub(s.id), categoryId: c.id, minor, icon: s.icon, order: s.order };
  }));
  const accountTotal = accountRows.reduce((sum, row) => sum + row.minor, 0);
  const fixedSave = lines.filter((line) => line.active && !line.rest && line.kind === "expense-fixed" && savingsIds.has(line.categoryId) && !vaultIds.has(line.subId));
  const aside = fixedSave.reduce((sum, line) => sum + convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4), 0);
  // Oleada 3 (§4.2): el Apartado partido en dos lecturas — lo que solo etiquetó el
  // saldo contra lo que de verdad se movió a pilas aparte. Suman el total de siempre.
  const asideParts = asideSplit(fixedSave.map((line) => ({ seriesKey: line.seriesId || line.id, minor: convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4) })), stock);
  const orderedAccounts = [...accountRows].sort((a, b) => a.order - b.order);
  const bankRows = bankRank
    ? [...bankRank.flatMap((id) => orderedAccounts.filter((row) => row.id === id)), ...orderedAccounts.filter((row) => !bankRank.includes(row.id))]
    : orderedAccounts;
  const focusedAccount = accountRows.find((row) => row.id === accountFocus) ?? null;
  // El modelo de ahorros (oleada 2): la partición canónica de savingsStock (calculada
  // arriba, junto a los segmentos) alimenta las luces de las filas, la lista de
  // migración y el encuentro — ninguna cifra nueva se calcula aquí; las superficies
  // solo leen la clase que el motor ya partió.
  const mode = natureMode(session.ledger.settings);
  const hostAccts = hostAccounts(session.ledger, key, stock);
  const namedAccts = hostAccts.map((a) => ({ id: a.id, name: names.sub(a.id) || a.id, minor: a.minor }));
  // La lista de migración nombra los fondos CON DINERO sin declarar: una bolsa de
  // fábrica en cero no tiene nada que clasificar todavía (el encuentro de §5.2 usa el
  // mismo corte). Declarar sigue siendo posible para cualquier fondo desde su editor.
  const pendingFunds = undeclaredFunds(stock).filter((f) => f.minor > 0);
  const tintOf = (subId: string) => saveTints[Math.max(0, saveSegs.findIndex((s) => s.id === subId)) % saveTints.length] ?? "#8fb9a6";
  const fundLightFor = (line: Line) => {
    // La luz es el signo del análisis por naturaleza (nature.light, Completo):
    // fuera de Completo la fila no lleva luz, como no lleva el análisis.
    if (!has("nature.light")) return null;
    const row = stock.series.get(line.seriesId || line.id);
    if (!row || row.cls === "cuenta" || row.cls === "retiro") return null;
    return <FundLight cls={row.cls} tone={tintOf(row.subId)} hostName={row.fundHost ? (names.sub(row.fundHost) || undefined) : undefined} />;
  };
  /** El encuentro de §5.2, en modo de postura fija: la respuesta global ya está dada por
   *  Ajustes y se aplica en el acto — pero bajo «Todo sale de mi saldo» el guardia habla
   *  igual si lo que entraría dentro supera lo libre de la cuenta que acaba de entrar. */
  function meetFixedModes(accountId: string, pending: PendingFund[], libreAfter: number) {
    if (mode === "ask") { setEncounter({ accountId, pending }); return; }
    if (mode === "separate") {
      commit((s) => pending.reduce((acc, f) => declareSeries(acc, f.seriesId, "aparte"), s), "fondos");
      return;
    }
    const total = pending.reduce((a, f) => a + f.minor, 0);
    if (total <= libreAfter) {
      commit((s) => pending.reduce((acc, f) => declareSeries(acc, f.seriesId, "saldo", accountId), s), "fondos");
    } else {
      confirm({
        title: t("fund.enc.title"),
        body: `${t("fund.guard").replace("{x}", fmt(total)).replace("{y}", fmt(libreAfter))} ${t("fund.enc.guardNote")}`,
        yes: t("fund.enc.done"),
        run: () => {},
      });
    }
  }
  /** Declarar desde la lista de migración (§6.2): las opciones ya llevan su consecuencia
   *  escrita, así que el acto estampa sin ventana extra — salvo el guardia, que sí habla. */
  function declareFromMigration(f: PendingFund) {
    const pick = migPicks[f.seriesId] ?? { nature: null as FundNature | null, host: "" };
    const stamp = stampFor(mode, pick.nature, pick.host, hostAccts);
    if (!stamp.ready || !stamp.fund) return;
    if (stamp.fund === "saldo") {
      const g = guardFor(stock, stamp.fundHost ?? "", f.minor);
      if (!g.fits) {
        confirm({ title: t("fund.enc.title"), body: t("fund.guard").replace("{x}", fmt(f.minor)).replace("{y}", fmt(g.libre)), yes: t("fund.enc.done"), run: () => {} });
        return;
      }
    }
    commit((s) => declareSeries(s, f.seriesId, stamp.fund!, stamp.fundHost), session ? (seriesName(session.ledger, f.seriesId) || names.sub(f.subId)) : names.sub(f.subId));
  }
  const pocketKind = openSeg?.id.endsWith(".meta") ? "meta" : openSeg?.id.endsWith(".emergencia") ? "emergencia" : openSeg?.id.endsWith(".retiro") ? "retiro" : "";
  const retireLine = pocketKind === "retiro" ? (openLines.find((line) => line.active && isPrimerica(line)) ?? openLines.find((line) => line.startedOn || line.balanceMinor != null) ?? openLines[0] ?? null) : null;
  const retireStart = retireDate || retireLine?.startedOn || "";
  const retireHits = retireStart ? payDates(retireStart, "monthly") : [];
  const retireSend = openLines.reduce((sum, line) => sum + convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4), 0);
  const retireAccrued = retireHits.length * retireSend;
  // 1.3.115: the savings books' tools (palette + pencil), on the same lines and with the pockets' own delete rule
  // (archive when the line carries money history, so nothing is lost).
  const savKit = (rows: Line[], title: string, restore?: () => void) => (
    <BookKit title={title} test="sav-kit" word={["línea", "líneas", "line", "lines"]}
      rows={rows.map((l) => ({ id: l.id, label: l.concept || names.sub(l.subId) || names.cat(l.categoryId) || "—", glyph: isPrimerica(l) && (!l.icon || l.icon === "Circle") ? "brand:primerica" : (l.icon && l.icon !== "Circle" ? l.icon : "PiggyBank"), color: chosenTone(l.color, l.categoryId) || colorForLine(session.ledger.structure, l.categoryId, l.subId) }))}
      body={lang === "en" ? "Lines with money or history go to the archive, with all of it saved. Empty ones are removed." : "Las que tienen dinero o historial pasan al archivo, con todo guardado. Las vacías se quitan."}
      onEdit={(id) => setUi({ editing: id, draft: null })}
      onDrop={(ids) => commit((s0) => ids.reduce((acc, id) => dropPocketLine(acc, key, id).state, s0), ids.length === 1 ? (rows.find((l) => l.id === ids[0])?.concept || title) : `${ids.length}`)}
      onRename={(id, name) => { const l = rows.find((x) => x.id === id); if (l) commit((s0) => patchLine(s0, id, { concept: name }), name); }}
      onColor={(id, hex) => { const l = rows.find((x) => x.id === id); if (l) paintLine(l, { color: hex }); }}
      onIcon={(id, glyph) => { const l = rows.find((x) => x.id === id); if (l) paintLine(l, { icon: glyph }); }}
      onRestore={restore} />
  );
  const restoreRetiroAsk = () => confirm({
    title: lang === "en" ? "Restore defaults" : "Restaurar de fábrica",
    body: lang === "en" ? "Primerica comes back to Retiro at $0, or with its saved history. Nothing is deleted." : "Primerica vuelve a Retiro en $0, o con su historial guardado. No se borra nada.",
    yes: lang === "en" ? "Restore" : "Restaurar", run: () => commit((s0) => restoreRetiro(s0, key), "Primerica") });
  // 1.3.115: the pocket's add form, under whichever + opened it (the board's, or the Libros view's): nothing above moves.
  const pocketAdd = !openSeg ? null : (adding && (pocketKind === "meta" || pocketKind === "emergencia") ? (
              <div className="ah-form is-pocket">
                <div className="ah-grid">
                  <label className="label is-wide">
                    <span className="lab-head">{pocketKind === "meta" ? t("save.goal") : t("save.emerg")}<FieldTip topic="f-bolsa-nombre" alt={pocketKind !== "meta"} /></span>
                    <span className="fit-concept-row" onClick={(e) => { if ((e.target as Element).closest(".fit-pick-btn")) e.preventDefault(); }}>
                      <LookPick look={{ glyph: pocketGlyph, color: pocketColor, onGlyph: setPocketGlyph, onColor: setPocketColor }} />
                      <input className="field" data-anchor="pocket-name" value={pocketName} placeholder={pocketKind === "meta" ? t("save.goal.ph") : t("save.emerg.ph")} onChange={(e) => setPocketName(e.target.value)} />
                    </span>
                  </label>
                  <label className="label is-wide">
                    <span className="lab-head">{t("amount")}<FieldTip topic="f-bolsa-monto" /></span>
                    <input className="field num" data-anchor="pocket-amt" inputMode="decimal" value={pocketAmt} placeholder="0.00" onChange={(e) => setPocketAmt(e.target.value)} />
                  </label>
                  <NaturePick mode={mode} value={pocketNature} onPick={setPocketNature} host={pocketHost} onHost={setPocketHost} accounts={namedAccts} simple={!has("nature.naturepick-full")} />
                </div>
                <div className="ah-actions">
                  <button type="button" className="btn secondary" onClick={() => { setAdding(false); setPocketName(""); setPocketAmt(""); }}>{t("cancel")}</button>
                  <button type="button" className="btn" data-anchor="pocket-save" onClick={addPocket}>{t("save.keep")}</button>
                </div>
              </div>
            ) : adding ? (
              <>
                <LineForm
                  kind="expense-fixed"
                  preset={{ categoryId: openSeg.categoryId, subId: openSeg.id === "rest" ? "" : openSeg.id }}
                  glyph={pocketGlyph}
                  swatch={pocketPicked || openSeg.categoryId !== "f-ahorro" || pocketKind ? pocketColor : undefined}
                  dock
                  look={{ glyph: pocketGlyph, color: pocketPicked || openSeg.categoryId !== "f-ahorro" || pocketKind ? pocketColor : baseFor(session.ledger.structure, openSeg.categoryId), onGlyph: setPocketGlyph, onColor: (c) => { setPocketColor(c); setPocketPicked(true); } }}
                  onClose={() => setAdding(false)}
                />
              </>
            ) : null);
  const savEdit = (line: Line) => (ui.editing === line.id ? <SavEdit key={line.id} line={line} /> : null);
  const savTap = (line: Line) => ({
    role: "button" as const, tabIndex: 0, "aria-expanded": ui.editing === line.id,
    onClick: () => setUi({ editing: ui.editing === line.id ? null : line.id, draft: null }),
    onKeyDown: (e: { key: string; preventDefault: () => void }) => { if (e.key !== "Enter" && e.key !== " ") return; e.preventDefault(); setUi({ editing: ui.editing === line.id ? null : line.id, draft: null }); },
  });

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
    // Ola 2 (G2-1): dos negativas en la raíz del conmutador. (1) Ninguna
    // línea con vínculo de pago (loanId/lentId/cardId) se vuelve cuota, en
    // NINGÚN modo: entraría en la única clase que la copia de mes reproduce
    // sin preguntar y cada copia sumaría un abono fantasma contra la deuda.
    // (2) Volverse cuota es gestión de Cuotas (subs.cuota): en Esencial esa
    // habitación duerme y el verbo no existe — el conmutador ni lo ofrece.
    // Volver a Fijos, en cambio, es siempre legal: es la salida de la
    // habitación, también para las líneas que la cadena vieja ya envenenó.
    if (kind === "subscription" && (line.loanId || line.lentId || line.cardId)) return;
    if (kind === "subscription" && !has("subs.cuota")) return;
    commit((s) => patchLine(s, line.id, { kind }), line.concept || kind);
  }

  function deskWork(line: Line) {
    if (deskLine !== line.id) return null;
    const flexible = line.kind === "expense-fixed" || line.kind === "subscription";
    const linked = !!(line.loanId || line.lentId || line.cardId);
    const toSubs = !linked && has("subs.cuota");
    // El conmutador solo nace si ofrece una conversión real: hacia Cuotas
    // cuando la puerta y el vínculo lo permiten, o la vuelta a Fijos de una
    // línea que ya es cuota. Un botón que no hace nada es peor que ninguno.
    const showKind = flexible && (line.kind === "subscription" || toSubs);
    return (
      <div className="desk-edit">
        {showKind ? (
          <div className="desk-kind" role="group">
            <button type="button" aria-pressed={line.kind === "expense-fixed"} onClick={() => rekind(line, "expense-fixed")}>{t("group.fixed")}</button>
            {toSubs ? <button type="button" aria-pressed={line.kind === "subscription"} onClick={() => rekind(line, "subscription")}>{t("tab.subs")}</button> : null}
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
    commit((s) => patchLine(s, line.id, { categoryId, subId: dest === "rest" ? "" : dest }), line.concept || names.sub(dest));
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
    // El encuentro de §5.2 se decide ANTES del commit: fondos sin declarar con dinero, y
    // ninguna cuenta con dinero todavía — esta es la primera cuenta con dinero que entra.
    const pendingBefore = pendingFunds.filter((f) => f.minor > 0);
    const firstMoney = hostAccts.every((a) => a.minor <= 0);
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
    if (minor > 0 && firstMoney && pendingBefore.length) meetFixedModes(subId, pendingBefore, minor);
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
  /** Delete from the edit state: a line with money history is archived (history kept), else removed. */
  function dropPocket(line: (typeof lines)[number], label: string) {
    setRenameId(null);
    const kept = line.history.length > 0 || (line.balanceMinor ?? 0) !== 0 || line.amountMinor !== 0;
    confirm({
      title: t("delete"),
      body: kept
        ? (lang === "en" ? `${label}. It leaves the list; its history stays saved.` : `${label}. Sale de la lista; su historial queda guardado.`)
        : `${label}. ${t("delete.warn")}`,
      danger: true,
      yes: t("yes"),
      run: () => commit((s) => dropPocketLine(s, key, line.id).state, label),
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
      run: () => commit((s) => patchLine(s, line.id, { concept: next }), next),
    });
  }

  function setOpening(row: { id: string; name: string; categoryId: string }) {
    const minor = parseAmount(accountAmt);
    if (minor === null) return;
    // El encuentro de §5.2 también se da con cuentas ya existentes: una cuenta que no
    // tenía dinero recibe su primer saldo mientras hay fondos sin declarar con dinero.
    const pendingBefore = pendingFunds.filter((f) => f.minor > 0);
    const wasEmpty = (stock.series.get(row.id)?.minor ?? 0) <= 0;
    const today = todayIso();
    const existing = lines.find((line) => line.subId === row.id);
    // Ola 14 (G14-6): la cuenta existente se parchea contra lo VIVO dentro
    // del commit — el saldo y el startedOn se leen de la línea que el
    // estado trae, no de la foto del render; la cuenta nueva nace fresca.
    if (existing) {
      commit((s) => patchLineWith(s, existing.id, (live) => ({ concept: row.name, amountMinor: minor, balanceMinor: minor, currency: rate.display, balanceCurrency: rate.display, startedOn: live.startedOn || today })), row.name);
    } else {
      const line = freshLine(row.name, minor, row.id, row.categoryId, { balanceMinor: minor, icon: "vault", seriesId: row.id, startedOn: today });
      commit((s) => upsertLine(s, line), row.name);
    }
    setAccountAmt("");
    setAccountSign(null);
    setAccountFocus(null);
    if (minor > 0 && wasEmpty && pendingBefore.length) meetFixedModes(row.id, pendingBefore, minor - (stock.pledgedByHost.get(row.id) ?? 0));
  }

  function adjustAccount(row: { id: string; name: string; categoryId: string }, sign: 1 | -1) {
    const delta = parseAmount(accountAmt);
    if (delta === null) return;
    const existing = lines.find((line) => line.subId === row.id);
    const today = todayIso();
    // Ola 14 (G14-6): el ajuste se calcula DESDE la línea viva dentro del
    // commit — la base, el siguiente saldo y el historial anexado leen el
    // estado que el commit trae; antes nacían de la foto del render y su
    // upsertLine la escribía entera.
    if (existing) {
      commit((s) => patchLineWith(s, existing.id, (live) => {
        const base = convertMinor(live.balanceMinor ?? live.amountMinor, live.balanceMinor != null ? live.balanceCurrency : live.currency, rate.display, rate.rateE4);
        const next = Math.max(0, base + sign * Math.abs(delta));
        return {
          concept: row.name,
          amountMinor: next,
          balanceMinor: next,
          currency: rate.display,
          balanceCurrency: rate.display,
          startedOn: live.startedOn || today,
          history: [...live.history, { id: uid(), date: today, amountMinor: sign * Math.abs(delta), currency: rate.display, note: sign > 0 ? "deposito" : "retiro" }],
        };
      }), row.name);
    } else {
      const base = 0;
      const next = Math.max(0, base + sign * Math.abs(delta));
      const line = freshLine(row.name, next, row.id, row.categoryId, { balanceMinor: next, icon: "vault", seriesId: row.id, startedOn: today });
      commit((s) => upsertLine(s, line), row.name);
    }
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
        const months = dropSubLines(s.months, row.id);
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
    // La pregunta de §5.1 manda al nacer: en modo «preguntar», sin respuesta no se guarda.
    const stamp = stampFor(mode, pocketNature, pocketHost, hostAccts);
    if (!stamp.ready) return;
    commit((s) => upsertLine(s, freshLine(name, minor, openSeg.id === "rest" ? "" : openSeg.id, openSeg.categoryId, { icon: pocketGlyph, color: pocketColor, ...(stamp.fund ? { fund: stamp.fund } : {}), ...(stamp.fundHost ? { fundHost: stamp.fundHost } : {}) })), name);
    setPocketName("");
    setPocketAmt("");
    setAdding(false);
  }

  function paintLine(line: Line, patch: Partial<Line>) {
    commit((s) => patchLine(s, line.id, patch), line.concept || "look");
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
    // Ola 14 (G14-6): la línea de retiro existente se parchea contra lo
    // VIVO — el arranque y los fallbacks (startedOn, cadencia,
    // recurrencia, saldo) leen la línea del estado, no la foto; la que
    // no existe nace fresca con el arranque del formulario.
    if (line) {
      commit((s) => patchLineWith(s, line.id, (live) => {
        const st = (retireOpen === live.id ? retireDate : "") || live.startedOn || retireDate || "";
        return {
          startedOn: st || live.startedOn,
          cadence: st ? "monthly" : live.cadence,
          recurring: st ? true : live.recurring,
          balanceMinor: nowMinor === null ? live.balanceMinor : nowMinor,
          balanceCurrency: rate.display,
        };
      }), openSeg.name);
    } else {
      const next: Line = freshLine(openSeg.name, 0, openSeg.id, openSeg.categoryId, {
        startedOn: start,
        cadence: start ? "monthly" : "",
        recurring: !!start,
        balanceMinor: nowMinor,
        balanceCurrency: rate.display,
      });
      commit((s) => upsertLine(s, next), openSeg.name);
    }
    setRetireNow("");
  }

  /** "Leer estado": the statement's account value becomes the Retiro balance; its movements go in the line's history,
   *  tagged "estado:YYYY-MM:<field>" (how account deposits are kept), so a month imported again replaces itself. */
  function stmtSeen(month: string) {
    return openLines.some((line) => line.history.some((h) => h.note.startsWith(`estado:${month}:`)));
  }
  function applyStatement(r: StmtSave) {
    if (!openSeg) return;
    const date = r.end || todayIso();
    const tag = `estado:${r.month || date.slice(0, 7)}:`;
    const base = retireLine ?? freshLine(openSeg.name, 0, openSeg.id, openSeg.categoryId, { balanceMinor: null, balanceCurrency: r.currency, icon: "brand:primerica" });
    const buildHistory = (from: Line["history"]): Line["history"] => {
      const history = from.filter((h) => !h.note.startsWith(tag));
      const put = (k: string, minor: number | null, sign: 1 | -1) => {
        if (minor == null) return;
        history.push({ id: uid(), date, amountMinor: sign * minor, currency: r.currency, note: `${tag}${k}` });
      };
      put("valor", r.value, 1);
      put("aporte", r.contrib, 1);
      put("cambio", r.change, 1);
      put("retiro", r.withdraw, -1);
      put("cargo", r.fees, -1);
      return history;
    };
    // Ola 14 (G14-6): si la línea de retiro ya vive, su historial nuevo se
    // compone desde el historial VIVO dentro del commit (el mes importado
    // se reemplaza a sí mismo sobre lo que el estado trae, no sobre la
    // foto); si no vive, nace fresca con el historial del estado traído.
    if (retireLine) {
      commit((s) => patchLineWith(s, base.id, (live) => ({
        history: buildHistory(live.history),
        ...(r.value != null ? { balanceMinor: r.value, balanceCurrency: r.currency } : {}),
      })), openSeg.name);
    } else {
      const next: Line = { ...base, history: buildHistory(base.history), ...(r.value != null ? { balanceMinor: r.value, balanceCurrency: r.currency } : {}) };
      commit((s) => upsertLine(s, next), openSeg.name);
    }
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
    const fromFlow = quickClosedByLens.current || (cobros && cobrosLit);
    quickClosedByLens.current = false;
    setCobrosLit(false);
    // Leaving a corner flow by tapping a card lights that card; otherwise a second tap on the lit card lets go.
    setLens((cur) => (cur === id && !fromFlow ? "all" : id));
  }

  function gestureOf(slot: string) {
    const raw = session?.ledger.settings.gestures?.[slot];
    if (!raw) return null;
    const [kind, categoryId = ""] = raw.split(":");
    // F-4 (etapa 3.1): la elección guardada se resuelve contra el modo AL
    // DISPARAR — un gesto a un destino que el modo no tiene no hace nada, y
    // el valor guardado nunca se borra: vuelve solo al subir de modo.
    if (kind === "subscription" && !has("books.subs")) return null;
    if (kind === "purchase" && !has("books.shops")) return null;
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

  // 1.3.283: the Pagos corner button joins the gesture system (Atajos de Central). Its destinations are not
  // QuickAdd areas but landings inside Cobros — the same seats the «Ir allí» jumps use.
  type DueDest = "owed" | "owe" | "dues" | "loans";
  function dueGestureOf(slot: string): DueDest | null {
    const raw = session?.ledger.settings.gestures?.[slot];
    if (!has("central.cobros-panel")) return null;
    return raw === "owed" || raw === "owe" || raw === "dues" || raw === "loans" ? raw : null;
  }
  function openCobrosAt(dest: DueDest) {
    if (cobros) {
      // Already open: Cobros' and DeboSide's own faro-open listeners pick the side (and the tab, except
      // «Debo», which names the side itself and leaves its tab standing).
      setCobrosLit(true);
      setCobrosPing((n) => n + 1);
      const id = dest === "owed" ? "cobros-in" : dest === "loans" ? "cobros-loans" : dest === "dues" ? "cobros-out" : "cobros-debo-tabs";
      window.dispatchEvent(new CustomEvent("faro-open", { detail: id }));
      return;
    }
    if (dest === "loans") { try { localStorage.setItem("faro-debo-tab", "loans"); } catch { /* ignore */ } }
    else { try { localStorage.removeItem("faro-debo-tab"); } catch { /* ignore */ } }
    setCobrosSide(dest === "owed" ? "in" : "out");
    setCobrosJump(false);
    if (quick) {
      setJump(null);
      setQuick(null);
      setCobrosWait(true);
    }
    setCobros(true);
    setCobrosLit(true);
    setCobrosPing((n) => n + 1);
  }
  // The Pagos button's plain tap, exactly as it behaved before the gestures arrived (extracted verbatim).
  function cobroTap() {
    setCobrosJump(false);
    setCobrosSide("out");
    try { localStorage.removeItem("faro-debo-tab"); } catch { /* ignore */ }
    if (quick) {
      setJump(null);
      setQuick(null);
      setCobrosWait(true);
      setCobros(true);
      setCobrosLit(true);
      setCobrosPing((n) => n + 1);
      return;
    }
    if (cobros && !cobrosLit) {
      // 1.3.106: open behind a picked card: the button takes the focus back (and calls the panel back) instead of closing it.
      setCobrosLit(true);
      setCobrosPing((n) => n + 1);
      return;
    }
    if (cobros) {
      // Open but scrolled away: bring it back with the same pulse instead of closing what you cannot see.
      const r = document.querySelector('[data-anchor="cobros"]')?.getBoundingClientRect();
      const seen = r && r.bottom > 60 && r.top < window.innerHeight - 60;
      if (!seen) { setCobrosPing((n) => n + 1); return; }
      setCobros(false);
      return;
    }
    setCobros(true);
    setCobrosLit(true);
    setCobrosPing((n) => n + 1);
  }
  // The same timing as corner() (1 s hold, 170 ms double window, the tap waits out the double window only
  // when a double shortcut exists); what a gesture fires is a Cobros landing instead of a QuickAdd jump.
  function cornerDue() {
    const clearHold = () => {
      if (holdTimer.current.due) window.clearTimeout(holdTimer.current.due);
      holdTimer.current.due = undefined;
    };
    return {
      onPointerDown: () => {
        heldFlag.current.due = false;
        clearHold();
        holdTimer.current.due = window.setTimeout(() => {
          heldFlag.current.due = true;
          const hit = dueGestureOf("due.hold");
          if (!hit) return;
          openCobrosAt(hit);
        }, 1000);
      },
      onPointerUp: clearHold,
      onPointerLeave: clearHold,
      onPointerCancel: clearHold,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
      onClick: () => {
        if (heldFlag.current.due) {
          heldFlag.current.due = false;
          return;
        }
        if (openTimer.current.due) {
          window.clearTimeout(openTimer.current.due);
          openTimer.current.due = undefined;
        }
        const now = Date.now();
        const doubled = now - (clickTimer.current.due ?? 0) < 170;
        clickTimer.current.due = now;
        if (doubled) {
          const hit = dueGestureOf("due.double");
          if (hit) {
            openCobrosAt(hit);
            return;
          }
        }
        if (!dueGestureOf("due.double")) {
          cobroTap();
          return;
        }
        openTimer.current.due = window.setTimeout(() => {
          openTimer.current.due = undefined;
          cobroTap();
        }, 170);
      },
    };
  }

  const vaultStore = focus === "meta" || focus === "retiro" || focus === "emergencia" ? focus : focus === "save" ? "save" : pocketKind;
  const vaultTone0 = vaultStore === "meta" ? "#8fb9a6" : vaultStore === "retiro" ? "#72b4b2" : vaultStore === "emergencia" ? "#7aa2c4" : vaultStore === "save" ? SAVINGS_PURPLE : "#d5e2ea";
  const vaultTone = isTron() ? tronize(vaultTone0) : vaultTone0;
  // Oleada 3 (§4.2): la palanca de la ventana Ahorros proyecta lo guardado que es pila
  // — cuentas + fondos aparte DECLARADOS (el Retiro conserva su palanca en su ventana);
  // para un libro sin declaraciones su base es la de siempre (solo cuentas), así que
  // ninguna cifra se mueve el día del aterrizaje. En la ventana de una bolsa, la base
  // es el stock entero de la bolsa.
  const vaultBase = focus === "save" ? accountTotal + stock.byClass.aparte : (openSeg?.minor ?? 0);
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

  // 1.3.106: one active thing among the three cards and their corner buttons. An open corner flow wins; else the picked card
  // (with its own button). Everything else goes low-profile (cards via aria-pressed=false, buttons via .is-low).
  const btnOn: null | "plus" | "minus" | "cobro" = quick === "in" ? "plus" : quick === "out" ? "minus" : cobros && cobrosLit ? "cobro" : null;
  const cardOn = btnOn ? null : lensMode === "all" ? null : lensMode;
  const lowCorner = (btn: "plus" | "minus" | "cobro", card: "have" | "spend" | "debt") => (btnOn ? btnOn !== btn : cardOn ? cardOn !== card : false);
  // 1.3.148: the first-run offer says only what is true — "bring recurring" needs an earlier month with
  // lines. 1.3.256: the desk no longer offers the sample data — its only door is the Ajustes toggle.
  const monthKeysWithLines = session ? Object.keys(session.ledger.months).filter((k) => (session.ledger.months[k]?.lines.length ?? 0) > 0) : [];
  const hasEarlierLines = monthKeysWithLines.some((k) => k < key);
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
      {todayFig ? (
        <div className="desk-today" data-anchor="desk-hoy">
          <SourceNote
            label={t("desk.savings.from")}
            title={t("desk.today.title")}
            meaning={todayFig.what}
            formula={todayFig.formula}
            implication={todayFig.note}
          >
            <span className="desk-today-in">
              <em className="bar-head">{t("desk.today.title")}</em>
              <strong className={`num${todayFig.fig.perDayMinor < 0 ? " bad" : ""}`}>{fmt(todayFig.fig.perDayMinor)}</strong>
            </span>
          </SourceNote>
        </div>
      ) : null}
      <div className="lenses" data-focus={btnOn ?? cardOn ?? undefined}>
        <div className="lens-wrap">
          <Hint topic="tengo" className="is-lens" group="lens" avoid=".lens-wrap .lens-kicker > span:last-child" />
          <button type="button" data-anchor="lens-have" className={`lens is-have${lens === "have" ? " is-picked" : ""}`} data-lens="have" aria-pressed={cardOn === "have"} onClick={() => focusLens("have")}>
            <span className="lens-kicker"><span className="lens-mark"><ArrowDownLeft className="size-3" /></span><span>{t("desk.have")}</span></span>
            <span className="lens-value num">{fmt(summary.income)}</span>
            <span className="lens-note">{t("desk.have.note")}</span>
          </button>
          <button type="button" data-anchor="desk-plus" className={`lens-corner is-plus${lowCorner("plus", "have") ? " is-low" : ""}`} aria-label={t("desk.addIn")} aria-pressed={quick === "in"} {...corner("in")}>
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="lens-wrap">
          <Hint topic="gastare" className="is-lens" group="lens" avoid=".lens-wrap .lens-kicker > span:last-child" />
          <button type="button" data-anchor="lens-spend" className={`lens is-spend${lens === "spend" ? " is-picked" : ""}`} data-lens="spend" aria-pressed={cardOn === "spend"} onClick={() => focusLens("spend")}>
            <span className="lens-kicker"><span className="lens-mark"><ArrowUpRight className="size-3" /></span><span>{t("desk.spend")}</span></span>
            <span className="lens-value num">−{fmt(summary.expense)}</span>
            {/* Ola 12 (BR12-5a): la cifra del lente es TODO lo que sale (su
                tema «gastare» la define así y su lista focal lo confirma);
                lo que la ley exige es que la MISMA pantalla nombre su
                composición — cuando hay apartado, la nota lo dice con su
                monto, para que nadie lea «gastado» lo que está guardado. */}
            <span className="lens-note">{summary.savingsFlow > 0 ? t("desk.spend.note.saved").replace("{x}", fmt(summary.savingsFlow)) : t("desk.spend.note")}</span>
          </button>
          <button type="button" data-anchor="desk-minus" className={`lens-corner is-minus${lowCorner("minus", "spend") ? " is-low" : ""}`} aria-label={t("desk.addOut")} aria-pressed={quick === "out"} {...corner("out")}>
            <span aria-hidden>−</span>
          </button>
        </div>
        {has("central.lens-pagos") ? (
        <div className="lens-wrap">
          <Hint topic="pagos" className="is-lens" group="lens" avoid=".lens-wrap .lens-kicker > span:last-child" />
          <button type="button" data-anchor="lens-debt" className={`lens is-debt tone-${summary.tone}${lens === "debt" ? " is-picked" : ""}`} data-lens="debt" aria-pressed={cardOn === "debt"} onClick={() => focusLens("debt")}>
            <span className="lens-kicker"><span className="lens-mark"><CreditCard className="size-3" /></span><span>{t("desk.debt")}</span></span>
            <span className="lens-value num">{fmt(summary.debt)}</span>
            <span className="lens-note">{t("desk.debt.note")}</span>
          </button>
          <button type="button" data-anchor="desk-cobro" className={`lens-corner is-cobro${lowCorner("cobro", "debt") ? " is-low" : ""}`} aria-label={t("cobro.open")} aria-pressed={btnOn === "cobro"} {...cornerDue()}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <circle cx="5.6" cy="4.7" r="1.85" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2.5 12.5c.5-2.2 1.7-3.2 3.1-3.2s2.6 1 3.1 3.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="6.5" r="2.15" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 5.55v1.9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        ) : null}
      </div>
      {quick ? (
        <div ref={quickRef} className="sheet-swap" data-mode={quick} data-anchor="quick-window">
          <QuickAdd key={`${quick}-${jump?.kind ?? ""}-${jump?.categoryId ?? ""}`} mode={quick} jump={jump} onClose={(how) => { if (lens === "all" && how !== "back") setLens(quick === "in" ? "have" : "spend"); setQuick(null); setJump(null); }} />
          {/* 1.3.108: phone Back restores the card that was active before (none stays none); only a finished entry still lights its card. */}
          {/* 1.3.108: the panel says hello in its own colour (teal +, orange −), once per opening; see styles.css "quick-hello". */}
          <QuickHello key={`qh-${quick}`} mode={quick} />
        </div>
      ) : null}
      {cobros ? <Cobros jumped={cobrosJump} startSide={cobrosBack?.side ?? cobrosSide} ping={cobrosJump ? 0 : cobrosPing} wait={cobrosWait} onClose={() => { setCobros(false); setCobrosJump(false); }} /> : null}
      <TrayCard />
      </>
      )}
      <section data-anchor={focus ? undefined : "desk-save"} className={`save-band${focus ? " is-records" : ""}${focus === "save" ? " is-save" : ""}${!focus || focus === "save" ? " sav-scope" : ""}`} style={!focus || focus === "save" ? { ["--sav" as string]: isTron() ? tronize(SAVINGS_PURPLE) : SAVINGS_PURPLE } : undefined} aria-label={t("desk.savings")}>
        {retiroHidden(session.ledger) ? <Note kind="tip">{t("save.retiroHidden")}</Note> : null}
        {focus && has("books.vault-order") ? <button type="button" data-anchor="vault-sort" className={`vault-lamp${vaultSort ? " is-on" : ""}`} aria-pressed={vaultSort} aria-label={t("vault.sort")} onClick={() => setVaultSort((on) => !on)} /> : null}
        {focus === "save" && has("nature.undeclared-encounter") && pendingFunds.length ? (
          <div className="save-migrate" data-anchor="vault-migrate">
            <button type="button" className="save-migrate-head" aria-expanded={migrateOpen} onClick={() => setMigrateOpen((v) => !v)}>
              <FundLight cls="sin-declarar" asSpan />
              <span>{t("fund.mig.line")}</span>
              <ChevronDown className={migrateOpen ? "fold-chev is-open" : "fold-chev"} />
            </button>
            {migrateOpen ? (
              <div className="save-migrate-list">
                {pendingFunds.map((f) => {
                  const pick = migPicks[f.seriesId] ?? { nature: null as FundNature | null, host: "" };
                  const name = seriesName(session.ledger, f.seriesId) || names.sub(f.subId);
                  return (
                    <div key={f.seriesId} className="save-migrate-fund">
                      <span className="save-migrate-name">
                        <FundLight cls="sin-declarar" tone={tintOf(f.subId)} />
                        <span>{name}</span>
                        <strong className="num">{fmt(f.minor)}</strong>
                      </span>
                      <NaturePick
                        mode={mode}
                        value={pick.nature}
                        onPick={(n) => setMigPicks((p) => ({ ...p, [f.seriesId]: { nature: n, host: pick.host } }))}
                        host={pick.host}
                        onHost={(h) => setMigPicks((p) => ({ ...p, [f.seriesId]: { nature: pick.nature, host: h } }))}
                        accounts={namedAccts}
                      />
                      <div className="ah-actions">
                        <button type="button" className="btn" data-anchor="migrate-declare" onClick={() => declareFromMigration(f)}>{t("fund.mig.each")}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        {encounter && has("nature.undeclared-encounter") ? <EncounterDialog accountId={encounter.accountId} pending={encounter.pending} onClose={() => setEncounter(null)} /> : null}
        {focus === "save" && stock.byClass.aparte > 0 && has("vault.kept") ? (
          <div className="save-kept-head" data-anchor="vault-kept">
            <span className="save-kept-total"><span className="lab-head">{t("save.kept")}<Hint topic="ahorros-banda" /></span><strong className="num">{fmt(keptTotal)}</strong></span>
            <span className="save-kept-parts">
              <SourceNote
                label={t("desk.savings.from")}
                title={t("save.accounts")}
                meaning={t("save.kept.cuentas.what")}
                formula={accountRows.map((r) => `${r.name} ${fmt(r.minor)}`).join(" · ")}
                implication={t("save.kept.cuentas.note")}
              >
                <span className="kept-part"><span className="kept-part-name">{t("save.accounts")}</span><strong className="num">{fmt(stock.byClass.cuenta)}</strong></span>
              </SourceNote>
              <SourceNote
                label={t("desk.savings.from")}
                title={t("save.kept.funds")}
                meaning={t("save.kept.aparte.what")}
                formula={[...stock.series.entries()].filter(([, r]) => r.cls === "aparte" || r.cls === "sin-declarar").map(([sid, r]) => `${seriesName(session.ledger, sid) || names.sub(r.subId)} ${fmt(r.minor)}`).join(" · ")}
                implication={t("save.kept.aparte.note")}
              >
                <span className="kept-part"><span className="kept-part-name">{t("save.kept.funds")}</span><strong className="num">{fmt(stock.byClass.aparte + stock.undeclared)}</strong></span>
              </SourceNote>
              <SourceNote
                label={t("desk.savings.from")}
                title={saveSegs.find((s) => s.id.endsWith(".retiro"))?.name ?? t("vault.retiro")}
                meaning={t("save.kept.retiro.what")}
                formula={`${saveSegs.find((s) => s.id.endsWith(".retiro"))?.name ?? t("vault.retiro")} ${fmt(stock.byClass.retiro)}`}
                implication={t("save.kept.retiro.note")}
              >
                <span className="kept-part"><span className="kept-part-name">{saveSegs.find((s) => s.id.endsWith(".retiro"))?.name ?? t("vault.retiro")}</span><strong className="num">{fmt(stock.byClass.retiro)}</strong></span>
              </SourceNote>
            </span>
          </div>
        ) : null}
        {focus === "save" && stock.byClass.aparte > 0 && !has("vault.kept") ? (
          <div className="save-kept-head" data-anchor="vault-kept">
            <span className="save-kept-total"><span className="lab-head">{t("save.kept")}<Hint topic="ahorros-banda" /></span><strong className="num">{fmt(keptTotal)}</strong></span>
          </div>
        ) : null}
        {focus === "save" ? muteRow : null}
        {focus ? null : (
        <>
        {muteRow}
        {has("vault.meta") ? (
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
            {has("vault.kept") ? (
            <SourceNote
              label={t("desk.savings.from")}
              title={t("desk.savings.from")}
              meaning={t("desk.savings.from.total")}
              formula={keptFormula}
              implication={t("desk.savings.from.total.note")}
            >
              <strong className="num">{fmt(keptTotal)}</strong>
            </SourceNote>
            ) : (
            <SourceNote
              label={t("desk.savings.from")}
              title={t("save.kept")}
              meaning={t("save.kept.plain.what")}
              formula={keptFormula}
              implication={t("save.kept.plain.note")}
            >
              <strong className="num">{fmt(keptTotal)}</strong>
            </SourceNote>
            )}
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
        {has("nature.class-saldo") && stock.pledged > 0 ? (
          <div className="save-pledged" data-anchor="desk-pledged">
            <SourceNote
              label={t("desk.savings.from")}
              title={t("desk.savings.from")}
              meaning={t("desk.savings.pledged.what")}
              formula={pledgedFundsList}
              implication={t("desk.savings.pledged.note")}
            >
              <span>{t("desk.savings.pledged").replace("{x}", fmt(stock.pledged))}</span>
            </SourceNote>
          </div>
        ) : null}
        {has("vault.segments") ? (
        <div className="save-track" aria-hidden>
          {keptSegTotal <= 0 ? <i /> : saveSegs.map((s, i) => (
            <i key={s.id} style={{ width: `${(s.keptMinor / keptSegTotal) * 100}%`, background: saveTints[i % saveTints.length] }} />
          ))}
        </div>
        ) : null}
        <div className="save-segs" data-anchor="desk-pockets" style={{ gridTemplateColumns: `repeat(${Math.max(saveSegs.length, 1)}, minmax(0, 1fr))` }}>
          {saveSegs.map((s, i) => {
            const tint = saveTints[i % saveTints.length] ?? "#8fb9a6";
            const on = openSave === s.id;
            const pct = keptTotal > 0 ? Math.round((s.keptMinor / keptTotal) * 100) : 0;
            return (
              <button
                key={s.id}
                type="button"
                className={`save-seg${on ? " is-on" : ""}`}
                data-anchor={i === 0 ? "desk-pocket" : undefined}
                style={{ ["--seg" as string]: tint }}
                aria-pressed={on}
                aria-expanded={openSave === s.id}
                onClick={() => pickSeg(s.id)}
                onDoubleClick={() => { setSaveOn(s.id); setOpenSave(s.id); setEditId(null); setAdding(false); setMoving(null); }}
              >
                {(() => {
                  // Tron keeps its own segmented energy gauge.
                  if (isTron()) return <b aria-hidden><i style={{ height: `${s.keptMinor > 0 ? Math.max(12, (s.keptMinor / keptPeak) * 100) : 8}%`, background: tint, opacity: openSave && !on ? 0.35 : 1 }} /></b>;
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
                <strong data-long={s.name.length > 8 ? "" : undefined}>{s.name}{has("nature.light") && s.lightCls ? <> <FundLight asSpan cls={s.lightCls} tone={tint} hostName={s.saldoHostName} /></> : null}</strong>
                <span className="num">{fmtShort(s.keptMinor)}<span className="seg-pct">{pct}%</span></span>
                {has("nature.class-saldo") && s.pledgedMinor > 0 ? (
                  <span className="save-seg-sub"><FundLight asSpan cls="saldo" tone={tint} hostName={s.saldoHostName} /><span className="ss-amt">{`+ ${fmtShort(s.pledgedMinor)}`}</span><span className="ss-lab">{t("desk.savings.onBalance")}</span></span>
                ) : null}
                {s.id.endsWith(".retiro") && s.inflowMinor > 0 ? (
                  <span className="save-seg-sub"><span className="ss-amt">{`+ ${fmtShort(s.inflowMinor)}`}</span><span className="ss-lab">{t("desk.savings.thisMonth")}</span></span>
                ) : null}
              </button>
            );
          })}
        </div>
        </>) : null}
        </>
        )}
        {openSeg && (focus || has("vault.meta")) ? (
          <div className={focus && focus !== "save" ? "vault-block" : "vault-pass"} style={focus && focus !== "save" ? { order: blockAt("board") } : undefined}>
            {focus && focus !== "save" && vaultSort ? blockArrows("board") : null}
          <div key={focus ? "ledger" : openSeg.id} data-dir={flowDir < 0 ? "-1" : "1"} data-anchor="vault-ledger" className={`save-ledger${!focus && ringFresh() ? " is-ring" : ""}${pocketKind === "retiro" ? " is-retiro" : ""}${focus && focus !== "save" ? " is-manage" : ""}${focus && focus !== "save" && pocketFold ? " is-folded" : ""}`} ref={ledgerRef} style={{ ["--seg" as string]: saveTints[Math.max(0, saveSegs.findIndex((s) => s.id === openSeg.id)) % saveTints.length] }} onClick={() => { if (focus && focus !== "save" && pocketFold) togglePocketFold(); }}>
            <div className={`save-ledger-head${focus && focus !== "save" ? " is-tab" : ""}`} onClick={(event) => { if (!focus || focus === "save") return; event.stopPropagation(); togglePocketFold(); }}>
              <strong className="lab-head">{openSeg.name}<Hint topic={pocketKind === "retiro" ? "retiro" : pocketKind === "emergencia" ? "emergencia" : "meta"} /></strong>
              <span className="row">
                {has("vault.kept") ? <span className="num">{fmt(openSeg.minor)}</span> : (
                  <span onClick={(e) => e.stopPropagation()}>
                    <SourceNote label={t("desk.savings.from")} title={openSeg.name} meaning={t("save.pocket.plain")} formula={`${openSeg.name} ${fmt(openSeg.minor)}`} implication={t("save.kept.plain.note")}>
                      <span className="num">{fmt(openSeg.minor)}</span>
                    </SourceNote>
                  </span>
                )}
                <Hint topic="cifra-corta" />
                {focus && focus !== "save" ? (
                  <>
                    {!pocketFold ? (
                      <button type="button" className="icon-btn" aria-label={t("add")} onClick={(event) => { event.stopPropagation(); setAddFromView(false); setAdding((v) => !v); setEditId(null); setMoving(null); }}>
                        <Plus className="size-4" />
                      </button>
                    ) : null}
                    <button type="button" className={`icon-btn ledger-fold${pocketFold ? "" : " is-open"}`} aria-label={t("study.fold")} aria-expanded={!pocketFold} onClick={(event) => { event.stopPropagation(); togglePocketFold(); }}>
                      <ChevronDown className="size-4" />
                    </button>
                  </>
                ) : (
                  <button type="button" className="icon-btn" data-anchor="pocket-add" aria-label={t("add")} onClick={() => { setAddFromView(false); setAdding((v) => !v); setEditId(null); setMoving(null); }}>
                    <Plus className="size-4" />
                  </button>
                )}
              </span>
            </div>
            {has("nature.class-aparte") && (focus === "meta" || focus === "emergencia") && (stock.keptByPocket.get(openSeg.id) ?? 0) > 0 ? (
              <p className="save-part-line">
                <SourceNote
                  label={t("desk.savings.from")}
                  title={t("save.kept.funds")}
                  meaning={t("save.kept.aparte.what")}
                  formula={[...stock.series.entries()].filter(([, r]) => r.subId === openSeg.id && r.cls === "aparte").map(([sid, r]) => `${seriesName(session.ledger, sid) || names.sub(r.subId)} ${fmt(r.minor)}`).join(" · ")}
                  implication={t("save.kept.aparte.note")}
                >
                  <span>{t("save.part.of").replace("{pocket}", openSeg.name).replace("{x}", fmt(stock.keptByPocket.get(openSeg.id) ?? 0))}</span>
                </SourceNote>
              </p>
            ) : null}
            {focus && focus !== "save" && !pocketFold ? (
              <button type="button" className="fold-pin vault-corner-pin" aria-label={t("study.pin")} aria-pressed={pocketPin} onClick={(event) => { event.stopPropagation(); togglePocketPin(); }}><Pin /></button>
            ) : null}
            {focus && focus !== "save" && pocketFold ? null : (
            <>
            {addFromView ? null : pocketAdd}
            {/* Ola 6 (CARA-10): el escaneo del estado de Retiro es asiento de
                Completo (scan.retirement-stmt) y se pintaba en Ritmo sin
                puerta, despierto, con su (?) enseñándolo. La puerta cubre la
                montura entera: su cola es el botón de restaurar la cuenta de
                fábrica, cuyo asiento (vault.factory-restore) también es
                Completo — dejarlo pintado por la puerta de atrás sería la
                misma enfermedad con otro nombre. */}
            {pocketKind === "retiro" && has("scan.retirement-stmt") ? <StmtScan seen={stmtSeen} onSave={applyStatement} tail={
              <button type="button" className="sub-gear stm-restore" data-test="retiro-restore" aria-label={t("save.restore.label")} onClick={() => confirm({
                title: t("save.restore.title"),
                body: t("save.restore.body"),
                yes: t("save.restore.yes"), run: () => commit((s) => restoreRetiro(s, key), "Primerica") })}><RotateCcw /></button>
            } /> : null}
            {openLines.length === 0 && !adding && pocketKind !== "retiro" ? <Note>{t("save.empty")}</Note> : null}
            {openLines.map((line) => {
              const label = line.concept || names.sub(line.subId) || openSeg.name;
              const minor = convertMinor(line.balanceMinor != null ? line.balanceMinor : line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, rate.display, rate.rateE4);
              return (
                  <div key={line.id} className={`save-account pocket-row${line.active ? "" : " is-muted"}`}>
                    <span className="bank-tools">
                      {has("vault.move-line") ? (
                      <button type="button" className="bank-grip" data-anchor="vault-grip" aria-label={t("save.move")} aria-pressed={moving === line.id} onClick={() => { setMoving(moving === line.id ? null : line.id); setEditId(null); setAdding(false); }}>
                        <GripVertical />
                      </button>
                      ) : null}
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
                        ) : null}
                        {renameId === line.id ? (
                          <button type="button" className="bank-edit-drop" data-test="pocket-drop" aria-label={t("delete")} onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} onClick={() => dropPocket(line, label)}>
                            <Trash2 />
                          </button>
                        ) : (
                          <span className="bank-name">
                            <button type="button" className="look-mark" data-look-toggle aria-label={t("look.title")} aria-pressed={lookId === line.id} style={{ background: washForInk(chosenTone(line.color, line.categoryId) || baseFor(session.ledger.structure, line.categoryId)), color: "#14110e" }} onClick={(event) => { event.stopPropagation(); setLookId(lookId === line.id ? null : line.id); }}>
                              {line.icon?.startsWith("brand:") ? <BrandMark id={line.icon.slice(6)} className="size-4" /> : <Glyph name={line.icon && line.icon !== "Circle" ? line.icon : "Flag"} className="size-4" />}
                            </button>
                            <span>{label}</span>
                            {fundLightFor(line)}
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
                        <p className="fund-note">{t("fund.retiro.note")}</p>
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
                <p className="fund-note">{t("fund.retiro.note")}</p>
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
        {focus && has("vault.span-cut") ? (
          <div className="vault-block" style={{ order: blockAt("span") }}>
            {vaultSort ? blockArrows("span") : null}
            {spanNode}
          </div>
        ) : null}
        {has("vault.lever") && leverNode ? (
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
              <span className="row kit-row">
                <span className="num">{fmt(openSeg.minor)}</span>
                {savKit(openLines, openSeg.name, pocketKind === "retiro" ? restoreRetiroAsk : undefined)}
                <button type="button" className="icon-btn kit-btn is-add" data-test="sav-add" data-anchor="pocket-add" aria-label={t("add")} aria-pressed={adding} onClick={() => { setAddFromView(true); setAdding((v) => !(v && addFromView)); setEditId(null); setMoving(null); }}><Plus /></button>
              </span>
            </div>
            {addFromView && adding ? <div className="kit-add">{pocketAdd}</div> : null}
            {openLines.length === 0 ? <p className="save-flow-read">{t("vault.viewNone")}</p> : openLines.map((line) => {
              const minor = convertMinor(line.balanceMinor != null ? line.balanceMinor : line.amountMinor, line.balanceMinor != null ? line.balanceCurrency : line.currency, rate.display, rate.rateE4);
              return (
                <div key={line.id} className={`save-view-row is-tap${ui.editing === line.id ? " is-open" : ""}`}>
                  <span className="save-view-name" {...savTap(line)}>
                    {line.icon?.startsWith("brand:") ? <BrandMark id={line.icon.slice(6)} className="size-5" /> : line.icon ? <Glyph name={line.icon} className="size-4" /> : null}
                    <span>{line.concept || names.sub(line.subId) || openSeg.name}</span>
                    {fundLightFor(line)}
                    <strong className="num">{fmt(minor)}</strong>
                  </span>
                  <i aria-hidden><b style={{ width: `${openSeg.minor > 0 ? Math.max(8, Math.round((minor / openSeg.minor) * 100)) : 0}%` }} /></i>
                  {savEdit(line)}
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
        {accountsOpen || !focus ? (
          <div className={focus === "save" ? "vault-block" : "vault-pass"} style={focus === "save" ? { order: blockAt("accounts") } : undefined}>
            {focus === "save" && vaultSort ? blockArrows("accounts") : null}
          <div data-anchor="vault-accounts" className={`save-more${focus === "save" && banksFold ? " is-folded" : ""}`} onClick={() => { if (focus === "save" && banksFold) toggleBanksFold(); }}>
            <div className={`save-ledger-head${focus === "save" ? " is-tab" : ""}`} onClick={(event) => { if (focus === "save") { event.stopPropagation(); toggleBanksFold(); } else if (!focus) setAccountsOpen((v) => !v); }}>
              <strong className="lab-head">{focusedAccount ? focusedAccount.name : !focus ? t("save.accounts.band") : t("save.accounts.all")}<Hint topic="cuentas" /></strong>
              <span className="row">
                {!focus ? (
                  <span onClick={(e) => e.stopPropagation()}>
                    <SourceNote label={t("desk.savings.from")} title={t("save.accounts")} meaning={t("save.kept.cuentas.what")} formula={focusedAccount ? `${focusedAccount.name} ${fmt(focusedAccount.minor)}` : accountRows.map((r) => `${r.name} ${fmt(r.minor)}`).join(" · ")} implication={t("save.kept.cuentas.note")}>
                      <span className="num">{fmt(focusedAccount ? focusedAccount.minor : accountTotal)}</span>
                    </SourceNote>
                  </span>
                ) : <span className="num">{fmt(focusedAccount ? focusedAccount.minor : accountTotal)}</span>}
                {focus === "save" ? (
                  <button type="button" className={`icon-btn ledger-fold${banksFold ? "" : " is-open"}`} aria-label={t("study.fold")} aria-expanded={!banksFold} onClick={(event) => { event.stopPropagation(); toggleBanksFold(); }}>
                    <ChevronDown className="size-4" />
                  </button>
                ) : (
                  <button type="button" className="fold-pin" aria-label={t("study.pin")} aria-pressed={accountsPin} onClick={(event) => { event.stopPropagation(); toggleAccountsPin(); }}><Pin /></button>
                )}
              </span>
            </div>
            {focus === "save" && !banksFold ? (
              <button type="button" className="fold-pin vault-corner-pin" aria-label={t("study.pin")} aria-pressed={banksPin} onClick={toggleBanksPin}><Pin /></button>
            ) : null}
            {focus === "save" && banksFold ? null : !focus && !accountsOpen ? null : (
            <>
            {/* 1.3.330 (Oscar, 2026-11-19): la línea del panel que resumía lo
                comprometido y lo libre MUERE — con una sola cuenta repetía,
                palabra por palabra, las cifras de su tarjeta. La verdad vive
                una sola vez, en cada tarjeta; la frase sobrevive solo como la
                explicación al tocar las cifras de la tarjeta (sus .what/.note). */}
            <div className="save-accounts">
              {bankRows.map((row) => (
                <div key={row.id} data-bank={row.id} className={`save-account${accountFocus === row.id ? " is-on" : ""}${bankRank?.[0] && bankDrag.current === row.id ? " is-drag" : ""}`}>
                  <span className="bank-tools">
                    {has("accounts.reorder") ? (
                    <button type="button" className="bank-grip" aria-label={t("save.move")} onPointerDown={(event) => startBankDrag(row.id, event)} onPointerMove={moveBankDrag} onPointerUp={endBankDrag} onPointerCancel={endBankDrag}>
                      <GripVertical />
                    </button>
                    ) : null}
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
                      ) : null}
                      {renameId === row.id ? (
                        <button type="button" className="bank-edit-drop" aria-label={t("delete")} onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} onClick={() => { setRenameId(null); dropAccount(row); }}>
                          <Trash2 />
                        </button>
                      ) : (
                        <span className="bank-name">
                          {has("vault.look") ? (
                          <button type="button" className="look-mark" data-look-toggle aria-label={t("look.title")} aria-pressed={lookId === row.id} onClick={(event) => { event.stopPropagation(); setLookId(lookId === row.id ? null : row.id); }}>
                            {vaultGlyph(row.icon) ? <Glyph name={vaultGlyph(row.icon)!} className="size-4" /> : row.icon.startsWith("vault:data:") ? <img src={row.icon.slice(6)} alt="" className="bank-photo" /> : row.icon.startsWith("vault:") || row.icon.startsWith("brand:") ? <BrandMark id={row.icon.slice(row.icon.indexOf(":") + 1)} className="size-4" /> : <Glyph name={row.icon === "vault" ? "Landmark" : row.icon} className="size-4" />}
                          </button>
                          ) : (
                          <span className="look-mark is-still">
                            {vaultGlyph(row.icon) ? <Glyph name={vaultGlyph(row.icon)!} className="size-4" /> : row.icon.startsWith("vault:data:") ? <img src={row.icon.slice(6)} alt="" className="bank-photo" /> : row.icon.startsWith("vault:") || row.icon.startsWith("brand:") ? <BrandMark id={row.icon.slice(row.icon.indexOf(":") + 1)} className="size-4" /> : <Glyph name={row.icon === "vault" ? "Landmark" : row.icon} className="size-4" />}
                          </span>
                          )}
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
                      {renameId === row.id || !has("vault.rename") ? null : (
                        <button type="button" className="bank-pencil" aria-label={t("edit")} onClick={() => { setRenameId(row.id); setRenameValue(row.name); }}>
                          <Pencil />
                        </button>
                      )}
                    </span>
                    <button type="button" className="bank-sum num" data-anchor="vault-figure" onClick={() => {
                      setAccountFocus((cur) => {
                        if (cur === row.id) return null;
                        setAccountAmt("");
                        setAccountSign(null);
                        return row.id;
                      });
                    }}>{fmt(row.minor)}</button>
                  </div>
                  {has("nature.class-saldo") && (stock.pledgedByHost.get(row.id) ?? 0) > 0 ? (
                    <div className="save-acct-stats">
                      <SourceNote
                        label={t("desk.savings.from")}
                        title={t("save.free")}
                        meaning={t("save.panel.pledged.what")}
                        formula={`${row.name} ${fmt(stock.pledgedByHost.get(row.id) ?? 0)}`}
                        implication={t("save.panel.pledged.note")}
                      >
                        <span className="acct-meter" aria-hidden="true"><i style={{ width: `${row.minor > 0 ? Math.max(0, Math.min(100, ((stock.pledgedByHost.get(row.id) ?? 0) / row.minor) * 100)) : 0}%` }} /></span>
                        <span className="acct-figs">
                          <span className="acct-pair">
                            <i className="acct-ring" aria-hidden="true" />
                            <span className="acct-stat-lab">{t("save.acct.namedLab")}</span>
                            <strong className="num">{fmt(stock.pledgedByHost.get(row.id) ?? 0)}</strong>
                          </span>
                          <span className="acct-pair">
                            <i className="acct-ring is-ghost" aria-hidden="true" />
                            <span className="acct-stat-lab">{t("save.free")}</span>
                            <strong className="num">{fmt(row.minor - (stock.pledgedByHost.get(row.id) ?? 0))}</strong>
                          </span>
                        </span>
                      </SourceNote>
                    </div>
                  ) : null}
                  {accountFocus === row.id ? (
                    row.minor > 0 || lines.some((line) => line.subId === row.id && line.startedOn) || !has("accounts.opening") ? (
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
                            <input className="field num" data-anchor="acct-open-amt" inputMode="decimal" autoFocus value={accountAmt} placeholder="0.00" onChange={(e) => setAccountAmt(e.target.value)} />
                          </label>
                        </div>
                        <div className="ah-actions">
                          <button type="button" className="btn secondary" onClick={() => { setAccountFocus(null); setAccountAmt(""); }}>{t("cancel")}</button>
                          <button type="button" className="btn" data-anchor="acct-open-save" onClick={() => setOpening(row)}>{t("save.keep")}</button>
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
            {has("accounts.add") ? (
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
            ) : null}
            </>
            )}
          </div>
          </div>
        ) : null}
        {focus === "save" && has("vault.monthly-setaside") ? (
          <div className="vault-block" style={{ order: blockAt("flow") }}>
            {vaultSort ? blockArrows("flow") : null}
          <div className="save-flow" style={{ ["--save" as string]: colorFor(session.ledger.structure, savingsCats[0]?.id ?? "f-ahorro") }}>
            <div className="save-ledger-head" data-anchor="desk-aside">
              <strong className="lab-head">{t("vault.aside")}<Hint topic="apartado-mes" /></strong>
              <span className="num">{fmt(aside)}</span>
            </div>
            <div className={focus === "save" ? "kit-meter-row" : undefined}>
            <div className="save-flow-meter" aria-hidden>
              <i style={{ width: `${summary.savingsGoal > 0 ? Math.min(100, Math.round((aside / summary.savingsGoal) * 100)) : aside > 0 ? 100 : 0}%` }} />
            </div>
            {focus === "save" ? (
              <span className="row kit-row">
                {savKit(fixedSave, t("vault.aside"))}
                <button type="button" className="icon-btn kit-btn is-add" data-test="sav-add" aria-label={t("add")} aria-pressed={asideAdd} onClick={() => setAsideAdd((v) => !v)}><Plus /></button>
              </span>
            ) : null}
            </div>
            {focus === "save" && asideAdd ? (
              <div className="kit-add">
                <LineForm kind="expense-fixed" preset={{ categoryId: savingsCats[0]?.id ?? "f-ahorro" }} glyph={asideGlyph} swatch={asideColor} dock
                  look={{ glyph: asideGlyph, color: asideColor, onGlyph: setAsideGlyph, onColor: setAsideColor }} onClose={() => setAsideAdd(false)} />
              </div>
            ) : null}
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
            {has("vault.setaside-split") && asideParts.saldo > 0 ? (
              <p className="save-flow-split">
                <SourceNote
                  label={t("desk.savings.from")}
                  title={t("vault.aside")}
                  meaning={t("vault.aside.saldo.what")}
                  formula={fixedSave.filter((l) => stock.series.get(l.seriesId || l.id)?.cls === "saldo").map((l) => l.concept || names.sub(l.subId)).join(" · ")}
                  implication={t("vault.aside.goalNote")}
                >
                  <span>{t("vault.aside.saldo").replace("{x}", fmt(asideParts.saldo))}</span>
                </SourceNote>
                <i aria-hidden>·</i>
                <SourceNote
                  label={t("desk.savings.from")}
                  title={t("vault.aside")}
                  meaning={t("vault.aside.aparte.what")}
                  formula={fixedSave.filter((l) => stock.series.get(l.seriesId || l.id)?.cls !== "saldo").map((l) => l.concept || names.sub(l.subId)).join(" · ")}
                  implication={t("vault.aside.goalNote")}
                >
                  <span>{t("vault.aside.aparte").replace("{x}", fmt(asideParts.moved))}</span>
                </SourceNote>
              </p>
            ) : null}
            <div className="save-flow-goal">
              <span className="lab-head">
                <button type="button" className="term-link" onClick={() => goTopic("meta-ahorro", { screen: "settings", fold: "rate", anchor: "aj-goal" })}>{t("save.goalTerm")}</button>
              </span>
              <span className="save-flow-pct">
                <input
                  key={rate.savingsGoalPct}
                  className="field num"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  defaultValue={rate.savingsGoalPct}
                  aria-label={t("settings.goal")}
                  onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, savingsGoalPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } }), "goal")}
                />
                <i>%</i>
              </span>
            </div>
            {fixedSave.map((line) => (
              <div key={line.id} className="save-flow-slot">
              <div className={`save-flow-row is-tap${ui.editing === line.id ? " is-open" : ""}`} {...savTap(line)}>
                <span className="save-flow-name">
                  <i className="save-flow-ico" style={{ background: chosenTone(line.color, line.categoryId) || undefined, ["--ico" as string]: chosenTone(line.color, line.categoryId) || colorForLine(session.ledger.structure, line.categoryId, line.subId) }}>
                    {line.icon?.startsWith("brand:") ? <BrandMark id={line.icon.slice(6)} /> : <Glyph name={line.icon && line.icon !== "Circle" ? line.icon : "PiggyBank"} />}
                  </i>
                  <span>{line.concept || names.sub(line.subId) || names.cat(line.categoryId)}</span>
                </span>
                <strong className="num">{fmt(convertMinor(line.amountMinor, line.currency, rate.display, rate.rateE4))}</strong>
              </div>
              {savEdit(line)}
              </div>
            ))}
          </div>
          </div>
        ) : null}
      </section>
      {/* 1.3.122 tablet: the Asesor for whatever Central has picked (a card, an open pocket), else the month. */}
      {!focus && tabletOneAA && has("area.bars-6m") ? <AreaAdvisor area={deskArea} label={deskArea === "subs" ? (lang === "en" ? "Payments" : "Pagos") : undefined} onLeave={() => { lensReturn = lens === "all" ? null : { depth, lens }; }} /> : null}
      {focus ? null : (
      <section key={lens} data-anchor="desk-list" className={`card span-all swipe-pane${lensSwapped.current ? " is-swap" : ""}${ringFresh() ? " is-ring" : ""}`} data-dir={flowDir < 0 ? "-1" : "1"}>
        {lensMode === "debt" ? (
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
            <span>{t("desk.opportunity")}<Hint topic="oportunidad" className="is-inline" /></span>
            <strong className={`num ${summary.opportunity < 0 ? "bad" : ""}`}>{fmt(summary.opportunity)}</strong>
          </p>
        ) : null}
        {lens === "have" ? <p className="own-kicker">{t("desk.have.note")}</p> : null}
        {lines.length === 0 ? (
          <span className="row mt-3" data-anchor="desk-start">
            <button type="button" className="btn" onClick={() => setUi({ section: "income", draft: "income-fixed" })}>{t("desk.first")}</button>
            {hasEarlierLines ? <button type="button" className="btn ghost" onClick={copyPrev}>{t("desk.copy")}</button> : null}
          </span>
        ) : null}
        {shown.length === 0 ? <Note>{t("desk.empty")}</Note> : null}
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
              // 1.3.113: savings and Remesas rows show their icon beside the name, like the books' bubbles and Cuotas: the line's
              // own icon or preset brand tile (Primerica), else its pocket's or category's preset icon; bank accounts show the bank.
              // The colour bar stays. A group with any mark keeps the slot on every row, so the names stay aligned. Other groups
              // are unchanged (an icon there would cost long names a second line on phones).
              const markRoles = new Set(["savings", "remittance"]);
              const rowMark = (line: (typeof shown)[number]) => {
                const cat = session.ledger.structure.categories.find((c) => c.id === line.categoryId);
                if (!cat || !markRoles.has(cat.role)) return "";
                if (isPrimerica(line) && (!line.icon || line.icon === "Circle" || line.icon === "brand:primerica")) return "brand:primerica";
                const g = lineGlyph(line, session.ledger.structure);
                return g === "vault" || g.startsWith("vault:") ? "Landmark" : g === "Circle" ? "" : g;
              };
              const groupMarks = new Set([...groups.values()].filter((group) => group.lines.some((line) => rowMark(line))).map((group) => group.id));
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
                        const mark = rowMark(line);
                        return (
                          <div key={line.id}>
                            <button type="button" className={`glass-line${debt && lens === "debt" ? " is-debt" : ""}`} data-line-id={line.id} aria-expanded={deskLine === line.id} onClick={() => setDeskLine((cur) => cur === line.id ? null : line.id)}>
                              <i className="ridge-pip" style={{ background: chosenTone(line.color, line.categoryId) || tint }} />
                              {groupMarks.has(group.id) ? <i className={`ridge-mark${mark ? "" : " is-blank"}`} aria-hidden>{mark ? <Glyph name={mark} className={mark.startsWith("brand:") || mark.startsWith("sub:") ? "ridge-brand" : "ridge-glyph"} /> : null}</i> : null}
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
        {/* Ola 6 (C6-2): el aviso ya no se pinta aquí. ui.notice solo nacía en
            Desk, así que el paro de Deshacer en la frontera de modos era
            silencio para quien estaba en Ajustes y aparecía rancio al volver
            a Central. Ahora lo pinta el cromo global (shell.tsx), donde la
            persona está parada; pintarlo también aquí lo duplicaría. */}
      </section>
      )}
    </div>
  );
}

export function Books({ mode }: { mode: "income" | "fixed" | "variable" }) {
  const { t, has } = useFaro();
  if (mode === "income") {
    return (
      <div className="grid gap-3">
        <LinesBlock kind="income-fixed" title={t("income.fixed")} menu />
        <LinesBlock kind="income-variable" title={t("income.variable")} menu />
        {has("import.bank") ? <ImportDoor /> : null}
      </div>
    );
  }
  if (mode === "fixed") return <div className="grid gap-3"><LinesBlock kind="expense-fixed" title={t("group.fixed")} menu />{has("import.bank") ? <ImportDoor /> : null}</div>;
  return (
    <div className="grid gap-3">
      <LinesBlock kind="expense-variable" title={t("group.variable")} menu />
      <PeopleBox />
      {has("remit.card") ? <RemitPeopleBox /> : null}
      {has("import.bank") ? <ImportDoor /> : null}
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
  const [catColor, setCatColor] = useState(QUICK[0]);
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
        <LinesBlock kind="purchase" title={t("nav.shops")} menu />
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
              <Note kind="tip">{t("shops.hint")}</Note>
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
                    <BrandMark id={s.icon.startsWith("brand:") ? s.icon.slice(6) : s.id} src={s.icon.startsWith("data:") ? s.icon : undefined} className="size-9" />
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
                      <Glyph name={namedIconFor(c)} className="size-4 shop-cat-ic" />
                      {displayName(c, lang)}
                    </button>
                    {paint === c.id ? (
                      <span className="shop-paint">
                        <ColorPick face="solid" value={categoryBase(c.id, c.color)} label={t("sc.color")} onConfirm={() => setPaint(null)} onPick={(color) => commit((st) => ({
                          ...st,
                          structure: { ...st.structure, purchases: st.structure.purchases.map((p) => p.id === c.id ? { ...p, color } : p) },
                        }), color)} />
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
                      <ColorPick face="solid" value={catColor} label={t("sc.color")} onPick={setCatColor} />
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
  // 1.3.213 (Oscar): Cuotas is a Libros menu like the five daily sections —
  // it carries the menu hook and takes the same Cyberpunk dress (1.3.211).
  return <LinesBlock kind="subscription" title={t("tab.subs")} menu />;
}

/** Etapa 3.1 (L-2): en Esencial Cuotas se mira, no se gestiona — las cuotas
 *  del mes listadas como movimientos (nombre, monto, próximo cobro como
 *  hecho), sin DueOwe, sin balanza y sin edición. La quinta entrada del riel
 *  de Libros aterriza aquí. */
export function SubsReadOnly() {
  const { t, lines, fmt, session, names, lang } = useFaro();
  if (!session) return null;
  const rate = session.ledger.settings;
  const rows = lines.filter((l) => l.kind === "subscription" && !l.rest && lineListVisible(session.ledger.structure, l));
  const total = rows.reduce((acc, l) => acc + convertMinor(l.amountMinor, l.currency, rate.display, rate.rateE4), 0);
  const today = todayIso();
  return (
    <section className="card subs-ro" data-anchor="subs-readonly">
      <div className="save-ledger-head">
        <strong className="lab-head">{t("tab.subs")}<Hint topic="cuotas" /></strong>
        <span className="num">{fmt(total)}</span>
      </div>
      {rows.length === 0 ? <p className="save-flow-read">{t("subs.ro.none")}</p> : rows.map((l) => {
        const due = l.nextDue ? nextDueFrom(l.nextDue, l.cadence, today) : "";
        return (
          <div key={l.id} className="save-view-row">
            <span className="save-view-name">
              {l.icon ? <Glyph name={l.icon} className="size-4" /> : null}
              <span>{l.concept || names.cat(l.categoryId)}</span>
              <strong className="num">{fmt(convertMinor(l.amountMinor, l.currency, rate.display, rate.rateE4))}</strong>
            </span>
            {due ? <span className="subs-ro-due">{`${t("subs.ro.next")} · ${new Date(`${due}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).replace(".", "")}`}</span> : null}
          </div>
        );
      })}
      <p className="save-flow-read">{t("subs.ro.note.pre")}<span className="faro-name">{t("mode.ritmo")}</span>{t("subs.ro.note.post")}</p>
    </section>
  );
}

/** 1.3.149: the year as a report — Estudio's «El año» fold. Every figure comes from yearReport
 *  (lib/faro/year.ts), which composes the monthly engine, so the year is the months added up.
 *  Savings at year end is shown in Oscar's three types: Retiro, Emergencia, Metas y otros bolsillos. */
export function YearCard() {
  const { session, lang, fmt, t, ui, setMonth, names } = useFaro();
  const years = session ? yearsWithData(session.ledger) : [];
  const [pick, setPick] = useState<number | null>(null);
  if (!session || !years.length) return null;
  const year = pick != null && years.includes(pick) ? pick : years.includes(ui.year) ? ui.year : years[years.length - 1]!;
  const r = yearReport(session.ledger, year, lang, names);
  const at = years.indexOf(year);
  const peak = Math.max(...r.top.map((s) => s.minor), 1);
  return (
    <section className="card">
      <div className="stat-head">
        <h2 className="serif text-2xl lab-head">{t("study.year.title")}<Hint topic="estudio-ano" fitParent /></h2>
        <span className="hist-nav">
          <button type="button" className="hist-btn" aria-label={t("study.year.prev")} disabled={at <= 0} onClick={() => setPick(years[at - 1]!)}><ChevronLeft /></button>
          <strong className="num">{year}</strong>
          <button type="button" className="hist-btn" aria-label={t("study.year.next")} disabled={at >= years.length - 1} onClick={() => setPick(years[at + 1]!)}><ChevronRight /></button>
        </span>
      </div>
      <p className="num serif text-3xl">{fmt(r.net)}</p>
      <div className="span-facts">
        <div><em>{t("study.in")}</em><strong className="num">{fmt(r.income)}</strong></div>
        <div><em>{t("study.out")}</em><strong className="num">{fmt(r.expense)}</strong></div>
        {/* Ola 12 (BR12-5b): con apartado en el año, la misma tarjeta nombra
            su descomposición — Gasto + Apartado = Sale — para que el «Sale»
            del año se pueda reconciliar sin salir de la tarjeta. */}
        {r.savedFlow > 0 ? <div><em>{t("study.year.gasto")}</em><strong className="num">{fmt(r.spend)}</strong></div> : null}
        {r.savedFlow > 0 ? <div><em>{t("study.year.apartado")}</em><strong className="num">{fmt(r.savedFlow)}</strong></div> : null}
        {r.remittance > 0 ? <div><em>{t("study.year.remit")}</em><strong className="num">{fmt(r.remittance)}</strong></div> : null}
        {r.interestPaid > 0 ? <div><em>{t("cobro.loan.intpaid")}</em><strong className="num">{fmt(r.interestPaid)}</strong></div> : null}
      </div>
      {r.top.length ? (
        <>
          <p className="lab-head year-sub">{t("study.year.top")}</p>
          {r.top.map((s) => (
            <div key={s.id} className="share">
              <span className="share-name">{s.name}</span>
              <span className="num">{fmt(s.minor)}</span>
              <div className="bar-track"><div className="bar-fill tone-4" style={{ width: `${Math.max(s.minor > 0 ? 6 : 0, (s.minor / peak) * 100)}%`, background: s.color }} /></div>
            </div>
          ))}
        </>
      ) : null}
      <p className="lab-head year-sub">{t("study.year.saved")}</p>
      <div className="year-saves">
        <div className="year-srow"><span>{t("study.year.retiro")}</span><strong className="num">{fmt(r.savingsEnd.retirement)}</strong></div>
        <div className="year-srow"><span>{t("study.year.emergencia")}</span><strong className="num">{fmt(r.savingsEnd.emergency)}</strong></div>
        <div className="year-srow"><span>{t("study.year.metas")}</span><strong className="num">{fmt(r.savingsEnd.goals)}</strong></div>
        <div className="year-srow is-total"><span>{t("study.year.total")}</span><strong className="num">{fmt(r.savingsEnd.total)}</strong></div>
      </div>
      <div className="year-months">
        {r.months.map((m, i) => (
          <button key={m.key} type="button" className={`year-month${m.has ? "" : " is-empty"}`} onClick={() => setMonth(year, i + 1)}>
            <span className="year-month-name">{m.label}</span>
            <span className="num">{fmt(m.income)}</span>
            <span className="num">{fmt(m.expense)}</span>
            <span className="num" data-tone={m.net < 0 ? "bad" : undefined}>{fmt(m.net)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Study() {
  const coach = useCoach();
  const { t, insights, slices, session, ui, setUi, lang, summary, fmt, names, lines, viewLine, key, has } = useFaro();
  usePinchZoom(lang);
  const [span, setSpan] = useState<"year" | "month" | "week">("year");
  const [picked, setPicked] = useState<string | null>(null);
  const [storePick, setStorePick] = useState<string | null>(null);
  // 3.2 (E-3): cada carpeta del Estudio cuelga de su función del registro por
  // los dos caminos que el mecanismo de datos ya usa: la lista `visible` (que
  // alimenta cortes de sección, orden y herramientas) se filtra por el modo, y
  // cada carpeta se monta tras su condición de datos Y su función — una
  // carpeta ausente por modo se comporta exactamente como una ausente por
  // datos. En Esencial la tarjeta de tiempo vive en su forma simple (la
  // semana), así que el tramo efectivo es "week".
  const spanEff: "year" | "month" | "week" = has("study.flow") ? span : "week";
  const points = session ? spanPoints(session.ledger, ui.year, ui.month, spanEff, lang) : [];
  const compare = session ? compareSpans(session.ledger, ui.year, ui.month, spanEff, spanEff === "week" ? 4 : spanEff === "month" ? 6 : 3, lang) : [];
  const activeKey = spanEff === "year"
    ? `${ui.year}-${String(ui.month).padStart(2, "0")}`
    : (points.find((p) => p.income > 0 || p.expense > 0)?.key ?? points[0]?.key ?? "");
  // Ola 12 (BR12-6): el punto que el gráfico marca como «ahora» — la
  // leyenda del CashFlow lee de él, no del Summary, para que número y
  // línea nunca cuenten dos verdades del mismo mes.
  const activePoint = points.find((p) => p.key === activeKey);
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
    ? lines.filter((l) => l.active && !l.rest && (l.categoryId || l.kind) === picked && !l.kind.startsWith("income"))
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
  // 1.3.290 (modelo de ahorros, oleada 4 — §4.4): Estudio lee la partición, como la banda:
  // las barras son el stock de cada bolsa (no las líneas del mes en pantalla) y el dinero
  // de la tarjeta es Lo guardado — un fondo del saldo no llena el frasco: su cifra va
  // aparte, como Lo comprometido. Una frase, un numerador.
  const stockNow = session ? savingsStock(session.ledger, key) : null;
  const perSub = new Map<string, number>();
  if (stockNow) for (const row of stockNow.series.values()) perSub.set(row.subId, (perSub.get(row.subId) ?? 0) + row.minor);
  const saveBars = pocketSubs.map((sub) => ({
    id: sub.id,
    name: names.sub(sub.id),
    minor: perSub.get(sub.id) ?? 0,
    color: sub.id.endsWith(".meta") ? "#8fb9a6" : sub.id.endsWith(".retiro") ? "#72b4b2" : sub.id.endsWith(".emergencia") ? "#7aa2c4" : "#d7b48a",
  }));
  const bankMinor = stockNow ? stockNow.byClass.cuenta : 0;
  if (bankSubs.length) saveBars.push({ id: "banks", name: t("study.save.banks"), minor: bankMinor, color: "#d5e2ea" });
  const saveHave = stockNow ? keptTotalOf(stockNow) : 0;
  const savePledged = stockNow ? stockNow.pledged : 0;
  const savePeak = Math.max(...saveBars.map((row) => row.minor), 1);
  const saveGoal = summary?.savingsGoal ?? 0;
  const saveFlow = summary?.savingsFlow ?? 0;
  const saveMonth = saveGoal > 0 ? Math.max(0, Math.min(100, (saveFlow / saveGoal) * 100)) : 0;
  const owedRows = lentOf(session?.ledger);
  const owedActive = owedRows.filter((row) => !row.archived).map((row) => {
    const due = lentState(session!.ledger, row);
    return { id: row.id, person: row.person, kind: row.kind, left: convertMinor(due.left, row.currency, display, rate), paid: convertMinor(due.paid, row.currency, display, rate) };
  });
  const owedLeft = owedActive.reduce((sum, row) => sum + row.left, 0);
  const owedPaid = owedActive.reduce((sum, row) => sum + row.paid, 0);
  const owedWhole = Math.max(owedLeft + owedPaid, 1);
  const owedPlain = owedActive.filter((row) => row.kind !== "interest").reduce((sum, row) => sum + row.left, 0);
  const owedRateSum = owedActive.filter((row) => row.kind === "interest").reduce((sum, row) => sum + row.left, 0);
  const owedFile = owedRows.filter((row) => row.archived).reduce((sum, row) => sum + convertMinor(row.unpaidMinor ?? 0, row.currency, display, rate), 0);
  const owedPeople = [...owedActive].sort((a, b) => b.left - a.left).slice(0, 5);
  const owedPeak = Math.max(...owedPeople.map((row) => row.left), 1);
  const es = lang !== "en";
  const owedAny = owedRows.length > 0;
  const visible = ["pulse", "health", "pace", "agenda", "waffle", "where", "rule", "movers", "time", "cushion"];
  // Oleada de botones 4 (R12): «Números clave» sigue el patrón de las carpetas con
  // datos (sankey, plan, préstamos…): cuando ningún número dice algo, la carpeta no
  // se anuncia — antes quedaba una carpeta fantasma, sin título y vacía.
  const numerosAny = hasKeyNumbers(insights);
  if (numerosAny) visible.push("numeros");
  if (sankey.links.length) visible.push("sankey");
  if (board?.envelopes.length) visible.push("plan");
  if (owedAny) visible.push("owed");
  const loansAny = loanTotals(session?.ledger).count > 0 || cardTotals(session?.ledger).known > 0;
  if (loansAny) visible.push("loans");
  const hasPeople = peopleOf(session?.ledger).length > 0;
  if (hasPeople) visible.push("people");
  const showRewards = hasRewards(session?.ledger, key);
  if (showRewards) visible.push("rewards");
  const remitAny = session ? remitTrend(session.ledger, key, 6).any : false;
  if (remitAny) visible.push("remesas");
  // 1.3.109: earnings by source (card rewards as their own source).
  const earnAny = hasEarnings(session?.ledger, ui.year);
  if (earnAny) visible.push("earnings");
  // 1.3.273 (Oscar): el seguro de vida se cuenta al final de Estadísticas —
  // es dinero que corre en el fondo. Solo se anuncia cuando ya se anotó una
  // prima: sin hechos, la carpeta no existe, como sus vecinas.
  const insStat = session ? insTotals(session.ledger, key, todayIso()) : null;
  if (insStat) visible.push("seguro");
  const rwHave = rewardsTotals(session?.ledger).total;
  const detailRows = storePick
    ? pickedRows.filter((line) => line.storeId === storePick)
    : pickedRows.filter((line) => line.kind !== "purchase" || !line.storeId);
  if (session && yearsWithData(session.ledger).length) visible.push("year");
  // 3.2 (E-3): el filtro del modo sobre la misma lista — cada carpeta nombra
  // la función que la sostiene (X-12: año, recompensas y seguro cuelgan de su
  // familia, porque el censo no les dio fila propia de Estudio).
  const FOLD_FEATURE = {
    pulse: "pano.month-ring", health: "pano.health-note", pace: "pano.runway-linear", agenda: "pano.next-dues-reduced",
    waffle: "pano.hundred", where: "study.where", rule: "pano.rule-503020", movers: "pano.movers", time: "study.flow-simple",
    cushion: "study.month-jar", plan: "study.budget-caps", numeros: "study.key-numbers", sankey: "study.sankey",
    owed: "study.owed", loans: "study.loans", people: "study.people", remesas: "study.remit", earnings: "study.income-sources",
    year: "study.income-sources", rewards: "cards.rewards", seguro: "ins.premiums-paid",
  } as const;
  const modeVisible = visible.filter((id) => has(FOLD_FEATURE[id as keyof typeof FOLD_FEATURE] ?? "study.fold-shell"));
  return (
    <StatFoldProvider
      label={t("study.unfold")}
      pinLabel={t("study.pin")}
      foldLabel={t("study.fold")}
      sortLabel={t("study.sort")}
      moveUpLabel={t("study.sort.up")}
      moveDownLabel={t("study.sort.down")}
      openByDefault={["pulse", "health", "pace", "agenda", "waffle", "where", "people", "remesas", "rewards", "rule", "movers", "time", "earnings", "cushion", "plan", "owed", "loans"].filter((id) => has(FOLD_FEATURE[id as keyof typeof FOLD_FEATURE] ?? "study.fold-shell"))}
      items={[
        { id: "pulse", label: es ? "Tu mes de un vistazo" : "Month at a glance", section: "now" },
        { id: "health", label: es ? "La salud de tu dinero" : "Your money's health", section: "now" },
        { id: "pace", label: es ? "Hasta dónde te alcanza" : "How far it goes", section: "now" },
        { id: "agenda", label: es ? "Próximos pagos" : "Payments ahead", section: "now" },
        { id: "waffle", label: es ? "Tus C$100" : "Your 100", section: "spend" },
        { id: "where", label: t("study.where"), section: "spend" },
        { id: "people", label: es ? "Gasto por persona" : "Spending by person", section: "spend" },
        { id: "remesas", label: es ? "Remesas" : "Remittances", section: "spend" },
        { id: "rewards", label: es ? "Recompensas" : "Rewards", section: "spend" },
        { id: "sankey", label: t("study.sankey"), section: "spend" },
        { id: "rule", label: es ? "La regla 50 · 30 · 20" : "The 50 · 30 · 20 rule", section: "general" },
        { id: "plan", label: es ? "¿Vas dentro del tope?" : "Within your limits?", section: "general" },
        { id: "movers", label: es ? "Qué se movió" : "What moved", section: "general" },
        { id: "time", label: es ? "Entra, sale y queda" : "In, out and left", section: "time" },
        { id: "earnings", label: es ? "De dónde viene tu dinero" : "Where your money comes from", section: "time" },
        { id: "year", label: es ? "El año" : "The year", section: "time" },
        { id: "cushion", label: es ? "Ahorro y colchón" : "Savings and cushion", section: "save" },
        { id: "owed", label: t("study.owed.title"), section: "owed" },
        { id: "loans", label: t("study.loans.title"), section: "owed" },
        { id: "numeros", label: es ? "Números clave" : "Key numbers", section: "keys" },
        { id: "seguro", label: t("cat.g.ins"), section: "keys" },
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
      visible={modeVisible}
    >
    <StudyStack>
      <StatBreaks />
      {coach ? (
        <>
          {has("pano.month-ring") ? <StatFold id="pulse"><PulseCard coach={coach} /></StatFold> : null}
          {has("pano.health-note") ? <StatFold id="health"><HealthCard coach={coach} /></StatFold> : null}
          {has("pano.runway-linear") ? <StatFold id="pace"><PaceCard coach={coach} /></StatFold> : null}
          <StatFold id="agenda"><AgendaCard coach={coach} /></StatFold>
          {has("pano.hundred") ? <StatFold id="waffle"><WaffleCard coach={coach} /></StatFold> : null}
          {has("pano.rule-503020") ? <StatFold id="rule"><RuleCard coach={coach} /></StatFold> : null}
          {has("pano.movers") ? <StatFold id="movers"><MoversCard coach={coach} /></StatFold> : null}
          {has("study.month-jar") ? <StatFold id="cushion"><CushionCard coach={coach} pockets={saveBars} goal={saveGoal} have={saveHave} pledged={savePledged} /></StatFold> : null}
        </>
      ) : null}
      {remitAny && has("study.remit") ? <StatFold id="remesas"><RemitCard monthKey={key} /></StatFold> : null}
      {insights.length === 0 ? <p>{t("stats.need")}</p> : null}
      <StatFold id="time"><TimeCard points={points} span={spanEff} onSpan={setSpan} activeKey={activeKey} /></StatFold>
      {has("study.income-sources") ? <StatFold id="year"><YearCard /></StatFold> : null}
      {earnAny && has("study.income-sources") ? <StatFold id="earnings"><EarningsStudy /></StatFold> : null}
      {board?.envelopes.length && has("study.budget-caps") ? <StatFold id="plan"><LimitsCard rows={board.envelopes} /></StatFold> : null}
      {numerosAny && has("study.key-numbers") ? <StatFold id="numeros"><KeyNumbers items={insights} /></StatFold> : null}
      <StudyCharts
        points={points}
        compare={compare}
        slices={foldSlices(slices, 8, lang, session ? colorFor(session.ledger.structure, "otros") : "#c5c1b8").map((s) => ({ id: s.id, name: s.name, value: s.minor / 100, minor: s.minor, color: s.color }))}
        activeKey={activeKey}
        incomeLabel={t("study.in")}
        expenseLabel={t("study.out")}
        barsTitle={t(`study.bars.${spanEff}`)}
        compareTitle={t(`study.compare.${spanEff}`)}
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
          // Ola 12 (BR12-6): la leyenda y la línea dibujada leen la MISMA
          // fuente — el punto activo que el gráfico dibuja (pointSums:
          // «Sale» sin el apartado, «Lo que queda» = entra − sale de ese
          // punto). Antes la leyenda leía el Summary del mes (con la suma
          // ancha) y la línea el punto: en noviembre decían 36,000/−6,000
          // sobre una línea de 27,000/+3,000 dibujada. Sin punto activo
          // (tramo sin cubetas) se cae al Summary de siempre.
          netValue: activePoint ? fmt(Math.round((activePoint.income - activePoint.expense) * 100)) : summary ? fmt(summary.opportunity) : "—",
          inValue: activePoint ? fmt(Math.round(activePoint.income * 100)) : summary ? fmt(summary.income) : "",
          outValue: activePoint ? fmt(Math.round(activePoint.expense * 100)) : summary ? fmt(summary.expense) : "",
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
          otrosNote: t("chart.otrosNote"),
          topMore: board && board.topRest.count > 0 ? (es ? `+${board.topRest.count} más · ${fmt(board.topRest.minor)}` : `+${board.topRest.count} more · ${fmt(board.topRest.minor)}`) : "",
        }}
      />
      {owedAny && has("study.owed") ? (
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
          )) : <Note>{t("study.owed.empty")}</Note>}
          {owedFile > 0 ? <p className="text-sm text-muted">{t("study.owed.file")}: <strong className="num">{fmt(owedFile)}</strong></p> : null}
          {rwHave > 0 ? <p className="text-sm text-muted" data-anchor="study-owed-rewards">{es ? "Recompensas de tarjetas" : "Card rewards"}: <strong className="num">{fmt(rwHave)}</strong></p> : null}
        </section>
      </StatFold>
      ) : null}
      {loansAny && has("study.loans") ? <StatFold id="loans"><LoansStudy /></StatFold> : null}
      {hasPeople && has("study.people") ? <StatFold id="people"><PeopleStudy /></StatFold> : null}
      {showRewards && has("cards.rewards") ? <StatFold id="rewards"><RewardsStudy /></StatFold> : null}
      {insStat && has("ins.premiums-paid") ? (
      <StatFold id="seguro">
        <section className="card">
          <div className="stat-head">
            <h2 className="serif text-2xl lab-head">{t("cat.g.ins")}<Hint topic="seguro-vida" fitParent /></h2>
          </div>
          <p className="num serif text-3xl">{fmt(insStat.totalMinor)}</p>
          <p className="text-sm text-muted">{(insStat.count === 1 ? t("ins.stat.count1") : t("ins.stat.count")).replace("{n}", String(insStat.count))}</p>
          <div className="span-facts">
            <div><em>{`${monthName(lang, Number(key.slice(5, 7)))} ${key.slice(0, 4)}`}</em><strong className="num">{fmt(insStat.monthMinor)}</strong></div>
          </div>
        </section>
      </StatFold>
      ) : null}
    </StudyStack>
    </StatFoldProvider>
  );
}

/** 1.3.98: Desplegar says "I'm here" once when the Asesor opens (a soft glint on the box), and once more after a long idle. Never loops; nothing under reduced motion. */
function useUnfoldHello() {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const play = (v: number) => { setN(v); timers.push(window.setTimeout(() => setN(0), 1300)); };
    timers.push(window.setTimeout(() => play(1), 650));
    let last = Date.now();
    let again = false;
    const touch = () => { last = Date.now(); };
    const evs = ["pointerdown", "keydown", "wheel", "scroll"] as const;
    for (const ev of evs) window.addEventListener(ev, touch, { passive: true, capture: true });
    const tick = window.setInterval(() => {
      if (again || document.visibilityState !== "visible" || Date.now() - last < 45000) return;
      again = true;
      play(2);
    }, 5000);
    return () => { timers.forEach(clearTimeout); clearInterval(tick); for (const ev of evs) window.removeEventListener(ev, touch, { capture: true }); };
  }, []);
  return n;
}
/** 1.3.175: on phone widths the Asesor's below-the-fold cards used to land whole
 * in the page turn — every card rendered, measured and fitted before the turn
 * could settle, which is where the Estudio↔Asesor heaviness lived. A deferred
 * card now mounts as it approaches the viewport (well before it can scroll
 * into view), so a turn only pays for what the eye can reach. Wide layouts
 * (the masonry range, ≥700px) render everything at once, exactly as before;
 * a faro-open jump or a print mounts the whole stack immediately. No spinner,
 * no placeholder content: the slot is simply not there until its card is. */
function DeferredCard({ force, children }: { force?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown || force) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || !window.matchMedia("(max-width: 699px)").matches) { setShown(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); } }, { rootMargin: "1200px 0px" });
    io.observe(el);
    const onPrint = () => setShown(true);
    window.addEventListener("beforeprint", onPrint);
    return () => { io.disconnect(); window.removeEventListener("beforeprint", onPrint); };
  }, [shown, force]);
  if (shown || force) return <>{children}</>;
  return <div ref={ref} aria-hidden style={{ height: 0 }} />;
}

/** 1.3.98: Asesor's Desplegar starts ticked. Unticking it lasts only until Faro is opened again (kept in memory, never saved). */
let advisorFolded = false;
export function Advisor() {
  const { t, advice, budget, fmt, summary, session, lang, names, key, ui, awakeOn, wake, notePlanCopied, dismissFinding, planStale, confirm, has } = useFaro();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [openPart, setOpenPart] = useState<string | null>(null);
  const [spreadParts, setSpreadParts] = useState(!advisorFolded);
  // Explicit per-card choices; a card with no choice follows Desplegar (so findings that arrive later open too).
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [unfold, setUnfold] = useState(!advisorFolded);
  const [more, setMore] = useState(!advisorFolded);
  const hello = useUnfoldHello();
  const [preset, setPreset] = useState<ScenarioId>("plan");
  const [drops, setDrops] = useState<string[]>([]);
  const [applied, setApplied] = useState<string>("");
  const stackRef = useRef<HTMLDivElement>(null);
  useMasonry(stackRef, !!(budget && session && summary));
  usePinchZoom(lang);
  const rules = useRules();
  // 1.3.175: a jump into the stack mounts the deferred cards at once.
  const [forceBelow, setForceBelow] = useState(false);
  // "Ir allí" / [[links]]: open the plan card (or a horizon card) when asked.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setForceBelow(true);
      if (id === "plan" || id === "short" || id === "medium" || id === "long" || id === "rules") setOpenCards((cur) => ({ ...cur, [id]: true }));
      else if (id === "advice-more") setMore(true);
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  if (!budget || !session || !summary) return null;
  const reading = readAdvisor(session.ledger, key, lang, names);
  // 1.3.148: the Asesor declares its basis — how many months and lines the reading stands on, and
  // whether the month on screen is the current one, still going (a day-3 verdict should not look
  // as settled as a year-long one).
  const basisMonths = Object.values(session.ledger.months).filter((m) => m.lines.length > 0).length;
  const basisLines = Object.values(session.ledger.months).reduce((a, m) => a + m.lines.length, 0);
  const basisNowD = new Date();
  const basisCurKey = `${basisNowD.getFullYear()}-${String(basisNowD.getMonth() + 1).padStart(2, "0")}`;
  const basisLastDay = new Date(basisNowD.getFullYear(), basisNowD.getMonth() + 1, 0).getDate();
  const basisText = (basisMonths === 1 && basisLines === 1
    ? t("advice.basis.11")
    : basisMonths === 1
      ? t("advice.basis.m1").replace("{m}", String(basisLines))
      : basisLines === 1
        ? t("advice.basis.l1").replace("{n}", String(basisMonths))
        : t("advice.basis").replace("{n}", String(basisMonths)).replace("{m}", String(basisLines)))
    + (key === basisCurKey && basisNowD.getDate() < basisLastDay ? ` · ${t("advice.basis.now")}` : "");
  const tried = projectLeft(reading, preset, drops);
  const text = [reading.plan, applied].filter(Boolean).join("\n\n");
  // 1.3.170 (censo de botones, R1): la afirmación sigue al resultado — la escritura se espera y
  // «Plan copiado» solo aparece cuando el plan de verdad quedó en el portapapeles. Si el navegador
  // la rechaza o no hay API de portapapeles, un aviso honesto lo dice y el plan de arriba queda
  // seleccionable para copiarlo a mano; ninguna promesa rechazada se escapa.
  async function copyPlan() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyFailed(false);
      notePlanCopied();
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }
  const mark = { short: CalendarDays, medium: CreditCard, long: Landmark } as const;
  const toneOf = (id: string) => (id === "base" ? "good" : id === "unique" ? "warn" : "gold");
  const cardOn = (id: string) => openCards[id] ?? unfold;
  const foldIds = [
    ...(awakeOn && wake ? wake.findings.map((item) => item.id) : []),
    ...advice.map((card) => card.horizon),
    ...(rules.length ? ["rules"] : []),
    "plan",
  ];
  const allOpen = spreadParts && more && foldIds.every(cardOn);
  function toggleAll() {
    if (!allOpen) {
      advisorFolded = false;
      setUnfold(true);
      setSpreadParts(true);
      setMore(true);
      setOpenPart(null);
      setOpenCards({});
      return;
    }
    // Unticking: ask first. Folded lasts until Faro opens again, then Desplegar is ticked by itself.
    confirm({ title: t("advice.unfold.ask"), body: t("advice.unfold.body"), yes: t("advice.unfold.yes"), run: () => {
      advisorFolded = true;
      setUnfold(false);
      setSpreadParts(false);
      setMore(false);
      setOpenPart(null);
      setOpenCards({});
    } });
  }
  function toggleCard(id: string) {
    setOpenCards((cur) => ({ ...cur, [id]: !(cur[id] ?? unfold) }));
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
      <label className="unfold-all is-advice" data-anchor="advice-unfold" data-hello={hello || undefined}>
        <input type="checkbox" checked={allOpen} onChange={toggleAll} />
        <span>{t("study.unfold")}</span>
        <Hint topic="desplegar-asesor" />
      </label>
      <p className="advice-basis" data-anchor="advice-basis">{basisText}</p>
      <section className="advice-hero-2" aria-label={reading.monthTag} data-anchor="advice-tower">
        <MonthTower reading={reading} income={summary.income} left={summary.opportunity} openPart={openPart} onPart={(id) => setOpenPart((cur) => (cur === id ? null : id))} more={more} onMore={() => setMore((on) => !on)}>
          <div className="a2-notes">
            {[
              { id: "month", tone: "calm", Icon: CalendarDays, text: reading.headline },
              { id: "alert", tone: "warn", Icon: ArrowLeftRight, text: reading.alert },
              { id: "credit", tone: "calm", Icon: CreditCard, text: reading.creditBlurb },
              { id: "remit", tone: "calm", Icon: Send, text: reading.remitNote },
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
      {/* Ola 1 (BR-6): lo vencido se dice AQUÍ — una franja de la pila del
          Asesor que el teléfono monta en los TRES modos. Su primera casa
          (las notas dentro de la torre) vivía tras advisor.month-detail,
          que es de Ritmo: en Esencial la nota existía y nunca se pintaba.
          El banco en vivo lo cazó; la franja es su casa verdadera. */}
      {reading.overdueNote ? <p className="advice-because is-notice" data-anchor="advice-overdue">{reading.overdueNote}</p> : null}
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
        const teaser = adviceTeaser(card, reading, fmt, lang, new Date(ui.year, ui.month, 0).getDate() || 30, has);
        const rows = card.points.filter((point) => {
          if (card.horizon === "short" && (["Base", "Únicas", "Apartado", "One-offs", "Transfer", "De siempre", "De una vez", "Ahorro", "Usual", "One-time", "Saved"].includes(point.label))) return false;
          return card.horizon === "short" || !point.emphasis;
        });
        return (
          <DeferredCard key={card.horizon} force={forceBelow}>
          <article data-anchor={`advice-${card.horizon}`} className={`advice-card is-${card.horizon} is-${index === 0 ? reading.tone : card.horizon === "medium" ? (summary.tone === "bad" ? "bad" : "good") : "good"}`} style={{ ["--enter" as string]: `${index + 1}` }}>
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
          </DeferredCard>
        );
      })}
      <DeferredCard force={forceBelow}><RulesCard rules={rules} open={cardOn("rules")} onToggle={() => toggleCard("rules")} enter={4} /></DeferredCard>
      {/* A-4: la tarjeta de «cuál pago primero» es el plan de pago (Completo):
          fuera de Completo no monta, ni plegada. */}
      {session && has("loans.payoff-plan") ? <DeferredCard force={forceBelow}><CardsAdvisor plan={payoffPlan(session.ledger)} /></DeferredCard> : null}
      <DeferredCard force={forceBelow}>
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
            {has("advisor.scenarios") ? (
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
                <button type="button" className="btn secondary" data-anchor="advice-apply" onClick={apply}>{t("advice.apply")}</button>
                <button type="button" className="btn secondary advice-copy" data-anchor="advice-copy" onClick={() => { void copyPlan(); }}>{copied ? t("advice.copied") : t("advice.copy")}</button>
                <Hint topic="copiar-plan" alt={planStale} />
              </div>
              {applied ? <p className="advice-aside">{t("advice.applied")} {applied}</p> : null}
              {copyFailed ? <p className="advice-aside" role="alert">{t("advice.copyFailed")}</p> : null}
            </div>
            ) : (
            <>
              {/* A-6: fuera de Completo el plan es solo la ruta — sin pestañas
                  de escenario ni botones de ensayo; copiar el plan queda. */}
              <div className="advice-acts">
                <button type="button" className="btn secondary advice-copy" data-anchor="advice-copy" onClick={() => { void copyPlan(); }}>{copied ? t("advice.copied") : t("advice.copy")}</button>
                <Hint topic="copiar-plan" alt={planStale} />
              </div>
              {copyFailed ? <p className="advice-aside" role="alert">{t("advice.copyFailed")}</p> : null}
            </>
            )}
          </>
        ) : null}
      </section>
      </DeferredCard>
      {has("advisor.people-tip") ? <DeferredCard force={forceBelow}><PeopleAdviceCard /></DeferredCard> : null}
      {has("advisor.rewards-note") ? <DeferredCard force={forceBelow}><RewardsAdvice /></DeferredCard> : null}
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

/** 1.3.231 (pedido de Oscar): la familia de pliegues de Estructura — los grupos
    del árbol, el formulario de «Nueva categoría», la tarjeta del Catálogo y su
    panel de Reemplazar — deja de abrir de golpe: se despliega y se pliega con
    la curva de la casa sobre la rejilla 0fr→1fr de pliegues.css. La fase vive
    aquí: al abrir, el contenido nace plegado y crece en el siguiente fotograma;
    al cerrar, sigue montado mientras cae y SOLO se desmonta al aterrizar — un
    toque a mitad de vuelo invierte la transición desde su altura actual, sin
    saltos ni bloqueos. Con movimiento reducido el pliegue es instantáneo. */
const FOLD_CLOSE_MS = { md: 225, sm: 150 } as const;
export function FoldShell({ open, tier = "md", className, children }: { open: boolean; tier?: keyof typeof FOLD_CLOSE_MS; className?: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(open);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (open) { setMounted(true); return; }
    if (!mounted) return;
    setShown(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timerRef.current = window.setTimeout(() => { timerRef.current = null; setMounted(false); }, reduced ? 0 : FOLD_CLOSE_MS[tier] + 30);
  }, [open, mounted, tier]);
  useEffect(() => {
    if (mounted && open && !shown) {
      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => { raf2 = window.requestAnimationFrame(() => setShown(true)); });
      return () => { window.cancelAnimationFrame(raf1); if (raf2) window.cancelAnimationFrame(raf2); };
    }
  }, [mounted, open, shown]);
  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);
  if (!mounted) return null;
  return (
    <div className={`fold-shell${tier === "sm" ? " fold-sm" : ""}${className ? ` ${className}` : ""}${shown && open ? " is-open" : ""}`}>
      <div className="fold-clip">{children}</div>
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

/** Los clusters de Ajustes (Oscar, 2026-11-15): la bandeja que agrupa las
 * piezas de siempre por territorio, sin tocar su contenido — el patrón de
 * Brizna, derivado de los tokens de Faro (clusters.css). En pantallas anchas
 * la masonería del tablero reparte por bandeja. */
function Cluster({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="cluster">
      <header className="cluster-head">
        <h2 className="cluster-title serif">{title}</h2>
        <p className="cluster-hint">{hint}</p>
      </header>
      <div className="cluster-body">{children}</div>
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
  const { t, lang, session, commit, ui, setUi, exportJson, importFile, pickFolder, restoreConflict, hasConflict, saveRate, confirm, backups, backupNow, restoreBackup, openManual, quarantined, restoreQuarantine, has } = useFaro();
  const [openFold, setOpenFold] = useState<string | null>(null);
  // 1.3.227 (pedido de Oscar): el catálogo gana su propio pliegue bajo
  // Estructura — nace plegado y su estado lo mandan sus toques, guardado
  // como el de los grupos del árbol.
  const [catalogOpen, setCatalogOpen] = useState<boolean>(() => { try { return localStorage.getItem("faro.catalog.open") === "1"; } catch { return false; } });
  const toggleCatalog = () => setCatalogOpen((v) => { try { localStorage.setItem("faro.catalog.open", v ? "0" : "1"); } catch { /* ignore */ } return !v; });
  const [themeSide, setThemeSide] = useState<{ day: boolean; night: boolean } | null>(null);
  // El selector de modo (tres modos, etapa 1): vive siempre en Ajustes y nunca se
  // esconde a sí mismo. Bajar abre primero la pantalla de impacto — y solo si hay
  // algo real que avisar; subir aplica y avisa después. Ambos caminos cierran los
  // flujos abiertos por sus propias reglas antes de cambiar la cara (principio 8).
  // Ola 3 (Cambios C3-1/C3-2): el estado del diálogo guarda sus PREMISAS —
  // el modo del que se partía (`from`) y la fecha de referencia del conteo
  // (`refDay`) — porque al confirmar se comparan premisas, no solo
  // conteos: si la dirección se invirtió bajo el diálogo, la confirmación
  // se re-plantea como subida (ModeReposedDialog); si solo cambió el
  // conteo, se refresca contra la misma fecha, para que la medianoche no
  // se disfrace de cambio del libro.
  const [modeImpactState, setModeImpactState] = useState<{ target: Mode; impact: ModeImpact; refreshed?: boolean; from: Mode; refDay: string } | null>(null);
  const [modeReposed, setModeReposed] = useState<{ target: Mode; from: Mode; unlocked: { id: string; labelKey: string; count: number }[]; fresh?: boolean } | null>(null);
  const currentMode: Mode = session ? modeOf(session.ledger.settings) : "completo";
  // Ola 10 (C10-2): EL DIÁLOGO ABIERTO VIGILA LAS LLEGADAS. Las curas
  // C3-1/C4-1 enseñaron a las CONFIRMACIONES a comparar premisas, pero el
  // diálogo abierto seguía congelado: una llegada (otra pestaña, la nube)
  // podía aterrizar en su propio destino o entre su origen y su destino
  // y el diálogo seguía preguntando byte por byte lo mismo — y confirmar
  // entonces no ejecutaba nada y no explicaba nada. El vigilante compara
  // las premisas contra el modo VIVO en cuanto este se mueve (la decisión
  // pura vive en modeDialogReaction, clavada en la §E de modos-ola10):
  // destino alcanzado → el diálogo se cierra (la llegada se anunció por
  // su puerta); dirección invertida → se convierte en su hermano con las
  // premisas vivas; misma pregunta con origen o conteos movidos → se
  // refresca con el recuento vivo. El vigilante jamás aplica un modo.
  useEffect(() => {
    if (!modeImpactState || !session) return;
    const r = modeDialogReaction({
      dialog: "impact", from: modeImpactState.from, target: modeImpactState.target, live: currentMode,
      state: session.ledger, lang, refDay: modeImpactState.refDay, currentImpact: modeImpactState.impact,
    });
    if (r.kind === "close") setModeImpactState(null);
    else if (r.kind === "to-reposed") { setModeImpactState(null); setModeReposed({ target: modeImpactState.target, from: r.from, unlocked: r.unlocked }); }
    else if (r.kind === "refresh-impact") setModeImpactState({ target: modeImpactState.target, impact: r.impact, refreshed: true, from: r.from, refDay: modeImpactState.refDay });
  }, [modeImpactState, session, currentMode, lang]);
  useEffect(() => {
    if (!modeReposed || !session) return;
    const r = modeDialogReaction({
      dialog: "reposed", from: modeReposed.from, target: modeReposed.target, live: currentMode,
      state: session.ledger, lang, refDay: currentRefDay(), currentUnlocked: modeReposed.unlocked,
      fresh: modeReposed.fresh,
    });
    if (r.kind === "close") setModeReposed(null);
    else if (r.kind === "to-impact") { setModeReposed(null); setModeImpactState({ target: modeReposed.target, impact: r.impact, from: r.from, refDay: currentRefDay() }); }
    // Ola 12 (C12-1): el refresco conserva la naturaleza del diálogo —
    // sin el flag, una llegada del mismo modo con otros conteos volvía
    // la pregunta fresca de la .318 la narración de un cambio de modo
    // que jamás ocurrió («Mientras mirabas, tu modo cambió…»).
    else if (r.kind === "refresh-reposed") setModeReposed({ target: modeReposed.target, from: r.from, unlocked: r.unlocked, fresh: r.fresh });
  }, [modeReposed, session, currentMode, lang]);
  const applyMode = (target: Mode) => commit((s) => ({ ...s, settings: { ...s.settings, mode: target } }), target);
  // El aviso de subida (1.3.307, palabra de Oscar): un letrero centrado con
  // una frase breve — el nombre del modo y su línea — en vez de la tira de
  // una sola línea cuya lista de destapados se salía de la caja en su
  // teléfono. Lo anuncia la confirmación de la subida (desde 1.3.318 toda
  // subida local pasa por su pantalla); la bajada tiene su espejo.
  const announceUp = (target: Mode) => {
    if (!session) return;
    modeSign({ dir: "up", mode: target });
  };
  const announceDown = (target: Mode) => {
    if (!session) return;
    modeSign({ dir: "down", mode: target });
  };
  /* Ola 14 (Cambios BR14-1): LA CONFIRMACIÓN DECIDE DESDE EL ESTADO VIVO.
   * Los dos onConfirm comparaban sus premisas contra el `session` de la
   * clausura del último render. Una llegada adoptada en la misma tarea
   * (su setSession queda en cola) no puede refrescar esa clausura hasta
   * el siguiente render, y un toque dentro de la ventana ejecutaba el
   * handler viejo entero: aplicaba el modo de la pregunta ya muerta y lo
   * anunciaba como obra propia — la mudanza confirmada de la otra
   * pestaña quedaba revertida en silencio, una bajada ejecutada con el
   * gesto y el letrero de una subida. La cura mueve la decisión DENTRO
   * del actualizador del propio commit: las actualizaciones funcionales
   * se componen en orden de despacho, así que la receta lee el estado
   * que la adopción encolada ya escribió, y solo aplica si las premisas
   * siguen vivas en ESE estado (el modo vivo es el que la confirmación
   * leyó, el destino no llegó ya, y el impacto recontado contra la fecha
   * fijada al abrir sostiene la premisa confirmada). Si se movieron, la
   * receta devuelve el estado intacto y deja su veredicto; el efecto de
   * abajo realiza las consecuencias: anunciar SOLO lo aplicado, silencio
   * si el destino ya llegó por su puerta (que lo anunció), y re-plantear
   * el diálogo con modeDialogReaction — la ley de los vigilantes — si la
   * pregunta se convirtió. Leer el sessionRef del proveedor NO cerraba
   * la ventana: ese ref también se alimenta en el render. El detalle de
   * actividad es un thunk (la casa de la 1.3.170: se resuelve tras la
   * receta): nombra el destino solo si la receta aplicó; si no aplicó,
   * dice la verdad. */
  type ModeConfirmCtx = {
    dialog: "impact" | "reposed";
    target: Mode;
    from: Mode;
    live: Mode;
    sign: "up" | "down";
    impact?: ModeImpact;
    premise?: ModeImpact;
    refDay?: string;
    unlocked?: { id: string; labelKey: string; count: number }[];
    fresh?: boolean;
  };
  const confirmVerdict = useRef<{ verdict: "applied" | "already" | "moved" | "recount"; ctx: ModeConfirmCtx; recount?: ModeImpact } | null>(null);
  /* Ola 15 (Cambios BR15-1): la ranura guarda la verdad MÁS FUERTE de
   * su tanda, no la última escritura. Dos despachos de confirmar en la
   * misma tarea (doble activación del botón aún montado) encolan dos
   * recetas: la primera APLICABA y veredictaba «applied»; la segunda
   * leía el modo ya aplicado, veredictaba «already» y PISABA la ranura
   * — el efecto obedecía el silencio y el aterrizaje que la persona
   * confirmó aterrizaba sin su letrero, con el registro de actividad
   * afirmando «no aplicó» sobre la entrada de la mudanza aplicada. Una
   * receta solo sobrescribe un veredicto más débil: «applied» jamás
   * degrada. Y como el detalle de actividad lee esta misma ranura tras
   * cada receta, el detalle de un commit que no aplicó nombra el
   * aterrizaje cuando su tanda sí aplicó — la frase «no aplicó» solo
   * se escribe cuando la tanda entera no aplicó. */
  const VERDICT_RANK: Record<"applied" | "already" | "moved" | "recount", number> = { applied: 3, recount: 2, moved: 2, already: 1 };
  const leaveVerdict = (v: { verdict: "applied" | "already" | "moved" | "recount"; ctx: ModeConfirmCtx; recount?: ModeImpact }) => {
    const cur = confirmVerdict.current;
    if (!cur || VERDICT_RANK[v.verdict] > VERDICT_RANK[cur.verdict]) confirmVerdict.current = v;
  };
  const applyModeConfirmed = (ctx: ModeConfirmCtx) => {
    commit((s) => {
      const liveNow = modeOf(s.settings);
      if (liveNow === ctx.target) { leaveVerdict({ verdict: "already", ctx }); return s; }
      if (liveNow !== ctx.live) { leaveVerdict({ verdict: "moved", ctx }); return s; }
      if (ctx.premise && ctx.refDay) {
        const recount = modeImpact(s, ctx.target, lang, ctx.refDay);
        const holds = (recount.total === 0 && ctx.premise.total === 0) || JSON.stringify(recount) === JSON.stringify(ctx.premise);
        if (!holds) { leaveVerdict({ verdict: "recount", ctx, recount }); return s; }
      }
      leaveVerdict({ verdict: "applied", ctx });
      return { ...s, settings: { ...s.settings, mode: ctx.target } };
    }, () => (confirmVerdict.current?.verdict === "applied" ? ctx.target : (lang === "en" ? "The confirmation did not apply: the mode had already changed" : "La confirmación no aplicó: el modo ya había cambiado")));
  };
  useEffect(() => {
    const v = confirmVerdict.current;
    if (!v || !session) return;
    confirmVerdict.current = null;
    const { ctx } = v;
    if (v.verdict === "applied") {
      /* Ola 16 (cerca de Cambios): la rama «applied» re-lee el estado
       * vivo antes de anunciar, como moved/recount ya hacían. Era la
       * única consumidora del canal que anunciaba a ciegas: si una
       * llegada (otra pestaña, la nube) deshizo el aterrizaje entre la
       * receta y este efecto, el letrero anunciaba un modo al que ya no
       * se llegó — la llegada habla por su propia puerta. */
      if (modeOf(session.ledger.settings) !== ctx.target) return;
      if (ctx.sign === "up") announceUp(ctx.target); else announceDown(ctx.target);
      return;
    }
    if (v.verdict === "already") return; // el destino llegó por su puerta y allí se anunció
    if (v.verdict === "recount" && v.recount) {
      const live = modeOf(session.ledger.settings);
      setModeImpactState({ target: ctx.target, impact: v.recount, refreshed: ctx.dialog === "impact" ? true : undefined, from: live, refDay: ctx.refDay ?? currentRefDay() });
      return;
    }
    // moved: la pregunta se re-plantea con la reacción de siempre — la
    // misma ley que los vigilantes aplican a las llegadas.
    const r = modeDialogReaction({
      dialog: ctx.dialog, from: ctx.from, target: ctx.target, live: modeOf(session.ledger.settings),
      state: session.ledger, lang, refDay: ctx.refDay ?? currentRefDay(),
      currentImpact: ctx.impact, currentUnlocked: ctx.unlocked, fresh: ctx.fresh,
    });
    if (r.kind === "to-reposed") { setModeImpactState(null); setModeReposed({ target: ctx.target, from: r.from, unlocked: r.unlocked }); }
    else if (r.kind === "to-impact") { setModeReposed(null); setModeImpactState({ target: ctx.target, impact: r.impact, from: r.from, refDay: ctx.refDay ?? currentRefDay() }); }
    else if (r.kind === "refresh-impact") setModeImpactState({ target: ctx.target, impact: r.impact, refreshed: true, from: r.from, refDay: ctx.refDay ?? currentRefDay() });
    else if (r.kind === "refresh-reposed") setModeReposed({ target: ctx.target, from: r.from, unlocked: r.unlocked, fresh: r.fresh });
  }, [session]);
  const pickMode = (target: Mode) => {
    if (!session || target === currentMode) return;
    if (modeRank(target) > modeRank(currentMode)) {
      // 1.3.318 (palabra de Oscar, 2026-11-18): SUBIR TAMBIÉN CONFIRMA.
      // «De la misma forma en que confirma para bajar, tiene que
      // confirmar para subir» — para no cambiar ni subir por error. Esto
      // enmienda la decisión base 2 (subir no preguntaba, solo avisaba):
      // la subida se plantea en el mismo diálogo hermano, con su cuerpo
      // de pregunta fresca (fresh), lo que se destapa y su confirmación
      // comparando premisas; el letrero centrado sigue anunciando el
      // aterrizaje ya confirmado. Las llegadas (otra pestaña, la nube)
      // no preguntan: anuncian por su puerta, como siempre.
      guardPanelExit(() => setModeReposed({ target, from: currentMode, unlocked: unlockedGroups(session.ledger, currentMode, target), fresh: true }));
      return;
    }
    const refDay = currentRefDay();
    const impact = modeImpact(session.ledger, target, lang, refDay);
    if (impact.total === 0) {
      guardPanelExit(() => {
        applyMode(target);
        announceDown(target);
      });
      return;
    }
    guardPanelExit(() => setModeImpactState({ target, impact, from: currentMode, refDay }));
  };
  // 1.3.319 (EL SUSURRO DEL MODO): la tarjeta del susurro, tocada, deja su
  // petición en mode-ask y trae a la persona hasta aquí; al montar (o al
  // oír el aviso, si Ajustes ya estaba montado) la petición se consume una
  // sola vez y se plantea con la maquinaria de siempre — pickMode pregunta
  // antes de subir, como manda la 1.3.318: la tarjeta lleva a la pregunta,
  // nunca cambia el modo en silencio.
  useEffect(() => {
    const ask = () => {
      const target = takeModeAsk();
      if (target && target !== currentMode) pickMode(target);
    };
    ask();
    window.addEventListener(MODE_ASK_EVENT, ask);
    return () => window.removeEventListener(MODE_ASK_EVENT, ask);
  });
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
      const floatBody = root.closest<HTMLElement>(".float-body");
      const pair = (land || wide) && !split && !(floatBody && floatBody.clientWidth < 620);
      // 1.3.285: con los clusters, las piezas del tablero son las bandejas
      // (.cluster) — la masonería reparte por bandeja y las tarjetas se
      // apilan dentro de cada una. Una tarjeta suelta (sin bandeja) sigue
      // contando como pieza, como antes.
      const cards = [...root.children].filter((el): el is HTMLElement => el instanceof HTMLElement && (el.classList.contains("card") || el.classList.contains("cluster")));
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
      // 1.3.114: a wide tablet board (>= 1500px, e.g. Tab S10 Ultra landscape) takes three columns; else two.
      const cols = wide && root.clientWidth >= 1500 ? 3 : 2;
      const colW = Math.max(0, (root.clientWidth - gap * (cols - 1)) / cols);
      const ys = new Array<number>(cols).fill(0);
      cards.forEach((el, index) => {
        const c = index % cols;
        const y = ys[c]!;
        el.style.position = "absolute";
        el.style.top = `${y}px`;
        el.style.left = `${c * (colW + gap)}px`;
        el.style.width = `${colW}px`;
        el.style.margin = "0";
        ys[c] = y + el.offsetHeight + gap;
      });
      root.style.position = "relative";
      const next = `${Math.ceil(Math.max(...ys))}px`;
      if (root.style.height !== next) root.style.height = next;
    };
    const watch = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };
    const ro = new ResizeObserver(watch);
    const arm = () => {
      ro.disconnect();
      for (const el of root.querySelectorAll(":scope > .card, :scope > .cluster")) ro.observe(el);
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
      if (["lang", "theme", "modo", "structure", "rate", "keys", "gestures", "backup", "banks", "account", "widget"].includes(id)) setOpenFold(id);
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  if (!session) return null;
  const settings = session.ledger.settings;
  // J-2 (etapa 3.3): la fila de la tasa manual es UNA sola pieza con dos
  // asientos — dentro del pliegue «Metas, semáforo y tasa» desde Ritmo, y
  // como fila suelta en «La app» en Esencial, donde el pliegue se disuelve
  // (todos sus demás renglones son de Ritmo). El valor vive en settings y
  // ningún asiento lo reinicia: esconder el pliegue no toca la tasa.
  const rateRow = (
    <>
      <div className="row mt-3" data-anchor="aj-rate">
        <input className="field num" value={rateText} onChange={(e) => setRateText(e.target.value)} aria-label={t("rate.manual")} />
        <button type="button" className="btn" onClick={() => saveRate(rateText)}>{t("rate.manual")}</button>
        <Hint topic="tasa-manual" className="is-after" />
      </div>
      {fxRateBroken(session.ledger) ? <Note kind="tip">{t("rate.broken")}</Note> : null}
    </>
  );
  function toggle(id: string) {
    const apply = () => setOpenFold((cur) => (cur === id ? null : id));
    // 1.3.182: plegar Estructura — o saltar a otra sección, que la pliega igual —
    // desmonta la tarjeta abierta que vive en ella: su salida manda (panel-exit).
    // Pregunta si hay trabajo sin aplicar y solo pliega tras su confirmación;
    // con la tarjeta limpia o sin tarjeta, pliega al momento, como siempre.
    if (openFold === "structure") { guardPanelExit(apply); return; }
    apply();
  }
  return (
    <>
    <div ref={boardRef} className="grid gap-3 settings-board">
      <Cluster title={lang === "en" ? "The app" : "La app"} hint={lang === "en" ? "How it looks and how it handles" : "Cómo se ve y cómo se maneja"}>
      <Fold id="lang" icon={Languages} sub={lang === "en" ? "Spanish or English" : "Español o inglés"} topic="idioma" title={t("settings.lang")} open={openFold === "lang"} onToggle={() => toggle("lang")}>
        <div className="aj-seg" role="group" aria-label={t("settings.lang")}>
          {(["es", "en"] as const).map((id) => (
            <button key={id} type="button" className="aj-seg-btn" aria-pressed={lang === id} onClick={() => { localStorage.setItem("faro-lang", id); commit((s) => ({ ...s, settings: { ...s.settings, lang: id } }), id); }}>{t(`lang.${id}`)}</button>
          ))}
        </div>
      </Fold>
      <Fold id="modo" icon={Gauge} sub={lang === "en" ? "Simple, paced or complete" : "Simple, con ritmo o completo"} topic="modos" title={t("settings.mode")} open={openFold === "modo"} onToggle={() => toggle("modo")}>
        <div className="aj-seg is-3" role="group" aria-label={t("settings.mode")}>
          {MODES.map((id) => (
            <button key={id} type="button" className="aj-seg-btn" data-anchor={`modo-opt-${id}`} aria-pressed={currentMode === id} onClick={() => pickMode(id)}>{t(`mode.${id}`)}</button>
          ))}
        </div>
        <p className="aj-mode-note">{t("mode.current").replace("{name}", t(`mode.${currentMode}`)).replace("{line}", t(`mode.${currentMode}.line`))}</p>
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
      <Fold id="keys" icon={Keyboard} sub={lang === "en" ? "One key per action" : "Una tecla por acción"} topic="atajos-teclado" title={t("settings.shortcuts")} open={openFold === "keys"} onToggle={() => toggle("keys")}>
        {SHORTCUT_ACTIONS.map((action) => (
          <div key={action} className={`key-row${ui.rebind === action ? " is-rebinding" : ""}`}>
            <span className="key-name">{shortcutLabel(lang, action)}</span>
            <kbd className="key-combo num">{settings.shortcuts[action] || DEFAULT_SHORTCUTS[action]}</kbd>
            <button type="button" className="btn ghost key-change" onClick={() => setUi({ rebind: action })}>{ui.rebind === action ? t("settings.press") : t("settings.rebind")}</button>
          </div>
        ))}
        <button type="button" className="btn ghost mt-2" onClick={() => confirm({ title: t("settings.resetKeys"), body: t("settings.resetKeys.body"), danger: true, yes: t("settings.resetKeys.yes"), run: () => commit((s) => ({ ...s, settings: { ...s.settings, shortcuts: { ...DEFAULT_SHORTCUTS } } }), "keys") })}>{t("settings.resetKeys")}</button>
      </Fold>
      <Fold id="gestures" icon={Hand} sub={lang === "en" ? "Long or double tap" : "Toque largo o doble"} topic="atajos-mas-menos" title={t("gesture.title")} open={openFold === "gestures"} onToggle={() => toggle("gestures")}>
        <Note kind="tip">{t("gesture.help")}</Note>
        {([
          { head: "gesture.btnIn", mode: "in" },
          { head: "gesture.btnOut", mode: "out" },
          { head: "gesture.btnDue", mode: "due" },
        ] as const)
        // J-5 (etapa 3.3): el grupo Debo/Cobros se esconde ENTERO en Esencial
        // (todos sus destinos son de Ritmo) y las opciones de cada grupo se
        // limitan al modo — el gesto guardado duerme en settings, no se borra,
        // y F-4 ya lo filtra al disparar.
        .filter(({ mode }) => mode !== "due" || has("subs.cuota"))
        .map(({ head, mode }) => {
          const options = [{ value: "", label: t("gesture.none") }];
          if (mode === "in") {
            options.push({ value: "income-fixed", label: t("income.fixed") }, { value: "income-variable", label: t("income.variable") });
          } else if (mode === "due") {
            options.push(
              { value: "owed", label: t("cobro.owed") },
              { value: "owe", label: t("cobro.owe") },
              { value: "dues", label: t("cobro.tab.dues") },
              { value: "loans", label: t("cobro.tab.loans") },
            );
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
            if (has("subs.cuota")) options.push({ value: "subscription", label: t("tab.subs") });
          }
          return (
            <div key={mode} className="gesture-group">
              <h4 className="gesture-group-head">{t(head)}</h4>
              {(["hold", "double"] as const).map((gesture) => {
                const slot = `${mode}.${gesture}`;
                return (
                  <label key={slot} className="label mt-3">
                    {t(gesture === "hold" ? "gesture.hold" : "gesture.double")}
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
            </div>
          );
        })}
      </Fold>
      {!has("settings.savings-goal") ? (
        <section className="card manual-card aj-card smp-card" data-anchor="aj-rate-card">
          <div className="smp-in">
            <span className="lab-head">{t("settings.rate")}</span>
            {rateRow}
          </div>
        </section>
      ) : null}
      </Cluster>
      <Cluster title={lang === "en" ? "The book" : "El libro"} hint={lang === "en" ? "How your money is organized" : "Cómo se organiza tu dinero"}>
      <Fold id="structure" icon={FolderTree} sub={has("settings.structure-tree") ? (lang === "en" ? "Categories and stores" : "Categorías y tiendas") : t("settings.catalog")} topic="estructura" title={t("settings.structure")} open={openFold === "structure"} onToggle={() => toggle("structure")}>
        {/* Ola 10 (CARA-1): la tarjeta es de Ritmo (settings.structure-card),
            pero las SELECCIONES de plantilla son de Completo (fallo 35,
            settings.templates): tras la sola puerta de la tarjeta pintaban
            — y APLICABAN la reestructura — en Ritmo, un piso por debajo de
            su asiento, cubiertas por una exención del censo que nombraba el
            gobernador sin mirar su piso. La cara obedece el fallo: en Ritmo
            la tarjeta pinta entera SIN el selector; en Completo, entero. */}
        {has("settings.structure-card") && has("settings.templates") ? (
        <div className="aj-picks" role="group" aria-label={t("settings.structure")}>
          {(["soltero", "familia", "estudiante", "negocio"] as TemplateId[]).map((id) => (
            <button key={id} type="button" className="btn ghost aj-pick" aria-pressed={session.ledger.structure.base === id} onClick={() => { const pv = templatePreview(session.ledger, id, lang); confirm({ title: t(`tpl.${id}`), body: `${templateExample(id, lang)}\n\n${pv.body}`, yes: pv.empty ? (lang === "en" ? "Got it" : "Entendido") : t("yes"), run: pv.empty ? () => {} : () => commit((s) => ({ ...s, structure: applyTemplate(s.structure, id) }), id) }); }}>
              <span className="aj-pick-name">{t(`tpl.${id}`)}</span>
              <span className="aj-pick-ex">{templateExample(id, lang)}</span>
            </button>
          ))}
          {/* 1.3.187 (R-3): la quinta tarjeta, «Completa» — mostrar todo en un solo gesto,
              con la misma maquinaria honesta de las plantillas: vista previa con conteos
              y el aviso de que los ajustes a mano se reinician, un solo commit, un Deshacer. */}
          <button type="button" className="btn ghost aj-pick aj-pick-wide" aria-pressed={session.ledger.structure.base === "completa"} onClick={() => { const pv = showAllPreview(session.ledger, lang); confirm({ title: t("tpl.completa"), body: `${showAllExample(lang)}\n\n${pv.body}`, yes: pv.empty ? (lang === "en" ? "Got it" : "Entendido") : t("yes"), run: pv.empty ? () => {} : () => commit((s) => ({ ...s, structure: showAllStructure(s.structure) }), "completa") }); }}>
            <span className="aj-pick-name">{t("tpl.completa")}</span>
            <span className="aj-pick-ex">{showAllExample(lang)}</span>
          </button>
        </div>
        ) : null}
        {has("settings.structure-tree") ? (
          <>
            <Note kind="tip">{structureStatusLine(session.ledger.structure, lang)}</Note>
            <StructureTree />
          </>
        ) : null}
        {/* 1.3.227 (pedido de Oscar): la cabecera del catálogo es una puerta —
            título y flecha pliegan y despliegan la sección entera; la
            sección se llama ahora «Tiendas y servicios». Y viste SU BURBUJA:
            no un texto flotando desnudo sobre el fondo, sino la tarjeta de
            la familia — la misma .tree-kick-row de Gastos fijos y Gastos
            variables, con su superficie, su borde y su luz — con el título
            en serif, el (?) en el asiento del engranaje y su medallón de
            24px fijo al extremo derecho, alineado con los conteos de las
            tarjetas de arriba (tres correcciones suyas con foto hasta dar
            con su palabra: «bubble» era la tarjeta misma). */}
        <h2 className="tree-kicker tree-kick-row cat-kick" data-anchor="aj-catalog">
          {/* La puerta es un div-botón con la ropa entera del botón de grupo
              (la gramática de Fold): así el (?) vive junto al título, dentro,
              y el medallón cae en la vertical exacta de los conteos — como
              botón real, el (?) hermano empujaba la burbuja 26px a la
              izquierda de esa línea. El (?) detiene su propia propagación. */}
          <div role="button" tabIndex={0} className="tree-group-btn" aria-expanded={catalogOpen} onClick={toggleCatalog}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCatalog(); } }}>
            <span className="cat-kick-title">{t("settings.catalog")}</span>
            <Hint topic="catalogo" />
            <ChevronDown className={catalogOpen ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
          </div>
        </h2>
        <FoldShell open={catalogOpen}><CatalogEditor /></FoldShell>
      </Fold>
      {/* J-3 (etapa 3.3): Bancos se esconde como componente ENTERO fuera de
          Completo (settings.banks) — tarjetas, tasas, bonos y las reglas de
          comercio que viven dentro de BankSettings duermen con él; ningún
          renglón suelto queda en el cluster. La fila de importar sigue a su
          función (settings.import-row, Completo). */}
      {has("settings.banks") ? (
      <Fold id="banks" icon={CreditCard} sub={lang === "en" ? "Cards, rates and bonuses" : "Tarjetas, tasas y bonos"} topic="bancos" title={lang === "en" ? "Banks and rewards" : "Bancos y recompensas"} open={openFold === "banks"} onToggle={() => toggle("banks")}>
        <BankSettings />
      </Fold>
      ) : null}
      {has("settings.import-row") ? <ImportRow /> : null}
      {has("settings.savings-goal") ? (
      <Fold id="rate" icon={SlidersHorizontal} sub={lang === "en" ? "Goals, signal and rate" : "Metas, semáforo y tasa"} topic="reglas" title={t("settings.rate")} open={openFold === "rate"} onToggle={() => toggle("rate")}>
        <label className="label" data-anchor="aj-goal"><span className="lab-head">{glueHint(t("settings.goal"), <Hint topic="meta-ahorro" fitParent />)}</span>
          <input className="field num" defaultValue={settings.savingsGoalPct} onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, savingsGoalPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } }), "goal")} />
        </label>
        <label className="label mt-2" data-anchor="aj-green"><span className="lab-head">{glueHint(t("settings.green"), <Hint topic="semaforo-verde" fitParent />)}</span>
          <input className="field num" defaultValue={settings.debtGreenPct} onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, debtGreenPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } }), "green")} />
        </label>
        <label className="label mt-2" data-anchor="aj-yellow"><span className="lab-head">{glueHint(t("settings.yellow"), <Hint topic="semaforo-amarillo" fitParent />)}</span>
          <input className="field num" defaultValue={settings.debtYellowPct} onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, debtYellowPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } }), "yellow")} />
        </label>
        {has("settings.cushion-months") ? (
        <label className="label mt-2" data-anchor="aj-months"><span className="lab-head">{glueHint(t("settings.emergency"), <Hint topic="meses-colchon" fitParent />)}</span>
          <input className="field num" defaultValue={settings.emergencyMonths} onBlur={(e) => commit((s) => ({ ...s, settings: { ...s.settings, emergencyMonths: Number(e.target.value) || 0 } }), "months")} />
        </label>
        ) : null}
        <div className="label mt-2" data-anchor="aj-nature">
          <span className="lab-head">{glueHint(t("fund.mode.q"), <Hint topic="donde-vive" fitParent />)}</span>
          <ThemeSelect value={settings.savingsNatureMode ?? "ask"} onChange={(v) => commit((s) => ({ ...s, settings: { ...s.settings, savingsNatureMode: v as "ask" | "balance" | "separate" } }), "nature")} options={[
            { value: "ask", label: t("fund.mode.ask") },
            { value: "balance", label: t("fund.mode.balance") },
            { value: "separate", label: t("fund.mode.separate") },
          ]} />
          <p className="aj-nature-note">{t("fund.mode.note")}</p>
        </div>
        {rateRow}
      </Fold>
      ) : null}
      </Cluster>
      <Cluster title={lang === "en" ? "Learn" : "Aprender"} hint={lang === "en" ? "The manual and the lessons, at your pace" : "El manual y las lecciones, a tu paso"}>
      <section className="card manual-card" data-anchor="aj-manual" data-topic-box="manual">
        <button type="button" className="manual-row fold-btn" onClick={() => openManual("")}>
          <BookOpen aria-hidden />
          <span className="manual-row-text"><strong className="serif">{t("manual.title")}</strong><span>{t("manual.row")}</span></span>
          <ChevronRight aria-hidden />
        </button>
      </section>
      <PresentacionesCard />
      </Cluster>
      <Cluster title={lang === "en" ? "The phone" : "El teléfono"} hint={lang === "en" ? "Faro also lives outside the app" : "Faro también vive fuera de la app"}>
      <WidgetCard open={openFold === "widget"} onToggle={() => toggle("widget")} />
      <NotifyRow />
      <BatteryRow />
      {androidBrowser() ? (
        <section className="card manual-card" data-anchor="aj-android" data-topic-box="app-android">
          <button type="button" className="manual-row fold-btn" onClick={() => confirm({
            title: lang === "en" ? "Install the Android app" : "Instalar app Android",
            body: lang === "en"
              ? "Faro.apk downloads now. Open it and install (Android may ask you to allow apps from Chrome). The app keeps its own data: sign in once and your books come back through sync. Check first that the sync dot says In your account."
              : "Faro.apk se descarga ahora. Ábrelo e instala (Android puede pedirte permitir apps de Chrome). La app guarda sus datos aparte: entra una vez con tu cuenta y tus libros vuelven con la sincronización. Antes revisa que el punto de sincronización diga En la cuenta.",
            yes: lang === "en" ? "Download" : "Descargar",
            run: () => { location.href = APK_URL; },
          })}>
            <Smartphone aria-hidden />
            <span className="manual-row-text"><strong className="serif">{lang === "en" ? "Install the Android app" : "Instalar app Android"}</strong><span>{lang === "en" ? "Faro as its own app on this phone" : "Faro como app en este teléfono"}</span></span>
            <ChevronRight aria-hidden />
          </button>
        </section>
      ) : null}
      </Cluster>
      <Cluster title={lang === "en" ? "Your data" : "Tus datos"} hint={lang === "en" ? "Yours, saved and safe" : "Lo tuyo, guardado y a salvo"}>
      <SampleRow />
      <Fold id="backup" icon={ShieldCheck} sub={lang === "en" ? "On device and in cloud" : "En el equipo y la nube"} topic="copias" title={t("settings.backup")} open={openFold === "backup"} onToggle={() => toggle("backup")}>
        <BackupPanel backups={backups} onNow={backupNow} onRestore={restoreBackup} />
        <QuarantinePanel entries={quarantined} onRestore={restoreQuarantine} />
        <div className="vault-more">
          <button type="button" className="btn secondary" onClick={exportJson}>{t("settings.export")}</button>
          <label className="btn secondary">{t("settings.import")}<input type="file" accept="application/json,application/gzip,.json,.gz" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.currentTarget.value = ""; }} /></label>
          <button type="button" className="btn ghost" onClick={pickFolder}>{t("settings.folder")}</button>
          {hasConflict ? <button type="button" className="btn" onClick={restoreConflict}>{t("settings.conflict")}</button> : null}
        </div>
        <h2 className="serif mt-4 text-xl lab-head" data-anchor="aj-activity">{t("settings.activity")}<Hint topic="actividad" /></h2>
        <ActivityLog lang={lang} items={session.ledger.audit.slice(0, 8).map((a) => ({ id: a.id, at: a.at, label: auditLabel(lang, a.detail) }))} />
      </Fold>
      <Fold id="account" icon={UserRound} sub={lang === "en" ? "Login, sync, fingerprint" : "Sesión, nube y huella"} topic="cuenta" title={t("account")} open={openFold === "account"} onToggle={() => toggle("account")}>
        <UserButton />
        <AccountLocalNote />
      </Fold>
      </Cluster>
    </div>
    <p className="app-version" data-anchor="aj-version">{t("app.version").replace("{v}", FARO_VERSION)}</p>
    {modeImpactState ? (
      <ModeImpactDialog
        lang={lang}
        target={modeImpactState.target}
        impact={modeImpactState.impact}
        refreshed={modeImpactState.refreshed}
        onCancel={() => setModeImpactState(null)}
        onConfirm={() => {
          const target = modeImpactState.target;
          // Ola 2 (C2-2): la pantalla confirma sobre los conteos de AHORA —
          // su palabra es la que la persona acepta al bajar. Si el libro
          // cambió bajo el diálogo (otra pestaña, la nube), la foto se
          // repone con los conteos frescos y la persona confirma la verdad;
          // nunca se aplica sobre una foto vieja.
          // Ola 3 (Cambios C3-1): antes que los conteos se comparan las
          // PREMISAS — la dirección. Si el modo vivo ya pasó al otro lado
          // del destino (el libro aterrizó en Esencial por otra puerta con
          // este diálogo de bajada a Ritmo abierto), confirmar ya no es
          // bajar: es SUBIR. Una subida jamás se aplica con palabras de
          // bajada ni sin nombrar lo destapado — el diálogo se re-plantea
          // en la dirección verdadera y pide su propia confirmación.
          if (session) {
            const live = modeOf(session.ledger.settings);
            if (live === target) {
              // El destino ya llegó por su propia puerta (que lo anunció):
              // no hay mudanza que aplicar ni palabra que repetir.
              setModeImpactState(null);
              return;
            }
            if (modeRank(target) > modeRank(live)) {
              setModeImpactState(null);
              setModeReposed({ target, from: live, unlocked: unlockedGroups(session.ledger, live, target) });
              return;
            }
            // Ola 3 (Cambios C3-2): el reconteo se hace contra la fecha de
            // referencia fijada al abrir — la medianoche entre la apertura
            // y la confirmación ya no cambia la foto ni acusa al libro.
            const fresh = modeImpact(session.ledger, target, lang, modeImpactState.refDay);
            if (JSON.stringify(fresh) !== JSON.stringify(modeImpactState.impact)) {
              if (fresh.total === 0) {
                // Lo que dormía ya no existe: la bajada ya no tiene impacto
                // que preguntar — se aplica con su aviso, como en pickMode.
                // Ola 14 (BR14-1): la aplicación pasa por la confirmación
                // que decide desde lo vivo (applyModeConfirmed): la
                // premisa «impacto cero» se re-verifica dentro del commit.
                setModeImpactState(null);
                applyModeConfirmed({ dialog: "impact", target, from: modeImpactState.from, live, sign: "down", impact: modeImpactState.impact, premise: fresh, refDay: modeImpactState.refDay });
                return;
              }
              setModeImpactState({ ...modeImpactState, impact: fresh, refreshed: true });
              return;
            }
            // Ola 14 (BR14-1): la foto coincide con lo confirmado — y aun
            // así la aplicación decide dentro del commit contra el estado
            // vivo: una llegada en la misma tarea que el toque no puede
            // ser revertida por esta confirmación.
            setModeImpactState(null);
            applyModeConfirmed({ dialog: "impact", target, from: modeImpactState.from, live, sign: "down", impact: modeImpactState.impact, premise: modeImpactState.impact, refDay: modeImpactState.refDay });
            return;
          }
          setModeImpactState(null);
          applyMode(target);
          // 1.3.307: la bajada confirmada también aterriza con su letrero
          // centrado — el diálogo preguntó; el letrero confirma el aterrizaje.
          announceDown(target);
        }}
      />
    ) : null}
    {modeReposed ? (
      <ModeReposedDialog
        lang={lang}
        target={modeReposed.target}
        from={modeReposed.from}
        unlocked={modeReposed.unlocked}
        fresh={modeReposed.fresh}
        onCancel={() => setModeReposed(null)}
        onConfirm={() => {
          const { target } = modeReposed;
          setModeReposed(null);
          // Ola 4 (Cambios C4-1): el re-planteado confirmaba A CIEGAS con
          // las premisas congeladas al plantearse — con una doble
          // inversión (el libro volvió a Completo por otra puerta con el
          // re-planteado abierto) ejecutaba una BAJADA real Completo→Ritmo
          // sin pantalla de impacto y con el aviso de subida; y si el
          // destino ya había llegado, anunciaba una subida que no hizo.
          // La confirmación compara premisas como su padre: destino ya
          // alcanzado → cierra en silencio veraz; dirección invertida otra
          // vez → la bajada se plantea de nuevo con su pantalla verdadera;
          // subida viva → se aplica y se anuncia desde el modo VIVO.
          if (!session) return;
          const live = modeOf(session.ledger.settings);
          if (live === target) return;
          if (modeRank(target) < modeRank(live)) {
            const refDay = currentRefDay();
            const impact = modeImpact(session.ledger, target, lang, refDay);
            if (impact.total === 0) {
              // Ola 14 (BR14-1): también esta aplicación decide dentro del
              // commit — la premisa «sin impacto» se re-verifica contra el
              // estado vivo antes de escribir el modo.
              applyModeConfirmed({ dialog: "reposed", target, from: modeReposed.from, live, sign: "down", premise: impact, refDay, unlocked: modeReposed.unlocked, fresh: modeReposed.fresh });
              return;
            }
            setModeImpactState({ target, impact, from: live, refDay });
            return;
          }
          // Ola 14 (BR14-1): la subida confirmada se aplica por la ruta
          // que decide desde lo vivo; el letrero lo pone el efecto del
          // veredicto, solo si la receta aplicó de verdad.
          applyModeConfirmed({ dialog: "reposed", target, from: modeReposed.from, live, sign: "up", unlocked: modeReposed.unlocked, fresh: modeReposed.fresh });
        }}
      />
    ) : null}
    </>
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

/**
 * Cuarentena visible (1.3.166, arreglo C4): las copias que Faro apartó al encontrarlas dañadas,
 * con su fecha y su tamaño. Una copia que sigue siendo un libro legible se restaura por la
 * misma puerta que una copia de la bóveda; una dañada se nombra como tal y no se ofrece.
 * Sin copias apartadas, el panel no existe (el primer arranque y el uso normal no lo ven).
 */
function QuarantinePanel({ entries, onRestore }: { entries: QuarantineEntry[]; onRestore: (ts: number) => void }) {
  const { t, lang } = useFaro();
  if (!entries.length) return null;
  const loc = lang === "en" ? "en-US" : "es-NI";
  const when = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
  };
  const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`);
  return (
    <div className="vault">
      <h3 className="vault-list-title">{t("backup.quarantine")}</h3>
      <p className="vault-sub">{t("backup.quarantine.sub")}</p>
      <ul className="vault-list">
        {entries.map((e) => (
          <li key={e.key}>
            <span className="vault-dot" aria-hidden />
            <span className="vault-day">{when(e.at)}<small><span className="num">{kb(e.bytes)}</span></small></span>
            {e.ok
              ? <button type="button" className="btn ghost vault-restore" onClick={() => onRestore(e.ts)}>{t("backup.restore")}</button>
              : <span className="vault-sub">{t("backup.quarantine.bad")}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StructureTree() {
  const { t, lang, session, commit, confirm } = useFaro();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // 1.3.179: la tarjeta abierta registra aquí su única salida (exitPanel): toda
  // vía que la pliega — su Cancelar, el chevron de la fila, este pliegue de
  // grupo, el Back/Esc — pasa por ella, y con trabajo sin aplicar manda su aviso;
  // nada de lo que él preparó se pierde en silencio. La tarjeta abierta es
  // además una capa: el Back del teléfono la pliega a ella antes que a la
  // pantalla, como en el resto de la app.
  const panelExitRef = useRef<PanelExit | null>(null);
  useLayer(openId !== null, () => { panelExitRef.current?.(false); });
  const [catName, setCatName] = useState("");
  const [catGroup, setCatGroup] = useState<"fixed" | "variable">("fixed");
  // 1.3.225 (pedido de Oscar): el formulario de categoría nueva nace plegado
  // tras su propia tarjeta-puerta, tercera bajo los dos grupos — como ellos.
  const [addOpen, setAddOpen] = useState(false);
  // 1.3.143: the two groups fold by their title, so the tree can shrink to two lines (Oscar: the long
  // list made him lose focus). UI-only state, kept on this device; searching always shows its matches.
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => {
    try {
      const raw = localStorage.getItem("faro.tree.folded");
      if (raw !== null) return new Set(JSON.parse(raw) as string[]);
    } catch { /* ignore */ }
    // 1.3.144: with nothing saved by hand, the groups are born folded (Oscar: «Deben comenzar
    // plegados. Ese es el punto.»). A set saved by his own taps keeps ruling, as always.
    return new Set(["fixed", "variable"]);
  });
  const foldGroup = (group: string) => setFolded((prev) => {
    const next = new Set(prev);
    if (next.has(group)) next.delete(group); else next.add(group);
    try { localStorage.setItem("faro.tree.folded", JSON.stringify([...next])); } catch { /* ignore */ }
    return next;
  });
  // 1.3.144: reordering is drag-and-drop now (Oscar: the arrow buttons go). Press-and-hold a row to
  // lift it, drag it inside its own group, release to drop — the drop rewrites the group's `order`.
  // 1.3.227 (Oscar: «no pude mover ninguna; si sostengo la ficha, copio el texto»): el gesto moría
  // antes de nacer por tres lados — la selección de texto del teléfono se llevaba la pulsación
  // larga (arreglado en styles.css: user-select/touch-callout fuera de las filas), el temblor de
  // la mano (>6px) cancelaba la espera, y la espera misma (260ms) se sentía muerta. Ahora: la
  // espera baja a 200ms, la tolerancia sube a 12px y el menú contextual queda suprimido en la
  // fila — sostener levanta, arrastrar mueve, soltar deja; tocar sigue abriendo y el scroll
  // sigue siendo fluido porque un scroll de verdad supera los 12px en los primeros milisegundos.
  type DragState = { id: string; group: string; from: number; to: number; dy: number; rowH: number };
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const pressRef = useRef<{ id: string; group: string; index: number; count: number; y: number; pid: number; timer: number; el: HTMLElement } | null>(null);
  const swallowClickRef = useRef(false);
  const stopScrollRef = useRef<((e: TouchEvent) => void) | null>(null);
  const scrollWatchRef = useRef<(() => void) | null>(null);
  const endGestureRef = useRef<((e: PointerEvent) => void) | null>(null);
  const endPress = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
    if (stopScrollRef.current) { window.removeEventListener("touchmove", stopScrollRef.current); stopScrollRef.current = null; }
    if (scrollWatchRef.current) { window.removeEventListener("scroll", scrollWatchRef.current, true); scrollWatchRef.current = null; }
    if (endGestureRef.current) { window.removeEventListener("pointerup", endGestureRef.current); window.removeEventListener("pointercancel", endGestureRef.current); endGestureRef.current = null; }
  };
  // 1.3.164: no window listener survives this tree. The touchmove blocker a lift installs was
  // removed ONLY by endPress(), which ran only from the row's own pointerup/pointercancel — if
  // the tree unmounted mid-drag (leaving Ajustes with another tap while holding a lifted row,
  // the row node replaced by a re-render, capture lost without up/cancel), the blocker lived
  // forever and ALL touch scroll died until the app was closed and reopened (Oscar's report,
  // reproduced in faro-shots/scenario-bugrepro.mjs). Unmounting now ends the press.
  useEffect(() => () => {
    endPress();
    dragRef.current = null;
    pressRef.current = null;
  }, []);
  const onRowPointerDown = (e: React.PointerEvent<HTMLElement>, cat: Category, group: string, index: number, count: number) => {
    if (needle || openId === cat.id) return; // no dragging while searching or while the row is being edited
    if (e.button !== undefined && e.button !== 0) return;
    swallowClickRef.current = false; // a new gesture clears any stale swallow from a cancelled drag
    endPress();
    // 1.3.167: <main>'s swipe capture (shell.tsx) takes pointer capture on EVERY touch
    // pointerdown, so a short tap's pointerup is retargeted to <main> and the row never sees
    // it — its lift timer was never cancelled and fired alone into an empty room: the row
    // lifted itself and the touch blocker stayed armed, killing scroll (Oscar's "se pega";
    // faro-shots/scenario-tapleak.mjs). This window-level listener hears the gesture's end
    // no matter which element holds capture; endPress() itself disarms it, so it can never
    // kill a later press, and unmount disarms it through endPress too. For a real drag the
    // row's own pointerup (the drop) dispatches from the app root before this bubble-phase
    // window listener fires, so the drop still runs first and this is a no-op cleanup.
    const endGesture = (ev: PointerEvent) => { if (pressRef.current && ev.pointerId === pressRef.current.pid) endPress(); };
    endGestureRef.current = endGesture;
    window.addEventListener("pointerup", endGesture);
    window.addEventListener("pointercancel", endGesture);
    // 1.3.145: if the page actually scrolls while the finger is down, the gesture was a scroll —
    // cancel the pending lift at the first real movement (position compared, so a scroll event
    // queued from before the press can't cancel it), and swiping stays fluid (Oscar: with a category
    // open, scrolling stuck: a slow-starting scroll let the lift timer fire mid-gesture, capture
    // the finger and freeze the page).
    const startScrollY = window.scrollY;
    const watch = () => { if (!dragRef.current && Math.abs(window.scrollY - startScrollY) > 4) endPress(); };
    scrollWatchRef.current = watch;
    window.addEventListener("scroll", watch, { capture: true, passive: true });
    const el = e.currentTarget;
    const timer = window.setTimeout(() => {
      if (!pressRef.current) return; // 1.3.167: the press already ended — never lift into an empty room
      const wrap = el.closest<HTMLElement>("[data-row]");
      const rowH = wrap?.getBoundingClientRect().height ?? 52;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      const stop = (ev: TouchEvent) => { if (dragRef.current) ev.preventDefault(); };
      stopScrollRef.current = stop;
      window.addEventListener("touchmove", stop, { passive: false });
      const lifted: DragState = { id: cat.id, group, from: index, to: index, dy: 0, rowH };
      dragRef.current = lifted;
      setDrag(lifted);
    }, 200);
    pressRef.current = { id: cat.id, group, index, count, y: e.clientY, pid: e.pointerId, timer, el };
  };
  const onRowPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const press = pressRef.current;
    if (!press) return;
    const live = dragRef.current;
    if (!live) {
      // 1.3.227: la tolerancia sube de 6 a 12px — una mano real tiembla más
      // de 6px mientras sostiene, y el temblor cancelaba el levantamiento
      // antes de que naciera (Oscar: «no pude mover ninguna categoría»).
      if (Math.abs(e.clientY - press.y) > 12) endPress(); // it was a scroll or a tap, not a hold
      return;
    }
    const dy = e.clientY - press.y;
    const to = Math.max(0, Math.min(press.count - 1, live.from + Math.round(dy / live.rowH)));
    if (to !== live.to || dy !== live.dy) { const next = { ...live, dy, to }; dragRef.current = next; setDrag(next); }
  };
  const onRowPointerUp = () => {
    const live = dragRef.current;
    endPress();
    if (!live) return;
    dragRef.current = null;
    setDrag(null);
    swallowClickRef.current = true; // the click that follows a drop must not open/close the editor
    if (live.to !== live.from) {
      commit((s) => {
        const inGroup = s.structure.categories.filter((c) => c.group === live.group).slice().sort((a, b) => a.order - b.order);
        const [moved] = inGroup.splice(live.from, 1);
        inGroup.splice(live.to, 0, moved);
        const orderOf = new Map(inGroup.map((c, i) => [c.id, i]));
        return { ...s, structure: { ...s.structure, categories: s.structure.categories.map((c) => (c.group === live.group ? { ...c, order: orderOf.get(c.id)! } : c)) } };
      }, "drag reorder");
    }
  };
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
  const missing = missingDefaults(session.ledger.structure);
  const categories = session.ledger.structure.categories.slice().sort((a, b) => a.order - b.order);
  const visible = (cat: Category) => {
    if (cat.id === openId) return true; // 1.3.179: la categoría en edición nunca se desmonta por una búsqueda
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
      <p className="tree-hint">{t("tree.dragHint")}</p>
      {groups.length === 0 ? <Note>{t("tree.empty")}</Note> : null}
      {groups.map(({ group, rows }) => {
        const groupOpen = needle.length > 0 || !folded.has(group);
        // 1.3.187 (E-8): el restaurar vive en la cabecera de SU grupo — antes solo salía
        // en el primer grupo aunque la ausente fuera del otro, y había que adivinarlo.
        const missingHere = missing.filter((c) => c.group === group);
        return (
        <div key={group}>
          <div className="tree-kicker tree-kick-row">
            <button type="button" className="tree-group-btn" data-anchor={group === "fixed" ? "est-group" : undefined} aria-expanded={groupOpen} onClick={() => {
              // 1.3.179: plegar el grupo desmontaría la tarjeta abierta que vive en él —
              // primero manda su salida (si levanta el aviso, el grupo no se pliega).
              // 1.3.223: el pliegue del grupo viaja en el `after` de la salida — el
              // grupo se pliega cuando la tarjeta terminó de plegarse (o tras su
              // confirmación), nunca antes que ella.
              if (groupOpen && openId !== null && categories.some((c) => c.id === openId && c.group === group)) { const exit = panelExitRef.current; if (exit) { exit(false, () => foldGroup(group)); return; } }
              foldGroup(group);
            }}>
              <ChevronDown className={groupOpen ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
              <span className="tree-group-name">{t(group === "fixed" ? "group.fixed" : "group.variable")}</span>
              <span className="tree-group-count num">{rows.length}</span>
            </button>
            {missingHere.length ? <button type="button" className="sub-gear tree-restore" data-test="cat-restore" data-group={group} aria-label={lang === "en" ? "Restore default categories" : "Restaurar categorías de fábrica"} onClick={() => confirm({
              title: lang === "en" ? "Restore default categories" : "Restaurar categorías de fábrica",
              body: (lang === "en" ? "These come back: " : "Vuelven: ") + missingHere.map((c) => `${displayName(c, lang)} (${t(c.group === "fixed" ? "group.fixed" : "group.variable").toLowerCase()})`).join(", ") + (lang === "en" ? ". Your own categories and every entry stay as they are." : ". Tus categorías propias y cada movimiento quedan como están."),
              yes: lang === "en" ? "Restore" : "Restaurar",
              run: () => commit((s) => restoreDefaultCategories(s, group), lang === "en" ? "Default categories" : "Categorías de fábrica"),
            })}><RotateCcw /></button> : null}
          </div>
          <FoldShell open={groupOpen}>
          <div className="tree">
            {rows.map((cat, rowIndex) => {
              const open = openId === cat.id;
              const dragStyle: React.CSSProperties | undefined = (() => {
                if (!drag || drag.group !== group) return undefined;
                if (drag.id === cat.id) return { transform: `translateY(${drag.dy}px)` };
                if (drag.from < rowIndex && rowIndex <= drag.to) return { transform: `translateY(${-drag.rowH}px)` };
                if (drag.to <= rowIndex && rowIndex < drag.from) return { transform: `translateY(${drag.rowH}px)` };
                return undefined;
              })();
              const dragClass = drag && drag.group === group ? (drag.id === cat.id ? "is-drag-src" : "is-drag-shift") : undefined;
              // 1.3.251: la fila anuncia sus fijas en reposo — la categoría misma o
              // cualquiera de sus subs fijada deja esta marca junto al nombre, para
              // que las fijas se puedan ENCONTRAR sin abrir cada editor.
              const catPinned = (session?.ledger.settings.widgetPins ?? []).some((p) => p.c === cat.id);
              return (
                <div key={cat.id} data-row className={[cat.hidden ? "is-muted" : "", dragClass ?? ""].join(" ").trim() || undefined} style={dragStyle}>
                  <button type="button" className="tree-row" data-anchor={group === "fixed" && rowIndex === 0 ? "est-cat" : undefined} aria-expanded={open}
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={(e) => onRowPointerDown(e, cat, group, rowIndex, rows.length)}
                    onPointerMove={onRowPointerMove}
                    onPointerUp={onRowPointerUp}
                    onPointerCancel={onRowPointerUp}
                    onLostPointerCapture={onRowPointerUp}
                    onClick={(e) => {
                      if (swallowClickRef.current) { swallowClickRef.current = false; return; }
                      // 1.3.179: cerrar la tarjeta (esta fila) o saltar a otra pasa por la
                      // salida de la tarjeta abierta — con trabajo sin aplicar manda su aviso.
                      if (open) { panelExitRef.current?.(false); return; }
                      // 1.3.223: el salto a otra fila viaja en el `after` de la salida —
                      // la fila nueva abre cuando la tarjeta terminó de plegarse (o
                      // tras su confirmación si hay trabajo sin aplicar), como la
                      // navegación del dock desde la 1.3.182; ya no depende de que
                      // el plegado sea síncrono.
                      // 1.3.261: el salto entrega además SU fila (la tocada) como
                      // ancla — el plegado la mantiene quieta en pantalla
                      // (startAnchorReturn); el aviso, si lo hay, sigue mandando
                      // primero: el ancla solo se lee cuando el pliegue corre.
                      if (openId !== null) { const exit = panelExitRef.current; if (exit) { exit(false, () => setOpenId(cat.id), e.currentTarget); return; } }
                      setOpenId(cat.id);
                    }}>
                    <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
                    <span className="min-w-0">
                      <span className="tree-name"><PiecePlate color={categoryColor(cat.id, cat.color)} icon={namedIconFor(cat)} />{displayName(cat, lang)}{catPinned ? <Pin size={12} className="tree-pinmark" fill="currentColor" aria-hidden /> : null}</span>
                      {/* 1.3.188 (R-7, cierra E-7): el subtítulo sigue listando TODOS los
                          subconceptos (la fila es el mapa completo), pero los ocultos se
                          pintan atenuados con la misma tinta is-muted de la categoría
                          oculta — la fila ya no los anuncia como si vivieran. */}
                      <span className="tree-subs">{cat.subs.length ? treeSubLine(cat, lang).map((s, i) => (<Fragment key={s.id}>{i > 0 ? " · " : null}<span className={s.hidden ? "is-muted" : undefined}>{s.name}</span></Fragment>)) : "—"}</span>
                    </span>
                  </button>
                  {open ? <TreePanel cat={cat} onClose={() => setOpenId(null)} exitRef={panelExitRef} /> : null}
                </div>
              );
            })}
          </div>
          </FoldShell>
        </div>
        );
      })}
      {/* 1.3.225 (pedido de Oscar): «Nueva categoría» deja de ser un campo
          abierto al final del árbol — gana una tarjeta-puerta tercera bajo
          Gastos variables y nace plegada como ellos; el formulario vive
          dentro, entero. 1.3.227 (su corrección con foto): la puerta NO
          puede parecer una categoría principal más — pierde el material de
          las principales (sin relleno, sin luz de arriba, sin medallón) y
          queda como una puerta discreta: borde de puntos, título menor en
          tono muted y un «+» en un aro fino que gira a × al abrirse. Menos
          importante a la vista, igual de puerta al tacto. */}
      <div className="tree-kicker tree-kick-row tree-kick-add">
        <button type="button" className="tree-group-btn" aria-expanded={addOpen} onClick={() => setAddOpen((v) => !v)}>
          <span className={addOpen ? "tree-add-medal is-open" : "tree-add-medal"}><Plus /></span>
          <span className="tree-group-name">{t("add.cat")}</span>
        </button>
        <FieldTip topic="f-cat-arbol" />
      </div>
      <FoldShell open={addOpen}>
      <div className="ah-form sc-form is-treecat">
        <div className="ah-grid">
          <label className="label is-wide">
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
          <button type="button" className="btn secondary" onClick={() => { setCatName(""); setCatGroup("fixed"); setAddOpen(false); }}>{t("cancel")}</button>
          <button type="button" className="btn" disabled={!catName.trim()} onClick={addCat}>{t("save")}</button>
        </div>
      </div>
      </FoldShell>
    </div>
  );
}

function TreePanel({ cat, onClose, exitRef }: { cat: Category; onClose: () => void; exitRef: { current: PanelExit | null } }) {
  const { t, lang, session, commit, confirm } = useFaro();
  const [name, setName] = useState(displayName(cat, lang));
  const [subName, setSubName] = useState("");
  const [editSub, setEditSub] = useState<string | null>(null);
  const [subEdit, setSubEdit] = useState("");
  // 1.3.179: visibilidad PREPARADA (subId -> hidden deseado, solo si difiere de lo guardado).
  const [stagedVis, setStagedVis] = useState<Record<string, boolean>>({});
  // 1.3.186 (R-1 de la auditoría de Estructura, cierra E-1): la CATEGORÍA también
  // tiene su ojo, preparado con el mismo modelo — stagedCatVis es su hidden
  // deseado SOLO si difiere del guardado (null = nada preparado). Hasta aquí una
  // categoría oculta no podía volver a mostrarse por ningún control: los
  // selectores la filtran incluso administrando y esta tarjeta no tenía ojo para
  // ella, así que esconderla era una puerta de un solo sentido (solo Deshacer,
  // dentro de la sesión, la rescataba). Guardar lo escribe por el mismo camino
  // markUserVis de los subconceptos, con su valor, en el mismo commit.
  const [stagedCatVis, setStagedCatVis] = useState<boolean | null>(null);
  // 1.3.188 (R-6, cierra E-6): las subcategorías nuevas también se PREPARAN
  // (stagedSubs: nombres en orden, visibles en la tarjeta como filas pendientes
  // con su ✕ para quitarlas) y los renombres de subconcepto igual (stagedNames:
  // subId -> nombre nuevo, solo si difiere del visible). El Enter ya no crea ni
  // guarda nada por ningún camino: Guardar es el único commit de la tarjeta.
  const [stagedSubs, setStagedSubs] = useState<string[]>([]);
  const [stagedNames, setStagedNames] = useState<Record<string, string>>({});
  // 1.3.246: las fijas del widget también se PREPARAN (stagedPins: "catId|subId" ->
  // fijada deseada, solo si difiere de lo guardado) y Guardar las confirma en el MISMO
  // commit que todo lo demás de la tarjeta — un solo Deshacer para el gesto entero.
  // Las fijas viven en los ajustes del libro (settings.widgetPins), no en la Estructura:
  // por eso no viajan dentro de CardEdits sino junto a él en la misma receta.
  const [stagedPins, setStagedPins] = useState<Record<string, boolean>>({});
  const savedPins = session?.ledger.settings.widgetPins;
  const pinKeyOf = (subId: string) => `${cat.id}|${subId}`;
  const effPin = (subId: string) => stagedPins[pinKeyOf(subId)] ?? hasWidgetPin(savedPins, cat.id, subId);
  const stagePin = (subId: string) => {
    const next = !effPin(subId);
    setStagedPins((prev) => {
      const copy = { ...prev };
      if (next === hasWidgetPin(savedPins, cat.id, subId)) delete copy[pinKeyOf(subId)]; else copy[pinKeyOf(subId)] = next;
      return copy;
    });
  };
  // 1.3.260 (pedido de Oscar): el botón de anclaje PREGUNTA — como el ojo que
  // oculta desde la 1.3.223 (askHide, en esta misma tarjeta), la ventana de la
  // casa llega al tocar y su run es quien PREPARA: cancelar no prepara nada y
  // Guardar sigue siendo el único commit (la suciedad de la tarjeta y sus
  // salidas guardadas no cambian). Fijar y desfijar preguntan los dos — su
  // orden: «cuando se activa y se desactiva» — cada uno con su explicación
  // sencilla de a dónde va el nombre (la tarjeta de apuntes de la pantalla de
  // inicio) y de que el libro no cambia. El cuerpo lleva la frase de Guardar
  // de las ventanas de ocultar, y con el ejemplo activo suma la verdad del
  // ejemplo (1.3.258): la fija caería en el libro de ejemplo y el widget
  // enseña el real — las dos verdades se encuentran antes de preparar nada.
  const askPin = (subId: string) => {
    const next = !effPin(subId);
    const sub = subId ? cat.subs.find((x) => x.id === subId) : undefined;
    const name = sub ? `${displayName(cat, lang)} · ${displayName(sub, lang)}` : displayName(cat, lang);
    confirm({
      title: t(next ? "widget.pin.ask.title" : "widget.pin.ask.offTitle").replace("{name}", name),
      body: t(next ? "widget.pin.ask.body" : "widget.pin.ask.offBody") + " " + t("widget.pin.ask.staged") + (sampleOn() ? " " + t("widget.pin.sample") : ""),
      yes: next ? t("widget.pin.ask.yes") : t("widget.pin.remove"),
      run: () => stagePin(subId),
    });
  };
  const rootRef = useRef<HTMLDivElement>(null);
  // 1.3.143: the colour palette lives folded behind one point (Oscar: deployed swatches took over the
  // panel); tapping the point opens the same ColorPick as everywhere, picking folds it back up.
  const [colorOpen, setColorOpen] = useState(false);
  // Congruency pass (Oscar, 2026-11-11): a sub row at rest carries only the little pen on its name and
  // ONE fold icon; its tools (eye, its own colour, trash) unfold from it — one sub open at a time.
  const [toolsForSub, setToolsForSub] = useState<string | null>(null);
  const [subColorId, setSubColorId] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [subIconId, setSubIconId] = useState<string | null>(null);
  // 1.3.176 (pedido de Oscar): Cancelar PLIEGA la tarjeta — antes solo borraba el
  // borrador de subcategoría y la tarjeta quedaba abierta, como si no hiciera nada
  // (con el borrador vacío no cambiaba ni un estado). La política es la única de la
  // oleada de botones 4: se pregunta solo si hay trabajo SIN APLICAR.
  // 1.3.179 (su modelo, textual): los ojos ya NO aplican al instante — se PREPARAN
  // en la tarjeta (stagedVis): la fila muestra el estado nuevo y Guardar se
  // enciende, pero nada llega al libro (ni Sub.hidden ni structure.userVis) hasta
  // que él guarda; Guardar confirma lo preparado junto con la subcategoría
  // escrita, por el mismo camino markUserVis de siempre, así que la precedencia
  // de la 1.3.131 queda bit a bit. La bolsa de descarte lleva los borradores de
  // siempre (el nombre aún no confirmado con ✓ — su línea base se renueva cuando
  // el ✓ guarda —, la subcategoría a medio escribir y un renombre a mitad de
  // teclear) MÁS la visibilidad preparada. Lo demás sigue aplicando al instante
  // (el ✓ del nombre, el color, los renombres, los borrados con su aviso de la
  // 1.3.178) y Cancelar jamás lo revierte: no hay copia a la que volver.
  // Y al plegar con Cancelar, revealRow lo deja en la fila de su categoría
  // («que me deje justamente donde comencé»): la fila se trae a la vista con el
  // mismo revealEditor de siempre (descontando la franja superior pegajosa).
  // 1.3.188 (R-6): la bolsa de descarte crece con el modelo — lleva también las
  // subcategorías preparadas y los renombres preparados, y el nombre de la
  // categoría pasa a ser un borrador como los demás (su línea base se renueva
  // cuando GUARDAR lo escribe, ya no cuando un ✓ lo confirmaba al instante).
  // Desde esta oleada lo único que sigue aplicando al instante en la tarjeta es
  // el color y la papelera con su aviso de la 1.3.178: son gestos con su propia
  // confirmación o su propia casa, y Cancelar jamás los revierte.
  const nameBaseRef = useRef(displayName(cat, lang));
  const editingSub = editSub ? cat.subs.find((x) => x.id === editSub) : undefined;
  const stagedIds = Object.keys(stagedVis);
  const panelDirty = formDirty(
    { name: nameBaseRef.current, sub: "", edit: "", vis: {} as Record<string, boolean>, catVis: null as boolean | null, newSubs: [] as string[], renames: {} as Record<string, string>, pins: {} as Record<string, boolean> },
    { name, sub: subName, edit: editingSub && subEdit !== (stagedNames[editingSub.id] ?? displayName(editingSub, lang)) ? subEdit : "", vis: stagedVis, catVis: stagedCatVis, newSubs: stagedSubs, renames: stagedNames, pins: stagedPins },
  );
  const revealRow = () => {
    const row = rootRef.current?.closest("[data-row]");
    if (row) revealEditor(row as HTMLElement);
  };
  // 1.3.225 (pedido de Oscar): el regreso de Cancelar era el salto feo de la
  // tarjeta. Eran DOS tirones, no uno: el plegado respiraba .3s y DESPUÉS
  // revealEditor deslizaba toda la pantalla (dos scrolls suaves encadenados)
  // para «ubicar» la categoría, incluso cuando la fila nunca había salido de
  // la pantalla — y al desmontar, la capa devolvía su entrada de historial
  // (lib/manual/back.ts) y el navegador restauraba el scroll de la entrada
  // anterior, que es la posición de cuando la tarjeta se ABRIÓ: si él había
  // bajado leyendo la tarjeta, ese tirón lo devolvía de golpe adonde empezó
  // a abrirla. Cazado en banco fotograma a fotograma (el scroll aterrizaba
  // perfecto y el tirón llegaba en el mismo fotograma del desmonte, sin
  // llamada JS de por medio). Ahora el retorno se decide ANTES de plegar,
  // corre CON el plegado — un solo movimiento — y se defiende al desmontar:
  //  · si la fila ya se ve entera bajo la franja superior, la página NO se
  //    mueve — donde comenzó es donde está («donde comencé», su ley);
  //  · si quedó fuera (tarjeta alta, él bajó hasta Cancelar), el scroll
  //    viaja con la misma duración y la misma curva del plegado y aterriza
  //    la fila donde revealEditor la deja (bajo la franja + 8);
  //  · al desmontar, el settle (un rAF y un segundo pase a los 90ms, ambos
  //    con guarda de deriva) reafirma el destino y pisa la restauración
  //    del navegador antes de que se pinte;
  //  · su dedo manda: un toque o una rueda durante el retorno lo cancela
  //    todo, retorno y settle.
  // La fila que él ve es el BOTÓN (.tree-row); el [data-row] que la envuelve
  // contiene también la tarjeta abierta, así que su rectángulo siempre
  // «sobresale» por abajo — medirlo a él disparaba el retorno incluso con la
  // fila perfectamente a la vista (primera versión, cazada con espías).
  // El camino síncrono (movimiento reducido) conserva revealRow intacto.
  const settleLiveRef = useRef(false);
  const startReturn = (panel: HTMLElement): { settle: () => void; disarm: () => void } | null => {
    const wrap = panel.closest("[data-row]") as HTMLElement | null;
    const row = (wrap?.querySelector("button.tree-row") ?? wrap) as HTMLElement | null;
    if (!row) return null;
    let box: HTMLElement | null = row.parentElement;
    while (box) {
      const style = getComputedStyle(box);
      if (/(auto|scroll)/.test(style.overflowY) && box.scrollHeight > box.clientHeight + 8) break;
      box = box.parentElement;
    }
    const getY = () => (box ? box.scrollTop : window.scrollY);
    const setY = (y: number) => { if (box) box.scrollTop = y; else window.scrollTo(0, y); };
    const maxY = () => Math.max(0, box ? box.scrollHeight - box.clientHeight : document.documentElement.scrollHeight - window.innerHeight);
    const chrome = document.querySelector(".top-chrome")?.getBoundingClientRect().height ?? 72;
    const viewTop = box ? box.getBoundingClientRect().top : 0;
    const viewBottom = box ? box.getBoundingClientRect().bottom : window.innerHeight;
    const yKeep = getY();
    settleLiveRef.current = true;
    const stop = () => {
      settleLiveRef.current = false;
      if (scrollAnimRef.current !== null) { window.cancelAnimationFrame(scrollAnimRef.current); scrollAnimRef.current = null; }
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    const disarm = () => { window.removeEventListener("touchstart", stop); window.removeEventListener("wheel", stop); };
    const settleTo = (target: () => number) => () => {
      if (!settleLiveRef.current) return;
      const to = Math.max(0, Math.min(target(), maxY()));
      if (Math.abs(getY() - to) > 1) setY(to);
    };
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top >= viewTop + chrome && rowRect.bottom <= viewBottom + 1) {
      return { settle: settleTo(() => yKeep), disarm };
    }
    const cur = yKeep;
    const targetFor = () => { const r = row.getBoundingClientRect(); const vt = box ? box.getBoundingClientRect().top : 0; return getY() + (r.top - vt) - chrome - 8; };
    const target = Math.max(0, cur + (rowRect.top - viewTop) - chrome - 8);
    const maxAfter = Math.max(0, maxY() - Math.round(panel.getBoundingClientRect().height));
    const to = Math.min(target, maxAfter);
    const landed = { settle: settleTo(targetFor), disarm };
    if (Math.abs(to - cur) < 2) return landed;
    const t0 = performance.now();
    const step = (now: number) => {
      // 1.3.284: la duración es la del pliegue de la familia (225ms de cierre).
      const p = Math.min(1, (now - t0) / 225);
      setY(cur + (to - cur) * easeHouse(p));
      if (p < 1) { scrollAnimRef.current = window.requestAnimationFrame(step); }
      else { scrollAnimRef.current = null; }
    };
    scrollAnimRef.current = window.requestAnimationFrame(step);
    return landed;
  };
  // 1.3.261 (pedido de Oscar): el SALTO a otra categoría era el movimiento
  // duro que quedaba. La tarjeta abierta se pliega animada desde la 1.3.223,
  // pero la fila que él toca vive DEBAJO de la tarjeta: al caer esta, la fila
  // vuela hacia arriba toda la altura del panel (en su teléfono, más que la
  // pantalla entera) y aterriza donde el pliegue la deja, sin que nadie
  // acompañe el desplazamiento — dos mareas seguidas, la suya y la de la
  // tarjeta nueva que empuja al abrir. El retorno de Cancelar (1.3.225) ya
  // resolvió este mismo problema para la fila PROPIA; el salto lo resuelve
  // para la fila DESTINO con el mismo idioma: mientras la tarjeta cae, el
  // desplazamiento de la caja cede en cada fotograma exactamente lo que el
  // pliegue ya cedió (la altura se lee viva — la curva que manda es la del
  // propio pliegue), de modo que la fila tocada ni sube ni baja: el mundo se
  // desliza una sola vez y la tarjeta nueva crece bajo su dedo. Si la fila
  // destino vive POR ENCIMA de la tarjeta, el pliegue no la mueve y su salto
  // ya nace quieto: no hay acompañamiento. Su dedo manda, como en el
  // retorno: un toque o una rueda lo cancela todo, acompañamiento y settle;
  // al desmontar, el settle reafirma el sitio de la fila contra la
  // restauración de scroll del navegador, con su segundo pase a los 90ms.
  const startAnchorReturn = (panel: HTMLElement, anchor: HTMLElement): { settle: () => void; disarm: () => void } | null => {
    if (!(panel.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING)) return null;
    let box: HTMLElement | null = anchor.parentElement;
    while (box) {
      const style = getComputedStyle(box);
      if (/(auto|scroll)/.test(style.overflowY) && box.scrollHeight > box.clientHeight + 8) break;
      box = box.parentElement;
    }
    const getY = () => (box ? box.scrollTop : window.scrollY);
    const setY = (y: number) => { if (box) box.scrollTop = y; else window.scrollTo(0, y); };
    const maxY = () => Math.max(0, box ? box.scrollHeight - box.clientHeight : document.documentElement.scrollHeight - window.innerHeight);
    const inBoxTop = () => { const r = anchor.getBoundingClientRect(); const vt = box ? box.getBoundingClientRect().top : 0; return r.top - vt; };
    const heldTop = inBoxTop();
    const startY = getY();
    const hStart = panel.getBoundingClientRect().height;
    if (startY <= 0) return null; // sin desplazamiento que ceder, la fila sube con el pliegue como siempre — nada que acompañar
    anchorLiveRef.current = true;
    const stop = () => {
      anchorLiveRef.current = false;
      if (anchorAnimRef.current !== null) { window.cancelAnimationFrame(anchorAnimRef.current); anchorAnimRef.current = null; }
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    const disarm = () => { window.removeEventListener("touchstart", stop); window.removeEventListener("wheel", stop); };
    const tick = () => {
      if (!anchorLiveRef.current) return;
      if (!panel.isConnected) { anchorAnimRef.current = null; return; }
      const fallen = hStart - panel.getBoundingClientRect().height;
      const want = Math.max(0, Math.min(startY - fallen, maxY()));
      if (Math.abs(getY() - want) > 0.5) setY(want);
      anchorAnimRef.current = window.requestAnimationFrame(tick);
    };
    anchorAnimRef.current = window.requestAnimationFrame(tick);
    const settle = () => {
      if (!anchorLiveRef.current || !anchor.isConnected) return;
      const to = Math.max(0, Math.min(getY() + (inBoxTop() - heldTop), maxY()));
      if (Math.abs(getY() - to) > 1) setY(to);
    };
    return { settle, disarm };
  };
  // 1.3.223 (pedido de Oscar): el plegado de la tarjeta ya no es un corte seco —
  // finish() pliega animada y SOLO al final desmonta; con movimiento reducido
  // (o sin nodo) pliega al momento, como siempre.
  // 1.3.284: la animación ya no la hace la propia tarjeta (altura medida +
  // .is-closing) sino la concha, con la rejilla y los tokens de la familia —
  // finish() solo cambia la fase y desmonta cuando la concha aterriza.
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const scrollAnimRef = useRef<number | null>(null);
  // 1.3.261: el acompañamiento del salto (startAnchorReturn) — su fotograma
  // en curso y su guarda de vida, hermanos de los del retorno de la 1.3.225.
  const anchorAnimRef = useRef<number | null>(null);
  const anchorLiveRef = useRef(false);
  useEffect(() => () => { if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current); if (scrollAnimRef.current !== null) window.cancelAnimationFrame(scrollAnimRef.current); if (anchorAnimRef.current !== null) window.cancelAnimationFrame(anchorAnimRef.current); anchorLiveRef.current = false; }, []);
  // 1.3.284 (pedido de Oscar): la tarjeta entra en la familia de pliegues de
  // la 1.3.231 — su fase es la de FoldShell: nace plegada (shown=false) y el
  // doble rAF la muestra para que la rejilla 0fr→1fr de la concha (.tree-open)
  // la despliegue; finish() la repliega por el mismo camino (shown=false).
  // La apertura WAAPI de la 1.3.223 se retira: la fase resuelve lo que aquella
  // resolvía (la transición CSS que no arrancaba en un nodo recién montado)
  // sin animar la altura a mano ni fijarla — el contenido sigue libre de
  // cambiar de alto al editar. Con movimiento reducido nace abierta.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => { raf2 = window.requestAnimationFrame(() => setShown(true)); });
    return () => { window.cancelAnimationFrame(raf1); if (raf2) window.cancelAnimationFrame(raf2); };
  }, []);
  // La única salida de la tarjeta: devuelve true SOLO si plegó al momento (el
  // camino síncrono); si el plegado va animado o el aviso está en pie, devuelve
  // false y el final llega dentro de finish() — quien tenga una navegación la
  // entrega en `after`, jamás la corre por su cuenta tras la llamada. `reveal`
  // solo lo pide Cancelar; el chevron de la fila, el Back/Esc (la capa) y el
  // pliegue del grupo salen por aquí sin scroll, porque su dedo ya está en la
  // fila o en el grupo.
  // 1.3.182: `after` es la navegación de quien desmonta la tarjeta desde fuera
  // (el dock, el pliegue de la sección): viaja AL FINAL de finish() — corre
  // cuando la tarjeta ya plegó, sea limpia o tras su confirmación (sucia); si
  // rechaza el aviso, finish nunca corre y la navegación tampoco.
  const exitPanel = (reveal: boolean, after?: () => void, anchor?: HTMLElement | null): boolean => {
    if (closingRef.current) return false;
    const done = () => { onClose(); if (reveal) revealRow(); if (after) after(); };
    const finish = (): boolean => {
      const el = rootRef.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done(); return true; }
      // 1.3.284: la fase se invierte donde la concha esté — si la salida llega
      // a media apertura, la rejilla parte de su altura actual y sigue; no se
      // mide ni se fija altura alguna (la coreografía de la 1.3.223 — altura
      // medida, .is-closing, altura a 0 — se retiró con el pliegue brusco).
      closingRef.current = true;
      setShown(false);
      // 1.3.225: el retorno de Cancelar se coreografía CON el plegado
      // (startReturn) — si corre, al desmontar ya no hay revealRow: la fila
      // quedó en su sitio, y el settle defiende ese sitio de la restauración
      // de scroll que trae la devolución de la entrada de historial.
      // 1.3.261: el salto a otra categoría trae su propio retorno
      // (startAnchorReturn) anclado en la fila destino — el mismo asiento
      // en el temporizador: su settle defiende el sitio de ESA fila.
      // 1.3.284: ambos retornos leen la altura viva de la CONCHA (el es la
      // raíz .tree-open), que ahora cae con la rejilla — su diseño ya era
      // agnóstico a la curva. El temporizador es el aterrizaje de la
      // familia: 225ms de cierre + 30 de desfase, el de FoldShell.
      const ret = reveal ? startReturn(el) : anchor ? startAnchorReturn(el, anchor) : null;
      closeTimerRef.current = window.setTimeout(() => {
        onClose();
        if (reveal && !ret) revealRow();
        if (ret) { const s = ret.settle; requestAnimationFrame(() => s()); window.setTimeout(() => { s(); ret.disarm(); }, 90); }
        if (after) after();
      }, 255);
      return false;
    };
    if (!panelDirty) return finish();
    confirm({ title: t("entry.leave"), body: name.trim() || t("entry.this"), yes: t("entry.leave.yes"), run: () => { finish(); } });
    return false;
  };
  const exitSelfRef = useRef(exitPanel);
  exitSelfRef.current = exitPanel;
  exitRef.current = exitPanel;
  useEffect(() => () => { if (exitRef.current === exitSelfRef.current) exitRef.current = null; }, [exitRef]);
  // 1.3.182: la misma salida queda registrada fuera del árbol (panel-exit) para
  // las dos puertas que la 1.3.179 no alcanzaba desde StructureTree — el dock y
  // el pliegue de la sección de Ajustes — que desmontan Ajustes entero. El
  // trampolín llama siempre a la salida viva (exitSelfRef), como el resto.
  useEffect(() => {
    const trampoline: PanelExit = (reveal, after, anchor) => exitSelfRef.current(reveal, after, anchor);
    setPanelExit(trampoline);
    return () => clearPanelExit(trampoline);
  }, []);
  const cancelPanel = () => { exitPanel(true); };
  // El renombre en curso es su propia capa (como en el resto de la app): un
  // Back/Esc lo cancela a él primero; el siguiente llega a la salida de la tarjeta.
  useLayer(editSub !== null, () => setEditSub(null));
  // 1.3.223 (pedido de Oscar): ocultar ya no es un gesto mudo — cuando el toque
  // PREPARA una ocultación, un aviso dice antes qué hace el ojo: dónde deja de
  // aparecer la pieza, que sus movimientos pasan a «Otros», que nada se borra
  // y que el cambio se aplica al Guardar. Mostrar nunca pregunta: enseñar no
  // esconde nada. 1.3.225 (su caso «Automotriz», con foto): la 223 solo
  // preguntaba ante una ocultación NUEVA respecto al estado guardado — una
  // pieza nacida oculta, mostrada y vuelta a ocultar en la misma sesión se
  // saltaba la ventana, porque el toque «solo» restauraba su estado guardado.
  // Desde su asiento, ocultar es ocultar: pregunta TODO toque cuyo resultado
  // es la pieza oculta, sin excepciones.
  const askHide = (name: string, bodyKey: string, stage: () => void) =>
    confirm({ title: t("hide.title").replace("{name}", name), body: t(bodyKey), yes: t("hide"), run: stage });
  const toggleVis = (sub: Sub) => {
    const eff = stagedVis[sub.id] ?? sub.hidden;
    const next = !eff;
    const stage = () => setStagedVis((prev) => {
      const copy = { ...prev };
      if (next === sub.hidden) delete copy[sub.id]; else copy[sub.id] = next;
      return copy;
    });
    if (next) { askHide(displayName(sub, lang), "hide.sub.body", stage); return; }
    stage();
  };
  // 1.3.186: el ojo de la categoría prepara igual que el de un subconcepto —
  // tocarlo de vuelta a su estado guardado DESPREPARA (la tarjeta queda limpia).
  const effCatHidden = stagedCatVis ?? cat.hidden;
  const toggleCatVis = () => {
    const next = !effCatHidden;
    const stage = () => setStagedCatVis(next === cat.hidden ? null : next);
    if (next) { askHide(displayName(cat, lang), "hide.cat.body", stage); return; }
    stage();
  };
  // Guardar confirma TODO lo pendiente de la tarjeta en un solo commit — esa
  // es su única escritura desde la 1.3.179 para la visibilidad (preparada,
  // escrita por el camino de los ojos: markUserVis por valor, para que cada id
  // quede registrado con SU valor, como N toques de ojo habrían dejado el
  // libro — solo que en un paso de Deshacer, el de este Guardar).
  // 1.3.186: el ojo de la categoría viaja en el MISMO commit y por el mismo
  // camino (su hidden + markUserVis con su id y su valor).
  // 1.3.188 (R-6): el commit crece hasta ser el ÚNICO de la tarjeta — lleva
  // también el nombre de la categoría si cambió, los renombres preparados y
  // las subcategorías preparadas MÁS la que esté escrita en el campo en ese
  // momento (applyCardEdits lo aplica todo de una vez; un Deshacer lo
  // revierte entero). Guardado, la línea base del nombre se renueva y toda la
  // preparación se vacía: la tarjeta queda limpia.
  const nameStaged = name.trim() !== "" && name.trim() !== displayName(cat, lang);
  const hasStaged = nameStaged || !!subName.trim() || stagedSubs.length > 0 || stagedIds.length > 0 || stagedCatVis !== null || Object.keys(stagedNames).length > 0 || Object.keys(stagedPins).length > 0;
  const savePanel = () => {
    if (!hasStaged) return;
    const fresh = [...stagedSubs, ...(subName.trim() ? [subName.trim()] : [])];
    const edits: CardEdits = {
      ...(nameStaged ? { name: name.trim() } : {}),
      ...(stagedCatVis !== null ? { catHidden: stagedCatVis } : {}),
      ...(stagedIds.length ? { subHidden: stagedVis } : {}),
      ...(Object.keys(stagedNames).length ? { subNames: stagedNames } : {}),
      ...(fresh.length ? { newSubs: fresh } : {}),
    };
    const pinChanges = Object.entries(stagedPins);
    commit((s) => {
      let next: LedgerState = { ...s, structure: applyCardEdits(s.structure, cat.id, edits, () => uid().slice(0, 6)) };
      // 1.3.246: las fijas preparadas se escriben en el MISMO commit (los ajustes del
      // libro viajan junto a la Estructura; un Deshacer revierte el gesto entero).
      if (pinChanges.length) {
        let pins = next.settings.widgetPins ?? [];
        for (const [k, on] of pinChanges) {
          const [c, sub] = k.split("|");
          if (hasWidgetPin(pins, c, sub ?? "") !== on) pins = toggleWidgetPin(pins, c, sub ?? "");
        }
        next = { ...next, settings: { ...next.settings, widgetPins: pins } };
      }
      return next;
    }, fresh[0] || edits.name || stagedIds[0] || cat.id);
    setSubName("");
    setStagedSubs([]);
    setStagedNames({});
    if (stagedIds.length) setStagedVis({});
    if (stagedCatVis !== null) setStagedCatVis(null);
    // 1.3.258: si el gesto llevó fijas, la foto del widget se refresca AL MOMENTO,
    // síncrona con el Guardar — el efecto del anfitrión ya la reempuja al cambiar
    // el libro (700 ms), esto es el cinturón además de los tirantes para que el
    // empujón nazca del propio gesto de fijar.
    if (pinChanges.length) { setStagedPins({}); window.dispatchEvent(new Event(WIDGET_REFRESH)); }
    nameBaseRef.current = name;
  };
  // 1.3.188 (R-6): el Enter del campo de subcategoría nueva ya NO crea nada al
  // instante (ese era el segundo camino silencioso de E-6, un commit propio
  // fuera del modelo preparado y de la guardia de descarte): mueve el texto a
  // la lista de preparadas, que se ven en la tarjeta como filas pendientes, y
  // Guardar las crea junto con todo lo demás en el mismo commit.
  const stageSub = () => {
    const next = subName.trim();
    if (!next) return;
    setStagedSubs((prev) => [...prev, next]);
    setSubName("");
  };
  // 1.3.188 (R-6): el Enter del renombre de un subconcepto tampoco guarda al
  // instante — prepara el nombre nuevo (la fila lo pinta, como pinta el estado
  // nuevo de un ojo preparado) y Guardar lo confirma. Teclear de vuelta el
  // nombre visible desprepara, igual que un ojo que vuelve a su estado.
  const stageSubName = (sub: Sub) => {
    const next = subEdit.trim();
    if (next) {
      setStagedNames((prev) => {
        const copy = { ...prev };
        if (next === displayName(sub, lang)) delete copy[sub.id]; else copy[sub.id] = next;
        return copy;
      });
    }
    setEditSub(null);
  };
  function patch(run: (cat: Category) => Category, detail: string) {
    commit((s) => ({
      ...s,
      structure: { ...s.structure, categories: s.structure.categories.map((c) => c.id === cat.id ? run(c) : c) },
    }), detail);
  }
  // 1.3.178 (decisión de Oscar sobre el punto 1 del catálogo de la 1.3.177): la papelera
  // del árbol retira el subconcepto Y sus líneas — borrar es borrar, en todas las
  // superficies y para siempre; hasta la 1.3.177 las líneas quedaban huérfanas y seguían
  // saliendo en Central con su propio nombre. El aviso lo dice ANTES de quemar nada: sin
  // líneas, como siempre; con líneas, el conteo y el total por moneda (subLinesSummary,
  // sin convertir ni mezclar monedas). Lo retirado es exactamente el mismo conjunto que
  // retira la papelera de la fila del banco en el escritorio (dropSubLines, compartido):
  // todas las líneas del subconcepto en todos los meses, con su historial dentro (los
  // cargos viven en la línea) y sus series con ellas (una serie son líneas con el mismo
  // seriesId). El Archivo de Debo (faro-due-file) no se toca: son copias ya archivadas
  // fuera del libro, igual que con la papelera del banco. Y como el borrado es UN commit,
  // Deshacer restaura el subconcepto y sus líneas juntos, como cualquier otro cambio.
  const dropSub = (sub: Sub) => {
    const name = displayName(sub, lang);
    const summary: SubLinesSummary = session ? subLinesSummary(session.ledger, sub.id) : { count: 0, totals: [] };
    const totalsText = summary.totals.map((x) => formatMoney(x.minor, x.currency, lang)).join(" + ");
    const body = summary.count === 0
      ? name
      : `${name}. ${summary.count === 1
        ? t("delete.sub.lines.one").replace("{totals}", totalsText)
        : t("delete.sub.lines").replace("{n}", String(summary.count)).replace("{totals}", totalsText)}`;
    confirm({
      title: t("delete"),
      body,
      danger: true,
      yes: t("yes"),
      run: () => {
        // 1.3.179: si este subconcepto tenía visibilidad preparada, su preparación muere con él.
        setStagedVis((prev) => {
          if (!(sub.id in prev)) return prev;
          const copy = { ...prev };
          delete copy[sub.id];
          return copy;
        });
        // 1.3.188: y su renombre preparado muere con él, por la misma regla.
        setStagedNames((prev) => {
          if (!(sub.id in prev)) return prev;
          const copy = { ...prev };
          delete copy[sub.id];
          return copy;
        });
        commit((s) => {
          const userVis = { ...(s.structure.userVis ?? {}) };
          delete userVis[sub.id];
          return {
            ...s,
            months: dropSubLines(s.months, sub.id),
            structure: { ...s.structure, userVis, categories: s.structure.categories.map((c) => (c.id === cat.id ? { ...c, subs: c.subs.filter((x) => x.id !== sub.id) } : c)) },
          };
        }, sub.id);
      },
    });
  };
  // THE GRID FOR THE SUBS (Oscar, 2026-11-11 — "No. GRID"): the subcategories take the SAME
  // system as the Catalog, the night's invention, whole. Cards in columns counted by the width
  // of their house (this panel, not the screen): 2 on the phone, more as the house widens; a
  // card never stretches, a new column appears instead. At rest a card carries only its plate
  // and its name — the faces stay; they ARE the cards' faces. The card itself is the door:
  // tapped, it blooms across its whole row with the tight hand inside (pen · palette · eye ·
  // red trash — the Catalog's cluster, the Catalog's measures); its row-mates drop below the
  // stripe and the rest re-pack: no gaps, open or closed. The old one-column list is retired
  // in this panel; nothing else changes its law — renames and eyes still stage for Guardar,
  // colour and icon still land at once, the trash still asks first.
  const subGridRef = useRef<HTMLDivElement>(null);
  const [subCols, setSubCols] = useState(2);
  useEffect(() => {
    const el = subGridRef.current;
    if (!el) return;
    const measure = () => { const w = el.clientWidth; setSubCols(w >= 840 ? 4 : w >= 580 ? 3 : 2); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const subIsOpen = (sub: Sub) => toolsForSub === sub.id || editSub === sub.id;
  const renderSubCard = (sub: Sub) => {
    // 1.3.179: la tarjeta pinta el estado PREPARADO si lo hay; el guardado manda en el libro.
    const effHidden = stagedVis[sub.id] ?? sub.hidden;
    const structure = session?.ledger.structure;
    return (
      <div key={sub.id} data-anchor={sub.id === cat.subs[0]?.id ? "est-sub" : undefined} className={"sub-card" + (subIsOpen(sub) ? " is-open" : "") + (effHidden ? " is-muted" : "")} onClick={(e) => {
        if (editSub === sub.id) return;
        // 1.3.269: the pin mark (.sub-pinmark) is a sign, not a button — its tap is inert
        // here, like the membership sign's in the Catalog door (1.3.230). Until this wave
        // its tap opened the sub's hand and the mark, painted only while the hand is
        // closed, vanished in the same gesture — the same lie Oscar caught in the Catalog.
        if ((e.target as HTMLElement).closest("button, input, a, .sub-pinmark")) return;
        if (toolsForSub === sub.id) { setToolsForSub(null); setSubColorId(null); setSubIconId(null); } else { setToolsForSub(sub.id); setSubIconId(null); }
      }}>
        {editSub === sub.id ? (
          <input className="field sub-rename" value={subEdit} aria-label={t("rename")} autoFocus onChange={(e) => setSubEdit(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Escape") setEditSub(null);
            if (e.key !== "Enter") return;
            stageSubName(sub); // 1.3.188: Enter PREPARA el renombre; Guardar lo confirma
          }} />
        ) : (
          <>
            {/* FACES: the card's face — the sub's plate, its own colour as the wash, its own
                glyph. Tapping it blooms the card with its icon picker open under the bloom,
                the same gesture its palette works by. */}
            {structure ? <PiecePlate color={subColorFor(structure, cat.id, sub.id)} icon={subIconFor(structure, cat.id, sub.id)} label={t("look.icon")} onClick={() => { setToolsForSub(sub.id); setSubIconId(subIconId === sub.id ? null : sub.id); }} /> : null}
            <span className="sub-name">{stagedNames[sub.id] ?? displayName(sub, lang)}</span>
            {/* 1.3.251: la fija se lee EN REPOSO — hasta hoy una sub fijada no dejaba
                rastro fuera de su mano abierta y Oscar no podía ver que la había
                fijado («no me deja»): la cadena entera funcionaba en el banco y la
                falla era de anuncio. La marca pinta el estado EFECTIVO (preparado
                o guardado), junto al nombre, sin tocar la geometría de la tarjeta. */}
            {toolsForSub !== sub.id && effPin(sub.id) ? <Pin size={12} className="sub-pinmark" fill="currentColor" aria-hidden /> : null}
            {toolsForSub === sub.id ? (
              <span className="sub-tools" data-anchor={sub.id === cat.subs[0]?.id ? "est-hand" : undefined}>
                {/* The hand — the Catalog's cluster and order: pen · palette · eye · trash. */}
                <button type="button" className="icon-btn" aria-label={t("rename")} onClick={() => { setEditSub(sub.id); setSubEdit(stagedNames[sub.id] ?? displayName(sub, lang)); }}><Pencil className="size-4" /></button>
                <button type="button" className="icon-btn" aria-label={t("color")} aria-pressed={subColorId === sub.id} onClick={() => setSubColorId(subColorId === sub.id ? null : sub.id)}><Palette className="size-4" /></button>
                <button type="button" className="icon-btn" aria-label={effHidden ? t("show") : t("hide")} onClick={() => toggleVis(sub)}>{effHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
                {/* 1.3.246: la fija del subconcepto — se PREPARA como su ojo (la mano la
                    ofrece junto a él) y Guardar la confirma; el pin lleno la anuncia.
                    1.3.251: el anuncio se completa — el botón lleva la clase pin-btn
                    (su fondo de «pulsado» en styles.css) y su nombre ACCESIBLE cambia
                    con el estado: «Fijada en el widget» cuando está puesta, la frase
                    que el diccionario guardaba sin uso desde 1.3.246.
                    1.3.260: desde esta ola el toque pregunta primero (askPin, como el
                    ojo desde la 1.3.223) y la ventana es quien prepara. */}
                <button type="button" className="icon-btn pin-btn" aria-label={effPin(sub.id) ? t("widget.pin.on") : t("widget.pin")} aria-pressed={effPin(sub.id)} onClick={() => askPin(sub.id)}><Pin className="size-4" fill={effPin(sub.id) ? "currentColor" : "none"} /></button>
                <button type="button" className="icon-btn line-act is-danger" aria-label={t("delete")} onClick={() => dropSub(sub)}><Trash2 className="size-4" /></button>
              </span>
            ) : null}
          </>
        )}
      </div>
    );
  };
  const renderSubPanels = (sub: Sub) => {
    const structure = session?.ledger.structure;
    if (!structure) return null;
    return (
      <Fragment key={`panels-${sub.id}`}>
        {subColorId === sub.id ? (
          <div className="sub-panel">
            <ColorPick face="solid" value={subBase(structure, cat.id, sub.id)} label={t("color")} onPick={(hex) => { patch((c) => ({ ...c, subs: c.subs.map((x) => (x.id === sub.id ? { ...x, color: hex } : x)) }), "color"); setSubColorId(null); }} />
          </div>
        ) : null}
        {subIconId === sub.id ? (
          <div className="sub-panel">
            <IconPick value={subIconFor(structure, cat.id, sub.id)} color={subColorFor(structure, cat.id, sub.id)} onPick={(name) => { patch((c) => ({ ...c, subs: c.subs.map((x) => (x.id === sub.id ? { ...x, icon: name } : x)) }), "icon"); setSubIconId(null); }} />
          </div>
        ) : null}
      </Fragment>
    );
  };
  // Chunk into rows of `subCols`; a chunk holding the open card renders it FIRST (it spans the
  // whole row), its panels right under it, and its row-mates after — they drop below the stripe
  // and the rest re-pack. No gaps, open or closed.
  const subCells: ReactNode[] = [];
  for (let i = 0; i < cat.subs.length; i += subCols) {
    const chunk = cat.subs.slice(i, i + subCols);
    const openSub = chunk.find((s) => subIsOpen(s));
    if (openSub) {
      subCells.push(renderSubCard(openSub));
      subCells.push(renderSubPanels(openSub));
      chunk.filter((s) => s.id !== openSub.id).forEach((s) => subCells.push(renderSubCard(s)));
    } else {
      chunk.forEach((s) => subCells.push(renderSubCard(s)));
    }
  }
  // 1.3.188 (R-6): las subcategorías PREPARADAS se ven en la parrilla como tarjetas pendientes
  // — la misma tarjeta que tendrán al guardar, con la cara de su categoría — con su ✕ para
  // quitarlas antes de Guardar. Todavía no existen en el libro.
  stagedSubs.forEach((n, i) => {
    subCells.push(
      <div key={`staged-${i}`} className="sub-card is-staged" data-test="staged-sub">
        <PiecePlate color={categoryColor(cat.id, cat.color)} icon={namedIconFor(cat)} />
        <span className="sub-name">{n}</span>
        <button type="button" className="icon-btn" aria-label={t("stage.remove")} onClick={() => setStagedSubs((prev) => prev.filter((_, j) => j !== i))}><X className="size-4" /></button>
      </div>
    );
  });
  return (
    <div className={shown ? "tree-open is-open" : "tree-open"} data-anchor="est-panel" ref={rootRef}>
      {/* 1.3.284: el clip de la familia — sin pintura propia, se recorta al
          plegar y la rejilla aterriza en 0 exacto; la pintura de la tarjeta
          vive un nivel adentro (.tree-open-card) y nunca se transparenta. */}
      <div className="tree-open-clip">
        <div className="tree-open-card">
      <div className={effCatHidden ? "row is-muted" : "row"}>
        {/* 1.3.188 (R-6): el nombre ya no tiene ✓ — ese botón era un segundo gesto
            de guardado con commit propio, y la tarjeta queda con UNO solo:
            Guardar. El texto del campo ES el borrador preparado; Enter solo
            cierra el gesto de teclear (suelta el foco), como el Enter del
            renombre de un subconcepto deja su nombre preparado. */}
        {/* FACES (Oscar, 2026-11-11): the category's plate beside its name — its colour's wash,
            its own glyph. Tapping it opens the icon picker, the same gesture as its colour ball
            below; the pick commits at once, like its colour does. */}
        <PiecePlate color={categoryColor(cat.id, cat.color)} icon={namedIconFor(cat)} label={t("look.icon")} onClick={() => setIconOpen((v) => !v)} />
        <input className="field" value={name} aria-label={t("rename")} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        {/* 1.3.186 (R-1): el ojo de la categoría, junto a su nombre — el mismo ojo
            de sus subconceptos, preparado igual: la fila pinta el estado nuevo
            (atenuada si quedaría oculta) y Guardar lo confirma. La categoría
            sigue sin papelera (1.3.145): esto es mostrar/ocultar, no borrar. */}
        <button type="button" className="icon-btn tree-eye" data-test="cat-eye" aria-label={effCatHidden ? t("show") : t("hide")} onClick={toggleCatVis}>{effCatHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
      </div>
      {iconOpen ? <IconPick value={namedIconFor(cat)} color={categoryColor(cat.id, cat.color)} onPick={(name) => { patch((c) => ({ ...c, icon: name }), "icon"); setIconOpen(false); }} /> : null}
      <div className="tree-color">
        <button type="button" className="tree-color-point" aria-expanded={colorOpen} onClick={() => setColorOpen((v) => !v)}>
          <i className="tree-color-ball" style={{ ["--ball" as string]: categoryColor(cat.id, cat.color) }} aria-hidden />
          <span className="tree-color-lab">{t("color")}</span>
          <span className="tree-color-hex num">{categoryBase(cat.id, cat.color).toUpperCase()}</span>
          <ChevronDown className={colorOpen ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
        </button>
        {colorOpen ? <ColorPick face="solid" value={categoryBase(cat.id, cat.color)} label={t("color")} onPick={(hex) => { patch((c) => ({ ...c, color: hex }), "color"); setColorOpen(false); }} /> : null}
      </div>
      {/* 1.3.246: la fija de la categoría misma — una fila con la geometría de la del
          color y el interruptor de la casa; se prepara como los ojos y Guardar la
          confirma en el mismo commit. Fijada, la tarjeta de apuntes la ofrece siempre.
          1.3.260: el toque de la fila pregunta primero (askPin) — la ventana explica
          a dónde va el nombre y su run prepara; la fila y su geometría no cambian.
          1.3.258: con el ejemplo activo, la fila lleva el subtítulo de la casa (el
          mismo gesto que la fila de «Datos de ejemplo» en Ajustes): la fija que aquí
          se prepare cae en el libro DE EJEMPLO y la foto del widget enseña el real —
          sin esta línea, fijar en el ejemplo era indistinguible de fijar en serio
          (la trampa del estudio faro-pinsdiag-257). La línea gobierna la tarjeta
          entera: las fijas de los subconceptos se preparan y se confirman con el
          mismo Guardar. En modo real la fila queda byte a byte como estaba. */}
      <button type="button" className="tree-pin-row smp-row" role="switch" aria-checked={effPin("")} onClick={() => askPin("")}>
        <Pin className="size-4 tree-pin-ico" aria-hidden fill={effPin("") ? "currentColor" : "none"} />
        <span className="tree-pin-lab">{effPin("") ? t("widget.pin.on") : t("widget.pin")}{sampleOn() ? <span className="tree-pin-sub">{t("widget.pin.sample")}</span> : null}</span>
        <i className="smp-switch" aria-hidden><b /></i>
      </button>
      {/* 1.3.223 (pedido de Oscar): una línea profesional separa la cabecera de
          la categoría (nombre y color) de su rejilla de subconceptos — sin ella
          las tarjetas se confunden con la categoría misma. */}
      <div className="sub-divider" aria-hidden />
      {/* 1.3.145: no bin for the category itself (Oscar: the name-and-colour editor has immunity —
          a category is not deleted as if it were a subcategory; only subcategories carry a bin). */}
      {/* The grid: cards built by the helpers above — the Catalog's system, whole. */}
      <div className="sub-grid" data-anchor="est-grid" ref={subGridRef} style={{ "--cols": subCols } as CSSProperties}>{subCells}</div>
      <div className="ah-form sc-form is-treesub">
        <div className="ah-grid">
          <label className="label is-wide">
            <span className="lab-head">{t("sc.sub")}<FieldTip topic="f-subcat" /></span>
            <input className="field" value={subName} onChange={(e) => setSubName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") stageSub(); }} placeholder={t("sc.sub.ph")} aria-label={t("add.sub")} />
          </label>
        </div>
        <div className="ah-actions">
          <button type="button" className="btn secondary" onClick={cancelPanel}>{t("cancel")}</button>
          <button type="button" className="btn" data-anchor="est-save" disabled={!hasStaged} onClick={savePanel}>{t("save")}</button>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}

/** 1.3.271: el borrador del plan de un seguro de vida — UN solo bloque de
 *  campos para el alta del catálogo y para el panel de la tarjeta, para que
 *  las dos puertas pidan exactamente lo mismo. El importe nace vacío (es del
 *  usuario o no es) y el momento no trae día fingido: sin día/semana elegidos
 *  y con importe puesto, el guardado pregunta (ins.needTiming). */
type InsDraft = { amt: string; cur: Currency; mode: "day" | "week"; day: string; week: number; src: string; start: string; note: string; bens: string[] };
function emptyInsDraft(cur: Currency): InsDraft {
  return { amt: "", cur, mode: "day", day: "", week: 0, src: "", start: "", note: "", bens: [] };
}
function cleanInsBens(values: string[]): string[] {
  return values.map((name) => name.trim()).filter(Boolean);
}
function draftFromPlan(plan: InsPlan | undefined, cur: Currency, bens: string[] = []): InsDraft {
  if (!plan) return { ...emptyInsDraft(cur), bens: [...bens] };
  return {
    amt: String(plan.amt / 100),
    cur: plan.cur,
    mode: plan.week ? "week" : "day",
    day: plan.day ? String(plan.day) : "",
    week: plan.week ?? 0,
    src: plan.src,
    start: plan.start,
    note: plan.note,
    bens: [...bens],
  };
}
type InsContactsApi = { select: (props: string[], opts: { multiple: boolean }) => Promise<{ name?: string[] }[]> };
const insContactsApi = (): InsContactsApi | null => {
  const contacts = (navigator as unknown as { contacts?: InsContactsApi }).contacts;
  return contacts && typeof contacts.select === "function" ? contacts : null;
};
function planFromDraft(d: InsDraft): { plan?: InsPlan; err?: "amount" | "timing" } {
  if (!d.amt.trim()) return {};
  const minor = parseAmount(d.amt);
  if (minor === null || minor <= 0) return { err: "amount" };
  const base = { amt: minor, cur: d.cur, src: d.src, start: d.start, note: d.note.trim() };
  if (d.mode === "day") {
    const day = Number(d.day);
    if (!Number.isInteger(day) || day < 1 || day > 31) return { err: "timing" };
    return { plan: { ...base, day } };
  }
  if (d.week < 1 || d.week > 4) return { err: "timing" };
  return { plan: { ...base, week: d.week } };
}
function InsFields({ draft, onChange, accts, t }: { draft: InsDraft; onChange: (d: InsDraft) => void; accts: { id: string; name: string }[]; t: (key: string) => string }) {
  const set = (patch: Partial<InsDraft>) => onChange({ ...draft, ...patch });
  const contacts = insContactsApi();
  // 1.3.276: dentro de la carcasa no hay selector web (su WebView no lo expone), así que el
  // botón también nace de la sonda del puente nativo: la carcasa nueva sabe traer UN nombre.
  const nativeName = nativeCanPickContactName();
  const pickBeneficiaries = async () => {
    if (contacts) {
      try {
        const picked = await contacts.select(["name"], { multiple: true });
        const names = (picked ?? []).map((contact) => (contact.name?.[0] ?? "").trim()).filter(Boolean);
        if (names.length) set({ bens: [...draft.bens, ...names] });
      } catch { /* cancelled: the typed names stay as they are */ }
      return;
    }
    // El camino nativo trae un solo nombre y llena solo ese campo; cancelar es silencio.
    const pending = nativePickContactName();
    if (!pending) return;
    const name = await pending;
    if (name) set({ bens: [...draft.bens, name] });
  };
  return (
    <>
      <div className="ah-grid">
        <label className="label">
          <span className="lab-head">{t("ins.amount")}</span>
          <span className="row">
            <input className="field" inputMode="decimal" value={draft.amt} placeholder="0.00" aria-label={t("ins.amount")} onChange={(e) => set({ amt: e.target.value })} />
            <ThemeSelect value={draft.cur} onChange={(v) => set({ cur: v as Currency })} options={[{ value: "NIO", label: "C$" }, { value: "USD", label: "$" }]} />
          </span>
        </label>
        <label className="label">
          <span className="lab-head">{t("ins.src")}</span>
          <ThemeSelect value={draft.src} onChange={(v) => set({ src: v })} options={[{ value: "", label: t("ins.src.none") }, ...accts.map((a) => ({ value: a.id, label: a.name }))]} />
        </label>
      </div>
      <div className="label">
        <span className="lab-head">{t("ins.timing")}</span>
        <div className="ah-sign" role="radiogroup" aria-label={t("ins.timing")}>
          {(["day", "week"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={draft.mode === m} aria-pressed={draft.mode === m} onClick={() => set({ mode: m })}>{t(`ins.timing.${m}`)}</button>
          ))}
        </div>
      </div>
      {draft.mode === "day" ? (
        <label className="label">
          <span className="lab-head">{t("ins.day")}</span>
          <input className="field" inputMode="numeric" value={draft.day} placeholder="8" aria-label={t("ins.day")} onChange={(e) => set({ day: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} />
        </label>
      ) : (
        <div className="label">
          <span className="lab-head">{t("ins.timing.week")}</span>
          <div className="ah-sign" role="radiogroup" aria-label={t("ins.timing.week")}>
            {[1, 2, 3, 4].map((w) => (
              <button key={w} type="button" role="radio" aria-checked={draft.week === w} aria-pressed={draft.week === w} onClick={() => set({ week: w })}>{t(`ins.week.${w}`)}</button>
            ))}
          </div>
        </div>
      )}
      <div className="ah-grid">
        <label className="label">
          <span className="lab-head">{t("ins.start")}<FieldTip topic="f-seguro-inicio" /></span>
          <input className="field" type="date" value={draft.start} aria-label={t("ins.start")} onChange={(e) => set({ start: e.target.value })} />
        </label>
        <label className="label">
          <span className="lab-head">{t("ins.note")}</span>
          <input className="field" value={draft.note} aria-label={t("ins.note")} onChange={(e) => set({ note: e.target.value })} />
        </label>
      </div>
      <div className="label">
        <span className="lab-head">{t("ins.bens")}<FieldTip topic="f-seguro-beneficiarios" /></span>
        {draft.bens.map((name, i) => (
          <span className="row" key={i}>
            <input className="field" value={name} aria-label={t("ins.bens.name")} onChange={(e) => set({ bens: draft.bens.map((b, at) => (at === i ? e.target.value : b)) })} />
            <button type="button" className="icon-btn" aria-label={t("ins.bens.remove")} onClick={() => set({ bens: draft.bens.filter((_, at) => at !== i) })}><X className="size-4" /></button>
          </span>
        ))}
        <div className="row">
          <button type="button" className="btn secondary" onClick={() => set({ bens: [...draft.bens, ""] })}><Plus className="size-4" />{t("ins.bens.add")}</button>
          {contacts || nativeName ? <button type="button" className="btn secondary" onClick={() => void pickBeneficiaries()}><UserRound className="size-4" />{t("ins.bens.contacts")}</button> : null}
        </div>
      </div>
    </>
  );
}

function CatalogEditor() {
  const { t, lang, session, commit, commitGuarded, confirm, has } = useFaro();
  // Etapa 3.3: el catálogo se recompone por modo — el alta es Esencial
  // (settings.catalog-add), la mano de administración nace en Ritmo
  // (settings.catalog-admin) y la mano sobre las piezas de suscripción es
  // Completo (settings.catalog-admin-subs, X-23); el plan del seguro sigue a
  // su función (ins.setup, la fila del registro para armar el plan de una
  // pieza de seguro). Sin mano, la tarjeta es una ficha que se lee: ni
  // puerta, ni arrastre, ni herramientas.
  // 1.3.315 (fallo de Oscar, 2026-11-18 18:11): corregir un nombre mal
  // escrito es Esencial en cualquier modo — la tarjeta también es puerta
  // en Esencial, pero su mano trae SOLO el lápiz del renombre
  // (editor.picker-rename, el mismo asiento que gobierna los selectores:
  // el principio es el nombre, no la superficie). El resto de la mano y
  // el arrastre siguen a su asiento de administración.
  const canAdmin = has("settings.catalog-admin");
  const canAdminSubs = has("settings.catalog-admin-subs");
  const canRename = has("editor.picker-rename");
  const canIns = has("ins.setup");
  const handFor = (item: CatalogItem) => (item.kind === "sub" ? canAdminSubs : canAdmin);
  const [itemName, setItemName] = useState("");
  // 1.3.227 (pedido de Oscar): el alta elige su clase — el formulario
  // siempre sembró «tienda» y una suscripción nueva caía en el grupo
  // equivocado; ahora el selector Tienda / Suscripción manda, con la
  // misma pieza segmentada de Fijo / Variable del alta de categorías.
  const [itemKind, setItemKind] = useState<"store" | "sub" | "ins">("store");
  // 1.3.271: el plan del seguro — el borrador del alta y el del panel de la
  // tarjeta comparten el bloque InsFields; planFor dice qué tarjeta lo enseña.
  const [insDraft, setInsDraft] = useState<InsDraft>(() => emptyInsDraft("NIO"));
  const [insErr, setInsErr] = useState("");
  const [planFor, setPlanFor] = useState<string | null>(null);
  const [planEditing, setPlanEditing] = useState(false);
  const [planDraft, setPlanDraft] = useState<InsDraft>(() => emptyInsDraft("NIO"));
  const [planErr, setPlanErr] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  // Congruency pass (Oscar, 2026-11-11): at rest a row carries only the little pen on its name and ONE
  // fold icon at the far right; the tools (eye, replace, trash) unfold from it — one row open at a time.
  const [toolsFor, setToolsFor] = useState<string | null>(null);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  const [replaceCustom, setReplaceCustom] = useState("");
  const [pending, setPending] = useState<{ item: CatalogItem; target: ReplaceTarget; targetName: string; count: number } | null>(null);
  // 1.3.231: la mano no desaparece de golpe — al cerrarse queda su fantasma
  // unos 150ms fundiéndose (la clase is-bye de pliegues.css), en la misma
  // familia de pliegues que el resto de Estructura; con movimiento reducido
  // se va al momento.
  const [byeHand, setByeHand] = useState<string | null>(null);
  const prevToolsRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevToolsRef.current;
    prevToolsRef.current = toolsFor;
    if (prev && prev !== toolsFor) {
      setByeHand(prev);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const id = window.setTimeout(() => setByeHand((b) => (b === prev ? null : b)), reduced ? 0 : 170);
      return () => window.clearTimeout(id);
    }
  }, [toolsFor]);
  const catalog = session?.ledger.structure.catalog ?? [];
  const addItem = () => {
    const name = itemName.trim();
    if (!name) return;
    // Etapa 3.3: la clase del alta sigue al modo — una clase que duerme no
    // puede nacer desde esta forma (el estado guardado cae a «tienda»).
    const kind = itemKind === "ins" && !canIns ? "store" : itemKind === "sub" && !has("subs.cuota") ? "store" : itemKind;
    // 1.3.271: el alta de un seguro compone su plan en el MISMO commit que la
    // pieza — pieza y línea permanente nacen juntas o no nacen. Sin importe,
    // la pieza nace sin configurar (nada se inventa); con importe y sin
    // momento, el alta pregunta antes de escribir nada.
    let plan: InsPlan | undefined;
    if (kind === "ins") {
      const r = planFromDraft(insDraft);
      if (r.err) { setInsErr(r.err === "timing" ? t("ins.needTiming") : t("field.required")); return; }
      plan = r.plan;
    }
    const bens = kind === "ins" ? cleanInsBens(insDraft.bens) : [];
    const piece: CatalogItem = { id: `c-${uid().slice(0, 8)}`, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, kind, urlTemplate: "", ...(plan ? { ins: plan } : {}), ...(bens.length ? { bens } : {}) };
    commit((s) => {
      const withPiece: LedgerState = { ...s, structure: { ...s.structure, catalog: [...s.structure.catalog, piece] } };
      return plan ? syncInsLine(withPiece, piece, todayIso()) : withPiece;
    }, name);
    setItemName("");
    setInsDraft(emptyInsDraft(session?.ledger.settings.display ?? "NIO"));
    setInsErr("");
  };
  // 1.3.187 — la casa del Catálogo se completa (R-5, cierra E-5) y su borrado avisa (R-4,
  // cierra E-4). El modelo de guardado de ESTA casa es el inmediato: cada control hace su
  // propio commit (así ya aplicaban el icono, el alta y el borrado), así que el renombre
  // confirma con Enter/✓ en su propio commit y el ojo de la tienda alterna al toque, como
  // en el engranaje de Compras — no se importa el modelo preparado del árbol (1.3.179).
  // Renombrar escribe customName: la identidad de la pieza es su id y las líneas la
  // nombran por id (storeId/providerId), así que ninguna compra se despega.
  const saveRename = (item: CatalogItem) => {
    const next = renameText.trim();
    setRenameId(null);
    if (!next || next === displayName(item, lang)) return;
    commit((s) => ({ ...s, structure: { ...s.structure, catalog: s.structure.catalog.map((c) => (c.id === item.id ? { ...c, customName: next } : c)) } }), next);
  };
  // R-4: el aviso informado de la familia de la 1.3.178 — cuántas líneas nombran la pieza
  // y cuánto suman por moneda (catalogLinesSummary). El borrado NO se lleva esas líneas:
  // se quedan, pero ya no llevarán el nombre de la pieza; el cuerpo lo dice antes de quemar.
  const dropItem = (item: CatalogItem) => {
    const name = displayName(item, lang);
    const summary: SubLinesSummary = session ? catalogLinesSummary(session.ledger, item.id) : { count: 0, totals: [] };
    const totalsText = summary.totals.map((x) => formatMoney(x.minor, x.currency, lang)).join(" + ");
    const fam = item.kind === "store" ? "delete.store.lines" : "delete.item.lines";
    const body = summary.count === 0
      ? name
      : `${name}. ${summary.count === 1
        ? t(`${fam}.one`).replace("{totals}", totalsText)
        : t(fam).replace("{n}", String(summary.count)).replace("{totals}", totalsText)}`;
    confirm({ title: t("delete"), body, danger: true, yes: t("yes"), run: () => commit((s) => ({ ...s, structure: { ...s.structure, catalog: s.structure.catalog.filter((c) => c.id !== item.id) } }), item.id) });
  };
  // 1.3.225 (pedido de Oscar): el ojo del Catálogo era la última puerta muda de
  // la familia — la tarjeta de categoría avisa desde la 1.3.223 y este ojo
  // confirmaba al instante sin decir qué hace. Ahora pregunta lo mismo antes
  // de ocultar (esta casa aplica al toque: sin Guardar, su cuerpo no lo
  // promete); mostrar sigue sin preguntar, como en toda la familia.
  const toggleItemVis = (item: CatalogItem) => {
    const apply = () => commit((s) => ({ ...s, structure: { ...s.structure, catalog: s.structure.catalog.map((c) => (c.id === item.id ? { ...c, hidden: !c.hidden } : c)) } }), item.id);
    if (!item.hidden) { confirm({ title: t("hide.title").replace("{name}", displayName(item, lang)), body: t("hide.item.body"), yes: t("hide"), run: apply }); return; }
    apply();
  };
  // Replace (the palette's new job): the user picks what this slot becomes. When purchases hang from
  // the piece, the app ASKS at that moment (Oscar's rule) — merge them into the new name, or start
  // fresh and let them lose it. With no purchases there is nothing to decide: it just happens.
  const applyReplace = (item: CatalogItem, target: ReplaceTarget, targetName: string, mode: "merge" | "fresh") => {
    commit((s) => ({ ...s, structure: replaceCatalogItem(s.structure, item.id, target, mode, () => `c-${uid().slice(0, 8)}`) }), targetName);
    setPending(null);
    setReplaceFor(null);
    setReplaceCustom("");
    setToolsFor(null);
  };
  const chooseReplace = (item: CatalogItem, target: ReplaceTarget, targetName: string) => {
    const count = session ? catalogLinesSummary(session.ledger, item.id).count : 0;
    if (count === 0) { applyReplace(item, target, targetName, "merge"); return; }
    setPending({ item, target, targetName, count });
  };
  const toggleTools = (item: CatalogItem) => {
    setPlanFor(null); setPlanEditing(false); setPlanErr("");
    if (toolsFor === item.id) { setToolsFor(null); setReplaceFor(null); setPending(null); }
    else { setToolsFor(item.id); setReplaceFor(null); setPending(null); setReplaceCustom(""); }
  };
  // Grouped by kind (Oscar, 2026-11-11): each class sits in its own determined group, under its
  // own heading — the differentiation lives in the grouping itself, not in a glyph by the name.
  const groups: { kind: CatalogItem["kind"]; label: string }[] = [
    { kind: "store", label: t("cat.g.store") },
    { kind: "ai", label: t("cat.g.ai") },
    { kind: "sub", label: t("cat.g.sub") },
    { kind: "ins", label: t("cat.g.ins") },
  ];
  // THE GRID + THE FOLD LAW (Oscar, 2026-11-11, built after a night of thinking): the pieces live
  // in cards, in columns counted by the width of their house — 2 on the phone, more on the tablet
  // and the computer; a card NEVER stretches, a new column appears instead (cols is measured on
  // this very container, not on the screen). There is NO arrow chip: the card itself is the door.
  // Tapped, it blooms across its whole row with the whole hand inside, at its natural size —
  // pen (rename) · palette (replace) · eye · trash, the red trash last, in the dead arrow's seat,
  // because it is the only one with colour. On membership rows the little repeat badge rides
  // INSIDE the fold too, after the trash, announcing itself — it is not a button, and at rest it
  // is nowhere. The bloomed card's row-mates drop below the stripe and the rest re-pack (the
  // chunk render below): no gaps, open or closed. Tapping the open card again, or opening
  // another, folds it back — the accordion law the categories already live by.
  const rootRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => { const w = el.clientWidth; setCols(w >= 840 ? 4 : w >= 580 ? 3 : 2); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isOpen = (item: CatalogItem) => toolsFor === item.id || renameId === item.id;
  const door = (item: CatalogItem) => (e: ReactMouseEvent) => {
    if (!handFor(item) && !canRename) return; // sin mano ni lápiz en este modo, la tarjeta no es puerta
    if (renameId === item.id) return; // mid-rename the card is a form, not a door
    // A tool was tapped, not the card — and the membership sign (.cat-badge) is exempt too:
    // it is a sign, not a button (1.3.222), so its tap must be inert. Until 1.3.230 it fell
    // through to the door and folded the open card under the owner's finger (his report).
    // 1.3.269: the pin mark (.cat-pinmark) joins the exemption for the same reason — it is
    // a sign, not a button. Until this wave its tap fell through to the door, opened the
    // hand, and the mark — painted only while the hand is closed — vanished in the same
    // gesture, so it looked as if the tap had unpinned the piece (Oscar's report: it lied).
    if ((e.target as HTMLElement).closest("button, input, a, .cat-badge, .cat-pinmark")) return;
    toggleTools(item);
  };
  // 1.3.251 (pedido de Oscar): la fija de las piezas de Tiendas e IA — el pin vive en
  // la mano, junto al ojo, y se guarda AL MOMENTO como todo lo de esta tarjeta (la
  // ley de guardado del catálogo desde 1.3.187: cada control confirma el suyo; aquí
  // no hay Guardar que lo prepare). Las de Suscripciones NO llevan pin: ninguna
  // línea del libro guarda su id y una fija sin archivo honesto no se ofrece.
  const storePinned = (item: CatalogItem) => hasStorePin(session?.ledger.settings.widgetPins, item.id);
  // 1.3.260 (pedido de Oscar): esta mano guarda AL MOMENTO, así que su anclaje
  // pregunta ANTES de escribir — la ventana de la casa explica a dónde va el
  // nombre al fijar (una compra con ese nombre) o qué se quita al desfijar, y
  // el guardado de siempre vive solo dentro de su run: cancelar no escribe
  // nada. Con el ejemplo activo, el cuerpo suma la verdad del ejemplo
  // (1.3.258): esta fija caería en el libro de ejemplo y el widget enseña el
  // real — las dos verdades se encuentran antes de la escritura.
  const toggleStorePinFor = (item: CatalogItem) => {
    const on = storePinned(item);
    const apply = () => {
      commit((s) => ({ ...s, settings: { ...s.settings, widgetPins: toggleStorePin(s.settings.widgetPins, item.id) } }), displayName(item, lang));
      // 1.3.258: la foto se refresca síncrona con el gesto, como en el Guardar del árbol.
      window.dispatchEvent(new Event(WIDGET_REFRESH));
    };
    confirm({
      title: t(on ? "widget.pin.ask.offTitle" : "widget.pin.ask.title").replace("{name}", displayName(item, lang)),
      body: t(on ? "widget.pin.ask.offBody" : "widget.pin.ask.storeBody") + (sampleOn() ? " " + t("widget.pin.sample") : ""),
      yes: on ? t("widget.pin.remove") : t("widget.pin.ask.yes"),
      run: apply,
    });
  };
  // 1.3.251: reordenar el catálogo sosteniendo y arrastrando — la disciplina EXACTA
  // del arrastre del árbol (StructureTree, 1.3.145/167/227), trasplantada a la
  // rejilla: sostener 200ms levanta la tarjeta; un temblor de más de 12px o un
  // scroll real (>4px) cancelan el gesto antes de que nazca; con el dedo ya en
  // arrastre, el touchmove se detiene para que la página no huya; al soltar, el
  // orden viaja por el commit de siempre y el click que sigue nace ahogado. El
  // paso de la rejilla es la fila (pitch medido entre filas): arrastrar una fila
  // mueve la tarjeta `cols` puestos en el orden de lectura. Con una mano abierta
  // o un renombre en curso no hay arrastre: la tarjeta abierta florece y rompe la
  // rejilla — arrastrar es un gesto de reposo, como en el árbol.
  type CatDragState = { id: string; kind: CatalogItem["kind"]; from: number; to: number; dy: number; pitch: number };
  const [catDrag, setCatDrag] = useState<CatDragState | null>(null);
  const catDragRef = useRef<CatDragState | null>(null);
  const catPressRef = useRef<{ id: string; kind: CatalogItem["kind"]; index: number; count: number; y: number; pid: number; timer: number; el: HTMLElement } | null>(null);
  const catSwallowRef = useRef(false);
  const catEndRef = useRef<(() => void) | null>(null);
  const endCatPress = () => {
    const p = catPressRef.current;
    if (p) window.clearTimeout(p.timer);
    catPressRef.current = null;
    catEndRef.current?.();
    catEndRef.current = null;
  };
  const onCardPointerDown = (e: ReactPointerEvent, item: CatalogItem, index: number, count: number) => {
    if (!handFor(item)) return; // reordenar es administrar: sigue a la mano
    if (toolsFor !== null || renameId !== null) return;
    if (e.button !== undefined && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, input, a")) return;
    catSwallowRef.current = false;
    endCatPress();
    const el = e.currentTarget as HTMLElement;
    const endGesture = (ev: PointerEvent) => { if (catPressRef.current && ev.pointerId === catPressRef.current.pid) endCatPress(); };
    window.addEventListener("pointerup", endGesture);
    window.addEventListener("pointercancel", endGesture);
    const startScrollY = window.scrollY;
    const watch = () => { if (!catDragRef.current && Math.abs(window.scrollY - startScrollY) > 4) endCatPress(); };
    window.addEventListener("scroll", watch, { capture: true, passive: true });
    catEndRef.current = () => {
      window.removeEventListener("pointerup", endGesture);
      window.removeEventListener("pointercancel", endGesture);
      window.removeEventListener("scroll", watch, { capture: true } as EventListenerOptions);
    };
    const timer = window.setTimeout(() => {
      if (!catPressRef.current) return; // la presión ya terminó: nunca levantar en una sala vacía
      const grid = el.closest<HTMLElement>(".cat-grid");
      const cards = grid ? [...grid.querySelectorAll<HTMLElement>(".cat-card")] : [];
      const rowTop = (n: number) => cards[n]?.getBoundingClientRect().top;
      const pitch = cards.length > cols && rowTop(cols) !== undefined && rowTop(0) !== undefined
        ? Math.max(1, (rowTop(cols) as number) - (rowTop(0) as number))
        : el.getBoundingClientRect().height + 8;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      el.style.touchAction = "none";
      const stop = (ev: TouchEvent) => { if (catDragRef.current) ev.preventDefault(); };
      window.addEventListener("touchmove", stop, { passive: false });
      const prevEnd = catEndRef.current;
      catEndRef.current = () => { prevEnd?.(); window.removeEventListener("touchmove", stop); };
      const lifted: CatDragState = { id: item.id, kind: item.kind, from: index, to: index, dy: 0, pitch };
      catDragRef.current = lifted;
      setCatDrag(lifted);
    }, 200);
    catPressRef.current = { id: item.id, kind: item.kind, index, count, y: e.clientY, pid: e.pointerId, timer, el };
  };
  const onCardPointerMove = (e: ReactPointerEvent) => {
    const press = catPressRef.current;
    if (!press) return;
    const live = catDragRef.current;
    if (!live) {
      if (Math.abs(e.clientY - press.y) > 12) endCatPress(); // era un scroll o un toque, no una sostén
      return;
    }
    const dy = e.clientY - press.y;
    const to = Math.max(0, Math.min(press.count - 1, live.from + Math.round(dy / live.pitch) * cols));
    if (to !== live.to || dy !== live.dy) { const next = { ...live, dy, to }; catDragRef.current = next; setCatDrag(next); }
  };
  const onCardPointerUp = () => {
    const live = catDragRef.current;
    endCatPress();
    if (!live) return;
    catDragRef.current = null;
    setCatDrag(null);
    catSwallowRef.current = true; // el click que sigue a una caída no abre ni cierra la tarjeta
    if (live.to !== live.from) {
      commit((s) => {
        const catalog = s.structure.catalog.slice();
        const slots = catalog.map((c, i) => (c.kind === live.kind ? i : -1)).filter((i) => i >= 0);
        const items = slots.map((i) => catalog[i]);
        const [moved] = items.splice(live.from, 1);
        items.splice(live.to, 0, moved);
        items.forEach((it, i) => { catalog[slots[i]] = { ...it, order: i }; });
        return { ...s, structure: { ...s.structure, catalog } };
      }, "drag reorder");
    }
  };
  const renderPanel = (item: CatalogItem) => (
    <div key={`panel-${item.id}`} className="cat-repl is-grid-panel">
      {replaceCandidates(session?.ledger.structure ?? { categories: [], purchases: [], catalog: [] }, item).map((cand) => (
        <button key={cand.id} type="button" className="cat-repl-row" onClick={() => chooseReplace(item, { nameKey: cand.nameKey, customName: cand.customName, icon: cand.icon, kind: cand.kind, urlTemplate: cand.urlTemplate }, displayName(cand, lang))}>
          {cand.icon.startsWith("brand:") ? <BrandMark id={cand.icon.slice(6)} className="size-7" /> : cand.kind === "store" ? <BrandMark id={cand.id} className="size-7" /> : <Glyph name={cand.icon} />}
          <span className="truncate">{displayName(cand, lang)}</span>
        </button>
      ))}
      <div className="row cat-repl-custom">
        <input className="field" value={replaceCustom} placeholder={t("cat.replace.custom")} aria-label={t("cat.replace.custom")} onChange={(e) => setReplaceCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && replaceCustom.trim()) chooseReplace(item, { nameKey: "", customName: replaceCustom.trim(), icon: "Circle", kind: item.kind, urlTemplate: "" }, replaceCustom.trim()); }} />
        <button type="button" className="btn secondary" disabled={!replaceCustom.trim()} onClick={() => chooseReplace(item, { nameKey: "", customName: replaceCustom.trim(), icon: "Circle", kind: item.kind, urlTemplate: "" }, replaceCustom.trim())}>{t("cat.replace")}</button>
      </div>
      {pending && pending.item.id === item.id ? (
        <div className="cat-repl-ask">
          <p className="text-sm">{t(pending.count === 1 ? "cat.replace.q.one" : "cat.replace.q").replace("{n}", String(pending.count))}</p>
          <div className="row">
            <button type="button" className="btn" onClick={() => applyReplace(pending.item, pending.target, pending.targetName, "merge")}>{t("cat.replace.merge").replace("{name}", pending.targetName)}</button>
            <button type="button" className="btn secondary" onClick={() => applyReplace(pending.item, pending.target, pending.targetName, "fresh")}>{t("cat.replace.fresh")}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
  // 1.3.271: el panel del plan de un seguro — la cara completa de la pieza
  // cuando su tarjeta florece. En reposo enseña los hechos: el plan (importe ·
  // momento · cuenta), la nota si la hay, y la retrospectiva del steer de
  // Oscar — desde cuándo y cuántos meses van, con las primas ANOTADAS sumadas
  // de las líneas archivadas (nunca meses × importe: eso fabricaría dinero).
  // Conteo y suma son lecturas: no entran en ningún total. Editar guarda la
  // pieza y su línea permanente en un solo commit (syncInsLine); limpiar el
  // importe desconfigura la pieza y deja las líneas como están — la historia
  // anotada no se toca desde aquí.
  const savePlan = (item: CatalogItem) => {
    const r = planFromDraft(planDraft);
    if (r.err) { setPlanErr(r.err === "timing" ? t("ins.needTiming") : t("field.required")); return; }
    const bens = cleanInsBens(planDraft.bens);
    /* Ola 18 (BR18-1): la puerta guardada — si la pieza ya no vive en el
     * catálogo, la receta aborta devolviendo null y el guardado no deja
     * marco: ni la entrada con el nombre de la pieza, ni revisión, ni
     * Deshacer por un plan que nunca aterrizó. */
    commitGuarded((s) => {
      // Ola 14 (Guardián G14-4): la pieza editada se compone sobre el
      // catálogo VIVO dentro del commit, como saveRename en este mismo
      // editor — antes `updated` nacía de la foto del render y sustituía
      // la pieza entera en el mapa: un renombre cruzado de otra pestaña
      // moría al nivel del commit, sin dejar rastro. Si la pieza ya no
      // vive en el catálogo, el guardado no la resucita: estado intacto.
      let updated: CatalogItem | null = null;
      const catalog = s.structure.catalog.map((c) => {
        if (c.id !== item.id) return c;
        updated = { ...c, ins: r.plan, bens: bens.length ? bens : undefined };
        return updated;
      });
      if (!updated) return null;
      const withPiece: LedgerState = { ...s, structure: { ...s.structure, catalog } };
      return r.plan ? syncInsLine(withPiece, updated, todayIso()) : withPiece;
    }, displayName(item, lang));
    setPlanEditing(false);
    setPlanErr("");
  };
  const renderInsPanel = (item: CatalogItem) => {
    const ledger = session?.ledger;
    const plan = item.ins;
    const today = todayIso();
    const timing = insTiming(plan);
    const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es", { day: "numeric", month: "short", year: "numeric" });
    const summary: string[] = [];
    if (plan && timing) {
      summary.push(formatMoney(plan.amt, plan.cur, lang));
      summary.push("day" in timing ? t("ins.dayShort").replace("{d}", String(timing.day)) : t(`ins.week.${timing.week}`));
      const srcName = plan.src ? accounts(ledger).find((a) => a.id === plan.src)?.name ?? "" : "";
      if (srcName) summary.push(srcName);
    }
    const months = plan?.start ? monthsSince(plan.start, today) : null;
    const paid = ledger && plan?.start ? insPaid(ledger, item.id, plan.start, today) : null;
    return (
      <div key={`plan-${item.id}`} className="cat-repl is-grid-panel">
        {planEditing ? (
          <>
            <InsFields draft={planDraft} onChange={setPlanDraft} accts={accounts(ledger)} t={t} />
            {planErr ? <p className="form-err">{planErr}</p> : null}
            <div className="row">
              <button type="button" className="btn secondary" onClick={() => { setPlanEditing(false); setPlanErr(""); }}>{t("cancel")}</button>
              <button type="button" className="btn" onClick={() => savePlan(item)}>{t("save")}</button>
            </div>
          </>
        ) : (
          <>
            {plan && timing ? <p className="text-sm">{summary.join(" · ")}</p> : <p className="text-sm">{t("ins.none")}</p>}
            {plan?.note ? <p className="text-sm">{plan.note}</p> : null}
            {item.bens?.length ? <p className="text-sm"><span className="lab-head">{t("ins.bens")}</span> {item.bens.join(", ")}</p> : null}
            {months !== null && plan?.start ? (
              <p className="text-sm">
                <span className="lab-head">{t("ins.since").replace("{date}", fmtDate(plan.start))} · {months === 0 ? t("ins.thisMonth") : months === 1 ? t("ins.month1") : t("ins.months").replace("{n}", String(months))}<Hint topic="seguro-vida" alt /></span>
              </p>
            ) : null}
            {paid && paid.count > 0 ? (
              <p className="text-sm">{(paid.count === 1 ? t("ins.paid1") : t("ins.paid")).replace("{n}", String(paid.count)).replace("{sum}", paid.totals.map((x) => formatMoney(x.amt, x.cur, lang)).join(" + "))}</p>
            ) : null}
            <div className="row">
              <button type="button" className="btn secondary" onClick={() => { setPlanDraft(draftFromPlan(item.ins, ledger?.settings.display ?? "NIO", item.bens)); setPlanErr(""); setPlanEditing(true); }}>{plan ? t("ins.edit") : t("ins.configure")}</button>
            </div>
          </>
        )}
      </div>
    );
  };
  const renderCard = (item: CatalogItem, index = 0, count = 0) => {
    // El suelo del arrastre (1.3.251): la tarjeta levantada sigue al dedo y sus
    // vecinas del grupo se apartan una fila — el mismo cuadro que el árbol pinta.
    const dragStyle: CSSProperties | undefined = (() => {
      if (!catDrag || catDrag.kind !== item.kind) return undefined;
      if (catDrag.id === item.id) return { transform: `translateY(${catDrag.dy}px)` };
      if (catDrag.from < index && index <= catDrag.to) return { transform: `translateY(${-catDrag.pitch}px)` };
      if (catDrag.to <= index && index < catDrag.from) return { transform: `translateY(${catDrag.pitch}px)` };
      return undefined;
    })();
    const dragClass = catDrag && catDrag.kind === item.kind ? (catDrag.id === item.id ? " is-drag-src" : " is-drag-shift") : "";
    return (
    <div key={item.id} data-kind={item.kind} className={"cat-card" + (isOpen(item) ? " is-open" : "") + (item.hidden ? " is-muted" : "") + dragClass} style={dragStyle}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => onCardPointerDown(e, item, index, count)}
      onPointerMove={onCardPointerMove}
      onPointerUp={onCardPointerUp}
      onPointerCancel={onCardPointerUp}
      onLostPointerCapture={onCardPointerUp}
      onClick={(e) => { if (catSwallowRef.current) { catSwallowRef.current = false; return; } door(item)(e); }}>
      {renameId === item.id ? (
        <>
          <input className="field cat-rename" value={renameText} autoFocus aria-label={t("rename")} onChange={(e) => setRenameText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveRename(item); if (e.key === "Escape") setRenameId(null); }} />
          <button type="button" className="icon-btn cat-act" aria-label={t("rename")} onClick={() => saveRename(item)}><Check className="size-4" /></button>
        </>
      ) : (
        <>
          {item.icon.startsWith("brand:") ? <BrandMark id={item.icon.slice(6)} className="size-8" /> : item.kind === "store" ? <BrandMark id={item.id} className="size-8" /> : <Glyph name={item.icon} />}
          <span className="cat-name">{displayName(item, lang)}</span>
          {/* 1.3.251: la fija se lee en reposo también aquí — la misma marca junto
              al nombre que las categorías y las subs llevan desde esta versión. */}
          {toolsFor !== item.id && (item.kind === "store" || item.kind === "ai") && storePinned(item) ? <Pin size={12} className="cat-pinmark" fill="currentColor" aria-hidden /> : null}
          {toolsFor === item.id || byeHand === item.id ? (
            <span className={`cat-tools${byeHand === item.id && toolsFor !== item.id ? " is-bye" : ""}`}>
              {/* The whole hand, in Oscar's order: pen · palette · eye · trash (red last). The eye
                  belongs to EVERY kind — no piece is special. */}
              <button type="button" className="icon-btn cat-act" style={{ "--i": 0 } as CSSProperties} aria-label={t("rename")} onClick={() => { setRenameId(item.id); setRenameText(displayName(item, lang)); }}><Pencil className="size-4" /></button>
              {handFor(item) ? (<>
              <button type="button" className="icon-btn cat-act" style={{ "--i": 1 } as CSSProperties} aria-label={t("cat.replace")} aria-pressed={replaceFor === item.id} onClick={() => { setReplaceFor(replaceFor === item.id ? null : item.id); setPending(null); setReplaceCustom(""); }}><Palette className="size-4" /></button>
              <button type="button" className="icon-btn cat-act" style={{ "--i": 2 } as CSSProperties} aria-label={item.hidden ? t("show") : t("hide")} onClick={() => toggleItemVis(item)}>{item.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
              {/* 1.3.251: el pin de Tiendas e IA, entre el ojo y la papelera — se
                  guarda al momento, como cada control de esta mano. Su nombre
                  accesible cambia con el estado, como en la mano de las subs.
                  1.3.260: antes de escribir, la ventana de la casa lo confirma
                  (toggleStorePinFor) — el guardado vive dentro de su run. */}
              {(item.kind === "store" || item.kind === "ai") ? <button type="button" className="icon-btn cat-act pin-btn" style={{ "--i": 3 } as CSSProperties} aria-label={storePinned(item) ? t("widget.pin.on") : t("widget.pin")} aria-pressed={storePinned(item)} onClick={() => toggleStorePinFor(item)}><Pin className="size-4" fill={storePinned(item) ? "currentColor" : "none"} /></button> : null}
              {/* 1.3.271: en el asiento donde iría el pin, el seguro lleva su
                  plan — no se puede fijar, como las suscripciones (la nota de
                  la tarjeta Widget sigue siendo verdad), y su botón abre el
                  panel de hechos y de edición bajo la tarjeta. */}
              {item.kind === "ins" && canIns ? <button type="button" className="icon-btn cat-act" style={{ "--i": 3 } as CSSProperties} aria-label={t("ins.plan")} aria-pressed={planFor === item.id} onClick={() => { const open = planFor !== item.id; setPlanFor(open ? item.id : null); setPlanEditing(open && !item.ins); setPlanDraft(draftFromPlan(item.ins, session?.ledger.settings.display ?? "NIO", item.bens)); setPlanErr(""); }}><SlidersHorizontal className="size-4" /></button> : null}
              <button type="button" className="icon-btn line-act is-danger" style={{ "--i": item.kind === "sub" || item.kind === "ins" ? 3 : 4 } as CSSProperties} aria-label={t("delete")} onClick={() => dropItem(item)}><Trash2 className="size-4" /></button>
              {/* The membership badge: inside the fold only, after the trash, announcing itself.
                  Not a button — the row signing its name at the end of the hand. Its tap is
                  inert by law: the door above exempts .cat-badge like a tool, so touching the
                  sign can never fold or unfold the card (Oscar's report, fixed in 1.3.230). */}
              {item.kind === "sub" ? <span className="cat-badge" style={{ "--i": 4 } as CSSProperties} aria-hidden><Repeat2 className="size-4" /></span> : null}
              </>) : null}
            </span>
          ) : null}
        </>
      )}
    </div>
    );
  };
  const renderGroup = (g: { kind: CatalogItem["kind"]; label: string }) => {
    const items = catalog.filter((c) => c.kind === g.kind);
    if (!items.length) return null;
    // Chunk into rows of `cols`; a chunk holding the open card renders it FIRST (it spans the
    // whole row), its replace panel right under it, and its row-mates after — they drop below
    // the stripe and the rest re-pack. No gaps, open or closed.
    const cells: ReactNode[] = [];
    for (let i = 0; i < items.length; i += cols) {
      const chunk = items.slice(i, i + cols);
      const openItem = chunk.find((c) => isOpen(c));
      if (openItem) {
        cells.push(renderCard(openItem, items.indexOf(openItem), items.length));
        cells.push(<FoldShell key={`repl-${openItem.id}`} open={replaceFor === openItem.id} tier="sm" className="fold-grid-panel">{renderPanel(openItem)}</FoldShell>);
        if (openItem.kind === "ins" && canIns) cells.push(<FoldShell key={`planfold-${openItem.id}`} open={planFor === openItem.id} tier="sm" className="fold-grid-panel">{renderInsPanel(openItem)}</FoldShell>);
        chunk.filter((c) => c.id !== openItem.id).forEach((c) => cells.push(renderCard(c, items.indexOf(c), items.length)));
      } else {
        chunk.forEach((c) => cells.push(renderCard(c, items.indexOf(c), items.length)));
      }
    }
    return (
      <div key={g.kind} className="cat-group" data-anchor={g.kind === "ins" ? "est-seguro" : undefined}>
        <div className="cat-group-head"><span>{g.label}</span><i aria-hidden /></div>
        <div className="cat-grid" style={{ "--cols": cols } as CSSProperties}>{cells}</div>
      </div>
    );
  };
  return (
    <div className="mt-2" data-anchor="est-catalog" ref={rootRef}>
      {/* La línea del gesto, en el registro del aviso del árbol (tree-hint): lo que
          no se anuncia no existe para un usuario frío — el arrastre se dice una vez,
          aquí, donde las tarjetas viven (1.3.251). */}
      {canAdmin || canAdminSubs ? <p className="tree-hint">{t("cat.dragHint")}</p> : null}
      {/* 1.3.258: con el ejemplo activo, el editor anuncia su libro en el mismo
          registro — las fijas de la mano de cada tarjeta caen en el libro de
          ejemplo y la foto del widget enseña el real (la trampa de pinsdiag-257). */}
      {sampleOn() ? <p className="tree-hint">{t("widget.pin.sample")}</p> : null}
      {groups.map(renderGroup)}
      <div className="ah-form sc-form is-item">
        <div className="ah-grid">
          <label className="label is-wide">
            <span className="lab-head">{t("sc.item")}<FieldTip topic="f-catalogo" /></span>
            <input className="field" value={itemName} placeholder={t("sc.item.ph")} aria-label={t("add.item")} onChange={(e) => setItemName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addItem(); }} />
          </label>
          <div className="label is-wide">
            <div className="ah-sign" role="radiogroup" aria-label={t("sc.item")}>
              {(["store", "sub", "ins"] as const).filter((k) => k === "store" || (k === "sub" ? has("subs.cuota") : canIns)).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={itemKind === k} aria-pressed={itemKind === k} onClick={() => { setItemKind(k); setInsErr(""); }}>{t(`add.kind.${k}`)}</button>
              ))}
            </div>
          </div>
        </div>
        {itemKind === "ins" && canIns ? (
          <>
            <InsFields draft={insDraft} onChange={setInsDraft} accts={accounts(session?.ledger)} t={t} />
            {insErr ? <p className="form-err">{insErr}</p> : null}
          </>
        ) : null}
        <div className="ah-actions">
          <button type="button" className="btn secondary" onClick={() => { setItemName(""); setItemKind("store"); setInsDraft(emptyInsDraft(session?.ledger.settings.display ?? "NIO")); setInsErr(""); }}>{t("cancel")}</button>
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
