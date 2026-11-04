/* Subscription presets for Cobros → Debo → Cuotas (Nov 2026, 1.3.75).
 * Pool marks are brand-colour monograms or tiny inline paths drawn by SubMark (icons.tsx), no images.
 * The user's chosen chips live in the ledger (subPresets), so they sync and back up; old ledgers have none (= defaults). */
import type { LedgerState, SubPreset } from "./types";

/** id, name ES, name EN (when it differs), plate colour, letter colour, monogram or shape ("@play", "@ring", "@wave", "@note", "@cloud", "@wifi", "@phone", "@gym"). */
export const SUB_POOL: [string, string, string, string, string, string][] = [
  ["netflix", "Netflix", "", "#e50914", "#fff", "N"],
  ["youtube", "YouTube", "", "#ff0033", "#fff", "@play"],
  ["ytmusic", "YouTube Music", "", "#ff0033", "#fff", "@ring"],
  ["prime", "Prime Video", "", "#1a98ff", "#fff", "prime"],
  ["spotify", "Spotify", "", "#1ed760", "#000", "@wave"],
  ["disney", "Disney+", "", "#113ccf", "#fff", "D+"],
  ["max", "Max", "", "#002be7", "#fff", "max"],
  ["appletv", "Apple TV+", "", "#111", "#fff", "tv"],
  ["applemusic", "Apple Music", "", "#fa243c", "#fff", "@note"],
  ["icloud", "iCloud", "", "#3693f3", "#fff", "@cloud"],
  ["googleone", "Google One", "", "#1a73e8", "#fff", "1"],
  ["chatgpt", "ChatGPT", "", "#10a37f", "#fff", "AI"],
  ["paramount", "Paramount+", "", "#0064ff", "#fff", "P+"],
  ["xbox", "Xbox", "", "#107c10", "#fff", "X"],
  ["playstation", "PlayStation", "", "#00439c", "#fff", "PS"],
  ["internet", "Internet", "", "#3f6f8f", "#fff", "@wifi"],
  ["phone", "Teléfono", "Phone", "#5b6b7c", "#fff", "@phone"],
  ["gym", "Gimnasio", "Gym", "#9a5b2e", "#fff", "@gym"],
];

export const SUB_DEFAULT = ["youtube", "netflix", "prime", "internet"];

export function poolOf(id: string) {
  return SUB_POOL.find((row) => row[0] === id);
}

export function poolName(id: string, lang: string): string {
  const row = poolOf(id);
  return row ? (lang === "en" && row[2] ? row[2] : row[1]) : "";
}

/** The chips to show, in order. Old ledgers (no field) get the defaults. */
export function subPresetsOf(state: LedgerState | null | undefined): SubPreset[] {
  const raw = state?.subPresets;
  if (!Array.isArray(raw)) return SUB_DEFAULT.map((id) => ({ id }));
  return raw.filter((p) => p && typeof p.id === "string" && (poolOf(p.id) || (typeof p.name === "string" && p.name.trim())))
    .map((p) => ({ id: p.id, ...(typeof p.name === "string" && p.name.trim() ? { name: p.name.trim().slice(0, 40) } : {}), ...(typeof p.icon === "string" && p.icon.startsWith("data:image/") ? { icon: p.icon } : {}) }));
}

export function presetName(p: SubPreset, lang: string): string {
  return p.name || poolName(p.id, lang);
}

/** The Line.icon a chosen preset gives the saved Cuota ("" = the generic ↻). */
export function presetIcon(p: SubPreset): string {
  if (p.icon) return `sub:${p.icon}`;
  return poolOf(p.id) ? `sub:${p.id}` : "";
}

/** A typed name that matches a pool brand or a custom preset gets its mark. */
export function iconForName(name: string, presets: SubPreset[], lang: string): string {
  const n = name.trim().toLowerCase();
  if (!n) return "";
  const own = presets.find((p) => presetName(p, lang).toLowerCase() === n);
  if (own) return presetIcon(own);
  const hit = SUB_POOL.find((row) => row[1].toLowerCase() === n || (row[2] && row[2].toLowerCase() === n) || (row[0] === "prime" && n === "prime"));
  return hit ? `sub:${hit[0]}` : "";
}
