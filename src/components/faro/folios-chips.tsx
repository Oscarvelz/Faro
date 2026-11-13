/**
 * Las pastillas de Folios (Oscar, 2026-11-13): Historial y Archivo saltan de la una
 * a la otra como Estudio y Asesor — con sus propios chips, que no se cruzan con
 * ningún otro sistema de chips de la casa (la lente del Historial, dentro de su
 * pantalla, es otra cosa y lleva aria-pressed). Este componente es el par, tal cual
 * el modelo de shell.tsx: .seg.is-follow.is-pair con su píldora seguidora, el icono
 * y la etiqueta de cada sección (nav.historial / nav.archivo), role=tab.
 *
 * Las dos pastillas NO comparten datos: el chip solo cambia de cuarto. Lo que
 * descansa en el Archivo jamás entra en el río del Historial (descanso.ts lo
 * garantiza en la fuente); compartir techo de navegación no es compartir lectura.
 *
 * La píldora se coloca con el mismo cálculo del par de Estudio (SectionView):
 * medir el botón con aria-current="page" y trasladarla hasta él, en fase de
 * layout y otra vez cuando las fuentes asientan (1.3.206).
 *
 * EL ASIENTO ES LA MITAD DEL MECANISMO (1.3.249, Oscar: la vuelta Archivo →
 * Historial «está demasiado fuerte»). Este componente lo sienta shell.tsx en
 * el padre persistente (la rama folios de sus dos <main>), exactamente donde
 * vive el par de Estudio: la píldora SOBREVIVE al cambio de pantalla y su
 * transform transiciona de asiento a asiento en el reloj compartido de
 * .38s, en las dos direcciones. Hasta la 1.3.248 cada pantalla montaba su
 * propio FoliosChips: la píldora renacía a cada cambio en su posición de
 * reposo CSS (sobre la primera pastilla, Historial, y con ancho cero) y el
 * colocador la llevaba al destino desde ahí — hacia Archivo el viaje se
 * leía como deslizamiento, pero la vuelta a Historial nacía ya sentada y
 * solo crecía de ancho en el sitio, con todo el brillo encima: el golpe
 * que Oscar vio. Ninguna pantalla debe volver a renderizar este par.
 */
import { useLayoutEffect, useRef } from "react";
import { useFaro } from "./provider";
import { SectionIcon } from "./icons";
import type { SectionId } from "@/lib/faro/types";

const PASTILLAS: readonly SectionId[] = ["historial", "archivo"];

export function FoliosChips() {
  const { ui, setUi, t } = useFaro();
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const current = root.querySelector<HTMLElement>('[aria-current="page"]');
    const pill = root.querySelector<HTMLElement>(".seg-pill");
    if (!current || !pill) return;
    const place = () => {
      pill.style.width = `${current.offsetWidth}px`;
      pill.style.height = `${current.offsetHeight}px`;
      pill.style.transform = `translate3d(${current.offsetLeft}px, ${current.offsetTop}px, 0)`;
      pill.classList.remove("is-gliding");
      void pill.offsetWidth;
      pill.classList.add("is-gliding");
    };
    place();
    void document.fonts?.ready.then(() => {
      if (pill.isConnected && current.isConnected && current.getAttribute("aria-current") === "page") place();
    });
  }, [ui.section]);

  return (
    <div className="seg is-follow is-pair fol-chips" ref={rootRef} role="tablist" aria-label={t("nav.folios")}>
      <i className="seg-pill" aria-hidden />
      {PASTILLAS.map((id) => (
        <button key={id} type="button" role="tab" aria-selected={ui.section === id} aria-current={ui.section === id ? "page" : undefined} onClick={() => setUi({ section: id })}>
          <span className="seg-ico" aria-hidden><SectionIcon id={id} className="size-3.5" /></span>
          <span className="seg-label">{t(`nav.${id}`)}</span>
        </button>
      ))}
    </div>
  );
}
