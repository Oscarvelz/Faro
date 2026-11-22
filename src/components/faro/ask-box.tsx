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
 *
 * 1.3.355 (LA FUSIÓN, decisión de Oscar): la caja pregunta al BANCO
 * (ask2.ts — la rama del banco del Asesor como columna, con el motor de
 * la 5a intacto dentro como delegado). Los chips son las preguntas
 * canónicas del banco. Dos injertos de la candidata viven aquí: la
 * PREGUNTA DE VUELTA rendida — cuando un escenario («si sacara $20…»)
 * se puede sacar de varias cuentas, la tarjeta pregunta de cuál, con
 * chips que traen la cuenta y su libre, y el toque recalcula clavado en
 * esa cuenta — y la PUERTA de «Faro mismo»: la respuesta que nombra una
 * función con tema enrutado (askmap.FUNCTION_TOPIC) lleva su «Ir allí»
 * por la vía del Manual.
 *
 * 1.3.369 (PREGUNTAS PREDETERMINADAS — el conflicto de Oscar): la fila
 * «A la mano» vive SIEMPRE en la caja, también tras una respuesta — la
 * fija del sistema («¿Qué puedes hacer?», cuya respuesta se genera del
 * banco en el momento) y las preguntas que la persona guardó, EN SU
 * ORDEN. El engranaje de la cabecera (con su asiento, Ritmo) lleva al
 * pliegue de Ajustes donde la lista se administra.
 *
 * 1.3.373 (Oscar, 2026-11-21 19:42): dos correcciones sobre la .371 en
 * su teléfono — la descripción de la fija se presenta en GRUPOS con
 * renglón propio (la prosa cosida con punto y coma se leía como texto
 * suelto), y la tarjeta de la pregunta es un botón: tocarla CIERRA la
 * respuesta y las preguntas sugeridas del banco reaparecen.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Compass, Send, Settings, Sparkles } from "lucide-react";
import { answerBankQuestion, answerFollowUp, bankChips, type AskFrame, type BankResult } from "@/lib/faro/ask2";
import { aliasIn, askPatternsOf, forgetAlias, learnAlias, touchAlias } from "@/lib/faro/asklearn";
import { foldQ } from "@/lib/faro/lexicon";
import { askPresetsOf, addAskPreset, capabilitiesText, FIXED_PRESET_Q, nextAskEntry, suggestionTrio } from "@/lib/faro/askpresets";
import { FUNCTION_TOPIC } from "@/lib/faro/askmap";
import { MANUAL_TOPICS } from "@/lib/manual/topics";
import { addDrafts, findDup, validateDraft } from "@/lib/faro/drafts";
import type { Draft } from "@/lib/faro/types";
import { uid } from "@/lib/faro/money";
import type { ParseCtx } from "@/lib/faro/textparse";
import { findTopic } from "@/lib/manual/topics";
import { Hint } from "./hint";
import { importToast } from "./bank-dock";
import { useFaro } from "./provider";

/** LA PALABRA DEL USUARIO PARA SU CUENTA (Ola 11, integración
 * 1.3.383): de la pregunta que trajo la vuelta («¿cuánto me queda en
 * mi chequera?»), la frase con que la persona nombró a su cuenta tras
 * el posesivo o el artículo. Solo se aprende si la frase NO es
 * vocabulario genérico (cuenta, ahorros, banco…), NO contiene el
 * nombre oficial de la tarjeta tocada y NO trae dígitos — cualquier
 * otra cosa sería adivinar, y adivinar no es aprender. */
