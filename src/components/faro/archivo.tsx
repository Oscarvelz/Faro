/**
 * El Archivo universal (Oscar, 2026-11-12): el cuarto ciudadano del dock, entre
 * Libros y Estudio — se gana el asiento porque CONSOLIDA: los períodos apartados del
 * Historial y los archivos de Me deben, Préstamos, Tarjetas y Debo bajo un solo techo,
 * cada cosa con su procedencia puesta y sus fechas.
 *
 * Es una vista de UNIÓN, nunca una pila mezclada ni una copia: cada Restaurar llama al
 * MISMO mutador que su área usa (restoreLent, restoreLoan, restoreCard, el archivo de
 * Debo con su mecánica propia, descanso.restoreSpan vía el proveedor) — el mismo ítem
 * por dos puertas. Los archivos por área se quedan en sus áreas, intactos.
 *
 * Y es el único lugar donde un período apartado puede morir: Eliminar lleva la puerta
 * de GitHub de la casa — la ventana que nombra y cuenta, «Descargar mi libro primero»
 * de salida amable, y el botón que solo se arma cuando el dueño ESCRIBE el correo de
 * su sesión, exacto y case sensitive (provider.confirm con typeText, el mismo ritual
 * que Eliminar cuenta). Lo que descansa aquí no cuenta en ninguna lectura: la puerta
 * anti-fuga (descanso.ts) lo garantiza en la fuente, no en esta pantalla.
 */
import { useMemo, useState, type CSSProperties } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { useFaro } from "./provider";
import { useLongPress } from "./use-longpress";
import { SelectionBar, SelMark, useSelection } from "./selection";
import { useFaroUser } from "@/spa/gates";
import { Note } from "./finish";
import { PiecePlate } from "./fit-pick";
import { bookLabel, dayLabel, shortDay } from "./historial";
import { movementDate, restingEntries, type RestingEntry } from "@/lib/faro/descanso";
import { lentOf, restoreLent } from "@/lib/faro/debts";
import { loansOf, restoreLoan } from "@/lib/faro/loans";
import { restoreCard, storedCards } from "@/lib/faro/cards";
import { applyDueFile, readDueFileRows } from "@/lib/faro/duefile";
import { browserPackStorage } from "@/lib/faro/packguard";
import { upsertLine } from "@/lib/faro/reducer";
import { namedIconFor, subIconFor } from "@/lib/faro/faces";
import { categoryColor, subColorFor } from "@/lib/faro/colors";
import { convertMinor, formatMoney } from "@/lib/faro/money";
import type { DueFile, Line } from "@/lib/faro/types";
import "./historial.css";
import "./hist-temas.css";

