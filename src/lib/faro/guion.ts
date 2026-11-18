/**
 * guion — el registro de guiones de la Presentación Guiada.
 *
 * Una presentación NO es video: es un guion (datos) que la app representa en vivo sobre sí
 * misma, en el escenario sellado (`faro.stage:`, ver samplemode.ts). Cada módulo es una
 * lista de escenas; cada escena, una lista de pasos. Los textos nacen en pares ES/EN —
 * ninguna escena existe en un solo idioma — y cada pie obedece la ley de la casa:
 * ≤15 palabras, beneficio primero, y su permanencia en pantalla es proporcional a sus
 * palabras (el reloj de abajo), nunca un número fijo.
 *
 * Las escenas apuntan a ANCLAS vivas (`data-anchor`), nunca a posiciones: si una ola
 * futura mueve un control, la escena lo sigue; si el ancla muere, la cerca de la suite
 * se pone roja antes de publicar y el conductor salta la escena con gracia (ley de
 * mantenimiento). El censo de funciones escondidas (2026-11-13) es la fuente de las
 * escenas: cada función que la interfaz calla lleva la suya, con intención.
 */

import { modeReaches, type Mode } from "./modes.ts";

export type Pair = readonly [es: string, en: string];
export const pick = (pair: Pair, lang: string): string => (lang === "en" ? pair[1] : pair[0]);

export type Step =
  /** Navega a un lugar de la casa (el mismo sistema de lugares del manual). */
  | { kind: "go"; screen: string }
  /** Resalta un ancla con su pie de texto. `contexto`: la ventanita arribita (ley §0.6). */
  | { kind: "show"; anchor: string; caption: Pair; contexto?: Pair }
  /** Pregunta corta: un latido de pausa, y la respuesta llega con el paso siguiente. */
  | { kind: "ask"; anchor: string; caption: Pair; contexto?: Pair }
  /** Compás interactivo: la escena espera el gesto real del usuario sobre el ancla.
   * En modo automático, el conductor lo ejecuta él mismo tras el latido. */
  | { kind: "do"; anchor: string; caption: Pair; contexto?: Pair }
  /** Toque del conductor, sin pie (abrir/cerrar un menú, restaurar una vista). */
  | { kind: "tap"; anchor: string }
  /** Siembra del escenario: construye los datos que la lección necesita (stage-seeds.ts).
   * Sin pie: la escena nunca descansa en él; el conductor lo aplica y sigue. */
  | { kind: "seed"; seed: string }
  /** El conductor escribe en un campo (la lupa del manual): la representación teclea
   * y la escena sigue tras el pie. En interactivo también lo hace el conductor:
   * teclear la palabra ES la demostración. */
  | { kind: "type"; anchor: string; text: Pair; caption: Pair; contexto?: Pair }
  /** Referencia inmediata al tema del manual, sin perder la escena. */
  | { kind: "ref"; topic: string };

export interface Scene {
  id: string;
  chapter: string;
  /** El modo cuya cara enseña esta escena, cuando solo se ofrece mirando desde
   * él (las escenas filtradas del módulo «Los modos»). Sin modo, la escena se
   * ofrece en todo modo donde viva su módulo. Ver modes.ts. */
  mode?: Mode;
  /** El modo mínimo desde el que la escena se ofrece (acumulativo, como los
   * módulos): para las escenas de módulos compartidos ancladas a superficies
   * que un modo menor no tiene (auditoría T-3 de la etapa 5 de los modos,
   * 2026-11-16). Distinto de `mode`: `mode` nombra UNA cara exacta;
   * `minMode` nombra un piso. Sin ninguno de los dos, la escena vive en todo
   * modo donde viva su módulo. */
  minMode?: Mode;
  /** El modo desde el que la escena YA no se ofrece: para superficies que
   * existen solo bajo el techo (la fila de datos mudos y la sugerencia de
   * subida viven en Esencial y Ritmo; en Completo nada duerme y nadie
   * sugiere subir — auditoría de la etapa 5). Se compone con los demás
   * filtros: la escena se ofrece si pasa todos los que declara. */
  notMode?: Mode;
  /** Toda ancla que la escena toca (la cerca las verifica contra los componentes). */
  anchors: readonly string[];
  /** Palabras clave de búsqueda (ES, EN) — la lupa encuentra escenas como encuentra ajustes. */
  keys: readonly Pair[];
  steps: readonly Step[];
}

export interface Chapter {
  id: string;
  title: Pair;
}

export interface Module {
  id: string;
  n: number;
  title: Pair;
  /** La descripción previa del índice: una promesa de capacidad, no un tema. */
  promise: Pair;
  /** El modo mínimo en cuyo índice vive este módulo (el índice es acumulativo:
   * Esencial ⊂ Ritmo ⊂ Completo). Lo declaran los módulos que nacen con el
   * sistema de modos; la recomposición de los demás es obra de la ola de
   * modos. Ver modes.ts. */
  mode?: Mode;
  ready: boolean;
  chapters: readonly Chapter[];
  scenes: readonly Scene[];
}

/* ================================ EL RELOJ ================================ */

/** La calibración de lectura: 200 palabras por minuto en pantalla (investigación 2026-11-13). */
export const WORDS_PER_MINUTE = 200;
/** Toda permanencia lleva ~1s de orientación antes de la lectura. */
export const ORIENT_MS = 1000;
/** El suelo de todo pie (1.3.278, veredicto telefónico de Oscar sobre la
 * 1.3.277: «en su velocidad normal el mapa pasa muy rápido»). La proporción
 * por palabras dejaba los pies cortos — los del mapa, de 3-4 palabras — en
 * 1.9-2.2s nominales, de los que la aparición de la tarjeta y el scroll se
 * comen ~0.4s: el alumno no alcanza a leer el pie Y registrar el foco antes
 * de que el compás se mueva. Ningún pie vive menos de 2.6s a 1×. */
export const MIN_DWELL_MS = 2600;

export const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** Permanencia de un pie al ritmo base: proporcional a sus palabras. */
export const dwellMs = (caption: Pair, lang: string): number =>
  Math.max(MIN_DWELL_MS, Math.round((wordCount(pick(caption, lang)) / WORDS_PER_MINUTE) * 60_000) + ORIENT_MS);

/* LA ESCALA RECALIBRADA (principio 2 de las Presentaciones, orden de Oscar
 * vía la línea de Brizna, 2026-11-15): la antigua 0.5× es la nueva 1× normal.
 * Cada etiqueta se reescala en proporción — la nueva 2× es la antigua 1×; la
 * nueva 0.5× es el ritmo de estudio más lento (la antigua 0.25×) — y el reloj
 * de arriba queda como el ritmo BASE: lo que una etiqueta corre de verdad es
 * base / paceOf(etiqueta). Las duraciones anunciadas se calculan en la misma
 * escala (moduleSeconds divide por paceOf(1)), y una velocidad guardada en la
 * escala vieja nunca se reinterpreta en silencio (el estado del aparato lleva
 * marca de escala; sin ella, vuelve una vez a la nueva 1×). */
export const paceOf = (label: number): number => label / 2;

/** EL MOMENTO DEL RESULTADO (principio 9): tras una acción ejecutada con pie,
 * el compás se detiene sobre el resultado asentado este tiempo (ritmo base)
 * antes de seguir — la pausa pertenece al efecto, no solo a la leyenda. */
export const RESULT_MS = 1000;

/** Lo que un paso cuesta en modo automático a 1× (para la duración anunciada).
 * La ventanita de contexto, cuando la hay, suma su propia lectura: anunciarla sin
 * contarla sería mentir la duración. */
export function stepMs(step: Step, lang: string): number {
  const contextoMs = "contexto" in step && step.contexto
    ? Math.round((wordCount(pick(step.contexto, lang)) / WORDS_PER_MINUTE) * 60_000)
    : 0;
  switch (step.kind) {
    case "show":
    case "ask":
      return dwellMs(step.caption, lang) + contextoMs;
    case "do":
      return dwellMs(step.caption, lang) + contextoMs + RESULT_MS; // el pie entero, el gesto y su momento de resultado (principios 16 y 9: primero se lee, después se actúa, y el resultado se queda su tiempo)
    case "go":
      return 1400; // el viaje y el asentamiento
    case "tap":
      return 720; // el motor, exacto: 300 de espera + el toque + 420 de asentamiento
    case "seed":
      return 600; // sembrar y seguir (el motor espera lo mismo desde la 1.3.278)
    case "type":
      return dwellMs(step.caption, lang) + contextoMs + RESULT_MS; // el pie entero, el tecleo y su momento de resultado (principio 16: nunca se teclea mientras el pie aún se lee)
    case "ref":
      return 0; // la referencia se ofrece; no cuesta tiempo de guion
  }
}

export const sceneMs = (scene: Scene, lang: string): number =>
  scene.steps.reduce((sum, s) => sum + stepMs(s, lang), 0);

/* ============ EL GUIÓN MIRADO DESDE UN MODO (etapa 5, 2026-11-16) ============
 * El índice de Presentaciones se recompone por modo (fallos de Oscar,
 * MAPA-MODULOS §1–§4): un módulo vive en el índice de un modo si el modo
 * alcanza su mínimo; dentro de un módulo compartido, cada escena se ofrece
 * solo si el modo la puede mostrar — su cara exacta (`mode`) o su piso
 * (`minMode`). Estas vistas son la única puerta: el índice, el conductor y
 * el avance leen el guion SIEMPRE a través de ellas. */

/** ¿Vive el módulo en el índice de este modo? Sin `mode` declarado, el
 * módulo aún no declara el suyo y vive en todos (compatibilidad con el
 * guion anterior a la ola; los módulos de la casa ya lo declaran todos). */
export const moduleInMode = (mod: Module, mode: Mode): boolean =>
  !mod.mode || modeReaches(mode, mod.mode);

/** ¿Se ofrece la escena mirando desde este modo? */
export const sceneInMode = (scene: Scene, mode: Mode): boolean =>
  (!scene.mode || scene.mode === mode) && (!scene.minMode || modeReaches(mode, scene.minMode)) && (!scene.notMode || scene.notMode !== mode);

/** Las escenas del módulo que este modo puede ver, en su orden. */
export const visibleScenes = (mod: Module, mode: Mode): readonly Scene[] =>
  mod.scenes.filter((s) => sceneInMode(s, mode));

/** El módulo tal como un modo lo camina: sus escenas visibles y solo los
 * capítulos que aún tienen escenas en él. El conductor corre SIEMPRE sobre
 * esta vista — índices, contadores, capítulos y avance hablan de lo que el
 * modo de verdad ofrece, nunca del guion entero. */
export function moduleView(mod: Module, mode: Mode): Module {
  const scenes = visibleScenes(mod, mode);
  if (scenes.length === mod.scenes.length) return mod;
  const live = new Set(scenes.map((s) => s.chapter));
  return { ...mod, scenes, chapters: mod.chapters.filter((c) => live.has(c.id)) };
}

/** La duración honesta del índice: automática a la NUEVA 1× (principio 2:
 * el ritmo base dividido por paceOf(1)), en segundos. Con modo, cuenta solo
 * las escenas que ese modo ofrece. */
export const moduleSeconds = (mod: Module, lang: string, mode?: Mode): number =>
  Math.round((mode ? visibleScenes(mod, mode) : mod.scenes).reduce((sum, s) => sum + sceneMs(s, lang), 0) / paceOf(1) / 1000);

/** «Aprox. 4 min» / «Approx. 4 min» — ley de flota (Oscar, 2026-11-14): la
 * duración completa se etiqueta «Aprox.»/«Approx.», nunca «unos» ni «about»;
 * la cifra es la calculada del guion a Automático 1×. */
export function durationLabel(mod: Module, lang: string, mode?: Mode): string {
  const sec = moduleSeconds(mod, lang, mode);
  const min = Math.max(1, Math.round(sec / 60));
  return lang === "en" ? `Approx. ${min} min` : `Aprox. ${min} min`;
}

/* ================= LA LÍNEA GENERAL DE PROGRESO =================
 * Ley universal (Oscar, 2026-11-14): el índice abre con UNA línea sobre
 * TODOS los módulos — cuánto de la app entera se ha estudiado y cuánto
 * falta. LA CUENTA HONESTA: un módulo terminado cuenta entero; uno a
 * medias cuenta la fracción de sí mismo ya caminada (su punto de
 * reanudación sobre su longitud); uno sin tocar cuenta cero. La cifra es
 * siempre la verdad, nunca vanidad. */

export interface ModuleProgress {
  scene: number;
  /** Ola 1 (G-5): la IDENTIDAD de la escena de reanudación. El índice
   *  `scene` se guarda contra la vista del modo en que se caminó; al
   *  reanudar en OTRO modo el mismo índice cae en otra escena. La identidad
   *  no conoce modos: la reanudación traduce por ella. Los guardados viejos
   *  no la traen y se leen por índice, como siempre. */
  sceneId?: string;
  done: boolean;
}

/** La escena donde una corrida guardada se reanuda EN ESTE MODO: el
 *  principio del capítulo donde ibas (la unidad de sentada), traducido por
 *  identidad. Si el capítulo entero duerme en este modo, la primera escena
 *  visible después de donde ibas en el guion completo; si no hay ninguna,
 *  el principio del módulo. */
export function resumeSceneId(mod: Module, mode: Mode, saved: ModuleProgress): string | undefined {
  const view = visibleScenes(mod, mode);
  if (!view.length) return undefined;
  if (saved.sceneId) {
    const at = mod.scenes.find((s) => s.id === saved.sceneId);
    if (at) {
      const firstOfChapter = view.find((s) => s.chapter === at.chapter);
      if (firstOfChapter) return firstOfChapter.id;
      const pos = mod.scenes.indexOf(at);
      const after = view.find((s) => mod.scenes.indexOf(s) > pos);
      return (after ?? view[0]).id;
    }
  }
  const at = view[saved.scene];
  const firstOfChapter = at ? view.find((s) => s.chapter === at.chapter) : undefined;
  return (firstOfChapter ?? view[0]).id;
}

export function overallProgress(
  mods: readonly Module[],
  state: Readonly<Record<string, ModuleProgress>>,
  mode?: Mode,
): { pct: number; done: number; inProgress: number; total: number; remaining: number } {
  const ready = mods.filter((m) => m.ready);
  let walked = 0;
  let done = 0;
  let inProgress = 0;
  for (const m of ready) {
    const s = state[m.id];
    if (!s) continue;
    if (s.done) { walked += 1; done += 1; continue; }
    // Con modo, la fracción se mide sobre las escenas que ese modo ofrece:
    // el avance es del índice que la persona ve, no del guion entero.
    // Ola 1 (G-5): con identidad guardada, lo caminado en ESTE modo es el
    // número de escenas visibles que van antes de la escena de reanudación
    // en el guion completo — el índice crudo mentía al cambiar de modo.
    const len = mode ? visibleScenes(m, mode).length : m.scenes.length;
    let walkedScenes = s.scene;
    if (mode && s.sceneId) {
      const pos = m.scenes.findIndex((x) => x.id === s.sceneId);
      if (pos >= 0) walkedScenes = visibleScenes(m, mode).filter((x) => m.scenes.indexOf(x) < pos).length;
    }
    const frac = len ? Math.min(1, Math.max(0, walkedScenes) / len) : 0;
    walked += frac;
    if (frac > 0) inProgress += 1;
  }
  const total = ready.length;
  const pct = total ? Math.round((walked / total) * 100) : 0;
  return { pct, done, inProgress, total, remaining: 100 - pct };
}

/* ============================ MÓDULO 1 · EL MAPA ============================ */

