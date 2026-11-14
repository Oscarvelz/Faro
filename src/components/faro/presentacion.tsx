/**
 * La Presentación Guiada — el conductor y el índice.
 *
 * El índice vive en Ajustes, junto al Manual (el manual es texto; las presentaciones,
 * movimiento): cada módulo se anuncia antes del play con su duración honesta y su
 * promesa de capacidad, y guarda su estado (visto / a medias, con «seguir donde ibas»).
 *
 * El conductor representa el guion (guion.ts) sobre el escenario sellado
 * (samplemode.ts: `faro.stage:`): la app que se ve es la app de verdad, pero su libro
 * es un escenario vacío y efímero que el guion construye y que se descarta entero al
 * salir — el libro real queda byte a byte intacto (ley suprema). Ninguna salida toca
 * el libro real: todas aterrizan por la misma puerta (`pres.stay`), y «Quedarme aquí»
 * disuelve el escenario y deja al usuario en ese mismo lugar de SU app.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Gauge, Globe, Hand, List, MessageCircle, Music, Pause, Play, Presentation, X } from "lucide-react";
import { useFaroRoot } from "./provider";
import { useFaroUser } from "@/spa/gates";
import { readPending, wasAsked } from "@/lib/faro/lockoffer";
import { browserPackStorage } from "@/lib/faro/packguard";
import { screenPatch } from "@/lib/manual/places";
import { dataMode, enterStage, exitStage, stageOn } from "@/lib/faro/samplemode";
import { STAGE_SEEDS } from "@/lib/faro/stage-seeds";
import { buildWidgetSnapshot } from "@/lib/faro/widget";
import { todayIso } from "@/lib/faro/loans";
import {
  MODULES, TOPIC_SCENES, WORDS_PER_MINUTE, chapterFirst, durationLabel, dwellMs, moduleById, overallProgress, pick, sceneCaption, scenePlace, stepMs, wordCount,
  type Module, type Scene, type Step,
} from "@/lib/faro/guion";
import "./presentacion.css";

/* El puente al Manual, al revés (ley de flota, 2026-11-14): de la escena al
 * tema exacto del Manual que la misma función ya tiene. Solo las escenas
 * cuya función VIVE en el Manual llevan el botón — y nunca dentro del
 * módulo que enseña el propio Manual (sería un bucle). */
const SCENE_TOPIC: Record<string, string> = Object.fromEntries(
  Object.entries(TOPIC_SCENES)
    .filter(([, t]) => t.moduleId !== "manual")
    .map(([topic, t]) => [t.sceneId, topic]),
);

/* ============================ estado del aparato ============================ */

const SEEN_KEY = "faro.seen.pres"; // prefijo compartido: estado de ESTE aparato, jamás del libro
const LAUNCH_KEY = "pres.launch"; // sessionStorage, fuera del namespace de datos
const STAY_KEY = "pres.stay";

type PresState = {
  modules: Record<string, { scene: number; done: boolean }>;
  speed: number;
  mode: "auto" | "interactive";
  savedScenes: string[];
  offered?: boolean;
  /* La ficha primera (ley de flota, 2026-11-14): el último módulo en uso;
   * si quedó incompleto, su ficha abre el índice. Se limpia al completarlo. */
  lastModule?: string;
};

const SPEEDS = [0.5, 0.75, 1, 1.5, 2] as const;

function readState(): PresState {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || "null") as Partial<PresState> | null;
    return {
      modules: raw?.modules ?? {},
      speed: SPEEDS.includes(raw?.speed as (typeof SPEEDS)[number]) ? (raw!.speed as number) : 1,
      mode: raw?.mode === "interactive" ? "interactive" : "auto",
      savedScenes: Array.isArray(raw?.savedScenes) ? raw!.savedScenes : [],
      offered: raw?.offered === true,
      lastModule: typeof raw?.lastModule === "string" ? raw.lastModule : undefined,
    };
  } catch {
    return { modules: {}, speed: 1, mode: "auto", savedScenes: [] };
  }
}

function writeState(next: PresState) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/** Lanza un módulo: la intención viaja en sessionStorage y el conductor, ya montado en
 * el caparazón, entra en el escenario (la app se remonta sobre el libro de escenario). */
export function launchPresentation(moduleId: string, sceneId?: string) {
  try { sessionStorage.setItem(LAUNCH_KEY, JSON.stringify({ moduleId, sceneId })); } catch { /* ignore */ }
  void enterStage();
}

/** Aterrizar EN una escena desde fuera (búsqueda, el (?) de un tema): se entra
 * por la primera escena de su capítulo, porque las escenas de un capítulo
 * dependen del estado que las anteriores dejan — como Reanudar. */
export function launchScene(moduleId: string, sceneId: string) {
  const mod = moduleById(moduleId);
  if (!mod) return;
  launchPresentation(moduleId, chapterFirst(mod, sceneId).id);
}

function takeLaunch(): { moduleId: string; sceneId?: string } | null {
  try {
    const raw = sessionStorage.getItem(LAUNCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LAUNCH_KEY);
    const parsed = JSON.parse(raw) as { moduleId?: string; sceneId?: string };
    return parsed.moduleId ? { moduleId: parsed.moduleId, sceneId: parsed.sceneId } : null;
  } catch { return null; }
}

function setStay(stay: { section: string; vault?: string | null; openPres?: boolean }) {
  try { sessionStorage.setItem(STAY_KEY, JSON.stringify(stay)); } catch { /* ignore */ }
}

function peekStay(): { section: string; vault?: string | null; openPres?: boolean } | null {
  try {
    const raw = sessionStorage.getItem(STAY_KEY);
    return raw ? (JSON.parse(raw) as { section: string; vault?: string | null; openPres?: boolean }) : null;
  } catch { return null; }
}

/* ================================== ÍNDICE ================================== */

