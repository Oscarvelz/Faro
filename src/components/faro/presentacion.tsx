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
  MODULES, RESULT_MS, TOPIC_SCENES, WORDS_PER_MINUTE, chapterFirst, durationLabel, dwellMs, moduleById, moduleInMode, moduleView, overallProgress, paceOf, pick, resumeSceneId, sceneCaption, sceneInMode, scenePlace, stepMs, wordCount,
  type Module, type Scene, type Step,
} from "@/lib/faro/guion";
import { modeReaches } from "@/lib/faro/mode";
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

/* OLA 7 (E7-1): el puente es de la FAMILIA de la escena, no de una sola
 * cara: las variantes de una misma ranura (la -h de Esencial y la base de
 * Ritmo/Completo) comparten el tema del Manual. Sin esto, la escena que
 * abre Deudas solo ofrecía «Más en el manual» en Esencial, porque
 * TOPIC_SCENES nombra únicamente la cara -h. El mapa se construye al
 * revés de como se lee: primero se agrupan las entradas existentes por
 * su base, y luego cada escena del guion hereda el tema de su familia.
 * OLA 8 (OBS-E8-1): la familia también ata la variante -r (las caras de
 * Ritmo del módulo «Los modos», m15-mudos-r y m15-solo-lectura-r), que la
 * primera forma de la base dejaba fuera: el día que TOPIC_SCENES nombre
 * la cara de Esencial, la -r perdería su puente en silencio. */
const sceneBase = (id: string) => id.replace(/-(h|c|r)$/, "");
const topicByBase: Record<string, string> = {};
for (const [sceneId, topic] of Object.entries(SCENE_TOPIC)) topicByBase[sceneBase(sceneId)] = topic;
for (const m of MODULES) for (const s of m.scenes) {
  if (!SCENE_TOPIC[s.id] && topicByBase[sceneBase(s.id)]) SCENE_TOPIC[s.id] = topicByBase[sceneBase(s.id)];
}

/* ============================ estado del aparato ============================ */

const SEEN_KEY = "faro.seen.pres"; // prefijo compartido: estado de ESTE aparato, jamás del libro
const LAUNCH_KEY = "pres.launch"; // sessionStorage, fuera del namespace de datos
const STAY_KEY = "pres.stay";

type PresState = {
  /* Ola 1 (G-5): junto al índice viaja la identidad de la escena — ver
   * ModuleProgress en guion.ts. readState pasa los módulos sin tocarlos,
   * así que la identidad sobrevive a la recarga tal como se escribió. */
  modules: Record<string, { scene: number; sceneId?: string; done: boolean }>;
  speed: number;
  mode: "auto" | "interactive";
  savedScenes: string[];
  offered?: boolean;
  /* La ficha primera (ley de flota, 2026-11-14): el último módulo en uso;
   * si quedó incompleto, su ficha abre el índice. Se limpia al completarlo. */
  lastModule?: string;
  /* La marca de la escala de velocidades (principio 2, 2026-11-15): la
   * escala recalibrada es la 2. Sin la marca, el número guardado pertenece
   * a la escala vieja y NO se reinterpreta: la velocidad vuelve una vez a
   * la nueva 1× y la marca se escribe con el primer guardado. */
  sv?: number;
};

/* LAS ETIQUETAS DE LA ESCALA RECALIBRADA (principio 2): la antigua 0.5× es
 * la nueva 1×; cada etiqueta vale el doble de su ritmo antiguo (paceOf en
 * guion.ts) y la 0.5× abre el ritmo de estudio, el más lento. */
const SPEEDS = [0.5, 1, 1.5, 2, 3, 4] as const;
const SPEED_SCALE = 2;

