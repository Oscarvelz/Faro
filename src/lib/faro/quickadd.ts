/**
 * Apuntes rápidos desde el widget (línea de ventanas, 2026-11-12): los botones + / − del widget ya no
 * abren la app — levantan la tarjeta rápida del propio shell (QuickAddActivity), donde el usuario
 * escribe el monto sin abrir Faro. El apunte queda en la cola del shell (SharedPreferences) y la app
 * lo recoge con FaroNative.takeQuickEntries() la próxima vez que está abierta y desbloqueada,
 * archivándolo en el libro por el camino normal (commit + upsertLine, con Deshacer y sincronía).
 *
 * El contrato que hace seguro el traspaso:
 * - El id del apunte ES el id de la línea (y su seriesId): recoger dos veces el mismo apunte
 *   actualiza la misma línea — nunca duplica.
 * - La línea cae en el mes del DÍA DEL APUNTE (su monthKey sale de `day`, no de hoy): recoger
 *   tarde no mueve el dinero de mes.
 * - La moneda es la que el widget mostraba al anotar (la moneda de vista de la foto, `cur`).
 * - Sin categoría a propósito: kind manda en los totales (income-variable / expense-variable) y
 *   Estudio agrupa las líneas sin categoría por kind; el concepto dice «Apunte rápido» y la nota
 *   «Widget», para que el usuario la reconozca y la reclasifique si quiere.
 * - Con casa (la tarjeta ofrece las suyas desde 2026-11-12): la foto lleva las casas que ya
 *   reciben cada signo (quickHomes) y el apunte guarda los ids elegidos; al recoger, la casa se
 *   resuelve contra la Estructura viva y el kind sale de su grupo — si la casa ya no existe, el
 *   apunte cae sin categoría, jamás en un lugar equivocado ni se pierde.
 * - Con fijas (1.3.246, el plan de Oscar): la foto lleva ADEMÁS las categorías que el dueño
 *   preestableció (settings.widgetPins → quickPins), siempre presentes y antes que las de
 *   hábito. La deduplicación es ley suya: un par (categoría, sub) que es fija y también casa
 *   por hábito aparece UNA vez — como fija — y la lista de hábito RELLENA el hueco con la
 *   siguiente (por eso quickHomesRanked ordena sin tope y el corte a 10 ocurre tras quitar
 *   las fijas, en widget.ts). Desfijar devuelve el asiento al hábito por su propio mérito.
 * - Con piezas (1.3.251): la misma lista de fijas guarda también las del catálogo
 *   (Tiendas e IA: { store }); la foto las lleva en qsOut (solo gasto) y el apunte
 *   guarda la pieza elegida; al recoger se archiva como la compra que la propia app
 *   archivaría (resolveStore espeja el guardado de LineForm). Las de Suscripciones
 *   no existen: ninguna línea guarda su id, y una fija sin archivo honesto no se ofrece.
 * - Con sus palabras (1.3.246): si en la tarjeta escribió «¿Qué fue?», ese texto ES el
 *   concepto de la línea (el genérico «Apunte rápido» solo queda cuando no escribió nada),
 *   para que al corregir sepa cuál apunte fue cuál. Y al clasificar un apunte con concepto
 *   propio, el editor sugiere la casa que su propio historial de conceptos vota
 *   (suggestHome): preselecciona, jamás guarda por él.
 */
import { upsertLine } from "./reducer";
import { makeNamer } from "./defaults";
import type { Currency, Group, Lang, LedgerState, Line, LineKind, WidgetPin } from "./types";

export type QuickEntry = {
  id: string;
  sign: "in" | "out";
  /** Monto en unidades menores (centavos) de `cur`, entero > 0. */
  minor: number;
  cur: Currency;
  /** Día local del apunte, YYYY-MM-DD. */
  day: string;
  /** La casa elegida en la tarjeta (categoría/sub de Estructura); "" = apunte sin categoría. */
  cat?: string;
  sub?: string;
  /** 1.3.246: lo que el dueño escribió en «¿Qué fue?» — será el concepto de la línea.
   *  Ausente o vacío = el concepto genérico de siempre. Los shells viejos nunca lo traen. */
  concept?: string;
  /** 1.3.251: la pieza del catálogo elegida en la tarjeta (una fija de Tiendas o de IA).
   *  Viaja SOLA, sin cat/sub: al recoger, el apunte se archiva como la compra que la
   *  propia app archivaría (kind "purchase" con su storeId o su providerId). Los shells
   *  viejos nunca lo traen y las páginas viejas lo ignoran sin romper el apunte. */
  store?: string;
};

