/**
 * lockoffer — la oferta de huella al registrarse (1.3.257, decisión de Oscar vía la
 * línea de Estructura, 2026-11-13).
 *
 * El «Desbloqueo con huella» (spa/lock.ts) existía y funcionaba, pero vivía esperando
 * en Ajustes → Cuenta: nadie lo ofrecía y un usuario frío tenía que encontrarlo solo.
 * La decisión: al registrarse POR PRIMERA VEZ, tras la primera sesión exitosa, Faro lo
 * ofrece UNA vez. Aceptar activa la maquinaria existente (la misma que el botón de
 * Cuenta); declinar apaga la pregunta para siempre en este aparato, sin perseguir.
 * La puerta de Cuenta queda intacta. Nada aquí toca lock.ts ni la puerta (door.ts):
 * este módulo solo decide, con huellas del aparato, si la oferta va.
 *
 * EL MOMENTO DE LA VERDAD es rememberUser() (spa/cloud.ts): es el embudo único por el
 * que pasa TODA sesión adoptada — el formulario (registrarse y entrar), el arranque en
 * frío y el aterrizaje del enlace de confirmación de correo (detectSessionInUrl) — y se
 * llama ANTES de que la adopción escriba sus marcas (el usuario recordado y la marca de
 * dueño). Ahí, y solo ahí, las huellas del aparato todavía cuentan la verdad.
 *
 * LAS HUELLAS (todo por cuenta, todo en este aparato): que exista su libro
 * (`faro.pack.<uid>`), su credencial de huella (la clave de lock.ts, leída solo en
 * presencia), el usuario recordado, la marca de dueño, o la propia marca de «ya se
 * preguntó». Si NINGUNA huella es de esta cuenta, el aparato nunca la ha visto.
 *
 * LA SEGUNDA CONDICIÓN: la cuenta tiene que ser NUEVA (creada hace menos de
 * NEW_ACCOUNT_MS, según el created_at que trae la sesión). Sin ella, una cuenta vieja
 * que entra por primera vez en un aparato nuevo o recién borrado recibiría la oferta:
 * las huellas solas no distinguen «registrado hoy» de «registrado hace años en otro
 * teléfono». Con las dos, la oferta es solo para el registro genuino.
 *
 * LAS CLAVES:
 * - `faro.lockpend.<uid>` — la oferta quedó pendiente al adoptarse la primera sesión;
 *   la consume el componente que la muestra (spa/lockoffer.tsx). Si el usuario cierra
 *   la app antes de verla, la pendiente sobrevive y la oferta sale en la próxima
 *   apertura — nunca se le preguntó, así que no cuenta como preguntado.
 * - `faro.lockask.<uid>` — ya se preguntó (aceptara o declinara). Es la que apaga la
 *   pregunta para siempre: por eso sobrevive a la salida explícita (gates.tsx la
 *   conserva junto a la credencial, como la elección de huella misma) y por eso NO
 *   viaja en el respaldo — la huella es de este aparato y su pregunta también.
 *
 * Puro y testeable contra un almacén inyectado (PackStorage). Nada aquí toca React,
 * el DOM ni la cerradura.
 */
import type { PackStorage } from "./packguard.ts";
import { packKeyOf } from "./packguard.ts";
import { readOwnerMark } from "./door.ts";

export const LOCK_ASK_KEY = (uid: string) => `faro.lockask.${uid}`;
export const LOCK_PENDING_KEY = (uid: string) => `faro.lockpend.${uid}`;
/** La clave de la credencial en lock.ts (`faro.lock.<uid>`): se nombra aquí SOLO para
 *  leer su presencia como huella. Su dueña sigue siendo lock.ts. */
export const LOCK_CREDENTIAL_KEY = (uid: string) => `faro.lock.${uid}`;

/** Una cuenta es «nueva» durante su primera semana: el registro con confirmación de
 *  correo puede tardar días en aterrizar, y la ventana solo se lee junto a las huellas
 *  (una cuenta vieja con libro en el aparato jamás llega hasta aquí). */
