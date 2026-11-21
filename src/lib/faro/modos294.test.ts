/**
 * FARO — «Los tres modos», etapa 2 (HasFeature: el único punto de filtrado).
 *
 * La etapa 2 promueve mode.ts al registro completo de funciones y lo conecta:
 * el proveedor expone mode y has(), goTopic valida todo salto contra el modo
 * (destino dormido → la explicación), la búsqueda de Ajustes recibe el modo y
 * la foto del widget lo lleva. Lo que cercan estas pruebas:
 *
 *  - Completitud del registro: cada fila del censo (CENSO-FUNCIONES.md, con los
 *    fallos D-bis de SINTESIS.md aplicados) tiene su entrada con su modo — el
 *    manifiesto de abajo ES la transcripción del censo; el registro y el
 *    manifiesto se contrastan en los dos sentidos (ni filas sin entrada ni
 *    entradas sin fila).
 *  - Los fallos D-bis que contradijeron la propuesta del censo quedan fijados
 *    uno a uno (la selección entera en Ritmo, la cadencia básica en Esencial…).
 *  - TOTALES IDÉNTICOS ENTRE MODOS: el mismo libro suma exactamente lo mismo
 *    en Esencial, Ritmo y Completo, con los datos dormidos incluidos — el modo
 *    es un filtro de lectura, jamás una regla de cálculo (automático, no a ojo).
 *  - Ningún salto aterriza en la nada: featureForGo conoce los destinos
 *    dormidos representativos de cada tipo de salto (Ajustes, Manual, widget) y
 *    la búsqueda de Ajustes no ofrece destinos dormidos como destinos vivos.
 *  - Cerca de grep: el registro solo se consume vía el contexto del proveedor
 *    y los asientos declarados — ninguna superficie importa mode.ts por su
 *    cuenta ni toca FEATURES/featureForGo/hasFeature fuera de su asiento.
 *  - La foto del widget lleva el modo de la persona (fontanería de la etapa;
 *    su cara se recompone en la 3.3).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import { createInitial, makeNamer, withSeguroDeVida } from "./defaults.ts";
import { netBalance } from "./debts.ts";
import { duesWindow } from "./dues.ts";
import { categorySlices, summarize } from "./engine.ts";
import { FEATURES, featureForGo, hasFeature, modeOf, RULE_MIN_MODE, type FeatureId, type Mode } from "./mode.ts";
import { savingsStock } from "./savings.ts";
import { searchSettings } from "./settings-search.ts";
import { MANUAL_TOPICS } from "../manual/topics.ts";
import { buildWidgetSnapshot, savingsOf } from "./widget.ts";
import type { LedgerState, Line } from "./types.ts";

const E = "esencial" as const;
const R = "ritmo" as const;
const C = "completo" as const;

/** EL MANIFIESTO — la transcripción del censo (CENSO-FUNCIONES.md corregido
 *  por los fallos D-bis), fila a fila, en el orden del propio censo. Si una
 *  fila del censo no está aquí, el registro está incompleto; si el registro
 *  trae una entrada que no está aquí, sobra.
 *  ENMIENDAS OLA 2 (las mentiras del registro, C-1/C-2/C-3/C-5 — la cara y
 *  la ley asentada contra la fila del censo): nav.tablet-views,
 *  nav.float-window y nav.global-search pasan a Esencial (cromo universal
 *  de la barra: la cara los pinta sin puerta, el tema 1.7 y el módulo 1
 *  viven en Esencial y el fallo 14 declara la búsqueda ciega al modo);
 *  nav.ring pasa a Esencial (ya no es una puerta única: sus paradas se
 *  filtran una a una); people.card pasa a Esencial (añadir una persona es
 *  declarar, el criterio asentado); archive.restore-{lent,loan,card,owe}
 *  pasan a Esencial (Fo-1: restaurar entidades propias es existencia);
 *  pres.m11-puertas pasa a Esencial (su Module.mode y el MAPA-MODULOS
 *  asentado lo declaran compartido). */
