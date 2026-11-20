/**
 * FARO — «Los tres modos», etapa 5 (las superficies que enseñan).
 *
 * Lo que cercan estas pruebas:
 *
 *  - El índice de la Presentación por modo: la lista exacta de módulos que
 *    cada modo ve (Esencial 10 · Ritmo 14 · Completo 21), la vista de cada
 *    módulo íntegra (ningún capítulo vacío, ninguna escena huérfana) y los
 *    pasadores de escena fallados en la auditoría conjunta: las caras
 *    exactas del impacto (m15), la fila muda que en Completo no existe
 *    (notMode), la cara lectora de Deudas solo en Esencial (m19 *-h), la
 *    importación solo en Completo, el Estudio de Central solo desde Ritmo.
 *  - La regresión X-30: m17-hoy jamás vuelve a nombrar advice-tiles (la
 *    baldosa que en Esencial vive tras la puerta de Ritmo); su objeto es
 *    desk-hoy, la banda de Central.
 *  - La palanca vive en el Asesor (fallo 22): el capítulo «palanca» está en
 *    el módulo 8 y ya no está en Ahorros.
 *  - Los puentes tema→escena por modo: los cinco pares de los modos con su
 *    destino exacto, y la coherencia general — donde el tema vive y el
 *    módulo vive, el aterrizaje cae en un capítulo con escenas visibles.
 *  - El metadato del Manual (T-2): las 13 líneas de capítulo declaradas una
 *    vez, todo tema resuelve un modo, los conteos por modo clavados
 *    (118 · 229 · 353 — §6.1 contó 117 · 228 sobre 348 temas en la copia
 *    del estudio; desde entonces aterrizaron 5 temas y dos fallos de
 *    juicio declarados en BUILD-PLAN §C: exportar sigue a export.panel
 *    (Ritmo) y deudas-grafica a la cara lectora (Esencial)), y las
 *    excepciones §6.2 con su valor exacto.
 *  - La herencia en la búsqueda de Ajustes: un tema dormido no presta su
 *    título (el resolvedor llega como dato), y un tema vivo no se pierde.
 *  - La unificación: modes.ts no define nada (solo re-exporta de mode.ts)
 *    y la excepción modePending ya no existe en guion.test.ts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  MODULES, TOPIC_SCENES, chapterFirst, moduleById, moduleInMode, moduleView,
  overallProgress, sceneInMode, visibleScenes, type Scene,
} from "./guion.ts";
import { MODES, modeReaches, type Mode } from "./mode.ts";
import { CHAPTER_MODE, MANUAL_CHAPTERS, MANUAL_TOPICS, findTopic, topicMode, type Numbered } from "../manual/topics.ts";
import { searchSettings } from "./settings-search.ts";

const modById = (id: string) => moduleById(id)!;
const sceneById = (id: string): Scene => {
  for (const m of MODULES) for (const s of m.scenes) if (s.id === id) return s;
  throw new Error(`escena desconocida: ${id}`);
};
const indexOf = (mode: Mode) => MODULES.filter((m) => moduleInMode(m, mode)).map((m) => m.id);

describe("tres modos, etapa 5 — el índice de la Presentación por modo", () => {
  it("cada modo ve su lista exacta de módulos", () => {
    assert.deepEqual(indexOf("esencial"), ["mapa", "manual", "anotar", "mes", "folios", "puertas", "modos", "hoy", "asesor-esencial", "deudas"]);
    assert.deepEqual(indexOf("ritmo"), ["mapa", "manual", "anotar", "balanza", "cambio", "mes", "ahorros", "folios", "puertas", "modos", "hoy", "asesor-esencial", "asesor-ritmo", "deudas"]);
    assert.equal(indexOf("completo").length, 21);
    // La inclusión es monótona: lo que un modo ve, el siguiente también.
    for (const id of indexOf("esencial")) assert.ok(indexOf("ritmo").includes(id), `${id} de Esencial vive en Ritmo`);
    for (const id of indexOf("ritmo")) assert.ok(indexOf("completo").includes(id), `${id} de Ritmo vive en Completo`);
  });

  it("la vista de cada módulo en cada modo es íntegra: sin capítulos vacíos ni escenas huérfanas", () => {
    for (const mod of MODULES) for (const mode of MODES) {
      if (!moduleInMode(mod, mode)) continue;
      const view = moduleView(mod, mode);
      assert.ok(view.scenes.length > 0, `${mod.id} en ${mode} conserva escenas`);
      for (const ch of view.chapters) {
        assert.ok(view.scenes.some((s) => s.chapter === ch.id), `${mod.id}/${ch.id} en ${mode} no queda vacío`);
      }
      for (const s of view.scenes) assert.ok(view.chapters.some((c) => c.id === s.chapter), `${s.id} en ${mode} cuelga de un capítulo visible`);
    }
  });

  it("los pasadores de escena fallados en la auditoría conjunta", () => {
    // El Estudio de Central vive desde Ritmo (su botón nace con study.flow).
    assert.equal(sceneInMode(sceneById("m1-estudio"), "esencial"), false);
    assert.equal(sceneInMode(sceneById("m1-estudio"), "ritmo"), true);
    // Importar un banco es la maquinaria de Completo.
    assert.equal(sceneInMode(sceneById("m3-importar"), "ritmo"), false);
    assert.equal(sceneInMode(sceneById("m3-importar"), "completo"), true);
    // El impacto: cada escena enseña la bajada que su modo de verdad hace.
    assert.equal(sceneInMode(sceneById("m15-impacto"), "ritmo"), true);
    assert.equal(sceneInMode(sceneById("m15-impacto"), "esencial"), false);
    assert.equal(sceneInMode(sceneById("m15-impacto"), "completo"), false);
    assert.equal(sceneInMode(sceneById("m15-impacto-c"), "completo"), true);
    assert.equal(sceneInMode(sceneById("m15-impacto-c"), "ritmo"), false);
    // La fila muda y la sugerencia no existen en Completo: nada duerme allí.
    // ENMIENDA OLA 3 (E3-3): el par de la fila (m15-mudos, m15-solo-lectura)
    // ya NO «vive en Ritmo» — la fila es cara de Esencial por construcción
    // (nace solo donde los bolsillos no tienen cara propia) y en Ritmo las
    // escenas se saltaban en silencio en cada caminata. El par se declara
    // de Esencial y la ley se enseña en Ritmo con las variantes -r, sobre
    // la banda de bolsillos. La sugerencia no cambia: vive en los dos.
    for (const id of ["m15-mudos", "m15-solo-lectura"]) {
      assert.equal(sceneInMode(sceneById(id), "esencial"), true, `${id} vive en Esencial`);
      assert.equal(sceneInMode(sceneById(id), "ritmo"), false, `${id} ya no se ofrece en Ritmo: su ancla no nace allí`);
      assert.equal(sceneInMode(sceneById(id), "completo"), false, `${id} no se ofrece en Completo`);
    }
    for (const id of ["m15-mudos-r", "m15-solo-lectura-r"]) {
      assert.equal(sceneInMode(sceneById(id), "ritmo"), true, `${id} es la variante de Ritmo`);
      assert.equal(sceneInMode(sceneById(id), "esencial"), false, `${id} no se ofrece en Esencial`);
      assert.equal(sceneInMode(sceneById(id), "completo"), false, `${id} no se ofrece en Completo`);
    }
    assert.equal(sceneInMode(sceneById("m15-sugiere"), "esencial"), true, "m15-sugiere vive en Esencial");
    assert.equal(sceneInMode(sceneById("m15-sugiere"), "ritmo"), true, "m15-sugiere vive en Ritmo");
    assert.equal(sceneInMode(sceneById("m15-sugiere"), "completo"), false, "m15-sugiere no se ofrece en Completo");
    // Deudas: la cara lectora solo en Esencial; la de gestión, desde Ritmo.
    for (const id of ["m19-balanza-h", "m19-debo-h", "m19-tarjeta-h", "m19-cierre-h"]) {
      assert.equal(sceneInMode(sceneById(id), "esencial"), true, `${id} es la cara de Esencial`);
      assert.equal(sceneInMode(sceneById(id), "ritmo"), false, `${id} no se ofrece en Ritmo`);
    }
    for (const id of ["m19-balanza", "m19-debo", "m19-tarjeta", "m19-cierre"]) {
      assert.equal(sceneInMode(sceneById(id), "esencial"), false, `${id} es la cara de gestión`);
      assert.equal(sceneInMode(sceneById(id), "ritmo"), true, `${id} vive en Ritmo`);
    }
  });

  it("la regresión X-30: m17-hoy vive en Central (desk-hoy), jamás en la baldosa dormida", () => {
    const hoy = sceneById("m17-hoy");
    assert.ok(hoy.anchors.includes("desk-hoy"));
    assert.ok(!JSON.stringify(hoy.steps).includes("advice-tiles"), "m17-hoy no nombra la baldosa que en Esencial no se monta");
  });

  it("la palanca vive en el Asesor y ya no en Ahorros (fallo 22)", () => {
    assert.ok(modById("asesor").chapters.some((c) => c.id === "palanca"));
    assert.ok(!modById("ahorros").chapters.some((c) => c.id === "palanca"));
    for (const id of ["m6-palanca", "m6-abrir", "m6-anos", "m6-pin", "m6-cierre"]) {
      assert.ok(modById("asesor").scenes.some((s) => s.id === id), `${id} vive en el Asesor`);
      assert.ok(!modById("ahorros").scenes.some((s) => s.id === id), `${id} ya no vive en Ahorros`);
    }
  });

  it("el progreso se cuenta sobre las escenas visibles del modo", () => {
    const doneAll = (mode: Mode) => Object.fromEntries(indexOf(mode).map((id) => [id, { scene: 0, done: true }]));
    const indexMods = (mode: Mode) => MODULES.filter((m) => moduleInMode(m, mode));
    assert.equal(overallProgress(indexMods("esencial"), doneAll("esencial"), "esencial").pct, 100);
    assert.ok(overallProgress(MODULES, doneAll("esencial"), "completo").pct < 100, "contra el índice entero queda lo que Esencial no ve");
    assert.equal(overallProgress(indexMods("ritmo"), {}, "ritmo").pct, 0);
    // A medias en un módulo: la fracción se mide sobre SUS escenas visibles.
    const hoy = modById("hoy");
    const half = Math.floor(visibleScenes(hoy, "esencial").length / 2);
    const p = overallProgress([hoy], { hoy: { scene: half, done: false } }, "esencial");
    assert.equal(p.pct, Math.round((half / visibleScenes(hoy, "esencial").length) * 100));
  });
});

describe("tres modos, etapa 5 — los puentes tema→escena por modo", () => {
  it("los cinco puentes de los modos, con su destino exacto", () => {
    assert.deepEqual(TOPIC_SCENES["modos"], { moduleId: "modos", sceneId: "m15-modos" });
    assert.deepEqual(TOPIC_SCENES["puedes-gastar-hoy"], { moduleId: "hoy", sceneId: "m16-numero" });
    assert.deepEqual(TOPIC_SCENES["asesor-esencial"], { moduleId: "asesor-esencial", sceneId: "m17-asesor" });
    assert.deepEqual(TOPIC_SCENES["asesor-ritmo"], { moduleId: "asesor-ritmo", sceneId: "m18-asesor" });
    // deudas-hechos aterriza en la escena de SU cara (la lectora, Esencial);
    // en Ritmo y Completo el aterrizaje resuelve al inicio del capítulo.
    assert.deepEqual(TOPIC_SCENES["deudas-hechos"], { moduleId: "deudas", sceneId: "m19-balanza-h" });
  });

  it("donde el tema vive y el módulo vive, el aterrizaje cae en un capítulo con escenas", () => {
    for (const [topicId, target] of Object.entries(TOPIC_SCENES)) {
      const topic = findTopic(topicId);
      assert.ok(topic, `el tema del puente existe: ${topicId}`);
      const mod = modById(target.moduleId);
      for (const mode of MODES) {
        if (!modeReaches(mode, topicMode(topic))) continue;
        if (!moduleInMode(mod, mode)) continue; // el puente duerme con su módulo (hint.tsx no lo ofrece)
        const first = chapterFirst(mod, target.sceneId);
        assert.ok(first, `${topicId} aterriza en ${mode}`);
        assert.ok(moduleView(mod, mode).scenes.some((s) => s.chapter === first.chapter), `${topicId} en ${mode}: el capítulo del aterrizaje tiene escenas visibles`);
      }
    }
  });

  it("los cinco temas de los modos abren su módulo en su propio modo", () => {
    for (const topicId of ["modos", "puedes-gastar-hoy", "asesor-esencial", "asesor-ritmo", "deudas-hechos"]) {
      const target = TOPIC_SCENES[topicId]!;
      assert.ok(moduleInMode(modById(target.moduleId), topicMode(findTopic(topicId)!)), `${topicId}: su módulo vive en su modo`);
    }
  });
});

describe("tres modos, etapa 5 — el metadato del Manual (T-2)", () => {
  it("las líneas de capítulo están declaradas una vez y cubren los 13 capítulos", () => {
    assert.deepEqual(Object.keys(CHAPTER_MODE).sort(), MANUAL_CHAPTERS.map((c) => c.id).sort());
    assert.equal(CHAPTER_MODE["ajustes"], "completo");
    assert.equal(CHAPTER_MODE["central"], "esencial");
    assert.equal(CHAPTER_MODE["cobros"], "ritmo");
  });

  it("todo tema resuelve un modo y los conteos por modo son los fallados", () => {
    for (const tp of MANUAL_TOPICS) assert.ok(MODES.includes(topicMode(tp)), `${tp.id} resuelve un modo`);
    const count = (mode: Mode) => MANUAL_TOPICS.filter((tp) => modeReaches(mode, topicMode(tp))).length;
    // 354 desde la ayuda de la K (2026-11-16): «Cifras cortas» nace en Ritmo —
    // la cifra corta vive en las tarjetas de la banda, que en Esencial no se
    // muestran (X-3) y en Libros cuelgan de las puertas de la bóveda (Ritmo),
    // como su tema hermano «ahorros-banda» y el de «retiro».
    // ENMIENDA OLA 4 (fallo 25: el tema sigue a la función): los conteos se
    // mueven porque diez temas cambian de modo por adjudicación —
    // deudas-grafica E→C, si-apartas y meses-colchon R→C, cambio-ajustes
    // R→C (esencial −1, ritmo −4) y tc-total/tc-minimo/tc-fecha, tasa,
    // convertidor y donde-vive R→E (esencial +6 netos con la gráfica).
    // El mapa tema→función vive en modos-ola4.test.ts §1.
    // ENMIENDA OLA 5 (fallo 25, la misma ley): diecisiete temas más
    // cambian de modo por adjudicación — calendario, feriados,
    // f-icono-cuota y filtro E→R; estudio-prestamos E→C;
    // tarjetas-captura, rw-canjear, recompensas-tarjetas y
    // tc-recompensas R→C; y en la dirección del precedente tc-total
    // (la ola 4): regla-50-30-20, tu-mes, tus-100, que-se-movio,
    // dentro-del-tope, en-que-se-va y lo-que-me-deben C→R, y
    // palabras-claras C→E. Neto acumulado: esencial −4, ritmo +3.
    // El mapa COMPLETO tema→función (los 354) vive en
    // modos-ola5.test.ts §10.
    // ENMIENDA OLA 6 (OLA6-CARA: los sospechosos del §10, juzgados):
    // f-pagado-con, f-activo, f-recurrente, f-saldo-deuda, f-tasa-anual
    // y f-lista E→R (sus funciones son de Ritmo; dos de sus campos
    // ganan la puerta que les faltaba); cifras-asesor C→R (su función
    // es advisor.month-detail); tc-ganado, tc-promo y leer-estado
    // R→C (sus únicas superficies son de Completo). Neto de la ola:
    // esencial −6, ritmo +4, completo +2 en distribución exacta
    // (113 · 114 · 127); estos count() son acumulados por alcance
    // (113 · 227 · 354).
    // ENMIENDA OLA 7 (CARA-1/2/3: el tema sigue al CAMPO, no al libro):
    // f-primer-pago, f-frecuencia, f-tienda-elegir y f-cat-elegir
    // R→E (sus campos — subs.cadence-basic, editor.shop-fields — son
    // de Esencial: dormían sobre campos despiertos); f-proveedor,
    // f-codigo y f-enlace R→C (su campo, editor.shop-fine, solo
    // Completo lo pinta: enseñaban despiertos donde su función no
    // existe). Neto de la ola: esencial +4, ritmo −7, completo +3 en
    // distribución exacta (117 · 107 · 130); estos count() son
    // acumulados por alcance (117 · 224 · 354). La valla tema↔campo
    // vive en modos-ola7.test.ts §A.
    // ENMIENDA OLA 9 (los asientos fantasma): cuenta-movimiento y
    // f-cuenta-monto R→E (su gobernador real es accounts.move; el mapa
    // los cruzaba contra accounts.panel, que nadie consume);
    // f-retiro-acumulado C→R (vault.retiro; vault.retiro-fields era el
    // segundo fantasma); tiendas E→R (books.shops: su único (?) vive
    // en la tira de Ritmo). Neto de la ola: esencial +1, ritmo ±0,
    // completo −1 en distribución exacta (118 · 107 · 129); estos
    // count() son acumulados por alcance (118 · 225 · 354). La cerca
    // del censo vive en modos-ola9.test.ts §A.
    // ENMIENDA 1.3.318 (palabra de Oscar): calendario y feriados R→E
    // (nav.calendar es de Esencial — el plan es esencial); el acumulado
    // de Ritmo no se mueve (ambos temas quedan dentro de su alcance):
    // acumulados 120 · 225 · 354.
    // ENMIENDA CAPTURA OLA 1: nace el tema captura-mesa en Esencial
    // (capítulo libros; su función es capture.review): esencial +1 y el
    // total +1 — acumulados 121 · 226 · 355.
    // ENMIENDA CAPTURA OLA 2 (1.3.340): nace captura-texto en Esencial
    // (capítulo libros; su función es capture.text): esencial +1 y el
    // total +1 — acumulados 122 · 227 · 356.
    // ENMIENDA CAPTURA OLA 3 (1.3.342): nace captura-lista en Esencial
    // (capítulo libros; su función es capture.list): esencial +1 y el
    // total +1 — acumulados 123 · 228 · 357.
    // ENMIENDA CAPTURA OLA 4 (1.3.344): nace moneda-invitada en Esencial
    // (su función es settings.guest-currency): esencial +1 y el total +1
    // — acumulados 124 · 229 · 358.
    // ENMIENDA CAPTURA OLA 5A (1.3.345): nace preguntar-asesor en
    // Esencial (su función es advisor.ask): esencial +1 y el total +1
    // — acumulados 125 · 230 · 359.
    // ENMIENDA NOVEDADES (1.3.346): nace novedades en Esencial (su
    // función es settings.news): esencial +1 y el total +1
    // — acumulados 126 · 231 · 360.
    assert.equal(count("esencial"), 126);
    assert.equal(count("ritmo"), 231);
    assert.equal(count("completo"), 360);
    assert.equal(MANUAL_TOPICS.length, 360);
  });

  it("las excepciones de §6.2 llevan su valor exacto", () => {
    const mode = (id: string) => topicMode(findTopic(id)!);
    assert.equal(mode("exportar"), "ritmo"); // export.panel vive desde Ritmo
    assert.equal(mode("ventana-flotante"), "completo"); // H-4: duerme con su función
    assert.equal(mode("deudas-grafica"), "completo"); // OLA 4 (O4-C2): su función debt.chart es de Completo; la «cara lectora» era la montura sin puerta que la ola 3 puertabó — el tema sigue a la función
    assert.equal(mode("estudio-prestamos"), "completo"); // ENMIENDA OLA 5 (O5-C3): el tema enseña el pliegue de préstamos del Estudio (study.loans, Completo) — su propio texto trae la barra y «a quién le debes más»; el (?) de «Tus préstamos, en hechos» es de la cara lectora de Cobros, no de este tema. El pin viejo fijaba la herencia del capítulo contra el fallo 25.
    assert.equal(mode("plan-pago"), "completo"); // loans.payoff-plan
    assert.equal(mode("tc-uso"), "completo"); // el detalle fino de la tarjeta
    assert.equal(mode("estructura"), "ritmo"); // settings.structure-card
    assert.equal(mode("copias"), "esencial"); // la copia del libro es universal
    assert.equal(mode("donde-vive"), "esencial"); // OLA 4 (O4-C10): el tema es la PREGUNTA al crear (fallo 36: Esencial pregunta siempre); la postura de Ajustes a la que salta es otra cosa (settings.nature-stance, Ritmo)
    assert.equal(mode("proximos-pagos"), "esencial"); // la carpeta Agenda de Estudio vive en Esencial
    assert.equal(mode("retiro"), "ritmo"); // el bolsillo como nombre y monto
    assert.equal(mode("retiro-primerica"), "completo"); // el plan y su estudio
    assert.equal(mode("puedes-gastar-hoy"), "esencial");
    assert.equal(mode("deudas-hechos"), "esencial");
    assert.equal(mode("asesor-esencial"), "esencial");
    assert.equal(mode("asesor-ritmo"), "ritmo");
    assert.equal(mode("modos"), "esencial");
  });

  it("la búsqueda de Ajustes hereda el metadato: el tema dormido no presta su título", () => {
    const fake = (id: string, title: string, fold: string): Numbered => ({
      id, depth: "tip", title: [title, title], sum: [title, title], what: [title, title],
      go: { screen: "settings", fold, where: ["Ajustes", "Settings"] },
      num: "9.9", chapter: MANUAL_CHAPTERS[0]!,
    }) as unknown as Numbered;
    const topics = [fake("tema-vivo", "Tasa viva", "modo"), fake("tema-dormido", "Tasa dormida", "temas")];
    const resolver = (tp: Numbered): Mode => (tp.id === "tema-dormido" ? "completo" : "esencial");
    const enEsencial = searchSettings(topics, "tasa", "es", 6, "esencial", resolver).map((h) => h.id);
    assert.deepEqual(enEsencial, ["tema-vivo"], "en Esencial solo el tema vivo presta su título");
    const enCompleto = searchSettings(topics, "tasa", "es", 6, "completo", resolver).map((h) => h.id);
    assert.deepEqual(enCompleto.sort(), ["tema-dormido", "tema-vivo"], "en Completo ambos viven");
    // Y un tema vivo de verdad no se pierde por el camino: la tasa manual.
    assert.equal(searchSettings(MANUAL_TOPICS, "tasa manual", "es", 6, "esencial", topicMode)[0]!.go.anchor, "aj-rate");
  });
});

describe("tres modos, etapa 5 — la unificación y las excepciones muertas", () => {
  it("modes.ts no define nada: re-exporta de mode.ts, la única casa del tipo", () => {
    const text = readFileSync(new URL("./modes.ts", import.meta.url), "utf8");
    assert.ok(!/type Mode =/.test(text), "modes.ts no redefine el tipo Mode");
    assert.ok(!/modeRank =|const MODES/.test(text), "modes.ts no redefine valores");
    assert.ok(text.includes('from "./mode.ts"'), "modes.ts re-exporta de mode.ts");
    const modeText = readFileSync(new URL("./mode.ts", import.meta.url), "utf8");
    assert.ok(/export type Mode =/.test(modeText), "mode.ts es la casa del tipo");
  });

  it("la excepción modePending ya no existe en guion.test.ts", () => {
    const text = readFileSync(new URL("./guion.test.ts", import.meta.url), "utf8");
    assert.ok(!text.includes("modePending"), "sin excepciones: las anclas de los modos pasan por sus méritos");
    // Y las anclas que los módulos esperaban existen en las superficies (la
    // cerca de anclas de guion.test las verifica todas; aquí quedan clavadas
    // las de esta ola: cuatro literales, y aj-modo nace de la plantilla del
    // Fold, aj-${id}, con el fold «modo» declarado en screens.tsx).
    const gate = readFileSync(new URL("../../components/faro/mode-gate.tsx", import.meta.url), "utf8");
    const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
    assert.ok(gate.includes('data-anchor="modo-impacto"'), "la pantalla de impacto existe");
    assert.ok(screens.includes('data-anchor="desk-hoy"'), "la banda de hoy existe");
    assert.ok(screens.includes('data-anchor="modo-mudos"'), "la fila muda existe");
    assert.ok(screens.includes('data-anchor="modo-lista"'), "la lista de dormidos existe");
  });

  it("modeReaches es la tabla de verdad de siempre", () => {
    assert.equal(modeReaches("esencial", "esencial"), true);
    assert.equal(modeReaches("ritmo", "esencial"), true);
    assert.equal(modeReaches("esencial", "ritmo"), false);
    assert.equal(modeReaches("completo", "ritmo"), true);
    assert.equal(modeReaches("ritmo", "completo"), false);
    assert.equal(modeReaches("completo", "completo"), true);
  });
});
