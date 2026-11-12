import { createClient, type Session } from "@supabase/supabase-js";
import { CLOUD_READY, SUPABASE_KEY, SUPABASE_URL } from "./config";
import { clearExplicitOut, clearOwnerMark, setExplicitOut, writeOwnerMark } from "@/lib/faro/door";
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

export type FaroUser = { id: string; email: string; name: string };

export function rememberUser(s: Session | null): FaroUser | null {
  if (!s?.user) return null;
  const u: FaroUser = {
    id: s.user.id,
    email: s.user.email ?? "",
    name: (s.user.user_metadata?.name as string | undefined) || (s.user.user_metadata?.full_name as string | undefined) || s.user.email || "",
  };
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
