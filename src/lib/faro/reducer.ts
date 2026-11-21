import { uid } from "./money.ts";
import { FREQ_DEFAULT, intervalOf, nextDueFrom } from "./cadence.ts";
import { ISO_DAY } from "./loans.ts";
import { modeOf } from "./mode.ts";
import { seriesAutopayConfig } from "./autopay.ts";
import type { LedgerState, Line } from "./types";

export type Session = {
  ledger: LedgerState;
  past: LedgerState[];
  future: LedgerState[];
  dirty: boolean;
};

export function blankSession(ledger: LedgerState, dirty = false): Session {
  return { ledger, past: [], future: [], dirty };
}

export function commit(session: Session, recipe: (s: LedgerState) => LedgerState, detail: string | (() => string)): Session {
  const snap: LedgerState = session.ledger;
  const drafted = recipe(snap);
  return frameCommit(session, snap, drafted, detail);
}

function frameCommit(session: Session, snap: LedgerState, drafted: LedgerState, detail: string | (() => string)): Session {
  const updatedAt = new Date().toISOString();
  const ledger: LedgerState = {
    ...drafted,
    revision: snap.revision + 1,
    updatedAt,
    // 1.3.170: the detail may be a thunk, resolved only after the recipe ran, so the activity
    // entry can carry an outcome the recipe itself computed (the undo-import preserved count, N1).
    audit: [{ id: uid(), at: updatedAt, detail: typeof detail === "function" ? detail() : detail }, ...snap.audit].slice(0, 80),
  };
  return {
    ledger,
    past: [...session.past, snap].slice(-40),
    future: [],
    dirty: true,
  };
}

/* Ola 20 (G20-2): EL BORDE DECLARADO DE LAS TRES PUERTAS JUZGADAS
 * (commitGuarded, commitAnnounced, commitFinal). Las puertas juzgan lo
 * que la receta DEVUELVE, jamás lo que TOCA: una receta que muta el
 * estado en el sitio y devuelve ese mismo objeto aterriza su mutación
 * sin marco, sin entrada y sin revisión — la identidad que las puertas
 * leen es, por construcción, ciega al tacto. Es el límite declarado de
 * la garantía escrita de la casa, no un descuido: la cerca de la ola 20
 * (modos-ola20, especímenes M1–M3) lo clava como borde asentado, y el
 * barrido de mutaciones de producción corre limpio (toda mutación de la
 * casa trabaja sobre copias frescas). Si un día una receta muta en el
 * sitio a propósito, este párrafo y su pin son lo que hay que re-juzgar
 * — con la razón escrita, no por descubrimiento de la próxima ola. */

/**
 * Ola 18 (BR18-1): el commit que una receta puede ABORTAR sin marco.
 * Hasta aquí, `commit` enmarcaba todo lo que la receta devolvía — también
 * el estado intacto de un aborto: la entrada de Actividad afirmaba el
 * guardado con el nombre tecleado, la revisión subía y un fotograma de
 * Deshacer se apilaba, mientras la receta acababa de negarse a cometer
 * (la línea de juicio del fantasma, la guarda del paquete, las preguntas
 * de existencia de la forma de tarjeta). El registro mentía aunque la
 * tarjeta y la forma dijeran la verdad.
 *
 * El mecanismo es la SEÑAL EXPLÍCITA, no la detección: la receta de esta
 * puerta devuelve `null` (o, como red, el propio estado que recibió —
 * dentro de esta puerta devolver tu entrada solo puede significar «nada
 * que cometer») y el envoltorio devuelve la sesión SIN MARCO: ni
 * entrada, ni revisión, ni fotograma, ni sucio. La carcasa de la sesión
 * sí es nueva — los efectos que leen el canal del veredicto
 * (saveVerdict) despiertan con el cambio de sesión y re-plantean su
 * anuncio; el libro, la pila y la bandera de sucio quedan los mismos
 * objetos.
 *
 * Por qué no detección por identidad en `commit` a secas: no todo
 * aborto de la casa miente. La confirmación de modo (applyModeConfirmed)
 * aborta devolviendo el estado intacto y su entrada es DELIBERADA y
 * veraz — su detalle-función nombra la no-aplicación («La confirmación
 * no aplicó…», doctrina de BR15-1) — y decenas de recetas ordinarias
 * apoyadas en ayudantes idempotentes devuelven el estado cuando no hay
 * nada que hacer, sin que nadie haya juzgado su marco. Borrar el marco
 * por identidad en el envoltorio común desharía esa entrada asentada y
 * barrería el comportamiento de toda la casa por un quiebre de una
 * puerta. La señal explícita cura exactamente las recetas que abortan
 * con veredicto (la forma de tarjeta, savePlan, restoreDue) y deja el
 * resto byte a byte como estaba.
 */