const ACCOUNT_GENERIC = new Set(["cuenta", "cuentas", "ahorro", "ahorros", "account", "accounts", "saving", "savings", "banco", "bank", "dinero", "money", "saldo", "balance", "fondo", "fondos", "fund", "corriente", "debito", "credito", "checking", "debit", "credit"]);
function accountWordOf(q: string, officialLabel: string): string | null {
  const f = foldQ(q);
  const m = /(?:^|\s)(?:de\s+|en\s+|from\s+|in\s+)?(?:mi|mis|my)\s+([a-z ]{2,24}?)(?=\s+(?:de|del|en|para|con|por)\b|[?.,]|$)/.exec(f)
    ?? /(?:^|\s)(?:la|el|los|las|the)\s+([a-z ]{2,24}?)(?=\s+(?:de|del|en|para|con|por)\b|[?.,]|$)/.exec(f);
  if (!m) return null;
  const w = m[1].trim().replace(/\s+/g, " ");
  if (!w || /\d/.test(w)) return null;
  if (w.split(" ").every((x) => ACCOUNT_GENERIC.has(x))) return null;
  const off = foldQ(officialLabel);
  if (off.includes(w) || w.includes(off)) return null;
  return w;
}

/** EL DESTINO DE UNA ACCIÓN (Olas 5/10/12): el target es un id del
 * mapa de funciones; su puerta es el tema del Manual que lo declara —
 * por FUNCTION_TOPIC o por las llaves del propio tema. Una acción sin
 * tema con ruta no se pinta: un botón que no lleva a ningún lado es
 * peor que ningún botón. */
