/**
 * Faro for Android (1.3.111): the WebView app (package com.oscarvelz.faro, source in android/) puts `window.FaroNative`
 * on the page. Everything in this file is feature-detected: in a browser or the installed PWA there is no FaroNative,
 * startNative() returns at once and nothing here runs, so the web app behaves exactly as before.
 *
 * What the bridge does inside the app:
 * - Back: the phone's Back asks FaroBack(); Faro's own history (each layer owns its entry) handles it exactly as in
 *   Chrome. At the root, the WEB exit confirm rules (1.3.164): FaroBack's no-step case and the provider's root branch both
 *   end at the provider's «¿Salir de Faro?» dialog, whose Salir calls the bridge's exitNow() (older shells: atRoot()'s
 *   press-again). Only with no screen mounted (sign-in, lock, boot) does atRoot() still show "Pulsa atrás otra vez para salir".
 * - Status/navigation bar colours follow the theme (the same colour statusbar.ts writes to meta theme-color).
 * - Downloads (Excel, PDF, backup JSON): a blob link is handed to the app and saved in Downloads/Faro.
 * - Fingerprint: WebAuthn does not work in a plain WebView, so lock.ts asks the phone's BiometricPrompt through
 *   nativeAuth() (fingerprint, face, or the phone's PIN/pattern/password as fallback).
 * - Shared screenshots (Phase 2): pictures shared to Faro from another app wait in the app until the page takes them.
 */

export type FaroNativeBridge = {
  version(): string;
  setBars(top: string, bottom: string, darkTop: boolean, darkBottom: boolean): void;
  atRoot(msg: string): void;
  /** 1.3.164: the exit confirm's Salir — the shell finishes at once. Absent on shells before it. */
  exitNow?(): void;
  canAuth(): string;
  authenticate(id: string, title: string, subtitle: string): void;
  saveBegin(name: string, mime: string): string;
  saveChunk(id: string, b64: string): string;
  saveEnd(id: string, msgTemplate: string): string;
  sharedCount?(): number;
  sharedInfo?(i: number): string;
  sharedChunk?(i: number, offset: number, length: number): string;
  sharedClear?(): void;
  /** 1.3.121 home-screen widgets: the snapshot (lib/faro/widget.ts) as JSON ("" clears it); the target of a widget tap. */
  setWidgetData?(json: string): void;
  takeOpen?(): string;
  /** 1.3.148: the Ajustes → Avisos row — the phone's real notification-permission state, and re-asking for it. */
  notifyState?(): string;
  requestNotify?(): void;
  /** 1.3.150: the Ajustes → battery card — whether the phone exempts Faro from battery optimisation, and asking for it. */
  battExempt?(): string;
  battAsk?(): string;
  /** 1.3.165: «Agregar personas» — opens the system contact picker (no READ_CONTACTS in the shell);
   *  the picked names wait in the shell's tray until takeContacts() pulls them (JSON array, once). */
  pickContacts?(): void;
  takeContacts?(): string;
};

type W = Window & { FaroNative?: FaroNativeBridge; FaroBack?: () => string; __faroProviderLive?: number; __faroNativeOn?: boolean };

export function native(): FaroNativeBridge | null {
  if (typeof window === "undefined") return null;
  const n = (window as W).FaroNative;
  return n && typeof n.version === "function" ? n : null;
}

export const inAndroidApp = (): boolean => native() !== null;

/** An Android phone or tablet browsing Faro in Chrome (or the installed PWA), not inside the Faro app. */
export function androidBrowser(): boolean {
  if (typeof navigator === "undefined" || inAndroidApp()) return false;
  return /Android/i.test(navigator.userAgent) && !/FaroAndroid\//.test(navigator.userAgent);
}

export const APK_URL = "https://github.com/Oscarvelz/Faro/releases/latest/download/Faro.apk";

const en = () => typeof document !== "undefined" && document.documentElement.lang === "en";

/* ---------- fingerprint ---------- */

export function nativeCanAuth(): boolean {
  const n = native();
  try { return !!n && n.canAuth() === "yes"; } catch { return false; }
}