export function commitGuarded(session: Session, recipe: (s: LedgerState) => LedgerState | null, detail: string | (() => string)): Session {
  const snap: LedgerState = session.ledger;
  const drafted = recipe(snap);
  if (drafted === null || drafted === snap) return { ...session };
  return frameCommit(session, snap, drafted, detail);
}

/**
 * Ola 19 (BR19-1): el commit cuyo aborto es DECLARADO — deja su entrada
 * veraz en el registro, pero no marco.
 *
 * La confirmación de modo (applyModeConfirmed) aborta devolviendo el
 * estado intacto y su entrada es deliberada y veraz (su detalle-función
 * nombra la no-aplicación, o el aterrizaje de su tanda — doctrina
 * BR15-1). La cura 18 la excluyó de la puerta guardada por esa entrada,
 * y acertó en la entrada; pero la exclusión calló el MARCO: por la
 * puerta vieja, el aborto apilaba un fotograma de Deshacer idéntico y
 * subía la revisión, así que una sola mudanza de contenido costaba
 * revisión +2 y el primer Deshacer de la tanda se gastaba en borrar la
 * entrada del aborto sin tocar el libro (medido en vivo, ola 19).
 *
 * Esta puerta separa la entrada del marco, que es lo que la doctrina
 * siempre quiso decir: si la receta compone estado nuevo, aterriza con
 * su marco entero (frameCommit, como commit). Si devuelve su propio
 * estado (o null), el aborto deja SOLO su entrada: el libro gana la
 * línea de registro con su detalle veraz y su updatedAt, y nada más —
 * la revisión NO sube, la pila de Deshacer queda el mismo objeto, el
 * futuro queda el mismo objeto. La sesión sí es nueva y el libro sí es
 * un objeto nuevo (el registro cambió), así que el canal del veredicto
 * despierta y la bandera de sucio se levanta: la entrada es contenido
 * real y debe persistir. Lo que ya no puede pasar es que un Deshacer se
 * gaste en una no-aplicación, ni que la revisión afirme una mudanza que
 * no ocurrió.
 *
 * Ola 20 (§A): la entrada que esta puerta acuña nace MARCADA
 * (`announced: true` en la entrada). Es contenido del registro, no foto
 * del libro: Deshacer y Rehacer la preservan a través de la restauración
 * de la pila (las entradas marcadas del libro vivo cuyos ids no están
 * en la foto restaurada viajan con ella), y entre pestañas cuenta como
 * trabajo local aunque la revisión no se mueva (packguard,
 * localWorkVerdict). Sin la marca, un Deshacer vecino se la llevaba con
 * la foto del aterrizaje anterior y una llegada extranjera la evaporaba
 * en silencio: el registro perdía justo la línea que decía la verdad.
 *
 * Ola 20 (G20-3): EL LÍMITE DECLARADO DE ESTA PUERTA. La puerta está
 * expuesta a cualquier llamante de useFaro(): quien la llame con una
 * receta que aborta acuña una entrada de registro con el texto que
 * quiera, y las entradas huérfanas se apilan sin deduplicar. Lo que un
 * huérfano NO puede hacer es falsificar ni consumir el veredicto de
 * modo: la ranura del veredicto vive en screens.tsx, fuera de esta
 * puerta, y la entrada misma es solo registro — no mueve dinero, no
 * cambia el modo, no toca la pila. Guardar la puerta con la ranura del
 * veredicto como llave se pesó y se rechazó con su costo escrito:
 * acoplaría las tres puertas del reducer al flujo de confirmación de
 * las pantallas para defender un daño confinado al registro de
 * Actividad. La vigilancia queda donde la casa vigila a sus llamantes:
 * el censo permanente (modos-ola19 §B) clasifica cada sitio que llama a
 * esta puerta — hoy tiene UN solo llamante legítimo, la confirmación de
 * modo — y todo llamante nuevo acusa hasta ser clasificado con su
 * razón. El límite es doctrina escrita, no silencio.
 */