function readState(): PresState {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || "null") as Partial<PresState> | null;
    return {
      modules: raw?.modules ?? {},
      speed: raw?.sv === SPEED_SCALE && SPEEDS.includes(raw?.speed as (typeof SPEEDS)[number]) ? (raw!.speed as number) : 1,
      mode: raw?.mode === "interactive" ? "interactive" : "auto",
      savedScenes: Array.isArray(raw?.savedScenes) ? raw!.savedScenes : [],
      offered: raw?.offered === true,
      lastModule: typeof raw?.lastModule === "string" ? raw.lastModule : undefined,
      sv: SPEED_SCALE,
    };
  } catch {
    return { modules: {}, speed: 1, mode: "auto", savedScenes: [], sv: SPEED_SCALE };
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
  const { lang, mode } = useFaroRoot();
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
    // El módulo se camina SIEMPRE en la vista del modo de la persona: las
    // escenas que su modo no ofrece no cuentan ni como reanudación.
    const view = moduleView(mod, mode);
    const saved = state.modules[mod.id];
    let sceneId = view.scenes[0]?.id;
    if (resume && saved && !saved.done) {
      // Reanudar = el PRINCIPIO del capítulo donde ibas: las escenas de un capítulo
      // dependen del estado que las anteriores dejan (un menú abierto, una vista),
      // y el capítulo es la unidad de sentada. Ola 1 (G-5): el capítulo se
      // busca por la IDENTIDAD de la escena guardada (resumeSceneId), no
      // por el índice crudo — el índice era de la vista del modo en que se
      // guardó y caía en otra escena al reanudar en un modo distinto.
      sceneId = resumeSceneId(mod, mode, saved) ?? sceneId;
    }
    launchPresentation(mod.id, sceneId);
  };

  /* La ficha primera: el último módulo en uso, si quedó incompleto, abre la
   * lista sacado de su piso — aparece una sola vez. Al completarlo, la marca
   * se limpia (saveProgress) y la ficha vuelve sola a su sitio. */
  /* El índice se recompone por modo (fallos de Oscar, MAPA-MODULOS §1–§4):
   * un módulo de una función que el modo no tiene no aparece — su tarjeta
   * sería ella misma una tarjeta fantasma. El avance y «Sigue donde ibas»
   * se calculan sobre ESTE índice, y el número de cada ficha es su posición
   * en él. Los módulos no se borran: duermen y vuelven al subir. */
  const indexMods = MODULES.filter((m) => moduleInMode(m, mode));
  const lastMod = state.lastModule ? moduleById(state.lastModule) : undefined;
  const firstCard = lastMod && lastMod.ready && moduleInMode(lastMod, mode) && !state.modules[lastMod.id]?.done ? lastMod : undefined;
  const prog = overallProgress(indexMods, state.modules, mode);

  const renderMod = (mod: Module, pos: number) => {
    const saved = state.modules[mod.id];
    // Ola 1 (G-5): «a medias» también se lee por identidad — una corrida
    // reanudable al principio de un capítulo puede guardar índice 0 en la
    // vista y no ser una corrida sin empezar.
    const mid = !!saved && !saved.done && (saved.scene > 0 || (!!saved.sceneId && saved.sceneId !== mod.scenes[0]?.id));
    return (
      <div key={mod.id} className="pres-mod">
        <div className="pres-mod-head">
          <span className="pres-mod-n num">{pos}</span>
          <strong className="serif">{pick(mod.title, lang)}</strong>
          {mod.ready ? <span className="pres-mod-dur num">{durationLabel(mod, lang, mode)}</span> : null}
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
              {renderMod(firstCard, indexMods.indexOf(firstCard) + 1)}
            </div>
          ) : null}
          {indexMods.filter((mod) => mod.id !== firstCard?.id).map((mod) => renderMod(mod, indexMods.indexOf(mod) + 1))}
          {modeReaches(mode, "ritmo") && state.savedScenes.length ? (
            <div className="pres-shelf">
              <p className="pres-shelf-title">{L(lang, "Mis escenas", "My scenes")}</p>
              {state.savedScenes.map((key) => {
                const [mid, sid] = key.split("/");
                const m = moduleById(mid ?? "");
                const sc = m?.scenes.find((s) => s.id === sid);
                // La repisa también se recompone: una escena guardada cuyo
                // módulo o cuya cara duerme en este modo no se ofrece (la
                // guardada no se borra: vuelve con su modo).
                if (!m || !sc || !moduleInMode(m, mode) || !sceneInMode(sc, mode)) return null;
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
  /* LA VENTANA DE APERTURA (principio 1, 2026-11-15): la corrida nace tras
   * ella — explica los dos modos y nombra cada control antes de que exista
   * tarjeta. `ready` se enciende cuando la preparación sentó el primer
   * compás; `gateStep` es el paso donde la lección arranca de verdad (la
   * maquinaria previa quedó consumida en la preparación, principio 3). */
  gate: boolean;
  ready: boolean;
  gateStep: number;
  /* La suspensión por segundo plano (principio 14): mientras la app no se
   * ve, el reloj está congelado; al volver, el compás se re-presenta solo
   * si la lección estaba corriendo. */
  suspended: boolean;
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
  /* LA HUELLA del compás (principios 8 y 11): la unión de los rects de las
   * anclas que la escena declara más la del paso en curso — el control y la
   * región donde su efecto se representa. La ventana clara cubre la huella
   * entera; el anillo sigue enmarcando el foco; y cuando la huella excede
   * al foco, un recuadro visible la ata a las palabras del pie. */
  const [region, setRegion] = useState<DOMRect | null>(null);
  /* La tarjeta nace donde va a vivir (ley de flota, 2026-11-14): el rect
   * recuerda a qué compás [escena, paso] se midió; mientras el compás
   * actual no tiene SU medida, la tarjeta permanece invisible — jamás
   * aparece primero en un sitio provisional para viajar después. */
  const [rectFor, setRectFor] = useState<{ s: number; t: number } | null>(null);
  /* …pero la invisibilidad es SOLO del nacimiento (invariante de la flota,
   * 2026-11-14): una vez que la tarjeta nació en su sitio, permanece VIVA
   * mientras la lección sigue su camino — un ancla muerta cuesta su espera
   * con la tarjeta presente en su último hogar y su pie en pantalla, jamás
   * con la lección invisible durante segundos. Cada corrida renace: el
   * arranque limpia el hogar y la tarjeta vuelve a nacer donde va a vivir. */
  const [born, setBorn] = useState(false);
  const homeRef = useRef<React.CSSProperties | null>(null);
  /* La altura efectiva con la que se puntuó el hogar guardado: si la
   * tarjeta crece de forma material desde entonces (el pie envolvió más
   * alto), el hogar está rancio y el asiento se vuelve a puntuar — la
   * tarjeta no crece SOBRE el tema que explica (caza de asientos,
   * 2026-11-17). */
  const homeHRef = useRef(0);
  /* La altura real de la tarjeta, medida en su nodo: la colocación se
   * acota con ella para que la tarjeta jamás quede cortada por ningún
   * borde — con un foco alto y ancho (la lista de «Me deben»), la fórmula
   * de «arriba» la dejaba fuera de pantalla por arriba. */
  const [cardH, setCardH] = useState(0);
  const [shaking, setShaking] = useState(0);
  const [theater, setTheater] = useState(false);
  const [wHide, setWHide] = useState(false);
  const seededRef = useRef<Set<string>>(new Set());
  /* ¿El módulo lanzado ya tenía avance guardado? Lo lee el arranque antes
   * de marcar nada: si el alumno cancela en la ventana de apertura sin haber
   * empezado nunca, la marca de «último módulo» se retira y el índice queda
   * como estaba (la cancelación limpia del principio 1). */
  const gateHadRef = useRef(false);
  /* Lo ya ejecutado no se repite (principio 14): las acciones con efecto
   * (el gesto automático, el toque de maquinaria, el tecleo) se marcan al
   * ejecutarse en ESTA corrida; si el compás se re-presenta — la app volvió
   * de segundo plano, se cerró un panel — la marca manda y la acción no se
   * repite (en un interruptor, repetirla lo apagaría). Nace vacío en cada
   * arranque: una corrida nueva vuelve a ejecutar su guion entero. */
  const actedRef = useRef<Set<string>>(new Set());
  /* El escenario previo, garantizado (caza de la flota, 2026-11-14): entrar
   * a un módulo por una escena intermedia — la ficha «Sigue donde ibas», un
   * aterrizaje de la lupa o del Manual, un salto de capítulos — siembra
   * ANTES todas las semillas de las escenas anteriores, en su orden: la
   * ficción que las escenas siguientes enseñan existe antes de actuar, y
   * sus anclas no mueren por un arranque a mitad. Las recetas son
   * idempotentes y seededRef manda: lo ya sembrado no se repite jamás. */
  const sowPrefix = (m: Module, upTo: number) => {
    for (let s = 0; s < upTo && s < m.scenes.length; s++) {
      m.scenes[s].steps.forEach((st, p) => {
        if (st.kind !== "seed") return;
        const key = `${m.id}:${s}:${p}`;
        if (seededRef.current.has(key)) return;
        seededRef.current.add(key);
        const sow = STAGE_SEEDS[st.seed];
        if (sow) api.commit(sow, lang === "en" ? "Presentation stage" : "Escenario de la presentación");
      });
    }
  };
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
    const rawMod = moduleById(launch.moduleId);
    if (!rawMod || !rawMod.ready) return;
    // La corrida entera — índices, capítulos, contadores, avance — vive en
    // la vista del modo del libro de escenario (que toma prestado el modo de
    // la persona): una escena que ese modo no puede mostrar no se camina.
    const mod = moduleView(rawMod, api.mode);
    const prefs = readState();
    const savedScene = launch.sceneId
      ? Math.max(0, mod.scenes.findIndex((s) => s.id === launch.sceneId))
      : 0;
    gateHadRef.current = !!prefs.modules[mod.id];
    // La ficha primera se marca desde el arranque mismo.
    writeState({ ...prefs, lastModule: mod.id });
    // La tarjeta de esta corrida aún no nació: su primer compás se mide.
    homeRef.current = null;
    setBorn(false);
    // La corrida es nueva: nada de lo ejecutado trae marca (principio 14).
    actedRef.current = new Set();
    // El escenario amanece en Central, como la app misma.
    const { patch } = screenPatch({ screen: "desk" });
    setUi({ ...patch });
    later(() => {
      setRun({
        mod, sceneIdx: savedScene, stepIdx: 0,
        mode: prefs.mode, speed: prefs.speed,
        playing: true, won: false, finished: false, chaptersOpen: false, speedOpen: false, skipped: [],
        trail: [], review: false, stayAsk: false, exitAsk: false, manualTrip: false,
        gate: true, ready: false, gateStep: 0, suspended: false,
      });
    }, 650);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- LA PREPARACIÓN TRAS LA VENTANA (principios 1 y 3) ----
   * Mientras la ventana de apertura vive, el escenario se prepara detrás:
   * se siembra el prefijo de la escena de arranque, se navega a su lugar y
   * se caminan sus pasos de maquinaria (sembrar, viajar, referir) hasta el
   * primer paso que actúa o lleva pie; el ancla de ese compás se resuelve
   * y solo entonces «Empezar» se enciende — la lección arranca en ese paso,
   * con la tarjeta naciendo en su sitio medido, nunca encendida en un
   * centro provisional mientras el escenario se construía. Si el ancla no
   * aparece, la preparación termina igual: el motor saltará la escena con
   * gracia y lo declarará (principio 17). */
  useEffect(() => {
    if (!run || !run.gate || run.ready) return;
    const r = run;
    let cancelled = false;
    (async () => {
      sowPrefix(r.mod, r.sceneIdx);
      const sc = r.mod.scenes[r.sceneIdx];
      if (!sc) { if (!cancelled) setRun((cur) => (cur ? { ...cur, ready: true, gateStep: 0 } : cur)); return; }
      const place = scenePlace(r.mod, sc.id);
      const { patch, open } = screenPatch({ screen: place });
      setUi({ ...patch });
      for (const id of open) window.setTimeout(() => window.dispatchEvent(new CustomEvent("faro-open", { detail: id })), 350);
      let idx = 0;
      for (; idx < sc.steps.length; idx++) {
        const st = sc.steps[idx];
        if (st.kind === "seed") {
          const key = `${r.mod.id}:${r.sceneIdx}:${idx}`;
          if (!seededRef.current.has(key)) {
            seededRef.current.add(key);
            const sow = STAGE_SEEDS[st.seed];
            if (sow) api.commit(sow, lang === "en" ? "Presentation stage" : "Escenario de la presentación");
          }
          continue;
        }
        if (st.kind === "go") {
          const gp = screenPatch({ screen: st.screen });
          setUi({ ...gp.patch });
          for (const id of gp.open) window.setTimeout(() => window.dispatchEvent(new CustomEvent("faro-open", { detail: id })), 350);
          continue;
        }
        if (st.kind === "ref") continue;
        break;
      }
      const first = sc.steps[idx];
      if (first && "anchor" in first) await waitAnchor(first.anchor, 2600);
      if (!cancelled) setRun((cur) => (cur ? { ...cur, ready: true, gateStep: idx } : cur));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.gate, run?.mod.id, run?.sceneIdx]);

  const scene: Scene | null = run ? (run.mod.scenes[run.sceneIdx] ?? null) : null;
  const step: Step | null = run && scene ? (scene.steps[run.stepIdx] ?? null) : null;

  const saveProgress = useCallback((r: RunState, done: boolean) => {
    const prefs = readState();
    // Ola 1 (G-5): junto al índice se guarda la IDENTIDAD de la escena —
    // las escenas de la vista son los mismos objetos del guion completo,
    // así que el id es canónico y la reanudación en otro modo traduce.
    prefs.modules[r.mod.id] = { scene: r.sceneIdx, sceneId: r.mod.scenes[r.sceneIdx]?.id, done };
    prefs.speed = r.speed;
    prefs.mode = r.mode;
    // La ficha primera: el último módulo en uso manda; al completarlo, la
    // marca se limpia y su ficha vuelve a su piso.
    if (done) { if (prefs.lastModule === r.mod.id) delete prefs.lastModule; }
    else prefs.lastModule = r.mod.id;
    writeState(prefs);
  }, []);

  /* EL GUARDADO HONESTO AL TERMINAR (principio 17): una corrida que acaba
   * con escenas saltadas NO se anota como aprendida — queda en curso, y su
   * punto de reanudación es la primera escena saltada (al reanudar manda
   * su capítulo, como siempre). Toda salida que guarda el final pasa por
   * aquí: el avance, el salto, la salida y el quedarse. */
  const finishSave = useCallback((r: RunState) => {
    if (!r.finished) { saveProgress(r, false); return; }
    if (r.skipped.length === 0) { saveProgress(r, true); return; }
    const first = Math.max(0, r.mod.scenes.findIndex((s) => r.skipped.includes(s.id)));
    saveProgress({ ...r, sceneIdx: first }, false);
  }, [saveProgress]);

  const advance = useCallback(() => {
    const r = runRef.current;
    if (!r) return;
    clearTimers();
    setRect(null); setRegion(null);
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
    finishSave(done);
  }, [clearTimers, finishSave]);

  /* «‹» — un compás atrás, al lugar exacto ya vivido (la cima de la pila).
   * Cruzar de escena navega a su pantalla sin re-sembrar nada: las semillas
   * ya sembradas quedan (seededRef no se toca) y el compás destino se
   * PRESENTA (review): un tap/type no repite su acción; un gesto (do) se
   * vuelve a vivir, porque el gesto es del alumno. */
  const goBack = useCallback(() => {
    const r = runRef.current;
    if (!r || r.trail.length < 2) return;
    clearTimers();
    setRect(null); setRegion(null);
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
    setRect(null); setRegion(null);
    const skipped = r.skipped.includes(sceneId) ? r.skipped : [...r.skipped, sceneId];
    if (r.sceneIdx + 1 < r.mod.scenes.length) {
      const next = { ...r, sceneIdx: r.sceneIdx + 1, stepIdx: 0, won: false, skipped };
      setRun(next);
      saveProgress(next, false);
    } else {
      const done = { ...r, finished: true, won: false, skipped };
      setRun(done);
      finishSave(done);
    }
  }, [clearTimers, saveProgress, finishSave]);

  const exitToIndex = useCallback(() => {
    const r = runRef.current;
    if (r) finishSave(r);
    setStay({ section: "settings", openPres: true });
    setRun(null);
    exitStage();
  }, [finishSave]);

  const stayHere = useCallback(() => {
    const r = runRef.current;
    if (r) finishSave(r);
    setStay({ section: ui.section, vault: ui.vault ?? null });
    setRun(null);
    exitStage();
  }, [finishSave, ui.section, ui.vault]);

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

  /* «Empezar» (principio 1): la ventana se retira y la lección arranca en
   * el paso que la preparación sentó — la maquinaria previa ya no corre. */
  const beginGate = useCallback(() => {
    const r = runRef.current;
    if (!r || !r.gate || !r.ready) return;
    setRun({ ...r, gate: false, stepIdx: r.gateStep });
  }, []);

  /* «Ahora no» (principio 1): la cancelación es limpia — ningún avance se
   * guarda, y si el módulo nunca tuvo avance, la marca de «último módulo»
   * que el arranque escribió se retira: el índice queda como estaba. */
  const cancelGate = useCallback(() => {
    const r = runRef.current;
    if (r && !gateHadRef.current) {
      const prefs = readState();
      if (prefs.lastModule === r.mod.id && !prefs.modules[r.mod.id]) {
        delete prefs.lastModule;
        writeState(prefs);
      }
    }
    setStay({ section: "settings", openPres: true });
    setRun(null);
    exitStage();
  }, []);

  /* ------------------------------ el motor de pasos ------------------------------ */
  useEffect(() => {
    if (!run || !scene || !step || run.finished || run.gate || run.suspended || run.chaptersOpen || run.speedOpen || run.stayAsk || run.exitAsk || run.manualTrip) return;
    const r = run;
    let cancelled = false;
    // El escenario previo se garantiza AQUÍ, al actuar, en cada entrada —
    // arranque, reanudación, aterrizaje o salto: las semillas de las escenas
    // anteriores a la actual se siembran antes de su primer paso, en el
    // mismo momento seguro en que las siembra el flujo normal.
    sowPrefix(r.mod, r.sceneIdx);
    /* El ritmo que corre de verdad: la etiqueta del alumno traducida por la
     * escala recalibrada (principio 2) — todo el motor divide por pace. */
    const pace = paceOf(r.speed);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const armRect = (el: HTMLElement) => {
      /* El marco sigue a lo que enmarca (principio 10): foco Y huella se
       * remiden en el mismo latido de 180 ms durante todo el compás —
       * aperturas, animaciones y desplazamientos incluidos — y el anillo,
       * el recuadro y la tarjeta cabalgan con ellos. */
      const measure = () => {
        if (cancelled) return;
        setRect(el.getBoundingClientRect());
        const sc = r.mod.scenes[r.sceneIdx];
        const els: HTMLElement[] = [el];
        if (sc) for (const a of sc.anchors) { const n = anchorEl(a); if (n && !els.includes(n)) els.push(n); }
        let l = Infinity, t = Infinity, rr = -Infinity, b = -Infinity;
        for (const n of els) {
          const q = n.getBoundingClientRect();
          if (q.width === 0 && q.height === 0) continue;
          l = Math.min(l, q.left); t = Math.min(t, q.top); rr = Math.max(rr, q.right); b = Math.max(b, q.bottom);
        }
        setRegion(Number.isFinite(l) ? new DOMRect(l, t, rr - l, b - t) : null);
        setRectFor({ s: r.sceneIdx, t: r.stepIdx });
      };
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
        later(() => { if (!cancelled) advance(); }, 600 / pace);
        return;
      }
      if (step.kind === "go") {
        const { patch, open } = screenPatch({ screen: step.screen });
        setUi({ ...patch });
        for (const id of open) later(() => window.dispatchEvent(new CustomEvent("faro-open", { detail: id })), 350);
        later(() => { if (!cancelled) advance(); }, stepMs(step, lang) / pace);
        return;
      }
      if (step.kind === "ref") { advance(); return; }
      const el = await waitAnchor(step.anchor);
      if (cancelled) return;
      if (!el) { skipScene(scene.id); return; } // ancla muerta: la escena se salta con gracia
      /* El desplazamiento mete la HUELLA entera en cuadro (principio 8):
       * el control y la región donde su efecto se representa — no solo el
       * foco centrado. Si la huella no cabe en la pantalla, manda el foco,
       * como siempre. */
      {
        const sc2 = r.mod.scenes[r.sceneIdx];
        const els: HTMLElement[] = [el];
        if (sc2) for (const a of sc2.anchors) { const n = anchorEl(a); if (n && !els.includes(n)) els.push(n); }
        const behavior = reduce ? "auto" : "smooth";
        if (els.length === 1) {
          el.scrollIntoView({ block: "center", behavior });
        } else {
          const rs = els.map((n) => n.getBoundingClientRect());
          const top = Math.min(...rs.map((q) => q.top));
          const bottom = Math.max(...rs.map((q) => q.bottom));
          const vh = window.innerHeight;
          if (bottom - top > vh - 16) {
            el.scrollIntoView({ block: "center", behavior });
          } else {
            if (bottom > vh - 8) els[rs.findIndex((q) => q.bottom === bottom)]?.scrollIntoView({ block: "end", behavior });
            if (top < 8) els[rs.findIndex((q) => q.top === top)]?.scrollIntoView({ block: "start", behavior });
          }
        }
      }
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
      // La marca de lo ya ejecutado en esta corrida (principio 14): si el
      // compás se re-presenta por una suspensión o un panel, la acción que
      // ya ocurrió no se repite — se presenta su permanencia y se sigue.
      const actedKey = `${r.mod.id}:${r.sceneIdx}:${r.stepIdx}`;
      // La permanencia del paso: el pie + la lectura de la ventanita, si la hay.
      const capDwell = "caption" in step
        ? dwellMs(step.caption, lang) + (step.contexto ? Math.round((wordCount(pick(step.contexto, lang)) / WORDS_PER_MINUTE) * 60_000) : 0)
        : 0;

      if (step.kind === "tap") {
        if (actedRef.current.has(actedKey)) { later(() => { if (!cancelled) advance(); }, 300 / pace); return; }
        later(() => { if (!cancelled) { actedRef.current.add(actedKey); tapEl(el); later(() => { if (!cancelled) advance(); }, 420 / pace); } }, 300 / pace);
        return;
      }
      if (step.kind === "type") {
        const input = el.matches("input") ? (el as HTMLInputElement) : el.querySelector<HTMLInputElement>("input");
        if (!input) { skipScene(scene.id); return; }
        if (!r.playing && r.mode === "auto") return; // en pausa: el efecto se rearma al seguir
        /* Primero se lee, después se teclea (principio 16): el tecleo llega
         * tras el pie ENTERO — antes caía al 40 % de la permanencia, mientras
         * el pie aún se leía — y lo tecleado se queda su momento de resultado
         * (principio 9). Lo anunciado en stepMs es exactamente esto. */
        if (actedRef.current.has(actedKey)) {
          later(() => { if (!cancelled) advance(); }, capDwell / pace);
          return;
        }
        later(() => {
          if (cancelled) return;
          actedRef.current.add(actedKey);
          input.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          setter?.call(input, pick(step.text, lang));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          later(() => { if (!cancelled) advance(); }, RESULT_MS / pace);
        }, capDwell / pace);
        return;
      }
      if (step.kind === "show" || step.kind === "ask") {
        if (r.mode === "auto" || step.kind === "ask") {
          if (r.playing) later(() => { if (!cancelled) advance(); }, capDwell / pace);
        }
        return;
      }
      // do: el compás interactivo
      if (r.mode === "interactive") {
        const onTap = (e: Event) => {
          if (el.contains(e.target as Node)) {
            document.removeEventListener("pointerdown", onTap, true);
            setRun((cur) => (cur ? { ...cur, won: true } : cur));
            /* El resultado del gesto se queda su momento (principio 9),
             * al ritmo que el alumno eligió. */
            later(() => { if (!cancelled) advance(); }, RESULT_MS / pace);
          }
        };
        document.addEventListener("pointerdown", onTap, true);
        timers.current.push(window.setTimeout(() => document.removeEventListener("pointerdown", onTap, true), 120_000) as unknown as number);
      } else if (r.playing) {
        // El gesto espera el pie ENTERO (1.3.278, veredicto de Oscar: el mapa
        // «pasa muy rápido»): antes el conductor actuaba al 55% de la
        // permanencia y el compás de gesto vivía casi la mitad de lo que el
        // índice anunciaba — el alumno veía el toque antes de acabar de leer
        // la orden. Ahora lee el pie completo, ve el gesto y su resultado se
        // queda su momento (principios 16 y 9). Y si el compás se re-presenta
        // con el gesto ya ejecutado, no se repite (principio 14).
        if (actedRef.current.has(actedKey)) {
          later(() => { if (!cancelled) advance(); }, capDwell / pace);
          return;
        }
        later(() => {
          if (cancelled) return;
          actedRef.current.add(actedKey);
          tapEl(el);
          setRun((cur) => (cur ? { ...cur, won: true } : cur));
          later(() => { if (!cancelled) advance(); }, RESULT_MS / pace);
        }, capDwell / pace);
      }
    };
    void runStep();
    return () => { cancelled = true; clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.sceneIdx, run?.stepIdx, run?.mode, run?.playing, run?.speed, run?.gate, run?.suspended, run?.chaptersOpen, run?.speedOpen, run?.finished, run?.stayAsk, run?.exitAsk, run?.manualTrip]);

  /* LA LECCIÓN NUNCA ATRAPA AL ALUMNO (principio 14): si la app pasa a
   * segundo plano — una llamada, un cambio de app — el reloj se congela y
   * el compás queda suspendido: ningún gesto se ejecuta sin ser visto. Al
   * volver, la lección se reanuda solo si estaba corriendo, re-presentando
   * el compás; lo ya ejecutado no se repite (la guardia actedRef del
   * motor). Si el sistema mata la app, no queda velo congelado: el
   * conductor no corre fuera de sesión y el índice reanuda por capítulo. */
  useEffect(() => {
    const onVis = () => {
      const r = runRef.current;
      if (!r || r.gate) return;
      if (document.hidden) {
        if (!r.suspended) { clearTimers(); setRun({ ...r, suspended: true }); }
      } else if (r.suspended) {
        setRun({ ...r, suspended: false });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [clearTimers]);

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

  /* El puente desde la tarjeta final con saltos (principio 17): la lección
   * que no pudo enseñarse manda al Manual — abre el tema de la primera
   * escena saltada por el mismo viaje con vuelta al mismo sitio. */
  const goManualSkipped = () => {
    const r = runRef.current;
    if (!r) return;
    const idx = r.mod.scenes.findIndex((s) => r.skipped.includes(s.id));
    if (idx < 0) return;
    const topic = SCENE_TOPIC[r.mod.scenes[idx].id];
    if (!topic) return;
    clearTimers();
    setRun({ ...r, sceneIdx: idx, manualTrip: true });
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
      if (runRef.current?.gate) { cancelGate(); return; }
      if (runRef.current?.exitAsk) setRun((cur) => (cur ? { ...cur, exitAsk: false } : cur));
      else if (runRef.current?.stayAsk) setRun((cur) => (cur ? { ...cur, stayAsk: false } : cur));
      else if (runRef.current?.chaptersOpen) setRun((cur) => (cur ? { ...cur, chaptersOpen: false } : cur));
      else askExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, askExit, cancelGate]);

  if (!stageOn() || !run) return null;
  /* En el viaje al Manual la lección entera se retira: ni tarjeta, ni
   * escudos — el Manual es el único dueño de la pantalla hasta que vuelve. */
  if (run.manualTrip) return null;

  const mod = run.mod;
  /* LA VENTANA DE APERTURA (principio 1): mientras vive, es lo único en
   * pantalla — ni escudos, ni hueco, ni tarjeta: la lección aún no empieza
   * y el escenario se prepara detrás de su velo. «Empezar» se enciende solo
   * cuando la preparación sentó el primer compás; «Ahora no» cancela
   * limpio, sin avance y sin marcas. */
  if (run.gate) {
    return (
      <div className="pres-root">
        <div className="pres-stayask-veil">
          <div className="pres-stayask pres-gate" role="dialog" aria-modal="true" aria-label={pick(mod.title, lang)}>
            <strong className="serif">{pick(mod.title, lang)}</strong>
            <p>{L(lang, "Puedes mirarla o hacerla a mano — y cambiar de modo cuando quieras, sin perder el compás.", "You can watch it or do it by hand — and switch modes whenever you like, without losing your place.")}</p>
            <div className="pres-gate-modes">
              <p className="pres-gate-mode"><Play aria-hidden /><span><strong>{L(lang, "Automático", "Automatic")}</strong> — {L(lang, "la lección ejecuta y toca por ti; tú solo miras.", "the lesson performs and taps for you; you just watch.")}</span></p>
              <p className="pres-gate-mode"><Hand aria-hidden /><span><strong>{L(lang, "Interactivo", "Interactive")}</strong> — {L(lang, "la lección avanza solo cuando tú tocas lo que te pide.", "the lesson moves only when you tap what it asks.")}</span></p>
            </div>
            <p className="pres-gate-controls">
              {L(lang, "Los controles viven en la tarjeta: ", "The controls live on the card: ")}
              <strong>{L(lang, "Modo", "Mode")}</strong>{L(lang, " cambia de modo · ", " switches modes · ")}
              <strong>{L(lang, "Velocidad", "Speed")}</strong>{L(lang, " pone el ritmo · ", " sets the pace · ")}
              <strong>{L(lang, "Capítulos", "Chapters")}</strong>{L(lang, " salta a otra escena · ", " jumps to another scene · ")}
              <strong>‹ ›</strong>{L(lang, " un compás atrás o adelante · ", " one beat back or forward · ")}
              <strong>{L(lang, "Quedarme aquí", "Stay here")}</strong>{L(lang, " te deja en ese lugar de tu app · la ", " leaves you at that place in your app · the ")}
              <strong>✕</strong>{L(lang, " sale al índice.", " exits to the index.")}
            </p>
            <div className="pres-stayask-acts pres-gate-acts">
              <span className="pres-gate-status" aria-live="polite">{run.ready ? L(lang, "El primer compás ya está listo.", "The first beat is ready.") : L(lang, "Preparando el escenario…", "Preparing the stage…")}</span>
              <button type="button" className="btn ghost" onClick={cancelGate}>{L(lang, "Ahora no", "Not now")}</button>
              <button type="button" className="btn pres-gate-go" disabled={!run.ready} onClick={beginGate}>{L(lang, "Empezar", "Start")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
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
  const clampHole = (q: DOMRect) => {
    const left = Math.max(4, q.left - 10);
    const top = Math.max(4, q.top - 10);
    const right = Math.min(window.innerWidth - 4, q.right + 10);
    const bottom = Math.min(window.innerHeight - 4, q.bottom + 10);
    return { left, top, width: right - left, height: bottom - top };
  };
  const hole = rect ? clampHole(rect) : null;
  /* LA VENTANA CLARA ES LA HUELLA (principios 8 y 11, 2026-11-15): los
   * escudos rodean la huella entera — el control y la región de su efecto —
   * y la tarjeta se sienta contra ella, jamás sobre lo que la lección
   * demuestra (principio 4 reforzado). El anillo sigue enmarcando el foco.
   * Sin huella medida aún, manda el foco, como antes. */
  const clear = region ? clampHole(region) : hole;
  // La tarjeta mide 370 (o el ancho menos 20): el centro y el tope derecho se calculan
  // con SU ancho real — con las constantes viejas de 340 se salía hasta 18px por la
  // derecha cuando el foco vivía a la derecha (visto por Oscar en foto, 2026-11-13).
  const cardW = window.innerWidth >= 1024 ? 550 : Math.min(370, window.innerWidth - 20);
  /* EL ASIENTO SE PUNTÚA, NO SE DECIDE POR UNA CONSTANTE (caza de asientos,
   * 2026-11-17): la vieja regla — «abajo si sobran 240px, arriba si no» —
   * sentaba la tarjeta contra una altura imaginada, y el tope a la pantalla
   * la deslizaba de vuelta SOBRE la huella: la lección hablaba de lo que
   * tapaba. Ahora se proponen hasta cuatro asientos — abajo, arriba y,
   * cuando el ancho lo permite de verdad, a la derecha y a la izquierda de
   * la huella — y cada uno se puntúa con la altura efectiva de la tarjeta,
   * en este orden estricto: (1) quien no toca el FOCO vence a quien lo
   * toca; (2) quien menos huella cubre; (3) el orden de preferencia —
   * abajo, arriba, derecha, izquierda; en pantalla ancha (≥1024) con
   * huella grande (más del 55 % del alto o del 60 % del ancho) los lados
   * van primero, porque el aire que sobra es el horizontal. Antes de la
   * primera medida rige una altura prudente de 240: las tarjetas medidas
   * viven entre 160 y 200, y 240 cubre el pie de tres líneas con su
   * contexto y su fila de velocidad sin jamás declarar la tarjeta más
   * pequeña de lo que es — subestimarla era lo que dejaba al asiento
   * provisional deslizarse sobre el tema. */
  const seatH = cardH > 0 ? cardH : 240;
  type SeatRect = { left: number; top: number; width: number; height: number };
  const overlapOf = (a: SeatRect, b: SeatRect) => {
    const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
    const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  };
  const pickSeat = (): SeatRect | null => {
    if (!clear) return null;
    const guard = hole ?? clear;
    const vw = window.innerWidth, vh = window.innerHeight;
    const centerLeft = Math.min(Math.max(10, clear.left + clear.width / 2 - cardW / 2), vw - cardW - 10);
    const clampTop = (t: number) => Math.max(10, Math.min(t, vh - seatH - 10));
    const seats: { name: string; rect: SeatRect }[] = [
      { name: "below", rect: { left: centerLeft, top: clampTop(clear.top + clear.height + 14), width: cardW, height: seatH } },
      { name: "above", rect: { left: centerLeft, top: clampTop(clear.top - 14 - seatH), width: cardW, height: seatH } },
    ];
    /* Los asientos laterales solo nacen cuando caben de verdad: el ancho
     * de la tarjeta + el de la huella + los dos aires de 14 + los márgenes
     * de 10 a cada lado, todo dentro del ancho de la pantalla. Nacen
     * alineados con la huella y acotados a la pantalla, como los demás. */
    if (cardW + clear.width + 2 * 14 + 2 * 10 <= vw) {
      const latTop = clampTop(clear.top);
      seats.push({ name: "right", rect: { left: Math.min(clear.left + clear.width + 14, vw - cardW - 10), top: latTop, width: cardW, height: seatH } });
      seats.push({ name: "left", rect: { left: Math.max(10, clear.left - 14 - cardW), top: latTop, width: cardW, height: seatH } });
    }
    const bigFoot = clear.height > vh * 0.55 || clear.width > vw * 0.6;
    const pref = vw >= 1024 && bigFoot ? ["right", "left", "below", "above"] : ["below", "above", "right", "left"];
    let best = seats[0].rect, bestKey: [number, number, number] | null = null;
    for (const s of seats) {
      const key: [number, number, number] = [overlapOf(s.rect, guard) > 0 ? 1 : 0, overlapOf(s.rect, clear), pref.indexOf(s.name)];
      if (!bestKey || key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) { best = s.rect; bestKey = key; }
    }
    return best;
  };
  const seatRect = pickSeat();
  const cardStyle: React.CSSProperties = seatRect
    ? { left: seatRect.left, top: seatRect.top }
    : { left: "50%", top: "38%", transform: "translateX(-50%)" };

  /* El nacimiento de la tarjeta: la primera vez que un compás tiene SU
   * medida, ese estilo queda guardado como su hogar y la tarjeta ya nació —
   * desde ahí, ningún compás pendiente la vuelve invisible. Es un ajuste en
   * fase de render, a propósito: tras los retornos tempranos de arriba no
   * puede vivir ningún hook (su orden cambiaría entre renders). */
  if (cardHome && hole) { homeRef.current = cardStyle; if (!born) setBorn(true); }
  if (cardHome && hole) homeHRef.current = seatH;
  /* EL HOGAR CONGELADO SE RE-EXAMINA (2026-11-17): mientras un compás
   * espera su medida, el foco ya caminó a otra parte — si el asiento
   * guardado, medido con la altura efectiva de ahora, cubre el foco
   * actual, o la tarjeta creció de forma material desde que aquel asiento
   * se puntuó, el hogar está rancio y manda el asiento recién puntuado
   * para la huella actual. La ley de «nace donde vive» protege el asiento
   * de un compás sentado, no uno rancio parado sobre el tema nuevo. */
  const homeRect: SeatRect | null = homeRef.current && typeof homeRef.current.left === "number" && typeof homeRef.current.top === "number"
    ? { left: homeRef.current.left as number, top: homeRef.current.top as number, width: cardW, height: seatH }
    : null;
  const homeStale = !cardHome && born && homeRect !== null && hole !== null
    && (overlapOf(homeRect, hole) > 0 || Math.abs(seatH - homeHRef.current) > 8);
  const cardPos = !cardHome && born && homeRef.current && !homeStale ? homeRef.current : cardStyle;

  const jumpToScene = (idx: number) => {
    clearTimers();
    setRect(null); setRegion(null);
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
  const shieldRects: React.CSSProperties[] = clear ? [
    { left: 0, top: 0, width: "100%", height: Math.max(0, clear.top) },
    { left: 0, top: clear.top + clear.height, width: "100%", bottom: 0 },
    { left: 0, top: clear.top, width: Math.max(0, clear.left), height: clear.height },
    { left: clear.left + clear.width, top: clear.top, right: 0, height: clear.height },
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
      {/* EL RECUADRO DE LA REGIÓN NOMBRADA (principio 11 reforzado): cuando
          la huella excede al foco, un marco visible ata el pie a la región
          entera de la que habla — el alumno ve exactamente a qué «eso» se
          refiere la leyenda. Si la huella ES el foco, el anillo ya es el
          recuadro y este no nace. */}
      {clear && rect && region && !run.finished
        && (region.left < rect.left - 4 || region.right > rect.right + 4 || region.top < rect.top - 4 || region.bottom > rect.bottom + 4) ? (
        <div className="pres-regionframe" style={{ left: clear.left, top: clear.top, width: clear.width, height: clear.height }} aria-hidden />
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
                  {modeReaches(api.mode, "ritmo") ? (
                    <button type="button" className={`pres-panel-save${saved.includes(`${mod.id}/${s.id}`) ? " is-saved" : ""}`}
                      aria-pressed={saved.includes(`${mod.id}/${s.id}`)}
                      aria-label={L(lang, "Guardar en Mis escenas", "Save to My scenes")}
                      onClick={() => toggleSave(s.id)}>
                      <Bookmark aria-hidden />
                    </button>
                  ) : null}
                </div>
              ) : null)}
            </div>
          ))}
        </div>
      ) : run.finished ? (
        <div className="pres-card is-done" style={{ left: "50%", top: "34%", transform: "translateX(-50%)" }}>
          <span className="pres-done-check"><Check aria-hidden /></span>
          <strong className="serif">{run.skipped.length ? L(lang, "Módulo casi completo", "Module almost complete") : L(lang, "Módulo completo", "Module complete")}</strong>
          <p>{pick(mod.promise, lang)}</p>
          {run.skipped.length ? <p className="pres-done-note">{L(lang, "Algunas escenas no pudieron enseñarse — la app cambió bajo ellas — y el módulo no queda marcado como aprendido: te espera en la primera de ellas.", "Some scenes could not be taught — the app changed under them — and the module is not marked as learned: it will be waiting at the first of them.")}</p> : null}
          <div className="pres-done-acts">
            {run.skipped.length ? (
              <button type="button" className="btn" onClick={() => jumpToScene(Math.max(0, mod.scenes.findIndex((s) => run.skipped.includes(s.id))))}>{L(lang, "Repasar las saltadas", "Review the skipped ones")}</button>
            ) : null}
            {run.skipped.length && SCENE_TOPIC[mod.scenes.find((s) => run.skipped.includes(s.id))?.id ?? ""] ? (
              <button type="button" className="btn ghost" onClick={goManualSkipped}>{L(lang, "Más en el manual", "More in the manual")}</button>
            ) : null}
            <button type="button" className={run.skipped.length ? "btn ghost" : "btn"} onClick={exitToIndex}>{L(lang, "Volver al índice", "Back to the index")}</button>
            <button type="button" className="btn ghost" onClick={stayHere}>{L(lang, "Quedarme aquí", "Stay here")}</button>
          </div>
        </div>
      ) : caption ? (
        <div key={shaking} ref={(node) => { if (node) { const h = node.getBoundingClientRect().height; if (h > 0 && Math.abs(h - cardH) > 1) setCardH(h); } }} className={`pres-card${shaking ? " is-shake" : ""}`} style={{ ...cardPos, opacity: cardHome || born ? 1 : 0, visibility: cardHome || born ? "visible" : "hidden" }} aria-live="polite">
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
