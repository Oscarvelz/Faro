import { useCallback, useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useFaro } from "./provider";
import { Signature } from "./signature";
import { acceptInvite, acceptTransfer, fetchSharedBook, leaveMembership, listMemberships, type Membership } from "@/spa/cloud";
import { makeNamer } from "@/lib/faro/defaults";
import { categoryTotal, explainLines, scopeFilter } from "@/lib/faro/world";
import { passiveRecordFromCopy, passiveRecordsOf, withPassiveRecord } from "@/lib/faro/exit";
import { uid } from "@/lib/faro/money";
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
  const { lang, userId, fmt, commitFlushed } = useFaro();
  const [rows, setRows] = useState<Membership[] | null | undefined>(undefined);
  const [open, setOpen] = useState<OpenBook | null>(null);
  const [month, setMonth] = useState<string>("");
  const [cat, setCat] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [ceremony, setCeremony] = useState<string | null>(null);
  const [note, setNote] = useState<"accepted" | "bad-code" | "no-book" | "left" | "leave-failed" | "copy-failed" | "record-failed" | "transferred" | null>(null);

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

  /* La ceremonia de salida (Pieza C8): serena, sin razones. La copia
   * se lee ANTES de salir (mientras el acceso vive); si no se puede
   * leer, la salida con copia no se ofrece como hecha — la persona
   * decide sabiéndolo. Salir cierra la membresía en el servidor: el
   * acceso muere ahí, y la vista abierta se retira con ella. Lo que
   * anotó queda en el libro, firmado. */
  const leave = async (m: Membership, kind: "export" | "passive" | "nothing") => {
    let scoped: LedgerState | null = null;
    if (kind !== "nothing") {
      const raw = asBook(await fetchSharedBook(m.bookOwner));
      if (!raw) { setNote("copy-failed"); return; }
      scoped = scopeFilter(raw, m.scope);
    }
    // OLA 31 (Familia 7, G31-3): LA CEREMONIA ANUNCIA SOLO LO
    // VERIFICADO — el registro se construye y pasa por la puerta
    // (passiveRecordFromCopy) ANTES de cerrar la membresía, y
    // aterriza en el Archivo de quien se va ANTES de que el acceso
    // muera. La orden vieja cerraba la membresía en el servidor
    // primero y despachaba el commit con su «guardado» sin mirar el
    // desenlace: si el escritor rehusaba el registro (una línea
    // injuzgable en la copia), la persona salía, su copia se
    // retiraba y el folio no estaba en su Archivo — pérdida en
    // silencio con anuncio falso. Ahora: si el registro no pasa la
    // puerta, la salida con registro NO se hace (la persona sigue
    // dentro y lo sabe, como con la copia que no se pudo leer); si
    // pasa, su «guardado» se anuncia porque ya aterrizó; y si la
    // salida falla después, el folio queda guardado y la nota dice
    // la verdad de la salida.
    if (kind === "passive" && scoped) {
      const record = passiveRecordFromCopy(scoped, m.bookOwner, lang === "en" ? "en" : "es", new Date().toISOString(), uid());
      if (!record) { setNote("record-failed"); return; }
      // OLA 32 (Familia 9, Q32-1 de Cara): LA MEMBRESÍA SE CIERRA
      // CUANDO EL FOLIO YA ESTÁ EN DISCO — la ley de la Ola 31
      // («aterriza en el Archivo ANTES de que el acceso muera»)
      // valía en orden de programa, pero el commit es estado de
      // React y la escritura del pack corre en el efecto posterior:
      // la caza midió faro_leave saliendo con el folio aún ausente
      // del pack guardado (~200–300 ms después aterrizaba). La
      // ceremonia espera la escritura asentada y juzga el pack
      // escrito: si el folio no aterrizó, el desenlace es el de la
      // puerta que rehúsa — «record-failed», la persona sigue
      // dentro y lo sabe — y la salida no se anuncia.
      const landed = await commitFlushed(
        (s) => withPassiveRecord(s, record),
        L(lang, "Registro del libro compartido guardado", "Shared-book record kept"),
        (l) => passiveRecordsOf(l).some((r) => r.id === record.id),
      );
      if (!landed) { setNote("record-failed"); return; }
    }
    const ok = await leaveMembership(m.id);
    if (!ok) { setNote("leave-failed"); return; }
    if (kind === "export" && scoped) {
      const blob = new Blob([JSON.stringify(scoped, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "faro-libro-compartido.json";
      a.click();
      URL.revokeObjectURL(a.href);
    }
    if (open?.owner === m.bookOwner) setOpen(null);
    setCeremony(null);
    setNote("left");
    void load();
  };

  const takeTransfer = async (m: Membership) => {
    const ok = await acceptTransfer(m.id);
    if (ok) { setNote("transferred"); void load(); }
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
        <div key={m.id}>
          <div className="sm-mrow">
            <span className="sm-mtag">{m.role === "note" ? L(lang, "Puedes anotar", "You can note") : L(lang, "Solo mirar", "View only")} · {"all" in m.scope && m.scope.all ? L(lang, "todo el libro", "the whole book") : L(lang, "algunas áreas", "some areas")}</span>
            <button type="button" className="sm-mini" data-anchor="shared-open" onClick={() => void openBook(m)}>{L(lang, "Abrir", "Open")}</button>
            <button type="button" className="sm-mini" data-anchor="shared-leave" onClick={() => setCeremony(ceremony === m.id ? null : m.id)}>{L(lang, "Salir", "Leave")}</button>
          </div>
          {m.transferTo === userId ? (
            <div className="sm-prev">
              <span className="sm-line">{L(lang, "Te han ofrecido quedarte con este libro: pasaría a ser tuyo y su dueño quedaría como miembro que anota.", "You have been offered this book: it would become yours and its owner would stay on as a member who can note.")}</span>
              <button type="button" className="sm-mini" data-anchor="shared-take-transfer" onClick={() => void takeTransfer(m)}>{L(lang, "Aceptar el traspaso", "Accept the transfer")}</button>
            </div>
          ) : null}
          {ceremony === m.id ? (
            <div className="sm-prev">
              <span className="sm-line">{L(lang, "Al salir, tu acceso a este libro termina y la copia que ves aquí se retira de este teléfono. Lo que anotaste queda en el libro, con tu firma. ¿Qué quieres hacer con tu copia de tu alcance?", "When you leave, your access to this book ends and the copy you see here is withdrawn from this phone. What you noted stays in the book, with your signature. What do you want to do with your copy of your scope?")}</span>
              <div className="sm-opts">
                <button type="button" className="sm-opt" data-anchor="leave-passive" onClick={() => void leave(m, "passive")}>{L(lang, "Guardarla como registro en mi Archivo", "Keep it as a record in my Archive")}</button>
                <button type="button" className="sm-opt" data-anchor="leave-export" onClick={() => void leave(m, "export")}>{L(lang, "Exportarla como archivo", "Export it as a file")}</button>
                <button type="button" className="sm-opt" data-anchor="leave-nothing" onClick={() => void leave(m, "nothing")}>{L(lang, "No llevarme nada", "Take nothing")}</button>
              </div>
              <p className="sm-note">{L(lang, "El registro guardado es historia: se lee en tu Archivo, no toca ninguna cuenta, y puedes borrarlo cuando quieras sin tocar el libro de su dueño.", "The kept record is history: it reads in your Archive, touches no account, and you can delete it whenever you like without touching its owner's book.")}</p>
            </div>
          ) : null}
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
      {note === "left" ? <p className="sm-ok">{L(lang, "Saliste del libro. Tu acceso terminó.", "You left the book. Your access has ended.")}</p> : null}
      {note === "leave-failed" ? <p className="sm-warn">{L(lang, "La salida no se pudo completar ahora; sigues dentro del libro.", "Leaving could not be completed right now; you are still in the book.")}</p> : null}
      {note === "copy-failed" ? <p className="sm-warn">{L(lang, "Tu copia no se pudo leer ahora, así que no saliste: sin copia en la mano, la salida con registro o archivo no se hace a ciegas.", "Your copy could not be read right now, so you did not leave: leaving with a record or a file is not done blind.")}</p> : null}
      {note === "record-failed" ? <p className="sm-warn">{L(lang, "Tu copia trae una línea que no se puede guardar como registro, así que no saliste: un registro no se anuncia guardado sin estarlo. Puedes intentarlo de nuevo o salir sin llevarte nada.", "Your copy holds a line that cannot be kept as a record, so you did not leave: a record is never announced as kept unless it is. You can try again or leave taking nothing.")}</p> : null}
      {note === "transferred" ? <p className="sm-ok">{L(lang, "El libro ahora es tuyo.", "The book is now yours.")}</p> : null}

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