export function commitAnnounced(session: Session, recipe: (s: LedgerState) => LedgerState | null, detail: string | (() => string)): Session {
  const snap: LedgerState = session.ledger;
  const drafted = recipe(snap);
  if (drafted !== null && drafted !== snap) return frameCommit(session, snap, drafted, detail);
  const updatedAt = new Date().toISOString();
  const ledger: LedgerState = {
    ...snap,
    updatedAt,
    audit: [{ id: uid(), at: updatedAt, detail: typeof detail === "function" ? detail() : detail, announced: true }, ...snap.audit].slice(0, 80),
  };
  return { ledger, past: session.past, future: session.future, dirty: true };
}

/* Ola 20 (§A): la restauración de una foto no se lleva las entradas
 * ANUNCIADAS que la foto no conoce. La entrada anunciada es un hecho
 * del registro («la confirmación no aplicó», con su fecha), no una
 * pieza del estado fotografiado: nació DESPUÉS de la foto o fuera de
 * su línea, y borrarla al restaurar era perder justo la línea que
 * decía la verdad de la tanda. Las marcadas del libro vivo cuyos ids
 * no están en la foto viajan al frente del registro restaurado (son
 * las más nuevas), con el mismo tope de 80 de la casa. */
function auditRestored(living: LedgerState, photo: LedgerState): LedgerState["audit"] {
  const keep = living.audit.filter((e) => e.announced && !photo.audit.some((p) => p.id === e.id));
  return keep.length ? [...keep, ...photo.audit].slice(0, 80) : photo.audit;
}

export function undo(session: Session): Session {
  const prev = session.past[session.past.length - 1];
  if (!prev) return session;
  // Ola 2 (C2-1): LA FRONTERA DEL MODO. La historia restaura fotos enteras y
  // el modo viaja dentro de la foto: un Deshacer que cruzara un cambio de
  // modo lo revertía sin ninguna de sus dos ceremonias (bajar sin pantalla
  // de impacto, subir sin aviso) y se llevaba su entrada de Actividad. El
  // Deshacer se detiene en la frontera: la foto al otro lado tiene otro
  // modo (leído con modeOf, la lectura del sistema) y no se cruza — el modo
  // se cambia por su puerta, en Ajustes. La entrada de Actividad del cambio
  // queda a este lado de la frontera: sobrevive.
  if (modeOf(prev.settings) !== modeOf(session.ledger.settings)) return session;
  const updatedAt = new Date().toISOString();
  return {
    ledger: { ...prev, revision: session.ledger.revision + 1, updatedAt, audit: auditRestored(session.ledger, prev) },
    past: session.past.slice(0, -1),
    future: [session.ledger, ...session.future].slice(0, 40),
    dirty: true,
  };
}

