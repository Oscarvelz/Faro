/* 1.3.118 Remesas → Para quién (Oscar, 06:15): when the category is Remesas, pick the person the money goes to (or create
 * them right there), then see everything sent to each person. One field (RemitToPick: the editors' fit-pick sheet with an
 * inline "Nueva persona" and the pencil's manage state) and one view (RemitPeople: totals per person for this month, this
 * year and all time in both currencies, and a person's dated history). The money stays normal Fijos/Variables lines;
 * the person is only `line.to`. Deleting a person keeps every amount (their lines become "Sin persona"). */
import "./remit-people.css";
import { useMemo, useState } from "react";
import { ChevronLeft, Plus, Send, UserRound } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { FieldTip } from "./ui";
import { Glyph } from "./icons";
import { BookKit, type KitRow } from "./book-kit";
import { PickButton, PickSheet } from "./fit-pick";
import { useLayer } from "@/lib/manual/back";
import { formatMoney, uid } from "@/lib/faro/money";
import { addRemitPerson, colorRemitPerson, dropRemitPeople, iconRemitPerson, initialsOf, remitByPerson, remitHistory, remitHue, remitNameKey, remitPeopleOf, renameRemitPerson, type Pair, type RemitRow } from "@/lib/faro/remit-people";
import type { Currency, RemitPerson } from "@/lib/faro/types";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

export function RemitFace({ person, size = "md" }: { person: RemitPerson | null; size?: "sm" | "md" }) {
  const icon = person?.icon && !person.icon.startsWith("brand:") && !person.icon.startsWith("sub:") && person.icon !== "Circle" ? person.icon : "";
  return (
    <span className={`rp-face is-${size}${person ? "" : " is-none"}`} aria-hidden style={{ ["--pp" as string]: remitHue(person) }}>
      {person ? (icon ? <Glyph name={icon} /> : initialsOf(person.name)) : <UserRound />}
    </span>
  );
}

/** The people tools, shared by the field and the Libros card: add, rename, colour, icon, delete (lines stay). */
function usePeopleOps() {
  const { commit, lang, session } = useFaro();
  return {
    /** Same name as someone already listed = that person (no second copy). */
    add: (name: string): string => {
      const same = remitPeopleOf(session?.ledger).find((p) => remitNameKey(p.name) === remitNameKey(name));
      if (same) return same.id;
      const id = `rp-${uid().slice(0, 8)}`;
      commit((s) => addRemitPerson(s, name, id).state, L(lang, `Nueva persona ${name}`, `New person ${name}`));
      return id;
    },
    drop: (ids: string[]) => commit((s) => dropRemitPeople(s, ids), L(lang, "Borrar personas de Remesas", "Delete remittance people")),
    rename: (id: string, name: string) => commit((s) => renameRemitPerson(s, id, name), name),
    color: (id: string, hex: string) => commit((s) => colorRemitPerson(s, id, hex), hex),
    icon: (id: string, glyph: string) => commit((s) => iconRemitPerson(s, id, glyph), glyph),
    body: L(lang, "Lo que les enviaste se queda en tus libros; esas líneas pasan a Sin persona.", "What you sent them stays in your books; those lines become No person."),
  };
}

/** "Para" / "To": the picker for a Remesas line. Optional; empty = "Sin persona". */
export function RemitToPick({ value, onChange, test = "rp-pick" }: { value: string; onChange: (id: string) => void; test?: string }) {
  const { session, lang } = useFaro();
  const [open, setOpen] = useState(false);
  const ops = usePeopleOps();
  const people = remitPeopleOf(session?.ledger);
  const cur = people.find((p) => p.id === value) ?? null;
  return (
    <>
      <PickButton test={test} open={open} onOpen={() => setOpen(true)} mark={cur ? <RemitFace person={cur} size="sm" /> : <UserRound />} text={cur?.name ?? ""} placeholder={L(lang, "Sin persona", "No person")} />
      {open ? (
        <PickSheet
          test="rp-sheet"
          title={L(lang, "Para quién", "Sent to")}
          value={value}
          none={L(lang, "Sin persona", "No person")}
          items={people.map((p) => ({ id: p.id, label: p.name, mark: <RemitFace person={p} size="sm" />, color: remitHue(p) }))}
          onClose={() => setOpen(false)}
          onPick={(id) => { onChange(id); setOpen(false); }}
          manage={{
            word: ["persona", "personas", "person", "people"],
            body: ops.body,
            onDropMany: (ids) => { if (ids.includes(value)) onChange(""); ops.drop(ids); },
            onRename: ops.rename,
            onColor: ops.color,
          }}
          add={{ placeholder: L(lang, "Nueva persona", "New person"), onAdd: (name) => { onChange(ops.add(name)); setOpen(false); } }}
        />
      ) : null}
    </>
  );
}