const MAPA: Module = {
  id: "mapa",
  n: 1,
  mode: "esencial",
  title: ["El mapa", "The map"],
  promise: [
    "Al salir, te mueves por toda la app sin buscar nada.",
    "By the end, you move through the whole app without hunting around.",
  ],
  ready: true,
  chapters: [
    { id: "ciudadanos", title: ["Los ciudadanos", "The citizens"] },
    { id: "moverse", title: ["Moverse", "Moving"] },
    { id: "vistas", title: ["Las vistas", "The views"] },
    { id: "widget", title: ["El widget", "The widget"] },
  ],
  scenes: [
    {
      id: "m1-central", chapter: "ciudadanos", anchors: ["nav-desk"],
      keys: [["central", "desk"], ["inicio", "home"]],
      steps: [{ kind: "show", anchor: "nav-desk", caption: ["Central: el mes entero, de un vistazo.", "Central: the whole month, at a glance."], contexto: ["Esto pasa en un escenario de práctica: tu libro real no se toca.", "This happens on a practice stage: your real book is never touched."] }],
    },
    {
      id: "m1-libros", chapter: "ciudadanos", anchors: ["nav-books"],
      keys: [["libros", "books"], ["anotar", "write down"]],
      steps: [{ kind: "show", anchor: "nav-books", caption: ["Libros: donde se anota; cinco libros en un toque.", "Libros: where you write; five books in one tap."] }],
    },
    {
      id: "m1-folios", chapter: "ciudadanos", anchors: ["nav-folios"],
      keys: [["folios", "folios"], ["historial", "history"], ["archivo", "archive"]],
      steps: [{ kind: "show", anchor: "nav-folios", caption: ["Folios: el río de todo y el cuarto del descanso.", "Folios: the river of everything, and the rest room."] }],
    },
    {
      id: "m1-estudio", chapter: "ciudadanos", minMode: "ritmo", anchors: ["nav-study"],
      keys: [["estudio", "study"], ["asesor", "advisor"]],
      steps: [{ kind: "show", anchor: "nav-study", caption: ["Estudio lee tu mes; su vecino, el Asesor, aconseja.", "Study reads your month; its neighbor, the Advisor, advises."] }],
    },
    {
      id: "m1-ajustes", chapter: "ciudadanos", anchors: ["top-gear"],
      keys: [["ajustes", "settings"], ["presentaciones", "presentations"]],
      steps: [{ kind: "show", anchor: "top-gear", caption: ["Ajustes guarda las herramientas — y estas presentaciones.", "Settings keeps the tools — and these presentations."] }],
    },
    {
      id: "m1-casa", chapter: "ciudadanos", anchors: ["top-brand"],
      keys: [["marca", "brand"], ["inicio", "home"], ["volver", "back home"]],
      steps: [
        { kind: "ask", anchor: "top-brand", caption: ["¿Perdido? Una puerta siempre vuelve a casa.", "Lost? One door always leads home."] },
        { kind: "do", anchor: "top-brand", caption: ["Toca la marca Faro.", "Tap the Faro mark."] },
      ],
    },
    {
      id: "m1-entrar-libros", chapter: "moverse", anchors: ["nav-books"],
      keys: [["entrar", "go in"], ["libros", "books"]],
      steps: [{ kind: "do", anchor: "nav-books", caption: ["Toca Libros para entrar.", "Tap Libros to go in."] }],
    },
    {
      id: "m1-hoja-mes", chapter: "moverse", anchors: ["top-cal"],
      keys: [["calendario", "calendar"], ["mes", "month"], ["deslizar", "slide"]],
      steps: [{ kind: "show", anchor: "top-cal", caption: ["La hoja del mes se desliza: arrastra y cambia el mes.", "The month leaf slides: drag it to change month."] }],
    },
    {
      id: "m1-lupa", chapter: "moverse", anchors: ["top-search"],
      keys: [["buscar", "search"], ["lupa", "lens"]],
      steps: [{ kind: "show", anchor: "top-search", caption: ["La lupa busca meses, personas, tarjetas… y ajustes.", "The lens finds months, people, cards… and settings."] }],
    },
    {
      id: "m1-deshacer", chapter: "moverse", anchors: ["top-undo"],
      keys: [["deshacer", "undo"], ["rehacer", "redo"]],
      steps: [{ kind: "show", anchor: "top-undo", caption: ["Deshacer vive aquí, callado: casi todo se deshace.", "Undo lives here, quietly: almost everything can be undone."] }],
    },
    {
      id: "m1-pastillas", chapter: "moverse", anchors: ["folios-chips"],
      keys: [["pastillas", "pills"], ["historial", "history"], ["archivo", "archive"]],
      steps: [
        { kind: "go", screen: "historial" },
        { kind: "show", anchor: "folios-chips", caption: ["Dos pastillas, dos cuartos: saltan sin compartir datos.", "Two pills, two rooms: they jump, sharing no data."] },
      ],
    },
    {
      id: "m1-vistas", chapter: "vistas", anchors: ["top-view"],
      keys: [["vistas", "views"], ["pantalla", "screen"]],
      steps: [{ kind: "show", anchor: "top-view", caption: ["Tres vistas: una pantalla, dos pisos, ventana flotante.", "Three views: one screen, two floors, a floating window."] }],
    },
    {
      id: "m1-abrir-vistas", chapter: "vistas", anchors: ["top-view"],
      keys: [["vistas", "views"], ["abrir", "open"]],
      steps: [{ kind: "do", anchor: "top-view", caption: ["Abre las vistas.", "Open the views."] }],
    },
    {
      id: "m1-menu-vistas", chapter: "vistas", anchors: ["view-menu"],
      keys: [["vistas", "views"], ["dividir", "split"]],
      steps: [{ kind: "show", anchor: "view-menu", caption: ["Elige cómo mirar: la app se reparte sin perder nada.", "Choose how to look: the app splits, losing nothing."] }],
    },
    {
      id: "m1-dos-pisos", chapter: "vistas", anchors: ["view-rows", "top-view"],
      keys: [["arriba y abajo", "top and bottom"], ["dividir", "split"]],
      steps: [
        { kind: "do", anchor: "view-rows", caption: ["Toca «Arriba y abajo».", "Tap “Top and bottom”."] },
        { kind: "show", anchor: "top-view", caption: ["Dos pisos en una pantalla, cada uno a su ritmo.", "Two floors on one screen, each at its own pace."] },
      ],
    },
    {
      id: "m1-una-pantalla", chapter: "vistas", anchors: ["top-view", "view-one"],
      keys: [["una sola pantalla", "one screen"], ["restaurar", "restore"]],
      steps: [
        { kind: "tap", anchor: "top-view" },
        { kind: "tap", anchor: "view-one" },
        { kind: "show", anchor: "top-view", caption: ["Una sola pantalla lo deja todo como estaba.", "One screen leaves everything as it was."] },
      ],
    },
    {
      id: "m1-widget-mes", chapter: "widget", anchors: ["theater", "theater-wrap"],
      keys: [["widget", "widget"], ["pantalla de inicio", "home screen"]],
      steps: [
        { kind: "seed", seed: "widget-mes" },
        { kind: "show", anchor: "theater-wrap", caption: ["Tu pantalla de inicio, en escena: Faro ya vive ahí.", "Your home screen, on stage: Faro already lives there."] },
      ],
    },
    {
      id: "m1-widget-queda", chapter: "widget", anchors: ["theater", "theater-open"],
      keys: [["widget", "widget"], ["queda", "left"]],
      steps: [{ kind: "show", anchor: "theater-open", caption: ["El widget dice cuánto queda — sin abrir la app.", "The widget says what's left — without opening the app."] }],
    },
    {
      id: "m1-widget-vence", chapter: "widget", anchors: ["theater", "theater-open"],
      keys: [["widget", "widget"], ["vence", "due"], ["cuota", "installment"]],
      steps: [{ kind: "show", anchor: "theater-open", caption: ["Y avisa lo que vence, con su día: la cuota, en 5 días.", "And it flags what's due, with its day: the installment, in 5 days."] }],
    },
    {
      id: "m1-widget-ocultar", chapter: "widget", anchors: ["theater", "theater-hide"],
      keys: [["widget", "widget"], ["ocultar montos", "hide amounts"], ["privado", "private"]],
      steps: [{ kind: "do", anchor: "theater-hide", caption: ["Toca el ojo: los montos se vuelven puntos.", "Tap the eye: the amounts turn to dots."] }],
    },
    {
      id: "m1-widget-abrir", chapter: "widget", anchors: ["theater", "theater-open"],
      keys: [["widget", "widget"], ["abrir", "open"]],
      steps: [{ kind: "do", anchor: "theater-open", caption: ["Un toque en el widget y Faro se abre en Central.", "One tap on the widget and Faro opens at the Desk."], contexto: ["Lo que el widget muestra se elige en Ajustes, tarjeta Widget.", "What the widget shows is chosen in Settings, the Widget card."] }],
    },
  ],
};

/* ============================ MÓDULO 2 · EL MANUAL ============================ */

const MANUAL: Module = {
  id: "manual",
  n: 2,
  mode: "esencial",
  title: ["El manual", "The manual"],
  promise: [
    "Al salir, ninguna ayuda te queda lejos: todo nombre lleva a su sitio.",
    "By the end, no help is far: every name leads to its place.",
  ],
  ready: true,
  chapters: [
    { id: "fuente", title: ["La misma fuente", "One source"] },
    { id: "buscar", title: ["Buscar y llegar", "Search and arrive"] },
    { id: "burbuja", title: ["La burbuja", "The bubble"] },
  ],
  scenes: [
    {
      id: "m2-manual-fila", chapter: "fuente", anchors: ["aj-manual"],
      keys: [["manual", "manual"], ["ayuda", "help"]],
      steps: [
        { kind: "go", screen: "settings" },
        { kind: "show", anchor: "aj-manual", caption: ["El manual guarda todo Faro, explicado una sola vez.", "The manual holds all of Faro, explained just once."] },
      ],
    },
    {
      id: "m2-abrir-manual", chapter: "fuente", anchors: ["aj-manual"],
      keys: [["manual", "manual"], ["abrir", "open"]],
      steps: [{ kind: "do", anchor: "aj-manual", caption: ["Ábrelo: toca la fila del manual.", "Open it: tap the manual row."] }],
    },
    {
      id: "m2-portada", chapter: "fuente", anchors: ["mn-cover"],
      keys: [["manual", "manual"], ["contenido", "contents"], ["capítulos", "chapters"]],
      steps: [{ kind: "show", anchor: "mn-cover", caption: ["Cada tema lleva un número: es su dirección para encontrarlo y citarlo.", "Every topic carries a number: its address for finding and citing it."] }],
    },
    {
      id: "m2-ir-az", chapter: "fuente", anchors: ["mn-azbtn"],
      keys: [["índice", "index"], ["a-z", "a-z"]],
      steps: [{ kind: "do", anchor: "mn-azbtn", caption: ["Toca «Índice A–Z».", "Tap “A–Z index”."] }],
    },
    {
      id: "m2-az", chapter: "fuente", anchors: ["mn-az"],
      keys: [["índice", "index"], ["palabras", "words"]],
      steps: [{ kind: "show", anchor: "mn-az", caption: ["Cada palabra de Faro, con el número de su tema.", "Every word in Faro, with its topic number."] }],
    },
    {
      id: "m2-ir-lupa", chapter: "buscar", anchors: ["mn-findbtn"],
      keys: [["buscar", "search"], ["lupa", "lens"]],
      steps: [{ kind: "do", anchor: "mn-findbtn", caption: ["Toca la lupa del manual, arriba.", "Tap the manual's lens, at the top."] }],
    },
    {
      id: "m2-teclear", chapter: "buscar", anchors: ["mn-find"],
      keys: [["buscar", "search"], ["escribir", "type"]],
      steps: [{ kind: "type", anchor: "mn-find", text: ["tasa", "rate"], caption: ["Escribe «tasa»: buscar es escribir una palabra.", "Type “rate”: searching is typing one word."] }],
    },
    {
      id: "m2-resultados", chapter: "buscar", anchors: ["mn-results"],
      keys: [["resultados", "results"], ["fragmento", "fragment"]],
      steps: [{ kind: "show", anchor: "mn-results", caption: ["Resultados con el fragmento donde vive tu palabra.", "Results with the fragment where your word lives."] }],
    },
    {
      id: "m2-aterrizar", chapter: "buscar", anchors: ["mn-results"],
      keys: [["resultado", "result"], ["ir", "go"]],
      steps: [{ kind: "do", anchor: "mn-results", caption: ["Toca el primer resultado.", "Tap the first result."] }],
    },
    {
      id: "m2-brillo", chapter: "buscar", anchors: ["mn-current"],
      keys: [["brillo", "glow"], ["tema", "topic"]],
      steps: [{ kind: "show", anchor: "mn-current", caption: ["Aterrizas en el tema, brillando: así no te pierdes.", "You land on the topic, glowing: no getting lost."] }],
    },
    {
      id: "m2-volver", chapter: "buscar", anchors: ["mn-back"],
      keys: [["volver", "back"], ["esc", "esc"]],
      steps: [{ kind: "show", anchor: "mn-back", caption: ["Para volver: esta flecha, Esc, o el atrás del teléfono.", "To go back: this arrow, Esc, or the phone's back."] }],
    },
    {
      id: "m2-salir-manual", chapter: "burbuja", anchors: ["mn-back"],
      keys: [["salir", "leave"], ["manual", "manual"]],
      steps: [{ kind: "do", anchor: "mn-back", caption: ["Sal del manual con la flecha.", "Leave the manual with the arrow."] }],
    },
    {
      id: "m2-de-vuelta", chapter: "burbuja", anchors: ["top-brand"],
      keys: [["central", "desk"], ["ayuda", "help"]],
      steps: [
        { kind: "go", screen: "desk" },
        { kind: "show", anchor: "top-brand", caption: ["De vuelta en Central: la ayuda también vive aquí.", "Back at the Desk: help lives here too."] },
      ],
    },
    {
      id: "m2-tocar-ayuda", chapter: "burbuja", anchors: ["desk-left"],
      keys: [["ayuda", "help"], ["burbuja", "bubble"], ["queda", "left"]],
      steps: [{ kind: "do", anchor: "desk-left", caption: ["Toca el (?) junto a «Queda».", "Tap the (?) beside “Left”."] }],
    },
    {
      id: "m2-burbuja-fuente", chapter: "burbuja", anchors: ["hint-bubble"],
      keys: [["burbuja", "bubble"], ["fuente", "source"]],
      steps: [{ kind: "show", anchor: "hint-bubble", caption: ["La burbuja dice lo mismo que el manual: una sola fuente.", "The bubble says what the manual says: one single source."] }],
    },
    {
      id: "m2-burbuja-lado", chapter: "burbuja", anchors: ["hint-bubble"],
      keys: [["burbuja", "bubble"], ["tapar", "cover"]],
      steps: [{ kind: "show", anchor: "hint-bubble", caption: ["Y nunca tapa palabras: se sienta al lado, donde cabe.", "And it never covers words: it sits beside, where it fits."] }],
    },
    {
      id: "m2-mas-manual", chapter: "burbuja", anchors: ["hint-more"],
      keys: [["manual", "manual"], ["profundidad", "depth"]],
      steps: [{ kind: "do", anchor: "hint-more", caption: ["Toca «Más en el manual» para la profundidad.", "Tap “More in the manual” for the depth."] }],
    },
    {
      id: "m2-aterriza-tema", chapter: "burbuja", anchors: ["mn-current"],
      keys: [["tema", "topic"], ["brillo", "glow"]],
      steps: [{ kind: "show", anchor: "mn-current", caption: ["El manual se abre en ese tema exacto, brillando.", "The manual opens at that exact topic, glowing."] }],
    },
  ],
};

/* ====================== LA ESCALERA (los demás módulos) ====================== */

const pending = (n: number, id: string, title: Pair, promise: Pair): Module => ({
  id, n, title, promise, ready: false, chapters: [], scenes: [],
});

const ANOTAR: Module = {
  id: "anotar", n: 3, title: ["Anotar", "Writing it down"], mode: "esencial", ready: true,
  promise: ["Al salir, anotas cualquier cosa en su libro correcto, sin dudar.", "By the end, you file anything in its right book, without hesitating."],
  chapters: [
    { id: "escribir", title: ["Escribir una línea", "Writing a line"] },
    { id: "gestionar", title: ["Gestionar el libro", "Running the book"] },
    { id: "atajos", title: ["Los atajos", "The shortcuts"] },
  ],
  scenes: [
    { id: "m3-fijos", chapter: "escribir", anchors: ["book-card"], keys: [["fijos", "fixed"], ["burbujas", "bubbles"]], steps: [
      { kind: "seed", seed: "anotar-mes" },
      { kind: "go", screen: "fixed" },
      { kind: "show", anchor: "book-card", caption: ["Fijos es una nube de burbujas: su tamaño es su peso.", "Fixed costs are a bubble cloud: size is weight."] },
    ] },
    { id: "m3-abrir", chapter: "escribir", anchors: ["book-add"], keys: [["nueva línea", "new line"], ["editor", "editor"]], steps: [
      { kind: "do", anchor: "book-add", caption: ["El + dorado abre el editor: nace una línea nueva.", "The golden + opens the editor: a new line is born."] },
    ] },
    { id: "m3-concepto", chapter: "escribir", anchors: ["line-concept"], keys: [["concepto", "concept"]], steps: [
      { kind: "type", anchor: "line-concept", text: ["Luz eléctrica", "Electric bill"], caption: ["Primero el concepto: el nombre claro de la línea.", "First the concept: the line's clear name."] },
    ] },
    { id: "m3-monto", chapter: "escribir", anchors: ["line-amount"], keys: [["monto", "amount"]], steps: [
      { kind: "type", anchor: "line-amount", text: ["900", "900.00"], caption: ["Luego el monto: novecientos, sin símbolos ni comas.", "Then the amount: nine hundred, no symbols or commas."] },
    ] },
    { id: "m3-moneda", chapter: "escribir", anchors: ["book-coin"], keys: [["moneda", "currency"], ["córdobas", "cordobas"]], steps: [
      { kind: "do", anchor: "book-coin", caption: ["La moneda dorada alterna C$ y $: anotas sin reescribir.", "The golden coin flips C$ and $: write without rewriting."] },
      { kind: "tap", anchor: "book-coin" },
    ] },
    { id: "m3-guardar", chapter: "escribir", anchors: ["line-save"], keys: [["guardar", "save"]], steps: [
      { kind: "do", anchor: "line-save", caption: ["Al guardar, Faro confirma antes de asentar lo nuevo.", "On saving, Faro confirms before settling anything new."] },
    ] },
    { id: "m3-confirmar", chapter: "escribir", anchors: ["ask-yes"], keys: [["confirmar", "confirm"]], steps: [
      { kind: "do", anchor: "ask-yes", caption: ["Confirmas, y la línea nace dentro de la nube.", "You confirm, and the line is born inside the cloud."] },
    ] },
    { id: "m3-nacida", chapter: "escribir", anchors: ["book-card"], keys: [["línea nueva", "new line"]], steps: [
      { kind: "show", anchor: "book-card", caption: ["Luz eléctrica ya está: C$900 más en tus Fijos.", "Electric bill is in: C$900 more in your Fixed."] },
    ] },
    { id: "m3-burbuja", chapter: "gestionar", anchors: ["book-cloud"], keys: [["burbuja", "bubble"], ["editar", "edit"]], steps: [
      { kind: "do", anchor: "book-cloud", caption: ["Toca una burbuja y su editor se abre en el sitio.", "Tap a bubble and its editor opens right there."] },
    ] },
    { id: "m3-bote", chapter: "gestionar", minMode: "ritmo", anchors: ["book-pot"], keys: [["bote", "pot"], ["informe", "report"]], steps: [
      { kind: "show", anchor: "book-pot", caption: ["El bote resume la línea: acumulado, anotado y cuántos pagos — tócalo y se abre.", "The pot sums up the line: total, logged, and payment count — tap it open."] },
    ] },
    { id: "m3-lapiz", chapter: "gestionar", anchors: ["book-kit"], keys: [["lápiz", "pencil"], ["gestionar", "manage"]], steps: [
      { kind: "show", anchor: "book-kit", caption: ["El lápiz gestiona el libro: renombra, recolorea, borra en grupo.", "The pencil runs the book: rename, recolor, bulk delete."] },
    ] },
    { id: "m3-importar", chapter: "gestionar", minMode: "completo", anchors: ["books-import"], keys: [["importar", "import"], ["banco", "bank"]], steps: [
      { kind: "show", anchor: "books-import", caption: ["Al pie del libro, la importación trae líneas de tu banco.", "At the book's foot, import brings lines from your bank."] },
    ] },
    { id: "m3-tienda", chapter: "gestionar", minMode: "ritmo", anchors: ["shops-gear"], keys: [["tiendas", "shops"], ["engranaje", "gear"]], steps: [
      { kind: "go", screen: "shops" },
      { kind: "show", anchor: "shops-gear", caption: ["Ese engranaje abre Estructura: ahí se crean y ordenan tiendas y categorías.", "That gear opens Structure: where stores and categories are made and ordered."] },
    ] },
    { id: "m3-atajo", chapter: "atajos", anchors: ["desk-plus"], keys: [["atajo", "shortcut"], ["esquina", "corner"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "do", anchor: "desk-plus", caption: ["La esquina + anota sin salir de Central.", "The + corner writes without leaving Central."] },
    ] },
    { id: "m3-ventana", chapter: "atajos", anchors: ["quick-window"], keys: [["ventana rápida", "quick window"]], steps: [
      { kind: "show", anchor: "quick-window", caption: ["La ventana rápida: las casas de siempre, en un toque.", "The quick window: the usual houses, in one tap."] },
    ] },
    { id: "m3-cierre", chapter: "atajos", anchors: ["top-undo"], keys: [["deshacer", "undo"]], steps: [
      { kind: "show", anchor: "top-undo", caption: ["¿Un error? Deshacer, arriba, lo recoge todo.", "A mistake? Undo, up top, takes it all back."] },
    ] },
  ],
};

