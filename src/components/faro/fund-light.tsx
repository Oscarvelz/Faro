import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLayer } from "@/lib/manual/back";
import type { FundNature, NatureMode } from "@/lib/faro/funds";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import "./fund.css";

/**
 * La luz de naturaleza (modelo de ahorros, §7): un signo pequeño junto al nombre del
 * fondo — disco lleno = dinero aparte; anillo = parte del saldo; disco gris = sin
 * declarar. Es un SIGNO, nunca un botón que actúe (ley de la casa, 1.3.230): su toque
 * no navega ni cambia nada — solo se explica a sí misma en una línea, como manda la
 * ley del número que se explica al tocarlo. La forma se lee sin color (lleno contra
 * hueco); el color es el tinte de su bolsa. El Retiro no lleva luz: su naturaleza es
 * su nombre.
 *
 * Su explicación se muestra en la CAPA SUPERIOR (portal al cuerpo, anclada y
 * apretada a la ventana): la primera versión la dibujaba dentro del anfitrión y
 * las tarjetas de la banda la recortaban siempre — una explicación que no puede
 * mostrarse entera no explica nada (auditoría de ventanas, 2026-11-16).
 */
export function FundLight({ cls, tone, hostName, asSpan }: { cls: "aparte" | "saldo" | "sin-declarar"; tone?: string; hostName?: string; asSpan?: boolean }) {
  const { t } = useFaro();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  useLayer(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node;
      if (wrap.current?.contains(el) || pop.current?.contains(el)) return;
      setOpen(false);
    };
    // Anclada a la luz en coordenadas de ventana: si la página se mueve, la
    // explicación se cierra antes que quedar flotando lejos de su luz.
    const onMove = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open ]);
  // La explicación vive en la capa superior (portal al cuerpo, el camino de las
  // tarjetas de la casa): nace medida desde su luz, se aprieta a la ventana con
  // 12px de margen y se voltea hacia arriba si abajo no cabe. Ninguna tarjeta,
  // banda ni panel puede recortarla — antes vivía dentro de la tarjeta de la
  // bolsa (~108px para una línea de 240px) y jamás podía mostrarse entera
  // (auditoría de ventanas, 2026-11-16).
  useLayoutEffect(() => {
    if (!open) { setPlace(null); return; }
    const anchor = wrap.current;
    const el = pop.current;
    if (!anchor || !el) return;
    const r = anchor.getBoundingClientRect();
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const M = 12;
    const left = Math.min(Math.max(r.left, M), Math.max(M, window.innerWidth - pw - M));
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - M && r.top - 6 - ph >= M) top = r.top - 6 - ph;
    top = Math.min(Math.max(top, M), Math.max(M, window.innerHeight - ph - M));
    setPlace({ left, top });
  }, [open ]);
  const text = cls === "aparte"
    ? t("fund.light.aparte")
    : cls === "saldo"
      ? hostName ? t("fund.light.saldo").replace("{x}", hostName) : t("fund.light.saldoFree")
      : t("fund.light.none");
  const style = tone && cls !== "sin-declarar" ? ({ "--fl": tone } as React.CSSProperties) : undefined;
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); setOpen((v) => !v); },
  };
  return (
    <span className="fund-light-wrap" data-anchor="fund-light" ref={wrap}>
      {asSpan ? (
        // Dentro de un botón (el chip de la banda) la luz no puede ser otro botón:
        // es un span con el mismo signo y la misma explicación, y su toque se
        // detiene ahí — explica y no hace nada más, como en todas partes (§7).
        <span role="button" tabIndex={-1} className={`fund-light is-${cls}`} style={style} aria-label={text} aria-expanded={open} {...handlers} />
      ) : (
        <button
          type="button"
          className={`fund-light is-${cls}`}
          style={style}
          aria-label={text}
          aria-expanded={open}
          {...handlers}
        />
      )}
      {open ? createPortal(
        <span
          className="fund-light-pop"
          role="note"
          ref={pop}
          style={place ? { left: place.left, top: place.top } : { left: 0, top: 0, visibility: "hidden" }}
        >{text}</span>,
        document.body,
      ) : null}
    </span>
  );
}

export type NamedAccount = { id: string; name: string; minor: number };

/**
 * La pregunta de §5.1 — ¿dónde vive el dinero de este fondo? — con la consecuencia
 * escrita dentro de cada opción, y la elección de cuenta anfitriona cuando el fondo
 * nace del saldo (con una sola cuenta se amarra solo y lo dice; sin cuentas, nace
 * sin declarar y lo dice). En los modos de postura fija el selector no aparece: el
 * fondo nace con la naturaleza elegida en Ajustes y el formulario lo dice en una
 * línea tranquila — pero la anfitriona se pregunta igual si hay varias cuentas.
 */