function topicForAction(target: string) {
  const tid = FUNCTION_TOPIC[target];
  const byMap = tid ? findTopic(tid) : null;
  if (byMap?.go) return byMap;
  return MANUAL_TOPICS.find((t) => t.go && (t.keys ?? []).includes(target)) ?? null;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AskBox() {
  const { session, lang, names, key, commit, has, mode, fmt, goTopic } = useFaro();
  const [text, setText] = useState("");
  const [result, setResult] = useState<BankResult | null>(null);
  const [asked, setAsked] = useState("");
  const [caps, setCaps] = useState(false);
  // §20 (1.3.380): EL MARCO del seguimiento — estado de diálogo de la
  // caja: lo que la última respuesta dejó para que la siguiente
  // pregunta viva de ella. Vive solo aquí, en la sesión de la caja:
  // jamás entra al libro ni viaja con él, y muere al cerrar la
  // respuesta o cuando una respuesta nueva abre el suyo.
  const [frame, setFrame] = useState<AskFrame | null>(null);
  // Ola 17 (1.3.383): la propuesta de predeterminada que la respuesta
  // trae («esta palabra la usas mucho: ¿te dejo su pregunta a la
  // mano?») se descarta con «Ahora no» — y la caja lo recuerda solo
  // para ESTA respuesta: la próxima propuesta vuelve a ofrecerse.
  const [proposalOff, setProposalOff] = useState(false);
  // 1.3.376: cada montaje de la caja es una entrada al Asesor; el
  // número de entrada elige el trío de sugerencias del banco.
  const [entry] = useState(() => nextAskEntry());
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  // §21 (1.3.382): LA REFERENCIA — la búsqueda despacha la pregunta del
  // usuario (verbatim) por «faro-ask-seed» y la caja la instala y la
  // envía como si la hubiera escrito aquí: el hilo del Seguimiento
  // nace de ese turno como de cualquier otro. La referencia vive en un
  // ref porque ask() se redefine en cada pintada.
  const seedRef = useRef<(q: string) => void>(() => {});
  useEffect(() => {
    const onSeed = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      if (typeof q === "string" && q.trim()) seedRef.current(q);
    };
    window.addEventListener("faro-ask-seed", onSeed);
    return () => window.removeEventListener("faro-ask-seed", onSeed);
  }, []);

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
  const chips = bankChips(lang);

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

  function ask(q: string, pin?: { accountId: string }) {
    const clean = q.trim();
    if (!clean || !session) return;
    setCaps(false);
    setAsked(clean);
    setProposalOff(false);
    // Ola 23 (A23-1/2/3/5): la caja enhebra el modo vigente al motor —
    // el Asesor responde en el piso de la persona, no en el de la app.
    // §20 (1.3.380): con marco vivo, el seguimiento se intenta ANTES
    // de la cascada — el hilo manda (L-S1). Si ningún verbo lo
    // resuelve, la cascada sirve la pregunta como fresca y su
    // respuesta abre el marco nuevo (L-S4): cada respuesta con marco
    // lo reemplaza; una respuesta sin marco cierra el hilo.
    // EL APRENDIZAJE (Olas 11/17 del banco, integrado en 1.3.383): la
    // caja enhebra los patrones confirmados del libro al motor, y
    // aplica sus dos señales — «olvida…» (forgetWord: la orden del
    // usuario, que el banco puro no ejecuta) y el conteo de usos
    // (touchAlias: el patrón disparó y la respuesta salió por él).
    const patterns = askPatternsOf(session.ledger);
    const fu = pin ? null : answerFollowUp(session.ledger, key, lang, names, clean, ctx(), todayLocal(), frame, mode);
    const r = fu ?? answerBankQuestion(session.ledger, key, lang, names, clean, ctx(), todayLocal(), pin, mode, patterns);
    setResult(r);
    if (r.kind === "answer") {
      setFrame(r.frame ?? null);
      if (r.forgetWord) {
        const next = forgetAlias(patterns, r.forgetWord);
        if (next.length !== patterns.length) commit((s) => ({ ...s, askPatterns: next }), L("Pregunta al Asesor", "Asked the Advisor"));
      } else {
        const hit = aliasIn(patterns, foldQ(clean));
        if (hit) commit((s) => ({ ...s, askPatterns: touchAlias(askPatternsOf(s), hit.word) }), L("Pregunta al Asesor", "Asked the Advisor"));
      }
    }
    setText(""); // al preguntar, la caja se contrae (348)
  }
  seedRef.current = ask;

  // La vuelta de la pregunta: la tarjeta preguntó de qué cuenta sale y
  // la persona tocó una — la MISMA pregunta se recalcula con la cuenta
  // clavada; la tarjeta de la pregunta no cambia (sigue siendo la suya).
  // EL APRENDIZAJE (Ola 11, integrado en 1.3.383): ese toque ES el
  // evento confirmado del que el Asesor aprende — si la pregunta trae
  // una palabra SUYA para la cuenta («mi chequera»), distinta del
  // nombre oficial y sin dígitos, la palabra queda aprendida para esa
  // cuenta. Sin palabra propia no se aprende nada: el toque confirma
  // la cuenta, no una palabra inventada.
  function askBack(o: { id: string; label: string }) {
    if (!asked || !session) return;
    const word = accountWordOf(asked, o.label);
    if (word) {
      const patterns = askPatternsOf(session.ledger);
      const next = learnAlias(patterns, word, o.id, "account", "card-tap");
      if (next !== patterns) commit((s) => ({ ...s, askPatterns: next }), L("Pregunta al Asesor", "Asked the Advisor"));
    }
    ask(asked, { accountId: o.id });
  }

  // La propuesta aceptada (Ola 17): la pregunta propuesta entra en
  // las predeterminadas de la persona, en su lista y su orden — la
  // misma escritura que el pliegue de Ajustes usa (addAskPreset).
  function acceptProposal() {
    if (!session || result?.kind !== "answer" || !result.proposal) return;
    const q = result.proposal.question;
    commit((s) => addAskPreset(s, q), L("Pregunta al Asesor", "Asked the Advisor"));
    importToast({ text: L("Quedó entre tus preguntas a la mano.", "It's among your questions at hand.") });
    setProposalOff(true);
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
    setFrame(null);
    setCaps(false);
    setText("");
  }

  // La fija del sistema: «¿Qué puedes hacer?» — su respuesta no pasa por
  // el motor de preguntas: es la descripción honesta generada del banco
  // en el momento (askpresets.capabilitiesText), rendida como tarjeta de
  // prosa. Corrección de Oscar (2026-11-21 18:46): nada de un folio de
  // preguntas — la honestidad misma es la respuesta.
  function showCaps() {
    setResult(null);
    setFrame(null);
    setAsked(FIXED_PRESET_Q[lang]);
    setCaps(true);
    setText("");
  }

  // 1.3.373 (Oscar, 2026-11-21 19:42): tocar la tarjeta de la pregunta
  // CIERRA la respuesta — la tarjeta se va, la respuesta se va, y las
  // preguntas sugeridas del banco reaparecen (viven solo sin respuesta).
  function closeAnswer() {
    setResult(null);
    setFrame(null);
    setCaps(false);
    setAsked("");
  }

  const presets = askPresetsOf(session.ledger);
  const presetsTopic = findTopic("preguntas-a-la-mano");

  // La puerta de «Faro mismo»: la función nombrada, si su tema del mapa
  // trae ruta, se abre por la vía del Manual (atrás vuelve a la caja).
  const doorTopic = result?.kind === "answer" && result.family === "faro-mismo"
    ? (() => { const tid = FUNCTION_TOPIC[result.source[0] ?? ""]; const tp = tid ? findTopic(tid) : null; return tp?.go ? tp : null; })()
    : null;

  return (
    <section className="ask-box" data-anchor="advisor-ask">
      <div className="ask-head">
        <span className="ask-ico" aria-hidden><Compass size={16} /></span>
        <strong>{L("Pregúntale a tu Asesor", "Ask your Advisor")}</strong>
        <Hint topic="preguntar-asesor" />
        {has("settings.ask-presets") && presetsTopic?.go ? (
          <button type="button" className="ask-gear" data-anchor="ask-presets-gear" aria-label={L("Ajustar las preguntas a la mano", "Adjust the questions at hand")} onClick={() => goTopic(presetsTopic.id, presetsTopic.go!, "preguntar-asesor")}>
            <Settings size={15} />
          </button>
        ) : null}
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
      {(result || caps) && asked ? (
        <button type="button" className="ask-q" data-anchor="ask-q" onClick={closeAnswer} aria-label={L("Cerrar la respuesta", "Close the answer")}>
          <span className="ask-q-label">{L("Tu pregunta", "Your question")}</span>
          <span className="ask-q-text">{asked}</span>
        </button>
      ) : null}
      {caps ? (
        <div className="ask-card" data-anchor="ask-card">
          {(() => { const c = capabilitiesText(lang); return (<>
            <p className="ask-verdict">{c.intro}</p>
            {c.groups.map((g) => (
              <div key={g.title} className="ask-caps-group">
                <span className="ask-caps-kicker">{g.title}</span>
                <ul className="ask-caps-list">
                  {g.items.map((it) => (<li key={it}>{it}</li>))}
                </ul>
              </div>
            ))}
            <div className="ask-caps-group">
              <span className="ask-caps-kicker">{c.notYetTitle}</span>
              <ul className="ask-caps-list">
                {c.notYet.map((it) => (<li key={it}>{it}</li>))}
              </ul>
              <p className="ask-caps-note">{c.notYetNote}</p>
            </div>
            <p className="ask-note">{c.limits}</p>
          </>); })()}
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
      {result?.kind === "ask-back" ? (
        <div className="ask-card" data-anchor="ask-card">
          <p className="ask-verdict">{result.verdict}</p>
          <div className="ask-chips">
            {result.options.map((o) => (
              <button key={o.id} type="button" className="ask-chip" data-anchor="ask-back-chip" onClick={() => askBack(o)}>
                {o.label} · {fmt(o.minor)}
              </button>
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
          {/* LAS ACCIONES DE LA RESPUESTA (Olas 5/10/12, integración
              1.3.383): la respuesta PROPONE — la puerta a donde su
              cifra vive (El Puente) y los verbos que implica — y el
              toque DISPONE: cada acción abre el flujo de la app por
              la vía del Manual, con su vuelta atrás, y nada se
              ejecuta solo. En el orden que el motor declara (VER ·
              HACER · SEGUIR), tope tres. */}
          {result.actions?.length ? (
            <div className="ask-actions" data-anchor="ask-actions">
              {result.actions.slice(0, 3).map((a) => {
                const tp = topicForAction(a.target);
                if (!tp) return null;
                return (
                  <button key={`${a.id}-${a.target}`} type="button" className={`ask-action${a.id === "goto" ? " is-door" : ""}`} data-anchor="ask-action" onClick={() => goTopic(tp.id, tp.go!, "preguntar-asesor")}>
                    {a.label} <ArrowRight size={13} />
                  </button>
                );
              })}
            </div>
          ) : null}
          {/* LA PROPUESTA (Ola 17): la frecuencia propone una
              predeterminada; la tarjeta la ofrece y la persona
              dispone — Guardar la deja entre sus preguntas a la
              mano; «Ahora no» la descarta para esta respuesta. */}
          {result.proposal && !proposalOff ? (
            <div className="ask-proposal" data-anchor="ask-proposal">
              <p className="ask-note">{L(`«${result.proposal.word}» es una palabra que usas mucho. ¿Te dejo su pregunta entre tus preguntas a la mano, lista para tocarla?`, `"${result.proposal.word}" is a word you use a lot. Shall I leave its question among your questions at hand, ready to tap?`)}</p>
              <p className="ask-proposal-q">{result.proposal.question}</p>
              <div className="ask-chips">
                <button type="button" className="ask-chip is-fixed" data-anchor="ask-proposal-yes" onClick={acceptProposal}>{L("Guardarla", "Save it")}</button>
                <button type="button" className="ask-chip" data-anchor="ask-proposal-no" onClick={() => setProposalOff(true)}>{L("Ahora no", "Not now")}</button>
              </div>
            </div>
          ) : null}
          {doorTopic ? (
            <div className="ask-door-row">
              <button type="button" className="ask-door" data-anchor="ask-door" onClick={() => goTopic(doorTopic.id, doorTopic.go!, "preguntar-asesor")}>
                {L("Ir allí", "Go there")} <ArrowRight size={13} />
              </button>
              <span className="ask-door-where">{doorTopic.go!.where[lang === "en" ? 1 : 0]}</span>
            </div>
          ) : null}
          {result.draft ? (
            <button type="button" className="ask-reg" data-anchor="ask-register" onClick={register}>
              <Sparkles size={14} /> {L("Registrarlo", "Record it")}
            </button>
          ) : null}
        </div>
      ) : null}
      {/* LA FILA «A LA MANO» (1.3.369; sitio corregido en la 1.3.371;
          orden fallado en la 1.3.376): vive SIEMPRE — también tras una
          respuesta, que era el conflicto: no había vuelta a verlas —
          pero DEBAJO de la respuesta, como falló Oscar en su teléfono
          (2026-11-21 18:46): primero la pregunta y su respuesta; las
          predeterminadas, después. Y entre las preguntas ofrecidas, las
          de la persona son LAS PRIMERAS (1.3.376, su captura de las
          21:07: Ajustes lo promete — «tus preguntas, primeras en la
          caja» — y la caja lo cumple): en reposo la fila abre las
          preguntas, y las sugerencias del banco van debajo de ella.
          La fija del sistema va primera; después, las de la persona EN
          SU ORDEN. Un toque pregunta al instante. */}
      <div className="ask-presets" data-anchor="ask-presets">
        <span className="ask-presets-label">{L("A la mano", "At hand")}</span>
        <div className="ask-chips">
          <button type="button" className="ask-chip is-fixed" data-anchor="ask-preset-fixed" onClick={showCaps}>{FIXED_PRESET_Q[lang]}</button>
          {presets.map((p) => (
            <button key={p.id} type="button" className="ask-chip" data-anchor="ask-preset" onClick={() => ask(p.text)}>{p.text}</button>
          ))}
        </div>
      </div>
      {/* LAS SUGERENCIAS DEL BANCO (1.3.376): solo en reposo, solo
          TRES, con su propio rótulo — como «A la mano» lleva el suyo —
          y DEBAJO de las preguntas de la persona. El trío rota en cada
          entrada a la caja (askpresets.suggestionTrio). */}
      {!result && !caps ? (
        <div className="ask-presets" data-anchor="ask-suggest">
          <span className="ask-presets-label">{L("Sugerencias", "Suggestions")}</span>
          <div className="ask-chips">
            {suggestionTrio(chips, entry).map((c) => (
              <button key={c} type="button" className="ask-chip" data-anchor="ask-chip" onClick={() => { setText(c); ask(c); }}>{c}</button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
