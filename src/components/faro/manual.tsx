import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, ChevronDown, ChevronLeft, Info, Lightbulb, ListChecks, ListOrdered, Search, SearchX, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { loadManual, manualNow, type ManualData } from "@/lib/manual/load";
import { glow, justPopped, reduced } from "@/lib/manual/nav";
import { hitRanges, plain, queryWords, searchTopics, snippet } from "@/lib/manual/search";
import type { L, Numbered } from "@/lib/manual/topics";
import { modeReaches } from "@/lib/faro/mode";
import { Mark } from "./icons";
import { useFaroRoot } from "./provider";
import { richBlocks, richText } from "./manual-text";
import { ManualFigure } from "./manual-figure";
import { selectAllOnFocus, useIdleClear } from "./search-behavior";
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

/* 1.3.420 — LA FORMA PREMIUM DEL MANUAL (diseño cerrado con Oscar el
 * 2026-11-22, maquetas a6/a7): cada entrada es una tarjeta de cabecera
 * (placa con su número, el capítulo por rótulo, el título en serif y su
 * suma) y cada parte vive en su propia bandeja hundida, cuya cabecera —
 * la ÚNICA en el acento del tema — lleva su ícono y la línea dorada que
 * se apaga tras su nombre. Dentro: la figura del tema si la declara, y
 * la idea clave en su tarjeta ✦ con el arranque en negritas del acento.
 * El Manual viste los tokens del tema, como toda superficie. */
function IdeaCard({ text, data, onLink, self }: { text: string; data: ManualData; onLink: (term: string) => void; self: string }) {
  const m = /^([^:]{2,42}):\s+(.+)$/s.exec(text);
  return (
    <div className="mn-idea">
      <span className="mn-idea-star" aria-hidden>✦</span>
      <p className="mn-idea-p">
        {m && !m[1]!.includes("[[")
          ? <><b className="mn-idea-lead">{richText(`${m[1]}:`, data, onLink, { self })}</b> {richText(m[2]!, data, onLink, { self })}</>
          : richText(text, data, onLink, { self })}
      </p>
    </div>
  );
}

