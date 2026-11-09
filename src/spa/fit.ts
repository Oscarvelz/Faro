// Keeps every amount (.num) inside its box: if a number is wider than the card,
// chip or column that holds it, its font shrinks just enough to fit (never below 55%).
const MIN = 0.55;

// 1.3.175: one sweep used to refit EVERY amount in the document on every mutation
// burst — resetting each font size (a write) and re-measuring it (a read) one element
// at a time, then repeating the whole pass 400 ms later. On a large book that
// measurement debt lands inside the next page turn and the turn feels heavy. The
// sweep now works in phases: pending resets are written together, then every amount
// is measured with reads only (the ancestor walks below are memoised for the sweep),
// and only the amounts that actually overflow go through the shrink loop. The old
// +400 ms repeat no longer re-fits the whole document either: it re-runs only the
// bounded group passes and re-measures reads-only, shrinking solely what overflows
// then — same promise (a box that settled late is still caught), a fraction of the
// cost. Two more guards keep a mount from re-sweeping itself into a storm: sweeps
// are paced (a burst of mutation waves during one mount no longer buys a full
// sweep per frame), and the `faro-fit` event fires only when a sweep actually
// changed a size — it exists so the (?) marks can re-measure after size changes,
// and dispatching it for nothing made the marks re-measure, toggle, and so
// trigger yet another sweep, twenty times per mount. The visual contract is
// unchanged: same selector, same floors, same end sizes.
type SweepCache = {
  slide: Map<Element, number>;
  box: Map<Element, HTMLElement | null>;
  edges: Map<HTMLElement, { bl: number; br: number; pl: number; pr: number }>;
};
let sweepCache: SweepCache | null = null;
function newSweepCache(): SweepCache {
  return { slide: new Map(), box: new Map(), edges: new Map() };
}

function boxOf(el: HTMLElement): HTMLElement | null {
  const start = el.parentElement;
  if (!start) return null;
  const cache = sweepCache?.box;
  const hit = cache?.get(start);
  if (hit !== undefined) return hit;
  const visited: HTMLElement[] = [];
  let found: HTMLElement | null = null;
  let a: HTMLElement | null = start;
  while (a && a !== document.body) {
    const memo = cache?.get(a);
    if (memo !== undefined) { found = memo; break; }
    visited.push(a);
    const s = getComputedStyle(a);
    if (parseFloat(s.borderLeftWidth) > 0 || parseFloat(s.borderRightWidth) > 0 || s.overflowX !== "visible" || s.backgroundColor !== "rgba(0, 0, 0, 0)" || s.backgroundImage !== "none") { found = a; break; }
    a = a.parentElement;
  }
  if (cache) for (const v of visited) cache.set(v, found);
  return found;
}

// 1.3.95: a pane that is sliding in (ring swipe, finger drag, tab slide) is translated sideways for a moment. Its amounts must be
// measured where they will rest, not where the slide shows them, or they shrink for a few frames (a shorter line → the content
// below drops by ~6px and comes back). Sum the sideways translation of every transformed ancestor and measure without it.
function slideX(el: Element): number {
  const cache = sweepCache?.slide;
  const chain: Element[] = [];
  const own: number[] = [];
  let x = 0;
  for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
    const memo = cache?.get(a);
    if (memo !== undefined) { x += memo; break; }
    chain.push(a);
    const t = getComputedStyle(a).transform;
    let dx = 0;
    if (t && t !== "none") { try { dx = new DOMMatrixReadOnly(t).m41; } catch { /* ignore */ } }
    own.push(dx);
    x += dx;
  }
  if (cache) {
    let suffix = x;
    for (let i = 0; i < chain.length; i++) { cache.set(chain[i], suffix); suffix -= own[i]!; }
  }
  return x;
}

function edgesOf(box: HTMLElement): { bl: number; br: number; pl: number; pr: number } {
  const cache = sweepCache?.edges;
  let e = cache?.get(box);
  if (!e) {
    const s = getComputedStyle(box);
    e = { bl: parseFloat(s.borderLeftWidth), br: parseFloat(s.borderRightWidth), pl: parseFloat(s.paddingLeft), pr: parseFloat(s.paddingRight) };
    cache?.set(box, e);
  }
  return e;
}

