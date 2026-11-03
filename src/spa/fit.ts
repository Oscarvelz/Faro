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

function overflow(el: HTMLElement): number {
  let over = Math.max(0, el.scrollWidth - el.clientWidth);
  const r = el.getBoundingClientRect();
  const box = boxOf(el);
  if (box) {
    const b = box.getBoundingClientRect();
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
const FIT = '.num, html[lang="en"] .lenses .lens-kicker > span:last-child';

// The three lens kickers are siblings: when one had to shrink, all three take that same size (no HAVE big beside SPENDING small).
const KICKERS = 'html[lang="en"] .lenses .lens-kicker > span:last-child';
function groupKickers() {
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

let queued = false;
export function fitAll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    segTabs();
    document.querySelectorAll<HTMLElement>(FIT).forEach(fitOne);
    groupKickers();
    // Tell the (?) marks that avoid these words to check again (sizes changed without their boxes resizing).
    dispatchEvent(new Event("faro-fit"));
    setTimeout(() => { segTabs(); document.querySelectorAll<HTMLElement>(FIT).forEach((el) => { if (overflow(el)) fitOne(el); }); groupKickers(); dispatchEvent(new Event("faro-fit")); }, 400);
  });
}

export function startFit() {
  const mo = new MutationObserver(fitAll);
  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "aria-expanded", "aria-pressed", "aria-current", "data-theme", "open"] });
  addEventListener("resize", fitAll);
  document.fonts?.ready.then(fitAll);
  fitAll();
}
