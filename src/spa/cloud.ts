import { createClient, type Session } from "@supabase/supabase-js";
import { CLOUD_READY, SUPABASE_KEY, SUPABASE_URL } from "./config";
import { clearExplicitOut, clearOwnerMark, setExplicitOut, writeOwnerMark } from "@/lib/faro/door";
import { pendOfferIfFirst } from "@/lib/faro/lockoffer";
import { browserPackStorage } from "@/lib/faro/packguard";
import { clearPlace } from "@/lib/faro/navplace";
export { CLOUD_READY };

const LAST = "faro.lastUser";

/** "Mantener sesión abierta": on (default) = the session lives on this device until you sign out;
 *  off = it lives only while the app is open (sessionStorage), so you sign in each time. */
const KEEP = "faro.keep";
export function keepSignedIn(): boolean {
  try { return localStorage.getItem(KEEP) !== "0"; } catch { return true; }
}
export function setKeepSignedIn(on: boolean) {
  try {
    localStorage.setItem(KEEP, on ? "1" : "0");
    if (!on) localStorage.removeItem(LAST);
  } catch { /* ignore */ }
}
function box(): Storage {
  return keepSignedIn() ? localStorage : sessionStorage;
}
const authStorage = {
  getItem: (k: string) => { try { return box().getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => {
    try {
      box().setItem(k, v);
      (keepSignedIn() ? sessionStorage : localStorage).removeItem(k);
    } catch { /* ignore */ }
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* ignore */ } },
};

export const supabase = createClient(CLOUD_READY ? SUPABASE_URL : "https://placeholder.supabase.co", CLOUD_READY ? SUPABASE_KEY : "placeholder", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "faro-auth", storage: authStorage },
});

export type FaroUser = { id: string; email: string; name: string; given?: string | null };

export function rememberUser(s: Session | null): FaroUser | null {
  if (!s?.user) return null;
  // Pieza 0 (1.3.363): `given` guarda el nombre TAL COMO quedó escrito en la
  // cuenta, sin el repuesto del correo — es lo único que el lector del nombre
  // propio (lib/faro/personname.ts) acepta como nombre elegido. `name` sigue
  // siendo la etiqueta del registro, con su caída al correo de siempre.
  const given = (s.user.user_metadata?.name as string | undefined) || (s.user.user_metadata?.full_name as string | undefined) || null;
  const u: FaroUser = {
    id: s.user.id,
    email: s.user.email ?? "",
    name: given || s.user.email || "",
    given,
  };
  // 1.3.257 (la oferta de huella): este es el único momento en que las huellas del
  // aparato todavía distinguen un registro genuino — después, las marcas de abajo
  // (usuario recordado y marca de dueño) ya son de esta cuenta. La foto se toma
  // ANTES de escribirlas; la decisión y sus claves viven en lib/faro/lockoffer.ts.
  pendOfferIfFirst(browserPackStorage(), { uid: u.id, createdAt: s.user.created_at, rememberedUid: lastUser()?.id ?? null });
  try { box().setItem(LAST, JSON.stringify(u)); } catch { /* ignore */ }
  // 1.3.168 (la puerta): una sesión viva marca el aparato — este aparato guarda un libro de
  // esta cuenta (faro.owner, fuera de la sesión) y levanta la bandera de salida explícita.
  // Es el cimiento de que el libro abra sin red con «Mantener sesión» apagado (door.ts).
  const store = browserPackStorage();
  writeOwnerMark(store, u);
  clearExplicitOut(store);
  return u;
}

/** The last signed-in user on this device. Lets FARO open the local books with no network. */
export function lastUser(): FaroUser | null {
  try {
    const raw = box().getItem(LAST);
    if (!raw) return null;
    const u = JSON.parse(raw) as FaroUser;
    return u && typeof u.id === "string" ? u : null;
  } catch {
    return null;
  }
}