export const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;
/** Tolerancia de reloj al comparar el created_at: un aparato con la hora apenas
 *  adelantada no convierte su propio registro en «del futuro». */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface EntryTraces {
  /** Existe el libro local de esta cuenta. */
  hasPack: boolean;
  /** Existe su credencial de huella en este aparato. */
  hasLock: boolean;
  /** La oferta ya se le hizo (y se contestó) en este aparato. */
  hasAsked: boolean;
  /** El usuario recordado en su almacén, si lo hay. */
  rememberedUid: string | null;
  /** La marca de dueño del aparato, si la hay. */
  ownerUid: string | null;
}

/** Las huellas de una cuenta en este aparato, leídas del almacén. El usuario
 *  recordado vive en la caja que decide «Mantener sesión» — quien llama lo lee con
 *  lastUser() y lo pasa; todo lo demás sale del almacén del aparato. */
export function tracesOf(store: PackStorage, uid: string, rememberedUid: string | null): EntryTraces {
  return {
    hasPack: store.keys().includes(packKeyOf(uid)),
    hasLock: store.getItem(LOCK_CREDENTIAL_KEY(uid)) !== null,
    hasAsked: store.getItem(LOCK_ASK_KEY(uid)) !== null,
    rememberedUid,
    ownerUid: readOwnerMark(store)?.id ?? null,
  };
}

/** ¿El aparato jamás ha visto esta cuenta? Ninguna huella es suya. */
export function isFirstEntry(t: EntryTraces, uid: string): boolean {
  return !t.hasPack && !t.hasLock && !t.hasAsked && t.rememberedUid !== uid && t.ownerUid !== uid;
}

/** ¿La cuenta se creó hace poco? Un created_at ausente o ilegible NO es una cuenta
 *  nueva: ante la duda, no se ofrece. */
export function accountIsNew(createdAt: string | null | undefined, now: number): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return created <= now + CLOCK_SKEW_MS && now - created <= NEW_ACCOUNT_MS;
}

/** La decisión completa de la oferta: primera entrada en el aparato Y cuenta nueva. */
export function shouldPendOffer(t: EntryTraces, uid: string, createdAt: string | null | undefined, now: number): boolean {
  return isFirstEntry(t, uid) && accountIsNew(createdAt, now);
}

export function pendOffer(store: PackStorage, uid: string): void {
  try { store.setItem(LOCK_PENDING_KEY(uid), "1"); } catch { /* ignore */ }
}

export function readPending(store: PackStorage, uid: string): boolean {
  try { return store.getItem(LOCK_PENDING_KEY(uid)) === "1"; } catch { return false; }
}

export function clearPending(store: PackStorage, uid: string): void {
  try { store.removeItem(LOCK_PENDING_KEY(uid)); } catch { /* ignore */ }
}

export function wasAsked(store: PackStorage, uid: string): boolean {
  try { return store.getItem(LOCK_ASK_KEY(uid)) === "1"; } catch { return false; }
}

export function markAsked(store: PackStorage, uid: string): void {
  try { store.setItem(LOCK_ASK_KEY(uid), "1"); } catch { /* ignore */ }
}

/**
 * El gesto de rememberUser(): con las huellas todavía intactas, si esta adopción es
 * el registro genuino de la cuenta en este aparato, la oferta queda pendiente.
 * Devuelve si quedó pendiente. No escribe ninguna otra cosa.
 */
export function pendOfferIfFirst(
  store: PackStorage,
  input: { uid: string; createdAt: string | null | undefined; rememberedUid: string | null; now?: number },
): boolean {
  const traces = tracesOf(store, input.uid, input.rememberedUid);
  if (!shouldPendOffer(traces, input.uid, input.createdAt, input.now ?? Date.now())) return false;
  pendOffer(store, input.uid);
  return true;
}
