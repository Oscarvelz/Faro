// Remesas (1.3.86): the Cambio "Enviar a…" panel (a normal ledger line) and the Estudio Remesas card.
import "./remesas.css";
import { useMemo, useState } from "react";
import { useFaro } from "./provider";
import { Head } from "./panorama";
import { FieldTip } from "./ui";
import { ThemeSelect } from "./line-form";
import { plainLine } from "./people";
import { importToast } from "./bank-dock";
import { useLayer } from "@/lib/manual/back";
import { convertMinor, formatMoney, formatRate } from "@/lib/faro/money";
import { deleteLine, upsertLine } from "@/lib/faro/reducer";
import { remitTrend } from "@/lib/faro/remesas";
import { isRemitCat, remitPeopleOf } from "@/lib/faro/remit-people";
import { RemitPeople, RemitToField } from "./remit-people";
import type { Currency, Group } from "@/lib/faro/types";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const todayIso = () => { const d = new Date(); return `${todayKey()}-${String(d.getDate()).padStart(2, "0")}`; };

/** Cambio → "Enviar a": the converted amount (or the typed one) becomes one expense line in the chosen book and category, this month. */
export function SendPanel({ fromMinor, from, toMinor, to, onDone }: { fromMinor: number; from: Currency; toMinor: number; to: Currency; onDone: () => void }) {
  const { session, lang, names, commit } = useFaro();
  useLayer(true, onDone);
  const state = session!.ledger;
  const rate = state.settings.rateE4;
  const [group, setGroup] = useState<Group>(() => (localStorage.getItem("faro-send-group") === "fixed" ? "fixed" : "variable"));
  const [money, setMoney] = useState<Currency>(to);
  const cats = useMemo(() => state.structure.categories.filter((c) => !c.hidden && c.group === group).sort((a, b) => a.order - b.order), [state.structure, group]);
  const options = cats.map((c) => ({ value: c.id, label: names.cat(c.id) }));
  const pick = (g: Group) => {
    const list = state.structure.categories.filter((c) => !c.hidden && c.group === g);
    const saved = localStorage.getItem(`faro-send-cat-${g}`);
    return (list.find((c) => c.id === saved) ?? list.find((c) => c.role === "remittance") ?? list[0])?.id ?? "";
  };
  const [cat, setCat] = useState(() => pick(group));
  // 1.3.118: Remesas → Para: who the money goes to (optional). Starts on the last person used here, if they still exist.
  const [toWho, setToWho] = useState(() => { const last = localStorage.getItem("faro-send-to") ?? ""; return remitPeopleOf(state).some((p) => p.id === last) ? last : ""; });
  const remit = !!cat && isRemitCat(state, cat);
  const toName = remit && toWho ? remitPeopleOf(state).find((p) => p.id === toWho)?.name ?? "" : "";
  const amount = money === from ? fromMinor : toMinor;
  const other = money === from ? toMinor : fromMinor;
  const otherCur: Currency = money === "USD" ? "NIO" : "USD";
  const ok = amount > 0 && !!cat && cats.some((c) => c.id === cat);
  const save = () => {
    if (!ok) return;
    const monthKey = todayKey();
    localStorage.setItem("faro-send-group", group);
    localStorage.setItem(`faro-send-cat-${group}`, cat);
    if (remit) localStorage.setItem("faro-send-to", toName ? toWho : "");
    const usd = money === "USD" ? amount : convertMinor(amount, "NIO", "USD", rate);
    const nio = money === "NIO" ? amount : convertMinor(amount, "USD", "NIO", rate);
    const note = L(lang, `Desde Cambio: ${formatMoney(usd, "USD", lang)} = ${formatMoney(nio, "NIO", lang)} a C$${formatRate(rate)} por US$`, `From Exchange: ${formatMoney(usd, "USD", lang)} = ${formatMoney(nio, "NIO", lang)} at C$${formatRate(rate)} per US$`);
    const line = plainLine({ kind: group === "fixed" ? "expense-fixed" : "expense-variable", categoryId: cat, concept: names.cat(cat), amountMinor: amount, currency: money, monthKey, bookedOn: todayIso(), note });
    const sent = toName ? { ...line, to: toWho } : line;
    commit((s) => upsertLine(s, sent), L(lang, `Enviar a ${names.cat(cat)}`, `Send to ${names.cat(cat)}`));
    const book = group === "fixed" ? L(lang, "Fijos", "Fixed") : L(lang, "Variables", "Variable");
    importToast({ text: toName ? L(lang, `Guardado en ${names.cat(cat)} · ${toName}`, `Saved to ${names.cat(cat)} · ${toName}`) : L(lang, `Guardado en ${names.cat(cat)} · ${book}`, `Saved to ${names.cat(cat)} · ${book}`), undo: () => commit((s) => deleteLine(s, monthKey, line.id), L(lang, "Deshacer envío", "Undo send")) });
    onDone();
  };
  return (
    <div className="ah-form sc-form slip-apply cv-send" data-test="cv-send">
      <div className="cv-send-sum">
        <span className="lab-head cv-send-kick">{L(lang, "Enviar a", "Send to")}<FieldTip topic="cambio-enviar" /></span>
        <strong className="num cv-send-amt" data-test="cv-send-amt">{formatMoney(amount, money, lang)}</strong>
        <small className="num">= {formatMoney(other, otherCur, lang)} · 1 US$ = C${formatRate(rate)}</small>
      </div>
      <div className="ah-grid">
        <div className="label is-wide">
          <span className="lab-head">{L(lang, "Libro", "Book")}</span>
          <div className="ah-sign" role="radiogroup" aria-label={L(lang, "Libro", "Book")}>
            {(["fixed", "variable"] as const).map((g) => (
              <button key={g} type="button" role="radio" data-test={`cv-send-${g}`} aria-checked={group === g} aria-pressed={group === g} onClick={() => { setGroup(g); setCat(pick(g)); }}>{g === "fixed" ? L(lang, "Fijo", "Fixed") : "Variable"}</button>
            ))}
          </div>
        </div>
        <div className="label is-wide">
          <span className="lab-head">{L(lang, "Categoría", "Category")}</span>
          <ThemeSelect value={cat} onChange={setCat} options={options} />
        </div>
        {remit ? <RemitToField value={toWho} onChange={setToWho} /> : null}
        <div className="label is-wide">
          <span className="lab-head">{L(lang, "Moneda", "Currency")}</span>
          <div className="ah-sign" role="radiogroup" aria-label={L(lang, "Moneda", "Currency")}>
            <button type="button" role="radio" aria-checked={money === "USD"} aria-pressed={money === "USD"} onClick={() => setMoney("USD")}>{L(lang, "Dólares", "Dollars")}</button>
            <button type="button" role="radio" aria-checked={money === "NIO"} aria-pressed={money === "NIO"} onClick={() => setMoney("NIO")}>Córdobas</button>
          </div>
        </div>
      </div>
      <div className="ah-actions">
        <button type="button" className="btn secondary" onClick={onDone}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" data-test="cv-send-save" disabled={!ok} onClick={save}>{L(lang, "Guardar", "Save")}</button>
      </div>
    </div>
  );
}

