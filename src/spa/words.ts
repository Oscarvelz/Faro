import { translate } from "@/lib/faro/i18n";
import type { Lang } from "@/lib/faro/types";

const es: Record<string, string> = {
  "lock.title": "Faro está bloqueado",
  "lock.open": "Desbloquear con huella",
  "lock.again": "Intentar de nuevo",
  "lock.out": "Cerrar sesión",
  "lock.on": "Desbloqueo con huella",
  "lock.onHint": "Pide tu huella o tu cara al abrir Faro en este dispositivo. Funciona sin internet.",
  "lock.enable": "Activar huella",
  "lock.disable": "Quitar huella",
  "lock.none": "Este dispositivo no tiene huella o bloqueo de pantalla disponible para Faro.",
  "lock.failed": "No se pudo confirmar. Intenta de nuevo.",
  "acct.out": "Cerrar sesión",
  "acct.outWarn": "Al cerrar sesión se borra la copia de este dispositivo. Lo que no se haya sincronizado se perderá.",
  "acct.offline": "Sin conexión: usando la copia de este dispositivo.",
  "acct.relogin": "Tu sesión venció. Entra de nuevo para sincronizar; tus datos siguen en este dispositivo.",
  "login.forgot": "Olvidé mi contraseña",
  "login.sent": "Te enviamos un correo para cambiar la contraseña.",
  "login.newpass": "Nueva contraseña",
  "login.save": "Guardar contraseña",
  "login.offline": "Sin conexión. Conéctate a internet para entrar la primera vez.",
  "login.created": "Cuenta creada.",
  "login.check": "Revisa tu correo para confirmar la cuenta y luego entra.",
  "update": "Hay una versión nueva de Faro",
  "update.go": "Actualizar",
};
const en: Record<string, string> = {
  "lock.title": "Faro is locked",
  "lock.open": "Unlock with fingerprint",
  "lock.again": "Try again",
  "lock.out": "Sign out",
  "lock.on": "Fingerprint unlock",
  "lock.onHint": "Asks for your fingerprint or face when Faro opens on this device. Works offline.",
  "lock.enable": "Turn on fingerprint",
  "lock.disable": "Turn off fingerprint",
  "lock.none": "This device has no fingerprint or screen lock Faro can use.",
  "lock.failed": "Could not confirm. Try again.",
  "acct.out": "Sign out",
  "acct.outWarn": "Signing out erases this device's copy. Anything not yet synced will be lost.",
  "acct.offline": "Offline: using this device's copy.",
  "acct.relogin": "Your session expired. Sign in again to sync; your data is still on this device.",
  "login.forgot": "Forgot my password",
  "login.sent": "We sent you an email to change the password.",
  "login.newpass": "New password",
  "login.save": "Save password",
  "login.offline": "Offline. Connect to the internet to sign in the first time.",
  "login.created": "Account created.",
  "login.check": "Check your email to confirm the account, then sign in.",
  "update": "A new version of Faro is ready",
  "update.go": "Update",
};

export function currentLang(): Lang {
  try { return localStorage.getItem("faro-lang") === "en" ? "en" : "es"; } catch { return "es"; }
}
export function w(key: string, lang: Lang = currentLang()): string {
  const pack = lang === "en" ? en : es;
  return pack[key] ?? es[key] ?? translate(lang, key);
}
