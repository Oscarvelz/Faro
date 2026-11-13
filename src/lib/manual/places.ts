/**
 * Where a manual topic lives in Faro, as provider state. Tiny on purpose: it ships in the main bundle,
 * while the manual's text (topics.ts, links.ts) loads only when a (?) or the manual is opened.
 */
import type { SectionId } from "@/lib/faro/types";

/** Libros' lower rows: the savings row and (1.3.92) the Deudas row (owed = Me deben, owe = Debo). */
export type VaultTab = "save" | "meta" | "retiro" | "emergencia" | "owed" | "owe";

export type GoLike = {
  screen: string;
  anchor?: string;
  fold?: string;
  lens?: string;
};

export type PlacePatch = {
  section?: SectionId;
  vault?: VaultTab | null;
  instruments?: boolean;
  manual?: null;
};

const SECTIONS: SectionId[] = ["desk", "income", "fixed", "variable", "shops", "subs", "stats", "advice", "settings", "historial", "archivo"];

/** Provider patch for a topic's `go`, plus the `faro-open` id to fire once the screen is there. */
export function screenPatch(go: GoLike): { patch: PlacePatch; open: string[] } {
  const open: string[] = [];
  if (go.fold) open.push(go.fold);
  if (go.lens) open.push(`lens-${go.lens}`);
  const s = go.screen;
  if (s === "top") return { patch: { manual: null }, open };
  if (s === "cobros") return { patch: { section: "desk", vault: null, manual: null }, open: ["cobros", ...(go.anchor && go.anchor !== "cobros" ? [go.anchor] : []), ...open] };
  if (s.startsWith("vault-")) return { patch: { section: "income", vault: s.slice(6) as VaultTab, manual: null }, open };
  if (s === "tools") return { patch: { instruments: true, manual: null }, open };
  if ((SECTIONS as string[]).includes(s)) {
    const books = ["income", "fixed", "variable", "shops", "subs"].includes(s);
    return { patch: { section: s as SectionId, ...(books || s === "desk" ? { vault: null } : {}), manual: null }, open };
  }
  return { patch: { manual: null }, open };
}

type Pair = [string, string];
const NAMES: Record<string, Pair> = {
  desk: ["Central", "Desk"],
  income: ["Ingresos", "Income"],
  fixed: ["Fijos", "Fixed"],
  variable: ["Variables", "Variable"],
  shops: ["Compras", "Shopping"],
  subs: ["Cuotas", "Plans"],
  stats: ["Estudio", "Study"],
  advice: ["Asesor", "Advisor"],
  settings: ["Ajustes", "Settings"],
  historial: ["Historial", "History"],
  archivo: ["Archivo", "Archive"],
  save: ["Ahorros", "Savings"],
  meta: ["Meta", "Goal"],
  retiro: ["Retiro", "Retirement"],
  emergencia: ["Emergencia", "Emergency"],
  owed: ["Me deben", "Owed to me"],
  owe: ["Debo", "I owe"],
  tools: ["Cambio", "Exchange"],
  manual: ["el manual", "the manual"],
};

/** Plain name of a place, for "Volver a …". */
export function placeName(place: { section: SectionId; vault?: VaultTab | null; instruments?: boolean; manual?: string | null }, lang: string): string {
  const key = place.manual !== null && place.manual !== undefined
    ? "manual"
    : place.instruments
      ? "tools"
      : place.vault && ["income", "fixed", "variable", "shops", "subs"].includes(place.section)
        ? place.vault
        : place.section;
  const pair = NAMES[key] ?? NAMES.desk!;
  return lang === "en" ? pair[1] : pair[0];
}

const BOOKS = ["income", "fixed", "variable", "shops", "subs"];
/** Anchors that only mark a screen (its tabs or selector), not a spot on it. */
const SCREEN_ANCHORS = new Set(["books-tabs", "debt-scale", "vault-tabs"]);

/**
 * Is `go` the place on screen right now? Then a name of it is not linked (you are already there).
 * Only whole screens count: a link to a fold or a spot on this same screen still scrolls and glows it.
 */
export function isHere(go: GoLike, ui: { section: SectionId; vault?: VaultTab | null; instruments?: boolean; manual?: string | null }): boolean {
  if (ui.manual !== null && ui.manual !== undefined) return false;
  if (go.fold || go.lens || (go.anchor && !SCREEN_ANCHORS.has(go.anchor))) return false;
  const s = go.screen;
  if (s === "tools") return !!ui.instruments;
  if (ui.instruments || s === "top" || s === "cobros") return false;
  if (s.startsWith("vault-")) return BOOKS.includes(ui.section) && ui.vault === s.slice(6);
  if (BOOKS.includes(s)) return ui.section === s && !ui.vault;
  return ui.section === s;
}
