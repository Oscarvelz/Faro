/**
 * Settings search for the top bar (1.3.142, Oscar 2026-11-08): the magnifier sits above every screen, Ajustes
 * included, so while you ARE in Ajustes it must also find what lives there — before, it only searched the
 * books, and a setting could not be found from the bar that hangs over it.
 *
 * The index is the manual itself: every topic whose `go` lands in Ajustes already knows its fold, its anchor
 * and its "Ajustes → …" path in both languages, so nothing is catalogued twice. The topics arrive through the
 * manual's lazy chunk (lib/manual/load), never through a static import — this module only takes them as data.
 * Matching mirrors the manual's own search (lib/manual/search): accent- and case-blind (ñ stays), every word
 * must appear, longer words forgive a typo.
 *
 * Etapa 2 (tres modos, hueco J-1): the search also takes the person's mode. A setting whose function sleeps
 * in that mode does not surface as a live destination — the hit list stays a list of places the mode can
 * actually open. The destination's function comes from the one registry (lib/faro/mode, featureForGo);
 * the default is Completo (a book with no mode chosen yet), where nothing sleeps and nothing is filtered.
 */
import type { Numbered } from "../manual/topics";
import type { GoLike } from "../manual/places";
import { featureForGo, hasFeature, modeReaches, type Mode } from "./mode";

export type SettingHit = {
  /** Manual topic id — the jump goes through goTopic, like every "Ir allí". */
  id: string;
  title: string;
  /** Where it lives, said plainly ("Ajustes → Estructura"). */
  where: string;
  go: GoLike;
};

const pick = (lang: string, pair: readonly [string, string]): string => (lang === "en" ? pair[1] : pair[0]);

/** Same fold as the manual search: accents go, ñ stays (año ≠ ano). */
function fold(s: string): string {
  return s
    .toLowerCase()
    .split("ñ")
    .map((part) => part.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    .join("ñ");
}

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

function hitWords(words: string[], text: string): boolean {
  const base = fold(text);
  const tokens = base.split(/[^a-z0-9ñ$%]+/).filter(Boolean);
  return words.every((w) => {
    if (base.includes(w)) return true;
    if (w.length < 5) return false;
    const limit = w.length >= 8 ? 2 : 1;
    return tokens.some((tok) => Math.abs(tok.length - w.length) <= limit && editDistance(w, tok) <= limit);
  });
}

function topicText(tp: Numbered, lang: string): string {
  return [tp.title, tp.sum, tp.what, tp.whatAlt, tp.how, tp.tip, tp.go?.where, ...(tp.terms ?? [])]
    .filter(Boolean)
    .map((pair) => pick(lang, pair as readonly [string, string]))
    .join(" ")
    .replace(/\[\[|\]\]/g, "");
}

/**
 * The settings a query finds, best first. Several topics can share one spot (seventeen import topics all land
 * on the same row): each spot appears once, under its best-ranked topic, so the list stays a list of places.
 */
export function searchSettings(topics: readonly Numbered[], query: string, lang: string, limit = 6, mode: Mode = "completo", topicModeOf?: (tp: Numbered) => Mode): SettingHit[] {
  const words = fold(query.trim()).split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return [];
  const q = words.join(" ");
  const rank = (tp: Numbered) => {
    const title = fold(pick(lang, tp.title)).replace(/[^a-z0-9ñ$% ]+/g, " ").replace(/\s+/g, " ").trim();
    if (title === q) return 0;
    if (title.startsWith(q)) return 1;
    if (words.every((w) => title.includes(w))) return 2;
    if (words.some((w) => title.includes(w))) return 3;
    // A listed term is a name too ("Catálogo" names the catalogue, though its topic is titled "Tiendas, IA…").
    if (words.every((w) => (tp.terms ?? []).some((pair) => fold(pick(lang, pair)).includes(w)))) return 3.5;
    if (words.some((w) => fold(pick(lang, tp.sum)).includes(w))) return 4;
    return 5;
  };
  const kind = (tp: Numbered) => (tp.id.startsWith("f-") ? 2 : tp.depth === "manual" ? 0 : 1);
  const ranked = topics
    .filter((tp) => tp.go?.screen === "settings" && (tp.go.anchor || tp.go.fold))
    // Etapa 2: un destino dormido en el modo de la persona no se ofrece como
    // destino vivo (el salto mismo se valida además en goTopic, el punto único).
    .filter((tp) => { const f = featureForGo(tp.go!); return !f || hasFeature(mode, f); })
    // Etapa 5 (la herencia de T-2): un tema que duerme en el modo tampoco
    // presta su título ni sus términos a un acierto — la búsqueda hereda el
    // metadato del Manual, no solo el destino. El resolvedor llega como dato
    // (topicMode vive en el chunk perezoso del Manual; este módulo jamás lo
    // importa estático). Sin resolvedor, nada se filtra por tema.
    .filter((tp) => !topicModeOf || modeReaches(mode, topicModeOf(tp)))
    .filter((tp) => hitWords(words, topicText(tp, lang)))
    .map((tp, i) => {
      const r = rank(tp);
      const k = kind(tp);
      return { tp, i, r: k === 2 && r >= 1 && r <= 3 ? 3.5 : r, k };
    })
    .sort((a, b) => a.r - b.r || a.k - b.k || a.i - b.i);
  const seen = new Set<string>();
  const out: SettingHit[] = [];
  for (const { tp } of ranked) {
    const go = tp.go!;
    const spot = `${go.fold ?? ""}|${go.anchor ?? ""}`;
    if (seen.has(spot)) continue;
    seen.add(spot);
    out.push({
      id: tp.id,
      title: pick(lang, tp.title),
      where: pick(lang, go.where),
      go: { screen: go.screen, anchor: go.anchor, fold: go.fold, lens: go.lens },
    });
    if (out.length >= limit) break;
  }
  return out;
}
