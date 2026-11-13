/**
 * 1.3.235 «El cristal» + la isla: la tarjeta de apunte rápido vive en SU PROPIA tarea
 * (taskAffinity="") para que jamás arrastre la app detrás; la página renueva la foto del
 * widget en cada primer plano, cambie algo o no; y el acabado de cristal — tarjeta, opciones
 * y widgets — vive en los tokens y capas declarados, sin tocar función ni textos.
 *
 * RE-ANCLADO en 1.3.237 «Señal», con su razón: el cristal de 235 no convenció a Oscar en su
 * tercera prueba («se ve barato todo y poco terminado») y él eligió otro acabado entre tres
 * candidatos — la placa cálida prensada de «Señal»: todo sólido, sin degradados, el color de
 * signo como pintura plena. Las cercas de acabado de abajo fijan LA LENGUA NUEVA y la
 * ausencia de la vieja; las de función (la isla, la foto fresca, los contratos de 233/234)
 * no se movieron.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const manifest = read("android/app/src/main/AndroidManifest.xml");
const host = read("src/components/faro/widget-host.tsx");
const quick = read("android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt");
const colorsDay = read("android/app/src/main/res/values/w_colors.xml");
const colorsNight = read("android/app/src/main/res/values-night/w_colors.xml");

const senalTokens = (xml: string) =>
  [...xml.matchAll(/name="(w_senal_[a-z_]+)"[^>]*>(#[0-9A-Fa-f]+)</g)]
    .map((m) => [m[1], m[2].toUpperCase()] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));

describe("1.3.235 la isla y la foto siempre fresca", () => {
  it("la tarjeta es una isla: su actividad no comparte afinidad con la app", () => {
    const block = manifest.match(/<activity android:name="\.QuickAddActivity"[\s\S]*?\/>/)?.[0] ?? "";
    assert.ok(block.includes('android:taskAffinity=""'), "sin taskAffinity la tarjeta cae en la tarea de MainActivity y arrastra la app");
    assert.ok(block.includes('android:excludeFromRecents="true"'));
    assert.ok(block.includes('android:noHistory="true"'));
  });

  it("la página renueva la foto en cada primer plano, no solo cuando algo cambia", () => {
    const feed = host.slice(host.indexOf("// Feed the widgets."), host.indexOf("// Taps on the widget."));
    assert.ok(feed.includes('window.addEventListener("faronative-resume", now)'), "el feed escucha el onResume del shell");
    assert.ok(feed.includes('window.addEventListener("focus", now)'), "el feed escucha el foco");
    assert.ok(
      /visibilityState === "hidden" \|\| document\.visibilityState === "visible"\) now\(\)/.test(feed),
      "visible vuelve a empujar la foto (antes solo empujaba hidden y el cambio de estado)",
    );
    // RE-FIJADO en 1.3.237, con su razón: antes esta cerca exigía «if (sampleOn()) return;»
    // (el ejemplo apaga el feed). La tercera prueba de Oscar lo condenó: sus aperturas SON
    // de ejemplo, y con el feed apagado la foto quedaba vieja para siempre — la tarjeta le
    // pedía abrir la app en el modo correcto, exactamente lo que él prohibió. La ley nueva:
    // la foto describe el libro real en CUALQUIER sesión — con el ejemplo en pantalla, el
    // feed la computa desde el pack personal guardado, leído por el canal personal (leer no
    // escribe: el pack queda byte a byte, y ningún dato del ejemplo entra en la foto, porque
    // lo que se fotografía es el libro real).
    assert.ok(feed.includes("personalGet(packKeyOf(userId))"), "con el ejemplo en pantalla, la foto sale del pack personal guardado");
    assert.ok(feed.includes("packLedgerOk"), "el pack personal valida en profundidad antes de fotografiarse");
    assert.ok(!feed.includes("if (sampleOn()) return;"), "el feed ya no se apaga en modo de ejemplo");
  });
});

describe("1.3.237 «Señal» — la placa cálida (re-ancla el cristal de 1.3.235)", () => {
  it("los tokens de Señal existen en día y en noche, en paridad exacta de nombre Y valor", () => {
    // La placa es UN registro día y noche (la muestra que Oscar aprobó): los tokens de
    // superficie no siguen el día/noche del teléfono, así que día y noche valen lo mismo.
    const day = senalTokens(colorsDay);
    const night = senalTokens(colorsNight);
    assert.ok(day.length >= 5, "el set de tokens está completo");
    assert.deepEqual(day, night);
  });

  it("el fondo del widget es la pila de Señal declarada: tres sólidos, ningún degradado", () => {
    for (const f of ["drawable/w_bg.xml", "drawable/w_bg_s.xml", "drawable/w_bg_xl.xml"]) {
      const xml = read(`android/app/src/main/res/${f}`);
      assert.ok(xml.includes("<layer-list"), f);
      for (const tok of ["w_senal_hair", "w_senal_rim", "w_senal_body"])
        assert.ok(xml.includes(`@color/${tok}`), `${f} usa ${tok}`);
      assert.ok(!xml.includes("<gradient"), `${f} es plano: sin degradado no hay bandas`);
      assert.ok(!xml.includes("w_glass_"), `${f} ya no habla la lengua del cristal`);
    }
    const v31 = read("android/app/src/main/res/drawable-v31/w_bg.xml");
    assert.ok(v31.includes("@android:dimen/system_app_widget_inner_radius"), "en 31+ las capas internas toman el radio del sistema");
    assert.ok(v31.includes("@dimen/w_radius"), "el radio exterior sigue a w_radius (el del sistema en 31+)");
    assert.ok(!v31.includes("<gradient"), "en 31+ la placa también es plana");
  });

  it("cada tamaño lleva su fondo: S el suyo, paneles L/XL el de panel, el resto el estándar", () => {
    const bg = (f: string) => read(`android/app/src/main/res/layout/${f}`).match(/android:background="@drawable\/(w_bg[a-z_]*)"/)?.[1];
    assert.equal(bg("w_phone_s.xml"), "w_bg_s");
    assert.equal(bg("w_panel_l.xml"), "w_bg_xl");
    assert.equal(bg("w_panel_xl.xml"), "w_bg_xl");
    assert.equal(bg("w_phone_m.xml"), "w_bg");
    assert.equal(bg("w_panel_m.xml"), "w_bg");
    assert.equal(bg("w_dues.xml"), "w_bg");
  });

  it("la tarjeta y las opciones llevan Señal — y la función sigue intacta", () => {
    for (const s of ["senalCardBg", "LayerDrawable", "PADDING_MODE_STACK", "ViewOutlineProvider", "wrapCard", "StateListDrawable", "radioSquare", "rowSelector"])
      assert.ok(quick.includes(s), `QuickAdd.kt usa ${s}`);
    // Rajdhani viaja en el shell: rótulos, título, cifra y botones hablan la voz de Faro.
    assert.ok(quick.includes("createFromAsset"), "la fuente se carga desde los assets del shell");
    for (const f of ["fonts/rajdhani-500.ttf", "fonts/rajdhani-600.ttf", "fonts/rajdhani-700.ttf"])
      assert.ok(quick.includes(f), `QuickAdd.kt carga ${f}`);
    // El color del signo, sólido: cian de ingreso y naranja de gasto, los de la receta.
    assert.ok(quick.includes("0x35, 0xE0, 0xFF"), "el cian de ingreso de Señal");
    assert.ok(quick.includes("0xFF, 0x8B, 0x35"), "el naranja de gasto de Señal");
    assert.ok(quick.includes("dimAmount = 0.72f"), "la ventana se atenúa al 72 %, el techo de la receta");
    // La lengua vieja murió entera: ni el cuerpo de cristal, ni sus fichas fantasma, ni el
    // tinte del radio, ni un solo degradado orientado en la tarjeta.
    for (const s of ["glassCardBg", "chipBg", "buttonTintList", "GradientDrawable.Orientation"])
      assert.ok(!quick.includes(s), `QuickAdd.kt ya no usa ${s}`);
    // Las cercas de función de 233/234 siguen en pie tal cual.
    assert.ok(quick.includes("FaroWidgets.load(this)"));
    assert.ok(quick.includes("QuickAdd.enqueue("));
    assert.ok(!quick.includes("faro_ledgers"));
    assert.ok(!quick.includes("supabase"));
  });
});
