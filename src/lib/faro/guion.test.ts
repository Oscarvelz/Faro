// Las cercas de la Presentación Guiada (plan formal, §5). Como nombres.test.ts prueba el
// registro de enlaces, esta suite prueba el registro de guiones entero:
//  1. BILINGÜE — ningún texto de escena, título, promesa o clave existe en un solo idioma,
//     y cada pie obedece el techo de la casa (≤15 palabras, ≤150 caracteres, en AMBOS).
//  2. ANCLAS VIVAS — toda ancla citada por el registro existe como data-anchor en los
//     componentes: si una ola mueve o remueve un control, esta cerca se pone roja ANTES
//     de publicar y nombra el ancla muerta (ley de mantenimiento).
//  3. EL SELLO — el escenario es un tercer namespace en samplemode.ts: sus claves se
//     mapean a sí mismas (nunca se re-prefijan), la bandera del escenario jamás se escribe
//     en almacenamiento (ningún arranque puede aterrizar dentro de él) y entrar en el
//     escenario no lee ni escribe una sola clave personal (eso lo prueba el banco; aquí
//     se cerca la mecánica de claves).
//  4. LA ESCALERA SANA — ids únicos, cada escena en un capítulo declarado, cada capítulo
//     con escenas, y el reloj proporcional: un pie más largo vive más.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { MODULES, RESULT_MS, TOPIC_SCENES, allAnchors, chapterFirst, durationLabel, dwellMs, moduleById, moduleSeconds, overallProgress, paceOf, scenePlace, searchScenes, stepMs, wordCount, type Pair } from "./guion.ts";
import { MODES } from "./modes.ts";
import { STAGE_SEEDS } from "./stage-seeds.ts";
import { createInitial } from "./defaults.ts";
import { isDataKey } from "./samplemode.ts";

const COMPONENTS = path.join(process.cwd(), "src/components/faro");
const componentSource = fs
  .readdirSync(COMPONENTS)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => fs.readFileSync(path.join(COMPONENTS, f), "utf8"))
  .join("\n");

const pairsOf = (): { where: string; pair: Pair }[] => {
  const out: { where: string; pair: Pair }[] = [];
  for (const mod of MODULES) {
    out.push({ where: `${mod.id}.title`, pair: mod.title });
    out.push({ where: `${mod.id}.promise`, pair: mod.promise });
    for (const ch of mod.chapters) out.push({ where: `${mod.id}/${ch.id}`, pair: ch.title });
    for (const scene of mod.scenes) {
      scene.keys.forEach((k, i) => out.push({ where: `${scene.id}.keys[${i}]`, pair: k }));
      for (const step of scene.steps) {
        if (step.kind === "show" || step.kind === "ask" || step.kind === "do" || step.kind === "type") {
          out.push({ where: `${scene.id}:${step.kind}`, pair: step.caption });
          if (step.contexto) out.push({ where: `${scene.id}:contexto`, pair: step.contexto });
        }
        if (step.kind === "type") out.push({ where: `${scene.id}:type-text`, pair: step.text });
      }
    }
  }
  return out;
};