/** The labelled field, ready for an editor grid (Cambio "Enviar a" and the Fijos/Variables line editor). */
export function RemitToField({ value, onChange, className = "label is-wide" }: { value: string; onChange: (id: string) => void; className?: string }) {
  const { lang } = useFaro();
  return (
    <div className={`${className} rp-field`} data-f="to">
      <span className="lab-head">{L(lang, "Para", "To")}<FieldTip topic="f-para" /></span>
      <RemitToPick value={value} onChange={onChange} />
    </div>
  );
}

const fmtDay = (iso: string, lang: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
};

type Col = "month" | "year" | "all";

/** Totals per person (this month, this year, all time; both currencies) and, on a tap, that person's history.
 *  Narrow: the list, then the person in its place (its own Back step). Wide (container >= 620px): list | person side by side. */
export function RemitPeople({ monthKey, where }: { monthKey: string; where: "book" | "study" }) {
  const { session, lang } = useFaro();
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const ops = usePeopleOps();
  const data = useMemo(() => (session ? remitByPerson(session.ledger, monthKey) : null), [session, monthKey]);
  useLayer(picked !== null, () => setPicked(null));
  if (!session || !data) return null;
  const state = session.ledger;
  const display: Currency = state.settings.display;
  const other: Currency = display === "USD" ? "NIO" : "USD";
  const amount = (p: Pair, c: Currency) => (c === "USD" ? p.usd : p.nio);
  const money = (p: Pair, c: Currency) => formatMoney(amount(p, c), c, lang);
  const year = monthKey.slice(0, 4);
  const rows = data.rows;
  const selId = picked ?? rows[0]?.id ?? null;
  const sel = rows.find((r) => r.id === selId) ?? null;
  const nameOf = (r: RemitRow) => r.person?.name ?? L(lang, "Sin persona", "No person");
  const kitRows: KitRow[] = remitPeopleOf(state).map((p) => ({ id: p.id, label: p.name, glyph: p.icon || undefined, color: remitHue(p), initial: p.name }));
  const entries = sel ? remitHistory(state, sel.id) : [];
  const cols: [Col, string, string][] = [
    ["month", L(lang, "Este mes", "This month"), "rp-mes"],
    ["year", L(lang, "Este año", "This year"), "rp-ano"],
    ["all", L(lang, "En total", "All time"), "rp-total"],
  ];
  const book = where === "book";
  const head = (
    <header className="pp-head rp-head">
      <h2 className={`${book ? "serif text-2xl " : ""}lab-head`}>{book ? L(lang, "Remesas", "Remittances") : L(lang, "Por persona", "By person")}<Hint topic="remesas-personas" /></h2>
      {book ? (
        <span className="rp-tools">
          <BookKit title={L(lang, "Para quién", "Sent to")} rows={kitRows} word={["persona", "personas", "person", "people"]} test="rp-kit" body={ops.body}
            onEdit={(id) => setPicked(id)} onDrop={ops.drop} onRename={ops.rename} onColor={ops.color} onIcon={ops.icon} />
          <button type="button" className="icon-btn kit-btn" data-test="rp-add" aria-pressed={adding} aria-label={L(lang, "Nueva persona", "New person")} title={L(lang, "Nueva persona", "New person")} onClick={() => setAdding(true)}><Plus aria-hidden /></button>
        </span>
      ) : null}
      {adding ? (
        <PickSheet test="rp-add-sheet" title={L(lang, "Para quién", "Sent to")} value="" items={remitPeopleOf(state).map((p) => ({ id: p.id, label: p.name, mark: <RemitFace person={p} size="sm" /> }))}
          onClose={() => setAdding(false)} onPick={(id) => { setAdding(false); window.setTimeout(() => setPicked(id), 160); }}
          add={{ placeholder: L(lang, "Nueva persona", "New person"), onAdd: (name) => { ops.add(name); setAdding(false); } }} />
      ) : null}
    </header>
  );
  return (
    <div className={`rp-wrap is-${where}`} data-open={picked !== null ? "1" : undefined} data-test="rp-wrap">
      {head}
      {book ? (
        <div className="pp-hero rp-hero">
          <span className="pp-pic rp-pic" aria-hidden><Send /></span>
          <div className="pp-hero-text">
            <em>{L(lang, `Enviado en ${year}`, `Sent in ${year}`)}<Hint topic="rp-ano" /></em>
            <strong className="num" data-test="rp-year-total">{money(data.year, display)}</strong>
            <span className="num">{money(data.year, other)}</span>
          </div>
        </div>
      ) : null}
      <div className="rp-split">
        <div className="rp-list" role="list">
          <div className="rp-cols">
            {cols.map(([k, label, topic]) => <span key={k} className="rp-col">{label}<Hint topic={topic} /></span>)}
          </div>
          {rows.map((r) => (
            <button key={r.id || "none"} type="button" role="listitem" className={`rp-row${r.id === selId ? " is-sel" : ""}${r.person ? "" : " is-none"}`} data-test="rp-row" data-id={r.id} aria-pressed={picked === r.id} style={{ ["--pp" as string]: remitHue(r.person) }} onClick={() => setPicked(r.id)}>
              <span className="rp-who"><RemitFace person={r.person} /><strong>{nameOf(r)}</strong></span>
              {cols.map(([k]) => (
                <span key={k} className={`rp-cell${amount(r[k], display) ? "" : " is-zero"}`} data-k={k}>
                  <b className="num">{money(r[k], display)}</b>
                  <small className="num">{money(r[k], other)}</small>
                </span>
              ))}
            </button>
          ))}
          {book && !remitPeopleOf(state).length ? <p className="rp-note">{L(lang, "Toca + para añadir a quien le envías, o elige Para en un envío.", "Tap + to add who you send to, or pick To on a transfer.")}</p> : null}
        </div>
        {sel ? (
          <div className="rp-detail" data-test="rp-detail" style={{ ["--pp" as string]: remitHue(sel.person) }}>
            <div className="rp-dhead">
              <button type="button" className="rp-back" data-test="rp-back" aria-label={L(lang, "Atrás", "Back")} onClick={() => window.history.back()}><ChevronLeft aria-hidden /></button>
              <RemitFace person={sel.person} />
              <strong className="rp-dname" data-test="rp-dname">{nameOf(sel)}</strong>
            </div>
            <div className="rp-tiles">
              {cols.map(([k, label, topic]) => (
                <div key={k} className="rp-tile" data-k={k}>
                  <em>{label}<Hint topic={topic} /></em>
                  <b className="num" data-test={`rp-d-${k}`}>{money(sel[k], display)}</b>
                  <small className="num">{money(sel[k], other)}</small>
                </div>
              ))}
            </div>
            <p className="rp-kick">{L(lang, "Historial", "History")}<Hint topic="rp-historial" /><span className="num">{entries.length}</span></p>
            {entries.length ? (
              <ul className="rp-hist" data-test="rp-hist">
                {entries.map((e) => (
                  <li key={`${e.monthKey}-${e.lineId}`}>
                    <span className="rp-hwhen"><b>{fmtDay(e.date, lang)}</b><small>{e.concept || L(lang, "Envío", "Transfer")} · {e.book === "fixed" ? L(lang, "Fijos", "Fixed") : "Variables"}</small></span>
                    <span className="rp-hamt"><b className="num">{formatMoney(e.amountMinor, e.currency, lang)}</b><small className="num">{formatMoney(e.currency === "USD" ? e.nio : e.usd, e.currency === "USD" ? "NIO" : "USD", lang)}</small></span>
                  </li>
                ))}
              </ul>
            ) : <p className="rp-note">{L(lang, "Aún no hay envíos para esta persona.", "No transfers for this person yet.")}</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Libros → Variables: the Remesas card, under Personas. Shown once there is a person or a remittance line, so a ledger
 *  without remittances keeps its Variables book exactly as it was. */
export function RemitPeopleBox() {
  const { session, key } = useFaro();
  if (!session) return null;
  if (!remitByPerson(session.ledger, key).rows.length) return null;
  return (
    <section className="card pp-box rp-box" data-anchor="book-remit" data-test="rp-box">
      <RemitPeople monthKey={key} where="book" />
    </section>
  );
}
