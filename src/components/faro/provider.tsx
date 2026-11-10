import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CLOUD_READY, fetchOfficialRate, pullLedger, pushLedger, type RemoteRow } from "@/lib/faro/api";
import { advicePrints, readStoredGoals, wake, type WakeLog, type WakeResult } from "@/lib/faro/awake";
import { applyTemplate, createInitial, isLedger, isLedgerDeep, makeNamer, moveNamed, withRemesas } from "@/lib/faro/defaults";
import { browserPackStorage, listQuarantine, packLedgerOk, quarantinePack, readQuarantine, storedRevision, tabVerdict, type QuarantineEntry } from "@/lib/faro/packguard";
import { applyDeviceLayer, deviceSectionOf, snapshotDeviceLayer } from "@/lib/faro/devicelayer";
import { readPlace, writePlace } from "@/lib/faro/navplace";
import { applyDueFile, dueFileSectionOf, snapshotDueFile } from "@/lib/faro/duefile";
import { syncDecision } from "@/lib/faro/syncdecide";
import { buildAdvice, buildBudget, buildInsights, categorySlices, monthLines, summarize } from "@/lib/faro/engine";
import { monthName, translate } from "@/lib/faro/i18n";
import { convertMinor, eventCombo, formatMoney, formatRate, isTypingTarget, monthKey as toKey, parseRate, productHref, shiftMonth, uid } from "@/lib/faro/money";
import { blankSession, commit as commitSession, copyRecurring, redo as redoSession, undo as undoSession, type Session } from "@/lib/faro/reducer";
import { searchLedger, type Hit } from "@/lib/faro/search";
import { isPureSample, stripSample, withAugustSample } from "@/lib/faro/sample";
import { sampleOn, takeSwitchRemount } from "@/lib/faro/samplemode";
import { autoBackup, backupBlob, gunzip, listBackups, readBackup, type BackupInfo } from "@/spa/vault";
import type { Lang, LedgerState, Line, SectionId, TemplateId, ThemeId } from "@/lib/faro/types";
import "@/lib/manual/back";
import { readY, requestFocus, writeY } from "@/lib/manual/nav";
import { placeName, screenPatch, type GoLike, type VaultTab } from "@/lib/manual/places";
import { moveCobros, lentOf } from "@/lib/faro/debts";
import { todayIso } from "@/lib/faro/loans";
import { DEFAULT_SHORTCUTS, NIGHT_THEMES, THEME_IDS } from "@/lib/faro/types";

type ConfirmOpts = { title: string; body: string; danger?: boolean; yes?: string; no?: string; run: () => void };
/** Load-time seeds: the August sample, then the one-time Remesas categories (1.3.86). */
function seedLedger(ledger: LedgerState): { ledger: LedgerState; added: boolean; sample: boolean } {
  // 1.3.87: the August sample lives only in sample mode (its own store). Personal books that are
  // still pure, untouched sample start empty; anything the user touched is kept as theirs.
  const a = sampleOn() ? withAugustSample(ledger) : isPureSample(ledger) ? { ledger: { ...stripSample(ledger), revision: ledger.revision + 1, updatedAt: new Date().toISOString() }, added: true } : { ledger, added: false };
  const b = withRemesas(a.ledger);
  const c = withDeviceCobros(b.ledger);
  return { ledger: c.ledger, added: a.added || b.added || c.moved > 0, sample: sampleOn() && a.added };
}

/** 1.3.92: Me deben moves from this device into the ledger once (idempotent by id); the device copy stays, plus a backup key. */
function withDeviceCobros(ledger: LedgerState): { ledger: LedgerState; moved: number } {
  let raw: unknown = null;
  try {
    const text = localStorage.getItem("faro-cobros");
    if (!text) return { ledger, moved: 0 };
    raw = JSON.parse(text);
    if (localStorage.getItem("faro-cobros-backup") === null) localStorage.setItem("faro-cobros-backup", text);
  } catch { return { ledger, moved: 0 }; }
  return moveCobros(ledger, raw, ledger.settings.lang === "en" ? "Payment" : "Abono");
}

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
  /** Manual layer: null closed, "" open at the cover, "<topicId>" open at that entry, "@az" at the A–Z index. */
  manual: string | null;
  /** Libros savings tab (Ahorros / Meta / Retiro / Emergencia), a real history step. */
  vault: VaultTab | null;
  /** Bumped by an in-page jump, so back returns to the spot it left. */
  spot: number;
};

type PlaceKeys = "section" | "year" | "month" | "help" | "instruments" | "draft" | "editing" | "manual" | "vault" | "spot";
type Place = Pick<UiState, PlaceKeys> & { y?: number };
const PLACE_KEYS: PlaceKeys[] = ["section", "year", "month", "help", "instruments", "draft", "editing", "manual", "vault", "spot"];
const samePlace = (a: Place, b: Place) => PLACE_KEYS.every((k) => a[k] === b[k]);
/** Keys whose change remounts what you see, so back has to bring the scroll back. */
const SCREEN_KEYS: PlaceKeys[] = ["section", "year", "month", "vault", "spot"];

