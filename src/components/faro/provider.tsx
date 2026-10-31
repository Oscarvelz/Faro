import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CLOUD_READY, fetchOfficialRate, pullLedger, pushLedger, type RemoteRow } from "@/lib/faro/api";
import { advicePrints, readStoredGoals, wake, type WakeLog, type WakeResult } from "@/lib/faro/awake";
import { applyTemplate, createInitial, isLedger, makeNamer, moveNamed } from "@/lib/faro/defaults";
import { buildAdvice, buildBudget, buildInsights, categorySlices, monthLines, summarize } from "@/lib/faro/engine";
import { monthName, translate } from "@/lib/faro/i18n";
import { convertMinor, eventCombo, formatMoney, formatRate, isTypingTarget, monthKey as toKey, parseRate, productHref, shiftMonth, uid } from "@/lib/faro/money";
import { blankSession, commit as commitSession, copyRecurring, redo as redoSession, undo as undoSession, type Session } from "@/lib/faro/reducer";
import { searchLedger, type Hit } from "@/lib/faro/search";
import { withAugustSample } from "@/lib/faro/sample";
import type { Lang, LedgerState, Line, SectionId, TemplateId, ThemeId } from "@/lib/faro/types";
import { DEFAULT_SHORTCUTS, NIGHT_THEMES, THEME_IDS } from "@/lib/faro/types";

type ConfirmOpts = { title: string; body: string; danger?: boolean; yes?: string; run: () => void };
type Notice = string;

type UiState = {
  section: SectionId;
  year: number;
  month: number;
  query: string;
  highlight: string;
  calcOpen: boolean;
  instruments: boolean;
  help: boolean;
  rebind: string | null;
  draft: Line["kind"] | null;
  editing: string | null;
  notice: Notice;
};

