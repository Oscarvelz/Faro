/**
 * FARO — Captura Inteligente, Ola 1: la mesa de revisión universal
 * (brief BRIEF-OLA-1 §5-P2). Una sola mesa para todo lo que entra: filas
 * compactas con los tres estados (seguro, ámbar adivinado, rojo no
 * entendido) y toda duda con su herramienta en la misma fila (fallo D4).
 *
 * La mesa es UNA transacción: las correcciones viven en una copia local y
 * Guardar es un solo commit («Revisión») que parchea, crea las líneas de
 * las filas marcadas, retira esos borradores y aprende las correcciones —
 * Cancelar no toca nada. El detalle de una fila se edita con los campos
 * del editor de siempre (DayField, ThemeSelect, FreqPick, el selector de
 * casas del importador): no hay un segundo editor, y la línea solo nace
 * en el commit de la mesa — nunca hay línea y borrador gemelos.
 *
 * Forma simple (Esencial, capture.review): confirmar, corregir lo
 * esencial, descartar. Forma completa (Ritmo, capture.review-full):
 * reclasificar en bache y «recordar esta tienda así» sin salir de la mesa.
 *
 * Ola 21 (Q21-1): la mesa dice su foto — si otra mano resuelve parte
 * de la bandeja bajo la mesa abierta, las filas caídas se retiran de
 * la foto y se nombran en la hoja; la tarjeta de la bandeja ya no es
 * dueña de la vida de esta hoja (tray.tsx).
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, Trash2, X } from "lucide-react";
import { splitTarget, targets } from "@/lib/faro/bankbook";
import { freqPresetsOf } from "@/lib/faro/cadence";
import { applyTableEdits, changedDrafts, commitDrafts, draftToLine, draftTotals, dropDraft, fallenDrafts, learnFromSaved, patchDraft, rebornDrafts, validateDraft } from "@/lib/faro/drafts";
import { parseAmount } from "@/lib/faro/money";
import type { Draft, Line } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { FreqPick } from "./fit-pick";
import { Hint } from "./hint";
import { DayField, ThemeSelect } from "./line-form";
import { useFaro } from "./provider";
import "./scan.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const money = (minor: number | null) => (minor == null ? "" : (minor / 100).toFixed(2));
const sym = (c: string) => (c === "USD" ? "$" : "C$");
const fmtAmt = (minor: number, c: string) => `${sym(c)}${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MISSING_PHRASE: Record<string, [string, string]> = {
  concept: ["No encontré el concepto", "I couldn't find what it is"],
  amount: ["No encontré el monto", "I couldn't find the amount"],
  currency: ["No supe la moneda", "I couldn't tell the currency"],
  sign: ["No supe si entra o sale", "I couldn't tell if it comes in or goes out"],
  day: ["No encontré el día", "I couldn't find the day"],
};

const targetOf = (d: Draft) => `${d.book}|${d.cat ?? ""}|${d.sub ?? ""}`;

export function ReviewTable({ onClose }: { onClose: () => void }) {
  const { session, commitGuarded, key, lang, names, has } = useFaro();
  const ledger = session?.ledger;
  const full = has("capture.review-full");
  const tray = useMemo(() => (ledger?.drafts ?? []).filter((d) => d.kind === "line"), [ledger]);
  const [work, setWork] = useState<Draft[]>(() => tray);
  /* Ola 22 (G22-2): los originales DE MONTAJE — la bandeja tal como
   * estaba cuando la foto nació. La atribución del guardado compara
   * contra ESTE mapa, jamás contra la bandeja leída al guardar: esa
   * era la enfermedad (la corrección concurrente se le atribuía a la
   * persona y su guardado la deshacía en silencio). */
  const [mountOriginals] = useState(() => new Map(tray.map((d) => [d.id, d])));
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [fallen, setFallen] = useState<string[]>([]);
  const [reborn, setReborn] = useState<string[]>([]);
  const [changed, setChanged] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries(tray.map((d) => [d.id, !d.dupOf])));
  const [amountText, setAmountText] = useState<Record<string, string>>(() => Object.fromEntries(tray.map((d) => [d.id, money(d.amountMinor)])));
  const [remember, setRemember] = useState<Record<string, boolean>>({});
  const [batchHouse, setBatchHouse] = useState("");
  useLayer(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  /* Ola 21 (Q21-1): la mesa DICE su foto. La foto del montaje (work)
   * se re-sincroniza contra la bandeja viva por sustracción: cuando
   * otra mano resuelve un borrador bajo la mesa abierta (una adopción
   * lo trae ya resuelto), la fila cae de la foto y la hoja la NOMBRA
   * en la nota de caídas, con el concepto de la copia de la persona —
   * el nombre que ella reconoce. Las copias de las filas vivas jamás
   * se reponen desde lo vivo: lo tecleado se conserva tal cual, y la
   * corrección concurrente sigue mandando al guardar por la receta de
   * la ola 20. El botón cuenta solo las filas vivas, porque las
   * marcadas se derivan de la foto ya sustraída. Antes de esta cura la
   * mesa callaba en los dos desenlaces: si la bandeja se resolvía
   * entera, el guardia de la tarjeta desmontaba la hoja sin una
   * palabra (tray.tsx ya no es dueño de su vida); si se resolvía en
   * parte, el botón prometía «Guardar 2» y aterrizaba 1 en silencio. */
  useEffect(() => {
    const fell = fallenDrafts(work, tray, gone);
    if (!fell.length) return;
    const ids = new Set(fell.map((d) => d.id));
    setFallen((f) => [...f, ...fell.map((d) => d.concept || L(lang, "(sin concepto)", "(no concept)"))]);
    setWork((w) => w.filter((d) => !ids.has(d.id)));
    // Las marcas y los textos de las caídas mueren con su fila: checked
    // y amountText solo se leen a través de las filas que quedan.
  }, [tray, work, gone, lang]);

  /* Ola 23 (G23-3): la mesa distingue el RENACIMIENTO de la
   * corrección. Si el id murió y renació con otro cuerpo entero
   * mientras la persona editaba la foto (firma declarada en
   * drafts.ts: toda su mano bloqueada y vida ajena fuera de sus
   * campos), la fila se retira de la foto como una caída — sus
   * ediciones no aterrizan sobre un cuerpo que ella nunca vio y
   * Guardar no lo convierte — y la nota lo nombra como lo que es,
   * con el nombre del cuerpo VIVO: el nombre ajeno que tiene que
   * reconocer como ajeno, no su palabra. El cuerpo renacido queda
   * intacto en la bandeja para la próxima apertura de la mesa. */
  useEffect(() => {
    const born = rebornDrafts(work, tray, mountOriginals, gone);
    if (!born.length) return;
    const ids = new Set(born.map((d) => d.id));
    setReborn((r) => [...r, ...born.map((d) => d.concept || L(lang, "(sin concepto)", "(no concept)"))]);
    setWork((w) => w.filter((d) => !ids.has(d.id)));
  }, [tray, work, gone, lang, mountOriginals]);

  /* Ola 22 (G22-2): la mesa nombra también el cuerpo cambiado: si un
   * borrador vivo ya no es el de la foto en un campo que la persona no
   * editó (la otra mano corrigió, o el id renació con otro cuerpo), la
   * nota lo dice — con el concepto de la copia de la persona, el nombre
   * que ella reconoce — y el nombre queda dicho toda la sesión de la
   * hoja, como el de las caídas. Nombrar no bloquea nada: al guardar,
   * la corrección ajena manda en su campo (applyTableEdits). */
  useEffect(() => {
    const names = changedDrafts(work, tray, mountOriginals, gone).map((d) => d.concept || L(lang, "(sin concepto)", "(no concept)"));
    if (!names.length) return;
    setChanged((prev) => {
      const next = [...prev];
      for (const n of names) if (!next.includes(n)) next.push(n);
      return next.length === prev.length ? prev : next;
    });
  }, [tray, work, gone, lang, mountOriginals]);

  const houseOpts = useMemo(() => (ledger ? targets(ledger.structure, names) : []), [ledger, names]);
  const houseLabel = (d: Draft) => houseOpts.find((o) => o.value === targetOf(d))?.label
    ?? houseOpts.find((o) => o.value === `${d.book}|${d.cat ?? ""}|`)?.label
    ?? L(lang, "Sin casa", "No home");
  const dupLine = (d: Draft): Line | undefined => (d.dupOf && ledger
    ? Object.values(ledger.months).flatMap((m) => m.lines).find((l) => l.id === d.dupOf)
    : undefined);
  const presets = useMemo(() => (ledger ? freqPresetsOf(ledger) : []), [ledger]);

  const rows = work.filter((d) => !gone.has(d.id));
  const patch = (id: string, p: Partial<Draft>) => {
    setWork((w) => {
      const fake = { ...(ledger as NonNullable<typeof ledger>), drafts: w };
      return patchDraft(fake, id, p).drafts ?? w;
    });
  };
  // El texto del monto se queda crudo mientras se escribe (como en DraftCard);
  // el valor parseado viaja al borrador por el mismo patchDraft de la casa.
  const setAmount = (id: string, text: string) => {
    setAmountText((a) => ({ ...a, [id]: text }));
    patch(id, { amountMinor: parseAmount(text) });
  };
  // Ola 22 (G22-2): el «recordar» también se juzga contra el MONTAJE —
  // su interruptor nace encendido solo si LA PERSONA movió la casa en
  // esta mesa; compararlo contra la bandeja viva encendía el forzado
  // con la corrección de la otra mano y la casa aprendía de un guardado
  // que la persona no hizo.
  const rememberOn = (d: Draft) => remember[d.id] ?? (targetOf(d) !== targetOf(mountOriginals.get(d.id) ?? d));
  const checkedRows = rows.filter((d) => checked[d.id]);
  // El concepto vacío también bloquea: una línea sin nombre no nace (la
  // misma puerta del editor y del antiguo «ready» del escaneo).
  const redChecked = checkedRows.some((d) => validateDraft(d).missing.length > 0 || !d.concept.trim());
  const totals = draftTotals(checkedRows);
  const canSave = checkedRows.length > 0 && !redChecked;

  function save() {
    if (!ledger || !canSave || !has("capture.review")) return;
    /* Ola 20 (G20-1/§C + Q20-1): el guardado juzga contra LO VIVO, no
     * contra la foto del montaje. La mesa es una foto (work/checked no
     * se re-sincronizan): si otra mano ya guardó las filas marcadas,
     * esta receta no mueve nada y la puerta GUARDADA lo dice sin marco
     * — antes, la puerta ordinaria enmarcaba un «Revisión N» con cero
     * líneas, subía la revisión y apilaba un Deshacer vacío, y el
     * aprendizaje corría con parejas de la foto: la casa aprendía una
     * regla de un guardado que esta mesa nunca hizo. Y el asiento de
     * «recordar» se pregunta AL GUARDAR (fullNow), no al armar el
     * interruptor: si el modo cayó a Esencial con la mesa abierta, la
     * instrucción de Ritmo no se ejecuta en Esencial.
     *
     * Ola 22 (G22-2): y la ATRIBUCIÓN de los parches se juzga contra
     * los originales DE MONTAJE (mountOriginals), no contra la bandeja
     * de este instante. La receta anterior construía `originals` desde
     * la bandeja AL GUARDAR mientras `work` es la foto del montaje:
     * toda diferencia bajo un id vivo — incluida la corrección que la
     * otra mano hizo mientras tanto — se le atribuía a la persona, y
     * el parche la deshacía volviendo al valor de la foto (la
     * corrección concurrente moría en silencio; el borrador renacido
     * con otro cuerpo renacía como la foto). El paseo vive ahora en
     * drafts.ts (applyTableEdits): campo de la persona solo si su
     * copia difiere del montaje, aplicado solo donde lo vivo aún es
     * el valor de montaje; el tercer valor — la corrección ajena —
     * no se toca: la corrección manda. */
    const fullNow = has("capture.review-full");
    const ctx = { monthKey: key, structure: ledger.structure, lang };
    const forceWanted = new Map(work.map((d) => [d.id, rememberOn(d)]));
    const ids = checkedRows.map((d) => d.id);
    const goneIds = [...gone];
    let landed = 0;
    commitGuarded((s) => {
      let next = s;
      /* (1) Los parches: solo los campos que LA PERSONA editó en esta
       * mesa (su fila difiere de su original DE MONTAJE), aplicados
       * sobre el borrador VIVO y solo donde lo vivo aún es el valor
       * de montaje. Una corrección concurrente a otro campo sobrevive
       * — y también una al MISMO campo: si lo vivo ya es un tercer
       * valor, es de la otra mano y no se toca (C3, ahora sí: la foto
       * ya no repone ni el objeto entero ni el campo). Un borrador
       * que ya no vive no resucita. Los campos derivados
       * (unsure/missing/dupOf) no se parchan: los re-deriva
       * patchDraft, como siempre. La regla vive en applyTableEdits
       * (drafts.ts), clavada por la cerca de la ola 22 en composición
       * con la forma de llamada de producción. */
      next = applyTableEdits(next, work, mountOriginals, gone).state;
      /* (2) Los descartes marcados en la mesa (dropDraft se niega por
       * identidad si otra mano ya lo retiró). */
      for (const id of goneIds) next = dropDraft(next, id);
      /* (3) Las parejas del aprendizaje nacen de lo VIVO ya parchado:
       * el borrador tal como el libro lo guardaba al abrir la receta
       * (su casa sugerida) y la línea que ESTE guardado va a crear. Un
       * borrador que ya no vive no deja pareja: de lo que no aterriza
       * aquí, esta mesa no aprende nada. */
      const pairs: { draft: Draft; line: Line; force?: boolean }[] = [];
      for (const id of ids) {
        const liveNow = (next.drafts ?? []).find((x) => x.id === id);
        if (!liveNow) continue;
        const line = draftToLine(liveNow, ctx);
        if (!line) continue;
        const before = (s.drafts ?? []).find((x) => x.id === id) ?? liveNow;
        pairs.push({ draft: before, line, force: fullNow && !!forceWanted.get(id) });
      }
      landed = pairs.length;
      next = commitDrafts(next, ids, ctx);
      next = learnFromSaved(next, pairs);
      return next;
    }, () => L(lang, `Revisión ${landed}`, `Review ${landed}`));
    onClose();
  }

  const applyBatchHouse = () => {
    if (!batchHouse) return;
    const t = splitTarget(batchHouse);
    for (const d of checkedRows) patch(d.id, { book: t.kind, cat: t.categoryId, sub: t.subId });
    setBatchHouse("");
  };

  return createPortal(
    <div className="scn-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scn-sheet rev-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Revisar la bandeja", "Review the tray")}>
        <div className="scn-head">
          <span className="scn-badge" aria-hidden><ClipboardList /></span>
          <h3 className="lab-head">{L(lang, "Revisar", "Review")}<Hint topic="captura-mesa" /></h3>
          <button type="button" className="scn-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="scn-body">
          {fallen.length ? (
            <p className="rev-fallen" data-anchor="rev-fallen" role="status">
              {L(lang, `Ya no están en la bandeja: ${fallen.join(", ")}.`, `No longer in the tray: ${fallen.join(", ")}.`)}
            </p>
          ) : null}
          {changed.length ? (
            <p className="rev-fallen" data-anchor="rev-changed" role="status">
              {L(lang, `Cambió mientras tanto: ${changed.join(", ")}.`, `Changed meanwhile: ${changed.join(", ")}.`)}
            </p>
          ) : null}
          {reborn.length ? (
            <p className="rev-fallen" data-anchor="rev-reborn" role="status">
              {L(lang, `Reemplazado mientras tanto: ${reborn.join(", ")}.`, `Replaced meanwhile: ${reborn.join(", ")}.`)}
            </p>
          ) : null}
          {full && checkedRows.length > 0 ? (
            <div className="rev-batch">
              <span className="rev-batch-lab">{L(lang, "Casa para las marcadas", "Home for the checked rows")}</span>
              <ThemeSelect value={batchHouse} onChange={setBatchHouse} options={[{ value: "", label: L(lang, "Elegir casa…", "Choose a home…") }, ...houseOpts]} />
              <button type="button" className="btn secondary rev-batch-go" disabled={!batchHouse} onClick={applyBatchHouse}>{L(lang, "Aplicar", "Apply")}</button>
            </div>
          ) : null}
          {rows.map((d) => {
            const v = validateDraft(d);
            const missing = d.concept.trim() ? v.missing : ["concept", ...v.missing];
            const un = (f: string) => (d.unsure.includes(f) ? " is-unsure" : "");
            const dup = dupLine(d);
            const recur = d.book === "subscription" || d.book === "expense-fixed";
            return (
              <div key={d.id} className={`rev-row${checked[d.id] ? "" : " is-off"}${missing.length ? " is-missing" : ""}`} data-anchor="rev-row">
                <div className="rev-r1">
                  <button type="button" role="switch" className="scn-switch" aria-checked={!!checked[d.id]} aria-label={L(lang, "Incluir", "Include")} onClick={() => setChecked((c) => ({ ...c, [d.id]: !c[d.id] }))}><i /></button>
                  <input className={`field rev-concept${un("concept")}${missing.includes("concept") ? " is-missing-f" : ""}`} value={d.concept} placeholder={L(lang, "Concepto", "Concept")} aria-label={L(lang, "Concepto", "Concept")} onChange={(e) => patch(d.id, { concept: e.target.value })} />
                  <button type="button" className="scn-del" aria-label={L(lang, "Descartar", "Discard")} onClick={() => setGone((g) => new Set(g).add(d.id))}><Trash2 /></button>
                </div>
                <div className="rev-r2">
                  <span className={`scn-amt${un("amount")}${missing.includes("amount") ? " is-missing-f" : ""}`}>
                    <button type="button" className="scn-cur" aria-label={d.currency ?? L(lang, "Moneda", "Currency")} onClick={() => patch(d.id, { currency: d.currency === "USD" ? "NIO" : "USD" })}>{d.currency === "NIO" ? "C$" : "$"}</button>
                    <input className="field num" inputMode="decimal" value={amountText[d.id] ?? ""} placeholder="0.00" aria-label={L(lang, "Monto", "Amount")} onChange={(e) => setAmount(d.id, e.target.value)} />
                  </span>
                  <span className={`scn-day${un("date")}${missing.includes("day") ? " is-missing-f" : ""}`}><DayField value={d.day} onChange={(v) => patch(d.id, { day: v })} /></span>
                  {missing.includes("sign") ? (
                    <span className="rev-sign" role="group" aria-label={L(lang, "Entra o sale", "In or out")}>
                      <button type="button" className={d.sign === "in" ? "is-on" : ""} onClick={() => patch(d.id, { sign: "in" })}>{L(lang, "Entra", "In")}</button>
                      <button type="button" className={d.sign === "out" ? "is-on" : ""} onClick={() => patch(d.id, { sign: "out" })}>{L(lang, "Sale", "Out")}</button>
                    </span>
                  ) : null}
                  {recur && full ? <span className={`scn-freq${un("cadence")}`}><FreqPick value={d.cadence || "monthly"} presets={presets} onChange={(v) => patch(d.id, { cadence: v })} /></span> : null}
                </div>
                <div className="rev-r3">
                  {full
                    ? <span className="rev-house"><ThemeSelect value={targetOf(d)} onChange={(v) => { const t = splitTarget(v); patch(d.id, { book: t.kind, cat: t.categoryId, sub: t.subId }); }} options={[{ value: `${d.book}||`, label: L(lang, "Sin casa", "No home") }, ...houseOpts]} /></span>
                    : <span className="rev-house is-static">{houseLabel(d)}</span>}
                  <input className="field rev-note" value={d.note} placeholder={L(lang, "Nota", "Note")} aria-label={L(lang, "Nota", "Note")} onChange={(e) => patch(d.id, { note: e.target.value })} />
                </div>
                {full ? (
                  <label className="rev-remember">
                    <button type="button" role="switch" aria-checked={rememberOn(d)} className="scn-switch is-small" aria-label={L(lang, "Recordar esta tienda así", "Remember this store this way")} onClick={() => setRemember((r) => ({ ...r, [d.id]: !rememberOn(d) }))}><i /></button>
                    <span>{L(lang, "Recordar esta tienda así", "Remember this store this way")}</span>
                  </label>
                ) : null}
                {missing.map((f) => (
                  <p key={f} className="rev-missing">{L(lang, MISSING_PHRASE[f]![0], MISSING_PHRASE[f]![1])}</p>
                ))}
                {dup ? <p className="rev-dup">{L(lang, "Ya está en tus libros", "Already in your books")}: {dup.concept} · {fmtAmt(dup.amountMinor, dup.currency)}</p> : null}
              </div>
            );
          })}
          {!rows.length ? <p className="scn-empty">{L(lang, "La bandeja está vacía.", "The tray is empty.")}</p> : null}
        </div>
        <div className="scn-foot rev-foot">
          <div className="rev-totals" aria-live="polite">
            {totals.map((r) => (
              <span key={r.currency} className="rev-total">
                {r.outMinor ? <>{L(lang, "Salen", "Out")} <b>{fmtAmt(r.outMinor, r.currency)}</b></> : null}
                {r.outMinor && r.inMinor ? " · " : null}
                {r.inMinor ? <>{L(lang, "Entran", "In")} <b>{fmtAmt(r.inMinor, r.currency)}</b></> : null}
              </span>
            ))}
          </div>
          <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
          <button type="button" className="btn" disabled={!canSave} onClick={save}>{L(lang, `Guardar ${checkedRows.length}`, `Save ${checkedRows.length}`)}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
