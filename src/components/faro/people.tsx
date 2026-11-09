import "./people.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cake, Gift, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { formatMoney, parseAmount, uid } from "@/lib/faro/money";
import { upsertLine } from "@/lib/faro/reducer";
import { dayLabel, mergeContacts, nameKey, OCCASIONS, occasionName, occasionsOf, peopleAdvice, peopleOf, personLines, personName, personTotals, spendByPerson, todayIso, upcoming, type Occasion } from "@/lib/faro/people";
import { parseVCards, parseVDate, type ImportedContact } from "@/lib/faro/vcard";
import { nativePickContacts } from "@/spa/native";
import type { Currency, Lang, LedgerState, Line, LineKind, OccasionKind, Person, PersonDate } from "@/lib/faro/types";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { FieldTip } from "./ui";
import { Head } from "./panorama";
import { DayField, ThemeSelect } from "./line-form";

const L = (lang: Lang, es: string, en: string) => (lang === "en" ? en : es);
const HUES = ["#d0679a", "#3f8fd2", "#d08a2e", "#4fa37a", "#8d6ad8", "#c9564a", "#2fa3a8", "#a8862f"];
export function personHue(p: Person): string {
  if (p.color) return p.color;
  let h = 0;
  for (const c of p.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

function when(days: number, lang: Lang) {
  if (days === 0) return L(lang, "hoy", "today");
  if (days === 1) return L(lang, "mañana", "tomorrow");
  return L(lang, `en ${days}\u00a0días`, `in ${days}\u00a0days`);
}

/** Categories a line can go to, as ThemeSelect options. value = "<kind>|<categoryId>". */
export function lineTargets(state: LedgerState, lang: Lang, names: { cat: (id: string) => string; purchase: (id: string) => string }, income: boolean) {
  const out: { value: string; label: string }[] = [];
  if (income) out.push({ value: "income-variable|", label: L(lang, "Ingreso", "Income") });
  const cats = state.structure.categories.filter((c) => !c.hidden).sort((a, b) => (a.group === b.group ? a.order - b.order : a.group === "variable" ? -1 : 1));
  for (const c of cats) out.push({ value: `${c.group === "fixed" ? "expense-fixed" : "expense-variable"}|${c.id}`, label: `${names.cat(c.id)} · ${c.group === "fixed" ? L(lang, "fijo", "fixed") : L(lang, "variable", "variable")}` });
  for (const p of state.structure.purchases.filter((x) => !x.hidden).sort((a, b) => a.order - b.order)) out.push({ value: `purchase|${p.id}`, label: `${names.purchase(p.id)} · ${L(lang, "compra", "purchase")}` });
  return out;
}

/** A normal ledger line, built the same way LineForm builds one. */
export function plainLine(over: { kind: LineKind; categoryId: string; concept: string; amountMinor: number; currency: Currency; monthKey: string; bookedOn?: string; personId?: string; occasionId?: string; note?: string }): Line {
  return {
    id: uid(), seriesId: uid(), monthKey: over.monthKey, kind: over.kind, concept: over.concept, amountMinor: over.amountMinor, currency: over.currency,
    active: true, note: over.note ?? "", categoryId: over.categoryId, subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "",
    cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: over.currency, icon: "", history: [], bookedOn: over.bookedOn ?? "", startedOn: "",
    ...(over.personId ? { personId: over.personId } : {}),
    ...(over.personId && over.occasionId ? { occasionId: over.occasionId } : {}),
  };
}

function CurrencyPick({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="ah-sign" role="group">
      <button type="button" aria-pressed={value === "NIO"} onClick={() => onChange("NIO")}>C$</button>
      <button type="button" aria-pressed={value === "USD"} onClick={() => onChange("USD")}>US$</button>
    </div>
  );
}

/* ---------------------------------------------------------------- Toast + share inbox */

const TOAST = "faro-pp-toast";
export const ppToast = (text: string) => window.dispatchEvent(new CustomEvent(TOAST, { detail: text }));

/** Message after an import: the no-birthday notice wins, otherwise how many came in. */
function importNotice(lang: Lang, r: { added: number; restored: number; noBirthday: string[] }, found: number): string {
  if (!found) return L(lang, "No hay contactos en ese archivo", "There are no contacts in that file");
  if (r.noBirthday.length) return L(lang, "Sin fecha de cumpleaños: añádela cuando quieras", "No birthday date yet: add it whenever you like");
  const n = r.added + r.restored;
  return n ? L(lang, `Personas añadidas: ${n}`, `People added: ${n}`) : L(lang, "Ya estaban en Personas", "They were already in People");
}

export function useImport() {
  const { session, lang, commit } = useFaro();
  return (contacts: ImportedContact[]) => {
    if (!session) return;
    const r = mergeContacts(peopleOf(session.ledger), contacts, uid);
    if (r.added || r.restored || r.updated) commit((s) => ({ ...s, people: mergeContacts(peopleOf(s), contacts, uid).people }), L(lang, "Importar contactos", "Import contacts"));
    ppToast(importNotice(lang, r, contacts.length));
  };
}

/** Lives once in the shell: shows the toast and takes contacts shared to Faro (Web Share Target, see sw.js). */
export function PeopleInbox() {
  const { session, setUi } = useFaro();
  const [msg, setMsg] = useState("");
  const add = useImport();
  useEffect(() => {
    let timer = 0;
    const on = (e: Event) => { setMsg(String((e as CustomEvent).detail ?? "")); window.clearTimeout(timer); timer = window.setTimeout(() => setMsg(""), 4200); };
    window.addEventListener(TOAST, on);
    return () => { window.removeEventListener(TOAST, on); window.clearTimeout(timer); };
  }, []);
  const ready = !!session;
  useEffect(() => {
    if (!ready || !("caches" in window)) return;
    if (new URLSearchParams(location.search).has("share")) {
      const url = new URL(location.href);
      url.searchParams.delete("share");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
    // Checked on every start, not only with ?share: a share that arrived before sign-in waits here until then.
    void (async () => {
      const cache = await caches.open(SHARE_CACHE);
      const hit = await cache.match(SHARE_KEY);
      if (!hit) return;
      const text = await hit.text();
      await cache.delete(SHARE_KEY);
      setUi({ section: "variable" });
      add(parseVCards(text));
    })().catch(() => {});
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return msg ? <div className="pp-toast" role="status">{msg}</div> : null;
}
/** Must match public/sw.js. */
export const SHARE_CACHE = "share-inbox";
export const SHARE_KEY = "./share-contact-inbox";

/* ---------------------------------------------------------------- Personas (Libros → Variables) */

type ContactsApi = { select: (props: string[], opts: { multiple: boolean }) => Promise<{ name?: string[] }[]> };
const contactsApi = (): ContactsApi | null => {
  const c = (navigator as unknown as { contacts?: ContactsApi }).contacts;
  return c && typeof c.select === "function" ? c : null;
};

function nextLine(o: Occasion | undefined, lang: Lang) {
  if (!o) return null;
  const what = o.kind === "birthday" ? (o.next.age ? L(lang, `cumple ${o.next.age}`, `turns ${o.next.age}`) : L(lang, "cumpleaños", "birthday")) : occasionName(o, lang);
  return { what, day: dayLabel(o.next.date, lang), when: when(o.next.days, lang) };
}

export function PeopleBox() {
  const { session, lang, fmt, commit, confirm } = useFaro();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // person id, or "new"
  const [gift, setGift] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = useImport();
  if (!session) return null;
  const state = session.ledger;
  const { display, rateE4 } = state.settings;
  const all = peopleOf(state);
  const people = all.filter((p) => !p.archived);
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const yearly = spendByPerson(state, year, display, rateE4);
  const yearTotal = yearly.rows.filter((r) => !r.person.archived).reduce((sum, r) => sum + r.minor, 0);
  const soon = upcoming(people, 366, today)[0];
  const savePeople = (next: Person[], detail: string) => commit((s) => ({ ...s, people: next }), detail);
  /** Same name as an archived person: bring them back (with their history) instead of a second copy. */
  const saveNew = (p: Person) => {
    const old = all.find((x) => x.archived && nameKey(x.name) === nameKey(p.name));
    if (old) { savePeople(all.map((x) => (x.id === old.id ? { ...p, id: old.id, color: old.color, birthday: p.birthday || old.birthday, dates: p.dates.length ? p.dates : old.dates, note: p.note || old.note } : x)), `Volver a agregar ${p.name}`); setOpen(old.id); }
    else { savePeople([...all, p], `Agregar persona ${p.name}`); setOpen(p.id); }
    setEditing(null);
  };
  const pick = async () => {
    setEditing(null);
    // 1.3.165: inside the Android shell, the phone's own contact picker (bridge) comes FIRST —
    // the web Contact Picker API does not exist in the WebView, so this button used to fall
    // through to the hidden .vcf input: a file picker hunting a file nobody has. Chrome keeps
    // its API next; the file stays last. 1.3.172: a picked contact's birthday now rides along
    // when the pick grant covered it, normalised by the vCard reader's own date parser (the
    // raw phone form, "1985-03-04" or "--03-04", becomes the stored form here); where it did
    // not, the person arrives name-only, as before.
    const shell = nativePickContacts();
    if (shell) {
      const picked = await shell;
      if (picked === null) return; // picker cancelled: silence, like the web API's catch below
      const contacts: ImportedContact[] = picked.map((c) => ({ name: c.name, birthday: parseVDate(c.birthday ?? ""), dates: [] })).filter((c) => c.name);
      if (contacts.length) add(contacts);
      return;
    }
    const api = contactsApi();
    if (!api) {
      // 1.3.172 (census R4): no bridge and no web picker — the .vcf file is the only door, and
      // the tap used to open the file hunt in silence. Say what is needed first, in the toast
      // this screen already uses, and give it a moment to be read before the picker opens.
      ppToast(L(lang, "Aquí no hay selector de contactos: elige un archivo .vcf con tus contactos.", "No contact picker here: pick a .vcf file with your contacts."));
      window.setTimeout(() => fileRef.current?.click(), 900);
      return;
    }
    try {
      const got = await api.select(["name"], { multiple: true });
      const contacts: ImportedContact[] = (got ?? []).map((c) => ({ name: (c.name?.[0] ?? "").trim(), birthday: "", dates: [] })).filter((c) => c.name);
      if (contacts.length) add(contacts);
    } catch { /* cancelled */ }
  };
  const readFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let text = "";
    for (const f of Array.from(files)) text += `${await f.text()}\n`;
    if (fileRef.current) fileRef.current.value = "";
    add(parseVCards(text));
  };
  const remove = (p: Person) => confirm({
    title: L(lang, `¿Borrar a ${p.name}?`, `Delete ${p.name}?`),
    body: L(lang, "Su historial de gastos se conserva: sus regalos siguen con su nombre en tus libros y en Estudio.", "Their spending history is kept: their gifts keep their name in your books and in Study."),
    danger: true,
    yes: L(lang, "Borrar", "Delete"),
    run: () => commit((s) => ({ ...s, people: peopleOf(s).map((x) => (x.id === p.id ? { ...x, archived: true } : x)) }), `Borrar persona ${p.name}`),
  });
  const hand = (
    <button type="button" className="pp-hand" aria-pressed={editing === "new"} onClick={() => { setEditing(editing === "new" ? null : "new"); setOpen(null); }}>
      <Pencil className="size-4" aria-hidden />{L(lang, "Escribir a mano", "Type it by hand")}
    </button>
  );

  return (
    <section className="card pp-box" data-anchor="book-people">
      <header className="pp-head">
        <h2 className="serif text-2xl lab-head">{L(lang, "Personas", "People")}<Hint topic="personas" /></h2>
        {people.length ? (
          <button type="button" className="pp-add" aria-label={L(lang, "Agregar personas de tus contactos", "Add people from your contacts")} onClick={() => void pick()}>
            <UserPlus className="size-4" />
          </button>
        ) : null}
        <input ref={fileRef} type="file" accept=".vcf,text/vcard,text/x-vcard" multiple hidden onChange={(e) => void readFiles(e.target.files)} />
      </header>
      {people.length === 0 && editing !== "new" ? (
        <div className="pp-empty">
          <span className="pp-pic" aria-hidden><Gift /></span>
          <p>{L(lang, "Anota a quién le regalas y ve cuánto le das en cada fecha.", "Add who you give gifts to and see what you give each date.")}</p>
          <button type="button" className="btn" onClick={() => void pick()}><UserPlus className="size-4" />{L(lang, "Agregar persona", "Add a person")}</button>
          {hand}
        </div>
      ) : null}
      {people.length ? (
        <div className="pp-hero">
          <span className="pp-pic" aria-hidden><Gift /></span>
          <div className="pp-hero-text">
            <em>{L(lang, `Regalado en ${year}`, `Given in ${year}`)}</em>
            <strong className="num">{fmt(yearTotal)}</strong>
            {soon ? <span><Cake className="pp-cake" aria-hidden />{soon.kind === "birthday"
              ? L(lang, `${soon.person.name} cumple\u00a0${when(soon.next.days, lang)}`, `${soon.person.name}'s birthday ${when(soon.next.days, lang)}`)
              : `${soon.person.name} · ${occasionName(soon, lang)}\u00a0${when(soon.next.days, lang)}`}</span> : null}
          </div>
        </div>
      ) : null}
      {editing === "new" ? <PersonForm lang={lang} onCancel={() => setEditing(null)} onSave={saveNew} /> : null}
      {people.length ? (
        <div className="pp-list">
          {[...people].map((p) => ({ p, occ: occasionsOf(p, today) })).sort((a, b) => (a.occ[0]?.next.days ?? 999) - (b.occ[0]?.next.days ?? 999) || a.p.name.localeCompare(b.p.name)).map(({ p, occ }) => {
            const totals = personTotals(state, p, display, rateE4);
            // The row sits under "Regalado en <year>", so it shows this year's amount; the rows add up to the headline.
            const thisYear = yearly.rows.find((r) => r.person.id === p.id)?.minor ?? 0;
            const next = nextLine(occ[0], lang);
            const isOpen = open === p.id;
            const byOcc = new Map(totals.occasions.map((o) => [o.id, o.minor]));
            return (
              <div key={p.id} className={`pp-item${isOpen ? " is-open" : ""}`} style={{ ["--pp" as string]: personHue(p) }}>
                <button type="button" className="pp-row" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : p.id); setGift(null); setEditing(null); }}>
                  <span className="pp-face" aria-hidden>{initials(p.name)}</span>
                  <span className="pp-who">
                    <strong>{p.name}</strong>
                    <small>{next ? (
                      <span className="pp-meta">
                        <span>{next.day} · {next.what}</span>
                        <span>{next.when}</span>
                      </span>
                    ) : <span>{L(lang, "Sin fechas", "No dates")}</span>}</small>
                  </span>
                  <span className={`pp-sum num${thisYear ? "" : " is-zero"}`} data-year={year}>{fmt(thisYear)}</span>
                </button>
                {isOpen && editing === p.id ? (
                  <PersonForm lang={lang} person={p} onCancel={() => setEditing(null)} onSave={(np) => { savePeople(all.map((x) => (x.id === p.id ? np : x)), `Editar persona ${np.name}`); setEditing(null); }} />
                ) : isOpen && gift === p.id ? (
                  <GiftForm person={p} onDone={() => setGift(null)} />
                ) : isOpen ? (
                  <div className="pp-detail">
                    {totals.count ? (
                      <p className="pp-all"><em>{L(lang, "En total, todos los años", "All years, in total")}</em><b className="num">{fmt(totals.total)}</b></p>
                    ) : null}
                    {/* Past years only, as plain lines: this year is on the row and in the occasion list below. */}
                    {totals.years.some((y) => y.year < year) ? (
                      <div className="pp-years">
                        {totals.years.filter((y) => y.year < year).slice(0, 6).map((y) => (
                          <p key={y.year} className="pp-year"><em>{y.year} ·</em> <b className="num">{fmt(y.minor)}</b></p>
                        ))}
                      </div>
                    ) : null}
                    {totals.count ? null : <p className="pp-note">{L(lang, "Aún no hay regalos anotados.", "No gifts noted yet.")}</p>}
                    {occ.length > 1 || totals.occasions.length ? (
                      <ul className="pp-dates" data-anchor="book-people-dates">
                        {occ.map((o) => (
                          <li key={o.id}>
                            <span>{occasionName(o, lang)}<i>{dayLabel(o.next.date, lang)}</i></span>
                            {totals.occasions.length ? <b className={`num${byOcc.get(o.id) ? "" : " is-zero"}`}>{fmt(byOcc.get(o.id) ?? 0)}</b> : null}
                          </li>
                        ))}
                        {byOcc.get("") ? <li><span>{L(lang, "Sin ocasión", "No occasion")}</span><b className="num">{fmt(byOcc.get("") ?? 0)}</b></li> : null}
                      </ul>
                    ) : null}
                    {p.note ? <p className="pp-note">{p.note}</p> : null}
                    <div className="pp-acts">
                      <button type="button" className="btn secondary pp-icon" aria-label={L(lang, "Borrar persona", "Delete person")} onClick={() => remove(p)}><Trash2 className="size-4" /></button>
                      <button type="button" className="btn secondary" onClick={() => setEditing(p.id)}><Pencil className="size-4" />{L(lang, "Editar", "Edit")}</button>
                      <button type="button" className="btn pp-gift" onClick={() => setGift(p.id)}><Gift className="size-4" />{L(lang, "Regalo", "Gift")}</button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="pp-item pp-hand-row">{hand}</div>
        </div>
      ) : null}
    </section>
  );
}

const CUSTOM = "custom";

function PersonForm({ lang, person, onCancel, onSave }: { lang: Lang; person?: Person; onCancel: () => void; onSave: (p: Person) => void }) {
  const [name, setName] = useState(person?.name ?? "");
  const [birthday, setBirthday] = useState(person?.birthday ?? "");
  const [note, setNote] = useState(person?.note ?? "");
  const [dates, setDates] = useState<PersonDate[]>(person?.dates ?? []);
  const kinds = [...OCCASIONS.map((o) => ({ value: o.kind, label: L(lang, o.es, o.en) })), { value: CUSTOM, label: L(lang, "Otra: escríbela", "Other: type it") }];
  const set = (i: number, patch: Partial<PersonDate>) => setDates(dates.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setKind = (i: number, kind: OccasionKind) => {
    const preset = OCCASIONS.find((o) => o.kind === kind);
    const d = dates[i];
    set(i, { kind, ...(preset?.md && !d.date ? { date: `${todayIso().slice(0, 4)}-${preset.md}` } : {}) });
  };
  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: person?.id ?? uid(), name: name.trim(), birthday, note: note.trim(),
      dates: dates.filter((d) => d.date).map((d) => ({ ...d, kind: d.kind ?? CUSTOM, label: (d.kind ?? CUSTOM) === CUSTOM ? d.label.trim() || L(lang, "Fecha", "Date") : "" })),
      ...(person?.color ? { color: person.color } : {}),
    });
  };
  return (
    <div className="ah-form sc-form pp-form">
      <div className="ah-grid">
        <label className="label is-wide">
          <span className="lab-head">{L(lang, "Nombre", "Name")}<FieldTip topic="f-persona" /></span>
          <input className="field" value={name} autoFocus={!person} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
        </label>
        <div className="label is-wide">
          <span className="lab-head">{L(lang, "Cumpleaños", "Birthday")}<FieldTip topic="persona-cumple" /></span>
          <DayField value={birthday} onChange={setBirthday} />
        </div>
        {dates.map((d, i) => (
          <div key={d.id} className="label is-wide pp-date-row" data-anchor="pp-occasion">
            <span className="lab-head">{L(lang, "Otra fecha", "Other date")}<FieldTip topic="persona-fecha" /></span>
            <div className="pp-date-line">
              <ThemeSelect value={d.kind ?? CUSTOM} onChange={(v) => setKind(i, v as OccasionKind)} options={kinds} />
              <button type="button" className="pp-x" aria-label={L(lang, "Quitar fecha", "Remove date")} onClick={() => setDates(dates.filter((_, j) => j !== i))}><X className="size-4" /></button>
            </div>
            {(d.kind ?? CUSTOM) === CUSTOM ? (
              <label className="pp-date-name">
                <span className="lab-head">{L(lang, "Nombre de la fecha", "Name of the date")}<FieldTip topic="persona-fecha-nombre" /></span>
                <input className="field" value={d.label} placeholder={L(lang, "Bautizo", "Baptism")} onChange={(e) => set(i, { label: e.target.value })} />
              </label>
            ) : null}
            <DayField value={d.date} onChange={(v) => set(i, { date: v })} />
          </div>
        ))}
        <button type="button" className="pp-more is-wide" onClick={() => setDates([...dates, { id: uid(), label: "", date: "", kind: "anniversary" }])}><Plus className="size-4" />{L(lang, "Otra fecha", "Other date")}</button>
        <label className="label is-wide">
          <span className="lab-head">{L(lang, "Nota", "Note")}</span>
          <textarea className="field" rows={2} value={note} placeholder={L(lang, "Talla, gustos…", "Size, likes…")} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="ah-actions">
        <button type="button" className="btn secondary" onClick={onCancel}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" disabled={!name.trim()} onClick={save}>{L(lang, "Guardar", "Save")}</button>
      </div>
    </div>
  );
}

function GiftForm({ person, onDone }: { person: Person; onDone: () => void }) {
  const { session, lang, names, commit, key } = useFaro();
  const state = session!.ledger;
  const options = useMemo(() => lineTargets(state, lang, names, false), [state.structure, lang]);
  const last = personLines(state, person.id)[0];
  const fallback = options.find((o) => o.value === "expense-variable|v-entretenimiento")?.value ?? options[0]?.value ?? "";
  const [target, setTarget] = useState(last ? `${last.kind}|${last.categoryId}` : fallback);
  const [concept, setConcept] = useState(L(lang, "Regalo", "Gift"));
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(state.settings.display);
  const now = todayIso();
  const [day, setDay] = useState(now.startsWith(key) ? now : `${key}-01`);
  const occ = occasionsOf(person, now);
  const [occasion, setOccasion] = useState(occ[0] && occ[0].next.days <= 30 ? occ[0].id : "");
  const minor = parseAmount(amount);
  const save = () => {
    if (minor === null || minor <= 0 || !target) return;
    const [kind, categoryId] = target.split("|") as [LineKind, string];
    const line = plainLine({ kind, categoryId, concept: concept.trim() || L(lang, "Regalo", "Gift"), amountMinor: minor, currency, monthKey: key, bookedOn: day, personId: person.id, occasionId: occasion || undefined });
    commit((s) => upsertLine(s, line), `Regalo ${person.name}`);
    onDone();
  };
  const [y, m] = key.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return (
    <div className="ah-form sc-form pp-form">
      <div className="ah-grid">
        <label className="label">
          <span className="lab-head">{L(lang, "Concepto", "Item")}</span>
          <input className="field" value={concept} onChange={(e) => setConcept(e.target.value)} />
        </label>
        <label className="label">
          <span className="lab-head">{L(lang, "Monto", "Amount")}<FieldTip topic="f-monto" /></span>
          <input className="field num" inputMode="decimal" value={amount} autoFocus placeholder="0" onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
        </label>
        <div className="label">
          <span className="lab-head">{L(lang, "Día", "Day")}</span>
          <DayField value={day} onChange={setDay} min={`${key}-01`} max={`${key}-${String(lastDay).padStart(2, "0")}`} />
        </div>
        <div className="label">
          <span className="lab-head">{L(lang, "Moneda", "Currency")}</span>
          <CurrencyPick value={currency} onChange={setCurrency} />
        </div>
        <div className="label is-wide">
          <span className="lab-head">{L(lang, "Categoría", "Category")}<FieldTip topic="persona-regalo" /></span>
          <ThemeSelect value={target} onChange={setTarget} options={options} />
        </div>
        {occ.length ? (
          <div className="label is-wide">
            <span className="lab-head">{L(lang, "Ocasión", "Occasion")}<FieldTip topic="persona-ocasion" /></span>
            <ThemeSelect value={occasion} onChange={setOccasion} options={[{ value: "", label: L(lang, "Ninguna", "None") }, ...occ.map((o) => ({ value: o.id, label: occasionName(o, lang) }))]} />
          </div>
        ) : null}
      </div>
      <div className="ah-actions">
        <button type="button" className="btn secondary" onClick={onDone}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" disabled={minor === null || minor <= 0} onClick={save}>{L(lang, "Guardar", "Save")}</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Line editor field */

/** Optional "Persona" pick for spending lines; renders nothing when no people exist. */
export function PersonPick({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { session, lang } = useFaro();
  const all = peopleOf(session?.ledger);
  // Archived people are hidden, except the one this line already names (so editing it keeps the tag).
  const people = all.filter((p) => !p.archived || p.id === value);
  if (!people.length) return null;
  return (
    <div className="label">
      <span className="lab-head">{L(lang, "Persona", "Person")}<FieldTip topic="f-persona" /></span>
      <ThemeSelect value={value} onChange={onChange} options={[{ value: "", label: L(lang, "Nadie", "No one") }, ...people.map((p) => ({ value: p.id, label: personName(p, lang) }))]} />
    </div>
  );
}

/* ---------------------------------------------------------------- Estudio */

export function PeopleStudy() {
  const { session, lang, fmt, ui } = useFaro();
  if (!session) return null;
  const state = session.ledger;
  if (!peopleOf(state).length) return null;
  const { display, rateE4 } = state.settings;
  const data = spendByPerson(state, ui.year, display, rateE4);
  const top = data.rows[0]?.minor ?? 0;
  return (
    <section className="card pano-card pp-study" data-section="spend" data-anchor="study-people">
      <Head kicker={L(lang, `Regalos\u00a0·\u00a0${ui.year}`, `Gifts\u00a0·\u00a0${ui.year}`)} title={L(lang, "Gasto por persona", "Spending by person")} topic="estudio-personas" />
      <div className="pp-hero is-study">
        <span className="pp-pic" aria-hidden><Gift /></span>
        <div className="pp-hero-text">
          <em>{L(lang, "Total en regalos", "Total on gifts")}</em>
          <strong className="num">{fmt(data.total)}</strong>
          {data.spent > 0 && data.total > 0 ? <span>{L(lang, `${Math.round((data.total / data.spent) * 1000) / 10}% de lo que gastaste`, `${Math.round((data.total / data.spent) * 1000) / 10}% of what you spent`)}</span> : null}
        </div>
      </div>
      {data.rows.length ? (
        <ul className="pp-bars">
          {data.rows.map(({ person, minor }) => (
            <li key={person.id} style={{ ["--pp" as string]: personHue(person), ["--w" as string]: String(top > 0 ? Math.max(0.04, minor / top) : 0) }}>
              <span className="pp-bar-name">{personName(person, lang)}</span>
              <b className="num">{fmt(minor)}</b>
              <i aria-hidden />
            </li>
          ))}
        </ul>
      ) : <p className="pp-note">{L(lang, `Sin regalos anotados en ${ui.year}.`, `No gifts noted in ${ui.year}.`)}</p>}
    </section>
  );
}

/* ---------------------------------------------------------------- Asesor */

export function PeopleAdviceCard() {
  const { session, lang } = useFaro();
  if (!session) return null;
  const state = session.ledger;
  const { display, rateE4 } = state.settings;
  const a = peopleAdvice(state, display, rateE4, todayIso(), lang);
  if (!a) return null;
  const money = (m: number) => formatMoney(m, display, lang);
  let lead: string;
  let body: string;
  if (a.kind === "soon") {
    lead = a.birthday
      ? L(lang, `${a.name} cumple ${when(a.days, lang)}.`, `${a.name}'s birthday is ${when(a.days, lang)}.`)
      : L(lang, `${a.name}: ${a.occasion} ${when(a.days, lang)}.`, `${a.name}: ${a.occasion} ${when(a.days, lang)}.`);
    const ev = a.birthday ? L(lang, "este cumpleaños", "this birthday") : L(lang, "esta fecha", "this date");
    const was = a.birthday ? L(lang, "El cumpleaños pasado", "Last birthday") : L(lang, "La vez pasada", "Last time");
    body = a.ready > 0
      ? L(lang, `Ya anotaste ${money(a.ready)} para ${ev}${a.last > 0 ? ` (el pasado: ${money(a.last)})` : ""}. Si das más, que salga de lo variable, no del ahorro.`, `You've already noted ${money(a.ready)} for ${ev}${a.last > 0 ? ` (last one: ${money(a.last)})` : ""}. If you give more, take it from variable spending, not savings.`)
      : a.last > 0
      ? L(lang, `${was} le diste ${money(a.last)}. Aparta ${money(a.weekly)} por semana y llegas sin apretar el mes.`, `${was} you gave ${money(a.last)}. Set aside ${money(a.weekly)} a week and you get there without squeezing the month.`)
      : L(lang, "Decide hoy cuánto darás y apártalo por semana: un regalo planeado no rompe el mes.", "Decide today how much you'll give and set it aside weekly: a planned gift doesn't break the month.");
  } else {
    const pct = a.share !== null ? Math.round(a.share * 1000) / 10 : null;
    lead = L(lang, `En ${a.year} regalaste ${money(a.given)}.`, `In ${a.year} you gave ${money(a.given)}.`);
    body = pct !== null
      ? L(lang, `Es el ${pct}% de tu gasto del año. Ponle un tope por persona antes de cada fecha.`, `That's ${pct}% of your spending this year. Set a cap per person before each date.`)
      : L(lang, "Ponle un tope por persona antes de cada fecha.", "Set a cap per person before each date.");
  }
  return (
    <section className="card pp-advice" data-anchor="advice-people">
      <span className="pp-pic" aria-hidden>{a.kind === "soon" ? <Cake /> : <Gift />}</span>
      <div className="pp-advice-text">
        <h3 className="lab-head">{L(lang, "Personas", "People")}<Hint topic="asesor-personas" /></h3>
        <strong>{lead}</strong>
        <p>{body}</p>
      </div>
    </section>
  );
}

