import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mark } from "@/components/faro/icons";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { translate } from "@/lib/faro/i18n";
import type { Lang } from "@/lib/faro/types";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("faro-lang");
    if (stored === "en" || stored === "es") setLang(stored);
  }, []);
  const t = (key: string) => translate(lang, key);
  if (!mounted || isPending) {
    return (
      <main className="splash">
        <div className="splash-beam" aria-hidden />
        <h1 className="serif text-5xl">FARO</h1>
      </main>
    );
  }
  if (user) return <Navigate to="/" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = mode === "up"
        ? await authClient.signUp.email({ email, password, name: name || email })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || t("login.fail"));
        setBusy(false);
        return;
      }
      const token = result.data && "token" in result.data ? result.data.token : undefined;
      if (typeof token === "string" && token) sessionStorage.setItem("grok-auth.bearer-token", token);
      await authClient.getSession();
      window.location.href = "/";
    } catch {
      setError(t("login.fail"));
      setBusy(false);
    }
  }

  return (
    <main className="splash">
      <div className="splash-beam" aria-hidden />
      <header className="brand-lockup">
        <Mark className="size-16" />
        <h1 className="text-6xl">FARO</h1>
        <p className="tagline">{t("app.tagline")}</p>
      </header>
      <section className="splash-card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="serif text-3xl">{t("login.title")}</h2>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              const next = lang === "es" ? "en" : "es";
              setLang(next);
              localStorage.setItem("faro-lang", next);
              document.documentElement.lang = next;
            }}
          >
            {lang === "es" ? "EN" : "ES"}
          </button>
        </div>
        <p className="text-sm text-muted">{t("login.lead")}</p>
        <form className="grid gap-3" onSubmit={(e) => void submit(e)}>
          {mode === "up" ? (
            <label className="label">
              {t("login.name")}
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
          ) : null}
          <label className="label">
            {t("login.email")}
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="label">
            {t("login.password")}
            <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} />
          </label>
          <p className="text-sm text-muted">{t("login.hint")}</p>
          {error ? <p className="text-sm text-bad">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>{mode === "up" ? t("login.signup") : t("login.signin")}</button>
        </form>
        <button type="button" className="btn ghost" onClick={() => setMode(mode === "up" ? "in" : "up")}>
          {mode === "up" ? t("login.have") : t("login.new")}
        </button>
        <p className="text-center text-sm text-muted">{t("login.or")}</p>
        <div className="grid gap-2">
          {GROK_PROVIDERS.map((p) => (
            <button key={p.providerId} type="button" className="btn secondary" onClick={() => void signIn(p.providerId, { callbackURL: "/" })}>
              {t("login.with")} {p.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
