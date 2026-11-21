/**
 * modos-ola5 — la cerca de la cura de la OLA 5 de prejuicio contra los modos
 * (equipo amigo, ronda 5). Cada break de la ola con su pin: el espécimen que
 * lo condenó, corrido contra el código real.
 *
 *   §1 BR5-1 · el mes futuro cuenta 0 días vividos (Asesor V)
 *   §2 BR5-2 · el promedio «de gasto» de Ritmo no suma lo apartado (Asesor V)
 *   §3 G5-1  · el bote lee el libro, no proyecta la línea abierta (Guardián V)
 *   §4 O5-C1/C2/C3 + el cruce completo · el tema en el modo de su función
 *   §5 O5-C4 · el salto de escanear aterriza en la puerta del escaneo
 *   §6 O5-C5 · la burbuja anuncia corto y tiende el puente; el Manual abre
 *              el tema dormido COMO explicación
 *   §7 E5-1  · los enlaces del Manual se deduplican por tema, no por destino
 *   §8 OBS-C5-1 · la puerta de conflicto nunca sobrescribe una divergencia
 *              viva, y el banner solo promete lo que guardó
 *   §9 Guardián V (obs. 1 y 3) · los límites declarados de la pureza del arco
 *   §10 O5-C6 · EL MAPA COMPLETO tema→función: los 354 temas, sin excepción
 *
 * Lo que esta cerca NO toca, por juicio de Oscar: SOS-1 (el gatillo de
 * sugerencia de subida) y el progreso compartido casa↔libro.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readCoach } from "./coach.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { translate } from "./i18n.ts";
import { FEATURES, featureForGo, type FeatureId, type Mode } from "./mode.ts";
import { apartDecision } from "./packguard.ts";
import { buildSampleArc, isPureArcSampleV3, sampleArcLines, sampleArcLinesV3, withSampleArc } from "./sample.ts";
import { findTopic, topicMode, MANUAL_TOPICS } from "../manual/topics.ts";
import { linkDest } from "../manual/links.ts";
import type { LedgerState, Line } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ═══════════ §1–§2 · EL ASESOR: LA FRASE DE RITMO DICE LA VERDAD (BR5-1, BR5-2) ═══════════ */

let seq = 0;
const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }, key: string): Line => {
  seq += 1;
  const id = `l${seq}`;
  return {
    id, seriesId: id, monthKey: key, concept: "", currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
    icon: "", history: [], ...partial,
  } as Line;
};
const book = (mode: Mode, key: string, lines: Line[]): LedgerState => {
  const b = createInitial("es", "claro");
  b.settings.mode = mode;
  b.months[key] = { lines };
  return b;
};
const coachOf = (b: LedgerState, key: string, lang: "es" | "en", day = 16) =>
  readCoach(b, key, lang, makeNamer(b.structure, lang), new Date(2026, 10, day, 12));
const income = (key: string) => line({ kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000 }, key);
const gasto = (key: string, minor: number) => line({ kind: "expense-variable", concept: "Mercado", amountMinor: minor }, key);
const apartado = (key: string, minor: number) =>
  line({ kind: "expense-fixed", concept: "Apartado a Meta", amountMinor: minor, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, key);

describe("ola5 · BR5-1: el mes futuro cuenta 0 días vividos", () => {
  const FUT = "2026-12"; // diciembre, con hoy = 16 de noviembre de 2026
  const mk = () => book("ritmo", FUT, [income(FUT), gasto(FUT, 1_500_000)]);

  it("perDayLived es 0: no hay promedio de un mes que no ha empezado", () => {
    const c = coachOf(mk(), FUT, "es");
    assert.equal(c.perDayLived, 0, "el futuro no se divide entre sus 31 días como si estuvieran vividos");
  });

  it("la nota ES no dice «en 31 días»: registra lo anotado, sin verbos de gasto ni de promedio", () => {
    const n = coachOf(mk(), FUT, "es").paceNote;
    assert.ok(!n.includes("31 días"), `ningún día corrido se afirma: ${n}`);
    assert.ok(!n.includes("en promedio"), `sin promedio en un mes sin días: ${n}`);
    assert.ok(n.includes("Ya anotaste C$15,000.00") && n.includes("te queda C$15,000.00"), `la verdad del mes futuro: ${n}`);
  });

  it("la nota EN dice lo mismo: recorded, no promedio, ningún día vivido", () => {
    const n = coachOf(mk(), FUT, "en").paceNote;
    assert.ok(!n.includes("31 days"), n);
    assert.ok(n.includes("already recorded"), n);
  });

  it("el mes pasado NO se toca: todos sus días están vividos y la frase lo sigue diciendo", () => {
    const PAST = "2026-10";
    const b = book("ritmo", PAST, [income(PAST), gasto(PAST, 1_550_000)]);
    const c = coachOf(b, PAST, "es");
    assert.equal(c.perDayLived, 50000, "octubre entero: C$15,500.00 entre 31 días vividos");
    assert.ok(c.paceNote.includes("en 31 días"), `el pasado equiparado aguantó: ${c.paceNote}`);
  });

  it("la PaceCard no pinta un promedio en un mes futuro fuera de Completo: pinta «—»", () => {
    const pano = SRC("../../components/faro/panorama.tsx");
    assert.ok(pano.includes("full ? coach.perDay : coach.perDayLived"),
      "la pareja cifra/nota de la ola 4 queda intacta");
    assert.ok(pano.includes("elapsed === 0 ? \"—\" : fmt(full ? coach.perDay : coach.perDayLived)"),
      "con 0 días corridos la cifra es «—», como el «—» que Completo ya pinta sin cobertura");
  });
});

describe("ola5 · BR5-2: el promedio «de gasto» de Ritmo no suma lo apartado", () => {
  const KEY = "2026-11";
  const sereno = () => book("ritmo", KEY, [income(KEY), gasto(KEY, 1_000_000), apartado(KEY, 500_000)]);

  it("el espécimen se sostiene: la Lectura clasifica el apartado como ahorro (saved = C$5,000)", () => {
    assert.equal(coachOf(sereno(), KEY, "es").saved, 500_000);
  });

  it("perDayLived divide el GASTO entre los días vividos: C$625.00, no C$937.50", () => {
    const c = coachOf(sereno(), KEY, "es");
    assert.equal(c.perDayLived, 62500, "C$10,000 de gasto en 16 días; los C$5,000 apartados siguen siendo de la persona");
    assert.ok(c.paceNote.includes("Gastas en promedio C$625.00 al día"), c.paceNote);
    assert.ok(c.paceNote.includes("Llevas C$10,000.00 en 16 días"), `lo llevado es el gasto: ${c.paceNote}`);
    assert.ok(!c.paceNote.includes("Llevas C$15,000.00"), "la suma mezclada ya no se titula con el verbo de gasto");
  });

  it("la nota EN cuenta el mismo gasto: «You have spent C$10,000.00 over 16 days»", () => {
    const n = coachOf(sereno(), KEY, "en").paceNote;
    assert.ok(n.includes("You spend about C$625.00 a day"), n);
    assert.ok(n.includes("You have spent C$10,000.00 over 16 days"), n);
  });

  it("la rama de sobregasto: apartado C$25,000 — el promedio sigue siendo el del gasto (C$625.00)", () => {
    const b = book("ritmo", KEY, [income(KEY), gasto(KEY, 1_000_000), apartado(KEY, 2_500_000)]);
    const c = coachOf(b, KEY, "es");
    assert.equal(c.perDayLived, 62500);
    assert.ok(!c.paceNote.includes("C$2,187.50"), `la cifra condenada no vuelve: ${c.paceNote}`);
    // Pin enmendado el 2026-11-18 (1.3.316) con su razón: la absolución
    // de BR5-2 («salió nombra la salida total, que es verdad») quedó
    // SUPERADA por la adjudicación de Oscar de OBS-A7-1 — apartar no es
    // salir: la rama de sobregasto parte la salida en su verdad y la
    // suma C$35,000.00 ya no se titula «salió» en ninguna frase.
    assert.ok(!c.paceNote.includes("Ya salió C$35,000.00"),
      `la suma ya no se titula «salió» (OBS-A7-1): ${c.paceNote}`);
    assert.ok(c.paceNote.includes("Ya salió C$10,000.00 y apartaste C$25,000.00"),
      `la salida partida en su verdad: ${c.paceNote}`);
  });

  it("el motor del Patrón NO se toca: perDay sigue mezclando sobre el mes entero (Completo)", () => {
    const c = coachOf(sereno(), KEY, "es");
    assert.equal(c.perDay, 50000, "perDay = (gasto + apartado) / 30: la proyección de disponibilidad de Completo, intacta");
  });
});

/* ═══════════ §3 · G5-1: EL BOTE LEE EL LIBRO (Guardián V) ═══════════ */

describe("ola5 · G5-1: el total del bote es lo anotado, no la proyección de la línea abierta", () => {
  it("el espécimen vive en la casa: la Despensa es una serie de importes variables que suma C$21,000", () => {
    const desp = sampleArcLines().filter((l) => l.concept === "Despensa y mercado");
    assert.equal(desp.length, 6, "seis meses de Despensa");
    assert.ok(new Set(desp.map((l) => l.amountMinor)).size > 1, "importes variables: la proyección de uno solo no puede cuadrar");
    assert.equal(desp.reduce((a, l) => a + l.amountMinor, 0), 2_100_000, "el anotado verdadero de la serie");
  });

  it("el componente ya no multiplica la línea abierta por las fechas vistas", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(!screens.includes("each * seen.length"), "la proyección condenada salió del PotReport");
    assert.ok(screens.includes("byDate.get(date) ?? each"),
      "cada fecha vista vale su importe ANOTADO; el importe de la línea abierta solo estima una fecha sin anotar");
  });

  it("la cuenta de pagos cuenta líneas anotadas, no fechas del calendario contra hoy", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(!screens.includes("String(dates.length)"), "desde diciembre el calendario ya no inventa un séptimo pago");
    assert.ok(screens.includes("paysCount"), "los pagos son los que el libro tiene anotados hasta hoy");
  });

  it("la puerta del bote no cambia: sin cadencia y fecha de arranque, no hay bote", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes("line.startedOn && line.cadence ? payDates(line.startedOn, line.cadence) : []"),
      "el horario sigue viniendo del calendario; lo que cambió es quién manda sobre el pasado: el libro");
  });
});

