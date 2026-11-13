/**
 * descanso — el descanso de las líneas y la PUERTA anti-fuga (Historial → Archivo).
 *
 * La ley (Oscar, 2026-11-12): «Si se ocultan, no queremos que esos datos se filtren en los
 * asesores… No queremos que haya fuga.» Ocultar es un filtro EN LA FUENTE, no en la pantalla:
 * una línea apartada (`Line.rest`) simplemente NO CUENTA en ninguna lectura, igual que una
 * línea inactiva no cuenta en `isOut` (rules.ts). Cada lector calcula sobre el libro ya
 * filtrado, así que ninguna superficie puede nombrar ni sumar lo apartado — ni siquiera por
 * implicación (un total que incluye dinero oculto ya es una fuga).
 *
 * La puerta vive en los ayudantes centrales de cada motor, no en cada suma. Puntos de lectura
 * cerrados por esta puerta (cada uno lleva su `!rest` en su propio ayudante, a la manera de
 * la casa, que duplica `isOut`/`inView` por módulo):
 *  - engine.ts    `inView` y las listas de lectura (slicesFor, buildInsights, buildBudget,
 *                 buildAdvice, studyBoard) → summarize, categorySlices, yearPoints,
 *                 spanPoints, compareSpans, cashSankey; el widget hereda todo esto vía
 *                 summarize/categorySlices.
 *  - advisor.ts   `inView` + `seenIn` → readAdvisor entero (ingreso, gasto, colchón vía
 *                 savingsStock, ritmo) — y con él coach.ts y area-advice.
 *  - rules.ts     `view` + `isOut` locales y los filtros de las reglas de cargos y Meta →
 *                 las 7 reglas del Asesor (ritmo, pagos, categoría, atípico, cargos, meta,
 *                 colchón): ninguna puede nombrar una compra apartada.
 *  - coach.ts     `viewOf` + sus ventanas de pagos y suscripciones.
 *  - area-advice.ts  su `view`.
 *  - dues.ts      la ventana única de vencimientos: una cuota apartada no vence en público.
 *  - debts.ts     lentState (el sumado de abonos) y debtSeries (lo pagado a cada corte);
 *                 lentTotals/totalDebt/netBalance heredan vía lentState/loanState.
 *  - loans.ts     loanState y loanInterestPaid (el sumado de pagos); loanTotals hereda.
 *  - savings.ts   savingsStock: una serie apartada no suma a lo guardado.
 *  - earnings.ts  `isIncome`: un ingreso apartado no aparece en Ganancias.
 *  - search.ts    searchLedger: la búsqueda jamás presenta una línea apartada.
 *  - quickadd.ts  quickHomes: el uso apartado no sugiere casas al widget.
 *  - patron.ts    pacePattern/paceReading: su `isOut` local lleva el mismo `!rest` —
 *                 la curva aprendida jamás se dobla con dinero apartado, ni en la
 *                 historia ni en el mes en curso; sus tres lectores (la regla de
 *                 ritmo en rules.ts, la nota de coach.ts y la notificación vía el
 *                 bloque `pace` de widget.ts) heredan la lectura ya filtrada.
 * Segunda pasada (auditoría 2026-11-13: los escapes vivían en pantallas que reimplementan
 * lecturas, no en los motores de arriba):
 *  - screens.tsx  LinesBlock y la tabla de suscripciones filtran `rest`; las sumas de
 *                 Ahorros derivadas (cubetas, accountRows, fixedSave, filas del Estudio,
 *                 la bolsa de bolsillos) llevan su `!rest` — son derivadas, no ancladas.
 *  - shell.tsx    buildCal: su único filtro excluye `rest` (nombres y sumas del calendario).
 *  - book-side.tsx  los dos meses de la comparación saltan lo apartado (el nombre tampoco).
 *  - awake.ts     viewOf vale 0 y savingsPicture salta lo apartado en sus dos bucles.
 *  - people.ts    personLines (personTotals/spendByPerson heredan).
 *  - remit-people.ts  remitHistory salta lo apartado.
 *  - bankbook.ts  rewardsMonth y rewardsByCard (el mismo filtro, por contrato) lo excluyen.
 *  - export-docs.ts  pickedLines/monthLinesPicked: una hoja impresa también es mostrar
 *                 (los respaldos siguen exentos por diseño: copiar no es mostrar).
 *  - bankparse.ts el cazador difuso RECLAMA la línea apartada (sin gemelo al volver)
 *                 pero no la nombra: no puebla `dupOf`.
 *
 * Lo que la puerta NO toca, a propósito (decisión registrada en el brief, pregunta abierta 1):
 * los saldos ANCLADOS a una lectura externa — cardFigures/cardBalanceAt (la lectura del
 * banco, CardSnap) y lineDebtTotal (el saldo escrito en la línea) — son hechos guardados,
 * no derivados de movimientos; apartar un pago no reescribe lo que el banco dijo. El punto
 * de cierre, si la línea dueña decide lo contrario, es `paidSince` en cards.ts.
 * Los listados por entidad (lentPays/loanPays) tampoco se cierran: son la vista propia del
 * área sobre su entidad; toda CIFRA derivada de ellos sí pasa por la puerta (arriba).
 *
 * Este módulo es también el único que pone y quita `rest`: hidePeriod aparta las líneas
 * cuyos movimientos caen en el período y deja el registro (RestingSpan) en el estado;
 * restoreSpan las devuelve; deleteSpan las borra del libro. Una línea pertenece como máximo
 * a UN período apartado (hidePeriod salta las que ya descansan), así que Restaurar y
 * Eliminar actúan siempre sobre conjuntos disjuntos y exactos.
 *
 * La selección (Oscar, 2026-11-13 — el motor de selección de la casa): las puertas por
 * LÍNEA de esta misma casa, con la misma membresía del río (W1) y el mismo registro:
 *  - hideLines: aparta un conjunto elegido de líneas (la selección del Historial, o un
 *    solo movimiento) y lo registra como UN período más — Restaurar y Eliminar del
 *    Archivo actúan sobre él como sobre cualquier período, sin saber que nació de
 *    una selección. La cerca anti-fuga no distingue el origen del descanso: una línea
 *    apartada por selección desaparece de cada lectura igual que una de período.
 *  - deleteRestingLines: borra líneas apartadas ELEGIDAS (una, o la selección del
 *    Archivo) del libro y las poda de los registros que las nombraban; un registro
 *    que se queda sin líneas se va con ellas. Es la única puerta que borra líneas
 *    sueltas: solo acepta líneas que descansan (lo demás no es asunto del Archivo).
 *
 * Puro: ninguna función muta el estado que recibe.
 */
