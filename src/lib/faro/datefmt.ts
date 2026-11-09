// Cached Intl.DateTimeFormat instances (1.3.175). The old pattern —
// `date.toLocaleDateString(locale, options)` at every rendered row — builds a
// brand-new formatter per call; across a history list on a mount that cost is
// real (it was one of the Remesas mount's hot spots). A cached formatter with
// the same locale and options produces the identical string.
const cache = new Map<string, Intl.DateTimeFormat>();

export function dateFmt(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    cache.set(key, f);
  }
  return f;
}

// The same cache for numbers: formatMoney built a new Intl.NumberFormat for
// every amount on every render — the single most-called formatter in the app.
const numCache = new Map<string, Intl.NumberFormat>();

export function numFmt(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = numCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    numCache.set(key, f);
  }
  return f;
}