export type Api = {
  userId: string;
  ready: boolean;
  session: Session | null;
  ui: UiState;
  setUi: (patch: Partial<UiState>) => void;
  sync: "offline" | "syncing" | "saved" | "local" | "error" | "conflict";
  hasConflict: boolean;
  /** Cuarentena visible (1.3.166): copias apartadas por daño, restaurables desde Ajustes. */
  quarantined: QuarantineEntry[];
  restoreQuarantine: (ts: number) => void;
  /** C2 (1.3.166): el libro cambió en otra pestaña/ventana y esta ya se puso al día. */
  tabConflict: boolean;
  dismissTabConflict: () => void;
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
  commit: (recipe: (s: LedgerState) => LedgerState, detail: string | (() => string)) => void;
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
  backups: BackupInfo[];
  backupNow: () => void;
  restoreBackup: (info: BackupInfo) => void;
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
  /** True while the last save to this device failed (storage full/blocked); the shell shows a banner until a write lands. */
  persistFailed: boolean;
  /** Number of places on the stack (1 = nothing to go back to). */
  depth: number;
  /** Name of the place under the current one ("Central", "Meta"…), for "Volver a …". */
  backName: () => string;
  /** Open the manual at the cover ("") or at an entry. Always a new history step. */
  openManual: (id?: string) => void;
  /** Jump to where a topic lives (screen, fold, element). `from` = the manual entry being read, so back lands on it. */
  goTopic: (id: string, go: GoLike, from?: string) => void;
  /** Make the current spot a step, before an in-page jump. */
  markSpot: () => void;
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

/** The app-wide api (ignores split/float pane mapping): the manual and "Ir allí" always act on the top pane. */
export function useFaroRoot(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("Faro missing");
  return v;
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

/** C2 (1.3.166): el trabajo de ESTA pestaña, apartado cuando el libro se movió en otra. */
function tabConflictKey(userId: string) {
  return `faro.conflict.${userId}.tab`;
}

function readPack(userId: string): { ledger: LedgerState; dirty: boolean } | null {
  try {
    const raw = localStorage.getItem(packKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ledger?: unknown; dirty?: boolean };
    // 1.3.166 (C1): la lectura de arranque valida EN PROFUNDIDAD — un pack con corrupción de
    // campo ya no «pasa» para luego explotar dentro del arranque.
    if (!isLedgerDeep(parsed.ledger)) return null;
    return { ledger: parsed.ledger, dirty: Boolean(parsed.dirty) };
  } catch {
    return null;
  }
}

/**
 * 1.3.146: a pack that exists but cannot be read (damaged JSON, an old shape) is set aside raw — newest 3 kept —
 * before the fresh book overwrites the pack key, so booting empty never silently destroys the only local copy.
 * Returns true when a copy was set aside. A genuine first run (no pack at all) never quarantines.
 *
 * 1.3.166 (oleada 2 del corazón): la mecánica vive ahora en packguard — validación PROFUNDA
 * (un pack con corrupción de campo también se aparta: era el hueco C1), rotación que nunca
 * expulsa la última copia buena (C5), y `force` para el catch del arranque: el pack existía
 * pero el arranque falló, así que se aparta aunque valide — la preservación gana el empate.
 */
function quarantineCorruptPack(userId: string, force = false): boolean {
  try {
    return quarantinePack(browserPackStorage(), userId, { force });
  } catch {
    return false;
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

function download(filename: string, text: string | Uint8Array, type: string) {
  const blob = new Blob([text as BlobPart], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const now = () => new Date();

/** The bar colour a theme paints with (meta theme-color): written at the flip neck and by the session effect alike. */
function chromeForTheme(shown: ThemeId): string {
  return shown === "ion-noche" ? "#070b12" : shown === "tron" ? "#02060c" : NIGHT_THEMES.includes(shown) ? "#0e1114" : "#f4f1ea";
}

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
  const [persistFailed, setPersistFailed] = useState(false);
  const persistFailedRef = useRef(false);
  // Oleada 2 del corazón (1.3.166): C2 — el sello de revisión que esta pestaña cargó o guardó por
  // última vez (baseRevRef), si su guardado está bloqueado por un pack ilegible (tabBlockedRef),
  // la revisión adoptada tras el último aviso (para no repetir el aviso en bucle), el aviso
  // visible (tabBanner) y la lista de cuarentena que Ajustes muestra (C4).
  const baseRevRef = useRef<number | null>(null);
  const tabBlockedRef = useRef(false);
  const tabAdoptRevRef = useRef<number | null>(null);
  const [tabBanner, setTabBanner] = useState(false);
  const [quarantined, setQuarantined] = useState<QuarantineEntry[]>([]);
  const flipGen = useRef(0); // 1.3.159: generation of the current fr-flip; stale lifts check it before removing the class.
  const planCopied = useRef(false);
  const dismissedRef = useRef<{ id: string; reason: string }[]>([]);
  const wakeBase = useRef<{ ledger: LedgerState; advice: ReturnType<typeof advicePrints>; goals: ReturnType<typeof readStoredGoals>; key: string } | null>(null);
  const wakeTimer = useRef(0);
  // Awake log / dismissals belong to the mode this provider mounted in (sample keys are namespaced;
  // this also stops a timer from one mode writing after the switch, before the tree remounts).
  const wakeMode = useRef(sampleOn());
  const wakeQuiet = useRef<boolean | null>(null); // first wake after a mode switch is not logged
  if (wakeQuiet.current === null) wakeQuiet.current = takeSwitchRemount();
  const dayRef = useRef("");
  const [confirmState, setConfirm] = useState<ConfirmOpts | null>(null);
  const [depth, setDepth] = useState(1);
  const [ui, setUiState] = useState<UiState>(() => {
    const d = now();
    const base: UiState = {
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
      manual: null,
      vault: null,
      spot: 0,
    };
    // 1.3.180 (el lugar): el piso se desmonta detrás del bloqueo y se reconstruye en cada
    // desbloqueo, recarga o arranque en frío — el aterrizaje es donde el dueño lo dejó,
    // leído de SU clave en la capa del aparato (navplace.ts). Sin lugar guardado (primera
    // vez, otro dueño, salida explícita), el objeto de arriba queda byte a byte igual.
    // Solo página + mes + pestaña de Bóveda: hojas, editores y borradores nunca vuelven.
    const place = readPlace(browserPackStorage(), userId);
    if (place) {
      base.section = place.section;
      base.year = place.year;
      base.month = place.month;
      base.vault = place.vault;
    }
    return base;
  });
  // El lugar se escribe al navegar: cada cambio de página, mes o pestaña de Bóveda queda
  // guardado bajo la clave del dueño en el acto (la restauración de «atrás» también: él
  // ESTÁ ahí). Es capa del aparato — nunca pasa por commit/undo ni sincroniza como libro.
  useEffect(() => {
    writePlace(browserPackStorage(), userId, { section: ui.section, year: ui.year, month: ui.month, vault: ui.vault });
  }, [ui.section, ui.year, ui.month, ui.vault, userId]);
  const amountRef = useRef<((n: number) => void) | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const syncing = useRef(false);
  sessionRef.current = session;

  const places = useRef<Place[]>([]);
  /** Before the view changes, write down where the current place is scrolled to. */
  const snap = useCallback(() => {
    const top = places.current[places.current.length - 1];
    if (top) top.y = readY();
  }, []);
  const setUi = useCallback((patch: Partial<UiState>) => {
    if (PLACE_KEYS.some((k) => k in patch)) snap();
    setUiState((u) => ({ ...u, ...patch }));
  }, [snap]);

  const applying = useRef(false);
  const confirmRef = useRef(confirmState);
  const uiRef = useRef(ui);
  confirmRef.current = confirmState;
  uiRef.current = ui;

  // 1.3.164: Back at the root asks «¿Salir de Faro?» before leaving — in the browser and in the
  // Android shell alike (the shell's FaroBack lands here through the same popstate, or through
  // the faro-root-back event when no entry was left to step to). Quedarme just closes the dialog:
  // the root branch has already re-pushed its guard entry, so the next Back asks again — it never
  // falls through and never traps. Salir lets the exit proceed exactly as it did before the
  // question existed.
  const exitOkRef = useRef(false);
  const showExitConfirm = useCallback(() => {
    if (confirmRef.current) return; // a dialog is already up — one question at a time
    const lg = sessionRef.current?.ledger.settings.lang ?? "es";
    const tr = (k: string) => translate(lg, k);
    setConfirm({
      title: tr("exit.title"),
      body: tr("exit.body"),
      yes: tr("exit.leave"),
      no: tr("exit.stay"),
      run: () => {
        const bridge = (window as Window & { FaroNative?: { exitNow?: () => void; atRoot?: (msg: string) => void } }).FaroNative;
        // The newest shell knows exitNow() and finishes at once. A shell from before it only has
        // atRoot (its press-again-to-exit): the first call arms that window, the second confirms
        // it — Salir still leaves, by the shell's own rule, until the shell update lands.
        if (bridge?.exitNow) { try { bridge.exitNow(); return; } catch { /* fall through */ } }
        if (bridge?.atRoot) { try { bridge.atRoot(tr("exit.again")); bridge.atRoot(tr("exit.again")); return; } catch { /* fall through */ } }
        // Browser / PWA: consume the guard and step off the app's history for real.
        exitOkRef.current = true;
        history.back();
      },
    });
  }, []);
  const showExitConfirmRef = useRef(showExitConfirm);
  showExitConfirmRef.current = showExitConfirm;

  useEffect(() => {
    const place: Place = {
      section: ui.section,
      year: ui.year,
      month: ui.month,
      help: ui.help,
      instruments: ui.instruments,
      draft: ui.draft,
      editing: ui.editing,
      manual: ui.manual,
      vault: ui.vault,
      spot: ui.spot,
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
    if (last && samePlace(last, place)) return;
    places.current.push(place);
    history.pushState({ faro: places.current.length, overlay: place.instruments ? "instruments" : place.help ? "help" : place.manual !== null ? "manual" : "" }, "");
    setDepth(places.current.length);
  }, [ui.section, ui.year, ui.month, ui.help, ui.instruments, ui.draft, ui.editing, ui.manual, ui.vault, ui.spot]);

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
          manual: live.manual,
          vault: live.vault,
          spot: live.spot,
        });
      }
      // Back to the place under the overlay: it may be another screen or the manual ("Ir allí" → Cambio → back).
      const under = places.current[places.current.length - 1]!;
      setUiState((u) => ({ ...u, section: under.section, year: under.year, month: under.month, manual: under.manual, vault: under.vault, spot: under.spot, instruments: false, help: false, calcOpen: false }));
      history.pushState({ faro: places.current.length }, "");
      setDepth(places.current.length);
    };
    let restoring = 0;
    const stopRestore = () => { restoring = 0; };
    /** Bring a place's scroll back, holding it while late content settles; the user scrolling cancels. */
    const restore = (y: number) => {
      const token = ++restoring;
      const until = Date.now() + 2500;
      const tick = () => {
        if (token !== restoring) return;
        writeY(y);
        const settled = Math.abs(readY() - y) < 2;
        if (settled && Date.now() > until - 1900) { restoring = 0; return; }
        if (Date.now() < until) requestAnimationFrame(tick);
        else restoring = 0;
      };
      requestAnimationFrame(tick);
    };
    window.addEventListener("wheel", stopRestore, { passive: true });
    window.addEventListener("touchstart", stopRestore, { passive: true });
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
      // Stepping off the manual (or between its entries): the back is the manual's. A screen under it (Cobros and its
      // forms, a lens, a sheet) never sees it, so it stays exactly as it was when the manual opened over it.
      const onManual = places.current.length > 1 && places.current[places.current.length - 1]!.manual !== null;
      const ev = new CustomEvent("faro-back", { cancelable: true });
      if (!onManual && !window.dispatchEvent(ev)) {
        history.pushState({ faro: places.current.length }, "");
        return;
      }
      if (places.current.length > 1) {
        const left = places.current.pop()!;
        const prev = places.current[places.current.length - 1];
        if (prev) {
          applying.current = true;
          const { y, ...fields } = prev;
          setUiState((u) => ({ ...u, ...fields, query: "", highlight: "" }));
          const moved = SCREEN_KEYS.some((k) => left[k] !== prev[k]) || (left.manual !== null && prev.manual === null);
          if (moved && typeof y === "number" && prev.manual === null) restore(y);
        }
        setDepth(places.current.length);
        return;
      }
      // 1.3.164: the root. The one step Salir itself authorized falls off the app's history
      // without re-arming and without asking again — the exit proceeds.
      if (exitOkRef.current) { exitOkRef.current = false; return; }
      history.pushState({ faro: 1 }, "");
      // Nothing was left to close: Back at the root asks before leaving. The guard entry just
      // pushed keeps the question armed — Quedarme closes the dialog and the next Back asks again.
      showExitConfirmRef.current();
    };
    window.addEventListener("popstate", onPop);
    // The Android shell's FaroBack found no entry to step to (the true first entry): same question.
    const onRootBack = () => showExitConfirmRef.current();
    window.addEventListener("faro-root-back", onRootBack);
    const live = window as Window & { __faroProviderLive?: number };
    live.__faroProviderLive = (live.__faroProviderLive ?? 0) + 1;
    return () => {
      live.__faroProviderLive = Math.max(0, (live.__faroProviderLive ?? 1) - 1);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("faro-root-back", onRootBack);
      window.removeEventListener("wheel", stopRestore);
      window.removeEventListener("touchstart", stopRestore);
    };
  }, []);

  useEffect(() => {
    let bootLang: Lang = "es";
    try {
      const saved = readPack(userId);
      const corruptAside = saved ? false : quarantineCorruptPack(userId);
      const lang = localStorage.getItem("faro-lang") === "en" ? "en" : "es";
      bootLang = lang;
      const stored = localStorage.getItem("faro-theme");
      const daySet = localStorage.getItem("faro-day") === "1";
      const known = (value: string | null): value is ThemeId => !!value && THEME_IDS.includes(value as ThemeId);
      const theme: ThemeId = daySet && known(stored) ? stored : "claro";
      let ledger = saved?.ledger ?? createInitial(lang, theme);
      let dirty = saved?.dirty ?? false;
      // Sample mode wears the personal look (theme, language) without ever writing personal books.
      if (sampleOn() && saved) ledger = { ...ledger, settings: { ...ledger.settings, lang, ...(daySet && known(stored) ? { theme: stored } : {}) } };
      const seeded = seedLedger(ledger);
      ledger = seeded.ledger;
      if (seeded.added) dirty = true;
      if (ledger.settings.theme === "ion") {
        ledger = { ...ledger, settings: { ...ledger.settings, theme: "ion-noche" }, revision: ledger.revision + 1, updatedAt: new Date().toISOString() };
        dirty = true;
      }
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
      baseRevRef.current = saved ? ledger.revision : null; // C2: el sello con el que esta pestaña cargó
      setSession(blankSession(ledger, dirty));
      if (corruptAside) setUi({ notice: translate(lang, "pack.corrupt") });
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const currentEmpty = (ledger.months[currentKey]?.lines.length ?? 0) === 0;
      const hasDemo = (ledger.months["2026-08"]?.lines ?? []).some((line) => line.id.startsWith("demo-ago-"));
      if (seeded.sample || (currentEmpty && hasDemo)) setUi({ year: 2026, month: 8, section: "desk" });
      setHasConflict(Boolean(localStorage.getItem(conflictKey(userId)) || localStorage.getItem(tabConflictKey(userId))));
    } catch {
      // 1.3.166: el pack existía pero el arranque falló — se aparta SIEMPRE (force), aunque
      // validara: un fallo de motor no debe costar el libro. La preservación gana el empate.
      if (quarantineCorruptPack(userId, true)) setUi({ notice: translate(bootLang, "pack.corrupt") });
      setSession(blankSession(createInitial("es", "claro"), false));
    } finally {
      setReady(true);
    }
  }, [userId]);

  /** C2 (1.3.166): adopta el libro guardado — esta pestaña se pone al día antes de seguir editando. */
  function adoptStoredPack() {
    const stored = readPack(userId);
    if (!stored) {
      // El pack guardado no valida en profundidad: se aparta y esta pestaña deja de escribir
      // hasta que el usuario resuelva (restaurar una copia o recargar). Nunca se pisa.
      quarantineCorruptPack(userId, true);
      tabBlockedRef.current = true;
      return;
    }
    baseRevRef.current = stored.ledger.revision;
    tabAdoptRevRef.current = stored.ledger.revision;
    setSession(blankSession(stored.ledger, stored.dirty));
  }

  /**
   * C2 (1.3.166): el libro se movió en otra pestaña y ESTA tiene trabajo propio sin guardar.
   * Comportamiento honesto mínimo: el trabajo se aparta a la puerta de conflicto existente
   * (faro.conflict.<uid> si está libre; si no, faro.conflict.<uid>.tab — Ajustes → Copias lo
   * ofrece desde el mismo botón), el aviso persistente lo dice, y la pestaña adopta el libro
   * vigente. Nada se pierde en silencio y nada pisa el libro nuevo.
   */
  function surfaceTabConflict() {
    const cur = sessionRef.current;
    try {
      if (cur) {
        const mine = JSON.stringify(cur.ledger);
        if (!localStorage.getItem(conflictKey(userId))) localStorage.setItem(conflictKey(userId), mine);
        else localStorage.setItem(tabConflictKey(userId), mine);
        setHasConflict(true);
      }
    } catch { /* el aviso sigue en pie aunque el apartado falle */ }
    setTabBanner(true);
    adoptStoredPack();
  }

  useEffect(() => {
    if (!session) return;
    const seeded = seedLedger(session.ledger);
    if (seeded.added) {
      setSession(blankSession(seeded.ledger, true));
      if (seeded.sample) setUi({ year: 2026, month: 8, section: "desk" });
      return;
    }
    // Oleada 2 del corazón (1.3.166, C2): antes de escribir, esta pestaña comprueba que el
    // libro no se haya movido en otra pestaña/ventana. Con el veredicto "write" el camino es
    // EXACTAMENTE el de siempre (incluido el banner de fallo de escritura, intacto).
    if (tabBlockedRef.current) return;
    let storedRaw: string | null = null;
    try { storedRaw = localStorage.getItem(packKey(userId)); } catch { storedRaw = null; }
    if (storedRaw && baseRevRef.current !== null && storedRevision(storedRaw) === null) {
      surfaceTabConflict(); // el pack guardado ya no se puede leer: jamás se pisa a ciegas
      return;
    }
    const verdict = tabVerdict(storedRevision(storedRaw), baseRevRef.current, session.ledger.revision, session.dirty);
    if (verdict === "surface") { surfaceTabConflict(); return; }
    if (verdict === "adopt") { adoptStoredPack(); return; }
    // 1.3.146: a failed write (full storage) must not pass as saved — the shell shows a banner until a write lands.
    try {
      localStorage.setItem(packKey(userId), JSON.stringify({ ledger: session.ledger, dirty: session.dirty }));
      baseRevRef.current = session.ledger.revision;
      if (tabAdoptRevRef.current !== null && session.ledger.revision > tabAdoptRevRef.current) setTabBanner(false);
      if (persistFailedRef.current) { persistFailedRef.current = false; setPersistFailed(false); }
    } catch {
      if (!persistFailedRef.current) { persistFailedRef.current = true; setPersistFailed(true); }
    }
    const shown = session.ledger.settings.theme === "ion" ? "ion-noche" : session.ledger.settings.theme;
    document.documentElement.dataset.theme = shown;
    if (shown === "tron" && !document.getElementById("tron-fonts")) {
      const l = document.createElement("link");
      l.id = "tron-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Exo+2:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
    document.documentElement.lang = session.ledger.settings.lang;
    localStorage.setItem("faro-theme", shown);
    localStorage.setItem("faro-lang", session.ledger.settings.lang);
    const chrome = chromeForTheme(shown);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", chrome);
  }, [session, userId]);

  // C2 (1.3.166): el evento storage avisa en vivo — otra pestaña guardó. Si esta está limpia,
  // adopta en silencio; si tiene trabajo propio, lo aparta y avisa (nunca pisa, nunca pierde).
  useEffect(() => {
    if (!ready) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== packKey(userId) || tabBlockedRef.current) return;
      const storedRev = storedRevision(e.newValue);
      const base = baseRevRef.current;
      if (storedRev === null || base === null || storedRev <= base) return;
      const cur = sessionRef.current;
      if (!cur) return;
      if (!cur.dirty && cur.ledger.revision === base) adoptStoredPack();
      else surfaceTabConflict();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);

  // C4 (1.3.166): la lista de cuarentena que Ajustes muestra (se refresca al quedar listo).
  useEffect(() => {
    if (!ready) return;
    try { setQuarantined(listQuarantine(browserPackStorage(), userId)); } catch { /* la lista es informativa */ }
  }, [ready, userId]);

  // 1.3.159: lift fr-flip only AFTER the swapped tree has committed — two frames counted from
  // this layout effect (post-commit, pre-paint), so the first painted frame of the new theme is
  // always inside the kill window, however long reconciliation took. A generation guard keeps a
  // stale lift from dropping a newer flip's class; the timer is only a net for a hidden tab,
  // where rAF may never fire and nothing is on screen anyway.
  const shownTheme = session?.ledger.settings.theme === "ion" ? "ion-noche" : session?.ledger.settings.theme;
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("fr-flip")) return;
    const gen = flipGen.current;
    let raf = 0;
    const lift = () => { if (flipGen.current === gen) root.classList.remove("fr-flip"); };
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(lift); });
    const timer = window.setTimeout(lift, 700);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(timer); };
  }, [shownTheme]);

  const applyRemote = useCallback((row: RemoteRow, dirtyLocal: LedgerState | null) => {
    try {
      const parsed = JSON.parse(row.dataJson) as unknown;
      if (!isLedgerDeep(parsed)) return false;
      const seeded = seedLedger(parsed);
      if (dirtyLocal) {
        localStorage.setItem(conflictKey(userId), JSON.stringify(dirtyLocal));
        setHasConflict(true);
        setSync("conflict");
      }
      baseRevRef.current = seeded.ledger.revision; // C2: la base de esta pestaña pasa a ser el libro aplicado
      setSession(blankSession(seeded.ledger, Boolean(dirtyLocal) || seeded.added));
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const backingUp = useRef(false);
  const runBackup = useCallback(async (force = false) => {
    const led = sessionRef.current?.ledger;
    if (!led || backingUp.current || sampleOn()) return;
    backingUp.current = true;
    try {
      const online = typeof navigator === "undefined" || navigator.onLine !== false;
      // 1.3.168 (la puerta): cada copia lleva la capa del aparato como sección hermana.
      // 1.3.169: y el Archivo de Debo en la suya (duefile.ts), por la misma vía.
      const done = await autoBackup(userId, led, { online, force, device: snapshotDeviceLayer(browserPackStorage(), userId), dueFile: snapshotDueFile(browserPackStorage()) });
      if (done.device || done.cloud || force || backups.length === 0) setBackups(await listBackups(userId));
      if (force) {
        // The notice names what actually landed, from the real flags — never "saved here" when the device write failed.
        const key = done.device && done.cloud ? "backup.done.both" : done.device ? "backup.done.device" : done.cloud ? "backup.done.cloud" : "backup.done.fail";
        setUi({ notice: translate(sessionRef.current?.ledger.settings.lang ?? "es", key) });
      }
    } catch { /* keep going */ } finally { backingUp.current = false; }
  }, [userId, backups.length, setUi]);

  const syncNow = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || syncing.current) return;
    if (!CLOUD_READY || sampleOn()) {
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
      // 1.3.166: la decisión vive en syncdecide — manda el sello de revisión; el reloj de pared
      // (updatedAt) ya NO desempata. A igual revisión y local limpio se queda el incumbente
      // ("saved"), donde antes el reloj aplicaba el remoto en silencio (C7/W5).
      const action = syncDecision(remote, { revision: local.ledger.revision, dirty: local.dirty });
      if (action === "apply-remote" && remote) {
        applyRemote(remote, local.dirty ? local.ledger : null);
        if (!local.dirty) setSync("saved");
        return;
      }
      if (action === "saved") { setSync("saved"); return; }
      if (action === "local") { setSync("local"); return; }
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
    } catch {
      setSync(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
    } finally {
      syncing.current = false;
    }
  }, [applyRemote]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => void syncNow(), 400);
    const firstCopy = window.setTimeout(() => void runBackup(), 6000);
    const copyPoll = window.setInterval(() => void runBackup(), 15 * 60_000);
    const poll = window.setInterval(() => void syncNow(), 12000);
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        void syncNow();
        void runBackup();
        void (async () => {
          if (sampleOn()) return;
          const handle = await loadHandle();
          const led = sessionRef.current?.ledger;
          if (!handle || !led) return;
          const withPerm = handle as FileSystemDirectoryHandle & {
            queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
          };
          const q = withPerm.queryPermission ? await withPerm.queryPermission({ mode: "readwrite" }) : "prompt";
          if (q !== "granted") return;
          const file = await handle.getFileHandle(`Faro_Backup_${todayIso(new Date(led.updatedAt))}.json.gz`, { create: true });
          const writable = await file.createWritable();
          await writable.write((await backupBlob(led, snapshotDeviceLayer(browserPackStorage(), userId), snapshotDueFile(browserPackStorage()))) as BlobPart);
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
      window.clearTimeout(firstCopy);
      window.clearInterval(copyPoll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
      window.removeEventListener("beforeunload", onVis);
    };
  }, [ready, syncNow, runBackup]);

  useEffect(() => {
    if (!session?.dirty) return;
    const timer = window.setTimeout(() => void syncNow(), 800);
    return () => window.clearTimeout(timer);
  }, [session?.dirty, session?.ledger.revision, syncNow]);

  const commit = useCallback((recipe: (s: LedgerState) => LedgerState, detail: string | (() => string)) => {
    setSession((s) => (s ? commitSession(s, recipe, detail) : s));
  }, []);
  const undo = useCallback(() => setSession((s) => (s ? undoSession(s) : s)), []);
  const redo = useCallback(() => setSession((s) => (s ? redoSession(s) : s)), []);

  const lang: Lang = session?.ledger.settings.lang ?? "es";
  const t = useCallback((key: string) => translate(lang, key), [lang]);
  const key = toKey(ui.year, ui.month);
  const names = useMemo(() => (session ? makeNamer(session.ledger.structure, lang) : makeNamer(createInitial().structure, lang)), [session, lang]);
  const lines = session ? monthLines(session.ledger, key) : [];
  // 1.3.117: the month's figures are computed once per ledger/month/language (not on every tap), and the heavy readings
  // (Estudio's numbers, the Asesor's advice and budget, the category slices) only when a screen asks for them, so
  // opening Faro and its cards never waits on them.
  const ledgerNow = session?.ledger ?? null;
  const summary = useMemo(() => (ledgerNow ? summarize(ledgerNow, key, lang) : null), [ledgerNow, key, lang]);
  const lazy = useMemo(() => {
    let i: ReturnType<typeof buildInsights> | null = null;
    let a: ReturnType<typeof buildAdvice> | null = null;
    let b: ReturnType<typeof buildBudget> | null | undefined;
    let sl: ReturnType<typeof categorySlices> | null = null;
    return {
      insights: () => (i ??= ledgerNow ? buildInsights(ledgerNow, key, lang, names) : []),
      advice: () => (a ??= ledgerNow ? buildAdvice(ledgerNow, key, lang, names) : []),
      budget: () => (b === undefined ? (b = ledgerNow ? buildBudget(ledgerNow, key, lang, names) : null) : b),
      slices: () => (sl ??= ledgerNow ? categorySlices(ledgerNow, key, names, lang) : []),
    };
  }, [ledgerNow, key, lang, names]);
  const hits = session && ui.query.trim().length >= 2 ? searchLedger(session.ledger, ui.query, lang, names) : [];
  const liveWake = useRef({ ledger: session?.ledger ?? null, advice: lazy.advice, key, lang, names, awakeOn });
  liveWake.current = { ledger: session?.ledger ?? null, advice: lazy.advice, key, lang, names, awakeOn };

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

  // 1.3.163 (audit W3): a slow clock for the tab left open AND visible across midnight — it
  // re-derives "today" through the same goalTick ping the visibility return uses (the wake
  // effect below does the re-deriving, month follow included), never a parallel mechanism.
  // It pings only when the local day actually moved since the last derivation.
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dayRef.current && dayRef.current !== t) setGoalTick((n) => n + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const cur = liveWake.current;
    if (!cur.ledger) return;
    const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    const prevDay = dayRef.current;
    const dayChanged = prevDay !== "" && prevDay !== today;
    // 1.3.163 (audit W3): the calendar rolled while the app stayed open. When the user is simply
    // looking at "this month" — the month that was current when state was last derived — the
    // view follows the calendar into the new month. A month the user deliberately navigated to
    // is never yanked away (their month no longer equals the derived one).
    if (dayChanged && prevDay.slice(0, 7) !== today.slice(0, 7)) {
      const u = uiRef.current;
      if (`${u.year}-${String(u.month).padStart(2, "0")}` === prevDay.slice(0, 7)) {
        setUi({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
      }
    }
    dayRef.current = today;
    window.clearTimeout(wakeTimer.current);
    wakeTimer.current = window.setTimeout(() => {
      const now = liveWake.current;
      if (!now.ledger || sampleOn() !== wakeMode.current) return;
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
          adviceAfter: advicePrints(now.advice()),
          planCopied: planCopied.current,
          dismissed: dismissedRef.current,
          enabled: true,
          opened,
        });
        wakeBase.current = { ledger: now.ledger, advice: advicePrints(now.advice()), goals, key: now.key };
        setWakeView(result);
        if (result.stalePlan) setPlanStale(true);
        const quiet = wakeQuiet.current;
        wakeQuiet.current = false;
        if (result.log.event !== "sin-cambio" && !quiet) {
          setWakeLog((prev) => {
            const next = [result.log, ...prev].slice(0, 40);
            try { if (sampleOn() === wakeMode.current) localStorage.setItem("faro-awake-log", JSON.stringify(next)); } catch { /* ignore */ }
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
          try { if (sampleOn() === wakeMode.current) localStorage.setItem("faro-awake-log", JSON.stringify(next)); } catch { /* ignore */ }
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
    try { if (sampleOn() === wakeMode.current) localStorage.setItem("faro-awake-dismiss", JSON.stringify(next)); } catch { /* ignore */ }
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
    snap();
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
  }, [snap]);
  const goMonth = useCallback((delta: number) => {
    snap();
    setUiState((u) => {
      const n = shiftMonth(u.year, u.month, delta);
      return { ...u, ...n, draft: null, editing: null };
    });
  }, [snap]);
  const goToday = useCallback(() => {
    snap();
    const n = new Date();
    setUiState((u) => ({ ...u, year: n.getFullYear(), month: n.getMonth() + 1, draft: null, editing: null }));
  }, [snap]);
  const setMonth = useCallback((year: number, month: number) => {
    snap();
    setUiState((u) => ({ ...u, year, month, draft: null, editing: null }));
  }, [snap]);

  const openManual = useCallback((id = "") => {
    snap();
    setUiState((u) => ({ ...u, manual: id, calcOpen: false }));
  }, [snap]);
  const markSpot = useCallback(() => {
    snap();
    setUiState((u) => ({ ...u, spot: u.spot + 1 }));
  }, [snap]);
  const goTopic = useCallback((id: string, go: GoLike, from?: string) => {
    const live = uiRef.current;
    const top = places.current[places.current.length - 1];
    // Reading an entry in the manual: back from the app lands on that entry, not where the manual was opened.
    if (from && top && live.manual !== null && top.manual !== from) {
      top.manual = from;
      setUiState((u) => ({ ...u, manual: from }));
    }
    // Estudio's "Lo que me deben" card only exists once someone owes you. With nobody yet, land where they are added
    // (Cobros → Me deben) instead of glowing the Estudio tab as a stand-in.
    if (go.fold === "owed") {
      let none = true;
      none = lentOf(sessionRef.current?.ledger).length === 0;
      if (none) go = { screen: "cobros", anchor: "cobros-in" };
    }
    const res = screenPatch(go);
    // Wide screens show Cambio as a side panel, not the phone sheet.
    if (go.screen === "tools" && window.innerWidth >= 1100) {
      delete res.patch.instruments;
      res.open.unshift("money-aside");
    }
    const { patch, open } = res;
    requestFocus({ topic: id, anchor: go.anchor, fold: open.join(" ") || undefined, lens: go.lens });
    snap();
    setUiState((u) => {
      const next = { ...u, ...patch, draft: null, editing: null, calcOpen: false, query: "", highlight: "" };
      const same = PLACE_KEYS.every((k) => next[k] === u[k]);
      // Already there: still make it a step, so back returns to the spot you jumped from.
      return same ? { ...next, spot: u.spot + 1 } : next;
    });
    window.setTimeout(() => window.dispatchEvent(new Event("faro-focus")), 40);
  }, [snap]);

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
          // Opened by "Ir allí" from the manual: Esc walks back to the manual, the same path as phone back.
          const under = places.current[places.current.length - 2];
          const top = places.current[places.current.length - 1];
          if ((top?.instruments || top?.help) && under && under.manual !== ui.manual) history.back();
          else setUi({ instruments: false, help: false, calcOpen: false });
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
        const onManual = places.current.length > 1 && places.current[places.current.length - 1]!.manual !== null;
        if (!onManual && !window.dispatchEvent(back)) return;
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
    const stamp = todayIso();
    void backupBlob(session.ledger, snapshotDeviceLayer(browserPackStorage(), userId), snapshotDueFile(browserPackStorage())).then((bytes) => {
      const gz = bytes[0] === 0x1f && bytes[1] === 0x8b;
      download(`Faro_${sampleOn() ? "Ejemplo" : "Backup"}_${stamp}.json${gz ? ".gz" : ""}`, bytes, gz ? "application/gzip" : "application/json");
    });
  }

  function askRestore(text: string, title: string, stampIso?: string) {
    const parsed = JSON.parse(text) as { ledger?: unknown; v?: unknown; exportedAt?: unknown };
    const ledger = isLedger(parsed) ? parsed : parsed.ledger;
    // 1.3.168 (la puerta): la sección `device` del respaldo (la capa del aparato). Ausente en
    // respaldos viejos → null → la capa queda intacta. Dañada → null: jamás bloquea el libro.
    const device = deviceSectionOf(parsed);
    // 1.3.169: la sección `dueFile` (el Archivo de Debo). La misma regla: ausente o dañada →
    // null → el Archivo de este aparato queda intacto; presente → reemplaza entero.
    const dueFile = dueFileSectionOf(parsed);
    // 1.3.166 (C1): la puerta de restauración también valida en profundidad — una copia con
    // corrupción de campo se rechaza como «dañada» en vez de entrar y explotar al arrancar.
    if (!isLedgerDeep(ledger)) { setUi({ notice: t("backup.bad") }); return; }
    // 1.3.163 (audit C6): the door says what it is about to restore BEFORE anything is replaced —
    // the copy's format version and its date, read from the backup wrapper itself (vault.ts writes
    // { app, v, exportedAt, ledger }). A version this Faro does not know is refused outright (a
    // v=99 copy used to restore in silence); a copy with no recorded date is named as such,
    // honestly — a date is never invented for it. The safety copy below is untouched.
    const wrapped = !isLedger(parsed);
    if (wrapped && parsed.v !== undefined && parsed.v !== 1) { setUi({ notice: t("backup.versionBad") }); return; }
    const stamp = wrapped && typeof parsed.exportedAt === "string" && !Number.isNaN(Date.parse(parsed.exportedAt))
      ? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { dateStyle: "long" }).format(new Date(parsed.exportedAt))
      : stampIso && !Number.isNaN(Date.parse(stampIso))
        ? new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { dateStyle: "long" }).format(new Date(stampIso))
        : null;
    const info = stamp ? t("backup.restore.from").replace("{date}", stamp) : t("backup.restore.nodate");
    setConfirm({
      title,
      body: `${t("backup.restore.body")} ${info}`,
      danger: true,
      yes: t("backup.restore.yes"),
      run: () => {
        const apply = () => {
          const updatedAt = new Date().toISOString();
          const restoredRev = (sessionRef.current?.ledger.revision ?? 1) + 1;
          baseRevRef.current = restoredRev; // C2: la base pasa a ser el libro restaurado
          tabBlockedRef.current = false;
          setSession(blankSession({ ...ledger, revision: restoredRev, updatedAt }, true));
          // 1.3.168: la capa del respaldo entra con el libro (solo-poner, solo claves de la
          // lista); la puerta de conflicto refleja la copia que la capa haya traído.
          if (device) {
            applyDeviceLayer(browserPackStorage(), device);
            setHasConflict(Boolean(localStorage.getItem(conflictKey(userId)) || localStorage.getItem(tabConflictKey(userId))));
          }
          // 1.3.169: el Archivo del respaldo aterriza en su clave global, junto a la capa —
          // solo si la sección vino (la regla de la sección ausente protege el de este aparato).
          if (dueFile) applyDueFile(browserPackStorage(), dueFile);
        };
        const cur = sessionRef.current?.ledger;
        if (!cur) { apply(); return; }
        void autoBackup(userId, cur, { online: false, safety: true, device: snapshotDeviceLayer(browserPackStorage(), userId), dueFile: snapshotDueFile(browserPackStorage()) }).catch(() => undefined).finally(apply);
      },
    });
  }

  const value: Api = {
    userId,
    ready,
    session,
    ui,
    setUi,
    sync,
    hasConflict,
    quarantined,
    restoreQuarantine: (ts) => {
      const raw = readQuarantine(browserPackStorage(), userId, ts);
      if (!raw || !packLedgerOk(raw)) return; // una copia dañada no se restaura: la UI ni la ofrece
      // Por la misma puerta que una copia de la bóveda: confirmación con fecha y copia de
      // seguridad automática del libro actual (askRestore). La fecha es la de la copia apartada.
      askRestore(raw, t("backup.restore.title"), new Date(ts).toISOString());
    },
    tabConflict: tabBanner,
    dismissTabConflict: () => setTabBanner(false),
    t,
    lang,
    monthLabel: `${monthName(lang, ui.month)} ${ui.year}`,
    key,
    lines,
    names,
    summary,
    get insights() { return lazy.insights(); },
    get advice() { return lazy.advice(); },
    get budget() { return lazy.budget(); },
    get slices() { return lazy.slices(); },
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
      void file.arrayBuffer().then((buf) => gunzip(new Uint8Array(buf))).then((text) => askRestore(text, t("settings.import"))).catch(() => setUi({ notice: t("backup.bad") }));
    },
    backups,
    backupNow: () => { void runBackup(true); },
    restoreBackup: (info) => {
      void readBackup(userId, info).then((text) => { if (text) askRestore(text, t("backup.restore.title")); else setUi({ notice: t("backup.bad") }); }).catch(() => setUi({ notice: t("backup.bad") }));
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
      // 1.3.166 (C2): la copia de la pestaña (.tab) entra por la misma puerta cuando la
      // principal está libre; al restaurarla, el libro vigente pasa a ser la copia ofrecida.
      const fromTab = !localStorage.getItem(conflictKey(userId));
      const raw = localStorage.getItem(conflictKey(userId)) ?? localStorage.getItem(tabConflictKey(userId));
      if (!raw) return;
      const ledger = JSON.parse(raw) as unknown;
      if (!isLedgerDeep(ledger)) return;
      setConfirm({
        title: t("settings.conflict"),
        body: t("delete.warn"),
        danger: true,
        yes: t("yes"),
        run: () => {
          const updatedAt = new Date().toISOString();
          const restoredRev = (session?.ledger.revision ?? ledger.revision) + 1;
          baseRevRef.current = restoredRev;
          tabBlockedRef.current = false;
          setSession(blankSession({ ...ledger, revision: restoredRev, updatedAt }, true));
          if (fromTab) {
            localStorage.removeItem(tabConflictKey(userId));
            const other = readPack(userId)?.ledger;
            if (other) localStorage.setItem(conflictKey(userId), JSON.stringify(other));
          } else {
            localStorage.removeItem(conflictKey(userId));
          }
          setHasConflict(Boolean(localStorage.getItem(conflictKey(userId))));
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
    persistFailed,
    depth,
    backName: () => {
      const under = places.current[places.current.length - 2];
      return under ? placeName(under, lang) : placeName({ section: "settings" }, lang);
    },
    openManual,
    goTopic,
    markSpot,
  };

  // Apply the theme during render, before children paint, so colour maths (isTron, tints) and CSS flip in the same frame.
  // 1.3.159: THE FLIP NECK — everything a flip needs happens in this one task: fr-flip goes on (it kills
  // every colour transition), the theme attribute swaps, the meta bar colour is written HERE (not in a
  // post-commit effect), and a forced reflow makes the kill live before a single child renders. The
  // class comes off only in the post-commit layout effect above — never on a fuse counted from render,
  // which a slow phone could burn before the new theme ever painted (Oscar's two-speed flip).
  if (session && typeof document !== "undefined") {
    const shownNow = session.ledger.settings.theme === "ion" ? "ion-noche" : session.ledger.settings.theme;
    const root = document.documentElement;
    if (root.dataset.theme !== shownNow) {
      root.classList.add("fr-flip");
      root.dataset.theme = shownNow;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", chromeForTheme(shownNow));
      void root.offsetWidth;
      flipGen.current += 1;
    }
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {confirmState ? (
        <div className="ask-back" role="presentation" onMouseDown={() => setConfirm(null)}>
          <div className={`ask${confirmState.danger ? " is-danger" : ""}`} role="alertdialog" aria-modal="true" aria-labelledby="faro-confirm-title" aria-describedby="faro-confirm-body" onMouseDown={(e) => e.stopPropagation()}>
            <i className="ask-glow" aria-hidden />
            <span className="ask-seal" aria-hidden>
              {confirmState.danger ? (
                <svg viewBox="0 0 24 24"><path d="M12 4.2 2.8 19.5h18.4L12 4.2Z" /><path d="M12 10v4.2" /><path d="M12 17.2h.01" /></svg>
              ) : (
                <svg viewBox="0 0 32 32"><path d="M16 4.5 20.4 13H11.6L16 4.5Z" className="ask-lamp" /><rect x="14.2" y="13" width="3.6" height="10.5" rx="1" /><path d="M7.5 27h17" /></svg>
              )}
            </span>
            <h2 id="faro-confirm-title" className="ask-title">{confirmState.title}</h2>
            <p id="faro-confirm-body" className="ask-body">{confirmState.body}</p>
            <div className="ask-actions">
              <button type="button" className="ask-btn is-quiet" onClick={() => setConfirm(null)}>{confirmState.no ?? t("cancel")}</button>
              <button
                type="button"
                autoFocus
                className={`ask-btn ${confirmState.danger ? "is-danger" : "is-go"}`}
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
