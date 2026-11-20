/**
 * mode — el modo de uso de Faro (Esencial · Ritmo · Completo), etapas 1 y 2 de la
 * ola de los tres modos (expediente: faro-modes/DISENO-TRES-MODOS.md §2, SINTESIS.md).
 *
 * El modo es un filtro de LECTURA y de CAPACIDADES sobre el mismo libro: nunca
 * borra, nunca mueve un centavo, nunca toca el almacenamiento. La etapa 1 nació
 * con el lector del modo de la persona (`modeOf`), el conteo real de lo que
 * dormiría al bajar (`modeImpact`) y lo que se destapa al subir
 * (`unlockedGroups`). La etapa 2 promueve este módulo al REGISTRO COMPLETO de
 * funciones (FEATURES, transcrito de CENSO-FUNCIONES.md con los fallos D-bis de
 * SINTESIS.md aplicados) y al ÚNICO punto de filtrado: `hasFeature` responde si
 * una función vive en un modo, y `featureForGo` dice qué función es un destino
 * de salto. Ninguna superficie filtra por su cuenta: el registro se consume
 * solo vía el contexto del proveedor (`useFaro().has`) y los dos asientos
 * declarados (settings-search.ts y el propio goTopic del proveedor).
 *
 * EL CENSO DE AVISOS (etapa 3.3, T-5 — aviso D-5 CERRADO): modeImpact ya no
 * lee las reglas con las opciones por defecto; consume `alertCensus` de
 * rules.ts, el censo derivado en la fuente (los constructores que leen la
 * ventana de dues.ts y la lectura de patron.ts en su origen), sin pasar por
 * el filtro de modo del libro actual.
 */
import { makeNamer } from "./defaults.ts";
import { isPrimerica } from "./retiro.ts";
import { alertCensus, type RuleId } from "./rules.ts";
import { savingsStock } from "./savings.ts";
import type { Lang, LedgerState, Settings } from "./types.ts";

export type Mode = "esencial" | "ritmo" | "completo";

/** De menos a más: el orden ES la comparación (un modo incluye los de abajo). */
export const MODES: readonly Mode[] = ["esencial", "ritmo", "completo"];

export const modeRank = (mode: Mode): number => MODES.indexOf(mode);

/** ¿Alcanza el modo `current` el mínimo `min`? (Inclusión acumulativa:
 * Esencial ⊂ Ritmo ⊂ Completo.) Nacido en modes.ts con la entrega de la
 * Presentación; vive aquí desde la etapa 5, junto al tipo canónico. */
export const modeReaches = (current: Mode, min: Mode): boolean => modeRank(current) >= modeRank(min);

export function isMode(value: unknown): value is Mode {
  return value === "esencial" || value === "ritmo" || value === "completo";
}

/** La lectura canónica del modo de una persona. Ausente (o ilegible) = Completo:
 *  el Faro de siempre, entero — ningún libro pierde una pieza porque el campo
 *  todavía no exista (fallo X-7 del expediente; cercado en modos293.test.ts). */
export function modeOf(settings: Settings): Mode {
  return isMode(settings.mode) ? settings.mode : "completo";
}

/** Una función que duerme por debajo de su modo mínimo, con su conteo real. */
export type DormantGroup = {
  id: string;
  /** Modo mínimo de la función (CENSO-FUNCIONES.md, con los fallos D-bis). */
  min: Mode;
  /** Clave i18n del nombre en plural que la pantalla de impacto lista con su n. */
  labelKey: string;
  count: (state: LedgerState) => number;
};

const seriesCount = (state: LedgerState, pred: (line: LedgerState["months"][string]["lines"][number]) => boolean): number => {
  const seen = new Set<string>();
  for (const month of Object.values(state.months)) for (const line of month.lines) {
    if (line.active && !line.rest && pred(line)) seen.add(line.seriesId || line.id);
  }
  return seen.size;
};

const lastKeyOf = (state: LedgerState): string => {
  const keys = Object.keys(state.months).sort();
  return keys[keys.length - 1] ?? "";
};

/** ¿Es esta serie la Primerica de FÁBRICA, aún sin tocar? (Fallo de Oscar,
 *  2026-11-15 23:02: la serie que `seedRetiro` siembra en cada libro — una línea
 *  de C$0 con la marca de fábrica — le pertenece a él personalmente; en el libro
 *  de otra persona NO es un bolsillo suyo y no cuenta como bolsillo dormido en
 *  la pantalla de impacto, A MENOS que la persona la instituya manualmente.)
 *  La lectura elegida de «instituir» (declarada en BUILD-PLAN): la serie deja de
 *  ser la de fábrica cuando alguna de sus líneas trae un acto propio de dinero
 *  — un apartado con monto, un saldo puesto por la persona o historial — o
 *  cuando alguna línea ya no es una línea Primerica (la serie creció más allá
 *  de la semilla). Las semillas repetidas mes a mes (una por mes, cada una su
 *  propia serie de C$0) quedan todas fuera del conteo mientras nadie las toque. */
function factoryPrimericaUntouched(state: LedgerState, seriesId: string): boolean {
  let saw = false;
  for (const month of Object.values(state.months)) {
    for (const line of month.lines) {
      if ((line.seriesId || line.id) !== seriesId) continue;
      saw = true;
      // Un acto de dinero instituye, venga de la línea que venga (apartado con
      // monto, saldo anotado aunque sea C$0, historial).
      if (line.amountMinor !== 0 || line.balanceMinor != null || line.history.length > 0) return false;
      // La serie es la de fábrica solo si CADA línea nació de la semilla: trae
      // su marca de nacimiento (`preset`, que ningún rótulo toca) o — libros
      // anteriores a la marca — su etiqueta intacta. Una línea que no nació
      // de la semilla es una línea propia en la serie: la instituye.
      // Ola de prejuicio 1 (B-3/G-7): antes el test era solo la etiqueta
      // (concepto/icono), así que renombrar Y re-iconizar la línea de fábrica
      // — dos gestos de aspecto, ningún centavo — la «instituía». Con la
      // marca, los rótulos pueden cambiar todos: sin acto de dinero ni línea
      // propia, la serie sigue siendo la de fábrica. «Apartados, no rótulos.»
      if (line.preset !== "primerica" && !isPrimerica(line)) return false;
    }
  }
  return saw;
}

/** Las bolsas con plan: las series cuyo sub es una de las tres bolsas de fábrica
 *  (el mismo test de sufijo que usa toda la app: funds.ts / screens.tsx). La
 *  Primerica de fábrica sin instituir no cuenta (fallo de Oscar, arriba). */
