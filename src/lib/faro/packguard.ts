/**
 * packguard — la guardia del paquete guardado (oleada 2 del corazón, 1.3.166).
 *
 * El corazón de la persistencia local: el pack `faro.pack.<uid>` ({ledger, dirty} en JSON) y su
 * cuarentena `faro.pack.corrupt.<uid>.<ts>`. Antes de esta oleada, la validación de arranque era
 * superficial (isLedger) y la cuarentena se negaba a apartar un pack que la pasaba: un libro con
 * corrupción de CAMPO explotaba en el arranque y se sustituía en silencio por un libro nuevo
 * (auditoría del corazón, C1). Ahora: validación profunda (isLedgerDeep), cuarentena que actúa
 * ante cualquier pack que no valida en profundidad, rotación que nunca expulsa la última copia
 * buena (C5), y el veredicto entre pestañas por sello de revisión (C2).
 *
 * Todo es puro y testeable contra un almacén inyectado (PackStorage); el provider pasa el
 * adaptador de localStorage. Nada aquí toca React ni el DOM.
 */
import { isLedgerDeep } from "./defaults.ts";
import type { LedgerState } from "./types.ts";

export interface PackStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

/** Adaptador sobre localStorage (el proveedor lo usa; los tests inyectan uno falso). */
export function browserPackStorage(): PackStorage {
  return {
    getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* full/blocked: el llamador decide */ } },
    removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
    keys: () => { try { return Object.keys(localStorage); } catch { return []; } },
  };
}

export const packKeyOf = (uid: string): string => `faro.pack.${uid}`;
export const corruptPrefixOf = (uid: string): string => `faro.pack.corrupt.${uid}.`;

/** ¿Este crudo es un pack cuyo libro valida EN PROFUNDIDAD? */
export function packLedgerOk(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const pack = JSON.parse(raw) as { ledger?: unknown };
    return !!pack && typeof pack === "object" && isLedgerDeep(pack.ledger);
  } catch { return false; }
}

export interface QuarantineEntry {
  key: string;
  ts: number;
  /** Fecha ISO de la copia (el ts de su clave). */
  at: string;
  bytes: number;
  /** true si la copia sigue siendo un libro válido en profundidad (restaurable). */
  ok: boolean;
}

/** Las copias apartadas de un usuario, de la más nueva a la más vieja. */
export function listQuarantine(store: PackStorage, uid: string): QuarantineEntry[] {
  const prefix = corruptPrefixOf(uid);
  return store.keys()
    .filter((k) => k.startsWith(prefix))
    .map((k) => {
      const ts = Number(k.slice(prefix.length));
      const raw = store.getItem(k);
      return { key: k, ts, at: new Date(ts).toISOString(), bytes: raw ? raw.length : 0, ok: packLedgerOk(raw) };
    })
    .filter((e) => Number.isFinite(e.ts))
    .sort((a, b) => b.ts - a.ts);
}

export function readQuarantine(store: PackStorage, uid: string, ts: number): string | null {
  return store.getItem(corruptPrefixOf(uid) + String(ts));
}

/**
 * La rotación declarada (arreglo C5): se conservan las **3 copias más recientes** MÁS la copia
 * válida más reciente si quedara fuera de esas tres — la última copia que aún parsea como un
 * libro bueno jamás se expulsa. (El tope de 3 a secas permitía que un bucle de corrupción
 * destruyera la única copia recuperable; aquí el máximo es 4 y solo mientras esa copia buena
 * sea más vieja que las tres recientes.)
 */
export function rotateQuarantine(store: PackStorage, uid: string, keep = 3): void {
  const entries = listQuarantine(store, uid); // newest first
  if (entries.length <= keep) return;
  const pinned = entries.find((e) => e.ok); // la copia buena más reciente: intocable
  let budget = keep;
  for (const e of entries) {
    if (pinned && e.key === pinned.key) continue;
    if (budget > 0) { budget--; continue; }
    store.removeItem(e.key);
  }
}

