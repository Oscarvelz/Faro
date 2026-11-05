/* 1.3.100: compact picker fields for the line editors. A field shows the choice as a chip (its mark + name) or a clear
 * placeholder; tapping it opens one sheet (its own Back layer) with the options grouped, a search when the list is long,
 * and an inline "add". The Cuotas icon library adds an edit state (delete a preset, with confirmation) and a restore. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Pencil, Plus, RotateCcw, Search, Sparkles, Store, Tag, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { displayName } from "@/lib/faro/defaults";
import { categoryColor } from "@/lib/faro/colors";
import { uid } from "@/lib/faro/money";
import { SUB_GROUPS, dropLibraryIcon, groupOf, libraryOf, libraryOff, normName, poolName, restoreLibrary } from "@/lib/faro/subs";
import { BrandMark, Glyph, SubMark } from "./icons";
import { useFaro } from "./provider";
import "./fit-form.css";

export type PickItem = { id: string; label: string; mark: ReactNode; group?: string };

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/** The trigger: looks like a field of the editor, holds the chosen chip or a placeholder. */
export function PickButton({ mark, text, placeholder, open, onOpen, test, compact }: { mark: ReactNode; text: string; placeholder: string; open: boolean; onOpen: () => void; test?: string; compact?: boolean }) {
  return (
    <button type="button" className={`field fit-pick-btn${text ? " is-set" : ""}${compact ? " is-compact" : ""}`} aria-expanded={open} aria-haspopup="dialog" aria-label={compact ? text || placeholder : undefined} data-test={test} onClick={onOpen}>
      <span className="fit-pick-mark" aria-hidden>{mark}</span>
      {compact ? null : <span className="fit-pick-text">{text || placeholder}</span>}
      <ChevronDown className="fit-pick-chev" aria-hidden />
    </button>
  );
}

export function PickSheet({ title, items, groups, value, onPick, onClose, add, edit, none, test }: {
  title: string;
  items: PickItem[];
  groups?: { id: string; label: string }[];
  value: string;
  onPick: (id: string) => void;
  onClose: () => void;
  add?: { placeholder: string; onAdd: (name: string) => void };
  edit?: { onDrop: (item: PickItem) => void; onRestore?: () => void };
  none?: string;
  test?: string;
}) {
  const { lang } = useFaro();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useLayer(true, onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The chosen option starts in view.
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>("[aria-pressed='true']")?.scrollIntoView({ block: "nearest" }));
    return () => { document.body.style.overflow = prev; };
  }, []);
  const needle = normName(q);
  const shown = needle ? items.filter((it) => normName(it.label).includes(needle)) : items;
  const sections = groups?.length
    ? groups.map((g) => ({ ...g, rows: shown.filter((it) => (it.group ?? "") === g.id) })).filter((g) => g.rows.length)
    : [{ id: "", label: "", rows: shown }];
  const commitAdd = () => {
    const n = name.trim();
    if (!n || !add) return;
    add.onAdd(n.slice(0, 40));
    setName("");
  };
  const body = (
    <div className="fit-scrim" role="presentation" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`fit-sheet${editing ? " is-editing" : ""}`} role="dialog" aria-modal="true" aria-label={title} data-test={test} onPointerDown={(e) => e.stopPropagation()}>
        <div className="fit-sheet-head">
          <strong>{title}</strong>
          {edit?.onRestore ? (
            <button type="button" className="fit-sheet-tool" data-test="lib-restore" aria-label={L(lang, "Restaurar de fábrica", "Restore defaults")} onClick={edit.onRestore}><RotateCcw /></button>
          ) : null}
          {edit ? (
            <button type="button" className="fit-sheet-tool" data-test="lib-edit" aria-pressed={editing} aria-label={editing ? L(lang, "Listo", "Done") : L(lang, "Editar lista", "Edit list")} onClick={() => setEditing((v) => !v)}>{editing ? <Check /> : <Pencil />}</button>
          ) : null}
          <button type="button" className="fit-sheet-tool" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        {items.length > 8 ? (
          <label className="fit-search">
            <Search aria-hidden />
            <input value={q} placeholder={L(lang, "Buscar", "Search")} aria-label={L(lang, "Buscar", "Search")} onChange={(e) => setQ(e.target.value)} />
          </label>
        ) : null}
        <div className="fit-sheet-list" ref={listRef}>
          {none && !needle && !editing ? (
            <div className="fit-grid">
              <button type="button" className="fit-opt is-none" aria-pressed={!value} onClick={() => onPick("")}><span className="fit-opt-mark" aria-hidden><X /></span><span>{none}</span></button>
            </div>
          ) : null}
          {sections.map((g) => (
            <section key={g.id || "all"} className="fit-group">
              {g.label ? <p className="fit-kicker">{g.label}</p> : null}
              <div className="fit-grid">
                {g.rows.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className="fit-opt"
                    data-id={it.id}
                    aria-pressed={!editing && value === it.id}
                    aria-label={editing ? `${L(lang, "Borrar", "Delete")} ${it.label}` : undefined}
                    onClick={() => (editing && edit ? edit.onDrop(it) : onPick(it.id))}
                  >
                    <span className="fit-opt-mark" aria-hidden>{it.mark}</span>
                    <span>{it.label}</span>
                    {editing ? <i className="fit-opt-x" aria-hidden><X /></i> : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {!sections.some((g) => g.rows.length) ? <p className="fit-empty">{L(lang, "Nada coincide", "No matches")}</p> : null}
        </div>
        {add && !editing ? (
          <div className="fit-add">
            <input className="field" value={name} placeholder={add.placeholder} aria-label={add.placeholder} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitAdd(); } }} />
            <button type="button" className="fit-add-btn" aria-label={L(lang, "Añadir", "Add")} disabled={!name.trim()} onClick={commitAdd}><Plus /></button>
          </div>
        ) : null}
      </div>
    </div>
  );
  return createPortal(body, document.body);
}