const pocketSeries = (state: LedgerState): number => {
  const stock = savingsStock(state, lastKeyOf(state));
  let n = 0;
  for (const [sid, row] of stock.series) {
    if (!row.subId.endsWith(".meta") && !row.subId.endsWith(".retiro") && !row.subId.endsWith(".emergencia")) continue;
    if (row.subId.endsWith(".retiro") && factoryPrimericaUntouched(state, sid)) continue;
    n += 1;
  }
  return n;
};

/** Los fondos con naturaleza declarada (saldo o aparte): la distinción duerme en
 *  Esencial Y en Ritmo — en Ritmo se ven como ahorro simple (fallo D-bis #8). */
const declaredSeries = (state: LedgerState): number => {
  const stock = savingsStock(state, lastKeyOf(state));
  let n = 0;
  for (const row of stock.series.values()) if (row.cls === "saldo" || row.cls === "aparte") n += 1;
  return n;
};

export const DORMANT_GROUPS: readonly DormantGroup[] = [
  { id: "cuotas", min: "ritmo", labelKey: "mode.g.cuotas", count: (s) => seriesCount(s, (l) => l.kind === "subscription") },
  { id: "prestamos", min: "ritmo", labelKey: "mode.g.prestamos", count: (s) => (s.loans ?? []).filter((l) => !l.archived).length },
  { id: "medeben", min: "ritmo", labelKey: "mode.g.medeben", count: (s) => (s.lent ?? []).filter((l) => !l.archived).length },
  { id: "tarjetas", min: "ritmo", labelKey: "mode.g.tarjetas", count: (s) => (s.cards ?? []).filter((c) => !c.archived).length },
  { id: "personas", min: "ritmo", labelKey: "mode.g.personas", count: (s) => (s.people ?? []).filter((p) => !p.archived).length },
  { id: "remesas", min: "ritmo", labelKey: "mode.g.remesas", count: (s) => (s.remitPeople ?? []).length },
  { id: "bolsillos", min: "ritmo", labelKey: "mode.g.bolsillos", count: pocketSeries },
  { id: "naturalezas", min: "completo", labelKey: "mode.g.naturalezas", count: declaredSeries },
  { id: "seguro", min: "completo", labelKey: "mode.g.seguro", count: (s) => s.structure.catalog.filter((i) => i.kind === "ins" && !!i.ins).length },
  { id: "apartados", min: "completo", labelKey: "mode.g.apartados", count: (s) => (s.restingSpans ?? []).length },
  { id: "importacion", min: "completo", labelKey: "mode.g.importacion", count: (s) => s.imports?.sources.length ?? 0 },
];

/** El modo mínimo de cada familia de avisos del Asesor (CENSO-FUNCIONES §3.5):
 *  vencimientos = Esencial (llegan siempre); el resto sube con el modo. Las
 *  familias de profundidad (Patrón, meta, colchón, piso, sobre-compromiso, seguro)
 *  son Completo porque leen lo que solo Completo muestra. */
export const RULE_MIN_MODE: Record<RuleId, Mode> = {
  due: "esencial",
  category: "ritmo",
  outlier: "ritmo",
  recurring: "ritmo",
  pace: "completo",
  goal: "completo",
  cushion: "completo",
  floor: "completo",
  overcommit: "completo",
  insurance: "completo",
};

export type ModeImpact = {
  /** Grupos con datos reales que duermen bajo el modo destino, con su conteo. */
  groups: { id: string; labelKey: string; count: number }[];
  /** Familias de avisos vivos que dejarían de llegar, con su conteo. */
  alerts: { id: RuleId; count: number }[];
  total: number;
};

const currentKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/** El día de hoy como «AAAA-MM-DD»: la fecha de referencia de un conteo. */
export const currentRefDay = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/** Lo que una bajada al modo `target` pondría a dormir EN ESTE LIBRO, contado de
 *  verdad. Sin nada que avisar (total 0) no hay pantalla de impacto: el principio
 *  5 manda — un aviso sin objeto es un cadáver. */
export function modeImpact(state: LedgerState, target: Mode, lang: Lang, refDay?: string): ModeImpact {
  const rank = modeRank(target);
  // Ola de prejuicio 1 (B-1/B-2): la mitad «grupos» cruza el modo actual igual
  // que la mitad «avisos» ya hacía — un grupo solo se anuncia si HOY está
  // despierto y en el destino duerme. Sin el cruce, bajar de Ritmo a Esencial
  // anunciaba como recién dormidos los grupos de Completo, que en Ritmo ya
  // dormían: la pantalla aparecía sin objeto nuevo (principio 5). Y los
  // conteos de cada grupo ya filtran lo archivado en su propia función: lo
  // archivado vive en el Archivo en los tres modos y bajar no lo duerme.
  const currentRank = modeRank(modeOf(state.settings));
  const groups = DORMANT_GROUPS
    .filter((g) => modeRank(g.min) > rank && modeRank(g.min) <= currentRank)
    .map((g) => ({ id: g.id, labelKey: g.labelKey, count: g.count(state) }))
    .filter((g) => g.count > 0);
  // 3.3 (T-5): el censo derivado en la fuente, cruzado con la verdad de cada
  // familia: una familia cuenta en el impacto solo si HOY llega y en el
  // destino deja de llegar. «Llega en un modo» es la misma prueba del filtro
  // de rules.ts — el mínimo de la tabla, con el caso X-10: pace vive desde
  // Ritmo en su forma lineal, así que bajar de Completo a Ritmo NO lo apaga
  // (cambia de forma, no deja de llegar) y bajar a Esencial sí.
  const current = modeRank(modeOf(state.settings));
  const liveAt = (id: RuleId, r: number) => (id === "pace" ? r >= modeRank("ritmo") : modeRank(RULE_MIN_MODE[id]) <= r);
  // Ola 3 (Cambios C3-2): el censo de avisos se cuenta contra la FECHA de
  // referencia que el llamador fijó al contar la primera vez (`refDay`,
  // «AAAA-MM-DD»: su mes manda la llave y su día se pasa como `today` al
  // censo, porque familias como pace leen el día dentro del mes). El
  // reconteo al confirmar compara contra la misma fecha, para que el
  // calendario no se disfrace de cambio del libro — la misma foto a las
  // 23:59 del día 30 daba un total y a las 00:01 del día 1 otro, y la
  // línea de «tu libro cambió» acusaba a la persona de la medianoche.
  const censusKey = refDay ? refDay.slice(0, 7) : currentKey();
  const censusToday = refDay ? { today: new Date(`${refDay}T12:00:00`) } : {};
  const alerts = alertCensus(state, censusKey, lang, makeNamer(state.structure, lang), censusToday)
    .filter((a) => liveAt(a.id, current) && !liveAt(a.id, rank));
  const total = groups.reduce((acc, g) => acc + g.count, 0) + alerts.reduce((acc, a) => acc + a.count, 0);
  return { groups, alerts, total };
}