/* ============ LA BALANZA Y LAS TARJETAS — módulo propio de Ritmo ============
 * Nació como capítulo de Anotar y el fallo 20 de Oscar lo migró: llevar lo
 * que te deben y lo que debes es presupuestar y anticipar, no solo anotar.
 * La etapa 5 de la ola de modos (2026-11-16) ejecuta la migración como
 * recomposición de datos: las escenas conservan sus ids (m3-*) — son las
 * llaves de «Mis escenas» y de los puentes — y su gesto `tap` sobre
 * `debt-tab-loans`, la cura de la pieza 3 de la entrega 1.3.294. */
const BALANZA: Module = {
  id: "balanza", n: 4, title: ["La balanza y las tarjetas", "The scale and the cards"], mode: "ritmo", ready: true,
  promise: ["Al salir, llevas lo que te deben y lo que debes sin perder el hilo.", "By the end, you keep what you're owed and what you owe without losing the thread."],
  chapters: [
    { id: "balanza", title: ["La balanza y las tarjetas", "The scale and the cards"] },
  ],
  scenes: [
    { id: "m3-balanza", chapter: "balanza", anchors: ["debt-scale"], keys: [["balanza", "scale"], ["deudas", "debts"]], steps: [
      { kind: "seed", seed: "anotar-deudas" },
      { kind: "go", screen: "fixed" },
      { kind: "show", anchor: "debt-scale", caption: ["Sobre los libros, la balanza: Me deben contra Debo.", "Above the books, the scale: owed to me against I owe."] },
    ] },
    { id: "m3-medeben", chapter: "balanza", anchors: ["debt-owed"], keys: [["me deben", "owed to me"]], steps: [
      { kind: "go", screen: "vault-owed" },
      { kind: "show", anchor: "debt-owed", caption: ["Me deben: Ana te debe C$5,000; su nombre abre su historia.", "Owed to me: Ana owes you C$5,000; her name opens her history."] },
    ] },
    { id: "m3-interes", chapter: "balanza", anchors: ["debt-owed"], keys: [["interés", "interest"], ["capital", "principal"]], steps: [
      { kind: "show", anchor: "debt-owed", caption: ["Con interés, cada pago se reparte solo: interés y capital.", "With interest, each payment splits itself: interest and principal."] },
    ] },
    { id: "m3-debo", chapter: "balanza", anchors: ["debt-tab-loans", "debt-loans"], keys: [["debo", "i owe"], ["préstamo", "loan"]], steps: [
      { kind: "go", screen: "vault-owe" },
      { kind: "tap", anchor: "debt-tab-loans" },
      { kind: "show", anchor: "debt-loans", caption: ["Debo suma préstamos y tarjetas: aquí, C$20,000 al Banco.", "I owe adds loans and cards: here, C$20,000 to the Bank."] },
    ] },
    { id: "m3-archivo", chapter: "balanza", anchors: ["debt-owed-file"], keys: [["archivo", "file"], ["saldado", "settled"]], steps: [
      { kind: "go", screen: "vault-owed" },
      { kind: "show", anchor: "debt-owed-file", caption: ["Lo saldado se archiva, no se borra: queda su historial.", "Settled debts are filed, not deleted: their history stays."] },
    ] },
    { id: "m3-tarjetas", chapter: "balanza", notMode: "completo", anchors: ["debt-tab-loans", "debt-cards"], keys: [["tarjetas", "cards"]], steps: [
      { kind: "go", screen: "vault-owe" },
      { kind: "tap", anchor: "debt-tab-loans" },
      { kind: "show", anchor: "debt-cards", caption: ["Bajo Debo viven las tarjetas: Actualizar, su hoja.", "Under I owe live the cards: Update, their sheet."] },
    ] },
    { id: "m3-tarjetas-c", chapter: "balanza", mode: "completo", anchors: ["debt-tab-loans", "debt-cards"], keys: [["tarjetas", "cards"], ["canjear", "redeem"]], steps: [
      { kind: "go", screen: "vault-owe" },
      { kind: "tap", anchor: "debt-tab-loans" },
      { kind: "show", anchor: "debt-cards", caption: ["Bajo Debo viven las tarjetas: Actualizar, Canjear, su hoja.", "Under I owe live the cards: Update, Redeem, their sheet."] },
    ] },
  ],
};

const CAMBIO: Module = {
  id: "cambio", n: 5, title: ["El cambio", "The exchange"], mode: "ritmo", ready: true,
  promise: ["Al salir, conviertes y el monto cae solo en el campo abierto.", "By the end, you convert and the amount lands in the open field by itself."],
  chapters: [
    { id: "tasa", title: ["La tasa", "The rate"] },
    { id: "conversor", title: ["El conversor", "The converter"] },
    { id: "usar", title: ["Usar el monto", "Using the amount"] },
  ],
  scenes: [
    { id: "m4-moneda", chapter: "tasa", anchors: ["desk-rate"], keys: [["moneda", "coin"], ["cambio", "exchange"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "do", anchor: "desk-rate", caption: ["La moneda de la cabecera abre el Cambio.", "The header coin opens the Exchange."] },
    ] },
    { id: "m4-tasa", chapter: "tasa", anchors: ["tools-rate"], keys: [["tasa", "rate"]], steps: [
      { kind: "show", anchor: "tools-rate", caption: ["La tasa manda: cada conversión nace de este número.", "The rate rules: every conversion is born from this number."] },
    ] },
    { id: "m4-manual", chapter: "tasa", anchors: ["fx-rate-in"], keys: [["tasa manual", "manual rate"]], steps: [
      { kind: "show", anchor: "fx-rate-in", caption: ["¿Otra tasa? Escríbela aquí y guarda: manda la tuya.", "A different rate? Write it here and save: yours rules."] },
    ] },
    { id: "m4-vista", chapter: "tasa", anchors: ["fx-view"], keys: [["ver en dólares", "view in dollars"]], steps: [
      { kind: "do", anchor: "fx-view", caption: ["«Ver en dólares» viste toda la app de dólares, al instante.", "“View in dollars” dresses the whole app in dollars, instantly."] },
    ] },
    { id: "m4-plegar", chapter: "tasa", anchors: ["fx-fold"], keys: [["plegar", "fold"]], steps: [
      { kind: "do", anchor: "fx-fold", caption: ["El título pliega la placa; la tasa queda en una línea.", "The title folds the plate; the rate stays on one line."] },
    ] },
    { id: "m4-convertir", chapter: "conversor", anchors: ["fx-in"], keys: [["convertir", "convert"]], steps: [
      { kind: "type", anchor: "fx-in", text: ["100", "100.00"], caption: ["Escribe cien dólares y mira el otro lado.", "Type one hundred dollars and watch the other side."] },
    ] },
    { id: "m4-resultado", chapter: "conversor", anchors: ["fx-out"], keys: [["resultado", "result"]], steps: [
      { kind: "show", anchor: "fx-out", caption: ["Cien dólares ya son córdobas: la tasa hizo la cuenta.", "One hundred dollars is now córdobas: the rate did the math."] },
    ] },
    { id: "m4-enviar", chapter: "conversor", anchors: ["fx-send"], keys: [["enviar a", "send to"]], steps: [
      { kind: "show", anchor: "fx-send", caption: ["«Enviar a» lo lleva derecho a una remesa o un gasto.", "“Send to” takes it straight to a remittance or an expense."] },
    ] },
    { id: "m4-cambiar", chapter: "conversor", anchors: ["fx-swap"], keys: [["intercambiar", "swap"]], steps: [
      { kind: "do", anchor: "fx-swap", caption: ["Las flechas intercambian las monedas sin reescribir nada.", "The arrows swap the currencies without retyping anything."] },
    ] },
    { id: "m4-chips", chapter: "conversor", anchors: ["fx-chips"], keys: [["chips", "chips"], ["montos rápidos", "quick amounts"]], steps: [
      { kind: "show", anchor: "fx-chips", caption: ["Los chips ponen montos rápidos; la tuerca los configura.", "The chips set quick amounts; the gear configures them."] },
    ] },
    { id: "m4-guardado", chapter: "conversor", anchors: ["tools-slips"], keys: [["guardados", "saved"], ["papelitos", "slips"]], steps: [
      { kind: "show", anchor: "tools-slips", caption: ["Cada conversión se guarda sola, en su papelito.", "Every conversion saves itself, on its own little slip."], contexto: ["Los papelitos viven en este aparato, no en tu libro.", "The slips live on this device, not in your book."] },
    ] },
    { id: "m4-calc", chapter: "conversor", anchors: ["tools-calc"], keys: [["calculadora", "calculator"]], steps: [
      { kind: "do", anchor: "tools-calc", caption: ["Este icono guarda una calculadora: suma sin salir del Cambio.", "This icon hides a calculator: do the math without leaving the Exchange."] },
    ] },
    { id: "m4-calcular", chapter: "conversor", anchors: ["fx-calc"], keys: [["poner", "put"], ["calcular", "calculate"]], steps: [
      { kind: "show", anchor: "fx-calc", caption: ["Calcula aquí y «Poner» deja el total en el conversor.", "Calculate here and “Put” drops the total into the converter."] },
    ] },
    { id: "m4-cerrar", chapter: "usar", anchors: ["fx-close", "desk-plus"], keys: [["editor rápido", "quick editor"]], steps: [
      { kind: "do", anchor: "fx-close", caption: ["Cierra el Cambio: ahora abre dónde caerá el monto.", "Close the Exchange: now open where the amount will land."] },
      { kind: "do", anchor: "desk-plus", caption: ["La esquina + abre el editor rápido de Central.", "The + corner opens Central's quick editor."] },
    ] },
    { id: "m4-casa", chapter: "usar", anchors: ["quick-fold", "quick-house"], keys: [["la casa", "the house"], ["elegir", "choose"]], steps: [
      { kind: "do", anchor: "quick-fold", caption: ["Elige el grupo donde va a caer el monto.", "Choose the group where the amount will land."] },
      { kind: "do", anchor: "quick-house", caption: ["Y su casa: el editor abre con el monto esperando.", "And its house: the editor opens with the amount waiting."] },
    ] },
    { id: "m4-volver", chapter: "usar", anchors: ["desk-rate"], keys: [["volver", "back"]], steps: [
      { kind: "do", anchor: "desk-rate", caption: ["Vuelve al Cambio desde la moneda de la cabecera.", "Return to the Exchange from the header coin."] },
    ] },
    { id: "m4-otra", chapter: "usar", anchors: ["fx-swap", "fx-in"], keys: [["otra vez", "again"]], steps: [
      { kind: "do", anchor: "fx-swap", caption: ["De vuelta a dólares: las flechas también regresan.", "Back to dollars: the arrows also come back."] },
      { kind: "type", anchor: "fx-in", text: ["100", "100.00"], caption: ["Cien dólares otra vez: el campo de atrás espera.", "One hundred dollars again: the field behind is waiting."] },
    ] },
    { id: "m4-usar", chapter: "usar", anchors: ["fx-use"], keys: [["usar", "use"], ["poner en el campo", "put in the field"]], steps: [
      { kind: "do", anchor: "fx-use", caption: ["«Usar» pone el monto convertido en el campo abierto.", "“Use” puts the converted amount into the open field."] },
    ] },
    { id: "m4-aterriza", chapter: "usar", anchors: ["fx-close", "quick-window"], keys: [["aterriza", "lands"]], steps: [
      { kind: "do", anchor: "fx-close", caption: ["Cierra y mira: el monto ya vive en el editor.", "Close and look: the amount already lives in the editor."] },
      { kind: "show", anchor: "quick-window", caption: ["Ahí está, convertido y puesto: no copiaste nada.", "There it is, converted and placed: you copied nothing."] },
    ] },
  ],
};

const MES: Module = {
  id: "mes", n: 6, title: ["El mes de un vistazo", "The month at a glance"], mode: "esencial", ready: true,
  promise: ["Al salir, lees Central como un tablero: qué entra, qué sale, qué sigue.", "By the end, you read the Desk like a board: what comes in, out, and next."],
  chapters: [
    { id: "discos", title: ["Los discos", "The discs"] },
    { id: "esquinas", title: ["Las esquinas", "The corners"] },
    { id: "viaje", title: ["El viaje del dígito", "The digit's journey"] },
  ],
  scenes: [
    { id: "m5-central", chapter: "discos", anchors: ["desk-left"], keys: [["central", "desk"], ["tablero", "board"]], steps: [
      { kind: "seed", seed: "widget-mes" },
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "desk-left", caption: ["Central lee el mismo libro que el widget: una sola verdad.", "The Desk reads the same book as the widget: one single truth."] },
    ] },
    { id: "m5-tengo", chapter: "discos", anchors: ["lens-have"], keys: [["tengo", "have"]], steps: [
      { kind: "do", anchor: "lens-have", caption: ["Toca Tengo y Central se enfoca en lo que tienes.", "Tap Have and the Desk focuses on what you have."] },
    ] },
    { id: "m5-soltar", chapter: "discos", anchors: ["lens-have"], keys: [["soltar", "release"]], steps: [
      { kind: "do", anchor: "lens-have", caption: ["Tócalo otra vez y el enfoque se suelta.", "Tap it again and the focus releases."] },
    ] },
    { id: "m5-gastare", chapter: "discos", anchors: ["lens-spend"], keys: [["gastaré", "will spend"]], steps: [
      { kind: "do", anchor: "lens-spend", caption: ["Gastaré enfoca lo que saldrá: fijos y variables.", "Will Spend focuses on what's going out: fixed and variable."] },
    ] },
    { id: "m5-pagos", chapter: "discos", anchors: ["lens-debt"], keys: [["pagos", "payments"], ["semáforo", "traffic light"]], steps: [
      { kind: "do", anchor: "lens-debt", caption: ["Pagos es un semáforo: su luz resume tu deuda.", "Payments is a traffic light: its light sums up your debt."] },
    ] },
    { id: "m5-soltar2", chapter: "discos", anchors: ["lens-debt"], keys: [["soltar", "release"]], steps: [
      { kind: "do", anchor: "lens-debt", caption: ["Y se suelta igual: otro toque y vuelves al tablero.", "It releases the same way: another tap, back to the board."] },
    ] },
    { id: "m5-esquina", chapter: "esquinas", anchors: ["desk-minus"], keys: [["esquina", "corner"]], steps: [
      { kind: "show", anchor: "desk-minus", caption: ["La esquina − anota gastos sin salir de Central.", "The − corner notes expenses without leaving the Desk."] },
    ] },
    { id: "m5-atajos", chapter: "esquinas", anchors: ["desk-plus"], keys: [["atajos", "shortcuts"], ["sostener", "hold"]], steps: [
      { kind: "show", anchor: "desk-plus", caption: ["Sostén la esquina un segundo, o tócala dos veces: es un atajo.", "Hold the corner a second, or tap it twice: it's a shortcut."], contexto: ["Los seis atajos se asignan en Ajustes, «Atajos de Central».", "The six shortcuts are assigned in Settings, “Central shortcuts”."] },
    ] },
    { id: "m5-saludo", chapter: "esquinas", anchors: ["desk-minus"], keys: [["saludo", "greeting"]], steps: [
      { kind: "do", anchor: "desk-minus", caption: ["La ventana nace de la esquina, con el color de la casa que elegiste.", "The window is born from the corner, wearing the color of the house you picked."] },
    ] },
    { id: "m5-viaje", chapter: "viaje", anchors: ["book-card"], keys: [["viaje del dígito", "the digit's journey"]], steps: [
      { kind: "go", screen: "fixed" },
      { kind: "show", anchor: "book-card", caption: ["El viaje del dígito empieza en un libro: anota aquí.", "The digit's journey starts in a book: note it here."] },
    ] },
    { id: "m5-forma", chapter: "viaje", anchors: ["book-add"], keys: [["editor", "editor"]], steps: [
      { kind: "do", anchor: "book-add", caption: ["Abre el editor de Fijos con el + del libro.", "Open the Fixed editor with the book's +."] },
    ] },
    { id: "m5-escribe", chapter: "viaje", anchors: ["line-concept", "line-amount"], keys: [["escribir", "write"]], steps: [
      { kind: "type", anchor: "line-concept", text: ["Luz del taller", "Workshop light"], caption: ["Un nombre claro: «Luz del taller».", "A clear name: “Workshop light”."] },
      { kind: "type", anchor: "line-amount", text: ["1000", "1000.00"], caption: ["Y su monto: mil córdobas redondos.", "And its amount: a round thousand córdobas."] },
    ] },
    { id: "m5-guarda", chapter: "viaje", anchors: ["line-save", "ask-yes"], keys: [["guardar", "save"]], steps: [
      { kind: "do", anchor: "line-save", caption: ["Guarda el registro.", "Save the entry."] },
      { kind: "do", anchor: "ask-yes", caption: ["Y confirma: el dígito ya nació.", "And confirm: the digit is born."] },
    ] },
    { id: "m5-vuelve", chapter: "viaje", anchors: ["lens-spend"], keys: [["gastaré", "will spend"], ["volvió", "it moved"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "lens-spend", caption: ["Vuelve a Central: Gastaré ya cuenta los mil.", "Back at the Desk: Will Spend already counts the thousand."] },
    ] },
    { id: "m5-cierre", chapter: "viaje", anchors: ["desk-left"], keys: [["tres lecturas", "three readings"]], steps: [
      { kind: "show", anchor: "desk-left", caption: ["Un dígito, tres lecturas: libro, tablero y consejo.", "One digit, three readings: book, board, and advice."], contexto: ["Con el mes vacío, Central ofrece copiar el anterior o cargar el ejemplo.", "With an empty month, the Desk offers copying the last one or loading the sample."] },
    ] },
  ],
};

