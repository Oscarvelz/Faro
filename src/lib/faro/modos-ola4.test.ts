/**
 * FARO — «Los tres modos», OLA 4 DE PREJUICIO: las cercas de la cura.
 *
 * Lo que cerca este archivo, cura por cura (el expediente vive en
 * ~/workspace/faro-modes-prejudice/OLA4-*.md y la cura en CURA-OLA4.md):
 *
 *  - Cara O4-C2/C3/C4/C6/C8/C9/C10 (fallo 25: el tema sigue a la FUNCIÓN,
 *    no al capítulo): el mapa declarado tema→función — el modo de cada
 *    tema adjudicado es el del asiento de la función que enseña, cruzado
 *    contra el registro. Un tema nuevo que enseñe una función nace cosido
 *    o esta cerca lo caza al declararlo en el mapa.
 *  - Cara O4-C5: la burbuja (?) de un tema dormido ANUNCIA sin enseñar —
 *    solo la llave corta; la explicación espera en el Manual. El aviso
 *    largo queda en el salto (goTopic), donde el Manual sí la abre.
 *  - Cara O4-C1: el engranaje del conversor y su panel viven tras
 *    tools.converter-chips-admin (Completo).
 *  - Asesor BR4-1: el promedio diario de la cara de Ritmo divide entre
 *    los días VIVIDOS de la foto (perDayLived); el motor de Completo
 *    (perDay, coverDays) no se toca.
 *  - Asesor BR4-2/BR4-3: DueSide suma y declara sobre la ventana ENTERA
 *    (vencidos y próximos); la fila «+N más» de la Agenda habla el idioma
 *    de tres ramas en su propia superficie.
 *  - Cambios C4-1: la confirmación del re-planteado compara premisas
 *    vivas como su padre — jamás aplica una bajada con palabras de subida
 *    ni anuncia una mudanza que no hizo.
 *  - Enseñanza E4-1: la casa de ejemplo trae una línea fija fechada (la
 *    Despensa, primera burbuja de Fijos) para que el bote pueda enseñarse
 *    dentro de la casa; el arco evoluciona a v4 con la regla de ascenso
 *    de siempre (la casa pura se reemplaza, la editada jamás se toca).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readCoach } from "./coach.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { translate } from "./i18n.ts";
import { FEATURES, type FeatureId, type Mode } from "./mode.ts";
import { payDates } from "./money.ts";
import { buildSampleArc, isPureArcSample, isPureArcSampleV3, sampleArcLines, sampleArcLinesV3, withSampleArc, SAMPLE_V4_SEED } from "./sample.ts";
import { findTopic, topicMode } from "../manual/topics.ts";
import type { LedgerState, Line } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ═══════════ 1 · EL TEMA SIGUE A LA FUNCIÓN (O4-C2/C3/C4/C6/C9/C10) ═══════════ */

describe("ola4 · el modo del tema es el de su función (fallo 25)", () => {
  /** EL MAPA DECLARADO tema→función: los temas adjudicados en la ola 4 y
   *  las parejas que ya cosían bien (plan-pago, tc-uso, ordenar-estudio),
   *  fijadas para que el próximo tema nazca cosido. donde-vive va sin
   *  asiento a propósito: su función es la PREGUNTA al crear (fallo 36 —
   *  Esencial pregunta siempre), no la postura a la que su salto apunta
   *  (settings.nature-stance, Ritmo: la caída de ese salto habla verdad). */
  const MAP: Record<string, FeatureId | null> = {
    "deudas-grafica": "debt.chart", // C2: enseñaba la gráfica de Completo declarándose Esencial
    "tc-total": "debt.facts", // C9: hechos pintados en Esencial (fallo 31)
    "tc-minimo": "debt.facts",
    "tc-fecha": "debt.facts",
    "tasa": "tools.rate-view", // C3: la tasa se ve y se escribe a mano en Esencial (fallo 37)
    "convertidor": "tools.converter", // C4: el conversor se usa en Esencial (fallo 37)
    "donde-vive": null, // C10: la pregunta que la persona está respondiendo en Esencial
    "si-apartas": "vault.lever", // C6: la palanca es de Completo (fallo 22)
    "meses-colchon": "settings.cushion-months", // C6: la meta de colchón es de Completo
    "cambio-ajustes": "tools.converter-chips-admin", // el tema DEL engranaje (O4-C1): su función ganó puerta en Completo
    "plan-pago": "loans.payoff-plan", // pareja ya cosida: no se mueve
    "tc-uso": "advisor.cards-usage", // pareja ya cosida: no se mueve
    "ordenar-estudio": "study.reorder", // pareja ya cosida: no se mueve
  };
  for (const [id, seat] of Object.entries(MAP)) {
    it(`el tema ${id} declara el modo de su función${seat ? ` (${seat})` : ""}`, () => {
      const tp = findTopic(id);
      assert.ok(tp, `el tema ${id} existe`);
      const expected: Mode = seat ? FEATURES[seat] : "esencial";
      assert.equal(topicMode(tp), expected, `${id} debe vivir en ${expected}, no en el modo de su capítulo`);
    });
  }

  it("ahorros-tabs se queda en Ritmo: su cara entera (las cuatro bolsas) es de Ritmo (O4-C8)", () => {
    // Adjudicación de la cura: el break de ahorros-tabs no era su modo —
    // era que la burbuja lo ENSEÑABA en Esencial. Muerto eso (O4-C5), el
    // tema cuenta la cara completa de Ahorros, que nace en Ritmo.
    assert.equal(topicMode(findTopic("ahorros-tabs")!), "ritmo");
  });
});

