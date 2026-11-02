import { Fragment, type ReactNode } from "react";
import type { ManualData } from "@/lib/manual/load";

/**
 * Bubble and manual text. `[[Term]]` is a link that jumps straight to that place in the app; known feature
 * names that are not links get a gentle emphasis (same colour, a little weight, no underline).
 */
export function richText(text: string, data: ManualData, onLink: (term: string) => void): ReactNode {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  const out: ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!;
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const term = part.slice(2, -2);
      const dest = data.linkDest(term);
      const node = !dest ? <b className="faro-name">{term}</b> : (
        <button
          type="button"
          className="hint-link"
          data-link={term}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLink(term);
          }}
        >
          {term}
        </button>
      );
      // A full stop or comma right after a link never wraps onto a line of its own: the link and its punctuation stay together.
      const next = parts[i + 1] ?? "";
      const punct = /^[.,;:!?)»”]+/.exec(next)?.[0] ?? "";
      if (punct) {
        out.push(<span key={i} className="mn-join">{node}{punct}</span>);
        parts[i + 1] = next.slice(punct.length);
      } else out.push(<Fragment key={i}>{node}</Fragment>);
      continue;
    }
    out.push(<Fragment key={i}>{emphasize(part, data.NAME_TERMS)}</Fragment>);
  }
  return out;
}

const cache = new Map<string, RegExp>();
function namesRe(names: readonly string[]): RegExp {
  const key = names.join("|");
  let re = cache.get(key);
  if (!re) {
    const alts = [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    // Whole words only (letters on either side break the match), case-sensitive: "Queda" yes, "queda" no.
    re = new RegExp(`(?<![\\p{L}\\p{N}])(${alts.join("|")})(?![\\p{L}\\p{N}])`, "gu");
    cache.set(key, re);
  }
  return re;
}

function emphasize(text: string, names: readonly string[]): ReactNode {
  if (!text || !names.length) return text;
  const re = namesRe(names);
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > at) out.push(text.slice(at, i));
    out.push(<b key={i} className="faro-name">{m[0]}</b>);
    at = i + m[0].length;
  }
  if (!out.length) return text;
  if (at < text.length) out.push(text.slice(at));
  return out;
}
