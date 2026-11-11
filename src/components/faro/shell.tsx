import { useScreenEntrance } from "./entrance";
import { createPortal } from "react-dom";
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { SampleEdge, SamplePill } from "./sample-mode";
import { Blend, CalendarDays, ChevronLeft, ChevronRight, Coins, Columns2, Flag, Hourglass, Landmark, Maximize2, Minus, Moon, PictureInPicture2, Redo2, Rows2, Search, Settings, Shield, Sun, Undo2, X } from "lucide-react";
import "./float.css";
import "./tron.css";
import "./cyberpunk.css";
import { mountCpCity } from "./cp-city";
import "./brillo.css";
import "./principal.css";
import "./cal.css";
import "./tablet.css";
import { UserButton } from "@/lib/auth/gates";
import { monthLines } from "@/lib/faro/engine";
import { monthName } from "@/lib/faro/i18n";
import { holidaysFor } from "@/lib/faro/holidays";
import { convertMinor } from "@/lib/faro/money";
import { DAY_THEMES, NIGHT_THEMES, type LineKind, type SectionId, type ThemeId } from "@/lib/faro/types";
import { clampSplit, isSplitSection, pairedSection, SPLIT_MAX, SPLIT_MIN, stepSection } from "@/lib/faro/split";
import { guardPanelExit } from "@/lib/faro/panel-exit";
import { Advisor, Books, Desk, Help, Settings as SettingsScreen, Shops, Study } from "./screens";
import { BookSide, useTabletOne, type SideBook } from "./book-side";
import { AreaAdvisor, SideCol } from "./area-advisor";
import type { AreaId } from "@/lib/faro/area-advice";
import { recipientName } from "@/lib/faro/remit-people";
import { DebtBook, DebtScale, debtHello, preferOweTab, type DebtSide } from "./debts";
import { markRing, ringFresh, ringLit, ringShow } from "@/lib/faro/ring";
import { lentOf, lentState } from "@/lib/faro/debts";
import { cardFigures, cardsOf } from "@/lib/faro/cards";
import type { VaultTab } from "@/lib/manual/places";
import { ExportPanel } from "./export-panel";
import { Mark, SectionIcon } from "./icons";
import { Instruments } from "./instruments";
import { SAVINGS_PURPLE, isTron as vtTron, tronize as vtTronize } from "@/lib/faro/colors";
const vtint = (c: string) => (vtTron() ? vtTronize(c) : c);
import { FaroPane, useFaro, type Api } from "./provider";
import { useLayer } from "@/lib/manual/back";
import { loadManual, manualNow, prefetchManual, type ManualData } from "@/lib/manual/load";
import { searchSettings } from "@/lib/faro/settings-search";
import { Hint } from "./hint";
import { FocusHost } from "./focus-host";
import WidgetHost from "./widget-host";
import { PeopleInbox } from "./people";
import { BankDock } from "./bank-dock";
import { ToTop } from "./to-top";
import { inAndroidApp } from "@/spa/native";

mountCpCity(); // 1.3.201: the Cyberpunk city layers (display:none outside that theme)
// Faro for Android only (1.3.111): pictures shared from other apps. Never loaded in the browser or the PWA.
const ShareInbox = lazy(() => import("./share-inbox"));
const DocInbox = lazy(() => import("./doc-inbox"));

const ManualLayer = lazy(() => import("./manual"));

const BOOKS = ["income", "fixed", "variable", "shops", "subs"] as const;
/** Libros' top row (1.3.92): Cuotas moved into Debo, in the middle row. */
const TOP_BOOKS = ["income", "fixed", "variable", "shops"] as const;
const VAULT = ["save", "meta", "retiro", "emergencia"] as const;

/* Libros as one ring (1.3.94): a finger swipe on the content walks all ten books in order and wraps around. */
const RING = ["income", "fixed", "variable", "shops", "owed", "owe", "save", "meta", "retiro", "emergencia"] as const;
type RingStop = (typeof RING)[number];
type Swipe = { x: number; y: number; type: string; axis: "x" | "y" | null; el: HTMLElement | null };
function ringNext(section: SectionId, vault: VaultTab | null, dir: number): RingStop {
  const here = vault ?? (section === "subs" ? "owe" : section);
  const i = Math.max(0, RING.indexOf(here as RingStop));
  return RING[(i + dir + RING.length) % RING.length]!;
}
/** The swiped content follows the finger with resistance (never more than ~150px), a little fainter the further it goes. */
function dragPane(pane: HTMLElement | null, dx: number | null) {
  if (!pane || !pane.isConnected) return;
  if (dx === null) {
    pane.style.transition = "transform .22s cubic-bezier(.22, 1, .36, 1), opacity .22s ease";
    pane.style.transform = "";
    pane.style.opacity = "";
    return;
  }
  pane.style.transition = "none";
  pane.style.transform = `translate3d(${(150 * Math.tanh(dx / 340)).toFixed(1)}px, 0, 0)`;
  pane.style.opacity = String(1 - Math.min(0.22, Math.abs(dx) / 1000));
}
/** 1.3.124: a swipe starts anywhere on the screen (cards, charts, lists, (?) buttons); the only places that keep the finger
 *  are the ones whose own sideways drag does something: fields, sliders/levers, the colour picker, the Cobros sheet, anything
 *  marked touch-action: none or [data-noswipe], a sideways scroller that really overflows, and sheets/bubbles portaled out of main. */
const NO_SWIPE = "input, textarea, select, [contenteditable]:not([contenteditable='false']), .cal-sheet, .search-pop, .cobros, .vault-lever-rail, .cp-sv, .cp-hue, [role='slider'], [data-noswipe]";
function swipeBlocked(main: HTMLElement, target: Element | null): boolean {
  if (!target || !main.contains(target)) return true;
  if (target.closest(NO_SWIPE)) return true;
  for (let el: Element | null = target; el && el !== main; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (cs.touchAction === "none") return true;
    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
  }
  return false;
}
/** What a finger drags: Libros' pane; in Central the panel under the finger (the lens list or the open pocket). */
function dragTarget(main: HTMLElement, target: HTMLElement, hub: string): HTMLElement | null {
  if (hub === "books") return main.querySelector<HTMLElement>(":scope > .swipe-pane");
  if (hub === "desk") return target.closest<HTMLElement>('[data-anchor="desk-list"], .save-ledger');
  return null;
}
/** After a ring step: the row that holds the new book lights its choice, and comes into view if it is off screen. */
function ringLand(main: HTMLElement, stop: RingStop) {
  if (stop === "owed" || stop === "owe") debtHello(stop);
  else if (VAULT.includes(stop as never)) window.dispatchEvent(new CustomEvent("faro-vault-tap", { detail: { id: stop, root: main } }));
  window.setTimeout(() => {
    const row = stop === "owed" || stop === "owe"
      ? main.querySelector<HTMLElement>(":scope > .debt-scale")
      : main.querySelector<HTMLElement>(VAULT.includes(stop as never) ? ":scope > .vault-bar" : ":scope > .seg");
    if (!row) return;
    if (stop !== "owed" && stop !== "owe" && !VAULT.includes(stop as never)) ringLit(row.querySelector('[aria-current="page"]'));
    ringShow(row);
  }, 60);
}
const STUDY = ["stats", "advice"] as const;
type DockStop =
  | { kind: "section"; id: SectionId }
  | { kind: "vault"; id: (typeof VAULT)[number] }
  | { kind: "money" };
const LEFT_DOCK: DockStop[] = [
  { kind: "section", id: "desk" },
  ...VAULT.map((id) => ({ kind: "vault" as const, id })),
  { kind: "money" },
  { kind: "section", id: "settings" },
];
const RIGHT_DOCK: DockStop[] = [...BOOKS, ...STUDY].map((id) => ({ kind: "section" as const, id }));
/** 1.3.119: both bands as one swipe loop on a tablet/desktop (left band, then right band, wrapping). */
const DOCK_RING: DockStop[] = [...LEFT_DOCK, ...RIGHT_DOCK];
const TABLET_RING_MQ = "(min-width: 1100px)";
function dockRingIndex(moneyOpen: boolean, vault: VaultTab | null, section: SectionId): number {
  // Me deben / Debo are not dock buttons: they sit with Cuotas (right band), so the loop goes on from there.
  const i = DOCK_RING.findIndex((stop) => moneyOpen ? stop.kind === "money"
    : vault === "owed" || vault === "owe" ? stop.kind === "section" && stop.id === "subs"
    : vault ? stop.kind === "vault" && stop.id === vault
    : stop.kind === "section" && stop.id === section);
  return Math.max(0, i);
}
const SYNC_KEY = {
  offline: "sync.offline",
  syncing: "sync.syncing",
  saved: "sync.saved",
  local: "sync.local",
  error: "sync.error",
  conflict: "sync.conflict",
} as const;

function hubOf(section: SectionId) {
  if (section === "settings") return "settings";
  if ((STUDY as readonly string[]).includes(section)) return "study";
  if ((BOOKS as readonly string[]).includes(section)) return "books";
  return "desk";
}

