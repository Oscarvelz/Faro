import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Pin } from "lucide-react";
import type { CashSankey, StudyBoard } from "@/lib/faro/engine";
import { Hint } from "./hint";
import { useFaro } from "./provider";

/** Each Estudio card's manual topic: its (?) sits on the card's own title line. */
const FOLD_TOPIC: Record<string, string> = {
  pulse: "tu-mes", health: "salud", pace: "ritmo", agenda: "proximos-pagos", waffle: "tus-100", where: "en-que-se-va",
  sankey: "recorrido", rule: "regla-50-30-20", plan: "dentro-del-tope", movers: "que-se-movio", time: "entra-sale-queda",
  cushion: "colchon", owed: "lo-que-me-deben", numeros: "numeros-clave",
};
const FoldTopicCtx = createContext<string | null>(null);
/** The topic of the Estudio card this sits in (null outside one). */
export function useFoldTopic(): string | null {
  return useContext(FoldTopicCtx);
}
const OPEN_KEY = "faro-study-open";
/** Desplegar's saved choice ("1" on, "0" off). Nothing saved = on: Estudio opens unfolded for everyone (Nov 2026). */
const UNFOLD_KEY = "faro-study-unfold";
const unfoldChoice = () => { try { return localStorage.getItem(UNFOLD_KEY) !== "0"; } catch { return true; } };

type FoldApi = {
  isOpen: (id: string) => boolean;
  isPinned: (id: string) => boolean;
  toggle: (id: string) => void;
  pin: (id: string) => void;
  order: (id: string) => number;
  section: (id: string) => string;
  pinLabel: string;
  foldLabel: string;
  breaks: { key: string; section: string; label: string; order: number }[];
};

const FoldCtx = createContext<FoldApi | null>(null);
/** CSS order that places a plain card right after the fold `id` (same order; later in the DOM wins the tie). */
export function useFoldOrderAfter(id: string): number | undefined {
  const ctx = useContext(FoldCtx);
  return ctx ? ctx.order(id) * 2 + 1 : undefined;
}

