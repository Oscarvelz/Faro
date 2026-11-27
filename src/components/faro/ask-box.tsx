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
 * fija del sistema («¿Qué puede hacer el asesor?», cuya respuesta se
 * genera del banco en el momento) y las preguntas que la persona guardó, EN SU
 * ORDEN. El engranaje de la cabecera (con su asiento, Ritmo) lleva al
 * pliegue de Ajustes donde la lista se administra.
 *
 * 1.3.373 (Oscar, 2026-11-21 19:42): dos correcciones sobre la .371 en
 * su teléfono — la descripción de la fija se presenta en GRUPOS con
 * renglón propio (la prosa cosida con punto y coma se leía como texto
 * suelto), y la tarjeta de la pregunta es un botón: tocarla CIERRA la
 * respuesta y las preguntas sugeridas del banco reaparecen.
 *
 * 1.3.456 · LA CAJA OBEDECE (cuatro fallos de Oscar en su teléfono):
 * (1) EL LAPICITO — la tarjeta de lo dicho lleva un lápiz en su
 * esquina inferior derecha que devuelve el texto a la caja para
 * reeditarlo sin reescribirlo. (2) LO DICHO QUEDA ARRIBA TAMBIÉN EN
 * LAS ÓRDENES — la tarjeta se presenta con la misma forma cuando lo
 * abierto es un relato, un programa, una orden o una creación, no
 * solo con una respuesta: la condición de la tarjeta nombra los
 * cuatro flujos (antes pedía result o caps, y lo dicho desaparecía).
 * (3) EL ECO CON SUS LÍNEAS — los ecos nacen con un renglón por cosa
 * (buildEcho une con «\n») y la presentación los aplanaba: el CSS de
 * la tarjeta conserva ahora los saltos con los que el texto nace
 * (white-space: pre-line en .ask-verdict y .ask-note). (4) LAS
 * ACCIONES PROMETIDAS SE VEN — las puertas que el banco emite y cuyo
 * tema no estaba en FUNCTION_TOPIC se descartaban en silencio; el
 * mapa las registra (askmap.ts) y captura456 cerca que todo target
 * emitido resuelva a un tema con ruta.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Compass, CreditCard, Pencil, Send, Settings, Sparkles } from "lucide-react";