const MANIFEST: readonly (readonly [FeatureId, Mode])[] = [
  // §1.1 Navegación y dock
  ["nav.dock", E], ["nav.books-hub", E], ["nav.books-subs-entry", R], ["nav.vault-bar", E],
  ["nav.scale-topbar", R], ["nav.tablet-views", E], ["nav.float-window", E],
  // 1.3.318 (palabra de Oscar, 2026-11-18 20:11): el plan es esencial —
  // el calendario baja a Esencial con su cara de plan, y el pie de totales
  // gana su asiento propio en Ritmo; el manifiesto crece 498 → 499.
  ["nav.calendar", E], ["nav.calendar-totals", R],
  ["nav.global-search", E], ["nav.undo", E], ["nav.sync-light", E], ["nav.view-currency-bar", E],
  ["nav.day-night", E], ["nav.swipe", E], ["nav.ring", E], ["nav.toolsheet", E],
  // §1.2 Central
  ["central.month-left", E], ["central.month-used", E], ["central.month-rate", E],
  ["central.lens-have", E], ["central.lens-spend", E], ["central.lens-pagos", E],
  ["central.list", E], ["central.edit-line", E], ["central.debt-light", R],
  ["central.first-line", E], ["central.cobros-panel", E], ["central.quickadd", E],
  // §1.3 Cobros — el asiento y los dos lados en Esencial (veredicto 2026-11-16);
  // la gestión (línea de tiempo con importes, lista y alta rápidas, archivo,
  // ver-todo) sigue en Ritmo, como acota el fallo D-bis 31.
  ["debt.facts", E], ["cobros.owed-side", E], ["cobros.owe-side", E], ["cobros.timeline", R],
  ["cobros.quick-list", R], ["cobros.quick-add", R], ["cobros.archive", R], ["cobros.see-all", R],
  // §1.4 Libros — máquina común
  ["books.list", E], ["books.add-line", E], ["books.edit-line", E], ["books.currency", E],
  ["books.filter-chips", R], ["books.cloud", C], ["books.bubble-editor", C], ["books.bookkit", C],
  ["books.multiselect", R], ["books.vault-order", C],
  // §1.5 Bóveda de ahorros
  ["central.save-band", E], ["vault.save", E], ["vault.meta", R], ["vault.retiro", R],
  ["vault.retiro-sheet", C], ["vault.emergencia", R], ["vault.segments", C], ["vault.kept", C],
  ["vault.free", C], ["vault.monthly-setaside", R], ["vault.setaside-split", C],
  ["vault.savings-goal-pct", R], ["vault.span-cut", R], ["vault.pot", R], ["vault.lever", C],
  ["vault.order-pockets", C], ["vault.pin-block", C], ["vault.add-line", E], ["vault.move-line", C],
  ["vault.rename", R], ["vault.delete", C], ["vault.look", C], ["vault.factory-restore", C],
  ["vault.meta-plan", R], ["vault.retiro-fields", C],
  // §1.6 Naturalezas de fondos
  ["nature.class-cuenta", C], ["nature.class-retiro", R], ["nature.class-aparte", C],
  ["nature.class-saldo", C], ["nature.class-undeclared", E], ["nature.ask", E],
  ["nature.naturepick-full", C], ["nature.declare-series", C], ["nature.free-guard", C],
  ["nature.undeclared-encounter", C], ["nature.band-migration", C], ["nature.cushion", C],
  ["nature.overcommit", C], ["nature.light", C], ["nature.save-note", C],
  // §1.7 Cuentas bancarias
  ["accounts.panel-simple", E], ["accounts.panel", R], ["accounts.add", R],
  ["accounts.seed-banks", E], ["accounts.move", E], ["accounts.opening", R],
  ["accounts.reorder", C], ["accounts.pin-panel", C],
  // §1.8 Libros por tipo
  ["books.income", E], ["books.fixed", E], ["books.variable", E], ["books.shops", R],
  ["books.shop-catalog-gear", R], ["books.subs", R],
  // §1.9 Recurrentes y cadencias
  ["subs.cuota", R], ["subs.fixed-exists", E], ["subs.cadence-basic", E],
  ["subs.cadence-machinery", R], ["subs.brand-library", R], ["subs.own-chips", C],
  ["subs.brand-icon-admin", C], ["subs.brand-detect", R], ["subs.cadences-base", E],
  ["subs.cadence-custom", C], ["subs.my-frequencies", C], ["subs.freq-chips", C],
  ["subs.dues-window", R], ["alerts.due", E],
  // §1.10 Deudas
  ["debt.scale", R], ["debt.net", E], ["debt.chart", C], ["debt.total", R],
  ["lent.no-interest", R], ["lent.interest", C], ["lent.payment", R], ["lent.history", C],
  ["lent.archive", R], ["lent.bulk-edit", C], ["debt.line-balance", R],
  // §1.11 Préstamos recibidos
  ["loans.add", R], ["loans.interest", C], ["loans.due-day", R], ["loans.pay", R],
  ["loans.pay-split", C], ["loans.interest-paid", C], ["loans.archive", R],
  ["loans.bulk-edit", C], ["loans.payoff-plan", C], ["loans.payoff-params", C],
  ["loans.payoff-result", C], ["loans.payoff-est-rate", C],
  // §1.12 Instrumentos
  ["tools.rate-view", E], ["tools.rate-refresh", E], ["tools.rate-manual", E],
  ["tools.converter", E], ["tools.converter-chips-admin", C], ["tools.converter-use", E],
  ["tools.converter-send", R], ["tools.calculator", R], ["tools.calculator-float", C],
  ["tools.calculator-use", R], ["tools.slips", R], ["tools.slips-reuse", R],
  ["tools.slip-to-category", C], ["tools.slips-bulk", C],
  // §1.13 Editor de línea y selección
  ["editor.core", E], ["editor.currency", E], ["editor.category", E], ["editor.note", E],
  ["editor.savings-balance", E], ["editor.paid-with", R], ["editor.active-toggle", R],
  ["editor.recurrent-toggle", R], ["editor.debt-balance", R], ["editor.nature", C],
  ["editor.person", R], ["editor.for-remit", R], ["editor.shop-fields", E],
  ["editor.shop-fine", C], ["editor.icon-color", E], ["editor.picker-manage", R],
  // 1.3.315 (fallo de Oscar, 2026-11-18 18:11): corregir un nombre mal
  // escrito es Esencial en cualquier modo — el renombre gana su asiento
  // propio y el manifiesto crece 497 → 498 con esta razón.
  ["editor.picker-rename", E],
  ["editor.save-guard", E], ["editor.draft", E],
  ["selection.engine", R], ["selection.delete", R], ["selection.move", R],
  // §1.14 Personas y contactos
  ["people.card", E], ["people.add-contacts", R], ["people.add-manual", R],
  ["people.dates", R], ["people.gift", R], ["people.import-vcf", C], ["people.share-in", C],
  ["people.totals", C], ["people.delete", R],
  // §1.15 Remesas
  ["remit.send", R], ["remit.for", R], ["remit.card", R], ["remit.manage", C],
  // §1.16 Bancos, tarjetas y recompensas
  ["cards.group", R], ["cards.add", R], ["cards.add-full", C], ["cards.update", R],
  ["cards.pay", R], ["cards.edit-delete", R], ["cards.factory", C], ["cards.capture-add", C],
  ["cards.ficha", C], ["cards.usage-advice", C], ["cards.rewards", C],
  ["cards.rewards-redeem", C], ["cards.rewards-group", C], ["cards.rewards-reconcile", C],
  // §1.17 Seguro de vida
  ["ins.piece", C], ["ins.setup", C], ["ins.premium-line", C], ["ins.beneficiaries", C],
  ["ins.start", C], ["ins.premiums-paid", C], ["ins.change-notice", C], ["ins.not-money", C],
  // §1.18 Folios — Historial
  ["hist.river", E], ["hist.row-origin", E], ["hist.lens-week-month", E], ["hist.lens-year", E],
  ["hist.nav", E], ["hist.totals", E], ["hist.search-text", E], ["hist.search-global", E],
  ["hist.synonyms", E], ["hist.filter-direction", E], ["hist.filter-category", E],
  ["hist.filter-group", R], ["hist.filter-store", R], ["hist.filter-account", R],
  ["hist.filter-amount", R], ["hist.filter-recurring", R], ["hist.filter-origin", C],
  ["hist.filter-import-lot", C], ["hist.saved-views", R], ["hist.paging", E],
  ["hist.search-people-cards", E],
  // §1.19 Folios — Archivo
  ["archive.rest-gate", E], ["archive.hide-period", C], ["archive.hide-one", C],
  ["archive.hide-selection", C], ["archive.span-card", C], ["archive.restore-span", E],
  ["archive.delete-span", E], ["archive.delete-lines", E], ["archive.restore-lent", E],
  ["archive.restore-loan", E], ["archive.restore-card", E], ["archive.restore-owe", E],
  ["archive.pair", E],
  // §1.20 Importación bancaria
  ["import.bank", C], ["import.guides", C],
  // §1.21 Escaneo
  ["scan.receipt", E], ["scan.receipt-review", E], ["scan.receipt-full-review", R], ["scan.receipt-rewards-row", C],
  ["scan.retirement-stmt", C], ["scan.card-capture", C],
  // §1.27 Captura inteligente (Ola 1)
  ["capture.tray", E], ["capture.review", E], ["capture.review-full", R],
  ["capture.text", E], // 1.3.340 — Ola 2: el asiento de la puerta de texto, declarado antes que la superficie
  ["capture.list", E], // 1.3.342 — Ola 3: el asiento de la lista en bache, declarado antes que la superficie
  ["capture.plan", R], // 1.3.357 — la lista-plan (D6): planear es administrar; la cara entera en Ritmo, declarado antes que la superficie
  ["settings.guest-currency", E], // 1.3.344 — Ola 4: el asiento de la invitada, declarado antes que la superficie
  ["settings.news", E], // 1.3.346 — Novedades: leer lo nuevo es de todos
  ["settings.about", E], // 1.3.346 — Acerca de: qué es Faro, de todos
  ["advisor.ask", E], // 1.3.345 — Ola 5a: preguntar al Asesor, declarado antes que la caja
  ["advisor.ask-scenarios", C], // 1.3.345 — Ola 5a: los escenarios del Asesor, declarados con la caja; su motor llega en 5b
  ["settings.due-alerts", E], // 1.3.356 — Ola 6: el interruptor de los avisos de pagos, con su fila
  ["central.due-alerts", E], // 1.3.356 — Ola 6: la tarjeta de Central que anuncia los pagos
  ["editor.autopay", R], // 1.3.356 — Ola 6: el pago automático se configura en el editor de la cuota
  ["advisor.waitlist", E], // 1.3.360 — 5c: la lista de espera del Asesor; anotar y decidir un deseo es declarar, declarado antes que la superficie
  ["settings.wait-time", R], // 1.3.360 — 5c: el plazo de la espera se configura en Ajustes; configurar es administrar (Ritmo)
  // §1.22 Bandeja de documentos compartidos
  ["inbox.bank", C], ["inbox.vcf", R], ["inbox.image-card", C], ["inbox.image-receipt", E],
  // §1.23 Exportar informes
  ["export.panel", R], ["export.full-sheets", C],
  // §1.24 Modo de ejemplo
  ["sample.door", E], ["sample.house-filtered", E],
  // §1.25 Widget
  ["widget.feed", E], ["widget.quick-note", E], ["widget.note-with-home", C],
  ["widget.habit-homes", C], ["widget.home-suggestion", C], ["widget.hide-amounts", E],
  ["widget.pins-manage", R], ["widget.pin-from-catalog", C], ["widget.last-push", C],
  ["widget.face-pagos", R], ["widget.face-dues", R], ["widget.face-savings", R],
  ["widget.face-scale", R], ["widget.face-pins", R], ["widget.face-pace", C],
  ["widget.face-top5-compare", C], ["widget.face-flow", C],
  // §1.26 Presentación
  ["pres.driver", E], ["pres.m1-mapa", E], ["pres.m2-manual", E], ["pres.m3-anotar", E],
  ["pres.m3-balance-chapter", R], ["pres.m4-cambio", R], ["pres.m5-mes", E],
  ["pres.m6-ahorros", R], ["pres.m7-estadisticas", C], ["pres.m8-asesor", C],
  ["pres.m9-folios-river", E], ["pres.m9-folios-rest", C], ["pres.m10-estructura", C],
  ["pres.m11-puertas", E], ["pres.m12-pregunta", C], ["pres.m13-totales", C],
  ["pres.m14-colchon", C], ["pres.my-scenes", R],
  // §1.27 Manual
  ["manual.ch1-arriba", E], ["manual.topic-export", R], ["manual.topic-float", C],
  ["manual.ch2-central", E], ["manual.ch3-cobros", R], ["manual.topic-card-fine", C],
  ["manual.ch4-libros", E], ["manual.ch5-ahorros", R], ["manual.topic-retiro", C],
  ["manual.ch6-folios", E], ["manual.topic-apartar", C], ["manual.ch7-estudio", C],
  ["manual.ch8-asesor", C], ["manual.ch9-cambio", R], ["manual.ch10-ajustes", C],
  ["manual.ch11-importar", C], ["manual.ch12-editor", E], ["manual.ch13-cuenta", E],
  // §2 Ajustes universales
  ["settings.lang", E], ["settings.theme", E], ["settings.mode-selector", E],
  ["settings.manual-row", E], ["settings.presentations-row", E], ["settings.notify", E],
  ["settings.install-app", E], ["settings.backup-auto", E], ["settings.backup-quarantine", E],
  ["settings.backup-download", E], ["settings.backup-restore", E], ["settings.backup-folder", E],
  ["settings.backup-conflict", E], ["settings.account", E], ["settings.version", E],
  ["settings.battery-row", E], ["settings.shortcuts", E], ["settings.activity", E],
  ["settings.hide-amounts", E], ["settings.view-currency", E],
  // §2 Ajustes atados
  ["settings.structure-tree", R], ["settings.structure-card", R], ["settings.catalog-add", E],
  ["settings.catalog-admin", R], ["settings.catalog-admin-subs", C], ["settings.banks", C],
  ["settings.bank-rewards-table", C], ["settings.bank-rewards-real", C],
  ["settings.bank-sources", C], ["settings.bank-paypal-pocket", C], ["settings.bank-rules", C],
  ["settings.import-row", C], ["settings.savings-goal", R], ["settings.debt-green", R],
  ["settings.debt-yellow", R], ["settings.cushion-months", C], ["settings.rules", R],
  ["settings.gestures", E], ["settings.widget-pins", R], ["settings.widget-card", E],
  ["settings.pin-in-card", R], ["settings.sample-row", E], ["settings.templates", C],
  ["settings.nature-stance", R], ["settings.rate-manual", E],
  // §3.1 Panorama
  ["pano.next-dues-reduced", E], ["pano.next-dues-timeline", R], ["pano.month-ring", R],
  ["pano.hundred", R], ["pano.rule-503020", R], ["pano.runway-linear", R],
  ["pano.runway-patron", C], ["pano.movers", R], ["pano.closes", R], ["pano.health-note", C],
  ["pano.health-help", C], ["pano.pillar-spend", C], ["pano.pillar-save", C],
  ["pano.pillar-debt", C], ["pano.pillar-cushion", C], ["pano.pillar-stability", C],
  // §3.2 Estudio
  ["study.flow-simple", E], ["study.flow", R], ["study.month-jar", R],
  ["study.pockets-list", R], ["study.budget-caps", R], ["study.where", R],
  ["study.where-top", R], ["study.where-stores", C], ["study.runway", C],
  ["study.committed", C], ["study.cushion-dial", C], ["study.key-numbers", C],
  ["study.sankey", C], ["study.people", C], ["study.remit", C], ["study.income-sources", C],
  ["study.empty-rule", E], ["study.fold-shell", E], ["study.reorder", C],
  ["study.columns", E], ["study.loans", C], ["study.owed", R],
  // §3.3 Asesor — héroe y pasos
  ["advisor.verdict", E], ["advisor.verdict-sub", R], ["advisor.hero-cubes", R],
  ["advisor.step-income", E], ["advisor.step-name", E], ["advisor.step-keep", E],
  ["advisor.step-close-gap", R], ["advisor.step-set-aside", R], ["advisor.step-wants-30", R],
  ["advisor.step-subs", R], ["advisor.step-cushion", C], ["advisor.step-debts", C],
  ["advisor.pillars", C], ["advisor.plain-words", E],
  // Etapa 4: la sugerencia de subida del Asesor NO estaba en el censo porque
  // no existía (CENSO-FUNCIONES, hecho 4: es pieza nueva de la ola). Nace con
  // modo por el principio 10: Esencial — habla en Esencial y en Ritmo; en
  // Completo no tiene objeto. El manifiesto crece 496 → 497 con esta razón.
  ["advisor.mode-hint", E],
  // §3.4 Asesor — lectura del mes
  ["advisor.headline", E], ["advisor.diagnosis", R], ["advisor.month-tone", R],
  ["advisor.time-label", E], ["advisor.dues-note", E], ["advisor.rate-note", E],
  ["advisor.vague-name", E], ["advisor.method-note", E], ["advisor.lever-keep", E],
  ["advisor.lever-income", E], ["advisor.misclass-note", R], ["advisor.not-habit-note", R],
  ["advisor.trend-note", R], ["advisor.subs-note", R], ["advisor.remit-note", R],
  ["advisor.daily-note", R], ["advisor.three-parts", R], ["advisor.top5", E],
  ["advisor.top5-rich", R], ["advisor.levers-month", R], ["advisor.plan-short", R],
  ["advisor.plan-90", C], ["advisor.scenarios", C], ["advisor.income-stability", R],
  ["advisor.income-stability-floor", C], ["advisor.credit-note", C],
  ["advisor.debt-data-ask", C], ["advisor.undestined-note", C],
  // §3.5 Asesor — tarjetas visuales y reglas
  ["advisor.month-done", E], ["advisor.month-detail", R], ["advisor.what-happened-day", R],
  ["advisor.what-happened-river", R], ["advisor.heaviest", E], ["advisor.heaviest-class", R],
  ["advisor.credit-meter", C], ["advisor.credit-list", C], ["advisor.cards-card", E],
  ["advisor.cards-usage", C], ["advisor.projection-12", C], ["advisor.start-route", R],
  ["advisor.rules-frame", C], ["advisor.rate-foot", E], ["advisor.kicker", C],
  ["advisor.people-tip", C], ["advisor.rewards-note", C],
  ["rule.due", E], ["rule.category", R], ["rule.outlier", R], ["rule.recurring", R],
  ["rule.pace", C], ["rule.goal", C], ["rule.cushion", C], ["rule.floor", C],
  ["rule.overcommit", C], ["rule.insurance", C],
  // §3.6 Patrón de Ritmo
  ["patron.learning", C], ["patron.verdict", C], ["patron.sayings", C],
  ["patron.linear-pace", R], ["patron.history-rules", C], ["patron.month-rules", R],
  ["patron.model-rules", C],
  // §3.7 Asesor de área
  ["area.frame", C], ["area.bars-6m", R], ["area.plain-phrase", R], ["area.overdue", E],
  ["area.owed-marks", E], ["area.owed-track", R], ["area.income-drift", R],
  ["area.setaside", R], ["area.retiro-paused", R], ["area.remit-up", R],
  ["area.meta-path", C], ["area.emergency-months", C], ["area.loans-path", C],
  ["area.debt-free", C], ["area.debt-stuck", C], ["area.rules-split", C],
  // §3.8 Capa despierta
  ["awake.savings-photo", C], ["awake.goals-horizon", C], ["awake.undestined", C],
  ["awake.destination-projection", C], ["awake.recalc-notices", R],
  ["awake.recalc-simple", E], ["awake.stale-plan", R], ["awake.materiality", E],
  // La maquinaria de los modos y la pieza de la etapa 4
  ["mode.impact-screen", E], ["mode.gate", E], ["mode.mute-row", E], ["desk.today-spend", E],
];

