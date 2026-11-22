import { useCallback, useEffect, useState } from "react";
import { Eye, Send, UserPlus, X } from "lucide-react";
import { useFaro } from "./provider";
import { canInvite, emptyMesa, mesaKey, plausibleEmail, previewFor, previewStale, type MesaState, type SharePreview, type ShareScope } from "@/lib/faro/share";
import { cancelInvite, inviteMember, listMemberships, removeMember, type Membership } from "@/spa/cloud";
import "./share-mesa.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

const CAN_DO: Record<string, [string, string]> = {
  "note-lines": ["Anotar líneas en las áreas compartidas, con su firma.", "Note lines in the shared areas, under their signature."],
  "sign-lines": ["Lo que anote queda firmado con su nombre.", "What they note stays signed with their name."],
  "own-drafts": ["Preparar borradores en la bandeja del libro.", "Prepare drafts in the book's tray."],
  "read-lines": ["Leer las líneas de las áreas compartidas.", "Read the lines of the shared areas."],
  "advisor-own-world": ["Su Asesor calcula solo sobre lo que ve: este mundo compartido y su propio libro.", "Their Advisor computes only over what they see: this shared world and their own book."],
};
const NEVER: Record<string, [string, string]> = {
  settings: ["Tus ajustes.", "Your settings."],
  audit: ["Tu registro de actividad.", "Your activity log."],
  drafts: ["Tus borradores sin guardar.", "Your unsaved drafts."],
};

/** La cuenta de la vista previa, en palabras: la misma que se ve al
 * invitar y al verificar «qué compartí» (una sola función la compone). */