/** Los grupos que una subida de `from` a `to` destapa EN ESTE LIBRO (para el
 *  aviso posterior: subir no pide nada, pero tampoco es silencioso — nombra lo
 *  que se abrió). Ola de prejuicio 1 (B-4): el aviso lee el libro igual que la
 *  pantalla de impacto lee el suyo — un grupo solo se nombra si este libro
 *  tiene datos suyos que de verdad se destapan; antes la función ni recibía
 *  el libro y recitaba el catálogo entero, nombrando lo ausente y enterrando
 *  lo único real en el «y N más». */
export function unlockedGroups(state: LedgerState, from: Mode, to: Mode): { id: string; min: Mode; labelKey: string; count: number }[] {
  return DORMANT_GROUPS
    .filter((g) => modeRank(g.min) > modeRank(from) && modeRank(g.min) <= modeRank(to))
    .map((g) => ({ id: g.id, min: g.min, labelKey: g.labelKey, count: g.count(state) }))
    .filter((g) => g.count > 0);
}

/* ════════════════════════════════════════════════════════════════════════════
 * OLA 10 (C10-2) — EL DIÁLOGO ABIERTO VIGILA LAS LLEGADAS
 *
 * Los dos diálogos de modo (el de impacto y el repuesto) nacieron
 * comparando premisas SOLO al confirmar (curas C3-1 y C4-1): con el
 * diálogo abierto, una llegada — otra pestaña, la nube — podía aterrizar
 * en su propio destino o entre su origen y su destino y el diálogo
 * seguía preguntando con las premisas congeladas, byte por byte; y
 * confirmar entonces no ejecutaba nada y no explicaba nada. Esta función
 * pura decide la reacción del diálogo abierto ante el modo VIVO, con la
 * misma geometría que sus confirmaciones ya asentadas:
 *   · el libro ya está en el destino → CERRAR (la llegada se anunció por
 *     su propia puerta; el diálogo ya no tiene pregunta);
 *   · la dirección se invirtió (ir al destino ya es subir para el de
 *     impacto, o bajar para el repuesto) → CONVERTIR al hermano, con las
 *     premisas vivas;
 *   · sigue siendo la misma pregunta pero el origen o los conteos se
 *     movieron → REFRESCAR el diálogo con el recuento vivo (y si el
 *     impacto se evaporó, total 0, la advertencia quedó sin objeto:
 *     principio 5 — CERRAR; un toque nuevo aplica directo);
 *   · nada cambió → QUEDARSE.
 * El vigilante jamás aplica un cambio de modo: reacciona sobre el
 * diálogo, no sobre el libro. ════════════════════════════════════════ */
export type ModeDialogReaction =
  | { kind: "stay" }
  | { kind: "close" }
  | { kind: "refresh-impact"; from: Mode; impact: ModeImpact }
  | { kind: "refresh-reposed"; from: Mode; unlocked: { id: string; labelKey: string; count: number }[]; fresh?: boolean }
  | { kind: "to-reposed"; from: Mode; unlocked: { id: string; labelKey: string; count: number }[] }
  | { kind: "to-impact"; from: Mode; impact: ModeImpact };

const impactSignature = (i: ModeImpact): string =>
  `${i.total}|${i.groups.map((g) => `${g.id}:${g.count}`).join(",")}|${i.alerts.map((a) => `${a.id}:${a.count}`).join(",")}`;
const unlockedSignature = (u: { id: string; count: number }[]): string => u.map((g) => `${g.id}:${g.count}`).join(",");

export function modeDialogReaction(args: {
  dialog: "impact" | "reposed";
  from: Mode;
  target: Mode;
  live: Mode;
  state: LedgerState;
  lang: Lang;
  refDay?: string;
  currentImpact?: ModeImpact;
  currentUnlocked?: { id: string; count: number }[];
  /** Ola 12 (C12-1): la naturaleza del diálogo abierto — true cuando la
   * pregunta nació fresca del toque de la persona (.318). El refresco la
   * CONSERVA solo si el modo no se movió: un refresco por conteos no
   * puede reescribir la pregunta de subir con la narración de un cambio
   * de modo que no ocurrió; si el modo se movió de verdad, la pregunta
   * se re-plantea y el cuerpo del re-planteado es la verdad. */
  fresh?: boolean;
}): ModeDialogReaction {
  const { dialog, from, target, live, state, lang, refDay } = args;
  if (live === target) return { kind: "close" };
  if (dialog === "impact") {
    if (modeRank(live) < modeRank(target)) {
      return { kind: "to-reposed", from: live, unlocked: unlockedGroups(state, live, target) };
    }
    const fresh = modeImpact(state, target, lang, refDay);
    if (fresh.total === 0) return { kind: "close" };
    if (live !== from || !args.currentImpact || impactSignature(fresh) !== impactSignature(args.currentImpact)) {
      return { kind: "refresh-impact", from: live, impact: fresh };
    }
    return { kind: "stay" };
  }
  if (modeRank(live) > modeRank(target)) {
    const fresh = modeImpact(state, target, lang, refDay);
    if (fresh.total === 0) return { kind: "close" };
    return { kind: "to-impact", from: live, impact: fresh };
  }
  const freshUnlocked = unlockedGroups(state, live, target);
  if (live !== from || unlockedSignature(freshUnlocked) !== unlockedSignature(args.currentUnlocked ?? [])) {
    return { kind: "refresh-reposed", from: live, unlocked: freshUnlocked, fresh: args.fresh === true && live === from };
  }
  return { kind: "stay" };
}

/** El modo donde se gestiona el bolsillo al que pertenece una serie, por su
 *  sub — o null cuando la serie vive en el segmento llano de Ahorros, que se
 *  gestiona en Esencial (su dinero no es mudo en ningún modo). Lo usa la fila
 *  de fondos mudos de Central para decir la verdad: nombra el modo verdadero
 *  de cada fondo (ola de prejuicio 1, B5 de la Cara y B-5 de Cambios — la
 *  fila decía «Completo» siempre, y contaba como mudo un fondo del segmento
 *  de Ahorros que la persona gestiona en el modo en que ya está). */
export function pocketModeOf(subId: string): Mode | null {
  if (subId.endsWith(".retiro")) return FEATURES["vault.retiro"];
  if (subId.endsWith(".meta")) return FEATURES["vault.meta"];
  if (subId.endsWith(".emergencia")) return FEATURES["vault.emergencia"];
  return null;
}

