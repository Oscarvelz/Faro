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
 */
export function tabVerdict(storedRev: number | null, baseRev: number | null, sessionRev: number, dirty: boolean): TabVerdict {
  if (storedRev === null || baseRev === null) return "write";
  if (storedRev <= baseRev) return "write";
  if (dirty || sessionRev !== baseRev) return "surface";
  return "adopt";
}