/* ═══════════ §4 · O5-C1/C2/C3 Y EL CRUCE: EL TEMA EN EL MODO DE SU FUNCIÓN ═══════════ */

describe("ola5 · los temas condenados declaran el modo de su función (fallo 25)", () => {
  const casos: [string, Mode, string][] = [
    // [tema, modo verdadero, su función]
    ["calendario", "esencial", "nav.calendar"], // 1.3.318: su función bajó a Esencial (el plan es esencial)
    ["feriados", "esencial", "nav.calendar"], // 1.3.318: idem
    ["f-icono-cuota", "ritmo", "subs.brand-library"],
    ["estudio-prestamos", "completo", "study.loans"],
    // Hallazgos del cruce completo de esta ronda: la misma enfermedad,
    // probada por el texto del tema y por su salto que cae confesando.
    ["filtro", "ritmo", "books.filter-chips"], // enseña las fichas del embudo (fallo 3)
    ["tarjetas-captura", "completo", "scan.card-capture"], // enseña la captura de tarjetas
    ["rw-canjear", "completo", "cards.rewards-redeem"], // enseña el acto de canjear
    ["recompensas-tarjetas", "completo", "cards.rewards-group"], // el grupo solo se pinta en Completo
    // La dirección contraria, con el precedente de la ola 4 (tc-total
    // bajó a su función): temas que dormían SOBRE su función — la persona
    // del modo menor tiene la función y no su lección.
    ["regla-50-30-20", "ritmo", "pano.rule-503020"], // el fallo 26 la falló en Ritmo, con nombre y %
    ["tu-mes", "ritmo", "pano.month-ring"], // enseña el anillo de Panorama, no una interpretación
    ["tus-100", "ritmo", "pano.hundred"],
    ["que-se-movio", "ritmo", "pano.movers"],
    ["dentro-del-tope", "ritmo", "study.budget-caps"],
    ["en-que-se-va", "ritmo", "study.where"],
    ["lo-que-me-deben", "ritmo", "study.owed"],
    ["palabras-claras", "esencial", "advisor.plain-words"], // el glosario se pinta y enseña desde Esencial (ola 1, BR-1)
    ["tc-recompensas", "completo", "cards.rewards-group"], // el mismo hecho que recompensas-tarjetas: cuentan en Me deben, cuyo grupo es de Completo
  ];
  for (const [id, modo, seat] of casos) {
    it(`${id} vive en ${modo}: su función es ${seat}`, () => {
      const tp = findTopic(id);
      assert.ok(tp, `el tema ${id} existe`);
      assert.equal(topicMode(tp), modo, `${id} debe declarar ${modo}, no el modo de su capítulo`);
      assert.equal(FEATURES[seat as keyof typeof FEATURES], modo, `el asiento ${seat} confirma el modo`);
    });
  }
});

/* ═══════════ §5 · O5-C4: EL SALTO DE ESCANEAR ATERRIZA EN LA PUERTA DEL ESCANEO ═══════════ */

describe("ola5 · O5-C4: escanear salta a donde vive el escaneo (fallo 16)", () => {
  it("el tema es de Esencial y su go ya no nombra el libro de Cuotas", () => {
    const tp = findTopic("escanear");
    assert.ok(tp && tp.go, "el tema escanear existe y salta");
    assert.equal(topicMode(tp), "esencial", "escanear con revisión simple es de Esencial (fallo 16)");
    assert.notEqual(tp.go!.screen, "subs", "el destino ya no es el libro de Cuotas (books.subs, Ritmo)");
  });

  it("el destino es la puerta de alta de un libro de gastos: el salto no cae en ningún modo", () => {
    const tp = findTopic("escanear")!;
    assert.equal(tp.go!.screen, "variable", "el destino es un libro de gastos, donde el propio texto del tema manda («toca + en un libro de gastos»)");
    assert.equal(tp.go!.anchor, "book-add", "la puerta es el +, que abre el flujo donde vive «Escanear»");
    assert.equal(featureForGo(tp.go!), null,
      "la puerta + de un libro de gastos es mueble universal (featureForGo no la sienta): el salto aterriza en Esencial, en Ritmo y en Completo — nunca cae a la nada ni confiesa un modo ajeno");
  });

  it("la puerta contiene el escaneo: el botón «Escanear» vive en el flujo de alta", () => {
    const scan = SRC("../../components/faro/receipt-scan.tsx");
    assert.ok(scan.includes('data-anchor="scan-add"'), "el botón de escaneo existe en el flujo de alta de los libros de gasto");
    assert.equal(FEATURES["scan.receipt"], "esencial", "el escaneo mismo es de Esencial: el salto y la función cuentan lo mismo");
  });
});