import { convertMinor, uid } from "./money.ts";
import type { LedgerState, Line, RestingSpan } from "./types.ts";

export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** La pregunta de la puerta: ¿esta línea descansa? Todo lector la hace a través de su ayudante. */
export const isResting = (l: Line): boolean => l.rest === true;

/**
 * El día del movimiento de una línea — la misma lectura que el resto de la casa (W3):
 * como `lineDay` en engine.ts, el día apuntado (bookedOn) solo manda cuando cae dentro
 * del propio mes de la línea — un bookedOn de otro mes no arrastra el movimiento fuera
 * de su libro; si no, su fecha de vencimiento cuando cae dentro de su propio mes; si no,
 * el primer día de su mes. Los cargos de `history` viajan con su línea: en este libro
 * cada línea ES la instancia de su mes (las series viven como una línea por mes).
 */
export function movementDate(l: Line): string {
  const booked = (l.bookedOn || "").slice(0, 10);
  if (ISO_DAY.test(booked) && booked.slice(0, 7) === l.monthKey) return booked;
  const due = (l.nextDue || "").slice(0, 10);
  if (ISO_DAY.test(due) && due.slice(0, 7) === l.monthKey) return due;
  return `${l.monthKey}-01`;
}

/** Los períodos apartados, leídos con desconfianza: una entrada malformada no es un período. */
export function spansOf(state: LedgerState | null | undefined): RestingSpan[] {
  if (!state || !Array.isArray(state.restingSpans)) return [];
  return state.restingSpans.filter(
    (s): s is RestingSpan =>
      !!s && typeof s.id === "string" && ISO_DAY.test(s.from ?? "") && ISO_DAY.test(s.to ?? "") &&
      typeof s.hiddenAt === "number" && Array.isArray(s.lineIds) && s.lineIds.every((id) => typeof id === "string"),
  );
}

export type HideResult = {
  state: LedgerState;
  /** El período creado; null cuando ningún movimiento cayó en el rango (nada que apartar). */
  span: RestingSpan | null;
  count: number;
  /** Sumas de lo apartado, en la moneda de vista (como toda lectura de la casa). */
  inMinor: number;
  outMinor: number;
  /** Los libros (meses) que el período tocó, en orden. */
  months: string[];
};

/**
 * Ocultar un período: aparta cada línea cuyo movimiento cae en [from, to] y registra el
 * período. Las líneas que ya descansan no se tocan (pertenecen a su propio período).
 * La membresía es EXACTAMENTE la del río (W1): la línea activa, o la transferencia —
 * la instancia inactiva de una serie es una intención, no un movimiento, y apartarla
 * la dejaría contando en ninguna parte el día que se activara. Así la ventana que
 * confirma, el río y el verbo describen los mismos movimientos.
 */
