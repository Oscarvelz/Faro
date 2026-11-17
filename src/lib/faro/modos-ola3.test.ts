/**
 * FARO — «Los tres modos», OLA 3 DE PREJUICIO: las cercas de la cura.
 *
 * Lo que cerca este archivo, cura por cura (el expediente vive en
 * ~/workspace/faro-modes-prejudice/OLA3-*.md y la cura en CURA-OLA3.md):
 *
 *  - E3-1 + Cambios C3-4: la casa de ejemplo viste el modo sin envenenar —
 *    ningún libro sellado escribe el espejo faro-mode, todo libro sellado
 *    nace vestido con el modo de la persona, y el préstamo del arranque no
 *    pisa el modo que la casa ya guarda. El índice dentro de la casa ofrece
 *    10/14/21 módulos según el modo (fallo 18).
 *  - E3-2/E3-3: el CENSO ancla→asiento cruzado contra la vista de cada
 *    modo — ninguna escena se ofrece en un modo donde su ancla duerme.
 *    Las cinco instancias de la ola (m3-bote, m9-vistas, m9-nombre,
 *    m6-mover, m6-lampara) y el par de la fila de mudos quedan fijados.
 *  - Cara C3-1…C3-6: las superficies declaradas ganan su puerta literal
 *    (scan.card-capture, cards.capture-add, tools.converter-send,
 *    remit.for, debt.chart, books.filter-chips), la burbuja (?) no enseña
 *    funciones dormidas, y el salto del tema «oportunidad» aterriza.
 *  - Cambios C3-1/C3-2/C3-3: el reconteo compara premisas — la dirección
 *    se re-plantea si se invirtió, el censo de avisos se cuenta contra el
 *    mes de referencia fijado al abrir, y la cuarta puerta anuncia el modo.
 *  - Asesor BR3-1/BR3-2/BR3-3: el titular de la PaceCard sin horizonte en
 *    Ritmo, DueSide respeta el null, y usedPct no viaja con valor fuera de
 *    Completo (tone se queda: es el semáforo de deuda, estado honesto).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { MODULES, moduleInMode, moduleView, sceneInMode, type Scene } from "./guion.ts";
import { translate } from "./i18n.ts";
import { FEATURES, currentRefDay, featureForGo, modeImpact, modeReaches, type FeatureId, type Mode } from "./mode.ts";
import { withSampleArc } from "./sample.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import { findTopic, topicMode } from "../manual/topics.ts";
import type { LedgerState, Line } from "./types.ts";

const MODES: Mode[] = ["esencial", "ritmo", "completo"];
const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const sceneById = (id: string): Scene => {
  for (const m of MODULES) for (const s of m.scenes) if (s.id === id) return s;
  throw new Error(`escena desconocida: ${id}`);
};
const sceneAnchors = (s: Scene): string[] => {
  const out = new Set<string>(s.anchors ?? []);
  for (const st of s.steps) if ("anchor" in st && st.anchor) out.add(st.anchor);
  return [...out];
};

/* ═══════════ 1 · LA CASA SELLADA VISTE EL MODO SIN ENVENENAR ═══════════ */

