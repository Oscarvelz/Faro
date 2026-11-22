/**
 * ask-learned.tsx — EL ADMINISTRADOR DE LO APRENDIDO (Ola 11 del
 * banco, integrado en 1.3.383).
 *
 * Vive en el pliegue de Ajustes «Lo que tu Asesor ha aprendido»
 * (asiento settings.ask-learned, Ritmo — administrar es de Ritmo,
 * como las predeterminadas; el aprendizaje mismo funciona en todo
 * modo). Muestra los patrones confirmados del usuario — su palabra
 * para cada cosa — y deja borrarlos: olvidar un patrón es definitivo
 * y la próxima vez el Asesor preguntará de vuelta, como la primera.
 *
 * LA LEY (la condición de Oscar): el Asesor aprende SOLO de eventos
 * confirmados — el toque en su pregunta de vuelta o una corrección —
 * y los dígitos jamás se aprenden: aquí no hay una sola cifra del
 * libro, solo palabras y sus cosas. Los patrones viven con el libro,
 * fuera de los meses, y ningún total los lee.
 */
import { X } from "lucide-react";
import { askPatternsOf, describeLearned, forgetAlias, type LearnedKind } from "@/lib/faro/asklearn";
import { useFaro } from "./provider";

export function AskLearnedManager() {
  const { session, lang, names, commit, has } = useFaro();
  if (!has("settings.ask-learned") || !session) return null;
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const patterns = askPatternsOf(session.ledger);
  const resolve = (targetId: string, kind: LearnedKind): string => {
    if (kind === "cat") return names.cat(targetId) || targetId;
    if (kind === "person") return session.ledger.remitPeople?.find((p) => p.id === targetId)?.name ?? targetId;
    return names.sub(targetId) || targetId;
  };
  const list = describeLearned(patterns, resolve);

  return (
    <div className="ap-wrap" data-anchor="ask-learned-manager">
      <p className="ap-note">
        {L(
          "Tu Asesor aprende tus palabras solo de lo que tú confirmas: cuando te pregunta de vuelta y tocas una tarjeta, tu palabra para esa cosa queda guardada. Ningún dígito vive en un patrón — cada cifra sale de tu libro en el momento de responder.",
          "Your Advisor learns your words only from what you confirm: when it asks you back and you tap a card, your word for that thing is kept. No digit lives in a pattern — every figure comes from your book at the moment of answering.",
        )}
      </p>
      {list.length ? (
        <div className="ap-list">
          {list.map((p) => (
            <div key={p.word} className="ap-row" data-anchor="al-row">
              <span className="ap-text">{L(`«${p.word}» es ${p.name}`, `"${p.word}" means ${p.name}`)}</span>
              <span className="ap-tools">
                <button
                  type="button"
                  className="ap-btn"
                  data-anchor="al-forget"
                  aria-label={L(`Olvidar «${p.word}»`, `Forget "${p.word}"`)}
                  onClick={() => commit((s) => ({ ...s, askPatterns: forgetAlias(askPatternsOf(s), p.word) }), L("Patrón olvidado", "Pattern forgotten"))}
                >
                  <X size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="ap-note">{L("Todavía no ha aprendido ninguna palabra tuya. Pregúntale algo con tus palabras y, cuando te pregunte de vuelta, toca la tarjeta correcta: así aprende.", "It hasn't learned any of your words yet. Ask it something in your own words and, when it asks you back, tap the right card: that's how it learns.")}</p>
      )}
    </div>
  );
}
