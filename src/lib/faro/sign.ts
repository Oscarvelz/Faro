/* ═══ AUTORÍA Y FIRMAS DEL LIBRO COMPARTIDO (Pieza C4, 1.3.393).
 *
 * La ley fallada (F-C3): cada línea de un libro compartido dice quién
 * la anotó; lo que Faro resuelve solo firma «Faro», con el acto
 * nombrado en la actividad; y las firmas jamás se reescriben — el
 * nombre que viaja en la línea es el de la Pieza 0 CONGELADO al
 * anotar: renombrarse después no toca ninguna firma vieja, y salir
 * del libro tampoco.
 *
 * · La firma nace al guardar en la mesa (commitDrafts con autor) y en
 *   cada puerta que crea líneas dentro de una sesión compartida.
 * · La actividad es CONSULTABLE y simétrica — este módulo la lee del
 *   libro (auditoría firmada + las lápidas, que son los hechos de
 *   borrado) — y jamás emite alertas: no existe aquí ninguna noción
 *   de aviso en vivo de lo que el otro anota.
 * · Sin firma (libros personales y viejos) no se inventa ninguna: el
 *   lector devuelve null y las superficies no pintan nada. */
import type { AuditEntry, LedgerState, Line } from "./types";
import { tombstonesOf } from "./fuse.ts";

/** La cuenta centinela de los actos automáticos: firman «Faro». */
export const FARO_BY = "faro";

export interface Author {
  /** La cuenta que firma (o FARO_BY para los actos automáticos). */
  id: string;
  /** Su nombre de la Pieza 0, tal como está al firmar. */
  name: string;
}

export const FARO_AUTHOR: Author = { id: FARO_BY, name: "Faro" };

/** Estampar la firma en una línea: la cuenta y su nombre, congelado. */
export function stampLine(line: Line, author: Author): Line {
  return { ...line, by: author.id, byName: author.name.trim() };
}

/** Estampar la firma en un acto de la auditoría. */
export function stampAudit(entry: AuditEntry, author: Author): AuditEntry {
  return { ...entry, by: author.id, byName: author.name.trim() };
}

export type Signature =
  | { kind: "faro" }
  | { kind: "person"; name: string | null };

/** La firma de una línea o un acto, leída con desconfianza: null si
 * no hay cuenta firmante; la persona sin nombre congelado devuelve
 * name=null y la superficie pinta su forma serena («Un miembro»). */
export function signatureOf(x: { by?: unknown; byName?: unknown }): Signature | null {
  if (typeof x.by !== "string" || x.by === "") return null;
  if (x.by === FARO_BY) return { kind: "faro" };
  return { kind: "person", name: typeof x.byName === "string" && x.byName.trim() !== "" ? x.byName : null };
}

/** El nombre visible de una firma: «Faro», el nombre congelado, o la
 * forma serena para quien firmó sin nombre elegido. */
export function signatureName(sig: Signature, lang: "es" | "en"): string {
  if (sig.kind === "faro") return "Faro";
  return sig.name ?? (lang === "en" ? "A member" : "Un miembro");
}

export interface ActivityFact {
  id: string;
  at: string;
  /** "act" = un acto de la auditoría; "deletion" = una lápida: el
   * hecho firmado de que una línea se borró (nunca la línea). */
  kind: "act" | "deletion";
  detail: string;
  signature: Signature | null;
}

/** La actividad del libro, consultable: los actos firmados de la
 * auditoría y los hechos de borrado, del más reciente al más viejo.
 * Es una lectura — no alerta, no empuja, no cuenta en vivo. */
export function activityOf(state: LedgerState): ActivityFact[] {
  const facts: ActivityFact[] = [];
  for (const a of Array.isArray(state.audit) ? state.audit : []) {
    if (!a || typeof a.at !== "string") continue;
    facts.push({ id: a.id, at: a.at, kind: "act", detail: a.detail, signature: signatureOf(a) });
  }
  for (const t of tombstonesOf(state)) {
    facts.push({
      id: `stone-${t.id}`,
      at: t.at,
      kind: "deletion",
      detail: "deleted",
      signature: signatureOf({ by: t.by, byName: undefined }),
    });
  }
  return facts.sort((a, z) => (a.at < z.at ? 1 : a.at > z.at ? -1 : 0));
}