describe("ola3 · la casa de ejemplo (E3-1 / Cambios C3-4)", () => {
  const provider = SRC("../../components/faro/provider.tsx");

  it("ninguna sesión sellada escribe el espejo faro-mode; el espejo es solo del libro real", () => {
    assert.ok(provider.includes('if (!sealedOn()) localStorage.setItem("faro-mode"'),
      "la casa de ejemplo dejaba «completo» escrito en el espejo al entrar y envenenaba las lecciones lanzadas desde dentro");
  });

  it("todo libro sellado nace vestido con el modo de la persona, y el préstamo no pisa el modo propio de la casa", () => {
    assert.ok(provider.includes("sealedOn() && !saved && isMode(modeMirror)"),
      "el nacimiento vestido cubre a la casa de ejemplo, no solo al escenario");
    assert.ok(provider.includes("ledger.settings.mode === undefined && isMode(modeMirror)"),
      "el préstamo del arranque solo viste a quien no trae modo: el modo guardado de la casa no se sobrescribe en silencio");
  });

  it("el índice que la casa ofrece es el del modo de la persona: 10 / 14 / 21 (fallo 18)", () => {
    const counts = MODES.map((m) => MODULES.filter((x) => x.ready && moduleInMode(x, m)).length);
    assert.deepEqual(counts, [10, 14, 21], "Esencial ⊂ Ritmo ⊂ Completo, también dentro de la casa");
  });

  it("el módulo «Los modos» dentro de cualquier sesión: el par de la fila en Esencial, las variantes en Ritmo, ninguna en Completo", () => {
    const modos = MODULES.find((m) => m.id === "modos")!;
    const ids = (m: Mode) => moduleView(modos, m).scenes.map((s) => s.id);
    assert.ok(ids("esencial").includes("m15-mudos") && ids("esencial").includes("m15-solo-lectura"));
    assert.ok(ids("ritmo").includes("m15-mudos-r") && ids("ritmo").includes("m15-solo-lectura-r"));
    assert.ok(!ids("ritmo").includes("m15-mudos"), "la fila no nace en Ritmo: su escena ya no se ofrece ahí");
    assert.ok(!ids("completo").some((x) => x.startsWith("m15-mudos") || x.startsWith("m15-solo-lectura")));
    assert.deepEqual(MODES.map((m) => ids(m).length), [8, 10, 7], "las vistas del módulo: 8 / 10 / 7");
  });
});

/* ═══════════ 2 · EL CENSO ANCLA→ASIENTO (E3-2 / E3-3) ═══════════ */

/** EL CENSO: cada ancla de escena cuyo elemento lleva una puerta de modo
 *  en su componente, con el asiento que la manda — verificado leyendo la
 *  montura. Un ancla nueva con puerta entra aquí el día que nace; una
 *  escena jamás se ofrece donde su ancla duerme. */
const ANCHOR_SEAT: Record<string, FeatureId> = {
  "book-pot": "vault.pot", // el informe del Bote, en la línea recogida (fallo 6)
  "hist-views-btn": "hist.saved-views", // el botón de vistas guardadas (fallo 13)
  "hist-view-save": "hist.saved-views", // su fila de guardado vive tras el mismo panel
  "vault-grip": "vault.move-line", // el agarre para mover líneas de Ahorros
  "vault-sort": "books.vault-order", // la lámpara que abre el reorden de bloques
  "lever": "vault.lever", "lever-open": "vault.lever", "lever-pin": "vault.lever", "lever-years": "vault.lever",
  "book-span": "vault.span-cut", // el corte de período de los libros y de la bóveda
  "fx-send": "tools.converter-send", // el «Enviar a» del conversor (cura C3-2 de la Cara)
  "books-import": "import.bank", // la puerta de importación bajo los libros
};
/** Anclas de puerta INVERSA: la fila de datos mudos solo nace donde los
 *  bolsillos NO tienen cara propia (`!has("vault.meta")`) — Esencial. */
const ANCHOR_ESENCIAL_ONLY = ["modo-mudos", "modo-lista"];
/** Anclas construidas por plantilla (data-anchor={`…`}), no literales.
 *  Ola 4 (debilidad de cerca de Enseñanza IV): entra aj-rules — su montura
 *  es la plantilla de pliegues de Ajustes (screens.tsx: `aj-${id === "rate"
 *  ? "rules" : id}`) y su «existencia» la firmaba la colisión de subcadena
 *  dentro de aj-rules-bank. Las demás anclas computadas que la ola temía
 *  (hist-row, los ids del StatFold: pace, health, pulse, sankey, cushion,
 *  numeros, year) existen como TOKEN completo entre comillas en los
 *  componentes (props id="…"), así que el brazo de existencia endurecido
 *  las sigue firmando — por su token, no por colisión. */
const ANCHOR_DYNAMIC = ["chev-numeros", "aj-theme", "aj-structure", "aj-banks", "aj-backup", "aj-account", "aj-modo", "aj-rules", "modo-opt-esencial", "modo-opt-ritmo"];

