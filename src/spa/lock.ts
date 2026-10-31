// Fingerprint / face unlock using the phone's own biometrics (WebAuthn platform authenticator).
// Works offline: the check happens on the device, nothing is sent anywhere.
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