/**
 * Como `commit`, pero SIN historia: lo hecho por esta vía no se puede deshacer (la
 * eliminación de un período tras la puerta escrita, D3). El pasado se vacía ENTERO,
 * no solo se deja de empujar: un snapshot anterior en la pila resucitaría lo borrado
 * al deshacer cualquier cosa, así que la única pila segura es la vacía — el mismo
 * corte que una restauración de copia hace con blankSession.
 *
 * Ola 19 (G19-1, especímenes A11/B4): la pregunta propia de esta puerta —
 * ¿debe enmarcar, y vaciar el pasado, cuando su receta devuelve el estado
 * intacto? NO. Sus dos recetas (borrar un período, borrar líneas apartadas)
 * se niegan por identidad cuando el blanco ya no vive, y enmarcar esa
 * negativa mentía dos veces: la entrada afirmaba una eliminación que no
 * ocurrió y el pasado entero de Deshacer se vaciaba por un borrado que
 * nunca pasó — el peor espécimen de la ola. La finalidad es de los
 * ATERRIZAJES: si la receta devuelve su propio estado, no hay nada que
 * hacer final, y la sesión vuelve sin marco y con su pasado intacto (la
 * carcasa es nueva, como en la puerta guardada). La detección aquí no es
 * la que la cura 18 rechazó para `commit`: esta puerta tiene dos
 * recetas, ambas de borrado, y ninguna aterriza devolviendo su entrada.
 */
export function commitFinal(session: Session, recipe: (s: LedgerState) => LedgerState, detail: string | (() => string)): Session {
  const snap: LedgerState = session.ledger;
  const drafted = recipe(snap);
  if (drafted === snap) return { ...session };
  const updatedAt = new Date().toISOString();
  const ledger: LedgerState = {
    ...drafted,
    revision: snap.revision + 1,
    updatedAt,
    audit: [{ id: uid(), at: updatedAt, detail: typeof detail === "function" ? detail() : detail }, ...snap.audit].slice(0, 80),
  };
  return {
    ledger,
    past: [],
    future: [],
    dirty: true,
  };
}

export function redo(session: Session): Session {
  const next = session.future[0];
  if (!next) return session;
  // Ola 2 (C2-1): la frontera del modo guarda también el Rehacer — rehacer
  // un cambio de modo lo repondría sin su ceremonia, igual que deshacerlo.
  if (modeOf(next.settings) !== modeOf(session.ledger.settings)) return session;
  const updatedAt = new Date().toISOString();
  return {
    ledger: { ...next, revision: session.ledger.revision + 1, updatedAt, audit: auditRestored(session.ledger, next) },
    past: [...session.past, session.ledger].slice(-40),
    future: session.future.slice(1),
    dirty: true,
  };
}

export function upsertLine(state: LedgerState, line: Line): LedgerState {
  const bucket = state.months[line.monthKey] ?? { lines: [] };
  const exists = bucket.lines.some((l) => l.id === line.id);
  const lines = exists ? bucket.lines.map((l) => (l.id === line.id ? line : l)) : [...bucket.lines, line];
  return { ...state, months: { ...state.months, [line.monthKey]: { lines } } };
}

/** Ola 14 (Guardián G14-6): el parche contra lo VIVO. upsertLine sustituye
 * la línea entera por id: quien componía `{...lineaDelRender, campo}` y lo
 * subía, escribía la FOTO entera — los campos que otra pestaña acababa de
 * tocar en esa misma línea morían al nivel del commit, invisibles para el
 * censo (su brazo B solo censaba line-form.tsx). patchLine busca la línea
 * dentro del estado que el commit trae y aplica solo el parche sobre la
 * línea viva; patchLineWith deja que el parche se calcule DESDE la línea
 * viva (historiales que se anexan, saldos que se derivan). Si la línea ya
 * no vive, el estado vuelve intacto: nadie resucita una línea desde una
 * foto. El patrón sano ya existía en la casa (archivo.tsx busca la línea
 * dentro de su commit); esto lo hace la ruta corta de todos. */
export function patchLine(state: LedgerState, id: string, patch: Partial<Line>): LedgerState {
  return patchLineWith(state, id, () => patch);
}

export function patchLineWith(state: LedgerState, id: string, patch: (live: Line) => Partial<Line>): LedgerState {
  for (const [key, bucket] of Object.entries(state.months)) {
    const live = bucket.lines.find((l) => l.id === id);
    if (!live) continue;
    const next: Line = { ...live, ...patch(live) };
    if (next.monthKey === key) return upsertLine(state, next);
    return upsertLine(deleteLine(state, key, id), next);
  }
  return state;
}

