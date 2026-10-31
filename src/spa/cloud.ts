import { createClient, type Session } from "@supabase/supabase-js";
import { CLOUD_READY, SUPABASE_KEY, SUPABASE_URL } from "./config";
export { CLOUD_READY };

export const supabase = createClient(CLOUD_READY ? SUPABASE_URL : "https://placeholder.supabase.co", CLOUD_READY ? SUPABASE_KEY : "placeholder", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "faro-auth" },
});

export type FaroUser = { id: string; email: string; name: string };
const LAST = "faro.lastUser";

export function rememberUser(s: Session | null): FaroUser | null {
  if (!s?.user) return null;
  const u: FaroUser = {
    id: s.user.id,
    email: s.user.email ?? "",
    name: (s.user.user_metadata?.name as string | undefined) || (s.user.user_metadata?.full_name as string | undefined) || s.user.email || "",
  };
  try { localStorage.setItem(LAST, JSON.stringify(u)); } catch { /* ignore */ }
  return u;
}

/** The last signed-in user on this device. Lets FARO open the local books with no network. */
export function lastUser(): FaroUser | null {
  try {
    const raw = localStorage.getItem(LAST);
    if (!raw) return null;
    const u = JSON.parse(raw) as FaroUser;
    return u && typeof u.id === "string" ? u : null;
  } catch {
    return null;
  }
}

export function forgetUser() {
  try { localStorage.removeItem(LAST); } catch { /* ignore */ }
}

let listeners: ((u: FaroUser | null) => void)[] = [];
export function onUser(fn: (u: FaroUser | null) => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((f) => f !== fn); };
}
export function emitUser(u: FaroUser | null) {
  listeners.forEach((f) => f(u));
}

export async function signOutEverywhereLocal() {
  try { await supabase.auth.signOut({ scope: "local" }); } catch { /* offline: still clear locally */ }
  try { localStorage.removeItem("faro-auth"); } catch { /* ignore */ }
  forgetUser();
  emitUser(null);
}
