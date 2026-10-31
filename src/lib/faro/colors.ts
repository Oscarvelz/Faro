import type { Structure } from "./types";

export const PALETTE = [
  "#e7b1a0",
  "#f3b788",
  "#f2d56a",
  "#d5e7a4",
  "#cfe3c8",
  "#97d8b3",
  "#8bd3cd",
  "#98d0e5",
  "#a5c5ee",
  "#bec3f3",
  "#d4b3e6",
  "#ecb3d3",
  "#f0b0b8",
  "#c8c2b4",
  "#d8b896",
];

const NAMED: Record<string, string> = {
  "f-casa": "#b7d4c4",
  "f-transporte": "#f0cb8a",
  "f-familia": "#f0b7c4",
  "f-seguros": "#b7c7e8",
  "f-ahorro": "#cfe3c8",
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
 * Tron (Legacy) has two sides: users in cyan, programs in Clu's orange.
 * Warm colors become shades of orange, cool ones shades of cyan, keeping each
 * category apart by hue step and lightness. Only while the Tron theme is on.
 */
export function tronize(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const l = (max + min) / 2;
  const warm = h >= 300 || h < 80 || d < 0.08;
  const step = warm ? ((h + 60) % 360) / 140 : (h - 80) / 220;
  const hue = warm ? 16 + Math.min(1, step) * 30 : 176 + Math.min(1, Math.max(0, step)) * 34;
  const light = 50 + Math.round(Math.max(0, Math.min(1, (l - 0.45) / 0.4)) * 16);
  return `hsl(${hue.toFixed(0)} 100% ${light}%)`;
}

export function categoryColor(id: string, chosen?: string): string {
  const custom = chosen?.trim();
  let base: string;
  if (custom) base = custom;
  else if (NAMED[id]) base = NAMED[id];
  else {
    let n = 0;
    for (let i = 0; i < id.length; i += 1) n = (n + id.charCodeAt(i) * (i + 1)) % PALETTE.length;
    base = PALETTE[n] ?? PALETTE[0];
  }
  return isTron() ? tronize(base) : base;
}

export function colorFor(structure: Structure, categoryId: string): string {
  const cat = structure.categories.find((c) => c.id === categoryId);
  if (cat) return categoryColor(cat.id, cat.color);
  const buy = structure.purchases.find((p) => p.id === categoryId);
  if (buy) return categoryColor(buy.id, buy.color);
  return categoryColor(categoryId || "otros");
}
