import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { SampleEdge, SamplePill } from "./sample-mode";
import { Blend, CalendarDays, ChevronLeft, ChevronRight, Coins, Columns2, Flag, Hourglass, Landmark, Maximize2, Minus, Moon, PictureInPicture2, Redo2, Rows2, Search, Settings, Shield, Sun, Undo2, X } from "lucide-react";
import "./float.css";
import "./tron.css";
import "./cal.css";
import "./tablet.css";
import { UserButton } from "@/lib/auth/gates";
import { monthLines } from "@/lib/faro/engine";
import { monthName } from "@/lib/faro/i18n";
import { holidaysFor } from "@/lib/faro/holidays";
import { convertMinor } from "@/lib/faro/money";
import { DAY_THEMES, NIGHT_THEMES, type LineKind, type SectionId, type ThemeId } from "@/lib/faro/types";
import { clampSplit, isSplitSection, pairedSection, SPLIT_MAX, SPLIT_MIN, stepSection } from "@/lib/faro/split";
import { Advisor, Books, Desk, Help, Settings as SettingsScreen, Shops, Study, Subs } from "./screens";
import { ExportPanel } from "./export-panel";
import { Mark, SectionIcon } from "./icons";
import { Instruments } from "./instruments";
import { SAVINGS_PURPLE, isTron as vtTron, tronize as vtTronize } from "@/lib/faro/colors";
const vtint = (c: string) => (vtTron() ? vtTronize(c) : c);
import { FaroPane, useFaro, type Api } from "./provider";
import { useLayer } from "@/lib/manual/back";
import { prefetchManual } from "@/lib/manual/load";
import { Hint } from "./hint";
import { FocusHost } from "./focus-host";
import { PeopleInbox } from "./people";
import { BankDock } from "./bank-dock";
import { ToTop } from "./to-top";

const ManualLayer = lazy(() => import("./manual"));