export function Shell() {
  const faro = useFaro();
  const { ready, session, ui, setUi, sync, t, lang, hits, undo, redo, canUndo, canRedo, goSection, goTopic, fmt, persistFailed, tabConflict, dismissTabConflict } = faro;
  const searchRef = useRef<HTMLDivElement>(null);
  const searchPopRef = useRef<HTMLFormElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const segRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useScreenEntrance(mainRef, `${ui.section}`);
  const [calOpen, setCalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // 1.3.142: while in Ajustes the top search also finds settings (Oscar: the bar hangs over Ajustes, so it must
  // work there too). The index is the manual's topics, which live in the lazy chunk — load it on demand here.
  // 1.3.148: the settings index answers from ANY section (a setting you need is usually looked for from where
  // you are, not from inside Ajustes), and the results list lives while you type — Enter is no longer the gate.
  const [manualData, setManualData] = useState<ManualData | null>(manualNow);
  const [manualGaveUp, setManualGaveUp] = useState(false);
  const inSettings = ui.section === "settings";
  useEffect(() => {
    if (manualData || manualGaveUp || !searchOpen) return;
    let live = true;
    void loadManual().then((d) => { if (live) setManualData(d); }).catch(() => { if (live) setManualGaveUp(true); /* the books still answer */ });
    return () => { live = false; };
  }, [manualData, manualGaveUp, searchOpen]);
  const settingHits = useMemo(
    () => (manualData ? searchSettings(manualData.MANUAL_TOPICS, ui.query, lang) : []),
    [manualData, ui.query, lang],
  );
  const renderSettingHits = () => settingHits.map((hit) => (
    <button key={`aj-${hit.id}`} type="button" className="hit" onClick={() => {
      setSearchOpen(false);
      goTopic(hit.id, hit.go);
    }}>
      <strong>{hit.title}</strong>
      <span className="block text-sm text-muted">{hit.where}</span>
    </button>
  ));
  const renderBookHits = () => hits.map((hit) => (
    <button key={hit.id} type="button" className="hit" onClick={() => {
      const [y, m] = hit.monthKey.split("-").map(Number);
      setSearchOpen(false);
      if (hit.vault === "owe") preferOweTab("loans");
      if (hit.vault) setUi({ section: "income", vault: hit.vault, query: "" });
      else setUi({ section: hit.section, year: y ?? ui.year, month: m ?? ui.month, highlight: hit.lineId, query: "" });
    }}>
      <strong>{hit.title}</strong>
      <span className="block text-sm text-muted">{hit.subtitle}</span>
    </button>
  ));
  const [exportOpen, setExportOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [calDay, setCalDay] = useState<number | null>(null);
  const calDrag = useRef({ x: 0, y: 0, moved: false });
  const calBody = useRef<HTMLDivElement>(null);
  const calSky = useRef<HTMLDivElement>(null);
  const swipe = useRef<Swipe | null>(null);
  const swiped = useRef(false);
  const [slideDir, setSlideDir] = useState(1);
  // The savings tab lives in the provider, so each tab is a real history step (back walks the tabs).
  const vault = ui.vault;
  const setVault = (next: VaultTab | null) => { if (next !== ui.vault) setUi({ vault: next }); };
  const [moneyOpen, setMoneyOpen] = useState(false);
  // Edge dock recall is DOM-only (data-recall on .app-frame): toggling it never re-renders the app, and the
  // CSS transition (transform only) reverses mid-flight on rapid taps.
  const frameRef = useRef<HTMLDivElement>(null);
  const recallRef = useRef(false);
  const recallTap = useRef(0);
  const setRecall = useCallback((next: boolean | ((open: boolean) => boolean)) => {
    const open = typeof next === "function" ? next(recallRef.current) : next;
    if (open === recallRef.current) return;
    recallRef.current = open;
    const f = frameRef.current;
    if (!f) return;
    if (open) f.dataset.recall = "1"; else delete f.dataset.recall;
    const btn = f.querySelector<HTMLButtonElement>(".dock-recall");
    if (btn) { btn.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", open ? "true" : "false"); btn.setAttribute("aria-label", btn.dataset[open ? "hide" : "show"] || ""); }
    // 1.3.114: a slide that never got going (still pending a start time) is finished, so the drawer is always where data-recall says.
    window.clearTimeout(recallKick.current);
    recallKick.current = window.setTimeout(() => {
      for (const el of f.querySelectorAll<HTMLElement>(".rail, .side-dock, .dock-recall")) for (const a of el.getAnimations()) if (a.pending || a.currentTime === 0) a.finish();
    }, 260);
  }, []);
  const recallKick = useRef(0);
  const moneyPanel = useRef<HTMLElement>(null);
  const moneyDock = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const moneyBase = useRef<{ w: number; h: number } | null>(null);
  const [split, setSplit] = useState(() => {
    try { return localStorage.getItem("faro-split") === "1"; } catch { return false; }
  });
  const [splitRatio, setSplitRatio] = useState(() => {
    try {
      const n = Number(localStorage.getItem("faro-split-ratio"));
      return clampSplit(n > 0 ? n : 46);
    } catch { return 46; }
  });
  const [splitAxis, setSplitAxis] = useState<"row" | "col">(() => {
    try { return localStorage.getItem("faro-split-axis") === "col" ? "col" : "row"; } catch { return "row"; }
  });
  // 1.3.120: on a tablet/desktop (one pane, >= 1100 wide) the scale lives in the top bar on every screen (Central included).
  // In Libros it opens Me deben / Debo below as before; elsewhere it takes you to that side in Libros.
  const topScaleOn = useTopScaleOn(split);
  const hubNow = hubOf(ui.section);
  const topDebt: DebtSide | null = hubNow !== "books" ? null : vault === "owed" || vault === "owe" ? vault : !vault && ui.section === "subs" ? "owe" : null;
  const pickTopDebt = (side: DebtSide) => {
    if (hubNow === "books") {
      if (topDebt && topDebt !== side) setSlideDir(side === "owe" ? 1 : -1);
      if (side === "owe" && ui.section === "subs" && !vault) return;
      setVault(side);
      return;
    }
    setRecall(false);
    setMoneyOpen(false);
    setUi({ section: "income", vault: side });
  };
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 768px) and (min-height: 500px)").matches);
  const [lower, setLower] = useState<SectionId>(() => {
    try {
      const stored = localStorage.getItem("faro-split-section");
      if (isSplitSection(stored)) return stored;
    } catch { /* ignore */ }
    return "income";
  });
  const [floatOn, setFloatOn] = useState(() => {
    try { return localStorage.getItem("faro-float") === "1"; } catch { return false; }
  });
  const [floatMin, setFloatMin] = useState(() => {
    try { return localStorage.getItem("faro-float-min") === "1"; } catch { return false; }
  });
  const [floatSection, setFloatSection] = useState<SectionId>(() => {
    try {
      const stored = localStorage.getItem("faro-float-section");
      if (isSplitSection(stored)) return stored;
    } catch { /* ignore */ }
    return "advice";
  });
  useEffect(() => {
    try {
      localStorage.setItem("faro-float", floatOn ? "1" : "0");
      localStorage.setItem("faro-float-min", floatMin ? "1" : "0");
      localStorage.setItem("faro-float-section", floatSection);
    } catch { /* ignore */ }
  }, [floatOn, floatMin, floatSection]);
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!viewOpen) return;
    const off = (e: PointerEvent) => { if (!viewRef.current?.contains(e.target as Node)) setViewOpen(false); };
    document.addEventListener("pointerdown", off);
    return () => { document.removeEventListener("pointerdown", off); };
  }, [viewOpen]);
  // Esc and phone back close the Vista menu only.
  useLayer(viewOpen, () => setViewOpen(false));
  // 1.3.174: the tools aside is a layer too — Esc and phone back close it, like every other sheet.
  useLayer(moneyOpen, () => setMoneyOpen(false));
  const stackRef = useRef<HTMLDivElement>(null);
  const topPaneRef = useRef<HTMLDivElement>(null);
  const wideRef = useRef(wide);
  const axisRef = useRef(splitAxis);
  wideRef.current = wide;
  axisRef.current = splitAxis;
  const liveRatio = useRef(splitRatio);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [toolHost, setToolHost] = useState<"top" | "lower">("top");
  useEffect(() => {
    if (!moneyOpen) {
      moneyBase.current = null;
      if (moneyPanel.current) {
        moneyPanel.current.style.height = "";
        moneyPanel.current.style.width = "";
      }
      return;
    }
    const id = requestAnimationFrame(() => {
      const panel = moneyPanel.current;
      if (!panel) return;
      const land = window.matchMedia("(orientation: landscape) and (max-height: 520px) and (max-width: 1099px)").matches;
      const box = panel.getBoundingClientRect();
      moneyBase.current = { w: box.width, h: box.height };
      try {
        const saved = JSON.parse(localStorage.getItem(land ? "faro-money-size-land" : "faro-money-size") || "null") as { w?: number; h?: number } | null;
        if (!saved?.w || !saved?.h) return;
        const maxW = window.innerWidth - box.left - 16;
        const maxH = window.innerHeight - (land ? 8 : 28);
        panel.style.width = `${Math.min(maxW, Math.max(land ? 280 : box.width, saved.w))}px`;
        panel.style.height = `${Math.min(maxH, Math.max(land ? 168 : box.height, saved.h))}px`;
      } catch { /* ignore */ }
    });
    return () => cancelAnimationFrame(id);
  }, [moneyOpen]);
  const resizeMoney = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const panel = moneyPanel.current;
    if (!panel) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const box = panel.getBoundingClientRect();
    if (!panel.style.width) moneyBase.current = { w: box.width, h: box.height };
    const floor = moneyBase.current || { w: box.width, h: box.height };
    const land = window.matchMedia("(orientation: landscape) and (max-height: 520px) and (max-width: 1099px)").matches;
    const maxH = window.innerHeight - (land ? 8 : 28);
    const maxW = window.innerWidth - box.left - 16;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const nextH = Math.min(maxH, Math.max(land ? 168 : floor.h, box.height + (startY - ev.clientY)));
      const nextW = Math.min(maxW, Math.max(floor.w, box.width + (ev.clientX - startX)));
      panel.style.height = `${nextH}px`;
      panel.style.width = `${nextW}px`;
    };
    const up = () => {
      const done = panel.getBoundingClientRect();
      const grown = done.width > floor.w + 2 || done.height > floor.h + 2;
      const changed = Math.abs(done.width - floor.w) > 2 || Math.abs(done.height - floor.h) > 2;
      try {
        if (land) {
          if (changed) localStorage.setItem("faro-money-size-land", JSON.stringify({ w: Math.round(done.width), h: Math.round(done.height) }));
          else localStorage.removeItem("faro-money-size-land");
        } else if (grown) localStorage.setItem("faro-money-size", JSON.stringify({ w: Math.round(done.width), h: Math.round(done.height) }));
        else localStorage.removeItem("faro-money-size");
      } catch { /* ignore */ }
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };
  useEffect(() => {
    if (!moneyOpen) return;
    const close = (event: PointerEvent) => {
      const node = event.target as Node;
      if (moneyPanel.current?.contains(node) || moneyDock.current?.contains(node)) return;
      // 1.3.118: a sheet or dialog opened from inside the Cambio panel (Para quién, confirmations) is portaled to <body>; a tap there is not "outside".
      if ((node as Element)?.closest?.('.fit-scrim, [role="dialog"], [role="alertdialog"]')) return;
      if (swiped.current) return;
      setMoneyOpen(false);
    };
    document.addEventListener("pointerup", close);
    return () => document.removeEventListener("pointerup", close);
  }, [moneyOpen]);
  const claimLower = useCallback(() => setToolHost("lower"), []);
  const mapTop = useCallback((api: Api): Api => ({
    ...api,
    setUi: (patch) => {
      if (patch.instruments || patch.calcOpen) setToolHost("top");
      api.setUi(patch);
    },
  }), []);
  const hub = hubOf(ui.section);

  useEffect(() => {
    try { localStorage.setItem("faro-split", split ? "1" : "0"); } catch { /* ignore */ }
  }, [split]);
  useEffect(() => {
    try { localStorage.setItem("faro-split-ratio", String(splitRatio)); } catch { /* ignore */ }
  }, [splitRatio]);
  useEffect(() => {
    try { localStorage.setItem("faro-split-axis", splitAxis); } catch { /* ignore */ }
  }, [splitAxis]);
  useEffect(() => {
    try { localStorage.setItem("faro-split-section", lower); } catch { /* ignore */ }
  }, [lower]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (min-height: 500px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const dragSplit = (e: ReactPointerEvent<HTMLDivElement>) => {
    const stack = stackRef.current;
    const pane = topPaneRef.current;
    const el = e.currentTarget;
    if (!stack || !pane) return;
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
    const cols = wideRef.current && axisRef.current === "col";
    let pos = cols ? e.clientX : e.clientY;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const box = stack.getBoundingClientRect();
      const span = cols ? box.width : box.height;
      const start = cols ? box.left : box.top;
      if (span <= 0) return;
      const pct = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, ((pos - start) / span) * 100));
      liveRatio.current = pct;
      pane.style.flex = `0 0 ${pct}%`;
      el.setAttribute("aria-valuenow", String(Math.round(pct)));
    };
    el.setPointerCapture(e.pointerId);
    paint();
    const move = (ev: PointerEvent) => {
      if (ev.cancelable) ev.preventDefault();
      pos = cols ? ev.clientX : ev.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const end = () => {
      if (raf) cancelAnimationFrame(raf);
      paint();
      draggingRef.current = false;
      setDragging(false);
      setSplitRatio(clampSplit(liveRatio.current));
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };

  useEffect(() => {
    const frame = topPaneRef.current?.closest<HTMLElement>(".app-frame");
    if (!frame || !topPaneRef.current) return;
    const units: { scroller: HTMLElement | Window; header: HTMLElement | null; dock: HTMLElement | null; host: HTMLElement | null }[] = [];
    if (split) {
      frame.querySelectorAll<HTMLElement>(".split-pane").forEach((pane) => {
        const scroller = pane.querySelector<HTMLElement>(".workspace");
        if (!scroller) return;
        units.push({ scroller, header: pane.querySelector(".top-chrome"), dock: pane.querySelector(".dock"), host: pane });
      });
    } else {
      units.push({
        scroller: window,
        header: topPaneRef.current.querySelector(".top-chrome"),
        dock: topPaneRef.current.querySelector(".dock"),
        host: null,
      });
    }
    const cleanups = units.map(({ scroller, header, dock, host }) => {
      const read = () => (scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop);
      let last = read();
      let headerTarget = 0;
      let dockTarget = 0;
      let headerVisual = 0;
      let dockVisual = 0;
      let headerH = 0;
      let dockTravel = 0;
      let raf = 0;
      let lastTs = 0;
      const measureHeader = () => {
        if (!header) return 0;
        if (headerTarget > 1 && headerH > 0) return headerH;
        headerH = header.offsetHeight || 0;
        return headerH;
      };
      const measureDock = () => {
        if (!dock) return 0;
        if (dockTarget > 1 && dockTravel > 0) return dockTravel;
        const bottom = parseFloat(getComputedStyle(dock).bottom);
        const extra = Number.isFinite(bottom) ? Math.max(0, bottom) : 0;
        dockTravel = dock.offsetHeight + extra;
        return dockTravel;
      };
      const phoneLand = () => window.matchMedia("(orientation: landscape) and (max-height: 520px) and (max-width: 1099px)").matches;
      const step = (ts = 0) => {
        const dt = lastTs ? Math.min(34, ts - lastTs) : 16;
        lastTs = ts;
        const y = read();
        if (y <= 0 || searchOpen || calOpen || exportOpen) headerTarget = 0;
        if (y <= 0) dockTarget = 0;
        const H = measureHeader();
        const T = measureDock();
        if (header) headerTarget = Math.max(0, Math.min(H, headerTarget));
        if (dock) dockTarget = Math.max(0, Math.min(T, dockTarget));
        if (phoneLand()) {
          headerVisual = headerTarget;
          dockVisual = dockTarget;
        } else {
          const glide = 1 - Math.exp(-dt / 52);
          headerVisual += (headerTarget - headerVisual) * glide;
          dockVisual += (dockTarget - dockVisual) * glide;
          if (Math.abs(headerTarget - headerVisual) < 0.2) headerVisual = headerTarget;
          if (Math.abs(dockTarget - dockVisual) < 0.2) dockVisual = dockTarget;
        }
        if (header) {
          if (host) host.style.setProperty("--chrome-h", `${H}px`);
          header.style.transform = headerVisual > 0.2 ? `translate3d(0,${(-headerVisual).toFixed(2)}px,0)` : "";
          header.classList.toggle("is-away", H > 0 && headerVisual >= H - 0.5);
        }
        if (dock) {
          if (host) host.style.setProperty("--dock-h", `${T}px`);
          dock.style.transform = dockVisual > 0.2 ? `translate3d(0,${dockVisual.toFixed(2)}px,0)` : "";
          dock.classList.toggle("is-away", T > 0 && dockVisual >= T - 0.5);
        }
        if (Math.abs(headerTarget - headerVisual) > 0.2 || Math.abs(dockTarget - dockVisual) > 0.2) raf = requestAnimationFrame(step);
        else { raf = 0; lastTs = 0; }
      };
      step();
      const onScroll = () => {
        if (draggingRef.current) {
          last = read();
          return;
        }
        const y = read();
        let dy = y - last;
        last = y;
        if (phoneLand()) {
          if (Math.abs(dy) > 48) dy = 0;
        } else dy *= 0.8;
        if (searchOpen || calOpen || exportOpen || y <= 0) headerTarget = 0;
        else headerTarget += dy;
        if (y <= 0) dockTarget = 0;
        else dockTarget += dy;
        if (!raf) raf = requestAnimationFrame(step);
      };
      scroller.addEventListener("scroll", onScroll, { passive: true });
      const forget = () => { headerH = 0; dockTravel = 0; };
      window.visualViewport?.addEventListener("resize", forget);
      window.addEventListener("orientationchange", forget);
      return () => {
        scroller.removeEventListener("scroll", onScroll);
        window.visualViewport?.removeEventListener("resize", forget);
        window.removeEventListener("orientationchange", forget);
        if (raf) cancelAnimationFrame(raf);
        if (header) {
          header.style.transform = "";
          header.classList.remove("is-away");
        }
        if (dock) {
          dock.style.transform = "";
          dock.classList.remove("is-away");
        }
        host?.style.removeProperty("--chrome-h");
        host?.style.removeProperty("--dock-h");
      };
    });
    return () => cleanups.forEach((fn) => fn());
  }, [split, searchOpen, calOpen, exportOpen, ready, !!session]);

  useEffect(() => {
    const onBack = (e: Event) => {
      if (e.defaultPrevented || !calOpen) return;
      setCalOpen(false);
      e.preventDefault();
    };
    window.addEventListener("faro-back", onBack);
    return () => window.removeEventListener("faro-back", onBack);
  }, [calOpen]);

  useEffect(() => {
    if (!calOpen) return;
    const close = (e: PointerEvent) => {
      if (!calRef.current?.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [calOpen]);

  // Amber shooting stars behind the calendar: one at a time, every ~4–9s, Tron and night themes only.
  useEffect(() => {
    if (!calOpen) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const fire = () => {
      timer = window.setTimeout(fire, 4000 + Math.random() * 5000);
      const sky = calSky.current;
      const theme = document.documentElement.dataset.theme as ThemeId | undefined;
      if (!sky || document.hidden || !theme || !NIGHT_THEMES.includes(theme) || sky.firstChild) return;
      const star = document.createElement("i");
      star.className = "cal-star";
      const w = sky.clientWidth, h = sky.clientHeight;
      const angle = -(8 + Math.random() * 26) * (Math.random() < 0.5 ? 1 : -1);
      const fromLeft = Math.random() < 0.5;
      const len = 40 + Math.random() * 30;
      const dist = w * (0.55 + Math.random() * 0.35);
      star.style.cssText = `top:${(0.12 + Math.random() * 0.72) * h}px;left:${fromLeft ? -len : w}px;width:${len}px;--a:${fromLeft ? angle : 180 + angle}deg;--d:${dist}px`;
      star.addEventListener("animationend", () => star.remove());
      sky.appendChild(star);
      window.setTimeout(() => star.remove(), 1200);
    };
    timer = window.setTimeout(fire, 1500 + Math.random() * 2500);
    return () => window.clearTimeout(timer);
  }, [calOpen]);

  useEffect(() => {
    if (!ui.highlight) return;
    const timer = window.setTimeout(() => {
      document.querySelector(`[data-line-id="${CSS.escape(ui.highlight)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [ui.highlight, ui.section, ui.year, ui.month]);

  useEffect(() => {
    const onBack = (e: Event) => {
      if (e.defaultPrevented || !searchOpen) return;
      setSearchOpen(false);
      e.preventDefault();
    };
    window.addEventListener("faro-back", onBack);
    return () => window.removeEventListener("faro-back", onBack);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const close = (e: PointerEvent) => {
      const target = e.target as Node;
      if (searchRef.current?.contains(target) || searchPopRef.current?.contains(target)) return;
      setSearchOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const place = () => {
      const desk = deskRef.current;
      const pop = searchPopRef.current;
      if (!desk || !pop) return;
      const bottom = desk.getBoundingClientRect().bottom;
      pop.style.top = `${Math.round(bottom + 8)}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [searchOpen]);

  useEffect(() => {
    const root = segRef.current;
    if (!root) return;
    const current = root.querySelector<HTMLElement>('[aria-current="page"]');
    const pill = root.querySelector<HTMLElement>(".seg-pill");
    if (!current || !pill) return;
    const place = () => {
      pill.style.width = `${current.offsetWidth}px`;
      pill.style.height = `${current.offsetHeight}px`;
      pill.style.transform = `translate3d(${current.offsetLeft}px, ${current.offsetTop}px, 0)`;
      pill.classList.remove("is-gliding");
      void pill.offsetWidth;
      pill.classList.add("is-gliding");
    };
    place();
  }, [ui.section, hub]);

  // Savings tabs: when the four tabs don't fit on one bar (narrow phone, large text, long English labels), they drop their small icons
  // (data-squeeze 1), then tighten their letters (2), so no tab ever spills past the bar. The (?) floats over the bar and takes no room.
  useLayoutEffect(() => {
    const bar = vaultRef.current;
    if (!bar) return;
    const fit = () => {
      const was = bar.getAttribute("data-squeeze");
      const btns = [...bar.querySelectorAll<HTMLElement>(":scope > button")];
      const cs = getComputedStyle(bar);
      const room = bar.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      let level = 0;
      for (; level < 3; level++) {
        if (level) bar.setAttribute("data-squeeze", String(level)); else bar.removeAttribute("data-squeeze");
        btns.forEach((b) => { b.style.flex = "none"; });
        const gap = parseFloat(getComputedStyle(bar).columnGap) || 0;
        const need = btns.reduce((sum, b) => sum + b.getBoundingClientRect().width, 0) + gap * (btns.length - 1);
        btns.forEach((b) => { b.style.flex = ""; });
        if (need <= room + 0.5) break;
      }
      if (level >= 3) bar.setAttribute("data-squeeze", "2");
      if (bar.getAttribute("data-squeeze") !== was) {
        const current = bar.querySelector<HTMLElement>('[aria-current="page"]');
        const glide = bar.querySelector<HTMLElement>(".vault-glide");
        if (current && glide) { glide.style.width = `${current.offsetWidth}px`; glide.style.left = `${current.offsetLeft}px`; }
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(bar);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [hub, lang]);

  useEffect(() => {
    const root = vaultRef.current;
    if (!root) return;
    const current = root.querySelector<HTMLElement>('[aria-current="page"]');
    const glide = root.querySelector<HTMLElement>(".vault-glide");
    if (!current || !glide) return;
    glide.style.width = `${current.offsetWidth}px`;
    glide.style.height = `${current.offsetHeight}px`;
    glide.style.left = `${current.offsetLeft}px`;
    glide.style.top = `${current.offsetTop}px`;
  }, [vault, hub]);

  useEffect(() => {
    const place = (root: HTMLElement | null) => {
      if (!root) return;
      const pill = root.querySelector<HTMLElement>(".dock-glass");
      if (!pill) return;
      const current = root.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]');
      if (!current) {
        pill.classList.remove("is-on", "is-gliding");
        return;
      }
      const glide = pill.classList.contains("is-on");
      if (!glide) pill.style.transition = "none";
      pill.style.width = `${current.offsetWidth}px`;
      pill.style.height = `${current.offsetHeight}px`;
      pill.style.transform = `translate3d(${current.offsetLeft}px, ${current.offsetTop}px, 0)`;
      pill.classList.add("is-on");
      if (!glide) {
        void pill.offsetWidth;
        pill.style.transition = "";
        return;
      }
      pill.classList.remove("is-gliding");
      void pill.offsetWidth;
      pill.classList.add("is-gliding");
    };
    place(railRef.current);
    place(sideRef.current);
    const onResize = () => {
      railRef.current?.querySelector(".dock-glass")?.classList.remove("is-gliding", "is-on");
      sideRef.current?.querySelector(".dock-glass")?.classList.remove("is-gliding", "is-on");
      place(railRef.current);
      place(sideRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ui.section, vault, moneyOpen, ready]);

  const cal = useMemo(() => buildCal(session, calYear, calMonth), [session, calYear, calMonth]);
  const calHol = useMemo(() => new Map(holidaysFor(lang === "en" ? "en" : "es", calYear, calMonth).map((h) => [h.day, h])), [lang, calYear, calMonth]);

  useEffect(() => {
    if (ready && session) window.dispatchEvent(new Event("faro:shell-ready"));
  }, [ready, !!session]);

  // The manual's text: warm it when idle. A deep link (#manual or #manual=<topic>) opens it once, after unlock.
  const linked = useRef(false);
  useEffect(() => {
    if (!ready || !session) return;
    prefetchManual();
    if (linked.current) return;
    linked.current = true;
    const m = /^#manual(?:=([\w-]+))?$/.exec(location.hash);
    if (!m) return;
    history.replaceState(history.state, "", location.pathname + location.search);
    faro.openManual(m[1] ?? "");
  }, [ready, !!session]);

  // "Ir allí" to Cambio on a wide screen opens the side panel (the sheet is for phones).
  useEffect(() => {
    const onOpen = (e: Event) => { if ((e as CustomEvent).detail === "money-aside") setMoneyOpen(true); };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);

  if (!ready || !session) {
    return (
      <main className="splash">
        <div className="splash-beam" aria-hidden />
        <div className="brand-lockup">
          <Mark className="size-12" bold />
          <h1 className="text-5xl">Faro</h1>
          <p className="tagline">{t("boot")}</p>
        </div>
      </main>
    );
  }

  const today = new Date();
  const onThisMonth = ui.year === today.getFullYear() && ui.month === today.getMonth() + 1;
  const display = session.ledger.settings.display;
  const week = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { weekday: "narrow" }).format;
  const weekStart = new Date(2024, 0, 1);

  const homeSide = moneyOpen || vault || ui.section === "desk" || ui.section === "settings" ? "left" : "right";
  const dockClass = !split ? (homeSide === "left" ? " is-hide-right" : " is-hide-left") : "";

  const openLower = () => setLower((cur) => (cur === ui.section ? pairedSection(ui.section) : cur));
  const toggleFloat = () => {
    if (!floatOn) {
      const taken = new Set<SectionId>([ui.section, ...(split ? [lower] : [])]);
      if (taken.has(floatSection)) {
        const pick = (["advice", "stats", "desk", "income", "variable"] as SectionId[]).find((id) => !taken.has(id));
        if (pick) setFloatSection(pick);
      }
      setFloatMin(false);
      setFloatOn(true);
      return;
    }
    setFloatMin((m) => !m);
  };
  return (
    <>
    <PeopleInbox />
    <BankDock />
    <div ref={frameRef} className={`app-frame${split ? " is-split" : ""}${wide && split && splitAxis === "col" ? " is-cols" : ""}${dragging ? " is-dragging" : ""}${dockClass}`}>
      <nav ref={railRef} className="rail" aria-label={t("nav.desk")}>
        <div className="dock-face">
        <i className="dock-glass" aria-hidden />
        <button type="button" className="nav-btn" aria-current={!moneyOpen && !vault && ui.section === "desk" ? "page" : undefined} onClick={() => guardPanelExit(() => { setRecall(false); setMoneyOpen(false); setVault(null); setUi({ section: "desk" }); })}>
          <SectionIcon id="desk" />
          <span>{t("nav.desk")}</span>
        </button>
        {VAULT.map((id) => (
          <button key={id} type="button" className="nav-btn" aria-current={!moneyOpen && vault === id ? "page" : undefined} onClick={() => guardPanelExit(() => {
            setRecall(false);
            setMoneyOpen(false);
            if (hub !== "books") setUi({ section: "income" });
            if (vault && vault !== id) setSlideDir(VAULT.indexOf(id) > VAULT.indexOf(vault as (typeof VAULT)[number]) ? 1 : -1);
            setVault(id);
          })}>
            {id === "save" ? <Landmark className="size-4" /> : id === "meta" ? <Flag className="size-4" /> : id === "retiro" ? <Hourglass className="size-4" /> : <Shield className="size-4" />}
            <span>{id === "save" ? t("desk.savings") : id === "meta" ? t("vault.meta") : id === "retiro" ? t("vault.retiro") : t("vault.emerg")}</span>
          </button>
        ))}
        <button ref={moneyDock} type="button" className="nav-btn" aria-pressed={moneyOpen} onClick={() => { setRecall(false); setMoneyOpen((open) => !open); }}>
          <Coins className="size-4" />
          <span>{t("convert.title")}</span>
        </button>
        <button type="button" className="nav-btn" aria-current={!moneyOpen && !vault && ui.section === "settings" ? "page" : undefined} onClick={() => { setRecall(false); setMoneyOpen(false); setVault(null); setUi({ section: "settings" }); }}>
          <SectionIcon id="settings" />
          <span>{t("nav.settings")}</span>
        </button>
        </div>
      </nav>
      <div className={split ? "split-stack" : "stage"} ref={stackRef}>
        <div ref={topPaneRef} className={split ? "split-pane" : "stage-pane"} style={split ? { flex: `0 0 ${draggingRef.current ? liveRatio.current : splitRatio}%` } : undefined}>
        <header className="top-chrome">
          <span className="cp-kata" aria-hidden="true">サイバーパンク</span>
          <SampleEdge />
          <div className="top-scale">{topScaleOn ? <DebtScale top value={topDebt} onPick={pickTopDebt} /> : null}</div>
          <div className="top-row">
            <button type="button" className="brand-mini" data-anchor="top-brand" onClick={() => { setRecall(false); setMoneyOpen(false); setVault(null); setUi({ section: "desk" }); }}>
              <span className="brand-lamp" aria-hidden>
                <i className="brand-beam" />
                <i className="brand-glow" />
                <Mark className="size-7" bold />
              </span>
              <span className="brand-word">Faro</span>
              <SamplePill />
              <i data-anchor="top-sync" className={`sync-dot ${sync}`} title={t(SYNC_KEY[sync])} />
            </button>
            <div className="top-actions">
              <div className="hist-nav" data-anchor="top-undo">
                <button type="button" className="hist-btn" aria-label={t("undo")} disabled={!canUndo} onClick={undo}>
                  <Undo2 />
                </button>
                <button type="button" className="hist-btn" aria-label={t("redo")} disabled={!canRedo} onClick={redo}>
                  <Redo2 />
                </button>
              </div>
              <div className="desk-grid">
                <ExportPanel open={exportOpen} onOpenChange={setExportOpen} />
                <button type="button" data-anchor="top-gear" className="icon-btn phone-gear" aria-label={t("nav.settings")} aria-current={hub === "settings" ? "page" : undefined} onClick={() => setUi({ section: "settings" })}>
                  <Settings className="size-4" />
                </button>
              </div>
              <div className="account-slot"><UserButton /></div>
            </div>
          </div>
          <div className="icon-desk" ref={deskRef}>
            <div className="hub-line">
              <span className="hub-mark" aria-hidden />
              <span className="hub-name">{hub === "books" ? t("hub.books") : hub === "study" ? t("hub.study") : hub === "settings" ? t("nav.settings") : t("nav.desk")}</span>
              <Hint topic={hub === "books" ? "libros" : hub === "study" ? (ui.section === "advice" ? "asesor" : "estudio") : hub === "settings" ? "ajustes" : "central"} className="hub-hint" avoid=".icon-desk .icon-desk-tools > *" />
            </div>
            <div className="icon-desk-tools">
              <button
                type="button"
                className="icon-btn theme-toggle cal-launch"
                data-anchor="top-theme"
                aria-label={NIGHT_THEMES.includes(session.ledger.settings.theme) ? t("theme.day") : t("theme.night")}
                onClick={() => {
                  const current = session.ledger.settings.theme;
                  const night = NIGHT_THEMES.includes(current);
                  if (night) localStorage.setItem("faro-night-theme", current);
                  else localStorage.setItem("faro-day-theme", current);
                  const stored = localStorage.getItem(night ? "faro-day-theme" : "faro-night-theme");
                  const pool = night ? DAY_THEMES : NIGHT_THEMES;
                  const next = stored && pool.includes(stored as ThemeId) ? stored as ThemeId : night ? "claro" : "oscuro";
                  faro.commit((s) => ({ ...s, settings: { ...s.settings, theme: next } }), next);
                }}
              >
                {NIGHT_THEMES.includes(session.ledger.settings.theme) ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <div className="cal-anchor view-anchor" ref={viewRef} data-anchor="top-view">
                <button
                  type="button"
                  className={`icon-btn theme-toggle cal-launch${split || floatOn ? " is-on" : ""}`}
                  aria-haspopup="menu"
                  aria-expanded={viewOpen}
                  aria-label={t("view.title")}
                  onClick={() => setViewOpen((o) => !o)}
                >
                  {floatOn && !split ? <PictureInPicture2 className="size-4" /> : wide && split && splitAxis === "col" ? <Columns2 className="size-4" /> : <Rows2 className="size-4" />}
                </button>
                {viewOpen ? (
                  <div className="view-menu" role="menu" aria-label={t("view.title")}>
                    <p className="view-menu-kicker">{t("view.title")}</p>
                    <div className="view-menu-row">
                      <button type="button" role="menuitemradio" aria-checked={!split} onClick={() => { setSplit(false); setViewOpen(false); }}>
                        <i className="view-glyph is-one" aria-hidden><b /></i>
                        <span>{t("split.one")}</span>
                      </button>
                      {wide ? (
                        <button type="button" role="menuitemradio" aria-checked={split && splitAxis === "col"} onClick={() => { const fresh = !split; setSplitAxis("col"); if (fresh) { setSplitRatio(50); openLower(); } setSplit(true); setViewOpen(false); }}>
                          <i className="view-glyph is-col" aria-hidden><b /><b /></i>
                          <span>{t("view.cols")}</span>
                        </button>
                      ) : null}
                      <button type="button" role="menuitemradio" aria-checked={split && (!wide || splitAxis === "row")} onClick={() => { const fresh = !split; setSplitAxis("row"); if (fresh) openLower(); setSplit(true); setViewOpen(false); }}>
                        <i className="view-glyph is-row" aria-hidden><b /><b /></i>
                        <span>{t("view.rows")}</span>
                      </button>
                    </div>
                    <button type="button" className="view-float" role="menuitemcheckbox" aria-checked={floatOn} onClick={() => { toggleFloat(); setViewOpen(false); }}>
                      <PictureInPicture2 className="size-4" />
                      <span>{floatOn ? (floatMin ? t("float.unfold") : t("float.fold")) : t("float")}</span>
                      {floatOn ? <X className="size-3.5 view-float-x" aria-label={t("float.close")} onClick={(e) => { e.stopPropagation(); setFloatOn(false); setFloatMin(false); setViewOpen(false); }} /> : null}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="cal-anchor search-anchor" ref={searchRef} data-anchor="top-search">
                <button type="button" className="icon-btn theme-toggle cal-launch" aria-label={t("search")} aria-expanded={searchOpen} onClick={() => setSearchOpen((v) => !v)}>
                  <Search className="size-4" />
                </button>
              </div>
              <div className="desk-grid">
                <div className="cal-anchor" ref={calRef} data-anchor="top-cal">
                  <button
                    type="button"
                    className="icon-btn theme-toggle cal-launch"
                    aria-expanded={calOpen}
                    aria-haspopup="dialog"
                    aria-label={t("month.calendar")}
                    onClick={() => {
                      setExportOpen(false);
                      setCalYear(ui.year);
                      setCalMonth(ui.month);
                      setCalDay(null);
                      setCalOpen((open) => !open);
                    }}
                  >
                    <CalendarDays className="size-4" />
                    {onThisMonth ? null : <i className="cal-away" />}
                  </button>
                  {calOpen ? (
                    <div
                      className="cal-sheet"
                      role="dialog"
                      aria-label={t("month.calendar")}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        calDrag.current = { x: e.clientX, y: e.clientY, moved: false };
                      }}
                      onPointerMove={(e) => {
                        const dx = e.clientX - calDrag.current.x;
                        const dy = e.clientY - calDrag.current.y;
                        if (!calDrag.current.moved) {
                          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                          if (Math.abs(dy) > Math.abs(dx)) return;
                          calDrag.current.moved = true;
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }
                        const body = calBody.current;
                        if (!body) return;
                        const cap = Math.max(-78, Math.min(78, dx));
                        body.style.transition = "none";
                        body.style.transform = `translate3d(${cap}px,0,0)`;
                      }}
                      onPointerUp={(e) => {
                        const dx = e.clientX - calDrag.current.x;
                        const dy = e.clientY - calDrag.current.y;
                        const body = calBody.current;
                        const slide = Math.abs(dx) >= 26 && Math.abs(dx) > Math.abs(dy);
                        if (!slide) {
                          if (body) {
                            body.style.transition = "transform 160ms cubic-bezier(.22,1,.36,1)";
                            body.style.transform = "translate3d(0,0,0)";
                          }
                          return;
                        }
                        calDrag.current.moved = true;
                        const next = new Date(calYear, calMonth - 1 + (dx < 0 ? 1 : -1), 1);
                        if (body) {
                          body.style.transition = "transform 160ms cubic-bezier(.22,1,.36,1)";
                          body.style.transform = `translate3d(${dx < 0 ? -48 : 48}px,0,0)`;
                        }
                        setCalYear(next.getFullYear());
                        setCalMonth(next.getMonth() + 1);
                        setCalDay(null);
                        requestAnimationFrame(() => {
                          if (!calBody.current) return;
                          calBody.current.style.transition = "none";
                          calBody.current.style.transform = `translate3d(${dx < 0 ? 36 : -36}px,0,0)`;
                          requestAnimationFrame(() => {
                            if (!calBody.current) return;
                            calBody.current.style.transition = "transform 180ms cubic-bezier(.22,1,.36,1)";
                            calBody.current.style.transform = "translate3d(0,0,0)";
                          });
                        });
                      }}
                    >
                      <div className="cal-sky" ref={calSky} aria-hidden="true" />
                      <div className="cal-slide" ref={calBody}>
                        <button type="button" className={`cal-month${calYear === today.getFullYear() && calMonth === today.getMonth() + 1 ? "" : " is-away"}`} onClick={() => { const n = new Date(); setCalYear(n.getFullYear()); setCalMonth(n.getMonth() + 1); setCalDay(null); }}>
                          {monthName(lang, calMonth)} {calYear}
                        </button>
                        <div className="cal-week">
                          {Array.from({ length: 7 }, (_, i) => <span key={i}>{week(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i))}</span>)}
                        </div>
                        <div className="cal-days">
                          {Array.from({ length: cal.lead }, (_, i) => <span key={`e${i}`} />)}
                          {cal.cells.map((cell) => (
                            <button key={cell.day} type="button" className={[cell.day === calDay ? "is-pick" : cell.today ? "is-today" : "", calHol.get(cell.day) ? `is-hol is-${calHol.get(cell.day)!.kind}` : ""].join(" ").trim() || undefined} title={calHol.get(cell.day)?.name} onClick={() => setCalDay(cell.day)}>
                              <span>{cell.day}</span>
                              <span className="cal-dots">{cell.dots.map((tone) => <i key={tone} className={tone} />)}</span>
                            </button>
                          ))}
                        </div>
                        <div className="cal-foot">
                          <span><em>{t("cal.in")}</em><strong className="num good">{fmt(cal.income)}</strong></span>
                          <span><em>{t("cal.out")}</em><strong className="num bad">{fmt(cal.expense)}</strong></span>
                          <span><em>{t("cal.net")}</em><strong className="num">{fmt(cal.income - cal.expense)}</strong></span>
                        </div>
                        {calDay && calHol.get(calDay) ? <p className={`cal-hol is-${calHol.get(calDay)!.kind}`}>{calHol.get(calDay)!.name}</p> : null}
                        {calDay ? (
                          <div className="cal-pick">
                            <div className="cal-names">
                              {(cal.days.get(calDay)?.items ?? []).length ? cal.days.get(calDay)!.items.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    if (item.vault) setUi({ section: "income", vault: item.vault, year: calYear, month: calMonth });
                                    else setUi({ section: placeFor(item.kind), year: calYear, month: calMonth, highlight: item.id });
                                    setCalOpen(false);
                                  }}
                                >
                                  {item.name}
                                </button>
                              )) : <p>{t("cal.empty")}</p>}
                            </div>
                            <button type="button" onClick={() => setCalDay(null)}>{t("cal.use")}</button>
                          </div>
                        ) : cal.undated > 0 ? (
                          <p className="cal-note">{cal.undated} {t("cal.undated")}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              <button
                type="button"
                className="currency-bubble"
                data-anchor="top-coin"
                aria-label={t("currency.toggle")}
                onClick={() => faro.commit((s) => ({ ...s, settings: { ...s.settings, display: s.settings.display === "NIO" ? "USD" : "NIO" } }), "Vista")}
              >
                <svg viewBox="0 0 32 32" className="gold-coin" aria-hidden>
                  <defs>
                    <radialGradient id="faro-coin" cx="32%" cy="28%" r="72%">
                      <stop offset="0%" stopColor="#fff6d8" />
                      <stop offset="42%" stopColor="#e4c27a" />
                      <stop offset="100%" stopColor="#8a6118" />
                    </radialGradient>
                  </defs>
                  <circle cx="16" cy="16" r="15" fill="url(#faro-coin)" />
                  <circle cx="16" cy="16" r="13.2" fill="none" stroke="#6a4c12" strokeWidth="0.6" />
                  <circle cx="16" cy="16" r="14.2" fill="none" stroke="#a47b2e" strokeWidth="1.1" strokeDasharray="0.8 1.05" />
                  <text x="16" y="16.8" textAnchor="middle" dominantBaseline="middle">{display === "NIO" ? "C$" : "$"}</text>
                </svg>
              </button>
              </div>
            </div>
            {searchOpen ? (
              <form
                className="search-pop"
                role="search"
                ref={searchPopRef}
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="search-pill">
                  <Search className="size-4" aria-hidden />
                  <input id="faro-search" type="search" enterKeyHint="search" value={ui.query} placeholder={t("search")} autoFocus onChange={(e) => setUi({ query: e.target.value })} />
                </div>
                {ui.query.trim().length >= 2 ? (
                  <div className="hits" role="listbox">
                    {hits.length === 0 && settingHits.length === 0 && (manualData || manualGaveUp) ? <p className="p-3 text-sm">{t("search.empty")}</p> : null}
                    {/* 1.3.142 order inside Ajustes: settings first, books under their own header. From anywhere
                        else (1.3.148) the books lead as they always did and the settings follow under theirs. */}
                    {inSettings ? (
                      <>
                        {settingHits.length ? <p className="hit-group">{lang === "en" ? "In Settings" : "En Ajustes"}</p> : null}
                        {renderSettingHits()}
                        {settingHits.length && hits.length ? <p className="hit-group">{lang === "en" ? "In your books" : "En tus libros"}</p> : null}
                        {renderBookHits()}
                      </>
                    ) : (
                      <>
                        {renderBookHits()}
                        {settingHits.length ? <p className="hit-group">{lang === "en" ? "In Settings" : "En Ajustes"}</p> : null}
                        {renderSettingHits()}
                      </>
                    )}
                  </div>
                ) : null}
              </form>
            ) : null}
          </div>
        </header>
        <FaroPane map={mapTop}>
        <div className="workspace">
          <main
            ref={mainRef}
            className="main-pad"
            data-swipe="loop"
            onPointerDownCapture={(e) => {
              swiped.current = false; // a swipe that produced no click must not swallow the next real tap
if (swipeBlocked(e.currentTarget, e.target as Element)) return;
              swipe.current = { x: e.clientX, y: e.clientY, type: e.pointerType, axis: null, el: e.pointerType === "mouse" ? null : dragTarget(e.currentTarget, e.target as HTMLElement, hub) };
              // Touch/pen only: capturing a mouse press retargets its click to <main>, so desktop clicks never reach the row.
              if (e.pointerType !== "mouse") e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const st = swipe.current;
              if (!st || st.type === "mouse" || (hub !== "books" && hub !== "desk")) return;
              const dx = e.clientX - st.x, dy = e.clientY - st.y;
              if (st.axis !== "x") { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; st.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? "x" : "y"; }
              if (st.axis === "x") dragPane(st.el, dx);
            }}
            onPointerCancel={() => { if (swipe.current?.axis === "x") dragPane(swipe.current.el, null); swipe.current = null; }}
            onPointerUp={(e) => {
              const start = swipe.current;
              swipe.current = null;
              if (!start) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              if (!split && window.matchMedia(TABLET_RING_MQ).matches) {
                // 1.3.119 tablet/desktop (one pane, >= 1100 wide): a swipe walks every option of both bands as one loop
                // (left band top to bottom, then the right band, then back to the left). The band of the screen shown is the
                // docked one (homeSide), so crossing the end of one band opens the other and puts the first behind its tab.
                // (Estudio, Asesor and Ajustes never set an axis on move, so the release itself decides there.)
                const flat = start.type === "mouse" ? Math.abs(dx) >= 36 && Math.abs(dx) >= Math.abs(dy) : start.axis !== "y" && Math.abs(dx) >= 40 && Math.abs(dx) >= Math.abs(dy) * 1.3;
                if (!flat) { if (start.axis === "x") dragPane(start.el, null); return; }
                swiped.current = true;
                const dir = dx < 0 ? 1 : -1;
                const at = dockRingIndex(moneyOpen, vault, ui.section);
                const next = DOCK_RING[(at + dir + DOCK_RING.length) % DOCK_RING.length]!;
                const el = start.el;
                setSlideDir(dir);
                setRecall(false);
                if (next.kind === "money") setMoneyOpen(true);
                else if (next.kind === "vault") { setMoneyOpen(false); setUi({ ...(hub === "books" && ui.section !== "subs" ? {} : { section: "income" as SectionId }), vault: next.id }); }
                else { setMoneyOpen(false); setUi({ section: next.id, vault: null }); }
                window.setTimeout(() => dragPane(el, null), 0); // a panel that stays (same node kept) springs back
                return;
              }
              if (hub === "desk" && start.type !== "mouse") {
                // Touch on Central: one ring through Tengo · Gastaré · Pagos · Meta · Retiro · Emergencia (Desk does the step).
                if (start.axis !== "x" || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) { if (start.axis === "x") dragPane(start.el, null); return; }
                swiped.current = true;
                const dir = dx < 0 ? 1 : -1;
                markRing();
                setSlideDir(dir);
                const el = start.el;
                window.dispatchEvent(new CustomEvent("faro-lens", { detail: { dir, ring: true } }));
                window.setTimeout(() => dragPane(el, null), 0); // the panel that stays (same pocket kept) springs back
                return;
              }
              if (hub === "books" && start.type !== "mouse") {
                // Touch: one ring through all ten books. Clearly horizontal and past 40px, or the pane springs back.
                if (start.axis !== "x" || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) { if (start.axis === "x") dragPane(start.el, null); return; }
                swiped.current = true;
                const dir = dx < 0 ? 1 : -1;
                const next = ringNext(ui.section, vault, dir);
                markRing();
                setSlideDir(dir);
                setRecall(false);
                setMoneyOpen(false);
                if ((TOP_BOOKS as readonly string[]).includes(next)) setUi({ section: next as SectionId, vault: null });
                else setUi({ ...(hub === "books" && ui.section !== "subs" ? {} : { section: "income" as SectionId }), vault: next as VaultTab });
                ringLand(e.currentTarget, next);
                return;
              }
              if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
              swiped.current = true;
              const dir = dx < 0 ? 1 : -1;
              setSlideDir(dir);
              const docksOn = !split && window.matchMedia("(min-width: 1100px), (orientation: landscape) and (max-height: 520px) and (max-width: 1099px)").matches;
              if (docksOn) {
                setRecall(false);
                const onLeft = moneyOpen || !!vault || ui.section === "desk" || ui.section === "settings";
                const dock = onLeft ? LEFT_DOCK : RIGHT_DOCK;
                const index = dock.findIndex((stop) => {
                  if (moneyOpen) return stop.kind === "money";
                  if (vault) return stop.kind === "vault" && stop.id === vault;
                  return stop.kind === "section" && stop.id === ui.section;
                });
                const next = dock[(Math.max(0, index) + dir + dock.length) % dock.length];
                if (!next || next.kind === "money") {
                  setMoneyOpen(true);
                } else if (next.kind === "vault") {
                  setMoneyOpen(false);
                  if (hub !== "books") setUi({ section: "income" });
                  setVault(next.id);
                } else {
                  setMoneyOpen(false);
                  setVault(null);
                  setUi({ section: next.id });
                }
              } else if (hub === "desk") window.dispatchEvent(new CustomEvent("faro-lens", { detail: dir }));
              else if (hub === "books" && (vault === "owed" || vault === "owe")) setVault(vault === "owed" ? "owe" : "owed");
              else if (hub === "books" && vault) {
                const i = VAULT.indexOf(vault as (typeof VAULT)[number]);
                setVault(VAULT[(i + dir + VAULT.length) % VAULT.length]);
              } else goSection(dir);
            }}
            onClickCapture={(e) => {
              if (!swiped.current) return;
              swiped.current = false;
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {persistFailed ? <p className="persist-banner" role="alert">{t("persist.fail")}</p> : null}
            {tabConflict ? <p className="persist-banner" role="alert">{t("pack.tabConflict")} <button type="button" onClick={dismissTabConflict}>{t("close")}</button></p> : null}
            {hub === "books" ? (
              <BooksHub vault={vault} onVault={setVault} segRef={segRef} vaultRef={vaultRef} slideDir={slideDir} onSlide={setSlideDir} anchors bar />
            ) : null}
            {hub === "study" ? (
              <div className="pane">
                <div className="seg is-follow is-pair" ref={segRef} role="tablist" aria-label={t("hub.study")}>
                  <i className="seg-pill" aria-hidden />
                  {STUDY.map((id) => (
                    <button key={id} type="button" role="tab" aria-selected={ui.section === id} aria-current={ui.section === id ? "page" : undefined} onClick={() => setUi({ section: id })}>
                      <span className="seg-ico" aria-hidden><SectionIcon id={id} className="size-3.5" /></span>
                      <span className="seg-label">{t(`nav.${id}`)}</span>
                    </button>
                  ))}
                </div>
                {ui.section === "advice" ? <Advisor /> : <Study />}
              </div>
            ) : null}
            {hub === "desk" ? <Desk /> : null}
            {hub === "settings" ? <SettingsScreen /> : null}
          </main>
          <aside ref={moneyPanel} className={`aside${moneyOpen ? " is-open" : ""}`}>
            {moneyOpen ? <button type="button" className="money-resize" aria-label={lang === "en" ? "Resize" : "Tamaño"} onPointerDown={resizeMoney} /> : null}
            {moneyOpen ? <button type="button" className="tool-close money-close" aria-label={t("close")} title={t("close")} onClick={() => setMoneyOpen(false)}><X /></button> : null}
            <Instruments pinned />
          </aside>
          {ui.instruments && !split ? <ToolSheet /> : null}
        </div>
        </FaroPane>
        <DockNav section={ui.section} onSection={(id) => guardPanelExit(() => setUi({ section: id }))} />
        {split && ui.instruments && toolHost === "top" ? <ToolSheet contained /> : null}
      </div>
      {split ? (
        <div
          className="split-grip"
          role="separator"
          aria-orientation={wide && splitAxis === "col" ? "vertical" : "horizontal"}
          aria-valuemin={SPLIT_MIN}
          aria-valuemax={SPLIT_MAX}
          aria-valuenow={splitRatio}
          aria-label={t("split")}
          tabIndex={0}
          onPointerDown={dragSplit}
          onKeyDown={(e) => {
            const cols = wide && splitAxis === "col";
            if (cols ? e.key === "ArrowLeft" : e.key === "ArrowUp") setSplitRatio((n) => clampSplit(n - 4));
            if (cols ? e.key === "ArrowRight" : e.key === "ArrowDown") setSplitRatio((n) => clampSplit(n + 4));
          }}
        >
          <i />
        </div>
      ) : null}
      {split ? <SplitLower section={lower} onSection={setLower} showTools={ui.instruments && toolHost === "lower"} onClaim={claimLower} /> : null}
      </div>
      <nav ref={sideRef} className="side-dock" aria-label={t("hub.books")}>
        <div className="dock-face">
        <i className="dock-glass" aria-hidden />
        {([...BOOKS, ...STUDY] as SectionId[]).map((id) => (
          <button key={id} type="button" className="nav-btn" aria-current={!moneyOpen && !vault && ui.section === id ? "page" : undefined} onClick={() => guardPanelExit(() => { setRecall(false); setMoneyOpen(false); setVault(null); setUi({ section: id }); })}>
            <SectionIcon id={id} />
            <span>{t(id === "subs" ? "tab.subs" : `nav.${id}`)}</span>
          </button>
        ))}
        </div>
      </nav>
      {!split ? (
        <button
          type="button"
          className={`dock-recall is-${homeSide === "left" ? "right" : "left"}${recallRef.current ? " is-open" : ""}`}
          data-show={lang === "en" ? "Show dock" : "Mostrar barra"}
          data-hide={lang === "en" ? "Hide dock" : "Ocultar barra"}
          aria-expanded={recallRef.current}
          aria-label={lang === "en" ? (recallRef.current ? "Hide dock" : "Show dock") : (recallRef.current ? "Ocultar barra" : "Mostrar barra")}
          onPointerDown={(e) => { if (e.pointerType !== "mouse") { e.preventDefault(); setRecall((open) => !open); recallTap.current = performance.now(); } }}
          onClick={() => { if (performance.now() - recallTap.current < 600) return; setRecall((open) => !open); }}
        >
          {homeSide === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      ) : null}
      {floatOn ? (
        <FloatWindow
          section={floatSection}
          onSection={setFloatSection}
          folded={floatMin}
          onFold={setFloatMin}
          onClose={() => { setFloatOn(false); setFloatMin(false); }}
          onFull={(id) => { setFloatOn(false); setFloatMin(false); setRecall(false); setMoneyOpen(false); setVault(null); setUi({ section: id }); }}
        />
      ) : null}
      <Help />
    </div>
    {ui.manual !== null ? <Suspense fallback={<div className="mn-layer is-loading" />}><ManualLayer /></Suspense> : null}
    <FocusHost />
    <ToTop lang={lang} />
    {inAndroidApp() ? <Suspense fallback={null}><ShareInbox /></Suspense> : null}
    {inAndroidApp() ? <Suspense fallback={null}><DocInbox /></Suspense> : null}
    {inAndroidApp() ? <WidgetHost /> : null}
    </>
  );
}

function ToolSheet({ contained = false }: { contained?: boolean }) {
  const { t, setUi } = useFaro();
  return (
    <div className={`tool-sheet${contained ? " is-pane" : ""}`} role="dialog" aria-label={t("convert.title")}>
      <div className="tool-sheet-bar">
        <div className="brand-mini tool-brand" aria-label="Faro">
          <span className="brand-lamp" aria-hidden>
            <i className="brand-beam" />
            <i className="brand-glow" />
            <Mark className="size-9" bold />
          </span>
          <span className="brand-word">Faro</span>
        </div>
        <button type="button" className="tool-close" aria-label={t("close")} title={t("close")} onClick={() => setUi({ instruments: false, calcOpen: false })}><X /></button>
      </div>
      <div className="tool-sheet-body">
        <Instruments contained={contained} />
      </div>
    </div>
  );
}

function DockNav({ section, onSection }: { section: SectionId; onSection: (id: SectionId) => void }) {
  const { t } = useFaro();
  const hub = hubOf(section);
  return (
    <nav className="dock" data-anchor="nav-dock" style={{ ["--dock" as string]: hub === "books" ? 1 : hub === "study" ? 2 : 0 }} aria-label={t("nav.desk")}>
      <i className="dock-glide" aria-hidden><i key={hub} className="dock-sheen" /></i>
      <button type="button" className="nav-btn" aria-current={hub === "desk" ? "page" : undefined} onClick={() => { if (hub !== "desk") onSection("desk"); }}>
        <SectionIcon id="desk" />
        <span>{t("nav.desk")}</span>
      </button>
      <button type="button" className="nav-btn" aria-current={hub === "books" ? "page" : undefined} onClick={() => { if (hub !== "books") onSection("income"); }}>
        <SectionIcon id="income" />
        <span>{t("hub.books")}</span>
      </button>
      <button type="button" className="nav-btn" aria-current={hub === "study" ? "page" : undefined} onClick={() => { if (hub !== "study") onSection("stats"); }}>
        <SectionIcon id="stats" />
        <span>{t("hub.study")}</span>
      </button>
    </nav>
  );
}

function SplitLower({ section, onSection, showTools, onClaim }: { section: SectionId; onSection: (id: SectionId) => void; showTools: boolean; onClaim: () => void }) {
  const map = useCallback((api: Api): Api => ({
    ...api,
    ui: { ...api.ui, section },
    goSection: (delta: number) => onSection(stepSection(section, delta)),
    setUi: (patch) => {
      const { section: next, ...rest } = patch;
      if (next && next !== "settings") onSection(next);
      else if (next === "settings") api.setUi({ section: "settings" });
      if (rest.instruments || rest.calcOpen) onClaim();
      if (Object.keys(rest).length) api.setUi(rest);
    },
  }), [section, onSection, onClaim]);
  return (
    <FaroPane map={map}>
      <div className="split-pane is-lower">
        <div className="workspace">
          <SectionView />
        </div>
        <DockNav section={section} onSection={onSection} />
        {showTools ? <ToolSheet contained /> : null}
      </div>
    </FaroPane>
  );
}

/* 1.3.96 — the savings row has its own quiet "deposit": the icon lifts 1.5px and settles, a thin line in the tab's colour fills the
   button's bottom edge, then one faint sheen crosses the pocket's first card and the next blocks fill with a faint light from the
   bottom (70 ms apart). Only on a tap or a ring landing, never on load or Back. Overlays and `translate` only: nothing below moves. */
const VAULT_TONE: Record<(typeof VAULT)[number], string> = { save: SAVINGS_PURPLE, meta: "#8fb9a6", retiro: "#72b4b2", emergencia: "#7aa2c4" };
function useVaultHello(vaultRef: React.RefObject<HTMLDivElement | null>) {
  const [tap, setTap] = useState<{ id: string; x: number; y: number; n: number } | null>(null);
  const timers = useRef<number[]>([]);
  const hello = useCallback((id: string, point?: { x: number; y: number }) => {
    const bar = vaultRef.current;
    const btn = bar?.querySelector<HTMLElement>(`button[data-vault="${id}"]`);
    if (!bar || !btn) return;
    const r = btn.getBoundingClientRect();
    setTap((t) => ({ id, x: point ? point.x - r.left : r.width / 2, y: point ? point.y - r.top : r.height / 2, n: (t?.n ?? 0) + 1 }));
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [window.setTimeout(() => setTap(null), 680)];
    // After the new pane has mounted and its slide has begun, so the light lands on what is really there.
    timers.current.push(window.setTimeout(() => {
      const pane = bar.parentElement?.querySelector<HTMLElement>(":scope > .swipe-pane");
      const tone = btn.style.getPropertyValue("--vtone");
      const els = [...(pane?.querySelectorAll<HTMLElement>(".vault-block") ?? [])]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).slice(0, 3);
      const fx = (i: number) => (i === 0 ? "is-vsheen" : "is-vrise");
      els.forEach((el, i) => {
        // The visible card can sit a level or two down (MES: .span-cut → .span-fold-bar): take the first rounded one.
        let card = el.firstElementChild as HTMLElement | null;
        for (let k = 0; k < 3 && card && parseFloat(getComputedStyle(card).borderTopLeftRadius) === 0; k++) card = card.firstElementChild as HTMLElement | null;
        el.classList.remove("is-vsheen", "is-vrise");
        void el.offsetWidth;
        el.style.setProperty("--vhello-tone", tone);
        el.style.setProperty("--vhello-r", card && parseFloat(getComputedStyle(card).borderTopLeftRadius) > 0 ? getComputedStyle(card).borderRadius : "18px");
        el.style.setProperty("--hello-d", `${i * 70}ms`);
        el.classList.add(fx(i));
        timers.current.push(window.setTimeout(() => el.classList.remove(fx(i)), 700 + i * 70));
      });
    }, 120));
  }, [vaultRef]);
  useEffect(() => {
    const on = (e: Event) => {
      const { id, root } = (e as CustomEvent<{ id: string; root?: Element }>).detail;
      if (root && vaultRef.current && !root.contains(vaultRef.current)) return;
      hello(id);
    };
    window.addEventListener("faro-vault-tap", on);
    return () => { window.removeEventListener("faro-vault-tap", on); timers.current.forEach((t) => window.clearTimeout(t)); };
  }, [hello, vaultRef]);
  return { tap, hello };
}

/** Libros: top row (four books), middle row (Me deben · Debo), bottom row (savings), then the chosen pane. Shared by the
 *  main view and the split/float panes. `vault` holds the lower rows' choice (savings tab or debt side). */
const TOP_SCALE_MQ = "(min-width: 1100px) and (min-height: 600px)";
function useTopScaleOn(split: boolean): boolean {
  const [on, setOn] = useState(() => typeof window !== "undefined" && window.matchMedia(TOP_SCALE_MQ).matches);
  useLayoutEffect(() => {
    const mq = window.matchMedia(TOP_SCALE_MQ);
    const pick = () => setOn(mq.matches);
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, []);
  return on && !split;
}
function useTopScaleSlot(): HTMLElement | null {
  const find = () => (typeof window !== "undefined" && window.matchMedia(TOP_SCALE_MQ).matches ? document.querySelector<HTMLElement>(".app-frame:not(.is-split) .top-chrome > .top-scale") : null);
  const [slot, setSlot] = useState<HTMLElement | null>(find);
  useLayoutEffect(() => {
    const mq = window.matchMedia(TOP_SCALE_MQ);
    const pick = () => setSlot(find());
    pick();
    mq.addEventListener("change", pick);
    const f = document.querySelector(".app-frame");
    const mo = f ? new MutationObserver(pick) : null;
    if (f && mo) mo.observe(f, { attributes: true, attributeFilter: ["class"], childList: true, subtree: false });
    return () => { mq.removeEventListener("change", pick); mo?.disconnect(); };
  }, []);
  return slot && slot.isConnected ? slot : null;
}

function BooksHub({ vault, onVault, segRef, vaultRef, slideDir, onSlide, anchors = false, bar = false }: {
  vault: VaultTab | null; onVault: (next: VaultTab | null) => void; segRef: React.RefObject<HTMLDivElement | null>; vaultRef: React.RefObject<HTMLDivElement | null>;
  slideDir: number; onSlide: (dir: number) => void; anchors?: boolean; bar?: boolean;
}) {
  const { t, ui, setUi } = useFaro();
  const debt: DebtSide | null = vault === "owed" || vault === "owe" ? vault : !vault && ui.section === "subs" ? "owe" : null;
  const save = vault && vault !== "owed" && vault !== "owe" ? vault : null;
  const off = !!vault || ui.section === "subs";
  const { tap: vtap, hello: vaultHello } = useVaultHello(vaultRef);
  // 1.3.97: once the pane has been swapped by a tap or a ring step (not the hub's first pane), its content must be there in the very
  // first frame: `is-swap` turns off the arrival fades inside it (Tron's card "rez", note and cobro fades all started at opacity 0).
  const paneKey = debt ?? save ?? ui.section;
  const lastPane = useRef(paneKey);
  const swapped = useRef(false);
  if (lastPane.current !== paneKey) { lastPane.current = paneKey; swapped.current = true; }
  // 1.3.114: on a tablet (one pane, >= 1100 wide) the scale lives centred in the top bar; below it stays above the books.
  // 1.3.120: the Shell draws it there itself (on every screen), so the main view's hub leaves it out; split/float panes keep theirs.
  const topScale = useTopScaleSlot();
  const tabletOne = useTabletOne();
  const sideBook: SideBook | null = !tabletOne || debt ? null : save ? "save" : ui.section === "fixed" ? "fixed" : ui.section === "shops" ? "shops" : null;
  // 1.3.122: every book gets its own Asesor in the right column (under the comparison pane when there is one).
  const sideArea: AreaId | null = !tabletOne || debt ? null : save ? save : ui.section === "income" || ui.section === "fixed" || ui.section === "variable" || ui.section === "shops" ? ui.section : null;
  const scale = (
    <DebtScale value={debt} onPick={(side) => {
      if (debt && debt !== side) onSlide(side === "owe" ? 1 : -1);
      if (side === "owe" && ui.section === "subs" && !vault) return;
      onVault(side);
    }} />
  );
  return (
    <>
      <div className="seg is-follow is-four" ref={segRef} role="tablist" aria-label={t("hub.books")} data-anchor={anchors ? "books-tabs" : undefined}>
        <i className="seg-pill" aria-hidden style={off ? { opacity: 0 } : undefined} />
        {TOP_BOOKS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={!off && ui.section === id} aria-current={!off && ui.section === id ? "page" : undefined} onClick={() => { onVault(null); setUi({ section: id }); }}>
            <span className="seg-ico" aria-hidden><SectionIcon id={id} className="size-3.5" /></span>
            <span className="seg-label">{t(`nav.${id}`)}</span>
          </button>
        ))}
      </div>
      {bar && topScale ? null : scale}
      <div className="vault-bar" ref={vaultRef} data-anchor={anchors ? "vault-tabs" : undefined} style={{ ["--vault" as string]: save ? VAULT.indexOf(save) : 0, ["--vtint" as string]: save === "meta" ? vtint("#8fb9a6") : save === "retiro" ? vtint("#72b4b2") : save === "emergencia" ? vtint("#7aa2c4") : save === "save" ? vtint(SAVINGS_PURPLE) : "var(--fg)" }} role="tablist" aria-label={t("desk.savings")}>
        <i className={`vault-glide${save ? " is-on" : ""}${save === "save" ? " is-save" : ""}`} aria-hidden />
        {VAULT.map((id) => (
          <button key={id} type="button" role="tab" data-vault={id} data-rise={vtap?.id === id ? vtap.n % 2 : undefined} style={{ ["--vtone" as string]: vtint(VAULT_TONE[id]) }} aria-selected={save === id} aria-current={save === id ? "page" : undefined} onClick={(e) => {
            if (save && save !== id) onSlide(VAULT.indexOf(id) > VAULT.indexOf(save) ? 1 : -1);
            onVault(id);
            vaultHello(id, e.detail > 0 ? { x: e.clientX, y: e.clientY } : undefined);
          }}>
            <i className="vb-fx" aria-hidden>{vtap?.id === id ? <i key={vtap.n} className="vb-fill" /> : null}</i>
            {id === "save" ? <Landmark className="size-3.5" /> : id === "meta" ? <Flag className="size-3.5" /> : id === "retiro" ? <Hourglass className="size-3.5" /> : <Shield className="size-3.5" />}
            <span>{id === "save" ? t("desk.savings") : id === "meta" ? t("vault.meta") : id === "retiro" ? t("vault.retiro") : t("vault.emerg")}</span>
          </button>
        ))}
        {anchors ? <Hint topic="ahorros-tabs" className="is-tabs" corner overlay /> : null}
      </div>
      <div key={paneKey} className={`swipe-pane${save || debt ? " is-vault" : ""}${swapped.current ? " is-swap" : ""}${ringFresh() ? " is-ring" : ""}${sideBook || sideArea ? " has-side" : ""}`} data-dir={slideDir < 0 ? "-1" : "1"}>
        {debt ? <DebtBook side={debt} /> : save ? <Desk focus={save} /> : ui.section === "shops" ? <Shops /> : <Books mode={ui.section === "fixed" ? "fixed" : ui.section === "variable" ? "variable" : "income"} />}
        {sideArea ? <SideCol>{sideBook ? <BookSide book={sideBook} /> : null}<AreaAdvisor area={sideArea} /></SideCol> : sideBook ? <BookSide book={sideBook} /> : null}
      </div>
    </>
  );
}

function SectionView() {
  const { t, ui, setUi, goSection } = useFaro();
  const hub = hubOf(ui.section);
  const [vault, setVault] = useState<VaultTab | null>(null);
  const [slideDir, setSlideDir] = useState(1);
  const segRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<Swipe | null>(null);
  const swiped = useRef(false);
  useEffect(() => {
    const root = segRef.current;
    if (!root) return;
    const current = root.querySelector<HTMLElement>('[aria-current="page"]');
    const pill = root.querySelector<HTMLElement>(".seg-pill");
    if (!current || !pill) return;
    pill.style.width = `${current.offsetWidth}px`;
    pill.style.height = `${current.offsetHeight}px`;
    pill.style.transform = `translate3d(${current.offsetLeft}px, ${current.offsetTop}px, 0)`;
  }, [ui.section, hub, vault]);
  useEffect(() => {
    const root = vaultRef.current;
    if (!root) return;
    const current = root.querySelector<HTMLElement>('[aria-current="page"]');
    const glide = root.querySelector<HTMLElement>(".vault-glide");
    if (!current || !glide) return;
    glide.style.width = `${current.offsetWidth}px`;
    glide.style.height = `${current.offsetHeight}px`;
    glide.style.left = `${current.offsetLeft}px`;
    glide.style.top = `${current.offsetTop}px`;
  }, [vault, hub]);
  return (
    <main
      className="main-pad"
      data-swipe="loop"
      onPointerDownCapture={(e) => {
        swiped.current = false; // a swipe that produced no click must not swallow the next real tap
if (swipeBlocked(e.currentTarget, e.target as Element)) return;
        swipe.current = { x: e.clientX, y: e.clientY, type: e.pointerType, axis: null, el: e.pointerType === "mouse" ? null : dragTarget(e.currentTarget, e.target as HTMLElement, hub) };
        // Touch/pen only: capturing a mouse press retargets its click to <main>, so desktop clicks never reach the row.
        if (e.pointerType !== "mouse") e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const st = swipe.current;
        if (!st || st.type === "mouse" || (hub !== "books" && hub !== "desk")) return;
        const dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (st.axis !== "x") { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; st.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? "x" : "y"; }
        if (st.axis === "x") dragPane(st.el, dx);
      }}
      onPointerCancel={() => { if (swipe.current?.axis === "x") dragPane(swipe.current.el, null); swipe.current = null; }}
      onPointerUp={(e) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (hub === "desk" && start.type !== "mouse") {
          // Touch on Central: one ring through Tengo · Gastaré · Pagos · Meta · Retiro · Emergencia (Desk does the step).
          if (start.axis !== "x" || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) { if (start.axis === "x") dragPane(start.el, null); return; }
          swiped.current = true;
          const dir = dx < 0 ? 1 : -1;
          markRing();
          setSlideDir(dir);
          const el = start.el;
          window.dispatchEvent(new CustomEvent("faro-lens", { detail: { dir, ring: true } }));
          window.setTimeout(() => dragPane(el, null), 0); // the panel that stays (same pocket kept) springs back
          return;
        }
        if (hub === "books" && start.type !== "mouse") {
          if (start.axis !== "x" || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) { if (start.axis === "x") dragPane(start.el, null); return; }
          swiped.current = true;
          const dir = dx < 0 ? 1 : -1;
          const next = ringNext(ui.section, vault, dir);
          markRing();
          setSlideDir(dir);
          if ((TOP_BOOKS as readonly string[]).includes(next)) { setVault(null); setUi({ section: next as SectionId }); }
          else { if (ui.section === "subs") setUi({ section: "income" }); setVault(next as VaultTab); }
          ringLand(e.currentTarget, next);
          return;
        }
        if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
        swiped.current = true;
        const dir = dx < 0 ? 1 : -1;
        setSlideDir(dir);
        if (hub === "desk") window.dispatchEvent(new CustomEvent("faro-lens", { detail: dir }));
        else if (hub === "books" && (vault === "owed" || vault === "owe")) setVault(vault === "owed" ? "owe" : "owed");
        else if (hub === "books" && vault) {
          const i = VAULT.indexOf(vault as (typeof VAULT)[number]);
          setVault(VAULT[(i + dir + VAULT.length) % VAULT.length]);
        } else goSection(dir);
      }}
      onClickCapture={(e) => {
        if (!swiped.current) return;
        swiped.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {hub === "books" ? (
        <BooksHub vault={vault} onVault={setVault} segRef={segRef} vaultRef={vaultRef} slideDir={slideDir} onSlide={setSlideDir} />
      ) : null}
      {hub === "study" ? (
        <div className="pane">
          <div className="seg is-follow is-pair" ref={segRef} role="tablist" aria-label={t("hub.study")}>
            <i className="seg-pill" aria-hidden />
            {STUDY.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={ui.section === id} aria-current={ui.section === id ? "page" : undefined} onClick={() => setUi({ section: id })}>
                <span className="seg-ico" aria-hidden><SectionIcon id={id} className="size-3.5" /></span>
                <span className="seg-label">{t(`nav.${id}`)}</span>
              </button>
            ))}
          </div>
          {ui.section === "advice" ? <Advisor /> : <Study />}
        </div>
      ) : null}
      {hub === "desk" ? <Desk /> : null}
      {hub === "settings" ? <SettingsScreen /> : null}
    </main>
  );
}

function placeFor(kind: LineKind): SectionId {
  if (kind.startsWith("income")) return "income";
  if (kind === "expense-fixed") return "fixed";
  if (kind === "expense-variable") return "variable";
  if (kind === "purchase") return "shops";
  return "subs";
}

function buildCal(session: ReturnType<typeof useFaro>["session"], year: number, month: number) {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const lines = session ? monthLines(session.ledger, key).filter((line) => line.active) : [];
  const settings = session?.ledger.settings;
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const count = new Date(year, month, 0).getDate();
  const days = new Map<number, { items: { id: string; name: string; kind: LineKind; vault?: VaultTab }[]; dots: Array<"good" | "bad"> }>();
  let income = 0;
  let expense = 0;
  let undated = 0;
  const today = new Date();
  for (const line of lines) {
    const minor = settings ? convertMinor(line.amountMinor, line.currency, settings.display, settings.rateE4) : line.amountMinor;
    const incoming = line.kind.startsWith("income");
    if (incoming) income += minor;
    else expense += minor;
    const dated = line.bookedOn?.startsWith(key) ? Number(line.bookedOn.slice(8, 10)) : 0;
    if (!dated) {
      undated += 1;
      continue;
    }
    const slot = days.get(dated) ?? { items: [], dots: [] };
    // 1.3.118: a Remesas line names its recipient ("Remesas · <persona>").
    const to = session ? recipientName(session.ledger, line) : "";
    if (line.concept) slot.items.push({ id: line.id, name: to ? `${line.concept} · ${to}` : line.concept, kind: line.kind });
    const tone = incoming ? "good" : "bad";
    if (!slot.dots.includes(tone)) slot.dots.push(tone);
    days.set(dated, slot);
  }
  // 1.3.92: the day each Me deben amount is due to come back (only while something is still owed). Not money yet: no totals.
  if (session) {
    for (const row of lentOf(session.ledger)) {
      if (row.archived || !row.dueOn.startsWith(key) || lentState(session.ledger, row).left <= 0) continue;
      const day = Number(row.dueOn.slice(8, 10));
      const slot = days.get(day) ?? { items: [], dots: [] };
      slot.items.push({ id: `due-${row.id}`, name: `${settings?.lang === "en" ? "Collect" : "Cobrar"} · ${row.person}`, kind: "income-variable", vault: "owed" });
      if (!slot.dots.includes("good")) slot.dots.push("good");
      days.set(day, slot);
    }
  }
  // 1.3.107: credit card payment due dates (while the card has a balance). Not money moved: no totals.
  if (session) {
    for (const card of cardsOf(session.ledger)) {
      const f = cardFigures(session.ledger, card);
      if (!f.known || f.balance <= 0 || !f.dueOn.startsWith(key)) continue;
      const day = Number(f.dueOn.slice(8, 10));
      const slot = days.get(day) ?? { items: [], dots: [] };
      slot.items.push({ id: `card-${card.id}`, name: `${settings?.lang === "en" ? "Card due" : "Pagar tarjeta"} · ${card.name}`, kind: "expense-variable", vault: "owe" });
      if (!slot.dots.includes("bad")) slot.dots.push("bad");
      days.set(day, slot);
    }
  }
  const cells = Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    return {
      day,
      today: today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day,
      dots: days.get(day)?.dots ?? [],
    };
  });
  return { lead, cells, days, income, expense, undated };
}

type FloatGeo = { x: number; y: number; w: number; h: number; bx: number; by: number; alpha: number };
const FLOAT_KEY = "faro-float-geo";
const BUBBLE = 58;
const vwNow = () => window.innerWidth;
// How long the last content re-flow after a resize took (ms); starts pessimistic.
let settleCost = 999;
// Per CSS animation name: does it animate anything the compositor cannot (so it costs main-thread frames)?
const heavyAnim = new Map<string, boolean>();

function floatDefaults(): FloatGeo {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const phone = vw < 640;
  const w = phone ? vw - 28 : Math.min(400, vw - 32);
  const h = phone ? Math.round(vh * 0.52) : Math.min(600, vh - 160);
  return { x: vw - w - 14, y: phone ? Math.round(vh * 0.22) : 96, w, h, bx: vw - BUBBLE - 8, by: Math.round(vh * 0.38), alpha: 1 };
}

function floatMins() {
  return { minW: Math.min(240, window.innerWidth - 16), minH: Math.min(220, window.innerHeight - 80) };
}

function clampFloat(g: FloatGeo): FloatGeo {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { minW, minH } = floatMins();
  const w = Math.round(Math.min(vw - 16, Math.max(minW, g.w)));
  const h = Math.round(Math.min(vh - 16, Math.max(minH, g.h)));
  return {
    w,
    h,
    x: Math.round(Math.min(vw - w - 8, Math.max(8, g.x))),
    y: Math.round(Math.min(vh - h - 8, Math.max(8, g.y))),
    bx: Math.round(Math.min(vw - BUBBLE - 6, Math.max(6, g.bx))),
    by: Math.round(Math.min(vh - BUBBLE - 90, Math.max(64, g.by))),
    alpha: g.alpha === 0.85 || g.alpha === 0.65 ? g.alpha : 1,
  };
}

// Below ~360px of content the screens would cut numbers and labels, so the content keeps a 360px layout (the narrowest phone Faro is tuned for) and is scaled
// to fit (CSS zoom). Above that it re-flows by container queries at 1:1.
const FLOAT_LAYOUT = 360;
function floatZoom(w: number) {
  return Math.round(Math.min(1, (w - 2) / FLOAT_LAYOUT) * 1000) / 1000;
}

type FloatEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const FLOAT_EDGES: FloatEdge[] = ["n", "s", "e", "w", "ne", "nw", "sw", "se"];

// Resize from any edge or corner: the opposite edge stays put, size stays within [min, viewport - 8px margins].
function resizeFloat(g: FloatGeo, edge: FloatEdge, dx: number, dy: number): FloatGeo {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { minW, minH } = floatMins();
  let { x, y, w, h } = g;
  if (edge.includes("e")) w = Math.min(vw - 8 - x, Math.max(minW, g.w + dx));
  if (edge.includes("w")) { const r = g.x + g.w; x = Math.min(r - minW, Math.max(8, g.x + dx)); w = r - x; }
  if (edge.includes("s")) h = Math.min(vh - 8 - y, Math.max(minH, g.h + dy));
  if (edge.includes("n")) { const b = g.y + g.h; y = Math.min(b - minH, Math.max(8, g.y + dy)); h = b - y; }
  return clampFloat({ ...g, x, y, w, h });
}

function loadFloat(): FloatGeo {
  try {
    const raw = JSON.parse(localStorage.getItem(FLOAT_KEY) ?? "null") as Partial<FloatGeo> | null;
    if (raw && typeof raw.w === "number") return clampFloat({ ...floatDefaults(), ...raw });
  } catch { /* ignore */ }
  return clampFloat(floatDefaults());
}

function FloatWindow({ section, onSection, folded, onFold, onClose, onFull }: {
  section: SectionId;
  onSection: (id: SectionId) => void;
  folded: boolean;
  onFold: (folded: boolean) => void;
  onClose: () => void;
  onFull: (id: SectionId) => void;
}) {
  const { t } = useFaro();
  const [geo, setGeo] = useState<FloatGeo>(loadFloat);
  const live = useRef(geo);
  live.current = geo;
  const winRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fit = () => setGeo((g) => clampFloat(g));
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(FLOAT_KEY, JSON.stringify(geo)); } catch { /* ignore */ }
  }, [geo]);
  useEffect(() => {
    if (folded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && winRef.current?.contains(document.activeElement)) onFold(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [folded, onFold]);

  // `content` false while dragging: --fz is inherited by the whole content, so changing it per frame would restyle and re-lay
  // out every node inside (measured: 1.5 s frames at 4× CPU); the frozen content carries its own --fz until it re-flows.
  const paint = (g: FloatGeo, content = true) => {
    const win = winRef.current;
    if (win) {
      win.style.left = `${g.x}px`;
      win.style.top = `${g.y}px`;
      win.style.width = `${g.w}px`;
      win.style.height = `${g.h}px`;
      if (content) win.style.setProperty("--fz", String(floatZoom(g.w)));
    }
    const bub = bubbleRef.current;
    if (bub) {
      bub.style.left = `${g.bx}px`;
      bub.style.top = `${g.by}px`;
    }
  };

  // 1.3.105 drag engine. Pointer capture on the handle; the finger's newest position (coalesced events, plus at most one
  // frame of velocity look-ahead while it is moving fast) is painted once per frame straight to style. No React state and no
  // class changes until pointerup (classes would wake spa/fit.ts's observer for a whole-document fit pass).
  // Move = a compositor-only transform. Resize = the frame follows the finger every frame while the content inside keeps its
  // width (frozen px, clipped by .float-clip) and re-flows only when that is cheap (≤ ~100 ms cadence, adaptive), when the
  // finger pauses, and on release. Height follows every frame (it only resizes the scroller). Main-thread animations inside
  // the window and non-composited ones behind it are paused for the drag and resumed after.
  const grab = (mode: "move" | "bubble" | FloatEdge) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (mode === "move" && (e.target as HTMLElement).closest("button")) return;
    if (mode !== "move" && mode !== "bubble") e.stopPropagation();
    if (e.pointerType === "mouse" && mode !== "bubble") e.preventDefault();
    const el = e.currentTarget;
    try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    const pid = e.pointerId;
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { ...live.current };
    const shell = mode === "bubble" ? bubbleRef.current : winRef.current;
    const resize = mode !== "move" && mode !== "bubble";
    const body = resize ? winRef.current?.querySelector<HTMLElement>(".float-body") ?? null : null;
    let moved = false;
    let last = start;
    let frame = 0;
    let fx = sx;
    let fy = sy;
    let ft = e.timeStamp;
    const trail: [number, number, number][] = [[e.timeStamp, sx, sy]];
    let pred: [number, number] | null = null;
    let paused: Animation[] = [];
    let flowW = 0;
    let flowAt = 0;
    let flowSlow = false;
    // Measured (1.3.105, Tron Asesor/Central at 4× CPU): one content re-flow costs 250–1000 ms, so mid-stroke re-flows are
    // only allowed where the last settle of this window was fast (≤ 24 ms, a fast desktop); otherwise on pause and release.
    const flowFast = settleCost <= 24;
    let flowCheck = 0;
    let idle = 0;
    const geoFor = (x: number, y: number): FloatGeo => {
      const dx = x - sx;
      const dy = y - sy;
      if (mode === "move") return clampFloat({ ...start, x: start.x + dx, y: start.y + dy });
      if (mode === "bubble") return clampFloat({ ...start, bx: start.bx + dx, by: start.by + dy });
      return resizeFloat(start, mode, dx, dy);
    };
    const pauseAnims = () => {
      if (!shell || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      try {
        paused = document.getAnimations().filter((a) => {
          if (a.playState !== "running") return false;
          const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
          if (!t) return false;
          if (shell.contains(t) || t instanceof SVGElement) return true;
          const key = (a as CSSAnimation).animationName;
          const known = key ? heavyAnim.get(key) : undefined;
          if (known !== undefined) return known;
          const kf = (a.effect as KeyframeEffect).getKeyframes();
          const heavy = kf.some((k) => Object.keys(k).some((p) => !["offset", "easing", "composite", "computedOffset", "transform", "opacity", "translate", "scale", "rotate"].includes(p)));
          if (key) heavyAnim.set(key, heavy);
          return heavy;
        });
        for (const a of paused) a.pause();
      } catch { paused = []; }
    };
    const resumeAnims = () => {
      for (const a of paused) {
        const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
        if (a.playState === "paused" && t?.isConnected) { try { a.play(); } catch { /* gone */ } }
      }
      paused = [];
    };
    // Re-flow the content to the frame's width (resize only). Adaptive: if the last re-flow made the next frame late,
    // wait for a pause or the release instead of re-flowing mid-stroke.
    const flow = (g: FloatGeo, now: number) => {
      if (!body) return;
      const w = g.w - 2;
      if (w === flowW) return;
      flowW = w;
      flowAt = now;
      body.style.width = `${w}px`;
      body.style.setProperty("--fz", String(floatZoom(g.w)));
      const t0 = performance.now();
      cancelAnimationFrame(flowCheck);
      flowCheck = requestAnimationFrame(() => { flowSlow = performance.now() - t0 > 34; });
    };
    let calmed = false;
    let ended = false;
    const draw = (now: number) => {
      frame = 0;
      // Pause the animations right after the stroke's first frame is out (getAnimations flushes style: never before it).
      if (!calmed && mode !== "bubble") { calmed = true; setTimeout(() => { if (!ended) pauseAnims(); }, 0); }
      let x = fx;
      let y = fy;
      // Look-ahead: the browser's own pointer prediction (getPredictedEvents, Chrome's filter), at most ~12 ms past the newest
      // real sample and only while samples are fresh, so a stopped finger is never overshot. Release always lands exact.
      if (pred && now - ft < 40) { x = pred[0]; y = pred[1]; }
      last = geoFor(x, y);
      if (mode === "move") {
        const win = winRef.current;
        if (win) win.style.transform = `translate3d(${last.x - start.x}px, ${last.y - start.y}px, 0)`;
      } else {
        paint(last, !resize);
        // The big soft drag shadow is a separate layer scaled with the frame (no blur re-raster per frame).
        if (shade) shade.style.transform = `scale(${last.w / start.w}, ${last.h / start.h})`;
      }
      if (resize && flowFast && !flowSlow && now - flowAt >= 100) flow(last, now);
    };
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const list = ev.getCoalescedEvents?.() ?? [];
      for (const c of list.length ? list : [ev]) trail.push([c.timeStamp, c.clientX, c.clientY]);
      while (trail.length > 2 && ev.timeStamp - trail[0][0] > 120) trail.shift();
      fx = ev.clientX;
      fy = ev.clientY;
      ft = ev.timeStamp;
      pred = null;
      for (const p of ev.getPredictedEvents?.() ?? []) if (p.timeStamp - ft <= 12) pred = [p.clientX, p.clientY];
      if (!moved) {
        if (Math.hypot(fx - sx, fy - sy) < (mode === "move" || mode === "bubble" ? 5 : 2)) return;
        moved = true;
        shell?.setAttribute("data-moving", "");
        if (resize) shell?.setAttribute("data-edge", mode);
        if (mode === "move" && shell) shell.style.willChange = "transform";
      }
      if (resize) {
        clearTimeout(idle);
        // Pause = the finger was already slowing to a stop (path length of its last ~80 ms of samples is short), not a busy
        // pipeline holding the next events back (then input is pending, or the samples still show a fast stroke/turnaround).
        idle = window.setTimeout(() => {
          if (frame) return;
          const nav = navigator as Navigator & { scheduling?: { isInputPending?: () => boolean } };
          if (nav.scheduling?.isInputPending?.()) return;
          const recent = trail.filter((p) => ft - p[0] <= 80);
          let path = 0;
          for (let i = 1; i < recent.length; i++) path += Math.hypot(recent[i][1] - recent[i - 1][1], recent[i][2] - recent[i - 1][2]);
          if (path > 12) return;
          last = geoFor(fx, fy);
          paint(last, false);
          if (shade) shade.style.transform = `scale(${last.w / start.w}, ${last.h / start.h})`;
          flow(last, performance.now());
        }, 200);
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      ended = true;
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("lostpointercapture", onUp);
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      cancelAnimationFrame(flowCheck);
      clearTimeout(idle);
      shell?.removeAttribute("data-moving");
      shell?.removeAttribute("data-edge");
      if (mode === "bubble") {
        if (!moved) { onFold(false); return; }
        last = clampFloat({ ...last, bx: last.bx + BUBBLE / 2 < vwNow() / 2 ? 6 : vwNow() - BUBBLE - 6 });
      }
      if (!moved) {
        if (body) { body.style.width = ""; body.style.removeProperty("--fz"); body.style.willChange = ""; }
        resumeAnims();
        return;
      }
      // Settle on the finger's true last position (no look-ahead), in one frame: frame, content width and zoom together.
      if (ev.type === "pointerup") last = mode === "bubble" ? last : geoFor(ev.clientX, ev.clientY);
      paint(last);
      if (mode === "move" && shell) { shell.style.transform = ""; shell.style.willChange = ""; }
      if (body) {
        const same = flowW === last.w - 2;
        body.style.width = "";
        body.style.removeProperty("--fz");
        body.style.willChange = "";
        if (!same) { const t0 = performance.now(); requestAnimationFrame(() => { settleCost = performance.now() - t0; }); }
      }
      resumeAnims();
      setGeo(last);
    };
    // Prepare on touch-down without forcing style or layout (no visible change). The content keeps its width (frame - 2px border).
    const shade = resize ? winRef.current?.querySelector<HTMLElement>(".float-shade") ?? null : null;
    if (shade) { shade.style.width = `${start.w}px`; shade.style.height = `${start.h}px`; shade.style.transform = ""; }
    if (body) {
      flowW = start.w - 2;
      body.style.width = `${flowW}px`;
      body.style.setProperty("--fz", String(floatZoom(start.w)));
      body.style.willChange = "transform";
      flowAt = performance.now();
    }
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("lostpointercapture", onUp);
  };

  const nudge = (e: ReactKeyboardEvent<HTMLElement>, kind: "move" | "size") => {
    const step = e.shiftKey ? 40 : 12;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setGeo((g) => clampFloat(kind === "move" ? { ...g, x: g.x + d[0], y: g.y + d[1] } : { ...g, w: g.w + d[0], h: g.h + d[1] }));
  };

  const map = useCallback((api: Api): Api => ({
    ...api,
    ui: { ...api.ui, section },
    goSection: (delta: number) => onSection(stepSection(section, delta)),
    setUi: (patch) => {
      const { section: next, ...rest } = patch;
      if (next && next !== "settings") onSection(next);
      else if (next === "settings") api.setUi({ section: "settings" });
      if (Object.keys(rest).length) api.setUi(rest);
    },
  }), [section, onSection]);

  const name = hubOf(section) === "books" || hubOf(section) === "study"
    ? t(section === "subs" ? "tab.subs" : `nav.${section}`)
    : t("nav.desk");

  // The content subtree does not depend on the geometry: memoized so committing a drag (setGeo) re-renders only the frame.
  const pane = useMemo(() => (
    <FaroPane map={map}>
      <div className="float-body">
        <div className="workspace">
          <SectionView />
        </div>
        <DockNav section={section} onSection={onSection} />
      </div>
    </FaroPane>
  ), [map, section, onSection]);

  if (folded) {
    return (
      <button
        ref={bubbleRef}
        type="button"
        className="float-bubble"
        style={{ left: geo.bx, top: geo.by }}
        aria-label={`${t("float.unfold")}: ${name}`}
        onPointerDown={grab("bubble")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFold(false); } }}
      >
        <i className="float-bubble-glow" aria-hidden />
        <SectionIcon id={section} className="size-5" />
      </button>
    );
  }

  return (
    <div className="float-layer">
    <div
      ref={winRef}
      className="float-win"
      role="dialog"
      aria-modal="false"
      aria-label={`${t("float")}: ${name}`}
      style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h, ["--float-alpha" as string]: geo.alpha, ["--fz" as string]: floatZoom(geo.w) }}
    >
      <i className="float-shade" aria-hidden />
      <div className="float-bar" onPointerDown={grab("move")} onDoubleClick={() => onFold(true)}>
        <span className="float-handle" tabIndex={0} role="button" aria-label={t("float.move")} onKeyDown={(e) => nudge(e, "move")}><i /></span>
        <span className="float-title"><SectionIcon id={section} className="size-3.5" />{name}</span>
        <span className="float-tools">
          <button type="button" aria-label={t("float.alpha")} aria-pressed={geo.alpha < 1} onClick={() => setGeo((g) => ({ ...g, alpha: g.alpha === 1 ? 0.85 : g.alpha === 0.85 ? 0.65 : 1 }))}><Blend /></button>
          <button type="button" aria-label={t("float.full")} onClick={() => onFull(section)}><Maximize2 /></button>
          <button type="button" aria-label={t("float.fold")} onClick={() => onFold(true)}><Minus /></button>
          <button type="button" aria-label={t("float.close")} onClick={onClose}><X /></button>
        </span>
      </div>
      <div className="float-clip">{pane}</div>
      {FLOAT_EDGES.filter((d) => d !== "se").map((d) => <span key={d} className={`float-size is-${d}`} aria-hidden onPointerDown={grab(d)} />)}
      <span className="float-size is-se" role="button" tabIndex={0} aria-label={t("float.size")} onPointerDown={grab("se")} onKeyDown={(e) => nudge(e, "size")}><i className="float-grip" /></span>
    </div>
    </div>
  );
}
