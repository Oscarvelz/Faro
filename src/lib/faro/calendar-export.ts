/* calendar-export — «llevar mis vencimientos al calendario» (MAPA §18,
 * adoptado 2026-11-20; 1.3.387): exportación estándar (iCalendar) de los
 * vencimientos del mes que se está viendo. Es una FOTO FECHADA, no una
 * sincronía: el archivo lleva el sello del momento en que sale y su
 * texto lo dice — si un vencimiento cambia después en Faro, el
 * calendario no lo sigue; se vuelve a exportar y hay foto nueva.
 * Los eventos salen del mismo motor que alimenta los avisos
 * (duesWindow), filtrados al mes pedido: una ocurrencia por fuente. */
import { duesWindow, type DueEntry } from "./dues";
import type { Lang, LedgerState } from "./types";

/** Los vencimientos cuya fecha cae dentro del mes `key` (YYYY-MM). */
export function monthDues(state: LedgerState, key: string): DueEntry[] {
  if (!/^\d{4}-\d{2}$/.test(key)) return [];
  return duesWindow(state, 400, `${key}-01`)
    .filter((e) => e.on.startsWith(key))
    .sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : a.name.localeCompare(b.name)));
}

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function stampOf(now: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;
}

function dayOf(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** El texto iCalendar completo de los vencimientos del mes. `now` es el
 *  sello de la foto: la fecha en que la exportación sale. */
export function duesCalendarText(state: LedgerState, key: string, lang: Lang, now: Date): string {
  const dues = monthDues(state, key);
  const display = state.settings.display;
  const money = (minor: number) => `${display} ${(minor / 100).toFixed(2)}`;
  const photo = lang === "en"
    ? `Photo dated ${now.toISOString().slice(0, 10)}: if this due changes in Faro later, your calendar won't follow it — export again for a new photo.`
    : `Foto del ${now.toISOString().slice(0, 10)}: si este vencimiento cambia en Faro después, tu calendario no lo sigue — vuelve a exportar para la foto nueva.`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Faro//Vencimientos ${key}//${lang === "en" ? "EN" : "ES"}`,
    "CALSCALE:GREGORIAN",
  ];
  for (const due of dues) {
    const summary = due.amt != null ? `Faro · ${due.name} — ${money(due.amt)}` : `Faro · ${due.name}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:faro-${due.id}-${due.on}@faro`,
      `DTSTAMP:${stampOf(now)}`,
      `DTSTART;VALUE=DATE:${dayOf(due.on)}`,
      `DTEND;VALUE=DATE:${nextDay(due.on)}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(photo)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Descarga el archivo del mes (o lo comparte el navegador, como las
 *  demás exportaciones de Faro: un archivo estándar que el aparato
 *  ofrece abrir con su calendario). */
export function exportDuesCalendar(state: LedgerState, key: string, lang: Lang): void {
  const text = duesCalendarText(state, key, lang, new Date());
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `faro-vencimientos-${key}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
