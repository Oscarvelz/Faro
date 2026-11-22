import { Trash2 } from "lucide-react";
import { useFaro } from "./provider";
import { passiveMonths, passiveRecordsOf, withoutPassiveRecord } from "@/lib/faro/exit";
import { dayLabel } from "./historial";

/**
 * Los registros pasivos en el Archivo (Pieza C8, 1.3.398): el folio
 * congelado de un libro compartido que la persona dejó. Se lee como
 * historia — meses y totales, sin una sola puerta de escritura — y
 * se borra cuando ella quiera, con la confirmación de la casa: el
 * texto dice la verdad entera, que el libro del dueño no se toca
 * porque el registro vive solo en este libro.
 */
export function PassiveFolios() {
  const { session, t, lang, fmt, commit, confirm } = useFaro();
  const state = session?.ledger ?? null;
  if (!state) return null;
  const records = passiveRecordsOf(state);
  if (!records.length) return null;

  const askDelete = (id: string) => {
    confirm({
      title: t("arch.passive.del.title"),
      body: t("arch.passive.del.body"),
      danger: true,
      yes: t("arch.passive.del.yes"),
      run: () => commit((s) => withoutPassiveRecord(s, id), lang === "en" ? "Shared-book record deleted" : "Registro de libro compartido borrado"),
    });
  };

  return (
    <section className="arch-group">
      <div className="arch-group-head"><h3>{t("arch.passive")}</h3><b>{records.length}</b></div>
      {records.map((r) => (
        <article key={r.id} className="arch-card" data-anchor="arch-passive-card">
          <div className="arch-card-top">
            <strong className="arch-name">{r.categories.map((c) => c.name).join(" · ") || t("arch.passive")}</strong>
            <span className="arch-origin">{t("arch.passive")}</span>
          </div>
          <p className="arch-meta">{t("arch.passive.meta").replace("{date}", r.at ? dayLabel(lang, r.at.slice(0, 10)) : "")}</p>
          <div className="arch-lines">
            {passiveMonths(r).map((m) => (
              <p key={m.monthKey} className="arch-meta">
                {t("arch.passive.month").replace("{month}", m.monthKey).replace("{n}", String(m.count)).replace("{total}", fmt(m.total))}
              </p>
            ))}
          </div>
          <div className="arch-acts">
            <button type="button" className="btn secondary" data-anchor="arch-passive-delete" onClick={() => askDelete(r.id)}>
              <Trash2 aria-hidden />{t("arch.delete")}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