export function deleteLine(state: LedgerState, monthKey: string, id: string): LedgerState {
  const bucket = state.months[monthKey];
  if (!bucket) return state;
  // Ola 19 (G19-3, espécimen C2): sin la línea en el mes, no hay borrado —
  // el estado vuelve intacto, como patchLineWith manda («nadie resucita
  // una línea desde una foto», y nadie firma un borrado que no ocurrió).
  // Antes el filtro componía un objeto nuevo de contenido igual y la
  // puerta enmarcaba el intento: la entrada afirmaba el conteo intentado
  // («2» por cero borradas) y el fotograma se apilaba por nada.
  if (!bucket.lines.some((l) => l.id === id)) return state;
  const without: LedgerState = {
    ...state,
    months: { ...state.months, [monthKey]: { lines: bucket.lines.filter((l) => l.id !== id) } },
  };
  // OLA 24 (G24-3 de Guardián): LA CONFIGURACIÓN DEL PAGO AUTOMÁTICO
  // SOBREVIVE A SU PAPEL. La instrucción de una serie (seriesAutopay-
  // Config, en autopay.ts: la única resolución de la casa) vive en la
  // instancia que la menciona — y borrar esa anotación del Historial
  // apagaba la serie para siempre, en silencio: borrar un papel no es
  // revocar una instrucción permanente. Aquí, dentro de la misma receta
  // de borrado, si la instrucción resuelta de la serie CAMBIA al quitar
  // la línea, la instrucción de antes se estampa en la instancia más
  // nueva restante: encendida con su cuenta, o el apagado explícito —
  // en las dos direcciones, lo que la serie tenía dicho queda dicho.
  // Sin serie, sin mención o sin cambio, el borrado es el de siempre.
  // (El movimiento de mes de patchLineWith compone este borrado con el
  // upsert de la MISMA línea: si una estampa nace, es copia de la misma
  // instrucción que la línea que vuelve trae, y la resolución — de la
  // más nueva a la más vieja — lee la misma palabra.)
  const target = bucket.lines.find((l) => l.id === id)!;
  if (target.kind !== "subscription") return without;
  const seriesKey = target.seriesId || target.id;
  const all: Line[] = [];
  const remaining: Line[] = [];
  for (const b of Object.values(state.months)) {
    for (const l of b.lines) {
      if (l.kind !== "subscription" || (l.seriesId || l.id) !== seriesKey) continue;
      all.push(l);
      if (l.id !== id) remaining.push(l);
    }
  }
  if (!remaining.length) return without;
  const before = seriesAutopayConfig(all);
  if (!before) return without;
  const after = seriesAutopayConfig(remaining);
  if (after && after.on === before.on && after.accountId === before.accountId) return without;
  const day = (l: Line): string => l.bookedOn || l.nextDue || `${l.monthKey}-01`;
  const newest = [...remaining].sort((a, b) => day(a).localeCompare(day(b)))[remaining.length - 1]!;
  const stamped: Line = before.on
    ? { ...newest, autopay: true, autopayAccountId: before.accountId }
    : { ...newest, autopay: false };
  return upsertLine(without, stamped);
}