/* ════════════════════════════════════════════════════════════════════════════
 * ETAPA 2 — EL REGISTRO COMPLETO DE FUNCIONES (HasFeature)
 *
 * Cada función de Faro con su modo mínimo, transcrito fila a fila de
 * CENSO-FUNCIONES.md (superficies §1, ajustes §2, profundidad §3) con los
 * fallos D-bis de SINTESIS.md aplicados DONDE el fallo contradice la propuesta
 * del censo — el fallo manda. Las lecturas elegidas en los puntos partidos
 * quedan declaradas en BUILD-PLAN.md (sección de discrepancias de la etapa 2).
 *
 * «Transversal» del censo = vive en los tres modos: su mínimo es Esencial,
 * porque Esencial es el suelo del filtro (hasFeature lo deja pasar siempre).
 * El registro se consume SOLO vía el contexto del proveedor (useFaro().has) y
 * los asientos declarados (goTopic y settings-search.ts); ninguna superficie
 * importa esta tabla por su cuenta (cerca de grep en modos294.test.ts).
 * ════════════════════════════════════════════════════════════════════════════ */

const E = "esencial" as const;
const R = "ritmo" as const;
const C = "completo" as const;

export const FEATURES = {
  /* §1.1 Navegación y dock */
  "nav.dock": E, "nav.books-hub": E, "nav.books-subs-entry": R, "nav.vault-bar": E,
  "nav.scale-topbar": R,
  // Ola 2 (C-2/C-3/C-5): las vistas, la ventana flotante y la lupa son CROMO
  // UNIVERSAL de la barra — la cara los pinta sin puerta en los tres modos,
  // el tema 1.7 del Manual vive en Esencial, el módulo 1 las enseña con las
  // manos y el fallo 14 declara la búsqueda ciega al modo. El registro decía
  // Completo/Ritmo y featureForGo mentía al saltar («Eso vive en Completo»)
  // con el botón despierto en la barra. El registro sigue a la cara y a la
  // ley; lo que el modo regula de la búsqueda es el aterrizaje, destino a
  // destino, no la lupa. Y el anillo: ya no existe como puerta única — camina
  // en todo modo con sus paradas filtradas una a una (ley N-1, modos295);
  // el asiento nombra el cromo, que es de los tres modos.
  "nav.tablet-views": E, "nav.float-window": E,
  // 1.3.318 (palabra de Oscar, 2026-11-18): el calendario ES de Esencial —
  // «el plan es esencial»: la persona planea lo que viene en todo modo. En
  // Esencial el calendario presenta su cara de plan (días, puntos, nombres,
  // vencimientos, feriados); el pie de totales del mes (entra/sale/queda)
  // es lectura y vive en su propio asiento, de Ritmo.
  "nav.calendar": E, "nav.calendar-totals": R,
  "nav.global-search": E, "nav.undo": E, "nav.sync-light": E, "nav.view-currency-bar": E,
  "nav.day-night": E, "nav.swipe": E, "nav.ring": E, "nav.toolsheet": E,
  /* §1.2 Central */
  "central.month-left": E, "central.month-used": E, "central.month-rate": E,
  "central.lens-have": E, "central.lens-spend": E, "central.lens-pagos": E,
  "central.list": E, "central.edit-line": E, "central.debt-light": R,
  "central.first-line": E, "central.cobros-panel": E, "central.quickadd": E,
  /* §1.3 Cobros — los hechos de los dos lados viven en Esencial (fallo D-bis 31),
     y con ellos su asiento: la lente Pagos, el panel y los dos lados son de
     Esencial desde el veredicto de Oscar de 2026-11-16 («En Esencial se quedó
     Cobros afuera… la gente vive endeudada»): la oleada dejó los hechos en
     Esencial pero la casa en Ritmo, y Cobros no existía en Central. En
     Esencial la ventana toma su forma lectora (la rama de debt.scale: los
     hechos de DebtsReadOnly); la gestión — pista con importes, lista rápida,
     alta rápida, archivo y el puente a Libros — queda en Ritmo, como el
     propio fallo 31 la acota. */
  "debt.facts": E, "cobros.owed-side": E, "cobros.owe-side": E, "cobros.timeline": R,
  "cobros.quick-list": R, "cobros.quick-add": R, "cobros.archive": R, "cobros.see-all": R,
  /* §1.4 Libros — máquina común (el escaneo al añadir es scan.receipt) */
  "books.list": E, "books.add-line": E, "books.edit-line": E, "books.currency": E,
  "books.filter-chips": R, "books.cloud": C, "books.bubble-editor": C, "books.bookkit": C,
  "books.multiselect": R, "books.vault-order": C,
  /* §1.5 Bóveda de ahorros (la barra de Central: lectura del censo; X-3 se falla en 3.1) */
  "central.save-band": E, "vault.save": E, "vault.meta": R, "vault.retiro": R,
  "vault.retiro-sheet": C, "vault.emergencia": R, "vault.segments": C, "vault.kept": C,
  "vault.free": C, "vault.monthly-setaside": R, "vault.setaside-split": C,
  "vault.savings-goal-pct": R, "vault.span-cut": R, "vault.pot": R, "vault.lever": C,
  "vault.order-pockets": C, "vault.pin-block": C, "vault.add-line": E, "vault.move-line": C,
  "vault.rename": R, "vault.delete": C, "vault.look": C, "vault.factory-restore": C,
  "vault.meta-plan": R, "vault.retiro-fields": C,
  /* §1.6 Naturalezas de fondos — la pregunta simple al crear vive desde Esencial
   * (fallo D-bis 36: «Esencial pregunta siempre»); la postura que la fija es de
   * Ritmo y el análisis por naturaleza, de Completo (SINTESIS A, F-1). */
  "nature.class-cuenta": C, "nature.class-retiro": R, "nature.class-aparte": C,
  "nature.class-saldo": C, "nature.class-undeclared": E, "nature.ask": E,
  "nature.naturepick-full": C, "nature.declare-series": C, "nature.free-guard": C,
  "nature.undeclared-encounter": C, "nature.band-migration": C, "nature.cushion": C,
  "nature.overcommit": C, "nature.light": C, "nature.save-note": C,
  /* §1.7 Cuentas bancarias (fallo D-bis 7: saldo simple en Esencial) */
  "accounts.panel-simple": E, "accounts.panel": R, "accounts.add": R,
  "accounts.seed-banks": E, "accounts.move": E, "accounts.opening": R,
  "accounts.reorder": C, "accounts.pin-panel": C,
  /* §1.8 Libros por tipo (ENMIENDA OLA 9: shop-catalog-gear a Ritmo — el
   * engranaje del catálogo pinta y trabaja en la tira del libro Compras,
   * cara de Ritmo, haciendo el negocio de Ritmo; declarado en Completo,
   * el registro mentía sin consumidor que lo desmintiera en una cara) */
  "books.income": E, "books.fixed": E, "books.variable": E, "books.shops": R,
  "books.shop-catalog-gear": R, "books.subs": R,
  /* §1.9 Recurrentes y cadencias (fallo D-bis 5: la cadencia básica se declara
   * al registrar, en Esencial; la maquinaria alrededor sigue en Ritmo) */
  "subs.cuota": R, "subs.fixed-exists": E, "subs.cadence-basic": E,
  "subs.cadence-machinery": R, "subs.brand-library": R, "subs.own-chips": C,
  "subs.brand-icon-admin": C, "subs.brand-detect": R, "subs.cadences-base": E,
  "subs.cadence-custom": C, "subs.my-frequencies": C, "subs.freq-chips": C,
  "subs.dues-window": R, "alerts.due": E,
  /* §1.10 Deudas — la cifra neta es un hecho (D-bis 31); la balanza, su foto */
  "debt.scale": R, "debt.net": E, "debt.chart": C, "debt.total": R,
  "lent.no-interest": R, "lent.interest": C, "lent.payment": R, "lent.history": C,
  "lent.archive": R, "lent.bulk-edit": C, "debt.line-balance": R,
  /* §1.11 Préstamos recibidos */
  "loans.add": R, "loans.interest": C, "loans.due-day": R, "loans.pay": R,
  "loans.pay-split": C, "loans.interest-paid": C, "loans.archive": R,
  "loans.bulk-edit": C, "loans.payoff-plan": C, "loans.payoff-params": C,
  "loans.payoff-result": C, "loans.payoff-est-rate": C,
  /* §1.12 Instrumentos (fallo D-bis 37: la tasa manual se puede teclear desde
   * Esencial; fallo D-bis 8: la calculadora simple es de Ritmo) */
  "tools.rate-view": E, "tools.rate-refresh": E, "tools.rate-manual": E,
  "tools.converter": E, "tools.converter-chips-admin": C, "tools.converter-use": E,
  "tools.converter-send": R, "tools.calculator": R, "tools.calculator-float": C,
  "tools.calculator-use": R, "tools.slips": R, "tools.slips-reuse": R,
  "tools.slip-to-category": C, "tools.slips-bulk": C,
  /* §1.13 Editor de línea y selección (fallos D-bis 9 y 4: tienda y categoría de
   * la compra bajan a Esencial; la selección múltiple entera vive en Ritmo) */
  "editor.core": E, "editor.currency": E, "editor.category": E, "editor.note": E,
  "editor.savings-balance": E, "editor.paid-with": R, "editor.active-toggle": R,
  "editor.recurrent-toggle": R, "editor.debt-balance": R, "editor.nature": C,
  "editor.person": R, "editor.for-remit": R, "editor.shop-fields": E,
  "editor.shop-fine": C,
  /* Ola 8 (CARA-2): dos asientos salen de la deuda del registro. El look
   * PROPIO de la línea (su ícono y su color) es dato de creación — se
   * elige al crear, su tema f-color vive en Esencial y la cara ya lo
   * pintaba allí: editor.icon-color baja a Esencial, porque el asiento
   * era la mentira, no la cara. Administrar el CATÁLOGO desde el selector
   * (renombrar, ocultar, el color de la categoría) es administrar, y el
   * fallo de Catálogo lo da a Ritmo: editor.picker-manage baja a Ritmo y
   * gana su consumidor en fit-pick.tsx. Administrar las marcas (borrar,
   * restaurar de fábrica) sigue en Completo y gana el suyo allí mismo
   * (CARA-3): subs.brand-icon-admin. */
  "editor.icon-color": E, "editor.picker-manage": R,
  /* Fallo de Oscar (2026-11-18 18:11 EST, revirtiendo el suyo de las
   * 18:08): «corregir un nombre es esencial. Si algo está mal escrito,
   * todos los usuarios deben tener la opción de corregir su nombre.»
   * Corregir un nombre mal escrito es parte de registrar, no de
   * administrar: el renombre sale de editor.picker-manage y gana su
   * asiento propio, Esencial, con dos consumidores — los selectores del
   * catálogo (fit-pick.tsx) y el editor del Catálogo de Ajustes
   * (screens.tsx) — porque el principio es el nombre, no la superficie.
   * Ocultar y el color siguen en Ritmo, con picker-manage. */
  "editor.picker-rename": E,
  "editor.save-guard": E, "editor.draft": E,
  "selection.engine": R, "selection.delete": R, "selection.move": R,
  /* §1.14 Personas y contactos */
  // Ola 2 (C-5): añadir una persona es declarar en el punto de uso — el
  // criterio asentado (declarar/añadir al crear = Esencial) respalda a la
  // cara, que pinta la tarjeta con su verbo en Esencial; el asiento decía R.
  "people.card": E, "people.add-contacts": R, "people.add-manual": R,
  "people.dates": R, "people.gift": R, "people.import-vcf": C, "people.share-in": C,
  "people.totals": C, "people.delete": R,
  /* §1.15 Remesas */
  "remit.send": R, "remit.for": R, "remit.card": R, "remit.manage": C,
  /* §1.16 Bancos, tarjetas y recompensas (fallo D-bis 10: alta corta en Ritmo) */
  "cards.group": R, "cards.add": R, "cards.add-full": C, "cards.update": R,
  "cards.pay": R, "cards.edit-delete": R, "cards.factory": C, "cards.capture-add": C,
  "cards.ficha": C, "cards.usage-advice": C, "cards.rewards": C,
  "cards.rewards-redeem": C, "cards.rewards-group": C, "cards.rewards-reconcile": C,
  /* §1.17 Seguro de vida — la pieza entera es de Completo */
  "ins.piece": C, "ins.setup": C, "ins.premium-line": C, "ins.beneficiaries": C,
  "ins.start": C, "ins.premiums-paid": C, "ins.change-notice": C, "ins.not-money": C,
  /* §1.18 Folios — Historial (fallos D-bis 11, 12, 13 y 14 aplicados) */
  "hist.river": E, "hist.row-origin": E, "hist.lens-week-month": E, "hist.lens-year": E,
  "hist.nav": E, "hist.totals": E, "hist.search-text": E, "hist.search-global": E,
  "hist.synonyms": E, "hist.filter-direction": E, "hist.filter-category": E,
  "hist.filter-group": R, "hist.filter-store": R, "hist.filter-account": R,
  "hist.filter-amount": R, "hist.filter-recurring": R, "hist.filter-origin": C,
  "hist.filter-import-lot": C, "hist.saved-views": R, "hist.paging": E,
  "hist.search-people-cards": E,
  /* §1.19 Folios — Archivo (fallo D-bis 15: el par se queda en los tres modos;
   *  ola de prejuicio 1, B1: los verbos de los períodos apartados también son
   *  existencia, no gestión — Fo-1 manda que el grupo entero no cambia, así
   *  que restaurar un período y borrar lo propio viven en los tres modos) */
  "archive.rest-gate": E, "archive.hide-period": C, "archive.hide-one": C,
  "archive.hide-selection": C, "archive.span-card": C, "archive.restore-span": E,
  "archive.delete-span": E, "archive.delete-lines": E,
  // Ola 2 (C-5): restaurar las entidades propias es EXISTENCIA (Fo-1
  // asentado: Archivo y restaurar viven en los tres modos, sin puerta) — la
  // cara ya obedecía el fallo; los asientos decían Ritmo.
  "archive.restore-lent": E,
  "archive.restore-loan": E, "archive.restore-card": E, "archive.restore-owe": E,
  "archive.pair": E,
  /* §1.20 Importación bancaria — entera en Completo */
  "import.bank": C, "import.guides": C,
  /* §1.21 Escaneo (fallo D-bis 16: el recibo se fotografía desde Esencial, con
   * su revisión simplificada; la revisión sigue al escaneo. Ola 1: la
   * revisión COMPLETA — cambiar el destino y declarar la cadencia — es de
   * Ritmo; en Esencial el destino se lee como texto y la cadencia guardada
   * es la que el lector leyó. La hoja era ciega al modo: ningún asiento la
   * gobernaba.) */
  "scan.receipt": E, "scan.receipt-review": E, "scan.receipt-full-review": R,
  "scan.receipt-rewards-row": C,
  "scan.retirement-stmt": C, "scan.card-capture": C,
  /* §1.27 Captura inteligente (Ola 1, brief BRIEF-OLA-1 §3: los asientos se
   * declaran ANTES que la superficie, con el mismo reparto del escaneo —
   * la bandeja y la mesa simple viven en Esencial; la mesa completa —
   * reclasificar en bache y recordar la tienda — es de Ritmo.) */
  "capture.tray": E, "capture.review": E, "capture.review-full": R,
  /* §1.27b Captura inteligente, Ola 2 (mapa F2): escribir como pienso es
   * declarar, como el apunte rápido — Esencial. El intérprete jamás
   * guarda: sus borradores caen en la bandeja y solo la mesa escribe. */
  "capture.text": E,
  /* §1.22 Bandeja de documentos compartidos — enrutado por modo */
  "inbox.bank": C, "inbox.vcf": R, "inbox.image-card": C, "inbox.image-receipt": E,
  /* §1.23 Exportar informes (fallo D-bis 17: panel recompuesto desde Ritmo) */
  "export.panel": R, "export.full-sheets": C,
  /* §1.24 Modo de ejemplo (fallo D-bis 18: la casa se mira con la cara del modo) */
  "sample.door": E, "sample.house-filtered": E,
  /* §1.25 Widget — la cara por modo del censo, con el veredicto del Patrón en
   * Completo (fallo D-bis 22 y X-6: en Ritmo la foto no lleva bloque del Patrón) */
  "widget.feed": E, "widget.quick-note": E, "widget.note-with-home": C,
  "widget.habit-homes": C, "widget.home-suggestion": C, "widget.hide-amounts": E,
  "widget.pins-manage": R, "widget.pin-from-catalog": C, "widget.last-push": C,
  "widget.face-pagos": R, "widget.face-dues": R, "widget.face-savings": R,
  "widget.face-scale": R, "widget.face-pins": R, "widget.face-pace": C,
  "widget.face-top5-compare": C, "widget.face-flow": C,
  /* §1.26 Presentación — reparto de módulos del censo con los fallos D-bis 19,
   * 20, 21 y 23; los tres módulos del modelo de ahorro a Completo (X-2) */
  "pres.driver": E, "pres.m1-mapa": E, "pres.m2-manual": E, "pres.m3-anotar": E,
  "pres.m3-balance-chapter": R, "pres.m4-cambio": R, "pres.m5-mes": E,
  "pres.m6-ahorros": R, "pres.m7-estadisticas": C, "pres.m8-asesor": C,
  "pres.m9-folios-river": E, "pres.m9-folios-rest": C, "pres.m10-estructura": C,
  // Ola 2 (C-1): el módulo «puertas» se declara esencial en su dato
  // (Module.mode) y el MAPA-MODULOS asentado lo deja compartido filtrado —
  // sus escenas son de respaldo, seguridad y borrado, que existen en los
  // tres modos. El asiento era un resto del censo que nadie actualizó.
  "pres.m11-puertas": E, "pres.m12-pregunta": C, "pres.m13-totales": C,
  "pres.m14-colchon": C, "pres.my-scenes": R,
  /* §1.27 Manual — el tema sigue a la función, no al capítulo (fallo D-bis 25):
   * los temas sueltos dentro de capítulos ajenos llevan su propia entrada */
  "manual.ch1-arriba": E, "manual.topic-export": R, "manual.topic-float": C,
  "manual.ch2-central": E, "manual.ch3-cobros": R, "manual.topic-card-fine": C,
  "manual.ch4-libros": E, "manual.ch5-ahorros": R, "manual.topic-retiro": C,
  "manual.ch6-folios": E, "manual.topic-apartar": C, "manual.ch7-estudio": C,
  "manual.ch8-asesor": C, "manual.ch9-cambio": R, "manual.ch10-ajustes": C,
  "manual.ch11-importar": C, "manual.ch12-editor": E, "manual.ch13-cuenta": E,
  /* §2 Ajustes universales — nunca se esconden (mínimo Esencial) */
  "settings.lang": E, "settings.theme": E, "settings.mode-selector": E,
  "settings.manual-row": E, "settings.presentations-row": E, "settings.notify": E,
  "settings.install-app": E, "settings.backup-auto": E, "settings.backup-quarantine": E,
  "settings.backup-download": E, "settings.backup-restore": E, "settings.backup-folder": E,
  "settings.backup-conflict": E, "settings.account": E, "settings.version": E,
  "settings.battery-row": E, "settings.shortcuts": E, "settings.activity": E,
  "settings.hide-amounts": E, "settings.view-currency": E,
  /* §2 Ajustes atados — siguen a su función (fallos D-bis 34–39 y el catálogo
   * partido: añadir en Esencial, administrar Tiendas en Ritmo, Suscripciones y
   * Seguros en Completo; la Moneda de vista gana casa en «La app») */
  "settings.structure-tree": R, "settings.structure-card": R, "settings.catalog-add": E,
  "settings.catalog-admin": R, "settings.catalog-admin-subs": C, "settings.banks": C,
  "settings.bank-rewards-table": C, "settings.bank-rewards-real": C,
  "settings.bank-sources": C, "settings.bank-paypal-pocket": C, "settings.bank-rules": C,
  "settings.import-row": C, "settings.savings-goal": R, "settings.debt-green": R,
  "settings.debt-yellow": R, "settings.cushion-months": C, "settings.rules": R,
  "settings.gestures": E, "settings.widget-pins": R, "settings.widget-card": E,
  "settings.pin-in-card": R, "settings.sample-row": E, "settings.templates": C,
  "settings.nature-stance": R, "settings.rate-manual": E,
  /* §3.1 Panorama (fallo D-bis 27: próximos pagos reducido en Esencial;
   * la regla 50·30·20 con nombre y % es de Ritmo, fallo D-bis 26) */
  "pano.next-dues-reduced": E, "pano.next-dues-timeline": R, "pano.month-ring": R,
  "pano.hundred": R, "pano.rule-503020": R, "pano.runway-linear": R,
  "pano.runway-patron": C, "pano.movers": R, "pano.closes": R, "pano.health-note": C,
  "pano.health-help": C, "pano.pillar-spend": C, "pano.pillar-save": C,
  "pano.pillar-debt": C, "pano.pillar-cushion": C, "pano.pillar-stability": C,
  /* §3.2 Estudio (fallo D-bis 28: entra/sale/queda nace simple en Esencial;
   * fallo D-bis 33: reordenar tarjetas es de Completo) */
  "study.flow-simple": E, "study.flow": R, "study.month-jar": R,
  "study.pockets-list": R, "study.budget-caps": R, "study.where": R,
  "study.where-top": R, "study.where-stores": C, "study.runway": C,
  "study.committed": C, "study.cushion-dial": C, "study.key-numbers": C,
  "study.sankey": C, "study.people": C, "study.remit": C, "study.income-sources": C,
  "study.empty-rule": E, "study.fold-shell": E, "study.reorder": C,
  "study.columns": E, "study.loans": C, "study.owed": R,
  /* §3.3 Asesor — héroe y pasos (el Asesor existe en los tres modos y nunca
   * calla lo esencial, fallo D-bis 26: en Esencial habla en dinero y en llano) */
  "advisor.verdict": E, "advisor.verdict-sub": R, "advisor.hero-cubes": R,
  "advisor.step-income": E, "advisor.step-name": E, "advisor.step-keep": E,
  "advisor.step-close-gap": R, "advisor.step-set-aside": R, "advisor.step-wants-30": R,
  "advisor.step-subs": R, "advisor.step-cushion": C, "advisor.step-debts": C,
  "advisor.pillars": C, "advisor.plain-words": E, "advisor.mode-hint": E,
  /* §3.4 Asesor — lectura del mes (fallos D-bis 29 y 30: el top en dinero solo
   * es de Esencial; la estabilidad sin historial es de Ritmo, con suelo es de
   * Completo) */
  "advisor.headline": E, "advisor.diagnosis": R, "advisor.month-tone": R,
  "advisor.time-label": E, "advisor.dues-note": E, "advisor.rate-note": E,
  "advisor.vague-name": E, "advisor.method-note": E, "advisor.lever-keep": E,
  "advisor.lever-income": E, "advisor.misclass-note": R, "advisor.not-habit-note": R,
  "advisor.trend-note": R, "advisor.subs-note": R, "advisor.remit-note": R,
  "advisor.daily-note": R, "advisor.three-parts": R, "advisor.top5": E,
  "advisor.top5-rich": R, "advisor.levers-month": R, "advisor.plan-short": R,
  "advisor.plan-90": C, "advisor.scenarios": C, "advisor.income-stability": R,
  "advisor.income-stability-floor": C, "advisor.credit-note": C,
  "advisor.debt-data-ask": C, "advisor.undestined-note": C,
  /* §3.5 Asesor — tarjetas visuales y marco de reglas (los modos de cada regla
   * son los de RULE_MIN_MODE, arriba: la misma verdad en las dos tablas) */
  "advisor.month-done": E, "advisor.month-detail": R, "advisor.what-happened-day": R,
  "advisor.what-happened-river": R, "advisor.heaviest": E, "advisor.heaviest-class": R,
  "advisor.credit-meter": C, "advisor.credit-list": C, "advisor.cards-card": E,
  "advisor.cards-usage": C, "advisor.projection-12": C, "advisor.start-route": R,
  "advisor.rules-frame": C, "advisor.rate-foot": E, "advisor.kicker": C,
  "advisor.people-tip": C, "advisor.rewards-note": C,
  "rule.due": E, "rule.category": R, "rule.outlier": R, "rule.recurring": R,
  "rule.pace": C, "rule.goal": C, "rule.cushion": C, "rule.floor": C,
  "rule.overcommit": C, "rule.insurance": C,
  /* §3.6 Patrón de Ritmo — el Patrón es de Completo; el ritmo lineal del mes
   * (rules.ts, sin patrón aprendido) es de Ritmo y no se confunde con él */
  "patron.learning": C, "patron.verdict": C, "patron.sayings": C,
  "patron.linear-pace": R, "patron.history-rules": C, "patron.month-rules": R,
  "patron.model-rules": C,
  /* §3.7 Asesor de área (fallo D-bis 31: la alerta de vencidos de Me deben es
   * un hecho de Esencial; la pista de 60 días con importes, de Ritmo) */
  "area.frame": C, "area.bars-6m": R, "area.plain-phrase": R, "area.overdue": E,
  "area.owed-marks": E, "area.owed-track": R, "area.income-drift": R,
  "area.setaside": R, "area.retiro-paused": R, "area.remit-up": R,
  "area.meta-path": C, "area.emergency-months": C, "area.loans-path": C,
  "area.debt-free": C, "area.debt-stuck": C, "area.rules-split": C,
  /* §3.8 Capa despierta (fallo D-bis 32: en Esencial solo hechos simples) */
  "awake.savings-photo": C, "awake.goals-horizon": C, "awake.undestined": C,
  "awake.destination-projection": C, "awake.recalc-notices": R,
  "awake.recalc-simple": E, "awake.stale-plan": R, "awake.materiality": E,
  /* La maquinaria de los modos misma y la pieza que nace en la etapa 4 */
  "mode.impact-screen": E, "mode.gate": E, "mode.mute-row": E, "desk.today-spend": E,
} as const satisfies Record<string, Mode>;