function overflow(el: HTMLElement): number {
  let over = Math.max(0, el.scrollWidth - el.clientWidth);
  const raw = el.getBoundingClientRect();
  const dx = slideX(el);
  const r = { left: raw.left - dx, right: raw.right - dx };
  const box = boxOf(el);
  if (box) {
    const braw = box.getBoundingClientRect();
    const bdx = slideX(box);
    const b = { left: braw.left - bdx, right: braw.right - bdx };
    const e = edgesOf(box);
    const right = b.right - e.br - Math.min(e.pr, 8);
    const left = b.left + e.bl + Math.min(e.pl, 8);
    over = Math.max(over, r.right - right, left - r.left);
  }
  over = Math.max(over, r.right - document.documentElement.clientWidth + 4);
  return over > 0.5 ? over : 0;
}

// Set by any pass that actually changes a size or a fit-driven attribute during
// the current sweep; gates the `faro-fit` dispatch (see the note at the top).
let sweepWrote = false;

// The shrink loop itself, unchanged: from the amount's natural size, step down
// until it fits its box (floor 55%).
function fitLoop(el: HTMLElement) {
  const base = parseFloat(getComputedStyle(el).fontSize);
  let scale = 1;
  for (let i = 0; i < 4; i++) {
    const over = overflow(el);
    if (!over) break;
    const need = Math.max(el.scrollWidth, el.getBoundingClientRect().width);
    scale = Math.max(MIN, scale * ((need - over) / need) * 0.98);
    el.style.fontSize = `${(base * scale).toFixed(2)}px`;
    sweepWrote = true;
    if (scale === MIN) break;
  }
}

// Every amount the sweep can touch, in document order, minus the opted-out ones.
function fitList(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(FIT)].filter((el) => !el.closest("[data-nofit]"));
}

// Reads-only candidacy, exactly the checks fitOne ran before its loop: visible,
// laid out, and wider than its box.
function measureOver(els: HTMLElement[]): HTMLElement[] {
  const over: HTMLElement[] = [];
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === "inline" || cs.display === "none") continue;
    if (!el.getBoundingClientRect().width) continue;
    if (overflow(el)) over.push(el);
  }
  return over;
}

// The .num pass, phased (see the note at the top): resets together, measures
// reads-only, shrinks only what overflows. Returns the amounts it shrank.
function fitNums(): HTMLElement[] {
  const els = fitList();
  for (const el of els) if (el.style.fontSize) { el.style.fontSize = ""; sweepWrote = true; }
  const over = measureOver(els);
  for (const el of over) fitLoop(el);
  return over;
}

// English lens kickers ("SPENDING", "PAYMENTS") are longer than the Spanish design's ("GASTARÉ", "PAGOS"): on a narrow lens (large text)
// they shrink just enough to stay inside the lens instead of widening it (which shrank the amount under them).
const FIT = '.num:not(.lever-amt > .num), html[lang="en"] .lenses .lens-kicker > span:last-child, .cobro-form .day-field-btn > span:first-child';

