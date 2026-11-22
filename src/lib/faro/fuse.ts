/* ═══ LA FUSIÓN DEL LIBRO COMPARTIDO (Pieza C3, 1.3.392).
 *
 * Dos personas anotan en el mismo libro, a la vez y sin red: al volver
 * la conexión, los dos lados se componen sin duplicados y sin
 * resurrecciones. La ley es la fallada (F-C2 con la enmienda de Oscar):
 *
 * · LÍNEAS — fusión por identidad, a tres lados (la base es el último
 *   estado común que ambos lados sincronizaron):
 *   — la unión por id: lo nuevo de un lado entra; lo intacto se queda.
 *   — editada en un solo lado → ese lado. Editada en los dos → campo a
 *     campo: el campo tocado por un solo lado es de ese lado; el campo
 *     tocado por los dos es del libro que se movió más tarde (sin
 *     relojes por campo en el esquema, es la simplificación honesta, y
 *     se declara: los campos no disputados SIEMPRE se componen).
 *   — borrada en un lado → borrada, aunque el otro lado la haya
 *     editado: lo borrado se borra definitivamente. Y la fusión deja
 *     LÁPIDA firmada por el lado que borró (si el llamante dice quién
 *     es cada lado), para que ninguna copia vieja la resucite jamás.
 *   — con lápida en cualquiera de los lados → muerta, sin examen.
 * · ESTRUCTURA, AJUSTES Y EL RESTO DEL MOBILIARIO — gana la revisión
 *   mayor, como manda el estudio; a igual revisión y contenido
 *   distinto, la fusión devuelve conflict=true y la palabra la tiene
 *   la puerta de conflicto de la casa (provisionalmente manda el
 *   servidor, que es la referencia común).
 * · La auditoría no se fusiona: viaja con el lado ganador de la
 *   revisión. La actividad compartida, firmada y simétrica, es la
 *   Pieza C4.
 *
 * Todo es puro y desconfiado: las lápidas se leen filtradas y ninguna
 * línea entra sin id. */
import type { LedgerState, Line, Tombstone } from "./types";
import { migrateAutopayConfig } from "./autopay.ts";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Las lápidas de un libro, leídas con desconfianza. */
export function tombstonesOf(s: LedgerState): Tombstone[] {
  if (!Array.isArray(s.tombstones)) return [];
  const out: Tombstone[] = [];
  for (const t of s.tombstones as unknown[]) {
    if (typeof t !== "object" || t === null) continue;
    const r = t as Record<string, unknown>;
    if (typeof r.id === "string" && r.id !== "" && typeof r.at === "string" && typeof r.by === "string") {
      out.push({ id: r.id, at: r.at, by: r.by });
    }
  }
  return out;
}

/** Borrar una línea dejando su lápida firmada: la línea sale de su mes
 * y el hecho queda — id, cuándo, quién — para siempre fuera de las
 * cifras. Sin la línea, solo queda la lápida (idempotente). Como toda
 * puerta que borra, compone el paso de migración del pago automático
 * (la ley de la ola 25): si la línea era la instancia que portaba la
 * instrucción de su serie, la instrucción migra a la más nueva viva. */
export function withTombstone(state: LedgerState, lineId: string, by: string, at: string): LedgerState {
  const removed = clone(state);
  for (const mk of Object.keys(removed.months)) {
    const month = removed.months[mk];
    if (month && Array.isArray(month.lines)) {
      month.lines = month.lines.filter((l) => l.id !== lineId);
    }
  }
  const next = migrateAutopayConfig(state, removed);
  const stones = tombstonesOf(next).filter((t) => t.id !== lineId);
  stones.push({ id: lineId, at, by });
  next.tombstones = stones;
  return next;
}

export interface FuseSide {
  state: LedgerState;
  revision: number;
  updatedAt: string;
  /** La cuenta dueña de este lado, para firmar las lápidas que la
   * fusión acuña cuando un lado borró sin dejarla (un borrado por el
   * camino viejo). Sin autor, la fusión borra igual pero no acuña. */
  by?: string;
}

function lineIndex(s: LedgerState): Map<string, Line> {
  const idx = new Map<string, Line>();
  for (const mk of Object.keys(s.months)) {
    const month = s.months[mk];
    if (!month || !Array.isArray(month.lines)) continue;
    for (const l of month.lines) {
      if (l && typeof l.id === "string" && l.id !== "") idx.set(l.id, l);
    }
  }
  return idx;
}

/** Campo a campo entre dos versiones de la misma línea: lo tocado por
 * un solo lado es suyo; lo tocado por los dos, del lado más reciente. */