describe("ola3 · el censo ancla→asiento cruzado contra cada modo (E3-2/E3-3)", () => {
  it("ninguna escena se ofrece en un modo donde su ancla duerme", () => {
    for (const mod of MODULES) {
      for (const mode of MODES) {
        if (!moduleInMode(mod, mode)) continue;
        for (const scene of moduleView(mod, mode).scenes) {
          for (const anchor of sceneAnchors(scene)) {
            const seat = ANCHOR_SEAT[anchor];
            if (seat) assert.ok(modeReaches(mode, FEATURES[seat]),
              `${scene.id} se ofrece en ${mode} pero su ancla ${anchor} vive en ${FEATURES[seat]} (${seat})`);
            if (ANCHOR_ESENCIAL_ONLY.includes(anchor)) assert.equal(mode, "esencial",
              `${scene.id} se ofrece en ${mode} pero ${anchor} solo nace en Esencial`);
          }
        }
      }
    }
  });

  it("las cinco instancias de la ola quedan fijadas en su bandera", () => {
    assert.equal(sceneInMode(sceneById("m3-bote"), "esencial"), false, "el Bote es de Ritmo (fallo 6)");
    assert.equal(sceneInMode(sceneById("m9-vistas"), "esencial"), false, "las vistas guardadas son de Ritmo (fallo 13)");
    assert.equal(sceneInMode(sceneById("m9-nombre"), "esencial"), false);
    assert.equal(sceneInMode(sceneById("m6-mover"), "ritmo"), false, "mover líneas es de Completo");
    assert.equal(sceneInMode(sceneById("m6-lampara"), "ritmo"), false, "el orden de bloques es de Completo");
    assert.equal(moduleView(MODULES.find((m) => m.id === "anotar")!, "esencial").scenes.length, 13,
      "la vista honesta de Esencial del módulo 3 es 13: la 14ª era la escena saltada en silencio");
  });

  it("toda ancla de escena existe en los componentes (token exacto o plantilla declarada)", () => {
    const dir = new URL("../../components/faro/", import.meta.url);
    const corpus = readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
    const all = new Set<string>();
    for (const m of MODULES) for (const s of m.scenes) for (const a of sceneAnchors(s)) all.add(a);
    // Ola 4: el brazo de existencia ya no acepta la subcadena desnuda —
    // `corpus.includes(a)` firmaba aj-rules por vivir dentro de
    // aj-rules-bank. Un ancla existe si aparece como TOKEN completo
    // (delimitada por caracteres ajenos a [A-Za-z0-9_-]) o si su
    // construcción por plantilla está declarada en ANCHOR_DYNAMIC.
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const a of all) {
      if (ANCHOR_DYNAMIC.includes(a)) continue;
      assert.ok(new RegExp(`(?<![A-Za-z0-9_-])${esc(a)}(?![A-Za-z0-9_-])`).test(corpus),
        `el ancla ${a} no existe como token en ningún componente (o su plantilla no está declarada): la escena caminaría hacia la nada`);
    }
    assert.ok(corpus.includes("modo-opt-"), "las opciones del selector se construyen por plantilla");
    assert.ok(corpus.includes("aj-"), "los pliegues de Ajustes se construyen por plantilla");
    assert.ok(corpus.includes('data-anchor={`aj-${'), "la plantilla de pliegues que construye aj-rules y sus hermanas sigue en screens.tsx");
  });

  it("cada asiento del censo tiene su puerta literal en la cara", () => {
    const dir = new URL("../../components/faro/", import.meta.url);
    const corpus = readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
    for (const [anchor, seat] of Object.entries(ANCHOR_SEAT)) {
      assert.ok(corpus.includes(`has("${seat}")`), `el asiento ${seat} del ancla ${anchor} perdió su puerta literal: el censo cruzaría contra el vacío`);
    }
    // DECLARACIÓN PRECISA (ola 4): la dirección inversa — DESCUBRIR un
    // ancla nueva con puerta no registrada — no se puede mecanizar en
    // este código sin falsos positivos: las puertas se computan en
    // variables (const canFilter = has(...), chipsAdminOk) a líneas o
    // archivos de distancia de la montura, y has() llega por contexto, así
    // que ningún patrón estático distingue una montura puertabada de una
    // libre. El censo es por ley un registro DECLARADO («un ancla nueva
    // con puerta entra aquí el día que nace»), y la red que caza la puerta
    // no registrada es la caminata en vivo: una escena ofrecida donde su
    // ancla duerme vuelve como escena saltada en el censo de saltos.
  });

  it("el censo no guarda asientos muertos: cada ancla censada sigue en el guion", () => {
    const all = new Set<string>();
    for (const m of MODULES) for (const s of m.scenes) for (const a of sceneAnchors(s)) all.add(a);
    for (const a of [...Object.keys(ANCHOR_SEAT), ...ANCHOR_ESENCIAL_ONLY]) assert.ok(all.has(a), `${a} ya no es ancla de escena: el censo se revisa`);
  });
});