export function ArchivoScreen() {
  const api = useFaro();
  const { session, t, lang, fmt, names, commit, confirm, restoreRestingSpan, deleteRestingSpan, deleteRestingLineSelection, exportJson, recordLine } = api;
  const user = useFaroUser();
  const state = session?.ledger ?? null;
  const [dueRows, setDueRows] = useState<DueFile[]>(() => readDueFileRows(browserPackStorage()));

  const spans = useMemo(() => (state ? restingEntries(state) : []), [state]);
  const lent = useMemo(() => (state ? lentOf(state).filter((l) => l.archived) : []), [state]);
  const loans = useMemo(() => (state ? loansOf(state).filter((l) => l.archived) : []), [state]);
  const cards = useMemo(() => (state ? storedCards(state).filter((c) => c.archived) : []), [state]);
  const total = spans.length + lent.length + loans.length + cards.length + dueRows.length;

  if (!state) return null;
  const display = state.settings.display;
  const rate = state.settings.rateE4;
  const view = (minor: number, currency: Line["currency"]) => convertMinor(minor, currency, display, rate);
  const stamp = (iso: string) => (iso ? dayLabel(lang, iso.slice(0, 10)) : "");

  const spanPeriod = (e: RestingEntry) => e.span.label || `${shortDay(lang, e.span.from)} – ${shortDay(lang, e.span.to)}`;
  const countWords = (n: number) => (n === 1 ? t("hist.count1") : t("hist.count").replace("{n}", String(n)));

  const askDeleteSpan = (e: RestingEntry) => {
    confirm({
      title: t("arch.del.title"),
      body: t("arch.del.body")
        .replace("{count}", countWords(e.count))
        .replace("{period}", spanPeriod(e))
        .replace("{inn}", fmt(e.inMinor))
        .replace("{out}", fmt(e.outMinor))
        .replace("{months}", e.months.map((mk) => bookLabel(lang, mk)).join(", ")),
      danger: true,
      // La puerta de GitHub (Oscar, 2026-11-10; extendida a los períodos 2026-11-12):
      // el correo de la sesión, escrito a mano, exacto — como en Eliminar cuenta.
      typeText: user?.email || undefined,
      extraLabel: t("arch.del.getBook"),
      extraRun: () => exportJson(),
      yes: t("arch.del.yes"),
      run: () => deleteRestingSpan(e.span.id),
    });
  };

  // Restaurar un período gana su ventana (Oscar, 2026-11-13: que nadie restaure
  // por error): la casa confirma nombrando lo que vuelve a contar. Solo el
  // período — las demás casas del Archivo conservan su toque único.
  const askRestoreSpan = (e: RestingEntry) => {
    confirm({
      title: t("arch.restore.title"),
      body: t("arch.restore.body")
        .replace("{count}", countWords(e.count))
        .replace("{period}", spanPeriod(e))
        .replace("{inn}", fmt(e.inMinor))
        .replace("{out}", fmt(e.outMinor)),
      yes: t("arch.restore"),
      run: () => restoreRestingSpan(e.span.id),
    });
  };

  // El motor de selección sobre las líneas apartadas (Oscar, 2026-11-13):
  // sostener entra al modo, tocar marca, y UNA sola puerta escrita cubre la
  // selección entera — la misma guarda del borrado de período, jamás más débil.
  // El toque sin modo ofrece borrar ESA línea sola, tras la misma puerta (S4).
  const selection = useSelection();
  const lp = useLongPress((id) => (selection.mode ? selection.toggle(id) : selection.enter(id)));
  const restingById = useMemo(() => {
    const map = new Map<string, Line>();
    for (const e of spans) for (const l of e.lines) map.set(l.id, l);
    return map;
  }, [spans]);
  const askDeleteLines = (lines: Line[]) => {
    if (!lines.length) return;
    const one = lines.length === 1 ? lines[0] : null;
    let inMinor = 0;
    let outMinor = 0;
    for (const l of lines) {
      const v = view(l.amountMinor, l.currency);
      if (l.kind.startsWith("income")) inMinor += v;
      else if (!l.xfer) outMinor += v;
    }
    confirm({
      title: one
        ? t("arch.delOne.title")
        : t(lines.length === 1 ? "arch.delSel.title.one" : "arch.delSel.title").replace("{n}", String(lines.length)),
      body: one
        ? t("arch.delOne.body")
            .replace("{concept}", one.concept)
            .replace("{amount}", recordLine(one))
            .replace("{day}", dayLabel(lang, movementDate(one)))
        : t("arch.delSel.body")
            .replace("{n}", String(lines.length))
            .replace("{inn}", fmt(inMinor))
            .replace("{out}", fmt(outMinor)),
      danger: true,
      typeText: user?.email || undefined,
      extraLabel: t("arch.del.getBook"),
      extraRun: () => exportJson(),
      yes: t("arch.del.yes"),
      run: () => { deleteRestingLineSelection(lines.map((l) => l.id)); selection.exit(); },
    });
  };
  const lineTap = (line: Line) => {
    if (selection.mode) { selection.toggle(line.id); return; }
    askDeleteLines([line]);
  };

  /** El Archivo de Debo vive fuera del libro (duefile.ts): restaurar es su mecánica
   *  propia al revés — la fila sale del archivo y la serie se reactiva en su mes más
   *  reciente, como DueOwe.archive la apagó (screens.tsx). */
  const restoreDue = (row: DueFile) => {
    const next = dueRows.filter((r) => r.id !== row.id);
    setDueRows(next);
    applyDueFile(browserPackStorage(), next);
    commit((s) => {
      for (const mk of Object.keys(s.months).sort().reverse()) {
        const line = s.months[mk]?.lines.find((l) => (l.seriesId || l.id) === row.seriesId && !l.active);
        if (line) return upsertLine(s, { ...line, active: true });
      }
      return s;
    }, row.name);
  };

  const groupHead = (label: string, n: number) => (
    <div className="arch-group-head"><h3>{label}</h3><b>{n}</b></div>
  );
  const restoreBtn = (run: () => void) => (
    <button type="button" className="btn secondary" onClick={run}><RotateCcw aria-hidden />{t("arch.restore")}</button>
  );

  return (
    <>
      {/* El chip par de Folios ya no vive en esta pantalla (1.3.249): lo
          sienta shell.tsx en el padre persistente, como el par de Estudio. */}
      <div className="arch">
      <p className="arch-sub">{t("arch.sub")}</p>
      {!total ? <Note>{t("arch.empty")}</Note> : null}

      {spans.length ? (
        <section className="arch-group">
          {groupHead(t("arch.spans"), spans.length)}
          {spans.map((e) => (
            <article key={e.span.id} className="arch-card">
              <div className="arch-card-top">
                <strong className="arch-name">{spanPeriod(e)}</strong>
                <span className="arch-origin">{t("arch.spans")}</span>
              </div>
              <p className="arch-meta">
                {t("arch.span.moves").replace("{count}", countWords(e.count)).replace("{inn}", fmt(e.inMinor)).replace("{out}", fmt(e.outMinor))}
                {" · "}{t("arch.span.months").replace("{months}", e.months.map((mk) => bookLabel(lang, mk)).join(", "))}
                {" · "}{t("arch.span.hiddenOn").replace("{date}", stamp(new Date(e.span.hiddenAt).toISOString()))}
              </p>
              <div className="arch-lines">
                {[...e.lines].sort((a, b) => movementDate(b).localeCompare(movementDate(a))).map((line) => {
                  const cat = state.structure.categories.find((c) => c.id === line.categoryId);
                  const tone = line.subId && cat
                    ? subColorFor(state.structure, line.categoryId, line.subId)
                    : cat
                      ? categoryColor(cat.id, cat.color)
                      : "var(--faint)";
                  const marked = selection.sel.has(line.id);
                  return (
                    <div
                      key={line.id}
                      className={`hist-row${marked ? " is-selected" : ""}`}
                      data-line-id={line.id}
                      {...lp.bind(line.id)}
                      onClick={() => { if (!lp.consumeClick()) lineTap(line); }}
                      style={{ "--selc": tone } as CSSProperties}
                    >
                      {selection.mode ? <SelMark on={marked} /> : null}
                      {line.subId && cat
                        ? <PiecePlate small color={subColorFor(state.structure, line.categoryId, line.subId)} icon={subIconFor(state.structure, line.categoryId, line.subId)} />
                        : cat
                          ? <PiecePlate small color={categoryColor(cat.id, cat.color)} icon={namedIconFor(cat)} />
                          : <PiecePlate small color="var(--faint)" icon="Package" />}
                      <div className="hist-row-main">
                        <strong className="hist-row-concept">{line.concept}</strong>
                        <span className="hist-row-meta">{dayLabel(lang, movementDate(line))}{names.cat(line.categoryId) ? ` · ${names.cat(line.categoryId)}` : ""}</span>
                      </div>
                      <strong className="hist-row-amt num">{recordLine(line)}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="arch-acts">
                {restoreBtn(() => askRestoreSpan(e))}
                <button type="button" className="btn danger" onClick={() => askDeleteSpan(e)}><Trash2 aria-hidden />{t("arch.delete")}</button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {lent.length ? (
        <section className="arch-group">
          {groupHead(t("arch.lent"), lent.length)}
          {lent.map((row) => (
            <article key={row.id} className="arch-card">
              <div className="arch-card-top">
                <strong className="arch-name">{row.person}</strong>
                <span className="arch-origin">{t("arch.lent")}</span>
              </div>
              <p className="arch-meta">
                {t("arch.lent.meta").replace("{unpaid}", fmt(view(row.unpaidMinor ?? 0, row.currency))).replace("{lent}", fmt(view(row.amountMinor, row.currency)))}
                {row.archivedOn ? ` · ${stamp(row.archivedOn)}` : ""}
              </p>
              <div className="arch-acts">{restoreBtn(() => commit((s) => restoreLent(s, row.id), row.person))}</div>
            </article>
          ))}
        </section>
      ) : null}

      {loans.length ? (
        <section className="arch-group">
          {groupHead(t("arch.loans"), loans.length)}
          {loans.map((loan) => (
            <article key={loan.id} className="arch-card">
              <div className="arch-card-top">
                <strong className="arch-name">{loan.lender}</strong>
                <span className="arch-origin">{t("arch.loans")}</span>
              </div>
              <p className="arch-meta">
                {t("arch.loan.meta").replace("{unpaid}", fmt(view(loan.unpaidMinor ?? 0, loan.currency))).replace("{got}", fmt(view(loan.amountMinor, loan.currency)))}
                {loan.archivedOn ? ` · ${stamp(loan.archivedOn)}` : ""}
              </p>
              <div className="arch-acts">{restoreBtn(() => commit((s) => restoreLoan(s, loan.id), loan.lender))}</div>
            </article>
          ))}
        </section>
      ) : null}

      {cards.length ? (
        <section className="arch-group">
          {groupHead(t("arch.cards"), cards.length)}
          {cards.map((card) => (
            <article key={card.id} className="arch-card">
              <div className="arch-card-top">
                <strong className="arch-name">{card.name}</strong>
                <span className="arch-origin">{t("arch.cards")}</span>
              </div>
              <p className="arch-meta">{t("arch.card.meta")}{card.archivedOn ? ` · ${stamp(card.archivedOn)}` : ""}</p>
              <div className="arch-acts">{restoreBtn(() => commit((s) => restoreCard(s, card.id), card.name))}</div>
            </article>
          ))}
        </section>
      ) : null}

      {dueRows.length ? (
        <section className="arch-group">
          {groupHead(t("arch.dues"), dueRows.length)}
          {dueRows.map((row) => (
            <article key={row.id} className="arch-card">
              <div className="arch-card-top">
                <strong className="arch-name">{row.name}</strong>
                <span className="arch-origin">{t("arch.dues")}</span>
              </div>
              <p className="arch-meta">
                {t("arch.due.meta").replace("{max}", formatMoney(row.maxMinor, row.currency, lang)).replace("{n}", String(row.pays.length))}
                {row.archivedOn ? ` · ${stamp(row.archivedOn)}` : ""}
              </p>
              <div className="arch-acts">{restoreBtn(() => restoreDue(row))}</div>
            </article>
          ))}
        </section>
      ) : null}
      {selection.mode ? (
        <SelectionBar count={selection.count} onExit={selection.exit}>
          <button
            type="button"
            className="btn danger"
            disabled={!selection.count}
            onClick={() => askDeleteLines([...selection.sel].map((id) => restingById.get(id)).filter((l): l is Line => !!l))}
            data-testid="sel-delete"
          >
            <Trash2 className="size-4" aria-hidden />{t("sel.delete")}
          </button>
        </SelectionBar>
      ) : null}
      </div>
    </>
  );
}