/** Asks the phone's own biometric prompt (fingerprint/face, with the phone's PIN as fallback). Resolves false on cancel. */
export function nativeAuth(): Promise<boolean> {
  const n = native();
  if (!n) return Promise.resolve(false);
  const id = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; ok: boolean }>).detail;
      if (!d || d.id !== id) return;
      window.removeEventListener("faronative-auth", on);
      resolve(!!d.ok);
    };
    window.addEventListener("faronative-auth", on);
    try {
      n.authenticate(id, en() ? "Unlock Faro" : "Desbloquear Faro", en() ? "Use your fingerprint or your screen lock" : "Usa tu huella o el bloqueo de pantalla");
    } catch {
      window.removeEventListener("faronative-auth", on);
      resolve(false);
    }
  });
}

/* ---------- battery ---------- */

/**
 * 1.3.150: is Faro exempt from the phone's battery optimisation? `true`/`false` are the phone's real
 * state; `null` means no shell answer exists (a browser, or a shell older than this one) — the battery
 * card says so instead of guessing.
 */
export function nativeBattExempt(): boolean | null {
  const n = native();
  if (!n?.battExempt) return null;
  try { return n.battExempt() === "true"; } catch { return null; }
}

/**
 * Asks the phone for the exemption (the shell walks its three doors: the direct dialog, the battery
 * list, the app's system page). Resolves with the state the shell reports after the ask; the card
 * re-reads nativeBattExempt() when the user returns, so a grant given in the dialog always lands.
 */
export function nativeBattAsk(): boolean | null {
  const n = native();
  if (!n?.battAsk) return null;
  try { return n.battAsk() === "true"; } catch { return null; }
}

/* ---------- contacts ---------- */

/**
 * 1.3.165: «Agregar personas» inside the shell. The web Contact Picker API does not exist in the
 * WebView, so people.tsx used to fall through to a .vcf file hunt; the bridge opens the phone's
 * own contact picker instead (the shell declares no READ_CONTACTS — only the contacts the user
 * picks are read, through their URIs). Resolves with the picked names, or null when the picker
 * was cancelled. Returns null (not a promise) when there is no shell or the shell predates the
 * method, so the caller keeps its old order: web API in Chrome, .vcf file last.
 */
export function nativePickContacts(): Promise<string[] | null> | null {
  const n = native();
  if (!n?.pickContacts || !n?.takeContacts) return null;
  return new Promise((resolve) => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ count?: number }>).detail;
      window.removeEventListener("faronative-contacts", on);
      if (!d || typeof d.count !== "number" || d.count < 0) { resolve(null); return; }
      try {
        const raw = n.takeContacts!();
        const arr: unknown = raw ? JSON.parse(raw) : [];
        resolve(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim()) : []);
      } catch { resolve([]); }
    };
    window.addEventListener("faronative-contacts", on);
    try { n.pickContacts!(); } catch {
      window.removeEventListener("faronative-contacts", on);
      resolve(null);
    }
  });
}

/* ---------- back ---------- */

function installBack(n: FaroNativeBridge) {
  const w = window as W;
  const root = () => {
    // 1.3.164: with the app mounted, a root Back is answered by the WEB exit confirm (the
    // provider's «¿Salir de Faro?»), in the shell exactly as in the browser — this event is its
    // door. The shell's press-again toast now serves only the screens with no Faro history of
    // their own (sign-in, lock, boot), where Back still means leave at once. (The provider used
    // to announce its root branch with a "faro-back-at-root" event; it opens the confirm itself
    // now, so that announcement is gone.)
    if (w.__faroProviderLive) { window.dispatchEvent(new Event("faro-root-back")); return; }
    try { n.atRoot(en() ? "Press back again to close Faro" : "Pulsa atrás otra vez para salir"); } catch { /* ignore */ }
  };
  // Count every completed history step. Faro's layers stop popstate from reaching later listeners, so the count also
  // listens to the Navigation API (currententrychange fires for every traversal, whoever handles the popstate).
  let steps = 0;
  const step = () => { steps++; };
  window.addEventListener("popstate", step, true);
  const nav = (window as Window & { navigation?: EventTarget }).navigation;
  nav?.addEventListener?.("currententrychange", step);
  w.FaroBack = () => {
    // Sign-in, lock and boot screens have no Faro history of their own: Back there means leave.
    if (!w.__faroProviderLive) { root(); return "root"; }
    const before = steps;
    history.back();
    // At the very first history entry there is nothing to go back to and nothing moves: that is the root too.
    window.setTimeout(() => { if (steps === before) root(); }, 400);
    return "ok";
  };
}

/* ---------- system bar colours ---------- */

