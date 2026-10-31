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

let queued = false;
export function fitAll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    document.querySelectorAll<HTMLElement>(".num").forEach(fitOne);
    setTimeout(() => document.querySelectorAll<HTMLElement>(".num").forEach((el) => { if (overflow(el)) fitOne(el); }), 400);
  });
}

export function startFit() {
  const mo = new MutationObserver(fitAll);
  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "aria-expanded", "aria-pressed", "aria-current", "data-theme", "open"] });
  addEventListener("resize", fitAll);
  document.fonts?.ready.then(fitAll);
  fitAll();
}
