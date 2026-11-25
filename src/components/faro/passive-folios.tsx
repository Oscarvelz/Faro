import { Trash2 } from "lucide-react";
import { useFaro } from "./provider";
import { passiveMonths, passiveRecordsOf, withoutPassiveRecord } from "@/lib/faro/exit";
import { ISO_DAY, todayIso } from "@/lib/faro/loans";
import { dayLabel } from "./historial";

/** OLA 33 (Familia 8, Q33-1-Cara): EL FOLIO FECHA EN EL DÍA DE LA
 * CASA — la tarjeta pintaba el corte UTC del instante de salida
 * (r.at.slice(0, 10)): quien salió entre las 19:00 y las 24:00 de
 * su día veía su registro fechado MAÑANA, mientras el resto de la
 * casa fecha cada instante en el día local de quien mira. La fecha
 * del folio es el día local del instante, por el mismo todayIso de
 * la casa; el corte crudo queda solo como respaldo de un instante
 * ilegible. */
const folioDay = (at: string): string => {
  // OLA 34 (Familia 9, G34-1): LA FORMA DE SOLO DÍA SE DEVUELVE
  // TAL CUAL — el juez único de la casa admite también el «at» que
  // nombra un día sin hora («2026-11-22»), y esa forma no denota un
  // instante: denota el día que escribe. Pasar TODO por new Date
  // la leía como la medianoche UTC y al oeste de UTC la tarjeta
  // pintaba el día ANTERIOR — el espejo exacto del Q33-1 que esta
  // función nació para cerrar. Solo los instantes pasan por
  // todayIso; el día escrito se pinta como se escribió, en toda
  // zona, como dayLabel trata toda cadena-día de la casa.
  if (ISO_DAY.test(at)) return at;
  // OLA 35 (G35-1): LA FORMA DE DÍA CON SUFIJO DE ZONA («2026-11-22Z»)
  // TAMBIÉN SE DEVUELVE TAL CUAL — el juez la admite (prefijo real e
  // ida y vuelta sanas) y el lector la entrega, pero ISO_DAY no casa
  // con la Z final y la cadena caía a la rama de instantes: la
  // medianoche UTC pintaba el día ANTERIOR en todo meridiano al oeste
  // de UTC, la firma de G34-1 un anillo más afuera. La cadena no trae
  // hora: trae un día y un sufijo — el día que nombra se pinta.
  if (/^\d{4}-\d{2}-\d{2}[zZ]$/.test(at)) return at.slice(0, 10);
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at.slice(0, 10) : todayIso(d);
};

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
          <p className="arch-meta">{t("arch.passive.meta").replace("{date}", r.at ? dayLabel(lang, folioDay(r.at)) : "")}</p>
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
