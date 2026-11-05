/**
 * Colour maths for the shared colour picker (ColorPick, 1.3.99): hex parsing, OKLab ΔE, near-duplicate removal,
 * HSV for the spectrum, the day-bubble wash and an ink tone that always reads on a chosen colour.
 * Pure functions, no DOM: unit-tested in palette.test.ts.
 */

/** "#abc", "abc", " #AABBCC " → "#aabbcc"; anything else → null. */
export function parseHex(input: string | undefined | null): string | null {
  const s = (input ?? "").trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s.split("").map((c) => c + c).join("")}`;
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  return null;
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function rgbOf(hex: string): [number, number, number] | null {
  const ok = parseHex(hex);
  if (ok) { const n = parseInt(ok.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = /^rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\)$/i.exec(hex.trim());
  if (m) return [+m[1], +m[2], +m[3]];
  const h = /^hsl\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/i.exec(hex.trim());
  if (h) {
    const H = +h[1], S = +h[2] / 100, L = +h[3] / 100;
    const k = (n: number) => (n + H / 30) % 12;
    const a = S * Math.min(L, 1 - L);
    const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  return null;
}

/** OKLab of a hex / rgb() / hsl() colour, or null. */
export function oklab(color: string): [number, number, number] | null {
  const c = rgbOf(color);
  if (!c) return null;
  const [r, g, b] = c.map((v) => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** Perceptual distance (OKLab ΔE, 0 … ~1). Unparseable colours are infinitely far. */
export function deltaE(a: string, b: string): number {
  const A = oklab(a), B = oklab(b);
  if (!A || !B) return Infinity;
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/**
 * Keep colours in order, dropping any that sits closer than `min` to one already kept, in ANY of the renderings
 * given (e.g. the raw colour, its day-bubble wash, its Tron neon), so the survivors stay apart in every theme.
 */
export function dedupe(colors: string[], min: number, renders: Array<(c: string) => string> = [(c) => c]): string[] {
  const kept: string[] = [];
  for (const c of colors) {
    if (kept.some((k) => renders.some((r) => deltaE(r(c), r(k)) < min))) continue;
    kept.push(c);
  }
  return kept;
}

/** Smallest pairwise ΔE of a set under one rendering. */
export function minGap(colors: string[], render: (c: string) => string = (c) => c): number {
  let best = Infinity;
  for (let i = 0; i < colors.length; i += 1) for (let j = i + 1; j < colors.length; j += 1) best = Math.min(best, deltaE(render(colors[i]), render(colors[j])));
  return best;
}

/** The light wash a day-theme bubble draws under its dark ink (same rule the bubbles have used since 1.3.x). */
export function washForInk(hex?: string): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "#d7e6dc";
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  for (let step = 0; step < 8; step += 1) {
    if ((r * 299 + g * 587 + b * 114) / 1000 >= 186) break;
    r = Math.round(r + (255 - r) * 0.2);
    g = Math.round(g + (255 - g) * 0.2);
    b = Math.round(b + (255 - b) * 0.2);
  }
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** WCAG relative luminance. */
export function luminance(color: string): number {
  const c = rgbOf(color);
  if (!c) return 0;
  const [r, g, b] = c.map((v) => lin(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export const INK_DARK = "#14110e";
export const INK_LIGHT = "#ffffff";

/** The text/icon tone that reads best on a background: Faro's dark ink unless white contrasts better. Never blocks a colour. */
export function inkOn(bg: string): string {
  return contrast(bg, INK_DARK) >= contrast(bg, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

/* HSV <-> hex for the spectrum (hue 0–360, s/v 0–1). */
export function hsvToHex(h: number, s: number, v: number): string {
  const H = ((h % 360) + 360) % 360, S = Math.min(1, Math.max(0, s)), V = Math.min(1, Math.max(0, v));
  const f = (n: number) => { const k = (n + H / 60) % 6; return V - V * S * Math.max(0, Math.min(k, 4 - k, 1)); };
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`;
}

export function hexToHsv(hex: string): [number, number, number] | null {
  const c = rgbOf(hex);
  if (!c) return null;
  const [r, g, b] = c.map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}

/** Recent custom colours: newest first, unique, at most `cap`. */
export function pushRecent(list: string[] | undefined, color: string, cap = 6): string[] {
  const c = parseHex(color);
  const prev = (list ?? []).map((x) => parseHex(x)).filter((x): x is string => !!x);
  if (!c) return prev.slice(0, cap);
  return [c, ...prev.filter((x) => x !== c)].slice(0, cap);
}
