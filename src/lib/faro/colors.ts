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

export function categoryColor(id: string, chosen?: string): string {
  const custom = chosen?.trim();
  if (custom) return custom;
  if (NAMED[id]) return NAMED[id];
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n + id.charCodeAt(i) * (i + 1)) % PALETTE.length;
  return PALETTE[n] ?? PALETTE[0];
}

export function colorFor(structure: Structure, categoryId: string): string {
  const cat = structure.categories.find((c) => c.id === categoryId);
  if (cat) return categoryColor(cat.id, cat.color);
  const buy = structure.purchases.find((p) => p.id === categoryId);
  if (buy) return categoryColor(buy.id, buy.color);
  return categoryColor(categoryId || "otros");
}
