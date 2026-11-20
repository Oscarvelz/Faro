/**
 * editor-exit — la salida del editor de línea abierto, alcanzable desde fuera
 * de su árbol. Hermano de panel-exit.ts, con su mismo contrato.
 *
 * El hueco (Oscar, 2026-11-20): con el editor de una línea abierto en un
 * libro, tocar otra carpeta — otra pestaña de Libros, el dock, un salto —
 * desmontaba el editor SIN preguntar: el trabajo sin guardar desaparecía en
 * silencio, aunque el propio Cancelar del editor sí pregunta al salir sucio.
 * La pregunta existía; lo que no existía era la puerta en la navegación.
 *
 * EL CONTRATO: el editor registra su salida aquí al montarse y la retira al
 * desmontarse. La puerta única de setUi (provider.tsx) entrega a
 * guardEditorExit(proceed) toda navegación que cambia de sección con un
 * editor registrado, y NO la ejecuta por la suya jamás. Sin editor, proceed
 * corre al momento. Con el editor LIMPIO, su salida lo cierra y proceed corre
 * detrás. Con trabajo sin guardar, sube el MISMO aviso que levanta su
 * Cancelar («entry.leave»): si él confirma, el editor se cierra sin guardar y
 * proceed corre detrás; si rechaza, proceed se cae con el aviso y no ha
 * pasado nada — sigue en su libro, con el editor abierto y todo lo escrito.
 *
 * Un solo puesto, como panel-exit: hay un solo editor de línea visible a la
 * vez (ui.draft/ui.editing es un solo estado para toda la app).
 */
export type EditorExit = (proceed: () => void) => void;

let current: EditorExit | null = null;

/** El editor abierto registra su salida; al cerrarse la retira con clearEditorExit. */
export function setEditorExit(fn: EditorExit | null): void {
  current = fn;
}

/** Retira el registro SOLO si sigue siendo el de quien llama (un editor nuevo manda). */
export function clearEditorExit(fn: EditorExit): void {
  if (current === fn) current = null;
}

/** ¿Hay un editor de línea abierto registrado ahora mismo? (La puerta de setUi lo pregunta.) */
export function hasEditorExit(): boolean {
  return current !== null;
}

/**
 * La única puerta de las navegaciones que desmontan el editor desde fuera de
 * su árbol: quien llama entrega aquí su navegación (proceed) en vez de
 * ejecutarla, y nunca la corre por su cuenta después de entregarla: o ya
 * corrió (sin editor, o con el editor limpio), o correrá si él confirma el
 * aviso, o no correrá nunca (su rechazo).
 */
export function guardEditorExit(proceed: () => void): void {
  const exit = current;
  if (!exit) { proceed(); return; }
  exit(proceed);
}