/* ═══════════ §6 · O5-C5: LA BURBUJA ANUNCIA CORTO Y TIENDE EL PUENTE ═══════════ */

describe("ola5 · O5-C5: desde la burbuja corta la explicación se alcanza", () => {
  it("la burbuja sigue anunciando corto y NO enseña el tema dormido (la cerca de la ola 4 queda)", () => {
    const hint = SRC("../../components/faro/hint.tsx");
    assert.ok(hint.includes('topicSleeps ? <span className="hint-dormant">{t("mode.dormant.short")'),
      "el aviso corto sigue siendo lo único que la burbuja dice del tema dormido");
    assert.ok(!hint.includes('t("mode.dormant.notice")'), "el aviso largo sigue fuera de la burbuja: es del salto");
  });

  it("el puente «Más en el manual →» ya no exige que el tema viva: la Ley de Manuales manda el puente", () => {
    const hint = SRC("../../components/faro/hint.tsx");
    assert.ok(!hint.includes('entry.depth === "manual" && alive'),
      "la condición que dejaba la explicación inalcanzable salió");
    // ENMIENDA OLA 6 (CARA-5): la línea del mecanismo crece — el puente
    // ya no es solo de los temas con entrada de Manual: toda burbuja de
    // tema DORMIDO, también las cortas (depth:"tip"), tiende el suyo a su
    // explicación. La afirmación de esta cerca — todo tema alcanzable
    // desde una burbuja tiende su puente — queda más fuerte, no más débil.
    assert.ok(hint.includes('const more = entry.depth === "manual" || topicSleeps;'),
      "todo tema con entrada de Manual tiende su puente, despierto o dormido — y desde la ola 6 también el tip dormido");
    assert.ok(hint.includes('root.openManual(entry.moreId ?? entry.id)'),
      "el puente abre el Manual en el tema exacto de la burbuja");
  });

  it("el Manual abre un tema dormido COMO explicación: existe, con su aviso, sin «Ir allí»", () => {
    const manual = SRC("../../components/faro/manual.tsx");
    assert.ok(manual.includes("mn-entry-dormant"), "la entrada-explicación de un tema dormido se pinta");
    assert.ok(manual.includes('data-anchor="mn-current"'), "el efecto de llegada la encuentra por su ancla");
    assert.ok(manual.includes('t("mode.dormant.notice")'),
      "la entrada se enmarca con el aviso largo: «Eso vive en… Aquí tienes su explicación» — y ahí sí es verdad");
    assert.ok(!manual.includes("if (currentDormant) root.setUi"),
      "el rebote al índice murió: ningún llamador deja a la persona sobre una explicación que no existe, porque ahora existe");
  });

  it("la recomposición no se toca: el tema dormido sigue fuera de capítulos, índice y buscador", () => {
    const manual = SRC("../../components/faro/manual.tsx");
    assert.ok(manual.includes("ch.topics.filter((tp) => topicAlive("), "los capítulos siguen filtrados por modo");
    assert.ok(manual.includes("searchTopics(MANUAL_TOPICS, words, lang).filter(topicAlive)"), "el buscador sigue filtrado por modo");
  });
});

/* ═══════════ §7 · E5-1: LOS ENLACES SE DEDUPLICAN POR TEMA ═══════════ */

describe("ola5 · E5-1: «Categorías de compra» nace como enlace (dedupe por tema)", () => {
  it("la premisa: los dos nombres resuelven a temas DISTINTOS que comparten destino", () => {
    const a = linkDest("Tiendas");
    const b = linkDest("Categorías de compra");
    assert.equal(a?.topic, "tiendas");
    assert.equal(b?.topic, "categorias-compra", "el nombre resuelve a su tema: lo único que lo suprimía era la clave de destino");
    assert.equal(linkDest("Purchase categories")?.topic, "categorias-compra", "el par inglés, la misma clase");
  });

  it("la clave de deduplicación es el tema, no el destino (screen|fold|anchor)", () => {
    const mt = SRC("../../components/faro/manual-text.tsx");
    assert.ok(mt.includes("dest ? dest.topic : term"), "dos temas con el mismo go nacen los dos como enlace");
    assert.ok(!mt.includes("${dest.go.screen}|"), "la clave de destino que suprimía el segundo nombre salió");
  });
});

/* ═══════════ §8 · OBS-C5-1: LA PUERTA DE CONFLICTO GUARDA SIN SOBRESCRIBIR ═══════════ */

describe("ola5 · OBS-C5-1: apartDecision — la retención cumple lo que el banner promete", () => {
  const M = "{\"rev\":9}"; // mi libro
  const W = "{\"rev\":11}"; // el libro que ganó
  it("sin divergencia no se aparta nada", () => {
    assert.equal(apartDecision(M, M, null, null), "none");
  });
  it("la primera ranura libre guarda", () => {
    assert.equal(apartDecision(M, W, null, null), "first");
  });
  it("ocupada la primera, guarda la segunda", () => {
    assert.equal(apartDecision(M, W, "{\"rev\":7}", null), "second");
  });
  it("si una ranura ya guarda exactamente mi copia, ya está guardada", () => {
    assert.equal(apartDecision(M, W, M, null), "kept");
    assert.equal(apartDecision(M, W, "{\"rev\":7}", M), "kept");
  });
  it("una ranura libre manda sobre reutilizar: no se toca nada que no haga falta", () => {
    assert.equal(apartDecision(M, W, W, null), "second");
  });
  it("la ranura que guarda la copia GANADORA dejó de ser divergencia: puede reutilizarse", () => {
    assert.equal(apartDecision(M, W, W, "{\"rev\":7}"), "reuse-first");
    assert.equal(apartDecision(M, W, "{\"rev\":7}", W), "reuse-second");
  });
  it("dos divergencias vivas ajenas: JAMÁS se sobrescribe — blocked", () => {
    assert.equal(apartDecision(M, W, "{\"rev\":7}", "{\"rev\":8}"), "blocked",
      "la segunda aparición de la misma pestaña ya no pisa la primera: si no cabe, no se aparta y se dice");
  });

  it("las dos puertas ejecutan la misma decisión y el texto llano existe en los dos idiomas", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    assert.ok(provider.includes("apartDecision("), "el provider decide con la función pura, no con su costumbre");
    assert.ok(provider.includes("pack.apartMissed"), "cuando no se pudo apartar, se dice — no se promete");
    assert.notEqual(translate("es", "pack.apartMissed"), "pack.apartMissed", "la clave existe en español");
    assert.notEqual(translate("en", "pack.apartMissed"), "pack.apartMissed", "la clave existe en inglés");
  });

  it("la puerta de pestaña exige trabajo local de verdad: revisión movida, o una entrada anunciada que el paquete guardado no tiene", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    // ENMIENDA OLA 6 (C6-1): la ventana crece de 2600 a 3600 — la cura de
    // la confesión que viaja en el toast alargó la función con su propio
    // comentario y su composición; las tres afirmaciones no cambian.
    // ENMIENDA OLA 20 (§B de la ola 20: la entrada anunciada se evaporaba
    // entre pestañas): el juicio ya no vive inline en la puerta — la
    // puerta decide con la función pura localWorkVerdict (packguard.ts),
    // la misma vara que la composición clava, y la ley se ensancha: una
    // diferencia de registro con revisión IGUAL también es trabajo local
    // cuando es una entrada anunciada que el paquete guardado no tiene
    // (la entrada es contenido, no un susurro). La primera afirmación
    // sigue al juicio a su casa nueva y clava las dos mitades de la ley.
    const door = provider.slice(provider.indexOf("function surfaceTabConflict"), provider.indexOf("function surfaceTabConflict") + 3600);
    assert.ok(door.includes("localWorkVerdict("), "la puerta decide con la función pura, no con su costumbre");
    const guard = SRC("./packguard.ts");
    assert.ok(guard.includes("mine.revision !== baseRev"), "la mitad vieja de la ley sigue: sin revisión movida y sin entrada anunciada, no hay trabajo que apartar");
    assert.ok(guard.includes("announcedAbsent(mine, stored)"), "la mitad nueva de la ley: la entrada anunciada ausente en el guardado ES trabajo local");
    assert.ok(door.includes("setTabBanner(true)"), "el banner existe — pero solo tras guardar de verdad (ver la decisión)");
    assert.ok(door.includes("kept"), "el banner cuelga de que la copia quedó guardada");
  });
});