const AHORROS: Module = {
  id: "ahorros", n: 7, title: ["Ahorros", "Savings"], mode: "ritmo", ready: true,
  promise: ["Al salir, tus bolsillos y su bóveda te obedecen: cada fondo en su sitio.", "By the end, your pockets and their vault obey you: every fund in its place."],
  chapters: [
    { id: "banda", title: ["La banda y los bolsillos", "The band and the pockets"] },
    { id: "boveda", title: ["La bóveda en Libros", "The vault in Books"] },
  ],
  scenes: [
    { id: "m6-banda", chapter: "banda", anchors: ["desk-save"], keys: [["banda", "band"], ["ahorros", "savings"]], steps: [
      { kind: "seed", seed: "ahorros-mes" },
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "desk-save", caption: ["La banda de Ahorros no es un letrero: es una puerta.", "The Savings band is not a sign: it's a door."] },
    ] },
    { id: "m6-segmento", chapter: "banda", anchors: ["desk-pocket"], keys: [["bolsillo", "pocket"]], steps: [
      { kind: "do", anchor: "desk-pocket", caption: ["Toca un bolsillo y su libro se despliega aquí mismo.", "Tap a pocket and its book unfolds right here."] },
    ] },
    { id: "m6-libro", chapter: "banda", anchors: ["vault-ledger"], keys: [["libro del bolsillo", "the pocket's book"]], steps: [
      { kind: "show", anchor: "vault-ledger", caption: ["Cada bolsillo guarda su propio libro de movimientos.", "Every pocket keeps its own book of movements."] },
    ] },
    { id: "m6-banco", chapter: "banda", anchors: ["desk-accounts"], keys: [["banco", "bank"], ["cuentas", "accounts"]], steps: [
      { kind: "do", anchor: "desk-accounts", caption: ["El banco despliega las cuentas que viven en la bóveda.", "The bank unfolds the accounts living in the vault."] },
    ] },
    { id: "m6-cuentas", chapter: "banda", anchors: ["vault-accounts"], keys: [["cuentas bancarias", "bank accounts"]], steps: [
      { kind: "show", anchor: "vault-accounts", caption: ["Las cuentas se cuentan aparte de los bolsillos.", "The accounts are counted apart from the pockets."] },
    ] },
    { id: "m6-cifra", chapter: "banda", anchors: ["vault-figure"], keys: [["la cifra", "the figure"], ["saldo", "balance"]], steps: [
      { kind: "show", anchor: "vault-figure", caption: ["La cifra de una cuenta es botón: ajusta su saldo ahí.", "An account's figure is a button: adjust its balance there."] },
    ] },
    { id: "m6-mover", chapter: "banda", minMode: "completo", anchors: ["vault-grip"], keys: [["mover", "move"], ["agarre", "grip"]], steps: [
      { kind: "show", anchor: "vault-grip", caption: ["El agarre de una fila la vuelve mudanza entre bolsillos.", "A row's grip turns it into a move between pockets."] },
    ] },
    { id: "m6-boveda", chapter: "boveda", anchors: ["vault-ledger"], keys: [["bóveda", "vault"]], steps: [
      { kind: "go", screen: "vault-meta" },
      { kind: "show", anchor: "vault-ledger", caption: ["En Libros, la bóveda abre cada bolsillo a pantalla entera.", "In Books, the vault opens each pocket full-screen."] },
    ] },
    { id: "m6-lampara", chapter: "boveda", minMode: "completo", anchors: ["vault-sort"], keys: [["lámpara", "lamp"], ["ordenar", "sort"]], steps: [
      { kind: "show", anchor: "vault-sort", caption: ["La lámpara enciende el orden: flechas para mover bloques.", "The lamp turns on ordering: arrows to move blocks."] },
    ] },
    { id: "m6-corte", chapter: "boveda", anchors: ["book-span"], keys: [["corte", "cut"], ["período", "period"]], steps: [
      { kind: "show", anchor: "book-span", caption: ["El corte por período resume semana, mes o año.", "The period cut sums up the week, month, or year."] },
    ] },
  ],
};

const ESTADISTICAS: Module = {
  id: "estadisticas", n: 8, title: ["Leer las estadísticas", "Reading the statistics"], mode: "completo", ready: true,
  promise: ["Al salir, sabes qué mirar primero y qué dejar para después.", "By the end, you know what to read first and what to leave for later."],
  chapters: [
    { id: "tarjetas", title: ["Las tarjetas", "The cards"] },
    { id: "numeros", title: ["Números clave y su cálculo", "Key numbers and their math"] },
    { id: "orden", title: ["El orden de lectura", "The reading order"] },
  ],
  scenes: [
    { id: "m7-estudio", chapter: "tarjetas", anchors: ["pulse"], keys: [["estudio", "study"], ["estadísticas", "statistics"]], steps: [
      { kind: "seed", seed: "estudio-meses" },
      { kind: "go", screen: "stats" },
      { kind: "show", anchor: "pulse", caption: ["Estudio lee los mismos libros: cada tarjeta, una pregunta.", "Study reads the same books: every card, one question."] },
    ] },
    { id: "m7-tarjetas", chapter: "tarjetas", anchors: ["health"], keys: [["salud", "health"]], steps: [
      { kind: "show", anchor: "health", caption: ["Cada tarjeta existe solo si tiene datos que leer.", "Every card exists only if it has data to read."], contexto: ["Sin datos, la tarjeta ni siquiera nace: nada de adornos vacíos.", "With no data, the card isn't even born: no empty ornaments."] },
    ] },
    { id: "m7-pliegue", chapter: "tarjetas", anchors: ["chev-numeros"], keys: [["plegar", "fold"], ["desplegar", "unfold"]], steps: [
      { kind: "do", anchor: "chev-numeros", caption: ["Las tarjetas se pliegan y despliegan por su esquina.", "Cards fold and unfold from their corner."] },
    ] },
    { id: "m7-tiempo", chapter: "tarjetas", anchors: ["time"], keys: [["tiempo", "time"], ["entra sale queda", "in out left"]], steps: [
      { kind: "show", anchor: "time", caption: ["«Tiempo» dibuja qué entra, qué sale y qué queda.", "“Time” draws what comes in, goes out, and stays."] },
    ] },
    { id: "m7-ano", chapter: "tarjetas", anchors: ["year"], keys: [["el año", "the year"]], steps: [
      { kind: "show", anchor: "year", caption: ["El año entero se navega: doce meses de un vistazo.", "The whole year is navigable: twelve months at a glance."] },
    ] },
    { id: "m7-colchon", chapter: "tarjetas", anchors: ["cushion"], keys: [["colchón", "cushion"]], steps: [
      { kind: "show", anchor: "cushion", caption: ["El colchón mide cuánto aguantas sin que entre nada.", "The cushion measures how long you last with nothing coming in."] },
    ] },
    { id: "m7-dial", chapter: "tarjetas", anchors: ["whatif"], keys: [["¿y si apartara?", "what if I saved?"], ["dial", "dial"]], steps: [
      { kind: "show", anchor: "whatif", caption: ["El dial «¿Y si apartara…?» prueba fotos sin tocar el libro.", "The “What if I saved…?” dial tries photos without touching the book."] },
    ] },
    { id: "m7-dona", chapter: "tarjetas", anchors: ["where"], keys: [["la dona", "the donut"], ["a dónde va", "where it goes"]], steps: [
      { kind: "show", anchor: "where", caption: ["La dona reparte el gasto; tocarla baja hasta las tiendas.", "The donut splits the spending; tapping it descends to the shops."] },
    ] },
    { id: "m7-sankey", chapter: "tarjetas", anchors: ["sankey"], keys: [["el flujo", "the flow"], ["sankey", "sankey"]], steps: [
      { kind: "show", anchor: "sankey", caption: ["El río de plata aísla un flujo cuando lo tocas.", "The money river isolates a flow when you tap it."] },
    ] },
    { id: "m7-numeros", chapter: "numeros", anchors: ["numeros"], keys: [["números clave", "key numbers"]], steps: [
      { kind: "show", anchor: "numeros", caption: ["Números clave: las cifras que tu mes produce solo, cada una con su explicación.", "Key numbers: the figures your month produces on its own, each with its explanation."] },
    ] },
    { id: "m7-pregunta", chapter: "numeros", anchors: ["kn-first"], keys: [["la pregunta", "the question"]], steps: [
      { kind: "do", anchor: "kn-first", caption: ["Cada número trae su (?): tócalo y abre su burbuja.", "Every number carries its (?): tap it and open its bubble."] },
    ] },
    { id: "m7-calculo", chapter: "numeros", anchors: ["hint-calc"], keys: [["ver el cálculo", "see the math"]], steps: [
      { kind: "do", anchor: "hint-calc", caption: ["«Ver el cálculo» abre la hoja con la cuenta viva.", "“See the math” opens the sheet with the live calculation."] },
    ] },
    { id: "m7-hoja", chapter: "numeros", anchors: ["xp-sheet"], keys: [["la hoja", "the sheet"]], steps: [
      { kind: "show", anchor: "xp-sheet", caption: ["Qué es, cómo se calcula y qué significa para ti.", "What it is, how it's worked out, and what it means for you."] },
    ] },
    { id: "m7-pin", chapter: "orden", anchors: ["numeros"], keys: [["pin", "pin"], ["orden", "order"]], steps: [
      { kind: "show", anchor: "numeros", caption: ["El pin de cada tarjeta la deja abierta y a tu orden.", "Each card's pin keeps it open, in your own order."] },
    ] },
    { id: "m7-cierre", chapter: "orden", anchors: ["pace"], keys: [["ritmo", "pace"], ["leer primero", "read first"]], steps: [
      { kind: "show", anchor: "pace", caption: ["Lee primero lo grande: entró, salió, quedó, tu ritmo.", "Read the big things first: in, out, left, your pace."] },
    ] },
  ],
};

const ASESOR: Module = {
  id: "asesor", n: 9, title: ["El Asesor", "The Advisor"], mode: "completo", ready: true,
  promise: ["Al salir, cada consejo te resulta trazable hasta el movimiento que lo causó.", "By the end, every piece of advice traces back to the movement that caused it."],
  chapters: [
    { id: "torre", title: ["La torre del mes", "The month's tower"] },
    { id: "reglas", title: ["Reglas y horizontes", "Rules and horizons"] },
    { id: "palanca", title: ["La palanca «Si apartas»", "The “If you set aside” lever"] },
    { id: "plan", title: ["El plan y el simulador", "The plan and the simulator"] },
  ],
  scenes: [
    { id: "m8-asesor", chapter: "torre", anchors: ["coach"], keys: [["asesor", "advisor"]], steps: [
      { kind: "seed", seed: "asesor-meses" },
      { kind: "go", screen: "advice" },
      { kind: "show", anchor: "coach", caption: ["El Asesor no inventa: lee tus libros y razona en voz alta.", "The Advisor never invents: it reads your books and reasons out loud."] },
    ] },
    { id: "m8-base", chapter: "torre", anchors: ["advice-basis"], keys: [["la base", "the basis"]], steps: [
      { kind: "show", anchor: "advice-basis", caption: ["Cada lectura declara su base: qué meses está mirando.", "Every reading declares its basis: which months it's looking at."] },
    ] },
    { id: "m8-torre", chapter: "torre", anchors: ["advice-tower"], keys: [["la torre", "the tower"]], steps: [
      { kind: "do", anchor: "advice-tower", caption: ["La torre del mes se abre por partes: toca y despliega.", "The month's tower opens in parts: tap and unfold."] },
    ] },
    { id: "m8-fichas", chapter: "torre", anchors: ["advice-tiles"], keys: [["las fichas", "the tiles"]], steps: [
      { kind: "show", anchor: "advice-tiles", caption: ["Las fichas ponen la lectura en números: lo esencial del mes, sin prosa.", "The tiles put the reading into numbers: the month's essentials, no prose."] },
    ] },
    { id: "m8-desplegar", chapter: "torre", anchors: ["advice-tiles", "advice-unfold"], keys: [["desplegar", "unfold all"]], steps: [
      { kind: "tap", anchor: "advice-tiles" },
      { kind: "show", anchor: "advice-unfold", caption: ["«Desplegar» abre todas las tarjetas de una sola vez.", "“Unfold” opens every card in one go."] },
    ] },
    { id: "m8-pilares", chapter: "torre", anchors: ["coach-pillars"], keys: [["pilares", "pillars"]], steps: [
      { kind: "show", anchor: "coach-pillars", caption: ["Los pilares separan lo que está firme de lo frágil.", "The pillars separate what is firm from what is fragile."] },
    ] },
    { id: "m8-reglas", chapter: "reglas", anchors: ["advice-rules"], keys: [["las reglas", "the rules"], ["umbral", "threshold"]], steps: [
      { kind: "show", anchor: "advice-rules", caption: ["Siete reglas vigilan; bajo su umbral, el Asesor calla.", "Seven rules keep watch; below their threshold, the Advisor stays silent."] },
    ] },
    { id: "m8-ritmo", chapter: "reglas", anchors: ["advice-rules"], keys: [["ritmo", "pace"], ["curva", "curve"]], steps: [
      { kind: "show", anchor: "advice-rules", caption: ["Una regla aprendió tu curva: ya no proyecta en línea recta.", "One rule learned your curve: it no longer projects in a straight line."], contexto: ["Si tu mes arranca fuerte, ya no te asusta con un cierre que no será así.", "If your month starts strong, it no longer scares you with a close that won't look like that."] },
    ] },
    { id: "m8-horizontes", chapter: "reglas", anchors: ["advice-medium-cards"], keys: [["tarjetas", "cards"], ["horizontes", "horizons"]], steps: [
      { kind: "show", anchor: "advice-medium-cards", caption: ["Tus tarjetas entran en la lectura: saldo, uso y mínimo.", "Your cards enter the reading: balance, use, and minimum."] },
    ] },
    { id: "m6-palanca", chapter: "palanca", anchors: ["lever"], keys: [["palanca", "lever"], ["si apartas", "if you set aside"]], steps: [
      { kind: "go", screen: "vault-meta" },
      { kind: "show", anchor: "lever", caption: ["La palanca «Si apartas» proyecta sin mover un córdoba.", "The “If you set aside” lever projects without moving a córdoba."], contexto: ["Una proyección es una foto, no una cuota: nada se aparta solo.", "A projection is a photo, not a quota: nothing is set aside by itself."] },
    ] },
    { id: "m6-abrir", chapter: "palanca", anchors: ["lever-open"], keys: [["abrir la palanca", "open the lever"], ["riel", "rail"]], steps: [
      { kind: "do", anchor: "lever-open", caption: ["Ábrela y aparece el riel con sus marcas de tiempo.", "Open it and the rail appears, with its time marks."] },
    ] },
    { id: "m6-anos", chapter: "palanca", anchors: ["lever-years"], keys: [["años", "years"]], steps: [
      { kind: "do", anchor: "lever-years", caption: ["Los años se tocan y se editan: la foto cambia contigo.", "The years can be tapped and edited: the photo changes with you."] },
    ] },
    { id: "m6-pin", chapter: "palanca", anchors: ["lever-pin"], keys: [["pin", "pin"], ["fijar", "pin"]], steps: [
      { kind: "show", anchor: "lever-pin", caption: ["El pin la deja abierta entre visitas; sin pin, nace plegada.", "The pin keeps it open between visits; unpinned, it starts folded."] },
    ] },
    { id: "m6-cierre", chapter: "palanca", anchors: ["vault-ledger"], keys: [["cerrar", "closing"]], steps: [
      { kind: "show", anchor: "vault-ledger", caption: ["Ahorrar es mirar fotos honestas: el dinero se mueve anotando.", "Saving is looking at honest photos: money moves by noting it."] },
    ] },
    { id: "m8-plan", chapter: "plan", anchors: ["advice-tower", "advice-plan"], keys: [["el plan", "the plan"], ["por dónde empezar", "where to start"]], steps: [
      { kind: "go", screen: "advice" },
      { kind: "show", anchor: "advice-tower", caption: ["El plan nace de esta lectura: la torre ya puso el mes en orden.", "The plan is born from this reading: the tower already put the month in order."] },
      { kind: "show", anchor: "advice-plan", caption: ["El plan «Por dónde empezar» ordena los pasos.", "The “Where to start” plan orders the steps."] },
    ] },
    { id: "m8-sim", chapter: "plan", anchors: ["advice-sim"], keys: [["simulador", "simulator"], ["explorar", "explore"]], steps: [
      { kind: "show", anchor: "advice-sim", caption: ["El simulador prueba escenarios sin tocar los libros.", "The simulator tries scenarios without touching the books."], contexto: ["Al aplicar, Faro lo dice claro: «Explorar no cambió los libros».", "When you apply, Faro says it plainly: “Exploring did not change the books.”"] },
    ] },
    { id: "m8-aplicar", chapter: "plan", anchors: ["advice-apply"], keys: [["aplicar", "apply"]], steps: [
      { kind: "do", anchor: "advice-apply", caption: ["Aplica un escenario y lee el resultado en el plan.", "Apply a scenario and read the outcome in the plan."] },
    ] },
    { id: "m8-copiar", chapter: "plan", anchors: ["advice-copy"], keys: [["copiar plan", "copy plan"]], steps: [
      { kind: "show", anchor: "advice-copy", caption: ["«Copiar plan» copia la verdad: pasos, montos y caducidad.", "“Copy plan” copies the truth: steps, amounts, and its expiry."] },
    ] },
    { id: "m8-palabras", chapter: "plan", anchors: ["coach-words"], keys: [["palabras simples", "simple words"]], steps: [
      { kind: "do", anchor: "coach-words", caption: ["«En palabras simples» lo dice sin vueltas, para compartir.", "“In simple words” says it plainly, ready to share."] },
    ] },
    { id: "m8-cierre", chapter: "plan", anchors: ["coach-steps"], keys: [["el viaje cierra", "the journey closes"]], steps: [
      { kind: "show", anchor: "coach-steps", caption: ["El viaje del dígito cierra: anotaste, se movió, te aconsejó.", "The digit's journey closes: you noted it, it moved, it advised you."] },
    ] },
  ],
};

