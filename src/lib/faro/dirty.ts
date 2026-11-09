/**
 * dirty.ts — ¿cambió esta forma desde que se abrió? (Oleada de botones 4, 1.3.173.)
 *
 * La política única de confirmación de los editores (censo de botones, R7): una forma
 * pregunta antes de descartar SOLO si está sucia — si algún campo difiere de lo que
 * traía al abrir. Cada familia (LineForm de Libros, la cuota y el préstamo de Cobros,
 * el abono, Personas y su regalo) arma una «bolsa» plana con sus campos y la compara
 * con la bolsa de apertura a través de esta única comparación, para que «sucio»
 * signifique lo mismo en todas partes.
 *
 * La comparación es por contenido: escalares con Object.is y estructuras (la lista de
 * fechas de una persona) por su JSON — tocar un campo y devolverlo a su valor de
 * apertura deja la forma limpia otra vez.
 */
export function formDirty(base: Record<string, unknown>, now: Record<string, unknown>): boolean {
  for (const k of new Set([...Object.keys(base), ...Object.keys(now)])) {
    const a = base[k];
    const b = now[k];
    if (Object.is(a, b)) continue;
    if (JSON.stringify(a) !== JSON.stringify(b)) return true;
  }
  return false;
}
