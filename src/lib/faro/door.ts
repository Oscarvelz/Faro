/**
 * door — la puerta del aparato (oleada de la puerta, 1.3.168).
 *
 * El hueco (revisión de la puerta, 2026-11-09): con «Mantener sesión» apagado, la sesión y el
 * usuario recordado viven en sessionStorage; un arranque en frío lo encuentra vacío y el Login
 * se paraba delante de un libro local completo e intacto hasta que hubiera red — la puerta
 * cerrada contra su propio dueño. Brizna lo cerró con una marca de dueño en el aparato; Faro
 * hace lo mismo aquí.
 *
 * LA MARCA (`faro.owner`, en localStorage, FUERA de la sesión): la escribe rememberUser() cada
 * vez que hay una sesión viva — este aparato guarda un libro de esta cuenta. No es una sesión:
 * no autentica contra la nube ni habilita sincronizar; solo dice de quién es el libro que ya
 * está en el aparato, para que el arranque lo abra y el trabajo siga local. La cerradura de
 * verdad es la del aparato (y la huella de Faro, si está puesta, sigue pidiéndose igual).
 *
 * LA SALIDA EXPLÍCITA (`faro.out`) es un acto deliberado: cierra la puerta (la marca se borra
 * y la bandera queda puesta hasta la próxima sesión viva). Que la sesión caduque o que
 * «Mantener sesión» esté apagado NO es una salida: la puerta queda como estaba.
 *
 * Todo es puro y testeable contra un almacén inyectado (PackStorage); la puerta de arranque
 * (spa/main.tsx) y cloud.ts pasan el adaptador de localStorage. Nada aquí toca React ni el DOM.
 */
import type { PackStorage } from "./packguard.ts";

export const OWNER_MARK_KEY = "faro.owner";
export const EXPLICIT_OUT_KEY = "faro.out";

export interface OwnerMark {
  id: string;
  email: string;
  name: string;
}

export function readOwnerMark(store: PackStorage): OwnerMark | null {
  try {
    const raw = store.getItem(OWNER_MARK_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Partial<OwnerMark>;
    if (!u || typeof u.id !== "string" || !u.id) return null;
    return { id: u.id, email: typeof u.email === "string" ? u.email : "", name: typeof u.name === "string" ? u.name : "" };
  } catch { return null; }
}

export function writeOwnerMark(store: PackStorage, user: OwnerMark): void {
  try { store.setItem(OWNER_MARK_KEY, JSON.stringify({ id: user.id, email: user.email, name: user.name })); } catch { /* ignore */ }
}

export function clearOwnerMark(store: PackStorage): void {
  try { store.removeItem(OWNER_MARK_KEY); } catch { /* ignore */ }
}

export function readExplicitOut(store: PackStorage): boolean {
  try { return store.getItem(EXPLICIT_OUT_KEY) === "1"; } catch { return false; }
}

export function setExplicitOut(store: PackStorage): void {
  try { store.setItem(EXPLICIT_OUT_KEY, "1"); } catch { /* ignore */ }
}

export function clearExplicitOut(store: PackStorage): void {
  try { store.removeItem(EXPLICIT_OUT_KEY); } catch { /* ignore */ }
}

/**
 * ¿De quién es el libro que hay en el aparato? Las claves `faro.pack.<uid>` lo dicen; la
 * cuarentena (`faro.pack.corrupt.<uid>.<ts>`) no es un libro y no cuenta. Si la marca tiene su
 * libro, ese es el dueño; si hay un solo libro y no es de la marca, ese (la matriz lo rechaza
 * por no coincidir); si hay varios y ninguno es de la marca, no hay un dueño decidible (null).
 */
export function bookUidForKeys(keys: readonly string[], markUid: string | null): string | null {
  const uids: string[] = [];
  for (const k of keys) {
    if (!k.startsWith("faro.pack.")) continue;
    const rest = k.slice("faro.pack.".length);
    if (!rest || rest.startsWith("corrupt.")) continue;
    if (!uids.includes(rest)) uids.push(rest);
  }
  if (markUid && uids.includes(markUid)) return markUid;
  if (uids.length === 1) return uids[0];
  return null;
}

export type BootDecision = "session" | "door" | "login";

export interface BootInputs {
  /** Hay una sesión viva de Supabase. */
  hasSession: boolean;
  /** Hay un usuario recordado en su almacén (localStorage con keep ON; sessionStorage con keep OFF). */
  remembered: boolean;
  /** «Mantener sesión abierta». */
  keep: boolean;
  /** La marca de dueño del aparato (uid), o null. */
  markUid: string | null;
  /** El uid dueño del libro local presente (bookUidForKeys), o null si no hay libro decidible. */
  bookUid: string | null;
  /** Hubo una salida explícita y ninguna sesión viva desde entonces. */
  explicitOut: boolean;
}

/**
 * La decisión de arranque en frío, completa:
 * - Sesión viva → "session" (lo de siempre).
 * - Salida explícita → "login": la puerta se cerró a propósito; ni marca ni libro la reabren.
 * - Keep ON → lo de siempre, sin tocar: recordado → "session"; sin recordado → "login".
 *   (Con keep ON el usuario recordado vive en localStorage y el arranque sin red ya abría.)
 * - Keep OFF → solo la puerta puede abrir, y solo si el libro presente es DE LA MARCA
 *   (bookUid === markUid). Un libro ajeno, un libro sin marca, o una marca sin libro → "login".
 *   El recordado de sessionStorage no abre por sí solo: en un arranque en frío verdadero ni
 *   siquiera existe, y dentro de una misma visita manda la sesión viva, no esta matriz.
 */
export function bootDecision(i: BootInputs): BootDecision {
  if (i.hasSession) return "session";
  if (i.explicitOut) return "login";
  if (i.keep) return i.remembered ? "session" : "login";
  if (i.markUid && i.bookUid && i.bookUid === i.markUid) return "door";
  return "login";
}