describe("tres modos, etapa 2 — el registro completo contra el censo", () => {
  it("cada fila del manifiesto tiene su entrada, con su modo, y no sobra ninguna", () => {
    const seen = new Set<string>();
    for (const [id, mode] of MANIFEST) {
      assert.ok(!seen.has(id), `el manifiesto repite ${id}`);
      seen.add(id);
      assert.equal(FEATURES[id], mode, `${id}: el censo (con D-bis) dice ${mode} y el registro dice ${FEATURES[id]}`);
    }
    assert.equal(Object.keys(FEATURES).length, MANIFEST.length,
      `el registro trae ${Object.keys(FEATURES).length} entradas y el manifiesto ${MANIFEST.length}: sobra o falta una fila`);
  });

  it("la inclusión es monótona: lo que vive en un modo vive en los de arriba", () => {
    for (const id of Object.keys(FEATURES) as FeatureId[]) {
      if (hasFeature("esencial", id)) assert.ok(hasFeature("ritmo", id) && hasFeature("completo", id), `${id} vive en Esencial y debe vivir arriba`);
      if (hasFeature("ritmo", id)) assert.ok(hasFeature("completo", id), `${id} vive en Ritmo y debe vivir en Completo`);
      assert.ok(hasFeature("completo", id), `${id} debe vivir en Completo: Completo es el Faro entero`);
    }
  });

  it("los fallos D-bis que contradijeron al censo quedan fijados", () => {
    // D-bis 4: la selección múltiple ENTERA en Ritmo (el censo partía mover a Completo).
    assert.ok(hasFeature("ritmo", "selection.move") && !hasFeature("esencial", "selection.move"));
    // D-bis 5: la cadencia básica del fijo se declara al registrar, en Esencial.
    assert.ok(hasFeature("esencial", "subs.cadence-basic"));
    // D-bis 9: tienda y categoría de la compra también en Esencial; lo fino, en Completo.
    assert.ok(hasFeature("esencial", "editor.shop-fields") && !hasFeature("ritmo", "editor.shop-fine"));
    // D-bis 36: en Esencial la pregunta de naturaleza llega siempre; la postura es de Ritmo.
    assert.ok(hasFeature("esencial", "nature.ask") && !hasFeature("esencial", "settings.nature-stance") && hasFeature("ritmo", "settings.nature-stance"));
    // D-bis 37: la tasa manual se puede teclear desde Esencial.
    assert.ok(hasFeature("esencial", "tools.rate-manual") && hasFeature("esencial", "settings.rate-manual"));
    // D-bis 22 + X-6: el veredicto del Patrón en el widget es de Completo, sin forma en Ritmo.
    assert.ok(!hasFeature("ritmo", "widget.face-pace") && hasFeature("completo", "widget.face-pace"));
    // D-bis 15: el par de Folios se queda en los tres modos.
    assert.ok(hasFeature("esencial", "archive.pair"));
    // D-bis 31: los hechos de deuda de los dos lados viven en Esencial.
    assert.ok(hasFeature("esencial", "debt.facts") && hasFeature("esencial", "debt.net") && hasFeature("esencial", "area.overdue"));
    // D-bis 1 y 2: la barra lleva solo Ahorros en Esencial; Retiro es bolsillo en Ritmo y ficha en Completo.
    assert.ok(hasFeature("esencial", "vault.save") && !hasFeature("esencial", "vault.meta") && hasFeature("ritmo", "vault.retiro") && !hasFeature("ritmo", "vault.retiro-sheet"));
    // Las dos tablas de reglas dicen lo mismo (FEATURES §3.5 contra RULE_MIN_MODE de la etapa 1).
    for (const [ruleId, mode] of Object.entries(RULE_MIN_MODE)) {
      assert.equal(FEATURES[`rule.${ruleId}` as FeatureId], mode, `la regla ${ruleId} discrepa entre las dos tablas`);
    }
  });
});

