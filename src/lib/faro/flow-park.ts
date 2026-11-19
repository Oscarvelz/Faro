/* ════════════════════════════════════════════════════════════════════════════
 * EL APARCAMIENTO DE FLUJOS (ola 10, C10-1 — principio 8)
 *
 * Una adopción (el modo que llega de otra pestaña o de la nube) recompone
 * la cara: la pantalla que aloja un flujo abierto puede dejar de existir
 * — la pantalla de Deudas se lee como hechos en Esencial — y el flujo se
 * desmonta con el trabajo sin guardar dentro. La revisión de escaneo
 * sobrevive a ese mismo golpe porque vive como portal y se recompone en
 * el sitio; los flujos alojados DENTRO de la pantalla no tienen esa
 * suerte. Este módulo es la otra mitad de la cura, con la forma del
 * contra-espécimen: el estado sin guardar SOBREVIVE a la adopción fuera
 * del árbol y el flujo se RESTAURA con él cuando su casa vuelve a
 * pintarse.
 *
 * Vive fuera de React (como panel-exit.ts) porque su razón de ser es
 * sobrevivir al desmontaje: ningún estado de componente llega. El
 * aparcamiento es de la SESIÓN de la app — jamás se persiste — y cada
 * flujo aparca bajo su llave propia. El conjunto de llaves RASGADAS lo
 * marca el proveedor en el momento de la adopción que cruza la frontera
 * que desmonta la casa del flujo: solo un flujo rasgado se restaura
 * solo; un aparcamiento sin rasgar es un resto de navegación y la casa,
 * al pintarse sin rasgadura, lo descarta en silencio (navegar nunca
 * resucita borradores: eso lo gobiernan las reglas propias de cada
 * flujo, como siempre).
 * ════════════════════════════════════════════════════════════════════════════ */

const parked = new Map<string, unknown>();
const torn = new Set<string>();

/** Aparca (o re-aparca) el estado sin guardar de un flujo. */
export function parkFlow(key: string, state: unknown): void {
  parked.set(key, state);
}

/** El estado aparcado de un flujo, o undefined si no hay ninguno. */
export function peekFlow<T>(key: string): T | undefined {
  return parked.get(key) as T | undefined;
}

/** Retira el aparcamiento de un flujo (guardó, o su dueño lo cerró por
 *  sus propias reglas) y limpia su marca de rasgadura. */
export function clearFlow(key: string): void {
  parked.delete(key);
  torn.delete(key);
}

/** Marca como rasgados los flujos aparcados AHORA: los que una adopción
 *  está a punto de desmontar. Se llama antes de aplicar la sesión
 *  adoptada, solo cuando la adopción cruza la frontera que desmonta su
 *  casa. */
export function markTornFlows(): void {
  for (const key of parked.keys()) torn.add(key);
}

/** ¿Este flujo fue rasgado por una adopción? Su casa lo consulta al
 *  pintarse: si fue rasgado, se restaura con su borrador; si no, el
 *  aparcamiento es un resto y se descarta. */
export function flowWasTorn(key: string): boolean {
  return torn.has(key);
}

/** La primera llave candidata que está rasgada Y guarda un borrador —
 *  la casa la usa al pintarse para saber qué flujo restaura. */
export function tornParkedKey(candidates: string[]): string | null {
  for (const k of candidates) if (torn.has(k) && parked.has(k)) return k;
  return null;
}

/** Al montar la casa: consume las marcas de rasgadura de las candidatas
 *  (su flujo ya se restauró o ya se juzgó) y DESCARTA los aparcamientos
 *  no rasgados — restos de una navegación: navegar nunca resucita
 *  borradores, los flujos empiezan frescos como siempre empezaron. */
export function settleFlowParks(candidates: string[]): void {
  for (const k of candidates) {
    if (torn.has(k)) torn.delete(k);
    else parked.delete(k);
  }
}
