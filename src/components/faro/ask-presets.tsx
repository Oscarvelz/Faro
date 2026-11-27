/**
 * ask-presets.tsx — EL ADMINISTRADOR DE LAS PREGUNTAS A LA MANO (1.3.369).
 *
 * Vive en el pliegue de Ajustes «Preguntas a la mano» (asiento
 * settings.ask-presets, Ritmo — administrar es de Ritmo, como los pines
 * de widgets; usar las preguntas es de Esencial). Tres piezas:
 *   · TU LISTA, en tu orden: subir, bajar, quitar — el orden se guarda
 *     en el libro y la caja lo pinta tal cual.
 *   · EL CATÁLOGO: las preguntas canónicas del banco, por familia —
 *     solo de familias que el motor responde hoy (vivas y heredadas).
 *   · LA TUYA: una pregunta escrita por ti, tal como la escribas.
 * La fija del sistema («¿Qué puede hacer el asesor?», renombrada en
 * 1.3.405) no se administra: siempre estará primera en la caja, y el
 * pliegue lo dice.
 * 1.3.416 (Oscar): el catálogo deja la lista interminable por familia —
 * vive en tarjetas por territorio, con títulos cortos, cerradas al
 * llegar y una abierta a la vez, como las de la descripción (1.3.412);
 * dentro de su tarjeta, añadir sigue a un toque.
 */
import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { addAskPreset, askPresetsOf, FIXED_PRESET_Q, moveAskPreset, presetCatalogByGroup, removeAskPreset } from "@/lib/faro/askpresets";
import { Note } from "./finish";
import { useFaro } from "./provider";

export function AskPresetsManager() {
  const { session, lang, commit, has } = useFaro();
  const [own, setOwn] = useState("");
  const [openGroup, setOpenGroup] = useState(-1);
  if (!has("settings.ask-presets") || !session) return null;
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const list = askPresetsOf(session.ledger);
  const catalog = presetCatalogByGroup(lang);
  const inList = (q: string) => list.some((p) => p.text.trim().toLowerCase() === q.trim().toLowerCase());

  function addOwn() {
    const clean = own.trim();
    if (!clean) return;
    commit((s) => addAskPreset(s, clean), L("Pregunta guardada", "Question saved"));
    setOwn("");
  }

  return (
    <div className="ap-wrap" data-anchor="ask-presets-manager">
      {/* 1.3.491 (la cola de Oscar): la nota ya no va suelta sobre el
          fondo del pliegue — viste la Note de la casa, como sus
          hermanas de Ajustes. */}
      <Note kind="tip">
        {L(
          `La primera es de Faro y no se quita: «${FIXED_PRESET_Q.es}». Después van las tuyas, en tu orden — un toque en la caja del Asesor y la respuesta llega al instante.`,
          `The first one is Faro's and can't be removed: “${FIXED_PRESET_Q.en}”. Then come yours, in your order — one tap in the Advisor's box and the answer comes at once.`,
        )}
      </Note>
      {list.length ? (
        <div className="ap-list">
          {list.map((p, i) => (
            <div key={p.id} className="ap-row" data-anchor="ap-row">
              <span className="ap-text">{p.text}</span>
              <span className="ap-tools">
                <button type="button" className="ap-btn" data-anchor="ap-up" disabled={i === 0} aria-label={L("Subir", "Move up")} onClick={() => commit((s) => moveAskPreset(s, p.id, -1), L("Orden de preguntas", "Question order"))}><ChevronUp size={14} /></button>
                <button type="button" className="ap-btn" data-anchor="ap-down" disabled={i === list.length - 1} aria-label={L("Bajar", "Move down")} onClick={() => commit((s) => moveAskPreset(s, p.id, 1), L("Orden de preguntas", "Question order"))}><ChevronDown size={14} /></button>
                <button type="button" className="ap-btn" data-anchor="ap-remove" aria-label={L("Quitar", "Remove")} onClick={() => commit((s) => removeAskPreset(s, p.id), L("Pregunta quitada", "Question removed"))}><X size={14} /></button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Note kind="empty">{L("Todavía no guardas ninguna: elige del catálogo o escribe la tuya.", "You haven't saved any yet: pick from the catalog or write your own.")}</Note>
      )}
      <div className="ap-own">
        <input
          className="field ap-own-input"
          data-anchor="ap-own-input"
          value={own}
          onChange={(e) => setOwn(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwn(); } }}
          placeholder={L("Escribe tu pregunta…", "Write your question…")}
          aria-label={L("Tu pregunta", "Your question")}
        />
        <button type="button" className="ap-add" data-anchor="ap-own-add" onClick={addOwn} disabled={!own.trim()}>
          <Plus size={12} /> {L("Añadir", "Add")}
        </button>
      </div>
      <div className="ap-catalog">
        {catalog.map((g, gi) => (
          <div key={g.title} className="ap-cat-card">
            <button type="button" className="ap-cat-head" data-anchor="ap-cat-head" aria-expanded={openGroup === gi} onClick={() => setOpenGroup((v) => (v === gi ? -1 : gi))}>
              <span className="ap-cat-title">{g.title}</span>
              <span className="ap-cat-count">{g.questions.length}</span>
              <ChevronDown size={15} className="ap-cat-chev" aria-hidden />
            </button>
            {openGroup === gi ? (
              <div className="ap-cat-body">
                {g.questions.map((q) => {
                  const added = inList(q);
                  return (
                    <div key={q} className="ap-row">
                      <span className="ap-text">{q}</span>
                      {added ? (
                        <span className="ap-added" data-anchor="ap-added"><Check size={14} /> {L("Guardada", "Saved")}</span>
                      ) : (
                        <button type="button" className="ap-add" data-anchor="ap-cat-add" onClick={() => commit((s) => addAskPreset(s, q), L("Pregunta guardada", "Question saved"))}>
                          <Plus size={12} /> {L("Añadir", "Add")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
