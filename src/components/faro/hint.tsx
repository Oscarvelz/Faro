import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Calculator, CircleHelp } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { isHere } from "@/lib/manual/places";
import { loadManual, manualNow, type ManualData } from "@/lib/manual/load";
import { useFaroRoot } from "./provider";
import { richText } from "./manual-text";
import "./manual.css";

/** Where a bubble may sit: inside the form or card it belongs to (never clipped by it, never wider than it). */
const HOST = ".cobro-form, .line-edit, .ah-form, .sc-form, .form-block, .look-dock, .card, .stat-fold, main, .tool-sheet, .mn-layer, .imp-pick, .imp-sheet";

/** Forms and sheets where leaving would drop what is being typed or reviewed. */
const STILL = ".cobro-form, .line-edit, .ah-form, .sc-form, .form-block, .look-dock, .imp-sheet, .imp-pick, .stm-sheet, [data-anchor=\"card-scan\"], [data-anchor=\"card-form\"], [data-anchor=\"card-redeem-sheet\"]";

/**
 * The (?) bubble. Its text is the topic's `what`, word for word (lib/manual/topics.ts), so the bubble and the
 * manual's "Qué es" can never disagree — unless the topic carries a short `bubble` text of its own, written
 * only for quick help while the manual keeps the depth. Manual-tier topics add "Más en el manual →".
 * `calc` adds "Ver el cálculo" for live-number sheets (the Explain sheet with this month's figures).
 * Solid, small, beside the button (below or above, whichever fits). Esc, a tap outside or phone back close it.
 */