export function PresentacionesCard() {
  const { lang } = useFaroRoot();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PresState>(() => readState());

  // Al volver de una presentación, el pliegue se abre solo y el estado se relee.
  useEffect(() => {
    if (peekStay()?.openPres) setOpen(true);
    const onFocus = () => setState(readState());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const play = (mod: Module, resume: boolean) => {
    if (stageOn()) return; // dentro de una presentación no se lanza otra
    const saved = state.modules[mod.id];
    let sceneId = mod.scenes[0]?.id;
    if (resume && saved && !saved.done) {
      // Reanudar = el PRINCIPIO del capítulo donde ibas: las escenas de un capítulo
      // dependen del estado que las anteriores dejan (un menú abierto, una vista),
      // y el capítulo es la unidad de sentada.
      const at = mod.scenes[saved.scene];
      const firstOfChapter = at ? mod.scenes.find((s) => s.chapter === at.chapter) : undefined;
      sceneId = firstOfChapter?.id ?? sceneId;
    }
    launchPresentation(mod.id, sceneId);
  };

  /* La ficha primera: el último módulo en uso, si quedó incompleto, abre la
   * lista sacado de su piso — aparece una sola vez. Al completarlo, la marca
   * se limpia (saveProgress) y la ficha vuelve sola a su sitio. */
  const lastMod = state.lastModule ? moduleById(state.lastModule) : undefined;
  const firstCard = lastMod && lastMod.ready && !state.modules[lastMod.id]?.done ? lastMod : undefined;
  const prog = overallProgress(MODULES, state.modules);

  const renderMod = (mod: Module) => {
    const saved = state.modules[mod.id];
    const mid = !!saved && !saved.done && saved.scene > 0;
    return (
      <div key={mod.id} className="pres-mod">
        <div className="pres-mod-head">
          <span className="pres-mod-n num">{mod.n}</span>
          <strong className="serif">{pick(mod.title, lang)}</strong>
          {mod.ready ? <span className="pres-mod-dur num">{durationLabel(mod, lang)}</span> : null}
          {saved?.done ? <span className="pres-mod-done"><Check aria-hidden />{L(lang, "Vista", "Seen")}</span> : null}
        </div>
        <p className="pres-mod-promise">{pick(mod.promise, lang)}</p>
        {mod.ready ? (
          <div className="pres-mod-acts">
            <button type="button" className="btn pres-play" onClick={() => play(mod, mid)}>
              {mid ? null : <Play aria-hidden />}{mid ? L(lang, "Seguir donde ibas", "Pick up where you left off") : L(lang, "Verla", "Watch it")}
            </button>
            {mid ? (
              <button type="button" className="btn ghost" onClick={() => play(mod, false)}>
                {L(lang, "Desde el principio", "From the start")}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="pres-mod-soon">{L(lang, "En preparación", "In preparation")}</p>
        )}
      </div>
    );
  };

  return (
    /* Esta tarjeta vive EN EL FLUJO de Ajustes, como sus hermanas: jamás la
     * clase `pres-card`, que es la tarjeta de la actuación (position:fixed) —
     * con ella puesta, la tarjeta se salía del flujo y se sobreponía a las
     * demás (veredicto telefónico de Oscar sobre la 1.3.277; arreglo 1.3.278). */
    <section className="card manual-card aj-card" data-anchor="aj-presentaciones">
      <div role="button" tabIndex={0} className="manual-row fold-btn aj-row" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }}>
        <Presentation aria-hidden />
        <span className="manual-row-text">
          <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Presentaciones", "Presentations")}</h2></div>
          <span className="aj-sub">{L(lang, "La app, en vivo, paso a paso", "The app, live, step by step")}</span>
        </span>
        <ChevronDown className={open ? "fold-chev is-open" : "fold-chev"} />
      </div>
      {open ? (
        <div className="pres-index">
          <div className="pres-overall">
            <div className="pres-overall-head">
              <span>{L(lang, "Tu avance en la app", "Your progress in the app")}</span>
              <strong className="num">{prog.pct}%</strong>
            </div>
            <div className="pres-overall-bar" role="progressbar" aria-label={L(lang, "Avance en la app", "Progress in the app")} aria-valuenow={prog.pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${prog.pct}%` }} />
            </div>
            <p className="pres-overall-counts">
              {prog.pct === 100
                ? L(lang, "Has estudiado la app entera.", "You have studied the whole app.")
                : L(lang, `${prog.done} de ${prog.total} módulos terminados · ${prog.inProgress} en curso · te falta el ${prog.remaining}%`, `${prog.done} of ${prog.total} modules finished · ${prog.inProgress} under way · ${prog.remaining}% to go`)}
            </p>
          </div>
          {firstCard ? (
            <div className="pres-first">
              <p className="pres-first-title">{L(lang, "Sigue donde ibas", "Pick up where you left off")}</p>
              {renderMod(firstCard)}
            </div>
          ) : null}
          {MODULES.filter((mod) => mod.id !== firstCard?.id).map(renderMod)}
          {state.savedScenes.length ? (
            <div className="pres-shelf">
              <p className="pres-shelf-title">{L(lang, "Mis escenas", "My scenes")}</p>
              {state.savedScenes.map((key) => {
                const [mid, sid] = key.split("/");
                const m = moduleById(mid ?? "");
                const sc = m?.scenes.find((s) => s.id === sid);
                if (!m || !sc) return null;
                return (
                  <div key={key} className="pres-shelf-row">
                    <button type="button" className="pres-shelf-play" onClick={() => { if (!stageOn()) launchPresentation(m.id, sc.id); }}>
                      <Play aria-hidden />
                      <span>{sceneCaption(sc, lang === "en" ? 1 : 0)}<em>{pick(m.title, lang)}</em></span>
                    </button>
                    <button type="button" className="pres-shelf-x" aria-label={L(lang, "Quitar de Mis escenas", "Remove from My scenes")}
                      onClick={() => {
                        const next = { ...readState(), savedScenes: readState().savedScenes.filter((k) => k !== key) };
                        writeState(next);
                        setState(next);
                      }}>
                      <X aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
          <p className="pres-note">
            {L(lang, "Nada de lo que veas toca tus libros: cada presentación actúa en un escenario vacío.",
              "Nothing you see touches your books: every presentation performs on an empty stage.")}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/* ================================= CONDUCTOR ================================= */

type RunState = {
  mod: Module;
  sceneIdx: number;
  stepIdx: number;
  mode: "auto" | "interactive";
  speed: number;
  playing: boolean;
  won: boolean;
  finished: boolean;
  chaptersOpen: boolean;
  speedOpen: boolean;
  skipped: string[];
  /* La pila de retorno de la pareja ‹ › (ley de flota, 2026-11-14): las
   * posiciones VIVIDAS [escena, paso] — solo compases visibles, jamás pasos
   * de maquinaria (sembrar/ir/referir). «review» = el compás se presenta sin
   * ejecutarse (al volver sobre un tap/type no se repite su acción). */
  trail: [number, number][];
  review: boolean;
  /* La ventana de «Quedarme aquí» (ley de flota, 2026-11-14): a mitad de
   * módulo, salir a quedarte pide una palabra antes de disolver el
   * escenario; mientras la ventana vive, el reloj está detenido. */
  stayAsk: boolean;
  /* La ✕ primero pregunta (ley de flota, 2026-11-14): a mitad de módulo la
   * ✕ abre su ventana de confirmación antes de salir; la tarjeta final sale
   * directa. Mientras la ventana vive, el reloj está detenido. */
  exitAsk: boolean;
  /* El puente al Manual (ley de flota, 2026-11-14): la lección se suspende
   * mientras el alumno lee el tema exacto en el Manual; al cerrarlo, la
   * lección vuelve al MISMO compás (review: se presenta, no se re-ejecuta). */
  manualTrip: boolean;
};

const anchorEl = (anchor: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-anchor="${anchor}"]`);

function waitAnchor(anchor: string, timeout = 2200): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const el = anchorEl(anchor);
      if (el) return resolve(el);
      if (performance.now() - t0 > timeout) return resolve(null);
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

/** El toque del conductor: si el ancla envuelve al control (la casa ancla a veces el
 * contenedor, como en top-view), el clic cae en el primer descendiente interactivo. */
const tapEl = (el: HTMLElement) => {
  const target = el.matches('button, a, [role="button"], input, summary, [tabindex]')
    ? el
    : (el.querySelector<HTMLElement>('button, a, [role="button"], input, summary, [tabindex]') ?? el);
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
};

/**
 * El teatro del widget: una pantalla de inicio imitada, con la CARA del widget dibujada
 * desde la misma foto que la app le pasa al widget real (buildWidgetSnapshot sobre el
 * libro de escenario). Nada de video: son los números vivos del escenario, y sus toques
 * aterrizan de verdad — el ojo oculta los montos y la cara abre Faro.
 */
function Theater({ hide, onToggleHide, onOpen }: { hide: boolean; onToggleHide: () => void; onOpen: () => void }) {
  const root = useFaroRoot();
  const { lang, fmt } = root;
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const ledger = root.session?.ledger ?? null;
  const snap = ledger ? buildWidgetSnapshot(ledger, lang === "en" ? "en" : "es", { today: todayIso(), hide, lock: false }) : null;
  const due = snap?.dues[0];
  const days = due ? Math.round((new Date(`${due.on}T12:00:00`).getTime() - new Date(`${todayIso()}T12:00:00`).getTime()) / 86_400_000) : null;
  const money = (n: number) => (hide ? "•••" : fmt(n));
  return (
    <div className="pres-theater" data-anchor="theater">
      <div className="pres-home">
        <div className="pres-dots" aria-hidden>
          <span><Camera /></span><span><MessageCircle /></span><span><Globe /></span><span><Music /></span>
        </div>
        <div className="pres-widgetwrap" data-anchor="theater-wrap">
          <button type="button" className="pres-widgetface" data-anchor="theater-open" onClick={onOpen} aria-label={L("Abrir Faro", "Open Faro")}>
            <span className="pres-wf-head"><strong className="serif">Faro</strong><span>{snap?.monthLabel ?? ""}</span></span>
            <span className="pres-wf-left"><small>{L("Queda", "Left")}</small><b className="num">{snap ? money(snap.left) : "—"}</b></span>
            <span className="pres-wf-row">
              <span><small>{L("Tengo", "I have")}</small><b className="num">{snap ? money(snap.have) : "—"}</b></span>
              <span><small>{L("Gastaré", "I'll spend")}</small><b className="num">{snap ? money(snap.spend) : "—"}</b></span>
              <span><small>{L("Pagos", "Payments")}</small><b className="num">{snap ? money(snap.pay) : "—"}</b></span>
            </span>
            <span className="pres-wf-due">
              {due
                ? `${due.name} · ${days === 0 ? L("hoy", "today") : days === 1 ? L("mañana", "tomorrow") : `${L("en", "in")} ${days} ${L("días", "days")}`}`
                : L("Nada vence cerca", "Nothing due soon")}
            </span>
          </button>
          <button type="button" className="pres-widgeteye" data-anchor="theater-hide" onClick={onToggleHide} aria-label={L("Ocultar montos", "Hide amounts")}>
            {hide ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        </div>
        <p className="pres-home-hint">{L("Tu pantalla de inicio, en escena", "Your home screen, on stage")}</p>
      </div>
    </div>
  );
}

export function Presentacion() {
  const api = useFaroRoot();
  const { lang, ui, setUi } = api;
  const [run, setRun] = useState<RunState | null>(null);
  const [saved, setSaved] = useState<string[]>(() => readState().savedScenes);
  const [rect, setRect] = useState<DOMRect | null>(null);
  /* La tarjeta nace donde va a vivir (ley de flota, 2026-11-14): el rect
   * recuerda a qué compás [escena, paso] se midió; mientras el compás
   * actual no tiene SU medida, la tarjeta permanece invisible — jamás
   * aparece primero en un sitio provisional para viajar después. */
  const [rectFor, setRectFor] = useState<{ s: number; t: number } | null>(null);
  const [shaking, setShaking] = useState(0);
  const [theater, setTheater] = useState(false);
  const [wHide, setWHide] = useState(false);
  const seededRef = useRef<Set<string>>(new Set());
  const runRef = useRef<RunState | null>(null);
  runRef.current = run;
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);
  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  /* ---- aterrizajes: fuera del escenario, esta instancia solo escucha ---- */
  useEffect(() => {
    if (stageOn()) return;
    const stay = peekStay();
    if (stay) {
      setUi({ section: stay.section as never, ...(stay.vault !== undefined ? { vault: stay.vault as never } : {}) });
      // La tarjeta del índice espía la misma llave para abrirse; se retira tras un respiro.
      const id = window.setTimeout(() => { try { sessionStorage.removeItem(STAY_KEY); } catch { /* ignore */ } }, 600);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- arranque dentro del escenario ---- */
  useEffect(() => {
    if (!stageOn()) return;
    const launch = takeLaunch();
    if (!launch) return;
    const mod = moduleById(launch.moduleId);
    if (!mod || !mod.ready) return;
    const prefs = readState();
    const savedScene = launch.sceneId
      ? Math.max(0, mod.scenes.findIndex((s) => s.id === launch.sceneId))
      : 0;
    // La ficha primera se marca desde el arranque mismo.
    writeState({ ...prefs, lastModule: mod.id });
    // El escenario amanece en Central, como la app misma.
    const { patch } = screenPatch({ screen: "desk" });
    setUi({ ...patch });
    later(() => {
      setRun({
        mod, sceneIdx: savedScene, stepIdx: 0,
        mode: prefs.mode, speed: prefs.speed,
        playing: true, won: false, finished: false, chaptersOpen: false, speedOpen: false, skipped: [],
        trail: [], review: false, stayAsk: false, exitAsk: false, manualTrip: false,
      });
    }, 650);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scene: Scene | null = run ? (run.mod.scenes[run.sceneIdx] ?? null) : null;
  const step: Step | null = run && scene ? (scene.steps[run.stepIdx] ?? null) : null;

  const saveProgress = useCallback((r: RunState, done: boolean) => {
    const prefs = readState();
    prefs.modules[r.mod.id] = { scene: r.sceneIdx, done };
    prefs.speed = r.speed;
    prefs.mode = r.mode;
    // La ficha primera: el último módulo en uso manda; al completarlo, la
    // marca se limpia y su ficha vuelve a su piso.
    if (done) { if (prefs.lastModule === r.mod.id) delete prefs.lastModule; }
    else prefs.lastModule = r.mod.id;
    writeState(prefs);
  }, []);

  const advance = useCallback(() => {
    const r = runRef.current;
    if (!r) return;
    clearTimers();
    setRect(null);
    if (r.stepIdx + 1 < (r.mod.scenes[r.sceneIdx]?.steps.length ?? 0)) {
      setRun({ ...r, stepIdx: r.stepIdx + 1, won: false, review: false });
      return;
    }
    if (r.sceneIdx + 1 < r.mod.scenes.length) {
      const next = { ...r, sceneIdx: r.sceneIdx + 1, stepIdx: 0, won: false, review: false };
      setRun(next);
      saveProgress(next, false);
      return;
    }
    const done = { ...r, finished: true, won: false };
    setRun(done);
    saveProgress(done, true);
  }, [clearTimers, saveProgress]);

  /* «‹» — un compás atrás, al lugar exacto ya vivido (la cima de la pila).
   * Cruzar de escena navega a su pantalla sin re-sembrar nada: las semillas
   * ya sembradas quedan (seededRef no se toca) y el compás destino se
   * PRESENTA (review): un tap/type no repite su acción; un gesto (do) se
   * vuelve a vivir, porque el gesto es del alumno. */
  const goBack = useCallback(() => {
    const r = runRef.current;
    if (!r || r.trail.length < 2) return;
    clearTimers();
    setRect(null);
    const trail = r.trail.slice(0, -1);
    const [s, p] = trail[trail.length - 1];
    if (s !== r.sceneIdx) {
      const place = scenePlace(r.mod, r.mod.scenes[s].id);
      const { patch, open } = screenPatch({ screen: place });
      setUi({ ...patch });
      for (const id of open) later(() => window.dispatchEvent(new CustomEvent("faro-open", { detail: id })), 350);
    }
    setRun({ ...r, sceneIdx: s, stepIdx: p, trail, review: true, won: false });
  }, [clearTimers]);

  const skipScene = useCallback((sceneId: string) => {
    const r = runRef.current;
    if (!r) return;
    clearTimers();
    setRect(null);
    const skipped = r.skipped.includes(sceneId) ? r.skipped : [...r.skipped, sceneId];
    if (r.sceneIdx + 1 < r.mod.scenes.length) {
      const next = { ...r, sceneIdx: r.sceneIdx + 1, stepIdx: 0, won: false, skipped };
      setRun(next);
      saveProgress(next, false);
    } else {
      const done = { ...r, finished: true, won: false, skipped };
      setRun(done);
      saveProgress(done, true);
    }
  }, [clearTimers, saveProgress]);

  const exitToIndex = useCallback(() => {
    const r = runRef.current;
    if (r) saveProgress(r, r.finished);
    setStay({ section: "settings", openPres: true });
    setRun(null);
    exitStage();
  }, [saveProgress]);

  const stayHere = useCallback(() => {
    const r = runRef.current;
    if (r) saveProgress(r, r.finished);
    setStay({ section: ui.section, vault: ui.vault ?? null });
    setRun(null);
    exitStage();
  }, [saveProgress, ui.section, ui.vault]);

  /* «Quedarme aquí» a mitad de módulo primero abre su ventana (la ley): el
   * escenario no se disuelve hasta que el usuario confirma sabiendo que
   * podrá seguir donde quedó. En la tarjeta final no hay ventana: el
   * módulo ya terminó y stayHere corre directo. */
  const askStay = useCallback(() => {
    const r = runRef.current;
    if (!r) return;
    if (r.finished) { stayHere(); return; }
    clearTimers();
    setRun({ ...r, stayAsk: true });
  }, [clearTimers, stayHere]);

  /* La ✕ primero pregunta (ley de flota, 2026-11-14): a mitad de módulo, la
   * ✕ — y Esc, su gemela — abren la ventana de salida antes de disolver
   * nada; en la tarjeta final la salida es directa, sin preguntar. */
  const askExit = useCallback(() => {
    const r = runRef.current;
    if (!r) return;
    if (r.finished) { exitToIndex(); return; }
    clearTimers();
    setRun({ ...r, exitAsk: true });
  }, [clearTimers, exitToIndex]);

  /* ------------------------------ el motor de pasos ------------------------------ */
  useEffect(() => {
    if (!run || !scene || !step || run.finished || run.chaptersOpen || run.speedOpen || run.stayAsk || run.exitAsk || run.manualTrip) return;
    const r = run;
    let cancelled = false;
    const speed = r.speed;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const armRect = (el: HTMLElement) => {
      const measure = () => { if (!cancelled) { setRect(el.getBoundingClientRect()); setRectFor({ s: r.sceneIdx, t: r.stepIdx }); } };
      measure();
      const iv = window.setInterval(measure, 180);
      timers.current.push(iv as unknown as number);
      window.addEventListener("resize", measure);
      const off = () => window.removeEventListener("resize", measure);
      timers.current.push(window.setTimeout(() => { window.clearInterval(iv); off(); }, 60_000) as unknown as number);
    };

    const runStep = async () => {
      if (step.kind === "seed") {
        const key = `${r.mod.id}:${r.sceneIdx}:${r.stepIdx}`;
        if (!seededRef.current.has(key)) {
          seededRef.current.add(key);
          const sow = STAGE_SEEDS[step.seed];
          if (sow) api.commit(sow, lang === "en" ? "Presentation stage" : "Escenario de la presentación");
        }
        later(() => { if (!cancelled) advance(); }, 600 / speed);
        return;
      }
      if (step.kind === "go") {
        const { patch, open } = screenPatch({ screen: step.screen });
        setUi({ ...patch });
        for (const id of open) later(() => window.dispatchEvent(new CustomEvent("faro-open", { detail: id })), 350);
        later(() => { if (!cancelled) advance(); }, stepMs(step, lang) / speed);
        return;
      }
      if (step.kind === "ref") { advance(); return; }
      const el = await waitAnchor(step.anchor);
      if (cancelled) return;
      if (!el) { skipScene(scene.id); return; } // ancla muerta: la escena se salta con gracia
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      later(() => { if (!cancelled) armRect(el); }, reduce ? 60 : 380);
      // Posición vivida: solo los compases con pie (o los gestos) entran en
      // la pila de retorno — la maquinaria quedó atrás hace rato.
      if (("caption" in step && step.caption) || step.kind === "do") {
        const sIdx = r.sceneIdx, pIdx = r.stepIdx;
        setRun((cur) => {
          if (!cur) return cur;
          const top = cur.trail[cur.trail.length - 1];
          if (top && top[0] === sIdx && top[1] === pIdx) return cur;
          return { ...cur, trail: [...cur.trail, [sIdx, pIdx] as [number, number]] };
        });
      }
      // Al volver (review), el compás se presenta — pie y foco — pero un
      // tap/type NO repite su acción; el gesto (do) sí se vuelve a vivir.
      if (r.review && step.kind !== "do") return;
      // La permanencia del paso: el pie + la lectura de la ventanita, si la hay.
      const capDwell = "caption" in step
        ? dwellMs(step.caption, lang) + (step.contexto ? Math.round((wordCount(pick(step.contexto, lang)) / WORDS_PER_MINUTE) * 60_000) : 0)
        : 0;

      if (step.kind === "tap") {
        later(() => { if (!cancelled) { tapEl(el); later(() => { if (!cancelled) advance(); }, 420 / speed); } }, 300 / speed);
        return;
      }
      if (step.kind === "type") {
        const input = el.matches("input") ? (el as HTMLInputElement) : el.querySelector<HTMLInputElement>("input");
        if (!input) { skipScene(scene.id); return; }
        const dwell = capDwell / speed;
        later(() => {
          if (cancelled) return;
          input.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          setter?.call(input, pick(step.text, lang));
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }, Math.min(600, dwell * 0.4));
        if (r.playing || r.mode === "interactive") later(() => { if (!cancelled) advance(); }, dwell + 500 / speed);
        return;
      }
      if (step.kind === "show" || step.kind === "ask") {
        if (r.mode === "auto" || step.kind === "ask") {
          if (r.playing) later(() => { if (!cancelled) advance(); }, capDwell / speed);
        }
        return;
      }
      // do: el compás interactivo
      if (r.mode === "interactive") {
        const onTap = (e: Event) => {
          if (el.contains(e.target as Node)) {
            document.removeEventListener("pointerdown", onTap, true);
            setRun((cur) => (cur ? { ...cur, won: true } : cur));
            later(() => { if (!cancelled) advance(); }, 650);
          }
        };
        document.addEventListener("pointerdown", onTap, true);
        timers.current.push(window.setTimeout(() => document.removeEventListener("pointerdown", onTap, true), 120_000) as unknown as number);
      } else if (r.playing) {
        // El gesto espera el pie ENTERO (1.3.278, veredicto de Oscar: el mapa
        // «pasa muy rápido»): antes el conductor actuaba al 55% de la
        // permanencia y el compás de gesto vivía casi la mitad de lo que el
        // índice anunciaba — el alumno veía el toque antes de acabar de leer
        // la orden. Ahora lee el pie completo, ve el gesto y su asentamiento.
        later(() => {
          if (cancelled) return;
          tapEl(el);
          setRun((cur) => (cur ? { ...cur, won: true } : cur));
          later(() => { if (!cancelled) advance(); }, 650 / speed);
        }, capDwell / speed);
      }
    };
    void runStep();
    return () => { cancelled = true; clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.sceneIdx, run?.stepIdx, run?.mode, run?.playing, run?.speed, run?.chaptersOpen, run?.speedOpen, run?.finished, run?.stayAsk, run?.exitAsk, run?.manualTrip]);

  /* ---- el teatro: vive mientras la escena lo declara; muere con la función ---- */
  const sceneWantsTheater = !!scene?.anchors.includes("theater");
  useEffect(() => {
    setTheater(sceneWantsTheater);
    if (sceneWantsTheater) setWHide(false);
  }, [sceneWantsTheater, run?.sceneIdx]);
  useEffect(() => { if (!run) setTheater(false); }, [run]);

  /* El puente al Manual (ley de flota, 2026-11-14): «Más en el manual» abre
   * el tema exacto de la función que se está enseñando y la lección espera
   * invisible; cuando el botón de atrás del Manual lo cierra, la lección
   * vuelve al MISMO compás — el lugar se restaura y el compás se presenta
   * sin re-ejecutarse (review). */
  const goManual = () => {
    const r = runRef.current;
    if (!r) return;
    const sc = r.mod.scenes[r.sceneIdx];
    const topic = sc ? SCENE_TOPIC[sc.id] : undefined;
    if (!topic) return;
    clearTimers();
    setRun({ ...r, manualTrip: true });
    api.openManual(topic);
  };

  const manualSeen = useRef(false);
  useEffect(() => {
    if (!run?.manualTrip) return;
    if (ui.manual !== null) { manualSeen.current = true; return; }
    if (!manualSeen.current) return; // el Manual aún no abre: no es una vuelta
    manualSeen.current = false;
    const r = runRef.current;
    if (!r) return;
    const sc = r.mod.scenes[r.sceneIdx];
    if (sc) {
      const { patch, open } = screenPatch({ screen: scenePlace(r.mod, sc.id) });
      setUi({ ...patch });
      for (const id of open) later(() => window.dispatchEvent(new CustomEvent("faro-open", { detail: id })), 350);
    }
    setRun({ ...r, manualTrip: false, review: true });
  }, [run?.manualTrip, ui.manual, setUi]);

  /* Esc: una capa a la vez — ventanas primero, capítulos después, y al
   * fondo la salida, que a mitad de módulo también pregunta (askExit). */
  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (runRef.current?.exitAsk) setRun((cur) => (cur ? { ...cur, exitAsk: false } : cur));
      else if (runRef.current?.stayAsk) setRun((cur) => (cur ? { ...cur, stayAsk: false } : cur));
      else if (runRef.current?.chaptersOpen) setRun((cur) => (cur ? { ...cur, chaptersOpen: false } : cur));
      else askExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, askExit]);

  if (!stageOn() || !run) return null;
  /* En el viaje al Manual la lección entera se retira: ni tarjeta, ni
   * escudos — el Manual es el único dueño de la pantalla hasta que vuelve. */
  if (run.manualTrip) return null;

  const mod = run.mod;
  const chapter = scene ? mod.chapters.find((c) => c.id === scene.chapter) : null;
  const totalScenes = mod.scenes.length;
  const caption = step && (step.kind === "show" || step.kind === "ask" || step.kind === "do" || step.kind === "type") ? pick(step.caption, lang) : null;
  const contexto = step && (step.kind === "show" || step.kind === "ask" || step.kind === "do" || step.kind === "type") && step.contexto ? pick(step.contexto, lang) : null;
  /* El puente al Manual vive solo donde la función enseñada tiene tema. */
  const manualTopic = scene ? SCENE_TOPIC[scene.id] : undefined;
  /* La tarjeta nace donde va a vivir: visible solo cuando la medida que se
   * pinta se tomó para ESTE compás (o la lección ya terminó). */
  const cardHome = run.finished || (rectFor !== null && rectFor.s === run.sceneIdx && rectFor.t === run.stepIdx);
  const isDo = step?.kind === "do";
  // El hueco vive ENTERO dentro de la pantalla en los cuatro lados (caza de
  // bordes, relé de Oscar vía Brizna, 2026-11-14): el aire de 10px se comprime
  // contra el borde; el anillo jamás se corta. Antes solo se protegían arriba
  // e izquierda — un ancla al ras del fondo o de la derecha lo sacaba de la
  // pantalla (el dock escapaba por 1–3px de su propio margen, no por diseño).
  const hole = rect ? (() => {
    const left = Math.max(4, rect.left - 10);
    const top = Math.max(4, rect.top - 10);
    const right = Math.min(window.innerWidth - 4, rect.right + 10);
    const bottom = Math.min(window.innerHeight - 4, rect.bottom + 10);
    return { left, top, width: right - left, height: bottom - top };
  })() : null;
  const cardBelow = hole ? (window.innerHeight - (hole.top + hole.height)) > 240 : true;
  // La tarjeta mide 370 (o el ancho menos 20): el centro y el tope derecho se calculan
  // con SU ancho real — con las constantes viejas de 340 se salía hasta 18px por la
  // derecha cuando el foco vivía a la derecha (visto por Oscar en foto, 2026-11-13).
  const cardW = window.innerWidth >= 1024 ? 550 : Math.min(370, window.innerWidth - 20);
  const cardStyle: React.CSSProperties = hole ? {
    left: Math.min(Math.max(10, hole.left + hole.width / 2 - cardW / 2), window.innerWidth - cardW - 10),
    ...(cardBelow ? { top: hole.top + hole.height + 14 } : { bottom: window.innerHeight - hole.top + 14 }),
  } : { left: "50%", top: "38%", transform: "translateX(-50%)" };

  const jumpToScene = (idx: number) => {
    clearTimers();
    setRect(null);
    const next = { ...run, sceneIdx: idx, stepIdx: 0, won: false, chaptersOpen: false, speedOpen: false, finished: false, trail: [], review: false, stayAsk: false, exitAsk: false, manualTrip: false };
    setRun(next);
    saveProgress(next, false);
  };

  /** Guardar o quitar una escena de «Mis escenas» (la repisa del índice). */
  const toggleSave = (sceneId: string) => {
    const key = `${mod.id}/${sceneId}`;
    const prefs = readState();
    prefs.savedScenes = prefs.savedScenes.includes(key)
      ? prefs.savedScenes.filter((k) => k !== key)
      : [...prefs.savedScenes, key];
    writeState(prefs);
    setSaved(prefs.savedScenes);
  };

  const onShieldTap = (e: React.PointerEvent) => { if (isDo) { e.preventDefault(); setShaking((n) => n + 1); } };
  const shieldRects: React.CSSProperties[] = hole ? [
    { left: 0, top: 0, width: "100%", height: Math.max(0, hole.top) },
    { left: 0, top: hole.top + hole.height, width: "100%", bottom: 0 },
    { left: 0, top: hole.top, width: Math.max(0, hole.left), height: hole.height },
    { left: hole.left + hole.width, top: hole.top, right: 0, height: hole.height },
  ] : [{ left: 0, top: 0, width: "100%", height: "100%" }];

  return (
    <div className="pres-root" role="dialog" aria-modal="false" aria-label={pick(mod.title, lang)}>
      {/* el escudo rodea el recorte: ningún toque desvía el guion, y el objetivo del
          compás recibe el suyo de verdad, a través del hueco */}
      {shieldRects.map((style, i) => (
        <div key={i} className="pres-shield" style={style} onPointerDown={onShieldTap} />
      ))}
      {hole && !run.finished ? (
        <div className={`pres-hole${run.won ? " is-won" : ""}`} style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }} aria-hidden />
      ) : null}
      {theater ? (
        <Theater hide={wHide} onToggleHide={() => setWHide((h) => !h)} onOpen={() => setTheater(false)} />
      ) : null}
      <div className="pres-thread" aria-hidden><i style={{ width: `${((run.sceneIdx + (run.finished ? 1 : 0)) / totalScenes) * 100}%` }} /></div>

      {run.chaptersOpen ? (
        <div className="pres-panel">
          <div className="pres-panel-head">
            <strong className="serif">{pick(mod.title, lang)}</strong>
            <button type="button" className="pres-ctl" aria-label={L(lang, "Cerrar", "Close")} onClick={() => setRun({ ...run, chaptersOpen: false })}><X aria-hidden /></button>
          </div>
          {mod.chapters.map((ch) => (
            <div key={ch.id} className="pres-panel-ch">
              <p className="pres-panel-kicker">{pick(ch.title, lang)}</p>
              {mod.scenes.map((s, i) => s.chapter === ch.id ? (
                <div key={s.id} className="pres-panel-row">
                  <button type="button" className={`pres-panel-scene${i === run.sceneIdx ? " is-now" : ""}`} onClick={() => jumpToScene(i)}>
                    <span className="num">{i + 1}</span>{pick(s.steps.find((x) => x.kind === "show" || x.kind === "do" || x.kind === "ask")?.caption ?? mod.title, lang)}
                    {run.skipped.includes(s.id) ? <em>{L(lang, "saltada", "skipped")}</em> : null}
                  </button>
                  <button type="button" className={`pres-panel-save${saved.includes(`${mod.id}/${s.id}`) ? " is-saved" : ""}`}
                    aria-pressed={saved.includes(`${mod.id}/${s.id}`)}
                    aria-label={L(lang, "Guardar en Mis escenas", "Save to My scenes")}
                    onClick={() => toggleSave(s.id)}>
                    <Bookmark aria-hidden />
                  </button>
                </div>
              ) : null)}
            </div>
          ))}
        </div>
      ) : run.finished ? (
        <div className="pres-card is-done" style={{ left: "50%", top: "34%", transform: "translateX(-50%)" }}>
          <span className="pres-done-check"><Check aria-hidden /></span>
          <strong className="serif">{L(lang, "Módulo completo", "Module complete")}</strong>
          <p>{pick(mod.promise, lang)}</p>
          {run.skipped.length ? <p className="pres-done-note">{L(lang, "Algunas escenas se saltaron: la app cambió bajo ellas. Quedan marcadas para revisión.", "Some scenes were skipped: the app changed under them. They are flagged for review.")}</p> : null}
          <div className="pres-done-acts">
            <button type="button" className="btn" onClick={exitToIndex}>{L(lang, "Volver al índice", "Back to the index")}</button>
            <button type="button" className="btn ghost" onClick={stayHere}>{L(lang, "Quedarme aquí", "Stay here")}</button>
          </div>
        </div>
      ) : caption ? (
        <div key={shaking} className={`pres-card${shaking ? " is-shake" : ""}`} style={{ ...cardStyle, opacity: cardHome ? 1 : 0, visibility: cardHome ? "visible" : "hidden" }} aria-live="polite">
          {contexto ? <div className="pres-contexto" role="note">{contexto}</div> : null}
          <div className="pres-toprow">
            <p className="pres-kicker">
              <span className="num">{run.sceneIdx + 1} / {totalScenes}</span>
            </p>
            {run.mode === "interactive" ? (
              <button type="button" className="pres-navbtn" aria-label={L(lang, "Anterior", "Previous")} disabled={run.trail.length < 2} onClick={goBack}>
                <ChevronLeft aria-hidden />
              </button>
            ) : null}
            {run.mode === "interactive" && !isDo ? (
              <button type="button" className="pres-navbtn" aria-label={L(lang, "Siguiente", "Next")} onClick={advance}>
                <ChevronRight aria-hidden />
              </button>
            ) : null}
            <button type="button" className="pres-ctl hd" aria-label={L(lang, "Modo", "Mode")}
              onClick={() => {
                const r2 = { ...run, mode: run.mode === "auto" ? "interactive" as const : "auto" as const, review: false };
                setRun(r2); saveProgress(r2, false);
              }}>
              {run.mode === "auto" ? <Play aria-hidden /> : <Hand aria-hidden />}
              {run.mode === "auto" ? L(lang, "Automático", "Automatic") : L(lang, "Interactivo", "Interactive")}
            </button>
            <button type="button" className="pres-ctl hd num" aria-label={L(lang, "Velocidad", "Speed")} aria-expanded={run.speedOpen}
              onClick={() => setRun({ ...run, speedOpen: !run.speedOpen })}>
              <Gauge aria-hidden />{run.speed}×
            </button>
            <button type="button" className="pres-ctl hd" aria-label={L(lang, "Capítulos", "Chapters")} onClick={() => setRun({ ...run, chaptersOpen: true })}><List aria-hidden /></button>
            {run.mode === "auto" ? (
              <button type="button" className="pres-ctl hd" aria-label={run.playing ? L(lang, "Pausar", "Pause") : L(lang, "Seguir", "Resume")} onClick={() => setRun({ ...run, playing: !run.playing })}>
                {run.playing ? <Pause aria-hidden /> : <Play aria-hidden />}
              </button>
            ) : null}
            <button type="button" className="pres-ctl hd" aria-label={L(lang, "Salir", "Exit")} onClick={askExit}><X aria-hidden /></button>
          </div>
          {run.speedOpen ? (
            <div className="pres-speedrow" role="group" aria-label={L(lang, "Velocidad", "Speed")}>
              {SPEEDS.map((s) => (
                <button key={s} type="button" className={`pres-speedopt num${s === run.speed ? " is-on" : ""}`}
                  onClick={() => {
                    const r2 = { ...run, speed: s, speedOpen: false };
                    setRun(r2); saveProgress(r2, false);
                  }}>
                  {s}×
                </button>
              ))}
            </div>
          ) : null}
          <p className={`pres-caption${step?.kind === "ask" ? " is-ask" : ""}${isDo ? " is-do" : ""}`}>
            {isDo ? <i className={`pres-dot${run.won ? " is-won" : ""}`} aria-hidden /> : null}
            {caption}
            {run.won ? <Check className="pres-won" aria-hidden /> : null}
          </p>
          <div className="pres-botrow">
            <span className="pres-chapname">{manualTopic ? pick(mod.title, lang) : `${pick(mod.title, lang)}${chapter ? ` · ${pick(chapter.title, lang)}` : ""}`}</span>
            <span className="pres-botlinks">
              {isDo ? (
                <button type="button" className="pres-showme" onClick={() => {
                  if (step?.kind === "do") { const el = anchorEl(step.anchor); if (el) tapEl(el); }
                }}>{L(lang, "Muéstrame tú", "Show me")}</button>
              ) : null}
              {manualTopic ? (
                <button type="button" className="pres-manualbtn" onClick={goManual}>{L(lang, "Más en el manual", "More in the manual")}</button>
              ) : null}
              <button type="button" className="pres-stay" onClick={askStay}>{L(lang, "Quedarme aquí", "Stay here")}</button>
            </span>
          </div>
        </div>
      ) : null}
      {run.stayAsk ? (
        <div className="pres-stayask-veil">
          <div className="pres-stayask" role="dialog" aria-modal="true" aria-label={L(lang, "Quedarme aquí", "Stay here")}>
            <strong className="serif">{L(lang, "¿Quedarte aquí?", "Stay here?")}</strong>
            <p>{L(lang, "Si quieres continuar después, podrás hacerlo donde quedaste, sin empezar el módulo de nuevo: esta misma ficha te espera en Ajustes › Presentaciones.", "If you want to continue later, you can pick up right where you left off, without starting the module over: this same card will be waiting for you in Settings › Presentations.")}</p>
            <div className="pres-stayask-acts">
              <button type="button" className="btn ghost" onClick={() => setRun((cur) => (cur ? { ...cur, stayAsk: false } : cur))}>{L(lang, "Seguir viendo", "Keep watching")}</button>
              <button type="button" className="btn" onClick={stayHere}>{L(lang, "Quedarme aquí", "Stay here")}</button>
            </div>
          </div>
        </div>
      ) : null}
      {run.exitAsk ? (
        <div className="pres-stayask-veil">
          <div className="pres-stayask" role="dialog" aria-modal="true" aria-label={L(lang, "Salir", "Exit")}>
            <strong className="serif">{L(lang, "¿Salir de la presentación?", "Leave the presentation?")}</strong>
            <p>{L(lang, "Tu avance queda guardado: el módulo te espera en Ajustes › Presentaciones.", "Your progress is saved: the module will be waiting in Settings › Presentations.")}</p>
            <div className="pres-stayask-acts">
              <button type="button" className="btn ghost" onClick={() => setRun((cur) => (cur ? { ...cur, exitAsk: false } : cur))}>{L(lang, "Seguir viendo", "Keep watching")}</button>
              <button type="button" className="btn pres-exit-yes" onClick={exitToIndex}>{L(lang, "Salir", "Leave")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ============================ LA OFERTA (primera vez) ============================
 * La cadena de la primera vez, del lado de las presentaciones: tras la sesión
 * (y tras la oferta de huella, donde exista) la app OFRECE la rápida una sola
 * vez. Nunca se impone: si se rehúsa, espera en silencio en Ajustes. Al aceptar,
 * corre «El mapa» y el usuario aterriza en el índice. La marca `offered` vive
 * en el mismo estado del aparato: una vez ofrecida, jamás vuelve a preguntar. */
export function PresOffer() {
  const { lang } = useFaroRoot();
  const user = useFaroUser();
  const [show, setShow] = useState(false);
  const uid = user?.id ?? null;

  useEffect(() => {
    if (stageOn() || dataMode() !== "real") return;
    if (readState().offered) return;
    let live = true;
    let t = 0;
    // LA CADENA DE PRIMERA VEZ (asiento del puerto): sesión → oferta de huella →
    // oferta de presentación. Mientras la pregunta de la huella esté pendiente
    // de hacerse a esta cuenta, esta oferta espera detrás; la libera la marca
    // de «ya se preguntó» o que la pendiente se consuma en silencio (aparato
    // sin huella). Sin cuenta o sin pendiente, la espera es la de siempre.
    const lockPending = () => {
      if (!uid) return false;
      try {
        const store = browserPackStorage();
        return readPending(store, uid) && !wasAsked(store, uid);
      } catch { return false; }
    };
    const arm = () => {
      if (!live) return;
      if (lockPending()) { t = window.setTimeout(arm, 1200); return; }
      t = window.setTimeout(() => { if (!stageOn() && !readState().offered) setShow(true); }, 2500);
    };
    arm();
    return () => { live = false; window.clearTimeout(t); };
  }, [uid]);

  if (!show) return null;
  const close = (accept: boolean) => {
    const prefs = readState();
    prefs.offered = true;
    writeState(prefs);
    setShow(false);
    if (accept) launchPresentation("mapa");
  };
  return (
    <div className="pres-offer" role="dialog" aria-label={L(lang, "Presentaciones", "Presentations")}>
      <Presentation aria-hidden />
      <div className="pres-offer-text">
        <strong className="serif">{L(lang, "¿Ves la app funcionando, en vivo?", "Want to see the app working, live?")}</strong>
        <p>{L(lang, "Una vuelta corta por todo Faro, sin tocar tus libros. Luego tú decides.", "A short lap around all of Faro, without touching your books. Then you decide.")}</p>
      </div>
      <div className="pres-offer-acts">
        <button type="button" className="btn pres-offer-yes" onClick={() => close(true)}>{L(lang, "Ver la rápida", "Watch the quick tour")}</button>
        <button type="button" className="btn ghost pres-offer-no" onClick={() => close(false)}>{L(lang, "Ahora no", "Not now")}</button>
      </div>
    </div>
  );
}
