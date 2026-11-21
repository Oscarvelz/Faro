/**
 * ask-box.tsx — la caja de Preguntar al Asesor (Captura Inteligente,
 * mapa F8; Ola 5a, 1.3.345). Vive en la pantalla del Asesor, no en una
 * pestaña nueva: una caja de pregunta, los chips que enseñan lo que el
 * Asesor sí sabe, y la tarjeta de respuesta con la anatomía del mapa —
 * veredicto en el registro del usuario, el efecto en 2–3 piezas, qué se
 * rompería, y «Registrarlo», que deja el gasto preguntado en la BANDEJA
 * (guardar sigue pasando por la mesa de siempre; la respuesta nunca
 * guarda ni mueve dinero).
 *
 * 1.3.351 (Oscar): la caja vuelve DEBAJO de las Palabras claras — primero
 * el consejo general, después la pregunta — y su envoltorio sube al
 * material del héroe del Coach (el resplandor del acento, el medallón):
 * la capacidad no se toca; lo que sube es el marco.
 *
 * Lo que no sabe, lo dice: «Eso todavía no lo sé responder. Esto sí:»
 * con los chips. Y un gasto sin monto no se adivina: la tarjeta pide el
 * dato con chips de montos.
 *
 * 1.3.348 (Oscar): la caja CRECE con lo que se escribe — como en
 * Cadence — para ver la pregunta entera, y al preguntar se CONTRAE:
 * el texto se va y la pregunta queda viviendo en «asked» y en la
 * respuesta. Enter pregunta; Mayús+Enter parte la línea.
 *
 * 1.3.353 (Oscar): «asked» ahora también SE VE — la pregunta hecha vive
 * en su propia tarjeta sobre la respuesta, aunque la caja ya se haya
 * vaciado, para que la respuesta nunca quede sin su contexto; cada
 * pregunta nueva reemplaza la tarjeta, sin historia.
 */
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { answerQuestion, type AskResult } from "@/lib/faro/ask";
import { addDrafts, findDup, validateDraft } from "@/lib/faro/drafts";
import type { Draft } from "@/lib/faro/types";
import { askChips } from "@/lib/faro/lexicon";
import { uid } from "@/lib/faro/money";
import type { ParseCtx } from "@/lib/faro/textparse";
import { Hint } from "./hint";
import { importToast } from "./bank-dock";
import { useFaro } from "./provider";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AskBox() {
  const { session, lang, names, key, commit, has, fmt } = useFaro();
  const [text, setText] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [asked, setAsked] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // La caja respira: su alto sigue al texto (tope de cinco líneas) y
  // vuelve a una línea cuando el texto se va.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);
  if (!has("advisor.ask") || !session) return null;
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const chips = askChips(lang);

  function ctx(): ParseCtx {
    return {
      ledger: session!.ledger,
      lang,
      today: todayLocal(),
      display: session!.ledger.settings.display ?? "USD",
      makeId: uid,
      now: new Date().toISOString(),
    };
  }

  function ask(q: string) {
    const clean = q.trim();
    if (!clean || !session) return;
    setAsked(clean);
    setResult(answerQuestion(session.ledger, key, lang, names, clean, ctx(), todayLocal()));
    setText(""); // al preguntar, la caja se contrae (348)
  }

  function register() {
    if (!session || result?.kind !== "answer" || !result.draft) return;
    const d = result.draft;
    const draft: Draft = {
      id: uid(), source: "text", kind: "line", raw: asked, createdAt: new Date().toISOString(),
      day: todayLocal(), sign: "out", amountMinor: d.amountMinor, currency: d.currency,
      concept: d.concept, note: "", book: "expense-variable", unsure: [], missing: [],
    };
    const dup = findDup(draft, session.ledger);
    if (dup) draft.dupOf = dup.id;
    draft.missing = validateDraft(draft).missing;
    commit((s) => addDrafts(s, [draft]), L("Pregunta al Asesor", "Asked the Advisor"));
    importToast({ text: L("Quedó en la bandeja, para revisar.", "It's in the tray, ready to review.") });
    setResult(null);
    setText("");
  }

  return (
    <section className="ask-box" data-anchor="advisor-ask">
      <div className="ask-head">
        <span className="ask-ico" aria-hidden><MessageCircleQuestion size={16} /></span>
        <strong>{L("Pregúntale a tu Asesor", "Ask your Advisor")}</strong>
        <Hint topic="preguntar-asesor" />
      </div>
      <div className="ask-row">
        <textarea
          ref={taRef}
          className="ask-input"
          data-anchor="ask-input"
          rows={1}
          value={text}
          placeholder={L("¿Puedo gastar $100 en zapatos?", "Can I spend $100 on shoes?")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } }}
        />
        <button type="button" className="ask-go" data-anchor="ask-go" onClick={() => ask(text)} aria-label={L("Preguntar", "Ask")}>
          <Send size={15} />
        </button>
      </div>
      {!result ? (
        <div className="ask-chips">
          {chips.map((c) => (
            <button key={c} type="button" className="ask-chip" data-anchor="ask-chip" onClick={() => { setText(c); ask(c); }}>{c}</button>
          ))}
        </div>
      ) : null}
      {result && asked ? (
        <div className="ask-q" data-anchor="ask-q">
          <span className="ask-q-label">{L("Tu pregunta", "Your question")}</span>
          <p className="ask-q-text">{asked}</p>
        </div>
      ) : null}
      {result?.kind === "unknown" ? (
        <div className="ask-card" data-anchor="ask-card">
          <p className="ask-verdict">{L("Eso todavía no lo sé responder. Esto sí:", "That I can't answer yet. This I can:")}</p>
          <div className="ask-chips">
            {chips.map((c) => (
              <button key={c} type="button" className="ask-chip" data-anchor="ask-chip" onClick={() => { setText(c); ask(c); }}>{c}</button>
            ))}
          </div>
        </div>
      ) : null}
      {result?.kind === "need-amount" ? (
        <div className="ask-card" data-anchor="ask-card">
          <p className="ask-verdict">{L("¿De cuánto sería el gasto? Sin el monto no adivino.", "How much would the spend be? Without the amount I won't guess.")}</p>
          <div className="ask-chips">
            {[50, 100, 200, 500].map((n) => (
              <button key={n} type="button" className="ask-chip" data-anchor="ask-amt-chip" onClick={() => ask(`${asked} $${n}`)}>${n}</button>
            ))}
          </div>
        </div>
      ) : null}
      {result?.kind === "answer" ? (
        <div className="ask-card" data-anchor="ask-card">
          <p className="ask-verdict">{result.verdict}</p>
          <div className="ask-pieces">
            {result.pieces.map((p, i) => (
              <div key={i} className="ask-piece">
                <span>{p.label}</span>
                <strong className="num">{fmt(p.minor)}</strong>
              </div>
            ))}
          </div>
          {result.note ? <p className="ask-note">{result.note}</p> : null}
          {result.draft ? (
            <button type="button" className="ask-reg" data-anchor="ask-register" onClick={register}>
              <Sparkles size={14} /> {L("Registrarlo", "Record it")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