/**
 * Aparta el pack actual a cuarentena. Devuelve true si la copia quedó a salvo.
 * - Sin pack (primer arranque genuino): false — NADA que apartar, jamás se bloquea un libro nuevo.
 * - Pack válido en profundidad y sin `force`: false — no hay nada dañado.
 * - `force` lo usa el catch del arranque: el pack existía pero el arranque falló; la preservación
 *   gana el empate y se aparta aunque valide (un fallo de motor no debe costar el libro).
 * - Dedupe: si la copia más reciente ya guarda exactamente este crudo, no se duplica.
 */
export function quarantinePack(store: PackStorage, uid: string, opts: { force?: boolean; now?: number } = {}): boolean {
  const raw = store.getItem(packKeyOf(uid));
  if (!raw) return false;
  if (!opts.force && packLedgerOk(raw)) return false;
  const newest = listQuarantine(store, uid)[0];
  if (newest && store.getItem(newest.key) === raw) return true; // ya está apartada
  const ts = opts.now ?? Date.now();
  try {
    store.setItem(corruptPrefixOf(uid) + String(ts), raw);
  } catch { return false; }
  rotateQuarantine(store, uid);
  return true;
}

/** El sello de revisión de un crudo de pack; null si no se puede leer. */
export function storedRevision(raw: string | null | undefined): number | null {
  if (!raw) return null;
  try {
    const pack = JSON.parse(raw) as { ledger?: Partial<LedgerState> };
    const r = pack?.ledger?.revision;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  } catch { return null; }
}

export type TabVerdict = "write" | "adopt" | "surface";

/**
 * El veredicto entre pestañas (C2), conservador y sin motor de mezcla:
 * - Sin sello guardado, sin sello base, o almacén en/por detrás de nuestra base → "write": el
 *   flujo de siempre (una sola pestaña, primer arranque) queda byte a byte idéntico.
 * - El almacén va por DELANTE de nuestra base:
 *   - esta pestaña está limpia (su sesión es exactamente la base) → "adopt": recargar el libro
 *     guardado antes de seguir editando;
 *   - esta pestaña tiene trabajo propio (dirty, o su sesión ya avanzó del sello base) →
 *     "surface": no se escribe nada; el trabajo se aparta a la puerta de conflicto y se avisa.
 *
 * Ola 21 (§B-21): la ventana de IGUAL revisión aprende el contenido. La
 * entrada anunciada es el único contenido de la casa que cambia el libro
 * sin mover la revisión, y este veredicto — como el listener — solo
 * despertaba por revisión: dos pestañas que acuñaban su entrada dentro
 * de la misma ventana se pisaban por turnos en el pack durable, y la
 * entrada de la que no escribió última moría sin ranura, sin banner y
 * sin confesión (la cura 20 guardó la puerta RECEPTORA — localWorkVerdict
 * — y dejó esta compuerta juzgando solo por el sello que la entrada, por
 * diseño, no mueve). Con el contenido en la mano (`content`), si el
 * almacén está EXACTAMENTE en la base y mi sesión también (mi escritura
 * no avanzaría la revisión: mi única divergencia posible es de registro)
 * y el pack conoce una entrada anunciada que mi libro no conoce, el
 * veredicto es "surface": la puerta de conflicto aparta mi copia — con
 * mi entrada — y adopta el pack — con la suya. Ninguna pisa a la otra.
 * La ventana es exacta a propósito: si mi sesión avanzó de la base
 * (sessionRev > baseRev), mi escritura SÍ mueve la revisión y manda —
 * una línea de registro no desplaza trabajo real; la entrada ajena se
 * protege en su propia pestaña por la puerta receptora de la ola 20
 * cuando mi guardado le llegue. Sin `content` (las llamadas de la
 * oleada 2), el veredicto es el C2 original, byte a byte.
 */
