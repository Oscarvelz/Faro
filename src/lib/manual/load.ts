/**
 * The manual's text (~200 topics, both languages) stays out of the main bundle: it loads the first time a (?)
 * or the manual opens, and is prefetched when the browser is idle after the app is up.
 */
type Topics = typeof import("./topics");
type Links = typeof import("./links");
export type ManualData = Topics & Links;

let promise: Promise<ManualData> | null = null;
let data: ManualData | null = null;

export function loadManual(): Promise<ManualData> {
  promise ??= Promise.all([import("./topics"), import("./links")]).then(([a, b]) => (data = { ...a, ...b }));
  return promise;
}

export function manualNow(): ManualData | null {
  return data;
}

/** Warm the chunk once the app is idle. */
export function prefetchManual() {
  const go = () => void loadManual().catch(() => { promise = null; });
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 4000 });
  else window.setTimeout(go, 2500);
}