export function copyRecurring(state: LedgerState, from: string, to: string): { state: LedgerState; count: number } {
  if (from === to) return { state, count: 0 };
  const src = state.months[from]?.lines ?? [];
  const dst = state.months[to]?.lines ?? [];
  const have = new Set(dst.map((l) => l.seriesId || l.id));
  const additions = src
    // Ola 2 (G2-1): la rama ciega de la copia es la de las cuotas — toda
    // línea `subscription` se reproduce sin preguntar. Una línea con vínculo
    // de pago (loanId/lentId/cardId) jamás entra por esa rama: si se
    // volviera cuota, cada copia sumaría un abono fantasma contra la deuda.
    // Solo la marca `recurring` de la persona la trae, como a cualquier línea.
    .filter((l) => (l.recurring || (l.kind === "subscription" && !l.loanId && !l.lentId && !l.cardId)) && l.active)
    .filter((l) => !have.has(l.seriesId || l.id))
    .flatMap((l) => {
      // D1: una copia es un movimiento NUEVO — jamás nace apartada. `rest` pertenece al
      // período que apartó la original; la copia no tiene período, así que heredarlo la
      // dejaría invisible y sin restauración posible, contando en ninguna parte.
      const born = { ...l };
      delete born.rest;
      // Ola 2 (G2-2): la copia nace también sin PROCEDENCIA de importación.
      // Es una línea nueva de la persona, no un producto del lote — pero
      // heredaba importId/batch/via y dos sistemas cobraban la mentira: el
      // deshacer del lote original la borraba en silencio (caía en la regla
      // «del lote» por su batch heredado, sin contar como preservada) y la
      // deduplicación bloqueaba reimportar el original mientras la copia
      // existiera. Sin identidad heredada, la copia es intocable para el
      // lote y el original puede volver a importarse.
      delete born.importId;
      delete born.batch;
      delete born.via;
      // 1.3.76 intervals ("3m", "1d"…): carry only into a month the rhythm falls in, dated on that payment. Old words keep the old copy.
      const from0 = l.nextDue || l.bookedOn;
      if (!l.cadence || FREQ_DEFAULT.includes(l.cadence) || !from0) {
        // PREJUDICE PJ-2: the copy is the TARGET month's instance — its due date must live in
        // its own month too. The old copy kept the source month's nextDue verbatim, so
        // duesWindow served a month-stale date forever and the real occurrence was invisible
        // to the Asesor, the widget and «Puedes gastar hoy» (the Cuotas screens self-healed
        // at render via nextDueFrom; the engine never did). Advance the date the same way
        // the screens compute it: first occurrence of the rhythm on/after the target
        // month's 1st; a cadence-less dated line shifts by the whole months between buckets.
        if (!from0 || !ISO_DAY.test(from0)) return [{ ...born, id: uid(), monthKey: to }];
        let due: string;
        if (l.cadence) {
          due = nextDueFrom(from0, l.cadence, `${to}-01`);
        } else {
          const [fy, fm] = from.split("-").map(Number);
          const [ty, tm] = to.split("-").map(Number);
          const shift = (ty! - fy!) * 12 + (tm! - fm!);
          const total = fy! * 12 + (fm! - 1) + shift;
          const yy = Math.floor(total / 12), mm = (total % 12) + 1;
          const last = new Date(yy, mm, 0).getDate();
          const dd = Math.min(Number(from0.slice(8, 10)), last);
          due = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        }
        return [{ ...born, id: uid(), monthKey: to, nextDue: due }];
      }
      // PREJUDICE PJ-16: a cadence string the interval parser does not know
      // ("every-3-months" and its kin) made nextDueFrom return the source date
      // unchanged, the month check then dropped the copy — the charge silently
      // VANISHED from the target month. An unknowable rhythm falls back to the
      // whole-month shift, like a cadence-less line: the date may not follow the
      // true rhythm, but the charge exists in its month, visible and correctable,
      // instead of not existing at all.
      if (!intervalOf(l.cadence)) {
        const [fy, fm] = from.split("-").map(Number);
        const [ty, tm] = to.split("-").map(Number);
        const shift = (ty! - fy!) * 12 + (tm! - fm!);
        const total = fy! * 12 + (fm! - 1) + shift;
        const yy = Math.floor(total / 12), mm = (total % 12) + 1;
        const last = new Date(yy, mm, 0).getDate();
        const dd = Math.min(Number(from0.slice(8, 10)), last);
        const due = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        return [{ ...born, id: uid(), monthKey: to, nextDue: due }];
      }
      const due = nextDueFrom(from0, l.cadence, `${to}-01`);
      if (due.slice(0, 7) !== to) return [];
      return [{ ...born, id: uid(), monthKey: to, nextDue: due, bookedOn: due }];
    });
  if (!additions.length) return { state, count: 0 };
  return {
    count: additions.length,
    state: { ...state, months: { ...state.months, [to]: { lines: [...dst, ...additions] } } },
  };
}
