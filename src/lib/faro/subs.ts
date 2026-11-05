/* Subscription presets for Cobros → Debo → Cuotas (Nov 2026, 1.3.75) and the Cuotas icon library (1.3.100).
 * Pool marks are brand-colour plates with a Simple Icons path ("si:<slug>", CC0, lazy-loaded from brand-paths.ts), a
 * monogram, or a tiny inline shape drawn by SubMark (icons.tsx). No images.
 * The user's chosen chips live in the ledger (subPresets), so they sync and back up; old ledgers have none (= defaults).
 * Library presets the user deleted are listed in `ledger.subIconsOff` (same pattern as retiroOff): the deletion sticks and
 * syncs, a restore clears it, and old ledgers (no field) show the whole library. Existing lines are never touched. */
import type { LedgerState, SubPreset } from "./types";

/** id, name ES, name EN (when it differs), plate colour, letter colour, mark: "si:<slug>", a monogram or a shape ("@play", "@ring", "@wave", "@note", "@cloud", "@wifi", "@phone", "@gym", "@game", "@book", "@app", "@bolt"). */
export const SUB_POOL: [string, string, string, string, string, string][] = [
  ["netflix", "Netflix", "", "#e50914", "#fff", "si:netflix"],
  ["youtube", "YouTube", "", "#ff0033", "#fff", "si:youtube"],
  ["ytpremium", "YouTube Premium", "", "#282828", "#ff3347", "si:youtube"],
  ["ytmusic", "YouTube Music", "", "#ff0033", "#fff", "si:youtubemusic"],
  ["prime", "Prime Video", "", "#1a98ff", "#fff", "prime"],
  ["amazonprime", "Amazon Prime", "", "#232f3e", "#fff", "prime"],
  ["spotify", "Spotify", "", "#1ed760", "#000", "si:spotify"],
  ["disney", "Disney+", "", "#113ccf", "#fff", "D+"],
  ["max", "HBO Max", "", "#002be7", "#fff", "si:hbomax"],
  ["hulu", "Hulu", "", "#1ce783", "#0b0c0f", "hulu"],
  ["paramount", "Paramount+", "", "#0064ff", "#fff", "si:paramountplus"],
  ["peacock", "Peacock", "", "#111", "#fff", "P"],
  ["appletv", "Apple TV+", "", "#111", "#fff", "si:appletv"],
  ["crunchyroll", "Crunchyroll", "", "#ff5e00", "#fff", "si:crunchyroll"],
  ["applemusic", "Apple Music", "", "#fa243c", "#fff", "si:applemusic"],
  ["audible", "Audible", "", "#f8991c", "#fff", "si:audible"],
  ["icloud", "iCloud", "", "#3693f3", "#fff", "si:icloud"],
  ["appleone", "Apple One", "", "#1d1d1f", "#fff", "One"],
  ["googleone", "Google One", "", "#1a73e8", "#fff", "si:google"],
  ["m365", "Microsoft 365", "", "#d83b01", "#fff", "365"],
  ["dropbox", "Dropbox", "", "#0061ff", "#fff", "si:dropbox"],
  ["chatgpt", "ChatGPT", "", "#10a37f", "#fff", "AI"],
  ["claude", "Claude", "", "#d97757", "#fff", "si:claude"],
  ["gemini", "Gemini", "", "#1a73e8", "#fff", "si:googlegemini"],
  ["adobe", "Adobe", "", "#fa0f00", "#fff", "A"],
  ["canva", "Canva", "", "#00a8b5", "#fff", "Ca"],
  ["xbox", "Xbox Game Pass", "", "#107c10", "#fff", "X"],
  ["playstation", "PlayStation Plus", "", "#00439c", "#fff", "si:playstation"],
  ["nintendo", "Nintendo Online", "", "#e60012", "#fff", "N"],
  ["kindle", "Kindle Unlimited", "", "#146eb4", "#fff", "KU"],
  ["duolingo", "Duolingo", "", "#58cc02", "#fff", "si:duolingo"],
  ["internet", "Internet", "", "#3f6f8f", "#fff", "@wifi"],
  ["phone", "Teléfono", "Phone", "#5b6b7c", "#fff", "@phone"],
  ["gym", "Gimnasio", "Gym", "#9a5b2e", "#fff", "@gym"],
  ["g-video", "Video", "Video", "#4a5a78", "#fff", "@play"],
  ["g-music", "Música", "Music", "#6a4a8a", "#fff", "@note"],
  ["g-cloud", "Nube", "Cloud", "#3f6f8f", "#fff", "@cloud"],
  ["g-game", "Juegos", "Games", "#3d6a4a", "#fff", "@game"],
  ["g-book", "Lectura", "Reading", "#7a5a2e", "#fff", "@book"],
  ["g-app", "App", "App", "#4a4f6a", "#fff", "@app"],
  ["g-bolt", "Luz", "Power", "#8a6a12", "#fff", "@bolt"],
];

