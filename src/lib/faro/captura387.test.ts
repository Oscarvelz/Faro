/* captura387 — PIEZAS SUELTAS §18 (1.3.387, adoptadas 2026-11-20):
 * (a) «llevar mis vencimientos al calendario» — exportación estándar
 * (iCalendar) de los vencimientos del mes que se ve, dicha como FOTO
 * FECHADA sin prometer sincronía: el archivo lleva el sello del día
 * en que sale y cada evento lo repite en su descripción.
 * (b) La pantalla grande se ANUNCIA en el tema de la bandeja del
 * Manual (captura-mesa): la mesa se trabaja también en el navegador
 * de una computadora, porque los borradores viajan con el libro.
 * No se construye nada para la pantalla grande: se anuncia.
 *
 * La cerca prueba el texto del calendario contra un libro espécimen
 * (una suscripción con su día y otra fuera del mes) y clava los
 * asientos: el botón en el panel de Exportar, su nota, el tema
 * «exportar» y el anuncio en captura-mesa. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitial } from "./defaults.ts";
import { duesCalendarText, monthDues } from "./calendar-export.ts";
import type { Line } from "./types.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KEY = "2026-11";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id,
    monthKey: KEY,
    currency: "NIO",
    active: true,
    note: "",
    categoryId: "",
    subId: "",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "NIO",
    bookedOn: "2026-11-01",
    ...partial,
  } as Line;
}

function book() {
  const s = createInitial("es", "oscuro");
  s.months = {
    [KEY]: {
      lines: [
        line({ id: "gym-11", kind: "subscription", concept: "Gym", amountMinor: 5_000, categoryId: "v-personales", recurring: true, cadence: "monthly", nextDue: "2026-11-15" }),
        line({ id: "luz-12", kind: "subscription", concept: "Luz", amountMinor: 30_000, categoryId: "v-servicios", recurring: true, cadence: "monthly", nextDue: "2026-12-02" }),
      ],
    },
  };
  return s;
}

test("387 · el calendario del mes: un evento por vencimiento del mes, con su sello", () => {
  const s = book();
  const dues = monthDues(s, KEY);
  assert.deepEqual(dues.map((d) => d.id), ["gym-11"], "solo el vencimiento de noviembre; el de diciembre no entra");
  const text = duesCalendarText(s, KEY, "es", new Date("2026-11-22T12:00:00Z"));
  assert.match(text, /BEGIN:VCALENDAR\r\n/);
  assert.equal((text.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  assert.match(text, /DTSTART;VALUE=DATE:20261115/);
  assert.match(text, /DTSTAMP:20261122T120000Z/, "el sello es el día de la foto");
  assert.match(text, /SUMMARY:Faro · Gym — NIO 50\.00/);
  assert.match(text, /Foto del 2026-11-22/, "cada evento dice que es una foto fechada");
  assert.match(text, /tu calendario no lo sigue/, "y que no promete sincronía");
  const en = duesCalendarText(s, KEY, "en", new Date("2026-11-22T12:00:00Z"));
  assert.match(en, /Photo dated 2026-11-22/);
  assert.deepEqual(monthDues(s, "2026-13"), [], "una llave inválida no exporta nada");
});

test("387 · los asientos: panel, nota, tema «exportar» y el anuncio de la pantalla grande", () => {
  const panel = read("../../components/faro/export-panel.tsx");
  assert.match(panel, /data-anchor="export-calendar"/);
  assert.match(panel, /exportDuesCalendar\(session\.ledger, key, lang\)/);
  assert.match(panel, /t\("export\.calendarNote"\)/);
  const i18n = read("./i18n.ts");
  assert.match(i18n, /"export\.calendar": "Al calendario"/);
  assert.match(i18n, /"export\.calendar": "To calendar"/);
  const topics = read("../manual/topics.ts");
  assert.match(topics, /foto fechada, no una sincronía/, "el tema «exportar» dice la foto");
  assert.match(topics, /la mesa también se trabaja en pantalla grande/, "el anuncio vive en el tema de la bandeja");
  assert.match(topics, /the table can also be worked on a big screen/);
  const askmap = read("./askmap.ts");
  assert.match(askmap, /vencimientos al calendario/, "el índice de funciones aprende la salida (§21, L-B7)");
});
