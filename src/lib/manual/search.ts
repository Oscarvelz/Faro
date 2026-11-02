/** Manual search: accent- and case-blind, every word must appear, longer words forgive a typo. */
import { pick, topicText, type Numbered } from "./topics";

export function fold(s: string): string {
  // Accents go, ñ stays (año ≠ ano).
  return s
    .toLowerCase()
    .split("ñ")
    .map((part) => part.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    .join("ñ");
}

/** fold() one character at a time keeps positions aligned with the original text (for <mark>). */
export function foldAligned(text: string): string {
  return Array.from(text, (ch) => fold(ch).charAt(0) || ch).join("");
}

export function queryWords(q: string): string[] {
  return fold(q.trim()).split(/\s+/).filter((w) => w.length >= 2);
}

export const plain = (s: string) => s.replace(/\[\[|\]\]/g, "");

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const next = a[i - 1] === b[j - 1] ? prev : Math.min(prev, row[j - 1]!, row[j]!) + 1;
      prev = row[j]!;
      row[j] = next;
    }
  }
  return row[b.length]!;
}

export function manualHit(words: string[], text: string): boolean {
  if (!words.length) return true;
  const base = fold(text);
  const tokens = base.split(/[^a-z0-9ñ$%]+/).filter(Boolean);
  return words.every((w) => {
    if (base.includes(w)) return true;
    if (w.length < 5) return false;
    const limit = w.length >= 8 ? 2 : 1;
    return tokens.some((tok) => Math.abs(tok.length - w.length) <= limit && editDistance(w, tok) <= limit);
  });
}

/**
 * Ranking: the title IS the query > the title starts with it > every word in the title > some word in the title > summary > body.
 * Within a tier, concepts come before form fields (ids "f-…"), and manual entries before short tips; ties keep manual order.
 */
export function searchTopics(all: Numbered[], words: string[], lang: string): Numbered[] {
  if (!words.length) return [];
  const q = words.join(" ");
  const rank = (tp: Numbered) => {
    const title = fold(pick(lang, tp.title)).replace(/[^a-z0-9ñ$% ]+/g, " ").replace(/\s+/g, " ").trim();
    if (title === q) return 0;
    if (title.startsWith(q)) return 1;
    if (words.every((w) => title.includes(w))) return 2;
    if (words.some((w) => title.includes(w))) return 3;
    if (words.some((w) => fold(pick(lang, tp.sum)).includes(w))) return 4;
    return 5;
  };
  const kind = (tp: Numbered) => (tp.id.startsWith("f-") ? 2 : tp.depth === "manual" ? 0 : 1);
  return all
    .filter((tp) => manualHit(words, topicText(tp, lang)))
    // A form field whose title matches ranks after every concept whose title matches ("meta": Meta, Meta de ahorro… then "Nombre de la meta").
    .map((tp, i) => { const r = rank(tp); const k = kind(tp); return { tp, i, r: k === 2 && r >= 1 && r <= 3 ? 3.5 : r, k }; })
    .sort((a, b) => a.r - b.r || a.k - b.k || a.i - b.i)
    .map((x) => x.tp);
}

/** Matched ranges [start, end) of the query words inside text (merged). */
export function hitRanges(text: string, words: string[]): [number, number][] {
  if (!words.length) return [];
  const base = foldAligned(text);
  const hits: [number, number][] = [];
  for (const w of words) {
    let i = base.indexOf(w);
    while (i >= 0) {
      hits.push([i, i + w.length]);
      i = base.indexOf(w, i + w.length);
    }
  }
  hits.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const h of hits) {
    const last = merged[merged.length - 1];
    if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]);
    else merged.push([h[0], h[1]]);
  }
  return merged;
}

export function snippet(text: string, words: string[], size = 120): string {
  const base = fold(text);
  const hit = words.map((w) => base.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (hit == null || text.length <= size) return text.length <= size ? text : `${text.slice(0, size).trimEnd()}…`;
  let start = Math.max(0, hit - 40);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space > 0 && space < hit) start = space + 1;
  }
  let end = Math.min(text.length, start + size);
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > hit) end = space;
  }
  const piece = text.slice(start, end).trim().replace(/[,;:]$/, "");
  return `${start > 0 ? "…" : ""}${piece}${end < text.length ? "…" : ""}`;
}
