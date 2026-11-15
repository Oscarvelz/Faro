import { useEffect, useRef, useState } from "react";
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
 */
export function FundLight({ cls, tone, hostName, asSpan }: { cls: "aparte" | "saldo" | "sin-declarar"; tone?: string; hostName?: string; asSpan?: boolean }) {
  const { t } = useFaro();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useLayer(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
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
    <span className="fund-light-wrap" ref={wrap}>
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
      {open ? <span className="fund-light-pop" role="note">{text}</span> : null}
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
}: {
  mode: NatureMode;
  value: FundNature | null;
  onPick: (n: FundNature) => void;
  host: string;
  onHost: (id: string) => void;
  accounts: NamedAccount[];
}) {
  const { t, fmt } = useFaro();
  const nature = mode === "ask" ? value : mode === "balance" ? "saldo" : "aparte";
  // Con una sola cuenta, el amarre es solo: ninguna pregunta inútil (§5.1).
  useEffect(() => {
    if (nature === "saldo" && accounts.length === 1 && host !== accounts[0]!.id) onHost(accounts[0]!.id);
  }, [nature, accounts, host, onHost]);
  const hostArea = nature === "saldo" ? (
    accounts.length === 0 ? (
      <p className="fund-note">{t("fund.host.none")}</p>
    ) : accounts.length === 1 ? (
      <p className="fund-note">{t("fund.host.only").replace("{x}", accounts[0]!.name)}</p>
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
      <div className="fund-ask">
        <p className="fund-born">{t(mode === "balance" ? "fund.born.saldo" : "fund.born.aparte")}</p>
        {hostArea}
      </div>
    );
  }
  return (
    <div className="fund-ask">
      <span className="lab-head">{t("fund.q")}<Hint topic="donde-vive" /></span>
      <div className="fund-opts" role="group">
        <button type="button" className={`fund-opt${value === "saldo" ? " is-on" : ""}`} aria-pressed={value === "saldo"} onClick={() => onPick("saldo")}>
          <strong>{t("fund.q.saldo")}</strong>
          <small>{t("fund.q.saldo.how")}</small>
        </button>
        <button type="button" className={`fund-opt${value === "aparte" ? " is-on" : ""}`} aria-pressed={value === "aparte"} onClick={() => onPick("aparte")}>
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
  const { t } = useFaro();
  const text = kind === "cuenta"
    ? t("hist.note.cuenta").replace("{x}", fundName)
    : kind === "retiro"
      ? t("hist.note.retiro")
      : nature === "aparte"
        ? t("hist.note.aparte").replace("{fund}", fundName)
        : nature === "saldo"
          ? t("hist.note.saldo").replace("{fund}", fundName).replace("{x}", hostName ?? "")
          : t("hist.note.none").replace("{fund}", fundName);
  return (
    <span className="hist-row-note">
      {kind === "fund" ? <FundLight cls={nature ?? "sin-declarar"} tone={tone} hostName={hostName} /> : null}
      <span>{text}</span>
    </span>
  );
}
