import { useState } from "react";
import { Mark } from "@/components/faro/icons";
import type { Lang } from "@/lib/faro/types";
import { emitUser, rememberUser, supabase } from "./cloud";
import { currentLang, w } from "./words";

export function Login({ note, recovery }: { note?: string; recovery?: boolean }) {
  const [lang, setLang] = useState<Lang>(currentLang());
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset">(recovery ? "reset" : "in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(note ?? "");
  const [busy, setBusy] = useState(false);
  const t = (k: string) => w(k, lang);
  const here = window.location.origin + window.location.pathname;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!navigator.onLine) { setError(t("login.offline")); return; }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: here });
        if (error) throw error;
        setInfo(t("login.sent"));
        setMode("in");
        return;
      }
      if (mode === "reset") {
        const { data, error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        window.history.replaceState(null, "", here);
        const { data: s } = await supabase.auth.getSession();
        emitUser(rememberUser(s.session) ?? null);
        void data;
        return;
      }
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: name || email }, emailRedirectTo: here } });
        if (error) throw error;
        if (!data.session) { setInfo(t("login.check")); setMode("in"); return; }
        emitUser(rememberUser(data.session));
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      emitUser(rememberUser(data.session));
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(m && !/fetch/i.test(m) ? m : t("login.fail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="splash">
      <div className="splash-beam" aria-hidden />
      <header className="brand-lockup">
        <Mark className="size-16" />
        <h1 className="text-6xl">Faro</h1>
        <p className="tagline">{t("app.tagline")}</p>
      </header>
      <section className="splash-card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="serif text-3xl">{mode === "reset" ? t("login.newpass") : t("login.title")}</h2>
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
        {mode !== "reset" ? <p className="text-sm text-muted">{t("login.lead")}</p> : null}
        <form className="grid gap-3" onSubmit={(e) => void submit(e)}>
          {mode === "up" ? (
            <label className="label">
              {t("login.name")}
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
          ) : null}
          {mode !== "reset" ? (
            <label className="label">
              {t("login.email")}
              <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
          ) : null}
          {mode !== "forgot" ? (
            <label className="label">
              {mode === "reset" ? t("login.newpass") : t("login.password")}
              <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
            </label>
          ) : null}
          {mode === "up" || mode === "reset" ? <p className="text-sm text-muted">{t("login.hint")}</p> : null}
          {info ? <p className="text-sm">{info}</p> : null}
          {error ? <p className="text-sm text-bad">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>
            {mode === "up" ? t("login.signup") : mode === "forgot" ? t("login.forgot") : mode === "reset" ? t("login.save") : t("login.signin")}
          </button>
        </form>
        {mode !== "reset" ? (
          <>
            <button type="button" className="btn ghost" onClick={() => { setError(""); setMode(mode === "up" ? "in" : "up"); }}>
              {mode === "up" ? t("login.have") : t("login.new")}
            </button>
            {mode === "in" ? (
              <button type="button" className="btn ghost" onClick={() => { setError(""); setMode("forgot"); }}>{t("login.forgot")}</button>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
