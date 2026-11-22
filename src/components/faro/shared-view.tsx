import { useCallback, useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useFaro } from "./provider";
import { Signature } from "./signature";
import { acceptInvite, fetchSharedBook, listMemberships, type Membership } from "@/spa/cloud";
import { makeNamer } from "@/lib/faro/defaults";
import { categoryTotal, explainLines, scopeFilter } from "@/lib/faro/world";
import type { LedgerState } from "@/lib/faro/types";
import "./share-mesa.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

interface OpenBook { owner: string; role: "note" | "view"; book: LedgerState }

/** La forma mínima de un libro recibido: meses y estructura. Todo lo
 * demás se lee con desconfianza dentro de world.ts. */
function asBook(x: unknown): LedgerState | null {
  if (!x || typeof x !== "object") return null;
  const b = x as LedgerState;
  if (!b.months || typeof b.months !== "object" || !b.structure || !Array.isArray(b.structure.categories)) return null;
  return b;
}

/**
 * «Compartidos conmigo» (Pieza C7, 1.3.397): los libros donde la
 * persona es MIEMBRO. Abrir trae la copia del servidor (la puerta de
 * la C2) y la vuelve a recortar en el cliente por su alcance — el
 * segundo candado de world.ts — antes de enseñar una sola línea.
 * La vista es de LECTURA: totales por categoría del mes y, al tocar
 * una cifra, su composición — qué líneas la forman, quién las anotó
 * (la firma) y de quién fue el dinero. Ningún camino de guardado
 * pasa por aquí: el mundo compartido se lee, no se escribe, en esta
 * superficie. Aceptar una invitación pide su código: el enlace por
 * sí solo no es una llave (la sesión del correo exacto es la llave,
 * y el servidor lo comprueba — la ley de la C1).
 */
export function SharedWithMe() {
  const { lang, userId, fmt } = useFaro();
  const [rows, setRows] = useState<Membership[] | null | undefined>(undefined);
  const [open, setOpen] = useState<OpenBook | null>(null);
  const [month, setMonth] = useState<string>("");
  const [cat, setCat] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<"accepted" | "bad-code" | "no-book" | null>(null);

  const load = useCallback(async () => {
    const all = await listMemberships();
    setRows(all === null ? null : all.filter((m) => m.member === userId && m.status === "active"));
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const openBook = async (m: Membership) => {
    const raw = asBook(await fetchSharedBook(m.bookOwner));
    if (!raw) { setNote("no-book"); return; }
    const book = scopeFilter(raw, m.scope);
    const months = Object.keys(book.months).sort().reverse();
    setMonth(months[0] ?? "");
    setCat(null);
    setOpen({ owner: m.bookOwner, role: m.role, book });
  };

  const accept = async () => {
    const id = code.trim();
    if (!id) return;
    const ok = await acceptInvite(id);
    setNote(ok ? "accepted" : "bad-code");
    if (ok) { setCode(""); void load(); }
  };

  const names = open ? makeNamer(open.book.structure, lang === "en" ? "en" : "es") : null;
  const months = open ? Object.keys(open.book.months).sort().reverse() : [];
  const figure = open && cat ? explainLines(open.book, month, cat) : null;

  return (
    <div className="sm-card">
      <span className="sm-slab"><BookOpen aria-hidden /> {L(lang, "Compartidos conmigo", "Shared with me")}</span>
      {rows === undefined ? <p className="sm-note">{L(lang, "Leyendo…", "Reading…")}</p> : null}
      {rows === null ? <p className="sm-note">{L(lang, "La lista no se pudo leer ahora; el código de una invitación sí se puede intentar.", "The list could not be read right now; an invitation code can still be tried.")}</p> : null}
      {rows !== undefined && rows !== null && rows.length === 0 && !open ? <p className="sm-note">{L(lang, "Nadie ha compartido un libro contigo todavía.", "No one has shared a book with you yet.")}</p> : null}
      {!open && rows ? rows.map((m) => (
        <div key={m.id} className="sm-mrow">
          <span className="sm-mtag">{m.role === "note" ? L(lang, "Puedes anotar", "You can note") : L(lang, "Solo mirar", "View only")} · {"all" in m.scope && m.scope.all ? L(lang, "todo el libro", "the whole book") : L(lang, "algunas áreas", "some areas")}</span>
          <button type="button" className="sm-mini" data-anchor="shared-open" onClick={() => void openBook(m)}>{L(lang, "Abrir", "Open")}</button>
        </div>
      )) : null}
      {!open ? (
        <div className="sm-accept">
          <input className="sm-input" data-anchor="shared-code" placeholder={L(lang, "código de una invitación", "an invitation code")} value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="button" className="sm-mini" data-anchor="shared-accept" onClick={() => void accept()}>{L(lang, "Aceptar", "Accept")}</button>
        </div>
      ) : null}
      {note === "accepted" ? <p className="sm-ok">{L(lang, "Invitación aceptada: el libro ya está en tu lista.", "Invitation accepted: the book is now in your list.")}</p> : null}
      {note === "bad-code" ? <p className="sm-warn">{L(lang, "Ese código no abrió ninguna invitación para tu correo.", "That code opened no invitation for your email.")}</p> : null}
      {note === "no-book" ? <p className="sm-warn">{L(lang, "El libro no se pudo abrir ahora.", "The book could not be opened right now.")}</p> : null}

      {open && names ? (
        <div className="sm-view">
          <div className="sm-mrow">
            <span className="sm-mtag">{open.role === "note" ? L(lang, "Puedes anotar en este libro", "You can note in this book") : L(lang, "Solo mirar: este libro no se toca", "View only: this book is not touched")}</span>
            <button type="button" className="sm-mini" data-anchor="shared-close" aria-label={L(lang, "Cerrar el libro", "Close the book")} onClick={() => setOpen(null)}><X aria-hidden /></button>
          </div>
          <div className="sm-opts">
            {months.map((mk) => (
              <button key={mk} type="button" className={month === mk ? "sm-opt is-on" : "sm-opt"} onClick={() => { setMonth(mk); setCat(null); }}>{mk}</button>
            ))}
          </div>
          {open.book.structure.categories.map((c) => {
            const total = categoryTotal(open.book, month, c.id);
            if (total === 0 && !explainLines(open.book, month, c.id).length) return null;
            return (
              <button key={c.id} type="button" className="sm-figrow" data-anchor="shared-figure" onClick={() => setCat(cat === c.id ? null : c.id)}>
                <span>{names.cat(c.id)}</span><span>{fmt(total)}</span>
              </button>
            );
          })}
          {figure && cat ? (
            <div className="sm-prev">
              {figure.map((f) => (
                <div key={f.line.id} className="sm-fline">
                  <span className="sm-line">{f.line.concept} · {fmt(f.line.amountMinor)}</span>
                  <Signature by={f.line.by} byName={f.line.byName} lang={lang === "en" ? "en" : "es"} />
                  {f.funder && f.funder !== "owner" ? <span className="sm-mtag">{L(lang, "de su dinero", "their money")}</span> : null}
                  {f.declaration ? <span className="sm-mtag">{L(lang, "declaración firmada", "signed declaration")}{f.line.declaredAccount ? ` · ${f.line.declaredAccount}` : ""}</span> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
