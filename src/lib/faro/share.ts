/* ═══ LA MESA DE INVITACIÓN DEL LIBRO COMPARTIDO (Pieza C5, 1.3.395).
 *
 * La ley fallada: ninguna invitación sale sin pasar por la VISTA
 * PREVIA POR LOS OJOS DEL OTRO — qué verá, qué podrá hacer, qué NO
 * verá, quién financia cada área. Este módulo es la ley en forma pura:
 *
 * · La mesa compone un trato (quién, alcance, papel) con los pasos
 *   corregibles en cualquier orden — no es un asistente lineal.
 * · La vista previa vale para EL TRATO EXACTO que se previsualizó:
 *   su llave ata correo + alcance + papel; tocar cualquier paso
 *   después de verla la invalida y hay que verla de nuevo.
 * · `canInvite` es la única puerta del botón: sin llave vigente no
 *   hay invitación, y la superficie no ofrece ningún otro camino.
 * · La misma cuenta que previsualiza una invitación es la que vive
 *   después en «Quiénes están en este libro» como «qué compartí»:
 *   una sola función (previewFor) para componer y para verificar. */
import type { LedgerState } from "./types";

export type ShareScope = { all: true } | { cats: string[] };
export type ShareRole = "note" | "view";

export interface MesaState {
  email: string;
  scope: ShareScope | null;
  role: ShareRole | null;
  /** La llave del trato ya previsualizado; null = sin vista previa. */
  previewed: string | null;
}

export const emptyMesa: MesaState = { email: "", scope: null, role: null, previewed: null };

/** La llave de un trato: ata correo, alcance y papel. Cambiar
 * cualquier paso cambia la llave — y la vista previa vieja muere. */
export function mesaKey(m: Pick<MesaState, "email" | "scope" | "role">): string | null {
  const email = m.email.trim().toLowerCase();
  if (!email || !m.scope || !m.role) return null;
  if ("cats" in m.scope && m.scope.cats.length === 0) return null; // áreas elegidas pero ninguna marcada: aún no hay trato
  const scopeKey = "all" in m.scope && m.scope.all ? "all" : `cats:${[...(m.scope as { cats: string[] }).cats].sort().join(",")}`;
  return `${email}|${scopeKey}|${m.role}`;
}

/** Un correo plausible: algo@algo.algo, sin espacios. La verificación
 * de verdad es del servidor (la invitación solo la puede aceptar la
 * sesión de ese correo exacto — la ley de la Pieza C1). */
export const plausibleEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/** La única puerta de invitar: trato completo, correo plausible y la
 * vista previa DEL TRATO ACTUAL ya vista. */
export function canInvite(m: MesaState): boolean {
  const key = mesaKey(m);
  return key !== null && plausibleEmail(m.email) && m.previewed === key;
}

/** ¿La vista previa que se vio sigue siendo la del trato actual? */
export const previewStale = (m: MesaState): boolean => m.previewed !== null && mesaKey(m) !== m.previewed;

export interface SharePreview {
  /** Las categorías que la persona verá (ids; vacío con alcance total
   * se lee como «todas» en la superficie — aquí van todas, explícitas). */
  seesCats: string[];
  /** Las categorías que NO verá (ids). Con alcance total, ninguna. */
  notSeesCats: string[];
  /** Lo que podrá hacer, por llaves de capacidad (la superficie las
   * dice en palabras). */
  canDo: string[];
  /** Lo que jamás viaja a su copia, ni con alcance total (la ley de
   * la Pieza C2): ajustes, auditoría y borradores del dueño. */
  neverTravels: string[];
  /** Quién financia cada área visible: hoy, las cuentas del dueño
   * (el dinero del invitado por área llega con la Pieza C6). */
  fundedBy: { cat: string; by: "owner" }[];
}

/** La cuenta de la vista previa: pura, desde el libro y el trato. La
 * usa la mesa al invitar y «Quiénes están en este libro» al verificar
 * lo compartido — la misma cuenta, palabra por palabra. */
export function previewFor(state: LedgerState, scope: ShareScope, role: ShareRole): SharePreview {
  const allCats = state.structure.categories.map((c) => c.id);
  const seesCats = "all" in scope && scope.all ? allCats : allCats.filter((id) => (scope as { cats: string[] }).cats.includes(id));
  const notSeesCats = allCats.filter((id) => !seesCats.includes(id));
  const canDo = role === "note"
    ? ["note-lines", "sign-lines", "own-drafts", "advisor-own-world"]
    : ["read-lines", "advisor-own-world"];
  return {
    seesCats,
    notSeesCats,
    canDo,
    neverTravels: ["settings", "audit", "drafts"],
    fundedBy: seesCats.map((cat) => ({ cat, by: "owner" as const })),
  };
}