/** Compras: the store, as a chip with its brand mark; picker lists every store with an inline "add". */
export function StorePick({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t, session, commit, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const stores = (session?.ledger.structure.catalog ?? []).filter((c) => c.kind === "store" && (!c.hidden || c.id === value)).sort((a, b) => a.order - b.order);
  const cur = stores.find((s) => s.id === value);
  const markOf = (s: (typeof stores)[number]) => <BrandMark id={s.id} src={s.icon.startsWith("data:") ? s.icon : undefined} className="fit-brand" />;
  return (
    <>
      <PickButton test="store-pick" open={open} onOpen={() => setOpen(true)} mark={cur ? markOf(cur) : <Store />} text={cur ? displayName(cur, lang) : ""} placeholder={L(lang, "Elegir tienda", "Pick a store")} />
      {open ? (
        <PickSheet
          test="store-sheet"
          title={t("store")}
          value={value}
          none={L(lang, "Sin tienda", "No store")}
          items={stores.map((s) => ({ id: s.id, label: displayName(s, lang), mark: markOf(s) }))}
          onClose={() => setOpen(false)}
          onPick={(id) => { onChange(id); setOpen(false); }}
          add={{
            placeholder: t("shops.addStore"),
            onAdd: (name) => {
              const id = `c-${uid().slice(0, 8)}`;
              commit((st) => ({ ...st, structure: { ...st.structure, catalog: [...st.structure.catalog, { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, kind: "store", urlTemplate: "" }] } }), name);
              onChange(id);
              setOpen(false);
            },
          }}
        />
      ) : null}
    </>
  );
}

/** Compras: the purchase category, as a chip with its colour; picker lists them with an inline "add". */
export function PurchaseCatPick({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t, session, commit, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const cats = (session?.ledger.structure.purchases ?? []).filter((p) => !p.hidden || p.id === value).sort((a, b) => a.order - b.order);
  const cur = cats.find((p) => p.id === value);
  const dot = (id: string, color?: string) => <i className="fit-dot" style={{ ["--dot" as string]: categoryColor(id, color) }} />;
  return (
    <>
      <PickButton test="cat-pick" open={open} onOpen={() => setOpen(true)} mark={cur ? dot(cur.id, cur.color) : <Tag />} text={cur ? displayName(cur, lang) : ""} placeholder={L(lang, "Elegir rubro", "Pick a group")} />
      {open ? (
        <PickSheet
          test="cat-sheet"
          title={t("category")}
          value={value}
          none={L(lang, "Ninguna", "None")}
          items={cats.map((p) => ({ id: p.id, label: displayName(p, lang), mark: dot(p.id, p.color) }))}
          onClose={() => setOpen(false)}
          onPick={(id) => { onChange(id); setOpen(false); }}
          add={{
            placeholder: t("shops.addCat"),
            onAdd: (name) => {
              const id = `p-${uid().slice(0, 8)}`;
              commit((st) => ({ ...st, structure: { ...st.structure, purchases: [...st.structure.purchases, { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99 }] } }), name);
              onChange(id);
              setOpen(false);
            },
          }}
        />
      ) : null}
    </>
  );
}

/** Cuotas: the brand icon from the library (`sub:<id>` in Line.icon). `suggest` is the icon the typed Concepto points at. */
export function BrandIconPick({ value, suggest, onChange, compact }: { value: string; suggest: string; onChange: (icon: string, label: string) => void; compact?: boolean }) {
  const { session, commit, confirm, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const off = libraryOff(session?.ledger);
  const lib = useMemo(() => libraryOf(session?.ledger), [session?.ledger]);
  const own = value === "RefreshCw" ? "" : value;
  const shown = own || suggest;
  const id = shown.startsWith("sub:") ? shown.slice(4) : "";
  // A line whose icon is not from the library (an older Lucide icon) keeps showing it until the user picks another.
  const other = !id && own ? own : "";
  const items: PickItem[] = lib.map((row) => ({ id: row[0], label: poolName(row[0], lang), mark: <SubMark id={row[0]} className="fit-brand" />, group: groupOf(row[0]) }));
  const label = id ? (id.startsWith("data:") ? L(lang, "Ícono propio", "Own icon") : poolName(id, lang)) : other ? L(lang, "Ícono actual", "Current icon") : "";
  return (
    <>
      <PickButton test="brand-pick" compact={compact} open={open} onOpen={() => setOpen(true)} mark={id ? <SubMark id={id} className="fit-brand" /> : other ? <Glyph name={other} /> : <Sparkles />} text={label} placeholder={L(lang, "Elegir marca", "Pick a brand")} />
      {open ? (
        <PickSheet
          test="brand-sheet"
          title={L(lang, "Marca de la cuota", "Payment brand")}
          value={id}
          none={L(lang, "Sin ícono", "No icon")}
          items={items}
          groups={SUB_GROUPS.map(([g, es, en]) => ({ id: g, label: L(lang, es, en) }))}
          onClose={() => setOpen(false)}
          onPick={(pick) => { onChange(pick ? `sub:${pick}` : "", pick ? poolName(pick, lang) : ""); setOpen(false); }}
          edit={{
            onDrop: (it) => confirm({
              title: L(lang, "Borrar de la lista", "Delete from the list"),
              body: L(lang, `${it.label} sale de la biblioteca. Las cuotas que ya lo usan lo conservan.`, `${it.label} leaves the library. Payments already using it keep it.`),
              yes: L(lang, "Borrar", "Delete"),
              run: () => commit((s) => dropLibraryIcon(s, it.id), it.label),
            }),
            onRestore: off.size ? () => confirm({
              title: L(lang, "Restaurar de fábrica", "Restore defaults"),
              body: L(lang, "Vuelven todos los íconos borrados. No se cambia ninguna cuota.", "Every deleted icon comes back. No payment is changed."),
              yes: L(lang, "Restaurar", "Restore"),
              run: () => commit((s) => restoreLibrary(s), L(lang, "Íconos", "Icons")),
            }) : undefined,
          }}
        />
      ) : null}
    </>
  );
}