const KEY = "2026-11";

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: p.id, monthKey: KEY, currency: "USD", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...p,
  };
}

/** Un libro rico: ingreso, gasto, cuotas, fondos con naturaleza, tarjetas,
 *  préstamos de los dos lados y personas — con datos dormidos en los tres
 *  modos, para que la cerca de totales muerda de verdad. */
function richBook(): LedgerState {
  const base = withSeguroDeVida(createInitial("es", "claro")).ledger;
  const lines: Line[] = [
    line({ id: "in-1", kind: "income-fixed", concept: "Salario", amountMinor: 200000 }),
    line({ id: "ex-1", kind: "expense-variable", concept: "Mercado", amountMinor: 30000, categoryId: "v-comida", subId: "v.comida.mercado" }),
    line({ id: "sub-1", kind: "subscription", concept: "Streaming", amountMinor: 1500, categoryId: "v-ocio", subId: "v.ocio.stream" }),
    line({ id: "meta-1", kind: "expense-fixed", concept: "Viaje", amountMinor: 5000, categoryId: "f-ahorro", subId: "f.ahorro.meta", fund: "aparte" }),
    line({ id: "ret-1", kind: "expense-fixed", concept: "Retiro", amountMinor: 7000, categoryId: "f-ahorro", subId: "f.ahorro.retiro" }),
    line({ id: "emg-1", kind: "expense-fixed", concept: "Emergencia", amountMinor: 4000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", fund: "saldo", fundHost: "f.ahorro.cuenta" }),
  ];
  return {
    ...base,
    months: { [KEY]: { lines } },
    loans: [{ id: "ln-1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 100000, currency: "USD", aprBps: 0, takenOn: "2026-01-01", book: "fixed", note: "" }],
    lent: [{ id: "lt-1", person: "Ana", kind: "plain", amountMinor: 20000, currency: "USD", aprBps: 0, startedOn: "2026-01-01", dueOn: "2026-12-01", note: "" }],
    cards: [{ id: "cc-1", name: "Azul", issuer: "", mark: "", color: "", last4: "1234", currency: "USD", limitMinor: null, dueDay: 1, aprBps: 0, autopay: null, rewards: "", snaps: [] }],
    people: [{ id: "p-1", name: "Ana", birthday: "", dates: [], note: "" }],
    remitPeople: [{ id: "rp-1", name: "Casa" }],
  };
}

const withMode = (book: LedgerState, mode: Mode): LedgerState => ({ ...book, settings: { ...book.settings, mode } });

describe("tres modos, etapa 2 — los totales no conocen el modo", () => {
  it("el mismo libro suma exactamente lo mismo en Esencial, Ritmo y Completo", () => {
    const book = richBook();
    const figures = (b: LedgerState) => {
      const stock = savingsStock(b, KEY);
      const sav = savingsOf(b, KEY, "es");
      const snap = buildWidgetSnapshot(b, "es", { today: "2026-11-15", hide: false, lock: false, now: "2026-11-15T12:00:00.000Z" });
      return JSON.stringify({
        summary: summarize(b, KEY, "es"),
        slices: categorySlices(b, KEY, makeNamer(b.structure, "es"), "es"),
        net: netBalance(b, "2026-11-15"),
        stock: { total: stock.total, kept: stock.kept, pledged: stock.pledged, series: [...stock.series.values()].map((s) => [s.subId, s.minor, s.cls]) },
        sav: { total: sav.total, kept: sav.kept, pledged: sav.pledged },
        dues: duesWindow(b, 31, "2026-11-15").map((d) => [d.kind, d.id, d.amt]),
        // Etapa 3.3 (T-1, X-24): la foto es una CARA y su composición por modo
        // la cerca modos297 — aquí la foto aporta solo sus cifras de verdad,
        // las que ninguna cara duerme: el héroe (have/spend/left) y
        // los datos de los avisos universales (dues, flow). Los bloques de
        // cara (pay, ahorros, balanza, bolsillos, categorías) salieron de
        // esta comparación al recomponerse la foto en la fuente; los totales
        // del motor (summary/slices/net/stock/sav/dues) no se tocaron.
        // ENMIENDA OLA 3 (BR3-3): usedPct SALE de esta comparación — era la
        // última «cifra héroe» que viajaba con valor en la foto de Esencial
        // (97 con todo lo demás en cero): es spentPct, la semilla de la
        // proyección que BR-2 expulsó de la torre, y su única cara en la
        // foto es la torre de ritmo (Completo, X-6/X-17). La clasificación
        // «héroe» era doctrina de constructor y contradecía la de la propia
        // fuente; desde la ola 3 usedPct se compone por modo (null fuera de
        // Completo) y su composición la cerca modos297, no esta igualdad.
        photo: {
          have: snap.have, spend: snap.spend, left: snap.left,
          dues: snap.dues, flow: snap.flow,
        },
      });
    };
    const base = figures(withMode(book, "completo"));
    assert.equal(figures(withMode(book, "esencial")), base, "Esencial suma lo mismo que Completo, datos dormidos incluidos");
    assert.equal(figures(withMode(book, "ritmo")), base, "Ritmo suma lo mismo que Completo, datos dormidos incluidos");
    // Y las cifras muerden: el libro rico no es un libro vacío disfrazado.
    const s = summarize(withMode(book, "esencial"), KEY, "es");
    assert.ok(s.income > 0 && s.expense > 0, "el libro rico tiene ingreso y gasto reales");
    assert.ok(savingsStock(withMode(book, "esencial"), KEY).total > 0, "el libro rico tiene ahorro real");
  });

  it("la foto del widget lleva el modo de la persona, y solo eso cambia", () => {
    const book = richBook();
    for (const m of ["esencial", "ritmo", "completo"] as const) {
      const snap = buildWidgetSnapshot(withMode(book, m), "es", { today: "2026-11-15", hide: false, lock: false, now: "2026-11-15T12:00:00.000Z" });
      assert.equal(snap.mode, m, `la foto dice ${m}`);
    }
    const sinModo = buildWidgetSnapshot(book, "es", { today: "2026-11-15", hide: false, lock: false, now: "2026-11-15T12:00:00.000Z" });
    assert.equal(sinModo.mode, "completo", "un libro sin el campo se fotografía como Completo");
    assert.equal(modeOf(book.settings), "completo");
  });
});

describe("tres modos, etapa 2 — ningún salto aterriza en la nada", () => {
  it("featureForGo conoce los destinos dormidos de cada tipo de salto", () => {
    // Ajustes (el buscador y el «Ir allí» comparten este mapa).
    assert.equal(featureForGo({ screen: "settings", fold: "banks bk-rewards", anchor: "aj-rewards" }), "settings.bank-rewards-table");
    assert.equal(featureForGo({ screen: "settings", fold: "banks bk-cards", anchor: "aj-cards" }), "settings.bank-sources");
    assert.equal(featureForGo({ screen: "settings", fold: "structure", anchor: "aj-tree" }), "settings.structure-tree");
    assert.equal(featureForGo({ screen: "settings", fold: "rate", anchor: "aj-goal" }), "settings.savings-goal");
    assert.equal(featureForGo({ screen: "settings", fold: "rate", anchor: "aj-nature" }), "settings.nature-stance");
    // La tasa manual NO duerme en Esencial (fallo D-bis 37): su destino nunca cae.
    assert.equal(featureForGo({ screen: "settings", fold: "rate", anchor: "aj-rate" }), "settings.rate-manual");
    assert.ok(hasFeature("esencial", "settings.rate-manual"));
    // Manual / widget: las bóvedas que no son Ahorros duermen en Esencial.
    assert.equal(featureForGo({ screen: "vault-meta" }), "vault.meta");
    assert.equal(featureForGo({ screen: "vault-retiro" }), "vault.retiro");
    assert.equal(featureForGo({ screen: "vault-emergencia" }), "vault.emergencia");
    assert.equal(featureForGo({ screen: "vault-save" }), "vault.save");
    // El plan de pago duerme hasta Completo; los hechos de deuda, nunca.
    assert.equal(featureForGo({ screen: "vault-owe", fold: "debt-plan", anchor: "debt-plan" }), "loans.payoff-plan");
    assert.equal(featureForGo({ screen: "vault-owe", fold: "debt-loans", anchor: "debt-cards" }), "debt.facts");
    assert.equal(featureForGo({ screen: "cobros", anchor: "cobros-in" }), "debt.facts");
    // Estudio y Asesor: el Patrón y el Sankey duermen hasta Completo; los
    // próximos pagos reducidos viven en Esencial.
    assert.equal(featureForGo({ screen: "stats", fold: "pace", anchor: "pace" }), "patron.verdict");
    assert.equal(featureForGo({ screen: "stats", fold: "sankey", anchor: "sankey" }), "study.sankey");
    assert.equal(featureForGo({ screen: "stats", fold: "agenda", anchor: "agenda" }), "pano.next-dues-reduced");
    assert.equal(featureForGo({ screen: "advice", anchor: "advice-sim" }), "advisor.scenarios");
    assert.equal(featureForGo({ screen: "advice", anchor: "coach-pillars" }), "advisor.pillars");
    // El widget: la lente de Pagos duerme en Esencial; Central, nunca.
    assert.equal(featureForGo({ screen: "desk", lens: "debt" }), "central.lens-pagos");
    assert.equal(featureForGo({ screen: "desk" }), null);
    assert.equal(featureForGo({ screen: "subs" }), "books.subs");
    assert.equal(featureForGo({ screen: "historial" }), null);
    // La condición de caída de goTopic, tal cual la evalúa el proveedor:
    const falls = (mode: Mode, go: Parameters<typeof featureForGo>[0]) => {
      const f = featureForGo(go);
      return !!f && !hasFeature(mode, f);
    };
    assert.ok(falls("esencial", { screen: "vault-meta" }), "en Esencial, Meta cae a la explicación");
    assert.ok(!falls("ritmo", { screen: "vault-meta" }), "en Ritmo, Meta aterriza");
    assert.ok(falls("ritmo", { screen: "vault-owe", fold: "debt-plan", anchor: "debt-plan" }), "en Ritmo, el plan de pago aún duerme");
    assert.ok(!falls("completo", { screen: "vault-owe", fold: "debt-plan", anchor: "debt-plan" }), "en Completo, todo aterriza");
    assert.ok(!falls("esencial", { screen: "settings", fold: "rate", anchor: "aj-rate" }), "la tasa manual aterriza también en Esencial");
  });

  it("la búsqueda de Ajustes no ofrece destinos dormidos como destinos vivos", () => {
    const anchors = (hits: ReturnType<typeof searchSettings>) => hits.map((h) => h.go.anchor);
    // La meta de ahorro (Ritmo) no se ofrece en Esencial; en Ritmo encabeza.
    assert.ok(!anchors(searchSettings(MANUAL_TOPICS, "meta de ahorro", "es", 6, "esencial")).includes("aj-goal"));
    assert.equal(searchSettings(MANUAL_TOPICS, "meta de ahorro", "es", 6, "ritmo")[0]!.go.anchor, "aj-goal");
    // El catálogo (su administración es de Ritmo) tampoco se ofrece en Esencial.
    assert.ok(!anchors(searchSettings(MANUAL_TOPICS, "catálogo", "es", 6, "esencial")).includes("aj-catalog"));
    assert.equal(searchSettings(MANUAL_TOPICS, "catálogo", "es", 6, "completo")[0]!.go.anchor, "aj-catalog");
    // Lo que vive en Esencial sigue encontrándose en Esencial: la tasa manual
    // (fallo D-bis 37) y la actividad (universal, sin función en el registro).
    assert.equal(searchSettings(MANUAL_TOPICS, "tasa manual", "es", 6, "esencial")[0]!.go.anchor, "aj-rate");
    assert.equal(searchSettings(MANUAL_TOPICS, "actividad", "es", 6, "esencial")[0]!.go.anchor, "aj-activity");
    // Sin modo (el default), la búsqueda se comporta como siempre: Completo.
    assert.equal(searchSettings(MANUAL_TOPICS, "meta de ahorro", "es")[0]!.go.anchor, "aj-goal");
  });
});

describe("tres modos, etapa 2 — el registro solo se consume por su punto", () => {
  it("ninguna superficie importa mode.ts ni toca el registro fuera de su asiento", () => {
    const walk = (dir: URL, acc: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const child = new URL(name, dir);
        if (statSync(child).isDirectory()) { if (name !== "node_modules" && name !== "dist") walk(new URL(`${name}/`, dir), acc); }
        else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) acc.push(child.pathname);
      }
      return acc;
    };
    const files = walk(new URL("../../", import.meta.url));
    const rel = (f: string) => f.split("/src/")[1] ?? f;
    // Los únicos archivos que pueden importar el módulo del modo: el proveedor
    // (el contexto), la puerta y el selector de la etapa 1, la búsqueda de
    // Ajustes y la foto del widget (la fontanería declarada de la etapa 2).
    // Etapa 5 añade TRES asientos de enseñanza, declarados aquí con su razón:
    // la Presentación (su índice y su director leen el modo de la persona),
    // el Manual (su índice se recompone por modo) y la burbuja (sus puentes
    // siguen al modo). Los tres consumen SOLO el comparador de rangos
    // (modeReaches) y el tipo — jamás el registro, que sigue tras useFaro().has.
    const importSeats = new Set([
      "components/faro/provider.tsx", "components/faro/mode-gate.tsx", "components/faro/screens.tsx",
      "lib/faro/settings-search.ts", "lib/faro/widget.ts",
      "components/faro/presentacion.tsx", "components/faro/manual.tsx", "components/faro/hint.tsx",
      // 1.3.319 (EL SUSURRO DEL MODO): el puente de la petición de modo
      // consume SOLO el tipo Mode — jamás el registro, como los asientos
      // de enseñanza; entra también en rankOnlySeats y el chequeo de abajo
      // cubre la forma `import type`.
      "lib/faro/mode-ask.ts",
    ]);
    const rankOnlySeats = new Set([
      "components/faro/presentacion.tsx", "components/faro/manual.tsx", "components/faro/hint.tsx",
      "lib/faro/mode-ask.ts",
    ]);
    // Y el registro mismo (FEATURES y sus dos lectores) solo vive en tres
    // asientos: su casa, el proveedor y la búsqueda de Ajustes.
    const registrySeats = new Set(["lib/faro/mode.ts", "components/faro/provider.tsx", "lib/faro/settings-search.ts"]);
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      const name = rel(f);
      if (/from\s+"[^"]*lib\/faro\/mode"|from\s+"\.\/mode"/.test(text)) {
        assert.ok(importSeats.has(name), `${name} importa mode.ts fuera de los asientos declarados`);
        if (rankOnlySeats.has(name)) {
          const imported = [...text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s+"[^"]*(?:lib\/faro\/mode"|\.\/mode")/g)].flatMap((m) => m[1]!.split(",").map((s) => s.trim().replace(/^type\s+/, "")));
          assert.ok(imported.every((s) => s === "modeReaches" || s === "Mode"), `${name} (asiento de enseñanza) importa de mode.ts algo más que el rango: ${imported.join(", ")}`);
        }
      }
      if (/\bFEATURES\b|\bfeatureForGo\b|\bhasFeature\b|\bfeatureMinMode\b/.test(text)) {
        assert.ok(registrySeats.has(name), `${name} toca el registro fuera de su asiento (el filtro es el contexto: useFaro().has)`);
      }
    }
  });
});