describe("guion: bilingüe completo", () => {
  it("todo texto existe en español y en inglés, sin vacíos", () => {
    for (const { where, pair } of pairsOf()) {
      assert.ok(pair[0].trim().length > 0, `${where}: falta el español`);
      assert.ok(pair[1].trim().length > 0, `${where}: falta el inglés`);
      // Un par idéntico solo se admite si es un nombre de una palabra que no se traduce
      // (el caso «Folios», fallado por Oscar: la única palabra del dock que no se traduce).
      if (pair[0] === pair[1]) {
        assert.ok(!/\s/.test(pair[0].trim()), `${where}: el par es el mismo texto dos veces`);
      }
    }
  });

  it("cada pie obedece el techo: ≤15 palabras y ≤150 caracteres en ambos idiomas", () => {
    for (const mod of MODULES) {
      for (const scene of mod.scenes) {
        for (const step of scene.steps) {
          if (step.kind !== "show" && step.kind !== "ask" && step.kind !== "do" && step.kind !== "type") continue;
          for (const lang of [0, 1] as const) {
            const text = step.caption[lang];
            assert.ok(wordCount(text) <= 15, `${scene.id}: pie de ${wordCount(text)} palabras (${text})`);
            assert.ok(text.length <= 150, `${scene.id}: pie de ${text.length} caracteres`);
          }
        }
      }
    }
  });

  it("la ventanita de contexto obedece su techo: ≤20 palabras y ≤170 caracteres", () => {
    for (const mod of MODULES) {
      for (const scene of mod.scenes) {
        for (const step of scene.steps) {
          if (!("contexto" in step) || !step.contexto) continue;
          for (const lang of [0, 1] as const) {
            const text = step.contexto[lang];
            assert.ok(wordCount(text) <= 20, `${scene.id}: contexto de ${wordCount(text)} palabras (${text})`);
            assert.ok(text.length <= 170, `${scene.id}: contexto de ${text.length} caracteres`);
          }
        }
      }
    }
  });
});