export function hidePeriod(state: LedgerState, from: string, to: string, label?: string, now = Date.now()): HideResult {
  const none: HideResult = { state, span: null, count: 0, inMinor: 0, outMinor: 0, months: [] };
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to) || from > to) return none;
  const { display, rateE4 } = state.settings;
  const lineIds: string[] = [];
  const months: string[] = [];
  let inMinor = 0;
  let outMinor = 0;
  const nextMonths: LedgerState["months"] = {};
  for (const [key, bucket] of Object.entries(state.months)) {
    let touched = false;
    const lines = bucket.lines.map((l) => {
      if (l.rest) return l;
      if (!l.active && !l.xfer) return l;
      const day = movementDate(l);
      if (day < from || day > to) return l;
      touched = true;
      lineIds.push(l.id);
      const v = convertMinor(l.amountMinor, l.currency, display, rateE4);
      if (l.kind.startsWith("income")) inMinor += v; else if (!l.xfer) outMinor += v;
      return { ...l, rest: true };
    });
    if (touched) months.push(key);
    nextMonths[key] = touched ? { ...bucket, lines } : bucket;
  }
  if (!lineIds.length) return none;
  const span: RestingSpan = {
    id: uid(),
    from,
    to,
    ...(label ? { label } : {}),
    hiddenAt: now,
    lineIds,
  };
  return {
    // D2: la escritura carga el registro CRUDO, no el leído por spansOf — una entrada
    // malformada no es un período legible, pero tampoco es nuestra para enterrar: si la
    // primera escritura tras cargarla la filtrara, sus líneas descansarían para siempre
    // sin período que las nombre. spansOf es solo para LEER.
    state: { ...state, months: nextMonths, restingSpans: [...(state.restingSpans ?? []), span] },
    span,
    count: lineIds.length,
    inMinor,
    outMinor,
    months: months.sort(),
  };
}

/**
 * Ocultar líneas elegidas (el motor de selección, 2026-11-13): aparta exactamente las
 * líneas nombradas y las registra como UN período (de su primer a su último día de
 * movimiento). La membresía es la del río (W1), como en hidePeriod: la línea activa o
 * la transferencia; la que ya descansa pertenece a su propio período y no se toca.
 * Así la ventana que confirma y el verbo describen los mismos movimientos, y el
 * Archivo recibe la selección como un período más, sin saber su origen.
 */
export function hideLines(state: LedgerState, ids: Iterable<string>, label?: string, now = Date.now()): HideResult {
  const none: HideResult = { state, span: null, count: 0, inMinor: 0, outMinor: 0, months: [] };
  const wanted = new Set(ids);
  if (!wanted.size) return none;
  const { display, rateE4 } = state.settings;
  const lineIds: string[] = [];
  const months: string[] = [];
  let inMinor = 0;
  let outMinor = 0;
  let from = "";
  let to = "";
  const nextMonths: LedgerState["months"] = {};
  for (const [key, bucket] of Object.entries(state.months)) {
    let touched = false;
    const lines = bucket.lines.map((l) => {
      if (!wanted.has(l.id) || l.rest) return l;
      if (!l.active && !l.xfer) return l;
      touched = true;
      lineIds.push(l.id);
      const day = movementDate(l);
      if (!from || day < from) from = day;
      if (!to || day > to) to = day;
      const v = convertMinor(l.amountMinor, l.currency, display, rateE4);
      if (l.kind.startsWith("income")) inMinor += v; else if (!l.xfer) outMinor += v;
      return { ...l, rest: true };
    });
    if (touched) months.push(key);
    nextMonths[key] = touched ? { ...bucket, lines } : bucket;
  }
  if (!lineIds.length) return none;
  const span: RestingSpan = {
    id: uid(),
    from,
    to,
    ...(label ? { label } : {}),
    hiddenAt: now,
    lineIds,
  };
  return {
    // D2, como en hidePeriod: la escritura carga el registro CRUDO.
    state: { ...state, months: nextMonths, restingSpans: [...(state.restingSpans ?? []), span] },
    span,
    count: lineIds.length,
    inMinor,
    outMinor,
    months: months.sort(),
  };
}

/**
 * Eliminar líneas apartadas elegidas (Archivo, 2026-11-13): salen del libro y de los
 * registros que las nombraban; un registro que se queda sin líneas se va con ellas.
 * Solo borra líneas que DESCANSAN — es la puerta del Archivo, y lo que cuenta en las
 * lecturas no es asunto suyo. El registro que se escribe es el crudo (D2): las
 * entradas malformadas no son nuestras para enterrar y pasan intactas.
 */