export type FeatureId = keyof typeof FEATURES;

/** El modo mínimo de una función, según el registro. */
export const featureMinMode = (feature: FeatureId): Mode => FEATURES[feature];

/** LA pregunta del sistema de modos: ¿esta función vive en este modo? Un modo
 *  incluye siempre los de abajo (Esencial ⊂ Ritmo ⊂ Completo). */
export function hasFeature(mode: Mode, feature: FeatureId): boolean {
  return modeRank(mode) >= modeRank(FEATURES[feature]);
}

/** Un destino de salto, en la forma en que goTopic y los temas del Manual lo
 *  conocen (estructuralmente un GoLike de lib/manual/places). */
export type GoDest = { screen: string; anchor?: string; fold?: string; lens?: string };

/**
 * Qué función es un destino de salto — o null cuando el destino vive en los
 * tres modos (o el registro aún no lo conoce: lo desconocido nunca bloquea).
 * Es la mitad del punto único de validación: goTopic (provider.tsx) contrasta
 * el resultado contra el modo de la persona y, si el destino duerme, el salto
 * cae a la explicación. La tabla crece con las etapas 3–5 a medida que cada
 * cara se recompone; las lecturas de grano fino quedan declaradas en
 * BUILD-PLAN.md (etapa 2).
 */
