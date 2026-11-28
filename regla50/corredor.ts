/**
 * REGLA DE 50 · LÍNEA WINDOWS — el corredor del banco.
 *
 * Corre las preguntas de un banco contra la capa de ayuda tal cual existe
 * en el árbol: el tema existe, la cita esperada está palabra por palabra
 * en su `what` o su `bubble` (los dos idiomas), y el tema está sentado en
 * la superficie declarada. Las entradas de frontera cuentan como
 * abstención esperada. Las selladas NO se corren fuera del cierre de su
 * sección: sin --cierre <seccion> se saltan y se cuentan aparte; con
 * --cierre se corren una vez y sus ids se escriben en quemadas.json
 * (al leerse, el sellado se quema y pasa a material de regresión).
 *
 * Uso: node --import ./tools/ts-hook.mjs --experimental-strip-types \
 *        regla50/corredor.ts regla50/<banco>.json [--cierre <seccion>]
 * Sale con código 1 si alguna entrada corrida cae.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MANUAL_TOPICS, findTopic } from "../src/lib/manual/topics.ts";

type EsperadaTema = {
  tipo: "tema";
  tema: string;
  superficie: string;
  citaEs: string;
  citaEn: string;
};
type EsperadaVentana = { tipo: "ventana"; archivo: string; citaEs: string; citaEn: string };
type EsperadaHueco = { tipo: "hueco"; citaEs: string; citaEn: string; nota: string };
type EsperadaFrontera = { tipo: "frontera"; razon: string; nota: string };
type Entrada = {
  id: string;
  seccion: string;
  clase: "construccion" | "sellada";
  familia: string;
  es: string;
  en: string;
  esperada: EsperadaTema | EsperadaVentana | EsperadaHueco | EsperadaFrontera;
};

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const args = process.argv.slice(2);
const bancoPath = args.find((a) => a.endsWith(".json"));
if (!bancoPath) {
  console.error("falta el archivo del banco (.json)");
  process.exit(2);
}
const cierreIdx = args.indexOf("--cierre");
const cierre = cierreIdx >= 0 ? args[cierreIdx + 1] : null;

const quemadasPath = join(here, "quemadas.json");
const quemadas: Record<string, string> = existsSync(quemadasPath)
  ? (JSON.parse(readFileSync(quemadasPath, "utf8")) as Record<string, string>)
  : {};

const banco = JSON.parse(readFileSync(bancoPath, "utf8")) as Entrada[];

// El mapa de asientos se lee del árbol en cada corrida: por archivo, los
// topic="…" que sienta (burbujas <Hint> y temas de pliegue). Los asientos
// viven en DOS casas: src/components/faro y src/spa (las puertas de
// entrada, gates.tsx, sientan las suyas). Sin colisiones de nombre entre
// las dos casas (verificado al construir el corredor); la clave es el
// nombre del archivo.
const asientos = new Map<string, Set<string>>();
for (const dir of [join(root, "src", "components", "faro"), join(root, "src", "spa")]) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".tsx")) continue;
    const text = readFileSync(join(dir, f), "utf8");
    const set = new Set<string>();
    for (const m of text.matchAll(/topic="([a-z0-9-]+)"/g)) set.add(m[1]);
    asientos.set(f, set);
  }
}

const textoTema = (tema: string, lang: 0 | 1): string[] => {
  const t = findTopic(tema);
  if (!t) return [];
  // La voz entera del tema: what y bubble (la burbuja) y, en los temas de
  // profundidad manual, how y tip — el Manual responde también ahí, y la
  // burbuja de esos temas abre la puerta a esa profundidad.
  const out = [t.what[lang]];
  if (t.bubble) out.push(t.bubble[lang]);
  if (t.how) out.push(t.how[lang]);
  if (t.tip) out.push(t.tip[lang]);
  return out;
};

// Para los huecos: todo el texto que la ayuda ya dice (temas, en los dos
// idiomas) más los diccionarios de ventanas e i18n. Si la cita ya vive en
// alguna parte, la entrada no es un hueco: está mal clasificada.
const textoTemas = (lang: 0 | 1): string =>
  MANUAL_TOPICS.flatMap((t) => [t.what[lang], t.bubble ? t.bubble[lang] : ""]).join("\n");
const diccionarios = [
  readFileSync(join(root, "src", "spa", "words.ts"), "utf8"),
  readFileSync(join(root, "src", "lib", "faro", "i18n.ts"), "utf8"),
].join("\n");
const huecos: Entrada[] = [];

type Resultado = { entrada: Entrada; bien: boolean; causa?: string };
const resultados: Resultado[] = [];
let selladasSinCorrer = 0;
const recienQuemadas: string[] = [];

for (const e of banco) {
  const yaQuemada = e.id in quemadas;
  if (e.clase === "sellada" && !yaQuemada) {
    if (cierre !== e.seccion) {
      selladasSinCorrer++;
      continue;
    }
    recienQuemadas.push(e.id);
  }
  if (e.esperada.tipo === "ventana") {
    const v = e.esperada;
    let texto = "";
    try {
      texto = readFileSync(join(root, v.archivo), "utf8");
    } catch {
      resultados.push({ entrada: e, bien: false, causa: `archivo de ventana no leído: ${v.archivo}` });
      continue;
    }
    const ok = texto.includes(v.citaEs) && texto.includes(v.citaEn);
    resultados.push({
      entrada: e,
      bien: ok,
      causa: ok ? undefined : `la cita no está en ${v.archivo}`,
    });
    continue;
  }
  if (e.esperada.tipo === "hueco") {
    const h = e.esperada;
    const yaVive =
      textoTemas(0).includes(h.citaEs) ||
      textoTemas(1).includes(h.citaEn) ||
      diccionarios.includes(h.citaEs) ||
      diccionarios.includes(h.citaEn);
    if (yaVive) {
      resultados.push({
        entrada: e,
        bien: false,
        causa: "clasificada como hueco, pero la cita ya vive en una superficie",
      });
    } else {
      huecos.push(e);
    }
    continue;
  }
  if (e.esperada.tipo === "frontera") {
    const f = e.esperada;
    const ok =
      (f.razon === "nadie" || f.razon === "otra-seccion" || f.razon === "falta-dato") &&
      typeof f.nota === "string" &&
      f.nota.length > 0;
    resultados.push({
      entrada: e,
      bien: ok,
      causa: ok ? undefined : "frontera sin razón válida o sin nota",
    });
    continue;
  }
  const esp = e.esperada;
  const tema = MANUAL_TOPICS.find((t) => t.id === esp.tema);
  if (!tema) {
    resultados.push({ entrada: e, bien: false, causa: `sin tema: no existe «${esp.tema}»` });
    continue;
  }
  const citaEsOk = textoTema(esp.tema, 0).some((s) => s.includes(esp.citaEs));
  const citaEnOk = textoTema(esp.tema, 1).some((s) => s.includes(esp.citaEn));
  if (!citaEsOk || !citaEnOk) {
    resultados.push({
      entrada: e,
      bien: false,
      causa: `la cita no está en el tema «${esp.tema}» (${!citaEsOk ? "español" : "inglés"})`,
    });
    continue;
  }
  if (esp.superficie !== "manual") {
    const set = asientos.get(esp.superficie);
    if (!set || !set.has(esp.tema)) {
      resultados.push({
        entrada: e,
        bien: false,
        causa: `sin asiento: «${esp.tema}» no está sentado en ${esp.superficie}`,
      });
      continue;
    }
  }
  resultados.push({ entrada: e, bien: true });
}

if (recienQuemadas.length > 0) {
  const hoy = new Date().toISOString().slice(0, 10);
  for (const id of recienQuemadas) quemadas[id] = hoy;
  writeFileSync(quemadasPath, JSON.stringify(quemadas, null, 2) + "\n");
}

// Reporte: conteos completos y finales, nunca parciales (regla de Hark).
const bien = resultados.filter((r) => r.bien);
const mal = resultados.filter((r) => !r.bien);
console.log(`BANCO ${bancoPath}`);
console.log(`corridas: ${resultados.length} · bien: ${bien.length} · mal: ${mal.length} · huecos: ${huecos.length} · selladas sin correr: ${selladasSinCorrer}`);
for (const e of huecos) console.log(`HUECO ${e.id} [${e.seccion}/${e.familia}]: ${(e.esperada as EsperadaHueco).nota}`);
if (recienQuemadas.length > 0) console.log(`quemadas en este cierre: ${recienQuemadas.join(", ")}`);
for (const r of mal) {
  console.log(`CAE ${r.entrada.id} [${r.entrada.seccion}/${r.entrada.familia}] forma tal cual: ${r.causa}`);
}
process.exit(mal.length > 0 ? 1 : 0);
