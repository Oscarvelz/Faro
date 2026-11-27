import { Eye, X } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { driftCandidates, type AskAlert } from "@/lib/faro/ask2";
import { vigilancia, type VigilCandidate } from "@/lib/faro/relato";
import { todayIso } from "@/lib/faro/loans";
import { formatMoney } from "@/lib/faro/money";
import "./drift-card.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

const KIND_WORD: Record<AskAlert["kind"], [string, string]> = {
  deriva: ["Deriva", "Drift"],
  salto: ["Salto", "Jump"],
  ausencia: ["Ausencia", "Absence"],
  duplicado: ["Duplicado", "Duplicate"],
  primero: ["Primero", "First time"],
  descubierto: ["Descubierto", "Uncovered"],
};

/** La llave de supresión de una candidata de vigilancia(): su clase,
 * su concepto y su mes — el episodio del mes próximo vuelve solo. */
export function vigilKey(c: VigilCandidate): string {
  return `${c.kind}|${c.concept}|${c.date.slice(0, 7)}`;
}

/**
 * Ola 33 (1.3.496) — LA VIGILANCIA SE PRESENTA SOLA. Las candidatas
 * de la deriva (Ola 33) y de la vigilancia de programas (Ola 446)
 * vivían como DATOS: solo se decían cuando alguien preguntaba al
 * Asesor («¿algo cambió?»). Esta tarjeta de Central las presenta sin
 * pregunta, con el presupuesto de la casa: la deriva trae hasta tres,
 * ordenadas por peso; de la vigilancia se muestran hasta tres de las
 * clases que no tenían superficie — lo que NO llegó y lo que se
 * repite sin estar programado. Lo que llega (vence en ≤7 días) NO se
 * repite aquí: ya vive en «Pagos que se acercan», y la casa no dice
 * dos veces lo mismo.
 *
 * Cada aviso lleva su ✕: quitarlo guarda su episodio en los ajustes
 * del libro (driftMuted / vigilMuted, como dueAlertsDismissed) y el
 * episodio del mes próximo vuelve solo — el id de la deriva lleva el
 * mes y la llave de vigilancia se corta al mes. Preguntar al Asesor
 * no se suprime nunca: la supresión manda sobre la tarjeta, no sobre
 * la respuesta.
 */
export function DriftCard() {
  const { session, lang, names, has, commit } = useFaro();
  if (!session || !has("central.drift")) return null;
  const ledger = session.ledger;
  const today = todayIso();
  const key = today.slice(0, 7);
  const driftMuted = new Set(ledger.settings.driftMuted ?? []);
  const vigilMuted = new Set(ledger.settings.vigilMuted ?? []);
  const drift = driftCandidates(ledger, key, lang, names, today, driftMuted);
  const vigilAll = vigilancia(ledger, key, lang, today).filter((c) => c.kind !== "llega" && !vigilMuted.has(vigilKey(c)));
  const vigil = vigilAll.slice(0, 3);
  const vigilMore = vigilAll.length - vigil.length;
  if (!drift.length && !vigil.length) return null;

  const muteDrift = (id: string) => commit(
    (s) => ({ ...s, settings: { ...s.settings, driftMuted: [...(s.settings.driftMuted ?? []).filter((x) => x !== id), id] } }),
    L(lang, "Aviso quitado por este mes", "Flag removed for this month"));
  const muteVigil = (c: VigilCandidate) => {
    const k = vigilKey(c);
    commit(
      (s) => ({ ...s, settings: { ...s.settings, vigilMuted: [...(s.settings.vigilMuted ?? []).filter((x) => x !== k), k] } }),
      L(lang, "Aviso quitado por este mes", "Flag removed for this month"));
  };

  return (
    <section className="card drift-card" data-anchor="drift-card">
      <div className="drift-head">
        <Eye aria-hidden />
        <h2 className="serif">{L(lang, "La vigilancia", "The watch")}</h2>
        <Hint topic="vigilancia" />
      </div>
      <div className="drift-rows">
        {drift.map((a) => (
          <div key={a.id} className="drift-row" data-anchor="drift-row">
            <span className="drift-top"><span className="drift-kind">{L(lang, ...KIND_WORD[a.kind])}</span><span className="drift-concept">{a.concept}</span>{a.amountMinor ? <b className="num">{formatMoney(a.amountMinor, ledger.settings.display, lang)}</b> : null}<button type="button" className="drift-x" data-anchor="drift-dismiss" aria-label={L(lang, "No avisar de este episodio", "Do not flag this episode")} onClick={() => muteDrift(a.id)}>
              <X aria-hidden />
            </button></span>
            <span className="drift-detail">{a.detail}</span>
          </div>
        ))}
        {vigil.map((c) => (
          <div key={vigilKey(c)} className="drift-row" data-anchor="drift-row">
            <span className="drift-top"><span className="drift-kind">{c.kind === "no-llego" ? L(lang, "No llegó", "Did not arrive") : L(lang, "Sin programar", "Not scheduled")}</span><span className="drift-concept">{c.concept}</span>{c.amountMinor ? <b className="num">{formatMoney(c.amountMinor, c.currency, lang)}</b> : null}<button type="button" className="drift-x" data-anchor="drift-dismiss" aria-label={L(lang, "No avisar de este episodio", "Do not flag this episode")} onClick={() => muteVigil(c)}>
              <X aria-hidden />
            </button></span>
            <span className="drift-detail">{c.text}</span>
          </div>
        ))}
      </div>
      {vigilMore > 0 ? <p className="drift-more">{L(lang, `y ${vigilMore} más en la vigilancia de tus programas`, `and ${vigilMore} more in the watch over your schedules`)}</p> : null}
    </section>
  );
}
