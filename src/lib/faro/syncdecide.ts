/**
 * syncdecide — la decisión de sincronización SIN reloj de pared (oleada 2 del corazón, 1.3.166).
 *
 * Antes, a igual revisión, el desempate era `updatedAt`: el reloj decidía qué libro sobrevivía,
 * y un reloj adelantado (o dos aparatos desajustados) podía reemplazar en silencio el libro
 * bueno (auditoría del corazón, C7/W5). Ahora manda el sello de revisión monótono:
 * mayor revisión gana; a igual revisión se conserva al incumbente (determinista, sin reloj).
 * Estas funciones son la réplica permanente de la tabla de decisiones que la auditoría clonó
 * 1:1 en su sonda p4 — corazon2.test.ts las cerca.
 */

export type SyncAction = "push" | "apply-remote" | "saved" | "local";

export interface SyncRemote { revision: number }
export interface SyncLocal { revision: number; dirty: boolean }

/**
 * La decisión cliente (provider.syncNow):
 * - remoto por delante → aplicar remoto (el local sucio se aparta a la puerta de conflicto);
 * - local sucio → empujar (el servidor arbitra por revisión; si pierde, vuelve como conflicto);
 * - sin remoto y limpio → nada que hacer ("local", el comportamiento de hoy);
 * - local por delante → empujar (reafirmar, como hoy);
 * - **igual revisión y limpio → "saved": se queda el incumbente.** Es EL cambio: hoy el reloj
 *   aplicaba el remoto en silencio a igualdad de revisión.
 */
export function syncDecision(remote: SyncRemote | null, local: SyncLocal): SyncAction {
  if (remote && remote.revision > local.revision) return "apply-remote";
  if (local.dirty) return "push";
  if (!remote) return "local";
  if (local.revision > remote.revision) return "push";
  return "saved";
}

/**
 * El arbitraje del servidor al empujar (api.ts / faro_push): gana solo una revisión MAYOR.
 * A igual revisión solo pasa el re-empuje idempotente (mismo contenido, byte a byte); cualquier
 * otro contenido a igual revisión se rechaza y el cliente lo recupera como conflicto — el reloj
 * (updatedAt) ya no vota en ninguna dirección.
 */
export function pushWins(prev: { revision: number; dataJson: string } | null, incoming: { revision: number; dataJson: string }): boolean {
  if (!prev) return true;
  if (incoming.revision > prev.revision) return true;
  if (incoming.revision === prev.revision && incoming.dataJson === prev.dataJson) return true;
  return false;
}
