// Keeps the phone's status bar (meta theme-color) the same colour as whatever sits at the top of the screen,
// so dark themes, the sign-in night sky and the splash never get a bright bar.
function parse(c: string): [number, number, number, number] | null {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
function topColor(): string | null {
  let el = document.elementFromPoint(Math.round(innerWidth / 2), 2) as HTMLElement | null;
  while (el) {
    // Only full-width surfaces (header, page, sheet backdrop) may colour the bar. A chip, bar or card
    // passing under the top edge while scrolling must not flash the status bar (it went orange in Tron).
    if (el.getBoundingClientRect().width < innerWidth * 0.92) { el = el.parentElement; continue; }
    const cs = getComputedStyle(el);
    const c = parse(cs.backgroundColor);
    if (c && c[3] >= 0.5) return `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;
    if (cs.backgroundImage && cs.backgroundImage !== "none" && /gradient/.test(cs.backgroundImage)) {
      const g = cs.backgroundImage.match(/rgba?\([^)]+\)/g) || [];
      // A gradient: take its last solid stop (the base the page is painted on).
      for (let i = g.length - 1; i >= 0; i--) { const s = parse(g[i]); if (s && s[3] >= 0.9) return `rgb(${s[0] | 0}, ${s[1] | 0}, ${s[2] | 0})`; }
    }
    el = el.parentElement;
  }
  const b = parse(getComputedStyle(document.body).backgroundColor) || parse(getComputedStyle(document.documentElement).backgroundColor);
  return b && b[3] > 0 ? `rgb(${b[0] | 0}, ${b[1] | 0}, ${b[2] | 0})` : null;
}
export function startStatusBar() {
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
  let queued = 0;
  const apply = () => { queued = 0; const c = topColor(); if (c && meta!.content !== c) meta!.content = c; };
  const soon = () => { if (!queued) queued = window.setTimeout(apply, 120); };
  // 1.3.159: a theme flip applies NOW, in the flip's own frame — the debounce is only for
  // scroll/resize sampling. Before, the bar colour took a second step ~250 ms after the flip.
  new MutationObserver((recs) => {
    if (recs.some((r) => r.attributeName === "data-theme")) { if (queued) { clearTimeout(queued); queued = 0; } apply(); }
    else soon();
  }).observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ["data-theme", "class", "style"] });
  addEventListener("scroll", soon, { passive: true });
  addEventListener("resize", soon);
  document.addEventListener("visibilitychange", soon);
  apply();
}