const BOOKS = ["income", "fixed", "variable", "shops", "subs"] as const;
const VAULT = ["save", "meta", "retiro", "emergencia"] as const;
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
  const { ready, session, ui, setUi, sync, t, lang, hits, undo, redo, canUndo, canRedo, goSection, setMonth, fmt } = faro;
  const searchRef = useRef<HTMLDivElement>(null);
  const searchPopRef = useRef<HTMLFormElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const segRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchListed, setSearchListed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [calDay, setCalDay] = useState<number | null>(null);
  const calDrag = useRef({ x: 0, y: 0, moved: false });
  const calBody = useRef<HTMLDivElement>(null);
  const calSky = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const [slideDir, setSlideDir] = useState(1);
  // The savings tab lives in the provider, so each tab is a real history step (back walks the tabs).
  const vault = ui.vault;
  const setVault = (next: (typeof VAULT)[number] | null) => { if (next !== ui.vault) setUi({ vault: next }); };
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
  }, []);
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
      setSearchListed(false);
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
      setSearchListed(false);
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
        <button type="button" className="nav-btn" aria-current={!moneyOpen && !vault && ui.section === "desk" ? "page" : undefined} onClick={() => { setRecall(false); setMoneyOpen(false); setVault(null); setUi({ section: "desk" }); }}>
          <SectionIcon id="desk" />
          <span>{t("nav.desk")}</span>
        </button>
        {VAULT.map((id) => (
          <button key={id} type="button" className="nav-btn" aria-current={!moneyOpen && vault === id ? "page" : undefined} onClick={() => {
            setRecall(false);
            setMoneyOpen(false);
            if (hub !== "books") setUi({ section: "income" });
            if (vault && vault !== id) setSlideDir(VAULT.indexOf(id) > VAULT.indexOf(vault) ? 1 : -1);
            setVault(id);
          }}>
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
          <SampleEdge />
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
                <button type="button" className="icon-btn theme-toggle cal-launch" aria-label={t("search")} aria-expanded={searchOpen} onClick={() => { setSearchListed(false); setSearchOpen((v) => !v); }}>
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
                                    setUi({ section: placeFor(item.kind), year: calYear, month: calMonth, highlight: item.id });
                                    setCalOpen(false);
                                  }}
                                >
                                  {item.name}
                                </button>
                              )) : <p>{t("cal.empty")}</p>}
                            </div>
                            <button type="button" onClick={() => { setMonth(calYear, calMonth); setCalOpen(false); }}>{t("cal.use")}</button>
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
                  setSearchListed(true);
                }}
              >
                <div className="search-pill">
                  <Search className="size-4" aria-hidden />
                  <input id="faro-search" type="search" enterKeyHint="search" value={ui.query} placeholder={t("search")} autoFocus onChange={(e) => setUi({ query: e.target.value })} />
                </div>
                {searchListed && ui.query.trim().length >= 2 ? (
                  <div className="hits" role="listbox">
                    {hits.length === 0 ? <p className="p-3 text-sm">{t("search.empty")}</p> : null}
                    {hits.map((hit) => (
                      <button key={hit.id} type="button" className="hit" onClick={() => {
                        const [y, m] = hit.monthKey.split("-").map(Number);
                        setSearchOpen(false);
                        setSearchListed(false);
                        setUi({ section: hit.section, year: y ?? ui.year, month: m ?? ui.month, highlight: hit.lineId, query: "" });
                      }}>
                        <strong>{hit.title}</strong>
                        <span className="block text-sm text-muted">{hit.subtitle}</span>
                      </button>
                    ))}
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
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("input, textarea, select, .cal-sheet, .search-pop, .cobros, .vault-lever-rail")) return;
              swipe.current = { x: e.clientX, y: e.clientY };
              // Touch/pen only: capturing a mouse press retargets its click to <main>, so desktop clicks never reach the row.
              if (e.pointerType !== "mouse") e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={(e) => {
              const start = swipe.current;
              swipe.current = null;
              if (!start) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
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
              else if (hub === "books" && vault) {
                const i = VAULT.indexOf(vault);
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
              <>
                <div className="seg is-follow" ref={segRef} role="tablist" aria-label={t("hub.books")} data-anchor="books-tabs">
                  <i className="seg-pill" aria-hidden style={vault ? { opacity: 0 } : undefined} />
                  {BOOKS.map((id) => (
                    <button key={id} type="button" role="tab" aria-selected={!vault && ui.section === id} aria-current={!vault && ui.section === id ? "page" : undefined} onClick={() => { setVault(null); setUi({ section: id }); }}>
                      <span className="seg-ico" aria-hidden><SectionIcon id={id} className="size-3.5" /></span>
                      <span className="seg-label">{id === "subs" ? t("tab.subs") : t(`nav.${id}`)}</span>
                    </button>
                  ))}
                </div>
                <div className="vault-bar" ref={vaultRef} data-anchor="vault-tabs" style={{ ["--vault" as string]: vault ? VAULT.indexOf(vault) : 0, ["--vtint" as string]: vault === "meta" ? vtint("#8fb9a6") : vault === "retiro" ? vtint("#72b4b2") : vault === "emergencia" ? vtint("#7aa2c4") : vault === "save" ? vtint(SAVINGS_PURPLE) : "var(--fg)" }} role="tablist" aria-label={t("desk.savings")}>
                  <i className={`vault-glide${vault ? " is-on" : ""}${vault === "save" ? " is-save" : ""}`} aria-hidden />
                  {VAULT.map((id) => (
                    <button key={id} type="button" role="tab" aria-selected={vault === id} aria-current={vault === id ? "page" : undefined} onClick={() => {
                      if (vault && vault !== id) setSlideDir(VAULT.indexOf(id) > VAULT.indexOf(vault) ? 1 : -1);
                      setVault(id);
                    }}>
                      {id === "save" ? <Landmark className="size-3.5" /> : id === "meta" ? <Flag className="size-3.5" /> : id === "retiro" ? <Hourglass className="size-3.5" /> : <Shield className="size-3.5" />}
                      <span>{id === "save" ? t("desk.savings") : id === "meta" ? t("vault.meta") : id === "retiro" ? t("vault.retiro") : t("vault.emerg")}</span>
                    </button>
                  ))}
                  <Hint topic="ahorros-tabs" className="is-tabs" corner overlay />
                </div>
                <div key={vault ?? ui.section} className={`swipe-pane${vault ? " is-vault" : ""}`} data-dir={slideDir < 0 ? "-1" : "1"}>
                {vault ? <Desk focus={vault} /> : ui.section === "shops" ? <Shops /> : ui.section === "subs" ? <Subs /> : <Books mode={ui.section === "fixed" ? "fixed" : ui.section === "variable" ? "variable" : "income"} />}
                </div>
              </>
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
            <Instruments pinned />
          </aside>
          {ui.instruments && !split ? <ToolSheet /> : null}
        </div>
        </FaroPane>
        <DockNav section={ui.section} onSection={(id) => setUi({ section: id })} />
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
          <button key={id} type="button" className="nav-btn" aria-current={!moneyOpen && !vault && ui.section === id ? "page" : undefined} onClick={() => { setRecall(false); setMoneyOpen(false); setVault(null); setUi({ section: id }); }}>
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

function SectionView() {
  const { t, ui, setUi, goSection } = useFaro();
  const hub = hubOf(ui.section);
  const [vault, setVault] = useState<(typeof VAULT)[number] | null>(null);
  const [slideDir, setSlideDir] = useState(1);
  const segRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
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
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("input, textarea, select, .cal-sheet, .search-pop, .cobros, .vault-lever-rail")) return;
        swipe.current = { x: e.clientX, y: e.clientY };
        // Touch/pen only: capturing a mouse press retargets its click to <main>, so desktop clicks never reach the row.
        if (e.pointerType !== "mouse") e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
        swiped.current = true;
        const dir = dx < 0 ? 1 : -1;
        setSlideDir(dir);
        if (hub === "desk") window.dispatchEvent(new CustomEvent("faro-lens", { detail: dir }));
        else if (hub === "books" && vault) {
          const i = VAULT.indexOf(vault);
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
        <>
          <div className="seg is-follow" ref={segRef} role="tablist" aria-label={t("hub.books")}>
            <i className="seg-pill" aria-hidden style={vault ? { opacity: 0 } : undefined} />
            {BOOKS.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={!vault && ui.section === id} aria-current={!vault && ui.section === id ? "page" : undefined} onClick={() => { setVault(null); setUi({ section: id }); }}>
                <span className="seg-ico" aria-hidden><SectionIcon id={id} className="size-3.5" /></span>
                <span className="seg-label">{id === "subs" ? t("tab.subs") : t(`nav.${id}`)}</span>
              </button>
            ))}
          </div>
          <div className="vault-bar" ref={vaultRef} style={{ ["--vault" as string]: vault ? VAULT.indexOf(vault) : 0, ["--vtint" as string]: vault === "meta" ? vtint("#8fb9a6") : vault === "retiro" ? vtint("#72b4b2") : vault === "emergencia" ? vtint("#7aa2c4") : vault === "save" ? vtint(SAVINGS_PURPLE) : "var(--fg)" }} role="tablist" aria-label={t("desk.savings")}>
            <i className={`vault-glide${vault ? " is-on" : ""}${vault === "save" ? " is-save" : ""}`} aria-hidden />
            {VAULT.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={vault === id} aria-current={vault === id ? "page" : undefined} onClick={() => {
                if (vault && vault !== id) setSlideDir(VAULT.indexOf(id) > VAULT.indexOf(vault) ? 1 : -1);
                setVault(id);
              }}>
                {id === "save" ? <Landmark className="size-3.5" /> : id === "meta" ? <Flag className="size-3.5" /> : id === "retiro" ? <Hourglass className="size-3.5" /> : <Shield className="size-3.5" />}
                <span>{id === "save" ? t("desk.savings") : id === "meta" ? t("vault.meta") : id === "retiro" ? t("vault.retiro") : t("vault.emerg")}</span>
              </button>
            ))}
          </div>
          <div key={vault ?? ui.section} className={`swipe-pane${vault ? " is-vault" : ""}`} data-dir={slideDir < 0 ? "-1" : "1"}>
            {vault ? <Desk focus={vault} /> : ui.section === "shops" ? <Shops /> : ui.section === "subs" ? <Subs /> : <Books mode={ui.section === "fixed" ? "fixed" : ui.section === "variable" ? "variable" : "income"} />}
          </div>
        </>
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
  const days = new Map<number, { items: { id: string; name: string; kind: LineKind }[]; dots: Array<"good" | "bad"> }>();
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
    if (line.concept) slot.items.push({ id: line.id, name: line.concept, kind: line.kind });
    const tone = incoming ? "good" : "bad";
    if (!slot.dots.includes(tone)) slot.dots.push(tone);
    days.set(dated, slot);
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

  const paint = (g: FloatGeo) => {
    const win = winRef.current;
    if (win) {
      win.style.left = `${g.x}px`;
      win.style.top = `${g.y}px`;
      win.style.width = `${g.w}px`;
      win.style.height = `${g.h}px`;
      win.style.setProperty("--fz", String(floatZoom(g.w)));
    }
    const bub = bubbleRef.current;
    if (bub) {
      bub.style.left = `${g.bx}px`;
      bub.style.top = `${g.by}px`;
    }
  };

  // Drag: pointer capture on the handle, geometry computed per move but painted once per frame (rAF), straight to style.
  // No React state changes until pointerup, so the content never re-renders mid-drag.
  const grab = (mode: "move" | "bubble" | FloatEdge) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (mode === "move" && (e.target as HTMLElement).closest("button")) return;
    if (mode !== "move" && mode !== "bubble") e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { ...live.current };
    const shell = mode === "bubble" ? bubbleRef.current : winRef.current;
    let moved = false;
    let last = start;
    let frame = 0;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!moved) {
        if (Math.hypot(dx, dy) < (mode === "move" || mode === "bubble" ? 5 : 2)) return;
        moved = true;
        shell?.classList.add("is-moving");
        if (mode !== "move" && mode !== "bubble") shell?.setAttribute("data-edge", mode);
      }
      if (mode === "move") last = clampFloat({ ...start, x: start.x + dx, y: start.y + dy });
      else if (mode === "bubble") last = clampFloat({ ...start, bx: start.bx + dx, by: start.by + dy });
      else last = resizeFloat(start, mode, dx, dy);
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(last); });
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      shell?.classList.remove("is-moving");
      shell?.removeAttribute("data-edge");
      if (mode === "bubble") {
        if (!moved) { onFold(false); return; }
        const vw = window.innerWidth;
        last = clampFloat({ ...last, bx: last.bx + BUBBLE / 2 < vw / 2 ? 6 : vw - BUBBLE - 6 });
      }
      if (moved) { paint(last); setGeo(last); }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
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
    <div
      ref={winRef}
      className="float-win"
      role="dialog"
      aria-modal="false"
      aria-label={`${t("float")}: ${name}`}
      style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h, ["--float-alpha" as string]: geo.alpha, ["--fz" as string]: floatZoom(geo.w) }}
    >
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
      <FaroPane map={map}>
        <div className="float-body">
          <div className="workspace">
            <SectionView />
          </div>
          <DockNav section={section} onSection={onSection} />
        </div>
      </FaroPane>
      {FLOAT_EDGES.filter((d) => d !== "se").map((d) => <span key={d} className={`float-size is-${d}`} aria-hidden onPointerDown={grab(d)} />)}
      <span className="float-size is-se" role="button" tabIndex={0} aria-label={t("float.size")} onPointerDown={grab("se")} onKeyDown={(e) => nudge(e, "size")}><i /></span>
    </div>
  );
}