export type Api = {
  userId: string;
  ready: boolean;
  session: Session | null;
  ui: UiState;
  setUi: (patch: Partial<UiState>) => void;
  sync: "offline" | "syncing" | "saved" | "local" | "error" | "conflict";
  hasConflict: boolean;
  t: (key: string) => string;
  lang: Lang;
  monthLabel: string;
  key: string;
  lines: Line[];
  names: ReturnType<typeof makeNamer>;
  summary: ReturnType<typeof summarize> | null;
  insights: ReturnType<typeof buildInsights>;
  advice: ReturnType<typeof buildAdvice>;
  budget: ReturnType<typeof buildBudget> | null;
  slices: ReturnType<typeof categorySlices>;
  hits: Hit[];
  fmt: (minor: number) => string;
  viewLine: (line: Line) => string;
  recordLine: (line: Line) => string;
  commit: (recipe: (s: LedgerState) => LedgerState, detail: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  confirm: (opts: ConfirmOpts) => void;
  focusAmount: (fn: ((n: number) => void) | null) => void;
  insertAmount: (n: number) => boolean;
  syncNow: () => void;
  refreshRate: () => void;
  saveRate: (raw: string) => void;
  exportJson: () => void;
  importFile: (file: File) => void;
  pickFolder: () => void;
  restoreConflict: () => void;
  goSection: (delta: number) => void;
  goMonth: (delta: number) => void;
  goToday: () => void;
  setMonth: (year: number, month: number) => void;
  copyPrev: () => void;
  awakeOn: boolean;
  setAwakeOn: (on: boolean) => void;
  wake: WakeResult | null;
  wakeLog: WakeLog[];
  notePlanCopied: () => void;
  dismissFinding: (id: string, reason: string) => void;
  planStale: boolean;
};

const Ctx = createContext<Api | null>(null);
const PaneCtx = createContext<Api | null>(null);

export function FaroPane({ map, children }: { map: (api: Api) => Api; children: ReactNode }) {
  const api = useContext(Ctx);
  const parent = useContext(PaneCtx);
  const base = parent ?? api;
  const mapped = useMemo(() => (base ? map(base) : null), [base, map]);
  if (!mapped) return children;
  return <PaneCtx.Provider value={mapped}>{children}</PaneCtx.Provider>;
}

export function useFaro(): Api {
  const pane = useContext(PaneCtx);
  const v = useContext(Ctx);
  const api = pane ?? v;
  if (!api) throw new Error("Faro missing");
  return api;
}

function packKey(userId: string) {
  return `faro.pack.${userId}`;
}
function conflictKey(userId: string) {
  return `faro.conflict.${userId}`;
}

function readPack(userId: string): { ledger: LedgerState; dirty: boolean } | null {
  try {
    const raw = localStorage.getItem(packKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ledger?: unknown; dirty?: boolean };
    if (!isLedger(parsed.ledger)) return null;
    return { ledger: parsed.ledger, dirty: Boolean(parsed.dirty) };
  } catch {
    return null;
  }
}

function deviceId(): string {
  const k = "faro.device";
  let id = localStorage.getItem(k);
  if (!id) {
    id = uid();
    localStorage.setItem(k, id);
  }
  return id;
}

async function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("faro-files", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("handles");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle: FileSystemDirectoryHandle) {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("handles", "readwrite");
    tx.objectStore("handles").put(handle, "dir");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await idb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("handles", "readonly");
      const req = tx.objectStore("handles").get("dir");
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const now = () => new Date();

export function FaroProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState<Api["sync"]>("local");
  const [hasConflict, setHasConflict] = useState(false);
  const [awakeOn, setAwakeOnState] = useState(true);
  const [wakeView, setWakeView] = useState<WakeResult | null>(null);
  const [wakeLog, setWakeLog] = useState<WakeLog[]>([]);
  const [goalTick, setGoalTick] = useState(0);
  const [planStale, setPlanStale] = useState(false);
  const planCopied = useRef(false);
  const dismissedRef = useRef<{ id: string; reason: string }[]>([]);
  const wakeBase = useRef<{ ledger: LedgerState; advice: ReturnType<typeof advicePrints>; goals: ReturnType<typeof readStoredGoals>; key: string } | null>(null);
  const wakeTimer = useRef(0);
  const dayRef = useRef("");
  const [confirmState, setConfirm] = useState<ConfirmOpts | null>(null);
  const [ui, setUiState] = useState<UiState>(() => {
    const d = now();
    return {
      section: "desk",
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      query: "",
      highlight: "",
      calcOpen: false,
      instruments: false,
      help: false,
      rebind: null,
      draft: null,
      editing: null,
      notice: "",
    };
  });
  const amountRef = useRef<((n: number) => void) | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const syncing = useRef(false);
  sessionRef.current = session;

  const setUi = useCallback((patch: Partial<UiState>) => {
    setUiState((u) => ({ ...u, ...patch }));
  }, []);

  const places = useRef<Array<Pick<UiState, "section" | "year" | "month" | "help" | "instruments" | "draft" | "editing">>>([]);
  const applying = useRef(false);
  const confirmRef = useRef(confirmState);
  const uiRef = useRef(ui);
  confirmRef.current = confirmState;
  uiRef.current = ui;

  useEffect(() => {
    const place = {
      section: ui.section,
      year: ui.year,
      month: ui.month,
      help: ui.help,
      instruments: ui.instruments,
      draft: ui.draft,
      editing: ui.editing,
    };
    const last = places.current[places.current.length - 1];
    if (applying.current) {
      applying.current = false;
      const missed = (place.instruments && !last?.instruments) || (place.help && !last?.help);
      if (!missed) return;
    }
    if (last && (last.instruments || last.help) && !place.instruments && !place.help) {
      places.current.pop();
      places.current.push(place);
      history.replaceState({ faro: places.current.length }, "");
      return;
    }
    if (
      last &&
      last.section === place.section &&
      last.year === place.year &&
      last.month === place.month &&
      last.help === place.help &&
      last.instruments === place.instruments &&
      last.draft === place.draft &&
      last.editing === place.editing
    ) return;
    places.current.push(place);
    history.pushState({ faro: places.current.length, overlay: place.instruments ? "instruments" : place.help ? "help" : "" }, "");
  }, [ui.section, ui.year, ui.month, ui.help, ui.instruments, ui.draft, ui.editing]);

  useEffect(() => {
    const closeOverlay = () => {
      const live = uiRef.current;
      applying.current = true;
      while (places.current.length > 0) {
        const top = places.current[places.current.length - 1];
        if (!top?.instruments && !top?.help) break;
        places.current.pop();
      }
      if (places.current.length === 0) {
        places.current.push({
          section: live.section,
          year: live.year,
          month: live.month,
          help: false,
          instruments: false,
          draft: live.draft,
          editing: live.editing,
        });
      }
      setUiState((u) => ({ ...u, instruments: false, help: false, calcOpen: false }));
      history.pushState({ faro: places.current.length }, "");
    };
    const onPop = () => {
      const hold = window as Window & { __faroSkipPop?: number };
      if ((hold.__faroSkipPop ?? 0) > 0) {
        hold.__faroSkipPop = (hold.__faroSkipPop ?? 1) - 1;
        return;
      }
      const live = uiRef.current;
      if (confirmRef.current) {
        setConfirm(null);
        history.pushState({ faro: places.current.length }, "");
        return;
      }
      if (live.instruments || live.help) {
        closeOverlay();
        return;
      }
      if (live.calcOpen) {
        setUiState((u) => ({ ...u, calcOpen: false }));
        history.pushState({ faro: places.current.length }, "");
        return;
      }
      const ev = new CustomEvent("faro-back", { cancelable: true });
      if (!window.dispatchEvent(ev)) {
        history.pushState({ faro: places.current.length }, "");
        return;
      }
      if (places.current.length > 1) {
        places.current.pop();
        const prev = places.current[places.current.length - 1];
        if (prev) {
          applying.current = true;
          setUiState((u) => ({ ...u, ...prev, query: "", highlight: "" }));
        }
        return;
      }
      history.pushState({ faro: 1 }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    try {
      const saved = readPack(userId);
      const lang = localStorage.getItem("faro-lang") === "en" ? "en" : "es";
      const stored = localStorage.getItem("faro-theme");
      const daySet = localStorage.getItem("faro-day") === "1";
      const known = (value: string | null): value is ThemeId => !!value && THEME_IDS.includes(value as ThemeId);
      const theme: ThemeId = daySet && known(stored) ? stored : "claro";
      let ledger = saved?.ledger ?? createInitial(lang, theme);
      let dirty = saved?.dirty ?? false;
      const seeded = withAugustSample(ledger);
      ledger = seeded.ledger;
      if (seeded.added) dirty = true;
      if (!daySet) {
        localStorage.setItem("faro-day", "1");
        if (ledger.settings.theme !== "claro") {
          ledger = {
            ...ledger,
            settings: { ...ledger.settings, theme: "claro" },
            revision: ledger.revision + 1,
            updatedAt: new Date().toISOString(),
          };
          dirty = true;
        }
      }
      setSession(blankSession(ledger, dirty));
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const currentEmpty = (ledger.months[currentKey]?.lines.length ?? 0) === 0;
      const hasDemo = (ledger.months["2026-08"]?.lines ?? []).some((line) => line.id.startsWith("demo-ago-"));
      if (seeded.added || (currentEmpty && hasDemo)) setUi({ year: 2026, month: 8, section: "desk" });
      setHasConflict(Boolean(localStorage.getItem(conflictKey(userId))));
    } catch {
      setSession(blankSession(createInitial("es", "claro"), false));
    } finally {
      setReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!session) return;
    const seeded = withAugustSample(session.ledger);
    if (seeded.added) {
      setSession(blankSession(seeded.ledger, true));
      setUi({ year: 2026, month: 8, section: "desk" });
      return;
    }
    localStorage.setItem(packKey(userId), JSON.stringify({ ledger: session.ledger, dirty: session.dirty }));
    document.documentElement.dataset.theme = session.ledger.settings.theme;
    document.documentElement.lang = session.ledger.settings.lang;
    localStorage.setItem("faro-theme", session.ledger.settings.theme);
    localStorage.setItem("faro-lang", session.ledger.settings.lang);
    const night = NIGHT_THEMES.includes(session.ledger.settings.theme);
    const chrome = session.ledger.settings.theme === "ion" ? "#e7eef8" : session.ledger.settings.theme === "ion-noche" ? "#070b12" : night ? "#0e1114" : "#f4f1ea";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", chrome);
  }, [session, userId]);

  const applyRemote = useCallback((row: RemoteRow, dirtyLocal: LedgerState | null) => {
    try {
      const parsed = JSON.parse(row.dataJson) as unknown;
      if (!isLedger(parsed)) return false;
      const seeded = withAugustSample(parsed);
      if (dirtyLocal) {
        localStorage.setItem(conflictKey(userId), JSON.stringify(dirtyLocal));
        setHasConflict(true);
        setSync("conflict");
      }
      setSession(blankSession(seeded.ledger, Boolean(dirtyLocal) || seeded.added));
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  const syncNow = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || syncing.current) return;
    if (!CLOUD_READY) {
      setSync("local");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSync("offline");
      return;
    }
    syncing.current = true;
    setSync("syncing");
    try {
      const remote = await pullLedger();
      const local = sessionRef.current;
      if (!local) return;
      if (remote && (remote.revision > local.ledger.revision || (remote.revision === local.ledger.revision && Date.parse(remote.updatedAt) > Date.parse(local.ledger.updatedAt) && !local.dirty))) {
        applyRemote(remote, local.dirty ? local.ledger : null);
        if (!local.dirty) setSync("saved");
        return;
      }
      if (remote && !local.dirty && local.ledger.revision <= remote.revision && Date.parse(remote.updatedAt) >= Date.parse(local.ledger.updatedAt)) {
        setSync("saved");
        return;
      }
      if (local.dirty || !remote || local.ledger.revision > (remote?.revision ?? 0)) {
        if (!local.dirty && !remote) {
          setSync("local");
          return;
        }
        const pushed = await pushLedger({
          data: {
            dataJson: JSON.stringify(local.ledger),
            revision: local.ledger.revision,
            updatedAt: local.ledger.updatedAt,
            deviceId: deviceId(),
          },
        });
        if (pushed.stale && pushed.row) {
          applyRemote(pushed.row, local.ledger);
          return;
        }
        setSession((s) => (s ? { ...s, dirty: false } : s));
        setSync("saved");
        return;
      }
      setSync("saved");
    } catch {
      setSync(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
    } finally {
      syncing.current = false;
    }
  }, [applyRemote]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => void syncNow(), 400);
    const poll = window.setInterval(() => void syncNow(), 12000);
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        void syncNow();
        void (async () => {
          const handle = await loadHandle();
          const led = sessionRef.current?.ledger;
          if (!handle || !led) return;
          const withPerm = handle as FileSystemDirectoryHandle & {
            queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
          };
          const q = withPerm.queryPermission ? await withPerm.queryPermission({ mode: "readwrite" }) : "prompt";
          if (q !== "granted") return;
          const file = await handle.getFileHandle(`Faro_Backup_${led.updatedAt.slice(0, 10)}.json`, { create: true });
          const writable = await file.createWritable();
          await writable.write(JSON.stringify({ app: "FARO", v: 1, exportedAt: new Date().toISOString(), ledger: led }, null, 2));
          await writable.close();
        })().catch(() => undefined);
      }
    };
    const onOff = () => setSync("offline");
    const onOn = () => void syncNow();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    window.addEventListener("beforeunload", onVis);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
      window.removeEventListener("beforeunload", onVis);
    };
  }, [ready, syncNow]);

  useEffect(() => {
    if (!session?.dirty) return;
    const timer = window.setTimeout(() => void syncNow(), 800);
    return () => window.clearTimeout(timer);
  }, [session?.dirty, session?.ledger.revision, syncNow]);

  const commit = useCallback((recipe: (s: LedgerState) => LedgerState, detail: string) => {
    setSession((s) => (s ? commitSession(s, recipe, detail) : s));
  }, []);
  const undo = useCallback(() => setSession((s) => (s ? undoSession(s) : s)), []);
  const redo = useCallback(() => setSession((s) => (s ? redoSession(s) : s)), []);

  const lang: Lang = session?.ledger.settings.lang ?? "es";
  const t = useCallback((key: string) => translate(lang, key), [lang]);
  const key = toKey(ui.year, ui.month);
  const names = useMemo(() => (session ? makeNamer(session.ledger.structure, lang) : makeNamer(createInitial().structure, lang)), [session, lang]);
  const lines = session ? monthLines(session.ledger, key) : [];
  const summary = session ? summarize(session.ledger, key, lang) : null;
  const insights = session ? buildInsights(session.ledger, key, lang, names) : [];
  const advice = session ? buildAdvice(session.ledger, key, lang, names) : [];
  const budget = session ? buildBudget(session.ledger, key, lang, names) : null;
  const slices = session ? categorySlices(session.ledger, key, names) : [];
  const hits = session && ui.query.trim().length >= 2 ? searchLedger(session.ledger, ui.query, lang, names) : [];
  const liveWake = useRef({ ledger: session?.ledger ?? null, advice, key, lang, names, awakeOn });
  liveWake.current = { ledger: session?.ledger ?? null, advice, key, lang, names, awakeOn };

  useEffect(() => {
    try {
      const log = JSON.parse(localStorage.getItem("faro-awake-log") || "[]") as WakeLog[];
      if (Array.isArray(log)) setWakeLog(log.slice(0, 40));
      const dismissed = JSON.parse(localStorage.getItem("faro-awake-dismiss") || "[]") as { id: string; reason: string }[];
      if (Array.isArray(dismissed)) dismissedRef.current = dismissed;
    } catch { /* the log is optional */ }
    const ping = () => setGoalTick((n) => n + 1);
    const onVis = () => { if (document.visibilityState === "visible") ping(); };
    window.addEventListener("faro-awake-goal", ping);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("faro-awake-goal", ping);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const cur = liveWake.current;
    if (!cur.ledger) return;
    const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    const dayChanged = dayRef.current !== "" && dayRef.current !== today;
    dayRef.current = today;
    window.clearTimeout(wakeTimer.current);
    wakeTimer.current = window.setTimeout(() => {
      const now = liveWake.current;
      if (!now.ledger) return;
      const goals = readStoredGoals(now.ledger.settings.display, now.ledger.settings.rateE4);
      const before = wakeBase.current;
      const opened = !before || dayChanged || before.key !== now.key;
      try {
        const result = wake({
          before: before?.ledger ?? null,
          after: now.ledger,
          monthKey: now.key,
          lang: now.lang,
          names: now.names,
          goalsBefore: before?.goals ?? goals,
          goalsAfter: goals,
          adviceBefore: before?.advice ?? [],
          adviceAfter: advicePrints(now.advice),
          planCopied: planCopied.current,
          dismissed: dismissedRef.current,
          enabled: true,
          opened,
        });
        wakeBase.current = { ledger: now.ledger, advice: advicePrints(now.advice), goals, key: now.key };
        setWakeView(result);
        if (result.stalePlan) setPlanStale(true);
        if (result.log.event !== "sin-cambio") {
          setWakeLog((prev) => {
            const next = [result.log, ...prev].slice(0, 40);
            try { localStorage.setItem("faro-awake-log", JSON.stringify(next)); } catch { /* ignore */ }
            return next;
          });
        }
      } catch (error) {
        const fail: WakeLog = {
          at: new Date().toISOString(),
          event: "fallo",
          recalculated: [],
          changed: [],
          silent: true,
          error: error instanceof Error ? error.message : "fallo",
        };
        setWakeLog((prev) => {
          const next = [fail, ...prev].slice(0, 40);
          try { localStorage.setItem("faro-awake-log", JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
      }
    }, wakeBase.current ? 450 : 0);
    return () => window.clearTimeout(wakeTimer.current);
  }, [session?.ledger.revision, session?.ledger.updatedAt, key, goalTick, awakeOn]);

  const setAwakeOn = useCallback((on: boolean) => {
    if (!on) return;
    setAwakeOnState(true);
  }, []);
  const notePlanCopied = useCallback(() => {
    planCopied.current = true;
    setPlanStale(false);
  }, []);
  const dismissFinding = useCallback((id: string, reason: string) => {
    const next = [...dismissedRef.current.filter((item) => item.id !== id), { id, reason }];
    dismissedRef.current = next;
    try { localStorage.setItem("faro-awake-dismiss", JSON.stringify(next)); } catch { /* ignore */ }
    setWakeView((cur) => (cur ? { ...cur, findings: cur.findings.filter((item) => !(item.id === id && item.reason === reason)) } : cur));
  }, []);

  const fmt = useCallback(
    (minor: number) => formatMoney(minor, session?.ledger.settings.display ?? "NIO", lang),
    [session?.ledger.settings.display, lang],
  );
  const viewLine = useCallback(
    (line: Line) => {
      const settings = session?.ledger.settings;
      if (!settings) return "";
      const minor = convertMinor(line.amountMinor, line.currency, settings.display, settings.rateE4);
      return formatMoney(minor, settings.display, lang);
    },
    [session?.ledger.settings, lang],
  );
  const recordLine = useCallback((line: Line) => formatMoney(line.amountMinor, line.currency, lang), [lang]);

  const goSection = useCallback((delta: number) => {
    setUiState((u) => {
      const books = ["income", "fixed", "variable", "shops", "subs"] as const;
      const study = ["stats", "advice"] as const;
      const loop = (books as readonly string[]).includes(u.section)
        ? books
        : (study as readonly string[]).includes(u.section)
          ? study
          : (["desk"] as const);
      const i = loop.indexOf(u.section as never);
      const next = loop[(i + delta + loop.length) % loop.length] ?? u.section;
      return { ...u, section: next, draft: null, editing: null };
    });
  }, []);
  const goMonth = useCallback((delta: number) => {
    setUiState((u) => {
      const n = shiftMonth(u.year, u.month, delta);
      return { ...u, ...n, draft: null, editing: null };
    });
  }, []);
  const goToday = useCallback(() => {
    const n = new Date();
    setUiState((u) => ({ ...u, year: n.getFullYear(), month: n.getMonth() + 1, draft: null, editing: null }));
  }, []);
  const setMonth = useCallback((year: number, month: number) => {
    setUiState((u) => ({ ...u, year, month, draft: null, editing: null }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.rebind) {
        if (e.key === "Escape") {
          setUi({ rebind: null });
          return;
        }
        e.preventDefault();
        const combo = eventCombo(e);
        if (!combo || combo === "Shift" || combo === "Mod") return;
        commit((s) => {
          const shortcuts = { ...s.settings.shortcuts };
          for (const [action, bound] of Object.entries(shortcuts)) {
            if (bound === combo) delete shortcuts[action];
          }
          shortcuts[ui.rebind ?? ""] = combo;
          return { ...s, settings: { ...s.settings, shortcuts } };
        }, `Atajo ${ui.rebind}`);
        setUi({ rebind: null });
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (confirmState) {
          setConfirm(null);
          return;
        }
        if (ui.instruments || ui.help) {
          setUi({ instruments: false, help: false, calcOpen: false });
          return;
        }
        if (ui.calcOpen) {
          setUi({ calcOpen: false });
          return;
        }
        if (isTypingTarget(e.target)) {
          (e.target as HTMLElement).blur();
          return;
        }
        const back = new CustomEvent("faro-back", { cancelable: true });
        if (!window.dispatchEvent(back)) return;
        if (places.current.length > 1) history.back();
        return;
      }
      if (confirmState) return;
      const typing = isTypingTarget(e.target);
      const combo = eventCombo(e);
      const shortcuts = { ...DEFAULT_SHORTCUTS, ...(session?.ledger.settings.shortcuts ?? {}) };
      const action = Object.entries(shortcuts).find(([, c]) => c === combo)?.[0];
      if (!action) return;
      if (typing && action !== "search" && action !== "sync") return;
      if (action === "sync" || action === "search" || action === "export") e.preventDefault();
      if (action === "nav-prev") goSection(-1);
      else if (action === "nav-next") goSection(1);
      else if (action === "undo") undo();
      else if (action === "redo" || action === "redo-alt") redo();
      else if (action === "search") {
        const el = document.getElementById("faro-search");
        el?.focus();
      } else if (action === "sync") void syncNow();
      else if (action === "export") exportJson();
      else if (action === "toggle-currency") {
        commit((s) => ({ ...s, settings: { ...s.settings, display: s.settings.display === "NIO" ? "USD" : "NIO" } }), "Vista de moneda");
      } else if (action === "new-line") {
        const kind = ui.section === "fixed" ? "expense-fixed" : ui.section === "variable" ? "expense-variable" : ui.section === "shops" ? "purchase" : ui.section === "subs" ? "subscription" : "income-fixed";
        setUi({ draft: kind, section: ui.section === "desk" || ui.section === "stats" || ui.section === "advice" || ui.section === "settings" ? "income" : ui.section });
      } else if (action === "settings") setUi({ section: "settings" });
      else if (action === "month-prev") goMonth(-1);
      else if (action === "month-next") goMonth(1);
      else if (action === "calculator") {
        if (window.innerWidth < 1100) setUi({ calcOpen: true, instruments: true });
        else setUi({ calcOpen: true });
      }
      else if (action === "help") setUi({ help: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function exportJson() {
    if (!session) return;
    const stamp = new Date().toISOString().slice(0, 10);
    download(
      `Faro_Backup_${stamp}.json`,
      JSON.stringify({ app: "FARO", v: 1, exportedAt: new Date().toISOString(), ledger: session.ledger }, null, 2),
      "application/json",
    );
  }

  const value: Api = {
    userId,
    ready,
    session,
    ui,
    setUi,
    sync,
    hasConflict,
    t,
    lang,
    monthLabel: `${monthName(lang, ui.month)} ${ui.year}`,
    key,
    lines,
    names,
    summary,
    insights,
    advice,
    budget,
    slices,
    hits,
    fmt,
    viewLine,
    recordLine,
    commit,
    undo,
    redo,
    canUndo: Boolean(session && session.past.length),
    canRedo: Boolean(session && session.future.length),
    confirm: (opts) => setConfirm(opts),
    focusAmount: (fn) => {
      amountRef.current = fn;
    },
    insertAmount: (n) => {
      if (!amountRef.current) return false;
      amountRef.current(n);
      return true;
    },
    syncNow: () => void syncNow(),
    refreshRate: () => {
      void fetchOfficialRate().then((rate) => {
        commit(
          (s) => ({ ...s, settings: { ...s.settings, rateE4: rate.rateE4, rateSource: rate.source, rateAsOf: rate.asOf } }),
          `Tasa ${rate.source} ${formatRate(rate.rateE4)}`,
        );
      }).catch(() => setSync("error"));
    },
    saveRate: (raw) => {
      const rateE4 = parseRate(raw);
      if (!rateE4) return;
      commit(
        (s) => ({ ...s, settings: { ...s.settings, rateE4, rateSource: "manual", rateAsOf: new Date().toISOString().slice(0, 10) } }),
        `Tasa manual ${formatRate(rateE4)}`,
      );
    },
    exportJson,
    importFile: (file) => {
      void file.text().then((text) => {
        const parsed = JSON.parse(text) as { ledger?: unknown };
        const ledger = isLedger(parsed) ? parsed : parsed.ledger;
        if (!isLedger(ledger)) return;
        setConfirm({
          title: t("settings.import"),
          body: t("rate.note"),
          danger: true,
          yes: t("yes"),
          run: () => {
            const updatedAt = new Date().toISOString();
            setSession(blankSession({ ...ledger, revision: (session?.ledger.revision ?? 1) + 1, updatedAt }, true));
          },
        });
      }).catch(() => undefined);
    },
    pickFolder: () => {
      const picker = (window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
      if (!picker) {
        setUi({ notice: t("settings.folderNo") });
        return;
      }
      void picker().then((handle) => saveHandle(handle)).catch(() => undefined);
    },
    restoreConflict: () => {
      const raw = localStorage.getItem(conflictKey(userId));
      if (!raw) return;
      const ledger = JSON.parse(raw) as unknown;
      if (!isLedger(ledger)) return;
      setConfirm({
        title: t("settings.conflict"),
        body: t("delete.warn"),
        danger: true,
        yes: t("yes"),
        run: () => {
          const updatedAt = new Date().toISOString();
          setSession(blankSession({ ...ledger, revision: (session?.ledger.revision ?? ledger.revision) + 1, updatedAt }, true));
          localStorage.removeItem(conflictKey(userId));
          setHasConflict(false);
        },
      });
    },
    goSection,
    goMonth,
    goToday,
    setMonth,
    copyPrev: () => {
      if (!session) return;
      const prev = shiftMonth(ui.year, ui.month, -1);
      const from = toKey(prev.year, prev.month);
      const result = copyRecurring(session.ledger, from, key);
      if (!result.count) {
        setUi({ notice: t("desk.nothing") });
        return;
      }
      commit(() => result.state, t("desk.copied"));
      setUi({ notice: t("desk.copied") });
    },
    awakeOn,
    setAwakeOn,
    wake: wakeView,
    wakeLog,
    notePlanCopied,
    dismissFinding,
    planStale,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {confirmState ? (
        <div className="modal-back" role="presentation" onMouseDown={() => setConfirm(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="faro-confirm-title" onMouseDown={(e) => e.stopPropagation()}>
            <h2 id="faro-confirm-title" className="serif text-2xl">{confirmState.title}</h2>
            <p className="mt-3">{confirmState.body}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn secondary" onClick={() => setConfirm(null)}>{t("cancel")}</button>
              <button
                type="button"
                className={confirmState.danger ? "btn danger" : "btn"}
                onClick={() => {
                  confirmState.run();
                  setConfirm(null);
                }}
              >
                {confirmState.yes ?? t("yes")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export { moveNamed, applyTemplate, productHref };
