/**
 * El motor de selección de la casa (Oscar, 2026-11-13): UNA sola máquina para tres
 * casas — el río del Historial (ocultar lo elegido), las líneas del Archivo (borrar
 * lo elegido tras la puerta escrita) y las listas de Libros (borrar o mover lo
 * elegido). Sostener una fila entra al modo; tocar marca y desmarca; la barra del
 * modo se ANUNCIA sola — su conteo, sus verbos y su salida — porque un usuario
 * frío que entra por accidente tiene que entender qué pasó (principio de Oscar,
 * 2026-11-13). Atrás/ESC o la ✕ salen sin aplicar nada: salir del modo nunca
 * mueve dinero; solo los verbos de la barra lo mueven, y cada uno hereda las
 * guardas del verbo individual, nunca más débil.
 *
 * La marca y el marco hablan la gramática de selección de la casa (1.3.199):
 * marco completo en el color PROPIO de la fila (la variable --selc que cada
 * superficie ya conoce), el lavado duplicado sobre ese color y la barra inferior;
 * la marca es el círculo que se llena con ese mismo color.
 */
import { useCallback, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { useFaro } from "./provider";
import "./selection.css";

export function useSelection() {
  const [mode, setMode] = useState(false);
  const [sel, setSel] = useState<ReadonlySet<string>>(new Set());
  const enter = useCallback((id: string) => {
    setMode(true);
    setSel(new Set([id]));
  }, []);
  const toggle = useCallback((id: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const exit = useCallback(() => {
    setMode(false);
    setSel(new Set());
  }, []);
  // Atrás/ESC sale del modo SIN aplicar (la capa de la casa, back.ts): la
  // selección es una habitación, y salir de una habitación no mueve dinero.
  useLayer(mode, exit);
  return { mode, sel, count: sel.size, enter, toggle, exit };
}

/** La marca de la fila: círculo hueco en reposo; lleno de su color al marcar. */
export function SelMark({ on }: { on: boolean }) {
  return (
    <span className={`sel-mark${on ? " is-on" : ""}`} aria-hidden>
      {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

/** La barra que anuncia el modo: conteo, verbos de la casa anfitriona y salida. */
export function SelectionBar({ count, children, onExit }: { count: number; children: ReactNode; onExit: () => void }) {
  const { t } = useFaro();
  return (
    <div className="sel-bar" role="toolbar" aria-label={t("sel.mode")} data-testid="sel-bar">
      <span className="sel-count num">{t(count === 1 ? "sel.count.one" : "sel.count").replace("{n}", String(count))}</span>
      <span className="sel-verbs">{children}</span>
      <button type="button" className="sel-x" onClick={onExit} aria-label={t("sel.exit")} data-testid="sel-exit">
        <X className="size-4" />
      </button>
    </div>
  );
}