function PreviewBody({ pv, names, lang }: { pv: SharePreview; names: { cat: (id: string) => string }; lang: string }) {
  return (
    <div className="sm-prev">
      <div className="sm-group">
        <span className="sm-glab">{L(lang, "Verá", "They will see")}</span>
        {pv.seesCats.map((id) => <span key={id} className="sm-line">{names.cat(id)}</span>)}
      </div>
      <div className="sm-group">
        <span className="sm-glab">{L(lang, "Podrá", "They can")}</span>
        {pv.canDo.map((k) => <span key={k} className="sm-line">{L(lang, ...(CAN_DO[k] ?? [k, k]))}</span>)}
      </div>
      <div className="sm-group">
        <span className="sm-glab">{L(lang, "No verá", "They will not see")}</span>
        {pv.notSeesCats.map((id) => <span key={id} className="sm-line">{names.cat(id)}</span>)}
        {pv.neverTravels.map((k) => <span key={k} className="sm-line">{L(lang, ...(NEVER[k] ?? [k, k]))}</span>)}
      </div>
      <div className="sm-group">
        <span className="sm-glab">{L(lang, "Quién financia cada área", "Who funds each area")}</span>
        {pv.fundedBy.map((f) => (
          <span key={f.cat} className="sm-line">{names.cat(f.cat)} · {L(lang, "tus cuentas", "your accounts")}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Ajustes → «El libro compartido» (Pieza C5, 1.3.395; brief
 * BRIEF-LIBRO-COMPARTIDO §C5). LA MESA: tres pasos — quién, alcance,
 * papel — corregibles en cualquier orden, sin asistente lineal. La
 * invitación solo existe tras LA VISTA PREVIA POR LOS OJOS DEL OTRO:
 * el botón de invitar vive dentro de la tarjeta de la vista previa y
 * la puerta es canInvite (la llave ata el trato exacto; cambiar un
 * paso la invalida). Debajo, «Quiénes están en este libro»: cada
 * membresía con su «qué compartí» — la misma cuenta de la vista
 * previa, verificable después. Administrar la membresía es asiento
 * de Ritmo (books.share-admin); sin el asiento, la hoja no nace.
 * Si la nube no responde (los papeles del servidor aún no están), la
 * mesa compone y previsualiza igual — la verdad local no depende del
 * servidor — y el envío lo dice sin fingir.
 */
export function ShareMesa() {
  const { lang, session, names, has, confirm } = useFaro();
  const [mesa, setMesa] = useState<MesaState>(emptyMesa);
  const [members, setMembers] = useState<Membership[] | null | undefined>(undefined);
  const [openShared, setOpenShared] = useState<string | null>(null);
  const [note, setNote] = useState<"sent" | "failed" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { setMembers(await listMemberships()); }, []);
  useEffect(() => { void load(); }, [load]);

  if (!has("books.share-admin") || !session) return null;
  const ledger = session.ledger;
  const cats = ledger.structure.categories;
  const key = mesaKey(mesa);
  const dealComplete = key !== null && plausibleEmail(mesa.email);
  const previewCurrent = dealComplete && mesa.previewed === key;
  const pv = dealComplete && mesa.scope && mesa.role ? previewFor(ledger, mesa.scope, mesa.role) : null;

  const setScopeAll = () => setMesa((m) => ({ ...m, scope: { all: true } }));
  const toggleCat = (id: string) => setMesa((m) => {
    const cur = m.scope && "cats" in m.scope ? m.scope.cats : [];
    const next = cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id];
    return { ...m, scope: next.length ? { cats: next } : null };
  });
  const scopeIsAll = !!mesa.scope && "all" in mesa.scope && mesa.scope.all;
  const scopeCats = mesa.scope && "cats" in mesa.scope ? mesa.scope.cats : [];

  const send = async () => {
    if (!canInvite(mesa) || !mesa.scope || !mesa.role || busy) return;
    setBusy(true);
    const id = await inviteMember(mesa.email, mesa.scope as ShareScope, mesa.role);
    setBusy(false);
    if (id) { setNote("sent"); setMesa(emptyMesa); void load(); }
    else setNote("failed");
  };

  const act = (m: Membership) => {
    const isPending = m.status === "pending";
    confirm({
      title: isPending ? L(lang, "¿Cancelar esta invitación?", "Cancel this invitation?") : L(lang, "¿Retirar a esta persona del libro?", "Remove this person from the book?"),
      body: isPending
        ? L(lang, "La invitación deja de valer. Podrás invitarla de nuevo cuando quieras.", "The invitation stops working. You can invite them again whenever you like.")
        : L(lang, "Deja de ver el libro en su próxima sincronización. Lo que anotó queda firmado en el libro.", "They stop seeing the book at their next sync. What they noted stays signed in the book."),
      yes: isPending ? L(lang, "Cancelar invitación", "Cancel invitation") : L(lang, "Retirar", "Remove"),
      danger: true,
      run: () => { void (async () => { if (isPending) await cancelInvite(m.id); else await removeMember(m.id); void load(); })(); },
    });
  };

  return (
    <div className="sm-root">
      <p className="sm-intro">{L(lang, "Invita a alguien a este libro. Antes de enviar nada, mirarás el libro por sus ojos.", "Invite someone to this book. Before anything is sent, you will look at the book through their eyes.")}</p>

      <div className="sm-steps">
        <div className="sm-step">
          <span className="sm-slab">{L(lang, "1 · Quién", "1 · Who")}</span>
          <input
            className="sm-input" data-anchor="share-email" type="email" inputMode="email" autoComplete="email"
            placeholder={L(lang, "su correo", "their email")}
            value={mesa.email}
            onChange={(e) => { setMesa((m) => ({ ...m, email: e.target.value })); setNote(null); }}
          />
          {mesa.email.trim() && !plausibleEmail(mesa.email) ? <span className="sm-warn">{L(lang, "Ese correo no parece completo.", "That email does not look complete.")}</span> : null}
        </div>

        <div className="sm-step">
          <span className="sm-slab">{L(lang, "2 · Qué verá", "2 · What they will see")}</span>
          <div className="sm-opts">
            <button type="button" data-anchor="share-scope-all" className={scopeIsAll ? "sm-opt is-on" : "sm-opt"} onClick={setScopeAll}>{L(lang, "Todo el libro", "The whole book")}</button>
            <button type="button" data-anchor="share-scope-cats" className={mesa.scope && "cats" in mesa.scope ? "sm-opt is-on" : "sm-opt"} onClick={() => setMesa((m) => ({ ...m, scope: scopeCats.length ? { cats: scopeCats } : { cats: [] } }))}>{L(lang, "Solo estas áreas", "Only these areas")}</button>
          </div>
          {mesa.scope && "cats" in mesa.scope ? (
            <div className="sm-cats">
              {cats.map((c) => (
                <button key={c.id} type="button" className={scopeCats.includes(c.id) ? "sm-cat is-on" : "sm-cat"} onClick={() => toggleCat(c.id)}>{names.cat(c.id)}</button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="sm-step">
          <span className="sm-slab">{L(lang, "3 · Su papel", "3 · Their role")}</span>
          <div className="sm-opts">
            <button type="button" data-anchor="share-role-note" className={mesa.role === "note" ? "sm-opt is-on" : "sm-opt"} onClick={() => setMesa((m) => ({ ...m, role: "note" }))}>{L(lang, "Puede anotar", "Can note")}</button>
            <button type="button" data-anchor="share-role-view" className={mesa.role === "view" ? "sm-opt is-on" : "sm-opt"} onClick={() => setMesa((m) => ({ ...m, role: "view" }))}>{L(lang, "Solo mira", "View only")}</button>
          </div>
        </div>
      </div>

      <div className="sm-card">
        <span className="sm-slab"><Eye aria-hidden /> {L(lang, "La vista previa, por sus ojos", "The preview, through their eyes")}</span>
        {!dealComplete ? (
          <p className="sm-note">{L(lang, "Completa los tres pasos: la invitación solo existe después de mirar.", "Complete the three steps: the invitation only exists after you look.")}</p>
        ) : previewCurrent && pv ? (
          <>
            <PreviewBody pv={pv} names={names} lang={lang} />
            <button type="button" className="sm-send" data-anchor="share-send" disabled={busy} onClick={() => void send()}>
              <Send aria-hidden /> {L(lang, `Invitar a ${mesa.email.trim()}`, `Invite ${mesa.email.trim()}`)}
            </button>
          </>
        ) : (
          <>
            {previewStale(mesa) ? <p className="sm-note">{L(lang, "El trato cambió desde la última vista: mírala otra vez.", "The deal changed since you last looked: look again.")}</p> : null}
            <button type="button" className="sm-send" data-anchor="share-preview" onClick={() => setMesa((m) => ({ ...m, previewed: mesaKey(m) }))}>
              <Eye aria-hidden /> {L(lang, "Ver la vista previa", "See the preview")}
            </button>
          </>
        )}
        {note === "sent" ? <p className="sm-ok">{L(lang, "Invitación enviada. Vale por 30 días y solo la puede aceptar la sesión de ese correo.", "Invitation sent. It lasts 30 days and only that email's session can accept it.")}</p> : null}
        {note === "failed" ? <p className="sm-warn">{L(lang, "No se pudo enviar: la nube no respondió. La invitación no salió; inténtalo de nuevo.", "It could not be sent: the cloud did not answer. The invitation did not leave; try again.")}</p> : null}
      </div>

      <div className="sm-card">
        <span className="sm-slab"><UserPlus aria-hidden /> {L(lang, "Quiénes están en este libro", "Who is in this book")}</span>
        {members === undefined ? <p className="sm-note">{L(lang, "Leyendo…", "Reading…")}</p> : null}
        {members === null ? <p className="sm-note">{L(lang, "La lista no se pudo leer ahora. La mesa sigue componiendo: la verdad de lo que compartes se decide aquí, no en la nube.", "The list could not be read right now. The mesa still composes: what you share is decided here, not in the cloud.")}</p> : null}
        {members && members.length === 0 ? <p className="sm-note">{L(lang, "Nadie más está en este libro.", "No one else is in this book.")}</p> : null}
        {members?.map((m) => {
          const mpv = previewFor(ledger, m.scope, m.role);
          return (
            <div key={m.id} className="sm-member">
              <div className="sm-mrow">
                <span className="sm-memail">{m.email}</span>
                <span className="sm-mtag">{m.status === "pending" ? L(lang, "Invitación pendiente", "Invitation pending") : L(lang, "En el libro", "In the book")} · {m.role === "note" ? L(lang, "anota", "notes") : L(lang, "solo mira", "view only")}</span>
                <button type="button" className="sm-mini" data-anchor="share-what" onClick={() => setOpenShared(openShared === m.id ? null : m.id)}>{L(lang, "Qué compartí", "What I shared")}</button>
                <button type="button" className="sm-mini is-danger" data-anchor="share-remove" aria-label={L(lang, "Cancelar o retirar", "Cancel or remove")} onClick={() => act(m)}><X aria-hidden /></button>
              </div>
              {openShared === m.id ? <PreviewBody pv={mpv} names={names} lang={lang} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