export function featureForGo(go: GoDest): FeatureId | null {
  const s = go.screen;
  const a = go.anchor ?? "";
  const f = go.fold ?? "";
  if (s === "settings") {
    if (a === "aj-cards") return "settings.bank-sources";
    if (a === "aj-rewards") return "settings.bank-rewards-table";
    if (a === "aj-paypal-pocket") return "settings.bank-paypal-pocket";
    if (a === "aj-rules-bank") return "settings.bank-rules";
    if (a === "aj-banks" || f === "banks" || f.startsWith("banks")) return "settings.banks";
    if (a === "aj-tree" || a === "aj-structure") return "settings.structure-tree";
    if (a === "aj-catalog") return "settings.catalog-admin";
    if (f === "structure") return "settings.structure-tree";
    if (f === "rate") {
      if (a === "aj-goal") return "settings.savings-goal";
      if (a === "aj-green") return "settings.debt-green";
      if (a === "aj-yellow") return "settings.debt-yellow";
      if (a === "aj-months") return "settings.cushion-months";
      if (a === "aj-nature") return "settings.nature-stance";
      if (a === "aj-rate") return "settings.rate-manual";
      return "settings.rules";
    }
    if (f === "gestures") return "settings.gestures";
    if (f === "keys") return "settings.shortcuts";
    if (f === "widget") return "settings.widget-card";
    return null; // lang, theme, modo, account, backup: universales
  }
  if (s === "top") {
    if (a === "top-export") return "export.panel";
    if (a === "top-cal") return "nav.calendar";
    if (a === "top-view") return "nav.tablet-views";
    if (a === "top-search") return "nav.global-search";
    return null;
  }
  if (s === "desk") {
    // Ola 3 (Cara C3-4): desk-opportunity NO mapea a advisor.kicker — la
    // franja de Central es el resto declarado (entra − sale, el mismo
    // número que «Queda» en la barra), su tema es de Esencial y la franja
    // se pinta en los tres modos: el salto aterriza siempre (null, mueble
    // universal). El asiento advisor.kicker (C) queda para la frase del
    // Asesor, que sí interpreta la cifra en su texto de consejo.
    if (go.lens === "debt" || a === "desk-semaforo" || a === "lens-debt") return "central.lens-pagos";
    return null;
  }
  if (s === "cobros") return "debt.facts";
  if (s === "vault-save") {
    if (f === "lever" || a === "lever") return "vault.lever";
    if (a === "vault-accounts") return "accounts.panel-simple";
    return "vault.save";
  }
  if (s === "vault-meta") return "vault.meta";
  if (s === "vault-retiro") return "vault.retiro";
  if (s === "vault-emergencia") return "vault.emergencia";
  if (s === "vault-owed") {
    if (a === "rewards-group") return "cards.rewards-group";
    if (a === "debt-scale") return "debt.scale";
    if (a === "debt-net") return "debt.net";
    return "debt.facts";
  }
  if (s === "vault-owe") {
    if (f === "debt-plan" || a === "debt-plan") return "loans.payoff-plan";
    if (a === "debt-chart") return "debt.chart";
    return "debt.facts";
  }
  if (s === "stats") {
    if (a === "stats-tools") return "study.reorder";
    switch (f) {
      case "pace": return "patron.verdict";
      case "sankey": return "study.sankey";
      case "health": return "pano.health-note";
      case "cushion": return "study.cushion-dial";
      case "numeros": return "study.key-numbers";
      case "earnings": return "study.income-sources";
      case "loans": return "study.loans";
      case "owed": return "study.owed";
      case "agenda": return "pano.next-dues-reduced";
      case "time": return "study.flow-simple";
      case "pulse": return "pano.month-ring";
      case "waffle": return "pano.hundred";
      case "where": return "study.where";
      case "movers": return "pano.movers";
      case "rule": return "pano.rule-503020";
      case "plan": return "study.budget-caps";
      default: return "study.flow-simple";
    }
  }
  if (s === "advice") {
    if (a === "coach-pillars") return "advisor.pillars";
    if (a === "advice-sim") return "advisor.scenarios";
    if (a === "advice-long") return "advisor.projection-12";
    if (a === "advice-medium") return "advisor.plan-90";
    if (a === "advice-people") return "advisor.people-tip";
    if (a === "advice-rewards") return "advisor.rewards-note";
    if (a === "advice-tower" || a === "advice-findings" || a === "advice-rules" || f === "rules") return "advisor.rules-frame";
    if (a === "advice-tiles") return "advisor.month-detail";
    if (f === "coach-words") return "advisor.plain-words";
    return null; // el héroe y los pasos viven en los tres modos
  }
  if (s === "tools") {
    if (a === "tools-calc") return "tools.calculator";
    if (a === "tools-slips") return "tools.slips";
    return null; // ver la tasa y convertir es de Esencial
  }
  if (s === "subs") return "books.subs";
  if (s === "shops") return "books.shops";
  if (s === "income") {
    if (f === "book-span") return "vault.span-cut";
    if (a === "book-pot") return "vault.pot";
    return null;
  }
  if (s === "fixed") {
    if (a === "book-filter") return "books.filter-chips";
    return null;
  }
  if (s === "variable") {
    if (a === "book-people") return "people.card";
    if (a === "book-remit") return "remit.card";
    return null;
  }
  return null; // historial, archivo y lo aún no censado: nunca a la nada
}
