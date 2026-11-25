/**
 * orden-settle — la costura de canon del puerto de la Rama Agente
 * (1.3.447): la ejecución confirmada de los verbos de orden de E4.
 *
 * parseOrden (orden.ts) es puro: propone la orden como borrador con
 * su eco, y la respuesta propone y el toque dispone. Este módulo es
 * el toque hecho código, con las formas del propio libro —
 *   archivar        → la línea descansa por descanso.hideLines, la
 *                     única mano que pone el descanso (su período
 *                     queda registrado en el Archivo, restaurable);
 *   corregir-monto  → el monto de ESA línea, en su mes;
 *   corregir-fecha  → el día de ESA línea, en el campo que traía la
 *                     fecha (bookedOn, o nextDue si nació de ahí);
 *   ajuste          → el ajuste nombrado de settings (moneda de
 *                     vista, idioma, tasa, notificaciones, avisos).
 *
 * EL MODO NO SE APLICA AQUÍ: settings.mode tiene en canon una cerca
 * de escritores (modos293: solo el selector de Ajustes y la puerta
 * del proveedor lo escriben). Un borrador de modo se devuelve sin
 * tocar — la superficie lo aplica por la mano del proveedor
 * (chooseMode), y la captura 447 clava esa ruta.
 */
import { hideLines } from "./descanso.ts";
import type { OrdenDraft } from "./orden.ts";
import type { Currency, Lang, LedgerState } from "./types.ts";

/** La orden confirmada → el estado con la orden hecha. */
export function applyOrdenDraft(state: LedgerState, order: OrdenDraft): LedgerState {
  switch (order.op) {
    case "archivar":
      return hideLines(state, [order.lineId]).state;
    case "corregir-monto":
    case "corregir-fecha": {
      const bucket = state.months[order.monthKey];
      if (!bucket || !bucket.lines.some((l) => l.id === order.lineId)) return state;
      const lines = bucket.lines.map((l) => {
        if (l.id !== order.lineId) return l;
        if (order.op === "corregir-monto") return { ...l, amountMinor: order.toMinor };
        return l.bookedOn ? { ...l, bookedOn: order.toDate } : { ...l, nextDue: order.toDate };
      });
      return { ...state, months: { ...state.months, [order.monthKey]: { lines } } };
    }
    case "ajuste": {
      const v = order.value;
      switch (order.setting) {
        case "display":
          return { ...state, settings: { ...state.settings, display: v as Currency } };
        case "lang":
          return { ...state, settings: { ...state.settings, lang: v as Lang } };
        case "rate":
          return { ...state, settings: { ...state.settings, rateE4: v as number } };
        case "notify":
          return { ...state, settings: { ...state.settings, notify: v as boolean } };
        case "dueAlerts":
          return { ...state, settings: { ...state.settings, dueAlerts: v as boolean } };
        case "mode":
          // La cerca de escritores manda: el modo no se escribe aquí.
          return state;
      }
    }
  }
}