const FOLIOS: Module = {
  id: "folios", n: 10, title: ["Folios · El río", "Folios · The river"], mode: "esencial", ready: true,
  promise: ["Al salir, sigues tu dinero hacia atrás sin perderte: el río y sus filtros.", "By the end, you follow your money backwards without getting lost: the river and its filters."],
  chapters: [
    { id: "rio", title: ["El río", "The river"] },
  ],
  scenes: [
    { id: "m9-folios", chapter: "rio", anchors: ["folios-chips"], keys: [["folios", "folios"]], steps: [
      { kind: "seed", seed: "folios-mes" },
      { kind: "go", screen: "historial" },
      { kind: "show", anchor: "folios-chips", caption: ["Folios guarda dos cuartos sin tocarse: el río y el descanso.", "Folios keeps two rooms that never touch: the river and the rest."] },
    ] },
    { id: "m9-rio", chapter: "rio", anchors: ["hist-totals"], keys: [["el río", "the river"], ["totales", "totals"]], steps: [
      { kind: "show", anchor: "hist-totals", caption: ["El río: cada movimiento, con los totales de ESTA vista.", "The river: every movement, with THIS view's totals."] },
    ] },
    { id: "m9-filtros", chapter: "rio", anchors: ["hist-filters"], keys: [["filtros", "filters"]], steps: [
      { kind: "do", anchor: "hist-filters", caption: ["Los filtros se abren aquí: dirección, libro, categoría…", "The filters open here: direction, book, category…"] },
    ] },
    { id: "m9-panel", chapter: "rio", anchors: ["hist-panel"], keys: [["combinar", "combine"]], steps: [
      { kind: "show", anchor: "hist-panel", caption: ["Se combinan a la vez: todos tienen que cumplirse.", "They combine at once: every one must hold."] },
    ] },
    { id: "m9-vistas", chapter: "rio", minMode: "ritmo", anchors: ["hist-views-btn"], keys: [["vistas", "views"]], steps: [
      { kind: "do", anchor: "hist-views-btn", caption: ["Una vista guarda tu combinación de filtros.", "A view saves your combination of filters."] },
    ] },
    { id: "m9-nombre", chapter: "rio", minMode: "ritmo", anchors: ["hist-view-save"], keys: [["tu nombre", "your name"]], steps: [
      { kind: "show", anchor: "hist-view-save", caption: ["Y la guardas con TU nombre, para volver en un toque.", "And you save it under YOUR name, to return in one tap."] },
    ] },
    { id: "m9-procedencia", chapter: "rio", anchors: ["hist-row"], keys: [["procedencia", "provenance"]], steps: [
      { kind: "show", anchor: "hist-row", caption: ["Cada fila dice su procedencia y su libro.", "Every row states its provenance and its book."], contexto: ["El río baja de catorce en catorce días para no ahogar la pantalla.", "The river descends fourteen days at a time, so the screen never drowns."] },
    ] },
  ],
};

/* ============ FOLIOS · EL DESCANSO Y LA PUERTA — la otra mitad (Completo) ====
 * El fallo 19 parte Folios en dos: el río es de Esencial; cerrar un periodo,
 * apartarlo y custodiar la puerta es interpretar el sistema entero. La
 * partición se ejecutó en la etapa 5 de la ola de modos (2026-11-16) como
 * recomposición de datos; las escenas conservan sus ids (m9-*). El Archivo
 * como superficie vive en los tres modos (fallo 15): lo que este módulo
 * enseña es su uso pleno. */
const FOLIOS_DESCANSO: Module = {
  id: "folios-descanso", n: 11, title: ["Folios · El descanso y la puerta", "Folios · Rest and the door"], mode: "completo", ready: true,
  promise: ["Al salir, cierras un periodo y lo guardas sabiendo qué se puede deshacer y qué no.", "By the end, you close a period and put it away knowing what can be undone and what can't."],
  chapters: [
    { id: "descanso", title: ["El descanso", "The rest"] },
    { id: "puerta", title: ["La puerta", "The door"] },
  ],
  scenes: [
    { id: "m9-archivo", chapter: "descanso", anchors: ["folios-tab-archivo"], keys: [["archivo", "archive"]], steps: [
      { kind: "seed", seed: "folios-mes" },
      { kind: "do", anchor: "folios-tab-archivo", caption: ["La pastilla Archivo: el mismo Folios, el otro cuarto.", "The Archive pill: the same Folios, the other room."] },
    ] },
    { id: "m9-union", chapter: "descanso", anchors: ["arch-card"], keys: [["unión", "union"]], steps: [
      { kind: "show", anchor: "arch-card", caption: ["El Archivo es una unión: cada cosa con su origen.", "The Archive is a union: everything with its origin."], contexto: ["Al apartar, el dato sale en la FUENTE: ningún total lo sigue contando.", "When you set something aside, it leaves at the SOURCE: no total keeps counting it."] },
    ] },
    { id: "m9-restaurar", chapter: "descanso", anchors: ["arch-restore"], keys: [["restaurar", "restore"]], steps: [
      { kind: "show", anchor: "arch-restore", caption: ["Restaurar devuelve cada cosa por la puerta de su área.", "Restore returns each thing through its own area's door."] },
    ] },
    { id: "m9-escalera", chapter: "puerta", anchors: ["arch-card"], keys: [["la escalera", "the ladder"]], steps: [
      { kind: "show", anchor: "arch-card", caption: ["La escalera: activo, Archivo, y solo después, Eliminar.", "The ladder: active, Archive, and only then, Delete."] },
    ] },
    { id: "m9-eliminar", chapter: "puerta", anchors: ["arch-delete"], keys: [["eliminar", "delete"]], steps: [
      { kind: "do", anchor: "arch-delete", caption: ["Eliminar no es un botón más: abre la puerta seria.", "Delete is no ordinary button: it opens the serious door."] },
    ] },
    { id: "m9-puerta", chapter: "puerta", anchors: ["ask-dialog"], keys: [["la puerta", "the door"], ["el correo", "the email"]], steps: [
      { kind: "show", anchor: "ask-dialog", caption: ["La puerta pide tu correo escrito a mano, exacto.", "The door asks for your email, typed by hand, exact."], contexto: ["«Descargar mi libro primero» guarda tu copia antes del no retorno.", "“Download my book first” saves your copy before the point of no return."] },
    ] },
    { id: "m9-cancelar", chapter: "puerta", anchors: ["ask-no"], keys: [["cancelar", "cancel"]], steps: [
      { kind: "do", anchor: "ask-no", caption: ["Cancelar no toca nada: el período sigue descansando.", "Cancelling touches nothing: the period keeps resting."] },
    ] },
    { id: "m9-cierre", chapter: "puerta", anchors: ["folios-chips"], keys: [["cerrar", "closing"]], steps: [
      { kind: "show", anchor: "folios-chips", caption: ["Apartar se deshace; eliminar, no: por eso existe la puerta.", "Setting aside can be undone; deleting can't: that's why the door exists."] },
    ] },
  ],
};

const ESTRUCTURA: Module = {
  id: "estructura", n: 12, title: ["Estructura y el sistema entero", "Structure and the whole system"], mode: "completo", ready: true,
  promise: ["Al salir, la casa entera — árbol, catálogo, copias — se te hace visible.", "By the end, the whole house — tree, catalog, backups — becomes visible to you."],
  chapters: [
    { id: "ajustes", title: ["Ajustes por dentro", "Settings from inside"] },
    { id: "arbol", title: ["El árbol y la tarjeta", "The tree and the card"] },
    { id: "catalogo", title: ["El catálogo y los bancos", "The catalog and the banks"] },
    { id: "copias", title: ["Copias y cuenta", "Backups and account"] },
  ],
  scenes: [
    { id: "m10-ajustes", chapter: "ajustes", anchors: ["aj-theme"], keys: [["ajustes", "settings"], ["pliegues", "folds"]], steps: [
      { kind: "go", screen: "settings" },
      { kind: "show", anchor: "aj-theme", caption: ["Cada fila de Ajustes es una puerta: la fila misma abre.", "Every Settings row is a door: the row itself opens."] },
    ] },
    { id: "m10-temas", chapter: "ajustes", anchors: ["aj-theme"], keys: [["temas", "themes"]], steps: [
      { kind: "do", anchor: "aj-theme", caption: ["Temas: colores de día y de noche para toda la casa.", "Themes: day and night colors for the whole house."] },
    ] },
    { id: "m10-widget", chapter: "ajustes", anchors: ["aj-widget"], keys: [["widget", "widget"], ["pantalla de inicio", "home screen"]], steps: [
      { kind: "do", anchor: "aj-widget", caption: ["La tarjeta Widget manda en tu pantalla de inicio: montos y fijas.", "The Widget card rules your home screen: amounts and pins."], contexto: ["Aquí vive también «Ocultar montos»: puntos en vez de cifras.", "«Hide amounts» lives here too: dots instead of figures."] },
    ] },
    { id: "m10-fijadas", chapter: "ajustes", anchors: ["aj-widget"], keys: [["fijadas", "pinned"], ["fijar", "pin"], ["buscar categorías", "search categories"]], steps: [
      { kind: "show", anchor: "aj-widget", caption: ["En «Fijadas», la lupa encuentra cualquier categoría de tu estructura.", "Under “Pinned”, the lens finds any category in your structure."], contexto: ["Resultados y fijadas se ordenan en dos grupos plegables: Ingreso y Gasto. Las suscripciones no se fijan.", "Results and pins sort into two folding groups: Income and Expense. Subscriptions never pin."] },
    ] },
    { id: "m10-fijar", chapter: "ajustes", anchors: ["aj-widget"], keys: [["fijar en el widget", "pin to the widget"], ["tarjeta de apuntes", "note card"]], steps: [
      { kind: "show", anchor: "aj-widget", caption: ["Tocas una y Faro pregunta antes de fijarla: nada se fija en silencio.", "Tap one and Faro asks before pinning: nothing pins in silence."], contexto: ["Sale en la tarjeta de apuntes del widget: anotas sin abrir Faro. También se fijan tiendas e IA, bajo Gasto.", "It lands on the widget's note card: jot without opening Faro. Shops and AI providers pin too, under Expense."] },
    ] },
    { id: "m10-estructura", chapter: "arbol", anchors: ["aj-structure"], keys: [["estructura", "structure"]], steps: [
      { kind: "do", anchor: "aj-structure", caption: ["Estructura: aquí se construye la casa — categorías, tiendas y plantillas.", "Structure: the house is built here — categories, stores, and templates."] },
    ] },
    { id: "m10-arbol", chapter: "arbol", anchors: ["aj-tree"], keys: [["el árbol", "the tree"]], steps: [
      { kind: "show", anchor: "aj-tree", caption: ["El árbol nace plegado por grupos; la búsqueda despliega.", "The tree is born folded by groups; search unfolds it."] },
    ] },
    { id: "m10-grupo", chapter: "arbol", anchors: ["est-group"], keys: [["el grupo", "the group"]], steps: [
      { kind: "do", anchor: "est-group", caption: ["Un grupo se despliega tocando su cabecera.", "A group unfolds by tapping its header."] },
    ] },
    { id: "m10-fila", chapter: "arbol", anchors: ["est-cat"], keys: [["una categoría", "a category"]], steps: [
      { kind: "do", anchor: "est-cat", caption: ["Toca una categoría y su tarjeta se abre debajo.", "Tap a category and its card opens below."] },
    ] },
    { id: "m10-tarjeta", chapter: "arbol", anchors: ["est-panel"], keys: [["la tarjeta", "the card"]], steps: [
      { kind: "show", anchor: "est-panel", caption: ["La tarjeta lo prepara todo; nada cambia hasta Guardar.", "The card stages everything; nothing changes until Save."] },
    ] },
    { id: "m10-rejilla", chapter: "arbol", anchors: ["est-grid"], keys: [["la rejilla", "the grid"]], steps: [
      { kind: "show", anchor: "est-grid", caption: ["La rejilla de subcategorías nunca se estira: se reordena.", "The subcategory grid never stretches: it re-flows."] },
    ] },
    { id: "m10-placa", chapter: "arbol", anchors: ["est-sub"], keys: [["la placa", "the plate"]], steps: [
      { kind: "do", anchor: "est-sub", caption: ["Toca la placa de una subcategoría y florece.", "Tap a subcategory's plate and it blooms."] },
    ] },
    { id: "m10-mano", chapter: "arbol", anchors: ["est-hand"], keys: [["la mano", "the hand"], ["lápiz paleta ojo papelera", "pen palette eye trash"]], steps: [
      { kind: "show", anchor: "est-hand", caption: ["La mano: lápiz, paleta, ojo y papelera — siempre igual.", "The hand: pen, palette, eye, and trash — always the same."] },
    ] },
    { id: "m10-guardar", chapter: "arbol", anchors: ["est-save"], keys: [["guardar", "save"]], steps: [
      { kind: "show", anchor: "est-save", caption: ["Guardar asienta; Cancelar te deja donde empezaste.", "Save commits; Cancel leaves you where you started."], contexto: ["Las categorías no tienen papelera: se ocultan, no se queman.", "Categories have no trash: they are hidden, never burned."] },
    ] },
    { id: "m10-catalogo", chapter: "catalogo", anchors: ["aj-catalog"], keys: [["el catálogo", "the catalog"]], steps: [
      { kind: "do", anchor: "aj-catalog", caption: ["La cabecera del Catálogo también es puerta.", "The Catalog's header is a door too."] },
    ] },
    { id: "m10-reemplazo", chapter: "catalogo", anchors: ["est-catalog"], keys: [["reemplazar", "replace"]], steps: [
      { kind: "show", anchor: "est-catalog", caption: ["Aquí la paleta cambia de oficio: reemplaza la tienda.", "Here the palette has another job: it replaces the store."] },
    ] },
    { id: "m10-orden", chapter: "catalogo", anchors: ["est-catalog"], keys: [["reordenar", "reorder"], ["arrastrar", "drag"]], steps: [
      { kind: "show", anchor: "est-catalog", caption: ["Mantén una tarjeta y arrastra: el catálogo se reordena.", "Hold a card and drag: the catalog reorders itself."], contexto: ["El orden queda guardado; el scroll de siempre no mueve nada.", "The order saves itself; ordinary scrolling moves nothing."] },
    ] },
    { id: "m10-seguro", chapter: "catalogo", anchors: ["est-seguro"], keys: [["seguro de vida", "life insurance"], ["primerica", "primerica"]], steps: [
      { kind: "show", anchor: "est-seguro", caption: ["Seguro de vida: tu póliza como cargo ordenado, con su plan y su historial.", "Life insurance: your policy as a tidy charge, with its plan and its history."], contexto: ["Primerica espera sin monto puesto; la tuya la añades con el tuyo.", "Primerica waits with no amount set; you add yours with your own."] },
    ] },
    { id: "m10-plan", chapter: "catalogo", anchors: ["est-seguro"], keys: [["plan del seguro", "insurance plan"], ["fecha de inicio", "start date"]], steps: [
      { kind: "show", anchor: "est-seguro", caption: ["Su Plan: monto, día fijo o semana del mes, y cuenta de retiro.", "Its Plan: amount, a fixed day or a week of the month, and its account."], contexto: ["Su mano trae Plan en vez de pin: como las suscripciones, no se fija.", "Its hand carries Plan instead of a pin: like subscriptions, it never pins."] },
      { kind: "show", anchor: "est-seguro", caption: ["Con la fecha de inicio, cuenta tus meses y suma solo primas archivadas.", "With its start date, it counts your months and sums only filed premiums."], contexto: ["Su cargo vive en Fijos bajo Seguros · Vida, y la Primerica del Retiro es otra: dinero que tienes.", "Its charge lives in Fixed under Insurance · Life, and the Retirement Primerica is another one: money you hold."] },
    ] },
    { id: "m10-bancos", chapter: "catalogo", anchors: ["aj-banks"], keys: [["bancos", "banks"]], steps: [
      { kind: "show", anchor: "aj-banks", caption: ["Debo muestra la deuda; aquí viven sus condiciones: banco, tasa y bonos de cada tarjeta.", "I Owe shows the debt; here live its terms: each card's bank, rate, and bonuses."] },
    ] },
    { id: "m10-copias", chapter: "copias", anchors: ["aj-backup"], keys: [["copias", "backups"]], steps: [
      { kind: "show", anchor: "aj-backup", caption: ["Copias: la bóveda de tu libro, en el equipo y la nube.", "Backups: your book's vault, on device and in the cloud."] },
    ] },
    { id: "m10-cuenta", chapter: "copias", anchors: ["aj-account"], keys: [["cuenta", "account"]], steps: [
      { kind: "show", anchor: "aj-account", caption: ["Cuenta gobierna tu entrada: la sesión, la nube y la huella que te deja pasar.", "Account guards your way in: session, cloud, and the fingerprint that lets you pass."] },
    ] },
    { id: "m10-version", chapter: "copias", anchors: ["aj-version"], keys: [["la versión", "the version"]], steps: [
      { kind: "show", anchor: "aj-version", caption: ["Al pie, el sello de versión: la verdad de qué corre.", "At the foot, the version seal: the truth of what runs."] },
    ] },
  ],
};