function EntryBody({ tp, say, data, linkFrom, t, lang }: {
  tp: Numbered;
  say: (pair: L) => string;
  data: ManualData;
  linkFrom: (entryId: string) => (term: string) => void;
  t: (key: string) => string;
  lang: "es" | "en";
}) {
  const onLink = linkFrom(tp.id);
  return (
    <>
      <header className="mn-head">
        <p className="mn-kick"><span className="mn-plate">{tp.num}</span><span className="mn-kick-ch">{say(tp.chapter.title)}</span></p>
        <h3 className="mn-entry-title">{say(tp.title)}</h3>
        <p className="mn-sum">{say(tp.sum)}</p>
      </header>
      <section className="mn-tray">
        <h4 className="mn-tray-h"><Info aria-hidden /><span>{t("manual.what")}</span></h4>
        {(() => { const seen = new Set<string>(); return <>
          {richBlocks(say(tp.what), data, onLink, { self: tp.id, seen })}
          {tp.whatAlt ? richBlocks(say(tp.whatAlt), data, onLink, { self: tp.id, seen }) : null}
        </>; })()}
        <ManualFigure topicId={tp.id} lang={lang} />
        {tp.idea ? <IdeaCard text={say(tp.idea)} data={data} onLink={onLink} self={tp.id} /> : null}
      </section>
      {tp.how ? (
        <section className="mn-tray">
          <h4 className="mn-tray-h"><ListChecks aria-hidden /><span>{t("manual.how")}</span></h4>
          {richBlocks(say(tp.how), data, onLink, { self: tp.id })}
        </section>
      ) : null}
      {tp.tip ? (
        <section className="mn-tray">
          <h4 className="mn-tray-h"><Lightbulb aria-hidden /><span>{t("manual.tip")}</span></h4>
          {richBlocks(say(tp.tip), data, onLink, { self: tp.id })}
        </section>
      ) : null}
    </>
  );
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
  const { t, lang, ui, mode } = root;
  const { MANUAL_CHAPTERS, MANUAL_TOPICS, findTopic, pick, alphaIndex, topicMode } = data;
  const say = (pair: L) => pick(lang, pair);
  const want = ui.manual ?? "";
  const current = want && want !== "@az" ? findTopic(want) : null;
  const scroller = useRef<HTMLDivElement>(null);
  const findRef = useRef<HTMLInputElement>(null);
  const [findOn, setFindOn] = useState(false);
  const [needle, setNeedle] = useState("");
  useIdleClear(needle, () => setNeedle(""));
  const [openCh, setOpenCh] = useState<string[]>(() => (current ? [current.chapter.id] : []));
  const words = useMemo(() => queryWords(needle), [needle]);
  /* El Manual se recompone por modo (fallo 25 + T-2, etapa 5): un tema cuya
   * función duerme en el modo de la persona no aparece en el índice, ni en
   * la búsqueda, ni en el A–Z — y un capítulo que se queda vacío, tampoco.
   * Los temas no se borran: duermen y vuelven intactos al subir. La
   * numeración que se muestra es la canónica del tema (su dirección), así
   * que un modo menor ve huecos donde duermen temas — la dirección de un
   * tema nunca cambia con el modo. */
  const topicAlive = (tp: (typeof MANUAL_TOPICS)[number]) => modeReaches(mode, topicMode(tp));
  // Ola 1 (SALIDAS-1, la guarda de la capa): si el tema abierto DUERME en el
  // modo actual — una caída vieja, un enlace profundo, un cambio de modo con
  // el Manual abierto — el Manual volvía a su índice en vez de buscar para
  // siempre una entrada que su propio filtro no pinta.
  // Ola 5 (O5-C5): la guarda cambia de forma, no de propósito. La entrada
  // ahora EXISTE: el tema dormido abierto a propósito (el puente «Más en el
  // manual →» de su burbuja, una caída sin tema vivo que la explique) se
  // pinta como explicación suelta en el cuerpo — con su aviso («Eso vive
  // en… Aquí tienes su explicación», y ahí la segunda frase es verdad),
  // sin «Ir allí» (la función duerme: el botón caería en círculo) y fuera
  // de capítulos, índice y buscador, que se siguen recomponiendo por modo.
  // Ningún llamador deja a la persona sobre una explicación que no existe,
  // porque ahora existe; y nadie la encuentra sin haberla pedido por su
  // nombre.
  const currentDormant = current ? !topicAlive(current) : false;
  const chapters = useMemo(
    () => MANUAL_CHAPTERS.map((ch, ci) => ({ ch, ci, topics: ch.topics.filter((tp) => topicAlive({ ...tp, chapter: ch } as (typeof MANUAL_TOPICS)[number])) })).filter((x) => x.topics.length > 0),
    [MANUAL_CHAPTERS, mode],
  );
  const visibleCount = useMemo(() => chapters.reduce((n, x) => n + x.topics.length, 0), [chapters]);
  const results = useMemo(() => searchTopics(MANUAL_TOPICS, words, lang).filter(topicAlive), [MANUAL_TOPICS, words, lang, mode]);
  const alpha = useMemo(
    () => alphaIndex(lang)
      .map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, topics: it.topics.filter(topicAlive) })).filter((it) => it.topics.length > 0) }))
      .filter((g) => g.items.length > 0),
    [alphaIndex, lang, mode],
  );
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

  // Topic anchors stop below the sticky top bar (bar height + 12px) whenever the browser scrolls one into view.
  useLayoutEffect(() => {
    const sc = scroller.current;
    const top = sc?.querySelector<HTMLElement>(".mn-top");
    if (!sc || !top) return;
    const set = () => sc.style.setProperty("--mn-bar", `${top.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(top);
    return () => ro.disconnect();
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

  // Tablet/desktop: the open chapter's rail marks the entry being read (the last entry whose top passed the reading line).
  const [spy, setSpy] = useState("");
  useEffect(() => {
    const sc = scroller.current;
    if (!sc || !openCh.length) { setSpy(""); return; }
    let raf = 0;
    const read = () => {
      raf = 0;
      if (!window.matchMedia("(min-width: 900px)").matches) return;
      const line = sc.getBoundingClientRect().top + (sc.querySelector<HTMLElement>(".mn-top")?.offsetHeight ?? 64) + 24;
      let here = "";
      for (const el of sc.querySelectorAll<HTMLElement>(".mn-ch.is-open .mn-entry")) {
        const r = el.getBoundingClientRect();
        if (r.top <= line) here = el.id.slice(3);
        else break;
      }
      setSpy((was) => (was === here ? was : here));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    sc.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { sc.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [openCh]);
  // Keep the marked rail entry in view inside the rail's own scroll.
  useEffect(() => {
    if (!spy) return;
    const btn = scroller.current?.querySelector<HTMLElement>(`.mn-ch-list button[data-to="${spy}"]`);
    const rail = btn?.closest<HTMLElement>(".mn-ch-rail");
    if (!btn || !rail || rail.scrollHeight <= rail.clientHeight) return;
    const b = btn.getBoundingClientRect(), r = rail.getBoundingClientRect();
    if (b.top < r.top + 40 || b.bottom > r.bottom - 40) rail.scrollTop += b.top - r.top - rail.clientHeight / 2;
  }, [spy]);
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
    const dest = data.linkDest(term);
    if (!dest) return;
    // Ola 1 (SALIDAS-1): 28 enlaces [[…]] apuntaban a temas que DUERMEN en
    // el modo de la persona; si el salto caía, goTopic abría el Manual en
    // ese tema — que el propio Manual filtra — y la explicación prometida
    // no existía. Si el tema destino duerme, la explicación de la caída es
    // la entrada que se está leyendo (que sí existe); el aviso de goTopic
    // nombra el modo donde la función vive.
    const tp = findTopic(dest.topic);
    const explain = tp && !topicAlive(tp) ? entryId : undefined;
    root.goTopic(dest.topic, dest.go, entryId, explain);
  };

  const backLabel = (root.depth > 1 ? t("manual.back").replace("{screen}", root.backName()) : t("manual.home")).replace(/\ba el\b/, "al");
  const goBack = () => {
    if (root.depth > 1) history.back();
    else root.setUi({ manual: null, section: "settings" });
  };

  return (
    <div className="mn-layer" ref={scroller} role="dialog" aria-modal="true" aria-label={t("manual.title")} data-entry={want} lang={lang}>
      <div className="mn-top">
        <button type="button" className="mn-back" data-anchor="mn-back" onClick={goBack}>
          <ChevronLeft aria-hidden />
          {findOn ? <span className="sr-only">{backLabel}</span> : <span className="mn-back-text">{backLabel}</span>}
          <kbd className="mn-esc" aria-hidden>Esc</kbd>
        </button>
        {findOn ? (
          <div className="search-pill mn-find" role="search" data-anchor="mn-find">
            <Search className="size-4" aria-hidden />
            <input
              ref={findRef}
              type="search"
              enterKeyHint="search"
              value={needle}
              placeholder={t("manual.search")}
              aria-label={t("manual.searchLabel")}
              onFocus={selectAllOnFocus}
              onChange={(e) => setNeedle(e.target.value)}
            />
            <button type="button" className="mn-find-x" aria-label={t("manual.clear")} onClick={shutFind}><X aria-hidden /></button>
          </div>
        ) : (
          <button type="button" className="icon-btn mn-find-btn" data-anchor="mn-findbtn" aria-label={t("manual.searchLabel")} onClick={() => setFindOn(true)}>
            <Search className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {searching ? (
        <section className="mn-results" aria-live="polite" data-anchor="mn-results">
          <p className="mn-count">{results.length === 0 ? t("manual.none") : results.length === 1 ? t("manual.result") : t("manual.results").replace("{n}", String(results.length))}</p>
          {results.length === 0 ? (
            <p className="mn-empty"><SearchX aria-hidden /><span>{t("manual.try")}</span></p>
          ) : (
            <ul className="mn-hits">
              {results.map((tp) => {
                const body = [tp.sum, tp.what, tp.whatAlt, tp.how, tp.tip, tp.idea].filter(Boolean).map((p) => plain(say(p as L)));
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
        <header className="mn-cover" data-anchor="mn-cover">
          <p className="mn-kicker"><Mark className="mn-mark" bold /><span>Faro · {t("manual.title")}</span></p>
          <h1 className="mn-cover-title">{t("manual.cover")}</h1>
          <p className="mn-cover-sub">{t("manual.coverSub")}</p>
          <div className="mn-cover-row">
            <button type="button" className="mn-btn" data-anchor="mn-azbtn" onClick={() => jump("@az")}><ListOrdered aria-hidden /><span>{t("manual.az")}</span></button>
            <span className="mn-cover-count">{t("manual.chapters").replace("{c}", String(chapters.length)).replace("{t}", String(visibleCount))}</span>
          </div>
        </header>

        {current && currentDormant ? (
          <article id={`mn-${current.id}`} className="mn-entry mn-entry-dormant" data-depth={current.depth} data-anchor="mn-current">
            <p className="mn-dormant-note">{t("mode.dormant.notice").replace("{name}", t(`mode.${topicMode(current)}`))}</p>
            <EntryBody tp={current} say={say} data={data} linkFrom={linkFrom} t={t} lang={lang} />
          </article>
        ) : null}

        <nav className="mn-toc" aria-label={t("manual.contents")}>
          <h2 className="mn-toc-title"><BookOpen aria-hidden /><span>{t("manual.contents")}</span></h2>
          {chapters.map(({ ch, ci, topics }) => {
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
                  <span className="mn-ch-count">{topics.length}</span>
                  <ChevronDown className="mn-ch-chev" aria-hidden />
                </button>
                {isOpen ? (
                  <div className="mn-ch-body">
                    <div className="mn-ch-rail">
                    <p className="mn-ch-railhead" aria-hidden><span className="mn-ch-num">{ci + 1}</span><span>{say(ch.title)}</span></p>
                    <p className="mn-ch-intro">{say(ch.intro)}</p>
                    <ol className="mn-ch-list">
                      {topics.map((tp) => (
                        <li key={tp.id}>
                          <button type="button" data-to={tp.id} aria-current={spy === tp.id ? "location" : undefined} onClick={() => jump(tp.id)}>
                            <span className="mn-num">{findTopic(tp.id)!.num}</span>
                            <span>{say(tp.title)}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                    </div>
                    <div className="mn-ch-entries">
                    {topics.map((tp0) => {
                      const tp = findTopic(tp0.id)!;
                      return (
                        <article key={tp.id} id={`mn-${tp.id}`} className={`mn-entry${current?.id === tp.id ? " is-current" : ""}`} data-depth={tp.depth} data-anchor={current?.id === tp.id ? "mn-current" : undefined}>
                          <EntryBody tp={tp} say={say} data={data} linkFrom={linkFrom} t={t} lang={lang} />
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
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>

        <section id="mn-az" className="mn-az" data-anchor="mn-az">
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
