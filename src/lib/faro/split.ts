import type { SectionId } from "./types";

const BOOKS = ["income", "fixed", "variable", "shops", "subs"] as const;
const STUDY = ["stats", "advice"] as const;

export const SPLIT_MIN = 6;
export const SPLIT_MAX = 94;

export function clampSplit(pct: number): number {
  if (!Number.isFinite(pct)) return 46;
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(pct)));
}

export function pairedSection(current: SectionId): SectionId {
  if (current === "desk" || current === "settings") return "income";
  if (current === "stats" || current === "advice") return "desk";
  return "stats";
}

export function stepSection(section: SectionId, delta: number): SectionId {
  const loop: readonly SectionId[] = (BOOKS as readonly string[]).includes(section)
    ? BOOKS
    : (STUDY as readonly string[]).includes(section)
      ? STUDY
      : ["desk"];
  const at = Math.max(0, loop.indexOf(section));
  return loop[(at + delta + loop.length) % loop.length] ?? section;
}

export function isSplitSection(value: string | null): value is SectionId {
  return value === "desk" || value === "income" || value === "fixed" || value === "variable" || value === "shops" || value === "subs" || value === "stats" || value === "advice";
}
