import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, ChevronDown, ChevronLeft, Lightbulb, ListOrdered, Search, SearchX, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { loadManual, manualNow, type ManualData } from "@/lib/manual/load";
import { glow, justPopped, reduced } from "@/lib/manual/nav";
import { hitRanges, plain, queryWords, searchTopics, snippet } from "@/lib/manual/search";
import type { L, Numbered } from "@/lib/manual/topics";
import { Mark } from "./icons";
import { useFaroRoot } from "./provider";
import { richText } from "./manual-text";
import "./manual.css";

/** Wrap the query words in <mark>, accent- and case-blind. */
function marked(text: string, words: string[]): ReactNode {
  const ranges = hitRanges(text, words);
  if (!ranges.length) return text;
  const chars = Array.from(text);
  const out: ReactNode[] = [];
  let at = 0;
  ranges.forEach(([a, b], i) => {
    if (a > at) out.push(chars.slice(at, a).join(""));
    out.push(<mark key={i}>{chars.slice(a, b).join("")}</mark>);
    at = b;
  });
  if (at < chars.length) out.push(chars.slice(at).join(""));
  return out;
}

/** Bring an element under the sticky top row of the manual: a long way snaps most of it, the last stretch glides. */
function bringIn(scroller: HTMLElement, el: HTMLElement, instant = false) {
  const top = scroller.querySelector<HTMLElement>(".mn-top");
  const room = (top?.offsetHeight ?? 56) + 10;
  const target = Math.max(0, scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - room);
  if (instant || reduced()) { scroller.scrollTo({ top: target, behavior: "auto" }); return; }
  const gap = target - scroller.scrollTop;
  if (Math.abs(gap) > 1800) scroller.scrollTo({ top: target - Math.sign(gap) * 360, behavior: "auto" });
  scroller.scrollTo({ top: target, behavior: "smooth" });
}

export default function ManualLayer() {
  const [data, setData] = useState<ManualData | null>(manualNow);
  useEffect(() => {
    if (!data) void loadManual().then(setData);
  }, [data]);
  if (!data) return <div className="mn-layer is-loading" role="dialog" aria-modal="true" aria-busy="true" />;
  return <Manual data={data} />;
}

