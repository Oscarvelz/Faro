import type { Structure } from "./types";

// 24 colours (Oscar, Nov 1 2026): 20 hues 18° apart in OKLCH, alternating deep (L .66, C .17) and light (L .80, C .12) so neighbours never blur, plus 4 neutrals from stone to graphite. Checked: min OKLab distance ≈ .064 in day themes and ≈ .057 in Tron.
// Stored as the day colour; every theme adapts it when drawing (Tron lights it with tronize()).
export const PALETTE = [
  "#e75e6a", "#ffa289", "#dc7106", "#edb161", "#b28d04", "#c5c463", "#79a304", "#8dd28c", "#0bac77", "#52d7c1", "#11a6aa", "#4dd1ef",
  "#079ed9", "#8dc2fe", "#6b89f9", "#bab3fe", "#ac72e3", "#e4a3e9", "#d562af", "#fd9cba", "#c3bdb3", "#89939e", "#876b59", "#494d54",
];

// Ahorros' official colour (Oscar, Nov 1 2026: "a purple that looks well integrated, a purple that stands out").
// oklch(.56 .20 300): deeper than the grid's violets so it never reads as one of them (OKLab ΔE ≥ .10 to #ac72e3, the
// nearest swatch; > .2 to the lilacs of Mascotas/IA), white text on it 5.1:1. Kept outside the 24-colour grid on purpose.
export const SAVINGS_PURPLE = "#894ed6";
// Its light on the Grid: oklch(.74 .155 300), the most saturated violet sRGB allows at that lightness. The deep neon
// violets are already Mascotas (#bf52ff), IA (#9452ff) and the grid's #ac72e3 neon, so Ahorros glows a step lighter
// (ΔE ≥ .088 to every Tron category light, .2 from Tron teal, 8.6:1 on black).
const SAVINGS_NEON = "#ba92fd";
// Former savings defaults. A savings colour equal to one of these was never picked by the user (the editor used to
// stamp the default into the line on save, in Tron as its neon; the bubble editor stamped its mint #97d8b3), so it shows
// the official purple instead. None of these is in PALETTE, so a grid pick can never be mistaken for one.
const SAVINGS_LEGACY = new Set(["#cfe3c8", "#97d8b3", "hsl(104 100% 54%)"]);

/** A stored colour, or "" when it is only an old savings default that the user never chose. */
export function chosenTone(color: string | undefined, categoryId: string | undefined): string {
  const c = color?.trim() ?? "";
  return categoryId === "f-ahorro" && SAVINGS_LEGACY.has(c.toLowerCase()) ? "" : c;
}

const NAMED: Record<string, string> = {
  "f-casa": "#b7d4c4",
  "f-transporte": "#f0cb8a",
  "f-familia": "#f0b7c4",
  "f-seguros": "#b7c7e8",
  "f-ahorro": SAVINGS_PURPLE,
  "f-remesas": "#f0c2a4",
  "f-creditos": "#e7d3a1",
  "f-alimentos": "#d5dca8",
  "f-mascotas": "#d7c0e4",
  "f-negocio": "#b7d4dc",
  "v-casa": "#8fb9a6",
  "v-transporte": "#d4a054",
  "v-mascotas": "#c9a6d4",
  "v-entretenimiento": "#e07a5f",
  "v-viajes": "#7aa2c4",
  "v-personales": "#d7b48a",
  "v-familia": "#e3a0b0",
  "v-hormiga": "#c4b48a",
  ropa: "#d7b4c4",
  tech: "#9bb0c9",
  gadget: "#b7c4a8",
  hogar: "#cbb89a",
  otros: "#c5c1b8",
  ia: "#b9a8d4",
};

export function isTron(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "tron";
}

/**
 * Tron (Legacy): every category keeps its own hue, lit like a light line on the
 * Grid: full saturation, a lightness tuned per hue so each glows evenly on black.
 * Greys stay quiet. Only while the Tron theme is on.
 */
export function tronize(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  if (`#${m[1].toLowerCase()}` === SAVINGS_PURPLE) return SAVINGS_NEON;
  const pi = PALETTE.indexOf(`#${m[1].toLowerCase()}`);
  if (pi >= 0) return paletteNeon(pi);
  const v = parseInt(m[1], 16);
  const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (d < 0.06) return `hsl(${h.toFixed(0)} 18% 70%)`;
  const light = h >= 45 && h < 170 ? 54 : h >= 200 && h < 290 ? 66 : 60;
  return `hsl(${h.toFixed(0)} 100% ${light}%)`;
}

export function categoryColor(id: string, chosen?: string): string {
  return isTron() ? tronize(categoryBase(id, chosen)) : categoryBase(id, chosen);
}

/** The category's stored day colour, before any theme lights it. */
export function categoryBase(id: string, chosen?: string): string {
  const custom = chosenTone(chosen, id);
  let base: string;
  if (custom) base = custom;
  else if (NAMED[id]) base = NAMED[id];
  else {
    let n = 0;
    for (let i = 0; i < id.length; i += 1) n = (n + id.charCodeAt(i) * (i + 1)) % PALETTE.length;
    base = PALETTE[n] ?? PALETTE[0];
  }
  return base;
}

export function colorFor(structure: Structure, categoryId: string): string {
  const cat = structure.categories.find((c) => c.id === categoryId);
  if (cat) return categoryColor(cat.id, cat.color);
  const buy = structure.purchases.find((p) => p.id === categoryId);
  if (buy) return categoryColor(buy.id, buy.color);
  return categoryColor(categoryId || "otros");
}

/** The day colour a line of this category shows (before any theme lights it); what the look pickers start from. */
export function baseFor(structure: Structure | undefined, categoryId: string): string {
  const cat = structure?.categories.find((c) => c.id === categoryId);
  if (cat) return categoryBase(cat.id, cat.color);
  const buy = structure?.purchases.find((p) => p.id === categoryId);
  if (buy) return categoryBase(buy.id, buy.color);
  return categoryBase(categoryId || "otros");
}

/** A palette swatch as the current theme will actually draw it. */
export function themeSwatch(hex: string): string {
  return isTron() ? tronize(hex) : hex;
}

// Palette colours on the Grid: keep each OKLCH hue, light them at two alternating levels with as much chroma as the screen
// allows, so all 24 stay clearly different in Tron too (plain HSL neon made neighbours collapse into the same orange or blue).
const neonCache = new Map<number, string>();
function paletteNeon(i: number): string {
  const hit = neonCache.get(i);
  if (hit) return hit;
  const hex = PALETTE[i];
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((k) => lin(parseInt(hex.slice(k, k + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s;
  const h = Math.atan2(B, A);
  const neutral = Math.hypot(A, B) < 0.05;
  const L2 = neutral ? 0.48 + (L - 0.42) * 0.9 : i % 2 === 0 ? 0.68 : 0.82;
  let C = neutral ? Math.min(Math.hypot(A, B), 0.05) : 0.24;
  let rgb = [0, 0, 0];
  for (; C >= 0; C -= 0.005) {
    const a = C * Math.cos(h), bb = C * Math.sin(h);
    const l_ = (L2 + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
    const m_ = (L2 - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
    const s_ = (L2 - 0.0894841775 * a - 1.291485548 * bb) ** 3;
    rgb = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_];
    if (rgb.every((v) => v >= -0.001 && v <= 1.001)) break;
  }
  const enc = (v: number) => { const c = Math.min(1, Math.max(0, v)); return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255); };
  const out = `rgb(${rgb.map(enc).join(" ")})`;
  neonCache.set(i, out);
  return out;
}
