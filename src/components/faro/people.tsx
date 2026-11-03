import "./people.css";
import { useMemo, useState } from "react";
import { Cake, Gift, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { formatMoney, parseAmount, uid } from "@/lib/faro/money";
import { upsertLine } from "@/lib/faro/reducer";
import { dayLabel, nextBirthday, peopleAdvice, peopleOf, personLines, personTotals, spendByPerson, todayIso, upcoming } from "@/lib/faro/people";
import type { Currency, Lang, LedgerState, Line, LineKind, Person, PersonDate } from "@/lib/faro/types";
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
export function plainLine(over: { kind: LineKind; categoryId: string; concept: string; amountMinor: number; currency: Currency; monthKey: string; bookedOn?: string; personId?: string; note?: string }): Line {
  return {
    id: uid(), seriesId: uid(), monthKey: over.monthKey, kind: over.kind, concept: over.concept, amountMinor: over.amountMinor, currency: over.currency,
    active: true, note: over.note ?? "", categoryId: over.categoryId, subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "",
    cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: over.currency, icon: "", history: [], bookedOn: over.bookedOn ?? "", startedOn: "",
    ...(over.personId ? { personId: over.personId } : {}),
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

/* ---------------------------------------------------------------- Central box */

export function PeopleBox() {
  const { session, lang, fmt, commit, confirm } = useFaro();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // person id, or "new"
  const [gift, setGift] = useState<string | null>(null);
  if (!session) return null;
  const state = session.ledger;
  const { display, rateE4 } = state.settings;
  const people = peopleOf(state);
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const yearly = spendByPerson(state, year, display, rateE4);
  const soon = upcoming(people, 366, today)[0];
  const savePeople = (next: Person[], detail: string) => commit((s) => ({ ...s, people: next }), detail);
  const remove = (p: Person) => confirm({
    title: L(lang, `¿Borrar a ${p.name}?`, `Delete ${p.name}?`),
    body: L(lang, "Sus regalos quedan en tus libros, sin la etiqueta de persona.", "Their gifts stay in your books, without the person tag."),
    danger: true,
    yes: L(lang, "Borrar", "Delete"),
    run: () => commit((s) => ({
      ...s,
      people: peopleOf(s).filter((x) => x.id !== p.id),
      months: Object.fromEntries(Object.entries(s.months).map(([k, b]) => [k, { lines: b.lines.map((l) => (l.personId === p.id ? { ...l, personId: undefined } : l)) }])),
    }), `Borrar persona ${p.name}`),
  });

  return (
    <section className="card pp-box" data-anchor="desk-people">
      <header className="pp-head">
        <h2 className="serif text-xl lab-head">{L(lang, "Personas", "People")}<Hint topic="personas" /></h2>
        {people.length ? (
          <button type="button" className="pp-add" aria-label={L(lang, "Agregar persona", "Add person")} aria-pressed={editing === "new"} onClick={() => { setEditing(editing === "new" ? null : "new"); setOpen(null); }}>
            <UserPlus className="size-4" />
          </button>
        ) : null}
      </header>
      {people.length === 0 && editing !== "new" ? (
        <div className="pp-empty">
          <span className="pp-pic" aria-hidden><Gift /></span>
          <p>{L(lang, "Anota a quién le regalas y ve cuánto le das en cada cumpleaños.", "Add who you give gifts to and see what you give each birthday.")}</p>
          <button type="button" className="btn" onClick={() => setEditing("new")}><UserPlus className="size-4" />{L(lang, "Agregar persona", "Add a person")}</button>
        </div>
      ) : null}
      {people.length ? (
        <div className="pp-hero">
          <span className="pp-pic" aria-hidden><Gift /></span>
          <div className="pp-hero-text">
            <em>{L(lang, `Regalado en ${year}`, `Given in ${year}`)}</em>
            <strong className="num">{fmt(yearly.total)}</strong>
            {soon ? <span><Cake className="pp-cake" aria-hidden />{L(lang, `${soon.person.name} cumple\u00a0${when(soon.next.days, lang)}`, `${soon.person.name}'s birthday ${when(soon.next.days, lang)}`)}</span> : null}
          </div>
        </div>
      ) : null}
      {editing === "new" ? <PersonForm lang={lang} onCancel={() => setEditing(null)} onSave={(p) => { savePeople([...people, p], `Agregar persona ${p.name}`); setEditing(null); setOpen(p.id); }} /> : null}
      {people.length ? (
        <div className="pp-list">
          {[...people].sort((a, b) => (nextBirthday(a.birthday, today)?.days ?? 999) - (nextBirthday(b.birthday, today)?.days ?? 999) || a.name.localeCompare(b.name)).map((p) => {
            const totals = personTotals(state, p, display, rateE4);
            // The row sits under "Regalado en <year>", so it shows this year's amount; the rows add up to the headline.
            const thisYear = yearly.rows.find((r) => r.person.id === p.id)?.minor ?? 0;
            const next = nextBirthday(p.birthday, today);
            const isOpen = open === p.id;
            return (
              <div key={p.id} className={`pp-item${isOpen ? " is-open" : ""}`} style={{ ["--pp" as string]: personHue(p) }}>
                <button type="button" className="pp-row" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : p.id); setGift(null); setEditing(null); }}>
                  <span className="pp-face" aria-hidden>{initials(p.name)}</span>
                  <span className="pp-who">
                    <strong>{p.name}</strong>
                    <small>{next ? (
                      <span className="pp-meta">
                        <span>{dayLabel(next.date, lang)}{next.age ? L(lang, ` · cumple ${next.age}`, ` · turns ${next.age}`) : ""}</span>
                        <span>{when(next.days, lang)}</span>
                      </span>
                    ) : <span>{L(lang, "Sin cumpleaños", "No birthday")}</span>}</small>
                  </span>
                  <span className={`pp-sum num${thisYear ? "" : " is-zero"}`} data-year={year}>{fmt(thisYear)}</span>
                </button>
                {isOpen && editing === p.id ? (
                  <PersonForm lang={lang} person={p} onCancel={() => setEditing(null)} onSave={(np) => { savePeople(people.map((x) => (x.id === p.id ? np : x)), `Editar persona ${np.name}`); setEditing(null); }} />
                ) : isOpen && gift === p.id ? (
                  <GiftForm person={p} onDone={() => setGift(null)} />
                ) : isOpen ? (
                  <div className="pp-detail">
                    {totals.count ? (
                      <p className="pp-all"><em>{L(lang, "En total, todos los años", "All years, in total")}</em><b className="num">{fmt(totals.total)}</b></p>
                    ) : null}
                    {totals.years.length ? (
                      <div className="pp-years">
                        {totals.years.slice(0, 6).map((y) => (
                          <span key={y.year} className="pp-year">
                            <em>{totals.byBirthday ? L(lang, `Cumpleaños ${y.year}`, `Birthday ${y.year}`) : String(y.year)}</em>
                            <b className="num">{fmt(y.minor)}</b>
                          </span>
                        ))}
                      </div>
                    ) : <p className="pp-note">{L(lang, "Aún no hay regalos anotados.", "No gifts noted yet.")}</p>}
                    {(p.dates ?? []).length ? (
                      <ul className="pp-dates">
                        {p.dates.map((d) => <li key={d.id}><span>{d.label}</span><b>{dayLabel(d.date, lang)}</b></li>)}
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
        </div>
      ) : null}
    </section>
  );
}

function PersonForm({ lang, person, onCancel, onSave }: { lang: Lang; person?: Person; onCancel: () => void; onSave: (p: Person) => void }) {
  const [name, setName] = useState(person?.name ?? "");
  const [birthday, setBirthday] = useState(person?.birthday ?? "");
  const [note, setNote] = useState(person?.note ?? "");
  const [dates, setDates] = useState<PersonDate[]>(person?.dates ?? []);
  const save = () => {
    if (!name.trim()) return;
    onSave({ id: person?.id ?? uid(), name: name.trim(), birthday, note: note.trim(), dates: dates.filter((d) => d.date).map((d) => ({ ...d, label: d.label.trim() || L(lang, "Fecha", "Date") })), ...(person?.color ? { color: person.color } : {}) });
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
          <div key={d.id} className="pp-date-row is-wide">
            <input className="field" value={d.label} placeholder={L(lang, "Aniversario", "Anniversary")} aria-label={L(lang, "Nombre de la fecha", "Date name")} onChange={(e) => setDates(dates.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <DayField value={d.date} onChange={(v) => setDates(dates.map((x, j) => (j === i ? { ...x, date: v } : x)))} />
            <button type="button" className="pp-x" aria-label={L(lang, "Quitar fecha", "Remove date")} onClick={() => setDates(dates.filter((_, j) => j !== i))}><X className="size-4" /></button>
          </div>
        ))}
        <button type="button" className="pp-more is-wide" onClick={() => setDates([...dates, { id: uid(), label: "", date: "" }])}><Plus className="size-4" />{L(lang, "Otra fecha", "Other date")}</button>
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
  const minor = parseAmount(amount);
  const save = () => {
    if (minor === null || minor <= 0 || !target) return;
    const [kind, categoryId] = target.split("|") as [LineKind, string];
    const line = plainLine({ kind, categoryId, concept: concept.trim() || L(lang, "Regalo", "Gift"), amountMinor: minor, currency, monthKey: key, bookedOn: day, personId: person.id });
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
  const people = peopleOf(session?.ledger);
  if (!people.length) return null;
  return (
    <div className="label">
      <span className="lab-head">{L(lang, "Persona", "Person")}<FieldTip topic="f-persona" /></span>
      <ThemeSelect value={value} onChange={onChange} options={[{ value: "", label: L(lang, "Nadie", "No one") }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
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
              <span className="pp-bar-name">{person.name}</span>
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
  const a = peopleAdvice(state, display, rateE4);
  if (!a) return null;
  const money = (m: number) => formatMoney(m, display, lang);
  let lead: string;
  let body: string;
  if (a.kind === "soon") {
    lead = L(lang, `${a.name} cumple ${when(a.days, lang)}.`, `${a.name}'s birthday is ${when(a.days, lang)}.`);
    body = a.ready > 0
      ? L(lang, `Ya anotaste ${money(a.ready)} para este cumpleaños${a.last > 0 ? ` (el pasado: ${money(a.last)})` : ""}. Si das más, que salga de lo variable, no del ahorro.`, `You've already noted ${money(a.ready)} for this birthday${a.last > 0 ? ` (last one: ${money(a.last)})` : ""}. If you give more, take it from variable spending, not savings.`)
      : a.last > 0
      ? L(lang, `El cumpleaños pasado le diste ${money(a.last)}. Aparta ${money(a.weekly)} por semana y llegas sin apretar el mes.`, `Last birthday you gave ${money(a.last)}. Set aside ${money(a.weekly)} a week and you get there without squeezing the month.`)
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

