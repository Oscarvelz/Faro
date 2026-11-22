/* ═══ LA FIRMA (Pieza C4 del libro compartido, 1.3.393): el único
 * componente que pinta una firma, con el único tratamiento
 * (signature.css) — en líneas, en el Historial y en los Folios se ve
 * la misma firma. Sin firma no pinta nada. */
import { signatureName, signatureOf } from "@/lib/faro/sign";
import "./signature.css";

export function Signature({ by, byName, lang, bubble }: { by?: string; byName?: string; lang: "es" | "en"; bubble?: boolean }) {
  const sig = signatureOf({ by, byName });
  if (!sig) return null;
  return (
    <span className={`sig${sig.kind === "faro" ? " is-faro" : ""}${bubble ? " is-bubble" : ""}`} data-sig={sig.kind}>
      {signatureName(sig, lang)}
    </span>
  );
}