export function Hint({
  topic,
  alt = false,
  calc,
  className = "",
  label,
  avoid,
  fallback,
  fitParent = false,
  corner = false,
  overlay = false,
  group,
}: {
  topic: string;
  alt?: boolean;
  calc?: () => void;
  className?: string;
  label?: string;
  /** "<container> <target>": hide this (?) while it would touch that element (tight layouts, large text). */
  avoid?: string;
  /** "<text>|<obstacle>" inside the avoid container: before hiding, try sitting right after the last line of <text>, clear of <obstacle>. */
  fallback?: string;
  /** The (?) ends a title: if the (?) alone would push the title onto another line, the title gives up ≤ 10% of its size instead. */
  fitParent?: boolean;
  /** Corner placement: the (?) sits in its container's bottom-right corner (CSS `.is-corner` per container), takes no room in the row of
   *  buttons beside it, and stays hidden if it would ever come within 4px of one of them (never on a button, never in its corner). */
  corner?: boolean;
  /** With `corner`: the (?) is meant to float over the controls' own corner (savings tab bar), so it is never hidden for being near them. */
  overlay?: boolean;
  /** Sibling (?)s (the three lenses): all show, or all step aside together, so one never shows beside a hidden twin. */
  group?: string;
}) {
  const root = useFaroRoot();
  const { t, lang } = root;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ManualData | null>(manualNow);
  const ref = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const close = () => setOpen(false);
  useLayer(open, close);
  const [tight, setTight] = useState(false);

  // Never let a (?) sit on top of words: where it would, it steps aside (the screen's own (?) and the manual still explain it).
  useLayoutEffect(() => {
    if (!avoid) return;
    const [boxSel, ...rest] = avoid.split(" ");
    const box = ref.current?.closest(boxSel!);
    const sel = rest.join(" ");
    const whole = sel.startsWith("@"); // "@<sel>": avoid the element's whole box, not just its words
    // No target ("<container>" alone): only keep the (?) inside the container's edges.
    const target = sel ? box?.querySelector(whole ? sel.slice(1) : sel) : null;
    if (!box || (sel && !target) || !btn.current) return;
    const me = ref.current!;
    const check = () => {
      me.style.left = ""; me.style.top = ""; me.style.right = ""; me.removeAttribute("data-moved");
      let a: DOMRect | null = null;
      if (target) { const r = document.createRange(); r.selectNodeContents(target); a = whole ? target.getBoundingClientRect() : r.getBoundingClientRect(); }
      const b = btn.current!.getBoundingClientRect();
      const svg = btn.current!.querySelector("svg")?.getBoundingClientRect() ?? b;
      const bx = box.getBoundingClientRect();
      const out = svg.right > bx.right - 2 || svg.left < bx.left + 2; // never on or past the container's edge
      const gap = parseFloat(getComputedStyle(me).getPropertyValue("--hint-gap")) || 2; // the clear space it keeps from the words it avoids
      const hit = out || (!!a && svg.left < a.right + gap && svg.right > a.left - gap && svg.top < a.bottom && svg.bottom > a.top);
      if (hit && fallback) {
        // Fitting placement first: just after the last line of the fallback text, if the icon clears the obstacle and the edge.
        const [textSel, obstacleSel] = fallback.split("|");
        const text = box.querySelector(textSel!);
        const ob = obstacleSel ? box.querySelector(obstacleSel)?.getBoundingClientRect() : null;
        const pos = me.offsetParent?.getBoundingClientRect();
        if (text && pos) {
          const tr = document.createRange(); tr.selectNodeContents(text);
          const rects = [...tr.getClientRects()].filter((x) => x.width > 0);
          const last = rects[rects.length - 1];
          const edge = box.getBoundingClientRect().right - 6;
          if (last) {
            const ox = svg.left - b.left, oy = svg.top - b.top;
            const x = last.right + 4, y = last.top + last.height / 2 - svg.height / 2;
            const fits = x + svg.width <= edge && (!ob || x + svg.width < ob.left - 8 || y > ob.bottom || y + svg.height < ob.top);
            if (fits) {
              me.style.right = "auto";
              me.style.left = `${Math.round(x - ox - pos.left)}px`;
              me.style.top = `${Math.round(y - oy - pos.top)}px`;
              me.setAttribute("data-moved", "");
              setTight(false);
              return;
            }
          }
        }
      }
      if (group) { me.dataset.hit = hit ? "1" : "0"; window.dispatchEvent(new CustomEvent("faro-hint-group", { detail: group })); }
      else setTight(hit);
    };
    // Grouped: hidden when any sibling of the group has to step aside (decided from the siblings' own checks, not from timing).
    const regroup = (e?: Event) => {
      if (!group || (e && (e as CustomEvent).detail !== group)) return;
      const all = Array.from(document.querySelectorAll<HTMLElement>(`.hint[data-group="${group}"]`)).filter((h) => h.getClientRects().length);
      setTight(all.some((h) => h.dataset.hit !== "0"));
    };
    window.addEventListener("faro-hint-group", regroup);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(box);
    if (target?.parentElement && target.parentElement !== box) ro.observe(target.parentElement); // the target's own box can change size without the container doing so
    // The words it avoids can change width without any box resizing: the web font arriving, or fit.ts shrinking a kicker.
    // Check again after each, so the (?) settles the same way on every load (it used to depend on which came first).
    let live = true;
    void document.fonts?.ready.then(() => { if (live) check(); });
    window.addEventListener("faro-fit", check);
    return () => { live = false; ro.disconnect(); window.removeEventListener("faro-fit", check); window.removeEventListener("faro-hint-group", regroup); };
  }, [avoid, fallback, lang, group]);

  // Corner (?): never within 4px of an independent control in its container.
  useLayoutEffect(() => {
    if (!corner || overlay) return;
    const me = ref.current; const box = me?.parentElement; if (!me || !box) return;
    const check = () => {
      const g = btn.current?.querySelector("svg")?.getBoundingClientRect(); if (!g || !g.width) return;
      const clash = [...box.querySelectorAll<HTMLElement>("button, a[href], [role='tab'], input, select, textarea")].some((c) => {
        if (me.contains(c)) return false;
        const q = c.getBoundingClientRect(); if (!q.width) return false;
        return g.left < q.right + 4 && g.right > q.left - 4 && g.top < q.bottom + 4 && g.bottom > q.top - 4;
      });
      if (clash) me.setAttribute("data-clash", ""); else me.removeAttribute("data-clash");
      setTight(clash);
    };
    check();
    const ro = new ResizeObserver(check); ro.observe(box);
    let live = true;
    void document.fonts?.ready.then(() => { if (live) check(); });
    window.addEventListener("faro-fit", check);
    return () => { live = false; ro.disconnect(); window.removeEventListener("faro-fit", check); };
  }, [corner, overlay, lang]);

  useLayoutEffect(() => {
    if (!fitParent) return;
    const me = ref.current; const h = (me?.parentElement?.classList.contains("hint-glue") ? me.parentElement.parentElement : me?.parentElement) as HTMLElement | null; if (!me || !h) return;
    const lines = () => { const cs = getComputedStyle(h); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25; return Math.round(h.getBoundingClientRect().height / lh); };
    const fit = () => {
      h.style.fontSize = ""; h.style.lineHeight = "";
      const n = lines(); if (n < 2) return;
      me.style.display = "none"; const alone = lines(); me.style.display = "";
      if (alone >= n) return; // the title wraps on its own (long words, large text): leave it as it was
      const base = parseFloat(getComputedStyle(h).fontSize);
      const lh = getComputedStyle(h).lineHeight; if (lh !== "normal") h.style.lineHeight = lh; // the line keeps its height: only the letters shrink
      for (let k = 0.98; k >= 0.899; k -= 0.02) { h.style.fontSize = `${(base * k).toFixed(2)}px`; if (lines() <= alone) return; }
      h.style.fontSize = ""; h.style.lineHeight = "";
    };
    fit();
    // Re-fit on the next frame, not inside the observer callback: resizing the title there re-triggers the observer (ResizeObserver loop error).
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); }); if (h.parentElement) ro.observe(h.parentElement);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [fitParent, lang]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      const n = e.target as Node;
      if (ref.current?.contains(n) || pop.current?.contains(n)) return;
      setOpen(false);
    };
    const other = (e: Event) => { if ((e as CustomEvent).detail !== ref.current) setOpen(false); };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("faro-tip", other);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("faro-tip", other);
    };
  }, [open]);

  // Any move to another place closes it.
  const where = `${root.ui.section}|${root.ui.vault}|${root.ui.manual}|${root.ui.spot}|${root.ui.year}-${root.ui.month}`;
  const firstWhere = useRef(where);
  useEffect(() => {
    if (firstWhere.current !== where) setOpen(false);
    firstWhere.current = where;
  }, [where]);

  useLayoutEffect(() => {
    const el = pop.current;
    if (!open || !el) return;
    const place = () => {
      const b = btn.current?.getBoundingClientRect();
      if (!b) return;
      if (b.bottom < 0 || b.top > window.innerHeight) { setOpen(false); return; }
      const host = ref.current?.closest(HOST) as HTMLElement | null;
      const hr = host?.getBoundingClientRect();
      const lo = Math.max(10, hr ? hr.left + 4 : 10);
      const hi = Math.min(window.innerWidth - 10, hr ? hr.right - 4 : window.innerWidth - 10);
      const maxW = Math.max(180, Math.min(300, hi - lo));
      el.style.maxWidth = `${maxW}px`;
      const inner = el.querySelector<HTMLElement>(".hint-scroll");
      if (inner) inner.style.maxHeight = "none";
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const mid = b.left + b.width / 2;
      const left = Math.min(window.innerWidth - 10 - w, Math.max(lo, Math.min(mid - 18, hi - w)));
      // Visible band: the visual viewport (keyboard), minus the sticky top chrome and the fixed dock when the (?) sits on the page under them.
      const vv = window.visualViewport;
      let ceil = vv ? vv.offsetTop : 0;
      let floor = vv ? vv.offsetTop + vv.height : window.innerHeight;
      if (!ref.current?.closest(".mn-layer, [role='dialog'], .tool-sheet, .xp-scrim")) {
        for (const bar of document.querySelectorAll<HTMLElement>(".top-chrome, .dock")) {
          if (bar.contains(ref.current)) continue;
          const r = bar.getBoundingClientRect();
          if (!r.height || getComputedStyle(bar).visibility === "hidden") continue;
          if (r.top > window.innerHeight / 2) floor = Math.min(floor, r.top);
          else ceil = Math.max(ceil, r.bottom);
        }
      }
      const below = floor - b.bottom - 18;
      const above = b.top - ceil - 18;
      const down = h <= below || (h > above && below >= above);
      const room = down ? below : above;
      if (h > room && inner) inner.style.maxHeight = `${Math.max(64, room) - 18}px`;
      const hh = Math.min(h, Math.max(64, room));
      el.style.left = `${Math.round(left)}px`;
      el.style.top = `${Math.round(down ? b.bottom + 8 : b.top - 8 - hh)}px`;
      el.style.setProperty("--ftip-x", `${Math.max(12, Math.min(w - 12, mid - left))}px`);
      el.dataset.side = down ? "below" : "above";
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true } as EventListenerOptions);
    };
  }, [open, data, lang]);

  const entry = data?.findTopic(topic) ?? null;
  const onLink = (term: string) => {
    const dest = data?.linkDest(term);
    if (!dest) return;
    setOpen(false);
    root.goTopic(dest.topic, dest.go);
  };
  // A bubble inside a form or sheet with typing in progress: names keep their dotted mark but do not navigate.
  const still = open && !!ref.current?.closest(STILL);

  return (
    <span className={`ftip hint${corner ? " is-corner" : ""}${className ? ` ${className}` : ""}${tight ? " is-tight" : ""}`} ref={ref} data-topic={topic} data-group={group}>
      <button
        ref={btn}
        type="button"
        className="ftip-btn"
        aria-label={label ?? t("hint.label")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) { setOpen(false); return; }
          document.dispatchEvent(new CustomEvent("faro-tip", { detail: ref.current }));
          if (data) setOpen(true);
          else void loadManual().then((d) => { setData(d); setOpen(true); });
        }}
      >
        <CircleHelp aria-hidden />
      </button>
      {open && entry && data
        ? createPortal(
            <span ref={pop} className="ftip-pop hint-pop" role="dialog" aria-label={data.pick(lang, entry.title)} data-hint={topic} onPointerDown={(e) => e.stopPropagation()}>
              <span className="hint-scroll">
              <span className="hint-text">{richText(data.bubbleText(entry, lang, alt), data, onLink, { self: entry.id, here: (go) => isHere(go, root.ui), still })}</span>
              {calc || entry.depth === "manual" ? (
                <span className="hint-acts">
                  {calc ? (
                    <button type="button" className="hint-act" onClick={(e) => { e.stopPropagation(); setOpen(false); calc(); }}>
                      <Calculator aria-hidden />
                      <span>{t("manual.calc")}</span>
                    </button>
                  ) : null}
                  {entry.depth === "manual" ? (
                    <button type="button" className="hint-more" onClick={(e) => { e.stopPropagation(); setOpen(false); root.openManual(entry.moreId ?? entry.id); }}>
                      <span>{t("manual.more")}</span>
                      <ArrowRight aria-hidden />
                    </button>
                  ) : null}
                </span>
              ) : null}
              </span>
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
