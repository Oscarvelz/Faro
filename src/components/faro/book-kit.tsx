/* 1.3.115 (Oscar): "Libros is where every tool belongs." The two tools every book in Libros carries beside its +:
 * - pencil (beside the +): the book's sheet, opened straight in its manage state (the editors' PickSheet): checkboxes,
 *   Seleccionar todo, one red confirmation for many, rename inline, tap a mark to recolour, RotateCcw where the book has
 *   defaults, and the palette in the sheet head ("Color e íconos": one colour/icon for the ticked rows, the editors'
 *   LookView, its own Back step). ✓ leaves the manage state for the list, where a tap opens that row's editor.
 *   One button in the header (not two): titles keep one line at 360r20.
 * Ola 13 (CARA-1): the manage hand is composed BY MODE, like the editors' own — the full hand (checkboxes,
 * palette, group drop) only where books.multiselect lives (Ritmo); in Esencial the sheet carries the
 * rename alone, the .315 doctrine: correcting a name is essential, administering is not.
 * No parallel system: the sheet, the colour picker and the confirmation are the editors' own; deletion uses each book's
 * own rule (books: this month's line, earlier months keep theirs; savings pockets: archive when money history exists;
 * Me deben / Préstamos: Archivo, with its Restaurar). */
import { useState } from "react";
import { ListChecks } from "lucide-react";
import { PickSheet, type Manage, type PickItem } from "./fit-pick";
import { Glyph } from "./icons";
import { useFaro } from "./provider";
import "./book-kit.css";

export type KitRow = { id: string; label: string; glyph?: string; color?: string; initial?: string };

type Props = {
  /** Sheet title: the book's own short name. */
  title: string;
  rows: KitRow[];
  /** [one, many] in Spanish and English: ["línea", "líneas", "line", "lines"]. */
  word: [string, string, string, string];
  /** Open the row's editor in the book (the sheet closes first). */
  onEdit?: (id: string) => void;
  onDrop: (ids: string[]) => void;
  onRename?: (id: string, name: string) => void;
  onColor?: (id: string, hex: string) => void;
  onIcon?: (id: string, glyph: string) => void;
  onRestore?: () => void;
  verb?: [string, string];
  body?: string;
  test?: string;
};

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

function Mark({ row }: { row: KitRow }) {
  if (row.glyph) return <span className="kit-mark" style={{ ["--k" as string]: row.color || "var(--accent)" }}><Glyph name={row.glyph} className={row.glyph.startsWith("brand:") || row.glyph.startsWith("sub:") ? "kit-brand" : "kit-glyph"} /></span>;
  return <span className="kit-mark is-letter">{(row.initial || row.label).slice(0, 1).toUpperCase()}</span>;
}

export function BookKit({ title, rows, word, onEdit, onDrop, onRename, onColor, onIcon, onRestore, verb, body, test }: Props) {
  const { lang, has } = useFaro();
  const [open, setOpen] = useState(false);
  const [look, setLook] = useState<string[] | null>(null);
  const items: PickItem[] = rows.map((row) => ({ id: row.id, label: row.label, mark: <Mark row={row} />, color: row.color }));
  // Ola 13 (CARA-1, ALTA): el kit compone su mano por modo, como los
  // editores componen la suya (fit-pick: picker-manage / picker-rename).
  // La mano de administrar — multiselección, color, icono, borrar en
  // grupo, la paleta — vive donde vive su asiento (books.multiselect,
  // Ritmo): en Esencial la hoja del lápiz trae SOLO el renombre, que es
  // de todo piso desde la .315. Antes el kit componía la mano entera sin
  // mirar el modo y ACTUABA: en Esencial se tildaron 14 casillas, se
  // abrió la paleta y la barra borró dos líneas del libro en vivo.
  const canManage = has("books.multiselect");
  const manage: Manage = canManage
    ? { word, onDropMany: onDrop, onRename, onColor, onRestore, verb, body }
    : { onRename };
  const lookRows = look ? rows.filter((row) => look.includes(row.id)) : [];
  const first = lookRows[0];
  const paints = canManage && !!(onColor || onIcon);
  // An empty book shows only its + (nothing to edit yet), unless it has defaults to bring back.
  if (!rows.length && !onRestore && !open) return null;
  // The sheet gives its Back entry back before the editor takes one (the editor's step must not be the one popped).
  const edit = (id: string) => { setOpen(false); if (onEdit) window.setTimeout(() => onEdit(id), 160); };
  return (
    <>
      <button type="button" className="icon-btn kit-btn is-pen" data-anchor="book-kit" data-test={test ? `${test}-pen` : "kit-pen"} aria-pressed={open} aria-label={L(lang, "Seleccionar", "Select")} title={L(lang, "Seleccionar", "Select")} onClick={() => setOpen(true)}>
        <ListChecks aria-hidden />
      </button>
      {open ? (
        <PickSheet title={title} items={items} value="" test="kit-sheet" startEditing manage={manage}
          onPalette={paints ? (ids) => setLook(ids) : undefined}
          onPick={(id) => edit(id)} onClose={() => { setLook(null); setOpen(false); }} />
      ) : null}
      {open && first ? (
        <PickSheet title={lookRows.length === 1 ? first.label : `${lookRows.length} ${L(lang, word[1], word[3])}`} items={[]} value="" test="kit-look" onPick={() => {}} onClose={() => setLook(null)} onLookDone={() => setLook(null)}
          look={{ glyph: first.glyph && !first.glyph.startsWith("brand:") && !first.glyph.startsWith("sub:") ? first.glyph : "Circle", color: first.color || "#3fd6f5",
            onGlyph: (g) => lookRows.forEach((row) => onIcon?.(row.id, g)), onColor: (hex) => lookRows.forEach((row) => onColor?.(row.id, hex)) }} />
      ) : null}
    </>
  );
}