/* ═══════════ 3 · LAS PUERTAS DE LA CARA (C3-1…C3-6) ═══════════ */

describe("ola3 · las superficies declaradas ganan su puerta (Cara III)", () => {
  it("la captura de tarjetas vive en Completo en sus tres puertas (C3-1)", () => {
    const cards = SRC("../../components/faro/cards.tsx");
    assert.ok((cards.match(/has\("scan\.card-capture"\)/g) ?? []).length >= 2,
      "el lector por foto manda en el botón del grupo y en el «Actualizar» de la ficha");
    assert.ok(cards.includes('has("cards.capture-add")'), "la captura al añadir lleva su propio asiento");
    assert.ok(cards.includes("onManual()"), "fuera de Completo, «Actualizar» lleva a la actualización a mano: la función no desaparece, cambia de camino");
  });

  it("el conversor no envía en Esencial y el «Para» no nace ni se guarda por debajo de Ritmo (C3-2)", () => {
    const instruments = SRC("../../components/faro/instruments.tsx");
    assert.ok(instruments.includes('has("tools.converter-send")'), "el botón «Enviar a» lleva la puerta de su asiento");
    const remesas = SRC("../../components/faro/remesas.tsx");
    assert.ok(remesas.includes('const canFor = has("remit.for")'), "el panel de envío lee el asiento del destinatario");
    assert.ok(remesas.includes("canFor && remit && toWho"), "el camino de guardado respeta la puerta: sin ella ninguna línea nace con destinatario");
    assert.ok(remesas.includes("canFor && remit ? <RemitToField"), "el campo «Para» solo se pinta con su puerta");
  });

  it("la gráfica de la deuda: asiento, salto y las tres monturas dicen lo mismo (C3-5)", () => {
    const debts = SRC("../../components/faro/debts.tsx");
    assert.equal((debts.match(/<DebtChart \/>/g) ?? []).length, 3, "la gráfica tiene tres monturas");
    assert.equal((debts.match(/has\("debt\.chart"\) \? <DebtChart \/>/g) ?? []).length, 3,
      "y las tres llevan la puerta de su asiento (la cara lectora ya no la pinta sin puerta)");
  });

  it("la burbuja (?) no enseña funciones dormidas: el aviso de la caída abre el texto (C3-3)", () => {
    const hint = SRC("../../components/faro/hint.tsx");
    // ENMIENDA OLA 4 (O4-C5): la ola 4 probó que anunciar y luego enseñar
    // íntegro el tema dormido seguía siendo enseñar una función ausente.
    // La burbuja ahora anuncia SIN enseñar (llave corta mode.dormant.short;
    // el aviso largo queda en el salto de goTopic, donde el Manual sí abre
    // la explicación). El pin se re-apunta a la llave corta; la cerca de la
    // ola 4 fija que el cuerpo no se pinta cuando el tema duerme.
    assert.ok(hint.includes("topicSleeps") && hint.includes('t("mode.dormant.short")'),
      "Hint consulta el modo del tema como sus puentes ya hacían, y nombra dónde vive sin enseñar lo dormido");
  });

  it("el filtro de Libros lleva su puerta en el botón, el menú, los chips y el propio filtrado (C3-6)", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('const canFilter = has("books.filter-chips")'));
    assert.ok(screens.includes('!canFilter || chip === "all"'), "el chip elegido no filtra en silencio donde su cara duerme");
    assert.ok(screens.includes('canFilter && (asCloud || asDrift) && present.length > 1'), "el botón de la nube/drift lleva la puerta");
    assert.ok(screens.includes('canFilter && !asCloud && !asDrift && chipSource.length > 1'), "la fila de chips lleva la puerta");
  });

  it("el salto del tema «oportunidad» aterriza: la franja es mueble universal, no el kicker del Asesor (C3-4)", () => {
    const tp = findTopic("oportunidad")!;
    assert.equal(topicMode(tp), "esencial", "el tema es de Esencial: define la cifra como el resto declarado");
    assert.equal(featureForGo({ screen: tp.go!.screen, anchor: tp.go!.anchor }), null,
      "featureForGo ya no manda el salto a advisor.kicker (Completo): la franja se pinta en los tres modos y el salto aterriza");
    assert.equal(FEATURES["advisor.kicker"], "completo", "el kicker del Asesor conserva su asiento: su frase sí interpreta");
  });
});