/* ═══════════ §9 · GUARDIÁN V (OBS. 1 Y 3): LOS LÍMITES DECLARADOS DEL ARCO ═══════════ */

describe("ola5 · la pureza del arco declara sus límites en su coordenada", () => {
  it("el límite está escrito donde vive la comparación (sample.ts)", () => {
    const sample = SRC("./sample.ts");
    assert.ok(sample.includes("LÍMITE DECLARADO"), "la declaración existe en la coordenada de linesMatch");
    assert.ok(sample.includes("multiconjuntos"), "nombra lo que no compara: multiconjuntos, cubos y orden");
  });

  it("A'4 cercado: el ascenso deja caer un cubo vacío fuera del arco y no pierde ni una línea", () => {
    const built = buildSampleArc(createInitial("es"));
    const v3: LedgerState = {
      ...built,
      months: {
        ...Object.fromEntries(sampleArcLinesV3().reduce<[string, { lines: Line[] }][]>((acc, l) => {
          const g = acc.find(([k]) => k === l.monthKey);
          if (g) g[1].lines.push(l); else acc.push([l.monthKey, { lines: [l] }]);
          return acc;
        }, [])),
        "2026-01": { lines: [] }, // un cubo vacío fuera del arco: los meses solo guardan líneas
      },
      settings: { ...built.settings, seeds: ["sample-v2", "sample-v3"] },
    };
    assert.equal(isPureArcSampleV3(v3), true, "el cubo vacío no ensucia la pureza: no guarda nada");
    const up = withSampleArc(v3);
    assert.equal(up.added, true, "la casa pura asciende");
    assert.equal(up.ledger.months["2026-01"], undefined, "el cubo vacío cae en el ascenso — declarado, sin pérdida posible");
    assert.equal(sampleArcLines().length, 128, "el arco conserva sus 128 filas");
  });
});

/* ═══════════ §10 · O5-C6: EL MAPA COMPLETO TEMA→FUNCIÓN (los 354) ═══════════
 *
 * La cerca de la ola 4 era un mapa cerrado de 13 sobre 354: una mutación
 * ciega fuera del mapa quedaba verde 29/29 (espécimen de Cara V: mover
 * f-icono-cuota a «completo» no rompía nada). Este mapa cubre TODOS los
 * temas y la cerca cruza tres cosas: completitud (el mapa nombra
 * exactamente los temas que existen — un tema que nazca mañana sin
 * declarar su función rompe la cerca), modo (cada tema vive en el modo
 * que el mapa declara — una mutación ciega en CUALQUIER tema corre
 * roja) y registro (donde el mapa declara función, el registro la
 * confirma en el mismo modo — un asiento que cambie de modo arrastra a
 * sus temas a la luz).
 *
 * Cómo se adjudicó cada entrada:
 * - La regla: el tema sigue a la función que ENSEÑA (fallo 25). Donde el
 *   `go` del tema nombra esa función, f es el asiento del go. Donde el
 *   contenido manda sobre el go (la pareja cosida de la ola 4, las
 *   curas de esta ronda, el catálogo que se añade, la ficha de la
 *   tarjeta…), f es el asiento del contenido, y la §4 de esta cerca y el
 *   informe CURA-OLA5 guardan el espécimen.
 * - f = null declara «sin asiento único»: el modo del tema se sostiene
 *   por su adjudicación escrita, no por un asiento. Las familias:
 *   · Universales y transversales (cuenta, la navegación, los ajustes
 *     universales): sin función de modo.
 *   · El capítulo Cobros es Ritmo por colocación declarada (1.3.298):
 *     enseña la gestión del libro; sus temas de lado, de hechos de
 *     tarjeta y de campos de abono aterrizan en la cara lectora
 *     (debt.facts, despierta en su modo) y declaran null — los de
 *     formulario declaran cobros.quick-add, los de archivo
 *     cobros.archive, los de tiempo cobros.timeline.
 *   · Los temas introductorios siguen a su capítulo (estudio, asesor).
 *   · Las lecturas aa-* son del Asesor de Completo sobre asuntos que
 *     viven más abajo; el Asesor tiene sus temas por modo (asesor-
 *     esencial, asesor-ritmo) y las lecturas no los sustituyen.
 *   · ahorros-tabs / ahorros-todas: la adjudicación de cara de la ola 4
 *     (la barra es de Esencial; su cara entera, de Ritmo).
 *   · este-periodo explica una cifra pintada en Esencial; el selector
 *     del corte que su salto nombra es función de otro tema.
 *   · ventana-flotante: declaración expresa de Completo (su pin H-4
 *     vive en modos299); su salto aterriza en el conmutador de vistas,
 *     mueble de todos los modos.
 *   · donde-vive y deudas: las adjudicaciones de la ola 4 (la pregunta
 *     al crear; los hechos del fallo 31).
 * - Sospechosos nombrados para la ola 6 (el mapa los congela como
 *   están, no los bendice): los f-* del editor cuyos campos llevan
 *   asiento de Ritmo (f-pagado-con, f-activo, f-recurrente,
 *   f-saldo-deuda), cifras-asesor (su go nombra un asiento de Ritmo) y
 *   los tc-* de hechos en el capítulo Cobros. Coordenadas en
 *   CURA-OLA5.md.
 *
 * ENMIENDA OLA 6 (los sospechosos, juzgados — OLA6-CARA): los f-* del
 * editor siguen a sus campos: f-pagado-con → editor.paid-with,
 * f-activo → editor.active-toggle, f-recurrente →
 * editor.recurrent-toggle, f-saldo-deuda y f-tasa-anual →
 * editor.debt-balance, todos a Ritmo (los dos primeros ganan su puerta
 * en la misma ronda: CARA-1). f-lista → cobros.quick-add a Ritmo (las
 * fichas viven en el alta rápida de Cobros; su f vieja,
 * subs.cadence-basic, también era falsa). cifras-asesor →
 * advisor.month-detail, a Ritmo: su función siempre fue el detalle de
 * Ritmo. tc-ganado → scan.card-capture y tc-promo → cards.add-full, a
 * Completo: sus únicas superficies viven allí. leer-estado →
 * scan.retirement-stmt, a Completo, y su función gana la puerta
 * (CARA-10). Neto de la enmienda: esencial −6, ritmo +4, completo +2
 * en distribución exacta (113 · 114 · 127 sobre 354).
 *
 * ENMIENDA OLA 9 (los asientos fantasma, juzgados — OLA9-CARA): el mapa
 * nombraba dos asientos que ningún código consume, y el cruce contra
 * ellos quedaba verde mientras la cara trabajaba en otro modo.
 * cuenta-movimiento y f-cuenta-monto → accounts.move, a Esencial: el
 * formulario de movimiento trabaja en Esencial (fallo 7) y su rama no
 * conoce puerta alguna; accounts.panel no gobernaba nada (el panel se
 * ancla en accounts.panel-simple y su desglose en nature.class-saldo).
 * f-cuenta-nombre → accounts.add, a Ritmo: su forma SÍ lleva la puerta
 * has("accounts.add") — la hermana se salvaba por coincidencia de
 * modos sobre el mismo fantasma. f-retiro-acumulado → vault.retiro, a
 * Ritmo: el campo se monta dentro de la forma de Retiro, sin puerta
 * propia; vault.retiro-fields tampoco gobernaba nada. tiendas →
 * books.shops, a Ritmo: su único (?) se monta en la tira del engranaje
 * del libro Compras (cara de Ritmo) y su enseñanza de mostrar/ocultar
 * solo es verdad allí; crear y elegir en el momento de uso lo siguen
 * enseñando en Esencial f-tienda y f-cat-compra (settings.catalog-add).
 * La cerca que impide el regreso es el censo de consumidores de
 * modos-ola9 §A: todo asiento nombrado aquí tiene consumidor real o
 * exención escrita. Neto de la enmienda: esencial +1, ritmo ±0,
 * completo −1 en distribución exacta (118 · 107 · 129 sobre 354).
 */