function rgb(c: string): [number, number, number] | null {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0] | 0, p[1] | 0, p[2] | 0]; }
  const h = c.trim().match(/^#([0-9a-f]{6})$/i);
  return h ? [parseInt(h[1].slice(0, 2), 16), parseInt(h[1].slice(2, 4), 16), parseInt(h[1].slice(4, 6), 16)] : null;
}
const isDark = (v: [number, number, number]) => 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] < 140;

function bottomColor(): string | null {
  let el = document.elementFromPoint(Math.round(innerWidth / 2), innerHeight - 2) as HTMLElement | null;
  while (el) {
    if (el.getBoundingClientRect().width >= innerWidth * 0.92) {
      const cs = getComputedStyle(el);
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if ((p.length > 3 ? p[3] : 1) >= 0.5) return `rgb(${p[0] | 0}, ${p[1] | 0}, ${p[2] | 0})`; }
    }
    el = el.parentElement;
  }
  return null;
}

function installBars(n: FaroNativeBridge) {
  let last = "";
  let queued = 0;
  const apply = () => {
    queued = 0;
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const top = meta?.content || "#0E1114";
    const bottom = bottomColor() || top;
    const t = rgb(top), b = rgb(bottom);
    if (!t || !b) return;
    const key = `${top}|${bottom}`;
    if (key === last) return;
    last = key;
    try { n.setBars(`rgb(${t.join(",")})`, `rgb(${b.join(",")})`, isDark(t), isDark(b)); } catch { /* ignore */ }
  };
  const soon = () => { if (!queued) queued = window.setTimeout(apply, 160); };
  // 1.3.159: a theme flip (data-theme swap or the meta colour written at the flip neck) drives
  // the shell bars NOW, in the flip's own frame; the debounce remains for scroll/resize sampling.
  new MutationObserver((recs) => {
    if (recs.some((r) => r.attributeName === "data-theme" || r.attributeName === "content")) { if (queued) { clearTimeout(queued); queued = 0; } apply(); }
    else soon();
  }).observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ["content", "data-theme", "class", "style"] });
  addEventListener("scroll", soon, { passive: true });
  addEventListener("resize", soon);
  document.addEventListener("visibilitychange", soon);
  soon();
}

/* ---------- downloads ---------- */

function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function saveBlob(n: FaroNativeBridge, name: string, blob: Blob) {
  const id = n.saveBegin(name || "Faro", blob.type || "application/octet-stream");
  if (!id || id.startsWith("error")) return;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CH = 512 * 1024;
  for (let i = 0; i < bytes.length; i += CH) {
    const r = n.saveChunk(id, b64(bytes.subarray(i, i + CH)));
    if (r !== "ok") return;
  }
  n.saveEnd(id, en() ? "Saved in Downloads › Faro: %s" : "Guardado en Descargas › Faro: %s");
}

function installDownloads(n: FaroNativeBridge) {
  // Faro revokes its blob URL right after a.click(); keep the Blob itself so the app can still read it.
  const blobs = new Map<string, Blob>();
  const make = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const u = make(obj);
    if (obj instanceof Blob) blobs.set(u, obj);
    return u;
  };
  URL.revokeObjectURL = (u: string) => {
    window.setTimeout(() => { blobs.delete(u); revoke(u); }, 60_000);
  };
  const take = (a: HTMLAnchorElement): boolean => {
    if (!a.hasAttribute("download")) return false;
    const href = a.href || "";
    const name = a.getAttribute("download") || "Faro";
    if (href.startsWith("blob:")) {
      const blob = blobs.get(href);
      if (blob) { void saveBlob(n, name, blob); return true; }
      void fetch(href).then((r) => r.blob()).then((b) => saveBlob(n, name, b)).catch(() => undefined);
      return true;
    }
    if (href.startsWith("data:")) {
      void fetch(href).then((r) => r.blob()).then((b) => saveBlob(n, name, b)).catch(() => undefined);
      return true;
    }
    return false;
  };
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (take(this)) return;
    click.call(this);
  };
  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.("a[download]") as HTMLAnchorElement | null;
    if (a && take(a)) e.preventDefault();
  }, true);
}

/* ---------- start ---------- */

export function startNative() {
  const n = native();
  const w = typeof window !== "undefined" ? (window as W) : null;
  if (!n || !w || w.__faroNativeOn) return;
  w.__faroNativeOn = true;
  document.documentElement.dataset.android = "";
  installBack(n);
  installBars(n);
  installDownloads(n);
}