const PUERTAS: Module = {
  id: "puertas", n: 13, title: ["Las puertas serias", "The serious doors"], mode: "esencial", ready: true,
  promise: ["Al salir, sabes qué es peligroso de verdad, qué lo guarda, y qué no lo es.", "By the end, you know what is truly dangerous, what guards it, and what is not."],
  chapters: [
    { id: "recuerdo", title: ["La puerta, en breve", "The door, in brief"] },
    { id: "cuenta", title: ["Las puertas de Cuenta", "The Account doors"] },
    { id: "seguro", title: ["Lo que no es peligroso", "What is not dangerous"] },
  ],
  scenes: [
    { id: "m11-recuerdo", chapter: "recuerdo", anchors: ["arch-card"], keys: [["peligroso", "dangerous"]], steps: [
      { kind: "seed", seed: "folios-mes" },
      { kind: "go", screen: "archivo" },
      { kind: "show", anchor: "arch-card", caption: ["Cerrar el recorrido: qué es peligroso de verdad.", "Closing the tour: what is truly dangerous."] },
    ] },
    { id: "m11-puerta", chapter: "recuerdo", anchors: ["arch-delete"], keys: [["la puerta", "the door"]], steps: [
      { kind: "do", anchor: "arch-delete", caption: ["La puerta, en breve: la lección entera vive en Folios.", "The door, in brief: the full lesson lives in Folios."] },
    ] },
    { id: "m11-correo", chapter: "recuerdo", anchors: ["ask-dialog"], keys: [["el correo", "the email"]], steps: [
      { kind: "show", anchor: "ask-dialog", caption: ["Correo escrito a mano, exacto — y tu libro primero.", "Your email, typed by hand, exact — and your book first."], contexto: ["«Descargar mi libro primero» guarda tu copia antes del no retorno.", "“Download my book first” saves your copy before the point of no return."] },
    ] },
    { id: "m11-cancelar", chapter: "recuerdo", anchors: ["ask-no"], keys: [["cancelar", "cancel"]], steps: [
      { kind: "do", anchor: "ask-no", caption: ["Cancelar sigue siendo gratis: nada se movió.", "Cancelling is still free: nothing moved."] },
    ] },
    { id: "m11-cuenta", chapter: "cuenta", anchors: ["aj-account"], keys: [["cuenta", "account"]], steps: [
      { kind: "go", screen: "settings" },
      { kind: "do", anchor: "aj-account", caption: ["Las demás puertas serias viven en Cuenta.", "The other serious doors live in Account."] },
    ] },
    { id: "m11-sesion", chapter: "cuenta", anchors: ["aj-account"], keys: [["cerrar sesión", "sign out"]], steps: [
      { kind: "show", anchor: "aj-account", caption: ["Cerrar sesión no pide puerta escrita: es ida y vuelta.", "Signing out asks for no typed door: it's a round trip."] },
    ] },
    { id: "m11-limpia", chapter: "cuenta", anchors: ["aj-account"], keys: [["limpia", "wipes"]], steps: [
      { kind: "show", anchor: "aj-account", caption: ["Pero sí limpia este equipo al salir. Nada queda flotando.", "But it does wipe this device on the way out. Nothing floats."] },
    ] },
    { id: "m11-huella", chapter: "cuenta", anchors: ["aj-account"], keys: [["huella", "fingerprint"]], steps: [
      { kind: "show", anchor: "aj-account", caption: ["La huella abre con gracia: segundos al salir, minutos al volver.", "The fingerprint opens with grace: seconds out, minutes back."], contexto: ["El widget sigue a la huella: con bloqueo, las cifras se ocultan.", "The widget follows the fingerprint: while locked, amounts hide."] },
    ] },
    { id: "m11-copias", chapter: "cuenta", anchors: ["aj-backup"], keys: [["copias", "backups"]], steps: [
      { kind: "show", anchor: "aj-backup", caption: ["Antes de cualquier no retorno: tu copia, en Copias.", "Before any point of no return: your copy, in Backups."] },
    ] },
    { id: "m11-nopeligro", chapter: "seguro", anchors: ["folios-chips"], keys: [["no es peligroso", "not dangerous"]], steps: [
      { kind: "go", screen: "historial" },
      { kind: "show", anchor: "folios-chips", caption: ["Y lo que NO es peligroso: ocultar, apartar, descartar.", "And what is NOT dangerous: hiding, setting aside, discarding."] },
    ] },
    { id: "m11-vuelta", chapter: "seguro", anchors: ["hist-totals"], keys: [["el camino de vuelta", "the way back"]], steps: [
      { kind: "show", anchor: "hist-totals", caption: ["Todo eso vuelve: cada descanso tiene su Restaurar.", "All of that comes back: every rest has its Restore."] },
    ] },
    { id: "m11-vuelve", chapter: "seguro", anchors: ["arch-card"], keys: [["vuelve entero", "comes back whole"]], steps: [
      { kind: "go", screen: "archivo" },
      { kind: "show", anchor: "arch-card", caption: ["Lo apartado vuelve entero con un solo toque.", "What was set aside comes back whole with a single tap."] },
    ] },
    { id: "m11-restaurado", chapter: "seguro", anchors: ["arch-restore"], keys: [["restaurado", "restored"]], steps: [
      { kind: "do", anchor: "arch-restore", caption: ["Míralo: salió del Archivo y el río lo cuenta otra vez.", "Watch: it left the Archive and the river counts it again."] },
    ] },
  ],
};

/* ====================== MÓDULO 12 · LA PREGUNTA ======================
 * El modelo de ahorro (1.3.287–1.3.291): cada fondo declara dónde vive.
 * La declaración se EJECUTA en escena por sus tres caminos — al nacer en el
 * formulario, en la lista de migración (con su guardia), y en el encuentro
 * cuando una cuenta recibe su primer saldo. */

const PREGUNTA: Module = {
  id: "pregunta", n: 14, title: ["La pregunta", "The question"], mode: "completo", ready: true,
  promise: ["Al salir, declaras dónde vive cada fondo — y sabes qué cambia al declararlo.", "By the end, you declare where each fund lives — and know what changes when you do."],
  chapters: [
    { id: "nacer", title: ["Un fondo nace", "A fund is born"] },
    { id: "declarar", title: ["Los que ya tienes", "The ones you already have"] },
    { id: "encuentro", title: ["El encuentro", "The encounter"] },
    { id: "postura", title: ["La postura de la casa", "The house posture"] },
  ],
  scenes: [
    { id: "m12-nace", chapter: "nacer", anchors: ["desk-pocket", "pocket-add"], keys: [["nace un fondo", "a fund is born"], ["añadir", "add"]], steps: [
      { kind: "seed", seed: "modelo-nacer" },
      { kind: "go", screen: "desk" },
      { kind: "do", anchor: "desk-pocket", caption: ["Toca Meta: su libro se despliega aquí mismo, en Central.", "Tap Goal: its book unfolds right here, at the Desk."] },
      { kind: "do", anchor: "pocket-add", caption: ["El más abre el formulario de un fondo nuevo.", "The plus opens a new fund's form."] },
    ] },
    { id: "m12-escribe", chapter: "nacer", anchors: ["pocket-name", "pocket-amt"], keys: [["nombre", "name"], ["monto", "amount"]], steps: [
      { kind: "type", anchor: "pocket-name", text: ["Viaje", "Trip"], caption: ["Se llama Viaje y nace con cinco mil córdobas.", "It's called Trip and starts with five thousand córdobas."] },
      { kind: "type", anchor: "pocket-amt", text: ["5000", "5000"], caption: ["El monto es lo que ya se apartó para él.", "The amount is what has already been set aside for it."] },
    ] },
    { id: "m12-pregunta", chapter: "nacer", anchors: ["nature-pick"], keys: [["dónde vive", "where it lives"], ["la pregunta", "the question"]], steps: [
      { kind: "show", anchor: "nature-pick", caption: ["Antes de guardar, la app pregunta: ¿dónde vive este dinero?", "Before saving, the app asks: where does this money live?"], contexto: ["Cada respuesta lleva su consecuencia escrita. Sin responder, Guardar no guarda.", "Each answer carries its consequence in writing. Unanswered, Save doesn't save."] },
    ] },
    { id: "m12-saldo", chapter: "nacer", anchors: ["nature-saldo", "nature-pick"], keys: [["del saldo", "from the balance"], ["anfitriona", "host"]], steps: [
      { kind: "do", anchor: "nature-saldo", caption: ["«Del saldo»: el dinero no se mueve; solo recibe nombre.", "“From the balance”: the money doesn't move; it only gets a name."], contexto: ["Hay una sola cuenta: se amarra sola a Banco.", "There's only one account: it binds itself to Banco."] },
    ] },
    { id: "m12-guardar", chapter: "nacer", anchors: ["pocket-save", "vault-ledger"], keys: [["guardar", "save"], ["nace declarado", "born declared"]], steps: [
      { kind: "do", anchor: "pocket-save", caption: ["Guarda: el fondo nace ya declarado, con su anillo.", "Save: the fund is born declared, wearing its ring."] },
      { kind: "show", anchor: "vault-ledger", caption: ["Su fila lleva la luz de anillo: parte del saldo.", "Its row wears the ring light: part of the balance."] },
    ] },
    { id: "m12-solo", chapter: "declarar", anchors: ["vault-migrate"], keys: [["sin declarar", "undeclared"], ["esperan", "waiting"]], steps: [
      { kind: "seed", seed: "modelo-declarar" },
      { kind: "go", screen: "vault-save" },
      { kind: "show", anchor: "vault-migrate", caption: ["Estos fondos tienen dinero y ninguna declaración: luz gris.", "These funds hold money and no declaration: a gray light."], contexto: ["Sin declarar se leen como pila de siempre: declarar es tu acto.", "Undeclared, they read as the usual pile: declaring is your act."] },
    ] },
    { id: "m12-aparte", chapter: "declarar", anchors: ["vault-migrate", "nature-aparte", "migrate-declare", "vault-kept"], keys: [["aparte", "apart"], ["declarar", "declare"]], steps: [
      { kind: "do", anchor: "vault-migrate", caption: ["Abre la lista: cada fondo espera su respuesta.", "Open the list: every fund awaits its answer."] },
      { kind: "do", anchor: "nature-aparte", caption: ["Para Regalo: «Es una cuenta aparte», su propia pila.", "For Regalo: “It's a separate account,” its own pile."] },
      { kind: "do", anchor: "migrate-declare", caption: ["Declarar estampa la serie entera en un solo acto.", "Declaring stamps the whole series in a single act."] },
      { kind: "show", anchor: "vault-kept", caption: ["Ahora Regalo suma a Lo guardado: su dinero existe aparte.", "Now Regalo adds to Kept: its money exists apart."] },
    ] },
    { id: "m12-guardia", chapter: "declarar", anchors: ["nature-saldo", "migrate-declare", "ask-dialog", "ask-yes"], keys: [["guardia", "guard"], ["no cabe", "doesn't fit"]], steps: [
      { kind: "do", anchor: "nature-saldo", caption: ["Moto quiere vivir del saldo del Banco. Mira la guardia.", "Moto wants to live off the Bank's balance. Watch the guard."] },
      { kind: "do", anchor: "migrate-declare", caption: ["Declarar lo intenta — y la app se niega con cifras.", "Declaring tries — and the app refuses, with figures."] },
      { kind: "show", anchor: "ask-dialog", caption: ["Un límite no puede ser mayor que el saldo donde vive.", "A limit can't be bigger than the balance it lives on."] },
      { kind: "do", anchor: "ask-yes", caption: ["Entendido. Moto sigue gris: la decisión queda tuya.", "Understood. Moto stays gray: the decision remains yours."] },
    ] },
    { id: "m12-pila", chapter: "declarar", anchors: ["nature-aparte", "migrate-declare"], keys: [["su propia pila", "its own pile"]], steps: [
      { kind: "do", anchor: "nature-aparte", caption: ["Lo que no cabe en el saldo puede ser su propia pila.", "What doesn't fit the balance can be its own pile."] },
      { kind: "do", anchor: "migrate-declare", caption: ["Moto queda aparte: declarado, con su disco lleno.", "Moto is now apart: declared, with its full disc."] },
    ] },
    { id: "m12-encuentro", chapter: "encuentro", anchors: ["desk-accounts", "vault-accounts"], keys: [["encuentro", "encounter"], ["cuentas", "accounts"]], steps: [
      { kind: "seed", seed: "modelo-encuentro" },
      { kind: "go", screen: "desk" },
      { kind: "do", anchor: "desk-accounts", caption: ["El panel de cuentas: la Cooperativa existe, sin un córdoba.", "The accounts panel: the Cooperative exists, without a single córdoba."] },
      { kind: "show", anchor: "vault-accounts", caption: ["Cada cuenta muestra su saldo: la Cooperativa, en cero.", "Each account shows its balance: the Cooperative, at zero."] },
    ] },
    { id: "m12-cuenta", chapter: "encuentro", anchors: ["vault-figure", "acct-open-amt"], keys: [["saldo inicial", "opening balance"], ["primer saldo", "first balance"]], steps: [
      { kind: "do", anchor: "vault-figure", caption: ["La cifra de la Cooperativa es botón: pide su saldo inicial.", "The Cooperative's figure is a button: it asks its opening balance."] },
      { kind: "type", anchor: "acct-open-amt", text: ["8000", "8000"], caption: ["Ocho mil: el primer dinero que la cuenta recibe.", "Eight thousand: the first money the account receives."] },
    ] },
    { id: "m12-dialogo", chapter: "encuentro", anchors: ["acct-open-save", "ask-dialog"], keys: [["la pregunta llega", "the question arrives"]], steps: [
      { kind: "do", anchor: "acct-open-save", caption: ["Guarda el saldo — y mira lo que la app hace.", "Save the balance — and watch what the app does."] },
      { kind: "show", anchor: "ask-dialog", caption: ["El encuentro: un fondo esperaba, y la cuenta acaba de nacer.", "The encounter: a fund was waiting, and the account was just born."], contexto: ["La pregunta se hace en el acto, con el total y la lista.", "The question is asked on the spot, with the total and the list."] },
    ] },
    { id: "m12-dentro", chapter: "encuentro", anchors: ["enc-inside", "desk-pledged"], keys: [["dentro de la cuenta", "inside the account"]], steps: [
      { kind: "do", anchor: "enc-inside", caption: ["«Está dentro de esta cuenta»: Terreno se amarra a la Cooperativa.", "“It's inside this account”: Terreno binds to the Cooperative."] },
      { kind: "show", anchor: "desk-pledged", caption: ["La línea del nombre aparece: ese saldo ya tiene nombre.", "The named line appears: that balance now has a name."] },
    ] },
    { id: "m12-modos", chapter: "postura", anchors: ["aj-rules", "aj-nature"], keys: [["modos", "modes"], ["preguntarme", "ask me"], ["postura", "posture"]], steps: [
      { kind: "go", screen: "settings" },
      { kind: "do", anchor: "aj-rules", caption: ["La postura vive con las metas de la casa.", "The posture lives with the house's goals."] },
      { kind: "show", anchor: "aj-nature", caption: ["En Ajustes eliges la postura: preguntar siempre, o una respuesta fija.", "In Settings you choose the posture: always ask, or one fixed answer."], contexto: ["El modo manda al nacer; nunca reescribe lo ya declarado.", "The mode rules at birth; it never rewrites what's declared."] },
    ] },
    { id: "m12-cierre", chapter: "postura", anchors: ["desk-save"], keys: [["declarar mueve", "declaring moves"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "desk-save", caption: ["Declarar es el acto que mueve los números. Lo demás, no.", "Declaring is the act that moves the numbers. Nothing else does."] },
    ] },
  ],
};

/* ===================== MÓDULO 13 · LOS DOS TOTALES ===================== */

const TOTALES: Module = {
  id: "totales", n: 15, title: ["Los dos totales", "The two totals"], mode: "completo", ready: true,
  promise: ["Al salir, lees la banda sin contar dos veces el mismo dinero.", "By the end, you read the band without counting the same money twice."],
  chapters: [
    { id: "banda", title: ["La banda que no duplica", "The band that never doubles"] },
    { id: "cuentas", title: ["El libre por cuenta", "Each account's free balance"] },
    { id: "mes", title: ["El mes, en dos lecturas", "The month, in two readings"] },
  ],
  scenes: [
    { id: "m13-titular", chapter: "banda", anchors: ["desk-save"], keys: [["lo guardado", "kept"], ["titular", "headline"]], steps: [
      { kind: "seed", seed: "modelo-casa" },
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "desk-save", caption: ["«Lo guardado» cuenta cada dinero una sola vez.", "“Kept” counts every sum of money exactly once."], contexto: ["Cuentas, fondos aparte y Retiro: el saldo nunca suma.", "Accounts, apart funds and Retirement: the balance never adds."] },
    ] },
    { id: "m13-nombre", chapter: "banda", anchors: ["desk-pledged"], keys: [["ya tiene nombre", "already has a name"], ["segunda línea", "second line"]], steps: [
      { kind: "do", anchor: "desk-pledged", caption: ["La segunda línea no suma: es el mismo saldo, con nombre.", "The second line doesn't add: it's the same balance, named."], contexto: ["Tócala y se explica: qué fondos montan y sobre qué cuenta.", "Tap it and it explains itself: which funds ride, and on which account."] },
    ] },
    { id: "m13-luces", chapter: "banda", anchors: ["desk-pockets"], keys: [["luces", "lights"], ["disco", "disc"], ["anillo", "ring"]], steps: [
      { kind: "show", anchor: "desk-pockets", caption: ["Cada bolsa lleva su luz: disco, aparte; anillo, saldo; gris, esperando.", "Every pocket wears its light: disc, apart; ring, balance; gray, waiting."], contexto: ["El Retiro no lleva luz: su naturaleza es su nombre.", "Retirement wears no light: its nature is its name."] },
    ] },
    { id: "m13-luz", chapter: "banda", anchors: ["fund-light"], keys: [["la luz se explica", "the light explains itself"], ["signo", "sign"]], steps: [
      { kind: "do", anchor: "fund-light", caption: ["La luz es un signo: al tocarla se explica; no actúa.", "The light is a sign: tapped, it explains itself; it never acts."] },
    ] },
    { id: "m13-widget", chapter: "banda", anchors: ["theater", "theater-wrap", "theater-open"], keys: [["widget", "widget"], ["bolsas con luz", "pockets with lights"]], steps: [
      { kind: "show", anchor: "theater-wrap", caption: ["Tu pantalla de inicio, en escena: cada bolsa lleva su luz.", "Your home screen, on stage: every pocket wears its light."], contexto: ["Lo comprometido se muestra aparte: nunca disfrazado de guardado.", "Committed money shows apart: never dressed up as kept."] },
      { kind: "show", anchor: "theater-open", caption: ["El widget separa lo guardado de lo comprometido, sin abrir Faro.", "The widget splits kept from committed, without opening Faro."] },
    ] },
    { id: "m13-cuentas", chapter: "cuentas", anchors: ["desk-accounts", "vault-accounts"], keys: [["todas las cuentas", "all the accounts"], ["libre", "free"]], steps: [
      { kind: "do", anchor: "desk-accounts", caption: ["El banco despliega el panel: todas las cuentas.", "The bank unfolds the panel: all the accounts."] },
      { kind: "show", anchor: "vault-accounts", caption: ["Cada cuenta dice cuánto de su saldo ya tiene nombre.", "Each account says how much of its balance already has a name."], contexto: ["Y lo que queda libre: su saldo menos sus límites.", "And what stays free: its balance minus its limits."] },
    ] },
    { id: "m13-suma", chapter: "cuentas", anchors: ["vault-accounts"], keys: [["la suma libre", "the free sum"]], steps: [
      { kind: "show", anchor: "vault-accounts", caption: ["El panel suma los libres: lo que ningún fondo ha nombrado.", "The panel adds the free balances: what no fund has named."] },
    ] },
    { id: "m13-tope", chapter: "cuentas", anchors: ["vault-accounts"], keys: [["el tope", "the ceiling"], ["nunca pasa", "never passes"]], steps: [
      { kind: "show", anchor: "vault-accounts", caption: ["Un límite nunca puede pasar del libre de su cuenta.", "A limit can never pass its account's free balance."], contexto: ["Si lo intentas, la guardia se niega con las cifras en la mano.", "Try it, and the guard refuses with the figures in hand."] },
    ] },
    { id: "m13-partes", chapter: "cuentas", anchors: ["vault-kept"], keys: [["las tres fuentes", "the three sources"], ["las partes", "the parts"]], steps: [
      { kind: "go", screen: "vault-save" },
      { kind: "show", anchor: "vault-kept", caption: ["En la bóveda, el titular se parte en sus tres fuentes.", "In the vault, the headline splits into its three sources."] },
      { kind: "do", anchor: "vault-kept", caption: ["Cada parte se explica al tocarla: de dónde sale.", "Each part explains itself when tapped: where it comes from."] },
    ] },
    { id: "m13-apartado", chapter: "mes", anchors: ["desk-aside"], keys: [["apartado del mes", "the month's set-aside"], ["dos partes", "two parts"]], steps: [
      { kind: "go", screen: "vault-save" },
      { kind: "show", anchor: "desk-aside", caption: ["El Apartado del mes se lee en dos partes que siempre suman.", "The month's set-aside reads in two parts that always add up."], contexto: ["Lo etiquetado sobre el saldo, y lo de verdad movido a pilas.", "What was labeled on the balance, and what truly moved to piles."] },
    ] },
  ],
};