/* ═══════════ 2 · LA BURBUJA ANUNCIA SIN ENSEÑAR (O4-C5) ═══════════ */

describe("ola4 · la burbuja del tema dormido anuncia sin enseñar (O4-C5)", () => {
  it("con el tema dormido la burbuja pinta solo el anuncio corto, nunca el cuerpo", () => {
    const hint = SRC("../../components/faro/hint.tsx");
    assert.ok(hint.includes('topicSleeps ? <span className="hint-dormant">{t("mode.dormant.short")'),
      "la rama dormida pinta la llave corta y nada más");
    assert.ok(hint.includes(': richText(data.bubbleText(entry, lang, alt)'),
      "el cuerpo del tema solo se pinta en la rama viva");
    assert.ok(!hint.includes('t("mode.dormant.notice")'),
      "el aviso largo («Aquí tienes su explicación») no vive en la burbuja: sin explicación debajo, su segunda frase mentiría");
  });

  it("el aviso largo queda en el salto, donde el Manual abre la explicación", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    assert.ok(provider.includes('t("mode.dormant.notice")'),
      "goTopic sigue anunciando con la explicación abierta en el Manual: allí la frase es verdad");
  });

  it("la llave corta existe en los dos idiomas, con el mismo hueco", () => {
    assert.equal(translate("es", "mode.dormant.short"), "Eso vive en {name}.");
    assert.equal(translate("en", "mode.dormant.short"), "That lives in {name}.");
  });
});

/* ═══════════ 3 · EL ENGRANAJE DEL CONVERSOR (O4-C1) ═══════════ */

describe("ola4 · el engranaje del conversor vive en Completo (O4-C1)", () => {
  it("el botón del engranaje y el panel nacen tras tools.converter-chips-admin", () => {
    const ins = SRC("../../components/faro/instruments.tsx");
    assert.ok(ins.includes('const chipsAdminOk = has("tools.converter-chips-admin")'),
      "el asiento C sin consumidor desde la ola 1 gana su lectura literal");
    assert.ok(ins.includes("{chipsAdminOk ? ("), "el botón del engranaje solo nace con su puerta");
    assert.ok(ins.includes("prefsOn && chipsAdminOk ? <CvSettings"),
      "el panel de administración no se monta por debajo de Completo ni con el estado abierto");
  });
});

/* ═══════════ 4 · EL DENOMINADOR (BR4-1) ═══════════ */

describe("ola4 · el promedio de Ritmo divide entre los días vividos (BR4-1)", () => {
  const KEY = "2026-11";
  let seq = 0;
  const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }): Line => {
    seq += 1;
    const id = `l${seq}`;
    return {
      id, seriesId: id, monthKey: KEY, concept: "", currency: "NIO", active: true, note: "",
      categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
      productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
      icon: "", history: [], ...partial,
    } as Line;
  };
  const book = (mode: Mode, outMinor: number): LedgerState => {
    const b = createInitial("es", "claro");
    b.settings.mode = mode;
    b.months[KEY] = { lines: [
      line({ kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000 }),
      line({ kind: "expense-fixed", concept: "Gasto", amountMinor: outMinor }),
    ] };
    return b;
  };
  const coachOf = (b: LedgerState, day: number) =>
    readCoach(b, KEY, "es", makeNamer(b.structure, "es"), new Date(2026, 10, day, 12));

  it("día 16, C$15,000 fuera: la nota de Ritmo dice C$937.50 al día en 16 días, no C$500.00", () => {
    const c = coachOf(book("ritmo", 1_500_000), 16);
    assert.equal(c.perDayLived, 93750, "el promedio vivido es lo salido entre los días corridos");
    assert.equal(c.perDay, 50000, "perDay (el motor de Completo) no se toca: sigue siendo el del mes entero");
    assert.ok(c.paceNote.includes("C$937.50") && c.paceNote.includes("en 16 días"),
      `la nota cuadra cifra y días: ${c.paceNote}`);
    assert.ok(!c.paceNote.includes("C$500.00"), "la cifra del mes entero ya no se presenta como el promedio vivido");
  });

  it("día 2, C$3,000 fuera: el promedio vivido es C$1,500.00", () => {
    const c = coachOf(book("ritmo", 300_000), 2);
    assert.equal(c.perDayLived, 150000);
    assert.ok(c.paceNote.includes("C$1,500.00") && c.paceNote.includes("en 2 días"), c.paceNote);
  });

  it("la PaceCard pinta perDayLived fuera de Completo y perDay en Completo", () => {
    const pano = SRC("../../components/faro/panorama.tsx");
    assert.ok(pano.includes("full ? coach.perDay : coach.perDayLived"),
      "la cifra del titular y la nota cuentan el mismo mes corrido");
  });
});