function fuseLine(base: Line | undefined, sv: Line, lc: Line, laterIsLocal: boolean): Line {
  const out: Record<string, unknown> = {};
  const keys = new Set<string>([...Object.keys(sv), ...Object.keys(lc)]);
  const b = (base ?? {}) as Record<string, unknown>;
  const s = sv as unknown as Record<string, unknown>;
  const l = lc as unknown as Record<string, unknown>;
  for (const k of keys) {
    const svChanged = !same(s[k], b[k]);
    const lcChanged = !same(l[k], b[k]);
    if (svChanged && !lcChanged) out[k] = s[k];
    else if (lcChanged && !svChanged) out[k] = l[k];
    else if (svChanged && lcChanged) out[k] = laterIsLocal ? l[k] : s[k];
    else out[k] = s[k];
  }
  return out as unknown as Line;
}

export function fuseBooks(base: LedgerState, server: FuseSide, local: FuseSide): { state: LedgerState; conflict: boolean } {
  // Las lápidas: la unión manda; por id queda la más reciente.
  const stoneBy = new Map<string, Tombstone>();
  for (const t of [...tombstonesOf(server.state), ...tombstonesOf(local.state)]) {
    const prev = stoneBy.get(t.id);
    if (!prev || t.at > prev.at) stoneBy.set(t.id, t);
  }

  const bIdx = lineIndex(base);
  const sIdx = lineIndex(server.state);
  const lIdx = lineIndex(local.state);
  const laterIsLocal = local.updatedAt > server.updatedAt;
  const surviving = new Map<string, Line>();
  const minted: Tombstone[] = [];

  const ids = new Set<string>([...bIdx.keys(), ...sIdx.keys(), ...lIdx.keys()]);
  for (const id of ids) {
    if (stoneBy.has(id)) continue; // con lápida: muerta, sin examen
    const b = bIdx.get(id);
    const sv = sIdx.get(id);
    const lc = lIdx.get(id);
    if (b && !sv && !lc) continue; // borrada en ambos
    if (b && !sv && lc) {
      // El servidor la borró: definitiva, aunque el local la editara.
      if (server.by) minted.push({ id, at: server.updatedAt, by: server.by });
      continue;
    }
    if (b && sv && !lc) {
      if (local.by) minted.push({ id, at: local.updatedAt, by: local.by });
      continue;
    }
    if (!b && sv && !lc) { surviving.set(id, clone(sv)); continue; }
    if (!b && !sv && lc) { surviving.set(id, clone(lc)); continue; }
    if (!b && sv && lc) {
      surviving.set(id, same(sv, lc) ? clone(sv) : fuseLine(undefined, sv, lc, laterIsLocal));
      continue;
    }
    if (b && sv && lc) {
      if (same(sv, b)) surviving.set(id, clone(lc));
      else if (same(lc, b)) surviving.set(id, clone(sv));
      else if (same(sv, lc)) surviving.set(id, clone(sv));
      else surviving.set(id, fuseLine(b, sv, lc, laterIsLocal));
    }
  }
  for (const t of minted) if (!stoneBy.has(t.id)) stoneBy.set(t.id, t);

  // Los meses se recomponen desde las líneas vivas: primero el orden
  // del servidor, después el del local; el mes sin líneas no queda.
  const months: LedgerState["months"] = {};
  const place = (from: LedgerState) => {
    for (const mk of Object.keys(from.months)) {
      const month = from.months[mk];
      if (!month || !Array.isArray(month.lines)) continue;
      for (const l of month.lines) {
        const win = surviving.get(l.id);
        if (!win) continue;
        surviving.delete(l.id);
        const key = typeof win.monthKey === "string" && win.monthKey !== "" ? win.monthKey : mk;
        (months[key] ??= { lines: [] }).lines.push(win);
      }
    }
  };
  place(server.state);
  place(local.state);
  for (const win of surviving.values()) {
    (months[win.monthKey] ??= { lines: [] }).lines.push(win);
  }

  // Estructura y mobiliario: la revisión mayor; a igual revisión y
  // contenido distinto, conflicto — y la puerta de la casa decide.
  let conflict = false;
  let winner = server;
  if (local.revision > server.revision) winner = local;
  else if (local.revision === server.revision
    && (!same(server.state.structure, local.state.structure) || !same(server.state.settings, local.state.settings))) {
    conflict = true;
  }
  const state = clone(winner.state);
  state.months = months;
  state.tombstones = [...stoneBy.values()].sort((a, z) => (a.at < z.at ? -1 : a.at > z.at ? 1 : 0));
  return { state, conflict };
}