/* ================ MÓDULO 14 · EL COLCHÓN QUE DICE LA VERDAD ================ */

const COLCHON: Module = {
  id: "colchon", n: 16, title: ["El colchón que dice la verdad", "The cushion that tells the truth"], mode: "completo", ready: true,
  promise: ["Al salir, sabes cuándo tu colchón aguanta — y cuándo el Asesor debe avisarte.", "By the end, you know when your cushion holds — and when the Advisor must warn you."],
  chapters: [
    { id: "asesor", title: ["El Asesor lee la partición", "The Advisor reads the partition"] },
    { id: "eco", title: ["El eco en Estudio y Folios", "The echo in Study and Folios"] },
  ],
  scenes: [
    { id: "m14-colchon", chapter: "asesor", anchors: ["advice-tiles", "advice-rules"], keys: [["colchón", "cushion"], ["por cuenta", "per account"]], steps: [
      { kind: "seed", seed: "modelo-colchon" },
      { kind: "go", screen: "advice" },
      { kind: "tap", anchor: "advice-tiles" },
      { kind: "show", anchor: "advice-rules", caption: ["El colchón se calcula por cuenta: lo que sobra tras los límites.", "The cushion is figured per account: what remains after the limits."], contexto: ["Más la emergencia que vive aparte: su pila sí es colchón.", "Plus the emergency living apart: its pile truly is cushion."] },
    ] },
    { id: "m14-silencio", chapter: "asesor", anchors: ["advice-rules"], keys: [["el silencio", "the silence"], ["cubierto", "covered"]], steps: [
      { kind: "show", anchor: "advice-rules", caption: ["Cuando el piso está cubierto, el Asesor calla: el silencio también lee.", "When the floor is covered, the Advisor is silent: silence reads too."], contexto: ["Solo habla del colchón cuando falta: con la cifra que falta.", "It speaks of the cushion only when it's short: with the missing figure."] },
    ] },
    { id: "m14-piso", chapter: "asesor", anchors: ["advice-rules"], keys: [["piso de emergencia", "emergency floor"], ["faltan", "missing"]], steps: [
      { kind: "seed", seed: "modelo-giro" },
      { kind: "show", anchor: "advice-rules", caption: ["Si el saldo baja, el piso se descubre: el Asesor dice cuánto falta.", "If the balance drops, the floor uncovers: the Advisor says what's missing."] },
    ] },
    { id: "m14-sobre", chapter: "asesor", anchors: ["advice-rules"], keys: [["libre bajo cero", "free below zero"], ["sobrecompromiso", "overcommitment"]], steps: [
      { kind: "show", anchor: "advice-rules", caption: ["Y lo nombra una vez: el libre de esa cuenta bajó de cero.", "And it names it once: that account's free balance fell below zero."] },
    ] },
    { id: "m14-libre", chapter: "asesor", anchors: ["desk-accounts", "vault-accounts"], keys: [["libre negativo", "negative free"], ["el panel lo dice", "the panel says it"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "do", anchor: "desk-accounts", caption: ["El panel de cuentas guarda la misma verdad que el Asesor.", "The accounts panel keeps the same truth as the Advisor."] },
      { kind: "show", anchor: "vault-accounts", caption: ["El panel también lo dice: el libre del Banco quedó en negativo.", "The panel says it too: the Bank's free balance went negative."], contexto: ["Se muestra y se dice: nunca se esconde tras el total.", "It's shown and said: never hidden behind the total."] },
    ] },
    { id: "m14-estudio", chapter: "eco", anchors: ["cushion", "study-committed"], keys: [["lo comprometido", "committed"], ["no dos veces", "not twice"]], steps: [
      { kind: "seed", seed: "modelo-colchon" },
      { kind: "go", screen: "stats" },
      { kind: "show", anchor: "cushion", caption: ["El Estudio lee Lo guardado de la misma fuente que la banda.", "Study reads Kept from the same source as the band."] },
      { kind: "do", anchor: "study-committed", caption: ["«Lo comprometido» se despliega: no se cuenta dos veces.", "“Committed” unfolds: it is never counted twice."], contexto: ["Es el saldo ya nombrado: no alarga la pista ni llena el frasco.", "It's the already-named balance: no longer runway, no fuller jar."] },
    ] },
    { id: "m14-folios", chapter: "eco", anchors: ["hist-row"], keys: [["la nota", "the note"], ["folios cuenta", "folios tells"]], steps: [
      { kind: "seed", seed: "modelo-folios" },
      { kind: "go", screen: "historial" },
      { kind: "show", anchor: "hist-row", caption: ["Folios cuenta el movimiento con su luz y su nota.", "Folios tells the movement with its light and its note."], contexto: ["«No se movió dinero»: un límite también es historia.", "“No money moved”: a limit is history too."] },
    ] },
    { id: "m14-archivo", chapter: "eco", anchors: ["arch-card"], keys: [["la nota viaja", "the note travels"], ["archivo", "archive"]], steps: [
      { kind: "seed", seed: "modelo-archivo" },
      { kind: "go", screen: "archivo" },
      { kind: "show", anchor: "arch-card", caption: ["En el Archivo, la nota viaja con el folio: la historia no se pierde.", "In the Archive, the note travels with the entry: the story isn't lost."] },
    ] },
  ],
};

/* ================= LOS MÓDULOS DE LOS MODOS (2026-11-15) =================
 * Los cinco huecos del mapa de módulos (MAPA-MODULOS.md §5, H-1…H-5),
 * construidos por orden de Oscar desde el chat de Modos. Nacieron con
 * `ready: false` — el sistema de modos aún no existía en la app — y la
 * etapa 5 de la ola de modos (2026-11-16) los voltea a `ready: true`: las
 * superficies que esperaban ya viven (el selector aj-modo, la pantalla de
 * impacto, la fila de datos mudos y su lista, el número desk-hoy), la
 * auditoría conjunta escena↔superficie reasentó las escenas que enseñaban
 * una cara que su modo no tiene, y cada uno entra en el índice de su modo
 * — el índice es acumulativo: Esencial ⊂ Ritmo ⊂ Completo. Su numeración
 * (hoy 17–21 tras la recomposición de Folios y Anotar) sigue el orden del
 * índice de Completo, el más lleno. */

const MODOS: Module = {
  id: "modos", n: 17, title: ["Los modos", "The modes"], mode: "esencial", ready: true,
  promise: ["Al salir, sabes qué modo tienes, qué cambia al moverte y que nada se borra.", "By the end, you know your mode, what changes when you move, and that nothing is deleted."],
  chapters: [
    { id: "el-sistema", title: ["El sistema", "The system"] },
    { id: "subir-bajar", title: ["Subir y bajar", "Moving up and down"] },
    { id: "lo-dormido", title: ["Lo que duerme", "What sleeps"] },
  ],
  scenes: [
    { id: "m15-modos", chapter: "el-sistema", anchors: ["aj-modo"], keys: [["modos", "modes"], ["tres modos", "three modes"]], steps: [
      { kind: "seed", seed: "modos-sistema" },
      { kind: "go", screen: "settings" },
      { kind: "show", anchor: "aj-modo", caption: ["Faro tiene tres modos; el tuyo vive aquí, en Ajustes.", "Faro has three modes; yours lives here, in Settings."] },
    ] },
    { id: "m15-lineas", chapter: "el-sistema", anchors: ["aj-modo"], keys: [["líneas", "lines"]], steps: [
      { kind: "show", anchor: "aj-modo", caption: ["Esencial anota y mira; Ritmo presupuesta; Completo interpreta.", "Essential notes and watches; Rhythm budgets; Complete interprets."] },
    ] },
    { id: "m15-esencial", chapter: "el-sistema", mode: "esencial", anchors: ["aj-modo"], keys: [["esencial", "essential"]], steps: [
      { kind: "show", anchor: "aj-modo", caption: ["Tu cara de Esencial: registrar y mirar, sin maquinaria de más.", "Your Essential face: note things down and look, no extra machinery."] },
    ] },
    { id: "m15-ritmo", chapter: "el-sistema", mode: "ritmo", anchors: ["aj-modo"], keys: [["ritmo", "rhythm"]], steps: [
      { kind: "show", anchor: "aj-modo", caption: ["Ritmo añade presupuestar y anticipar sobre lo de Esencial.", "Rhythm adds budgeting and anticipating on top of Essential."] },
    ] },
    { id: "m15-completo", chapter: "el-sistema", mode: "completo", anchors: ["aj-modo"], keys: [["completo", "complete"]], steps: [
      { kind: "show", anchor: "aj-modo", caption: ["Completo lo interpreta y proyecta todo; nada de abajo se pierde.", "Complete interprets and projects everything; nothing below is lost."] },
    ] },
    { id: "m15-subir", chapter: "subir-bajar", anchors: ["aj-modo"], keys: [["subir", "moving up"]], steps: [
      { kind: "do", anchor: "aj-modo", caption: ["Subir no pregunta: destapa al instante lo del modo nuevo.", "Moving up never asks: it uncovers the new mode at once."], contexto: ["Un aviso breve nombra lo que se acaba de destapar.", "A brief notice names what was just uncovered."] },
    ] },
    { id: "m15-impacto", chapter: "subir-bajar", mode: "ritmo", anchors: ["modo-opt-esencial", "modo-impacto", "modo-impacto-no"], keys: [["impacto", "impact"], ["bajar", "moving down"]], steps: [
      { kind: "tap", anchor: "modo-opt-esencial" },
      { kind: "show", anchor: "modo-impacto", caption: ["Bajar sí pregunta: esta pantalla cuenta lo que dormirá.", "Moving down does ask: this screen counts what will sleep."] },
      { kind: "tap", anchor: "modo-impacto-no" },
    ] },
    { id: "m15-impacto-c", chapter: "subir-bajar", mode: "completo", anchors: ["modo-opt-ritmo", "modo-impacto", "modo-impacto-no"], keys: [["impacto", "impact"], ["bajar", "moving down"]], steps: [
      { kind: "tap", anchor: "modo-opt-ritmo" },
      { kind: "show", anchor: "modo-impacto", caption: ["Bajar sí pregunta: esta pantalla cuenta lo que dormirá.", "Moving down does ask: this screen counts what will sleep."] },
      { kind: "tap", anchor: "modo-impacto-no" },
    ] },
    { id: "m15-nada-se-borra", chapter: "subir-bajar", mode: "ritmo", anchors: ["modo-opt-esencial", "modo-impacto", "modo-impacto-no"], keys: [["nada se borra", "nothing is deleted"]], steps: [
      { kind: "tap", anchor: "modo-opt-esencial" },
      { kind: "show", anchor: "modo-impacto", caption: ["Bajar es desactivar, nunca borrar: tus datos quedan enteros.", "Moving down turns things off, never deletes: your data stays whole."] },
      { kind: "tap", anchor: "modo-impacto-no" },
    ] },
    { id: "m15-nada-se-borra-c", chapter: "subir-bajar", mode: "completo", anchors: ["modo-opt-ritmo", "modo-impacto", "modo-impacto-no"], keys: [["nada se borra", "nothing is deleted"]], steps: [
      { kind: "tap", anchor: "modo-opt-ritmo" },
      { kind: "show", anchor: "modo-impacto", caption: ["Bajar es desactivar, nunca borrar: tus datos quedan enteros.", "Moving down turns things off, never deletes: your data stays whole."] },
      { kind: "tap", anchor: "modo-impacto-no" },
    ] },
    /* Ola 3 (E3-3): el par de la fila es DE ESENCIAL — la fila de datos
     * mudos es una cara de Esencial por construcción (nace solo donde los
     * bolsillos no tienen cara propia: `!has("vault.meta")`, y ningún
     * bolsillo se gestiona por encima de Ritmo). En Ritmo las escenas se
     * saltaban en silencio porque su ancla jamás nace en esa vista; ahora
     * el capítulo enseña la misma ley en Ritmo con las variantes -r, sobre
     * un objeto que Ritmo sí tiene: sus bolsillos en la banda. */
    { id: "m15-mudos", chapter: "lo-dormido", mode: "esencial", anchors: ["modo-mudos"], keys: [["datos mudos", "mute data"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "modo-mudos", caption: ["Lo de un modo mayor se ve aquí, en su sitio, explicado.", "What belongs to a higher mode shows here, in its place, explained."], contexto: ["Suma en tus totales igual que siempre; solo duerme su gestión.", "It counts in your totals as always; only its managing sleeps."] },
    ] },
    { id: "m15-solo-lectura", chapter: "lo-dormido", mode: "esencial", anchors: ["modo-mudos", "modo-lista"], keys: [["solo lectura", "read only"]], steps: [
      { kind: "do", anchor: "modo-mudos", caption: ["La fila abre su lista: todo se lee, nada se edita aquí.", "The row opens its list: everything reads, nothing edits here."] },
      { kind: "show", anchor: "modo-lista", caption: ["Gestionarlo vive en su modo; mirarlo, en todos.", "Managing it lives in its mode; looking at it, in all of them."] },
    ] },
    { id: "m15-mudos-r", chapter: "lo-dormido", mode: "ritmo", anchors: ["desk-save"], keys: [["bolsillos", "pockets"], ["al bajar", "going down"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "desk-save", caption: ["Si bajas a Esencial, estos bolsillos se leen en una fila de solo lectura.", "If you go down to Essential, these pockets read in a read-only row."], contexto: ["No se borran ni dejan de contar: solo duerme su gestión.", "They are not deleted and keep counting: only their managing sleeps."] },
    ] },
    { id: "m15-solo-lectura-r", chapter: "lo-dormido", mode: "ritmo", anchors: ["desk-save"], keys: [["se leen", "they read"], ["gestionar aquí", "managing here"]], steps: [
      { kind: "show", anchor: "desk-save", caption: ["Su lista en Esencial lo lee todo y no edita nada; gestionarlos vive aquí.", "Its list in Essential reads everything and edits nothing; managing them lives here."] },
    ] },
    { id: "m15-sugiere", chapter: "lo-dormido", notMode: "completo", anchors: ["coach"], keys: [["sugerencia", "suggestion"]], steps: [
      { kind: "go", screen: "advice" },
      { kind: "show", anchor: "coach", caption: ["El Asesor puede sugerir subir; jamás cambia el modo solo.", "The Advisor may suggest moving up; it never changes the mode itself."] },
    ] },
    { id: "m15-cierre", chapter: "lo-dormido", anchors: ["aj-modo"], keys: [["selector", "selector"]], steps: [
      { kind: "go", screen: "settings" },
      { kind: "show", anchor: "aj-modo", caption: ["El selector nunca se esconde: cambiar de modo no rompe nada.", "The selector never hides: changing modes breaks nothing midway."] },
    ] },
  ],
};

/* H-1: su casa final es un capítulo de «El mes de un vistazo» (MAPA §5);
 * nace como módulo en preparación porque un capítulo no puede estar en
 * preparación dentro de un módulo listo. Al recomponerse el índice, estas
 * escenas se pliegan como capítulo del módulo `mes`. */
const HOY: Module = {
  id: "hoy", n: 18, title: ["Puedes gastar hoy", "What you can spend today"], mode: "esencial", ready: true,
  promise: ["Al salir, lees tu número de hoy: qué es, de dónde sale y cómo se mueve.", "By the end, you read your spend-today number: what it is, where it comes from, how it moves."],
  chapters: [
    { id: "el-numero", title: ["El número", "The number"] },
    { id: "se-mueve", title: ["Cómo se mueve", "How it moves"] },
  ],
  scenes: [
    { id: "m16-numero", chapter: "el-numero", anchors: ["desk-hoy"], keys: [["puedes gastar hoy", "spend today"], ["el número", "the number"]], steps: [
      { kind: "seed", seed: "widget-mes" },
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "desk-hoy", caption: ["Este número dice cuánto puedes gastar hoy, en dinero.", "This number says what you can spend today, in money."] },
    ] },
    { id: "m16-formula", chapter: "el-numero", anchors: ["desk-hoy"], keys: [["de dónde sale", "where it comes from"]], steps: [
      { kind: "show", anchor: "desk-hoy", caption: ["Sale de tu mes real: lo libre, menos lo que falta.", "It comes from your real month: what's free, minus what's left."], contexto: ["Lo libre menos los compromisos que quedan, entre los días que quedan.", "What's free minus the commitments left, over the days left."] },
    ] },
    { id: "m16-explicacion", chapter: "el-numero", anchors: ["desk-hoy"], keys: [["explicación", "explanation"]], steps: [
      { kind: "do", anchor: "desk-hoy", caption: ["Tócalo: su explicación se abre y se lee en llano.", "Tap it: its explanation opens and reads plainly."] },
    ] },
    { id: "m16-anota", chapter: "se-mueve", anchors: ["book-add", "line-concept", "line-amount", "line-save", "ask-yes"], keys: [["anotar", "noting"], ["se mueve", "it moves"]], steps: [
      { kind: "go", screen: "fixed" },
      { kind: "do", anchor: "book-add", caption: ["Anota un gasto como siempre: el editor de Fijos.", "Note an expense as always: the Fixed editor."] },
      { kind: "type", anchor: "line-concept", text: ["Luz del taller", "Workshop light"], caption: ["Un nombre claro: «Luz del taller».", "A clear name: “Workshop light”."] },
      { kind: "type", anchor: "line-amount", text: ["1000", "1000.00"], caption: ["Y su monto: mil córdobas redondos.", "And its amount: a round thousand córdobas."] },
      { kind: "do", anchor: "line-save", caption: ["Guarda el registro.", "Save the entry."] },
      { kind: "do", anchor: "ask-yes", caption: ["Y confirma: el dígito ya nació.", "And confirm: the digit is born."] },
    ] },
    { id: "m16-baja", chapter: "se-mueve", anchors: ["desk-hoy"], keys: [["bajó", "it dropped"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "desk-hoy", caption: ["El número ya cuenta los mil: bajó solo, sin cuentas tuyas.", "The number already counts the thousand: it dropped by itself."] },
    ] },
    { id: "m16-cierre", chapter: "se-mueve", anchors: ["desk-left"], keys: [["cómo voy", "how am I doing"]], steps: [
      { kind: "show", anchor: "desk-left", caption: ["Es la respuesta entera de Esencial a «¿cómo voy?».", "It is Essential's whole answer to “how am I doing?”."] },
    ] },
  ],
};