export type SubGroup = "video" | "music" | "cloud" | "games" | "learn" | "home";
/** Library sections, in order, with ES/EN titles of matching length. */
export const SUB_GROUPS: [SubGroup, string, string][] = [
  ["video", "Video y TV", "Video & TV"],
  ["music", "Música y audio", "Music & audio"],
  ["cloud", "Nube y apps", "Cloud & apps"],
  ["games", "Juegos", "Games"],
  ["learn", "Lectura y estudio", "Reading & study"],
  ["home", "Servicios", "Services"],
];
const GROUP_OF: Record<string, SubGroup> = {
  netflix: "video", youtube: "video", ytpremium: "video", prime: "video", amazonprime: "video", disney: "video", max: "video", hulu: "video",
  paramount: "video", peacock: "video", appletv: "video", crunchyroll: "video", "g-video": "video",
  spotify: "music", ytmusic: "music", applemusic: "music", audible: "music", "g-music": "music",
  icloud: "cloud", appleone: "cloud", googleone: "cloud", m365: "cloud", dropbox: "cloud", chatgpt: "cloud", claude: "cloud", gemini: "cloud", adobe: "cloud", canva: "cloud", "g-cloud": "cloud", "g-app": "cloud",
  xbox: "games", playstation: "games", nintendo: "games", "g-game": "games",
  kindle: "learn", duolingo: "learn", "g-book": "learn",
  internet: "home", phone: "home", gym: "home", "g-bolt": "home",
};
export const groupOf = (id: string): SubGroup => GROUP_OF[id] ?? "home";

/** Extra names a typed Concepto may use for a brand (normalised: lowercase, no accents, "+" → "plus"). */
const ALIASES: Record<string, string[]> = {
  youtube: ["youtube", "yt"],
  ytpremium: ["youtube premium", "yt premium"],
  ytmusic: ["youtube music", "yt music"],
  prime: ["prime video"],
  amazonprime: ["amazon prime", "prime", "amazon"],
  disney: ["disney plus", "disney"],
  max: ["hbo max", "hbo", "max"],
  paramount: ["paramount plus", "paramount"],
  peacock: ["peacock"],
  appletv: ["apple tv plus", "apple tv"],
  applemusic: ["apple music"],
  icloud: ["icloud", "icloud plus"],
  appleone: ["apple one"],
  googleone: ["google one", "google drive"],
  m365: ["microsoft 365", "office 365", "office", "microsoft"],
  chatgpt: ["chatgpt", "chat gpt", "openai", "gpt plus"],
  claude: ["claude", "anthropic"],
  gemini: ["gemini", "google gemini"],
  adobe: ["adobe", "creative cloud", "photoshop", "acrobat", "lightroom"],
  xbox: ["xbox game pass", "game pass", "gamepass", "xbox"],
  playstation: ["playstation plus", "ps plus", "playstation", "psn"],
  nintendo: ["nintendo online", "nintendo switch online", "nintendo"],
  kindle: ["kindle unlimited", "kindle"],
  internet: ["internet", "wifi", "fibra", "cable"],
  phone: ["telefono", "celular", "movil", "phone", "metropcs", "metro pcs", "t mobile", "tmobile", "verizon", "att", "claro", "tigo"],
  gym: ["gimnasio", "gym", "planet fitness", "la fitness"],
  "g-bolt": ["luz", "electricidad", "energia", "power", "electric"],
  "g-music": ["musica", "music"],
  "g-book": ["libros", "books", "revista", "periodico"],
};

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

/* ---------- Icon library (1.3.100) ---------- */

/** Library ids the user deleted (old ledgers: none). */
export function libraryOff(state: LedgerState | null | undefined): Set<string> {
  const raw = state?.subIconsOff;
  return new Set(Array.isArray(raw) ? raw.filter((id) => typeof id === "string") : []);
}

/** The library rows still offered, in pool order. */
export function libraryOf(state: LedgerState | null | undefined) {
  const off = libraryOff(state);
  return SUB_POOL.filter((row) => !off.has(row[0]));
}

/** Delete one preset from the library. The deletion sticks (and syncs); lines already using its icon keep it. */
export function dropLibraryIcon(state: LedgerState, id: string): LedgerState {
  if (!poolOf(id)) return state;
  const off = libraryOff(state);
  if (off.has(id)) return state;
  return { ...state, subIconsOff: [...off, id] };
}

/** Bring every deleted preset back. Same state when nothing was deleted. */
export function restoreLibrary(state: LedgerState): LedgerState {
  if (!state.subIconsOff) return state;
  const { subIconsOff: _drop, ...rest } = state;
  return rest as LedgerState;
}

export const normName = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, " ").trim();

/** The library brand a typed name points at ("Netflix Premium" → netflix, "HBO" → max, "Office 365" → m365), or "". */
export function matchBrand(name: string, off: Set<string> = new Set()): string {
  const n = normName(name);
  if (!n) return "";
  const spaced = ` ${n} `;
  const tight = n.replace(/ /g, "");
  let best = "";
  let bestLen = 0;
  for (const row of SUB_POOL) {
    const id = row[0];
    if (off.has(id)) continue;
    const keys = new Set([normName(row[1]), ...(row[2] ? [normName(row[2])] : []), ...(ALIASES[id] ?? [])]);
    for (const key of keys) {
      if (!key) continue;
      const k = key.replace(/ /g, "");
      const hit = spaced.includes(` ${key} `) || tight === k || (k.length >= 6 && tight.startsWith(k));
      if (hit && key.length > bestLen) { best = id; bestLen = key.length; }
    }
  }
  return best;
}

/** A typed name that matches a custom preset or a library brand gets its mark. */
export function iconForName(name: string, presets: SubPreset[], lang: string, off?: Set<string>): string {
  const n = name.trim().toLowerCase();
  if (!n) return "";
  const own = presets.find((p) => presetName(p, lang).toLowerCase() === n);
  if (own) return presetIcon(own);
  const hit = matchBrand(name, off);
  return hit ? `sub:${hit}` : "";
}