import { answerBankQuestion, answerFollowUp, bankChips, classifyBankQuestion, convoAfterFollowUp, type AskFrame, type BankResult, type ConvoFrame } from "@/lib/faro/ask2";
import { parsePrograma, parseRelato, programaCadenceText, type ProgramaResult, type RelatoDraft, type RelatoResult } from "@/lib/faro/relato";
import { parseOrden, type OrdenResult } from "@/lib/faro/orden";
import { applyOrdenDraft } from "@/lib/faro/orden-settle";
import { crearDesdeRelato, crearInicio, crearRespuesta, type CrearPropuesta, type CrearStep } from "@/lib/faro/crear";
import { applyCrearDraft, locatePendingLine, rawNameFor } from "@/lib/faro/crear-settle";
import { settleProgramaDrafts } from "@/lib/faro/programa-settle";
import { settleRelatoDrafts } from "@/lib/faro/relato-settle";
import { formatMoney } from "@/lib/faro/money";
import { BankFigureView } from "./bank-figure";
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
  const { session, lang, names, key, commit, commitGuarded, chooseMode, has, mode, fmt, goTopic } = useFaro();
  const [text, setText] = useState("");
  const [result, setResult] = useState<BankResult | null>(null);
  const [asked, setAsked] = useState("");
  const [caps, setCaps] = useState(false);
  // 1.3.412: el acordeón de la descripción — qué grupo está abierto
  // (-1 = ninguno: la descripción llega con todas sus tarjetas cerradas).
  const [capsOpen, setCapsOpen] = useState(-1);
  // §20 (1.3.380): EL MARCO del seguimiento — estado de diálogo de la
  // caja: lo que la última respuesta dejó para que la siguiente
  // pregunta viva de ella. Vive solo aquí, en la sesión de la caja:
  // jamás entra al libro ni viaja con él, y muere al cerrar la
  // respuesta o cuando una respuesta nueva abre el suyo.
  const [frame, setFrame] = useState<AskFrame | null>(null);
  // OLA 19 (banco, Plan de Avance II): el marco conversacional viaja
  // junto al marco §20 — la caja lo guarda tras cada respuesta del
  // banco y lo devuelve como undécimo argumento en la próxima
  // pregunta de la misma conversación. Es dato puro serializable.
  const [convo, setConvo] = useState<ConvoFrame | null>(null);
  // Ola 17 (1.3.383): la propuesta de predeterminada que la respuesta
  // trae («esta palabra la usas mucho: ¿te dejo su pregunta a la
  // mano?») se descarta con «Ahora no» — y la caja lo recuerda solo
  // para ESTA respuesta: la próxima propuesta vuelve a ofrecerse.
  const [proposalOff, setProposalOff] = useState(false);
  // 1.3.445 (puerto de la Rama Agente, E1+E2): EL RELATO — cuando lo
  // escrito no es pregunta sino el cuento de un movimiento ya hecho
  // («pagué la luz 45»), la caja lo oye como relato: parseRelato
  // devuelve borradores con su eco, o la pregunta por el dato que
  // falta. La tarjeta propone y el toque dispone: «Asentarlo así»
  // asienta por relato-settle; «Ahora no» no toca el libro.
  const [relato, setRelato] = useState<RelatoResult | null>(null);
  // 1.3.446 · E3: el mismo oído, mirando adelante — si lo escrito no
  // es pregunta ni relato de lo ya hecho, puede ser la orden de
  // programar lo que viene («programa la luz 45 cada mes»): parsePrograma
  // devuelve borradores con su eco, o la pregunta por el dato que
  // falta. «Dejarlo programado» programa por programa-settle.
  const [programa, setPrograma] = useState<ProgramaResult | null>(null);
  // 1.3.447 · E4: los verbos de orden — archivar, corregir, buscar,
  // cambiar un ajuste. parseOrden devuelve la orden como borrador
  // con su eco (o lo encontrado, que no toca nada); «Hacerlo así»
  // ejecuta por orden-settle — y el ajuste de modo, por la mano del
  // proveedor (chooseMode), porque el modo tiene cerca de escritores.
  const [orden, setOrden] = useState<OrdenResult | null>(null);
  // 1.3.448 · E5: CREAR PREGUNTANDO — cuando el relato nombra algo
  // que el libro no conoce, la caja ofrece crearlo y pregunta solo
  // lo que falta (la cerca de conflictos va primero). El diálogo es
  // sin estado en el motor (crear.ts): la propuesta viaja aquí, en
  // la caja, y mientras una pregunta del diálogo espera, el turno
  // siguiente ES su respuesta. La creación nace por crear-settle al
  // «Crearla así»; el movimiento que la abrió queda ubicado.
  const [crear, setCrear] = useState<{ step: CrearStep; propuesta: CrearPropuesta | null; pending: RelatoDraft | null } | null>(null);
  // El texto crudo del relato vigente: de él sale el nombre nuevo
  // tal como el usuario lo escribió (rawNameFor), con su acento.
  const [relatoRaw, setRelatoRaw] = useState("");
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
    // 1.3.448 · E5: EL DIÁLOGO DE CREAR MANDA EN SU TURNO — si una
    // pregunta de crear preguntando espera respuesta, lo escrito ES
    // esa respuesta (crearRespuesta la lee; lo que no contesta la
    // pregunta la repite, no avanza a ciegas). «Olvídalo» lo cierra
    // sin crear nada. El diálogo vive tras su propio asiento.
    if (!pin && crear?.propuesta && has("advisor.crear")) {
      setCaps(false);
      setAsked(clean);
      setProposalOff(false);
      if (/^(olv[ií]dalo|cancel|cancela|d[eé]jalo|forget it|cancel it|stop)$/i.test(clean)) {
        setCrear(null);
        setText("");
        importToast({ text: L("Dejado así: no creo nada.", "Left as is: I won't create anything.") });
        return;
      }
      const step = crearRespuesta(session.ledger, lang, names, crear.propuesta, clean);
      if (step.kind === "usar" && crear.pending) {
        // «Esa misma»: el movimiento que esperaba queda ubicado en
        // la pieza existente — en el borrador abierto si sigue en
        // pantalla, o en su línea ya asentada.
        const pd = crear.pending;
        const catId = step.categoryId || session.ledger.structure.categories.find((c) => c.subs.some((s) => s.id === step.subId))?.id || "";
        if (relato?.kind === "drafts" && relato.drafts.includes(pd)) {
          setRelato({ ...relato, drafts: relato.drafts.map((d) => (d === pd ? { ...d, categoryId: catId, subId: step.subId } : d)) });
        } else {
          commit((s) => locatePendingLine(s, pd, catId, step.subId), L("Ubicar el movimiento", "Place the movement"));
        }
      }
      setCrear({ step, propuesta: step.kind === "pregunta" ? step.propuesta : null, pending: crear.pending });
      setText("");
      return;
    }
    setCaps(false);
    setRelato(null);
    setPrograma(null);
    setOrden(null);
    // 1.3.448: un borrador de creación ya cerrado el diálogo (sin
    // pregunta pendiente) se va con la pregunta nueva; con pregunta
    // pendiente, el turno era del diálogo y nunca se llega aquí.
    if (!crear?.propuesta) setCrear(null);
    setAsked(clean);
    setProposalOff(false);
    // 1.3.445 · LA COSTURA DEL RELATO: lo que no es pregunta puede ser
    // un relato — el cuento de lo ya hecho en el banco real (la idea
    // de Alvin). La puerta es la del propio clasificador de la casa:
    // si el texto es pregunta (aunque le falten los signos), va a la
    // cascada de siempre, intacta; si no lo es, el relato se intenta
    // primero y solo un «unknown» cae a la cascada. Un relato jamás
    // roba una pregunta, y una pregunta jamás se asienta.
    if (!pin && (has("advisor.relato") || has("advisor.orden"))) {
      const cls = classifyBankQuestion(clean);
      if (!cls.isQuestion) {
        if (has("advisor.relato")) {
          const rr = parseRelato(session.ledger, key, lang, names, clean, todayLocal());
          if (rr.kind !== "unknown") {
            setRelato(rr);
            setRelatoRaw(clean);
            setResult(null);
            setFrame(null);
            setConvo(null);
            setText("");
            return;
          }
          // 1.3.446 · E3: ni pregunta ni relato — ¿la orden de
          // programar? El mismo criterio: solo un «unknown» cae a la
          // cascada, y programar jamás roba una pregunta ni un relato.
          const pr = parsePrograma(session.ledger, key, lang, names, clean, todayLocal());
          if (pr.kind !== "unknown") {
            setPrograma(pr);
            setResult(null);
            setFrame(null);
            setConvo(null);
            setText("");
            return;
          }
        }
        // 1.3.447 · E4: ni relato ni programa — ¿una orden sobre lo
        // que ya existe (archivar, corregir, cambiar un ajuste)? El
        // verbo buscar tiene forma de pregunta y llega por la puerta
        // de reserva, tras la cascada (solo si el banco se abstiene).
        if (has("advisor.orden")) {
          const orr = parseOrden(session.ledger, key, lang, names, clean, todayLocal());
          if (orr.kind !== "unknown") {
            setOrden(orr);
            setResult(null);
            setFrame(null);
            setConvo(null);
            setText("");
            return;
          }
        }
        // 1.3.448 · E5, la puerta directa: «crea una categoría
        // jardinería» — ni relato ni programa ni orden lo conocen;
        // el nombre que sigue al verbo abre el diálogo de crear
        // (que pregunta conflicto, tipo y dónde, en ese orden).
        if (has("advisor.crear")) {
          const cm = clean.match(/^(?:crea|crear|create)\s+(?:una?\s+|la\s+|the\s+)?(?:categor[ií]a|subcategor[ií]a|category|subcategory)?\s*(?:llamada\s+|named\s+|called\s+)?["«"]?(.+?)["»"]?$/i);
          const nombre = cm?.[1]?.trim() ?? "";
          if (cm && nombre && !/\d/.test(nombre)) {
            const step = crearInicio(session.ledger, lang, names, nombre);
            setCrear({ step, propuesta: step.kind === "pregunta" ? step.propuesta : null, pending: null });
            setResult(null);
            setFrame(null);
            setConvo(null);
            setText("");
            return;
          }
        }
      }
    }
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
    // OLA 27 (Familia 9, F27-2): el seguimiento recibe LOS MISMOS
    // patrones que la cascada — su ctx ya no nace con learned vacío.
    const fu = pin ? null : answerFollowUp(session.ledger, key, lang, names, clean, ctx(), todayLocal(), frame, mode, patterns);
    // OLA 32 (Familia 4, Q32-4): la caja enhebra también su marco §20
    // vivo a la cascada — el turno del «¿por qué?» lo devuelve intacto
    // (porqueResult lo conserva), en vez de cerrarlo con r.frame ?? null.
    const r = fu ?? answerBankQuestion(session.ledger, key, lang, names, clean, ctx(), todayLocal(), pin, mode, patterns, convo, frame);
    // 1.3.447 · E4, la puerta de reserva del verbo buscar: «¿dónde
    // está…?» tiene forma de pregunta y el banco no la conoce — solo
    // si la cascada se abstiene (unknown) se oye como orden de
    // búsqueda (y, en general, como orden: «¿puedes cambiar el modo
    // a ritmo?» también llega por aquí). El banco tuvo su turno
    // primero; nada se le roba.
    if (!pin && r.kind === "unknown" && has("advisor.orden")) {
      const orr = parseOrden(session.ledger, key, lang, names, clean, todayLocal());
      if (orr.kind !== "unknown") {
        setOrden(orr);
        setResult(null);
        setText("");
        return;
      }
    }
    setResult(r);
    if (r.kind === "answer") {
      setFrame(r.frame ?? null);
      // El marco conversacional describe SIEMPRE la respuesta de la
      // pantalla: la del banco trae el suyo; la del seguimiento §20
      // lo renueva por la costura (convoAfterFollowUp) — si no, el
      // «¿por qué?» siguiente desplegaría la cuenta anterior.
      if (fu) setConvo(convoAfterFollowUp(session.ledger, key, names, convo, clean, todayLocal(), r));
      else setConvo(r.convo ?? null);
      if (r.forgetWord) {
        // OLA 27 (Familia 8, Q27-C1 de Cambios): el olvido RE-LEE el
        // almacén DENTRO de su commit, como sus hermanas (el toque del
        // alias aquí abajo y el pliegue de Ajustes) — la receta vieja
        // calculaba la lista desde la FOTO del render (`patterns`) y
        // la instalaba entera: todo patrón que el estado vivo hubiera
        // ganado después de la foto moría en ese commit. Y va por la
        // puerta guardada: si el estado vivo ya no trae la palabra, no
        // hay cambio y no se deja marco por un no-acto.
        commitGuarded((s) => {
          const live = askPatternsOf(s);
          const next = forgetAlias(live, r.forgetWord!);
          return next.length !== live.length ? { ...s, askPatterns: next } : null;
        }, L("Pregunta al Asesor", "Asked the Advisor"));
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
      // OLA 27 (Familia 8, Q27-C1 de Cambios): el aprendizaje de la
      // vuelta RE-LEE el almacén DENTRO de su commit, como sus
      // hermanas — la receta vieja calculaba desde la foto del render
      // y la instalaba entera, perdiendo todo patrón ganado después
      // de la foto. Por la puerta guardada: learnAlias devuelve la
      // misma referencia cuando rehúsa (dígitos, palabra corta) y una
      // lista nueva cuando aprende o re-confirma — sin cambio no hay
      // marco.
      commitGuarded((s) => {
        const live = askPatternsOf(s);
        const next = learnAlias(live, word, o.id, "account", "card-tap");
        return next !== live ? { ...s, askPatterns: next } : null;
      }, L("Pregunta al Asesor", "Asked the Advisor"));
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

  // 1.3.445: el toque que dispone del relato — el eco ya dijo lo que
  // se oyó; este toque lo asienta en el libro por la costura de
  // relato-settle (que jamás asienta un duplicado dos veces).
  function confirmRelato() {
    if (!session || relato?.kind !== "drafts") return;
    const drafts = relato.drafts;
    commit((s) => settleRelatoDrafts(s, drafts, lang), L("Asentar el relato", "Post the story"));
    importToast({ text: L("Quedó asentado en tu libro.", "It's posted in your book.") });
    setRelato(null);
  }

  // 1.3.446: el toque que dispone de la programación — el eco ya
  // dijo lo que se oyó; este toque lo deja programado en el libro
  // por la costura de programa-settle (que jamás programa un
  // duplicado dos veces).
  function confirmPrograma() {
    if (!session || programa?.kind !== "schedules") return;
    const drafts = programa.drafts;
    commit((s) => settleProgramaDrafts(s, drafts), L("Dejar programado", "Schedule it"));
    importToast({ text: L("Quedó programado en tu libro.", "It's scheduled in your book.") });
    setPrograma(null);
  }

  // 1.3.447 · E4: el SÍ de la orden. Archivar y corregir se ejecutan
  // por orden-settle dentro de su commit; el ajuste igual — salvo el
  // modo, que va por la mano del proveedor (chooseMode): su cerca de
  // escritores (modos293) no se toca.
  function confirmOrden() {
    if (!session || orden?.kind !== "order") return;
    const o = orden.order;
    if (o.op === "ajuste" && o.setting === "mode") {
      chooseMode(o.value as "esencial" | "ritmo" | "completo");
      importToast({ text: L("Quedó cambiado.", "It's changed.") });
    } else if (o.op === "archivar") {
      commit((s) => applyOrdenDraft(s, o), L("Archivar la línea", "Archive the line"));
      importToast({ text: L("Quedó en el Archivo.", "It's in the Archive now.") });
    } else if (o.op === "ajuste") {
      commit((s) => applyOrdenDraft(s, o), L("Cambiar el ajuste", "Change the setting"));
      importToast({ text: L("Quedó cambiado.", "It's changed.") });
    } else {
      commit((s) => applyOrdenDraft(s, o), L("Corregir la línea", "Correct the line"));
      importToast({ text: L("Quedó corregido en tu libro.", "It's corrected in your book.") });
    }
    setOrden(null);
  }

  // 1.3.448 · E5: la oferta de crear nace del relato — el primer
  // borrador fresco sin ubicar cuyo concepto no existe en la
  // estructura. crearDesdeRelato decide (null = nada que crear: el
  // concepto existe, o es un mover); el nombre sale del texto crudo
  // del usuario, con su ortografía.
  const crearOffer = (() => {
    if (!session || !relato || relato.kind !== "drafts" || crear) return null;
    const cand = relato.drafts.find((d) => !d.duplicate && !d.categoryId && d.op !== "mover" && d.op !== "abono" && d.op !== "prestamo" && !d.lentId && !d.loanId);
    if (!cand) return null;
    const step = crearDesdeRelato(session.ledger, lang, names, cand, rawNameFor(relatoRaw, cand.concept) ?? undefined);
    return step ? { step, draft: cand } : null;
  })();

  function startCrear(step: CrearStep, pending: RelatoDraft | null) {
    setCrear({ step, propuesta: step.kind === "pregunta" ? step.propuesta : null, pending });
  }

  // 1.3.448 · E5: el SÍ de la creación — la pieza nace por
  // crear-settle (que repite la cerca de conflictos al nacer y ubica
  // el movimiento que esperaba si ya se asentó); si su relato sigue
  // en pantalla, el borrador queda ubicado para su propio asiento.
  function confirmCrear() {
    if (!session || crear?.step.kind !== "draft") return;
    const { draft } = crear.step;
    const pending = crear.pending;
    // El id de nacimiento se fija AQUÍ (la forma de la casa: c-/s-)
    // para que el borrador abierto quede ubicado con el mismo id
    // que nace dentro del commit; si la cerca repetida encuentra el
    // nombre ya creado, la costura devuelve el existente y el
    // borrador se ubica en él por la misma vía del commit.
    const fixedId = `${draft.esSub ? "s" : "c"}-${uid().slice(0, 8)}`;
    commit((s) => applyCrearDraft(s, names, draft, pending, fixedId).state, L("Crear en tu estructura", "Create in your structure"));
    if (pending && relato?.kind === "drafts" && relato.drafts.includes(pending)) {
      const out = applyCrearDraft(session.ledger, names, draft, null, fixedId);
      if (out.categoryId) {
        setRelato({ ...relato, drafts: relato.drafts.map((d) => (d === pending ? { ...d, categoryId: out.categoryId, subId: out.subId } : d)) });
      }
    }
    importToast({ text: L(`«${draft.nombre}» ya está en tu estructura.`, `"${draft.nombre}" is in your structure now.`) });
    setCrear(null);
  }

  // La fija del sistema: «¿Qué puede hacer el asesor?» — su respuesta no pasa por
  // el motor de preguntas: es la descripción honesta generada del banco
  // en el momento (askpresets.capabilitiesText), rendida como tarjeta de
  // prosa. Corrección de Oscar (2026-11-21 18:46): nada de un folio de
  // preguntas — la honestidad misma es la respuesta.
  function showCaps() {
    setResult(null);
    setFrame(null);
    setAsked(FIXED_PRESET_Q[lang]);
    setCaps(true);
    setCapsOpen(-1);
    setText("");
  }

  // 1.3.456 (Oscar): EL LAPICITO de la tarjeta — lo dicho vuelve a la
  // caja tal como se escribió, para corregirlo sin reescribirlo, con
  // el cursor al final; la respuesta vigente se queda en pantalla
  // hasta que la versión editada se envíe.
  function editAsked() {
    if (!asked) return;
    setText(asked);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.scrollIntoView({ block: "nearest" });
    });
  }

  // 1.3.373 (Oscar, 2026-11-21 19:42): tocar la tarjeta de la pregunta
  // CIERRA la respuesta — la tarjeta se va, la respuesta se va, y las
  // preguntas sugeridas del banco reaparecen (viven solo sin respuesta).
  function closeAnswer() {
    setResult(null);
    setRelato(null);
    setPrograma(null);
    setOrden(null);
    setCrear(null);
    setFrame(null);
    setCaps(false);
    setAsked("");
    setCapsOpen(-1);
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
      {(result || caps || relato || programa || orden || crear) && asked ? (
        <div className="ask-q-wrap">
          <button type="button" className="ask-q" data-anchor="ask-q" onClick={closeAnswer} aria-label={L("Cerrar la respuesta", "Close the answer")}>
            <span className="ask-q-label">{L("Tu pregunta", "Your question")}</span>
            <span className="ask-q-text">{asked}</span>
          </button>
          <button type="button" className="ask-q-edit" data-anchor="ask-q-edit" onClick={editAsked} aria-label={L("Reeditar tu pregunta", "Re-edit your question")}>
            <Pencil size={14} />
          </button>
        </div>
      ) : null}
      {caps ? (
        <div className="ask-card" data-anchor="ask-card">
          {(() => { const c = capabilitiesText(lang); return (<>
            <p className="ask-verdict">{c.intro}</p>
            {/* 1.3.412 (Oscar): la descripción deja la lista interminable —
                cada grupo es una tarjeta desplegable, una abierta a la vez,
                todas cerradas al llegar. El texto no cambia: sale del banco. */}
            <div className="ask-caps">
              {c.groups.map((g, i) => (
                <div key={g.title} className="ask-caps-group">
                  <button type="button" className="ask-caps-head" aria-expanded={capsOpen === i} onClick={() => setCapsOpen((v) => (v === i ? -1 : i))}>
                    <span className="ask-caps-kicker">{g.title}</span>
                    <ChevronDown size={15} className="ask-caps-chev" aria-hidden />
                  </button>
                  {capsOpen === i ? (
                    <ul className="ask-caps-list">
                      {g.items.map((it) => (<li key={it}>{it}</li>))}
                    </ul>
                  ) : null}
                </div>
              ))}
              <div className="ask-caps-group">
                <button type="button" className="ask-caps-head" aria-expanded={capsOpen === c.groups.length} onClick={() => setCapsOpen((v) => (v === c.groups.length ? -1 : c.groups.length))}>
                  <span className="ask-caps-kicker">{c.notYetTitle}</span>
                  <ChevronDown size={15} className="ask-caps-chev" aria-hidden />
                </button>
                {capsOpen === c.groups.length ? (<>
                  <ul className="ask-caps-list">
                    {c.notYet.map((it) => (<li key={it}>{it}</li>))}
                  </ul>
                  <p className="ask-caps-note">{c.notYetNote}</p>
                </>) : null}
              </div>
            </div>
            <p className="ask-note">{c.limits}</p>
          </>); })()}
        </div>
      ) : null}
      {relato?.kind === "drafts" ? (
        <div className="ask-card" data-anchor="ask-relato">
          <p className="ask-verdict">{relato.echo.split("\n\n")[0]}</p>
          <div className="ask-relato-rows">
            {relato.drafts.map((d, i) => {
              // 1.3.463 · SIN REPETIR: cada tarjetita lleva arribita
              // su palabra (Gasto, Ingreso, Mover) y adentro, como
              // detalle, lo que no es repetición: la fecha cuando
              // no es hoy y la cuenta de origen o destino.
              const det: string[] = [];
              if (d.date !== todayLocal()) det.push(d.date);
              if (d.op === "gasto" && d.from) det.push(`${L("desde", "from")} ${d.from.label}`);
              if (d.op === "ingreso" && d.to) det.push(`${L("a", "to")} ${d.to.label}`);
              if (d.op === "abono" && d.from && d.srcMinor == null) det.push(`${L("desde", "from")} ${d.from.label}`);
              // 1.3.486 · EL SEGUNDO MONTO SE DECLARA EN LA TARJETITA:
              // el abono oído en otra moneda dice lo que salió de la
              // cuenta en su moneda (y ocupa el lugar del «desde»:
              // trae la cuenta consigo). El aviso del estimado NO va
              // en esta línea: es una instrucción de actuar y se
              // pinta en su propia superficie (.ask-relato-est), por
              // la ley de envoltorio — nada de texto suelto.
              if (d.op === "abono" && d.srcMinor != null) det.push(L(`salieron ${formatMoney(d.srcMinor, d.srcCurrency ?? d.currency, lang)}${d.from ? ` de ${d.from.label}` : ""}`, `${formatMoney(d.srcMinor, d.srcCurrency ?? d.currency, lang)} left${d.from ? ` ${d.from.label}` : ""}`));
              // 1.3.484 · EL PAGO DE VUELTA SE DECLARA EN LA TARJETITA:
              // el abono a un préstamo vivo dice lo que queda (o que
              // con esto queda saldado), para que el usuario lo vea
              // y lo frene en la confirmación si era otra cosa.
              if (d.lentId) det.push((d.debtLeftMinor ?? 0) <= 0
                ? L("abono a su préstamo: con esto queda saldado", "payment toward their loan: this settles it in full")
                : L(`abono a su préstamo: quedan ${formatMoney(d.debtLeftMinor ?? 0, d.debtCurrency ?? d.currency, lang)} pendientes`, `payment toward their loan: ${formatMoney(d.debtLeftMinor ?? 0, d.debtCurrency ?? d.currency, lang)} left`));
              if (d.loanId) det.push((d.debtLeftMinor ?? 0) <= 0
                ? L("abono a tu deuda: con esto queda saldada", "payment toward your debt: this settles it in full")
                : L(`abono a tu deuda: quedan ${formatMoney(d.debtLeftMinor ?? 0, d.debtCurrency ?? d.currency, lang)} pendientes`, `payment toward your debt: ${formatMoney(d.debtLeftMinor ?? 0, d.debtCurrency ?? d.currency, lang)} left`));
              return (
                <div key={i} className="ask-relato-item">
                  <span className="ask-relato-kind">{d.op === "mover" ? L("Mover", "Move") : d.op === "gasto" ? L("Gasto", "Expense") : d.op === "abono" ? L("Abono", "Payment") : d.op === "prestamo" ? (d.debtSide === "debo" ? L("Debo", "I owe") : L("Me deben", "Owed to me")) : L("Ingreso", "Income")}</span>
                  <div className={`ask-relato-row${d.duplicate ? " is-dup" : ""}`}>
                    <span className="ask-relato-main">
                      <span className="ask-relato-concept">{d.op === "abono" ? <CreditCard size={15} aria-hidden /> : null}<span>{d.op === "mover"
                        ? `${d.from?.label ?? ""} → ${d.to?.label ?? ""}`
                        : d.concept}</span></span>
                      <strong className="num">{formatMoney(d.amountMinor, d.currency, lang)}</strong>
                      {d.duplicate ? <span className="ask-relato-dup">{L("ya estaba asentado", "already posted")}</span> : null}
                    </span>
                    {det.length ? <span className="ask-relato-det">{det.join(" · ")}</span> : null}
                    {/* 1.3.486 · EL AVISO DEL ESTIMADO, EN SU SUPERFICIE
                        (Oscar, sobre la foto del banco: «Texto suelto» —
                        la ley de envoltorio manda que ningún texto vaya
                        suelto): el aviso de que el monto es estimado no
                        es un detalle más de la fila, es una instrucción
                        de actuar, y viaja en su propia superficie dentro
                        de la tarjetita, no fundido en la línea del
                        detalle. */}
                    {d.op === "abono" && d.estimated ? <span className="ask-relato-est">{L("El monto de la tarjeta es estimado con la tasa de tu libro: corrígelo si tu banco aplicó otra.", "The card amount is estimated at your book's rate: correct it if your bank applied a different one.")}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
          {relato.projected ? <p className="ask-note">{relato.projected}</p> : null}
          {/* 1.3.463 (segunda enmienda de Oscar, sobre su foto): la
              pregunta cierra en su propia línea, ABAJO de las
              tarjetitas y antes de los botones — como estaba. */}
          <p className="ask-verdict">{relato.echo.split("\n\n")[1] ?? ""}</p>
          {crearOffer ? (
            <div className="ask-offer">
              <button type="button" className="ask-create-btn" data-anchor="ask-crear-start" onClick={() => startCrear(crearOffer.step, crearOffer.draft)}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                {L(`Crear «${crearOffer.draft.concept}» en tu estructura`, `Create "${crearOffer.draft.concept}" in your structure`)}
              </button>
            </div>
          ) : null}
          <div className="ask-chips">
            {relato.drafts.some((d) => !d.duplicate) ? (
              <>
                <button type="button" className="ask-chip is-fixed" data-anchor="ask-relato-yes" onClick={confirmRelato}>{L("Asentarlo así", "Post it like this")}</button>
                <button type="button" className="ask-chip" data-anchor="ask-relato-no" onClick={() => setRelato(null)}>{L("Ahora no", "Not now")}</button>
              </>
            ) : (
              <button type="button" className="ask-chip is-fixed" data-anchor="ask-relato-ok" onClick={() => setRelato(null)}>{L("Entendido", "Got it")}</button>
            )}
          </div>
        </div>
      ) : null}
      {relato?.kind === "ask" ? (
        <div className="ask-card" data-anchor="ask-relato-ask">
          <p className="ask-verdict">{relato.question}</p>
        </div>
      ) : null}
      {programa?.kind === "schedules" ? (
        <div className="ask-card" data-anchor="ask-programa">
          <p className="ask-verdict">{programa.echo.split("\n\n")[0]}</p>
          <div className="ask-relato-rows">
            {programa.drafts.map((d, i) => (
              <div key={i} className="ask-relato-item">
                <span className="ask-relato-kind">{d.op === "gasto" ? L("Gasto", "Expense") : L("Ingreso", "Income")}</span>
                <div className={`ask-relato-row${d.duplicate ? " is-dup" : ""}`}>
                  <span className="ask-relato-main">
                    <span>{d.concept}</span>
                    {d.clase === "fijo" && d.amountMinor !== null
                      ? <strong className="num">{formatMoney(d.amountMinor, d.currency, lang)}</strong>
                      : <span className="ask-relato-dup">{L("solo recordatorio", "reminder only")}</span>}
                    {d.duplicate ? <span className="ask-relato-dup">{L("ya estaba programado", "already scheduled")}</span> : null}
                  </span>
                  <span className="ask-relato-det">{programaCadenceText(lang, d)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="ask-verdict">{programa.echo.split("\n\n")[1] ?? ""}</p>
          <div className="ask-chips">
            {programa.drafts.some((d) => !d.duplicate) ? (
              <>
                <button type="button" className="ask-chip is-fixed" data-anchor="ask-programa-yes" onClick={confirmPrograma}>{L("Dejarlo programado", "Schedule it")}</button>
                <button type="button" className="ask-chip" data-anchor="ask-programa-no" onClick={() => setPrograma(null)}>{L("Ahora no", "Not now")}</button>
              </>
            ) : (
              <button type="button" className="ask-chip is-fixed" data-anchor="ask-programa-ok" onClick={() => setPrograma(null)}>{L("Entendido", "Got it")}</button>
            )}
          </div>
        </div>
      ) : null}
      {programa?.kind === "ask" ? (
        <div className="ask-card" data-anchor="ask-programa-ask">
          <p className="ask-verdict">{programa.question}</p>
        </div>
      ) : null}
      {orden?.kind === "order" ? (
        <div className="ask-card" data-anchor="ask-orden">
          <p className="ask-verdict">{orden.echo}</p>
          <div className="ask-chips">
            {"alreadyArchived" in orden.order && orden.order.alreadyArchived ? (
              <button type="button" className="ask-chip is-fixed" data-anchor="ask-orden-ok" onClick={() => setOrden(null)}>{L("Entendido", "Got it")}</button>
            ) : (
              <>
                <button type="button" className="ask-chip is-fixed" data-anchor="ask-orden-yes" onClick={confirmOrden}>{L("Hacerlo así", "Do it like this")}</button>
                <button type="button" className="ask-chip" data-anchor="ask-orden-no" onClick={() => setOrden(null)}>{L("Ahora no", "Not now")}</button>
              </>
            )}
          </div>
        </div>
      ) : null}
      {orden?.kind === "found" ? (
        <div className="ask-card" data-anchor="ask-orden-found">
          <p className="ask-verdict">{orden.text}</p>
        </div>
      ) : null}
      {orden?.kind === "note" ? (
        <div className="ask-card" data-anchor="ask-orden-note">
          <p className="ask-verdict">{orden.text}</p>
        </div>
      ) : null}
      {orden?.kind === "ask" ? (
        <div className="ask-card" data-anchor="ask-orden-ask">
          <p className="ask-verdict">{orden.question}</p>
        </div>
      ) : null}
      {crear?.step.kind === "pregunta" ? (
        <div className="ask-card" data-anchor="ask-crear">
          <p className="ask-verdict">{crear.step.question}</p>
          <div className="ask-chips">
            <button type="button" className="ask-chip" data-anchor="ask-crear-no" onClick={() => setCrear(null)}>{L("Ahora no", "Not now")}</button>
          </div>
        </div>
      ) : null}
      {crear?.step.kind === "draft" ? (
        <div className="ask-card" data-anchor="ask-crear">
          <p className="ask-verdict">{crear.step.echo}</p>
          <div className="ask-chips">
            <button type="button" className="ask-chip is-fixed" data-anchor="ask-crear-yes" onClick={confirmCrear}>{L("Crearla así", "Create it like this")}</button>
            <button type="button" className="ask-chip" data-anchor="ask-crear-no" onClick={() => setCrear(null)}>{L("Ahora no", "Not now")}</button>
          </div>
        </div>
      ) : null}
      {crear?.step.kind === "usar" ? (
        <div className="ask-card" data-anchor="ask-crear-usar">
          <p className="ask-verdict">{crear.step.text}</p>
          <div className="ask-chips">
            <button type="button" className="ask-chip is-fixed" data-anchor="ask-crear-ok" onClick={() => setCrear(null)}>{L("Entendido", "Got it")}</button>
          </div>
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
          {/* LA FIGURA DE LA RESPUESTA (censo de figuras, 1.3.450):
              cuando el banco declara la figura de esta respuesta
              (1.3.449), la tarjeta la DIBUJA bajo sus piezas, con
              los números reales del libro — la brecha ya la nombra
              el veredicto; la figura enseña la forma. Sin asiento
              de modo: la respuesta no se castiga. */}
          {result.figure ? <BankFigureView figure={result.figure} fmt={fmt} /> : null}
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
          <button type="button" className="ask-chip is-house" data-anchor="ask-preset-fixed" onClick={showCaps}><Compass size={13} aria-hidden /> {FIXED_PRESET_Q[lang]}</button>
          {presets.map((p) => (
            <button key={p.id} type="button" className="ask-chip" data-anchor="ask-preset" onClick={() => ask(p.text)}>{p.text}</button>
          ))}
        </div>
      </div>
      {/* LAS SUGERENCIAS DEL BANCO (1.3.376): solo en reposo, solo
          TRES, con su propio rótulo — como «A la mano» lleva el suyo —
          y DEBAJO de las preguntas de la persona. El trío rota en cada
          entrada a la caja (askpresets.suggestionTrio). */}
      {!result && !caps && !relato && !programa && !orden && !crear ? (
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