export function StatFoldProvider({
  label,
  pinLabel,
  foldLabel,
  sortLabel,
  moveUpLabel,
  moveDownLabel,
  items,
  sections,
  visible,
  openByDefault,
  children,
}: {
  openByDefault?: string[];
  label: string;
  pinLabel: string;
  foldLabel: string;
  sortLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  items: { id: string; label: string; section?: string }[];
  sections: { id: string; label: string }[];
  visible?: string[];
  children: ReactNode;
}) {
  const ids = items.map((item) => item.id).join("\0");
  // Open/shut cards survive leaving Estudio (manual → Ir allí → back lands on the same cards, same scroll).
  const saved = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(OPEN_KEY) || "null") as { spread?: boolean; shut?: Record<string, boolean>; forced?: Record<string, boolean> } | null; } catch { return null; }
  }, []);
  const { t, confirm } = useFaro();
  const [spread, setSpread] = useState(typeof saved?.spread === "boolean" ? saved.spread : unfoldChoice());
  const [shut, setShut] = useState<Record<string, boolean>>(saved?.shut ?? {});
  const [forced, setForced] = useState<Record<string, boolean>>(saved?.forced ?? {});
  useEffect(() => {
    try { sessionStorage.setItem(OPEN_KEY, JSON.stringify({ spread, shut, forced })); } catch { /* ignore */ }
  }, [spread, shut, forced]);
  // "Ir allí" / [[links]] open a card by its id.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!ids.split("\0").includes(id)) return;
      setShut((s0) => (s0[id] ? { ...s0, [id]: false } : s0));
      setForced((f) => (f[id] ? f : { ...f, [id]: true }));
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, [ids]);
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const [sorting, setSorting] = useState(false);
  const [order, setOrder] = useState<string[]>(() => {
    const fallback = ids.split("\0").filter(Boolean);
    try {
      const raw = JSON.parse(localStorage.getItem("faro-study-order-2") || "[]") as string[];
      if (!Array.isArray(raw)) return fallback;
      const known = new Set(fallback);
      const next = raw.filter((id) => known.has(id));
      for (const id of fallback) if (!next.includes(id)) next.push(id);
      return next;
    } catch {
      return fallback;
    }
  });
  const ranked = useMemo(() => {
    const fallback = ids.split("\0").filter(Boolean);
    const known = new Set(fallback);
    const next = order.filter((id) => known.has(id));
    for (const id of fallback) if (!next.includes(id)) next.push(id);
    return next;
  }, [ids, order]);
  const placed = useMemo(() => {
    const sectionOf = new Map(items.map((item) => [item.id, item.section ?? ""]));
    const buckets = new Map<string, string[]>();
    for (const id of ranked) {
      const section = sectionOf.get(id) || "_";
      const list = buckets.get(section) ?? [];
      list.push(id);
      buckets.set(section, list);
    }
    const out: string[] = [];
    for (const section of sections) {
      const list = buckets.get(section.id);
      if (list) out.push(...list);
      buckets.delete(section.id);
    }
    for (const list of buckets.values()) out.push(...list);
    return out;
  }, [ranked, items, sections]);
  const live = (visible ?? items.map((item) => item.id)).join("\0");
  const breaks = useMemo(() => {
    const on = new Set(live.split("\0").filter(Boolean));
    const name = new Map(sections.map((section) => [section.id, section.label]));
    const sectionOf = new Map(items.map((item) => [item.id, item.section ?? ""]));
    const out: FoldApi["breaks"] = [];
    let prev = "";
    placed.forEach((id, index) => {
      if (!on.has(id)) return;
      const section = sectionOf.get(id) ?? "";
      if (!section || section === prev) return;
      prev = section;
      out.push({ key: section, section, label: name.get(section) ?? section, order: index * 2 });
    });
    return out;
  }, [placed, items, sections, live]);
  const api = useMemo<FoldApi>(() => ({
    pinLabel,
    foldLabel,
    breaks,
    order: (id) => {
      const at = placed.indexOf(id);
      return at < 0 ? placed.length : at;
    },
    section: (id) => items.find((item) => item.id === id)?.section ?? "",
    isOpen: (id) => !!pinned[id] || (shut[id] ? false : forced[id] ? true : spread || !!openByDefault?.includes(id)),
    isPinned: (id) => !!pinned[id],
    toggle: (id) => {
      const open = !!pinned[id] || (shut[id] ? false : forced[id] ? true : spread || !!openByDefault?.includes(id));
      setPinned((p) => ({ ...p, [id]: false }));
      if (open) {
        setShut((s) => ({ ...s, [id]: true }));
        setForced((f) => ({ ...f, [id]: false }));
      } else {
        setShut((s) => ({ ...s, [id]: false }));
        setForced((f) => ({ ...f, [id]: true }));
      }
    },
    pin: (id) => {
      setPinned((p) => ({ ...p, [id]: !p[id] }));
      setShut((s) => ({ ...s, [id]: false }));
    },
  }), [spread, shut, forced, pinned, pinLabel, foldLabel, placed, breaks, items, openByDefault]);
  const openNow = (id: string) => !!pinned[id] || (shut[id] ? false : forced[id] ? true : spread || !!openByDefault?.includes(id));
  const liveIds = live.split("\0").filter(Boolean);
  const checked = liveIds.length > 0 && liveIds.every(openNow);
  const sectionAt = (id: string) => items.find((item) => item.id === id)?.section ?? "";
  const move = (index: number, dir: -1 | 1) => {
    setOrder(() => {
      const next = [...placed];
      const to = index + dir;
      if (to < 0 || to >= next.length) return placed;
      if (sectionAt(next[index] ?? "") !== sectionAt(next[to] ?? "")) return placed;
      const [row] = next.splice(index, 1);
      next.splice(to, 0, row!);
      try { localStorage.setItem("faro-study-order-2", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  return (
    <FoldCtx.Provider value={api}>
      <div className="study-tools" data-anchor="stats-tools">
        <label className="unfold-all">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => {
              const save = (on: boolean) => { try { localStorage.setItem(UNFOLD_KEY, on ? "1" : "0"); } catch { /* ignore */ } };
              if (checked) {
                // Unticking folds every card: ask first (ticking again needs no question).
                confirm({ title: t("study.unfold.ask"), body: t("study.unfold.body"), yes: t("study.unfold.yes"), run: () => {
                  const all: Record<string, boolean> = {};
                  for (const id of items) all[id.id] = true;
                  setSpread(false);
                  setForced({});
                  setShut(all);
                  save(false);
                } });
              } else {
                setSpread(true);
                setShut({});
                setForced({});
                save(true);
              }
            }}
          />
          <span>{label}</span>
        </label>
        <span className="study-tools-end">
          <button type="button" className={`study-sort${sorting ? " is-on" : ""}`} aria-pressed={sorting} aria-label={sortLabel} onClick={() => setSorting((on) => !on)}>
            <ArrowUpDown />
          </button>
          <Hint topic="ordenar-estudio" className="is-tools" />
        </span>
      </div>
      {sorting ? (
        <div className="study-order" role="list">
          {placed.map((id, index) => (
            <div key={id} className="study-order-row" role="listitem">
              <button type="button" aria-label={moveUpLabel} disabled={index === 0 || sectionAt(id) !== sectionAt(placed[index - 1] ?? "")} onClick={() => move(index, -1)}><ChevronUp /></button>
              <span>{items.find((item) => item.id === id)?.label ?? id}</span>
              <button type="button" aria-label={moveDownLabel} disabled={index === placed.length - 1 || sectionAt(id) !== sectionAt(placed[index + 1] ?? "")} onClick={() => move(index, 1)}><ChevronDown /></button>
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </FoldCtx.Provider>
  );
}

export function StudyStack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    const apply = () => {
      const host = root.closest(".app-frame");
      const splitCols = !!host?.classList.contains("is-split") && !!host.classList.contains("is-cols");
      const wide = window.matchMedia("(min-width: 1100px)").matches;
      const phoneLand = window.matchMedia("(orientation: landscape) and (max-height: 520px) and (min-width: 700px) and (max-width: 1099px)").matches;
      const pack = (wide || phoneLand) && !splitCols;
      root.classList.toggle("is-packed", pack);
      const items = (node: HTMLElement): HTMLElement[] => [...node.children].flatMap((child) => {
        const el = child as HTMLElement;
        return getComputedStyle(el).display === "contents" ? items(el) : [el];
      });
      const sectionOf = (el: HTMLElement) => {
        const named = ["general", "income", "spend", "save", "owed"].find((id) => el.classList.contains(`is-${id}`));
        return named || el.dataset.section || "";
      };
      const band = (section: string) => section === "income" ? 2 : section === "spend" ? 3 : section === "save" ? 4 : section === "owed" ? 5 : 0;
      const kids = items(root).filter((el) => !el.classList.contains("pack-fill") && el.getBoundingClientRect().height > 0);
      for (const el of kids) {
        if (el.style.getPropertyPriority("order") !== "important") el.dataset.ord = el.style.order || getComputedStyle(el).order || "0";
      }
      if (!pack) {
        root.classList.remove("is-land-pack");
        root.style.removeProperty("--pack-h");
        for (const el of kids) {
          if (el.style.getPropertyPriority("order") === "important" && el.dataset.ord) el.style.setProperty("order", el.dataset.ord);
          el.style.removeProperty("grid-column");
          el.style.removeProperty("grid-row");
          el.style.removeProperty("position");
          el.style.removeProperty("top");
          el.style.removeProperty("left");
          el.style.removeProperty("width");
        }
        root.querySelector(":scope > .pack-fill")?.remove();
        root.style.removeProperty("height");
        root.style.removeProperty("position");
        root.style.removeProperty("--pack-h");
        return;
      }
      for (const el of kids) {
        const next = String(band(sectionOf(el)) * 1000 + Number(el.dataset.ord || 0));
        if (el.style.getPropertyPriority("order") !== "important" || el.style.getPropertyValue("order") !== next) {
          el.style.setProperty("order", next, "important");
        }
      }
      const ranked = [...kids].sort((a, b) => Number(a.style.getPropertyValue("order")) - Number(b.style.getPropertyValue("order")));
      const left = ranked.filter((el) => band(sectionOf(el)) < 2);
      const right = ranked.filter((el) => band(sectionOf(el)) >= 2);
      root.classList.toggle("is-land-pack", phoneLand);
      root.querySelector(":scope > .pack-fill")?.remove();
      const gap = 12;
      const colW = Math.max(0, (root.clientWidth - gap) / 2);
      let yL = 0;
      let yR = 0;
      const pin = (el: HTMLElement, y: number, x: number) => {
        el.style.position = "absolute";
        el.style.top = `${y}px`;
        el.style.left = `${x}px`;
        el.style.width = `${colW}px`;
        el.style.margin = "0";
        el.style.removeProperty("grid-column");
        el.style.removeProperty("grid-row");
      };
      for (const el of left) {
        pin(el, yL, 0);
        yL += el.offsetHeight + gap;
      }
      for (const el of right) {
        pin(el, yR, colW + gap);
        yR += el.offsetHeight + gap;
      }
      root.style.position = "relative";
      const next = `${Math.ceil(Math.max(yL, yR))}px`;
      if (root.style.height !== next) root.style.height = next;
    };
    const watch = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };
    const ro = new ResizeObserver(watch);
    const arm = () => {
      ro.disconnect();
      const items = (node: HTMLElement): HTMLElement[] => [...node.children].flatMap((child) => {
        const el = child as HTMLElement;
        return getComputedStyle(el).display === "contents" ? items(el) : [el];
      });
      for (const el of items(root)) ro.observe(el);
      watch();
    };
    const mo = new MutationObserver(arm);
    mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", watch);
    arm();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", watch);
    };
  }, []);
  return (
    <div ref={ref} className="grid gap-3 study-stack">
      {children}
    </div>
  );
}

export function StatBreaks() {
  const ctx = useContext(FoldCtx);
  if (!ctx) return null;
  return (
    <>
      {ctx.breaks.map((item) => (
        <div key={item.key} className={`stat-break is-${item.section}`} style={{ order: item.order }}>
          <i />
          <span>{item.label}</span>
        </div>
      ))}
    </>
  );
}

export function StatFold({ id, children }: { id: string; children: ReactNode }) {
  const ctx = useContext(FoldCtx);
  if (!ctx) return <>{children}</>;
  const open = ctx.isOpen(id);
  const on = ctx.isPinned(id);
  return (
    <div
      className={`stat-fold${open ? " is-open" : " is-shut"}${on ? " is-pinned" : ""}`}
      data-anchor={id}
      data-fold={id}
      data-section={ctx.section(id)}
      style={{ order: ctx.order(id) * 2 + 1 }}
      onClick={(e) => {
        const t = e.target as Element;
        if (t.closest("button, a, input, textarea, select, summary, label, [role='button'], [role='tab'], [tabindex]")) return;
        // An open card folds only from its title; taps inside the chart never close it.
        if (open) {
          const head = e.currentTarget.querySelector(":scope > :not(.stat-fold-tools)")?.firstElementChild;
          if (!head || !head.contains(t)) return;
        }
        ctx.toggle(id);
      }}
    >
      <div className="stat-fold-tools">
        <button type="button" className="fold-pin" aria-label={ctx.pinLabel} aria-pressed={on} onClick={() => ctx.pin(id)}>
          <Pin />
        </button>
        <button type="button" className="fold-chev" aria-label={ctx.foldLabel} aria-expanded={open} onClick={() => ctx.toggle(id)}>
          <ChevronDown />
        </button>
      </div>
      <FoldTopicCtx.Provider value={FOLD_TOPIC[id] ?? null}>{children}</FoldTopicCtx.Provider>
    </div>
  );
}

type Point = { key: string; label: string; income: number; expense: number };
type Slice = { id: string; name: string; value: number; minor: number; color: string };
type Detail = { id: string; title: string; amount: string };

function pathFrom(values: Array<number | null>, x: (i: number) => number, y: (n: number) => number) {
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    pen = true;
  });
  return d.trim();
}

function CashFlow({
  points,
  activeKey,
  incomeLabel,
  expenseLabel,
  netLabel,
  netValue,
  inValue,
  outValue,
  trendLabel,
  mark,
  onMark,
}: {
  points: Point[];
  activeKey: string;
  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
  netValue: string;
  inValue: string;
  outValue: string;
  trendLabel: string;
  mark: string | null;
  onMark: (key: string) => void;
}) {
  const nets = points.map((p) => p.income - p.expense);
  const ma = points.map((_, i) => {
    const window = points.slice(Math.max(0, i - 2), i + 1).filter((p) => p.income > 0 || p.expense > 0);
    if (window.length < 3) return null;
    return window.reduce((acc, p) => acc + (p.income - p.expense), 0) / window.length;
  });
  const max = Math.max(...points.flatMap((p) => [p.income, p.expense]), 1);
  const min = Math.min(0, ...nets, ...ma.filter((n): n is number => n !== null));
  const w = 360;
  const h = 148;
  const padX = 8;
  const padTop = 10;
  const padBottom = 18;
  const innerH = h - padTop - padBottom;
  const x = (i: number) => padX + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - padX * 2));
  const y = (n: number) => padTop + ((max - n) / (max - min || 1)) * innerH;
  const zero = y(0);
  const area = (() => {
    const live = points.map((p, i) => (p.income > 0 || p.expense > 0 ? i : -1)).filter((i) => i >= 0);
    if (!live.length) return "";
    const start = live[0] ?? 0;
    const end = live[live.length - 1] ?? start;
    let d = `M${x(start).toFixed(1)} ${zero.toFixed(1)}`;
    for (let i = start; i <= end; i += 1) d += ` L${x(i).toFixed(1)} ${y(nets[i] ?? 0).toFixed(1)}`;
    d += ` L${x(end).toFixed(1)} ${zero.toFixed(1)} Z`;
    return d;
  })();
  const now = points.findIndex((p) => p.key === activeKey);
  const nowNet = now >= 0 ? nets[now] ?? 0 : 0;
  return (
    <section className="card">
      <div className="stat-head">
        <h2 className="serif text-2xl">{netLabel}</h2>
        <strong className={`num serif text-2xl ${nowNet < 0 ? "bad" : "good"}`}>{netValue}</strong>
      </div>
      <div className="study-legend">
        <span><i className="sw in" /> {incomeLabel} {inValue}</span>
        <span><i className="sw out" /> {expenseLabel} {outValue}</span>
        <span><i className="sw tone-left" /> {trendLabel}</span>
      </div>
      <svg className="flow-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={netLabel}>
        <line x1={padX} x2={w - padX} y1={zero} y2={zero} className="chart-zero" />
        <path d={area} className="chart-area" />
        <path d={pathFrom(points.map((p) => (p.income > 0 || p.expense > 0 ? p.income : null)), x, y)} className="chart-in" />
        <path d={pathFrom(points.map((p) => (p.income > 0 || p.expense > 0 ? p.expense : null)), x, y)} className="chart-out" />
        <path d={pathFrom(ma, x, y)} className="chart-ma" />
        {now >= 0 ? <circle cx={x(now)} cy={y(nowNet)} r="3.5" className="chart-now" /> : null}
      </svg>
      <div className="chart-labels" style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))` }}>
        {points.map((p) => (
          <button key={p.key} type="button" className={p.key === (mark || activeKey) ? "is-now" : undefined} onClick={() => onMark(p.key)}>{p.label.replace(".", "")}</button>
        ))}
      </div>
    </section>
  );
}

type SkLink = {
  source: SkNode;
  target: SkNode;
  value: number;
  w: number;
  sy: number;
  ty: number;
};

type SkNode = {
  id: string;
  label: string;
  color: string;
  value: number;
  index: number;
  col: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  h: number;
  inL: SkLink[];
  outL: SkLink[];
};

const SANK_NODE = 10;
const SANK_PAD = 14;
const SANK_MIN = 3;
const SANK_LABEL_H = 36;

function layoutSankey(model: CashSankey, width: number) {
  const byId = new Map<string, SkNode>();
  const nodes: SkNode[] = model.nodes.map((node, index) => {
    const laid: SkNode = {
      id: node.id,
      label: node.name,
      color: node.color,
      value: node.minor,
      index,
      col: 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
      h: 0,
      inL: [],
      outL: [],
    };
    byId.set(node.id, laid);
    return laid;
  });
  const links: SkLink[] = [];
  for (const link of model.links) {
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    if (!source || !target || link.minor <= 0) continue;
    const laid: SkLink = { source, target, value: link.minor, w: 0, sy: 0, ty: 0 };
    source.outL.push(laid);
    target.inL.push(laid);
    links.push(laid);
  }
  if (!links.length) return null;
  for (const node of nodes) {
    const incoming = node.inL.reduce((sum, link) => sum + link.value, 0);
    const outgoing = node.outL.reduce((sum, link) => sum + link.value, 0);
    node.value = Math.max(incoming, outgoing, node.value);
  }
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    for (const link of links) {
      if (link.target.col < link.source.col + 1) {
        link.target.col = link.source.col + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const ncol = Math.max(...nodes.map((node) => node.col), 0) + 1;
  const cols: { nodes: SkNode[]; extent: number }[] = Array.from({ length: ncol }, () => ({ nodes: [], extent: 0 }));
  for (const node of nodes) cols[node.col]?.nodes.push(node);
  const labelWidth = Math.min(128, Math.max(92, (width - 36) / 3));
  const busiest = Math.max(...cols.map((col) => col.nodes.length), 1);
  const fitH = Math.max(320, busiest * 46);
  let ky = Infinity;
  for (const col of cols) {
    const sum = col.nodes.reduce((total, node) => total + node.value, 0);
    if (sum > 0) ky = Math.min(ky, (fitH - Math.max(0, col.nodes.length - 1) * SANK_PAD) / sum);
  }
  if (!Number.isFinite(ky)) ky = 1;
  const margin = ncol > 1 ? 22 : 0;
  const lastX = width - SANK_NODE;
  const midX = Math.max(margin + SANK_NODE + labelWidth, width * 0.42);
  const orderOf = (node: SkNode, seen = new Set<string>()): number => {
    if (seen.has(node.id) || !node.inL.length) return node.index;
    seen.add(node.id);
    return orderOf(node.inL[0]?.source ?? node, seen) * 1000 + node.index;
  };
  for (const [ci, col] of cols.entries()) {
    const x = ncol === 1 ? 0 : ci === 0 ? margin : ci === ncol - 1 ? lastX : midX;
    col.nodes.sort((a, b) => orderOf(a) - orderOf(b));
    const labelRoom = ci === 0 && ncol > 1 ? 0 : SANK_LABEL_H;
    let y = 0;
    for (const node of col.nodes) {
      node.x0 = x;
      node.x1 = x + SANK_NODE;
      node.h = Math.max(SANK_MIN, node.value * ky);
      const slot = Math.max(node.h, labelRoom);
      node.y0 = y + (slot - node.h) / 2;
      node.y1 = node.y0 + node.h;
      y += slot + SANK_PAD;
    }
    col.extent = y - SANK_PAD;
  }
  const tallest = Math.max(...cols.map((col) => col.extent), 0);
  for (const col of cols) {
    const off = (tallest - col.extent) / 2;
    for (const node of col.nodes) {
      node.y0 += off;
      node.y1 += off;
    }
  }
  for (const node of nodes) {
    let sy = node.y0;
    let ty = node.y0;
    const scale = Math.min(ky, node.h / Math.max(node.value, 1e-9));
    node.outL.sort((a, b) => a.target.y0 - b.target.y0);
    for (const link of node.outL) {
      link.w = link.value * scale;
      link.sy = sy;
      sy += link.w;
    }
    node.inL.sort((a, b) => a.source.y0 - b.source.y0);
    for (const link of node.inL) {
      link.ty = ty;
      ty += link.value * Math.min(ky, node.h / Math.max(node.value, 1e-9));
    }
  }
  return { nodes, links, height: tallest };
}

function sankeyBand(link: SkLink) {
  const x0 = link.source.x1;
  const x1 = link.target.x0;
  const xm = (x0 + x1) / 2;
  const y0 = link.sy;
  const y1 = link.ty;
  const y0b = y0 + link.w;
  const y1b = y1 + link.w;
  return `M${x0} ${y0} C${xm} ${y0} ${xm} ${y1} ${x1} ${y1} L${x1} ${y1b} C${xm} ${y1b} ${xm} ${y0b} ${x0} ${y0b} Z`;
}

function MoneySankey({
  model,
  title,
  note,
  empty,
  money,
}: {
  model: CashSankey;
  title: string;
  note: string;
  empty: string;
  money: (minor: number) => string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const read = () => setWidth(Math.max(280, Math.round(el.clientWidth)));
    read();
    const watcher = new ResizeObserver(read);
    watcher.observe(el);
    return () => watcher.disconnect();
  }, []);
  const laid = useMemo(() => layoutSankey(model, width), [model, width]);
  if (!laid) {
    return <section className="card sankey-card"><h2 className="serif text-2xl">{title}</h2><p className="text-sm text-muted">{empty}</p></section>;
  }
  const total = laid.nodes.filter((node) => node.col === 0).reduce((sum, node) => sum + node.value, 0) || 1;
  const last = Math.max(...laid.nodes.map((node) => node.col));
  const keep = (() => {
    if (!picked) return null;
    const node = laid.nodes.find((item) => item.id === picked);
    if (!node) return null;
    const ids = new Set<string>();
    const bands = new Set<SkLink>();
    const up = (item: SkNode) => {
      ids.add(item.id);
      for (const link of item.inL) {
        bands.add(link);
        up(link.source);
      }
    };
    const down = (item: SkNode) => {
      ids.add(item.id);
      for (const link of item.outL) {
        bands.add(link);
        down(link.target);
      }
    };
    up(node);
    down(node);
    return { ids, bands };
  })();
  const share = (value: number) => {
    const n = (value / total) * 100;
    return n > 0 && n < 0.5 ? "<1%" : `${n.toFixed(1)}%`;
  };
  return (
    <section className="card sankey-card">
      <h2 className="serif text-2xl lab-head">{title}<Hint topic="recorrido" fitParent /></h2>
      <p className="sankey-note">{note}</p>
      <div ref={host}>
        <svg className="sankey-chart" viewBox={`0 -6 ${width} ${laid.height + 12}`} height={laid.height + 12} role="img" aria-label={title} onClick={() => setPicked(null)}>
          {laid.links.map((link) => (
            <path
              key={`${link.source.id}-${link.target.id}`}
              d={sankeyBand(link)}
              fill={link.target.color || link.source.color}
              className="sankey-link"
              opacity={!keep || keep.bands.has(link) ? undefined : 0.08}
            >
              <title>{`${link.source.label} → ${link.target.label}: ${money(link.value)}`}</title>
            </path>
          ))}
          {laid.nodes.map((node) => {
            const dim = keep && !keep.ids.has(node.id) ? 0.28 : 1;
            const cy = (node.y0 + node.y1) / 2;
            const first = node.col === 0 && last > 0;
            return (
              <g key={node.id} opacity={dim}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={SANK_NODE}
                  height={node.h}
                  rx={1.5}
                  fill={node.color}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label} ${money(node.value)}`}
                  aria-pressed={picked === node.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPicked(picked === node.id ? null : node.id);
                  }}
                />
                {first ? (
                  <text transform={`translate(${node.x0 - 8} ${cy}) rotate(-90)`} textAnchor="middle" className="sankey-name">
                    {node.label} · {money(node.value)}
                  </text>
                ) : (
                  <>
                    <text x={node.x0 - 8} y={node.h > 30 ? cy - 2 : cy - 1} textAnchor="end" className="sankey-name">{node.label}</text>
                    <text x={node.x0 - 8} y={node.h > 30 ? cy + 14 : cy + 13} textAnchor="end" className="sankey-amt">{money(node.value)} · {share(node.value)}</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function FlowSplit({
  flow,
  income,
  title,
  empty,
  money,
  note,
  bare,
}: {
  flow: StudyBoard["flow"];
  income: number;
  title: string;
  empty: string;
  money: (minor: number) => string;
  note: string;
  bare: string;
}) {
  if (!flow.length) return <section className="card"><h2 className="serif text-2xl">{title}</h2><p className="text-sm text-muted">{empty}</p></section>;
  const base = income > 0 ? income : Math.max(flow.reduce((a, b) => a + b.minor, 0), 1);
  return (
    <section className="card flow-split">
      <h2 className="serif text-2xl">{title}</h2>
      <strong className="stat-pill num">{money(income)}</strong>
      <p className="flow-note">{income > 0 ? note : bare}</p>
      <div className="flow-list">
        {flow.map((b) => {
          const pct = Math.round((b.minor / base) * 100);
          const width = Math.max(4, Math.min(100, (b.minor / base) * 100));
          return (
            <div key={b.name} className="flow-row">
              <span className="flow-name"><i className={b.tone} />{b.name}</span>
              <span className={`num flow-fig${pct > 100 ? " bad" : ""}`}>{money(b.minor)} · {pct}%</span>
              <div className="flow-track" aria-hidden><b className={b.tone} style={{ width: `${width}%` }} /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Donut({
  slices,
  title,
  picked,
  onPick,
}: {
  slices: { id: string; name: string; minor: number; color?: string }[];
  title: string;
  picked: string | null;
  onPick: (id: string) => void;
}) {
  const total = slices.reduce((a, s) => a + s.minor, 0);
  const active = slices.find((s) => s.id === picked) ?? null;
  const r = 46;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = slices.map((s, i) => {
    const len = total > 0 ? (s.minor / total) * c : 0;
    const dash = Math.max(0, len - 1.5);
    const node = (
      <circle
        key={`${s.id}-${i}`}
        cx="60"
        cy="60"
        r={r}
        stroke={s.color || "#8fb9a6"}
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={-offset}
        className={!picked ? undefined : picked === s.id ? "is-on" : "is-dim"}
        role="button"
        tabIndex={0}
        aria-label={s.name}
        aria-pressed={picked === s.id}
        onClick={() => onPick(s.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick(s.id);
          }
        }}
      />
    );
    offset += len;
    return node;
  });
  const pct = active && total > 0 ? Math.round((active.minor / total) * 100) : null;
  return (
    <div className="donut-block">
      <div className="donut-wrap">
        <svg viewBox="0 0 120 120" role="img" aria-label={title}>
          <g transform="rotate(-90 60 60)">
            {total <= 0 ? <circle cx="60" cy="60" r={r} className="donut-empty" /> : null}
            {arcs}
          </g>
        </svg>
        {active && pct !== null ? (
          <div className="donut-core">
            <strong className="num">{pct}%</strong>
            <span>{active.name}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CompareRail({
  points,
  money,
  incomeLabel,
  expenseLabel,
  title,
}: {
  points: Point[];
  money: (minor: number) => string;
  incomeLabel: string;
  expenseLabel: string;
  title: string;
}) {
  const [on, setOn] = useState<string | null>(null);
  const peak = Math.max(...points.map((p) => Math.max(p.income, p.expense)), 1);
  const picked = points.find((p) => p.key === on) ?? null;
  return (
    <section className="card compare-card">
      <h2 className="serif text-2xl">{title}</h2>
      <div className="study-legend">
        <span><i className="sw in" /> {incomeLabel}</span>
        <span><i className="sw out" /> {expenseLabel}</span>
      </div>
      <div className="cmp-lanes">
        {points.map((p, i) => (
          <button key={p.key} type="button" className={on === p.key || (!on && i === points.length - 1) ? "is-on" : undefined} aria-pressed={on === p.key} onClick={() => setOn((cur) => (cur === p.key ? null : p.key))}>
            <span>{p.label.replace(".", "")}</span>
            <span className="cmp-tracks">
              <i className="in" style={{ width: `${p.income > 0 ? Math.max(4, (p.income / peak) * 100) : 0}%` }} />
              <i className="out" style={{ width: `${p.expense > 0 ? Math.max(4, (p.expense / peak) * 100) : 0}%` }} />
            </span>
          </button>
        ))}
      </div>
      {picked ? (
        <p className="stat-readout">
          <span>{picked.label.replace(".", "")}</span>
          <span className="good num">{money(Math.round(picked.income * 100))}</span>
          <span className="warn num">{money(Math.round(picked.expense * 100))}</span>
        </p>
      ) : null}
    </section>
  );
}

export function StudyCharts({
  points,
  compare,
  slices,
  activeKey,
  incomeLabel,
  expenseLabel,
  barsTitle,
  compareTitle,
  whereLabel,
  board,
  sankey,
  money,
  copy,
  picked,
  onPick,
  stores,
  storePicked,
  onStore,
  detail,
  onOpen,
}: {
  points: Point[];
  compare: Point[];
  slices: Slice[];
  activeKey: string;
  incomeLabel: string;
  expenseLabel: string;
  barsTitle: string;
  compareTitle: string;
  whereLabel: string;
  board: StudyBoard | null;
  sankey: CashSankey;
  money: (minor: number) => string;
  copy: {
    net: string;
    netValue: string;
    inValue: string;
    outValue: string;
    now: string;
    creepEmpty: string;
    trend: string;
    flow: string;
    flowNote: string;
    flowBare: string;
    sankey: string;
    sankeyNote: string;
    empty: string;
    rate: string;
    burn: string;
    prev: string;
    creep: string;
    plan: string;
    planNote: string;
    runway: string;
    runwayNote: string;
    top: string;
    whereHint: string;
  };
  picked: string | null;
  onPick: (id: string) => void;
  stores: { id: string; name: string; minor: number; color?: string }[];
  storePicked: string | null;
  onStore: (id: string) => void;
  detail: Detail[];
  onOpen: (id: string) => void;
}) {
  const [mark, setMark] = useState<string | null>(null);
  const fold = useContext(FoldCtx);
  const focus = points.find((p) => p.key === mark) ?? null;
  const max = Math.max(...points.map((p) => Math.max(p.income, p.expense)), 1);
  const sliceMax = Math.max(...slices.map((s) => s.value), 1);
  const minorTotal = slices.reduce((acc, s) => acc + s.minor, 0);
  const burnMax = Math.max(board?.burn ?? 0, board?.burnPrev ?? 0, 1);
  const subMax = Math.max(...(board?.subs.map((s) => s.minor) ?? [0]), 0);
  const envScale = Math.max(...(board?.envelopes.map((e) => Math.abs(e.actual - e.budget)) ?? [1]), 1);
  const topMax = Math.max(...(board?.top.map((t) => t.minor) ?? [1]), 1);
  const rate = board ? board.savingsRate : null;
  const rateWidth = rate === null ? 0 : Math.max(0, Math.min(100, rate));
  return (
    <div className="study-charts">
      {sankey.links.length ? <StatFold id="sankey"><MoneySankey model={sankey} title={copy.sankey} note={copy.sankeyNote} empty={copy.empty} money={money} /></StatFold> : null}
      <StatFold id="where">
      <section className="card">
        <h2 className="serif text-2xl lab-head">{whereLabel}<Hint topic="en-que-se-va" fitParent /></h2>
        <p className="pano-lead where-hint">{copy.whereHint}</p>
        {slices.length ? (
          <Donut
            slices={slices.map((s) => ({ id: s.id, name: s.name, minor: s.minor, color: s.color }))}
            title={whereLabel}
            picked={picked}
            onPick={onPick}
          />
        ) : null}
        {picked && stores.length ? (
          <div className="store-burst">
            <Donut slices={stores} title={whereLabel} picked={storePicked} onPick={onStore} />
          </div>
        ) : null}
        {slices.map((s) => {
          const on = picked === s.id;
          return (
            <button key={s.id} type="button" className={`share ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => onPick(s.id)}>
              <span className="share-name">
                <i className="sw" style={{ background: s.color }} />
                {s.name}
              </span>
              <span className="num">{minorTotal > 0 ? `${Math.round((s.minor / minorTotal) * 100)}%` : "—"} · {money(s.minor)}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(4, (s.value / sliceMax) * 100)}%`, background: s.color, opacity: picked && !on ? 0.35 : 1 }} />
              </div>
            </button>
          );
        })}
        {!picked && board?.top.length ? (
          <div className="where-top">
            <h3>{copy.top}</h3>
            {board.top.map((row) => (
              <p key={row.name}><span>{row.name}</span><strong className="num">{money(row.minor)}</strong></p>
            ))}
          </div>
        ) : null}
        {picked && detail.length ? (
          <div className="stat-detail">
            {detail.map((row) => (
              <button key={row.id} type="button" className="stat-line" onClick={() => onOpen(row.id)}>
                <span>{row.title}</span>
                <span className="num">{row.amount}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>
      </StatFold>
    </div>
  );
}