/* ═══════════ 4 · EL RECONTO COMPARA PREMISAS (Cambios III) ═══════════ */

describe("ola3 · el reconto compara premisas (Cambios C3-1/C3-2/C3-3)", () => {
  const RealDate = Date;
  const setClock = (iso: string) => {
    const t = new RealDate(iso).getTime();
    globalThis.Date = class extends RealDate {
      // Sin argumentos devuelve la hora fijada; con argumentos, los pasa
      // tal cual al constructor real (las rutas del censo usan 0 y 1).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...a: any[]) {
        if (a.length === 0) super(t);
        else if (a.length === 1) super(a[0]);
        else super(a[0], a[1], a[2] ?? 1, a[3] ?? 0, a[4] ?? 0, a[5] ?? 0, a[6] ?? 0);
      }
      static now() { return t; }
    } as DateConstructor;
  };
  let seq = 0;
  const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }): Line => {
    seq += 1;
    const id = `o3-${seq}`;
    return {
      id, seriesId: id, monthKey: "2026-11", concept: "", currency: "NIO", active: true, note: "",
      categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
      productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
      icon: "", history: [], ...partial,
    } as Line;
  };
  /** El espécimen de Cambios: un libro cuyo impacto son SOLO avisos del mes. */
  const alertsOnlyBook = (): LedgerState => {
    const book = createInitial("es", "claro");
    book.settings.mode = "completo";
    const catAny = book.structure.categories.find((c) => c.role !== "savings" && c.role !== "debt")!.id;
    book.months["2026-11"] = { lines: [
      line({ kind: "income-fixed", amountMinor: 900000, categoryId: catAny, concept: "Salario" }),
      line({ kind: "expense-fixed", amountMinor: 60000, categoryId: catAny, recurring: true, cadence: "monthly", nextDue: "2026-11-20", concept: "Renta" }),
      line({ kind: "expense-variable", amountMinor: 450000, categoryId: catAny, concept: "Gasto grande" }),
    ] };
    return book;
  };

  it("C3-2: contra la fecha de referencia fijada, la medianoche ya no cambia la foto ni acusa al libro", () => {
    const book = alertsOnlyBook();
    try {
      setClock("2026-11-17T12:00:00");
      const photo = modeImpact(book, "esencial", "es", "2026-11-17");
      assert.ok(photo.total > 0 && photo.groups.length === 0, "el impacto nace solo de avisos");
      setClock("2026-12-01T00:01:00");
      const recounted = modeImpact(book, "esencial", "es", "2026-11-17");
      assert.equal(JSON.stringify(recounted), JSON.stringify(photo),
        "el reconteo contra la MISMA fecha da la misma foto: el calendario ya no se disfraza de cambio del libro");
      const december = modeImpact(book, "esencial", "es", "2026-12-01");
      assert.notEqual(JSON.stringify(december), JSON.stringify(photo),
        "la referencia manda de verdad: el censo de diciembre es otro censo, no una foto congelada");
    } finally { globalThis.Date = RealDate; }
  });

  it("C3-2: el diálogo guarda su fecha de referencia y reconta contra ella (fuente)", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes("refDay: string"), "el estado del diálogo guarda sus premisas");
    assert.ok(screens.includes('modeImpact(session.ledger, target, lang, modeImpactState.refDay)'),
      "el reconteo al confirmar usa la fecha fijada al abrir");
    assert.match(currentRefDay(), /^\d{4}-\d{2}-\d{2}$/);
  });

  it("C3-1: si la dirección se invirtió bajo el diálogo, la confirmación se re-plantea como subida (fuente)", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes("modeRank(target) > modeRank(live)"), "la dirección se compara antes que los conteos");
    assert.ok(screens.includes("setModeReposed("), "el diálogo se re-plantea en la dirección verdadera");
    assert.ok(screens.includes("unlockedGroups(session.ledger, live, target)"), "la subida re-planteada nombra lo destapado en este libro");
    const gate = SRC("../../components/faro/mode-gate.tsx");
    assert.ok(gate.includes("ModeReposedDialog") && gate.includes('data-anchor="modo-replanteado"'),
      "existe la pantalla re-planteada, con su propia confirmación («Subir a…»)");
    for (const key of ["mode.reposed.title", "mode.reposed.body", "mode.reposed.list", "mode.reposed.yes", "mode.arrived.tab"]) {
      assert.ok(translate("es", key) !== key && translate("en", key) !== key, `la clave ${key} existe en los dos idiomas`);
    }
  });

  it("C3-3: la cuarta puerta (adoptStoredPack) anuncia el modo que llega cuando difiere", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    const start = provider.indexOf("function adoptStoredPack()");
    const body = provider.slice(start, provider.indexOf("\n  }", start));
    assert.ok(body.includes('translate(inLang, "mode.arrived.tab")'),
      "adoptar el paquete de la otra pestaña nombra el modo que aterriza, como sus tres hermanas");
    assert.ok(body.includes("landedMode !== prevMode"), "y solo cuando el modo de verdad cambió");
  });
});