/** Una casa elegible en la tarjeta: ids de Estructura + el nombre a mostrar («Casa · Renta»,
 *  o solo la categoría — «Salario» — cuando la casa es la categoría misma, con s = "").
 *  Con `store` (1.3.251) la casa es una pieza del catálogo: c y s van vacíos y el id de
 *  la pieza manda — la tarjeta la distingue por su marca, no por un camino de nombres. */
export type QuickHome = { c: string; s: string; n: string; store?: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Techo sano: $999,999,999.99 — el shell ya lo impone; aquí se repite porque la cola no es de fiar. */
export const QUICK_MAX_MINOR = 99_999_999_999;

/** Lo que el shell entrega (un JSON array como texto); cualquier pieza mala se descarta, nunca rompe. */
export function parseQuickEntries(raw: string): QuickEntry[] {
  if (!raw) return [];
  let arr: unknown;
  try { arr = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out: QuickEntry[] = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const e = x as Record<string, unknown>;
    const minor = typeof e.minor === "number" ? Math.round(e.minor) : NaN;
    if (typeof e.id !== "string" || e.id.length < 8) continue;
    if (e.sign !== "in" && e.sign !== "out") continue;
    if (!Number.isFinite(minor) || minor <= 0 || minor > QUICK_MAX_MINOR) continue;
    if (e.cur !== "NIO" && e.cur !== "USD") continue;
    if (typeof e.day !== "string" || !DAY.test(e.day)) continue;
    // Una casa mal formada no mata el apunte: se degrada a «sin categoría» y la
    // resolución contra la Estructura viva (ingestQuick) vuelve a validar.
    const cat = typeof e.cat === "string" && e.cat.length <= 64 ? e.cat : "";
    const sub = typeof e.sub === "string" && e.sub.length <= 64 ? e.sub : "";
    // La pieza del catálogo se valida como la casa: una malformada degrada el apunte a
    // su forma sin pieza (la resolución contra el catálogo vivo vuelve a validar).
    const store = typeof e.store === "string" && e.store.length <= 64 ? e.store : "";
    // El concepto es UNA línea suya: espacios colapsados, recortado y con techo — la cola
    // no es de fiar y un concepto no es un párrafo. Vacío = como si no viniera.
    const concept = typeof e.concept === "string" ? e.concept.replace(/\s+/g, " ").trim().slice(0, 120) : "";
    out.push({ id: e.id, sign: e.sign, minor, cur: e.cur, day: e.day, cat, sub, ...(concept ? { concept } : {}), ...(store ? { store } : {}) });
  }
  return out;
}

/**
 * Las casas que la tarjeta ofrece para cada signo: los destinos que YA reciben ese signo,
 * contados en los últimos 3 meses (la costumbre manda), en orden de uso y luego de Estructura.
 * Una casa es una subcategoría («Casa · Renta») O la categoría misma cuando el hábito cae a
 * nivel de categoría, sin sub (s = ""): archivar ahí es archivar en la categoría sin sub, el
 * mismo destino que la resolución ya conocía. Hasta 1.3.240 solo se contaban las líneas CON
 * sub — un libro cuyo ingreso cae sin categoría o a nivel de categoría (el de Oscar: su
 * ENTRÓ vive en «Ingresos variables» sin subs) devolvía la lista VACÍA y la tarjeta ni
 * siquiera dibujaba la pregunta. Las líneas sin categoría no forman casa (no hay carpeta que
 * nombrar): las cubre el «Sin categoría» que la tarjeta siempre ofrece. Solo uso real: una
 * casa que nunca recibió un ingreso no se ofrece para ingresos — ofrecerla invitaría a
 * archivar mal. Fuera: categorías ocultas, subs ocultas y las de Ahorros (su dinero es stock
 * con series propias; un apunte genérico ahí corrompería la cifra). Esta es la lista
 * ORDENADA y SIN tope (1.3.246): el corte a 10 lo hace quien la consume — quickHomes para
 * su contrato de siempre, y la foto del widget DESPUÉS de quitar las fijas, para que el
 * hueco que una fija libera lo rellene la siguiente casa (la ley de deduplicación).
 */
export function quickHomesRanked(state: LedgerState, key: string, lang: Lang): { inn: QuickHome[]; out: QuickHome[] } {
  const names = makeNamer(state.structure, lang);
  const counts = new Map<string, number>();
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  for (let back = 0; back < 3; back++) {
    const mm = ((m - 1 - back) % 12 + 12) % 12 + 1;
    const yy = y + Math.floor((m - 1 - back) / 12);
    const k = `${yy}-${String(mm).padStart(2, "0")}`;
    for (const l of state.months[k]?.lines ?? []) {
      if (!l.categoryId || l.xfer || l.rest) continue;
      const sign = l.kind.startsWith("income") ? "in" : l.kind.startsWith("expense") ? "out" : null;
      if (!sign) continue;
      const id = `${sign}|${l.categoryId}|${l.subId}`;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const build = (sign: "in" | "out"): QuickHome[] => {
    const homes: (QuickHome & { n0: number; o0: number })[] = [];
    for (const c of state.structure.categories) {
      if (c.hidden || c.role === "savings") continue;
      const nCat = counts.get(`${sign}|${c.id}|`) ?? 0;
      if (nCat > 0) homes.push({ c: c.id, s: "", n: names.cat(c.id), n0: nCat, o0: c.order * 1000 });
      for (const s of c.subs) {
        if (s.hidden) continue;
        const n0 = counts.get(`${sign}|${c.id}|${s.id}`) ?? 0;
        if (n0 <= 0) continue;
        homes.push({ c: c.id, s: s.id, n: `${names.cat(c.id)} · ${names.sub(s.id)}`, n0, o0: c.order * 1000 + s.order + 1 });
      }
    }
    return homes.sort((a, b) => b.n0 - a.n0 || a.o0 - b.o0).map(({ c, s, n }) => ({ c, s, n }));
  };
  return { inn: build("in"), out: build("out") };
}

/** Las casas de la tarjeta, con su tope de siempre: las 10 más usadas por signo. */
export function quickHomes(state: LedgerState, key: string, lang: Lang): { inn: QuickHome[]; out: QuickHome[] } {
  const ranked = quickHomesRanked(state, key, lang);
  return { inn: ranked.inn.slice(0, 10), out: ranked.out.slice(0, 10) };
}

/* —— Las fijas del widget (1.3.246) ——
 * Los pares que el dueño preestableció en Estructura (settings.widgetPins). A diferencia
 * de las casas por hábito, una fija no espera a que el uso la gane: está en la tarjeta
 * desde que se fija hasta que se desfija. La foto las valida contra la Estructura viva:
 * categoría borrada u oculta, sub borrada u oculta, o categoría de Ahorros → la fija cae
 * en silencio (ley de soberanía: lo que él esconde o borra no resucita en ninguna
 * superficie, ni siquiera porque una fija lo nombre). */

/** ¿Está fijado este par? */
export function hasWidgetPin(pins: WidgetPin[] | undefined, c: string, s: string): boolean {
  return (pins ?? []).some((p) => p.c === c && p.s === s);
}

/** Fija o desfija un par (puro: devuelve la lista nueva). Fijar añade AL FINAL — el orden
 *  de la lista es el orden en que él las fijó, y ese es su orden en la tarjeta. */
export function toggleWidgetPin(pins: WidgetPin[] | undefined, c: string, s: string): WidgetPin[] {
  const list = pins ?? [];
  if (hasWidgetPin(list, c, s)) return list.filter((p) => !(p.c === c && p.s === s));
  return [...list, { c, s }];
}

/**
 * El signo de una fija se DERIVA, no se guarda: las categorías de Faro no llevan signo
 * (el signo vive en el kind de cada línea — la misma categoría puede recibir ingresos y
 * gastos), así que la tarjeta de una fija es la de los recibos de SU CATEGORÍA en todo el
 * libro. Si la categoría recibió de un solo signo, la fija vive en esa tarjeta; si recibió
 * de ambos — o TODAVÍA de ninguno (la preestableció antes de usarla, su caso) — vive en
 * las dos: una fija jamás se esconde de una tarjeta por falta de evidencia.
 */
export function pinSigns(state: LedgerState, pin: WidgetPin): ("in" | "out")[] {
  let inn = false;
  let out = false;
  for (const book of Object.values(state.months)) {
    for (const l of book.lines) {
      if (l.categoryId !== pin.c) continue;
      if (l.kind.startsWith("income")) inn = true;
      else if (l.kind.startsWith("expense")) out = true;
      if (inn && out) break;
    }
    if (inn && out) break;
  }
  if (inn && !out) return ["in"];
  if (out && !inn) return ["out"];
  return ["in", "out"];
}

/** Las fijas como casas de la tarjeta, por signo y en el orden en que él las fijó. */
export function quickPins(state: LedgerState, lang: Lang): { inn: QuickHome[]; out: QuickHome[] } {
  const names = makeNamer(state.structure, lang);
  const inn: QuickHome[] = [];
  const out: QuickHome[] = [];
  const seen = new Set<string>();
  for (const p of state.settings.widgetPins ?? []) {
    const k = `${p.c}|${p.s}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const cat = state.structure.categories.find((c) => c.id === p.c);
    if (!cat || cat.hidden || cat.role === "savings") continue;
    if (p.s) {
      const sub = cat.subs.find((s) => s.id === p.s);
      if (!sub || sub.hidden) continue;
    }
    const home: QuickHome = { c: p.c, s: p.s, n: p.s ? `${names.cat(p.c)} · ${names.sub(p.s)}` : names.cat(p.c) };
    const signs = pinSigns(state, p);
    if (signs.includes("in")) inn.push(home);
    if (signs.includes("out")) out.push(home);
  }
  return { inn, out };
}

/* —— Las fijas del catálogo (1.3.251) ——
 * La segunda familia de fijas: las piezas de Tiendas y de IA que él preestableció en
 * las tarjetas del catálogo (Estructura). Viven en la misma lista settings.widgetPins
 * (con `store`), en el orden en que él las fijó, y la foto las valida contra el
 * catálogo vivo con la misma ley de soberanía que las de categoría: pieza borrada u
 * oculta → la fija cae en silencio. Su signo no se deriva: una compra es gasto, así
 * que solo viajan en la tarjeta del −. Las piezas de Suscripciones quedan FUERA a
 * propósito: ninguna línea guarda su id (las cuotas nacen de presets con nombre
 * libre), así que una fija suya no tendría forma honesta de archivarse. */

/** ¿Está fijada esta pieza del catálogo? */
export function hasStorePin(pins: WidgetPin[] | undefined, id: string): boolean {
  return (pins ?? []).some((p) => p.store === id);
}

/** Fija o desfija una pieza del catálogo (puro, como toggleWidgetPin: fijar añade
 *  AL FINAL — el orden de la lista es el orden en que él las fijó). */
export function toggleStorePin(pins: WidgetPin[] | undefined, id: string): WidgetPin[] {
  const list = pins ?? [];
  if (hasStorePin(list, id)) return list.filter((p) => p.store !== id);
  return [...list, { c: "", s: "", store: id }];
}

/** Las fijas del catálogo como casas de la tarjeta del gasto, en su orden. */
export function quickStorePins(state: LedgerState, lang: Lang): QuickHome[] {
  const names = makeNamer(state.structure, lang);
  const out: QuickHome[] = [];
  const seen = new Set<string>();
  for (const p of state.settings.widgetPins ?? []) {
    if (!p.store || seen.has(p.store)) continue;
    seen.add(p.store);
    const item = state.structure.catalog.find((c) => c.id === p.store);
    if (!item || item.hidden) continue;
    if (item.kind !== "store" && item.kind !== "ai") continue;
    out.push({ c: "", s: "", n: names.catalog(item.id) || item.id, store: item.id });
  }
  return out;
}

/* —— Fijar desde la tarjeta «Widget» (1.3.267) ——
 * El tercer asiento de las fijas vive donde el widget se administra (Oscar,
 * 2026-11-14): la propia tarjeta «Widget» de Ajustes busca en la Estructura
 * viva y fija desde ahí, sin salir de la tarjeta. El universo es el de las
 * piezas fijables de siempre — categorías y sus subconceptos — con las
 * exclusiones de la propia honestidad del sistema:
 *  · las de Ahorros quedan fuera: nunca son casas de la tarjeta (quickPins
 *    las descarta) y sus subconceptos son los bolsillos, que ya tienen su
 *    casa en la bóveda;
 *  · las piezas del catálogo (Tiendas e IA) entraron en 1.3.268, por su
 *    palabra: «Debe existir cualquier cosa que pueda preestablecerse» —
 *    viven solo en Salida (una compra es gasto), tras las de categoría,
 *    como la foto las ordena; las de Suscripciones siguen fuera en todas
 *    partes: ninguna línea guarda su id y su fija no tendría archivo;
 *  · lo oculto SÍ aparece, como en el editor de Estructura — el asiento que
 *    administra lo oculto —: fijarlo allí es legal y la foto lo retiene en
 *    silencio hasta que se muestre (la ley de soberanía de siempre). La fila
 *    lo pinta atenuado, como el árbol pinta lo oculto.
 * El grupo de cada pieza es el signo que pinSigns deriva: la Estructura no
 * guarda signo en la categoría (vive en el kind de cada línea — la misma
 * categoría puede recibir ingresos y gastos), así que la derivación del
 * sistema de fijas es la única verdad disponible, y es la misma que decide
 * en qué tarjeta de apuntes vive la fija: el grupo de aquí jamás puede
 * discrepar de la tarjeta de allá. Una pieza de los dos signos — o todavía
 * de ninguno — vive en los dos grupos, como vive en las dos tarjetas. */

/** Una pieza fijable del universo: la categoría (s = ""), uno de sus
 *  subconceptos, o — con `store` — una pieza del catálogo (Tienda o IA,
 *  1.3.268), que lleva su id en `store` y c/s vacíos, como su fija. */
export type PinCandidate = { c: string; s: string; signs: ("in" | "out")[]; hidden: boolean; store?: string };

/** El pliegue con el que la casa compara nombres al buscar (el de searchLedger
 *  y el del índice de Ajustes): minúsculas y sin acentos — «alimentacion»
 *  encuentra «Alimentación». El nombre que él escribió jamás se altera: solo
 *  se pliega la copia que se compara. */
export function foldPinText(x: string): string {
  return x.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** El universo fijable, en el orden de la Estructura: cada categoría (menos
 *  las de Ahorros) y, tras ella, sus subconceptos; el signo se deriva una vez
 *  por categoría, porque la derivación lee las líneas de la categoría. */
export function pinCandidates(state: LedgerState): PinCandidate[] {
  const out: PinCandidate[] = [];
  for (const cat of state.structure.categories) {
    if (cat.role === "savings") continue;
    const signs = pinSigns(state, { c: cat.id, s: "" });
    out.push({ c: cat.id, s: "", signs, hidden: cat.hidden });
    for (const sub of cat.subs) out.push({ c: cat.id, s: sub.id, signs, hidden: cat.hidden || sub.hidden });
  }
  return out;
}

/** El universo fijable del catálogo (1.3.268): las piezas de Tiendas y de
 *  IA, en el orden del catálogo — exactamente las que su tarjeta ofrece
 *  fijar (las de Suscripciones no se fijan en ninguna parte; las de cuentas
 *  no son casas de la tarjeta). Su signo no se deriva: una compra es gasto,
 *  así que viven solo en Salida. Lo oculto entra marcado, como en el resto
 *  del universo: su tarjeta lo sigue ofreciendo y la foto lo retiene en
 *  silencio (la ley de soberanía). */
export function pinStoreCandidates(state: LedgerState): PinCandidate[] {
  const out: PinCandidate[] = [];
  for (const item of state.structure.catalog) {
    if (item.kind !== "store" && item.kind !== "ai") continue;
    out.push({ c: "", s: "", signs: ["out"], hidden: item.hidden, store: item.id });
  }
  return out;
}

/** La búsqueda de la tarjeta: una pieza casa si su nombre — el del subconcepto
 *  o el camino «Categoría · Sub» — contiene lo escrito, plegado. Los dos
 *  grupos salen separados por el signo derivado, en el orden de la Estructura. */
export function searchPinCandidates(state: LedgerState, query: string, lang: Lang): { inn: PinCandidate[]; out: PinCandidate[] } {
  const q = foldPinText(query.trim());
  const inn: PinCandidate[] = [];
  const out: PinCandidate[] = [];
  if (!q) return { inn, out };
  const names = makeNamer(state.structure, lang);
  for (const cand of pinCandidates(state)) {
    const path = cand.s ? `${names.cat(cand.c)} · ${names.sub(cand.s)}` : names.cat(cand.c);
    const own = cand.s ? names.sub(cand.s) : path;
    if (!foldPinText(path).includes(q) && !foldPinText(own).includes(q)) continue;
    if (cand.signs.includes("in")) inn.push(cand);
    if (cand.signs.includes("out")) out.push(cand);
  }
  // 1.3.268: las piezas del catálogo cierran el grupo de Salida, tras las de
  // categoría — el orden en que la propia tarjeta de apuntes las ofrece
  // (quickPins antes que quickStorePins) y en que pinGroups lee la lista.
  for (const cand of pinStoreCandidates(state)) {
    const name = names.catalog(cand.store as string) || (cand.store as string);
    if (foldPinText(name).includes(q)) out.push(cand);
  }
  return { inn, out };
}

/** Las fijas guardadas, agrupadas por su signo — la organización que la
 *  lista «Fijadas» pinta desde 1.3.267 (su orden): dentro de cada grupo, las
 *  de categoría en el orden en que se fijaron y las piezas después, como la
 *  lista las ha leído siempre; la pieza es siempre gasto (una compra no
 *  entra) y la fija de los dos signos vive en los dos grupos. */
export function pinGroups(state: LedgerState): { inn: WidgetPin[]; out: WidgetPin[] } {
  const pins = state.settings.widgetPins ?? [];
  const inn: WidgetPin[] = [];
  const out: WidgetPin[] = [];
  for (const p of pins) {
    if (p.store) continue;
    const signs = pinSigns(state, p);
    if (signs.includes("in")) inn.push(p);
    if (signs.includes("out")) out.push(p);
  }
  for (const p of pins) if (p.store) out.push(p);
  return { inn, out };
}

/**
 * La casa que el propio historial de conceptos sugiere para un apunte sin clasificar
 * (1.3.246): las líneas vivas (no apartadas) del MISMO signo cuyo concepto coincide —
 * sin mayúsculas ni espacios — votan por su (categoría, sub); la moda solo manda si
 * reúne al menos 2 votos y el 60 % del total. Con `group`, solo votan las líneas cuya
 * categoría es de ese grupo (el selector del editor de gastos solo ofrece su grupo:
 * sugerir fuera de él sería preseleccionar algo que el selector no puede ni mostrar).
 * Devuelve null cuando el historial no se pone de acuerdo: no sugerir también es honesto.
 */
export function suggestHome(state: LedgerState, concept: string, sign: "in" | "out", group?: Group | null): { c: string; s: string } | null {
  const want = concept.replace(/\s+/g, " ").trim().toLowerCase();
  if (!want) return null;
  const counts = new Map<string, number>();
  let total = 0;
  for (const book of Object.values(state.months)) {
    for (const l of book.lines) {
      if (l.rest || !l.categoryId) continue;
      const lsign = l.kind.startsWith("income") ? "in" : l.kind.startsWith("expense") ? "out" : null;
      if (lsign !== sign) continue;
      if ((l.concept ?? "").replace(/\s+/g, " ").trim().toLowerCase() !== want) continue;
      if (group) {
        const cat = state.structure.categories.find((c) => c.id === l.categoryId);
        if (!cat || cat.group !== group) continue;
      }
      const k = `${l.categoryId}|${l.subId}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      total++;
    }
  }
  if (total < 2) return null;
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
  if (!best || bestN / total < 0.6) return null;
  const [c, s] = best.split("|");
  return { c, s };
}

/**
 * La casa del apunte, resuelta contra la Estructura VIVA al recoger (pudo cambiar desde la
 * foto): categoría borrada o de Ahorros → el apunte cae sin categoría, como siempre; sub
 * borrada → se archiva en su categoría sin sub (el patrón de relocate); el kind sale del
 * grupo de la categoría elegida (fijo/variable) y del signo — nunca de la cola.
 */
function resolveHome(state: LedgerState, e: QuickEntry): { categoryId: string; subId: string; kind: LineKind } {
  const fallback: { categoryId: string; subId: string; kind: LineKind } = {
    categoryId: "", subId: "", kind: e.sign === "in" ? "income-variable" : "expense-variable",
  };
  if (!e.cat) return fallback;
  const cat = state.structure.categories.find((c) => c.id === e.cat);
  if (!cat || cat.role === "savings") return fallback;
  return {
    categoryId: cat.id,
    subId: e.sub && cat.subs.some((s) => s.id === e.sub) ? e.sub : "",
    kind: `${e.sign === "in" ? "income" : "expense"}-${cat.group}` as LineKind,
  };
}

/**
 * La pieza del apunte, resuelta contra el catálogo VIVO al recoger (1.3.251). El
 * archivo ESPEJA el constructor de la propia app (el guardado de una compra en
 * LineForm): una tienda archiva kind "purchase" con su storeId y SIN categoría de
 * compra (la rebanada de Compras se nombra por la tienda); una IA archiva la misma
 * compra bajo la categoría «ia» con su providerId. Nada de formas paralelas: la
 * línea que nace aquí es indistinguible de la que nace en el formulario — mismo
 * kind, mismos ids, recurring false, y el icono vacío (la fila de Compras deriva
 * la marca del storeId al pintar). Pieza borrada, oculta o de Suscripciones → null:
 * el apunte cae a la resolución de siempre y el dinero jamás se pierde ni se
 * archiva en un lugar equivocado.
 */
function resolveStore(state: LedgerState, e: QuickEntry): { categoryId: string; subId: string; kind: LineKind; storeId: string; providerId: string } | null {
  if (!e.store) return null;
  const item = state.structure.catalog.find((c) => c.id === e.store);
  if (!item || item.hidden) return null;
  if (item.kind === "store") return { categoryId: "", subId: "", kind: "purchase", storeId: item.id, providerId: "" };
  if (item.kind === "ai") return { categoryId: "ia", subId: "", kind: "purchase", storeId: "", providerId: item.id };
  return null;
}

/** El apunte como línea del libro. Pura: la misma entrada (y la misma casa resuelta) siempre
 *  produce la misma línea. Sin casa resuelta, la forma original: variable y sin categoría.
 *  El concepto es el suyo si escribió «¿Qué fue?» (normalizado como en el parseo); el
 *  genérico solo firma los apuntes sin palabras. */
export function quickLine(e: QuickEntry, lang: Lang, home?: { categoryId: string; subId: string; kind: LineKind; storeId?: string; providerId?: string }): Line {
  const own = (e.concept ?? "").replace(/\s+/g, " ").trim();
  return {
    id: e.id,
    seriesId: e.id,
    monthKey: e.day.slice(0, 7),
    kind: home?.kind ?? (e.sign === "in" ? "income-variable" : "expense-variable"),
    concept: own || (lang === "en" ? "Quick entry" : "Apunte rápido"),
    amountMinor: e.minor,
    currency: e.cur,
    active: true,
    note: "Widget",
    categoryId: home?.categoryId ?? "",
    subId: home?.subId ?? "",
    recurring: false,
    storeId: home?.storeId ?? "",
    providerId: home?.providerId ?? "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: e.cur,
    icon: "",
    history: [],
    bookedOn: e.day,
  };
}

/** Archiva los apuntes en el libro (idempotente por id). El estado no se muta: pasa por upsertLine.
 *  Una pieza del catálogo manda sobre la casa: el apunte de una fija de tienda ES una compra. */
export function ingestQuick(state: LedgerState, entries: QuickEntry[], lang: Lang): LedgerState {
  let s = state;
  for (const e of entries) s = upsertLine(s, quickLine(e, lang, resolveStore(s, e) ?? resolveHome(s, e)));
  return s;
}
