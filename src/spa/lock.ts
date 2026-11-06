// Fingerprint / face unlock using the phone's own biometrics (WebAuthn platform authenticator).
// Works offline: the check happens on the device, nothing is sent anywhere.
// Inside the Faro Android app (1.3.111) WebAuthn is not available in the WebView, so the same lock asks the phone's
// BiometricPrompt through window.FaroNative instead (fingerprint/face, or the phone's PIN/pattern/password). The browser
// and the installed PWA keep the WebAuthn path below unchanged.
import { inAndroidApp, nativeAuth, nativeCanAuth } from "./native";
const NATIVE = "native";
const KEY = (uid: string) => `faro.lock.${uid}`;

function b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function rand(n: number) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export async function lockSupported(): Promise<boolean> {
  if (inAndroidApp()) return nativeCanAuth();
  try {
    if (!window.PublicKeyCredential || !window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function lockCredential(uid: string): string | null {
  try { return localStorage.getItem(KEY(uid)); } catch { return null; }
}

export async function enableLock(uid: string, email: string): Promise<boolean> {
  if (inAndroidApp()) {
    if (!(await nativeAuth())) return false;
    localStorage.setItem(KEY(uid), NATIVE);
    return true;
  }
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: rand(32),
      rp: { name: "Faro" },
      user: { id: new TextEncoder().encode(uid.slice(0, 64)), name: email || "Faro", displayName: email || "Faro" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) return false;
  localStorage.setItem(KEY(uid), b64(cred.rawId));
  return true;
}

export function disableLock(uid: string) {
  try { localStorage.removeItem(KEY(uid)); } catch { /* ignore */ }
}

export async function unlock(uid: string): Promise<boolean> {
  const id = lockCredential(uid);
  if (!id) return true;
  // In the app any lock (even one carried over) is confirmed by the phone itself; a browser never sees "native".
  if (inAndroidApp()) return nativeAuth();
  if (id === NATIVE) return false;
  const got = await navigator.credentials.get({
    publicKey: {
      challenge: rand(32),
      allowCredentials: [{ type: "public-key", id: unb64(id), transports: ["internal"] }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return Boolean(got);
}
