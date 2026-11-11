import { Fragment, type ReactNode } from "react";
import type { ManualData } from "@/lib/manual/load";
import type { Go } from "@/lib/manual/topics";

/**
 * How names render in one bubble or one manual paragraph.
 * `self`: the topic this text explains (a name of that very thing is not linked). `here`: true when a place is the
 * one on screen (no link to where you already are). `seen`: share one Set across the texts of one paragraph, so a
 * name is linked once. `still`: the bubble sits in a form or sheet with typing in progress; names keep the dotted
 * mark (they still read as names) but are not links, so a tap can never throw that typing away.
 */
export type TermCtx = { self?: string; here?: (go: Go) => boolean; seen?: Set<string>; still?: boolean };

/**
 * Bubble and manual text. `[[Term]]` is a proper name of something in Faro (a screen, a book, a side, a button):
 * it reads as a name (thin dotted underline, same colour and weight as the text) and is a link that jumps there.
 * A name that is not the link here — the topic's own name, a repeat, the place already on screen — still reads
 * as a name: the same dotted underline on a plain span. Known feature names written bare (NAME_TERMS) get that
 * same span. Since 1.3.209 the dotted values are Brizna's `.name-ref` ones (see manual.css): the name reads
 * apart from its sentence, with a pause, whether it navigates or not.
 */
export function richText(text: string, data: ManualData, onLink: (term: string) => void, ctx: TermCtx = {}): ReactNode {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  const out: ReactNode[] = [];
  const seen = ctx.seen ?? new Set<string>();
  const selfTitle = ctx.self ? data.findTopic(ctx.self)?.title : undefined;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!;
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const term = part.slice(2, -2);
      const dest = data.linkDest(term);
      const key = dest ? `${dest.go.screen}|${dest.go.fold ?? ""}|${dest.go.anchor ?? dest.topic}` : term;
      const plain = !dest
        || dest.topic === ctx.self
        || (selfTitle && (selfTitle[0] === term || selfTitle[1] === term))
        || seen.has(key)
        || !!ctx.here?.(dest.go);
      let node: ReactNode;
      if (!dest) node = <span className="faro-name">{term}</span>;
      else if (plain) node = <span className="faro-name">{term}</span>;
      else if (ctx.still) { seen.add(key); node = <span className="term-link is-still">{term}</span>; }
      else {
        seen.add(key);
        node = (
          <button
            type="button"
            className="term-link hint-link"
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
      }
      // A full stop or comma right after a link never wraps onto a line of its own: the link and its punctuation stay together.
      const next = parts[i + 1] ?? "";
      const punct = /^[.,;:!?)»”]+/.exec(next)?.[0] ?? "";
      if (punct && typeof node !== "string") {
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
    out.push(<span key={i} className="faro-name">{m[0]}</span>);
    at = i + m[0].length;
  }
  if (!out.length) return text;
  if (at < text.length) out.push(text.slice(at));
  return out;
}