function Manual({ data }: { data: ManualData }) {
  const root = useFaroRoot();
  const { t, lang, ui } = root;
  const { MANUAL_CHAPTERS, MANUAL_TOPICS, findTopic, pick, alphaIndex } = data;
  const say = (pair: L) => pick(lang, pair);
  const want = ui.manual ?? "";
  const current = want && want !== "@az" ? findTopic(want) : null;
  const scroller = useRef<HTMLDivElement>(null);
  const findRef = useRef<HTMLInputElement>(null);
  const [findOn, setFindOn] = useState(false);
  const [needle, setNeedle] = useState("");
  const [openCh, setOpenCh] = useState<string[]>(() => (current ? [current.chapter.id] : []));
  const words = useMemo(() => queryWords(needle), [needle]);
  const results = useMemo(() => searchTopics(MANUAL_TOPICS, words, lang), [MANUAL_TOPICS, words, lang]);
  const alpha = useMemo(() => alphaIndex(lang), [alphaIndex, lang]);
  const searching = needle.trim().length > 0;
  const shutFind = () => { setFindOn(false); setNeedle(""); };
  // The search is a small layer of its own: Esc or phone back clears and closes it first.
  useLayer(findOn, shutFind);

  // While the manual is open the app underneath stays mounted and keeps its scroll; it just cannot be reached.
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("manual-open");
    const frame = document.querySelector<HTMLElement>(".app-frame");
    frame?.setAttribute("inert", "");
    frame?.setAttribute("aria-hidden", "true");
    return () => {
      html.classList.remove("manual-open");
      frame?.removeAttribute("inert");
      frame?.removeAttribute("aria-hidden");
    };
  }, []);

  // Arrive at the entry the (?) came from: open its chapter, bring it in, glow it once. Back/forward: no glow.
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    if (!want) { if (!justPopped()) sc.scrollTo({ top: 0 }); return; }
    const entry = want === "@az" ? null : findTopic(want);
    if (entry) setOpenCh((list) => (list.includes(entry.chapter.id) ? list : [...list, entry.chapter.id]));
    const quiet = justPopped();
    let tries = 0;
    let timer = 0;
    const go = () => {
      const el = document.getElementById(want === "@az" ? "mn-az" : `mn-${entry?.id}`);
      if (!el) { if (tries++ < 30) timer = window.setTimeout(go, 40); return; }
      bringIn(sc, el, quiet);
      if (!quiet && entry) window.setTimeout(() => glow(el, 3000), reduced() ? 0 : 380);
    };
    timer = window.setTimeout(go, 30);
    return () => window.clearTimeout(timer);
  }, [want, findTopic]);

  useEffect(() => {
    if (findOn) findRef.current?.focus({ preventScroll: true });
  }, [findOn]);
  useEffect(() => {
    if (searching) scroller.current?.scrollTo({ top: 0 });
  }, [searching]);

  /** Open an entry inside the manual: a real step, so back returns to where you were reading. */
  const jump = (id: string) => {
    shutFind();
    if (id === want) {
      const el = document.getElementById(id === "@az" ? "mn-az" : `mn-${id}`);
      if (el && scroller.current) {
        bringIn(scroller.current, el);
        if (id !== "@az") window.setTimeout(() => glow(el, 3000), reduced() ? 0 : 380);
      }
      return;
    }
    root.setUi({ manual: id });
  };

  const goThere = (tp: Numbered) => {
    if (!tp.go) return;
    // Back from the app lands on this entry (the one whose button you tapped), not where the manual opened.
    root.goTopic(tp.id, tp.go, tp.id);
  };
  const linkFrom = (entryId: string) => (term: string) => {
    const id = data.LINKS[term];
    const dest = id ? findTopic(id) : null;
    if (!dest?.go) return;
    root.goTopic(dest.id, dest.go, entryId);
  };

  const backLabel = (root.depth > 1 ? t("manual.back").replace("{screen}", root.backName()) : t("manual.home")).replace(/\ba el\b/, "al");
  const goBack = () => {
    if (root.depth > 1) history.back();
    else root.setUi({ manual: null, section: "settings" });
  };

  return (
    <div className="mn-layer" ref={scroller} role="dialog" aria-modal="true" aria-label={t("manual.title")} data-entry={want} lang={lang}>
      <div className="mn-top">
        <button type="button" className="mn-back" onClick={goBack}>
          <ChevronLeft aria-hidden />
          {findOn ? <span className="sr-only">{backLabel}</span> : <span className="mn-back-text">{backLabel}</span>}
          <kbd className="mn-esc" aria-hidden>Esc</kbd>
        </button>
        {findOn ? (
          <div className="search-pill mn-find" role="search">
            <Search className="size-4" aria-hidden />
            <input
              ref={findRef}
              type="search"
              enterKeyHint="search"
              value={needle}
              placeholder={t("manual.search")}
              aria-label={t("manual.searchLabel")}
              onChange={(e) => setNeedle(e.target.value)}
            />
            <button type="button" className="mn-find-x" aria-label={t("manual.clear")} onClick={shutFind}><X aria-hidden /></button>
          </div>
        ) : (
          <button type="button" className="icon-btn mn-find-btn" aria-label={t("manual.searchLabel")} onClick={() => setFindOn(true)}>
            <Search className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {searching ? (
        <section className="mn-results" aria-live="polite">
          <p className="mn-count">{results.length === 0 ? t("manual.none") : results.length === 1 ? t("manual.result") : t("manual.results").replace("{n}", String(results.length))}</p>
          {results.length === 0 ? (
            <p className="mn-empty"><SearchX aria-hidden /><span>{t("manual.try")}</span></p>
          ) : (
            <ul className="mn-hits">
              {results.map((tp) => {
                const body = [tp.sum, tp.what, tp.whatAlt, tp.how, tp.tip].filter(Boolean).map((p) => plain(say(p as L)));
                const hit = body.find((b) => hitRanges(b, words).length) ?? body[0]!;
                return (
                  <li key={tp.id}>
                    <button type="button" className="mn-hit" data-hit={tp.id} onClick={() => jump(tp.id)}>
                      <span className="mn-hit-main">
                        <span className="mn-hit-title"><span className="mn-num">{tp.num}</span>{marked(say(tp.title), words)}</span>
                        <span className="mn-hit-text">{marked(snippet(hit, words), words)}</span>
                        <span className="mn-hit-ch">{say(tp.chapter.title)}</span>
                      </span>
                      <ArrowRight className="mn-hit-arrow" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <div className={`mn-body${searching ? " is-hidden" : ""}`}>
        <header className="mn-cover">
          <p className="mn-kicker"><Mark className="mn-mark" bold /><span>Faro · {t("manual.title")}</span></p>
          <h1 className="mn-cover-title">{t("manual.cover")}</h1>
          <p className="mn-cover-sub">{t("manual.coverSub")}</p>
          <div className="mn-cover-row">
            <button type="button" className="mn-btn" onClick={() => jump("@az")}><ListOrdered aria-hidden /><span>{t("manual.az")}</span></button>
            <span className="mn-cover-count">{t("manual.chapters").replace("{c}", String(MANUAL_CHAPTERS.length)).replace("{t}", String(MANUAL_TOPICS.length))}</span>
          </div>
        </header>

        <nav className="mn-toc" aria-label={t("manual.contents")}>
          <h2 className="mn-toc-title"><BookOpen aria-hidden /><span>{t("manual.contents")}</span></h2>
          {MANUAL_CHAPTERS.map((ch, ci) => {
            const isOpen = openCh.includes(ch.id);
            return (
              <section key={ch.id} className={`mn-ch${isOpen ? " is-open" : ""}`} id={`mn-ch-${ch.id}`}>
                <button
                  type="button"
                  className="mn-ch-row"
                  aria-expanded={isOpen}
                  onClick={() => setOpenCh((list) => (list.includes(ch.id) ? list.filter((x) => x !== ch.id) : [...list, ch.id]))}
                >
                  <span className="mn-ch-num">{ci + 1}</span>
                  <span className="mn-ch-name">{say(ch.title)}</span>
                  <span className="mn-ch-count">{ch.topics.length}</span>
                  <ChevronDown className="mn-ch-chev" aria-hidden />
                </button>
                {isOpen ? (
                  <div className="mn-ch-body">
                    <p className="mn-ch-intro">{say(ch.intro)}</p>
                    <ol className="mn-ch-list">
                      {ch.topics.map((tp, ti) => (
                        <li key={tp.id}>
                          <button type="button" onClick={() => jump(tp.id)}>
                            <span className="mn-num">{ci + 1}.{ti + 1}</span>
                            <span>{say(tp.title)}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                    {ch.topics.map((tp0) => {
                      const tp = findTopic(tp0.id)!;
                      return (
                        <article key={tp.id} id={`mn-${tp.id}`} className={`mn-entry${current?.id === tp.id ? " is-current" : ""}`} data-depth={tp.depth}>
                          <h3 className="mn-entry-title"><span className="mn-num">{tp.num}</span><span>{say(tp.title)}</span></h3>
                          <p className="mn-sum">{say(tp.sum)}</p>
                          <dl className="mn-parts">
                            <div>
                              <dt>{t("manual.what")}</dt>
                              <dd>
                                {richText(say(tp.what), data, linkFrom(tp.id))}
                                {tp.whatAlt ? <>{" "}{richText(say(tp.whatAlt), data, linkFrom(tp.id))}</> : null}
                              </dd>
                            </div>
                            {tp.how ? (
                              <div>
                                <dt>{t("manual.how")}</dt>
                                <dd>{richText(say(tp.how), data, linkFrom(tp.id))}</dd>
                              </div>
                            ) : null}
                            {tp.tip ? (
                              <div className="mn-tip">
                                <dt><Lightbulb aria-hidden /><span>{t("manual.tip")}</span></dt>
                                <dd>{richText(say(tp.tip), data, linkFrom(tp.id))}</dd>
                              </div>
                            ) : null}
                          </dl>
                          {tp.go ? (
                            <div className="mn-go-row">
                              <button type="button" className="mn-go" data-go={tp.id} onClick={() => goThere(tp)}>
                                <span>{t("manual.go")}</span>
                                <ArrowRight aria-hidden />
                              </button>
                              <span className="mn-where">{say(tp.go.where)}</span>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>

        <section id="mn-az" className="mn-az">
          <h2 className="mn-toc-title"><ListOrdered aria-hidden /><span>{t("manual.az")}</span></h2>
          <p className="mn-az-note">{t("manual.azNote")}</p>
          <div className="mn-az-cols">
            {alpha.map((group) => (
              <Fragment key={group.letter}>
                <div className="mn-az-group">
                  <p className="mn-az-letter">{group.letter}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.term} className="mn-az-row">
                        {item.topics.length === 1 ? (
                          <button type="button" className="mn-az-line" onClick={() => jump(item.topics[0]!.id)}>
                            <span className="mn-az-term">{item.term}</span>
                            <span className="mn-az-dots" aria-hidden />
                            <span className="mn-az-num">{item.topics[0]!.num}</span>
                          </button>
                        ) : (
                          <span className="mn-az-line">
                            <span className="mn-az-term">{item.term}</span>
                            <span className="mn-az-dots" aria-hidden />
                            <span className="mn-az-nums">
                              {item.topics.map((tp) => (
                                <button key={tp.id} type="button" className="mn-az-num" aria-label={`${item.term}, ${tp.num}`} onClick={() => jump(tp.id)}>{tp.num}</button>
                              ))}
                            </span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </Fragment>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