describe("ola5 · O5-C6: el mapa completo tema→función (los 360, sin excepción)", () => {
  const MAPA: Record<string, { f: FeatureId | null; m: Mode }> = {
    // — capítulo arriba —
    "faro": { f: null, m: "esencial" },
    "inicio-marca": { f: null, m: "esencial" },
    "sync": { f: null, m: "esencial" },
    "deshacer": { f: null, m: "esencial" },
    "exportar": { f: "export.panel", m: "ritmo" },
    "tema-rapido": { f: null, m: "esencial" },
    "vista": { f: "nav.tablet-views", m: "esencial" },
    "ventana-flotante": { f: null, m: "completo" },
    "buscar": { f: "nav.global-search", m: "esencial" },
    "calendario": { f: "nav.calendar", m: "esencial" }, // 1.3.318
    "feriados": { f: "nav.calendar", m: "esencial" }, // 1.3.318
    "moneda-vista": { f: null, m: "esencial" },
    "barra-inferior": { f: null, m: "esencial" },
    "deslizar": { f: null, m: "esencial" },
    "ajustes-boton": { f: null, m: "esencial" },
    // — capítulo central —
    "central": { f: null, m: "esencial" },
    "queda": { f: null, m: "esencial" },
    "usado": { f: null, m: "esencial" },
    "tasa-rapida": { f: null, m: "esencial" },
    "lentes": { f: null, m: "esencial" },
    "tengo": { f: null, m: "esencial" },
    "gastare": { f: null, m: "esencial" },
    "pagos": { f: "central.lens-pagos", m: "esencial" },
    "sumar-ingreso": { f: null, m: "esencial" },
    "anotar-gasto": { f: null, m: "esencial" },
    "reporte-pendiente": { f: null, m: "esencial" },
    "semaforo": { f: "central.lens-pagos", m: "esencial" },
    "oportunidad": { f: null, m: "esencial" },
    "lista-central": { f: null, m: "esencial" },
    "primer-ingreso": { f: null, m: "esencial" },
    "traer-recurrentes": { f: null, m: "esencial" },
    "ahorros-banda": { f: null, m: "ritmo" },
    "bolsas": { f: null, m: "esencial" },
    "cifra-corta": { f: null, m: "ritmo" },
    "cuentas": { f: null, m: "esencial" },
    "apartado-mes": { f: "vault.save", m: "esencial" },
    "si-apartas": { f: "vault.lever", m: "completo" },
    "personas": { f: "people.card", m: "esencial" },
    "f-persona": { f: "people.card", m: "esencial" },
    "persona-cumple": { f: "people.card", m: "esencial" },
    "persona-regalo": { f: "people.card", m: "esencial" },
    "persona-fecha": { f: "people.card", m: "esencial" },
    "persona-fecha-nombre": { f: "people.card", m: "esencial" },
    "persona-ocasion": { f: "people.card", m: "esencial" },
    "puedes-gastar-hoy": { f: null, m: "esencial" },
    // — capítulo cobros —
    "cobros": { f: "cobros.timeline", m: "ritmo" },
    "me-deben": { f: null, m: "ritmo" },
    "con-interes": { f: "cobros.quick-add", m: "ritmo" },
    "bono": { f: null, m: "ritmo" },
    "archivar": { f: "cobros.archive", m: "ritmo" },
    "debo-tiempo": { f: "cobros.timeline", m: "ritmo" },
    "debo": { f: null, m: "ritmo" },
    "archivo-cuotas": { f: "cobros.archive", m: "ritmo" },
    "prestamos": { f: null, m: "ritmo" },
    "prestamos-tiempo": { f: "cobros.timeline", m: "ritmo" },
    "prestamo-interes": { f: null, m: "ritmo" },
    "prestamo-abono": { f: null, m: "ritmo" },
    "tarjetas": { f: "cards.group", m: "ritmo" },
    "tarjetas-captura": { f: "scan.card-capture", m: "completo" },
    "tc-saldo": { f: null, m: "ritmo" },
    "tc-disponible": { f: null, m: "ritmo" },
    "tc-limite": { f: null, m: "ritmo" },
    "tc-minimo": { f: "debt.facts", m: "esencial" },
    "tc-fecha": { f: "debt.facts", m: "esencial" },
    "tc-recompensas": { f: "cards.rewards-group", m: "completo" },
    "tc-ganado": { f: "scan.card-capture", m: "completo" },
    "tc-tasa": { f: "cards.ficha", m: "completo" },
    "tc-corte": { f: "cards.ficha", m: "completo" },
    "tc-ultimo-pago": { f: null, m: "ritmo" },
    "tc-otros": { f: null, m: "ritmo" },
    "tc-uso": { f: "advisor.cards-usage", m: "completo" },
    "tc-interes": { f: "cards.ficha", m: "completo" },
    "tc-promo": { f: "cards.add-full", m: "completo" },
    "tc-total": { f: "debt.facts", m: "esencial" },
    "rw-canjear": { f: "cards.rewards-redeem", m: "completo" },
    "plan-libre": { f: "loans.payoff-plan", m: "completo" },
    "plan-meses": { f: "loans.payoff-plan", m: "completo" },
    "plan-interes": { f: "loans.payoff-plan", m: "completo" },
    "plan-orden": { f: "loans.payoff-plan", m: "completo" },
    "plan-tasa-estimada": { f: "loans.payoff-plan", m: "completo" },
    "recompensas-tarjetas": { f: "cards.rewards-group", m: "completo" },
    "prestamo-archivo": { f: "cobros.archive", m: "ritmo" },
    "estudio-prestamos": { f: "study.loans", m: "completo" },
    "estudio-ano": { f: "study.flow", m: "ritmo" },
    "f-prestamo-quien": { f: "cobros.quick-add", m: "ritmo" },
    "f-prestamo-monto": { f: "cobros.quick-add", m: "ritmo" },
    "f-prestamo-fecha": { f: "cobros.quick-add", m: "ritmo" },
    "f-prestamo-vence": { f: "cobros.quick-add", m: "ritmo" },
    "f-pago-interes": { f: "cobros.quick-add", m: "ritmo" },
    "f-prestamo-moneda": { f: "cobros.quick-add", m: "ritmo" },
    "f-prestamo-interes": { f: "cobros.quick-add", m: "ritmo" },
    "f-prestamo-libro": { f: "cobros.quick-add", m: "ritmo" },
    "f-cobro-persona": { f: "cobros.quick-add", m: "ritmo" },
    "f-cobro-monto": { f: "cobros.quick-add", m: "ritmo" },
    "f-cobro-fecha": { f: "cobros.quick-add", m: "ritmo" },
    "f-cobro-interes": { f: "cobros.quick-add", m: "ritmo" },
    "f-bono-monto": { f: null, m: "ritmo" },
    "f-bono-fecha": { f: null, m: "ritmo" },
    "f-cuota-nombre": { f: null, m: "ritmo" },
    "f-cuota-atajos": { f: null, m: "ritmo" },
    "f-cuota-frecuencias": { f: null, m: "ritmo" },
    "f-cuota-monto": { f: null, m: "ritmo" },
    "f-cuota-proximo": { f: null, m: "ritmo" },
    "deudas-hechos": { f: "debt.facts", m: "esencial" },
    // — capítulo libros —
    "libros": { f: null, m: "esencial" },
    "ingresos": { f: null, m: "esencial" },
    "fijos": { f: null, m: "esencial" },
    "variables": { f: null, m: "esencial" },
    "compras": { f: "editor.shop-fields", m: "esencial" },
    "deudas": { f: null, m: "esencial" },
    "balance-neto": { f: "debt.net", m: "esencial" },
    "deudas-grafica": { f: "debt.chart", m: "completo" },
    "plan-pago": { f: "loans.payoff-plan", m: "completo" },
    "cuotas": { f: "subs.fixed-exists", m: "esencial" },
    "escanear": { f: "scan.receipt", m: "esencial" },
    "captura-mesa": { f: "capture.review", m: "esencial" },
    "captura-texto": { f: "capture.text", m: "esencial" }, // 1.3.340 — Ola 2: el tema de la puerta de texto nace con su función
    "captura-lista": { f: "capture.list", m: "esencial" }, // 1.3.342 — Ola 3: el tema de la lista en bache nace con su función
    "moneda-invitada": { f: "settings.guest-currency", m: "esencial" }, // 1.3.344 — Ola 4: el tema de la invitada nace con su función
    "preguntar-asesor": { f: "advisor.ask", m: "esencial" }, // 1.3.345 — Ola 5a: el tema de preguntar nace con su caja
    "novedades": { f: "settings.news", m: "esencial" }, // 1.3.346 — Novedades: el tema de las notas nace con su pliegue
    "avisos-pagos": { f: "settings.due-alerts", m: "esencial" }, // 1.3.356 — Ola 6: el tema de los avisos nace con su interruptor
    "lista-plan": { f: "capture.plan", m: "ritmo" }, // 1.3.357 — la lista-plan (D6): el tema nace con su asiento, en Ritmo por fallo de Oscar
    "lista-espera": { f: "advisor.waitlist", m: "esencial" }, // 1.3.360 — la lista de espera (5c): el tema nace con su asiento, en Esencial por fallo de Oscar
    "compartir": { f: "inbox.link", m: "esencial" }, // 1.3.362 — las puertas de compartir (§18): el tema nace con su asiento, en Esencial como su puerta
    "nombre": { f: "account.name", m: "esencial" }, // 1.3.363 — la Pieza 0 (§19.5): el tema nace con su asiento, en Esencial como la fila que nombra (corregir el propio nombre es esencial)
    "libro-categoria": { f: null, m: "esencial" },
    "filtro": { f: "books.filter-chips", m: "ritmo" },
    "agregar-linea": { f: null, m: "esencial" },
    "libro-herramientas": { f: null, m: "esencial" },
    "linea": { f: null, m: "esencial" },
    "burbujas": { f: null, m: "esencial" },
    "icono-color": { f: null, m: "esencial" },
    "color-propio": { f: null, m: "esencial" },
    "corte": { f: "vault.span-cut", m: "ritmo" },
    "acumulado": { f: "vault.span-cut", m: "ritmo" },
    "este-periodo": { f: null, m: "esencial" },
    "promedio": { f: "vault.span-cut", m: "ritmo" },
    "bote": { f: null, m: "ritmo" },
    "reportar-usado": { f: null, m: "esencial" },
    "tiendas": { f: "books.shops", m: "ritmo" },
    "categorias-compra": { f: "settings.catalog-add", m: "esencial" },
    "f-tienda": { f: "settings.catalog-add", m: "esencial" },
    "f-cat-compra": { f: "settings.catalog-add", m: "esencial" },
    "f-color-compra": { f: "settings.catalog-add", m: "esencial" },
    // — capítulo ahorros —
    "ahorros-tabs": { f: null, m: "ritmo" },
    "ahorros-todas": { f: null, m: "ritmo" },
    "donde-vive": { f: null, m: "esencial" },
    "meta": { f: "vault.meta", m: "ritmo" },
    "retiro": { f: "vault.retiro", m: "ritmo" },
    "leer-estado": { f: "scan.retirement-stmt", m: "completo" },
    "retiro-primerica": { f: "vault.retiro-sheet", m: "completo" },
    "emergencia": { f: "vault.emergencia", m: "ritmo" },
    "ordenar-ventanas": { f: "vault.meta", m: "ritmo" },
    "fijar": { f: null, m: "ritmo" },
    "cuenta-nueva": { f: "accounts.add", m: "ritmo" },
    "cuenta-movimiento": { f: "accounts.move", m: "esencial" },
    "f-bolsa-nombre": { f: "vault.meta", m: "ritmo" },
    "f-bolsa-monto": { f: "vault.meta", m: "ritmo" },
    "f-retiro-primero": { f: "vault.retiro", m: "ritmo" },
    "f-retiro-saldo": { f: "vault.retiro", m: "ritmo" },
    "f-retiro-acumulado": { f: "vault.retiro", m: "ritmo" },
    "f-cuenta-monto": { f: "accounts.move", m: "esencial" },
    "f-cuenta-inicial": { f: "accounts.opening", m: "ritmo" },
    "f-cuenta-nombre": { f: "accounts.add", m: "ritmo" },
    // — capítulo folios —
    "folios": { f: null, m: "esencial" },
    "folios-filtros": { f: null, m: "esencial" },
    "folios-apartar": { f: "archive.hide-period", m: "completo" },
    "folios-procedencia": { f: null, m: "esencial" },
    // — capítulo estudio —
    "estudio": { f: null, m: "completo" },
    "ordenar-estudio": { f: "study.reorder", m: "completo" },
    "tu-mes": { f: "pano.month-ring", m: "ritmo" },
    "salud": { f: "pano.health-note", m: "completo" },
    "salud-nota": { f: "pano.health-note", m: "completo" },
    "pilares": { f: "pano.health-note", m: "completo" },
    "ritmo": { f: "patron.verdict", m: "completo" },
    "proximos-pagos": { f: "pano.next-dues-reduced", m: "esencial" },
    "tus-100": { f: "pano.hundred", m: "ritmo" },
    "en-que-se-va": { f: "study.where", m: "ritmo" },
    "recorrido": { f: "study.sankey", m: "completo" },
    "regla-50-30-20": { f: "pano.rule-503020", m: "ritmo" },
    "dentro-del-tope": { f: "study.budget-caps", m: "ritmo" },
    "que-se-movio": { f: "pano.movers", m: "ritmo" },
    "entra-sale-queda": { f: "study.flow-simple", m: "esencial" },
    "colchon": { f: "study.cushion-dial", m: "completo" },
    "y-si-apartara": { f: "study.cushion-dial", m: "completo" },
    "lo-que-me-deben": { f: "study.owed", m: "ritmo" },
    "numeros-clave": { f: "study.key-numbers", m: "completo" },
    "kn-spent": { f: "study.key-numbers", m: "completo" },
    "kn-rigid": { f: "study.key-numbers", m: "completo" },
    "kn-flex": { f: "study.key-numbers", m: "completo" },
    "kn-petty": { f: "study.key-numbers", m: "completo" },
    "kn-subs": { f: "study.key-numbers", m: "completo" },
    "kn-pareto": { f: "study.key-numbers", m: "completo" },
    "kn-fx": { f: "study.key-numbers", m: "completo" },
    "kn-mom": { f: "study.key-numbers", m: "completo" },
    "kn-cushion": { f: "study.key-numbers", m: "completo" },
    "kn-remit": { f: "study.key-numbers", m: "completo" },
    "kn-house": { f: "study.key-numbers", m: "completo" },
    "kn-largest": { f: "study.key-numbers", m: "completo" },
    "kn-break": { f: "study.key-numbers", m: "completo" },
    "estudio-personas": { f: "study.people", m: "completo" },
    "estudio-recompensas": { f: null, m: "completo" },
    "estudio-ganancias": { f: "study.income-sources", m: "completo" },
    "remesas-estudio": { f: "study.remit", m: "completo" },
    // — capítulo asesor —
    "asesor-area": { f: null, m: "completo" },
    "aa-ingresos": { f: null, m: "completo" },
    "aa-cobros": { f: null, m: "completo" },
    "aa-apartado": { f: null, m: "completo" },
    "aa-retiro": { f: null, m: "completo" },
    "aa-remesas": { f: null, m: "completo" },
    "asesor": { f: null, m: "completo" },
    "tu-mes-en-claro": { f: null, m: "completo" },
    "lo-que-haria": { f: null, m: "completo" },
    "cinco-chequeos": { f: "advisor.pillars", m: "completo" },
    "palabras-claras": { f: "advisor.plain-words", m: "esencial" },
    "desplegar-asesor": { f: null, m: "completo" },
    "zoom-dedos": { f: "advisor.rules-frame", m: "completo" },
    "asesor-ancho": { f: null, m: "completo" },
    "faro-del-mes": { f: "advisor.rules-frame", m: "completo" },
    "cifras-asesor": { f: "advisor.month-detail", m: "ritmo" },
    "reconciliacion": { f: null, m: "completo" },
    "horizonte-mes": { f: null, m: "completo" },
    "horizonte-90": { f: "advisor.plan-90", m: "completo" },
    "horizonte-12": { f: "advisor.projection-12", m: "completo" },
    "por-donde-empezar": { f: null, m: "completo" },
    "que-pasa-si": { f: "advisor.scenarios", m: "completo" },
    "copiar-plan": { f: null, m: "completo" },
    "asesor-personas": { f: "advisor.people-tip", m: "completo" },
    "asesor-recompensas": { f: "advisor.rewards-note", m: "completo" },
    "numeros-asesor": { f: "advisor.rules-frame", m: "completo" },
    "regla-ritmo": { f: "advisor.rules-frame", m: "completo" },
    "regla-pagos": { f: "advisor.rules-frame", m: "completo" },
    "regla-categoria": { f: "advisor.rules-frame", m: "completo" },
    "regla-atipico": { f: "advisor.rules-frame", m: "completo" },
    "regla-cargos": { f: "advisor.rules-frame", m: "completo" },
    "regla-meta": { f: "advisor.rules-frame", m: "completo" },
    "regla-colchon": { f: "advisor.rules-frame", m: "completo" },
    "asesor-esencial": { f: null, m: "esencial" },
    "asesor-ritmo": { f: null, m: "ritmo" },
    // — capítulo cambio —
    "mesa-cambio": { f: null, m: "ritmo" },
    "tasa": { f: "tools.rate-view", m: "esencial" },
    "ver-moneda": { f: null, m: "ritmo" },
    "convertidor": { f: "tools.converter", m: "esencial" },
    "cambio-ajustes": { f: "tools.converter-chips-admin", m: "completo" },
    "calculadora": { f: "tools.calculator", m: "ritmo" },
    "guardados": { f: "tools.slips", m: "ritmo" },
    "guardado-aplicar": { f: "tools.slips", m: "ritmo" },
    "cambio-enviar": { f: "tools.converter-send", m: "ritmo" },
    // — capítulo ajustes —
    "ajustes": { f: null, m: "esencial" },
    "manual": { f: null, m: "esencial" },
    "idioma": { f: null, m: "esencial" },
    "temas": { f: null, m: "esencial" },
    "modos": { f: null, m: "esencial" },
    "estructura": { f: "settings.structure-tree", m: "ritmo" },
    "plantillas": { f: "settings.templates", m: "completo" },
    "arbol": { f: "settings.structure-tree", m: "ritmo" },
    "catalogo": { f: "settings.catalog-admin", m: "ritmo" },
    "seguro-vida": { f: "settings.catalog-admin-subs", m: "completo" },
    "f-cat-arbol": { f: "settings.structure-tree", m: "ritmo" },
    "remesas": { f: "settings.structure-tree", m: "ritmo" },
    "remesas-personas": { f: null, m: "ritmo" },
    "f-para": { f: null, m: "ritmo" },
    "rp-mes": { f: null, m: "ritmo" },
    "rp-ano": { f: null, m: "ritmo" },
    "rp-total": { f: null, m: "ritmo" },
    "rp-historial": { f: null, m: "ritmo" },
    "f-grupo": { f: "settings.structure-tree", m: "ritmo" },
    "f-subcat": { f: "settings.structure-tree", m: "ritmo" },
    "f-catalogo": { f: "settings.catalog-admin", m: "ritmo" },
    "f-seguro-inicio": { f: "settings.catalog-admin-subs", m: "completo" },
    "f-seguro-beneficiarios": { f: "settings.catalog-admin-subs", m: "completo" },
    "reglas": { f: "settings.rules", m: "ritmo" },
    "meta-ahorro": { f: "settings.savings-goal", m: "ritmo" },
    "semaforo-verde": { f: "settings.debt-green", m: "ritmo" },
    "semaforo-amarillo": { f: "settings.debt-yellow", m: "ritmo" },
    "meses-colchon": { f: "settings.cushion-months", m: "completo" },
    "tasa-manual": { f: "settings.rate-manual", m: "esencial" },
    "atajos-teclado": { f: "settings.shortcuts", m: "esencial" },
    "atajos-mas-menos": { f: "settings.gestures", m: "esencial" },
    "ejemplo": { f: null, m: "esencial" },
    "copias": { f: null, m: "esencial" },
    "archivo-respaldo": { f: null, m: "esencial" },
    "conflicto": { f: null, m: "esencial" },
    "actividad": { f: null, m: "esencial" },
    // — capítulo importar —
    "importar": { f: null, m: "completo" },
    "imp-archivo": { f: null, m: "completo" },
    "imp-descargar": { f: null, m: "completo" },
    "imp-bancos-editar": { f: null, m: "completo" },
    "imp-chase": { f: null, m: "completo" },
    "imp-wellsfargo": { f: null, m: "completo" },
    "imp-paypal": { f: null, m: "completo" },
    "imp-cuenta": { f: null, m: "completo" },
    "imp-resumen": { f: null, m: "completo" },
    "imp-categoria": { f: null, m: "completo" },
    "imp-columnas": { f: null, m: "completo" },
    "imp-col-fecha": { f: null, m: "completo" },
    "imp-col-desc": { f: null, m: "completo" },
    "imp-col-monto": { f: null, m: "completo" },
    "imp-dos-columnas": { f: null, m: "completo" },
    "imp-dia-primero": { f: null, m: "completo" },
    "imp-invertir": { f: null, m: "completo" },
    "bancos": { f: "settings.banks", m: "completo" },
    "imp-recompensas": { f: "settings.bank-rewards-table", m: "completo" },
    "imp-tasa-travel": { f: "settings.bank-rewards-table", m: "completo" },
    "imp-tasa-dining": { f: "settings.bank-rewards-table", m: "completo" },
    "imp-tasa-grocery": { f: "settings.bank-rewards-table", m: "completo" },
    "imp-tasa-drug": { f: "settings.bank-rewards-table", m: "completo" },
    "imp-tasa-gas": { f: "settings.bank-rewards-table", m: "completo" },
    "imp-tasa-online": { f: "settings.bank-rewards-table", m: "completo" },
    "imp-tasa-other": { f: "settings.bank-rewards-table", m: "completo" },
    "imp-pdf": { f: null, m: "completo" },
    "imp-ahorros-paypal": { f: null, m: "completo" },
    "imp-bolsa-paypal": { f: "settings.bank-paypal-pocket", m: "completo" },
    "imp-tarjetas": { f: "settings.bank-sources", m: "completo" },
    "imp-guardadas": { f: "settings.bank-sources", m: "completo" },
    "imp-fila-propia": { f: "settings.bank-sources", m: "completo" },
    "imp-tarjeta-nombre": { f: "settings.bank-sources", m: "completo" },
    "imp-tarjeta-color": { f: "settings.bank-sources", m: "completo" },
    "imp-tarjeta-tipo": { f: "settings.bank-sources", m: "completo" },
    "imp-tarjeta-banco": { f: "settings.bank-sources", m: "completo" },
    "imp-tarjeta-base": { f: "settings.bank-sources", m: "completo" },
    "imp-tarjeta-cat": { f: "settings.bank-sources", m: "completo" },
    "imp-reglas": { f: "settings.bank-rules", m: "completo" },
    // — capítulo editor —
    "editor": { f: null, m: "esencial" },
    "f-concepto": { f: null, m: "esencial" },
    "f-monto": { f: null, m: "esencial" },
    "formula-monto": { f: null, m: "ritmo" },
    "f-dia": { f: null, m: "esencial" },
    "f-moneda": { f: null, m: "esencial" },
    "f-pagado-con": { f: "editor.paid-with", m: "ritmo" },
    "f-categoria": { f: null, m: "esencial" },
    "f-sub": { f: null, m: "esencial" },
    "f-color": { f: null, m: "esencial" },
    "f-nota": { f: null, m: "esencial" },
    "f-activo": { f: "editor.active-toggle", m: "ritmo" },
    "f-recurrente": { f: "editor.recurrent-toggle", m: "ritmo" },
    // — capítulo editor (ENMIENDA OLA 7: la función declarada es el asiento
    //   del CAMPO que el tema enseña, no el del libro donde se abre) —
    "f-primer-pago": { f: "subs.cadence-basic", m: "esencial" },
    "f-frecuencia": { f: "subs.cadence-basic", m: "esencial" },
    "f-proximo-cobro": { f: "subs.cadence-basic", m: "esencial" },
    "f-lista": { f: "cobros.quick-add", m: "ritmo" },
    "f-icono-cuota": { f: "subs.brand-library", m: "ritmo" },
    "f-tienda-elegir": { f: "editor.shop-fields", m: "esencial" },
    "f-cat-elegir": { f: "editor.shop-fields", m: "esencial" },
    "frecuencia-otra": { f: "books.subs", m: "ritmo" },
    "f-proveedor": { f: "editor.shop-fine", m: "completo" },
    "f-codigo": { f: "editor.shop-fine", m: "completo" },
    "f-enlace": { f: "editor.shop-fine", m: "completo" },
    "f-tasa-anual": { f: "editor.debt-balance", m: "ritmo" },
    "f-saldo-deuda": { f: "editor.debt-balance", m: "ritmo" },
    "f-saldo-ahorro": { f: null, m: "esencial" },
    // — capítulo cuenta —
    "cuenta": { f: null, m: "esencial" },
    "entrar": { f: null, m: "esencial" },
    "contrasena": { f: null, m: "esencial" },
    "mantener-sesion": { f: null, m: "esencial" },
    "entrar-de-nuevo": { f: null, m: "esencial" },
    "huella": { f: null, m: "esencial" },
    "bloqueo-al-salir": { f: null, m: "esencial" },
    "app-android": { f: null, m: "esencial" },
    "widget-android": { f: "settings.widget-card", m: "esencial" },
    "avisos-app": { f: null, m: "esencial" },
    "bateria-app": { f: null, m: "esencial" },
    "cerrar-sesion": { f: null, m: "esencial" },
    "sin-red": { f: null, m: "esencial" },
    "actualizacion": { f: null, m: "esencial" },
  };

  it("completitud: el mapa nombra exactamente los temas que existen", () => {
    assert.deepEqual(Object.keys(MAPA).sort(), MANUAL_TOPICS.map((t) => t.id).sort(),
      "un tema que nazca mañana sin declarar su función — o uno que muera sin salir del mapa — rompe esta cerca");
    assert.equal(MANUAL_TOPICS.length, 365); // 1.3.363 — nace «nombre» (Pieza 0); 364 en las puertas de compartir (1.3.362)
  });

  it("modo: cada tema vive en el modo que el mapa declara (una mutación ciega en CUALQUIER tema corre roja)", () => {
    for (const tp of MANUAL_TOPICS) {
      assert.equal(topicMode(tp), MAPA[tp.id]!.m, `${tp.id}: el mapa declara ${MAPA[tp.id]!.m} y el tema vive en ${topicMode(tp)}`);
    }
  });

  it("registro: donde el mapa declara función, el registro la confirma en el mismo modo", () => {
    for (const tp of MANUAL_TOPICS) {
      const e = MAPA[tp.id]!;
      if (e.f) assert.equal(FEATURES[e.f], e.m, `${tp.id}: su función ${e.f} vive en ${FEATURES[e.f]}, no en ${e.m}`);
    }
  });

  it("la mutación ciega del espécimen de Cara V ya no pasa: el mapa cubre f-icono-cuota", () => {
    // En la base, mover f-icono-cuota a «completo» dejaba la cerca vieja
    // verde 29/29 (estaba fuera de su mapa de 13). Aquí su entrada existe
    // y declara ritmo con su función: cualquier modo distinto rompe el
    // cruce de arriba.
    assert.deepEqual(MAPA["f-icono-cuota"], { f: "subs.brand-library", m: "ritmo" });
    assert.deepEqual(MAPA["calendario"], { f: "nav.calendar", m: "esencial" }); // 1.3.318: el plan es esencial
    assert.deepEqual(MAPA["estudio-prestamos"], { f: "study.loans", m: "completo" });
  });
});
