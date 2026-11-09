/**
 * Estudio's card order — ONE source for the reorder mode and the normal view (1.3.171, censo N2).
 *
 * The provider keeps the full placed order (every registered card, grouped by section) and persists
 * it whole under `faro-study-order-2`; the normal view consumes it through CSS `order`. The reorder
 * mode, though, may only list — and only move — the cards that actually render in the current book:
 * before this module it listed every registered card, so a swap could be silently spent on an
 * invisible neighbour and the statistics never seemed to move.
 */

/** The placed order cut to the cards that render: the only rows the reorder mode may show. */
export function visibleOrder(placed: readonly string[], visible: readonly string[]): string[] {
  const on = new Set(visible);
  return placed.filter((id) => on.has(id));
}

/**
 * Swap the visible card at `index` of the visible list with its visible neighbour (`dir`), inside
 * the FULL placed order — invisible cards between the two keep their places, the persisted shape
 * stays the full order. Refused (returns `placed` itself) at the edges or across a section line:
 * a card never leaves its section, as before.
 */
export function swapVisible(
  placed: readonly string[],
  visibleList: readonly string[],
  sectionOf: (id: string) => string,
  index: number,
  dir: -1 | 1,
): readonly string[] {
  const a = visibleList[index];
  const b = visibleList[index + dir];
  if (!a || !b) return placed;
  if (sectionOf(a) !== sectionOf(b)) return placed;
  const next = [...placed];
  const ia = next.indexOf(a);
  const ib = next.indexOf(b);
  if (ia < 0 || ib < 0) return placed;
  next[ia] = b;
  next[ib] = a;
  return next;
}