export function forgetUser() {
  // 1.3.180 (el lugar): la salida explícita también termina el lugar — el próximo arranque
  // aterriza por defecto, como la primera vez. El uid sale del registro ANTES de borrarlo
  // (se busca en las dos cajas: «Mantener sesión» decide en cuál vive).
  let goneId: string | null = null;
  for (const b of [localStorage, sessionStorage]) {
    try {
      const u = JSON.parse(b.getItem(LAST) ?? "null") as FaroUser | null;
      if (u && typeof u.id === "string" && u.id) { goneId = u.id; break; }
    } catch { /* ignore */ }
  }
  try { localStorage.removeItem(LAST); sessionStorage.removeItem(LAST); } catch { /* ignore */ }
  // 1.3.168 (la puerta): olvidar al usuario es la salida explícita — la marca de dueño se
  // borra y la bandera de salida queda puesta. La caducidad de la sesión NO pasa por aquí:
  // expirar no es salir, y la puerta no se cierra por caducar.
  const store = browserPackStorage();
  clearOwnerMark(store);
  setExplicitOut(store);
  if (goneId) clearPlace(store, goneId);
}

let listeners: ((u: FaroUser | null) => void)[] = [];
export function onUser(fn: (u: FaroUser | null) => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((f) => f !== fn); };
}
export function emitUser(u: FaroUser | null) {
  listeners.forEach((f) => f(u));
}

/**
 * Eliminar la cuenta para siempre (Oscar, chat de ventanas, 2026-11-11): el cliente
 * NO puede borrar un usuario — solo el servidor. Esta llamada pide a la función
 * faro_delete_account (delete-account.sql, preparada en el repo, pendiente de
 * aplicar en Supabase al portar) que borre las filas del que llama (faro_ledgers,
 * faro_backups) y su usuario de auth. Devuelve true SOLO si el servidor confirmó
 * el borrado: si la función no existe todavía o falla, devuelve false y quien
 * llama NO toca nada local — la cuenta sigue viva y decir lo contrario sería mentir.
 */
export async function deleteAccountForever(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("faro_delete_account");
    return !error;
  } catch { return false; }
}

/**
 * Pieza 0 (1.3.363): guardar el nombre elegido en la CUENTA (user_metadata),
 * nunca en un libro — viaja con la cuenta entre aparatos y renombrarlo no
 * reescribe ninguna firma ya guardada. Devuelve el usuario fresco (ya
 * emitido) o null si la nube no confirmó: sin confirmación no se finge.
 */
export async function saveChosenName(name: string): Promise<FaroUser | null> {
  try {
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    if (error) return null;
    const { data } = await supabase.auth.getSession();
    const u = rememberUser(data.session);
    if (u) emitUser(u);
    return u;
  } catch { return null; }
}

/* ═══ EL LIBRO COMPARTIDO — Pieza C1 (1.3.390): la costura de la
 * membresía. La verdad vive en el servidor (memberships.sql: tabla
 * faro_memberships + RPC); aquí solo se pide y se cree lo que el
 * servidor confirma. Si la pieza SQL aún no se aplicó en Supabase, o no
 * hay red, cada función degrada con gracia (null / false) y ninguna
 * superficie finge que el libro se comparte. Las superficies — la mesa
 * de invitación y la hoja de miembros — son la Pieza C5. ═══ */

export interface Membership {
  id: string;
  bookOwner: string;
  member: string | null;
  email: string;
  scope: { all: true } | { cats: string[] };
  role: "note" | "view";
  status: "pending" | "active";
  transferTo: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

function membershipOf(row: Record<string, unknown>): Membership | null {
  if (typeof row.id !== "string" || typeof row.book_owner !== "string" || typeof row.email !== "string") return null;
  if (row.role !== "note" && row.role !== "view") return null;
  if (row.status !== "pending" && row.status !== "active") return null;
  const scope = (row.scope ?? { all: true }) as { all?: unknown; cats?: unknown };
  return {
    id: row.id,
    bookOwner: row.book_owner,
    member: typeof row.member === "string" ? row.member : null,
    email: row.email,
    scope: Array.isArray(scope.cats) ? { cats: scope.cats.filter((x): x is string => typeof x === "string") } : { all: true },
    role: row.role,
    status: row.status,
    transferTo: typeof row.transfer_to === "string" ? row.transfer_to : null,
    createdAt: String(row.created_at ?? ""),
    expiresAt: String(row.expires_at ?? ""),
    acceptedAt: typeof row.accepted_at === "string" ? row.accepted_at : null,
  };
}

/** Las membresías que me tocan: los libros que comparto y los libros en
 * los que estoy. null = la nube no confirmó (sin pieza SQL, sin red…). */
export async function listMemberships(): Promise<Membership[] | null> {
  try {
    const { data, error } = await supabase.from("faro_memberships").select("*").order("created_at", { ascending: true });
    if (error || !Array.isArray(data)) return null;
    return data.map((r) => membershipOf(r as Record<string, unknown>)).filter((m): m is Membership => m !== null);
  } catch { return null; }
}

/** Invitar al correo de una cuenta. Devuelve el id de la membresía o
 * null si el servidor no lo confirmó (tope, duplicado, sin pieza…). */
export async function inviteMember(email: string, scope: Membership["scope"], role: "note" | "view"): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("faro_invite", { p_email: email.trim(), p_scope: scope, p_role: role });
    return error || typeof data !== "string" ? null : data;
  } catch { return null; }
}