export function tabVerdict(storedRev: number | null, baseRev: number | null, sessionRev: number, dirty: boolean, content?: { mine: LedgerState; stored: LedgerState | null }): TabVerdict {
  if (storedRev === null || baseRev === null) return "write";
  if (storedRev <= baseRev) {
    if (content?.stored && storedRev === baseRev && sessionRev === baseRev && announcedAbsent(content.stored, content.mine)) return "surface";
    return "write";
  }
  if (dirty || sessionRev !== baseRev) return "surface";
  return "adopt";
}

export type ApartDecision = "none" | "first" | "second" | "kept" | "reuse-first" | "reuse-second" | "blocked";

/**
 * La decisión de ranura de la puerta de conflicto (OBS-C5-1, ola 5): dónde
 * se aparta la copia desplazada (`mine`, el libro en crudo de esta pestaña
 * o de este aparato) cuando otra línea ganó (`winning`), dadas las dos
 * ranuras de retención (la principal y la de la pestaña). La regla es la
 * que el banner promete — la retención guarda la divergencia — y ninguna
 * costumbre de puerta puede sobrescribir una divergencia viva:
 * - `none`: mi copia ES la ganadora — no hay divergencia que apartar.
 * - `kept`: una ranura ya guarda exactamente mi copia — ya está a salvo.
 * - `first` / `second`: la primera ranura libre, en orden.
 * - `reuse-first` / `reuse-second`: sin ranura libre, la que guarda
 *   exactamente la copia GANADORA puede reutilizarse — esa copia dejó de
 *   ser una divergencia en el momento en que su línea ganó.
 * - `blocked`: las dos ranuras guardan divergencias vivas ajenas. NO se
 *   aparta nada y el llamador lo dice con palabras llanas; pisar la
 *   retención anterior en silencio es lo que la ola 5 condenó.
 * Pura y sin almacén: las puertas (pestaña y sync) ejecutan el veredicto.
 */
export function apartDecision(mine: string, winning: string, first: string | null, second: string | null): ApartDecision {
  if (mine === winning) return "none";
  if (first === mine || second === mine) return "kept";
  if (first === null) return "first";
  if (second === null) return "second";
  if (first === winning) return "reuse-first";
  if (second === winning) return "reuse-second";
  return "blocked";
}

/**
 * Ola 20 (§B): ¿el libro vivo guarda una entrada ANUNCIADA que el pack
 * guardado no conoce? La entrada de un aborto declarado (commitAnnounced)
 * es contenido del registro: nació sin mover la revisión, así que la
 * fórmula vieja de «trabajo local» — diferencia de contenido Y revisión
 * movida de la base — la leía como «nada que apartar» y la llegada
 * extranjera la sobrescribía en silencio: ni ranura, ni banner, ni
 * toast. Una diferencia de registro con revisión igual ES trabajo
 * local cuando la diferencia es una entrada anunciada ausente del pack.
 */
export function announcedAbsent(mine: LedgerState, stored: LedgerState): boolean {
  const ids = new Set(stored.audit.map((e) => e.id));
  return mine.audit.some((e) => e.announced && !ids.has(e.id));
}

/**
 * El veredicto de trabajo local de surfaceTabConflict, como función
 * pura (la fórmula vive aquí desde la ola 20 para que la cerca la clave
 * entera, no una copia):
 * - Sin pack legible, comparar es imposible y la preservación gana el
 *   empate: hay trabajo local (doctrina OBS-C5-1, ola 5).
 * - Contenido idéntico al guardado: no hay trabajo, aunque la sesión se
 *   haya sembrado sucia.
 * - Contenido distinto: hay trabajo si la revisión se movió de la base
 *   O si el libro guarda una entrada anunciada que el pack no conoce
 *   (ola 20, §B: la entrada es contenido aunque la revisión no se mueva).
 */
export function localWorkVerdict(mineJson: string, storedJson: string | null, mine: LedgerState, stored: LedgerState | null, baseRev: number | null): boolean {
  if (storedJson === null || stored === null) return true;
  if (mineJson === storedJson) return false;
  return mine.revision !== baseRev || announcedAbsent(mine, stored);
}
