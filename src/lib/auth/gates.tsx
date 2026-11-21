import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { authClient, GROK_PROVIDERS, authEnabled, signIn, signOut } from "./client";
import { chosenNameOf } from "@/lib/faro/personname";
import { hasGateSessionMarker } from "./gate-session-marker";
import { resolveSignInGateState } from "./sign-in-gate";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";
import { translate } from "@/lib/faro/i18n";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

/**
 * Auth state components — plain wrappers around `useCurrentUserState()`.
 *
 * With auth on, visitors are signed out until they authenticate — in the sandbox
 * live preview too, which does real sign-in. The shared dev user appears only
 * when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
 * While the session is still resolving, gates that care about signed-out state
 * render nothing so there's no signed-out flash on hard reload.
 */

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present (real session, or the disabled-auth dev user). */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/**
 * Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
 * `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
 * session loading, which feels like a second "Loading…" on /login.
 *
 * Guard routes by waiting out `isPending` first (see `use-current-user`), then
 * render this.
 */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

export function SignInGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  const state = resolveSignInGateState({ isPending, hasUser: user !== null });
  if (state === "pending") return null;
  if (state === "signed_in") return <>{children}</>;
  return <>{fallback ?? <SignInButtons />}</>;
}

export function SignInButtons() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {GROK_PROVIDERS.map((p) => (
        <button
          key={p.providerId}
          type="button"
          onClick={() => signIn(p.providerId, { callbackURL: "/" })}
          className="w-full cursor-pointer rounded-md border border-neutral-300 px-4 py-2 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Continue with {p.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Minimal signed-in identity chip + sign-out. Restyle freely (see the
 * `design-ui` skill). Sign-out is only shown when auth is enabled (the
 * disabled-auth dev user has nothing to sign out of) and the session is not
 * gate-materialized — behind the gate the next request signs the viewer
 * straight back in, so a sign-out control there is a broken loop.
 */
export function UserButton() {
  const user = useCurrentUser();
  // Sign-out can take a moment (and can fail when deployed), so the control
  // shows it is working and cannot be fired twice.
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-sm font-medium">{label}</span>
      {authEnabled && !gateSession && (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            // Success navigates away; on failure re-enable so it can be retried.
            void signOut().catch(() => setSigningOut(false));
          }}
          className="cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      )}
    </div>
  );
}

/**
 * Twin of the SPA gates' AccountLocalNote (1.3.171, censo R3): the Cuenta fold's honest body
 * when there is no account — the dev fallback (auth disabled = local mode) or signed out.
 * Renders nothing while the session resolves, and nothing with a real account.
 */
export function AccountLocalNote() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  if (user && !user.isDevFallback) return null;
  let lang: "es" | "en" = "es";
  try { lang = localStorage.getItem("faro-lang") === "en" ? "en" : "es"; } catch { /* keep es */ }
  return <p className="text-sm text-muted">{translate(lang, "account.local")}</p>;
}

/**
 * Pieza 0 (1.3.363) — twin of the SPA gates' NameRow (censo R3): la fila
 * «Cómo te nombra Faro» del pliegue Cuenta en el mundo de rutas. El nombre
 * elegido es el `name` de la cuenta cuando no es el repuesto del correo
 * (la misma doctrina del lector, lib/faro/personname.ts); guardar lo
 * escribe en la cuenta con updateUser, nunca en un libro.
 */
export function NameRow() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (isPending || !user || user.isDevFallback) return null;
  let lang: "es" | "en" = "es";
  try { lang = localStorage.getItem("faro-lang") === "en" ? "en" : "es"; } catch { /* keep es */ }
  const t = (k: string) => translate(lang, k);
  const name = chosenNameOf({ name: user.displayName, email: user.primaryEmail });
  const save = async (value: string) => {
    setBusy(true);
    setMsg("");
    try {
      const { error } = await authClient.updateUser({ name: value.trim() });
      if (error) throw error;
      setOpen(false);
    } catch {
      setMsg(t("name.failed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-1" data-anchor="aj-name">
      <span className="text-sm font-medium lab-head">{t("name.row")}</span>
      {open ? (
        <div className="grid gap-2">
          <input
            className="field"
            value={draft}
            maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={name ?? ""}
            aria-label={t("name.row")}
          />
          <span className="text-sm text-muted">{t("name.note")}</span>
          <div className="flex gap-2">
            <button type="button" className="btn" disabled={busy} onClick={() => void save(draft)}>{t("name.save")}</button>
            {name ? (
              <button type="button" className="btn secondary" disabled={busy} onClick={() => void save("")}>{t("name.remove")}</button>
            ) : null}
            <button type="button" className="btn secondary" disabled={busy} onClick={() => setOpen(false)}>{t("name.cancel")}</button>
          </div>
          {msg ? <span className="text-sm text-bad">{msg}</span> : null}
        </div>
      ) : (
        <button
          type="button"
          className="btn secondary"
          onClick={() => { setDraft(name ?? ""); setMsg(""); setOpen(true); }}
        >
          {name ?? t("name.none")}
        </button>
      )}
    </div>
  );
}
