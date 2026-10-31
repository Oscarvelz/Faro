import { useState } from "react";
import { Check, Eye, EyeOff, Info, Lock, Mail, User, X } from "lucide-react";
import { Mark } from "@/components/faro/icons";
import type { Lang } from "@/lib/faro/types";
import { emitUser, rememberUser, supabase } from "./cloud";
import { currentLang, w } from "./words";
import "./gate.css";

export function Login({ note, recovery }: { note?: string; recovery?: boolean }) {
  const [lang, setLang] = useState<Lang>(currentLang());
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset">(recovery ? "reset" : "in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [tip, setTip] = useState(false);
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
    if ((mode === "up" || mode === "reset") && password !== confirm) { setError(t("login.mismatch")); return; }
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

  const making = mode === "up" || mode === "reset";
  const score = strength(password);
  const matches = confirm.length > 0 && confirm === password;
  const swap = (next: "in" | "up") => { setError(""); setInfo(""); setConfirm(""); setTip(false); setMode(next); };
  return (
    <main className="gate">
      <div className="gate-sky" aria-hidden>
        <i className="gate-stars" />
        <i className="gate-stars is-far" />
        <i className="gate-beam" />
        <svg className="gate-sea" viewBox="0 0 400 80" preserveAspectRatio="none">
          <path className="wave-a" d="M0 34 Q50 24 100 34 T200 34 T300 34 T400 34 V80 H0Z" />
          <path className="wave-b" d="M0 48 Q50 40 100 48 T200 48 T300 48 T400 48 V80 H0Z" />
        </svg>
      </div>
      <button
        type="button"
        className="gate-lang"
        onClick={() => {
          const next = lang === "es" ? "en" : "es";
          setLang(next);
          localStorage.setItem("faro-lang", next);
          document.documentElement.lang = next;
        }}
      >
        <span aria-current={lang === "es"}>ES</span>
        <span aria-current={lang === "en"}>EN</span>
      </button>
      <header className="gate-brand">
        <span className="gate-lamp"><Mark className="size-10" /></span>
        <h1 className="serif">Faro</h1>
        <p>{t("app.tagline")}</p>
      </header>
      <section className="gate-card">
        {mode === "in" || mode === "up" ? (
          <div className="gate-switch" data-on={mode} role="tablist">
            <i aria-hidden />
            <button type="button" role="tab" aria-selected={mode === "in"} onClick={() => swap("in")}>{t("login.signin")}</button>
            <button type="button" role="tab" aria-selected={mode === "up"} onClick={() => swap("up")}>{t("login.signup")}</button>
          </div>
        ) : (
          <h2 className="serif gate-title">{mode === "reset" ? t("login.newpass") : t("login.forgot")}</h2>
        )}
        <p className="gate-lead">{mode === "up" ? t("login.leadUp") : mode === "forgot" ? t("login.leadForgot") : mode === "reset" ? t("login.leadReset") : t("login.leadIn")}</p>
        <form className="gate-form" onSubmit={(e) => void submit(e)} noValidate={false}>
          {mode === "up" ? (
            <label className="gate-field">
              <User aria-hidden />
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder=" " />
              <span>{t("login.name")}</span>
            </label>
          ) : null}
          {mode !== "reset" ? (
            <label className="gate-field">
              <Mail aria-hidden />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder=" " />
              <span>{t("login.email")}</span>
            </label>
          ) : null}
          {mode !== "forgot" ? (
            <div className="gate-pass">
              <label className="gate-field">
                <Lock aria-hidden />
                <input type={show ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder=" " />
                <span>{mode === "reset" ? t("login.newpass") : t("login.password")}</span>
                <button type="button" className="gate-eye" aria-label={show ? t("login.hide") : t("login.show")} onClick={() => setShow((on) => !on)}>{show ? <EyeOff /> : <Eye />}</button>
              </label>
              <button type="button" className={`gate-info${tip ? " is-on" : ""}`} aria-expanded={tip} aria-label={t("login.about")} onClick={() => setTip((on) => !on)}><Info /></button>
            </div>
          ) : null}
          {tip && mode !== "forgot" ? (
            <div className="gate-tip" role="note">
              <button type="button" aria-label="OK" onClick={() => setTip(false)}><X /></button>
              <p><b>{t("login.tip.title")}</b></p>
              <p>{making ? t("login.tip.make") : t("login.tip.in")}</p>
              <p>{t("login.tip.safe")}</p>
            </div>
          ) : null}
          {making ? (
            <>
              <div className={`gate-meter s${score}`} aria-hidden={!password}>
                <i /><i /><i /><i />
                <span>{password ? t(`login.str${score}`) : t("login.hint")}</span>
              </div>
              <label className={`gate-field${confirm && !matches ? " is-bad" : ""}${matches ? " is-good" : ""}`}>
                <Lock aria-hidden />
                <input type={show ? "text" : "password"} required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder=" " />
                <span>{t("login.confirm")}</span>
                {matches ? <Check className="gate-ok" aria-label={t("login.match")} /> : null}
              </label>
              {confirm && !matches ? <p className="gate-note is-bad">{t("login.mismatch")}</p> : null}
            </>
          ) : null}
          {info ? <p className="gate-note">{info}</p> : null}
          {error ? <p className="gate-note is-bad">{error}</p> : null}
          <button className="gate-go" type="submit" disabled={busy || (making && (!matches || password.length < 8))}>
            <span>{busy ? "…" : mode === "up" ? t("login.signup") : mode === "forgot" ? t("login.send") : mode === "reset" ? t("login.save") : t("login.signin")}</span>
          </button>
        </form>
        {mode === "in" ? <button type="button" className="gate-link" onClick={() => { setError(""); setMode("forgot"); }}>{t("login.forgot")}</button> : null}
        {mode === "forgot" ? <button type="button" className="gate-link" onClick={() => swap("in")}>{t("login.back")}</button> : null}
      </section>
      {mode !== "up" ? <p className="gate-foot">{t("login.lead")}</p> : null}
    </main>
  );
}

function strength(value: string): 0 | 1 | 2 | 3 {
  if (value.length < 8) return 0;
  let kinds = 0;
  if (/[a-záéíóúñ]/.test(value)) kinds += 1;
  if (/[A-ZÁÉÍÓÚÑ]/.test(value)) kinds += 1;
  if (/\d/.test(value)) kinds += 1;
  if (/[^\wáéíóúñÁÉÍÓÚÑ]/.test(value)) kinds += 1;
  if (value.length >= 14 && kinds >= 2) return 3;
  if (value.length >= 10 && kinds >= 3) return 3;
  if (kinds >= 3 || value.length >= 12) return 2;
  return 1;
}
