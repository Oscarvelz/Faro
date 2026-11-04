// 1.3.88 "forgotten areas" finish: one shared look for loose notes, empty states and the activity log.
import "./finish.css";
import { mountTronFloor } from "./tron-floor";
import type { ReactNode } from "react";
import { CalendarClock, Hourglass, Inbox, Lightbulb, PenLine, type LucideIcon } from "lucide-react";

mountTronFloor();

export type NoteKind = "empty" | "tip" | "wait" | "date" | "pen";
const ICON: Record<NoteKind, LucideIcon> = { empty: Inbox, tip: Lightbulb, wait: Hourglass, date: CalendarClock, pen: PenLine };

/** A small tone chip: icon inline beside the text, hairline frame, soft tint, fades in. Never a box in a box. */
export function Note({ kind = "empty", children, className = "" }: { kind?: NoteKind; children: ReactNode; className?: string }) {
  const Icon = ICON[kind];
  return (
    <p className={`fx-note is-${kind}${className ? ` ${className}` : ""}`} role="note">
      <Icon aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Activity log: dot + label, short date at the right, hairline between rows. */
export function ActivityLog({ items, lang }: { items: { id: string; at: string; label: string }[]; lang: string }) {
  if (!items.length) return <Note kind="empty">{lang === "en" ? "No activity yet." : "Sin actividad aún."}</Note>;
  const fmt = (at: string) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short" }); };
  return (
    <ul className="fx-log">
      {items.map((a, i) => (
        <li key={a.id} style={{ animationDelay: `${i * 40}ms` }}>
          <i aria-hidden />
          <span>{a.label}</span>
          <time className="num" dateTime={a.at}>{fmt(a.at)}</time>
        </li>
      ))}
    </ul>
  );
}