async function membershipCall(fn: string, id: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(fn, { p_id: id });
    return !error && data === true;
  } catch { return false; }
}

/** Aceptar una invitación: solo vale si la sesión ES la cuenta del
 * correo invitado — el enlace no es llave (el servidor lo comprueba). */
export const acceptInvite = (id: string) => membershipCall("faro_accept", id);
export const cancelInvite = (id: string) => membershipCall("faro_cancel_invite", id);
export const leaveMembership = (id: string) => membershipCall("faro_leave", id);
export const removeMember = (id: string) => membershipCall("faro_remove", id);
export const offerTransfer = (id: string) => membershipCall("faro_offer_transfer", id);
export const acceptTransfer = (id: string) => membershipCall("faro_accept_transfer", id);

/**
 * Pieza C2 (1.3.391): leer el libro de un dueño SIENDO su miembro. La
 * única puerta es la función faro_shared_book (shared.sql), que cumple
 * el alcance EN EL SERVIDOR y devuelve una copia ya filtrada: fuera de
 * alcance no llega nada, ni las categorías ni las tiendas. Devuelve el
 * JSON crudo (unknown): cargarlo con desconfianza es trabajo de la
 * Pieza C3/C7, cuando el libro compartido se abra en la app. null = sin
 * acceso, sin pieza aplicada o sin red — indistinguibles a propósito.
 */
export async function fetchSharedBook(ownerId: string): Promise<unknown | null> {
  try {
    const { data, error } = await supabase.rpc("faro_shared_book", { p_owner: ownerId });
    if (error || typeof data !== "string") return null;
    return JSON.parse(data) as unknown;
  } catch { return null; }
}

/**
 * Pieza C3 (1.3.392): empujar MI copia del libro compartido siendo
 * miembro que anota. El servidor empalma (shared-push.sql): lo fuera
 * de mi alcance queda intacto, lo mío se reemplaza, mis lápidas
 * borran. Si la revisión ya se movió, won=false y el libro que vuelve
 * es mi copia fresca de lo que hay — fusiono (fuse.ts) y reintento.
 * null = sin pieza, sin red o sin membresía: nada se fingió guardado.
 */
export async function pushSharedBook(ownerId: string, book: unknown, baseRevision: number): Promise<{ won: boolean; revision: number; book: unknown } | null> {
  try {
    const { data, error } = await supabase.rpc("faro_shared_push", {
      p_owner: ownerId,
      p_data: JSON.stringify(book),
      p_base_revision: baseRevision,
    });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as Record<string, unknown>;
    if (typeof row.data_json !== "string" || typeof row.won !== "boolean") return null;
    return {
      won: row.won,
      revision: typeof row.revision === "number" ? row.revision : baseRevision,
      book: JSON.parse(row.data_json) as unknown,
    };
  } catch { return null; }
}

export async function signOutEverywhereLocal() {
  try { await supabase.auth.signOut({ scope: "local" }); } catch { /* offline: still clear locally */ }
  try { localStorage.removeItem("faro-auth"); sessionStorage.removeItem("faro-auth"); } catch { /* ignore */ }
  forgetUser();
  emitUser(null);
}

/** Kept signed in but the cloud session ended (password changed, token revoked…): Faro stays open with
 *  the books on this device; Ajustes offers "Entrar de nuevo" to resume syncing. */
let gone = false;
export function sessionGone() { return gone; }
export function setSessionGone(v: boolean) {
  if (gone === v) return;
  gone = v;
  try { window.dispatchEvent(new Event("faro-session")); } catch { /* ignore */ }
}
export function askSignInAgain() {
  try { window.dispatchEvent(new Event("faro-relogin")); } catch { /* ignore */ }
}
