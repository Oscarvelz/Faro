import { useEffect, useState } from "react";
import { Eraser, FlaskConical, RotateCcw } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { countSampleRows, stripSample } from "@/lib/faro/sample";
import { SAMPLE_EVENT, resetSample, sampleOn, setSampleMode } from "@/lib/faro/samplemode";
import "./sample-mode.css";

/** Bumps on every sample switch/reset; used as the provider key so the app remounts on the other store. */
export function useSampleEpoch(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = () => setN((v) => v + 1);
    window.addEventListener(SAMPLE_EVENT, on);
    return () => window.removeEventListener(SAMPLE_EVENT, on);
  }, []);
  return n;
}

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/** Small mark beside the FARO word while sample data is showing. */
export function SamplePill() {
  const { lang } = useFaro();
  if (!sampleOn()) return null;
  return <em className="smp-pill" title={L(lang, "Datos de ejemplo", "Sample data")}>{L(lang, "Ejemplo", "Sample")}</em>;
}

/** Thin accent line across the top edge while sample data is showing. */
export function SampleEdge() {
  if (!sampleOn()) return null;
  return <i className="smp-edge" aria-hidden />;
}

/** Ajustes → Datos de ejemplo. */
export function SampleRow() {
  const { lang, confirm, session, commit } = useFaro();
  const on = sampleOn();
  const leftovers = !on && session ? countSampleRows(session.ledger) : 0;
  // 1.3.254 (Oscar, 2026-11-13): ACTIVAR el ejemplo pide confirmación primero — la ventana de la
  // casa explica, en palabras sencillas, qué se va a ver y que lo suyo queda intacto. APAGAR
  // vuelve a su libro sin ceremonia, como siempre.
  const flip = () => {
    if (on) { setSampleMode(false); return; }
    confirm({
      title: L(lang, "Activar datos de ejemplo", "Turn on sample data"),
      body: L(lang,
        "Verás el libro de ejemplo: los números de una casa inventada, para explorar y aprender Faro. Tu libro queda intacto — nada se borra ni se mezcla — y al apagar el ejemplo vuelve tal como estaba.",
        "You will see the sample book: a made-up household's numbers, to explore and learn Faro. Your book stays untouched — nothing is erased or mixed — and when you turn the sample off it comes back exactly as it was."),
      yes: L(lang, "Activar", "Turn on"),
      run: () => setSampleMode(true),
    });
  };
  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-ejemplo">
      <div className="smp-in">
      <div role="switch" tabIndex={0} aria-checked={on} className="manual-row aj-row smp-row" onClick={flip}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}>
        <FlaskConical aria-hidden />
        <span className="manual-row-text">
          <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Datos de ejemplo", "Sample data")}</h2><Hint topic="ejemplo" /></div>
          <span className="aj-sub">{on ? L(lang, "Ejemplo activo; lo tuyo, intacto", "Sample on; your books untouched") : L(lang, "Probar Faro sin tocar lo tuyo", "Try Faro without touching yours")}</span>
        </span>
        <i className="smp-switch" aria-hidden><b /></i>
      </div>
      {on ? (
        <div className="smp-acts">
          <button type="button" className="btn ghost smp-act" onClick={() => confirm({
            title: L(lang, "Reiniciar ejemplo", "Reset sample"),
            body: L(lang, "El ejemplo vuelve a como venía. Tus datos no cambian.", "The sample goes back to how it came. Your data does not change."),
            yes: L(lang, "Reiniciar", "Reset"),
            run: () => void resetSample(),
          })}><RotateCcw aria-hidden />{L(lang, "Reiniciar ejemplo", "Reset sample")}</button>
        </div>
      ) : leftovers ? (
        <div className="smp-acts">
          <button type="button" className="btn ghost smp-act" onClick={() => confirm({
            title: L(lang, "Quitar filas de ejemplo", "Remove sample rows"),
            body: L(lang, `Quita ${leftovers} filas de la muestra de agosto de tus libros. Lo demás queda igual. Puedes deshacerlo.`, `Removes ${leftovers} August sample rows from your books. Everything else stays. You can undo it.`),
            danger: true,
            yes: L(lang, "Quitar", "Remove"),
            run: () => commit((s) => stripSample(s), L(lang, "Filas de ejemplo quitadas", "Sample rows removed")),
          })}><Eraser aria-hidden />{L(lang, "Quitar filas de ejemplo", "Remove sample rows")}</button>
        </div>
      ) : null}
      </div>
    </section>
  );
}