/* ═══════════ 5 · DUESIDE Y LA AGENDA (BR4-2 / BR4-3) ═══════════ */

describe("ola4 · DueSide cuenta la ventana entera y la Agenda habla de tres ramas (BR4-2/BR4-3)", () => {
  // Réplica de las fórmulas de las superficies (el método de la casa para
  // componentes: pines de fuente abajo + la fórmula corrida sobre los
  // especímenes reales de la ola; el banco CDP verifica la cara viva).
  const fmt = (n: number) => `C$${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  type Row = { days: number; amt: number | null };
  const dueHeadline = (rows: Row[]): string => {
    const late = rows.filter((r) => r.days < 0);
    const list = rows;
    const known = list.reduce((a, r) => a + (r.amt ?? 0), 0);
    const unknown = list.filter((r) => r.amt == null).length;
    const parts = [known > 0 ? fmt(known) : "—"];
    if (late.length) parts.push(`${late.length} vencida${late.length > 1 ? "s" : ""}`);
    if (unknown) parts.push(`${unknown} sin importe conocido`);
    return parts.join(" · ");
  };
  const agendaMore = (hidden: (number | null)[]): string => {
    const known = hidden.reduce((a: number, d) => a + (d ?? 0), 0);
    const unknown = hidden.filter((d) => d == null).length;
    return hidden.length === 0 ? "" : unknown === 0
      ? `+${hidden.length} más · ${fmt(known)}`
      : known > 0
        ? `+${hidden.length} más · ${fmt(known)} · algunos sin importe conocido`
        : `+${hidden.length} más · sin importe conocido`;
  };

  it("los especímenes de DueSide: ningún C$0.00 inventado, ningún vencido mudo", () => {
    assert.equal(dueHeadline([{ days: -6, amt: null }]), "— · 1 vencida · 1 sin importe conocido", "S-A: solo un préstamo vencido");
    assert.equal(dueHeadline([{ days: -6, amt: 25000 }]), "C$250.00 · 1 vencida", "S-B: solo una tarjeta vencida con mínimo");
    assert.equal(dueHeadline([{ days: -6, amt: null }, { days: 5, amt: 25000 }]), "C$250.00 · 1 vencida · 1 sin importe conocido", "S-C: vencido sin cifra + próximo cifrado");
    // S-D cambia con la lectura de la cura (ver CURA-OLA4.md): su «—» de la
    // ola 4 escondía un mínimo vencido conocido de C$250 pintado en su fila.
    assert.equal(dueHeadline([{ days: -6, amt: 25000 }, { days: 5, amt: null }]), "C$250.00 · 1 vencida · 1 sin importe conocido", "S-D: vencido cifrado + próximo sin cifra");
    assert.equal(dueHeadline([{ days: 5, amt: null }]), "— · 1 sin importe conocido", "S-E: préstamo por vencer solo (como hoy)");
    assert.equal(dueHeadline([{ days: 5, amt: null }, { days: 9, amt: 25000 }]), "C$250.00 · 1 sin importe conocido", "S-F: préstamo + tarjeta por vencer (como hoy)");
  });

  it("DueSide suma y declara sobre `list` (vencidos y próximos), no sobre la mitad por-vencer", () => {
    const side = SRC("../../components/faro/book-side.tsx");
    assert.ok(side.includes("const known = list.reduce((a, r) => a + (r.amt ?? 0), 0);"));
    assert.ok(side.includes("const unknown = list.filter((r) => r.amt == null).length;"));
    assert.ok(side.includes('known > 0 ? fmt(known) : "—"'), "la cifra es «—» solo cuando nada tiene importe");
    assert.ok(!side.includes("soonKnown") && !side.includes("soonUnknown"),
      "las sumas de la mitad por-vencer de la ola 3 ya no existen");
  });

  it("los especímenes de la Agenda: la fila «+N más» sin suma inventada ni «algunos» falso", () => {
    assert.equal(agendaMore([null]), "+1 más · sin importe conocido", "A1: el oculto sin cifra no pinta C$0.00");
    assert.equal(agendaMore([null, null]), "+2 más · sin importe conocido");
    assert.equal(agendaMore([25000, null]), "+2 más · C$250.00 · algunos sin importe conocido", "mezcla: suma de lo cifrado y declaración");
    assert.equal(agendaMore([25000, 10000]), "+2 más · C$350.00", "todos con cifra: la suma sola");
  });

  it("la Agenda computa su fila «+N más» con las tres ramas en su propia superficie", () => {
    const pano = SRC("../../components/faro/panorama.tsx");
    assert.ok(pano.includes("const moreText = hiddenDues.length === 0"), "la fila nace de su propio corte oculto");
    assert.ok(pano.includes("more · no known amount") && pano.includes("más · sin importe conocido"),
      "la rama sin cifra existe en los dos idiomas, sin suma");
    assert.ok(pano.includes('<li className="pano-more">{moreText}</li>'), "la frase fijada es la que la fila pinta");
  });
});

/* ═══════════ 6 · EL RE-PLANTEADO CON PREMISAS VIVAS (C4-1) ═══════════ */

describe("ola4 · la confirmación del re-planteado compara premisas (C4-1)", () => {
  it("el onConfirm del ModeReposedDialog re-lee el modo vivo antes de aplicar", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    const start = screens.indexOf("<ModeReposedDialog");
    assert.ok(start > 0, "el diálogo re-planteado existe");
    const block = screens.slice(start, screens.indexOf("/>", start));
    assert.ok(block.includes("live === target"), "si el destino ya llegó, cierra en silencio veraz");
    assert.ok(block.includes("modeRank(target) < modeRank(live)"),
      "si la dirección se invirtió otra vez, la bajada se re-plantea, no se aplica");
    assert.ok(block.includes("setModeImpactState"), "la bajada verdadera se plantea con su pantalla de impacto");
    assert.ok(block.includes("announceUp(live, target)"), "la subida se anuncia desde el modo VIVO");
    assert.ok(!block.includes("announceUp(from, target)"),
      "el `from` congelado al plantearse ya no anuncia ninguna mudanza");
  });
});

/* ═══════════ 7 · LA CASA Y EL BOTE (E4-1) ═══════════ */

describe("ola4 · la casa trae una línea fija fechada y el arco asciende a v4 (E4-1)", () => {
  it("la primera burbuja de Fijos de cada mes de la casa es una línea con cadencia y fechas", () => {
    const arc = buildSampleArc(createInitial("es"));
    for (const key of Object.keys(arc.months)) {
      const first = (arc.months[key]?.lines ?? []).find((l) => l.kind === "expense-fixed");
      assert.ok(first, `${key}: la casa tiene fijos`);
      assert.equal(first!.concept, "Despensa y mercado", `${key}: la primera burbuja es la Despensa`);
      assert.ok(first!.cadence && first!.startedOn, `${key}: la Despensa trae cadencia y fecha de arranque`);
      assert.ok(payDates(first!.startedOn!, first!.cadence!).length > 0,
        `${key}: el informe del bote tiene fechas que contar en la casa`);
    }
    assert.equal(isPureArcSample(arc), true, "la casa construida es pura en su generación");
  });

  it("la regla de ascenso: la casa v3 pura se reemplaza por la v4; la editada jamás se toca", () => {
    const built = buildSampleArc(createInitial("es"));
    const v3: LedgerState = {
      ...built,
      months: Object.fromEntries(sampleArcLinesV3().reduce<[string, { lines: Line[] }][]>((acc, l) => {
        const g = acc.find(([k]) => k === l.monthKey);
        if (g) g[1].lines.push(l); else acc.push([l.monthKey, { lines: [l] }]);
        return acc;
      }, [])),
      settings: { ...built.settings, seeds: ["sample-v2", "sample-v3"] },
    };
    assert.equal(isPureArcSampleV3(v3), true, "la plantilla v3 congelada reconoce su casa");
    assert.equal(isPureArcSample(v3), false, "la casa v3 no se disfraza de v4");
    const up = withSampleArc(v3);
    assert.equal(up.added, true, "la casa v3 pura asciende");
    assert.equal(isPureArcSample(up.ledger), true);
    assert.ok((up.ledger.settings.seeds ?? []).includes(SAMPLE_V4_SEED));
    const edited = structuredClone(v3);
    edited.months["2026-08"]!.lines[0]!.amountMinor += 500;
    assert.equal(withSampleArc(edited).added, false, "la casa v3 jugada es de su dueño: no se toca");
    assert.equal(sampleArcLines().length, 128, "el arco no gana ni pierde filas: la Despensa solo se fecha");
  });

  it("el informe del bote no cambia su puerta: sin cadencia y fecha, no hay bote", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes("line.startedOn && line.cadence ? payDates(line.startedOn, line.cadence) : []"),
      "la cura es de la semilla de la casa, no del informe: su condición queda como estaba");
  });
});
