/**
 * panel-exit — la salida de la tarjeta abierta, alcanzable desde fuera de su árbol.
 *
 * El hueco (Oscar, 2026-11-09, sobre la nota honesta de la 1.3.179): la tarjeta del
 * editor de categorías de Estructura (TreePanel, en screens.tsx) tiene UNA salida —
 * su exitPanel — por la que pasan su Cancelar, el chevron de su fila, el pliegue de
 * su grupo y el Back/Esc: con trabajo sin aplicar (la visibilidad preparada de la
 * 1.3.179 y los borradores de siempre) levanta el aviso de descarte; limpia, pliega
 * al momento. Pero la tarjeta vive dentro del árbol de Ajustes, y dos salidas
 * quedaban fuera de su alcance: cambiar de pantalla por el dock y plegar la sección
 * de Ajustes que la contiene — ambas desmontan Ajustes y se llevaban lo preparado
 * EN SILENCIO (reproducido en banco sobre la 1.3.181: ni un aviso, y el trabajo
 * desaparecía con el desmonte).
 *
 * EL CONTRATO: la tarjeta registra su salida aquí al abrir y la retira al cerrar.
 * Quien desmonta Ajustes no navega por su cuenta: entrega su navegación a
 * guardPanelExit(proceed) y NO la ejecuta por la suya jamás. Sin tarjeta
 * registrada, proceed corre al momento. Con la tarjeta LIMPIA, su salida la pliega
 * y corre proceed dentro de su propio finish — desde la 1.3.223 el plegado es
 * animado (.3s, la curva de la casa; al momento con movimiento reducido) y
 * proceed corre cuando el plegado termina, sin fricción nueva: quien entrega
 * su navegación no espera ni reintenta, la lleva la salida. Con trabajo pendiente, el aviso sube y proceed
 * viaja en su confirmación: si él confirma, la tarjeta se pliega sin escribir el
 * libro y proceed corre detrás; si rechaza, proceed se cae con el aviso y no ha
 * pasado nada — sigue en Ajustes, con la tarjeta abierta y todo lo preparado.
 *
 * El lugar (navplace) no necesita saber nada de esto: solo se escribe cuando una
 * navegación ocurre de verdad, así que un rechazo — que no navega — deja el lugar
 * donde estaba, y una confirmación lo mueve con la navegación misma.
 *
 * Nada aquí toca React ni el DOM: un registro de una sola función, como la pila
 * de capas de back.ts pero con un solo puesto — hay una sola tarjeta.
 */
export type PanelExit = (reveal: boolean, after?: () => void) => boolean;

let current: PanelExit | null = null;

/** La tarjeta abierta registra su salida; al cerrarse la retira con clearPanelExit. */
export function setPanelExit(fn: PanelExit | null): void {
  current = fn;
}

/** Retira el registro SOLO si sigue siendo el de quien llama (una tarjeta nueva manda). */
export function clearPanelExit(fn: PanelExit): void {
  if (current === fn) current = null;
}

/**
 * La única puerta de las salidas que desmontan la tarjeta desde fuera de su
 * árbol: el dock y el pliegue de la sección de Ajustes entregan aquí su
 * navegación (proceed) en vez de ejecutarla. Quien llama nunca corre proceed
 * por su cuenta después de entregarlo: o ya corrió (sin tarjeta, o con la
 * tarjeta limpia), o correrá si él confirma el aviso, o no correrá nunca
 * (su rechazo).
 */
export function guardPanelExit(proceed: () => void): void {
  const exit = current;
  if (!exit) { proceed(); return; }
  exit(false, proceed);
}