/** Estudio → Remesas: this month vs last, six months of bars (this one lit), the average as a dashed line. */
export function RemitCard({ monthKey }: { monthKey: string }) {
  const { session, lang } = useFaro();
  const tr = useMemo(() => (session ? remitTrend(session.ledger, monthKey, 6) : null), [session, monthKey]);
  if (!tr || !tr.any) return null;
  const usd = (m: number) => formatMoney(m, "USD", lang);
  const nio = (m: number) => formatMoney(m, "NIO", lang);
  const max = Math.max(...tr.months.map((m) => m.usd), 1);
  const avgPct = (tr.avgUsd / max) * 100;
  const mon = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y!, m! - 1, 1).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { month: "short" }).replace(".", "");
  };
  const d = tr.deltaPct;
  const tone = d === null ? "" : d > 0 ? " is-up" : d < 0 ? " is-down" : "";
  return (
    <section className="card rm-card" data-test="remit-card">
      <Head kicker={L(lang, "Lo que mandas a casa", "What you send home")} title={L(lang, "Remesas", "Remittances")} topic="remesas-estudio" />
      <div className="rm-pair">
        <div>
          <em>{L(lang, "Este mes", "This month")}</em>
          <strong className="num rm-now" data-test="remit-now">{usd(tr.now.usd)}</strong>
          <small className="num">{nio(tr.now.nio)}</small>
        </div>
        <div>
          <em>{L(lang, "Mes pasado", "Last month")}</em>
          <strong className="num rm-prev" data-test="remit-prev">{usd(tr.prev.usd)}</strong>
          <small className="num">{nio(tr.prev.nio)}</small>
        </div>
      </div>
      <p className={`rm-delta num${tone}`} data-test="remit-delta">
        {d === null
          ? L(lang, "Sin envíos el mes pasado para comparar", "No remittance last month to compare")
          : L(lang, `${d > 0 ? "+" : ""}${d}% vs mes pasado`, `${d > 0 ? "+" : ""}${d}% vs last month`)}
        {tr.sharePct !== null ? <span>{L(lang, ` · ${tr.sharePct.toLocaleString("es-NI")}% del ingreso`, ` · ${tr.sharePct.toLocaleString("en-US")}% of income`)}</span> : null}
      </p>
      <div className="rm-chart" aria-hidden>
        <div className="rm-bars">
          {tr.months.map((m, i) => (
            <span key={m.key} className={i === tr.months.length - 1 ? "is-on" : undefined}>
              <i style={{ height: `${m.usd > 0 ? Math.max(4, (m.usd / max) * 100) : 0}%` }} />
              <b>{mon(m.key)}</b>
            </span>
          ))}
        </div>
        {tr.avgUsd > 0 ? <i className="rm-avg" style={{ bottom: `calc(20px + (100% - 20px) * ${(avgPct / 100).toFixed(3)})` }} /> : null}
      </div>
      <p className="pano-lead rm-foot">
        {L(lang, "Promedio mensual: ", "Monthly average: ")}<strong className="num rm-avg-amt">{usd(tr.avgUsd)}</strong>
      </p>
      {session && remitPeopleOf(session.ledger).length ? <RemitPeople monthKey={monthKey} where="study" /> : null}
    </section>
  );
}