const ASESOR_ESENCIAL: Module = {
  id: "asesor-esencial", n: 19, title: ["El Asesor en Esencial", "The Advisor in Essential"], mode: "esencial", ready: true,
  promise: ["Al salir, tu Asesor en Esencial te resulta claro: dinero, fechas y pasos llanos.", "By the end, your Advisor in Essential reads clearly: money, dates and plain steps."],
  chapters: [
    { id: "en-llano", title: ["En dinero y en llano", "In money and plain words"] },
    { id: "la-ruta", title: ["La ruta y la subida", "The route and the way up"] },
  ],
  scenes: [
    { id: "m17-asesor", chapter: "en-llano", anchors: ["coach"], keys: [["asesor", "advisor"], ["en llano", "plainly"]], steps: [
      { kind: "seed", seed: "modos-asesor" },
      { kind: "go", screen: "advice" },
      { kind: "show", anchor: "coach", caption: ["En Esencial, tu Asesor habla en dinero y en llano.", "In Essential, your Advisor speaks in money and plain words."] },
    ] },
    { id: "m17-hoy", chapter: "en-llano", anchors: ["desk-hoy"], keys: [["puedes gastar hoy", "spend today"]], steps: [
      { kind: "go", screen: "desk" },
      { kind: "show", anchor: "desk-hoy", caption: ["Tu número de hoy vive en Central: cuánto puedes gastar, en dinero.", "Your today number lives on the Desk: what you can spend, in money."], contexto: ["El Asesor lo nombra; Central lo muestra y lo explica al tocarlo.", "The Advisor names it; the Desk shows it and explains it on tap."] },
    ] },
    { id: "m17-vencen", chapter: "en-llano", anchors: ["advice-basis", "advice-rules"], keys: [["vencimientos", "due dates"]], steps: [
      { kind: "go", screen: "advice" },
      { kind: "show", anchor: "advice-basis", caption: ["Cada aviso nace de tus números: esta línea dice de dónde sale.", "Every warning is born from your numbers: this line says where the reading comes from."] },
      { kind: "show", anchor: "advice-rules", caption: ["Avisa los vencimientos de los dos lados, en dinero y fechas.", "It flags due dates on both sides, in money and dates."], contexto: ["Lo que debes y lo que te deben: la consecuencia real avisa siempre.", "What you owe and what you're owed: real consequences always warn."] },
    ] },
    { id: "m17-pesaron", chapter: "en-llano", anchors: ["advice-heaviest"], keys: [["pesaron más", "weighed most"]], steps: [
      { kind: "show", anchor: "advice-heaviest", caption: ["Dice qué gastos pesaron más, en dinero y sin porcentajes.", "It says which expenses weighed most, in money, no percentages."] },
    ] },
    { id: "m17-plan", chapter: "la-ruta", anchors: ["advice-plan"], keys: [["el plan", "the plan"], ["primeros pasos", "first steps"]], steps: [
      { kind: "show", anchor: "advice-plan", caption: ["Su Plan ordena tus primeros pasos, en un orden llano.", "Its Plan orders your first steps, in a plain order."] },
    ] },
    { id: "m17-palabras", chapter: "la-ruta", anchors: ["coach-words"], keys: [["palabras simples", "simple words"]], steps: [
      { kind: "do", anchor: "coach-words", caption: ["Con «En palabras simples», su consejo se comparte tal cual.", "With “In simple words”, its advice shares as-is."] },
    ] },
    { id: "m17-subida", chapter: "la-ruta", anchors: ["coach"], keys: [["sugerencia de subida", "suggestion to move up"]], steps: [
      { kind: "show", anchor: "coach", caption: ["Si tu uso pide más, sugiere subir; nunca cambia solo.", "If your use asks for more, it suggests moving up; never switches alone."] },
    ] },
    { id: "m17-cierre", chapter: "la-ruta", anchors: ["advice-basis"], keys: [["sin adivinanzas", "no guessing"]], steps: [
      { kind: "show", anchor: "advice-basis", caption: ["Solo habla de lo que puede mostrarte: nada de adivinanzas.", "It only speaks of what it can show you: no guessing."] },
    ] },
  ],
};

const ASESOR_RITMO: Module = {
  id: "asesor-ritmo", n: 20, title: ["El Asesor en Ritmo", "The Advisor in Rhythm"], mode: "ritmo", ready: true,
  promise: ["Al salir, lees a tu Asesor en Ritmo: su regla, sus horizontes y sus avisos.", "By the end, you read your Advisor in Rhythm: its rule, horizons and notices."],
  chapters: [
    { id: "la-regla", title: ["La regla con nombre", "The named rule"] },
    { id: "horizontes", title: ["Horizontes y avisos", "Horizons and notices"] },
  ],
  scenes: [
    { id: "m18-asesor", chapter: "la-regla", anchors: ["coach"], keys: [["asesor", "advisor"], ["ritmo", "rhythm"]], steps: [
      { kind: "seed", seed: "asesor-meses" },
      { kind: "go", screen: "advice" },
      { kind: "show", anchor: "coach", caption: ["En Ritmo, el Asesor gana su regla con nombre.", "In Rhythm, the Advisor gains its named rule."] },
    ] },
    { id: "m18-regla", chapter: "la-regla", anchors: ["advice-tiles", "advice-rules"], keys: [["50·30·20", "50·30·20"], ["la regla", "the rule"]], steps: [
      { kind: "tap", anchor: "advice-tiles" },
      { kind: "show", anchor: "advice-rules", caption: ["La regla 50·30·20 reparte tu mes: necesidades, gustos, ahorro.", "The 50·30·20 rule splits your month: needs, wants, savings."], contexto: ["Con barras y porcentajes: es guía descriptiva, no una orden.", "With bars and percentages: a descriptive guide, not an order."] },
    ] },
    { id: "m18-horizontes", chapter: "horizontes", anchors: ["advice-medium-cards"], keys: [["horizontes", "horizons"], ["tarjetas", "cards"]], steps: [
      { kind: "show", anchor: "advice-medium-cards", caption: ["Sus horizontes hablan en montos y fechas: tus tarjetas, leídas.", "Its horizons speak in amounts and dates: your cards, read."] },
    ] },
    { id: "m18-avisos", chapter: "horizontes", anchors: ["advice-rules"], keys: [["avisos", "notices"], ["meta y piso", "goal and floor"]], steps: [
      { kind: "show", anchor: "advice-rules", caption: ["Sus avisos citan tu meta y tu piso, con nombre y cifra.", "Its notices cite your goal and your floor, by name and figure."] },
    ] },
    { id: "m18-base", chapter: "horizontes", anchors: ["advice-basis"], keys: [["la base", "the basis"]], steps: [
      { kind: "show", anchor: "advice-basis", caption: ["Su base son tus meses reales, y la declara en cada lectura.", "Its basis is your real months, declared in every reading."] },
    ] },
    { id: "m18-cierre", chapter: "horizontes", anchors: ["advice-plan"], keys: [["el plan", "the plan"]], steps: [
      { kind: "show", anchor: "advice-plan", caption: ["El plan ordena los pasos con montos y fechas.", "The plan orders the steps with amounts and dates."] },
    ] },
  ],
};

/* H-5: su casa final es un capítulo de «Anotar» (o de «Folios · El río»);
 * nace como módulo en preparación por la misma razón que H-1. Al
 * recomponerse el índice, estas escenas se pliegan como capítulo. */
const DEUDAS: Module = {
  id: "deudas", n: 21, title: ["Tus deudas como hechos", "Your debts as facts"], mode: "esencial", ready: true,
  promise: ["Al salir, lees tus deudas como hechos: saldos, vencidos y próximos vencimientos.", "By the end, you read your debts as facts: balances, overdues and next due dates."],
  chapters: [
    { id: "los-hechos", title: ["Los hechos", "The facts"] },
  ],
  scenes: [
    { id: "m19-balanza", chapter: "los-hechos", minMode: "ritmo", anchors: ["debt-scale"], keys: [["balanza", "scale"], ["los dos lados", "both sides"]], steps: [
      { kind: "seed", seed: "modos-hechos" },
      { kind: "go", screen: "fixed" },
      { kind: "show", anchor: "debt-scale", caption: ["Los dos lados de un vistazo: Me deben contra Debo.", "Both sides at a glance: owed to me against I owe."] },
    ] },
    { id: "m19-balanza-h", chapter: "los-hechos", mode: "esencial", anchors: ["debt-net"], keys: [["balanza", "scale"], ["los dos lados", "both sides"]], steps: [
      { kind: "seed", seed: "modos-hechos" },
      { kind: "go", screen: "vault-owed" },
      { kind: "show", anchor: "debt-net", caption: ["Los dos lados, en una línea: tu balance neto de deudas.", "Both sides, in one line: your net debt balance."] },
    ] },
    { id: "m19-medeben", chapter: "los-hechos", anchors: ["debt-owed"], keys: [["me deben", "owed to me"], ["vencido", "overdue"]], steps: [
      { kind: "go", screen: "vault-owed" },
      { kind: "show", anchor: "debt-owed", caption: ["Me deben, como hechos: Ana, C$5,000; Luis venció ayer.", "Owed to me, as facts: Ana, C$5,000; Luis fell due yesterday."] },
    ] },
    { id: "m19-debo", chapter: "los-hechos", minMode: "ritmo", anchors: ["debt-tab-loans", "debt-loans"], keys: [["debo", "i owe"], ["préstamo", "loan"]], steps: [
      { kind: "go", screen: "vault-owe" },
      { kind: "tap", anchor: "debt-tab-loans" },
      { kind: "show", anchor: "debt-loans", caption: ["Debo, como hechos: al Banco se le deben C$20,000.", "I owe, as facts: the Bank is owed C$20,000."] },
    ] },
    { id: "m19-debo-h", chapter: "los-hechos", mode: "esencial", anchors: ["debt-loans"], keys: [["debo", "i owe"], ["préstamo", "loan"]], steps: [
      { kind: "go", screen: "vault-owe" },
      { kind: "show", anchor: "debt-loans", caption: ["Debo, como hechos: al Banco se le deben C$20,000.", "I owe, as facts: the Bank is owed C$20,000."] },
    ] },
    { id: "m19-tarjeta", chapter: "los-hechos", minMode: "ritmo", notMode: "completo", anchors: ["debt-tab-loans", "debt-cards"], keys: [["tarjetas", "cards"]], steps: [
      { kind: "go", screen: "vault-owe" },
      { kind: "tap", anchor: "debt-tab-loans" },
      { kind: "show", anchor: "debt-cards", caption: ["Bajo Debo viven las tarjetas: Actualizar, su hoja.", "Under I owe live the cards: Update, their sheet."] },
    ] },
    { id: "m19-tarjeta-c", chapter: "los-hechos", mode: "completo", anchors: ["debt-tab-loans", "debt-cards"], keys: [["tarjetas", "cards"], ["canjear", "redeem"]], steps: [
      { kind: "go", screen: "vault-owe" },
      { kind: "tap", anchor: "debt-tab-loans" },
      { kind: "show", anchor: "debt-cards", caption: ["Bajo Debo viven las tarjetas: Actualizar, Canjear, su hoja.", "Under I owe live the cards: Update, Redeem, their sheet."] },
    ] },
    { id: "m19-tarjeta-h", chapter: "los-hechos", mode: "esencial", anchors: ["debt-cards"], keys: [["tarjeta", "card"], ["vence", "due"]], steps: [
      { kind: "show", anchor: "debt-cards", caption: ["Cada tarjeta, como hecho: su saldo y su próximo vencimiento.", "Each card, as a fact: its balance and its next due date."] },
    ] },
    { id: "m19-cierre", chapter: "los-hechos", minMode: "ritmo", anchors: ["debt-scale"], keys: [["los hechos", "the facts"]], steps: [
      { kind: "go", screen: "fixed" },
      { kind: "show", anchor: "debt-scale", caption: ["Saldos, vencidos y próximos vencimientos: alcanza para mirar.", "Balances, overdues and next due dates: enough to look with."] },
    ] },
    { id: "m19-cierre-h", chapter: "los-hechos", mode: "esencial", anchors: ["debt-net"], keys: [["los hechos", "the facts"]], steps: [
      { kind: "go", screen: "vault-owed" },
      { kind: "show", anchor: "debt-net", caption: ["Saldos, vencidos y próximos vencimientos: alcanza para mirar.", "Balances, overdues and next due dates: enough to look with."] },
    ] },
  ],
};

export const MODULES: readonly Module[] = [
  MAPA,
  MANUAL,
  ANOTAR,
  BALANZA,
  CAMBIO,
  MES,
  AHORROS,
  ESTADISTICAS,
  ASESOR,
  FOLIOS,
  FOLIOS_DESCANSO,
  ESTRUCTURA,
  PUERTAS,
  PREGUNTA,
  TOTALES,
  COLCHON,
  MODOS,
  HOY,
  ASESOR_ESENCIAL,
  ASESOR_RITMO,
  DEUDAS,
];

export const moduleById = (id: string): Module | undefined => MODULES.find((m) => m.id === id);

/** Toda ancla citada por el registro (la cerca la contrasta con los componentes). */
export function allAnchors(): string[] {
  const out = new Set<string>();
  for (const mod of MODULES) for (const scene of mod.scenes) for (const a of scene.anchors) out.add(a);
  return [...out].sort();
}

/* ============================ LOS PUENTES ============================
 * La búsqueda encuentra escenas; el (?) de un tema ofrece «ver en la
 * presentación»; la repisa «Mis escenas» guarda las del usuario. Todo se
 * apoya en tres piezas puras: el buscador, el lugar real de una escena y
 * el mapa tema→escena. */

/** Plegado de búsqueda: minúsculas, sin acentos (la ñ se queda). */
function foldText(s: string): string {
  return s.toLowerCase().split("ñ").map((p) => p.normalize("NFD").replace(/[\u0300-\u036f]/g, "")).join("ñ");
}

/** La primera explicación con texto de la escena (su nombre legible). */
export function sceneCaption(scene: Scene, lang: 0 | 1): string {
  for (const step of scene.steps) if ("caption" in step && step.caption) return step.caption[lang];
  return "";
}

export type SceneHit = { moduleId: string; sceneId: string; moduleTitle: Pair; caption: Pair };

/** Las escenas que una búsqueda encuentra: por sus llaves, el título del módulo
 *  y su primera explicación. Las llaves mandan: son el vocabulario curado. */
export function searchScenes(query: string, limit = 4): SceneHit[] {
  const words = foldText(query.trim()).split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return [];
  const scored: { hit: SceneHit; score: number }[] = [];
  for (const mod of MODULES) {
    if (!mod.ready) continue;
    for (const scene of mod.scenes) {
      const keyText = scene.keys.flat().map(foldText).join(" ");
      const capText = ([0, 1] as const).map((l) => foldText(sceneCaption(scene, l))).join(" ");
      const titleText = mod.title.map(foldText).join(" ");
      let score = -1;
      if (words.every((w) => keyText.includes(w))) score = 0;
      else if (words.every((w) => capText.includes(w))) score = 1;
      else if (words.every((w) => titleText.includes(w))) score = 2;
      if (score >= 0) {
        const first = scene.steps.find((s) => "caption" in s && s.caption);
        scored.push({ hit: { moduleId: mod.id, sceneId: scene.id, moduleTitle: mod.title, caption: (first && "caption" in first && first.caption) || ["", ""] }, score });
      }
    }
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((s) => s.hit);
}

/** El lugar real de una escena: la última pantalla que el guion visita hasta
 *  ella (incluida). Es el aterrizaje «ir a la función» de la búsqueda. La
 *  pastilla de Archivo dentro de Folios también mueve el lugar: no es un `go`,
 *  pero la función vive ahí. */
export function scenePlace(mod: Module, sceneId: string): string {
  let place = "desk";
  for (const scene of mod.scenes) {
    for (const step of scene.steps) {
      if (step.kind === "go") place = step.screen;
      else if ("anchor" in step && step.anchor === "folios-tab-archivo") place = "archivo";
    }
    if (scene.id === sceneId) return place;
  }
  return place;
}

/** La primera escena del capítulo de una escena: el aterrizaje con contexto
 *  (las escenas de un capítulo dependen del estado que las anteriores dejan). */
export function chapterFirst(mod: Module, sceneId: string): Scene {
  const at = mod.scenes.find((s) => s.id === sceneId);
  if (!at) return mod.scenes[0]!;
  return mod.scenes.find((s) => s.chapter === at.chapter) ?? at;
}

/** Tema del manual → la escena que lo enseña. Solo temas con escena propia:
 *  el (?) de esos temas ofrece «Ver en la presentación». */
export const TOPIC_SCENES: Record<string, { moduleId: string; sceneId: string }> = {
  "queda": { moduleId: "manual", sceneId: "m2-aterriza-tema" },
  "huella": { moduleId: "puertas", sceneId: "m11-huella" },
  "cerrar-sesion": { moduleId: "puertas", sceneId: "m11-sesion" },
  "estructura": { moduleId: "estructura", sceneId: "m10-estructura" },
  "seguro-vida": { moduleId: "estructura", sceneId: "m10-seguro" },
  "copias": { moduleId: "estructura", sceneId: "m10-copias" },
  "folios": { moduleId: "folios", sceneId: "m9-folios" },
  "central": { moduleId: "mapa", sceneId: "m1-central" },
  "estudio": { moduleId: "estadisticas", sceneId: "m7-estudio" },
  "asesor": { moduleId: "asesor", sceneId: "m8-asesor" },
  "libros": { moduleId: "anotar", sceneId: "m3-fijos" },
  "ajustes": { moduleId: "mapa", sceneId: "m1-ajustes" },
  "donde-vive": { moduleId: "pregunta", sceneId: "m12-pregunta" },
  "ahorros-banda": { moduleId: "totales", sceneId: "m13-titular" },
  "cuentas": { moduleId: "totales", sceneId: "m13-cuentas" },
  "apartado-mes": { moduleId: "totales", sceneId: "m13-apartado" },
  "bolsas": { moduleId: "totales", sceneId: "m13-luces" },
  "colchon": { moduleId: "colchon", sceneId: "m14-piso" },
  "modos": { moduleId: "modos", sceneId: "m15-modos" },
  "puedes-gastar-hoy": { moduleId: "hoy", sceneId: "m16-numero" },
  "asesor-esencial": { moduleId: "asesor-esencial", sceneId: "m17-asesor" },
  "asesor-ritmo": { moduleId: "asesor-ritmo", sceneId: "m18-asesor" },
  "deudas-hechos": { moduleId: "deudas", sceneId: "m19-balanza-h" },
};