// The three lens kickers are siblings: when one had to shrink, all three take that same size (no HAVE big beside SPENDING small).
const KICKERS = 'html[lang="en"] .lenses .lens-kicker > span:last-child';
// The four projector tiles (Semana, Mes, Año, N años) share one amount size: when one had to shrink, all take it.
function groupLever() {
  document.querySelectorAll<HTMLElement>(".vault-lever-read > div").forEach((grid) => {
    const els = [...grid.querySelectorAll<HTMLElement>(".vault-mark > .num")].filter((el) => el.getBoundingClientRect().width > 0);
    if (els.length < 2) return;
    const min = Math.min(...els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    els.forEach((el) => { if (parseFloat(getComputedStyle(el).fontSize) - min > 0.05) { el.style.fontSize = `${min.toFixed(2)}px`; sweepWrote = true; } });
  });
}

function groupKickers() {
  groupLever();
  const els = [...document.querySelectorAll<HTMLElement>(KICKERS)].filter((el) => el.getBoundingClientRect().width > 0);
  if (els.length < 2) return;
  const sizes = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
  const min = Math.min(...sizes);
  if (Math.max(...sizes) - min < 0.05) return;
  els.forEach((el) => { el.style.fontSize = `${min.toFixed(2)}px`; });
  sweepWrote = true;
}

// Libros section tabs (icon over label, five equal columns): when a label would end in "…" (e.g. "Shopping" in Claro EN on a 360 phone),
// that bar tightens its spacing (1), then its letters (2). Bars whose labels fit keep their exact look.
function segTabs() {
  document.querySelectorAll<HTMLElement>(".seg.is-follow:not(.is-pair)").forEach((seg) => {
    if (!seg.getBoundingClientRect().width) return;
    const labels = [...seg.querySelectorAll<HTMLElement>(".seg-label")];
    const cut = () => labels.some((l) => l.scrollWidth > l.clientWidth + 0.5);
    if (seg.hasAttribute("data-squeeze")) { seg.removeAttribute("data-squeeze"); sweepWrote = true; }
    for (let level = 1; level <= 2 && cut(); level++) { seg.setAttribute("data-squeeze", String(level)); sweepWrote = true; }
  });
}

// Cobro cards (Me deben, Debo → Préstamos): when a name and its pending amount cannot share the row (e.g. "Cooperativa Demo" at 360 Tron),
// the name shrinks just enough (never below 78%) to keep both on one line. Only if it still cannot fit does the row keep its old two-line layout.
const NAME_MIN = 0.78;
// The cards of one list stay alike: every name in the list takes the smallest size any of them needed, and if one name cannot
// fit even at that floor, the whole list keeps the old layout (amount on its own line) so no card looks different from its neighbours.
function cobroNames() {
  const lists = new Map<Element, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>(".cobro-row").forEach((row) => {
    if (!row.getBoundingClientRect().width) return;
    const key = row.closest(".cobro-swap, .cobro-group, .cobros") ?? document.body;
    lists.set(key, [...(lists.get(key) ?? []), row]);
  });
  lists.forEach((rows) => {
    const parts = rows.map((row) => ({ row, name: row.querySelector<HTMLElement>(".cobro-who strong"), amt: row.querySelector<HTMLElement>(":scope > .num") }))
      .filter((x): x is { row: HTMLElement; name: HTMLElement; amt: HTMLElement } => !!x.name && !!x.amt);
    parts.forEach(({ row, name }) => { if (row.hasAttribute("data-one") || name.style.fontSize) sweepWrote = true; row.removeAttribute("data-one"); name.style.fontSize = ""; });
    const split = parts.filter(({ name, amt }) => amt.getBoundingClientRect().top >= name.getBoundingClientRect().bottom - 2);
    if (!split.length) return;
    parts.forEach(({ row }) => row.setAttribute("data-one", ""));
    sweepWrote = true;
    let scale = 1;
    for (const { name } of parts) {
      const base = parseFloat(getComputedStyle(name).fontSize);
      let own = 1;
      for (let i = 0; i < 5 && name.scrollWidth > name.clientWidth + 0.5; i++) {
        own = Math.max(NAME_MIN, own * (name.clientWidth / name.scrollWidth) * 0.98);
        name.style.fontSize = `${(base * own).toFixed(2)}px`;
        sweepWrote = true;
        if (own === NAME_MIN) break;
      }
      if (name.scrollWidth > name.clientWidth + 0.5) { scale = 0; break; }
      scale = Math.min(scale, own);
    }
    parts.forEach(({ row, name }) => {
      name.style.fontSize = "";
      if (!scale) { row.removeAttribute("data-one"); return; }
      name.style.fontSize = `${(parseFloat(getComputedStyle(name).fontSize) * scale).toFixed(2)}px`;
      sweepWrote = true;
    });
  });
}

// Open projector line 2 ("C$1,831.22 al mes, así quedaría:"): one line, never wrapped or cut. When it would not fit (narrow phone,
// large text, long amounts) the muted tail shrinks first (to 78%), then amount and tail together (floor 60%), so the amount stays dominant.
function leverAmt() {
  document.querySelectorAll<HTMLElement>(".vault-lever-read .lever-amt").forEach((row) => {
    const amt = row.querySelector<HTMLElement>("strong");
    const tail = row.querySelector<HTMLElement>("em");
    if (!amt || !tail) return;
    if (amt.style.fontSize || tail.style.fontSize) sweepWrote = true;
    amt.style.fontSize = ""; tail.style.fontSize = "";
    if (!row.getBoundingClientRect().width) return;
    const over = () => tail.getBoundingClientRect().right > row.getBoundingClientRect().right - 0.25 || row.scrollWidth > row.clientWidth;
    if (!over()) return;
    const a0 = parseFloat(getComputedStyle(amt).fontSize), t0 = parseFloat(getComputedStyle(tail).fontSize);
    for (let k = 0.97; k >= 0.78 && over(); k -= 0.03) { tail.style.fontSize = `${(t0 * k).toFixed(2)}px`; sweepWrote = true; }
    const t1 = parseFloat(tail.style.fontSize || String(t0));
    for (let k = 0.97; k >= 0.6 && over(); k -= 0.03) {
      amt.style.fontSize = `${(a0 * k).toFixed(2)}px`;
      tail.style.fontSize = `${(t1 * k).toFixed(2)}px`;
      sweepWrote = true;
    }
  });
}

let queued = false;
let recheckQueued = false;

// The old sweep repeated EVERYTHING 400 ms later, in case a box had settled late
// (a font still loading, an image landing). The recheck keeps that promise with
// the cheap tools: the bounded group passes re-run (their geometry reads the
// amounts' sizes), the amounts are re-measured reads-only AT THE SIZES THEY NOW
// CARRY — never reset first, so nothing ever grows back here, exactly like the
// old repeat — and only one still overflowing goes through reset + shrink loop.
// One shot, never chained, and coalesced: at most one recheck is ever pending.
function scheduleRecheck() {
  if (recheckQueued) return;
  recheckQueued = true;
  setTimeout(() => {
    recheckQueued = false;
    sweepCache = newSweepCache();
    sweepWrote = false;
    try {
      segTabs();
      cobroNames();
      leverAmt();
      const over = measureOver(fitList());
      for (const el of over) { el.style.fontSize = ""; fitLoop(el); }
      groupKickers();
    } finally {
      sweepCache = null;
    }
    if (sweepWrote) dispatchEvent(new Event("faro-fit"));
  }, 400);
}

// Pacing: during a mount, mutation waves arrive frame after frame; sweeping on
// every frame multiplies the mount's cost. A request that lands within 50 ms of
// the last sweep waits for the next frame instead — and never more than 160 ms,
// so amounts are always fitted well inside the entrance. The first sweep after
// quiet is never delayed: it runs on the very next frame, as before.
let queuedSince = 0;
let lastSweepAt = 0;

export function fitAll() {
  if (queued) return;
  queued = true;
  queuedSince = performance.now();
  const tick = () => {
    const now = performance.now();
    if (now - lastSweepAt < 50 && now - queuedSince < 160) { requestAnimationFrame(tick); return; }
    queued = false;
    lastSweepAt = now;
    sweepCache = newSweepCache();
    sweepWrote = false;
    try {
      segTabs();
      cobroNames();
      leverAmt();
      fitNums();
      groupKickers();
    } finally {
      sweepCache = null;
    }
    // Tell the (?) marks that avoid these words to check again — only when a size
    // actually changed; their boxes did not resize, so a silent sweep has
    // nothing to tell them (and telling them anyway fed the re-sweep loop).
    if (sweepWrote) dispatchEvent(new Event("faro-fit"));
    scheduleRecheck();
  };
  requestAnimationFrame(tick);
}

export function startFit() {
  const mo = new MutationObserver(fitAll);
  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "aria-expanded", "aria-pressed", "aria-current", "data-theme", "open"] });
  addEventListener("resize", fitAll);
  document.fonts?.ready.then(fitAll);
  fitAll();
}