describe("guion: anclas vivas", () => {
  it("toda ancla del registro existe como data-anchor en los componentes", () => {
    for (const anchor of allAnchors()) {
      // Literal (data-anchor="x") o dinámica con el literal dentro de la expresión
      // (data-anchor={cond ? "x" : undefined}): en ambos casos el componente la produce.
      const plain = componentSource.includes(`data-anchor="${anchor}"`);
      const dynamic = new RegExp(`data-anchor=\\{[^}]*"${anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(componentSource);
      // Plantilla sobre un id finito: el chevron de StatFold produce `chev-<id>` para
      // cada pliegue declarado con id="<id>" — el ancla vive si la plantilla y el id viven.
      const chev = /^chev-(.+)$/.exec(anchor);
      const templated = Boolean(chev && componentSource.includes("data-anchor={`chev-${") && componentSource.includes(`id="${chev[1]}"`));
      // El propio StatFold produce data-anchor={id}: el ancla vive si un pliegue la declara.
      const folded = componentSource.includes("data-anchor={id}") && componentSource.includes(`<StatFold id="${anchor}"`);
      // Los pliegues de Ajustes producen data-anchor={`aj-${id}`}: «aj-<x>» vive si un
      // <Fold id="x"> la declara («aj-rules» nace del Fold id="rate", su caso especial).
      const aj = /^aj-(.+)$/.exec(anchor);
      const ajFolded = Boolean(aj && componentSource.includes("data-anchor={`aj-${") && (componentSource.includes(`<Fold id="${aj[1]}"`) || (aj[1] === "rules" && componentSource.includes('<Fold id="rate"'))));
      // Vía prop: StreamRow recibe anchor="…" y lo vuelca en su data-anchor.
      const viaProp = new RegExp(`anchor=\\{[^}]*"${anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(componentSource);
      // Plantilla sobre los tres modos: el selector produce `modo-opt-<modo>`
      // para cada modo de MODES — el ancla vive si la plantilla y el modo viven.
      const modoOpt = /^modo-opt-(.+)$/.exec(anchor);
      const modoOptLive = Boolean(modoOpt && componentSource.includes("data-anchor={`modo-opt-${") && componentSource.includes(`"${modoOpt[1]}"`));
      assert.ok(
        plain || dynamic || templated || folded || viaProp || ajFolded || modoOptLive,
        `ancla muerta: "${anchor}" no aparece en ningún componente — el módulo que la cita debe revisarse`,
      );
    }
  });

  it("toda escena declara las anclas que sus pasos tocan", () => {
    for (const mod of MODULES) {
      for (const scene of mod.scenes) {
        for (const step of scene.steps) {
          if (step.kind === "show" || step.kind === "ask" || step.kind === "do" || step.kind === "tap" || step.kind === "type") {
            assert.ok(scene.anchors.includes(step.anchor), `${scene.id}: el paso toca "${step.anchor}" sin declararla`);
          }
        }
      }
    }
  });
});

describe("guion: la escalera sana y el reloj", () => {
  it("ids de módulo, capítulo y escena únicos; escenas en capítulos declarados", () => {
    const seen = new Set<string>();
    for (const mod of MODULES) {
      assert.ok(!seen.has(mod.id), `módulo repetido: ${mod.id}`);
      seen.add(mod.id);
      const chapterIds = new Set(mod.chapters.map((c) => c.id));
      for (const scene of mod.scenes) {
        assert.ok(!seen.has(scene.id), `escena repetida: ${scene.id}`);
        seen.add(scene.id);
        assert.ok(chapterIds.has(scene.chapter), `${scene.id}: capítulo no declarado "${scene.chapter}"`);
      }
      for (const ch of mod.chapters) {
        assert.ok(mod.scenes.some((s) => s.chapter === ch.id), `${mod.id}/${ch.id}: capítulo sin escenas`);
      }
      if (mod.ready) assert.ok(mod.scenes.length > 0, `${mod.id}: listo pero sin escenas`);
    }
  });

  it("el reloj es proporcional: más palabras, más permanencia", () => {
    const short = dwellMs(["Cinco palabras tiene este pie.", "Five words in this caption."], "es");
    const long = dwellMs(["Este pie tiene el doble de palabras que el otro pie corto.", "This caption has twice the words of the other short one."], "es");
    assert.ok(long > short, "un pie más largo debe vivir más en pantalla");
    const fifteen = dwellMs(["Uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince.", "x"], "es");
    assert.ok(fifteen >= 5000 && fifteen <= 6500, `15 palabras ≈ 5–6s (fue ${fifteen}ms)`);
  });

  it("la duración anunciada de un módulo listo es plausible (1–10 minutos)", () => {
    for (const mod of MODULES) {
      if (!mod.ready) continue;
      const sec = moduleSeconds(mod, "es");
      assert.ok(sec >= 60 && sec <= 600, `${mod.id}: duración anunciada de ${sec}s`);
    }
  });

  it("la etiqueta de duración dice «Aprox.»/«Approx.», nunca «unos» ni «about» (ley de Oscar, 2026-11-14)", () => {
    for (const mod of MODULES) {
      assert.match(durationLabel(mod, "es"), /^Aprox\. \d+ min$/, `${mod.id}: etiqueta ES`);
      assert.match(durationLabel(mod, "en"), /^Approx\. \d+ min$/, `${mod.id}: etiqueta EN`);
    }
  });
});

describe("guion: los 18 principios — la escala, la secuencia y la honestidad (2026-11-15)", () => {
  it("principio 2: la escala recalibrada — la antigua 0.5× es la nueva 1× y cada etiqueta se reescala en proporción", () => {
    assert.equal(paceOf(1), 0.5, "la nueva 1× corre al ritmo de la antigua 0.5×");
    assert.equal(paceOf(2), 1, "la nueva 2× es la antigua 1×");
    assert.equal(paceOf(0.5), 0.25, "la nueva 0.5× es el ritmo de estudio, el más lento");
    assert.equal(paceOf(4), 2, "la nueva 4× es la antigua 2×");
    // Las duraciones anunciadas viven en la misma escala: un módulo dura el
    // doble de su suma al ritmo base, porque la nueva 1× es la mitad de él.
    for (const mod of MODULES) {
      if (!mod.ready) continue;
      const base = mod.scenes.reduce((sum, s) => sum + s.steps.reduce((a, st) => a + stepMs(st, "es"), 0), 0);
      assert.equal(moduleSeconds(mod, "es"), Math.round(base / paceOf(1) / 1000), `${mod.id}: la duración anunciada no sigue la escala`);
    }
  });

  it("principios 16 y 9: lo anunciado es lo ejecutado — tras el pie entero, la acción y su momento de resultado", () => {
    for (const mod of MODULES) {
      for (const scene of mod.scenes) {
        for (const step of scene.steps) {
          if (step.kind === "do" || step.kind === "type") {
            const contextoMs = step.contexto ? Math.round((wordCount(step.contexto[0]) / 200) * 60_000) : 0;
            assert.equal(
              stepMs(step, "es"),
              dwellMs(step.caption, "es") + contextoMs + RESULT_MS,
              `${scene.id}: un ${step.kind} anuncia pie + RESULT_MS (el motor corre exactamente eso)`,
            );
          }
          if (step.kind === "tap") assert.equal(stepMs(step, "es"), 720, `${scene.id}: la maquinaria sin pie anuncia sus 720 exactos (300 + toque + 420)`);
          if (step.kind === "seed") assert.equal(stepMs(step, "es"), 600, `${scene.id}: sembrar anuncia 600`);
          if (step.kind === "go") assert.equal(stepMs(step, "es"), 1400, `${scene.id}: viajar anuncia 1400`);
        }
      }
    }
  });

  it("principio 15: el teatro del widget se declara modelo — su pie dice «en escena», nunca se hace pasar por la pantalla real", () => {
    const mapa = moduleById("mapa");
    const scene = mapa?.scenes.find((s) => s.id === "m1-widget-mes");
    const show = scene?.steps.find((st) => st.kind === "show");
    assert.ok(show && show.kind === "show", "la escena del widget existe y abre con un show");
    if (show && show.kind === "show") {
      assert.match(show.caption[0], /en escena/, "el pie ES declara el modelo");
      assert.match(show.caption[1], /on stage/, "el pie EN declara el modelo");
      assert.ok(!/^Esto es|^This is/.test(show.caption[0]) && !/^This is/.test(show.caption[1]), "ningún pie afirma que el modelo ES la pantalla");
    }
  });
});

describe("guion: las semillas del escenario", () => {
  it("toda semilla citada por el registro existe en stage-seeds.ts", () => {
    for (const mod of MODULES) {
      for (const scene of mod.scenes) {
        for (const step of scene.steps) {
          if (step.kind === "seed") {
            assert.ok(STAGE_SEEDS[step.seed], `${scene.id}: semilla desconocida "${step.seed}"`);
          }
        }
      }
    }
  });

  it("sembrar dos veces no duplica (la escena puede repetirse)", () => {
    const seed = STAGE_SEEDS["widget-mes"]!;
    const base = seed({ months: {} } as never);
    const again = seed(base);
    assert.equal(JSON.stringify(again), JSON.stringify(base), "la semilla del widget debe ser idempotente");
  });

  it("las semillas de Anotar tampoco duplican al repetirse", () => {
    for (const name of ["anotar-mes", "anotar-deudas"]) {
      const seed = STAGE_SEEDS[name]!;
      const base = seed(createInitial());
      const again = seed(base);
      assert.equal(JSON.stringify(again), JSON.stringify(base), `la semilla ${name} debe ser idempotente`);
    }
  });
});

describe("guion: los puentes", () => {
  it("la búsqueda encuentra la escena de la puerta por su llave", () => {
    const hits = searchScenes("puerta");
    assert.ok(hits.some((h) => h.sceneId === "m9-puerta"), "«puerta» debe encontrar la escena de la puerta");
    const calc = searchScenes("cálculo");
    assert.ok(calc.some((h) => h.sceneId === "m7-calculo"), "«cálculo» debe encontrar Ver el cálculo");
    assert.equal(searchScenes("x").length, 0, "una búsqueda sin palabras no devuelve nada");
  });

  it("toda escena tiene un lugar real alcanzable", () => {
    for (const mod of MODULES) {
      for (const scene of mod.scenes) {
        const place = scenePlace(mod, scene.id);
        assert.ok(typeof place === "string" && place.length > 0, `${scene.id}: sin lugar`);
      }
    }
    // La escena de la puerta vive hoy en «folios-descanso» (la partición del
    // fallo 19, etapa 5); su lugar sigue siendo el Archivo.
    const folios = moduleById("folios-descanso")!;
    assert.equal(scenePlace(folios, "m9-puerta"), "archivo");
  });

  it("el aterrizaje con contexto es la primera escena del capítulo", () => {
    // La partición de Folios (fallo 19, etapa 5 de los modos): el capítulo de
    // la puerta vive hoy en «folios-descanso»; el ejemplo se mueve con él.
    const folios = moduleById("folios-descanso")!;
    assert.equal(chapterFirst(folios, "m9-puerta").id, "m9-escalera");
    for (const mod of MODULES) for (const scene of mod.scenes) {
      assert.equal(chapterFirst(mod, scene.id).chapter, scene.chapter, `${scene.id}: capítulo distinto`);
    }
  });

  it("el mapa tema→escena apunta a escenas que existen", () => {
    for (const [topic, target] of Object.entries(TOPIC_SCENES)) {
      const mod = moduleById(target.moduleId);
      assert.ok(mod, `tema ${topic}: módulo ${target.moduleId} no existe`);
      assert.ok(mod!.scenes.some((s) => s.id === target.sceneId), `tema ${topic}: escena ${target.sceneId} no existe`);
    }
  });
});

describe("guion: el sello del escenario", () => {
  it("las claves del escenario se mapean a sí mismas; las personales son de datos", () => {
    assert.equal(isDataKey("faro.pack.local"), true);
    assert.equal(isDataKey("faro.stage:faro.pack.local"), false, "una clave del escenario no debe re-prefijarse");
    assert.equal(isDataKey("faro.sample:faro.pack.local"), false);
    assert.equal(isDataKey("faro-theme"), false, "el tema es compartido, nunca del escenario");
  });

  it("la bandera del escenario jamás se escribe en almacenamiento", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/faro/samplemode.ts"), "utf8");
    assert.ok(src.includes("STAGE_PREFIX"), "samplemode debe conocer el namespace del escenario");
    assert.ok(!/setItem\([^)]*[Ss]tage/.test(src), "ningún setItem puede guardar una bandera de escenario");
    assert.ok(!/raw\??\.set\([^)]*[Ss]tage/.test(src), "ninguna escritura cruda puede guardar una bandera de escenario");
    assert.ok(src.includes('return stage ? "stage"'), "dataMode debe poder decir «stage»");
  });
});

describe("guion: la línea general de progreso (cuenta honesta)", () => {
  const fake = (id: string, scenes: number) => ({
    id, n: 0, title: [id, id] as Pair, promise: [id, id] as Pair, ready: true,
    chapters: [], scenes: Array.from({ length: scenes }, (_, i) => ({ id: `${id}-${i}`, chapter: "c", anchors: [], keys: [], steps: [] })),
  });

  it("sin tocar nada: 0%, y el resto es todo", () => {
    const p = overallProgress(MODULES, {});
    assert.equal(p.pct, 0);
    assert.equal(p.done, 0);
    assert.equal(p.inProgress, 0);
    assert.equal(p.total, MODULES.filter((m) => m.ready).length);
    assert.equal(p.remaining, 100);
  });

  it("todo terminado: 100% y nada en curso", () => {
    const state = Object.fromEntries(MODULES.filter((m) => m.ready).map((m) => [m.id, { scene: 0, done: true }]));
    const p = overallProgress(MODULES, state);
    assert.equal(p.pct, 100);
    assert.equal(p.done, p.total);
    assert.equal(p.inProgress, 0);
    assert.equal(p.remaining, 0);
  });

  it("el 50% exacto: un módulo entero de dos", () => {
    const mods = [fake("a", 4), fake("b", 4)];
    const p = overallProgress(mods as never, { a: { scene: 0, done: true } });
    assert.equal(p.pct, 50);
    assert.equal(p.done, 1);
    assert.equal(p.total, 2);
  });

  it("a medias cuenta su fracción: la mitad de un módulo de dos es el 25%", () => {
    const mods = [fake("a", 4), fake("b", 4)];
    const p = overallProgress(mods as never, { a: { scene: 2, done: false } });
    assert.equal(p.pct, 25);
    assert.equal(p.done, 0);
    assert.equal(p.inProgress, 1);
    assert.equal(p.remaining, 75);
  });

  it("abrir un módulo sin caminarlo no cuenta como en curso ni suma", () => {
    const mods = [fake("a", 4), fake("b", 4)];
    const p = overallProgress(mods as never, { a: { scene: 0, done: false } });
    assert.equal(p.pct, 0);
    assert.equal(p.inProgress, 0);
  });
});

describe("guion: los modos (2026-11-15)", () => {
  it("todo modo declarado es uno de los tres, en módulos y en escenas", () => {
    for (const mod of MODULES) {
      if (mod.mode) assert.ok(MODES.includes(mod.mode), `${mod.id}: modo de módulo inválido "${mod.mode}"`);
      for (const scene of mod.scenes) {
        if (scene.mode) assert.ok(MODES.includes(scene.mode), `${scene.id}: modo de escena inválido "${scene.mode}"`);
      }
    }
  });

  it("los cinco módulos de los modos declaran su modo y viven encendidos", () => {
    // Nacieron «en preparación» (2026-11-15) porque sus superficies no
    // existían; la etapa 5 de la ola de modos (2026-11-16) las aterrizó
    // todas — selector, impacto, datos mudos, «Puedes gastar hoy», las
    // caras por modo — y los volteó: esta cerca guarda el estado encendido.
    const born: Record<string, string> = {
      modos: "esencial",
      hoy: "esencial",
      "asesor-esencial": "esencial",
      "asesor-ritmo": "ritmo",
      deudas: "esencial",
    };
    for (const [id, mode] of Object.entries(born)) {
      const mod = moduleById(id);
      assert.ok(mod, `falta el módulo ${id}`);
      assert.equal(mod.mode, mode, `${id}: debe declarar el modo ${mode}`);
      assert.equal(mod.ready, true, `${id}: vive encendido — sus superficies existen en la app`);
      assert.ok(mod.scenes.length > 0, `${id}: nace completo, con sus escenas escritas`);
    }
  });

  it("el módulo «Los modos» cubre los tres modos con escenas filtradas", () => {
    const mod = moduleById("modos");
    assert.ok(mod);
    for (const mode of MODES) {
      assert.ok(mod.scenes.some((s) => s.mode === mode), `modos: falta la escena filtrada de ${mode}`);
    }
  });

  it("ningún módulo de Esencial o Ritmo enseña ni nombra la maquinaria de Completo", () => {
    // Fallos 25 y 26: la maquinaria de Completo (pilares, simulador) no se
    // enseña ni se referencia — ni negada — desde un módulo de un modo menor.
    const bannedAnchors = ["advice-sim", "advice-apply", "coach-pillars"];
    const bannedWords = ["simulador", "simulator", "pilares", "pillars", "patrón", "patron", "dti"];
    for (const mod of MODULES) {
      if (mod.mode !== "esencial" && mod.mode !== "ritmo") continue;
      for (const scene of mod.scenes) {
        for (const a of scene.anchors) {
          assert.ok(!bannedAnchors.includes(a), `${scene.id}: ancla de Completo "${a}" en un módulo de ${mod.mode}`);
        }
        for (const step of scene.steps) {
          if (!("caption" in step) || !step.caption) continue;
          for (const lang of [0, 1] as const) {
            const text = step.caption[lang].toLowerCase();
            for (const w of bannedWords) {
              assert.ok(!text.includes(w), `${scene.id}: nombra «${w}», maquinaria de Completo, en un módulo de ${mod.mode}`);
            }
          }
        }
      }
    }
  });
});
