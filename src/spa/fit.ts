// Keeps every amount (.num) inside its box: if a number is wider than the card,
// chip or column that holds it, its font shrinks just enough to fit (never below 55%).
const MIN = 0.55;

function boxOf(el: HTMLElement): HTMLElement | null {
  let a = el.parentElement;
  while (a && a !== document.body) {
    const s = getComputedStyle(a);
    if (parseFloat(s.borderLeftWidth) > 0 || parseFloat(s.borderRightWidth) > 0 || s.overflowX !== "visible" || s.backgroundColor !== "rgba(0, 0, 0, 0)" || s.backgroundImage !== "none") return a;
    a = a.parentElement;
  }
  return null;
}

// 1.3.95: a pane that is sliding in (ring swipe, finger drag, tab slide) is translated sideways for a moment. Its amounts must be
// measured where they will rest, not where the slide shows them, or they shrink for a few frames (a shorter line → the content
// below drops by ~6px and comes back). Sum the sideways translation of every transformed ancestor and measure without it.
function slideX(el: Element): number {
  let x = 0;
  for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
    const t = getComputedStyle(a).transform;
    if (t && t !== "none") { try { x += new DOMMatrixReadOnly(t).m41; } catch { /* ignore */ } }
  }
  return x;
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
    const s = getComputedStyle(box);
    const right = b.right - parseFloat(s.borderRightWidth) - Math.min(parseFloat(s.paddingRight), 8);
    const left = b.left + parseFloat(s.borderLeftWidth) + Math.min(parseFloat(s.paddingLeft), 8);
    over = Math.max(over, r.right - right, left - r.left);
  }
  over = Math.max(over, r.right - document.documentElement.clientWidth + 4);
  return over > 0.5 ? over : 0;
}

function fitOne(el: HTMLElement) {
  if (el.closest("[data-nofit]")) return;
  el.style.fontSize = "";
  const cs = getComputedStyle(el);
  if (cs.display === "inline" || cs.display === "none") return;
  const r = el.getBoundingClientRect();
  if (!r.width) return;
  const base = parseFloat(cs.fontSize);
  let scale = 1;
  for (let i = 0; i < 4; i++) {
    const over = overflow(el);
    if (!over) break;
    const need = Math.max(el.scrollWidth, el.getBoundingClientRect().width);
    scale = Math.max(MIN, scale * ((need - over) / need) * 0.98);
    el.style.fontSize = `${(base * scale).toFixed(2)}px`;
    if (scale === MIN) break;
  }
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
    els.forEach((el) => { if (parseFloat(getComputedStyle(el).fontSize) - min > 0.05) el.style.fontSize = `${min.toFixed(2)}px`; });
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
}

// Libros section tabs (icon over label, five equal columns): when a label would end in "…" (e.g. "Shopping" in Claro EN on a 360 phone),
// that bar tightens its spacing (1), then its letters (2). Bars whose labels fit keep their exact look.
function segTabs() {
  document.querySelectorAll<HTMLElement>(".seg.is-follow:not(.is-pair)").forEach((seg) => {
    if (!seg.getBoundingClientRect().width) return;
    const labels = [...seg.querySelectorAll<HTMLElement>(".seg-label")];
    const cut = () => labels.some((l) => l.scrollWidth > l.clientWidth + 0.5);
    seg.removeAttribute("data-squeeze");
    for (let level = 1; level <= 2 && cut(); level++) seg.setAttribute("data-squeeze", String(level));
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
    parts.forEach(({ row, name }) => { row.removeAttribute("data-one"); name.style.fontSize = ""; });
    const split = parts.filter(({ name, amt }) => amt.getBoundingClientRect().top >= name.getBoundingClientRect().bottom - 2);
    if (!split.length) return;
    parts.forEach(({ row }) => row.setAttribute("data-one", ""));
    let scale = 1;
    for (const { name } of parts) {
      const base = parseFloat(getComputedStyle(name).fontSize);
      let own = 1;
      for (let i = 0; i < 5 && name.scrollWidth > name.clientWidth + 0.5; i++) {
        own = Math.max(NAME_MIN, own * (name.clientWidth / name.scrollWidth) * 0.98);
        name.style.fontSize = `${(base * own).toFixed(2)}px`;
        if (own === NAME_MIN) break;
      }
      if (name.scrollWidth > name.clientWidth + 0.5) { scale = 0; break; }
      scale = Math.min(scale, own);
    }
    parts.forEach(({ row, name }) => {
      name.style.fontSize = "";
      if (!scale) { row.removeAttribute("data-one"); return; }
      name.style.fontSize = `${(parseFloat(getComputedStyle(name).fontSize) * scale).toFixed(2)}px`;
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
    amt.style.fontSize = ""; tail.style.fontSize = "";
    if (!row.getBoundingClientRect().width) return;
    const over = () => tail.getBoundingClientRect().right > row.getBoundingClientRect().right - 0.25 || row.scrollWidth > row.clientWidth;
    if (!over()) return;
    const a0 = parseFloat(getComputedStyle(amt).fontSize), t0 = parseFloat(getComputedStyle(tail).fontSize);
    for (let k = 0.97; k >= 0.78 && over(); k -= 0.03) tail.style.fontSize = `${(t0 * k).toFixed(2)}px`;
    const t1 = parseFloat(tail.style.fontSize || String(t0));
    for (let k = 0.97; k >= 0.6 && over(); k -= 0.03) {
      amt.style.fontSize = `${(a0 * k).toFixed(2)}px`;
      tail.style.fontSize = `${(t1 * k).toFixed(2)}px`;
    }
  });
}

let queued = false;
export function fitAll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    segTabs();
    cobroNames();
    leverAmt();
    document.querySelectorAll<HTMLElement>(FIT).forEach(fitOne);
    groupKickers();
    // Tell the (?) marks that avoid these words to check again (sizes changed without their boxes resizing).
    dispatchEvent(new Event("faro-fit"));
    setTimeout(() => { segTabs(); cobroNames(); leverAmt(); document.querySelectorAll<HTMLElement>(FIT).forEach((el) => { if (overflow(el)) fitOne(el); }); groupKickers(); dispatchEvent(new Event("faro-fit")); }, 400);
  });
}

export function startFit() {
  const mo = new MutationObserver(fitAll);
  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "aria-expanded", "aria-pressed", "aria-current", "data-theme", "open"] });
  addEventListener("resize", fitAll);
  document.fonts?.ready.then(fitAll);
  fitAll();
}