/* ═══════════ 5 · LAS ÚLTIMAS CIFRAS (Asesor III) ═══════════ */

describe("ola3 · las últimas cifras (BR3-1/BR3-2/BR3-3)", () => {
  it("BR3-3: usedPct viaja con valor solo en Completo; tone viaja igual en los tres (es el semáforo, no el ritmo)", () => {
    const book = withSampleArc(createInitial("es", "claro")).ledger;
    const key = Object.keys(book.months).filter((k) => (book.months[k]?.lines.length ?? 0) > 0).sort().at(-1)!;
    const snap = (mode: Mode) => {
      const c = structuredClone(book);
      c.settings.mode = mode;
      return buildWidgetSnapshot(c, "es", { today: `${key}-15`, hide: false, lock: false });
    };
    const [e, r, c] = MODES.map(snap);
    assert.equal(e.usedPct, null, "Esencial: la foto no lleva la cifra semilla de la proyección");
    assert.equal(r.usedPct, null, "Ritmo: tampoco — su única cara en la foto es la torre, de Completo");
    assert.equal(typeof c.usedPct, "number", "Completo: usedPct viaja con su valor");
    assert.equal(e.tone, c.tone); assert.equal(r.tone, c.tone);
  });

  it("BR3-1: la PaceCard en Ritmo describe el pasado; el horizonte solo vive con pano.runway-patron (fuente)", () => {
    const pano = SRC("../../components/faro/panorama.tsx");
    assert.ok(pano.includes('const full = has("pano.runway-patron")'), "la tarjeta lee el asiento del Patrón");
    assert.ok(pano.includes("Del mes ya van") && pano.includes("Days gone this month"),
      "el segundo bloque en Ritmo cuenta los días corridos, no los que el ingreso «dura»");
    assert.ok(pano.includes("full && extra > 0"), "la medalla de días extra solo existe en la forma completa");
  });

  it("BR3-2: DueSide suma solo lo cifrado y declara lo no cifrado, en el titular y en el «+N más» (fuente)", () => {
    const side = SRC("../../components/faro/book-side.tsx");
    // ENMIENDA OLA 4 (BR4-2): la ola 4 probó que las sumas de esta cura
    // (soonKnown/soonUnknown) contaban solo la mitad por-vencer — un
    // vencido con cifra quedaba fuera de la suma y uno sin cifra fuera
    // de la declaración. Las sumas ahora cubren la ventana entera
    // (known/unknown sobre `list`); el pin se re-apunta a ellas y la
    // verdad de BR3-2 se conserva y se agranda: el titular declara los
    // vencimientos sin importe — vencidos y próximos — en vez de
    // pintarlos C$0.00. Los especímenes viven en modos-ola4.test.ts §5.
    assert.ok(side.includes("unknown") && side.includes("sin importe conocido"),
      "el titular declara los vencimientos sin importe en vez de pintarlos C$0.00");
    assert.ok(side.includes("hiddenUnknown"), "la fila «+N más» hace lo mismo con lo escondido");
  });
});