export function deleteRestingLines(state: LedgerState, ids: Iterable<string>): LedgerState {
  const wanted = new Set(ids);
  if (!wanted.size) return state;
  let removed = false;
  const months: LedgerState["months"] = {};
  for (const [key, bucket] of Object.entries(state.months)) {
    if (bucket.lines.some((l) => wanted.has(l.id) && l.rest)) removed = true;
    months[key] = bucket.lines.some((l) => wanted.has(l.id) && l.rest)
      ? { ...bucket, lines: bucket.lines.filter((l) => !(wanted.has(l.id) && l.rest)) }
      : bucket;
  }
  if (!removed) return state;
  const emptied = new Set<string>();
  const restingSpans = (state.restingSpans ?? [])
    .map((s) => {
      if (!s || typeof s.id !== "string" || !Array.isArray(s.lineIds)) return s;
      if (!s.lineIds.some((id) => wanted.has(id))) return s;
      const kept = s.lineIds.filter((id) => !wanted.has(id));
      if (!kept.length) emptied.add(s.id);
      return { ...s, lineIds: kept };
    })
    // Solo se va el registro que ESTE borrado vació; uno que ya estaba vacío no es
    // nuestro para enterrar (D2).
    .filter((s) => !(s && typeof s.id === "string" && emptied.has(s.id)));
  return { ...state, months, restingSpans };
}

/** Mostrar de nuevo: las líneas del período vuelven a contar y el registro se va. */
export function restoreSpan(state: LedgerState, spanId: string): LedgerState {
  const spans = spansOf(state);
  const span = spans.find((s) => s.id === spanId);
  if (!span) return state;
  const ids = new Set(span.lineIds);
  const months: LedgerState["months"] = {};
  for (const [key, bucket] of Object.entries(state.months)) {
    if (!bucket.lines.some((l) => ids.has(l.id) && l.rest)) { months[key] = bucket; continue; }
    months[key] = {
      ...bucket,
      lines: bucket.lines.map((l) => {
        if (!ids.has(l.id) || !l.rest) return l;
        const next = { ...l };
        delete next.rest;
        return next;
      }),
    };
  }
  // D2: el registro que se escribe es el crudo, filtrado solo por id (ver hidePeriod).
  return { ...state, months, restingSpans: (state.restingSpans ?? []).filter((s) => s?.id !== spanId) };
}

/** Eliminar un período apartado: sus líneas salen del libro y el registro se va. */
export function deleteSpan(state: LedgerState, spanId: string): LedgerState {
  const spans = spansOf(state);
  const span = spans.find((s) => s.id === spanId);
  if (!span) return state;
  const ids = new Set(span.lineIds);
  const months: LedgerState["months"] = {};
  for (const [key, bucket] of Object.entries(state.months)) {
    months[key] = bucket.lines.some((l) => ids.has(l.id))
      ? { ...bucket, lines: bucket.lines.filter((l) => !ids.has(l.id)) }
      : bucket;
  }
  // D2: el registro que se escribe es el crudo, filtrado solo por id (ver hidePeriod).
  return { ...state, months, restingSpans: (state.restingSpans ?? []).filter((s) => s?.id !== spanId) };
}

export type RestingEntry = {
  span: RestingSpan;
  /** Las líneas del período que siguen en el libro (descansando), en orden de libro. */
  lines: Line[];
  count: number;
  /** Sumas del período en la moneda de vista — viven SOLO dentro del Archivo. */
  inMinor: number;
  outMinor: number;
  /** Los libros que el período toca, en orden. */
  months: string[];
};

/**
 * La parte pura del Archivo universal: los períodos apartados con su cuenta y sus sumas,
 * del más reciente al más viejo. (Los archivos por área que viven fuera del estado — el
 * Archivo de Debo en duefile.ts — los une la capa de pantalla, no este módulo.)
 */
export function restingEntries(state: LedgerState): RestingEntry[] {
  const { display, rateE4 } = state.settings;
  const byId = new Map<string, { line: Line; monthKey: string }>();
  for (const [monthKey, bucket] of Object.entries(state.months)) {
    for (const line of bucket.lines) byId.set(line.id, { line, monthKey });
  }
  return spansOf(state)
    .map((span) => {
      const found = span.lineIds
        .map((id) => byId.get(id))
        .filter((x): x is { line: Line; monthKey: string } => !!x && x.line.rest === true);
      let inMinor = 0;
      let outMinor = 0;
      const months = new Set<string>();
      for (const { line, monthKey } of found) {
        months.add(monthKey);
        const v = convertMinor(line.amountMinor, line.currency, display, rateE4);
        if (line.kind.startsWith("income")) inMinor += v; else if (!line.xfer) outMinor += v;
      }
      return { span, lines: found.map((f) => f.line), count: found.length, inMinor, outMinor, months: [...months].sort() };
    })
    .sort((a, b) => b.span.hiddenAt - a.span.hiddenAt);
}