export function NaturePick({
  mode,
  value,
  onPick,
  host,
  onHost,
  accounts,
  simple = false,
  armed = true,
}: {
  mode: NatureMode;
  value: FundNature | null;
  onPick: (n: FundNature) => void;
  host: string;
  onHost: (id: string) => void;
  accounts: NamedAccount[];
  /* Etapa 3.1 (F-1): fuera de Completo la pregunta es simple — sin selector de
   * anfitriona; con varias cuentas el fondo se amarra a la primera y la forma
   * lo DICE con su nombre. `armed` = la elección está viva en esta forma (en
   * una serie existente sin tocar, la anfitriona guardada manda y no se mueve). */
  simple?: boolean;
  armed?: boolean;
}) {
  const { t, fmt } = useFaro();
  const nature = mode === "ask" ? value : mode === "balance" ? "saldo" : "aparte";
  // Con una sola cuenta, el amarre es solo: ninguna pregunta inútil (§5.1).
  useEffect(() => {
    if (nature === "saldo" && accounts.length === 1 && host !== accounts[0]!.id) onHost(accounts[0]!.id);
  }, [nature, accounts, host, onHost]);
  // En la forma simple, elegir «del saldo» amarra a la primera cuenta — guardar
  // nunca puede exigir una anfitriona que la forma no muestra (cerca F-1).
  useEffect(() => {
    if (simple && armed && nature === "saldo" && accounts.length > 1 && host !== accounts[0]!.id) onHost(accounts[0]!.id);
  }, [simple, armed, nature, accounts, host, onHost]);
  const hostArea = nature === "saldo" ? (
    accounts.length === 0 ? (
      <p className="fund-note">{t("fund.host.none")}</p>
    ) : accounts.length === 1 ? (
      <p className="fund-note">{t("fund.host.only").replace("{x}", accounts[0]!.name)}</p>
    ) : simple ? (
      <p className="fund-note">{t("fund.host.first").replace("{x}", accounts[0]!.name)}</p>
    ) : (
      <div className="fund-host">
        <span className="lab-head">{t("fund.host.q")}</span>
        <div className="fund-host-list" role="group">
          {accounts.map((a) => (
            <button key={a.id} type="button" className={`fund-host-row${host === a.id ? " is-on" : ""}`} aria-pressed={host === a.id} onClick={() => onHost(a.id)}>
              <span>{a.name}</span><strong className="num">{fmt(a.minor)}</strong>
            </button>
          ))}
        </div>
        <p className="fund-note">{t("fund.host.guard")}</p>
      </div>
    )
  ) : null;
  if (mode !== "ask") {
    return (
      <div className="fund-ask" data-anchor="nature-pick">
        <p className="fund-born">{t(mode === "balance" ? "fund.born.saldo" : "fund.born.aparte")}</p>
        {hostArea}
      </div>
    );
  }
  return (
    <div className="fund-ask" data-anchor="nature-pick">
      <span className="lab-head">{t("fund.q")}<Hint topic="donde-vive" /></span>
      <div className="fund-opts" role="group">
        <button type="button" data-anchor="nature-saldo" className={`fund-opt${value === "saldo" ? " is-on" : ""}`} aria-pressed={value === "saldo"} onClick={() => onPick("saldo")}>
          <span className="fund-opt-mark is-saldo" aria-hidden />
          <strong>{t("fund.q.saldo")}</strong>
          <small>{t("fund.q.saldo.how")}</small>
        </button>
        <button type="button" data-anchor="nature-aparte" className={`fund-opt${value === "aparte" ? " is-on" : ""}`} aria-pressed={value === "aparte"} onClick={() => onPick("aparte")}>
          <span className="fund-opt-mark is-aparte" aria-hidden />
          <strong>{t("fund.q.aparte")}</strong>
          <small>{t("fund.q.aparte.how")}</small>
        </button>
      </div>
      {hostArea}
    </div>
  );
}

/**
 * La nota de Folios (§4.6): la luz del fondo encabezando una línea tranquila bajo la
 * meta de la fila, que dice la verdad del modelo para ESE movimiento. Solo las
 * entradas de ahorro la llevan; el Retiro y las cuentas llevan la nota sin luz
 * (el Retiro no lleva luz en ninguna parte, y una cuenta es la base misma).
 */
export function SaveNote({ kind, nature, fundName, hostName, tone }: {
  kind: "fund" | "retiro" | "cuenta";
  nature?: FundNature;
  fundName: string;
  hostName?: string;
  tone?: string;
}) {
  const { t, has } = useFaro();
  // Fo-3 (tres modos, etapa 3.3): la nota se compone por modo. La forma entera
  // — la luz y la partición de naturaleza con su cuenta anfitriona — es
  // Completo (nature.save-note / nature.light). En Ritmo nombra el fondo y su
  // cuenta, sin la partición (la puerta es la banda de ahorros, vault.meta,
  // que es donde el fondo vive con su cuenta en ese modo); en Esencial, solo
  // el fondo. La cuenta se nombra igual en los tres modos (ciudadana de
  // Esencial); el Retiro se nombra siempre, pero su clase («fuera de tu
  // cuenta») se lee desde Ritmo (nature.class-retiro): en Esencial la nota es
  // llana.
  const full = has("nature.save-note");
  const text = kind === "cuenta"
    ? t("hist.note.cuenta").replace("{x}", fundName)
    : kind === "retiro"
      ? has("nature.class-retiro") ? t("hist.note.retiro") : t("hist.note.retiroPlain")
      : !full
        ? nature === "saldo" && hostName && has("vault.meta")
          ? t("hist.note.fundAcct").replace("{fund}", fundName).replace("{x}", hostName)
          : t("hist.note.fund").replace("{fund}", fundName)
        : nature === "aparte"
          ? t("hist.note.aparte").replace("{fund}", fundName)
          : nature === "saldo"
            ? t("hist.note.saldo").replace("{fund}", fundName).replace("{x}", hostName ?? "")
            : t("hist.note.none").replace("{fund}", fundName);
  return (
    <span className="hist-row-note">
      {kind === "fund" && full ? <FundLight cls={nature ?? "sin-declarar"} tone={tone} hostName={hostName} /> : null}
      <span>{text}</span>
    </span>
  );
}
